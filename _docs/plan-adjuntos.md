# Plan: adjuntos en un mensaje del Paquete A

Estado: implementada la fase 1 con las opciones recomendadas (MSG-A-01, fotos generadas con un modelo de imagen, PDF con pdf-lib, sin discrepancia). El archivo del parte se llama `parte-amistoso.pdf`: con la póliza en el nombre, la traza dejaba un dato personal en claro.

## Qué se pide

- Un mensaje del Paquete A con adjuntos: la declaración amistosa de accidente en PDF y dos fotos de los daños del vehículo.
- En la ficha, una pestaña nueva **Adjuntos** junto a «Mensaje». Solo aparece en los mensajes que tienen adjuntos.
- Visor de PDF y de imágenes, con un panel lateral que muestra los datos extraídos de cada adjunto.
- Esos datos se añaden también a «Respuesta cruda».

## Mensaje elegido: MSG-A-01

MSG-A-01 (email de Marta Gil Sanz, golpe por alcance en la M-30, Seat León 4521 KLM, 1.350 €) ya dice en el texto «Rellenamos el parte amistoso los dos en el momento (lo adjunto escaneado)» y «también os adjunto fotos de los daños». No hay que tocar el texto del mensaje, las evidencias ni los hashes.

Además:

- Es el mensaje del paso 3 del guion («La ficha de un aprobado»), así que el público lo verá sin cambiar el recorrido.
- La traza TRZ-4F2A del panel de gobierno ya dice «1 adjunto (parte amistoso escaneado)». Pasa a «3 adjuntos (parte amistoso en PDF y 2 fotos)».
- La decisión no cambia: sigue aprobado, y los adjuntos refuerzan A5, A7 y A8.

## Los tres adjuntos

| Archivo | Tipo | Contenido |
|---|---|---|
| `parte-amistoso-AU-483920.pdf` | PDF, 1 página | Declaración amistosa con el formato europeo (vehículos A y B, 17 casillas de circunstancias, croquis, firmas). A: Marta Gil Sanz, Seat León 4521 KLM, póliza AU-483920. B: Raúl Méndez, Citroën C4 con matrícula ficticia y otra compañía. Lugar: M-30 a la altura del Puente de Segovia. 18:30. Sin heridos. Casilla 8 marcada en A («chocaba en la parte trasera, circulando en el mismo sentido y el mismo carril»). |
| `foto-frontal.jpg` | Imagen | Paragolpes delantero del Seat León con el golpe. |
| `foto-faro.jpg` | Imagen | Faro delantero derecho roto. |

Nota sobre el relato: Marta golpeó al coche de delante, así que sus daños están en la parte **delantera** (paragolpes y faro derecho), como dice el presupuesto. Las fotos tienen que enseñar eso.

### De dónde salen las fotos (decisión pendiente)

- **Opción A (recomendada):** generarlas con un modelo de imagen y revisarlas a mano. La matrícula de la foto se deja ilegible o se pone la ficticia 4521 KLM.
- **Opción B:** las aportas tú (fotos propias o de un banco con licencia).
- **Opción C:** ilustraciones en SVG. Quedan peor en una demo de «foto del daño».

No se usan fotos de internet sin licencia.

### Las fechas del PDF (decisión pendiente)

`fechas.js` desplaza las fechas del mensaje al día de hoy (el «12 de septiembre» pasa a ser el sábado más reciente que toque). Un PDF estático con «12/09/2026» no cuadraría con el texto ni con los datos extraídos.

- **Opción A (recomendada):** el parte se genera en el navegador a partir de una plantilla con [pdf-lib](https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js), rellenando la fecha ya desplazada con `Fechas`. Se sigue viendo y descargando como un PDF de verdad. Es la primera dependencia externa de la demo; si se prefiere no tener ninguna, se copia el `.min.js` en el repositorio.
- **Opción B:** PDF fijo y aceptar que la fecha del parte no coincida con la del mensaje cuando la demo no se abre con `?fecha=ancla`. Más sencillo, pero se nota.
- **Opción C:** el parte se dibuja en HTML/SVG con aspecto de documento escaneado, y el botón «Descargar» genera el PDF. Sin dependencias, pero el visor no sería un visor de PDF real.

## Pestaña «Adjuntos»

Va entre «Mensaje» y «Datos extraídos», con contador: `📎 Adjuntos 3`. En los mensajes sin adjuntos no se pinta (`TABS` se filtra en `openModal`).

Disposición en tres zonas, como «Mensaje» con sus evidencias:

```
┌────────────┬──────────────────────────────────┬───────────────────────────┐
│ Miniaturas │ Visor                            │ Datos extraídos           │
│ ▣ Parte    │ PDF: <iframe> del navegador      │ del adjunto seleccionado  │
│ ▣ Foto 1   │ Imagen: zoom (clic / rueda),     │ + contraste con el texto  │
│ ▣ Foto 2   │ arrastrar para mover             │   del mensaje             │
└────────────┴──────────────────────────────────┴───────────────────────────┘
```

- **Visor de PDF:** el del propio navegador en un `<iframe>` (Chrome, Edge, Safari y Firefox lo traen). Sin pdf.js. Botones «Abrir en pestaña nueva» y «Descargar».
- **Visor de imagen:** `<img>` con zoom y desplazamiento; flechas para pasar de una foto a otra.
- En móvil, las tres zonas se apilan y las miniaturas pasan a ser una fila horizontal.

### Panel lateral: datos extraídos por adjunto

Cada adjunto muestra sus campos y una marca de contraste con lo que dice el mensaje (✔ coincide, ⚠ no consta en el mensaje, ✖ discrepa).

**Parte amistoso (PDF)**

| Campo | Valor | Contraste |
|---|---|---|
| Fecha y hora | sábado 12/09 · 18:30 | ✔ coincide con «El sábado 12 de septiembre, sobre las 18:30» |
| Lugar | M-30, Puente de Segovia, Madrid | ✔ |
| Heridos | No | ✔ «No hubo heridos» |
| Vehículo A | Seat León 4521 KLM · póliza AU-483920 · Marta Gil Sanz | ✔ |
| Vehículo B | Citroën C4 · matrícula · compañía · Raúl Méndez | ⚠ la matrícula y la compañía solo constan en el parte |
| Circunstancias | A: casilla 8 (alcance por detrás) · B: ninguna | ✔ coherente con «le di un pequeño toque por detrás» |
| Firmas | Firmado por ambos conductores | ✔ |
| Daños visibles | A: frontal · B: trasera | ✔ |

**Fotos**

| Campo | Valor | Contraste |
|---|---|---|
| Zona dañada | Paragolpes delantero / faro delantero derecho | ✔ coincide con el presupuesto |
| Gravedad aparente | Leve, sin daños estructurales visibles | ✔ coherente con 1.350 € |
| Matrícula visible | 4521 KLM (o «no legible») | ✔ / — |
| Metadatos | Fecha de captura del archivo | ✔ mismo día del hecho |

Debajo, una línea con el efecto en las reglas: «El parte confirma A5 (tercero documentado, sin heridos) y A7 (despeje directo con parte); las fotos refuerzan A8 (daños coherentes con el relato)».

Para que la pestaña tenga algo que contar se puede meter una **discrepancia menor** a propósito (por ejemplo, el parte dice 18:15 y el email «sobre las 18:30»), marcada en ámbar y sin cambiar la decisión. **Pendiente de que decidas si la quieres.**

## «Respuesta cruda»

La salida del modelo gana un campo `adjuntos` al mismo nivel que `datos_extraidos`:

```json
"adjuntos": [
  {
    "id": "ADJ-1",
    "archivo": "parte-amistoso-AU-483920.pdf",
    "tipo": "declaracion_amistosa",
    "datos": { "fecha_hecho": "2026-09-12", "hora": "18:30", "lugar": "…", "heridos": false,
               "vehiculo_a": { … }, "vehiculo_b": { … }, "circunstancias_a": [8], "circunstancias_b": [],
               "firmado_ambos": true },
    "contraste": [ { "campo": "hora", "resultado": "coincide", "cita_mensaje": "sobre las 18:30" } ]
  },
  { "id": "ADJ-2", "archivo": "foto-frontal.jpg", "tipo": "foto_danos", "datos": { … } },
  { "id": "ADJ-3", "archivo": "foto-faro.jpg", "tipo": "foto_danos", "datos": { … } }
]
```

Con «+ Gobierno», el bloque `_gobernanza` añade lo que calcula la plataforma (en `cumplimiento.js`, sin IA):

- **Sello:** SHA-256 de cada archivo, igual que ya se hace con la entrada y la salida.
- **Datos personales en adjuntos:** nombre, DNI y firma del tercero en el parte, y matrícula visible en las fotos, marcados como datos de **terceros**.
- **Envío al modelo:** la seudonimización por marcadores solo se aplica al texto. Las imágenes y el PDF llegan tal cual, y la traza lo registra así. Es un hueco real que vale la pena enseñar en la demo, no esconderlo.

La vista «Enviado al modelo» lista los adjuntos enviados (nombre, tipo, tamaño y hash) debajo del texto con los marcadores.

## Cómo se obtienen los datos en cada motor

| Motor | Qué pasa con los adjuntos |
|---|---|
| Resultados guardados (el de la demo) | Los datos de `adjuntos` se guardan en `data/resultados.js` junto al resto de MSG-A-01. Es lo que se ve en la demo. |
| IA real | **Fase 1:** se reproducen los datos guardados y la ficha indica «extraído de los resultados guardados». **Fase 2 (opcional):** las fotos se envían como `image_url` en la llamada de extracción (Azure OpenAI con un modelo con visión) y el PDF como imagen de su página. Esto toca `buildUserPrompt`, `buildBody`, el prompt y la validación del JSON. |
| Motor local | Sin extracción de adjuntos: la pestaña muestra los archivos y «sin datos extraídos (motor local)». |

Recomiendo hacer solo la fase 1 ahora. La fase 2 tiene sentido si se va a enseñar con un modelo real.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `data/adjuntos/` (nuevo) | El PDF (o su plantilla) y las dos fotos, optimizadas (< 300 KB cada una). |
| `data/mensajes.js` | `adjuntos: [{ id, archivo, tipo, mime, tamano }]` en MSG-A-01. |
| `data/resultados.js` | Bloque `adj` de MSG-A-01 en el formato compacto del archivo. |
| `index.html` | Panel `#tab-adjuntos` y versión de los scripts. |
| `app.js` | Pestaña condicional en `TABS`/`openModal`, `pintarAdjuntos`, visor, `adjuntos` en `pintarRaw` y `pintarEnviado`. |
| `styles.css` | Estilos de la pestaña, el visor y el panel. |
| `cumplimiento.js` | Hash y datos personales de los adjuntos en `_gobernanza`. |
| `data/gobierno.js` | TRZ-4F2A: «3 adjuntos» en el agente multicanal y una línea en extracción. |
| `_docs/guion-demo.md` y `guion-demo-corto.md` | Paso 3: un clic más en «Adjuntos». Después, `make recorrido` y `make guion-docx`. |
| `README.md` | Una línea en «Caso de uso» (la ficha pasa de cinco a seis pestañas cuando hay adjuntos). |
| `tests/` | Pruebas de los datos del adjunto en `_gobernanza`; `tests/recorrido.test.js` debe seguir en verde. |

Los tokens de MSG-A-01 no cambian, para no mover las cifras de FinOps. Si se quiere ser fiel, enviar dos imágenes y un PDF sumaría unos 2.000-3.000 tokens de entrada, y habría que revisar el KPI «Ahorro estimado».

## Decisiones que necesito

1. ¿MSG-A-01 te vale?
2. Fotos: ¿las genero con un modelo de imagen (A), las aportas tú (B) o SVG (C)?
3. Fechas del PDF: ¿PDF generado en el navegador con pdf-lib (A), PDF fijo (B) o documento en HTML (C)?
4. ¿Meto una discrepancia menor entre el parte y el email?
5. ¿Solo fase 1 (datos guardados) o también la fase 2 con visión real?
