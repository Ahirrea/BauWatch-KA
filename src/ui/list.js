// list.js — the synchronized list and its status line, split out of app.js in
// A-14/E11.

import { state } from './state.js';
import { el, hoverFaehig, prefersReducedMotion } from './dom.js';
import { RADIUS_KM } from './geo.js';
import { str } from './text.js';
import { listItemHtml } from './feature-html.js';

const listItemById = new Map(); // key -> <li>
let handlers = { onSelect: () => {}, onHover: () => {} };

/** `onSelect(key, opts)` and `onHover(key|null)` come from the entry module. */
export function initList({ onSelect, onHover }) {
  handlers = { onSelect, onHover };
  wireListFocus();
}

export function hasListItem(key) {
  return listItemById.has(key);
}

export function renderList(list) {
  const ul = el('liste');
  ul.innerHTML = '';
  listItemById.clear();
  const mitHover = hoverFaehig();
  for (const f of list) {
    const li = document.createElement('li');
    li.className = `amp-${f.properties.ampel}`;
    li.dataset.key = f._key; // Rückweg DOM → Feature für den Fokus-Pfad (A-9/E8)
    li.innerHTML = listItemHtml(f);
    li.querySelector('.list-item-btn').addEventListener('click', () =>
      handlers.onSelect(f._key, { fromList: true })
    );
    // Zeilen-Hover als Vorschau der Ausdehnung (A-9/E2), nur auf
    // hover-fähigen Geräten (E3).
    if (mitHover) {
      li.addEventListener('mouseenter', () => handlers.onHover(f._key));
      li.addEventListener('mouseleave', () => handlers.onHover(null));
    }
    ul.appendChild(li);
    listItemById.set(f._key, li);
  }
}

// Tastaturfokus spiegelt Hover (A-9/E8): beim Durch-Tabben dieselbe Vorschau
// wie mit der Maus, auf jedem Gerät (deshalb ohne das E3-Gatter). Einmal
// delegiert auf #liste verdrahtet — focusin/focusout steigen auf, anders als
// mouseenter, und überleben so jedes render(). :focus-visible filtert den
// Fokus heraus, den ein Mausklick setzt: dort wirkt die Auswahl des Klicks.
function wireListFocus() {
  const ul = el('liste');
  ul.addEventListener('focusin', (e) => {
    const btn = e.target.closest('.list-item-btn');
    if (!btn || !btn.matches(':focus-visible')) return;
    const key = btn.closest('li')?.dataset.key;
    if (key) handlers.onHover(key);
  });
  ul.addEventListener('focusout', (e) => {
    if (e.target.closest('.list-item-btn')) handlers.onHover(null);
  });
}

export function setRowHovered(key, on) {
  listItemById.get(key)?.classList.toggle('is-hovered', on);
}

export function markSelected(key) {
  for (const [k, li] of listItemById) li.classList.toggle('is-selected', k === key);
}

export function renderStatus(list) {
  const status = el('list-status');
  status.classList.remove('is-error');
  if (list.length === 0) {
    if (state.search) {
      status.textContent = str('listStatusEmptySearch', { km: RADIUS_KM, label: state.search.label });
    } else {
      status.textContent = str('listStatusEmptyFilters');
    }
  } else {
    const count = list.length === 1 ? str('listStatusCountOne') : str('listStatusCountMany', { n: list.length });
    const suffix = state.search ? str('listStatusSearchSuffix', { label: state.search.label }) : '';
    status.textContent = `${count}${suffix}`;
  }
}

// Bringt <li> im eigenen Scroll-Container (#liste, overflow-y:auto) in Sicht,
// ohne window/document zu scrollen — anders als das native scrollIntoView, das
// alle scrollbaren Vorfahren mitverschiebt.
export function scrollListItemIntoView(key) {
  const ul = el('liste');
  const li = listItemById.get(key);
  if (!ul || !li) return;
  const liRect = li.getBoundingClientRect();
  const ulRect = ul.getBoundingClientRect();
  let delta = 0;
  if (liRect.top < ulRect.top) {
    delta = liRect.top - ulRect.top;
  } else if (liRect.bottom > ulRect.bottom) {
    delta = liRect.bottom - ulRect.bottom;
  } else {
    return; // bereits sichtbar
  }
  ul.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
