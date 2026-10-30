// Núcleo de idiomas: textos por clave, plurales, formatos de número y fecha y rellenado de los HTML.
// Lógica pura salvo `aplicar` (DOM): funciona en el navegador (global `I18N`) y en Node (tests/i18n.test.js,
// scripts/i18n-check.js).
//
// Formato de los textos (locales/<idioma>/ui.js):
//   idioma base (es):  'clave': 'Texto con {variable}'
//   traducciones:      'clave': ['Text with {variable}', '<huella del texto español>']
// La huella (FNV-1a de 32 bits del texto base) permite saber si el español cambió después de traducir.
// Plurales: en lugar de texto, un objeto { one: '…', other: '…' } elegido con Intl.PluralRules según `n`.
(function (root) {
  'use strict';

  const IDIOMAS = root.IDIOMAS || (typeof require !== 'undefined' ? require('./idiomas.js') : {});
  const BASE = Object.keys(IDIOMAS).find((c) => IDIOMAS[c].base) || 'es';
  const textos = {};          // { es: { clave: valor }, en: {...} }
  const avisadas = new Set(); // claves que faltan, avisadas una sola vez en consola
  let activo = BASE;

  // FNV-1a 32 bits en hexadecimal (8 caracteres). Sobre JSON.stringify para cubrir también los plurales.
  function huella(valor) {
    const s = typeof valor === 'string' ? valor : JSON.stringify(valor);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  function registrar(idioma, tabla) { textos[idioma] = Object.assign(textos[idioma] || {}, tabla); }
  function usar(idioma) { if (IDIOMAS[idioma]) activo = idioma; return activo; }

  // Valor de una entrada sin la huella
  const valor = (entrada) => (Array.isArray(entrada) ? entrada[0] : entrada);

  function interpolar(s, vars) {
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
  }

  function t(clave, vars) {
    let v = textos[activo] && textos[activo][clave];
    if (v === undefined && activo !== BASE) v = textos[BASE] && textos[BASE][clave];
    if (v === undefined) {
      if (!avisadas.has(clave)) { avisadas.add(clave); if (typeof console !== 'undefined') console.warn(`[i18n] falta la clave «${clave}» (${activo})`); }
      return clave;
    }
    v = valor(v);
    if (v && typeof v === 'object') {
      const n = vars && vars.n != null ? Number(vars.n) : 0;
      const cat = new Intl.PluralRules(locale()).select(n);
      v = v[cat] ?? v.other ?? '';
    }
    return interpolar(String(v), vars);
  }

  const locale = () => (IDIOMAS[activo] || IDIOMAS[BASE] || { locale: 'es-ES' }).locale;

  // Formatos con el locale del idioma activo. useGrouping 'always': en es-ES los números de cuatro cifras no
  // llevan separador de miles por defecto (3180 en vez de 3.180).
  const fmt = {
    num: (n, o = {}) => Number(n || 0).toLocaleString(locale(), { useGrouping: 'always', ...o }),
    eur: (n, dec = 0) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString(locale(), { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' })),
    pct: (n, dec = 1) => Number(n || 0).toLocaleString(locale(), { style: 'percent', minimumFractionDigits: dec, maximumFractionDigits: dec }),
    fecha: (d, o) => new Date(d).toLocaleDateString(locale(), o),
    hora: (d, o) => new Date(d).toLocaleTimeString(locale(), o),
    fechaHora: (d, o) => new Date(d).toLocaleString(locale(), o),
  };

  // Rellena el HTML: data-i18n="clave" (texto), data-i18n-attr="title:clave;aria-label:clave" (atributos)
  function aplicar(raiz) {
    const r = raiz || (typeof document !== 'undefined' ? document : null);
    if (!r) return;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').map((p) => p.trim()).filter(Boolean).forEach((p) => {
        const [attr, clave] = p.split(':').map((x) => x.trim());
        if (attr && clave) el.setAttribute(attr, t(clave));
      });
    });
  }

  const I18N = {
    IDIOMAS, BASE, huella, registrar, usar, t, fmt, aplicar, valor,
    get idioma() { return activo; },
    get locale() { return locale(); },
    tabla: (idioma) => textos[idioma] || {},
  };
  root.I18N = I18N;
  root.t = t;
  if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
})(typeof window !== 'undefined' ? window : globalThis);
