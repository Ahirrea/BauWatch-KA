// feature-html.js — what one construction site says about itself, as popup
// and as list entry. Split out of app.js in A-14/E11; markup unchanged.

import { restdauer, formatRange } from '../lib/format.js';
import { AMPEL_LABEL, VM_LABEL } from '../lib/i18n.js';
import { state } from './state.js';
import { escapeHtml } from './dom.js';
import { str } from './text.js';

const dotClass = (ampel) => (ampel === 'voll' ? 'red' : ampel === 'teil' ? 'amber' : 'green');

export function popupHtml(f) {
  const p = f.properties;
  const lang = state.lang;
  const vmLabel = VM_LABEL[lang];
  const ampelLabel = AMPEL_LABEL[lang];
  const rest = restdauer(p.bis, undefined, lang);
  const vms = Object.keys(vmLabel)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => vmLabel[k])
    .join(', ');
  return `
    <div class="popup-title">
      <span class="dot dot-${dotClass(p.ampel)}"></span>
      ${escapeHtml(p.titel)}
    </div>
    <div>${escapeHtml(ampelLabel[p.ampel] || p.art)}${p.district ? ` · ${escapeHtml(p.district)}` : ''}</div>
    ${p.info ? `<div>${escapeHtml(p.info)}</div>` : ''}
    <div><strong>${escapeHtml(rest.text)}</strong> · ${escapeHtml(formatRange(p.von, p.bis, lang))}</div>
    <div>${escapeHtml(str('popupVerkehr'))} ${escapeHtml(vms || '–')}</div>
    ${p.verursacher ? `<div>${escapeHtml(str('popupVerursacher'))} ${escapeHtml(p.verursacher)}</div>` : ''}
  `;
}

export function listItemHtml(f) {
  const p = f.properties;
  const lang = state.lang;
  const vmLabel = VM_LABEL[lang];
  const ampelLabel = AMPEL_LABEL[lang];
  const rest = restdauer(p.bis, undefined, lang);
  const dist =
    f._dist != null
      ? `<span class="badge badge-dist">${f._dist.toFixed(1)} km</span>`
      : '';
  const vms = Object.keys(vmLabel)
    .filter((k) => p.verkehrsmittel?.[k])
    .map((k) => `<span class="badge">${escapeHtml(vmLabel[k])}</span>`)
    .join('');
  return `
    <button type="button" class="list-item-btn">
      <span class="item-title">
        <span class="dot dot-${dotClass(p.ampel)}" aria-hidden="true"></span>
        ${escapeHtml(p.titel)}
      </span>
      <span class="item-meta">
        <span class="item-restdauer ${rest.expired ? 'expired' : ''}">${escapeHtml(rest.text)}</span>
        · ${escapeHtml(ampelLabel[p.ampel] || p.art)}
        ${p.district ? '· ' + escapeHtml(p.district) : ''}
        ${p.verursacher ? '· ' + escapeHtml(p.verursacher) : ''}
      </span>
      <span class="item-badges">${dist}${vms}</span>
    </button>
  `;
}
