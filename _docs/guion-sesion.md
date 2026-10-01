# Guion de la sesión: triaje de siniestros con agentes gobernados

Sesión de ~40 minutos: **15 min de presentación** (el problema y cómo resolverlo) y **20-25 min de demo** sobre las dos pantallas descritas en [guia-demo.md](guia-demo.md).

Idea fuerza: la IA generativa ya clasifica y extrae; lo difícil es ponerla en producción en una aseguradora de forma **segura, trazable, conforme a la normativa y con el coste bajo control**. Esto no es un producto: es cómo se trabaja hoy con IA en una empresa regulada.

---

## 1. Presentación (15 min, 9 slides)

| Min | Slide | Contenido | Frase clave |
|---|---|---|---|
| 0-1 | **1. Apertura** | Título y agenda en una línea: problema → marco → solución → demo | «Hoy no os voy a enseñar que la IA clasifica un siniestro. Eso ya lo sabéis. Os voy a enseñar cómo se pone en producción.» |
| 1-3 | **2. La avalancha** | ~11 M de siniestros de Auto al año en España, uno cada 3 s (UNESPA). Cinco canales: email, WhatsApp, chat, web y teléfono. Plazo de 7 días del art. 16 de la LCS. El coste de gestión supone un 10-12 % de la prima | «Cada mensaje lo lee, lo clasifica y lo teclea una persona. Ahí se va el tiempo y el dinero.» |
| 3-4 | **3. Clasificar ya está resuelto** | Un prompt clasifica y extrae con más de un 90 % de acierto. Se monta en una tarde | «Esto ya no diferencia a nadie.» |
| 4-6 | **4. El problema real: de piloto a producción** | Más del 90 % de las aseguradoras prueba IA; el 22 % la tiene en producción; el 4 % en el caso de agentes. Gartner: más del 40 % de los proyectos agénticos se cancelarán antes de 2027 por **coste, valor poco claro y riesgo sin controlar** | «Los proyectos no mueren porque la IA falle. Mueren porque nadie puede responder tres preguntas: ¿por qué decidió eso?, ¿quién lo controla?, ¿cuánto cuesta?» |
| 6-9 | **5. Lo que exige la regulación** | Dos columnas: **ya en vigor** (RGPD art. 22 y art. 15 con la sentencia SCHUFA, RGPD art. 9 para Salud, DORA para proveedores de LLM, Opinión de EIOPA, AI Act art. 4 y art. 50) y **lo que llega** (alto riesgo del AI Act en diciembre de 2027, LO española de IA con AESIA y DGSFP, multas de hasta 35 M€ o el 7 %) | «Un humano que firma sin mirar no cuenta como supervisión: lo dijo el TJUE. Y el aplazamiento no es una excusa: quien construya sin gobierno ahora lo rehará en 2027.» |
| 9-10 | **6. Lo que no existe en el mercado** | Hay piezas sueltas: observabilidad de LLM, plataformas GRC y OpenTelemetry GenAI. Nadie las une a *tu* proceso, *tus* reglas y *tu* contabilidad de costes | «Esto no es un producto. Es cómo se trabaja hoy con IA en una empresa regulada.» |
| 10-12 | **7. La solución: agentes pequeños y gobernados** | Diagrama: Multicanalidad → Clasificación → Extracción → Reglas → Decisión, con la capa de gobierno debajo. Cada agente tiene una función, un modelo, una versión de prompt y un nivel de autonomía | «No es una IA que lo hace todo. Son cuatro especialistas, y cada uno tiene sus propios límites.» |
| 12-14 | **8. Seis pilares, cada uno con su prueba** | Seguro por diseño (guardrails, kill switch) · Compliance por defecto (trazas) · Auditable (Histórico) · Explicable (regla + evidencia, Reasoning replay) · Resiliente (fallback, reintentos) · FinOps (caps, coste por decisión). Cada pilar enlazado al artículo de la norma y a la pantalla de la demo donde se ve | «Todo lo que voy a decir ahora lo vais a ver funcionando.» |
| 14-15 | **9. Puente a la demo** | Los dos públicos de la demo: tramitación ve el triaje; riesgos, auditoría y finanzas ven el gobierno | «Primero lo que ve el tramitador. Después lo que ve el auditor y el CFO.» |

### Matices para no pisar charcos

- **El triaje de siniestros no es «alto riesgo» según el AI Act.** El Anexo III 5(c) cubre solo la evaluación de riesgo y la tarificación en Vida y Salud, y el Digital Omnibus (aprobado el 29/06/2026) aplaza las obligaciones de alto riesgo al 2/12/2027. El argumento normativo de hoy se apoya en el RGPD, DORA y EIOPA; el AI Act es el horizonte.
- **No decir «no existe nada en el mercado».** Existen piezas (Datadog, Langfuse, Arize, IBM watsonx.governance, Credo AI). Lo que no existe es el gobierno integrado con el proceso y las reglas del cliente: eso es implementación.
- **Cifras de mercado.** Algunas (coste de gestión del 10-12 %, ahorro del 25-30 % según McKinsey) vienen de fuentes secundarias: verificar en la fuente original antes de cerrar las slides.

---

## 2. Demo (20-25 min)

**Antes de empezar:** pestaña abierta, motor en «Resultados guardados» (no depende de red) y Paquete A seleccionado.

| Min | Bloque | Dónde y qué hacer | Mensaje | Pilar / norma |
|---|---|---|---|---|
| 0-3 | **1. El proceso** | Triaje: recorrer las 6 fases del breadcrumb y enseñar 2-3 mensajes de canales distintos (WhatsApp informal, transcripción telefónica) | «El canal no cambia el tratamiento.» | — |
| 3-6 | **2. El lote en vivo** | **Procesar paquete**: contadores, registro y ✔/✖ frente al resultado esperado. Pausar y continuar a mitad | «En segundos, cada mensaje tiene ramo, datos y decisión.» | Resiliente |
| 6-9 | **3. Explicabilidad** | Abrir un mensaje «A revisar» (lesionados o importe alto): criterio que incumple, la frase del cliente que lo prueba, datos nulos (no se inventa nada) y la respuesta cruda del modelo | «Si el cliente pregunta por qué, aquí está la respuesta, con su propia frase.» | Explicable · RGPD art. 15 |
| 9-10 | **4. Las reglas son de negocio, no del modelo** | Editar una regla en el prompt (por ejemplo, el límite de importe) y reprocesar un mensaje | «Las reglas las decide negocio y se cambian sin programar.» | Compliance |
| 10-12 | **5. Vista de dirección** | Gobierno con fuente «Sesión actual»: KPIs (autonomía 81 %, overrides 2,1 %), tarjetas de agente y **kill switch** en directo. Abrir la ficha del agente de Reglas: **identidad y permisos** («puede proponer, no puede pagar ni rechazar») | «Control total: puedo parar un agente y no se pierde ningún mensaje. Y cada agente tiene identidad, responsable y permisos mínimos.» | Seguro por diseño · DORA art. 9 |
| 12-15 | **6. Trazabilidad** | Abrir una traza: waterfall por agente con modelo, tokens, latencia y coste; guardrail disparado y override | «Mensaje a mensaje: qué pasó, quién decidió y cuánto costó.» | AI Act art. 12 · DORA |
| 15-18 | **7. Reasoning & Replay** | Razonamiento por agente; Replay idéntico (determinismo) y después **what-if** cambiando `gpt-5` por `gpt-5-mini` en Reglas, con el diff de decisión y coste | «Llega el auditor y pregunta por qué: aquí está. ¿Y si cambio de modelo? Lo pruebo antes de desplegar.» | Auditable · Explicable |
| 18-20 | **8. Autonomía** | Niveles L0-L3, tarjetas de agente y la ficha de Reglas (bajó de L3 a L2 al superar el 3 % de overrides). Auditoría de cambios con quién lo aprobó | «La autonomía se gana con datos y se pierde con datos. La IA prepara, la persona decide.» | AI Act art. 14 · RGPD art. 22 |
| 20-22 | **9. Guardrails** | Tabla G-01 a G-09: detenerse en G-02 (importe) y G-04 (lesionados). Desactivar uno y comprobar que aparece en el Histórico | «Los guardrails son lo que permite dar autonomía sin perder el control.» | Seguro por diseño |
| 22-24 | **10. FinOps** | Cap superado, acción correctiva «Pendiente del Comité IA», el agente de Reglas con el ~79 % del coste, tabla de modelos (coste frente a calidad) y recomendaciones | «No queremos el modelo más barato. Queremos el más barato que mantiene la calidad, y el replay lo demuestra.» | FinOps |
| 24-25 | **11. Cierre** | Histórico filtrado: todo lo tocado en la sesión aparece como «Operador (esta sesión)» | «Este es el libro de registro que pide el regulador. Se rellena solo.» | Compliance |

**Si vas justo de tiempo** (unos 20 min): quita el bloque 4, reduce el bloque 1 a 1 minuto y une los bloques 8 y 9 en 3 minutos.

**Etiquetas de norma:** en cada bloque del panel, pasar el ratón por la etiqueta ⚖ para enlazar con la slide 5 («esto es lo que pide el art. 12»).

**Niveles de autonomía:** usar siempre la nomenclatura de la demo (L0 Manual → L3 Autónomo).

---

## 3. Fuentes

- [EIOPA – Opinion on AI governance and risk management (ago. 2025)](https://www.eiopa.europa.eu/eiopa-publishes-opinion-ai-governance-and-risk-management-2025-08-06_en)
- [Gibson Dunn – AI Act Omnibus agreement](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/)
- [Praxikon – aplazamiento del alto riesgo a diciembre de 2027](https://www.praxikon.com/en/posts/digital-omnibus-high-risk-postponement-december-2027)
- [Openlayer – AI governance for insurance](https://www.openlayer.com/blog/ai-governance-insurance-eu-ai-act)
- [William Fry – sentencia SCHUFA (C-634/21)](https://www.williamfry.com/knowledge/ecj-says-no-in-schufa-case-new-decision-on-automated-decision-making/)
- [Pinsent Masons – Dun & Bradstreet (C-203/22)](https://pinsentmasons.com/out-law/analysis/gdpr-ruling-commercial-implications-credit-reference-agencies)
- [DeepInspect – DORA y proveedores de IA](https://www.deepinspect.ai/blog/dora-third-party-ai-risk)
- [Grupo Aseguranza – la DGSFP como autoridad de IA](https://www.grupoaseguranza.com/noticias-de-seguros/dgsfp-entre-autoridades-vigilaran-sistemas-alto-riesgo-ia)
- [Economist & Jurist – LO de IA en España](https://www.economistjurist.es/zbloque-1/ley-organica-de-ia-espana-aterriza-el-ai-act-con-aesia-sanciones-y-sandboxes/)
- [UNESPA – siniestros de automóvil](https://www.unespa.es/notasdeprensa/siniestros-automovil-datos-2024/)
- [Acquaint – automatización de siniestros (coste de gestión, McKinsey)](https://acquaintsoft.com/blog/insurance-claims-automation)
- [The Insurer – encuesta IA Capital](https://www.theinsurer.com/ti/news/openai-dominates-ai-stacks-as-insurance-industry-moves-from-pilot-to-production-2026-05-06/)
- [Outcome Catalyst – tendencias de IA en seguros 2026](https://www.outcomecatalyst.com/blog/insurance-ai-data-trends-2026)
- [Outlook Business – Gartner, 40 % de proyectos agénticos cancelados](https://www.outlookbusiness.com/deeptech/artificial-intelligence/over-40-of-agentic-ai-projects-will-be-scrapped-by-2027-says-gartner)
- [TrueFoundry – OpenTelemetry GenAI](https://www.truefoundry.com/blog/opentelemetry-genai-semantic-conventions)
- [nOps – State of FinOps 2026](https://www.nops.io/blog/state-of-finops-2026/)
