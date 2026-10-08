// Comprobación opcional contra un modelo REAL: mide cuántas evidencias citadas se localizan en el texto.
// Las credenciales se leen de variables de entorno de tu shell; no se escriben en ningún archivo ni en la app.
//
//   export TRIAGE_ENDPOINT='https://<recurso>.openai.azure.com/openai/deployments/<despliegue>/chat/completions?api-version=<versión>'
//   export TRIAGE_API_KEY='…'
//   export TRIAGE_MODEL='<despliegue o modelo>'     # opcional si va en la URL
//   export TRIAGE_REASONING=low                     # opcional (modelos de razonamiento)
//   make test-ia            # Paquete A (13 mensajes);  make test-ia N=3 para probar con 3
const fs = require('fs');
const path = require('path');
const E = require('../evidencias.js');

const cargar = (f, exportar) => new Function(`${fs.readFileSync(path.join(__dirname, '..', f), 'utf8')}\nreturn ${exportar};`)();
const PAQUETES = cargar('data/mensajes.js', 'PAQUETES');
const P = cargar('prompts.js', '{ PROMPT_BLOQUES, buildSystemPrompt, buildUserPrompt }');

const { TRIAGE_ENDPOINT: url, TRIAGE_API_KEY: key, TRIAGE_MODEL: modelo, TRIAGE_REASONING: razonamiento } = process.env;
if (!url || !key) { console.error('Faltan TRIAGE_ENDPOINT y TRIAGE_API_KEY en el entorno (ver cabecera de este archivo).'); process.exit(2); }
const N = Number(process.env.N) || PAQUETES[0].mensajes.length;
const bloques = Object.fromEntries(Object.entries(P.PROMPT_BLOQUES).map(([k, v]) => [k, v.texto]));
const esAzure = /openai\.azure\.com/i.test(url);

async function llamar(msg) {
  const body = { messages: [{ role: 'system', content: P.buildSystemPrompt(bloques) }, { role: 'user', content: P.buildUserPrompt(msg) }], response_format: { type: 'json_object' }, max_completion_tokens: 2500 };
  if (modelo) body.model = modelo;
  if (razonamiento) body.reasoning_effort = razonamiento;
  const t0 = Date.now();
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(esAzure ? { 'api-key': key } : { authorization: `Bearer ${key}` }) }, body: JSON.stringify(body) });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  const data = JSON.parse(txt);
  const choice = data.choices && data.choices[0];
  return { texto: (choice && choice.message && choice.message.content) || '', truncada: choice && choice.finish_reason === 'length', ms: Date.now() - t0, usage: data.usage || {} };
}

(async () => {
  const filas = []; const tot = { pedidas: 0, exactas: 0, normalizadas: 0, noLocalizadas: 0, jsonMalo: 0, sinCampo: 0, truncadas: 0, tokensSalida: 0 };
  for (const m of PAQUETES[0].mensajes.slice(0, N)) {
    try {
      const r = await llamar(m);
      if (r.truncada) tot.truncadas++;
      tot.tokensSalida += (r.usage.completion_tokens || 0);
      let obj; try { obj = JSON.parse((r.texto.match(/\{[\s\S]*\}/) || [''])[0]); } catch { tot.jsonMalo++; filas.push([m.id, 'JSON inválido' + (r.truncada ? ' (truncado: sube el límite de salida)' : '')]); continue; }
      const evs = E.validar(obj.evidencias);
      if (!Array.isArray(obj.evidencias)) tot.sinCampo++;
      const res = evs.map((e) => E.localizar(m.texto, e.cita));
      const ex = res.filter((x) => x && x.tipo === 'exacta').length, no = res.filter((x) => x && x.tipo === 'normalizada').length, ko = res.filter((x) => !x).length;
      tot.pedidas += evs.length; tot.exactas += ex; tot.normalizadas += no; tot.noLocalizadas += ko;
      filas.push([m.id, `${evs.length} citas · ${ex} exactas · ${no} normalizadas · ${ko} no localizadas · ${r.ms} ms · ${r.usage.completion_tokens ?? '?'} tok salida`, ...evs.filter((_, i) => !res[i]).map((e) => `     ✗ «${e.cita}»`)]);
    } catch (err) { filas.push([m.id, `ERROR ${err.message}`]); }
  }
  filas.forEach(([id, ...resto]) => console.log(`${id}  ${resto.join('\n')}`));
  const loc = tot.exactas + tot.normalizadas;
  console.log(`\nResumen: ${loc}/${tot.pedidas} citas localizadas (${tot.pedidas ? Math.round((loc / tot.pedidas) * 100) : 0} %) · ${tot.exactas} exactas · ${tot.normalizadas} normalizadas · ${tot.noLocalizadas} no localizadas`);
  console.log(`Respuestas sin campo «evidencias»: ${tot.sinCampo} · JSON inválido: ${tot.jsonMalo} · truncadas: ${tot.truncadas} · tokens de salida: ${tot.tokensSalida}`);
})();
