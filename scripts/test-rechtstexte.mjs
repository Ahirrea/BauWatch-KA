// Testscript für die Rechtstexte (Anforderung A-4): Impressum & Datenschutzhinweis.
// Ausführen: node scripts/test-rechtstexte.mjs (Exit 0 = ok, 1 = Fehler)
//
// Reines Node, KEIN Netz, kein Browser.
//
// Warum ein eigener Test — dieselbe Logik wie bei test-attribution.mjs: Der
// Datenschutzhinweis ist eine **Aussage über den Code**. Aussagen über Code
// veralten, sobald der Code sich ändert, und niemand merkt es, weil die Seite
// weiterhin gut aussieht. Ein unvollständiger Datenschutzhinweis ist dann nicht
// nur lückenhaft, sondern schlicht falsch.
//
// Abgesichert werden deshalb vier Dinge:
//   1. Struktur — beide Seiten existieren, sind verlinkt, relativ gepfadet,
//      ohne JavaScript nutzbar (E6) und haben die Pflichtabschnitte.
//   2. Drift „Code → Text": JEDER externe Host, der in src/*.js vorkommt, muss
//      im Datenschutzhinweis genannt sein. Baut jemand einen Drittdienst ein
//      (z. B. routing.openstreetmap.de bei A-1), wird npm test rot.
//   3. Drift „Text → Code": Der Hinweis behauptet „keine Cookies, kein
//      Tracking, keine Speicherung". Sobald localStorage, Cookies o. Ä. im
//      Frontend auftauchen, ist diese Behauptung unwahr — auch das wird rot.
//   4. Der Kontakt-Platzhalter darf nicht heimlich dauerhaft werden.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
let warnungen = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}
// Bewusst nicht-fatal: für Zustände, die heute richtig sind (ein offener Punkt
// ist als offen dokumentiert), aber sichtbar bleiben müssen.
function warn(name, detail) {
  console.log(`[WARN] ${name}${detail ? ` — ${detail}` : ''}`);
  warnungen++;
}

const lies = (p) => readFileSync(join(ROOT, p), 'utf8');
const nurText = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&larr;/g, '←')
    .replace(/\s+/g, ' ')
    .trim();

const SEITEN = ['impressum.html', 'datenschutz.html'];

// --- 1. Existenz und Verlinkung --------------------------------------------

for (const seite of SEITEN) {
  check(`${seite} existiert`, existsSync(join(ROOT, seite)));
}
if (SEITEN.some((s) => !existsSync(join(ROOT, s)))) {
  console.error('\nOhne die Rechtstexte kann der Rest nicht geprüft werden.');
  process.exit(1);
}

const index = lies('index.html');
const impressum = lies('impressum.html');
const datenschutz = lies('datenschutz.html');

// Aus dem Footer heraus verlinkt — nicht irgendwo im Dokument. „Leicht
// erkennbar und unmittelbar erreichbar" heißt: von jeder Seite aus.
const footer = index.match(/<footer[\s\S]*?<\/footer>/);
check('index.html hat einen Footer', Boolean(footer));
for (const seite of SEITEN) {
  check(
    `index.html verlinkt ${seite} im Footer`,
    Boolean(footer) && footer[0].includes(`href="${seite}"`)
  );
}
check('impressum.html verlinkt den Datenschutzhinweis', impressum.includes('href="datenschutz.html"'));
check('datenschutz.html verlinkt das Impressum', datenschutz.includes('href="impressum.html"'));

// --- 2. Sub-Pfad-Falle, JS-Freiheit, Grundgerüst ---------------------------

for (const [seite, html] of [
  ['impressum.html', impressum],
  ['datenschutz.html', datenschutz],
]) {
  const lokal = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => !p.startsWith('#') && !/^[a-z]+:/i.test(p) && !p.startsWith('//'));
  check(
    `${seite}: alle lokalen Pfade relativ (Sub-Pfad /BauWatch-KA/)`,
    lokal.every((p) => !p.startsWith('/')),
    lokal.filter((p) => p.startsWith('/')).join(', ')
  );

  // E6: die Seiten kommen ohne JavaScript aus — auch ohne Service-Worker-
  // Registrierung, denn ohne app.js gibt es hier nichts zu registrieren.
  check(`${seite}: kein <script> (E6, ohne JS nutzbar)`, !/<script[\s>]/i.test(html));

  check(`${seite}: lang="de" gesetzt`, /<html[^>]+lang="de"/.test(html));
  const h1 = [...html.matchAll(/<h1[\s>]/g)];
  check(`${seite}: genau eine <h1>`, h1.length === 1, `${h1.length} gefunden`);

  // Lückenlose Überschriftenhierarchie: nach h1 nur h2, kein Sprung auf h3+.
  const sprung = [...html.matchAll(/<h([3-6])[\s>]/g)].map((m) => m[1]);
  check(`${seite}: keine übersprungene Überschriftenebene`, sprung.length === 0, `h${sprung.join(', h')}`);

  // Rücksprung als erste Tab-Station: der erste Link im <body> führt zur Karte.
  const body = html.slice(html.indexOf('<body'));
  const ersterLink = body.match(/<a[^>]+href="([^"]+)"/);
  check(
    `${seite}: erster Link im Body ist der Rücksprung zur Karte`,
    Boolean(ersterLink) && ersterLink[1] === 'index.html',
    ersterLink ? ersterLink[1] : 'kein Link gefunden'
  );
}

// Tabellen mit Spaltenköpfen statt Layout-Tabellen.
const tabellen = [...datenschutz.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
check('datenschutz.html hat die Datenfluss-Tabelle', tabellen.length > 0);
for (const t of tabellen) {
  check('Tabelle nutzt <th scope="col"> für die Spaltenköpfe', /<th scope="col">/.test(t));
  check('Tabelle hat eine <caption>', /<caption>/.test(t));
}

// --- 3. Pflichtabschnitte ---------------------------------------------------

const impressumText = nurText(impressum);
const datenschutzText = nurText(datenschutz);

const PFLICHT_IMPRESSUM = [
  ['Verantwortliche/r benannt', /Verantwortlich für den Inhalt/i],
  ['Einordnung als privates Bürgerprojekt', /Bürgerprojekt/i],
  ['kein Angebot der Stadt Karlsruhe', /kein Angebot der Stadt Karlsruhe/i],
  ['Haftung für Inhalte', /Haftung für Inhalte/i],
  ['Haftung für Links', /Haftung für Links/i],
  ['Verweis auf die Beschilderung vor Ort', /Beschilderung vor Ort/i],
  ['Lizenz des Quellcodes (MIT)', /MIT-Lizenz/i],
  ['Lizenz der Daten (CC-BY 4.0)', /CC-BY 4\.0/i],
  ['Lizenz der Kartendaten (ODbL)', /ODbL/i],
  ['Link zum Quellcode', /github\.com\/Ahirrea\/BauWatch-KA/i],
];
for (const [name, re] of PFLICHT_IMPRESSUM) {
  check(`impressum.html: ${name}`, re.test(impressumText) || re.test(impressum));
}

const PFLICHT_DATENSCHUTZ = [
  ['Verantwortliche Stelle', /Verantwortliche Stelle/i],
  ['Abschnitt „Was diese Seite nicht tut"', /Was diese Seite nicht tut/i],
  ['Datenflüsse an Dritte', /Datenflüsse an Dritte/i],
  ['Speicherung auf dem eigenen Gerät', /Speicherung auf Ihrem Gerät/i],
  ['Rechtsgrundlage (Art. 6 Abs. 1 lit. f DSGVO)', /Art\. 6 Abs\. 1 lit\. f DSGVO/i],
  ['Betroffenenrechte (Auskunft/Berichtigung/Löschung)', /Auskunft[\s\S]{0,120}Löschung/i],
  ['Widerspruchsrecht', /Widerspruch/i],
  ['Aufsichtsbehörde', /Landesbeauftragte[rn]? für den Datenschutz und die Informationsfreiheit Baden-Württemberg/i],
  ['Beschwerderecht', /beschweren|Beschwerderecht/i],
];
for (const [name, re] of PFLICHT_DATENSCHUTZ) {
  check(`datenschutz.html: ${name}`, re.test(datenschutzText));
}

// „Stand" statisch im HTML, nicht per JS nachgetragen (Lehre aus der
// Namensnennung) — maschinenlesbar als <time datetime="JJJJ-MM-TT">.
const stand = datenschutz.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/);
check('datenschutz.html nennt einen Stand als <time datetime="…">', Boolean(stand), stand?.[1]);

// --- 4. Kontaktangabe -------------------------------------------------------

const mailto = (html) => [...html.matchAll(/mailto:([^"']+)/g)].map((m) => m[1]);
const mailsImpressum = mailto(impressum);
const mailsDatenschutz = mailto(datenschutz);
check('impressum.html nennt eine Kontaktadresse als mailto:', mailsImpressum.length > 0);
check('datenschutz.html nennt eine Kontaktadresse als mailto:', mailsDatenschutz.length > 0);
// E5: ein Kontaktweg, nicht zwei — sonst driften die Seiten auseinander.
check(
  'Impressum und Datenschutzhinweis nennen dieselbe Adresse (E5)',
  new Set([...mailsImpressum, ...mailsDatenschutz]).size === 1,
  [...new Set([...mailsImpressum, ...mailsDatenschutz])].join(' ≠ ')
);

// Der Platzhalter ist erlaubt, SOLANGE die Showcase-Unterlage die Adresse als
// offenen Punkt führt. Wird dort abgehakt, ohne die Seiten nachzuziehen, ist
// der Platzhalter live — und dieser Test rot.
const PLATZHALTER = /@example\.(invalid|com|org|net)$/i;
const istPlatzhalter = [...mailsImpressum, ...mailsDatenschutz].some((m) => PLATZHALTER.test(m));
const showcase = lies('docs/showcase-einreichung.md');
const nochOffen = /- \[ \] Name \+ Kontaktmailadresse/.test(showcase);
if (istPlatzhalter) {
  check(
    'Platzhalter-Adresse ist in der Showcase-Unterlage als offener Punkt geführt',
    nochOffen,
    'Haken gesetzt, aber die Rechtstexte tragen noch den Platzhalter'
  );
  if (nochOffen) {
    warn(
      'Kontaktadresse ist noch ein Platzhalter',
      `${mailsImpressum[0]} — projekteigene Adresse anlegen und in impressum.html, datenschutz.html und docs/showcase-einreichung.md eintragen`
    );
  }
} else {
  check(
    'echte Kontaktadresse eingetragen und in der Showcase-Unterlage abgehakt',
    !nochOffen,
    'Adresse steht auf den Seiten, der offene Punkt in docs/showcase-einreichung.md ist aber noch nicht abgehakt'
  );
}

// --- 5. Drift „Code → Text": externe Hosts --------------------------------

function jsDateien(verzeichnis) {
  const treffer = [];
  for (const eintrag of readdirSync(join(ROOT, verzeichnis))) {
    const rel = `${verzeichnis}/${eintrag}`;
    if (statSync(join(ROOT, rel)).isDirectory()) treffer.push(...jsDateien(rel));
    else if (eintrag.endsWith('.js')) treffer.push(rel);
  }
  return treffer;
}

const frontend = jsDateien('src');
check('Frontend-Quellen gefunden (Absicherung greift)', frontend.length > 0);

const hosts = new Set();
for (const datei of frontend) {
  for (const m of lies(datei).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase());
}
check('externe Hosts im Frontend gefunden (Absicherung greift)', hosts.size > 0);

for (const host of [...hosts].sort()) {
  check(
    `Drittdienst „${host}" ist im Datenschutzhinweis genannt`,
    datenschutz.toLowerCase().includes(host),
    'neuer Drittdienst im Code, aber nicht im Hinweis beschrieben'
  );
}

// Das Hosting selbst taucht in keinem fetch auf, gehört aber in die Tabelle.
check('Hosting (GitHub Pages) ist im Datenschutzhinweis genannt', /GitHub Pages/i.test(datenschutzText));

// --- 6. Drift „Text → Code": die Negativ-Aussagen müssen stimmen -----------
// Der Hinweis behauptet, es gebe keine Cookies und keine Speicherung. Das ist
// heute wahr. A-1 bringt localStorage mit — spätestens dann muss der Text
// mitwachsen, und bis dahin schlägt hier an, wer es vergisst.

const clientCode = frontend.map(lies).join('\n') + lies('index.html');
const SPEICHER = [
  ['Cookies', /document\.cookie/],
  ['localStorage', /localStorage/],
  ['sessionStorage', /sessionStorage/],
  ['IndexedDB', /indexedDB/i],
  ['Standortabfrage', /navigator\.geolocation/],
];
for (const [name, re] of SPEICHER) {
  const imCode = re.test(clientCode);
  const behauptetKeine =
    /keine Cookies/i.test(datenschutzText) && /keine eigene Speicherung personenbezogener Daten/i.test(datenschutzText);
  check(
    `Behauptung deckt sich mit dem Code: ${name}`,
    !imCode || !behauptetKeine,
    `${name} wird im Frontend genutzt, der Datenschutzhinweis behauptet aber das Gegenteil`
  );
}

// Gegenprobe zur Gegenprobe: die Behauptungen stehen auch wirklich drin —
// sonst ginge die Prüfung oben stillschweigend durch.
check('datenschutz.html sagt „keine Cookies"', /keine Cookies/i.test(datenschutzText));
check('datenschutz.html sagt „kein Tracking"', /kein Tracking/i.test(datenschutzText));
check(
  'datenschutz.html sagt „keine eigene Speicherung personenbezogener Daten"',
  /keine eigene Speicherung personenbezogener Daten/i.test(datenschutzText)
);

// --- 7. Die Namensnennung bleibt unberührt ---------------------------------
// Der Footer-Umbau darf die statische CC-BY-Zeile nicht anfassen. Das prüft
// test-attribution.mjs im Detail; hier nur die grobe Anwesenheit, damit ein
// versehentliches Aufräumen im Footer sofort auffällt.
check('index.html hat weiterhin den Absatz id="attribution"', /id="attribution"/.test(index));
check('index.html hat weiterhin den Haftungshinweis', /Beschilderung vor Ort/.test(index));

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`\nAlle Rechtstext-Tests bestanden${warnungen > 0 ? ` (${warnungen} Warnung(en) — siehe oben)` : ''}.`);
