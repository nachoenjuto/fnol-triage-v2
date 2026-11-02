# Insurance message triage — English overview

Self-contained demo (HTML and JavaScript, no backend, no build step) of an insurer triaging customer messages with governed AI agents. Each message is classified by line of business (Motor, Home, Health; `Auto`, `Hogar`, `Salud` in the code), its data are extracted, the business rules for that line are applied, and the decision is recorded with its evidence, a compliance block and a full trace. A second page, the **Agent Governance** panel, shows those traces, the agents' autonomy, guardrails, human oversight, knowledge bases, compliance, costs and corrective measures.

**Live demo:** https://nachoenjuto.github.io/fnol-triage-v2/?lang=en · [Español](README.md) · [Deutsch](README.de.md)

The full description is in Spanish in [`README.md`](README.md). This page covers what you need to run the demo, find your way around the repository and read the Spanish names.

## Run it

```bash
make run     # serves the demo at http://localhost:8792
make test    # unit tests and language checks (Node, no dependencies)
```

Language: the selector in the header, or `?lang=en` / `?lang=de` / `?lang=es` in the URL (the choice is remembered in the browser). Without an Azure AI Foundry endpoint the demo runs on saved results or the local rule engine.

## Repository map

```
index.html  intro.html  gobierno.html   the three pages: triage, introduction, governance panel
ui/          browser-only code, one folder per page: shared/, triage/, governance/, intro/
core/        pure logic that runs the same in the browser and in Node (covered by make test); i18n/ is the language engine
data/        demo/ (facts, written once in Spanish), generated/ (do not edit), import-samples/, attachments/
locales/     translations only: es/, en/, de/ and idiomas.js (see locales/README.md)
scripts/     i18n/, generators/, browser/ (headless Chrome), slides/
tests/       *.test.js, helpers/, benchmark/ (measurement against a real model)
_docs/       architecture/ (C4), demo/ (guide and scripts in es/, en/, de/), technical/, plans/, slides/
```

Day-to-day work happens in Spanish: code identifiers, comments, commit messages and the technical docs. English and German are brought up to date in batches; the translator workflow is in [`locales/README.md`](locales/README.md). The demo scripts are available in English in [`_docs/demo/en/`](_docs/demo/en/guion-demo.md).

## Glossary

Folder names are in English. Module and function names keep their Spanish domain term, the same one used in the code, so a file and the globals it exposes always match.

| Spanish (in the code) | English | German |
|---|---|---|
| triaje | triage | Triage |
| gobierno | governance | Governance |
| ramo | line of business | Sparte |
| mensaje / paquete | message / package | Meldung / Paket |
| ficha | record | Akte |
| evidencias | evidence (verified quotes) | Belege |
| cumplimiento | compliance | Compliance |
| datos personales / seudonimización | personal data / pseudonymisation | personenbezogene Daten / Pseudonymisierung |
| fraude | fraud | Betrug |
| fechas | dates (shifted to today on load) | Datumsangaben |
| ahorro | savings (FinOps scenario) | Einsparungen |
| adjuntos | attachments | Anhänge |
| motor local | local engine (no AI) | lokale Engine |
| resultados guardados | saved results | gespeicherte Ergebnisse |
| recorrido | demo walkthrough | Rundgang |
| guion | demo script | Drehbuch |
| huella | fingerprint of the Spanish text | Fingerabdruck |
| `DESPEJADO` / `REVISION` | cleared / for review (internal values, never translated) | freigegeben / zur Prüfung |

## Licence

MIT
