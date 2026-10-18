// state.js — the one state object every UI module reads (A-14/E11).
//
// Plain data, no behaviour: modules import it and the entry module
// (src/app.js) decides when to render. Language and colour scheme start at
// their defaults here and are set from storage at boot (text.js, theme.js).

import { DEFAULT_LANG } from '../lib/i18n.js';

export const state = {
  features: [],
  // Ein Ladeversuch ist durch (egal ob erfolgreich). Trennt „noch keine Zahlen"
  // von „echte 0" in den Sperrgrad-Knöpfen (A-12): state.features.length === 0
  // allein kann beides heißen.
  geladen: false,
  // The load attempt failed (A-15: the statistics tab says so instead of
  // waiting forever for data that is not coming).
  loadError: false,
  // `district` (A-17/E4): a district name or 'alle'; replaces the radius
  // search and is replaced by it (E5).
  filters: { restdauer: 'alle', ampel: 'alle', verkehrsmittel: 'alle', district: 'alle' },
  search: null, // { center: [lat, lon], label: string }
  selectedId: null,
  // A-9: Feature unter dem Zeiger bzw. mit Tastaturfokus — flüchtig, überlebt
  // absichtlich kein render() (die Zeile und die Ebene darunter werden dort
  // zerstört, ihr mouseleave käme nie an → Geist-Hervorhebung).
  hoverKey: null,
  // A-17: the committed district boundaries (data/districts.geojson), loaded
  // once at boot; null until then, or when the file could not be read.
  districts: null,
  lang: DEFAULT_LANG,
  theme: 'system',
};
