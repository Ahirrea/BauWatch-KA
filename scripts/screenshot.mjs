// screenshot.mjs — erzeugt die Screenshots für den Showcase-Eintrag im
// Transparenzportal (siehe docs/showcase-einreichung.md).
//
// Bewusst KEIN Teil von `npm test` und KEIN Teil der GitHub-Action — wie
// render-icons.mjs ein manuelles Werkzeug. Die Bilder sind committete Assets, die
// nur bei sichtbaren UI-Änderungen neu entstehen müssen:
//
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # falls node_modules fehlt
//   node scripts/screenshot.mjs
//
// **Braucht Netzugriff auf OpenStreetMap-Kacheln.** Ohne Kacheln bleibt die
// Kartenfläche grau — für einen Showcase-Eintrag unbrauchbar. Deshalb zählt das
// Skript die geladenen Kacheln und **bricht ab**, statt still ein graues Bild zu
// schreiben (`--erlaube-graue-karte` überstimmt das bewusst). In Umgebungen ohne
// Egress zu OSM: Network-Policy auf „Custom" mit *.tile.openstreetmap.org
// (siehe CLAUDE.md, Abschnitt Web-/Mobile-Workflow).
//
// Kachel-Spiegel: Manche Sandbox-Allowlists kennen nur die alten
// Subdomains (a./b./c.tile.openstreetmap.org), nicht den heute üblichen Host
// tile.openstreetmap.org, den die App verwendet. Ist der Host der App nicht
// erreichbar, ein Spiegel aber doch, holt das Skript die Kacheln von dort und
// sagt es im Log. Es ist derselbe Dienst, nur ein anderer Hostname — die App
// selbst bleibt unangetastet (kein Zurückrüsten auf die veralteten Subdomains
// nur für einen Screenshot).

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8129;
const ERLAUBE_GRAU = process.argv.includes('--erlaube-graue-karte');

// Zwei Formate: das Portal zeigt ein Vorschaubild (Desktop), die Mobilansicht
// belegt das Versprechen „auf dem Handy in 30 Sekunden" aus docs/PRD.md.
const VARIANTEN = [
  { datei: 'docs/showcase/screenshot.png', breite: 1440, hoehe: 900, skalierung: 1 },
  { datei: 'docs/showcase/screenshot-mobil.png', breite: 390, hoehe: 844, skalierung: 1 },
];

function chromiumPfad() {
  const basis = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const treffer = readdirSync(basis)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort();
  if (treffer.length === 0) throw new Error(`Kein Chromium unter ${basis} gefunden.`);
  return join(basis, treffer.at(-1), 'chrome-linux/chrome');
}

const KACHEL_HOST = 'tile.openstreetmap.org'; // wie in src/app.js
const SPIEGEL = ['a.tile.openstreetmap.org', 'b.tile.openstreetmap.org'];
// OSM-Kachel-Nutzungsrichtlinie: identifizierender User-Agent.
const UA = 'BauWatch-KA-Screenshot/1.0 (+https://github.com/Ahirrea/BauWatch-KA)';

async function erreichbar(host) {
  try {
    const res = await fetch(`https://${host}/13/4283/2777.png`, { headers: { 'User-Agent': UA } });
    return res.ok;
  } catch {
    return false;
  }
}

// Nur spiegeln, wenn der Host der App wirklich nicht erreichbar ist.
let spiegelHost = null;
if (!(await erreichbar(KACHEL_HOST))) {
  for (const host of SPIEGEL) {
    if (await erreichbar(host)) {
      spiegelHost = host;
      break;
    }
  }
  console.log(
    spiegelHost
      ? `${KACHEL_HOST} nicht erreichbar (Egress-Policy) — Kacheln über den Spiegel ${spiegelHost}.`
      : `${KACHEL_HOST} nicht erreichbar und kein Spiegel verfügbar.`
  );
}

// Eigener Server: die Seite nutzt ES-Module, über file:// lädt sie nicht.
const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
  cwd: ROOT,
  stdio: 'ignore',
});
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
await warte(1500);

const browser = await chromium.launch({ executablePath: chromiumPfad(), args: ['--no-sandbox'] });
let kachelnGesamt = 0;

try {
  for (const { datei, breite, hoehe, skalierung } of VARIANTEN) {
    const page = await browser.newPage({
      viewport: { width: breite, height: hoehe },
      deviceScaleFactor: skalierung,
      colorScheme: 'light', // Portal-Umfeld ist hell — nicht dem Runner überlassen
    });

    let kacheln = 0;
    if (spiegelHost) {
      await page.route(`**://${KACHEL_HOST}/**`, async (route) => {
        try {
          const url = route.request().url().replace(KACHEL_HOST, spiegelHost);
          const res = await fetch(url, { headers: { 'User-Agent': UA } });
          if (!res.ok) return route.abort();
          kacheln++;
          route.fulfill({
            status: 200,
            contentType: res.headers.get('content-type') || 'image/png',
            body: Buffer.from(await res.arrayBuffer()),
          });
        } catch {
          route.abort();
        }
      });
    } else {
      page.on('response', (res) => {
        if (res.url().includes(KACHEL_HOST) && res.ok()) kacheln++;
      });
    }

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#liste li'); // Daten sind da
    // Kacheln nachladen lassen; networkidle ist bei Leaflet unzuverlässig.
    await page.waitForTimeout(4000);

    mkdirSync(join(ROOT, dirname(datei)), { recursive: true });
    writeFileSync(join(ROOT, datei), await page.screenshot());
    await page.close();

    kachelnGesamt += kacheln;
    console.log(`${datei} — ${breite}×${hoehe} @${skalierung}x, ${kacheln} Kachel(n) geladen`);
  }
} finally {
  await browser.close();
  server.kill();
}

if (kachelnGesamt === 0) {
  const hinweis =
    '\nKEINE Kartenkachel geladen — die Karte ist auf den Bildern grau.\n' +
    'Für den Showcase-Eintrag unbrauchbar. Egress zu tile.openstreetmap.org freigeben\n' +
    '(Network-Policy „Custom", siehe CLAUDE.md) und erneut laufen lassen.\n' +
    'Bewusst trotzdem behalten: node scripts/screenshot.mjs --erlaube-graue-karte';
  if (!ERLAUBE_GRAU) {
    console.error(hinweis);
    process.exit(1);
  }
  console.warn(`${hinweis}\n(--erlaube-graue-karte gesetzt — Bilder bleiben stehen.)`);
}

console.log('\nScreenshots erzeugt.');
