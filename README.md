# Triage de mensajes — seguros

Demo autosuficiente (HTML + JavaScript, sin backend, sin build) del **triaje de mensajes de clientes** en una aseguradora: clasificación por ramo, extracción de datos y aplicación de reglas de negocio con IA, con trazabilidad de cada decisión, una **capa de cumplimiento normativo** (datos personales, explicabilidad, sellado y retención de cada traza) y un panel de **Gobierno de Agentes** (trazabilidad, Reasoning & Replay, autonomía, guardrails, intervención humana, Knowledge Bases, termómetro de cumplimiento, FinOps y medidas correctivas).

**Demo en vivo:** https://nachoenjuto.github.io/fnol-triage-v2/

## Caso de uso

Llega un paquete de mensajes de clientes (emails, formularios web, chats, transcripciones telefónicas). Para cada mensaje el sistema:

1. **Clasifica el ramo** (Auto, Hogar, Salud).
2. **Extrae los datos** del texto libre (póliza, fecha del hecho, importe, terceros, lesionados, documentación…).
3. **Aplica el bloque de reglas** del ramo y decide: **Aprobado** (`DESPEJADO`, se tramita automáticamente) o **A revisar** (`REVISION`, revisión humana), con el motivo y cada criterio evaluado.
4. **Registra la decisión.**

La pantalla son tres contadores — **aprobados**, **a revisar**, **tiempo medio de ciclo** — más el registro. Al hacer clic en un mensaje se abre su ficha con cinco pestañas: el mensaje con sus **evidencias resaltadas**, los datos extraídos, las reglas de negocio evaluadas, el razonamiento y la **respuesta cruda** del modelo con su bloque de gobierno.

## Paquetes de mensajes

Tres paquetes fijos y mixtos en [`data/mensajes.js`](data/mensajes.js). Cada mensaje lleva un `esperado` (ramo y si debería ir a revisión) que **no se envía a la IA**; solo sirve para contrastar en la ficha y en la columna Ramo (✔/✖).

| Paquete | Mensajes | Auto / Hogar / Salud | A revisar (esperado) |
|---|---|---|---|
| A | 13 | 5 / 4 / 4 | 3 |
| B | 23 | 8 / 8 / 7 | 4 |
| C | 15 | 5 / 5 / 5 | 3 |

Canales: email, formulario web, chat, teléfono y WhatsApp (tres mensajes por paquete, con el tono informal del canal). Cada canal tiene su icono en la lista lateral y en la ficha.

Los mensajes del **Paquete A** son más largos y llevan a propósito datos personales **ficticios** (DNI, teléfonos, direcciones, IBAN, datos de salud, menores y terceros) para que se vean la detección y el tratamiento de la capa de cumplimiento. Cada uno tiene entre 8 y 11 evidencias.

## Prompts y reglas

En [`prompts.js`](prompts.js): un **prompt base** (tarea, extracción, formato JSON) y **tres bloques de reglas** de negocio de seguros (Auto, Hogar, Salud: vigencia, plazo de comunicación del art. 16 LCS, conductor declarado, alcohol, lesionados, daños por agua súbitos vs. filtraciones, robo con fuerza y límites de joyas, carencias, preexistencias, autorización previa, cuadro médico, mutua laboral…). Los cuatro textos se editan en el menú lateral (sección «Prompt») y la llamada a la API usa siempre el texto vigente. La versión del prompt de reglas (`PROMPT_VERSION`, «reglas v2.3») se registra en cada traza.

El modelo devuelve:

```json
{ "ramo": "…", "criterios_ramo": [ "…" ], "datos_extraidos": { … }, "criterios": [ { "regla": "A5", "descripcion": "…", "resultado": "cumple|incumple|no_aplica", "evidencia": "…" } ], "evidencias": [ { "ref": "fecha_hecho", "cita": "…", "nota": "…" } ], "decision": "DESPEJADO|REVISION", "motivo": "…", "confianza": 0.9 }
```

### Estrategia de llamadas

Seleccionable en el menú lateral (sección «Configuración»):

- **1 paso** (por defecto): una única llamada con el prompt base y los tres bloques de reglas.
- **2 pasos**: una llamada corta clasifica el ramo y devuelve sus indicios; la segunda extrae datos y aplica **solo el bloque de reglas de ese ramo**. Menos tokens de entrada, pero dos llamadas y dos razonamientos por mensaje. Si el paso 2 discrepa del ramo del paso 1, el mensaje va a revisión.

La ficha de cada mensaje muestra los tokens de entrada, salida y razonamiento por paso para comparar.

### Evidencias en el texto del mensaje

La ficha resalta en el mensaje los fragmentos en los que se basa cada dato, el ramo y las reglas (numerados, con fondo de color oscuro y texto blanco, y con su explicación). Al pasar el ratón o hacer clic en una evidencia, el título «Evidencias» se sustituye por su tipo; la leyenda de colores se abre desde el botón «Leyenda». El prompt pide entre 5 y 12 evidencias en el campo `evidencias: [{ "ref", "cita", "nota" }]`, con citas **literales** del mensaje; [`evidencias.js`](evidencias.js) las **comprueba** en el texto (exacta o normalizada: mayúsculas, tildes, espacios, comillas) antes de resaltarlas. Una cita que no aparece se marca «no localizada» y no se resalta. Nunca se piden posiciones numéricas al modelo. Si el modelo devuelve menos de 5 verificadas (o el prompt editado no las pide), se completan a partir de los datos extraídos, de las citas entre comillas de los criterios y de patrones de fecha, hora, vehículo con matrícula, centro sanitario y lesiones («reconstruida»). El «siguiente paso recomendado» sale de una tabla fija por regla incumplida, no del modelo.

### Capa de cumplimiento normativo

[`cumplimiento.js`](cumplimiento.js) añade a cada decisión un bloque **`_gobernanza`** calculado por la plataforma (no por el modelo): datos personales detectados (identificativos, contacto, póliza y matrícula, dirección, IBAN, **salud**, **menores** y **terceros**) con su valor seudonimizado o enmascarado en la traza y si se usaron para decidir; explicabilidad (por qué este ramo y por qué no los otros); sello SHA-256 de entrada y salida; plazos de retención; y supervisión humana, cada parte con la norma a la que ayuda (AI Act, RGPD, LOPDGDD, LCS). Cada traza registra además las **knowledge bases** y versiones que usó. La ficha lo muestra en color en «Respuesta cruda» (con el conmutador «Salida del modelo / + Gobierno», los campos con datos personales marcados y la norma de cada clave al pasar el ratón) y el panel lo agrega en el **Termómetro de cumplimiento**. Las dos páginas usan el mismo módulo, así que la traza, los hashes y los datos coinciden.

**Seudonimización antes de enviar al modelo** (casilla de Configuración, activada por defecto; RGPD art. 4.5 y 5.1.c): antes de cada llamada, nombres, DNI, NIE, teléfono, email, IBAN, póliza, matrícula, dirección y expediente se sustituyen por marcadores estables (`[PERSONA_1]`, `[DNI_1]`, `[POLIZA_AU_1]`, que conserva el prefijo del ramo). Los datos de salud y la edad de los menores se mantienen porque hacen falta para decidir. El prompt (`PROMPT_SEUDONIMOS` en [`prompts.js`](prompts.js)) pide copiar los marcadores tal cual, y al volver la respuesta la plataforma reconstruye los valores reales en los datos extraídos y en las citas. La tabla de correspondencias solo vive en memoria durante la llamada. «Respuesta cruda» tiene una vista **Enviado al modelo** con los marcadores resaltados. `_gobernanza.datos_personales.envio_al_modelo` registra cuántos datos se sustituyeron, de qué tipo y el hash del texto enviado. Con «Resultados guardados» se simula sobre la respuesta guardada. En el panel, con la fuente «Sesión actual», el control de minimización pasa a verde y la medida M-08 se da por verificada.

Pruebas (sin dependencias, requieren Node): `make test`. Tras cambiar mensajes o resultados guardados, `make datos` regenera los JSON de `data/`.

## Reproducción sin llamar al modelo

En el menú lateral, **Motor de triaje** permite elegir:

- **Automático**: IA si hay clave; si no, motor local.
- **Resultados guardados**: reproduce las fichas de [`data/resultados.js`](data/resultados.js), generadas con IA para los 51 mensajes con el mismo esquema que devuelve el modelo (ramo, indicios, datos extraídos, criterios con evidencia, decisión, motivo, confianza y tokens). Cada mensaje tarda entre 3 y 5 s, con el mismo estado en vivo, pausa y reinicio.
- **Archivo cargado**: con **Reproducir desde archivo** puedes cargar un JSON generado con «Exportar JSON» de un lote real y repetirlo con la misma cadencia.

## Motor local (sin IA)

Sin clave, la demo funciona en modo degradado: ramo por palabras clave, extracción por expresiones regulares y reglas heurísticas. Sirve para ver el flujo; la demo brilla con IA. Si una llamada a la IA falla por un error transitorio o una respuesta no válida, ese mensaje cae al motor local y se marca en el registro.

## Uso

1. Abre la demo.
2. Opcional: ⚙ **Configurar IA** con endpoint, deployment y clave de Azure AI Foundry. Todo se guarda solo en `sessionStorage` (se borra al cerrar la pestaña).
3. Elige un paquete en el menú lateral y, si quieres, edita los prompts («Editar en grande» los abre en un editor ancho). El menú se pliega con el botón de su pie (queda solo con iconos) y el estado se mantiene al pasar al panel de gobierno.
4. **Procesar paquete**. Puedes **pausar / continuar**; **Reiniciar lote** cancela y vacía el registro.
5. Filtra por ramo o solo a revisar, ordena por columnas, abre la ficha de cualquier fila, exporta a JSON/CSV.
6. **Gobierno de Agentes** (botón de la cabecera) abre el panel de gobernanza de los agentes; con «Sesión actual» enseña las trazas del lote que acabas de procesar.

### Endpoint y ruta de API

Pega la URL base del recurso o la URL completa del portal de Foundry (p. ej. `https://<recurso>.services.ai.azure.com/openai/v1/responses`); se extrae el origen y se selecciona la ruta automáticamente.

| Ruta | URL que se construye | api-version |
|---|---|---|
| v1 | `{origen}/openai/v1/chat/completions` | no necesita |
| Responses API | `{origen}/openai/v1/responses` | no necesita |
| Clásica | `{origen}/openai/deployments/{deployment}/chat/completions` | `2024-10-21` |
| Foundry Models | `{origen}/models/chat/completions` | `2024-05-01-preview` |

Compatibilidad: para modelos de razonamiento (`gpt-5*`, `o*`) no se envían `temperature` ni `max_tokens`; cualquier parámetro que el modelo rechace con 400 se retira y se reintenta. Reintentos con backoff exponencial (base 2 s, tope 32 s, máx. 5) para 429/5xx; errores permanentes (400/401/403) abortan el lote.

## Estructura

```
index.html        UI del triaje: conexión IA, menú lateral, contadores, registro, ficha modal
app.js            motor local, cliente Azure, procesamiento con pausa, registro, render
prompts.js        prompt base + bloques de reglas Auto / Hogar / Salud
evidencias.js     evidencias del mensaje: anclado de citas, respaldo sin IA y siguiente paso (lógica pura, probada con `make test`)
cumplimiento.js   capa de cumplimiento: datos personales, explicabilidad, SHA-256, retención, termómetro (lógica pura, probada con `make test`)
cumplimiento.css  JSON coloreado con metadatos de gobierno y marcas de datos personales (lo usan las dos páginas)
tests/            pruebas de evidencias.js, cumplimiento.js y del recorrido de la demo; medición con un modelo real (ia-real.js)
scripts/          generar-datos.js: regenera los JSON de data/ (`make datos`) · capturas.mjs y componer-capturas.py: capturas de las slides con Chrome sin interfaz (`make capturas`)
Makefile          `make run` (servidor local), `make test`, `make datos` y `make capturas`
icons.js          iconos Lucide compartidos (lucide(name) + hidratación de [data-lucide])
styles.css        estilos del triaje (claro/oscuro, responsive)
header.css        marco común de las dos páginas: cabecera, barra de fases, menú lateral y pie
shell.js          comportamiento del menú lateral común (plegado, usuario y botón al pie) y recorrido de la demo (modo presentador con contraseña, demo automática y subtítulos)
gobierno.html     panel «Gobierno de Agentes» (portada Inicio y once secciones en el menú lateral)
gobierno.js       render del panel: fuentes de datos, trazas, replay, gráficos SVG
gobierno.css      estilos del panel (mismos tokens que styles.css)
data/mensajes.js  tres paquetes de mensajes
data/resultados.js fichas de triaje guardadas para reproducción
data/recorrido.js guion del recorrido de la demo: 10 pasos con su acción y los subtítulos por defecto (técnico-funcional y negocio/cumplimiento)
data/gobierno.js  dataset de demostración del panel (Paquete A + 14 días, Knowledge Bases, rúbricas, controles declarados y medidas correctivas)
data/gobierno-paquete-A.json      el mismo dataset, para «Cargar JSON» en el panel
data/triage-registro-paquete-A.json  13 fichas del Paquete A en formato «Exportar JSON», para «Reproducir desde archivo»
_docs/            arquitectura (C4 en Mermaid), guía de referencia de la demo, guion de la sesión, planes (cumplimiento, Knowledge Bases, agentes, portada y medidas correctivas) y slides (sesión FNOL y observabilidad y gobierno de la IA agéntica)
```

## Gobierno de Agentes

`gobierno.html` es el panel de control agéntico del triaje: gobernanza con trazabilidad y observabilidad de los cuatro agentes (Multicanalidad, Clasificación por ramo, Extracción de datos, Reglas de negocio). Se abre en una portada, **Inicio**, y tiene once secciones en el mismo menú lateral plegable que el triaje (mismo ancho, 248 px; plegado, solo iconos):

| Sección | Qué muestra |
|---|---|
| **Inicio** | portada: estado actual (alertas, cumplimiento, KB sanas) y una ficha por sección agrupada en los mismos cinco bloques que el menú lateral (operación, control, calidad, cumplimiento y coste, mejora y auditoría), con dos cifras en vivo y normas, y una etiqueta de estado (al día, revisar, atención) salvo en Resumen, Trazabilidad y Reasoning & Replay; interruptor **Modo presentador**, que activa el **Recorrido de la demo** (panel flotante en las dos páginas con los 10 pasos del guion y un «Ir» que lleva a la pantalla exacta) |
| **Resumen** | 8 KPI (mensajes, autonomía efectiva, escalados, overrides, coste vs cap mensual, alertas, **cumplimiento** y **conocimiento**), tarjetas de agentes (modelo, prompt, nivel de autonomía, estado, coste del día vs cap, **kill switch** funcional), coste diario frente al cap, **alertas de todas las fuentes** (coste, knowledge bases y cumplimiento, cada una enlazada a su origen), bloques de cumplimiento y de conocimiento, y últimas trazas con sus datos personales y KB usadas; clic en una traza abre su **ficha explicada** (qué llegó, qué hizo cada agente, decisión, coste, y el botón «Cumplimiento»); clic en un agente lleva a su pestaña en **Agentes** |
| **Agentes** | los cuatro agentes como pestañas en el orden de la cadena (con lo que se pasan entre ellos) y, para el seleccionado, su ficha completa: cabecera con modelo, prompt, trazas, latencia p50/p95, coste frente al cap, escalado, override y **kill switch**; identidad y permisos; configuración, guardrails y caps; rendimiento y coste de 14 días y comportamiento por modelo; calidad propia de cada agente con un **índice de calidad** (círculo de porcentaje con el color del semáforo, media de sus indicadores medibles) y una barra por indicador; knowledge bases que consume; datos personales que trata; histórico; últimas trazas; y, plegado, el **contrato de entrada y salida** con un ejemplo real de una traza |
| **Trazabilidad** | panel de detalle **fijo arriba de la sección** (waterfall de spans por agente, guardrail disparado, override humano) que no se oculta al recorrer la lista; lista de trazas filtrable por agente, canal, decisión y resultado; «Ver razonamiento» y «Replay» abren Reasoning & Replay con esa traza |
| **Razonamiento y replay** | la misma lista de trazas (colapsable, con filtros) y, para la seleccionada, el razonamiento estructurado por agente (entrada → pasos → salida) y el replay idéntico o what-if (otro modelo o versión de prompt) con diff de decisión, coste y latencia; histórico de replays |
| **Autonomía** | KPI de autonomía, niveles L0 Manual · L1 Asistido · L2 Supervisado · L3 Autónomo coloreados de rojo a verde con los agentes de cada nivel, y auditoría de cambios de nivel (las tarjetas de los agentes están en el Resumen y su ficha completa, en **Agentes**) |
| **Guardrails** | condiciones que limitan la autonomía (G-01…G-09): agente, condición, acción, severidad, disparos por día y toggle activo/inactivo; ficha de detalle por guardrail, alta de **nuevos guardrails** y últimos disparos enlazados a su traza. Cualquier referencia a un guardrail o cap (G-04, CAP-03) en el panel muestra su descripción al pasar el ratón |
| **Intervención humana** | supervisión humana (HITL) en una sola sección: escalados (causas, ranking de guardrails, por día), overrides (tasa con el umbral del 3 %, por agente, motivos), **cola de revisión** con estado, revisor y tiempo, **calidad de la revisión** (revisiones exprés de menos de 30 s, por tramitador y su formación en IA), mecanismos de supervisión enlazados a su sección y medidas correctivas relacionadas. Los KPI de escalados y overrides del Resumen llevan aquí |
| **Knowledge Bases** | inventario de índices RAG, Markdown, runbooks, tablas y plantillas con su salud frente a umbrales (recall, fidelidad, citas, frescura, obsoletos, duplicados, deriva, datos personales); ficha con configuración (chunk, solapamiento, embeddings, índice, top-k, híbrida, reranker), **comparativa de configuraciones**, evaluación, fuente, uso y versiones; **rúbricas editables** (criterios con pesos y preguntas de referencia, versionadas) |
| **Cumplimiento** (termómetro) | cobertura de controles por marco (RIA · AI Act, RGPD y LOPDGDD, DORA, EIOPA y Solvencia II) con termómetros; matriz norma → qué exige → cómo se resuelve → medida, separando controles **medidos** en las trazas y **declarados**; ciclo de vida de una traza con sus plazos; inventario de datos personales por mensaje con ficha (texto resaltado, hallazgos, bloque `_gobernanza`); cadena de integridad SHA-256 con «Simular una alteración»; seudonimizar frente a anonimizar; exportación de evidencias. Las medidas verificadas en Medidas correctivas ponen sus controles en verde |
| **FinOps** | KPI con detalle por clic; **acciones correctivas** propuestas por cada cap superado («Aplicar» o «Solicitar aprobación», con registro en el histórico); caps de consumo (global, por agente, por traza, tokens de razonamiento, llamadas/minuto) con consumo y acción al superar, **ficha de cada cap** (agentes implicados, histórico de superaciones) y alta de **nuevos caps**; coste diario por agente, tokens por agente, sección de **modelos** (proveedor, precio, agentes que lo usan, llamadas, tokens, coste, latencia y éxito: JSON válido, sin reintento, estable en replay, precisión) con coste por modelo × agente y tokens por modelo; las leyendas de los gráficos activan y desactivan series; recomendaciones de ahorro |
| **Medidas correctivas** | una lista de trabajo con los problemas que detecta el resto del panel (coste, conocimiento, cumplimiento, calidad y resiliencia), cada uno con sus **alternativas** (impacto, efecto secundario, esfuerzo, quién aprueba y cómo se valida), ordenada por prioridad (severidad × impacto ÷ esfuerzo) o por severidad, con filtros y «Victorias rápidas»; «Simular», «Aplicar» o «Solicitar aprobación» y «Marcar como verificada», que actualiza el Termómetro (círculo arriba a la derecha). El KPI **Ahorro conseguido** sube al aplicar las medidas de coste (y muestra lo pendiente de aprobación). Las acciones de coste comparten estado con las correctivas de FinOps |
| **Histórico** | línea de tiempo de alertas, políticas, replays, overrides, despliegues, incidentes y operaciones (kill switch, guardrails, acciones sobre las knowledge bases y rúbricas editadas) |

Fuentes de datos (selector de la cabecera):

- **Demo**: `data/gobierno.js`, datos inventados coherentes con los 13 mensajes del Paquete A (mismos ids, ramo, decisión, confianza y tokens que `data/resultados.js`) más 14 días de histórico.
- **Sesión actual**: convierte el registro del triaje de esta pestaña (`sessionStorage`) en trazas reales: tokens y pasos → spans, ciclo, decisión, confianza, fallback como incidencia y coste según la tabla de precios por modelo. Cada traza conserva el id y el bloque `_gobernanza` de la ficha del triaje (en «Resultados guardados» del Paquete A, los mismos TRZ-4F2A… de la demo). Histórico, caps, guardrails y knowledge bases siguen siendo de demostración.
- **Archivo JSON**: «Cargar JSON» con el esquema de `data/gobierno-paquete-A.json` (`agentes[]` con `historial`, `modelos` y `variables`; `trazas[]` con `spans` y `motivo`; y opcionalmente `caps`, `politicas` con `descripcion`, `severidad`, `disparos_dia` y `ultimos`, `razonamiento`, `replays`, `diario`, `eventos`, `modelos`, `knowledge`, `rubricas`, `cumplimiento_declarado`…); las secciones ausentes se toman de la demo. «Exportar trazas» descarga el dataset activo con ese mismo esquema.

Todos los iconos de la web (triaje y panel) son [Lucide](https://lucide.dev) (licencia ISC), inline desde `icons.js`. Los números de paso de la barra de fases son círculos dibujados con CSS (Lucide no tiene iconos de número).

## Guía de referencia

[`_docs/guia-demo.md`](_docs/guia-demo.md) describe cada pantalla y sección de la demo (qué muestra, qué se puede hacer y para qué sirve) e incluye un guion de demo de 12 minutos. [`_docs/guion-sesion.md`](_docs/guion-sesion.md) es el guion de la sesión completa (presentación y demo).

[`_docs/slides-observabilidad.md`](_docs/slides-observabilidad.md) es una presentación genérica sobre observabilidad y gobierno de la IA agéntica, ilustrada con capturas del panel de gobierno. Su versión en PowerPoint ([`slides-observabilidad.pptx`](_docs/slides-observabilidad.pptx), plantilla Logicalis, 81 slides) se genera con `python3 _docs/build_slides_observabilidad.py`. Las capturas se regeneran con `make capturas` (con `make run` en marcha y Google Chrome instalado).

## Despliegue

GitHub Pages sirve la rama `main` desde la raíz.

## Licencia

MIT
