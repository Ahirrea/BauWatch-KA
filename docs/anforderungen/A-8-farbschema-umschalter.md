# A-8 Colour-scheme switch (light / dark)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want to choose whether the map page
shows itself light or dark — independently of what my phone or laptop is set
to — so that I can read it comfortably in the situation I'm actually in
(bright daylight on the bike, dark bedroom in the evening) without changing
my device's setting for everything else.

**Refined on:** 2026-07-28
**Addresses PRD:** "Goals — usable on the phone, by keyboard, and with a
screen reader" (this is a readability/comfort item, not a new data feature)
**Constrained by:** [ADR-003](../entscheidungen/ADR-003-sprachumschalter-localstorage.md)
(one-key `localStorage` exception) → widened by
[ADR-004](../entscheidungen/ADR-004-farbschema-zweiter-localstorage-schluessel.md)
**Target branch:** `claude/dark-light-mode-toggle-3e7a4l`

## Touchpoints in the code

Nearly everything needed already existed — this requirement is mostly wiring,
not new visual design.

**Reusable as-is:**

- **Both palettes are already there and already tuned.** `src/styles.css`
  has carried a full dark palette behind
  `@media (prefers-color-scheme: dark)` since v1, with the chip tokens from
  BACKLOG #22 and the Leaflet chrome from #27 already themed through the
  same tokens. Nothing new had to be coloured; the whole job was making the
  existing dark palette reachable by choice as well as by system setting.
- **The segmented-button pattern**, third instance now: `.segments` /
  `.segments button` / `aria-pressed` / `.is-active`, shared verbatim by the
  filters (v1) and the language switch (A-5). Same look, same a11y wiring,
  no new pattern to learn or to test.
- **`.header-top`**, the flex row that A-6 and A-5 already share, plus its
  `flex-wrap`.
- **`src/lib/i18n.js` + `applyI18n()`'s `data-i18n-attr` mechanism**, which
  already knows how to translate *attributes* (not just text nodes) — needed
  here because the buttons are icon-only and their names live in
  `aria-label`/`title`.
- **The storage-with-fallback shape** from A-5
  (`liesGespeicherteSprache()` / `schreibeGespeicherteSprache()`): read
  wrapped in `try`, unknown value → default, write failure swallowed.
- **`scripts/test-rechtstexte.mjs`'s documented-key guard**, which A-5 left
  behind written per-key rather than for one hardcoded name — so it picks up
  the new key with no edit at all.

**What was missing:**

- A way for the dark palette to win *against* a light system setting (and
  vice versa). The media query alone can't express that.
- `color-scheme` on `:root`. Without it the browser keeps rendering its own
  chrome (the search input, scrollbars, text selection) per the *system*
  setting: choose light on a dark phone and the address field stays a dark
  box on a light page.
- Something to set the choice **before first paint**. `src/app.js` is a
  module and therefore deferred; by the time it runs, a light frame has
  already been painted for someone who chose dark.
- `theme-color` handling. The two `<meta name="theme-color">` in
  `index.html` are bound to `prefers-color-scheme` via `media`, so on an
  explicit choice the system bar would keep following the system.

## Tension with non-goals — and resolution

**"No data storage of our own"** ([`PRD.md`](../PRD.md) §4) — the same
tension A-5 hit, one key later. ADR-003 had deliberately closed its
exception at exactly one key, so this could not be waved through inside this
file; it is resolved in
[ADR-004](../entscheidungen/ADR-004-farbschema-zweiter-localstorage-schluessel.md),
which turns the one-key exception into a bounded category (anonymous display
preferences, closed value set, key *and* values documented) and admits
`bauwatch.theme` under it.

Sharpened rather than just permitted: **the default stores nothing.** "Follow
the system setting" writes no key, and returning to it *removes* the key
again — so a visitor who never touches the switch leaves nothing on their
device, exactly as before A-8. That is only possible because the CSS keeps
its `prefers-color-scheme` media query instead of having JavaScript resolve
the scheme and write `light`/`dark` for everybody (see Decision 2).

**"No backend, no build step for the frontend"**
([ADR-001](../entscheidungen/ADR-001-statisches-hosting.md)) — untouched. No
new file is served, no dependency is added; the change is three existing
static files plus one new test script.

**Not in tension, worth stating:** the page already honoured
`prefers-color-scheme`. This requirement must **not** regress that. Anyone
who never touches the switch has to keep getting exactly the behaviour they
have today, including when they change their system setting later while the
page is open.

## Decisions (with rationale)

### 1. Three states (system / light / dark), not a two-state light↔dark flip

A two-state toggle would have to pick a starting side, and either choice
throws away the automatic behaviour the page has today: a dark-phone visitor
would land on a light page (regression), or a light-phone visitor on a dark
one. "Follow the system setting" is therefore a first-class, default,
*selectable* state — not merely the absence of a choice. It also gives
someone a way back after trying the other two, which a two-state flip cannot
offer.

Discarded: **two-state toggle** (loses the system default, per above);
**cycling single button** (a control whose label depends on invisible current
state, and no way to see all options — poor for both screen-reader and
sighted use).

### 2. `prefers-color-scheme` stays in the CSS; the attribute only overrides it

The obvious simplification would be to let JavaScript read the system
setting, resolve it, and always stamp `data-theme="light"|"dark"` on
`<html>` — one dark block in the CSS, no duplication, no `:not()`. Rejected
for two reasons:

1. **Dark mode would then require JavaScript.** Today it is pure CSS. Yes,
   `index.html` is useless without JS anyway (the map and list are built by
   `app.js`) — but "the colours need JS" is a strictly worse starting point
   than "the colours never need JS," and it costs nothing to keep.
2. **It would write a key for everybody**, which is what Decision 1's
   store-nothing default depends on not happening.

The cost is real and is accepted openly: **the dark palette is spelled out
twice** in `src/styles.css`, once behind
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and
once behind `:root[data-theme="dark"]`. CSS cannot share one declaration
block between a media query and a plain selector. Since the duplication
cannot be removed, it is *guarded* instead: `scripts/test-theme.mjs` parses
both blocks and fails if they differ by a single token or value — the same
move already used for the CC-BY attribution (static HTML vs. build constant)
and the privacy notice (text vs. code).

The `:not([data-theme="light"])` in the media-query selector is the actual
mechanism of the override: an explicit *light* choice drops out of the dark
rule and keeps `:root`'s light palette even on a dark system.

### 3. Icon-only buttons, names in `aria-label`/`title`

The header is horizontally tight — it already carries "Was ist neu?" (A-6)
and the DE/EN switch (A-5), and BACKLOG #23 exists because it is vertically
tight too. Three more visible words ("System", "Hell", "Dunkel") push the row
into a second line at 414 px, adding a header line on precisely the device
this app is built for. Icon-only keeps it to one row (verified at 414 px).

The accessibility consequence is handled rather than accepted: the glyph
(`◐` / `☀︎` / `☾`) is `aria-hidden`, the name comes from `aria-label`, the
same string doubles as a `title` tooltip for sighted users who don't
recognise `◐`, and both attributes are translated with the page via
`data-i18n-attr`. `scripts/test-theme.mjs` fails if any button loses its
`aria-label`, its `title`, its `aria-hidden` glyph, or its translation hook.
The names say what the button *does* ("Systemvorgabe folgen"), not what the
glyph *is*.

Discarded: **`<select>`** (compact and native, but a fourth interaction
pattern in a header that already has exactly one — segmented buttons — and
it reads as a settings form rather than a view control); **icons plus visible
text** (clearer in isolation, costs the mobile header a line).

### 4. `color-scheme` pinned on an explicit choice

`:root { color-scheme: light dark }` follows the system;
`[data-theme="light"|"dark"]` pins it. Without this the browser's own chrome
keeps obeying the system setting and an explicit choice looks half-applied
(a dark input on a light page). Kept in rules of its own, separate from the
token blocks, so Decision 2's drift comparison sees nothing but colour
values.

### 5. A three-line inline script in `<head>` for the first paint

`src/app.js` is `type="module"` and therefore deferred, so it runs after the
first paint: an explicit-dark visitor would see a light flash on every single
page load. The fix is the standard one — a tiny blocking script in `<head>`,
**before** the stylesheet, that reads the key and sets the attribute. It does
nothing else: no writing, no fetching, `try`/`catch` around the storage
access so a blocked store leaves the attribute off and the page simply
follows the system setting (a graceful fallback, not an error path).

The duplicated key literal is the drift risk here, so it is guarded:
`scripts/test-theme.mjs` compares the literal in `index.html` against
`THEME_KEY` in `src/app.js` and additionally checks that the script sits
before `src/styles.css`, writes nothing, and has its `try`/`catch`.

This does not touch `impressum.html`/`datenschutz.html`, whose "no
`<script>`" guarantee (E6 in A-4) stays intact — see Non-scope.

### 6. `theme-color` follows the choice, not the system

On an explicit choice, `app.js` rewrites both `<meta name="theme-color">` to
`media="all"` with the resolved colour (both get the *same* colour, so it
doesn't matter which one the browser picks); back on "system" they get their
`(prefers-color-scheme: …)` bindings back. `data-scheme` attributes tell
`app.js` which meta is which. The colour values live in `THEME_COLOR` in
`app.js` and are checked against the `content` attributes in `index.html` by
`scripts/test-theme.mjs` — third copy of the same fact, third guard.

## Scope / Non-scope

- **In:** a three-state switch (system / light / dark) in `index.html`'s
  header; both existing palettes reachable by choice; `color-scheme` pinned
  on an explicit choice; the choice persisted anonymously and surviving a
  reload without a flash; the system bar colour following the choice;
  bilingual accessible names; a drift guard for every duplicated fact.
- **Out:**
  - **New colours or a redesign.** Both palettes ship unchanged, token for
    token. This requirement adds a *way in*, not a new look.
  - **`impressum.html` / `datenschutz.html` following the choice.** They
    must stay script-free (E6 in A-4) and so cannot read the stored value;
    they keep following the system setting. A visitor who chose dark on a
    light system therefore gets a light legal page. Accepted knowingly: the
    alternative is weakening a guard that exists for a good reason, to fix a
    rare and harmless mismatch on two pages of static prose. Not worth it.
  - **Marker and search-circle colours.** `AMPEL_COLOR` and
    `drawSearchCircle()` in `app.js` carry the light-palette hexes and keep
    them in both schemes — that is today's behaviour and unchanged by this
    requirement. Fixing it means re-rendering Leaflet layers on a scheme
    change; it belongs in its own backlog entry, not smuggled in here.
  - **Auto-detecting anything beyond `prefers-color-scheme`** (time of day,
    ambient light). Same restraint as A-5's deliberate refusal to
    auto-detect the browser language.
  - **A third preference of any kind.** ADR-004 sets the rule for future
    ones; this requirement adds exactly one key.

## Specification

### UX flow & states

Three segmented buttons in the header, left of the DE/EN switch, grouped
with it in `.header-controls` so the two view controls wrap together:

| Button | Glyph | Accessible name (DE / EN) | Effect |
|---|---|---|---|
| system | `◐` | Systemvorgabe folgen / Follow the system setting | `data-theme` removed, key removed, CSS media query in charge |
| light | `☀︎` | Helles Farbschema / Light colour scheme | `data-theme="light"`, key `light` |
| dark | `☾` | Dunkles Farbschema / Dark colour scheme | `data-theme="dark"`, key `dark` |

`aria-pressed` and `.is-active` mark the active one, exactly as in the
filters and the language switch. "system" ships pre-selected in the static
HTML. Switching is instant — no reload, no re-render: every colour in the
app, including the Leaflet chrome and popups, resolves through the same
tokens.

### Interaction with existing features

- **A-5 (language):** independent axes. `applyI18n()` translates the new
  `aria-label`/`title` through the existing `data-i18n-attr` mechanism;
  switching language leaves the scheme alone and vice versa. The glyphs are
  inside `<span aria-hidden>` children, so `applyI18n()`'s `textContent`
  writes (which target `[data-i18n]` elements) can't clobber them.
- **A-3 (PWA):** `index.html`, `src/app.js`, `src/styles.css` and
  `src/lib/i18n.js` are all in `SHELL` → `CACHE_SHELL` bumped `v8` → `v9`.
  No new file, so the `SHELL` list itself is unchanged.
- **A-6 ("Was ist neu?"):** the dialog is already themed through the tokens;
  it follows the choice with no change.
- **Filters/search/list:** untouched. No `render()` call on a scheme change.

### Data model / persistence

`localStorage`, key `bauwatch.theme`, values `light` / `dark` — nothing
written for the `system` default, and the key removed on returning to it (see
[ADR-004](../entscheidungen/ADR-004-farbschema-zweiter-localstorage-schluessel.md)).
Read and write are both wrapped: an unknown or absent value resolves to
`system`, a failing write is swallowed (the switch still works for the
session).

### External dependencies & fallback

None. No network call, no new asset.

### Edge cases & error handling

| Case | Behaviour |
|---|---|
| `localStorage` blocked (private mode, disabled, full) | Inline script's `catch` leaves the attribute off, `app.js` falls back to `system`; the switch works for the session, it just doesn't persist |
| Stored value is garbage (hand-edited, older version) | `THEMES.includes()` rejects it → `system` |
| System setting changes while "system" is active | Colours follow instantly via CSS; `app.js` re-syncs only the `theme-color` metas via a `matchMedia` `change` listener |
| System setting changes while an explicit choice is active | Nothing happens — that is the point of the choice |
| JavaScript absent or broken | Page follows `prefers-color-scheme` as it did before A-8; the switch is inert |
| Reload with an explicit choice | Inline `<head>` script applies it before first paint — no flash |
| Glyph missing from the system font | `title` tooltip and `aria-label` still name the button; `.is-active` still shows which one holds |

### Accessibility

`role="group"` with a translated `aria-label` on the group; `aria-pressed` on
each button; glyphs `aria-hidden` with the name in `aria-label`; `title` as a
sighted-user tooltip; keyboard-operable as plain buttons (verified with
Enter); `:focus-visible` ring from the existing `--focus` token, which has
its own value per scheme. Contrast computed (not eyeballed) in both schemes,
per the `--amber` pitfall in `CLAUDE.md`: inactive glyph 17.40:1 light /
13.96:1 dark, active glyph on `--accent` 9.13:1 / 7.19:1 — all well past
WCAG AA. No `prefers-reduced-motion` concern: the switch has no transition.

### Test plan

`scripts/test-theme.mjs`, new, in `npm test` — one check per duplicated fact:

1. Both dark palettes exist, define the **same tokens with the same values**,
   and actually override the light ones; the system one really is inside
   `@media (prefers-color-scheme: dark)`.
2. `color-scheme` follows the system on `:root` and is pinned by both
   `[data-theme]` selectors.
3. The inline script's key literal equals `THEME_KEY` in `app.js`; it sits
   before `src/styles.css`, writes nothing, and has a `try`/`catch`.
4. `THEME_COLOR` in `app.js` matches the `theme-color` metas in
   `index.html`, and each meta carries `data-scheme`.
5. The buttons match `THEMES`, "system" is first and pre-selected, exactly
   one is active, `aria-pressed` is consistent, and every button has
   `aria-label` + `title` + an `aria-hidden` glyph + its `data-i18n-attr`
   hook.
6. The four new i18n keys exist in both languages, by name.
7. `datenschutz.html` names the possible values, and `app.js` really does
   `removeItem` on `system` (the privacy notice claims it stores nothing
   there).

`scripts/test-rechtstexte.mjs` needs **no change** — its per-key guard picks
up `bauwatch.theme` on its own and would have failed the build had the
privacy notice not been updated. Browser side (Playwright, tiles
intercepted, one context per `colorScheme`): both defaults unchanged, both
overrides winning against the opposite system setting, `color-scheme` pinned,
the search input rendering per the choice, persistence and key removal, the
no-flash script's attribute present before `app.js` runs, `theme-color`
rewritten, tab order, Enter, translated names, and the computed contrast
values above.

### Docs / backlog impact

New: this file, ADR-004,
`scripts/test-theme.mjs`. Updated: `docs/anforderungen/README.md` (status),
`docs/entscheidungen/README.md` (ADR row), `docs/PRD.md` (§7 Constraints —
the appearance sentence), `datenschutz.html` (second key + values),
`CLAUDE.md` (the `CACHE_SHELL` version, the duplicated-palette trap, and the
`--amber` pitfall's new "test in the scheme you didn't choose" wrinkle).
`docs/BACKLOG.md` unchanged — this is a requirement, not a task.

## Definition of Done

- [x] Three-state switch in the header, "system" the default, pre-selected
      in the static HTML.
- [x] An explicit choice wins against the opposite system setting, in both
      directions, including the browser's own chrome (`color-scheme`).
- [x] Without a choice, behaviour is byte-for-byte what it was before A-8 —
      including a system setting that changes while the page is open.
- [x] The choice survives a reload with no light flash.
- [x] Nothing is stored unless the visitor makes an explicit choice; the key
      is removed again on returning to "system".
- [x] The system-bar colour follows the choice.
- [x] Icon-only buttons carry translated accessible names; keyboard- and
      screen-reader-operable.
- [x] Contrast **computed** in both schemes, AA met (values above).
- [x] Every duplicated fact has a guard: both dark palettes, the key
      literal, the `theme-color` values, the button/`THEMES` pairing, the
      documented values.
- [x] `CACHE_SHELL` bumped (`v8` → `v9`).
- [x] `npm test` green including the new script; `src/lib/` stays
      DOM-/network-/dependency-free (`i18n.js` gained strings only).
- [x] Privacy notice names the second key and its values; A-4's E6
      (script-free legal pages) intact.
- [x] Screenshots (mobile + desktop, light + dark, plus a close-up) sent
      with the result report.

## Implementation steps

1. `src/lib/i18n.js`: four keys per language (group label + three button
    names).
2. `src/styles.css`: `color-scheme` on `:root`; media-query dark block
    narrowed with `:not([data-theme="light"])`; second dark block for
    `[data-theme="dark"]`; `color-scheme` pinning rules; `.theme-toggle` and
    `.header-controls`.
3. `index.html`: `data-scheme` on the two `theme-color` metas; inline
    no-flash script before the stylesheet; the button group inside a new
    `.header-controls` wrapper alongside the language switch.
4. `src/app.js`: `THEME_KEY` / `THEMES` / `DEFAULT_THEME` / `THEME_COLOR`;
    read + write helpers; `applyTheme()` / `syncThemeColor()` /
    `syncThemeButtons()` / `wireThemeToggle()`; `matchMedia` listener;
    `wireThemeToggle()` first in the start sequence.
5. `datenschutz.html`: second key with its values, and the "was diese Seite
    nicht tut" bullet adjusted from one preference to two.
6. `sw.js`: `CACHE_SHELL` `v8` → `v9`.
7. `scripts/test-theme.mjs` + the `npm test` chain.
8. Docs: this file, ADR-004, both overview tables, `PRD.md`, `CLAUDE.md`.
9. Verify: `npm test` plus a Playwright pass with one context per scheme,
    contrast computed, screenshots generated.
