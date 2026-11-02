# Panel de Gobierno de Agentes

`gobierno.html` + `gobierno.js` (≈ 3.350 líneas) + `gobierno.css`. Pinta un dataset con el esquema de `GOBIERNO_DEMO` (ver [modelo-datos.md](modelo-datos.md#dataset-del-panel-gobierno_demo)). No tiene backend ni librerías de gráficos: todo el HTML y los SVG se generan como cadenas en el propio script.

## Qué es real y qué es simulado

El panel describe una cadena de cuatro agentes (Multicanalidad → Clasificación → Extracción → Reglas). El triaje de `index.html` hace una o dos llamadas al modelo, no cuatro. Esta tabla separa lo que el panel calcula de lo que solo representa:

| Elemento | Origen |
|---|---|
| `_gobernanza`, termómetro (controles medidos), cadena de hashes | calculado con `cumplimiento.js` sobre los mensajes y las respuestas |
| Score antifraude, niveles, pagos retenidos | calculado con `fraude.js` sobre el lote |
| Escenario de ahorro de FinOps | calculado con `ahorro.js` |
| Coste de cada traza | calculado: tokens de los spans × `precios` |
| Trazas con la fuente «Sesión actual» | convertidas del registro real del triaje |
| Override y validación desde la ficha del triaje | reales en la sesión; cambian la tasa de override |
| 14 días de histórico, caps, alertas, modelos, KB, rúbricas | datos inventados en `data/gobierno.js` |
| Guardrails G-01…G-12 | descritos y contados; `app.js` no los ejecuta |
| Kill switch | cambia el estado del agente en el panel; no detiene el triaje |
| Replay idéntico y what-if | simulado con factores fijos (ver abajo) |
| Aplicar o aprobar una acción correctiva | cambia el estado en la sesión y los KPI; no toca ninguna configuración |

Lo inventado es coherente con el Paquete A: mismos ids, ramo, decisión, confianza y tokens que `data/resultados.js`.

## Fuentes de datos

Selector `#fuente` de la cabecera, `setFuente(f)`:

| Fuente | `G` (dataset activo) |
|---|---|
| `demo` | `GOBIERNO_DEMO` |
| `sesion` | `GOBIERNO_DEMO` con `trazas` = `trazasDesdeSesion()`, dos agentes extra (`ia`, `local`), los eventos y la propuesta de autonomía que salen de la sesión, y el resto igual que en la demo |
| `archivo` | `{ ...GOBIERNO_DEMO, ...json }`: mezcla superficial, cada clave de primer nivel ausente en el JSON se toma de la demo |

`cargarArchivo()` aplica `Fechas.alDia()` y exige `agentes[]` y `trazas[]` con `id` y `spans` en cada traza. «Exportar trazas» descarga `G` tal cual.

### De registro del triaje a trazas

`trazasDesdeSesion()` lee `sessionStorage['triage.log']` (mismo origen y misma pestaña que el triaje) y genera una traza por entrada:

| Entrada | Spans |
|---|---|
| IA en 2 pasos | `multicanal` 40 ms + `clasificacion` (30 % de la duración) + `reglas`, con los tokens de cada paso |
| IA en 1 paso | `multicanal` 40 ms + `ia` con los tokens totales |
| Motor local | `multicanal` 40 ms + `local` sin tokens |

El modelo de precio se deduce del deployment guardado en `triage.cfg`: `nano` → gpt-5-nano, `mini` → gpt-5-mini, cualquier otro → gpt-5. El id de la traza es el de `_gobernanza.trazabilidad.traza_id` o `TRZ-S001`, `TRZ-S002`… `resultado` vale `override`, `humano` (REVISION) o `auto`. Un `origen` con «fallback» se convierte en incidencia.

Si la entrada no tiene acción humana pero su id coincide con una traza de la demo que sí la tiene (motor «Resultados guardados»), se conserva la de la demo con la hora desplazada al inicio de la sesión. Por eso la revisión de MSG-A-04 sigue en la cola.

## Render

`renderAll()` recalcula los índices (`AG` por agente, `POL` por guardrail y cap), las entradas de cumplimiento y el score antifraude, y vuelve a pintar todas las secciones. Se llama al cambiar de fuente y después de cualquier acción que cambie estado (kill switch, aplicar una medida, editar un indicador).

| Sección (`gobierno.html`) | Función | Datos que usa |
|---|---|---|
| Inicio | `renderInicio` | estado compartido de alertas, termómetro y KB |
| Resumen | `renderResumen` | `kpis.resumen`, agentes, `diario`, alertas de todas las fuentes, trazas |
| Agentes | `renderAgentes` | agente seleccionado, sus trazas, `historial`, `modelos`, KB y contrato de E/S |
| Trazabilidad | `listaTrazas('t')`, `renderDetalle` | `trazas`, spans |
| Autonomía | `renderAutonomia` | `niveles`, `cambios_autonomia`, tasa de override |
| Guardrails | `renderGuardrails` | `politicas` + guardrails creados en la sesión |
| Intervención humana | `renderHitl` | trazas con `revision`/`override`, guardrails, cola |
| Fraude | `renderFraude` | `Fraude.evaluar()` sobre el lote + `FRAUDE_DEMO` |
| Razonamiento y replay | `listaTrazas('r')`, `renderSteps`, `renderDiff`, `renderReplays` | `razonamiento`, `replays` |
| Knowledge Bases | `renderKnowledge` | `knowledge`, `rubricas` |
| Cumplimiento | `renderCumplimiento` | `Cumplimiento.termometro()` + `cumplimiento_declarado` |
| FinOps | `renderFinops`, `renderCharts`, `renderFinGraf` | `caps`, `modelos`, `diario`, `precios`, `kpis.negocio` |
| Medidas correctivas | `renderMedidas` | `medidas` + estado de la sesión |
| Histórico | `renderHistorico` | `eventos` + eventos de la sesión |

### Entradas de cumplimiento

`entradasCumplimiento()` decide sobre qué se calcula el termómetro:

- Fuente `sesion` con registro: las entradas del triaje con su `_gobernanza` (o se recalcula con `gob_opts`).
- Cualquier otro caso: para cada traza de `G` con mensaje y ficha guardada, reconstruye la entrada con `expandirResultadoGuardado()` y calcula `_gobernanza` con el `traza_id` de la traza, el modelo del span `reglas` y `PROMPT_VERSION`. El resultado es idéntico al que muestra la ficha del triaje en «Resultados guardados».

### Lote antifraude

`loteFraude()` usa el registro de la sesión o, si no, los mensajes de la demo que tienen traza. Tras una revisión humana, la decisión vigente es la del tramitador. `evaluarFraude()` llama a `Fraude.evaluar()` con el catálogo modificado en la sesión (`frCatalogo()`: pesos, interruptores e indicadores nuevos).

## Cálculos del panel

**Coste de un span**: `(tokens_in × precio_in + (tokens_out + tokens_razonamiento) × precio_out) / 1e6`, en €. El razonamiento se cobra a precio de salida. Los modelos sin precio cuestan 0.

**Tasa de override**: `Cumplimiento.tasaOverride()`, umbral `UMBRAL_OVERRIDE` = 3 %. En la fuente «Sesión actual», cada override hecho en la ficha suma a la tasa del agente Reglas; por encima del umbral aparece una alerta y una propuesta de bajarlo de nivel, pendiente de aprobación.

**Replay** (`renderDiff`): no vuelve a llamar al modelo. Aplica factores fijos sobre el coste y la latencia de la traza original:

| Modelo del what-if | Coste | Latencia | Decisión |
|---|---|---|---|
| sin cambios (idéntico) | ×1 | ×1,06 | igual |
| gpt-5-mini | ×0,18 | ×0,59 | igual |
| gpt-5-nano | ×0,04 | ×0,45 | pasa a `DESPEJADO` si la original era `REVISION` (se muestra como regresión) |
| gpt-5 con prompt v2.4 | ×0,82 | ×0,88 | igual |

**Ahorro estimado** (`ahorro.js · calcular()`): coste de un mensaje manual = salario bruto × (1 + SS) × (1 + estructura) / (horas de convenio × productividad) / 60 × minutos por mensaje. Ahorro bruto = automatizados × coste + escalados × coste × `ahorro_escalados`. Neto = bruto − coste de IA. Con los valores por defecto (28.000 €, 1,32, 15 %, 1.700 h, 80 %, 8 min, 40 %) un mensaje manual cuesta 4,17 €. Las hipótesis vienen de `kpis.negocio`, se editan en la ficha y no se guardan.

**Índice de calidad de un agente**: media de sus indicadores medibles sobre las trazas y sus `_gobernanza`, en un círculo con el color del semáforo.

**Medidas correctivas**: prioridad = severidad × impacto ÷ esfuerzo. Una medida pasa a `verificada` a mano o sola, cuando todos sus `controles` ya están en verde en el termómetro con las trazas de la fuente activa (por ejemplo M-08 con la seudonimización activa). Al verificarla, sus controles se ponen en verde y se recalculan los porcentajes (`termometroGob`). Las medidas de coste comparten estado con las acciones correctivas de los caps de FinOps.

## Estado de la sesión

Todo lo que el usuario cambia en el panel se guarda en `sessionStorage` de la pestaña y se pierde al cerrarla:

| Clave | Contenido |
|---|---|
| `gobierno.estados` | kill switch por agente: `{ id: 'activo' \| 'pausado' }` |
| `gobierno.agente` | pestaña seleccionada en Agentes |
| `gobierno.caps_nuevos`, `gobierno.gr_nuevos` | caps y guardrails creados |
| `gobierno.correctivas` | acciones de FinOps: `{ 'CAP-03:1': 'aplicada' \| 'pendiente' }` |
| `gobierno.medidas` | `{ 'M-01': { estado, alt, sim } }` |
| `gobierno.kb_acciones`, `gobierno.rubricas` | acciones sobre KB y rúbricas editadas (sube la versión menor) |
| `gobierno.fraude_cfg`, `gobierno.fraude_nuevos` | peso e interruptor de cada indicador, e indicadores creados |

El panel lee además `triage.log` y `triage.cfg`, que escribe el triaje.

## Gráficos e interacción

- Gráficos SVG inline con tooltip: barras, barras apiladas, líneas con área, anillos, medidores semicirculares y termómetros. Las leyendas activan y desactivan series (`ocultos`, `tokOcultos`).
- Las animaciones de las fichas solo empiezan con el texto final ya escrito: sin JavaScript o con `prefers-reduced-motion` se ve el valor final.
- Las ventanas emergentes que se abren desde una lista llevan «‹ n de N ›» y responden a ← →.
- Cualquier código de guardrail o cap (G-04, CAP-03) en un texto se envuelve con un tooltip de su descripción, a partir de `POL`.
- Las etiquetas de norma usan el catálogo `NORMAS` de `cumplimiento.js`, el mismo que la ficha del triaje.

## Menú lateral y recorrido

`shell.js` es común a las tres páginas: menú plegable (estado en `localStorage['shell.nav']`), usuario simulado (`Shell.USUARIO`) y el Recorrido de la demo (modo presentador). El recorrido lee `RECORRIDO_DEMO`, ejecuta las acciones de cada paso («Ir», clics, esperas) y muestra subtítulos filtrables por tipo. El modo presentador se desbloquea con una contraseña cuyo SHA-256 está en el código: es un cierre de presentación, no un control de acceso. La configuración y los textos editados del recorrido se guardan en `localStorage` (`demo.recorrido.config`, `demo.recorrido.pos`) y el estado del recorrido en `sessionStorage` (`demo.presentador`, `demo.recorrido`).
