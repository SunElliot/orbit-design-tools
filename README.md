# OrbitTools — Satellite Orbit Design Calculators

Free, browser-based orbit design calculators for LEO smallsat missions. Sister project of
[SatTools](https://sunelliot.github.io/link-budget-calculator/) (satellite communication
calculators) and built on the same architecture: static multi-page site, shared
`styles.css` / `i18n.js` (EN/中文) / `share.js`, PWA service worker, zero backend —
nothing leaves the browser.

## Tools

| Category | Tool | What it computes |
|---|---|---|
| Orbit Design | `orbit-basics.html` | a, e, period, perigee/apogee velocity, energy from altitudes |
| Orbit Design | `sso.html` | Sun-synchronous inclination vs altitude (J2 precession condition) + chart |
| Orbit Design | `repeat-orbit.html` | Ground-track shift, nearest repeat cycles, exact R revs / D days altitude solver |
| Orbit Design | `perturbations.html` | J2 secular rates: nodal regression, apsidal rotation, nodal/anomalistic periods |
| Mission Analysis | `coverage.html` | Swath, Earth central angle, footprint area, slant range (elevation- or FOV-limited) |
| Mission Analysis | `eclipse.html` | Solar beta angle, eclipse fraction/duration, full-year chart with J2 node drift |
| Mission Analysis | `lifetime.html` | Drag decay integration, lifetime, drag make-up Δv, 25-year rule check |
| Maneuvers | `maneuver.html` | Hohmann (± combined plane change), pure plane change, phasing Δv |
| Constellation | `constellation.html` | Walker delta i:T/P/F spacing, phasing, per-satellite RAAN/anomaly table |
| Reference | `constants.html` | Astrodynamic constants and typical-orbit quick reference |

## Conventions (shared with SatTools)

- Every page loads shared assets with a `?v=N` cache-busting query string, bumped in
  lockstep across all pages whenever a shared asset changes.
- `sw.js` is cache-first; bump its `CACHE` constant (and `ASSETS` list) whenever any
  shipped file changes, or returning visitors stay on stale pages.
- EN/中文 toggle: static text via the `DICT` in `i18n.js`, dynamic text via `t(en, zh)`,
  block content via `.en-only` / `.zh-only`.
- `share.js` serializes all id'd inputs into the URL so calculations are shareable links.

## Models & accuracy

First-order J2 secular theory (Vallado), low-precision solar ephemeris, cylindrical
Earth shadow, CIRA/SMAD-class reference densities. Intended for design trades and
sizing — verify flight-critical numbers with a full propagator (GMAT/STK/DAS).
