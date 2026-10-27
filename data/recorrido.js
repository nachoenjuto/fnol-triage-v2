// Pasos del Recorrido de la demo (modo presentador, shell.js). GENERADO desde _docs/guion-demo.md con
// `node scripts/generar-recorrido.js` (o `make recorrido`): no editar a mano, cambiar el guion y regenerar.
// Cada paso: minuto, página, título, pantalla («que»), frase clave, acción de «Ir», clics y subtítulos con su tipo
// (intro · para: para qué sirve · que: qué es y qué hace · valor). Cada presentador puede editarlos en el engranaje
// del recorrido (se guardan solo en su navegador) y elegir qué tipos de subtítulo se muestran.
const RECORRIDO_DEMO = {
  "pasos": [
    {
      "min": "0–1",
      "pagina": "intro",
      "titulo": "El problema: FNOL y el gobierno de la IA",
      "accion": "sec:problema",
      "que": "Introducción · El problema",
      "frase": "El primer aviso decide buena parte de lo que pasa con el siniestro, y la IA que lo automatice tiene que estar bajo control.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "texto": "Antes de empezar, quiero situar de qué estamos hablando. En España se declaran unos 11 millones de siniestros de Auto al año, según UNESPA; eso es uno cada tres segundos.",
          "accion": [
            "arriba",
            "ver:#cifras-fnol"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Y todos empiezan de la misma forma: con un primer aviso del cliente."
        },
        {
          "tipo": "intro",
          "texto": "Ese aviso nos llega por cinco canales a la vez. Puede ser un email largo con adjuntos, un formulario web, un chat, una llamada que alguien tiene que transcribir o un WhatsApp escrito con prisa y lleno de emojis.",
          "accion": [
            "ver:#canales"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Y desde ese momento empieza a correr el reloj, porque la Ley de Contrato de Seguro, en su artículo 16, da siete días para comunicar el siniestro."
        },
        {
          "tipo": "intro",
          "texto": "En el FNOL se decide buena parte de lo que pasa después. Si el ramo se asigna mal, el expediente va dando vueltas entre equipos. Si falta un dato, hay que volver a llamar al cliente.",
          "accion": [
            "ver:#decide"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Si un indicio de fraude se nos escapa aquí, después cuesta mucho más encontrarlo. Y además es el primer contacto del cliente con su aseguradora, normalmente en un mal día."
        },
        {
          "tipo": "intro",
          "texto": "Hoy todo ese trabajo lo hace una persona: lee el mensaje, lo clasifica y teclea los datos en el sistema.",
          "accion": [
            "ver:#hoy"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Para que os hagáis una idea del peso que tiene, en Estados Unidos la gestión de siniestros se lleva en torno al 10 % de la prima de Auto. Ahí es donde se nos va el tiempo y el dinero."
        },
        {
          "tipo": "intro",
          "texto": "Y hay un segundo problema.",
          "accion": [
            "ver:#sec-problema .hero-puntos"
          ]
        },
        {
          "tipo": "intro",
          "texto": "En cuanto metemos IA en un proceso así, hay que controlarla desde muchos ángulos: cuánta autonomía damos a los agentes, si las bases de conocimiento que usan están sanas, si cumplimos la normativa y cuánto nos cuesta cada decisión."
        },
        {
          "tipo": "intro",
          "texto": "Hoy clasificar un mensaje con IA ya no diferencia a nadie; con un buen prompt se consigue más de un 90 % de acierto. El reto de verdad está en pasar del piloto a producción."
        },
        {
          "tipo": "intro",
          "texto": "Gartner estima que más del 40 % de los proyectos de IA agéntica se van a cancelar antes de que acabe 2027, por coste, por un valor poco claro o por riesgos sin controlar. Es decir, los proyectos no se caen porque la IA falle.",
          "accion": [
            "ver:#porque"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Se caen porque nadie sabe responder a tres preguntas: por qué ha decidido eso, quién lo controla y cuánto cuesta."
        }
      ]
    },
    {
      "min": "1–3",
      "pagina": "intro",
      "titulo": "La solución: plataforma integrada y gobernada",
      "accion": "sec:solucion",
      "que": "Introducción · La solución, bloque a bloque de arriba abajo",
      "frase": "Automatizamos el primer contacto, con la IA bajo control.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "etiqueta": "De dónde sale esta plataforma",
          "texto": "Antes de entrar en el detalle, una aclaración importante. Lo que os vamos a enseñar es un ejemplo de la experiencia de Logicalis implantando soluciones de gobierno y observabilidad de IA en clientes de distintas industrias.",
          "accion": [
            "arriba",
            "ver:#logicalis"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "De dónde sale esta plataforma",
          "texto": "Hemos reunido en un mismo caso muchas cosas que hemos hecho en proyectos diferentes."
        },
        {
          "tipo": "intro",
          "etiqueta": "De dónde sale esta plataforma",
          "texto": "Cambia el sector, pero el objetivo es siempre el mismo: tener el control para obtener mejores resultados, dar un mejor servicio a los clientes, controlar el gasto y cumplir con la normativa."
        },
        {
          "tipo": "intro",
          "etiqueta": "De dónde sale esta plataforma",
          "texto": "Hoy lo vamos a ver aplicado al primer aviso de siniestro."
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "Lo que os vamos a enseñar hoy es una plataforma integrada que automatiza ese primer contacto."
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "Tenemos cuatro agentes de IA que reciben el aviso por cualquier canal, deciden a qué ramo pertenece, extraen los datos y aplican las reglas de negocio de la aseguradora."
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "Al tramitador le llega el aviso ya clasificado, con los datos extraídos y con una propuesta: aprobado o a revisar."
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "En el lote que vamos a procesar entran 13 avisos. 10 se aprueban solos y 3 pasan a una persona, cada uno con su motivo y con la frase del cliente que lo justifica."
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "Y así se ve el panel de gobierno en los últimos 14 días: 16.720 mensajes procesados, un 81 % de autonomía efectiva, un 19 % escalado a una persona y solo un 2,1 % de decisiones corregidas por un tramitador.",
          "accion": [
            "ver:#kpis-resumen"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Qué hace",
          "texto": "Al lado, el coste del periodo, las alertas activas, el cumplimiento y la salud de las bases de conocimiento."
        },
        {
          "tipo": "intro",
          "etiqueta": "Los cuatro agentes",
          "texto": "La idea es tener cuatro especialistas pequeños en lugar de una única IA que lo hace todo. Cada uno tiene su modelo, su versión de prompt, su responsable y sus propios límites.",
          "accion": [
            "ver:#agentes"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Los cuatro agentes",
          "texto": "Y el modelo más caro lo usamos solo donde de verdad hace falta razonar, que es en las reglas de negocio."
        },
        {
          "tipo": "intro",
          "etiqueta": "Trazabilidad",
          "texto": "La base de todo es la trazabilidad. Cada decisión deja una traza: qué entró, qué hizo cada agente, con qué modelo, cuántos tokens gastó, cuánto costó y qué decidió.",
          "accion": [
            "ver:#base"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Trazabilidad",
          "texto": "Los proveedores de IA ya ofrecen trazas técnicas, y son necesarias, pero no entienden qué es un ramo, una franquicia o un plazo de siete días."
        },
        {
          "tipo": "intro",
          "etiqueta": "Trazabilidad",
          "texto": "Lo que hace esta solución es juntar los dos mundos, la traza técnica y el proceso de negocio de la aseguradora, para dar una respuesta adaptada a cada compañía."
        },
        {
          "tipo": "intro",
          "etiqueta": "Trazabilidad",
          "texto": "Y sobre esa traza construimos todo lo demás: el control de la autonomía y del gasto, la auditoría y el replay."
        },
        {
          "tipo": "intro",
          "etiqueta": "Autonomía y madurez de los agentes",
          "texto": "Cada agente tiene un nivel de autonomía, que va de L0, donde solo sugiere, a L3, donde decide y ejecuta. Esa autonomía se gana con datos y se pierde con datos.",
          "accion": [
            "ver:.pilar~Autonomía"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Autonomía y madurez de los agentes",
          "texto": "Cuando los tramitadores empezaron a corregir más del 3 % de las decisiones del agente de Reglas, el agente bajó de L3 a L2, con su motivo y con el nombre de quien lo aprobó."
        },
        {
          "tipo": "intro",
          "etiqueta": "Autonomía y madurez de los agentes",
          "texto": "Hoy el 81 % de las decisiones sale sin intervención humana, y mantener ese porcentaje con control es lo que de verdad significa que la automatización funciona."
        },
        {
          "tipo": "intro",
          "etiqueta": "Gasto bajo control",
          "texto": "El gasto lo controlamos al segundo y en base a acciones.",
          "accion": [
            "ver:.pilar~Gasto"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Gasto bajo control",
          "texto": "Los proveedores de servicios de IA empresarial te dicen cuánto has gastado cada 8 horas, y en 8 horas pueden pasar muchas cosas: un agente que entra en bucle o un pico de mensajes nos puede hacer levantarnos por la mañana con un gasto que no queríamos."
        },
        {
          "tipo": "intro",
          "etiqueta": "Gasto bajo control",
          "texto": "Aquí cada decisión suma su coste en el momento en que se produce, y cada agente tiene sus topes."
        },
        {
          "tipo": "intro",
          "etiqueta": "Gasto bajo control",
          "texto": "Si se supera uno, el sistema actúa solo: por ejemplo, pasa a un modelo más barato y lo deja anotado en cada traza, sin parar el servicio."
        },
        {
          "tipo": "intro",
          "etiqueta": "Fraude",
          "texto": "Para el fraude, la plataforma combina lo que entiende la IA del relato del cliente con el histórico de pólizas y siniestros y con reglas deterministas.",
          "accion": [
            "ver:.pilar~Fraude"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Fraude",
          "texto": "Con todo eso identifica los patrones de fraude que la compañía ya conoce: una póliza recién contratada, una cuenta de cobro que se repite entre asegurados distintos o un robo sin denuncia."
        },
        {
          "tipo": "intro",
          "etiqueta": "Fraude",
          "texto": "Y algo importante: el indicio no acusa, prioriza. La decisión siempre la toma una persona."
        },
        {
          "tipo": "intro",
          "etiqueta": "Cumplimiento demostrable",
          "texto": "El RGPD, DORA y la opinión de EIOPA sobre IA ya están en vigor. El Reglamento de IA llega después, y el triaje no se considera de alto riesgo, pero aplicamos sus artículos como buena práctica.",
          "accion": [
            "ver:.pilar~Cumplimiento"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Cumplimiento demostrable",
          "texto": "Cada decisión lleva pegada su prueba de cumplimiento: qué datos personales había, por qué se decidió así y si la revisó una persona."
        }
      ]
    },
    {
      "min": "3–4",
      "pagina": "intro",
      "titulo": "Los actores: el tramitador y quien gobierna la IA",
      "accion": "sec:actores",
      "que": "Introducción · Los actores",
      "frase": "Dos actores, dos pantallas: el tramitador y quien gobierna la IA.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "texto": "En la demo vamos a ver dos tipos de usuario. Por un lado está el tramitador de FNOL, que trabaja en la pantalla de triaje.",
          "accion": [
            "arriba",
            "ver:#usuarios .usuario-card~El tramitador"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Es una interfaz muy ágil: ve el detalle de cada mensaje, cómo y por qué se ha clasificado, por qué la IA ha tomado cada decisión y los indicios de fraude, con la frase del cliente que los justifica."
        },
        {
          "tipo": "intro",
          "texto": "Así dedica su tiempo a los casos que necesitan criterio."
        },
        {
          "tipo": "intro",
          "texto": "Por otro lado están los equipos que gobiernan la IA: IT, Finanzas, Compliance, Riesgos, Auditoría o el DPO, que trabajan en el panel de gobierno.",
          "accion": [
            "ver:#usuarios .usuario-card~IT, Finanzas"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Desde ahí ven si los agentes deciden bien, con qué conocimiento, cuánto cuestan y si la aseguradora puede demostrar que cumple."
        }
      ]
    },
    {
      "min": "4–5",
      "pagina": "intro",
      "titulo": "La demo: un viaje de principio a fin",
      "accion": "sec:demo",
      "que": "Introducción · La demo",
      "frase": "Seguimos un mensaje de principio a fin y vemos todo lo que la IA deja detrás.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "texto": "La demo es un viaje. Empieza cuando llega un mensaje, sigue con su análisis por los agentes y con la revisión del tramitador, y pasa por las evidencias que deja la IA en cada decisión.",
          "accion": [
            "arriba",
            "ver:#viaje"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Y termina en el panel de gobierno, donde vamos a entender qué agentes intervinieron, qué hicieron y cómo, qué límites tenían, qué razonamiento hay debajo, qué conocimiento usaron, cómo de compliance es la solución, cuándo gasta y por qué, y cómo podemos mejorarlo todo.",
          "accion": [
            "ver:#preguntas-panel"
          ]
        },
        {
          "tipo": "intro",
          "etiqueta": "Puente a la demo",
          "texto": "Vamos a verlo. Primero os enseño lo que ve el tramitador y después lo que ve quien gobierna la IA: el responsable de los agentes, el auditor y el CFO.",
          "accion": [
            "ver:#empezar-demo"
          ]
        }
      ]
    },
    {
      "min": "5–6:30",
      "pagina": "triaje",
      "titulo": "Las seis fases y los cinco canales",
      "accion": "fases",
      "que": "Triaje, barra de fases numeradas bajo la cabecera",
      "frase": "Así funciona el proceso de principio a fin.",
      "clics": [
        "Clic en 1 · Multicanalidad: la ficha emergente con los cinco canales y la unificación en un único formato.",
        "Clic en 2 · Clasificación por ramo, 3 · Extracción de datos y 4 · Reglas de negocio: en cada ficha, la etiqueta «IA generativa» o «Lógica de negocio» al pie.",
        "Clic en 5 · Trazabilidad y 6 · Automatización.",
        "Menú lateral → Paquete de mensajes: la lista de los 13 con el icono de su canal. Señalar MSG-A-11 (WhatsApp) y MSG-A-08 (teléfono)."
      ],
      "subtitulos": [
        {
          "tipo": "que",
          "texto": "Aquí veis las seis fases del proceso.",
          "accion": [
            "fase:multicanal"
          ]
        },
        {
          "tipo": "que",
          "texto": "Las cuatro primeras son los agentes de IA trabajando en cadena: la recepción multicanal, que recibe el aviso por cualquier canal y lo normaliza a un único formato; la clasificación por ramo; la extracción de datos; y la aplicación de las reglas de negocio de Auto, Hogar y Salud.",
          "accion": [
            "fase:reglas"
          ]
        },
        {
          "tipo": "que",
          "texto": "Las dos últimas, trazabilidad y automatización, cierran el circuito: registran todo lo que pasa y convierten la decisión en flujo de trabajo.",
          "accion": [
            "fase:registro"
          ]
        },
        {
          "tipo": "que",
          "texto": "Cada fase tiene su ficha, donde se explica qué recibe, qué entrega y si lo resuelve un modelo de IA o una regla de negocio."
        },
        {
          "tipo": "valor",
          "texto": "Para la aseguradora, esto significa que un aviso que llega por WhatsApp recibe exactamente el mismo criterio que uno que llega por email. El cliente elige el canal que le resulta más cómodo y la compañía no pierde la trazabilidad.",
          "accion": [
            "fase:cerrar",
            "paquete",
            "ver:#paquete-lista li~MSG-A-11",
            "ver:#paquete-lista li~MSG-A-08"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Para el tramitador, el aviso le llega ya clasificado, con los datos extraídos y con una propuesta de decisión, y sabe que detrás de cada agente hay un responsable con nombre.",
          "accion": [
            "fase:automatizacion"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Además, estas fichas son justo la documentación que pide un auditor antes de dar por bueno un sistema de IA."
        }
      ]
    },
    {
      "min": "6:30–8:30",
      "pagina": "triaje",
      "titulo": "Procesar el Paquete A",
      "accion": "procesar",
      "que": "Triaje, panel principal",
      "frase": "En segundos sabemos qué se aprueba y qué tiene que revisar una persona.",
      "clics": [
        "Procesar paquete. Mientras avanza, señalar los contadores (Aprobados, A revisar, Tiempo medio de ciclo) y el registro que se llena.",
        "A mitad de lote, Pausar. Explicar que no se pierde nada. Continuar.",
        "Al terminar: 10 aprobados y 3 a revisar. Señalar los chips por ramo.",
        "Columna Ramo: los ✔ frente al resultado esperado. Columnas Origen y Conf.",
        "Filtro Solo a revisar: quedan MSG-A-04, MSG-A-08 y MSG-A-13. Quitar el filtro.",
        "Señalar las etiquetas de fraude en el registro (MSG-A-13 en la SIU; MSG-A-09, MSG-A-11 y MSG-A-02 con el pago retenido).",
        "Opcional: Exportar JSON."
      ],
      "subtitulos": [
        {
          "tipo": "que",
          "texto": "Al procesar el paquete, cada aviso pasa por los cuatro agentes y sale con su ramo, sus datos y su decisión."
        },
        {
          "tipo": "que",
          "texto": "Los contadores de aprobados, de casos a revisar y de tiempo medio se van actualizando en vivo, y el lote se puede pausar en cualquier momento sin perder nada.",
          "accion": [
            "ver:.counters"
          ]
        },
        {
          "tipo": "que",
          "texto": "A la vez, cada aviso deja su traza en el momento: el modelo que ha usado cada agente, los tokens, el coste en euros y la decisión.",
          "accion": [
            "ver:#log-table"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Esto nos permite que el tramitador dedique su tiempo a los casos que de verdad necesitan criterio, y no a teclear los que no lo necesitan. En los últimos 14 días, el 81 % de las decisiones ha salido sin intervención humana.",
          "accion": [
            "ver:#log-body tr[data-id=MSG-A-04]",
            "ver:#log-body tr[data-id=MSG-A-08]",
            "ver:#log-body tr[data-id=MSG-A-13]"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y el registro se genera solo, sin ningún trabajo manual. Es la evidencia que la aseguradora presenta en una auditoría."
        }
      ]
    },
    {
      "min": "8:30–10",
      "pagina": "triaje",
      "titulo": "La ficha de un aprobado: MSG-A-01",
      "accion": "ficha:MSG-A-01:mensaje",
      "requiere": "lote",
      "que": "Triaje → ficha de MSG-A-01",
      "frase": "Una decisión aprobada también tiene que poder explicarse.",
      "clics": [
        "Arriba de la ficha: las tres cifras (Decisión, Ramo, Confianza 95 %).",
        "Pestaña Mensaje: las evidencias resaltadas y numeradas en el texto. Pasar el ratón por una: el título «Evidencias» cambia a su tipo (por ejemplo «Fecha del hecho»). Abrir Leyenda.",
        "Pestaña Adjuntos (3): el parte amistoso en el visor de PDF y, a la derecha, sus datos con el contraste contra el email (todo coincide; los datos del otro vehículo solo constan en el parte). Pasar a las dos fotos: clic en la imagen para ampliarla.",
        "Pestaña Datos extraídos: los 10 campos (cliente, póliza, tipo, fecha, 1.350 €, lugar, terceros sí, lesionados no, documentación: parte amistoso, presupuesto y fotos).",
        "Pestaña Reglas de negocio: A1 a A8, todas en «cumple» o «no aplica», cada una con su evidencia.",
        "Pestaña Razonamiento: ramo, decisión, siguiente paso recomendado y cronología."
      ],
      "subtitulos": [
        {
          "tipo": "que",
          "texto": "Esta es la ficha de una decisión. Arriba vemos la decisión, el ramo y la confianza del modelo. Debajo, el mensaje del cliente con las evidencias resaltadas.",
          "accion": [
            "clic:#modal-tabs [data-tab=mensaje]"
          ]
        },
        {
          "tipo": "que",
          "texto": "Cada evidencia es una cita literal del mensaje, y el sistema comprueba que existe en el texto original: si el modelo se la inventa, no aparece."
        },
        {
          "tipo": "que",
          "texto": "Este aviso trae además tres adjuntos: el parte amistoso escaneado y dos fotos de los daños. En la pestaña Adjuntos los vemos al lado de los datos que el agente ha leído en cada uno, comparados con lo que dice el email.",
          "accion": [
            "clic:#modal-tabs [data-tab=adjuntos]",
            "clic:#adj-lista [data-adj=0]"
          ]
        },
        {
          "tipo": "que",
          "texto": "El parte confirma la fecha, la hora y que no hubo heridos, y aporta la matrícula y la aseguradora del otro conductor, que no venían en el texto."
        },
        {
          "tipo": "que",
          "texto": "Las fotos muestran un daño leve en el paragolpes y el faro delanteros derechos, que es justo lo que presupuesta el taller.",
          "accion": [
            "clic:#adj-lista [data-adj=1]"
          ]
        },
        {
          "tipo": "que",
          "texto": "En las siguientes pestañas vemos los datos que el agente ha extraído del texto libre, cada una de las reglas del ramo que ha evaluado el agente de Reglas, con su resultado y su evidencia, y el razonamiento que le ha llevado a la decisión.",
          "accion": [
            "clic:#modal-tabs [data-tab=datos]"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Los avisos sencillos y bien documentados se aprueban sin que nadie tenga que tocarlos. Y si mañana alguien pregunta por qué se aprobó uno, la respuesta está aquí, regla por regla y con las palabras del propio cliente.",
          "accion": [
            "clic:#modal-tabs [data-tab=reglas]"
          ]
        },
        {
          "tipo": "valor",
          "texto": "El tramitador no tiene que fiarse de una caja negra: puede comprobar cada regla en segundos.",
          "accion": [
            "clic:#modal-tabs [data-tab=razonamiento]"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y ya no tiene que abrir el parte y las fotos para compararlos a ojo con el email: el cruce viene hecho, y solo tiene que mirar lo que no cuadra."
        }
      ]
    },
    {
      "min": "10–12",
      "pagina": "triaje",
      "titulo": "La ficha de un «A revisar»: MSG-A-08",
      "accion": "ficha:MSG-A-08:mensaje",
      "requiere": "lote",
      "que": "Triaje → ficha de MSG-A-08. Texto completo del mensaje en el paso 1",
      "frase": "Cada decisión se puede explicar, también cuando la máquina no decide.",
      "clics": [
        "Pestaña Mensaje: evidencias resaltadas («ingresado», «fractura de clavícula y dos costillas», «atestado», el Opel Astra del tercero).",
        "Pestaña Reglas de negocio: A5 · Terceros documentados y sin lesionados en «incumple», con su evidencia.",
        "Pestaña Datos extraídos: importe_estimado_eur vacío. Señalarlo.",
        "Pestaña Razonamiento: por qué es Auto y no Salud (el hecho causante es el accidente de tráfico).",
        "Pestaña Respuesta cruda → vista Enviado al modelo: los marcadores [PERSONA_1], [POLIZA_AU_1], [MATRICULA_1], [TELEFONO_1] en lugar de los datos reales. La fractura y la diabetes siguen ahí."
      ],
      "subtitulos": [
        {
          "tipo": "que",
          "texto": "Cuando un aviso pasa a revisión, la ficha nos dice qué regla ha incumplido y resalta las frases del mensaje que lo justifican.",
          "accion": [
            "clic:#modal-tabs [data-tab=reglas]"
          ]
        },
        {
          "tipo": "que",
          "texto": "Si además salta un guardrail, por ejemplo porque hay un lesionado, el agente no puede decidir y el caso va directamente a una persona."
        },
        {
          "tipo": "que",
          "texto": "Si un dato no aparece en el mensaje, el campo se queda vacío. El agente tiene la instrucción de no inventar nada.",
          "accion": [
            "clic:#modal-tabs [data-tab=datos]"
          ]
        },
        {
          "tipo": "que",
          "texto": "Y en la respuesta cruda podemos ver exactamente lo que ha recibido el modelo.",
          "accion": [
            "clic:#modal-tabs [data-tab=json]",
            "clic:[data-raw=enviado]"
          ]
        },
        {
          "tipo": "que",
          "texto": "Antes de enviarle el mensaje, la plataforma sustituye los nombres, las pólizas, las matrículas, los teléfonos y el resto de datos personales por marcadores."
        },
        {
          "tipo": "que",
          "texto": "Lo que hace falta para decidir, como las lesiones o el diagnóstico, se mantiene."
        },
        {
          "tipo": "que",
          "texto": "Cuando vuelve la respuesta, la plataforma recoloca los datos reales en la ficha, y la tabla de correspondencias solo existe en memoria mientras dura la llamada."
        },
        {
          "tipo": "valor",
          "texto": "El tramitador entiende el motivo en segundos y puede corregirlo si no está de acuerdo. Si el cliente pide explicaciones, la respuesta ya está preparada en la ficha.",
          "accion": [
            "clic:#modal-tabs [data-tab=mensaje]"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y los daños personales siempre los valora una persona: en los últimos 14 días, el guardrail de lesionados explica el 20 % de los escalados."
        },
        {
          "tipo": "valor",
          "texto": "Además, el modelo decide sin saber quién es el asegurado. La minimización de datos deja de ser una política escrita en un documento y pasa a ser lo que el modelo recibe de verdad.",
          "accion": [
            "clic:#modal-tabs [data-tab=json]",
            "clic:[data-raw=enviado]"
          ]
        }
      ]
    },
    {
      "min": "12–14",
      "pagina": "triaje",
      "titulo": "La respuesta cruda de MSG-A-12",
      "accion": "ficha:MSG-A-12:json",
      "requiere": "lote",
      "que": "Triaje → ficha de MSG-A-12 → pestaña Respuesta cruda",
      "frase": "El modelo no se certifica a sí mismo: es la plataforma la que deja la prueba en cada decisión.",
      "clics": [
        "Respuesta cruda con + Gobierno activado: el bloque _gobernanza, marcado como «añadido por la plataforma, no generado por el modelo».",
        "Bloque teja datos_personales: el menor (8 años) y los datos de salud en rojo, cada uno con su categoría y si se usó para decidir.",
        "Bloque verde explicabilidad: por qué Salud y por qué no Auto ni Hogar («el patinete no activa Auto: no es un vehículo asegurado ni hay tercero»; «descartado Hogar: la caída es en un parque»).",
        "Bloque azul trazabilidad: traza, modelo, versión de prompt y hash SHA-256 encadenado.",
        "Bloque ocre retencion: 6 meses la traza; 5 años el expediente de personas.",
        "Bloque violeta supervision_humana. Pasar el ratón por una norma para ver qué exige.",
        "Transición: cabecera → Gobierno de Agentes. En el panel, Fuente → Sesión actual, para que las trazas sean las del lote que acabamos de procesar."
      ],
      "subtitulos": [
        {
          "tipo": "que",
          "texto": "En la respuesta cruda vemos lo que ha devuelto el modelo y, debajo, un bloque de gobierno que añade la plataforma.",
          "accion": [
            "clic:[data-raw=gobierno]"
          ]
        },
        {
          "tipo": "que",
          "texto": "Este bloque no lo genera el modelo: lo calcula la plataforma con reglas fijas, y se puede recalcular en cualquier momento."
        },
        {
          "tipo": "que",
          "texto": "El bloque recoge qué datos personales hay en el mensaje, de qué tipo son, por ejemplo datos de salud o de menores, y si se han usado para decidir. Explica por qué el aviso es de un ramo y por qué no es de los otros dos.",
          "accion": [
            "ver:#modal-raw .g-key.g-pii",
            "ver:#modal-raw .g-key.g-expl"
          ]
        },
        {
          "tipo": "que",
          "texto": "Y añade un sello SHA-256 encadenado con la decisión anterior, junto con el plazo durante el que hay que conservar la traza.",
          "accion": [
            "ver:#modal-raw .g-key.g-traz",
            "ver:#modal-raw .g-key.g-ret"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Los datos de salud y los de menores tienen una protección reforzada. Con este bloque, cada respuesta dice qué datos sensibles había, cómo se han tratado y si se han usado para decidir.",
          "accion": [
            "ver:#modal-raw .g-key.g-pii"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Para el DPO es evidencia decisión a decisión, y no una declaración genérica."
        },
        {
          "tipo": "valor",
          "texto": "Y si alguien altera un registro, la cadena de hashes se rompe y se ve al momento. Lo vamos a comprobar en el panel.",
          "accion": [
            "ver:#modal-raw .g-key.g-traz"
          ]
        }
      ]
    },
    {
      "min": "14–15",
      "pagina": "gobierno",
      "titulo": "Entrada al panel de gobierno",
      "accion": "goto:inicio",
      "requiere": "lote",
      "que": "Panel de gobierno → Inicio. Recorrer los seis bloques de arriba abajo, sin entrar en ninguno",
      "frase": "Seis preguntas para gobernar a nuestros agentes.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "texto": "Ahora pasamos al panel de quien gobierna los agentes."
        },
        {
          "tipo": "intro",
          "texto": "Está organizado en trece secciones que responden a seis preguntas: qué está pasando, cuánto decide la máquina y cuánto una persona, si hay indicios de fraude, si los agentes deciden bien y con buen conocimiento, si cumplimos y cuánto nos cuesta, y qué tenemos que corregir.",
          "accion": [
            "ver:#inicio-grupos"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Cada ficha de esta portada nos da la cifra del día y su estado. Vamos a entrar en cada sección con los mensajes del lote que acabamos de procesar.",
          "accion": [
            "ver:#inicio-hero"
          ]
        }
      ]
    },
    {
      "min": "15–17",
      "pagina": "gobierno",
      "titulo": "Resumen",
      "accion": "goto:resumen",
      "requiere": "lote",
      "que": "Inicio → Ver el Resumen. Bloque Operación",
      "frase": "Control total del sistema y capacidad de pararlo al instante.",
      "clics": [
        "Los 8 KPI: 16.720 mensajes en 14 días, autonomía efectiva 81 %, escalados 19 %, overrides 2,1 %, coste del periodo, 11 alertas, cumplimiento 87 % y 5 de 9 knowledge bases sanas.",
        "Clic en el KPI Alertas activas: la ventana con las 11 alertas por severidad y por origen (coste 3, fraude 3, knowledge bases 3, cumplimiento 2) y la lista agrupada por origen. En el grupo Fraude: MSG-A-13 escalado a la SIU (clic: abre la ficha del caso), los 3 pagos retenidos por 2.080 € y CAP-09 en aviso. Cerrar.",
        "Las tarjetas de los cuatro agentes: Reglas en Degradado (gpt-5-mini) y 13,70 € de un tope diario de 12 €.",
        "Gráfico Coste diario frente al cap: botón Ampliar (ventana con el detalle por día).",
        "Alertas activas de la tarjeta, ordenadas por severidad: la del CAP-03, la de MSG-A-13 en la SIU y la de KB-06 (red de talleres).",
        "Últimas trazas → clic en la de MSG-A-08: la ficha explicada (qué llegó, qué hizo cada agente, decisión, coste). Botón Cumplimiento dentro de la ficha. Cerrar.",
        "Kill switch de Extracción de datos: se oscurece la tarjeta. Volver a activarlo."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "El Resumen nos ofrece en una sola pantalla los indicadores del periodo, el estado de cada agente, el coste frente al presupuesto y las alertas de todas las fuentes.",
          "accion": [
            "ver:#kpis"
          ]
        },
        {
          "tipo": "para",
          "texto": "Lo que buscamos es que Dirección sepa en diez segundos si el sistema va bien, sin tener que pedir un informe a nadie."
        },
        {
          "tipo": "que",
          "texto": "Los indicadores de arriba nos dan la autonomía efectiva, es decir, cuántas decisiones salen sin intervención humana; cuántas corrigen los tramitadores; cuánto llevamos gastado frente al tope; y qué alertas hay abiertas, ya sean de coste, de fraude, de conocimiento o de cumplimiento."
        },
        {
          "tipo": "que",
          "texto": "Al abrir el indicador de alertas las vemos ordenadas por origen, cada una con un enlace a su sección.",
          "accion": [
            "kpi:res-alertas"
          ]
        },
        {
          "tipo": "que",
          "texto": "Debajo, cada agente tiene su tarjeta con su estado, su modelo, su latencia y lo que ha gastado hoy frente a su presupuesto. Y cada tarjeta tiene un interruptor de parada, el kill switch, que detiene el agente con un solo clic.",
          "accion": [
            "cerrar",
            "ver:#agents"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Ahora mismo tenemos un 81 % de autonomía y un 2,1 % de decisiones corregidas, por debajo del objetivo del 3 %.",
          "accion": [
            "ver:#kpis"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y si un agente empieza a comportarse mal, lo paramos al momento. Sus mensajes se quedan en cola hasta que lo reanudamos, no se pierde ninguno, y la parada queda registrada con el nombre de quien la hizo.",
          "accion": [
            "ver:#agents",
            "agente:extraccion:pausado",
            "espera:3500",
            "agente:extraccion:activo"
          ]
        }
      ]
    },
    {
      "min": "17–18:30",
      "pagina": "gobierno",
      "titulo": "Agentes: el agente de Reglas",
      "accion": "agentes",
      "requiere": "lote",
      "que": "menú → Agentes → pestaña Reglas de negocio. Bloque Operación",
      "frase": "Cada agente tiene su identidad, su responsable y solo los permisos que necesita.",
      "clics": [
        "La cadena arriba: Multicanalidad → Clasificación → Extracción → Reglas, con lo que se pasan (texto normalizado → ramo e indicios → 10 campos).",
        "Cabecera de Reglas: Degradado, L2, responsable «Dirección de Siniestros · Comité IA», gpt-5, prompt v2.3, latencia p50/p95, 13,70 € / 12 €.",
        "Identidad y permisos: puede consultar la póliza en solo lectura y proponer; no puede ordenar pagos, rechazar un siniestro ni modificar el expediente.",
        "Configuración y variables: confianza mínima 0,85, importes máximos, reasoning effort «medium», objetivo de override 3 %.",
        "Rendimiento y coste: 172,65 € en 14 días; la tabla Comportamiento según el modelo (gpt-5 al 98,9 % de acierto a 0,011 € por mensaje; gpt-5-mini degradado al 97,6 % a 0,002 €).",
        "Calidad: el círculo del 98 %, acierto 13/13, confianza media 0,93, 9,77 evidencias verificadas por decisión.",
        "Knowledge Bases que consume: KB-02 degradada y KB-06 crítica (se verán en el paso 14).",
        "Opcional para perfiles técnicos: Contrato de entrada y salida con el ejemplo real."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Agentes nos da la ficha completa de cada agente: qué hace, qué modelo usa, cuántos tokens gasta, cuánto tarda, cuánto cuesta, cómo rinde según el modelo que tenga y qué conocimiento consulta.",
          "accion": [
            "ver:#ag-tabs"
          ]
        },
        {
          "tipo": "para",
          "texto": "Tener los agentes controlados es fundamental, porque son nuestros trabajadores autónomos."
        },
        {
          "tipo": "para",
          "texto": "Tenemos que saber qué problemas tienen para poder ayudarles, con qué conocimiento están trabajando para mantenerlo actualizado y si son rentables, para tomar decisiones con datos y no perder dinero."
        },
        {
          "tipo": "que",
          "texto": "Cada agente tiene una identidad propia, igual que un empleado, con un responsable y unos permisos mínimos: está definido qué puede hacer y qué no puede hacer.",
          "accion": [
            "ver:#ag-ficha h3~Identidad"
          ]
        },
        {
          "tipo": "que",
          "texto": "En la ficha vemos su configuración y sus umbrales, los guardrails y los topes que lo limitan, su coste y sus tokens de los últimos días, y una tabla con su comportamiento según el modelo que ha ido usando: precisión, escalados, correcciones, coste por mensaje y latencia.",
          "accion": [
            "ver:#ag-ficha h3~Configuración"
          ]
        },
        {
          "tipo": "que",
          "texto": "También vemos un índice de calidad, las bases de conocimiento que consume y, para los perfiles más técnicos, su contrato de entrada y salida.",
          "accion": [
            "ver:#ag-ficha h3~Calidad"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Con esta ficha decidimos con números qué modelo usar en cada agente. Hoy, por ejemplo, el agente de Reglas concentra el 80 % del gasto y tiene dos bases de conocimiento con problemas. Ahí es donde tenemos que poner el foco.",
          "accion": [
            "ver:#ag-ficha h3~Rendimiento"
          ]
        }
      ]
    },
    {
      "min": "18:30–19:30",
      "pagina": "gobierno",
      "titulo": "Trazabilidad",
      "accion": "goto:trazas",
      "requiere": "lote",
      "que": "menú → Trazabilidad. Bloque Operación",
      "frase": "Mensaje a mensaje: qué ha pasado, quién lo ha decidido y cuánto ha costado.",
      "clics": [
        "Clic en la traza de MSG-A-08: el panel fijo de arriba muestra la cascada de pasos por agente con duración, modelo y tokens. 12,4 s, 28.038 tokens y 0,062 €, frente a unos 4.300 tokens y 0,010 € del resto. Incidencias CAP-04 y CAP-05.",
        "Clic en la traza de MSG-A-10: la incidencia «429 · reintento 1 (2 s)».",
        "Filtros: Resultado → Con intervención humana (quedan MSG-A-04, MSG-A-08 y MSG-A-13). Quitar el filtro.",
        "Botón Ver razonamiento en MSG-A-08 (lleva al paso 13; volver con el menú)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Trazabilidad nos permite seguir cada mensaje paso a paso: qué agente ha hecho qué, cuánto ha tardado, con qué modelo y cuánto ha costado."
        },
        {
          "tipo": "para",
          "texto": "Nos sirve para reconstruir cualquier decisión a partir del registro, ya sea ante una reclamación o ante una auditoría."
        },
        {
          "tipo": "que",
          "texto": "Cada mensaje genera una traza. La cascada nos enseña cada paso de cada agente con su duración, su modelo y sus tokens de entrada, de salida y de razonamiento.",
          "accion": [
            "sel:MSG-A-08",
            "ver:#traza-detalle"
          ]
        },
        {
          "tipo": "que",
          "texto": "Si la traza ha superado algún tope de coste, ha disparado un guardrail o ha tenido una incidencia, como un error del proveedor con su reintento, aparece marcado aquí mismo.",
          "accion": [
            "sel:MSG-A-10",
            "ver:#traza-detalle"
          ]
        },
        {
          "tipo": "que",
          "texto": "Y la lista se puede filtrar por agente, canal, decisión o resultado.",
          "accion": [
            "ver:#t-res"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Ante una reclamación, la decisión se reconstruye sin tener que preguntar a nadie qué pasó, y la aseguradora puede demostrar cómo decidió.",
          "accion": [
            "sel:MSG-A-08",
            "traza:MSG-A-08"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Además, los fallos del proveedor de IA no llegan al cliente: el sistema los reintenta y los registra, y así podemos hablar con el proveedor con datos encima de la mesa.",
          "accion": [
            "cerrar",
            "sel:MSG-A-10",
            "ver:#traza-detalle"
          ]
        }
      ]
    },
    {
      "min": "19:30–20:30",
      "pagina": "gobierno",
      "titulo": "Autonomía",
      "accion": "goto:autonomia",
      "requiere": "lote",
      "que": "menú → Autonomía. Bloque Control",
      "frase": "Una autonomía graduada y con límites claros.",
      "clics": [
        "KPI: 81 % de decisiones autónomas (objetivo ≥ 80 %), tasa de override 2,1 %, precisión 99,1 % frente a lo esperado.",
        "Niveles L0 a L3, de rojo a verde: Multicanalidad y Clasificación en L3; Extracción y Reglas en L2.",
        "Cambios de nivel (auditoría) → clic en la fila «Reglas de negocio · L3 → L2»: el registro completo (override del 4,1 % en la semana, aprobado por M. Ortega). Navegar con ‹ › a «Clasificación · L2 → L3» (precisión del 99,2 % sobre 4.800 mensajes)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Autonomía nos muestra en qué nivel está cada agente, de L0 a L3, y guarda la auditoría de cada cambio de nivel.",
          "accion": [
            "ver:#levels"
          ]
        },
        {
          "tipo": "para",
          "texto": "Lo que buscamos es que la libertad de cada agente vaya en proporción al riesgo de lo que decide y a su historial, y que nada suba de nivel sin datos que lo respalden."
        },
        {
          "tipo": "que",
          "texto": "En L0 el agente solo sugiere. En L1 propone y una persona confirma cada caso. En L2 decide dentro de los guardrails y todo lo demás lo escala a una persona. Y en L3 decide y ejecuta, y se audita después."
        },
        {
          "tipo": "que",
          "texto": "Cada subida o bajada de nivel queda registrada con su motivo, con los datos que la justifican y con el nombre de quien la aprobó.",
          "accion": [
            "ver:#cambios"
          ]
        },
        {
          "tipo": "que",
          "texto": "Uno de los criterios es la tasa de correcciones: si los tramitadores corrigen más del 3 % de las decisiones de un agente, ese agente baja de nivel.",
          "accion": [
            "cambio:4,1"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Es lo mismo que haríamos con un tramitador nuevo: le damos más autonomía cuando demuestra criterio y se la quitamos cuando falla."
        },
        {
          "tipo": "valor",
          "texto": "En la demo, el agente de Reglas llegó a L3 y volvió a L2 la semana en que las correcciones llegaron al 4,1 %. Y cada cambio tiene detrás a alguien que lo firma."
        }
      ]
    },
    {
      "min": "20:30–22",
      "pagina": "gobierno",
      "titulo": "Guardrails",
      "accion": "goto:guardrails",
      "requiere": "lote",
      "que": "menú → Guardrails. Bloque Control",
      "frase": "Las reglas de la aseguradora siempre mandan sobre el modelo.",
      "clics": [
        "KPI: 11 de 12 activos, 454 disparos en 14 días, el más disparado (G-02).",
        "Tabla G-01 a G-12. Pasar el ratón por las minibarras de disparos por día.",
        "Clic en G-04 · Lesionados = sí: la ficha con su descripción y los últimos disparos. En la lista de disparos, el de MSG-A-08 enlazado a su traza.",
        "Clic en G-02 · Importe: 118 disparos, 62 % de los escalados.",
        "Interruptor de G-09 (inactivo): explicar por qué está apagado (confianza media de la transcripción 0,91).",
        "Opcional: Nuevo guardrail (ventana con el formulario). Cerrar sin guardar."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Guardrails reúne las condiciones que impiden que un agente decida solo, y nos dice cuántas veces ha saltado cada una.",
          "accion": [
            "ver:#kpis-gr"
          ]
        },
        {
          "tipo": "para",
          "texto": "Nos sirve para garantizar que las reglas de la aseguradora mandan siempre sobre lo que diga el modelo."
        },
        {
          "tipo": "que",
          "texto": "Un guardrail es una condición que se comprueba antes de ejecutar una decisión: una confianza por debajo del umbral, un importe por encima del límite del ramo, un lesionado, un ramo que no se puede determinar o un indicio de fraude.",
          "accion": [
            "ver:#policies"
          ]
        },
        {
          "tipo": "que",
          "texto": "Cuando salta, la decisión no se ejecuta: pasa a una persona, se cambia a un modelo más barato o se marca la traza, según el caso."
        },
        {
          "tipo": "que",
          "texto": "Cada guardrail tiene su ficha, sus disparos por día y un interruptor para activarlo o desactivarlo.",
          "accion": [
            "gr:G-04"
          ]
        },
        {
          "tipo": "valor",
          "texto": "El guardrail de importe, por ejemplo, ha saltado 118 veces en 14 días y explica el 62 % de los escalados. Si mañana negocio quiere subir el límite de Auto, sabe exactamente a cuántos casos afecta.",
          "accion": [
            "gr:G-02"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y cualquier guardrail que se activa o se desactiva queda en el Histórico con el nombre de quien lo ha hecho.",
          "accion": [
            "cerrar",
            "ver:#policies tr[data-gr=G-09]",
            "guardrail:G-09:on",
            "espera:3500",
            "guardrail:G-09:off"
          ]
        }
      ]
    },
    {
      "min": "22–24",
      "pagina": "gobierno",
      "titulo": "Intervención humana: MSG-A-04",
      "accion": "goto:hitl",
      "requiere": "lote",
      "que": "menú → Intervención humana. Bloque Control",
      "frase": "Una aprobación de 10 segundos es solo una firma: por eso medimos si la revisión es real.",
      "clics": [
        "KPI: 3.180 escalados (19 %), override 2,1 %, 2 pendientes de revisión, revisiones exprés 3,3 %, supervisión humana efectiva «Cubierto».",
        "Mecanismos de supervisión: escalado, override y nivel, kill switch, control normativo.",
        "Cola de revisión: las tres trazas del lote. Clic en MSG-A-04: la ficha de la traza con el override de L. Prieto y su motivo. Navegar con › a MSG-A-08 y MSG-A-13 (pendientes).",
        "Escalados: el anillo de causas (G-02 62 %, G-04 20 %, G-05 11 %).",
        "Calidad de la revisión: tiempos por tramos, el 3,3 % de aprobaciones en menos de 30 segundos y la tabla por tramitador con su formación en IA.",
        "Medidas: clic en M-10 (formación de los tramitadores)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Intervención humana nos enseña la cola de todo lo que escalan los agentes, quién lo revisa, cuánto tarda y cuántas decisiones acaba cambiando.",
          "accion": [
            "ver:#kpis-hitl"
          ]
        },
        {
          "tipo": "para",
          "texto": "Nos sirve para demostrar que la revisión humana es real y que nadie se limita a firmar sin mirar."
        },
        {
          "tipo": "que",
          "texto": "Cada traza que se escala entra en una cola con su motivo, su estado y la persona que la revisa. Cuando un tramitador cambia la decisión del agente, eso es un override, y queda registrado con su motivo.",
          "accion": [
            "ver:#hitl-cola",
            "traza:MSG-A-04"
          ]
        },
        {
          "tipo": "que",
          "texto": "El panel también mide cómo se revisa: cuánto tarda cada tramitador, qué porcentaje de aprobaciones se firma en menos de 30 segundos y qué tramitadores tienen la formación en IA.",
          "accion": [
            "cerrar",
            "ver:#hitl-calidad"
          ]
        },
        {
          "tipo": "valor",
          "texto": "La cola demuestra que una persona ha tomado la decisión, con su nombre y su hora. En la demo, el 3,3 % de las aprobaciones se firma en menos de 30 segundos y tres tramitadores pasan del máximo del 5 %."
        },
        {
          "tipo": "valor",
          "texto": "Dos de ellos aún no tienen la formación en IA, y eso ya es una medida abierta.",
          "accion": [
            "med:M-10"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Además, cada override alimenta la autonomía: si los tramitadores corrigen más del 3 %, el agente baja de nivel.",
          "accion": [
            "cerrar",
            "ver:#hitl-overrides"
          ]
        }
      ]
    },
    {
      "min": "24–26",
      "pagina": "gobierno",
      "titulo": "Fraude: MSG-A-13, MSG-A-09 y MSG-A-02",
      "accion": "goto:fraude",
      "requiere": "lote",
      "que": "menú → Fraude. Bloque Riesgo",
      "frase": "El indicio no acusa: prioriza, y la decisión la toma una persona.",
      "clics": [
        "Los tres niveles: sin indicios (0-39), vigilancia (40-69), SIU (≥ 70).",
        "KPI: 13 analizados, 3 con indicios, 2.080 € retenidos en 3 pagos, 80 escalados a la SIU en 14 días, 21 % confirmados, 76 % de falsos positivos.",
        "Casos del lote → clic en MSG-A-13: la ficha del caso. Desglose del score por indicador (póliza de 21 días, relato vago, sin denuncia ni fuerza, prisa, joyas de 5.000 € sin factura), el mensaje con las citas resaltadas y el seguimiento.",
        "Navegar con › a MSG-A-09: la cuenta compartida. Y a MSG-A-04: el contraindicio (Pablo está declarado) que baja su score a 30.",
        "Escenarios de fraude EF-01 a EF-08: abrir EF-02.",
        "Mapa de relaciones: MSG-A-09 y MSG-A-02 unidos por la misma cuenta con un expediente de agosto de otro titular.",
        "Catálogo de indicadores → Nuevo indicador: la vista previa enseña qué mensajes del lote lo activarían. Cerrar sin guardar.",
        "Equidad por canal: WhatsApp recibe 1,8 veces más alertas por el tono (medida M-18)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Fraude puntúa cada mensaje según los patrones de fraude que la compañía ya tiene identificados y envía los casos de más riesgo a la Unidad de Investigación de Siniestros.",
          "accion": [
            "ver:#fr-niveles"
          ]
        },
        {
          "tipo": "para",
          "texto": "Lo que buscamos es frenar el pago dudoso sin bloquear al cliente que no ha hecho nada."
        },
        {
          "tipo": "que",
          "texto": "Para detectar esos patrones, la plataforma combina tres fuentes: lo que entiende la IA del relato del cliente, con las citas literales del mensaje; el histórico de pólizas, siniestros y proveedores; y reglas deterministas.",
          "accion": [
            "fr:MSG-A-13"
          ]
        },
        {
          "tipo": "que",
          "texto": "Con todo eso, cada mensaje recibe una puntuación de 0 a 100. Por debajo de 40 solo se registra. Entre 40 y 69 se tramita, pero el pago queda retenido hasta verificar. Y a partir de 70 el caso va a la SIU.",
          "accion": [
            "cerrar",
            "ver:#fr-lote"
          ]
        },
        {
          "tipo": "que",
          "texto": "El histórico también puede restar: si un dato desmiente el indicio, ese contraindicio baja la puntuación. Cada caso tiene su ficha con el desglose por indicador, el mapa de relaciones con otros siniestros y el seguimiento.",
          "accion": [
            "fr:MSG-A-04"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Ningún siniestro se rechaza de forma automática y el cliente nunca ve el indicio; si un texto dirigido a él lo menciona, un guardrail lo bloquea. Los casos de riesgo llegan a la SIU con la ficha ya preparada.",
          "accion": [
            "cerrar",
            "ver:#fr-mapa",
            "ver:#fr-siu"
          ]
        },
        {
          "tipo": "valor",
          "texto": "En la demo hay 2.080 € retenidos y un tope que vigila ese dinero para no perjudicar a clientes legítimos. Y el 76 % de falsos positivos nos recuerda por qué un indicador por sí solo nunca decide.",
          "accion": [
            "ver:#kpis-fr"
          ]
        }
      ]
    },
    {
      "min": "26–27:30",
      "pagina": "gobierno",
      "titulo": "Razonamiento y replay",
      "accion": "goto:replay",
      "requiere": "lote",
      "que": "menú → Razonamiento y replay. Bloque Calidad",
      "frase": "Auditamos lo que ha pasado y probamos antes de cambiar nada.",
      "clics": [
        "En la lista, clic en MSG-A-08. A la derecha, la cadena de agentes y el mensaje con las citas que usó cada agente, en el color de cada uno.",
        "Por agente: confianza por ramo (Auto frente a Salud), origen de cada campo extraído (literal, normalizado, deducido o nulo), matriz de reglas con el camino a la decisión y los tokens frente al CAP-05.",
        "Arrastrar el separador central para ampliar el razonamiento.",
        "Replay → modo Idéntico → ejecutar: misma decisión.",
        "Modo What-if → Modelo de Reglas: gpt-5-mini → ejecutar: el diff de ramo, decisión, coste y latencia.",
        "Histórico de replays: RP-0006 (MSG-A-04 con gpt-5-mini: misma decisión, −82 % de coste) y RP-0005 (gpt-5-nano cambió un Aprobado por A revisar)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Razonamiento y replay nos enseña cómo ha llegado cada agente a su resultado, y nos permite repetir una traza real con otro modelo o con otra versión del prompt.",
          "accion": [
            "ver:#r-lista"
          ]
        },
        {
          "tipo": "para",
          "texto": "Nos sirve para probar cualquier cambio con casos reales antes de que llegue al cliente."
        },
        {
          "tipo": "que",
          "texto": "El razonamiento se muestra agente por agente: qué ha recibido, qué frases del mensaje ha usado como evidencia y qué ha entregado.",
          "accion": [
            "sel:MSG-A-08",
            "ver:#steps"
          ]
        },
        {
          "tipo": "que",
          "texto": "Ojo, porque no es la cadena de pensamiento interna del modelo: es el registro estructurado que devuelve cada agente, con sus citas."
        },
        {
          "tipo": "que",
          "texto": "El replay repite una traza real de dos formas. En modo idéntico comprueba que el resultado se puede reproducir.",
          "accion": [
            "sel:MSG-A-04",
            "ver:#card-replay"
          ]
        },
        {
          "tipo": "que",
          "texto": "En modo what-if cambia el modelo o la versión del prompt y nos enseña la diferencia en la decisión, el coste y la latencia.",
          "accion": [
            "replay:whatif:gpt-5-mini"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Cualquier cambio de modelo se prueba con casos reales antes de pasarlo a producción."
        },
        {
          "tipo": "valor",
          "texto": "En la demo, pasar el agente de Reglas a gpt-5-mini mantuvo la decisión con un 82 % menos de coste; en cambio, gpt-5-nano convirtió un aprobado en un a revisar. El replay lo detecta antes que el cliente.",
          "accion": [
            "ver:#replays"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y cuando llega el auditor y pregunta por qué se tomó una decisión, la respuesta está aquí."
        }
      ]
    },
    {
      "min": "27:30–29",
      "pagina": "gobierno",
      "titulo": "Knowledge Bases",
      "accion": "kb:KB-02:salud",
      "requiere": "lote",
      "que": "menú → Knowledge Bases. Bloque Calidad",
      "frase": "El conocimiento también se degrada, y lo vigilamos igual que a los agentes.",
      "clics": [
        "KPI: 9 bases (1 real, 8 simuladas), 5 sanas, recall medio 0,86, 3,27 % de consultas sin respuesta, 6 rúbricas con acuerdo juez-humano de 0,93.",
        "Clic en KB-02 · Condicionados Auto 2026 (degradada): pestaña Salud, cada métrica frente a su umbral; el recall cae 6 puntos.",
        "Pestaña Fuente y sincronización: los 340 documentos del condicionado 2024 que entraron por una carpeta mal filtrada.",
        "Pestaña Comparativa: cuatro configuraciones evaluadas con la rúbrica R-02; con filtro de vigencia el recall sube de 0,81 a 0,88. Aplicar.",
        "Pestaña Versiones: «Volver a esta versión».",
        "Navegar con › a KB-06 · Red de talleres (crítica): la API responde 401 y 14 talleres dados de baja siguen como concertados.",
        "Rúbricas → editar una: los pesos deben sumar 100 y se guarda una versión nueva. Cerrar sin guardar."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Knowledge Bases nos permite medir la salud del conocimiento que consultan los agentes: los condicionados, el manual de tramitación, el cuadro médico o la red de talleres.",
          "accion": [
            "cerrar",
            "ver:#kpis-kb",
            "kb:KB-02:salud"
          ]
        },
        {
          "tipo": "para",
          "texto": "Es importante porque, aunque el modelo sea muy bueno, si consulta un documento desactualizado va a decidir mal."
        },
        {
          "tipo": "que",
          "texto": "Cada base de conocimiento se evalúa de forma continua contra una rúbrica, con métricas como el recall o las consultas que se quedan sin respuesta, y cada métrica tiene su umbral."
        },
        {
          "tipo": "que",
          "texto": "La ficha nos enseña su configuración, de dónde se alimenta y cada cuánto se sincroniza, sus versiones y una comparativa que evalúa distintas configuraciones del mismo contenido para elegir la mejor antes de aplicarla.",
          "accion": [
            "kb:KB-02:config"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Con un condicionado antiguo, el agente puede aplicar una franquicia o una exclusión que ya no existe."
        },
        {
          "tipo": "valor",
          "texto": "En la demo, la base de Condicionados Auto ha perdido 6 puntos de recall porque se colaron 340 documentos de 2024, y añadir un filtro de vigencia lo sube de 0,81 a 0,88.",
          "accion": [
            "kb:KB-02:fuente"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Además, el cambio se mide antes de publicarlo: el reindexado solo pasa a producción si la rúbrica no empeora.",
          "accion": [
            "kb:KB-02:comparativa",
            "kb-aplicar:KB-02"
          ]
        }
      ]
    },
    {
      "min": "29–30:30",
      "pagina": "gobierno",
      "titulo": "Cumplimiento: el termómetro",
      "accion": "goto:cumplimiento",
      "requiere": "lote",
      "que": "menú → Cumplimiento. Bloque Cumplimiento y coste",
      "frase": "La solución deja a la aseguradora en condiciones de demostrar que cumple.",
      "clics": [
        "Cabecera: 87 % de cobertura, 26 controles cubiertos y 9 parciales, 14 medidos en las trazas y 21 declarados.",
        "Los cuatro termómetros: RIA 86 %, RGPD 87 %, DORA 100 %, EIOPA y Solvencia II 80 %. Clic en uno para filtrar la matriz.",
        "Matriz norma → control: filtro Solo parciales. Señalar la EIPD (RGPD art. 35) y el aviso de IA en WhatsApp (AI Act art. 50).",
        "Ciclo de vida de una traza: los ocho pasos con su norma y su plazo.",
        "Inventario de datos personales → clic en MSG-A-12: el texto con los datos resaltados y su bloque _gobernanza.",
        "Integridad del registro → Simular una alteración: la cadena se rompe y el termómetro se pone en rojo. Deshacer.",
        "Exportar evidencias de cumplimiento (opcional)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Cumplimiento nos ofrece un termómetro normativo que nos permite entender en qué nivel de cumplimiento estamos respecto al AI Act, el RGPD, DORA, EIOPA y Solvencia II, y que se calcula a partir de todas las trazas que produce el sistema.",
          "accion": [
            "ver:#cmp-hero"
          ]
        },
        {
          "tipo": "para",
          "texto": "Nos sirve para saber cuánto podemos demostrar hoy y qué nos falta."
        },
        {
          "tipo": "que",
          "texto": "Los controles se agrupan por norma. Algunos se miden directamente en las trazas, como que cada decisión tenga su registro completo. Otros se declaran con su evidencia documental, como el plan de salida de un proveedor.",
          "accion": [
            "ver:#cmp-termos"
          ]
        },
        {
          "tipo": "que",
          "texto": "Una matriz nos dice, artículo por artículo, qué exige la norma, cómo lo resuelve la solución y qué trazas lo respaldan.",
          "accion": [
            "ver:#cmp-matriz"
          ]
        },
        {
          "tipo": "que",
          "texto": "También tenemos el inventario de datos personales de cada mensaje y la cadena de integridad del registro: si alguien modifica una traza ya sellada, la cadena se rompe a partir de ese punto y el termómetro se pone en rojo.",
          "accion": [
            "cmp:MSG-A-12"
          ]
        },
        {
          "tipo": "valor",
          "texto": "La cobertura nos dice cuánto podemos demostrar hoy; en la demo, un 87 %. Los controles en ámbar son la lista de trabajo, y son reales, como la evaluación de impacto pendiente o el aviso de IA que falta en WhatsApp.",
          "accion": [
            "cerrar",
            "ver:#cmp-matriz"
          ]
        },
        {
          "tipo": "valor",
          "texto": "El panel no maquilla nada."
        },
        {
          "tipo": "valor",
          "texto": "Un registro manipulado se detecta en el momento, y por eso un auditor puede fiarse del histórico. No es un certificado, pero sí es la evidencia que necesita el DPO, recalculada con cada traza.",
          "accion": [
            "ver:#cmp-cadena",
            "alteracion:on",
            "espera:4000",
            "alteracion:off"
          ]
        }
      ]
    },
    {
      "min": "30:30–32",
      "pagina": "gobierno",
      "titulo": "FinOps",
      "accion": "goto:finops",
      "requiere": "lote",
      "que": "menú → FinOps. Bloque Cumplimiento y coste",
      "frase": "Lo que no queremos es el modelo más barato; queremos el modelo más barato que nos dé la máxima calidad.",
      "clics": [
        "KPI: coste de hoy 17,33 € (87 % del tope diario de 20 €), coste mensual 296,40 € de 500 € con proyección de 428 €, 3 topes superados, 0,0128 € por mensaje. Clic en Coste mensual: la ventana con el detalle.",
        "Cómo va el gasto de cada agente: la fila de Reglas en rojo (13,70 € / 12 €, 80 % del total).",
        "Dónde se va el dinero y por qué: en Reglas, la salida de gpt-5 es el 63 % de su coste. Botón € / %.",
        "Alertas de coste: CAP-03 (qué hizo solo: degradar a gpt-5-mini hasta las 00:00) y CAP-04/CAP-05 en MSG-A-08.",
        "Caps configurados → clic en CAP-03: la ficha con los agentes implicados y el histórico de superaciones. Nuevo cap (opcional, cerrar sin guardar).",
        "Modelos: precio, llamadas, tokens, coste, p95 y calidad (JSON válido, sin reintento, estable en replay, precisión). Clic en la leyenda de un gráfico para ocultar una serie.",
        "Recomendaciones: R-01 a R-04."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de FinOps nos permite controlar el gasto al segundo y en base a acciones.",
          "accion": [
            "ver:#kpis-fin"
          ]
        },
        {
          "tipo": "para",
          "texto": "Los proveedores de servicios de IA empresarial nos dicen cuánto hemos gastado cada 8 horas, y en ese tiempo pueden pasar muchas cosas: nos podemos levantar por la mañana con un gasto que no queríamos."
        },
        {
          "tipo": "para",
          "texto": "Aquí vemos cuánto gastamos por agente, por modelo y por tipo de token en el momento, y los topes actúan solos en cuanto se superan."
        },
        {
          "tipo": "que",
          "texto": "Cada decisión suma su coste en el momento en que se produce, porque la traza registra los tokens de cada agente y la plataforma los multiplica por el precio de su modelo.",
          "accion": [
            "ver:#fin-agentes"
          ]
        },
        {
          "tipo": "que",
          "texto": "Sobre ese coste trabajan los topes: por agente, globales, por mensaje y de tokens de razonamiento. Cada tope lleva asociada una acción."
        },
        {
          "tipo": "que",
          "texto": "Cuando se supera uno, la alerta nos explica qué ha pasado, qué ha hecho el sistema de forma automática, por ejemplo pasar a un modelo más barato hasta medianoche sin parar el servicio, y qué acción nos sugiere.",
          "accion": [
            "ver:#correctivas"
          ]
        },
        {
          "tipo": "que",
          "texto": "El gasto se desglosa por tipo de token para entender de dónde viene. Y una tabla cruza el coste y la calidad de cada modelo: cuánto cuesta y con qué frecuencia devuelve una respuesta válida, sin reintentos y estable en replay.",
          "accion": [
            "ver:#fin-porque",
            "espera:4000",
            "ver:#modelos"
          ]
        },
        {
          "tipo": "valor",
          "texto": "No esperamos 8 horas a que el proveedor nos diga lo que ha pasado: el tope actúa en el mismo mensaje que lo supera. En la demo, el agente de Reglas pasó su tope y el sistema cambió de modelo solo, sin parar el servicio.",
          "accion": [
            "ver:#caps"
          ]
        },
        {
          "tipo": "valor",
          "texto": "El gasto del mes va por 296 € de 500 €, con una proyección de 428 €, y no hay sorpresas en la factura.",
          "accion": [
            "kpi:coste-mensual"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Y sabemos exactamente dónde actuar: el agente de Reglas se lleva el 80 % del gasto y, dentro de él, lo que más pesa es el texto que genera gpt-5. Las recomendaciones nos dicen cuánto ahorra cada palanca.",
          "accion": [
            "cerrar",
            "ver:#fin-agentes"
          ]
        }
      ]
    },
    {
      "min": "32–33:30",
      "pagina": "gobierno",
      "titulo": "Medidas correctivas",
      "accion": "goto:medidas",
      "requiere": "lote",
      "que": "menú → Medidas correctivas. Bloque Mejora y auditoría",
      "frase": "El coste bajo control y cada problema con su dueño.",
      "clics": [
        "KPI: 19 medidas abiertas (2 críticas), ahorro conseguido 0 €/mes de 278 € posibles, 9 riesgos normativos, 4 knowledge bases por sanear. El círculo del termómetro arriba a la derecha.",
        "Filtros: Coste y Victorias rápidas. Quitar.",
        "Tarjeta M-01 · Reglas supera su cap diario: tres alternativas, la recomendada «Usar gpt-5-mini en despeje directo» (−237 €/mes, se valida con el replay RP-0006). Clic en la tarjeta: la ficha con las alternativas lado a lado.",
        "Simular → Aplicar: el ahorro conseguido sube a 237 €/mes.",
        "M-02 · Coste y razonamiento en MSG-A-08 → Solicitar aprobación: queda «Pendiente del Comité IA» (41 € pendientes).",
        "Deshacer en M-01: el ahorro vuelve a cero. Volver a aplicarla.",
        "Clic en el círculo del termómetro (lleva a Cumplimiento) o en M-10 (formación de tramitadores)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "La sección de Medidas correctivas junta en una sola lista los problemas que detecta el resto del panel, cada uno con sus alternativas, su ahorro y quién tiene que aprobarlas.",
          "accion": [
            "medida:M-01:abierta",
            "medida:M-02:abierta",
            "ver:#kpis-med"
          ]
        },
        {
          "tipo": "para",
          "texto": "Lo que buscamos es que cada problema tenga un dueño, una alternativa y una verificación."
        },
        {
          "tipo": "que",
          "texto": "La lista cubre coste, conocimiento, cumplimiento, calidad y resiliencia.",
          "accion": [
            "ver:#med-lista"
          ]
        },
        {
          "tipo": "que",
          "texto": "Cada problema viene de otra sección del panel y trae varias alternativas, con la recomendada marcada: su impacto, su efecto secundario, el esfuerzo, quién la aprueba y cómo se valida antes de aplicarla.",
          "accion": [
            "med:M-01"
          ]
        },
        {
          "tipo": "que",
          "texto": "Desde aquí podemos simular una alternativa, aplicarla o pedir aprobación, y deshacerla si hace falta. Al verificar una medida, el termómetro de cumplimiento se actualiza solo."
        },
        {
          "tipo": "valor",
          "texto": "Cada ahorro se apoya en evidencia. En la demo, la medida que lleva gpt-5-mini a los casos sencillos se valida con un replay que no cambió ninguna decisión, y al aplicarla el ahorro conseguido sube 237 € al mes.",
          "accion": [
            "cerrar",
            "medida:M-01:aplicada",
            "ver:#kpis-med"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Lo que necesita aprobación espera al Comité de IA, y todo queda registrado.",
          "accion": [
            "medida:M-02:pendiente",
            "ver:#med-lista"
          ]
        }
      ]
    },
    {
      "min": "33:30–34",
      "pagina": "gobierno",
      "titulo": "Histórico",
      "accion": "goto:historico",
      "requiere": "lote",
      "que": "menú → Histórico. Bloque Mejora y auditoría",
      "frase": "Este es el libro de registro que pide el regulador, y se rellena solo.",
      "clics": [
        "La línea de tiempo: arriba, lo que se ha hecho en la demo con el usuario «Operador (esta sesión)»: el kill switch de Extracción, M-01 aplicada y deshecha, M-02 pendiente, la configuración aplicada en KB-02.",
        "Chips de tipo: Operaciones, Políticas, Overrides (el de L. Prieto en MSG-A-04), Despliegues (cambios de modelo y de prompt), Incidentes (la ráfaga de errores 429)."
      ],
      "subtitulos": [
        {
          "tipo": "para",
          "texto": "El Histórico es la línea de tiempo de todo lo que ha cambiado en el sistema, con su autor y su hora. Nos sirve como libro de registro para cualquier auditor, y no hay que rellenarlo a mano.",
          "accion": [
            "ver:#timeline"
          ]
        },
        {
          "tipo": "que",
          "texto": "Recoge cada acción con su usuario y su hora: agentes pausados, guardrails activados o desactivados, medidas aplicadas o deshechas, overrides, cambios de modelo, de prompt y de nivel, e incidentes."
        },
        {
          "tipo": "que",
          "texto": "Se puede filtrar por tipo de evento.",
          "accion": [
            "ver:#hist-chips"
          ]
        },
        {
          "tipo": "valor",
          "texto": "Un auditor puede ver cada cambio con su autor y su fecha, y nadie tiene que reconstruir qué pasó a partir de correos. Todo lo que hemos tocado durante esta demo ya está aquí.",
          "accion": [
            "ver:#timeline"
          ]
        }
      ]
    },
    {
      "min": "34–35",
      "pagina": "gobierno",
      "titulo": "Cierre",
      "accion": "goto:historico",
      "requiere": "lote",
      "que": "Panel de gobierno → Histórico",
      "frase": "Lo que hace que la IA llegue a producción y se quede es el gobierno.",
      "clics": [],
      "subtitulos": [
        {
          "tipo": "intro",
          "texto": "Hemos visto entrar 13 avisos por cinco canales distintos. 10 se han aprobado solos y 3 han pasado a una persona, cada uno con su motivo y con la frase del cliente que lo justifica.",
          "accion": [
            "arriba"
          ]
        },
        {
          "tipo": "intro",
          "texto": "Hemos visto también un caso que va a la SIU y tres pagos retenidos sin bloquear a nadie."
        },
        {
          "tipo": "intro",
          "texto": "Y alrededor de todo eso, el gobierno: agentes con su nivel de autonomía, sus permisos y su responsable; guardrails que hacen que las reglas de la aseguradora manden sobre el modelo; un presupuesto que se controla cada día; y una traza por decisión que nos permite demostrar cómo se ha decidido."
        },
        {
          "tipo": "intro",
          "texto": "La IA para clasificar mensajes ya la tenéis a vuestro alcance. Lo que hace que llegue a producción y se quede es esto."
        },
        {
          "tipo": "intro",
          "texto": "Y no es una idea sobre el papel: es lo que Logicalis está implantando en clientes de distintas industrias, adaptado a los procesos, a las reglas y a la normativa de cada uno."
        }
      ]
    }
  ]
};
