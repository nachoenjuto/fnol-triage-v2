// Regenera los JSON de ejemplo de data/ a partir de las fuentes JS, para que «Cargar JSON» (panel de gobierno)
// y «Reproducir desde archivo» (triaje) muestren lo mismo que la demo: `node scripts/generar-datos.js` (o `make datos`).
//   data/gobierno-paquete-A.json        ← GOBIERNO_DEMO (data/gobierno.js) + FRAUDE_DEMO (data/fraude.js)
//   data/triage-registro-paquete-A.json ← Paquete A + resultados guardados, con el mismo formato que «Exportar JSON»
require('../locales/node.js')();
const fs = require('fs');
const path = require('path');
const C = require('../cumplimiento.js');
const F = require('../fraude.js');

const raiz = path.join(__dirname, '..');
const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(raiz, f), 'utf8')}\nreturn ${exportar};`)();
const escribir = (f, datos) => { fs.writeFileSync(path.join(raiz, f), `${JSON.stringify(datos, null, 2)}\n`); console.log(`  ${f}`); };

const G = cargar('data/gobierno.js', 'GOBIERNO_DEMO');
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir: expandirResultadoGuardado }');
const PROMPT_VERSION = cargar('prompts.js', 'PROMPT_VERSION');
const FRAUDE_DEMO = cargar('data/fraude.js', 'FRAUDE_DEMO');

// `ancla`: fecha en la que están escritos los datos; al cargarlos, fechas.js los desplaza al día de hoy
escribir('data/gobierno-paquete-A.json', { ancla: '2026-09-17', ...G, fraude: FRAUDE_DEMO });

// Registro del triaje: misma hora de inicio y duración que la traza del panel de gobierno
const registro = PAQUETES[0].mensajes.map((m) => {
  const r = expandir(RESULTADOS_GUARDADOS[m.id]);
  const { usage, ...json } = r;
  const t = G.trazas.find((x) => x.mensaje === m.id);
  const dur = Math.max(...t.spans.map((s) => s[1] + s[2]));
  const entrada = {
    ancla: '2026-09-17', id: m.id, asunto: m.asunto, paquete: 'A', ramo: r.ramo, importe: r.datos_extraidos.importe_estimado_eur ?? null,
    decision: r.decision, motivo: r.motivo, confianza: r.confianza, origen: 'IA', criterios: r.criterios, criterios_ramo: r.criterios_ramo,
    pasos: null, datos_extraidos: r.datos_extraidos, evidencias: r.evidencias, raw: JSON.stringify(json, null, 2), usage,
    ...(r.adjuntos ? { adjuntos: r.adjuntos, adjuntos_origen: 'modelo' } : {}),
    duracion_ms: dur, timestamp: new Date(new Date(t.inicio).getTime() + dur).toISOString(), esperado: m.esperado,
    mensaje: { id: m.id, canal: m.canal, asunto: m.asunto, texto: m.texto, remitente: m.remitente, ...(m.adjuntos ? { adjuntos: m.adjuntos } : {}) },
    gob_opts: { traza_id: TRAZA_DEMO[m.id], modelo: (t.spans.find((s) => s[0] === 'reglas') || [])[3] || 'gpt-5', prompt: PROMPT_VERSION },
  };
  return entrada;
});
// Score antifraude con el lote completo (los cruces necesitan ver todos los mensajes), igual que en la página del triaje
const FR = F.evaluar(registro, FRAUDE_DEMO);
registro.forEach((e) => { e.gobernanza = C.gobernanza(e, { ...e.gob_opts, antifraude: F.paraGobernanza(FR[e.id]) }); });
registro.reverse();
escribir('data/triage-registro-paquete-A.json', registro);
