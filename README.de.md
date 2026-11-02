# Triage von Kundenmeldungen in der Versicherung — Überblick auf Deutsch

Eigenständige Demo (HTML und JavaScript, ohne Backend, ohne Build-Schritt), in der ein Versicherer Kundenmeldungen mit gesteuerten KI-Agenten vorsortiert. Jede Meldung wird einer Sparte zugeordnet (Kfz, Hausrat, Gesundheit; im Code `Auto`, `Hogar`, `Salud`), ihre Daten werden extrahiert, die Geschäftsregeln der Sparte angewendet und die Entscheidung mit Belegen, einem Compliance-Block und einem vollständigen Trace gespeichert. Die zweite Seite, das Panel **Agent Governance**, zeigt diese Traces sowie Autonomie der Agenten, Guardrails, menschliche Aufsicht, Knowledge Bases, Compliance, Kosten und Korrekturmaßnahmen.

**Live-Demo:** https://nachoenjuto.github.io/fnol-triage-v2/?lang=de · [Español](README.md) · [English](README.en.md)

Die vollständige Beschreibung steht auf Spanisch in [`README.md`](README.md). Diese Seite enthält, was Sie brauchen, um die Demo zu starten, sich im Repository zurechtzufinden und die spanischen Namen zu lesen.

## Starten

```bash
make run     # startet die Demo unter http://localhost:8792
make test    # Unit-Tests und Sprachprüfungen (Node, ohne Abhängigkeiten)
```

Sprache: Auswahl in der Kopfzeile oder `?lang=de` / `?lang=en` / `?lang=es` in der URL (der Browser merkt sich die Wahl). Ohne Endpoint von Azure AI Foundry läuft die Demo mit gespeicherten Ergebnissen oder mit der lokalen Regel-Engine.

## Aufbau des Repositorys

```
index.html  intro.html  gobierno.html   die drei Seiten: Triage, Einführung, Governance-Panel
ui/          Code nur für den Browser, ein Ordner pro Seite: shared/, triage/, governance/, intro/
core/        reine Logik, läuft gleich im Browser und in Node (von make test abgedeckt); i18n/ ist die Sprach-Engine
data/        demo/ (Fakten, einmal auf Spanisch geschrieben), generated/ (nicht bearbeiten), import-samples/, attachments/
locales/     nur Übersetzungen: es/, en/, de/ und idiomas.js (siehe locales/README.md)
scripts/     i18n/, generators/, browser/ (Chrome ohne Oberfläche), slides/
tests/       *.test.js, helpers/, benchmark/ (Messung mit einem echten Modell)
_docs/       architecture/ (C4), demo/ (Leitfaden und Drehbücher in es/, en/, de/), technical/, plans/, slides/
```

Gearbeitet wird auf Spanisch: Bezeichner im Code, Kommentare, Commit-Nachrichten und technische Dokumentation. Englisch und Deutsch werden gesammelt nachgezogen; den Ablauf für Übersetzungen beschreibt [`locales/README.md`](locales/README.md). Die Drehbücher der Demo gibt es auf Deutsch in [`_docs/demo/de/`](_docs/demo/de/guion-demo.md).

## Glossar

Ordnernamen sind englisch. Module und Funktionen behalten ihren spanischen Fachbegriff, denselben wie im Code, damit eine Datei und die globalen Objekte, die sie bereitstellt, immer gleich heißen.

| Spanisch (im Code) | Deutsch | Englisch |
|---|---|---|
| triaje | Triage | triage |
| gobierno | Governance | governance |
| ramo | Sparte | line of business |
| mensaje / paquete | Meldung / Paket | message / package |
| ficha | Akte | record |
| evidencias | Belege (geprüfte Zitate) | evidence |
| cumplimiento | Compliance | compliance |
| datos personales / seudonimización | personenbezogene Daten / Pseudonymisierung | personal data / pseudonymisation |
| fraude | Betrug | fraud |
| fechas | Datumsangaben (beim Laden auf heute verschoben) | dates |
| ahorro | Einsparungen (FinOps-Szenario) | savings |
| adjuntos | Anhänge | attachments |
| motor local | lokale Engine (ohne KI) | local engine |
| resultados guardados | gespeicherte Ergebnisse | saved results |
| recorrido | Rundgang durch die Demo | demo walkthrough |
| guion | Drehbuch | demo script |
| huella | Fingerabdruck des spanischen Textes | fingerprint |
| `DESPEJADO` / `REVISION` | freigegeben / zur Prüfung (interne Werte, werden nie übersetzt) | cleared / for review |

## Lizenz

MIT
