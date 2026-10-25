# Guion de la demo · Triaje FNOL con agentes gobernados

Guion paso a paso para una sesión de 30-35 minutos: introducción con las páginas `intro-fnol.html` e `intro-sistema.html` y demo sobre el Paquete A (13 mensajes) en `index.html` y `gobierno.html`. Base: [guia-demo.md](guia-demo.md) y el Recorrido de la demo (`data/recorrido.js`).

**Cómo leer este guion**

- Los párrafos en cita (con la barra a la izquierda) son el **texto para decir en voz alta**. En la versión Word salen en verde.
- El resto son indicaciones para el presentador: qué abrir, dónde hacer clic y qué mirar.
- Cada paso sigue el mismo orden: frase clave, mensaje del Paquete A, **Para qué sirve esta sección** (en la parte de gobierno), **Qué es y qué hace** (técnico y funcional), **Valor** (para el negocio y para la persona que lo usa), **Norma y por qué importa** (qué dice y qué riesgo hay) y, al final, los **Clics**. Primero se cuenta y después se enseña.
- Las cifras salen de la demo. Los datos del panel son de demostración, coherentes con el Paquete A.

---

## 0. Antes de empezar

**Preparación (5 minutos antes)**

1. Servir la demo (`make run`) y abrir `intro-fnol.html`.
2. En una segunda pestaña, abrir `index.html`. En el menú lateral, **Configuración → Motor de triaje → Resultados guardados** (no depende de red) y **Paquete de mensajes → Paquete A**. Comprobar que «Seudonimizar antes de enviar al modelo» está activada.
3. No procesar el lote todavía: se hace en directo en el paso 2.
4. Si se van a hacer capturas, añadir `?fecha=2026-09-17` a la URL. Sin ese parámetro las fechas de los mensajes se desplazan al día de hoy.
5. Opcional: activar el **Modo presentador** en Inicio del panel (contraseña `password`) para tener a mano el Recorrido con su botón «Ir».

**Tiempos**

| Min | Bloque | Pantalla |
|---|---|---|
| 0-1 | 1. FNOL: de qué hablamos | `intro-fnol.html` |
| 1-5 | 2. El sistema que vais a ver | `intro-sistema.html` |
| 5-14 | 3. Parte 1 · Triaje (pasos 1-5) | `index.html` |
| 14-15 | 4.0 Entrada al panel de gobierno | `gobierno.html` · Inicio |
| 15-34 | 4. Parte 2 · Gobierno (pasos 6-18) | `gobierno.html` |
| 34-35 | 5. Cierre | `gobierno.html` · Histórico |

---

## 1. FNOL: de qué hablamos (≈1 min)

**Pantalla:** `intro-fnol.html`.

**Frase clave:** «El primer aviso decide buena parte de lo que pasa con el siniestro.»

> Antes de empezar, quiero situar de qué estamos hablando. En España se declaran unos 11 millones de siniestros de Auto al año, según UNESPA; eso es uno cada tres segundos. Y todos empiezan de la misma forma: con un primer aviso del cliente.
>
> Ese aviso nos llega por cinco canales a la vez. Puede ser un email largo con adjuntos, un formulario web, un chat, una llamada que alguien tiene que transcribir o un WhatsApp escrito con prisa y lleno de emojis. Y desde ese momento empieza a correr el reloj, porque la Ley de Contrato de Seguro, en su artículo 16, da siete días para comunicar el siniestro.
>
> En el FNOL se decide buena parte de lo que pasa después. Si el ramo se asigna mal, el expediente va dando vueltas entre equipos. Si falta un dato, hay que volver a llamar al cliente. Si un indicio de fraude se nos escapa aquí, después cuesta mucho más encontrarlo. Y además es el primer contacto del cliente con su aseguradora, normalmente en un mal día.
>
> Hoy todo ese trabajo lo hace una persona: lee el mensaje, lo clasifica y teclea los datos en el sistema. Para que os hagáis una idea del peso que tiene, en Estados Unidos la gestión de siniestros se lleva en torno al 10 % de la prima de Auto. Ahí es donde se nos va el tiempo y el dinero.

**Notas**

- Fuentes: UNESPA (11 M y «uno cada 3 s»); LCS art. 16 (7 días); III con datos de NAIC (~10 % de la prima de Auto en EE. UU., 2023). No hay dato público equivalente para España: decirlo así si preguntan.
- No usar el «4 % de agentes en producción» ni el ahorro del 25-30 % de McKinsey: no están verificados en la fuente original.

---

## 2. El sistema que vais a ver (≈4 min)

**Pantalla:** `intro-sistema.html`, bloque a bloque de arriba abajo.

**Frase clave:** «Automatizamos el primer contacto, con la IA bajo control.»

### 2.1 De dónde sale esta plataforma

**Pantalla:** bloque «Lo que hemos aprendido implantando gobierno de IA».

> Antes de entrar en el detalle, una aclaración importante. Lo que os vamos a enseñar es un ejemplo de la experiencia de Logicalis implantando soluciones de gobierno y observabilidad de IA en clientes de distintas industrias. Hemos reunido en un mismo caso muchas cosas que hemos hecho en proyectos diferentes.
>
> Cambia el sector, pero el objetivo es siempre el mismo: tener el control para obtener mejores resultados, dar un mejor servicio a los clientes, controlar el gasto y cumplir con la normativa. Hoy lo vamos a ver aplicado al primer aviso de siniestro.

### 2.2 Qué hace

> Lo que os vamos a enseñar hoy automatiza ese primer contacto. Tenemos cuatro agentes de IA que reciben el aviso por cualquier canal, deciden a qué ramo pertenece, extraen los datos y aplican las reglas de negocio de la aseguradora. Al tramitador le llega el aviso ya clasificado, con los datos extraídos y con una propuesta: aprobado o a revisar.
>
> En el lote que vamos a procesar entran 13 avisos. 10 se aprueban solos y 3 pasan a una persona, cada uno con su motivo y con la frase del cliente que lo justifica.

### 2.3 Los cuatro agentes

| Agente | Qué hace | Modelo | Autonomía |
|---|---|---|---|
| Multicanalidad | Recibe el mensaje por los cinco canales y lo normaliza a un único formato; transcribe las llamadas | gpt-5-nano + voz a texto | L3 · Autónomo |
| Clasificación por ramo | Asigna Auto, Hogar o Salud citando los indicios del texto | gpt-5-nano | L3 · Autónomo |
| Extracción de datos | Convierte el texto libre en 10 campos; si un dato no está, queda vacío | gpt-5-mini | L2 · Supervisado |
| Reglas de negocio | Aplica las 25 reglas de Auto, Hogar y Salud y propone Aprobado o A revisar | gpt-5 | L2 · Supervisado |

> La idea es tener cuatro especialistas pequeños en lugar de una única IA que lo hace todo. Cada uno tiene su modelo, su versión de prompt, su responsable y sus propios límites. Y el modelo más caro lo usamos solo donde de verdad hace falta razonar, que es en las reglas de negocio.

### 2.4 Dos usuarios, dos pantallas

> La solución tiene dos tipos de usuario. Por un lado está el tramitador, que trabaja en la pantalla de triaje: ve cada aviso y entiende por qué se ha aprobado o por qué le ha llegado a él. Por otro lado están las personas que gobiernan la IA, ya sea el Comité de IA, Riesgos, Auditoría, el DPO o Finanzas, que trabajan en el panel de gobierno. Desde ahí ven si los agentes deciden bien, cuánto cuestan y si la aseguradora puede demostrar que cumple.

### 2.5 Por qué el gobierno decide el éxito

> Hoy clasificar un mensaje con IA ya no diferencia a nadie; con un buen prompt se consigue más de un 90 % de acierto. El reto de verdad está en pasar del piloto a producción. Gartner estima que más del 40 % de los proyectos de IA agéntica se van a cancelar antes de que acabe 2027, por coste, por un valor poco claro o por riesgos sin controlar. Es decir, los proyectos no se caen porque la IA falle. Se caen porque nadie sabe responder a tres preguntas: por qué ha decidido eso, quién lo controla y cuánto cuesta.

Cinco ideas, una por bloque de la página:

**Trazabilidad: la base de todo**

> La base de todo es la trazabilidad. Cada decisión deja una traza: qué entró, qué hizo cada agente, con qué modelo, cuántos tokens gastó, cuánto costó y qué decidió. Los proveedores de IA ya ofrecen trazas técnicas, y son necesarias, pero no entienden qué es un ramo, una franquicia o un plazo de siete días. Lo que hace esta solución es juntar los dos mundos, la traza técnica y el proceso de negocio de la aseguradora, para dar una respuesta adaptada a cada compañía. Y sobre esa traza construimos todo lo demás: el control de la autonomía y del gasto, la auditoría y el replay.

**Autonomía y madurez de los agentes**

> Cada agente tiene un nivel de autonomía, que va de L0, donde solo sugiere, a L3, donde decide y ejecuta. Esa autonomía se gana con datos y se pierde con datos. Cuando los tramitadores empezaron a corregir más del 3 % de las decisiones del agente de Reglas, el agente bajó de L3 a L2, con su motivo y con el nombre de quien lo aprobó. Hoy el 81 % de las decisiones sale sin intervención humana, y mantener ese porcentaje con control es lo que de verdad significa que la automatización funciona.

**Gasto bajo control**

> El gasto lo controlamos al segundo y en base a acciones. Los proveedores de servicios de IA empresarial te dicen cuánto has gastado cada 8 horas, y en 8 horas pueden pasar muchas cosas: un agente que entra en bucle o un pico de mensajes nos puede hacer levantarnos por la mañana con un gasto que no queríamos. Aquí cada decisión suma su coste en el momento en que se produce, y cada agente tiene sus topes. Si se supera uno, el sistema actúa solo: por ejemplo, pasa a un modelo más barato y lo deja anotado en cada traza, sin parar el servicio.

**Fraude**

> Para el fraude, la plataforma combina lo que entiende la IA del relato del cliente con el histórico de pólizas y siniestros y con reglas deterministas. Con todo eso identifica los patrones de fraude que la compañía ya conoce: una póliza recién contratada, una cuenta de cobro que se repite entre asegurados distintos o un robo sin denuncia. Y algo importante: el indicio no acusa, prioriza. La decisión siempre la toma una persona.

**Cumplimiento demostrable**

> El RGPD, DORA y la opinión de EIOPA sobre IA ya están en vigor. El Reglamento de IA llega después, y el triaje no se considera de alto riesgo, pero aplicamos sus artículos como buena práctica. Cada decisión lleva pegada su prueba de cumplimiento: qué datos personales había, por qué se decidió así y si la revisó una persona.

**Puente a la demo**

> Vamos a verlo. Primero os enseño lo que ve el tramitador y después lo que ve quien gobierna la IA: el responsable de los agentes, el auditor y el CFO.

**Clic:** botón «Empezar la demo» → `index.html`.

---

## 3. Parte 1 · Triaje

### Paso 1 · Las seis fases y los cinco canales (min 5-6:30)

**Pantalla:** `index.html`, barra de fases numeradas bajo la cabecera.

**Frase clave:** «Así funciona el proceso de principio a fin.»

**Mensajes protagonistas:** MSG-A-11 (WhatsApp) y MSG-A-08 (llamada transcrita).

| MSG-A-11 · WhatsApp · «Rayón en la puerta en un parking» |
|---|
| «Hola!! os escribo por aquí porque no me aclaro con la app 😅 Ayer por la tarde, en el parking del Carrefour de Alcobendas, alguien me rayó toda la puerta del conductor con una llave o algo así y se fue sin dejar nota 😩 El vigilante dice que las cámaras no enfocan esa zona. Tengo fotos y esta mañana he puesto denuncia en la comisaría de Alcobendas, me han dado el número de diligencias 18734/26. Es el Peugeot 2008 blanco 2290 LKV, póliza AU-742210. El taller de al lado de casa me dice que unos 600 € pintar la puerta entera. Ya me pasó algo parecido hace unos meses en este mismo parking 🙄 Qué hago?? Os mando las fotos por aquí si queréis 📸 Mi DNI es 53442872-A 🙏» |
| **Resultado:** Auto · Aprobado · 600 € · vigilancia antifraude (paso 12) |

| MSG-A-08 · Teléfono (transcripción) · «Accidente de moto con ingreso hospitalario» |
|---|
| «Llamo en nombre de mi marido, Carlos Ortega Ruiz, que tiene la moto asegurada con vosotros (Honda CB500, matrícula 6620 KXS, póliza AU-662371) y también el seguro de salud (SA-662371). Esta tarde a las 19h un coche se le ha cruzado en una rotonda en Alcorcón, la de la avenida de Leganés con la calle Porto Cristo, y se ha caído. Está ingresado en el Hospital Fundación Alcorcón con fractura de clavícula y dos costillas; dicen que le tienen que operar la clavícula mañana. La Guardia Civil ha hecho atestado, el número es el 2026-001873-AL, y el coche es de otro conductor que sí se ha quedado y ha dado sus datos: es un Opel Astra 9012 JHN. La moto está en el depósito municipal, bastante destrozada. Mi marido tiene 47 años y es diabético, por si eso importa para la operación. No sé si esto va por la moto o por el seguro de salud, necesito que me llaméis a este número, el 655 201 877.» |
| **Resultado:** Auto · A revisar · lesionado ingresado y tercero implicado (pasos 4, 8 y 10) |

**Qué es y qué hace**

> Aquí veis las seis fases del proceso. Las cuatro primeras son los agentes de IA trabajando en cadena: la recepción multicanal, que recibe el aviso por cualquier canal y lo normaliza a un único formato; la clasificación por ramo; la extracción de datos; y la aplicación de las reglas de negocio de Auto, Hogar y Salud. Las dos últimas, trazabilidad y automatización, cierran el circuito: registran todo lo que pasa y convierten la decisión en flujo de trabajo.
>
> Cada fase tiene su ficha, donde se explica qué recibe, qué entrega y si lo resuelve un modelo de IA o una regla de negocio.

**Valor**

> Para la aseguradora, esto significa que un aviso que llega por WhatsApp recibe exactamente el mismo criterio que uno que llega por email. El cliente elige el canal que le resulta más cómodo y la compañía no pierde la trazabilidad. Para el tramitador, el aviso le llega ya clasificado, con los datos extraídos y con una propuesta de decisión, y sabe que detrás de cada agente hay un responsable con nombre.
>
> Además, estas fichas son justo la documentación que pide un auditor antes de dar por bueno un sistema de IA.

**Norma y por qué importa**

- **Opinión de EIOPA sobre gobierno y gestión de riesgos de la IA en seguros (2025).** Pide a las aseguradoras que cada sistema de IA tenga responsables, documentación, trazabilidad y supervisión humana, en proporción a su riesgo. **Riesgo:** en una inspección, un sistema sin documentar ni responsable queda fuera del sistema de gobierno de la entidad, y el supervisor puede pedir que se corrija o que se pare.

**Clics**

1. Clic en **1 · Multicanalidad**: la ficha emergente con los cinco canales y la unificación en un único formato.
2. Clic en **2 · Clasificación por ramo**, **3 · Extracción de datos** y **4 · Reglas de negocio**: en cada ficha, la etiqueta «IA generativa» o «Lógica de negocio» al pie.
3. Clic en **5 · Trazabilidad** y **6 · Automatización**.
4. Menú lateral → **Paquete de mensajes**: la lista de los 13 con el icono de su canal. Señalar MSG-A-11 (WhatsApp) y MSG-A-08 (teléfono).

**Si preguntan:** ¿y los adjuntos o los audios? La llamada se transcribe con un modelo de voz a texto; los adjuntos se registran como documentación mencionada. El guardrail G-09 puede escalar a una persona las transcripciones con confianza baja.

---

### Paso 2 · Procesar el Paquete A (min 6:30-8:30)

**Pantalla:** `index.html`, panel principal.

**Frase clave:** «En segundos sabemos qué se aprueba y qué tiene que revisar una persona.»

**Mensajes protagonistas:** los 13 del Paquete A (ver anexo A).

**Qué es y qué hace**

> Al procesar el paquete, cada aviso pasa por los cuatro agentes y sale con su ramo, sus datos y su decisión. Los contadores de aprobados, de casos a revisar y de tiempo medio se van actualizando en vivo, y el lote se puede pausar en cualquier momento sin perder nada.
>
> A la vez, cada aviso deja su traza en el momento: el modelo que ha usado cada agente, los tokens, el coste en euros y la decisión.

**Valor**

> Esto nos permite que el tramitador dedique su tiempo a los casos que de verdad necesitan criterio, y no a teclear los que no lo necesitan. En los últimos 14 días, el 81 % de las decisiones ha salido sin intervención humana.
>
> Y el registro se genera solo, sin ningún trabajo manual. Es la evidencia que la aseguradora presenta en una auditoría.

**Norma y por qué importa**

- **AI Act art. 12 · Registro automático.** El sistema debe registrar sus eventos de forma automática durante toda su vida. Es obligatorio para sistemas de alto riesgo y aquí se aplica como buena práctica. **Riesgo:** sin registro, una decisión no se puede reconstruir ante una reclamación o una inspección, y la aseguradora no tiene con qué defenderla.

**Clics**

1. **Procesar paquete**. Mientras avanza, señalar los contadores (Aprobados, A revisar, Tiempo medio de ciclo) y el registro que se llena.
2. A mitad de lote, **Pausar**. Explicar que no se pierde nada. **Continuar**.
3. Al terminar: 10 aprobados y 3 a revisar. Señalar los chips por ramo.
4. Columna **Ramo**: los ✔ frente al resultado esperado. Columnas **Origen** y **Conf.**
5. Filtro **Solo a revisar**: quedan MSG-A-04, MSG-A-08 y MSG-A-13. Quitar el filtro.
6. Señalar las etiquetas de fraude en el registro (MSG-A-13 en la SIU; MSG-A-09, MSG-A-11 y MSG-A-02 con el pago retenido).
7. Opcional: **Exportar JSON**.

**Si preguntan:** ¿cuánto tarda de verdad? Con el modelo real, entre 5 y 8 segundos por aviso en la demo; la traza más larga, MSG-A-08, 12,4 segundos. Una persona tarda minutos en leer y teclear el mismo aviso.

---

### Paso 3 · La ficha de un aprobado: MSG-A-01 (min 8:30-10)

**Pantalla:** `index.html` → ficha de MSG-A-01.

**Frase clave:** «Una decisión aprobada también tiene que poder explicarse.»

| MSG-A-01 · Email · «Golpe leve en la M-30 - póliza AU-483920» |
|---|
| «Buenos días. Me llamo Marta Gil Sanz, con DNI 50123456-Q, y soy la tomadora de la póliza AU-483920. El sábado 12 de septiembre, sobre las 18:30, iba por la M-30 en dirección a la A-5, a la altura del Puente de Segovia, en una retención, y el coche de delante frenó en seco; le di un pequeño toque por detrás. No hubo heridos y los dos coches pudimos seguir circulando. Rellenamos el parte amistoso los dos en el momento (lo adjunto escaneado); el otro conductor es Raúl Méndez, con un Citroën C4 asegurado en otra compañía. Mi coche es el Seat León 4521 KLM. El taller Autos Carabanchel me ha hecho un presupuesto de 1.350 € por el paragolpes y el faro derecho; también os adjunto fotos de los daños.» |
| **Resultado:** Auto · Aprobado · confianza 0,95 · «Colisión leve con parte amistoso, sin heridos y presupuesto de 1.350 €: cumple todas las reglas del ramo Auto.» |

**Qué es y qué hace**

> Esta es la ficha de una decisión. Arriba vemos la decisión, el ramo y la confianza del modelo. Debajo, el mensaje del cliente con las evidencias resaltadas. Cada evidencia es una cita literal del mensaje, y el sistema comprueba que existe en el texto original: si el modelo se la inventa, no aparece.
>
> En las siguientes pestañas vemos los datos que el agente ha extraído del texto libre, cada una de las reglas del ramo que ha evaluado el agente de Reglas, con su resultado y su evidencia, y el razonamiento que le ha llevado a la decisión.

**Valor**

> Los avisos sencillos y bien documentados se aprueban sin que nadie tenga que tocarlos. Y si mañana alguien pregunta por qué se aprobó uno, la respuesta está aquí, regla por regla y con las palabras del propio cliente. El tramitador no tiene que fiarse de una caja negra: puede comprobar cada regla en segundos.

**Norma y por qué importa**

- **AI Act art. 13 · Transparencia.** Quien usa el sistema tiene que poder interpretar sus resultados. Obligatorio para alto riesgo; aquí, buena práctica. **Riesgo:** un tramitador que no entiende la propuesta la firma o la descarta a ciegas, y en los dos casos el error llega al cliente.
- **RGPD art. 15 · Derecho de acceso.** El cliente puede pedir información significativa sobre la lógica de una decisión automatizada que le afecta. **Riesgo:** si no se puede explicar, reclamación ante la AEPD; las multas del RGPD llegan a 20 M€ o al 4 % de la facturación mundial.

**Clics**

1. Arriba de la ficha: las tres cifras (Decisión, Ramo, Confianza 95 %).
2. Pestaña **Mensaje**: las evidencias resaltadas y numeradas en el texto. Pasar el ratón por una: el título «Evidencias» cambia a su tipo (por ejemplo «Fecha del hecho»). Abrir **Leyenda**.
3. Pestaña **Datos extraídos**: los 10 campos (cliente, póliza, tipo, fecha, 1.350 €, lugar, terceros sí, lesionados no, documentación: parte amistoso, presupuesto y fotos).
4. Pestaña **Reglas de negocio**: A1 a A8, todas en «cumple» o «no aplica», cada una con su evidencia.
5. Pestaña **Razonamiento**: ramo, decisión, siguiente paso recomendado y cronología.

**Si preguntan:** ¿quién escribe las reglas? Negocio. Están en el menú lateral, sección **Prompt**, y se editan sin programar (botón «Editar en grande»). La llamada al modelo usa siempre el texto vigente.

---

### Paso 4 · La ficha de un «A revisar»: MSG-A-08 (min 10-12)

**Pantalla:** `index.html` → ficha de MSG-A-08. Texto completo del mensaje en el paso 1.

**Frase clave:** «Cada decisión se puede explicar, también cuando la máquina no decide.»

**Resultado:** Auto · A revisar · confianza 0,90 · «Accidente de moto con lesionado ingresado y tercero implicado: gestión especializada de daños corporales y coordinación con la póliza de salud SA-662371.»

**Qué es y qué hace**

> Cuando un aviso pasa a revisión, la ficha nos dice qué regla ha incumplido y resalta las frases del mensaje que lo justifican. Si además salta un guardrail, por ejemplo porque hay un lesionado, el agente no puede decidir y el caso va directamente a una persona.
>
> Si un dato no aparece en el mensaje, el campo se queda vacío. El agente tiene la instrucción de no inventar nada.
>
> Y en la respuesta cruda podemos ver exactamente lo que ha recibido el modelo. Antes de enviarle el mensaje, la plataforma sustituye los nombres, las pólizas, las matrículas, los teléfonos y el resto de datos personales por marcadores. Lo que hace falta para decidir, como las lesiones o el diagnóstico, se mantiene. Cuando vuelve la respuesta, la plataforma recoloca los datos reales en la ficha, y la tabla de correspondencias solo existe en memoria mientras dura la llamada.

**Valor**

> El tramitador entiende el motivo en segundos y puede corregirlo si no está de acuerdo. Si el cliente pide explicaciones, la respuesta ya está preparada en la ficha. Y los daños personales siempre los valora una persona: en los últimos 14 días, el guardrail de lesionados explica el 20 % de los escalados.
>
> Además, el modelo decide sin saber quién es el asegurado. La minimización de datos deja de ser una política escrita en un documento y pasa a ser lo que el modelo recibe de verdad.

**Norma y por qué importa**

- **RGPD art. 22 · Decisiones automatizadas.** Nadie puede quedar sujeto a una decisión basada solo en un tratamiento automatizado que le afecte de forma significativa sin poder obtener intervención humana. **Riesgo:** una decisión desfavorable tomada solo por la máquina es impugnable y sancionable.
- **RGPD art. 5.1.c · Minimización.** Solo se tratan los datos necesarios para la finalidad. **Riesgo:** enviar nombres, DNI o teléfonos a un proveedor externo sin necesidad multiplica el impacto de una brecha.
- **RGPD art. 9 · Datos de salud.** Son categoría especial y necesitan una base jurídica específica. **Riesgo:** es la infracción que más pesa en una sanción y la que más daña la reputación.

**Clics**

1. Pestaña **Mensaje**: evidencias resaltadas («ingresado», «fractura de clavícula y dos costillas», «atestado», el Opel Astra del tercero).
2. Pestaña **Reglas de negocio**: **A5 · Terceros documentados y sin lesionados** en «incumple», con su evidencia.
3. Pestaña **Datos extraídos**: `importe_estimado_eur` vacío. Señalarlo.
4. Pestaña **Razonamiento**: por qué es Auto y no Salud (el hecho causante es el accidente de tráfico).
5. Pestaña **Respuesta cruda** → vista **Enviado al modelo**: los marcadores [PERSONA_1], [POLIZA_AU_1], [MATRICULA_1], [TELEFONO_1] en lugar de los datos reales. La fractura y la diabetes siguen ahí.

**Si preguntan:** ¿seudonimizar es anonimizar? No. La traza conserva la relación con la persona, y por eso sigue siendo un dato personal (RGPD art. 4.5). Lo explica el Termómetro de cumplimiento (paso 15).

---

### Paso 5 · La respuesta cruda de MSG-A-12 (min 12-14)

**Pantalla:** `index.html` → ficha de MSG-A-12 → pestaña **Respuesta cruda**.

**Frase clave:** «El modelo no se certifica a sí mismo: es la plataforma la que deja la prueba en cada decisión.»

| MSG-A-12 · WhatsApp · «Hijo en urgencias tras caída con patinete» |
|---|
| «Buenas, estoy ahora mismo en urgencias pediátricas del Hospital Universitario HM Sanchinarro con mi hijo Mateo Ruiz Ibarra (8 años), se ha caído del patinete en el parque de Valdebebas y se ha hecho daño en el brazo izquierdo, no lo puede mover y llora mucho 😢 Le van a hacer una radiografía del brazo 🙏 El pediatra dice que puede ser una fractura de muñeca. Está en la póliza familiar SA-518877, la titular soy yo. He enseñado su tarjeta sanitaria. Nadie más ha tenido que ver, se cayó él solo. Lo comunico por si tengo que hacer algo más. Gracias!» |
| **Resultado:** Salud · Aprobado · confianza 0,94 · prestación directa en hospital del cuadro médico |

**Qué es y qué hace**

> En la respuesta cruda vemos lo que ha devuelto el modelo y, debajo, un bloque de gobierno que añade la plataforma. Este bloque no lo genera el modelo: lo calcula la plataforma con reglas fijas, y se puede recalcular en cualquier momento.
>
> El bloque recoge qué datos personales hay en el mensaje, de qué tipo son, por ejemplo datos de salud o de menores, y si se han usado para decidir. Explica por qué el aviso es de un ramo y por qué no es de los otros dos. Y añade un sello SHA-256 encadenado con la decisión anterior, junto con el plazo durante el que hay que conservar la traza.

**Valor**

> Los datos de salud y los de menores tienen una protección reforzada. Con este bloque, cada respuesta dice qué datos sensibles había, cómo se han tratado y si se han usado para decidir. Para el DPO es evidencia decisión a decisión, y no una declaración genérica.
>
> Y si alguien altera un registro, la cadena de hashes se rompe y se ve al momento. Lo vamos a comprobar en el panel.

**Norma y por qué importa**

- **RGPD art. 9 y protección de menores (art. 8 y considerando 38).** Los datos de salud son categoría especial y los de menores merecen protección específica. **Riesgo:** tratarlos sin saber que están ahí impide aplicar las garantías que exige la ley; es el caso típico de sanción agravada.
- **AI Act art. 19 y LCS art. 23 · Conservación.** Los registros se guardan al menos seis meses, y el expediente mientras pueden reclamar: dos años en daños y cinco en personas. **Riesgo:** borrar antes deja a la aseguradora sin prueba en un pleito; guardar de más incumple el principio de limitación del plazo.

**Clics**

1. **Respuesta cruda** con **+ Gobierno** activado: el bloque `_gobernanza`, marcado como «añadido por la plataforma, no generado por el modelo».
2. Bloque teja `datos_personales`: el menor (8 años) y los datos de salud en rojo, cada uno con su categoría y si se usó para decidir.
3. Bloque verde `explicabilidad`: por qué Salud y **por qué no Auto ni Hogar** («el patinete no activa Auto: no es un vehículo asegurado ni hay tercero»; «descartado Hogar: la caída es en un parque»).
4. Bloque azul `trazabilidad`: traza, modelo, versión de prompt y hash SHA-256 encadenado.
5. Bloque ocre `retencion`: 6 meses la traza; 5 años el expediente de personas.
6. Bloque violeta `supervision_humana`. Pasar el ratón por una norma para ver qué exige.
7. **Transición:** cabecera → **Gobierno de Agentes**. En el panel, **Fuente → Sesión actual**, para que las trazas sean las del lote que acabamos de procesar.

---

## 4. Parte 2 · Gobierno

### 4.0 Entrada al panel (min 14-15)

**Pantalla:** `gobierno.html` → **Inicio**. Recorrer los seis bloques de arriba abajo, sin entrar en ninguno.

**Frase clave:** «Seis preguntas para gobernar a nuestros agentes.»

> Ahora pasamos al panel de quien gobierna los agentes. Está organizado en trece secciones que responden a seis preguntas: qué está pasando, cuánto decide la máquina y cuánto una persona, si hay indicios de fraude, si los agentes deciden bien y con buen conocimiento, si cumplimos y cuánto nos cuesta, y qué tenemos que corregir. Cada ficha de esta portada nos da la cifra del día y su estado. Vamos a entrar en cada sección con los mensajes del lote que acabamos de procesar.

| Bloque | Pregunta | Secciones | Pasos |
|---|---|---|---|
| Operación | ¿Qué está pasando? | Resumen · Agentes · Trazabilidad | 6-8 |
| Control | ¿Cuánto decide la máquina y cuánto una persona? | Autonomía · Guardrails · Intervención humana | 9-11 |
| Riesgo | ¿Hay indicios de fraude? | Fraude | 12 |
| Calidad | ¿Deciden bien y con buen conocimiento? | Razonamiento y replay · Knowledge Bases | 13-14 |
| Cumplimiento y coste | ¿Cumplimos y cuánto cuesta? | Cumplimiento · FinOps | 15-16 |
| Mejora y auditoría | ¿Qué hay que corregir y qué ha cambiado? | Medidas correctivas · Histórico | 17-18 |

---

### Paso 6 · Resumen (min 15-17)

**Pantalla:** Inicio → **Ver el Resumen**. Bloque **Operación**.

**Frase clave:** «Control total del sistema y capacidad de pararlo al instante.»

**Protagonista:** el lote entero y la traza de MSG-A-08.

**Para qué sirve esta sección**

> El Resumen nos ofrece en una sola pantalla los indicadores del periodo, el estado de cada agente, el coste frente al presupuesto y las alertas de todas las fuentes. Lo que buscamos es que Dirección sepa en diez segundos si el sistema va bien, sin tener que pedir un informe a nadie.

**Qué es y qué hace**

> Los indicadores de arriba nos dan la autonomía efectiva, es decir, cuántas decisiones salen sin intervención humana; cuántas corrigen los tramitadores; cuánto llevamos gastado frente al tope; y qué alertas hay abiertas, ya sean de coste, de fraude, de conocimiento o de cumplimiento. Al abrir el indicador de alertas las vemos ordenadas por origen, cada una con un enlace a su sección.
>
> Debajo, cada agente tiene su tarjeta con su estado, su modelo, su latencia y lo que ha gastado hoy frente a su presupuesto. Y cada tarjeta tiene un interruptor de parada, el kill switch, que detiene el agente con un solo clic.

**Valor**

> Ahora mismo tenemos un 81 % de autonomía y un 2,1 % de decisiones corregidas, por debajo del objetivo del 3 %.
>
> Y si un agente empieza a comportarse mal, lo paramos al momento. Sus mensajes se quedan en cola hasta que lo reanudamos, no se pierde ninguno, y la parada queda registrada con el nombre de quien la hizo.

**Norma y por qué importa**

- **AI Act art. 14 · Supervisión humana.** El sistema debe permitir que una persona lo vigile, entienda sus resultados y lo detenga con un botón de parada. **Riesgo:** sin parada, un fallo del modelo se repite en cientos de decisiones antes de que alguien lo vea.
- **EIOPA.** Pide al consejo y a la dirección información periódica sobre los sistemas de IA. **Riesgo:** una dirección que no ve el sistema no puede responder por él ante el supervisor.

**Clics**

1. Los 8 KPI: 16.720 mensajes en 14 días, autonomía efectiva 81 %, escalados 19 %, overrides 2,1 %, coste del periodo, 11 alertas, cumplimiento 87 % y 5 de 9 knowledge bases sanas.
2. Clic en el KPI **Alertas activas**: la ventana con las 11 alertas por severidad y por origen (coste 3, fraude 3, knowledge bases 3, cumplimiento 2) y la lista agrupada por origen. En el grupo **Fraude**: MSG-A-13 escalado a la SIU (clic: abre la ficha del caso), los 3 pagos retenidos por 2.080 € y CAP-09 en aviso. Cerrar.
3. Las tarjetas de los cuatro agentes: Reglas en **Degradado (gpt-5-mini)** y 13,70 € de un tope diario de 12 €.
4. Gráfico **Coste diario frente al cap**: botón **Ampliar** (ventana con el detalle por día).
5. **Alertas activas** de la tarjeta, ordenadas por severidad: la del CAP-03, la de MSG-A-13 en la SIU y la de KB-06 (red de talleres).
6. **Últimas trazas** → clic en la de MSG-A-08: la ficha explicada (qué llegó, qué hizo cada agente, decisión, coste). Botón **Cumplimiento** dentro de la ficha. Cerrar.
7. **Kill switch** de Extracción de datos: se oscurece la tarjeta. Volver a activarlo.

---

### Paso 7 · Agentes: el agente de Reglas (min 17-18:30)

**Pantalla:** menú → **Agentes** → pestaña **Reglas de negocio**. Bloque **Operación**.

**Frase clave:** «Cada agente tiene su identidad, su responsable y solo los permisos que necesita.»

**Protagonista:** el agente de Reglas, el que decide sobre MSG-A-01, MSG-A-04 y MSG-A-08.

**Para qué sirve esta sección**

> La sección de Agentes nos da la ficha completa de cada agente: qué hace, qué modelo usa, cuántos tokens gasta, cuánto tarda, cuánto cuesta, cómo rinde según el modelo que tenga y qué conocimiento consulta.
>
> Tener los agentes controlados es fundamental, porque son nuestros trabajadores autónomos. Tenemos que saber qué problemas tienen para poder ayudarles, con qué conocimiento están trabajando para mantenerlo actualizado y si son rentables, para tomar decisiones con datos y no perder dinero.

**Qué es y qué hace**

> Cada agente tiene una identidad propia, igual que un empleado, con un responsable y unos permisos mínimos: está definido qué puede hacer y qué no puede hacer. En la ficha vemos su configuración y sus umbrales, los guardrails y los topes que lo limitan, su coste y sus tokens de los últimos días, y una tabla con su comportamiento según el modelo que ha ido usando: precisión, escalados, correcciones, coste por mensaje y latencia.
>
> También vemos un índice de calidad, las bases de conocimiento que consume y, para los perfiles más técnicos, su contrato de entrada y salida.

**Valor**

> Con esta ficha decidimos con números qué modelo usar en cada agente. Hoy, por ejemplo, el agente de Reglas concentra el 80 % del gasto y tiene dos bases de conocimiento con problemas. Ahí es donde tenemos que poner el foco.

**Norma y por qué importa**

- **DORA art. 9 · Protección y prevención.** Exige gestionar los accesos con el mínimo privilegio necesario. DORA aplica a las aseguradoras desde enero de 2025. **Riesgo:** un agente con más permisos de los que necesita puede ordenar un pago o borrar un expediente si falla o si lo atacan.
- **RGPD art. 25 · Protección de datos desde el diseño.** Cada componente solo accede a los datos que necesita. **Riesgo:** un agente que ve más datos de los necesarios es un incumplimiento aunque no haya brecha.

**Clics**

1. La cadena arriba: Multicanalidad → Clasificación → Extracción → Reglas, con lo que se pasan (texto normalizado → ramo e indicios → 10 campos).
2. Cabecera de Reglas: Degradado, L2, responsable «Dirección de Siniestros · Comité IA», gpt-5, prompt v2.3, latencia p50/p95, 13,70 € / 12 €.
3. **Identidad y permisos**: puede consultar la póliza en solo lectura y proponer; no puede ordenar pagos, rechazar un siniestro ni modificar el expediente.
4. **Configuración y variables**: confianza mínima 0,85, importes máximos, reasoning effort «medium», objetivo de override 3 %.
5. **Rendimiento y coste**: 172,65 € en 14 días; la tabla **Comportamiento según el modelo** (gpt-5 al 98,9 % de acierto a 0,011 € por mensaje; gpt-5-mini degradado al 97,6 % a 0,002 €).
6. **Calidad**: el círculo del 98 %, acierto 13/13, confianza media 0,93, 9,77 evidencias verificadas por decisión.
7. **Knowledge Bases que consume**: KB-02 degradada y KB-06 crítica (se verán en el paso 14).
8. Opcional para perfiles técnicos: **Contrato de entrada y salida** con el ejemplo real.

---

### Paso 8 · Trazabilidad (min 18:30-19:30)

**Pantalla:** menú → **Trazabilidad**. Bloque **Operación**.

**Frase clave:** «Mensaje a mensaje: qué ha pasado, quién lo ha decidido y cuánto ha costado.»

**Protagonistas:** MSG-A-08 (TRZ-4F31) y MSG-A-10 (TRZ-4F33).

| MSG-A-10 · Email · «Urgencias por crisis de asma» |
|---|
| «Anoche, hacia las 23:00, tuve una crisis de asma bastante fuerte (soy asmática desde niña y estoy en tratamiento con inhalador) y fui a urgencias del Hospital Universitario Quirónsalud Madrid, en Pozuelo, que está en el cuadro médico. […] Me pusieron nebulizaciones y corticoides […] y me dieron el alta de madrugada […]. No tuve que pagar nada. Póliza SA-337700 […].» |
| **Resultado:** Salud · Aprobado · incidencia: error 429 del proveedor de IA, resuelto con un reintento a los 2 s |

**Para qué sirve esta sección**

> La sección de Trazabilidad nos permite seguir cada mensaje paso a paso: qué agente ha hecho qué, cuánto ha tardado, con qué modelo y cuánto ha costado. Nos sirve para reconstruir cualquier decisión a partir del registro, ya sea ante una reclamación o ante una auditoría.

**Qué es y qué hace**

> Cada mensaje genera una traza. La cascada nos enseña cada paso de cada agente con su duración, su modelo y sus tokens de entrada, de salida y de razonamiento. Si la traza ha superado algún tope de coste, ha disparado un guardrail o ha tenido una incidencia, como un error del proveedor con su reintento, aparece marcado aquí mismo. Y la lista se puede filtrar por agente, canal, decisión o resultado.

**Valor**

> Ante una reclamación, la decisión se reconstruye sin tener que preguntar a nadie qué pasó, y la aseguradora puede demostrar cómo decidió.
>
> Además, los fallos del proveedor de IA no llegan al cliente: el sistema los reintenta y los registra, y así podemos hablar con el proveedor con datos encima de la mesa.

**Norma y por qué importa**

- **RGPD art. 5.2 · Responsabilidad proactiva.** No basta con cumplir: la aseguradora tiene que poder demostrarlo. **Riesgo:** la carga de la prueba es suya; sin registro, ante la AEPD o un juez no tiene cómo probar que decidió bien.
- **DORA art. 11 · Respuesta y recuperación.** Los servicios críticos deben seguir funcionando ante fallos de terceros. **Riesgo:** depender de un único proveedor de IA sin reintentos ni alternativa convierte su caída en la caída del servicio de siniestros.

**Clics**

1. Clic en la traza de MSG-A-08: el panel fijo de arriba muestra la cascada de pasos por agente con duración, modelo y tokens. 12,4 s, 28.038 tokens y 0,062 €, frente a unos 4.300 tokens y 0,010 € del resto. Incidencias CAP-04 y CAP-05.
2. Clic en la traza de MSG-A-10: la incidencia «429 · reintento 1 (2 s)».
3. Filtros: **Resultado → Con intervención humana** (quedan MSG-A-04, MSG-A-08 y MSG-A-13). Quitar el filtro.
4. Botón **Ver razonamiento** en MSG-A-08 (lleva al paso 13; volver con el menú).

---

### Paso 9 · Autonomía (min 19:30-20:30)

**Pantalla:** menú → **Autonomía**. Bloque **Control**.

**Frase clave:** «Una autonomía graduada y con límites claros.»

**Protagonista:** el agente de Reglas.

**Para qué sirve esta sección**

> La sección de Autonomía nos muestra en qué nivel está cada agente, de L0 a L3, y guarda la auditoría de cada cambio de nivel. Lo que buscamos es que la libertad de cada agente vaya en proporción al riesgo de lo que decide y a su historial, y que nada suba de nivel sin datos que lo respalden.

**Qué es y qué hace**

> En L0 el agente solo sugiere. En L1 propone y una persona confirma cada caso. En L2 decide dentro de los guardrails y todo lo demás lo escala a una persona. Y en L3 decide y ejecuta, y se audita después.
>
> Cada subida o bajada de nivel queda registrada con su motivo, con los datos que la justifican y con el nombre de quien la aprobó. Uno de los criterios es la tasa de correcciones: si los tramitadores corrigen más del 3 % de las decisiones de un agente, ese agente baja de nivel.

**Valor**

> Es lo mismo que haríamos con un tramitador nuevo: le damos más autonomía cuando demuestra criterio y se la quitamos cuando falla. En la demo, el agente de Reglas llegó a L3 y volvió a L2 la semana en que las correcciones llegaron al 4,1 %. Y cada cambio tiene detrás a alguien que lo firma.

**Norma y por qué importa**

- **AI Act art. 14 · Supervisión humana proporcional al riesgo.** El grado de control humano debe ajustarse al riesgo y a la autonomía del sistema. **Riesgo:** dar autonomía total a un agente sin historial convierte sus errores en decisiones firmes.
- **RGPD art. 22.** Más autonomía significa más decisiones automatizadas. **Riesgo:** subir de nivel un agente que toma decisiones desfavorables sin revisión humana entra de lleno en la prohibición del artículo.

**Clics**

1. KPI: 81 % de decisiones autónomas (objetivo ≥ 80 %), tasa de override 2,1 %, precisión 99,1 % frente a lo esperado.
2. **Niveles** L0 a L3, de rojo a verde: Multicanalidad y Clasificación en L3; Extracción y Reglas en L2.
3. **Cambios de nivel (auditoría)** → clic en la fila «Reglas de negocio · L3 → L2»: el registro completo (override del 4,1 % en la semana, aprobado por M. Ortega). Navegar con ‹ › a «Clasificación · L2 → L3» (precisión del 99,2 % sobre 4.800 mensajes).

---

### Paso 10 · Guardrails (min 20:30-22)

**Pantalla:** menú → **Guardrails**. Bloque **Control**.

**Frase clave:** «Las reglas de la aseguradora siempre mandan sobre el modelo.»

**Protagonistas:** G-04 con MSG-A-08 y G-02.

**Para qué sirve esta sección**

> La sección de Guardrails reúne las condiciones que impiden que un agente decida solo, y nos dice cuántas veces ha saltado cada una. Nos sirve para garantizar que las reglas de la aseguradora mandan siempre sobre lo que diga el modelo.

**Qué es y qué hace**

> Un guardrail es una condición que se comprueba antes de ejecutar una decisión: una confianza por debajo del umbral, un importe por encima del límite del ramo, un lesionado, un ramo que no se puede determinar o un indicio de fraude. Cuando salta, la decisión no se ejecuta: pasa a una persona, se cambia a un modelo más barato o se marca la traza, según el caso.
>
> Cada guardrail tiene su ficha, sus disparos por día y un interruptor para activarlo o desactivarlo.

**Valor**

> El guardrail de importe, por ejemplo, ha saltado 118 veces en 14 días y explica el 62 % de los escalados. Si mañana negocio quiere subir el límite de Auto, sabe exactamente a cuántos casos afecta.
>
> Y cualquier guardrail que se activa o se desactiva queda en el Histórico con el nombre de quien lo ha hecho.

**Norma y por qué importa**

- **AI Act art. 9 · Gestión de riesgos.** Hay que identificar los riesgos del sistema y poner medidas para reducirlos durante toda su vida. **Riesgo:** un modelo sin límites puede aprobar un siniestro de 20.000 € o un daño corporal con la misma soltura que una luna de 280 €.

**Clics**

1. KPI: 11 de 12 activos, 454 disparos en 14 días, el más disparado (G-02).
2. Tabla G-01 a G-12. Pasar el ratón por las minibarras de disparos por día.
3. Clic en **G-04 · Lesionados = sí**: la ficha con su descripción y los últimos disparos. En la lista de disparos, el de MSG-A-08 enlazado a su traza.
4. Clic en **G-02 · Importe**: 118 disparos, 62 % de los escalados.
5. Interruptor de **G-09** (inactivo): explicar por qué está apagado (confianza media de la transcripción 0,91).
6. Opcional: **Nuevo guardrail** (ventana con el formulario). Cerrar sin guardar.

---

### Paso 11 · Intervención humana: MSG-A-04 (min 22-24)

**Pantalla:** menú → **Intervención humana**. Bloque **Control**.

**Frase clave:** «Una aprobación de 10 segundos es solo una firma: por eso medimos si la revisión es real.»

| MSG-A-04 · Email · «Daños en el coche en un parking» |
|---|
| «Hola, el jueves 10, sobre las 14:00, mi hijo Pablo (tiene 22 años) cogió mi coche, el Peugeot 308 3318 LMB de la póliza AU-119045, para ir a la universidad y al salir del parking subterráneo de la Facultad de Económicas de la Complutense rozó una columna. Tiene la puerta trasera derecha y la aleta bastante hundidas y el piloto trasero roto. No hay otro vehículo implicado, así que no hicimos parte, y él está bien. Pablo tiene el carné desde hace 3 años; no sé si lo incluimos en la póliza cuando la renovamos, la llevaba mi mujer. El taller de confianza, Talleres Ruiz de Alcorcón, dice que son unos 2.200 € y que puede tenerlo en una semana. Quiero que me digáis a qué taller lo llevo o si puedo ir al mío. Mi teléfono es el 677 019 334. Un saludo, Antonio Navarro Blanco.» |
| **Resultado del agente:** Auto · A revisar · regla A3 (conductor no declarado). **Revisión humana:** L. Prieto comprueba que Pablo sí está declarado y cambia la decisión a Aprobado en 38 minutos (override) |

**Para qué sirve esta sección**

> La sección de Intervención humana nos enseña la cola de todo lo que escalan los agentes, quién lo revisa, cuánto tarda y cuántas decisiones acaba cambiando. Nos sirve para demostrar que la revisión humana es real y que nadie se limita a firmar sin mirar.

**Qué es y qué hace**

> Cada traza que se escala entra en una cola con su motivo, su estado y la persona que la revisa. Cuando un tramitador cambia la decisión del agente, eso es un override, y queda registrado con su motivo.
>
> El panel también mide cómo se revisa: cuánto tarda cada tramitador, qué porcentaje de aprobaciones se firma en menos de 30 segundos y qué tramitadores tienen la formación en IA.

**Valor**

> La cola demuestra que una persona ha tomado la decisión, con su nombre y su hora. En la demo, el 3,3 % de las aprobaciones se firma en menos de 30 segundos y tres tramitadores pasan del máximo del 5 %. Dos de ellos aún no tienen la formación en IA, y eso ya es una medida abierta.
>
> Además, cada override alimenta la autonomía: si los tramitadores corrigen más del 3 %, el agente baja de nivel.

**Norma y por qué importa**

- **RGPD art. 22 y sentencia SCHUFA del TJUE (C-634/21, 2023).** Una decisión desfavorable necesita intervención humana real, y el Tribunal dijo que una persona que se limita a validar lo que propone la máquina no cuenta. **Riesgo:** una revisión de 10 segundos convierte el caso, a efectos legales, en decisión automatizada.
- **AI Act art. 4 · Alfabetización en IA.** Quien trabaja con sistemas de IA debe tener formación suficiente. En vigor desde febrero de 2025 para todas las organizaciones, sea cual sea el riesgo del sistema. **Riesgo:** un revisor sin formación no puede detectar el error del agente.

**Clics**

1. KPI: 3.180 escalados (19 %), override 2,1 %, 2 pendientes de revisión, revisiones exprés 3,3 %, supervisión humana efectiva «Cubierto».
2. **Mecanismos de supervisión**: escalado, override y nivel, kill switch, control normativo.
3. **Cola de revisión**: las tres trazas del lote. Clic en MSG-A-04: la ficha de la traza con el override de L. Prieto y su motivo. Navegar con › a MSG-A-08 y MSG-A-13 (pendientes).
4. **Escalados**: el anillo de causas (G-02 62 %, G-04 20 %, G-05 11 %).
5. **Calidad de la revisión**: tiempos por tramos, el 3,3 % de aprobaciones en menos de 30 segundos y la tabla por tramitador con su formación en IA.
6. **Medidas**: clic en M-10 (formación de los tramitadores).

---

### Paso 12 · Fraude: MSG-A-13, MSG-A-09 y MSG-A-02 (min 24-26)

**Pantalla:** menú → **Fraude**. Bloque **Riesgo**.

**Frase clave:** «El indicio no acusa: prioriza, y la decisión la toma una persona.»

| MSG-A-13 · WhatsApp · «Nos han entrado en casa» |
|---|
| «Hola, nos han entrado en casa estos días que hemos estado fuera 😡 Hemos llegado esta mañana y está todo revuelto, los cajones por el suelo. Se han llevado cosas, todavía no sé cuánto, estamos mirando; creo que faltan joyas de mi mujer y un portátil, pero no estoy seguro. Las joyas valdrán unos 5.000 €, eran heredadas y no tenemos facturas. No sé por dónde han entrado, la puerta parece bien, no está forzada. El seguro lo contratamos hace solo tres semanas, al mudarnos. Todavía no hemos ido a la policía, no sé si hace falta. Luego os mando una lista. Póliza HO-604118. Necesito que venga alguien hoy, por favor, mi mujer está muy nerviosa. Llamadme al 655 330 219.» |
| **Resultado:** Hogar · A revisar (H4 y H7 incumplen) · score antifraude 90 · escenario EF-01 · cola de la SIU (G-10) |

| MSG-A-09 · Formulario web · «Cristal de ventana roto» (extracto) |
|---|
| «Los niños del vecino del 2.º C han roto con un balón el cristal de la ventana del salón […]. El cristalero, Cristalería Vallecas, me pasa 400 € con la instalación […]. Para el pago, la cuenta es ES91 2100 0418 4502 0005 1332.» |
| **Resultado:** Hogar · Aprobado · score 50 · vigilancia · EF-02: la misma cuenta aparece en MSG-A-02 y en un siniestro anterior de otro titular · pago de 400 € retenido (G-11) |

MSG-A-02 (rotura de tubería, 1.080 €) pide el pago a esa misma cuenta: score 35, sin indicios, pero G-11 retiene el pago. MSG-A-11 (rayón en el parking, paso 1): score 50, vigilancia, rayón previo en el mismo parking.

**Para qué sirve esta sección**

> La sección de Fraude puntúa cada mensaje según los patrones de fraude que la compañía ya tiene identificados y envía los casos de más riesgo a la Unidad de Investigación de Siniestros. Lo que buscamos es frenar el pago dudoso sin bloquear al cliente que no ha hecho nada.

**Qué es y qué hace**

> Para detectar esos patrones, la plataforma combina tres fuentes: lo que entiende la IA del relato del cliente, con las citas literales del mensaje; el histórico de pólizas, siniestros y proveedores; y reglas deterministas. Con todo eso, cada mensaje recibe una puntuación de 0 a 100. Por debajo de 40 solo se registra. Entre 40 y 69 se tramita, pero el pago queda retenido hasta verificar. Y a partir de 70 el caso va a la SIU.
>
> El histórico también puede restar: si un dato desmiente el indicio, ese contraindicio baja la puntuación. Cada caso tiene su ficha con el desglose por indicador, el mapa de relaciones con otros siniestros y el seguimiento.

**Valor**

> Ningún siniestro se rechaza de forma automática y el cliente nunca ve el indicio; si un texto dirigido a él lo menciona, un guardrail lo bloquea. Los casos de riesgo llegan a la SIU con la ficha ya preparada.
>
> En la demo hay 2.080 € retenidos y un tope que vigila ese dinero para no perjudicar a clientes legítimos. Y el 76 % de falsos positivos nos recuerda por qué un indicador por sí solo nunca decide.

**Norma y por qué importa**

- **RGPD considerando 47 · Prevención del fraude.** Reconoce la prevención del fraude como interés legítimo para tratar datos, siempre que sea necesario y proporcionado. **Riesgo:** sin una base jurídica documentada (el panel la tiene pendiente del DPO, medida M-19), el tratamiento del histórico es atacable.
- **RGPD art. 22.** Un score no puede rechazar un siniestro por sí solo. **Riesgo:** un falso positivo que bloquea un pago sin revisión humana es una decisión automatizada ilícita y un cliente perdido. Y si un canal recibe más alertas que otro, como WhatsApp, hay riesgo de trato discriminatorio (medida M-18).

**Clics**

1. Los tres niveles: sin indicios (0-39), vigilancia (40-69), SIU (≥ 70).
2. KPI: 13 analizados, 3 con indicios, 2.080 € retenidos en 3 pagos, 80 escalados a la SIU en 14 días, 21 % confirmados, 76 % de falsos positivos.
3. **Casos del lote** → clic en MSG-A-13: la ficha del caso. Desglose del score por indicador (póliza de 21 días, relato vago, sin denuncia ni fuerza, prisa, joyas de 5.000 € sin factura), el mensaje con las citas resaltadas y el seguimiento.
4. Navegar con › a MSG-A-09: la cuenta compartida. Y a MSG-A-04: el **contraindicio** (Pablo está declarado) que baja su score a 30.
5. **Escenarios de fraude** EF-01 a EF-08: abrir EF-02.
6. **Mapa de relaciones**: MSG-A-09 y MSG-A-02 unidos por la misma cuenta con un expediente de agosto de otro titular.
7. **Catálogo de indicadores** → **Nuevo indicador**: la vista previa enseña qué mensajes del lote lo activarían. Cerrar sin guardar.
8. **Equidad por canal**: WhatsApp recibe 1,8 veces más alertas por el tono (medida M-18).

**Si preguntan:** ¿cómo se añade un patrón nuevo? Desde el catálogo, con «Nuevo indicador»: nombre, peso y frases que lo activan, con vista previa sobre el lote antes de guardarlo.

---

### Paso 13 · Razonamiento y replay (min 26-27:30)

**Pantalla:** menú → **Razonamiento y replay**. Bloque **Calidad**.

**Frase clave:** «Auditamos lo que ha pasado y probamos antes de cambiar nada.»

**Protagonistas:** MSG-A-08 (razonamiento) y MSG-A-04 (replay RP-0006).

**Para qué sirve esta sección**

> La sección de Razonamiento y replay nos enseña cómo ha llegado cada agente a su resultado, y nos permite repetir una traza real con otro modelo o con otra versión del prompt. Nos sirve para probar cualquier cambio con casos reales antes de que llegue al cliente.

**Qué es y qué hace**

> El razonamiento se muestra agente por agente: qué ha recibido, qué frases del mensaje ha usado como evidencia y qué ha entregado. Ojo, porque no es la cadena de pensamiento interna del modelo: es el registro estructurado que devuelve cada agente, con sus citas.
>
> El replay repite una traza real de dos formas. En modo idéntico comprueba que el resultado se puede reproducir. En modo what-if cambia el modelo o la versión del prompt y nos enseña la diferencia en la decisión, el coste y la latencia.

**Valor**

> Cualquier cambio de modelo se prueba con casos reales antes de pasarlo a producción. En la demo, pasar el agente de Reglas a gpt-5-mini mantuvo la decisión con un 82 % menos de coste; en cambio, gpt-5-nano convirtió un aprobado en un a revisar. El replay lo detecta antes que el cliente.
>
> Y cuando llega el auditor y pregunta por qué se tomó una decisión, la respuesta está aquí.

**Norma y por qué importa**

- **AI Act art. 15 · Precisión y solidez.** El sistema debe mantener un nivel de precisión adecuado durante toda su vida, también tras cambios. Buena práctica en este caso. **Riesgo:** un cambio de modelo para ahorrar que empeora las decisiones en silencio, sin que nadie lo detecte hasta que llegan las reclamaciones.
- **RGPD art. 15.** El cliente puede pedir la lógica de la decisión. **Riesgo:** sin razonamiento registrado, la explicación se improvisa y no coincide con lo que pasó.

**Clics**

1. En la lista, clic en MSG-A-08. A la derecha, la cadena de agentes y el mensaje con las citas que usó cada agente, en el color de cada uno.
2. Por agente: confianza por ramo (Auto frente a Salud), origen de cada campo extraído (literal, normalizado, deducido o nulo), matriz de reglas con el camino a la decisión y los tokens frente al CAP-05.
3. Arrastrar el separador central para ampliar el razonamiento.
4. **Replay** → modo **Idéntico** → ejecutar: misma decisión.
5. Modo **What-if** → **Modelo de Reglas: gpt-5-mini** → ejecutar: el diff de ramo, decisión, coste y latencia.
6. **Histórico de replays**: RP-0006 (MSG-A-04 con gpt-5-mini: misma decisión, −82 % de coste) y RP-0005 (gpt-5-nano cambió un Aprobado por A revisar).

---

### Paso 14 · Knowledge Bases (min 27:30-29)

**Pantalla:** menú → **Knowledge Bases**. Bloque **Calidad**.

**Frase clave:** «El conocimiento también se degrada, y lo vigilamos igual que a los agentes.»

**Protagonistas:** KB-02 Condicionados Auto 2026, que consulta el agente de Reglas para avisos como MSG-A-01 y MSG-A-04, y KB-06 Red de talleres.

**Para qué sirve esta sección**

> La sección de Knowledge Bases nos permite medir la salud del conocimiento que consultan los agentes: los condicionados, el manual de tramitación, el cuadro médico o la red de talleres. Es importante porque, aunque el modelo sea muy bueno, si consulta un documento desactualizado va a decidir mal.

**Qué es y qué hace**

> Cada base de conocimiento se evalúa de forma continua contra una rúbrica, con métricas como el recall o las consultas que se quedan sin respuesta, y cada métrica tiene su umbral. La ficha nos enseña su configuración, de dónde se alimenta y cada cuánto se sincroniza, sus versiones y una comparativa que evalúa distintas configuraciones del mismo contenido para elegir la mejor antes de aplicarla.

**Valor**

> Con un condicionado antiguo, el agente puede aplicar una franquicia o una exclusión que ya no existe. En la demo, la base de Condicionados Auto ha perdido 6 puntos de recall porque se colaron 340 documentos de 2024, y añadir un filtro de vigencia lo sube de 0,81 a 0,88.
>
> Además, el cambio se mide antes de publicarlo: el reindexado solo pasa a producción si la rúbrica no empeora.

**Norma y por qué importa**

- **AI Act art. 10 · Datos y gobernanza de datos.** Los datos con los que trabaja el sistema deben ser pertinentes, actuales y estar controlados. Buena práctica en este caso. **Riesgo:** decisiones con un condicionado derogado, que la aseguradora tendría que rectificar y compensar.
- **RGPD art. 17 · Derecho de supresión.** Si un cliente pide que se borren sus datos, hay que borrarlos también de los índices de búsqueda. **Riesgo:** el manual de tramitación tiene tres fragmentos con datos de clientes reales; si no se suprimen del índice, el borrado es incompleto.

**Clics**

1. KPI: 9 bases (1 real, 8 simuladas), 5 sanas, recall medio 0,86, 3,27 % de consultas sin respuesta, 6 rúbricas con acuerdo juez-humano de 0,93.
2. Clic en **KB-02 · Condicionados Auto 2026** (degradada): pestaña **Salud**, cada métrica frente a su umbral; el recall cae 6 puntos.
3. Pestaña **Fuente y sincronización**: los 340 documentos del condicionado 2024 que entraron por una carpeta mal filtrada.
4. Pestaña **Comparativa**: cuatro configuraciones evaluadas con la rúbrica R-02; con filtro de vigencia el recall sube de 0,81 a 0,88. **Aplicar**.
5. Pestaña **Versiones**: «Volver a esta versión».
6. Navegar con › a **KB-06 · Red de talleres** (crítica): la API responde 401 y 14 talleres dados de baja siguen como concertados.
7. **Rúbricas** → editar una: los pesos deben sumar 100 y se guarda una versión nueva. Cerrar sin guardar.

---

### Paso 15 · Cumplimiento: el termómetro (min 29-30:30)

**Pantalla:** menú → **Cumplimiento**. Bloque **Cumplimiento y coste**.

**Frase clave:** «La solución deja a la aseguradora en condiciones de demostrar que cumple.»

**Protagonista:** MSG-A-12 en el inventario de datos personales.

**Para qué sirve esta sección**

> La sección de Cumplimiento nos ofrece un termómetro normativo que nos permite entender en qué nivel de cumplimiento estamos respecto al AI Act, el RGPD, DORA, EIOPA y Solvencia II, y que se calcula a partir de todas las trazas que produce el sistema. Nos sirve para saber cuánto podemos demostrar hoy y qué nos falta.

**Qué es y qué hace**

> Los controles se agrupan por norma. Algunos se miden directamente en las trazas, como que cada decisión tenga su registro completo. Otros se declaran con su evidencia documental, como el plan de salida de un proveedor. Una matriz nos dice, artículo por artículo, qué exige la norma, cómo lo resuelve la solución y qué trazas lo respaldan.
>
> También tenemos el inventario de datos personales de cada mensaje y la cadena de integridad del registro: si alguien modifica una traza ya sellada, la cadena se rompe a partir de ese punto y el termómetro se pone en rojo.

**Valor**

> La cobertura nos dice cuánto podemos demostrar hoy; en la demo, un 87 %. Los controles en ámbar son la lista de trabajo, y son reales, como la evaluación de impacto pendiente o el aviso de IA que falta en WhatsApp. El panel no maquilla nada.
>
> Un registro manipulado se detecta en el momento, y por eso un auditor puede fiarse del histórico. No es un certificado, pero sí es la evidencia que necesita el DPO, recalculada con cada traza.

**Norma y por qué importa**

- **RGPD art. 35 · Evaluación de impacto (EIPD).** Obligatoria cuando se tratan datos de salud a gran escala con tecnología nueva. **Riesgo:** tratar sin EIPD actualizada es infracción por sí misma, aunque no haya ningún incidente.
- **AI Act art. 50 · Transparencia con el cliente.** Quien habla con una IA debe saberlo. **Riesgo:** en WhatsApp el aviso está pendiente; un cliente que no sabía que le atendía una IA puede reclamar.
- **Integridad del registro (AI Act art. 12, RGPD art. 32).** **Riesgo:** un registro que se puede alterar sin dejar rastro no vale como prueba.

**Clics**

1. Cabecera: 87 % de cobertura, 26 controles cubiertos y 9 parciales, 14 medidos en las trazas y 21 declarados.
2. Los cuatro termómetros: RIA 86 %, RGPD 87 %, DORA 100 %, EIOPA y Solvencia II 80 %. Clic en uno para filtrar la matriz.
3. **Matriz norma → control**: filtro **Solo parciales**. Señalar la EIPD (RGPD art. 35) y el aviso de IA en WhatsApp (AI Act art. 50).
4. **Ciclo de vida de una traza**: los ocho pasos con su norma y su plazo.
5. **Inventario de datos personales** → clic en MSG-A-12: el texto con los datos resaltados y su bloque `_gobernanza`.
6. **Integridad del registro** → **Simular una alteración**: la cadena se rompe y el termómetro se pone en rojo. Deshacer.
7. **Exportar evidencias de cumplimiento** (opcional).

**Si preguntan:** ¿el triaje es alto riesgo según el AI Act? No. El Anexo III solo incluye la tarificación y la evaluación de riesgos en Vida y Salud. Aplicamos los artículos 9 a 15 como buena práctica.

---

### Paso 16 · FinOps (min 30:30-32)

**Pantalla:** menú → **FinOps**. Bloque **Cumplimiento y coste**.

**Frase clave:** «Lo que no queremos es el modelo más barato; queremos el modelo más barato que nos dé la máxima calidad.»

**Protagonistas:** el agente de Reglas y la traza de MSG-A-08.

**Para qué sirve esta sección**

> La sección de FinOps nos permite controlar el gasto al segundo y en base a acciones. Los proveedores de servicios de IA empresarial nos dicen cuánto hemos gastado cada 8 horas, y en ese tiempo pueden pasar muchas cosas: nos podemos levantar por la mañana con un gasto que no queríamos. Aquí vemos cuánto gastamos por agente, por modelo y por tipo de token en el momento, y los topes actúan solos en cuanto se superan.

**Qué es y qué hace**

> Cada decisión suma su coste en el momento en que se produce, porque la traza registra los tokens de cada agente y la plataforma los multiplica por el precio de su modelo. Sobre ese coste trabajan los topes: por agente, globales, por mensaje y de tokens de razonamiento. Cada tope lleva asociada una acción. Cuando se supera uno, la alerta nos explica qué ha pasado, qué ha hecho el sistema de forma automática, por ejemplo pasar a un modelo más barato hasta medianoche sin parar el servicio, y qué acción nos sugiere.
>
> El gasto se desglosa por tipo de token para entender de dónde viene. Y una tabla cruza el coste y la calidad de cada modelo: cuánto cuesta y con qué frecuencia devuelve una respuesta válida, sin reintentos y estable en replay.

**Valor**

> No esperamos 8 horas a que el proveedor nos diga lo que ha pasado: el tope actúa en el mismo mensaje que lo supera. En la demo, el agente de Reglas pasó su tope y el sistema cambió de modelo solo, sin parar el servicio. El gasto del mes va por 296 € de 500 €, con una proyección de 428 €, y no hay sorpresas en la factura.
>
> Y sabemos exactamente dónde actuar: el agente de Reglas se lleva el 80 % del gasto y, dentro de él, lo que más pesa es el texto que genera gpt-5. Las recomendaciones nos dicen cuánto ahorra cada palanca.

**Norma y por qué importa**

- **Solvencia II art. 41 · Sistema de gobierno.** La aseguradora debe tener una gestión sana y prudente de su actividad, con control de sus riesgos operativos. **Riesgo:** un gasto de IA que crece sin control es un riesgo operativo no gestionado, y el supervisor lo puede señalar en su revisión del sistema de gobierno.

**Clics**

1. KPI: coste de hoy 17,33 € (87 % del tope diario de 20 €), coste mensual 296,40 € de 500 € con proyección de 428 €, 3 topes superados, 0,0128 € por mensaje. Clic en **Coste mensual**: la ventana con el detalle.
2. **Cómo va el gasto de cada agente**: la fila de Reglas en rojo (13,70 € / 12 €, 80 % del total).
3. **Dónde se va el dinero y por qué**: en Reglas, la salida de gpt-5 es el 63 % de su coste. Botón **€ / %**.
4. **Alertas de coste**: CAP-03 (qué hizo solo: degradar a gpt-5-mini hasta las 00:00) y CAP-04/CAP-05 en MSG-A-08.
5. **Caps configurados** → clic en **CAP-03**: la ficha con los agentes implicados y el histórico de superaciones. **Nuevo cap** (opcional, cerrar sin guardar).
6. **Modelos**: precio, llamadas, tokens, coste, p95 y calidad (JSON válido, sin reintento, estable en replay, precisión). Clic en la leyenda de un gráfico para ocultar una serie.
7. **Recomendaciones**: R-01 a R-04.

---

### Paso 17 · Medidas correctivas (min 32-33:30)

**Pantalla:** menú → **Medidas correctivas**. Bloque **Mejora y auditoría**.

**Frase clave:** «El coste bajo control y cada problema con su dueño.»

**Protagonistas:** M-01 (sale del replay de MSG-A-04), M-02 (sale de la traza de MSG-A-08) y M-10.

**Para qué sirve esta sección**

> La sección de Medidas correctivas junta en una sola lista los problemas que detecta el resto del panel, cada uno con sus alternativas, su ahorro y quién tiene que aprobarlas. Lo que buscamos es que cada problema tenga un dueño, una alternativa y una verificación.

**Qué es y qué hace**

> La lista cubre coste, conocimiento, cumplimiento, calidad y resiliencia. Cada problema viene de otra sección del panel y trae varias alternativas, con la recomendada marcada: su impacto, su efecto secundario, el esfuerzo, quién la aprueba y cómo se valida antes de aplicarla.
>
> Desde aquí podemos simular una alternativa, aplicarla o pedir aprobación, y deshacerla si hace falta. Al verificar una medida, el termómetro de cumplimiento se actualiza solo.

**Valor**

> Cada ahorro se apoya en evidencia. En la demo, la medida que lleva gpt-5-mini a los casos sencillos se valida con un replay que no cambió ninguna decisión, y al aplicarla el ahorro conseguido sube 237 € al mes.
>
> Lo que necesita aprobación espera al Comité de IA, y todo queda registrado.

**Norma y por qué importa**

- **AI Act art. 9 · Gestión de riesgos continua.** Los riesgos detectados deben tener medidas y seguimiento. **Riesgo:** un problema detectado y sin dueño pesa más en una inspección que uno desconocido, porque demuestra que se sabía.
- **RGPD art. 5.2.** **Riesgo:** sin registro de qué se corrigió y quién lo aprobó, no se puede demostrar diligencia.

**Clics**

1. KPI: 19 medidas abiertas (2 críticas), **ahorro conseguido 0 €/mes de 278 € posibles**, 9 riesgos normativos, 4 knowledge bases por sanear. El círculo del termómetro arriba a la derecha.
2. Filtros: **Coste** y **Victorias rápidas**. Quitar.
3. Tarjeta **M-01 · Reglas supera su cap diario**: tres alternativas, la recomendada «Usar gpt-5-mini en despeje directo» (−237 €/mes, se valida con el replay RP-0006). Clic en la tarjeta: la ficha con las alternativas lado a lado.
4. **Simular** → **Aplicar**: el ahorro conseguido sube a 237 €/mes.
5. **M-02 · Coste y razonamiento en MSG-A-08** → **Solicitar aprobación**: queda «Pendiente del Comité IA» (41 € pendientes).
6. **Deshacer** en M-01: el ahorro vuelve a cero. Volver a aplicarla.
7. Clic en el círculo del termómetro (lleva a Cumplimiento) o en M-10 (formación de tramitadores).

---

### Paso 18 · Histórico (min 33:30-34)

**Pantalla:** menú → **Histórico**. Bloque **Mejora y auditoría**.

**Frase clave:** «Este es el libro de registro que pide el regulador, y se rellena solo.»

**Para qué sirve esta sección**

> El Histórico es la línea de tiempo de todo lo que ha cambiado en el sistema, con su autor y su hora. Nos sirve como libro de registro para cualquier auditor, y no hay que rellenarlo a mano.

**Qué es y qué hace**

> Recoge cada acción con su usuario y su hora: agentes pausados, guardrails activados o desactivados, medidas aplicadas o deshechas, overrides, cambios de modelo, de prompt y de nivel, e incidentes. Se puede filtrar por tipo de evento.

**Valor**

> Un auditor puede ver cada cambio con su autor y su fecha, y nadie tiene que reconstruir qué pasó a partir de correos. Todo lo que hemos tocado durante esta demo ya está aquí.

**Norma y por qué importa**

- **RGPD art. 5.2 y AI Act art. 12.** Hay que poder demostrar quién cambió qué y cuándo. **Riesgo:** sin trazabilidad de los cambios, un error no se puede atribuir ni corregir de raíz, y la aseguradora no puede demostrar que actuó con diligencia.

**Clics**

1. La línea de tiempo: arriba, lo que se ha hecho en la demo con el usuario «Operador (esta sesión)»: el kill switch de Extracción, M-01 aplicada y deshecha, M-02 pendiente, la configuración aplicada en KB-02.
2. Chips de tipo: **Operaciones**, **Políticas**, **Overrides** (el de L. Prieto en MSG-A-04), **Despliegues** (cambios de modelo y de prompt), **Incidentes** (la ráfaga de errores 429).

---

## 5. Cierre (min 34-35)

**Pantalla:** `gobierno.html` → **Histórico**.

**Frase clave:** «Lo que hace que la IA llegue a producción y se quede es el gobierno.»

> Hemos visto entrar 13 avisos por cinco canales distintos. 10 se han aprobado solos y 3 han pasado a una persona, cada uno con su motivo y con la frase del cliente que lo justifica. Hemos visto también un caso que va a la SIU y tres pagos retenidos sin bloquear a nadie.
>
> Y alrededor de todo eso, el gobierno: agentes con su nivel de autonomía, sus permisos y su responsable; guardrails que hacen que las reglas de la aseguradora manden sobre el modelo; un presupuesto que se controla cada día; y una traza por decisión que nos permite demostrar cómo se ha decidido.
>
> La IA para clasificar mensajes ya la tenéis a vuestro alcance. Lo que hace que llegue a producción y se quede es esto.
>
> Y no es una idea sobre el papel: es lo que Logicalis está implantando en clientes de distintas industrias, adaptado a los procesos, a las reglas y a la normativa de cada uno.

---

## Anexo A · Los 13 mensajes del Paquete A

| Mensaje | Canal | Asunto | Ramo | Decisión | Motivo | Fraude | Paso |
|---|---|---|---|---|---|---|---|
| MSG-A-01 | Email | Golpe leve en la M-30 | Auto | Aprobado | Colisión leve con parte amistoso, sin heridos, 1.350 € | — | 3, 14 |
| MSG-A-02 | Web | Rotura de tubería bajo el fregadero | Hogar | Aprobado | Daño por agua súbito, 1.080 € | 35 · pago retenido (G-11) | 12 |
| MSG-A-03 | Chat | Urgencias por esguince | Salud | Aprobado | Urgencias en hospital del cuadro | — | — |
| MSG-A-04 | Email | Daños en el coche en un parking | Auto | A revisar → Aprobado (override) | A3: conductor no declarado; L. Prieto comprueba que sí lo está | 30 · contraindicio | 11, 12, 13 |
| MSG-A-05 | Web | Subida de tensión | Hogar | Aprobado | Daño eléctrico reconocido, 640 € | — | — |
| MSG-A-06 | Email | Radiografía y analítica prescritas | Salud | Aprobado | Pruebas básicas sin autorización previa | — | — |
| MSG-A-07 | Chat | Luna rota por gravilla | Auto | Aprobado | Luna en taller concertado, 280 € | — | — |
| MSG-A-08 | Teléfono | Accidente de moto con ingreso | Auto | A revisar | A5 y G-04: lesionado ingresado y tercero | — | 1, 4, 6, 8, 10, 13, 16, 17 |
| MSG-A-09 | Web | Cristal de ventana roto | Hogar | Aprobado | Cristal de 400 € con foto y presupuesto | 50 · vigilancia · cuenta compartida | 12 |
| MSG-A-10 | Email | Urgencias por crisis de asma | Salud | Aprobado | Urgencias en hospital del cuadro; error 429 con reintento | — | 8 |
| MSG-A-11 | WhatsApp | Rayón en la puerta en un parking | Auto | Aprobado | Vandalismo con denuncia, 600 € | 50 · vigilancia · rayón previo | 1, 12 |
| MSG-A-12 | WhatsApp | Hijo en urgencias tras caída con patinete | Salud | Aprobado | Urgencias pediátricas; datos de menor y de salud | — | 5, 15 |
| MSG-A-13 | WhatsApp | Nos han entrado en casa | Hogar | A revisar | H4 y H7: sin denuncia ni fuerza, joyas sin factura, póliza de 3 semanas | 90 · SIU (G-10) | 2, 11, 12 |

## Anexo B · Chuleta de cifras

| Tema | Cifra | Dónde se ve |
|---|---|---|
| Lote | 13 avisos · 10 aprobados · 3 a revisar | Triaje |
| Autonomía efectiva (14 días) | 81 % · 13.540 de 16.720 | Resumen, Autonomía |
| Escalados a persona | 19 % · 3.180 · G-02 62 %, G-04 20 %, G-05 11 % | Intervención humana |
| Override | 2,1 % · objetivo ≤ 3 % · Reglas bajó a L2 con 4,1 % | Autonomía |
| Revisiones exprés | 3,3 % en menos de 30 s · máximo 5 % | Intervención humana |
| Guardrails | 11 de 12 activos · 454 disparos · G-02 con 118 | Guardrails |
| Coste mensual | 296,40 € de 500 € · proyección 428 € | FinOps |
| Alertas activas | 11 · 3 críticas · coste 3, fraude 3, knowledge bases 3, cumplimiento 2 | Resumen |
| Agente de Reglas | 13,70 € de 12 € hoy · 80 % del gasto · 0,011 €/msg con gpt-5 | FinOps, Agentes |
| Traza más cara | MSG-A-08 · 0,062 € · 2.610 tokens de razonamiento | Trazabilidad |
| Replay RP-0006 | gpt-5-mini en Reglas · misma decisión · −82 % de coste | Razonamiento y replay |
| Ahorro M-01 | 237 €/mes (278 €/mes con M-02) | Medidas correctivas |
| Fraude | 3 con indicios · 1 en la SIU · 2.080 € retenidos · 76 % de falsos positivos | Fraude |
| Knowledge Bases | 5 de 9 sanas · KB-02 −6 puntos de recall · comparativa 0,81 → 0,88 | Knowledge Bases |
| Cumplimiento | 87 % · 26 cubiertos · 9 parciales · DORA 100 % | Cumplimiento |

## Anexo C · Matices para no pisar charcos

- **El triaje no es alto riesgo según el AI Act.** El Anexo III 5(c) cubre la tarificación y la evaluación de riesgos en Vida y Salud. Las obligaciones de alto riesgo se aplazaron al 2 de diciembre de 2027. El argumento de hoy es RGPD, DORA y EIOPA; el AI Act se aplica como buena práctica.
- **No decir «no existe nada en el mercado».** Hay herramientas de observabilidad de modelos y plataformas de GRC. Lo que no existe es el gobierno unido al proceso, las reglas y los costes de cada aseguradora: eso es implementación.
- **Cifras de mercado.** Verificadas: 11 M y uno cada 3 s (UNESPA), más del 90 % de aseguradoras probando IA (Conning), más del 40 % de proyectos agénticos cancelados (Gartner). El 10 % de la prima es un dato de EE. UU. Sin verificar y fuera del guion: el 4 % de agentes en producción y el 25-30 % de ahorro de McKinsey.
- **Datos de la demo.** Inventados y coherentes con el Paquete A. Los cambios hechos en el panel son simulados y se pierden al cerrar la pestaña.
- **Fraude.** Hablar siempre de «indicio» y de «patrón compatible». Nunca de «fraude» ni de «rechazo» al referirse a un caso concreto.

## Anexo D · Versión de 20 minutos

| Quitar o acortar | Ahorro |
|---|---|
| Intro: dejar 2.1, 2.2, 2.3 y una frase por idea de 2.5 | 2 min |
| Paso 3 (ficha de MSG-A-01): enseñar solo las evidencias desde el paso 4 | 1,5 min |
| Entrada al panel (4.0) y «Para qué sirve esta sección»: leer solo la primera frase | 1,5 min |
| Unir Autonomía y Guardrails (pasos 9 y 10) en 1,5 min | 1 min |
| Paso 14 (Knowledge Bases): solo la comparativa de KB-02 | 1 min |
| Paso 15 (Cumplimiento): solo «Simular una alteración» | 1 min |
| Paso 18 (Histórico) dentro del cierre | 0,5 min |
