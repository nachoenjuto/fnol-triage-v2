// Utilidades compartidas por scripts/i18n-check.js y scripts/i18n-estado.js: cargar las tablas de textos de cada
// idioma y compararlas con el idioma base (faltan, sobran, desactualizadas, marcadores distintos).
const fs = require('fs');
const path = require('path');
const IDIOMAS = require('../locales/idiomas.js');
const I18N = require('../locales/i18n.js');

const raiz = path.join(__dirname, '..');
const BASE = I18N.BASE;
const FICHEROS = ['ui.js'];   // ficheros de texto por idioma; las fases siguientes añaden los de contenido

// Ejecuta locales/<idioma>/<fichero> con un I18N falso que solo recoge lo registrado
function cargarTabla(idioma, fichero) {
  const f = path.join(raiz, 'locales', idioma, fichero);
  if (!fs.existsSync(f)) return null;
  const tabla = {};
  new Function('I18N', fs.readFileSync(f, 'utf8'))({ registrar: (i, t) => Object.assign(tabla, t) });
  return tabla;
}

const marcadores = (v) => [...new Set((JSON.stringify(v).match(/\{\w+\}/g) || []))].sort().join(' ');

// Compara una tabla traducida con la del idioma base
function comparar(base, trad) {
  const r = { faltan: [], sobran: [], desactualizadas: [], formato: [], marcadores: [] };
  for (const [clave, vBase] of Object.entries(base)) {
    if (!(clave in trad)) { r.faltan.push(clave); continue; }
    const e = trad[clave];
    if (!Array.isArray(e) || e.length !== 2 || typeof e[1] !== 'string') { r.formato.push(clave); continue; }
    if (e[1] !== I18N.huella(vBase)) r.desactualizadas.push(clave);
    if (marcadores(e[0]) !== marcadores(vBase)) r.marcadores.push(clave);
  }
  for (const clave of Object.keys(trad)) if (!(clave in base)) r.sobran.push(clave);
  return r;
}

module.exports = { fs, path, raiz, IDIOMAS, I18N, BASE, FICHEROS, cargarTabla, comparar };
