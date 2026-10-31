// Validador de idiomas: `node scripts/i18n-check.js` (o `make i18n-check`, incluido en `make test`).
// Estricto (falla) con el idioma base y lo común; con el resto de idiomas solo avisa, salvo los indicados en
// IDIOMA (`make i18n-check IDIOMA=en` o `IDIOMA=en,de`), que pasan a estricto. Ver _docs/plan-i18n.md §4 y §8.
const { fs, path, raiz, IDIOMAS, I18N, BASE, FICHEROS, cargarTabla, comparar, textosDatos, cargarTablaDatos, cifras } = require('./i18n-comun.js');

// Los HTML no pueden tener texto visible (fase 1 del plan terminada): estricto
const HTML_ESTRICTO = true;
const HTML = ['index.html', 'gobierno.html', 'intro.html'];

const estrictos = new Set((process.env.IDIOMA || '').split(',').map((s) => s.trim()).filter(Boolean));
for (const i of estrictos) if (!IDIOMAS[i]) { console.error(`IDIOMA=${i}: no está en locales/idiomas.js`); process.exit(2); }

let errores = 0; let avisos = 0;
const error = (m) => { errores++; console.error(`  ERROR ${m}`); };
const aviso = (m) => { avisos++; console.log(`  aviso ${m}`); };
const lista = (claves, max = 8) => claves.slice(0, max).join(', ') + (claves.length > max ? ` … (+${claves.length - max})` : '');

// Restos de otro idioma en una traducción (heurística: caracteres y palabras frecuentes del español)
const RESTOS = {
  en: [/[ñ¿¡áéíóú]/i, /\b(el|los|las|del|que|para|con|por|una|sin|según)\b/i],
  de: [/[ñ¿¡áíóú]/i, /\b(el|los|las|del|que|para|con|por|una|sin|según)\b/i],
};

for (const idioma of Object.keys(IDIOMAS)) {
  const dir = path.join(raiz, 'locales', idioma);
  if (!fs.existsSync(dir)) { error(`${idioma}: falta la carpeta locales/${idioma}/`); continue; }
  if (idioma !== BASE && !fs.existsSync(path.join(dir, 'estado.json'))) error(`${idioma}: falta locales/${idioma}/estado.json`);
}

for (const fichero of FICHEROS) {
  console.log(`\n${fichero}`);
  const base = cargarTabla(BASE, fichero);
  if (!base) { error(`${BASE}: falta locales/${BASE}/${fichero}`); continue; }
  for (const [clave, v] of Object.entries(base)) {
    const ok = (typeof v === 'string' && v.trim()) || (v && typeof v === 'object' && !Array.isArray(v) && typeof v.other === 'string');
    if (!ok) error(`${BASE}: «${clave}» vacía o con formato no válido (texto o { one, other })`);
    // I18N.t solo sustituye {nombre} con letras ASCII: un {críticas} se quedaría tal cual en pantalla
    if ((typeof v === 'string' ? [v] : Object.values(v || {})).some((x) => /\{[^{}\s]*[^\x00-\x7F][^{}\s]*\}/.test(String(x)))) error(`${BASE}: «${clave}» tiene un marcador con letras no ASCII`);
  }
  // Una clave repetida en el mismo fichero se pisa en silencio (gana la última)
  const repetidas = (fs.readFileSync(path.join(raiz, 'locales', BASE, fichero), 'utf8').match(/^\s*'[^']+':/gm) || []).filter((k, i, a) => a.indexOf(k) !== i);
  if (repetidas.length) error(`${BASE}: claves repetidas en ${fichero}: ${lista(repetidas.map((k) => k.trim()))}`);
  console.log(`  ${BASE}: ${Object.keys(base).length} claves`);

  for (const idioma of Object.keys(IDIOMAS).filter((i) => i !== BASE)) {
    const trad = cargarTabla(idioma, fichero);
    const estricto = estrictos.has(idioma);
    const pend = estricto ? error : aviso;
    if (!trad) { pend(`${idioma}: falta locales/${idioma}/${fichero}`); continue; }
    const r = comparar(base, trad);
    // El formato y los marcadores rompen la página en ese idioma: siempre estrictos
    if (r.formato.length) error(`${idioma}: ${r.formato.length} sin el formato [texto, huella]: ${lista(r.formato)}`);
    if (r.marcadores.length) error(`${idioma}: ${r.marcadores.length} con marcadores {…} distintos del ${BASE}: ${lista(r.marcadores)}`);
    if (r.faltan.length) pend(`${idioma}: faltan ${r.faltan.length}: ${lista(r.faltan)}`);
    if (r.desactualizadas.length) pend(`${idioma}: ${r.desactualizadas.length} desactualizadas (el ${BASE} cambió): ${lista(r.desactualizadas)}`);
    if (r.sobran.length) pend(`${idioma}: sobran ${r.sobran.length} (ya no existen en ${BASE}): ${lista(r.sobran)}`);
    const restos = Object.entries(trad).filter(([, e]) => Array.isArray(e) && (RESTOS[idioma] || []).some((re) => re.test(JSON.stringify(e[0])))).map(([c]) => c);
    if (restos.length) pend(`${idioma}: ${restos.length} parecen tener texto en español: ${lista(restos)}`);
    const n = Object.keys(base).length - r.faltan.length;
    console.log(`  ${idioma}: ${n}/${Object.keys(base).length} traducidas${estricto ? ' (estricto)' : ''}`);
  }
}

// Datos (data/*.js, prompts.js): cada texto base traducido, con las mismas cifras
console.log('\nDatos');
const base = textosDatos();
for (const [fichero, textos] of Object.entries(base)) {
  const linea = [`  ${fichero}: ${textos.size} textos`];
  for (const idioma of Object.keys(IDIOMAS).filter((i) => i !== BASE)) {
    const tabla = cargarTablaDatos(idioma, fichero);
    const pend = estrictos.has(idioma) ? error : aviso;
    if (!tabla) { pend(`${idioma}: falta locales/${idioma}/${fichero}`); continue; }
    const faltan = [...textos.keys()].filter((h) => !(h in tabla));
    const sobran = Object.keys(tabla).filter((h) => !textos.has(h));
    const malCifras = [...textos].filter(([h, t]) => h in tabla && cifras(I18N.valor(tabla[h])) !== cifras(t)).map(([h]) => h);
    if (malCifras.length) error(`${idioma}/${fichero}: ${malCifras.length} traducciones con cifras distintas del ${BASE}: ${lista(malCifras)}`);
    if (faltan.length) pend(`${idioma}/${fichero}: faltan ${faltan.length} de ${textos.size}`);
    if (sobran.length) pend(`${idioma}/${fichero}: sobran ${sobran.length} (el texto base cambió o ya no existe)`);
    linea.push(`${idioma} ${textos.size - faltan.length}/${textos.size}`);
  }
  console.log(linea.join(' · '));
}

// HTML sin texto visible: solo estructura y atributos data-i18n / data-i18n-attr
console.log('\nHTML sin texto');
const ATRIBUTOS = /\s(title|placeholder|aria-label|alt|content)="([^"]*\p{L}[^"]*)"/gu;
for (const f of HTML) {
  const src = fs.readFileSync(path.join(raiz, f), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const textos = [...src.matchAll(/>([^<]*\p{L}[^<]*)</gu)].map((m) => m[1].trim().replace(/\s+/g, ' '));
  const attrs = [...src.matchAll(ATRIBUTOS)].filter((m) => !(m[1] === 'content' && /^(width=|text\/html|\d)/.test(m[2]))).map((m) => `${m[1]}="${m[2]}"`);
  const total = textos.length + attrs.length;
  if (total) (HTML_ESTRICTO ? error : aviso)(`${f}: ${textos.length} textos y ${attrs.length} atributos con texto (p. ej. «${(textos[0] || attrs[0]).slice(0, 60)}»)`);
  else console.log(`  ${f}: sin texto`);
}

console.log(`\n${errores ? `FALLA: ${errores} errores` : 'OK'} · ${avisos} avisos`);
process.exitCode = errores ? 1 : 0;
