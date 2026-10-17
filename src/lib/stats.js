// stats.js — Kennzahlen und Restdauer-Prädikat für die Filterzeile (A-10, A-12),
// and since A-15 the figures of the statistics tab.
//
// Reine, DOM-freie, abhängigkeitsfreie Funktionen. Wie i18n.js nur vom Browser
// importiert (das Build-Skript zählt in quality-report.mjs, mit anderem Zweck)
// — die Einschränkungen für src/lib/ gelten trotzdem unverändert.
//
// Bewusst KEINE Nutzungs-/Besucherstatistik (A-10, Spannung 1): gezählt werden
// Baustellen, nie Besucherinnen. Nichts wird gespeichert oder gesendet.

import { restdauer, parseDate, daysBetween } from './format.js';

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

// --- Statistics tab (A-15/E5) -------------------------------------------------
// Pure helpers behind the "Statistik" tab: what it shows is only as right as
// these, and inside a UI module npm test could not see them (A-10/E5).

/**
 * Counts features per key and sorts by count (desc), ties by key — a stable
 * order, so the same snapshot always draws the same chart.
 * @param {Array<object>} features
 * @param {(f: object) => string|null|undefined} keyFn  empty keys are skipped
 * @returns {Array<[string, number]>}
 */
export function countBy(features, keyFn) {
  const counts = new Map();
  for (const f of features ?? []) {
    const key = keyFn(f);
    if (key == null || key === '') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
}

/**
 * The first `n` entries plus one entry that sums the rest. A rest of exactly
 * one entry is shown as itself — folding a single entry into "Sonstige" would
 * hide its name to save no space.
 * @param {Array<[string, number]>} entries  sorted, e.g. from countBy()
 * @param {number} n
 * @param {string} restLabel  "Sonstige" / "Other"
 */
export function topWithRest(entries, n, restLabel) {
  if (entries.length <= n + 1) return entries;
  const rest = entries.slice(n).reduce((sum, [, count]) => sum + count, 0);
  return [...entries.slice(0, n), [restLabel, rest]];
}

/**
 * Display form of a raw label: collapsed whitespace, a spaced hyphen between
 * words closed up. The data itself is untouched (A-15/E7) — the city writes
 * "Land  Baden - Württemberg", the tab shows "Land Baden-Württemberg".
 */
export function normalizeLabel(label) {
  return String(label ?? '')
    .replace(/\s+/g, ' ')
    .replace(/(\p{L}) - (\p{L})/gu, '$1-$2')
    .trim();
}

/**
 * Total duration of a case in days (von → bis), or null without both dates
 * or with an end before the start.
 * @param {{von?: string|null, bis?: string|null}} props
 */
export function durationDays(props) {
  const von = parseDate(props?.von);
  const bis = parseDate(props?.bis);
  if (!von || !bis) return null;
  const days = daysBetween(von, bis);
  return days >= 0 ? days : null;
}

/** Median of a list of numbers (mean of the middle two for an even count). */
export function median(numbers) {
  const xs = [...numbers].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

/** Upper bounds (days) of the tab's remaining-duration bands; null = more
 *  than a year. Starts with the filter's steps (RESTDAUER_STUFEN), so the page
 *  teaches one vocabulary (A-15/E6). */
export const RESTDAUER_BANDS = [...RESTDAUER_STUFEN, 91, 365, null];

/**
 * Remaining-duration bands of the tab (A-15/E6). "Ende offen" and "abgelaufen"
 * are no band and counted apart. Every feature lands in exactly one place: the
 * bands plus `open` and `expired` add up to the input length.
 * @returns {{bands: Array<{upTo: number|null, count: number}>, open: number, expired: number}}
 */
export function restdauerBands(features, now = new Date()) {
  const bands = RESTDAUER_BANDS.map((upTo) => ({ upTo, count: 0 }));
  let open = 0;
  let expired = 0;
  for (const f of features ?? []) {
    const rest = restdauer(f?.properties?.bis, now);
    if (rest.open) open++;
    else if (rest.expired) expired++;
    else bands.find((b) => b.upTo === null || rest.days <= b.upTo).count++;
  }
  return { bands, open, expired };
}

/**
 * The `n` longest-running cases by total duration, longest first; ties by
 * title, so the list does not shuffle between two renders of one snapshot.
 * @returns {Array<{feature: object, days: number}>}
 */
export function longest(features, n) {
  return (features ?? [])
    .map((feature) => ({ feature, days: durationDays(feature?.properties) }))
    .filter((x) => x.days !== null)
    .sort((a, b) => b.days - a.days || String(a.feature.properties.titel).localeCompare(String(b.feature.properties.titel), 'de'))
    .slice(0, n);
}
