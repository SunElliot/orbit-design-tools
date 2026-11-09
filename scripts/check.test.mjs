import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'check.mjs');
const REPO = path.resolve(HERE, '..');

function sh(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options });
}

function run(dir, extra = []) {
  return sh(process.execPath, [CHECK, '--root', dir, ...extra]);
}

function runReal(extra = []) {
  return sh(process.execPath, [CHECK, ...extra], { cwd: REPO });
}

function expectFail(result, code, needle) {
  assert.notEqual(result.status, 0, `expected non-zero exit, got ${result.status}\n${result.stdout}`);
  assert.match(result.stderr, new RegExp(code));
  if (needle) {
    assert.ok(
      result.stderr.includes(needle),
      `stderr should mention ${needle}, got:\n${result.stderr}`,
    );
  }
}

function makeSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitcheck-'));
  const write = (rel, text) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const page = (body = '') => [
    '<!DOCTYPE html>',
    '<html><head>',
    '<link rel="stylesheet" href="styles.css?v=1">',
    '<script src="i18n.js?v=1"></script>',
    '<link rel="manifest" href="manifest.json">',
    '</head><body>',
    body,
    '</body></html>',
  ].join('\n');

  write('index.html', page());
  write('a.html', page('<script src="share.js?v=1"></script><script src="xlink.js?v=1"></script>'));
  for (const asset of ['styles.css', 'i18n.js', 'share.js', 'xlink.js']) write(asset, '');
  write('icons/icon-192.png', 'png');
  write('sw.js', [
    "const CACHE = 'test-v1';",
    "const ASSETS = ['./', './index.html', './a.html', './styles.css', './i18n.js', './share.js', './xlink.js', './icons/icon-192.png', './manifest.json'];",
    '',
  ].join('\n'));
  write('manifest.json', JSON.stringify({
    name: 'test',
    start_url: './index.html',
    icons: [{ src: 'icons/icon-192.png' }],
  }));
  write('sitemap.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset>',
    '<url><loc>https://example.test/site/</loc></url>',
    '<url><loc>https://example.test/site/a.html</loc></url>',
    '</urlset>',
  ].join('\n'));
  write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://example.test/site/sitemap.xml\n');
  return dir;
}

function site(t) {
  const dir = makeSite();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function rewrite(file, transform) {
  fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8')));
}

test('clean fixture passes and reports the skipped cache check', (t) => {
  const res = run(site(t));
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /check: 2 pages/);
  assert.match(res.stdout, /cache-bump check skipped/);
});

test('the real site passes', () => {
  const res = runReal();
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /check: 11 pages/);
});

test('external, anchor, data and inline-script refs are ignored', (t) => {
  const dir = site(t);
  fs.appendFileSync(path.join(dir, 'a.html'), [
    '<a href="https://example.com/x">x</a>',
    '<a href="//cdn.example.com/x">x</a>',
    '<a href="mailto:a@b.c">x</a>',
    '<a href="tel:123">x</a>',
    '<img src="data:image/png;base64,AAAA">',
    '<a href="javascript:void(0)">x</a>',
    '<a href="#top">x</a>',
    '<script>document.querySelector("a").href = "missing.html";</script>',
    '',
  ].join('\n'));
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
});

test('broken local href and src targets fail', (t) => {
  const hrefSite = site(t);
  fs.appendFileSync(path.join(hrefSite, 'a.html'), '\n<a href="missing.html">x</a>\n');
  expectFail(run(hrefSite), 'BROKEN_REF', 'missing.html');

  const srcSite = site(t);
  fs.appendFileSync(path.join(srcSite, 'a.html'), '\n<img src="img/nope.png">\n');
  expectFail(run(srcSite), 'BROKEN_REF', 'nope.png');

  const quotedSite = site(t);
  fs.appendFileSync(path.join(quotedSite, 'a.html'), '\n<a title="1 > 0" href="missing.html">link</a>\n');
  expectFail(run(quotedSite), 'BROKEN_REF', 'missing.html');
});

test('shared asset version drift fails', (t) => {
  const mismatch = site(t);
  rewrite(path.join(mismatch, 'a.html'), (html) => html.replace('styles.css?v=1', 'styles.css?v=2'));
  expectFail(run(mismatch), 'VERSION_MISMATCH', 'styles.css');

  const missing = site(t);
  rewrite(path.join(missing, 'a.html'), (html) => html.replace('share.js?v=1', 'share.js'));
  expectFail(run(missing), 'VERSION_MISSING', 'share.js');
});

test('shipped root file missing from ASSETS fails', (t) => {
  const dir = site(t);
  fs.writeFileSync(path.join(dir, 'extra.js'), '');
  expectFail(run(dir), 'ASSET_NOT_CACHED', 'extra.js');
});

test('ASSETS entry that does not exist fails', (t) => {
  const dir = site(t);
  rewrite(path.join(dir, 'sw.js'), (text) => text.replace("'./manifest.json'", "'./manifest.json', './ghost.css'"));
  expectFail(run(dir), 'ASSET_MISSING', 'ghost.css');
});

test('sitemap missing page and unlisted page fail', (t) => {
  const missing = site(t);
  rewrite(path.join(missing, 'sitemap.xml'), (xml) => xml.replace(
    '</urlset>',
    '<url><loc>https://example.test/site/gone.html</loc></url>\n</urlset>',
  ));
  expectFail(run(missing), 'SITEMAP_MISSING_PAGE', 'gone.html');

  const unlisted = site(t);
  fs.copyFileSync(path.join(unlisted, 'a.html'), path.join(unlisted, 'b.html'));
  rewrite(path.join(unlisted, 'sw.js'), (text) => text.replace("'./a.html'", "'./a.html', './b.html'"));
  expectFail(run(unlisted), 'SITEMAP_UNLISTED_PAGE', 'b.html');
});

test('manifest start_url and icon targets are checked', (t) => {
  const icon = site(t);
  fs.writeFileSync(path.join(icon, 'manifest.json'), JSON.stringify({
    start_url: './index.html',
    icons: [{ src: 'icons/icon-999.png' }],
  }));
  expectFail(run(icon), 'MANIFEST_ICON_MISSING', 'icon-999.png');

  const start = site(t);
  fs.writeFileSync(path.join(start, 'manifest.json'), JSON.stringify({
    start_url: './nope.html',
    icons: [{ src: 'icons/icon-192.png' }],
  }));
  expectFail(run(start), 'MANIFEST_START_URL_MISSING', 'nope.html');
});

test('commented-out ASSETS entries are not treated as cached', (t) => {
  const dir = site(t);
  fs.writeFileSync(path.join(dir, 'sw.js'), [
    "const CACHE = 'test-v1';",
    'const ASSETS = [',
    "  './',",
    "  './index.html',",
    "  './a.html',",
    "  './styles.css',",
    "  './i18n.js',",
    "  // './share.js',",
    "  './xlink.js',",
    "  './icons/icon-192.png',",
    "  './manifest.json'",
    '];',
    '',
  ].join('\n'));
  expectFail(run(dir), 'ASSET_NOT_CACHED', 'share.js');
});

test('manifest null is rejected', (t) => {
  const dir = site(t);
  fs.writeFileSync(path.join(dir, 'manifest.json'), 'null');
  expectFail(run(dir), 'PARSE_ERROR', 'not an object');
});

test('symlink escaping the site root fails', (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'outside.png'), 'x');

  const dir = site(t);
  fs.symlinkSync(path.join(outside, 'outside.png'), path.join(dir, 'linked.png'));
  fs.appendFileSync(path.join(dir, 'a.html'), '\n<img src="linked.png">\n');
  expectFail(run(dir), 'BROKEN_REF', 'escapes');
});

test('CACHE must be bumped when shipped files change', (t) => {
  if (sh('git', ['--version']).status !== 0) {
    t.skip('git not available');
    return;
  }
  const dir = site(t);
  const git = (...args) => sh('git', ['-C', dir, '-c', 'commit.gpgsign=false', ...args]);

  assert.equal(git('init').status, 0);
  assert.equal(git('add', '-A').status, 0);
  assert.equal(
    git('-c', 'user.name=test', '-c', 'user.email=test@example.test', 'commit', '-m', 'init').status,
    0,
  );

  fs.appendFileSync(path.join(dir, 'a.html'), '\n<!-- change -->\n');
  expectFail(run(dir, ['--base-ref', 'HEAD']), 'CACHE_NOT_BUMPED', 'a.html');

  rewrite(path.join(dir, 'sw.js'), (text) => text.replace('test-v1', 'test-v2'));
  const res = run(dir, ['--base-ref', 'HEAD']);
  assert.equal(res.status, 0, res.stderr);
});

test('a missing root is a usage error', () => {
  const res = run('/nonexistent-orbit-check-root');
  assert.equal(res.status, 2);
});
