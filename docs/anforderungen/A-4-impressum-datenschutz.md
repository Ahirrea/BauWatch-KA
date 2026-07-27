# A-4 Impressum & Datenschutzhinweis (Legal Notice & Privacy Notice)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a visitor to BauWatch-KA, I want to be able to read who
operates the site and which data goes to third parties when I use it, so
that I can judge who I'm trusting with this offering.

**Refined on:** 2026-07-26
**Addresses PRD:** "Constraints" (geocoding via Nominatim as the only live
call; licenses) — and is a prerequisite for listing in the transparency
portal, see [`../showcase-einreichung.md`](../showcase-einreichung.md)
**Constrained by:** [ADR-001](../entscheidungen/ADR-001-statisches-hosting.md)
(static hosting, no backend, no build step for the frontend)
**Target branch:** —

**Trigger:** pre-review by the open-data editorial team (2026-07-26): "For a
site linked by the city with a third-party integration (Nominatim), our
legal department typically asks about that." The editorial team explicitly
did **not** make this a condition for the showcase entry (that's only the
attribution and the field values) — it's a well-founded heads-up.

## Touchpoints in the code

**Checked, not guessed.** Starting point in the client:

| What | Where | Meaning for this requirement |
|---|---|---|
| Footer links | `index.html`, `<p class="credits">` | This is where the two new links go. **Don't touch `#attribution` and `#attribution-hinweis`** — `scripts/test-attribution.mjs` guards them. |
| Map tiles | `src/app.js`, `initMap()` → `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Third-party service, loads **automatically** on page load. |
| Geocoding | `src/app.js`, `geocode()` → `nominatim.openstreetmap.org` | Third-party service, **only on submitting** the search (no autocomplete). Transmits the entered address. |
| No client storage | `src/`, `index.html`, `sw.js` | `localStorage`, `sessionStorage`, `document.cookie`, `indexedDB`, `navigator.geolocation`: **no hits.** So the notice can honestly claim "no cookies, no tracking". |
| Service-worker cache | `sw.js`, `CACHE_SHELL` / `CACHE_DATA` | Device storage, holds only served files. No transmission, deletable at any time. |
| Shell precache | `sw.js`, `SHELL` (hand-maintained), `SHELL_PATHS` | New pages must be entered here, or they're gone offline while the app keeps running. |
| **Navigation response** | `sw.js:117`, `navigationAntwort()` | **The most important finding:** answers **every** navigation with the cached `INDEX_URL` (`'./'`). A second HTML page would be silently covered by `index.html` for installed clients. |
| Precache test | `scripts/test-pwa.mjs` | Today scans **only** the references from `index.html`. New pages fall through the net. |
| Text-page look | `src/styles.css`, `.app-footer`, `.app-footer a` | There's still **no** class for a plain text page; that has to be added. `--amber` stays forbidden as a text color. |

**Reusable:** color variables and typography from `styles.css`, the footer
structure, the "manual script + test" pattern from A-3.
**Missing:** the two pages themselves, a text-page class, path-aware
navigation in the service worker, a test for the legal texts.

## Tension with non-goals — and resolution

1. **"No backend, no build step for the frontend" (ADR-001).**
   → Resolved: two ordinary static HTML files, **no contact form** (that
   would need a server). Contact via `mailto:`. ADR-001 stays untouched.

2. **"No data storage of our own."** The legal notice contains personal
   data — but **the operator's**, not the users'. The non-goal targets
   storing user data; no contradiction. Explicitly named so nobody trips
   over it later.

3. **The app has been single-page so far — the service worker relies on
   that.** `navigationAntwort()` delivers `index.html` for every
   navigation. Without an adjustment, **installed** clients would see the
   map page under `/impressum.html`: no error, no message, just the wrong
   page. Locally this never shows up (there's no old cache there).
   → Resolved: `navigationAntwort()` becomes path-aware — a hit in the
   shell cache for the **requested** path first, `INDEX_URL` only as a
   fallback for the root. Because this permanently sets the app's
   navigation strategy, it additionally belongs as **ADR-002** under
   `../entscheidungen/` (see implementation steps).

4. **PWA pitfalls** (`CLAUDE.md`): shell file changed → `CACHE_SHELL` from
   `v2` to `v3`, or installed clients won't see the new pages indefinitely.
   `SHELL` is all-or-nothing per version: a typo makes `cache.addAll` fail
   and the SW never installs. → Both covered by the extended
   `test-pwa.mjs`.

5. **GitHub Pages serves from a sub-path** `…github.io/BauWatch-KA/`. → All
   paths in the new pages **relative** (`src/styles.css`, not
   `/src/styles.css`), or they break silently.

6. **Attribution.** The footer rework must not touch the static CC-BY
   line. → `scripts/test-attribution.mjs` runs in `npm test` and fails if
   it does.

7. **Anticipating [A-1](./A-1-mein-arbeitsweg.md) (`✅ ready`).** A-1 brings
   `localStorage` (key `bauwatch.arbeitsweg`) **and another third-party
   service** (FOSSGIS OSRM, `routing.openstreetmap.de`). Once A-1 is
   implemented, a privacy notice written today would be incomplete — hence
   wrong.
   → Resolved two ways: (a) A-1's Definition of Done gets "privacy notice
   kept up to date" added, and (b) the new test checks **mechanically**
   that every external host occurring in the frontend code is also named
   in the notice. That way `npm test` fails if someone adds a third-party
   service and forgets the text — the same drift guard as for the
   attribution.

## Decisions (with rationale)

**E1 — Two separate pages** (`impressum.html`, `datenschutz.html`). The
most conventional form, its own stable URLs, easy to extend. *Discarded:*
one page with anchors `#impressum`/`#datenschutz` (less effort, but
unusual); a collapsible section in `index.html` (cheapest — no SW rework —
but a legal notice in a collapsible section of a map page is hard to defend
as "easily recognizable and directly accessible").

**E2 — Name + a project-owned email address, no postal address.**
Rationale: a purely private, volunteer-run offering without revenue,
advertising, or commercial character; the postal-address requirement is
mostly considered inapplicable to such sites. The editorial team itself
spoke of a heads-up, not a condition. *Discarded:* a full home address
(pre-empts any discussion, but permanently publishes the private address on
a page linked by the city); a PO box/c-o address (formally clean, costs
setup — remains the fallback plan if the legal department insists on a
deliverable address).
**Reservation, explicitly stated:** this is a product decision based on a
layperson's judgment, **not legal advice.** Of all the points in this
requirement, this is the one where a legal opinion is worth the most.

**E3 — Plain text plus the required items.** The four real data flows
described concretely, plus the responsible party, the legal basis, data
subject rights, and the supervisory authority. *Discarded:* just the data
flows (formal items missing → a follow-up question is likely); a
boilerplate notice from a generator (typically claims cookies, analytics,
and a newsletter — factually wrong here, and untruths in a privacy notice
are worse than gaps).

**E4 — No contact form, `mailto:`.** Follows directly from ADR-001.

**E5 — Same email address as in the showcase entry.** One contact channel,
not two; otherwise the portal entry and the legal notice drift apart.

**E6 — The new pages get by without JavaScript and without Leaflet.**
Plain text pages. That means they also work without JS and are fast — and
they don't need `app.js` in the precache path.

**E7 — Both pages go into `SHELL`.** They're reachable offline. An app
that runs offline but whose legal notice disappears offline would be an
unnecessary inconsistency — they're two small text files.

**E8 — No cookie banner, no consent dialog.** There's nothing to consent
to: no cookies, no tracking, no reach measurement.

## Scope / Non-scope

- **In:** `impressum.html` and `datenschutz.html`; two footer links in
  `index.html`; text-page styles in `src/styles.css`; `sw.js`
  (`SHELL` entries, `CACHE_SHELL` → `v3`, path-aware
  `navigationAntwort()`); `scripts/test-pwa.mjs` extended; new
  `scripts/test-rechtstexte.mjs`; ADR-002; docs follow-up.
- **Out:** contact form (ADR-001); cookie/consent banner (E8); a BITV
  accessibility statement (its own topic, applies to public bodies —
  BauWatch-KA isn't one); multiple languages; legal advice.
- **Out, but explicitly named:** **loading map tiles only after
  consent.** The OSM tiles transmit the IP address to the OSMF on page
  load, without the user doing anything. A strict reading would require a
  prior consent step ("load the map?") for that. That would directly
  damage the PRD's core loop ("visible immediately, without interaction")
  and is therefore its own trade-off — not part of A-4. The privacy notice
  names that data flow all the more clearly because of it. If the legal
  department comes back to this: its own requirement.

## Specification

### UX flow & states

In the footer of `index.html`, in the `.credits` paragraph, two additional
links: "Impressum" and "Datenschutz". Both pages are lean text documents
with an `<h1>`, structured `<h2>` sections, a "← Back to the map" link as
the **first** tab stop, and linked to each other. Header and footer look
like the main page, so they're recognizable as part of the same offering.
There are no states — no loading, no error case, no JS.

### Content of `impressum.html`

- **Verantwortlich für den Inhalt** ("Responsible for the content"): name,
  email (`mailto:`), no postal address (E2).
- **Classification:** a private, volunteer-run citizen project; **not** an
  offering of the City of Karlsruhe, not on its behalf. (Matches the
  framing in the cover letter.)
- **Liability for content and links:** the construction-site data comes
  from the city and is carried over unchanged; the on-site signage is
  binding.
- **Copyright/licenses:** code MIT; data CC-BY 4.0 (City of Karlsruhe);
  map data OpenStreetMap (ODbL) — each linked.
- **Source code:** a link to the repository.

### Content of `datenschutz.html`

1. **Verantwortliche Stelle** ("Responsible party") — as in the legal
   notice.
2. **"What this page doesn't do"** (at the top, because it's most of it):
   no cookies, no tracking, no reach measurement, no user account, no
   sharing of data, no storage of user data of its own. Verifiable in the
   code — the source is open.
3. **Data flows to third parties** as a table with columns *service ·
   when · data transmitted · purpose · the third party's privacy notice*:

   | Service | When | Data transmitted |
   |---|---|---|
   | GitHub Pages (hosting) | on every visit | IP address, timestamp, requested file, user agent (the host's server logs) |
   | `tile.openstreetmap.org` (OSMF) | automatically when the map loads | IP address, referer, requested tiles |
   | `nominatim.openstreetmap.org` (OSMF) | **only** on submitting the address search | IP address, referer, **the entered address** |

4. **Storage on the user's own device:** the service worker stores app
   files and the last data snapshot in the browser cache so the site works
   offline. That stays on the device, isn't transmitted, and can be
   deleted at any time via the browser settings.
5. **Legal basis:** Art. 6(1)(f) GDPR (legitimate interest in the
   technical provision of the site). The user triggers the address search
   herself.
6. **Data subject rights:** access, rectification, erasure, restriction,
   objection, complaint — noting that no personal data is stored here, so
   access requests should be directed to the named third parties.
   Supervisory authority: the data protection and freedom of information
   commissioner for Baden-Württemberg.
7. **Timestamp:** the date of the last change, static in the HTML (not via
   JS — the same lesson as with the attribution).

### Interaction with existing features

- `sw.js`: `'impressum.html'` and `'datenschutz.html'` in `SHELL`;
  `CACHE_SHELL` to `'bauwatch-shell-v3'`; `navigationAntwort()` checks the
  requested path in the shell cache **first** and only then falls back to
  `INDEX_URL`.
- `src/styles.css`: a new class (e.g. `.textseite`) with a readable max
  width; colors from the existing variables, light and dark.
- Attribution, liability notice, and data timestamp in `index.html` stay
  unchanged.

### Data model / persistence

None. Two static files, no new storage, no new field in the GeoJSON.

### External dependencies & fallback

None new. The pages are available offline from the cache (E7); without a
service worker, the server delivers them like any other static file.

### Edge cases & error handling

| Case | Behavior |
|---|---|
| No JavaScript | pages fully usable (E6) |
| Offline, PWA installed | pages from the shell cache |
| Installed client with an old SW version | only gets the new pages after the `CACHE_SHELL` bump — **that's why** the bump is part of the DoD |
| Direct request for `…/impressum.html` | path-aware navigation delivers the right page, not `index.html` |
| Dark mode | like the main page; `--amber` not used as a text color |

### Accessibility

`lang="de"`; one `<h1>` per page, then a gap-free `<h2>` hierarchy; tables
with `<th scope="col">`; the back link as the first tab stop; visible
focus and contrasts like the main page; no collapsible mechanism that
hides content from screen readers. Running text, no layout tables. No skip
link needed (no extensive navigation before it).

### Test plan

**Extend `scripts/test-pwa.mjs`:** the two pages are in `SHELL`; every file
**they** reference is also precached (today only `index.html` is scanned);
`navigationAntwort()` is path-aware.

**`scripts/test-rechtstexte.mjs` (new, in `npm test`):**
1. Both files exist and are linked from the footer of `index.html`.
2. All paths in them are relative (no leading `/`) — the sub-path trap.
3. Required sections present (responsible party, legal basis, data
   subject rights, supervisory authority, timestamp).
4. **Drift guard:** every external host occurring in `src/*.js` must be
   named in the privacy notice. If someone adds a third-party service —
   say, `routing.openstreetmap.de` for A-1 — `npm test` goes red.
5. Cross-check like `test-attribution.mjs`: trigger the regressions
   artificially once and prove the test catches them.

**Browser (Playwright):** links reachable in the footer; pages available
offline from the cache; under `localhost`, an installed SW serves
`impressum.html` and **not** `index.html` (exactly the finding from tension
3).

### Docs/backlog impact

- **ADR-002** (new, append-only): path-aware SW navigation / the app
  becomes multi-page.
- `README.md`: structure (new files, new test script), test section.
- `CLAUDE.md`: the pitfall "`navigationAntwort()` covers every navigation"
  and the new drift test.
- [`../showcase-einreichung.md`](../showcase-einreichung.md): check the
  legal-notice/privacy-notice box, close the open item.
- [`A-1`](./A-1-mein-arbeitsweg.md): extend the Definition of Done with
  "privacy notice extended for `localStorage` and the routing service"
  (tension 7).
- `docs/BACKLOG.md`: no new task — runs entirely through this requirement.

## Definition of Done

- `impressum.html` and `datenschutz.html` exist, are linked from the
  footer, and contain the sections listed under "Content".
- The content matches the code: exactly the three third-party services, no
  untrue claim about cookies/tracking.
- Both pages usable without JavaScript and available offline from the
  cache.
- `sw.js`: pages in `SHELL`, `CACHE_SHELL` at `v3`, `navigationAntwort()`
  path-aware; an installed client gets the legal notice at
  `/impressum.html`.
- `npm test` green, including the extended `test-pwa.mjs` and the new
  `test-rechtstexte.mjs`; the drift guard is proven by a cross-check.
- Attribution, liability notice, and data timestamp unchanged
  (`test-attribution.mjs` green).
- Accessibility as above; contrasts checked light **and** dark.
- ADR-002 filed; README, CLAUDE.md, the showcase document, and A-1 updated.
- Status in the [overview](./README.md#overview) set to `🏁 done`.

## Implementation steps

1. Write **ADR-002** (multi-page delivery + path-aware SW navigation) —
   before the code, because it records the decision.
2. `sw.js`: make `navigationAntwort()` path-aware, extend `SHELL`,
   `CACHE_SHELL` → `v3`.
3. Write `impressum.html` and `datenschutz.html`; insert name and email
   (the same address as in the showcase entry, E5).
4. Footer links in `index.html`; text-page styles in `src/styles.css`.
5. Write `scripts/test-rechtstexte.mjs`, extend `test-pwa.mjs`, both into
   `npm test`; cross-check the drift guard.
6. Browser check including the offline and SW-navigation case.
7. Update docs (README, CLAUDE.md, showcase document, A-1's DoD), status to
   `🏁 done`.

> **Open and deliberately not decided here:** the project's own email
> address must exist before step 3 can run (see "Open items" in the
> [showcase document](../showcase-einreichung.md#open-items)). And the
> reservation from **E2** stands: a legal review is worth the money for
> the personal-details items.
