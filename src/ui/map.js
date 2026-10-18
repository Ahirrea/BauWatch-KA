// map.js — Leaflet map, markers, areas and their emphasis tiers (A-7, A-9),
// split out of app.js in A-14/E11.

import { state } from './state.js';
import { hoverFaehig } from './dom.js';
import { RADIUS_KM, latLngOf } from './geo.js';
import { popupHtml } from './feature-html.js';

// Leaflet wird global über das <script>-Tag geladen.
/* global L */

// The map's colours come from CSS since A-14/E8: every marker and area path
// carries an identity class (m-voll/m-teil/m-gering) and a geometry class
// (m-marker/m-poly/m-line), and src/shell.css colours them from the
// --map-* tokens. That is what lets the dark scheme give the darkened tiles
// their own colour set, and a theme switch recolour the map without a
// render() — the way the rest of the page already switches (A-8). The light
// values are exactly the old AMPEL_COLOR (teil #f08a00 on the light tiles,
// #32). Weights and opacities stay JS (A-9's tiers, below).
const identity = (ampel) => `m-${ampel === 'voll' || ampel === 'teil' ? ampel : 'gering'}`;

let map;
let areaLayer;
let markerLayer;
let searchLayer;
let districtLayer;
const markerById = new Map(); // key -> Leaflet-Marker
const areaById = new Map(); // key -> Leaflet-Layer der Fläche (A-7)
let handlers = { onSelect: () => {}, onHover: () => {} };
// What the floating chrome covers (A-14/E9), from src/ui/panel.js — the
// popups' autoPan keeps clear of it, and views are centred in what is left.
let insets = { top: 10, left: 10, right: 10, bottom: 10 };

export function getMap() {
  return map;
}

/** Creates the map; `onSelect(key)` and `onHover(key|null)` come from the entry module. */
export function initMap({ onSelect, onHover }) {
  handlers = { onSelect, onHover };
  // No attribution control: the OSM credit stands in the static credits
  // footer in index.html (A-14/E7), independent of JavaScript. The zoom
  // control moves top right — the side panel covers the left edge.
  map = L.map('map', { zoomControl: false, attributionControl: false });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  // Reihenfolge = Zeichenreihenfolge: Flächen zuerst, damit Marker und
  // Suchkreis darüber liegen (A-7/E2).
  areaLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  searchLayer = L.layerGroup().addTo(map);
  // A chosen district's outline (A-17/E6) gets its own pane below the overlay
  // pane (400), so areas and markers always lie on top of it.
  map.createPane('districts').style.zIndex = '390';
  districtLayer = L.layerGroup().addTo(map);
  return map;
}

/**
 * Draws the outline of one district (A-17/E6): non-interactive, a faint wash,
 * coloured through the --map-district token (src/shell.css). Returns its
 * bounds for the camera; null clears.
 */
export function showDistrictOutline(feature) {
  districtLayer.clearLayers();
  if (!feature) return null;
  const layer = L.geoJSON(feature, {
    pane: 'districts',
    interactive: false,
    style: { className: 'm-district', weight: 2.5, opacity: 1, fill: true, fillOpacity: 0.07 },
  }).addTo(districtLayer);
  return layer.getBounds();
}

export function clearDistrictOutline() {
  districtLayer?.clearLayers();
}

/**
 * fitBounds into the part of the map the chrome leaves uncovered (A-17/E6),
 * at zoom 15 at most. The fourth view that moves the camera, after the initial
 * view and the search result and reset (A-14/E13 revised); a selection still
 * moves nothing (A-11).
 */
export function fitInVisibleArea(bounds, options) {
  map.fitBounds(bounds, {
    paddingTopLeft: L.point(insets.left, insets.top),
    paddingBottomRight: L.point(insets.right, insets.bottom),
    maxZoom: 15,
    ...options,
  });
}

/** Stores what the chrome covers and re-pads every open-able popup with it. */
export function setChromeInsets(next) {
  insets = next;
  for (const marker of markerById.values()) Object.assign(marker.getPopup().options, popupPadding());
}

// autoPan padding (A-11/E2, amended by A-14/E9): Leaflet's default autoPan
// stays the only thing that ever moves the map on a selection — it just has to
// know that part of the map is covered now.
function popupPadding() {
  return {
    autoPanPaddingTopLeft: L.point(insets.left, insets.top),
    autoPanPaddingBottomRight: L.point(insets.right, insets.bottom),
  };
}

/**
 * setView, but with `latlng` landing in the middle of the part of the map the
 * chrome leaves uncovered (A-14/E13) instead of the middle of the viewport —
 * on desktop that is next to the panel, on a phone above the sheet.
 */
export function setViewInVisibleArea(latlng, zoom, options) {
  const size = map.getSize();
  const visibleCentre = L.point(
    (insets.left + size.x - insets.right) / 2,
    (insets.top + size.y - insets.bottom) / 2
  );
  const shift = size.divideBy(2).subtract(visibleCentre);
  const centre = map.unproject(map.project(latlng, zoom).add(shift), zoom);
  map.setView(centre, zoom, options);
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

// `colour` is the identity class; the geometry class tells the CSS whether
// the shape has an inside to fill (a line has none — A-9's trap, now in CSS).
// Leaflet applies className once, when the path is created; the restyles of
// the tier ramp only touch weight and opacities.
function areaStyle(colour, geometryType, tier = 'idle') {
  if (AREA_LINE_TYPES.has(geometryType)) return { className: `${colour} m-line`, ...AREA_TIER_STYLE.line[tier] };
  return { className: `${colour} m-poly`, ...AREA_TIER_STYLE.polygon[tier] };
}

// Baustellenflächen (A-7). Eigene Ebene UNTER den Markern: der Marker bleibt
// das einzige anklickbare Objekt (E2), die Fläche ist rein zusätzlich.
//
// `interactive: false` (E3) ist hier mehr als Kosmetik — ohne das läge über
// jedem Marker einer langen Straßensperrung eine Fläche, die Klicks abfängt,
// und der Marker wäre kaum noch treffbar. Zugleich taucht die Fläche so nirgends
// in der Tab-Reihenfolge auf: sie ist dekorativ, die Erklärung steht im Popup.
//
// Die Farbe kommt aus derselben Klasse wie beim Marker — keine zweite
// Farbbedeutung auf derselben Karte (E4). Die [lon,lat]→[lat,lng]-Umkehrung übernimmt L.geoJSON
// selbst; anders als bei latLngOf() ist hier also nichts zu drehen.
export function renderAreas(list) {
  areaLayer.clearLayers();
  areaById.clear();
  for (const f of list) {
    const area = f.properties.area;
    if (!area) continue;
    const colour = identity(f.properties.ampel);
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
      const teil = L.geoJSON(g, { interactive: false, style: areaStyle(colour, g.type) });
      // Für den Stufenwechsel (A-9) gemerkt: der Restyle muss je Teil
      // typbewusst laufen — ein pauschales setStyle auf die Gruppe gäbe der
      // Polyline eine Füllung und dem Polygon einen 6-px-Strich.
      teil._bauwatchTyp = g.type;
      teil.addTo(gruppe);
    }
    if (gruppe.getLayers().length === 0) continue;
    gruppe._bauwatchFarbe = colour;
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
      weight: 2,
      fillOpacity: 0.9,
      className: `${identity(f.properties.ampel)} m-marker`,
    });
    // Leaflet's default autoPan stays on for every marker (A-11/E2): selection
    // never moves the camera, so the popup's readability at the map edge is
    // carried by autoPan alone — a shift of at most the popup's height, never
    // a zoom change. Padded by the chrome since A-14/E9.
    marker.bindPopup(popupHtml(f), { maxWidth: 300, ...popupPadding() });
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
    weight: 2,
    fillOpacity: 0.06,
    className: 'm-search',
  }).addTo(searchLayer);
  L.circleMarker(center, {
    radius: 6,
    weight: 2,
    fillOpacity: 1,
    className: 'm-search-dot',
  }).addTo(searchLayer);
}

export function clearSearchCircle() {
  searchLayer.clearLayers();
}
