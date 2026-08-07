// Testscript für stats.js — Kennzahlen der Ergebnisliste (A-10).
// Ausführen: node scripts/test-stats.mjs (Exit 0 = ok, 1 = Fehler)
//
// Rein, ohne Netz und ohne Browser. Der Bezugszeitpunkt wird immer explizit
// übergeben: eine Kennzahl, die von der Uhr des Testlaufs abhängt, wäre
// irgendwann rot ohne Codeänderung.

import { summarize, ENDET_BALD_TAGE } from '../src/lib/stats.js';

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const NOW = new Date(2026, 7, 7); // 07.08.2026, lokale Mitternacht
const tagePlus = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const feature = (ampel, bis) => ({ properties: { ampel, bis } });

// --- Ampel-Aufschlüsselung --------------------------------------------------

const gemischt = [
  feature('voll', tagePlus(30)),
  feature('voll', tagePlus(30)),
  feature('teil', tagePlus(30)),
  feature('gering', tagePlus(30)),
];
const s = summarize(gemischt, NOW);
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
const nurEineStufe = summarize([feature('teil', null), feature('teil', null)], NOW);
check(
  'homogene Liste: eine Stufe trägt alles, die anderen sind 0',
  nurEineStufe.teil === 2 && nurEineStufe.voll === 0 && nurEineStufe.gering === 0
);

// --- „endet bald": Grenzen --------------------------------------------------

check('Schwelle ist 7 Tage (deckt sich mit „Diese Woche")', ENDET_BALD_TAGE === 7);

const grenzfaelle = [
  ['endet heute (0 Tage) zählt', tagePlus(0), true],
  ['1 Tag zählt', tagePlus(1), true],
  ['genau 7 Tage zählt', tagePlus(ENDET_BALD_TAGE), true],
  ['8 Tage zählt nicht', tagePlus(ENDET_BALD_TAGE + 1), false],
  ['weit in der Zukunft zählt nicht', tagePlus(365), false],
  ['abgelaufen zählt nicht', tagePlus(-1), false],
  ['ohne Enddatum (null) zählt nicht', null, false],
  ['leeres Enddatum zählt nicht', '', false],
];
for (const [name, bis, erwartet] of grenzfaelle) {
  const r = summarize([feature('voll', bis)], NOW);
  check(name, r.endetBald === (erwartet ? 1 : 0), `endetBald=${r.endetBald}`);
}

// Gemischte Liste: nur die passenden werden gezählt, total bleibt vollständig.
const mix = summarize(
  [feature('voll', tagePlus(3)), feature('teil', tagePlus(90)), feature('gering', null)],
  NOW
);
check('endetBald zählt nur die betroffenen', mix.endetBald === 1, `endetBald=${mix.endetBald}`);
check('endetBald ändert total nicht', mix.total === 3);

// --- Randfälle und Robustheit ----------------------------------------------

const leer = summarize([], NOW);
check(
  'leere Liste -> alles 0',
  leer.total === 0 && leer.voll === 0 && leer.teil === 0 && leer.gering === 0 && leer.endetBald === 0
);

const keineListe = summarize(undefined, NOW);
check('undefined statt Liste -> alles 0, kein Wurf', keineListe.total === 0);

// Unerwartete Ampelstufe: nicht in einen falschen Topf zählen, nicht werfen.
// Dann stimmt die Summe bewusst nicht mehr — sichtbar statt still verfälscht.
const unbekannt = summarize([feature('lila', null), feature('voll', null)], NOW);
check(
  'unbekannte Ampelstufe wird ignoriert statt falsch einsortiert',
  unbekannt.total === 2 && unbekannt.voll === 1 && unbekannt.teil === 0 && unbekannt.gering === 0
);

const ohneProperties = summarize([{}, { properties: null }], NOW);
check('Feature ohne properties -> kein Wurf', ohneProperties.total === 2 && ohneProperties.voll === 0);

// --- Reinheit: keine DOM-/npm-Abhängigkeit ----------------------------------
// (dieselbe harte Zusicherung wie für die übrigen src/lib/-Module)

const quelle = await import('node:fs').then(({ readFileSync }) =>
  readFileSync(new URL('../src/lib/stats.js', import.meta.url), 'utf8')
);
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
