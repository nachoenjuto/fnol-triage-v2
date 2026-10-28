# Documentación técnica

Referencia para mantener, ampliar o auditar el código de la demo. El uso de cada pantalla está en [`../guia-demo.md`](../guia-demo.md) y los diagramas C4 en [`../arquitectura.md`](../arquitectura.md).

| Documento | Contenido |
|---|---|
| [modelo-datos.md](modelo-datos.md) | ficheros de `data/`, esquema de mensaje, ficha guardada, registro del triaje, dataset del panel y antifraude, fechas relativas a hoy |
| [integracion-ia.md](integracion-ia.md) | motores de triaje, configuración, rutas de API, cuerpo de la petición, reintentos, prompts, estrategias, contrato de salida y su validación, motor local, limitaciones |
| [cumplimiento.md](cumplimiento.md) | detección de datos personales, seudonimización, bloque `_gobernanza`, hashes y cadena, retención, supervisión humana, termómetro |
| [panel-gobierno.md](panel-gobierno.md) | qué es real y qué simulado, fuentes de datos, conversión de la sesión en trazas, render por sección, cálculos, estado de la sesión |
| [evidencias-y-fraude.md](evidencias-y-fraude.md) | anclado y verificación de citas, respaldo sin IA, siguiente paso, motor de indicadores de fraude y su resultado con el Paquete A |
| [operacion.md](operacion.md) | requisitos, Makefile, orden de carga de scripts, almacenamiento del navegador, despliegue, problemas frecuentes |
| [pruebas.md](pruebas.md) | las 7 suites de `make test`, qué fija cada una, la medición con un modelo real y lo que no está cubierto |

## La demo en una página

- **Sin backend ni build.** Tres páginas HTML (`intro.html`, `index.html`, `gobierno.html`) cargan scripts que se comunican por variables globales. GitHub Pages sirve la rama `main`.
- **Una sola dependencia externa:** el endpoint de Azure AI Foundry que el usuario configura. Sin él, el triaje usa el motor local o los resultados guardados.
- **Lógica pura separada del DOM.** `evidencias.js`, `cumplimiento.js`, `fraude.js`, `fechas.js` y `ahorro.js` se cargan igual en el navegador y en Node, y son lo que cubren los tests.
- **El modelo propone y la plataforma comprueba.** La respuesta del modelo pasa por `parseTriage()`, sus citas por `Evidencias.localizar()` y todo el bloque `_gobernanza` lo calcula la plataforma.
- **Estado en la pestaña.** Configuración, prompts, registro y cambios del panel viven en `sessionStorage`.

## Mapa de módulos

| Fichero | Líneas | Papel |
|---|---|---|
| `app.js` | ≈ 1.800 | triaje: cliente del modelo, motor local, lote, registro, ficha |
| `gobierno.js` | ≈ 3.350 | panel: fuentes de datos, trazas, secciones, gráficos SVG |
| `cumplimiento.js` | ≈ 660 | `_gobernanza`, datos personales, seudonimización, SHA-256, termómetro |
| `shell.js` | ≈ 660 | marco común y recorrido de la demo |
| `evidencias.js` | ≈ 290 | verificación de citas y siguiente paso |
| `adjuntos.js` | ≈ 190 | parte amistoso en PDF (pdf-lib) y huellas de adjuntos |
| `fraude.js` | ≈ 170 | score antifraude |
| `icons.js` | ≈ 160 | iconos Lucide inline |
| `prompts.js` | ≈ 125 | prompts y bloques de reglas |
| `fechas.js` | ≈ 110 | desplazamiento de fechas al día de hoy |
| `ahorro.js` | ≈ 60 | escenario de ahorro de FinOps |
| `intro.js` | ≈ 45 | navegación de la introducción |
| `vendor/pdf-lib.min.js` | — | pdf-lib 1.17.1 (MIT), se carga al abrir el parte |
