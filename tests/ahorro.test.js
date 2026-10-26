// Pruebas de ahorro.js sin dependencias: `node tests/ahorro.test.js` (o `make test`).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const A = require('../ahorro.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const G = cargar('data/gobierno.js', 'GOBIERNO_DEMO');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} frente a ${b}`);

// Periodo de la demo: 14 días, 16.720 mensajes, 81 % de autonomía efectiva
const mensajes = G.diario.reduce((a, d) => a + d[1], 0);
const costeIA = G.diario.reduce((a, d) => a + d[2].reduce((x, y) => x + y, 0), 0);
const datos = { mensajes, autonomia: 81, costeIA, dias: G.diario.length };

console.log('coste de un tramitador');
test('28.000 € brutos → 42.504 € con SS y estructura, 1.360 h, 31,25 €/h, 4,17 € por mensaje de 8 min', () => {
  const c = A.costeManual(G.kpis.negocio);
  cerca(c.costeEmpresa, 36960, 0.01, 'coste empresa');
  cerca(c.costeTotal, 42504, 0.01, 'coste total');
  assert.strictEqual(c.horas, 1360);
  cerca(c.hora, 31.25, 0.01, 'coste por hora');
  cerca(c.mensaje, 4.17, 0.005, 'coste por mensaje');
});

console.log('escenario base de la demo');
test('16.720 mensajes × 81 % → 13.543 automatizados y 3.177 escalados', () => {
  const r = A.calcular(datos, G.kpis.negocio);
  assert.strictEqual(r.mensajes, 16720);
  assert.strictEqual(r.automatizados, 13543);
  assert.strictEqual(r.escalados, 3177);
});
test('ahorro neto ≈ 61.500 € en 14 días y ≈ 1,6 M€ al año', () => {
  const r = A.calcular(datos, G.kpis.negocio);
  cerca(r.neto, 61500, 150, 'neto');
  cerca(r.neto, r.bruto - costeIA, 1e-6, 'neto = bruto − coste IA');
  cerca(r.anual, 1.6e6, 10000, 'anual');
  assert.ok(r.retorno > 250, `retorno ${r.retorno}`);
});
test('sin ahorro en escalados solo cuentan los automatizados', () => {
  const r = A.calcular(datos, { ...G.kpis.negocio, ahorro_escalados: 0 });
  assert.strictEqual(r.evitadoEsc, 0);
  cerca(r.bruto, r.automatizados * r.mensaje, 1e-6, 'bruto');
});

console.log('escenarios');
test('conservador < base < optimista', () => {
  const [c, b, o] = A.ESCENARIOS.map((e) => A.calcular(datos, { ...G.kpis.negocio, minutos_mensaje: e.minutos_mensaje }).neto);
  assert.ok(c < b && b < o, `${c} ${b} ${o}`);
});
test('sin mensajes no hay ahorro ni división por cero', () => {
  const r = A.calcular({ mensajes: 0, autonomia: 81, costeIA: 0, dias: 1 });
  assert.strictEqual(r.neto, 0); assert.strictEqual(r.retorno, 0); assert.strictEqual(r.costeIAMensaje, 0);
});

console.log(`\n${n} pruebas correctas`);
