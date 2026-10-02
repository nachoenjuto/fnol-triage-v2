# Slides de la sesión FNOL

Dieciséis diapositivas para los 15 minutos de presentación: portada, agenda, cuatro separadores de sección, nueve diapositivas de contenido y cierre. Cada diapositiva de contenido lleva título, contenido, fuentes y notas del ponente. Guion completo en [guion-sesion.md](guion-sesion.md).

Versión en PowerPoint (plantilla Logicalis 2026): [slides-sesion-v3.pptx](slides-sesion-v3.pptx). Iconos de [Lucide](https://lucide.dev), insertados como SVG editable. Las versiones anteriores ([v1](slides-sesion.pptx), [v2](slides-sesion-v2.pptx)) se conservan como referencia.

| Nº | Diapositiva | Tipo |
|---|---|---|
| 1 | FNOL con agentes gobernados | Portada |
| 2 | Agenda | Agenda |
| 3 | 01 · El problema | Separador |
| 4 | La avalancha de avisos | Contenido |
| 5 | Clasificar ya está resuelto | Contenido |
| 6 | El problema real: de piloto a producción | Contenido |
| 7 | 02 · El marco normativo | Separador |
| 8 | Lo que exige la regulación | Contenido |
| 9 | 03 · La solución | Separador |
| 10 | Lo que no existe en el mercado | Contenido |
| 11 | La solución: agentes pequeños y gobernados | Contenido |
| 12 | Capa de gobierno: cada agente tiene | Contenido |
| 13 | Seis pilares, cada uno con su prueba | Contenido |
| 14 | 04 · La demo | Separador |
| 15 | Vamos a verlo | Contenido |
| 16 | Gracias | Cierre |

---

## 1 · Portada

**FNOL con agentes gobernados**
De la IA que clasifica a la IA que se puede poner en producción.
Presentado por Ignacio Sánchez.

> **Notas (0-1 min):** «Hoy no os voy a enseñar que la IA clasifica un siniestro. Eso ya lo sabéis. Os voy a enseñar cómo se pone en producción en una aseguradora.»

---

## 2 · Agenda

01 El problema · 02 El marco normativo · 03 La solución · 04 La demo

---

## 3 · Separador 01 · El problema

Millones de avisos que lee y teclea una persona, y una IA que no sale del piloto.

---

## 4 · La avalancha de avisos

Cinco cifras, cada una con su icono:

| Icono | Cifra | Descripción | Fuente |
|---|---|---|---|
| `car-front` | **~11 M** | siniestros de Auto al año en España | ¹ |
| `timer` | **1 cada 3 s** | ritmo al que el seguro atiende un percance en carretera | ¹ |
| `messages-square` | **5 canales** | email, WhatsApp, chat, formulario web y teléfono | (los que cubre la solución) |
| `calendar-clock` | **7 días** | plazo para comunicar el siniestro (art. 16 LCS) | ² |
| `coins` | **~10 %** | de la prima de Auto se va en gestionar siniestros (EE. UU., 2023) | ³ |

**Cada aviso hay que leerlo, clasificarlo por ramo, extraer los datos y aplicar las reglas de la póliza.**

Fuentes: ¹ [UNESPA, siniestros de automóvil (datos 2024)](https://www.unespa.es/notasdeprensa/siniestros-automovil-datos-2024/) · ² [Ley 50/1980 de Contrato de Seguro, art. 16 (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-1980-22501#a16) · ³ [Insurance Information Institute, Private Passenger Auto Underwriting Expenses (NAIC, 2023)](https://www.iii.org/table-archive/23229)

> **Notas (1-3 min):** «Cada mensaje lo lee, lo clasifica y lo teclea una persona. Ahí se va el tiempo y el dinero. Y el cliente espera respuesta en horas, no en días.»
>
> *Sobre el ~10 %: es el gasto de gestión de siniestros en Auto de particulares en EE. UU. en 2023 (2,3 % defensa y contención de costes + 7,5 % tramitación, sobre prima). No hay dato público equivalente para España. Sustituye al 10-12 % de versiones anteriores, que venía de una fuente secundaria que no lo respaldaba.*

---

## 5 · Clasificar ya está resuelto

Tres tarjetas:

- `target` **Más de un 90 % de acierto**: un prompt bien escrito clasifica por ramo y extrae los datos del aviso.
- `languages` **Con texto real, no de laboratorio**: entiende texto informal, faltas de ortografía y transcripciones telefónicas.
- `clock` **Se monta en una tarde**: un prompt base y un bloque de reglas por ramo. No hace falta entrenar ningún modelo.

`monitor` *En la demo: 51 mensajes de ejemplo de cinco canales (email, formulario web, chat, teléfono y WhatsApp) y tres ramos (Auto, Hogar y Salud).*

Banda roja: **Esto ya no diferencia a nadie.** La pregunta ya no es si la IA puede hacerlo, sino cómo se pone en producción en una aseguradora.

> **Notas (3-4 min):** Ir rápido. La idea es quitar de la mesa la pregunta «¿la IA puede hacerlo?» para pasar a la que importa.

---

## 6 · El problema real: de piloto a producción

| Icono | Cifra | Descripción | Fuente |
|---|---|---|---|
| `flask-conical` | **>90 %** | de las aseguradoras evalúa ya IA generativa | ¹ |
| `rocket` | **22 %** | la tiene en producción | ² |
| `bot` | **4 %** | tiene agentes en producción | ³ |
| `circle-x` | **>40 %** | de los proyectos agénticos se cancelarán antes de finales de 2027 | ⁴ |

**Por qué se cancelan, según Gartner:** `trending-up` costes que se disparan · `circle-help` valor de negocio poco claro · `shield-alert` controles de riesgo insuficientes.

**Tres preguntas sin respuesta:** ¿por qué decidió eso? ¿Quién lo controla? ¿Cuánto cuesta?

Fuentes: ¹ [Conning, AI in Insurance 2025](https://conning.com/about-us/news/ir-pr---ai-survey-2025) · ² [Outcome Catalyst, tendencias de IA en seguros 2026 (datos de Conning)](https://www.outcomecatalyst.com/blog/insurance-ai-data-trends-2026) · ³ [The Insurer, encuesta de IA Capital (2026)](https://www.theinsurer.com/ti/news/openai-dominates-ai-stacks-as-insurance-industry-moves-from-pilot-to-production-2026-05-06/) · ⁴ [Gartner, nota de prensa del 25/06/2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)

> **Notas (4-6 min):** «Los proyectos no mueren porque la IA falle. Mueren porque nadie puede responder tres preguntas: ¿por qué decidió eso?, ¿quién lo controla?, ¿cuánto cuesta?» Estas tres preguntas son el hilo de toda la sesión.
>
> *Pendiente de verificar: el 4 % viene de un artículo de pago de The Insurer y no se ha podido contrastar en la fuente original. Una búsqueda atribuye a Celent que dos tercios de las aseguradoras ya tienen algún proyecto agéntico en producción, lo que lo contradice (informe no consultado). Confirmar antes de presentar o quitar la cifra.*

---

## 7 · Separador 02 · El marco normativo

Lo que ya obliga hoy (RGPD, DORA y EIOPA) y lo que llega con el AI Act.

---

## 8 · Lo que exige la regulación

**Ya en vigor** (seis tarjetas):

- `user-check` **RGPD art. 22**: derecho a no ser objeto de decisiones solo automatizadas. Según el TJUE (SCHUFA), firmar sin revisar no cuenta como intervención humana.
- `message-square-text` **RGPD art. 15**: derecho a una explicación con sentido de la lógica aplicada (TJUE, Dun & Bradstreet).
- `heart-pulse` **RGPD art. 9**: los datos de salud son categoría especial; afecta de lleno al ramo Salud.
- `server` **DORA**: los proveedores de LLM son terceros TIC: registro, riesgo de concentración y contratos.
- `landmark` **EIOPA (ago. 2025)**: gobierno de la IA proporcional al riesgo para todo uso de IA en seguros.
- `graduation-cap` **AI Act art. 4 y art. 50**: alfabetización en IA del personal y transparencia con quien interactúa con la IA.

**Lo que llega** (tres tarjetas con borde discontinuo):

- `scale` **AI Act · alto riesgo (Anexo III)**: obligaciones aplazadas al 2/12/2027 por el Digital Omnibus. El triaje de siniestros no está en el Anexo III.
- `gavel` **Ley Orgánica española de IA**: en el Congreso, con AESIA y la DGSFP como supervisoras.
- `badge-euro` **Sanciones**: hasta 35 M€ o el 7 % de la facturación global.

Línea de tiempo: **Hoy**: ya obligan el RGPD, DORA, EIOPA y los art. 4 y 50 del AI Act → **2/12/2027**: obligaciones de alto riesgo del AI Act.

Fuentes: [RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [TJUE C-634/21 (SCHUFA)](https://curia.europa.eu/juris/liste.jsf?num=C-634/21) · [TJUE C-203/22 (Dun & Bradstreet)](https://curia.europa.eu/juris/liste.jsf?num=C-203/22) · [DORA](https://eur-lex.europa.eu/eli/reg/2022/2554/oj) · [EIOPA, Opinion on AI governance (2025)](https://www.eiopa.europa.eu/eiopa-publishes-opinion-ai-governance-and-risk-management-2025-08-06_en) · [AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) · [Digital Omnibus (Gibson Dunn)](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/) · [Ley Orgánica de IA (Economist & Jurist)](https://www.economistjurist.es/zbloque-1/ley-organica-de-ia-espana-aterriza-el-ai-act-con-aesia-sanciones-y-sandboxes/)

> **Notas (6-9 min):** «Un humano que firma sin mirar no cuenta como supervisión: lo dijo el TJUE. Y el aplazamiento no es una excusa: quien construya sin gobierno ahora lo rehará en 2027.»
>
> *Cuidado: el triaje de siniestros no está en el Anexo III (solo la tarificación y evaluación de riesgo en Vida y Salud). No decir que el AI Act obliga hoy a todo esto; la obligación de hoy viene del RGPD, DORA y EIOPA.*

---

## 9 · Separador 03 · La solución

Agentes pequeños, cada uno con sus límites, sobre una capa de gobierno común.

---

## 10 · Lo que no existe en el mercado

**Hay piezas sueltas** (panel gris):

- `activity` **Observabilidad de LLM**: Langfuse, Arize o Datadog: trazas, latencia y tokens.
- `shield-check` **Plataformas de gobierno y riesgo de IA**: IBM watsonx.governance o Credo AI: inventario y políticas.
- `waypoints` **Estándar OpenTelemetry GenAI**: convenciones comunes para trazar llamadas a modelos.

`plug-zap` **Integración** (en el centro, uniendo los dos paneles)

**Nadie las une a tu negocio** (panel azul):

- `file-text` **Tu proceso de siniestros**: multicanalidad, clasificación, extracción y reglas, de punta a punta.
- `list-checks` **Tus reglas de negocio por ramo**: Auto, Hogar y Salud, con la evidencia de cada criterio.
- `calculator` **Tu contabilidad de costes**: coste por decisión y límites de gasto por agente.

Banda azul: **Esto no es un producto. Es cómo se trabaja hoy con IA en una empresa regulada.** No es una licencia: es una forma de implementar, integrada con el proceso, las reglas y los costes del cliente.

> **Notas (9-10 min):** No decir «no existe nada». Existen herramientas; lo que falta es integrarlas con el negocio del cliente. Si alguien pregunta «¿cuánto cuesta?», la respuesta es que es una forma de implementar, no una licencia.

---

## 11 · La solución: agentes pequeños y gobernados

Proceso en flechas:

1. `inbox` **Multicanalidad**: recibe y normaliza email, web, chat, teléfono y WhatsApp.
2. `tags` **Clasificación**: asigna Auto, Hogar o Salud citando los indicios del texto.
3. `scan-text` **Extracción**: convierte el texto libre en datos estructurados; nunca inventa.
4. `scale` **Reglas**: evalúa el bloque de reglas del ramo y propone la decisión.
5. `user-round-check` **Aprobado / A revisar**: la IA prepara; la persona decide.

**Capa de gobierno**, común a todos los agentes:

| Icono | Elemento | Qué aporta |
|---|---|---|
| `route` | Trazas | cada paso, registrado |
| `history` | Replay | reproducir y comparar |
| `sliders-horizontal` | Autonomía | de L0 Manual a L3 Autónomo |
| `shield` | Guardrails | límites que escalan a humano |
| `wallet` | FinOps | coste por decisión y caps |
| `book-open` | Histórico | libro de registro |

**No es una IA que lo hace todo:** son cuatro especialistas, y cada uno tiene sus propios límites.

> **Notas (10-11 min):** «No es una IA que lo hace todo. Son cuatro especialistas, y cada uno tiene sus propios límites.» Por debajo, la capa de gobierno: trazas, replay, autonomía, guardrails, FinOps e histórico.

---

## 12 · Capa de gobierno: cada agente tiene

Cuatro tarjetas:

- `crosshair` **Una sola función**: recibir, clasificar, extraer o aplicar reglas; cada agente hace una cosa.
- `cpu` **Su modelo y su versión de prompt**: por ejemplo, gpt-5-nano con el prompt v3.1 en Clasificación. Cada cambio queda registrado.
- `gauge` **Su nivel de autonomía**: de L0 Manual a L3 Autónomo, ajustado agente a agente según sus resultados.
- `user-cog` **Un responsable y unos permisos**: el agente de Reglas puede proponer, pero no puede pagar ni rechazar.

**Niveles de autonomía** (escala en flechas, los mismos textos que la demo):

| Nivel | Qué significa |
|---|---|
| L0 · Manual | El agente solo sugiere; una persona decide y ejecuta. |
| L1 · Asistido | El agente propone; una persona confirma cada caso. |
| L2 · Supervisado | Decide dentro de los guardrails; fuera de ellos escala a humano. |
| L3 · Autónomo | Decide y ejecuta; solo se audita a posteriori. |

**La autonomía se gana con datos y se pierde con datos:** el agente de Reglas bajó de L3 a L2 al superar el 3 % de overrides.

> **Notas (11-12 min):** Al final siempre hay un técnico de seguros: la IA prepara, la persona decide.

---

## 13 · Seis pilares, cada uno con su prueba

Cuadrícula de 3 × 2 tarjetas:

| Icono | Pilar | Cómo se consigue | Norma | Dónde se ve en la demo |
|---|---|---|---|---|
| `shield-check` | **Seguro por diseño** | Guardrails, kill switch, identidad y permisos por agente. Se puede parar un agente sin perder ningún mensaje | DORA · AI Act art. 15 | Gobierno › Guardrails, Resumen |
| `file-check` | **Compliance por defecto** | Cada decisión deja una traza completa: qué pasó, quién decidió y cuánto costó | AI Act art. 12 · RGPD art. 30 | Gobierno › Trazabilidad |
| `book-open-check` | **Auditable** | Libro de registro con quién, qué y cuándo. Se rellena solo, sin trabajo extra | EIOPA · AI Act art. 12 | Gobierno › Histórico |
| `lightbulb` | **Explicable** | Regla + evidencia textual y Reasoning replay: si el cliente pregunta por qué, está su propia frase | RGPD art. 15 y 22 · AI Act art. 13 | Ficha del mensaje · Reasoning & Replay |
| `refresh-cw` | **Resiliente** | Reintentos, fallback a motor local y degradación de modelo: si la IA falla, el mensaje no se pierde | DORA | Triaje (origen «fallback»), G-07, G-08 |
| `piggy-bank` | **FinOps** | Caps, coste por decisión y comparativa de modelos: el más barato que mantiene la calidad | Solvencia II (gobierno) | Gobierno › FinOps |

> **Notas (12-14 min):** «Todo lo que voy a decir ahora lo vais a ver funcionando.»

---

## 14 · Separador 04 · La demo

Lo que ve el tramitador y lo que ven riesgos, auditoría y finanzas.

---

## 15 · Vamos a verlo

Dos tarjetas, cada una con una captura real de la demo (Paquete A en «Resultados guardados»):

| | `headset` **Triaje FNOL** | `landmark` **Gobierno de Agentes** |
|---|---|---|
| Público | Lo que ve el tramitador | Lo que ven riesgos, auditoría y finanzas |
| Captura | Triaje con el lote procesado: 10 aprobados, 3 a revisar | Gobierno › Resumen: KPIs, agentes y coste frente al cap |
| Pregunta | ¿Qué hace el sistema con cada aviso? | ¿Podemos fiarnos, controlarlo y pagarlo? |
| Se verá | Un lote en vivo: ramo, datos y decisión en segundos · El criterio que falla y la frase del cliente que lo prueba · Reglas de negocio que se cambian sin programar | Autonomía, overrides y kill switch por agente · Trazas y Reasoning & Replay: por qué decidió y qué pasaría con otro modelo · Guardrails, caps de coste e histórico de cambios |

> **Notas (14-15 min):** «Primero lo que ve el tramitador. Después lo que ve el auditor y el CFO.» Cambiar a la demo con el motor en «Resultados guardados» y el Paquete A seleccionado.

---

## 16 · Gracias

Contraportada con www.logicalis.com.
