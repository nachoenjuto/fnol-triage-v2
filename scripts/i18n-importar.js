// Incorpora traducciones a locales/<idioma>/: `node scripts/i18n-importar.js <idioma> <traducciones.json>`
// (o `make i18n-importar IDIOMA=en FICHERO=…`). El JSON es un objeto plano:
//   { "triaje.btn_run.procesar_paquete": "Process package",   ← clave de interfaz
//     "5893f8d5": "Escalated to the SIU" }                    ← huella de un texto de datos (make i18n-estado --json)
// Cada clave va al fichero de su idioma base (ui.js, ui-triaje.js…) con la huella del texto base; cada huella va
// a la tabla de datos que contiene ese texto. Lo que ya estaba se sustituye; el resto de entradas se conserva.
const { fs, path, raiz, I18N, BASE, FICHEROS, cargarTabla, textosDatos, cargarTablaDatos, cifras } = require('./i18n-comun.js');

const [idioma, entrada] = process.argv.slice(2);
if (!idioma || !entrada || idioma === BASE) { console.error('Uso: node scripts/i18n-importar.js <idioma> <traducciones.json>'); process.exit(2); }
const nuevas = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const q = (s) => JSON.stringify(s);

// Interfaz: clave → fichero base que la define
const bases = Object.fromEntries(FICHEROS.map((f) => [f, cargarTabla(BASE, f) || {}]));
const porFichero = {};
const datosBase = textosDatos();
const porTabla = {};
let sinSitio = [];
for (const [k, v] of Object.entries(nuevas)) {
  const f = FICHEROS.find((x) => k in bases[x]);
  if (f) { (porFichero[f] = porFichero[f] || {})[k] = [v, I18N.huella(bases[f][k])]; continue; }
  // un mismo texto (un nombre, un lugar) puede estar en varias tablas: va a todas
  const tablas = Object.keys(datosBase).filter((x) => datosBase[x].has(k));
  if (tablas.length) {
    if (cifras(v) !== cifras(datosBase[tablas[0]].get(k))) console.warn(`  cifras distintas en ${k}: ${q(datosBase[tablas[0]].get(k).slice(0, 80))}`);
    tablas.forEach((t) => { (porTabla[t] = porTabla[t] || {})[k] = v; }); continue;
  }
  sinSitio.push(k);
}

const escribir = (fichero, cabecera, registrar, tabla) => {
  const cuerpo = Object.entries(tabla).map(([k, v]) => `  ${q(k)}: ${q(v)},\n`).join('');
  fs.writeFileSync(path.join(raiz, 'locales', idioma, fichero), `${cabecera}\nI18N.${registrar}('${idioma}', {\n${cuerpo}});\n`);
};
const cabeceraDe = (fichero) => (fs.readFileSync(path.join(raiz, 'locales', idioma, fichero), 'utf8').match(/^(\/\/.*\n)+/) || [''])[0].trimEnd();

for (const [f, tabla] of Object.entries(porFichero)) {
  // orden del fichero base, para que se lean en paralelo
  const todo = { ...(cargarTabla(idioma, f) || {}), ...tabla };
  const ordenada = Object.fromEntries(Object.keys(bases[f]).filter((k) => k in todo).map((k) => [k, todo[k]]));
  escribir(f, cabeceraDe(f), 'registrar', ordenada);
  console.log(`  ${idioma}/${f}: +${Object.keys(tabla).length} (${Object.keys(ordenada).length}/${Object.keys(bases[f]).length})`);
}
for (const [t, tabla] of Object.entries(porTabla)) {
  const todo = { ...(cargarTablaDatos(idioma, t) || {}), ...tabla };
  const ordenada = Object.fromEntries([...datosBase[t].keys()].filter((h) => h in todo).map((h) => [h, todo[h]]));
  escribir(t, cabeceraDe(t), 'registrarDatos', ordenada);
  console.log(`  ${idioma}/${t}: +${Object.keys(tabla).length} (${Object.keys(ordenada).length}/${datosBase[t].size})`);
}
if (sinSitio.length) console.warn(`  ${sinSitio.length} sin clave ni texto base: ${sinSitio.slice(0, 8).join(', ')}`);
