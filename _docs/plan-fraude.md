# Plan · Indicadores de fraude y fechas siempre al día

Estado: **aplicado** · 23/10/2026 · repo `fnol-triage/v2` · decisiones D2–D5 según la recomendación (10 / 3 sin cambios, Paquete A de 13, motor sin agente nuevo, corte de la mañana)

> **Cambios respecto al borrador**
> - Fechas en el texto: en lugar de marcas `⟦…⟧` en la fuente, `fechas.js` reconoce y desplaza las fechas escritas (`dd/mm`, «sábado 12 de septiembre», «el jueves 10», «día 8», `mm/aaaa`). Mismo resultado sin tocar los textos. Las fechas normativas (02/08/2026) no se mueven.
> - No se reordenan las series por día de la semana: movería valores de días con superaciones y eventos fechados y descuadraría las fichas de los caps.
> - Corte de la mañana a las 09:45 (el último evento del lote es de las 09:41), no a las 09:30.
> - Sin cambio de prompt (sigue `reglas v2.3`): el motor detecta las señales de relato con sus citas literales sin pedírselas al modelo.
> - MSG-A-04 no llega a la SIU: el panel ya registra que Pablo está declarado desde 03/2026 (override de L. Prieto), así que IF-11 se anula como **contraindicio** (score 30). Sirve para enseñar que el histórico también resta.
> - MSG-A-11 dice «hace unos meses» en vez de «en marzo», para que el texto no dependa de la fecha.
> - CAP-11 pasa a ser «importe retenido pendiente de verificar» (límite 5.000 €): un cap con límite 0 € siempre estaría superado. La regla «ningún pago a una cuenta sin verificar» la aplica G-11.
> - En el menú la sección se llama «Fraude» (bloque «Riesgo»); el título de la página es «Indicadores de fraude».
> - El 5.º agente, el span `antifraude` en la cascada y las slides quedan fuera. El score se ve en la ficha de la traza y en `_gobernanza.antifraude`.

Dos cambios independientes:

- **A. Sección nueva «Indicadores de fraude»** en el menú lateral del panel de Gobierno, con indicadores de comportamiento predefinidos, escenarios de fraude documentados, CAPs y guardrails antifraude, y escenarios reales dentro del Paquete A.
- **B. Fechas relativas al día de hoy** en mensajes, resultados guardados y dataset del panel, sin romper las reglas de plazo (A2/H2), las citas de las evidencias ni los totales de FinOps.

---

## A. Indicadores de fraude

### A.1 Principios

1. **El indicio no acusa, prioriza.** El lenguaje es siempre «indicio», «patrón compatible con», «requiere verificación». Nunca «fraude», «fraudulento» ni «rechazo» en lo que ve el cliente o en el motivo de la decisión.
2. **La decisión final es humana.** Un score alto escala a la Unidad de Investigación de Siniestros (SIU), pero no rechaza nada por sí mismo (RGPD art. 22).
3. **No se avisa al cliente.** El indicio no aparece en la respuesta al cliente ni en el «siguiente paso recomendado» (guardrail G-12).
4. **Dos fuentes de señal:**
   - *Contenido del mensaje*: lo detecta el agente de Reglas con citas literales, igual que ahora con las evidencias.
   - *Comportamiento*: lo calcula la plataforma de forma determinista cruzando el mensaje con el histórico de siniestros (ficticio) y con el resto de mensajes del lote: IBAN, teléfonos y matrículas compartidos, frecuencia, antigüedad de la póliza y proveedores.
5. **Se mantiene la decisión del triaje (10 aprobados y 3 a revisar)** *(recomendado, ver decisión D2)*. El antifraude es una capa encima con tres niveles:

| Score | Nivel | Acción |
|---|---|---|
| 0–39 | Sin indicios | Solo se registra |
| 40–69 | **Vigilancia** | Se tramita, pero **el pago queda retenido** hasta verificar el punto señalado, y se muestrea a posteriori |
| ≥ 70 | **Escalado a SIU** | No hay despeje automático (G-10). Va a la cola de la SIU con su ficha preparada |

### A.2 Catálogo de indicadores predefinidos (IF-01…IF-12)

Cada indicador tiene un id, un grupo, una señal, una fuente, un peso, los ramos a los que aplica, un interruptor activo/inactivo (como los guardrails) y los disparos de 14 días.

| Id | Grupo | Indicador | Señal | Fuente | Peso |
|---|---|---|---|---|---|
| IF-01 | Temporal | Siniestro poco después del alta | Hecho < 30 días desde el alta de la póliza | Histórico de pólizas | 25 |
| IF-02 | Temporal | Comunicación al límite del plazo o fuera de horario habitual | Comunicación el día 6-7 o patrón repetido de madrugada | Mensaje + fecha de recepción | 10 |
| IF-03 | Relacional | IBAN compartido entre asegurados distintos | El mismo IBAN aparece en siniestros de titulares no relacionados | Cruce entre mensajes e histórico | 35 |
| IF-04 | Relacional | Teléfono o email repetido en varios siniestros | El mismo contacto en ≥ 2 pólizas distintas en 90 días | Cruce | 20 |
| IF-05 | Relacional | Proveedor recurrente en siniestros con indicios | Taller, cristalería o clínica presente en ≥ 3 casos marcados | Listas internas (ficticias) | 15 |
| IF-06 | Historial | Siniestro similar previo sobre el mismo bien | Mismo tipo de daño y mismo vehículo o vivienda en < 12 meses | Histórico de siniestros | 20 |
| IF-07 | Relato | Relato vago en el elemento clave | «no sé cuánto», «creo que», sin lista de bienes ni importe | Mensaje (cita literal) | 15 |
| IF-08 | Relato | Falta de prueba exigible | Robo sin denuncia ni signos de fuerza, vandalismo sin testigos ni cámaras | Mensaje + reglas H4/A7 | 20 |
| IF-09 | Relato | Presión de urgencia y oferta de proveedor propio | «necesito que venga alguien hoy», «puedo ir a mi taller» | Mensaje | 10 |
| IF-10 | Económico | Bienes de alto valor sin justificar | Joyas, electrónica o efectivo por encima del límite y sin factura | Mensaje + H4 | 20 |
| IF-11 | Conductor | Conductor joven no declarado y habitual | Conductor < 25 años, no declarado, con indicios de uso habitual | Mensaje + póliza | 20 |
| IF-12 | Canal | Mismo hecho por dos canales con datos distintos | Duplicado (mismo bien y fecha) con importe o relato diferentes | Cruce | 30 |

Los pesos son ficticios y configurables. La ficha de cada indicador explica también su **tasa de falsos positivos** (histórico de 14 días) y qué no debe interpretarse como indicio.

### A.3 Escenarios de fraude

Ocho escenarios predefinidos. Cada uno es una combinación de indicadores con su narrativa, su umbral, su acción, sus falsos positivos típicos y las normas que le afectan. **Cuatro aparecen en el Paquete A** y los otros cuatro solo en el histórico de 14 días.

| Id | Escenario | Indicadores | Dónde aparece | Score | Nivel |
|---|---|---|---|---|---|
| EF-01 | **Robo sin fuerza en póliza recién contratada** | IF-01, IF-07, IF-08, IF-09, IF-10 | **MSG-A-13** (se modifica) | 85 | SIU |
| EF-02 | **IBAN compartido entre siniestros no relacionados** | IF-03, IF-04 | **MSG-A-09** (se modifica) ↔ MSG-A-02 | 55 / 35 | Vigilancia: pago retenido en A-09; A-02 queda enlazado |
| EF-03 | **Vandalismo recurrente sobre el mismo vehículo** | IF-06, IF-08, IF-09 | **MSG-A-11** (cambio menor) | 45 | Vigilancia |
| EF-04 | **Conductor habitual joven ocultado** | IF-11, IF-06 | **MSG-A-04** (ya va a revisión por A3) | 70 | SIU |
| EF-05 | Colisión concertada (tercero vinculado) | IF-04, IF-05, IF-12 | Histórico | — | — |
| EF-06 | Sobrefacturación de proveedor | IF-05, IF-10 | Histórico | — | — |
| EF-07 | Duplicado multicanal con importe inflado | IF-12 | Histórico (o MSG-A-14, ver D3) | — | — |
| EF-08 | Preexistencia ocultada en Salud | IF-01, más S3 | Histórico | — | — |

**Cambios en el Paquete A** (13 mensajes; los ids, el ramo y la decisión no cambian):

- **MSG-A-13** (robo, WhatsApp). Se añade: «contratamos el seguro hace tres semanas», «las joyas de mi mujer valdrán unos 5.000 €», «la puerta está bien, no está forzada» y «no tenemos facturas, eran heredadas». Sigue en REVISION por H4 y ahora también por H7. Además «este finde» pasa a «estos días que hemos estado fuera», para que el texto no dependa del día de la semana (ver B).
- **MSG-A-09** (cristal, web). Se añade: «Para el pago, la cuenta ES91 2100 0418 4502 0005 1332», que es el mismo IBAN que da Jorge Herrera en MSG-A-02. Sigue DESPEJADO por H5, pero con el pago retenido hasta verificar la titularidad. La capa de cumplimiento detecta un IBAN más.
- **MSG-A-11** (rayón, WhatsApp). Se añade: «ya me pasó algo parecido en marzo en el mismo parking». A8 se sigue cumpliendo (no llega a 3 siniestros en 12 meses) e IF-06 dispara con el histórico ficticio de la póliza AU-742210.
- **MSG-A-04** (conductor hijo). El texto no cambia. El histórico ficticio añade un parte previo de la misma póliza, conducido también por Pablo, que es lo que eleva el caso a SIU.
- El **histórico ficticio** (`fraude.historico`) es nuevo: altas de póliza (HO-604118 con 21 días), siniestros previos (AU-742210 en marzo, AU-119045 en julio) y listas de proveedores. Nada de esto se envía al modelo.

### A.4 CAPs y guardrails alineados con el fraude

Se añaden a los que ya existen, con el mismo formato, su ficha y su tooltip. Aparecen en **FinOps** y en **Guardrails**, y también en la sección de Fraude.

| Id | Ámbito | Tipo | Límite | Acción al superar | Qué cubre |
|---|---|---|---|---|---|
| CAP-08 | Antifraude | Mensajes por remitente o póliza en 24 h | 3 | Activar IF-04/IF-12 y escalar | Frecuencia anómala (comportamiento) |
| CAP-09 | Antifraude | Consultas al fichero sectorial por día | 200 | Encolar; prioridad por score | Coste y uso proporcionado del fichero común (LOSSEAR art. 99) |
| CAP-10 | SIU | Casos escalados a la SIU por día | 15 | Ordenar por score; los < 80 pasan a vigilancia | Capacidad de la unidad: evita saturarla |
| CAP-11 | Pagos | Importe pagado sin verificar la titularidad del IBAN | 0 € | Bloquear el pago | EF-02: ningún pago a una cuenta en entredicho |
| CAP-05 (ya existe) | Reglas | Tokens de razonamiento por traza | 2.000 | — | Se enlaza: el análisis de EF-01 en MSG-A-13 explica parte del razonamiento |

| Id | Agente | Condición | Acción |
|---|---|---|---|
| G-10 | Reglas | Score antifraude ≥ 70 | Sin despeje automático: escalar a la SIU |
| G-11 | Plataforma | IBAN compartido (IF-03) | Retener el pago (CAP-11) |
| G-12 | Reglas | El texto al cliente contiene un indicio o un término acusatorio | Bloquear la salida y regenerar con lenguaje neutro |

Estado inicial coherente con el Paquete A: CAP-11 en «superado» una vez (MSG-A-09 bloqueado), CAP-10 al 40 % (6 de 15 hoy) y CAP-08 sin disparos en el lote.

### A.5 Contenido de la sección «Indicadores de fraude»

Va en el menú lateral, en un bloque nuevo **«Riesgo»** (pregunta: *¿Hay indicios de fraude?*) entre Control y Calidad, con el icono `shield-alert`. También tiene su ficha en Inicio.

1. **KPIs**: mensajes analizados, con indicios (≥ 40), en vigilancia, escalados a SIU, pagos retenidos, confirmación SIU en 14 días e importe en riesgo retenido.
2. **Escenarios de fraude**: tarjetas EF-01…EF-08 con narrativa, indicadores, umbral, acción, falsos positivos y normas. Las que están en el Paquete A llevan «Ver en el lote». La ficha muestra:
   - el texto del mensaje con las citas de los indicadores resaltadas (reutiliza `evidencias.js`);
   - el **desglose del score** en barras por indicador hasta el umbral;
   - triaje frente a antifraude: decisión del triaje, nivel antifraude y acción final;
   - enlace a la traza, al replay y a la cola SIU.
3. **Catálogo de indicadores** IF-01…IF-12: tabla con interruptor, peso editable, disparos de 14 días, falsos positivos y ficha.
4. **Mapa de relaciones** (SVG): personas, pólizas, IBAN, teléfonos, matrículas y proveedores. Se ve el enlace MSG-A-02 ↔ MSG-A-09 por el IBAN y MSG-A-11 ↔ el siniestro de marzo.
5. **Cola SIU**: caso, score, estado (pendiente, en investigación, descartado, confirmado), investigador y tiempo. Enlaza con Intervención humana.
6. **CAPs y guardrails antifraude** (A.4), con su consumo.
7. **Gobierno del modelo antifraude**: falsos positivos por indicador, **equidad por canal** (que WhatsApp no tenga más alertas solo por el tono), explicabilidad, no comunicación al cliente y retención. Normas: RGPD art. 22 y considerando 47, LOPDGDD, LOSSEAR art. 99 y RIA (supervisión humana como buena práctica). **[VALIDAR con Cumplimiento]**.
8. **Evolución de 14 días**: alertas por día y por indicador.

### A.6 Integración con lo que ya existe

- **Triaje (index.html)**: chip «Indicios 85 · SIU» o «Vigilancia» en el registro y bloque «Indicadores de fraude» en la pestaña Reglas de la ficha. El siguiente paso recomendado no menciona el indicio (G-12).
- **Trazas**: span nuevo `antifraude` (local, sin coste de modelo) en la cascada de las 13 trazas; el score va en `_gobernanza.antifraude`.
- **Cumplimiento**: controles nuevos (supervisión humana en el antifraude y no comunicación del indicio).
- **Medidas correctivas**: M-18 «IF-09 dispara más en WhatsApp» con sus alternativas.
- **Histórico**: eventos de escalado, retención de pago y cambio de peso.
- **Recorrido de la demo**: paso nuevo (12 pasos) «Fraude: MSG-A-13 y el IBAN compartido».
- **Fuente «Sesión actual»**: `fraude.js` calcula el score sobre el registro real, así que no depende solo del dataset de demo.

### A.7 Arquitectura

- `fraude.js`: módulo puro como `cumplimiento.js`: indicadores, cruce, score y nivel. Lo usan las dos páginas y se prueba con `make test`.
- `data/gobierno.js` → bloque `fraude: { indicadores, escenarios, historico, evaluaciones, siu, diario }`.
- `prompts.js`: en el prompt base se añade el campo opcional `indicios` (citas literales de las señales de relato IF-07…IF-10) y la versión pasa a **reglas v2.4**. Los resultados guardados del Paquete A incluyen esas citas.
- C4 actualizado en `_docs/arquitectura.md` (componente «Motor de indicadores»).

---

## B. Fechas siempre actualizadas

### B.1 Problema

Hay más de 200 fechas fijas en septiembre de 2026 (líneas con fecha: `mensajes.js` 51, `resultados.js` 44, `gobierno.js` 108, varias con más de una), además de fechas escritas en el texto: «El sábado 12 de septiembre», «Ayer 13/09», «el jueves 10», «Hecho el 12/09, comunicado el 14/09» o «Desactivado el 12/09».

### B.2 Solución: `fechas.js`

- **Ancla**: `2026-09-17` (el «hoy» del dataset; `generado`). Al cargar, `Δ = hoy − ancla` en días enteros.
- **ISO**: un recorrido profundo desplaza Δ días todas las fechas `AAAA-MM-DD[THH:MM:SS]` de `PAQUETES`, `RESULTADOS_GUARDADOS` y `GOBIERNO` antes de que nadie las use. Las horas no cambian.
- **Prosa**: las fechas escritas pasan a ser marcas explícitas en la fuente, por ejemplo `⟦-5|dia_semana_mes⟧` → «sábado 12 de septiembre», `⟦-4|dd/mm⟧` → «13/09», `⟦-7|dia_semana_d⟧` → «jueves 10». Se resuelven a la vez en el mensaje y en las citas de los resultados, así que **las evidencias siguen siendo literales**. El día de la semana se calcula, no se escribe.
- **Lo que no cambia**: los desfases entre el hecho, la recepción y el procesado son los mismos, así que A2/H2 (7 días) dan el mismo resultado y las decisiones no varían. Al modelo le llega el texto ya resuelto, con la fecha de recepción de hoy.
- **Patrón semanal**: las series de 14 días tienen menos volumen en fin de semana. Se **reordenan los valores por día de la semana** (permutación: los totales y los cuadres de FinOps se mantienen), dejando fijos «ayer» y «hoy», que es donde están las alertas.
- **JSON estáticos** (`gobierno-paquete-A.json`, `triage-registro-paquete-A.json`): llevan `"ancla"` y se desplazan al cargarlos. `make datos` los sigue generando en la fecha ancla.
- **Congelar la fecha**: con `?fecha=2026-09-17` (o `?fecha=AAAA-MM-DD`) se fija el día. Se usa en `make capturas` y en los tests, para que las capturas de las slides no cambien.
- **Caso límite**: si se abre antes de las 09:30, las trazas de «hoy» quedan en el futuro. Propuesta: en ese caso el «hoy» del dataset pasa a ser ayer. **[DECIDIR]**

### B.3 Pruebas

- `tests/fechas.test.js`: marcas, cambio de mes y de año, días de la semana y nombres de mes en español.
- Propiedad: durante 400 días seguidos, **todas** las citas de `resultados.js` se encuentran literalmente en su mensaje, y A2/H2 dan el mismo resultado que en la fecha ancla.
- FinOps: suma por agente = `diario` después de reordenar.

---

## Fases

| Fase | Entregable | Esfuerzo |
|---|---|---|
| 1 | `fechas.js`, marcas en mensajes, resultados y gobierno, tests de propiedad | 1 d |
| 2 | Paquete A modificado (A-04, A-09, A-11, A-13), resultados guardados, trazas, razonamiento, `make datos` | 0,5 d |
| 3 | `fraude.js` + histórico ficticio + tests | 1 d |
| 4 | Sección «Indicadores de fraude» (KPIs, escenarios, catálogo, mapa, cola SIU, gobierno, evolución) | 1,5 d |
| 5 | CAP-08…11 y G-10…12 en FinOps y Guardrails; integración en triaje, trazas, cumplimiento, medidas, histórico e Inicio | 1 d |
| 6 | Recorrido (paso 12), README, guía de la demo, C4, prueba en navegador claro/oscuro y plegado | 0,5 d |

Total orientativo: **~5,5 días**. Las slides (v4 y observabilidad) y sus capturas quedan fuera; se regeneran después con `make capturas`.

## Decisiones para ti

- **D2.** ¿Mantenemos 10 aprobados y 3 a revisar, con el antifraude como capa aparte (vigilancia o SIU)? ¿O el antifraude cambia decisiones y pasa a 8 / 5?
- **D3.** ¿Añadimos MSG-A-14 (duplicado multicanal de A-11 con importe inflado) y MSG-A-15 (Salud con preexistencia)? Eso hace 15 mensajes y obliga a cambiar «13» en README, recorrido, slides y JSON.
- **D4.** ¿Motor de indicadores dentro del flujo (sin agente nuevo, recomendado) o un **quinto agente «Antifraude»** con modelo, coste, cap y autonomía propios? El quinto agente encaja mejor con los CAPs de coste, pero obliga a recalcular FinOps y Autonomía.
- **D5.** ¿Fecha exacta todos los días (recomendado, con la serie reordenada por día de la semana)? ¿Y qué hacer si se abre antes de las 09:30?
