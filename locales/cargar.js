// Elige el idioma de la página y carga sus textos antes que el resto de scripts (solo navegador).
// Orden en los HTML: locales/idiomas.js → locales/i18n.js → locales/cargar.js → resto.
// Idioma: ?lang=xx (se guarda) → el guardado en este navegador → el idioma base. Cambiar de idioma recarga la
// página (I18N.cambiar), así ningún módulo tiene que repintarse en caliente.
// document.write a propósito: carga síncrona sin servidor ni compilación, también abriendo los HTML desde disco.
(function () {
  'use strict';

  const CLAVE = 'demo.idioma';
  const { IDIOMAS, BASE } = I18N;
  const leer = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
  const guardar = (v) => { try { localStorage.setItem(CLAVE, v); } catch { /* sin almacenamiento */ } };

  const url = new URL(location.href);
  const pedido = url.searchParams.get('lang');
  if (pedido && IDIOMAS[pedido]) guardar(pedido);
  const idioma = IDIOMAS[pedido] ? pedido : IDIOMAS[leer()] ? leer() : BASE;

  I18N.usar(idioma);
  document.documentElement.lang = idioma;

  I18N.cambiar = (nuevo) => {
    if (!IDIOMAS[nuevo] || nuevo === I18N.idioma) return;
    guardar(nuevo);
    url.searchParams.delete('lang');
    location.replace(url.toString());
  };

  // Misma versión de caché que este script (?v=N)
  const v = (document.currentScript && new URL(document.currentScript.src).searchParams.get('v')) || '1';
  const ficheros = ['ui.js'];
  const idiomas = idioma === BASE ? [BASE] : [BASE, idioma];   // el base siempre, para lo que falte por traducir
  idiomas.forEach((i) => ficheros.forEach((f) => document.write(`<script src="locales/${i}/${f}?v=${v}"><\/script>`)));

  document.addEventListener('DOMContentLoaded', () => I18N.aplicar());
})();
