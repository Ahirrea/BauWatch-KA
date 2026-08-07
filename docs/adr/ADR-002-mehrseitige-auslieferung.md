# ADR-002: Multi-Page Delivery and Path-Aware Service-Worker Navigation

**Status:** accepted
**Date:** 2026-07-26
**Context:** with [A-4](../anforderungen/A-4-impressum-datenschutz.md), the
app gets further HTML pages alongside `index.html` for the first time. The
service worker was built for single-page-ness.

## Problem

Until now, the served application consisted of **exactly one** HTML page.
The service worker (A-3) had this assumption hard-wired:

```js
async function navigationAntwort(request) {
  const treffer = await caches.match(INDEX_URL);   // ← every navigation
  if (treffer) return treffer;
  return fetch(request);
}
```

Every navigation — no matter which path — was answered from the cache with
`index.html`. For a single-page app, that's the right, robust strategy: it
makes deep links and typos offline-proof.

But as soon as `impressum.html` is added, that same line flips into its
opposite: **installed** clients would see the map page under
`…/impressum.html`. No error, no message, no console output — just the
wrong page. Locally this never shows up, because no old service worker is
registered there. This exact class of bug is why the decision is recorded
and not just known to the code.

There's a second force at play: a legal notice that disappears offline while
the app keeps running offline would be an unnecessary inconsistency — they
are two small text files (decision E7 in A-4).

## Decision

The application is delivered as **multi-page**, and `navigationAntwort()`
becomes **path-aware**: it first looks for the *requested* path in the
shell cache, otherwise goes to the network, and only falls back to the
cached start page on a network error.

Concretely, from now on:

1. Every additional HTML page is in `SHELL` and gets precached along with
   it.
2. A navigation to a path **from** `SHELL` is answered cache-first from
   the shell cache — the right page, even offline.
3. A navigation to a path **outside** of `SHELL` goes to the network
   (GitHub Pages may serve its 404 page). Only if the network is
   unavailable does the cached start page answer, so the installed app
   doesn't end up on the browser's error page offline.
4. New pages therefore come with a **maintenance duty**: extend `SHELL`
   **and** bump `CACHE_SHELL`, or installed clients never see them.

## Rationale

The path-aware variant is the smallest change that makes the silent bug
impossible, and it keeps the property that was good about the old version:
offline, you never land on a browser error page.

The network branch for unknown paths is a deliberate behavior change
compared to A-3. Before, the service worker answered every typo in the URL
with the map page, swallowing a genuine 404 from the hosting platform. For
a statically hosted multi-page app, the host's 404 page is the more honest
answer.

## Discarded alternatives

- **Leave `navigationAntwort()` unchanged, put the legal texts in a
  collapsible section in `index.html`.** The cheapest solution, no
  service-worker rework. Discarded: a legal notice in a collapsible
  section of a map page is hard to defend as "easily recognizable and
  directly accessible", and the app would be permanently tied to
  single-page-ness (see E1 in A-4).
- **Stop intercepting navigations at all** (no `navigate` branch in the
  `fetch` handler). Would be simplest and always correct — but costs the
  start page's offline capability, i.e. A-3's core promise.
- **Network first, cache as a fallback for all navigations.** Always
  current pages, but every cold start waits on the network; that
  contradicts the installed app's "instantly there" promise. For the
  *data*, network-first still applies; for the *shell*, it stays
  cache-first.
- **A router / a single-page application.** Would make JavaScript a
  precondition for the legal notice and suggest a build step — both
  against [ADR-001](./ADR-001-statisches-hosting.md) and against E6 in
  A-4.

## Consequences

**Positive**
- New text pages are possible without further special-casing and are
  offline-proof.
- The silent "wrong page" bug can no longer occur.
- Genuine 404s from the hosting platform are no longer swallowed.

**Negative / trade-offs**
- The maintenance duty grows: **every** new HTML page must be in `SHELL`
  **and** needs a `CACHE_SHELL` bump. `scripts/test-pwa.mjs` checks both
  and now scans **all** precached HTML pages for it, not just
  `index.html`.
- The offline fallback for unknown paths delivers the start page instead
  of an error page — deliberate, but an inaccuracy.

**What must not happen anymore**
- Serving an HTML page that isn't in `SHELL`.
- Changing `SHELL` without bumping `CACHE_SHELL`.
- Turning `navigationAntwort()` back to "always `INDEX_URL`".
