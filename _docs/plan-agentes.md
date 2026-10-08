# Plan: sección «Agentes» en observabilidad

> Estado (08/10/2026): **implementado** con las decisiones confirmadas: ficha en el propio panel con una pestaña por agente, modal del agente retirada (todo lleva a la sección), contrato de entrada y salida como bloque plegado «para perfiles técnicos» y posición después de Resumen.

## 1. Por qué

Hoy la información de cada agente está repartida en cuatro sitios: las tarjetas del Resumen, la ficha modal del agente, Guardrails y FinOps (las tarjetas de Autonomía ya se quitaron), y las knowledge bases que consume están en su propia sección. La sección «Agentes» reúne en un solo lugar **todo lo que hay que saber de cada uno de los cuatro**: quién es, qué hace, con qué, cómo rinde, cuánto cuesta, qué lo limita y qué ha cambiado.

## 2. Posición en el menú

Justo después de **Resumen**: Resumen · **Agentes** · Trazabilidad · Reasoning & Replay · Autonomía · Guardrails · Knowledge bases · Termómetro de cumplimiento · FinOps · Histórico. Icono `bot`.

## 3. Diseño

**Arriba, la cadena de los cuatro agentes** (Multicanalidad → Clasificación → Extracción → Reglas) como tarjetas seleccionables. Cada tarjeta muestra el estado, el nivel de autonomía, el kill switch y tres cifras: volumen en 14 días, latencia p95 y coste de hoy frente al cap. Entre tarjetas, una flecha con lo que se pasan (texto normalizado → ramo → 9 campos → decisión).

**Debajo, la ficha del agente seleccionado** en el propio panel, no en un modal, con bloques:

| Bloque | Contenido | Origen del dato |
|---|---|---|
| **Identidad y permisos** | Identidad, credencial, responsable, proveedor y región, qué puede y qué no puede tocar | Ya existe (`identidad`) |
| **Configuración** | Modelo, versión del prompt, reasoning effort, umbral de confianza, variables que le afectan | Ya existe (`modelo`, `prompt`, `variables`) |
| **Contrato de entrada y salida** | Qué recibe y qué devuelve (esquema JSON resumido), con un ejemplo real de una traza del Paquete A | Nuevo, derivado de las trazas |
| **Rendimiento (14 días)** | Volumen, latencia p50 y p95, tasa de JSON válido, reintentos, fallbacks; sparklines | Parte existe (`p95_ms`, modelos); series nuevas |
| **Calidad** | Acierto frente al esperado del Paquete A, confianza media, escalados y overrides, evidencias verificadas por decisión | Calculado de las trazas y de `cumplimiento.js` |
| **Coste** | Coste de hoy frente al cap, coste por mensaje, tokens de entrada, salida y razonamiento; recomendación de FinOps si la hay | Ya existe (FinOps) |
| **Límites** | Guardrails y caps que le aplican, con disparos de 14 días y enlace a cada ficha | Ya existe (Guardrails, caps) |
| **Conocimiento** | Knowledge bases que consume, con su estado de salud y su versión (enlace a la sección KB) | Nueva sección KB |
| **Datos y cumplimiento** | Categorías de datos personales que trata (salud en Extracción y Reglas), normas aplicables y controles del termómetro que dependen de él | `cumplimiento.js` + identidad |
| **Historial** | Cambios de nivel, de modelo y de prompt con su motivo y quién los aprobó | Ya existe (`historial`) |

## 4. Qué cambia en el resto

- **Resumen**: las tarjetas se quedan (vista rápida y kill switch). Un clic lleva a «Agentes» con ese agente seleccionado, en lugar de abrir la ficha modal.
- **Ficha modal del agente**: se retira, porque su contenido pasa a la sección. La ficha que se abre desde Guardrails o FinOps («Ver agente») también lleva a la sección.
- **Autonomía**: se queda con los niveles y la auditoría de cambios de nivel.

## 5. Datos nuevos (`data/gobierno.js`)

Por agente: series de 14 días de volumen, latencia p95 y tasa de JSON válido; latencia p50; contrato de entrada y salida; ids de las KB que consume. El resto se calcula en vivo a partir de las trazas, así que con la fuente «Sesión actual» también refleja el lote real.

## 6. Decisiones que necesito que confirmes

1. ¿La ficha va **en el propio panel** (lo que propongo) o prefieres mantener la modal?
2. ¿Retiramos la modal del agente y todo lleva a la sección?
3. ¿Añadimos el **contrato de entrada y salida** con un ejemplo real? Es útil para perfiles técnicos y alarga la ficha.
4. ¿Te parece bien la posición, después de Resumen?
