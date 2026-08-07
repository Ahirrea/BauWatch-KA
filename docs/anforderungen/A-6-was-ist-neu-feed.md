# A-6 "What's new?" feed

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident who checks the site every so often
(not on every visit), I want to see at a glance what changed recently in the
construction-site data, so that I don't have to compare the map/list myself
or dig through a raw Git changelog on GitHub.

**Refined on:** 2026-07-27
**Addresses PRD:** "Feature scope (v1)" (the stats bar/list already surface
the current state; this adds the *recent-change* view) and the non-goal "No
real push" — this is the explicitly-allowed pull/on-demand counterpart,
same category as [A-2](./A-2-baustellen-abo-feed.md).
**Constrained by:** — (no ADR needed; see "Decisions" for why this
deliberately does *not* touch [ADR-003](../adr/ADR-003-sprachumschalter-localstorage.md)'s
`localStorage` boundary)
**Target branch:** `claude/whats-new-feed-mo822j`

## Touchpoints in the code

**Checked, not guessed.**

| What | Where | Meaning for this requirement |
|---|---|---|
| The change diff already exists in full | `diffFeatures` in `scripts/diff-data.mjs` — `added`/`removed`/`changed` (the latter with human-readable field notes via `fieldChanges`/`WATCH_FIELDS`) | Exactly the data this feature needs. Nothing new to compute — same source [A-2](./A-2-baustellen-abo-feed.md) already earmarked for its Atom feed. |
| Human-readable changelog | `data/CHANGELOG.md`, written by `prependChangelog()`/`summaryMarkdown()` in `scripts/build-data.mjs`, only when `hasChanges(diff)` | Today the **only** place a person can see "what changed," and only as a raw Markdown file linked straight to GitHub from `index.html`'s footer ("Änderungsverlauf"). Not designed for the PRD's target user ("no expert audience") — reading raw Markdown on github.com is exactly the kind of "data-catalog" experience the PRD says this project exists to avoid. |
| Pre-generate-and-commit pattern | `build-data.mjs` writes `data/baustellen.geojson`, `data/CHANGELOG.md`, `data/QUALITY.md` atomically, only on a real change | A JSON changelog artifact slots into the same place, no new mechanism. |
| Data fetch + offline marking | `loadData()` in `src/app.js`, `datenAntwort()`/network-first handling for `data/baustellen.geojson` in `sw.js` | The pattern this feature's own data fetch should mirror — same network-first-with-offline-marker treatment, extended to a second data file. |
| Segmented UI patterns, header layout | `index.html` header, `src/styles.css` | A new header **button** (not a filter) is the natural trigger; the header is already flagged as vertically tight on desktop ([BACKLOG.md](../BACKLOG.md) #23, still open) — a strong argument *against* adding another permanent block there. |
| Bilingual chrome | `src/lib/i18n.js` (A-5) | Directly reusable: the feed's UI chrome (button label, dialog title, empty/error text, "added"/"removed"/"changed" labels) is exactly the kind of string this dictionary already holds. |
| `localStorage` boundary | [ADR-003](../adr/ADR-003-sprachumschalter-localstorage.md) | Explicitly scopes its exception to **one** anonymous value (the language flag) and explicitly lists "no usage history" as a thing that must not happen under it. Directly relevant because a naive "since you were last here" marker would be exactly that — see Tensions and Decisions. |
| Shell precache | `sw.js`, `SHELL`, `CACHE_SHELL` (currently `v5`) | `index.html` and `src/app.js` change (new trigger + dialog) → shell files change → version bump required, same trap as every prior feature. |

**Missing (net-new):** a JSON changelog artifact (`data/changelog.json`), a
trigger button + `<dialog>` in `index.html`, the fetch/render logic in
`src/app.js`, a second network-first data path in `sw.js`, and the new i18n
strings.

## Tension with non-goals — and resolution

1. **Non-goal "No real push."** A feed can read as a step toward push
   notifications. → **Resolved, same reasoning as A-2:** this is strictly
   **pull** — the visitor opens a dialog on demand, nothing is pushed to the
   device, no service-worker `push`/`notificationclick`/`sync` handler is
   added or needed (`scripts/test-pwa.mjs` already guards their absence and
   keeps guarding it).
2. **Non-goal "No data storage of our own."** → Resolved the same way A-2
   resolves it: `data/changelog.json` is another **committed artifact
   derived from data the build already produces**, not a new, user-related
   store. Nothing about a visitor is recorded anywhere.
3. **[ADR-003](../adr/ADR-003-sprachumschalter-localstorage.md)'s
   narrow `localStorage` exception, "no usage history" clause.** A
   personalized "what's new *for me*" marker would need to remember what a
   given visitor has already seen — precisely the kind of per-visitor
   history ADR-003 draws its line against, and ADR-003 explicitly scopes
   its exception to *only* the language flag, not to "anonymous client state
   in general." → **Resolved by decision, made together with the idea's
   originator (see Decisions/E2): no personalization in this requirement.**
   The feed shows the same fixed recency window to everyone. No new
   `localStorage` key, no new ADR, ADR-003's boundary stays untouched. If a
   personalized variant is wanted later, it gets its own ADR then — not
   smuggled in here.
4. **`src/lib/` must stay DOM-/network-/dependency-free.** → No pure module
   is strictly required for this narrow a feature (see Decisions/E4); if
   the render mapping grows non-trivial during implementation, it moves
   into a pure helper rather than growing inside `app.js`'s DOM code.
5. **Relationship to A-2 (not a conflict, but worth naming explicitly).**
   A-2 (✅ ready, not yet implemented) plans a **static Atom feed** for
   external feed readers, from the same diff. This requirement is the
   **in-app, visual** counterpart for people who just open the site — the
   two don't duplicate each other's audience and can both exist; whichever
   is implemented first doesn't block the other. `data/changelog.json`
   (this requirement) and `feeds/alle.xml` (A-2) could later share a
   generation step, but that's an implementation nicety, not a dependency.

## Decisions (with rationale)

**E1 — Presentation: a modal dialog, not a standalone page or an always-open
panel.** Chosen by the idea's originator over a new `neuigkeiten.html` page
(the ADR-002-consistent option, discarded here because it needs its own
`SHELL`/`CACHE_SHELL` entry and a second navigable page for a feature this
narrow) and over an inline collapsible panel on `index.html` (discarded
because it would permanently grow the header, working directly against the
still-open desktop vertical-space finding, [BACKLOG.md](../BACKLOG.md) #23).
A modal keeps the header to a single small trigger button and never grows it
further, at the cost of needing solid dialog accessibility (focus trap,
`Escape`, focus return) — native HTML `<dialog>` with `showModal()` provides
exactly that without a library, fitting the "no build step" constraint.

**E2 — No personalization: a fixed recency window, same for every
visitor.** Chosen by the idea's originator over a "since your last visit"
marker. *Discarded:* a single last-visit timestamp in `localStorage` (would
have needed a new ADR extending ADR-003's exception to a second, still
narrowly-scoped case — feasible, but not chosen); per-entry "seen" tracking
(explicitly the "usage history" ADR-003 already rules out — not
reconsidered). Consequence: **no new `localStorage` key at all**, no ADR
needed, `scripts/test-rechtstexte.mjs` needs no change for this feature.

**E3 — Window size: the last 30 days, no floor, no separate cap.** A plain
constant in `build-data.mjs`, not an architectural decision — easy to retune
later. Naturally self-bounding: pruning happens on every write, so
`data/changelog.json` never grows unbounded. An empty window (quiet month,
or a fresh fork before the first Action run) is a valid, honestly-labeled
empty state, not a bug to engineer around.

**E4 — No new `src/lib/` module for now.** The entries in
`data/changelog.json` are already exactly what the dialog needs to render
(titles, change notes) — no date-math or classification is required beyond
what `diff-data.mjs` already produces. `app.js` maps JSON → DOM directly, the
same way it already renders the list. If the render logic grows non-trivial
during implementation, it should move into a pure module rather than being
grown inline — noted here so it isn't forgotten, not because it's needed on
day one.

**E5 — Interaction with the map/list: none, deliberately deferred.** Chosen
by the idea's originator over making feed entries clickable (jump to the
site on the map if it's still active). Kept out for the same reason A-2
kept its scope to "one global feed, no facets": a small, self-contained v1
first, click-through as a later, separate enhancement if there's demand.

**E6 — Language boundary follows the A-5 precedent exactly.** The dialog's
*chrome* (trigger label, dialog title, "added"/"removed"/"changed" labels,
empty/loading/error text) is bilingual via `src/lib/i18n.js`, same as the
rest of `index.html`. The *quoted content* inside each entry (construction-site
titles, "Verursacher," free-text change notes) stays German-only — it's a
verbatim quote of the same raw city data the main list already leaves
untranslated (PRD, "raw dataset text… isn't translated either"). This isn't
a new boundary, just the existing one applied to a new piece of UI, so it's
stated here as a decision rather than asked as an open fork.

**E7 — `sw.js`'s data-path handling generalizes from one file to a small,
explicit set.** `DATA_URL`/`DATA_PATH` today hard-codes
`data/baustellen.geojson`. Adding `data/changelog.json` as a second
network-first path is a mechanical extension of the *existing* rule ("data:
network-first, shell: cache-first") from `CLAUDE.md`, not a new rule — kept
here as an implementation note, not something that needs its own ADR.

## Scope / Non-scope

- **In:** a header trigger button ("What's new?" / "Was ist neu?"); a
  native `<dialog>` modal listing change entries from the last 30 days,
  newest first, grouped by run with added/removed/changed markers and the
  existing field-change notes; `data/changelog.json` as a new,
  pruned-on-write build artifact; `sw.js` serving it network-first with the
  same offline-marking family as the main data file; loading/empty/error
  states; full keyboard/screen-reader operability of the dialog; bilingual
  chrome (E6).
- **Out, with rationale:**
  - Personalized "new since your last visit" marking, and any new
    `localStorage` key for it (E2) — its own future requirement + ADR if
    ever wanted.
  - Clicking a feed entry to jump to/highlight the site on the map (E5) —
    later enhancement.
  - A standalone page/URL for the feed (E1) — a modal was chosen instead.
  - Faceted feeds (by traffic light, mode of transport, etc.) — same "keep
    it to one global stream" reasoning A-2 already applied; nothing here
    prevents adding facets later.
  - Prefetching `data/changelog.json` at service-worker **install** time
    (unlike the special-cased `baustellen.geojson` prefetch) — see edge
    cases below; a documented limitation, not a silent gap.
  - Any change to A-2 itself — A-2 stays exactly as elaborated, unaffected
    by whichever of the two gets implemented first.

## Specification

### UX flow & states

A small button in the app header (near the language toggle, sized so it
doesn't add a new visual row) opens the dialog on click/`Enter`/`Space`.
`showModal()` gives a native focus trap, top-layer rendering, and `Escape`-
to-close for free. Inside: a heading ("What's new?"), a one-line note on the
covered window ("Changes from the last 30 days"), an explicit close button,
and the entry list — newest run first, each run showing a human-readable
timestamp and its ➕ added / ➖ removed / ✏️ changed items (mirroring
`data/CHANGELOG.md`'s existing shape, just rendered instead of raw Markdown).
While `data/changelog.json` is being fetched, the dialog already shows its
frame with a "Loading…" placeholder inside — no flash of empty content. On
close (button, `Escape`, or backdrop click), focus returns to the trigger
button, same guarantee `index.html`'s other controls already give.

### Interaction with existing features

None, by decision (E5). Opening/closing the dialog doesn't touch filters,
the map, the list, or the address search; it's an independent, self-
contained view layered on top.

### Data model / persistence

New build artifact `data/changelog.json`, written by `build-data.mjs` in the
same `hasChanges(diff)` branch as `data/CHANGELOG.md`, pruned to entries
from the last 30 days on every write (E3). No new `localStorage` (E2). Draft
entry shape (one element per build run that changed something):

```json
{
  "stand": "2026-07-27T19:48:00+02:00",
  "firstFill": false,
  "hinzugefuegt": ["Titel A", "Titel B"],
  "entfernt": ["Titel C"],
  "geaendert": [
    { "titel": "Titel D", "changes": ["Ende: 2026-07-31 → 2026-09-04"] }
  ]
}
```

`stand` is the real change timestamp (same source as `CHANGELOG.md`'s
header line), never the run time — the same "no per-run-volatile values"
invariant `CLAUDE.md` already calls out for the GeoJSON file.

### External dependencies & fallback

None new. `data/changelog.json` is same-origin, same-shape trust as
`data/baustellen.geojson` — no third-party call, no new entry needed in
`datenschutz.html`'s data-flow table.

### Edge cases & error handling

| Case | Behavior |
|---|---|
| Fetch fails (offline, and no prior cached copy) | Dialog still opens; content area shows "Not available offline" instead of a broken fetch or a silent blank. Documented limitation, not prefetched at SW install time (unlike `baustellen.geojson`). |
| No changes in the last 30 days | Neutral empty state ("No changes in the last 30 days") — a true and useful statement, not an error. |
| Fresh fork, before the first Action run | Same empty state as above; nothing crashes on a missing file. |
| `firstFill` run (seed data replaced by the first real fetch) | One synthetic entry ("Initial fill with N construction sites"), not a flood of individual "added" lines — mirrors `CHANGELOG.md`'s existing `firstFill` handling. |
| `data/changelog.json` missing or malformed | Treated like a fetch failure — caught, shown as the same "not available" state, never a page-level crash. |
| Dialog opened, then language toggled while open | Chrome re-renders in the new language immediately (same `render()`-on-toggle pattern A-5 already established); quoted raw content is unaffected either way (E6). |

### Accessibility

Native `<dialog>` + `showModal()`: built-in focus trap and top-layer
rendering, `Escape` closes it natively, `::backdrop` gets a click handler to
close too. `aria-labelledby` points at the dialog's own heading. An explicit,
visible close button (not just relying on `Escape`, which isn't discoverable
by touch). Focus returns to the trigger button on any close path. The
trigger button itself is a normal, tab-reachable `<button>`. Entry list uses
real `<ul>/<li>` markup. Respects `prefers-reduced-motion` (no more than an
instant/near-instant open, matching the existing update-banner's restraint
from A-3). The loading→content swap happens inside the already-open,
already-focused dialog, so no extra page-level live region is needed beyond
what the dialog's own content provides.

### Test plan

**A new pure-Node test (e.g. `scripts/test-changelog-feed.mjs`, wired into
`npm test`):**
- `build-data.mjs` writes `data/changelog.json` only when `hasChanges(diff)`
  is true (mirrors the existing invariant test style for `CHANGELOG.md`).
- Content matches `data/CHANGELOG.md`'s diff 1:1 for the same run — no drift
  between the two artifacts (same anti-drift discipline as
  `test-attribution.mjs`/`test-rechtstexte.mjs`).
- 30-day pruning drops entries older than the window and keeps the rest.
- `firstFill` collapses to the one synthetic entry, not per-item noise.
- Output is well-formed JSON with no per-run-volatile fields.

**`scripts/test-pwa.mjs`:** extend (or confirm coverage of) the data-path
network-first check to include `data/changelog.json` alongside
`data/baustellen.geojson` (E7); confirm `CACHE_SHELL` bump is present once
`index.html`/`app.js` change.

**Browser (Playwright), per the "Web/mobile workflow" convention:** open the
dialog, check `role="dialog"`/focus trap/`Escape`-close/focus-return, verify
the empty state (with tiles + `data/changelog.json` intercepted/aborted),
verify chrome re-translates on language toggle while a quoted entry stays
German. Screenshots mobile+desktop, light+dark, per existing convention.

### Docs/backlog impact

- `docs/anforderungen/README.md`: this row → `✅ ready` now, `🏁 done` on
  completion.
- `README.md`: a short "What's new" section once implemented.
- `CLAUDE.md`: a line about `data/changelog.json` (mirrors the existing
  `CHANGELOG.md`/`QUALITY.md` pitfalls) and about `sw.js`'s data-path set
  growing to two files, once actually implemented.
- `docs/BACKLOG.md`: no new task — runs entirely through this requirement,
  same pattern as A-2/A-4/A-5.

## Definition of Done

- Header trigger opens a native `<dialog>` listing the last 30 days of
  changes, newest first, with added/removed/changed markers and field-change
  notes; closes via button/`Escape`/backdrop with focus returned to the
  trigger.
- `data/changelog.json` written by `build-data.mjs` only on a real change,
  content matching `data/CHANGELOG.md` 1:1, pruned to 30 days, `firstFill`
  collapsed to one entry, no volatile fields.
- No new `localStorage` key; ADR-003's boundary untouched;
  `scripts/test-rechtstexte.mjs` needs no change for this feature.
- `sw.js` serves `data/changelog.json` network-first, same family as
  `data/baustellen.geojson`; not prefetched at install (documented
  limitation).
- `src/lib/` stays DOM-/network-/dependency-free (unchanged, or extended
  only if the render mapping outgrows inline `app.js` code — see E4).
- `npm test` green, including the new changelog-artifact test.
- Accessibility verified in the browser (focus trap, `Escape`, focus
  return, keyboard reachability, `prefers-reduced-motion`).
- Chrome bilingual (DE/EN), quoted raw content stays German, verified in
  both languages.
- `CACHE_SHELL` bumped in `sw.js` (shell files changed).
- Docs updated: requirements overview status, `README.md`, `CLAUDE.md`.

## Implementation steps

1. `build-data.mjs`: write/prune `data/changelog.json` in the existing
   `hasChanges(diff)` branch, next to `prependChangelog()`.
2. `scripts/test-changelog-feed.mjs` (new), wired into `npm test`.
3. `sw.js`: extend the data-path set to include `data/changelog.json`
   (network-first, E7); no `SHELL` entry (it's data, not shell).
4. `src/lib/i18n.js`: add the dialog's chrome strings (DE/EN).
5. `index.html`: trigger button + `<dialog>` markup, `data-i18n` wiring.
6. `src/styles.css`: dialog/backdrop/entry-list styling, focus states,
   reusing existing tokens where they fit.
7. `src/app.js`: fetch `data/changelog.json`, open/close wiring, render
   entries, loading/empty/error states, language-toggle re-render.
8. `sw.js`: bump `CACHE_SHELL` (shell files changed in steps 5/7).
9. Browser check (Playwright): dialog a11y, empty/error states, DE/EN
   chrome, screenshots mobile+desktop/light+dark per convention.
10. Update `docs/anforderungen/README.md` status, `README.md`, `CLAUDE.md`.
