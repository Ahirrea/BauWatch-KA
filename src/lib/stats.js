// stats.js — Kennzahlen und Restdauer-Prädikat für die Filterzeile (A-10, A-12).
//
// Reine, DOM-freie, abhängigkeitsfreie Funktionen. Wie i18n.js nur vom Browser
// importiert (das Build-Skript zählt in quality-report.mjs, mit anderem Zweck)
// — die Einschränkungen für src/lib/ gelten trotzdem unverändert.
//
// Bewusst KEINE Nutzungs-/Besucherstatistik (A-10, Spannung 1): gezählt werden
// Baustellen, nie Besucherinnen. Nichts wird gespeichert oder gesendet.

import { restdauer } from './format.js';

/** Kürzere der beiden Restdauer-Stufen in Tagen (A-12/E5). Stammt aus A-10/E3,
 *  wo dieselben 7 Tage die Kennzahl „endet bald" abgrenzten — bewusst dieselbe
 *  Zahl, damit die Seite nicht zwei Wochenbegriffe nebeneinander lehrt. */
export const ENDET_BALD_TAGE = 7;

/** Die Stufen des Restdauer-Filters, in der Reihenfolge der Knöpfe (A-12/E1).
 *  „alle" ist keine Stufe, sondern deren Abwesenheit, und steht deshalb nicht
 *  hier. scripts/test-stats.mjs vergleicht diese Liste mit den data-value-
 *  Angaben in index.html — dieselbe Anti-Drift-Logik wie bei THEMES in
 *  test-theme.mjs: die Schwellen stehen an zwei Stellen, also müssen sie
 *  maschinell abgeglichen werden. */
export const RESTDAUER_STUFEN = [ENDET_BALD_TAGE, 30];

/**
 * Endet die Sperrung innerhalb der nächsten `tage` Tage?
 *
 * Ersetzt den Zeitraumfilter aus der Zeit vor A-12 (matchesZeitraum): dessen
 * Achse — wann beginnt der Vorgang — ist gegen diese Datenquelle konstant, weil
 * der WFS ausschließlich laufende Vorgänge liefert (A-12, „The finding that
 * started this"). Die Restdauer trennt dieselben Daten dagegen real.
 *
 * Ohne Enddatum („Ende offen") und bereits abgelaufen zählen beide nicht: das
 * eine endet nicht absehbar, das andere endet nicht mehr. Beide sind nur unter
 * „Alle" erreichbar.
 *
 * @param {{bis?: string|null}} props Feature-Eigenschaften
 * @param {number} tage Obergrenze der Restdauer, einschließlich
 * @param {Date} [now=new Date()] Bezugszeitpunkt
 * @returns {boolean}
 */
export function endetInnerhalb(props, tage, now = new Date()) {
  const rest = restdauer(props?.bis, now);
  if (rest.open || rest.expired) return false;
  return rest.days <= tage;
}

/**
 * Zählt eine Liste von Features nach Ampelstufe.
 *
 * Seit A-12 speist das die Zahlen in den Sperrgrad-Knöpfen, und zwar über die
 * Menge OHNE den Sperrgradfilter (A-12/E3): jeder Knopf sagt, wie viele Treffer
 * sein eigener Klick brächte. Der Aufrufer stellt das sicher, nicht diese
 * Funktion — sie zählt, was sie bekommt.
 *
 * Die drei Ampelstufen summieren sich bei echten Daten immer exakt auf
 * `total`: classifySperrgrad() in classify.js hat einen totalen Fallback, ein
 * Feature ohne gültige Stufe kann aus dem Build also nicht herauskommen. Ein
 * unerwarteter Wert wird trotzdem nur ignoriert statt in einen falschen Topf
 * gezählt — dann stimmt die Summe nicht mehr, und genau das prüft der Test.
 *
 * @param {Array<{properties?: {ampel?: string}}>} features
 * @returns {{total: number, voll: number, teil: number, gering: number}}
 */
export function summarize(features) {
  const out = { total: 0, voll: 0, teil: 0, gering: 0 };
  if (!Array.isArray(features)) return out;
  out.total = features.length;

  for (const f of features) {
    const p = f?.properties ?? {};
    if (p.ampel === 'voll' || p.ampel === 'teil' || p.ampel === 'gering') {
      out[p.ampel] += 1;
    }
  }
  return out;
}
