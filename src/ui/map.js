// map.js — Leaflet map, markers, areas and their emphasis tiers (A-7, A-9),
// split out of app.js in A-14/E11.

import { state } from './state.js';
import { hoverFaehig } from './dom.js';
import { KA_CENTER, RADIUS_KM, latLngOf } from './geo.js';
import { popupHtml } from './feature-html.js';

// Leaflet wird global über das <script>-Tag geladen.
/* global L */

// Ampelfarben der Karte (Marker + Flächen). voll/gering decken sich mit
// --red/--green im hellen Schema; teil bleibt seit #32 bewusst NICHT an
// var(--amber) gekoppelt: Marker und Flächen liegen auf den immer hellen
// OSM-Kacheln, nicht auf --surface, und Teil muss dort deutlich heller sein
// als Voll, sonst sind beide kaum auseinanderzuhalten. Die Punkte/Streifen in
// Liste, Popup und Knöpfen tragen dagegen die Schema-Tokens aus styles.css
// (hell seit #32 dunkler, dunkel schon immer #ffb02e).
const AMPEL_COLOR = { voll: '#c02626', teil: '#f08a00', gering: '#197a3d' };

let map;
let areaLayer;
let markerLayer;
let searchLayer;
const markerById = new Map(); // key -> Leaflet-Marker
const areaById = new Map(); // key -> Leaflet-Layer der Fläche (A-7)
let handlers = { onSelect: () => {}, onHover: () => {} };

export function getMap() {
  return map;
}

/** Creates the map; `onSelect(key)` and `onHover(key|null)` come from the entry module. */
export function initMap({ onSelect, onHover }) {
  handlers = { onSelect, onHover };
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
  return map;
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
export function renderAreas(list) {
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
    // featureGroup, nicht layerGroup: nur die kann getBounds() und
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

// Stufe eines Features aus dem Zustand ableiten: Auswahl schlägt Hover auf
// demselben Feature (A-9/E4) — beide zugleich sichtbar heißt „A ist gewählt, B
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
export function applyAreaTier(key) {
  const gruppe = areaById.get(key);
  if (!gruppe) return;
  const tier = areaTier(key);
  gruppe.eachLayer((teil) => teil.setStyle(areaStyle(gruppe._bauwatchFarbe, teil._bauwatchTyp, tier)));
  if (tier !== 'idle') gruppe.bringToFront();
}

export function bringAreaToFront(key) {
  areaById.get(key)?.bringToFront();
}

export function renderMarkers(list) {
  markerLayer.clearLayers();
  markerById.clear();
  const keySet = new Set(list.map((f) => f._key));
  state.features.forEach((f) => {
    if (!keySet.has(f._key)) return;
    const marker = L.circleMarker(latLngOf(f), {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: AMPEL_COLOR[f.properties.ampel] || '#666',
      fillOpacity: 0.9,
    });
    // Leaflet's default autoPan stays on for every marker (A-11/E2): selection
    // never moves the camera, so the popup's readability at the map edge is
    // carried by autoPan alone — a shift of at most the popup's height, never
    // a zoom change.
    marker.bindPopup(popupHtml(f));
    marker.on('click', () => handlers.onSelect(f._key, { fromMarker: true }));
    // Marker-Hover hebt die Fläche hervor und tönt die Listenzeile (A-9/E2) —
    // der Marker selbst bleibt unverändert (E6). Leaflet feuert mouseover/
    // mouseout, keine Pointer-Events.
    if (hoverFaehig()) {
      marker.on('mouseover', () => handlers.onHover(f._key));
      marker.on('mouseout', () => handlers.onHover(null));
    }
    marker.addTo(markerLayer);
    markerById.set(f._key, marker);
  });
}

// Selection never moves the camera (A-11/E1, E3, E4): no fitBounds, no
// setView, no panTo — the overview the user built up stays. The popup's
// readability at the map edge is autoPan's job (see renderMarkers); the
// zoom after a click equals the zoom before it, always.
export function openPopup(key) {
  markerById.get(key)?.openPopup();
}

export function drawSearchCircle(center) {
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

export function clearSearchCircle() {
  searchLayer.clearLayers();
}
