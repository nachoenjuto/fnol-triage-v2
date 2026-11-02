# Capa de cumplimiento

`cumplimiento.js` calcula, para cada decisión, un bloque `_gobernanza` con los datos personales detectados, la explicación de la decisión, las huellas SHA-256, los plazos de retención y el estado de la supervisión humana. Es lógica pura, sin DOM: la cargan `index.html` (pestaña «Respuesta cruda»), `gobierno.html` (Termómetro de cumplimiento) y Node (`tests/cumplimiento.test.js`). Como las dos páginas usan el mismo módulo, una traza da los mismos hashes y los mismos hallazgos en la ficha y en el panel.

El modelo no rellena nada de este bloque. Todo sale de funciones deterministas sobre el mensaje y la respuesta ya validada: misma entrada, mismos hashes (lo comprueba un test).

## API

`window.Cumplimiento` en el navegador y `module.exports` en Node:

| Función | Devuelve |
|---|---|
| `gobernanza(entry, opts)` | bloque `_gobernanza` completo. `opts`: `traza_id`, `modelo`, `prompt`, `timestamp`, `antifraude` |
| `detectar(texto, { remitente, asegurado })` | hallazgos `{ tipo, categoria, inicio, fin, cita }` ordenados por posición |
| `enmascarar(hallazgo)` | valor que queda en la traza persistida |
| `seudonimizarMensaje(msg)` | `{ mensaje, mapa }` con marcadores en asunto, texto y remitente |
| `rehidratar(valor, mapa)` | el valor con los marcadores sustituidos por los datos reales, a cualquier profundidad |
| `seudonimizarTexto(texto, mapa)` | lo contrario sobre un texto; lo usa la reproducción de fichas guardadas |
| `resumenSeudonimizacion(enviado, mapa, extra)` | lo que se guarda del envío: nº de sustituciones, tipos y marcadores, sin los valores |
| `encadenar(gobs)` / `verificarCadena(items)` | cadena de hashes del registro y comprobación con el primer eslabón roto |
| `termometro(gobs, declarados, cadena)` | controles por marco normativo, porcentajes y resumen |
| `jsonHtml(valor, opciones)` | JSON coloreado con marcas de datos personales y de la norma de cada clave |
| `tasaOverride(trazas, nivel, umbral)` | tasa de override de un agente y propuesta de bajarle un nivel |
| `conocimientoDe(entry, prompt)` | knowledge bases y versiones que usó la decisión |
| `sha256(texto)` | hash hexadecimal |

`sha256` está implementado en el propio módulo, síncrono, para dar el mismo resultado en el navegador y en Node sin `crypto.subtle` (que es asíncrono). El test lo compara con `crypto` de Node con cadenas vacías, ASCII, UTF-8 con emojis y textos largos.

## Detección de datos personales

`detectar()` combina el nombre del remitente y del asegurado, una lista de expresiones regulares (`DETECTORES`) y otra de términos sanitarios (`SALUD`):

| Tipo | Categoría | Patrón resumido | Valor en la traza |
|---|---|---|---|
| `nombre` | identificativo | nombre del remitente (≥ 2 palabras) | `PER-XXXX` (4 hex del SHA-256) |
| `nombre_tercero` | tercero | asegurado distinto del remitente, «mi hijo X», «el vecino X», «el otro conductor es X», «Dr./Dra. X» | `PER-XXXX` |
| `dni`, `nie` | identificativo | `\d{8}-?[letra]`, `[XYZ]-?\d{7}-?[letra]` | `•••••456-Q` (últimos 3) |
| `email`, `telefono` | contacto | email; móvil o fijo español con o sin `+34` | `ma•••@correo.es`, `619 ••• 210` |
| `iban` | financiero | `ES\d{2}` + 5 grupos de 4 | `ES12 •••• … 1234` |
| `poliza`, `matricula`, `tarjeta_sanitaria`, `expediente` | indirecto | `AU/HO/SA-\d{6}`, `\d{4} [consonantes]{3}`, … | `POL-`, `MAT-`, `TSI-`, `EXP-` + 4 hex |
| `direccion` | localización | «C/ Toledo 88, 3.º B, 28005 Madrid» y variantes | `Madrid (municipio)` o `Municipio (generalizado)` |
| `menor` | menor | «(9 años)» con edad < 18; «los niños del vecino» | `[menor de edad]` |
| `salud` | salud | fractura, esguince, asma, radiografía, urgencias, ingresado… | `[dato de salud cifrado]` |

Reglas de solape: dos hallazgos de la misma categoría no se solapan, y un dato no sanitario dentro de otro (los dígitos de la cuenta dentro del IBAN) se descarta. Un dato de salud sí puede solapar con uno de otra categoría.

Cada hallazgo de la traza lleva `usado_en_decision`: verdadero si su posición se solapa con alguna evidencia verificada y resaltada. Así el termómetro mide cuántos datos personales entraron al sistema sin hacer falta para decidir.

La detección es por patrones y diccionario. No reconoce nombres sueltos que no encajen en esos contextos ni patologías fuera de la lista `SALUD`. Los tests fijan el comportamiento sobre los mensajes del Paquete A, por ejemplo que «no hay fractura» no cuenta como dato de salud y que un adulto de 22 años no es un menor.

## Seudonimización antes del modelo

`seudonimizarMensaje()` sustituye los hallazgos cuyo tipo está en `MARCADOR` (todos salvo `salud` y `menor`):

- El marcador es estable por valor: el mismo DNI es `[DNI_1]` en todo el mensaje.
- La póliza conserva el prefijo del ramo, `[POLIZA_AU_1]`, porque es un indicio de clasificación.
- Un nombre detectado una vez en contexto («mi hijo Pablo») se sustituye también donde aparece suelto.
- El remitente y su contacto se seudonimizan igual que el texto.

`rehidratar()` recorre la respuesta validada y repone los valores con `split/join` por marcador. El test comprueba que la ida y vuelta devuelve exactamente el original y que ningún dato personal, salvo salud y edad de menores, sale en claro hacia el modelo.

El registro solo guarda `resumenSeudonimizacion()`: número de sustituciones, tipos, lista de marcadores y el texto enviado. `_gobernanza.datos_personales.envio_al_modelo` añade el SHA-256 de ese texto y deja escrito que la tabla de correspondencias solo existió en memoria.

Los adjuntos no se seudonimizan: `_gobernanza.adjuntos.envio_al_modelo` lo registra de forma explícita.

## Bloque `_gobernanza`

Esquema `fnol-gobernanza/1.0`. Cada sección lleva `normas`, una lista de etiquetas del catálogo `NORMAS` (AI Act, RGPD, LOPDGDD, LCS, LOSSEAR) que la interfaz muestra con su explicación al pasar el ratón.

```text
_gobernanza
├─ esquema, generado_por
├─ trazabilidad      traza_id, mensaje_id, registrado, canal, modelo, prompt, origen,
│                    hash_entrada, hash_salida, hash_registro, conocimiento[]
├─ retencion         traza_seudonimizada { plazo, hasta }, expediente { plazo, hasta }, despues
├─ datos_personales  total, por_categoria, categoria_especial_salud, menores, terceros,
│                    no_usados_en_decision, hallazgos[], envio_al_modelo
├─ adjuntos?         recibidos, archivos[] { id, archivo, mime, bytes, hash }, datos_extraidos,
│                    datos_personales, envio_al_modelo
├─ explicabilidad    ramo, confianza, por_que[], descartados[], reglas_determinantes,
│                    evidencias_verificadas
├─ supervision_humana requerida, motivo, estado, accion_humana?
├─ antifraude?       score, nivel, indicadores ["IF-03+35", …], contraindicios, nota
└─ clasificacion_ria nivel, controles_alto_riesgo
```

### Trazabilidad e integridad

- `hash_entrada` = SHA-256 del texto del mensaje.
- `hash_salida` = SHA-256 de `raw`, la respuesta cruda del modelo.
- `hash_registro` = SHA-256 de `hash_entrada|hash_salida|timestamp`.
- `traza_id` viene de `opts.traza_id` (las trazas de la demo, vía `TRAZA_DEMO`) o se deriva: `TRZ-` + 6 primeros hex de `hash_registro`.
- `conocimiento[]`: KB-01 siempre (los bloques de reglas de `prompts.js`, con la versión del prompt). Con IA se añaden KB-04 y KB-08, más KB-02/KB-06 en Auto, KB-03 en Hogar, KB-05 en Salud, KB-07 si hay lesionados en Auto y KB-09 si va a revisión. Solo KB-01 es real; las demás llevan `simulada: true`. El test comprueba que este catálogo y `GOBIERNO_DEMO.knowledge` tienen los mismos ids, nombres y versiones.

`encadenar()` construye una cadena sobre las trazas en orden de registro: `eslabon_n = SHA-256(eslabon_{n-1} | hash_registro_n)`, con 64 ceros como origen. `verificarCadena()` recalcula cada `hash_registro` desde el texto, la salida y la fecha, y devuelve el primer eslabón que no cuadra. «Simular una alteración» del panel cambia un carácter y enseña dónde se rompe.

La cadena vive en memoria del navegador. No hay almacenamiento inmutable detrás: demuestra el mecanismo, no garantiza la conservación.

### Explicabilidad

- `por_que`: hasta 4 evidencias verificadas sobre `ramo`, `tipo_siniestro` o `numero_poliza`, con la cita y la nota ya enmascaradas. Si la cita contiene un dato de salud, se marca como cifrada.
- `descartados`: para cada uno de los otros dos ramos, los indicios encontrados con `INDICIOS` y un motivo. Si el propio modelo nombró ese ramo en `criterios_ramo`, se usa su frase.
- `reglas_determinantes`: las incumplidas o, si no hay, las que se cumplen.

### Retención

| Plazo | Valor | Norma |
|---|---|---|
| Traza seudonimizada | 6 meses desde el registro | AI Act art. 19 y 26.6 |
| Expediente | 5 años en Salud (seguro de personas), 2 años en Auto y Hogar (daños) | LCS art. 23, RGPD art. 5.1.e |
| Después | bloqueo durante la prescripción y supresión; solo datos anonimizados para analítica | LOPDGDD art. 32 |

La demo calcula las fechas; no borra ni bloquea nada.

### Supervisión humana

`requerida` es verdadero para toda decisión `REVISION`. La ficha del triaje permite dos acciones (`app.js · revisar()`):

| Acción | Cuándo | Efecto | ¿Cuenta como override? |
|---|---|---|---|
| Validar | el agente ya escaló (`REVISION`) | una persona aprueba o mantiene en revisión | no |
| Override | el agente aprobó solo (`DESPEJADO`) | una persona lo pasa a revisión | sí |

`accion_humana.cuenta_para_autonomia` lo deja escrito. `tasaOverride()` calcula overrides ÷ aprobaciones automáticas; por encima del 3 % (estricto) propone bajar un nivel de autonomía, nunca por debajo de L0, y la propuesta queda pendiente de aprobación.

## Termómetro

`termometro(gobs, declarados, cadena)` agrupa controles en cuatro marcos: RIA (AI Act), RGPD y LOPDGDD, DORA, y EIOPA / Solvencia II. Hay dos tipos de control:

- **Medidos**: se calculan sobre las trazas de la fuente activa. RIA: registro completo, cadena íntegra, ≥ 5 evidencias verificadas, ramos descartados explicados, escalado de lo desfavorable. RGPD: inventario de datos personales, salud, menores, terceros, minimización, art. 22, retención.
- **Declarados**: vienen de `GOBIERNO_DEMO.cumplimiento_declarado` y son documentales (formación, contratos, planes). DORA y EIOPA solo tienen declarados.

Cada control vale 1 (`ok`), 0,5 (`ambar`) o 0 (`rojo`). El porcentaje de un marco es la media de sus controles y el global, la media de todos.

El control de minimización (`rgpd-5c`) solo se pone en verde si todas las trazas con datos personales que llegaron al modelo iban seudonimizadas. Con la demo por defecto queda en ámbar; con la fuente «Sesión actual» y la casilla activada, pasa a verde.

Una medida correctiva marcada como verificada en el panel pone en verde los controles que lista en `controles` y recalcula los porcentajes. Eso lo hace `gobierno.js · termometroGob()` encima de este módulo, que no sabe nada de las medidas.

## Qué está implementado y qué solo se declara

| Aspecto | Estado en la demo |
|---|---|
| Detección, enmascarado y seudonimización | implementado y probado |
| Hashes, cadena y verificación | implementado y probado, en memoria |
| Explicabilidad y evidencias verificadas | implementado y probado |
| Plazos de retención | calculados; no se aplica ningún borrado |
| «Cifrado de campo» y «acceso solo para el rol Salud» | etiqueta de tratamiento; no hay cifrado ni control de acceso |
| Informar a terceros (art. 14) | se marca el tercero; no se envía ninguna comunicación |
| Controles DORA y EIOPA | declarados en el dataset |

La clasificación RIA que se registra es «no es alto riesgo»: el Anexo III 5.c del AI Act solo cubre la evaluación de riesgos y la tarificación en seguros de vida y salud. Los controles de los arts. 9–15 se aplican como buena práctica.
