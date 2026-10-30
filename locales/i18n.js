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
  // Ficheros de textos de cada idioma (locales/<idioma>/…): los carga cargar.js y los compara scripts/i18n-check.js
  const FICHEROS = ['ui.js', 'ui-triaje.js', 'ui-gobierno.js', 'ui-intro.js'];
  // Tablas de traducción de los datos (solo en los idiomas que no son el base: ver traducirDatos)
  const FICHEROS_DATOS = ['datos-mensajes.js', 'datos-resultados.js', 'datos-gobierno.js', 'datos-fraude.js', 'datos-prompts.js', 'datos-recorrido.js'];
  // Expresiones que leen el texto de los mensajes (motor local, fechas, evidencias, datos personales, fraude)
  const FICHEROS_MOTOR = ['motor.js'];
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
    lista: (xs) => new Intl.ListFormat(locale(), { type: 'conjunction' }).format(xs.map(String)),   // «a, b y c»
  };

  // Rellena el HTML: data-i18n="clave" (texto), data-i18n-html="clave" (texto con etiquetas de formato: <b>, <code>,
  // <a>… escritas en nuestros propios ficheros de idioma, nunca datos de usuario) y
  // data-i18n-attr="title:clave;aria-label:clave" (atributos)
  function aplicar(raiz) {
    const r = raiz || (typeof document !== 'undefined' ? document : null);
    if (!r) return;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    r.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').map((p) => p.trim()).filter(Boolean).forEach((p) => {
        const [attr, clave] = p.split(':').map((x) => x.trim());
        if (attr && clave) el.setAttribute(attr, t(clave));
      });
    });
  }

  // ── Datos de la demo ──
  // Los hechos están una sola vez, en data/*.js y prompts.js, en el idioma base. Cada traducción es una tabla
  // { huella del texto base: texto traducido } (locales/<idioma>/datos-*.js) que traducirDatos aplica en el sitio
  // sobre esos objetos al cargar la página. Lo que no está en la tabla se queda en el idioma base. Así los números,
  // fechas y decisiones son siempre los mismos, y si el texto base cambia su huella cambia y queda pendiente.
  // No se traducen los valores internos que compara el código: los campos de NO_TRADUCIR y las palabras sueltas en
  // minúsculas y sin acentos ('aviso', 'superado', 'bajo'…), que son claves de estado.
  const tablasDatos = {};
  const NO_TRADUCIR = new Set(['id', 'ramo', 'ramos', 'dec', 'decision', 'canal', 'mime', 'src', 'archivo', 'ref', 'reglas',
    'prompt', 'modelo', 'generado', 'dni', 'matricula', 'iban', 'permiso', 'nivel', 'severidad', 'esfuerzo', 'estado', 'sev',
    'tipo', 'ambito', 'origen', 'agente', 'agentes', 'traza', 'mensaje', 'regla', 'resultado', 'dim', 'fuente', 'version']);
  const ES_CLAVE = /^[a-z0-9_.:-]+$/;   // 'aviso', 'gpt-5', 'v2.3', 'kb-02'…
  // Campos que el código compara pero que también se ven («Coste diario», «Antifraude», «Fecha de recepción»): no se
  // traducen en el sitio; se traducen al pintarlos con I18N.dato(texto), con las mismas tablas de datos.
  const AL_MOSTRAR = new Set(['tipo', 'ambito', 'fuente', 'origen', 'estado', 'modelo']);
  // Un importe suelto («1.350 €») también se traduce: su formato cambia con el idioma
  const esTraducible = (s, campo) => typeof s === 'string' && !NO_TRADUCIR.has(campo) && (/\p{L}/u.test(s) || /\d\s?€|€\s?\d/.test(s)) && !ES_CLAVE.test(s)
    && !/^[A-Z]{1,5}-[\w-]+$/.test(s) && !/^\d{4}-\d\d-\d\d/.test(s)
    && !/^[A-Z]{1,3}\d{1,2}$/.test(s) && !/^regla:/.test(s)   // códigos de regla: A1, H9, regla:A3
    && !/^[A-Z_]{4,}$/.test(s)   // valores en mayúsculas que compara el código: DESPEJADO, REVISION
    && !/^(?:ver|clic):/.test(s) && !/^[a-z][a-z-]*(?::[\w.,-]+)+$/.test(s);   // acciones del recorrido (ver:SELECTOR~@clave, kb:KB-02:fuente)

  function registrarDatos(idioma, tabla) { tablasDatos[idioma] = Object.assign(tablasDatos[idioma] || {}, tabla); }

  // Recorre un objeto de datos y llama a fn(texto, campo, poner) por cada texto traducible. Con alMostrar también
  // recorre los campos de AL_MOSTRAR (para listar lo que hay que traducir, no para traducir en el sitio).
  function recorrerDatos(raiz, fn, alMostrar = false) {
    const ok = (v, campo) => esTraducible(v, campo) || (alMostrar && AL_MOSTRAR.has(campo) && esTraducible(v, ''));
    const visitar = (o, campo) => {
      if (Array.isArray(o)) { o.forEach((v, i) => (typeof v === 'string' ? (ok(v, campo) && fn(v, campo, (x) => { o[i] = x; })) : visitar(v, campo))); return; }
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string') { if (ok(v, k)) fn(v, k, (x) => { o[k] = x; }); } else visitar(v, k);
      }
    };
    visitar(raiz, '');
  }

  // Traduce en el sitio. Devuelve cuántos textos había y cuántos se tradujeron.
  function traducirDatos(raiz, idioma = activo) {
    const r = { total: 0, traducidos: 0 };
    if (idioma === BASE || !raiz) return r;
    const tabla = tablasDatos[idioma] || {};
    recorrerDatos(raiz, (texto, campo, poner) => {
      r.total++;
      const h = huella(texto);
      if (h in tabla) { poner(valor(tabla[h])); r.traducidos++; }
    });
    return r;
  }

  // Un texto de los datos en el idioma activo (para los campos de AL_MOSTRAR): su traducción o el propio texto
  function dato(s) {
    if (activo === BASE || typeof s !== 'string') return s;
    const v = (tablasDatos[activo] || {})[huella(s)];
    return v == null ? s : valor(v);
  }

  // ── Expresiones por idioma (locales/<idioma>/motor.js) ──
  // I18N.motor('local') devuelve las del idioma activo; lo que no define ese idioma se toma del idioma base.
  const motores = {};
  function registrarMotor(idioma, packs) { motores[idioma] = Object.assign(motores[idioma] || {}, packs); }
  function motor(modulo) {
    const base = (motores[BASE] || {})[modulo] || {};
    return activo === BASE ? base : { ...base, ...((motores[activo] || {})[modulo] || {}) };
  }

  // Etiqueta visible de un valor interno que no se traduce (ramo, decisión…): clave comun.<tipo>.<valor> o, si no
  // existe, el propio valor. I18N.etiqueta('ramo', 'Hogar') → 'Home' en inglés.
  function etiqueta(tipo, v) { const k = `comun.${tipo}.${v}`; const r = t(k); return r === k ? v : r; }

  const I18N = {
    IDIOMAS, etiqueta, dato, BASE, FICHEROS, FICHEROS_DATOS, FICHEROS_MOTOR, registrarMotor, motor, huella, registrarDatos, recorrerDatos, traducirDatos, esTraducible,
    tablaDatos: (idioma) => tablasDatos[idioma] || {}, registrar, usar, t, fmt, aplicar, valor,
    get idioma() { return activo; },
    get locale() { return locale(); },
    tabla: (idioma) => textos[idioma] || {},
  };
  root.I18N = I18N;
  if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
})(typeof window !== 'undefined' ? window : globalThis);
