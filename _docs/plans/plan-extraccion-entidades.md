# Plan · Extracción de entidades (NER) con fechas contextualizadas

Estado: **aplicado en ES, EN y DE** · 18/11/2026 · repo `fnol-triage/v2` · decisiones D1–D7 según la recomendación

> **Cambios respecto al borrador**
> - Las entidades se ven en la pestaña «Datos extraídos» (texto resaltado por tipo, fechas ordenadas junto a la recepción y una tabla por tipo), no con un conmutador en la pestaña «Mensaje»: así no se mezclan con las evidencias numeradas.
> - Los textos solo se amplían; no se reescribe nada del original. Así las citas de los resultados guardados siguen siendo literales y las decisiones, reglas e indicadores de fraude de los 51 mensajes no cambian (comprobado mensaje a mensaje).
> - Las fechas que se añaden van detrás de la fecha del hecho o en formas que el motor local no toma como tal («marzo de 2025», «el martes 15»), para no mover el plazo A2/H2.
> - Entidades esperadas en `esperado.ner` como claves (`fecha|accidente|2026-09-12`, `dni|50123456Q`…). La extracción guardada falla a propósito en 4 mensajes (A-02, A-13, B-10, C-15) para que la ficha enseñe qué falta o sobra.
> - La seudonimización usa las mismas direcciones que las entidades y reconoce más terceros («El otro conductor es», «se llama»): ningún nombre ni dirección nuevos salen en claro hacia el modelo.
> - EN y DE: los textos traducidos solo se amplían; las direcciones españolas se dejan tal cual. El motor local de entidades acierta lo mismo en los tres idiomas (94 % de las entidades esperadas) y `tests/motores-idioma.test.js` lo comprueba con ±2 puntos. Las citas de fecha de una sola palabra («ayer», «anoche») se alargan a la expresión completa, porque el motor de idiomas toma las palabras sueltas en minúsculas por claves y no las traduce.
> - Tokens de los resultados guardados recalculados: entrada +787 por el prompt más el texto añadido; salida, el JSON de las entidades.

Dos cambios que van juntos:

- **A. Extracción detallada.** Además de los 10 campos de hoy, el triaje devuelve todas las entidades del mensaje: personas, documentos de identidad, matrículas, direcciones, organizaciones, teléfonos, emails, identificadores (póliza, expediente, denuncia, IBAN, tarjeta sanitaria), importes y **todas las fechas con su papel** (fecha del accidente, del robo, de la denuncia, de contratación…).
- **B. Mensajes más ricos.** Se reescriben los textos de la demo para que contengan esas entidades, sobre todo en los paquetes B y C.

## Punto de partida

| | Hoy |
|---|---|
| Esquema | `datos_extraidos` con 10 campos y una sola fecha (`fecha_hecho`). Sin DNI, matrícula, dirección ni personas distintas del cliente. |
| Mensajes | 51 (A 13, B 23, C 15). El paquete A ya trae DNI en 6 mensajes, matrículas en 5 y direcciones en 4. B y C son textos de 160–430 caracteres: ningún DNI, matrícula en 14, dirección en 7, casi siempre una sola fecha. |
| Detector de datos personales | `core/cumplimiento.js` ya reconoce email, DNI, NIE, teléfono, IBAN, tarjeta sanitaria, póliza, matrícula, expediente y direcciones (solo `C/`, calle, avenida, plaza). Sirve para la seudonimización y el inventario RGPD; no devuelve nada al tramitador. |
| Motor local | `core/motor-local.js` saca una fecha del hecho, importe, documentos, terceros y lesionados con las expresiones de `locales/<idioma>/motor.js`. |
| Fechas | `core/fechas.js` desplaza al día de hoy las formas ISO, `dd/mm` (solo meses 05–09), «12 de septiembre», «el jueves 10», «día 8», `mm/aaaa`, «julio de 2026». |

## A. Esquema de entidades

Se **añade** un bloque `entidades` a `datos_extraidos`; los 10 campos actuales se quedan (las reglas A2/H2, los datos esenciales, el ahorro y el panel los usan). `fecha_hecho` pasa a ser un atajo: la fecha de tipo `hecho` (o `robo`, `descubrimiento_dano`, `atencion_medica` según el ramo).

```json
"entidades": {
  "fechas": [
    { "valor": "2026-09-12", "hora": "18:30", "tipo": "accidente", "precision": "exacta", "cita": "El sábado 12 de septiembre, sobre las 18:30" },
    { "valor": "2026-09-13", "hora": null, "tipo": "presupuesto", "precision": "relativa", "cita": "ayer me dieron el presupuesto" }
  ],
  "personas":       [{ "nombre": "Marta Gil Sanz", "rol": "tomador", "dni": "50123456-Q", "telefono": "619 554 210", "email": null, "cita": "Me llamo Marta Gil Sanz" }],
  "vehiculos":      [{ "matricula": "4521 KLM", "marca_modelo": "Seat León", "rol": "asegurado", "cita": "Seat León 4521 KLM" }],
  "direcciones":    [{ "texto": "C/ Toledo 84, 3.º B, 28005 Madrid", "tipo": "domicilio", "via": "C/ Toledo", "numero": "84", "cp": "28005", "municipio": "Madrid", "cita": "…" }],
  "lugares":        [{ "texto": "M-30 a la altura del Puente de Segovia", "tipo": "lugar_hecho", "cita": "…" }],
  "organizaciones": [{ "nombre": "Autos Carabanchel", "tipo": "taller", "cita": "El taller Autos Carabanchel" }],
  "identificadores":[{ "tipo": "poliza" | "expediente" | "denuncia" | "atestado" | "iban" | "tarjeta_sanitaria" | "factura", "valor": "AU-483920", "cita": "…" }],
  "importes":       [{ "valor": 1350, "moneda": "EUR", "concepto": "presupuesto" | "factura" | "franquicia" | "valor_bienes" | "reembolso", "cita": "1.350 €" }]
}
```

Correspondencia con el estándar NER: `personas` = PER, `direcciones` y `lugares` = LOC, `organizaciones` = ORG, `fechas` = DATE/TIME, `importes` = MONEY. DNI/NIE, matrícula, teléfono, email e identificadores son entidades de dominio (lo que en NER sería MISC o entidades personalizadas).

**Catálogo cerrado de tipos de fecha** (en el prompt y en `NO_TRADUCIR`, como los ramos): `accidente`, `robo`, `descubrimiento_dano`, `hecho` (genérico), `denuncia`, `parte`, `comunicacion`, `contratacion_poliza`, `alta_conductor`, `atencion_medica`, `cirugia`, `ingreso`, `alta_medica`, `cita_medica`, `presupuesto`, `factura`, `peritacion`, `ultima_estancia` (vivienda deshabitada), `siniestro_anterior`, `otra`. `precision`: `exacta` | `relativa` («ayer», «hace dos semanas», resuelta contra la fecha de recepción) | `aproximada` («a principios de mes»). Una fecha que el texto no permite situar no se inventa: `valor: null` con la cita.

Roles de persona: `tomador`, `asegurado`, `conductor`, `tercero`, `conductor_contrario`, `testigo`, `lesionado`, `beneficiario`, `medico`, `perito`, `vecino`, `agente`, `otro`. Tipos de dirección/lugar: `domicilio`, `vivienda_asegurada`, `lugar_hecho`, `taller`, `centro_medico`, `comisaria`, `otro`.

Cada entidad lleva su **cita literal** (misma regla que las evidencias de hoy). Así se resalta en el mensaje y se valida: una entidad cuya cita no está en el texto se descarta.

### Validación de la respuesta (`ui/triage/triaje.js`)

Parseo con respaldo, como pide la regla global de LLM: fechas ISO válidas, tipos dentro del catálogo (si no, `otra`), DNI/NIE con letra de control correcta (si falla, se conserva y se marca `control: false`, que es un dato útil para fraude), matrícula con formato español, cita literal presente en el texto, duplicados fusionados. Si `entidades` falta o está mal formado, se rellena con el motor local y la ficha lo indica.

## B. Motor local de entidades (sin IA)

Nuevo `core/entidades.js` (lógica pura, cubierta por `make test`), con las expresiones en una sección nueva `entidades` de `locales/<idioma>/motor.js`:

- Formatos (comunes a todos los idiomas): se reutilizan las expresiones de DNI, NIE, teléfono, email, IBAN, póliza, matrícula y expediente de `core/cumplimiento.js`, sacándolas a un sitio compartido para no tenerlas dos veces.
- Fechas: se reutilizan las formas de `core/fechas.js` y se añade el **contexto**: palabras en una ventana alrededor de la fecha que apuntan a cada tipo («me robaron», «contraté», «me operaron», «puse la denuncia», «el presupuesto»…), por idioma. Relativas («ayer», «hace N días») resueltas contra `fecha_recepcion`.
- Direcciones: se amplía la lista actual (paseo, camino, ronda, travesía, carretera, urbanización, avenida abreviada `Avda.`, `n.º`, CP de 5 dígitos, municipios fuera de Madrid). La misma ampliación mejora la seudonimización.
- Personas: nombre del remitente + nombres propios tras disparadores («me llamo», «el otro conductor es», «mi hijo», «Dr./Dra.», «el perito»…), que ya existen en parte en `nombreTercero`.
- Organizaciones: disparadores («el taller», «la Clínica», «Hospital», «Mutua», «comisaría de»).

El motor local no llegará al nivel del modelo en personas y organizaciones; la ficha lo dice («extracción determinista»).

## C. Prompt

`PROMPT_BASE` pasa a **`reglas v2.4`**: se amplía el punto 2 («EXTRAER LOS DATOS») con el bloque `entidades`, el catálogo de tipos de fecha y la instrucción de citar literal. En modo seudonimizado el modelo copia los marcadores tal cual (como hoy) y la plataforma los reconstruye. Se actualiza la versión en `gobierno.js` (control `ria-10`) y en `locales/*/datos-prompts.js`.

## D. Mensajes de la demo

Reglas de reescritura:

1. **No cambia ninguna decisión.** Mismo ramo, mismo resultado por regla, mismo importe, mismo plazo entre hecho y recepción (A2/H2), mismos indicadores de fraude y score. `esperado` no se toca.
2. Cada mensaje gana lo que encaja con su canal: un email o formulario web lleva nombre completo, DNI, dirección y matrícula; un WhatsApp o chat lleva menos (nombre, matrícula, alguna dirección) y escrito como se escribe ahí.
3. **Al menos dos fechas con papeles distintos** en la mayoría (hecho + denuncia, hecho + presupuesto, contratación + cirugía, último día en la vivienda + descubrimiento del daño).
4. Personas secundarias con nombre: otro conductor, vecino, testigo, médico, perito.
5. Fechas solo en las formas que `core/fechas.js` desplaza. Si hace falta un mes fuera de 05–09 en `dd/mm` (p. ej. una contratación en febrero), se amplía la expresión, no se escribe en otra forma.
6. Datos ficticios con formato válido: DNI con letra de control correcta, matrículas de la serie actual, CP reales del municipio, teléfonos 6xx/9xx de ejemplo.
7. Longitud: B y C pasan de 160–430 a 350–650 caracteres; A crece poco.

Ejemplo, MSG-B-07 (chat):

> Hoy: «Hoy al maniobrar para aparcar en mi calle he dado contra un bolardo y se me ha hundido el paragolpes trasero. No hay nadie más implicado. Fiat 500 9921 LLB, póliza AU-540098 a todo riesgo con franquicia. Fotos adjuntas. El taller dice 1.100 €.»
>
> Propuesta: «Hola, soy Irene Castro Mena (DNI 71294580-P). Hoy al maniobrar para aparcar en mi calle, Paseo de la Florida 23 (28008 Madrid), he dado contra un bolardo y se me ha hundido el paragolpes trasero. No hay nadie más implicado. Fiat 500 9921 LLB, póliza AU-540098 a todo riesgo con franquicia, contratada el 2 de marzo. Fotos adjuntas. El taller Talleres Florida me ha dado presupuesto esta tarde: 1.100 €.»
>
> Entidades: persona (tomador, DNI), dirección (lugar del hecho, coincide con domicilio), vehículo, póliza, organización (taller), fechas `accidente` (hoy), `contratacion_poliza` (02/03) y `presupuesto` (hoy), importe `presupuesto`.

### Lo que arrastra cambiar un texto

- `data/demo/resultados.js`: cada cita de `ev`, `c` y `adj.contraste` tiene que seguir siendo literal; se revisan las 51 fichas. Se añade `ent` (formato compacto como el resto) con las entidades esperadas.
- `data/demo/fraude.js` y las señales de relato: se comprueba que ningún texto nuevo dispara un indicador que no tenía.
- Seudonimización e inventario RGPD (`core/cumplimiento.js`): crecen los datos personales detectados. Se calcula en vivo, pero cambian las cifras del panel («N datos personales detectados») y de la guía; se revisan los textos que las citan.
- `tok` de los resultados guardados: más texto y más salida. Se recalculan con el mismo ratio que la respuesta real del benchmark.
- `data/generated/recorrido.js` y guiones: `make recorrido` y `make guion`.
- EN y DE: los 51 textos y las citas quedan desactualizados por huella. Lote completo de traducción (`datos-mensajes`, `datos-resultados`, `datos-prompts`, `datos-recorrido`, `datos-guion`) y sección `entidades` de `locales/en|de/motor.js` hasta que pase `tests/motores-idioma.test.js`.

## E. Interfaz (pestaña «Datos extraídos» de la ficha)

- Arriba, los 10 campos de hoy (sin cambios).
- **Cronología de fechas**: una línea por fecha con su tipo, valor, precisión y la cita; recepción y procesado marcados al final para ver de un vistazo el plazo A2/H2.
- Tablas por tipo de entidad: personas (rol, DNI/NIE con aviso si la letra no cuadra, contacto), vehículos, direcciones, organizaciones, identificadores, importes.
- En la pestaña «Mensaje», resaltado por tipo de entidad (un color por tipo, leyenda), sumado al resaltado de evidencias actual con un conmutador «Evidencias / Entidades».
- Datos personales en claro en la ficha, como hoy: es la vista del tramitador. Siguen ocultos en lo que se envía al modelo (seudonimización) y en la traza guardada (`enmascarar`); las entidades nuevas entran en ambos.
- Todas las etiquetas en `locales/es/ui-triaje.js`; tipos de fecha y roles como claves (`entidad.fecha.accidente`…).

## F. Pruebas

- `tests/entidades.test.js`: por mensaje, el motor local encuentra las entidades de formato (DNI, matrícula, teléfono, email, póliza, IBAN) al 100 % y las fechas con su tipo esperado; validación de DNI/NIE.
- `tests/recorrido.test.js` y los de cumplimiento/fraude siguen dando lo mismo (decisiones, scores).
- `tests/motores-idioma.test.js` amplía la comparación a las entidades: mismo conjunto de entidades y tipos de fecha en ES, EN y DE.
- Opcional (D6): `esperado.entidades` por mensaje y una métrica de exactitud de extracción (precisión y cobertura por tipo) en la ficha y en `tests/benchmark/ia-real.js`.

## Fases

| # | Fase | Resultado |
|---|---|---|
| 1 | Esquema y catálogo de tipos | Este documento cerrado; catálogo en `core/entidades.js` y `NO_TRADUCIR` |
| 2 | Reescritura de los 51 mensajes (ES) y ajuste de citas en `resultados.js` | `make test` pasa con las mismas decisiones |
| 3 | Motor local de entidades + pruebas | `tests/entidades.test.js` en verde |
| 4 | Prompt v2.4 + validación de la respuesta | Llamada real con un mensaje de cada ramo devuelve entidades válidas |
| 5 | Resultados guardados `ent` de los 51 mensajes | Generados con el modelo vía benchmark y revisados a mano |
| 6 | Interfaz de la ficha | Captura de la ficha de MSG-A-01 y de un mensaje B y uno C |
| 7 | Panel, recorrido, guiones | Cifras de datos personales y versión de prompt cuadradas |
| 8 | EN y DE | `make i18n-check IDIOMA=en,de` estricto y `make i18n-marcar` |

## Decisiones tomadas

- **D2**: extracción dentro de la llamada de reglas. Los resultados guardados (`ent` de los 51 mensajes) los extrae Claude Opus 5.5 en la propia sesión de trabajo, leyendo cada mensaje, sin pasar por la API ni por el benchmark (sustituye a D5).
- **D7**: los datos son inventados; en los resultados guardados se extraen todas las entidades sin restricción.

## Decisiones (aceptadas según la recomendación)

- **D1. Esquema**: añadir `entidades` junto a los campos actuales (recomendado: no rompe reglas, ahorro ni panel) o sustituirlos.
- **D2. Llamada al modelo**: extracción dentro de la llamada de reglas (recomendado: sin latencia extra, un solo prompt versionado) o paso propio con un modelo pequeño configurable (`MODEL_EXTRACCION`), que sería un agente más en el panel de gobierno.
- **D3. Alcance de la reescritura**: los 51 mensajes (recomendado) o solo B y C.
- **D4. DNI en canales informales**: en WhatsApp y chat solo cuando el cliente lo daría de forma natural (recomendado) o en todos.
- **D5. Resultados guardados**: generar `ent` con el modelo y revisar (recomendado) o escribirlos a mano.
- **D6. Medir la extracción**: añadir `esperado.entidades` y la métrica de exactitud (recomendado para la demo de gobierno) o dejarlo fuera.
- **D7. Minimización**: extraer DNI y direcciones es tratar más datos personales. Propuesta: se extraen, se enmascaran en la traza y en pantalla según permiso, y el control `rgpd-5c` del panel lo refleja. Alternativa: extraer solo los que usa alguna regla.
