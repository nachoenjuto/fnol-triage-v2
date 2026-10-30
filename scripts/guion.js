// Guiones de la demo en otros idiomas. El guion se escribe en español (_docs/guion-demo.md y guion-demo-corto.md);
// cada línea con texto es una unidad que se traduce en locales/<idioma>/datos-guion.js, indexada por la huella de su
// texto en español, igual que los datos. make guion IDIOMA=en escribe _docs/<idioma>/ con lo traducido; lo que falte
// sale en español y make i18n-estado lo lista como pendiente.
//   node scripts/guion.js en
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const GUIONES = ['guion-demo.md', 'guion-demo-corto.md'];

// Trocea una línea de markdown en [prefijo, texto, sufijo]: encabezados, citas, listas y celdas de tabla conservan
// su marca; separadores y líneas sin letras no se traducen (texto vacío)
function trozos(linea) {
  if (/^\s*\|/.test(linea)) {
    if (/^\s*\|[\s|:-]+\|\s*$/.test(linea)) return [[linea, '', '']];
    const celdas = linea.split('|');
    return celdas.map((c, i) => {
      const sep = i < celdas.length - 1 ? '|' : '';
      if (i === 0 || i === celdas.length - 1 || !c.trim()) return [c, '', sep];
      return [c.match(/^\s*/)[0], c.trim(), c.match(/\s*$/)[0] + sep];
    });
  }
  const m = linea.match(/^(\s*(?:#{1,6} |> ?|[-*] |\d+\. )*)(.*?)(\s*)$/);
  return [[m[1], m[2], m[3]]];
}
const traducible = (t) => /\p{L}/u.test(t) && !/^`[^`]*`$/.test(t);

// Textos traducibles de los guiones: Map(huella → texto)
function textos(I18N) {
  const m = new Map();
  for (const g of GUIONES) {
    for (const linea of fs.readFileSync(path.join(RAIZ, '_docs', g), 'utf8').split('\n')) {
      for (const [, t] of trozos(linea)) if (traducible(t)) m.set(I18N.huella(t), t);
    }
  }
  return m;
}

function traducir(md, tabla, I18N) {
  let faltan = 0;
  const out = md.split('\n').map((linea) => trozos(linea).map(([p, t, s]) => {
    if (!traducible(t)) return p + t + s;
    const v = tabla[I18N.huella(t)];
    if (v == null) faltan++;
    return p + (v ?? t) + s;
  }).join('')).join('\n');
  return { out, faltan };
}

module.exports = { GUIONES, trozos, textos, traducir };

if (require.main === module) {
  const idioma = process.argv[2];
  const { cargarTablaDatos, I18N } = require('./i18n-comun.js');
  if (!idioma || idioma === I18N.BASE) { console.error('Uso: node scripts/guion.js <idioma distinto del base>'); process.exit(1); }
  const tabla = cargarTablaDatos(idioma, 'datos-guion.js') || {};
  fs.mkdirSync(path.join(RAIZ, '_docs', idioma), { recursive: true });
  for (const g of GUIONES) {
    const { out, faltan } = traducir(fs.readFileSync(path.join(RAIZ, '_docs', g), 'utf8'), tabla, I18N);
    fs.writeFileSync(path.join(RAIZ, '_docs', idioma, g), out);
    console.log(`_docs/${idioma}/${g}${faltan ? ` · ${faltan} líneas sin traducir (make i18n-estado IDIOMA=${idioma})` : ''}`);
  }
}
