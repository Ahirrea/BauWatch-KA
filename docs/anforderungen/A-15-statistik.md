# A-15 Statistics tab: the current snapshot in numbers

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want to see at a glance how much is
being built in my city, what kind of work it is, who is building and for how
long, so that I understand the overall situation and not only the site in
front of me.

**Refined on:** 2026-10-17
**Constrained by:** [ADR-001](../adr/ADR-001-statisches-hosting.md) (everything
client-side, no build step) ·
[ADR-005](../adr/ADR-005-neuaufbau-oberflaeche.md) (the rebuilt interface)
**Builds on:** [A-14](./A-14-vollbild-karte.md)/E4 (the "Statistik" tab) ·
[A-10](./A-10-kennzahlen-ergebnisliste.md) (tension 1 "no visitor statistics",
E5 "counting lives in `src/lib/stats.js`", E7 "derived at render time") ·
[A-12](./A-12-filterzeile-restdauer-kennzahlen.md)/E5, E7
(`RESTDAUER_STUFEN`, `summarize()` unchanged)
**Target branch:** `ccr-0fb3ea8f-ywo45b`, together with A-14

## Context

The idea's originator asked for statistics and, on 2026-10-17, chose three
kinds:

- the current state, which is this requirement;
- the development over time ([A-16](./README.md#overview));
- the breakdown by district ([A-17](./README.md#overview)).

The two later ones each need new data, so each gets its own requirement.
This one uses only what `data/baustellen.geojson` already contains.

A-10 deferred this exact view as "Zahlen & Fakten". Its non-scope named
"breakdown by art/Verursacher, longest-running site, share affecting
foot/bike". The prototype built for A-14 rendered it in the "Statistik" tab
with the real data. The screenshots were sent to the idea's originator with
this refinement.

## Touchpoints in the code

- **`src/lib/stats.js`** has `summarize()` (counts per Sperrgrad, A-12/E7)
  and `endetInnerhalb()`. **`src/lib/format.js`** has `restdauer()` and
  `formatRange()`. Both are pure, already in `SHELL`, and covered by
  `scripts/test-stats.mjs` and `scripts/test-format.mjs`.
- **Fields per feature:** `art` (plain text), `verursacher`, `ampel`,
  `verkehrsmittel` (four booleans), `von`/`bis` (date-only ISO) and `titel`.
  Nothing new is needed.
- **The data today** (snapshot of 2026-10-17, 167 cases):

  | Dimension | Values |
  |---|---|
  | `art` | 12 distinct values. Top: Strom bzw. TK-Versorgung 44, Bauliche Sondernutzung 33, Fernwärmeversorgung 22, Gas bzw. Wasserversorgung 19, Gleisbau 16, Straßenbau 14. Six more take 17 together. |
  | `verursacher` | 11 values: Stadtwerke Karlsruhe 76, Privat 24, Tiefbauamt 20, Verkehrsbetriebe Karlsruhe 18, Telekommunikation 9. Six more take 20. One raw value carries stray whitespace: `Land  Baden - Württemberg`. |
  | `verkehrsmittel` | Auto 108, Rad 33, ÖPNV 23, zu Fuß 15 (one case can affect several) |
  | Total duration | median 110 days, 90th percentile 445 days, maximum 2,555 days (Herrenstraße, 2020-02-02 to 2027-01-31) |
  | Remaining | ≤ 7 days 18, 8–30 days 59, 1–3 months 55, 3–12 months 27, > 1 year 8 |

  Every case has both dates today. `restdauer()` handles "Ende offen" and
  "abgelaufen" all the same.

## Tension with non-goals — and resolution

1. **Statistics must not drift into visitor analytics.** Counting visitors
   would collide with A-4's privacy notice and with
   `scripts/test-rechtstexte.mjs` (A-10, tension 1). **Resolved by
   exclusion:** only construction sites are counted. There is no new host, no
   storage key and no counter. The originator confirmed this reading in the
   question that started this refinement.
2. **The 30-second core loop must not turn into a dashboard** (A-10,
   tension 2). **Resolved by placement:** the statistics live in their own
   tab. The default view stays map plus list (A-14/E4).
3. **No chart library.** ADR-001's buildless model and `vendor/` holding only
   Leaflet both argue against vendoring Chart.js or similar (~200 kB) for a
   few bars. **Resolved:** plain HTML/CSS bars. The one line chart (A-16)
   will be inline SVG.
4. **The traffic-light colours mean Sperrgrad and nothing else** (A-7/E4,
   A-10/E2). **Resolved:**
   - Only the Sperrgrad breakdown uses `--red`/`--amber`/`--green`.
   - Every other chart uses one neutral series colour (E3).
   - The traffic-light triple was run through the dataviz palette validator.
     In light mode, amber and green separate by only ΔE 7.4 under protanopia,
     which is legal only with secondary encoding. Every segment is therefore
     labelled with word and number, and segments are separated by a 2 px
     surface gap. Colour is never the only carrier.
5. **The city's text is shown as the city wrote it** (A-5/E3: dataset text
   stays German). **Resolved:** `art` is shown verbatim. `verursacher` gets
   whitespace normalised for display only, and the data itself is untouched.
6. **No new data artifact and no snapshot dependency** (A-10/E7 precedent).
   **Resolved:** everything is derived at render time from the snapshot the
   page already loads. An older snapshot held by a service worker renders
   correctly.

## Decisions (with rationale)

**E1 — The tab describes all of Karlsruhe, not the filtered list.**
*Recommended; confirm with the green light.* One sentence opens the tab:
"Alle 167 offenen Baustellen in Karlsruhe — unabhängig von den Filtern der
Liste." Two reasons:
- The filters sit in the Liste tab (A-14/E5) and cannot be seen from here.
  Numbers that silently follow invisible filters cannot be read.
- A-10/E1 decided the opposite for a strip that sat *directly above* the
  filtered list. That placement no longer exists.

*Discarded:*
- following the filters plus a chip that names them: more UI for a view whose
  question is "the city as a whole";
- an "all / filtered" switch: a second control for the same answer.

**E2 — Content, in this order, as prototyped:**
1. **Four figures:** offene Baustellen · davon Vollsperrungen · typische
   Bauzeit (median) · enden in 7 Tagen.
2. **Sperrgrad:** one stacked bar plus a legend with the three numbers.
3. **"Was wird gebaut?"** (`art`): the top 6 plus "Sonstige".
4. **"Wer baut?"** (`verursacher`): the top 5 plus "Sonstige".
5. **"Betroffen"** (`verkehrsmittel`): four bars, with the note "eine
   Baustelle kann mehrere betreffen".
6. **"Wie lange noch?":** five remaining-duration bands (E6).
7. **"Am längsten":** the three cases with the longest total duration, with
   title, period and `art`.

"Verlauf" (A-16) slots in after item 2, and "Stadtteile" (A-17) after
item 4, each when it lands.

**E3 — Forms follow the data's job; one neutral colour for every non-Sperrgrad
chart.**
- **Counts per category:** horizontal bars with the value printed at the tip.
  A single series gets a single colour: `--bar`, which is `--accent` in each
  scheme.
- **The ordered remaining-duration bands:** the same colour. Position carries
  the order, so they get no colour ramp.
- **Bar marks:** at most 12 px thick, with a 4 px rounded end and a square
  base. There are no gridlines, because every bar is labelled.
- **Figures:** proportional digits for the four figures, tabular digits at the
  bar tips.
- **No pie or donut.**

*Discarded:*
- a categorical palette for `art`: it burns colour on what the bar length
  already says;
- ampel colours on other charts: they would give a second meaning to the
  traffic light.

**E4 — Text first, so no tooltips.**
- Every value is real text in the DOM. Bars are `<span>`s inside a
  label/track grid, not SVG text.
- The stacked Sperrgrad bar is `role="img"` with an `aria-label` naming all
  three numbers, and the legend repeats them visibly.
- No tooltip or hover layer: every value is already printed, the hover
  affordance is absent on touch, and focusable bars would add ~25 tab stops of
  noise.
- Each section has an `h3`. The tab panel is labelled by its tab.

**E5 — The computation goes into `src/lib/stats.js` as pure functions with
tests.** The functions:
- `countBy(features, keyFn)`;
- `topWithRest(entries, n)`, which folds the rest into a "Sonstige"/"Other"
  entry and does not fold a single remaining entry;
- `durationDays(props)`;
- `median(numbers)`;
- `restdauerBands(features, now)`;
- `longest(features, n)`.

`summarize()` stays exactly as it is (A-12/E7). The functions are tested in
`scripts/test-stats.mjs`:
- the bands, plus "Ende offen" and "abgelaufen", add up to the total;
- top plus rest add up to the total;
- the median is right for odd and even counts;
- ties in "longest" are stable (by title);
- missing dates are excluded from duration figures;
- whitespace in `verursacher` is normalised.

This is A-10/E5's reasoning: anything inside a UI module is unreachable for
`npm test`.

**E6 — The bands are ≤ 7 days, 8–30 days, 1–3 months (≤ 91 days), 3–12 months
(≤ 365 days) and > 1 year.** The first two thresholds are the filter's
`RESTDAUER_STUFEN`, so the page teaches one vocabulary (A-12/E5). "Ende offen"
and "abgelaufen" are not bands. Each appears in a one-line note under the
chart, only when it is non-zero.

**E7 — Labels:** `art` verbatim; `verursacher` with whitespace normalised for
display ("Land Baden-Württemberg"); "Sonstige"/"Other" for the folded tail.
English applies to the chrome only. The dataset text stays German (A-5/E3).

**E8 — "Typische Bauzeit" is the median, not the mean.** The distribution is
heavily skewed: median 110 days, maximum 2,555. A handful of multi-year cases
would pull a mean far from anything typical. The display units:

| Duration | Shown as |
|---|---|
| under 60 days | days |
| 60 days up to 2 years | months, one decimal ("3,6 Monate") |
| 2 years and more | years, one decimal |

The label says "(Median)" so the number is not misread as an average.

**E9 — When it renders.** The tab renders on its first opening, again when
new data arrives, and again on a language switch. Filter changes do not
re-render it (E1).

**E10 — No ADR.** There is no persistence, no host, no artifact and no
architectural change. The same reasoning applied to A-10 and A-12.

## Scope / Non-scope

- **In:**
  - the tab content from E2;
  - the pure functions and tests from E5;
  - the DE/EN chrome strings;
  - `--bar` in all three palette blocks;
  - the CLAUDE.md note on the traffic-light colours' validator result.
- **Out:**
  - statistics over time (A-16: new artifact, ADR);
  - districts (A-17: second dataset, licence);
  - statistics for the filtered set or the radius search (E1);
  - export or download (CSV, image);
  - visitor statistics of any kind (tension 1).

## Specification

### UX flow & states

| State | Behaviour |
|---|---|
| Tab opened before the data has loaded | "Wird geladen …" |
| Data loaded | Content per E2; the opening sentence names the total |
| Load error | The tab shows the same error text as `#list-status`; there are no empty charts |
| Snapshot with 0 cases | One sentence ("Keine offenen Baustellen im Datensatz.") instead of charts |
| Language switch | Chrome strings switch; dataset labels stay German |
| Theme switch | Colours change through the tokens, with no re-render (A-8) |

### Interaction with existing features

- **A-12:** `summarize()` and the facet counts are untouched. Both views read
  the same snapshot, so the "Voll" figure on this tab equals the Voll button's
  count whenever no other filter is active. That is checked in the browser.
- **A-14:** this fills the "Statistik" tab. Without A-15, that tab does not
  exist (A-14/E4).
- **A-16 / A-17:** each adds one section in a fixed place (E2) and no other
  change here.

### Data model / persistence

None. Everything is derived at render time.

### External dependencies & fallback

None.

### Edge cases & error handling

- **A category label longer than its column** wraps to two lines. It is never
  cut off with an ellipsis: a `title` attribute is not available on touch.
- **A missing or empty `verursacher` or `art`** counts as "ohne Angabe".
- **A missing `von` or `bis`** is excluded from the duration figures, and the
  note says "N ohne Datumsangabe".
- **Very large values** (one `art` holding 90 % of the cases): bars scale to
  the largest value, so the others stay visible as short bars, with a 2 px
  minimum.
- **320 px width:** the label column shrinks before the bars. Nothing
  overflows horizontally.

### Accessibility

- The structure is headings plus text.
- Contrast is computed for `--bar` against `--surface` (≥ 3:1, graphical) and
  for label and number text (≥ 4.5:1) in both schemes.
- Traffic-light segments are always labelled with word and number.
- No information depends on hover.

### Test plan

- **`npm test`:** the new cases in `scripts/test-stats.mjs` (E5).
- **Browser:**
  - Every number in the tab equals a Node-side recomputation over the same
    snapshot.
  - Both schemes are checked, plus the explicit theme toggle.
  - At 320 px there is no horizontal overflow, and wrapped labels stay
    aligned with their bars.
  - The Voll figure equals the Voll button's count with no other filter
    active.
- **Screenshots:** the tab on mobile and desktop, light and dark (CLAUDE.md).

### Docs/backlog impact

- `CLAUDE.md`: one line in the colour section. The traffic-light triple fails
  protan separation as a categorical palette (amber/green ΔE 7.4 in light
  mode), so it is only ever used with labels.
- `README.md`: the feature list.
- The overview status.

## Definition of Done

- The tab shows E2's content, verified against a Node-side recomputation.
- The pure functions sit in `src/lib/stats.js` with tests; `npm test` is
  green, and `src/lib/` stays DOM-free.
- There is no tooltip dependency and no colour-only encoding. Contrast is
  computed in both schemes.
- There is no new host, storage key or artifact.
- Screenshots are sent with the result, and the docs are updated per the
  impact list.

## Implementation steps

1. Add the pure functions and tests in `src/lib/stats.js` and
   `scripts/test-stats.mjs`.
2. Add the tab module (in A-14's structure) and the markup scaffold.
3. Add the strings (DE/EN) and the `--bar` token in all three palette blocks.
4. Run the browser checks, take the screenshots, and update the docs and the
   status.

## Implementation record (2026-10-17)

Commit `585ad75` on `main` (landed on 2026-10-18 together with A-14), built on
[A-14](./A-14-vollbild-karte.md)'s shell.

**Verified:**
- **`npm test`:** 20 new cases in `scripts/test-stats.mjs` cover E5's
  functions, including the band boundaries at 7/8, 30/31, 91/92 and 365/366
  days. All pass.
- **Content (DoD):** 30 of 30 values in the tab equal a Node-side
  recomputation over the same snapshot. Checked at 414 px light, 1280 px dark
  and 320 px light. The median is 110 days, shown as "3,6 Monate" (E8).
- **Voll figure = Voll button:** 45 = 45 with no other filter active, at 320,
  414 and 1280 px.
- **320 px:** no horizontal overflow in German or English. 6 of the 22 bar
  labels wrap (2 at 414 and 1280 px), and every bar stays in its label's row.
- **Contrast, in both schemes.** The explicit toggle gives exactly the values
  of the context's dark scheme.

  | Pair | Light | Dark |
  |---|---|---|
  | Body text: labels, headings, titles | 17.40:1 | 13.96:1 |
  | Muted text: scope line, notes, bar values, meta | 7.05:1 | 7.00:1 |
  | Lowest text: the four figures' labels | 6.57:1 | 5.90:1 |
  | `--bar` against its surface | 9.13:1 | 6.10:1 |
  | Sperrgrad segment and legend dot: red / amber / green | 5.92 / 3.38 / 5.39 | 5.62 / 8.64 / 8.02 |

  Text clears 4.5:1 and every graphical mark clears 3:1. Light-mode amber
  (3.38:1) is the tightest; it always carries a word and a number (E4,
  tension 4).
- **No new host, storage key or artifact.** The tab reads `state.features` and
  nothing else.

**As built, beyond the decisions:**
- **`topWithRest(entries, n, restLabel)`** takes the "Sonstige"/"Other" label
  as an argument. `src/lib/` holds no UI language of its own, and the UI
  module passes `str('statsOther')`.
- **`normalizeLabel()`** is a pure function in `src/lib/stats.js` too, so E7's
  whitespace rule is tested like the rest. It also closes the spaces around a
  hyphen between letters ("Baden - Württemberg" → "Baden-Württemberg").
  `RESTDAUER_BANDS` is exported next to `RESTDAUER_STUFEN`.
- **A load error** sets `state.loadError` (new in `src/ui/state.js`). The tab
  shows the list's error text instead of waiting for data that will not come.
- **The bar minimum** is a floor of 1.5 % of the track: 2.1 px at 320 px and
  2.7 px in the desktop panel, close to the spec's 2 px. With today's
  snapshot it never applies. The shortest bar is 16.7 px (9 cases).

**Definition of Done: met.** E2's content is verified against a
recomputation. The pure functions are in `src/lib/stats.js` with tests, and
`src/lib/` stays DOM-free. Nothing depends on a tooltip or on colour alone,
and contrast is computed in both schemes. There is no new host, storage key or
artifact. The screenshots were sent at 414 px light, 1280 px dark and 320 px
light, and the docs are updated per the impact list.
