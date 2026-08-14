# A-13 Map focus on small screens: the filter row moves between map and list

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident on a phone, I want the map to be the
thing I see when the page opens, so that "am I affected?" is answered before I
scroll.

**Refined on:** 2026-08-14
**Constrained by:** [ADR-001](../adr/ADR-001-statisches-hosting.md) (static
hosting, no build step — this is plain HTML/CSS). — No new ADR: no data
artifact, no persistence, no external host, no new subsystem, and no JavaScript
at all.
**Continues:** [`BACKLOG.md` #33](../BACKLOG.md) (small-phone layout, 2026-08-08)
— it took the map from 109 px to 220 px on the first screen by tightening
spacing; this requirement finishes the job by changing the order instead.
**Target branch:** not yet assigned

## The finding that started this

Reported from an iPhone SE screenshot: the map is a small box at the bottom of
the first screen. Measured (Edge, OSM tiles intercepted, `7c1588a`):

| Viewport | Header | Search | Filters | `#map` top | Map visible in the first screen |
|---|---|---|---|---|---|
| 375 × 667 (SE) | 150 | 107 | 190 (3 rows) | 447 | **220 px = 33 %** |
| 360 × 640 | 171 | 107 | 190 (3 rows) | 468 | 172 px = 27 % |
| 414 × 896 | 114 | 107 | 190 (3 rows) | 410 | 486 px = 54 % |

`#map` is `55vh` tall throughout — the map is not small, it starts too far
down. 447 px of a 667 px viewport is spent before it begins.

**The filter row costs 190 px because the three groups stand in three rows**,
one under the other: they measure 186 / 304 / 253 px against 343 px of available
width, so they cannot share a line. This is not a defect and not new —
[`BACKLOG.md` #33](../BACKLOG.md) worked on the same block and its sentence
"at 0.85 rem all three groups fit one row from 360 px up" is about each group
fitting one row *internally* (the four-button "Zeitraum" group used to wrap),
not about the three sharing a line. Read quickly it says the opposite, which
cost one round of this refinement; the wording is disambiguated as part of this
work (E7).

**It is not an A-12 regression either.** The checkout before A-12 (`ec7010a`,
with the four-button "Zeitraum" group and A-10's metrics strip) measures
**identically**: `#map top = 447`, three rows, groups 327 / 234 / 253 px. A-12
moved width between two groups and left the total where it was. #33's own
measured result (`558 → 447 px`, visible map `109 → 220 px`) still reproduces
exactly. What #33 could not fix by tightening spacing is the remaining 447 px —
that needs a different order, not smaller paddings.

## Touchpoints in the code

**Checked, not guessed** — against `7c1588a`.

| What | Where | Meaning for this requirement |
|---|---|---|
| The filter section sits **outside** `<main>` | `index.html` L175–215: `<section class="filters">` between `<form class="search">` and `<main class="content">` | This is the whole change on the HTML side: the element moves into `.content`, between `.map-wrap` and `.list-wrap`. Nothing inside it changes. |
| The two columns | `index.html` L218–231: `.content > .map-wrap` + `.list-wrap` | Gains a third child. |
| Mobile stacking is expressed twice over | `src/styles.css` L554–575: `.content { flex-direction: column }`, `.map-wrap { order: 1 }`, `.list-wrap { order: 2 }` | Those two `order` declarations only restate the DOM order. After the move they are not merely redundant but **wrong** — a new child would default to `order: 0` and sort ahead of both. They go. |
| The desktop block was tuned two commits ago | `src/styles.css` L922–960 (`@media (min-width: 900px)`), `--column-height`, `#map { height: 100% }`, `.liste { max-height: none }` | [#35](../BACKLOG.md) made the two columns end flush. The mechanism must survive verbatim (E3); only the container's `display` changes. |
| The small-phone block | `src/styles.css` L871–909 (`@media (max-width: 480px)`) | Where the spacing part of this change lands. Its `.segments button` font drop stays untouched. |
| **No JavaScript depends on where the filters are** | `wireFilters()` walks `.filter-group`; `renderFilterCounts()` addresses `[data-count]`; the only other hits for "filter" in `src/app.js` are `state.filters` (L174, L198, L730), an unrelated name | Verified by search, not assumed. The move needs no `app.js` change, no new i18n key, no new state. |
| Skip link | `index.html` L50 → `#liste` | Still resolves; the list keeps its id and its position at the end. |
| Shell precache version | `CACHE_SHELL = 'bauwatch-shell-v20'` in `sw.js` L25 | `index.html` and `src/styles.css` change → bump to **`v21`**. `SHELL` is unchanged (no file added or removed). |

**Missing (net-new):** nothing. This requirement moves one element and deletes
more CSS than it adds.

## Tension with non-goals — and resolution

1. **A-12/E2 put the facet counts into the closure-severity buttons *so they
   would be seen* — and this pushes them below the fold on a phone.** Named
   because it is the real cost. Resolved by keeping them **on the page and in
   the control**, 65 px below the fold with the group label peeking, rather than
   behind a tap: the discarded disclosure option (E1) would have hidden the same
   numbers behind an interaction. A-12/E3's facet semantics are untouched — what
   changes is scroll position, not what the numbers mean.
2. **#33 already worked this block and is `✅`.** Its DoD ("the map visible on
   the first screen at 375 px") was met in its own terms — 109 px became 220 px.
   This requirement raises the bar from *visible* to *whole*, which is a product
   decision and therefore a requirement rather than a reopened task. #33 stays
   done; only its ambiguous width sentence is disambiguated (E7).
3. **"The 30-second core loop must not gain a control."** Nothing is added. One
   element moves, two `order` declarations are deleted, three spacing values
   shrink. Net controls: **±0**; net focusable elements: **±0**.
4. **DOM order and visual order must not decouple** (WCAG 1.3.2 / 2.4.3).
   The measured CSS-only variant (`display: contents` on `.content` plus
   `order`) reaches the same 55 % but makes the phone the place where tab order
   disagrees with the picture. Resolved by moving the element for real (E2) —
   the mismatch lands on desktop instead, where the whole filter row is visible
   without scrolling.
5. **ADR-001 / no build step.** Plain static HTML and CSS; no tooling, no
   dependency, nothing generated.

## Decisions (with rationale)

**E1 — The filter row moves between map and list; the header keeps its
content.** *Decided by the idea's originator*, from four measured options at
375 × 667 (map visible in the first screen, from 220 px = 33 %):

| Option | Result | Why not |
|---|---|---|
| Filters between map and list | **367 px = 55 %** | chosen |
| Filters collapsed into a disclosure above the map | 367 px = 55 % | needs JS, i18n strings and an open/closed state, and hides A-12's counts behind a tap |
| Filter row compacted in place (group labels visually hidden) | 297 px = 45 % | "7 Tagen" without "ENDET IN" is ambiguous, and all three groups then start with an unlabelled "Alle" |
| Header/search spacing only | 258 px = 39 % | not enough on its own |

The chosen option is also the only one that adds no code: no JavaScript, no
string, no state.

**E2 — The header diet is reduced to spacing; the tagline and the `h1` size
stay.** *Recommended after measurement, confirmed with the green light on
2026-08-14.* The fork was first decided as "spacing + tagline removed + `h1`
1.5 → 1.15 rem", which was correct against the numbers available at that moment.
Measured afterwards, at 375 × 667:

| Header change | `#map` top | Gain |
|---|---|---|
| none | 447 | — |
| tagline hidden | 423 | 24 px |
| `h1` 1.15 rem | 443 | 4 px |
| paddings tightened | 436 | 11 px |
| all three | 409 | 38 px |

The gains are that small because #33 already tightened this block once — the
`≤ 480 px` rules today are `.app-header { padding: .75rem 1rem .4rem }`,
`h1 { 1.3rem }`, `.tagline { .92rem }`, `.search { padding: .5rem 1rem }`. The
table above is a second pass on top of that, and a second pass has little left
to take.

With E1 in place the map starts at 257 px and is **fully visible without any of
this** (257 + 367 = 624 ≤ 667). The tagline's 24 px therefore buys nothing
toward the goal, and it is the product's one-line framing ("Offene Baustellen in
Karlsruhe — betrifft mich das?"), i.e. the sentence that says what the page is
for. What the spacing part does buy is **margin**: `#map` is `55vh`, so the map
fits the first screen exactly as long as everything above it stays under 45 % of
the viewport height — 300 px at 667, but only 255 px at 568 (the original SE /
a phone with browser chrome). The 15 px from paddings and `h1` are kept for that
reason and for nothing else. *Discarded:* the full diet (hides the framing to
buy headroom that E1 already delivers); no spacing change at all (leaves the
shortest viewports with no margin).

**E3 — Desktop keeps its geometry; only `.content`'s `display` changes.**
`.content` becomes a grid at ≥ 900 px with `grid-template-areas: "filters
filters" / "map list"`; `--column-height`, `#map { height: 100% }` and
`.liste { max-height: none }` stay exactly as [#35](../BACKLOG.md) left them.
Measured against the unmodified page at 900 / 1280 / 1440 px: map and list
identical in position and width (± 1 px from the row gap), **columns still end
flush**, no horizontal overflow. *Discarded:* keeping `.content` a flex row and
adding `flex-wrap` — with `flex: 1 1 60%` and `1 1 40%` plus a gap, the two
columns would break onto separate lines the moment wrapping is allowed; the bug
would appear only on desktop, which is not where this requirement is looking.

**E4 — Mobile needs no media query for the order at all.** After the move the
DOM says search → map → filters → list, and the base (mobile-first) rules simply
stop overriding it: `.map-wrap { order: 1 }` and `.list-wrap { order: 2 }` are
deleted. The desktop grid does the one reordering that remains. This is why the
change subtracts CSS instead of adding a breakpoint.

**E5 — Nothing collapses, nothing is hidden, no count vanishes.** The three
groups keep their labels, their buttons and A-12's numbers, fully expanded. A
control below the fold is a control you have to scroll to; a collapsed one is a
control you have to discover. The group label "ENDET IN" and the top of its
button row remain visible at the fold as the affordance that there is more.
**Measured after implementation:** 44 px at 375 × 667 (DE), 23 px (EN), 11 px at
360 × 640 — the first pass left only 4 px at 360 × 640, because the last thing
between the map's bottom edge and the label is `.content`'s `gap`. It is
therefore 0.6 rem instead of 1 rem below 480 px, which is the one rule this
requirement added that was not in its own implementation steps. This keeps
A-12/E2 and the superseded A-10/E6 ("a control may not vanish when its count
reaches 0") intact by construction.

**E6 — No JavaScript, no i18n key, no storage, no data change.** Verified by
search (`src/app.js` addresses the filters only through `.filter-group` and
`[data-count]`). Consequence for review: a diff touching `src/app.js`,
`src/lib/`, `src/lib/i18n.js` or anything under `data/` is out of scope for this
requirement.

**E7 — `BACKLOG.md` #33 is disambiguated in place, not reopened and not
declared wrong.** *Decided by the idea's originator* (the fork was put as
"correct #33" on the assumption that its width claim was false; the
re-measurement showed it is ambiguous, not false, so the action shrank from a
correction to a clarification, confirmed with the green light). Its entry gets a
dated note saying that "all three groups fit one row" means *per group*, that
the three groups have never shared a line at phone width, and that A-13 takes
the vertical budget from here. The second copy of that sentence lives in
`src/styles.css`'s comment above the `≤ 480 px` block and is clarified with the
code change; the third is in
[A-12](./A-12-filterzeile-restdauer-kennzahlen.md)'s touchpoint table and is
**left alone** — a `🏁 done` requirement is not rewritten.
The checkbox stays `✅` and the header's
`**Status:**` line and summary are updated in the same pass, per `CLAUDE.md`'s
"states status twice" pitfall. *Discarded:* flipping #33 back to `⬜` (its own
scope really is done); leaving it untouched (a sentence that reads as its own
opposite is exactly the trap the docs exist to remove — it already cost one
round here).

**E8 — No ADR.** No architectural decision: no persistence, no external host, no
new artifact, no change to the pipeline or to the delivery model. ADR-002
(multi-page delivery) is untouched — no page is added.

## Scope / Non-scope

- **In:**
  - `index.html`: `<section class="filters">` moves inside `<main class="content">`,
    between `.map-wrap` and `.list-wrap`.
  - `src/styles.css`: `order` declarations on `.map-wrap`/`.list-wrap` deleted;
    `.filters` loses its own `max-width`/`margin`/horizontal padding (it now
    sits inside `.content`'s); the desktop block's `.content` becomes a grid with
    three areas; the `≤ 480 px` block gains the header/search spacing values.
  - `sw.js`: `CACHE_SHELL` v20 → v21.
  - Docs: `BACKLOG.md` #33 clarification (entry **and** header), this file, the
    status row in `docs/anforderungen/README.md`, `CLAUDE.md`'s cache-version
    sentence and its copy of the same #33 sentence.
- **Out:**
  - Any JavaScript change, any i18n string, any new control or state.
  - Making the filter row itself shorter (hiding group labels, a horizontally
    scrolling row, a disclosure) — measured and discarded in E1; if 55 % ever
    proves not to be enough, that is a separate question with fresh evidence.
  - A full-height "app shell" (`100dvh`, map filling the remaining viewport,
    list only reachable by scrolling inside it). Measured at 58 %, i.e. 3 points
    for a structural rewrite of the page's scroll model.
  - `#map`'s `55vh` / `min-height: 320px` — unchanged. This requirement moves
    the map up, it does not make it taller.
  - Anything about markers, areas, popups, selection/hover (A-7/A-9), the radius
    search, the "Was ist neu?" feed, or the data pipeline.
  - [A-11](./A-11-auswahl-ohne-zoom.md) (`✅ ready`, selection without a map
    zoom) — untouched and independent; it changes camera behaviour, this changes
    where the map sits.

## Specification

### UX flow & states

Page order on a phone (< 900 px) becomes:

```
Was ist neu?  ◐ ☀ ☾   Deutsch | English
Wo wird gebaut?
Offene Baustellen in Karlsruhe — betrifft mich das?     ← stays (E2)
[ Adresse in Karlsruhe (z. B. Kaiserstraße 1) ]
[ Umkreis suchen ]
┌──────────────────────────────────────────┐
│                  KARTE                   │  55vh, fully visible
└──────────────────────────────────────────┘
ENDET IN         ← at the fold
SPERRGRAD · VERKEHRSMITTEL
177 Baustellen
Liste …
```

On desktop (≥ 900 px) the picture is unchanged: filter row full width, map left,
list right, both columns ending flush.

| State | Behaviour |
|---|---|
| Loading | unchanged; the map box occupies its space from the first paint (`55vh`, no reflow when data arrives) |
| Data loaded | filter row sits below the map, counts as A-12 defines them |
| Filter clicked | map, list and counts update exactly as today; **the page must not scroll** — no `scrollIntoView`, no focus move (none exists today, and none is added) |
| Radius search active | unchanged; the result list stays below the filter row |
| Empty result | unchanged message in `#list-status`, which now sits below the filter row |
| Offline (A-3) | unchanged |
| Desktop | unchanged |

### Interaction with existing features

- **A-12 (facet counts):** unchanged semantics; different scroll position. The
  one thing to check in the browser is that toggling a severity button still
  leaves all three numbers untouched (A-12/E3) — the assertion that regresses
  silently.
- **A-8 (colour scheme) / A-5 (language):** no token, no string. `test-theme.mjs`
  and `test-i18n.mjs` have nothing new to compare, which is a result to verify
  via `npm test`, not to assume.
- **A-3 (PWA):** shell files change → `CACHE_SHELL` v21. `SHELL` unchanged.
- **A-6 ("Was ist neu?"):** untouched — but the dialog's **closed** state is
  re-checked anyway, per `CLAUDE.md`'s `<dialog>` pitfall, because this change
  touches the layout the closed dialog would otherwise leak into.
- **Leaflet:** `#map` changes position, not size. No `invalidateSize()` is
  needed (the box's dimensions are unchanged and the map is initialised after
  layout), but the first-paint tile grid is verified in the browser rather than
  reasoned about.

### Data model / persistence

None. No feature property, no `localStorage` key, no request, no host.
`datenschutz.html` and `scripts/test-rechtstexte.mjs` need no change.

### External dependencies & fallback

None.

### Edge cases & error handling

- **Very short viewports (568 px height, e.g. the first-generation SE or a phone
  with visible browser chrome):** at 375 px width the chrome measures 247 px
  against a 255 px budget — the map fits. **Measured after implementation:** at
  **320 × 568** it does not, and the estimate in this paragraph was too
  optimistic. There the header wraps and the chrome comes to 268 px, so 300 of
  the map's 312 px are on the first screen and 12 px are clipped. That is the
  one combination in the tested matrix where "the whole map" is not literally
  true — and it still goes from **70 px to 300 px** of visible map. Below that
  it is clipped at the bottom, exactly as any `55vh` box would be.
- **320 px width:** the filter groups wrap further; no horizontal overflow
  (#33's gap-based separators handle both axes). Measured in DE and EN.
- **900 px exactly** (the breakpoint): the grid takes over; measured.
- **Landscape phone:** `55vh` of a 375 px height is 206 px, and the chrome above
  is unchanged — the map is smaller but still the first thing after the search.
  No special case is added.
- **No JavaScript:** the page's order is now DOM order, so the layout is correct
  without JS as well (it was not before: nothing depended on JS for order, but
  the map was equally far down).

### Accessibility

- **Tab order becomes search → map → filters → list on a phone, and matches the
  visual order** — the point of E2. On desktop the visual order (filters, then
  the two columns) differs from the DOM order (map, filters, list): the filter
  row is reachable one stop later than it looks, with every control visible
  without scrolling. Named here so it is a recorded trade, not an oversight.
- Landmarks: `<section class="filters" aria-label="Filter">` becomes a region
  nested inside `<main>` instead of a sibling. Both are valid; verified in the
  accessibility tree that the region keeps its name.
- No focusable element is added, removed, or reordered relative to its
  neighbours inside a group.
- `#list-status`'s live-region behaviour and announced text are unchanged.
- No animation, no `prefers-reduced-motion` surface.
- Contrast is untouched (no colour changes) but computed anyway in all three
  theme states, because the header spacing block is edited.

### Test plan

1. **`npm test`** green, unchanged. A red `test-pwa.mjs` means the
   `CACHE_SHELL` bump or a `SHELL` entry is wrong; a red `test-i18n.mjs`,
   `test-theme.mjs` or `test-rechtstexte.mjs` means something was touched that
   E6 says is out of scope.
2. **Browser check (Playwright, tiles intercepted via `**tile.openstreetmap.org/**` —
   note the missing subdomain, per `CLAUDE.md`), against a `git archive HEAD`
   checkout served on a second port:**
   - `#map`'s top edge and the visible map height at 320 / 360 / 375 / 390 / 414
     / 430 px width and 568 / 640 / 667 / 896 px height, in **DE and EN**;
     reported as numbers, before and after.
   - the map fully within the first screen at 375 × 667 and 360 × 640;
   - the filter row's top edge below the map and its label visible at the fold;
   - no horizontal overflow at any of those widths, in both languages;
   - the DOM order of `.search`, `#map`, `.filters`, `#liste` and the tab order
     through them agree on mobile;
   - **desktop unchanged:** at 900 / 1280 / 1440 px, `#map` and `.liste`
     identical in position and width to the `before/` checkout (± 1 px) and the
     two columns still ending flush (`.map-wrap.bottom === .list-wrap.bottom`);
   - **A-12/E3 still holds:** toggling `Voll` leaves all three counts unchanged
     while `#liste li` drops to the `Voll` count;
   - **the closed `<dialog>`** still computes `display: none` with a 0 × 0 client
     rect, and the desktop rendering matches the `before/` checkout;

   **Revised (2026-08-14, after implementation):** this bullet originally
   demanded a **byte-identical** desktop screenshot. That criterion is wrong for
   this change and cannot be met. Measured: every box is identical to 0.01 px
   (`.filters` 214.17, `#map` 277.89/560.00, `.list-wrap` 277.89/560.00,
   `.liste` 317.08/520.81, before and after), yet 5601 of 4 096 000 pixels
   differ at 1280 × 800 — all of them **glyph edges inside the list text**, none
   in the map, the filter row or any control, and the two crops are visually
   indistinguishable. A control run (the same page screenshotted twice) diffs to
   **0** pixels, so this is deterministic, not noise: moving `.filters` into
   `<main>` gives the list a `<section>` sibling and changes the paint order,
   which flips Chromium's text antialiasing for some glyphs. The criterion is
   therefore **fractional geometry parity plus a bounded, located pixel diff**,
   not byte identity — a lesson worth keeping for the next layout move.
   - Leaflet renders its tile grid and controls correctly at the new position
     (headed run, since a scrollbar/overlay artefact is invisible headless).
3. **Contrast** computed in system-follow, explicit light and explicit dark.
4. **Screenshots delivered with the result** (repo convention): 375 px and
   1280 px, each light and dark, plus a genuine **before**-shot from the
   `before/` checkout at 375 px — this change moves a visible element, so a
   before/after pair is the only honest way to show it.

### Docs/backlog impact

- `docs/anforderungen/README.md`: new row A-13 (the only place status lives).
- `docs/BACKLOG.md`: #33 clarification block (E7), entry **and** header.
- `CLAUDE.md`: the `CACHE_SHELL` sentence says `v20`; correct it to `v21`. Its
  small-phone paragraph does **not** repeat #33's width sentence (checked) — the
  second copy is the comment in `src/styles.css` above the `≤ 480 px` block, and
  it is clarified with the code change.
- `README.md`: no change.
- `docs/anforderungen/A-12-…md`: **not rewritten** (a `🏁 done` requirement is
  the record of why it was solved that way); the interaction is recorded here.

## Definition of Done

- [x] At 375 × 667 and 360 × 640 the map is **fully** inside the first screen
      (367 px / 352 px, i.e. 55 % of the viewport) — measured, not eyeballed,
      and reported against the `before/` checkout. Met in DE **and** EN;
      `#map` top 447 → 247 (375 px, DE) and 468 → 268 (360 px). The one
      exception in the tested matrix is 320 × 568 (300 of 312 px), see
      *Edge cases*.
- [x] The filter row sits between map and list on a phone, fully expanded, with
      A-12's counts unchanged in meaning and its group label visible at the fold
      (44 / 23 / 11 px, see E5). Toggling `Voll` leaves `45 / 118 / 14`
      untouched while the list drops 177 → 45.
- [x] No horizontal overflow at 320–430 px in DE and EN (7 widths × 2 languages).
- [x] Desktop (900 / 1280 / 1440 px) is unchanged: `#map` and `.liste` identical
      in position and width, columns still flush (#35 preserved). Fractional
      parity to 0.01 px; the residual pixel diff is characterised in the test
      plan's revised bullet.
- [x] Mobile DOM order, visual order and tab order agree
      (`.search → #map → .filters → #liste`, no positive `tabindex`, tab chain
      measured); the filters region keeps its accessible name and is now inside
      `<main>`.
- [x] `src/app.js`, `src/lib/`, `data/` and every i18n string are untouched
      (E6) — visible in the diff.
- [x] `CACHE_SHELL` bumped to `v21`, `SHELL` unchanged, `npm test` green
      (13 suites).
- [x] The closed "Was ist neu?" dialog still computes `display: none` (0 × 0).
- [x] Contrast computed in all four theme paths (light/dark context, each with
      and without an explicit choice); lowest pair 6.57:1, no regression.
- [x] Screenshots (375 px + 1280 px × light/dark, plus before-shots and a
      close-up) delivered with the result report.
- [x] `BACKLOG.md` #33 clarified (entry **and** header); the same sentence in
      `src/styles.css`'s comment clarified; `CLAUDE.md`'s cache version
      corrected; status here set to `🏁 done`.

## Implementation steps

1. `index.html`: move `<section class="filters">…</section>` (L175–215) inside
   `<main class="content">`, between `.map-wrap` and `.list-wrap`. Content
   unchanged, comments carried along.
2. `src/styles.css` base rules: delete `.map-wrap { order: 1 }` and
   `.list-wrap { order: 2 }`; drop `.filters`' `max-width`, `margin: 0 auto` and
   horizontal padding (it inherits `.content`'s), keeping a small bottom
   padding.
3. `src/styles.css` desktop block (`@media (min-width: 900px)`): `.content`
   becomes `display: grid` with `grid-template-columns: 3fr 2fr` and
   `grid-template-areas: "filters filters" "map list"`; assign the three areas.
   `--column-height`, `#map { height: 100% }`, `.list-status { flex: none }` and
   `.liste` stay as they are — `.list-wrap` keeps its inner flex column.
4. `src/styles.css` `@media (max-width: 480px)`: tighten `.app-header` and
   `.search` padding and `.header-top`'s bottom margin (E2). **No** `.tagline`
   rule, **no** `h1` font-size change beyond what is already there. Drop
   `.filters`' `padding-bottom` (the container's `gap` now carries it) and set
   `.content { gap: 0.6rem }` — added during implementation, see E5.
5. `sw.js`: `CACHE_SHELL` → `'bauwatch-shell-v21'`.
6. `npm test`; then the Playwright measurements (mobile widths × heights × DE/EN,
   desktop parity, A-12/E3, the closed dialog), the contrast computation and the
   screenshots, all against a `git archive HEAD` `before/` checkout.
7. Docs: `BACKLOG.md` #33 clarification (entry + header) — already written
   during refinement, verify it still matches — the comment above the
   `≤ 480 px` block in `src/styles.css`, `CLAUDE.md`'s cache version, and the
   status row in `docs/anforderungen/README.md`.
