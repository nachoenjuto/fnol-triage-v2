// Los motores que leen el texto de los datos dan lo mismo en cada idioma que en español: `node tests/motores-idioma.test.js`
// (o `make test`). Cada idioma corre en su propio proceso (scripts/motores-idioma.js) porque I18N es global.
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const I18N = require('../locales/i18n.js');
const IDIOMAS = require('../locales/idiomas.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const resultados = (idioma) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, '../scripts/motores-idioma.js'), idioma], { encoding: 'utf8' }));

const B = resultados(I18N.BASE);
const base = B.mensajes;

console.log('motor local en español');
test('MSG-A-04: el hijo que cogió el coche incumple A3 (conductor no declarado)', () => assert.match(base['MSG-A-04'].local.reglas, /A3:incumple/));
test('MSG-A-05: «Los Robles» no es un robo (H4 no aplica) y queda despejado', () => { assert.match(base['MSG-A-05'].local.reglas, /H4:no_aplica/); assert.strictEqual(base['MSG-A-05'].local.decision, 'DESPEJADO'); });

for (const idioma of Object.keys(IDIOMAS).filter((i) => i !== I18N.BASE)) {
  const O = resultados(idioma);
  console.log(`fechas en ${idioma}`);
  test('cada texto traducido tiene las mismas fechas que en español, desplazadas igual', () => {
    const textos = new Set([...Object.keys(B.fechas), ...Object.keys(O.fechas)]);
    const distintos = [...textos].filter((h) => O.traducidos.includes(h) && JSON.stringify(B.fechas[h] || []) !== JSON.stringify(O.fechas[h] || []))
      .map((h) => `${h} ${JSON.stringify(B.fechas[h] || [])} ≠ ${JSON.stringify(O.fechas[h] || [])}`);
    assert.deepStrictEqual(distintos, []);
  });
  const otro = O.mensajes;
  const traducidos = Object.keys(otro).filter((id) => otro[id].traducido);
  if (traducidos.length < Object.keys(base).length) { console.log(`motor local en ${idioma}: ${traducidos.length}/${Object.keys(base).length} mensajes traducidos, se compara cuando estén todos`); continue; }
  console.log(`motor local en ${idioma}`);
  test(`los ${traducidos.length} mensajes dan el mismo ramo, reglas, importe, fecha y decisión que en español`, () => {
    const distintos = traducidos.filter((id) => JSON.stringify(otro[id].local) !== JSON.stringify(base[id].local))
      .map((id) => `${id} ${JSON.stringify(base[id].local)} ≠ ${JSON.stringify(otro[id].local)}`);
    assert.deepStrictEqual(distintos, []);
  });
  console.log(`evidencias en ${idioma}`);
  test('el motor local y los resultados guardados resaltan lo mismo que en español', () => {
    const distintos = traducidos.filter((id) => JSON.stringify(otro[id].evidencias) !== JSON.stringify(base[id].evidencias))
      .map((id) => `${id} ${JSON.stringify(base[id].evidencias)} ≠ ${JSON.stringify(otro[id].evidencias)}`);
    assert.deepStrictEqual(distintos, []);
  });
  console.log(`antifraude en ${idioma}`);
  test('misma puntuación, nivel e indicadores, activados por el mismo número de frases', () => {
    const distintos = traducidos.filter((id) => otro[id].fraude !== base[id].fraude).map((id) => `${id} ${base[id].fraude} ≠ ${otro[id].fraude}`);
    assert.deepStrictEqual(distintos, []);
  });
  console.log(`datos personales en ${idioma}`);
  test('mismos datos personales por tipo, los mismos usados para decidir y los mismos ramos descartados con indicios', () => {
    const distintos = traducidos.filter((id) => JSON.stringify(otro[id].cumplimiento) !== JSON.stringify(base[id].cumplimiento))
      .map((id) => `${id} ${JSON.stringify(base[id].cumplimiento)} ≠ ${JSON.stringify(otro[id].cumplimiento)}`);
    assert.deepStrictEqual(distintos, []);
  });
}

console.log(`\n${n} pruebas ejecutadas correctamente`);
