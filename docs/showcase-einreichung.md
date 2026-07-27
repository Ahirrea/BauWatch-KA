# Getting BauWatch-KA Listed in the Transparency Portal

Guide and submission document for the **"Anwendungen"** ("Applications")
section (showcase) of the Karlsruhe transparency portal:
<https://transparenz.karlsruhe.de/showcase>

> **Note on language:** this file is internal tracking/reference and is in
> English like the rest of the docs — except for the **"Cover Letter"** and
> **"Field Values for the CKAN Entry"** sections below (and, for the same
> reason, the "Distinction from the Mobility Portal" section): those are the
> literal German-language text meant to be sent to Karlsruhe's Open Data
> team and pasted into their German-language portal. Translating that
> content would defeat its purpose, so it's kept in German on purpose — see
> the language note in `CLAUDE.md`.

The showcase is **editorially curated** — you don't add yourself, you
propose the project to the open-data team, which creates the entry.
Contact via the contact form or the open-data editorial team at
`transparenz.karlsruhe.de` (please check the current contact details
there).

## Status: Editorial Team's Feedback from 2026-07-26

The pre-review was fundamentally positive ("fits well into the showcase"),
but named three points holding up the entry. What happened as a result:

| Editorial team's point | Status |
|---|---|
| **1. Attribution not findable on the live site** | **fixed.** The attribution was an empty paragraph in the HTML and was only inserted via JavaScript after the data fetch — visible in the browser, not in the served document. It's now **static** in `index.html`, linking the dataset and the license text. `scripts/test-attribution.mjs` locks this in permanently (part of `npm test`). |
| **2. Missing fields for the entry** | **supplied**, see [Field Values for the CKAN Entry](#field-values-for-the-ckan-entry). Screenshot: [`showcase/screenshot.png`](./showcase/screenshot.png) (desktop) and [`showcase/screenshot-mobil.png`](./showcase/screenshot-mobil.png). The only thing left open is **name + contact email address** — a personal detail, see [Open Items](#open-items). |
| **3. Distinction from the mobility portal** | **added**, as its own paragraph in the cover letter and in detail under [Distinction from the Mobility Portal](#distinction-from-the-mobility-portal). |
| Unify the update-frequency wording | **fixed** — the cover letter now uses the app's own wording. |
| Legal notice/privacy notice | **done.** Requirement [`A-4`](./anforderungen/A-4-impressum-datenschutz.md) implemented: two dedicated text pages, linked from every page's footer — [`impressum.html`](../impressum.html) and [`datenschutz.html`](../datenschutz.html). The privacy notice names exactly the three real data flows (GitHub Pages, `tile.openstreetmap.org`, `nominatim.openstreetmap.org`) and claims nothing that isn't true; `scripts/test-rechtstexte.mjs` locks both in against the code. The only thing left open is the **contact address** (the same point as above, see [Open Items](#open-items)). |
| Nominatim usage policy | **checked, no action needed** — the search does **not** query on every keystroke, see [Nominatim](#nominatim-usage-policy-checked). |
| Mention the list's accessibility benefit | **added** to the cover letter and the long text. |

## Prerequisites

- [x] Application reachable live: <https://ahirrea.github.io/BauWatch-KA/>
- [x] Source code public: <https://github.com/Ahirrea/BauWatch-KA>
- [x] Uses a portal dataset: "Baustellen" ("construction sites"), City of
      Karlsruhe — <https://transparenz.karlsruhe.de/dataset/baustellen>
- [x] License-compliant: CC-BY-4.0 attribution **static in the served
      HTML** (not only via JavaScript), with a link to the dataset and the
      license text
- [x] Liability notice present ("No warranty; the on-site signage is
      binding")
- [x] Recognizable as an independent citizen project (not on the city's
      behalf)
- [x] Screenshot present (desktop + mobile, see `docs/showcase/`)
- [ ] Name + contact email address for the entry filled in (path decided:
      a dedicated project address — create and enter the address)
- [x] Legal notice/privacy notice present and linked from the footer
      (requirement `A-4` implemented) — except for the contact address,
      which hangs on the open item above

## Field Values for the CKAN Entry

*(Kept in German — see the note at the top of this file. These values go
directly into the fields of a CKAN showcase entry on the German-language
portal.)*

Direkt übernehmbar in die Felder eines CKAN-Showcase.

**Titel:** BauWatch-KA – Wo wird gebaut?

**URL der Anwendung:** <https://ahirrea.github.io/BauWatch-KA/>

**Verknüpfter Datensatz (für „1 Datensatz"):**
<https://transparenz.karlsruhe.de/dataset/baustellen>

**Kurztext (1–2 Sätze):**
Bürgernahe Karte und Liste der offenen Baustellen in Karlsruhe. Beantwortet
schnell die Frage „Betrifft mich das — auf meinem Weg, mit meinem
Verkehrsmittel, in meinem Zeitraum?" — mit Ampel, Klartext, Restdauer, Filtern
und Umkreissuche.

**Langtext:**
BauWatch-KA macht aus dem offenen Datensatz „Baustellen" ein alltagstaugliches
Werkzeug. Die aktuellen Baustellen in Karlsruhe erscheinen auf einer Karte und
in einer damit synchronisierten Liste. Verwaltungsangaben werden in Klartext
übersetzt, der Sperrgrad als Ampel dargestellt und die Restdauer als „noch X
Tage" angezeigt. Filter nach Zeitraum, Sperrgrad und Verkehrsmittel sowie eine
Adress-/Umkreissuche (1,5 km) helfen, nur das Relevante zu sehen. Die Liste ist
dabei **kein Beiwerk, sondern eine vollwertige Alternative zur Karte**: Sie
enthält dieselben Informationen und ist per Tastatur und Screenreader bedienbar
— wer keine Karte nutzen kann oder will, verliert keine Information. Die
Anwendung ist quelloffen (MIT), rein statisch gehostet, auf den Startbildschirm
installierbar und auch offline mit dem zuletzt geladenen Stand nutzbar.

**Tags (3–5):**
`Baustellen` · `Mobilität` · `Karte` · `Barrierefreiheit` · `Open Source`

> Die ersten drei sind die tragenden; `Barrierefreiheit` und `Open Source` gern
> weglassen, wenn das Portal-Vokabular sie nicht führt.

**Screenshot:** [`docs/showcase/screenshot.png`](./showcase/screenshot.png)
(1440 × 900, Hellmodus, echte Kartenkacheln). Zusätzlich als Mobilansicht:
[`docs/showcase/screenshot-mobil.png`](./showcase/screenshot-mobil.png)
(390 × 844). Reproduzierbar über `node scripts/screenshot.mjs`.

**Lizenz Anwendung:** Code MIT · Daten CC-BY 4.0 (Stadt Karlsruhe)

**Name / Kontakt für den Eintrag:** ⚠ **vor dem Versand ausfüllen** — bewusst
nicht vorbelegt, siehe [Open Items](#open-items).

```
Name:    <Anzeigename für den Eintrag>
E-Mail:  <projekt-eigene Adresse, NICHT die private>
```

> Entschieden (2026-07-26): eine **eigene Projektadresse**, nicht die private.
> Die Adresse steht dauerhaft öffentlich im Portal; eine Weiterleitungs- oder
> Alias-Adresse lässt sich später abschalten oder umziehen, ohne den
> Portal-Eintrag anfassen zu müssen.

## Cover Letter

*(Kept in German — see the note at the top of this file. This is the literal
draft email to send to the city's Open Data team.)*

> **Betreff:** Vorschlag für den Bereich „Anwendungen": BauWatch-KA – Baustellen
> in Karlsruhe
>
> Sehr geehrtes Open-Data-Team,
>
> auf Basis Ihres offenen Datensatzes „Baustellen" habe ich eine kleine,
> kostenlose Bürger-Anwendung gebaut und würde mich freuen, wenn sie in Ihrem
> Bereich „Anwendungen" gelistet werden könnte.
>
> **BauWatch-KA – „Wo wird gebaut?"** beantwortet die Frage, die Menschen im
> Alltag wirklich haben: *Betrifft mich eine Baustelle — auf meinem Weg, mit
> meinem Verkehrsmittel, in meinem Zeitraum?* Die Anwendung zeigt die aktuellen
> Baustellen in Karlsruhe auf einer Karte plus synchronisierter Liste, mit
> Ampel für den Sperrgrad, Klartext statt Verwaltungsangaben, Restdauer sowie
> Filtern nach Zeitraum, Sperrgrad und Verkehrsmittel und einer
> Adress-/Umkreissuche.
>
> - **Live:** https://ahirrea.github.io/BauWatch-KA/
> - **Quellcode (Open Source, MIT):** https://github.com/Ahirrea/BauWatch-KA
> - **Genutzter Datensatz:** „Baustellen", Stadt Karlsruhe (CC-BY 4.0),
>   https://transparenz.karlsruhe.de/dataset/baustellen — die Namensnennung
>   steht statisch im Footer der Anwendung und verlinkt Datensatz und Lizenztext.
>
> **Abgrenzung zum Mobilitätsportal:** Das TRK-Mobilitätsportal deckt die
> Verkehrslage der gesamten Region in Echtzeit ab — Baustellen sind dort eine
> Ebene unter vielen, neben ÖPNV-Abfahrten, Parkplätzen und Verkehrsfluss.
> BauWatch-KA setzt bewusst enger an: **nur Karlsruhe, nur Baustellen, aus der
> Bürgersicht statt aus der Verkehrssteuerung.** Daraus folgen Dinge, die eine
> Gesamtplattform nicht leisten muss: eine Adress-Umkreissuche („betrifft es
> meine Straße?"), Klartext und eine Sperrgrad-Ampel anstelle von
> Verwaltungsangaben, die Restdauer als „noch X Tage" und das Herausfiltern der
> Nachbargemeinden, die der Rohdatensatz mitliefert. Die beiden Angebote
> konkurrieren nicht, sie beantworten verschiedene Fragen — und BauWatch-KA
> zeigt zusätzlich, dass sich Ihr Datensatz ohne Weiteres von Dritten
> weiterverwenden lässt.
>
> **Barrierefreiheit:** Die Liste ist eine vollwertige Alternative zur Karte,
> nicht nur eine Ergänzung — mit denselben Informationen, per Tastatur und
> Screenreader bedienbar (Skip-Link, `aria-pressed` an den Filtern, sichtbarer
> Fokus, `prefers-reduced-motion`, Kontraste nach WCAG-AA-Zielwerten). Ein
> formales Audit mit Prüfwerkzeug steht als Gegenprobe noch aus; ich nenne das
> lieber offen, als mehr zu behaupten, als geprüft ist.
>
> Zur Einordnung: Es handelt sich um ein **unabhängiges, ehrenamtliches
> Bürgerprojekt**, nicht um ein offizielles Angebot der Stadt. Die Anwendung ist
> rein statisch gehostet (GitHub Pages), verursacht keine laufenden Kosten und
> hält keine eigenen Daten vor; die Baustellendaten werden automatisiert aus
> Ihrem WFS-Dienst nachgeführt — **alle 4 Stunden geprüft, aktualisiert nur bei
> Änderungen**, der jeweilige Stand ist in der Anwendung sichtbar. Ein
> Haftungshinweis stellt klar, dass allein die Beschilderung vor Ort verbindlich
> ist.
>
> Screenshot (Desktop und Mobil), Kurztext, Langtext und Tag-Vorschläge lege ich
> bei, damit der Eintrag ohne Rückfragen angelegt werden kann.
>
> **Kontakt für den Eintrag:** [Anzeigename] · [projekt-eigene E-Mail-Adresse]
>
> Mit freundlichen Grüßen
> [Anzeigename]

## Distinction from the Mobility Portal

*(Kept in German — see the note at the top of this file. This is backup
material for follow-up questions from the editorial team, more detailed than
the cover letter.)*

Der bestehende Showcase-Eintrag ist das
[TRK-Mobilitätsportal](https://transparenz.karlsruhe.de/showcase/mobilitatsportal)
(regionale Informationsplattform, verknüpft mit ~29 Datensätzen).

| | Mobilitätsportal | BauWatch-KA |
|---|---|---|
| **Zweck** | Verkehrslage der Region in Echtzeit, alle Verkehrsträger | eine Frage: betrifft mich eine Baustelle? |
| **Gebiet** | Baden, Südpfalz, Nordelsass | ausschließlich Karlsruhe (`gemeinde = "Karlsruhe"`) |
| **Datenbreite** | viele Quellen (ÖPNV, Parken, Verkehrsfluss, Baustellen) | ein Datensatz, dieser dafür vollständig aufbereitet |
| **Perspektive** | Verkehrssteuerung / Betreiber | Bürgersicht: „meine Straße, mein Verkehrsmittel, mein Zeitraum" |
| **Typische Interaktion** | Karte erkunden, Ebenen schalten | Adresse eingeben → 1,5-km-Umkreis, nach Entfernung sortiert |
| **Darstellung** | Fachdarstellung | Klartext, Sperrgrad-Ampel, „noch X Tage" |
| **Betrieb** | betriebene Plattform | statische Seite, keine laufenden Kosten, quelloffen (MIT) |

Kernargument in einem Satz: **Das Mobilitätsportal zeigt die Verkehrslage, BauWatch-KA
beantwortet eine persönliche Frage.** Der doppelte Tag „Baustellen" ist deshalb kein
Duplikat, sondern zeigt zwei Verwendungen desselben Datensatzes — für ein
Transparenzportal eher ein Argument dafür als dagegen.

## Nominatim Usage Policy (Checked)

The editorial team's question was justified but doesn't apply to this app:
the address search only queries **when the form is submitted**, not while
typing — there's deliberately no autocomplete (Backlog `#9`). Measured in
the browser: 14 typed characters → **0 requests**, one click on "search
radius" → **exactly 1 request**. In addition: `limit=1`, a bounding box
around Karlsruhe, identification via the referer (a custom `User-Agent`
isn't settable via `fetch`), and offline the search button is disabled
instead of running into an error. Should autocomplete be added later, the
policy is the reason to only do that with debouncing and a minimum length.

## Open Items

- **Name + contact email address for the entry** — the editorial team's
  last open item. **Decided (2026-07-26): a dedicated project address**,
  not the private one; the entry is public and the address permanently
  visible in the portal. Still to do: create the address (an alias or
  forward is enough, the main thing is that it can be disabled without
  touching the portal entry) and enter it, together with the display name,
  at the two marked spots — in the
  [field values](#field-values-for-the-ckan-entry) and in the cover letter.
  **And at three more spots**, because `A-4` has since been implemented:
  `impressum.html`, `datenschutz.html` (which until then carry the clearly
  recognizable placeholder `kontakt@example.invalid`) as well as the
  checkbox above under [Prerequisites](#prerequisites). It must be the
  **same** address everywhere — `scripts/test-rechtstexte.mjs` reports the
  placeholder as a `[WARN]` on every `npm test` and turns **red** as soon
  as the checkbox here is checked while the pages still carry the
  placeholder.
- **Legal notice/privacy notice** — **implemented**
  ([`A-4`](./anforderungen/A-4-impressum-datenschutz.md)), except for the
  contact address above. Two dedicated text pages without JavaScript,
  linked from the footer. The privacy notice describes exactly the three
  real data flows (hosting at GitHub Pages, map tiles and Nominatim at the
  OSMF) and states up front what the site **doesn't** do — no cookies, no
  tracking, no data storage of its own; that's verifiable in the open
  source code and is held mechanically against the code by
  `scripts/test-rechtstexte.mjs`. **Two reservations** remain and are
  deliberately not argued away: (a) the legal notice names name and email,
  **no postal address** — product decision `E2` in `A-4` for a purely
  private, volunteer-run offering; a PO box or a c/o address remains the
  fallback plan if the legal department insists on a deliverable address.
  (b) **The map tiles load without prior consent** — a strict reading would
  require a prior prompt here ("load the map?"). That would damage the
  PRD's core loop and is therefore its own trade-off, not part of `A-4`;
  the privacy notice names the data flow all the more clearly because of
  it. Both are a layperson's judgment, not legal advice — a legal look at
  the personal-details items is worth the money.
- **Contact channel to the editorial team** to check on the portal before
  sending (deliberately not hard-coded here).
- **Formal accessibility audit** (Backlog `#12`) is still outstanding.
  Relevant for a BITV-bound body — named openly in the cover letter rather
  than claimed.

## Points to Consider Before Submitting

- **Karlsruhe-only view:** the raw dataset also contains the surrounding
  area/Alsace; BauWatch-KA deliberately filters to `gemeinde = "Karlsruhe"`.
  For a showcase linked by the city, that's more of a plus — state it
  transparently.
- **Currency:** since the city links to it, the site should run stably.
  Keep the wording consistent everywhere: **checked every 4 h, updated
  only on changes** (not "updated at least every 4 hours" — that promises
  a change frequency the data doesn't have). The timestamp is visible in
  the application.
- **Update the screenshot** whenever the interface changes visibly:
  `node scripts/screenshot.mjs`.
