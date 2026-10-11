# Plan: la capa de gobierno en la presentación de la sesión, una slide por sección

> Estado (09/10/2026): **implementado** en [slides-sesion-v4.pptx](slides-sesion-v4.pptx) con `build_slides_sesion_v4.py`. Cambio sobre el plan: los títulos de la plantilla no saltan de línea y deben caber antes del logo, así que se acortaron (la slide 12 se titula «Cada agente, inventariado», y la de Intervención humana usa la captura de calidad de la revisión). Decisiones confirmadas: las slides van dentro de la presentación y la demo baja a 20 min (opción A); la slide 13 «Seis pilares» se queda; la seudonimización tiene slide propia; Agentes no tiene slide. Pendiente: confirmar los rótulos de las slides 11 y 12 (apartado 3).
> Afecta a [slides-sesion-v3.pptx](slides-sesion-v3.pptx) y a [slides-sesion.md](slides-sesion.md).

## 1. Qué cuenta hoy la presentación y qué falta

La presentación tiene 16 slides y describe el panel tal como era antes de las últimas semanas. La capa de gobierno aparece en tres sitios: la slide 11 (seis piezas bajo los agentes), la 12 (qué tiene cada agente) y la 13 (seis pilares). La slide 15 anuncia lo que se verá en la demo.

| Concepto | ¿Está? | Dónde |
|---|---|---|
| Trazabilidad, replay, autonomía, guardrails, FinOps, histórico | Sí | Slide 11 (piezas) y 13 (pilares) |
| Identidad, permisos y responsable por agente | Sí | Slide 12 |
| Kill switch | Sí | Slides 13 y 15 |
| **Intervención humana (HITL)**: cola de revisión, revisiones exprés, formación en IA | **No** | La slide 8 cita SCHUFA y el AI Act art. 4, pero la solución no dice cómo se cumple |
| **Knowledge Bases**: salud, comparativa de configuraciones, rúbricas | **No** | |
| **Cumplimiento**: termómetro, bloque `_gobernanza` en cada decisión, cadena SHA-256 | **No** | La slide 13 habla de «Compliance por defecto», pero solo menciona las trazas |
| **Seudonimización antes del modelo** | **No** | Es la respuesta directa al RGPD art. 9 de la slide 8 |
| **Medidas correctivas** y ahorro conseguido | **No** | |
| **Resumen** (vista de dirección con alertas de todas las fuentes) | Solo de pasada | Slide 13, «En la demo: … Resumen» |
| Alertas de coste con su acción | No | La slide 13 dice «Caps, coste por decisión» |

La slide 15 (qué se verá en la demo) tampoco nombra Intervención humana, Knowledge Bases, Cumplimiento ni Medidas correctivas, que sí están en la demo (bloques 10 a 13 de [guion-sesion.md](guion-sesion.md)).

## 2. Qué secciones entran

El menú del panel tiene doce secciones. Van **once slides**, una por sección, más una de **seudonimización antes del modelo**, que no es una sección del menú pero responde al RGPD art. 9. **Agentes** se queda fuera:

- Agentes es el inventario de lo que se gobierna (quién es cada agente, qué modelo usa, qué puede hacer), no una función de gobierno.
- Su contenido de gobierno (identidad, permisos, responsable, versión de modelo y prompt) ya está en la slide 12, «Capa de gobierno: cada agente tiene». Se mantiene ahí.

**Resumen** sí entra: es la observabilidad de la capa de gobierno (estado en vivo, alertas de todas las fuentes y la parada de cada agente).

## 3. Estructura propuesta

| Nº | Slide | Cambio |
|---|---|---|
| 1-10 | Sin cambios | |
| 11 | La solución: agentes pequeños y gobernados | **Rehecha**: arriba, «Lo que se gobierna: cuatro agentes especializados»; abajo, «Capa de gobierno común» con las once secciones en los cinco bloques del menú. Los agentes son el objeto del gobierno, no una pieza de la capa |
| 12 | Cada agente, inventariado: función, modelo, autonomía y responsable | **Solo cambia el título** (antes «Capa de gobierno: cada agente tiene»): es el inventario de agentes, lo que hace la sección Agentes del panel |
| 13 | Seis pilares, cada uno con su prueba | **Se mantiene** en su sitio: presenta los pilares, y las slides siguientes los bajan a cada sección |
| 14-25 | Una slide por sección y una de seudonimización | **Nuevas** (apartado 4) |
| 26-28 | Separador de la demo, «Vamos a verlo», Gracias | La slide de la demo se actualiza con las secciones nuevas |

La slide 11 quedaría así, con los mismos colores y la misma forma de ficha que hoy:

```
Multicanalidad → Clasificación → Extracción → Reglas → Aprobado / A revisar

Capa de gobierno común a todos los agentes
OPERACIÓN          CONTROL               CALIDAD                CUMPLIMIENTO Y COSTE   MEJORA Y AUDITORÍA
Resumen            Autonomía             Razonamiento y replay  Cumplimiento           Medidas correctivas
Trazabilidad       Guardrails            Knowledge Bases        FinOps                 Histórico
                   Intervención humana
```

## 4. Contenido de cada slide nueva

Todas con el mismo diseño, para que se lean como una serie:

- **Título**: el nombre de la sección y una frase con lo que resuelve.
- **Izquierda**: dos bloques. *Qué hace* (descripción técnica, tres líneas) y *Qué gana el negocio* (dos líneas, con una cifra de la demo).
- **Derecha**: la captura de la sección, de `img/observabilidad/`.
- **Pie**: las normas a las que responde y «En la demo: Gobierno › sección».
- **Notas del ponente**: 30-40 segundos de discurso.

Todas las cifras salen del dataset de la demo (`data/gobierno.js`) y coinciden con las capturas.

| Nº | Sección (bloque) | Qué hace (técnico) | Qué gana el negocio | Normas | Captura |
|---|---|---|---|---|---|
| 14 | **Resumen** (Operación) | Ocho KPI en vivo, una tarjeta por agente con su coste frente al cap y su interruptor de pausa, y las alertas de coste, conocimiento y cumplimiento enlazadas a su origen | Dirección ve en diez segundos si el sistema va bien: 81 % de autonomía efectiva y 2,1 % de overrides. Un agente se para sin perder ningún mensaje | AI Act art. 14 · EIOPA | `01-resumen.png` |
| 15 | **Trazabilidad** (Operación) | Una traza por mensaje: cascada de agentes con modelo, tokens, latencia y coste, el guardrail que saltó y la corrección humana si la hubo | Con un identificador se responde al auditor o al reclamante: qué pasó, quién decidió y cuánto costó | AI Act art. 12 · RGPD art. 5.2 y 30 · DORA art. 28 | `03-trazabilidad.png` |
| 16 | **Autonomía** (Control) | Cuatro niveles por agente (L0 Manual a L3 Autónomo) y una auditoría de cada cambio con su motivo, quién lo aprobó y si es reversible | La autonomía se gana con datos y se pierde con datos: Reglas bajó de L3 a L2 cuando su override llegó al 4,1 % | AI Act art. 14 · RGPD art. 22 | `c24-autonomia.png` |
| 17 | **Guardrails** (Control) | Nueve condiciones (confianza, importe, coherencia entre agentes, lesionados, datos que faltan, coste y formato) que escalan, degradan el modelo o marcan la traza. Cada guardrail nuevo se simula antes de activarlo | Las reglas de la aseguradora mandan sobre el modelo: G-02 (importe) saltó 118 veces en 14 días y explica el 62 % de los escalados | AI Act art. 9 y 14 | `15-guardrail-g02.png` |
| 18 | **Intervención humana** (Control) | Cola de revisión con el motivo, el estado y el revisor de cada caso; tiempo de revisión por tramitador y aprobaciones de menos de 30 s; formación en IA de cada tramitador | La supervisión humana se puede demostrar: 3.180 escalados con una mediana de 14 min. El 3,3 % se aprueba en menos de 30 s y tres tramitadores pasan del máximo del 5 % | RGPD art. 22 (SCHUFA) · AI Act art. 14 y 4 | `c40-hitl.png` |
| 19 | **Razonamiento y replay** (Calidad) | Razonamiento registrado por agente (entrada, pasos y salida) y replay de cualquier traza, idéntico o con otro modelo o prompt, con el diff de decisión, coste y latencia | Un cambio de modelo se decide con datos: con gpt-5-mini en Reglas, misma decisión y un 82 % menos de coste (RP-0006); gpt-5-nano cambió un Aprobado por A revisar (RP-0005) | RGPD art. 15 · AI Act art. 15 | `c21-replay.png` |
| 20 | **Knowledge Bases** (Calidad) | Inventario de nueve bases (RAG, Markdown, runbooks, tablas, plantillas), salud medida contra umbrales, comparativa de configuraciones y rúbricas versionadas que actúan como puerta de calidad | El conocimiento envejece y se vigila: 340 condicionados de 2024 bajaron el recall de Condicionados Auto a 0,81; un filtro de vigencia lo sube a 0,88 | AI Act art. 10 · RGPD art. 17 | `32-kb-comparativa.png` |
| 21 | **Cumplimiento** (Cumplimiento y coste) | Bloque `_gobernanza` en cada decisión (datos personales, explicación, sello SHA-256, retención), seudonimización antes del modelo y termómetro por marco con controles medidos y declarados | Evidencia para el DPO recalculada con cada traza: 89 % de cobertura, con los controles en ámbar a la vista. El modelo decide sin ver quién es el asegurado | RGPD art. 5.1.c, 9 y 22 · AI Act art. 12 · DORA · EIOPA | `34-termometro.png` |
| 22 | **Seudonimizar antes del modelo** (Cumplimiento y coste) | Antes de llamar al modelo, nombres, DNI, teléfono, IBAN, póliza, matrícula y dirección se cambian por marcadores ([PERSONA_1], [POLIZA_AU_1]…). Salud y edad de menores se mantienen porque hacen falta para decidir. La tabla de correspondencias solo vive en memoria durante la llamada y la traza guarda los tipos sustituidos y el hash del texto enviado | El modelo decide sin ver quién es el asegurado: en MSG-A-08 viajan 8 marcadores en lugar de datos reales, y el control de minimización del termómetro pasa a verde | RGPD art. 5.1.c, 9, 25 y 32 | `43-enviado-al-modelo.png` |
| 23 | **FinOps** (Cumplimiento y coste) | Caps a cinco niveles (global, agente, traza, razonamiento, llamadas por minuto), alertas de coste con la acción sugerida, coste por modelo y agente, y recomendaciones de ahorro | El coste se controla por decisión: Reglas se lleva el 79 % del gasto; al superar su cap (114 %) pasó solo a un modelo más barato. Cierre de mes previsto: 428 € de 500 € | Solvencia II art. 41 | `c29-acciones.png` |
| 24 | **Medidas correctivas** (Mejora y auditoría) | Una lista de trabajo con los problemas de todas las secciones, ordenada por severidad × impacto ÷ esfuerzo, con alternativas comparadas, quién aprueba y cómo se valida | Cada problema tiene dueño, alternativa y verificación: aplicar M-01 ahorra 237 € al mes; verificar una medida de cumplimiento sube el termómetro | AI Act art. 9 · EIOPA | `37-medidas.png` |
| 25 | **Histórico** (Mejora y auditoría) | Línea de tiempo de alertas, políticas, replays, overrides, despliegues, incidentes y operaciones, con agente, motivo y responsable | El libro de registro que pide el regulador se rellena solo, también con lo que se hace en directo | AI Act art. 12 · EIOPA | `11-historico.png` |

## 5. Cómo se construye

- Fichero nuevo, **`slides-sesion-v4.pptx`**, a partir de la v3, que se conserva como base del script.
- Con `python-pptx` sobre la plantilla de la v3: mismo layout «Text - White», mismas fuentes y mismos iconos Lucide como forma editable.
- La slide 11 se rehace sobre la actual; las once nuevas se generan con un script en `_docs/`, para poder regenerarlas si cambian las capturas.
- Se actualizan [slides-sesion.md](slides-sesion.md), el README y [guion-sesion.md](guion-sesion.md): presentación de unos 22 minutos (12 slides nuevas a 30-40 s) y demo de 20 minutos, quitando de la demo lo que ya se ha contado en las slides (los bloques 5 y 11 del guion, y el bloque 1 a un minuto).

## 6. Decisiones

1. **Duración**: opción A. Las slides van dentro de la presentación (unos 22 minutos) y la demo baja a 20 minutos.
2. **Slide 13 «Seis pilares»**: se queda en su sitio.
3. **Seudonimización**: slide propia (la 22), detrás de Cumplimiento.
4. **Agentes**: sin slide. Su contenido sigue en la slide 12, con un título que dice lo que es (el inventario).
5. **Pendiente**: confirmar los rótulos de la slide 11 («Lo que se gobierna» / «Capa de gobierno común») y el título nuevo de la slide 12.
