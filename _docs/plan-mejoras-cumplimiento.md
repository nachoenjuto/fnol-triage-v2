# Plan: mejoras de la ficha, observabilidad y capa de cumplimiento normativo

> Estado (08/10/2026): **ejecutado**, salvo la fase 5 (Knowledge bases: replanteada en [plan-knowledge-bases.md](plan-knowledge-bases.md), pendiente de revisión) y la 4.4 (seudonimizar antes del modelo: pendiente).
> Decisiones confirmadas: «grupo 13» = Paquete A · menú lateral con fondo claro · «Termómetro de cumplimiento» en español · controles en ámbar a la vista.
> Cambio sobre la propuesta: al pasar el ratón o hacer clic en una evidencia solo cambia el título; la leyenda se abre únicamente desde su botón.

## Orden de trabajo

| Fase | Qué | Esfuerzo | Ficheros principales |
|---|---|---|---|
| 1 | Ajustes rápidos de la ficha y del menú de `index.html` | S | `styles.css`, `index.html`, `app.js`, `icons.js` |
| 2 | Menú lateral colapsable en observabilidad | S-M | `gobierno.html`, `gobierno.js`, `gobierno.css`, `header.css` |
| 3 | Paquete A ampliado y más evidencias, coherente en las dos páginas | M | `data/mensajes.js`, `data/resultados.js`, `data/gobierno.js`, `prompts.js`, `evidencias.js`, JSON de `data/`, tests |
| 4 | **Capa de cumplimiento**: motor común, «Respuesta cruda» y pestaña «Termómetro de cumplimiento» | L | nuevo `cumplimiento.js`, `app.js`, `gobierno.*`, tests |
| 5 | Pestaña «Knowledge bases» | M | `gobierno.*`, `data/gobierno.js` |
| 6 | Documentación y C4 | S | `_docs/arquitectura.md`, `_docs/guia-demo.md`, `README.md` |

Las fases 1 y 2 no dependen de nada. La 4 necesita la 3, porque los mensajes ampliados son los que traen los datos personales y de salud que la capa de cumplimiento tiene que detectar.

---

## Fase 1 · Ajustes rápidos (index.html)

### 1.1 Resaltado de evidencias más oscuro, con texto blanco
- `mark.ev` pasa de un fondo al 16 % con subrayado a un **fondo sólido `var(--ec)` con texto `#fff`**. Los cinco colores actuales en modo claro (`#6b4c7a`, `#276749`, `#8a5a2b`, `#4a5578`, `#9f2d2d`) superan el contraste 4.5:1 con blanco.
- En modo oscuro esas variables son tonos claros (`#6fbf96`…) y el texto blanco no se leería. Creo los tokens `--ev-ramo-solid`, `--ev-dato-solid`… con tonos medios oscuros para ese modo.
- El número `sup` va en blanco. El estado activo (`.is-on`) deja de oscurecer el fondo y muestra un anillo (`outline 2px` del color + `offset`).
- Las mismas fichas de color se aplican en la lista de evidencias (`.ev-num` sólido) y en la leyenda.

### 1.2 Pasos numerados en el menú de fases
- Lucide **no tiene** iconos de «número dentro de un círculo» (tiene `circle-dot`, `dice-1…6`, etc., pero no dígitos). Lo compruebo en lucide.dev antes de empezar. Si se confirma, creo los glifos `step-1 … step-6` en `icons.js` con la misma geometría Lucide (viewBox 24, círculo r=10). Serían un **círculo relleno del color de la cabecera (`--header`, #1b2a4a) con el número en blanco**.
- Quito los iconos actuales (`messages-square`, `tags`…) de los seis botones `.phase` y mantengo los chevrons entre pasos.
- Estado activo/hover: el círculo cambia a `--primary`.

### 1.3 Leyenda junto al título «Evidencias»
- La fila del título queda así: `Evidencias ……………… [Leyenda ⓘ]`, con el botón alineado a la derecha.
- **Popover** (no `<dialog>` modal, para no bloquear la ficha): se abre al pasar el ratón o con el foco del botón, se fija con clic y se cierra con Esc o al hacer clic fuera. Recoge los 5 tipos actuales y las etiquetas verificada / reconstruida / no localizada, que ahora están al pie.
- Al pasar el ratón o seleccionar una evidencia (en el texto o en la lista):
  - el título «Evidencias» se sustituye por la ficha del tipo activo, por ejemplo `● Fecha del hecho` con su color, y vuelve a «Evidencias» al salir;
  - si la evidencia queda **seleccionada** (clic), el popover se abre con ese tipo resaltado. Con hover solo cambia el título, para que el popover no tape el texto en cada pasada.
- Se elimina la sección `.ev-pie` del pie de la ficha.

---

## Fase 2 · Observabilidad: menú lateral colapsable

- La barra `.tabs` horizontal se convierte en un **menú vertical a la izquierda**, con los mismos elementos y el mismo orden (Resumen, Trazabilidad, Reasoning & Replay, Autonomía, Guardrails, FinOps, Histórico, y las nuevas Knowledge bases y Termómetro de cumplimiento).
- El conmutador es el mismo de `index.html` (`sidebar-rail` con `panel-left-close / panel-left-open`), con el mismo estilo de tarjeta.
- **Colapsado:** carril de unos 56 px con solo los iconos. Cada icono muestra su nombre en un tooltip (y en `aria-label`). La insignia numérica de FinOps pasa a ser un punto rojo sobre el icono.
- El estado plegado/desplegado se recuerda en `localStorage`, envuelto en try/catch (es una preferencia del usuario).
- En móvil (< 760 px) el menú pasa a cajón superpuesto.

**Color de fondo: recomiendo el mismo que `index.html` (superficie clara `--surface`), no el azul de la cabecera.** Motivos:
1. Coherencia: en las dos páginas, la barra lateral es la misma pieza.
2. Una cabecera azul más un lateral azul forman una «L» oscura que pesa mucho y resta protagonismo a los datos. Es un panel de observabilidad y las gráficas tienen que mandar.
3. Lo activo se marca con una barra de 3 px y el texto en `--primary`, igual que hoy el subrayado de las pestañas, con un fondo `--bg`.

---

## Fase 3 · Paquete A ampliado y más evidencias

### 3.1 Textos
Reescribo los 13 mensajes con **2-3 veces más texto** y con datos realistas, todos ficticios, que den pie a más evidencias y a la capa de cumplimiento:
- hora, lugar exacto, matrícula, modelo de vehículo, testigos, nº de atestado o denuncia, documentación adjunta, centro sanitario y médico;
- **datos personales a propósito**: DNI/NIE, teléfono, email, dirección, IBAN para un reembolso, nº de tarjeta sanitaria;
- **datos de categoría especial**: diagnóstico, prueba médica, medicación (Salud y lesionados en Auto);
- **menores y terceros**: el hijo de A-04 y de A-12, la esposa que llama en A-08 y el vecino de A-09.

**Se mantienen**: ramo, decisión, reglas incumplidas, importes y `esperado` de cada mensaje. Así los KPI, las trazas, el override de A-04, las alertas CAP-04/05 de A-08 y el guardrail G-05 de A-13 siguen teniendo sentido. A-13 sigue siendo vago (le falta información a propósito), aunque algo más largo.

### 3.2 Motor de evidencias
- `prompts.js`: se pide al modelo **entre 5 y 12 evidencias** (hoy de 3 a 8), con al menos una por cada dato no nulo de `datos_extraidos` y por cada regla incumplida. `MAX_EVIDENCIAS` ya es 12.
- `evidencias.js` (respaldo sin IA): nuevos patrones para hora, matrícula, vehículo, centro sanitario, lesión o diagnóstico y testigos. El umbral para completar con el respaldo pasa de `< 3` a `< 5` evidencias verificadas.

### 3.3 Coherencia entre las dos páginas (importante)
Cuando cambian los textos, dejan de ser válidas las citas guardadas, los tamaños y los tokens. Hay que actualizar:
- `data/resultados.js`: `ev` (entre 6 y 10 citas literales por mensaje), `d`, `cr` y `c` de A-01…A-13.
- `data/gobierno.js`: en cada traza de A, el paso `multicanal` (caracteres, adjuntos), las entradas y pasos del razonamiento por agente, los **tokens de entrada** (escalados según la longitud nueva) y, a partir de ellos, el **coste**. Compruebo que CAP-04/05 siguen saltando en A-08 y en ninguna otra.
- `data/gobierno-paquete-A.json` y `data/triage-registro-paquete-A.json`: se regeneran desde los datos anteriores con un script, no a mano.
- `tests/evidencias.test.js`: todas las citas guardadas deben aparecer en el texto y cada mensaje de A debe tener al menos 6 evidencias resaltadas. Se ejecuta con `make test`.
- Opcional: si me pasas las variables `TRIAGE_*`, ejecuto `make test-ia` para medir las evidencias con el modelo real sobre los textos nuevos.

---

## Fase 4 · Capa de cumplimiento (núcleo de venta)

### 4.0 Principios
1. **El modelo no se autocertifica.** Los metadatos de cumplimiento los genera la plataforma de forma determinista: detección de PII, hash, versión, norma aplicable. No se le piden al LLM. Sale más barato, es reproducible en un replay y es auditable. Es la misma filosofía de las evidencias: «el modelo cita, el navegador comprueba».
2. **Una sola fuente de verdad.** Un módulo nuevo y puro, `cumplimiento.js` (como `evidencias.js`, sin DOM, con tests en Node), lo usan **las dos páginas**. `index.html` lo aplica a cada resultado y lo guarda en el registro de la sesión. `gobierno.html` lo lee del registro (fuente «Sesión») o lo recalcula a partir de `mensajes.js` y `resultados.js` (fuente «Demo»). Así los números de la ficha y del termómetro coinciden siempre.
3. **Rigor en los términos**, porque un comercial que dice «anonimizado» cuando el dato está seudonimizado comete un error de cumplimiento:
   - **Seudonimizado** (RGPD art. 4.5): el dato sigue siendo personal porque se puede reidentificar con una clave aparte. Es lo que corresponde a las trazas operativas, porque el siniestro hay que tramitarlo.
   - **Anonimizado** (considerando 26): irreversible y fuera del RGPD. Solo en exportaciones para analítica, entrenamiento o datasets de replay.
   - **RIA = AI Act**: son la misma norma, el Reglamento (UE) 2024/1689 (RIA es el nombre en español). En pantalla pondré «RIA (AI Act)» una sola vez y no las trataré como dos normas.
4. **Honestidad sobre el riesgo.** El triaje de siniestros **no es alto riesgo** según el Anexo III 5(c) del RIA, que cubre la tarificación y la evaluación de riesgos en seguros de vida y salud. Los controles de alto riesgo (arts. 9-15) se aplican como buena práctica, como ya dice el panel. Sí aplican ya el art. 4 (alfabetización en IA) y el art. 50 (transparencia si la IA habla con el cliente). El RGPD aplica íntegro.

### 4.1 Motor `cumplimiento.js`
`Cumplimiento.analizar(mensaje, resultado, evidencias) → _gobernanza`

- **Detector de datos personales** (regex + diccionarios, en español):
  | Categoría | Ejemplos | Base | Tratamiento en la traza |
  |---|---|---|---|
  | Identificativo | nombre, DNI/NIE | RGPD art. 4.1 | seudonimizado (`PER-7f3a`) |
  | Contacto | email, teléfono | art. 4.1 | enmascarado (`+34 655 *** 219`) |
  | Identificador indirecto | póliza, matrícula, tarjeta sanitaria | art. 4.1 | seudonimizado |
  | Localización | dirección | art. 4.1 | generalizada (municipio) |
  | Financiero | IBAN | art. 4.1 | enmascarado, nunca se envía al modelo |
  | **Salud (cat. especial)** | diagnóstico, prueba, medicación, ingreso | **art. 9** | cifrado de campo; acceso solo para el rol Salud |
  | **Menor** | «mi hijo Mateo (8 años)» | art. 8 / cons. 38 | protección reforzada |
  | Tercero no remitente | hijo, esposa, vecino | art. 14 | marca «interesado distinto del remitente» |
  | Infracciones | alcohol, atestado con sanción | art. 10 | acceso restringido |

  Cada hallazgo guarda su posición, igual que una evidencia. Eso permite pintarlo como capa opcional sobre el texto en la ficha («ver datos sensibles»).
- **Explicabilidad**: a partir de las evidencias **verificadas** y de los criterios, por qué se eligió ese ramo, qué **ramo alternativo se descartó y por qué**, y qué reglas decidieron.
- **Trazabilidad**: id de traza, modelo, versión del prompt, `sha256` de la entrada y de la salida del modelo (`crypto.subtle` en el navegador; deterministas en modo guardado), sello de tiempo y política de retención.
- **Supervisión humana**: si hace falta, el motivo (guardrail o regla) y el revisor u override, si lo hay.

### 4.2 «Respuesta cruda» con metadatos de gobierno
- La salida del modelo se muestra **tal cual**. Debajo va un bloque `"_gobernanza"` **añadido por la plataforma**, en otro color, con una nota de una línea: «Añadido por la plataforma, no generado por el modelo». Esta separación ya es una prueba de integridad.
- Resaltado sintáctico por tipo dentro del bloque: **PII / art. 9** en rojo-ámbar, **trazabilidad** en azul, **explicabilidad** en verde y las **normas** como chips de color. Al pasar el ratón por una norma sale el mismo tooltip que en el panel de gobierno (reutilizo `NORMA` y lo muevo a `cumplimiento.js` para que sea común).
- Un conmutador `Salida del modelo | + Gobierno`. «Copiar JSON» copia lo que se está viendo.

Ejemplo (MSG-A-12, menor en urgencias, ramo **Salud** y no Auto ni Hogar):

```json
"_gobernanza": {
  "esquema": "fnol-gobernanza/1.0",
  "generado_por": "plataforma (determinista, no el modelo)",
  "trazabilidad": {
    "traza_id": "TRZ-4F35", "timestamp": "2026-09-17T09:03:38Z",
    "modelo": "gpt-5", "prompt": "reglas v2.3", "region_proveedor": "UE",
    "hash_entrada": "sha256:9c1e…", "hash_salida": "sha256:41ab…",
    "retencion": { "traza_seudonimizada": "6 meses mín.", "expediente": "5 años (LCS art. 23, seguro de personas) + bloqueo LOPDGDD art. 32" },
    "normas": ["RIA art. 12", "RGPD art. 5.2"]
  },
  "datos_personales": [
    { "cita": "Nerea Ibarra Lago", "categoria": "identificativo", "tratamiento": "seudonimizado → PER-2b91", "normas": ["RGPD art. 4.1", "RGPD art. 25"] },
    { "cita": "mi hijo Mateo (8 años)", "categoria": "menor · tercero", "tratamiento": "protección reforzada; interesado distinto del remitente", "normas": ["RGPD art. 8", "RGPD art. 14"] },
    { "cita": "radiografía del brazo", "categoria": "salud (categoría especial)", "tratamiento": "cifrado de campo; acceso solo rol Salud", "base_juridica": "RGPD art. 9.2 + LOSSEAR art. 99 (a validar por el DPO)", "normas": ["RGPD art. 9"] }
  ],
  "explicabilidad": {
    "ramo": "Salud",
    "por_que": [
      { "evidencia": 2, "cita": "urgencias del Hospital Universitario HM Sanchinarro", "peso": "alto" },
      { "evidencia": 5, "cita": "póliza familiar SA-518877", "peso": "alto" }
    ],
    "descartados": [
      { "ramo": "Auto", "motivo": "Sin vehículo ni accidente de tráfico: no aplica S8" },
      { "ramo": "Hogar", "motivo": "La caída es en un parque, no en la vivienda asegurada" }
    ],
    "reglas_determinantes": ["S5", "S6"],
    "normas": ["RIA art. 13", "RGPD art. 13-15", "RGPD art. 22"]
  },
  "supervision_humana": { "requerida": false, "motivo": "Despeje directo L3 dentro de los guardrails", "normas": ["RIA art. 14", "RGPD art. 22"] }
}
```

### 4.3 Pestaña «Termómetro de cumplimiento»
Nombre: **«Termómetro de cumplimiento»**, en español como el resto de la interfaz. Si se prefiere en inglés, «Compliance Thermometer», con *th*.

**Enfoque:** no se presenta como un «certificado de cumplimiento», que ningún software puede dar. Es la **cobertura de controles con evidencia medible**, y cada cifra enlaza a las trazas que la respaldan. Abajo, una línea fija: «Indicador técnico de controles; no sustituye la evaluación del DPO ni de Cumplimiento». Esto vende más ante un comprador de seguros, que tiene equipos de Compliance y DPO muy exigentes.

Bloques, de arriba abajo:

1. **Termómetros por marco**: RIA (AI Act), RGPD + LOPDGDD, DORA y EIOPA/Solvencia II. Cada uno es una barra vertical con % de controles cubiertos y semáforo. **No estarán todos al 100 %**: habrá controles en ámbar, como «EIPD pendiente de revisión anual» o «Aviso art. 50 en WhatsApp sin configurar», porque un 100 % no resulta creíble y además genera conversación comercial.
2. **Matriz norma → control → evidencia**. Cada fila: artículo · qué exige · cómo lo resuelve la solución · medida en vivo · enlace a las trazas. Primera versión de filas:
   - RIA art. 12, registro de eventos: 13/13 trazas con spans, modelo, prompt y hash.
   - RIA art. 13 / RGPD art. 15, explicabilidad: % de decisiones con 5 o más evidencias verificadas y con un ramo descartado explicado.
   - RIA art. 14 / RGPD art. 22, supervisión humana: el 100 % de las decisiones desfavorables (REVISION) pasan por una persona; overrides registrados.
   - RIA art. 4, alfabetización: % de revisores formados (dato del panel).
   - RIA art. 50, transparencia al cliente en canales conversacionales.
   - RGPD art. 5.1.c, minimización: campos enviados al modelo frente a campos detectados.
   - RGPD art. 9, salud: X datos de salud detectados, el 100 % cifrados o con acceso restringido.
   - RGPD art. 25 / 32: seudonimización en trazas e IBAN nunca enviado al modelo.
   - RGPD art. 30 / 35: RAT y EIPD (estado documental).
   - RGPD art. 5.1.e / LOPDGDD art. 32: retención y bloqueo con fechas.
   - DORA art. 28: proveedor de IA en el registro de terceros TIC, región UE.
3. **Ciclo de vida de una traza** (diagrama en SVG): Ingesta → detección de PII → seudonimización → modelo (solo datos minimizados) → registro inmutable (hash encadenado) → retención → bloqueo → supresión o anonimización para analítica. En cada paso, su norma y su plazo.
4. **Inventario de datos sensibles** del periodo: tabla por mensaje con las categorías detectadas (iconos), el tratamiento aplicado y una muestra enmascarada. Un clic abre la ficha de la traza con los hallazgos resaltados.
5. **Expediente de auditoría**: botón «Exportar evidencias de cumplimiento» que descarga un JSON con los bloques `_gobernanza` de las trazas del periodo. Es **el mismo objeto** que se ve en «Respuesta cruda», y ahí se cierra la coherencia entre las dos páginas.

### 4.4 Opcional · seudonimizar antes de enviar al modelo
Sustituir nombre, DNI, teléfono e IBAN por tokens en el texto que se envía a la IA y reconstruir las citas al volver. Es privacidad desde el diseño real (art. 25) y muy vendible, pero obliga a reconciliar las citas con el texto original. Propongo hacerlo **después** de 4.1-4.3, como una fase aparte.

---

## Fase 5 · Pestaña «Knowledge bases» (seguros)

Inventario y gestión de las fuentes de conocimiento que consultan los agentes:

| KB | Agente que la usa | Ejemplo de uso |
|---|---|---|
| Reglas de negocio Auto/Hogar/Salud (bloques del prompt v2.3) | Reglas | **la única que la demo usa de verdad hoy** |
| Condicionados generales y particulares por producto | Reglas | coberturas y exclusiones |
| Cuadro médico concertado | Reglas (S5) | ¿el centro está en el cuadro? |
| Red de talleres y peritos concertados | Reglas (A7) | despeje directo |
| Baremo de tráfico (Ley 35/2015) | Reglas (A5) | daños corporales |
| LCS (Ley 50/1980) y normativa sectorial | Reglas | plazos (art. 16), prescripción |
| Plantillas de comunicación al cliente | Automatización | petición de documentación |

Por cada KB: versión, responsable, fecha de actualización, nº de documentos y fragmentos, estado de indexación, frescura frente a su SLA, modelo de embeddings y región, **clasificación de datos** (si contiene PII o no), consultas en 14 días y tasa de acierto, y los agentes que la consumen.
Acciones simuladas, como el resto del panel: reindexar, ver documentos, historial de versiones, pausar.
**Enlace con el cumplimiento:** cada traza registra qué versión de cada KB se usó. Sin eso no hay replay determinista ni gobierno de datos (RIA art. 10, art. 12). Esto alimenta una fila del termómetro.
Las KB que no sean la de reglas aparecen marcadas como «simulada en la demo», para no presentar un RAG que no existe.

---

## Fase 6 · Documentación
- `_docs/arquitectura.md`: actualizo el diagrama C4 de componentes (Mermaid) con `cumplimiento.js`, el flujo de `_gobernanza` y las KB.
- `_docs/guia-demo.md`: guion de cómo enseñar el termómetro y la respuesta cruda.
- `?v=18 → ?v=19` en `index.html` y versión en `gobierno.html` para no servir caché vieja.

---

## Decisiones que necesito que confirmes
1. ¿«Grupo 13» es el **Paquete A**?
2. ¿Te vale el **fondo claro** para el lateral de observabilidad?
3. Nombre de la pestaña: **«Termómetro de cumplimiento»** o «Compliance Thermometer».
4. ¿Hago ahora la **4.4** (seudonimizar antes del modelo) o la dejo para después?
5. ¿Te vale que el termómetro muestre a propósito **algunos controles en ámbar**?
