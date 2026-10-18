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
| A-1 | [My commute](./A-1-mein-arbeitsweg.md) | ✅ ready | Shows on opening whether construction sites lie on the saved route (start → destination, one mode of transport). Chosen for the rebuild on 2026-10-17. Its UI placement predates A-14 and gets an amendment pass ([step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)) before implementation. |
| A-2 | [Construction-site subscription (static feed)](./A-2-baustellen-abo-feed.md) | ✅ ready | Changes (added/changed/removed) as a static Atom feed for feed readers — no backend, no real push. Chosen for the rebuild on 2026-10-17. Amended on 2026-10-18 ([step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)): one entry per update run, generated from `changelog.json` and mirroring the "Neu" tab and its #28 filter; links in the ☰ menu and the "Neu" tab; each item names its district once A-17 is in. Still one global feed. |
| A-3 | [Installable as an app & usable offline (PWA)](./A-3-pwa-installierbar-offline.md) | 🏁 done | Site installable to the home screen; shell and last-loaded data usable offline, with a visible timestamp. |
| A-4 | [Legal notice & privacy notice](./A-4-impressum-datenschutz.md) | 🏁 done | Two text pages name the operator and the three real third-party data flows — so it's readable who's behind the offering and what goes to third parties. |
| A-5 | [Language switch (German ⇄ English)](./A-5-sprachumschalter.md) | 🏁 done | A DE/EN toggle for the map page itself — German stays the default, legal pages/PWA identity/raw dataset text stay German-only. |
| A-6 | ["What's new?" feed](./A-6-was-ist-neu-feed.md) | 🏁 done | A modal on the map page showing construction-site changes from the last 30 days, without personalization or a new `localStorage` key — no page reload, no login, complementary to A-2's static feed. |
| A-7 | [Construction-site areas on the map](./A-7-baustellenflaechen.md) | 🏁 done | Shows each closure's/site's actual spatial extent as a shaded polygon on the map, alongside the existing point marker, instead of discarding the WFS's second geometry. |
| A-8 | [Colour-scheme switch (light / dark)](./A-8-farbschema-umschalter.md) | 🏁 done | A system/light/dark toggle for the map page — the existing dark palette becomes choosable instead of only system-driven; "follow the system setting" stays the default and stores nothing. |
| A-9 | [Selection and hover emphasis for areas](./A-9-flaechen-hervorhebung.md) | 🏁 done | Makes the selected or hovered site's shape stand out from the ~200 others A-7 draws — three emphasis tiers on the area layer, geometry-type aware; markers, data and storage stay untouched. |
| A-10 | [Result metrics above the list](./A-10-kennzahlen-ergebnisliste.md) | 🏁 done | Summarizes the currently filtered result in one chip strip — how many sites, split by closure severity, and how many end within 7 days; derived client-side, no new data and explicitly no usage statistics. |
| A-11 | [Selection without a map zoom](./A-11-auswahl-ohne-zoom.md) | 🏁 done | Selecting a construction site no longer moves the camera — A-7/E5's `fitBounds` and the pre-A-7 zoom-to-15 both go, the popup keeps its readability via Leaflet's own `autoPan`. |
| A-12 | [Filter row: remaining duration instead of time period, counts in the closure-severity filter](./A-12-filterzeile-restdauer-kennzahlen.md) | 🏁 done | The "Zeitraum" filter has never narrowed anything in 86 snapshots — it is replaced by a remaining-duration filter, and A-10's metrics strip merges into the closure-severity buttons as facet counts. Supersedes A-10/E1, E4, E6 and `BACKLOG.md` #21. |
| A-13 | [Map focus on small screens](./A-13-kartenfokus-kleine-screens.md) | 🏁 done | On an iPhone SE the map starts at 447 px of a 667 px viewport and only a third of it is on the first screen — the filter row moves between map and list, which puts the whole map above the fold without hiding or collapsing a single control. |
| A-14 | [Full-screen map: the interface rebuilt](./A-14-vollbild-karte.md) | 🏁 done | The map fills the screen and everything else floats on it: a bottom sheet on phones, a side panel on desktop, tabs for list, statistics and "Neu", a darkened map in dark mode. The interface is rebuilt and the data foundation stays ([ADR-005](../adr/ADR-005-neuaufbau-oberflaeche.md)). Supersedes A-13's layout decisions and A-6/E1. |
| A-15 | [Statistics tab: the current snapshot](./A-15-statistik.md) | 🏁 done | The "Statistik" tab counts the open sites by closure severity, kind of work, who builds, affected mode of transport and remaining duration, plus the longest-running sites. It covers all of Karlsruhe, is derived client-side, and adds no new data and no visitor statistics. |
| A-16 | [Statistics over time](./A-16-verlauf.md) | ✅ ready | How the number of open sites develops, day by day: two small line charts in the statistics tab (all open sites, and the full closures among them), with figures, a readout and a table. The Action keeps a daily series ([ADR-006](../adr/ADR-006-verlauf-zeitreihe.md)), backfilled once from the snapshot history since 2026-07-20 (91 days). |
| A-17 | [Construction sites per district](./A-17-stadtteile.md) | ✅ ready | Each site gets its Stadtteil from the city's boundary dataset, committed once as a static input ([ADR-007](../adr/ADR-007-stadtteilgrenzen.md)). A statistics section per district; a district filter with counts, which replaces the radius search and vice versa; the chosen district outlined on the map. The district also appears in the popup, the list, the "Neu" tab and the feed. |

## Adding a new requirement

Step 7 of the [refinement process](../PROZESS.md):

1. For a raw idea, a new line with status `💡 idea` is enough.
2. To refine it, copy [`_vorlage.md`](./_vorlage.md) to
   `A-<next no.>-<short-title>.md` and fill it in (numbers are never
   reused, not even for `🗑 discarded`), then link the line and set it to
   `✅ ready`.
3. Maintain status only here — later too, at `🚧` and `🏁`.

**A new idea landing on a requirement that already exists** does not
automatically get a new number — whether it's amended in place, gets its own
number, or revises a decision depends on how far that requirement has got. See
[step 7a of the process](../PROZESS.md#7a-amending-an-already-refined-requirement).

> Was called `docs/features/` with `F-<no.>` numbers until 2026-07-25; the
> rename changed nothing in substance. `F-1`/`F-2`/`F-3` correspond to
> `A-1`/`A-2`/`A-3`.
