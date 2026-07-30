# Process: From Idea to Implementation-Ready Requirement

**Status:** accepted
**Date:** 2026-07-25 (replaces `FEATURE-REFINEMENT.md` from 2026-07-23)
**Purpose:** how a raw idea becomes an implementation-ready, documented
requirement — before a single line of code exists.

This process is binding for every non-trivial idea. The result of every
refinement is **its own file** under
[`docs/anforderungen/`](./anforderungen/README.md) (`A-<no.>-<short-title>.md`).
Small fixes and purely technical tasks still go through
[`BACKLOG.md`](./BACKLOG.md) and don't need this procedure.

## Guiding principle

**Understand and decide first**, then build. The most expensive line of
code is the one written before the idea was checked against the project's
constraints. Refinement makes the tensions visible, maps out the solution
space, and makes the decisions deliberately — together with the idea's
originator.

## Requirement or Task? The Test

Before the process starts: does this even belong here?

**Requirement** (`docs/anforderungen/A-…`), if *any one* of these applies:
- The user experience changes visibly.
- A product decision is still open.
- It's in tension with a non-goal in [`PRD.md`](./PRD.md).
- The data model or persistence is affected.

**Task** ([`BACKLOG.md`](./BACKLOG.md)), if:
- Behavior stays the same (refactoring, tests, docs, dependencies).
- It's a fix with an obvious solution.
- It's done in one sitting and nobody will later ask *why* it was done that way.

## Line or file?

A **raw idea doesn't need a file**. As long as it's explained in one
sentence, a line in the [overview](./anforderungen/README.md#overview) with
status `💡 idea` is enough. Only once more is written down — options,
figures, cross-references, decisions made — does it get its own file. The
requirements list should hold elaborated requirements, not a collection of
empty templates.

## The steps

### 1. Capture the idea
User story in one sentence: **As a \<role\>, I want \<goal\>, so that \<benefit\>.**
No solution yet, just the need.

### 2. Survey the code
What already exists and connects here? Which modules, fields, functions are
affected? Honestly name what's reusable and what's missing. (Example
"Mein Arbeitsweg"/commute: the mode-of-transport filter and Nominatim search
already existed, only route geometry and persistence were missing.)

### 3. Surface tensions & constraints
Check against the project's DNA: [`PRD.md`](./PRD.md) (goals/**non-goals**),
the [decisions](./entscheidungen/README.md), the pitfalls in `CLAUDE.md`.
Does the idea contradict a non-goal? That's not a dealbreaker, but it must be
**explicitly** named and resolved. (Example: "no routing" — resolved by
adding routing only as an optional, user-triggered enrichment with a
fallback, not in the core load path.)

### 4. Map the solution space
**Multiple** options with honest trade-offs, not just the preferred
solution. Evaluate each option against the constraints. State a
**well-reasoned recommendation**. Be willing to revise your own first
impression if an argument tips it.

### 5. Make decisions together
Put open forks clearly up for a choice (route model, persistence, buffer
widths, …). Record the decisions along with the reasoning — they belong in
the requirement file, so it's traceable later *why* it was done this way and
not another.

If the decision changes the **architecture** or binds the project long-term,
it additionally belongs as an
[ADR](./entscheidungen/README.md).

### 6. Fully elaborate
The specification covers at least:
goals/non-goals · UX flow & states · interaction with existing features ·
data model/persistence · external dependencies & fallback · **edge cases &
error handling** · accessibility · test plan · docs/backlog impact ·
rough implementation steps.

### 7. Add to the requirements list
Copy [`docs/anforderungen/_vorlage.md`](./anforderungen/_vorlage.md) to
`docs/anforderungen/A-<no.>-<short-title>.md` and fill it in, then in
[`docs/anforderungen/README.md`](./anforderungen/README.md) set the line's
status to **✅ ready** and link it. The status
lives **only** in this overview, not in the requirement file.

### 7a. Amending an already-refined requirement

A new idea sometimes lands on a requirement that already exists. Which of
three things to do depends on **where that requirement stands** — and the
answer is not obvious enough to re-derive each time:

- **Refined, not yet implemented → amend in place.** Add a dated block
  (`### Amendment decisions (<date>)`), continue the decision numbering
  (never renumber existing decisions — cross-references point at them), and
  extend Scope, Specification, Test plan, Definition of Done and the
  implementation steps. Note the date in the header next to `Refined on:`, and
  state explicitly which earlier decisions **survive** untouched — that's the
  part a later reader cannot reconstruct.
- **Implementation started or finished → its own number.** The file is by then
  the record of why it was solved *that* way; extending it would leave a
  Definition of Done that is half-met and a status that has to travel
  `🏁 → 🚧 → 🏁`. Reference the earlier requirement under `Constrained by:`
  and name the decisions of it you are relying on.
- **A decision that implementation *disproved* → revise in place**, whatever
  the status: keep the original `E<n>` visible and follow it with an
  `E<n> revised (<date>)` block naming the evidence, per `CLAUDE.md`. That is
  a correction, not an extension, and it belongs in the file whose decision
  was wrong — see A-7's `E8 revised` for the pattern.

Either way the [overview](./anforderungen/README.md) stays the only source of
status, and requirement files are **not** append-only — that rule holds only
for [`entscheidungen/`](./entscheidungen/README.md), whose ADRs are never
rewritten.

An amendment is a **fresh pass through steps 1–6**, not an edit bolted on
beside them: it gets the same survey of the current code, the same check
against non-goals, and the same options-with-a-recommendation as any other
idea. Re-survey rather than trusting the existing file — the code may have
moved a long way since it was written, and a decision built on a stale survey
is worse than no decision. If the survey invalidates decisions that were
already made, say so and record what changed, rather than quietly dropping
them.

### 8. Implementation only after a green light
Implementation happens once the idea's originator agrees — **a pre-chosen
branch name is not a green light.** At the end, check against the
**Definition of Done** and set the status in the
[overview](./anforderungen/README.md#overview) to
**🏁 done**. The file stays where it is: from then on it's the
record of *why* it was solved this way.

## Status lifecycle

`💡 idea` → `✅ ready` → `🚧 in progress` → `🏁 done`
(branch off at any point: `🧊 deferred` or `🗑 discarded`, each with a reason.)

Numbers are stable and are **never reused** — not even for
`🗑 discarded`. Gaps are fine, broken cross-references are not.

## Definition of Ready (step 7 complete)
- The user story is set, the benefit is clear.
- Conflicts with non-goals are named and resolved.
- The solution path is decided, alternatives documented.
- Edge cases, error paths, and test approach are described.
- Affected files/modules are roughly named.

## Definition of Done (step 8 complete) — project-specific
- Implemented per spec; non-goals honored.
- Tests green (`npm test`), including new tests for new pure logic.
- `src/lib/` stays DOM-/network-/dependency-free.
- Accessibility considered (focus, ARIA, `prefers-reduced-motion`).
- Docs updated (PRD/README/BACKLOG, where affected), status maintained in
  the overview.

## Roles
- **Idea's originator / product ownership:** brings the idea, decides at
  the forks, gives the green light.
- **Implementation (development/Claude):** surveys the current state, maps
  out options, recommends, elaborates, builds after approval.
