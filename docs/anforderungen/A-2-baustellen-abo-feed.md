# F-2 Baustellen-Abo (Construction-Site Subscription, static feed)

[← Requirements](./README.md) · [Process](../PROZESS.md)
· status: see [Overview](./README.md#overview)

**User story:** As a Karlsruhe resident, I want to subscribe to
construction-site changes, so that I find out — without a daily site visit
— when something new opens, changes, or is lifted in Karlsruhe.

**Refined on:** 2026-07-24 (evaluation of [`BACKLOG.md`](../BACKLOG.md) #16)
**Decision 2026-07-24:** **district partitioning is not pursued** — no
district-boundary asset, no point-in-polygon. That removes the only
additional data source; the feed is fed exclusively from what the build
produces anyway. The geographic "near me" need is covered **client-side**
via the existing radius search + a "since last visit" marker (see below),
not via feed-side partitioning.
**Decision 2026-07-24 (forks locked in):** **(1) only one global feed**
(no faceted feeds) and **(2) a pure change stream** (added/changed/removed,
no full-inventory feed). Both are the simple variant that falls out of the
existing build diff at almost no extra cost; both can be retrofitted later
if needed. With that, all forks are decided → **implementation-ready**.

## "Push" vs. "subscription" — separating the terms first

Two very different mechanisms hide behind the idea:

- **Push** = the system notifies the device unprompted (Web Push API).
- **Subscription** = the user, or their feed reader, actively pulls new
  entries.

That's the decisive fork, because only one of the two works without a
backend.

## Touchpoints in the code

- **The change diff already exists in full:** `diffFeatures` in
  `scripts/diff-data.mjs` delivers `added` / `removed` / `changed`
  (including human-readable field notes) and already feeds
  `data/CHANGELOG.md` + the commit/job summary. **A feed is the
  machine-readable twin of this changelog** — the item list is already
  computed, it just needs to be serialized as Atom/RSS.
- **Pre-generate-and-commit is the established pattern:** `build-data.mjs`
  writes static artifacts (GeoJSON, CHANGELOG, QUALITY) atomically and
  **only on a real data change**. A feed slots in right here as another
  artifact.
- **Nothing is missing for a global feed:** the diff + feature list are
  already available in the build. (A district split would have needed a
  derived district per case — the dataset has **no** district field, only
  `titel` + coordinates. That's off the table by decision, see above.)

## Feasibility without a backend

- **Real push: NOT feasible / discarded.** Web Push needs (1) a service
  worker (fine statically), but strictly also (2) an **application server**
  that sends the message via VAPID to the browser's push service (Google
  FCM, Mozilla, Apple), and (3) the **persistent storage of the push
  subscription (endpoint URL per browser)**. Points (2)+(3) violate the
  non-goals "no data storage of our own" and "no user account" — the
  endpoints are personally identifiable. The GitHub Action as the sender
  does **not** solve this (it would still have to store and maintain the
  endpoints somewhere). Extra hurdles: iOS Safari requires a page installed
  as a PWA, delivery is "best effort".
  → **discarded, as long as "no backend / no data storage" holds.**
- **Subscription via a static feed: FEASIBLE and architecturally
  consistent.** An Atom feed is a static file. The Action pre-generates it
  the same way it pre-generates the GeoJSON, GitHub Pages serves it
  same-origin. The **user's feed reader polls itself** — no server, no
  endpoint storage, fully anonymous. Fits ADR-001 seamlessly.

## Tension with non-goals — and resolution

- "**No push notifications in v1**" (PRD): we deliver **no** push, but a
  **subscription** (pull). The non-goal item stays intact for real push.
- "**No data storage of our own** beyond the committed GeoJSON": the feed
  is another **committed artifact derived from the same data** — no new,
  user-related data store. No storing of subscribers.
- "**No user account, no login**": a feed subscription is anonymous; the
  "user ↔ subscription" relationship lives exclusively in the user's feed
  reader.

## Feed scope — only what's possible without an extra data source

After the decision against district boundaries, two cuts remain that feed
**purely from existing fields**:

| Option | How | Trade-off |
|---|---|---|
| **(1) Global feed (recommended)** | One feed `feeds/alle.xml` with the entire change stream (added/changed/removed). | Minimal, immediately feasible, covers the core value. No geo pre-filtering. |
| (2) + Faceted feeds | Additionally, one feed per existing dimension, e.g. `feeds/vollsperrungen.xml`, `feeds/rad.xml` (from `ampel` / `verkehrsmittel`). | No new asset, but more files + combination questions; limited benefit as long as the facets are coarse. |

**Recommendation:** **(1) as the core.** Faceted feeds (2) only if the
idea's originator sees concrete demand — they're cheap to retrofit, but not
the core.

## The geographic "near me" need (without districts)

Instead of feed-side geo-partitioning, a **client-side pseudo-subscription**
covers the "what's new near me?" need: last seen `stand` + seen case IDs in
`localStorage`, shown as a banner/marker on the next visit — **combined with
the already-existing radius search** around a saved address. No feed reader,
no push, no backend, anonymous. That's the actual substitute for "per
district" and connects to existing client code (`geocode`, the radius branch
in `currentFiltered`). It will be refined as its **own small feature entry**
(complementary to F-2, not a blocker).

## Forks (all decided)

1. **Faceted feeds:** **global feed only** — no feeds by traffic light/mode
   of transport. (Cheap to retrofit on concrete demand.)
2. **Item scope:** **a pure change stream** (added/changed/removed, like
   CHANGELOG) — no "full-inventory feed". Matches the build diff 1:1.
3. ~~District assignment~~ — **none** (no district-boundary asset, no
   point-in-polygon).

## Specification (sketch, now that the forks are set)

**Format:** **Atom 1.0** (clean `<id>`/`<updated>`, GeoRSS point optional).
Exactly one file `feeds/alle.xml` (change stream, no faceted feeds).

**Generation:** a new pure module `src/lib/feed.js` (DOM-/network-/
dependency-free, a hard constraint) that renders Atom XML from the existing
`diff` object + feature list; called from `build-data.mjs` **in the same
"only on a real change" branch** as GeoJSON/CHANGELOG. No additional data
source, no geometry assignment.

**Invariant protection (pitfall from CLAUDE.md):**
- **No per-run-volatile values** in the feed. Every entry gets a **stable
  `<id>`** (from `vorgangsnummer` + change type) and an **`<updated>` that
  reflects the last *real* change** (not the run time) — otherwise noise
  commits and a broken Git history. The feed is only rewritten on a data
  change.
- The overall file's feed `<updated>` = `collection.stand`.

**Discovery:** `<link rel="alternate" type="application/atom+xml" …>` in
`index.html` + a UI notice "subscribe to changes".

**Edge cases:**
| Case | Behavior |
|---|---|
| First fill (`firstFill`) | feed with the starting inventory instead of a giant "everything new" list, analogous to CHANGELOG |
| No feed reader on the user's side | the feed stays readable in the browser; the localStorage solution supplements it |
| Empty diff (no change) | no feed rewrite (invariant "only on a real change") |

**Test plan:** `scripts/test-feed.mjs` (in `npm test`): Atom well-formedness,
stable `<id>`/`<updated>` (no volatile value), diff→item mapping
(added/removed/changed), empty diff → no feed rewrite.

**Docs/backlog impact:** PRD (tighten the "push" non-goal: subscription ≠
push), README ("Subscribing" section), [`BACKLOG.md`](../BACKLOG.md) #16
(done → points here).

## Definition of Done (on later implementation)
- Global Atom feed valid, written by the Action only on a real change;
  stable IDs, `<updated>` = last real change (no noise commits).
- `src/lib/feed.js` DOM-/network-/dependency-free; `scripts/test-feed.mjs`
  green in `npm test`.
- Feed autodiscovery in `index.html`; PRD/README/BACKLOG updated.
- No new user-related data store, no login, no real push, **no additional
  data source** (no district boundaries).
