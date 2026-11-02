// Las fichas triadas en un idioma se rehacen en otro al cambiar de idioma (core/registro.js): `node tests/registro.test.js`
// (o `make test`). Se tría en español y se rehace el registro en cada uno de los otros idiomas, cada uno en su proceso.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const I18N = require('../core/i18n/i18n.js');
const IDIOMAS = require('../locales/idiomas.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const helper = (...args) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'helpers/registro.js'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

const base = helper(I18N.BASE);
const fichero = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'registro-')), 'log.json');
fs.writeFileSync(fichero, JSON.stringify(base));
const enVivo = (e) => e.origen === 'IA';

for (const idioma of Object.keys(IDIOMAS).filter((i) => i !== I18N.BASE)) {
  const { log, rehechas, otraVez, esperado } = helper(idioma, fichero);
  console.log(`registro en ${idioma}`);
  test('se rehacen todas las fichas salvo la respuesta en vivo del modelo, y una sola vez', () => {
    assert.strictEqual(rehechas, base.filter((e) => !enVivo(e)).length);
    assert.strictEqual(otraVez, 0);
  });
  test('cada ficha rehecha tiene el mensaje y el motivo que tendría triada en este idioma', () => {
    const distintos = log.filter((e) => !enVivo(e)).filter((e) => {
      const x = esperado[e.id];
      const motivo = e.origen === 'reglas locales' ? x.local : x.guardado.motivo;
      return e.idioma !== idioma || e.asunto !== x.asunto || e.motivo !== motivo || (e.origen !== 'reglas locales' && e.raw !== x.guardado.raw);
    }).map((e) => `${e.id} (${e.origen})`);
    assert.deepStrictEqual(distintos, []);
  });
  test('ramo y decisión no cambian', () => {
    assert.deepStrictEqual(log.map((e) => `${e.ramo} ${e.decision}`), base.map((e) => `${e.ramo} ${e.decision}`));
  });
  test('la respuesta en vivo del modelo se queda en su idioma; solo cambia la referencia de la demo', () => {
    const sinReferencia = (l) => l.filter(enVivo).map(({ esperado, ...e }) => e);
    assert.deepStrictEqual(sinReferencia(log), sinReferencia(base));
    assert.ok(log.filter(enVivo).every((e) => e.esperado));
  });
}

console.log(`\n${n} pruebas ejecutadas correctamente`);
