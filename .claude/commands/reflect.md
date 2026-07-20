---
description: Reflektiert die aktuelle Arbeitseinheit und schlägt kuratierte CLAUDE.md-Ergänzungen als Diff vor (Commit erst nach Bestätigung).
disable-model-invocation: true
---

# /reflect — Session-Reflexion in durable Projektregeln

Ziel: aus dieser Arbeitseinheit **allgemein wiederverwendbare** Erkenntnisse
destillieren und (nach meiner Freigabe) in `CLAUDE.md` festhalten, damit künftige
Claude-Sessions davon profitieren. `CLAUDE.md` steuert **jede** Folge-Session —
Qualität geht vor Vollständigkeit.

## Vorgehen

1. **Gehe den bisherigen Gesprächsverlauf durch** und sammle Kandidaten:
   - nicht offensichtliche Fallstricke, die uns Zeit gekostet haben,
   - Repo-Konventionen / „so macht man X hier",
   - Architektur- oder Datenfakten, die man sonst mühsam herleiten müsste,
   - **Korrekturen von mir (dem Nutzer)** und Fehler, die du gemacht hast, samt Vermeidung.

2. **Filtere hart.** Aufnehmen nur, was ALLE Kriterien erfüllt:
   - allgemein & wiederverwendbar (kein Einzelfall dieser konkreten Aufgabe),
   - noch **nicht** in `CLAUDE.md` enthalten (erst `CLAUDE.md` lesen und abgleichen),
   - nicht generisch/selbstverständlich (keine „schreibe Tests"-Binsen),
   - konkret und knapp formulierbar (1–3 Sätze).

3. **Bevorzuge Bearbeiten statt Anhängen.** Widerspricht ein Kandidat einer
   bestehenden Zeile, schlage die **Änderung dieser Zeile** vor, nicht einen neuen
   Absatz. Halte `CLAUDE.md` schlank — eine aufgeblähte Datei wird schlechter befolgt.

4. **Ergebnis präsentieren, NICHT sofort schreiben:**
   - Zeige die vorgeschlagenen Änderungen als konkreten Diff (Abschnitt + genauer Text).
   - Erfüllt nichts die Latte, sag ehrlich „**nichts Durables — keine Änderung**"
     und erfinde nichts.
   - Warte auf meine Bestätigung.

5. **Nach Bestätigung:** Änderung anwenden, dann committen und pushen gemäß
   Repo-Konvention (Branch `main`, aussagekräftige deutsche Commit-Message,
   z. B. `docs(claude): Erkenntnis <Thema> festgehalten`).

## Grenzen
- Keine geheimen/umgebungsspezifischen Werte in `CLAUDE.md`.
- Keine reine Verlaufsprotokollierung — nur Regeln/Fakten mit Zukunftsnutzen.
- Im Zweifel weniger aufnehmen. Eine präzise, kurze `CLAUDE.md` ist das Ziel.
