# A-16 Statistics over time

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want to see how the number of open
construction sites develops over time, so that I can tell whether there is
more or less construction than usual, and whether full closures are piling
up.

**Refined on:** 2026-10-18
**Constrained by:** [ADR-006](../adr/ADR-006-verlauf-zeitreihe.md) (the
committed daily history) · [ADR-001](../adr/ADR-001-statisches-hosting.md)
(static, same origin) · [A-15](./A-15-statistik.md) (the statistics tab: its
E1 and E3, the section order of E2, and E4, which this file amends for one
chart)
**Target branch:** `ccr-0fb3ea8f-ywo45b`

## Touchpoints in the code

- **`scripts/build-data.mjs`** writes the snapshot, `CHANGELOG.md`,
  `QUALITY.md` and `changelog.json` in the "real change" branch
  (`hasChanges(diff)`), with `writeAtomic()`. The history file slots in
  there.
- **`src/lib/stats.js` → `summarize()`** already returns exactly the counts
  an entry needs: `{ total, voll, teil, gering }`. It is pure, so the build
  and the backfill can share it with the browser.
- **`.github/workflows/update-data.yml`** commits an explicit list of files.
  A new artifact is not committed unless it is on that list (ADR-006).
- **`sw.js`**: `DATA_PATHS` holds the two network-first files,
  `baustellen.geojson` and `changelog.json`.
- **`src/ui/stats.js`** renders the tab. A-15/E2 reserves the slot after the
  Sperrgrad section for this.
- **The Git history of `data/baustellen.geojson`** has 247 commits from
  2026-07-20 to 2026-10-18. A prototype backfill gave one value for each of
  the 91 days, without a gap:
  - open sites between 155 (2026-08-02) and 199 (2026-07-30);
  - full closures between 41 and 56;
  - voll + teil + gering = total on every day.

## Tension with non-goals — and resolution

1. **"Commit only on a real data change; never a per-run-volatile value."**
   The history is written in the same branch as the snapshot, from counts
   that depend on the snapshot alone, dated by the snapshot's own `stand`.
   That adds no trigger and no volatile value (E3).
2. **"Data commits come from the Action."** The backfill is a hand-made
   commit, the same exception #28 made. ADR-006 records it.
3. **A committed artifact that grows without bound.** ADR-006.
4. **A-15/E4, "text first, so no tooltips".** E4 rests on every value being
   printed. A line over 91 or more days cannot print every value. E5 below
   keeps "text first" for the figures that matter. A readout for one day and
   a table with every day make sure that no value depends on hovering.
5. **The colour rule from A-15.** The traffic light appears only with word
   and number, and every other chart uses `--bar`. Full closures therefore
   get their own small chart in `--bar`, named by its title, instead of a
   red line (E2).
6. **A-15/E1, all of Karlsruhe.** Unchanged: the history is citywide.
7. **No visitor statistics.** The series counts construction sites, never
   visitors.

## Decisions (with rationale)

**E1 — A daily series, end of day, written by the Action** (per ADR-006).
- The file is `data/history.json`, an array of
  `{ date, total, voll, teil, gering }`, sorted by date.
- `date` is the calendar day of the snapshot's `stand` in Europe/Berlin.
  The day's last snapshot wins.
- It is written only in the real-change branch and never pruned.
- A day without an entry carries the previous value forward.

**E2 — Two small line charts: all open sites, and the full closures among
them.** *Decided by the idea's originator* on 2026-10-18.
- Each chart shows one series in `--bar` with its own y-range, titled
  "Offene Baustellen" and "davon Vollsperrungen".
- On a shared axis the full closures (41–56) would hug the bottom of a scale
  up to 200, and their movement would disappear.
- A second y-scale on the same plot (a dual axis) is ruled out: the
  alignment of two scales is arbitrary and invents correlations.

*Discarded:* the total alone (the originator chose both); a stacked area by
Sperrgrad (hard to read, and it would put the traffic-light colours into a
chart without a label on each value).

**E3 — Only counts that the snapshot alone determines.** Total, voll, teil
and gering change exactly when the snapshot changes. "Ends within 7 days" or
a median duration would change at midnight without a data change, and are
left out. `teil` and `gering` are stored, though not drawn now: they cost a
few bytes, and a later chart could not recover them.

**E4 — The window is everything since 2026-07-20.** All entries are drawn,
with the x-axis labelled by month. There is no range switch for now; 91 days
fit any width. Revisit once the series passes two years.

**E5 — Text first, plus a readout and a table.**
- **Figures above the charts:** today's value, the change against 30 days
  ago (signed), and the highest and lowest day with their dates.
- **End labels:** each chart prints its last value at the end of its line.
- **Readout:** a vertical hairline follows the pointer or a finger along the
  chart, and the arrow keys move it when the chart has focus. The date and
  both values appear in one line below the charts, not in a floating
  tooltip, so it also works on touch.
- **Table:** a `<details>` "Alle Werte als Tabelle" lists every day.

This amends A-15/E4 for this chart only. E4's premise, that every value is
printed, cannot hold for a daily series.

**E6 — Marks.**
- Lines are 2 px with round joins, in `--bar`. The last point carries an end
  dot (≥ 8 px, with a 2 px ring in the surface colour) and its value.
- The y-axis fits the data with clean ticks (for example 150 / 175 / 200)
  and does not start at 0. A zero baseline would flatten 155–199 into a line
  that cannot show the change residents ask about. The printed ticks make the
  scale explicit.
- There is no area fill: a fill implies a quantity measured from the
  baseline, and the baseline here is not 0.
- Gridlines are solid hairlines in `--border`.

**E7 — Placement and loading.**
- The section sits after "Sperrgrad", in the slot A-15/E2 reserved.
- The tab fetches `data/history.json` on its first opening, as the "Neu"
  tab does with its data, and not at boot.
- The service worker serves the file network-first (`DATA_PATHS`).
- If the fetch fails, the section says so in one line, and the rest of the
  tab still renders.

**E8 — The backfill.** `scripts/backfill-history.mjs` runs by hand, like
`render-icons.mjs`, and stays outside `npm test`.
- It walks the `git log` of `data/baustellen.geojson`.
- It skips `sample` snapshots and snapshots without `stand`.
- It counts with the same pure helper as the build and writes
  `data/history.json`.
- It runs during implementation and again right before landing (ADR-006), so
  that no day falls between the two writers.

**E9 — Nothing else.** ADR-006 is the only new ADR. There is no new host, no
storage and no change to the privacy notice: the file is served from the
same origin and contains no personal data.

## Superseded decisions

| Decision | Was | Now | Why |
|---|---|---|---|
| A-15/E4 (in part) | no tooltips; every value printed | for the history charts: a readout line below the charts and a table with every day (E5) | a daily series cannot print every value |

A-15 is 🏁 done and is not rewritten
([process step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)).
This table is the cross-reference.

## Scope / Non-scope

- **In:**
  - `data/history.json` with the backfill;
  - the build's upsert;
  - the workflow's `git add`;
  - the service-worker data path;
  - the statistics section: figures, two charts, readout and table;
  - DE/EN strings, tests and docs.
- **Out:**
  - a history per district (A-17 counts the current snapshot only);
  - a range switch;
  - statistics about visitors;
  - export or download;
  - forecasts;
  - "new and ended per day". It could later be derived from the change runs,
    but `changelog.json` keeps only 30 days.

## Specification

### UX flow & states

| State | Behaviour |
|---|---|
| Tab opened, history loading | The section shows "Verlauf wird geladen …"; the rest of the tab renders |
| Loaded | Figures, two charts, the readout line and the table toggle |
| Load error, or offline without a cached copy | One line: "Verlauf nicht verfügbar"; no empty axes |
| Offline with a cached copy | The charts render, and the section notes that the history is from the device cache (`X-Bauwatch-Cache`, as for the snapshot) |
| Fewer than two days | The figures only, plus "Noch zu wenige Tage für einen Verlauf" |
| Language switch | Chrome strings and date formats switch, and the section re-renders |
| Theme switch | Colours change through the tokens, without a re-render (A-8) |
| Readout | Pointer or finger moves the hairline; arrow keys, Home and End move it when the chart has focus; leaving the chart returns the line to today |

### Interaction with existing features

- **A-15:** the section takes E2's reserved slot. E1 and E3 hold, and E4 is
  amended for this chart (E5).
- **Filters (A-12) and search:** no interaction; the history is citywide.
- **A-6 ("Neu"):** none; a separate file.
- **A-3 (PWA):** `DATA_PATHS` gains the file, and `CACHE_SHELL` is bumped
  for the changed shell files.
- **A-17:** no history per district (out of scope).

### Data model / persistence

```json
[
  { "date": "2026-07-20", "total": 186, "voll": 49, "teil": 124, "gering": 13 },
  { "date": "2026-07-21", "total": 184, "voll": 46, "teil": 125, "gering": 13 }
]
```

The array is sorted ascending by `date`, with one entry per date and about
67 bytes per entry. Nothing is stored in the browser.

### External dependencies & fallback

None new. The file is served from the same origin.

### Edge cases & error handling

- **First fill** (`sample` → real data): the first real run writes the first
  entry. Sample snapshots are never counted.
- **Several runs in one day:** the day's last snapshot replaces the entry.
- **The Action did not run for days:** no entries, and the last value
  carries forward. The chart cannot tell "no change" from "not observed"
  (ADR-006).
- **A malformed `stand`:** the entry is skipped, and the build never fails
  on it.
- **Time zone and daylight saving:** the date is computed for
  Europe/Berlin, so a change at 00:30 local time lands on the right day.
- **Today without an entry:** the series is carried forward to today, so the
  last point is always today.

### Accessibility

- Each chart is `role="img"` with an `aria-label` that names first, last,
  highest and lowest value.
- The figures are plain text, and the table holds every value.
- The readout line is not a live region: it would announce every step of a
  pointer. The table is the accessible equivalent.
- The chart is focusable, and the arrow keys move the readout.
- `--bar` on `--surface` is already measured at 9.13:1 light and 6.10:1 dark
  (A-15). Contrast is computed again for the text in this section.

### Test plan

- **`npm test`:**
  - New pure helpers, with a new `scripts/test-history.mjs` added to the
    `test` script. The day's entry from a snapshot; upsert replaces the same
    date, appends a new one and keeps the order; the day boundary in
    Europe/Berlin across a change of daylight saving; `sample` and a
    malformed `stand` are skipped.
  - The committed `data/history.json`: dates ascending and unique,
    voll + teil + gering = total, no date in the future.
  - `update-data.yml`'s `git add` lists `data/history.json`. This guards the
    trap in ADR-006.
  - Browser-side helpers in `src/lib/stats.js` (carry forward to today,
    extremes, change against 30 days ago), in `scripts/test-stats.mjs`.
  - `test-pwa.mjs`: the file is in `DATA_PATHS` and not in `SHELL`.
- **Browser:**
  - Every printed figure equals a Node recomputation from the file.
  - The readout works by pointer, touch and keyboard.
  - The table has one row per day.
  - Offline (same-origin requests aborted): the error line shows, and the
    rest of the tab works.
  - Both schemes at 320, 414 and 1280 px, with no horizontal overflow.
- **Screenshots:** 414 and 1280 px in light and dark, plus a close-up
  (`CLAUDE.md`).

### Docs/backlog impact

- **`CLAUDE.md`:**
  - the `git add` list trap;
  - the history's invariants (only snapshot-determined counts, end of day,
    the backfill before landing);
  - the backfill script and the new test in "Commands".
- **`README.md`:** the feature list; "Tracking changes" gains the history
  file.
- **The overview status.**

## Definition of Done

- `data/history.json` is committed with the backfill (at least 91 days) and
  is well-formed. The build upserts it on every real change, and the
  workflow commits it.
- The statistics tab shows the figures, two charts, the readout and the
  table, verified against a recomputation, in both schemes, with no overflow
  from 320 to 1280 px.
- `npm test` is green with the new tests. There is no new host and no
  storage, and the service worker serves the file network-first.
- Screenshots are sent, the docs are updated, and the overview shows 🏁.

## Implementation steps

1. The pure helpers and their tests.
2. The backfill script; run it and commit `data/history.json`.
3. `build-data.mjs`, `update-data.yml` and `sw.js` (`DATA_PATHS`,
   `CACHE_SHELL`).
4. The statistics section: loading, figures, charts, readout, table, strings
   and styles.
5. Browser checks, screenshots, docs and status.
6. Right before landing: rerun the backfill (E8).
