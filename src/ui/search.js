// search.js — address/radius search via Nominatim, split out of app.js in
// A-14/E11.

import { state } from './state.js';
import { el } from './dom.js';
import { RADIUS_KM } from './geo.js';
import { str } from './text.js';

async function geocode(query) {
  // Bounding-Box grob um Karlsruhe, um Treffer zu fokussieren.
  const viewbox = '8.28,49.10,8.55,48.95'; // left,top,right,bottom
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1' +
    '&countrycodes=de&bounded=1&viewbox=' +
    encodeURIComponent(viewbox) +
    '&q=' +
    encodeURIComponent(query + ', Karlsruhe');
  // Hinweis: Der Browser sendet automatisch den Referer (unsere Seite) als
  // Identifikation gemäß Nominatim-Nutzungsrichtlinie; ein eigener User-Agent
  // lässt sich per fetch nicht setzen.
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoding-Dienst antwortete mit ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  return { center: [parseFloat(hit.lat), parseFloat(hit.lon)], label: hit.display_name.split(',')[0] };
}

let searchBusy = false;

/**
 * Wires the search form. `onResult(hit)` runs after state.search is set,
 * `onReset()` after it is cleared — the entry module moves the map and renders.
 */
export function wireSearch({ onResult, onReset }) {
  const form = el('search-form');
  const input = el('search-input');
  const btn = el('search-btn');
  const resetBtn = el('search-reset');
  const status = el('search-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || searchBusy) return;
    searchBusy = true;
    btn.disabled = true;
    status.classList.remove('is-error');
    status.textContent = str('searchStatusSearching');
    try {
      const hit = await geocode(q);
      if (!hit) {
        status.classList.add('is-error');
        status.textContent = str('searchStatusNotFound');
        return;
      }
      state.search = hit;
      status.textContent = str('searchStatusResult', { km: RADIUS_KM, label: hit.label });
      resetBtn.hidden = false;
      onResult(hit);
    } catch (err) {
      status.classList.add('is-error');
      status.textContent = str('searchStatusError');
      console.error(err);
    } finally {
      searchBusy = false;
      netzZustand();
    }
  });

  // Offline ist der Suchknopf eine Falle: Nominatim ist der einzige Live-Aufruf
  // der Seite und nichts davon liegt im Cache (Entscheidung 8 in A-3). Hier ist
  // navigator.onLine das richtige Signal — es geht um das Bedien-Angebot, nicht
  // um die Frische der Daten (dafür: X-Bauwatch-Cache in loadData).
  let offlineHinweis = false;
  function netzZustand() {
    const offline = !navigator.onLine;
    input.disabled = offline;
    btn.disabled = offline || searchBusy;
    if (offline) {
      status.classList.remove('is-error');
      status.textContent = str('searchOfflineHint');
      offlineHinweis = true;
    } else if (offlineHinweis) {
      // Nur den eigenen Hinweis zurücknehmen, keine echte Suchmeldung überschreiben.
      status.textContent = '';
      offlineHinweis = false;
    }
  }
  window.addEventListener('online', netzZustand);
  window.addEventListener('offline', netzZustand);
  netzZustand();

  resetBtn.addEventListener('click', () => {
    clearSearch();
    onReset();
  });
}

/**
 * Clears the search — state, field, status and reset button — without moving
 * the map. A district choice replaces the search this way (A-17/E5); the
 * reset button adds the camera move on top.
 */
export function clearSearch() {
  state.search = null;
  el('search-reset').hidden = true;
  el('search-status').textContent = '';
  el('search-input').value = '';
}
