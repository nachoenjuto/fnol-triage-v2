// Traduce en el sitio los datos de la demo ya cargados (data/*.js, prompts.js) con las tablas del idioma activo
// (locales/<idioma>/datos-*.js). Va justo antes de fechas.js, que después desplaza las fechas escritas en esos
// textos, y antes de app.js, gobierno.js e intro.js. Con el idioma base no hace nada.
(function () {
  'use strict';
  if (I18N.idioma === I18N.BASE) return;
  const objetos = [
    typeof PAQUETES !== 'undefined' ? PAQUETES : null,
    typeof RESULTADOS_GUARDADOS !== 'undefined' ? RESULTADOS_GUARDADOS : null,
    typeof REGLA_DESC !== 'undefined' ? REGLA_DESC : null,
    typeof GOBIERNO_DEMO !== 'undefined' ? GOBIERNO_DEMO : null,
    typeof FRAUDE_DEMO !== 'undefined' ? FRAUDE_DEMO : null,
    typeof PROMPT_BLOQUES !== 'undefined' ? PROMPT_BLOQUES : null,
    typeof RECORRIDO_DEMO !== 'undefined' ? RECORRIDO_DEMO : null,
  ];
  let total = 0; let traducidos = 0;
  objetos.forEach((o) => { const r = I18N.traducirDatos(o); total += r.total; traducidos += r.traducidos; });
  if (total > traducidos) console.warn(`[i18n] ${total - traducidos} de ${total} textos de datos sin traducir (${I18N.idioma}): make i18n-estado IDIOMA=${I18N.idioma}`);
})();
