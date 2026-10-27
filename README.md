# Triage de mensajes — seguros

Demo autosuficiente (HTML + JavaScript, sin backend, sin build) del **triaje de mensajes de clientes** en una aseguradora: clasificación por ramo, extracción de datos y aplicación de reglas de negocio con IA, con trazabilidad de cada decisión, una **capa de cumplimiento normativo** (datos personales, explicabilidad, sellado y retención de cada traza) y un panel de **Gobierno de Agentes** (trazabilidad, autonomía, guardrails, intervención humana, razonamiento y replay, Knowledge Bases, termómetro de cumplimiento, FinOps y medidas correctivas).

**Demo en vivo:** https://nachoenjuto.github.io/fnol-triage-v2/

## Caso de uso

Llega un paquete de mensajes de clientes (emails, formularios web, chats, transcripciones telefónicas). Para cada mensaje el sistema:

1. **Clasifica el ramo** (Auto, Hogar, Salud).
2. **Extrae los datos** del texto libre (póliza, fecha del hecho, importe, terceros, lesionados, documentación…).
3. **Aplica el bloque de reglas** del ramo y decide: **Aprobado** (`DESPEJADO`, se tramita automáticamente) o **A revisar** (`REVISION`, revisión humana), con el motivo y cada criterio evaluado.
4. **Registra la decisión.**

La pantalla son tres contadores — **aprobados**, **a revisar**, **tiempo medio de ciclo** — más el registro. Al hacer clic en un mensaje se abre su ficha con cinco pestañas: el mensaje con sus **evidencias resaltadas**, los datos extraídos, las reglas de negocio evaluadas, el razonamiento y la **respuesta cruda** del modelo con su bloque de gobierno. Si el mensaje trae adjuntos, aparece una sexta pestaña, **Adjuntos** (ver «Adjuntos»).

## Paquetes de mensajes

Tres paquetes fijos y mixtos en [`data/mensajes.js`](data/mensajes.js). Cada mensaje lleva un `esperado` (ramo y si debería ir a revisión) que **no se envía a la IA**; solo sirve para contrastar en la ficha y en la columna Ramo (✔/✖).

| Paquete | Mensajes | Auto / Hogar / Salud | A revisar (esperado) |
|---|---|---|---|
| A | 13 | 5 / 4 / 4 | 3 |
| B | 23 | 8 / 8 / 7 | 4 |
| C | 15 | 5 / 5 / 5 | 3 |

Canales: email, formulario web, chat, teléfono y WhatsApp (tres mensajes por paquete, con el tono informal del canal). Cada canal tiene su icono en la lista lateral y en la ficha.

Los mensajes del **Paquete A** son más largos y llevan a propósito datos personales **ficticios** (DNI, teléfonos, direcciones, IBAN, datos de salud, menores y terceros) para que se vean la detección y el tratamiento de la capa de cumplimiento. Cada uno tiene entre 8 y 11 evidencias.

Cuatro mensajes del Paquete A llevan **escenarios de fraude** (ver «Indicadores de fraude»): MSG-A-13 (robo sin fuerza en una póliza de tres semanas, joyas sin factura), MSG-A-09 y MSG-A-02 (piden el pago a la misma cuenta), MSG-A-11 (rayón repetido en el mismo parking) y MSG-A-04 (conductor joven, anulado porque la póliza lo tiene declarado). La decisión del triaje no cambia: 10 aprobados y 3 a revisar.

### Adjuntos

MSG-A-01 (email del golpe en la M-30) trae tres adjuntos: la **declaración amistosa de accidente** en PDF y **dos fotos** de los daños (paragolpes y faro delanteros derechos). Ningún otro mensaje lleva adjuntos.

- **El parte** no es un PDF fijo: [`adjuntos.js`](adjuntos.js) lo genera en el navegador con [pdf-lib](https://pdf-lib.js.org) (copiado en `vendor/pdf-lib.min.js`, se carga solo al abrir el adjunto) a partir de `adjuntos[].contenido` de [`data/mensajes.js`](data/mensajes.js). Como `fechas.js` desplaza ese contenido igual que el mensaje, la fecha del parte siempre coincide con la del email. La generación es determinista: mismos datos, mismos bytes.
- **Las fotos** están en `data/adjuntos/`. Se generaron con un modelo de imagen para la demo; la matrícula no es legible.
- **Pestaña «Adjuntos»** de la ficha: miniaturas, visor (el PDF con el visor del navegador; las fotos con zoom por botones, clic o Ctrl + rueda, y arrastre) y un panel con los datos extraídos de cada adjunto y su **contraste** con el texto del mensaje (coincide, no consta o discrepa, con la cita del email).
- **Respuesta cruda**: la salida del modelo lleva un campo `adjuntos` con esos datos (los del tercero, marcados como dato personal). Con «+ Gobierno», `_gobernanza.adjuntos` registra cada archivo con su tamaño y su SHA-256 (calculado al recibirlo), los datos personales leídos en el parte, ya enmascarados, y que la seudonimización **solo se aplica al texto**: los adjuntos llegan al modelo con los datos que contengan. «Enviado al modelo» lista los archivos.
- **Motores**: con «Resultados guardados» los datos vienen de [`data/resultados.js`](data/resultados.js) (`adj`). Con un modelo en vivo todavía no se envían los adjuntos (fase 1): sus datos se toman de los resultados guardados y la ficha lo indica. El motor local no lee adjuntos.

### Fechas siempre al día

Los datos están escritos con «hoy» = 17/09/2026. [`fechas.js`](fechas.js) los desplaza al cargar la página hasta el día de hoy: fechas ISO, `dd/mm`, «sábado 12 de septiembre», «el jueves 10», «el pasado día 8» y `mm/aaaa`, recalculando el día de la semana. Las horas no cambian y los desfases entre hecho, recepción y procesado se mantienen, así que A2/H2 dan el mismo resultado y las citas de las evidencias siguen siendo literales. Antes de las 09:45 el «hoy» de la demo es ayer, porque el lote se procesa entre las 09:02 y las 09:41. Con `?fecha=AAAA-MM-DD` se fija el día (`?fecha=ancla` deja los datos como están escritos), útil para capturas. Las fechas normativas (AI Act art. 50, 02/08/2026) no se mueven. Los JSON de `data/` llevan `ancla` y se desplazan al cargarlos.

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
intro.html        introducción en cuatro secciones (#problema, #solucion, #actores, #demo): sustituye a las slides de contexto antes de la demo
intro-fnol.html / intro-sistema.html  redirigen a intro.html#problema y #solucion (enlaces antiguos)
intro.css / intro.js estilos, cambio de sección y arranque de la introducción (mismo marco que el triaje)
index.html        UI del triaje: conexión IA, menú lateral, contadores, registro, ficha modal
app.js            motor local, cliente Azure, procesamiento con pausa, registro, render
prompts.js        prompt base + bloques de reglas Auto / Hogar / Salud
evidencias.js     evidencias del mensaje: anclado de citas, respaldo sin IA y siguiente paso (lógica pura, probada con `make test`)
cumplimiento.js   capa de cumplimiento: datos personales, explicabilidad, SHA-256, retención, termómetro (lógica pura, probada con `make test`)
cumplimiento.css  JSON coloreado con metadatos de gobierno y marcas de datos personales (lo usan las dos páginas)
fraude.js         motor de indicadores de fraude: score antifraude sin IA, con citas literales y cruces del lote y del histórico (lógica pura, probada con `make test`)
fechas.js         fechas siempre al día: desplaza los datos de la demo hasta hoy (lógica pura, probada con `make test`)
adjuntos.js       adjuntos de los mensajes: genera el parte amistoso en PDF con pdf-lib, sirve los archivos al visor y calcula su SHA-256
vendor/           pdf-lib 1.17.1 (MIT), cargado bajo demanda para generar el parte
data/adjuntos/    fotos de los daños de MSG-A-01
tests/            pruebas de evidencias.js, cumplimiento.js, fraude.js, fechas.js, adjuntos.js y del recorrido de la demo; medición con un modelo real (ia-real.js)
scripts/          generar-datos.js: regenera los JSON de data/ (`make datos`) · capturas.mjs y componer-capturas.py: capturas de las slides con Chrome sin interfaz (`make capturas`)
Makefile          `make run` (servidor local), `make test`, `make datos` y `make capturas`
icons.js          iconos Lucide compartidos (lucide(name) + hidratación de [data-lucide])
styles.css        estilos del triaje (claro/oscuro, responsive)
header.css        marco común de las dos páginas: cabecera, barra de fases, menú lateral y pie
shell.js          comportamiento del menú lateral común (plegado, usuario y botón al pie) y recorrido de la demo (modo presentador con contraseña, demo automática, subtítulos y subpasos con sus acciones, esperas y teclas Re Pág / Av Pág)
gobierno.html     panel «Gobierno de Agentes» (portada Inicio y trece secciones en seis bloques del menú lateral)
gobierno.js       render del panel: fuentes de datos, trazas, replay, gráficos SVG
gobierno.css      estilos del panel (mismos tokens que styles.css)
data/mensajes.js  tres paquetes de mensajes
data/resultados.js fichas de triaje guardadas para reproducción
data/recorrido.js pasos del recorrido de la demo (24) con su acción, sus clics y 189 subtítulos por tipo; generado desde _docs/guion-demo.md con `make recorrido`
scripts/generar-recorrido.js genera data/recorrido.js a partir del guion
scripts/generar-guion-docx.js genera los Word de los dos guiones (`make guion-docx`)
data/gobierno.js  dataset de demostración del panel (Paquete A + 14 días, Knowledge Bases, rúbricas, controles declarados y medidas correctivas)
data/fraude.js    indicadores de fraude: catálogo IF-01…IF-12, escenarios EF-01…EF-08, histórico ficticio de pólizas y siniestros, cola de la SIU y evolución de 14 días
data/gobierno-paquete-A.json      el mismo dataset, para «Cargar JSON» en el panel
data/triage-registro-paquete-A.json  13 fichas del Paquete A en formato «Exportar JSON», para «Reproducir desde archivo»
_docs/            arquitectura (C4 en Mermaid), guía de referencia de la demo, guion de la sesión, planes (cumplimiento, Knowledge Bases, agentes, portada y medidas correctivas) y slides (sesión FNOL y observabilidad y gobierno de la IA agéntica)
```

## Gobierno de Agentes

`gobierno.html` es el panel de control agéntico del triaje: gobernanza con trazabilidad y observabilidad de los cuatro agentes (Multicanalidad, Clasificación por ramo, Extracción de datos, Reglas de negocio). Se abre en una portada, **Inicio**, y tiene trece secciones en el mismo menú lateral plegable que el triaje (mismo ancho, 248 px; plegado, solo iconos). El menú las agrupa en seis bloques con encabezado: **Operación** (Resumen, Agentes, Trazabilidad), **Control** (Autonomía, Guardrails, Intervención humana), **Riesgo** (Fraude), **Calidad** (Razonamiento y replay, Knowledge Bases), **Cumplimiento y coste** (Cumplimiento, FinOps) y **Mejora y auditoría** (Medidas correctivas, Histórico):

| Sección | Qué muestra |
|---|---|
| **Inicio** | portada: estado actual (alertas, cumplimiento, KB sanas) y una ficha por sección agrupada en los mismos cinco bloques que el menú lateral (operación, control, calidad, cumplimiento y coste, mejora y auditoría), con una cifra grande en vivo, su detalle y sus normas; el estado solo se marca cuando hay algo que mirar (punto verde si está al día, etiqueta «Revisar» o «Atención» si no), salvo en Resumen, Trazabilidad, Razonamiento y replay y Guardrails; interruptor **Modo presentador**, que activa el **Recorrido de la demo** (panel flotante en las páginas de introducción, el triaje y el panel con los 22 pasos de `_docs/guion-demo.md`, un «Ir» que lleva a la pantalla exacta, sus clics y subtítulos que se pueden filtrar por tipo) |
| **Resumen** | 8 KPI (mensajes, autonomía efectiva, escalados, overrides, coste vs cap mensual, alertas, **cumplimiento** y **conocimiento**), tarjetas de agentes (modelo, prompt, nivel de autonomía, estado, coste del día vs cap, **kill switch** funcional), coste diario frente al cap, **alertas de todas las fuentes** (coste, knowledge bases y cumplimiento, cada una enlazada a su origen), bloques de cumplimiento y de conocimiento, y últimas trazas con sus datos personales y KB usadas; clic en una traza abre su **ficha explicada** (qué llegó, qué hizo cada agente, decisión, coste, y el botón «Cumplimiento»); clic en un agente lleva a su pestaña en **Agentes** |
| **Agentes** | los cuatro agentes como pestañas en el orden de la cadena (con lo que se pasan entre ellos) y, para el seleccionado, su ficha completa: cabecera con modelo, prompt, trazas, latencia p50/p95, coste frente al cap, escalado, override y **kill switch**; identidad y permisos; configuración, guardrails y caps; rendimiento y coste de 14 días y comportamiento por modelo; calidad propia de cada agente con un **índice de calidad** (círculo de porcentaje con el color del semáforo, media de sus indicadores medibles) y una barra por indicador; knowledge bases que consume; datos personales que trata; histórico; últimas trazas; y, plegado, el **contrato de entrada y salida** con un ejemplo real de una traza |
| **Trazabilidad** | panel de detalle **fijo arriba de la sección** (waterfall de spans por agente, guardrail disparado, override humano) que no se oculta al recorrer la lista; lista de trazas filtrable por agente, canal, decisión y resultado (incluido «Con intervención humana»); «Ver razonamiento» y «Replay» abren Razonamiento y replay con esa traza |
| **Autonomía** | KPI de autonomía, niveles L0 Manual · L1 Asistido · L2 Supervisado · L3 Autónomo coloreados de rojo a verde con los agentes de cada nivel, y auditoría de cambios de nivel (las tarjetas de los agentes están en el Resumen y su ficha completa, en **Agentes**) |
| **Guardrails** | condiciones que limitan la autonomía (G-01…G-12; G-10 a G-12 son antifraude): agente, condición, acción, severidad, disparos por día y toggle activo/inactivo; ficha de detalle por guardrail, alta de **nuevos guardrails** y últimos disparos enlazados a su traza. Cualquier referencia a un guardrail o cap (G-04, CAP-03) en el panel muestra su descripción al pasar el ratón |
| **Fraude** (Indicadores de fraude) | indicadores de comportamiento predefinidos (IF-01…IF-12) que un motor sin IA ([`fraude.js`](fraude.js)) calcula cruzando cada mensaje con el lote y con un histórico ficticio de pólizas y siniestros; score de 0 a 100 con tres niveles (sin indicios, **vigilancia** desde 40 con el pago retenido, **SIU** desde 70 sin despeje automático). KPI, casos del lote con su score frente a la decisión del triaje, **escenarios de fraude** EF-01…EF-08 (narrativa, indicadores, umbral, acción, falsos positivos y normas; los del lote con «Ver»), **mapa de relaciones** (casos → cuenta, proveedor o póliza → expedientes del histórico), **cola de la SIU**, catálogo con interruptor y peso editable (recalcula el lote en la sesión) y **Nuevo indicador** (formulario con frases que lo activan, peso, grupo y ramos, y vista previa de qué mensajes del lote cambiarían de nivel), guardrails G-10…G-12 y caps CAP-08…CAP-11 antifraude, evolución de 14 días, **equidad por canal** y gobierno del modelo. Ficha por caso con el desglose del score, las citas resaltadas en el mensaje, los contraindicios y el seguimiento. El indicio no cambia la decisión del triaje ni se comunica al cliente |
| **Intervención humana** | supervisión humana (HITL) en una sola sección: escalados (causas, ranking de guardrails, por día), overrides (tasa con el umbral del 3 %, por agente, motivos), **cola de revisión** con estado, revisor y tiempo, **calidad de la revisión** (revisiones exprés de menos de 30 s, por tramitador y su formación en IA), mecanismos de supervisión enlazados a su sección y medidas correctivas relacionadas. Los KPI de escalados y overrides del Resumen llevan aquí |
| **Razonamiento y replay** | la misma lista de trazas (colapsable, con filtros) y, para la seleccionada, el razonamiento estructurado por agente (cadena con lo que pasa de uno a otro, mensaje con las citas usadas como evidencia, pasos por tipo y un gráfico por agente: confianza por ramo, origen de cada campo extraído, matriz de reglas con el camino a la decisión y tokens frente al CAP-05) y el replay idéntico o what-if (otro modelo o versión de prompt) con diff de decisión, coste y latencia; histórico de replays |
| **Knowledge Bases** | inventario de índices RAG, Markdown, runbooks, tablas y plantillas con su salud frente a umbrales (recall, fidelidad, citas, frescura, obsoletos, duplicados, deriva, datos personales); ficha con configuración (chunk, solapamiento, embeddings, índice, top-k, híbrida, reranker), **comparativa de configuraciones**, evaluación, fuente, uso y versiones; **rúbricas editables** (criterios con pesos y preguntas de referencia, versionadas) |
| **Cumplimiento** (termómetro) | cobertura de controles por marco (RIA · AI Act, RGPD y LOPDGDD, DORA, EIOPA y Solvencia II) con termómetros; matriz norma → qué exige → cómo se resuelve → medida, separando controles **medidos** en las trazas y **declarados**; ciclo de vida de una traza con sus plazos; inventario de datos personales por mensaje con ficha (texto resaltado, hallazgos, bloque `_gobernanza`); cadena de integridad SHA-256 con «Simular una alteración»; seudonimizar frente a anonimizar; exportación de evidencias. Las medidas verificadas en Medidas correctivas ponen sus controles en verde |
| **FinOps** | KPI con detalle por clic; bajo los KPI, **gasto de cada agente** frente a su cap diario y **desglose del coste por tipo de token** (entrada, salida, razonamiento, voz) con las recomendaciones que afectan a cada agente; **alertas de coste**: qué pasó y cuándo, qué cap la disparó y qué hizo, y la acción sugerida («Aplicar», «Solicitar aprobación» o «Deshacer», con registro en el histórico); caps de consumo (global, por agente, por traza, tokens de razonamiento, llamadas/minuto) con consumo, acción al superar y las alertas que han disparado, **ficha de cada cap** (agentes implicados, histórico de superaciones) y alta de **nuevos caps**; coste diario por agente, tokens por agente, sección de **modelos** (proveedor, precio, agentes que lo usan, llamadas, tokens, coste, latencia y éxito: JSON válido, sin reintento, estable en replay, precisión) con coste por modelo × agente y tokens por modelo; las leyendas de los gráficos activan y desactivan series; recomendaciones de ahorro |
| **Medidas correctivas** | una lista de trabajo con los problemas que detecta el resto del panel (coste, conocimiento, cumplimiento, calidad y resiliencia), cada uno con sus **alternativas** (impacto, efecto secundario, esfuerzo, quién aprueba y cómo se valida), ordenada por prioridad (severidad × impacto ÷ esfuerzo) o por severidad, con filtros y «Victorias rápidas»; «Simular», «Aplicar» o «Solicitar aprobación» y «Marcar como verificada», que actualiza el Termómetro (círculo arriba a la derecha); «Deshacer», «Quitar simulación» y «Quitar verificación» vuelven atrás para ver bajar los KPI. El KPI **Ahorro conseguido** sube al aplicar las medidas de coste (y muestra lo pendiente de aprobación). Las acciones de coste comparten estado con las correctivas de FinOps |
| **Histórico** | línea de tiempo de alertas, políticas, replays, overrides, despliegues, incidentes y operaciones (kill switch, guardrails, acciones sobre las knowledge bases y rúbricas editadas) |

Todas las ventanas emergentes tienen el mismo tamaño en las dos páginas. Las que se abren desde una lista llevan «‹ 3 de 13 ›» (y las flechas ← →) para pasar al elemento anterior o siguiente, y sus gráficos se animan al abrir, navegar o cambiar de pestaña.

Fuentes de datos (selector de la cabecera):

- **Demo**: `data/gobierno.js`, datos inventados coherentes con los 13 mensajes del Paquete A (mismos ids, ramo, decisión, confianza y tokens que `data/resultados.js`) más 14 días de histórico.
- **Sesión actual**: convierte el registro del triaje de esta pestaña (`sessionStorage`) en trazas reales: tokens y pasos → spans, ciclo, decisión, confianza, fallback como incidencia y coste según la tabla de precios por modelo. Cada traza conserva el id y el bloque `_gobernanza` de la ficha del triaje (en «Resultados guardados» del Paquete A, los mismos TRZ-4F2A… de la demo). Histórico, caps, guardrails y knowledge bases siguen siendo de demostración.
- **Archivo JSON**: «Cargar JSON» con el esquema de `data/gobierno-paquete-A.json` (`agentes[]` con `historial`, `modelos` y `variables`; `trazas[]` con `spans` y `motivo`; y opcionalmente `caps`, `politicas` con `descripcion`, `severidad`, `disparos_dia` y `ultimos`, `razonamiento`, `replays`, `diario`, `eventos`, `modelos`, `knowledge`, `rubricas`, `cumplimiento_declarado`…); las secciones ausentes se toman de la demo. «Exportar trazas» descarga el dataset activo con ese mismo esquema.

Todos los iconos de la web (triaje y panel) son [Lucide](https://lucide.dev) (licencia ISC), inline desde `icons.js`. Los números de paso de la barra de fases son círculos dibujados con CSS (Lucide no tiene iconos de número).

## Guía de referencia

[`_docs/guia-demo.md`](_docs/guia-demo.md) describe cada pantalla y sección de la demo (qué muestra, qué se puede hacer y para qué sirve) e incluye un guion de demo de 12 minutos. [`_docs/guion-demo-corto.md`](_docs/guion-demo-corto.md) es su versión de bolsillo (mismos pasos y tiempos, frase clave y viñetas con lo que se dice, y los mensajes que se enseñan). [`_docs/guion-demo.md`](_docs/guion-demo.md) es el guion paso a paso de la demo de 30-35 minutos (introducción en las cuatro secciones de `intro.html`, triaje y las trece secciones de gobierno, cada paso con su mensaje del Paquete A, el texto para decir y su valor de negocio). [`_docs/guion-sesion.md`](_docs/guion-sesion.md) es el guion de la sesión completa (presentación y demo). La presentación es [`slides-sesion-v4.pptx`](_docs/slides-sesion-v4.pptx) (28 slides, con una por sección de gobierno); se genera a partir de la v3 con `python3 _docs/build_slides_sesion_v4.py` y su contenido está en [`slides-sesion.md`](_docs/slides-sesion.md).

[`_docs/slides-observabilidad.md`](_docs/slides-observabilidad.md) es una presentación genérica sobre observabilidad y gobierno de la IA agéntica, ilustrada con capturas del panel de gobierno. Su versión en PowerPoint ([`slides-observabilidad.pptx`](_docs/slides-observabilidad.pptx), plantilla Logicalis, 84 slides) se genera con `python3 _docs/build_slides_observabilidad.py`. Las capturas se regeneran con `make capturas` (con `make run` en marcha y Google Chrome instalado).

## Despliegue

GitHub Pages sirve la rama `main` desde la raíz.

## Licencia

MIT
