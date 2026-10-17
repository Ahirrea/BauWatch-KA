// app.js — entry module. Lädt den statischen Daten-Snapshot
// data/baustellen.geojson (siehe ADR-001) und macht daraus Karte + Liste.
//
// Since A-14/E11 the work lives in feature modules under src/ui/; this file
// owns what ties them together: the render pipeline, selection and hover
// (they touch map and list at once), the data load and the boot order.

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
  getMap,
  initMap,
  openPopup,
  renderAreas,
  renderMarkers,
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
import { renderChangelogBody, wireWhatsNew } from './ui/feed.js';
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

function selectFeature(key, { fromMarker } = {}) {
  const vorher = state.selectedId;
  state.selectedId = key;
  markSelected(key);
  // Flächen-Stufen nachziehen (A-9): die alte Auswahl fällt zurück (auf idle
  // oder hover, je nach Zeiger), die neue bekommt die stärkste Stufe und
  // kommt nach vorn (E4, E10).
  if (vorher && vorher !== key) applyAreaTier(vorher);
  applyAreaTier(key);
  openPopup(key);
  if (fromMarker) {
    // Nur den Listen-Container scrollen, nicht das ganze Fenster: sonst springt
    // im mobilen Layout (Liste unter der Karte) der Viewport nach unten weg und
    // verdeckt das gerade geöffnete Info-Popup auf der Karte.
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
    if (state.features.length === 0) {
      status.textContent = str('listStatusNoData');
    }
  } catch (err) {
    console.error(err);
    status.classList.add('is-error');
    status.textContent = str('listStatusLoadError');
    el('stand').textContent = str('standUnavailable');
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
initMap({ onSelect: selectFeature, onHover: setHoverKey });
wireFilters(render);
wireLanguageToggle(() => {
  // Footer text (Stand/sample-data hint) depends on the last-loaded
  // collection, not just on filters — re-apply it in the new language.
  if (letzteCollection) setFooter(letzteCollection, { ausCache: letzterAusCache });
  render();
  // "Was ist neu?" chrome (loading/empty/error/labels) re-renders too;
  // quoted raw content inside entries is unaffected either way (A-6/E6).
  renderChangelogBody();
});
wireSearch({
  onResult(hit) {
    drawSearchCircle(hit.center);
    getMap().setView(hit.center, 14, { animate: !prefersReducedMotion() });
    render();
  },
  onReset() {
    clearSearchCircle();
    getMap().setView(KA_CENTER, 13, { animate: !prefersReducedMotion() });
    render();
  },
});
wireWhatsNew();
initList({ onSelect: selectFeature, onHover: setHoverKey });
loadData();
initServiceWorker();
