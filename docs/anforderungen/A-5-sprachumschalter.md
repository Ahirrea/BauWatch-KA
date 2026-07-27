# A-5 Language switch (German ⇄ English)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a visitor to BauWatch-KA who doesn't read German, I want
to switch the app's UI to English, so that I can understand what's
happening around me without relying on a translator.

**Refined on:** 2026-07-27
**Addresses PRD:** "Constraints" — the "Language" bullet, which today says
the UI stays German and calls translating the app "its own, much bigger
localization decision — not something this switch covers." This requirement
*is* that decision.
**Constrained by:** [ADR-001](../entscheidungen/ADR-001-statisches-hosting.md)
(static hosting, no backend) · proposes **ADR-003** (see "Decisions" below)
**Target branch:** —

## Touchpoints in the code

**Checked, not guessed.**

| What | Where | Meaning for this requirement |
|---|---|---|
| All UI strings | `index.html` (static markup), `src/app.js` (`AMPEL_LABEL`, `VM_LABEL`, popup/list templates, status messages, update-banner text) | Currently German-only, hardcoded. Nothing to translate *into* exists yet — no i18n module, no string table. |
| Date/duration wording | `src/lib/format.js` (`restdauer`, `formatRange`, `formatDate`) | Pure, DOM-free, **not used by any Node script** (`grep` found zero build-side call sites) — free to extend without touching the data pipeline. |
| Client storage | `src/`, `index.html`, `sw.js` | Today genuinely **zero** hits for `localStorage`/`sessionStorage`/`document.cookie`/`indexedDB`/`navigator.geolocation` — `scripts/test-rechtstexte.mjs` guards this. A-5 would be the **first** feature to actually introduce one of them (A-1 mentions a future `localStorage` use for routing but is only `✅ ready`, not built). |
| Privacy notice | `datenschutz.html`, section "Was diese Seite nicht tut" (bullet "keine eigene Speicherung personenbezogener Daten") and "Speicherung auf Ihrem Gerät" | The bullet is already correctly scoped to *personal* data — a non-identifying language flag doesn't actually contradict it. The test can't tell the difference; it flags any `localStorage` use categorically (see Tensions). |
| Segmented-button pattern | `index.html` filter groups, `src/styles.css` (`.filter-group`, `.segments`, `.segments button`, `is-active`, `aria-pressed`) | Directly reusable for the language control — same interaction, same a11y wiring, no new pattern needed. |
| Shell precache | `sw.js`, `SHELL`, `CACHE_SHELL` (currently `v4`) | A new client-only module must be added here (`scripts/test-pwa.mjs` checks every `src/app.js` import against it automatically). |
| CC-BY attribution | `index.html` `#attribution`, `scripts/test-attribution.mjs` | Hard **exact-string** check against `ATTRIBUTION` in `scripts/build-data.mjs`. Cannot be translated without breaking that equality — must stay untouched. |
| Legal pages | `impressum.html`, `datenschutz.html` | Explicitly locked to German by existing CLAUDE.md guidance ("translating the app itself would be a separate, much bigger localization decision") — still true for these two; A-5 only reopens that door for the map page itself. |
| PWA identity | `manifest.webmanifest` (`name`, `short_name`, `description`, `lang`) | Also explicitly locked (same guidance) — the installed app's name/identity doesn't change with an in-page toggle. |
| Raw dataset text | `art`, `verursacher`, `zusatzinfo`/`info` fields in `data/baustellen.geojson` | The city's own German text, not app copy. No translation table for open-data content exists or is proposed here. |

**Missing (net-new):** a UI-string dictionary, a language-state concept in
`app.js`, the two toggle buttons, and the storage-drift-guard adjustment in
`scripts/test-rechtstexte.mjs`.

## Tension with non-goals — and resolution

1. **PRD Constraints, "Language" bullet, direct conflict.** It currently
   states the UI stays German and frames translating it as a deliberately
   separate, bigger decision. → **Resolved by this very requirement**: the
   idea's originator is making that decision now, deliberately and
   narrowly — see Scope/Non-scope. `PRD.md` gets the bullet rewritten at
   Definition of Done, not silently left stale.

2. **Non-goal "No data storage of our own."** Persisting the chosen
   language (so it survives a reload) needs `localStorage` — a first for
   this codebase. → The non-goal's actual target is **user-identifying /
   personal** data storage (A-4 already established this reading for the
   legal notice's *operator* data, tension #2 there). A two-value,
   anonymous UI preference is not personal data. Still, it's a genuinely
   new capability (first persistent client storage keyed to a user
   choice), so it gets its own **ADR-003** rather than being waved through
   silently in this requirement file (see Decisions).

3. **`scripts/test-attribution.mjs`'s hard equality check** on the CC-BY
   paragraph. → Resolved by **not touching it**: the attribution stays
   German-only, out of scope (see Non-scope).

4. **`src/lib/` must stay DOM-/network-/dependency-free** (hard
   architecture constraint, `CLAUDE.md`). → The new `src/lib/i18n.js` and
   the extended `format.js` stay pure; both are imported by the browser
   client only, same as `format.js` today.

5. **PWA shell precache invariant.** A new client-only module must be
   precached or it silently breaks offline for exactly this one feature.
   → `src/lib/i18n.js` added to `SHELL`, `CACHE_SHELL` bumped `v4` → `v5`.
   `scripts/test-pwa.mjs` catches a forgotten entry automatically (it scans
   `app.js`'s imports).

6. **The docs-language-switch note (`CLAUDE.md`) locks `lang="de"` and the
   app's German UI as "unaffected" by that switch.** → That lock is about
   the *internal-docs* English switch, not a standing prohibition on ever
   translating the app — it explicitly calls the app translation "a
   separate, much bigger localization decision," which is exactly what
   this requirement is. `impressum.html`/`datenschutz.html` keep their
   static `lang="de"` (test-rechtstexte.mjs still checks that, unchanged,
   for those two pages only — `index.html`'s `lang` attribute isn't
   checked anywhere today and is free to change dynamically).

7. **Raw open-data field values are the city's own text.** → Explicitly
   out of scope; no translation table for `art`/`verursacher`/`zusatzinfo`
   (see Non-scope, with rationale).

## Decisions (with rationale)

**E1 — Persistence: `localStorage`, key `bauwatch.sprache`, values `'de'`
/`'en'`.** Chosen by the idea's originator over a session-only toggle (the
recommended default), specifically because the choice should survive a
reload. *Discarded:* no persistence (simplest, zero tension, but the
originator wants it to stick); a cookie (no benefit over `localStorage` —
worse, actually, since a cookie is transmitted with every request and would
contradict "no cookies" harder than `localStorage` contradicts "no own
storage").

**E2 — Control: two segmented buttons "Deutsch | English."** Reuses the
existing filter segmented-button pattern verbatim (`role="group"`,
`aria-pressed`, `.is-active`, same CSS) — no new interaction pattern, both
states always visible. *Discarded:* a single flip-button showing the other
language as its label (more compact, but a new pattern, and the current
state is only readable from the label text, not from `aria-pressed`).

**E3 — Translated surface = the interactive app shell only.** `index.html`
+ `src/app.js` UI strings + the phrase words in `format.js`. Legal pages,
PWA identity, the CC-BY attribution, and raw dataset text stay German-only.
Full itemized rationale in Non-scope below — this is the boundary that
keeps the requirement from silently ballooning into "translate everything."

**E4 — New pure module `src/lib/i18n.js`** holding the UI-string dictionary
and the `AMPEL_LABEL`/`VM_LABEL` dictionaries per language (replacing
today's module-level German-only constants in `app.js`). `format.js`'s
`restdauer`/`formatRange` get an **optional `lang` parameter, default
`'de'`** (backward compatible — there are no other call sites to break),
with their own small phrase table kept **local to `format.js`** rather than
importing from `i18n.js`, so each pure module stays self-contained.
*Discarded:* one shared giant dictionary for everything — would couple
`format.js` to `i18n.js` for no real benefit, three extra words don't
justify it.

**E5 — Numeric dates stay locale-neutral.** `formatDate`'s `dd.mm.yyyy`
output doesn't change with the language — only the surrounding words
translate (`ab`/`from`, `bis`/`until`, `noch X Tage`/`X days left`, `Ende
offen`/`open-ended`, `abgelaufen`/`expired`, `endet heute`/`ends today`,
`Zeitraum unbekannt`/`period unknown`). *Discarded:* switching to
`en-GB`/`en-US` date formatting — adds a day/month-order ambiguity trap for
no real gain in a numeric, already-unambiguous format.

**E6 — The storage-drift guard in `scripts/test-rechtstexte.mjs` gets
extended, not weakened.** The `localStorage` entry in its "text ↔ code"
check changes from an unconditional contradiction test into a
**documented-key check**, mirroring how section 5 of that same script
already scans the frontend for external hosts and requires each one to be
named in the privacy notice. Concretely: if `localStorage` is used
anywhere in the frontend, the test extracts the actual key(s)
(`localStorage.getItem/setItem('…')`) and requires each one to appear in
`datenschutz.html`'s "Speicherung auf Ihrem Gerät" section — an
*undocumented* key still fails the build. The other four entries (Cookies,
sessionStorage, IndexedDB, geolocation) keep their unconditional check,
unchanged, since they remain genuinely unused. This is the same "a guard
must not permanently turn `npm test` red" principle already applied to the
contact-address placeholder (`CLAUDE.md`), applied here to a second case.

## Scope / Non-scope

- **In:** the two-button language toggle in `index.html`; all `app.js`
  UI strings (search, filters, stats, list/popup templates, status
  messages, update banner); the footer **disclaimer** sentence ("Ohne
  Gewähr…"); `<title>`/meta description; `document.documentElement.lang`
  switching with the toggle; `src/lib/i18n.js` (new); `format.js`'s
  restdauer/range wording; persistence via `localStorage`; `datenschutz.html`
  additions describing that storage; `ADR-003`.
- **Out, with rationale:**
  - `impressum.html` / `datenschutz.html` full content — already
    explicitly excluded by existing project guidance; legally-worded text,
    riskier to translate without review; its own, separate localization
    effort.
  - CC-BY attribution `#attribution`/`#attribution-hinweis` — license
    text, hard-equality-tested against the build constant, and the
    dataset's official title stays as officially named.
  - Footer credits link *labels* ("Impressum", "Datenschutz",
    "Änderungsverlauf", "Quellcode & Info") and the OSM/Nominatim credit
    text — translating a label whose destination stays German-only would
    misleadingly promise English content that isn't there.
  - `manifest.webmanifest` (`name`, `short_name`, `description`, `lang`) —
    installed PWA identity stays fixed, per existing project guidance.
  - Raw dataset field values (`art`, `verursacher`, `zusatzinfo`/`info`) —
    the city's own German text; no translation table for open-data
    content.
  - Build-side / internal artifacts (`data/CHANGELOG.md`, Action job
    summary, commit messages) — not user-facing, already covered by the
    2026-07-27 internal-docs English switch, unaffected either way.
  - Auto-detecting the browser/OS language — the idea explicitly asks for
    a **fixed German default** with a manual switch, not locale detection.

## Specification

### UX flow & states

Two buttons "Deutsch" / "English" (E2) sit in the app header. On load, the
stored preference (`bauwatch.sprache`) is read; if absent, invalid, or
unreadable (storage blocked/full), the app defaults to German — never
crashes on a storage failure. Clicking the inactive button: swaps
`aria-pressed`/`.is-active` on both buttons (identical mechanics to the
existing filter segments), swaps every `data-i18n`-tagged static text node,
re-renders the map markers/list/popups/stats/status line in the new
language via the existing `render()` pipeline, sets
`document.documentElement.lang`, updates `<title>`/meta description, and
writes the new value to `localStorage` (write failures are swallowed, same
as `sw.js`'s `ablegen()` pattern — a full quota must not break the switch
itself). No page reload, no loss of the current filter/search/selection
state — this is the same "flip a control, call `render()`" flow the filters
already use, not a new state model.

**Accepted rough edge (explicitly not engineered around):** a *transient*
status message already on screen at the moment of toggling (e.g. "Adresse
wird gesucht …") is not retroactively retranslated; it will be in the new
language the next time it's set. Adding a "last message key" cache for
this would be overengineering for a cosmetic, self-correcting edge case.

### Interaction with existing features

- Filters/search/map selection: unaffected. Toggling language re-renders
  through the same `render()` call the filters already trigger — clears
  and rebuilds markers exactly like a filter change does today (including
  closing any open popup), so no new interaction surprise is introduced.
- `navigator.onLine`-driven search disabling: unaffected, independent
  concern.
- Service worker: `src/lib/i18n.js` added to `SHELL`; `CACHE_SHELL` bumped
  `v4` → `v5` (a shell file — the new module — is added).

### Data model / persistence

One new `localStorage` entry, key `bauwatch.sprache`, value `'de'` or
`'en'`. No new field in `data/baustellen.geojson`, no server-side state, no
account. See Decisions/E1 and Tension #2 for why this is compatible with
"no data storage of our own" only in this narrow, documented form
(ADR-003).

### External dependencies & fallback

None new. No network call added. If `localStorage` throws (private mode,
disabled storage, quota) on read *or* write, the app falls back to the
in-session default (German) and keeps working — never a hard failure.

### Edge cases & error handling

| Case | Behavior |
|---|---|
| No stored preference (first visit) | defaults to German, per the idea's explicit "Deutsch (Standard)" |
| Corrupted/unknown stored value | treated as absent → German |
| `localStorage` read/write throws | caught, ignored, app still works (session-only for that visit) |
| Toggle clicked while a search/status message is in flight | message stays in its current language until next set (see "Accepted rough edge" above) |
| No JavaScript | buttons render but do nothing — consistent with the rest of `index.html`, which has never worked without JS (unlike `impressum.html`/`datenschutz.html`) |
| Dark mode | button styling inherits the existing segmented-button tokens; no new contrast case introduced |

### Accessibility

Reuses the filter segments' existing a11y wiring (`role="group"`,
`aria-label`, `aria-pressed`, keyboard-operable buttons, visible focus).
`document.documentElement.lang` switches with the content so screen
readers use the right pronunciation rules. No focus loss on toggle (same
guarantee the filter buttons already have — the clicked button keeps
focus, only content around it changes).

### Test plan

**`scripts/test-i18n.mjs` (new, in `npm test`):**
- `de`/`en` key parity in `src/lib/i18n.js` — no key present on one side
  and missing on the other.
- `restdauer`/`formatRange` produce a non-empty, language-appropriate
  string for both languages across the same reference cases the existing
  format tests already use (open-ended, expired, today, 1 day, N days).
- Every `data-i18n="…"` key referenced in `index.html` exists in the
  dictionary (static scan, same spirit as the SHELL-import check in
  `scripts/test-pwa.mjs`).

**`scripts/test-pwa.mjs`:** no code change needed — it already generically
scans `app.js`'s relative imports against `SHELL`, so the new
`src/lib/i18n.js` import is auto-verified once added; only `SHELL`/
`CACHE_SHELL` themselves change.

**`scripts/test-rechtstexte.mjs`:** the `localStorage` carve-out described
in Decisions/E6; a cross-check (temporarily add an undocumented key,
confirm the test goes red, like the existing regression cross-checks for
attribution/legal texts) before it's committed as green.

**Browser (Playwright), per the "Web/mobile workflow" convention:** toggle
DE→EN→DE; verify list/marker/popup/status text, `aria-pressed` states,
`document.documentElement.lang`, persistence across a reload. Screenshots
mobile+desktop, light+dark, sent along with the result per existing
convention (tiles intercepted, gray map noted as expected).

### Docs/backlog impact

- **ADR-003** (new, append-only): the narrow client-storage exception.
- `PRD.md`: rewrite the Constraints "Language" bullet to describe the
  narrowed exception (map page bilingual; legal pages, PWA identity, and
  raw dataset text stay German-only).
- `CLAUDE.md`: update the "app stays German" pitfall and the
  docs-language-switch note with an "except A-5's DE/EN toggle, see
  Non-scope there" pointer, plus a new pitfall for the storage-drift-guard
  carve-out (E6) so it isn't rediscovered the hard way later.
- `docs/anforderungen/README.md`: this row → `🏁 done` on completion.
- `docs/entscheidungen/README.md`: new ADR-003 row.
- `docs/BACKLOG.md`: no new task — runs entirely through this requirement
  (same pattern as A-2/A-4).

## Definition of Done

- Two-button toggle in `index.html`, wired in `app.js`; default German,
  persists via `localStorage` (`bauwatch.sprache`), degrades to
  session-only on storage failure.
- Everything listed under Scope/"In" is translated and verified in both
  languages in the browser; everything under Non-scope is verified
  **unchanged** (attribution word-for-word, legal pages untouched, manifest
  untouched).
- `src/lib/i18n.js` and the extended `format.js` stay DOM-/network-/
  dependency-free.
- `sw.js`: `src/lib/i18n.js` in `SHELL`, `CACHE_SHELL` at `v5`.
- `datenschutz.html` names the `bauwatch.sprache` key under "Speicherung
  auf Ihrem Gerät"; the "Was diese Seite nicht tut" bullet gets its
  qualifying clause.
- `npm test` green, including the new `test-i18n.mjs` and the adjusted
  `test-rechtstexte.mjs` (E6 cross-check proven, not just asserted).
- Accessibility: `aria-pressed`/focus behavior verified, `lang` attribute
  switches, contrasts unchanged (no new color introduced).
- ADR-003 filed; `PRD.md`, `CLAUDE.md`, and the requirements overview
  updated; status set to `🏁 done`.

## Implementation steps

1. Write **ADR-003** (narrow, documented exception to "no data storage of
   our own" for anonymous UI preferences) — before the code.
2. `src/lib/i18n.js` (UI-string + label dictionaries); extend
   `format.js`'s `restdauer`/`formatRange` with an optional `lang` param.
3. `app.js`: language state, `localStorage` read/write (try/catch-guarded),
   button wiring, re-render static + dynamic text, `lang`/`<title>`/meta
   description switching.
4. `index.html`: the two buttons + `data-i18n` attributes on the in-scope
   static strings.
5. `src/styles.css`: minimal styling for the new button group, reusing
   `.filter-group`/`.segments` tokens.
6. `sw.js`: add `src/lib/i18n.js` to `SHELL`, bump `CACHE_SHELL` to `v5`.
7. `datenschutz.html`: the qualifying clause + the new storage paragraph
   naming `bauwatch.sprache`.
8. `scripts/test-i18n.mjs` (new) + the E6 carve-out in
   `scripts/test-rechtstexte.mjs`; both into `npm test`; run the E6
   cross-check.
9. Browser check (DE/EN, light/dark, mobile/desktop) with screenshots.
10. Update `PRD.md`, `CLAUDE.md`, `docs/entscheidungen/README.md`; set
    status to `🏁 done` in the [overview](./README.md#overview).
