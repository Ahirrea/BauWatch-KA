# A-19 "Neu" entries open their site on the map

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident reading the "Neu" tab, I want to tap
a new or changed construction site and be taken to it on the map, so that I
can see where exactly it is instead of guessing from a street description.

**Refined on:** 2026-11-06 (from a phone screenshot of the "Neu" tab)
**Constrained by:** [A-6](./A-6-was-ist-neu-feed.md) (E5 deferred exactly
this click-through), [A-11](./A-11-auswahl-ohne-zoom.md) (selection never
moves the camera), [A-14](./A-14-vollbild-karte.md) (sheet/tabs),
[A-17](./A-17-stadtteile.md)/E10 (item shape `{ titel, district }`),
[A-18](./A-18-filter-zuruecksetzen.md) (`resetFilters()`), #28 (read-side
filter pattern). No ADR touched.
**Target branch:** `ccr-731d84e9-tpwxnp`

## Touchpoints in the code

- `src/ui/feed.js` renders the tab from `data/changelog.json`. Items are
  `{ titel, district }` (or plain title strings from before A-17). **There is
  no identifier in an item**, so today the tab cannot know which feature an
  entry means.
- `scripts/diff-data.mjs` → `changelogEntry()` builds the items from the
  diff, which already holds the whole feature (`properties.id` = the
  `vorgangsnummer`, the dedup key).
- `src/app.js` → `selectFeature(key)` marks the row, sets the area tier and
  opens the popup; keys are `id:<vorgangsnummer>` (`featureKey()` in
  `src/ui/geo.js`). `setViewInVisibleArea()` (`src/ui/map.js`) is the
  existing "centre in the uncovered map" move used by search and boot.
  `resetFilters()` (A-18) and `clearSearch()`/`clearSearchCircle()` exist.
- Reusable as is: selection, popup, sheet steps, camera helper, filter reset.
  Missing: the id in the changelog, a lookup id → feature, the click wiring.

**Why title matching is not enough (measured on today's data).** The
snapshot has 180 features and 7 titles that occur more than once (15 features
share them). The run of 2026-11-06 07:09 lists "Rheinstraße Gleisübergang
Nuitstraße · Mühlburg" both as *added* and *removed* — two different cases
with the same title and district. A title match would send the user to the
wrong site there, silently.

## Tension with non-goals — and resolution

- **A-6/E5 ("no interaction with map/list") —** deliberately deferred there
  as "a later, separate enhancement if there's demand". This is that demand.
  A-6 is done, so this gets its own number ([step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement));
  A-6/E5 is superseded for the "Neu" tab, nothing else in A-6 changes.
- **A-11 ("selection never moves the camera") —** holds for selection from
  the list and the map, where the site is by construction on or next to the
  screen. A "Neu" entry can be anywhere in Karlsruhe; without a camera move,
  "go there" is impossible. Resolved like the search result: this becomes the
  fifth deliberate camera move (initial view, search, search reset, district,
  now "Neu"), through `setViewInVisibleArea()`. List and marker selection keep
  A-11 unchanged.
- **Committed data file changes shape (#28 pattern).** The item gains a
  field, and the existing 30-day file is cleaned in the same commit (E1).
  Hand-touching `data/changelog.json` is the documented exception for this.
- **The A-11 autoPan trap.** A view change followed by opening the popup is
  the fit-then-open sequence `CLAUDE.md` warns about. Here the target is
  centred in the visible area at a fixed zoom, so autoPan only shifts as much
  as any popup near the centre would — that is acceptable, and is what the
  browser check must show (marker and popup both inside the uncovered map).

## Decisions (with rationale)

**E1 — Items carry the `vorgangsnummer`, and the existing entries are
backfilled.** (Chosen by the idea's originator, 2026-11-06.)
`changelogEntry()` writes `{ titel, district, id }` for added, removed and
changed items. The 62 entries already in `data/changelog.json` get their ids
once, by a script: each entry's `stand` matches exactly one snapshot commit
of `data/baustellen.geojson` (checked: 62 of 62), and `diffFeatures()` of
that snapshot against its predecessor yields the same added/removed/changed
sets with their ids. *Discarded:* ids only for new entries (the tab would
stay unclickable for up to 30 days); title matching (ambiguous, see above).

**E2 — A tap centres the site, opens its popup, and the "Neu" tab stays
open.** (Chosen by the idea's originator.) On a phone the sheet steps down to
half (from full) so the map shows; on desktop the panel stays as it is. The
user can tap the next entry right away. *Discarded:* switching to the "Liste"
tab — the user would have to come back to "Neu" for every next entry.

**E3 — A site hidden by the current filters or the radius search: reset
them, then show it.** (Chosen by the idea's originator.) Only in that case —
if the site is visible, nothing changes. "Reset" means A-18's
`resetFilters()` (all four groups including the district, whose outline
goes with it) plus clearing the radius search. *Discarded:* leaving the entry
unclickable with a "hidden by filter" note.

**E4 — Only entries whose site is in today's snapshot are links.** Removed
items (strike-through) and added/changed items whose case has since ended
stay plain text. A dead link would promise a site that isn't there. *(Follows
from E1, no fork.)*

**E5 — Zoom 16 for the jump.** Close enough to see the shape (A-7) and
which side of the junction it is on, the same order as a search result. If
the user is already zoomed in further, keep their zoom (never zoom *out* to
reach a site). *(Proposal, can be changed during implementation review.)*

## Scope / Non-scope

- **In:** clickable added/changed entries in the "Neu" tab; `id` in
  changelog items (build + backfill); camera move + popup; filter reset when
  needed; DE/EN chrome for any new label.
- **Out:** links in `feeds/alle.xml` (it would need deep links into the
  page, a separate idea); deep links/URL hash in general; showing a
  *removed* site's former position; changing list/marker selection (A-11
  stands).

## Specification

### UX flow & states
1. "Neu" tab open (any sheet height on a phone, any panel state on desktop).
2. Linked entries render the title as a link (same text, `--accent`,
   underlined); not-linked entries look as today.
3. Tap → if the feature is filtered out or outside the radius search: reset
   (E3), `render()`. Then on a phone: full → half (the tab is only readable
   at half or full, so the sheet always ends at half). Then `setViewInVisibleArea(point, max(zoom, 16))`, then `selectFeature(key)`
   (marks the row in the hidden list tab too, sets the area tier, opens the
   popup).
4. The "Neu" tab keeps its scroll position; the tapped entry stays focused.

### Interaction with existing features
- The selection is the normal A-9/A-11 selection: switching to "Liste"
  afterwards shows the row selected.
- The filter reset is visible: buttons and the reset button update through
  the normal `render()`.
- Language switch re-renders the tab; links stay links.
- Changelog is fetched on every tab opening (A-6), the snapshot once at boot:
  an entry newer than the loaded snapshot simply isn't linked (E4).

### Data model / persistence
- `changelog.json` items: `{ titel, district, id }`; `id` may be `null` if
  a feature had none. Readers accept the old shapes (string, item without
  `id`) and treat them as not linked.
- No new `localStorage`, no new external host → privacy notice unchanged.
- `feeds/alle.xml` must stay byte-identical (the feed ignores the field);
  `test-feed.mjs` proves it.
- `CHANGELOG.md` unchanged.

### Edge cases & error handling
- Same title twice in one run (the Rheinstraße case): each item links to its
  own id; the removed one isn't linked at all.
- Feature without `area`: popup and point only, as everywhere.
- Data not loaded yet / load failed: nothing linked.
- Snapshot from the service-worker cache (offline): works on what is cached;
  the map tiles may be missing, the marker and popup are not.
- Double tap / rapid taps: each one is a plain new selection.

### Accessibility
- A real, focusable control per linked title — keyboard reachable, Enter
  works, visible focus ring (#39's rules on clipping ancestors apply inside
  `#panel-body`).
- Accessible name = title + a visually-hidden hint "– auf der Karte zeigen"
  / "– show on map" (`whatsNewShowOnMap`, via `str()`); the district follows
  as text, as before.
- No animation at all (see the implementation notes), so nothing to reduce
  for `prefers-reduced-motion`.

### Test plan
- `test-diff.mjs` (or `test-changelog-feed.mjs`): `changelogEntry()` items
  carry `id` for all three kinds.
- A test that every item in the committed `data/changelog.json` has an `id`
  (guards the backfill and future drift).
- `test-feed.mjs` stays green unchanged (feed output byte-identical).
- `test-i18n.mjs` for the new keys.
- Browser check (Playwright, phone 414 px and desktop 1280 px): tap an added
  entry → map centre near the feature (via the `L.map` handle), zoom ≥ 16,
  popup open, list row selected, "Neu" tab still active; with a district
  filter set that excludes the feature → filters back to "Alle", feature
  shown; removed entry → no link; marker and popup inside the uncovered area.
  Screenshots light/dark, both widths.

### Docs/backlog impact
- `CLAUDE.md`: the camera-move list (fourth → fifth move), the changelog
  item shape, `CACHE_SHELL` version line.
- A-6: no edit needed (E5 already says "later enhancement"); this file is the
  reference.

## Definition of Done
- Added/changed entries whose site is in the snapshot are tappable and take
  the user there as in E2/E3/E5; removed and ended ones are not.
- `data/changelog.json` items all carry `id`; the build writes it.
- `feeds/alle.xml` unchanged; `npm test` green.
- Browser check passed on phone and desktop, screenshots sent.
- `CACHE_SHELL` bumped; `CLAUDE.md` updated; status `🏁` in the overview.

## Implementation notes (2026-11-06)

What the build-out added to the spec above — none of it changes a decision.

- **A link, not a `<button>`.** The first cut used a button styled as a
  link. Chromium lays a button out as an inline block even with
  `display: inline`, so every title too long for the rest of the line
  dropped below its ➕ instead of wrapping on from it (seen in the phone
  screenshot). It is now `<a href="#" data-site>` with the navigation
  prevented: it wraps like text, sits in the tab order, Enter activates it.
  Space does not, which is what a link does.
- **No camera animation.** The popup opens right after the view change, and
  its autoPan has to start from the final view; opening it mid-flight is the
  fit-then-open trap again. The jump is a cut, not a flight.
- **An animation already in flight is waited out.** Tapping an entry right
  after choosing a district (an animated fit) left the map at the district's
  zoom 14 with the site 800 px off screen: `setView()` stops a pan animation
  but not a zoom animation, which ends by moving to its own target after
  ours. The handler waits for `zoomend` while Leaflet's private
  `_animatingZoom` is set (the vendored copy is pinned). Caught by the
  browser check, invisible to `npm test`.
- **Backfill:** 62 of 62 entries matched a snapshot commit; the *oldest*
  commit carrying an entry's `stand` is the run that wrote it (later commits
  with the same `stand` are `annotate-districts.mjs` passes). 438 items got
  an id; nothing else in the file changed, except that 106 pre-A-17 plain
  title strings became `{ titel, district: null, id }` and pre-A-17 changed
  items gained `district: null`. `feeds/alle.xml` is byte-identical.
- **Not browser-tested:** the radius-search branch of E3 (Nominatim is not
  reachable from the test environment). It uses the same `clearSearch()` /
  `clearSearchCircle()` pair as the district filter does (A-17/E5).

## Implementation steps
1. `changelogEntry()`: add `id`; extend tests.
2. One-off backfill script (scratchpad, needs a full clone): for each entry,
   diff its snapshot against the previous one, attach ids; commit the
   cleaned `data/changelog.json`. Add the "every item has an id" test.
3. `src/ui/feed.js`: render linked titles, a callback `onShowSite(id)`.
4. `src/app.js`: handler — find feature, reset filters/search if hidden,
   sheet to half, `setViewInVisibleArea`, `selectFeature`.
5. i18n keys, styles in `src/shell.css`, `CACHE_SHELL` bump.
6. `npm test`, Playwright check, screenshots, docs.
