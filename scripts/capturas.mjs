// Capturas de la demo para las slides, con Chrome sin interfaz controlado por CDP (sin dependencias):
//   make run          (en otra terminal: sirve la demo en http://localhost:8792)
//   make capturas     (o: node scripts/capturas.mjs [nombre …] para repetir solo algunas)
// Guarda PNG a 2× (1440×900 CSS) en _docs/img/observabilidad/. Las compuestas (dos capturas apiladas) las monta
// scripts/componer-capturas.py. Variables: CHROME (ruta del ejecutable), BASE (URL de la demo).
import fs from 'node:fs';
import path from 'node:path';
import { abrirDemo, espera, cerrarModales, seccion, clic, LOTE_A } from './demo-cdp.mjs';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(RAIZ, '_docs', 'img', 'observabilidad');
const W = 1440; const H = 900;

let cdp; let ir; let js;
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
const porTitulo = (raiz, texto, cierre = '.card') => `[...document.querySelectorAll('${raiz} h2, ${raiz} h3')].find((h) => h.textContent.includes(${JSON.stringify(texto)}))?.closest('${cierre}')`;

// ── Lista de capturas: [nombre, página, preparación (JS), elemento (JS) | null, opciones] ──
const CAPTURAS = [
  ['00-inicio.png', 'gobierno.html', seccion('inicio'), null],
  ['01-resumen.png', 'gobierno.html', seccion('resumen'), null],
  ['02-agentes-kill-switch.png', 'gobierno.html', seccion('resumen'), "document.getElementById('agents').closest('.card')"],
  ['03-trazabilidad.png', 'gobierno.html', seccion('trazas') + clic('#t-trazas tr[data-id="TRZ-4F2D"]'), null],
  ['04-traza-explicada.png', 'gobierno.html', seccion('resumen') + clic('#ultimas tr[data-id="TRZ-4F36"]', 600), "document.getElementById('modal-traza')"],
  ['05-reasoning-replay.png', 'gobierno.html', seccion('replay') + clic('#r-trazas tr[data-id="TRZ-4F2D"]'), null],
  // Panel de razonamiento completo (sin su scroll interno): cadena, mensaje con citas y gráfico por agente
  ['05c-razonamiento.png', 'gobierno.html', seccion('replay') + clic('#r-trazas tr[data-id="TRZ-4F2D"]') + "{ const s = document.getElementById('steps'); s.style.maxHeight = 'none'; s.style.overflow = 'visible'; s.style.height = 'auto'; for (let e = s.parentElement; e && e.id !== 'reasoning-row'; e = e.parentElement) { e.style.height = 'auto'; e.style.maxHeight = 'none'; e.style.overflow = 'visible'; } document.getElementById('reasoning-row').style.height = 'auto'; }", "document.getElementById('steps').closest('.card')"],
  ['05b-replay-diff.png', 'gobierno.html', `${seccion('replay')} const m = document.getElementById('rp-modo'); m.value = 'whatif'; m.dispatchEvent(new Event('change'));
    const mo = document.getElementById('rp-modelo'); mo.selectedIndex = [...mo.options].findIndex((o) => o.text.startsWith('gpt-5-mini')); mo.dispatchEvent(new Event('change'));
    document.getElementById('btn-replay').click(); await new Promise((r) => setTimeout(r, 3500));`, "document.getElementById('card-replay')"],
  // Solo la tarjeta de identidad y permisos, con su alto natural (en la rejilla se estira hasta el de la tarjeta vecina)
  ['06-ficha-agente.png', 'gobierno.html', `${seccion('agentes')} ${clic('[data-ag-tab="reglas"]')} const k = ${porTitulo('#ag-ficha', 'Identidad y permisos')}; k.style.alignSelf = 'start';`, porTitulo('#ag-ficha', 'Identidad y permisos')],
  ['10-finops-modelos.png', 'gobierno.html', seccion('finops'), "document.getElementById('h-modelos').closest('.card')"],
  ['11-historico.png', 'gobierno.html', seccion('historico'), null],
  ['12-etiqueta-normativa.png', 'gobierno.html', `${seccion('trazas')} const n = document.querySelector('#h-trazas .norma'); const t = document.getElementById('tip');
    t.textContent = n.dataset.tip; t.style.display = 'block'; const b = n.getBoundingClientRect(); t.style.left = b.left + 'px'; t.style.top = (b.bottom + 8) + 'px';
    const cab = document.getElementById('h-trazas').closest('.card-head').getBoundingClientRect(); const tt = t.getBoundingClientRect();
    let c = document.getElementById('clip-captura'); if (!c) { c = document.createElement('div'); c.id = 'clip-captura'; c.style.cssText = 'position:fixed;pointer-events:none'; document.body.append(c); }
    const x = cab.left - 12; const y = cab.top - 12; Object.assign(c.style, { left: x + 'px', top: y + 'px', width: (Math.min(cab.right, Math.max(tt.right, b.right + 420)) - x + 12) + 'px', height: (Math.max(cab.bottom, tt.bottom) - y + 12) + 'px' });`, "document.getElementById('clip-captura')"],
  ['13-autonomia-auditoria.png', 'gobierno.html', `${seccion('autonomia')} const f = [...document.querySelectorAll('#cambios tr[data-cambio]')].find((tr) => /Reglas/.test(tr.textContent) && /L3[\\s\\S]*L2/.test(tr.textContent)); f.click(); await new Promise((r) => setTimeout(r, 500));`, "document.getElementById('modal-cambio')"],
  ['13b-autonomia-evolucion.png', 'gobierno.html', `${seccion('autonomia')} const f = [...document.querySelectorAll('#cambios tr[data-cambio]')].find((tr) => /Reglas/.test(tr.textContent) && /L3[\\s\\S]*L2/.test(tr.textContent)); f.click(); await new Promise((r) => setTimeout(r, 500));`, porTitulo('#modal-cambio', 'Evolución del nivel', 'div')],
  ['06b-agente-calidad.png', 'gobierno.html', seccion('agentes') + clic('[data-ag-tab="reglas"]'), porTitulo('#ag-ficha', 'Calidad (Paquete A)')],
  // La tabla de comportamiento por modelo tiene siete columnas: para la captura, la tarjeta ocupa todo el ancho y la tabla se ve entera
  ['14-agente-comportamiento.png', 'gobierno.html', `${seccion('agentes')} ${clic('[data-ag-tab="reglas"]')} const k = ${porTitulo('#ag-ficha', 'Rendimiento y coste')}; k.style.gridColumn = '1 / -1'; k.querySelectorAll('.tabla-compacta').forEach((t) => { t.style.maxHeight = 'none'; });`, porTitulo('#ag-ficha', 'Rendimiento y coste')],
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
  // Medidas correctivas: lista priorizada, ficha de M-01 y el ahorro conseguido al aplicar las de coste
  ['37-medidas.png', 'gobierno.html', seccion('medidas'), null, { limpiar: true }],
  ['38-medida-m01.png', 'gobierno.html', `${seccion('medidas')} ${clic('[data-medida="M-01"] h3, [data-medida="M-01"]', 600)}`, "document.getElementById('modal-med')", { limpiar: true }],
  ['39-ahorro-conseguido.png', 'gobierno.html', `${seccion('medidas')} ${clic('[data-med-acc="aplicar:M-01:0"]', 500)} ${clic('[data-med-acc="aplicar:M-02:0"]', 500)}`, "document.getElementById('kpis-med')", { limpiar: true }],
  // Intervención humana (HITL) y alertas de coste de FinOps
  ['44-intervencion-humana.png', 'gobierno.html', seccion('hitl'), null],
  ['45-hitl-calidad.png', 'gobierno.html', seccion('hitl'), "document.getElementById('hitl-calidad')"],
  ['46-alertas-coste.png', 'gobierno.html', seccion('finops'), "document.getElementById('card-correctivas')", { limpiar: true }],
  ['sesion-gobierno.png', 'gobierno.html', seccion('resumen'), null, { alto: 626, limpiar: true }],
  // Triaje (con el Paquete A ya procesado)
  ['40-triaje.png', 'index.html', '', null],
  ['sesion-triaje.png', 'index.html', '', null, { alto: 626 }],
  ['41-evidencias.png', 'index.html', `${cerrarModales} ${clic('#log-body tr[data-id="MSG-A-08"]', 600)} const mk = document.querySelector('#modal-texto mark.ev[data-n="7"]') || document.querySelector('#modal-texto mark.ev'); mk.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await new Promise((r) => setTimeout(r, 200));`, "document.getElementById('modal')"],
  ['42-respuesta-cruda.png', 'index.html', `${cerrarModales} ${clic('#log-body tr[data-id="MSG-A-12"]', 600)} ${clic('.ficha-tab[data-tab="json"]', 300)} const pre = document.getElementById('modal-raw'); const g = pre.querySelector('.g-bloque'); pre.scrollTop = g.offsetTop - pre.offsetTop - 8; await new Promise((r) => setTimeout(r, 200));`, "document.getElementById('modal')"],
  ['43-enviado-al-modelo.png', 'index.html', `${cerrarModales} ${clic('#log-body tr[data-id="MSG-A-08"]', 600)} ${clic('.ficha-tab[data-tab="json"]', 300)} ${clic('[data-raw="enviado"]', 300)}`, "document.getElementById('modal')"],
];

async function main() {
  const filtro = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const demo = await abrirDemo({ W, H });
  ({ cdp, ir, js } = demo);
  // Estado de partida: menú desplegado, sin modo presentador, Paquete A procesado en el triaje
  await ir('index.html');
  await js(`localStorage.setItem('shell.nav', '1'); localStorage.setItem('demo.presentador', '0'); sessionStorage.clear(); ${LOTE_A}`);
  await ir('index.html', { forzar: true });
  console.log('Capturas en _docs/img/observabilidad/:');
  try {
    for (const [nombre, pagina, prep, sel, opts] of CAPTURAS) {
      if (filtro.length && !filtro.some((f) => nombre.includes(f))) continue;
      await ir(pagina);
      // limpiar: medidas y acciones correctivas sin aplicar (algunas capturas las aplican)
      if (opts && opts.limpiar) { await js("sessionStorage.removeItem('gobierno.medidas'); sessionStorage.removeItem('gobierno.correctivas');"); await ir(pagina, { forzar: true }); }
      if (prep) await js(prep);
      await captura(nombre, sel, opts);
    }
  } finally {
    await demo.cerrar();
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
