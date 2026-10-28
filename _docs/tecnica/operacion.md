# Operación

La demo es estática: HTML, CSS y JavaScript sin build, sin dependencias de ejecución y sin backend. Cualquier servidor de ficheros sirve. Node solo hace falta para las pruebas y los scripts; Python 3, para el servidor local y la composición de capturas.

## Requisitos

| Herramienta | Para qué |
|---|---|
| Navegador actual (Chrome, Edge, Firefox, Safari) | ejecutar la demo |
| Python 3 | `make run` (`python3 -m http.server`) y `scripts/componer-capturas.py` |
| Node 18 o superior | `make test`, `make datos`, `make recorrido`, `make guion-docx`, `make test-ia` |
| Node 22 o superior | `make capturas` (usa el `WebSocket` global para hablar con Chrome) |
| Google Chrome | `make capturas` (lo controla por CDP sin interfaz) |
| npm | solo `make guion-docx`, que instala `docx@9` en una carpeta temporal fuera del repositorio |

Abrir `index.html` con `file://` no funciona del todo: `adjuntos.js` lee las fotos con `fetch` para calcular su SHA-256, y el navegador lo bloquea fuera de HTTP. Hay que servirlo con `make run`.

## Targets del Makefile

| Target | Qué hace |
|---|---|
| `make run` | sirve la demo en `http://localhost:8792` |
| `make test` | ejecuta las 7 suites de `tests/*.test.js` (ver [pruebas.md](pruebas.md)) |
| `make test-ia N=3` | mide las evidencias con un modelo real; necesita `TRIAGE_ENDPOINT` y `TRIAGE_API_KEY` |
| `make datos` | regenera `data/gobierno-paquete-A.json` y `data/triage-registro-paquete-A.json` |
| `make recorrido` | regenera `data/recorrido.js` desde `_docs/guion-demo.md` |
| `make guion-docx` | genera `_docs/guion-demo.docx` y `_docs/guion-demo-corto.docx` desde sus markdown |
| `make capturas` | regenera las capturas de `_docs/img/observabilidad/` y las compuestas; necesita `make run` en otra terminal |

En el desktop de Claude Code, `.claude/launch.json` define `static` (puerto 8792) y `static-alt` (8793) con el mismo servidor.

## Páginas

| URL | Página |
|---|---|
| `intro.html` | introducción en cinco secciones (`#intro`, `#problema`, `#solucion`, `#actores`, `#demo`) |
| `index.html` | triaje |
| `gobierno.html` | panel de Gobierno de Agentes |
| `intro-fnol.html`, `intro-sistema.html` | redirigen a `intro.html#problema` y `#solucion` |

Parámetros útiles:

- `?fecha=AAAA-MM-DD` fija el «hoy» de la demo; `?fecha=ancla` deja los datos como están escritos (17/09/2026). Sirve para capturas reproducibles.

## Orden de carga de los scripts

Los módulos se comunican por variables globales, así que el orden de las etiquetas `<script>` importa. En `index.html`:

```text
icons.js → data/recorrido.js → shell.js → data/mensajes.js → data/resultados.js → data/fraude.js
→ fechas.js → prompts.js → evidencias.js → cumplimiento.js → fraude.js → adjuntos.js → app.js
```

En `gobierno.html`, igual pero con `data/gobierno.js` antes de `data/fraude.js`, sin `adjuntos.js`, con `ahorro.js` y `gobierno.js` al final. Dos dependencias obligatorias:

- `fechas.js` va después de todos los `data/*.js`, porque los desplaza al cargarse, y antes de la lógica.
- `cumplimiento.js` va después de `evidencias.js`, porque lo lee de `window.Evidencias`.

Cada `<script>` lleva `?v=N` para romper la caché del navegador y de GitHub Pages. Al cambiar un fichero hay que subir su número en las páginas que lo cargan.

## Almacenamiento del navegador

No hay cookies ni servidor. El estado vive en la pestaña:

| Almacén | Claves | Duración |
|---|---|---|
| `sessionStorage` | `triage.cfg`, `triage.prompts`, `triage.paquete`, `triage.estrategia`, `triage.seudonimizar`, `triage.motor`, `triage.log` | hasta cerrar la pestaña |
| `sessionStorage` | `gobierno.*` (ver [panel-gobierno.md](panel-gobierno.md#estado-de-la-sesión)), `demo.presentador`, `demo.recorrido` | hasta cerrar la pestaña |
| `localStorage` | `shell.nav`, `demo.recorrido.config`, `demo.recorrido.pos` | permanente en ese navegador |

El panel solo ve la sesión del triaje si se abre en la misma pestaña (el botón de la cabecera navega, no abre otra). `triage.log` guarda el texto completo de los mensajes y la respuesta del modelo; con datos reales, eso sería un tratamiento de datos personales en el equipo del usuario.

## Despliegue

GitHub Pages publica la rama `main` desde la raíz del repositorio `nachoenjuto/fnol-triage-v2`: https://nachoenjuto.github.io/fnol-triage-v2/. Publicar es hacer push a `main`; no hay paso de build.

Antes de publicar:

1. `make test` sin fallos.
2. Si cambiaron datos, `make datos`; si cambió el guion, `make recorrido`.
3. Subir `?v=N` de los ficheros modificados.
4. Comprobar las tres páginas con `make run`, también con el motor «Resultados guardados» y el panel en «Sesión actual».

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| «Red/timeout tras 3 intentos… Revisa el endpoint» | CORS, URL mal formada o ruta de API equivocada | probar otra ruta en «Configurar IA» o pegar la URL completa del portal |
| «HTTP 401» o «HTTP 404» y el lote se para | clave o deployment incorrectos | son errores permanentes a propósito; corregir la configuración |
| Muchos mensajes con «fallback IA» | JSON inválido o salida agotada en razonamiento | revisar el prompt editado; los modelos `gpt-5*` usan `reasoning_effort: low` |
| El panel en «Sesión actual» vuelve a «Demo» | el triaje de esa pestaña no tiene registro | procesar un paquete en la misma pestaña |
| Fechas raras antes de las 09:45 | el «hoy» de la demo es ayer hasta esa hora | es el comportamiento previsto; usar `?fecha=` para fijarlo |
| Cambios que no se ven tras publicar | caché del navegador o de Pages | subir `?v=N` del fichero |
| `tests/recorrido.test.js` falla con «no está al día» | se editó el guion sin regenerar | `make recorrido` |

## Lo que falta para un entorno real

La demo cumple su objetivo sin infraestructura. Llevarla a producción exige, como mínimo:

- un backend que guarde la clave del modelo (identidad administrada), haga de proxy y registre las trazas en un almacén inmutable;
- autenticación de usuarios y permisos por acción sobre los recursos, en lugar del usuario simulado de `shell.js` y del modo presentador con contraseña en el código;
- persistencia de trazas, revisiones y `_gobernanza` con los plazos de retención aplicados de verdad;
- ejecución real de los guardrails y del kill switch en la cadena de decisión;
- CI en GitHub Actions con `make test`, lint y escaneo de secretos, y hooks de pre-commit. Hoy el repositorio no tiene `.github/workflows/` ni `.pre-commit-config.yaml`.
