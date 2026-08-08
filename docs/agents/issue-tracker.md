# Issue tracker: in-repo Markdown

Issues for this repo do **not** live in GitHub Issues. The GitHub remote
(`Ahirrea/BauWatch-KA`) exists for hosting and Pages only; its issue tracker is
empty and stays that way. Work items live in two Markdown artifacts under
`docs/`, and which one a given item belongs in is a documented decision, not a
preference:

- **`docs/BACKLOG.md`** — technical tasks and small fixes, numbered `#1`, `#2`, …
  The `#28`/`#29`/`#31` references scattered through `CLAUDE.md` are these
  numbers, not GitHub issue numbers.
- **`docs/anforderungen/A-<no.>-<short-title>.md`** — elaborated requirements,
  one file each, produced by the refinement process in `docs/PROZESS.md`.
  `docs/anforderungen/README.md` is the overview **and the only source of
  status**.

Never call `gh issue create` for this repo, and never open a GitHub issue as a
side effect of another skill.

## Which artifact does this item belong in?

The test is in
[`docs/PROZESS.md`](../PROZESS.md#requirement-or-task-the-test); repeated here
because getting it wrong puts the item in the wrong file:

**Requirement** (`docs/anforderungen/A-…`) if *any one* applies: the user
experience changes visibly; a product decision is still open; it is in tension
with a documented decision in `docs/adr/`; the data model or persistence is
affected.

**Task** (`docs/BACKLOG.md`) if: behaviour stays the same (refactoring, tests,
docs, dependencies); it is a fix with an obvious solution; it is done in one
sitting and nobody will later ask *why* it was done that way.

## Conventions — `docs/BACKLOG.md`

- One item per entry, numbered `#<n>`. Title, context, and Definition of Done
  below it. Order is a rough build sequence.
- Suggested category labels used in the file: `setup`, `data`, `frontend`,
  `a11y`, `docs`, `enhancement`.
- **Status is stated twice and both must be updated together**: the `⬜`/`🟡`/`✅`
  checkbox on the entry, *and* the `**Status:**` / `**As of:**` header plus the
  summary paragraph that names individual numbers as open or done. Flipping only
  the checkbox leaves a header that contradicts the entry — silent drift, and no
  test catches it here.
- Numbers are stable and never reused.

## Conventions — `docs/anforderungen/`

- A raw idea is **a line in the overview table** with status `💡 idea` — no file.
  A file (`A-<no.>-<short-title>.md`, copied from `_vorlage.md`) comes into being
  only when refinement has actually produced options, figures, and decisions.
- **Status lives only in `docs/anforderungen/README.md`.** The requirement files
  carry no status line. Do not add one.
- Status lifecycle: `💡 idea` → `✅ ready` → `🚧 in progress` → `🏁 done`, with
  `🧊 deferred` / `🗑 discarded` as branch-offs, each with a reason.
- Numbers are stable and never reused, not even for `🗑 discarded`. Gaps are
  fine; broken cross-references are not.
- Requirement files are **not** append-only, but a decision that implementation
  disproves is revised in place with the original left visible: keep `E<n>` and
  follow it with an `E<n> revised (<date>)` block naming the evidence.
- A new idea landing on an existing requirement does not automatically get a new
  number — see
  [step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement).

Architectural decisions additionally get an ADR under `docs/adr/`, which is
**append-only** — an ADR is never rewritten.

## Implementation needs an explicit green light

`docs/PROZESS.md` step 8 is binding: a refined requirement is not a licence to
start coding. Implementation begins only when the idea's originator agrees, and
**a pre-chosen feature branch name is not a green light**. Skills that would
otherwise move straight from a written spec into code must stop and ask.

## When a skill says "publish to the issue tracker"

Apply the requirement-or-task test above, then:

- **Task** → append an entry to `docs/BACKLOG.md` with the next free `#<n>`, and
  update the header `**Status:**` / `**As of:**` line and the summary paragraph
  in the same edit.
- **Requirement** → add a line to the overview table in
  `docs/anforderungen/README.md` with status `💡 idea`. Only write
  `A-<no.>-<short-title>.md` once the refinement process has actually run; then
  link the line and set it to `✅ ready`.

## When a skill says "fetch the relevant ticket"

Read the file. `#<n>` means the entry in `docs/BACKLOG.md`; `A-<n>` means
`docs/anforderungen/A-<n>-*.md` plus its row in that folder's `README.md` for
the current status. Both are plain Markdown — read them directly rather than
shelling out to a CLI.

## Triage state

Triage roles are recorded as a `Status:` line on the item, using the label
strings in [`triage-labels.md`](./triage-labels.md). For `docs/BACKLOG.md`
entries that line sits directly under the entry title; for requirements the
lifecycle status in `docs/anforderungen/README.md` is authoritative and a triage
label must not replace it.

## Wayfinding operations

Used by `/wayfinder`. Wayfinder maps are exploration scaffolding, not documented
requirements — they must **not** be created under `docs/anforderungen/`, which is
deliberately kept free of empty templates. They live under `.scratch/`, which is
gitignored:

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`,
  with the question in the body. A `Type:` line records the ticket type
  (`research`/`prototype`/`grilling`/`task`); a `Status:` line records
  `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked
  when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open,
  unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set
  `Status: resolved`, then append a context pointer to the map's
  Decisions-so-far in `map.md`.

When an exploration produces something worth keeping, promote it into
`docs/BACKLOG.md` or `docs/anforderungen/` by the rules above. The `.scratch/`
copy stays disposable.
