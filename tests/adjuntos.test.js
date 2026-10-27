// Pruebas de los adjuntos (adjuntos.js, MSG-A-01 y su bloque _gobernanza.adjuntos) sin dependencias: `node tests/adjuntos.test.js` (o `make test`).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const C = require('../cumplimiento.js');
const F = require('../fechas.js');
globalThis.PDFLib = require('../vendor/pdf-lib.min.js');
require('../adjuntos.js');
const Adj = globalThis.Adjuntos;

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, expandir: expandirResultadoGuardado }');
const m = PAQUETES[0].mensajes.find((x) => x.id === 'MSG-A-01');
const r = expandir(RESULTADOS_GUARDADOS['MSG-A-01']);
const { usage, ...json } = r;
const entrada = { ...r, id: m.id, raw: JSON.stringify(json, null, 2), origen: 'IA (guardado)', mensaje: m, timestamp: '2026-09-17T09:02:11.000Z', adjuntos_origen: 'modelo' };

let n = 0;
const test = async (nombre, fn) => { try { await fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };

(async () => {
  console.log('datos');
  await test('solo MSG-A-01 lleva adjuntos: el parte en PDF y dos fotos que existen en data/adjuntos/', () => {
    const con = PAQUETES.flatMap((p) => p.mensajes).filter((x) => (x.adjuntos || []).length);
    assert.deepStrictEqual(con.map((x) => x.id), ['MSG-A-01']);
    assert.deepStrictEqual(m.adjuntos.map((a) => a.mime), ['application/pdf', 'image/jpeg', 'image/jpeg']);
    m.adjuntos.filter((a) => a.src).forEach((a) => assert.ok(fs.statSync(path.join(__dirname, '..', a.src)).size < 300 * 1024, `${a.src} pesa más de 300 KB`));
  });
  await test('la salida guardada trae datos de los tres adjuntos y sus citas de contraste son literales del mensaje', () => {
    assert.deepStrictEqual(r.adjuntos.map((a) => a.id), m.adjuntos.map((a) => a.id));
    r.adjuntos.forEach((a) => a.contraste.forEach((c) => {
      assert.ok(['coincide', 'no_consta', 'discrepa'].includes(c.resultado), `${a.id}.${c.campo}: resultado`);
      assert.ok(m.texto.includes(c.cita), `${a.id}.${c.campo}: «${c.cita}» no está en el mensaje`);
    }));
  });
  await test('el parte cuadra con el mensaje y con lo extraído (fecha, hora, matrícula y póliza)', () => {
    const c = m.adjuntos[0].contenido; const d = r.adjuntos[0].datos;
    assert.strictEqual(c.fecha.split('/').reverse().join('-'), d.fecha_hecho);
    assert.strictEqual(d.fecha_hecho, r.datos_extraidos.fecha_hecho);
    assert.ok(m.texto.includes(`sobre las ${c.hora}`) && m.texto.includes(c.a.matricula) && m.texto.includes(c.a.poliza));
    assert.deepStrictEqual(d.circunstancias_a, c.circunstancias_a);
  });
  await test('fechas.js desplaza igual la fecha del parte, la extraída y la del mensaje', () => {
    const dd = 40;
    const cp = F.desplazar(JSON.parse(JSON.stringify(m)), dd); const rp = F.desplazar(JSON.parse(JSON.stringify(r)), dd);
    assert.strictEqual(cp.adjuntos[0].contenido.fecha.split('/').reverse().join('-'), rp.adjuntos[0].datos.fecha_hecho);
    assert.strictEqual(rp.adjuntos[0].datos.fecha_hecho, rp.datos_extraidos.fecha_hecho);
  });

  console.log('PDF');
  await test('el parte se genera con pdf-lib, es determinista y lleva la fecha de recepción', async () => {
    const opts = { recibido: m.fecha_recepcion };
    const b1 = await Adj.parteAmistoso(m.adjuntos[0].contenido, opts);
    const b2 = await Adj.parteAmistoso(m.adjuntos[0].contenido, opts);
    assert.strictEqual(Buffer.from(b1.slice(0, 5)).toString(), '%PDF-');
    assert.strictEqual(crypto.createHash('sha256').update(b1).digest('hex'), crypto.createHash('sha256').update(b2).digest('hex'));
    const doc = await PDFLib.PDFDocument.load(b1);
    assert.strictEqual(doc.getPageCount(), 1);
    assert.strictEqual(doc.getAuthor(), 'Marta Gil Sanz');
  });
  await test('cambiar la fecha cambia el PDF (la huella sigue al archivo recibido)', async () => {
    const otro = { ...m.adjuntos[0].contenido, fecha: '13/09/2026' };
    const a = await Adj.parteAmistoso(m.adjuntos[0].contenido, { recibido: m.fecha_recepcion });
    const b = await Adj.parteAmistoso(otro, { recibido: m.fecha_recepcion });
    assert.notStrictEqual(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
  });

  console.log('_gobernanza');
  await test('registra los tres archivos con su huella, o «pendiente» si aún no se calculó', () => {
    const sin = C.gobernanza(entrada).adjuntos;
    assert.strictEqual(sin.recibidos, 3);
    assert.ok(sin.archivos.every((a) => /^pendiente/.test(a.hash)));
    const h = 'ab'.repeat(32);
    const con = C.gobernanza({ ...entrada, adjuntos_recibidos: [{ id: 'ADJ-2', bytes: 1000, sha256: h }] }).adjuntos;
    assert.strictEqual(con.archivos[1].hash, `sha256:${h}`); assert.strictEqual(con.archivos[1].bytes, 1000);
  });
  await test('marca los datos del tercero del parte y no deja ninguno en claro', () => {
    const g = C.gobernanza(entrada);
    const dp = g.adjuntos.datos_personales;
    assert.strictEqual(dp.terceros, 4);
    const traza = JSON.stringify(g);
    ['Raúl Méndez Torres', '47258931-K', '7730 JZN', 'ME-77120458', 'parte-amistoso-AU'].forEach((v) => assert.ok(!traza.includes(v), `«${v}» en claro en la traza`));
    assert.match(g.adjuntos.envio_al_modelo, /Sin seudonimizar/);
  });
  await test('en la respuesta cruda, los campos personales de los adjuntos se marcan como sensibles', () => {
    const s = C.camposSensibles(entrada);
    assert.strictEqual(s['adjuntos.0.datos.vehiculo_b.conductor'], 'tercero');
    assert.strictEqual(s['adjuntos.0.datos.vehiculo_a.dni'], 'identificativo');
    assert.ok(C.jsonHtml(json, { sensibles: s }).includes('j-pii-tercero'));
  });
  await test('sin adjuntos no hay bloque, y con el motor local no hay datos extraídos', () => {
    const otro = PAQUETES[0].mensajes.find((x) => x.id === 'MSG-A-02');
    assert.strictEqual(C.gobernanza({ ...entrada, mensaje: otro }).adjuntos, undefined);
    const local = C.gobernanza({ ...entrada, origen: 'reglas locales', adjuntos: null }).adjuntos;
    assert.match(local.datos_extraidos, /motor local/); assert.strictEqual(local.datos_personales.total, 0);
  });

  console.log(`\n${n} pruebas ${process.exitCode ? 'ejecutadas con fallos' : 'ejecutadas correctamente'}`);
})();
