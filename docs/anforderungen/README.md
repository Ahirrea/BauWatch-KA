# Requirements

Refined ideas — the result of the [refinement process](../PROZESS.md). This
holds **elaborated requirements** with decisions made and a Definition of
Done, not raw ideas. Purely technical tasks and small fixes still go through
[`BACKLOG.md`](../BACKLOG.md) — the dividing line is in the
[process](../PROZESS.md#requirement-or-task-the-test).

**One file per requirement** in this folder (`A-<no.>-<short-title>.md`).
This overview is the entry point — and the **only source of status**: the
requirement files themselves carry no status, so nothing can drift apart. A
completed requirement **stays where it is**; from then on it's the record of
*why* it was solved this way.

**Line or file?** A raw idea stays a line in the table. Only during
refinement does `A-<no.>-<short-title>.md` come into being and the line gets
linked — that way the folder doesn't fill up with empty templates.

**Status legend:** `💡 idea` · `✅ ready` · `🚧 in progress` · `🏁 done`
· `🧊 deferred` · `🗑 discarded`

## Overview

| No. | Requirement | Status | What it's about |
|---|---|---|---|
| A-1 | [My commute](./A-1-mein-arbeitsweg.md) | ✅ ready | Shows on opening whether construction sites lie on the saved route (start → destination, one mode of transport). |
| A-2 | [Construction-site subscription (static feed)](./A-2-baustellen-abo-feed.md) | ✅ ready | Changes (added/changed/removed) as a static Atom feed for feed readers — no backend, no real push. |
| A-3 | [Installable as an app & usable offline (PWA)](./A-3-pwa-installierbar-offline.md) | 🏁 done | Site installable to the home screen; shell and last-loaded data usable offline, with a visible timestamp. |
| A-4 | [Legal notice & privacy notice](./A-4-impressum-datenschutz.md) | 🏁 done | Two text pages name the operator and the three real third-party data flows — so it's readable who's behind the offering and what goes to third parties. |
| A-5 | [Language switch (German ⇄ English)](./A-5-sprachumschalter.md) | ✅ ready | A DE/EN toggle for the map page itself — German stays the default, legal pages/PWA identity/raw dataset text stay German-only. |

## Adding a new requirement

Step 7 of the [refinement process](../PROZESS.md):

1. For a raw idea, a new line with status `💡 idea` is enough.
2. To refine it, copy [`_vorlage.md`](./_vorlage.md) to
   `A-<next no.>-<short-title>.md` and fill it in (numbers are never
   reused, not even for `🗑 discarded`), then link the line and set it to
   `✅ ready`.
3. Maintain status only here — later too, at `🚧` and `🏁`.

> Was called `docs/features/` with `F-<no.>` numbers until 2026-07-25; the
> rename changed nothing in substance. `F-1`/`F-2`/`F-3` correspond to
> `A-1`/`A-2`/`A-3`.
