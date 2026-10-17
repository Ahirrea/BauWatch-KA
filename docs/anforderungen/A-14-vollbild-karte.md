# A-14 Full-screen map: the interface rebuilt as a map app shell

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want the map to fill the screen and
everything else to sit on top of it, so that the whole screen answers "where is
construction, and does it affect me?", not a box between controls.

**Refined on:** 2026-10-17
**Constrained by:** [ADR-001](../adr/ADR-001-statisches-hosting.md) (static,
no build step) · [ADR-002](../adr/ADR-002-mehrseitige-auslieferung.md)
(multi-page delivery, `SHELL`) ·
[ADR-003](../adr/ADR-003-sprachumschalter-localstorage.md) /
[ADR-004](../adr/ADR-004-farbschema-zweiter-localstorage-schluessel.md)
(nothing new is stored) · **[ADR-005](../adr/ADR-005-neuaufbau-oberflaeche.md)**
(new: the interface is rebuilt, the foundation stays)
**Supersedes:** [A-13](./A-13-kartenfokus-kleine-screens.md)/E1–E5 ·
[A-6](./A-6-was-ist-neu-feed.md)/E1 · [A-7](./A-7-baustellenflaechen.md)/E4
(mechanism only) · [A-11](./A-11-auswahl-ohne-zoom.md)/E2 and E5 (in part).
Details are under *Superseded decisions*.
**Works with:** [A-15](./A-15-statistik.md) (the statistics tab's content)
**Target branch:** `ccr-0fb3ea8f-ywo45b`, the branch assigned to the
refinement session. A branch name is not a green light.

## Why now, and what the prototype measured

The idea's originator asked to "set the project up anew" and named two
changes: the map over the whole screen, and statistics.
[ADR-005](../adr/ADR-005-neuaufbau-oberflaeche.md) records the scope decision:
the interface is rebuilt and the foundation stays. This file specifies the
interface. The statistics content is [A-15](./A-15-statistik.md).

During refinement a click prototype was built in the scratchpad (not
committed). It uses the real data, the real `src/lib/` modules and real OSM
tiles. Measured against today's page with `getBoundingClientRect()`:

| Viewport | Today: map share of the first screen | Prototype: map not covered by any chrome (sheet collapsed) |
|---|---|---|
| 360 × 640 | 50 % (`#map` starts at 268 px, 352 px tall) | 72 % |
| 375 × 667 | 50 % | 73 % |
| 414 × 860 | 51 % | 79 % |
| 1280 × 800 | 35 % (a 691 × 560 box) | 67 % (all but the 412 px panel) |

"Not covered" excludes the floating search bar (60 px) and the collapsed sheet
(122 px). The map canvas runs under both and covers 100 % of the viewport.

A second measurement shaped [E5](#decisions-with-rationale). With A-12's
three filter groups stacked as they are today, the half-open sheet shows **no
complete list entry** at 360 × 640 or 375 × 667: the stacked block is
209–245 px tall, and the first entry starts below the screen edge. At
414 × 860 it shows one. With the three groups in one horizontally scrolling
row, which is 38 px tall, it shows 1, 1 and 2.

The prototype screenshots (mobile collapsed/half/statistics, dark mode,
desktop light/dark) were sent to the idea's originator with this refinement.

## Touchpoints in the code

**Rebuilt:**
- **`index.html`, body.** New structure: the panel (title, search bar, status
  line, sheet handle, tabs, tab panels), the map, a static credits footer and
  the menu dialog.
- **`index.html`, head.** Unchanged except for `viewport-fit=cover` and the
  stylesheet links. That keeps the manifest link, the `theme-color` pair with
  `data-scheme`, the apple-touch-icon, and the inline theme script *before*
  the stylesheet (`test-theme.mjs` checks the order).
- **`src/app.js`** (1,068 lines, one module) becomes an entry module plus
  feature modules ([E11](#decisions-with-rationale)).
- **`src/styles.css`** keeps tokens, base and text-page rules. The app-shell
  rules move to a new `src/shell.css` ([E12](#decisions-with-rationale)).

**Carried over with unchanged logic (moved, not re-derived):**
- the filter predicates and the two-set render, `filteredBase()` /
  `applyAmpel()` (A-12/E3);
- `popupHtml()` and `listItemHtml()`;
- area rendering and the hover/selection tiers (A-7, A-9), including the
  `setHoverKey(null)` teardown in `render()`, the `(hover: hover)` gate and the
  ungated focus path;
- `selectFeature()` (A-11), plus chrome padding ([E9](#decisions-with-rationale));
- the language and colour-scheme logic (A-5, A-8), including "`system` stores
  nothing";
- the radius search with its offline guard (A-3);
- `loadData()` with the `X-Bauwatch-Cache` offline marker;
- the changelog rendering with its read-side filter (#28);
- service-worker registration and the update banner (A-3).

**New:**
- the sheet/panel controller: three states, tap, drag and keyboard;
- tabs, the menu dialog, and the collapse control for the desktop panel;
- chrome insets for the popup's autoPan;
- map colours as CSS classes bound to tokens, and a tile-pane filter token.

**Unchanged:**
- `src/lib/*`. There is no semantic change; `i18n.js` gains and loses UI
  strings.
- The pipeline and the data artifacts.
- `sw.js`'s strategy; only `SHELL` and `CACHE_SHELL` change.
- `impressum.html`, `datenschutz.html`, `manifest.webmanifest` and the icons.

**Tests whose layout assumptions change** (from a full inventory of the UI
guards; the invariants stay, per ADR-005):

| Test | Today | Then |
|---|---|---|
| `test-attribution.mjs` | "JS never writes into `#attribution`" and "`el('attribution-hinweis')` is used" read only `src/app.js`, tied to the `el('…')` helper | Scan every `src/**/*.js` file and catch any write form (`textContent`, `innerHTML`, `replaceChildren`, `append`, `insertAdjacentHTML`). |
| `test-pwa.mjs` | SW registration, `X-Bauwatch-Cache` and "no `navigator.onLine` in `loadData`" read only `src/app.js`; the `SHELL` import check follows only `app.js`'s own imports | Follow the module graph recursively from `src/app.js`. A missing marker (function or section comment) fails instead of yielding an empty slice that passes silently. |
| `test-theme.mjs` | Toggle markup by shape: `div[data-theme-toggle]` > `div` > three icon buttons with `aria-label`, `title` and an `aria-hidden` glyph | Values equal `THEMES`, `system` comes first and is pressed, `aria-pressed` is present and every button has an accessible name ([E6](#decisions-with-rationale)). The constants are found wherever the module graph defines them. |
| `test-changelog-feed.mjs` | `import … from './lib/changelog.js'` and `changelogEntries =` in `src/app.js` | The same assertions on the module that renders "Neu". The "no second copy of `GENERIC_CHANGE_NOTE`" check covers every module. |
| `test-rechtstexte.mjs` | The legal links must be in the *first* `<footer>` of `index.html` | Unchanged: the credits footer ([E7](#decisions-with-rationale)) is that first footer. |
| `test-stats.mjs` | `<div class="filter-group" … data-filter="restdauer">` with values `alle, 7, 30` | Unchanged: the markup keeps that shape ([E5](#decisions-with-rationale)). |
| `test-i18n.mjs` | Every `data-i18n` and `data-i18n-attr` key exists in DE and EN | Unchanged mechanism, with new keys. |

The inventory also found that JS lookups of the form `STRINGS[lang].key` /
`s.key` are unchecked (a typo becomes `undefined` at runtime) and that CI
does not run `npm test` at all. The first is optional while the modules are
being touched anyway. The second is [`BACKLOG.md` #36](../BACKLOG.md),
recommended before the rebuild starts.

## Tension with non-goals — and resolution

1. **A-13 declined exactly this.** Its non-scope reads: *"A full-height 'app
   shell' … measured at 58 %, i.e. 3 points for a structural rewrite of the
   page's scroll model."* That number answered A-13's question: how much
   *more map on the first screen* a layout move buys. The question here is a
   different one: the map as the *base layer of the whole app*, which is a
   product decision of the idea's originator. A-13 stays 🏁 done and is not
   rewritten; its layout decisions are superseded (see below).
2. **The licence and the legal notice may not depend on scrolling to a footer
   that no longer exists.** The CC-BY attribution must stay static and
   word-identical in the served HTML (`test-attribution.mjs`). The legal
   notice must stay *"leicht erkennbar, unmittelbar erreichbar und ständig
   verfügbar"* (§ 5 DDG). Resolved by [E7](#decisions-with-rationale): one
   static `<footer>` on the map carries the attribution, the OSM credit and
   both legal links. It is visible in the default state at every size,
   without JavaScript and without a tap.
3. **The always-light-tiles premise.** `AMPEL_COLOR` keeps `teil: #f08a00`
   because markers sit on OSM tiles that are always light (#32). CLAUDE.md
   says not to "sync" the map and dot colours "in either direction".
   [E8](#decisions-with-rationale) darkens the tiles in the dark scheme, so
   there the premise stops holding. Resolution:
   - The colour *meaning* stays single-sourced (A-7/E4).
   - The *values* move from the JS constant into tokens with a light and a
     dark value.
   - The light values are exactly today's `AMPEL_COLOR`, so #32's light-mode
     divergence between dot and marker stays.
   - The dark values must reach ≥ 3:1 against the darkened tiles, and Teil
     must stay distinguishable from Voll.
   - The CLAUDE.md pitfall is rewritten in the same change.
4. **A naive bottom sheet is an accessibility trap.** Resolved by
   [E2](#decisions-with-rationale), [E3](#decisions-with-rationale) and the
   accessibility section:
   - Dragging needs a single-pointer alternative (WCAG 2.5.7): the handle is
     a button.
   - Keyboard focus must never land in an off-screen part of the sheet
     (2.4.11): focus entering a collapsed sheet opens it.
   - The reading order must stay meaningful (1.3.2): one DOM for both
     layouts.
   - Motion follows `prefers-reduced-motion`.
5. **No new stored state (ADR-003/004).** ADR-004's category would permit an
   anonymous display preference such as "sheet half open". Nothing here needs
   to survive a reload, and storing it would add a privacy-notice entry for no
   user benefit. Nothing is persisted ([E10](#decisions-with-rationale)).
6. **ADR-001: no build step, no framework.** The rebuild stays plain ES
   modules. The module split ([E11](#decisions-with-rationale)) adds files to
   `SHELL` and nothing else.
7. **A-11: selection never moves the camera.** This is kept. The map is now
   partly covered, so the popup's autoPan needs padding for the chrome
   ([E9](#decisions-with-rationale)). That pan is A-11's own mechanism, not a
   new camera move. The one new movement on selection belongs to the *sheet*
   (full → half), not to the map.
8. **"The 30-second core loop must not turn into a dashboard"** (A-10,
   tension 2). Statistics get their own tab (A-15). The default view stays map
   plus list.
9. **The feed's "no interaction with map or list" (A-6/E5)** is kept. The feed
   becomes a tab, still without filters or map links.

## Decisions (with rationale)

**E1 — The map is the base layer and fills the viewport; everything else
floats above it.** *Decided by the idea's originator.* `#map` is
`position: fixed; inset: 0`, and the page itself never scrolls
(`body { overflow: hidden }`); only the panel body scrolls. *Discarded:* a
taller map box inside a still-scrolling page (A-13's measured 58 % variant).
It keeps exactly the document model the originator wants to leave.

**E2 — On a phone, a bottom sheet with three states; on desktop, a floating
panel on the left.** *Decided by the idea's originator*, against a
map/list switch.
- **Collapsed:** only the head shows: title, count, data stand and tabs
  (122 px measured).
- **Half:** 56 % of the dynamic viewport height.
- **Full:** up to 8 px below the search bar.
- **Short screens:** below 500 px of height (landscape phones) there are only
  two states, collapsed and full.
- **Desktop (≥ 900 px, today's breakpoint):** the same element is a panel
  400 px wide, 12 px from the top, left and bottom edges.
*Discarded:* a map/list switch. It is simpler and robust, but map and list are
never visible together, and the synchronized list has been a core feature
since #7.

**E3 — One panel element for both layouts; the search bar moves by CSS, not by
DOM.** The sheet and the side panel are the same element. On a phone, the
search bar inside it is lifted to the top of the screen with
`position: fixed`. **Consequence: the sheet animates its `height`, never
`transform`.** A transformed ancestor would become the containing block of the
fixed search bar and drag it along with the sheet. *Discarded:*
- two DOM copies, one per breakpoint (duplicate IDs, two focus orders, double
  i18n wiring);
- a transform-animated sheet. It is smoother on very low-end phones, but it
  forces the search bar out of the panel, which reorders the DOM on desktop.

**E4 — Tabs in the panel: Liste · Statistik · Neu.** "Was ist neu?" moves from
a modal dialog into the "Neu" tab, which supersedes A-6/E1. That decision's
reason, "the vertically tight header gets no further row" (#23), no longer
exists. A-6/E2–E7 stay: 30 days, no personalization, the language boundary,
the read-side filter and the data-path handling.
- The tabs follow the WAI-ARIA tabs pattern: roving `tabindex` and the arrow
  keys.
- Tapping a tab while the sheet is collapsed opens the sheet to half.
- The active tab is not stored.
- If A-14 ships before A-15, it ships two tabs. There is never an empty
  "Statistik" tab.

**E5 — Filters: A-12's controls and semantics stay, arranged anew.**
*Recommended from the measurement above; confirm with the green light.*

What stays:
- the same three groups and the same buttons;
- "Alle" as the reset (A-12/E4);
- the facet counts in the Sperrgrad buttons, counted over the set without the
  Sperrgrad filter (A-12/E2, E3);
- the 7/30-day steps (A-12/E5);
- the `class="filter-group" … data-filter="…"` markup.

What changes:
- **(a) Sperrgrad moves first.** It carries the numbers and is the most used
  axis.
- **(b) On a phone, the three groups share one horizontally scrolling row**
  with inline labels: 38 px instead of 209–245 px. That is the difference
  between zero and one visible list entry in the half sheet at 375 × 667. A
  fade at the right edge says there is more.
- **(c) On desktop they stay stacked**, as today.

The filters open the Liste tab and scroll away with the list. *Discarded:*
- toggle chips without "Alle": they re-open A-12/E4 for no measured gain;
- filters behind a "Filter" button: that hides A-12's counts behind a tap,
  which was A-13/E1's reason against it and still holds;
- filters in the always-visible head: that makes the collapsed sheet ~40 px
  taller on every screen.

**E6 — A menu (☰) holds settings and background information; the data stand
stays in sight.** A `<dialog>` slides in from the left (full height, at most
360 px wide), opened from the search bar's ☰ button. It holds:
- language: A-5's "Deutsch | English";
- colour scheme: A-8's three values, now with visible labels "System · Hell ·
  Dunkel". The menu has room for them; the icon-only form existed to save
  header width.
- the data-stand explanation ("automatisch alle 4 h geprüft …");
- the disclaimer with "Beschilderung vor Ort", which `test-rechtstexte.mjs`
  requires in `index.html`;
- links: Impressum, Datenschutz, Änderungsverlauf, Quellcode.

The data stand itself ("Stand 17.10.2026, 12:05", plus the offline marker)
sits in the panel head and is visible in every sheet state. The closed dialog
is hidden by the UA rule only: `display` is set under `[open]` and nowhere
else (CLAUDE.md's `<dialog>` pitfall). *Discarded:*
- settings as a fourth tab: settings are not content, and four tabs crowd
  360 px;
- toggles in the search bar: there is no room at 360 px.

**E7 — Attribution, OSM credit and legal links form one static `<footer>` on
the map.** It sits bottom right, just above the collapsed sheet on a phone and
at the bottom edge on desktop. It contains:
- `<p id="attribution">`, word-identical to `ATTRIBUTION` in
  `scripts/build-data.mjs` and holding nothing else, because
  `test-attribution.mjs` compares the whole text;
- a separate OSM credit line;
- "Impressum · Datenschutz";
- the existing `#attribution-hinweis` for the sample-data notice.

Leaflet's own attribution control is switched off. Its content moves into the
static credit, which no longer depends on JavaScript; that is also strictly
better for OSM's attribution requirement. This footer is the first `<footer>`
in `index.html`, so the footer check in `test-rechtstexte.mjs` keeps its
meaning. The prototype measured 2 lines at 414 px; 3 at 360 px are expected,
to be measured. *Discarded:*
- attribution only in the menu: static, but hidden until opened. A licence
  condition should be visible without interaction.
- attribution in the sheet head: +30 px on every collapsed sheet.

**E8 — Dark map: the tiles are darkened by a CSS filter, and the map colours
become tokens.** *"Dark map" was decided by the idea's originator; the
technique is recommended.*
- **Tiles.** `.leaflet-tile-pane { filter: var(--tile-filter) }`, where the
  token is `none` in light mode and an invert/hue-rotate recipe in both dark
  palette blocks. There is no new tile provider and no new host, so
  `datenschutz.html` stays unchanged.
- **Map colours.** Markers, areas and the search circle take their colour from
  CSS classes (`m-voll`, `m-teil`, `m-gering`, search) bound to new tokens
  `--map-voll`, `--map-teil`, `--map-gering` and `--map-search`. In SVG, CSS
  `fill`/`stroke` override Leaflet's presentation attributes, while A-9's
  weights and opacities stay attributes set through `setStyle()`.
- **Values.** The light values are exactly today's `AMPEL_COLOR` and search
  colour. The prototype's dark values are the dark dot tokens (`#ff6a5e`,
  `#ffb02e`, `#5fce88`, search `#8cc0ec`). Their contrast against the
  darkened tiles is computed during implementation (DoD).

Consequences:
- A theme switch recolours the map without a `render()` call, as the rest of
  the page already does (A-8).
- `AMPEL_COLOR` disappears from JS.
- CLAUDE.md's "the map does not follow these tokens" pitfall is rewritten.

*Discarded:*
- a dark tile provider (CARTO dark and the like): a new third-party host, new
  terms of use and a privacy-notice change;
- light tiles in dark mode: a bright full-screen map would dominate a dark
  interface, which is why the originator asked for this.

**E9 — Selection: A-11 stays; autoPan keeps clear of the chrome; a full sheet
steps down to half.** The popup's autoPan padding is the area the chrome
covers:
- on a phone, the search bar at the top and the sheet plus credits at the
  bottom;
- on desktop, the panel on the left.

The padding is recomputed at each selection, because the sheet height
changes. The prototype showed why the credits strip must be in it: without
it, the selected marker ended up *under* the strip, with the popup visible
and its tip pointing at nothing.

How the sheet reacts:
- Selecting a list entry from a **full** sheet lowers it to half so the popup
  has room. From half or collapsed, the sheet stays where it is.
- Selecting a marker scrolls its list entry into view inside the panel body
  (today's `scrollListItemIntoView()`, now on the panel body).

The zoom never changes (A-11/E1).

**E10 — Nothing new is stored.** The sheet state, the active tab and the
desktop collapse reset on every load: sheet collapsed, Liste tab, panel open.
No `localStorage` key, no privacy-notice change.

**E11 — Code: `src/app.js` stays the entry module and imports feature
modules; the tests follow the module graph.** The proposed split (names are
indicative):

| Module | Responsibility |
|---|---|
| `src/app.js` | boot, state, render orchestration |
| `src/ui/map.js` | Leaflet, layers, tiers, selection |
| `src/ui/panel.js` | sheet/panel and tabs |
| `src/ui/list.js` | the list |
| `src/ui/filters.js` | the filter groups |
| `src/ui/search.js` | the radius search |
| `src/ui/menu.js` | language, theme and the menu dialog |
| `src/ui/feed.js` | the "Neu" tab |
| `src/ui/pwa.js` | service worker and update banner |

All of them go into `SHELL`. Tests that read only `src/app.js` follow the
import graph instead (see *Touchpoints*). *Discarded:*
- one 1,500-line module: cheapest for the tests, worst for the next reader;
- UI modules under `src/lib/`: `src/lib/` is DOM-free by contract.

**E12 — CSS: `src/styles.css` keeps tokens, base and text-page rules; the
shell goes into `src/shell.css`.** The legal pages link `src/styles.css` and
depend on its `.textseite*` rules, which no test reads. Rewriting one shared
file could drop those rules unnoticed; the split makes the legal pages
structurally independent of the shell.
- `test-theme.mjs` keeps reading the tokens from `src/styles.css`.
- New tokens (E8, `--float-shadow`, …) go into all three palette blocks:
  light, system dark and chosen dark. The theme test enforces dark parity.

**E13 — The initial view centres Karlsruhe in the uncovered map.** Centre and
zoom stay as today (Marktplatz, 13). On desktop the view is shifted by half
the panel width; without the shift, the city centre sits 218 px off-centre,
next to the panel. This amends A-11/E5 ("the other three `setView()` calls
stay exactly as they are") for the initial call only. The radius-search and
reset views stay.

**E14 — The desktop panel is collapsible.** A button in the panel head hides
the panel, and the map then shows in full. A floating "Liste" button brings
the panel back. Focus moves to whichever button is now visible. The state is
not stored (E10). Phones have no equivalent: the collapsed sheet is the
minimum.

**E15 — One release, no parallel v2 path.** This follows ADR-005. The update
banner delivers the new shell to installed clients after one `CACHE_SHELL`
bump. Before/after screenshots are part of the result report.

**E16 — No further ADR.** ADR-005 covers the rebuild. Nothing here adds
persistence, a host or a data artifact.

## Superseded decisions

| Decision | Was | Now | Why |
|---|---|---|---|
| A-13/E1–E5 | filter row between map and list; header spacing for the first-screen budget | no page scroll; filters in the Liste tab; the header becomes the panel head | the page model they optimised is replaced (E1) |
| A-6/E1 | feed in a modal dialog | the "Neu" tab | the space argument (#23) no longer applies (E4) |
| A-7/E4 (mechanism only) | colours from `AMPEL_COLOR` in `app.js` | colours from tokens via CSS classes; meaning unchanged | dark tiles need a dark colour set (E8) |
| A-11/E2 (in part) | autoPan with Leaflet's default padding | autoPan padded by the chrome | the map is partly covered (E9) |
| A-11/E5 (in part) | initial `setView` unchanged | initial view shifted on desktop | the panel covers the left 412 px (E13) |
| A-8, toggle form | icon-only ◐ ☀ ☾ | labelled buttons in the menu; same values, same storage | the menu has room (E6) |
| `BACKLOG.md` #23, #33, #35 | layout fixes for the document page | moot | the page they fixed is gone; the entries stay ✅ with a dated note |

Per [process step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement),
A-6, A-7, A-8, A-11 and A-13 are 🏁 done and are not rewritten. This table is
the cross-reference.

## Scope / Non-scope

- **In:**
  - `index.html` restructured (E1–E7), the new `src/shell.css`, and
    `src/styles.css` reduced to tokens, base and text pages, plus the new
    tokens;
  - `src/app.js` split into modules (E11);
  - `src/lib/i18n.js` strings in DE and EN for the handle, tabs, menu,
    collapse and credits, with obsolete keys removed;
  - `sw.js`: `SHELL` and `CACHE_SHELL`;
  - the widened tests (see *Touchpoints*);
  - `CLAUDE.md`, `README.md` and `BACKLOG.md`.
  - **Every existing feature, with unchanged behaviour:**
    - markers and areas with their tiers;
    - popups, the synchronized list and the radius search;
    - the three filters with facet counts;
    - "Was ist neu?";
    - DE/EN and the colour scheme;
    - offline use, the update banner, the data stand and the
      sample-data notice.
- **Out:**
  - statistics content ([A-15](./A-15-statistik.md)), statistics over time
    (A-16), districts (A-17), the commute (A-1) and the feed file (A-2);
  - any change to `src/lib/` semantics, the pipeline, the data artifacts, the
    service-worker strategy or the legal pages' text;
  - new hosts, another map library, vector tiles or marker clustering;
  - geolocation ("locate me"): `test-rechtstexte.mjs` and the privacy notice
    rule it out;
  - visitor analytics, and persistence of any UI state.

## Specification

### UX flow & states

On a phone (< 900 px), collapsed, as prototyped:

```
┌──────────────────────────────┐
│ ☰  Adresse in Karlsruhe …  🔍 │  search bar, fixed at the top (+ safe area)
│                          [+] │  zoom control, top right, below the bar
│                          [−] │
│           K A R T E          │  map canvas under everything
│                              │
│ Datenquelle: … CC-BY 4.0 ·   │  static <footer> (E7), right-aligned
│ Karte © OSM · Impressum · DS │
├───────────── ━━━ ────────────┤  sheet handle (a button)
│ Wo wird gebaut?              │
│ 167 Baustellen  Stand …      │  #list-status (live) + data stand
│ [ Liste ][ Statistik ][ Neu ]│  tabs
└──────────────────────────────┘
```

Half adds the filter row and the start of the list. Full extends the sheet to
just below the search bar.

On desktop (≥ 900 px): the panel holds title, tagline, search bar, status
line, tabs, filters (stacked) and the list. The map fills the rest. The zoom
control sits top right and the credits bottom right.

| State | Behaviour |
|---|---|
| First paint (before `app.js`) | Panel and map container visible with static text; Sperrgrad buttons without numbers (A-12); credits footer visible |
| Loading | `#list-status` "Wird geladen …"; data stand "wird geladen …" |
| Loaded | Counts, list, markers and areas; sheet collapsed |
| Load error | Error text in `#list-status` (as today); the "Neu" tab still works |
| Offline (answered from cache) | The stand line gets "· offline, aus dem Gerätespeicher"; the search is disabled with its hint (A-3) |
| Radius search active | Circle, list sorted by distance, the place named in `#list-status`, a reset (×) in the search bar; `setView(center, 14)` as today (A-11/E5); the sheet does not move |
| Filter changed | Map, list and counts update; the sheet does not move and nothing jumps |
| Selection from the list | Popup with padded autoPan; full → half; entry highlighted |
| Selection from a marker | Popup; entry highlighted and scrolled into view inside the panel body |
| Menu open | Modal from the left; Escape, the backdrop and ✕ close it; focus returns to ☰ |
| Update available | Banner below the search bar on a phone, at the top of the map area on desktop; reload only on click (A-3/E4) |
| Desktop panel collapsed | The map shows in full; a floating "Liste" button sits top left |

**Sheet interaction:**
- **The handle** is a `<button aria-controls="panel-body" aria-expanded>`.
  A press (tap, Enter or Space) cycles collapsed → half → full → collapsed.
  Its accessible name says what the next press does: "Liste aufklappen",
  "Liste ganz aufklappen" or "Liste einklappen".
- **Dragging** on the sheet head (not on its buttons or inputs) resizes the
  sheet live, and on release it snaps to the nearest state. Dragging is never
  the only way to reach a state (WCAG 2.5.7).
- **Scrolling inside the body** never moves the sheet
  (`overscroll-behavior: contain`). Only the head is a drag surface.
- **Keyboard focus** entering the body while the sheet is collapsed opens it
  to half (2.4.11).
- **The collapsed height** is the *measured* height of the head, via a
  `ResizeObserver`, not a constant. A longer status line or the English
  strings grow it by a line instead of clipping.
- **With `prefers-reduced-motion`** the height does not animate.

### Interaction with existing features

- **A-12 (facet counts):** the trap from CLAUDE.md applies unchanged:
  `renderFilterCounts(base)` gets the set without the Sperrgrad filter, never
  `list`. Checked in the browser; `npm test` cannot see it.
- **A-9 (tiers):** the hover wiring only under `(hover: hover)`; the focus path
  ungated; the `render()` teardown kept. Area recolouring by tier stays
  per-child-layer (`_bauwatchTyp`).
- **A-11 (camera):** `getZoom()` is identical before and after any selection.
- **A-7 (areas):** still `interactive: false`. Browser assertions scope to
  `.leaflet-overlay-pane svg path` (CLAUDE.md). With Leaflet's attribution
  control switched off, the three-path flag SVG it carried disappears as
  well.
- **A-6 (feed):** loaded on the first opening of the "Neu" tab, as today on
  the first opening of the dialog.
- **A-5 (language):** every new string exists in DE and EN; dataset text stays
  German; a language switch re-measures the collapsed height.
- **A-8 (colour scheme):** a switch recolours tiles and map through tokens.
  The `theme-color` meta mechanism and the inline no-flash script are
  unchanged.
- **A-3 (PWA):** the shell changes, so `CACHE_SHELL` is bumped and every new
  module and stylesheet goes into `SHELL`.
- **A-4 (legal):** the pages are unchanged and reachable from the credits
  footer and from the menu.

### Data model / persistence

None: no feature property, no storage key, no request.

### External dependencies & fallback

Unchanged: `tile.openstreetmap.org` for tiles (darkened client-side in dark
mode) and `nominatim.openstreetmap.org` for the search. With no new host,
`datenschutz.html` and its host check stay as they are. The tile URL keeps the
bare host; the a/b/c subdomains used for the prototype screenshots are not
used in the app.

### Edge cases & error handling

- **320 × 568 (smallest supported):** search bar 60 px plus collapsed sheet
  ~122 px leaves ~68 % of the map uncovered. The three tabs must fit 320 px in
  both languages ("Liste · Statistik · Neu" / "List · Statistics · New"), and
  the credits may take three lines. To be measured.
- **Landscape phones (height < 500 px):** two sheet states (E2). The search
  bar stays.
- **Large text and 200 % zoom:** the head grows, so the collapsed sheet grows
  with it and nothing is clipped. The map share shrinks; that is accepted.
- **Long status text** (a radius search with a long place name): it wraps, and
  the measured head height follows.
- **No data or load error:** the head shows the error; the tabs keep working.
- **Sample data** (`sample: true`): `#attribution-hinweis` becomes visible in
  the credits footer.
- **iOS safe areas:** `viewport-fit=cover` plus `env(safe-area-inset-*)` on the
  search bar, the sheet and the credits.
- **Browsers without `dvh`:** each `dvh` height is declared after a `vh`
  fallback.
- **Popups near the search bar:** the autoPan top padding covers it (E9).

### Accessibility

- **Landmarks:**
  - `<main>` wraps the panel and the map: the list is the primary accessible
    content, so it must not end up in an `<aside>`.
  - The search form keeps `role="search"`.
  - The credits `<footer>` is top-level, which makes it the `contentinfo`
    landmark.
  - The menu `<dialog>` sits outside `<main>`.
- **Focus order:** skip link → ☰ → search → handle → tabs → tab content → map
  markers → credits links. On a phone the map is a background layer, so its
  place last in the focus order matches its role.
- **Skip link** "Zur Baustellen-Liste springen" targets `#liste`; focusing it
  opens a collapsed sheet.
- **Tabs:** the WAI-ARIA tabs pattern; each tab panel is focusable.
- **Sheet handle:** a button with `aria-expanded`, `aria-controls` and a name
  that describes the next action.
- **Touch targets:** ≥ 44 × 44 px for the handle, tabs, ☰, search, reset and
  collapse.
- **Contrast:** computed, not estimated, in both schemes. Explicit toggle and
  context scheme are tested separately (CLAUDE.md). This covers every new
  text/surface pair and the dark map colours against the darkened tiles: the
  median luminance of a 200 × 200 px area without features, taken from the
  screenshot.
- **Live regions:** `#list-status` and `#search-status` stay
  `role="status"`; the counts are not live (A-10/E4).
- **`forced-colors`:** panel and sheet get a visible border.

### Test plan

- **`npm test` green with the widened guards.** Each widening is proven by
  mutation:
  - a write into `#attribution` from a submodule turns `test-attribution`
    red;
  - a module missing from `SHELL` turns `test-pwa` red;
  - a second copy of `GENERIC_CHANGE_NOTE` in a submodule turns
    `test-changelog-feed` red.

  A widened guard that no longer fails on the defect it exists for is the
  risk ADR-005 names.
- **Browser checks** with Playwright and tiles intercepted (CLAUDE.md
  patterns: the `addInitScript` map handle, list index instead of title
  matching). They run at 414 × 860 and 1280 × 800 in light and dark, plus
  360 × 640 and 320 × 568.
  1. The map canvas covers the viewport, and the uncovered share is at least
     the prototype's (72/73/79/67 %).
  2. Sheet: the handle cycles three states and `aria-expanded` flips; a drag
     snaps; focus into a collapsed body opens it; reduced motion means no
     transition.
  3. Facet counts: toggling Voll/Teil/Gering leaves all three numbers
     unchanged (A-12/E3).
  4. Selection from the list (full → half) and from a marker (entry scrolled
     into view). `getZoom()` is unchanged, and the popup *and its marker* lie
     inside the uncovered area (E9).
  5. Hover tiers on desktop: row hover → `hover`, selection → `selected`, a
     filter change leaves no ghost (A-9).
  6. Theme:
     - In dark mode, the tile pane's `filter` is not `none` and the marker
       fills equal the dark tokens.
     - In light mode, the fills are exactly `#c02626` / `#f08a00` /
       `#197a3d`.
     - An explicit toggle beats the context scheme.
  7. Credits footer: a non-zero box inside the viewport at every size in the
     collapsed state; the `#attribution` text equals the build constant.
  8. Menu:
     - closed state: `display: none` and 0 × 0 (the `<dialog>` pitfall);
     - opening moves focus inside, and Escape returns it to ☰;
     - a language switch re-measures the collapsed sheet.
  9. Offline (same-origin requests aborted): the stand line shows the offline
     marker and the search is disabled.
  10. Update banner end to end: a scratchpad copy with `CACHE_SHELL` bumped
      (CLAUDE.md).
  11. Contrast ratios computed as in the accessibility section and recorded
      in this file.
- **Screenshots:** mobile and desktop × light and dark, plus close-ups and a
  before shot from a `git archive HEAD` checkout, sent with the result
  (CLAUDE.md).

### Docs/backlog impact

- **`CLAUDE.md`:**
  - the client paragraph in "Architecture";
  - the cache-version sentence;
  - the map-colour pitfall rewritten (E8);
  - new pitfalls from implementation: at least "never animate the sheet with
    `transform`" (E3) and "autoPan padding must include the credits strip"
    (E9);
  - the browser-testing notes for sheet states.
- **`README.md`:** the feature list (full-screen map, bottom sheet, tabs).
- **`docs/BACKLOG.md`:** #23, #33 and #35 get a dated "moot since A-14" note,
  updated in the entry *and* the header (CLAUDE.md's "states status twice"
  pitfall). New portal screenshots for #26 become a follow-up task after
  release.
- **`docs/anforderungen/README.md`:** the status of A-14.

## Definition of Done

- The map fills the viewport at every size. The uncovered share is at least
  the prototype's and is measured and recorded.
- The sheet has three states (two below 500 px of height), works by tap, drag
  and keyboard, keeps focus visible and respects reduced motion, all verified
  in the browser.
- Every carried-over behaviour is verified per the test plan: A-12 counts,
  A-11 zoom, A-9 tiers, A-6 tab, A-5 strings, A-8 theme, A-3 offline and
  update.
- Dark map:
  - the tile filter applies in both dark paths;
  - the map colours come from tokens;
  - the light values are identical to today's `AMPEL_COLOR`;
  - the dark values reach ≥ 3:1 against the darkened tiles (computed and
    recorded here).
- The credits footer is static, visible without interaction and holds the
  legal links. `test-attribution` passes with the exact text.
- `npm test` is green, the widened guards are proven by mutation, and no
  guard is weaker than before.
- `src/lib/` is untouched apart from `i18n.js` strings. There is no new host
  and no new storage key, and `datenschutz.html` is unchanged.
- `SHELL` is complete for the new module graph, and `CACHE_SHELL` is bumped.
- Screenshots are sent with the result: 414 and 1280 px × light and dark,
  close-ups, and a before shot.
- Docs are updated per the impact list, and the overview shows 🏁.

## Implementation steps

0. *(Recommended, separate task)* [`BACKLOG.md` #36](../BACKLOG.md): run
   `npm test` in CI, so the rebuild's commits are checked on push.
1. **Widen the guards first, against today's code.** They must stay green.
   Add module-graph scanning to `test-pwa`, `test-attribution`,
   `test-changelog-feed` and `test-theme`, and prove each by mutation. Commit.
2. **Split the CSS without changing the page.** Move the shell rules into
   `src/shell.css` and keep tokens, base and text-page rules in
   `src/styles.css`. The map page must look identical (geometry compared to
   two decimals, per CLAUDE.md), and the legal pages byte-identical in a
   screenshot. Commit.
3. **Split `src/app.js` into modules without changing behaviour:** same
   markup, same page. Run `npm test` and the browser checks against the
   before checkout. Commit. Refactoring under a green suite before the layout
   changes keeps any regression attributable.
4. **New markup and shell CSS:** full-screen map, panel/sheet, search bar,
   tabs, credits footer and menu dialog.
5. **Sheet controller, tabs, menu and desktop collapse.**
6. **Map colours as tokens and the tile filter;** compute the contrast
   ratios.
7. **Selection padding (E9) and the initial view (E13).**
8. **i18n:** add the new strings in DE and EN and remove the obsolete ones.
9. **`sw.js`:** update `SHELL` and bump `CACHE_SHELL`; check offline use and
   the update banner.
10. **Finish:** run the full browser test plan, take the screenshots, update
    the docs and set the status.
