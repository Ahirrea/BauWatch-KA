// filters.js — the three filter groups and the two filtered sets (A-12),
// split out in A-14/E11.

import { endetInnerhalb, summarize } from '../lib/stats.js';
import { state } from './state.js';
import { RADIUS_KM, haversineKm, latLngOf } from './geo.js';

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
export function filteredBase() {
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
export function applyAmpel(list) {
  return list.filter((f) => matchesAmpel(f.properties, state.filters.ampel));
}

// Zahlen in den Sperrgrad-Knöpfen (A-12/E2, ersetzt A-10s Kennzahlen-Streifen).
//
// Gezählt wird `base`, also die Menge OHNE den Sperrgradfilter (E3) — die Zahlen
// bleiben deshalb stehen, während man zwischen den drei Stufen umschaltet, und
// bewegen sich nur bei Restdauer, Verkehrsmittel oder Umkreissuche. Genau das
// macht sie als Bedienelement brauchbar.
//
// Die Ampelfarbe steckt weiterhin im Punkt, nie im Text (A-10/E2): --amber
// erreicht als Text auf --surface im hellen Schema nur ~3,4:1 (AA-Text braucht
// 4,5:1), eine orange „118" wäre ein WCAG-Verstoß, der beim Prüfen im dunklen
// Schema (dort ~8,6:1) unsichtbar bleibt.
//
// Eine 0 blendet ihren Knopf NICHT aus (A-10/E6 abgelöst): ein Bedienelement,
// das bei 0 verschwindet, fehlt genau dann, wenn man damit zurückwollte.
export function renderFilterCounts(base) {
  // Vor dem ersten Ladeversuch bleiben die Knöpfe unbeziffert: eine 0 wäre von
  // einer echten 0 nicht zu unterscheiden.
  const k = state.geladen ? summarize(base) : null;
  for (const stufe of ['voll', 'teil', 'gering']) {
    const span = document.querySelector(`.seg-count[data-count="${stufe}"]`);
    if (span) span.textContent = k ? String(k[stufe]) : '';
  }
}

/** Wires the segmented buttons; `onChange` re-renders after every click. */
export function wireFilters(onChange) {
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
        onChange();
      });
    });
  });
}
