// pwa.js — service-worker registration and the update banner (A-3), split out
// of app.js in A-14/E11.
//
// Progressive Enhancement: nichts in der App hängt am Service Worker. Fehlt er
// (Privatmodus, file://, alter Browser), verhält sich die Seite exakt wie ohne.

import { el } from './dom.js';
import { str } from './text.js';

let reloadErlaubt = false; // Guard gegen Reload-Schleife: nur nach Nutzerklick
let reloadLaeuft = false;

function zeigeUpdateBanner(worker) {
  const banner = el('update-banner');
  if (!banner || banner.dataset.gezeigt === 'ja') return;
  banner.dataset.gezeigt = 'ja';

  const text = document.createElement('span');
  text.textContent = str('updateBannerText');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = str('updateBannerButton');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    reloadErlaubt = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
  banner.append(text, btn);
  banner.classList.add('is-visible');
}

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // Ein wartender Worker kann schon beim Laden bereitstehen.
      const pruefe = (worker) => {
        if (!worker) return;
        const check = () => {
          // Nur mit vorhandenem controller ist es ein *Update* und keine
          // Erstinstallation — sonst würde das Banner beim ersten Besuch kommen.
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            zeigeUpdateBanner(worker);
          }
        };
        check();
        worker.addEventListener('statechange', check);
      };

      pruefe(reg.waiting);
      pruefe(reg.installing);
      reg.addEventListener('updatefound', () => pruefe(reg.installing));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloadErlaubt || reloadLaeuft) return;
        reloadLaeuft = true;
        location.reload();
      });
    } catch (err) {
      // Still: eine fehlgeschlagene Registrierung darf die Seite nicht stören.
      console.warn('Service Worker nicht registriert:', err);
    }
  });
}
