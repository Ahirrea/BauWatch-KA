# ADR-006: A committed daily history of the open-site counts

**Status:** accepted
**Date:** 2026-10-18
**Context:** [A-16](../anforderungen/A-16-verlauf.md) draws how many
construction sites are open, day by day. The static site can only read files
it serves itself. Today the only record of past states is the Git history of
`data/baustellen.geojson`, and the browser cannot read that.

## Problem

- Every committed data artifact so far is either a snapshot
  (`baustellen.geojson`, `QUALITY.md`) or bounded (`changelog.json`, pruned
  to 30 days by A-6/E3). `CHANGELOG.md` grows, but it is a log for people,
  not data for the app.
- A daily series grows by one value per day, for as long as the site runs.
  That is a new kind of artifact: unbounded and append-mostly. It must also
  start with a backfill of the days that have already passed, which is data
  the Action never wrote.
- The invariants that keep the Git history meaningful still apply
  (`CLAUDE.md`): write only on a real data change, and never write a
  per-run-volatile value.

## Decision

The Action maintains **`data/history.json`**: one entry per calendar day in
Europe/Berlin, holding the counts of that day's last snapshot. It is written
in the same "real change" branch as the snapshot and is never pruned. It is
seeded once with a backfill from the snapshot's Git history, committed by
hand.

```json
[{ "date": "2026-07-20", "total": 186, "voll": 49, "teil": 124, "gering": 13 }]
```

A day without a data change has no entry; its value carries forward from the
day before.

## Rationale

- **The history already exists.** 247 commits of `data/baustellen.geojson`,
  one per real change since 2026-07-20, give a value for each of the 91 days
  up to 2026-10-18, without a gap. A backfill turns that into a chart on the
  day of release instead of three months later.
- **Only counts that the snapshot alone determines.** The total and the three
  Sperrgrad counts change exactly when the snapshot changes. A date-relative
  figure such as "ends within 7 days" changes at midnight without any data
  change. Recording it would need a write every day, which is a
  per-run-volatile value by another name.
- **Small enough never to prune.** About 67 bytes per day, about 24 KB a
  year before compression. Pruning would destroy exactly what the file is
  for.
- **One value per day; the day's last change wins.** A later run revises an
  earlier snapshot of the same day. On 2026-07-20 the first snapshots counted
  440 features before the dedup fix, and the day's last one counted 186.
  End-of-day values make the series robust against such glitches and keep
  one entry per day.

## Discarded alternatives

- **The browser reads the Git history through the GitHub API.** That adds a
  third-party host for every visitor, rate limits and a privacy-notice
  change, against ADR-001's same-origin design.
- **One entry per change instead of per day.** 247 entries for 91 days,
  irregular spacing, and no gain for a chart drawn by day.
- **Prune like `changelog.json`.** A rolling window makes the series forget
  what it exists to show, and the size does not call for it.
- **Derive the series in the browser from `changelog.json`.** It holds only
  30 days, and it leaves out the runs that changed nothing a resident cares
  about (#28). The counts cannot be rebuilt from it.

## Consequences

- `scripts/build-data.mjs` writes `data/history.json` atomically, next to
  `changelog.json`. A pure, tested helper replaces today's entry or appends
  a new one.
- `.github/workflows/update-data.yml` must list the file in its `git add`.
  The step commits an explicit list of files, so a new artifact the build
  writes is otherwise never committed, and nothing reports it. This holds
  for every new artifact; A-2's feed meets the same trap.
- The backfill is a one-off hand-made data commit
  (`scripts/backfill-history.mjs`, run by hand, outside `npm test`). It is
  the deliberate exception to "data commits come from the Action", as #28's
  cleaned `changelog.json` was. It runs once more right before the release,
  so that no day falls between the backfill and the Action's first write.
- `sw.js` serves the file network-first (`DATA_PATHS`), like
  `changelog.json`. It is not in `SHELL` and not prefetched at install.
- The file never holds a run timestamp. `date` comes from the snapshot's
  `stand`, the time of the last real change.
- A day the Action did not run looks like a day without changes. The series
  shows what was observed; missed days cannot be recovered later, because the
  WFS publishes only the current state.
