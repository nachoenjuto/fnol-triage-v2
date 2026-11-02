// Registro del triaje en un idioma, en JSON. Sin fichero, tría todos los mensajes como lo haría la página (resultado
// guardado con seudonimización, motor local y una respuesta en vivo de un modelo). Con fichero, rehace ese registro en
// este idioma con core/registro.js. tests/registro.test.js lo lanza en procesos distintos porque I18N es global.
//   node tests/helpers/registro.js es > log.json
//   node tests/helpers/registro.js en log.json
const { fs, path, raiz } = require('../../scripts/i18n/i18n-comun.js');
const [idioma, fichero] = process.argv.slice(2);
const I18N = require(path.join(raiz, 'core/i18n/node.js'))(idioma);
const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(raiz, f), 'utf8')}\nreturn ${exportar};`)();
const traducir = (obj, f) => {
  if (idioma === I18N.BASE) return obj;
  new Function('I18N', fs.readFileSync(path.join(raiz, 'locales', idioma, f), 'utf8'))(I18N);
  I18N.traducirDatos(obj);
  return obj;
};
const PAQUETES = traducir(cargar('data/demo/mensajes.js', 'PAQUETES'), 'datos-mensajes.js');
const { RESULTADOS_GUARDADOS, expandir } = cargar('data/demo/resultados.js', '{ RESULTADOS_GUARDADOS, expandir: expandirResultadoGuardado }');
traducir(RESULTADOS_GUARDADOS, 'datos-resultados.js');
const MotorLocal = require(path.join(raiz, 'core/motor-local.js'));
const Registro = require(path.join(raiz, 'core/registro.js'));
const mensajes = PAQUETES.flatMap((p) => p.mensajes);

// Lo que la página guarda de cada ficha que depende del idioma
const ficha = (msg, r) => ({ id: msg.id, asunto: msg.asunto, mensaje: msg, ramo: r.ramo, decision: r.decision, motivo: r.motivo, criterios: r.criterios, evidencias: r.evidencias || [], raw: r.raw || null, seudonimizacion: r.seudonimizacion || null, origen: r.origen, idioma });

if (!fichero) {
  const log = [];
  for (const m of mensajes) {
    if (RESULTADOS_GUARDADOS[m.id]) log.push(ficha(m, Registro.resultadoGuardado(m, RESULTADOS_GUARDADOS[m.id], { expandir, seudonimizar: true })));
    log.push(ficha(m, { ...MotorLocal.triage(m), origen: 'reglas locales' }));
  }
  log.push({ ...ficha(mensajes[0], { ...MotorLocal.triage(mensajes[0]), origen: 'IA' }), motivo: 'respuesta del modelo' });
  console.log(JSON.stringify(log));
} else {
  const log = JSON.parse(fs.readFileSync(fichero, 'utf8'));
  const d = { idioma, mensajes, guardados: RESULTADOS_GUARDADOS, expandir };
  const rehechas = Registro.rehacerEnIdioma(log, d);
  const otraVez = Registro.rehacerEnIdioma(log, d);
  // Lo que tendría cada ficha si se hubiera triado directamente en este idioma
  const esperado = Object.fromEntries(mensajes.map((m) => [m.id, {
    asunto: m.asunto,
    local: MotorLocal.triage(m).motivo,
    guardado: RESULTADOS_GUARDADOS[m.id] ? Registro.resultadoGuardado(m, RESULTADOS_GUARDADOS[m.id], { expandir, seudonimizar: true }) : null,
  }]));
  console.log(JSON.stringify({ log, rehechas, otraVez, esperado }));
}
