# Backlog

Every item was originally meant to be its own GitHub issue. Title = issue
title, context and Definition of Done below it. Order = rough build sequence.
Suggested labels: `setup`, `data`, `frontend`, `a11y`, `docs`, `enhancement`.

> This backlog collects technical tasks and fixes. **Elaborated feature
> ideas** live in [Requirements](./anforderungen/README.md) — one file per
> feature under `docs/anforderungen/`; they come out of the fixed
> [refinement process](./PROZESS.md).

**Status legend:** ✅ done · 🟡 partial / open · ⬜ open
**As of:** 2026-08-07 (#32 added and open — the amber traffic-light dot
reaches only ~2.5:1 in light mode, found while measuring A-10.)

> Summary: Milestones 1–3 are implemented and the site is live via GitHub
> Pages (#5). From Milestone 4, #15 and #18 are done; #16 (push/subscription
> idea) is evaluated (result → requirement A-2), what remains open as an
> optional item is #17 (.ics export). From the requirements, **A-3 (PWA) is
> implemented** (#24); from the desktop UI review, #22 and #23 are done.
> From the showcase pre-review, #25 and #26 are done. #27 (a follow-up
> desktop UI fix) and #28 (a follow-up on the "What's new?" feed) are done.
> **A-7 (construction-site areas) is implemented**; of its two follow-ups,
> #29 is done and #30 is deliberately open (not planned). #31 (a PWA
> manifest fix) is done. **A-10 (result metrics) is implemented**; #32, an
> a11y finding it surfaced in the shared traffic-light dot, is open.

---

## Milestone 1 — Scaffolding & Data Pipeline

Goal: the repo is in place, the Action produces clean GeoJSON, the site is
online (empty).

### ✅ #1 Set up repo scaffolding
Folder structure per ADR-001, `index.html`, `src/`, `scripts/`, `data/`,
license file (MIT), `.gitignore`, README with short description + link to
the PRD.
**DoD:** structure exists, repo can be cloned and opened. — **done.**

### ✅ #2 Shared library modules (`src/lib/`)
`transform.js` (UTM32→WGS84, with a reference test against proj4 ground
truth), `classify.js` (art→plain text, closure-severity traffic light, mode
of transport), `format.js` (remaining duration, HTML cleanup). ES modules,
no DOM dependency.
**DoD:** pure functions; `scripts/test-transform.mjs` checks against known
reference coordinates. — **done** (plus `scripts/test-diff.mjs`).

### ✅ #3 Build script `scripts/build-data.mjs`
Fetches WFS GeoJSON, filters `gemeinde="Karlsruhe"`, deduplicates
point/polygon, transforms coordinates, cleans up fields, writes lean
`data/baustellen.geojson`.
**DoD:** valid, slimmed-down output; error case aborts cleanly without
destroying the existing file. — **done & validated against the real WFS
schema**: dedup via `vorgangsnummer` (point+polygon per case → 440 down to
186 cases), real field names (`vorgangszeitraum_von/_bis`, `lage`), traffic
light from the official field `sperrung`. Additionally hardened: WFS-variant
fallback (1.0.0/typeName …), CRS auto-detection, writes only on a real
change.

### ✅ #4 GitHub Action `update-data.yml`
Cron (every 4 h) + `workflow_dispatch`. Runs the build script, commits only
on a change.
**DoD:** Action runs green, commits on changed data, skips the commit on
identical data. — **done & verified** (a run fetched 440 construction sites).

### ✅ #5 Enable GitHub Pages
Deployment from `main` (root). Document domain/path.
**DoD:** `index.html` is publicly reachable. — **done**, Pages is enabled
and the site is live (deploy from `main`/root, `.nojekyll` present).

---

## Milestone 2 — Core UI (the core loop)

### ✅ #6 Map + markers from static GeoJSON
Leaflet map, color-coded markers (traffic light), popup with plain text,
loads `data/baustellen.geojson`. **DoD met.**

### ✅ #7 Synchronized list
List next to/below the map, clicking centers the map and opens the popup;
remaining duration, originator, mode of transport visible. **DoD met**
(interaction works both ways).

### ✅ #8 Filters: time period, closure severity, mode of transport
Segment buttons, combinable; stats bar updates live.
**DoD met** (checked end-to-end in the browser).

### ✅ #9 Address/radius search
Nominatim geocoding (referer identification, search only on submit), 1.5 km
radius, distance sorting, radius circle, reset button.
**DoD met**; the error case shows a helpful message.

### ✅ #10 Empty states & loading states
Meaningful text for loading / no results / data error. **DoD met.**

---

## Milestone 3 — Quality & Polish

### ✅ #11 Responsive & mobile
Layout stacks map + list down to smartphone. **DoD met** (layout down to
360px).

### ✅ #12 Accessibility
Visible keyboard focus, contrast (WCAG AA targets), ARIA for segment
buttons (`aria-pressed`, `role=group`), skip link, `prefers-reduced-motion`.
**DoD essentially met** — a formal audit with a tool (axe/Lighthouse) is
still outstanding as a cross-check.

### ✅ #13 Attribution, legal-notice pointer, data timestamp
CC-BY reference, "data last changed", liability notice (on-site signage is
binding), link to the change history. **DoD met.**

### ✅ #14 README for contributors
Setup, local build, how the Action works, how to add plain-text mappings,
a "tracking changes" section. **DoD met.**

---

## Milestone 4 — Optional / later (deliberately post-v1)

### ✅ #15 Complete the `art`-code mapping
Translate all codes that actually occur, including a fallback for unknown
ones.
**Insight from the real data:** the `art` field contains **no cryptic
codes, it's already plain text** — 15 categories (electricity/telecom
supply, special construction use, district-heating supply, gas/water
supply, road construction, sewer construction, rail construction, bridge
construction, tunnel construction, stop conversion with street
redesign, retaining wall, demolition, changed traffic routing due to
construction work, ground investigation, crane use).
**Done:** `classifyArt` already passes readable categories through directly
(`known=true`), cryptic codes keep the fallback "Baustelle (…)"; `ART_MAP`
remains an override point, `scripts/test-classify.mjs` covers both. The 15
categories are documented in the module.

### ✅ #16 Evaluate the push/subscription idea
Check whether a subscribable feed per district (pre-generated by the
Action) is feasible without a backend.
**Result of the evaluation** — keeping "push" and "subscription" apart:
- **Real push (Web Push) is not feasible without a backend** and collides
  with several non-goals: it needs an application server (VAPID delivery to
  FCM/Mozilla/Apple) and the **persistent storage of the push endpoint per
  subscriber** — de facto its own, personally identifiable data store ("no
  data storage of our own", "no user account"). The Action as the sender
  doesn't fix that (it would still have to store the endpoints). → discarded.
- **Subscription via a static Atom feed is feasible and architecturally
  consistent:** the Action generates the feed the same way it pre-generates
  the GeoJSON; feed readers poll it themselves (no server, no endpoint
  storage, anonymous). The feed items are exactly the diff that
  `diff-data.mjs` already computes (added/removed/changed) — the feed is
  the machine-readable twin of `data/CHANGELOG.md`.
- **"Per district" would only be possible via a derived district** (the
  dataset has **no** district field, only street + coordinates) — e.g. via
  point-in-polygon against the official district boundaries. **Decision
  (2026-07-24): not pursued** — no additional data source. The geographic
  "near me" need is instead covered **client-side** via the existing radius
  search + a "since last visit" marker.
The remaining scope — a **global Atom feed** (a pure stream of changes, no
faceted feeds) built from the diff that's computed anyway — is elaborated as
feature entry [**A-2**](./anforderungen/A-2-baustellen-abo-feed.md) and set
to **implementation-ready** with all forks decided. — **evaluated;
implementation only after a green light (refinement process step 8).**
(Label: `enhancement`, `data`)

### ⬜ #17 Calendar export of planned construction sites
`.ics` for "planned soon" closures in a chosen radius. — **open.**

### ⬜ #19 Public-transit routing for "Mein Arbeitsweg"
The "Mein Arbeitsweg" ("my commute") feature (see
[A-1](./anforderungen/A-1-mein-arbeitsweg.md)) initially only covers
foot/bike/car, because street routing doesn't know bus/tram lines. Evaluate
a transit-capable variant for public transit (GTFS/transit routing) —
notably more effort, hence deliberately later. — **open.**

### ✅ #18 Data-quality report
Log anomalies (empty fields, unknown codes) for structured feedback to the
city.
**Done:** `scripts/quality-report.mjs` generates `data/QUALITY.md` — empty
required fields (with examples), unknown art categories, date anomalies
(end before start, expired), coordinates outside Karlsruhe, cases without a
process number, and the mapping of `sperrung` values to the traffic light.
Written into the Action job summary on every run, committed only on a data
change. The report promptly surfaced three traffic-light misclassifications
(among others "no traffic obstruction"), which were then fixed — the
official `sperrung` field is now authoritative.

---

## Desktop UI review findings (2026-07-24)

Polish from a desktop review (map + list, dark mode). All post-v1,
non-blocking. The review finding "marker clustering downtown" is
deliberately **not** included (a bigger undertaking, possibly a separate
feature entry).

### ✅ #20 Remove `role="application"` from the map
`index.html:83` set `role="application"` on `#map`. That trapped screen
readers in application mode, even though the map has a full-fledged list
fallback — interactive operation runs through the list and filters anyway.
**DoD:** `role` removed or changed to `role="region"`, `aria-label` stays;
a brief screen-reader/keyboard cross-check. — **done**: `role="region"` set
(a named landmark instead of an application trap), `aria-label` unchanged.
(Label: `a11y`)

### ✅ #21 Stat tiles: clickable or clearly marked as display-only
The "full closures"/"obstructions" tiles (`index.html:74–78`) mirror the
closure-severity filter but aren't interactive — users expect click =
filter. Either make them clickable (sets the closure-severity filter) or
visually mark them clearly as pure display. Side finding: the
construction-site count appears twice (tile + list header "N construction
sites").
**DoD:** decision made and implemented; if clickable, `aria-pressed` +
keyboard operation analogous to the segment buttons, otherwise visual
decoupling; the double count resolved or deliberately kept. (Label:
`frontend`, `enhancement`)
**Decision: display-only (not clickable).** Instead of meeting the "click =
filter" expectation, the tiles are visually marked clearly as display-only,
so the impression of a control never arises in the first place.
Implementation: the tiles are non-interactive `<div>`s again (no
`<button>`, no `aria-pressed`, no keyboard operation); `.stat` deliberately
gets **no card/button look** (no border, no shadow, no hover, no pointer
cursor) and is thus visually decoupled from the clickable filter segments.
The closure severity is controlled exclusively via the segment buttons; the
earlier catch-all filter value `behinderung` in `matchesAmpel` is removed
again.
**Double count resolved:** the total construction-site count already
appears in the list header ("N construction sites"); the tile for it was
removed. The stats bar now only shows the closure-severity breakdown "full
closures"/"obstructions", which the list doesn't show. (Label: `frontend`,
`enhancement`)

### ✅ #22 Badge contrast in dark mode
`styles.css:341`: `.badge { background: var(--bg) }`. In dark mode, `--bg`
(#16181c) is darker than the map surface `--surface` (#1f2329) — the badge
(e.g. "car") looks punched-out instead of like a resting chip.
**DoD:** badge surface in dark mode not darker than the map (a tinted
surface or accent border); light mode unchanged; WCAG AA contrast held.
(Label: `frontend`)
— **done**: a tinted surface via two dedicated tokens `--chip`/`--chip-border`
instead of reusing `--bg`. Badges sit on `--surface`, not on the page
background; in light mode, `--bg` only happened to fit by coincidence.
Light-mode values are word-for-word the old ones (`#f7f7f5` / `#d9dce1`), in
dark mode `#2a3038` (lighter than the map) with a lighter border `#434a54`
— with `--border` (#333941) the edge would be smeared into the chip's tone.
Calculated, not estimated (Playwright, one context each with
`colorScheme: 'light'`/`'dark'`, values from `getComputedStyle`): badge text
6.57:1 light / 5.90:1 dark, distance badge (`--accent`) 8.51:1 / 5.15:1 —
all above WCAG AA; in dark mode L(chip) 0.0289 > L(map) 0.0165,
surface↔map 1.19:1. `CACHE_SHELL` bumped to `v4` (shell file changed).

### ✅ #23 Vertical space above the map (desktop)
Header + search + three filter groups + stats stack vertically; at laptop
height (~1080p) the map only starts at ~40% of the viewport. Check a more
compact arrangement (filters/stats tighter or in one row side by side).
**DoD:** map visibly taller on 1080p (define a target value); mobile
layout and focus order unchanged. (Label: `frontend`)
**Decision: remove the stats bar entirely** rather than compact it. The
closure-severity breakdown ("full closures"/"obstructions") was requested to
be dropped outright to reclaim the space, on mobile in particular — not
reflowed into a tighter row. `docs/PRD.md`'s feature scope no longer lists a
stats bar. Implementation: `#stats` section removed from `index.html`,
`renderStats()` removed from `src/app.js`, `.stats`/`.stat` rules removed
from `src/styles.css`, the now-unused `statsAriaLabel`/`statVoll`/
`statBehinderung` keys removed from `src/lib/i18n.js`. `CACHE_SHELL` bumped
to `v7` (shell files changed).

---

## Follow-up desktop UI fix (2026-07-28)

### ✅ #27 Unstyled Leaflet chrome in dark mode
A dark-mode desktop screenshot showed the zoom control, the map attribution
box, and marker popups as stark white boxes on the dark map —
`vendor/leaflet/leaflet.css` hardcodes white/black for all three and was
never themed, unlike every other control in the app. Same root cause as #22
(a vendored/default style not adapted for dark mode), just a different
element.
**DoD:** zoom control, attribution box, and popups themed with the app's
existing tokens in dark mode; light mode unchanged (it already matched
Leaflet's white defaults by coincidence, same as `--bg` did for badges
before #22). — **done:** `src/styles.css` overrides `.leaflet-bar a`,
`.leaflet-control-attribution`, `.leaflet-popup-content-wrapper`,
`.leaflet-popup-tip`, and `.leaflet-container a.leaflet-popup-close-button`
with `--surface`/`--text`/`--text-muted`/`--border`/`--accent`/`--chip`/
`--shadow` — no new dark-mode media query needed, since those tokens already
flip per scheme. Verified with Playwright screenshots (light + dark, map
view and an opened popup) and `npm test` (all green). `CACHE_SHELL` bumped
to `v8` (shell file changed). (Label: `frontend`)

---

## Follow-up on the "What's new?" feed (2026-07-28)

### ✅ #28 Keep generic-only changes out of the "What's new?" feed
A screenshot of the feed showed three of five items reading
"<Straße> — sonstige Angaben aktualisiert". That's the fallback note for a case
that changed only outside the observed fields (coordinates, `art`, mode of
transport): it says *something* is different but not what, so it can't answer
the app's actual question ("does this affect me?"). Whole runs consisted of
nothing else, and the noise pushed the items that do carry information out of
view. `data/CHANGELOG.md` is the opposite case — there the note belongs, it's
the record of what the data did.
**DoD:** no item with the generic note appears in the feed any more, runs left
empty by that show no bare timestamp heading, and `data/CHANGELOG.md` still
records the change. — **done:** the literal and the filter live in the new
shared, pure module `src/lib/changelog.js` (`GENERIC_CHANGE_NOTE`,
`meaningfulChanges`, `cleanChangelogEntry`, `hasFeedContent`,
`filterChangelogEntries`), imported by **both** sides so the string exists once:
`changelogEntry()` in `scripts/diff-data.mjs` no longer emits such a change,
`build-data.mjs` skips an entry that comes out empty, and `src/app.js` filters
on read as well — which is what cleans the entries already committed inside the
30-day window and any copy an installed service worker still holds. The
parity between `data/CHANGELOG.md` and `data/changelog.json` is **directional**
from now on (feed ⊆ Markdown); `scripts/test-changelog-feed.mjs` was extended
accordingly (writer side, reader side, mixed case, idempotency, malformed
entries, plus static checks that both sides are wired up and that `app.js`
carries no second copy of the literal). `data/changelog.json` cleaned in the
same pass. `CACHE_SHELL` bumped to `v10` (new shell file `src/lib/changelog.js`,
`src/app.js` changed). Follow-up on requirement
[A-6](./anforderungen/A-6-was-ist-neu-feed.md), which stays `🏁 done`.
(Label: `frontend`, `data`)

### ✅ #29 Popup room on area selection: measure, don't guess
Follow-up on [A-7](./anforderungen/A-7-baustellenflaechen.md). Selecting a case
with an area fits the map to it and opens the marker popup. Leaflet's popup
`autoPan` pans the map so the popup sits at the **map** edge — computed from
popup and marker alone, so it lands in the same place no matter what the fit
just did, and pushed 25–50 m of the just-fitted shape back out of view. The
first fix disabled `autoPan` for these markers and reserved a **fixed 170 px**
strip at the top of the fit. That worked but was a guessed number: a short
popup paid the same 170 px as a long one, and on a phone the strip squeezed the
shape into the lower third.
**DoD:** the reserved strip matches the popup that is actually shown, the
popup is never clipped, and the point-only path keeps today's exact `setView`
behaviour. — **done:** the popup is opened **before** `fitBounds` (safe now
that `autoPan` is off for these markers, so opening moves nothing), then
`popupPlatz()` reads its real `offsetHeight` and reserves exactly that, capped
at `AREA_FIT_POPUP_MAX_SHARE` (40 %) of the map height so a long info text
can't crush the shape on a small display. Measured against the live snapshot:
116–153 px reserved instead of a flat 170 (map 491 px tall on mobile, 628 px on
desktop; cap 196/251 px), so nothing came near the cap and no popup is clipped
— the common short popup gives 54 px of map back. Deliberately *not* "reserve
nothing when the popup exceeds the cap", which was the first idea: with
`autoPan` off that clips the popup at the map edge, and unreadable is worse
than shifted. Verified by 32 Playwright checks against real city geometry
(each multi-part case's fit spans all parts, popup stays inside the map,
point-only selection byte-identical to the pre-A-7 checkout).
(Label: `frontend`, `a11y`)

### ⬜ #30 Very large areas fit at a zoom where they read as a hairline
Also from [A-7](./anforderungen/A-7-baustellenflaechen.md). A case like
`2025V6065` (Waldstadt) is a ~1.9 km corridor whose polygon ring has 180
vertices; `fitBounds` correctly zooms out to ~13 to show all of it, where the
shape is about two pixels wide. E5 anticipated this ("`fitBounds()` naturally
zooms out to fit; the `maxZoom` cap only bounds the *tight* end"), so it is not
a defect — but it is the one case where the area adds little over the marker.
**Deliberately open, not planned.** Every option costs more than it returns
today: a `minZoom` floor would hide the extent, which is the whole point of the
feature; zoom-adaptive stroke weight is real complexity for a handful of cases;
and the line-geometry corridors already get the heavier 6 px stroke, so this
only touches polygons whose ring happens to be long and thin. Note also that
this was judged from screenshots with the OSM tiles intercepted — against real
street context a hairline corridor reads considerably better than against grey.
Revisit only if it comes up in practice. (Label: `frontend`, `enhancement`)

---

## Mobile finding (2026-07-31)

### ✅ #31 Installed PWA ignores the device rotation lock
`manifest.webmanifest` declared `"orientation": "any"`. On Android, Chrome
maps that value to the WebAPK's `screenOrientation="fullSensor"`, which
rotates by sensor **regardless of the user's system rotation lock** —
`"any"` means "actively request all four orientations", not "defer to the
system". In a browser tab the manifest field is ignored, so the bug only
showed on the installed app, where it read as the app overriding a device
setting. The frontend itself never calls `screen.orientation.lock()`, so
the manifest was the sole cause.
**DoD:** the installed app follows the device rotation lock again; nothing
else about installation or display changes. — **done:** the `orientation`
member removed entirely (omitting it yields Android's default `user` mode:
rotates with the device but respects the lock — there is no manifest value
that expresses this, which is why the fix is a removal, not a different
value). `CACHE_SHELL` bumped to `v13` (the manifest is a shell file).
Already-installed users pick this up only when Chrome's periodic WebAPK
update check runs (typically within a few days of an app start), not on the
next launch. (Label: `frontend`)

### ⬜ #32 The amber traffic-light dot reaches only ~2.5:1 in light mode
Found while measuring A-10, and it predates it: `--amber` (`#f08a00`) as a
**dot** against the surface it sits on gives **2.52:1** in a list item and in
a Sperrgrad filter button, **2.35:1** in an A-10 metrics chip — light mode
each time. Dark mode is fine throughout (7.3–8.6:1), which is exactly why
this never surfaced: it is the same "only visible if you test in light mode"
trap `CLAUDE.md` already records for `--amber` **as text**, one component
over. Red and green are unproblematic (5.5:1 / 5.0:1 in light).

Not currently a WCAG failure: every dot is `aria-hidden`, sits next to the
category in words, and has its own 1 px rim, so no information depends on it
(SC 1.4.11 covers graphical objects *required* to understand the content).
It is still the weakest link in the traffic-light palette, and the moment a
dot ever appears without its label, it becomes a real one.

**Deliberately not fixed inside A-10** ([see *E2 revised*](./anforderungen/A-10-kennzahlen-ergebnisliste.md#decisions-with-rationale)):
a chip-only amber would put a second amber on the page and break A-7/E4;
changing `--amber` globally also moves the marker and area colours of A-7/A-9
and needs its own pass over all three components.
**DoD:** either `--amber` darkened far enough for ≥ 3:1 in light mode against
`--surface`/`--chip` **with** markers and areas re-checked in both schemes, or
a documented decision that the dot stays decorative and the ratio is accepted.
Measured, not estimated, in all three theme states. (Label: `a11y`,
`frontend`)

---

## Implementing elaborated requirements

Tasks that technically implement an elaborated requirement from
[`anforderungen/`](./anforderungen/README.md). The *why* and the decisions
made live there, here only the build status.

### ✅ #24 Implement the PWA (installable & offline) — requirement A-3
Technical implementation of the elaborated requirement
[A-3](./anforderungen/A-3-pwa-installierbar-offline.md) (the decisions and
the Definition of Done live there; the status lives in the
[overview](./anforderungen/README.md#overview)).
**Done:** `manifest.webmanifest` + `<head>` wiring (manifest, two
`theme-color` entries light/dark, `apple-touch-icon`), `icons/icon.svg` as
the source plus the PNGs rendered from it (192/512/512-maskable/180-Apple,
`scripts/render-icons.mjs`, manual), `sw.js` with shell precache
(cache-first, all-or-nothing per `CACHE_SHELL` version) and
**network-first** for `data/baustellen.geojson`, registration + update
banner in `src/app.js`, offline marking of the data timestamp via the SW
header `X-Bauwatch-Cache`, disabling the address search offline,
`scripts/test-pwa.mjs` in `npm test`.
Non-goals honored: **no** `push`/`notificationclick`/`sync` handler
(guarded by the test), no tile cache, no install banner, no user-related
storage, no build toolchain.
Added beyond what the requirement needed: the `install` handler loads the
data snapshot once itself — the very first page load still bypasses the
service worker uncontrolled, otherwise after a single visit the shell would
be ready offline but not a single construction site would be. (Label:
`frontend`, `a11y`)

---

## Findings from the showcase pre-review (2026-07-26)

Feedback from the open-data editorial team on the submission for the
transparency portal (document:
[`showcase-einreichung.md`](./showcase-einreichung.md)). The
legal-notice/privacy-notice item from the same feedback is **not** a task,
it was taken up as requirement `A-4` — it has open product decisions (see
[process](./PROZESS.md#requirement-or-task-the-test)).

### ✅ #25 Attribution static in the served HTML
The CC-BY attribution was an **empty** paragraph in `index.html` and was
only filled in by `setFooter()` after the data fetch. Visible in the
browser — not in the served document, without JavaScript, or on a failed
data fetch. The wrong place for a license condition. The editorial team
noticed exactly that.
**DoD:** the attribution is static in the HTML, not overwritten by JS, a
test guards it. — **done:** a static paragraph in `index.html` (with a link
to the dataset in the portal and to the license text), `setFooter()` now
only writes the sample-data notice into the separate paragraph
`#attribution-hinweis`, `scripts/test-attribution.mjs` (in `npm test`)
checks existence, non-overwriting, and **word-for-word match with
`ATTRIBUTION`** from `build-data.mjs`. Cross-check: all three regressions
(empty attribution, overwritten by `app.js`, drift from the build constant)
turn the test red. Shell file changed →
`CACHE_SHELL` to `v2`. (Label: `frontend`, `docs`)

### ✅ #26 Screenshots for the showcase entry
The portal entry needs a preview image ("without an image the entry looks
broken").
**DoD:** a screenshot exists and can be reproducibly generated. — **done:**
`scripts/screenshot.mjs` (manual, like `render-icons.mjs` deliberately
**not** in `npm test`/CI) generates `docs/showcase/screenshot.png`
(1440 × 900) and `screenshot-mobil.png` (390 × 844), fixed to light mode.
The script **counts the loaded map tiles and aborts** instead of silently
writing a gray image — exactly the bug that would otherwise sneak into the
portal unnoticed in an environment without OSM egress. If the app's tile
host is blocked by egress policy but a subdomain mirror is reachable, it
fetches tiles from there and says so in the log; `src/app.js` stays
untouched. (Label: `docs`, `frontend`)

---

## Also implemented (not in the original backlog)

- **Data change overview:** commit only on a real change,
  `data/CHANGELOG.md` (new/removed/changed with field details), a short
  summary in the commit message and the Action job summary. Every changed
  case carries a short note on what changed — for changes outside the
  observed fields, a generic notice ("other details updated"). That generic
  notice stays in `data/CHANGELOG.md` only; the user-facing "What's new?"
  feed leaves it out (#28).
- **WFS robustness:** several request variants with fallback; detects XML
  errors despite HTTP 200; CRS auto-detection guards against a wrong
  transform.
- **Leaflet bundled locally** (`vendor/leaflet/`) instead of a CDN — no
  fragile third-party runtime dependency.
