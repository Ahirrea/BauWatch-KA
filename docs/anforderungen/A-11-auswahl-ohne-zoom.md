# A-11 Selection without a map zoom

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a resident scanning the map, I want clicking a construction
site to leave my map view exactly where it is, so that I keep the overview I
just built up instead of zooming back out after every click.

**Refined on:** 2026-08-08
**Constrained by:** — (no ADR: this reverses a product decision,
[A-7](./A-7-baustellenflaechen.md)/E5, and removes code. No new subsystem, no
persistence, no hosting change. See E6 for why it is not a stored preference,
which *would* have touched
[ADR-004](../adr/ADR-004-farbschema-zweiter-localstorage-schluessel.md).)
**Target branch:** —

## Touchpoints in the code

**Checked, not guessed** (line numbers as of 044c98f).

| What | Where | Meaning for this requirement |
|---|---|---|
| The selection camera move | `selectFeature()`, `src/app.js` L545–584 | Holds both branches this requirement removes: `fitBounds()` for a feature with an `area`, `setView(punkt, Math.max(zoom, 15))` for a point-only one. Everything else in the function (list `is-selected`, `applyAreaTier()`, `scrollListItemIntoView()`) stays. |
| The popup `autoPan` exception | `renderMarkers()`, `src/app.js` L404 (`{ autoPan: false }` when `f.properties.area`) | Exists only because `autoPan` fought the fit (A-7/E5, Backlog #29). With no fit left, it becomes the thing that *breaks* the popup instead of protecting the fit → reverted to the Leaflet default (E2). |
| The reserved popup strip | `popupPlatz()`, `src/app.js` L596–600, and `AREA_FIT_MAX_ZOOM` / `AREA_FIT_PADDING` / `AREA_FIT_POPUP_MAX_SHARE`, L23–27 | Called from nowhere but the fit; all four become dead code and go. |
| Selection feedback that survives | `applyAreaTier()` / the A-9 tiers, `render()`'s re-apply at L535–539 | This is what answers "which one did I just click" once the camera stops helping — the reason the removal is affordable (see Tension). |
| Map moves that are *not* selection | radius search `setView(hit.center, 14)` L809, reset `setView(KA_CENTER, 13)` L850, initial view L875 | Explicitly out of scope (E5): each is a direct answer to an action the user just took, not a side effect of a click on a list row. |
| Test suite | no script under `scripts/` references `fitBounds`, `AREA_FIT*` or `popupPlatz` | `npm test` is unaffected by this change; the verification is a browser check (see Test plan). |
| Shell precache | `sw.js`, `CACHE_SHELL` (currently `v16`) | `src/app.js` is a shell file → bump to `v17`. |

**Missing (net-new):** nothing. This requirement only deletes — the only
additions are documentation (the `E5 revised` block in A-7, the rewritten
`CLAUDE.md` pitfall) and the `CACHE_SHELL` bump.

## Tension with non-goals — and resolution

1. **[A-7](./A-7-baustellenflaechen.md)/E5 chose exactly this behaviour**, and
   chose it deliberately: "a fixed point/zoom loses exactly the spatial context
   this requirement adds for a long street-closure shape." The idea's
   originator has now reversed that on the basis of daily use — the automatic
   zoom costs the map overview on *every* click, while the context it buys
   matters for the minority of cases with a long shape. That is a decision
   disproved in practice, so per `CLAUDE.md` A-7's E5 keeps its original text
   and gains an `E5 revised (2026-08-08)` block pointing here.
2. **A-7's own rule "a clipped popup is worse than a shifted map"** (Backlog
   #29) still holds and is *not* being traded away. It is the reason the fit's
   removal comes bundled with giving `autoPan` back (E2): the popup keeps its
   guarantee of being readable, and it now costs a pan of a few pixels instead
   of a reserved strip of the map.
3. **A-7's actual goal is untouched.** The area layer still renders every
   shape, and A-9 still lifts the selected one out of the ~200 others. What
   goes away is only the camera move — the extent stays visible wherever the
   user has the map.
4. **No non-goal in the PRD lineage is touched** (no routing, no other
   municipalities, no backend, no tracking): this is a client-side removal.
5. **Backlog #30** ("very large areas fit at a zoom where they read as a
   hairline", deliberately open, not planned) becomes **moot** — nothing
   auto-fits a 1.9 km corridor to zoom 13 any more.

## Decisions (with rationale)

**E1 — Selecting a construction site never changes the zoom level.** Both
branches of `selectFeature()` lose their camera move. *Discarded:* "only ever
zoom out" (`fitBounds` with `maxZoom: map.getZoom()`), which would have kept
the shape-fits-the-screen property for long closures. Rejected because it keeps
the whole `popupPlatz()`/padding machinery alive for a case the originator did
not ask to keep, and because "sometimes it moves, sometimes it doesn't" is
harder to predict than "it never moves".

**E2 — The popup's `autoPan` goes back to the Leaflet default for every
marker.** The `{ autoPan: false }` exception for features with an area is
removed together with the fit it was protecting. Consequence: the map still
shifts by up to a popup's height when the clicked marker sits near the edge —
that is the minimum needed for the popup to be readable at all, and it never
changes the zoom. *Discarded:* keeping `autoPan: false` everywhere (the strict
reading of "the map must not move"): with no reserved strip, a popup at the top
edge is clipped, which A-7 already established is worse than a shift.

**E3 — The point-only path loses its `Math.max(map.getZoom(), 15)` too**, even
though that is pre-A-7 behaviour and predates the complaint. Chosen by the
idea's originator for consistency: with it left in, roughly one click in eight
(the point-only cases) would still zoom, and the behaviour would read as a bug
rather than as a rule.

**E4 — No centring on the selected feature either.** Beyond E2's `autoPan`, the
selection does not pan. *Discarded:* `panTo(marker)` at the unchanged zoom as a
middle ground — it still throws away the view the user positioned, which is the
actual complaint; the zoom was only its most visible half.

**E5 — The other three `setView()` calls stay exactly as they are:** radius
search (zoom 14), "reset" (zoom 13), initial view (zoom 13). Each answers an
action whose entire purpose is "take me somewhere"; the click on a list row is
not one.

**E6 — Not a setting.** *Discarded:* a "fit to area on selection" preference.
It would need a third `localStorage` key — admissible under
[ADR-004](../adr/ADR-004-farbschema-zweiter-localstorage-schluessel.md)'s
bounded category, so this is not a hard blocker — plus a control in the UI and
a documented value set in
`datenschutz.html`. The originator wants the behaviour gone, not switchable,
and a preference for a behaviour nobody asked to keep is the more expensive
half of both worlds.

## Scope / Non-scope

- **In:** `selectFeature()`'s two camera branches; the `{ autoPan: false }`
  popup exception; `popupPlatz()` and the three `AREA_FIT_*` constants;
  `CACHE_SHELL` bump; the `E5 revised` block in A-7; the `CLAUDE.md`
  autoPan/`fitBounds` pitfall (it documents machinery that ceases to exist);
  Backlog notes on #29 and #30.
- **Out:** the area layer itself and its styling (A-7/A-9 unchanged); marker
  rendering and the popup's *content*; hover and focus tiers; radius search,
  reset and initial view (E5); the list scroll on a marker click
  (`scrollListItemIntoView()` — that one moves the *list*, not the map, and is
  what makes a marker click findable in the list); any data-side change.

## Specification

**Flow, after the change.** A click on a list row or a marker:
1. marks the row `is-selected` and lifts the area to the selection tier (A-9) —
   unchanged;
2. opens the marker popup; Leaflet pans the map only if the popup would not fit
   (E2);
3. on a marker click, scrolls the list container to the row — unchanged.

The zoom level after step 3 equals the zoom level before step 1, always.

**States and edge cases.**

| Case | Behaviour |
|---|---|
| Selected marker is far outside the current viewport (possible from the list) | The map does not travel to it. `autoPan` cannot help either — Leaflet pans towards the popup's anchor, and for a marker far off-screen the popup simply opens outside the visible area. The selection remains visible in the *list* (`is-selected`), which is where the click came from. Accepted consequence of E1/E4, and the sharpest edge of this requirement. |
| Selected marker just off the edge / near the top edge | `autoPan` shifts the map by the few pixels the popup needs (E2). Zoom unchanged. |
| Area larger than the viewport at the current zoom | Drawn as far as it reaches; the user zooms out if they want the rest. This is what Backlog #30 was about and why it is moot. |
| Point-only case (no `area`) | Identical rule, no zoom to 15 (E3). |
| Very small area at low zoom | Unchanged from today's *rendering*; it is simply no longer zoomed into. |
| `prefers-reduced-motion` | Strictly better than today: one fewer animated camera move. The `animate` flag survives only where a `setView()` remains (E5). |
| Mobile (map first screen, list below, #33) | A list click no longer moves the map at all in the common case. The row highlight is the feedback; nothing scrolls the viewport. |
| Installed PWA with an old shell | Sees the old behaviour until the `v17` shell lands — normal for every frontend change. |

**Data model / persistence:** untouched. No new field, no new
`localStorage` key (E6), so `scripts/test-rechtstexte.mjs` and
`scripts/test-theme.mjs` are unaffected and `datenschutz.html` needs no edit.

**External dependencies:** none. Leaflet's default popup behaviour is being
*restored*, not extended.

**Accessibility:** focus order, ARIA and keyboard paths are untouched
(`wireListFocus()`, the `.list-item-btn` buttons). A keyboard user selecting a
row keeps their map view, same as a mouse user. The removed animation only
reduces motion.

**Test plan.**
1. `npm test` — must stay green; no assertion touches this path, so a red run
   would mean collateral damage.
2. Playwright, against the committed snapshot, tiles intercepted, with
   `L.map` wrapped via `addInitScript()` so the instance is readable
   (`CLAUDE.md` pattern):
   - For a sample of cases resolved **by list index** (never by title
     substring — `CLAUDE.md`), assert `getZoom()` is identical before and
     after selection, for cases **with** and **without** an `area`.
   - Assert the open popup's bounding box lies inside the map container (the
     #29 guarantee, now carried by `autoPan`).
   - Assert `getCenter()` is unchanged for a marker selected well inside the
     viewport, and changed by at most the popup's height for one near the top
     edge.
   - Assert the area layer still renders and the selected shape still carries
     the A-9 selection tier (read `stroke-width`/`fill-opacity` off
     `.leaflet-overlay-pane svg path`, per frame) — proof that the removal did
     not take the emphasis with it.
   - Compare against a `git archive HEAD`-based `before/` checkout on a second
     port from the same start view, so "the zoom no longer changes" is measured
     against the old behaviour rather than against intuition.
3. Screenshots with the result report: mobile 414 px and desktop 1280 px, each
   light and dark, plus a before/after pair of the same selection.

**Docs / backlog impact.**
- A-7 gains an `E5 revised (2026-08-08)` block; the original E5 stays visible.
- `CLAUDE.md`: the pitfall "Leaflet's popup `autoPan` silently overrides
  `fitBounds`" describes code that no longer exists. It is **rewritten, not
  deleted** — the mechanism (autoPan beats a preceding `fitBounds`; identical
  measured bounds means autoPan won) is still the trap anyone re-adding a fit
  would hit. The `CACHE_SHELL` line goes to `v17`.
- Backlog: #29 keeps its entry as the record but gains a note that its
  mechanism was removed here; #30 is closed as moot (with its reason), and the
  header `**Status:**`/summary lines are updated in the same edit — both places,
  per `CLAUDE.md`.
- `README.md`: checked for a claim about zoom-on-selection; updated only if one
  exists.

## Definition of Done

- [ ] Selecting any construction site — from the list or from a marker, with or
      without an `area` — leaves the zoom level unchanged.
- [ ] The map only ever shifts by what the popup needs (E2); no `fitBounds` and
      no `setView` remain in `selectFeature()`.
- [ ] `popupPlatz()`, `AREA_FIT_MAX_ZOOM`, `AREA_FIT_PADDING`,
      `AREA_FIT_POPUP_MAX_SHARE` and the `{ autoPan: false }` option are gone,
      with no dead references left.
- [ ] The open popup is never clipped by the map container (Playwright).
- [ ] A-9's selection/hover tiers and A-7's area rendering behave as before.
- [ ] Radius search, reset and initial view still move the map as before (E5).
- [ ] `npm test` green; `CACHE_SHELL` at `v17`; `scripts/test-pwa.mjs` green.
- [ ] A-7/E5 revised in place, `CLAUDE.md` pitfall rewritten, Backlog #29/#30
      and its header updated, status here set to `🏁 done` in the
      [overview](./README.md#overview).
- [ ] Screenshots (mobile/desktop × light/dark + before/after) sent with the
      result report.

## Implementation steps

1. `src/app.js`: strip the camera move from `selectFeature()` — open the popup,
   keep tier and list handling, drop both branches (E1, E3, E4).
2. `src/app.js`: `marker.bindPopup(popupHtml(f))` without the `autoPan` option
   (E2); delete `popupPlatz()` and the three `AREA_FIT_*` constants; rewrite the
   two comment blocks that explain the fit so they explain the *rule* (selection
   never moves the camera) instead of describing removed machinery.
3. `sw.js`: `CACHE_SHELL` → `v17`.
4. `npm test`.
5. Playwright check per the test plan, including the `before/` checkout
   comparison; collect screenshots.
6. Docs: A-7 `E5 revised`, `CLAUDE.md` pitfall + `CACHE_SHELL` line, Backlog
   #29 note / #30 moot / header, this file's status in the overview.
