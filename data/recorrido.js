// Guion del Recorrido de la demo (modo presentador, shell.js): 10 pasos repartidos entre el triaje y el gobierno.
// Cada paso: minuto del guion, página, título, qué enseñar, frase clave, acción que lleva a la pantalla exacta
// y subtítulos de dos líneas: qué hace la función (técnico-funcional) y cómo ayuda al negocio a cumplir.
// Son los textos por defecto: cada presentador puede editarlos en el engranaje del recorrido (se guardan solo
// en su navegador) y restaurarlos desde ahí.
const RECORRIDO_DEMO = {
  pasos: [
    {
      min: '0–2', pagina: 'triaje', titulo: 'Las seis fases del proceso', accion: 'fases',
      que: 'Recorrer las seis fases numeradas (clic en cada una para ver su ficha)',
      frase: 'Así funciona el proceso de punta a punta',
      subtitulos: [
        { tecnico: 'Cuatro agentes de IA en cadena: recepción multicanal, clasificación por ramo, extracción de datos y reglas de negocio de Auto, Hogar y Salud.', negocio: 'El aviso llega al tramitador ya clasificado, con los datos extraídos y una propuesta de decisión. Cada agente tiene un responsable asignado.' },
        { tecnico: 'Cada fase tiene su ficha: qué recibe, qué entrega, con qué modelo y bajo qué reglas. Trazabilidad y automatización cierran el circuito.', negocio: 'Es la documentación que pide un auditor antes de dar por bueno un sistema de IA. Sigue la opinión de EIOPA de 2025 sobre gobierno de la IA en seguros.' },
      ],
    },
    {
      min: '2–4', pagina: 'triaje', titulo: 'Procesar el Paquete A', accion: 'procesar',
      que: 'Contadores y registro en vivo; pausar y continuar a mitad',
      frase: 'Aprobados y a revisar en segundos',
      subtitulos: [
        { tecnico: 'Entran 13 avisos por cinco canales: email, web, chat, WhatsApp y teléfono. La llamada se transcribe y todo se normaliza a un único formato.', negocio: 'Un aviso por WhatsApp recibe el mismo criterio que uno por email. El cliente elige el canal; la aseguradora mantiene la trazabilidad.' },
        { tecnico: 'De los 13 avisos, 10 se aprueban solos y 3 pasan a revisión. Los contadores se actualizan en vivo y el lote se puede pausar a mitad.', negocio: 'El tramitador dedica su tiempo a los 3 casos que necesitan criterio. En los últimos 14 días, el 81 % de las decisiones salió sin intervención humana.' },
        { tecnico: 'Cada aviso deja su traza al momento: modelo, tokens, coste en euros y decisión.', negocio: 'El registro se genera solo, sin trabajo manual. Es la evidencia que se presenta en una auditoría (RIA art. 12, aplicado como buena práctica).' },
      ],
    },
    {
      min: '4–5', pagina: 'triaje', titulo: 'Ficha de un «A revisar» (MSG-A-08)', accion: 'ficha:MSG-A-08:mensaje',
      que: 'Regla que incumple y evidencias resaltadas: al pasar el ratón, el título cambia al tipo de evidencia',
      frase: 'Cada decisión es explicable',
      subtitulos: [
        { tecnico: 'MSG-A-08 es un accidente de moto con un lesionado ingresado y un tercero implicado. La ficha marca la regla que incumple y resalta las frases del mensaje que lo justifican.', negocio: 'El tramitador entiende el motivo en segundos y puede corregirlo. Si el cliente pide explicaciones, la respuesta está en la ficha (RGPD art. 15 y 22).' },
        { tecnico: 'Con lesionados, el guardrail G-04 impide que el agente decida. El caso pasa a gestión especializada de daños corporales.', negocio: 'Un daño personal siempre lo valora una persona. En los últimos 14 días, G-04 explica el 20 % de los escalados.' },
      ],
    },
    {
      min: '5–6', pagina: 'gobierno', titulo: 'Resumen y agentes', accion: 'agentes',
      que: 'Inicio → Resumen (KPI y alertas de todas las fuentes) → Agentes: ficha de Reglas y kill switch',
      frase: 'Control total y parada inmediata',
      subtitulos: [
        { tecnico: 'El Resumen pone en una pantalla la autonomía efectiva, los overrides humanos, el coste frente al cap y las alertas de todas las fuentes.', negocio: 'Dirección sabe si el sistema va bien sin pedir un informe. Hoy: 81 % de autonomía y 2,1 % de overrides, por debajo del objetivo del 3 %.' },
        { tecnico: 'La ficha del agente de Reglas muestra modelo, versión de prompt, latencia y coste. El kill switch lo para con un clic.', negocio: 'Si un agente se comporta mal, se para al instante. Sus mensajes esperan en cola hasta reanudarlo y no se pierde ninguno (RIA art. 14).' },
        { tecnico: 'Reglas aparece degradado. Agotó su cap diario y G-07 lo pasó a gpt-5-mini en lugar de detener el lote.', negocio: 'Se acaba el presupuesto del día y el servicio sigue abierto, con cada mensaje degradado anotado en su traza (DORA art. 11, continuidad).' },
      ],
    },
    {
      min: '6–7', pagina: 'gobierno', titulo: 'Trazabilidad y Reasoning & Replay', accion: 'goto:replay',
      que: 'Waterfall de una traza y replay What-if con gpt-5-mini',
      frase: 'Auditamos y probamos antes de cambiar',
      subtitulos: [
        { tecnico: 'La cascada de una traza enseña cada paso con su duración y su coste. Al lado, el modelo y los tokens de cada agente.', negocio: 'Ante una reclamación, la decisión se reconstruye paso a paso desde el registro. La aseguradora puede demostrar cómo decidió (RGPD art. 5.2).' },
        { tecnico: 'El replay what-if repite una traza real con otro modelo o prompt. En RP-0006, pasar Reglas de gpt-5 a gpt-5-mini dio la misma decisión con un 82 % menos de coste.', negocio: 'Un cambio de modelo se prueba con casos reales antes de producción. En RP-0005, gpt-5-nano cambió un Aprobado por A revisar: el replay lo detecta antes que el cliente.' },
      ],
    },
    {
      min: '7–8', pagina: 'gobierno', titulo: 'Autonomía y guardrails', accion: 'goto:guardrails',
      que: 'Niveles L0-L3 y los guardrails G-02 (importe) y G-04 (lesionados)',
      frase: 'Autonomía graduada con límites claros',
      subtitulos: [
        { tecnico: 'Cada agente tiene un nivel de autonomía, de L0 (solo sugiere) a L3 (decide y ejecuta). Clasificación trabaja en L3; Reglas, en L2, decide solo dentro de los guardrails.', negocio: 'La libertad del agente va en proporción al riesgo de la decisión. Cada cambio de nivel queda registrado con quién lo aprobó.' },
        { tecnico: 'Nueve guardrails frenan a los agentes. G-02 impide aprobar un importe por encima del límite del ramo, aunque el resto de reglas se cumpla.', negocio: 'Las reglas de la aseguradora mandan sobre el modelo. G-02 saltó 118 veces en 14 días y explica el 62 % de los escalados.' },
      ],
    },
    {
      min: '8–8:30', pagina: 'triaje', titulo: 'Respuesta cruda de MSG-A-12', accion: 'ficha:MSG-A-12:json',
      que: 'Bloque _gobernanza: datos de un menor y de salud, por qué Salud y no Auto ni Hogar, hash y retención',
      frase: 'El modelo no se autocertifica: la plataforma deja la prueba en cada decisión',
      subtitulos: [
        { tecnico: 'MSG-A-12 es un menor en urgencias tras una caída con patinete. El bloque _gobernanza detecta el dato de salud y el del menor, y explica por qué el ramo es Salud.', negocio: 'Salud y menores tienen protección reforzada (RGPD art. 8 y 9). Cada respuesta dice qué datos sensibles había y cómo se trataron.' },
        { tecnico: 'Cada respuesta lleva un sello SHA-256 encadenado con la anterior y su plazo de retención: 6 meses como mínimo para la traza seudonimizada.', negocio: 'La plataforma genera la evidencia de cumplimiento en cada decisión. Si alguien altera un registro, la cadena se rompe y se ve.' },
      ],
    },
    {
      min: '8:30–9', pagina: 'gobierno', titulo: 'Termómetro de cumplimiento', accion: 'goto:cumplimiento',
      que: 'Termómetros, controles en ámbar, inventario de datos personales y «Simular una alteración»',
      frase: 'La solución deja a la aseguradora en condiciones de demostrar que cumple',
      subtitulos: [
        { tecnico: 'El Termómetro agrupa los controles por marco: RIA, RGPD, DORA y Solvencia II. Unos se miden en las trazas; otros se declaran con su evidencia documental.', negocio: 'La cobertura dice cuánto se puede demostrar hoy. Los controles en ámbar son la lista de trabajo: entre ellos, la EIPD (RGPD art. 35) y el aviso de IA en WhatsApp (RIA art. 50).' },
        { tecnico: '«Simular una alteración» modifica un registro ya sellado. La cadena de integridad se rompe y el Termómetro lo marca en rojo.', negocio: 'Un registro manipulado se detecta al momento. Con eso, un auditor puede fiarse del histórico.' },
      ],
    },
    {
      min: '9–10', pagina: 'gobierno', titulo: 'Knowledge Bases', accion: 'kb:KB-02:comparativa',
      que: 'Condicionados Auto degradada por 340 documentos de 2024: comparativa de configuraciones y «Aplicar»',
      frase: 'El conocimiento también se degrada, y se vigila igual que los agentes',
      subtitulos: [
        { tecnico: 'La base de Condicionados Auto 2026 está degradada. El 12/09 se sincronizaron 340 documentos del condicionado 2024 y el recall cayó 6 puntos.', negocio: 'Con un condicionado antiguo, el agente puede aplicar una franquicia o una exclusión que ya no existe. El conocimiento se vigila con métricas, igual que los agentes.' },
        { tecnico: 'La comparativa evalúa cuatro configuraciones con la rúbrica R-02. Añadir un filtro de vigencia sube el recall de 0,81 a 0,88.', negocio: 'El cambio se mide antes de publicarlo. El reindexado solo sale a producción si la rúbrica no empeora.' },
      ],
    },
    {
      min: '10–12', pagina: 'gobierno', titulo: 'FinOps, Medidas correctivas e Histórico', accion: 'goto:finops',
      que: 'Cap superado y recomendaciones; en Medidas correctivas, «Aplicar» M-01 y ver subir el ahorro conseguido; la línea de tiempo con todo lo tocado en la demo',
      frase: 'Coste bajo control, problemas con dueño y todo auditado',
      subtitulos: [
        { tecnico: 'Reglas gasta 13,70 € de un cap diario de 12 €. La alerta explica qué pasó y qué hizo el cap: pasar a gpt-5-mini hasta las 00:00.', negocio: 'El gasto del mes va en 296 € de 500 €, con una proyección de 428 €. El presupuesto de IA se controla cada día (Solvencia II art. 41).' },
        { tecnico: 'En Medidas correctivas, aplicar M-01 lleva gpt-5-mini a los casos de despeje directo. El ahorro conseguido sube 237 €/mes; «Deshacer» lo devuelve a cero.', negocio: 'Cada problema tiene dueño y alternativas con su ahorro. M-01 se apoya en el replay RP-0006, que no cambió ninguna decisión.' },
        { tecnico: 'El Histórico recoge cada acción de la demo con usuario y hora: agentes pausados y medidas aplicadas o deshechas.', negocio: 'Un auditor ve cada cambio con su autor y su fecha (RGPD art. 5.2).' },
      ],
    },
  ],
};
