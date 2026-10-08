# Flujos de trabajo habituales (la demo es estática: no hay build)
.PHONY: run test test-ia datos

run: ## Sirve la demo en http://localhost:8792
	python3 -m http.server 8792

test: ## Pruebas de evidencias.js y cumplimiento.js (sin dependencias, requiere Node)
	node tests/evidencias.test.js
	node tests/cumplimiento.test.js

test-ia: ## Mide las evidencias con un modelo real (variables TRIAGE_*, ver tests/ia-real.js)
	N=$(N) node tests/ia-real.js

datos: ## Regenera los JSON de ejemplo de data/ desde las fuentes JS (tras cambiar mensajes o resultados)
	node scripts/generar-datos.js
