# Integración con el modelo

El navegador llama directamente al modelo. No hay backend ni proxy: `app.js` construye la petición, la envía con `fetch` al endpoint de Azure AI Foundry que el usuario pega en «Configurar IA», valida la respuesta y, si falla, cae al motor local.

## Motores de triaje

`state.motor` (menú lateral, «Motor de triaje»; `sessionStorage['triage.motor']`) decide qué hace `triageOne()` con cada mensaje:

| Motor | Valor | Qué hace | `origen` en el registro |
|---|---|---|---|
| Automático | `auto` | IA si `aiEnabled(cfg)`; si no, motor local | `IA` o `reglas locales` |
| Resultados guardados | `guardado` | expande `RESULTADOS_GUARDADOS[id]` tras una espera simulada de 3–5 s | `IA (guardado)` |
| Archivo cargado | `archivo` | repite las entradas de un JSON exportado, con la misma espera | `<origen original> (archivo)` |

`aiEnabled(cfg)` exige endpoint, clave y, o bien un deployment, o bien una URL que ya incluya `chat/completions` o `/responses`.

Un mensaje sin ficha guardada, en el motor `guardado`, se resuelve con el motor local y queda marcado `reglas locales (sin ficha guardada)`.

## Configuración

`readConfigFromForm()` lee cinco campos y `saveConfig()` los guarda en `sessionStorage['triage.cfg']`:

| Campo | Uso |
|---|---|
| `endpoint` | URL base del recurso o URL completa copiada del portal |
| `deployment` | nombre del despliegue; se envía como `model` |
| `route` | `v1`, `responses`, `deployments` o `models` |
| `apiVersion` | solo rutas `deployments` y `models`; vacío = valor por defecto |
| `apiKey` | clave del recurso |

La clave se envía en dos cabeceras a la vez, `api-key` y `Authorization: Bearer`, para que funcione con las cuatro rutas. Vive en `sessionStorage` y desaparece al cerrar la pestaña. Es una decisión de demo: en producción la clave no debe llegar al navegador (ver [Limitaciones](#limitaciones-conocidas)).

### Rutas y URL

`routeFromUrl()` detecta la ruta en la URL pegada y `buildEndpointUrl()` construye la final a partir del `origin`:

| Ruta | URL | `api-version` por defecto |
|---|---|---|
| `v1` | `{origen}/openai/v1/chat/completions` | — |
| `responses` | `{origen}/openai/v1/responses` | — |
| `deployments` | `{origen}/openai/deployments/{deployment}/chat/completions` | `2024-10-21` |
| `models` | `{origen}/models/chat/completions` | `2024-05-01-preview` |

Si la URL pegada ya es de la ruta elegida y lleva `/openai/v1/` o `?api-version=`, se usa tal cual.

## Cuerpo de la petición

`buildBody()` adapta el cuerpo a la ruta y al tipo de modelo. `isReasoningModel()` considera de razonamiento cualquier deployment que empiece por `gpt-5` u `o1`…`o9`.

| | Chat Completions (`v1`, `deployments`, `models`) | Responses API |
|---|---|---|
| Mensajes | `messages` | `instructions` (system) + `input` |
| Límite de salida | `max_completion_tokens` (o `max_tokens` si el servicio lo pide) | `max_output_tokens` |
| Modelo de razonamiento | `reasoning_effort: 'low'` | `reasoning: { effort: 'low' }` |
| Otro modelo | `temperature: 0` | `temperature: 0` |
| JSON | `response_format: { type: 'json_object' }` | `text.format: { type: 'json_object' }` |

El límite de salida es `MAX_OUTPUT_TOKENS = 2500` en el triaje y 800 en el paso 1 de la estrategia de dos pasos. Si ningún mensaje de usuario contiene la palabra «json», se añade «Responde únicamente con un objeto JSON.» al último, porque el modo JSON de la API lo exige.

### Adaptación de parámetros

Un 400 que nombre un parámetro no admitido no consume reintento. `adaptParams()` lee el texto del error y:

- cambia `max_completion_tokens` por `max_tokens`, o al revés;
- retira el parámetro citado en `Unsupported parameter: 'x'` o `'x' is not supported` (por ejemplo `temperature`).

Los cambios se guardan en `paramCompat` y valen para el resto del lote. Como máximo se hacen 4 adaptaciones por llamada.

## Reintentos y tiempos

| Situación | Comportamiento |
|---|---|
| HTTP 408, 429, 500, 502, 503, 504 | hasta 5 reintentos; espera `Retry-After` si viene, si no `min(32 s, 2 s × 2^intento)` + 0–500 ms de jitter |
| Error de red o sin respuesta en 45 s (`REQUEST_TIMEOUT_MS`, `AbortController`) | 2 reintentos (`NETWORK_RETRIES`); después `PermanentError` |
| HTTP 400 no adaptable, 401, 403, 404… | `PermanentError` inmediato |
| Respuesta vacía con `finish_reason = length` o `status = incomplete` | error transitorio: el mensaje cae al motor local |
| JSON que no pasa `parseTriage()` | error transitorio: el mensaje cae al motor local |

Un `PermanentError` interrumpe el lote entero, porque casi siempre significa clave, endpoint o ruta mal configurados. Cualquier otro error afecta solo a ese mensaje: se resuelve con el motor local y el registro lo marca `reglas locales (fallback IA: <motivo>)`. El panel convierte esa marca en una incidencia de la traza.

Los tokens de cada llamada se escriben en consola (`[triage][llm] tokens`) y se guardan en `usage` y `pasos[].usage`.

## Prompts

Todos los textos están en `prompts.js`, fuera de la lógica:

| Constante | Bloque editable | Contenido |
|---|---|---|
| `PROMPT_RAMO` | `ramo` | clasificación de ramo (paso 1 de la estrategia de dos pasos) |
| `PROMPT_BASE` | `base` | tarea, extracción, formato JSON y reglas de las evidencias |
| `REGLAS_AUTO` | `auto` | A1–A8 |
| `REGLAS_HOGAR` | `hogar` | H1–H9 |
| `REGLAS_SALUD` | `salud` | S1–S8 |
| `PROMPT_SEUDONIMOS` | — | aviso que se añade al mensaje de usuario cuando va seudonimizado |
| `PROMPT_VERSION` | — | `'reglas v2.3'`, se registra en cada traza |

Los cinco bloques se editan en el menú lateral y se guardan en `sessionStorage['triage.prompts']`. La llamada usa siempre el texto vigente. Editar un bloque no cambia `PROMPT_VERSION`, así que una traza hecha con un prompt editado se registra igualmente como «reglas v2.3».

- `buildSystemPrompt(bloques, ramo)` concatena `base` con el bloque del ramo, o con los tres si `ramo` es `null`.
- `buildUserPrompt(mensaje, ramoPrevio, seudonimizado)` arma canal, fecha de recepción, remitente, asunto y el texto entre `"""`. No incluye `esperado`, `id` ni los adjuntos.

## Estrategias de llamada

`state.estrategia` (`sessionStorage['triage.estrategia']`):

- **`1paso`** (por defecto): una llamada con `base` + los tres bloques de reglas.
- **`2pasos`**: primero `PROMPT_RAMO` (salida máxima 800 tokens, se valida con `parseRamo()`); después `base` + solo el bloque de ese ramo, o los tres si salió `Indeterminado`. Si el paso 2 devuelve otro ramo, gana el del paso 1, la decisión pasa a `REVISION` y el motivo empieza por la discrepancia. Es la condición del guardrail G-03.

`pasos[]` guarda tokens y duración de cada llamada; la ficha los muestra para comparar las dos estrategias.

## Contrato de salida

El prompt base pide exactamente este objeto:

```json
{
  "ramo": "Auto | Hogar | Salud | Indeterminado",
  "criterios_ramo": ["\"<cita literal>\": <explicación>"],
  "datos_extraidos": {
    "nombre_cliente": "string | null", "numero_poliza": "string | null", "tipo_siniestro": "string | null",
    "fecha_hecho": "YYYY-MM-DD | null", "importe_estimado_eur": "number | null", "lugar": "string | null",
    "terceros_implicados": "boolean", "lesionados": "boolean",
    "documentacion_mencionada": ["string"], "observaciones": "string | null"
  },
  "criterios": [{ "regla": "A2", "descripcion": "…", "resultado": "cumple | incumple | no_aplica", "evidencia": "…" }],
  "evidencias": [{ "ref": "fecha_hecho | ramo | regla:A2", "cita": "<fragmento literal>", "nota": "…" }],
  "decision": "DESPEJADO | REVISION",
  "motivo": "≤ 200 caracteres",
  "confianza": 0.0
}
```

### Validación (`parseTriage`)

La salida del modelo nunca se usa sin pasar por aquí:

1. Toma el primer `{…}` del texto (tolera texto o bloques de código alrededor) y lo parsea. Si falla, `null`.
2. `decision` se pasa a mayúsculas y sin tilde; si no es `DESPEJADO` ni `REVISION`, `null`.
3. `motivo` vacío o que no sea texto: `null`. Si es válido, se recorta a 240 caracteres.
4. `ramo` se compara sin mayúsculas con Auto/Hogar/Salud; cualquier otro valor queda `Indeterminado`.
5. `confianza` no numérica pasa a 0,5; numérica se acota a 0–1.
6. Cada criterio se normaliza; un `resultado` desconocido pasa a `no_aplica`.
7. `evidencias` pasa por `Evidencias.validar()` (ver [evidencias-y-fraude.md](evidencias-y-fraude.md)).

`null` en cualquiera de los tres primeros pasos hace que el mensaje caiga al motor local.

La salida del modelo no incluye nada del bloque `_gobernanza`: la plataforma lo calcula después (ver [cumplimiento.md](cumplimiento.md)).

## Seudonimización del envío

Con la casilla «Seudonimizar antes de enviar» activa (`sessionStorage['triage.seudonimizar']`, activada por defecto), `aiTriage()`:

1. llama a `Cumplimiento.seudonimizarMensaje(msg)`, que sustituye en asunto, texto y remitente los nombres, DNI, NIE, email, teléfono, IBAN, tarjeta sanitaria, póliza, matrícula, expediente y dirección por marcadores estables (`[PERSONA_1]`, `[DNI_1]`, `[POLIZA_AU_1]`);
2. añade `PROMPT_SEUDONIMOS` al mensaje de usuario;
3. al volver, `Cumplimiento.rehidratar()` repone los valores reales en todos los campos de la respuesta validada; `raw` se guarda tal como llegó, con los marcadores.

La tabla de correspondencias es una variable local de la llamada. No se guarda en el registro ni en la traza. Los datos de salud y la edad de los menores no se sustituyen porque las reglas S2–S4 y A3 los necesitan. El detalle está en [cumplimiento.md](cumplimiento.md#seudonimización-antes-del-modelo).

Con el motor `guardado`, la seudonimización se simula: se aplica la tabla a la respuesta guardada para mostrar cómo habría llegado, y el resumen lleva `simulada: true`.

## Motor local

`localTriage()` funciona sin red y sin modelo. Sirve de modo degradado y de respaldo:

- **Ramo**: cuenta palabras clave distintas por ramo (`RAMO_KEYWORDS`, incluye prefijos de póliza `AU-`/`HO-`/`SA-` y matrículas). Empate o cero aciertos → `Indeterminado`.
- **Extracción** (`extractLocal`): fecha del hecho («12 de septiembre», `dd/mm`, «hace dos días», «ayer», «hoy»; si queda en el futuro, año anterior), importe máximo en €, póliza, terceros, lesionados (quitando antes «no hubo heridos» y similares) y documentación.
- **Reglas** (`LOCAL_RULES`): un subconjunto heurístico por ramo (Auto A2–A7, Hogar H2–H5 y H9, Salud S2–S5, S7 y S8) evaluado con expresiones regulares.
- **Decisión**: `REVISION` si el ramo es indeterminado o hay alguna regla incumplida; si no, `DESPEJADO`. Confianza 0,3 con ramo indeterminado o `0,6 + min(0,25; 0,04 × nº de reglas)`.

El motor local no lee adjuntos ni devuelve evidencias; `evidencias.js` las reconstruye después.

## Adjuntos

Fase 1: el modelo en vivo no recibe los adjuntos. Al procesar MSG-A-01 con IA, `runBatch()` toma los datos del parte y de las fotos de `RESULTADOS_GUARDADOS['MSG-A-01'].adj` y marca `adjuntos_origen: 'guardado'`; la ficha lo indica. Antes de la llamada, `Adjuntos.huellas(msg)` calcula tamaño y SHA-256 de cada archivo tal como se recibe.

## Comprobación con un modelo real

`tests/ia-real.js` (`make test-ia`) envía el Paquete A a un modelo real con los prompts por defecto y mide cuántas citas de evidencia se localizan en el texto. Lee la configuración de variables de entorno, nunca de un fichero:

```bash
export TRIAGE_ENDPOINT='https://<recurso>.openai.azure.com/openai/deployments/<despliegue>/chat/completions?api-version=<versión>'
export TRIAGE_API_KEY='<clave>'
export TRIAGE_MODEL='<despliegue>'   # opcional si va en la URL
export TRIAGE_REASONING=low          # opcional
make test-ia N=3
```

Usa `api-key` si la URL es de `openai.azure.com` y `Authorization: Bearer` en otro caso. Solo admite Chat Completions.

## Limitaciones conocidas

| Limitación | Consecuencia | Qué haría falta en producción |
|---|---|---|
| La clave de API está en el navegador (`sessionStorage`) y viaja desde el cliente | cualquiera con acceso a la pestaña la ve en las herramientas de desarrollo | proxy de backend con identidad administrada; el navegador solo envía el token de sesión |
| El modelo es configurable por el usuario, no por variable de entorno por tarea | clasificación y reglas usan el mismo deployment | un modelo por tarea en configuración del servidor |
| `PROMPT_VERSION` es fijo | un prompt editado en la sesión se registra con la versión por defecto | versionar el prompt por su hash |
| Los adjuntos no se envían al modelo | sus datos vienen de la ficha guardada | entrada multimodal o extracción previa, con seudonimización también del adjunto |
| El coste por token solo se calcula en el panel con la tabla `precios` | el triaje registra tokens, no euros | precio por modelo en configuración y coste en la traza |
| CORS | el navegador solo puede llamar a endpoints que permitan el origen de la demo | el proxy de backend lo resuelve |
