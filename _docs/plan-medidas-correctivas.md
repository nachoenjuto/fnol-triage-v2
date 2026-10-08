# Plan: sección «Medidas correctivas» en observabilidad

> Estado (08/10/2026): **implementado** con las decisiones confirmadas: al final del menú, antes de Histórico; orden por prioridad o por severidad (a elegir); paso «Marcar como verificada», que actualiza el Termómetro (círculo arriba a la derecha de la sección); las acciones correctivas siguen también en FinOps, con el estado compartido.

## 1. Qué es

Una sección que responde a una sola pregunta: **¿qué hay que hacer para que el sistema esté sano?** Es decir, sin sobrecostes, sin riesgos normativos abiertos, con las knowledge bases sanas y con los agentes rindiendo como deben.

Reúne en una sola lista de trabajo los problemas detectados en todo el panel, cada uno con **sus alternativas de corrección**: a veces hay más de una, como cambiar de modelo o cambiar el prompt.

No se inventa nada nuevo: cada problema sale de lo que ya miden otras secciones. Así coincide siempre con Inicio, Resumen, FinOps, Knowledge bases y el Termómetro.

## 2. Posición en el menú

Justo después de **Resumen**, con el icono `wrench`. En Inicio se añade su ficha en un grupo nuevo, **Corregir**: «¿Qué hay que hacer para que el sistema esté sano?», con «N medidas abiertas · X €/mes de ahorro posible».

## 3. De dónde salen los problemas (una sola fuente)

| Dimensión | Origen | Problemas de la demo |
|---|---|---|
| **Coste** | Caps superados o en aviso y sus acciones correctivas (las mismas de FinOps, con el mismo estado) | CAP-03 (Reglas al 114 %), CAP-04 y CAP-05 (coste y razonamiento por traza), CAP-01 al 87 % |
| **Conocimiento** | KB degradadas o críticas (motivos de su salud) y rúbricas con acuerdo bajo | KB-06 Red de talleres caída, KB-02 con recall a la baja, KB-04 con datos personales y huecos, KB-09 sin aviso de IA, R-04 con acuerdo juez-humano 0,84 |
| **Cumplimiento** | Controles parciales del Termómetro | Minimización (RGPD 5.1.c), EIPD pendiente (RGPD 35), aviso de IA en WhatsApp (AI Act 50), formación (AI Act 4), pruebas de sesgo (EIOPA), supresión en índices (RGPD 17) |
| **Calidad y autonomía** | Overrides, agentes degradados o con nivel bajado, guardrails inactivos | Override de MSG-A-04 (dato de conductores no accesible al modelo), Reglas bajó de L3 a L2, G-09 inactivo |
| **Resiliencia** | Incidencias de las trazas | Ráfagas de 429 del proveedor de IA |

## 4. Diseño

### 4.1 Cabecera (KPI)

- **Medidas abiertas**, con cuántas son críticas.
- **Ahorro posible** (€/mes), si se aplican las alternativas recomendadas de coste.
- **Riesgos normativos abiertos**, con los artículos afectados.
- **KB por sanear.**
- **Aplicadas en el periodo**, que es el progreso.

### 4.2 Filtros

Por **dimensión** (Coste, Conocimiento, Cumplimiento, Calidad, Resiliencia), por **severidad**, por **estado** (abierta, en curso, pendiente de aprobación, aplicada) y por **agente**. Además, un conmutador **«Victorias rápidas»**: esfuerzo bajo e impacto alto.

### 4.3 Lista priorizada

Una tarjeta por problema, ordenadas por **prioridad = severidad × impacto ÷ esfuerzo**:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ ● CRÍTICO · Coste · Agente de Reglas                                 Abierta   #1     │
│ Reglas de negocio supera su cap diario (13,70 € / 12 €, 114 %)                         │
│ Gasta el 79 % del coste total. Hoy actúa la degradación automática (G-07).   Ver en FinOps → │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ Alternativas                                                                          │
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐   │
│ │ ★ Recomendada           │ │ Cambiar el prompt       │ │ Subir el cap            │   │
│ │ gpt-5-mini en despeje   │ │ reasoning effort «low»  │ │ de 12 € a 14 €          │   │
│ │ directo (A7/H5/S6)      │ │ (prompt v2.4)           │ │                         │   │
│ │ −7,9 €/día · −237 €/mes │ │ −35 % razonamiento      │ │ +2 €/día de margen      │   │
│ │ Esfuerzo bajo           │ │ Esfuerzo bajo           │ │ Esfuerzo bajo           │   │
│ │ Validado: RP-0006       │ │ Validado: RP-0008       │ │ Requiere Comité IA      │   │
│ │ [Simular] [Aplicar]     │ │ [Simular] [Aplicar]     │ │ [Solicitar aprobación]  │   │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Cada **alternativa** lleva:
- **qué se hace**;
- **impacto estimado:** € ahorrados, puntos de recall, controles que pasan a verde;
- **efecto secundario o riesgo**: por ejemplo, «menos precisión en casos con lesionados»;
- **esfuerzo:** bajo, medio o alto;
- **quién la aprueba:** automática, el responsable del agente o de la KB, el Comité IA o el DPO;
- **cómo se valida antes de aplicarla:** con un replay What-if, con la rúbrica de la KB o con la vista previa de un cap o un guardrail.

Las acciones son **Simular**, **Aplicar** y **Solicitar aprobación**. Son simuladas, como el resto del panel: cambian el estado y dejan un evento en el Histórico.

### 4.4 Detalle

Un clic en el problema abre su ventana, con flechas para pasar al siguiente. Muestra la evidencia (la cifra, la serie de 14 días y las trazas afectadas), las alternativas comparadas lado a lado y el **antes y después** esperado de cada una: coste, recall o estado del control.

### 4.5 Al aplicar

- **El problema pasa a «En curso» o «Pendiente de aprobación».**
- **El estado se comparte con su origen:** aplicar una medida de coste aquí la marca también en FinOps, y al revés, porque se guarda en el mismo sitio.
- **Coherencia con el resto del panel:** Inicio y Resumen descuentan las medidas aplicadas, y el Termómetro o la salud de la KB mejoran solo cuando la medida se da por verificada. En la demo eso es un paso más, «Marcar como verificada».

## 5. Catálogo de alternativas de la demo

| Problema | Alternativas (★ recomendada) |
|---|---|
| CAP-03 Reglas sobre su cap | ★ gpt-5-mini en despeje directo · reasoning effort «low» (prompt v2.4) · subir el cap a 14 € (Comité IA) |
| CAP-04 y CAP-05 coste y razonamiento por traza (MSG-A-08) | ★ límite de tokens de razonamiento por mensaje · enviar los daños corporales al runbook sin razonamiento largo |
| CAP-01 coste global al 87 % | ★ cachear el prompt base y los bloques de reglas (R-04) · estrategia en 2 pasos (R-03) |
| KB-06 Red de talleres caída (401) | ★ renovar la credencial de la API · desactivar temporalmente el despeje directo A7 y escalar a persona |
| KB-02 recall a la baja | ★ filtro de vigencia (recall 0,88) · cuarentena de los 340 documentos de 2024 · chunk de 256 tokens |
| KB-04 datos personales y huecos | ★ suprimir los 3 chunks con datos personales (RGPD 17) · chunking 512 + reranker (recall 0,89) · escribir el capítulo de robo sin signos de fuerza |
| KB-09 sin aviso de IA en WhatsApp | ★ añadir el aviso y pasar la plantilla por Legal |
| R-04 acuerdo juez-humano 0,84 | ★ recalibrar el juez con 20 casos revisados por personas · cambiar el modelo juez |
| Minimización (RGPD 5.1.c) | ★ seudonimizar antes de enviar al modelo · descartar los datos de salud que no hacen falta para decidir |
| EIPD pendiente (RGPD 35) | ★ revisión de la EIPD por el DPO tras el cambio de modelo |
| Formación (AI Act 4) | ★ formar a los 2 tramitadores nuevos |
| Sesgo en WhatsApp (+6 pp de revisiones) | ★ analizar la causa con replay · ajustar la normalización de WhatsApp · umbral específico por canal |
| Override por conductor no declarado (MSG-A-04) | ★ dar al agente de Extracción una herramienta de consulta de conductores declarados · añadir la pregunta a la plantilla de petición de datos |
| Reglas bajó a L2 | ★ plan de recuperación: 2 semanas con override ≤ 3 % y replay de los casos corregidos |
| G-09 inactivo (confianza STT) | ★ activarlo con umbral 0,7 · activarlo solo en llamadas con lesionados |
| Ráfagas de 429 | ★ cuota reservada con el proveedor · segundo proveedor como respaldo (ya validado para DORA) |

## 6. Qué cambia en el resto

- **FinOps** mantiene sus acciones correctivas por cap y añade el enlace «Ver todas las medidas».
- **Las alertas del Resumen** llevan a su medida correctiva, y no solo a su origen.
- **Inicio:** nueva ficha en el grupo «Corregir».

## 7. Decisiones que necesito que confirmes

1. ¿La posición después de Resumen te parece bien, o la prefieres al final, antes de Histórico?
2. ¿Te vale la prioridad = severidad × impacto ÷ esfuerzo, o prefieres ordenar solo por severidad?
3. ¿Añadimos el paso «Marcar como verificada», para que el Termómetro y la salud de las KB mejoren solo cuando la medida se ha comprobado?
4. ¿Movemos las acciones correctivas de FinOps a esta sección (FinOps solo enlazaría) o las dejamos en los dos sitios con el estado compartido?
