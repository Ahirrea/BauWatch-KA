# ADR-001: Static Hosting with a Periodic Data Snapshot

**Status:** accepted
**Date:** 2026-07-20
**Context:** how does the city's live data get into a purely static site?

## Problem

The city's WFS endpoint (`mobil.trk.de`) sends no CORS headers that would
allow a direct `fetch` from a foreign domain's browser. A direct access from
client-side code therefore fails. At the same time, the product should run
statically on GitHub Pages — no server, no running costs.

Additional constraints from the data:
- The raw data covers the whole region; only `gemeinde = "Karlsruhe"` is
  relevant.
- Coordinates in EPSG:25832, must be transformed to WGS84.
- Point + polygon per case → deduplication needed.
- The raw dataset is large; the client shouldn't fetch it on every visit.

## Decision

A **GitHub Action** periodically takes on the role a server would otherwise
have. It runs on a schedule (cron) and on manual trigger:

1. Fetches the WFS endpoint server-side (no CORS in the Action runner).
2. Filters to `gemeinde = "Karlsruhe"`, deduplicates point/polygon.
3. Transforms coordinates to WGS84.
4. Cleans up fields (HTML from `zusatzinfo`, plain-text mapping of the
   `art` codes).
5. Writes a lean, fully processed `data/baustellen.geojson`
   into the repo (commit only on an actual change).

The client-side code exclusively loads this static file from the same
origin. No CORS problem, no runtime dependency on the city's API, fast load
time, the data's state traceable in the commit history.

## Consequences

**Positive**
- Zero running costs, no server, no secret handling.
- Data processing in one place (the build), the client stays simple.
- An outage of the city's API doesn't break the site — the last snapshot
  remains.
- The construction sites' change history comes for free out of Git.

**Negative / trade-offs**
- The data is only as fresh as the cron interval (suggestion: every
  3–6 h). Entirely sufficient for construction-site data that holds for
  days at a time.
- The processing logic lives in two languages if the build script isn't
  JS. → **Decision:** the build script is in Node.js, so the
  transformation and mapping logic can be shared with the frontend
  (`src/lib/` as shared modules, imported by the build script and the
  client).
- Address geocoding (Nominatim) stays a live call from the browser;
  Nominatim allows CORS. Follow the usage policy (rate limit,
  `User-Agent`/referer).

## Repo structure (derived from this)

```
/
├─ index.html              # entry point, loads src/app.js + Leaflet
├─ src/
│  ├─ app.js               # UI, map, filters, rendering
│  ├─ styles.css
│  └─ lib/
│     ├─ transform.js      # UTM32 -> WGS84 (shared)
│     ├─ classify.js       # art codes, closure severity, mode of transport (shared)
│     └─ format.js         # remaining duration, text cleanup (shared)
├─ scripts/
│  ├─ build-data.mjs       # run by the Action
│  └─ test-transform.mjs   # reference test of the coordinate transformation
├─ data/
│  └─ baustellen.geojson   # generated, committed
├─ vendor/
│  └─ leaflet/             # map library bundled locally (no CDN)
├─ .github/workflows/
│  └─ update-data.yml      # cron + manual trigger
└─ docs/
   ├─ SPEC.md
   └─ ADR-001-statisches-hosting.md
```

> Implementation note: Leaflet is bundled locally under `vendor/leaflet/`
> instead of via a CDN. That matches the underlying principle "no fragile
> third-party runtime dependency" and keeps the site fully functional even
> on a CDN outage (the OpenStreetMap map tiles remain a live call — that's
> unavoidable for any map).

## Discarded alternatives

- **Serverless proxy (Vercel/Netlify):** would allow a live fetch, but
  brings a runtime dependency, another hosting account, and potential
  costs/cold starts. Unnecessary for data that's valid day by day.
- **Direct browser fetch via a public CORS proxy:** fragile, slow, a
  privacy and availability risk via a third-party proxy. Rejected.
- **Committing data manually:** not maintainable, stale immediately.
