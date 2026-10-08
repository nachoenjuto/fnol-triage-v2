# Plan: landing del panel, Resumen actualizado, menús iguales y modal de KB estable

> Estado (08/10/2026): **implementado** con las decisiones confirmadas: menú del triaje a 248 px con «Editar en grande», la landing se abre por defecto, las alertas reúnen todas las fuentes y sin botón de recorrido de la demo.

## 1. Menús del mismo ancho

Los dos menús pasan a **248 px**, el ancho actual de observabilidad (hoy el del triaje mide 340 px).

**Riesgo:** el menú del triaje contiene formularios.
- Los desplegables de «Configuración» tienen opciones largas («Automático — IA si está configurada…»): el texto seleccionado se recortará con «…», pero al abrirlos la lista se ve entera.
- Los cuatro **editores de prompt** quedarían muy estrechos para trabajar. Propongo añadir en cada uno un botón **«Editar en grande»** que abre el texto en una ventana modal ancha, con «Guardar» y «Restaurar original».

## 2. Modal de Knowledge bases estable

Al cambiar de pestaña (Salud, Configuración, Comparativa…) la ventana cambia de alto, y a veces de ancho, porque se ajusta al contenido.

Arreglo:
- **Tamaño fijo:** ancho `min(1120px, 94vw)` y alto `min(780px, 88vh)` en `#modal-kb`.
- **Partes fijas:** la cabecera, la fila de pestañas y la barra de «Acciones» no se mueven; solo hace scroll el contenido de la pestaña.
- **Scroll arriba:** al cambiar de pestaña, el contenido vuelve al principio.

Aplico la misma regla al modal de la rúbrica y al de la ficha de cumplimiento, para que se comporten igual.

## 3. Landing («Inicio»)

Una sección nueva, **Inicio**, primera del menú (icono `house`) y la que se abre al entrar en `gobierno.html`. Es la puerta de entrada del panel: una ficha por cada sección del menú, agrupadas por la pregunta a la que responden.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Gobierno de los agentes del triaje FNOL                                      │
│ Qué pasa, por qué, con qué límites, con qué conocimiento, si cumple y cuánto │
│ cuesta. Estado ahora: ● 1 crítica · ● 6 avisos · cumplimiento 88 %           │
│ [Ver el Resumen]  [Recorrido de la demo (12 min)]                            │
└──────────────────────────────────────────────────────────────────────────────┘
 VER                          ENTENDER                     LIMITAR
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ ▦ Resumen            │    │ ⌁ Trazabilidad       │    │ ⇅ Autonomía          │
│ Vista de dirección   │    │ ¿Qué pasó con este   │    │ ¿Cuánta libertad     │
│ en una pantalla      │    │ mensaje?             │    │ tiene cada agente?   │
│ 81 % autonomía       │    │ 13 trazas · 2 con    │    │ 2 en L3 · 2 en L2    │
│ 3 alertas  ● crítica │    │ incidencia           │    │ override 2,1 %       │
│            Abrir →   │    │            Abrir →   │    │            Abrir →   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ 🤖 Agentes           │    │ 🧠 Reasoning & Replay│    │ 🛡 Guardrails        │
│ 4 agentes · 1 degr.  │    │ 8 replays · 0 cambios│    │ 8 de 9 activos       │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
 CONOCER                      DEMOSTRAR                    PAGAR · AUDITAR
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ 📖 Knowledge bases   │    │ 🌡 Termómetro de     │    │ € FinOps             │
│ 5 de 9 sanas         │    │ cumplimiento  88 %   │    │ 215 € · 3 caps sup.  │
│ ● KB-06 crítica      │    │ 7 controles parciales│    ├──────────────────────┤
└──────────────────────┘    └──────────────────────┘    │ ⟲ Histórico          │
                                                        │ 42 eventos · último  │
                                                        │ hace 2 h             │
                                                        └──────────────────────┘
```

Cada ficha lleva:
- icono y nombre (los mismos del menú);
- **la pregunta que responde**;
- **2 cifras en vivo**, calculadas con los mismos datos que su sección (cambian con la fuente Demo, Sesión o Archivo);
- un **semáforo** si hay algo que mirar;
- sus **etiquetas de norma**;
- «Abrir →».

Toda la ficha se puede pulsar.

## 4. Resumen reorganizado

Sigue siendo la vista de dirección en una pantalla, ahora con las cosas nuevas. De arriba abajo:

1. **KPI: 8 en lugar de 6.**
   - Se mantienen: Mensajes, Autonomía efectiva, Escalados, Overrides, Coste frente al cap y Alertas.
   - Se añaden: **Cumplimiento** (88 %, 7 controles parciales) y **Conocimiento** (5 de 9 KB sanas, 1 crítica).
   - Cada uno lleva a su sección.
2. **Agentes**: las 4 tarjetas actuales con kill switch. Un clic lleva a su pestaña en «Agentes».
3. **Coste diario frente al cap | Alertas activas.** Las alertas pasan a **reunir todas las fuentes**: caps superados (como hoy), KB críticas o degradadas (KB-06 Red de talleres caída, KB-02 con recall a la baja) y controles de cumplimiento parciales destacados (EIPD pendiente, aviso de IA en WhatsApp). Cada alerta lleva a su origen.
4. **Nueva fila: Cumplimiento | Conocimiento.**
   - **Cumplimiento:** los 4 termómetros en pequeño, los 3 controles parciales más relevantes, los datos personales del periodo (total, de salud y de menores) y el estado de la cadena de integridad (✓ íntegra). Enlace al Termómetro.
   - **Conocimiento:** las KB con problemas y su motivo en una línea, y el acuerdo juez-humano medio de las rúbricas. Enlace a Knowledge bases.
5. **Últimas trazas** con dos columnas nuevas: **datos personales** (por ejemplo «6 · 1 salud») y **KB usadas** (número). Un clic abre la ficha explicada, que ya tiene el botón «Cumplimiento».

Las etiquetas de norma de cada bloque se mantienen y se añaden las nuevas: AI Act art. 10 en Conocimiento y RGPD art. 9 en Cumplimiento.

## 5. Orden de trabajo

1. Menús iguales y «Editar en grande» de los prompts.
2. Modal de KB estable (y los otros dos).
3. Resumen reorganizado.
4. Landing.
5. Documentación: guía, README, C4 y guion.

## 6. Decisiones que necesito que confirmes

1. Menú del triaje a 248 px **con «Editar en grande»** para los prompts. ¿Te vale?
2. ¿La landing se abre **por defecto** al entrar en observabilidad, o prefieres que se siga abriendo el Resumen y que la landing sea solo la primera opción del menú?
3. ¿Las alertas del Resumen deben **reunir todas las fuentes** (caps, KB y cumplimiento) o solo las de coste, como hoy?
4. ¿Ponemos el botón «Recorrido de la demo» en la landing (abre los 12 minutos de la guía como una lista de pasos con enlaces)?
