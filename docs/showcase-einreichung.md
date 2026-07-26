# BauWatch-KA im Transparenzportal listen lassen

Leitfaden und Einreichungsunterlage für den Bereich **„Anwendungen"** (Showcase)
des Karlsruher Transparenzportals: <https://transparenz.karlsruhe.de/showcase>

Das Showcase ist **redaktionell kuratiert** — man trägt sich nicht selbst ein,
sondern schlägt das Projekt dem Open-Data-Team vor, das den Eintrag anlegt.
Kontakt über das Kontaktformular bzw. die Open-Data-Redaktion auf
`transparenz.karlsruhe.de` (aktuelle Kontaktangabe bitte dort prüfen).

## Stand: Rückmeldung der Redaktion vom 2026-07-26

Die Vorprüfung war grundsätzlich positiv („passt gut ins Showcase"), hat aber
drei Punkte benannt, die den Eintrag aufhalten. Was daraufhin passiert ist:

| Punkt der Redaktion | Stand |
|---|---|
| **1. Namensnennung auf der Live-Seite nicht auffindbar** | **behoben.** Die Nennung stand als leerer Absatz im HTML und wurde erst nach dem Datenabruf per JavaScript eingefügt — im Browser sichtbar, im ausgelieferten Dokument nicht. Sie steht jetzt **statisch** in `index.html`, verlinkt Datensatz und Lizenztext. `scripts/test-attribution.mjs` hält das dauerhaft fest (Teil von `npm test`). |
| **2. Fehlende Felder für die Anlage** | **mitgeliefert**, siehe [Feldwerte für den CKAN-Eintrag](#feldwerte-für-den-ckan-eintrag). Screenshot: [`showcase/screenshot.png`](./showcase/screenshot.png) (Desktop) und [`showcase/screenshot-mobil.png`](./showcase/screenshot-mobil.png). Offen bleibt allein **Name + Kontaktmailadresse** — persönliche Angabe, siehe [Offene Punkte](#offene-punkte). |
| **3. Abgrenzung zum Mobilitätsportal** | **aufgenommen**, als eigener Absatz im Anschreiben und ausführlich unter [Abgrenzung zum Mobilitätsportal](#abgrenzung-zum-mobilitätsportal). |
| Aktualisierungs-Formulierung vereinheitlichen | **behoben** — das Anschreiben nutzt jetzt die Formulierung der App. |
| Impressum/Datenschutzhinweis | **offen, bewusst nicht nebenbei entschieden** — als Anforderung `A-4` aufgenommen (Status `💡 Idee` in der [Anforderungs-Übersicht](./anforderungen/README.md)). |
| Nominatim-Nutzungsrichtlinie | **geprüft, kein Handlungsbedarf** — die Suche fragt **nicht** bei jedem Tastendruck an, siehe [Nominatim](#nominatim-nutzungsrichtlinie-geprüft). |
| Barrierefreiheitsvorteil der Liste erwähnen | **aufgenommen** ins Anschreiben und in den Langtext. |

## Voraussetzungen

- [x] Anwendung live erreichbar: <https://ahirrea.github.io/BauWatch-KA/>
- [x] Quellcode öffentlich: <https://github.com/Ahirrea/BauWatch-KA>
- [x] Nutzt einen Portal-Datensatz: „Baustellen", Stadt Karlsruhe —
      <https://transparenz.karlsruhe.de/dataset/baustellen>
- [x] Lizenzkonform: CC-BY-4.0-Namensnennung **statisch im ausgelieferten HTML**
      (nicht erst per JavaScript), mit Link auf Datensatz und Lizenztext
- [x] Haftungshinweis vorhanden („Ohne Gewähr, verbindlich ist die
      Beschilderung vor Ort")
- [x] Als unabhängiges Bürgerprojekt erkennbar (nicht im Auftrag der Stadt)
- [x] Screenshot vorhanden (Desktop + Mobil, siehe `docs/showcase/`)
- [ ] Name + Kontaktmailadresse für den Eintrag eingetragen (Weg entschieden:
      eigene Projektadresse — Adresse anlegen und eintragen)
- [ ] Impressum/Datenschutzhinweis (Anforderung `A-4`, noch nicht entschieden)

## Feldwerte für den CKAN-Eintrag

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
nicht vorbelegt, siehe [Offene Punkte](#offene-punkte).

```
Name:    <Anzeigename für den Eintrag>
E-Mail:  <projekt-eigene Adresse, NICHT die private>
```

> Entschieden (2026-07-26): eine **eigene Projektadresse**, nicht die private.
> Die Adresse steht dauerhaft öffentlich im Portal; eine Weiterleitungs- oder
> Alias-Adresse lässt sich später abschalten oder umziehen, ohne den
> Portal-Eintrag anfassen zu müssen.

## Anschreiben

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

## Abgrenzung zum Mobilitätsportal

Ausführlicher als im Anschreiben — als Rückhalt für Rückfragen in der Redaktion.
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

## Nominatim-Nutzungsrichtlinie (geprüft)

Die Rückfrage der Redaktion war berechtigt, trifft die Anwendung aber nicht:
Die Adresssuche fragt **nur beim Absenden** des Formulars an, nicht beim Tippen —
es gibt bewusst keine Autovervollständigung (Backlog `#9`). Im Browser
nachgemessen: 14 getippte Zeichen → **0 Anfragen**, ein Klick auf „Umkreis
suchen" → **genau 1 Anfrage**. Zusätzlich: `limit=1`, eine Bounding-Box um
Karlsruhe, Identifikation über den Referer (ein eigener `User-Agent` ist per
`fetch` nicht setzbar), und offline ist der Suchknopf deaktiviert statt in einen
Fehler zu laufen. Sollte später eine Autovervollständigung dazukommen, ist die
Richtlinie der Grund, das nur mit Entprellung und Mindestlänge zu tun.

## Offene Punkte

- **Name + Kontaktmailadresse für den Eintrag** — der letzte offene Punkt der
  Redaktion. **Entschieden (2026-07-26): eine eigene Projektadresse**, nicht die
  private; der Eintrag ist öffentlich und die Adresse dauerhaft im Portal
  sichtbar. Noch zu tun: Adresse anlegen (Alias oder Weiterleitung genügt,
  Hauptsache abschaltbar, ohne den Portal-Eintrag anfassen zu müssen) und
  zusammen mit dem Anzeigenamen an den beiden markierten Stellen eintragen —
  in den [Feldwerten](#feldwerte-für-den-ckan-eintrag) und im Anschreiben.
  Dieselbe Adresse dann auch in einem etwaigen Impressum (`A-4`) verwenden,
  damit im Portal und auf der Seite nicht zwei Kontaktwege stehen.
- **Impressum/Datenschutzhinweis** (Anforderung `A-4`, Status `💡 Idee`). Die
  Redaktion rechnet mit einer Rückfrage des Justiziariats, weil die Seite einen
  Drittdienst einbindet: Bei der Adresssuche geht die IP-Adresse an Nominatim
  (OpenStreetMap Foundation), die Kartenkacheln kommen ebenfalls von OSM. Das
  betrifft eine Produktentscheidung (eigene Seite oder Abschnitt? welche
  Angaben? Verhältnis zum Nicht-Ziel „keine eigene Datenhaltung"?) und läuft
  deshalb über den [Refinement-Prozess](./PROZESS.md), nicht nebenbei.
  Nicht-juristische Einschätzung: Der Datenschutzhinweis ist der greifbarere
  Teil — technisch ist er ehrlich zu erfüllen, weil die Anwendung kein Tracking,
  keine Cookies und keine eigene Datenhaltung hat.
- **Kontaktweg zur Redaktion** vor dem Versand auf dem Portal prüfen (hier
  bewusst nicht fest hinterlegt).
- **Formales Barrierefreiheits-Audit** (Backlog `#12`) steht noch aus. Für eine
  BITV-gebundene Stelle relevant — im Anschreiben deshalb offen benannt statt
  behauptet.

## Vor dem Absenden bedenken

- **Reine Karlsruhe-Sicht:** Der Rohdatensatz enthält auch Umland/Elsass;
  BauWatch-KA filtert bewusst auf `gemeinde = "Karlsruhe"`. Das ist für ein
  von der Stadt verlinktes Showcase eher ein Plus — transparent benennen.
- **Aktualität:** Da die Stadt darauf verlinkt, sollte die Seite stabil laufen.
  Formulierung überall gleich halten: **alle 4 h geprüft, aktualisiert nur bei
  Änderungen** (nicht „mindestens alle 4 Stunden aktualisiert" — das verspricht
  eine Änderungsfrequenz, die die Daten nicht haben). Der Stand ist in der
  Anwendung sichtbar.
- **Screenshot nachziehen**, wenn sich die Oberfläche sichtbar ändert:
  `node scripts/screenshot.mjs`.
