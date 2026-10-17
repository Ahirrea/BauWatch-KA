// feed.js — "Was ist neu?" (A-6), split out of app.js in A-14/E11.
//
// Deliberately no interaction with the map/list/filters (A-6/E5) — an
// independent, self-contained view. No personalization, same fixed 30-day
// window for every visitor (E2) — no new localStorage key.

import { filterChangelogEntries } from '../lib/changelog.js';
import { state } from './state.js';
import { el, escapeHtml } from './dom.js';
import { STAND_LOCALE, str } from './text.js';

const CHANGELOG_URL = 'data/changelog.json'; // "Was ist neu?"-Feed (A-6)

// null = not loaded yet, 'error' = fetch/parse failed, array = loaded entries.
let changelogEntries = null;

function changelogRunHtml(entry) {
  const when = entry.stand
    ? new Date(entry.stand).toLocaleString(STAND_LOCALE[state.lang], { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  if (entry.firstFill) {
    const text = entry.total === 1 ? str('whatsNewFirstFillOne') : str('whatsNewFirstFillMany', { n: entry.total });
    return `
      <section class="whats-new-run">
        <h3>${escapeHtml(when)}</h3>
        <ul><li>🎉 ${escapeHtml(text)}</li></ul>
      </section>
    `;
  }
  // Quoted content (titles, change notes) stays German — it's a verbatim quote
  // of the same raw city data the main list already leaves untranslated (E6),
  // only the chrome labels around it (visually-hidden "Added:"/…) are bilingual.
  const items = [
    ...(entry.hinzugefuegt || []).map(
      (titel) =>
        `<li><span class="visually-hidden">${escapeHtml(str('whatsNewAdded'))}</span> ➕ <strong>${escapeHtml(titel)}</strong></li>`
    ),
    ...(entry.entfernt || []).map(
      (titel) =>
        `<li><span class="visually-hidden">${escapeHtml(str('whatsNewRemoved'))}</span> ➖ <s>${escapeHtml(titel)}</s></li>`
    ),
    ...(entry.geaendert || []).map(
      (c) =>
        `<li><span class="visually-hidden">${escapeHtml(str('whatsNewChanged'))}</span> ✏️ ${escapeHtml(c.titel)} — ${escapeHtml((c.changes || []).join('; '))}</li>`
    ),
  ].join('');
  return `
    <section class="whats-new-run">
      <h3>${escapeHtml(when)}</h3>
      <ul>${items}</ul>
    </section>
  `;
}

export function renderChangelogBody() {
  const body = el('whats-new-body');
  if (!body) return;
  if (changelogEntries === null) {
    body.innerHTML = `<p>${escapeHtml(str('whatsNewLoading'))}</p>`;
  } else if (changelogEntries === 'error') {
    body.innerHTML = `<p class="whats-new-error">${escapeHtml(str('whatsNewError'))}</p>`;
  } else if (changelogEntries.length === 0) {
    body.innerHTML = `<p>${escapeHtml(str('whatsNewEmpty'))}</p>`;
  } else {
    body.innerHTML = changelogEntries.map((entry) => changelogRunHtml(entry)).join('');
  }
}

async function loadChangelog() {
  changelogEntries = null;
  renderChangelogBody();
  try {
    const res = await fetch(CHANGELOG_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // filterChangelogEntries() drops changes that carry only GENERIC_CHANGE_NOTE
    // and any run left empty by that (#28) — the literal lives in
    // src/lib/changelog.js, nowhere else. Current builds already write the file
    // that way; this covers the entries still in the 30-day window from before
    // — and a copy an installed Service Worker cached earlier.
    changelogEntries = filterChangelogEntries(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    changelogEntries = 'error';
  }
  renderChangelogBody();
}

export function wireWhatsNew() {
  const btn = el('whats-new-btn');
  const dialog = el('whats-new-dialog');
  if (!btn || !dialog) return;

  btn.addEventListener('click', () => {
    dialog.showModal();
    loadChangelog();
  });

  // Backdrop click closes, same as Escape. ::backdrop itself can't carry a
  // click handler, so this compares the click point against the dialog's own
  // box — a click landing outside it is a backdrop click.
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  // Fires for every close path (Escape, the close button's form-submit,
  // backdrop click above) — one place to return focus to the trigger.
  dialog.addEventListener('close', () => btn.focus());
}
