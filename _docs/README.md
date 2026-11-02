# Documentación

Organizada por quién la lee. Los guiones de la demo están en español, inglés y alemán; el resto, en español.

| Carpeta | Para quién | Qué hay |
|---|---|---|
| [`architecture/`](architecture/arquitectura.md) | quien evalúa o amplía la solución | diagramas C4 en Mermaid: contexto, contenedores y componentes |
| [`demo/`](demo/guia-demo.md) | quien presenta la demo | [`guia-demo.md`](demo/guia-demo.md): cada pantalla, qué muestra y para qué sirve. Guiones de 30-35 minutos y de bolsillo en [`es/`](demo/es/guion-demo.md), [`en/`](demo/en/guion-demo.md) y [`de/`](demo/de/guion-demo.md) |
| [`technical/`](technical/README.md) | quien mantiene el código | modelo de datos, integración con el modelo, cumplimiento, panel de gobierno, evidencias y fraude, operación y pruebas |
| [`plans/`](plans/) | historial de decisiones | un plan por funcionalidad, con su estado; sirven para saber por qué algo es como es |
| [`slides/`](slides/slides-sesion.md) | presentaciones | contenido en Markdown, PowerPoint vigente, guion de la sesión y capturas (`img/`) |

## Qué se genera y qué se escribe

- Los guiones de `demo/en/` y `demo/de/` se generan con `make guion IDIOMA=en` desde `locales/<idioma>/datos-guion.js`: no se editan a mano. El que se escribe es `demo/es/`.
- `data/generated/recorrido.js` sale de `demo/es/guion-demo.md` con `make recorrido`.
- Los Word de los guiones salen de `make guion-docx` y no se versionan.
- Las capturas de `slides/img/` salen de `make capturas`; los PowerPoint, de los builders de `scripts/slides/`.
