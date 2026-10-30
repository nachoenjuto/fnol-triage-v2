// Instantánea del texto que muestra la demo en muchos estados (páginas, secciones, fichas, ventanas, pestañas),
// para comprobar que una migración de textos no cambia nada visible. Chrome sin interfaz (scripts/demo-cdp.mjs).
//   make run                                                     (en otra terminal)
//   node scripts/i18n-instantanea.mjs antes.json [idioma]        guarda la instantánea (idioma: es por defecto)
//   node scripts/i18n-instantanea.mjs --comparar antes.json despues.json [antes2.json]
// Con antes2.json (otra instantánea del mismo código) las líneas que cambian entre ejecuciones (horas, duraciones
// medidas) se comparan con los dígitos enmascarados.
import fs from 'node:fs';
import { abrirDemo, cerrarModales, seccion, clic, LOTE_A } from './demo-cdp.mjs';

// Texto de un nodo en orden de documento: nodos de texto y atributos legibles (title, aria-label, placeholder…)
const EXTRAER = `const ATTR = ['title', 'aria-label', 'placeholder', 'alt', 'data-tip', 'data-titulo'];
  const n1 = (s) => s.replace(/\\s+/g, ' ').trim();
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) { const s = n1(n.nodeValue); if (s) out.push(s); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'svg') return;
    for (const a of ATTR) { const v = n.getAttribute(a); if (v && /\\p{L}/u.test(v)) out.push('@' + a + '=' + n1(v)); }
    if (tag === 'meta' && n.getAttribute('name') === 'description') out.push('@meta=' + n1(n.content));
    if ((tag === 'input' || tag === 'textarea') && n.value && /\\p{L}/u.test(n.value)) out.push('=' + n1(n.value));
    n.childNodes.forEach(walk);
  };`;
const texto = (raiz) => `${EXTRAER} const r = ${raiz}; if (!r) return null; walk(r); return out;`;
const TEXTO_VENTANAS = texto("(() => { const d = [...document.querySelectorAll('dialog[open]')]; if (!d.length) return null; const f = document.createElement('div'); d.forEach((x) => f.append(x.cloneNode(true))); return f; })()");
const TEXTO_PAGINA = texto('document.documentElement');

// Elementos que abren fichas o ventanas en el panel de gobierno (sin los que cambian datos: kill switch,
// aplicar medidas, borrar…). Se recorren en orden de documento, uno por valor de atributo.
const CLIC_GOB = ['tr[data-id]', '[data-gr]', '[data-agente]', '[data-ver-agente]', '[data-traza]', '[data-rub]', '[data-rub-editar]', '[data-medida]', '[data-kpi-fin]', '[data-kb]', '[data-ir-reco]', '[data-ir-alerta]', '[data-guardrail]', '[data-fr-ind]', '[data-fr-indicador]', '[data-fr-gr]', '[data-fr-caso]', '[data-cmp-traza]', '[data-cmp-marco]', '[data-cmp-item]', '[data-cmp-ficha]', '[data-cmp-ambar]', '[data-cap]', '[data-cambio]', '[data-legend]', '#btn-new-policy', '#btn-new-cap'];
// Pestañas dentro de una ficha abierta
const PESTANAS = ['[data-ag-tab]', '[data-kb-sec]', '.ficha-tab[data-tab]', '[data-raw]', '[role="tab"]'];
// Controles de la vista que cambian lo que se ve sin tocar datos
const VISTA_GOB = ['[data-fin-modo]', '[data-med-dim]', '[data-med-orden]', '[data-kb-filtro]', '[data-ahorro-esc]'];
// Clic que no falla si el elemento ya no está (algunos solo existen con otra ficha abierta): devuelve si lo hizo
const clicSuave = (sel, ms = 350) => `{ const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); await new Promise((r) => setTimeout(r, ${ms})); } return true;`;
const VISTAS = ['inicio', 'resumen', 'agentes', 'trazas', 'replay', 'autonomia', 'guardrails', 'hitl', 'fraude', 'finops', 'medidas', 'historico', 'knowledge', 'cumplimiento'];

// Lista de selectores únicos (uno por atributo+valor) de los elementos visibles que casan con `sels` dentro de `raiz`
const objetivos = (sels, raiz = 'document') => `const vistos = new Set(); const out = [];
  for (const s of ${JSON.stringify(sels)}) for (const el of (${raiz}).querySelectorAll(s)) {
    if (!el.getClientRects().length) continue;
    const a = s.match(/\\[([\\w-]+)/); const at = a ? a[1] : null;
    const sel = at ? (el.tagName.toLowerCase() + '[' + at + '="' + CSS.escape(el.getAttribute(at) || '') + '"]') : s;
    if (vistos.has(sel)) continue; vistos.add(sel); out.push(sel);
  } return out;`;

async function instantanea(salida, idioma) {
  const { ir, js, cerrar } = await abrirDemo();
  const estados = {};
  const guardar = async (nombre, codigo = TEXTO_PAGINA) => { const t = await js(codigo); if (t) estados[nombre] = t; };
  const cerrarTodo = `${cerrarModales} document.querySelectorAll('[popover]').forEach((p) => { try { p.hidePopover(); } catch {} }); await new Promise((r) => setTimeout(r, 150));`;
  let n = 0; const paso = (m) => { if (++n % 25 === 0) process.stdout.write(`  ${n} estados · ${m}\n`); };

  try {
    // Estado de partida: idioma pedido, menú desplegado, sin modo presentador, sin registro
    await ir(`index.html?lang=${idioma}`);
    await js("localStorage.setItem('shell.nav', '1'); sessionStorage.clear();");

    // SOLO=gob: solo el panel de gobierno (para depurar)
    const solo = process.env.SOLO || '';
    if (!solo) {
    // ── Introducción ──
    await ir('intro.html', { forzar: true });
    await guardar('intro');
    for (const s of await js("return [...document.querySelectorAll('.nav-item[data-sec]')].map((a) => a.dataset.sec);")) {
      await js(clic(`.nav-item[data-sec="${s}"]`, 300)); await guardar(`intro/${s}`, texto("document.querySelector('.topbar')")); paso('intro');
    }

    // ── Triaje vacío: página, fases y paquetes ──
    await ir('index.html', { forzar: true });
    await guardar('triaje');
    for (const f of await js("return [...document.querySelectorAll('.phase[data-phase]')].map((b) => b.dataset.phase);")) {
      await js(clic(`.phase[data-phase="${f}"]`, 250)); await guardar(`triaje/fase/${f}`, texto("document.getElementById('phase-pop')")); await js(clic(`.phase[data-phase="${f}"]`, 150));
    }
    for (const p of await js("return [...document.getElementById('sel-paquete').options].map((o) => o.value);")) {
      await js(`const s = document.getElementById('sel-paquete'); s.value = ${JSON.stringify(p)}; s.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 200));`);
      await guardar(`triaje/paquete/${p}`, texto("document.querySelector('.sidenav')"));
    }
    await js(clic('#btn-toggle-config', 200)); await guardar('triaje/config', texto("document.getElementById('config-panel')"));

    // ── Triaje con el motor local (sin IA): las decisiones y motivos los escribe app.js ──
    for (const p of ['A', 'B', 'C']) {
      await ir('index.html', { forzar: true });
      await js(`sessionStorage.clear(); const s = document.getElementById('sel-paquete'); s.value = ${JSON.stringify(p)}; s.dispatchEvent(new Event('change'));
        const m = document.getElementById('sel-motor'); m.value = 'auto'; m.dispatchEvent(new Event('change'));
        document.getElementById('btn-run').click();
        for (let i = 0; i < 400 && document.getElementById('btn-run').disabled !== false; i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => setTimeout(r, 800));`);
      await guardar(`triaje/local/${p}`, texto("document.querySelector('.content')"));
      for (const id of await js("return [...document.querySelectorAll('#log-body tr[data-id]')].map((tr) => tr.dataset.id);")) {
        await js(`${cerrarModales} ${clic(`#log-body tr[data-id="${id}"]`, 350)}`);
        for (const tab of await js(objetivos(['.ficha-tab[data-tab]'], "document.querySelector('dialog[open]')"))) { await js(clic(tab, 120)); await guardar(`triaje/local/${id}/${tab}`, TEXTO_VENTANAS); paso(id); }
      }
    }

    // ── Triaje con el Paquete A guardado: fichas completas ──
    await js(`sessionStorage.clear(); ${LOTE_A}`);
    await ir('index.html', { forzar: true });
    await guardar('triaje/lote');
    for (const id of await js("return [...document.querySelectorAll('#log-body tr[data-id]')].map((tr) => tr.dataset.id);")) {
      await js(`${cerrarModales} ${clic(`#log-body tr[data-id="${id}"]`, 400)}`);
      for (const tab of await js(objetivos(['.ficha-tab[data-tab]'], "document.querySelector('dialog[open]')"))) {
        await js(clic(tab, 150)); await guardar(`triaje/lote/${id}/${tab}`, TEXTO_VENTANAS); paso(id);
        for (const sub of await js(objetivos(['[data-raw]'], "document.querySelector('dialog[open]')"))) { await js(clic(sub, 150)); await guardar(`triaje/lote/${id}/${tab}/${sub}`, TEXTO_VENTANAS); }
      }
    }
    await js(cerrarModales);
    }

    // ── Gobierno: cada vista, sus controles y cada ficha (fuente demo y fuente sesión) ──
    for (const fuente of ['demo', 'sesion']) {
      await ir('gobierno.html', { forzar: true });
      await js("sessionStorage.removeItem('gobierno.medidas'); sessionStorage.removeItem('gobierno.correctivas');");
      await ir('gobierno.html', { forzar: true });
      if (fuente === 'sesion') await js("const f = document.getElementById('fuente'); f.value = 'sesion'; f.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 500));");
      for (const v of VISTAS) {
        await js(seccion(v));
        await guardar(`gob/${fuente}/${v}`, texto("document.querySelector('.shell-main') || document.body"));
        for (const c of await js(objetivos(VISTA_GOB, "document.querySelector('.view:not([hidden]), main') || document"))) {
          if (!(await js(clicSuave(c, 250)))) continue;
          await guardar(`gob/${fuente}/${v}/${c}`, texto("document.querySelector('.shell-main') || document.body"));
        }
        if (fuente === 'sesion') continue;   // las fichas solo con la fuente demo (con la de sesión son las mismas plantillas)
        for (const c of await js(objetivos(CLIC_GOB, "document.querySelector('.view:not([hidden]), main') || document"))) {
          if (process.env.DEBUG) console.log(`  gob/${v}/${c}`);
          if (!(await js(`${cerrarTodo} ${seccion(v)} ${clicSuave(c)}`))) continue;
          await guardar(`gob/${v}/${c}`, TEXTO_VENTANAS); paso(`gob/${v}`);
          for (const tab of await js(objetivos(PESTANAS, "(document.querySelector('dialog[open]') || document.createElement('div'))"))) {
            if (await js(clicSuave(tab, 200))) await guardar(`gob/${v}/${c}/${tab}`, TEXTO_VENTANAS);
          }
        }
        await js(cerrarTodo);
      }
    }
    // Flujos que cambian datos, en un orden fijo: aplicar medidas M-01 y M-02 (ahorro conseguido)
    await js(seccion('medidas'));
    if (await js(clicSuave('[data-med-acc="aplicar:M-01:0"]', 500))) await js(clicSuave('[data-med-acc="aplicar:M-02:0"]', 500));
    await guardar('gob/medidas/aplicadas', texto("document.querySelector('.shell-main') || document.body"));

    // ── Recorrido (modo presentador): panel abierto en el primer paso ──
    await js("sessionStorage.setItem('demo.presentador', 'true'); sessionStorage.setItem('demo.recorrido', JSON.stringify({ activo: true, paso: 0, vistos: [], min: false, reproduciendo: false }));");
    await ir('gobierno.html', { forzar: true });
    await guardar('recorrido/panel', texto("document.querySelector('.recorrido, #recorrido, [data-recorrido]') || document.body"));
  } catch (e) {
    console.error(`Error (se guarda lo capturado hasta aquí): ${e.message}`); process.exitCode = 1;
  } finally {
    await cerrar();
  }
  fs.writeFileSync(salida, JSON.stringify(estados));
  const lineas = Object.values(estados).reduce((s, x) => s + x.length, 0);
  console.log(`${salida}: ${Object.keys(estados).length} estados · ${lineas} líneas de texto`);
}

// Compara dos instantáneas. Con una segunda instantánea del «antes», las líneas que ya cambiaban entre
// ejecuciones se comparan con los dígitos enmascarados.
function comparar(fa, fb, fa2) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8')); const B = JSON.parse(fs.readFileSync(fb, 'utf8'));
  const A2 = fa2 ? JSON.parse(fs.readFileSync(fa2, 'utf8')) : null;
  const sinDigitos = (s) => s.replace(/\d/g, '#');
  let difs = 0;
  const claves = [...new Set([...Object.keys(A), ...Object.keys(B)])];
  for (const k of claves) {
    if (!A[k] || !B[k]) { difs++; console.log(`\n[${k}] ${A[k] ? 'falta en el después' : 'nuevo en el después'}`); continue; }
    const vol = new Set(); if (A2 && A2[k]) A[k].forEach((l, i) => { if (A2[k][i] !== l) vol.add(i); });
    const a = A[k].join('\n'); const b = B[k].join('\n');
    if (a === b) continue;
    const ra = A[k].map((l, i) => (vol.has(i) ? sinDigitos(l) : l)); const rb = B[k].map((l, i) => (vol.has(i) ? sinDigitos(l) : l));
    // Igualdad ignorando cómo se reparten los nodos de texto (un texto envuelto en <span> parte una línea en dos)
    if (ra.join(' ') === rb.join(' ')) continue;
    difs++;
    let i = 0; while (i < ra.length && ra[i] === rb[i]) i++;
    console.log(`\n[${k}] primera diferencia en la línea ${i}:\n  antes:   ${JSON.stringify(ra.slice(i, i + 3))}\n  después: ${JSON.stringify(rb.slice(i, i + 3))}`);
  }
  console.log(`\n${claves.length} estados · ${difs ? `${difs} con diferencias` : 'sin diferencias'}`);
  process.exitCode = difs ? 1 : 0;
}

const args = process.argv.slice(2);
if (args[0] === '--comparar') comparar(args[1], args[2], args[3]);
else if (args[0]) instantanea(args[0], args[1] || 'es').catch((e) => { console.error(e.message); process.exit(1); });
else { console.error('Uso: node scripts/i18n-instantanea.mjs salida.json [idioma] | --comparar antes.json despues.json [antes2.json]'); process.exit(2); }
