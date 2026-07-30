# A-9 Selection and hover emphasis for construction-site areas

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident who has picked a construction site out
of the list, I want that site's shape to stand out from all the other shapes
on the map — and I want to preview a site's extent just by pointing at it —
so that I can tell which of ~200 shapes is the one I'm looking at without
clicking through them one by one.

**Refined on:** 2026-07-30
**Addresses PRD:** "Feature scope (v1)" — the map bullet, as extended by
[A-7](./A-7-baustellenflaechen.md). Serves the core loop's step 2 ("picks out
the relevant one"): A-7 made every extent visible, this makes the *selected*
one identifiable.
**Constrained by:** — (no ADR needed — this is a client-only rendering change
with no data, storage, hosting or subsystem impact; strictly less invasive
than A-7, which needed none either.) Depends on
[A-7](./A-7-baustellenflaechen.md) being implemented; its decisions **E2**
(marker stays the only interactive object), **E3** (`interactive:false`),
**E4** (`AMPEL_COLOR`, no second colour meaning) and **E6** (no zoom-gating)
all hold unchanged.
**Target branch:** —

## Touchpoints in the code

**Checked, not guessed** — against `main` at `6e2f6b5`.

| What | Where | Meaning for this requirement |
|---|---|---|
| Per-feature area handle already exists | `renderAreas()` and `areaById` in `src/app.js` (L277–297, declared L98) | `areaById` maps `f._key` → an `L.featureGroup`. A `featureGroup` supports **both** `setStyle()` and `bringToFront()`, so the tier model and the z-order rule attach to what's already there — no new bookkeeping. |
| Style function, already split by geometry type | `areaStyle(color, geometryType)` + `AREA_LINE_TYPES` in `src/app.js` (L259–264) | The exact seam to extend with a tier argument. Line geometries deliberately get `{ weight: 6, opacity: 0.45 }` and **no fill**; polygons get `{ weight: 2, opacity: 0.9, fillOpacity: 0.18 }`. A single fill-opacity ramp would emphasize nothing for the line cases (E5). |
| Mixed geometry inside one case | GeometryCollection split in `renderAreas()` (`const teile = …`, ~L288) | One `featureGroup` can contain polygon **and** line child layers. A blanket `gruppe.setStyle(oneStyle)` would put a fill on a polyline and a 6 px stroke on a polygon — the restyle has to run per child, type-aware, through the same `areaStyle()`. |
| Marker rendering is fixed-option | `renderMarkers()` in `src/app.js` (L307–312) | `L.circleMarker` gets `radius: 8`, `weight: 2` hardcoded per marker. **Left exactly as-is** by E6 — noted here because it's what makes the "selected marker is indistinguishable" gap a deliberate non-goal rather than an oversight. |
| Selected state is list-only | `selectFeature()` / `render()` in `src/app.js` (L370–373, L378–379); `.liste li.is-selected { outline: 2px solid var(--accent) }` in `src/styles.css` (L574) | `state.selectedId` (L48) already survives a re-render and is already reset when the selected feature leaves the filtered list. The area layer gets wired into the same state; no new state is introduced. |
| No hover handling exists anywhere | grep for `mouseover`/`mouseenter`/`mouseleave`/`focusin` in `src/app.js`; `:hover` in `src/styles.css` | Only `.whats-new-btn` (L197), `.whats-new-close` (L298) and Leaflet's own controls carry `:hover`. Neither markers, rows, nor areas react to the pointer today — the whole hover tier is net-new. |
| Chip surface token, defined in all three theme states | `--chip` / `--chip-border` in `src/styles.css` (L27/28 base, L72/73 system-dark, L92/93 explicit `[data-theme="dark"]`) | Reused for the row tint (E7). Documented in-file as "a surface that sits **on** the list card", and already used that way by `.whats-new-close:hover` (L299) and the badges (L598–600) — so the pattern and the value pairs already exist. |
| Explicit theme override mechanism (A-8) | `:root:not([data-theme="light"])` under `@media (prefers-color-scheme: dark)` (L59–60) plus `:root[data-theme="dark"]` (L80) and `:root[data-theme="light"]` (L103) in `src/styles.css` | **Raises the verification bar**: contrast has to be computed in *three* states — system-follow, explicit light, explicit dark — not just via `colorScheme`. A `prefers-color-scheme`-only check would miss the explicit overrides entirely. |
| Global focus ring | `:focus-visible { outline: 3px solid var(--focus) }` in `src/styles.css` | Each row's `.list-item-btn` is already keyboard-reachable and ringed; E8 only adds the map-side reaction, no new focus styling. |
| Shell precache version | `CACHE_SHELL = 'bauwatch-shell-v11'` in `sw.js` (L25) | `src/app.js` and `src/styles.css` both change → bump to `v12`. Same trap as every prior feature (`CLAUDE.md` pitfall); `scripts/test-pwa.mjs` checks it. |
| Reduced motion | `prefersReducedMotion()` in `src/app.js` | Already threaded through `setView()`, `fitBounds()` and `scrollListItemIntoView()`. Hover/focus animate nothing (E9), so they need it only if a CSS transition is added to the row tint. |
| Live geometry mix | `data/baustellen.geojson` at `6e2f6b5`: **197 of 197 features carry `area`** — `Polygon` 112, `MultiPolygon` 46, `MultiLineString` 35, `LineString` 3, `GeometryCollection` 1 | Two consequences: **(a)** ~19 % of features are fill-less line geometries, which is what forces E5; **(b)** no feature currently lacks an `area`, which is what removed E6's original justification. `CLAUDE.md`'s measured mix (222 points / 222 shapes, exactly paired, ~20 % lines) agrees. |
| Adjacent, deliberately-open finding | [`BACKLOG.md` #30](../BACKLOG.md) — very large corridors fit at a zoom where they read as a hairline | Not addressed here and not closed by this requirement, but worth recording: the selected tier's heavier stroke *slightly* improves exactly that case for the one feature being looked at. #30's rejected option "zoom-adaptive stroke weight" stays rejected — the tier ramp is state-driven, not zoom-driven. |

**Missing (net-new):** the tier concept itself (a `(feature, tier)` → style
mapping for areas, type-aware); hover wiring on rows and markers behind a
pointer-capability gate; focus wiring on the row button; the row tint;
z-order management; hover-state teardown in `render()`; the `CACHE_SHELL`
bump.

**Explicitly *not* net-new:** no data-pipeline change, no `properties.*`
addition, no new file, no new UI control, no new string.

## Tension with non-goals — and resolution

Checked against every non-goal in `PRD.md` §4 and the relevant `CLAUDE.md`
pitfalls:

1. **"No routing / no navigation."** Untouched — nothing is computed.
2. **"No other municipalities."** Untouched.
3. **"No user account, no login."** Untouched.
4. **"No real push."** Untouched.
5. **"No reporting channel back to the city."** Untouched.
6. **"No data storage of our own beyond the committed GeoJSON."** →
   **Resolved trivially:** this requirement writes nothing at all. The tier
   is in-memory, derived from `state.selectedId` and the live pointer, and
   gone on reload.
7. **No backend, no frontend build step
   ([ADR-001](../entscheidungen/ADR-001-statisches-hosting.md)).** →
   Untouched — plain static files, as before.
8. **`src/lib/` must stay DOM-/network-/dependency-free.** → **No risk at
   all:** every change lands in `src/app.js` and `src/styles.css`; `src/lib/`
   is not touched.
9. **A-5's bilingual boundary.** → **No new UI text**, which is precisely
   what E11 (no tooltip) preserves. `src/lib/i18n.js` gains nothing and
   `scripts/test-i18n.mjs` stays green unmodified.
10. **`test-rechtstexte.mjs`'s storage guards
    (A-5/E6, [ADR-003](../entscheidungen/ADR-003-sprachumschalter-localstorage.md),
    [ADR-004](../entscheidungen/ADR-004-farbschema-zweiter-localstorage-schluessel.md)).** →
    **No new `localStorage` key**, no cookie, no `sessionStorage`, no
    geolocation. Two documented keys exist (language, colour scheme); this
    adds no third, which is also why E1 rejected a persisted "show areas"
    toggle.
11. **WCAG 1.4.13 "Content on Hover or Focus".** → **Not triggered** (E11):
    nothing new appears on hover; already-visible content only changes
    emphasis.
12. **A-7's E3 (`interactive:false`) and its stated reason** — without it, a
    long closure's area would swallow the clicks meant for its marker. →
    **Deliberately upheld** (E2): hovering the *shape* stays impossible, so
    the click target A-7 protected is not re-endangered.

No non-goal blocks this requirement. It is the least invasive requirement in
the folder so far: no data, no storage, no strings, no controls.

## Decisions (with rationale)

Made with the idea's originator in a `/grilling` session on 2026-07-30,
prompted by "I want to see the area highlighted when I select a construction
site — it should highlight when I hover over one too."

The session initially ran against a **stale checkout** in which A-7 was still
`✅ ready` and unbuilt, and produced two further decisions — ship both scopes
as one increment, and amend A-7 in place — that were **discarded once `main`
was fetched** and A-7 turned out to be `🏁 done` with 197/197 features
carrying an `area`. That is also what moved this into its own number, per
[step 7a of the process](../PROZESS.md#7a-amending-an-already-refined-requirement).
E6 below is the one decision whose *substance* changed as a result, and it is
recorded with that history rather than silently.

**E1 — Emphasis is differential; every area stays drawn.** A-7's E6 (no
zoom-gating, all extents rendered) is confirmed, not revised: the base state
remains "all shapes visible", and selection/hover raise one shape's emphasis.
*Discarded:* drawing an area **only** for the selected/hovered feature — the
cleanest map and the least ambiguous highlight, but it demotes the layer to
an on-demand detail view and destroys the city-wide scan A-7 exists for; you
would have to click ~200 sites to find your street. *Also discarded:* areas
off by default behind a "show areas" toggle — a new control, a DE/EN string
pair and, if remembered, a third `localStorage` key with a
`datenschutz.html` entry, all to make a default configurable rather than
correct.

**E2 — Hover is triggered by the list row and by the marker, never by the
area shape.** Hovering a row emphasizes its area; hovering a marker
emphasizes its area and tints its list row. This mirrors both directions of
the click-sync that `selectFeature()`'s `fromList`/`fromMarker` paths already
implement. *Discarded:* the list row alone — a mouse user exploring the map
would get nothing and would have to find the row in a ~200-item scrolling
list to preview an extent. *Discarded:* hovering the shape itself — a Leaflet
layer created with `interactive:false` emits no mouse events whatsoever, so
this would mean reversing A-7's E3, whose in-code comment states the concrete
cost: the area of a long street closure would then intercept the clicks meant
for its own marker. It would additionally force an answer for which of two
overlapping areas wins the pointer.

**E3 — The hover path is bound only when `matchMedia('(hover: hover)')`
matches; touch devices get selection only.** On iOS Safari and Android Chrome
a tap fires synthesized `mouseover`/`mouseenter` and the element keeps its
hover styling until the user taps elsewhere. Since a tap also selects, an
ungated hover would leave a stale highlight on the previously tapped site
next to the genuinely selected one — two competing highlights on a 414 px
screen. The gate is one `matchMedia` check, the same shape as the existing
`prefersReducedMotion()` helper. On a hybrid touchscreen laptop the primary
pointer is the mouse, so the query is true and hover works; a tap there also
selects, so the two states agree rather than compete. *Discarded:* per-event
`pointerenter` with an `event.pointerType === 'touch'` filter — more exact per
input device, but Leaflet markers emit `mouseover`/`mouseout`, not pointer
events, so the marker half would need a second, different mechanism.
*Discarded:* no gating at all.

**E4 — Three tiers: idle → hover → selected, selection strongest; on one and
the same feature, selected wins.** Both states can be live at once on the
desktop: hovering B while A is selected must read as "A is chosen, B is being
previewed". Selection additionally carries two cues hover never has (the open
popup, the row outline), so the tiers stay tellable apart without a second
colour meaning (A-7's E4). *Discarded:* one shared "highlighted" style — half
the work, but hovering B while A is selected paints two identical highlights
and the only remaining cue for which is selected is a popup that may be
scrolled out of view. *Discarded:* hover suppressing the selected emphasis so
only one thing is ever highlighted — never ambiguous, but the selected shape
would blink off whenever the pointer crossed the list, contradicting
selection being the persistent state.

**E5 — The tier ramp is geometry-type aware, extending the existing
`areaStyle(color, geometryType)` with a tier argument.** Polygons ramp fill
opacity plus stroke weight; line geometries — ~19 % of live features, which
Leaflet draws as polylines that ignore `fillOpacity` entirely — ramp stroke
weight plus stroke opacity, the only two channels they have. Same colour,
same meaning, only the technique differs, exactly as A-7's existing in-code
comment already argues for the idle state. Starting values, to be finalized
against the screenshots:

| Tier | Polygon | Line geometry |
|---|---|---|
| idle | `weight: 2`, `fillOpacity: 0.18` (today's values, unchanged) | `weight: 6`, `opacity: 0.45` (today's values, unchanged) |
| hover | `weight: 3`, `fillOpacity: 0.28` | `weight: 7`, `opacity: 0.65` |
| selected | `weight: 3`, `fillOpacity: 0.38` | `weight: 8`, `opacity: 0.85` |

*Discarded:* a contrasting casing drawn beneath an emphasized line, the way
road maps outline routes — the strongest signal over busy tiles, but it
doubles the layer count for emphasized line features, needs its own z-order
handling inside the feature group, and the casing colour would have to work
in all three A-8 theme states over light OSM tiles. *Discarded:* ramping only
the weight and leaving line opacity at 0.45 — fewest moving parts, but at
that opacity a 6 → 8 px change is a weak signal, close to the
"works in the open, fails downtown" failure mode E10 exists to prevent.

**E6 — Markers are left exactly as they are: no tier, no selected style.**
Chosen by the idea's originator. The grilling session had originally decided
the opposite, on the argument that `properties.area` is optional and an
unknown share of features might be point-only, leaving an area-only highlight
silently inert for part of the list. Fetching `main` disproved the premise:
**197 of 197 features carry an `area`**, so an area-only emphasis reaches
every feature in practice, and `renderMarkers()` stays untouched. Two
consequences accepted knowingly:

- The pre-existing gap that a **selected marker looks identical to every
  other marker** stays open. Picking a site from the list still marks it only
  in the list (plus the opened popup and the `fitBounds` move). This
  requirement does not close it and does not claim to.
- A **future** point-only case — the WFS could deliver one on any run — would
  get no map-side emphasis at all: hovering its row would change nothing
  visible on the map. `data/QUALITY.md`'s `hasArea` line is where that would
  become apparent.

*Discarded:* full marker tiers (grown radius, heavier stroke) — would close
the gap above and keep hover feedback at the pointer, at the cost of moving
`renderMarkers()` from fixed options to a `setStyle`-driven tier.
*Discarded:* marker styling on selection only, not on hover — would close the
gap for less work, but then hovering a marker changes everything except the
marker being pointed at.

**E7 — The hovered list row is tinted with `background: var(--chip)`.**
`--chip` is the token built and documented for "a surface sitting on the list
card", with separately tuned values in all three theme states, so it sidesteps
the `--bg` trap in `CLAUDE.md` without adding a token, and
`.whats-new-close:hover` already uses it for exactly this purpose. It also
uses a *different* CSS property than `.is-selected`'s outline, so a row that
is both hovered and selected composes cleanly — tint **plus** outline.
*Discarded:* a weaker outline on hover — visually parallel to selection by
design, but both then compete for the same property and a hovered-and-selected
row can only draw one outline. *Discarded:* a new `--row-hover` token pair —
duplicates `--chip`'s role and adds another value set to keep
contrast-checked in three states.

**E8 — Keyboard focus mirrors hover, and its wiring is deliberately *not*
gated by E3.** `focusin`/`focusout` on the row's `.list-item-btn`, filtered to
real keyboard focus via `:focus-visible` so a mouse click doesn't double-fire,
put the feature into the hover tier. Keyboard users get the same free preview
while tabbing instead of it being a mouse-only privilege. The gate is omitted
because a keyboard can be attached to a touch-primary device, where
`(hover: hover)` is false but tabbing still happens. *Discarded:* hover stays
mouse-only — not a WCAG failure (the emphasis is decorative and the extent is
reachable by selecting), but an avoidable asymmetry. *Discarded:* focus
triggering full selection — perfect parity for zero extra keys, but tabbing a
filtered list would pan/zoom the map and open a popup on every Tab press,
re-firing A-7's `fitBounds` each time.

**E9 — Hover and focus never move the viewport.** No map pan, no programmatic
list scroll; they only restyle. Accepted consequence: hovering a row whose
site is off-screen emphasizes something the user cannot see. Committing the
viewport is what selection is for (A-7's E5 `fitBounds`), and a map that
lurches on every pointer pass across a list is unusable. The browser's own
scroll when tabbing to a row is native behaviour and left alone. *Discarded:*
marker hover scrolling the row into view via the existing
`scrollListItemIntoView()` helper — it already does this on marker *click*,
but markers cluster downtown, so one pointer sweep would fling the list
repeatedly. *Discarded:* full bidirectional pan-and-scroll on hover — nothing
would ever be emphasized off-screen, but the viewport would be driven by
pointer movement and A-7's deliberate selection fit would become meaningless.

**E10 — `bringToFront()` on hover and on selection, with the selected feature
re-asserted to the front when a hover ends.** Leaflet paints within one SVG
pane in insertion order, so without this an emphasized shape can sit
*beneath* a neighbour's fill — precisely downtown, where closures cluster.
The failure mode is nasty because it is partial: the preview works in open
areas and does almost nothing in dense ones, which reads as "this site has no
shape". `areaById` holds an `L.featureGroup` per feature, which supports
`bringToFront()` directly. *Discarded:* selection only. *Discarded:* no
z-order management — then even the strongest tier can render buried.

**E11 — No hover tooltip; emphasis only.** Hovering a marker already tints its
list row (E2), so the site's name is discoverable without a second on-hover
surface. Keeps the change to styling plus event wiring, adds no i18n strings,
and avoids WCAG 1.4.13's dismissable/hoverable/persistent obligations.
*Discarded:* `bindTooltip()` with `properties.titel` — useful when the list is
scrolled away, but it would need a keyboard equivalent for parity with E8 and
would surface raw German dataset titles in an EN session, against A-5's
boundary.

## Scope / Non-scope

- **In:**
  - A tier model — idle / hover / selected — for the **area layer**, applied
    per feature via the `areaById` feature groups, with selection winning
    over hover on the same feature (E4).
  - `areaStyle(color, geometryType)` extended with a tier argument, keeping
    the polygon/line split and applying per child layer so a
    GeometryCollection's mixed parts each get the right style (E5).
  - Hover wiring on list rows and on markers, bound only when
    `(hover: hover)` matches (E2, E3).
  - `focusin`/`focusout` wiring on the row button, bound unconditionally and
    filtered via `:focus-visible` (E8).
  - `background: var(--chip)` on the hovered row (E7).
  - `bringToFront()` on hover and selection, re-asserting the selected
    feature on hover end (E10).
  - Hover-state teardown in `render()`, so a filter change under a resting
    pointer cannot leave a ghost highlight.
  - `CACHE_SHELL` bump `v11` → `v12`.
- **Out, with rationale:**
  - **Any marker change** (E6) — no tier, no selected style;
    `renderMarkers()` untouched. The "selected marker is indistinguishable"
    gap and the future point-only-feature blind spot stay open, deliberately.
  - Interactivity on the area shape — hovering or clicking it (E2, upholding
    A-7's E3). A more forgiving hit target, but it re-endangers the marker's
    click target that E3 exists to protect.
  - A hover tooltip or marker label (E11).
  - A user-facing "show areas" toggle and any persistence of it (E1).
  - Hover-driven map panning or list scrolling (E9).
  - Hover on touch devices (E3) — selection is the only highlight there.
  - Any change to `properties.area`, the build pipeline, the quality report,
    or `src/lib/` — untouched entirely.
  - Closing [`BACKLOG.md` #30](../BACKLOG.md) (hairline corridors at low
    zoom). The selected tier's heavier stroke incidentally helps the one
    feature being looked at, but #30's zoom-adaptive-weight option stays
    rejected: the ramp here is state-driven, not zoom-driven.
  - Zoom-gating (A-7's E6) — unchanged and out of scope.

## Specification

### UX flow & states

The page loads and renders exactly as today. Every feature in the filtered
list keeps its shape drawn at the idle tier — i.e. byte-identical to today's
appearance when nothing is hovered and nothing is selected. No new controls,
no new loading/empty/error states.

| Tier | Area | List row | Marker | Entered by |
|---|---|---|---|---|
| idle | today's `areaStyle()` values | no tint, no outline | unchanged | default |
| hover | polygon `w3`/fill `.28`, line `w7`/`o.65`; brought to front | `background: var(--chip)` | **unchanged** (E6) | pointer on the row or the marker, on mouse-capable devices only (E3); keyboard focus on the row button, on any device (E8) |
| selected | polygon `w3`/fill `.38`, line `w8`/`o.85`; front-most | `outline: 2px solid var(--accent)` (unchanged) | **unchanged** (E6) | clicking a row or a marker — plus today's popup and `fitBounds` behaviour, unchanged |

Nothing appears, disappears or moves in any tier: emphasis is purely a change
of degree on already-visible content, which is what keeps WCAG 1.4.13 out of
scope (E11).

### Interaction with existing features

- **Filters / radius search.** Behaviour unchanged, but `render()` now also
  clears any live hover state. `renderAreas()` calls `areaLayer.clearLayers()`
  and `areaById.clear()`, and `renderList()` replaces the rows via
  `innerHTML = ''` — so the DOM node and the layer the hover state points at
  are destroyed and `mouseleave` may never fire. Selection already survives a
  re-render through `state.selectedId`; hover deliberately does not, and is
  re-established by the next pointer move.
- **Selection (A-7 E5).** Mechanics untouched — `fitBounds` with its popup-height
  padding and `maxZoom` cap, plus the opened popup, all unchanged. Selection
  simply also becomes the top emphasis tier.
- **Popups.** Untouched. Hover never opens, closes or re-anchors one.
- **Language switch (A-5) / colour-scheme switch (A-8).** No new strings and
  no new keys; the row tint follows `--chip`, which A-8 already defines in all
  three theme states.
- **Service worker.** `CACHE_SHELL` bump only.

### Data model / persistence

**No change whatsoever.** `data/baustellen.geojson` is untouched, no property
is added, no file is written, and nothing is persisted on the device — the
tier is derived at runtime from `state.selectedId` plus the live pointer or
focus target.

### External dependencies & fallback

None new. No network call is added; the feature works identically offline from
the service-worker cache.

### Edge cases & error handling

| Case | Behaviour |
|---|---|
| Filter changed (or radius search applied) while the pointer rests on a row | `render()` clears the hover state explicitly. Without this the destroyed row's `mouseleave` never fires and the area stays stuck at the hover tier — a ghost highlight with no pointer on it. |
| Hovered feature is filtered out by that same interaction | Same path: the hover state is dropped, never transferred to whichever row now occupies that screen position. |
| Hovering the feature that is already selected | The selected tier is kept; hover does not weaken it (E4). It stays selected on leave. |
| Hovering B while A is selected | Both visible at once at different tiers, by design (E4). On leaving B, A is re-asserted to the front (E10). |
| A case whose `area` is a GeometryCollection of polygons **and** lines (1 live case) | The restyle runs per child layer through `areaStyle(color, childType, tier)`, so each part gets its own type's ramp. A blanket `setStyle()` on the group would put a fill on the polyline and a 6 px stroke on the polygon. |
| A case split across several street segments (24 cases carry 2–6 shapes) | The whole feature group changes tier together — one case is one highlight, matching how `fitBounds` already spans all its parts. |
| Feature without an `area` (none today, possible on a future run) | No map-side emphasis at all (E6, accepted). The row tint, the row outline, the popup and the `fitBounds`/`setView` move still work, so it degrades to today's pre-A-7 behaviour rather than breaking. |
| Touch device | Hover handlers are never bound (E3). A tap selects; the selected tier is the only emphasis. No sticky hover. |
| Keyboard tabbing through the list | Each focused row enters the hover tier (E8); the map does not move (E9). `Enter`/`Space` selects as today. |
| Mouse click on a row, which also focuses the button | `:focus-visible` filtering keeps the focus path from firing on mouse interaction, so the click's own selection is what takes effect. |
| Selected feature filtered out | Existing behaviour unchanged — `render()` already resets `state.selectedId` when the key is no longer in the list. |
| Overlapping shapes, one emphasized | The emphasized one is brought to the front (E10) so its tier is actually visible instead of showing through a neighbour's fill. |
| Very large corridor selected (e.g. `2025V6065`, ~1.9 km, 180 vertices) | Unchanged from `BACKLOG.md` #30 — `fitBounds` zooms out and the shape reads thin. The selected tier's heavier stroke helps marginally; the finding stays open. |
| Pointer leaves the window entirely | `mouseleave` fires on the element being left, so the tier resets normally; no window-level handler needed. |

### Accessibility

- **Keyboard parity.** Focus on a row reaches the same tier as a mouse hover
  (E8), on any device, so the preview is not mouse-only. The existing
  `:focus-visible` ring is untouched.
- **No new ARIA.** The tiers are decorative emphasis of content that is
  already announced (the row's own text). An `aria-live` region would
  announce hover noise on every pointer pass; nothing is added.
- **The area layer stays out of the tab order** and unannounced —
  `interactive:false` per A-7's E3, upheld by E2.
- **Nothing appears on hover** (E11), so WCAG 1.4.13 does not apply.
- **Contrast must be computed, in three theme states.** The row tint moves
  the row's title and meta text off `--surface` onto `--chip`, so the AA
  ratio has to be recomputed for **system-follow, explicit light and explicit
  dark** — A-8 introduced `[data-theme]` overrides, so a
  `prefers-color-scheme`-only check would miss two of the three. Per
  `CLAUDE.md`: calculate via `getComputedStyle`, don't eyeball. Badges and
  `.whats-new-close:hover` already sit on `--chip`, so the values are
  expected to pass — expected is not measured.
- **No motion introduced.** Tier changes are instantaneous style swaps and
  hover/focus never pan (E9). If a CSS transition is added to the row tint
  for polish, it must be suppressed under
  `@media (prefers-reduced-motion: reduce)`.
- **Touch users lose nothing.** Selection provides the strongest tier on every
  device; only the optional preview is mouse/keyboard-bound (E3).

### Test plan

- **`npm test`**: expected to stay green **without any test file being
  modified**. That is itself the evidence for two decisions — `test-i18n.mjs`
  passing unchanged shows no new strings (E11), and `test-rechtstexte.mjs`
  passing unchanged shows no new storage key (E1). `test-pwa.mjs` covers the
  `CACHE_SHELL` bump with its existing generic check. `test-theme.mjs`
  must stay green too, since `src/styles.css` changes.
- **No new unit tests**: the change lives entirely in `src/app.js` and
  `src/styles.css`, i.e. DOM territory that `npm test` deliberately does not
  cover. The browser checks below are this requirement's actual suite.
- **Browser (Playwright), against the real committed data** — no fixture is
  needed or wanted: 197/197 features carry a real `area`, and `CLAUDE.md`
  warns that hand-made grid-aligned boxes look nothing like the production
  shapes (0 of 230 rings are axis-aligned).
  - Hovering a row raises that feature's area to the hover tier and tints the
    row; leaving restores idle.
  - Hovering a marker does the same and tints the counterpart row.
  - **A line-geometry feature** (e.g. one of the 35 `MultiLineString` cases)
    ramps stroke weight and opacity, and gets **no** `fillOpacity` applied.
  - **The GeometryCollection case** keeps polygon and line parts styled by
    their own type at every tier.
  - A multi-part case emphasizes all of its parts together.
  - Hovering B while A is selected leaves A at the selected tier, and A is
    front-most again after leaving B (E10).
  - `Tab` to a row reaches the hover tier and the map does **not** move (E9);
    `Enter` selects and fits.
  - A mouse click on a row leaves no lingering focus-driven hover tier.
  - Changing a filter while a row is hovered leaves **no** feature at the
    hover tier (the ghost-highlight case).
  - Emulated touch (`hasTouch`/`isMobile` context): a tap selects and leaves
    nothing at the hover tier (E3).
  - Markers are byte-identical to the pre-change checkout in every tier
    (E6) — the cheapest way to prove the non-goal held.
  - **Computed contrast** for the row's title and meta text on `--chip` in
    all three theme states, asserting AA. Not a visual check.
  - Screenshots per the `CLAUDE.md` convention: 414 px and 1280 px, each
    light and dark, plus a `deviceScaleFactor: 3` close-up of a hovered and a
    selected row and of the corresponding map shapes. Tiles intercepted; the
    grey map gets mentioned in the report.

### Docs/backlog impact

- `docs/anforderungen/README.md`: new A-9 row, `✅ ready` now, `🏁 done` on
  completion.
- `CLAUDE.md`: two pitfalls worth recording once implemented — **(a)**
  `render()` rebuilds markers, rows and areas from scratch, so any
  pointer-driven state must be torn down there or it survives as a ghost;
  **(b)** hover is bound only when `(hover: hover)` matches while focus is
  bound unconditionally, and "simplifying" that into one gate silently breaks
  keyboard users on touch devices. Also worth a line: `areaStyle()`'s tier
  argument must stay geometry-type aware, or line geometries lose their
  emphasis entirely.
- `docs/PROZESS.md`: gains step 7a (amending an already-refined requirement),
  written alongside this requirement because the process was silent on the
  case this session ran into.
- `docs/BACKLOG.md`: **no change** — no new task, and #30 stays open with its
  existing status untouched.

## Definition of Done

- Areas render at three tiers, selection winning over hover on the same
  feature; idle is byte-identical to today's appearance.
- The tier ramp is geometry-type aware: polygons ramp fill opacity and stroke
  weight, line geometries ramp stroke weight and opacity, and a
  GeometryCollection's parts are each styled by their own type.
- Hovering a list row or a marker emphasizes the area and tints the
  counterpart row; the area shape itself remains non-interactive.
- **Markers are provably unchanged** in every tier (E6).
- Hover wiring is absent on touch-primary devices, verified by an
  emulated-touch check: a tap leaves nothing at the hover tier.
- Keyboard focus reaches the hover tier on any device and does not move the
  map.
- The emphasized shape is front-most, and the selected one is re-asserted
  after a hover ends.
- Changing a filter under a resting pointer leaves no ghost highlight.
- Row title and meta text meet WCAG AA on `--chip`, **computed** in all three
  theme states.
- `npm test` green with **no test file modified**; `src/lib/` untouched.
- `CACHE_SHELL` bumped `v11` → `v12`.
- Screenshots delivered unprompted with the result report: 414 px and 1280 px,
  each light and dark, plus close-ups.
- No tooltip, no toggle, no hover-driven panning or scrolling, no new string,
  no new storage key.
- Docs updated: requirements overview status, `CLAUDE.md` pitfalls.

## Implementation steps

1. `src/app.js`: extend `areaStyle(color, geometryType)` with a tier argument
   (E5), keeping the existing line/polygon split and today's values as the
   idle tier.
2. `src/app.js`: a small tier resolver — given a feature key, return
   `selected` / `hover` / `idle` from `state.selectedId` and the current
   hover key — plus an apply function that walks a feature group's child
   layers and restyles each by **its own** geometry type (the
   GeometryCollection case).
3. `src/app.js`: hook the apply function into `selectFeature()` so the
   selected tier is set and `bringToFront()` runs (E4, E10), and into
   `render()` so the tier survives a re-render for the still-selected
   feature.
4. `src/app.js`: hover state — a single `hoverKey` in `state`, set/cleared by
   `mouseenter`/`mouseleave` on rows and Leaflet `mouseover`/`mouseout` on
   markers, bound only when `matchMedia('(hover: hover)')` matches (E2, E3).
   Re-assert the selected feature to the front on clear (E10). No viewport
   calls anywhere in this path (E9).
5. `src/app.js`: `focusin`/`focusout` on `.list-item-btn`, filtered via
   `:focus-visible`, bound unconditionally, driving the same `hoverKey`
   (E8).
6. `src/app.js`: clear `hoverKey` in `render()`, so a filter change under a
   resting pointer cannot leave a ghost highlight.
7. `src/styles.css`: `--chip` tint for the hovered row inside
   `@media (hover: hover)` (E7), composing with the existing `.is-selected`
   outline; if a transition is added, suppress it under
   `prefers-reduced-motion`.
8. `sw.js`: bump `CACHE_SHELL` `v11` → `v12`.
9. Browser checks (Playwright) against the real committed data: the full list
   under "Test plan", including the line-geometry and GeometryCollection
   cases, the markers-unchanged assertion, the ghost-highlight case, the
   emulated-touch case, and the computed contrast in all three theme states.
10. Screenshots per convention (414 px + 1280 px × light/dark, plus
    close-ups), sent with the result report.
11. Update `docs/anforderungen/README.md` status and `CLAUDE.md` pitfalls.
