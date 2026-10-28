# Pruebas

`make test` ejecuta 7 suites con Node, sin dependencias ni framework: cada fichero define sus casos, imprime `ok` o el fallo y sale con código distinto de 0 si algo falla. Los datos de `data/` se cargan con `new Function(...)` porque son scripts del navegador, no módulos. Hoy pasan 108 casos.

```bash
make test
```

| Suite | Casos | Módulo | Qué fija |
|---|---|---|---|
| `tests/evidencias.test.js` | 22 | `evidencias.js` | localización exacta y normalizada, rechazo de paráfrasis, respaldo, siguiente paso |
| `tests/cumplimiento.test.js` | 28 | `cumplimiento.js` | SHA-256, detección de datos personales, seudonimización, `_gobernanza`, cadena, termómetro, override |
| `tests/fraude.test.js` | 18 | `fraude.js` | scores y niveles del Paquete A, cruces, indicadores nuevos, G-12, caps antifraude |
| `tests/fechas.test.js` | 11 | `fechas.js` | formatos de fecha, día de la semana, cambio de año, corte de la mañana, citas literales |
| `tests/ahorro.test.js` | 6 | `ahorro.js` | coste manual por mensaje, automatizados y escalados, escenarios |
| `tests/adjuntos.test.js` | 10 | `adjuntos.js` | parte en PDF determinista, contraste con el email, `_gobernanza.adjuntos` |
| `tests/recorrido.test.js` | 13 | `shell.js`, `data/recorrido.js` | guion sincronizado, configuración del recorrido, tiempos de subtítulos |

## Qué cubre cada suite

**Evidencias.** Citas con mayúsculas, tildes, espacios dobles, comillas tipográficas, saltos de línea y emojis antes de la cita. Una cita inventada o parafraseada no se localiza. Basura en el campo `evidencias` (no array, objetos sin cita, más de 12) se descarta. Las citas curadas de los resultados guardados existen literalmente en su mensaje, y toda ficha de los tres paquetes tiene al menos 2 evidencias verificadas sin solapes. Sin campo `evidencias`, o con todo inventado, el respaldo sigue produciendo evidencias. Un texto de cliente con HTML o instrucciones no rompe el pintado.

**Cumplimiento.** `sha256` coincide con `crypto` de Node. Detección sobre mensajes concretos: DNI, teléfono, IBAN, dirección y póliza en MSG-A-02; salud, menor y tercero en MSG-A-12; «no hay fractura» no es dato de salud (MSG-A-03); un adulto de 22 años no es un menor (MSG-A-04). La traza persistida no lleva ningún dato personal en claro. La seudonimización no deja salir datos hacia el modelo salvo salud y edad de menores, y la reconstrucción devuelve exactamente el original. La cadena detecta una alteración. Validar un «A revisar» no cuenta como override; un override de un aprobado sí. El catálogo de KB de `cumplimiento.js` coincide con el del panel.

**Fraude.** MSG-A-13 da 90 y va a la SIU; MSG-A-09 y MSG-A-02 comparten cuenta y retienen el pago; MSG-A-11 queda en vigilancia; en MSG-A-04 el conductor declarado anula IF-11. La decisión del triaje no cambia (10 aprobados, 3 a revisar) y los paquetes B y C no tienen casos. Cada cita es literal y está en su posición. El bloque para `_gobernanza` no lleva citas ni la cuenta. Las series del dataset (CAP-09, CAP-10, CAP-11, G-10) cuadran con el motor.

**Fechas.** Formatos ISO, `dd/mm`, rangos y `mm/aaaa`; día de la semana recalculado; cambio de año; fechas normativas fijas; Δ con el corte de las 09:45 y con `?fecha=`. Las citas siguen siendo literales y los plazos no cambian tras desplazar. Un objeto compartido no se desplaza dos veces.

**Adjuntos.** Solo MSG-A-01 lleva adjuntos y sus ficheros existen. El parte cuadra con el mensaje y con lo extraído. El PDF es determinista y cambia si cambia la fecha. `_gobernanza.adjuntos` registra las tres huellas, marca los datos del tercero y no deja ninguno en claro.

**Recorrido.** `data/recorrido.js` está al día con `_docs/guion-demo.md` (24 pasos). La configuración guardada con valores fuera de rango o de un guion anterior se descarta. Cada subtítulo dura lo que se tarda en leerlo. La contraseña del modo presentador se guarda solo como SHA-256.

## Comprobación con un modelo real

`tests/ia-real.js` no forma parte de `make test` porque llama a un modelo de pago. Envía el Paquete A (o los `N` primeros mensajes) con los prompts por defecto y mide, por mensaje y en total: evidencias pedidas, localizadas exactas, normalizadas, no localizadas, JSON inválido, respuestas sin campo `evidencias`, respuestas truncadas y tokens de salida. La configuración se lee de variables de entorno; ver [integracion-ia.md](integracion-ia.md#comprobación-con-un-modelo-real).

```bash
make test-ia N=3
```

## Lo que no está cubierto

- `app.js` (cliente del modelo, `parseTriage`, motor local, lote con pausa y cancelación) y `gobierno.js` (render, conversión de la sesión en trazas, replay, medidas) no tienen pruebas automáticas. Son las dos piezas más grandes: unas 1.800 y 3.350 líneas.
- No hay pruebas de interfaz ni de extremo a extremo. Las capturas de `make capturas` sirven de comprobación visual manual.
- No hay pruebas contra las cuatro rutas de la API ni de la adaptación de parámetros a un 400.
- No hay lint ni comprobación de tipos, y no hay CI: las pruebas solo corren si alguien ejecuta `make test`.

Las primeras candidatas a cubrir son `parseTriage()`, `buildEndpointUrl()` y `localTriage()` (puras) y `buildBody()` y `trazasDesdeSesion()` (dependen de `paramCompat` y de `sessionStorage`). Están dentro de los IIFE de `app.js` y `gobierno.js`; habría que sacarlas a un módulo con la misma doble exportación (`window` y `module.exports`) que usan los demás.
