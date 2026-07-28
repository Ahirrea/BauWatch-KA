# Decisions (ADRs)

Architectural and foundational decisions, one file per decision
(`ADR-<no.>-<short-title>.md`). This folder is **append-only**: an ADR is
never rewritten. If a decision is reversed, a **new** ADR is created and the
old one gets `Status: replaced by ADR-<no.>`. That way it stays traceable
what applied when and why.

An ADR comes into being when a decision changes the architecture or binds
the project long-term (step 5 of the [process](../PROZESS.md)). Forks
within a single requirement stay in the requirement file.

## Overview

| No. | Decision | Status | Gist |
|---|---|---|---|
| [ADR-001](./ADR-001-statisches-hosting.md) | Static hosting with a periodic data snapshot | accepted | A GitHub Action takes on the server role: it fetches the WFS and commits finished GeoJSON into the repo. No backend, no cost, no CORS problem. |
| [ADR-002](./ADR-002-mehrseitige-auslieferung.md) | Multi-page delivery and path-aware service-worker navigation | accepted | The app is no longer single-page. `navigationAntwort()` delivers the requested path from the shell cache instead of `index.html` for every navigation; every new HTML page is required to be in `SHELL` and covered by `CACHE_SHELL`. |
| [ADR-003](./ADR-003-sprachumschalter-localstorage.md) | A narrow `localStorage` exception for the language preference | accepted | The DE/EN toggle ([A-5](../anforderungen/A-5-sprachumschalter.md)) persists one anonymous, two-valued UI preference (`bauwatch.sprache`) in `localStorage` — the first client storage this codebase has ever used. The privacy-notice drift guard changes from an unconditional "must not appear" check into a documented-key check. |
| [ADR-004](./ADR-004-farbschema-zweiter-localstorage-schluessel.md) | Widening the `localStorage` exception to a second UI preference | accepted | The colour-scheme switch ([A-8](../anforderungen/A-8-farbschema-umschalter.md)) needs a second key, so ADR-003's one-key exception becomes a bounded **category**: anonymous display preferences with a closed set of values, each key *and value* documented. "Follow the system setting" stores nothing at all. |

## Creating a new ADR

1. Take the next free number (three digits, `ADR-002`, …). Numbers are
   never reused.
2. Create the file following the pattern below.
3. Add a line to the table above.
4. If the ADR reverses an earlier decision: set `Status:` in the old ADR to
   `replaced by ADR-<no.>` — that's the **only** permitted change to an
   existing ADR.

## Structure

```markdown
# ADR-<no.>: <title>

**Status:** proposed | accepted | replaced by ADR-<no.>
**Date:** <date>

## Context
<What forces are at play? What was the starting situation?>

## Decision
<What is being done — in the active voice, one sentence.>

## Rationale
<Why this and not the alternatives.>

## Discarded alternatives
<one sentence per alternative, why not.>

## Consequences
<What follows from this, including the unpleasant parts. What must not
happen anymore?>
```

> `ADR-001` sat directly under `docs/` until 2026-07-25. The number stays
> three digits, because code comments in `src/app.js`,
> `src/lib/transform.js`, `scripts/build-data.mjs`, and the workflow refer
> to "ADR-001".
>
> The "Repo structure (derived from this)" section in ADR-001 shows the
> state as of **2026-07-20** and names `docs/SPEC.md` — today `docs/PRD.md`.
> That's deliberate: ADRs aren't smoothed over after the fact, or you lose
> what was actually decided back then.
