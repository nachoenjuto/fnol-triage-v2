// Pruebas de fraude.js (motor de indicadores) sin dependencias: `node tests/fraude.test.js` (o `make test`).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('../fraude.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, expandir: expandirResultadoGuardado }');
const FD = cargar('data/fraude.js', 'FRAUDE_DEMO');
const G = cargar('data/gobierno.js', 'GOBIERNO_DEMO');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const lote = (p) => p.mensajes.map((m) => { const r = RESULTADOS_GUARDADOS[m.id] ? expandir(RESULTADOS_GUARDADOS[m.id]) : {}; return { id: m.id, mensaje: m, decision: r.decision, datos_extraidos: r.datos_extraidos || {} }; });
const A = lote(PAQUETES[0]);
const ev = F.evaluar(A, FD);

console.log('escenarios del Paquete A');
test('MSG-A-13: robo sin fuerza en póliza recién contratada (EF-01) → SIU con score 90', () => {
  const e = ev['MSG-A-13'];
  assert.strictEqual(e.nivel, 'siu'); assert.strictEqual(e.score, 90); assert.strictEqual(e.escenario, 'EF-01');
  ['IF-01', 'IF-07', 'IF-08', 'IF-09', 'IF-10'].forEach((i) => assert.ok(e.indicadores.some((x) => x.id === i), i));
});
test('MSG-A-09 y MSG-A-02 comparten cuenta (EF-02): vigilancia en A-09 y pago retenido en los dos', () => {
  assert.strictEqual(ev['MSG-A-09'].nivel, 'vigilancia'); assert.strictEqual(ev['MSG-A-09'].escenario, 'EF-02');
  assert.strictEqual(ev['MSG-A-02'].nivel, 'sin'); assert.strictEqual(ev['MSG-A-02'].escenario, 'EF-02');
  assert.strictEqual(ev['MSG-A-09'].pago, 'retenido'); assert.strictEqual(ev['MSG-A-02'].pago, 'retenido');
  assert.ok(ev['MSG-A-09'].enlaces.includes('MSG-A-02') && ev['MSG-A-02'].enlaces.includes('MSG-A-09'));
  assert.ok(ev['MSG-A-09'].enlaces.includes('SIN-2026-08842'), 'y con el siniestro de agosto del histórico');
});
test('MSG-A-11: vandalismo recurrente (EF-03) → vigilancia', () => { assert.strictEqual(ev['MSG-A-11'].nivel, 'vigilancia'); assert.strictEqual(ev['MSG-A-11'].escenario, 'EF-03'); });
test('MSG-A-04: el conductor declarado en la póliza anula IF-11 (contraindicio) y no hay indicio', () => {
  const e = ev['MSG-A-04']; const x = e.indicadores.find((i) => i.id === 'IF-11');
  assert.ok(x && x.contraindicio && x.aplicado === 0); assert.strictEqual(e.nivel, 'sin');
});
test('la decisión del triaje no cambia: 10 aprobados y 3 a revisar', () => {
  assert.strictEqual(A.filter((e) => e.decision === 'REVISION').length, 3);
});
test('los otros ocho mensajes del lote no tienen indicios', () => {
  const con = Object.values(ev).filter((e) => e.score > 0).map((e) => e.id).sort();
  assert.deepStrictEqual(con, ['MSG-A-02', 'MSG-A-04', 'MSG-A-09', 'MSG-A-11', 'MSG-A-13']);
});
test('los paquetes B y C no tienen casos de vigilancia ni de SIU', () => {
  [PAQUETES[1], PAQUETES[2]].forEach((p) => { const r = F.resumen(F.evaluar(lote(p), FD)); assert.strictEqual(r.vigilancia + r.siu, 0, p.id); });
});

console.log('motor');
test('cada cita es literal y está en su posición del mensaje', () => {
  A.forEach((e) => ev[e.id].indicadores.forEach((x) => x.citas.forEach((c) => assert.strictEqual(e.mensaje.texto.slice(c.inicio, c.fin), c.cita, `${e.id} ${x.id}`))));
});
test('desactivar un indicador baja el score y puede cambiar el nivel', () => {
  const cat = FD.indicadores.map((i) => (i.id === 'IF-03' ? { ...i, activo: false } : i));
  const r = F.evaluar(A, { ...FD, indicadores: cat });
  assert.strictEqual(r['MSG-A-09'].score, 15); assert.strictEqual(r['MSG-A-09'].nivel, 'sin'); assert.strictEqual(r['MSG-A-02'].pago, 'libre');
});
test('el score nunca pasa de 100', () => {
  const cat = FD.indicadores.map((i) => ({ ...i, peso: 60 }));
  assert.strictEqual(F.evaluar(A, { ...FD, indicadores: cat })['MSG-A-13'].score, 100);
});
test('duplicado del mismo hecho con importes distintos (IF-12)', () => {
  const m = (id, imp) => ({ id, mensaje: { id, texto: 'Póliza AU-111111', fecha_recepcion: '2026-09-14T10:00:00' }, decision: 'DESPEJADO', datos_extraidos: { numero_poliza: 'AU-111111', importe_estimado_eur: imp } });
  const r = F.evaluar([m('X1', 900), m('X2', 1400)], FD);
  assert.ok(r.X1.indicadores.some((x) => x.id === 'IF-12')); assert.strictEqual(r.X2.escenario, 'EF-07');
});
test('indicador nuevo por frases: palabras completas, sin mayúsculas, solo en sus ramos', () => {
  const nuevo = { id: 'IF-13', nombre: 'Cobro a otra cuenta', peso: 20, activo: true, frases: ['la cuenta es'], ramos: ['Hogar'] };
  const r = F.evaluar(A.map((e) => ({ ...e, ramo: expandir(RESULTADOS_GUARDADOS[e.id]).ramo })), { ...FD, indicadores: [...FD.indicadores, nuevo] });
  const con = Object.values(r).filter((v) => v.indicadores.some((x) => x.id === 'IF-13')).map((v) => v.id);
  assert.deepStrictEqual(con, ['MSG-A-09'], '«la cuenta ES91» de MSG-A-02 no es «la cuenta es»');
  assert.strictEqual(r['MSG-A-09'].score, 70); assert.strictEqual(r['MSG-A-09'].nivel, 'siu');
});
test('el bloque para _gobernanza no lleva citas ni la cuenta', () => {
  const g = JSON.stringify(F.paraGobernanza(ev['MSG-A-09']));
  assert.ok(!/ES91|1332|Vallecas/.test(g)); assert.ok(/IF-03\+35/.test(g)); assert.ok(/"comunicado_al_cliente":false/.test(g));
});
test('la respuesta al cliente no menciona el indicio (G-12)', () => {
  const E = require('../evidencias.js');
  A.forEach((e) => { const r = expandir(RESULTADOS_GUARDADOS[e.id]); const p = E.siguientePaso(r); const b = E.borradorSolicitud({ ...r, mensaje: e.mensaje }, p) || ''; assert.ok(!F.ACUSATORIO.test(`${p.titulo} ${p.detalle} ${b}`), e.id); });
});

console.log('coherencia con el panel');
test('CAP-11 = importe retenido del lote; CAP-10 y CAP-09 = la serie de hoy', () => {
  const cap = (id) => G.caps.find((c) => c.id === id);
  const hoy = FD.diario[FD.diario.length - 1];
  assert.strictEqual(cap('CAP-11').consumo, F.resumen(ev).importe_retenido);
  assert.strictEqual(cap('CAP-10').consumo, hoy[3]); assert.strictEqual(cap('CAP-09').consumo, hoy[4]);
  assert.deepStrictEqual(cap('CAP-10').serie, FD.diario.map((d) => d[3]));
});
test('la evolución tiene las mismas fechas y mensajes que el histórico del panel', () => {
  assert.deepStrictEqual(FD.diario.map((d) => [d[0], d[1]]), G.diario.map((d) => [d[0], d[1]]));
});
test('G-10 dispara tantas veces como escalados a la SIU en 14 días', () => {
  const g = G.politicas.find((p) => p.id === 'G-10');
  assert.strictEqual(g.disparos, FD.diario.reduce((s, d) => s + d[3], 0)); assert.deepStrictEqual(g.disparos_dia, FD.diario.map((d) => d[3]));
});
test('los escenarios usan indicadores del catálogo y normas existentes', () => {
  const C = require('../cumplimiento.js');
  const ids = new Set(FD.indicadores.map((i) => i.id));
  FD.escenarios.forEach((s) => { s.indicadores.forEach((i) => assert.ok(ids.has(i), `${s.id} ${i}`)); s.normas.forEach((k) => assert.ok(C.NORMAS[k], `${s.id} ${k}`)); });
});

console.log(`\n${n} pruebas ejecutadas${process.exitCode ? ' (con fallos)' : ' correctamente'}`);
