# Documentación

Organizada por quién la lee. Los guiones de la demo están en español, inglés y alemán; el resto, en español.

| Carpeta | Para quién | Qué hay |
|---|---|---|
| [`architecture/`](architecture/arquitectura.md) | quien evalúa o amplía la solución | diagramas C4 en Mermaid: contexto, contenedores y componentes |
| [`demo/`](demo/guia-demo.md) | quien presenta la demo | [`guia-demo.md`](demo/guia-demo.md): cada pantalla, qué muestra y para qué sirve. Guiones de 30-35 minutos y de bolsillo en [`es/`](demo/es/guion-demo.md), [`en/`](demo/en/guion-demo.md) y [`de/`](demo/de/guion-demo.md) |
| [`technical/`](technical/README.md) | quien mantiene el código | modelo de datos, integración con el modelo, cumplimiento, panel de gobierno, evidencias y fraude, operación y pruebas |
| [`plans/`](plans/) | historial de decisiones | un plan por funcionalidad, con su estado; sirven para saber por qué algo es como es |
| [`slides/`](slides/slides-sesion.md) | presentaciones | contenido en Markdown y guion de la sesión. Los PowerPoint y las capturas (`img/`) están en la carpeta compartida, no en Git |

## Qué se genera y qué se escribe

- Los guiones de `demo/en/` y `demo/de/` se generan con `make guion IDIOMA=en` desde `locales/<idioma>/datos-guion.js`: no se editan a mano. El que se escribe es `demo/es/`.
- `data/generated/recorrido.js` sale de `demo/es/guion-demo.md` con `make recorrido`.
- Los Word de los guiones salen de `make guion-docx` y no se versionan.
- Las capturas de `slides/img/` salen de `make capturas`; los PowerPoint, de los builders de `scripts/slides/`. Ni unas ni otros se versionan, por tamaño. La excepción es `slides-sesion-v3.pptx`: es la base de `build_slides_sesion_v4.py` y no se puede regenerar, así que solo existe en la carpeta compartida.
