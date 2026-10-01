# Slides de la sesión FNOL

Nueve slides para los 15 minutos de presentación. Cada slide lleva título, contenido y notas del ponente. Guion completo y fuentes en [guion-sesion.md](guion-sesion.md).

---

## Slide 1 · FNOL con agentes gobernados

**De la IA que clasifica a la IA que se puede poner en producción**

- El problema
- El marco normativo
- La solución
- La demo

> **Notas (0-1 min):** «Hoy no os voy a enseñar que la IA clasifica un siniestro. Eso ya lo sabéis. Os voy a enseñar cómo se pone en producción en una aseguradora.»

---

## Slide 2 · La avalancha de avisos

| | |
|---|---|
| **~11 M** | siniestros de Auto al año en España |
| **1 cada 3 s** | ritmo al que el seguro atiende un percance en carretera |
| **5 canales** | email, WhatsApp, chat, formulario web y teléfono |
| **7 días** | plazo para comunicar el siniestro (art. 16 LCS) |
| **10-12 %** | de la prima se va en gestionar siniestros (Auto) |

Cada aviso hay que leerlo, clasificarlo por ramo, extraer los datos y aplicar las reglas de la póliza.

> **Notas (1-3 min):** «Cada mensaje lo lee, lo clasifica y lo teclea una persona. Ahí se va el tiempo y el dinero. Y el cliente espera respuesta en horas, no en días.»
>
> *Fuente: UNESPA (siniestros de automóvil). El 10-12 % viene de fuente secundaria: verificar antes de presentar.*

---

## Slide 3 · Clasificar ya está resuelto

- Un prompt bien escrito clasifica por ramo y extrae datos con más de un 90 % de acierto
- Funciona con texto informal, faltas de ortografía y transcripciones telefónicas
- Se monta en una tarde

**Esto ya no diferencia a nadie.**

> **Notas (3-4 min):** Ir rápido. La idea es quitar de la mesa la pregunta «¿la IA puede hacerlo?» para pasar a la que importa.

---

## Slide 4 · El problema real: de piloto a producción

| | |
|---|---|
| **>90 %** | de las aseguradoras prueba IA |
| **22 %** | la tiene en producción |
| **4 %** | tiene agentes en producción |
| **>40 %** | de los proyectos agénticos se cancelarán antes de 2027 (Gartner) |

Motivos de cancelación según Gartner: **costes que se disparan · valor poco claro · riesgo sin controlar**

> **Notas (4-6 min):** «Los proyectos no mueren porque la IA falle. Mueren porque nadie puede responder tres preguntas: ¿por qué decidió eso?, ¿quién lo controla?, ¿cuánto cuesta?» Estas tres preguntas son el hilo de toda la sesión.

---

## Slide 5 · Lo que exige la regulación

| Ya en vigor | Lo que llega |
|---|---|
| **RGPD art. 22**: derecho a no ser objeto de decisiones solo automatizadas. Según el TJUE (SCHUFA), firmar sin revisar no cuenta como intervención humana | **AI Act, alto riesgo** (Anexo III): obligaciones aplazadas al 2/12/2027 por el Digital Omnibus |
| **RGPD art. 15**: derecho a una explicación con sentido de la lógica aplicada (Dun & Bradstreet) | **Ley Orgánica española de IA**: en el Congreso; AESIA y DGSFP como supervisoras |
| **RGPD art. 9**: datos de salud, categoría especial (ramo Salud) | **Sanciones**: hasta 35 M€ o el 7 % de la facturación global |
| **DORA**: los proveedores de LLM son terceros TIC (registro, concentración, contratos) | |
| **EIOPA (ago. 2025)**: gobierno de la IA proporcional para todo uso en seguros | |
| **AI Act art. 4 y art. 50**: alfabetización en IA y transparencia | |

> **Notas (6-9 min):** «Un humano que firma sin mirar no cuenta como supervisión: lo dijo el TJUE. Y el aplazamiento no es una excusa: quien construya sin gobierno ahora lo rehará en 2027.»
>
> *Cuidado: el triaje de siniestros no está en el Anexo III (solo la tarificación y evaluación de riesgo en Vida y Salud). No decir que el AI Act obliga hoy a todo esto; la obligación de hoy viene del RGPD, DORA y EIOPA.*

---

## Slide 6 · Lo que no existe en el mercado

**Hay piezas sueltas:**
- Observabilidad de LLM
- Plataformas de gobierno y riesgo (GRC) de IA
- Estándar de trazas OpenTelemetry GenAI

**Nadie las une a:**
- **tu** proceso de siniestros
- **tus** reglas de negocio por ramo
- **tu** contabilidad de costes

**Esto no es un producto. Es cómo se trabaja hoy con IA en una empresa regulada.**

> **Notas (9-10 min):** No decir «no existe nada». Existen herramientas; lo que falta es integrarlas con el negocio del cliente. Si alguien pregunta «¿cuánto cuesta?», la respuesta es que es una forma de implementar, no una licencia.

---

## Slide 7 · La solución: agentes pequeños y gobernados

```
Aviso ──► Multicanalidad ──► Clasificación ──► Extracción ──► Reglas ──► Aprobado / A revisar
              │                   │                │             │
──────────────┴───────────────────┴────────────────┴─────────────┴──────────────────────────
     CAPA DE GOBIERNO: trazas · replay · autonomía · guardrails · FinOps · histórico
```

Cada agente tiene:
- una sola función
- su modelo y su versión de prompt
- su nivel de autonomía (L0 Manual → L3 Autónomo)
- un responsable y unos permisos

> **Notas (10-12 min):** «No es una IA que lo hace todo. Son cuatro especialistas, y cada uno tiene sus propios límites.» Al final siempre hay un técnico de seguros: la IA prepara, la persona decide.

---

## Slide 8 · Seis pilares, cada uno con su prueba

| Pilar | Cómo se consigue | Norma | Dónde se ve en la demo |
|---|---|---|---|
| **Seguro por diseño** | Guardrails, kill switch, identidad y permisos por agente | DORA · AI Act art. 15 | Gobierno › Guardrails, Resumen |
| **Compliance por defecto** | Cada decisión deja una traza completa | AI Act art. 12 · RGPD art. 30 | Gobierno › Trazabilidad |
| **Auditable** | Libro de registro con quién, qué y cuándo | EIOPA · AI Act art. 12 | Gobierno › Histórico |
| **Explicable** | Regla + evidencia textual; Reasoning replay | RGPD art. 15 y 22 · AI Act art. 13 | Ficha del mensaje · Reasoning & Replay |
| **Resiliente** | Reintentos, fallback a motor local, degradación de modelo | DORA | Triaje (origen «fallback»), G-07, G-08 |
| **FinOps** | Caps, coste por decisión, comparativa de modelos | Solvencia II (gobierno) | Gobierno › FinOps |

> **Notas (12-14 min):** «Todo lo que voy a decir ahora lo vais a ver funcionando.»

---

## Slide 9 · Vamos a verlo

| Lo que ve el tramitador | Lo que ven riesgos, auditoría y finanzas |
|---|---|
| **Triaje FNOL** | **Gobierno de Agentes** |
| ¿Qué hace el sistema con cada aviso? | ¿Podemos fiarnos, controlarlo y pagarlo? |

> **Notas (14-15 min):** «Primero lo que ve el tramitador. Después lo que ve el auditor y el CFO.» Cambiar a la demo con el motor en «Resultados guardados» y el Paquete A seleccionado.
