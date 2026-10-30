// Utilidades compartidas por scripts/i18n-check.js y scripts/i18n-estado.js: cargar las tablas de textos de cada
// idioma y compararlas con el idioma base (faltan, sobran, desactualizadas, marcadores distintos).
const fs = require('fs');
const path = require('path');
const IDIOMAS = require('../locales/idiomas.js');
const I18N = require('../locales/node.js')();   // con los textos del idioma base: prompts.js y otros los usan al cargar

const raiz = path.join(__dirname, '..');
const BASE = I18N.BASE;
const FICHEROS = I18N.FICHEROS;

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

// Textos traducibles de los datos en el idioma base, por fichero de tabla: { 'datos-mensajes.js': Map(huella → texto) }
const FUENTES_DATOS = {
  'datos-mensajes.js': [['data/mensajes.js', 'PAQUETES']],
  'datos-resultados.js': [['data/resultados.js', 'RESULTADOS_GUARDADOS'], ['data/resultados.js', 'REGLA_DESC']],
  'datos-gobierno.js': [['data/gobierno.js', 'GOBIERNO_DEMO']],
  'datos-fraude.js': [['data/fraude.js', 'FRAUDE_DEMO']],
  'datos-prompts.js': [['prompts.js', 'PROMPT_BLOQUES']],
  'datos-recorrido.js': [['data/recorrido.js', 'RECORRIDO_DEMO']],
};
function textosDatos() {
  const out = {};
  for (const [fichero, fuentes] of Object.entries(FUENTES_DATOS)) {
    const m = new Map();
    for (const [f, exportar] of fuentes) {
      const obj = new Function(`${fs.readFileSync(path.join(raiz, f), 'utf8')}\nreturn ${exportar};`)();
      I18N.recorrerDatos(obj, (texto) => m.set(I18N.huella(texto), texto), true);
    }
    out[fichero] = m;
  }
  return out;
}
function cargarTablaDatos(idioma, fichero) {
  const f = path.join(raiz, 'locales', idioma, fichero);
  if (!fs.existsSync(f)) return null;
  const tabla = {};
  new Function('I18N', fs.readFileSync(f, 'utf8'))({ registrarDatos: (i, t) => Object.assign(tabla, t) });
  return tabla;
}
// Las cifras de un texto y de su traducción tienen que ser las mismas (importes, fechas, horas, matrículas,
// teléfonos…): grupos de dígitos en el mismo orden, sin contar separadores de miles o decimales
const cifras = (s) => (String(s).match(/\d+/g) || []).join(' ');

module.exports = { fs, path, raiz, IDIOMAS, I18N, BASE, FICHEROS, cargarTabla, comparar, textosDatos, cargarTablaDatos, cifras };
