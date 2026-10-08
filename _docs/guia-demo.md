# Guía de referencia de la demo FNOL

Guía práctica de las dos pantallas de la demo: **Triaje FNOL** (`index.html`) y **Gobierno de Agentes** (`gobierno.html`). Para cada sección explica qué es, qué información muestra y para qué sirve.

Las dos pantallas comparten el mismo marco: cabecera azul, **menú lateral** a la izquierda (se pliega con el botón de su pie y queda solo con iconos; el estado se mantiene al cambiar de pantalla), el usuario de la demo al pie del menú («Ignacio Sánchez», sesión simulada) y un pie de página fino al final del contenido.

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

Seis botones numerados (del 1 al 6, en un círculo del color de la cabecera con el número en blanco) que representan el proceso de extremo a extremo. Al pasar el ratón o hacer clic sobre cada uno aparece una ficha explicativa. Sirve para **contar el caso de negocio antes de lanzar el lote**.

| Fase | Qué explica | Tipo |
|---|---|---|
| **Multicanalidad** | Cinco canales de entrada (email, WhatsApp, chat, formulario web, teléfono por transcripción) unificados en un solo formato; el canal no cambia el tratamiento | Lógica + IA |
| **Clasificación por ramo** | Auto, Hogar, Salud o Indeterminado (este último pasa a revisión) | IA generativa |
| **Extracción de datos** | Nueve datos: cliente, póliza, tipo de siniestro, fecha, importe, lugar, terceros, lesionados, documentación | IA generativa |
| **Reglas de negocio** | Ejemplos de reglas por ramo (A2, A3, A6 · H3, H4, H9 · S2, S4, S5) y resultado de cada una: cumple / incumple / no aplica, siempre con evidencia textual | IA generativa |
| **Trazabilidad** | Qué se registra (ramo, decisión, motivo, criterios, motor, tokens, tiempo) y qué se puede hacer con ello | Lógica |
| **Automatización** | Las dos salidas: Aprobado (sigue sin intervención) y A revisar (va a un tramitador con la información preparada) | Lógica |

### 2.3 Menú lateral (tres secciones plegables)

Es el mismo menú que el del panel de gobierno (`shell.js`), con el mismo ancho (248 px): al pie están el usuario de la demo («Ignacio Sánchez», sesión simulada) y el botón **Plegar menú**. Plegado deja solo los iconos; un clic en un icono despliega el menú y abre esa sección. El estado plegado o desplegado se recuerda y se comparte entre las dos páginas. El pie de la página es una línea fina, alineada con el menú.

| Sección | Qué contiene | Para qué sirve |
|---|---|---|
| **Paquete de mensajes** | Selector de tres paquetes fijos (A: 13 mensajes, B: 23, C: 15) con su lista | Elegir el lote de la demo. Son mixtos en ramos y canales, e incluyen casos que deben ir a revisión. Los del Paquete A son más largos y llevan datos personales ficticios (DNI, teléfonos, IBAN, salud, menores, terceros) para la capa de cumplimiento |
| **Configuración** | **Motor de triaje** (Automático / Resultados guardados / Archivo cargado), **Reproducir desde archivo** y **Llamadas a la IA por mensaje** (1 paso / 2 pasos) | Decidir cómo se procesa. «2 pasos» ahorra tokens de entrada (solo se envía el bloque de reglas del ramo) a cambio de dos llamadas |
| **Prompt** | Prompt base y los tres bloques de reglas (Auto, Hogar, Salud), editables. Como el menú es estrecho, **Editar en grande** abre cada bloque en un editor ancho (con «Restaurar original» y «Guardar») | Cambiar las reglas de negocio en caliente y ver cómo cambian las decisiones: la llamada usa siempre el texto vigente |

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

Es la pantalla de **explicabilidad** de una decisión. Cinco pestañas:

| Pestaña | Qué muestra |
|---|---|
| **Mensaje** | Datos del mensaje y el **texto con las evidencias resaltadas** (fondo oscuro, texto blanco, numeradas). A la derecha, la lista de evidencias. Al pasar el ratón o hacer clic sobre una evidencia (en el texto o en la lista), el título «Evidencias» se sustituye por su tipo (por ejemplo «3 · Fecha del hecho»). El botón **Leyenda**, a la derecha del título, abre los colores y las etiquetas al pasar el ratón o con un clic |
| **Datos extraídos** | Los campos del siniestro; los que no aparecen en el texto salen nulos |
| **Reglas de negocio** | Cada regla del ramo: cumple / incumple / no aplica, con su evidencia |
| **Razonamiento** | Ramo, decisión, siguiente paso recomendado y cronología |
| **Respuesta cruda** | La salida del modelo tal cual y, con **+ Gobierno**, el bloque `_gobernanza` que añade la plataforma (ver 2.6) |

Uso típico: abrir un mensaje «A revisar» y enseñar **exactamente qué regla lo ha frenado y con qué frase del cliente**.

### 2.6 Respuesta cruda con metadatos de gobierno

Debajo de la salida del modelo aparece el bloque **`_gobernanza`**, marcado como «añadido por la plataforma de gobierno, no generado por el modelo». Lo calcula `cumplimiento.js` de forma determinista y es **el mismo** que usa el Termómetro de cumplimiento del panel.

| Color | Qué marca | Norma a la que ayuda |
|---|---|---|
| Subrayado discontinuo en la salida del modelo | Campos con datos personales (nombre, póliza, lugar; en Salud, también el tipo de siniestro) | RGPD art. 4.1 y 9 |
| Etiqueta tras una clave (`ramo`, `criterios`, `evidencias`, `decision`…) | Datos que sirven para trazar y explicar la decisión | AI Act art. 12 y 13, RGPD art. 15 y 22 |
| Azul · `trazabilidad` | Traza, modelo, versión del prompt, hash SHA-256 de entrada, salida y sello | AI Act art. 12, RGPD art. 5.2 |
| Ocre · `retencion` | Hasta cuándo se guarda la traza (6 meses) y el expediente (2 años en daños, 5 en personas); después, bloqueo | AI Act art. 19, LCS art. 23, LOPDGDD art. 32 |
| Teja · `datos_personales` | Cada dato detectado con su categoría, su valor en la traza (seudonimizado o enmascarado) y si se usó para decidir. Los de salud, en rojo | RGPD art. 4.5, 8, 9, 14 y 25 |
| Verde · `explicabilidad` | Por qué este ramo (evidencias verificadas) y **por qué no los otros dos** | AI Act art. 13, RGPD art. 15 y 22 |
| Violeta · `supervision_humana` | Si la decisión requiere a una persona y en qué estado está | AI Act art. 14, RGPD art. 22 |

Al pasar el ratón por una norma aparece qué exige. «Copiar JSON» copia lo que se ve (con o sin el bloque).

> Mensaje clave: **el modelo no se autocertifica**. Los metadatos de cumplimiento los pone la plataforma, se pueden recalcular en cualquier momento y, si alguien altera una traza, el hash deja de coincidir.

---

## 3. Gobierno de Agentes (`gobierno.html`)

Panel de control de los cuatro agentes. Ofrece siete capacidades (en diez secciones más una portada, **Inicio**): **ver** (observabilidad), **entender** (razonamiento y replay), **limitar** (autonomía y guardrails), **conocer** (knowledge bases), **cumplimiento** (termómetro), **costes** (FinOps) y **auditar** (histórico). Las secciones están en el mismo **menú lateral** que el triaje: plegado muestra solo los iconos (el nombre sale al pasar el ratón) y los nombres largos se recortan con «…». Las tarjetas de los agentes están en el Resumen y su ficha completa, en la sección **Agentes**.

### 3.1 Cabecera: fuente y periodo

| Control | Opciones y uso |
|---|---|
| **Fuente** | **Demo**: Paquete A + 14 días de histórico inventado pero coherente con el triaje. **Sesión actual**: convierte el lote que acabas de procesar en el triaje en trazas reales (tokens, ciclo, decisión, coste), con el mismo id de traza y el mismo bloque `_gobernanza` que su ficha; el histórico, caps, guardrails y knowledge bases siguen siendo de demostración. **Archivo JSON**: dataset cargado |
| **Periodo** | Últimos 14 días / 7 días / Hoy. Reescala KPIs y gráficos |
| **Cargar JSON / Exportar trazas** | Carga un dataset propio o descarga el activo con el mismo esquema |
| **Volver al triaje** | Regresa a `index.html` |

> Recomendación para una demo completa: procesa el Paquete A en el triaje y abre el panel con **Sesión actual** para que el cliente vea sus propios mensajes convertidos en trazas.

**Etiquetas de marco normativo.** Junto al título de los bloques principales aparecen etiquetas (⚖ AI Act art. 12, RGPD art. 22, DORA art. 28, EIOPA, Solvencia II art. 41…). Al pasar el ratón muestran qué exige el artículo y si está en vigor o es exigible solo a sistemas de alto riesgo desde el 02/12/2027 (el triaje no lo es; ahí se aplica como buena práctica).

### 3.2 Inicio (portada)

**Es lo primero que se ve al abrir el panel.** Arriba, una franja con el estado actual: alertas críticas y avisos (de todas las fuentes), cobertura de cumplimiento y knowledge bases sanas, y el botón **Ver el Resumen**. Debajo, una ficha por cada sección del menú, agrupadas por la pregunta a la que responden:

| Grupo | Secciones |
|---|---|
| **Ver** | Resumen · Agentes |
| **Entender** | Trazabilidad · Reasoning & Replay |
| **Limitar** | Autonomía · Guardrails |
| **Conocer** | Knowledge bases |
| **Cumplimiento** | Termómetro de cumplimiento |
| **Costes** | FinOps |
| **Auditar** | Histórico |

Cada ficha lleva la pregunta que responde, dos cifras en vivo calculadas con los mismos datos que su sección (cambian con la fuente Demo, Sesión o Archivo), una etiqueta de estado (**Al día**, **Revisar** o **Atención**, en verde, ámbar o rojo), sus etiquetas de norma y «Abrir →». Toda la ficha se puede pulsar.

**Modo presentador.** Debajo de «Ver el Resumen» hay un interruptor. Apagado (por defecto), no se ve nada más. Encendido, aparece el botón **Recorrido de la demo**, que abre un panel flotante (también en el triaje) con los 10 pasos del guion del apartado 4: minuto, qué enseñar y frase clave. «Ir» lleva a la pantalla exacta aunque esté en la otra página (por ejemplo, abre la ficha de MSG-A-08 o la KB-02 en la pestaña Comparativa); «Anterior» y «Siguiente» recorren los pasos, los vistos quedan marcados y, si falta algo (como procesar el Paquete A), el panel lo avisa. El interruptor se recuerda en el navegador; el progreso, en la pestaña.

### 3.3 Resumen

**Es la vista de dirección: el estado del sistema en una pantalla.**

| Bloque | Qué muestra | Para qué sirve |
|---|---|---|
| **KPIs (8)** | Mensajes procesados · Autonomía efectiva (81 %) · Escalados a humano (19 %, con su causa principal) · Overrides humanos (2,1 %, objetivo ≤ 3 %) · Coste del periodo vs cap mensual · Alertas activas · **Cumplimiento** (cobertura de controles) · **Knowledge bases** (KB sanas). Los dos últimos llevan a su sección | Saber en 10 segundos si el sistema va bien |
| **Tarjetas de agente** | Icono y nombre en grande; descripción, estado (Activo / Degradado / Pausado) y nivel de autonomía; al pie, en pequeño, modelo, versión de prompt, latencia y coste del día frente a su cap (barra verde, ámbar o roja). Todas en el mismo color: el color por agente solo se usa en los gráficos, para distinguir las series. Incluye el **kill switch** | Ver el estado de cada agente y **pararlo** al instante |
| **Coste diario** | Gráfico €/día con línea discontinua del cap diario; días ≥ 80 % en ámbar | Detectar picos de gasto |
| **Alertas activas** | Todas las fuentes en una lista: caps de coste superados, knowledge bases críticas o degradadas, controles de cumplimiento pendientes (EIPD, aviso de IA en WhatsApp) y la cadena de integridad si se rompe. Cada alerta indica su origen y lleva a él | Priorizar qué atender |
| **Cumplimiento** | Los cuatro marcos con su %, los tres controles parciales más relevantes, los datos personales del periodo (total, de salud y de menores) y el estado de la cadena de integridad | Ver de un vistazo si se puede demostrar que se cumple |
| **Knowledge bases** | KB sanas, degradadas y críticas, el acuerdo juez-humano medio de las rúbricas y la lista de KB con problemas con su motivo (clic para abrir su ficha) | Saber si el conocimiento con el que deciden los agentes sigue siendo bueno |
| **Últimas trazas** | Las cinco más recientes, con sus **datos personales** (y si hay de salud o de menores) y el número de **KB** que usaron | Atajo a la trazabilidad |

Capacidades: clic en una **traza** abre su ficha explicada (qué llegó, qué hizo cada agente, decisión, coste; el botón **Cumplimiento** abre su ficha de datos personales y su bloque `_gobernanza`); clic en un **agente** lleva a su pestaña de la sección **Agentes** (3.4); el **kill switch** pausa el agente, los mensajes que dependen de él se encolan (no se pierde ninguno) y queda registrado en el Histórico.

### 3.4 Agentes

**Todo lo que hay que saber de cada agente, en una pestaña por agente.** Arriba, los cuatro en el orden de la cadena (Multicanalidad → Clasificación → Extracción → Reglas), con lo que se pasan entre ellos (texto normalizado → ramo e indicios → 10 campos); cada pestaña muestra estado, nivel y coste del día frente al cap.

| Bloque | Qué muestra |
|---|---|
| **Cabecera** | Descripción, estado, nivel de autonomía, responsable y **kill switch**; modelo, prompt, trazas del periodo, latencia p50/p95, coste de hoy frente al cap, coste medio por traza, escalado y override de 14 días |
| **Identidad y permisos** | Identidad administrada, credencial, responsable, proveedor y región, datos que trata, qué puede y qué no puede hacer |
| **Configuración y variables** | Umbrales, importes máximos, reasoning effort…; guardrails con sus disparos y caps con su estado (clic para abrir el cap) |
| **Rendimiento y coste** | Coste diario de 14 días, tokens de entrada, salida y razonamiento, comportamiento por modelo en el tiempo y la recomendación de FinOps que le afecte |
| **Calidad** | Métricas propias de cada agente sobre el Paquete A: canales normalizados (Multicanalidad), acierto de ramo y ramos descartados explicados (Clasificación), campos extraídos y nulos honestos (Extracción), acierto de la decisión, confianza, evidencias y reglas que más frenan (Reglas); e incidencias |
| **Knowledge bases** | Las que consume, con su estado de salud (clic para abrir su ficha) |
| **Datos personales que trata** | Categorías que ve: el texto completo (Multicanalidad y Clasificación) o solo los campos extraídos (Extracción y Reglas, minimización) |
| **Histórico** | Cambios de autonomía y de modelo, prompt e incidencias con motivo y quién los aprobó |
| **Últimas trazas** | El paso de este agente en cada traza: inicio, duración, modelo, tokens y coste |
| **Contrato de entrada y salida** (plegado) | Para perfiles técnicos: qué recibe y qué devuelve el agente (campos y tipos) y un **ejemplo real** de una traza elegible del Paquete A |

### 3.5 Trazabilidad

**Es la auditoría mensaje a mensaje.**

- **Panel de detalle fijo** arriba de la sección, que no se oculta al recorrer la lista. Muestra el **waterfall de spans**: cuánto tardó cada agente, con qué modelo y cuántos tokens consumió. Incluye el guardrail disparado y el override humano si los hubo.
- **Lista de trazas** con columnas: traza, hora, mensaje, canal, ramo, decisión, autonomía, confianza, ciclo, tokens, coste e incidencias.
- **Filtros**: agente, canal, decisión y resultado (Autónomo / Escalado a humano / Con override / Con incidencia).
- **Exportar trazas** descarga el dataset.

Para qué sirve: responder a auditoría o a un reclamante «¿qué pasó con este mensaje, quién lo decidió y cuánto costó?». Desde cada traza, **Ver razonamiento** y **Replay** saltan a la sección siguiente con esa traza cargada.

### 3.6 Reasoning & Replay

**Es el «porqué» y el «¿y si…?».** Pantalla dividida con un separador que se puede arrastrar.

| Zona | Contenido | Para qué sirve |
|---|---|---|
| **Lista de trazas** (izquierda) | Misma lista con filtros, con scroll propio | Elegir la traza a analizar |
| **Razonamiento** (derecha) | Por agente: entrada → pasos → salida. Es el registro estructurado, **no** la cadena de pensamiento cruda del modelo | Entender cómo llegó cada agente a su resultado |
| **Replay** | Reejecuta la traza en modo **Idéntico** (mismos prompts y modelos, verificación determinista) o **What-if** (otro modelo o versión de prompt para el agente de Reglas). Devuelve un **diff** de ramo, decisión, coste y latencia | Validar un cambio **antes** de desplegarlo: ¿cambia la decisión? ¿cuánto ahorro? |
| **Histórico de replays** | Cada replay con fecha, traza, cambio probado, diferencias y usuario | Evidencia de que cada cambio de modelo o prompt se probó |

Ejemplo de uso: probar `gpt-5-mini` en lugar de `gpt-5` en Reglas; si la decisión se mantiene y el coste baja un 80 %, hay base para aprobar el cambio.

### 3.7 Autonomía

**Define cuánta libertad tiene cada agente y deja constancia de cada cambio.**

| Nivel | Significado |
|---|---|
| **L0 Manual** | El agente solo sugiere; una persona decide y ejecuta |
| **L1 Asistido** | El agente propone; una persona confirma cada caso |
| **L2 Supervisado** | El agente decide dentro de los guardrails; fuera de ellos escala a humano |
| **L3 Autónomo** | El agente decide y ejecuta; solo se audita a posteriori |

Bloques de la sección:
- **KPIs**: decisiones autónomas (objetivo ≥ 80 %), escaladas por guardrail, tasa de override (umbral de bajada de nivel: 3 %) y precisión frente a lo esperado.
- **Niveles** coloreados de rojo (manual) a verde (autónomo), con los agentes que hay en cada uno. Las tarjetas de los agentes están en el **Resumen** (3.3) y su ficha, en **Agentes** (3.4).
- **Auditoría de cambios**: cada subida o bajada de nivel, cambio de modelo o de guardrail, con **motivo y quién lo aprobó**; clic en una fila abre el registro completo.

Para qué sirve: la autonomía se **gana con datos y se pierde con datos**. En la demo, Reglas bajó de L3 a L2 cuando el override superó el 3 %.

### 3.8 Guardrails

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

### 3.9 Knowledge bases

**Panel de control del conocimiento que usan los agentes**: índices RAG alimentados desde SharePoint o Google Drive, documentos Markdown, runbooks deterministas, tablas de referencia y plantillas.

| Bloque | Qué muestra |
|---|---|
| **KPI** | Número de KB (una real y ocho simuladas), cuántas están sanas, degradadas o críticas, recall medio, consultas sin respuesta y rúbricas con su acuerdo juez-humano |
| **Inventario** | Una tarjeta por KB: tipo, fuente, documentos y chunks, frecuencia de sincronización, tendencia de 14 días, motivos de degradación, agentes que la consumen y rúbrica. Filtros por tipo y «Con problemas» |
| **Ficha de la KB** | **Salud** (cada métrica frente a su umbral), **Configuración** (chunking, tamaño de chunk, solapamiento, embeddings, índice y métrica, top-k, umbral, búsqueda híbrida, reranker, filtros), **Comparativa** (el mismo corpus con varias configuraciones y botón «Aplicar»), **Evaluación** (última ejecución y preguntas que fallan), **Fuente y sincronización**, **Uso** (lo más consultado y las consultas sin respuesta) y **Versiones** («Volver a esta versión»). La ventana tiene tamaño fijo: al cambiar de pestaña no se mueve ni cambia de tamaño; solo hace scroll el contenido. Acciones simuladas: reindexar, ejecutar la rúbrica, cuarentena de obsoletos, suprimir chunks con datos personales y pausar |
| **Rúbricas** | Colección versionada: criterios con pesos, preguntas de referencia por tipo (factual, cláusula, exclusión, plazo, trampa), acuerdo juez-humano, responsable. **Se pueden editar**: el editor obliga a que los pesos sumen 100 y guarda una versión nueva con su historial |

Historias que cuenta la demo: **Condicionados Auto** pierde 6 puntos de recall porque se sincronizaron 340 documentos de 2024 (la comparativa recomienda un filtro de vigencia); la **Red de talleres** está en rojo porque la API devuelve 401 desde el 08/09; el **Manual de tramitación** tiene 3 chunks con datos de clientes reales y su rúbrica tiene un acuerdo juez-humano bajo.

Enlace con el resto: cada traza registra las KB y versiones que usó (`_gobernanza.trazabilidad.conocimiento`), y el Termómetro mide con este catálogo el **AI Act art. 10** (9 de 9 versionadas, 7 de 9 con rúbrica) y el **RGPD art. 17** (supresión también en los índices vectoriales).

### 3.10 Termómetro de cumplimiento

**Cómo se guardan las trazas, las evidencias y los datos personales que exigen las normas**, con una cifra por marco:

| Bloque | Qué muestra |
|---|---|
| **Cabecera** | Cobertura global de controles, cuántos están cubiertos y cuántos parciales, y cuántos se **miden en las trazas** frente a los **declarados** (documentales). Botón «Exportar evidencias de cumplimiento» (JSON con el termómetro, la cadena y los bloques `_gobernanza`) |
| **Termómetros** | Reglamento de IA (RIA · AI Act), Protección de datos (RGPD y LOPDGDD), Resiliencia operativa (DORA) y Gobierno en seguros (EIOPA y Solvencia II). Verde desde el 90 %, ámbar desde el 70 %. Clic para filtrar la matriz |
| **Matriz norma → control** | Qué exige cada artículo, cómo lo resuelve la solución, la medida en vivo, si es medido o declarado y las trazas que lo respaldan. Filtro «Solo parciales» |
| **Ciclo de vida de una traza** | Ocho pasos, de la ingesta a la supresión, con su norma y su plazo |
| **Inventario de datos personales** | Por mensaje: categorías detectadas, salud, menores, terceros, cuántos no se usaron para decidir y una muestra del valor en la traza. Clic para ver el texto con los datos resaltados y su bloque `_gobernanza` |
| **Integridad del registro** | Cadena de hashes sobre las trazas. «Simular una alteración» cambia la decisión de una traza ya registrada y la cadena se rompe a partir de ella |
| **Seudonimizar no es anonimizar** | La diferencia en dos columnas (RGPD art. 4.5 frente al considerando 26) |

Los controles en ámbar son reales: la **minimización** (el texto llega completo al modelo y parte de los datos no hacía falta para decidir), la **EIPD** pendiente de revisión por un cambio de modelo, el **aviso de IA** pendiente en WhatsApp, la **formación** de dos tramitadores nuevos y las **pruebas de sesgo** por canal. Dan conversación: muestran que el panel no maquilla. **DORA** está al 100 % (en verde): el riesgo de concentración en un único proveedor de modelos está mitigado con un plan de salida probado y un segundo proveedor validado.

> Aviso que aparece en pantalla: es un indicador técnico de cobertura de controles, no un certificado; no sustituye la evaluación del DPO ni de Cumplimiento.

### 3.11 FinOps

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

### 3.12 Histórico

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

## 4. Guion sugerido de demo (12 minutos)

El mismo guion está en el **Recorrido de la demo** (modo presentador de Inicio), con un botón «Ir» por paso.

| Min | Dónde | Qué mostrar | Mensaje |
|---|---|---|---|
| 0–2 | Triaje · fases | Recorrer las seis fases | «Así funciona el proceso de punta a punta» |
| 2–4 | Triaje · Procesar Paquete A | Contadores y registro en vivo | «Aprobados y a revisar en segundos» |
| 4–5 | Triaje · ficha de un «A revisar» | Criterio que incumple + evidencias resaltadas (el título cambia al tipo de evidencia) | «Cada decisión es explicable» |
| 5–6 | Gobierno · Inicio → Resumen → Agentes (fuente Sesión actual) | KPIs y tarjetas; clic en Reglas: su ficha completa y el kill switch | «Control total y parada inmediata» |
| 6–7 | Trazabilidad → Reasoning & Replay | Waterfall y replay What-if | «Auditamos y probamos antes de cambiar» |
| 7–8 | Autonomía y Guardrails | Niveles, G-02 y G-04 | «Autonomía graduada con límites claros» |
| 8–9 | Triaje · Respuesta cruda de MSG-A-12 → Gobierno · Termómetro | Bloque `_gobernanza`: datos de un menor y de salud, por qué Salud y no Auto ni Hogar; después el termómetro, el inventario y «Simular una alteración» | «La solución deja a la aseguradora en condiciones de demostrar que cumple» |
| 9–10 | Gobierno · Knowledge bases | Condicionados Auto degradada por 340 documentos de 2024: comparativa de configuraciones y «Aplicar»; editar una rúbrica | «El conocimiento también se degrada, y se vigila igual que los agentes» |
| 10–12 | FinOps → Histórico | Cap superado, recomendaciones, línea de tiempo con todo lo tocado en la demo | «Coste bajo control y todo auditado» |

---

## 5. Cosas a tener en cuenta

- **Los datos del panel son de demostración**: inventados pero coherentes con el Paquete A. Solo las trazas de «Sesión actual» proceden del lote real; histórico, caps y guardrails siguen siendo de demo.
- **Los cambios hechos en el panel** (kill switch, guardrails, caps nuevos, acciones correctivas, acciones sobre las knowledge bases y rúbricas editadas) son simulados y viven en `sessionStorage`: se pierden al cerrar la pestaña. El estado plegado del menú es una preferencia y se guarda en el navegador.
- **Los datos personales de los mensajes son ficticios**: están para que se vea cómo se detectan, se seudonimizan y se protegen.
- **Solo una knowledge base es real** («Reglas de negocio», los bloques de `prompts.js`); el resto aparece marcado como «simulada».
- **Aplicación estática**: sin backend. La clave de IA solo se guarda en la sesión del navegador.
- **Mensajes con resultado esperado**: el triaje compara cada resultado con un «esperado» interno que no se envía a la IA; de ahí los ✔/✖ de la columna Ramo.
