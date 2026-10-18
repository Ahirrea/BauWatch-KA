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
    searchPlaceholder: 'Adresse in Karlsruhe suchen',
    searchButton: 'Umkreis suchen',
    searchReset: 'Suche zurücksetzen',
    searchStatusSearching: 'Adresse wird gesucht …',
    searchStatusNotFound: 'Adresse in Karlsruhe nicht gefunden. Bitte genauer angeben.',
    searchStatusResult: 'Umkreis {km} km um „{label}".',
    searchStatusError: 'Adresssuche gerade nicht möglich. Bitte später erneut versuchen.',
    searchOfflineHint: 'Adresssuche braucht Internet.',

    // Colour-scheme switch (A-8). Since A-14/E6 the buttons sit in the menu and
    // carry these as visible labels, inside a group named themeToggleAriaLabel
    // — until then they were icon-only and these were their aria-labels.
    themeToggleAriaLabel: 'Farbschema',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',

    // App shell (A-14): menu, panel, tabs and the sheet handle. The handle's
    // name says what the NEXT press does (E2), so it has three of them.
    menuButton: 'Menü',
    menuClose: 'Menü schließen',
    menuSettings: 'Einstellungen',
    menuLanguage: 'Sprache',
    menuAbout: 'Über die Daten',
    menuMore: 'Mehr',
    tabsAriaLabel: 'Ansicht',
    tabListe: 'Liste',
    tabNeu: 'Neu',
    tabStatistik: 'Statistik',
    // Statistics tab (A-15). Dataset text (art, Verursacher) stays German in
    // both languages (A-5/E3); only this chrome is translated.
    statsScope: 'Alle {n} offenen Baustellen in Karlsruhe — unabhängig von den Filtern der Liste.',
    statsKpiTotal: 'offene Baustellen',
    statsKpiVoll: 'davon Vollsperrungen',
    statsKpiMedian: 'typische Bauzeit (Median)',
    statsKpiBald: 'enden in {n} Tagen',
    statsStackAria: 'Sperrgrad: {voll} Voll, {teil} Teil, {gering} Gering',
    statsArt: 'Was wird gebaut?',
    statsVerursacher: 'Wer baut?',
    statsBetroffen: 'Betroffen',
    statsBetroffenNote: 'Eine Baustelle kann mehrere Verkehrsmittel betreffen.',
    statsRestdauer: 'Wie lange noch?',
    statsBandUpTo: 'bis {n} Tage',
    statsBandDays: '{from}–{to} Tage',
    statsBandMonths: '{from}–{to} Monate',
    statsBandYear: 'über 1 Jahr',
    statsRestOpen: '{n} ohne Enddatum',
    statsRestExpired: '{n} bereits abgelaufen',
    statsLongest: 'Am längsten',
    statsOther: 'Sonstige',
    statsUnknown: 'ohne Angabe',
    statsNoDates: '{n} ohne Datumsangabe',
    statsEmpty: 'Keine offenen Baustellen im Datensatz.',
    statsDays: '{n} Tage',
    statsMonths: '{n} Monate',
    statsYears: '{n} Jahre',
    // A-16: Verlauf
    statsHistory: 'Verlauf',
    statsHistoryNote: 'Seit {from}, je Tag der Stand am Tagesende.',
    statsHistoryHint: 'Zum Ablesen eines Tages auf die Grafik tippen, darüberfahren oder mit den Pfeiltasten wählen.',
    statsHistoryTotal: 'Offene Baustellen',
    statsHistoryVoll: 'davon Vollsperrungen',
    statsHistoryDelta: '{delta} gegenüber vor {days} Tagen',
    statsHistoryExtremes: 'Höchststand {max} am {maxDate} · Tiefststand {min} am {minDate}',
    statsHistoryReadout: '{date}: {total} offen, davon {voll} Vollsperrungen',
    statsHistoryToday: 'heute',
    statsHistoryChartAria: '{title}: {first} am {firstDate}, {last} am {lastDate}; Höchststand {max}, Tiefststand {min}.',
    statsHistoryChartsAria: 'Verlauf; Pfeiltasten wählen einen Tag',
    statsHistoryTable: 'Alle Werte als Tabelle',
    statsHistoryColDate: 'Datum',
    statsHistoryColTotal: 'Offen',
    statsHistoryColVoll: 'Vollsperrungen',
    statsHistoryLoading: 'Verlauf wird geladen …',
    statsHistoryError: 'Verlauf nicht verfügbar.',
    statsHistoryOffline: 'Verlauf aus dem Gerätespeicher.',
    statsHistoryTooShort: 'Noch zu wenige Tage für einen Verlauf.',
    sheetExpand: 'Liste aufklappen',
    sheetExpandFull: 'Liste ganz aufklappen',
    sheetCollapse: 'Liste einklappen',
    panelCollapse: 'Seitenleiste ausblenden',
    panelOpen: 'Liste anzeigen',
    standShort: 'Stand',

    filtersAriaLabel: 'Filter',
    // Restdauer statt Zeitraum (A-12/E1, E5). Das Verb steckt in der
    // Gruppenüberschrift, damit die Knöpfe kurz bleiben — „7 Tagen" allein
    // unter einer Überschrift „Restdauer" ließe sich auch als „läuft seit
    // 7 Tagen" lesen, und die Breite dieser Zeile ist auf dem Handy die
    // bindende Grenze (Backlog #33).
    filterRestdauerAriaLabel: 'Endet in',
    filterRestdauerLabel: 'Endet in',
    filterEndetIn7: '7 Tagen',
    filterEndetIn30: '30 Tagen',
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

    // Die Kennzahlen-Schlüssel von A-10 sind mit dem Streifen entfallen
    // (A-12/E2): die Zahlen stehen jetzt in den Sperrgrad-Knöpfen und brauchen
    // keinen eigenen Text — die Beschriftung ist filterVoll/filterTeil/
    // filterGering, wie vorher schon.

    standLoading: 'wird geladen …',
    standUnavailable: 'nicht verfügbar',
    standUnknown: 'unbekannt',
    standOffline: '· offline, aus dem Gerätespeicher',
    standHint: 'Automatisch alle 4 h geprüft, aktualisiert nur bei Änderungen.',
    sampleDataHint: '⚠ Beispieldaten — noch kein echter Abruf des städtischen WFS-Dienstes.',
    disclaimer: 'Ohne Gewähr. Verbindlich ist ausschließlich die Beschilderung vor Ort.',

    popupVerkehr: 'Verkehr:',
    popupVerursacher: 'Verursacher:',

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
    searchPlaceholder: 'Search an address in Karlsruhe',
    searchButton: 'Search radius',
    searchReset: 'Clear search',
    searchStatusSearching: 'Searching address …',
    searchStatusNotFound: 'Address in Karlsruhe not found. Please be more specific.',
    searchStatusResult: '{km} km radius around “{label}.”',
    searchStatusError: 'Address search is currently unavailable. Please try again later.',
    searchOfflineHint: 'Address search needs an internet connection.',

    themeToggleAriaLabel: 'Colour scheme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',

    menuButton: 'Menu',
    menuClose: 'Close menu',
    menuSettings: 'Settings',
    menuLanguage: 'Language',
    menuAbout: 'About the data',
    menuMore: 'More',
    tabsAriaLabel: 'View',
    tabListe: 'List',
    tabNeu: 'New',
    tabStatistik: 'Statistics',
    statsScope: 'All {n} open construction sites in Karlsruhe — regardless of the list’s filters.',
    statsKpiTotal: 'open construction sites',
    statsKpiVoll: 'of them full closures',
    statsKpiMedian: 'typical duration (median)',
    statsKpiBald: 'end within {n} days',
    statsStackAria: 'Closure severity: {voll} full, {teil} partial, {gering} minor',
    statsArt: 'What is being built?',
    statsVerursacher: 'Who is building?',
    statsBetroffen: 'Affected',
    statsBetroffenNote: 'One site can affect several modes of transport.',
    statsRestdauer: 'How much longer?',
    statsBandUpTo: 'up to {n} days',
    statsBandDays: '{from}–{to} days',
    statsBandMonths: '{from}–{to} months',
    statsBandYear: 'over a year',
    statsRestOpen: '{n} without an end date',
    statsRestExpired: '{n} already past their end date',
    statsLongest: 'Longest running',
    statsOther: 'Other',
    statsUnknown: 'not stated',
    statsNoDates: '{n} without dates',
    statsEmpty: 'No open construction sites in the dataset.',
    statsDays: '{n} days',
    statsMonths: '{n} months',
    statsYears: '{n} years',
    // A-16: history
    statsHistory: 'Over time',
    statsHistoryNote: 'Since {from}; each day as it stood at the end of the day.',
    statsHistoryHint: 'To read a day, tap or hover over the chart, or choose one with the arrow keys.',
    statsHistoryTotal: 'Open construction sites',
    statsHistoryVoll: 'of which full closures',
    statsHistoryDelta: '{delta} compared with {days} days ago',
    statsHistoryExtremes: 'Highest {max} on {maxDate} · lowest {min} on {minDate}',
    statsHistoryReadout: '{date}: {total} open, {voll} of them full closures',
    statsHistoryToday: 'today',
    statsHistoryChartAria: '{title}: {first} on {firstDate}, {last} on {lastDate}; highest {max}, lowest {min}.',
    statsHistoryChartsAria: 'History; arrow keys choose a day',
    statsHistoryTable: 'All values as a table',
    statsHistoryColDate: 'Date',
    statsHistoryColTotal: 'Open',
    statsHistoryColVoll: 'Full closures',
    statsHistoryLoading: 'Loading the history …',
    statsHistoryError: 'History not available.',
    statsHistoryOffline: 'History from device storage.',
    statsHistoryTooShort: 'Not enough days for a history yet.',
    sheetExpand: 'Expand list',
    sheetExpandFull: 'Expand list fully',
    sheetCollapse: 'Collapse list',
    panelCollapse: 'Hide side panel',
    panelOpen: 'Show list',
    standShort: 'As of',

    filtersAriaLabel: 'Filters',
    filterRestdauerAriaLabel: 'Ends within',
    filterRestdauerLabel: 'Ends within',
    filterEndetIn7: '7 days',
    filterEndetIn30: '30 days',
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
    standOffline: '· offline, from device storage',
    standHint: 'Checked automatically every 4 h, updated only when something changes.',
    sampleDataHint: '⚠ Sample data — no real fetch from the city’s WFS service yet.',
    disclaimer: 'No guarantee of accuracy. Only the on-site signage is legally binding.',

    popupVerkehr: 'Traffic:',
    popupVerursacher: 'Caused by:',

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
