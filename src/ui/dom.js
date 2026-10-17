// dom.js — small DOM helpers shared by the UI modules (A-14/E11).

export function el(id) {
  return document.getElementById(id);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Nur auf Geräten mit echtem Hover verdrahten (A-9/E3): auf Touch-Geräten löst
// ein Tipp synthetische mouseover aus, die bis zum nächsten Tipp kleben — neben
// der echten Auswahl stünde eine zweite, veraltete Hervorhebung. Der Fokus-Pfad
// (E8) hängt bewusst NICHT an diesem Gatter — an einem Touch-Gerät kann eine
// Tastatur hängen.
export function hoverFaehig() {
  return window.matchMedia('(hover: hover)').matches;
}
