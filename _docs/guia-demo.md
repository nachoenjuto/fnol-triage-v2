# Guía de referencia de la demo FNOL

Guía práctica de las dos pantallas de la demo: **Triaje FNOL** (`index.html`) y **Gobierno de Agentes** (`gobierno.html`). Para cada pestaña explica qué es, qué información muestra y para qué sirve.

---

## 1. Visión general

**FNOL (First Notice of Loss)** es el primer aviso de siniestro: el mensaje con el que un cliente comunica un percance a su aseguradora. La demo muestra cómo cuatro agentes de IA procesan esos avisos y cómo se gobiernan.

| Pantalla | Pregunta que responde | Quién la usa |
|---|---|---|
| **Triaje FNOL** (`index.html`) | ¿Qué hace el sistema con cada mensaje? | Tramitadores, operaciones, negocio |
| **Gobierno de Agentes** (`gobierno.html`) | ¿Podemos fiarnos, controlarlo y pagarlo? | Gobierno IA, riesgos, auditoría, FinOps |

**Flujo de cada mensaje:** Multicanalidad → Clasificación por ramo → Extracción de datos → Reglas de negocio → Decisión (**Aprobado** o **A revisar**).

**Los cuatro agentes:**

| Agente | Qué hace |
|---|---|
| Multicanalidad | Recibe el mensaje por cualquier canal y lo normaliza a un único formato |
| Clasificación por ramo | Asigna Auto / Hogar / Salud (o Indeterminado) citando los indicios del texto |
| Extracción de datos | Convierte el texto libre en datos estructurados; si falta un dato queda nulo, nunca se inventa |
| Reglas de negocio | Evalúa las reglas del ramo y decide Aprobado / A revisar |

Se navega entre pantallas con el botón **Gobierno de Agentes** de la cabecera del triaje y el botón de volver del panel.

---

## 2. Triaje FNOL (`index.html`)

### 2.1 Cabecera

| Elemento | Para qué sirve |
|---|---|
| **Badge «Motor»** | Indica qué motor procesa: IA, reglas locales o resultados guardados |
| **Configurar IA** | Abre el panel de conexión a Azure AI Foundry (endpoint, deployment, ruta de API, versión y clave). Se guarda solo en `sessionStorage`; incluye *Probar conexión* y *Borrar clave*. El punto de color indica si hay IA conectada |
| **Gobierno de Agentes** | Salta al panel de gobierno |

> Sin clave la demo sigue funcionando: usa el motor local (palabras clave y heurísticas) o los **resultados guardados**, que reproducen fichas ya generadas con IA. Es la forma recomendada de enseñarla sin depender de red.

### 2.2 Barra de fases (breadcrumb)

Seis botones que representan el proceso de extremo a extremo. Al pasar el ratón o hacer clic sobre cada uno aparece una ficha explicativa. Sirve para **contar el caso de negocio antes de lanzar el lote**.

| Fase | Qué explica | Tipo |
|---|---|---|
| **Multicanalidad** | Cinco canales de entrada (email, WhatsApp, chat, formulario web, teléfono por transcripción) unificados en un solo formato; el canal no cambia el tratamiento | Lógica + IA |
| **Clasificación por ramo** | Auto, Hogar, Salud o Indeterminado (este último pasa a revisión) | IA generativa |
| **Extracción de datos** | Nueve datos: cliente, póliza, tipo de siniestro, fecha, importe, lugar, terceros, lesionados, documentación | IA generativa |
| **Reglas de negocio** | Ejemplos de reglas por ramo (A2, A3, A6 · H3, H4, H9 · S2, S4, S5) y resultado de cada una: cumple / incumple / no aplica, siempre con evidencia textual | IA generativa |
| **Trazabilidad** | Qué se registra (ramo, decisión, motivo, criterios, motor, tokens, tiempo) y qué se puede hacer con ello | Lógica |
| **Automatización** | Las dos salidas: Aprobado (sigue sin intervención) y A revisar (va a un tramitador con la información preparada) | Lógica |

### 2.3 Barra lateral (tres secciones plegables)

| Sección | Qué contiene | Para qué sirve |
|---|---|---|
| **Paquete de mensajes** | Selector de tres paquetes fijos (A: 13 mensajes, B: 23, C: 15) con su lista | Elegir el lote de la demo. Son mixtos en ramos y canales, e incluyen casos que deben ir a revisión |
| **Configuración** | **Motor de triaje** (Automático / Resultados guardados / Archivo cargado), **Reproducir desde archivo** y **Llamadas a la IA por mensaje** (1 paso / 2 pasos) | Decidir cómo se procesa. «2 pasos» ahorra tokens de entrada (solo se envía el bloque de reglas del ramo) a cambio de dos llamadas |
| **Prompt** | Prompt base y los tres bloques de reglas (Auto, Hogar, Salud), editables | Cambiar las reglas de negocio en caliente y ver cómo cambian las decisiones: la llamada usa siempre el texto vigente |

### 2.4 Panel principal

**Contadores**
- **Aprobados**: mensajes que continúan sin intervención humana (cifra y %).
- **A revisar**: mensajes derivados a un tramitador (cifra y %).
- **Tiempo medio de ciclo**: lo que tarda cada mensaje en procesarse.
- **Chips por ramo**: desglose Auto / Hogar / Salud.

**Controles del lote**
- **Procesar paquete**: lanza el lote. La barra de progreso y el estado en vivo muestran el avance.
- **Pausar / Continuar**: detiene y reanuda sin perder lo procesado.
- **Reiniciar lote**: cancela y vacía el registro.

**Registro de decisiones** (tabla)

| Columna | Qué muestra |
|---|---|
| Mensaje | Id y canal (con su icono) |
| Ramo | Ramo asignado y ✔/✖ frente al esperado |
| Importe | Importe estimado extraído |
| Decisión | Aprobado / A revisar |
| Motivo | Razón resumida de la decisión |
| Origen | Qué motor decidió (IA, reglas locales, guardado, fallback) |
| Conf. | Confianza del modelo (0–1) |
| Ciclo | Tiempo de proceso |
| Hora | Momento de la decisión |

Capacidades: **ordenar** por cualquier columna con cabecera, **filtrar** por ramo y por «Solo a revisar», **exportar a JSON o CSV** y **abrir la ficha** haciendo clic en una fila.

### 2.5 Ficha del mensaje (ventana modal)

Es la pantalla de **explicabilidad** de una decisión. Dos columnas:

| Columna izquierda | Columna derecha |
|---|---|
| Datos del mensaje (canal, asunto, fecha) | **Ramo** asignado con los indicios que lo justifican |
| **Texto original** del cliente | **Criterios de decisión**: cada regla evaluada (cumple / incumple / no aplica) con su evidencia |
| **Datos extraídos** (los que no aparecen en el texto salen como nulos) | **Decisión** final, motivo, confianza, tokens por paso |
| | **Respuesta cruda del modelo** (desplegable) para auditoría técnica |

Uso típico: abrir un mensaje «A revisar» y enseñar **exactamente qué regla lo ha frenado y con qué frase del cliente**.

---

## 3. Gobierno de Agentes (`gobierno.html`)

Panel de control de los cuatro agentes. Ofrece cuatro capacidades: **ver** (observabilidad), **entender** (razonamiento y replay), **limitar** (autonomía y guardrails) y **pagar** (FinOps).

### 3.1 Cabecera: fuente y periodo

| Control | Opciones y uso |
|---|---|
| **Fuente** | **Demo**: Paquete A + 14 días de histórico inventado pero coherente con el triaje. **Sesión actual**: convierte el lote que acabas de procesar en el triaje en trazas reales (tokens, ciclo, decisión, coste); el histórico, caps y guardrails siguen siendo de demostración. **Archivo JSON**: dataset cargado |
| **Periodo** | Últimos 14 días / 7 días / Hoy. Reescala KPIs y gráficos |
| **Cargar JSON / Exportar trazas** | Carga un dataset propio o descarga el activo con el mismo esquema |
| **Volver al triaje** | Regresa a `index.html` |

> Recomendación para una demo completa: procesa el Paquete A en el triaje y abre el panel con **Sesión actual** para que el cliente vea sus propios mensajes convertidos en trazas.

**Etiquetas de marco normativo.** Junto al título de los bloques principales aparecen etiquetas (⚖ AI Act art. 12, RGPD art. 22, DORA art. 28, EIOPA, Solvencia II art. 41…). Al pasar el ratón muestran qué exige el artículo y si está en vigor o es exigible solo a sistemas de alto riesgo desde el 02/12/2027 (el triaje no lo es; ahí se aplica como buena práctica).

### 3.2 Resumen

**Es la vista de dirección: el estado del sistema en una pantalla.**

| Bloque | Qué muestra | Para qué sirve |
|---|---|---|
| **KPIs** | Mensajes procesados · Autonomía efectiva (81 %) · Escalados a humano (19 %, con su causa principal) · Overrides humanos (2,1 %, objetivo ≤ 3 %) · Coste del periodo vs cap mensual · Alertas activas | Saber en 10 segundos si el sistema va bien |
| **Tarjetas de agente** | Modelo, versión de prompt, nivel de autonomía, estado (Activo / Degradado / Pausado), coste del día frente a su cap y **kill switch** | Ver el estado de cada agente y **pararlo** al instante |
| **Coste diario** | Gráfico €/día con línea discontinua del cap diario; días ≥ 80 % en ámbar | Detectar picos de gasto |
| **Alertas activas** | Avisos críticos y de aviso con su causa y acción aplicada | Priorizar qué atender |
| **Últimas trazas** | Las cinco más recientes | Atajo a la trazabilidad |

Capacidades: clic en una **traza** abre su ficha explicada (qué llegó, qué hizo cada agente, decisión, coste); clic en un **agente** abre su ficha; el **kill switch** pausa el agente, los mensajes que dependen de él se encolan (no se pierde ninguno) y queda registrado en el Histórico.

### 3.3 Trazabilidad

**Es la auditoría mensaje a mensaje.**

- **Panel de detalle fijo** bajo las pestañas, que no se oculta al recorrer la lista. Muestra el **waterfall de spans**: cuánto tardó cada agente, con qué modelo y cuántos tokens consumió. Incluye el guardrail disparado y el override humano si los hubo.
- **Lista de trazas** con columnas: traza, hora, mensaje, canal, ramo, decisión, autonomía, confianza, ciclo, tokens, coste e incidencias.
- **Filtros**: agente, canal, decisión y resultado (Autónomo / Escalado a humano / Con override / Con incidencia).
- **Exportar trazas** descarga el dataset.

Para qué sirve: responder a auditoría o a un reclamante «¿qué pasó con este mensaje, quién lo decidió y cuánto costó?». Desde cada traza, **Ver razonamiento** y **Replay** saltan a la pestaña siguiente con esa traza cargada.

### 3.4 Reasoning & Replay

**Es el «porqué» y el «¿y si…?».** Pantalla dividida con un separador que se puede arrastrar.

| Zona | Contenido | Para qué sirve |
|---|---|---|
| **Lista de trazas** (izquierda) | Misma lista con filtros, con scroll propio | Elegir la traza a analizar |
| **Razonamiento** (derecha) | Por agente: entrada → pasos → salida. Es el registro estructurado, **no** la cadena de pensamiento cruda del modelo | Entender cómo llegó cada agente a su resultado |
| **Replay** | Reejecuta la traza en modo **Idéntico** (mismos prompts y modelos, verificación determinista) o **What-if** (otro modelo o versión de prompt para el agente de Reglas). Devuelve un **diff** de ramo, decisión, coste y latencia | Validar un cambio **antes** de desplegarlo: ¿cambia la decisión? ¿cuánto ahorro? |
| **Histórico de replays** | Cada replay con fecha, traza, cambio probado, diferencias y usuario | Evidencia de que cada cambio de modelo o prompt se probó |

Ejemplo de uso: probar `gpt-5-mini` en lugar de `gpt-5` en Reglas; si la decisión se mantiene y el coste baja un 80 %, hay base para aprobar el cambio.

### 3.5 Autonomía

**Define cuánta libertad tiene cada agente y deja constancia de cada cambio.**

| Nivel | Significado |
|---|---|
| **L0 Manual** | El agente solo sugiere; una persona decide y ejecuta |
| **L1 Asistido** | El agente propone; una persona confirma cada caso |
| **L2 Supervisado** | El agente decide dentro de los guardrails; fuera de ellos escala a humano |
| **L3 Autónomo** | El agente decide y ejecuta; solo se audita a posteriori |

Bloques de la pestaña:
- **KPIs**: decisiones autónomas (objetivo ≥ 80 %), escaladas por guardrail, tasa de override (umbral de bajada de nivel: 3 %) y precisión frente a lo esperado.
- **Niveles** coloreados de rojo (manual) a verde (autónomo).
- **Tarjetas de agente** con nivel, umbral y tasas. Clic abre la **ficha del agente**: **identidad y permisos** (identidad administrada, responsable, proveedor y región, datos que trata, qué puede y qué no puede hacer), histórico de autonomía, cambios de modelo y de prompt, comportamiento por modelo en el tiempo y variables que le afectan (umbrales, importes máximos, cap).
- **Auditoría de cambios**: cada subida o bajada de nivel, cambio de modelo o de guardrail, con **motivo y quién lo aprobó**; clic en una fila abre el registro completo.

Para qué sirve: la autonomía se **gana con datos y se pierde con datos**. En la demo, Reglas bajó de L3 a L2 cuando el override superó el 3 %.

### 3.6 Guardrails

**Son las condiciones que limitan lo que un agente puede hacer solo.** Nueve en la demo (G-01 a G-09).

| Guardrail | Condición | Acción |
|---|---|---|
| G-01 | Confianza de la decisión < 0,85 | Escalar a humano |
| G-02 | Importe > 6.000 € Auto · 10.000 € Hogar · reembolso 2.000 € Salud | Escalar a humano |
| G-03 | Ramo en Reglas ≠ ramo de Clasificación | Escalar a humano |
| G-04 | Lesionados = sí | Escalar a humano (daños corporales) |
| G-05 | Póliza y fecha del hecho ambas nulas | Escalar y pedir datos al cliente |
| G-06 | Ramo = Indeterminado | Escalar a humano |
| G-07 | Cap diario de coste ≥ 100 % | Degradar a `gpt-5-mini` hasta las 00:00 |
| G-08 | JSON inválido tras 2 reintentos | Fallback a motor local y marcar traza |
| G-09 | Confianza de transcripción telefónica < 0,7 | Escalar para escuchar el audio (inactivo en la demo) |

Qué muestra y qué permite:
- **KPIs**: guardrails activos, disparos en 14 días, % de escalados que vienen de un guardrail y el más disparado.
- **Tabla**: agente, condición, acción, severidad (humano / degradar / marcar), minigráfico de disparos por día y **interruptor activo/inactivo** (queda registrado en el Histórico).
- **Ficha** (clic en la fila) con descripción y últimos disparos; **Nuevo guardrail** crea uno.
- **Últimos disparos**, enlazados a la traza que los provocó.
- En todo el panel, pasar el ratón sobre un código (G-04, CAP-03) muestra su descripción.

Para qué sirve: es el **mecanismo de control** que permite dar autonomía sin perder el control. Los guardrails de importe y lesionados explican la mayoría de los escalados.

### 3.7 FinOps

**Controla cuánto cuesta cada decisión y actúa antes de pasarse del presupuesto.**

| Bloque | Qué muestra | Para qué sirve |
|---|---|---|
| **KPIs** | Coste de hoy, coste mensual vs cap (con proyección de cierre), caps superados, coste medio | Visión rápida; cada KPI abre un detalle |
| **Acciones correctivas** | Una propuesta por cada cap superado. **Aplicar** la registra; si requiere aprobación, queda «Pendiente del Comité IA» | Pasar de la alerta a la acción |
| **Caps** | Tabla de límites: global, por agente, por traza, tokens de razonamiento y llamadas/minuto. Con consumo, barra de uso, acción al superar y estado (ok / aviso / superado) | Fijar y vigilar presupuestos. Clic en un cap abre su detalle, agentes implicados e histórico; **Nuevo cap** crea otro |
| **Coste por agente** | Gráfico apilado €/día | Ver quién gasta. Las leyendas ocultan o muestran series |
| **Tokens por agente** | Miles de tokens del lote actual | Detectar agentes que consumen de más |
| **Modelos** | Por modelo: proveedor, precio, agentes que lo usan, llamadas, tokens (entrada, salida, razonamiento), coste, p95 y calidad (JSON válido, sin reintento, estable en replay, precisión) + gráficos coste por modelo × agente y tokens por modelo | Decidir **qué modelo para qué agente**: no solo el más barato, sino el más barato que mantiene la calidad |
| **Recomendaciones** | Ahorros estimados: bajar reasoning effort, usar modelo pequeño en casos simples, estrategia en 2 pasos, cachear el prompt base | Lista priorizada de palancas de ahorro |

Mensaje clave: en la demo, el agente de Reglas (`gpt-5`) concentra el ~79 % del coste. Es el candidato obvio a optimizar, y los replays permiten hacerlo sin riesgo.

### 3.8 Histórico

**Línea de tiempo única de todo lo que ha ocurrido.** Filtrable por chips de tipo:

| Tipo | Ejemplos |
|---|---|
| Alertas | Cap superado, aviso al 80 % |
| Políticas | Guardrail activado/desactivado, acción correctiva aplicada |
| Replays | Pruebas de modelo o prompt |
| Overrides | Decisiones del agente cambiadas por una persona |
| Despliegues | Cambios de prompt o de modelo |
| Incidentes | Ráfagas de errores 429, fallbacks |
| Operaciones | Kill switch, cambios hechos en esta sesión |

Para qué sirve: es el **libro de registro para auditoría**: qué cambió, cuándo, por qué y quién lo aprobó. Las acciones que hagas en vivo (pausar un agente, apagar un guardrail) aparecen aquí con usuario «Operador (esta sesión)».

---

## 4. Guion sugerido de demo (10 minutos)

| Min | Dónde | Qué mostrar | Mensaje |
|---|---|---|---|
| 0–2 | Triaje · fases | Recorrer las seis fases | «Así funciona el proceso de punta a punta» |
| 2–4 | Triaje · Procesar Paquete A | Contadores y registro en vivo | «Aprobados y a revisar en segundos» |
| 4–5 | Triaje · ficha de un «A revisar» | Criterio que incumple + evidencia | «Cada decisión es explicable» |
| 5–6 | Gobierno · Resumen (fuente Sesión actual) | KPIs y tarjetas; probar el kill switch | «Control total y parada inmediata» |
| 6–7 | Trazabilidad → Reasoning & Replay | Waterfall y replay What-if | «Auditamos y probamos antes de cambiar» |
| 7–8 | Autonomía y Guardrails | Niveles, G-02 y G-04 | «Autonomía graduada con límites claros» |
| 8–10 | FinOps → Histórico | Cap superado, recomendaciones, línea de tiempo | «Coste bajo control y todo auditado» |

---

## 5. Cosas a tener en cuenta

- **Los datos del panel son de demostración**: inventados pero coherentes con el Paquete A. Solo las trazas de «Sesión actual» proceden del lote real; histórico, caps y guardrails siguen siendo de demo.
- **Los cambios hechos en el panel** (kill switch, guardrails, caps nuevos, acciones correctivas) son simulados y viven en `sessionStorage`: se pierden al cerrar la pestaña.
- **Aplicación estática**: sin backend. La clave de IA solo se guarda en la sesión del navegador.
- **Mensajes con resultado esperado**: el triaje compara cada resultado con un «esperado» interno que no se envía a la IA; de ahí los ✔/✖ de la columna Ramo.
