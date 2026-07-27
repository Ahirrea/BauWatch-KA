// i18n.js — UI-string dictionary for the DE/EN language switch (A-5).
//
// Pure, DOM-free, dependency-free — imported by the browser client only
// (same constraint as format.js). Holds the interactive-app-shell strings;
// format.js keeps its own small date-phrase table (E4 in A-5) rather than
// importing from here.

export const DEFAULT_LANG = 'de';
export const LANGS = ['de', 'en'];

export const STRINGS = {
  de: {
    docTitle: 'Wo wird gebaut? — Baustellen in Karlsruhe',
    metaDescription:
      'Bürgernahe Karte und Liste der offenen Baustellen in Karlsruhe. Betrifft mich das — auf meinem Weg, mit meinem Verkehrsmittel, in meinem Zeitraum?',
    skipLink: 'Zur Baustellen-Liste springen',
    h1: 'Wo wird gebaut?',
    tagline: 'Offene Baustellen in Karlsruhe — betrifft mich das?',

    updateBannerText: 'Neue Version verfügbar.',
    updateBannerButton: 'Neu laden',

    searchAriaLabel: 'Adresssuche',
    searchInputLabel: 'Adresse in Karlsruhe',
    searchPlaceholder: 'Adresse in Karlsruhe (z. B. Kaiserstraße 1)',
    searchButton: 'Umkreis suchen',
    searchReset: 'Zurücksetzen',
    searchStatusSearching: 'Adresse wird gesucht …',
    searchStatusNotFound: 'Adresse in Karlsruhe nicht gefunden. Bitte genauer angeben.',
    searchStatusResult: 'Umkreis {km} km um „{label}".',
    searchStatusError: 'Adresssuche gerade nicht möglich. Bitte später erneut versuchen.',
    searchOfflineHint: 'Adresssuche braucht Internet.',

    filtersAriaLabel: 'Filter',
    filterZeitraumAriaLabel: 'Zeitraum',
    filterZeitraumLabel: 'Zeitraum',
    filterHeute: 'Heute aktiv',
    filterWoche: 'Diese Woche',
    filterGeplant: 'Bald geplant',
    filterAlle: 'Alle',

    filterAmpelAriaLabel: 'Sperrgrad',
    filterAmpelLabel: 'Sperrgrad',
    filterVoll: 'Voll',
    filterTeil: 'Teil',
    filterGering: 'Gering',

    filterVerkehrsmittelAriaLabel: 'Verkehrsmittel',
    filterVerkehrsmittelLabel: 'Verkehrsmittel',
    filterFuss: 'zu Fuß',
    filterRad: 'Rad',
    filterAuto: 'Auto',
    filterOepnv: 'ÖPNV',

    mapAriaLabel: 'Karte der Baustellen in Karlsruhe',
    listAriaLabel: 'Baustellen-Liste',

    listStatusLoading: 'Baustellen werden geladen …',
    listStatusEmptyFilters: 'Keine Baustellen für diese Filter. Filter lockern oder „Alle" wählen.',
    listStatusEmptySearch: 'Keine Baustellen im Umkreis von {km} km um „{label}" mit diesen Filtern.',
    listStatusCountOne: '1 Baustelle',
    listStatusCountMany: '{n} Baustellen',
    listStatusSearchSuffix: ' · Umkreis um „{label}"',
    listStatusNoData: 'Zurzeit sind keine Baustellendaten vorhanden.',
    listStatusLoadError: 'Die Baustellendaten konnten nicht geladen werden. Bitte Seite neu laden.',

    standLoading: 'wird geladen …',
    standUnavailable: 'nicht verfügbar',
    standUnknown: 'unbekannt',
    standLabel: 'Daten zuletzt geändert:',
    standOffline: '· offline, aus dem Gerätespeicher',
    standHint: '(automatisch alle 4 h geprüft, aktualisiert nur bei Änderungen)',
    sampleDataHint: '⚠ Beispieldaten — noch kein echter Abruf des städtischen WFS-Dienstes.',
    disclaimer: 'Ohne Gewähr. Verbindlich ist ausschließlich die Beschilderung vor Ort.',

    popupVerkehr: 'Verkehr:',
    popupVerursacher: 'Verursacher:',

    whatsNewButton: 'Was ist neu?',
    whatsNewTitle: 'Was ist neu?',
    whatsNewClose: 'Schließen',
    whatsNewWindowNote: 'Änderungen der letzten 30 Tage.',
    whatsNewLoading: 'Wird geladen …',
    whatsNewEmpty: 'Keine Änderungen in den letzten 30 Tagen.',
    whatsNewError: 'Nicht verfügbar (z. B. offline).',
    whatsNewAdded: 'Neu:',
    whatsNewRemoved: 'Entfernt:',
    whatsNewChanged: 'Geändert:',
    whatsNewFirstFillOne: 'Erstbefüllung mit 1 Baustelle.',
    whatsNewFirstFillMany: 'Erstbefüllung mit {n} Baustellen.',
  },
  en: {
    docTitle: 'Where’s it being built? — Construction sites in Karlsruhe',
    metaDescription:
      'A resident-friendly map and list of the open construction sites in Karlsruhe. Does this affect me — on my route, with my mode of transport, in this time period?',
    skipLink: 'Skip to the construction-site list',
    h1: 'Where’s it being built?',
    tagline: 'Open construction sites in Karlsruhe — does this affect me?',

    updateBannerText: 'New version available.',
    updateBannerButton: 'Reload',

    searchAriaLabel: 'Address search',
    searchInputLabel: 'Address in Karlsruhe',
    searchPlaceholder: 'Address in Karlsruhe (e.g. Kaiserstraße 1)',
    searchButton: 'Search radius',
    searchReset: 'Reset',
    searchStatusSearching: 'Searching address …',
    searchStatusNotFound: 'Address in Karlsruhe not found. Please be more specific.',
    searchStatusResult: '{km} km radius around “{label}.”',
    searchStatusError: 'Address search is currently unavailable. Please try again later.',
    searchOfflineHint: 'Address search needs an internet connection.',

    filtersAriaLabel: 'Filters',
    filterZeitraumAriaLabel: 'Time period',
    filterZeitraumLabel: 'Time period',
    filterHeute: 'Active today',
    filterWoche: 'This week',
    filterGeplant: 'Planned soon',
    filterAlle: 'All',

    filterAmpelAriaLabel: 'Closure severity',
    filterAmpelLabel: 'Closure severity',
    filterVoll: 'Full',
    filterTeil: 'Partial',
    filterGering: 'Minor',

    filterVerkehrsmittelAriaLabel: 'Mode of transport',
    filterVerkehrsmittelLabel: 'Mode of transport',
    filterFuss: 'On foot',
    filterRad: 'Bike',
    filterAuto: 'Car',
    filterOepnv: 'Public transit',

    mapAriaLabel: 'Map of construction sites in Karlsruhe',
    listAriaLabel: 'Construction-site list',

    listStatusLoading: 'Loading construction sites …',
    listStatusEmptyFilters: 'No construction sites match these filters. Loosen the filters or choose “All.”',
    listStatusEmptySearch: 'No construction sites within {km} km of “{label}” with these filters.',
    listStatusCountOne: '1 construction site',
    listStatusCountMany: '{n} construction sites',
    listStatusSearchSuffix: ' · within radius of “{label}”',
    listStatusNoData: 'No construction-site data is currently available.',
    listStatusLoadError: 'The construction-site data couldn’t be loaded. Please reload the page.',

    standLoading: 'loading …',
    standUnavailable: 'not available',
    standUnknown: 'unknown',
    standLabel: 'Data last changed:',
    standOffline: '· offline, from device storage',
    standHint: '(checked automatically every 4 h, updated only on changes)',
    sampleDataHint: '⚠ Sample data — no real fetch from the city’s WFS service yet.',
    disclaimer: 'No guarantee of accuracy. Only the on-site signage is legally binding.',

    popupVerkehr: 'Traffic:',
    popupVerursacher: 'Caused by:',

    whatsNewButton: 'What’s new?',
    whatsNewTitle: 'What’s new?',
    whatsNewClose: 'Close',
    whatsNewWindowNote: 'Changes from the last 30 days.',
    whatsNewLoading: 'Loading …',
    whatsNewEmpty: 'No changes in the last 30 days.',
    whatsNewError: 'Not available (e.g. offline).',
    whatsNewAdded: 'Added:',
    whatsNewRemoved: 'Removed:',
    whatsNewChanged: 'Changed:',
    whatsNewFirstFillOne: 'Initial fill with 1 construction site.',
    whatsNewFirstFillMany: 'Initial fill with {n} construction sites.',
  },
};

export const AMPEL_LABEL = {
  de: { voll: 'Vollsperrung', teil: 'Teilsperrung', gering: 'Geringe Behinderung' },
  en: { voll: 'Full closure', teil: 'Partial closure', gering: 'Minor obstruction' },
};

export const VM_LABEL = {
  de: { fuss: 'zu Fuß', rad: 'Rad', auto: 'Auto', oepnv: 'ÖPNV' },
  en: { fuss: 'On foot', rad: 'Bike', auto: 'Car', oepnv: 'Public transit' },
};

/**
 * Replaces `{name}` placeholders in a dictionary string with `params[name]`.
 * @param {string} template
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
