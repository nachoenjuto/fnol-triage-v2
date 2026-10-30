// Resultado de los motores que leen el texto de los datos en un idioma, en JSON: por mensaje (motor local de reglas,
// evidencias resaltadas, datos personales y antifraude) y por texto de los datos (fechas que encuentra fechas.js).
// tests/motores-idioma.test.js lo lanza una vez por idioma y compara con el español.
//   node scripts/motores-idioma.js en
const { fs, path, raiz, textosDatos, cargarTablaDatos } = require('./i18n-comun.js');
const idioma = process.argv[2];
const I18N = require(path.join(raiz, 'locales/node.js'))(idioma);
const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(raiz, f), 'utf8')}\nreturn ${exportar};`)();
// Los datos en español, traducidos en el sitio con locales/<idioma>/<fichero> si el idioma no es el base
const traducir = (obj, fichero) => {
  if (idioma === I18N.BASE) return obj;
  new Function('I18N', fs.readFileSync(path.join(raiz, 'locales', idioma, fichero), 'utf8'))(I18N);
  I18N.traducirDatos(obj);
  return obj;
};
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const original = new Map(PAQUETES.flatMap((p) => p.mensajes).map((m) => [m.id, m.texto]));
traducir(PAQUETES, 'datos-mensajes.js');
const { RESULTADOS_GUARDADOS, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, expandir: expandirResultadoGuardado }');
traducir(RESULTADOS_GUARDADOS, 'datos-resultados.js');
const FRAUDE_DEMO = traducir(cargar('data/fraude.js', 'FRAUDE_DEMO'), 'datos-fraude.js');

const MotorLocal = require(path.join(raiz, 'motor-local.js'));
const Evidencias = require(path.join(raiz, 'evidencias.js'));
const Cumplimiento = require(path.join(raiz, 'cumplimiento.js'));
const Fraude = require(path.join(raiz, 'fraude.js'));
const Fechas = require(path.join(raiz, 'fechas.js'));

// Antifraude por paquete (los indicadores relacionales cruzan los mensajes del lote)
const fraude = {};
for (const p of PAQUETES) {
  const lote = p.mensajes.map((m) => { const r = RESULTADOS_GUARDADOS[m.id] ? expandir(RESULTADOS_GUARDADOS[m.id]) : {}; return { id: m.id, mensaje: m, decision: r.decision, datos_extraidos: r.datos_extraidos || {} }; });
  Object.assign(fraude, Fraude.evaluar(lote, FRAUDE_DEMO));
}
// Evidencias resaltadas: qué datos y reglas respaldan (el texto de la cita y cuántas hay cambian con el idioma)
const refs = (texto, citas, entry) => [...new Set(Evidencias.construir(texto, citas, entry).lista.filter((e) => e.resaltada).map((e) => `${e.ref}:${e.origen}`))].sort().join(' ');

const salida = { mensajes: {}, fechas: {}, traducidos: [] };
for (const m of PAQUETES.flatMap((p) => p.mensajes)) {
  const r = MotorLocal.triage(m);
  const d = r.datos_extraidos;
  const guardado = RESULTADOS_GUARDADOS[m.id] ? expandir(RESULTADOS_GUARDADOS[m.id]) : null;
  salida.mensajes[m.id] = {
    traducido: idioma === I18N.BASE || m.texto !== original.get(m.id),
    local: {
      ramo: r.ramo, decision: r.decision, reglas: r.criterios.map((c) => `${c.regla}:${c.resultado}`).join(' '),
      importe: d.importe_estimado_eur, fecha: d.fecha_hecho, terceros: d.terceros_implicados, lesionados: d.lesionados,
      documentos: d.documentacion_mencionada.length > 0,
    },
    evidencias: {
      local: refs(m.texto, [], { ...r, origen: 'reglas locales' }),
      guardado: guardado ? refs(m.texto, guardado.evidencias, guardado) : null,
    },
    // Puntuación, nivel e indicadores con cuántas frases del mensaje los activan
    fraude: fraude[m.id] ? `${fraude[m.id].score} ${fraude[m.id].nivel} ${fraude[m.id].indicadores.filter((x) => x.aplicado || x.contraindicio).map((x) => `${x.id}${x.contraindicio ? '(contra)' : ''}:${(x.citas || []).length}`).join(' ')}` : null,
    // Datos personales por tipo, cuántos se usan para decidir y qué ramos descartados tienen indicios
    cumplimiento: guardado ? (() => {
      const g = Cumplimiento.gobernanza({ ...guardado, mensaje: m }, { timestamp: '2026-09-17T09:00:00Z' });
      const cuenta = {};
      g.datos_personales.hallazgos.forEach((h) => { cuenta[h.tipo] = (cuenta[h.tipo] || 0) + 1; });
      return {
        datos: Object.entries(cuenta).sort().map(([k, v]) => `${k}:${v}`).join(' '),
        usados: g.datos_personales.hallazgos.filter((h) => h.usado_en_decision).length,
        descartados: g.explicabilidad.descartados.map((d) => `${d.ramo}:${d.indicios.length > 0}`).join(' '),
      };
    })() : null,
  };
}

// Fechas desplazadas hacia delante (cambia de mes) y hacia atrás, por huella del texto en español
for (const [fichero, textos] of Object.entries(textosDatos())) {
  const tabla = idioma === I18N.BASE ? null : cargarTablaDatos(idioma, fichero) || {};
  for (const [h, texto] of textos) {
    const t = tabla ? tabla[h] : texto;
    if (typeof t !== 'string') continue;
    salida.traducidos.push(h);
    const vistas = [];
    for (const dd of [43, -20]) Fechas.desplazarTexto(t, dd, vistas);
    if (vistas.length) salida.fechas[h] = vistas.sort();
  }
}
console.log(JSON.stringify(salida));
