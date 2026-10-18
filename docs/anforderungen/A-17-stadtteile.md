# A-17 Construction sites per district

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want to see the construction sites
in my district (Stadtteil): as a number in the statistics, as a filter on the
list, and outlined on the map. That way I can check my own neighbourhood
without knowing its street names.

**Refined on:** 2026-10-18
**Constrained by:** [ADR-007](../adr/ADR-007-stadtteilgrenzen.md) (the
boundaries as a committed static input) ·
[ADR-001](../adr/ADR-001-statisches-hosting.md) ·
[A-7](./A-7-baustellenflaechen.md)/E1 (`geometry` stays the point) ·
[A-11](./A-11-auswahl-ohne-zoom.md) and
[A-14](./A-14-vollbild-karte.md)/E13 revised (which views may move the
camera) · [A-12](./A-12-filterzeile-restdauer-kennzahlen.md)/E3 (facet
counts) · [A-15](./A-15-statistik.md)/E2 (the reserved section slot)
**Target branch:** `ccr-0fb3ea8f-ywo45b`

## Touchpoints in the code

- **Build:** `buildFeature()` in `scripts/build-data.mjs` assembles the
  properties; `district` slots in next to `area`. `transformGeometry()` and
  `looksLikeUtm32()` already exist for the coordinate conversion.
- **Diff:** `signature()` in `scripts/diff-data.mjs` includes every property
  not prefixed with `_`, so `district` takes part in change detection (E9).
- **Filters:** `filteredBase()` (Restdauer, Verkehrsmittel, radius search)
  and `applyAmpel()` in `src/ui/filters.js`; `renderFilterCounts(base)`; the
  filter row's `.filter-group[data-filter]` markup with segment buttons.
- **Map:** the layer groups `areaLayer`, `markerLayer` and `searchLayer` in
  `src/ui/map.js`; `setViewInVisibleArea()`; the chrome insets from
  `setChromeInsets()`.
- **Statistics tab:** A-15/E2 reserves the slot after "Wer baut?".
- **Popup and list item:** `src/ui/feature-html.js`.
- **The "Neu" tab and `changelog.json`:** each item is a title string.
- **No district data exists anywhere today.** The WFS has no district field
  (A-2 survey, 2026-07-24).

## The dataset (survey, 2026-10-18)

- **"Stadtteile Stadt Karlsruhe"**, published by the City of Karlsruhe on
  transparenz.karlsruhe.de: polygons with Stadtteilnummer and
  Stadtteilbezeichnung, as GeoJSON (`stadtteile.json`, data dated
  2023-03-08) and Shapefile (dated 2025-04-14). Karlsruhe has 27 districts;
  the fetch confirms the count.
- **Licence:** the city's portal states CC0, GovData's listing CC BY 4.0
  (E7).
- **Unknown until fetched:** the coordinate system, the vertex count and the
  file size. The host is blocked from development sessions by egress
  policy, as the WFS is; GitHub's runners reach the city's servers (step 1).

## Tension with non-goals — and resolution

1. **ADR-001: one source per Action run.** ADR-007: the boundaries are
   fetched once and committed, so the Action stays single-source.
2. **A-2's decision of 2026-07-24 against a district-boundary asset.** It
   was about the feed, and about a second source in the build. ADR-007
   removes the second source; the feed stays global and only names the
   district per item (A-2 amendment, 2026-10-18).
3. **A-11, "selection never moves the camera" — against "the chosen
   district is shown on the map".** A district is a filter, not a selection.
   Like the radius search, it may move the camera, fitted into the uncovered
   map (E6). Selecting a site still moves nothing.
4. **A-12/E3, facet counts.** A fourth axis means each faceted control
   counts over the set without its own filter (E4).
5. **Privacy.** There is no new host in the browser: the boundaries are a
   same-origin file, and the city's server is contacted only by the Action.
   There is no storage and no geolocation; `datenschutz.html` is unchanged.
6. **`CLAUDE.md`: a new feature property is invisible until the next real
   data change.** E9: the committed snapshot is annotated in the same commit,
   and again right before landing.
7. **A-14/E5: one horizontally scrolling filter row of segment buttons on
   phones.** 28 options do not fit as segments; a `<select>` does (E4).
8. **The CC-BY attribution pitfall (`CLAUDE.md`).** The new credit is static
   HTML and guarded by a test (E7).

## Decisions (with rationale)

**E1 — Scope: statistics, filter and outline.** *Decided by the idea's
originator* on 2026-10-18, against "statistics only" and "statistics plus
filter".

**E2 — Assignment by the case's point, at build time.**
`properties.district` is the name of the district polygon that contains the
case's point.
- A site that straddles a boundary counts once, where its marker is
  (A-7/E1).
- A point in no polygon (a border road, rounding) gets the nearest district
  within 100 m, otherwise `null`, shown as "ohne Stadtteil". Step 1 measures
  how many points this concerns.
- Polygons with holes and multipolygons are handled; the test fixtures
  contain both.

**E3 — One committed boundaries file for build and browser** (ADR-007).
- `data/districts.geojson`, in WGS84, with properties `{ nr, name }`.
- It is simplified only as far as no current site changes its district, and
  until it is at most about 150 KB. Both are checked when it is created.
- The browser precaches it (`SHELL`), because it changes only together with
  a commit that bumps `CACHE_SHELL`.

**E3 revised (2026-10-18).** The finest tolerance of at least 1 m that
changes no current assignment and stays under 150 KB — not the coarsest one.
- **Evidence:** E3's wording allowed either reading. The first fetch took the
  coarsest tolerance that changed no assignment: 10 m, 36.7 KB.
- **Why that is too coarse:** district boundaries often run along streets,
  which is exactly where sites are. At 10 m a future site near such a
  boundary could land in the wrong district, and the outline drifts visibly
  at high zoom (at zoom 17 one pixel is about 0.8 m).
- **Result:** the refetch chose 1 m: 4,122 of 19,548 vertices, 87 KB, no
  assignment changed. The file records the tolerance it was simplified with
  (`simplifiedM`).

**E4 — The filter is a `<select>` labelled "Stadtteil".**
- **Place:** on a phone it sits in the scrolling filter row after
  "Verkehrsmittel"; on desktop it gets its own row.
- **Options:** "Alle Stadtteile", then the 27 names in alphabetical order,
  each with its count, e.g. "Durlach (12)".
- **Counts** come from the set without the district filter: Restdauer,
  Verkehrsmittel and Sperrgrad apply. A-12/E3's rule extends: each facet
  counts without its own filter. The Sperrgrad numbers now include the
  district filter.
- **An option with 0** stays selectable. A control does not vanish at 0
  (A-12, superseding A-10/E6).
- **Cases without a district** are left out of every district's count, and
  "Alle Stadtteile" includes them.

**E5 — The district filter and the radius search replace each other.** Both
answer "where", and combined they mostly produce empty sets ("1.5 km around
an address in Durlach, within Mühlburg").
- Choosing a district clears the radius search.
- A new search resets the district to "Alle Stadtteile".
- The list status names the active district, as it names a searched place.

**E6 — The outline and the camera.**
- **Outline:** choosing a district draws its boundary as an outline in a new
  token `--map-district`, defined in all three palette blocks. It has no fill
  or a faint wash of at most 10 %, is non-interactive, and sits beneath
  areas and markers. Its contrast against the tiles is computed in both
  schemes (≥ 3:1).
- **Camera:** it fits the district's bounds into the uncovered map, with the
  chrome insets as padding (A-14/E9), at zoom 15 at most. This is the
  fourth view that moves the camera, after the initial view, a search
  result and the search reset (`CLAUDE.md`).
- **Reset:** "Alle Stadtteile" removes the outline and returns to the
  initial view, centred as the search reset is.
- **Selecting a site** keeps A-11: no camera move.

**E7 — The credit is a static line on the map.** "Stadtteilgrenzen: Stadt
Karlsruhe", with the licence step 1 confirms, goes into the credits footer.
- It is static HTML, untouched by JavaScript, and word-identical to a
  build-side constant. `test-attribution.mjs` guards it like the first
  credit.
- Under CC0 it is a courtesy, under CC BY 4.0 the condition; it satisfies
  both.
- It goes where it costs the least height. Joining the OSM line is the first
  candidate. The collapsed sheet and the uncovered map share are measured
  before and after, against A-14's recorded values.

**E7 revised (2026-10-18).** The credit reads "Stadtteile: Stadt Karlsruhe"
and names no licence. "Stadt Karlsruhe" links the dataset page, which states
the licence.
- **The licence:** step 1 read CC0 from the portal's metadata, the primary
  source, while GovData's listing still says CC BY 4.0. Naming either could be
  wrong.
- **Why this covers both:** under CC0 the credit is a courtesy. Under CC BY,
  naming the creator and linking a page that carries the licence is the
  "reasonable manner" section 3(a)(2) allows.
- **The wording:** "Stadtteilgrenzen" cost the credits strip a fourth line at
  320 px (65 px instead of 50). "Stadtteile" does not.
- **Measured cost:** 320–375 px unchanged (50 px), 390–414 px from 35 to
  50 px, desktop unchanged (35 px). The uncovered map share as A-14 measures
  it, from the search bar to the sheet, is unchanged, because the strip lies
  on the map.

**E8 — Statistics: a section "Nach Stadtteil"** in A-15/E2's slot, after
"Wer baut?".
- Every district with at least one site is a bar in `--bar`, sorted by
  count. Every value is printed (A-15/E3, E4).
- One note line names the districts without a site.
- "ohne Stadtteil" is a bar only when it is above 0.
- The section is citywide and ignores the filters (A-15/E1).

**E9 — The new property and the change history.**
- `district` takes part in the diff signature. A site that a boundary
  refresh moves into another district changes what the app shows, and that
  is a real change.
- Otherwise the first Action run after the release would log every case as
  changed. To prevent that, the committed snapshot is annotated in the same
  commit, by the build's own pure function (#28's pattern).
- The annotation runs again right before landing, because the data Action
  keeps committing to `main` in the meantime.
- The browser treats a feature without `district` (an older snapshot from a
  cache) as "ohne Stadtteil".

**E10 — The district appears in the popup, the list, the "Neu" tab and the
feed.**
- **Popup and list item:** the district is shown in the meta line.
- **`changelog.json`:** each item gains its district. Added and changed
  items take it from the new snapshot, removed items from the previous one.
  The item shape changes from a title string to `{ titel, district }`.
- **Transition:** the "Neu" tab, the read-side filter (#28) and the feed
  generator read both shapes during the 30-day window (read-side tolerance,
  `CLAUDE.md`).
- **Atom feed (A-2):** it names the district after each title.
- **Out:** feeds per district (A-2 amendment, *decided by the idea's
  originator*).

**E11 — Nothing else.** ADR-007 is the only new ADR. There is no browser
storage and no new browser host, and `datenschutz.html` stays as it is.

## Superseded decisions

| Decision | Was | Now | Why |
|---|---|---|---|
| A-2, decision of 2026-07-24 (in part) | no district-boundary asset, no point-in-polygon | a committed boundaries file; the feed names districts and stays global | ADR-007; A-2 amendment, decision 10 |
| A-12/E3 (extended) | one faceted control, counted over the set without its own filter | two faceted controls (Sperrgrad, Stadtteil), each counted over the set without its own filter | E4 |
| A-14/E5 (extended) | three filter groups as segment buttons | a fourth control, a `<select>` | 28 options (E4) |
| A-14/E13 revised (extended) | three views move the camera: initial, search result, search reset | a fourth: the fit to a chosen district | E6 |
| A-6, item shape in `changelog.json` | title strings | `{ titel, district }`; both shapes are read during the 30-day window | E10 |

A-6, A-12 and A-14 are 🏁 done and are not rewritten
([process step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)).
This table is the cross-reference.

## Scope / Non-scope

- **In:**
  - the fetch step and the committed boundaries;
  - the assignment in the build, with tests, and the annotated snapshot;
  - the filter with counts, and its exclusion with the radius search;
  - the outline and the camera;
  - the statistics section;
  - the district in the popup, the list, the "Neu" tab and the feed;
  - the credit and its guard;
  - DE/EN strings, tokens, `SHELL` and `CACHE_SHELL`, tests and docs.
- **Out:**
  - feeds per district;
  - a history per district (A-16 is citywide);
  - rates per inhabitant (they would need the "Stadtteilprofile" dataset);
  - Stadtviertel (finer units);
  - a choropleth map;
  - boundaries shown permanently;
  - remembering the chosen district (no storage, as A-14/E10).

## Specification

### UX flow & states

| State | Behaviour |
|---|---|
| Before the data has loaded | The select shows "Alle Stadtteile" without counts (A-12: no number before `state.geladen`) |
| Loaded | Options carry counts; the popup and the list show the district |
| District chosen | List, markers, areas and Sperrgrad counts narrow to the district; the outline appears; the camera fits the district; the list status reads e.g. "12 Baustellen in Durlach" |
| District chosen, then a search | The district resets to "Alle Stadtteile", the outline disappears, and the search behaves as today |
| Search active, then a district | The search clears (circle, reset button and status), then as "District chosen" |
| "Alle Stadtteile" | The outline disappears and the view returns to the initial view |
| Statistics tab | The "Nach Stadtteil" section, citywide |
| Offline | Works: the district is part of the cached snapshot, and the boundaries are precached |
| Language switch | Chrome strings switch; district names stay German (dataset text, A-5/E3) |

### Interaction with existing features

- **A-12:** the facet rule extends to two faceted controls. The pitfall in
  `CLAUDE.md` ("pass `base`, never `list`") holds per facet; the browser check
  verifies it.
- **A-9:** the outline is not part of the area tiers, and `render()`'s
  teardown covers it.
- **A-11 / A-14/E9 / E13 revised:** selection unchanged. The district's fit
  uses the chrome insets.
- **A-6 / #28 / A-2:** the item shape changes (E10). The parity
  "feed ⊆ `CHANGELOG.md`" compares titles in both shapes.
- **A-16:** none; the history stays citywide.
- **A-3:** the boundaries are in `SHELL`, and `CACHE_SHELL` is bumped.

### Data model / persistence

- **`properties.district`:** `string | null`, the district name as the
  dataset spells it.
- **`data/districts.geojson`:** a FeatureCollection of 27 features, in WGS84,
  with properties `{ "nr": "01", "name": "Innenstadt-Ost" }`. The values are
  illustrative; step 1 records the real field names and values.
- **`changelog.json` items:** `{ "titel": "…", "district": "…" }`. Older
  entries keep their strings until they leave the 30-day window.
- **No browser storage.**

### External dependencies & fallback

- **The city's portal**, contacted only by the fetch step (an Action run),
  never by the browser or by the regular data run.
- **If the portal is down during a refresh,** the committed file stays as it
  is.

### Edge cases & error handling

- **A point outside every polygon:** see E2. The share is measured in step 1
  and recorded.
- **A district with no site:** its option shows "(0)" and stays selectable,
  and the statistics name it in the note line.
- **A boundary refresh that changes assignments:** recorded as a regular
  data change by the next Action run (ADR-007).
- **A cached snapshot without `district`:** "ohne Stadtteil", and no error.
- **Name spelling:** the dataset's spelling, sorted for German
  (`localeCompare('de')`).
- **The camera at small widths:** the fit includes the chrome insets. If the
  district does not fit at a readable zoom on a 320 px phone, the fit still
  wins; zoom 15 is only an upper cap.

### Accessibility

- The `<select>` has a visible label and a translated `aria-label`. Each
  option's text carries its count, so no number is colour or position only.
- The list status names the district. The outline is never the only sign
  that the filter is active.
- The outline is drawn in a token whose contrast against the tiles is
  computed in both schemes (≥ 3:1), as in A-14.
- Focus stays on the select after a choice, even though the camera moves.

### Test plan

- **`npm test`:**
  - Point-in-polygon with holes and multipolygons, a point on an edge, and
    the nearest fallback within 100 m.
  - The committed snapshot is fully annotated; the number of `null`
    districts equals the number recorded in step 1.
  - `data/districts.geojson` is well-formed: 27 features, unique names,
    coordinates in WGS84 range.
  - The credit guard for the second credit.
  - A pure facet-count helper for districts.
  - `changelog.json` items in both shapes, through the read-side filter and
    the parity check.
- **Browser:**
  - Choosing a district narrows list and map. Its counts and the Sperrgrad
    counts stand still while their own control is toggled (A-12/E3, per
    facet).
  - The outline appears and is removed.
  - The camera fits the district into the uncovered area and returns on
    reset.
  - Search and district clear each other.
  - Selection still leaves `getZoom()` unchanged (A-11).
  - The statistics bars equal a recomputation.
  - The outline's contrast is computed in both schemes.
  - 320, 414 and 1280 px, both schemes.
- **Screenshots:** a district chosen on phone and desktop, light and dark,
  plus close-ups of the select and the statistics section.

### Docs/backlog impact

- **`CLAUDE.md`:**
  - the `district` property and its derivation from the point;
  - the fourth camera view;
  - the refresh procedure for the boundaries;
  - the two-facet count rule;
  - the dual item shape in `changelog.json`.
- **`README.md`:** the feature list and the second data source in the
  licence section.
- **The overview status.**

## Definition of Done

- `data/districts.geojson` is committed and simplified per E3. Its licence
  and field names are recorded here.
- Every site in the committed snapshot carries `district` or `null`, and the
  `null` count is recorded.
- The filter, counts, outline, camera, mutual exclusion with the search,
  statistics section, popup and list, "Neu" tab and feed work as specified,
  verified in the browser.
- The credit is static and guarded. `npm test` is green, and there is no new
  browser host and no storage.
- Contrast is computed and recorded, screenshots are sent, the docs are
  updated, and the overview shows 🏁.

## Implementation steps

1. **Fetch step.** A script `scripts/fetch-districts.mjs`, run only from a
   dispatched Action run, never on a schedule:
   - it fetches the dataset and its portal metadata (licence id);
   - it converts the coordinates to WGS84 if needed;
   - it simplifies per E3 and writes `data/districts.geojson`;
   - it reports the feature count, vertex count, file size and the number of
     points outside every polygon.

   To run it, the workflow file on the branch temporarily gets the step
   (`CLAUDE.md`'s dispatch pattern, `ref=<branch>`), its commit step pushes
   the file to the branch, and the workflow file is then reset to `main`'s
   version. Record the findings here.
2. The pure assignment, with tests; annotate the committed snapshot.
3. The build: `district` in `buildFeature()`; `changelog.json` items with
   the district; every reader tolerates both shapes.
4. The browser: the filter and counts, mutual exclusion, the outline and
   camera, popup and list, the statistics section, the "Neu" tab, strings,
   tokens, styles, the credit, `SHELL` and `CACHE_SHELL`.
5. The feed (A-2): the district after each title.
6. Browser checks, contrast, screenshots, docs and status.
7. Right before landing: annotate the latest snapshot again (E9).

## Implementation record (2026-10-18)

Built on `ccr-0fb3ea8f-ywo45b`, after [A-16](./A-16-verlauf.md) and
[A-2](./A-2-baustellen-abo-feed.md).

**Step 1, the fetch:** two dispatched runs of the temporary workflow step,
then the workflow file was reset to `main`'s version.
- **Licence:** `http://dcat-ap.de/def/licenses/cc-zero` per the portal's
  metadata (modified 2025-06-02). The GeoJSON resource is dated 2023-03-08,
  the Shapefile is hosted on kacloud.karlsruhe.de.
- **Fields:** `NUMMER` and `NAME`.
- **The data:** 27 polygons, already in WGS84, 19,548 vertices. Simplified
  at 1 m (*E3 revised*) to 4,122 vertices and 87 KB.
- **Assignment:** all 166 sites assigned, 0 `null`. One point lay outside
  every polygon, 15.7 m from Waldstadt's boundary, and the 100 m fallback
  assigned it there.
- **Sites per district:** Innenstadt-West 26, Durlach 24, Waldstadt 13,
  Südweststadt 12, Innenstadt-Ost 11, Weststadt 10, …, down to 1 each in
  Grünwinkel, Nordstadt and Stupferich. Every district has at least one site
  today.

**Verified:**
- **`npm test`:** `scripts/test-districts.mjs` is part of the suite. It
  covers holes, multipolygons, a shared edge, the fallback in metres, the
  committed file, a snapshot annotated exactly as the build would compute it,
  the build's wiring and the new item shape. The "no `null`" figure is
  printed, not asserted, because E2 allows `null`.
  - `test-changelog-feed.mjs` reads both item shapes.
  - `test-attribution.mjs` guards the second credit: static, in the first
    `<footer>`, word for word `DISTRICTS_ATTRIBUTION`, untouched by any
    client module, no `data-i18n`.
- **The build, simulated** against a mocked WFS:
  - added and changed items carry their district, removed ones the district
    from the previous snapshot;
  - the feed names it after each title;
  - the drift check holds.
- **Browser, 35 of 35 checks:**
  - the select lists "Alle Stadtteile" plus 27 districts in German order,
    with counts equal to the snapshot;
  - choosing Durlach narrows list and markers to 24, every row names
    Durlach, and the status reads "24 Baustellen in Durlach";
  - the outline is drawn and fitted into the uncovered map (zoom 13 → 12);
  - the Sperrgrad numbers count within the district (9/14/1) and stand
    still while toggling Sperrgrad, while the district numbers follow
    Sperrgrad (Durlach 9 with "Voll");
  - selecting a site leaves the zoom unchanged (A-11), and its popup names
    the district;
  - a live search resets the district, and a district clears the search
    (field, reset button, circle);
  - "Alle Stadtteile" returns to zoom 13 with all 166 sites;
  - the statistics section follows "Wer baut?" and its 27 bars equal a
    recomputation;
  - the "Neu" tab shows "· Durlach" for new items and still renders older
    string items;
  - English at 320 px works, without overflow.
- **Offline (service worker):** shell cache `v27` with 41 entries, the
  boundaries included. With same-origin requests aborted, choosing Durlach
  still narrows the list to 24 and draws the outline, and the offline marker
  shows.
- **Contrast of `--map-district`** against A-14's measured tile luminance:
  `#6b2fa0` reaches 5.91:1 on the light tiles, `#b48ee8` 5.11:1 on the
  darkened ones.

**As built, beyond the decisions:**
- **The district counts leave out the radius search.** A district choice
  clears the search (E5), so a count inside the search radius would promise
  a number the click does not deliver. E4's list (Restdauer, Verkehrsmittel,
  Sperrgrad) already said so; this states it.
- **`scripts/annotate-districts.mjs`** writes `district` into the committed
  snapshot right after `area`, the key order `buildFeature()` uses, and
  leaves `stand` alone. It runs again right before landing;
  `test-districts.mjs` fails until it has.
- **The search module exports `clearSearch()`**, which clears the search
  without moving the map. The reset button adds the camera move on top.
- **The outline has its own Leaflet pane** (z-index 390), so areas and markers
  always lie on top of it.

**Definition of Done: met.** The boundaries' licence and field names are
recorded above.

