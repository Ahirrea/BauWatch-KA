# BauWatch-KA im Transparenzportal listen lassen

Leitfaden, um BauWatch-KA in den Bereich **„Anwendungen"** (Showcase) des
Karlsruher Transparenzportals aufnehmen zu lassen:
<https://transparenz.karlsruhe.de/showcase>

Das Showcase ist **redaktionell kuratiert** — man trägt sich nicht selbst ein,
sondern schlägt das Projekt dem Open-Data-Team vor, das den Eintrag anlegt.
Kontakt über das Kontaktformular bzw. die Open-Data-Redaktion auf
`transparenz.karlsruhe.de` (aktuelle Kontaktangabe bitte dort prüfen).

## Voraussetzungen (Stand dieser Datei)

- [x] Anwendung live erreichbar: <https://ahirrea.github.io/BauWatch-KA/>
- [x] Quellcode öffentlich: <https://github.com/Ahirrea/BauWatch-KA>
- [x] Nutzt einen Portal-Datensatz: „Baustellen", Stadt Karlsruhe
- [x] Lizenzkonform: CC-BY-4.0-Namensnennung im Footer der Anwendung
- [x] Haftungshinweis vorhanden („Ohne Gewähr, verbindlich ist die
      Beschilderung vor Ort")
- [x] Als unabhängiges Bürgerprojekt erkennbar (nicht im Auftrag der Stadt)

## Anschreiben (Entwurf)

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
> Ampel für den Sperrgrad, Klartext statt Verwaltungscodes, Restdauer sowie
> Filtern nach Zeitraum, Sperrgrad und Verkehrsmittel und einer
> Adress-/Umkreissuche.
>
> - **Live:** https://ahirrea.github.io/BauWatch-KA/
> - **Quellcode (Open Source, MIT):** https://github.com/Ahirrea/BauWatch-KA
> - **Genutzter Datensatz:** „Baustellen", Stadt Karlsruhe (CC-BY 4.0) — die
>   Namensnennung erfolgt im Footer der Anwendung.
>
> Zur Einordnung: Es handelt sich um ein **unabhängiges, ehrenamtliches
> Bürgerprojekt**, nicht um ein offizielles Angebot der Stadt. Die Anwendung ist
> rein statisch gehostet (GitHub Pages), verursacht keine laufenden Kosten und
> hält keine eigenen Daten vor; die Baustellendaten werden automatisiert aus
> Ihrem WFS-Dienst aktualisiert (mind. alle 4 Stunden, der jeweilige Stand ist
> sichtbar). Ein Haftungshinweis stellt klar, dass allein die Beschilderung vor
> Ort verbindlich ist.
>
> Gerne stelle ich einen Screenshot, ein Logo oder weitere Angaben bereit, falls
> das für einen Showcase-Eintrag hilfreich ist. Über eine Rückmeldung würde ich
> mich freuen.
>
> Mit freundlichen Grüßen
> [Name]

## Kurzbeschreibung fürs Showcase (zum Einfügen)

**Titel:** BauWatch-KA – Wo wird gebaut?

**Kurztext (1–2 Sätze):**
Bürgernahe Karte und Liste der offenen Baustellen in Karlsruhe. Beantwortet
schnell die Frage „Betrifft mich das — auf meinem Weg, mit meinem
Verkehrsmittel, in meinem Zeitraum?" — mit Ampel, Klartext, Restdauer, Filtern
und Umkreissuche.

**Langtext:**
BauWatch-KA macht aus dem offenen Datensatz „Baustellen" ein alltagstaugliches
Werkzeug. Die aktuellen Baustellen in Karlsruhe erscheinen auf einer Karte und
in einer synchronisierten Liste. Verwaltungscodes werden in Klartext übersetzt,
der Sperrgrad als Ampel dargestellt und die Restdauer als „noch X Tage"
angezeigt. Filter nach Zeitraum, Sperrgrad und Verkehrsmittel sowie eine
Adress-/Umkreissuche (1,5 km) helfen, nur das Relevante zu sehen. Die Anwendung
ist quelloffen (MIT), rein statisch gehostet und aktualisiert sich automatisch
aus dem WFS-Dienst der Stadt.

**Verlinkung:** https://ahirrea.github.io/BauWatch-KA/
**Datensatz-Bezug:** „Baustellen", Stadt Karlsruhe
**Lizenz Anwendung:** Code MIT · Daten CC-BY 4.0 (Stadt Karlsruhe)

## Vor dem Absenden bedenken

- **Reine Karlsruhe-Sicht:** Der Rohdatensatz enthält auch Umland/Elsass;
  BauWatch-KA filtert bewusst auf `gemeinde = "Karlsruhe"`. Das ist für ein
  von der Stadt verlinktes Showcase eher ein Plus — transparent benennen.
- **Aktualität:** Da die Stadt darauf verlinkt, sollte die Seite stabil laufen.
  Der Datenstand ist so aktuell wie der letzte Action-Lauf (≤ 4 h) und in der
  Anwendung sichtbar.
- **Kontaktdaten:** Vor dem Versand die aktuelle Kontaktadresse/das Formular
  auf dem Portal prüfen (hier bewusst nicht fest hinterlegt).
