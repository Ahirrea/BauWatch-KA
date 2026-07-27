# PRD — Wo wird gebaut? (BauWatch-KA)

Product definition: problem, target user, goals, **non-goals**, core loop,
success criteria, constraints. Changes rarely — requirements and tasks are
derived from this, not the other way around.

Elaborated requirements: [`anforderungen/README.md`](./anforderungen/README.md) ·
Architectural decisions: [`entscheidungen/README.md`](./entscheidungen/README.md) ·
Technical tasks: [`BACKLOG.md`](./BACKLOG.md)

> Was called `docs/SPEC.md` until 2026-07-25. Unchanged in substance, just
> reordered into the seven PRD sections and given an explicit "Goals" section.

## 1. Problem

The official dataset sits in the transparency portal as a plain catalog entry
(WFS/GeoJSON, license, download link). For an ordinary person it's unusable:
no filter, no search, cryptic administrative codes, and the dataset covers
far more than Karlsruhe (Alsace, Bruchsal, Baden-Baden, Ettlingen,
Rheinstetten).

This product turns the raw data into a tool for everyday life: instead of a
data-catalog entry for developers, a map plus list that answers the question
Karlsruhe residents actually have — **"Does this affect me, on my route,
with my mode of transport, in this time period?"**

## 2. Target user

A Karlsruhe resident traveling on foot, by bike, by car, or by public
transit, who wants to know what affects her route or street. She opens the
site on her phone, has 30 seconds, and doesn't want to read instructions. No
expert audience, no administration.

## 3. Goals

- All construction sites currently active in Karlsruhe are visible
  immediately, without interaction — on a map and in a synchronized list.
- Relevance is readable in plain text: a traffic light for the closure
  severity, an understandable type label, remaining duration as "X days
  left".
- The view can be narrowed to what's relevant: radius around an address
  (1.5 km), time period, closure severity, mode of transport.
- Usable on the phone, by keyboard, and with a screen reader.
- The data's timestamp is visible at all times.

### Feature scope (v1)

- Map (Leaflet + OpenStreetMap) with construction sites as color-coded
  markers.
- Synchronized list; clicking a list entry centers the map.
- Filters: time period (active today / this week / planned soon / all),
  closure severity (traffic light), mode of transport (foot / bike / car).
- Address/radius search (geocoding via Nominatim), 1.5 km radius.
- Plain-text translation of the `art` codes, cleanup of the HTML fragments in
  `zusatzinfo`, remaining duration as "X days left".
- Stats bar (count, full closures, obstructions).
- Responsive down to mobile; keyboard operable; `stand` (snapshot) date
  visible.
- **Installable to the home screen and usable offline** (PWA): the app
  shell and the last loaded data snapshot live on the device, marked as
  offline when applicable. See
  [A-3](./anforderungen/A-3-pwa-installierbar-offline.md).

## 4. Non-goals (deliberately excluded)

- **No routing / no navigation.** We show relevance, not detours.
  (Resolved for [A-1](./anforderungen/A-1-mein-arbeitsweg.md): routing only
  as an optional, user-triggered enrichment with a fallback.)
- **No other municipalities.** The dataset contains them, we filter them out.
- **No user account, no login.** Everything anonymous and client-side.
- **No real push.** (Subscription variant without a backend, see
  [A-2](./anforderungen/A-2-baustellen-abo-feed.md).) The service worker from
  [A-3](./anforderungen/A-3-pwa-installierbar-offline.md) would be the
  technical prerequisite for it — that's why it **deliberately has no
  `push`, `notificationclick`, or `sync` handler**, which
  `scripts/test-pwa.mjs` checks.
- **No reporting channel back** to the city (possibly later).
- **No data storage of our own** beyond the committed GeoJSON. The offline
  cache from [A-3](./anforderungen/A-3-pwa-installierbar-offline.md) only
  keeps **the same served files** on the device — nothing user-related,
  nothing that wasn't loaded anyway, deletable at any time via the browser
  settings.
- **No backend, no build step for the frontend.** See
  [ADR-001](./entscheidungen/ADR-001-statisches-hosting.md).

## 5. Core loop

1. User opens the site → immediately sees all construction sites currently
   active in Karlsruhe on the map and in a list.
2. She enters an address → the view narrows to the radius, sorted by
   distance.
3. She filters by mode of transport, closure severity, time period → sees
   only what's relevant, in plain text, with a traffic light and remaining
   duration.

This loop must be fast, understandable, and operable without instructions.
Everything else is secondary.

## 6. Success criteria

- Someone unfamiliar with the area finds out in under 30 seconds whether
  their street is affected.
- The site loads without a server and causes no running costs.
- The data is never older than the last Action run, and the snapshot date
  is visible. **With a network, this holds unchanged** — the data fetch is
  network-first, a cached snapshot never overrides the fresh one.
  **Without a network**, the site shows the last loaded state, but then
  explicitly marked as "offline, from device storage": transparently stale
  instead of nothing at all
  (see [A-3](./anforderungen/A-3-pwa-installierbar-offline.md)).

## 7. Constraints

- **Data source:** the City of Karlsruhe's WFS endpoint (`mobil.trk.de/geoserver`),
  layer `TBA:baustellen_aktuell`, GeoJSON format. Coordinates in EPSG:25832
  (UTM 32N), must be transformed to WGS84. Every case appears twice
  (point + polygon) and is deduplicated via `vorgangsnummer`. Field
  `gemeinde` filters on `"Karlsruhe"` (Alsace entries have `null`).
- **Geocoding:** Nominatim (OpenStreetMap) for the address/radius search —
  the only live call from the browser. Follow the usage policy (rate limit,
  `User-Agent`/referer).
- **Data license:** Creative Commons Attribution 4.0 (CC-BY 4.0). The
  source reference "Dataset 'Baustellen', City of Karlsruhe" is carried in
  the footer.
- **Code license:** MIT (see `LICENSE`).
- **Cost:** zero. Hosting via GitHub Pages, data updates via GitHub Actions,
  all data sources free of charge.
- **Language:** internal artifacts (code comments, commits, docs): English,
  since 2026-07-27. **The UI stays German** — code comments, commits, and
  docs are one thing; the product's actual audience is German-speaking
  Karlsruhe residents, so `index.html`, `src/app.js`, `impressum.html`,
  `datenschutz.html`, and the manifest's `name`/`short_name`/`lang` fields
  are a separate, deliberate exception. Translating the app itself would be
  its own, much bigger localization decision — not something this switch
  covers.
