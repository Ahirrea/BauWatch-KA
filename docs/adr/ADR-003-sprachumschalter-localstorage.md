# ADR-003: A narrow `localStorage` exception for the language preference

**Status:** accepted
**Date:** 2026-07-27
**Context:** [A-5](../anforderungen/A-5-sprachumschalter.md) adds a DE/EN
toggle for the map page. The idea's originator wants the choice to survive a
reload, which needs client-side persistence — a first for this codebase.

## Problem

The PRD's non-goals state "no data storage of our own" — until now genuinely
true: `scripts/test-rechtstexte.mjs` finds zero uses of `localStorage`,
`sessionStorage`, `document.cookie`, `indexedDB`, or
`navigator.geolocation` in the frontend, and the privacy notice states this
as fact. A-5 needs the chosen language to persist across a reload, which
means writing something to the visitor's device for the first time.

Two readings of the non-goal are possible: a blanket ban on any client
storage, or a ban specifically on storing data that identifies or describes
a person. A-4 already established the narrower reading for the legal
notice's own operator data; this ADR extends the same reasoning to a
second, independent case, so it isn't waved through silently inside the A-5
requirement file.

## Decision

The app may store **exactly one** anonymous, two-valued UI preference in
`localStorage`: key `bauwatch.sprache`, values `'de'` / `'en'`. Every read
and write is wrapped so a failure (private mode, disabled storage, full
quota) falls back to the in-session German default instead of breaking the
page. `datenschutz.html` names the key explicitly under "Speicherung auf
Ihrem Gerät", and the "Was diese Seite nicht tut" bullet on "no storage of
personal data" gets a qualifying clause pointing there.

`scripts/test-rechtstexte.mjs`'s drift guard for `localStorage` changes from
an unconditional "must not appear" check into a documented-key check: any
`localStorage` key found in the frontend must be named in that section of
the privacy notice, or the build fails. The check for Cookies,
`sessionStorage`, `indexedDB`, and `navigator.geolocation` stays
unconditional, since those remain genuinely unused.

## Rationale

A language flag carries no personal or identifying information — it says
nothing about who the visitor is, only which of two UI languages they last
picked. Treating it the same as, say, a tracking cookie or a user profile
would block a small, clearly-scoped usability improvement over a
non-goal whose actual target is personal data, not anonymous UI state. The
documented-key check keeps the guard meaningful instead of just deleting it
outright: an *undocumented* key still fails the build.

## Discarded alternatives

- **No persistence, session-only toggle.** Zero tension with the non-goal,
  simplest to build. Discarded because the idea's originator explicitly
  wants the choice to survive a reload.
- **A cookie instead of `localStorage`.** No benefit over `localStorage` —
  worse, actually, since a cookie is transmitted with every request and
  would contradict "no cookies" more directly than `localStorage`
  contradicts "no own storage".
- **Weakening the drift guard to ignore `localStorage` entirely.** Would
  silently allow any future key to go undocumented; the documented-key
  variant keeps catching that case while permitting this one.

## Consequences

**Positive**
- The language choice survives a reload without a backend or a cookie.
- The drift guard stays meaningful for any *future* `localStorage` use,
  rather than being disabled outright.

**Negative / trade-offs**
- The privacy notice's "no storage" bullet needs a qualifying clause,
  making it a slightly less absolute-sounding statement (though still
  accurate).
- Any future feature that wants a second `localStorage` key must also add
  it to `datenschutz.html`'s "Speicherung auf Ihrem Gerät" section, or
  `npm test` goes red.

**What must not happen anymore**
- A `localStorage` key appearing in the frontend without a matching mention
  in `datenschutz.html`'s "Speicherung auf Ihrem Gerät" section.
- Storing anything under this exception beyond the single anonymous
  language flag (e.g. no user identifiers, no usage history).
