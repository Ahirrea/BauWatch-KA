# Wo wird gebaut? — Baustellen in Karlsruhe (BauWatch-KA)

*("Where's it being built?" — construction sites in Karlsruhe)*

**Live site:** https://ahirrea.github.io/BauWatch-KA/

A citizen-friendly map plus list of the open construction sites in Karlsruhe.
It answers the question Karlsruhe residents actually have:
**"Does this affect me — on my route, with my mode of transport, in this
time period?"**

- 🗺️ Map + synchronized list (Leaflet + OpenStreetMap)
- 🚧 Construction-site areas drawn on the map, not just point markers
- 🚦 Traffic light for the closure severity, plain text instead of administrative codes, remaining duration
- 🔎 Address/radius search (1.5 km), filters by time period, closure severity, mode of transport
- 🆕 "What's new?" — the data changes of the last 30 days, right in the app
- 🌐 Interface in German and English (legal pages stay German)
- 🌗 Light and dark theme — follows the system, switchable in the app
- 📲 Installable as an app and usable offline (see [Install as an App](#install-as-an-app))
- ⚙️ Purely static on GitHub Pages — no server, no running costs

Elaborated requirements: [`docs/anforderungen/`](docs/anforderungen/README.md) —
produced by the fixed [refinement process](docs/PROZESS.md).
Architectural decisions: [`docs/adr/`](docs/adr/README.md)
(among others [ADR-001](docs/adr/ADR-001-statisches-hosting.md): why static + an Action;
[ADR-002](docs/adr/ADR-002-mehrseitige-auslieferung.md): multi-page delivery).
Task backlog: [`docs/BACKLOG.md`](docs/BACKLOG.md).

## How it works (short version)

The city's WFS endpoint sends no CORS headers and is too large to fetch
directly from the browser. So a **GitHub Action** periodically does what a
server would otherwise do (see ADR-001):

```
City WFS  ──(GitHub Action, every 4 h)──►  scripts/build-data.mjs  ──►  data/baustellen.geojson (committed)
                                                                              │
                                                        Browser loads static file from the same origin
                                                                              │
                                                                   index.html + src/app.js  ──►  map + list
```

The actual processing logic (coordinates, plain-text mapping, formatting)
lives in `src/lib/` and is used **jointly by the build script and the client**.

## Project structure

Plain static files, served from the repo root — no frontend build step.
Shared, dependency-free logic lives in `src/lib/` and is imported by **both**
the browser client (`src/app.js`) and the Node scripts in `scripts/` (data
build + tests). The committed data snapshot and its reports live in `data/`,
Leaflet locally in `vendor/leaflet/` (no CDN), process/decisions/backlog in
`docs/`.

## Running locally

There is no build step for the frontend — plain static files. Because of ES
modules (`type="module"`) it must be opened via a small HTTP server (not via
`file://`):

```bash
# any static server, e.g.:
python3 -m http.server 8080
# then open http://localhost:8080
```

Node is only needed for the data build script and the tests (Node ≥ 18,
because of `fetch`).

### Rebuild data locally

```bash
npm run build:data        # = node scripts/build-data.mjs
```

The script fetches the city WFS, filters to Karlsruhe, deduplicates
point/polygon, transforms the coordinates, cleans up the fields, and writes
`data/baustellen.geojson` (plus the quality report `data/QUALITY.md`). On an
API error or a suspiciously empty result it **aborts without overwriting the
existing file** — the `--allow-empty` flag forces the write even with 0 matches.

> **Network access needed:** the fetch goes to `mobil.trk.de`. In some
> environments this host is blocked by egress policy (the GitHub Action
> runners do reach it); locally, the build then fails.

> A small **sample dataset** initially ships in the repo (`sample: true`,
> marked as sample data in the footer). The first successful Action run
> replaces it with real data.

## Install as an App

The site is a **Progressive Web App**: it can be added to the home screen and
then works even without a network. There's deliberately no dedicated
"Install" button — installation goes through the browser menu (details and
rationale in
[A-3](docs/anforderungen/A-3-pwa-installierbar-offline.md)):

- **Android/Chrome:** Menu ⋮ → "Install app" or "Add to Home screen"
- **iOS/Safari:** Share icon → "Add to Home Screen"
- **Desktop/Chrome, Edge:** install icon in the address bar

**What works offline:** the map (without map tiles — the area stays gray),
markers, list, all filters, and the detail info, computed on the **last
loaded data snapshot**. The footer then explicitly states this:
"Data last changed: … · **offline, from device storage**".

**What doesn't work offline:** the address/radius search — it needs
Nominatim. The input field and button are disabled offline, and the search
status says so (instead of silently failing).

**With a network, the fresh state always wins.** The data fetch is
*network-first*: the committed snapshot is always fetched first, the cache is
only the fallback. A map-tile cache deliberately does not exist.

**New version:** changes to the app are shown by a notice banner ("New
version available" + "Reload"). Reloading happens **only on click** — an
automatic reload would sweep away filters, search, and map position in the
middle of use.

> **For developers:** service workers need a *secure context*.
> `http://localhost:8080` counts as secure, `file://` does not — so the site
> can only be tested offline via the local HTTP server. Also: **whoever
> changes a shell file must bump `CACHE_SHELL` in [`sw.js`](sw.js)**, or
> installed clients keep the old version. The app icons are generated from
> `icons/icon.svg` via `node scripts/render-icons.mjs` (manual, not in CI).

## The data Action (#4)

`.github/workflows/update-data.yml`:

- runs on a cron schedule **every 4 hours** (UTC) and can be triggered
  manually (**Actions → "Baustellendaten aktualisieren" → Run workflow**),
- runs `scripts/build-data.mjs` (no `npm install` needed — the script only
  uses the dependency-free modules from `src/lib/`),
- commits `data/baustellen.geojson` **only on an actual change** and pushes
  to `main`.

The cron interval can be adjusted at the top of the workflow file.

## Tracking changes

The build script compares the new state against the last committed one and
**only writes on a real change** (timestamps alone don't count). From that
follow the places where you can see *whether* and *what* changed:

- **`data/CHANGELOG.md`** — a permanent log, newest change first: which
  construction sites were ➕ added, ➖ removed, or ✏️ changed (with field
  details like "End: … → …"). Linked at the bottom of the website as
  "change history".
- **The "What's new?" button on the map page (A-6)** — the content of
  `data/CHANGELOG.md`, just structured (`data/changelog.json`) and rendered
  in a modal dialog instead of raw Markdown on GitHub, limited to the last 30
  days. No personalization, no login, same fixed window for every visitor.
  Cases that changed only outside the observed fields are left out here (#28) —
  "other details updated" can't answer "does this affect me?"; `CHANGELOG.md`
  keeps them.
- **Commit history of `data/baustellen.geojson`** — every commit is a real
  change. `git log --follow data/baustellen.geojson` shows the history; the
  commit message contains the short summary ("3 new, 1 removed …").
- **Action job summary** — per run, in the Actions tab (runs *without* a
  change are also listed there, with a timestamp).
- **`data/QUALITY.md`** — a quality report generated during the build
  (feature counts per pipeline stage, empty required fields, etc.), to
  quickly spot anomalies in the raw data.

### How often do the data actually change?

Because no commit happens without a change, the answer is directly readable:

- **Many Action runs, few data commits = the data rarely changes.** The runs
  (every 4 h) show up in the Actions tab, the real changes in the commit
  history or in `CHANGELOG.md`.
- The gaps between commits to `data/baustellen.geojson` are the change
  interval. `git log --follow --format='%ci %s' data/baustellen.geojson`
  lists them compactly.

The website's footer shows "Data last changed" (= `stand`), i.e. the time of
the last real change — not the last check run.

## Contributing

### Add an `art` plain-text mapping (#15)

The official `art` field usually already delivers **readable plain text**
(e.g. "Straßenbau") — that's carried over unchanged. For cases where a value
should still be translated or normalized, there's the override table
`ART_MAP` in [`src/lib/classify.js`](src/lib/classify.js). A new entry is a
single line:

```js
export const ART_MAP = {
  // ...
  neuer_code: 'Verständlicher Klartext',
};
```

Keys are trimmed and compared case-insensitively (also ignoring
whitespace/special characters). If no override exists, real plain text is
passed straight through; a cryptic code without a translation gets the
honest fallback `Baustelle (<code>)`, so that missing mappings stay visible.
After adding an entry, run `npm run build:data` (or re-trigger the Action) so
the change flows into the processed data.

### Closure-severity and mode-of-transport detection

These work keyword-based over the combined plain text (`classifySperrgrad`,
`classifyVerkehrsmittel` in `classify.js`), because the raw dataset doesn't
guarantee cleanly separated fields for this. The patterns can be extended
there. Limit of the method: negations in free text ("Radweg frei" = "bike
lane clear") are not recognized — the original text always stays visible in
the popup, though.

## License

Code: **MIT** (see [`LICENSE`](LICENSE)).
Data: "Baustellen" ("construction sites"), City of Karlsruhe, **CC-BY 4.0** —
attribution static in the footer of `index.html`, guarded by
`scripts/test-attribution.mjs`.
No warranty; only the on-site signage is binding.

Operator details and data flows: [`impressum.html`](impressum.html) and
[`datenschutz.html`](datenschutz.html) (requirement
[A-4](docs/anforderungen/A-4-impressum-datenschutz.md)) — linked from the
footer on the live site.
