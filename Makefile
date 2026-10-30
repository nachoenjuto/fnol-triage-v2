# Flujos de trabajo habituales (la demo es estática: no hay build)
.PHONY: run test test-ia datos recorrido guion-docx capturas i18n-check i18n-estado i18n-marcar i18n-instantanea

run: ## Sirve la demo en http://localhost:8792
	python3 -m http.server 8792

test: ## Pruebas de evidencias.js, cumplimiento.js, fraude.js, fechas.js, ahorro.js, adjuntos.js, del recorrido y de los idiomas (sin dependencias, requiere Node)
	node tests/i18n.test.js
	node scripts/i18n-check.js
	node tests/evidencias.test.js
	node tests/cumplimiento.test.js
	node tests/fraude.test.js
	node tests/fechas.test.js
	node tests/ahorro.test.js
	node tests/adjuntos.test.js
	node tests/recorrido.test.js

i18n-check: ## Valida los idiomas: estricto con el español y lo común, aviso con el resto (IDIOMA=en o IDIOMA=en,de los pasa a estricto)
	IDIOMA=$(IDIOMA) node scripts/i18n-check.js

i18n-estado: ## Qué falta para poner al día cada idioma (IDIOMA=en para uno solo), con el texto base y la huella
	IDIOMA=$(IDIOMA) node scripts/i18n-estado.js

i18n-marcar: ## Tras poner al día un idioma: lo valida en estricto y guarda el commit actual en locales/<idioma>/estado.json (IDIOMA obligatorio)
	IDIOMA=$(IDIOMA) node scripts/i18n-estado.js --marcar

i18n-instantanea: ## Guarda el texto visible de la demo en ~700 estados (SALIDA=fichero.json, IDIOMA=es); compara dos con node scripts/i18n-instantanea.mjs --comparar a.json b.json (requiere make run y Chrome)
	node scripts/i18n-instantanea.mjs $(SALIDA) $(IDIOMA)

test-ia: ## Mide las evidencias con un modelo real (variables TRIAGE_*, ver tests/ia-real.js)
	N=$(N) node tests/ia-real.js

datos: ## Regenera los JSON de ejemplo de data/ desde las fuentes JS (tras cambiar mensajes o resultados)
	node scripts/generar-datos.js

recorrido: ## Regenera los pasos y subtítulos del Recorrido de la demo (data/recorrido.js) desde _docs/guion-demo.md
	node scripts/generar-recorrido.js

guion-docx: ## Genera los Word de los guiones (_docs/guion-demo.md y guion-demo-corto.md, texto para decir en verde); instala docx en una carpeta temporal
	npm install --silent --prefix "$${TMPDIR:-/tmp}/fnol-docx" docx@9 >/dev/null
	NODE_PATH="$${TMPDIR:-/tmp}/fnol-docx/node_modules" node scripts/generar-guion-docx.js
	NODE_PATH="$${TMPDIR:-/tmp}/fnol-docx/node_modules" node scripts/generar-guion-docx.js _docs/guion-demo-corto.md

capturas: ## Regenera las capturas de las slides y sus compuestas (requiere make run en otra terminal y Google Chrome)
	node scripts/capturas.mjs
	python3 scripts/componer-capturas.py
