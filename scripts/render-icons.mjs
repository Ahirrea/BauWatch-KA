// render-icons.mjs — rendert die App-Icons einmalig aus icons/icon.svg (Anforderung A-3).
//
// Bewusst KEIN Teil von `npm test` und KEIN Teil der GitHub-Action: die PNGs sind
// committete statische Assets, kein Build-Artefakt. Dieses Skript existiert nur,
// damit sie nach einer Änderung an icon.svg reproduzierbar neu entstehen:
//
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # falls node_modules fehlt
//   node scripts/render-icons.mjs
//
// Nutzt das im Platform-Image vorhandene Chromium über playwright-core (reines
// Dev-Werkzeug, keine Laufzeit-Abhängigkeit — wie proj4 beim Transform-Test).

import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = readFileSync(join(ROOT, 'icons/icon.svg'), 'utf8');

// `rx` am Hintergrund entscheidet über die Variante:
//   abgerundet (rx=72) → die „any"-Icons, Ecken transparent
//   vollflächig (rx=0) → maskable (Plattform maskiert selbst) und Apple
//                        (iOS rundet selbst und rendert Alpha schwarz)
const VARIANTEN = [
  { datei: 'icons/icon-192.png', groesse: 192, vollflaechig: false },
  { datei: 'icons/icon-512.png', groesse: 512, vollflaechig: false },
  { datei: 'icons/icon-512-maskable.png', groesse: 512, vollflaechig: true },
  { datei: 'icons/apple-touch-icon.png', groesse: 180, vollflaechig: true },
];

function chromiumPfad() {
  const basis = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const treffer = readdirSync(basis)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort();
  if (treffer.length === 0) throw new Error(`Kein Chromium unter ${basis} gefunden.`);
  return join(basis, treffer.at(-1), 'chrome-linux/chrome');
}

const browser = await chromium.launch({
  executablePath: chromiumPfad(),
  args: ['--no-sandbox'],
});

try {
  for (const { datei, groesse, vollflaechig } of VARIANTEN) {
    const svg = vollflaechig ? SVG.replace('rx="72"', 'rx="0"') : SVG;
    const page = await browser.newPage({
      viewport: { width: groesse, height: groesse },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:100vw;height:100vh}</style>${svg}`
    );
    const png = await page.screenshot({ omitBackground: !vollflaechig });
    writeFileSync(join(ROOT, datei), png);
    await page.close();
    console.log(`${datei} — ${groesse}×${groesse}${vollflaechig ? ' (vollflächig)' : ''}`);
  }
} finally {
  await browser.close();
}

console.log('\nIcons gerendert. Nicht vergessen: CACHE_SHELL in sw.js hochzählen.');
