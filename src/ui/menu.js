// menu.js — the ☰ menu (A-14/E6): language, colour scheme, background on the
// data, links. A native <dialog> opened with showModal(): focus trap, top
// layer and Escape come with it. The toggles inside are wired by text.js and
// theme.js; this module only opens and closes the dialog.

import { el } from './dom.js';

export function wireMenu() {
  const btn = el('menu-btn');
  const dialog = el('menu');
  if (!btn || !dialog) return;

  btn.addEventListener('click', () => dialog.showModal());

  // Backdrop click closes, same as Escape. ::backdrop itself can't carry a
  // click handler, so this compares the click point against the dialog's own
  // box — a click landing outside it is a backdrop click.
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  // Fires for every close path (Escape, the ✕ button's form-submit, backdrop
  // click above) — one place to return focus to the trigger.
  dialog.addEventListener('close', () => btn.focus());
}
