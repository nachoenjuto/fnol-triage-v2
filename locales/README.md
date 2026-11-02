# Translations

This folder holds only translations and the list of languages. The language engine that loads them is in `core/i18n/`. Spanish (`es`) is the base language: everything is written in Spanish first and the other languages translate it.

```
idiomas.js          available languages, with their name and locale
es/                 base texts: ui.js, ui-triaje.js, ui-gobierno.js, ui-intro.js, motor.js
en/  de/            the same files translated, plus datos-*.js and estado.json
```

## What each file is

| File | Content | Format in `en/`, `de/` |
|---|---|---|
| `ui.js`, `ui-triaje.js`, `ui-gobierno.js`, `ui-intro.js` | interface texts: shared, triage page, governance panel, introduction | `'key': ['Text', '<fingerprint>']` |
| `datos-*.js` | texts inside the demo data (messages, saved results, governance dataset, fraud catalogue, prompts, walkthrough, demo scripts) | `"<fingerprint>": "Text"` |
| `motor.js` | regular expressions the engines use to read a message (dates, rules, personal data, fraud signals) | same keys as `es/motor.js` |
| `estado.json` | commit the language was last brought up to date with | written by `make i18n-marcar` |

`es/` has no `datos-*.js`: the Spanish data texts are the data themselves, in `data/demo/*.js` and `core/prompts.js`. The fingerprint is a hash of the Spanish text. When the Spanish changes, the fingerprint no longer matches and the translation shows up as outdated.

## Bringing a language up to date

```bash
make i18n-estado IDIOMA=de                       # what is missing or outdated, with the Spanish text and its fingerprint
make i18n-importar IDIOMA=de FICHERO=de.json     # optional: import a flat JSON { key or fingerprint: text }
make i18n-check IDIOMA=de                        # strict check: must pass
make guion IDIOMA=de                             # if the demo script changed: rewrites _docs/demo/de/
node tests/motores-idioma.test.js                # if a message or es/motor.js changed: engines must give the same result as in Spanish
make i18n-marcar IDIOMA=de                       # after committing: records the reference commit in estado.json
```

Rules the checks enforce:

- A translation keeps the same figures as its Spanish original (amounts, dates, times, plates, phone numbers).
- Placeholders such as `{id}` or `{total}` stay as they are.
- Internal values (`Auto`, `Hogar`, `Salud`, `DESPEJADO`, `REVISION`, A1…S8, IF-…, G-…) are never translated; only the label shown is.

## Adding a language

Create `locales/<code>/` with the same files as `en/` and an `estado.json`, add the language to `idiomas.js`, generate its demo scripts with `make guion IDIOMA=<code>` and run `make i18n-check IDIOMA=<code>` until it passes.
