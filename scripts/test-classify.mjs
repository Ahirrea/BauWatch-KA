// Testscript für classify.js — art-Klartext, Sperrgrad-Ampel, Verkehrsmittel.
// Ausführen: node scripts/test-classify.mjs (Exit 0 = ok, 1 = Fehler)

import { classifyArt, classifySperrgrad, classifyVerkehrsmittel } from '../src/lib/classify.js';

let failed = 0;
function check(name, cond) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}`);
  if (!cond) failed++;
}

// --- classifyArt: reale Kategorien werden als Klartext übernommen ---
for (const v of [
  'Straßenbau', 'Strom bzw. TK-Versorgung', 'Fernwärmeversorgung',
  'Bauliche Sondernutzung', 'Stützwand', 'Kraneinsatz', 'Abbruch/Rückbau',
]) {
  const r = classifyArt(v);
  check(`art "${v}" -> known & unverändert`, r.known === true && r.label === v);
}
// Kryptischer Code -> Fallback, sichtbar
const k = classifyArt('K12');
check('art "K12" -> Fallback, known=false', k.known === false && k.label === 'Baustelle (K12)');
// Leerwert
check('art "" -> Baustelle', classifyArt('').label === 'Baustelle');

// --- classifySperrgrad ---
check('Vollsperrung -> voll', classifySperrgrad('Vollsperrung der Fahrbahn').level === 'voll');
check('halbseitig gesperrt -> teil', classifySperrgrad('Gehweg halbseitig gesperrt').level === 'teil');
check('bloßes "gesperrt" nicht automatisch voll', classifySperrgrad('Radweg gesperrt').level !== 'voll');
check('neutraler Text -> gering', classifySperrgrad('Bauliche Sondernutzung').level === 'gering');
// Amtliches Feld `sperrung`
check('sperrung "mit Verkehrsbehinderung" -> teil', classifySperrgrad('mit Verkehrsbehinderung').level === 'teil');
check('sperrung "ohne Verkehrsbehinderung" -> gering', classifySperrgrad('ohne Verkehrsbehinderung').level === 'gering');
check('sperrung "Vollsperrung" -> voll', classifySperrgrad('Vollsperrung').level === 'voll');

// --- classifyVerkehrsmittel ---
check('Gehweg -> fuss', classifyVerkehrsmittel('Gehweg gesperrt').fuss === true);
check('Bus -> oepnv', classifyVerkehrsmittel('Buslinie umgeleitet').oepnv === true);
check('Fahrbahn -> auto', classifyVerkehrsmittel('Fahrbahn verengt').auto === true);
check('kein Hinweis -> Auto-Fallback', classifyVerkehrsmittel('Bauliche Sondernutzung').auto === true);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Classify-Tests bestanden.');
