// stats.js — Kennzahlen über eine Menge von Baustellen (A-10).
//
// Reine, DOM-freie, abhängigkeitsfreie Funktion. Wie i18n.js nur vom Browser
// importiert (das Build-Skript zählt in quality-report.mjs, mit anderem Zweck)
// — die Einschränkungen für src/lib/ gelten trotzdem unverändert.
//
// Bewusst KEINE Nutzungs-/Besucherstatistik (A-10, Spannung 1): gezählt werden
// Baustellen, nie Besucherinnen. Nichts wird gespeichert oder gesendet.

import { restdauer } from './format.js';

/** Zeitfenster der Kennzahl „endet bald" in Tagen (A-10/E3). Deckt sich mit
 *  dem Zeitraum-Filter „Diese Woche" — bewusst keine zweite Zeitspanne. */
export const ENDET_BALD_TAGE = 7;

/**
 * Fasst eine (bereits gefilterte) Liste von Features zu Kennzahlen zusammen.
 *
 * Die drei Ampelstufen summieren sich bei echten Daten immer exakt auf
 * `total`: classifySperrgrad() in classify.js hat einen totalen Fallback, ein
 * Feature ohne gültige Stufe kann aus dem Build also nicht herauskommen. Ein
 * unerwarteter Wert wird trotzdem nur ignoriert statt in einen falschen Topf
 * gezählt — dann stimmt die Summe nicht mehr, und genau das prüft der Test.
 *
 * @param {Array<{properties?: {ampel?: string, bis?: string|null}}>} features
 * @param {Date} [now=new Date()] Bezugszeitpunkt für „endet bald"
 * @returns {{total: number, voll: number, teil: number, gering: number, endetBald: number}}
 */
export function summarize(features, now = new Date()) {
  const out = { total: 0, voll: 0, teil: 0, gering: 0, endetBald: 0 };
  if (!Array.isArray(features)) return out;
  out.total = features.length;

  for (const f of features) {
    const p = f?.properties ?? {};
    if (p.ampel === 'voll' || p.ampel === 'teil' || p.ampel === 'gering') {
      out[p.ampel] += 1;
    }
    // Ohne Enddatum („Ende offen") und bereits abgelaufen zählen beide nicht:
    // das eine endet nicht absehbar, das andere endet nicht mehr.
    const rest = restdauer(p.bis, now);
    if (!rest.open && !rest.expired && rest.days <= ENDET_BALD_TAGE) {
      out.endetBald += 1;
    }
  }
  return out;
}
