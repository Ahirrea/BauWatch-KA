// app.js — UI, Karte, Filter, Rendering. Lädt den statischen Daten-Snapshot
// data/baustellen.geojson (siehe ADR-001) und macht daraus Karte + Liste.

import { restdauer, formatRange } from './lib/format.js';
import { DEFAULT_LANG, STRINGS, AMPEL_LABEL, VM_LABEL, t } from './lib/i18n.js';

// Leaflet wird global über das <script>-Tag geladen.
/* global L */

const DATA_URL = 'data/baustellen.geojson';
const CHANGELOG_URL = 'data/changelog.json'; // "Was ist neu?"-Feed (A-6)
const KA_CENTER = [49.0094, 8.4044]; // Marktplatz
const RADIUS_KM = 1.5;

// Ampelfarben — müssen zu styles.css passen.
const AMPEL_COLOR = { voll: '#c02626', teil: '#f08a00', gering: '#197a3d' };

// Language preference (A-5). localStorage key: 'bauwatch.sprache'.
const SPRACHE_KEY = 'bauwatch.sprache';

// --- Zustand ---------------------------------------------------------------
const state = {
  features: [],
  filters: { zeitraum: 'heute', ampel: 'alle', verkehrsmittel: 'alle' },
  search: null, // { center: [lat, lon], label: string }
  selectedId: null,
  lang: liesGespeicherteSprache(),
};

// Read failures (private mode, disabled storage) fall back to the German
// default and never throw — a storage failure must not break the switch.
function liesGespeicherteSprache() {
  try {
    const wert = localStorage.getItem(SPRACHE_KEY);
    return wert === 'de' || wert === 'en' ? wert : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function schreibeGespeicherteSprache(lang) {
  try {
    localStorage.setItem(SPRACHE_KEY, lang);
  } catch {
    // Quota/disabled storage: the switch itself still works, just not
    // persisted for the next visit (same pattern as sw.js's ablegen()).
  }
}

let map;
let markerLayer;
let searchLayer;
const markerById = new Map(); // key -> Leaflet-Marker
const listItemById = new Map(); // key -> <li>

// --- Hilfsfunktionen -------------------------------------------------------
function el(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Eindeutiger Schlüssel je Feature (id kann fehlen -> Index-Fallback).
function featureKey(f, i) {
  return f.properties.id != null ? `id:${f.properties.id}` : `idx:${i}`;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// GeoJSON-Koordinaten sind [lon, lat]; Leaflet erwartet [lat, lon].
function latLngOf(f) {
  const [lon, lat] = f.geometry.coordinates;
  return [lat, lon];
}

// --- Filterlogik -----------------------------------------------------------
function matchesZeitraum(props, mode, now) {
  if (mode === 'alle') return true;
  const von = props.von ? new Date(props.von) : null;
  const bis = props.bis ? new Date(props.bis) : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inWeek = new Date(today);
  inWeek.setDate(inWeek.getDate() + 7);

  const startsInFuture = von && von > today;
  const alreadyEnded = bis && bis < today;

  if (mode === 'geplant') return !!startsInFuture;
  if (mode === 'heute') {
    // heute aktiv: begonnen (oder ohne Startdatum) und nicht beendet
    return !startsInFuture && !alreadyEnded;
  }
  if (mode === 'woche') {
    // aktiv oder in den nächsten 7 Tagen beginnend, noch nicht beendet
    const startsWithinWeek = !von || von <= inWeek;
    return startsWithinWeek && !alreadyEnded;
  }
  return true;
}

function matchesAmpel(props, val) {
  return val === 'alle' || props.ampel === val;
}

function matchesVerkehrsmittel(props, val) {
  return val === 'alle' || props.verkehrsmittel?.[val] === true;
}

function currentFiltered() {
  const now = new Date();
  const { zeitraum, ampel, verkehrsmittel } = state.filters;
  let list = state.features.filter(
    (f) =>
      matchesZeitraum(f.properties, zeitraum, now) &&
      matchesAmpel(f.properties, ampel) &&
      matchesVerkehrsmittel(f.properties, verkehrsmittel)
  );

  if (state.search) {
    const c = state.search.center;
    list = list
      .map((f) => ({ f, dist: haversineKm(c, latLngOf(f)) }))
      .filter((x) => x.dist <= RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .map((x) => {
        x.f._dist = x.dist;
        return x.f;
      });
  } else {
    for (const f of list) delete f._dist;
  }
  return list;
}

// --- Rendering -------------------------------------------------------------
function popupHtml(f) {
  const p = f.properties;
  const lang = state.lang;
  const vmLabel = VM_LABEL[lang];
  const ampelLabel = AMPEL_LABEL[lang];
  const rest = restdauer(p.bis, undefined, lang);
  const vms = Object.keys(vmLabel)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => vmLabel[k])
    .join(', ');
  return `
    <div class="popup-title">
      <span class="dot dot-${p.ampel === 'voll' ? 'red' : p.ampel === 'teil' ? 'amber' : 'green'}"></span>
      ${escapeHtml(p.titel)}
    </div>
    <div>${escapeHtml(ampelLabel[p.ampel] || p.art)}</div>
    ${p.info ? `<div>${escapeHtml(p.info)}</div>` : ''}
    <div><strong>${escapeHtml(rest.text)}</strong> · ${escapeHtml(formatRange(p.von, p.bis, lang))}</div>
    <div>${escapeHtml(STRINGS[lang].popupVerkehr)} ${escapeHtml(vms || '–')}</div>
    ${p.verursacher ? `<div>${escapeHtml(STRINGS[lang].popupVerursacher)} ${escapeHtml(p.verursacher)}</div>` : ''}
  `;
}

function listItemHtml(f) {
  const p = f.properties;
  const lang = state.lang;
  const vmLabel = VM_LABEL[lang];
  const ampelLabel = AMPEL_LABEL[lang];
  const rest = restdauer(p.bis, undefined, lang);
  const dist =
    f._dist != null
      ? `<span class="badge badge-dist">${f._dist.toFixed(1)} km</span>`
      : '';
  const vms = Object.keys(vmLabel)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => `<span class="badge">${escapeHtml(vmLabel[k])}</span>`)
    .join('');
  return `
    <button type="button" class="list-item-btn">
      <span class="item-title">
        <span class="dot dot-${p.ampel === 'voll' ? 'red' : p.ampel === 'teil' ? 'amber' : 'green'}" aria-hidden="true"></span>
        ${escapeHtml(p.titel)}
      </span>
      <span class="item-meta">
        <span class="item-restdauer ${rest.expired ? 'expired' : ''}">${escapeHtml(rest.text)}</span>
        · ${escapeHtml(ampelLabel[p.ampel] || p.art)}
        ${p.verursacher ? '· ' + escapeHtml(p.verursacher) : ''}
      </span>
      <span class="item-badges">${dist}${vms}</span>
    </button>
  `;
}

function renderMarkers(list) {
  markerLayer.clearLayers();
  markerById.clear();
  const keySet = new Set(list.map((f) => f._key));
  state.features.forEach((f, i) => {
    if (!keySet.has(f._key)) return;
    const marker = L.circleMarker(latLngOf(f), {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: AMPEL_COLOR[f.properties.ampel] || '#666',
      fillOpacity: 0.9,
    });
    marker.bindPopup(popupHtml(f));
    marker.on('click', () => selectFeature(f._key, { fromMarker: true }));
    marker.addTo(markerLayer);
    markerById.set(f._key, marker);
  });
}

function renderList(list) {
  const ul = el('liste');
  ul.innerHTML = '';
  listItemById.clear();
  for (const f of list) {
    const li = document.createElement('li');
    li.className = `amp-${f.properties.ampel}`;
    li.innerHTML = listItemHtml(f);
    li.querySelector('.list-item-btn').addEventListener('click', () =>
      selectFeature(f._key, { fromList: true })
    );
    ul.appendChild(li);
    listItemById.set(f._key, li);
  }
}

function renderStatus(list) {
  const s = STRINGS[state.lang];
  const status = el('list-status');
  status.classList.remove('is-error');
  if (list.length === 0) {
    if (state.search) {
      status.textContent = t(s.listStatusEmptySearch, { km: RADIUS_KM, label: state.search.label });
    } else {
      status.textContent = s.listStatusEmptyFilters;
    }
  } else {
    const count = list.length === 1 ? s.listStatusCountOne : t(s.listStatusCountMany, { n: list.length });
    const suffix = state.search ? t(s.listStatusSearchSuffix, { label: state.search.label }) : '';
    status.textContent = `${count}${suffix}`;
  }
}

function render() {
  const list = currentFiltered();
  renderMarkers(list);
  renderList(list);
  renderStatus(list);
  // Auswahl beibehalten, falls noch sichtbar
  if (state.selectedId && listItemById.has(state.selectedId)) {
    listItemById.get(state.selectedId).classList.add('is-selected');
  } else {
    state.selectedId = null;
  }
}

function selectFeature(key, { fromList, fromMarker } = {}) {
  state.selectedId = key;
  for (const [k, li] of listItemById) li.classList.toggle('is-selected', k === key);

  const marker = markerById.get(key);
  if (marker) {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), {
      animate: !prefersReducedMotion(),
    });
    marker.openPopup();
  }
  if (fromMarker) {
    // Nur den Listen-Container scrollen, nicht das ganze Fenster: sonst springt
    // im mobilen Layout (Liste unter der Karte) der Viewport nach unten weg und
    // verdeckt das gerade geöffnete Info-Popup auf der Karte.
    scrollListItemIntoView(listItemById.get(key));
  }
}

// Bringt <li> im eigenen Scroll-Container (#liste, overflow-y:auto) in Sicht,
// ohne window/document zu scrollen — anders als das native scrollIntoView, das
// alle scrollbaren Vorfahren mitverschiebt.
function scrollListItemIntoView(li) {
  const ul = el('liste');
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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// --- Language switch (A-5) --------------------------------------------------
// Swaps every data-i18n/data-i18n-attr static text node and document.lang;
// dynamic content (markers/list/popups/stats/status) goes through the normal
// render() pipeline afterwards — same "flip a control, call render()" flow
// the filters already use, no new state model.
function applyI18n(lang) {
  const dict = STRINGS[lang];
  document.querySelectorAll('[data-i18n]').forEach((elm) => {
    elm.textContent = dict[elm.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((elm) => {
    for (const spec of elm.dataset.i18nAttr.split(',')) {
      const [attr, key] = spec.split(':');
      elm.setAttribute(attr, dict[key]);
    }
  });
  document.documentElement.lang = lang;
}

function syncLanguageButtons(lang) {
  document.querySelectorAll('[data-lang-toggle] button').forEach((b) => {
    const active = b.dataset.lang === lang;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}

function wireLanguageToggle() {
  const group = document.querySelector('[data-lang-toggle]');
  if (!group) return;
  syncLanguageButtons(state.lang);
  applyI18n(state.lang);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === state.lang) return;
      state.lang = lang;
      syncLanguageButtons(lang);
      applyI18n(lang);
      schreibeGespeicherteSprache(lang);
      // Footer text (Stand/sample-data hint) depends on the last-loaded
      // collection, not just on filters — re-apply it in the new language.
      if (letzteCollection) setFooter(letzteCollection, { ausCache: letzterAusCache });
      render();
      // "Was ist neu?" chrome (loading/empty/error/labels) re-renders too;
      // quoted raw content inside entries is unaffected either way (E6).
      renderChangelogBody();
    });
  });
}

// --- Filter-UI -------------------------------------------------------------
function wireFilters() {
  document.querySelectorAll('.filter-group').forEach((group) => {
    const dim = group.dataset.filter;
    group.querySelectorAll('.segments button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filters[dim] = btn.dataset.value;
        group.querySelectorAll('.segments button').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        render();
      });
    });
  });
}

// --- Adress-/Umkreissuche (Nominatim) --------------------------------------
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
function wireSearch() {
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
    status.textContent = STRINGS[state.lang].searchStatusSearching;
    try {
      const hit = await geocode(q);
      if (!hit) {
        status.classList.add('is-error');
        status.textContent = STRINGS[state.lang].searchStatusNotFound;
        return;
      }
      state.search = hit;
      drawSearchCircle(hit.center);
      status.textContent = t(STRINGS[state.lang].searchStatusResult, { km: RADIUS_KM, label: hit.label });
      resetBtn.hidden = false;
      map.setView(hit.center, 14, { animate: !prefersReducedMotion() });
      render();
    } catch (err) {
      status.classList.add('is-error');
      status.textContent = STRINGS[state.lang].searchStatusError;
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
      status.textContent = STRINGS[state.lang].searchOfflineHint;
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
    state.search = null;
    searchLayer.clearLayers();
    resetBtn.hidden = true;
    status.textContent = '';
    input.value = '';
    map.setView(KA_CENTER, 13, { animate: !prefersReducedMotion() });
    render();
  });
}

function drawSearchCircle(center) {
  searchLayer.clearLayers();
  L.circle(center, {
    radius: RADIUS_KM * 1000,
    color: '#1b4b73',
    weight: 2,
    fillColor: '#1b4b73',
    fillOpacity: 0.06,
  }).addTo(searchLayer);
  L.circleMarker(center, {
    radius: 6,
    color: '#ffffff',
    weight: 2,
    fillColor: '#1b4b73',
    fillOpacity: 1,
  }).addTo(searchLayer);
}

// --- Initialisierung -------------------------------------------------------
function initMap() {
  map = L.map('map', { zoomControl: true }).setView(KA_CENTER, 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap-Mitwirkende',
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  searchLayer = L.layerGroup().addTo(map);
}

// Word-based date/time (unlike format.js's numeric dd.mm.yyyy, E5) — the
// locale follows the UI language so month names don't stay German in an
// English UI.
const STAND_LOCALE = { de: 'de-DE', en: 'en-GB' };

function setFooter(collection, { ausCache = false } = {}) {
  const stand = collection.stand ? new Date(collection.stand) : null;
  el('stand').textContent = stand
    ? stand.toLocaleString(STAND_LOCALE[state.lang], { dateStyle: 'medium', timeStyle: 'short' })
    : STRINGS[state.lang].standUnknown;
  // Die Namensnennung selbst wird hier NICHT geschrieben: sie steht statisch in
  // index.html (Lizenzbedingung — sie darf nicht am Datenabruf hängen). Hier
  // kommt nur der Zusatz für den Beispieldaten-Startwert dazu, damit niemand
  // Platzhalter für amtliche Daten hält.
  const hinweis = el('attribution-hinweis');
  hinweis.textContent = collection.sample ? STRINGS[state.lang].sampleDataHint : '';
  hinweis.hidden = !collection.sample;
  // Offline-Kennzeichnung: der Stand ist echt, aber möglicherweise überholt.
  el('stand-offline').hidden = !ausCache;
  el('stand-zeile').classList.toggle('is-stale', ausCache);
}

let letzteCollection = null;
let letzterAusCache = false;

async function loadData() {
  const status = el('list-status');
  status.textContent = STRINGS[state.lang].listStatusLoading;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Der Service Worker setzt diesen Header, wenn er die Daten aus dem
    // Gerätespeicher beantworten musste. Bewusst NICHT navigator.onLine —
    // das liefert in Captive Portals fälschlich true.
    const ausCache = res.headers.get('X-Bauwatch-Cache') === 'hit';
    const collection = await res.json();
    letzteCollection = collection;
    letzterAusCache = ausCache;
    state.features = (collection.features || []).map((f, i) => {
      f._key = featureKey(f, i);
      return f;
    });
    setFooter(collection, { ausCache });
    render();
    if (state.features.length === 0) {
      status.textContent = STRINGS[state.lang].listStatusNoData;
    }
  } catch (err) {
    console.error(err);
    status.classList.add('is-error');
    status.textContent = STRINGS[state.lang].listStatusLoadError;
    el('stand').textContent = STRINGS[state.lang].standUnavailable;
  }
}

// --- "Was ist neu?"-Feed (A-6) ----------------------------------------------
// Deliberately no interaction with the map/list/filters (E5) — an independent,
// self-contained view layered on top via a native <dialog>. No personalization,
// same fixed 30-day window for every visitor (E2) — no new localStorage key.

// null = not loaded yet, 'error' = fetch/parse failed, array = loaded entries.
let changelogEntries = null;

function changelogRunHtml(entry, s) {
  const when = entry.stand
    ? new Date(entry.stand).toLocaleString(STAND_LOCALE[state.lang], { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  if (entry.firstFill) {
    const text = entry.total === 1 ? s.whatsNewFirstFillOne : t(s.whatsNewFirstFillMany, { n: entry.total });
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
        `<li><span class="visually-hidden">${escapeHtml(s.whatsNewAdded)}</span> ➕ <strong>${escapeHtml(titel)}</strong></li>`
    ),
    ...(entry.entfernt || []).map(
      (titel) =>
        `<li><span class="visually-hidden">${escapeHtml(s.whatsNewRemoved)}</span> ➖ <s>${escapeHtml(titel)}</s></li>`
    ),
    ...(entry.geaendert || []).map(
      (c) =>
        `<li><span class="visually-hidden">${escapeHtml(s.whatsNewChanged)}</span> ✏️ ${escapeHtml(c.titel)} — ${escapeHtml((c.changes || []).join('; '))}</li>`
    ),
  ].join('');
  return `
    <section class="whats-new-run">
      <h3>${escapeHtml(when)}</h3>
      <ul>${items}</ul>
    </section>
  `;
}

function renderChangelogBody() {
  const body = el('whats-new-body');
  if (!body) return;
  const s = STRINGS[state.lang];
  if (changelogEntries === null) {
    body.innerHTML = `<p>${escapeHtml(s.whatsNewLoading)}</p>`;
  } else if (changelogEntries === 'error') {
    body.innerHTML = `<p class="whats-new-error">${escapeHtml(s.whatsNewError)}</p>`;
  } else if (changelogEntries.length === 0) {
    body.innerHTML = `<p>${escapeHtml(s.whatsNewEmpty)}</p>`;
  } else {
    body.innerHTML = changelogEntries.map((entry) => changelogRunHtml(entry, s)).join('');
  }
}

async function loadChangelog() {
  changelogEntries = null;
  renderChangelogBody();
  try {
    const res = await fetch(CHANGELOG_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    changelogEntries = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    changelogEntries = 'error';
  }
  renderChangelogBody();
}

function wireWhatsNew() {
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

// --- Service Worker / PWA --------------------------------------------------
// Progressive Enhancement: nichts in der App hängt am Service Worker. Fehlt er
// (Privatmodus, file://, alter Browser), verhält sich die Seite exakt wie ohne.

let reloadErlaubt = false; // Guard gegen Reload-Schleife: nur nach Nutzerklick
let reloadLaeuft = false;

function zeigeUpdateBanner(worker) {
  const banner = el('update-banner');
  if (!banner || banner.dataset.gezeigt === 'ja') return;
  banner.dataset.gezeigt = 'ja';

  const text = document.createElement('span');
  text.textContent = STRINGS[state.lang].updateBannerText;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = STRINGS[state.lang].updateBannerButton;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    reloadErlaubt = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
  banner.append(text, btn);
  banner.classList.add('is-visible');
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // Ein wartender Worker kann schon beim Laden bereitstehen.
      const pruefe = (worker) => {
        if (!worker) return;
        const check = () => {
          // Nur mit vorhandenem controller ist es ein *Update* und keine
          // Erstinstallation — sonst würde das Banner beim ersten Besuch kommen.
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            zeigeUpdateBanner(worker);
          }
        };
        check();
        worker.addEventListener('statechange', check);
      };

      pruefe(reg.waiting);
      pruefe(reg.installing);
      reg.addEventListener('updatefound', () => pruefe(reg.installing));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloadErlaubt || reloadLaeuft) return;
        reloadLaeuft = true;
        location.reload();
      });
    } catch (err) {
      // Still: eine fehlgeschlagene Registrierung darf die Seite nicht stören.
      console.warn('Service Worker nicht registriert:', err);
    }
  });
}

// --- Start -----------------------------------------------------------------
initMap();
wireFilters();
wireLanguageToggle();
wireSearch();
wireWhatsNew();
loadData();
initServiceWorker();
