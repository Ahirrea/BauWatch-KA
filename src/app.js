// app.js — UI, Karte, Filter, Rendering. Lädt den statischen Daten-Snapshot
// data/baustellen.geojson (siehe ADR-001) und macht daraus Karte + Liste.

import { restdauer, formatRange } from './lib/format.js';

// Leaflet wird global über das <script>-Tag geladen.
/* global L */

const DATA_URL = 'data/baustellen.geojson';
const KA_CENTER = [49.0094, 8.4044]; // Marktplatz
const RADIUS_KM = 1.5;

// Ampelfarben — müssen zu styles.css passen.
const AMPEL_COLOR = { voll: '#c02626', teil: '#f08a00', gering: '#197a3d' };
const AMPEL_LABEL = { voll: 'Vollsperrung', teil: 'Teilsperrung', gering: 'Geringe Behinderung' };
const VM_LABEL = { fuss: 'zu Fuß', rad: 'Rad', auto: 'Auto', oepnv: 'ÖPNV' };

// --- Zustand ---------------------------------------------------------------
const state = {
  features: [],
  filters: { zeitraum: 'heute', ampel: 'alle', verkehrsmittel: 'alle' },
  search: null, // { center: [lat, lon], label: string }
  selectedId: null,
};

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
  const rest = restdauer(p.bis);
  const vms = Object.keys(VM_LABEL)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => VM_LABEL[k])
    .join(', ');
  return `
    <div class="popup-title">
      <span class="dot dot-${p.ampel === 'voll' ? 'red' : p.ampel === 'teil' ? 'amber' : 'green'}"></span>
      ${escapeHtml(p.titel)}
    </div>
    <div>${escapeHtml(AMPEL_LABEL[p.ampel] || p.art)}</div>
    ${p.info ? `<div>${escapeHtml(p.info)}</div>` : ''}
    <div><strong>${escapeHtml(rest.text)}</strong> · ${escapeHtml(formatRange(p.von, p.bis))}</div>
    <div>Verkehr: ${escapeHtml(vms || '–')}</div>
    ${p.verursacher ? `<div>Verursacher: ${escapeHtml(p.verursacher)}</div>` : ''}
  `;
}

function listItemHtml(f) {
  const p = f.properties;
  const rest = restdauer(p.bis);
  const dist =
    f._dist != null
      ? `<span class="badge badge-dist">${f._dist.toFixed(1)} km</span>`
      : '';
  const vms = Object.keys(VM_LABEL)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => `<span class="badge">${escapeHtml(VM_LABEL[k])}</span>`)
    .join('');
  return `
    <button type="button" class="list-item-btn">
      <span class="item-title">
        <span class="dot dot-${p.ampel === 'voll' ? 'red' : p.ampel === 'teil' ? 'amber' : 'green'}" aria-hidden="true"></span>
        ${escapeHtml(p.titel)}
      </span>
      <span class="item-meta">
        <span class="item-restdauer ${rest.expired ? 'expired' : ''}">${escapeHtml(rest.text)}</span>
        · ${escapeHtml(AMPEL_LABEL[p.ampel] || p.art)}
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

function renderStats(list) {
  // Reine Anzeige: die Sperrgrad-Aufschlüsselung. Die Gesamtzahl steht im
  // Listenkopf (renderStatus), daher hier bewusst keine „Baustellen"-Kachel.
  const voll = list.filter((f) => f.properties.ampel === 'voll').length;
  el('stat-voll').textContent = voll;
  el('stat-behinderung').textContent = list.length - voll;
}

function renderStatus(list) {
  const status = el('list-status');
  status.classList.remove('is-error');
  if (list.length === 0) {
    if (state.search) {
      status.textContent = `Keine Baustellen im Umkreis von ${RADIUS_KM} km um „${state.search.label}" mit diesen Filtern.`;
    } else {
      status.textContent = 'Keine Baustellen für diese Filter. Filter lockern oder „Alle" wählen.';
    }
  } else {
    const suffix = state.search ? ` · Umkreis um „${state.search.label}"` : '';
    status.textContent = `${list.length} Baustelle${list.length === 1 ? '' : 'n'}${suffix}`;
  }
}

function render() {
  const list = currentFiltered();
  renderMarkers(list);
  renderList(list);
  renderStats(list);
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
    status.textContent = 'Adresse wird gesucht …';
    try {
      const hit = await geocode(q);
      if (!hit) {
        status.classList.add('is-error');
        status.textContent = 'Adresse in Karlsruhe nicht gefunden. Bitte genauer angeben.';
        return;
      }
      state.search = hit;
      drawSearchCircle(hit.center);
      status.textContent = `Umkreis ${RADIUS_KM} km um „${hit.label}".`;
      resetBtn.hidden = false;
      map.setView(hit.center, 14, { animate: !prefersReducedMotion() });
      render();
    } catch (err) {
      status.classList.add('is-error');
      status.textContent = 'Adresssuche gerade nicht möglich. Bitte später erneut versuchen.';
      console.error(err);
    } finally {
      searchBusy = false;
      btn.disabled = false;
    }
  });

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

function setFooter(collection) {
  const stand = collection.stand ? new Date(collection.stand) : null;
  el('stand').textContent = stand
    ? stand.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'unbekannt';
  const attr = collection.attribution || 'Stadt Karlsruhe, CC-BY 4.0';
  el('attribution').textContent =
    (collection.sample ? '⚠ Beispieldaten — ' : 'Datenquelle: ') + attr;
}

async function loadData() {
  const status = el('list-status');
  status.textContent = 'Baustellen werden geladen …';
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const collection = await res.json();
    state.features = (collection.features || []).map((f, i) => {
      f._key = featureKey(f, i);
      return f;
    });
    setFooter(collection);
    render();
    if (state.features.length === 0) {
      status.textContent = 'Zurzeit sind keine Baustellendaten vorhanden.';
    }
  } catch (err) {
    console.error(err);
    status.classList.add('is-error');
    status.textContent =
      'Die Baustellendaten konnten nicht geladen werden. Bitte Seite neu laden.';
    el('stand').textContent = 'nicht verfügbar';
  }
}

// --- Start -----------------------------------------------------------------
initMap();
wireFilters();
wireSearch();
loadData();
