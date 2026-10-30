// Qué falta para poner al día cada idioma: `node scripts/i18n-estado.js` (o `make i18n-estado [IDIOMA=en]`).
// Por idioma: claves que faltan y desactualizadas, con el texto base y la huella que hay que poner en la
// traducción; claves que sobran; y qué ha cambiado en el idioma base desde la última puesta al día
// (locales/<idioma>/estado.json). Ver _docs/plan-i18n.md §8.
// Con --json escribe los textos de datos pendientes en locales/<idioma>/pendientes-datos-*.json (para traducir).
//
// Al terminar una puesta al día: `make i18n-marcar IDIOMA=en` (node scripts/i18n-estado.js --marcar) comprueba
// ese idioma en estricto y, si pasa, guarda en estado.json el commit actual como referencia.
const { execSync } = require('child_process');
const { fs, path, raiz, IDIOMAS, I18N, BASE, FICHEROS, cargarTabla, comparar, textosDatos, cargarTablaDatos } = require('./i18n-comun.js');

// Fuentes del idioma base cuyo cambio obliga a revisar las traducciones
const FUENTES_BASE = [`locales/${BASE}`, 'data', 'prompts.js', `_docs/${BASE}`];

const pedidos = (process.env.IDIOMA || '').split(',').map((s) => s.trim()).filter(Boolean);
const idiomas = (pedidos.length ? pedidos : Object.keys(IDIOMAS)).filter((i) => i !== BASE && IDIOMAS[i]);
const git = (cmd) => execSync(`git ${cmd}`, { cwd: raiz, encoding: 'utf8' }).trim();
const leerEstado = (i) => { try { return JSON.parse(fs.readFileSync(path.join(raiz, 'locales', i, 'estado.json'), 'utf8')); } catch { return {}; } };

if (process.argv.includes('--marcar')) {
  if (!pedidos.length) { console.error('Indica el idioma: make i18n-marcar IDIOMA=en'); process.exit(2); }
  execSync('node scripts/i18n-check.js', { cwd: raiz, stdio: 'inherit', env: { ...process.env, IDIOMA: idiomas.join(',') } });
  if (git('status --porcelain')) console.log('\nAviso: hay cambios sin commit; la referencia es el último commit, haz commit antes de marcar.');
  const sha = git('rev-parse --short HEAD');
  for (const i of idiomas) {
    fs.writeFileSync(path.join(raiz, 'locales', i, 'estado.json'), `${JSON.stringify({ sincronizado_con: sha, fecha: new Date().toISOString().slice(0, 10) })}\n`);
    console.log(`${i}: al día con ${sha}`);
  }
  process.exit(0);
}

for (const idioma of idiomas) {
  const estado = leerEstado(idioma);
  console.log(`\n=== ${idioma} (${IDIOMAS[idioma].nombre}) · última puesta al día: ${estado.sincronizado_con ? `${estado.sincronizado_con}, ${estado.fecha}` : 'nunca'}`);

  for (const fichero of FICHEROS) {
    const base = cargarTabla(BASE, fichero) || {};
    const trad = cargarTabla(idioma, fichero) || {};
    const r = comparar(base, trad);
    const pendientes = [...r.desactualizadas.map((c) => [c, 'desactualizada']), ...r.faltan.map((c) => [c, 'falta'])];
    console.log(`\n${fichero}: ${pendientes.length} pendientes · ${r.sobran.length} sobran`);
    // Primero las desactualizadas: el texto traducido ya no dice lo mismo que el base
    for (const [clave, motivo] of pendientes) {
      console.log(`  [${motivo}] '${clave}': [${JSON.stringify(base[clave])}, '${I18N.huella(base[clave])}']`);
      if (motivo === 'desactualizada') console.log(`      ahora: ${JSON.stringify(I18N.valor(trad[clave]))}`);
    }
    for (const clave of r.sobran) console.log(`  [sobra] '${clave}'`);
  }

  // Datos: textos base sin traducción (nuevos o cambiados), con su huella; con --json los vuelca para traducir
  const datos = textosDatos();
  for (const [fichero, textos] of Object.entries(datos)) {
    const tabla = cargarTablaDatos(idioma, fichero) || {};
    const faltan = [...textos].filter(([h]) => !(h in tabla));
    const sobran = Object.keys(tabla).filter((h) => !textos.has(h));
    console.log(`\n${fichero}: ${faltan.length} pendientes de ${textos.size} · ${sobran.length} sobran`);
    if (process.argv.includes('--json')) {
      const salida = path.join(raiz, 'locales', idioma, `pendientes-${fichero.replace(/\.js$/, '')}.json`);
      fs.writeFileSync(salida, `${JSON.stringify(Object.fromEntries(faltan), null, 1)}\n`);
      console.log(`  → ${path.relative(raiz, salida)}`);
    } else faltan.slice(0, 5).forEach(([h, t]) => console.log(`  '${h}': ${JSON.stringify(t.slice(0, 100))}`));
  }

  if (estado.sincronizado_con) {
    const rutas = FUENTES_BASE.filter((p) => fs.existsSync(path.join(raiz, p)));
    const cambios = git(`diff --stat ${estado.sincronizado_con} -- ${rutas.join(' ')}`);
    console.log(`\nCambios en ${BASE} desde ${estado.sincronizado_con}:${cambios ? `\n${cambios}` : ' ninguno'}`);
  }
}
