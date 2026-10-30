# Plan · Demo en español, inglés y alemán

Estado: **fase 0 aplicada** · 30/10/2026 · repo `fnol-triage/v2` · añadido el modo de trabajo: español primero y actualización de EN y DE por lotes (sección 8) · variable `IDIOMA` (no `LANG`, que choca con el locale del sistema)

Objetivo: la demo funciona igual en ES, EN y DE. Cambia la lengua y nada más: mismos mensajes, mismas decisiones, mismos números en el panel de gobierno, mismo recorrido. Ningún texto visible en los HTML. Añadir un cuarto idioma se reduce a crear una carpeta y pasar un validador.

---

## 1. Qué hay hoy

| Dónde | Volumen | Qué depende del idioma |
|---|---|---|
| `index.html`, `gobierno.html`, `intro.html` | ~1.330 líneas | Títulos, etiquetas, placeholders, `aria-label`, `<title>`, `meta description` |
| `app.js`, `gobierno.js`, `shell.js`, `cumplimiento.js`, `fraude.js`, `intro.js` | ~6.700 líneas | Literales dentro de las plantillas HTML; ~15 llamadas con `'es-ES'` fijo |
| `data/mensajes.js` | 51 mensajes en 3 paquetes, 38 KB | Texto del cliente, asuntos, adjuntos (parte amistoso, facturas) |
| `data/resultados.js` | 83 KB | Citas literales, notas, motivos, criterios, contraste con adjuntos |
| `data/gobierno.js` | 134 KB | Textos del panel mezclados con números ya formateados (`'99,5 %'`, 105 casos) |
| `data/fraude.js` | 19 KB | Catálogo de indicadores, escenarios, cola de la SIU |
| `data/recorrido.js` ← `_docs/guion-demo.md` | 78 KB / 80 KB | Pasos y subtítulos del modo presentador |
| `prompts.js` | 12 KB | Instrucciones al modelo |
| Motor local (`app.js`) | — | Palabras clave por ramo, meses, «ayer», negaciones de «heridos» |
| `fechas.js` | — | Reconoce fechas escritas en español («sábado 12 de septiembre») para desplazarlas a hoy |
| `fraude.js` | — | Señales de relato por cita literal («no sé cuánto», «que venga alguien hoy») |

Unos 445 KB de contenido por idioma, más los literales del código. Es mucho volumen, pero se puede hacer: son unos 150.000 tokens de texto por idioma, repartidos en varias sesiones con una comprobación automática al final de cada una.

---

## 2. Tu propuesta y lo que cambio de ella

Propones recrear la base completa en cada idioma volviendo a analizar los paquetes. Lo hago, con un ajuste para que los tres entornos sean idénticos de verdad:

- **Los hechos se escriben una sola vez.** Ids, canal, fechas, importes, pólizas, matrículas, ramo esperado, decisión, resultado de cada regla, confianza, tokens, métricas, trazas, costes y scores de fraude van en una base neutra sin texto. Si cada idioma tuviera su copia completa, bastaría con que un número difiriera en una sola copia para que el panel de EN no cuadrara con el de ES.
- **El texto se escribe de nuevo en cada idioma.** Los 51 mensajes los redacto como los escribiría un cliente en inglés o en alemán: con su registro, sus prisas y sus erratas en WhatsApp, no traducidos frase a frase. Mantienen los mismos hechos y las mismas señales que disparan reglas e indicadores. Después rehago el análisis sobre ese texto: citas, notas, motivo, criterios de ramo y contraste con adjuntos, ajustados al resultado que fija la base.
- **Un validador lo comprueba todo** (`make i18n-check`). Si una cita no aparece literalmente en el mensaje de su idioma, falla. Si falta una clave o sobra un número, también.

El español se migra a la nueva estructura de forma mecánica, sin reescribirlo: el contenido ya está afinado y sirve de referencia.

---

## 3. Estructura

```
locales/
  idiomas.js            registro: { es: { nombre: 'Español', locale: 'es-ES' }, en: {...}, de: {...} }
  cargar.js             elige idioma y carga sus scripts antes que el resto
  i18n.js               t(clave, vars), plurales (Intl.PluralRules), formatos (Intl con el locale del registro)
  es/ en/ de/
    ui.js               textos de interfaz, claves con espacio de nombres: 'triaje.contadores.aprobados'
    prompts.js          prompts del modelo en ese idioma
    motor.js            expresiones del motor local: ramo, meses, «ayer», formato de importe, negaciones,
                        documentos, terceros y el patrón de cada regla (A3, A4, H2–H5, S2–S8)
    fechas.js           patrones de fecha escrita para fechas.js
    fraude-relato.js    expresiones de las señales de relato
    mensajes.js         texto de los 51 mensajes y de sus adjuntos, por id
    resultados.js       citas, notas, motivos y criterios, por id
    gobierno.js         textos del panel, por id de agente, alerta, cap, guardrail, evento...
    fraude.js           textos del catálogo, escenarios y cola SIU
    recorrido.js        GENERADO desde _docs/<idioma>/guion-demo.md
data/base/
  mensajes.js           hechos de cada mensaje (sin texto)
  resultados.js         decisión, reglas, confianza, tokens, ref de cada evidencia
  gobierno.js           métricas y series como números, no como cadenas formateadas
  fraude.js             pesos, scores, umbrales, histórico
```

Reglas de diseño:

- **Valores internos sin traducir.** `'Auto'`, `'Hogar'`, `'Salud'`, `'DESPEJADO'`, `'REVISION'`, A1…S8, IF-01…, G-01… siguen siendo claves. Solo cambia la etiqueta que se muestra. El JSON exportado, los filtros y los tests no se tocan.
- **HTML sin texto.** Solo estructura y atributos `data-i18n="clave"` y `data-i18n-attr="title:clave;aria-label:clave"`. `i18n.js` los rellena al cargar. El validador falla si encuentra un nodo de texto visible en un HTML.
- **Números como números.** Los `'99,5 %'` y `'0,0006 €'` de `data/gobierno.js` pasan a `0.995` y `0.0006`, y se formatean con el locale del idioma activo (`99.5%` en EN, `99,5 %` en DE).
- **Motor local partido en dos.** La lógica de las reglas (umbrales, combinaciones, decisión) se queda en `app.js`. Las expresiones van en `motor.js` de cada idioma. En alemán, límites de palabra Unicode (flag `u`, `\b` no reconoce «Ä») y búsqueda de raíz dentro de palabras compuestas («Wasserrohrbruch»).
- **Si falta una clave**, se muestra la del español y se avisa en consola. El validador no deja pasar ninguna.
- **Cambio de idioma con recarga.** Se guarda en `localStorage` y se puede forzar con `?lang=en`. Recargar evita tener que repintar en caliente el estado de tres páginas. Funciona igual abriendo los HTML desde disco, sin servidor ni paso de compilación.

### Selector

Botones `ES | EN | DE` en la cabecera, generados a partir de `locales/idiomas.js` (un idioma nuevo aparece solo). Lo pinta `shell.js`, que ya comparten las tres páginas, así que sale en `index.html`, `gobierno.html` e `intro.html`.

### Añadir un idioma en el futuro

1. Copiar `locales/en/` a `locales/fr/` y añadir `fr` a `idiomas.js`.
2. Escribir `_docs/fr/guion-demo.md` y ejecutar `make recorrido IDIOMA=fr`.
3. `make i18n-check` dice qué falta, hasta que pasa limpio.

Lo documento en `_docs/tecnica/i18n.md` y actualizo el diagrama C4 de contenedores en `_docs/arquitectura.md`.

---

## 4. Validador `scripts/i18n-check.js` (`make i18n-check`, se añade a `make test`)

- Mismas claves en `ui.js` de todos los idiomas y mismos marcadores `{n}`, `{ramo}` en cada traducción.
- Cada id de `data/base/` tiene su texto en todos los idiomas, y no hay textos sin base.
- Cada cita de evidencia, de contraste de adjuntos y de indicador de fraude se localiza en el mensaje de su idioma con `Evidencias.localizar`, la misma función que usa la ficha.
- El motor local de cada idioma da, en cada mensaje de su idioma, el mismo resultado que el motor en español: ramo, resultado de cada regla, importe, fecha y decisión. La referencia es el motor en español, no la IA, porque ya hoy difieren en algunos mensajes.
- `fechas.js` reconoce y desplaza en cada idioma las mismas fechas que en español.
- Los HTML no tienen texto visible.
- Restos de otro idioma: avisa si en `en/` aparecen `ñ`, `¿` o palabras frecuentes del español, y lo mismo para `de/`.

- Traducciones desactualizadas: cada texto traducido guarda la huella (hash) del texto español del que sale. Si el español cambia y la traducción no, la huella deja de coincidir y la clave sale como desactualizada. Sin esto, una clave cuyo texto español cambia de sentido seguiría pasando, porque existe en los tres idiomas.

Dos niveles (ver sección 8):
- **Estricto** para el español y para todo lo común: base, HTML sin texto, tests. Bloquea el commit.
- **Aviso** para EN y DE mientras se trabaja solo en español. No bloquea. `make i18n-check IDIOMA=en` lo pasa a estricto para ese idioma.

Los tests actuales (`evidencias`, `fraude`, `fechas`, `recorrido`, `cumplimiento`) pasan a ejecutarse en los tres idiomas.

---

## 5. Prompts y modelo real

- Un prompt por idioma, con el mismo esquema JSON y los mismos valores de enumeración. El modelo responde en ese idioma los campos libres: motivo, notas y criterios.
- Comprobación opcional con el modelo real: `make test-ia IDIOMA=en` pasa el paquete A por Azure y compara ramo, decisión y reglas incumplidas con la base. Necesita tus variables `TRIAGE_*`. Si el modelo no coincide en algún mensaje de EN o DE, ajusto la redacción de ese mensaje y nunca la base.

---

## 6. Decisiones que necesito

**D1. Escenario de los mensajes en EN y DE.**
- (a) **Recomendado.** Aseguradora española y clientes escribiendo en inglés o en alemán: residentes extranjeros, turistas o, sin más, la demo en otra lengua. Se mantienen DNI/NIE, M-30, LCS art. 16 y los 7 días. Es la única opción con reglas y resultados idénticos.
- (b) Localizar a cada mercado: Londres y Múnich, VVG alemana, otros plazos. Se rompe la igualdad, porque cambian reglas, plazos y decisiones, y en la práctica son tres demos distintas.

**D2. Nombres de personas.** Mantener los españoles (Marta Gil Sanz) o adaptarlos al idioma (Martha Gill, Martina Gilg). Recomiendo mantenerlos: los marcadores de seudonimización, los cruces de fraude por nombre y teléfono y el guion los usan igual en todos los idiomas.

**D3. Alcance.** Los tres paquetes (51 mensajes) o solo el paquete A (13, el que usa el recorrido y el panel de gobierno). Recomiendo los tres, empezando por el A.

**D4. Rama.** Todo en una rama `i18n`, con un commit por fase. `main` sigue sirviendo la demo en español mientras tanto.

---

## 7. Fases

Cada fase termina con la demo funcionando y `make test` en verde.

| Fase | Qué | Cómo se comprueba |
|---|---|---|
| 0 | `locales/`, `cargar.js`, `i18n.js`, selector en `shell.js`, esqueleto del validador | La demo sale igual y el selector cambia `<html lang>` |
| 1 | Migración del español: HTML a claves, literales del código a `es/ui.js`, datos separados en base + texto `es` | Capturas de las tres páginas antes y después (`scripts/capturas.mjs`): tienen que salir iguales |
| 2 | Inglés: `ui`, prompts, motor, fechas, mensajes reescritos, análisis rehecho, gobierno, fraude, guion y recorrido | `make i18n-check` limpio; repaso de las tres páginas y del recorrido completo en el navegador |
| 3 | Alemán: lo mismo | Igual, más revisión a 375 px de ancho: el alemán ocupa un 30 % más y hay que vigilar botones, pestañas y contadores |
| 4 | Opcional: paquete A con el modelo real en EN y DE | Informe de coincidencias con la base |

La fase 1 es la de más riesgo, porque toca unas 8.000 líneas de código, pero no cambia nada visible y las capturas lo demuestran. Las fases 2 y 3 son sobre todo redacción y análisis, con el validador como red.

Fuera de alcance: los Word del guion, las slides y `_docs/tecnica` (se pueden generar después desde el guion de cada idioma).

---

## 8. Modo de trabajo después del multidioma

Se trabaja en español y EN y DE se ponen al día de vez en cuando, por lotes.

### Lo que se cumple siempre, también trabajando solo en español

- Todo texto nuevo entra como clave en `locales/es/`. Nada en los HTML ni como literal en el código.
- Los hechos nuevos (importes, decisiones, reglas, métricas) van en `data/base/`.
- `make i18n-check` en estricto para el español y lo común. Va en `make test`. El repo no tiene pre-commit ni CI; cuando se añadan, `make test` irá en los dos.

Si esto se respeta, ponerse al día es solo traducir. Si no, cada actualización obliga a volver a sacar textos del código.

### Entre actualizaciones

- EN y DE en modo aviso: el commit pasa aunque falten claves.
- La demo en EN o DE sigue funcionando. Lo que no está traducido sale en español y se avisa en consola.

### Ponerse al día

1. `make i18n-estado` saca, por idioma:
   - claves que faltan;
   - traducciones desactualizadas (la huella no coincide);
   - mensajes cuyo texto o análisis ha cambiado en español desde la última actualización, con el diff.
   El informe pone primero lo que contradice a la base, por ejemplo un motivo que dice «cumple» cuando la regla ahora incumple.
2. Actualizo EN y DE de una vez: traduzco claves, reescribo los mensajes que hayan cambiado y rehago sus citas.
3. `make i18n-check IDIOMA=en` y `IDIOMA=de` en estricto, hasta que pasan.
4. Se guarda el commit de referencia en `locales/<idioma>/estado.json` (`{ "sincronizado_con": "<sha>", "fecha": "..." }`). La siguiente actualización parte de ahí.

### Cuándo actualizar

- **Siempre antes de enseñar la demo en inglés o alemán.** Ese idioma tiene que pasar el validador en estricto.
- **Cuando se acumulen cambios en mensajes o resultados.** Son lo más caro de actualizar: cada mensaje cambiado en español se reescribe en EN y DE y se rehacen sus citas. Mejor pocos cada vez.
- Los cambios en `data/base/` no necesitan actualización de los números, que valen para todos los idiomas, pero sí revisar los textos que los explican. El informe los señala.

### Para que no dependa de memoria

- `CLAUDE.md` del proyecto (ahora no existe) con estas reglas: texto solo en `locales/`, hechos solo en `data/base/`, `make i18n-check` en verde, y cómo ponerse al día.
- Nota en la memoria de Claude apuntando a ese `CLAUDE.md`.

### Se añade a las fases

- Fase 0: huella en el formato de `ui.js` y de los textos de contenido, modo aviso/estricto en el validador, `make i18n-estado`, `estado.json` y `CLAUDE.md`.
