# ADR-004: Widening the `localStorage` exception to a second UI preference

**Status:** accepted
**Date:** 2026-07-28
**Context:** [A-8](../anforderungen/A-8-farbschema-umschalter.md) adds a
colour-scheme switch (system / light / dark) to the map page. Like the
language choice before it, the choice has to survive a reload — which means a
second `localStorage` key.

## Problem

[ADR-003](./ADR-003-sprachumschalter-localstorage.md) opened `localStorage`
for **exactly one** key (`bauwatch.sprache`) and closed the door behind
itself: its "what must not happen anymore" section says nothing may be
stored under that exception "beyond the single anonymous language flag."
That wording was deliberate — it forces a second key to be argued for in the
open instead of being waved through inside a requirement file.

A-8 is that second key. It is the same *kind* of thing as the first (an
anonymous, few-valued UI preference with no bearing on who the visitor is),
so the question isn't whether this particular value is sensitive. The
question is whether the exception stays a list of individually-blessed keys
or becomes a **category** with a rule — because a list of two will become a
list of three, and each addition would otherwise need its own ADR to say
"yes, this one too."

## Decision

The exception is widened from one named key to a **bounded category**: the
app may store **anonymous UI display preferences** in `localStorage` —
values that describe how the page is *rendered*, not who is looking at it.
Concretely permitted per key:

- a small, closed set of possible values, each one enumerable in the privacy
  notice (`de`/`en`, `light`/`dark`);
- no free text, no identifier, no counter, no timestamp, no history, nothing
  derived from behaviour;
- every read and write wrapped so a storage failure falls back to the
  in-session default instead of breaking the page;
- the key **and its possible values** named in `datenschutz.html`'s
  "Speicherung auf Ihrem Gerät" section.

Under this rule A-8 adds `bauwatch.theme` with values `light` / `dark`. The
default, "follow the system setting," writes **nothing at all** — the key is
created only on an explicit choice and removed again when the visitor
returns to the system default, so a visitor who never touches the switch
leaves no trace whatsoever (this is why the CSS keeps its
`prefers-color-scheme` media query instead of letting JavaScript resolve the
scheme; see A-8).

`scripts/test-rechtstexte.mjs`'s documented-key guard is unchanged and needs
no edit — it was already written per-key rather than for one hardcoded name,
so the new key is picked up automatically and an undocumented one still
fails the build. A new `scripts/test-theme.mjs` adds the value-level part:
the possible values must be named in the privacy notice too, and the
"`system` stores nothing" claim is checked against the code that implements
it.

## Rationale

The distinction that carries ADR-003 — anonymous UI state versus personal
data — is a property of the *category*, not of the language flag
specifically. Re-litigating it per key would add ceremony without adding
protection: the third and fourth ADR would say the same thing as this one.
What actually protects the non-goal is the *bound* on what may go in, plus a
guard that fails the build when a key or a value goes undocumented — and
both of those are stated here in a form a future reader can apply without
guessing.

Making the default store nothing is what keeps the PRD's "no data storage of
our own" close to literally true for anyone who doesn't opt in. That is
worth the small amount of extra code (`removeItem` on returning to
`system`), and it is the reason the media query stays: a JavaScript-resolved
scheme would have had to write `light` or `dark` for everybody.

## Discarded alternatives

- **One ADR per new key.** Faithful to ADR-003's letter. Discarded because
  the argument is identical every time; a rule with a bound is more useful
  to a future reader than a growing list of precedents.
- **Blanket permission for `localStorage`.** Would drop the bound entirely
  and turn the documented-key guard into paperwork. Discarded — the point of
  ADR-003 was that the *category* is narrow, not that the count is one.
- **Store `system` explicitly as a third value.** Simpler code (no
  `removeItem` branch, no `:not([data-theme="light"])` selector). Discarded
  because it would write a key for every visitor who so much as looks at the
  switch, and because resolving the scheme in JavaScript would break dark
  mode for the no-JS case that currently works purely through CSS.
- **A cookie.** Same reasoning as in ADR-003: transmitted with every
  request, and it would contradict "no cookies" head-on.

## Consequences

**Positive**
- A future anonymous display preference (say, a larger type size) has a rule
  to follow instead of needing this discussion again.
- The colour-scheme default costs the visitor nothing on their device.
- The guards now cover keys *and* values, one level finer than before.

**Negative / trade-offs**
- "The only storage of this kind" is no longer a true sentence about the
  privacy notice; it now enumerates two keys and must keep doing so.
- The dark palette exists twice in `src/styles.css` (media query + explicit
  choice), because CSS cannot share one declaration block between the two.
  That duplication is the price of keeping dark mode working without
  JavaScript; `scripts/test-theme.mjs` compares the blocks so it cannot
  drift silently.

**What must not happen anymore**
- A `localStorage` key, or a possible value of one, appearing in the
  frontend without a matching mention in `datenschutz.html`'s "Speicherung
  auf Ihrem Gerät" section.
- Storing anything that falls outside the category above — no identifiers,
  no counters, no timestamps, no usage history, no free text, however small.
- Deleting either dark-palette block in `src/styles.css` as "duplication":
  without the media query, visitors who never chose lose dark mode; without
  the `[data-theme="dark"]` block, the switch stops working.
