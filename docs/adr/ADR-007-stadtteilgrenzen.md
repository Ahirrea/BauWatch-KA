# ADR-007: District boundaries as a committed static input

**Status:** accepted
**Date:** 2026-10-18
**Context:** [A-17](../anforderungen/A-17-stadtteile.md) assigns every
construction site to one of Karlsruhe's districts (Stadtteile), counts them,
filters by them and outlines a chosen district on the map. The WFS has no
district field. The city publishes the boundaries as a separate open dataset,
"Stadtteile Stadt Karlsruhe" on transparenz.karlsruhe.de: polygons with the
district number and name, as GeoJSON and as Shapefile. Since ADR-001 the
Action reads exactly one source.

## Problem

- A second source in the Action would make every run depend on two hosts.
  The boundaries change rarely; the GeoJSON resource is dated 2023-03-08.
  Fetching them every four hours buys nothing and doubles the ways the one
  job that keeps the site current can fail.
- The licence is stated inconsistently. The city's portal says CC0, and
  GovData's listing says CC BY 4.0.
- Development sessions cannot reach the host (egress policy), just as they
  cannot reach the WFS. Only an Action run or a Custom network environment
  can.
- A-2 decided on 2026-07-24 against "a district-boundary asset". That
  decision was about the feed, and about keeping the build to a single
  source.

## Decision

The boundaries are fetched **once**, by a dispatched Action run, and
committed as **`data/districts.geojson`**: in WGS84, simplified, and holding
only what A-17 needs (district number and name). The build reads this local
file and never fetches the boundaries itself. A refresh is a deliberate
re-run of the same step. The source is credited statically on the map,
whichever of the two licence statements holds.

## Rationale

- **The Action stays single-source.** The boundaries change over years, the
  sites over hours.
- **One file serves build and browser.** The build assigns districts from
  it, and the browser draws the outline from it. The two can never disagree
  about where a boundary runs.
- **A static credit covers both licence readings.** CC0 asks for nothing,
  CC BY 4.0 for exactly this. It costs one line.
- **A-2's concern does not return.** A committed static file adds no source
  to the Action's run. A-2 stays a single global feed and only names the
  district per item (A-2 amendment, 2026-10-18).

## Discarded alternatives

- **Fetch the boundaries on every Action run.** A second host in the
  critical path, for data that changes every few years.
- **OSM administrative boundaries via Nominatim or Overpass.** Reachable, but
  not the city's own definition of its districts, and a property derived from
  them per site raises ODbL share-alike questions.
- **The district from the WFS text** (`titel`, `lage`). The free text names
  streets, not districts, and not reliably.
- **Assign districts in the browser.** Every visitor would need
  point-in-polygon code and the boundaries before the first render, for an
  answer that is the same for everyone. It belongs in the build.

## Consequences

- `data/districts.geojson` is a committed input, not an Action output. The
  Action never rewrites it, and `update-data.yml`'s `git add` does not list
  it.
- The build sets `properties.district` from the case's **point**, the
  marker. A-7/E1 holds: `geometry` stays the point, and everything that asks
  "where" reads the point.
- The browser precaches the file (`SHELL`). It changes only with a commit,
  and that commit bumps `CACHE_SHELL` anyway.
- The credits footer gains a second source line. `test-attribution.mjs`
  guards it like the first.
- A refresh re-runs A-17's fetch step and lands as an ordinary commit. If it
  moves a site into another district, the next Action run records that as a
  regular data change.
