# ADR-005: Rebuild the interface, keep the data foundation

**Status:** accepted
**Date:** 2026-10-17
**Context:** the idea's originator wants to "set the project up anew". Two
reasons were given: newer AI models are available, and some things should
change. The two named changes are a map that fills the whole screen and
statistics.
[A-14](../anforderungen/A-14-vollbild-karte.md) specifies the new interface.

## Problem

BauWatch-KA has two halves that aged differently.

- **The foundation** has run unattended since 2026-07-20. It is the data
  pipeline (`scripts/build-data.mjs`, `diff-data.mjs`, `quality-report.mjs`,
  ~940 lines), the shared library (`src/lib/`, ~750 lines), 13 test scripts
  (~2,300 lines), the service-worker mechanics, the legal pages, and the URL.
  The Action has committed 245 real data changes since 2026-07-20, 177 of
  them after the pipeline's last bug fix (date parsing, 2026-08-07). Its
  correctness rests on facts about the city's WFS: dedup on
  `vorgangsnummer`, the point/shape pairing, date-only parsing, and `sperrung`
  being authoritative. Those facts can only be re-verified through an Action
  run, because the WFS is blocked from development sessions by egress policy.
  The Git history of `data/baustellen.geojson` is a dated sample of every real
  change since July, and it is the raw material for any statistic over time.
- **The interface** is `index.html`, `src/app.js` and the app part of
  `src/styles.css`, ~2,400 lines in total. It is a *document page*: header,
  search, a map box at `55vh`, a filter row, a list and a footer. Thirteen
  requirements and a dozen layout tasks shaped it (#23, #33, #34, #35 and
  A-13 all moved boxes within that page). A map that fills the screen is not
  another such move. [A-13](../anforderungen/A-13-kartenfokus-kleine-screens.md)
  measured the full-height variant and declined it as "a structural rewrite of
  the page's scroll model". The page stops scrolling, and every other element
  becomes a layer above the map.

"Set it up anew" could therefore mean anything from "restyle the page" to
"new repository, start from zero". The scope needed a decision before any
code.

## Decision

The **interface is rebuilt** from a blank page as a full-screen map app shell
(A-14). The **foundation stays**: the pipeline, `src/lib/`, the data artifacts
and their history, `sw.js`'s caching strategy, the legal pages, the
repository, and the URL. *Decided by the idea's originator* on 2026-10-17,
choosing from the alternatives below.

"Rebuilt" means a new layout, new markup and a new module structure. It does
**not** mean re-deriving behaviour that is already specified. The decisions in
A-5 to A-12 about how the app *behaves* carry over unchanged unless A-14 names
one it supersedes:

- filter semantics and facet counts (A-12);
- areas and their emphasis tiers (A-7, A-9);
- selection without a camera move (A-11);
- language and colour scheme (A-5, A-8);
- the feed's 30-day window and the generic-change filter (A-6, #28);
- the offline behaviour (A-3).

## Rationale

- **A fresh build pays off where the code has to change anyway.** The
  full-screen map rewrites every layout rule and most of the markup. Patching
  those into the document page would cost more than rebuilding them, and it
  would leave the old page's assumptions behind as dead weight. Examples are
  the column heights from #35 and the first-screen budget from #33/A-13.
- **The foundation has nothing to gain.** Neither wish touches it. A rewrite
  would buy no visible change, and it would risk regressions that are
  invisible locally: a dedup or date bug shows up only after an Action run,
  on the live site, and in a committed data history that is hard to clean up
  afterwards.
- **Continuity has users.** Installed PWAs, the transparency-portal entry and
  any bookmark point at `…github.io/BauWatch-KA/`. In the same repository the
  rebuild reaches them through the existing update banner. That is one
  `CACHE_SHELL` bump and one "Neu laden" click, the path A-3 built.
- **The data history is a feature input.** A-16 (statistics over time) is
  backfilled from it. A backfill run during refinement produced 90 daily
  values from 245 snapshots. That history belongs to this repository.

## Discarded alternatives

- **Rewrite everything in the same repository.** It keeps the URL and the
  history, but it re-opens the WFS facts above. The only way to check them is
  an Action run against live data, so every regression would be found in
  production.
- **New repository, from zero.** It gives a clean slate, but it changes the
  URL. Installed apps would keep serving the old shell from their service
  worker, and the portal entry and links would break. The data history, the
  backfill source for A-16, would stay behind, and so would the requirement
  and decision record that explains the WFS quirks.
- **No rebuild; add both wishes to today's page.** This is possible for
  statistics, but not for the full-screen map: it replaces the scroll model
  that every layout rule of today's page is written against.

## Consequences

- **[ADR-001](./ADR-001-statisches-hosting.md) is untouched.** The page stays
  static and buildless: plain ES modules, Leaflet vendored under
  `vendor/leaflet/`, no framework and no bundler. GitHub Pages keeps serving
  every data commit immediately. A build step would end that, which is why
  CLAUDE.md forbids an Actions-based Pages deployment.
- **[ADR-002](./ADR-002-mehrseitige-auslieferung.md),
  [ADR-003](./ADR-003-sprachumschalter-localstorage.md) and
  [ADR-004](./ADR-004-farbschema-zweiter-localstorage-schluessel.md) are
  untouched.** The legal pages stay separate pages in `SHELL`. No new
  `localStorage` key is introduced: the sheet position, the active tab and the
  panel state are not persisted (A-14/E10).
- **The tests keep their invariants and lose their layout assumptions.**
  Several guards read only `src/app.js` or match today's markup by shape: the
  attribution's helper call, the SW-registration and import checks, the
  theme-toggle nesting, and the changelog import path. They are widened to the
  new module graph in the same change. The invariants are unchanged: the
  attribution is static and word-identical, every external host and storage
  key is documented, the dark palette exists twice and is identical, `SHELL`
  is complete, and the i18n keys match. A guard that gets weaker in the
  process is a defect of the rebuild, not a simplification.
- **Old-UI knowledge is retired or rewritten with the old UI, in the same
  change.** A CLAUDE.md pitfall that describes code which no longer exists
  misleads the next session. The main case is the note that the map
  deliberately does not follow the colour tokens because its tiles are always
  light: A-14/E8 darkens the tiles and invalidates that premise. Pitfalls
  about behaviour that carries over stay:
  - A-9's three area traps;
  - A-11's autoPan/fit trap;
  - A-12's facet-count trap;
  - the amber-as-text rule;
  - the closed-`<dialog>` rule, which now applies to the menu.

  Requirement files are records and are not rewritten. A-14 lists which of
  their decisions it supersedes.
- **What must not happen anymore:**
  - No new feature is built on today's page while A-14 is open; it would be
    built twice.
  - No change to `src/lib/` semantics, the pipeline or the data artifacts
    ships under the rebuild's name. Such a change needs its own requirement
    (A-16 and A-17 are exactly that).
- **The rebuild lands as one release.** v1 and v2 never run side by side on
  the live site: no `/v2/` path and no feature flag. Two shells under one
  service-worker scope would double the precache and split the update path for
  a phase that a branch plus screenshots covers anyway.
