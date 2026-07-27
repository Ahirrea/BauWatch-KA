// format.js — Aufbereitung von Texten und Zeitangaben für die Anzeige.
//
// Reine Funktionen, keine DOM-Abhängigkeit. Geteilt von Build-Skript und Client.

/**
 * Entfernt HTML-Fragmente aus einem Rohtext (z. B. dem Feld `zusatzinfo`) und
 * liefert lesbaren Klartext. Ohne DOM umgesetzt, damit auch das Build-Skript
 * (Node) die Funktion nutzen kann.
 * @param {string} html Rohtext, möglicherweise mit HTML-Markup
 * @returns {string} bereinigter, einzeiliger Klartext
 */
export function stripHtml(html) {
  if (html == null) return '';
  let text = String(html);
  // <br>, </p>, </div>, <li> etc. in Leerzeichen wandeln, damit Wörter nicht verkleben.
  text = text.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?\s*>/gi, ' ');
  // Alle übrigen Tags entfernen.
  text = text.replace(/<[^>]*>/g, ' ');
  // Häufige HTML-Entities auflösen.
  const entities = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'", '&auml;': 'ä',
    '&ouml;': 'ö', '&uuml;': 'ü', '&Auml;': 'Ä', '&Ouml;': 'Ö',
    '&Uuml;': 'Ü', '&szlig;': 'ß', '&euro;': '€', '&ndash;': '–', '&mdash;': '—',
  };
  text = text.replace(/&[a-zA-Z#0-9]+;/g, (m) => entities[m] ?? m);
  // Numerische Entities (&#228;) auflösen.
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  // Mehrfach-Whitespace zusammenziehen.
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parst ein Datum aus verschiedenen möglichen Formaten (ISO, dd.mm.yyyy).
 * @param {string|number|Date} value
 * @returns {Date|null} gültiges Date oder null
 */
export function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  const s = String(value).trim();
  // dd.mm.yyyy oder dd.mm.yy
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (de) {
    let [, d, m, y] = de;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}

/** Setzt eine Datumszeit auf Mitternacht (lokale Zeit). */
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Ganztägige Differenz in Tagen zwischen zwei Daten (b - a).
 * @returns {number} ganze Tage
 */
export function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b) - startOfDay(a)) / MS);
}

// Phrase table for restdauer()/formatRange(), kept local to this module
// (A-5, decision E4) rather than importing from src/lib/i18n.js — three
// words don't justify coupling the two pure modules together. Numeric dates
// themselves stay locale-neutral (E5); only the surrounding words translate.
const PHRASES = {
  de: {
    open: 'Ende offen',
    expired: 'abgelaufen',
    today: 'endet heute',
    oneDay: 'noch 1 Tag',
    days: (n) => `noch ${n} Tage`,
    from: (d) => `ab ${d}`,
    until: (d) => `bis ${d}`,
    unknown: 'Zeitraum unbekannt',
  },
  en: {
    open: 'open-ended',
    expired: 'expired',
    today: 'ends today',
    oneDay: '1 day left',
    days: (n) => `${n} days left`,
    from: (d) => `from ${d}`,
    until: (d) => `until ${d}`,
    unknown: 'period unknown',
  },
};

/**
 * Formuliert die Restdauer einer Sperrung als Klartext ("noch X Tage").
 * @param {string|Date|null} bis Enddatum
 * @param {Date} [now=new Date()] Bezugszeitpunkt
 * @param {'de'|'en'} [lang='de']
 * @returns {{text: string, days: number|null, expired: boolean, open: boolean}}
 */
export function restdauer(bis, now = new Date(), lang = 'de') {
  const p = PHRASES[lang] || PHRASES.de;
  const end = parseDate(bis);
  if (!end) return { text: p.open, days: null, expired: false, open: true };
  const days = daysBetween(now, end);
  if (days < 0) return { text: p.expired, days, expired: true, open: false };
  if (days === 0) return { text: p.today, days, expired: false, open: false };
  if (days === 1) return { text: p.oneDay, days, expired: false, open: false };
  return { text: p.days(days), days, expired: false, open: false };
}

/**
 * Formatiert ein Datum als deutsches Kurzdatum (dd.mm.yyyy).
 * @param {string|Date|null} value
 * @returns {string}
 */
export function formatDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Formatiert einen Zeitraum ("dd.mm.yyyy – dd.mm.yyyy").
 * @param {string|Date|null} von
 * @param {string|Date|null} bis
 * @param {'de'|'en'} [lang='de']
 * @returns {string}
 */
export function formatRange(von, bis, lang = 'de') {
  const p = PHRASES[lang] || PHRASES.de;
  const a = formatDate(von);
  const b = formatDate(bis);
  if (a && b) return `${a} – ${b}`;
  if (a) return p.from(a);
  if (b) return p.until(b);
  return p.unknown;
}
