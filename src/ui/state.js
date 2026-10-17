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
  filters: { restdauer: 'alle', ampel: 'alle', verkehrsmittel: 'alle' },
  search: null, // { center: [lat, lon], label: string }
  selectedId: null,
  // A-9: Feature unter dem Zeiger bzw. mit Tastaturfokus — flüchtig, überlebt
  // absichtlich kein render() (die Zeile und die Ebene darunter werden dort
  // zerstört, ihr mouseleave käme nie an → Geist-Hervorhebung).
  hoverKey: null,
  lang: DEFAULT_LANG,
  theme: 'system',
};
