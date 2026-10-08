# Plan: pestaña «Knowledge bases» en observabilidad

> Estado: **propuesta para revisión**. No se ha tocado código.

## 1. Qué problema resuelve

Todo sistema de IA generativa decide con **conocimiento** que no está en el modelo: índices RAG alimentados desde una carpeta de SharePoint o Google Drive, playbooks y normas internas en Markdown, runbooks deterministas, tablas de referencia (cuadro médico, red de talleres) y el corpus normativo. Ese conocimiento **se degrada**:

- el índice crece y aparecen casi duplicados que desplazan a los fragmentos buenos;
- quedan documentos obsoletos (un condicionado de 2024 compite con el de 2026);
- se cambia el modelo de embeddings y el índice viejo deja de ser comparable;
- unos documentos necesitan fragmentos cortos (tablas, cláusulas) y otros largos (manuales), y un único tamaño de chunk sirve mal a los dos.

La pestaña es un **panel de control de los almacenes de conocimiento**: qué hay, cómo está configurado, si sigue respondiendo bien (evaluado de forma continua contra **rúbricas**) y qué versión usó cada decisión.

## 2. Tipos de repositorio

| Tipo | Ejemplos en seguros | Cómo se consulta | Qué puede fallar |
|---|---|---|---|
| **Índice RAG vectorial** | Condicionados generales y particulares, manual de tramitación, notas técnicas | Búsqueda semántica (y opcionalmente híbrida) | Recall que baja, duplicados, obsolescencia, deriva de embeddings |
| **Documentos Markdown** (playbooks, guías, normas internas) | Guía de peritación, política de recobros, criterios de fraude | Se cargan enteros o por sección en el contexto | Versión no alineada con la vigente, contradicciones entre guías |
| **Runbooks deterministas** | Procedimiento de daños corporales, alta de siniestro total, escalado por lesionados | Pasos fijos, sin LLM; el agente solo elige cuál | Pasos caducados, enlaces rotos, responsable sin asignar |
| **Tablas de referencia** (API o base de datos) | Cuadro médico concertado, red de talleres y peritos, baremo de tráfico (Ley 35/2015) | Consulta exacta por clave | Datos desactualizados frente a la fuente maestra |
| **Corpus normativo** | LCS, LOSSEAR, RGPD, AI Act, guías de EIOPA | RAG con metadatos de vigencia | Artículos derogados o modificados |
| **Plantillas de comunicación** | Petición de documentación, aviso de IA (AI Act art. 50) | Por identificador | Plantilla no revisada por Legal |

Fuentes de sincronización: SharePoint, Google Drive, repositorio Git (Markdown y runbooks), API (tablas). Para cada fuente: última sincronización, documentos añadidos, cambiados y borrados, y errores.

## 3. Parámetros que definen un RAG (lo que verá la ficha de cada índice)

| Grupo | Parámetro | Para qué sirve |
|---|---|---|
| Troceado | **Estrategia de chunking** (tamaño fijo, recursiva por títulos, semántica, por cláusula) | Cómo se corta el documento |
| | **Tamaño de chunk** (tokens) | Corto = más preciso; largo = más contexto |
| | **Solapamiento** (overlap, tokens o %) | Que una idea no quede partida entre dos fragmentos |
| | Metadatos por chunk (producto, ramo, vigencia, versión, página) | Filtrar antes de buscar |
| Representación | **Modelo de embeddings** y versión | Si cambia, hay que reindexar todo |
| | Dimensión del vector | Coste de almacenamiento y velocidad |
| Índice | Tipo (HNSW, IVF, plano) y sus parámetros (M, ef_construction, ef_search) | Equilibrio entre exactitud y latencia |
| | **Métrica de distancia** (coseno, producto escalar) | Debe coincidir con la del modelo de embeddings |
| Recuperación | **top-k** | Cuántos fragmentos llegan al modelo |
| | **Umbral de similitud** | Por debajo, «no hay respuesta en la base» |
| | **Búsqueda híbrida** (peso BM25 / vectorial, α) | Códigos, artículos y nombres propios se encuentran mejor por palabra clave |
| | **Reranker** (modelo y top-n tras reordenar) | Mejora la precisión de los primeros resultados |
| | Filtros por metadatos | Solo el producto y la vigencia del siniestro |
| Ciclo de vida | Frecuencia de sincronización y de reindexado | Frescura frente a la fuente |
| | Retención de versiones del índice | Permite volver atrás y hacer replay |

La ficha permitiría **comparar configuraciones**: el mismo corpus indexado con chunks de 256/10 %, 512/15 % y 1.024/20 %, con sus métricas una al lado de otra. Es la forma práctica de decidir el tamaño de chunk.

## 4. Salud de cada base de conocimiento

**Semáforo por KB** con su tendencia (sparkline de 14 días), calculado a partir de:

| Señal | Cómo se mide | Umbral orientativo |
|---|---|---|
| **Calidad de recuperación** | Context recall y context precision contra el juego de preguntas de referencia | Recall ≥ 0,85 |
| **Fidelidad** (groundedness) | ¿La respuesta se apoya solo en los fragmentos recuperados? | ≥ 0,90 |
| **Exactitud de las citas** | ¿El fragmento citado contiene de verdad lo que se afirma? (misma idea que las evidencias del triaje) | ≥ 0,95 |
| **Sin respuesta** | Consultas reales por debajo del umbral de similitud | < 5 % |
| **Frescura** | Días desde la última sincronización frente a su SLA | según la KB |
| **Obsolescencia** | Documentos con vigencia vencida que siguen indexados | 0 |
| **Duplicados** | Pares de chunks con similitud > 0,97 | < 2 % |
| **Deriva** | Caída de recall en las mismas preguntas tras cada reindexado | < 3 pp |
| **Latencia p95** de la recuperación | | < 400 ms |
| **Datos personales** en el índice | Detector de `cumplimiento.js` aplicado a los chunks | 0 en KB que no deban tenerlos |

## 5. Rúbricas: la colección también hay que gobernarla

La salud solo es tan buena como las pruebas. Propongo que las rúbricas sean un **activo propio, versionado**:

- **Juego de referencia por KB** (golden set): pregunta, respuesta esperada, fuentes esperadas y tipo (factual, cláusula exacta, exclusión, plazo, pregunta trampa sin respuesta).
- **Rúbrica de evaluación** con criterios puntuables (fidelidad, completitud, cita correcta, tono, rechazo correcto cuando no hay respuesta), la evalúa un modelo juez y se **calibra con personas**. Se muestra el acuerdo entre el juez y los revisores humanos: si baja, el juez deja de ser fiable.
- **Cobertura**: qué productos, ramos y tipos de pregunta cubre cada colección, y qué huecos tiene. Por ejemplo, «Hogar · robo: 3 preguntas, insuficiente».
- **Ciclo**: las rúbricas se ejecutan en cada reindexado, cada cambio de configuración y cada noche. Si una KB empeora, no se publica la versión nueva (puerta de calidad), igual que el replay antes de cambiar de modelo.
- **Responsable y versión** de cada rúbrica, con su historial de cambios.

## 6. Diseño de la pestaña

Una sección nueva en el menú lateral, entre «Guardrails» y «Termómetro de cumplimiento»:

1. **KPI**: número de KB, cuántas en verde, ámbar y rojo, recall medio, consultas sin respuesta y última evaluación.
2. **Inventario** en tarjetas: tipo, fuente (SharePoint, Drive, Git, API), documentos y chunks, versión, responsable, agentes que la consumen, semáforo y tendencia. Filtros por tipo y por estado.
3. **Ficha de la KB** (modal, como la ficha del agente):
   - Configuración (tabla del apartado 3) y comparativa de configuraciones.
   - Salud: métricas con su tendencia y los umbrales.
   - Evaluación: última ejecución de rúbricas, preguntas que fallan con lo recuperado y lo esperado (drill-down).
   - Fuente y sincronización: altas, cambios, bajas y errores.
   - Uso: consultas, documentos más usados y consultas sin respuesta (candidatas a nuevo contenido).
   - Versiones del índice, con «volver a esta versión».
   - Acciones simuladas, como en el resto del panel: reindexar, poner un documento en cuarentena, pausar la KB y ejecutar rúbricas. Todas quedan en el Histórico.
4. **Rúbricas**: colección con cobertura, versión, responsable y acuerdo juez-humano.

## 7. Coherencia con el resto de la solución

- **Cada traza registra qué KB y qué versión usó**: nuevo campo `_gobernanza.trazabilidad.conocimiento: [{ kb, version, fragmentos }]`. Sin eso no hay replay determinista.
- El control **AI Act art. 10** del Termómetro, hoy en ámbar («bases de conocimiento sin catálogo versionado»), pasa a medirse con el catálogo y a verde cuando todas las KB tengan versión y rúbrica.
- El **derecho de supresión** (RGPD art. 17) llega también a los índices vectoriales: si un documento con datos personales se borra en la fuente, hay que comprobar que su chunk desaparece del índice. Es un control nuevo del termómetro.
- La regla **S5** (cuadro médico) y la **A7** (taller concertado) del triaje pasarían a citar su fuente, la tabla de referencia, con versión.

## 8. Honestidad en la demo

Hoy la demo **no usa RAG**: las reglas van en el prompt (reglas v2.3). En la pestaña:

- la **KB «Reglas de negocio Auto / Hogar / Salud»** sería la única real (los bloques de `prompts.js`, con su versión);
- el resto se mostraría con la marca **«simulada en la demo»**, con datos inventados pero coherentes, igual que el histórico de 14 días.

## 9. Datos de ejemplo propuestos

| KB | Tipo | Fuente | Chunk / overlap | Estado | Motivo |
|---|---|---|---|---|---|
| Reglas de negocio v2.3 | Markdown | Git (`prompts.js`) | sin trocear | Verde | Real, versionada en cada traza |
| Condicionados Auto 2026 | RAG | SharePoint · Producto | 512 / 15 % · híbrida α 0,6 · reranker | Ámbar | Recall cae 6 pp tras añadir 340 documentos del condicionado 2024 |
| Condicionados Hogar 2026 | RAG | SharePoint · Producto | 384 / 10 % | Verde | |
| Manual de tramitación | RAG | Google Drive · Siniestros | 1.024 / 20 % | Ámbar | 2 % de duplicados; 11 % de consultas sin respuesta en robo |
| Cuadro médico concertado | Tabla | API de proveedores | — | Verde | Sincronizado cada noche |
| Red de talleres y peritos | Tabla | API | — | Rojo | Última sincronización hace 9 días (SLA 1 día) |
| Runbook daños corporales | Runbook | Git | — | Verde | Lo usa la regla A5 |
| Corpus normativo (LCS, LOSSEAR, RGPD, AI Act) | RAG | Git | por artículo | Verde | Metadatos de vigencia |
| Plantillas al cliente | Plantilla | Git | — | Ámbar | Falta el aviso de IA en WhatsApp (enlaza con AI Act art. 50 del termómetro) |

## 10. Fases

1. Modelo de datos en `data/gobierno.js` (`knowledge[]`, `rubricas[]`) e inventario con su ficha.
2. Salud y evaluación con rúbricas (series de 14 días, drill-down de fallos).
3. Comparativa de configuraciones de chunking y versiones del índice.
4. Enlace con las trazas (`conocimiento` en `_gobernanza`) y con el Termómetro (AI Act art. 10 y RGPD art. 17).

## 11. Decisiones que necesito que confirmes

1. ¿Te encaja la lista de KB del apartado 9 o quieres otras?
2. ¿La pestaña va entre Guardrails y el Termómetro o al final?
3. ¿Incluimos la **comparativa de configuraciones** (fase 3) en la primera entrega o la dejamos para después?
4. Para las rúbricas, ¿basta con la colección y sus resultados, o quieres también poder **editarlas** desde el panel, aunque sea simulado?
