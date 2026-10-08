// Capturas de la demo para las slides, con Chrome sin interfaz controlado por CDP (sin dependencias):
//   make run          (en otra terminal: sirve la demo en http://localhost:8792)
//   make capturas     (o: node scripts/capturas.mjs [nombre …] para repetir solo algunas)
// Guarda PNG a 2× (1440×900 CSS) en _docs/img/observabilidad/. Las compuestas (dos capturas apiladas) las monta
// scripts/componer-capturas.py. Variables: CHROME (ruta del ejecutable), BASE (URL de la demo).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(RAIZ, '_docs', 'img', 'observabilidad');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8792';
const PUERTO = 9333;
const W = 1440; const H = 900;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Cliente CDP mínimo ──
async function abrirChrome() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'capturas-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PUERTO}/json/list`); const l = await r.json(); const p = l.find((t) => t.type === 'page'); if (p) return { proc, ws: p.webSocketDebuggerUrl, perfil }; } catch { /* aún arrancando */ }
    await espera(200);
  }
  throw new Error('Chrome no arrancó');
}
function conectar(url) {
  const ws = new WebSocket(url); let id = 0; const pend = new Map(); const oyentes = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { ok, ko } = pend.get(m.id); pend.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); } else oyentes.forEach((f) => f(m)); };
  const send = (method, params = {}) => new Promise((ok, ko) => { const i = ++id; pend.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evento = (nombre) => new Promise((ok) => { const f = (m) => { if (m.method === nombre) { oyentes.splice(oyentes.indexOf(f), 1); ok(m.params); } }; oyentes.push(f); });
  return new Promise((ok) => { ws.onopen = () => ok({ send, evento, cerrar: () => ws.close() }); });
}

let cdp; let urlActual = '';
async function ir(url, { forzar = false } = {}) {
  if (url === urlActual && !forzar) return;
  const cargado = cdp.evento('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `${BASE}/${url}` });
  await cargado; await espera(900); urlActual = url;
}
async function js(codigo) {
  const r = await cdp.send('Runtime.evaluate', { expression: `(async () => { ${codigo} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} ${(r.exceptionDetails.exception || {}).description || ''}`);
  return r.result.value;
}
// sel: expresión JS que devuelve el elemento (o null para la ventana completa); recorte opcional en px CSS
async function captura(nombre, sel, { alto } = {}) {
  let clip;
  if (sel) {
    // Dentro de una ventana modal: se desplaza su contenido hasta el bloque y se recorta a la parte visible de la ventana.
    // En la página: se coloca justo debajo de la cabecera fija para que no lo tape.
    const r = await js(`const el = ${sel}; if (!el) throw new Error('No encuentro el elemento de ${nombre}');
      const dlg = el.closest('dialog'); const fijo = getComputedStyle(el).position === 'fixed';
      if (dlg && el !== dlg) el.scrollIntoView({ block: 'start' });
      else if (!dlg && !fijo) { const cab = (document.querySelector('.topbar')?.offsetHeight || 0) + (document.querySelector('.submenu')?.offsetHeight || 0) + 14; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - cab); }
      await new Promise((r) => setTimeout(r, 300));
      let b = el.getBoundingClientRect();
      if (dlg && el !== dlg) { const v = (dlg.querySelector('.modal-body') || dlg).getBoundingClientRect(); const top = Math.max(b.top, v.top); const bottom = Math.min(b.bottom, v.bottom); b = { x: b.x, y: top, width: b.width, height: bottom - top }; }
      return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height };`);
    clip = { ...r, scale: 1 };
  } else {
    await js('window.scrollTo(0, 0)'); await espera(200);
    clip = { x: 0, y: 0, width: W, height: alto || H, scale: 1 };
  }
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: !!sel });
  fs.writeFileSync(path.join(OUT, nombre), Buffer.from(data, 'base64'));
  console.log(`  ${nombre}  ${Math.round(clip.width * 2)}×${Math.round(clip.height * 2)}`);
}
const cerrarModales = "document.querySelectorAll('dialog[open]').forEach((d) => d.close());";
const seccion = (v) => `${cerrarModales} { const t = document.getElementById('tip'); if (t) t.style.display = 'none'; } document.querySelector('.tab[data-view="${v}"]').click(); await new Promise((r) => setTimeout(r, 400));`;
const clic = (sel, ms = 400) => `{ const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('No encuentro ${sel.replace(/'/g, '')}'); el.click(); await new Promise((r) => setTimeout(r, ${ms})); }`;
const porTitulo = (raiz, texto, cierre = '.card') => `[...document.querySelectorAll('${raiz} h2, ${raiz} h3')].find((h) => h.textContent.includes(${JSON.stringify(texto)}))?.closest('${cierre}')`;

// Registro del triaje del Paquete A (como «Resultados guardados»), para no esperar los 13 mensajes
const LOTE_A = `const A = PAQUETES[0].mensajes; const t0 = Date.parse('2026-09-17T09:02:11Z');
  const log = A.map((m, i) => { const r = expandirResultadoGuardado(RESULTADOS_GUARDADOS[m.id]); const { usage, ...json } = r;
    const e = { id: m.id, asunto: m.asunto, paquete: 'A', ramo: r.ramo, importe: r.datos_extraidos.importe_estimado_eur ?? null, decision: r.decision, motivo: r.motivo, confianza: r.confianza, origen: 'IA (guardado)', criterios: r.criterios, criterios_ramo: r.criterios_ramo, pasos: null, datos_extraidos: r.datos_extraidos, evidencias: r.evidencias, raw: JSON.stringify(json, null, 2), usage, duracion_ms: 3400 + ((i * 397) % 1400), timestamp: new Date(t0 + i * 7000).toISOString(), esperado: m.esperado, mensaje: m, gob_opts: { traza_id: TRAZA_DEMO[m.id], modelo: 'gpt-5', prompt: PROMPT_VERSION } };
    e.gobernanza = Cumplimiento.gobernanza(e, e.gob_opts); return e; }).reverse();
  sessionStorage.setItem('triage.log', JSON.stringify(log)); sessionStorage.setItem('triage.motor', JSON.stringify('guardado')); sessionStorage.setItem('triage.paquete', JSON.stringify('A'));`;

// ── Lista de capturas: [nombre, página, preparación (JS), elemento (JS) | null, opciones] ──
const CAPTURAS = [
  ['00-inicio.png', 'gobierno.html', seccion('inicio'), null],
  ['01-resumen.png', 'gobierno.html', seccion('resumen'), null],
  ['02-agentes-kill-switch.png', 'gobierno.html', seccion('resumen'), "document.getElementById('agents').closest('.card')"],
  ['03-trazabilidad.png', 'gobierno.html', seccion('trazas') + clic('#t-trazas tr[data-id="TRZ-4F2D"]'), null],
  ['04-traza-explicada.png', 'gobierno.html', seccion('resumen') + clic('#ultimas tr[data-id="TRZ-4F36"]', 600), "document.getElementById('modal-traza')"],
  ['05-reasoning-replay.png', 'gobierno.html', seccion('replay') + clic('#r-trazas tr[data-id="TRZ-4F2D"]'), null],
  ['05b-replay-diff.png', 'gobierno.html', `${seccion('replay')} const m = document.getElementById('rp-modo'); m.value = 'whatif'; m.dispatchEvent(new Event('change'));
    const mo = document.getElementById('rp-modelo'); mo.selectedIndex = [...mo.options].findIndex((o) => o.text.startsWith('gpt-5-mini')); mo.dispatchEvent(new Event('change'));
    document.getElementById('btn-replay').click(); await new Promise((r) => setTimeout(r, 3500));`, "document.getElementById('card-replay')"],
  ['06-ficha-agente.png', 'gobierno.html', seccion('agentes') + clic('[data-ag-tab="reglas"]'), null],
  ['10-finops-modelos.png', 'gobierno.html', seccion('finops'), "document.getElementById('h-modelos').closest('.card')"],
  ['11-historico.png', 'gobierno.html', seccion('historico'), null],
  ['12-etiqueta-normativa.png', 'gobierno.html', `${seccion('trazas')} const n = document.querySelector('#h-trazas .norma'); const t = document.getElementById('tip');
    t.textContent = n.dataset.tip; t.style.display = 'block'; const b = n.getBoundingClientRect(); t.style.left = b.left + 'px'; t.style.top = (b.bottom + 8) + 'px';
    const cab = document.getElementById('h-trazas').closest('.card-head').getBoundingClientRect(); const tt = t.getBoundingClientRect();
    let c = document.getElementById('clip-captura'); if (!c) { c = document.createElement('div'); c.id = 'clip-captura'; c.style.cssText = 'position:fixed;pointer-events:none'; document.body.append(c); }
    const x = cab.left - 12; const y = cab.top - 12; Object.assign(c.style, { left: x + 'px', top: y + 'px', width: (Math.min(cab.right, Math.max(tt.right, b.right + 420)) - x + 12) + 'px', height: (Math.max(cab.bottom, tt.bottom) - y + 12) + 'px' });`, "document.getElementById('clip-captura')"],
  ['13-autonomia-auditoria.png', 'gobierno.html', `${seccion('autonomia')} const f = [...document.querySelectorAll('#cambios tr[data-cambio]')].find((tr) => /Reglas/.test(tr.textContent) && /L3[\\s\\S]*L2/.test(tr.textContent)); f.click(); await new Promise((r) => setTimeout(r, 500));`, "document.getElementById('modal-cambio')"],
  ['13b-autonomia-evolucion.png', 'gobierno.html', `${seccion('autonomia')} const f = [...document.querySelectorAll('#cambios tr[data-cambio]')].find((tr) => /Reglas/.test(tr.textContent) && /L3[\\s\\S]*L2/.test(tr.textContent)); f.click(); await new Promise((r) => setTimeout(r, 500));`, porTitulo('#modal-cambio', 'Evolución del nivel', 'div')],
  ['14-agente-comportamiento.png', 'gobierno.html', seccion('agentes') + clic('[data-ag-tab="reglas"]'), porTitulo('#ag-ficha', 'Rendimiento y coste')],
  ['15-guardrail-g02.png', 'gobierno.html', seccion('guardrails') + clic('tr[data-gr="G-02"]', 600), "document.getElementById('modal-gr')"],
  ['16-nuevo-guardrail.png', 'gobierno.html', seccion('guardrails') + clic('#btn-new-policy', 600), "document.getElementById('modal-gr-nuevo')"],
  ['17-cap03-consumo.png', 'gobierno.html', seccion('finops') + clic('tr[data-cap="CAP-03"], [data-cap="CAP-03"]', 600), "document.getElementById('modal-cap')"],
  ['17b-cap03-acciones.png', 'gobierno.html', seccion('finops') + clic('tr[data-cap="CAP-03"], [data-cap="CAP-03"]', 600), porTitulo('#modal-cap', 'correctiva', 'div')],
  ['18-nuevo-cap.png', 'gobierno.html', seccion('finops') + clic('#btn-new-cap', 600), "document.getElementById('modal-cap-nuevo')"],
  ['19-caps-superados.png', 'gobierno.html', seccion('finops') + clic('[data-kpi-fin="caps-superados"]', 700), "document.getElementById('modal-kpi-fin')"],
  ['20-coste-mensual.png', 'gobierno.html', seccion('finops') + clic('[data-kpi-fin="coste-mensual"]', 700), "document.getElementById('modal-kpi-fin')"],
  // Novedades: knowledge bases y cumplimiento
  ['31-knowledge.png', 'gobierno.html', seccion('knowledge'), null],
  ['32-kb-comparativa.png', 'gobierno.html', seccion('knowledge') + clic('[data-kb="KB-02"]', 400) + clic('[data-kb-sec="comparativa"]', 400), "document.getElementById('modal-kb')"],
  ['33-rubrica.png', 'gobierno.html', seccion('knowledge') + clic('[data-rub-editar="R-02"]', 500), "document.getElementById('modal-rub')"],
  ['34-termometro.png', 'gobierno.html', seccion('cumplimiento'), null],
  ['35-inventario-pii.png', 'gobierno.html', seccion('cumplimiento') + clic('[data-cmp-item="7"]', 600), "document.getElementById('modal-cmp')"],
  ['36-alertas-resumen.png', 'gobierno.html', `${seccion('resumen')} document.getElementById('res-cumplimiento').scrollIntoView({ block: 'center' });`, "document.getElementById('res-cumplimiento').closest('.two')"],
  ['sesion-gobierno.png', 'gobierno.html', seccion('resumen'), null, { alto: 626 }],
  // Triaje (con el Paquete A ya procesado)
  ['40-triaje.png', 'index.html', '', null],
  ['sesion-triaje.png', 'index.html', '', null, { alto: 626 }],
  ['41-evidencias.png', 'index.html', `${cerrarModales} ${clic('#log-body tr[data-id="MSG-A-08"]', 600)} const mk = document.querySelector('#modal-texto mark.ev[data-n="7"]') || document.querySelector('#modal-texto mark.ev'); mk.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await new Promise((r) => setTimeout(r, 200));`, "document.getElementById('modal')"],
  ['42-respuesta-cruda.png', 'index.html', `${cerrarModales} ${clic('#log-body tr[data-id="MSG-A-12"]', 600)} ${clic('.ficha-tab[data-tab="json"]', 300)} const pre = document.getElementById('modal-raw'); const g = pre.querySelector('.g-bloque'); pre.scrollTop = g.offsetTop - pre.offsetTop - 8; await new Promise((r) => setTimeout(r, 200));`, "document.getElementById('modal')"],
];

async function main() {
  const filtro = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  try { await fetch(`${BASE}/index.html`); } catch { throw new Error(`No responde ${BASE}: arranca antes «make run»`); }
  const chrome = await abrirChrome();
  cdp = await conectar(chrome.ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  // Estado de partida: menú desplegado, sin modo presentador, Paquete A procesado en el triaje
  await ir('index.html');
  await js(`localStorage.setItem('shell.nav', '1'); localStorage.setItem('demo.presentador', '0'); sessionStorage.clear(); ${LOTE_A}`);
  await ir('index.html', { forzar: true });
  console.log('Capturas en _docs/img/observabilidad/:');
  try {
    for (const [nombre, pagina, prep, sel, opts] of CAPTURAS) {
      if (filtro.length && !filtro.some((f) => nombre.includes(f))) continue;
      await ir(pagina);
      if (prep) await js(prep);
      await captura(nombre, sel, opts);
    }
  } finally {
    cdp.cerrar(); chrome.proc.kill(); await espera(800);
    try { fs.rmSync(chrome.perfil, { recursive: true, force: true }); } catch { /* Chrome aún cerrando: se queda en la carpeta temporal */ }
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
