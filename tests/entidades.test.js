// Pruebas de core/entidades.js sin dependencias: `node tests/entidades.test.js` (o `make test`).
require('../core/i18n/node.js')();
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../core/entidades.js');
const Fechas = require('../core/fechas.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const PAQUETES = cargar('data/demo/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, expandir } = cargar('data/demo/resultados.js', '{ RESULTADOS_GUARDADOS, expandir: expandirResultadoGuardado }');
const M = PAQUETES.flatMap((p) => p.mensajes);
const porId = Object.fromEntries(M.map((m) => [m.id, m]));
const guardadas = (id) => expandir(RESULTADOS_GUARDADOS[id]).datos_extraidos.entidades;

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };

console.log('formatos');
test('letra de control del DNI y del NIE', () => {
  ['50123456-Q', '02874519-W', '71294580-P', 'X1234567L'].forEach((d) => assert.ok(E.dniValido(d), d));
  ['47258931-K', '50123456-A', '1234'].forEach((d) => assert.ok(!E.dniValido(d), d));
});
test('los DNI de los mensajes tienen la letra de control bien', () => {
  const malos = M.flatMap((m) => (m.texto.match(/\b\d{8}-?[A-Z]\b/g) || []).filter((d) => !E.dniValido(d)).map((d) => `${m.id} ${d}`));
  assert.deepStrictEqual(malos, []);
});

console.log('motor local');
test('encuentra todos los DNI, matrículas, teléfonos, pólizas e IBAN del texto', () => {
  const faltan = [];
  for (const m of M) {
    const e = E.detectar(m);
    const dnis = e.personas.map((p) => p.dni).filter(Boolean);
    (m.texto.match(/\b\d{8}-?[A-Z]\b/g) || []).forEach((d) => { if (!dnis.includes(d)) faltan.push(`${m.id} DNI ${d}`); });
    (m.texto.match(/\b\d{4}\s[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g) || []).forEach((x) => { if (!e.vehiculos.some((v) => v.matricula === x)) faltan.push(`${m.id} matrícula ${x}`); });
    (m.texto.match(/\b(?:AU|HO|SA)-\d{6}\b/g) || []).forEach((x) => { if (!e.identificadores.some((i) => i.codigo === x)) faltan.push(`${m.id} póliza ${x}`); });
    (m.texto.match(/\bES\d{2}(?:\s?\d{4}){5}\b/g) || []).forEach((x) => { if (!e.identificadores.some((i) => i.tipo === 'iban' && i.codigo === x)) faltan.push(`${m.id} IBAN`); });
  }
  assert.deepStrictEqual(faltan, []);
});
test('fecha y hora del accidente con su papel (MSG-A-01)', () => {
  const f = E.detectar(porId['MSG-A-01']).fechas;
  assert.deepStrictEqual(f[0], { fecha: '2026-09-12', hora: '18:30', tipo: 'accidente', precision: 'exacta', cita: 'sábado 12 de septiembre' });
  assert.ok(f.some((x) => x.tipo === 'contratacion_poliza' && x.fecha === '2025-02-03'));
});
test('fechas relativas a la recepción: «hace solo tres semanas» es el alta de la póliza (MSG-A-13)', () => {
  const f = E.detectar(porId['MSG-A-13']).fechas;
  assert.ok(f.some((x) => x.tipo === 'contratacion_poliza' && x.fecha === '2026-08-24' && x.precision === 'relativa'));
  assert.ok(f.some((x) => x.tipo === 'ultima_estancia' && x.fecha === '2026-09-04'));
});
test('una cita médica futura no es una atención pasada (MSG-B-15)', () => {
  const f = E.detectar(porId['MSG-B-15']).fechas;
  assert.deepStrictEqual(f.map((x) => `${x.tipo} ${x.fecha}`), ['atencion_medica 2026-09-09', 'cita_medica 2026-09-22']);
});
test('«Su DNI» es del marido, no de la conductora contraria ni de quien llama (MSG-A-08)', () => {
  const p = E.detectar(porId['MSG-A-08']).personas;
  assert.strictEqual(p.find((x) => x.nombre_propio === 'Carlos Ortega Ruiz').dni, '09472635-Q');
  assert.strictEqual(p.find((x) => x.nombre_propio === 'Rosa Molina Serrano').rol, 'comunicante');
  assert.strictEqual(p.find((x) => x.nombre_propio === 'Beatriz Soler Gómez').rol, 'conductor_contrario');
});
test('vehículo propio y del contrario con marca y modelo (MSG-B-01)', () => {
  assert.deepStrictEqual(E.detectar(porId['MSG-B-01']).vehiculos.map((v) => `${v.rol} ${v.matricula} ${v.modelo_vehiculo}`), ['asegurado 5567 JKD Renault Clio', 'contrario 3814 MKR Hyundai i30']);
});
test('cobertura frente a las entidades esperadas: al menos el 90 %', () => {
  let a = 0; let e = 0;
  for (const m of M) { const r = E.comparar(m.esperado.ner, E.detectar(m)); a += r.acertadas; e += r.esperadas; }
  assert.ok(a / e >= 0.9, `${a}/${e}`);
});

console.log('resultados guardados');
test('los 51 mensajes tienen entidades esperadas y entidades guardadas', () => {
  for (const m of M) {
    assert.ok(Array.isArray(m.esperado.ner) && m.esperado.ner.length >= 4, `${m.id} ner`);
    assert.ok(E.total(guardadas(m.id)) >= 4, `${m.id} ent`);
  }
});
test('tipos dentro del catálogo, fechas ISO y citas literales del mensaje', () => {
  const malos = [];
  for (const m of M) {
    const e = guardadas(m.id);
    e.fechas.forEach((f) => { if (!E.CATALOGO.fechas.includes(f.tipo) || (f.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) || !m.texto.includes(f.cita)) malos.push(`${m.id} fecha ${f.cita}`); });
    ['personas', 'vehiculos', 'lugares', 'organizaciones', 'identificadores'].forEach((g) => e[g].forEach((x) => {
      const tipo = x.rol || x.tipo;
      if (!E.CATALOGO[g].includes(tipo)) malos.push(`${m.id} ${g} ${tipo}`);
      if (g !== 'personas' && !m.texto.includes(x.cita)) malos.push(`${m.id} ${g} ${x.cita}`);
    }));
    e.importes.forEach((x) => { if (!m.texto.includes(x.cita)) malos.push(`${m.id} importe ${x.cita}`); });
  }
  assert.deepStrictEqual(malos, []);
});
test('la extracción guardada falla donde está previsto (4 mensajes) y acierta el resto', () => {
  const fallos = M.map((m) => [m.id, E.comparar(m.esperado.ner, guardadas(m.id))]).filter(([, r]) => r.faltan.length || r.sobran.length).map(([id]) => id);
  assert.deepStrictEqual(fallos, ['MSG-A-02', 'MSG-A-13', 'MSG-B-10', 'MSG-C-15']);
});
test('las fechas esperadas y las guardadas se desplazan igual al día de hoy', () => {
  const P2 = cargar('data/demo/mensajes.js', 'PAQUETES'); const R2 = cargar('data/demo/resultados.js', '{ R: RESULTADOS_GUARDADOS, x: expandirResultadoGuardado }');
  Fechas.desplazar(P2, 62); Fechas.desplazar(R2.R, 62);
  const m = P2[0].mensajes[0];
  const r = E.comparar(m.esperado.ner, R2.x(R2.R[m.id]).datos_extraidos.entidades);
  assert.strictEqual(r.acertadas, r.esperadas);
  assert.ok(m.esperado.ner.includes('fecha|accidente|2026-11-13'));
});

console.log('validación de la respuesta del modelo');
test('descarta lo que no está en el mensaje y normaliza tipos, fechas y DNI', () => {
  const m = porId['MSG-A-01'];
  const v = E.validar({
    fechas: [{ fecha: '2026-09-12', hora: '18:30', tipo: 'accidente', precision: 'exacta', cita: 'sábado 12 de septiembre' }, { fecha: '2026-13-40', tipo: 'boda', cita: 'sábado 12 de septiembre' }, { fecha: '2026-09-01', tipo: 'hecho', cita: 'el 1 de septiembre' }],
    personas: [{ nombre: 'Marta Gil Sanz', rol: 'tomador', dni: '50123456-Q' }, { nombre_propio: 'Raúl Méndez', rol: 'jefe', dni: '47258931-K' }, { nombre_propio: 'Pedro Inventado', rol: 'testigo' }],
    vehiculos: [{ matricula: '4521 KLM', marca_modelo: 'Seat León', rol: 'asegurado' }, { matricula: '0000 XXX' }],
    importes: [{ importe: '1350', concepto: 'presupuesto', cita: '1.350 €' }],
  }, m);
  assert.deepStrictEqual(v.fechas.map((f) => `${f.tipo} ${f.fecha}`), ['accidente 2026-09-12', 'otra null']);
  assert.deepStrictEqual(v.personas.map((p) => `${p.nombre_propio} ${p.rol} ${p.dni_valido}`), ['Marta Gil Sanz tomador true', 'Raúl Méndez otro false']);
  assert.deepStrictEqual(v.vehiculos.map((x) => x.modelo_vehiculo), ['Seat León']);
  assert.strictEqual(v.importes[0].importe, 1350);
  assert.strictEqual(E.validar('nada', m), null);
});

console.log(`\n${n} pruebas ejecutadas correctamente`);
