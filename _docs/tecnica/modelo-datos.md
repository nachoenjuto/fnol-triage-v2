# Modelo de datos

Todos los datos de la demo están en `data/` como scripts que declaran una constante global (`PAQUETES`, `RESULTADOS_GUARDADOS`, `GOBIERNO_DEMO`, `FRAUDE_DEMO`, `RECORRIDO_DEMO`). No hay base de datos ni API propia. Los dos JSON de `data/` son copias generadas de esas constantes para las funciones «Cargar JSON» y «Reproducir desde archivo».

| Fichero | Constante | Lo usa | Contenido |
|---|---|---|---|
| `data/mensajes.js` | `PAQUETES` | triaje, panel | 3 paquetes, 51 mensajes |
| `data/resultados.js` | `RESULTADOS_GUARDADOS`, `REGLA_DESC`, `TRAZA_DEMO`, `expandirResultadoGuardado()` | triaje, panel | una ficha de triaje por mensaje, en formato compacto |
| `data/gobierno.js` | `GOBIERNO_DEMO` | panel | dataset del panel: Paquete A + 14 días de histórico |
| `data/fraude.js` | `FRAUDE_DEMO` (y `GOBIERNO_DEMO.fraude`) | triaje, panel | catálogo antifraude, escenarios e histórico ficticio |
| `data/recorrido.js` | `RECORRIDO_DEMO` | las tres páginas | pasos del modo presentador, **generado** desde `_docs/guion-demo.md` |
| `data/gobierno-paquete-A.json` | — | panel, «Cargar JSON» | `GOBIERNO_DEMO` + `FRAUDE_DEMO`, generado con `make datos` |
| `data/triage-registro-paquete-A.json` | — | triaje, «Reproducir desde archivo» | 13 entradas del registro en formato «Exportar JSON», generado con `make datos` |
| `data/adjuntos/*.jpg` | — | triaje | dos fotos de los daños de MSG-A-01 |

Los datos personales de todos los ficheros son ficticios.

## Mensaje (`PAQUETES[].mensajes[]`)

```js
{
  id: 'MSG-A-01',                    // MSG-<paquete>-<nº>
  canal: 'email',                    // email | web | chat | telefono | whatsapp
  fecha_recepcion: '2026-09-14T09:12:00',
  remitente: { nombre: 'Marta Gil Sanz', contacto: 'marta.gil@correo.es' },
  asunto: 'Golpe leve en la M-30 - póliza AU-483920',
  texto: '…',                        // texto libre del cliente
  esperado: { ramo: 'Auto', revision: false },   // nunca se envía al modelo
  adjuntos: [ … ],                   // opcional; solo MSG-A-01 lo lleva
}
```

`esperado` sirve para pintar ✔/✖ en la columna Ramo y en la ficha. `app.js` lo copia al registro, pero `buildUserPrompt()` (`prompts.js`) no lo incluye en el prompt.

Cada paquete es `{ id, nombre, descripcion, mensajes }`. Reparto: A 13 mensajes (5 Auto, 4 Hogar, 4 Salud; 3 esperados a revisión), B 23 (8/8/7; 4), C 15 (5/5/5; 3).

### Adjuntos

```js
{ id: 'ADJ-1', archivo: 'parte-amistoso.pdf', tipo: 'declaracion_amistosa', mime: 'application/pdf',
  titulo: 'Declaración amistosa de accidente',
  contenido: { fecha, hora, localizacion, heridos, danos_otros, testigos,
               a: { tomador, direccion, telefono, marca, matricula, aseguradora, poliza, conductor, dni, permiso, choque, danos, observaciones },
               b: { … }, circunstancias_a: [8], circunstancias_b: [], croquis_via, croquis_sentido } }
{ id: 'ADJ-2', archivo: 'foto-danos-1.jpg', tipo: 'foto_danos', mime: 'image/jpeg', titulo: '…', src: 'data/adjuntos/foto-danos-1.jpg' }
```

El PDF no existe en el repositorio. `adjuntos.js` lo dibuja con pdf-lib a partir de `contenido`. Las circunstancias son índices (1–17) de la lista `CIRCUNSTANCIAS` del modelo oficial de declaración amistosa.

## Ficha guardada (`RESULTADOS_GUARDADOS[id]`)

Formato compacto para que el fichero ocupe menos. `expandirResultadoGuardado()` lo convierte al mismo esquema que devuelve el modelo (ver [integracion-ia.md](integracion-ia.md#contrato-de-salida)).

| Clave compacta | Campo expandido | Forma |
|---|---|---|
| `ramo` | `ramo` | `'Auto' \| 'Hogar' \| 'Salud'` |
| `cr` | `criterios_ramo` | `string[]` |
| `d` | `datos_extraidos` | objeto de 10 campos |
| `c` | `criterios` | `[regla, resultado, evidencia][]`; la descripción sale de `REGLA_DESC[regla]` |
| `ev` | `evidencias` | `[ref, cita, nota][]` |
| `dec` | `decision` | `'DESPEJADO' \| 'REVISION'` |
| `motivo` | `motivo` | `string` |
| `conf` | `confianza` | `0..1` |
| `tok` | `usage` | `[entrada, salida, razonamiento]` |
| `adj` | `adjuntos` | sin compactar: `[{ id, archivo, tipo, datos, contraste[] }]` |

`contraste[]` compara cada campo del adjunto con el texto del email: `{ campo, resultado: 'coincide' | 'no_consta' | 'discrepa', detalle, cita }`. La `cita` es literal del mensaje y lo comprueba `tests/adjuntos.test.js`.

`TRAZA_DEMO` asigna a cada mensaje del Paquete A su id de traza del panel (`MSG-A-01 → TRZ-4F2A` … `MSG-A-13 → TRZ-4F36`). Con el motor «Resultados guardados», la ficha del triaje y el panel muestran así la misma traza.

## Entrada del registro del triaje

`app.js · runBatch()` añade una entrada por mensaje procesado a `state.log` y la guarda en `sessionStorage['triage.log']`. Es el formato de «Exportar JSON» y el que lee «Reproducir desde archivo».

| Campo | Origen |
|---|---|
| `id`, `asunto`, `paquete` (`'A'…'C'` o `'archivo'`) | mensaje |
| `ramo`, `criterios_ramo`, `datos_extraidos`, `criterios`, `evidencias`, `decision`, `motivo`, `confianza` | salida del motor, ya validada |
| `importe` | `datos_extraidos.importe_estimado_eur` |
| `origen` | `'IA'`, `'IA (guardado)'`, `'IA (archivo)'`, `'reglas locales'` o `'reglas locales (fallback IA: …)'` |
| `pasos` | `[{ nombre, usage, duracion_ms }]`, uno por llamada; `null` en el motor local |
| `raw` | texto crudo del modelo (en 2 pasos, las dos respuestas concatenadas) |
| `usage` | `{ input, output, reasoning }` sumado |
| `seudonimizacion` | resumen del envío seudonimizado, sin la tabla de correspondencias |
| `adjuntos`, `adjuntos_origen` (`'modelo' \| 'guardado'`), `adjuntos_recibidos` (`[{ id, bytes, sha256 }]`) | adjuntos |
| `duracion_ms`, `timestamp` | medidos en el navegador |
| `esperado`, `mensaje` | copia del mensaje (en la exportación, solo `id, canal, asunto, texto, remitente, adjuntos`) |
| `gob_opts` | `{ traza_id, modelo, prompt }` con que se calcula `_gobernanza` |
| `gobernanza` | bloque `_gobernanza` (ver [cumplimiento.md](cumplimiento.md)) |
| `revision`, `revisado` | acción humana desde la ficha: `{ accion: 'override' \| 'validada', resultado, de, a, usuario, fecha, comentario }` |

La exportación CSV solo lleva `paquete, id, asunto, ramo, importe, decision, motivo, confianza, origen, duracion_ms, timestamp`, separada por `;` y con BOM UTF-8 para Excel.

## Dataset del panel (`GOBIERNO_DEMO`)

Mismo esquema que `data/gobierno-paquete-A.json`. Claves de primer nivel:

| Clave | Forma resumida |
|---|---|
| `version`, `generado`, `periodo { desde, hasta }`, `ancla` | metadatos; `ancla` solo en el JSON generado |
| `precios` | `{ modelo: { in, out } }` en € por millón de tokens. El razonamiento se cobra a precio de salida |
| `agentes[]` | `{ id, nombre, icono, descripcion, modelo, prompt, nivel, estado, p95_ms, coste_hoy, cap_hoy, umbral, identidad, historial[], modelos[], variables, … }` |
| `niveles[]` | L0 Manual, L1 Asistido, L2 Supervisado, L3 Autónomo |
| `politicas[]` | guardrails G-01…G-12: `{ id, agente, condicion, accion, severidad, disparos, activa, descripcion, disparos_dia[], ultimos[] }` |
| `cambios_autonomia[]` | auditoría de cambios de nivel |
| `modelos[]` | consumo por modelo: llamadas, tokens, coste, latencia y tasas de éxito |
| `caps[]` | CAP-01…CAP-11: `{ id, ambito, tipo, limite, unidad, consumo, accion, estado }` + `CAPS_DETALLE` (`desde, propietario, descripcion, serie, superaciones, correctivas`) |
| `kpis` | `{ resumen, cap_mensual, negocio, autonomia, finops }`; `negocio` son las hipótesis de `ahorro.js` |
| `alertas[]`, `eventos[]`, `recomendaciones[]`, `replays[]` | listas para Resumen, Histórico y FinOps |
| `trazas[]` | 13 trazas del Paquete A (ver abajo) |
| `razonamiento` | `{ traza_id: [{ agente, entrada, pasos[], salida }] }` |
| `diario[]` | `[fecha, mensajes, [coste por agente]]`, 14 días |
| `cumplimiento_declarado` | controles documentales por marco: `ria`, `rgpd`, `dora`, `eiopa` |
| `knowledge[]` | KB-01…KB-09 con `config`, `metricas`, `serie`, `uso`, `versiones`, `evaluacion` |
| `rubricas[]` | rúbricas de evaluación de KB: `criterios` con pesos que suman 100 y `preguntas` |
| `medidas[]` | 19 medidas correctivas `{ id, dim, sev, agente, impacto, origen, titulo, detalle, alternativas[] }` |
| `fraude` | `FRAUDE_DEMO` (lo engancha `data/fraude.js`) |

Los cuatro agentes son `multicanal` (gpt-5-nano + stt-es, L3), `clasificacion` (gpt-5-nano, L3), `extraccion` (gpt-5-mini, L2) y `reglas` (gpt-5, L2, prompt v2.3).

### Traza

```js
{ id: 'TRZ-4F2A', mensaje: 'MSG-A-01', asunto, canal, inicio: '2026-09-17T09:02:11',
  ramo, decision, confianza, motivo, resultado: 'auto' | 'humano' | 'override',
  guardrail?, incidencias?, override?, revision?,
  spans: [[agente, inicio_ms, duracion_ms, modelo, tokens_in, tokens_out, tokens_razonamiento], …] }
```

El coste de una traza no se guarda: `gobierno.js` lo calcula con `precios` (`spanCost`). La duración es el final del último span.

## Dataset antifraude (`FRAUDE_DEMO`)

| Clave | Contenido |
|---|---|
| `niveles` | `[mínimo, clave, etiqueta, qué pasa]`: SIU desde 70, vigilancia desde 40, sin indicios |
| `indicadores[]` | IF-01…IF-12 con `grupo, nombre, senal, fuente, peso, ramos, activo, disparos_14d, fp, no_es` |
| `escenarios[]` | EF-01…EF-08 con la lista de indicadores y, en algunos, un indicador `clave` |
| `historico` | `polizas` (5, con `alta`, `conductores`, `nota`), `siniestros` (4, con `iban`, `telefono`, `fecha`) y `proveedores` (con `casos_marcados`) |
| `seguimiento`, `cola`, `diario`, `canales` | cola de la SIU, evolución de 14 días y equidad por canal |

El motor que usa estos datos está en [evidencias-y-fraude.md](evidencias-y-fraude.md#motor-de-indicadores-de-fraude).

## Fechas relativas a hoy

Todos los datos están escritos con «hoy» = **17/09/2026** (`Fechas.ANCLA`). `fechas.js` se carga después de los datos y antes de la lógica, y desplaza `PAQUETES`, `RESULTADOS_GUARDADOS`, `GOBIERNO_DEMO` y `FRAUDE_DEMO` en Δ días, recorriendo cada cadena de los objetos.

- Δ = hoy − ancla. Antes de las 09:45 (`CORTE`) se resta un día, porque las trazas del lote son de 09:02 a 09:41.
- Formatos que reconoce: ISO con y sin hora, `dd/mm`, rangos `1–3/09`, `mm/aaaa`, «12 de septiembre», «sábado 12 de septiembre», «el jueves 10», «el pasado día 8» y «julio de 2026». Recalcula el día de la semana y respeta la mayúscula inicial. No toca la hora.
- `02/08/2026` (AI Act art. 50) está en `FIJAS` y no se mueve.
- Un `WeakSet` evita desplazar dos veces un objeto compartido entre datasets.
- `?fecha=AAAA-MM-DD` fija el día; `?fecha=ancla` deja Δ = 0.
- `Fechas.alDia(datos)` desplaza un JSON cargado por el usuario solo si lleva `ancla: '2026-09-17'`. Por eso `make datos` escribe `ancla` en los dos JSON.

Como el texto del mensaje y las citas de las evidencias se desplazan con la misma función, las citas siguen siendo literales y los plazos de A2/H2 dan el mismo resultado cualquier día.

## Regenerar los datos derivados

| Cambio | Comando | Regenera |
|---|---|---|
| `data/mensajes.js`, `data/resultados.js`, `data/gobierno.js` o `data/fraude.js` | `make datos` | los dos JSON de `data/` |
| `_docs/guion-demo.md` | `make recorrido` | `data/recorrido.js` |

`tests/recorrido.test.js` falla si `data/recorrido.js` no está al día con el guion.
