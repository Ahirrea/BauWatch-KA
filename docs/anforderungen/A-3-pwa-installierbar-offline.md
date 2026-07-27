# F-3 Installable as an App & Usable Offline (PWA)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a user, I want to have "Wo wird gebaut?" on my home
screen like an app and still see the last-loaded construction sites on a
bad or missing network, so that I can reliably check while on the go.

**Refined on:** 2026-07-25
**Implemented on:** 2026-07-25 on `claude/pwa-installierbar-offline-9bvyti`
(the target branch noted during refinement, `claude/app-pwa-deployment-t87mu7`,
was not used)

## Touchpoints in the code
- **`index.html` consistently uses relative paths** (`vendor/…`, `src/…`) →
  precache-capable without rework on the project Pages sub-path
  `…/BauWatch-KA/`. Only `manifest` and `theme-color` entries are missing in
  the `<head>`.
- **The asset set is statically closed and small:** `index.html`,
  `src/styles.css`, `src/app.js`, `src/lib/*.js` (3), `vendor/leaflet/leaflet.{css,js}`
  + Leaflet images ≈ **250 KB**. No hashed filenames, no frontend build →
  a hand-written precache list is workable.
- **`loadData()` in `src/app.js` (≈ line 417)** fetches the data with
  `fetch(DATA_URL, { cache: 'no-cache' })` and already has an error branch
  (`#list-status.is-error`) → exactly the point where the offline fallback
  and timestamp marking connect. `setFooter()` already writes the
  timestamp/attribution.
- **Existing `aria-live` regions** `#list-status` and `#search-status` carry
  the new offline notices — no new alert constructs needed.
- **Color variables in `src/styles.css`** (`--accent` `#1b4b73` light /
  `#6ba7d6` dark, `--bg` `#f7f7f5` / `#16181c`) are the source for
  `theme_color`/`background_color` and the icon coloring — no new color
  system.
- **The Playwright pattern is in `CLAUDE.md`** (local `http.server`,
  intercept tiles) → the offline smoke test is an extension of that.
- **Missing asset:** no `icons/` directory, no logo. Has to be created from
  scratch.

## Tension with non-goals — and resolution
- "**No push notifications in v1**" (PRD): a service worker is the
  *technical* prerequisite for push — but we implement **none**. The
  verdict from [A-2](./A-2-baustellen-abo-feed.md) (real push needs an
  application server + storage of the push endpoints → discarded) stays
  unchanged. Binding: **no `push` and no `notificationclick` handler** in
  the SW; the PWA doesn't accidentally open that door.
- "**No data storage of our own** beyond the committed GeoJSON": cache
  storage technically keeps **the same served files** on the device —
  no new, no user-related data store, nothing is transmitted or stored
  that the user hasn't loaded anyway; deletable at any time via the
  browser settings. No account, no login.
- **Success criterion "the data is never older than the last Action run
  (timestamp visible)" (PRD)** — this is where the one genuine collision
  was: a cache-first SW for `data/baustellen.geojson` would break it (the
  Action commits every 4 h). **Resolved via network-first for the data**:
  online, always the fresh snapshot; offline, the cached one — but then
  **explicitly marked as "offline, as of X"**. The criterion is tightened
  accordingly in `../PRD.md` (unchanged online; offline transparently
  stale instead of nothing at all).
- **ADR-001 ("no Actions-based Pages deployment")** stays untouched:
  manifest, icons, and the SW are ordinary static files in the repo root,
  every data commit still goes live immediately.
- **Pitfall "no per-run-volatile values"** (CLAUDE.md): the cache version
  in the SW is maintained **by hand**; `build-data.mjs` is not touched, no
  noise-commit path is created.

## Decisions (with rationale)
1. **Scope: app shell offline, without a tile cache.** Shell + last-loaded
   data covers the value (list, filters, details, markers). Discarded:
   caching the OSM tiles — storage use, expiry logic, and OSM's usage
   rules (only what's visited, no bulk pre-download) cost more than they
   bring; **cheap to retrofit**. Discarded: "manifest only, no SW" —
   without a `fetch` handler, Chrome doesn't offer an install dialog, the
   offline value would disappear entirely.
2. **Data `network-first` with a cache fallback** (not
   stale-while-revalidate) — protects the freshness invariant; a briefly
   stale snapshot at start-up would be substantively wrong, because users
   check *today's* closures.
3. **Shell `cache-first`** — the filenames are unversioned; a revalidating
   mix of old and new `app.js`/`styles.css` would be inconsistent.
   Hence: all-or-nothing per cache version.
4. **Update: a notice banner, no automatic `skipWaiting` reload.** An
   unexpected reload sweeps away filters, search, and map position in the
   middle of use — especially costly for screen-reader and motor-impaired
   users. The user decides when to reload.
5. **No dedicated install button** (`beforeinstallprompt` stays unused).
   Installation via the browser menu; no nag banner, no extra vertical
   space above the map (cf. open task #23), and on iOS/Safari the path
   would be dead code anyway.
6. **Everything relative: `start_url: "./"`, `scope: "./"`, relative icon
   and precache paths; `sw.js` in the repo root.** The site lives under
   `https://<user>.github.io/BauWatch-KA/` — a single leading `/` would
   point at the `github.io` root and make the installed app unusable. The
   SW in the root covers the whole app with scope `./`.
7. **Icons: a hand-written SVG as the source, PNGs rendered from it once
   and committed.** PNG is mandatory for the Android install dialog and
   iOS, a frontend build is excluded → rendering via the Chromium already
   present (`playwright-core`), **once, locally, not in CI**. The PNGs are
   thus ordinary static assets.
8. **Nominatim responses are never cached.** Geocoding needs a network, a
   cached result would be worthless — and the user's address input has no
   business in a cache. Offline, the search is visibly disabled.

## Scope / Non-scope
- **In:** `manifest.webmanifest`, `icons/` (SVG source + PNGs), `sw.js`
  (shell precache + network-first for the data), registration and update
  banner in `app.js`, offline marking of the data timestamp, disabling
  the address search offline, `scripts/test-pwa.mjs` in `npm test`,
  Playwright offline smoke test, docs.
- **Out:** tile caching, push/notifications, background and periodic
  sync, install button/banner, manifest extras (`shortcuts`,
  `screenshots`, `share_target`), Workbox or any other build toolchain,
  versioned filenames/hashing, offline capability of the address search.

## Specification

**Manifest** (`manifest.webmanifest` in the root):
```json
{
  "name": "Wo wird gebaut? — Baustellen in Karlsruhe",
  "short_name": "Baustellen KA",
  "description": "Karte und Liste der offenen Baustellen in Karlsruhe.",
  "lang": "de",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f7f5",
  "theme_color": "#1b4b73",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png",
      "purpose": "maskable" }
  ]
}
```
`short_name` deliberately **"Baustellen KA"** (13 characters): Android
truncates labels under the icon at ~12 characters, "Wo wird gebaut?" would
get cut off. (Manifest content — `name`, `short_name`, `description`,
`lang` — stays German like the rest of the UI; see the language note in
`CLAUDE.md`.)

**Wiring in the `<head>`:** `<link rel="manifest" href="manifest.webmanifest">`,
two `<meta name="theme-color">` with `media="(prefers-color-scheme: …)"`
(`#1b4b73` light / `#16181c` dark — otherwise the system bar flashes light
in dark mode), `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`
(iOS ignores manifest icons).

**Icons:** `icons/icon.svg` as the source (motif: a barrier beacon in
`--accent`, **no text** — unreadable at 48 px), from it `icon-192.png`,
`icon-512.png`, `icon-512-maskable.png` (motif within the ~80% safe zone,
full-bleed background) and `apple-touch-icon.png` (180 px, **no alpha** —
iOS rounds it itself and renders transparency as black).

**Service worker** (`sw.js`, a classic script — a `type: 'module'` SW is
still spotty in Safari):
- `const CACHE_SHELL = 'bauwatch-shell-v1'`, `const CACHE_DATA = 'bauwatch-data-v1'`.
- `install`: precache the **SHELL list** (relative URLs). **No
  `skipWaiting()`** (decision 4).
- `activate`: delete caches with a foreign name, `clients.claim()`.
- `message`: on `{ type: 'SKIP_WAITING' }` → `skipWaiting()` (only
  user-triggered).
- `fetch` — only `GET`, everything else passed through unfiltered:

| Request | Strategy |
|---|---|
| Navigation (`index.html`) | cache-first from the precache; offline = the cached `index.html` |
| Shell assets (`src/`, `vendor/`, `icons/`, manifest) | cache-first, on a miss from the network and stored for next time |
| `data/baustellen.geojson` | **network-first**: copy the network response into `CACHE_DATA`; on a network error, answer from it, setting the header `X-Bauwatch-Cache: hit`; if both are missing → pass the error through |
| `tile.openstreetmap.org`, `nominatim.openstreetmap.org` | **not intercepted** (no `respondWith`) |

- **Maintenance duty:** if a shell file changes, `CACHE_SHELL` must be
  bumped — otherwise installed clients keep the old version. A comment in
  the SW + a new pitfall in `CLAUDE.md`.

**Client (`src/app.js`)**
- Registration only after the first render
  (`window.addEventListener('load')`) and only if
  `'serviceWorker' in navigator`; log errors **silently**. Nothing in the
  app may depend on the SW (progressive enhancement).
- **Update banner:** `registration.addEventListener('updatefound')` → the
  new worker reaches `installed` **and**
  `navigator.serviceWorker.controller` exists → banner "New version
  available" with a "Reload" button. Click →
  `postMessage({ type: 'SKIP_WAITING' })`, then on `controllerchange`
  **once** `location.reload()` (a guard flag against a reload loop).
- **Offline marking:** `loadData()` reads
  `res.headers.get('X-Bauwatch-Cache')` — deliberately **not**
  `navigator.onLine` (returns `true` on captive portals). On a hit: footer
  "Data last changed: <timestamp> · offline, from device storage" plus a
  subtle `.is-stale` marker.
- **Address search offline:** `online`/`offline` events set the input
  field and button `disabled` and write "Address search needs internet"
  into the existing `#search-status` (`role="status"`); reversed on the
  `online` event.

**Edge cases**

| Case | Behavior |
|---|---|
| First visit without a network | no cache, no network → the existing error message in `#list-status`, unchanged |
| Snapshot changed, user offline | cached data **plus** a visible offline timestamp |
| New version, user stays on the page | banner; without a click, work normally, activation on the next cold start |
| SW unavailable (private browsing, `file://`, old browser) | the app behaves exactly as today |
| Map offline | tiles missing → the map is gray; markers (SVG `circleMarker`), list, and filters work (known behavior from the Playwright checks) |
| Storage quota exhausted | catch the `cache.put` error; the response still reaches the page from the network |
| Sub-path `/BauWatch-KA/` | all paths relative; an absolute path would be a silent total failure → hence a test case |
| Changing `start_url`/`scope` later | deliberately **never** — installed clients would have to reinstall |

**Check once after the first deploy** (not testable locally): that GitHub
Pages serves `.webmanifest` with a usable `Content-Type` — if not,
`manifest.json` is the fallback. Not critical, by contrast, are Pages'
`max-age` headers: browsers fetch the SW script past the HTTP cache on an
update check. `.nojekyll` is already in place, so there's no Jekyll
filtering of the new files.

**Accessibility:** the banner as `role="status"`/`aria-live="polite"`,
**no focus stealing**, a keyboard-reachable button with visible focus, AA
contrast from the existing variables, no fade-in animation under
`prefers-reduced-motion`. Offline notices run through the existing live
regions. No auto-reload (decision 4 is primarily an accessibility
decision).

**Test plan**
- **`scripts/test-pwa.mjs`** (new, in `npm test`, plain Node,
  **network-free**): the manifest is valid JSON; required fields present;
  **all paths relative** (no leading `/`, no `http`); every icon file
  exists with a matching `sizes` entry; at least one
  `purpose: "maskable"`; every entry of the SHELL list in `sw.js` exists
  on disk (a single miss makes `install` fail entirely); **every locally
  referenced file from `index.html` is in the SHELL list** (closes the
  classic precache gap); cache names carry a version.
- **Playwright smoke test** (pattern from `CLAUDE.md`, intercept tiles):
  load → `navigator.serviceWorker.ready` → `#liste li` present; then
  `setOffline(true)` → reload → the list is there again, the offline
  marker visible, the search field disabled.
  **Important:** SWs need a secure context — `http://localhost:8080`
  counts as secure, `file://` does not.

**Docs/backlog impact:** `../PRD.md` (feature scope "installable/usable
offline"; tighten the freshness success criterion around the offline
case), `README.md` ("Install as an app" section), `CLAUDE.md` (pitfalls:
bump the `CACHE_SHELL` version on shell changes; SW only testable via
`localhost`), [`BACKLOG.md`](../BACKLOG.md) (create a task and point it at
this entry).

## Definition of Done
- The site is installable on Android/Chrome; manifest and icons without
  console complaints; launches from the home screen in standalone mode.
- An offline reload shows the shell, list, filters, and the last-loaded
  data — **with** a visible offline-timestamp marker; online, always the
  fresh snapshot.
- The update banner appears on a new cache version; reload only on a user
  click, no reload loop.
- Without service-worker support, the app behaves as it does today.
- `scripts/test-pwa.mjs` green in `npm test`; the Playwright offline check
  green.
- All paths relative (sub-path capable); **no push, sync, or notification
  handler**; no new user-related data store; no login.
- Accessibility as above; PRD/README/CLAUDE/BACKLOG updated.

## Implementation steps
1. Design `icons/icon.svg`, render the PNGs once, commit.
2. `manifest.webmanifest` + `<head>` wiring in `index.html`.
3. `sw.js` with shell precache and the network-first data branch.
4. Registration, update banner, and banner styles in
   `app.js`/`styles.css`.
5. Offline marking of the timestamp + disabling the address search
   offline.
6. Write `scripts/test-pwa.mjs` and wire it into `npm test`.
7. Run the Playwright offline smoke test.
8. Update docs (PRD, README, CLAUDE, BACKLOG), set the status in the
   [overview](./README.md#overview) to 🏁.
