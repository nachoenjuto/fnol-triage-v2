// Pruebas del Recorrido de la demo (shell.js + data/recorrido.js) sin dependencias: `node tests/recorrido.test.js` (o `make test`).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
require('../locales/node.js')();
globalThis.RECORRIDO_DEMO = cargar('data/recorrido.js', 'RECORRIDO_DEMO');
require('../shell.js');
const R = globalThis.Shell.Recorrido;
const N = R.PASOS.length;

let n = 0;
const test = async (nombre, fn) => { try { await fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };

(async () => {
  console.log('guion');
  await test('24 pasos generados desde el guion, cada uno con página, acción, frase y subtítulos con tipo', () => {
    assert.strictEqual(N, 24);
    R.PASOS.forEach((p, i) => {
      assert.ok(['intro', 'triaje', 'gobierno'].includes(p.pagina), `paso ${i + 1}: página`);
      assert.ok(p.accion && p.titulo && p.frase && p.que, `paso ${i + 1}: acción, título, pantalla y frase`);
      assert.ok(Array.isArray(p.clics), `paso ${i + 1}: clics`);
      assert.ok(p.subtitulos.length >= 1, `paso ${i + 1}: subtítulos`);
      p.subtitulos.forEach((s) => assert.ok(R.TIPOS[s.tipo] && s.texto && s.texto.length <= 400, `paso ${i + 1}: subtítulo sin tipo, vacío o largo`));
    });
    assert.deepStrictEqual(R.PASOS.slice(0, 4).map((p) => p.accion), ['sec:problema', 'sec:solucion', 'sec:actores', 'sec:demo']);
    assert.ok(['intro', 'para', 'que', 'valor'].every((t) => R.PASOS.some((p) => p.subtitulos.some((s) => s.tipo === t))), 'hay subtítulos de los cuatro tipos');
  });
  await test('data/recorrido.js está al día con _docs/guion-demo.md', () => {
    const { execFileSync } = require('child_process');
    const actual = fs.readFileSync(path.join(__dirname, '..', 'data', 'recorrido.js'), 'utf8');
    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'generar-recorrido.js')], { stdio: 'ignore' });
    const nuevo = fs.readFileSync(path.join(__dirname, '..', 'data', 'recorrido.js'), 'utf8');
    if (nuevo !== actual) fs.writeFileSync(path.join(__dirname, '..', 'data', 'recorrido.js'), actual);
    assert.strictEqual(nuevo, actual, 'regenera con «make recorrido» tras cambiar el guion');
  });

  await test('subpasos: acciones conocidas en cada página y los pasos con lote lo piden', () => {
    const COMUNES = ['ver', 'clic', 'cerrar', 'arriba', 'espera'];
    const PAGINA = {
      intro: ['inicio', 'sec'],
      triaje: ['fases', 'procesar', 'ficha', 'fase', 'paquete'],
      gobierno: ['goto', 'agentes', 'kb', 'sel', 'traza', 'kpi', 'gr', 'cambio', 'fr', 'med', 'cmp', 'agente', 'guardrail', 'medida', 'alteracion', 'kb-aplicar', 'replay'],
    };
    let total = 0;
    R.PASOS.forEach((p, i) => {
      assert.ok(PAGINA[p.pagina].includes(p.accion.split(':')[0]), `paso ${i + 1}: acción ${p.accion}`);
      p.subtitulos.forEach((u) => (u.accion || []).forEach((a) => {
        total += 1; const n = a.split(':')[0];
        assert.ok(COMUNES.includes(n) || PAGINA[p.pagina].includes(n), `paso ${i + 1}: acción desconocida «${a}»`);
      }));
    });
    assert.ok(total > 80, `hay acciones en los subpasos (${total})`);
    R.PASOS.forEach((p, i) => { if (/^ficha|^goto|^agentes|^kb/.test(p.accion)) assert.strictEqual(p.requiere, 'lote', `paso ${i + 1}: necesita el lote`); });
    assert.strictEqual(R._tipoAcc(['ver:#x', 'agente:extraccion:pausado']), 'estado');
    assert.strictEqual(R._tipoAcc(['cerrar', 'gr:G-04']), 'ventana');
    assert.strictEqual(R._tipoAcc(['ver:#kpis']), 'vista');
    assert.strictEqual(R._tipoAcc([]), '');
  });

  console.log('configuración guardada');
  await test('sin nada guardado o con basura: valores por defecto (45 s, subtítulos al pie, pausar al tocar)', () => {
    for (const raw of [null, undefined, 'x', 42, []]) {
      const c = R._normalizarConfig(raw);
      assert.strictEqual(c.segundos, 45); assert.strictEqual(c.subPos, 'pie'); assert.strictEqual(c.pausarAlTocar, true); assert.strictEqual(c.auto, false);
      assert.deepStrictEqual(c.textos, {}); assert.deepStrictEqual(c.subTipos, { intro: true, para: true, que: true, valor: true });
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
    const t = R._normalizarConfig({ subTipos: { valor: false, que: 'no', otro: false } }).subTipos;
    assert.deepStrictEqual(t, { intro: true, para: true, que: true, valor: false });
  });
  await test('textos editados: solo pasos existentes, máximo 40 subtítulos de 400 caracteres y tipo válido', () => {
    const largo = 'x'.repeat(500);
    const c = R._normalizarConfig({ guion: 4, textos: { 0: { frase: largo, subtitulos: Array.from({ length: 50 }, () => ({ tipo: 'raro', texto: largo })) }, 99: { frase: 'no' }, '-1': { frase: 'no' }, 2: 'texto' } });
    assert.deepStrictEqual(Object.keys(c.textos), ['0']);
    assert.strictEqual(c.textos[0].frase.length, 400);
    assert.strictEqual(c.textos[0].subtitulos.length, 40);
    assert.strictEqual(c.textos[0].subtitulos[0].texto.length, 400);
    assert.strictEqual(c.textos[0].subtitulos[0].tipo, 'intro');
  });
  await test('los textos guardados con un guion anterior se descartan (otros pasos y otro formato)', () => {
    assert.deepStrictEqual(R._normalizarConfig({ textos: { 5: { frase: 'seis' } } }).textos, {});
    assert.deepStrictEqual(R._normalizarConfig({ guion: 2, textos: { 5: { frase: 'seis' } } }).textos, {});
    const c = R._normalizarConfig({ guion: 4, textos: { 5: { frase: 'seis' } } });
    assert.strictEqual(c.textos[5].frase, 'seis'); assert.strictEqual(c.guion, 4);
    assert.deepStrictEqual(R._normalizarConfig(c).textos, c.textos);
  });
  await test('los textos editados se superponen a los del guion sin tocar el resto del paso', () => {
    const c = R._normalizarConfig({ guion: 4, textos: { 3: { frase: 'Otra frase' } } });
    const p = R._pasoDe(3, c);
    assert.strictEqual(p.frase, 'Otra frase');
    assert.strictEqual(p.titulo, R.PASOS[3].titulo);
    assert.deepStrictEqual(p.subtitulos, R.PASOS[3].subtitulos);
  });

  console.log('subtítulos en el tiempo');
  await test('cada subtítulo dura lo que se tarda en leerlo y el paso se alarga si hace falta', () => {
    const corto = { tipo: 'que', texto: 'x'.repeat(30) }; const largo = { tipo: 'valor', texto: 'x'.repeat(150) };
    assert.strictEqual(R._cueEn([corto, largo], 3000, 14000), 0);   // 4 s (mínimo) frente a 10 s de lectura
    assert.strictEqual(R._cueEn([corto, largo], 4100, 14000), 1);
    const conf = R._normalizarConfig({ segundos: 10 });
    const n = R.PASOS.findIndex((p) => p.subtitulos.length > 5);
    assert.ok(R._durMs(conf, n) > 10000, 'con muchos subtítulos el paso dura más que el mínimo');
    assert.strictEqual(R._durMs({ ...conf, subtitulos: false }, n), 10000);
    const sinValor = R._normalizarConfig({ segundos: 10, subTipos: { valor: false } });
    assert.ok(R._subsVisibles(R.PASOS[n], sinValor).every((u) => u.tipo !== 'valor'));
    assert.ok(R._durMs(sinValor, n) <= R._durMs(conf, n));
  });
  await test('el inicio de cada subtítulo cuadra con el subtítulo que toca en ese instante', () => {
    const subs = R.PASOS[2].subtitulos; const D = 90000;
    for (let k = 0; k < subs.length; k++) assert.strictEqual(R._cueEn(subs, R._inicioCue(subs, k, D) + 30, D), k);
    assert.strictEqual(R._inicioCue(subs, 0, D), 0);
  });
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
