// app.js — UI, Karte, Filter, Rendering. Lädt den statischen Daten-Snapshot
// data/baustellen.geojson (siehe ADR-001) und macht daraus Karte + Liste.

import { restdauer, formatRange } from './lib/format.js';
import { DEFAULT_LANG, STRINGS, AMPEL_LABEL, VM_LABEL, t } from './lib/i18n.js';
import { filterChangelogEntries } from './lib/changelog.js';
import { summarize, endetInnerhalb } from './lib/stats.js';

// Leaflet wird global über das <script>-Tag geladen.
/* global L */

const DATA_URL = 'data/baustellen.geojson';
const CHANGELOG_URL = 'data/changelog.json'; // "Was ist neu?"-Feed (A-6)
const KA_CENTER = [49.0094, 8.4044]; // Marktplatz
const RADIUS_KM = 1.5;

// Ampelfarben — müssen zu styles.css passen.
const AMPEL_COLOR = { voll: '#c02626', teil: '#f08a00', gering: '#197a3d' };

// Kartenausschnitt bei der Auswahl einer Baustelle MIT Fläche (A-7/E5).
// Die Zoom-Obergrenze begrenzt nur das enge Ende: eine winzige Fläche (eine
// Kreuzung) soll nicht dichter heranspringen als ein gewöhnlicher Marker.
const AREA_FIT_MAX_ZOOM = 17;
const AREA_FIT_PADDING = 40;
// Anteil der Kartenhöhe, den der Popup-Streifen höchstens beanspruchen darf —
// siehe popupPlatz().
const AREA_FIT_POPUP_MAX_SHARE = 0.4;

// Language preference (A-5). localStorage key: 'bauwatch.sprache'.
const SPRACHE_KEY = 'bauwatch.sprache';

// Colour-scheme preference (A-8, ADR-004). localStorage key: 'bauwatch.theme'.
// 'system' is the default and stores nothing new about the visitor — it simply
// leaves the CSS media query in charge, exactly as before A-8.
const THEME_KEY = 'bauwatch.theme';
const THEMES = ['system', 'light', 'dark'];
const DEFAULT_THEME = 'system';

// Muss zu den <meta name="theme-color">-Angaben in index.html passen (und damit
// zu --accent hell / --bg dunkel in styles.css); scripts/test-theme.mjs
// vergleicht beide Seiten.
const THEME_COLOR = { light: '#1b4b73', dark: '#16181c' };

// --- Zustand ---------------------------------------------------------------
const state = {
  features: [],
  // Ein Ladeversuch ist durch (egal ob erfolgreich). Trennt „noch keine Zahlen"
  // von „echte 0" in den Sperrgrad-Knöpfen (A-12): state.features.length === 0
  // allein kann beides heißen.
  geladen: false,
  filters: { restdauer: 'alle', ampel: 'alle', verkehrsmittel: 'alle' },
  search: null, // { center: [lat, lon], label: string }
  selectedId: null,
  // A-9: Feature unter dem Zeiger bzw. mit Tastaturfokus — flüchtig, überlebt
  // absichtlich kein render() (die Zeile und die Ebene darunter werden dort
  // zerstört, ihr mouseleave käme nie an → Geist-Hervorhebung).
  hoverKey: null,
  lang: liesGespeicherteSprache(),
  theme: liesGespeichertesFarbschema(),
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

// Same shape as the language pair above — a storage failure falls back to
// 'system', which is the pre-A-8 behaviour and therefore never a broken state.
function liesGespeichertesFarbschema() {
  try {
    const wert = localStorage.getItem(THEME_KEY);
    return THEMES.includes(wert) ? wert : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function schreibeGespeichertesFarbschema(theme) {
  try {
    // 'system' bedeutet „keine Wahl" — dann wird der Schlüssel entfernt statt
    // ein drittes Wort hineingeschrieben. So bleibt auf dem Gerät genau dann
    // etwas liegen, wenn die Nutzerin tatsächlich etwas ausgewählt hat.
    if (theme === DEFAULT_THEME) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Wie beim Sprachschalter: die Umschaltung wirkt, sie überdauert nur
    // keinen Seitenaufruf.
  }
}

let map;
let areaLayer;
let markerLayer;
let searchLayer;
const markerById = new Map(); // key -> Leaflet-Marker
const areaById = new Map(); // key -> Leaflet-Layer der Fläche (A-7)
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
// Restdauer statt Zeitraum (A-12/E1): wann ein Vorgang BEGINNT trennt gegen
// diese Quelle nichts — der WFS liefert ausschließlich laufende Vorgänge, in
// allen 86 bisherigen Snapshots. Wann er ENDET trennt dieselben Daten real.
// Das Prädikat selbst liegt in src/lib/stats.js, damit npm test es sieht.
function matchesRestdauer(props, val, now) {
  if (val === 'alle') return true;
  return endetInnerhalb(props, Number(val), now);
}

function matchesAmpel(props, val) {
  return val === 'alle' || props.ampel === val;
}

function matchesVerkehrsmittel(props, val) {
  return val === 'alle' || props.verkehrsmittel?.[val] === true;
}

// Alles AUSSER dem Sperrgrad — inklusive Umkreissuche, weil die Zahlen in den
// Sperrgrad-Knöpfen die Alternativen innerhalb des gesuchten Gebiets meinen.
// Diese Menge speist die Zahlen (A-12/E3): jeder Knopf sagt, wie viele Treffer
// SEIN Klick brächte. Zählte man die fertig gefilterte Liste, stünde bei
// aktivem „Voll" ein Knopf mit der Aufschrift „0 Teil", der 118 Treffer liefert.
function filteredBase() {
  const now = new Date();
  const { restdauer: rd, verkehrsmittel } = state.filters;
  let list = state.features.filter(
    (f) => matchesRestdauer(f.properties, rd, now) && matchesVerkehrsmittel(f.properties, verkehrsmittel)
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

// Die Menge, die Karte, Liste und Statuszeile bekommen. filter() erhält die
// Reihenfolge, die Umkreissuche oben hergestellt hat.
function applyAmpel(list) {
  return list.filter((f) => matchesAmpel(f.properties, state.filters.ampel));
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

// Linien-Geometrien haben kein Inneres: Leaflet zeichnet sie als Polyline und
// ignoriert jede Füllung. Etwa ein Fünftel der amtlichen Flächen kommt so
// (LineString/MultiLineString) — als Haarlinie sähe das aus wie eine Route,
// nicht wie eine Ausdehnung. Deshalb dort ein kräftigerer, halbtransparenter
// Strich anstelle der Füllung, die ein Polygon bekommt. Gleiche Farbe, gleiche
// Bedeutung (E4) — nur die Technik unterscheidet sich.
const AREA_LINE_TYPES = new Set(['LineString', 'MultiLineString']);

// Hervorhebungsstufen der Flächen (A-9): idle → hover → selected. Die Rampe
// muss je Geometrietyp getrennt bleiben — Linien haben kein Inneres, dort
// bewirkt fillOpacity nichts, also steigen Strichstärke und Deckkraft (E5).
// idle entspricht exakt den bisherigen Werten (E1: alle Flächen bleiben
// gezeichnet, Hervorhebung ist nur ein Gradunterschied).
const AREA_TIER_STYLE = {
  line: {
    idle: { weight: 6, opacity: 0.45 },
    hover: { weight: 7, opacity: 0.65 },
    selected: { weight: 8, opacity: 0.85 },
  },
  polygon: {
    idle: { weight: 2, opacity: 0.9, fillOpacity: 0.18 },
    hover: { weight: 3, opacity: 0.9, fillOpacity: 0.28 },
    selected: { weight: 3, opacity: 0.9, fillOpacity: 0.38 },
  },
};

function areaStyle(color, geometryType, tier = 'idle') {
  if (AREA_LINE_TYPES.has(geometryType)) return { color, ...AREA_TIER_STYLE.line[tier] };
  return { color, fillColor: color, ...AREA_TIER_STYLE.polygon[tier] };
}

// Baustellenflächen (A-7). Eigene Ebene UNTER den Markern: der Marker bleibt
// das einzige anklickbare Objekt (E2), die Fläche ist rein zusätzlich.
//
// `interactive: false` (E3) ist hier mehr als Kosmetik — ohne das läge über
// jedem Marker einer langen Straßensperrung eine Fläche, die Klicks abfängt,
// und der Marker wäre kaum noch treffbar. Zugleich taucht die Fläche so nirgends
// in der Tab-Reihenfolge auf: sie ist dekorativ, die Erklärung steht im Popup.
//
// Die Farbe kommt aus AMPEL_COLOR, wie beim Marker — keine zweite Farbbedeutung
// auf derselben Karte (E4). Die [lon,lat]→[lat,lng]-Umkehrung übernimmt L.geoJSON
// selbst; anders als bei latLngOf() ist hier also nichts zu drehen.
function renderAreas(list) {
  areaLayer.clearLayers();
  areaById.clear();
  for (const f of list) {
    const area = f.properties.area;
    if (!area) continue;
    const color = AMPEL_COLOR[f.properties.ampel] || '#666';
    // Eine GeometryCollection (ein Vorgang, dessen Teile Polygone UND Linien
    // mischen) wird hier aufgeteilt: die style-Option von L.geoJSON bekommt bei
    // einer Collection für jeden Teil dasselbe Feature zu sehen und könnte die
    // Typen gar nicht unterscheiden.
    const teile = area.type === 'GeometryCollection' ? area.geometries || [] : [area];
    // featureGroup, nicht layerGroup: nur die kann getBounds() (für E5) und
    // bringToFront() (für A-9/E10).
    const gruppe = L.featureGroup();
    for (const g of teile) {
      if (!g || !g.coordinates) continue;
      const teil = L.geoJSON(g, { interactive: false, style: areaStyle(color, g.type) });
      // Für den Stufenwechsel (A-9) gemerkt: der Restyle muss je Teil
      // typbewusst laufen — ein pauschales setStyle auf die Gruppe gäbe der
      // Polyline eine Füllung und dem Polygon einen 6-px-Strich.
      teil._bauwatchTyp = g.type;
      teil.addTo(gruppe);
    }
    if (gruppe.getLayers().length === 0) continue;
    gruppe._bauwatchFarbe = color;
    gruppe.addTo(areaLayer);
    areaById.set(f._key, gruppe);
  }
}

// --- Hervorhebungsstufen (A-9) ----------------------------------------------
// Stufe eines Features aus dem Zustand ableiten: Auswahl schlägt Hover auf
// demselben Feature (E4) — beide zugleich sichtbar heißt „A ist gewählt, B
// wird gerade angesehen".
function areaTier(key) {
  if (key === state.selectedId) return 'selected';
  if (key === state.hoverKey) return 'hover';
  return 'idle';
}

// Wendet die aktuelle Stufe eines Features auf seine Flächengruppe an, je
// Kind-Layer typbewusst (die eine GeometryCollection mischt Polygon UND
// Linie). Hervorgehobenes nach vorn (E10): Leaflet zeichnet in
// Einfüge-Reihenfolge, sonst läge die Betonung ausgerechnet in der dichten
// Innenstadt unter der Füllung eines Nachbarn.
function applyAreaTier(key) {
  const gruppe = areaById.get(key);
  if (!gruppe) return;
  const tier = areaTier(key);
  gruppe.eachLayer((teil) => teil.setStyle(areaStyle(gruppe._bauwatchFarbe, teil._bauwatchTyp, tier)));
  if (tier !== 'idle') gruppe.bringToFront();
}

// Hover/Fokus-Ziel wechseln: Fläche umstufen, Gegenstück-Zeile tönen (E2/E7).
// Endet ein Hover, kommt die gewählte Fläche wieder nach ganz vorn (E10).
// Bewegt hier NIE die Karte oder die Liste (E9).
function setHoverKey(key) {
  if (key === state.hoverKey) return;
  const vorher = state.hoverKey;
  state.hoverKey = key;
  if (vorher) {
    applyAreaTier(vorher);
    listItemById.get(vorher)?.classList.remove('is-hovered');
  }
  if (key) {
    applyAreaTier(key);
    listItemById.get(key)?.classList.add('is-hovered');
  }
  if (!key && state.selectedId) areaById.get(state.selectedId)?.bringToFront();
}

// Nur auf Geräten mit echtem Hover verdrahten (E3): auf Touch-Geräten löst ein
// Tipp synthetische mouseover aus, die bis zum nächsten Tipp kleben — neben
// der echten Auswahl stünde eine zweite, veraltete Hervorhebung. Der Fokus-Pfad
// (E8) hängt bewusst NICHT an diesem Gatter — an einem Touch-Gerät kann eine
// Tastatur hängen.
function hoverFaehig() {
  return window.matchMedia('(hover: hover)').matches;
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
    // Bei einer Fläche das Auto-Schwenken des Popups abschalten (A-7/E5):
    // Leaflet schiebt die Karte beim Öffnen so, dass das Popup am KARTENRAND
    // sitzt — und setzt damit das gerade Eingepasste außer Kraft, gemessen um
    // bis zu ~200 px. Den Platz dafür reserviert fitBounds selbst, gemessen
    // an diesem Popup (popupPlatz), das Schwenken hat also nichts zu tun. Ohne Fläche
    // bleibt es beim Leaflet-Standard — dort ist es sinnvoll, weil setView()
    // den Marker nur zentriert und über keinen Platz für das Popup wacht.
    marker.bindPopup(popupHtml(f), f.properties.area ? { autoPan: false } : undefined);
    marker.on('click', () => selectFeature(f._key, { fromMarker: true }));
    // Marker-Hover hebt die Fläche hervor und tönt die Listenzeile (A-9/E2) —
    // der Marker selbst bleibt unverändert (E6). Leaflet feuert mouseover/
    // mouseout, keine Pointer-Events.
    if (hoverFaehig()) {
      marker.on('mouseover', () => setHoverKey(f._key));
      marker.on('mouseout', () => setHoverKey(null));
    }
    marker.addTo(markerLayer);
    markerById.set(f._key, marker);
  });
}

function renderList(list) {
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
      selectFeature(f._key, { fromList: true })
    );
    // Zeilen-Hover als Vorschau der Ausdehnung (A-9/E2), nur auf
    // hover-fähigen Geräten (E3).
    if (mitHover) {
      li.addEventListener('mouseenter', () => setHoverKey(f._key));
      li.addEventListener('mouseleave', () => setHoverKey(null));
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
    if (key) setHoverKey(key);
  });
  ul.addEventListener('focusout', (e) => {
    if (e.target.closest('.list-item-btn')) setHoverKey(null);
  });
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

// Zahlen in den Sperrgrad-Knöpfen (A-12/E2, ersetzt A-10s Kennzahlen-Streifen).
//
// Gezählt wird `base`, also die Menge OHNE den Sperrgradfilter (E3) — die Zahlen
// bleiben deshalb stehen, während man zwischen den drei Stufen umschaltet, und
// bewegen sich nur bei Restdauer, Verkehrsmittel oder Umkreissuche. Genau das
// macht sie als Bedienelement brauchbar.
//
// Die Ampelfarbe steckt weiterhin im Punkt, nie im Text (A-10/E2): --amber
// erreicht als Text auf --surface im hellen Schema nur ~2,3:1, eine orange „118"
// wäre ein WCAG-Verstoß, der beim Prüfen im dunklen Schema (dort ~9,7:1)
// unsichtbar bleibt.
//
// Eine 0 blendet ihren Knopf NICHT aus (A-10/E6 abgelöst): ein Bedienelement,
// das bei 0 verschwindet, fehlt genau dann, wenn man damit zurückwollte.
function renderFilterCounts(base) {
  // Vor dem ersten Ladeversuch bleiben die Knöpfe unbeziffert: eine 0 wäre von
  // einer echten 0 nicht zu unterscheiden.
  const k = state.geladen ? summarize(base) : null;
  for (const stufe of ['voll', 'teil', 'gering']) {
    const span = document.querySelector(`.seg-count[data-count="${stufe}"]`);
    if (span) span.textContent = k ? String(k[stufe]) : '';
  }
}

function render() {
  // Hover-Zustand VOR dem Neuaufbau räumen (A-9): Zeile und Fläche darunter
  // werden gleich zerstört, ihr mouseleave feuert nie — ohne diesen Schritt
  // bliebe nach einem Filterwechsel unter ruhendem Zeiger eine
  // Geist-Hervorhebung stehen. Der nächste Zeiger-/Fokuswechsel baut den
  // Zustand von selbst wieder auf.
  setHoverKey(null);
  // Einmal pro render() gefiltert: base speist die Zahlen (A-12/E3), list alles
  // Sichtbare. Zwei Ableitungen einer Quelle statt zweier Filterläufe — dieselbe
  // Eigenschaft, auf die sich A-7 verlässt: was die Karte zeigt und was die
  // Liste zeigt, kann per Konstruktion nicht auseinanderlaufen.
  const base = filteredBase();
  const list = applyAmpel(base);
  // Flächen vor den Markern: dieselbe gefilterte Liste, beide Ebenen bleiben
  // dadurch von sich aus synchron (A-7) — die Fläche ist kein eigener Zustand.
  renderAreas(list);
  renderMarkers(list);
  renderList(list);
  renderStatus(list);
  renderFilterCounts(base);
  // Auswahl beibehalten, falls noch sichtbar
  if (state.selectedId && listItemById.has(state.selectedId)) {
    listItemById.get(state.selectedId).classList.add('is-selected');
    // Die frisch aufgebauten Flächen stehen alle auf idle — die gewählte
    // wieder auf ihre Stufe heben (A-9/E4) und nach vorn bringen (E10).
    applyAreaTier(state.selectedId);
  } else {
    state.selectedId = null;
  }
}

function selectFeature(key, { fromList, fromMarker } = {}) {
  const vorher = state.selectedId;
  state.selectedId = key;
  for (const [k, li] of listItemById) li.classList.toggle('is-selected', k === key);
  // Flächen-Stufen nachziehen (A-9): die alte Auswahl fällt zurück (auf idle
  // oder hover, je nach Zeiger), die neue bekommt die stärkste Stufe und
  // kommt nach vorn (E4, E10).
  if (vorher && vorher !== key) applyAreaTier(vorher);
  applyAreaTier(key);

  const marker = markerById.get(key);
  // Mit Fläche: auf deren Ausdehnung einpassen statt auf einen festen Zoom
  // (A-7/E5). Ein fester Punkt/Zoom nimmt bei einer langen Straßensperrung
  // genau den räumlichen Zusammenhang weg, den die Fläche zeigen soll.
  // Ohne Fläche bleibt es exakt beim bisherigen Verhalten.
  const bounds = areaById.get(key)?.getBounds();
  const animate = !prefersReducedMotion();
  const hatFlaeche = bounds && bounds.isValid();
  if (hatFlaeche) {
    // Popup ZUERST öffnen, dann einpassen — nur so ist seine Höhe messbar, und
    // bei diesen Markern ist autoPan aus (siehe renderMarkers), das Öffnen
    // verschiebt also nichts, was das Einpassen danach wieder gutmachen müsste.
    if (marker) marker.openPopup();
    map.fitBounds(bounds, {
      paddingTopLeft: [AREA_FIT_PADDING, AREA_FIT_PADDING + popupPlatz(marker)],
      paddingBottomRight: [AREA_FIT_PADDING, AREA_FIT_PADDING],
      maxZoom: AREA_FIT_MAX_ZOOM,
      animate,
    });
  } else if (marker) {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate });
    marker.openPopup();
  }
  if (fromMarker) {
    // Nur den Listen-Container scrollen, nicht das ganze Fenster: sonst springt
    // im mobilen Layout (Liste unter der Karte) der Viewport nach unten weg und
    // verdeckt das gerade geöffnete Info-Popup auf der Karte.
    scrollListItemIntoView(listItemById.get(key));
  }
}

// Platz, den fitBounds oben für das schon offene Popup freihalten muss (A-7/E5).
// GEMESSEN, nicht geschätzt: ein kurzes Popup soll nicht so viel Karte kosten wie
// ein langes. Ohne diesen Streifen läge das Popup über der gerade eingepassten
// Fläche, und mit abgeschaltetem autoPan würde es am oberen Kartenrand
// abgeschnitten — unlesbar, also schlimmer als jede Verschiebung.
//
// Nach oben gedeckelt: mehr als AREA_FIT_POPUP_MAX_SHARE der Kartenhöhe darf der
// Streifen nicht fressen, sonst quetscht ein langer Infotext die Fläche auf einem
// kleinen Display in einen Streifen. Im Extremfall (Popup höher als der Deckel)
// verdeckt es einen Teil der Fläche — bewusst, denn lesbar schlägt vollständig.
function popupPlatz(marker) {
  const el = marker?.getPopup()?.getElement();
  if (!el) return 0;
  return Math.min(el.offsetHeight, Math.round(map.getSize().y * AREA_FIT_POPUP_MAX_SHARE));
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

// --- Farbschema-Umschalter (A-8) --------------------------------------------
// Die Farben selbst liegen komplett in styles.css: die Palette hängt an
// data-theme auf <html>, nicht an Werten aus dem JavaScript. Hier passiert
// deshalb nur dreierlei — Attribut setzen, Systemleiste nachziehen, Wahl
// merken. Kein render()-Aufruf: Karte, Liste und Popups holen ihre Farben über
// dieselben Tokens und schalten von selbst um.

// Ohne ausdrückliche Wahl bleibt das Attribut WEG, statt 'system'
// hineinzuschreiben: nur dann greift die Media Query in styles.css, und die
// Seite folgt der Systemvorgabe auch dann noch, wenn sie sich später ändert.
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = theme;
  syncThemeColor(theme);
}

// Die beiden <meta name="theme-color"> in index.html sind über `media` an die
// Systemvorgabe gebunden — bei einer ausdrücklichen Wahl wäre die Systemleiste
// sonst hell, während die Seite dunkel ist. Bei 'system' bekommen sie ihre
// Media-Bindung zurück. Dass dann beide auf `all` stehen, ist unkritisch: sie
// tragen in dem Fall dieselbe Farbe, egal welche der Browser nimmt.
function syncThemeColor(theme) {
  document.querySelectorAll('meta[name="theme-color"][data-scheme]').forEach((meta) => {
    const scheme = meta.dataset.scheme;
    if (theme === DEFAULT_THEME) {
      meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`);
      meta.setAttribute('content', THEME_COLOR[scheme]);
    } else {
      meta.setAttribute('media', 'all');
      meta.setAttribute('content', THEME_COLOR[theme]);
    }
  });
}

function syncThemeButtons(theme) {
  document.querySelectorAll('[data-theme-toggle] button').forEach((b) => {
    const active = b.dataset.themeValue === theme;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}

function wireThemeToggle() {
  applyTheme(state.theme);
  const group = document.querySelector('[data-theme-toggle]');
  if (!group) return;
  syncThemeButtons(state.theme);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeValue;
      if (theme === state.theme) return;
      state.theme = theme;
      syncThemeButtons(theme);
      applyTheme(theme);
      schreibeGespeichertesFarbschema(theme);
    });
  });

  // Wechselt die Systemvorgabe, während 'system' aktiv ist, schalten die
  // Farben per CSS von selbst um — nur die Systemleiste hängt an den beiden
  // Meta-Angaben und muss nachgezogen werden.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === DEFAULT_THEME) syncThemeColor(DEFAULT_THEME);
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
  // Reihenfolge = Zeichenreihenfolge: Flächen zuerst, damit Marker und
  // Suchkreis darüber liegen (A-7/E2).
  areaLayer = L.layerGroup().addTo(map);
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
    // Erst jetzt dürfen Zahlen in den Sperrgrad-Knöpfen stehen (A-12): eine 0
    // vor diesem Punkt hieße „noch nichts geladen", sähe aber aus wie „keine
    // Baustelle dieser Stufe". Im catch-Zweig bleibt es deshalb bei false.
    state.geladen = true;
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
// wireThemeToggle() zuerst: das Attribut hat das Inline-Skript in index.html
// schon vor dem ersten Aufbau gesetzt, hier kommen die Meta-Angaben und der
// Zustand der Knöpfe dazu — vor allem anderen, damit nichts kurz falsch
// eingefärbt dasteht.
wireThemeToggle();
initMap();
wireFilters();
wireLanguageToggle();
wireSearch();
wireWhatsNew();
wireListFocus();
loadData();
initServiceWorker();
