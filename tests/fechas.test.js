// Pruebas de fechas.js (fechas siempre al día) sin dependencias: `node tests/fechas.test.js` (o `make test`).
require('../locales/node.js')();
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('../fechas.js');
const Ev = require('../evidencias.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const fresco = () => ({
  P: cargar('data/mensajes.js', 'PAQUETES'),
  R: cargar('data/resultados.js', 'RESULTADOS_GUARDADOS'),
  G: cargar('data/gobierno.js', 'GOBIERNO_DEMO'),
  FD: cargar('data/fraude.js', 'FRAUDE_DEMO'),
});

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const T = (s, d) => F.desplazarTexto(s, d);

console.log('texto');
test('ISO con y sin hora; la hora no cambia', () => { assert.strictEqual(T('2026-09-14T09:12:00', 36), '2026-10-20T09:12:00'); assert.strictEqual(T('desde 2026-09-04', 1), 'desde 2026-09-05'); });
test('dd/mm, rangos y mm/aaaa', () => {
  assert.strictEqual(T('Ayer 13/09 por la', 36), 'Ayer 19/10 por la');
  assert.strictEqual(T('04/08 – 10/08', 36), '09/09 – 15/09');
  assert.strictEqual(T('tormentas del 1–3/09;', 36), 'tormentas del 7–9/10;');
  assert.strictEqual(T('EIPD en 03/2026', 36), 'EIPD en 04/2026');
});
test('día de la semana recalculado y mayúscula inicial respetada', () => {
  assert.strictEqual(T('El sábado 12 de septiembre', 36), 'El domingo 18 de octubre');
  assert.strictEqual(T('Sábado 12 de septiembre', 1), 'Domingo 13 de septiembre');
  assert.strictEqual(T('el jueves 10, sobre', 36), 'el viernes 16, sobre');
  assert.strictEqual(T('el pasado día 8 me', 36), 'el pasado día 14 me');
  assert.strictEqual(T('el lunes 14/09', 1), 'el martes 15/09');
});
test('cambio de año', () => { assert.strictEqual(T('Hecho el 12/09, comunicado el 14/09', 106), 'Hecho el 27/12, comunicado el 29/12'); assert.strictEqual(T('17/09 (hoy)', 106), '01/01 (hoy)'); assert.strictEqual(T('2026-09-17', 106), '2027-01-01'); assert.strictEqual(T('julio de 2026', 200), 'enero de 2027'); });
test('lo que no es una fecha no se toca', () => {
  for (const s of ['INC-2026-118734', '2026-001873-AL', 'diligencias 18734/26', 'lote actual 13/13', '9 de 11 tramitadores', '120x140', 'ES91 2100 0418 4502 0005 1332', 'Condicionado 2024', 'v2.3', '2026.09.2']) assert.strictEqual(T(s, 36), s, s);
});
test('las fechas normativas no se mueven (AI Act art. 50, 02/08/2026)', () => assert.strictEqual(T('esperado: 02/08/2026', 36), 'esperado: 02/08/2026'));
test('Δ = 0 deja el texto igual', () => assert.strictEqual(T('El sábado 12 de septiembre, 13/09', 0), 'El sábado 12 de septiembre, 13/09'));

console.log('día de hoy');
test('Δ desde el ancla, con el corte de la mañana y la fecha fijada', () => {
  assert.strictEqual(F.delta(new Date(2026, 9, 23, 12, 0)), 36);
  assert.strictEqual(F.delta(new Date(2026, 9, 23, 9, 0)), 35, 'antes de las 09:45 el «hoy» es ayer');
  assert.strictEqual(F.delta(new Date(), '2026-09-17'), 0); assert.strictEqual(F.delta(new Date(), 'ancla'), 0); assert.strictEqual(F.delta(new Date(), '2026-09-20'), 3);
});

console.log('datos de la demo durante 400 días');
test('las citas siguen siendo literales y los plazos no cambian', () => {
  const base = fresco();
  const plazo = (P) => P.flatMap((p) => p.mensajes.map((m) => [m.id, m.fecha_recepcion.slice(11)]));
  const citasDe = (P, R) => P.flatMap((p) => p.mensajes.filter((m) => R[m.id]).flatMap((m) => (R[m.id].ev || []).map(([, c]) => [m.texto, c, m.id])));
  for (let d = 1; d <= 400; d += 7) {
    const D = fresco(); F.desplazar(D.P, d); F.desplazar(D.R, d);
    for (const [texto, cita, id] of citasDe(D.P, D.R)) assert.ok(Ev.localizar(texto, cita), `Δ=${d} ${id}: «${cita}»`);
    // Hecho → recepción: mismos días que en el ancla
    D.P.forEach((p, i) => p.mensajes.forEach((m, j) => {
      const r = D.R[m.id]; const r0 = base.R[m.id]; const m0 = base.P[i].mensajes[j];
      if (r && r.d.fecha_hecho) assert.strictEqual((new Date(m.fecha_recepcion.slice(0, 10)) - new Date(r.d.fecha_hecho)) / 864e5, (new Date(m0.fecha_recepcion.slice(0, 10)) - new Date(r0.d.fecha_hecho)) / 864e5, `Δ=${d} ${m.id}`);
    }));
    assert.deepStrictEqual(plazo(D.P), plazo(base.P), 'las horas de recepción no cambian');
  }
});
test('panel y antifraude: mismas sumas y 14 días seguidos que acaban hoy', () => {
  const D = fresco(); F.desplazar(D.G, 36); F.desplazar(D.FD, 36);
  assert.strictEqual(D.G.diario[D.G.diario.length - 1][0], '2026-10-23'); assert.strictEqual(D.G.generado, '2026-10-23T09:30:00');
  assert.deepStrictEqual(D.FD.diario.map((x) => x[0]), D.G.diario.map((x) => x[0]));
  const base = fresco();
  assert.strictEqual(D.G.diario.reduce((s, x) => s + x[1], 0), base.G.diario.reduce((s, x) => s + x[1], 0));
  assert.strictEqual(D.FD.historico.polizas['HO-604118'].alta, '2026-09-29', 'el alta de la póliza de MSG-A-13 sigue a 21 días de la recepción');
});
test('un objeto compartido no se desplaza dos veces', () => {
  const o = { a: '2026-09-17' }; const vistos = new WeakSet();
  F.desplazar({ x: o }, 1, vistos); F.desplazar({ y: o }, 1, vistos);
  assert.strictEqual(o.a, '2026-09-18');
});

console.log(`\n${n} pruebas ejecutadas${process.exitCode ? ' (con fallos)' : ' correctamente'}`);
