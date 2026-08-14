// Testscript für stats.js — Zahlen in der Filterzeile (A-10, A-12).
// Ausführen: node scripts/test-stats.mjs (Exit 0 = ok, 1 = Fehler)
//
// Rein, ohne Netz und ohne Browser. Der Bezugszeitpunkt wird immer explizit
// übergeben: ein Prädikat, das von der Uhr des Testlaufs abhängt, wäre
// irgendwann rot ohne Codeänderung.

import { readFileSync } from 'node:fs';
import { summarize, endetInnerhalb, ENDET_BALD_TAGE, RESTDAUER_STUFEN } from '../src/lib/stats.js';

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const NOW = new Date(2026, 7, 7); // 07.08.2026, lokale Mitternacht
// Bewusst KEIN toISOString(): das serialisiert UTC und verschiebt den
// Kalendertag in jeder Zeitzone östlich von UTC um -1 (lokal Mitternacht
// 07.08. ist 06.08. 22:00 UTC). Die Grenzfälle unten wären dann in CI (UTC)
// grün und auf einem Rechner in Europa rot.
const tagePlus = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const feature = (ampel, bis) => ({ properties: { ampel, bis } });

// --- Ampel-Aufschlüsselung --------------------------------------------------

const gemischt = [
  feature('voll', tagePlus(30)),
  feature('voll', tagePlus(30)),
  feature('teil', tagePlus(30)),
  feature('gering', tagePlus(30)),
];
const s = summarize(gemischt);
check('total = Länge der Liste', s.total === 4, `total=${s.total}`);
check('voll wird gezählt', s.voll === 2, `voll=${s.voll}`);
check('teil wird gezählt', s.teil === 1, `teil=${s.teil}`);
check('gering wird gezählt', s.gering === 1, `gering=${s.gering}`);
check(
  'Ampelstufen summieren sich auf total',
  s.voll + s.teil + s.gering === s.total,
  `${s.voll}+${s.teil}+${s.gering} != ${s.total}`
);

// Invariante gegen echte Datenformen: classifySperrgrad() hat einen totalen
// Fallback, jedes gebaute Feature trägt also eine der drei Stufen.
const nurEineStufe = summarize([feature('teil', null), feature('teil', null)]);
check(
  'homogene Liste: eine Stufe trägt alles, die anderen sind 0',
  nurEineStufe.teil === 2 && nurEineStufe.voll === 0 && nurEineStufe.gering === 0
);

// summarize() kennt die Restdauer nicht mehr (A-12/E7): die Kennzahl „endet
// bald" ist zum Filter geworden, gezählt wird nur noch nach Ampelstufe.
check('summarize() liefert kein endetBald mehr', !('endetBald' in s), Object.keys(s).join(','));

// --- Restdauer-Prädikat: Grenzen --------------------------------------------

check('kurze Stufe ist 7 Tage (aus A-10/E3 übernommen)', ENDET_BALD_TAGE === 7);
check('zwei Stufen, aufsteigend', RESTDAUER_STUFEN.length === 2 && RESTDAUER_STUFEN[0] < RESTDAUER_STUFEN[1], RESTDAUER_STUFEN.join(','));
check('die kurze Stufe ist ENDET_BALD_TAGE', RESTDAUER_STUFEN[0] === ENDET_BALD_TAGE);

const grenzfaelle = [
  ['endet heute (0 Tage) passt in 7', tagePlus(0), 7, true],
  ['1 Tag passt in 7', tagePlus(1), 7, true],
  ['genau 7 Tage passt in 7', tagePlus(7), 7, true],
  ['8 Tage passt nicht in 7', tagePlus(8), 7, false],
  ['8 Tage passt in 30', tagePlus(8), 30, true],
  ['genau 30 Tage passt in 30', tagePlus(30), 30, true],
  ['31 Tage passt nicht in 30', tagePlus(31), 30, false],
  ['weit in der Zukunft passt nirgends', tagePlus(365), 30, false],
  ['abgelaufen passt nicht (7)', tagePlus(-1), 7, false],
  ['abgelaufen passt nicht (30)', tagePlus(-1), 30, false],
  ['ohne Enddatum (null) passt nicht', null, 30, false],
  ['leeres Enddatum passt nicht', '', 30, false],
];
for (const [name, bis, tage, erwartet] of grenzfaelle) {
  check(name, endetInnerhalb({ bis }, tage, NOW) === erwartet);
}

// ≤ 7 ist eine echte Teilmenge von ≤ 30 — sonst könnte ein Klick auf die
// engere Stufe mehr liefern als die weitere, was niemand erwartet.
const streuung = [-3, 0, 1, 7, 8, 30, 31, 400].map((n) => ({ bis: tagePlus(n) })).concat([{ bis: null }]);
const in7 = streuung.filter((p) => endetInnerhalb(p, 7, NOW));
const in30 = streuung.filter((p) => endetInnerhalb(p, 30, NOW));
check('≤ 7 ist Teilmenge von ≤ 30', in7.every((p) => in30.includes(p)), `${in7.length} / ${in30.length}`);
check('≤ 30 ist echt größer als ≤ 7', in30.length > in7.length, `${in30.length} vs ${in7.length}`);

check('props undefined -> false statt Wurf', endetInnerhalb(undefined, 7, NOW) === false);

// --- Randfälle und Robustheit ----------------------------------------------

const leer = summarize([]);
check('leere Liste -> alles 0', leer.total === 0 && leer.voll === 0 && leer.teil === 0 && leer.gering === 0);

const keineListe = summarize(undefined);
check('undefined statt Liste -> alles 0, kein Wurf', keineListe.total === 0);

// Unerwartete Ampelstufe: nicht in einen falschen Topf zählen, nicht werfen.
// Dann stimmt die Summe bewusst nicht mehr — sichtbar statt still verfälscht.
const unbekannt = summarize([feature('lila', null), feature('voll', null)]);
check(
  'unbekannte Ampelstufe wird ignoriert statt falsch einsortiert',
  unbekannt.total === 2 && unbekannt.voll === 1 && unbekannt.teil === 0 && unbekannt.gering === 0
);

const ohneProperties = summarize([{}, { properties: null }]);
check('Feature ohne properties -> kein Wurf', ohneProperties.total === 2 && ohneProperties.voll === 0);

// --- Anti-Drift: Schwellen stehen auch im Markup ----------------------------
// Dieselbe Logik wie bei THEMES in test-theme.mjs: eine Zahl an zwei Stellen
// driftet still auseinander, wenn sie niemand vergleicht. Ein data-value in
// index.html ohne Entsprechung in RESTDAUER_STUFEN wäre ein Knopf, den
// matchesRestdauer() auf NaN abbildet — sichtbar erst als leere Liste.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gruppe = /<div class="filter-group"[^>]*data-filter="restdauer"[\s\S]*?<\/div>\s*<\/div>/.exec(html);
check('index.html hat eine Filtergruppe data-filter="restdauer"', !!gruppe);
if (gruppe) {
  const werte = [...gruppe[0].matchAll(/data-value="([^"]+)"/g)].map((m) => m[1]);
  check('erster Knopf ist „alle"', werte[0] === 'alle', werte.join(','));
  const stufen = werte.slice(1).map(Number);
  check(
    'Markup-Stufen == RESTDAUER_STUFEN',
    stufen.length === RESTDAUER_STUFEN.length && stufen.every((v, i) => v === RESTDAUER_STUFEN[i]),
    `${stufen.join(',')} != ${RESTDAUER_STUFEN.join(',')}`
  );
}
// Der alte Zeitraumfilter darf nicht zurückbleiben — weder als Gruppe noch als
// Wert, sonst filtert eine tote Achse still weiter (A-12/E1).
check('keine Filtergruppe „zeitraum" mehr', !/data-filter="zeitraum"/.test(html));

// --- Reinheit: keine DOM-/npm-Abhängigkeit ----------------------------------
// (dieselbe harte Zusicherung wie für die übrigen src/lib/-Module)

const quelle = readFileSync(new URL('../src/lib/stats.js', import.meta.url), 'utf8');
check('stats.js nutzt kein document/window', !/\b(document|window)\b/.test(quelle));
check(
  'stats.js importiert nur relativ aus src/lib/',
  [...quelle.matchAll(/from\s+'([^']+)'/g)].every((m) => m[1].startsWith('./'))
);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Kennzahlen-Tests bestanden.');
