# F-1 Mein Arbeitsweg (My Commute)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a user, I want to save my daily commute (start →
destination) with my chosen mode of transport and immediately see, when I
open the site, whether there are disruptions **on exactly this route**.

**Refined on:** 2026-07-23
**Target branch:** `claude/commute-transport-disruptions-g852lq`

## Touchpoints in the code
- Mode-of-transport classification/filter exists (`src/lib/classify.js`,
  `matchesVerkehrsmittel` in `src/app.js`) → "my mode of transport" already
  exists functionally, what's missing is **persisting** the choice.
- Address geocoding + radius search exists (`geocode`, `haversineKm`, the
  radius branch in `currentFiltered`) → but it only knows **one point**, not
  a **route**.

## Tension with non-goals — and resolution
`../PRD.md` excludes "**no routing / no navigation**". Resolved: the
non-goal applies to the **core load path** (that's why Leaflet is bundled
locally instead of via a CDN). "Mein Arbeitsweg" uses routing only as an
**optional, user-triggered** enrichment with a fallback — the same category
as the already-existing Nominatim address search. No navigation/turn-by-turn;
we still only show relevance. The PRD will be tightened accordingly during
implementation.

## Decisions (with rationale)
- **Route model: routing service at runtime + straight-line fallback.**
  Input is just start + destination (convenient); a real route instead of a
  straight line; on failure, a transparent fallback to a buffered straight
  line. Discarded: manual waypoints (too tedious for long routes), a pure
  straight line (the Rhine/railway/Alb creek distort it too much).
- **Routing keyless via FOSSGIS OSRM** (`routing.openstreetmap.de`),
  profiles `routed-foot`/`routed-bike`/`routed-car`. No API key in the
  static frontend. Same OSM ecosystem as Nominatim.
- **Exactly one mode of transport per route** (the route hinges on the
  profile); the existing multi-select filter is coupled to the profile in
  route mode.
- **Buffer widths:** foot **150 m**, bike **200 m**, car **300 m**.
- **Persistence in `localStorage`** (anonymous, client-side → doesn't
  violate "no user account/login"). The route is stored along with it →
  **no re-routing on every visit** (goes easy on the public instance).
- **Public transit deliberately left out for now** (street routing doesn't
  know lines) → see [`BACKLOG.md`](../BACKLOG.md) #19.

## Scope / Non-scope
- **In:** start/destination input, profile choice (foot/bike/car), fetch +
  buffer the route, construction sites along the route, summary banner,
  persistence + auto-load, straight-line fallback.
- **Out:** navigation/turn-by-turn, public transit, multiple saved routes,
  detour suggestions.

## Specification

**UX flow**
- A new **mode** alongside the radius search (mutually exclusive, switchable
  via segment/tab; reset → "all of Karlsruhe").
- Fields **start** and **destination** (Nominatim, search only on submit),
  **profile choice** (exactly one), a "show route" button.
- After submitting: geocode both addresses → fetch the route for the profile
  → draw it as a line with a buffer band → `fitBounds` → filter construction
  sites along the line.
- **Banner** (`aria-live="polite"`): "On your route today: **X disruptions**
  (of which **Y full closures**)." — at X=0, a positive empty state "…no
  construction sites… Have a good trip."
- Matches sorted **in travel order** (start → destination).
- Return visits: the saved route loads automatically, the banner shows
  immediately, **without** new routing. Buttons "Choose a different route" /
  "Delete route".

**Interaction with existing filters**
- Time period + traffic light apply additionally; the banner counts within
  the active time period (default "today").
- The mode-of-transport filter in route mode is coupled to the route's
  profile.

**Geometry — new pure module `src/lib/geo.js`** (DOM-/dependency-free):
`haversineKm` (shared here from `app.js`), `pointToPolylineDistanceKm` (a
local equirectangular projection → planar point-to-segment distance),
`withinCorridor(point, polyline, bufferMeters)`, `distanceAlongRouteKm` (for
sorting in travel order). A straight line = the special case of a two-point
polyline.

**Routing**
- `…/route/v1/driving/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson`,
  profile via subdomain. Response geometry = `[lon,lat]` vertices.
- One fetch per save; `fetch` lives **only** in `app.js`, not in `src/lib/`.
- Fallback on timeout/error/no result → straight-line corridor + a notice
  "route roughly estimated (straight line)".

**Persistence (`localStorage`, key `bauwatch.arbeitsweg`)**
```json
{ "version": 1,
  "start": { "label": "…", "center": [lat, lon] },
  "ziel":  { "label": "…", "center": [lat, lon] },
  "modus": "rad",
  "route": { "coordinates": [[lon,lat], …], "quelle": "osrm|luftlinie" },
  "gespeichert_am": "<ISO>" }
```
`version` allows migration; discard corrupt/stale entries defensively
(never crash on load). No `localStorage` (private browsing) → the feature
runs per session, persistence silently disabled.

**Edge cases**
| Case | Behavior |
|---|---|
| Start/destination not found | field-specific message, no routing |
| Start ≈ destination (< ~150 m) | notice, point to the radius search |
| Routing service down/timeout | straight-line fallback + a visible notice |
| Route leaves Karlsruhe | only Karlsruhe construction sites appear (no error) |
| No construction site on the route | positive empty state |
| `localStorage` unavailable | per session, persistence off |

**Accessibility:** mode/profile choice with `role=group`/`aria-pressed`,
visible focus; banner `aria-live`; respect `prefers-reduced-motion` (no
animated `fitBounds`); route/buffer as an SVG layer (works without tiles).

**Test plan:** `scripts/test-geo.mjs` (in `npm test`): point-to-segment
distance against ground truth, corridor boolean at the buffer edge,
`distanceAlongRoute` monotonicity, the straight-line special case. Browser
smoke test (Playwright pattern, intercept tiles): route layer + filtered
list + banner + fallback path.

**Docs/backlog impact:** PRD (tighten the non-goal, feature scope), README
("Mein Arbeitsweg" section), [`BACKLOG.md`](../BACKLOG.md) #19
(public-transit routing).

## Definition of Done
- Start+destination+profile yield a buffered route; construction sites
  along the route in travel order; banner correct (including X=0).
- Straight-line fallback kicks in on a routing failure, with a visible
  notice.
- Route + profile + route geometry persisted; auto-load without re-routing.
- `src/lib/geo.js` DOM-/network-/dependency-free; `scripts/test-geo.mjs`
  green in `npm test`.
- **Privacy notice kept up to date** ([`datenschutz.html`](../../datenschutz.html), from
  [A-4](./A-4-impressum-datenschutz.md)): A-1 brings `localStorage`
  (key `bauwatch.arbeitsweg`) **and** another third-party service
  (FOSSGIS OSRM, `routing.openstreetmap.de`). Both must appear there —
  the claim "no own storage" is then no longer true, and the routing
  service belongs in the data-flow table. This isn't optional busywork:
  `scripts/test-rechtstexte.mjs` checks both directions mechanically,
  `npm test` goes red without the text update.
- Accessibility considered; PRD/README/BACKLOG updated.

## Implementation steps
1. `src/lib/geo.js` + `scripts/test-geo.mjs`, wire into `npm test`.
2. Corridor branch in `currentFiltered()`.
3. Commute UI (mode switch, start/destination, profile, route layer,
   banner).
4. Routing fetch + straight-line fallback.
5. Persistence + auto-load.
6. Accessibility polish, browser smoke test.
7. Update docs/backlog.
