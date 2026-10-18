# A-18 Reset all filters at once

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As someone who narrows the list with several filters, I want
to put them all back with one tap, so that I see every construction site
again without hunting for each active filter in a row that scrolls sideways
on my phone.

**Refined on:** 2026-10-18
**Constrained by:** [A-12](./A-12-filterzeile-restdauer-kennzahlen.md)/E4
("Alle" is each group's reset) · [A-17](./A-17-stadtteile.md)/E5 and E6
(district and radius search replace each other; the district's outline and
camera) · [A-14](./A-14-vollbild-karte.md)/E2, E5 and E13 revised (the
measured sheet, the sideways filter row, the centred views) and its
accessibility rules · [A-11](./A-11-auswahl-ohne-zoom.md) (which actions may
move the camera)
**Target branch:** `ccr-0fb3ea8f-ywo45b`

## The report

The idea's originator sent a phone screenshot (414 px wide, 2026-10-18, the
day A-16, A-2 and A-17 went live). The status line read "2 Baustellen in
Südweststadt". The filter row was scrolled to the district select, ÖPNV was
active to its left, and the Sperrgrad group had scrolled out of sight. The
message: "Mir fehlt die Möglichkeit zum Zurücksetzen des Filters." The same
screenshot showed the select's focus ring cut off at the top. That one was a
plain fix with an obvious solution and went through the backlog as
[#39](../BACKLOG.md).

## Touchpoints in the code

- **State:** `state.filters` in `src/ui/state.js` holds four groups
  (`restdauer`, `ampel`, `verkehrsmittel`, `district`), each `'alle'` by
  default.
- **Segment buttons:** `wireFilters()` in `src/ui/filters.js` sets
  `is-active` and `aria-pressed` per group on a click. Nothing sets them from
  the state yet; a reset needs that.
- **District select:** `renderDistrictOptions()` rebuilds it in every
  `render()` and sets its value from the state, so it follows a reset by
  itself. `wireDistrictFilter`'s callback in `src/app.js` clears the outline
  and returns the camera for "Alle Stadtteile".
- **Status line:** `renderStatus()` in `src/ui/list.js` writes
  `#list-status`, a `role="status"` live region, with `textContent`. Anything
  placed inside it would be deleted on the next render.
- **Panel head:** `.status-row` holds the count and the data stand and wraps.
  The head's drag handler in `src/ui/panel.js` ignores a pointerdown on a
  button, so a button in the head keeps its own tap. Focus on a tab does not
  open a collapsed sheet; only focus entering the panel body does.

## Tension with decisions — and resolution

1. **A-12/E4: "The existing 'Alle' button is the reset."** That stays, per
   group. A-18 adds one control for all groups that does exactly what
   pressing every "Alle" would do. No filter means anything new.
2. **A-17/E6: "Alle Stadtteile" returns to the initial view.** The reset
   includes the district, so it inherits that camera move, and only that one
   (E4).
3. **A-11: selection never moves the camera.** A reset is not a selection,
   and it adds no view of its own. It moves the camera only through the
   district's existing reset.
4. **A-14/E2: the collapsed sheet is measured.** A button in the status row
   can push the data stand onto a second line while filters are active. The
   measurement follows, so the sheet grows by that line (E5).
5. **The live region.** The button must not sit inside `#list-status` (see
   the touchpoints).

## Decisions (with rationale)

**E1 — One button, "Filter zurücksetzen", next to the count.** *Decided by
the idea's originator.* The fork had four options: a button by the count,
chips for each active filter plus "reset all", an × at the district select
only, or a button at the end of the filter row. The head is visible in every
sheet state and in all three tabs. So the button is in view wherever the
filter row is scrolled, and it sits beside the number it changes.
*Discarded:* chips (they would show which filters are active even with the
row scrolled away, but cost a line of height in every sheet state while any
filter is on); an × at the select only (the other groups would still have to
be found in the row); a button at the row's end (on a phone it is out of view
depending on how far the row is scrolled).

**E2 — It resets the four filter groups, nothing else.** *Decided by the
idea's originator.* Sperrgrad, Endet in, Verkehrsmittel and Stadtteil go back
to "Alle". A radius search stays, with its own × in the search bar.
*Discarded:* clearing the search as well. That would be one tap back to the
start, but the search is not part of the filter row, it has its own visible
reset, and "Filter zurücksetzen" would then do more than its name says.

**E3 — The button is there only while a filter is off "Alle".** This was part
of the chosen option. With nothing to reset the control is absent, not inert.
A-12 replaced A-10/E6 because a control that vanishes at 0 is missing just
when you need it to get back. This control is the way back, and it is
present whenever there is something to get back from. Its appearance also
tells a phone user that filters are active when the row has scrolled them out
of sight.

**E4 — The camera returns to the initial view only if a district was
chosen.** This is the same as "Alle Stadtteile" (A-17/E6), centred in the
uncovered map (A-14/E13 revised). Resetting Sperrgrad, Endet in or
Verkehrsmittel has never moved the camera, so the combined reset does not
either.

**E5 — Form and place.**
- **Form:** a text button with an × icon, placed right after the count in
  `.status-row` and outside the live region. Its label is "Filter
  zurücksetzen" (EN "Reset filters"), in `--accent`, with its contrast
  computed in both schemes.
- **Wrapping:** when the line runs out of room, the data stand wraps to the
  next line, and the measured sheet grows with it.
- **Touch target:** its hit area is at least 44 px tall (A-14's touch-target
  rule) without changing the line, and it must not reach into the tabs.

**E6 — Focus.** The button disappears when it is used. If it had focus, focus
moves to the selected tab, the nearest control in the head that stays. This
keeps focus off `<body>`, and a tab never opens a collapsed sheet. The new
count is announced by `#list-status` as before.

## Scope / Non-scope

- **In:**
  - the button, its visibility, and the reset of all four groups (state,
    segment buttons, select);
  - the district's outline and camera;
  - DE/EN labels;
  - the shell cache version.
- **Out:**
  - the radius search (E2);
  - chips or any summary of active filters (E1);
  - storing filters (they are still not stored; no new `localStorage` key);
  - scrolling the filter row back to its start, because the row stays where
    the user left it;
  - the empty-list text. It still says "Filter lockern oder „Alle" wählen.",
    and the button stands right beside it.

## Specification

**States:**

| State | Reset button | A tap on it |
|---|---|---|
| No filter active (the start) | hidden | — |
| Sperrgrad, Endet in or Verkehrsmittel active | visible | every group to "Alle"; the map stays; list, counts and status re-render |
| District chosen, with or without others | visible | every group to "Alle"; the outline goes; the camera returns to the initial view |
| Radius search, no filter | hidden (the search has its own ×) | — |
| Radius search plus filters | visible | the filters to "Alle"; circle, search text and the distance order stay; the map stays |
| List empty because of the filters | visible, beside the empty message | as above |
| Before the data has loaded | visible only if a filter is already active | the same; the counts appear once the data is there |

**Interaction with existing features:**
- **Counts:** the Sperrgrad numbers (A-12/E3) and the district numbers
  (A-17/E4) are recomputed in the same `render()`.
- **Selection:** a selected site stays selected, since the list only grows
  (A-9, A-11).
- **Language switch:** the label is a `data-i18n` span.
- **Sheet:** a tap on the button never moves the sheet.
- **Statistik and Neu tabs:** the button stays in the head and resets the
  list's filters. The statistics cover all of Karlsruhe anyway (A-15/E1).

**Accessibility:**
- It is a real `<button>`, and its name is its visible label (WCAG 2.5.3).
  The icon is `aria-hidden`.
- Its focus ring is complete, which is measured.
- Label contrast is at least 4.5:1 in both schemes.
- Its hit area is at least 44 px tall.
- Focus follows E6.
- `hidden` takes it out of the accessibility tree.

**Test plan:**
- `npm test` covers the i18n keys and the shell list.
- A Playwright check covers:
  - the button is hidden at the start and appears for each of the four
    groups;
  - a reset restores `aria-pressed` and `is-active` in every group and the
    select's value;
  - with a district: the outline goes, and centre and zoom equal a fresh load;
    without one, the camera does not move;
  - a radius search survives;
  - a keyboard reset lands focus on the selected tab;
  - a tap on the collapsed sheet moves neither the sheet nor focus into the
    body;
  - the collapsed sheet's height, with and without the button;
  - the hit area against the tabs;
  - the focus ring, the label contrast, the English label, and the 320 px
    layout.
- Screenshots at 414 and 1280 px in both schemes, plus a close-up.

## Definition of Done

- [x] "Filter zurücksetzen" stands next to the count whenever any of the four
  groups is off "Alle", and is absent otherwise.
- [x] One tap sets all four groups to "Alle": the state, the segment buttons
  (`aria-pressed`) and the select.
- [x] A chosen district's outline goes and the camera returns to the initial
  view. Without a district the camera does not move.
- [x] A radius search survives the reset.
- [x] The button sits outside `#list-status`, and the new count is still
  announced.
- [x] Focus never falls to `<body>`, and a tap moves neither the sheet nor
  focus into the panel body.
- [x] Label contrast is at least 4.5:1 in both schemes, the hit area is at
  least 44 px tall without reaching the tabs, and the focus ring is complete.
- [x] The label is in DE and EN, `CACHE_SHELL` is bumped, and `npm test` and
  the browser check are green; screenshots at 414 and 1280 px, light and
  dark.

## Implementation steps

1. `index.html`: the button in `.status-row`, after `#list-status`.
2. `src/ui/filters.js`: `filtersActive()`, `resetFilters()` (state and
   segment buttons) and `renderFilterReset()`.
3. `src/app.js`: wire the button (the district's outline and camera, focus
   per E6) and show or hide it in `render()`.
4. `src/shell.css` and `src/lib/i18n.js`: the button's style and label.
5. `sw.js`: `CACHE_SHELL`. v28 already carries #39 from the same release.
6. Verify, then record the results here.

## Implementation record (2026-10-18)

Built on `ccr-0fb3ea8f-ywo45b` the same day, in one pass after the
refinement. #39's focus-ring fix went first, from the same screenshot.

**What was built:**
- **The button:** it sits in `.status-row`, between `#list-status` and the
  data stand.
- **Logic:** `filtersActive()`, `resetFilters()` and `renderFilterReset()`
  live in `src/ui/filters.js`. The reset sets the state and the segment
  buttons, and the select follows in `render()`.
- **Wiring:** a click handler in `src/app.js` takes the district's outline
  and camera with it, as "Alle Stadtteile" does, and hands focus on per E6.
- **Label:** `filterReset` is "Filter zurücksetzen" in DE and "Reset filters"
  in EN.
- **Shell cache:** v28, shared with #39.

**Measured:**
- **Browser check: 58/58.** It covers:
  - each of the four groups alone and the originator's case (ÖPNV plus
    Südweststadt: 2 sites, then one tap back to all 166, the outline gone);
  - the camera, which lands exactly where "Alle Stadtteile" lands in the
    same sheet state, at zoom 13. Without a district it stays put;
  - a radius search, which survives with circle, text and status;
  - an empty list (Wolfartsweier plus Gering), with message and button side
    by side;
  - the menu's language and theme toggles, untouched;
  - a tap on the collapsed sheet: the sheet stays collapsed, and focus goes
    to the selected tab rather than into the body or to `<body>`;
  - the keyboard: Tab reaches the button with a visible ring, and Enter
    resets and moves focus to `#tab-liste`;
  - no page errors.
- **Mutation: 8/8 seeded defects turned the check red.** They were:
  - the reset skipping the district;
  - no camera move;
  - `render()` never showing the button;
  - segment buttons left unsynced;
  - the button moved inside the live region (deleted on the first render,
    so the check crashes at the lookup);
  - focus not handed on;
  - the reset clearing the search too;
  - a hit area of 28 px.
- **Height (E5, measured):** with the button showing, the data stand wraps
  at every width from 320 to 1280 px. The head grows from 121.81 to
  141.16 px on a phone, so the collapsed sheet goes from 122 to 142 px while
  a filter is active. On desktop the head grows from 215.05 to 234.39 px
  inside the fixed panel. On desktop, count and button share one line.
- **Hit area:** 45.32 × 156.72 px. It reaches no other control in the head,
  and it ends 15.67 px above the tabs. The first cut, `inset: -0.75rem`, gave
  43.7 px and was raised to `-0.8rem`.
- **Contrast of the label:** 9.13:1 in light mode (`#1b4b73` on `#ffffff`)
  and 6.10:1 in dark mode (`#6ba7d6` on `#1f2329`).
- **Focus ring:** complete at 320, 414 and 1280 px in both schemes, measured
  against every clipping ancestor.
- **Layout:** nothing overflows the head sideways at 320 px. The label never
  wraps inside the button (`white-space: nowrap`). In the empty case at
  320 px the message wraps and the button takes a line of its own, checked
  in DE and EN.
- **`npm test`:** 1175 passed. The three new checks are the label's i18n
  keys.

**Screenshots:** at 414 px light and dark and 1280 px light and dark, with
real tiles, in the originator's case, plus close-ups of the head. They were
sent with the report, not committed.
