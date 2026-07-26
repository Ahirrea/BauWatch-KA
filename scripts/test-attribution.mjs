// Testscript für die Namensnennung (CC-BY 4.0).
// Ausführen: node scripts/test-attribution.mjs (Exit 0 = ok, 1 = Fehler)
//
// Reines Node, KEIN Netz, kein Browser.
//
// Warum ein eigener Test: Die Namensnennung ist **Lizenzbedingung**, kein
// Feinschliff. Sie war früher leer im HTML und wurde erst von setFooter() nach
// dem Datenabruf eingefügt — sichtbar im Browser, aber nicht im ausgelieferten
// Dokument. Wer nur die Seite anschaut, merkt den Unterschied nie; wer die
// Lizenzkonformität prüft (Quelltext, kein JS, fehlgeschlagener Datenabruf,
// Textbrowser), sieht keine Nennung. Genau das prüft dieser Test:
//   - die Nennung steht statisch in index.html (nicht leer, nicht per JS)
//   - src/app.js überschreibt sie nicht mehr
//   - ihr Text bleibt wortgleich mit ATTRIBUTION in scripts/build-data.mjs
//     (sonst driften Datei-Metadaten und Footer auseinander)

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const lies = (p) => readFileSync(join(ROOT, p), 'utf8');

const html = lies('index.html');
const app = lies('src/app.js');
const build = lies('scripts/build-data.mjs');

// --- Die Nennung steht statisch im HTML ------------------------------------

// Absatz mit id="attribution" aus dem Footer holen (Attribut-Reihenfolge egal).
const absatz = html.match(/<p[^>]*id="attribution"[^>]*>([\s\S]*?)<\/p>/);
check('index.html hat den Absatz id="attribution"', Boolean(absatz));

// Sichtbarer Text: Tags entfernen, die im Projekt genutzten Entities auflösen,
// Whitespace/Zeilenumbrüche des Quelltexts zu je einem Leerzeichen normalisieren.
const nurText = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const text = absatz ? nurText(absatz[1]) : '';
check('Namensnennung ist im ausgelieferten HTML nicht leer', text.length > 0, `gefunden: "${text}"`);

// Die drei Pflichtbestandteile einer CC-BY-Nennung: Werk, Urheber, Lizenz.
for (const teil of ['Baustellen', 'Stadt Karlsruhe', 'CC-BY 4.0']) {
  check(`Nennung enthält „${teil}"`, text.includes(teil), `gefunden: "${text}"`);
}

// Verlinkung: Lizenztext und Datensatz im Portal. Für CC-BY genügt der
// Lizenzhinweis, der Portal-Link macht die Quelle nachprüfbar (und ist die
// Verknüpfung, über die das Transparenzportal den Datensatz-Bezug herstellt).
const absatzHtml = absatz ? absatz[1] : '';
check(
  'Nennung verlinkt den Lizenztext (creativecommons.org)',
  /creativecommons\.org\/licenses\/by\/4\.0/.test(absatzHtml)
);
check(
  'Nennung verlinkt den Datensatz im Transparenzportal',
  /transparenz\.karlsruhe\.de\/dataset\/baustellen/.test(absatzHtml)
);

// --- app.js darf die statische Nennung nicht überschreiben -----------------

// Der Rückfall in den alten Fehler wäre ein Schreibzugriff auf #attribution.
// Der Zusatz für Beispieldaten läuft bewusst über die eigene id
// „attribution-hinweis" — deshalb hier auf das genaue Argument prüfen.
check(
  "app.js schreibt nicht in el('attribution')",
  !/el\('attribution'\)\s*\.\s*(textContent|innerHTML|innerText)/.test(app),
  'die statische Nennung würde nach dem Laden überschrieben'
);
check(
  'app.js pflegt den Beispieldaten-Hinweis separat',
  /el\('attribution-hinweis'\)/.test(app)
);
check(
  'index.html hat den Absatz id="attribution-hinweis"',
  /id="attribution-hinweis"/.test(html)
);

// --- Gleichlaut mit dem Build-Skript ---------------------------------------

// ATTRIBUTION landet als Feld „attribution" in data/baustellen.geojson. Footer
// und Datei müssen dasselbe sagen, sonst behauptet die Seite etwas anderes als
// der Datensatz, den sie ausliefert.
const attrConst = build.match(/const ATTRIBUTION\s*=\s*\n?\s*'([^']+)'/);
check('scripts/build-data.mjs definiert ATTRIBUTION', Boolean(attrConst));

if (attrConst) {
  const erwartet = `Datenquelle: ${attrConst[1]}`;
  check(
    'Footer-Nennung ist wortgleich mit ATTRIBUTION aus dem Build',
    text === erwartet,
    `HTML: "${text}" ≠ Build: "${erwartet}"`
  );
}

// Der Datenschnappschuss selbst führt dasselbe Feld — mitprüfen, solange er da ist.
try {
  const daten = JSON.parse(lies('data/baustellen.geojson'));
  if (attrConst && daten.attribution) {
    check(
      'data/baustellen.geojson trägt dieselbe Namensnennung',
      daten.attribution === attrConst[1],
      `Datei: "${daten.attribution}"`
    );
  }
} catch (err) {
  check('data/baustellen.geojson ist lesbares JSON', false, err.message);
}

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Namensnennungs-Tests bestanden.');
