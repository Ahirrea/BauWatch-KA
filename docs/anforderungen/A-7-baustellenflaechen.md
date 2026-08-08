# A-7 Construction-site areas on the map

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident checking whether a specific street or
area is affected, I want to see a construction site's actual spatial extent
on the map — not just a point — so that I can tell at a glance how far a
closure reaches and whether it touches my route.

**Refined on:** 2026-07-28
**Addresses PRD:** "Feature scope (v1)" — extends the existing bullet "Map
(Leaflet + OpenStreetMap) with construction sites as color-coded markers"
with the spatial extent the source data already carries; still inside the
core loop's step 1 ("sees all construction sites currently active … on the
map").
**Constrained by:** — (no ADR needed — this enriches the existing committed
`data/baustellen.geojson` and adds a passive rendering layer, the same class
of change as `data/changelog.json` in [A-6](./A-6-was-ist-neu-feed.md), which
also didn't need one; no new subsystem, hosting model, or persistence
boundary.)
**Target branch:** —

## Touchpoints in the code

**Checked, not guessed.**

| What | Where | Meaning for this requirement |
|---|---|---|
| Point + polygon pair per case | `FIELDS.vorgang` / `dedupKey()` in `scripts/build-data.mjs` (~L91–104, L196–205) | Confirms every case's identity key (`vorgangsnummer`). Today's dedup loop (~L321–334) keeps only **one** of the pair — preferring the Point — and discards the other's geometry entirely. That's exactly what this requirement changes. |
| Geometry collapse to a single Point | `buildFeature()` / `representativePoint()` in `scripts/build-data.mjs` (~L118–137, L207–245) | `representativePoint()` already averages a polygon's vertices to derive the *marker* point when no separate Point geometry exists — untouched by this requirement, only the discarded sibling geometry is now also kept. |
| Generic geometry transform, already written, unused | `transformGeometry()` in `src/lib/transform.js` (L92–102) | Recursively handles Polygon/MultiPolygon/LineString, EPSG:25832→WGS84 — exactly what's needed to convert the retained shape. Currently dead code with zero test coverage. |
| Marker rendering, selection | `renderMarkers()`, `latLngOf()`, `selectFeature()`, `AMPEL_COLOR` in `src/app.js` | Stays the single interactive/selectable object (Decision E2); `selectFeature()` gets one addition (Decision E5). |
| Existing "extra overlay layer" pattern | `searchLayer` / `drawSearchCircle()` in `src/app.js` | Direct precedent: a second, independent `L.layerGroup` drawing a non-interactive shape with stroke + low-opacity fill. This requirement's new area layer follows the same shape. |
| Shell precache/version | `sw.js`, `SHELL`, `CACHE_SHELL` (currently `v6`, bumped for A-6) | `src/app.js` changes again → version bump to `v7` required, same trap as every prior feature (`CLAUDE.md` pitfall). |
| Data-quality signal pattern | `analyzeQuality()` / `qualityRecords` in `scripts/quality-report.mjs`, e.g. the existing `hasVorgangsnummer` boolean | Direct precedent for a new `hasArea` signal (Decision E9). |

**Missing (net-new):** the `properties.area` field itself; a new
non-interactive rendering layer in `src/app.js`; the `fitBounds` selection
path; test coverage for `transformGeometry()` (written, never tested); the
`hasArea` quality signal; the `CACHE_SHELL` bump.

## Tension with non-goals — and resolution

Checked against every non-goal in `PRD.md` §4:

1. **"No routing / no navigation."** Untouched — this is a passive visual
   addition, no route computation.
2. **"No other municipalities."** Untouched — the existing `gemeinde`
   filter runs before geometry handling.
3. **"No user account, no login."** Untouched.
4. **"No real push."** Untouched.
5. **"No reporting channel back to the city."** Untouched.
6. **"No data storage of our own beyond the committed GeoJSON."** →
   **Resolved trivially:** `properties.area` lives inside the same,
   already-committed `data/baustellen.geojson`; no new file, no client
   storage.
7. **No backend, no frontend build step ([ADR-001](../adr/ADR-001-statisches-hosting.md)).** →
   Untouched — still a build-time-only enrichment inside the existing
   Action, static hosting model unchanged.
8. **`CLAUDE.md` pitfall: `src/lib/` must stay DOM-/network-/dependency-free.** →
   No new risk — `transformGeometry()` already lives there, already pure,
   reused as-is.
9. **`CLAUDE.md` pitfall: GeoJSON `[lon,lat]` vs. Leaflet `[lat,lng]`.** →
   Not a conflict, an implementation reminder: the new rendering code must
   convert the same way `latLngOf()` already does.

No non-goal blocks this feature; the closest brush ("no data storage of our
own") resolves the same way A-2's/A-6's committed-artifact reasoning already
does.

## Decisions (with rationale)

Made together with the idea's originator in a `/grilling` session
(2026-07-28) preceding this document; recorded here per the process.

**E1 — Additive data model.** `geometry` stays exactly today's `Point`
(marker position, unchanged `representativePoint()` logic); a new property
`properties.area` carries the polygon when the WFS delivers a second
geometry for the same `vorgangsnummer`. *Discarded:* replacing `geometry`
with the real shape and reworking `latLngOf()` / `haversineKm()` / the list
render / existing tests to derive a point from an arbitrary geometry type —
much bigger blast radius for no added value, since nothing about search,
filtering, or the list needs anything but a point.

**E2 — Marker and area coexist.** The marker (`circleMarker`) stays the
single interactive/selectable object, unchanged. The area is a purely
additional, passive overlay underneath. *Discarded:* the area replacing the
marker where present — ambiguous popup anchor on an elongated shape, would
need new hit-target logic for no clear benefit yet.

**E3 — Area layer is non-interactive** (`interactive:false`); clicks pass
through to the map/tiles. *Discarded:* a clickable area calling
`selectFeature()` on click — a more forgiving click target, but a second
interaction path to maintain, and the popup would still need to anchor at
the marker point rather than the click point, blunting the benefit. Revisit
later if the marker's small click target proves to matter in practice.

**E4 — Styling reuses `AMPEL_COLOR`.** Stroke = ampel color, fill = same
color at low opacity (~0.15–0.2), the same pattern `drawSearchCircle()`
already uses for its own circle. *Discarded:* a separate, screenshot-literal
red/pink palette independent of ampel level — would introduce a second color
meaning on the same map with no accompanying legend.

**E5 — Selection fits the area's bounds.** Selecting a feature (list click
or marker click) that has an `area` calls `fitBounds()` on it (padded,
`maxZoom:17` cap) instead of today's fixed `setView(point, zoom 15)`;
point-only features keep today's exact behavior. Chosen by the idea's
originator over leaving selection untouched — a fixed point/zoom loses
exactly the spatial context this requirement adds for a long street-closure
shape. The `maxZoom` cap stops a small shape (e.g. one crossing) from
snapping to an unexpectedly tight zoom compared to a plain marker.

**E5 revised (2026-08-08).** Reversed by the idea's originator after living
with it: the automatic camera move costs the map overview on *every* click,
while the spatial context it buys matters only for the minority of cases with a
long shape — "es stört mittlerweile mehr, als es Nutzen bringt". Selection
therefore **never changes the zoom and never travels**: `fitBounds()` is gone,
and so is the pre-A-7 `setView(point, Math.max(zoom, 15))` on the point-only
path (which E5 had deliberately left alone — dropped for consistency, so that
no click zooms). The popup's readability, which E5 secured with
`{ autoPan: false }` plus a measured reserved strip (Backlog #29), is now
carried by Leaflet's own `autoPan` again: it shifts the map by at most a
popup's height and never touches the zoom. What survives untouched: the area
layer and its styling (E3, E4, E6), the additive data model (E1), the marker as
the sole interactive object (E2), and A-9's emphasis tiers — which is what still
answers "which one did I just click" now that the camera no longer does. See
[A-11](./A-11-auswahl-ohne-zoom.md) for the full refinement, including why a
"zoom out only" middle ground and a stored preference were both discarded.
Backlog #30 (long corridors fitting to a hairline zoom) becomes moot with this.

**E6 — No zoom-gating.** Areas render at every zoom level, same as markers,
no minimum-zoom threshold. *Discarded:* hiding areas below a chosen zoom to
reduce visual noise city-wide — premature at ~180 features; revisit only if
it proves noisy in practice.

**E7 — Property name `properties.area`, in English** — a deliberate
exception to the otherwise-German property names on the same feature
(`titel`, `verursacher`, `ampel`). Chosen by the idea's originator; the
argument for consistency with the existing, pre-2026-07-27 German
field-naming convention was outweighed by the 2026-07-27 policy that new
identifiers are named in English going forward.

**E8 — More than one non-Point geometry per `vorgangsnummer`** (unconfirmed
whether this occurs — see Edge cases): the first one encountered in WFS
feature order wins, no error. Simple, deterministic default; revisit only if
the new quality signal (E9) shows it's a real, recurring case.

**E8 revised (2026-07-28, after implementation step 10).** The one-off WFS
inspection ran and answered the open question, so first-wins is replaced by
**combining all of a case's non-Point geometries** into one geometry
(`MultiPolygon` when they're all polygonal, `MultiLineString` when all linear,
`GeometryCollection` when mixed; a lone shape stays untouched). Measured on
444 Karlsruhe features / 183 cases:

| Observation | Figure |
|---|---|
| Points vs. non-Point geometries | 222 / 222 — exactly paired |
| Cases with exactly one shape | 159 (87 %) |
| Cases with 2–6 shapes | **24 (13 %)** |
| Geometry types | Polygon 156 · MultiLineString 36 · MultiPolygon 22 · **LineString 8** |

Two things followed. First, 13 % is too many to discard: those cases are one
closure split across several street segments or building entrances, and
drawing one segment of it would be *worse* than drawing nothing, because a
partial shape still looks authoritative. Second, **`LineString`/
`MultiLineString` is confirmed and is ~20 % of all shapes** — no longer the
hypothetical edge case the "Out of scope" list below assumed. Leaflet draws
those as polylines and ignores any fill, so they'd have rendered as
hairlines; they now get a heavier, semi-transparent stroke instead of the
fill a polygon gets (same colour, same meaning — E4 is untouched).

The originally-stated argument for first-wins ("simple, deterministic
default") survives only its determinism: combining is equally deterministic
and loses nothing. Retained from E8: no error, no warning — a multi-part case
is normal data, not a defect.

**E9 — Extend the quality report with a `hasArea` signal**, same pattern as
the existing `hasVorgangsnummer`/`artKnown` per-case booleans in
`scripts/quality-report.mjs`, surfaced in `data/QUALITY.md`. Gives ongoing
visibility into how often a case actually carries a paired polygon —
resolves the "can't verify without an Action run" gap noted during grilling
with real data over time, instead of a one-off manual inspection.

## Scope / Non-scope

- **In:**
  - `properties.area` added to `data/baustellen.geojson` features when the
    WFS delivers a non-Point geometry for that `vorgangsnummer`, via
    `transformGeometry()`.
  - New non-interactive Leaflet overlay layer in `src/app.js` drawing `area`
    shapes, styled via `AMPEL_COLOR`, synced to the current filtered list.
  - `fitBounds`-based selection when an `area` exists (E5), including the
    `maxZoom` cap.
  - `hasArea` signal in the data-quality report (E9).
  - New test coverage for `transformGeometry()` (currently untested) plus a
    build-data test asserting `area` is populated/omitted correctly.
  - `CACHE_SHELL` bump in `sw.js`.
- **Out, with rationale:**
  - Area-layer interactivity/click-to-select (E3) — later enhancement if the
    marker's small click target proves to matter.
  - Zoom-gated rendering (E6) — revisit only if visual noise becomes a real
    problem at this dataset size.
  - A legend explaining the shaded area — same precedent as the existing,
    undocumented search-radius circle; the marker's popup already carries
    the authoritative plain-text explanation.
  - Any change to `art`/`ampel`/`verkehrsmittel` classification — untouched,
    reused as-is.
  - ~~A dedicated `LineString`-specific styling path~~ → **pulled in scope**
    (E8 revised): the inspection confirmed line geometries are ~20 % of all
    shapes, which was the stated condition for adding one. It stayed minimal —
    a heavier, semi-transparent stroke where a polygon gets a fill, nothing
    else.

## Specification

### UX flow & states

The page loads exactly as today. Once `data/baustellen.geojson` is fetched,
a new area-rendering step runs alongside `renderMarkers()`, drawing every
currently-visible feature's `area` (when present) in a layer beneath the
marker layer. Filtering and radius search update both layers together
through the same `render()` call — no new UI controls, no new loading/empty/
error states beyond what markers already have.

### Interaction with existing features

Filters, radius search, and list-sync keep operating purely on
`properties`/point coordinates as today (E1) — the area layer is a passive
visual consequence of the same filtered list, not new independent state.
Selecting a feature additionally fits the map to the area's bounds when one
exists (E5).

### Data model / persistence

`data/baustellen.geojson` feature schema gains one new, optional property:

```json
"area": { "type": "Polygon", "coordinates": [[[8.403, 49.011], ...]] }
```

Omitted/`null` when the WFS didn't deliver a second geometry for that
`vorgangsnummer`. No new file, no new `localStorage`, no ADR (E1,
"Constrained by" above). `scripts/build-data.mjs`'s dedup step changes from
"keep the one winning feature" to "keep the Point feature's properties
**and** retain the sibling non-Point geometry, if any, transformed via
`transformGeometry()` and rounded the same way `round()` already rounds
Point coordinates.

### External dependencies & fallback

None new — same WFS source, same fetch, same failure handling (the build
aborts without overwriting the existing file on fetch/parse failure,
unchanged).

### Edge cases & error handling

| Case | Behavior |
|---|---|
| No second geometry for a `vorgangsnummer` (point-only) | `area` omitted/`null`; marker-only rendering, exactly today's behavior. |
| Point missing, only a polygon delivered | Unchanged existing fallback: `representativePoint()` already derives a centroid from the polygon for the marker; the polygon itself now also becomes `area`. |
| More than one non-Point geometry for the same `vorgangsnummer` | ~~First one encountered (WFS feature order) wins, no error (E8)~~ → **all shapes are combined into one geometry** (E8 revised); no error either way. Occurs for 24 of 183 cases. |
| Malformed/empty polygon coordinates | Guarded the same way `representativePoint()` already guards against `null`/empty — a malformed shape is dropped (no `area`), never crashes the build. |
| WFS delivers a `LineString` instead of a thin polygon (unconfirmed — see risk note below) | `transformGeometry()` already handles `LineString` generically and would still populate `area`; it would render as a thin path via Leaflet's GeoJSON layer with no dedicated styling (Out of scope) until confirmed common enough to warrant one. |
| Selecting a feature with a very large area (e.g. a full building footprint) | `fitBounds()` naturally zooms out to fit; the `maxZoom:17` cap (E5) only bounds the *tight* end, for small shapes. |

**Known open risk, not resolvable without a live WFS fetch** (egress-blocked
outside the Action, per `CLAUDE.md`): whether every case really pairs
exactly one point with exactly one polygon, or whether some deliver more
geometries or a `LineString`. Implementation step 10 below runs a one-off
inspection to check before the dedup change ships; `hasArea`/E8's fallback
give ongoing visibility afterward either way.

### Accessibility

The area layer is purely decorative (E3): `interactive:false`, not part of
the tab order, nothing for a screen reader to announce — the marker's
existing popup remains the sole source of the plain-text explanation
(title, ampel, remaining duration, etc.), unchanged. `fitBounds()`'s pan/zoom
respects `prefersReducedMotion()` exactly as `setView()` already does today
(same `animate` flag threaded through).

### Test plan

- **`scripts/test-transform.mjs`**: add `transformGeometry()` ground-truth
  coverage for Polygon/MultiPolygon (same `proj4`-reference-value pattern
  the existing `utm32ToWgs84` test already uses) — currently zero coverage
  for this already-written function.
- **Build-data test** (extend an existing file or add one): dedup retains
  the sibling geometry; `area` populated when a second geometry exists,
  omitted when it doesn't; first-wins behavior on more than two geometries
  per `vorgangsnummer` (E8).
- **`scripts/test-quality.mjs`**: the new `hasArea` signal is counted and
  reported correctly (E9).
- **`scripts/test-pwa.mjs`**: confirms the `CACHE_SHELL` bump (existing
  generic check, no new logic needed).
- **Browser (Playwright), per the "Web/mobile workflow" convention**: area
  shapes render for features that have one, styled per ampel color;
  selecting a feature with an area pans/zooms to its bounds (capped);
  filtering hides/shows areas in sync with markers; screenshots
  mobile+desktop, light+dark (tiles intercepted, per convention).
- **One-off, not part of `npm test`**: a temporary `workflow_dispatch`
  inspection run (per `CLAUDE.md`'s existing pattern) to confirm the
  real-world geometry mix before finalizing the dedup change, removed again
  afterward.

### Docs/backlog impact

- `docs/anforderungen/README.md`: this row → `✅ ready` now, `🏁 done` on
  completion.
- `CLAUDE.md`: a line about the `area` property (mirrors the existing
  `sperrung`/field-name pitfalls) and about the `hasArea` quality signal,
  once implemented.
- `docs/BACKLOG.md`: no new task — runs entirely through this requirement.

## Definition of Done

- `properties.area` populated in `data/baustellen.geojson` for every
  `vorgangsnummer` where the WFS delivers a non-Point geometry, via
  `transformGeometry()`; omitted otherwise.
- Area shapes render on the map (own layer, `interactive:false`), styled via
  `AMPEL_COLOR`, synced with the filtered list.
- Selecting a feature with an `area` fits the map to its bounds (padded,
  `maxZoom:17`); point-only features keep today's exact `setView` behavior.
- `hasArea` signal added to the data-quality report.
- `npm test` green, including new `transformGeometry()` coverage and the
  dedup/area test.
- `src/lib/` stays DOM-/network-/dependency-free (unchanged —
  `transformGeometry()` was already pure).
- Accessibility verified (decorative layer, `prefers-reduced-motion`
  respected on `fitBounds()`).
- `CACHE_SHELL` bumped in `sw.js`.
- Docs updated: requirements overview status, `CLAUDE.md`.

## Implementation steps

1. `scripts/build-data.mjs`: change the dedup loop to retain the sibling
   non-Point geometry per `vorgangsnummer` (E8's first-wins rule for more
   than two); `buildFeature()` gains an `area` property via
   `transformGeometry()` plus the same rounding `round()` already applies to
   Point coordinates.
2. `scripts/test-transform.mjs`: add `transformGeometry()` ground-truth
   coverage (Polygon/MultiPolygon).
3. New/extended test asserting `area` population/omission and the
   first-wins edge case (E8).
4. `scripts/quality-report.mjs`: add the `hasArea` signal (E9).
5. `scripts/test-quality.mjs`: cover the new signal.
6. `src/app.js`: new `areaLayer` (`L.layerGroup`), rendering function
   drawing `area` shapes styled via `AMPEL_COLOR`, wired into `render()`
   alongside `renderMarkers()`.
7. `src/app.js`: extend `selectFeature()` for the `fitBounds` path (E5),
   capped `maxZoom:17`, respecting `prefersReducedMotion()`.
8. `sw.js`: bump `CACHE_SHELL` (`v6` → `v7`).
9. Browser check (Playwright): render verification, selection/`fitBounds`
   behavior, filter sync, screenshots mobile+desktop/light+dark per
   convention.
10. One-off `workflow_dispatch` inspection of the real WFS geometry mix
    (edge-case confirmation from the risk note above), removed afterward.
11. Update `docs/anforderungen/README.md` status, `CLAUDE.md`.
