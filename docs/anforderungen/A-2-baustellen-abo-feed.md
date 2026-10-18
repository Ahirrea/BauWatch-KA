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
**Amended on:** 2026-10-18 ([step 7a](../PROZESS.md#7a-amending-an-already-refined-requirement)),
before implementation, for A-6/#28, A-14 and A-17. See
[Amendment decisions](#amendment-decisions-2026-10-18). Where the amendment
and the sketch below differ, the amendment wins.

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

> Amended on 2026-10-18: see
> [Amendment decisions](#amendment-decisions-2026-10-18) and the amended
> sections after them. The text below is kept as the July record.

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

> Amended on 2026-10-18: see
> [Amendment decisions](#amendment-decisions-2026-10-18) and the amended
> sections after them. The text below is kept as the July record.
- Global Atom feed valid, written by the Action only on a real change;
  stable IDs, `<updated>` = last real change (no noise commits).
- `src/lib/feed.js` DOM-/network-/dependency-free; `scripts/test-feed.mjs`
  green in `npm test`.
- Feed autodiscovery in `index.html`; PRD/README/BACKLOG updated.
- No new user-related data store, no login, no real push, **no additional
  data source** (no district boundaries).

## Amendment (2026-10-18)

### Why amend, and what the re-survey found

A-2 was refined on 2026-07-24 and never implemented. Since then the ground
under its sketch has moved:
- **A-6** added the in-app feed: `data/changelog.json`, written in the
  real-change branch and pruned to 30 days.
- **#28** took changes that carry only "sonstige Angaben aktualisiert" out
  of that feed.
- **A-5** made the interface bilingual.
- **ADR-002** made the delivery multi-page.
- **A-14** replaced the header and the dialog with a ☰ menu and a "Neu" tab.
- **#36** brought CI.
- **[A-17](./A-17-stadtteile.md)** now brings a district per site.

Re-survey on 2026-10-18:
- `changelog.json` already holds what a feed entry needs, filtered (#28),
  windowed (30 days) and in the real-change branch. The "Neu" tab renders
  it.
- No site-URL constant exists, and Atom needs absolute URLs.
- `update-data.yml` commits an explicit list of files. A new artifact is not
  committed unless it is listed ([ADR-006](../adr/ADR-006-verlauf-zeitreihe.md)
  names the trap).
- `src/lib/` is for modules that build and browser both import. No browser
  code renders Atom.

### Amendment decisions (2026-10-18)

The numbering continues after forks 1–3.

**4 — One entry per update run, mirroring the "Neu" tab.** *Decided by the
idea's originator* on 2026-10-18.
- Each `changelog.json` entry becomes one Atom entry.
- The title reads like the tab's heading plus counts, e.g. "18.10.2026,
  06:08 — 1 neu, 2 entfernt".
- The content is the list of titles, with the change notes.
- This replaces the sketch's per-case entries (an `<id>` per
  `vorgangsnummer` and change type): one notification per data change
  instead of a dozen on busy days.

*Discarded:* one entry per site.

**5 — The feed is generated from `changelog.json`, right after it is
written.**
- Same 30-day window, same #28 filter, same `firstFill` collapse.
- Parity becomes a chain: feed ⊆ `changelog.json` ⊆ `CHANGELOG.md`. The
  feed, the "Neu" tab and the changelog never disagree.
- This replaces "from the existing `diff` object + feature list".

**6 — The generator is a build-side module, `scripts/feed.mjs`.** It is pure,
dependency-free and tested. It is not `src/lib/feed.js` as sketched, because
nothing in the browser renders Atom.

**7 — Placement since A-14.**
- An autodiscovery `<link rel="alternate" type="application/atom+xml">` in
  `index.html`'s `<head>`.
- A link "Änderungen abonnieren (Atom-Feed)" in the ☰ menu's "Mehr"
  section.
- One line at the top of the "Neu" tab: "Diese Änderungen als Feed
  abonnieren".

The chrome strings come in DE and EN. The feed's own content stays German,
because it is dataset text (A-5/E3).

**8 — The licence travels with the data.**
- `<rights>` carries `ATTRIBUTION` from `scripts/build-data.mjs` word for
  word.
- `test-attribution.mjs` checks the feed as it checks the credits footer.
- A feed is a second place where the city's data is republished, so the
  CC-BY condition applies there too.

**9 — Absolute URLs from one constant; identities from tag URIs.**
- `SITE_URL = 'https://ahirrea.github.io/BauWatch-KA/'` in the build.
  `<link rel="self">` and `<link rel="alternate">` derive from it.
- Feed and entry `<id>`s are tag URIs. An entry's id is
  `tag:ahirrea.github.io,2026:BauWatch-KA/changes/<stand>`: stable across
  rewrites, because `stand` is the time of the real change, and unaffected by
  a later move to another domain.

**10 — Districts are named, not partitioned** (fork 3 revisited).
- With A-17, a district per site exists at no extra source for A-2. Each
  item names it after the title ("… (Durlach)").
- Feeds per district stay out. *Decided by the idea's originator* on
  2026-10-18 ("first only the global feed"); they remain cheap to add later.
- The item shape this needs belongs to A-17/E10. This file only reads it.

**11 — Bootstrapping and the commit list.**
- The implementation commit generates `feeds/alle.xml` once from the
  committed `changelog.json`. That is deterministic, #28's pattern, and makes
  the discovery link resolve from the release on.
- `update-data.yml`'s `git add` gains `feeds/alle.xml`.

**12 — The service worker leaves the feed alone.** It is neither shell nor
app data: not in `SHELL`, not in `DATA_PATHS`. Feed readers fetch it
directly. Opening it in a browser with the app installed takes ADR-002's
navigation path: network first, offline fallback.

### What survives untouched

- Fork 1 (one global feed) and fork 2 (a pure change stream).
- The push-versus-subscription analysis and its non-goals: no real push, no
  stored subscribers, no login.
- Atom 1.0.
- "Written only on a real change" and "no per-run-volatile value".
- Feed `<updated>` = the newest entry's `stand`.
- Autodiscovery.
- The file path `feeds/alle.xml`.
- The "near me" pseudo-subscription remains a separate, unrefined idea; this
  amendment does not take it up.

### Amended specification

```xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="de">
  <title>Wo wird gebaut? – Baustellen-Änderungen in Karlsruhe</title>
  <id>tag:ahirrea.github.io,2026:BauWatch-KA/changes</id>
  <link rel="self" href="https://ahirrea.github.io/BauWatch-KA/feeds/alle.xml"/>
  <link rel="alternate" type="text/html" href="https://ahirrea.github.io/BauWatch-KA/"/>
  <updated>2026-10-18T04:08:27.807Z</updated>
  <author><name>BauWatch-KA</name></author>
  <rights>Datensatz „Baustellen", Stadt Karlsruhe, Lizenz CC-BY 4.0</rights>
  <entry>
    <id>tag:ahirrea.github.io,2026:BauWatch-KA/changes/2026-10-18T04:08:27.807Z</id>
    <title>18.10.2026, 06:08 — 1 neu, 2 entfernt</title>
    <updated>2026-10-18T04:08:27.807Z</updated>
    <link rel="alternate" type="text/html" href="https://ahirrea.github.io/BauWatch-KA/"/>
    <content type="html">&lt;ul&gt;&lt;li&gt;➕ B36 Fahrtrichtung Karlsruhe, …&lt;/li&gt;…&lt;/ul&gt;</content>
  </entry>
</feed>
```

- **Entry title:** date and time in Europe/Berlin, then the counts of the
  entry's lists after the #28 filter. A `firstFill` entry reads
  "Erstbefüllung: 166 Baustellen".
- **Escaping:** every title and note is XML-escaped, and the HTML content is
  escaped once more. Titles from the city contain `&`, quotes and stray
  spaces.
- **Entry order:** newest first, as in `changelog.json`.
- **Empty window:** a valid feed without entries; `<updated>` is the
  snapshot's `stand`.

### Amended test plan

`scripts/test-feed.mjs`, in `npm test`:
- the XML is well-formed (a small checker in the test, no dependency) and
  every entry has `id`, `title`, `updated` and `content`;
- ids and `updated` derive from `stand` only: two generations from the same
  input are byte-identical;
- every entry corresponds to a `changelog.json` entry (parity);
- `&`, `<` and quotes in titles come out escaped;
- `<rights>` equals `ATTRIBUTION`;
- `update-data.yml` lists `feeds/alle.xml`;
- the committed `feeds/alle.xml` equals a fresh generation from the
  committed `changelog.json`. This guards drift between the two artifacts.

Browser: the menu link and the "Neu" tab line open the feed, the head
carries the discovery link, and the strings switch with the language.

### Amended Definition of Done

- `feeds/alle.xml` is valid Atom 1.0, generated from `changelog.json` in the
  real-change branch, and committed by the workflow. Its ids and timestamps
  derive from `stand` only.
- `scripts/test-feed.mjs` is green in `npm test`, including the attribution
  check.
- Autodiscovery, the menu link and the "Neu" tab line are in place, in DE
  and EN.
- Once A-17 is in, each item names its district.
- There is no new host, no stored data, no login and no push.
  `datenschutz.html` is unchanged: the feed is served by the same host.
- `README.md` gains a "Subscribing" section, and `CLAUDE.md` names the feed
  in the artifact list and the `git add` trap.

### Implementation steps

1. `scripts/feed.mjs` and `scripts/test-feed.mjs`.
2. Wire it into `build-data.mjs` after the `changelog.json` write; add
   `SITE_URL`; extend `update-data.yml`'s `git add`.
3. Generate `feeds/alle.xml` once from the committed `changelog.json`.
4. The discovery link, the menu link, the "Neu" tab line, strings and
   styles; bump `CACHE_SHELL`.
5. Browser checks, docs and status.

### Implementation record (2026-10-18)

Built on `ccr-0fb3ea8f-ywo45b`, after [A-16](./A-16-verlauf.md).

**Verified:**
- **`npm test`:** `scripts/test-feed.mjs` (26 checks) is part of the suite.
  It covers well-formed XML (a small checker in the test), one entry per
  changelog entry, ids and `updated` from `stand`, byte-identical
  regeneration, escaping of `&`, `<` and quotes, the entry titles, the
  `firstFill` line, the empty window, district names after titles, the
  committed feed against a fresh generation, and the wiring (workflow
  `git add`, discovery link, menu and tab links, the service worker leaving
  the feed alone). `test-attribution.mjs` checks `<rights>` against
  `ATTRIBUTION`.
- **Mutation:** six planted defects were all caught: a raw `&` in the
  committed feed, an unbalanced tag, the feed missing from `git add`, the
  discovery link removed, the build no longer writing the feed, and
  `<rights>` drifting from `ATTRIBUTION`.
- **The build's write path, simulated** against a mocked WFS:
  - a real change added an entry "18.10.2026, 11:42 — 1 neu, 2 entfernt";
  - the 164 generic-only changes of that run stayed out, as in the "Neu"
    tab;
  - feed and `changelog.json` held the same 53 entries in the same order,
    and the drift check passed on the result.
- **The bootstrap:** `node scripts/feed.mjs` generated `feeds/alle.xml` from
  the committed `changelog.json`: 52 entries, 58 KB.
- **Browser, 24 of 24 checks** in light, dark and English: the discovery
  link; the "Neu" tab's line above the runs; the menu link; the strings in
  both languages; the linked file served as Atom (`application/xml`); no page
  errors. Both links reach 9.13:1 in light mode and 6.10:1 in dark mode.

**As built, beyond the decisions:**
- **`ATTRIBUTION` is exported from `build-data.mjs`.** `feed.mjs` imports
  it back only dynamically, when run directly. A top-level await there
  deadlocked the import cycle (exit 13, "unsettled top-level await"), so the
  direct run uses a promise chain.
- **The feed carries an `<icon>`** (`icons/icon-192.png`) for readers that
  show one.
- **The "Neu" tab's line** carries a small feed glyph drawn in CSS, in
  `--accent`. It needs no new asset.
- **`test-pwa.mjs` flagged the feed links at first.** Its precache-gap
  guard requires every file `index.html` references to be in `SHELL`, and
  decision 12 keeps the feed out on purpose. The guard now has a named list
  of deliberate non-shell references, holding only `feeds/alle.xml`, and it
  asserts that this list really stays out of `SHELL`. A blanket exception
  (say, everything under `feeds/`) could hide a real precache gap.

**Definition of Done:** met. The district per item renders as soon as A-17
writes `{ titel, district }` items. The generator already reads both shapes
(tested).
