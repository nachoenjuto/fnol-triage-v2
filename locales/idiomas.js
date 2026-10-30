// Registro de idiomas de la demo. Añadir uno: carpeta locales/<código>/ con los mismos ficheros que es/, su
// locales/<código>/estado.json y una entrada aquí. El selector de la cabecera (shell.js), el cargador
// (locales/cargar.js) y el validador (scripts/i18n-check.js) lo recogen solos.
// `nombre` va en el propio idioma (no se traduce). `base`: idioma de referencia; el resto se traduce desde él y,
// si le falta una clave, muestra la del idioma base.
(function (root) {
  'use strict';

  const IDIOMAS = {
    es: { nombre: 'Español', corto: 'ES', locale: 'es-ES', base: true },
    en: { nombre: 'English', corto: 'EN', locale: 'en-GB' },
    de: { nombre: 'Deutsch', corto: 'DE', locale: 'de-DE' },
  };

  root.IDIOMAS = IDIOMAS;
  if (typeof module !== 'undefined' && module.exports) module.exports = IDIOMAS;
})(typeof window !== 'undefined' ? window : globalThis);
