# Guion de la sesión: triaje de siniestros con agentes gobernados

Sesión de ~45 minutos: **15 min de presentación** (el problema y cómo resolverlo) y **25-30 min de demo** sobre las dos pantallas descritas en [guia-demo.md](guia-demo.md).

Idea fuerza: la IA generativa ya clasifica y extrae; lo difícil es ponerla en producción en una aseguradora de forma **segura, trazable, conforme a la normativa y con el coste bajo control**. Esto no es un producto: es cómo se trabaja hoy con IA en una empresa regulada.

---

## 1. Presentación (15 min, 16 diapositivas)

Nueve bloques de contenido repartidos en 16 diapositivas (portada, agenda, cuatro separadores, contenido y cierre). La columna «Diap.» indica el número en [slides-sesion-v3.pptx](slides-sesion-v3.pptx); el detalle de cada diapositiva está en [slides-sesion.md](slides-sesion.md).

| Min | Diap. | Slide | Contenido | Frase clave |
|---|---|---|---|---|
| 0-1 | 1-3 | **1. Apertura** | Título y agenda en una línea: problema → marco → solución → demo | «Hoy no os voy a enseñar que la IA clasifica un siniestro. Eso ya lo sabéis. Os voy a enseñar cómo se pone en producción.» |
| 1-3 | 4 | **2. La avalancha** | ~11 M de siniestros de Auto al año en España, uno cada 3 s (UNESPA). Cinco canales: email, WhatsApp, chat, web y teléfono. Plazo de 7 días del art. 16 de la LCS. La gestión de siniestros se lleva ~10 % de la prima de Auto (EE. UU., 2023, III/NAIC) | «Cada mensaje lo lee, lo clasifica y lo teclea una persona. Ahí se va el tiempo y el dinero.» |
| 3-4 | 5 | **3. Clasificar ya está resuelto** | Un prompt clasifica y extrae con más de un 90 % de acierto. Se monta en una tarde | «Esto ya no diferencia a nadie.» |
| 4-6 | 6 | **4. El problema real: de piloto a producción** | Más del 90 % de las aseguradoras prueba IA; el 22 % la tiene en producción; el 4 % en el caso de agentes. Gartner: más del 40 % de los proyectos agénticos se cancelarán antes de 2027 por **coste, valor poco claro y riesgo sin controlar** | «Los proyectos no mueren porque la IA falle. Mueren porque nadie puede responder tres preguntas: ¿por qué decidió eso?, ¿quién lo controla?, ¿cuánto cuesta?» |
| 6-9 | 7-8 | **5. Lo que exige la regulación** | Dos columnas: **ya en vigor** (RGPD art. 22 y art. 15 con la sentencia SCHUFA, RGPD art. 9 para Salud, DORA para proveedores de LLM, Opinión de EIOPA, AI Act art. 4 y art. 50) y **lo que llega** (alto riesgo del AI Act en diciembre de 2027, LO española de IA con AESIA y DGSFP, multas de hasta 35 M€ o el 7 %) | «Un humano que firma sin mirar no cuenta como supervisión: lo dijo el TJUE. Y el aplazamiento no es una excusa: quien construya sin gobierno ahora lo rehará en 2027.» |
| 9-10 | 9-10 | **6. Lo que no existe en el mercado** | Hay piezas sueltas: observabilidad de LLM, plataformas GRC y OpenTelemetry GenAI. Nadie las une a *tu* proceso, *tus* reglas y *tu* contabilidad de costes | «Esto no es un producto. Es cómo se trabaja hoy con IA en una empresa regulada.» |
| 10-12 | 11-12 | **7. La solución: agentes pequeños y gobernados** | Diagrama: Multicanalidad → Clasificación → Extracción → Reglas → Decisión, con la capa de gobierno debajo (diap. 11). Cada agente tiene una función, un modelo, una versión de prompt, un nivel de autonomía de L0 a L3 y un responsable con permisos (diap. 12) | «No es una IA que lo hace todo. Son cuatro especialistas, y cada uno tiene sus propios límites.» |
| 12-14 | 13 | **8. Seis pilares, cada uno con su prueba** | Seguro por diseño (guardrails, kill switch) · Compliance por defecto (trazas) · Auditable (Histórico) · Explicable (regla + evidencia, Reasoning replay) · Resiliente (fallback, reintentos) · FinOps (caps, coste por decisión). Cada pilar enlazado al artículo de la norma y a la pantalla de la demo donde se ve | «Todo lo que voy a decir ahora lo vais a ver funcionando.» |
| 14-15 | 14-16 | **9. Puente a la demo** | Los dos públicos de la demo, con una captura de cada pantalla: tramitación ve el triaje; riesgos, auditoría y finanzas ven el gobierno | «Primero lo que ve el tramitador. Después lo que ve el auditor y el CFO.» |

### Matices para no pisar charcos

- **El triaje de siniestros no es «alto riesgo» según el AI Act.** El Anexo III 5(c) cubre solo la evaluación de riesgo y la tarificación en Vida y Salud, y el Digital Omnibus (aprobado el 29/06/2026) aplaza las obligaciones de alto riesgo al 2/12/2027. El argumento normativo de hoy se apoya en el RGPD, DORA y EIOPA; el AI Act es el horizonte.
- **No decir «no existe nada en el mercado».** Existen piezas (Datadog, Langfuse, Arize, IBM watsonx.governance, Credo AI). Lo que no existe es el gobierno integrado con el proceso y las reglas del cliente: eso es implementación.
- **Cifras de mercado.** Verificadas en la fuente original: ~11 M y «uno cada 3 s» (UNESPA), >90 % (Conning) y >40 % (Gartner). El coste de gestión es un dato de EE. UU. (~10 % de la prima de Auto en 2023, III con datos NAIC); no hay dato público equivalente para España, y sustituye al 10-12 % anterior, cuya fuente secundaria no lo respaldaba. El 22 % solo se ha encontrado citado (Outcome Catalyst, con datos de Conning). **El 4 % de agentes en producción no está verificado** (The Insurer, artículo de pago) y una búsqueda atribuye a Celent cifras muy superiores: confirmarlo antes de presentar o quitarlo. El ahorro del 25-30 % según McKinsey sigue sin verificar en la fuente original.

---

## 2. Demo (25-30 min)

**Antes de empezar:** pestaña abierta, motor en «Resultados guardados» (no depende de red) y Paquete A seleccionado.

| Min | Bloque | Dónde y qué hacer | Mensaje | Pilar / norma |
|---|---|---|---|---|
| 0-3 | **1. El proceso** | Triaje: recorrer las 6 fases del breadcrumb y enseñar 2-3 mensajes de canales distintos (WhatsApp informal, transcripción telefónica) | «El canal no cambia el tratamiento.» | — |
| 3-6 | **2. El lote en vivo** | **Procesar paquete**: contadores, registro y ✔/✖ frente al resultado esperado. Pausar y continuar a mitad | «En segundos, cada mensaje tiene ramo, datos y decisión.» | Resiliente |
| 6-9 | **3. Explicabilidad** | Abrir un mensaje «A revisar» (MSG-A-08, moto con lesionado): las evidencias resaltadas (al pasar el ratón el título cambia a su tipo; «Leyenda» explica los colores), el criterio que incumple, la frase del cliente que lo prueba y los datos nulos (no se inventa nada) | «Si el cliente pregunta por qué, aquí está la respuesta, con su propia frase.» | Explicable · RGPD art. 15 |
| 9-11 | **4. La respuesta cruda, preparada para el regulador** | MSG-A-12 (menor en urgencias) → «Respuesta cruda» con «+ Gobierno»: datos personales marcados (menor, salud), por qué es Salud y no Auto ni Hogar, hash SHA-256, retención de 5 años y supervisión humana; cada parte con su norma. Después, en MSG-A-08, la vista **Enviado al modelo**: nombres, pólizas, matrículas y teléfono como marcadores ([PERSONA_1], [POLIZA_AU_1]…), y la fractura y la diabetes intactas porque hacen falta para decidir | «El modelo no se autocertifica: la plataforma deja la prueba de cumplimiento en cada decisión. Y el modelo decide sin ver quién es el asegurado.» | AI Act art. 12-13 · RGPD art. 5.1.c, 9 y 22 |
| 11-12 | **5. Las reglas son de negocio, no del modelo** | Editar una regla en el prompt (por ejemplo, el límite de importe) y reprocesar un mensaje | «Las reglas las decide negocio y se cambian sin programar.» | Compliance |
| 12-14 | **6. Vista de dirección** | Gobierno con fuente «Sesión actual» (las trazas tienen el mismo id que las fichas). Empezar en **Inicio** (una ficha por pregunta) y pasar al Resumen: KPIs (autonomía 81 %, overrides 2,1 %), tarjetas de agente y **kill switch** en directo. Clic en Reglas para ir a su pestaña en **Agentes**: **identidad y permisos** («puede proponer, no puede pagar ni rechazar»), el **índice de calidad** (círculo del 98 %), coste y el contrato de entrada y salida si hay perfiles técnicos | «Control total: puedo parar un agente y no se pierde ningún mensaje. Y cada agente tiene identidad, responsable y permisos mínimos.» | Seguro por diseño · DORA art. 9 |
| 14-16 | **7. Trazabilidad** | Abrir una traza: waterfall por agente con modelo, tokens, latencia y coste; guardrail disparado y override | «Mensaje a mensaje: qué pasó, quién decidió y cuánto costó.» | AI Act art. 12 · DORA |
| 16-18 | **8. Reasoning & Replay** | Razonamiento por agente; Replay idéntico (determinismo) y después **what-if** cambiando `gpt-5` por `gpt-5-mini` en Reglas, con el diff de decisión y coste | «Llega el auditor y pregunta por qué: aquí está. ¿Y si cambio de modelo? Lo pruebo antes de desplegar.» | Auditable · Explicable |
| 18-20 | **9. Autonomía** | Niveles L0-L3 con sus agentes y la auditoría de cambios: Reglas bajó de L3 a L2 al superar el 3 % de overrides, con quién lo aprobó | «La autonomía se gana con datos y se pierde con datos. La IA prepara, la persona decide.» | AI Act art. 14 · RGPD art. 22 |
| 20-22 | **10. Guardrails** | Tabla G-01 a G-09: detenerse en G-02 (importe) y G-04 (lesionados). Desactivar uno y comprobar que aparece en el Histórico | «Los guardrails son lo que permite dar autonomía sin perder el control.» | Seguro por diseño |
| 22-24 | **11. Knowledge bases** | Condicionados Auto degradada (340 documentos de 2024): salud contra umbrales, **comparativa de configuraciones** y «Aplicar»; Red de talleres en rojo (API caída). Editar una rúbrica: los pesos deben sumar 100 y se guarda una versión nueva | «El conocimiento también se degrada. Lo medimos contra rúbricas y cada traza dice qué versión usó.» | AI Act art. 10 |
| 24-26 | **12. Termómetro de cumplimiento** | Termómetros por marco, la matriz norma → control (medido o declarado), los controles en ámbar (EIPD, aviso de IA en WhatsApp; la minimización está en verde con «Sesión actual» gracias a la seudonimización y en ámbar en el histórico de la demo), el inventario de datos personales y «Simular una alteración» en la cadena de integridad | «No es un certificado: es la evidencia que necesita vuestro DPO, recalculada con cada traza.» | AI Act · RGPD · DORA · EIOPA |
| 26-28 | **13. FinOps y medidas correctivas** | Cap superado, el agente de Reglas con el ~79 % del coste y la tabla de modelos (coste frente a calidad). Pasar a **Medidas correctivas**: la lista priorizada con sus alternativas; «Aplicar» la recomendada de M-01 y ver subir el **ahorro conseguido** a 237 €/mes; «Solicitar aprobación» en M-02 (queda pendiente del Comité IA) | «No queremos el modelo más barato. Queremos el más barato que mantiene la calidad. Y cada problema detectado tiene dueño, alternativa y verificación.» | FinOps · AI Act art. 9 |
| 28-30 | **14. Cierre** | Histórico filtrado: todo lo tocado en la sesión aparece como «Operador (esta sesión)» | «Este es el libro de registro que pide el regulador. Se rellena solo.» | Compliance |

**Si vas justo de tiempo** (unos 20 min): quita los bloques 5 y 11, reduce el bloque 1 a 1 minuto, une los bloques 9 y 10 en 3 minutos y deja el termómetro (bloque 12) en 1 minuto.

**Etiquetas de norma:** en cada bloque del panel, pasar el ratón por la etiqueta ⚖ para enlazar con la slide 5 («esto es lo que pide el art. 12»).

**Niveles de autonomía:** usar siempre la nomenclatura de la demo (L0 Manual → L3 Autónomo).

---

## 3. Fuentes

- [RGPD (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [DORA (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2022/2554/oj) · [AI Act (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [TJUE C-634/21 (SCHUFA)](https://curia.europa.eu/juris/liste.jsf?num=C-634/21) · [TJUE C-203/22 (Dun & Bradstreet)](https://curia.europa.eu/juris/liste.jsf?num=C-203/22)
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
- [BOE – Ley 50/1980 de Contrato de Seguro, art. 16](https://www.boe.es/buscar/act.php?id=BOE-A-1980-22501#a16)
- [Insurance Information Institute – Private Passenger Auto Underwriting Expenses (NAIC)](https://www.iii.org/table-archive/23229)
- [Acquaint – automatización de siniestros (ahorro según McKinsey; no respalda el 10-12 % de coste de gestión)](https://acquaintsoft.com/blog/insurance-claims-automation)
- [Conning – AI in Insurance 2025 (nota de prensa)](https://conning.com/about-us/news/ir-pr---ai-survey-2025)
- [The Insurer – encuesta IA Capital](https://www.theinsurer.com/ti/news/openai-dominates-ai-stacks-as-insurance-industry-moves-from-pilot-to-production-2026-05-06/)
- [Outcome Catalyst – tendencias de IA en seguros 2026](https://www.outcomecatalyst.com/blog/insurance-ai-data-trends-2026)
- [Gartner – nota de prensa del 25/06/2025 (40 % de proyectos agénticos cancelados)](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [Outlook Business – Gartner, 40 % de proyectos agénticos cancelados](https://www.outlookbusiness.com/deeptech/artificial-intelligence/over-40-of-agentic-ai-projects-will-be-scrapped-by-2027-says-gartner)
- [TrueFoundry – OpenTelemetry GenAI](https://www.truefoundry.com/blog/opentelemetry-genai-semantic-conventions)
- [nOps – State of FinOps 2026](https://www.nops.io/blog/state-of-finops-2026/)
