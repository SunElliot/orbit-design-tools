#!/usr/bin/env node
// Dependency-free self-check for the OrbitTools static site.
//
// Checks:
//   1. local href/src targets exist (exact case, so macOS does not hide a
//      capitalisation bug that would 404 on GitHub Pages)
//   2. shared assets use one ?v=N value across all pages
//   3. every shipped root .html/.css/.js file is precached by sw.js
//   4. every sw.js ASSETS entry exists
//   5. sitemap URLs map to real pages, and every page is listed
//   6. manifest start_url and icons exist
//   7. with --base-ref: CACHE was bumped if any shipped file changed
//
// Usage: node scripts/check.mjs [--root DIR] [--base-ref GIT_REF]
// Exit:  0 clean, 1 defects, 2 usage / unreadable base ref.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const SHARED_ASSETS = new Set(['styles.css', 'i18n.js', 'share.js', 'xlink.js']);
const SITEMAP_EXEMPT = new Set(); // e.g. '404.html' if one is ever added

class UsageError extends Error {}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'",
  })[name]);
}

function isIgnorable(value) {
  const v = decodeEntities(value).trim();
  if (!v) return true;
  if (v.startsWith('#')) return true;
  if (v.startsWith('//')) return true;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v);
}

function splitRef(value) {
  const v = decodeEntities(value).trim();
  const hashAt = v.indexOf('#');
  const noHash = hashAt >= 0 ? v.slice(0, hashAt) : v;
  const queryAt = noHash.indexOf('?');
  return {
    pathPart: queryAt >= 0 ? noHash.slice(0, queryAt) : noHash,
    query: queryAt >= 0 ? noHash.slice(queryAt + 1) : '',
  };
}

// Remove comments and the bodies of <script>/<style>, keeping their opening
// tags so src= attributes are still seen. Scanning tag attributes only avoids
// matching inline JS such as `location.href = "..."`.
function attributeText(html) {
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (match) => {
    const open = match.match(/^<[^>]*>/);
    return open ? open[0] : '';
  });
  return out;
}

// Quote-aware tag scanner: a `>` inside a quoted attribute value does not end
// the tag, so `<a title="1 > 0" href="missing.html">` is still scanned.
function scanTags(text) {
  const tags = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '<' || !/[a-zA-Z]/.test(text[i + 1] ?? '')) {
      i += 1;
      continue;
    }
    let j = i + 1;
    let quote = null;
    while (j < text.length) {
      const ch = text[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      j += 1;
    }
    tags.push(text.slice(i, j + 1));
    i = j + 1;
  }
  return tags;
}

function extractRefs(html) {
  const refs = [];
  for (const tag of scanTags(attributeText(html))) {
    const attrRe = /(?<![\w:-])(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
    let attr;
    while ((attr = attrRe.exec(tag))) {
      refs.push({
        attr: attr[1].toLowerCase(),
        value: attr[2] ?? attr[3] ?? attr[4] ?? '',
      });
    }
  }
  return refs;
}

function resolveLocal(fromFile, rawPath, root) {
  let p = rawPath;
  try {
    p = decodeURIComponent(rawPath);
  } catch {
    // keep the raw value; the existence check will fail loudly
  }
  if (p === '') return fromFile;
  if (p.startsWith('/')) {
    const abs = path.join(root, p.replace(/^\/+/, ''));
    return p.endsWith('/') ? path.join(abs, 'index.html') : abs;
  }
  let abs = path.resolve(path.dirname(fromFile), p);
  if (p.endsWith('/')) abs = path.join(abs, 'index.html');
  return abs;
}

// macOS filesystems are case-insensitive; GitHub Pages is not. Walk the path
// segment by segment so a wrong capitalisation is a defect here too.
function existsExact(root, abs) {
  const rel = path.relative(root, abs);
  if (rel === '') return { ok: true };
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, escape: true };
  let current = root;
  for (const segment of rel.split(path.sep)) {
    if (!segment) continue;
    let names;
    try {
      names = fs.readdirSync(current);
    } catch {
      return { ok: false };
    }
    if (!names.includes(segment)) {
      const caseHint = names.find((name) => name.toLowerCase() === segment.toLowerCase());
      return { ok: false, caseHint };
    }
    current = path.join(current, segment);
  }
  try {
    if (!fs.statSync(current).isFile()) return { ok: false };
    const realRoot = fs.realpathSync(root);
    const realTarget = fs.realpathSync(current);
    const inside = path.relative(realRoot, realTarget);
    if (inside.startsWith('..') || path.isAbsolute(inside)) return { ok: false, escape: true };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function normalizeAsset(entry) {
  let value = entry.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith('//')) return null;
  value = value.split('#')[0].split('?')[0];
  if (value === './' || value === '.' || value === '') return 'index.html';
  return value.replace(/^\.\//, '').replace(/^\/+/, '');
}

// Remove JS comments while leaving string contents alone, so a commented-out
// ASSETS entry is not mistaken for a live one.
function stripJsComments(text) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function parseServiceWorker(text, defects) {
  const code = text ? stripJsComments(text) : null;
  const cache = code && code.match(/const\s+CACHE\s*=\s*(['"])([^'"]+)\1/);
  const list = code && code.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\]/);
  if (!cache) {
    defects.push({ code: 'PARSE_ERROR', file: 'sw.js', msg: 'CACHE literal not found' });
  }
  if (!list) {
    defects.push({ code: 'PARSE_ERROR', file: 'sw.js', msg: 'ASSETS array literal not found' });
  }
  return {
    cache: cache ? cache[2] : null,
    assets: list ? [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [],
  };
}

function commonPrefix(values) {
  if (!values.length) return '';
  return values.reduce((prefix, value) => {
    let i = 0;
    while (i < prefix.length && i < value.length && prefix[i] === value[i]) i += 1;
    return prefix.slice(0, i);
  });
}

function checkCacheBump(root, baseRef, newCache, shipped, defects) {
  const git = (args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let commit;
  try {
    commit = git(['rev-parse', '--verify', `${baseRef}^{commit}`]).trim();
  } catch {
    throw new UsageError(`cannot resolve --base-ref "${baseRef}"`);
  }

  const prefix = git(['rev-parse', '--show-prefix']).trim();

  let oldSw;
  try {
    oldSw = git(['show', `${commit}:${prefix}sw.js`]);
  } catch {
    return 'sw.js absent at base ref; cache-bump check skipped';
  }

  const oldCache = (oldSw.match(/const\s+CACHE\s*=\s*(['"])([^'"]+)\1/) || [])[2];
  if (!oldCache) return 'base ref has no CACHE literal; cache-bump check skipped';

  const changed = new Set();
  for (const line of git(['diff', '--name-only', commit]).split('\n')) {
    if (!line) continue;
    const rel = prefix && line.startsWith(prefix) ? line.slice(prefix.length) : line;
    if (!prefix || line.startsWith(prefix)) changed.add(rel);
  }
  for (const line of git(['ls-files', '--others', '--exclude-standard']).split('\n')) {
    if (!line) continue;
    const rel = prefix && line.startsWith(prefix) ? line.slice(prefix.length) : line;
    if (!prefix || line.startsWith(prefix)) changed.add(rel);
  }

  const shippedChanged = [...changed].filter((file) => shipped.has(file)).sort();
  if (shippedChanged.length && newCache === oldCache) {
    defects.push({
      code: 'CACHE_NOT_BUMPED',
      file: 'sw.js',
      msg: `CACHE is still "${newCache}" after shipped changes: ${shippedChanged.slice(0, 5).join(', ')}${shippedChanged.length > 5 ? ', …' : ''}`,
    });
  }
  return null;
}

export function runChecks({ root, baseRef = null } = {}) {
  const defects = [];
  const notes = [];
  const stats = { pages: 0, refs: 0, assets: 0, sitemap: 0, manifest: 'OK' };

  const entries = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const pages = entries.filter((name) => name.endsWith('.html')).sort();
  const rootCss = entries.filter((name) => name.endsWith('.css'));
  const rootJs = entries.filter((name) => name.endsWith('.js'));
  stats.pages = pages.length;

  // 1 + 2: local references and shared-asset version lockstep.
  const versions = new Map();
  for (const page of pages) {
    const pageFile = path.join(root, page);
    const html = fs.readFileSync(pageFile, 'utf8');
    for (const ref of extractRefs(html)) {
      if (isIgnorable(ref.value)) continue;
      const { pathPart, query } = splitRef(ref.value);
      if (!pathPart) continue;
      stats.refs += 1;

      const target = resolveLocal(pageFile, pathPart, root);
      const result = existsExact(root, target);
      if (result.escape) {
        defects.push({ code: 'BROKEN_REF', file: page, msg: `${ref.attr}="${ref.value}" escapes the site root` });
      } else if (!result.ok) {
        const rel = path.relative(root, target);
        defects.push({
          code: 'BROKEN_REF',
          file: page,
          msg: `${ref.attr}="${ref.value}" → ${rel}${result.caseHint ? ` (actual: ${result.caseHint})` : ''}`,
        });
      }

      const asset = path.basename(pathPart);
      if (!SHARED_ASSETS.has(asset)) continue;
      const version = new URLSearchParams(query).get('v');
      if (!version) {
        defects.push({ code: 'VERSION_MISSING', file: page, msg: `${asset} has no ?v=` });
        continue;
      }
      if (!versions.has(asset)) versions.set(asset, new Map());
      const byVersion = versions.get(asset);
      if (!byVersion.has(version)) byVersion.set(version, new Set());
      byVersion.get(version).add(page);
    }
  }
  for (const [asset, byVersion] of versions) {
    if (byVersion.size <= 1) continue;
    const detail = [...byVersion.entries()]
      .map(([version, pagesWith]) => `v=${version} (${[...pagesWith].sort().join(', ')})`)
      .join(' vs ');
    defects.push({ code: 'VERSION_MISMATCH', file: asset, msg: `${asset}: ${detail}` });
  }

  // 3 + 4: service worker coverage.
  const swText = readIfExists(path.join(root, 'sw.js'));
  if (swText === null) {
    defects.push({ code: 'PARSE_ERROR', file: 'sw.js', msg: 'sw.js not found' });
  }
  const sw = parseServiceWorker(swText, defects);
  stats.assets = sw.assets.length;

  const cached = new Set();
  for (const entry of sw.assets) {
    const normalized = normalizeAsset(entry);
    if (normalized === null) continue;
    cached.add(normalized);
    const result = existsExact(root, path.join(root, normalized));
    if (!result.ok || result.escape) {
      defects.push({ code: 'ASSET_MISSING', file: 'sw.js', msg: `ASSETS entry "${entry}" → ${normalized} not found` });
    }
  }
  for (const file of [...pages, ...rootCss, ...rootJs]) {
    if (file === 'sw.js') continue;
    if (!cached.has(file)) {
      defects.push({ code: 'ASSET_NOT_CACHED', file: 'sw.js', msg: `${file} is shipped but missing from ASSETS` });
    }
  }

  // 5: sitemap coverage.
  const sitemapText = readIfExists(path.join(root, 'sitemap.xml'));
  if (sitemapText === null) {
    defects.push({ code: 'PARSE_ERROR', file: 'sitemap.xml', msg: 'sitemap.xml not found' });
  }
  const locs = sitemapText
    ? [...sitemapText.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => decodeEntities(match[1]))
    : [];
  stats.sitemap = locs.length;

  if (sitemapText !== null) {
    let base = null;
    const robots = readIfExists(path.join(root, 'robots.txt'));
    const sitemapLine = robots && robots.match(/^\s*Sitemap:\s*(\S+)/mi);
    if (sitemapLine) {
      base = new URL('.', sitemapLine[1]).href;
    } else if (locs.length) {
      base = commonPrefix(locs);
      base = base.slice(0, base.lastIndexOf('/') + 1);
    }
    if (!base) {
      defects.push({ code: 'PARSE_ERROR', file: 'sitemap.xml', msg: 'cannot determine sitemap base URL' });
    } else {
      const covered = new Set();
      for (const loc of locs) {
        if (!loc.startsWith(base)) {
          defects.push({ code: 'SITEMAP_MISSING_PAGE', file: 'sitemap.xml', msg: `${loc} is outside the base ${base}` });
          continue;
        }
        let rel = loc.slice(base.length).split('#')[0].split('?')[0];
        try {
          rel = decodeURIComponent(rel);
        } catch {
          // keep raw
        }
        if (rel === '' || rel.endsWith('/')) rel += 'index.html';
        const result = existsExact(root, path.join(root, rel));
        if (!result.ok || result.escape) {
          defects.push({ code: 'SITEMAP_MISSING_PAGE', file: 'sitemap.xml', msg: `${loc} → ${rel} not found` });
        }
        covered.add(rel);
      }
      for (const page of pages) {
        if (SITEMAP_EXEMPT.has(page)) continue;
        if (!covered.has(page)) {
          defects.push({ code: 'SITEMAP_UNLISTED_PAGE', file: 'sitemap.xml', msg: `${page} is not listed` });
        }
      }
    }
  }

  // 6: manifest targets.
  const manifestText = readIfExists(path.join(root, 'manifest.json'));
  if (manifestText === null) {
    defects.push({ code: 'PARSE_ERROR', file: 'manifest.json', msg: 'manifest.json not found' });
    stats.manifest = 'missing';
  } else {
    let manifest = null;
    try {
      manifest = JSON.parse(manifestText);
    } catch (error) {
      defects.push({ code: 'PARSE_ERROR', file: 'manifest.json', msg: `invalid JSON: ${error.message}` });
      stats.manifest = 'invalid';
    }
    if (stats.manifest === 'invalid') {
      // parse error already recorded
    } else if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
      defects.push({ code: 'PARSE_ERROR', file: 'manifest.json', msg: 'top-level JSON value is not an object' });
      stats.manifest = 'invalid';
    } else {
      const manifestFile = path.join(root, 'manifest.json');
      const start = typeof manifest.start_url === 'string' ? manifest.start_url : null;
      if (!start) {
        defects.push({ code: 'MANIFEST_START_URL_MISSING', file: 'manifest.json', msg: 'start_url is missing' });
      } else {
        const target = resolveLocal(manifestFile, splitRef(start).pathPart, root);
        if (!existsExact(root, target).ok) {
          defects.push({ code: 'MANIFEST_START_URL_MISSING', file: 'manifest.json', msg: `start_url "${start}" not found` });
        }
      }
      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        defects.push({ code: 'MANIFEST_ICON_MISSING', file: 'manifest.json', msg: 'icons is empty' });
      } else {
        for (const icon of manifest.icons) {
          const src = icon && typeof icon.src === 'string' ? icon.src : null;
          if (!src) {
            defects.push({ code: 'MANIFEST_ICON_MISSING', file: 'manifest.json', msg: 'icon without src' });
            continue;
          }
          const target = resolveLocal(manifestFile, splitRef(src).pathPart, root);
          if (!existsExact(root, target).ok) {
            defects.push({ code: 'MANIFEST_ICON_MISSING', file: 'manifest.json', msg: `icon "${src}" not found` });
          }
        }
      }
    }
  }

  // 7: CACHE bump against a base ref.
  if (baseRef) {
    if (sw.cache === null) {
      defects.push({ code: 'CACHE_NOT_BUMPED', file: 'sw.js', msg: 'no CACHE literal to compare' });
    } else {
      const shipped = new Set([...pages, ...rootCss, ...rootJs, 'manifest.json', 'sitemap.xml']);
      for (const entry of sw.assets) {
        const normalized = normalizeAsset(entry);
        if (normalized) shipped.add(normalized);
      }
      const note = checkCacheBump(root, baseRef, sw.cache, shipped, defects);
      if (note) notes.push(note);
    }
  } else {
    notes.push('cache-bump check skipped (no --base-ref)');
  }

  return { defects, notes, stats };
}

function main() {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        root: { type: 'string' },
        'base-ref': { type: 'string' },
      },
    }));
  } catch (error) {
    console.error(`usage: node scripts/check.mjs [--root DIR] [--base-ref GIT_REF]\n${error.message}`);
    process.exit(2);
  }

  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const root = path.resolve(values.root ?? defaultRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`check: root not found: ${root}`);
    process.exit(2);
  }

  let result;
  try {
    result = runChecks({ root, baseRef: values['base-ref'] ?? null });
  } catch (error) {
    console.error(error instanceof UsageError ? `check: ${error.message}` : `check: fatal: ${error.message}`);
    process.exit(2);
  }

  for (const defect of result.defects) {
    console.error(`✗ ${defect.code} ${defect.file}: ${defect.msg}`);
  }
  for (const note of result.notes) console.log(`note: ${note}`);

  const { pages, refs, assets, sitemap, manifest } = result.stats;
  console.log(
    `check: ${pages} pages, ${refs} local refs, ${assets} assets, ${sitemap} sitemap URLs, manifest ${manifest} — ${result.defects.length} defects`,
  );
  process.exit(result.defects.length ? 1 : 0);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) main();
