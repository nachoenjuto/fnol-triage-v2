// Pruebas del núcleo de idiomas (locales/i18n.js) sin dependencias: `node tests/i18n.test.js` (o `make test`).
const assert = require('assert');
const I18N = require('../locales/i18n.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log(`  ok   ${nombre}`); } catch (e) { console.error(`  FALLA ${nombre}\n       ${e.message}`); process.exitCode = 1; } };
const conIdioma = (i, fn) => { const antes = I18N.idioma; I18N.usar(i); try { fn(); } finally { I18N.usar(antes); } };

I18N.registrar('es', {
  'prueba.hola': 'Hola, {nombre}',
  'prueba.solo_es': 'Solo en español',
  'prueba.mensajes': { one: '{n} mensaje', other: '{n} mensajes' },
});
I18N.registrar('en', {
  'prueba.hola': ['Hello, {nombre}', I18N.huella('Hola, {nombre}')],
  'prueba.mensajes': [{ one: '{n} message', other: '{n} messages' }, I18N.huella({ one: '{n} mensaje', other: '{n} mensajes' })],
});

console.log('textos');
test('interpola variables', () => conIdioma('es', () => assert.strictEqual(I18N.t('prueba.hola', { nombre: 'Marta' }), 'Hola, Marta')));
test('traducción con huella', () => conIdioma('en', () => assert.strictEqual(I18N.t('prueba.hola', { nombre: 'Marta' }), 'Hello, Marta')));
test('si falta en el idioma, usa el base', () => conIdioma('en', () => assert.strictEqual(I18N.t('prueba.solo_es'), 'Solo en español')));
test('si falta en todos, devuelve la clave', () => assert.strictEqual(I18N.t('prueba.no_existe'), 'prueba.no_existe'));
test('marcador sin valor se deja tal cual', () => conIdioma('es', () => assert.strictEqual(I18N.t('prueba.hola'), 'Hola, {nombre}')));
test('plurales en español', () => conIdioma('es', () => { assert.strictEqual(I18N.t('prueba.mensajes', { n: 1 }), '1 mensaje'); assert.strictEqual(I18N.t('prueba.mensajes', { n: 13 }), '13 mensajes'); }));
test('plurales traducidos', () => conIdioma('en', () => assert.strictEqual(I18N.t('prueba.mensajes', { n: 1 }), '1 message')));
test('idioma desconocido no cambia el activo', () => conIdioma('es', () => { I18N.usar('xx'); assert.strictEqual(I18N.idioma, 'es'); }));

console.log('huella');
test('estable y de 8 caracteres', () => { assert.strictEqual(I18N.huella('Idioma'), I18N.huella('Idioma')); assert.match(I18N.huella('Idioma'), /^[0-9a-f]{8}$/); });
test('cambia si cambia el texto', () => assert.notStrictEqual(I18N.huella('Idioma'), I18N.huella('Idiomas')));

console.log('formatos');
test('euros en es-ES con separador de miles', () => conIdioma('es', () => assert.strictEqual(I18N.fmt.eur(1350).replace(/\s/g, ' '), '1.350 €')));
test('euros en en-GB', () => conIdioma('en', () => assert.strictEqual(I18N.fmt.eur(1350), '€1,350')));
test('euros en de-DE', () => conIdioma('de', () => assert.strictEqual(I18N.fmt.eur(1350).replace(/\s/g, ' '), '1.350 €')));
test('importe vacío', () => assert.strictEqual(I18N.fmt.eur(null), '—'));
test('número con decimales en es-ES', () => conIdioma('es', () => assert.strictEqual(I18N.fmt.num(0.0006, { maximumFractionDigits: 4 }), '0,0006')));

console.log(`\n${n} pruebas correctas`);
