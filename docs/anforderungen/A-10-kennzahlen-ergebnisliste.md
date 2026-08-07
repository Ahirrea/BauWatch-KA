# A-10 Result metrics above the list

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident who has just narrowed the view with a
filter or a radius search, I want to see at a glance how many construction
sites the current result holds and how severe they are, so that I can judge
my situation without reading every entry in the list.

**Refined on:** 2026-08-07
**Addresses PRD:** "Goals" — *"Relevance is readable in plain text"*, and the
core loop's step 3 (*"sees only what's relevant, in plain text, with a traffic
light"*). Answers for the **whole result** the question every single list
entry already answers for itself.
**Constrained by:** [ADR-001](../adr/ADR-001-statisches-hosting.md)
(everything client-side, no backend). — No new ADR needed: no data artifact, no
persistence, no external host, no new subsystem; the change lives entirely in
the render path (see E7). Depends on nothing else; A-7's and A-9's decisions
are untouched.
**Target branch:** `claude/app-statistics-nq84pw`

## Touchpoints in the code

**Checked, not guessed** — against `b81d6fe`.

| What | Where | Meaning for this requirement |
|---|---|---|
| A count already exists | `renderStatus(list)` in `src/app.js` (L456–471) | Writes `listStatusCountOne` / `listStatusCountMany` plus the radius suffix into `#list-status`. This is the anchor: the metrics extend an existing statement instead of introducing a competing one. |
| The filtered set is already computed once per render | `currentFiltered()` (L177–201), called by `render()` (L480) | `render()` hands the *same* array to `renderAreas`/`renderMarkers`/`renderList`/`renderStatus`. The metrics get the same array — they cannot drift from map and list by construction, the same property A-7 relies on. |
| Radius filtering is inside that array | `currentFiltered()` L187–199 | With an active search, the array is already reduced to the 1.5 km radius and distance-sorted. So "metrics describe the filtered set" (E1) automatically means "of the radius" too — no separate code path. |
| Remaining duration is already a pure function | `restdauer(bis, now, lang)` in `src/lib/format.js` (L106–115) | Returns `{ text, days, expired, open }`. `days ≤ 7 && !expired && !open` is the entire "ends soon" rule (E3) — nothing new to compute, and the null/open-ended cases are already modelled. |
| The traffic-light value is guaranteed to be one of three | `classifySperrgrad()` in `src/lib/classify.js` (L87–93) — the final `return AMPEL.GERING` is a total fallback | So `voll + teil + gering === total`, always. That is an assertable invariant for the test (same spirit as `test-quality.mjs` asserting `mitFlaeche + ohneFlaeche === total`), not just an assumption. |
| Traffic-light labels exist in both languages | `AMPEL_LABEL` in `src/lib/i18n.js` (L188–191) | `Vollsperrung/Teilsperrung/Geringe Behinderung` — full wording, too long for a chip row on 414 px. The short filter-button labels `filterVoll/filterTeil/filterGering` (L53–55 / L138–140) are the right register and already say exactly this. Reuse them; add no third vocabulary for the same three levels. |
| Coloured dots exist as a component | `.dot` / `.dot-red` / `.dot-amber` / `.dot-green` in `src/styles.css` (L487–500), used in the list item, the popup and the Sperrgrad filter buttons (`index.html` L190–192) | Carries the traffic-light colour **as a shape**, not as text — which is what keeps E2 out of the `--amber` contrast trap. |
| Chip surface tokens exist | `.badge` in `src/styles.css` (L606–613): `--chip` background, `--chip-border`, `--text-muted` text | A proven-in-both-schemes chip. The metrics row can reuse it instead of inventing a surface (`CLAUDE.md`'s "`--bg` is not the subtle surface" pitfall is thereby avoided rather than re-solved). |
| `#list-status` is a live region | `index.html` L214: `role="status" aria-live="polite"` | Everything placed **inside** it is announced on every filter click. That is why the chips go into a sibling element (E4) — the constraint is in the markup that already exists, not a new one. |
| Language switch re-renders | `wireLanguageToggle()` in `src/app.js` (L605–622) calls `applyI18n()` **and** `render()` | JS-built strings (status line, list items, popups) are rebuilt by `render()`; only static markup uses `data-i18n`. The chips are JS-built, so they follow the same path — no `data-i18n` attributes, and nothing for `test-i18n.mjs`'s static index.html scan to find. |
| Shell precache version | `CACHE_SHELL = 'bauwatch-shell-v13'` in `sw.js` (L25) | `src/app.js` and `src/styles.css` change, and a new `src/lib/stats.js` is added → bump to **`v14`** and add the module to `SHELL` (L33–44). Note `CLAUDE.md` still names `v12`; the bump is from what `sw.js` says today, and that sentence needs correcting in the same pass. |
| `src/lib/` holds client-only pure modules too | `src/lib/i18n.js` header comment | Precedent for E5: a pure module may be imported by the browser alone; the no-DOM/no-npm constraint still applies. |

**Missing (net-new):** the summarizing function itself; a chip strip in
`index.html` + its CSS; six i18n keys; a test script; the `SHELL` entry and
the `CACHE_SHELL` bump.

## Tension with non-goals — and resolution

1. **"Statistics" as web analytics — the near miss.** Visitor/usage counting
   would collide head-on with the PRD's *"No user account"* and *"No data
   storage of our own"*, with A-4's privacy notice, and with
   `scripts/test-rechtstexte.mjs`, which checks the frontend against exactly
   those claims. **Resolved by exclusion, and it is explicit:** this
   requirement counts *construction sites*, never visitors. No new host, no
   new storage key, no counter of any kind. The idea's originator confirmed
   this reading before refinement.
2. **The 30-second core loop must not turn into a dashboard.** The PRD's
   target user "has 30 seconds and doesn't want to read instructions". A
   full breakdown (art, Verursacher, duration histograms) at the top of the
   page would push the list below the fold on a phone for the sake of a
   question she didn't ask. **Resolved by scope:** one wrapping strip of at
   most four chips, directly attached to the count that is already there;
   the deeper "Zahlen & Fakten" view stays out (see Non-scope).
3. **No new data, no snapshot dependency.** Deriving the numbers in the build
   and shipping them in `data/baustellen.geojson` would be cheaper at render
   time — but it would add a property that is *"invisible until the next real
   data change"* (`CLAUDE.md`), and worse, one the client would **require**,
   which the same pitfall says needs the snapshot rebuilt in the same commit.
   **Resolved by deriving at render time (E7):** filter-dependent numbers
   cannot be precomputed anyway, and the app keeps working unchanged against
   both the committed snapshot and any older copy an installed service worker
   still holds.
4. **No new colour meaning on the page.** A-7/E4 established that the
   traffic-light colours mean one thing and come from one place. The chips
   reuse `.dot` + the existing three colours; they introduce no fourth colour
   and no second scale (E2).

## Decisions (with rationale)

**E1 — The metrics describe the filtered set, not all of Karlsruhe.**
*Decided by the idea's originator.* The strip sits directly above a list that
already says "173 Baustellen"; a strip reporting city-wide totals next to a
radius-filtered list would contradict its neighbour. After a radius search,
"8 Baustellen · 3 Voll" is the answer to the user's actual question.
*Discarded:* always-total (stable, never jumps — but answers a question nobody
on this page is asking), or both side by side ("3 von 46" — doubles the
numbers on screen for a gain the list cannot use).

**E2 — Chips with the existing traffic-light dots; colour never carries
meaning as text.** *Decided by the idea's originator.* Each chip is
`<span class="badge"><span class="dot dot-…" aria-hidden="true"></span> 46
Voll</span>` — colour in the dot, label in `--text-muted` on `--chip`. This is
not cosmetic: `--amber` (`#f08a00`) reaches only ~2.3:1 on `--bg` in light
mode (`CLAUDE.md`), so "98 Teil" in amber text would be a WCAG AA failure
that is invisible when testing in dark mode (~9.7:1 there). Reusing `.badge`
also inherits a chip surface already proven in both schemes.
*Discarded:* a plain text line (least code, but no visual tie to the map and a
long unbroken line on 414 px), and chips plus a proportional bar (fastest to
grasp, but a second coloured surface competing with the map for a secondary
statement).

**E2 revised (2026-08-07) — the dot itself does not reach 3:1 in light mode,
and that is accepted here rather than fixed.** The decision above stands
unchanged; what implementation disproved is the *verification criterion* this
requirement attached to it (the "dots ≥ 3:1 against the chip surface" line in
the Definition of Done), which was written before measuring. Measured, amber
`#f08a00` against the surface it actually sits on:

| Dot | Light | Dark |
|---|---|---|
| Existing, in a list item (`--surface`) | **2.52:1** | 8.64:1 |
| Existing, in a Sperrgrad filter button | **2.52:1** | 8.64:1 |
| New, in a metrics chip (`--chip`) | **2.35:1** | 7.29:1 |

Red and green clear 3:1 everywhere (light: 5.52:1 and 5.03:1). So the amber
dot has been at ~2.5:1 in light mode since the traffic light existed; the chip
is 0.17 lower only because `--chip` (#f7f7f5) is a shade darker than the white
list card. This is **not a regression introduced here**, and it is not a WCAG
1.4.11 failure either: the criterion covers graphical objects *required to
understand the content*, while this dot is `aria-hidden`, duplicates the
category word standing right next to it, and carries a 1 px dark rim of its
own. Colour is never the sole carrier — which is exactly what E2 secured.

Two alternatives were rejected. Darkening amber only for the chips would put a
**second amber** on one page and break A-7/E4 ("one colour, one meaning, one
source"). Darkening `--amber` globally reaches into the marker and area colours
of A-7/A-9 and is a colour-system change, far outside a metrics strip — it is
recorded as [`BACKLOG.md` #32](../BACKLOG.md) instead, with the numbers above,
so the finding survives this requirement.

**E3 — "Ends soon" means ≤ 7 days, and reuses the "Diese Woche"
vocabulary.** *Decided by the idea's originator.* `restdauer().days ≤ 7`,
excluding expired and open-ended entries. Seven days is not a fresh threshold
but the one the Zeitraum filter already teaches; a third span (3 days) beside
"heute" and "diese Woche" would make the user hold two week-ish concepts at
once. *Discarded:* 3 days, and omitting the metric entirely.

**E4 — The chips stay outside the `aria-live` region.** *Decided by the idea's
originator.* `#list-status` announces on every filter click; four extra
figures per click turn a useful confirmation into an interruption. The chips
sit in a sibling `<div>` with no live semantics — visible to everyone, read on
demand by a screen reader, silent while filtering. The announced sentence stays
exactly what it is today. *Discarded:* moving the breakdown into the live
region (complete, but noisy at exactly the moment the user is clicking through
filters).

**E5 — The counting lives in a new pure module `src/lib/stats.js`, not in
`app.js`.** A single exported `summarize(features, now)` returning
`{ total, voll, teil, gering, endetBald }`. `src/lib/` is where testable logic
goes in this project, and the Definition of Done requires tests for new pure
logic; inside `app.js` the function would be unreachable for `npm test`.
Client-only is an established shape there (`i18n.js`), and the no-DOM/no-npm
constraint is trivially met. Consequences to carry: the module joins `SHELL`
in `sw.js`, and `scripts/test-pwa.mjs`'s import scan enforces that.
*Discarded:* a helper inside `app.js` (untestable), and extending
`format.js` (shared with the build script, which has no use for this — the
build's counting lives in `quality-report.mjs`).

**E6 — A count of 0 hides its chip; an empty result hides the whole strip.**
With the Sperrgrad filter on "Voll", the other two categories are 0 by
definition — printing "0 Teil · 0 Gering" is noise produced by the user's own
filter. Same for "0 enden in 7 Tagen" under "Bald geplant", where nothing has
started yet. When the list is empty the strip disappears entirely; the status
line's existing "Keine Baustellen für diese Filter …" already says everything
there is to say. *Discarded:* always showing all four chips (uniform, but pads
the strip with zeros), and suppressing the traffic-light chips whenever the
Sperrgrad filter is active (removes the redundancy, but a special case is
harder to predict than one uniform rule).

**E7 — Derived at render time; nothing is stored, sent, or written.** No new
property in `data/baustellen.geojson`, no `localStorage` key, no request. Two
checked invariants therefore stay untouched by this requirement:
`test-rechtstexte.mjs`'s storage and external-host guards, and the
"commit only on a real data change" rule for the snapshot. Cost is negligible
— one pass over ≤ ~200 features per render, on the same array the render path
already walks four times.

## Scope / Non-scope

- **In:**
  - A metrics strip below `#list-status`, above the list: total is already in
    the status line; the strip adds up to four chips — Voll / Teil / Gering
    (with dots) and "N enden in 7 Tagen".
  - Numbers describe the currently filtered set, including an active radius
    search (E1).
  - New pure module `src/lib/stats.js` + `scripts/test-stats.mjs`, wired into
    `npm test`.
  - DE/EN strings for the new labels; both palettes; `SHELL` entry and
    `CACHE_SHELL` bump.
- **Out:**
  - **Any form of usage/visitor statistics or analytics** — see tension 1.
  - The "Zahlen & Fakten" dialog (breakdown by art/Verursacher, longest-running
    site, share affecting foot/bike). Deliberately deferred; if wanted, its own
    number later.
  - Any time series / historical trend. Would need a new committed artifact
    (`data/stats-history.json`), a retention rule and a backfill from the Git
    history of `data/baustellen.geojson` — architectural, so its own
    requirement **and** an ADR.
  - Per-district density (needs a second dataset with its own licence question)
    and closure area in m².
  - Any change to filters, map, markers, popups, list items, the data pipeline
    or the PWA behaviour beyond the version bump.

## Specification

### UX flow & states

| State | Status line (`#list-status`) | Metrics strip |
|---|---|---|
| Loading | "Baustellen werden geladen …" (unchanged) | hidden |
| Result ≥ 1 | unchanged, incl. radius suffix | visible, chips with count > 0 only |
| Result = 0 (filters) | unchanged empty message | hidden (E6) |
| Result = 0 (radius) | unchanged empty message | hidden |
| No data / load error | unchanged message | hidden |
| Offline (A-3, cached snapshot) | unchanged, footer marks offline | visible — derived from whatever was loaded |

Wording (DE / EN): `● 46 Voll` / `● 46 Full`, `● 98 Teil` / `● 98 Partial`,
`● 11 Gering` / `● 11 Minor`, `12 enden in 7 Tagen` / `12 end within 7 days`,
singular `1 endet in 7 Tagen` / `1 ends within 7 days`. The three level words
are the existing `filterVoll/filterTeil/filterGering` values (no new
vocabulary); the "ends soon" chip needs two new keys per language.

### Interaction with existing features

- **Filters / radius search:** recomputed on every `render()` from the same
  array; no separate invalidation path, so the strip cannot go stale.
- **Language switch:** `wireLanguageToggle()` already calls `render()`; the
  chips are rebuilt from `STRINGS[state.lang]` like the status line. No
  `data-i18n` attributes.
- **Colour scheme (A-8):** chips use `--chip`/`--chip-border`/`--text-muted`
  and the three dot colours — all defined in the base palette *and* both dark
  blocks. No new token; if one were added it would have to go into **both**
  dark blocks (`test-theme.mjs` compares them token-by-token).
- **Selection / hover (A-9):** untouched. The strip is not interactive and adds
  no focusable element, so tab order and the focus-preview path are unchanged.
- **PWA (A-3):** shell files change → `CACHE_SHELL` v13 → v14, and
  `src/lib/stats.js` into `SHELL`.

### Data model / persistence

None. No new feature property, no `localStorage` key, no new request or host.
`datenschutz.html` and `test-rechtstexte.mjs` need no change — and that is a
result to verify, not to assume (`npm test` covers it).

### External dependencies & fallback

None. The strip is a pure function of the already-loaded snapshot; offline it
simply describes the cached data, consistent with the rest of the page.

### Edge cases & error handling

- `bis` missing → `restdauer().open` → **never** counted as ending soon.
- `bis` in the past → `expired` → not counted as ending soon (such entries are
  reachable under Zeitraum "Alle").
- Boundary: `days === 7` counts, `days === 8` does not, `days === 0` ("endet
  heute") counts.
- Singular/plural for the "ends soon" chip (1 vs. n); the three level chips
  need no plural (the label is a category name).
- An unexpected `ampel` value (should be impossible — `classifySperrgrad` has a
  total fallback) must not throw and must not be silently counted into a wrong
  bucket; it is ignored, and the test asserts the three buckets sum to `total`
  for real data shapes.
- Empty input array → all zeros, strip hidden.
- Very narrow viewports: the strip wraps (`flex-wrap`), it never scrolls
  horizontally or truncates a number.

### Accessibility

- Dots are decorative (`aria-hidden="true"`); each chip carries its category as
  a word, so the information never depends on colour alone.
- The strip is **not** a live region (E4); `#list-status`'s announcement is
  byte-for-byte what it is today.
- Contrast: chip text is `--text-muted` on `--chip`, the same pair `.badge`
  already uses. **Computed, not eyeballed**, in three states — system-follow,
  explicit `data-theme="light"`, explicit `data-theme="dark"` — per
  `CLAUDE.md`; the amber dot is a shape, not text, and is therefore not a text
  contrast case (its non-text contrast against `--chip` is checked all the
  same, ≥ 3:1).
- No animation, so `prefers-reduced-motion` has nothing to gate.
- The strip is a `<p>`/`<div>` of plain text, reachable in reading order right
  before the list it describes.

### Test plan

1. **`scripts/test-stats.mjs` (new, added to `npm test`)** — pure, no network:
   counts per traffic-light level; `voll + teil + gering === total`; ends-soon
   boundaries (0, 7, 8 days, expired, `bis: null`); empty input; unknown
   `ampel` value tolerated; a fixed `now` is passed in (no wall-clock
   dependency).
2. **`scripts/test-i18n.mjs`** — covers the new keys automatically via the
   DE/EN parity and non-empty checks; must stay green.
3. **`scripts/test-pwa.mjs`** — enforces `src/lib/stats.js` in `SHELL` via the
   import scan; the `CACHE_SHELL` bump is manual and must be verified by eye
   in the diff.
4. **`scripts/test-rechtstexte.mjs` / `test-theme.mjs` / the rest of
   `npm test`** — must stay green unchanged; a red here means an invariant was
   touched that this requirement claims not to touch.
5. **Browser check (Playwright, tiles intercepted):** chips render; the numbers
   equal the counts derived from `#liste li` in the DOM; a filter click updates
   them; the Sperrgrad filter makes the other two chips disappear (E6); an
   empty result hides the strip; the language toggle switches the labels;
   `#list-status`'s `textContent` is unchanged versus a `before/` checkout
   (E4). Contrast computed in the three theme states.
6. **Screenshots delivered with the result** (repo convention): 414 px and
   1280 px, each light and dark, plus a `deviceScaleFactor: 3` close-up of the
   strip.

### Docs/backlog impact

- `docs/anforderungen/README.md`: new row A-10 (the only place status lives).
- `CLAUDE.md`: the `CACHE_SHELL` pitfall names `v12` while `sw.js` is at `v13`
  — correct it to the post-merge value in the same pass.
- `docs/PRD.md`: no change. The strip serves the existing goal "relevance is
  readable in plain text"; it adds no new product promise.
- `docs/BACKLOG.md`: no new entry.

## Definition of Done

- [ ] Metrics strip renders below the status line for a non-empty result and
      is hidden for loading / empty / error states.
- [ ] Numbers always match the rendered list (filters **and** radius search),
      verified in the browser against the DOM, not by inspection.
- [ ] Chips carry the traffic-light colour as a dot; no traffic-light colour is
      used as text anywhere in the new markup.
- [ ] `#list-status`'s announced text is unchanged; the strip carries no live
      semantics.
- [ ] Zero-count chips are omitted (E6).
- [ ] DE and EN complete; the toggle switches the strip without a reload.
- [ ] `src/lib/stats.js` is DOM-free, dependency-free, and covered by
      `scripts/test-stats.mjs`; `npm test` green including the new script.
- [ ] `src/lib/stats.js` in `SHELL`, `CACHE_SHELL` bumped to `v14`.
- [ ] Contrast computed in system-follow, explicit light and explicit dark; all
      text pairs ≥ 4.5:1. For the dots, the criterion is **parity with the
      traffic-light dots already on the page**, not an absolute 3:1 — see
      *E2 revised*, which records why and with which measurements.
- [ ] No new `localStorage` key, no new external host, no change to
      `data/baustellen.geojson`.
- [ ] Screenshots (mobile/desktop × light/dark + close-up) delivered with the
      result report.
- [ ] Status in `docs/anforderungen/README.md` set to `🏁 done`.

## Implementation steps

1. `src/lib/stats.js`: `summarize(features, now = new Date())` →
   `{ total, voll, teil, gering, endetBald }`, importing `restdauer` from
   `format.js`. Pure, documented, no DOM.
2. `scripts/test-stats.mjs` per the test plan; add it to the `test` script in
   `package.json`.
3. Six new keys in `src/lib/i18n.js` (DE + EN): the "ends soon" chip
   (singular/plural) and an `aria-label` for the strip if one proves useful;
   reuse `filterVoll/filterTeil/filterGering` for the level words.
4. `index.html`: an empty container element for the strip, as a **sibling**
   after `#list-status`, before `#liste`.
5. `src/app.js`: import `summarize`, render the strip from `renderStatus()`'s
   list (or a sibling `renderMetrics(list)` called from `render()`), applying
   the zero-suppression rule.
6. `src/styles.css`: layout for the strip (`flex`, `wrap`, gap) reusing
   `.badge`/`.dot`; no new colour token.
7. `sw.js`: `src/lib/stats.js` into `SHELL`, `CACHE_SHELL` → `v14`.
8. `npm test`; then the Playwright checks and screenshots.
9. Docs: `CLAUDE.md` cache-version sentence, status row in
   `docs/anforderungen/README.md`.
