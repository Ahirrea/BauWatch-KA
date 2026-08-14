# A-12 Filter row: remaining duration instead of time period, counts in the closure-severity filter

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want every filter on the page to
actually narrow something and to tell me how much it would narrow, so that I
stop clicking controls that change nothing.

**Refined on:** 2026-08-14
**Constrained by:** [ADR-001](../adr/ADR-001-statisches-hosting.md) (everything
client-side, no backend). — No new ADR needed: no data artifact, no
persistence, no external host, no new subsystem; the change lives in the render
path and in the filter markup (same reasoning as A-10). It does, however,
**supersede decisions that already exist** — see *Superseded decisions* below.
**Supersedes:** [A-10](./A-10-kennzahlen-ergebnisliste.md)/E1, E4, E6 ·
[`BACKLOG.md` #21](../BACKLOG.md)'s "display-only, not clickable"
**Target branch:** not yet assigned

## The finding that started this

The "Zeitraum" filter offers four options; three of them (`Heute aktiv`,
`Diese Woche`, `Alle`) return the same set, and the fourth (`Bald geplant`)
returns zero. Reported from the running site, then **verified against every
committed snapshot**, not just today's:

| Snapshots checked | `heute` | `woche` | `alle` | `geplant` |
|---|---|---|---|---|
| all 86 real ones, 2026-07-20 → 2026-08-14 | = total | = total | = total | **0** |

The only snapshot where the filter ever differentiated is the hand-made
`sample: true` starting value (7 features) from before the first Action run.

**Cause, measured on `759a1f3` (177 features):** `von` max is `2026-08-13`
(yesterday), `bis` min is `2026-08-14` (today). Not a single case starts in the
future, not a single one has ended. The WFS publishes **currently running**
cases only; `scripts/build-data.mjs` applies no date filter of its own
(`isKarlsruhe` is the only filter, L433). So `matchesZeitraum`'s three
non-`geplant` branches are equal by construction and `geplant` is empty by
construction. The filter cannot work against this source — it is not a bug in
the predicate.

What *is* alive in the same data is the **remaining** duration:

| ≤ 7 days | 8–30 | 31–90 | 91–365 | > 365 | no `bis` |
|---|---|---|---|---|---|
| 31 | 53 | 50 | 32 | 11 | 0 |

Median 36 days. That is the axis this requirement puts in the freed slot.

## Touchpoints in the code

**Checked, not guessed** — against `a0f7466`.

| What | Where | Meaning for this requirement |
|---|---|---|
| The dead predicate | `matchesZeitraum(props, mode, now)` in `src/app.js` (L146–171), called from `currentFiltered()` (L186), default state `filters.zeitraum: 'heute'` (L47) | Replaced wholesale, not patched. Its `parseDate`-instead-of-`new Date()` care (local midnight, consistent with `restdauer()`) is the part worth carrying over. |
| The markup it drives | `index.html` L176–184 — four buttons in a `.filter-group[data-filter="zeitraum"]` | Becomes three buttons with `data-filter="restdauer"`. |
| **`wireFilters()` is generic** | `src/app.js` L744–759 | It walks *every* `.filter-group`, reads `data-filter` for the state key and `data-value` off each `.segments button`, then sets `is-active` + `aria-pressed` and calls `render()`. **Renaming a group and changing its values needs no wiring change at all** — and it is also why the closure-severity group can gain numbers without becoming a new kind of control. |
| The closure-severity buttons already carry the dot | `index.html` L190–192: `<button …><span class="dot dot-red" aria-hidden="true"></span><span data-i18n="filterVoll">Voll</span></button>` | This is the decisive one. "Chips replace the Sperrgrad group" is not a rebuild: the group **already is** the chip row, minus the number. Colour-as-shape (A-10/E2) is therefore inherited rather than re-decided. |
| The strip being removed | `renderMetrics(list)` in `src/app.js` (L484–517), element `<p class="kennzahlen" id="kennzahlen" hidden>` in `index.html` L219, `.kennzahlen` rules in `src/styles.css` (L575–590) | All three go. `.badge` stays — the list item's distance badge (`.badge-dist`, `styles.css` L671) still uses it. |
| The counting survives | `summarize(features, now)` in `src/lib/stats.js`, `scripts/test-stats.mjs` | Reused for the facet counts. Pure, tested, DOM-free — exactly what E3 needs. Only `endetBald` leaves (E7). |
| Remaining duration is already pure | `restdauer(bis, now, lang)` in `src/lib/format.js` (L106–115) → `{ text, days, expired, open }` | The whole "ends within N days" rule, including the open-ended and expired cases. The new predicate is a wrapper, not new date maths. |
| Filtering happens in one place | `currentFiltered()` `src/app.js` L181–205 | Must be split so the facet counts can see the set **without** the closure-severity filter (E3). The radius branch (L191–203) sets `_dist` and sorts — it stays at the end of the chain, unchanged. |
| `.segments` is a shared pattern already | `src/styles.css` L494–522, reused by the language toggle (L207) and the theme toggle (L222) | A fourth reuse needs no new component. `.segments button.is-active` paints `--accent` / `--accent-contrast`; a dot inside an active button already renders that way today. |
| The width budget is tight and was measured once | [`BACKLOG.md` #33](../BACKLOG.md) | At 0.85 rem all three groups fit one row from 360 px up; the "Zeitraum" group with four buttons was the one that wrapped, and `#map`'s top edge at 375 px went 558 → 447 px. Adding numbers widens the severity group, dropping a button narrows the other — **net effect must be measured, not assumed** (Definition of Done). |
| Shell precache version | `CACHE_SHELL = 'bauwatch-shell-v18'` in `sw.js` L25 | `index.html`, `src/app.js`, `src/styles.css`, `src/lib/stats.js` all change → bump to **`v19`**. No `SHELL` entry is added or removed. |
| The quality report's shape | `analyzeQuality(records, stats, now)` / `summarizeQuality(report)` / `renderQualityMarkdown(report, stand)` in `scripts/quality-report.mjs` (L27 / L100 / L121), sections built with `block(title, items)` | Where E6's guard goes. Note `summarizeQuality`'s `problems` total (L102) — the guard is an **observation, not a defect**, so it stays out of that sum, exactly as A-7/E9 established for the `hasArea` line. |
| Orphaned i18n keys are *not* caught | `scripts/test-i18n.mjs` checks DE/EN parity, non-emptiness, and that every `data-i18n` in `index.html` resolves — but never the reverse | Removing `filterHeute`/`filterWoche`/`filterGeplant`/`metricsEndetBaldOne`/`metricsEndetBaldMany` is manual hygiene the suite will not remind anyone about. Listed as an explicit implementation step for that reason. |

**Missing (net-new):** the remaining-duration predicate + its tests; the split
of `currentFiltered()`; number rendering into the severity buttons; six i18n
keys in, five out; the quality-report guard; the `CACHE_SHELL` bump.

## Tension with non-goals — and resolution

1. **`BACKLOG.md` #21 decided the opposite, explicitly.** Its wording:
   *"Decision: display-only (not clickable). Instead of meeting the 'click =
   filter' expectation, the tiles are visually marked clearly as display-only,
   so the impression of a control never arises in the first place."* A-10 then
   carried that forward (a non-interactive strip, E4 keeping it out of the live
   region). **Resolved by reversal, and it is deliberate:** #21 solved the
   mismatch by removing the affordance; this requirement solves it by removing
   the *duplication* instead — the numbers move **into** the control that
   already did the filtering, so there is exactly one element per job. #21's
   underlying complaint ("users expect click = filter") is met rather than
   designed around, and its second finding — the double count — stays resolved,
   because the total remains only in the status line (E4).
2. **A-10's strip disappears as a rendered element.** Its non-goals hold
   unchanged (no usage/visitor statistics of any kind, no new data property, no
   storage, no request); what changes is *where* the numbers live. `src/lib/stats.js`
   and `scripts/test-stats.mjs` survive and keep doing the counting. A-10's file
   stays where it is and is not rewritten — the requirements folder is not
   append-only, but a `🏁 done` requirement gets a **new number** rather than an
   edit ([process, step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)).
3. **The 30-second core loop must not gain a control.** Net button count goes
   **down** by one (four time-period buttons out, three remaining-duration
   buttons in), and one element (`#kennzahlen`) is removed from the page. This
   requirement subtracts.
4. **No new colour meaning.** The dots, the three colours and their single
   source are untouched (A-7/E4, A-10/E2). No fourth colour, no second scale.
5. **`--amber` is still not a text colour.** The number joins the label inside
   the button, in `--text` on `--surface` (or `--accent-contrast` on `--accent`
   when active) — never in the traffic-light colour. The
   `CLAUDE.md` trap is avoided by construction, and verified by computation in
   both schemes anyway.

## Decisions (with rationale)

**E1 — The "Zeitraum" group is replaced by a remaining-duration group, not
merely deleted.** *Decided by the idea's originator.* Deleting outright was on
the table and is defensible (the honest minimum, maximum layout gain). It was
rejected because the freed slot can carry an axis that demonstrably splits the
data — 177 → 31 / 84 — and because it answers the question the dead filter was
*trying* to answer ("do I have to plan around this, or is it gone next week?"),
just from the end of the interval instead of the start. *Discarded:* removing it
with no replacement; keeping it as a reserve for a possible future data
delivery (a control that lies today in exchange for maybe telling the truth
later is a bad trade — E6 covers that case without a visible control).

**E2 — The result counts move into the closure-severity buttons; the strip
above the list is removed.** *Decided by the idea's originator.* Two elements
on one screen showed the same three-way split — one that could filter without
saying how much, one that said how much without filtering. They merge into the
control that already existed. `#kennzahlen`, `renderMetrics()` and `.kennzahlen`
go; the buttons read `Alle · ● 45 Voll · ● 118 Teil · ● 14 Gering`.
*Discarded:* making the chips clickable **in addition** (two controls for one
state that must mirror each other, the exact defect being fixed); leaving the
chips display-only (keeps the duplication, which is what prompted this).

**E3 — A chip's number excludes its own filter (facet counting).** *Decided by
the idea's originator.* Each severity button reports how many cases its own
click would yield, computed over all **other** active filters — remaining
duration, mode of transport, radius search — but not over the severity filter
itself. With `Voll` active and 45 in the list, the row still reads
`45 Voll · 118 Teil · 14 Gering`, and the numbers only move when a *different*
filter changes. This is what makes them usable as a control: the alternative
reads `45 Voll · 0 Teil · 0 Gering`, i.e. a button captioned "0 Teil" that
delivers 118. **This supersedes A-10/E1** ("the metrics describe the filtered
set") for the severity numbers; that decision was correct for a passive strip
and is wrong for a control. The total in the status line keeps describing the
filtered set exactly as today, so the page is not inconsistent — it states one
number about the result and three about the alternatives.
*Discarded:* counting the filtered set (see above); showing both ("45 of 177
Voll" — doubles every number in a control that has to stay narrow).

**E4 — The existing "Alle" button is the reset; it carries no number.**
*Decided by the idea's originator* (the fork was "click the active chip again"
vs. "a leading Alle chip"). The group already has `Alle` at
`index.html:189` with the same mechanics as the other two groups — the chosen
option costs nothing to build and adds no hidden gesture. It stays **without** a
count: the total already appears in the status line as "177 Baustellen", and
printing it twice would re-create precisely the double count that #21 removed.
*Discarded:* toggle-off on the active chip (narrower, but an undiscoverable
gesture, and inconsistent with the two neighbouring groups).

**E5 — Labels: group `Endet in`, buttons `Alle · 7 Tagen · 30 Tagen` (EN:
`Ends within` · `All · 7 days · 30 days`).** The group label carries the verb so
the buttons stay short; `7 Tagen` alone under a label reading `Restdauer` could
be misread as "running *for* 7 days". Short labels are not cosmetic here —
#33 measured that this row's width is the binding constraint on a phone, and
`Endet in: 7 Tagen` is materially narrower than today's `Heute aktiv`.
The 7-day threshold is not new: it is A-10/E3's, already in
`ENDET_BALD_TAGE`. *Discarded:* `Restdauer · ≤ 7 Tage · ≤ 30 Tage` (precise, but
a maths glyph in a citizens' app), and a third bucket for long-runners (> 90
days, 43 cases — a curiosity, not a "does this affect me" question).

**E6 — A guard in `data/QUALITY.md` for the case where the source starts
delivering planned cases.** *Decided by the idea's originator.*
`scripts/quality-report.mjs` gains a line "Vorgänge mit Startdatum in der
Zukunft: N" (and, symmetrically, already-ended ones). Today both are 0; if the
city ever extends the dataset, it shows up in the committed report instead of
staying invisible — and then E1 can be revisited with evidence. It is an
**observation, not a defect**: it must not enter `summarizeQuality()`'s
`problems` total, the same distinction A-7/E9 drew for `hasArea`.
*Discarded:* no guard (a source change would only be noticed by accident); a
failing test (a data-source change is not a repo defect and must not turn
`npm test` red — `CLAUDE.md`'s "a guard must not permanently turn `npm test`
red").

**E7 — `summarize()` loses `endetBald`; the threshold becomes a filter
predicate.** With A-10's fourth chip gone, `endetBald` has no reader, and a
returned field with no reader rots. `ENDET_BALD_TAGE` **stays** in
`src/lib/stats.js` — it is now the remaining-duration filter's 7-day value — and
a new pure `endetInnerhalb(props, tage, now)` next to it replaces the old
`matchesZeitraum`. Both stay in `src/lib/`, so `scripts/test-stats.mjs` covers
the new predicate; inside `app.js` it would be unreachable for `npm test`
(A-10/E5's reasoning, unchanged). *Discarded:* keeping `endetBald` "in case"
(dead return value); putting the predicate in `app.js` (untestable); putting it
in `format.js` (shared with the build script, which has no use for it).

**E8 — No ADR.** No architectural decision: no new data artifact, no
persistence, no external host, no new subsystem, no change to the pipeline or
to `data/baustellen.geojson`. The reversals this requirement performs are
product decisions and are recorded here, which is where a later reader will
look for them.

## Superseded decisions

Named explicitly so nothing drifts silently:

| Decision | Was | Becomes |
|---|---|---|
| A-10/E1 | metrics describe the filtered set | **superseded for the three severity numbers** (E3, facet counting). The status-line total still describes the filtered set. |
| A-10/E4 | the strip stays outside the `aria-live` region | **moot** — the strip is gone; the numbers now live inside buttons in `<section class="filters">`, which has no live semantics. `#list-status`'s announced text is unchanged, which is what E4 was protecting. |
| A-10/E6 | a count of 0 hides its chip; an empty result hides the strip | **superseded** (E2/E4). A control may not vanish when its count reaches 0 — that is exactly when the user needs it to get back. Zeros are shown. |
| A-10/E2, E5, E7 | dots not coloured text · counting in `src/lib/stats.js` · derived at render time, nothing stored | **untouched, all three.** |
| `BACKLOG.md` #21 | stat tiles display-only, not clickable | **reversed** (tension 1). Its double-count resolution stands (E4). |

## Scope / Non-scope

- **In:**
  - `matchesZeitraum` → a remaining-duration filter (`Alle` / ≤ 7 days /
    ≤ 30 days) in the same slot, driven by the existing generic `wireFilters()`.
  - Facet counts rendered into the three closure-severity buttons (E3);
    `#kennzahlen`, `renderMetrics()` and `.kennzahlen` removed.
  - `currentFiltered()` split so the counts can be computed without the
    severity filter.
  - `endetInnerhalb()` in `src/lib/stats.js` + tests; `endetBald` removed from
    `summarize()` and from `scripts/test-stats.mjs`.
  - i18n: six keys in, five out, DE and EN.
  - `scripts/quality-report.mjs`: the future-start / already-ended observation
    (E6) + coverage in `scripts/test-quality.mjs`.
  - `CACHE_SHELL` v18 → v19.
- **Out:**
  - Any change to `scripts/build-data.mjs`, to the WFS query, or to
    `data/baustellen.geojson`'s schema. The source's date behaviour is observed,
    not worked around.
  - A third remaining-duration bucket, a free date picker, or a "long runners"
    filter.
  - Counts on the mode-of-transport buttons. The same facet argument applies
    there, but it is four more numbers in the row that is already the width
    constraint (#33) — a separate question, deliberately not answered here.
  - Any change to map, markers, popups, areas, selection/hover (A-7/A-9),
    radius search, the "Was ist neu?" feed, or the PWA behaviour beyond the
    version bump.
  - A-11 (selection without a map zoom) is `✅ ready` and untouched; the two
    requirements share no code path.

## Specification

### UX flow & states

The filter row becomes, left to right:

```
ENDET IN                    SPERRGRAD                                VERKEHRSMITTEL
[Alle][7 Tagen][30 Tagen]   [Alle][●45 Voll][●118 Teil][●14 Gering]  [Alle][zu Fuß][Rad][Auto][ÖPNV]
```

and `#kennzahlen` under the status line is gone.

| State | "Endet in" group | Severity buttons | Status line |
|---|---|---|---|
| Loading (no data yet) | rendered, `Alle` active | rendered, **no numbers yet** | "Baustellen werden geladen …" (unchanged) |
| Data loaded, no filter | `Alle` active | `Alle` active, three counts summing to the total | unchanged |
| Severity filter active | unchanged | counts **unchanged** (E3), active button `is-active` + `aria-pressed="true"` | reflects the filtered count, as today |
| "Endet in 7 Tagen" active | that button active | counts recomputed **within** those 31 cases | reflects the filtered count |
| A count is 0 | — | button stays visible, enabled, reads `0 Gering` (E2/A-10-E6 superseded) | — |
| Result empty | unchanged | counts read 0 where applicable; the controls stay | unchanged empty message |
| Load error / no data | rendered, inert | rendered without numbers | unchanged error message |
| Offline (A-3) | unchanged | counts derived from the cached snapshot | unchanged, footer marks offline |

Before data arrives the buttons must show the bare labels (`Voll`), not
`0 Voll` — a zero that means "not loaded yet" is a lie the user cannot
distinguish from a real zero.

### Interaction with existing features

- **Radius search:** the facet counts are computed *after* the radius reduction,
  so they describe alternatives within the searched area. Falls out of the split
  automatically (the radius branch stays at the end of the chain); no separate
  path.
- **Language switch:** `wireLanguageToggle()` calls `applyI18n()` **and**
  `render()`. Labels are static markup (`data-i18n`), the numbers are
  JS-written, so both follow existing paths. The number must be written into a
  **separate `<span>`** inside the button, never by replacing the button's
  `innerHTML` — `applyI18n()` writes into the `data-i18n` span and would
  otherwise overwrite it (or be overwritten, depending on order).
- **Colour scheme (A-8):** no new token. `.segments button` /
  `.segments button.is-active` / `.dot-*` are all defined in the base palette
  and in **both** dark blocks; nothing is added, so `test-theme.mjs`'s
  token-by-token comparison has nothing new to compare.
- **Selection / hover (A-9):** untouched. Removing `#kennzahlen` removes no
  focusable element (it had none); adding numbers adds none (the buttons were
  already in the tab order).
- **PWA (A-3):** shell files change → `CACHE_SHELL` v18 → v19. `SHELL`'s
  contents are unchanged — no file is added or removed.
- **"Was ist neu?" (A-6/#28):** untouched.

### Data model / persistence

None. No new feature property, no `localStorage` key, no new request, no new
host. `datenschutz.html` and `scripts/test-rechtstexte.mjs` need no change —
a result to verify via `npm test`, not to assume. The default filter state
changes from `zeitraum: 'heute'` to `restdauer: 'alle'`, which is in-memory
state only.

### External dependencies & fallback

None. Everything is derived from the already-loaded snapshot.

### Edge cases & error handling

- `bis` missing (`restdauer().open`) → matches **neither** 7 nor 30 days;
  reachable only under `Alle`. (0 such cases today, but the source may change.)
- `bis` in the past (`expired`) → likewise matches neither. (0 today.)
- Boundaries: `days === 7` matches "7 Tagen", `days === 8` does not;
  `days === 0` ("endet heute") matches both buckets; `days === 30` matches
  "30 Tagen", `31` does not. ≤ 7 is a strict subset of ≤ 30.
- Date parsing uses `parseDate` (local midnight), never `new Date(iso)` —
  carried over from `matchesZeitraum`'s comment (L148–150), or the filter
  disagrees with the `restdauer()` text shown on the very same card.
- An unexpected `ampel` value is ignored, never counted into a wrong bucket
  (`summarize()`'s existing behaviour, asserted by the sum check).
- Empty input → all counts 0, controls remain.
- Narrow viewports: `.segments` wraps (#33's gap-based separators handle both
  directions); no horizontal overflow at 320 px in either language.

### Accessibility

- The severity buttons keep `aria-pressed` and keyboard operation — unchanged,
  since they were already buttons. Net focusable elements on the page: **−1**
  (one time-period button removed).
- The accessible name becomes e.g. "45 Voll". The dot stays `aria-hidden`;
  colour never carries meaning alone (A-10/E2, unchanged).
- The numbers change on re-render but sit inside buttons with **no** live
  semantics, so filtering announces exactly what it announces today
  (`#list-status` only). This is A-10/E4's protection, kept by placement rather
  than by rule.
- Contrast **computed, not eyeballed**, in three states (system-follow,
  explicit `data-theme="light"`, explicit `data-theme="dark"`): button text on
  `--surface` and, when active, on `--accent`. The number is never in a
  traffic-light colour.
- No animation; `prefers-reduced-motion` has nothing to gate.

### Test plan

1. **`scripts/test-stats.mjs`** — `endetInnerhalb()`: boundaries 0/7/8/30/31
   days, `bis: null`, expired, a fixed `now` (no wall-clock dependency);
   ≤ 7 ⊂ ≤ 30. `summarize()`'s existing cases minus `endetBald`; the
   `voll + teil + gering === total` invariant stays.
2. **`scripts/test-quality.mjs`** — the E6 observation appears in the rendered
   Markdown; future-start + already-ended counts are reported; they do **not**
   enter `summarizeQuality()`'s `problems` total (the A-7/E9 distinction,
   asserted).
3. **`scripts/test-i18n.mjs`** — parity and the `data-i18n` scan cover the new
   keys automatically. It will **not** catch the five removed keys if they are
   left behind; their removal is checked by eye in the diff.
4. **`scripts/test-pwa.mjs`** — `SHELL` unchanged; the `CACHE_SHELL` bump to
   `v19` verified in the diff.
5. **Rest of `npm test`** — green unchanged. A red `test-rechtstexte.mjs` or
   `test-theme.mjs` means an invariant was touched that this requirement claims
   not to touch.
6. **Browser check (Playwright, tiles intercepted via `**tile.openstreetmap.org/**` —
   note the missing subdomain, per `CLAUDE.md`):**
   - the three severity buttons carry numbers that equal the counts derived from
     `#liste li` when no severity filter is active;
   - clicking `Voll` leaves all three numbers **unchanged** while `#liste li`
     drops to the `Voll` count (the E3 assertion — this is the one that would
     silently regress);
   - clicking `7 Tagen` changes all three numbers and the list together;
   - a radius search reduces the numbers;
   - `Alle` restores;
   - a 0-count button is present and enabled;
   - `#kennzahlen` no longer exists in the DOM;
   - `#list-status`'s `textContent` is byte-identical to a `git archive HEAD`
     checkout served on a second port;
   - the language toggle switches labels without disturbing the numbers.
7. **Width regression (#33 is the reason this is a test, not a glance):**
   `#map`'s top edge measured at 320 / 360 / 375 / 390 / 414 / 430 px, in DE
   **and** EN, against the `before/` checkout. It must not grow; at 375 px the
   current value is 447 px. Report the numbers.
8. **Contrast** computed in the three theme states; all text pairs ≥ 4.5:1.
9. **Screenshots delivered with the result** (repo convention): 414 px and
   1280 px, each light and dark, plus a `deviceScaleFactor: 3` close-up of the
   filter row — **and a genuine before-shot** from the `before/` checkout, since
   this change removes a visible element.

### Docs/backlog impact

- `docs/anforderungen/README.md`: new row A-12 (the only place status lives).
- `docs/anforderungen/A-10-kennzahlen-ergebnisliste.md`: **not rewritten.** A
  `🏁 done` requirement is the record of why it was solved that way; the
  supersession is recorded here (step 7a). One cross-reference line may be added
  under its header pointing at A-12, and nothing else.
- `docs/BACKLOG.md`: a line on #21 noting that its "display-only" decision is
  superseded by A-12, with the reason. Status stays `✅` — it was done, and it
  is now superseded, which is a different thing. **Both** the entry and the
  header summary get checked, per `CLAUDE.md`'s "states status twice" pitfall.
- `CLAUDE.md`: the `CACHE_SHELL` sentence currently says `v18`; correct it to
  `v19` in the same pass. No pitfall is invalidated by this change.
- `README.md`: no change (it does not enumerate the filters).

## Definition of Done

- [ ] The "Zeitraum" group is gone; an "Endet in" group with `Alle` /
      `7 Tagen` / `30 Tagen` sits in its slot and demonstrably splits the
      current snapshot (≈ 177 / 31 / 84).
- [ ] The three severity buttons carry counts; `#kennzahlen`,
      `renderMetrics()` and the `.kennzahlen` CSS are removed.
- [ ] Counts exclude the severity filter itself (E3), verified in the browser:
      toggling `Voll` / `Teil` / `Gering` leaves all three numbers unchanged.
- [ ] Counts do change with the remaining-duration filter, the mode-of-transport
      filter and the radius search.
- [ ] A 0 count keeps its button visible and enabled; before data loads, the
      buttons show no numbers at all.
- [ ] `Alle` resets and carries no number; the total appears exactly once on the
      page (in `#list-status`).
- [ ] `#list-status`'s announced text is unchanged versus a `before/` checkout.
- [ ] `endetInnerhalb()` lives in `src/lib/stats.js`, is DOM- and
      dependency-free, and is covered by `scripts/test-stats.mjs`;
      `endetBald` is gone from `summarize()` and its tests.
- [ ] `data/QUALITY.md` reports future-start and already-ended counts; they are
      **not** in `summarizeQuality()`'s `problems` total; `npm test` stays green
      with today's data (both are 0).
- [ ] DE and EN complete; five orphaned keys removed; the toggle switches labels
      without a reload and without disturbing the numbers.
- [ ] `CACHE_SHELL` bumped to `v19`; `SHELL` unchanged; `npm test` green.
- [ ] `#map`'s top edge is no worse than the `before/` checkout at 320, 360,
      375, 390, 414 and 430 px, in DE and EN; measured values reported.
- [ ] Contrast computed in system-follow, explicit light and explicit dark; all
      text pairs ≥ 4.5:1; no traffic-light colour used as text.
- [ ] No new `localStorage` key, no new external host, no change to
      `data/baustellen.geojson`.
- [ ] Screenshots (mobile/desktop × light/dark + close-up + before-shot)
      delivered with the result report.
- [ ] `BACKLOG.md` #21 annotated (entry **and** header); `CLAUDE.md`'s cache
      version corrected; status in `docs/anforderungen/README.md` set to
      `🏁 done`.

## Implementation steps

1. `src/lib/stats.js`: add `endetInnerhalb(props, tage, now = new Date())`
   (uses `restdauer`; `open` and `expired` both false, `days <= tage`); remove
   `endetBald` from `summarize()`; keep `ENDET_BALD_TAGE` and re-document it as
   the filter's 7-day value.
2. `scripts/test-stats.mjs`: cases per the test plan; drop the `endetBald`
   cases.
3. `src/app.js`: replace `matchesZeitraum` with `matchesRestdauer` (a thin
   wrapper over `endetInnerhalb`); change the default state to
   `restdauer: 'alle'`; split `currentFiltered()` into a base list (remaining
   duration + mode of transport + radius) and the severity filter on top.
4. `src/app.js`: delete `renderMetrics()`; add a `renderFilterCounts()` called
   from `render()` that runs `summarize()` over the **base** list and writes each
   number into its own `<span>` inside the corresponding button. Called before
   data arrives, it writes nothing.
5. `index.html`: rewrite the first `.filter-group` (`data-filter="restdauer"`,
   three buttons); add an empty count `<span>` to each of the three severity
   buttons; delete `<p class="kennzahlen" id="kennzahlen" hidden>` and its
   comment.
6. `src/lib/i18n.js`: add `filterRestdauerLabel`/`filterRestdauerAriaLabel`,
   `filterEndetIn7`, `filterEndetIn30` (DE + EN); remove `filterZeitraumLabel`,
   `filterZeitraumAriaLabel`, `filterHeute`, `filterWoche`, `filterGeplant`,
   `metricsEndetBaldOne`, `metricsEndetBaldMany`.
7. `src/styles.css`: remove the `.kennzahlen` rules (L575–590); style the count
   `<span>` inside `.segments button` if it needs anything at all (it may not);
   leave `.badge` alone — `.badge-dist` still uses it.
8. `scripts/quality-report.mjs`: the E6 observation in `analyzeQuality` +
   `renderQualityMarkdown`, deliberately **outside** `summarizeQuality()`'s
   `problems`; extend `scripts/test-quality.mjs`.
9. `sw.js`: `CACHE_SHELL` → `v19`.
10. `npm test`; then the Playwright checks, the width measurements, the contrast
    computation and the screenshots.
11. Docs: `CLAUDE.md` cache version, `BACKLOG.md` #21 annotation (entry +
    header), A-10 cross-reference line, status row in
    `docs/anforderungen/README.md`.
