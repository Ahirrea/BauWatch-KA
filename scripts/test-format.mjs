// Testscript für format.js — Datums-Parsing und Anzeige-Aufbereitung.
// Ausführen: node scripts/test-format.mjs (Exit 0 = ok, 1 = Fehler)
//
// Anlass (2026-08-07): parseDate() hat ISO-Datumsangaben (yyyy-mm-dd) als
// UTC-Mitternacht geparst — der Spec-Sonderfall von new Date(string) für
// reine Datumsangaben —, deutsche (dd.mm.yyyy) dagegen als LOKALE
// Mitternacht. Westlich von UTC rutscht der Kalendertag eines ISO-Datums
// damit auf den Vortag (formatDate, daysBetween, „endet heute", Zeitraum-
// filter); östlich von UTC unterscheiden sich nur die Uhrzeiten. Die
// Konsistenz-Invariante unten vergleicht die beiden Formate direkt: sie ist
// in jeder Zeitzone außer UTC verletzbar — auf UTC selbst fallen lokale und
// UTC-Mitternacht zusammen, ein CI-Läufer auf UTC kann den Fehler also
// prinzipiell nicht sehen, ein Rechner in Europa schon.

import { parseDate, formatDate, daysBetween, restdauer, formatRange } from '../src/lib/format.js';

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

// --- parseDate: Formate und Konsistenz ---------------------------------------

const iso = parseDate('2026-08-07');
const de = parseDate('07.08.2026');
check(
  'ISO- und dd.mm.yyyy-Schreibweise desselben Tages ergeben denselben Zeitpunkt',
  iso?.getTime() === de?.getTime(),
  `ISO=${iso?.toString()} vs de=${de?.toString()}`
);
check(
  'ISO-Datum wird als lokale Mitternacht geparst',
  iso?.getFullYear() === 2026 && iso?.getMonth() === 7 && iso?.getDate() === 7 &&
    iso?.getHours() === 0 && iso?.getMinutes() === 0,
  iso?.toString()
);
check('zweistelliges Jahr wird als 20xx gelesen', parseDate('07.08.26')?.getTime() === de?.getTime());

// ISO MIT Uhrzeit ist kein reines Datum und bleibt beim normalen Parser —
// ohne Offset-Angabe ist das per Spec ohnehin lokale Zeit.
const mitZeit = parseDate('2026-08-07T12:30:00');
check('ISO mit Uhrzeit bleibt gültig und am selben Tag', mitZeit?.getDate() === 7 && mitZeit?.getHours() === 12);

check('null ergibt null', parseDate(null) === null);
check('leerer String ergibt null', parseDate('') === null);
check('Unfug ergibt null', parseDate('kein Datum') === null);
const durchgereicht = new Date(2026, 7, 7);
check('Date-Objekt wird durchgereicht', parseDate(durchgereicht) === durchgereicht);
check('Zahl (Epoch-ms) wird akzeptiert', parseDate(durchgereicht.getTime())?.getTime() === durchgereicht.getTime());

// --- formatDate / formatRange: Round-Trip ------------------------------------

check('formatDate(ISO) trifft den Kalendertag', formatDate('2026-08-07') === '07.08.2026', formatDate('2026-08-07'));
check('formatDate(dd.mm.yyyy) ist stabil', formatDate('07.08.2026') === '07.08.2026');
check('formatRange aus zwei ISO-Daten', formatRange('2026-08-07', '2026-08-09') === '07.08.2026 – 09.08.2026');

// --- daysBetween / restdauer: Grenzen mit ISO-Eingaben ------------------------
// Dieselben Grenzfälle wie in test-stats.mjs, nur dass das Enddatum hier als
// ISO-String hereinkommt — so, wie es im committeten Snapshot steht.

const NOW = new Date(2026, 7, 7); // 07.08.2026, lokale Mitternacht

check('daysBetween: selber Tag = 0', daysBetween(NOW, parseDate('2026-08-07')) === 0);
check('daysBetween: morgen = 1', daysBetween(NOW, parseDate('2026-08-08')) === 1);
check('daysBetween: gestern = -1', daysBetween(NOW, parseDate('2026-08-06')) === -1);

check('restdauer: ISO-Enddatum heute -> „endet heute"', restdauer('2026-08-07', NOW).days === 0);
check('restdauer: ISO-Enddatum gestern -> abgelaufen', restdauer('2026-08-06', NOW).expired === true);
check('restdauer: ISO-Enddatum morgen -> 1 Tag', restdauer('2026-08-08', NOW).days === 1);

// --- Reinheit: keine DOM-/npm-Abhängigkeit ----------------------------------
// (dieselbe harte Zusicherung wie für die übrigen src/lib/-Module)

const quelle = await import('node:fs').then(({ readFileSync }) =>
  readFileSync(new URL('../src/lib/format.js', import.meta.url), 'utf8')
);
check('format.js nutzt kein document/window', !/\b(document|window)\b/.test(quelle));
check(
  'format.js importiert höchstens relativ aus src/lib/',
  [...quelle.matchAll(/from\s+'([^']+)'/g)].every((m) => m[1].startsWith('./'))
);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Format-Tests bestanden.');
