// Chrome sin interfaz controlado por CDP (sin dependencias), compartido por scripts/capturas.mjs y
// scripts/i18n-instantanea.mjs. Variables: CHROME (ruta del ejecutable), BASE (URL de la demo).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const BASE = process.env.BASE || 'http://localhost:8792';
const PUERTO = Number(process.env.CDP_PUERTO) || 9333;   // otro puerto para ejecutar dos a la vez
export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Cliente CDP mínimo ──
async function abrirChrome(W, H) {
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
  return new Promise((ok) => { ws.onopen = () => ok({ send, evento, escuchar: (f) => oyentes.push(f), cerrar: () => ws.close() }); });
}

// Abre Chrome con una pestaña de W×H px CSS a 2× y devuelve { cdp, ir, js, cerrar }.
// ir(url): navega con las fechas congeladas en el día ancla del dataset (fechas.js), así el resultado no cambia
// según el día en que se ejecute. js(código): ejecuta en la página (admite await) y devuelve el valor.
export async function abrirDemo({ W = 1440, H = 900 } = {}) {
  try { await fetch(`${BASE}/index.html`); } catch { throw new Error(`No responde ${BASE}: arranca antes «make run»`); }
  const chrome = await abrirChrome(W, H);
  const cdp = await conectar(chrome.ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  let urlActual = '';
  async function ir(url, { forzar = false } = {}) {
    if (url === urlActual && !forzar) return;
    const cargado = cdp.evento('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${BASE}/${url}${url.includes('?') ? '&' : '?'}fecha=ancla` });
    await cargado; await espera(900); urlActual = url;
  }
  // Un alert/confirm de la página bloquearía la evaluación: se cierran solos
  const oyente = (m) => { if (m.method === 'Page.javascriptDialogOpening') cdp.send('Page.handleJavaScriptDialog', { accept: false }); };
  cdp.escuchar(oyente);
  async function js(codigo, { limite = 20000 } = {}) {
    const ev = cdp.send('Runtime.evaluate', { expression: `(async () => { ${codigo} })()`, awaitPromise: true, returnByValue: true });
    const r = await Promise.race([ev, espera(limite).then(() => { throw new Error(`Sin respuesta en ${limite / 1000} s: ${codigo.slice(0, 160)}`); })]);
    if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} ${(r.exceptionDetails.exception || {}).description || ''}`);
    return r.result.value;
  }
  async function cerrar() {
    cdp.cerrar(); chrome.proc.kill(); await espera(800);
    try { fs.rmSync(chrome.perfil, { recursive: true, force: true }); } catch { /* Chrome aún cerrando: se queda en la carpeta temporal */ }
  }
  return { cdp, ir, js, cerrar };
}

// Atajos de preparación (código JS para js())
export const cerrarModales = "document.querySelectorAll('dialog[open]').forEach((d) => d.close());";
export const seccion = (v) => `${cerrarModales} { const t = document.getElementById('tip'); if (t) t.style.display = 'none'; } document.querySelector('.tab[data-view="${v}"]').click(); await new Promise((r) => setTimeout(r, 400));`;
export const clic = (sel, ms = 400) => `{ const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('No encuentro ${sel.replace(/'/g, '')}'); el.click(); await new Promise((r) => setTimeout(r, ${ms})); }`;

// Registro del triaje del Paquete A (como «Resultados guardados»), para no esperar los 13 mensajes
export const LOTE_A = `const A = PAQUETES[0].mensajes; const t0 = Date.parse('2026-09-17T09:02:11Z');
  const log = A.map((m, i) => { const r = expandirResultadoGuardado(RESULTADOS_GUARDADOS[m.id]); const { usage, ...json } = r;
    const { mensaje: env, mapa } = Cumplimiento.seudonimizarMensaje(m);
    const seudonimizacion = Cumplimiento.resumenSeudonimizacion({ asunto: env.asunto, remitente: env.remitente.nombre + ' (' + env.remitente.contacto + ')', texto: env.texto }, mapa, { simulada: true });
    const e = { id: m.id, asunto: m.asunto, paquete: 'A', ramo: r.ramo, importe: r.datos_extraidos.importe_estimado_eur ?? null, decision: r.decision, motivo: r.motivo, confianza: r.confianza, origen: 'IA (guardado)', criterios: r.criterios, criterios_ramo: r.criterios_ramo, pasos: null, datos_extraidos: r.datos_extraidos, evidencias: r.evidencias, raw: Cumplimiento.seudonimizarTexto(JSON.stringify(json, null, 2), mapa), seudonimizacion, usage, duracion_ms: 3400 + ((i * 397) % 1400), timestamp: new Date(t0 + i * 7000).toISOString(), esperado: m.esperado, mensaje: m, gob_opts: { traza_id: TRAZA_DEMO[m.id], modelo: 'gpt-5', prompt: PROMPT_VERSION } };
    e.gobernanza = Cumplimiento.gobernanza(e, e.gob_opts); return e; }).reverse();
  sessionStorage.setItem('triage.log', JSON.stringify(log)); sessionStorage.setItem('triage.motor', JSON.stringify('guardado')); sessionStorage.setItem('triage.paquete', JSON.stringify('A'));`;
