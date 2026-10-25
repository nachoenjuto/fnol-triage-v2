# Flujos de trabajo habituales (la demo es estática: no hay build)
.PHONY: run test test-ia datos recorrido guion-docx capturas

run: ## Sirve la demo en http://localhost:8792
	python3 -m http.server 8792

test: ## Pruebas de evidencias.js, cumplimiento.js, fraude.js, fechas.js y del recorrido de la demo (sin dependencias, requiere Node)
	node tests/evidencias.test.js
	node tests/cumplimiento.test.js
	node tests/fraude.test.js
	node tests/fechas.test.js
	node tests/recorrido.test.js

test-ia: ## Mide las evidencias con un modelo real (variables TRIAGE_*, ver tests/ia-real.js)
	N=$(N) node tests/ia-real.js

datos: ## Regenera los JSON de ejemplo de data/ desde las fuentes JS (tras cambiar mensajes o resultados)
	node scripts/generar-datos.js

recorrido: ## Regenera los pasos y subtítulos del Recorrido de la demo (data/recorrido.js) desde _docs/guion-demo.md
	node scripts/generar-recorrido.js

guion-docx: ## Genera _docs/guion-demo.docx desde _docs/guion-demo.md (texto para decir en verde); instala docx en una carpeta temporal
	npm install --silent --prefix "$${TMPDIR:-/tmp}/fnol-docx" docx@9 >/dev/null
	NODE_PATH="$${TMPDIR:-/tmp}/fnol-docx/node_modules" node scripts/generar-guion-docx.js

capturas: ## Regenera las capturas de las slides y sus compuestas (requiere make run en otra terminal y Google Chrome)
	node scripts/capturas.mjs
	python3 scripts/componer-capturas.py
