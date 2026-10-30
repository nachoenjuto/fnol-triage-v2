# CLAUDE.md · fnol-triage/v2

Demo estática (sin build) de triaje FNOL con agentes de IA gobernados: `index.html` (triaje), `gobierno.html` (panel de gobierno) e `intro.html` (introducción). Se sirve con `make run`.

## Idiomas (ES, EN, DE y los que se añadan)

Plan y estado: `_docs/plan-i18n.md`. Reglas que se cumplen siempre, también cuando se trabaja solo en español:

- **Ningún texto visible en los HTML.** Solo estructura y atributos `data-i18n="clave"` / `data-i18n-attr="title:clave;aria-label:clave"`.
- **Ningún literal de texto en el código.** Todo texto va en `locales/es/ui.js` (o en los ficheros de contenido de `locales/es/`) y se usa con `t('clave', {vars})`. Fechas, números e importes con `I18N.fmt`, nunca con `'es-ES'` fijo.
- **Valores internos sin traducir**: `'Auto'`, `'Hogar'`, `'Salud'`, `'DESPEJADO'`, `'REVISION'`, A1…S8, IF-…, G-… son claves; solo se traduce la etiqueta que se muestra.
- **Los hechos se escriben una sola vez** en `data/base/` (importes, fechas, decisiones, resultado de cada regla, métricas, tokens, scores). Los idiomas solo aportan texto.
- `make test` (incluye `make i18n-check`) tiene que pasar: estricto con el español y lo común, aviso con el resto.

### Modo de trabajo

Se trabaja en español. EN y DE se ponen al día por lotes:

1. `make i18n-estado` dice, por idioma, qué falta, qué está desactualizado (huella del texto español) y qué ha cambiado desde la última puesta al día.
2. Se traduce todo lo pendiente. Formato en las traducciones: `'clave': ['Text', '<huella>']`; la huella sale en el informe.
3. `make i18n-check IDIOMA=en,de` en estricto hasta que pasa.
4. Commit y `make i18n-marcar IDIOMA=en,de` (guarda el commit de referencia en `locales/<idioma>/estado.json`).

Antes de enseñar la demo en un idioma distinto del español, ese idioma tiene que estar al día y pasar en estricto.

### Añadir un idioma

Carpeta `locales/<código>/` con los mismos ficheros que `es/` y su `estado.json`, entrada en `locales/idiomas.js`, guion en `_docs/<código>/`, y `make i18n-check IDIOMA=<código>` hasta que pase.

## Estilo de los textos

Los textos para cliente siguen las reglas de redacción de Nacho (ver memoria `writing-style-aboutme`): sin relleno, sin tríadas, cifras sacadas de los datos del proyecto.
