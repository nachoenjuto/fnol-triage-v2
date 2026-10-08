// Regenera los JSON de ejemplo de data/ a partir de las fuentes JS, para que «Cargar JSON» (panel de gobierno)
// y «Reproducir desde archivo» (triaje) muestren lo mismo que la demo: `node scripts/generar-datos.js` (o `make datos`).
//   data/gobierno-paquete-A.json        ← GOBIERNO_DEMO (data/gobierno.js)
//   data/triage-registro-paquete-A.json ← Paquete A + resultados guardados, con el mismo formato que «Exportar JSON»
const fs = require('fs');
const path = require('path');
const C = require('../cumplimiento.js');

const raiz = path.join(__dirname, '..');
const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(raiz, f), 'utf8')}\nreturn ${exportar};`)();
const escribir = (f, datos) => { fs.writeFileSync(path.join(raiz, f), `${JSON.stringify(datos, null, 2)}\n`); console.log(`  ${f}`); };

const G = cargar('data/gobierno.js', 'GOBIERNO_DEMO');
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const { RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir } = cargar('data/resultados.js', '{ RESULTADOS_GUARDADOS, TRAZA_DEMO, expandir: expandirResultadoGuardado }');
const PROMPT_VERSION = cargar('prompts.js', 'PROMPT_VERSION');

escribir('data/gobierno-paquete-A.json', G);

// Registro del triaje: misma hora de inicio y duración que la traza del panel de gobierno
const registro = PAQUETES[0].mensajes.map((m) => {
  const r = expandir(RESULTADOS_GUARDADOS[m.id]);
  const { usage, ...json } = r;
  const t = G.trazas.find((x) => x.mensaje === m.id);
  const dur = Math.max(...t.spans.map((s) => s[1] + s[2]));
  const entrada = {
    id: m.id, asunto: m.asunto, paquete: 'A', ramo: r.ramo, importe: r.datos_extraidos.importe_estimado_eur ?? null,
    decision: r.decision, motivo: r.motivo, confianza: r.confianza, origen: 'IA', criterios: r.criterios, criterios_ramo: r.criterios_ramo,
    pasos: null, datos_extraidos: r.datos_extraidos, evidencias: r.evidencias, raw: JSON.stringify(json, null, 2), usage,
    duracion_ms: dur, timestamp: new Date(new Date(t.inicio).getTime() + dur).toISOString(), esperado: m.esperado,
    mensaje: { id: m.id, canal: m.canal, asunto: m.asunto, texto: m.texto, remitente: m.remitente },
    gob_opts: { traza_id: TRAZA_DEMO[m.id], modelo: (t.spans.find((s) => s[0] === 'reglas') || [])[3] || 'gpt-5', prompt: PROMPT_VERSION },
  };
  entrada.gobernanza = C.gobernanza(entrada, entrada.gob_opts);
  return entrada;
}).reverse();
escribir('data/triage-registro-paquete-A.json', registro);
