// app.js — entry module. Lädt den statischen Daten-Snapshot
// data/baustellen.geojson (siehe ADR-001) und macht daraus Karte + Liste.
//
// Since A-14/E11 the work lives in feature modules under src/ui/; this file
// owns what ties them together: the render pipeline, selection and hover
// (they touch map, list and panel at once), the data load and the boot order.
// The page is a map app shell since A-14: the map fills the viewport, the
// panel (bottom sheet / side panel) floats above it.

import { state } from './ui/state.js';
import { el, prefersReducedMotion } from './ui/dom.js';
import { KA_CENTER, featureKey } from './ui/geo.js';
import { STAND_LOCALE, liesGespeicherteSprache, str, wireLanguageToggle } from './ui/text.js';
import { liesGespeichertesFarbschema, wireThemeToggle } from './ui/theme.js';
import { applyAmpel, filteredBase, renderFilterCounts, wireFilters } from './ui/filters.js';
import {
  applyAreaTier,
  bringAreaToFront,
  clearSearchCircle,
  drawSearchCircle,
  initMap,
  openPopup,
  renderAreas,
  renderMarkers,
  setChromeInsets,
  setViewInVisibleArea,
} from './ui/map.js';
import {
  hasListItem,
  initList,
  markSelected,
  renderList,
  renderStatus,
  scrollListItemIntoView,
  setRowHovered,
} from './ui/list.js';
import { wireSearch } from './ui/search.js';
import { loadChangelog, renderChangelogBody } from './ui/feed.js';
import { initPanel, isDesktop, setSheet, sheetState, syncHandleLabel } from './ui/panel.js';
import { wireMenu } from './ui/menu.js';
import { refreshStats, showStats } from './ui/stats.js';
import { initServiceWorker } from './ui/pwa.js';

const DATA_URL = 'data/baustellen.geojson';

// --- Hervorhebung und Auswahl (A-9, A-11) -----------------------------------

// Hover/Fokus-Ziel wechseln: Fläche umstufen, Gegenstück-Zeile tönen (E2/E7).
// Endet ein Hover, kommt die gewählte Fläche wieder nach ganz vorn (E10).
// Bewegt hier NIE die Karte oder die Liste (E9).
function setHoverKey(key) {
  if (key === state.hoverKey) return;
  const vorher = state.hoverKey;
  state.hoverKey = key;
  if (vorher) {
    applyAreaTier(vorher);
    setRowHovered(vorher, false);
  }
  if (key) {
    applyAreaTier(key);
    setRowHovered(key, true);
  }
  if (!key && state.selectedId) bringAreaToFront(state.selectedId);
}

function selectFeature(key, { fromList, fromMarker } = {}) {
  const vorher = state.selectedId;
  state.selectedId = key;
  markSelected(key);
  // Flächen-Stufen nachziehen (A-9): die alte Auswahl fällt zurück (auf idle
  // oder hover, je nach Zeiger), die neue bekommt die stärkste Stufe und
  // kommt nach vorn (E4, E10).
  if (vorher && vorher !== key) applyAreaTier(vorher);
  applyAreaTier(key);
  // A full sheet hides the map: a selection from the list steps it down to
  // half so the popup has room (A-14/E9). The sheet moves — the camera does
  // not (A-11): setSheet() reports the target geometry before the popup
  // opens, so autoPan already pads for the lowered sheet.
  if (fromList && !isDesktop() && sheetState() === 'full') setSheet('half');
  openPopup(key);
  if (fromMarker) {
    // Nur den Scroll-Container der Liste bewegen, nie die Seite (A-14: die
    // Seite scrollt ohnehin nicht mehr; der Container ist der Panel-Body).
    scrollListItemIntoView(key);
  }
}

// --- Rendering ---------------------------------------------------------------

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
  if (state.selectedId && hasListItem(state.selectedId)) {
    markSelected(state.selectedId);
    // Die frisch aufgebauten Flächen stehen alle auf idle — die gewählte
    // wieder auf ihre Stufe heben (A-9/E4) und nach vorn bringen (E10).
    applyAreaTier(state.selectedId);
  } else {
    state.selectedId = null;
  }
}

// --- Daten -------------------------------------------------------------------

function setFooter(collection, { ausCache = false } = {}) {
  const stand = collection.stand ? new Date(collection.stand) : null;
  el('stand').textContent = stand
    ? stand.toLocaleString(STAND_LOCALE[state.lang], { dateStyle: 'medium', timeStyle: 'short' })
    : str('standUnknown');
  // Die Namensnennung selbst wird hier NICHT geschrieben: sie steht statisch in
  // index.html (Lizenzbedingung — sie darf nicht am Datenabruf hängen). Hier
  // kommt nur der Zusatz für den Beispieldaten-Startwert dazu, damit niemand
  // Platzhalter für amtliche Daten hält.
  const hinweis = el('attribution-hinweis');
  hinweis.textContent = collection.sample ? str('sampleDataHint') : '';
  hinweis.hidden = !collection.sample;
  // Offline-Kennzeichnung: der Stand ist echt, aber möglicherweise überholt.
  el('stand-offline').hidden = !ausCache;
  el('stand-zeile').classList.toggle('is-stale', ausCache);
}

let letzteCollection = null;
let letzterAusCache = false;

async function loadData() {
  const status = el('list-status');
  status.textContent = str('listStatusLoading');
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
    refreshStats();
    if (state.features.length === 0) {
      status.textContent = str('listStatusNoData');
    }
  } catch (err) {
    console.error(err);
    state.loadError = true;
    status.classList.add('is-error');
    status.textContent = str('listStatusLoadError');
    el('stand').textContent = str('standUnavailable');
    refreshStats();
  }
}

// --- Start -------------------------------------------------------------------

state.lang = liesGespeicherteSprache();
state.theme = liesGespeichertesFarbschema();

// wireThemeToggle() zuerst: das Attribut hat das Inline-Skript in index.html
// schon vor dem ersten Aufbau gesetzt, hier kommen die Meta-Angaben und der
// Zustand der Knöpfe dazu — vor allem anderen, damit nichts kurz falsch
// eingefärbt dasteht.
wireThemeToggle();
// The panel first: it measures the chrome and reports what it covers, which
// the map needs before its first view (A-14/E9, E13).
initPanel({
  onChromeChange: setChromeInsets,
  onTabChange(tab) {
    if (tab === 'neu') loadChangelog();
    if (tab === 'statistik') showStats();
  },
});
initMap({ onSelect: selectFeature, onHover: setHoverKey });
// Same centre and zoom as ever (Marktplatz, 13) — centred in the part of the
// map the panel leaves uncovered (A-14/E13).
setViewInVisibleArea(KA_CENTER, 13);
wireFilters(render);
wireLanguageToggle(() => {
  // Footer text (Stand/sample-data hint) depends on the last-loaded
  // collection, not just on filters — re-apply it in the new language.
  if (letzteCollection) setFooter(letzteCollection, { ausCache: letzterAusCache });
  syncHandleLabel();
  render();
  refreshStats();
  // "Was ist neu?" chrome (loading/empty/error/labels) re-renders too;
  // quoted raw content inside entries is unaffected either way (A-6/E6).
  renderChangelogBody();
});
// The radius search and its reset keep their views (A-11/E5) — centred in the
// uncovered map since A-14, or on a phone the searched place would sit under
// the half-open sheet.
wireSearch({
  onResult(hit) {
    drawSearchCircle(hit.center);
    setViewInVisibleArea(hit.center, 14, { animate: !prefersReducedMotion() });
    render();
  },
  onReset() {
    clearSearchCircle();
    setViewInVisibleArea(KA_CENTER, 13, { animate: !prefersReducedMotion() });
    render();
  },
});
wireMenu();
initList({ onSelect: selectFeature, onHover: setHoverKey });
loadData();
initServiceWorker();
