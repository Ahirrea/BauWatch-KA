# Backlog

Every item was originally meant to be its own GitHub issue. Title = issue
title, context and Definition of Done below it. Order = rough build sequence.
Suggested labels: `setup`, `data`, `frontend`, `a11y`, `docs`, `enhancement`.

> This backlog collects technical tasks and fixes. **Elaborated feature
> ideas** live in [Requirements](./anforderungen/README.md) — one file per
> feature under `docs/anforderungen/`; they come out of the fixed
> [refinement process](./PROZESS.md).

**Status legend:** ✅ done · 🟡 partial / open · ⬜ open
**As of:** 2026-08-14 (**A-13 implemented** — on a phone the filter row now stands
between map and list, so the whole map is on the first screen: `#map` starts at
247 px instead of 447 px at 375 × 667. In the same pass #33's width sentence was
clarified — "all three groups fit one row" was always meant per group, and the
three groups have never shared a line on a phone; #33 itself stays ✅ and closed.
Same day: #35 added and done — on desktop the list hung 39 px below
the map because both columns sized themselves independently. Same day: A-12
implemented — the dead "Zeitraum" filter is gone and A-10's metrics moved into
the closure-severity buttons; #21's "display-only" decision is superseded by it.
Before that: #34 added and done — the "Was ist neu?" dialog had two scrollbars,
and dragging the outer one scrolled the whole feed out of the frame.)

> Summary: Milestones 1–3 are implemented and the site is live via GitHub
> Pages (#5). From Milestone 4, #15 and #18 are done; #16 (push/subscription
> idea) is evaluated (result → requirement A-2), what remains open as an
> optional item is #17 (.ics export). From the requirements, **A-3 (PWA) is
> implemented** (#24); from the desktop UI review, #22 and #23 are done.
> From the transparency-portal pre-review, #25 and #26 are done. #27 (a follow-up
> desktop UI fix) and #28 (a follow-up on the "What's new?" feed) are done.
> **A-7 (construction-site areas) is implemented**; of its two follow-ups,
> #29 is done and #30 is deliberately open (not planned). #31 (a PWA
> manifest fix) is done. **A-10 (result metrics) is implemented**; #32, an
> a11y finding it surfaced in the shared traffic-light dot, is open. #33 (the
> small-phone layout) and #34 (the double scrollbar in the "Was ist neu?"
> dialog) are done. **A-12 (filter row) is implemented** — it supersedes #21's
> "display-only" decision and A-10's metrics strip; #32 is unaffected and stays
> open. #35 (the desktop column heights, a follow-up to #23 and #27) is done.
> #33 stays done and is only clarified; what it could not reach by tightening
> spacing — the whole map on the first screen — is **A-13, implemented** the same
> day (the filter row now stands between map and list on a phone).

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
**Superseded on 2026-08-14 by [A-12](./anforderungen/A-12-filterzeile-restdauer-kennzahlen.md)/E2.**
The "display-only" decision above solved the click-equals-filter mismatch by
removing the affordance; A-12 solves it by removing the *duplication* instead —
the numbers moved **into** the closure-severity buttons, which were already the
control, so there is one element per job rather than two. This entry stays `✅`
(it was done, and superseding is a different thing from undoing), and its
double-count resolution still holds: the total appears only in the list header,
the "Alle" button carries no number.

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

## Small-phone layout finding (2026-08-08)

### ✅ #33 On an iPhone SE the map starts below the fold, and a wrapped filter group looks broken
A screenshot at 375 × 667 showed two things. **The vertical budget:** header +
search + three filter groups measured **558 px of the 667 px viewport**, so the
map got 109 px — the whole first screen was chrome. Same complaint as #23, one
device class down; #23 removed the stats bar for laptop height and never looked
at the phone. **The ragged segmented control:** the "Zeitraum" group has four
buttons, needs ~450 px, and wrapped — but `.segments` separated its buttons with
`border-right`, which only draws between *columns*. The second row sat flush
against the first with no line between them, and the space beside the lone
"Alle" stayed bare container background, so the group read as a half-drawn box.
**DoD:** the map visible on the first screen at 375 px without scrolling, a
wrapped group looking deliberate, no horizontal overflow from 320 px up in both
languages, desktop untouched. — **done**, all measured with Playwright (Edge
channel, OSM tiles intercepted where relevant):

- **Separators come from a 1 px flex `gap` over the container's own background**
  instead of `border-right` per button — a gap draws in both axes, so a wrapped
  row gets its horizontal line. Buttons additionally got `flex: 1 1 auto`, which
  can only take effect once a group wraps (`.segments` is `inline-flex` and
  shrink-to-fit, so a single row has no free space) and fills the second row
  rather than leaving the bare strip.
- **A `@media (max-width: 480px)` block** tightens the header padding, `h1`
  (1.5→1.3 rem), the tagline, the search padding, and the filter row gap, and
  drops the segment font to 0.85 rem — at 0.92 rem the "Zeitraum" group needs
  ~450 px, at 0.85 rem **all three groups fit one row from 360 px up**, in DE and
  EN. Below that it wraps, which is now the tidy state, not a defect.
  **Clarified 2026-08-14** (the sentence reads as its own opposite and cost a
  round during A-13's refinement): "one row" means **per group** — each group's
  buttons on one line, the four-button "Zeitraum" group being the one that used
  to wrap. The three groups have never shared a line at phone width and cannot:
  they measure 186 / 304 / 253 px against 343 px at 375 px, so the filter block
  is 190 px tall in three rows, before A-12 as well as after it.
- `.search-status:empty` collapses to `min-height: 0` — deliberately *not*
  `display: none`: it is an `aria-live` region, and one removed from the
  accessibility tree may not announce text added the moment it returns.
- **Deliberately not done: pulling the "Umkreis suchen" button up next to the
  input.** That is the obvious remaining 49 px, and it was measured and
  rejected — the placeholder "Adresse in Karlsruhe (z. B. Kaiserstraße 1)" needs
  304 px of text width and has exactly 317 px at 375 px, so sharing the row cuts
  the example off mid-word on the very device this is for. Below 360 px it is
  clipped either way; that is no reason to clip it at 375 px too.

**Measured result** (`#map`'s top edge, dark and light identical): 375 px:
**558 → 447 px**, so the visible map grows 109 → 220 px. 320 px: 498 px ("Zeitraum"
still wraps, now cleanly). 360/390 px: 468 px. No horizontal overflow at 320,
360, 375, 390, or 430 px, in either language. **Desktop is untouched**: at
1280 px the filter block stays 64 px tall and `#map` starts at 278 px exactly as
before, and a pixel diff of the filter strip against a `git archive HEAD`
checkout shows 48 of 307 200 pixels differing by ≤ 10/255 in light mode and 0 in
dark — antialiasing along the separators, no layout change. `CACHE_SHELL` bumped
to `v16` (`src/styles.css` is a shell file). (Label: `frontend`)

### ✅ #34 The "Was ist neu?" dialog has two scrollbars, and the outer one leads into an empty box
A `<dialog>` gets `overflow: auto` from the UA stylesheet, so `max-height: 80vh`
turned the dialog itself into a scroll container **next to** `.whats-new-body`,
which had its own `max-height: calc(80vh - 6rem)` plus `overflow-y: auto`. Two
bars side by side, and the outer one had a range of **9001 px** at 1280 × 900:
dragging it (or a wheel over the heading, or scroll chaining past the bottom of
the body) pushed heading, note and all 42 entries out of the 713 px frame and
left an empty white box. What produces the outer bar in the first place is a
Chromium detail worth knowing: it adds the body's overflowing children to the
dialog's scrollable overflow region even though the body already clips them —
`contain: paint` on the body takes that region from 9001 px back to 0, and an
isolated `div`-in-`div` repro does *not* show the effect, so the ancestor being
a top-layer `<dialog>` is part of it.
**DoD:** exactly one scrollbar, no user-reachable outer scroll (bar, wheel,
chaining, focus), heading and note pinned, the last entry still reachable, the
short-content states unchanged. — **done**:

- `.whats-new-dialog` is now a `display: flex; flex-direction: column` frame
  with `overflow: clip` (cancels the UA `overflow: auto`; it also covers
  browsers without `contain`), `.whats-new-body` is `flex: 1 1 auto;
  min-height: 0; overflow-y: auto; contain: paint`.
- **The body's `max-height: calc(80vh - 6rem)` is gone**, and not only because
  of the second bar: the reserved constant is in `rem` while the cap it is
  subtracted from is in `vh`, so it fit at exactly one root font size. Measured,
  heading + note come to 87 px against the reserved 96 px at a 16 px root and to
  108.6 px against 120 px at 20 px — the body was always a few px short and the
  dialog never reached its own 80vh cap. The flex layout derives the height
  instead, so the frame now measures exactly the cap: 720 px at 900 px viewport
  height, 717 at 896, 534 at 667.
- **Measured before → after** (Playwright, four configurations): outer
  scrollable range 9001 → **0** px at 1280 × 900, 11670 → 0 at 414 × 896,
  13027 → 0 at 375 × 667, 11442 → 0 at 1280 × 900 with a 20 px root. A wheel
  over the heading moved the frame 1500 → 0 px, scroll chaining out of the body
  9001–13027 → 0, a focus jump to an element at the end of the list 0 → 0. The
  body itself still scrolls its full 9044 px, the heading does not shift while
  it does (0 px), and the last entry stays reachable. Short content still
  shrinks the frame instead of stretching it: 168 px for the empty state,
  300 px for a single run.
- `CACHE_SHELL` bumped to `v17` (`src/styles.css` is a shell file).

**Follow-up, same day — the first version of this fix shipped a regression.**
`display: flex` sat on the plain `.whats-new-dialog` rule, and **author styles
beat the UA origin whatever the specificity**, so it overrode
`dialog:not([open]) { display: none }`: on GitHub Pages the *closed* dialog was
part of the page, an unopened box between header and search field, no backdrop,
left two thirds covered by the map that follows it in the DOM. `display` now
sits on `.whats-new-dialog[open]` next to the fade, with the reason written
above the rule. What let it through is worth more than the fix: every probe and
every screenshot of the original round clicked the button first, and an *opened*
dialog looks correct in both versions. The closed state is now part of the
check — `display: none`, a 0 × 0 client rect, `#search-form`/`#map`/document
height unchanged (126/278/1126 px desktop, 114/410/1774 px mobile), and the
initial page screenshot **byte-identical** to the pre-#34 checkout at 1280 × 900
and 414 × 896. `CACHE_SHELL` → `v18`. (Label: `frontend`)

---

## Desktop layout finding (2026-08-14)

### ✅ #35 On desktop the list hangs below the map instead of ending with it
Reported from a 1280 px screenshot: the map is not flush with the list, and the
list therefore sticks out at the bottom. The cause is that both columns sized
themselves independently — `#map { height: 70vh }` and `.liste { max-height:
70vh }` — while only the list column also carries `.list-status` ("177
Baustellen") above its list. So the list column's stack came to 70vh + 39 px,
`align-items: stretch` grew *both* wrappers to that height, and the 39 px showed
up twice: as list overhang below the map's bottom edge, and as empty background
under the map inside its own stretched wrapper. Measured identically at
1280 × 800, 1440 × 900 and 900 × 800, and in both schemes — it is not a
viewport-specific rounding effect but the layout as written.
**DoD:** map and list end on the same line at every desktop width, the list
still scrolls rather than pushing the column open, the status line stays
readable, mobile untouched. — **done**:

- **One height for both columns:** `--column-height: max(70vh, 320px)` on
  `.content` in the `min-width: 900px` block, set as `height` on `.map-wrap`
  **and** `.list-wrap`. `#map` becomes `height: 100%` of it (its base
  `min-height: 320px` is switched off there, because the floor now lives on the
  column), and `.liste` takes what is left below the status line via
  `flex: 1 1 auto; min-height: 0; max-height: none` — the `min-height: 0` is
  what lets a flex item scroll instead of growing its column, the `max-height:
  none` drops the mobile 60vh cap that would otherwise still win.
- **`.list-status { flex: none }`**, which is the part that is easy to miss: the
  column is now shorter than its content, so flexbox distributes the shortfall
  over *every* item, and `.list-status` carries an explicit `min-height: 1.2em`
  that replaces the automatic content-based minimum. With `box-sizing:
  border-box` that let the line be squeezed to 19 px including its 2 × 8 px
  padding, clipping "177 Baustellen". Caught by measuring `scrollHeight -
  clientHeight` on the status element, not by looking at the screenshot.
- **Measured before → after** (Playwright, Chrome channel, OSM tiles
  intercepted): distance from the list's bottom edge to the map's bottom edge
  **39 → 0 px** at 1280 × 800, 1440 × 900 and 900 × 800, in light and dark.
  `#map` keeps its exact top and height (278–838 px at 1280 × 800), the document
  shrinks 1025 → 986 px, the list keeps a scroll range of ~20 400 px, and the
  status line's overflow is 0 px with its full text. **Mobile is untouched**:
  the 414 × 896 screenshots are byte-identical to a `git archive HEAD` checkout
  in both schemes.
- The map's top edge stays level with the *status line*, so the first card still
  begins 39 px lower — that offset is the list's own label and is deliberate;
  reserving the same 39 px above the map would just give back the space #23
  removed. `CACHE_SHELL` bumped to `v20` (`src/styles.css` is a shell file).
  (Label: `frontend`)

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

## Findings from the transparency-portal pre-review (2026-07-26)

Feedback from the open-data editorial team on the submission for the
transparency portal (the submission document has since been removed from
the repo — see git history). The
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

### ✅ #26 Screenshots for the portal entry
The portal entry needs a preview image ("without an image the entry looks
broken").
**DoD:** a screenshot exists and can be reproducibly generated. — **done:**
`scripts/screenshot.mjs` (manual, like `render-icons.mjs` deliberately
**not** in `npm test`/CI) generated a desktop (1440 × 900) and a mobile
(390 × 844) preview image, fixed to light mode.
The script **counted the loaded map tiles and aborted** instead of silently
writing a gray image — exactly the bug that would otherwise sneak into the
portal unnoticed in an environment without OSM egress. If the app's tile
host was blocked by egress policy but a subdomain mirror was reachable, it
fetched tiles from there and said so in the log; `src/app.js` stayed
untouched. Script and images were removed with the portal submission
(2026-08-07, see git history). (Label: `docs`, `frontend`)

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
