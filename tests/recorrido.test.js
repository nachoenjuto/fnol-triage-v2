// Pruebas del Recorrido de la demo (shell.js + data/recorrido.js) sin dependencias: `node tests/recorrido.test.js` (o `make test`).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
globalThis.RECORRIDO_DEMO = cargar('data/recorrido.js', 'RECORRIDO_DEMO');
require('../shell.js');
const R = globalThis.Shell.Recorrido;
const N = R.PASOS.length;

let n = 0;
const test = async (nombre, fn) => { try { await fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };

(async () => {
  console.log('guion');
  await test('10 pasos, cada uno con página, acción y al menos un subtítulo de dos líneas', () => {
    assert.strictEqual(N, 10);
    R.PASOS.forEach((p, i) => {
      assert.ok(['triaje', 'gobierno'].includes(p.pagina), `paso ${i + 1}: página`);
      assert.ok(p.accion && p.titulo && p.frase, `paso ${i + 1}: acción, título y frase`);
      assert.ok(p.subtitulos.length >= 1, `paso ${i + 1}: subtítulos`);
      p.subtitulos.forEach((s) => assert.ok(s.tecnico && s.negocio && s.tecnico.length <= 300 && s.negocio.length <= 300, `paso ${i + 1}: subtítulo incompleto o largo`));
    });
  });

  console.log('configuración guardada');
  await test('sin nada guardado o con basura: valores por defecto (45 s, subtítulos al pie, pausar al tocar)', () => {
    for (const raw of [null, undefined, 'x', 42, []]) {
      const c = R._normalizarConfig(raw);
      assert.strictEqual(c.segundos, 45); assert.strictEqual(c.subPos, 'pie'); assert.strictEqual(c.pausarAlTocar, true); assert.strictEqual(c.auto, false);
      assert.deepStrictEqual(c.textos, {});
    }
  });
  await test('el tiempo por pantalla se limita a 10–600 s y se redondea', () => {
    assert.strictEqual(R._normalizarConfig({ segundos: 3 }).segundos, 10);
    assert.strictEqual(R._normalizarConfig({ segundos: 9999 }).segundos, 600);
    assert.strictEqual(R._normalizarConfig({ segundos: '62.6' }).segundos, 63);
    assert.strictEqual(R._normalizarConfig({ segundos: 'abc' }).segundos, 45);
    assert.strictEqual(R._normalizarConfig({ segundos: '' }).segundos, 45);
  });
  await test('valores no permitidos se descartan (posición, tamaño, al terminar, tipos)', () => {
    const c = R._normalizarConfig({ subPos: 'izquierda', subTam: 'enorme', alTerminar: 'explotar', auto: 'sí', subtitulos: 0 });
    assert.strictEqual(c.subPos, 'pie'); assert.strictEqual(c.subTam, 'normal'); assert.strictEqual(c.alTerminar, 'parar');
    assert.strictEqual(c.auto, false); assert.strictEqual(c.subtitulos, true);
    assert.strictEqual(R._normalizarConfig({ subPos: 'arriba' }).subPos, 'arriba');
  });
  await test('textos editados: solo pasos existentes, máximo 8 subtítulos y 300 caracteres', () => {
    const largo = 'x'.repeat(500);
    const c = R._normalizarConfig({ textos: { 0: { frase: largo, subtitulos: Array.from({ length: 12 }, () => ({ tecnico: largo, negocio: 1 })) }, 99: { frase: 'no' }, '-1': { frase: 'no' }, 2: 'texto' } });
    assert.deepStrictEqual(Object.keys(c.textos), ['0']);
    assert.strictEqual(c.textos[0].frase.length, 300);
    assert.strictEqual(c.textos[0].subtitulos.length, 8);
    assert.strictEqual(c.textos[0].subtitulos[0].tecnico.length, 300);
    assert.strictEqual(c.textos[0].subtitulos[0].negocio, '1');
  });
  await test('los textos editados se superponen a los del guion sin tocar el resto del paso', () => {
    const c = R._normalizarConfig({ textos: { 3: { frase: 'Otra frase' } } });
    const p = R._pasoDe(3, c);
    assert.strictEqual(p.frase, 'Otra frase');
    assert.strictEqual(p.titulo, R.PASOS[3].titulo);
    assert.deepStrictEqual(p.subtitulos, R.PASOS[3].subtitulos);
  });

  console.log('subtítulos en el tiempo');
  await test('se reparten a partes iguales y el último se queda hasta el final', () => {
    const subs = [1, 2, 3];
    assert.strictEqual(R._cueEn(subs, 0, 45000), 0);
    assert.strictEqual(R._cueEn(subs, 14999, 45000), 0);
    assert.strictEqual(R._cueEn(subs, 15000, 45000), 1);
    assert.strictEqual(R._cueEn(subs, 44999, 45000), 2);
    assert.strictEqual(R._cueEn(subs, 90000, 45000), 2);
    assert.strictEqual(R._cueEn([], 1000, 45000), -1);
  });

  console.log('contraseña del modo presentador');
  await test('se guarda solo su SHA-256 y «password» lo cumple', async () => {
    assert.strictEqual(R.HASH_CLAVE, crypto.createHash('sha256').update('password').digest('hex'));
    assert.strictEqual(await R.sha256Hex('password'), R.HASH_CLAVE);
    assert.notStrictEqual(await R.sha256Hex('Password'), R.HASH_CLAVE);
    assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'shell.js'), 'utf8').includes("'password'"), 'la contraseña no aparece en claro');
  });

  console.log(`\n${n} pruebas ejecutadas${process.exitCode ? ' con fallos' : ' correctamente'}`);
})();
