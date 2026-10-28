# Evidencias y fraude

Dos módulos de lógica pura que no usan IA: `evidencias.js` comprueba en el texto las citas que da el modelo y `fraude.js` calcula un score antifraude cruzando el mensaje con el lote y con un histórico. Los dos exportan su API en `window` (`Evidencias`, `Fraude`) y en `module.exports` para los tests.

## Evidencias

El modelo cita y el navegador comprueba. Al modelo se le piden fragmentos literales, nunca posiciones: los LLM cuentan mal los caracteres, y una posición inventada resaltaría un trozo equivocado sin que nadie lo note. Una evidencia solo se resalta si su cita aparece en el mensaje.

### Flujo

```text
respuesta.evidencias ──► validar() ──► anclar() ──► ¿≥ 5 verificadas? ── no ──► + respaldo() anclado
                                                          │                        │
                                                          └──── sí ────────────────┤
                                                                                   ▼
                                                     resolver(): solapes, numeración ──► segmentos() ──► pintado
```

`Evidencias.construir(texto, evidenciasModelo, entry)` hace todo el recorrido y devuelve `{ lista, resumen }`. La usan la ficha del triaje y `Cumplimiento.gobernanza()`.

### `validar(evs)`

Descarta lo que no sea un array de objetos con `cita` de texto, citas de menos de 3 caracteres y duplicados `ref + cita`. Recorta la cita a 160 caracteres, la nota a 140 y `ref` a 40, y se queda con 12 como máximo. Un `ref` vacío pasa a `otro`.

### `localizar(texto, cita)`

1. Quita comillas y puntos suspensivos de los extremos de la cita.
2. Busca la cita exacta (`indexOf`). Si aparece: `tipo: 'exacta'`.
3. Si no, normaliza texto y cita: colapsa espacios y saltos de línea, unifica comillas tipográficas, guiones largos y «…», quita tildes (NFD) y pasa a minúsculas. `normalizar()` guarda, para cada carácter normalizado, su rango en el original, así que la posición se traduce de vuelta al texto real aunque haya emojis o caracteres de varias unidades UTF-16. Si aparece: `tipo: 'normalizada'`.
4. Si no aparece, `null`: la evidencia queda `verificada: false` («no localizada») y no se resalta.

Una paráfrasis o una cita inventada nunca se localiza. Lo cubren los tests con respuestas simuladas defectuosas.

### `resolver(lista)` y `segmentos()`

Si dos evidencias verificadas se solapan, gana la primera de la lista (las del modelo van antes que las de respaldo). Las resaltadas se numeran por orden de aparición en el texto y las no resaltadas van al final. `segmentos()` trocea el texto en `{ t, ev }` para pintarlo sin insertar HTML del modelo: el texto del cliente se escapa siempre, aunque traiga etiquetas o instrucciones.

### Respaldo

Si el modelo deja menos de 5 evidencias verificadas, o el prompt editado no las pide, `respaldo()` las reconstruye con lo que ya hay. Se marcan `origen: 'respaldo'` («reconstruida» en la ficha):

- citas entre comillas de `criterios_ramo` y de la evidencia de cada criterio;
- en el motor local, las palabras clave del ramo asignado;
- póliza, fecha del hecho (varios patrones de fecha), hasta 3 importes, lugar, hora, vehículo con marca, centro sanitario, lesión o «no hubo heridos» y hasta 3 documentos;
- para cada regla incumplida sin cita, un patrón por regla (`PATRON_REGLA`) cuando la decisión viene del motor local.

Cada candidata pasa también por `localizar()`, y solo se añade si está en el texto y no se solapa con una del modelo.

### Siguiente paso

`siguientePaso(entry)` no lo genera el modelo. Sale de la tabla fija `ACCIONES`, una fila por regla (A1–A8, H1–H9, S1–S8) con título, detalle y documentos que pedir:

- `DESPEJADO` → «Tramitar con normalidad».
- `Indeterminado` → «Asignar el ramo manualmente».
- Con reglas incumplidas → la acción de la primera y la unión de los documentos de todas.

`borradorSolicitud()` compone el mensaje al cliente con esa lista de documentos.

## Motor de indicadores de fraude

`Fraude.evaluar(entradas, opts)` recibe el lote completo, porque varios indicadores comparan mensajes entre sí. `opts` lleva el catálogo (`indicadores`, con pesos e interruptores), `escenarios`, `historico` y `niveles` de `FRAUDE_DEMO`.

El score decide quién mira el caso, no la decisión del triaje: un mensaje aprobado sigue aprobado aunque se retenga el pago, y nada de esto se comunica al cliente.

### Indicadores

| Id | Grupo | Peso | Cómo se detecta |
|---|---|---|---|
| IF-01 | Temporal | 25 | alta de la póliza en el histórico a menos de 30 días de la recepción, o el cliente dice que la contrató hace días o semanas |
| IF-02 | Temporal | 10 | recibido entre las 00:00 y las 06:00, o comunicado el día 6 o 7 del plazo |
| IF-03 | Relacional | 35 | el mismo IBAN aparece en mensajes o siniestros de pólizas distintas |
| IF-04 | Relacional | 20 | el mismo teléfono (últimos 9 dígitos) en pólizas distintas |
| IF-05 | Relacional | 15 | el mensaje nombra un proveedor con 3 o más casos marcados |
| IF-06 | Historial | 20 | siniestro previo de la misma póliza en los últimos 365 días, o «otra vez», «ya me pasó» |
| IF-07 | Relato | 15 | relato vago: «no estoy segura», «todavía no sé cuánto» |
| IF-08 | Relato | 20 | falta la prueba exigible: sin denuncia, puerta no forzada, sin testigos |
| IF-09 | Relato | 10 | urgencia o proveedor propio: «que venga alguien hoy», «mi taller de confianza» |
| IF-10 | Económico | 20 | bienes de alto valor sin justificar: joyas sin factura, heredadas |
| IF-11 | Conductor | 20 | «mi hijo X (19 años)» + «no sé si lo incluimos»; es contraindicio si X figura en `conductores` de la póliza |
| IF-12 | Canal | 30 | misma póliza en dos mensajes del lote con importes distintos |

Los indicadores de relato guardan cada cita con su posición. Los que crea el usuario en el panel («Nuevo indicador») se activan con frases literales, por palabra completa y sin distinguir mayúsculas, solo en los ramos elegidos.

### Score y nivel

```text
aplicado  = peso si el indicador está activo y no es contraindicio; si no, 0
score     = min(100, Σ aplicado)
nivel     = SIU (≥ 70) · vigilancia (≥ 40) · sin indicios
pago      = no_aplica si la decisión no es DESPEJADO
            retenido  si nivel ≠ sin, o si IF-03 aplica (G-11)
            libre     en otro caso
escenario = el de más indicadores disparados en común (≥ 2, o su indicador clave);
            a igualdad, el de mayor proporción cubierta
```

`resumen(evals)` da las cifras de los KPI: analizados, con indicios, vigilancia, SIU, retenidos e importe retenido. `paraGobernanza(ev)` reduce el resultado a `{ score, nivel, indicadores: ['IF-03+35', …], contraindicios }`, sin citas ni la cuenta, para el bloque `_gobernanza.antifraude`.

`ACUSATORIO` es la expresión que comprueba el guardrail G-12: ningún texto al cliente puede contener «fraude», «sospecha», «SIU», «indicio» o «investigación».

### Resultado con el Paquete A

Con los resultados guardados:

| Mensaje | Indicadores aplicados | Score | Nivel | Pago | Escenario |
|---|---|---|---|---|---|
| MSG-A-13 | IF-01 25 · IF-08 20 · IF-10 20 · IF-07 15 · IF-09 10 | 90 | SIU | no aplica (REVISION) | EF-01 robo sin fuerza en póliza recién contratada |
| MSG-A-09 | IF-03 35 · IF-05 15 | 50 | vigilancia | retenido | EF-02 cuenta de cobro compartida |
| MSG-A-11 | IF-06 20 · IF-08 20 · IF-09 10 | 50 | vigilancia | retenido | EF-03 vandalismo recurrente |
| MSG-A-02 | IF-03 35 | 35 | sin indicios | retenido por IF-03 (G-11) | EF-02 |
| MSG-A-04 | IF-06 20 · IF-09 10; IF-11 como contraindicio (el hijo consta declarado) | 30 | sin indicios | no aplica (REVISION) | EF-04 |

La decisión del triaje sigue siendo 10 aprobados y 3 a revisar. Los paquetes B y C no tienen casos de vigilancia ni de SIU. Todo esto lo fija `tests/fraude.test.js`.

### Dónde se usa

- **Triaje** (`app.js · fraudeDe()`): evalúa todo el registro de la sesión con `FRAUDE_DEMO`, pinta el chip en la lista y el bloque «Indicadores de fraude» en la pestaña de reglas, y añade `antifraude` al `_gobernanza` de cada entrada.
- **Panel** (`gobierno.js · evaluarFraude()`): evalúa el lote de la fuente activa con el catálogo modificado en la sesión y alimenta la sección Fraude, el mapa de relaciones, la cola de la SIU y los caps antifraude CAP-08…CAP-11.

El histórico de pólizas, siniestros y proveedores es ficticio (5 pólizas, 4 siniestros). En producción vendría del sistema de pólizas y siniestros y, para los cruces sectoriales, del fichero común del sector.
