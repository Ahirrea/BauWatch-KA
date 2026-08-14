// Testscript für quality-report.mjs (Backlog #18).
// Ausführen: node scripts/test-quality.mjs (Exit 0 = ok, 1 = Fehler)

import { analyzeQuality, summarizeQuality, renderQualityMarkdown } from './quality-report.mjs';

let failed = 0;
function check(name, cond) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}`);
  if (!cond) failed++;
}

const rec = (o) => ({
  vorgang: 'V1', titel: 'Teststr', titelRaw: 'Teststr', von: '2026-07-01', bis: '2026-07-20',
  art: 'Straßenbau', artKnown: true, verursacher: 'TBA', sperrung: 'mit Verkehrsbehinderung',
  ampel: 'teil', hasVorgangsnummer: true, hasArea: true, lon: 8.4, lat: 49.0, ...o,
});

const records = [
  rec({ vorgang: 'V1' }),
  rec({ vorgang: 'V2', von: null }), // fehlender Beginn
  rec({ vorgang: 'V3', bis: null, sperrung: '' }), // fehlendes Ende + fehlende Sperrung
  rec({ vorgang: 'V4', titelRaw: '', verursacher: null }), // fehlende Lage + Verursacher
  rec({ vorgang: 'V5', art: 'Baustelle (XYZ)', artKnown: false }), // unbekannte Kategorie
  rec({ vorgang: 'V6', von: '2026-08-01', bis: '2026-07-01' }), // Ende vor Beginn
  rec({ vorgang: 'V7', von: '2019-06-01', bis: '2020-01-01' }), // abgelaufen (Zeitraum konsistent)
  rec({ vorgang: 'V8', lon: 2.5, lat: 48.5 }), // außerhalb KA (Elsass-ähnlich)
  rec({ vorgang: null, hasVorgangsnummer: false }), // ohne Vorgangsnummer
  rec({ vorgang: 'V9', hasArea: false }), // ohne Fläche (nur Punkt-Geometrie, A-7/E9)
];
const stats = { raw: 20, ka: 10, deduped: 10, skipped: 1 };
const now = new Date('2026-07-15T12:00:00Z');
const r = analyzeQuality(records, stats, now);

check('fehlender Beginn erkannt', r.missing.von.length === 1);
check('fehlendes Ende erkannt', r.missing.bis.length === 1);
check('fehlende Lage erkannt', r.missing.lage.length === 1);
check('fehlender Verursacher erkannt', r.missing.verursacher.length === 1);
check('fehlende Sperrung erkannt', r.missing.sperrung.length === 1);
check('unbekannte Kategorie erkannt', r.unknownArt.length === 1 && r.unknownArt[0].count === 1);
check('Ende-vor-Beginn erkannt', r.dateIssues.endeVorBeginn.length === 1);
check('abgelaufen erkannt', r.dateIssues.abgelaufen.length >= 1);
check('Koordinaten außerhalb KA erkannt', r.coordsOutside.length === 1);
check('ohne Vorgangsnummer erkannt', r.ohneVorgangsnummer.length === 1);
// A-7/E9 — hasArea: Zähler und Liste müssen sich zur Gesamtzahl ergänzen,
// sonst zeigt data/QUALITY.md eine Quote, die nichts aussagt.
check('ohne Fläche erkannt', r.ohneFlaeche.length === 1);
check('mit Fläche gezählt', r.mitFlaeche === records.length - 1);
check('Flächen-Zähler ergänzen sich zur Gesamtzahl', r.mitFlaeche + r.ohneFlaeche.length === r.total);
check(
  'Flächen-Quote steht im Markdown-Report',
  renderQualityMarkdown(r, '15.07.2026').includes(`**Vorgänge mit Fläche (properties.area):** ${r.mitFlaeche} von ${r.total}`)
);
// A-12/E6 — Vorgänge, die erst später beginnen. Der WFS liefert bisher nur
// laufende Vorgänge; deshalb war der frühere Zeitraumfilter „Bald geplant" in
// allen 86 Snapshots leer. Ändert sich die Quelle, muss es in data/QUALITY.md
// sichtbar werden statt unbemerkt zu bleiben. V6 beginnt am 01.08. (now =
// 15.07.), ist also der Fall.
check('später beginnend erkannt', r.dateIssues.startetSpaeter.length === 1);
check(
  'später beginnend steht im Markdown-Report',
  renderQualityMarkdown(r, '15.07.2026').includes('beginnt erst später (von in der Zukunft, zum Build-Zeitpunkt)')
);
// Beobachtung, kein Mangel: die problems-Summe darf sich davon NICHT bewegen —
// dieselbe Trennung wie bei hasArea (A-7/E9). Zwei Datensätze, die sich nur um
// einen später beginnenden Vorgang unterscheiden, müssen dieselbe Zahl liefern.
const problemsOf = (rep) => Number(/(\d+) Feld-\/Datenauffälligkeiten/.exec(summarizeQuality(rep))[1]);
const ohneZukunft = analyzeQuality([rec({})], stats, now);
const mitZukunft = analyzeQuality([rec({}), rec({ vorgang: 'VZ', von: '2027-01-01', bis: '2027-06-01' })], stats, now);
check('später beginnend erhöht die problems-Summe nicht', problemsOf(ohneZukunft) === problemsOf(mitZukunft));
check('… und wird trotzdem gezählt', mitZukunft.dateIssues.startetSpaeter.length === 1);
// Der heutige Normalfall: keiner beginnt später, der Block sagt „keine".
check('sauberer Datensatz -> niemand beginnt später', ohneZukunft.dateIssues.startetSpaeter.length === 0);

check('Sperrung-Werte aggregiert', r.sperrungWerte.some((w) => w.wert === 'mit Verkehrsbehinderung'));
check('summarizeQuality liefert Text', typeof summarizeQuality(r) === 'string' && summarizeQuality(r).length > 0);
check('renderQualityMarkdown enthält Überschrift', renderQualityMarkdown(r, '15.07.2026').startsWith('# Datenqualitäts-Report'));
// Sauberer Datensatz -> keine Auffälligkeiten
const clean = analyzeQuality([rec({})], { raw: 2, ka: 1, deduped: 1, skipped: 0 }, now);
check('sauberer Datensatz -> keine fehlenden Pflichtfelder', clean.missing.von.length === 0 && clean.missing.bis.length === 0);
// Ein Datensatz ganz ohne Flächen ist kein Fehlerfall (Punkt-Only ist das
// bisherige Verhalten) — die Quote muss ihn nur korrekt als 0 ausweisen.
const flaechenlos = analyzeQuality([rec({ hasArea: false })], { raw: 2, ka: 1, deduped: 1, skipped: 0 }, now);
check('Datensatz ohne Flächen -> Quote 0', flaechenlos.mitFlaeche === 0 && flaechenlos.ohneFlaeche.length === 1);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Quality-Tests bestanden.');
