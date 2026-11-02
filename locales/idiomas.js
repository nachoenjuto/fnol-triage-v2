// Registro de idiomas de la demo. Añadir uno: carpeta locales/<código>/ con los mismos ficheros que es/, su
// locales/<código>/estado.json y una entrada aquí. El selector de la cabecera (shell.js), el cargador
// (locales/cargar.js) y el validador (scripts/i18n/i18n-check.js) lo recogen solos.
// `nombre` va en el propio idioma (no se traduce). `bandera`: SVG 3:2 que muestra el selector de la cabecera. `base`: idioma de referencia; el resto se traduce desde él y,
// si le falta una clave, muestra la del idioma base.
(function (root) {
  'use strict';

  const IDIOMAS = {
    es: { nombre: 'Español', corto: 'ES', locale: 'es-ES', base: true,
      bandera: '<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>' },
    en: { nombre: 'English', corto: 'EN', locale: 'en-GB',
      bandera: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><clipPath id="bandera-gb"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#bandera-gb)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>' },
    de: { nombre: 'Deutsch', corto: 'DE', locale: 'de-DE',
      bandera: '<svg viewBox="0 0 5 3"><rect width="5" height="3" fill="#FFCE00"/><rect width="5" height="2" fill="#DD0000"/><rect width="5" height="1" fill="#000"/></svg>' },
  };

  root.IDIOMAS = IDIOMAS;
  if (typeof module !== 'undefined' && module.exports) module.exports = IDIOMAS;
})(typeof window !== 'undefined' ? window : globalThis);
