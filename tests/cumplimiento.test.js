// Pruebas de cumplimiento.js sin dependencias: `node tests/cumplimiento.test.js` (o `make test`).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const C = require('../cumplimiento.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir: expandirResultadoGuardado }');
const A = PAQUETES[0].mensajes;

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };

// Misma construcción que app.js en modo «Resultados guardados»
const entrada = (m) => {
  const r = expandir(RESULTADOS_GUARDADOS[m.id]);
  const { usage, ...json } = r;
  return { ...r, id: m.id, raw: JSON.stringify(json, null, 2), origen: 'IA (guardado)', mensaje: m, timestamp: '2026-09-17T09:02:11.000Z' };
};

console.log('sha256');
test('coincide con crypto de Node (vacío, ASCII, UTF-8 con emojis, largo)', () => {
  for (const t of ['', 'abc', 'ñandú 😡 €', 'x'.repeat(5000)]) assert.strictEqual(C.sha256(t), crypto.createHash('sha256').update(t).digest('hex'));
});

console.log('detección de datos personales');
const cats = (m) => C.detectar(m.texto, { remitente: m.remitente.nombre, asegurado: expandir(RESULTADOS_GUARDADOS[m.id]).datos_extraidos.nombre_cliente });
test('DNI, teléfono, IBAN, dirección y póliza (MSG-A-02)', () => {
  const h = cats(A[1]); const tipos = h.map((x) => x.tipo);
  ['dni', 'telefono', 'iban', 'direccion', 'poliza', 'nombre'].forEach((t) => assert.ok(tipos.includes(t), t));
  assert.ok(!h.some((x) => x.tipo === 'tarjeta_sanitaria'), 'un tramo del IBAN no es una tarjeta sanitaria');
});
test('datos de salud, menor y tercero (MSG-A-12)', () => {
  const h = cats(A[11]);
  assert.ok(h.filter((x) => x.categoria === 'salud').length >= 3);
  assert.ok(h.some((x) => x.categoria === 'menor' && x.cita === '(8 años)'));
  assert.ok(h.some((x) => x.categoria === 'tercero' && x.cita === 'Mateo Ruiz Ibarra'));
});
test('un adulto de 22 años no es un menor (MSG-A-04)', () => assert.ok(!cats(A[3]).some((x) => x.categoria === 'menor')));
test('«no hay fractura» no es un dato de salud de fractura (MSG-A-03)', () => assert.ok(!cats(A[2]).some((x) => /fractura/.test(x.cita))));
test('el asegurado que no escribe el mensaje es un tercero (MSG-A-08)', () => assert.ok(cats(A[7]).some((x) => x.categoria === 'tercero' && x.cita === 'Carlos Ortega Ruiz')));
test('las citas coinciden con su posición en el texto', () => {
  for (const m of A) for (const h of cats(m)) assert.strictEqual(m.texto.slice(h.inicio, h.fin), h.cita, `${m.id}: ${h.cita}`);
});

console.log('bloque _gobernanza');
test('la traza persistida no lleva datos personales en claro', () => {
  for (const m of A) {
    const g = C.gobernanza(entrada(m), { traza_id: TRAZA_DEMO[m.id] });
    const json = JSON.stringify(g);
    for (const h of cats(m)) if (h.categoria !== 'salud' && h.cita.length > 6) assert.ok(!json.includes(h.cita), `${m.id}: «${h.cita}» en claro`);
  }
});
test('es determinista: misma entrada, mismos hashes', () => {
  const a = C.gobernanza(entrada(A[0])); const b = C.gobernanza(entrada(A[0]));
  assert.strictEqual(a.trazabilidad.hash_registro, b.trazabilidad.hash_registro);
  assert.strictEqual(a.trazabilidad.hash_entrada, `sha256:${crypto.createHash('sha256').update(A[0].texto).digest('hex')}`);
});
test('explica el ramo y descarta los otros dos (MSG-A-12: Salud, no Auto ni Hogar)', () => {
  const g = C.gobernanza(entrada(A[11]));
  assert.strictEqual(g.explicabilidad.ramo, 'Salud');
  assert.deepStrictEqual(g.explicabilidad.descartados.map((d) => d.ramo), ['Auto', 'Hogar']);
  assert.ok(g.explicabilidad.evidencias_verificadas >= 5);
  assert.ok(g.explicabilidad.por_que.length >= 1);
});
test('supervisión humana: REVISION la requiere, DESPEJADO no', () => {
  assert.strictEqual(C.gobernanza(entrada(A[12])).supervision_humana.requerida, true);
  assert.strictEqual(C.gobernanza(entrada(A[0])).supervision_humana.requerida, false);
});
test('retención: 5 años en Salud, 2 en daños', () => {
  assert.strictEqual(C.gobernanza(entrada(A[9])).retencion.expediente.hasta, '2031-09-17');
  assert.strictEqual(C.gobernanza(entrada(A[0])).retencion.expediente.hasta, '2028-09-17');
});

console.log('cadena de integridad y termómetro');
const items = A.map((m) => { const e = entrada(m); return { gob: C.gobernanza(e, { traza_id: TRAZA_DEMO[m.id], modelo: 'gpt-5', prompt: 'reglas v2.3' }), texto: m.texto, raw: e.raw }; });
test('la cadena se verifica entera y detecta una alteración', () => {
  assert.strictEqual(C.verificarCadena(items).roto, null);
  const alterado = items.map((x, i) => (i === 4 ? { ...x, raw: x.raw.replace('DESPEJADO', 'REVISION') } : x));
  assert.strictEqual(C.verificarCadena(alterado).roto, 4);
});
test('termómetro: porcentajes entre 0 y 100 y la minimización queda en ámbar', () => {
  const t = C.termometro(items.map((x) => x.gob), {}, C.verificarCadena(items));
  t.marcos.forEach((mc) => assert.ok(mc.pct >= 0 && mc.pct <= 100));
  assert.strictEqual(t.marcos.find((mc) => mc.id === 'rgpd').controles.find((c) => c.id === 'rgpd-5c').estado, 'ambar');
  assert.strictEqual(t.resumen.trazas, 13);
});
test('el JSON coloreado no altera el texto del JSON', () => {
  const g = items[0].gob;
  const html = C.jsonHtml({ _gobernanza: g }, { gob: true });
  const texto = html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
  assert.deepStrictEqual(JSON.parse(texto), { _gobernanza: g });
});

console.log('conocimiento (Knowledge bases)');
const GOB = cargar('data/gobierno.js', 'GOBIERNO_DEMO');
test('el catálogo común y el panel tienen las mismas KB, nombres y versiones', () => {
  assert.deepStrictEqual(GOB.knowledge.map((k) => k.id).sort(), Object.keys(C.CONOCIMIENTO).sort());
  for (const k of GOB.knowledge) { assert.strictEqual(k.nombre, C.CONOCIMIENTO[k.id].nombre, k.id); assert.strictEqual(k.version, C.CONOCIMIENTO[k.id].version, k.id); assert.strictEqual(k.simulada, C.CONOCIMIENTO[k.id].simulada, k.id); }
});
test('cada traza registra las KB que usó, con KB-01 en la versión del prompt', () => {
  const g = C.gobernanza(entrada(A[7]), { prompt: 'reglas v2.3' });
  const ids = g.trazabilidad.conocimiento.map((c) => c.kb);
  assert.strictEqual(g.trazabilidad.conocimiento[0].version, 'v2.3');
  ['KB-01', 'KB-02', 'KB-06', 'KB-07'].forEach((id) => assert.ok(ids.includes(id), id));
  assert.ok(!ids.includes('KB-05'), 'una moto no consulta el cuadro médico');
});
test('las rúbricas suman 100 y apuntan a KB existentes', () => {
  for (const r of GOB.rubricas) {
    assert.strictEqual(r.criterios.reduce((a, c) => a + c[1], 0), 100, r.id);
    r.kb.forEach((id) => assert.ok(C.CONOCIMIENTO[id], `${r.id} → ${id}`));
  }
});

console.log(`\n${n} pruebas ejecutadas${process.exitCode ? ' con fallos' : ' correctamente'}`);
