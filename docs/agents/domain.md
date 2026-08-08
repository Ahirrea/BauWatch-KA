# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase. This repo is **single-context** — one `CONTEXT.md` at
the root and one `docs/adr/`.

## Before exploring, read these

- **`CLAUDE.md`** at the repo root — in this repo it is the primary context
  document, not a thin pointer file. Its "Non-obvious pitfalls" section carries
  the hard constraints (`src/lib/` must stay DOM-free and dependency-free,
  dedup runs on `vorgangsnummer` not `id`, the CC-BY attribution is static in
  `index.html`, bump `CACHE_SHELL` in `sw.js` when a shell file changes, …).
  Read it before proposing any change.
- **`CONTEXT.md`** at the repo root, if it exists.
- **`docs/adr/`** — read the ADRs that touch the area you are about to work in.
  This folder is **append-only**: an ADR is never rewritten. Superseding a
  decision means writing a new ADR that says so.
- **`docs/anforderungen/A-<n>-*.md`** — the requirement files double as the
  record of *why* a feature was solved the way it was, including the numbered
  decisions `E<n>` that later work is expected to respect.

If any of these files don't exist, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The `/domain-modeling` skill
(reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates
them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CLAUDE.md                     ← primary context: architecture + pitfalls
├── CONTEXT.md                    ← glossary, once /domain-modeling creates it
├── docs/
│   ├── PROZESS.md                ← idea → implementation-ready requirement
│   ├── BACKLOG.md                ← technical tasks (#1, #2, …)
│   ├── adr/                      ← append-only decisions
│   │   ├── README.md             ← overview
│   │   ├── ADR-001-statisches-hosting.md
│   │   └── ADR-002-mehrseitige-auslieferung.md
│   └── anforderungen/            ← elaborated requirements (A-1, A-2, …)
│       ├── README.md             ← overview + only source of status
│       └── _vorlage.md           ← template
└── src/
```

ADR filenames here are `ADR-<nnn>-<german-slug>.md`, not the `0001-<slug>.md`
form used elsewhere. Match the existing pattern when adding one.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal,
a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift
to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either
you're inventing language the project doesn't use (reconsider) or there's a real
gap (note it for `/domain-modeling`).

Two vocabulary rules are already fixed in this repo:

- **The WFS field names are ground truth, not guesses**: `vorgangsnummer`,
  `vorgangszeitraum_von`/`_bis`, `lage`, `art`, `verursacher`, `zusatzinfo`,
  `sperrung`, `gemeinde`.
- **Language is split on purpose.** Repo-internal artifacts (code comments,
  commit messages, `CLAUDE.md`, `README.md`, everything under `docs/`) are
  English since 2026-07-27, and new identifiers are English. The user-facing app
  stays German: `index.html`, `src/app.js` strings, `impressum.html`,
  `datenschutz.html`, and the manifest's `name`/`short_name`/`lang`. Folder and
  file names under `docs/` kept their German names. Don't "fix" either side
  toward consistency.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-001 (static hosting) — but worth reopening because…_

The refinement process expects this: `docs/PROZESS.md` step 3 requires tensions
with documented decisions to be named and resolved, not quietly worked around.
