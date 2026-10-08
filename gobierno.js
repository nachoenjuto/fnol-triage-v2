/* Panel «Gobierno de Agentes»: trazabilidad, Reasoning & Replay, autonomía, guardrails
 * y FinOps de los agentes del triaje. Sin backend: renderiza un dataset (demo embebida
 * en data/gobierno.js, un JSON cargado con el mismo esquema, o el registro de la sesión
 * actual del triaje leído de sessionStorage). Iconos: icons.js (Lucide).
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n, d = 2) => Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d });
  const num = (n) => Number(n || 0).toLocaleString('es-ES');
  const pct = (n) => `${Math.round(n * 100)} %`;
  const ms = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(v)} ms`);
  const hora = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const fechaHora = (iso) => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const ic = (name, cls = 'i') => lucide(name, cls);
  const ssGet = (k, fallback) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  let G = GOBIERNO_DEMO;   // dataset activo (mismo esquema que data/gobierno-paquete-A.json)
  let AG = {};             // agentes por id (se recalcula en cada render)
  let POL = {};            // guardrails y caps por id (tooltips)
  let selId = null;        // traza seleccionada (compartida por Trazabilidad y Reasoning & Replay)
  let filtroTipo = '';     // filtro del histórico
  let periodoDias = 14;    // periodo visible en los gráficos
  let archivo = null;      // { nombre, datos } del JSON cargado
  const ocultos = new Set();      // agentes ocultos en los gráficos (leyendas interactivas)
  const tokOcultos = new Set();   // tipos de token ocultos (entrada / salida / razonamiento)
  const estados = ssGet('gobierno.estados', {}); // kill switch por agente: { id: 'activo' | 'pausado' }
  const grOverrides = {};         // guardrails activados / desactivados en la sesión

  const agColor = (id) => `var(--ag-${id}, var(--primary))`;
  const agNombre = (id) => (AG[id] ? AG[id].nombre : id);
  // «Agente de X» (o «Ag. de X» si ocupa dos líneas, ver ajustarAgentes) solo para los agentes del pipeline
  const esPrincipal = (id) => !!AG[id] && AG[id].cap_hoy != null;
  const agLbl = (id) => (esPrincipal(id) ? `<span class="agn"><span class="pre"></span>${esc(agNombre(id))}</span>` : esc(agNombre(id)));
  const svgAg = (id) => (esPrincipal(id) ? `Ag. de ${agNombre(id)}` : agNombre(id)); // en SVG no hay saltos de línea: siempre abreviado
  const agTag = (id) => `<span class="ag" style="--c:${agColor(id)}"><i class="dot"></i>${agLbl(id)}</span>`;
  const CANAL = { email: ['mail', 'Email'], web: ['globe', 'Formulario web'], chat: ['messages-square', 'Chat'], telefono: ['phone', 'Teléfono'], whatsapp: ['message-circle', 'WhatsApp'] };
  const canalInfo = (c) => CANAL[c] || ['messages-square', c];
  const canal = (c) => { const [i, l] = canalInfo(c); return `<span title="${esc(l)}" style="display:inline-flex;align-items:center;gap:.3rem">${ic(i)}<span class="muted small">${esc(l)}</span></span>`; };
  const ramoPill = (r) => `<span class="pill pill-${esc(String(r || 'indeterminado').toLowerCase())}">${esc(r)}</span>`;
  const decPill = (d) => (d === 'REVISION' ? `<span class="pill pill-review">${ic('user-check')} A revisar</span>` : `<span class="pill pill-ok">${ic('circle-check')} Aprobado</span>`);
  const resPill = (t) => ({ auto: `<span class="pill pill-ok">${ic('zap')} Autónomo</span>`, humano: `<span class="pill pill-review">${ic('user-check')} Escalado</span>`, override: `<span class="pill pill-time">${ic('repeat')} Override</span>` }[t.resultado] || '');
  const lvlBadge = (n, title) => `<span class="lvl l${n}" title="${esc(title || (G.niveles[n] || {}).desc || '')}">L${n}</span>`;
  const SEV_ICON = { crit: 'triangle-alert', warn: 'circle-alert', info: 'info', ok: 'circle-check' };

  // Guardrails y caps: tooltip con la descripción en cualquier referencia (G-04, CAP-03)
  const grTip = (id) => { const p = POL[id]; if (!p) return ''; return p.tipo ? `${id} · ${p.tipo} · ${p.ambito} · límite ${p.limite} ${p.unidad} → ${p.accion}` : `${id} · ${p.condicion} → ${p.accion}${p.descripcion ? `. ${p.descripcion}` : ''}`; };
  const grRef = (id) => (POL[id] ? `<span class="gr" data-tip="${esc(grTip(id))}">${esc(id)}</span>` : esc(id));
  // Aplica sobre texto YA escapado: envuelve los códigos de guardrail / cap
  const conGuardrails = (html) => String(html).replace(/\b(G-\d{2}|CAP-\d{2})\b/g, (m) => grRef(m));

  // Marco normativo: etiquetas con tooltip junto al título de cada bloque (qué norma respalda lo que se ve)
  // Catálogo compartido con la ficha del triaje (cumplimiento.js): misma etiqueta y explicación en las dos páginas
  const NORMA = Cumplimiento.NORMAS;
  const normas = (...ids) => `<span class="normas">${ids.map((k) => `<span class="norma" data-tip="${esc(NORMA[k][1])}">${ic('scale')} ${esc(NORMA[k][0])}</span>`).join('')}</span>`;
  const NORMAS_BLOQUE = {
    'h-agentes': ['ai-14'], 'h-alertas': ['eiopa'], 'h-trazas': ['ai-12', 'rgpd-5', 'dora-28'], 'h-reasoning': ['rgpd-15', 'ai-13'], 'h-replay': ['ai-15', 'eiopa'],
    'h-niveles': ['ai-14', 'rgpd-22'], 'h-cambios': ['rgpd-5', 'eiopa'], 'h-guardrails': ['ai-9', 'ai-14'], 'h-caps': ['sii-41'], 'h-modelos': ['dora-28'], 'h-hist': ['ai-12', 'rgpd-5'],
  };
  const titulo = (id, icono, texto) => { $(id).innerHTML = `${ic(icono)} ${texto}${NORMAS_BLOQUE[id] ? normas(...NORMAS_BLOQUE[id]) : ''}`; };

  // Coste de un span según la tabla de precios (€ por millón de tokens; razonamiento se cobra como salida)
  const spanCost = ([, , , modelo, tin, tout, treas]) => { const p = G.precios[modelo] || { in: 0, out: 0 }; return (tin * p.in + (tout + treas) * p.out) / 1e6; };
  const tr = (t) => ({ dur: Math.max(...t.spans.map((s) => s[1] + s[2])), tokens: t.spans.reduce((a, s) => a + s[4] + s[5] + s[6], 0), coste: t.spans.reduce((a, s) => a + spanCost(s), 0) });
  const diarioVisible = () => G.diario.slice(-periodoDias);
  const costeDia = (d) => d[2].reduce((a, b) => a + b, 0);
  const capDiario = () => (G.caps.find((c) => c.id === 'CAP-01') || { limite: 20 }).limite;
  const agentesPrincipales = () => G.agentes.filter((a) => a.cap_hoy != null);
  const estadoAgente = (a) => estados[a.id] || a.estado;
  const politicaActiva = (p) => (grOverrides[p.id] != null ? grOverrides[p.id] : p.activa);

  // ---------------------------------------------------------------------------
  // Fuentes de datos: demo · sesión actual del triaje · archivo JSON
  // ---------------------------------------------------------------------------
  // Convierte el registro del triaje (sessionStorage «triage.log») en trazas del panel.
  // 1 paso: un único span de IA; 2 pasos: clasificación + extracción/reglas; sin IA: motor local.
  function trazasDesdeSesion() {
    const log = ssGet('triage.log', []);
    if (!Array.isArray(log) || !log.length) return null;
    const cfg = ssGet('triage.cfg', {});
    const dep = String(cfg.deployment || '').toLowerCase();
    const modelo = /nano/.test(dep) ? 'gpt-5-nano' : /mini/.test(dep) ? 'gpt-5-mini' : 'gpt-5';
    return [...log].reverse().map((e, i) => {
      const dur = Math.max(1, e.duracion_ms || 1);
      const ia = /^IA/.test(e.origen || '');
      const u = e.usage || {};
      const tok = (x) => [x?.input || 0, x?.output || 0, x?.reasoning || 0];
      let spans;
      if (ia && e.pasos && e.pasos.length > 1) {
        const d1 = Math.round(dur * 0.3);
        spans = [['multicanal', 0, 40, 'local', 0, 0, 0], ['clasificacion', 40, d1, modelo, ...tok(e.pasos[0].usage)], ['reglas', 40 + d1, dur - 40 - d1, modelo, ...tok(e.pasos[1].usage)]];
      } else if (ia) {
        spans = [['multicanal', 0, 40, 'local', 0, 0, 0], ['ia', 40, dur - 40, modelo, ...tok(u)]];
      } else {
        spans = [['multicanal', 0, 40, 'local', 0, 0, 0], ['local', 40, dur - 40, 'local', 0, 0, 0]];
      }
      const incumple = (e.criterios || []).filter((c) => c.resultado === 'incumple').map((c) => c.regla);
      const incidencias = /fallback/i.test(e.origen || '') ? [`Fallback al motor local: ${e.origen.replace(/^.*fallback IA:\s*/i, '').replace(/\)$/, '')}`] : [];
      return {
        id: (e.gobernanza && e.gobernanza.trazabilidad && e.gobernanza.trazabilidad.traza_id) || `TRZ-S${String(i + 1).padStart(3, '0')}`, mensaje: e.id, asunto: e.asunto, canal: e.mensaje?.canal || 'chat',
        inicio: new Date(new Date(e.timestamp).getTime() - dur).toISOString(), ramo: e.ramo, decision: e.decision, confianza: e.confianza ?? 0, motivo: e.motivo,
        resultado: e.decision === 'REVISION' ? 'humano' : 'auto', guardrail: incumple.length ? `${incumple.join(', ')} incumple → escalado` : undefined,
        incidencias: incidencias.length ? incidencias : undefined, spans, origen: e.origen,
      };
    });
  }

  function setFuente(f) {
    const status = $('fuente-status');
    if (f === 'sesion') {
      const trazas = trazasDesdeSesion();
      if (!trazas) { status.textContent = 'La sesión actual no tiene decisiones registradas: procesa un paquete en el triaje y vuelve a este panel (misma pestaña).'; $('fuente').value = 'demo'; return setFuente('demo'); }
      const extra = [{ id: 'ia', nombre: 'IA · clasificación + extracción + reglas (1 paso)', icono: 'sparkles', modelo: '—', prompt: '—', nivel: 2, estado: 'activo' }, { id: 'local', nombre: 'Motor local (sin IA)', icono: 'workflow', modelo: 'reglas', prompt: '—', nivel: 3, estado: 'activo' }];
      G = { ...GOBIERNO_DEMO, agentes: [...GOBIERNO_DEMO.agentes, ...extra], precios: { ...GOBIERNO_DEMO.precios, local: { in: 0, out: 0 } }, trazas, razonamiento: {} };
      status.textContent = `Trazas de la sesión actual: ${trazas.length} decisiones del registro del triaje. Histórico, caps, guardrails y modelos siguen siendo datos de demostración.`;
    } else if (f === 'archivo' && archivo) {
      G = { ...GOBIERNO_DEMO, ...archivo.datos };
      status.textContent = `Archivo ${archivo.nombre}: ${G.trazas.length} trazas, ${(G.eventos || []).length} eventos, ${(G.caps || []).length} caps.`;
    } else {
      G = GOBIERNO_DEMO;
      status.textContent = '';
    }
    selId = null;
    renderAll();
  }

  async function cargarArchivo(file) {
    try {
      const datos = JSON.parse(await file.text());
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.agentes) || !Array.isArray(datos.trazas) || !datos.trazas.every((t) => t && t.id && Array.isArray(t.spans))) throw new Error('no tiene el esquema del panel (agentes[], trazas[] con spans)');
      archivo = { nombre: file.name, datos };
      const op = $('fuente').querySelector('[value="archivo"]');
      op.disabled = false; op.textContent = `Archivo JSON · ${file.name}`;
      $('fuente').value = 'archivo';
      setFuente('archivo');
    } catch (err) {
      $('fuente-status').textContent = `No se pudo cargar el archivo: ${err.message}`;
    }
  }

  // ---------------------------------------------------------------------------
  // Resumen: KPI, agentes, alertas, últimas trazas
  // ---------------------------------------------------------------------------
  const kpi = (t) => `<article class="card kpi kpi-${t.cls}"${t.id ? ` data-kpi-fin="${t.id}" tabindex="0" role="button" aria-haspopup="dialog"` : ''}><span class="l">${ic(t.icono)} ${esc(t.etiqueta)}</span><span class="v">${esc(t.valor)}</span><span class="s">${t.subHtml || conGuardrails(esc(t.sub))}</span>${t.medidor != null ? `<div class="meter" style="--c:var(--${t.cls})"><i style="width:${Math.min(100, t.medidor)}%"></i></div>` : ''}</article>`;

  function renderResumen() {
    const dias = diarioVisible();
    const totalMsgs = dias.reduce((a, d) => a + d[1], 0);
    const coste = dias.reduce((a, d) => a + costeDia(d), 0);
    const capMes = G.kpis.cap_mensual || 500;
    const [aut, esc1, ovr, alr] = G.kpis.resumen;
    $('kpis').innerHTML = [
      kpi({ cls: 'primary', icono: 'activity', etiqueta: 'Mensajes procesados', valor: num(totalMsgs), sub: `${dias.length} día${dias.length > 1 ? 's' : ''} · ${num(Math.round(totalMsgs / dias.length))} / día de media`, id: 'res-msgs' }),
      kpi({ ...aut, id: 'res-aut' }), kpi({ ...esc1, id: 'res-esc' }), kpi({ ...ovr, id: 'res-ovr' }),
      kpi({ cls: 'warn', icono: 'euro', etiqueta: 'Coste del periodo', valor: eur(coste, coste < 10 ? 2 : 0), sub: `${Math.round((coste / capMes) * 100)} % del cap mensual (${eur(capMes, 0)}) · ${eur(totalMsgs ? coste / totalMsgs : 0, 4)} por mensaje`, medidor: (coste / capMes) * 100, id: 'res-coste' }),
      kpi({ ...alr, id: 'res-alertas' }),
    ].join('');
    $('agents').innerHTML = agentesPrincipales().map((a) => agentCard(a, false)).join('');
    $('alerts').innerHTML = (G.alertas || []).map((a) => `<div class="alert ${a.sev}"><span class="ico">${ic(SEV_ICON[a.sev] || 'info')}</span><div><b>${conGuardrails(esc(a.titulo))}</b><small>${conGuardrails(esc(a.detalle))}</small></div><span class="muted small" style="white-space:nowrap">${esc(a.cuando || '')}</span></div>`).join('') || '<p class="muted">Sin alertas activas.</p>';
    $('ultimas').innerHTML = G.trazas.slice(-5).reverse().map((t) => rowTraza(t, false)).join('');
    $('h-ultimas').innerHTML = `${ic('route')} Últimas trazas`;
    $('coste-sub').textContent = `€/día · línea discontinua = cap diario ${eur(capDiario(), 0)}`;
    $('chart-coste').innerHTML = chartCoste();
    $('legend-coste').innerHTML = `<span><i style="background:var(--primary)"></i>Coste total / día</span><span><i style="background:var(--warn)"></i>Día ≥ 80 % del cap</span><span><i style="background:var(--crit);height:2px"></i>Cap diario global (CAP-01)</span>`;
  }

  const ESTADO = { activo: ['pill-ok', 'circle-check', 'Activo'], degradado: ['pill-warn', 'triangle-alert', 'Degradado (gpt-5-mini)'], pausado: ['pill-muted', 'pause', 'Pausado'] };
  function agentCard(a, aut) {
    const estado = estadoAgente(a);
    const [pc, pi, pl] = ESTADO[estado] || ESTADO.activo;
    const uso = a.cap_hoy ? a.coste_hoy / a.cap_hoy : 0;
    const lvl = G.niveles[a.nivel] || { nombre: '—', desc: '' };
    const guardrails = G.politicas.filter((p) => p.agente === a.id).map((p) => grRef(p.id)).join(', ') || '—';
    return `<article class="card agent${estado === 'pausado' ? ' is-off' : ''}" style="--c:${agColor(a.id)}" data-agente="${esc(a.id)}" role="button" tabindex="0" title="Ver ficha del agente">
      <div class="top"><span class="ag-ico" style="--c:${agColor(a.id)}">${ic(a.icono || 'cpu')}</span><div><strong>${agLbl(a.id)}</strong><br><span class="muted small">${esc(a.descripcion || '')}</span></div></div>
      <div class="row"><span class="pill ${pc}">${ic(pi)} ${pl}</span>${lvlBadge(a.nivel)}<span class="small muted">${esc(lvl.nombre)}</span><label class="switch${estado === 'pausado' ? ' off' : ''}" title="${estado === 'pausado' ? 'Reanudar el agente' : 'Pausar el agente (kill switch)'}" data-switch="${esc(a.id)}"><i></i>${ic('power')}</label></div>
      ${aut
        ? `<dl><dt>Umbral confianza</dt><dd>${conGuardrails(esc(a.umbral || '—'))}</dd><dt>Guardrails</dt><dd>${guardrails}</dd><dt>Escalado 14 d</dt><dd>${esc(a.escalado_14d || '—')}</dd><dt>Override 14 d</dt><dd>${esc(a.override_14d || '—')}</dd></dl>`
        : `<dl><dt>Modelo</dt><dd class="mono">${esc(a.modelo)}</dd><dt>Prompt</dt><dd class="mono">${esc(a.prompt)}</dd><dt>Latencia p95</dt><dd>${ms(a.p95_ms || 0)}</dd><dt>Coste hoy</dt><dd>${eur(a.coste_hoy)} / ${eur(a.cap_hoy, 0)} <span class="${uso >= 1 ? 'delta up' : 'muted'}">(${Math.round(uso * 100)} %)</span><div class="meter" style="--c:${uso >= 1 ? 'var(--crit)' : uso >= .8 ? 'var(--warn)' : agColor(a.id)}"><i style="width:${Math.min(100, uso * 100)}%"></i></div></dd></dl>`}
    </article>`;
  }

  // Kill switch: pausa / reanuda un agente, lo oscurece y deja rastro en el histórico
  function toggleAgente(id) {
    const a = AG[id]; if (!a) return;
    const nuevo = estadoAgente(a) === 'pausado' ? (a.estado === 'pausado' ? 'activo' : a.estado) : 'pausado';
    estados[id] = nuevo; ssSet('gobierno.estados', estados);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'operacion', sev: nuevo === 'pausado' ? 'warn' : 'ok', agente: id, titulo: `${esPrincipal(id) ? 'Agente de ' : ''}${a.nombre}: ${nuevo === 'pausado' ? 'pausado con el kill switch' : 'reanudado'}`, detalle: nuevo === 'pausado' ? 'Los mensajes que dependen de este agente se encolan hasta reanudarlo; no se pierde ninguno.' : 'Se procesa la cola acumulada durante la pausa.', usuario: 'Operador (esta sesión)' });
    renderAll();
  }

  const rowTraza = (t, full) => {
    const m = tr(t);
    return `<tr class="clickable${t.id === selId ? ' is-sel' : ''}" data-id="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td class="tnum">${hora(t.inicio)}</td><td class="wrap"><strong>${esc(t.mensaje)}</strong><br><span class="muted small">${esc(t.asunto)}</span></td><td>${canal(t.canal)}</td><td>${ramoPill(t.ramo)}</td><td>${decPill(t.decision)}</td><td>${resPill(t)}</td>${full ? `<td class="tnum">${pct(t.confianza)}</td>` : ''}<td class="tnum">${ms(m.dur)}</td>${full ? `<td class="tnum">${num(m.tokens)}</td>` : ''}<td class="tnum ${m.coste > .05 ? 'delta up' : ''}">${eur(m.coste, 4)}</td>${full ? `<td class="wrap">${(t.incidencias || []).map((i) => `<span class="pill pill-warn">${ic('circle-alert')} ${conGuardrails(esc(i))}</span>`).join(' ') || '<span class="muted">—</span>'}</td>` : ''}</tr>`;
  };

  // ---------------------------------------------------------------------------
  // Lista de trazas con filtros (compartida por Trazabilidad «t-» y Reasoning & Replay «r-»)
  // ---------------------------------------------------------------------------
  function listaTrazas(pre) {
    const v = (k) => ($(`${pre}-${k}`) || {}).value || '';
    const fa = v('agente'), fc = v('canal'), fd = v('dec'), fr = v('res');
    const rows = G.trazas.filter((t) => (!fc || t.canal === fc) && (!fd || t.decision === fd) && (!fr || (fr === 'incidencia' ? (t.incidencias || []).length : t.resultado === fr)) && (!fa || t.spans.some((s) => s[0] === fa)));
    $(`${pre}-trazas`).innerHTML = rows.length ? rows.map((t) => rowTraza(t, true)).join('') : '<tr><td colspan="12" class="muted" style="text-align:center">Ninguna traza cumple el filtro.</td></tr>';
  }
  function markSel() { document.querySelectorAll('#t-trazas tr, #r-trazas tr, #ultimas tr').forEach((r) => r.classList.toggle('is-sel', r.dataset.id === selId)); }
  function selectTraza(id) { selId = id; markSel(); renderDetalle(); renderSteps(); }

  // ---------------------------------------------------------------------------
  // Ficha de una traza: mismo renderizador para el panel fijo y la modal explicada
  // ---------------------------------------------------------------------------
  function waterfall(t) {
    const total = tr(t).dur;
    return `<div class="spans">${t.spans.map((s) => `<div class="span"><span>${agTag(s[0])}</span><div class="bar" style="--c:${agColor(s[0])}" data-tip="${esc(svgAg(s[0]))}: ${ms(s[2])} · ${esc(s[3])} · ${num(s[4] + s[5] + s[6])} tokens · ${eur(spanCost(s), 4)}"><i style="left:${(s[1] / total) * 100}%;width:${Math.max(1.2, (s[2] / total) * 100)}%"></i><em style="left:${Math.min(80, ((s[1] + s[2]) / total) * 100 + 1)}%">${ms(s[2])}</em></div><span class="r mono">${esc(s[3])} · ${num(s[4])}↑ ${num(s[5])}↓${s[6] ? ` ${num(s[6])}⟳` : ''}</span></div>`).join('')}</div>`;
  }

  // Frase explicativa por agente (usa el razonamiento registrado si existe)
  function explicaSpan(t, s, i) {
    const raz = ((G.razonamiento || {})[t.id] || [])[i];
    const tok = s[4] + s[5] + s[6];
    const conModelo = tok ? ` con <span class="mono">${esc(s[3])}</span> en ${ms(s[2])} (${num(tok)} tokens${s[6] ? `, ${num(s[6])} de razonamiento` : ''}, ${eur(spanCost(s), 4)})` : ` en ${ms(s[2])}${s[3] === 'stt-es' ? ' (transcripción de voz)' : ' (sin modelo de lenguaje)'}`;
    const que = { multicanal: 'normalizó el mensaje', clasificacion: 'asignó el ramo', extraccion: 'extrajo los datos', reglas: 'evaluó las reglas del ramo', ia: 'clasificó, extrajo y aplicó las reglas', local: 'decidió con el motor local de reglas' }[s[0]] || 'procesó el mensaje';
    return `<li><span class="ag-ico" style="--c:${agColor(s[0])}">${ic((AG[s[0]] || {}).icono || 'cpu')}</span><div><strong>${agLbl(s[0])}</strong> ${que}${conModelo}.${raz ? ` <span class="muted">${esc(raz.salida)}</span>` : ''}</div></li>`;
  }

  function fichaTraza(t, modo) {
    const m = tr(t);
    const versiones = t.origen ? '—' : agentesPrincipales().map((a) => `${a.id} ${a.prompt}`).join(' · ') || '—';
    const conCmp = cmpItems.some((x) => x.gob.trazabilidad.traza_id === t.id);
    const botones = `<button class="btn btn-sm" type="button" data-goto="replay">${ic('brain')} Ver razonamiento</button><button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('repeat')} Replay</button>${conCmp ? `<button class="btn btn-sm" type="button" data-cmp-ficha="${esc(t.id)}">${ic('fingerprint')} Cumplimiento</button>` : ''}`;
    const pills = `${ramoPill(t.ramo)} ${decPill(t.decision)} ${resPill(t)}`;
    const datos = `<dl class="kv"><dt>Inicio</dt><dd>${new Date(t.inicio).toLocaleString('es-ES')}</dd><dt>Canal</dt><dd>${canal(t.canal)}</dd><dt>Confianza</dt><dd>${pct(t.confianza)}</dd><dt>Guardrail</dt><dd>${t.guardrail ? `<span class="policy fail">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span>` : `<span class="policy pass">${ic('check')} Ninguno disparado</span>`}</dd><dt>Versiones</dt><dd class="mono">${esc(versiones)}</dd>${t.origen ? `<dt>Origen</dt><dd>${esc(t.origen)}</dd>` : ''}<dt>Ciclo · tokens · coste</dt><dd>${ms(m.dur)} · ${num(m.tokens)} · ${eur(m.coste, 4)}</dd><dt>Incidencias</dt><dd>${(t.incidencias || []).map((i) => `<span class="pill pill-warn">${ic('circle-alert')} ${conGuardrails(esc(i))}</span>`).join(' ') || '<span class="muted">—</span>'}</dd></dl>`;
    const override = t.override ? `<div class="box" style="border-color:var(--time)"><b>${ic('repeat')} Override humano · ${esc(t.override.usuario)} · ${hora(t.override.fecha)}</b><br><span class="pill pill-review">A revisar</span> → <span class="pill pill-ok">Aprobado</span><br><span class="small">${esc(t.override.motivo)}</span><br><span class="muted small">Se registra como «dato no accesible al modelo»: candidato a integrar la consulta de conductores declarados como herramienta del agente de Extracción.</span></div>` : '';
    if (modo === 'panel') {
      return `<div class="card-head"><h2>${ic('route')} ${esc(t.id)} · ${esc(t.mensaje)} <span class="muted" style="font-weight:400">· ${esc(t.asunto)}</span></h2><div class="row">${pills} ${botones}</div></div>
        <div class="two">
          <div><h3 style="margin-bottom:.5rem">Cadena de agentes (waterfall)</h3>${waterfall(t)}<p class="muted small" style="margin-top:.6rem">↑ tokens de entrada · ↓ salida · ⟳ razonamiento.</p>${t.motivo ? `<p class="small" style="margin-top:.5rem"><b>Motivo:</b> ${esc(t.motivo)}</p>` : ''}</div>
          <div class="detail">${datos}${override}</div>
        </div>`;
    }
    // Modal: ficha explicada paso a paso
    const [ci, cl] = canalInfo(t.canal);
    return `<div class="row">${pills} ${botones}</div>
      <div><h3>Qué llegó</h3><p class="small">${ic(ci)} <b>${esc(t.mensaje)}</b> · «${esc(t.asunto)}» · recibido por <b>${esc(cl)}</b> · procesado el ${new Date(t.inicio).toLocaleString('es-ES')}.</p></div>
      <div><h3>Qué hizo cada agente</h3><div class="explica"><ul>${t.spans.map((s, i) => explicaSpan(t, s, i)).join('')}</ul></div></div>
      <div><h3>Cadena de agentes (waterfall)</h3>${waterfall(t)}<p class="muted small" style="margin-top:.4rem">↑ tokens de entrada · ↓ salida · ⟳ razonamiento · ciclo total ${ms(m.dur)} · ${num(m.tokens)} tokens · ${eur(m.coste, 4)}.</p></div>
      <div><h3>Decisión</h3><p class="small">${decPill(t.decision)} con confianza ${pct(t.confianza)} · ${t.resultado === 'auto' ? 'ejecutada de forma autónoma, sin intervención humana' : t.resultado === 'override' ? 'escalada a una persona, que cambió la decisión (override)' : 'escalada a una persona por un guardrail'}.${t.motivo ? ` <b>Motivo:</b> ${esc(t.motivo)}` : ''}</p>${t.guardrail ? `<p class="small" style="margin-top:.4rem"><span class="policy fail">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span> <span class="muted">— pasa el ratón por el código para ver la regla</span></p>` : ''}</div>
      ${override}
      <div class="two"><div><h3>Datos de la traza</h3>${datos}</div><div><h3>Coste</h3><div class="kpi-mini"><div class="box"><span class="muted small">Coste</span><b>${eur(m.coste, 4)}</b></div><div class="box"><span class="muted small">Tokens</span><b>${num(m.tokens)}</b></div><div class="box"><span class="muted small">Ciclo</span><b>${ms(m.dur)}</b></div></div>${m.coste > 0.05 ? `<p class="small" style="margin-top:.5rem;color:var(--crit)">${ic('triangle-alert')} Por encima del cap por traza (${grRef('CAP-04')}).</p>` : ''}</div></div>`;
  }

  function renderDetalle() {
    const t = G.trazas.find((x) => x.id === selId) || G.trazas[G.trazas.length - 1];
    if (!t) { $('traza-detalle').innerHTML = '<p class="muted">Sin trazas.</p>'; return; }
    selId = t.id;
    $('traza-detalle').innerHTML = fichaTraza(t, 'panel');
    $('r-summary-sel').innerHTML = `· seleccionada <span class="mono">${esc(t.id)}</span> · ${esc(t.mensaje)}`;
    $('r-traza-sel').innerHTML = `<span class="mono">${esc(t.id)}</span> · ${esc(t.mensaje)} · ${esc(t.asunto)}`;
    markSel();
  }

  function abrirModalTraza(id) {
    const t = G.trazas.find((x) => x.id === id); if (!t) return;
    selId = id; markSel(); renderDetalle(); renderSteps();
    $('modal-traza-title').innerHTML = `${ic('route')} ${esc(t.id)} · ${esc(t.mensaje)} <span class="muted" style="font-weight:400">· ${esc(t.asunto)}</span>`;
    $('modal-traza-body').innerHTML = fichaTraza(t, 'modal');
    $('modal-traza').showModal();
  }

  // ---------------------------------------------------------------------------
  // Reasoning & Replay
  // ---------------------------------------------------------------------------
  function renderSteps() {
    const t = G.trazas.find((x) => x.id === selId);
    const steps = t && (G.razonamiento || {})[t.id];
    if (!t) { $('steps').innerHTML = '<p class="muted">Sin trazas.</p>'; renderDiff(false); return; }
    if (!steps) {
      $('steps').innerHTML = `<div class="box"><b>${ic('info')} ${esc(t.id)} · ${esc(t.mensaje)}</b><br><span class="small">Esta traza no tiene razonamiento registrado por agente (solo lo llevan las fichas de demostración). En producción cada agente devolvería su registro estructurado: entrada, pasos y salida.</span>${t.guardrail ? `<br><span class="policy fail" style="margin-top:.4rem">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span>` : ''}</div>`;
      renderDiff(false); return;
    }
    $('steps').innerHTML = steps.map((s, i) => { const sp = t.spans[i] || ['', 0, 0, '—', 0, 0, 0]; return `<div class="step" style="--c:${agColor(s.agente)}">
      <div class="h"><span class="ag-ico" style="--c:${agColor(s.agente)}">${ic((AG[s.agente] || {}).icono || 'cpu')}</span><strong>${agLbl(s.agente)}</strong><span class="muted small mono">${esc(sp[3])} · ${ms(sp[2])} · ${num(sp[4] + sp[5] + sp[6])} tok</span></div>
      <div class="io"><div class="box"><span class="muted small">Entrada</span><br>${esc(s.entrada)}</div><div class="box"><span class="muted small">Salida</span><br>${esc(s.salida)}</div></div>
      <ul>${s.pasos.map((p) => `<li>${conGuardrails(esc(p))}</li>`).join('')}</ul>
    </div>`; }).join('');
    renderDiff(false);
  }

  // Replay simulado: «idéntico» reproduce la decisión; «what-if» estima coste/latencia con otro modelo o prompt de Reglas
  function renderDiff(run) {
    const t = G.trazas.find((x) => x.id === selId);
    if (!t) { $('rp-diff').innerHTML = ''; return; }
    const m = tr(t);
    const whatif = $('rp-modo').value === 'whatif'; const modelo = $('rp-modelo').value.split(' ')[0]; const prompt = $('rp-prompt').value.split(' ')[0];
    if (!run) { $('rp-diff').innerHTML = `<div class="box" style="grid-column:1/-1"><b>${ic('info')} Replay de ${esc(t.id)} · ${esc(t.mensaje)}</b><br><span class="small">El replay vuelve a ejecutar la cadena de agentes con el mensaje original congelado. <b>Idéntico</b> verifica que la decisión es reproducible (mismos prompts, modelos y semilla). <b>What-if</b> permite cambiar el modelo o la versión del prompt de un agente y comparar decisión, motivo, coste y latencia con la ejecución original. Ningún replay altera la decisión registrada: se guarda como ejecución aparte en el histórico.</span></div>`; return; }
    const chg = whatif && (modelo !== 'gpt-5' || prompt !== 'v2.3');
    const factor = !chg ? 1 : modelo === 'gpt-5-mini' ? .18 : modelo === 'gpt-5-nano' ? .04 : .82;
    const lat = !chg ? 1.06 : modelo === 'gpt-5-mini' ? .59 : modelo === 'gpt-5-nano' ? .45 : .88;
    const cambia = chg && modelo === 'gpt-5-nano' && t.decision === 'REVISION';
    const dec2 = cambia ? 'DESPEJADO' : t.decision;
    const motivo2 = !chg ? 'Idéntico al original' : cambia ? 'gpt-5-nano no detecta la regla incumplida: pasa a Aprobado (regresión)' : prompt === 'v2.4' ? 'Misma decisión; el motivo cita el guardrail por su código (G-04) y es 18 % más corto' : 'Misma decisión y mismas reglas incumplidas';
    const d = (v) => `<span class="delta ${Math.abs(v) < .005 ? 'same' : v < 0 ? 'down' : 'up'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} %</span>`;
    $('rp-diff').innerHTML = `
      <div class="box"><h4>Original · ${hora(t.inicio)}</h4><dl class="kv"><dt>Ramo</dt><dd>${ramoPill(t.ramo)}</dd><dt>Decisión</dt><dd>${decPill(t.decision)}</dd><dt>Confianza</dt><dd>${pct(t.confianza)}</dd><dt>Coste</dt><dd>${eur(m.coste, 4)}</dd><dt>Ciclo</dt><dd>${ms(m.dur)}</dd><dt>Reglas · modelo</dt><dd class="mono">gpt-5 · v2.3</dd></dl></div>
      <div class="box" style="border-color:${cambia ? 'var(--crit)' : 'var(--ok)'}"><h4>Replay · ${whatif ? 'what-if' : 'idéntico'} · ahora</h4><dl class="kv"><dt>Ramo</dt><dd>${ramoPill(t.ramo)} <span class="delta same">igual</span></dd><dt>Decisión</dt><dd>${decPill(dec2)} ${cambia ? '<span class="delta up">DISTINTA</span>' : '<span class="delta same">igual</span>'}</dd><dt>Confianza</dt><dd>${pct(cambia ? .71 : chg ? Math.max(0, t.confianza - .02) : t.confianza)}</dd><dt>Coste</dt><dd>${eur(m.coste * factor, 4)} ${d(factor - 1)}</dd><dt>Ciclo</dt><dd>${ms(Math.round(m.dur * lat))} ${d(lat - 1)}</dd><dt>Reglas · modelo</dt><dd class="mono">${esc(modelo)} · ${esc(prompt)}</dd></dl><p class="small" style="margin-top:.5rem"><b>Motivo:</b> ${conGuardrails(esc(motivo2))}</p>${cambia ? `<p class="small" style="color:var(--crit)"><b>${ic('triangle-alert')} Regresión:</b> el cambio no es seguro para este tipo de mensaje.</p>` : ''}</div>`;
  }

  function renderReplays() {
    const delta = (v) => `<span class="delta ${v < -0.01 ? 'down' : v > 0.01 ? 'up' : 'same'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} %</span>`;
    $('replays').innerHTML = (G.replays || []).map((r) => `<tr><td class="mono">${esc(r.id)}</td><td class="tnum">${fechaHora(r.fecha)}</td><td class="mono">${esc(r.traza)}</td><td>${esc(r.modo)}</td><td>${esc(r.cambio)}</td><td><span class="delta same">${esc(r.ramo)}</span></td><td>${String(r.decision).startsWith('DISTINTA') ? `<span class="delta up">${esc(r.decision)}</span>` : `<span class="delta same">${esc(r.decision)}</span>`}</td><td>${delta(r.dcoste)}</td><td>${delta(r.dlat)}</td><td>${esc(r.usuario)}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Sin replays registrados.</td></tr>';
  }

  // ---------------------------------------------------------------------------
  // Autonomía (niveles, agentes, auditoría) y ficha modal del agente
  // ---------------------------------------------------------------------------
  const CAMBIO_ICON = { nivel: 'sliders-horizontal', modelo: 'cpu', prompt: 'file-text', guardrail: 'shield-check', incidencia: 'activity' };
  function renderAutonomia() {
    $('kpis-aut').innerHTML = G.kpis.autonomia.map(kpi).join('');
    $('levels').innerHTML = G.niveles.map((l) => `<div class="level l${l.n}"><b>${lvlBadge(l.n, l.desc)} ${esc(l.nombre)}</b><span class="muted">${esc(l.desc)}</span><span class="small">${agentesPrincipales().filter((a) => a.nivel === l.n).map((a) => agTag(a.id)).join(' ') || '<span class="muted">sin agentes</span>'}</span></div>`).join('');
    $('agents-aut').innerHTML = agentesPrincipales().map((a) => agentCard(a, true)).join('');
    $('cambios').innerHTML = (G.cambios_autonomia || []).map((c, i) => `<tr class="clickable" data-cambio="${i}" tabindex="0"><td class="tnum">${fechaHora(c.fecha)}</td><td>${agTag(c.agente)}</td><td>${c.de === c.a ? `${lvlBadge(c.a)} <span class="muted small">sin cambio</span>` : `${lvlBadge(c.de)} → ${lvlBadge(c.a)}`}</td><td class="wrap">${conGuardrails(esc(c.motivo))}</td><td>${esc(c.usuario)}</td></tr>`).join('');
  }

  // Identidad del agente: quién es, con qué credencial actúa, quién responde de él y qué puede tocar
  function identidadAgente(a) {
    const idn = a.identidad;
    if (!idn) return `<div><h3>${ic('badge-check')} Identidad y permisos</h3><p class="muted small">Sin identidad registrada para este agente.</p></div>`;
    const lista = (xs, icono, cls) => `<ul class="permisos">${(xs || []).map((x) => `<li class="${cls}">${ic(icono)} ${esc(x)}</li>`).join('')}</ul>`;
    return `<div><h3>${ic('badge-check')} Identidad y permisos${normas('dora-9', 'rgpd-25', 'eiopa')}</h3><div class="tw"><table class="identidad"><tbody>
      <tr><th>Identidad</th><td class="mono">${esc(idn.id)}</td><th>Responsable</th><td>${esc(idn.responsable)}</td></tr>
      <tr><th>Credencial</th><td>${esc(idn.credencial)}</td><th>Proveedor y región</th><td>${esc(idn.proveedor)}</td></tr>
      <tr><th>Datos que trata</th><td colspan="3">${esc(idn.datos)}</td></tr>
      <tr><th>Puede</th><td>${lista(idn.puede, 'check', 'si')}</td><th>No puede</th><td>${lista(idn.no_puede, 'x', 'no')}</td></tr>
    </tbody></table></div></div>`;
  }

  function abrirModalAgente(id) {
    const a = AG[id]; if (!a) return;
    const estado = estadoAgente(a); const [pc, pi, pl] = ESTADO[estado] || ESTADO.activo;
    const lvl = G.niveles[a.nivel] || { nombre: '—', desc: '' };
    const hist = [...(a.historial || [])].sort((x, y) => y.fecha.localeCompare(x.fecha));
    const tl = (items) => items.length ? `<ul class="mini-tl">${items.map((h) => `<li><span class="t">${fechaHora(h.fecha)}</span><span class="ico" style="--c:${agColor(a.id)}">${ic(CAMBIO_ICON[h.tipo] || 'info')}</span><div><b>${esc(h.tipo === 'nivel' ? 'Nivel' : h.tipo === 'modelo' ? 'Modelo' : h.tipo === 'prompt' ? 'Prompt' : h.tipo === 'guardrail' ? 'Guardrail' : 'Incidencia')}: ${conGuardrails(esc(h.de))} → ${conGuardrails(esc(h.a))}</b><small>${conGuardrails(esc(h.motivo))} · ${esc(h.usuario)}</small></div></li>`).join('')}</ul>` : '<p class="muted small">Sin registros.</p>';
    $('modal-agente-title').innerHTML = `<span class="ag-ico" style="--c:${agColor(a.id)}">${ic(a.icono || 'cpu')}</span> ${agLbl(a.id)} <span class="pill ${pc}">${ic(pi)} ${pl}</span> ${lvlBadge(a.nivel)} <span class="muted small" style="font-weight:400">${esc(lvl.nombre)}</span>`;
    $('modal-agente-body').innerHTML = `
      <p class="small muted">${esc(a.descripcion || '')}</p>
      <div class="kpi-mini">
        <div class="box"><span class="muted small">Modelo actual</span><b class="mono" style="font-size:.95rem">${esc(a.modelo)}</b></div>
        <div class="box"><span class="muted small">Prompt</span><b class="mono" style="font-size:.95rem">${esc(a.prompt)}</b></div>
        <div class="box"><span class="muted small">Escalado 14 d</span><b>${esc(a.escalado_14d || '—')}</b></div>
        <div class="box"><span class="muted small">Override 14 d</span><b>${esc(a.override_14d || '—')}</b></div>
        <div class="box"><span class="muted small">Coste hoy / cap</span><b>${eur(a.coste_hoy || 0)} / ${eur(a.cap_hoy || 0, 0)}</b></div>
        <div class="box"><span class="muted small">Latencia p95</span><b>${ms(a.p95_ms || 0)}</b></div>
      </div>
      ${identidadAgente(a)}
      <div class="two">
        <div><h3>Histórico de autonomía</h3>${tl(hist.filter((h) => h.tipo === 'nivel' || h.tipo === 'guardrail'))}</div>
        <div><h3>Cambios de modelo, prompt e incidencias</h3>${tl(hist.filter((h) => h.tipo === 'modelo' || h.tipo === 'prompt' || h.tipo === 'incidencia'))}</div>
      </div>
      <div><h3>Comportamiento según el modelo</h3><div class="tw tabla-compacta"><table><thead><tr><th>Modelo</th><th>Periodo</th><th>Precisión</th><th>Escalado</th><th>Override</th><th>Coste / mensaje</th><th>p95</th></tr></thead><tbody>${(a.modelos || []).map((mo) => `<tr><td class="mono">${esc(mo.modelo)}</td><td>${esc(mo.periodo)}</td><td>${esc(mo.precision)}</td><td class="tnum">${esc(mo.escalado)}</td><td class="tnum">${esc(mo.override)}</td><td class="tnum">${esc(mo.coste_msg)}</td><td class="tnum">${ms(mo.p95_ms)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Sin datos por modelo.</td></tr>'}</tbody></table></div></div>
      <div><h3>Variables que afectan a su comportamiento</h3><div class="tw"><table><thead><tr><th>Variable</th><th>Valor</th><th>Efecto</th></tr></thead><tbody>${(a.variables || []).map((v) => `<tr><td><b>${esc(v.nombre)}</b></td><td class="wrap">${conGuardrails(esc(v.valor))}</td><td class="wrap">${conGuardrails(esc(v.efecto))}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin variables registradas.</td></tr>'}</tbody></table></div></div>
      <div><h3>Guardrails que lo limitan</h3><p class="small">${G.politicas.filter((p) => p.agente === a.id).map((p) => `${grRef(p.id)} ${politicaActiva(p) ? '' : '<span class="muted small">(inactivo)</span>'}`).join(' · ') || '<span class="muted">Ninguno</span>'}</p></div>`;
    $('modal-agente').showModal();
  }

  // ---------------------------------------------------------------------------
  // Guardrails
  // ---------------------------------------------------------------------------
  const SEV = { humano: 'Escala a persona', degradar: 'Degrada el modelo', marcar: 'Marca la traza' };
  function renderGuardrails() {
    const P = G.politicas;
    const activos = P.filter(politicaActiva).length;
    const disparos = P.reduce((a, p) => a + (p.disparos || 0), 0);
    const escaladosGr = P.filter((p) => p.severidad === 'humano').reduce((a, p) => a + (p.disparos || 0), 0);
    $('kpis-gr').innerHTML = [
      kpi({ cls: 'ok', icono: 'shield-check', etiqueta: 'Guardrails activos', valor: `${activos} / ${P.length}`, sub: `${P.length - activos} inactivo${P.length - activos === 1 ? '' : 's'}` }),
      kpi({ cls: 'review', icono: 'bell', etiqueta: 'Disparos en 14 días', valor: num(disparos), sub: `${num(escaladosGr)} escalados a persona · resto degradaciones y marcas` }),
      kpi({ cls: 'time', icono: 'user-check', etiqueta: 'Escalados que vienen de un guardrail', valor: `${Math.round((escaladosGr / 3180) * 100)} %`, sub: 'de los 3.180 escalados del periodo; el resto por confianza o discrepancia' }),
      kpi({ cls: 'primary', icono: 'gauge', etiqueta: 'Más disparado', valor: [...P].sort((x, y) => y.disparos - x.disparos)[0]?.id || '—', sub: [...P].sort((x, y) => y.disparos - x.disparos)[0]?.condicion || '' }),
    ].join('');
    $('policies').innerHTML = P.map((p) => { const max = Math.max(1, ...(p.disparos_dia || [1])); const activa = politicaActiva(p); return `<tr class="clickable${activa ? '' : ' muted'}" data-gr="${esc(p.id)}" tabindex="0"><td class="mono"><b>${esc(p.id)}</b>${p.nuevo ? ' <span class="pill pill-time">nuevo</span>' : ''}</td><td>${agTag(p.agente)}</td><td class="wrap">${esc(p.condicion)}<br><small class="muted">${conGuardrails(esc(p.descripcion || ''))}</small></td><td class="wrap">${esc(p.accion)}</td><td><span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span></td><td><span class="tnum" style="display:inline-block;min-width:2.2rem"><b>${num(p.disparos)}</b></span> <span class="bars" style="--c:${agColor(p.agente)}" data-tip="Disparos por día (últimos 14 días): ${(p.disparos_dia || []).join(' · ')}">${(p.disparos_dia || []).map((v) => `<i style="height:${Math.max(2, (v / max) * 18)}px"></i>`).join('')}</span></td><td><label class="switch${activa ? '' : ' off'}" data-guardrail="${esc(p.id)}" title="${activa ? 'Desactivar' : 'Activar'} ${esc(p.id)}"><i></i>${activa ? 'Activo' : 'Inactivo'}</label></td></tr>`; }).join('');
    const ultimos = P.flatMap((p) => (p.ultimos || []).map(([f, traza, res]) => ({ f, id: p.id, agente: p.agente, traza, res }))).sort((x, y) => y.f.localeCompare(x.f));
    $('h-disparos').innerHTML = `${ic('history')} Últimos disparos`;
    $('disparos').innerHTML = ultimos.map((u) => { const tid = (u.traza.match(/TRZ-[0-9A-Z]+/) || [])[0]; const existe = tid && G.trazas.some((t) => t.id === tid); return `<tr><td class="tnum">${fechaHora(u.f)}</td><td>${grRef(u.id)}</td><td>${agTag(u.agente)}</td><td class="mono">${existe ? `<button class="btn btn-sm" type="button" data-traza="${esc(tid)}">${ic('route')} ${esc(u.traza)}</button>` : esc(u.traza)}</td><td>${esc(u.res)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Sin disparos registrados.</td></tr>';
  }
  function toggleGuardrail(id) {
    const p = G.politicas.find((x) => x.id === id); if (!p) return;
    const nuevo = !politicaActiva(p); grOverrides[id] = nuevo;
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: nuevo ? 'ok' : 'warn', agente: p.agente, titulo: `${p.id} ${nuevo ? 'activado' : 'desactivado'}: ${p.condicion}`, detalle: nuevo ? `Vuelve a aplicarse «${p.accion}».` : `Deja de aplicarse «${p.accion}» hasta reactivarlo.`, usuario: 'Operador (esta sesión)' });
    renderAll();
  }

  // ---------------------------------------------------------------------------
  // Gráficos SVG inline (sin librerías) con tooltip y leyendas interactivas
  // ---------------------------------------------------------------------------
  const ticksDe = (ymax) => [...new Set([0, .25, .5, .75, 1].map((f) => Math.round((ymax * f) / 5) * 5))];
  const legendBtn = (key, kind, color, label, html) => `<button type="button" class="${(kind === 'agente' ? ocultos : tokOcultos).has(key) ? 'off' : ''}" data-legend="${esc(kind)}" data-key="${esc(key)}"><i style="background:${color}"></i>${html || esc(label)}</button>`;

  function chartCoste() {
    const D = diarioVisible(), cap = capDiario();
    const W = 640, H = 220, pl = 40, pr = 16, pt = 14, pb = 28;
    const ymax = Math.max(cap * 1.25, ...D.map(costeDia)) * 1.05;
    const xs = (i) => (D.length > 1 ? pl + (i / (D.length - 1)) * (W - pl - pr) : (W + pl - pr) / 2), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    const pts = D.map((d, i) => [xs(i), ys(costeDia(d))]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${ys(0)} L${pts[0][0].toFixed(1)},${ys(0)} Z`;
    const last = pts[pts.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste diario total frente al cap diario">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      <path d="${area}" fill="var(--primary)" opacity=".1"/>
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - pr}" y="${ys(cap) - 5}" text-anchor="end" style="fill:var(--crit);font-weight:700">cap ${eur(cap, 0)}</text>
      <path d="${line}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${costeDia(D[i]) >= cap * .8 ? 'var(--warn)' : 'var(--primary)'}" stroke="var(--surface)" stroke-width="2"/><rect x="${p[0] - 18}" y="${pt}" width="36" height="${H - pt - pb}" fill="transparent" data-tip="${fecha(D[i][0])} · ${eur(costeDia(D[i]))} · ${num(D[i][1])} mensajes"/>`).join('')}
      <text x="${last[0]}" y="${last[1] - 10}" text-anchor="end" style="fill:var(--text);font-weight:700">${eur(costeDia(D[D.length - 1]))} hoy (parcial)</text>
      ${D.map((d, i) => (D.length > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  function chartStack() {
    const D = diarioVisible(), cap = capDiario(), n = D.length;
    const ids = G.agentes.slice(0, 4).map((a) => a.id);
    const vis = (d) => d[2].reduce((a, v, k) => a + (ocultos.has(ids[k]) ? 0 : v), 0);
    const W = 640, H = 240, pl = 40, pr = 16, pt = 14, pb = 28;
    const ymax = Math.max(cap * 1.25, ...D.map(vis)) * 1.05;
    const bw = Math.min(24, ((W - pl - pr) / n) * .62), xs = (i) => pl + ((i + .5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste diario apilado por agente">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      ${D.map((d, i) => { let acc = 0; const segs = d[2].map((v, k) => [ids[k], v]).filter(([id]) => !ocultos.has(id)); return segs.map(([id, v], k) => { const y0 = ys(acc), y1 = ys(acc + v); acc += v; const top = k === segs.length - 1; return `<rect x="${xs(i) - bw / 2}" y="${y1 + (top ? 0 : 1)}" width="${bw}" height="${Math.max(0, y0 - y1 - 1)}" rx="${top ? 3 : 0}" fill="${agColor(id)}" data-tip="${fecha(d[0])} · ${esc(svgAg(id))}: ${eur(v)} de ${eur(vis(d))}"/>`; }).join(''); }).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      ${D.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  const TOK = [['in', 'Entrada', 'var(--primary)'], ['out', 'Salida', 'var(--ag-clasificacion)'], ['reasoning', 'Razonamiento', 'var(--ag-extraccion)']];
  function chartTokens() {
    const tot = G.agentes.filter((a) => !ocultos.has(a.id)).map((a) => { const s = G.trazas.flatMap((t) => t.spans.filter((x) => x[0] === a.id)); return [a, [s.reduce((v, x) => v + x[4], 0), s.reduce((v, x) => v + x[5], 0), s.reduce((v, x) => v + x[6], 0)].map((v, k) => (tokOcultos.has(TOK[k][0]) ? 0 : v))]; }).filter((t) => t[1][0] + t[1][1] + t[1][2] > 0);
    if (!tot.length) return '<p class="muted small">Sin tokens que mostrar con los filtros actuales.</p>';
    const W = 640, rowH = 44, H = 14 + tot.length * rowH, pl = 210, pr = 60, max = Math.max(...tot.map((t) => t[1][0] + t[1][1] + t[1][2]));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tokens del lote por agente: entrada, salida y razonamiento">
      ${tot.map(([a, vals], i) => { const y = 14 + i * rowH; let acc = 0; const segs = vals.map((v, k) => [k, v]).filter(([, v]) => v > 0); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(svgAg(a.id).length > 30 ? `${svgAg(a.id).slice(0, 28)}…` : svgAg(a.id))}</text>${segs.map(([k, v], j) => { const x0 = xs(acc); acc += v; const w = Math.max(0, xs(acc) - x0 - 2); return `<rect x="${x0}" y="${y}" width="${w}" height="22" rx="${j === segs.length - 1 ? 4 : 0}" fill="${TOK[k][2]}" data-tip="${esc(svgAg(a.id))} · ${TOK[k][1]}: ${num(v)} tokens"/>`; }).join('')}<text x="${xs(acc) + 6}" y="${y + 15}" class="tnum">${(acc / 1000).toFixed(1).replace('.', ',')}k</text>`; }).join('')}
    </svg>`;
  }

  // Coste por modelo apilado por agente (barras horizontales)
  function chartModelos() {
    const M = (G.modelos || []).map((mo) => [mo, Object.entries(mo.coste_por_agente || {}).filter(([id]) => !ocultos.has(id))]).filter(([, segs]) => segs.length);
    if (!M.length) return '<p class="muted small">Sin modelos que mostrar con los filtros actuales.</p>';
    const W = 640, rowH = 40, H = 14 + M.length * rowH, pl = 100, pr = 70, max = Math.max(...M.map(([, segs]) => segs.reduce((a, [, v]) => a + v, 0)));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste de 14 días por modelo, apilado por agente">
      ${M.map(([mo, segs], i) => { const y = 14 + i * rowH; let acc = 0; return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600" class="mono">${esc(mo.id)}</text>${segs.map(([id, v], j) => { const x0 = xs(acc); acc += v; const w = Math.max(0, xs(acc) - x0 - 2); return `<rect x="${x0}" y="${y}" width="${w}" height="22" rx="${j === segs.length - 1 ? 4 : 0}" fill="${agColor(id)}" data-tip="${esc(mo.id)} · ${esc(svgAg(id))}: ${eur(v)}"/>`; }).join('')}<text x="${xs(acc) + 6}" y="${y + 15}" class="tnum">${eur(acc, 0)}</text>`; }).join('')}
    </svg>`;
  }

  // Tokens por modelo (entrada / salida / razonamiento, en millones)
  function chartModelosTok() {
    const M = (G.modelos || []).filter((mo) => mo.tokens && (mo.tokens.in + mo.tokens.out + mo.tokens.reasoning) > 0);
    const keys = TOK.filter(([k]) => !tokOcultos.has(k));
    if (!M.length || !keys.length) return '<p class="muted small">Sin tokens que mostrar con los filtros actuales.</p>';
    const W = 640, H = 220, pl = 44, pr = 16, pt = 14, pb = 28, n = M.length;
    const max = Math.max(...M.flatMap((mo) => keys.map(([k]) => mo.tokens[k]))) / 1e6;
    const ymax = Math.max(1, Math.ceil(max * 1.1));
    const gw = (W - pl - pr) / n, bw = Math.min(22, (gw * .7) / keys.length);
    const ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tokens por modelo en millones: entrada, salida y razonamiento">
      <g class="grid">${[0, .25, .5, .75, 1].map((f) => { const v = Math.round(ymax * f * 10) / 10; return `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} M</text>`; }).join('')}</g>
      ${M.map((mo, i) => { const cx = pl + gw * (i + .5); const x0 = cx - (bw * keys.length + 2 * (keys.length - 1)) / 2; return keys.map(([k, label, color], j) => { const v = mo.tokens[k] / 1e6; return `<rect x="${x0 + j * (bw + 2)}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${color}" data-tip="${esc(mo.id)} · ${label}: ${num(mo.tokens[k])} tokens"/>`; }).join('') + `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="mono">${esc(mo.id)}</text>`; }).join('')}
    </svg>`;
  }

  function renderCharts() {
    const ids = G.agentes.slice(0, 4);
    $('chart-stack').innerHTML = chartStack();
    $('legend-stack').innerHTML = ids.map((a) => legendBtn(a.id, 'agente', agColor(a.id), a.nombre, agLbl(a.id))).join('') + `<span><i style="background:var(--crit);height:2px"></i>Cap diario global</span>`;
    $('chart-tokens').innerHTML = chartTokens();
    $('legend-tokens').innerHTML = TOK.map(([k, l, c]) => legendBtn(k, 'token', c, l)).join('');
    $('chart-modelos').innerHTML = chartModelos();
    $('legend-modelos').innerHTML = ids.map((a) => legendBtn(a.id, 'agente', agColor(a.id), a.nombre, agLbl(a.id))).join('');
    $('chart-modelos-tok').innerHTML = chartModelosTok();
    $('legend-modelos-tok').innerHTML = TOK.map(([k, l, c]) => legendBtn(k, 'token', c, l)).join('');
  }

  // ---------------------------------------------------------------------------
  // FinOps: KPI, caps, modelos, recomendaciones
  // ---------------------------------------------------------------------------
  const CAP_ESTADO = { ok: ['pill-ok', 'check', 'Dentro'], aviso: ['pill-warn', 'circle-alert', 'Aviso ≥ 80 %'], superado: ['pill-crit', 'triangle-alert', 'Superado'] };
  const capRow = (c) => { const u = c.consumo / c.limite; const [pc, pi, pl] = CAP_ESTADO[c.estado] || CAP_ESTADO.ok; const f = (v) => (c.unidad === '€' ? eur(v, v < 1 ? 3 : 2) : `${num(v)} ${esc(c.unidad)}`); return `<tr class="clickable" data-cap="${esc(c.id)}" tabindex="0" title="Ver el detalle de ${esc(c.id)}"><td class="mono"><b>${esc(c.id)}</b>${c.nuevo ? ' <span class="pill pill-time">nuevo</span>' : ''}</td><td>${ambitoHtml(c)}</td><td>${esc(c.tipo)}</td><td class="tnum">${f(c.limite)}</td><td class="tnum">${f(c.consumo)}</td><td><div class="meter" style="--c:${u >= 1 ? 'var(--crit)' : u >= .8 ? 'var(--warn)' : 'var(--ok)'};margin:0"><i style="width:${Math.min(100, u * 100)}%"></i></div><span class="small muted tnum">${Math.round(u * 100)} %</span></td><td class="wrap">${conGuardrails(esc(c.accion))}</td><td><span class="pill ${pc}">${ic(pi)} ${pl}</span></td></tr>`; };
  function renderFinops() {
    const dias = diarioVisible(), hoy = G.diario[G.diario.length - 1], cap = capDiario();
    const totalMsgs = dias.reduce((a, d) => a + d[1], 0), coste = dias.reduce((a, d) => a + costeDia(d), 0);
    const porAgente = G.agentes.slice(0, 4).map((a, k) => [a.id, dias.reduce((s, d) => s + (d[2][k] || 0), 0)]);
    const reparto = porAgente.sort((a, b) => b[1] - a[1]).map(([id, v]) => `<span class="agn"><span class="pre"></span>${esc(AG[id].nombre.split(' ')[0])}</span> ${Math.round((v / coste) * 100)} %`).join(' · ');
    const superados = G.caps.filter((c) => c.estado === 'superado');
    $('kpis-fin').innerHTML = [
      kpi({ cls: 'warn', icono: 'euro', etiqueta: 'Coste hoy (parcial)', valor: eur(costeDia(hoy)), sub: `${Math.round((costeDia(hoy) / cap) * 100)} % del cap diario (${eur(cap, 0)}) · ${num(hoy[1])} mensajes`, medidor: (costeDia(hoy) / cap) * 100, id: 'coste-hoy' }),
      kpi({ ...G.kpis.finops[0], id: 'coste-mensual' }),
      kpi({ ...G.kpis.finops[1], id: 'caps-superados', valor: String(superados.length), ...(capsNuevos.some((c) => c.estado === 'superado') ? { sub: superados.map((c) => c.id).join(' · ') } : {}) }),
      kpi({ cls: 'time', icono: 'cpu', etiqueta: 'Coste medio por mensaje', valor: eur(totalMsgs ? coste / totalMsgs : 0, 4), subHtml: reparto, id: 'coste-medio' }),
    ].join('');
    $('caps').innerHTML = G.caps.map(capRow).join('');
    renderCorrectivas();
    const totalModelos = (G.modelos || []).reduce((a, mo) => a + (mo.coste || 0), 0);
    $('modelos').innerHTML = (G.modelos || []).map((mo) => { const p = G.precios[mo.id]; const share = totalModelos ? mo.coste / totalModelos : 0; return `<tr><td class="mono"><b>${esc(mo.id)}</b></td><td>${esc(mo.proveedor)}</td><td class="tnum">${p ? `${eur(p.in)} / ${eur(p.out)} por M` : '—'}</td><td>${(mo.agentes || []).map(agTag).join('<br>')}</td><td class="tnum">${num(mo.llamadas)}</td><td class="tnum">${(mo.tokens.in / 1e6).toFixed(1).replace('.', ',')} M · ${(mo.tokens.out / 1e6).toFixed(1).replace('.', ',')} M · ${(mo.tokens.reasoning / 1e6).toFixed(1).replace('.', ',')} M</td><td class="tnum"><b>${eur(mo.coste)}</b></td><td><div class="meter" style="--c:var(--primary);margin:0"><i style="width:${share * 100}%"></i></div><span class="small muted tnum">${Math.round(share * 100)} %</span></td><td class="tnum">${ms(mo.p95_ms)}</td><td class="tnum">${esc(mo.exito.json_valido)}</td><td class="tnum">${esc(mo.exito.sin_reintento)}</td><td class="tnum">${esc(mo.exito.estable_replay)}</td><td>${esc(mo.exito.precision)}</td></tr>`; }).join('') || '<tr><td colspan="13" class="muted">Sin modelos en el dataset.</td></tr>';
    renderCharts();
    $('recos').innerHTML = (G.recomendaciones || []).map((r) => `<div class="alert ${r.sev}"><span class="ico">${ic(r.sev === 'info' ? 'lightbulb' : SEV_ICON[r.sev])}</span><div><b>${esc(r.id)} · ${conGuardrails(esc(r.titulo))}</b><small>${conGuardrails(esc(r.detalle))}</small></div><button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('play')} Simular con replay</button></div>`).join('');
  }

  // ---------------------------------------------------------------------------
  // FinOps: ficha modal de detalle de un KPI (coste hoy, mensual, caps, medio)
  // ---------------------------------------------------------------------------
  // Barras del coste diario total (últimos N días) con la línea del cap diario; resalta hoy
  function chartCosteDiario(dias, cap) {
    const n = dias.length;
    const W = 640, H = 200, pl = 40, pr = 16, pt = 14, pb = 28;
    const vals = dias.map(costeDia);
    const ymax = Math.max(cap * 1.15, ...vals) * 1.05;
    const bw = Math.min(26, ((W - pl - pr) / n) * .6);
    const xs = (i) => pl + ((i + .5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste diario total de los últimos ${n} días frente al cap diario">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      ${dias.map((d, i) => { const v = vals[i]; const esHoy = i === n - 1; return `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${esHoy ? 'var(--warn)' : 'var(--primary)'}" opacity="${esHoy ? 1 : .5}" data-tip="${fecha(d[0])}${esHoy ? ' · hoy' : ''}: ${eur(v)}"/>`; }).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${W - pr}" y="${ys(cap) - 6}" text-anchor="end" style="fill:var(--crit)">Cap diario ${eur(cap, 0)}</text>
      ${dias.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  // Área/línea del coste acumulado del mes frente al cap mensual
  function chartCosteAcumulado(dias, capMes) {
    const n = dias.length;
    const W = 640, H = 200, pl = 44, pr = 16, pt = 14, pb = 28;
    let acc = 0;
    const acumulado = dias.map((d) => (acc += costeDia(d)));
    const ymax = Math.max(capMes, ...acumulado) * 1.08;
    const xs = (i) => pl + (n > 1 ? (i / (n - 1)) * (W - pl - pr) : 0), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    const pts = acumulado.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    const area = `${xs(0)},${ys(0)} ${pts} ${xs(n - 1)},${ys(0)}`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste acumulado del mes frente al cap mensual">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      <polygon points="${area}" fill="var(--primary)" opacity=".15"/>
      <polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2"/>
      ${acumulado.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3" fill="var(--primary)" data-tip="${fecha(dias[i][0])}: ${eur(v)} acumulados"/>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(capMes)}" y2="${ys(capMes)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${W - pr}" y="${ys(capMes) - 6}" text-anchor="end" style="fill:var(--crit)">Cap mensual ${eur(capMes, 0)}</text>
      ${dias.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  // Barras horizontales con el % de consumo de cada cap, coloreadas por estado
  function chartCapsConsumo(caps) {
    const COLOR = { ok: 'var(--ok)', aviso: 'var(--warn)', superado: 'var(--crit)' };
    const rowH = 34, W = 640, H = 14 + caps.length * rowH, pl = 90, pr = 60;
    const max = Math.max(100, ...caps.map((c) => (c.consumo / c.limite) * 100));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="Porcentaje de consumo de cada cap de FinOps">
      ${caps.map((c, i) => { const y = 14 + i * rowH; const u = Math.round((c.consumo / c.limite) * 100); const w = Math.max(0, xs(Math.min(max, u)) - pl); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600" class="mono">${esc(c.id)}</text><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${COLOR[c.estado] || COLOR.ok}" data-tip="${esc(c.id)} · ${esc(c.ambito)}: ${u} % del límite"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${u} %</text>`; }).join('')}
      <line x1="${xs(100)}" x2="${xs(100)}" y1="6" y2="${H - 6}" stroke="var(--border)" stroke-dasharray="4 3"/>
    </svg>`;
  }

  // Barras horizontales del coste por agente (€ y % del total)
  function chartCosteAgente(porAgente, total) {
    const rowH = 34, W = 640, H = 14 + porAgente.length * rowH, pl = 215, pr = 90;
    const max = Math.max(...porAgente.map(([, v]) => v), 0.0001);
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coste por agente del periodo">
      ${porAgente.map(([a, v], i) => { const y = 14 + i * rowH; const share = total ? Math.round((v / total) * 100) : 0; const nombre = svgAg(a.id).length > 30 ? `${svgAg(a.id).slice(0, 28)}…` : svgAg(a.id); const w = Math.max(0, xs(v) - pl); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(nombre)}</text><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${agColor(a.id)}" data-tip="${esc(svgAg(a.id))}: ${eur(v)} · ${share} % del coste"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${eur(v)} · ${share} %</text>`; }).join('')}
    </svg>`;
  }

  const KPI_FIN = {
    'coste-hoy': {
      icono: 'euro',
      titulo: 'Coste hoy (parcial)',
      render: () => {
        const dias = diarioVisible(), hoy = G.diario[G.diario.length - 1], cap = capDiario(), gasto = costeDia(hoy);
        return `<p class="small muted">El coste de hoy suma lo gastado por todos los agentes en llamadas a modelos de IA durante la jornada en curso, todavía sin cerrar. Se compara en tiempo real contra ${grRef('CAP-01')}, el cap diario global.</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('euro')} Coste hoy</span><b>${eur(gasto)}</b></div>
            <div class="box"><span class="muted small">${ic('gauge')} % del cap diario</span><b>${Math.round((gasto / cap) * 100)} %</b></div>
            <div class="box"><span class="muted small">${ic('activity')} Mensajes hoy</span><b>${num(hoy[1])}</b></div>
            <div class="box"><span class="muted small">${ic('coins')} Coste medio / mensaje hoy</span><b>${eur(hoy[1] ? gasto / hoy[1] : 0, 4)}</b></div>
          </div>
          <div><h3>Coste diario de los últimos ${dias.length} días</h3>${chartCosteDiario(dias, cap)}</div>`;
      },
    },
    'coste-mensual': {
      icono: 'wallet',
      titulo: 'Coste mensual',
      render: () => {
        const info = G.kpis.finops[0] || {};
        const capMes = G.kpis.cap_mensual || 500;
        const dias = G.diario;
        const ultima = new Date(dias[dias.length - 1][0]);
        const diasEnMes = new Date(ultima.getFullYear(), ultima.getMonth() + 1, 0).getDate();
        const diasRestantes = Math.max(0, diasEnMes - ultima.getDate());
        const proyM = String(info.sub || '').match(/proyecci[oó]n[^\d]*([\d.,]+)\s*€/i);
        const proyeccion = proyM ? Number(proyM[1].replace(/\./g, '').replace(',', '.')) : null;
        return `<p class="small muted">El coste mensual acumula el gasto de todos los agentes en llamadas a modelos de IA desde el inicio del mes y se compara contra ${grRef('CAP-02')}, el cap mensual global. La proyección estima el cierre de mes al ritmo de gasto actual.</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('euro')} Coste del mes</span><b>${esc(info.valor || '—')}</b></div>
            <div class="box"><span class="muted small">${ic('gauge')} % del cap mensual</span><b>${Math.round(info.medidor || 0)} %</b></div>
            <div class="box"><span class="muted small">${ic('wallet')} Cap mensual</span><b>${eur(capMes, 0)}</b></div>
            ${proyeccion != null ? `<div class="box"><span class="muted small">${ic('chart-column')} Proyección de cierre</span><b>${eur(proyeccion, 0)}</b></div>` : ''}
            <div class="box"><span class="muted small">${ic('hourglass')} Días restantes del mes</span><b>${diasRestantes}</b></div>
          </div>
          <div><h3>Coste acumulado</h3><span class="muted small">Últimos ${dias.length} días con histórico · el total del mes también incluye días previos a este periodo</span>${chartCosteAcumulado(dias, capMes)}</div>`;
      },
    },
    'caps-superados': {
      icono: 'triangle-alert',
      titulo: 'Caps superados',
      render: () => {
        const superados = G.caps.filter((c) => c.estado === 'superado');
        const aviso = G.caps.filter((c) => c.estado === 'aviso');
        const ok = G.caps.filter((c) => c.estado === 'ok');
        const orden = [...superados, ...aviso, ...ok];
        return `<p class="small muted">Los caps de FinOps limitan el coste y consumo de tokens del pipeline. Al superarse se dispara la acción automática configurada (degradar el modelo, alertar o marcar la traza), igual que un guardrail.</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('triangle-alert')} Superados</span><b>${superados.length}</b></div>
            <div class="box"><span class="muted small">${ic('circle-alert')} En aviso (≥ 80 %)</span><b>${aviso.length}</b></div>
            <div class="box"><span class="muted small">${ic('check')} Dentro de límite</span><b>${ok.length}</b></div>
            <div class="box"><span class="muted small">${ic('list-checks')} Caps configurados</span><b>${G.caps.length}</b></div>
          </div>
          <div><h3>% de consumo por cap</h3>${chartCapsConsumo(orden)}</div>
          <div><h3>Detalle de los caps</h3><div class="tw"><table><thead><tr><th>Cap</th><th>Ámbito</th><th>Tipo</th><th>Límite</th><th>Consumo</th><th style="min-width:160px">Uso</th><th>Acción al superar</th><th>Estado</th></tr></thead><tbody>${orden.map(capRow).join('')}</tbody></table></div></div>`;
      },
    },
    'coste-medio': {
      icono: 'coins',
      titulo: 'Coste medio por mensaje',
      render: () => {
        const dias = diarioVisible();
        const totalMsgs = dias.reduce((a, d) => a + d[1], 0), coste = dias.reduce((a, d) => a + costeDia(d), 0);
        const porAgente = G.agentes.slice(0, 4).map((a, k) => [a, dias.reduce((s, d) => s + (d[2][k] || 0), 0)]).sort((a, b) => b[1] - a[1]);
        const masCaro = porAgente[0];
        return `<p class="small muted">El coste medio por mensaje es el coste total del periodo dividido entre los mensajes procesados en ese mismo periodo. Varía según la mezcla de ramos, la complejidad de los mensajes y qué modelo atiende cada agente.</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('coins')} Coste medio</span><b>${eur(totalMsgs ? coste / totalMsgs : 0, 4)}</b></div>
            <div class="box"><span class="muted small">${ic('euro')} Coste del periodo</span><b>${eur(coste)}</b></div>
            <div class="box"><span class="muted small">${ic('activity')} Mensajes procesados</span><b>${num(totalMsgs)}</b></div>
            <div class="box"><span class="muted small">${ic('cpu')} Agente más caro</span><b style="font-size:1rem">${masCaro ? agLbl(masCaro[0].id) : '—'}</b></div>
          </div>
          <div><h3>Reparto del coste por agente · últimos ${dias.length} días</h3>${chartCosteAgente(porAgente, coste)}</div>`;
      },
    },
  };

  // ---------------------------------------------------------------------------
  // Resumen: fichas modales animadas de los 6 KPI y del gráfico «Coste diario frente al cap»
  // ---------------------------------------------------------------------------
  const FMT_CONT = {
    int: (v) => num(Math.round(v)), dec1: (v) => v.toFixed(1).replace('.', ','), pct0: (v) => `${Math.round(v)} %`,
    pct1: (v) => `${v.toFixed(1).replace('.', ',')} %`, eur0: (v) => eur(v, 0), eur2: (v) => eur(v, 2), eur4: (v) => eur(v, 4),
  };
  // Cifra que se anima de 0 al valor final (el texto final ya está escrito: sin JS o con movimiento reducido se ve igual)
  const cnt = (v, kind = 'int') => `<span data-to="${v}" data-kind="${kind}">${FMT_CONT[kind](v)}</span>`;
  const kmini = (icono, etiqueta, valor, sub) => `<div class="box"><span class="muted small">${ic(icono)} ${etiqueta}</span><b>${valor}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>`;
  const leyenda = (items) => `<div class="legend">${items.map(([l, c, extra]) => `<span><i style="background:${c}${extra || ''}"></i>${esc(l)}</span>`).join('')}</div>`;
  const numDe = (txt, def) => { const m = String(txt || '').match(/[\d.]+(?:,\d+)?/); return m ? parseFloat(m[0].replace(/\./g, '').replace(',', '.')) : def; };
  const finde = (iso) => { const d = new Date(iso).getDay(); return d === 0 || d === 6; };
  const serieAround = (seed, n, base, amp, last) => { const r = rng(seed); const v = Array.from({ length: n }, () => base + (r() - 0.5) * 2 * amp); if (last != null) v[n - 1] = last; return v; };

  // Prepara las animaciones de una ficha: barras que crecen, líneas que se dibujan, anillos y cifras que cuentan
  function animar(root) {
    const reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('svg.chart').forEach((svg) => {
      const h = svg.dataset.orient === 'h'; let i = 0;
      svg.querySelectorAll('rect[data-tip]').forEach((r) => { r.classList.add(h ? 'bar-h' : 'bar-v'); r.style.setProperty('--i', i++); });
      svg.querySelectorAll('polyline[stroke]:not([stroke-dasharray]), path[fill="none"][stroke]:not([stroke-dasharray])').forEach((p) => { p.setAttribute('pathLength', '1'); p.classList.add('line-a'); });
      svg.querySelectorAll('polygon, path[opacity]').forEach((a) => a.classList.add('area-a'));
      svg.querySelectorAll('circle[data-tip]').forEach((c, k) => { c.classList.add('dot-a'); c.style.setProperty('--i', k); });
    });
    root.classList.remove('anim'); void root.offsetWidth;
    if (reducir) return;
    root.classList.add('anim');
    root.querySelectorAll('[data-to]').forEach((el) => {
      const to = Number(el.dataset.to), f = FMT_CONT[el.dataset.kind] || FMT_CONT.int, t0 = performance.now(), dur = 1000;
      const paso = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = f(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    });
  }

  // Barras verticales con sombreado de fines de semana, línea de referencia y serie superpuesta opcional
  function chartBarras(vals, fechas, o = {}) {
    const n = vals.length, W = 640, H = o.H || 220, pl = 46, pr = 16, pt = 16, pb = 28, f = o.fmt || ((v) => num(Math.round(v)));
    const ymax = Math.max(o.ref ? o.ref.v * 1.15 : 0, ...vals, ...(o.linea || [0])) * 1.1;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb), bw = Math.min(28, ((W - pl - pr) / n) * 0.62);
    const col = o.color || 'var(--primary)';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Serie diaria')}">
      ${fechas.map((d, i) => (finde(d) ? `<rect x="${xs(i) - (W - pl - pr) / n / 2}" y="${pt}" width="${(W - pl - pr) / n}" height="${H - pt - pb}" fill="var(--muted)" opacity=".07"/>` : '')).join('')}
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((q) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * q)}" y2="${ys(ymax * q)}"/><text x="${pl - 6}" y="${ys(ymax * q) + 4}" text-anchor="end">${(o.tick || f)(ymax * q)}</text>`).join('')}</g>
      ${vals.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${o.colorDe ? o.colorDe(v, i) : col}" opacity="${i === n - 1 ? 1 : 0.78}" data-tip="${fecha(fechas[i])}${i === n - 1 ? ' · hoy (parcial)' : ''}: ${f(v)}${o.unit ? ` ${o.unit}` : ''}"/>`).join('')}
      ${o.linea ? `<polyline points="${o.linea.map((v, i) => `${xs(i)},${ys(v)}`).join(' ')}" fill="none" stroke="${o.lineaColor || 'var(--ag-extraccion)'}" stroke-width="2.4" stroke-linejoin="round"/>` : ''}
      ${o.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${ys(o.ref.v)}" y2="${ys(o.ref.v)}" stroke="${o.ref.color || 'var(--crit)'}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${pl + 4}" y="${ys(o.ref.v) - 5}" style="fill:${o.ref.color || 'var(--crit)'};font-weight:700">${esc(o.ref.label)}</text>` : ''}
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }
  // Línea con área y puntos (tendencias en %)
  function chartTendencia(vals, fechas, o = {}) {
    const n = vals.length, W = 640, H = o.H || 210, pl = 46, pr = 16, pt = 16, pb = 28, f = o.fmt || pct1v;
    const lo = o.min != null ? o.min : Math.min(...vals, o.ref ? o.ref.v : Infinity) * 0.9, hi = o.max != null ? o.max : Math.max(...vals, o.ref ? o.ref.v : 0) * 1.1;
    const xs = (i) => pl + (n > 1 ? (i / (n - 1)) * (W - pl - pr) : 0), ys = (v) => pt + (1 - (v - lo) / (hi - lo || 1)) * (H - pt - pb);
    const pts = vals.map((v, i) => `${xs(i)},${ys(v)}`).join(' '); const col = o.color || 'var(--primary)';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Tendencia')}">
      <g class="grid">${[0, 0.5, 1].map((q) => { const v = lo + (hi - lo) * q; return `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${f(v)}</text>`; }).join('')}</g>
      <polygon points="${xs(0)},${ys(lo)} ${pts} ${xs(n - 1)},${ys(lo)}" fill="${col}" opacity=".13"/>
      ${o.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${ys(o.ref.v)}" y2="${ys(o.ref.v)}" stroke="${o.ref.color || 'var(--ok)'}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${pl + 4}" y="${ys(o.ref.v) - 5}" style="fill:${o.ref.color || 'var(--ok)'};font-weight:700">${esc(o.ref.label)}</text>` : ''}
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      ${vals.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="${i === n - 1 ? 5 : 3.4}" fill="${o.puntoDe ? o.puntoDe(v) : col}" stroke="var(--surface)" stroke-width="2" data-tip="${fecha(fechas[i])}: ${f(v)}"/>`).join('')}
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }
  const pct1v = (v) => `${v.toFixed(1).replace('.', ',')} %`;
  // Barras apiladas por día: series = [{ label, color, vals }]
  function chartApilada(series, fechas, o = {}) {
    const n = fechas.length, W = 640, H = o.H || 220, pl = 46, pr = 16, pt = 16, pb = 28;
    const tot = fechas.map((_, i) => series.reduce((a, s) => a + s.vals[i], 0)), ymax = Math.max(...tot, o.ref ? o.ref.v * 1.15 : 0) * 1.1;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb), bw = Math.min(28, ((W - pl - pr) / n) * 0.62), f = o.fmt || ((v) => num(Math.round(v)));
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Serie apilada')}">
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((q) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * q)}" y2="${ys(ymax * q)}"/><text x="${pl - 6}" y="${ys(ymax * q) + 4}" text-anchor="end">${f(ymax * q)}</text>`).join('')}</g>
      ${fechas.map((d, i) => { let acc = 0; return series.map((s, k) => { const v = s.vals[i], y0 = ys(acc), y1 = ys(acc + v); acc += v; return `<rect x="${xs(i) - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1 - 1)}" rx="${k === series.length - 1 ? 3 : 0}" fill="${s.color}" data-tip="${fecha(d)} · ${esc(s.label)}: ${f(v)}"/>`; }).join(''); }).join('')}
      ${o.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${ys(o.ref.v)}" y2="${ys(o.ref.v)}" stroke="${o.ref.color || 'var(--crit)'}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${pl + 4}" y="${ys(o.ref.v) - 5}" style="fill:${o.ref.color || 'var(--crit)'};font-weight:700">${esc(o.ref.label)}</text>` : ''}
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }
  // Anillo animado con reparto [etiqueta, valor, color] y texto central
  function chartAnillo(items, centro, sub) {
    const R = 54, C = 2 * Math.PI * R, total = items.reduce((a, [, v]) => a + v, 0) || 1; let off = 0;
    return `<svg class="donut" viewBox="0 0 160 160" role="img" aria-label="${esc(sub || 'Reparto')}">
      <circle cx="80" cy="80" r="${R}" fill="none" stroke="var(--border)" stroke-width="18" opacity=".55"/>
      ${items.map(([l, v, c], i) => { const len = Math.max(0, (v / total) * C - 2); const seg = `<circle class="donut-seg" style="--i:${i}" cx="80" cy="80" r="${R}" fill="none" stroke="${c}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)" data-tip="${esc(l)}: ${num(Math.round(v))} · ${Math.round((v / total) * 100)} %"/>`; off += (v / total) * C; return seg; }).join('')}
      <text x="80" y="82" text-anchor="middle" style="font-size:25px;font-weight:800;fill:var(--text)">${esc(centro)}</text>
      <text x="80" y="100" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${esc(sub || '')}</text>
    </svg>`;
  }
  const anilloConLeyenda = (items, centro, sub) => `<div class="donut-wrap">${chartAnillo(items, centro, sub)}<ul class="donut-leg">${items.map(([l, v, c]) => `<li><i style="background:${c}"></i><span>${esc(l)}</span><b class="tnum">${num(Math.round(v))}</b><span class="muted small">${Math.round((v / (items.reduce((a, [, x]) => a + x, 0) || 1)) * 100)} %</span></li>`).join('')}</ul></div>`;

  // Datos derivados comunes de las fichas del Resumen
  function datosResumen() {
    const dias = diarioVisible(), fechas = dias.map((d) => d[0]), n = dias.length;
    const total = dias.reduce((a, d) => a + d[1], 0), coste = dias.reduce((a, d) => a + costeDia(d), 0);
    const [aut, esc1, ovr, alr] = (G.kpis.resumen || []);
    const pAut = numDe(aut && aut.valor, 81), pEsc = numDe(esc1 && esc1.valor, 100 - pAut), pOvr = numDe(ovr && ovr.valor, 2.1);
    const nAut = Math.round(numDe(aut && aut.sub, total * pAut / 100)), nEsc = Math.round(numDe(esc1 && esc1.sub, total - nAut));
    return { dias, fechas, n, total, coste, aut, esc1, ovr, alr, pAut, pEsc, pOvr, nAut, nEsc, capMes: G.kpis.cap_mensual || 500 };
  }
  const mediaMovil = (v, k = 3) => v.map((_, i) => { const s = v.slice(Math.max(0, i - k + 1), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; });

  KPI_FIN['res-msgs'] = {
    icono: 'activity', titulo: 'Mensajes procesados',
    render: () => {
      const d = datosResumen(); const msgs = d.dias.map((x) => x[1]);
      const pico = Math.max(...msgs), laborables = d.dias.filter((x) => !finde(x[0])), fines = d.dias.filter((x) => finde(x[0]));
      const media = (a) => (a.length ? a.reduce((s, x) => s + x[1], 0) / a.length : 0);
      const trz = G.trazas || []; const mix = (k, claves) => claves.map((c) => trz.filter((t) => t[k] === c).length + 1);
      const canales = distribuir(d.total, mix('canal', CANALES_ORDEN), 'msg-canal').map((v, i) => [canalInfo(CANALES_ORDEN[i])[1], v, ['var(--primary)', 'var(--ag-clasificacion)', 'var(--ag-extraccion)', 'var(--ag-reglas)', 'var(--auto)'][i]]);
      const ramos = distribuir(d.total, mix('ramo', ['Auto', 'Hogar', 'Salud']), 'msg-ramo').map((v, i) => [['Auto', 'Hogar', 'Salud'][i], v, ['var(--auto)', 'var(--hogar)', 'var(--salud)'][i]]);
      return `<p class="small muted">Cada mensaje de cliente que entra por cualquier canal y recorre la cadena de agentes (multicanal → clasificación → extracción → reglas) cuenta una vez. El volumen es claramente semanal: baja a la mitad en fin de semana.</p>
        <div class="kpi-mini">${kmini('activity', 'Mensajes en el periodo', cnt(d.total))}${kmini('chart-column', 'Media diaria', cnt(Math.round(d.total / d.n)))}${kmini('gauge', 'Día de mayor carga', cnt(pico), fecha(d.fechas[msgs.indexOf(pico)]))}${kmini('calendar', 'Laborable vs. fin de semana', `${cnt(Math.round(media(laborables)))} / ${cnt(Math.round(media(fines)))}`, 'mensajes al día de media')}</div>
        <div><h3>Mensajes por día · barras = volumen, línea = media móvil de 3 días</h3>${chartBarras(msgs, d.fechas, { linea: mediaMovil(msgs), aria: 'Mensajes procesados por día', unit: 'mensajes' })}${leyenda([['Mensajes', 'var(--primary)'], ['Media móvil 3 d', 'var(--ag-extraccion)'], ['Fin de semana', 'var(--muted)', ';opacity:.3']])}</div>
        <div class="two"><div><h3>Por canal de entrada</h3>${anilloConLeyenda(canales, num(d.total), 'mensajes')}</div><div><h3>Por ramo</h3>${anilloConLeyenda(ramos, num(d.total), 'mensajes')}</div></div>
        <p class="muted small">El reparto por canal y ramo se estima a partir del mix del lote actual (Paquete A).</p>`;
    },
  };

  KPI_FIN['res-aut'] = {
    icono: 'zap', titulo: 'Autonomía efectiva',
    render: () => {
      const d = datosResumen(); const base = serieAround('aut-dia', d.n, d.pAut, 1.6, d.pAut); if (d.n > 3) { base[d.n - 3] = d.pAut - 2.4; base[d.n - 2] = d.pAut - 3.1; }
      const porNivel = G.agentes.filter((a) => a.cap_hoy != null);
      return `<p class="small muted">Porcentaje de decisiones que el sistema toma y ejecuta <b>sin intervención humana</b>: ni escalado por un guardrail ni cambiado después por un tramitador. El objetivo de la demo es ≥ 80 %.</p>
        <div class="kpi-mini">${kmini('zap', 'Autonomía efectiva', cnt(d.pAut, 'pct0'))}${kmini('circle-check', 'Decisiones autónomas', cnt(d.nAut))}${kmini('user-check', 'Pasaron por una persona', cnt(d.nEsc))}${kmini('gauge', 'Margen sobre el objetivo', `<span style="color:var(--${d.pAut >= 80 ? 'ok' : 'crit'})">${d.pAut >= 80 ? '+' : ''}${(d.pAut - 80).toFixed(1).replace('.', ',')} pp</span>`, 'objetivo ≥ 80 %')}</div>
        <div class="two"><div><h3>Reparto de decisiones</h3>${anilloConLeyenda([['Autónomas', d.nAut, 'var(--ok)'], ['Escaladas a una persona', d.nEsc, 'var(--review)']], `${Math.round(d.pAut)} %`, 'autónomas')}</div>
        <div><h3>Autonomía por agente</h3><ul class="rel-list lvl-list">${porNivel.map((a) => `<li>${agTag(a.id)}${lvlBadge(a.nivel)}<span class="small muted">${esc((G.niveles[a.nivel] || {}).nombre || '')}</span><span class="meter" style="--c:var(--lc-${a.nivel})"><i style="width:${(a.nivel + 1) * 25}%"></i></span></li>`).join('')}</ul><p class="muted small" style="margin-top:.4rem">Una barra más llena = más autonomía concedida al agente (L0 manual … L3 autónomo).</p></div></div>
        <div><h3>Autonomía efectiva por día</h3>${chartTendencia(base, d.fechas, { min: Math.floor(Math.min(...base) - 3), max: 100, ref: { v: 80, label: 'objetivo 80 %' }, aria: 'Autonomía efectiva por día', puntoDe: (v) => (v >= 80 ? 'var(--ok)' : 'var(--warn)'), color: 'var(--ok)' })}<p class="muted small">La caída de los últimos días coincide con la bajada de Reglas de L3 a L2 (supervisado) y la degradación por cap.</p></div>`;
    },
  };

  KPI_FIN['res-esc'] = {
    icono: 'user-check', titulo: 'Escalados a humano',
    render: () => {
      const d = datosResumen();
      const causas = [...String((d.aut && G.kpis.autonomia && G.kpis.autonomia[1] && G.kpis.autonomia[1].sub) || '').matchAll(/(G-\d{2})[^\d]*(\d+) %/g)].map((m) => [m[1], Number(m[2])]);
      const base = causas.length ? causas : [['G-02', 62], ['G-04', 20], ['G-05', 11]]; const resto = Math.max(0, 100 - base.reduce((a, [, v]) => a + v, 0));
      const filas = [...base, ...(resto ? [['otras', resto]] : [])];
      const colores = ['var(--ag-reglas)', 'var(--review)', 'var(--ag-extraccion)', 'var(--muted)'];
      const nombre = (id) => { const p = G.politicas.find((x) => x.id === id); return id === 'otras' ? 'Otras (confianza, discrepancia…)' : `${id} · ${p ? p.condicion.split(' · ')[0].replace(/ \(.*$/, '') : ''}`.replace(/(.{40}).+/, '$1…'); };
      const porDia = d.dias.map((x, i) => { const aut = serieAround('aut-dia', d.n, d.pAut, 1.6, d.pAut)[i]; return Math.round(x[1] * (100 - aut) / 100); });
      const series = filas.map(([id, pc], k) => ({ label: id === 'otras' ? 'Otras' : id, color: colores[k % colores.length], vals: porDia.map((v, i) => Math.round(v * pc / 100)) }));
      return `<p class="small muted">Decisiones que un guardrail (o una confianza baja) envía a un tramitador en lugar de ejecutarse solas. Un escalado no es un fallo: es el sistema funcionando como se diseñó.</p>
        <div class="kpi-mini">${kmini('user-check', 'Escalados en el periodo', cnt(d.nEsc))}${kmini('gauge', '% de los mensajes', cnt(d.pEsc, 'pct0'))}${kmini('shield-check', 'Causa principal', esc(filas[0][0]), `${filas[0][1]} % de los escalados`)}${kmini('timer', 'Resolución humana (mediana)', cnt(14, 'int') + ' min', 'desde que llega a la cola')}</div>
        <div class="two"><div><h3>Causas de escalado</h3>${anilloConLeyenda(filas.map(([id, pc], k) => [nombre(id), Math.round(d.nEsc * pc / 100), colores[k % colores.length]]), `${Math.round(d.pEsc)} %`, 'escalados')}</div>
        <div><h3>Ranking de guardrails por disparos</h3>${hbars([...G.politicas].filter((p) => p.severidad === 'humano').sort((a, b) => b.disparos - a.disparos).slice(0, 6).map((p) => [p.id, p.disparos, agColor(p.agente)]), { pl: 56, aria: 'Guardrails con más disparos' })}</div></div>
        <div><h3>Escalados por día y causa</h3>${chartApilada(series, d.fechas, { aria: 'Escalados por día y causa' })}${leyenda(series.map((s) => [s.label, s.color]))}</div>`;
    },
  };

  KPI_FIN['res-ovr'] = {
    icono: 'repeat', titulo: 'Overrides humanos',
    render: () => {
      const d = datosResumen(); const serie = [1.7, 1.9, 1.6, 1.8, 1.9, 2.0, 1.8, 1.7, 2.1, 1.9, 2.2, 3.4, 4.1, d.pOvr].slice(-d.n); const cambiadas = Math.round(numDe(d.ovr && d.ovr.sub, 67));
      const porAgente = G.agentes.filter((a) => a.cap_hoy != null).map((a) => [`${svgAg(a.id)}`, numDe(a.override_14d && a.override_14d !== '—' ? a.override_14d : '0', 0), agColor(a.id)]);
      const motivos = [['Dato no accesible al modelo', 41, 'var(--ag-extraccion)'], ['Importe mal interpretado', 22, 'var(--ag-reglas)'], ['Cobertura o exclusión', 19, 'var(--review)'], ['Otros', 18, 'var(--muted)']];
      const recientes = (G.eventos || []).filter((e) => e.tipo === 'override').slice(0, 3);
      return `<p class="small muted">Un <b>override</b> es una decisión del agente que un tramitador cambia después. Es la mejor señal de calidad real: si sube por encima del 3 %, el nivel de autonomía del agente se revisa a la baja.</p>
        <div class="kpi-mini">${kmini('repeat', 'Tasa de override', cnt(d.pOvr, 'pct1'))}${kmini('user-check', 'Decisiones cambiadas', cnt(cambiadas))}${kmini('gauge', 'Objetivo', '≤ 3 %', `<span style="color:var(--${d.pOvr <= 3 ? 'ok' : 'crit'})">${d.pOvr <= 3 ? 'dentro del objetivo' : 'por encima'}</span>`)}${kmini('triangle-alert', 'Pico del periodo', cnt(Math.max(...serie), 'pct1'), 'semana del 15/09')}</div>
        <div><h3>Tasa de override por día</h3>${chartTendencia(serie, d.fechas, { min: 0, max: 5, ref: { v: 3, label: 'umbral de bajada de nivel 3 %', color: 'var(--crit)' }, aria: 'Tasa de override por día', color: 'var(--time)', puntoDe: (v) => (v > 3 ? 'var(--crit)' : 'var(--time)') })}</div>
        <div class="two"><div><h3>Override por agente (14 días, %)</h3>${hbars(porAgente.map(([l, v, c]) => [l, v, c]), { pl: 190, fmt: (v) => `${String(v).replace('.', ',')} %`, total: 100, aria: 'Override por agente' })}</div>
        <div><h3>Por qué cambia una persona la decisión</h3>${anilloConLeyenda(motivos.map(([l, v, c]) => [l, v, c]), `${cambiadas}`, 'overrides')}</div></div>
        ${recientes.length ? `<div><h3>Overrides recientes</h3><ul class="mini-tl">${recientes.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:var(--review)">${ic('user-check')}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}`;
    },
  };

  KPI_FIN['res-coste'] = {
    icono: 'euro', titulo: 'Coste del periodo',
    render: () => {
      const d = datosResumen(); const ids = G.agentes.slice(0, 4).map((a) => a.id);
      const porAg = ids.map((id, k) => [id, d.dias.reduce((s, x) => s + (x[2][k] || 0), 0)]);
      const series = ids.map((id, k) => ({ label: svgAg(id), color: agColor(id), vals: d.dias.map((x) => x[2][k] || 0) }));
      const pm = d.total ? d.coste / d.total : 0; const proy = (G.kpis.finops && G.kpis.finops[0] && /proyecci[oó]n[^\d]*([\d.,]+)/i.exec(G.kpis.finops[0].sub || '')) ? numDe(/proyecci[oó]n[^\d]*([\d.,]+)/i.exec(G.kpis.finops[0].sub)[1], null) : null;
      return `<p class="small muted">Gasto en llamadas a modelos de IA de todos los agentes en el periodo seleccionado. El agente de Reglas (gpt-5 con razonamiento) concentra la mayor parte; por eso es el que más cuidan los caps.</p>
        <div class="kpi-mini">${kmini('euro', 'Coste del periodo', cnt(d.coste, d.coste < 10 ? 'eur2' : 'eur0'))}${kmini('gauge', '% del cap mensual', cnt((d.coste / d.capMes) * 100, 'pct0'), `de ${eur(d.capMes, 0)}`)}${kmini('coins', 'Coste por mensaje', cnt(pm, 'eur4'))}${proy != null ? kmini('chart-column', 'Proyección de cierre de mes', cnt(proy, 'eur0')) : kmini('activity', 'Coste medio diario', cnt(d.coste / d.n, 'eur2'))}</div>
        <div><h3>Coste diario apilado por agente</h3>${chartApilada(series, d.fechas, { fmt: (v) => `${v.toFixed(v < 10 ? 1 : 0).replace('.', ',')} €`, ref: { v: capDiario(), label: `cap diario ${eur(capDiario(), 0)}` }, aria: 'Coste diario por agente' })}${leyenda([...series.map((s) => [s.label, s.color]), ['Cap diario', 'var(--crit)']])}</div>
        <div class="two"><div><h3>Reparto del coste</h3>${anilloConLeyenda(porAg.map(([id, v]) => [svgAg(id), Math.round(v * 100) / 100, agColor(id)]), eur(d.coste, 0), 'periodo')}</div>
        <div><h3>Coste acumulado frente al cap mensual</h3>${chartCosteAcumulado(G.diario, d.capMes)}</div></div>`;
    },
  };

  KPI_FIN['res-alertas'] = {
    icono: 'bell', titulo: 'Alertas activas',
    render: () => {
      const d = datosResumen(); const act = G.alertas || []; const evs = (G.eventos || []).filter((e) => e.tipo === 'alerta' || e.tipo === 'incidente');
      const fechasEv = fechasSerie(); const porDia = (sev) => fechasEv.map((f) => evs.filter((e) => e.fecha.slice(0, 10) === f && e.sev === sev).length);
      const series = [{ label: 'Crítica', color: 'var(--crit)', vals: porDia('crit') }, { label: 'Aviso', color: 'var(--warn)', vals: porDia('warn') }, { label: 'Informativa', color: 'var(--time)', vals: porDia('info') }, { label: 'Cerrada', color: 'var(--ok)', vals: porDia('ok') }];
      const nCrit = act.filter((a) => a.sev === 'crit').length, nWarn = act.filter((a) => a.sev === 'warn').length;
      return `<p class="small muted">Situaciones que requieren atención ahora: caps de coste superados, errores del proveedor o deriva del comportamiento. Las críticas pueden activar una acción automática (por ejemplo degradar el modelo).</p>
        <div class="kpi-mini">${kmini('bell', 'Alertas activas', cnt(act.length))}${kmini('triangle-alert', 'Críticas', `<span style="color:var(--crit)">${cnt(nCrit)}</span>`)}${kmini('circle-alert', 'Avisos', `<span style="color:var(--warn)">${cnt(nWarn)}</span>`)}${kmini('history', 'Eventos en 14 días', cnt(evs.length), 'alertas e incidentes')}</div>
        <div class="two"><div><h3>Alertas activas por severidad</h3>${anilloConLeyenda([['Crítica', nCrit, 'var(--crit)'], ['Aviso', nWarn, 'var(--warn)'], ['Informativa', act.length - nCrit - nWarn, 'var(--time)']].filter((x) => x[1] > 0), String(act.length), 'activas')}</div>
        <div><h3>Alertas e incidentes por día</h3>${chartApilada(series, fechasEv, { H: 200, fmt: (v) => String(Math.round(v)), aria: 'Alertas por día y severidad' })}${leyenda(series.map((s) => [s.label, s.color]))}</div></div>
        <div><h3>Alertas activas</h3><div class="alerts">${act.map((a) => `<div class="alert ${a.sev}"><span class="ico${a.sev === 'crit' ? ' pulse' : ''}">${ic(SEV_ICON[a.sev] || 'info')}</span><div><b>${conGuardrails(esc(a.titulo))}</b><small>${conGuardrails(esc(a.detalle))}</small></div><span class="muted small" style="white-space:nowrap">${esc(a.cuando || '')}</span></div>`).join('') || '<p class="muted">Sin alertas activas.</p>'}</div>
        <div class="row" style="margin-top:.6rem"><button class="btn btn-sm" type="button" data-goto="finops">${ic('coins')} Ir a FinOps</button><button class="btn btn-sm" type="button" data-goto="historico">${ic('history')} Ver el histórico</button></div></div>`;
    },
  };

  KPI_FIN['coste-cap'] = {
    icono: 'euro', titulo: 'Coste diario frente al cap',
    render: () => {
      const d = datosResumen(); const cap = capDiario(); const vals = d.dias.map(costeDia); const hoy = vals[vals.length - 1];
      const sobre = d.dias.map((x, i) => [x[0], vals[i], vals[i] / cap]).filter(([, , u]) => u >= 0.8).reverse();
      const nCap = vals.filter((v) => v >= cap).length, nAviso = vals.filter((v) => v >= cap * 0.8 && v < cap).length;
      const ids = G.agentes.slice(0, 4).map((a) => a.id);
      const series = ids.map((id, k) => ({ label: svgAg(id), color: agColor(id), vals: d.dias.map((x) => x[2][k] || 0) }));
      return `<p class="small muted">Coste total de los agentes cada día frente a ${grRef('CAP-01')}, el cap diario global. Al 80 % salta un aviso; al 100 % se degrada el agente de Reglas a un modelo más barato (G-07).</p>
        <div class="kpi-mini">${kmini('euro', 'Coste hoy (parcial)', cnt(hoy, 'eur2'))}${kmini('gauge', '% del cap diario', cnt((hoy / cap) * 100, 'pct0'), `cap ${eur(cap, 0)}`)}${kmini('triangle-alert', 'Días sobre el cap', `<span style="color:var(--${nCap ? 'crit' : 'ok'})">${cnt(nCap)}</span>`, `de ${d.n}`)}${kmini('circle-alert', 'Días en aviso (≥ 80 %)', `<span style="color:var(--warn)">${cnt(nAviso)}</span>`)}${kmini('chart-column', 'Día más caro', cnt(Math.max(...vals), 'eur2'), fecha(d.fechas[vals.indexOf(Math.max(...vals))]))}</div>
        <div><h3>Coste total por día</h3>${chartCoste()}${leyenda([['Coste total / día', 'var(--primary)'], ['Día ≥ 80 % del cap', 'var(--warn)'], ['Cap diario global', 'var(--crit)']])}</div>
        <div><h3>De qué agente viene el gasto</h3>${chartApilada(series, d.fechas, { fmt: (v) => `${v.toFixed(v < 10 ? 1 : 0).replace('.', ',')} €`, ref: { v: cap, label: `cap ${eur(cap, 0)}` }, aria: 'Coste diario por agente' })}${leyenda(series.map((s) => [s.label, s.color]))}</div>
        ${sobre.length ? `<div><h3>Días cerca del cap o por encima</h3><div class="tw tabla-compacta"><table><thead><tr><th>Día</th><th>Coste</th><th style="min-width:180px">Uso del cap</th><th>Estado</th></tr></thead><tbody>${sobre.map(([f, v, u]) => `<tr><td class="tnum">${fecha(f)}</td><td class="tnum"><b>${eur(v)}</b></td><td><div class="meter" style="--c:var(--${u >= 1 ? 'crit' : 'warn'});margin:0"><i style="width:${Math.min(100, u * 100)}%"></i></div><span class="small muted tnum">${Math.round(u * 100)} %</span></td><td><span class="pill ${u >= 1 ? 'pill-crit' : 'pill-warn'}">${u >= 1 ? 'Superado' : 'Aviso ≥ 80 %'}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
    },
  };

  function abrirModalKpiFin(key) {
    const info = KPI_FIN[key];
    if (!info) return;
    $('modal-kpi-fin-title').innerHTML = `${ic(info.icono)} ${esc(info.titulo)}`;
    $('modal-kpi-fin-body').innerHTML = info.render();
    abrir('modal-kpi-fin');
    animar($('modal-kpi-fin-body'));
  }

  // ---------------------------------------------------------------------------
  // Fichas modales: utilidades comunes (datos deterministas de demo, medidor, «Agente de» adaptable)
  // ---------------------------------------------------------------------------
  const abrir = (id) => { const d = $(id); if (!d.open) d.showModal(); ajustarAgentes(d); };
  const cerrarTodos = () => document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rng = (seed) => {
    const s = String(seed); let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  // Reparte `total` en enteros según `pesos` con una variación estable por semilla (la suma es exacta)
  const distribuir = (total, pesos, seed) => {
    const r = rng(seed); const w = pesos.map((p) => p * (0.75 + r() * 0.5)); const s = w.reduce((a, b) => a + b, 0);
    const raw = w.map((x) => (x / s) * total); const out = raw.map(Math.floor);
    let resto = total - out.reduce((a, b) => a + b, 0);
    raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0]).slice(0, resto).forEach(([, i]) => { out[i] += 1; });
    return out;
  };
  const diasEntre = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
  const hoyIso = () => G.generado || new Date().toISOString();
  const siguienteId = (prefijo, lista) => `${prefijo}-${String(Math.max(0, ...lista.map((x) => parseInt(String(x.id).slice(prefijo.length + 1), 10) || 0)) + 1).padStart(2, '0')}`;

  // Medidor semicircular de consumo: verde < aviso, ámbar hasta el 100 %, rojo por encima
  function gaugeSvg(u, aviso = 0.8) {
    const cx = 105, cy = 98, R = 78, f = Math.min(u, 1.2) / 1.2;
    const pt = (fr, r = R) => { const a = Math.PI * (1 - fr); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
    const arc = (f0, f1) => { const [x0, y0] = pt(f0), [x1, y1] = pt(f1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
    const color = u >= 1 ? 'var(--crit)' : u >= aviso ? 'var(--warn)' : 'var(--ok)';
    const [m0x, m0y] = pt(1 / 1.2, R - 12), [m1x, m1y] = pt(1 / 1.2, R + 9);
    return `<svg class="gauge" viewBox="0 0 218 124" role="img" aria-label="Consumo del cap: ${Math.round(u * 100)} % del límite">
      <path d="${arc(0.001, aviso / 1.2)}" fill="none" stroke="var(--ok)" stroke-opacity=".2" stroke-width="14"/>
      <path d="${arc(aviso / 1.2, 1 / 1.2)}" fill="none" stroke="var(--warn)" stroke-opacity=".28" stroke-width="14"/>
      <path d="${arc(1 / 1.2, 0.999)}" fill="none" stroke="var(--crit)" stroke-opacity=".28" stroke-width="14"/>
      ${f > 0.004 ? `<path d="${arc(0.001, Math.max(0.006, f))}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>` : ''}
      <line x1="${m0x}" y1="${m0y}" x2="${m1x}" y2="${m1y}" stroke="var(--text)" stroke-width="2"/>
      <text x="${m1x + 3}" y="${m1y - 2}" style="font-size:9px;fill:var(--muted)">100 %</text>
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" style="font-size:30px;font-weight:800;fill:${color}">${Math.round(u * 100)} %</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">del límite</text>
    </svg>`;
  }

  // Barras horizontales [etiqueta, valor, color, html?] con el valor y el % al final
  function hbars(items, opts = {}) {
    const total = opts.total || items.reduce((a, [, v]) => a + v, 0) || 1;
    const rowH = 30, W = 640, pl = opts.pl || 150, pr = 90, H = 8 + items.length * rowH, max = Math.max(...items.map(([, v]) => v), 0.0001);
    const f = opts.fmt || ((v) => num(v));
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Distribución')}">${items.map(([label, v, color], i) => { const y = 4 + i * rowH; const w = Math.max(v > 0 ? 3 : 0, ((v / max) * (W - pl - pr))); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(label)}</text><rect x="${pl}" y="${y}" width="${W - pl - pr}" height="20" rx="4" fill="${color}" opacity=".1"/><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${color}" data-tip="${esc(label)}: ${f(v)} · ${Math.round((v / total) * 100)} %"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${f(v)} · ${Math.round((v / total) * 100)} %</text>`; }).join('')}</svg>`;
  }

  // «Agente de» / «Ag. de»: el prefijo se acorta solo cuando el nombre del agente ocuparía dos líneas
  function ajustarAgentes(root = document) {
    root.querySelectorAll('.agn').forEach((el) => {
      el.classList.remove('short');
      if (!el.getClientRects().length) return; // oculto (otra pestaña o modal cerrada)
      const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      if (el.getBoundingClientRect().height > lh * 1.5) el.classList.add('short');
    });
  }

  // ---------------------------------------------------------------------------
  // FinOps · caps: ficha modal, acciones correctivas y alta de un cap nuevo
  // ---------------------------------------------------------------------------
  const capsNuevos = ssGet('gobierno.caps_nuevos', []);       // caps creados en esta sesión
  const grNuevos = ssGet('gobierno.gr_nuevos', []);           // guardrails creados en esta sesión
  const correctivasEstado = ssGet('gobierno.correctivas', {}); // { 'CAP-03:1': 'aplicada' | 'pendiente' }
  const incluirNuevos = () => {
    capsNuevos.forEach((c) => { if (!G.caps.some((x) => x.id === c.id)) G.caps.push(c); });
    grNuevos.forEach((p) => { if (!G.politicas.some((x) => x.id === p.id)) G.politicas.push(p); });
  };
  const capUso = (c) => c.consumo / c.limite;
  const capFmt = (c, v) => (c.unidad === '€' ? eur(v, v < 1 ? 3 : 2) : `${num(Math.round(v * 10) / 10)} ${esc(c.unidad)}`);
  const capEstadoDe = (c) => (c.consumo >= c.limite ? 'superado' : c.consumo >= c.limite * ((c.aviso_pct || 80) / 100) ? 'aviso' : 'ok');
  const agenteDeAmbito = (ambito) => G.agentes.find((a) => a.nombre === ambito);
  const ambitoHtml = (c) => { const a = agenteDeAmbito(c.ambito); return a ? agTag(a.id) : esc(c.ambito); };
  const fechasSerie = () => G.diario.slice(-14).map((d) => d[0]);

  // Serie de 14 días del cap (en los caps mensuales, el acumulado del mes)
  function capSerie(c) {
    if (/mensual/i.test(c.tipo)) {
      const diario = (G.caps.find((x) => /diario/i.test(x.tipo) && x.ambito === 'Global') || {}).serie || G.diario.slice(-14).map(costeDia);
      const suma = diario.reduce((a, b) => a + b, 0); let acc = Math.max(0, c.consumo - suma);
      return diario.map((v) => (acc += v));
    }
    return c.serie && c.serie.length ? c.serie : [];
  }
  // Reparto del consumo entre agentes: [[id, cuota]] de mayor a menor
  function capAgentes(c) {
    let pares;
    if (c.agentes) pares = Object.entries(c.agentes);
    else if (agenteDeAmbito(c.ambito)) pares = [[agenteDeAmbito(c.ambito).id, 1]];
    else { const d = /mensual/i.test(c.tipo) ? G.diario.slice(-14) : [G.diario[G.diario.length - 1]]; pares = G.agentes.slice(0, 4).map((a, k) => [a.id, d.reduce((s, x) => s + (x[2][k] || 0), 0)]); }
    const t = pares.reduce((s, [, v]) => s + v, 0) || 1;
    return pares.map(([id, v]) => [id, v / t]).filter(([id]) => AG[id]).sort((x, y) => y[1] - x[1]);
  }

  // Gráfico de la serie del cap con su límite y su umbral de aviso (barras; área en los acumulados)
  function chartCapSerie(c, serie, fechas, alto = 230) {
    const n = serie.length, W = 640, H = alto, pl = 48, pr = 16, pt = 16, pb = 28;
    const aviso = c.limite * ((c.aviso_pct || 80) / 100);
    const ymax = Math.max(c.limite * 1.15, ...serie) * 1.05;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    const dec = ymax >= 30 ? 0 : ymax >= 1 ? 1 : 3;
    const tick = (v) => (c.unidad === '€' ? `${v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })} €` : num(Math.round(v)));
    const acum = /mensual/i.test(c.tipo);
    const bw = Math.min(26, ((W - pl - pr) / n) * 0.62);
    const col = (v) => (v >= c.limite ? 'var(--crit)' : v >= aviso ? 'var(--warn)' : 'var(--primary)');
    const pts = serie.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consumo de ${esc(c.id)} en los últimos ${n} días frente a su límite">
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * f)}" y2="${ys(ymax * f)}"/><text x="${pl - 6}" y="${ys(ymax * f) + 4}" text-anchor="end">${tick(ymax * f)}</text>`).join('')}</g>
      ${acum ? `<polygon points="${xs(0)},${ys(0)} ${pts} ${xs(n - 1)},${ys(0)}" fill="var(--primary)" opacity=".14"/><polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2.2"/>${serie.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3.2" fill="${col(v)}" stroke="var(--surface)" stroke-width="1.5" data-tip="${fecha(fechas[i])}: ${capFmt(c, v)} acumulados"/>`).join('')}`
        : serie.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${col(v)}" opacity="${i === n - 1 ? 1 : 0.62}" data-tip="${fecha(fechas[i])}${i === n - 1 ? ' · hoy (parcial)' : ''}: ${capFmt(c, v)} · ${Math.round((v / c.limite) * 100)} % del límite"/>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(aviso)}" y2="${ys(aviso)}" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="3 4"/>
      <text x="${pl + 4}" y="${ys(aviso) - 4}" style="fill:var(--warn)">aviso ${c.aviso_pct || 80} %</text>
      <line x1="${pl}" x2="${W - pr}" y1="${ys(c.limite)}" y2="${ys(c.limite)}" stroke="var(--crit)" stroke-width="1.6" stroke-dasharray="6 4"/>
      <text x="${pl + 4}" y="${ys(c.limite) - 5}" style="fill:var(--crit);font-weight:700">límite ${capFmt(c, c.limite)}</text>
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }

  // Acciones correctivas: las del dataset o, si no hay, unas genéricas según el tipo de cap
  function capCorrectivas(c) {
    if (c.correctivas && c.correctivas.length) return c.correctivas;
    const t = String(c.tipo);
    if (c.estado === 'ok') return [{ titulo: 'Sin acción necesaria: el consumo está dentro del límite', detalle: 'Revisa la tendencia cada semana; el aviso saltará al llegar al umbral configurado.', impacto: 'Preventiva', tipo: 'proceso' }];
    const base = /diario|mensual/i.test(t)
      ? [{ titulo: 'Mover los casos sencillos a un modelo más barato (gpt-5-mini)', detalle: 'Validar primero con un replay what-if que la decisión no cambia.', impacto: 'hasta −80 % coste', tipo: 'modelo', replay: true }, { titulo: 'Reprogramar los lotes no urgentes fuera de la franja de pico', detalle: 'Reparte el consumo a lo largo del día sin tocar la calidad.', impacto: 'Suaviza el pico', tipo: 'proceso' }]
      : [{ titulo: 'Reducir el tamaño del prompt y los adjuntos enviados al modelo', detalle: 'Enviar solo el bloque de reglas del ramo y resumir los adjuntos largos.', impacto: '−25 % tokens', tipo: 'prompt', replay: true }];
    return [...base, { titulo: `Reevaluar el límite de ${c.id}`, detalle: 'Si el consumo es estructural, ajustar el límite con aprobación del Comité IA.', impacto: 'Requiere aprobación', tipo: 'config', aprobacion: true }];
  }
  const CORR_ICON = { modelo: 'cpu', prompt: 'file-text', config: 'sliders-horizontal', proceso: 'workflow' };
  const CORR_LABEL = { modelo: 'Modelo', prompt: 'Prompt', config: 'Configuración', proceso: 'Proceso' };
  const corrEstado = (c, k, x) => (x.estado === 'aplicada' ? 'aplicada' : correctivasEstado[`${c.id}:${k}`] || '');
  function correctivaBotones(c, k, x) {
    const est = corrEstado(c, k, x);
    const replay = x.replay ? `<button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('play')} Simular con replay</button>` : '';
    const traza = x.traza && G.trazas.some((t) => t.id === x.traza) ? `<button class="btn btn-sm" type="button" data-traza="${esc(x.traza)}">${ic('route')} Ver traza</button>` : '';
    const accion = est === 'aplicada' ? `<span class="pill pill-ok">${ic('circle-check')} ${x.auto ? 'Aplicada automáticamente' : 'Aplicada'}</span>` : est === 'pendiente' ? `<span class="pill pill-time">${ic('hourglass')} Pendiente de aprobación</span>` : `<button class="btn btn-sm btn-primary" type="button" data-corr="${esc(c.id)}:${k}">${x.aprobacion ? `${ic('user-check')} Solicitar aprobación` : `${ic('check')} Aplicar`}</button>`;
    return `${replay}${traza}${accion}`;
  }
  function correctivaItem(c, k, x) {
    return `<li class="corr"><span class="ag-ico" style="--c:var(--${x.tipo === 'modelo' ? 'ag-reglas' : x.tipo === 'prompt' ? 'ag-extraccion' : x.tipo === 'config' ? 'time' : 'ag-clasificacion'})">${ic(CORR_ICON[x.tipo] || 'cpu')}</span>
      <div><b>${esc(x.titulo)}</b><small>${conGuardrails(esc(x.detalle))}</small><div class="row small" style="margin-top:.3rem"><span class="pill pill-muted">${esc(CORR_LABEL[x.tipo] || 'Acción')}</span><span class="pill pill-ok">${ic('zap')} ${esc(x.impacto)}</span>${x.ref ? `<span class="pill pill-time">${esc(x.ref)}</span>` : ''}</div></div>
      <div class="row corr-actions">${correctivaBotones(c, k, x)}</div></li>`;
  }
  function aplicarCorrectiva(capId, k) {
    const c = G.caps.find((x) => x.id === capId); if (!c) return;
    const x = capCorrectivas(c)[k]; if (!x) return;
    const nuevo = x.aprobacion ? 'pendiente' : 'aplicada';
    correctivasEstado[`${capId}:${k}`] = nuevo; ssSet('gobierno.correctivas', correctivasEstado);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: nuevo === 'aplicada' ? 'ok' : 'info', agente: (capAgentes(c)[0] || [])[0] || null, titulo: `${nuevo === 'aplicada' ? 'Acción correctiva aplicada' : 'Aprobación solicitada para una acción correctiva'} sobre ${c.id}`, detalle: `${x.titulo}. Impacto esperado: ${x.impacto}.${nuevo === 'pendiente' ? ' Queda pendiente del Comité IA.' : ''}`, usuario: 'Operador (esta sesión)' });
    renderAll();
    if ($('modal-cap').open) abrirModalCap(capId);
  }

  // Tarjeta de FinOps con una acción sugerida por cada cap superado o en aviso
  function renderCorrectivas() {
    const afectados = G.caps.filter((c) => c.estado === 'superado' || c.estado === 'aviso').sort((a, b) => (b.estado === 'superado') - (a.estado === 'superado'));
    $('card-correctivas').hidden = !afectados.length;
    $('correctivas').innerHTML = afectados.map((c) => {
      const lista = capCorrectivas(c); const k = lista.findIndex((x, i) => !corrEstado(c, i, x)); const sup = c.estado === 'superado';
      const x = k >= 0 ? lista[k] : null; const u = Math.round(capUso(c) * 100);
      return `<div class="alert ${sup ? 'crit' : 'warn'}"><span class="ico">${ic(sup ? 'triangle-alert' : 'circle-alert')}</span>
        <div><b>${esc(c.id)} · ${esc(c.tipo)} ${sup ? 'superado' : 'en aviso'}: ${capFmt(c, c.consumo)} de ${capFmt(c, c.limite)} (${u} %)</b><small>${ambitoHtml(c)} · ${x ? `<strong>Acción sugerida:</strong> ${esc(x.titulo)} <span class="pill pill-ok">${esc(x.impacto)}</span>` : 'Todas las acciones sugeridas ya están aplicadas o pendientes de aprobación.'}</small></div>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-sm" type="button" data-cap="${esc(c.id)}">${ic('info')} Ver detalle</button>${x ? `<button class="btn btn-sm btn-primary" type="button" data-corr="${esc(c.id)}:${k}">${x.aprobacion ? ic('user-check') : ic('check')} ${x.aprobacion ? 'Solicitar aprobación' : 'Aplicar'}</button>` : ''}</div></div>`;
    }).join('');
  }

  function abrirModalCap(id) {
    const c = G.caps.find((x) => x.id === id); if (!c) return;
    const u = capUso(c); const [pc, pi, pl] = CAP_ESTADO[c.estado] || CAP_ESTADO.ok;
    const serie = capSerie(c), fechas = fechasSerie();
    const agentes = capAgentes(c);
    const sup = (c.superaciones || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const nSup = sup.filter((s) => s.nivel === 'superado').length, nAv = sup.filter((s) => s.nivel === 'aviso').length;
    const margen = c.limite - c.consumo;
    const relGr = (G.politicas || []).filter((p) => new RegExp(`\\b${c.id}\\b`).test(`${p.descripcion || ''} ${p.condicion} ${p.accion}`));
    const evs = (G.eventos || []).filter((e) => `${e.titulo} ${e.detalle}`.includes(c.id)).slice(0, 6);
    const porAgente = {}; sup.filter((s) => s.nivel === 'superado').forEach((s) => { porAgente[s.agente] = (porAgente[s.agente] || 0) + 1; });
    const barrasSup = Object.entries(porAgente).sort((a, b) => b[1] - a[1]).map(([aid, v]) => [svgAg(aid), v, agColor(aid)]);
    const lista = capCorrectivas(c);
    $('modal-cap-title').innerHTML = `${ic('scale')} <span class="mono">${esc(c.id)}</span> · ${esc(c.tipo)} · ${ambitoHtml(c)} <span class="pill ${pc}">${ic(pi)} ${pl}</span>${c.nuevo ? ` <span class="pill pill-time">${ic('plus')} Creado en esta sesión</span>` : ''}`;
    $('modal-cap-body').innerHTML = `
      <p class="small muted">${esc(c.descripcion || `Límite de ${String(c.tipo).toLowerCase()} para ${c.ambito}.`)} Al superarse: <b>${conGuardrails(esc(c.accion))}</b>.</p>
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('scale')} Límite</span><b>${capFmt(c, c.limite)}</b></div>
        <div class="box"><span class="muted small">${ic('coins')} Consumo actual</span><b>${capFmt(c, c.consumo)}</b></div>
        <div class="box"><span class="muted small">${ic('gauge')} ${margen >= 0 ? 'Margen restante' : 'Exceso sobre el límite'}</span><b style="color:var(--${margen >= 0 ? 'ok' : 'crit'})">${margen >= 0 ? '' : '+'}${capFmt(c, Math.abs(margen))}</b></div>
        <div class="box"><span class="muted small">${ic('triangle-alert')} Superaciones</span><b>${nSup}</b><span class="muted small">${nAv} aviso${nAv === 1 ? '' : 's'}</span></div>
        <div class="box"><span class="muted small">${ic('calendar')} Activo desde</span><b>${c.desde ? new Date(c.desde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}</b><span class="muted small">${esc(c.propietario || 'Gobierno IA')}</span></div>
      </div>
      <div class="cap-hero">
        <div class="box cap-gauge">${gaugeSvg(u, (c.aviso_pct || 80) / 100)}<span class="small muted">Aviso al ${c.aviso_pct || 80} % · acción al 100 %</span></div>
        <div><h3>${/mensual/i.test(c.tipo) ? 'Consumo acumulado del mes' : 'Consumo de los últimos 14 días'} frente al límite</h3>${serie.length ? chartCapSerie(c, serie, fechas) : '<p class="muted small">Sin serie histórica.</p>'}<div class="legend"><span><i style="background:var(--primary)"></i>Dentro</span><span><i style="background:var(--warn)"></i>≥ aviso</span><span><i style="background:var(--crit)"></i>≥ límite</span></div></div>
      </div>
      <div class="two">
        <div><h3>Agentes implicados · reparto del consumo</h3>
          <div class="stackbar" role="img" aria-label="Reparto del consumo por agente">${agentes.map(([aid, v]) => `<i style="flex:${v};background:${agColor(aid)}" data-tip="${esc(agNombre(aid))}: ${Math.round(v * 100)} %"></i>`).join('')}</div>
          <ul class="rel-list">${agentes.map(([aid, v]) => { const a = AG[aid]; const est = estadoAgente(a); return `<li>${agTag(aid)}<span class="meter" style="--c:${agColor(aid)}"><i style="width:${v * 100}%"></i></span><b class="tnum">${Math.round(v * 100)} %</b>${lvlBadge(a.nivel)}<span class="pill ${(ESTADO[est] || ESTADO.activo)[0]}">${(ESTADO[est] || ESTADO.activo)[2].replace(/ \(.*\)/, '')}</span><button class="btn btn-sm" type="button" data-ver-agente="${esc(aid)}">Ver agente</button></li>`; }).join('')}</ul>
        </div>
        <div><h3>Relación con guardrails y recomendaciones</h3>
          ${relGr.length ? `<ul class="rel-list simple">${relGr.map((p) => `<li>${grRef(p.id)} <span class="small">${esc(p.condicion)} → ${esc(p.accion)}</span></li>`).join('')}</ul>` : '<p class="muted small">Ningún guardrail enlazado: la acción al superar es la propia del cap.</p>'}
          ${(G.recomendaciones || []).filter((r) => lista.some((x) => x.ref === r.id)).map((r) => `<div class="alert ${r.sev}" style="margin-top:.5rem"><span class="ico">${ic('lightbulb')}</span><div><b>${esc(r.id)} · ${conGuardrails(esc(r.titulo))}</b></div></div>`).join('')}
        </div>
      </div>
      <div><h3>Histórico de superaciones y avisos${c.nuevo ? ' · cap nuevo, sin histórico todavía' : ''}</h3>
        ${sup.length ? `<div class="sup-grid"><div>${barrasSup.length ? `<span class="muted small">Superaciones por agente</span>${hbars(barrasSup, { pl: 170, aria: 'Superaciones por agente' })}` : '<p class="muted small">Solo ha habido avisos: ningún agente ha llegado a superar el cap.</p>'}</div>
        <div class="tw tabla-compacta"><table><thead><tr><th>Fecha</th><th>Agente</th><th>Valor</th><th>Acción automática</th><th>Duración</th><th>Estado</th></tr></thead><tbody>${sup.map((s) => `<tr><td class="tnum">${fechaHora(s.fecha)}</td><td>${agTag(s.agente)}</td><td class="tnum"><b>${capFmt(c, s.valor)}</b> <span class="muted small">${Math.round((s.valor / c.limite) * 100)} %</span></td><td class="wrap">${conGuardrails(esc(s.accion))}${s.traza && G.trazas.some((t) => t.id === s.traza) ? ` <button class="btn btn-sm" type="button" data-traza="${esc(s.traza)}">${ic('route')} ${esc(s.traza)}</button>` : ''}</td><td>${esc(s.duracion)}</td><td><span class="pill ${s.estado === 'resuelto' ? 'pill-ok' : 'pill-warn'}">${esc(s.estado)}</span></td></tr>`).join('')}</tbody></table></div></div>` : '<p class="muted small">Este cap no se ha superado ni ha saltado su aviso en el periodo.</p>'}
      </div>
      <div><h3>${c.estado === 'ok' ? 'Recomendaciones preventivas' : 'Acción correctiva sugerida'}</h3><ul class="corr-list">${lista.map((x, k) => correctivaItem(c, k, x)).join('')}</ul></div>
      ${evs.length ? `<div><h3>Actividad relacionada en el histórico</h3><ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}`;
    abrir('modal-cap');
    animar($('modal-cap-body'));
  }

  // ---- Nuevo cap -----------------------------------------------------------
  const TIPOS_CAP = [
    { v: 'Coste diario', u: '€', paso: 0.5 }, { v: 'Coste mensual', u: '€', paso: 10 }, { v: 'Coste por traza', u: '€', paso: 0.005 },
    { v: 'Tokens por traza', u: 'tok', paso: 100 }, { v: 'Tokens de razonamiento por traza', u: 'tok', paso: 50 }, { v: 'Llamadas / minuto', u: 'req', paso: 5 },
  ];
  const ACCIONES_CAP = ['Solo alertar', 'Alertar y marcar la traza', 'Degradar a gpt-5-mini hasta las 00:00', 'Pausar lotes no urgentes', 'Encolar (rate limit interno)', 'Escalar a humano'];
  const BASE_TRAZA = [0.031, 0.034, 0.026, 0.024, 0.036, 0.038, 0.037, 0.041, 0.040, 0.027, 0.028, 0.044, 0.048, 0.062];
  const BASE_RAZ = [1210, 1280, 980, 940, 1350, 1420, 1390, 1560, 1530, 1010, 1030, 1740, 1890, 2610];
  const BASE_REQ = [58, 62, 31, 29, 66, 71, 69, 78, 76, 34, 36, 84, 118, 74];
  // Consumo base estimado del ámbito y tipo elegidos (para la vista previa y el consumo inicial del cap nuevo)
  function capBase(ambito, tipo) {
    const dias = G.diario.slice(-14), ag = G.agentes.slice(0, 4), ai = ag.findIndex((a) => a.nombre === ambito);
    const peso = ai >= 0 ? [0.05, 0.15, 0.45, 1][ai] : 1, cuota = ai >= 0 ? [0.08, 0.2, 0.38, 0.34][ai] : 1;
    const tot = (d) => (ai >= 0 ? d[2][ai] || 0 : costeDia(d));
    let serie;
    if (/mensual/i.test(tipo)) { const dia = dias.map(tot); let acc = dia.reduce((a, b) => a + b, 0) * 0.3; serie = dia.map((v) => (acc += v)); }
    else if (/diario/i.test(tipo)) serie = dias.map(tot);
    else if (/razonamiento/i.test(tipo)) serie = BASE_RAZ.map((v) => v * (ai >= 0 ? (ai === 3 ? 1 : ai === 2 ? 0.35 : 0.05) : 1));
    else if (/Tokens por traza/i.test(tipo)) serie = BASE_RAZ.map((v) => v * 3.4 * (ai >= 0 ? (ai === 3 ? 1 : ai === 2 ? 0.55 : 0.12) : 1));
    else if (/traza/i.test(tipo)) serie = BASE_TRAZA.map((v) => v * (ai >= 0 ? peso : 1));
    else serie = BASE_REQ.map((v) => Math.round(v * cuota));
    return { serie, consumo: serie[serie.length - 1] };
  }
  const nice = (v, u) => (u === '€' ? (v < 0.1 ? Math.ceil(v * 200) / 200 : v < 1 ? Math.ceil(v * 100) / 100 : v < 10 ? Math.ceil(v * 2) / 2 : Math.ceil(v)) : Math.ceil(v / 10) * 10);

  function abrirModalCapNuevo() {
    const ambitos = ['Global', ...G.agentes.slice(0, 4).map((a) => a.nombre), 'Por mensaje'];
    $('modal-cap-nuevo-title').innerHTML = `${ic('plus')} Nuevo cap de FinOps`;
    $('modal-cap-nuevo-body').innerHTML = `
      <p class="small muted">Un cap limita el gasto o el consumo de IA. Elige a qué se aplica, qué se mide y qué debe pasar al superarlo; la vista previa estima cómo habría funcionado en los últimos 14 días. Se guarda en esta sesión y aparece como uno más en la lista.</p>
      <div class="form-grid">
        <form id="form-cap" class="form" autocomplete="off" novalidate>
          <label class="f">Ámbito<select id="nc-ambito">${ambitos.map((a) => `<option value="${esc(a)}">${agenteDeAmbito(a) ? 'Agente de ' : ''}${esc(a)}</option>`).join('')}</select></label>
          <label class="f">Qué se mide<select id="nc-tipo">${TIPOS_CAP.map((t) => `<option>${esc(t.v)}</option>`).join('')}</select></label>
          <label class="f">Límite<span class="input-unit"><input id="nc-limite" type="number" min="0" step="any" inputmode="decimal" aria-describedby="nc-err"><b id="nc-unidad">€</b></span></label>
          <label class="f"><span>Umbral de aviso: <b id="nc-aviso-v" class="tnum">80 %</b> del límite</span><input id="nc-aviso" type="range" min="50" max="95" step="5" value="80"></label>
          <label class="f">Al superar el límite<select id="nc-accion">${ACCIONES_CAP.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>
          <label class="f">Notificar a<select id="nc-notif"><option>FinOps</option><option>Gobierno IA</option><option>Comité IA</option><option>Responsable del agente</option></select></label>
          <label class="f" style="grid-column:1/-1">Descripción (opcional)<input id="nc-desc" type="text" maxlength="140" placeholder="Para qué sirve este cap"></label>
          <p id="nc-err" class="form-err" role="alert" hidden></p>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn" type="button" data-close="modal-cap-nuevo">Cancelar</button><button class="btn btn-primary" type="submit">${ic('check')} Crear cap</button></div>
        </form>
        <div class="box preview" id="nc-preview" aria-live="polite"></div>
      </div>`;
    $('nc-limite').value = '';
    sugerirLimiteCap();
    actualizarPreviewCap();
    abrir('modal-cap-nuevo');
    $('nc-ambito').focus();
  }
  // Propone un límite cercano al consumo habitual para que la vista previa sea significativa
  function sugerirLimiteCap() {
    const t = TIPOS_CAP.find((x) => x.v === $('nc-tipo').value); const b = capBase($('nc-ambito').value, t.v);
    $('nc-unidad').textContent = t.u; $('nc-limite').step = t.paso;
    $('nc-limite').value = String(nice(Math.max(...b.serie) * 1.12, t.u));
  }
  function leerCapNuevo() {
    const t = TIPOS_CAP.find((x) => x.v === $('nc-tipo').value); const ambito = $('nc-ambito').value;
    const limite = parseFloat(String($('nc-limite').value).replace(',', '.'));
    return { t, ambito, limite, aviso: Number($('nc-aviso').value), base: capBase(ambito, t.v) };
  }
  function actualizarPreviewCap() {
    const { t, ambito, limite, aviso, base } = leerCapNuevo();
    $('nc-aviso-v').textContent = `${aviso} %`;
    const ok = Number.isFinite(limite) && limite > 0;
    const c = { id: 'Nuevo', ambito, tipo: t.v, unidad: t.u, limite: ok ? limite : 1, consumo: base.consumo, aviso_pct: aviso };
    const u = ok ? base.consumo / limite : 0; const dias = ok ? base.serie.filter((v) => v >= limite).length : 0; const avisos = ok ? base.serie.filter((v) => v >= limite * aviso / 100 && v < limite).length : 0;
    const est = u >= 1 ? ['crit', 'superado'] : u >= aviso / 100 ? ['warn', 'en aviso'] : ['ok', 'dentro del límite'];
    const dup = G.caps.find((x) => x.ambito === ambito && x.tipo === t.v);
    $('nc-preview').innerHTML = `<h3>Vista previa</h3>
      ${ok ? `<div class="cap-gauge">${gaugeSvg(u, aviso / 100)}</div>
        <p class="small"><span class="pill pill-${est[0]}">${est[1]}</span> Con este límite, el consumo actual (${capFmt(c, base.consumo)}) estaría al <b>${Math.round(u * 100)} %</b>. En los últimos 14 días habría superado el cap <b>${dias}</b> ${dias === 1 ? 'vez' : 'veces'} y saltado el aviso ${avisos} ${avisos === 1 ? 'vez' : 'veces'}.</p>
        ${chartCapSerie(c, base.serie, fechasSerie(), 170)}` : '<p class="muted small">Introduce un límite mayor que 0 para ver la vista previa.</p>'}
      ${dup ? `<p class="small" style="margin-top:.5rem">${ic('info')} Ya existe <b>${esc(dup.id)}</b> con el mismo ámbito y tipo: los dos coexistirán y se aplicará el más restrictivo.</p>` : ''}`;
  }
  function guardarCapNuevo() {
    const { t, ambito, limite, aviso, base } = leerCapNuevo(); const err = $('nc-err');
    if (!Number.isFinite(limite) || limite <= 0) { err.textContent = 'Indica un límite numérico mayor que 0.'; err.hidden = false; $('nc-limite').focus(); return; }
    err.hidden = true;
    const id = siguienteId('CAP', G.caps);
    const c = { id, ambito, tipo: t.v, limite, unidad: t.u, consumo: Math.round(base.consumo * 1000) / 1000, accion: $('nc-accion').value, aviso_pct: aviso, notificar: $('nc-notif').value, descripcion: $('nc-desc').value.trim() || undefined, desde: new Date().toISOString().slice(0, 10), propietario: $('nc-notif').value, serie: base.serie, superaciones: [], nuevo: true };
    c.estado = capEstadoDe(c);
    capsNuevos.push(c); ssSet('gobierno.caps_nuevos', capsNuevos);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente: (agenteDeAmbito(ambito) || {}).id || null, titulo: `Nuevo cap ${id}: ${t.v} · ${ambito} · ${capFmt(c, limite)}`, detalle: `Aviso al ${aviso} % · al superarlo: ${c.accion} · notifica a ${c.notificar}.`, usuario: 'Operador (esta sesión)' });
    $('modal-cap-nuevo').close();
    goto('finops'); renderAll();
    const fila = document.querySelector(`#caps tr[data-cap="${id}"]`);
    if (fila) { fila.scrollIntoView({ block: 'center', behavior: 'smooth' }); fila.classList.add('is-new'); setTimeout(() => fila.classList.remove('is-new'), 2600); }
  }

  // ---------------------------------------------------------------------------
  // Guardrails: ficha modal ampliada y alta de un guardrail nuevo
  // ---------------------------------------------------------------------------
  const CANALES_ORDEN = ['email', 'web', 'chat', 'telefono', 'whatsapp'];
  const SEV_COLOR = { humano: 'var(--review)', degradar: 'var(--warn)', marcar: 'var(--time)' };

  // Disparos por día con etiquetas de valor, media y pico (versión ampliada del minigráfico de la tabla)
  function chartDisparos(p, fechas) {
    const D = p.disparos_dia || [], n = D.length || 1, W = 760, H = 215, pl = 36, pr = 16, pt = 22, pb = 28;
    const max = Math.max(1, ...D), ymax = Math.ceil(max * 1.2), media = D.reduce((a, b) => a + b, 0) / n;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb), bw = Math.min(30, ((W - pl - pr) / n) * 0.64);
    const pico = D.indexOf(max); const c = agColor(p.agente);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Disparos de ${esc(p.id)} por día">
      <g class="grid">${[0, 0.5, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * f)}" y2="${ys(ymax * f)}"/><text x="${pl - 6}" y="${ys(ymax * f) + 4}" text-anchor="end">${Math.round(ymax * f)}</text>`).join('')}</g>
      ${D.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${c}" opacity="${i === n - 1 ? 1 : 0.7}" data-tip="${fecha(fechas[i])}: ${v} disparo${v === 1 ? '' : 's'}${i === pico && max > 0 ? ' · pico del periodo' : ''}"/><text x="${xs(i)}" y="${ys(v) - 5}" text-anchor="middle" style="fill:var(--text);font-weight:${i === pico && max > 0 ? 800 : 500}">${v}</text>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(media)}" y2="${ys(media)}" stroke="var(--time)" stroke-width="1.4" stroke-dasharray="5 4"/>
      <text x="${pl + 4}" y="${ys(media) - 5}" style="fill:var(--time);font-weight:700">media ${media.toFixed(1).replace('.', ',')} / día</text>
      ${fechas.map((d, i) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`).join('')}
    </svg>`;
  }
  // Disparos por hora del día (24 barras)
  function chartHoras(horas, color) {
    const W = 760, H = 150, pl = 30, pr = 16, pt = 12, pb = 24, max = Math.max(1, ...horas);
    const bw = (W - pl - pr) / 24, ys = (v) => pt + (1 - v / max) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Disparos por hora del día">
      ${horas.map((v, h) => `<rect x="${pl + h * bw + 2}" y="${ys(v)}" width="${bw - 4}" height="${Math.max(0, ys(0) - ys(v))}" rx="2" fill="${color}" opacity="${0.35 + 0.65 * (v / max)}" data-tip="${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59 · ${v} disparo${v === 1 ? '' : 's'}"/>${h % 3 === 0 ? `<text x="${pl + h * bw + bw / 2}" y="${H - 7}" text-anchor="middle">${String(h).padStart(2, '0')}h</text>` : ''}`).join('')}
    </svg>`;
  }

  function abrirModalGr(id) {
    const p = G.politicas.find((x) => x.id === id); if (!p) return;
    const activa = politicaActiva(p); const total = p.disparos || 0, D = p.disparos_dia || [];
    const fechas = fechasSerie(); const r = rng(`gr-${p.id}`);
    const media = D.length ? total / D.length : 0; const max = Math.max(0, ...D);
    const totalEscalados = G.politicas.filter((x) => x.severidad === 'humano').reduce((a, x) => a + (x.disparos || 0), 0);
    const compartido = p.severidad === 'humano' && totalEscalados ? Math.round((total / totalEscalados) * 100) : null;
    const override = total ? (1.5 + r() * 7).toFixed(1).replace('.', ',') : null; const resolucion = p.severidad === 'humano' && total ? Math.round(4 + r() * 18) : null;
    const canalPesos = p.id === 'G-09' ? [0, 0, 0, 1, 0] : [0.3, 0.2, 0.2, 0.1, 0.2];
    const canales = total ? distribuir(total, canalPesos.map((v) => v || 0.0001), `${p.id}c`).map((v, i) => [canalInfo(CANALES_ORDEN[i])[1], p.id === 'G-09' && i !== 3 ? 0 : v, 'var(--primary)']) : [];
    const ramoPesos = p.id === 'G-04' ? [0.55, 0.15, 0.3] : p.id === 'G-02' ? [0.4, 0.4, 0.2] : [0.4, 0.33, 0.27];
    const ramos = total ? distribuir(total, ramoPesos, `${p.id}r`).map((v, i) => [['Auto', 'Hogar', 'Salud'][i], v, ['var(--auto)', 'var(--hogar)', 'var(--salud)'][i]]) : [];
    const horasPeso = Array.from({ length: 24 }, (_, h) => (h < 7 ? 0.25 : h < 9 ? 1 : h < 14 ? 2.3 : h < 16 ? 1.3 : h < 20 ? 1.9 : 0.6));
    const horas = total ? distribuir(total, horasPeso, `${p.id}h`) : horasPeso.map(() => 0);
    const relCaps = [...new Set(`${p.descripcion || ''} ${p.accion} ${p.condicion}`.match(/CAP-\d{2}/g) || [])];
    const evs = (G.eventos || []).filter((e) => `${e.titulo} ${e.detalle}`.includes(p.id)).slice(0, 6);
    const ult = (p.ultimos || []).slice().sort((a, b) => b[0].localeCompare(a[0]));
    $('modal-gr-title').innerHTML = `${ic('shield-check')} <span class="mono">${esc(p.id)}</span> · ${esc(p.condicion)} <span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span> <span class="pill ${activa ? 'pill-ok' : 'pill-muted'}">${activa ? 'Activo' : 'Inactivo'}</span>${p.nuevo ? ` <span class="pill pill-time">${ic('plus')} Creado en esta sesión</span>` : ''}`;
    $('modal-gr-body').innerHTML = `
      <p class="small muted">${conGuardrails(esc(p.descripcion || 'Sin descripción.'))}</p>
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('bell')} Disparos en 14 días</span><b>${num(total)}</b></div>
        <div class="box"><span class="muted small">${ic('chart-column')} Media por día</span><b>${media.toFixed(1).replace('.', ',')}</b></div>
        <div class="box"><span class="muted small">${ic('gauge')} Pico diario</span><b>${max}</b>${max ? `<span class="muted small">${fecha(fechas[D.indexOf(max)])}</span>` : ''}</div>
        ${compartido != null ? `<div class="box"><span class="muted small">${ic('user-check')} Parte de los escalados por guardrail</span><b>${compartido} %</b></div>` : ''}
        ${override ? `<div class="box"><span class="muted small">${ic('repeat')} Override humano tras el disparo</span><b>${override} %</b></div>` : ''}
        ${resolucion ? `<div class="box"><span class="muted small">${ic('timer')} Resolución humana (mediana)</span><b>${resolucion} min</b></div>` : ''}
      </div>
      <div><h3>Disparos por día · últimos ${D.length} días</h3>${total ? chartDisparos(p, fechas) : `<div class="box"><span class="muted">${ic('info')} Este guardrail todavía no ha disparado${p.nuevo ? ': se acaba de crear' : ''}.</span></div>`}</div>
      ${total ? `<div class="two"><div><h3>Disparos por canal</h3>${hbars(canales, { pl: 130, aria: 'Disparos por canal' })}</div><div><h3>Disparos por ramo</h3>${hbars(ramos, { pl: 80, aria: 'Disparos por ramo' })}</div></div>
      <div><h3>Disparos por hora del día</h3>${chartHoras(horas, agColor(p.agente))}<p class="muted small">Distribuciones estimadas para la demo a partir del total de disparos.</p></div>` : ''}
      <div class="two">
        <div><h3>Condición y acción</h3><dl class="kv"><dt>Agente</dt><dd>${agTag(p.agente)} <button class="btn btn-sm" type="button" data-ver-agente="${esc(p.agente)}">Ver agente</button></dd><dt>Condición</dt><dd>${esc(p.condicion)}</dd><dt>Acción</dt><dd>${esc(p.accion)}</dd><dt>Efecto</dt><dd><span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span></dd><dt>Estado</dt><dd><label class="switch${activa ? '' : ' off'}" data-guardrail="${esc(p.id)}" data-reabrir="${esc(p.id)}" style="margin-left:0"><i></i>${activa ? 'Activo' : 'Inactivo'}</label> <span class="muted small">Se registra en el histórico</span></dd></dl></div>
        <div><h3>Relaciones</h3>${relCaps.length ? `<p class="small">Caps vinculados: ${relCaps.map(grRef).join(' · ')}</p>` : ''}${evs.length ? `<ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${esc(e.usuario)}</small></div></li>`).join('')}</ul>` : '<p class="muted small">Sin eventos en el histórico que mencionen este guardrail.</p>'}</div>
      </div>
      <div><h3>Últimos disparos</h3>${ult.length ? `<div class="tw"><table><thead><tr><th>Fecha</th><th>Traza</th><th>Resultado</th></tr></thead><tbody>${ult.map(([f, traza, res]) => { const tid = (traza.match(/TRZ-[0-9A-Z]+/) || [])[0]; const existe = tid && G.trazas.some((t) => t.id === tid); return `<tr><td class="tnum">${fechaHora(f)}</td><td class="mono">${existe ? `<button class="btn btn-sm" type="button" data-traza="${esc(tid)}">${ic('route')} ${esc(traza)}</button>` : esc(traza)}</td><td>${esc(res)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small">Sin disparos registrados.</p>'}</div>`;
    abrir('modal-gr');
    animar($('modal-gr-body'));
  }

  // ---- Nuevo guardrail -----------------------------------------------------
  const PLANTILLAS_GR = [
    { id: 'conf', label: 'Confianza de la decisión inferior a…', unidad: '', def: 0.85, paso: 0.01, cond: (v) => `Confianza de la decisión < ${String(v).replace('.', ',')}`, tasa: (v) => 0.0004 + (v - 0.7) * 0.016 },
    { id: 'imp', label: 'Importe estimado superior a…', unidad: '€', def: 6000, paso: 500, cond: (v) => `Importe > ${num(v)} €`, tasa: (v) => 0.0065 * (6000 / Math.max(v, 100)) ** 0.8 },
    { id: 'raz', label: 'Tokens de razonamiento por traza superiores a…', unidad: 'tok', def: 2000, paso: 100, cond: (v) => `Tokens de razonamiento > ${num(v)}`, tasa: (v) => 0.0025 * (2000 / Math.max(v, 100)) ** 1.2 },
    { id: 'coste', label: 'Coste de la traza superior a…', unidad: '€', def: 0.05, paso: 0.005, cond: (v) => `Coste de la traza > ${String(v).replace('.', ',')} €`, tasa: (v) => 0.003 * (0.05 / Math.max(v, 0.005)) ** 1.1 },
    { id: 'stt', label: 'Confianza de la transcripción (STT) inferior a…', unidad: '', def: 0.7, paso: 0.05, cond: (v) => `Transcripción telefónica con confianza STT < ${String(v).replace('.', ',')}`, tasa: (v) => 0.0005 + (v - 0.5) * 0.004 },
    { id: 'les', label: 'Hay lesionados', fijo: 'Lesionados = sí', tasa: () => 0.0038 },
    { id: 'ind', label: 'Ramo indeterminado', fijo: 'Ramo = Indeterminado', tasa: () => 0.0013 },
    { id: 'dat', label: 'Faltan datos clave (póliza y fecha)', fijo: 'Nº de póliza y fecha del hecho nulos a la vez', tasa: () => 0.0052 },
    { id: 'cus', label: 'Condición personalizada…', custom: true, tasa: () => 0.002 },
  ];
  const ACCIONES_GR = [
    { v: 'Escalar a humano', sev: 'humano' }, { v: 'Escalar a humano + pedir datos al cliente', sev: 'humano' },
    { v: 'Degradar modelo a gpt-5-mini hasta las 00:00', sev: 'degradar' }, { v: 'Fallback a motor local + marcar traza', sev: 'marcar' }, { v: 'Marcar la traza para revisión', sev: 'marcar' },
  ];

  function abrirModalGrNuevo() {
    $('modal-gr-nuevo-title').innerHTML = `${ic('plus')} Nuevo guardrail`;
    $('modal-gr-nuevo-body').innerHTML = `
      <p class="small muted">Un guardrail limita la autonomía de un agente: cuando se cumple su condición se ejecuta la acción elegida (escalar a una persona, degradar el modelo o marcar la traza). Se guarda en esta sesión y se añade al final de la lista.</p>
      <div class="form-grid">
        <form id="form-gr" class="form" autocomplete="off" novalidate>
          <label class="f">Agente al que aplica<select id="ng-agente">${G.agentes.slice(0, 4).map((a) => `<option value="${esc(a.id)}"${a.id === 'reglas' ? ' selected' : ''}>Agente de ${esc(a.nombre)}</option>`).join('')}</select></label>
          <label class="f">Cuándo se dispara<select id="ng-plantilla">${PLANTILLAS_GR.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select></label>
          <label class="f" id="ng-umbral-w">Umbral<span class="input-unit"><input id="ng-umbral" type="number" min="0" step="any" inputmode="decimal"><b id="ng-unidad"></b></span></label>
          <label class="f" id="ng-cond-w" style="grid-column:1/-1" hidden>Condición<input id="ng-cond" type="text" maxlength="120" placeholder="Ej. Canal = Teléfono y importe > 1.000 €"></label>
          <label class="f" style="grid-column:1/-1">Qué hace cuando se dispara<select id="ng-accion">${ACCIONES_GR.map((a) => `<option>${esc(a.v)}</option>`).join('')}</select></label>
          <label class="f" style="grid-column:1/-1">Descripción (opcional)<input id="ng-desc" type="text" maxlength="200" placeholder="Por qué existe este guardrail"></label>
          <label class="inline-check"><input id="ng-activa" type="checkbox" checked> Activarlo al crearlo</label>
          <p id="ng-err" class="form-err" role="alert" hidden></p>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn" type="button" data-close="modal-gr-nuevo">Cancelar</button><button class="btn btn-primary" type="submit">${ic('check')} Crear guardrail</button></div>
        </form>
        <div class="box preview" id="ng-preview" aria-live="polite"></div>
      </div>`;
    ajustarPlantillaGr(true);
    abrir('modal-gr-nuevo');
    $('ng-plantilla').focus();
  }
  function ajustarPlantillaGr(reset) {
    const t = PLANTILLAS_GR.find((x) => x.id === $('ng-plantilla').value);
    const conUmbral = t.def != null;
    $('ng-umbral-w').hidden = !conUmbral; $('ng-cond-w').hidden = !t.custom;
    if (conUmbral && reset) { $('ng-umbral').value = String(t.def); $('ng-umbral').step = t.paso; $('ng-unidad').textContent = t.unidad || ''; }
    if (reset) { const a = t.id === 'dat' ? 1 : t.id === 'cus' ? 0 : 0; $('ng-accion').selectedIndex = a; }
    actualizarPreviewGr();
  }
  function leerGrNuevo() {
    const t = PLANTILLAS_GR.find((x) => x.id === $('ng-plantilla').value);
    const umbral = parseFloat(String($('ng-umbral').value).replace(',', '.'));
    const accion = ACCIONES_GR[$('ng-accion').selectedIndex] || ACCIONES_GR[0];
    const condicion = t.custom ? $('ng-cond').value.trim() : t.fijo || (Number.isFinite(umbral) ? t.cond(umbral) : '');
    return { t, umbral, accion, condicion, agente: $('ng-agente').value };
  }
  function actualizarPreviewGr() {
    const { t, umbral, accion, condicion, agente } = leerGrNuevo();
    const msgs = G.diario.slice(-14).reduce((a, d) => a + d[1], 0); const valido = condicion && (!t.def || (Number.isFinite(umbral) && umbral > 0));
    const n = valido ? Math.max(1, Math.round(t.tasa(umbral) * msgs)) : 0; const pctMsgs = valido ? (n / msgs) * 100 : 0;
    $('ng-preview').innerHTML = `<h3>Así quedará en la lista</h3>
      <div class="box" style="background:var(--surface)"><div class="row" style="justify-content:space-between"><b class="mono">${esc(siguienteId('G', G.politicas))}</b><span class="sev sev-${accion.sev}">${SEV[accion.sev]}</span></div><div style="margin:.4rem 0">${agTag(agente)}</div><div><b>${condicion ? esc(condicion) : '<span class="muted">Escribe la condición…</span>'}</b></div><div class="small muted" style="margin-top:.2rem">→ ${esc(accion.v)}</div></div>
      <h3 style="margin-top:.8rem">Impacto estimado</h3>
      ${valido ? `<div class="kpi-mini"><div class="box"><span class="muted small">Disparos en 14 días</span><b>≈ ${num(n)}</b></div><div class="box"><span class="muted small">Mensajes afectados</span><b>${pctMsgs.toFixed(pctMsgs < 1 ? 2 : 1).replace('.', ',')} %</b></div></div>
        <p class="small muted" style="margin-top:.5rem">Estimación orientativa sobre ${num(msgs)} mensajes. ${accion.sev === 'humano' ? `Cada disparo envía el caso a una persona: ≈ ${num(n)} tramitaciones manuales más.` : accion.sev === 'degradar' ? 'Los casos disparados se procesan con un modelo más barato.' : 'Los casos disparados se procesan y quedan marcados para revisión.'} Compruébalo con un replay antes de activarlo en producción.</p>` : '<p class="muted small">Completa la condición para estimar el impacto.</p>'}`;
  }
  function guardarGrNuevo() {
    const { t, umbral, accion, condicion, agente } = leerGrNuevo(); const err = $('ng-err');
    if (t.custom && !condicion) { err.textContent = 'Escribe la condición del guardrail.'; err.hidden = false; $('ng-cond').focus(); return; }
    if (t.def != null && (!Number.isFinite(umbral) || umbral <= 0)) { err.textContent = 'Indica un umbral numérico mayor que 0.'; err.hidden = false; $('ng-umbral').focus(); return; }
    err.hidden = true;
    const id = siguienteId('G', G.politicas);
    const p = { id, agente, condicion, accion: accion.v, severidad: accion.sev, disparos: 0, activa: $('ng-activa').checked, descripcion: $('ng-desc').value.trim() || `Guardrail creado en esta sesión: ${condicion} → ${accion.v}.`, disparos_dia: Array(14).fill(0), ultimos: [], nuevo: true };
    grNuevos.push(p); ssSet('gobierno.gr_nuevos', grNuevos);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente, titulo: `Nuevo guardrail ${id}: ${condicion}`, detalle: `${accion.v}. ${p.activa ? 'Activo desde su creación.' : 'Creado inactivo.'}`, usuario: 'Operador (esta sesión)' });
    $('modal-gr-nuevo').close();
    goto('guardrails'); renderAll();
    const fila = document.querySelector(`#policies tr[data-gr="${id}"]`);
    if (fila) { fila.scrollIntoView({ block: 'center', behavior: 'smooth' }); fila.classList.add('is-new'); setTimeout(() => fila.classList.remove('is-new'), 2600); }
  }

  // ---------------------------------------------------------------------------
  // Autonomía · auditoría: registro completo de un cambio de nivel
  // ---------------------------------------------------------------------------
  const CRITERIOS_NIVEL = {
    1: ['Piloto con muestra mínima (≥ 500 casos)', 'Una persona confirma cada caso', 'Métricas de base registradas'],
    2: ['Precisión ≥ 97 % en el piloto', 'Guardrails definidos y activos', 'Tasa de override inferior al 5 %', 'Escalado a humano con la ficha preparada'],
    3: ['Precisión ≥ 99 % en 7 días', 'Override por debajo del objetivo (3 %)', 'Sin incidentes críticos en 14 días', 'Auditoría a posteriori definida', 'Cap de coste configurado'],
  };
  const CRITERIOS_BAJADA = ['Tasa de override por encima del objetivo (3 %)', 'Incidente o aprobaciones indebidas', 'Revisión del Comité IA'];
  const CONSECUENCIA = { sube: 'Menos casos pasan por una persona: el agente decide por sí mismo dentro de sus guardrails y se audita a posteriori.', baja: 'Más casos pasan por una persona: sube la supervisión hasta recuperar las métricas objetivo.', igual: 'El nivel de autonomía no cambia; se deja constancia del cambio de configuración asociado.' };

  function chartNivelesAgente(mismos, sel) {
    const W = 640, H = 200, pl = 92, pr = 20, pt = 14, pb = 28;
    const t0 = new Date(mismos[0][0].fecha).getTime(), t1 = Math.max(new Date(hoyIso()).getTime(), new Date(mismos[mismos.length - 1][0].fecha).getTime() + 864e5);
    const xs = (iso) => pl + ((new Date(iso).getTime() - t0) / (t1 - t0 || 1)) * (W - pl - pr), ys = (n) => pt + (1 - n / 3) * (H - pt - pb);
    let d = `M${xs(mismos[0][0].fecha)},${ys(mismos[0][0].de)}`; let nivel = mismos[0][0].de;
    mismos.forEach(([c]) => { d += ` L${xs(c.fecha)},${ys(nivel)} L${xs(c.fecha)},${ys(c.a)}`; nivel = c.a; });
    d += ` L${xs(new Date(t1).toISOString())},${ys(nivel)}`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del nivel de autonomía del agente">
      <g class="grid">${G.niveles.map((l) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(l.n)}" y2="${ys(l.n)}"/><text x="${pl - 8}" y="${ys(l.n) + 4}" text-anchor="end">L${l.n} ${esc(l.nombre)}</text>`).join('')}</g>
      <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linejoin="round"/>
      ${mismos.map(([c, i]) => `<circle cx="${xs(c.fecha)}" cy="${ys(c.a)}" r="${i === sel ? 8 : 5}" fill="${c.de === c.a ? 'var(--surface)' : c.a > c.de ? 'var(--ok)' : 'var(--crit)'}" stroke="${i === sel ? 'var(--text)' : 'var(--primary)'}" stroke-width="${i === sel ? 3 : 1.6}" data-cambio="${i}" style="cursor:pointer" data-tip="${fechaHora(c.fecha)} · ${c.de === c.a ? `sin cambio (L${c.a})` : `L${c.de} → L${c.a}`} · ${esc(c.usuario)}"/>`).join('')}
      ${[0, 0.25, 0.5, 0.75, 1].map((f) => { const iso = new Date(t0 + (t1 - t0) * f).toISOString(); return `<text x="${xs(iso)}" y="${H - 8}" text-anchor="middle">${fecha(iso)}</text>`; }).join('')}
    </svg>`;
  }

  function abrirModalCambio(idx) {
    const lista = G.cambios_autonomia || []; const c = lista[idx]; if (!c) return;
    const a = AG[c.agente]; if (!a) return;
    const asc = lista.map((x, i) => [x, i]).sort((p, q) => p[0].fecha.localeCompare(q[0].fecha) || p[1] - q[1]);
    const orden = asc.findIndex(([, i]) => i === idx) + 1;
    const mismos = asc.filter(([x]) => x.agente === c.agente); const pos = mismos.findIndex(([, i]) => i === idx);
    const ant = mismos[pos - 1], sig = mismos[pos + 1];
    const tipo = c.de === c.a ? ['pill-muted', 'sliders-horizontal', 'Cambio de configuración'] : c.a > c.de ? ['pill-ok', 'zap', 'Promoción'] : ['pill-crit', 'undo-2', 'Degradación'];
    const dir = c.de === c.a ? 'igual' : c.a > c.de ? 'sube' : 'baja';
    const auditId = `AUD-${c.fecha.slice(0, 10).replace(/-/g, '')}-${String(orden).padStart(2, '0')}`;
    const rol = /Comité/.test(c.usuario) ? 'Órgano colegiado · acta del Comité IA' : /Sistema/.test(c.usuario) ? 'Automático · guardrail del sistema' : /Gobierno/.test(c.usuario) ? 'Equipo de Gobierno IA' : 'Equipo técnico';
    const vigente = sig ? `${diasEntre(c.fecha, sig[0].fecha)} día${diasEntre(c.fecha, sig[0].fecha) === 1 ? '' : 's'} (hasta ${fechaHora(sig[0].fecha)})` : `${diasEntre(c.fecha, hoyIso())} días hasta hoy`;
    const hist = [...(a.historial || [])].sort((x, y) => x.fecha.localeCompare(y.fecha));
    const vigenteEn = (tipoH) => { const hs = hist.filter((h) => h.tipo === tipoH); const antes = hs.filter((h) => h.fecha <= c.fecha); return antes.length ? antes[antes.length - 1].a : hs.length ? hs[0].de : '—'; };
    const modelo = vigenteEn('modelo') !== '—' ? vigenteEn('modelo') : a.modelo; const prompt = vigenteEn('prompt') !== '—' ? vigenteEn('prompt') : a.prompt;
    const t0 = new Date(c.fecha).getTime();
    const evs = (G.eventos || []).filter((e) => e.agente === c.agente && Math.abs(new Date(e.fecha).getTime() - t0) <= 2 * 864e5).slice(0, 6);
    const crit = dir === 'sube' ? CRITERIOS_NIVEL[c.a] || [] : dir === 'baja' ? CRITERIOS_BAJADA : [];
    const lde = G.niveles[c.de] || {}, la = G.niveles[c.a] || {};
    $('modal-cambio-title').innerHTML = `${ic('history')} <span class="mono">${esc(auditId)}</span> · ${agLbl(c.agente)} · ${fechaHora(c.fecha)} <span class="pill ${tipo[0]}">${ic(tipo[1])} ${tipo[2]}</span>`;
    $('modal-cambio-body').innerHTML = `
      <div class="cambio-hero">
        <div class="box lvl-box">${lvlBadge(c.de)}<b>${esc(lde.nombre || '—')}</b><span class="muted small">${esc(lde.desc || '')}</span></div>
        <span class="cambio-arrow">${c.de === c.a ? '=' : ic('chevron-right')}</span>
        <div class="box lvl-box" style="border-color:var(--${dir === 'sube' ? 'ok' : dir === 'baja' ? 'crit' : 'border'})">${lvlBadge(c.a)}<b>${esc(la.nombre || '—')}</b><span class="muted small">${esc(la.desc || '')}</span></div>
      </div>
      <p class="small"><b>Motivo:</b> ${conGuardrails(esc(c.motivo))}</p>
      <p class="small muted">${CONSECUENCIA[dir]}</p>
      <div class="two">
        <div><h3>Registro de auditoría</h3><dl class="kv"><dt>Id de auditoría</dt><dd class="mono">${esc(auditId)}</dd><dt>Fecha y hora</dt><dd>${new Date(c.fecha).toLocaleString('es-ES')}</dd><dt>Agente</dt><dd>${agTag(c.agente)} <button class="btn btn-sm" type="button" data-ver-agente="${esc(c.agente)}">Ver agente</button></dd><dt>Aprobado por</dt><dd>${esc(c.usuario)}</dd><dt>Tipo de aprobación</dt><dd>${esc(rol)}</dd><dt>Estado del cambio</dt><dd>${sig ? `<span class="pill pill-muted">Sustituido por ${esc(`AUD-${sig[0].fecha.slice(0, 10).replace(/-/g, '')}-${String(asc.findIndex(([, i]) => i === sig[1]) + 1).padStart(2, '0')}`)}</span>` : '<span class="pill pill-ok">Vigente</span>'}</dd><dt>Tiempo vigente</dt><dd>${esc(vigente)}</dd><dt>Reversible</dt><dd>Sí · se puede volver a ${lvlBadge(c.de)} desde la ficha del agente en cualquier momento</dd></dl></div>
        <div><h3>Estado del agente en esa fecha</h3><dl class="kv"><dt>Modelo</dt><dd class="mono">${esc(modelo)}</dd><dt>Versión de prompt</dt><dd class="mono">${esc(prompt)}</dd><dt>Guardrails del agente</dt><dd>${G.politicas.filter((p) => p.agente === c.agente).map((p) => grRef(p.id)).join(', ') || '—'}</dd><dt>Umbral de confianza</dt><dd>${conGuardrails(esc(a.umbral || '—'))}</dd><dt>Override 14 d</dt><dd>${esc(a.override_14d || '—')}</dd><dt>Escalado 14 d</dt><dd>${esc(a.escalado_14d || '—')}</dd></dl></div>
      </div>
      ${crit.length ? `<div><h3>${dir === 'sube' ? `Criterios para pasar a L${c.a}` : 'Motivos de la bajada de nivel'}</h3><ul class="crit-list">${crit.map((x, k) => `<li class="${dir === 'baja' ? (k === 0 ? 'ko' : 'na') : 'ok'}"><span>${ic(dir === 'baja' ? (k === 0 ? 'circle-x' : 'minus') : 'circle-check')}</span>${esc(x)}${dir === 'baja' ? (k === 0 ? ' <b>· disparó la bajada</b>' : ' <span class="muted small">· no fue el motivo</span>') : ''}</li>`).join('')}</ul></div>` : ''}
      <div><h3>Evolución del nivel de ${agLbl(c.agente)}</h3>${chartNivelesAgente(mismos, idx)}<div class="legend"><span><i style="background:var(--ok)"></i>Promoción</span><span><i style="background:var(--crit)"></i>Degradación</span><span><i style="background:var(--surface);border:1.5px solid var(--primary)"></i>Sin cambio de nivel</span></div></div>
      ${evs.length ? `<div><h3>Eventos del agente en las 48 h alrededor del cambio</h3><ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:space-between">
        ${ant ? `<button class="btn btn-sm" type="button" data-cambio="${ant[1]}">${ic('arrow-left')} Anterior · ${fechaHora(ant[0].fecha)}</button>` : '<span></span>'}
        ${sig ? `<button class="btn btn-sm" type="button" data-cambio="${sig[1]}">Siguiente · ${fechaHora(sig[0].fecha)} ${ic('chevron-right')}</button>` : '<span></span>'}
      </div>`;
    abrir('modal-cambio');
  }

  // ---------------------------------------------------------------------------
  // Histórico
  // ---------------------------------------------------------------------------
  const TIPOS = { alerta: ['bell', 'Alertas', 'var(--crit)'], politica: ['sliders-horizontal', 'Políticas y niveles', 'var(--time)'], replay: ['repeat', 'Replays', 'var(--ag-clasificacion)'], override: ['user-check', 'Overrides', 'var(--review)'], despliegue: ['rocket', 'Despliegues', 'var(--primary)'], incidente: ['activity', 'Incidentes', 'var(--warn)'], operacion: ['power', 'Operación', 'var(--muted)'] };
  function renderHistorico() {
    const evs = G.eventos || [];
    $('hist-chips').innerHTML = `<button class="chip${filtroTipo ? '' : ' is-active'}" type="button" data-t="">Todo</button>` + Object.entries(TIPOS).filter(([k]) => k !== 'operacion' || evs.some((e) => e.tipo === 'operacion')).map(([k, [i, l]]) => `<button class="chip${filtroTipo === k ? ' is-active' : ''}" type="button" data-t="${k}">${ic(i)} ${l} (${evs.filter((e) => e.tipo === k).length})</button>`).join('');
    const lista = evs.filter((e) => !filtroTipo || e.tipo === filtroTipo).sort((a, b) => b.fecha.localeCompare(a.fecha));
    let day = ''; let out = '';
    lista.forEach((e) => {
      const d = e.fecha.slice(0, 10);
      if (d !== day) { day = d; out += `<div class="day">${new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`; }
      const [i, , c] = TIPOS[e.tipo] || ['info', '', 'var(--muted)'];
      out += `<div class="ev"><span class="t">${hora(e.fecha).slice(0, 5)}</span><span class="ico" style="--c:${c}">${ic(i)}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))}</small></div><div class="row" style="justify-content:flex-end">${e.agente ? agTag(e.agente) : ''}<span class="pill pill-muted">${esc(e.usuario)}</span></div></div>`;
    });
    $('timeline').innerHTML = out || '<p class="muted">Sin eventos de este tipo.</p>';
  }

  // ---------------------------------------------------------------------------
  // Render completo, navegación y eventos
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Termómetro de cumplimiento: controles medidos en las trazas (cumplimiento.js) + declarados (documentales)
  // ---------------------------------------------------------------------------
  const ESTADO_CMP = { ok: ['pill-ok', 'circle-check', 'Cubierto'], ambar: ['pill-warn', 'circle-alert', 'Parcial'], rojo: ['pill-crit', 'circle-x', 'Sin cubrir'] };
  const CAT_ICONO = { identificativo: 'user', contacto: 'phone', indirecto: 'fingerprint', localizacion: 'map-pin', financiero: 'wallet', salud: 'heart-pulse', menor: 'users', tercero: 'user-check' };
  let cmpFiltro = ''; let cmpSoloAmbar = false; let cmpAlterada = null; let cmpItems = [];

  // Mismas entradas que la ficha del triaje: el mensaje, la salida del modelo y su bloque _gobernanza
  function entradasCumplimiento() {
    if ($('fuente').value === 'sesion') {
      const log = ssGet('triage.log', []);
      const items = (Array.isArray(log) ? [...log].reverse() : []).filter((e) => e.mensaje && e.mensaje.texto)
        .map((e) => ({ entry: e, gob: e.gobernanza || Cumplimiento.gobernanza(e, e.gob_opts || {}), texto: e.mensaje.texto, raw: e.raw }));
      if (items.length) return items;
    }
    const msgs = Object.fromEntries(PAQUETES.flatMap((p) => p.mensajes).map((m) => [m.id, m]));
    return G.trazas.filter((t) => msgs[t.mensaje] && RESULTADOS_GUARDADOS[t.mensaje]).map((t) => {
      const m = msgs[t.mensaje];
      const r = expandirResultadoGuardado(RESULTADOS_GUARDADOS[m.id]);
      const { usage, ...json } = r;
      const entry = { ...r, id: m.id, raw: JSON.stringify(json, null, 2), origen: 'IA', mensaje: m, timestamp: new Date(t.inicio).toISOString(), revisado: t.resultado === 'override' };
      const reglas = t.spans.find((s) => s[0] === 'reglas');
      return { entry, gob: Cumplimiento.gobernanza(entry, { traza_id: t.id, modelo: reglas ? reglas[3] : null, prompt: PROMPT_VERSION }), texto: m.texto, raw: entry.raw };
    });
  }

  const colorPct = (p) => (p >= 90 ? 'var(--ok)' : p >= 70 ? 'var(--warn)' : 'var(--crit)');
  function termoSvg(p) {
    const alto = 132; const lleno = Math.round((alto * p) / 100);
    return `<svg class="termo-svg" viewBox="0 0 48 180" role="img" aria-label="${p} por ciento de controles cubiertos">
      <rect x="16" y="8" width="16" height="${alto + 12}" rx="8" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5"/>
      ${[25, 50, 75].map((k) => `<line x1="34" x2="40" y1="${8 + 6 + alto - (alto * k) / 100}" y2="${8 + 6 + alto - (alto * k) / 100}" stroke="var(--border)" stroke-width="1.5"/>`).join('')}
      <rect class="termo-fill" x="20" y="${8 + 6 + alto - lleno}" width="8" height="${lleno + 10}" rx="4" fill="${colorPct(p)}"/>
      <circle cx="24" cy="160" r="14" fill="${colorPct(p)}" stroke="var(--surface)" stroke-width="3"/>
    </svg>`;
  }

  function renderCumplimiento() {
    cmpItems = entradasCumplimiento();
    const items = cmpItems.map((x, i) => (i === cmpAlterada ? { ...x, raw: String(x.raw || '').replace(/"decision": "(DESPEJADO|REVISION)"/, (s0, d) => `"decision": "${d === 'DESPEJADO' ? 'REVISION' : 'DESPEJADO'}"`) } : x));
    const cadena = Cumplimiento.verificarCadena(items);
    const T = Cumplimiento.termometro(cmpItems.map((x) => x.gob), G.cumplimiento_declarado || GOBIERNO_DEMO.cumplimiento_declarado || {}, cadena);
    const todos = T.marcos.flatMap((mc) => mc.controles.map((c) => ({ ...c, marco: mc.id })));
    const cuenta = (e) => todos.filter((c) => c.estado === e).length;
    const fuente = $('fuente').value === 'sesion' && ssGet('triage.log', []).length ? 'la sesión actual del triaje' : 'las 13 trazas del Paquete A (demo)';

    $('cmp-hero').innerHTML = `<div class="cmp-hero-main">
        <div class="cmp-global" style="--c:${colorPct(T.global)}"><span class="v">${T.global}<small>%</small></span><span class="l">de cobertura de controles</span></div>
        <div class="cmp-hero-txt">
          <h2>${ic('thermometer')} Termómetro de cumplimiento ${normas('ai-12', 'rgpd-5', 'eiopa')}</h2>
          <p class="small">Cómo se guardan las trazas, las evidencias y los datos personales que exigen las normas que aplican a una aseguradora que automatiza con IA. Calculado sobre ${esc(fuente)}: los mismos bloques <span class="mono">_gobernanza</span> que se ven en la «Respuesta cruda» de cada ficha del triaje.</p>
          <div class="row" style="margin-top:.5rem"><span class="pill pill-ok">${ic('circle-check')} ${cuenta('ok')} cubiertos</span><span class="pill pill-warn">${ic('circle-alert')} ${cuenta('ambar')} parciales</span>${cuenta('rojo') ? `<span class="pill pill-crit">${ic('circle-x')} ${cuenta('rojo')} sin cubrir</span>` : ''}<span class="pill pill-muted">${ic('activity')} ${todos.filter((c) => c.fuente === 'medido').length} medidos en las trazas</span><span class="pill pill-muted">${ic('file-text')} ${todos.filter((c) => c.fuente === 'declarado').length} declarados (documentales)</span></div>
        </div>
        <div class="cmp-hero-acc"><button class="btn btn-primary btn-sm" type="button" id="btn-cmp-export">${ic('download')} Exportar evidencias de cumplimiento</button></div>
      </div>
      <p class="muted small cmp-aviso">${ic('info')} Indicador técnico de cobertura de controles, no un certificado: no sustituye la evaluación del DPO ni de Cumplimiento. Los controles «medidos» se recalculan con cada traza; los «declarados» proceden de la documentación del sistema.</p>`;

    $('cmp-termos').innerHTML = T.marcos.map((mc) => `<button type="button" class="card termo${cmpFiltro === mc.id ? ' is-active' : ''}" data-cmp-marco="${mc.id}" aria-pressed="${cmpFiltro === mc.id}">
        ${termoSvg(mc.pct)}
        <div class="termo-txt"><span class="termo-pct" style="color:${colorPct(mc.pct)}">${mc.pct} %</span><b>${esc(mc.nombre)}</b><span class="muted small">${esc(mc.sub)}</span>
        <span class="termo-cuenta"><span class="pill pill-ok">${mc.cuenta.ok}</span><span class="pill pill-warn">${mc.cuenta.ambar}</span>${mc.cuenta.rojo ? `<span class="pill pill-crit">${mc.cuenta.rojo}</span>` : ''}<span class="muted small">de ${mc.controles.length} controles</span></span></div>
      </button>`).join('');

    titulo('h-cmp-matriz', 'list-checks', 'Qué exige cada norma y cómo se cumple');
    $('cmp-filtro').innerHTML = [['', 'Todas'], ...T.marcos.map((mc) => [mc.id, mc.nombre])].map(([k, l]) => `<button type="button" class="chip${cmpFiltro === k ? ' is-active' : ''}" data-cmp-marco="${k}">${esc(l)}</button>`).join('');
    $('cmp-filtro-estado').innerHTML = `<button type="button" class="chip${cmpSoloAmbar ? ' is-active' : ''}" data-cmp-ambar="1">${ic('circle-alert')} Solo parciales</button>`;
    const filas = todos.filter((c) => (!cmpFiltro || c.marco === cmpFiltro) && (!cmpSoloAmbar || c.estado !== 'ok'));
    $('cmp-matriz').innerHTML = filas.map((c) => {
      const [cls, icono, txt] = ESTADO_CMP[c.estado];
      const tz = (c.trazas || []);
      return `<tr><td><span class="pill ${cls}">${ic(icono)} ${txt}</span></td>
        <td><span class="normas" style="margin:0">${c.normas.map((e) => `<span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA[e] || e)}">${ic('scale')} ${esc(e)}</span>`).join('')}</span></td>
        <td class="wrap">${esc(c.exige)}</td><td class="wrap">${esc(c.como)}</td><td class="wrap"><b>${esc(c.medida)}</b></td>
        <td>${c.fuente === 'medido' ? `<span class="pill pill-time">${ic('activity')} Medido</span>` : `<span class="pill pill-muted">${ic('file-text')} Declarado</span>`}</td>
        <td class="wrap">${tz.length ? `${tz.slice(0, 3).map((id) => `<a href="#" class="mono" data-cmp-traza="${esc(id)}">${esc(id)}</a>`).join(' ')}${tz.length > 3 ? ` <span class="muted small">+${tz.length - 3}</span>` : ''}` : '<span class="muted">—</span>'}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="muted">Ningún control con este filtro.</td></tr>';

    titulo('h-cmp-ciclo', 'route', 'Ciclo de vida de una traza');
    const PASOS = [
      ['inbox', 'Ingesta', 'Mensaje de cualquiera de los 5 canales; se calcula el hash de entrada', ['AI Act art. 12'], 'al recibir'],
      ['scan-text', 'Detección de datos personales', '8 categorías; salud, menores y terceros quedan marcados', ['RGPD art. 4.1', 'RGPD art. 9'], 'al recibir'],
      ['eye-off', 'Seudonimización', 'Nombres, DNI, póliza y matrícula pasan a tokens; teléfono e IBAN se enmascaran', ['RGPD art. 4.5', 'RGPD art. 25'], 'antes de registrar'],
      ['sparkles', 'Decisión del modelo', 'Cita las evidencias que la justifican; hoy recibe el texto completo (ver minimización)', ['AI Act art. 13', 'RGPD art. 5.1.c'], 'segundos'],
      ['user-check', 'Supervisión humana', 'Toda decisión desfavorable o dudosa la firma una persona', ['AI Act art. 14', 'RGPD art. 22'], 'antes de comunicar'],
      ['link', 'Registro sellado', 'Hash de la salida y eslabón de la cadena de integridad', ['AI Act art. 12', 'RGPD art. 5.2'], 'al decidir'],
      ['archive', 'Retención', 'Traza seudonimizada 6 meses como mínimo; expediente 2 años (daños) o 5 (personas)', ['AI Act art. 19 y 26.6', 'LCS art. 23'], '6 meses · 2-5 años'],
      ['lock', 'Bloqueo y supresión', 'Bloqueo durante la prescripción; después supresión. Para analítica, solo datos anonimizados', ['LOPDGDD art. 32', 'RGPD art. 5.1.e'], 'al prescribir'],
    ];
    $('cmp-ciclo').innerHTML = PASOS.map(([i, t, d, ns, cuando], k) => `<div class="ciclo-paso"><span class="ciclo-n">${k + 1}</span><span class="ciclo-ico">${ic(i)}</span><b>${esc(t)}</b><span class="small">${esc(d)}</span><span class="ciclo-cuando">${ic('timer')} ${esc(cuando)}</span><span class="normas" style="margin:0">${ns.map((e) => `<span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA[e] || e)}">${esc(e)}</span>`).join('')}</span></div>`).join('');

    titulo('h-cmp-inv', 'fingerprint', `Inventario de datos personales (${T.resumen.datos_personales} en ${T.resumen.trazas} mensajes)`);
    $('cmp-inv').innerHTML = cmpItems.map((x, i) => {
      const dp = x.gob.datos_personales;
      const chips = Object.entries(dp.por_categoria).map(([c, nn]) => `<span class="pill pill-muted" data-tip="${esc(Cumplimiento.CATEGORIAS[c].etiqueta)} · ${esc(Cumplimiento.CATEGORIAS[c].tratamiento)}"><span class="pii-dot pii-${c}"></span> ${ic(CAT_ICONO[c])} ${nn}</span>`).join(' ');
      const muestra = dp.hallazgos.filter((h) => h.categoria !== 'salud').slice(0, 2).map((h) => `<span class="mono">${esc(h.valor_en_traza)}</span>`).join(' · ');
      return `<tr class="clickable" data-cmp-item="${i}" tabindex="0"><td class="mono">${esc(x.gob.trazabilidad.traza_id)}</td><td>${esc(x.entry.id)}</td><td>${ramoPill(x.entry.ramo)}</td><td class="wrap">${chips}</td>
        <td>${dp.categoria_especial_salud ? `<span class="pill pill-crit">${ic('heart-pulse')} ${dp.categoria_especial_salud}</span>` : '<span class="muted">—</span>'}</td>
        <td>${dp.menores ? `<span class="pill pill-warn">${dp.menores}</span>` : '<span class="muted">—</span>'}</td><td>${dp.terceros || '<span class="muted">—</span>'}</td>
        <td>${dp.no_usados_en_decision} de ${dp.total}</td><td>${muestra}</td></tr>`;
    }).join('');

    titulo('h-cmp-cadena', 'link', 'Integridad del registro');
    $('btn-cmp-alterar').innerHTML = cmpAlterada === null ? `${ic('triangle-alert')} Simular una alteración` : `${ic('undo-2')} Restaurar`;
    $('cmp-cadena').innerHTML = `<p class="small" style="margin-bottom:.5rem">${cadena.roto === null ? `<span class="pill pill-ok">${ic('circle-check')} Cadena íntegra</span> ${cadena.items.length} de ${cadena.items.length} eslabones verificados al recalcular los hashes desde los datos.` : `<span class="pill pill-crit">${ic('circle-x')} Cadena rota</span> La traza <b class="mono">${esc(cadena.items[cadena.roto].traza_id)}</b> no coincide con su sello: alguien cambió la decisión después de registrarla. Todas las posteriores quedan en entredicho.`}</p>
      <ol class="eslabones">${cadena.items.map((e) => `<li class="${e.ok ? 'ok' : 'ko'}"><span class="mono">${esc(e.traza_id)}</span><span class="mono muted">${e.eslabon.slice(0, 12)}…</span>${e.ok ? ic('check') : ic('x')}</li>`).join('')}</ol>`;

    titulo('h-cmp-seud', 'eye-off', 'Seudonimizar no es anonimizar');
    $('cmp-seud').innerHTML = `<div class="seud-col"><b>${ic('fingerprint')} Seudonimizado <span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA['RGPD art. 4.5'])}">RGPD art. 4.5</span></b><p class="small">El dato se sustituye por un token (<span class="mono">PER-0B01</span>, <span class="mono">POL-…</span>) y la clave se guarda aparte. <b>Sigue siendo dato personal</b>: es lo que corresponde a las trazas, porque el siniestro hay que tramitarlo y el asegurado puede pedir su explicación.</p><p class="small muted">Se aplica a: trazas operativas, replay, exportaciones de auditoría.</p></div>
      <div class="seud-col"><b>${ic('lock')} Anonimizado <span class="norma" data-tip="RGPD considerando 26: la información anónima no entra en el ámbito del RGPD. Requiere que la reidentificación no sea razonablemente posible.">RGPD cons. 26</span></b><p class="small">Irreversible: no hay clave que permita volver a la persona. Sale del RGPD, pero ya no sirve para tramitar. Se usa al final del ciclo o para conjuntos de datos de analítica y de pruebas.</p><p class="small muted">Se aplica a: cuadros de mando agregados, datasets de evaluación y de entrenamiento.</p></div>`;
  }

  // Ficha de cumplimiento de una traza: texto con los datos personales resaltados, hallazgos y bloque _gobernanza
  function abrirModalCmp(i) {
    const x = cmpItems[i]; if (!x) return;
    const hs = Cumplimiento.hallazgosConCita(x.entry);
    let pos = 0; let html = '';
    hs.filter((h, k) => !hs.slice(0, k).some((o) => h.inicio < o.fin && h.fin > o.inicio)).forEach((h) => {
      if (h.inicio < pos) return;
      html += esc(x.texto.slice(pos, h.inicio)) + `<mark class="pii pii-${h.categoria}" title="${esc(Cumplimiento.CATEGORIAS[h.categoria].etiqueta)} · ${esc(Cumplimiento.CATEGORIAS[h.categoria].tratamiento)}">${esc(h.cita)}</mark>`;
      pos = h.fin;
    });
    html += esc(x.texto.slice(pos));
    const dp = x.gob.datos_personales;
    const ley = Object.keys(dp.por_categoria).map((c) => `<li><span class="pii-dot pii-${c}"></span> ${esc(Cumplimiento.CATEGORIAS[c].etiqueta)} <span class="muted">· ${dp.por_categoria[c]}</span></li>`).join('');
    $('modal-cmp-title').innerHTML = `${ic('fingerprint')} ${esc(x.gob.trazabilidad.traza_id)} · ${esc(x.entry.id)} <span class="muted" style="font-weight:400">· ${esc(x.entry.mensaje.asunto || '')}</span>`;
    $('modal-cmp-body').innerHTML = `<div class="two">
        <div><h3>Mensaje con los datos personales detectados</h3><p class="cmp-texto">${html}</p><ul class="pii-ley">${ley}</ul>
          <p class="muted small" style="margin-top:.5rem">Vista con permisos de tramitador. En la traza persistida solo queda la columna «valor en la traza».</p></div>
        <div><h3>Hallazgos y tratamiento</h3><div class="tw"><table><thead><tr><th>Dato</th><th>Categoría</th><th>Valor en la traza</th><th>¿Para decidir?</th></tr></thead><tbody>${dp.hallazgos.map((h) => `<tr><td class="mono">${esc(h.id)}</td><td><span class="pii-dot pii-${h.categoria}"></span> ${esc(Cumplimiento.CATEGORIAS[h.categoria].etiqueta)}</td><td class="mono">${esc(h.valor_en_traza)}</td><td>${h.usado_en_decision ? `<span class="pill pill-ok">sí</span>` : `<span class="pill pill-warn" data-tip="Se envió al modelo pero no hacía falta para decidir: candidato a seudonimizar antes del modelo (minimización)">no</span>`}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div><h3>Bloque _gobernanza (el mismo que la «Respuesta cruda» de la ficha del triaje)</h3><pre class="raw-json">${Cumplimiento.jsonHtml({ _gobernanza: x.gob }, {})}</pre></div>`;
    $('modal-cmp').showModal();
  }

  function exportarCumplimiento() {
    const T = Cumplimiento.termometro(cmpItems.map((x) => x.gob), G.cumplimiento_declarado || {}, Cumplimiento.verificarCadena(cmpItems));
    const datos = { esquema: Cumplimiento.ESQUEMA, generado: new Date().toISOString(), aviso: 'Indicador técnico de cobertura de controles; no sustituye la evaluación del DPO ni de Cumplimiento.', termometro: T, cadena: Cumplimiento.encadenar(cmpItems.map((x) => x.gob)), trazas: cmpItems.map((x) => x.gob) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `evidencias-cumplimiento-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function renderAll() {
    AG = Object.fromEntries(G.agentes.map((a) => [a.id, a]));
    POL = Object.fromEntries([...(G.politicas || []), ...(G.caps || [])].map((p) => [p.id, p]));
    incluirNuevos();
    cmpItems = entradasCumplimiento();
    if (!G.trazas.some((t) => t.id === selId)) selId = G.trazas.length ? G.trazas[G.trazas.length - 1].id : null;
    renderResumen();
    titulo('h-trazas', 'route', `Trazas (${G.trazas.length})`);
    $('r-summary').innerHTML = `${ic('route')} Trazas (${G.trazas.length}) · filtros`;
    listaTrazas('t'); listaTrazas('r');
    renderDetalle();
    renderSteps();
    renderReplays();
    renderAutonomia();
    renderGuardrails();
    renderFinops();
    renderHistorico();
    renderCumplimiento();
    $('tabs').querySelector('[data-view="finops"] .n').textContent = G.caps.filter((c) => c.estado === 'superado').length || '';
    ajustarAgentes();
  }

  const TABS = [['resumen', 'layout-dashboard', 'Resumen'], ['trazas', 'route', 'Trazabilidad'], ['replay', 'brain', 'Reasoning & Replay'], ['autonomia', 'sliders-horizontal', 'Autonomía'], ['guardrails', 'shield-check', 'Guardrails'], ['cumplimiento', 'thermometer', 'Termómetro de cumplimiento'], ['finops', 'coins', 'FinOps'], ['historico', 'history', 'Histórico']];
  function goto(v, opts = {}) {
    document.querySelectorAll('.tab').forEach((b) => { b.classList.toggle('is-active', b.dataset.view === v); b.setAttribute('aria-selected', String(b.dataset.view === v)); });
    document.querySelectorAll('.view').forEach((s) => s.classList.toggle('is-active', s.dataset.view === v));
    if (opts.replay) { const card = $('card-replay'); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); card.style.outline = '2px solid var(--primary)'; setTimeout(() => { card.style.outline = ''; }, 1600); }
    else window.scrollTo({ top: 0 });
    ajustarAgentes();
  }

  // Alturas reales de cabecera y pestañas para los elementos fijos (la cabecera puede ocupar varias líneas)
  function medirFijos() {
    document.documentElement.style.setProperty('--top-h', `${document.querySelector('.topbar').offsetHeight}px`);
  }

  // Tirador para redimensionar horizontalmente el panel de trazas y el de razonamiento
  function initResizer() {
    const row = $('reasoning-row');
    const handle = $('reasoning-resizer');
    if (!row || !handle) return;
    const clamp = (pct) => Math.min(75, Math.max(25, pct));
    const setPct = (pct) => row.style.setProperty('--pane-w', `${clamp(pct)}%`);
    handle.addEventListener('pointerdown', (e) => { handle.setPointerCapture(e.pointerId); handle.dataset.dragging = '1'; });
    handle.addEventListener('pointermove', (e) => {
      if (!handle.dataset.dragging) return;
      const r = row.getBoundingClientRect();
      setPct(((e.clientX - r.left) / r.width) * 100);
    });
    handle.addEventListener('pointerup', () => { delete handle.dataset.dragging; });
    handle.addEventListener('keydown', (e) => {
      const cur = parseFloat(row.style.getPropertyValue('--pane-w')) || 55;
      if (e.key === 'ArrowLeft') { setPct(cur - 3); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPct(cur + 3); e.preventDefault(); }
    });
  }

  // Menú lateral plegable: el estado se recuerda en este navegador (preferencia del usuario)
  function initNav() {
    const lay = $('gb-layout'); const b = $('btn-toggle-nav');
    const set = (abierto) => {
      lay.classList.toggle('nav-collapsed', !abierto);
      b.setAttribute('aria-expanded', String(abierto));
      b.setAttribute('aria-label', abierto ? 'Plegar el menú' : 'Desplegar el menú');
      b.title = abierto ? 'Plegar el menú' : 'Desplegar el menú';
      b.innerHTML = ic(abierto ? 'panel-left-close' : 'panel-left-open');
      // Plegado: el nombre de cada sección aparece como tooltip sobre su icono
      lay.querySelectorAll('.tab').forEach((t) => { if (abierto) delete t.dataset.tip; else t.dataset.tip = t.getAttribute('aria-label'); });
      try { localStorage.setItem('gobierno.nav', abierto ? '1' : '0'); } catch { /* sin almacenamiento */ }
      setTimeout(() => ajustarAgentes(), 200);
    };
    let abierto = true;
    try { abierto = localStorage.getItem('gobierno.nav') !== '0'; } catch { /* sin almacenamiento */ }
    set(abierto);
    b.addEventListener('click', () => set(lay.classList.contains('nav-collapsed')));
  }

  function bind() {
    $('tabs').innerHTML = TABS.map(([v, i, l]) => `<button class="tab${v === 'resumen' ? ' is-active' : ''}" type="button" role="tab" data-view="${v}" aria-selected="${v === 'resumen'}" aria-label="${l}">${ic(i)} <span class="lbl">${l}</span>${v === 'finops' ? '<span class="n"></span>' : ''}</button>`).join('');
    initNav();
    $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) goto(b.dataset.view); });
    // Navegación, modales, kill switch, guardrails y leyendas: un único delegado de clic
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) { const dlg = go.closest('dialog'); if (dlg) dlg.close(); goto(go.dataset.goto, { replay: !!go.dataset.replay }); return; }
      const cl = e.target.closest('[data-close]'); if (cl) { $(cl.dataset.close).close(); return; }
      const sw = e.target.closest('[data-switch]'); if (sw) { e.preventDefault(); e.stopPropagation(); toggleAgente(sw.dataset.switch); return; }
      const gr = e.target.closest('[data-guardrail]'); if (gr) { e.preventDefault(); toggleGuardrail(gr.dataset.guardrail); if (gr.dataset.reabrir) abrirModalGr(gr.dataset.reabrir); return; }
      const cb = e.target.closest('[data-cambio]'); if (cb) { abrirModalCambio(Number(cb.dataset.cambio)); return; }
      const va = e.target.closest('[data-ver-agente]'); if (va) { cerrarTodos(); abrirModalAgente(va.dataset.verAgente); return; }
      const co = e.target.closest('[data-corr]'); if (co) { const [cid, k] = co.dataset.corr.split(':'); aplicarCorrectiva(cid, Number(k)); return; }
      const cp = e.target.closest('[data-cap]'); if (cp) { abrirModalCap(cp.dataset.cap); return; }
      const lg = e.target.closest('[data-legend]'); if (lg) { const set = lg.dataset.legend === 'agente' ? ocultos : tokOcultos; set.has(lg.dataset.key) ? set.delete(lg.dataset.key) : set.add(lg.dataset.key); renderCharts(); return; }
      const cm = e.target.closest('[data-cmp-marco]'); if (cm) { cmpFiltro = cmpFiltro === cm.dataset.cmpMarco ? '' : cm.dataset.cmpMarco; renderCumplimiento(); return; }
      const ca = e.target.closest('[data-cmp-ambar]'); if (ca) { cmpSoloAmbar = !cmpSoloAmbar; renderCumplimiento(); return; }
      const cf = e.target.closest('[data-cmp-ficha]'); if (cf) { const k = cmpItems.findIndex((x) => x.gob.trazabilidad.traza_id === cf.dataset.cmpFicha); if (k >= 0) { cerrarTodos(); abrirModalCmp(k); } return; }
      const ci = e.target.closest('[data-cmp-item]'); if (ci) { abrirModalCmp(Number(ci.dataset.cmpItem)); return; }
      const ct = e.target.closest('[data-cmp-traza]'); if (ct) { e.preventDefault(); const t = G.trazas.find((x) => x.id === ct.dataset.cmpTraza); if (t) { goto('trazas'); selectTraza(t.id); } else { const k = cmpItems.findIndex((x) => x.gob.trazabilidad.traza_id === ct.dataset.cmpTraza); if (k >= 0) abrirModalCmp(k); } return; }
      if (e.target.closest('#btn-cmp-export')) { exportarCumplimiento(); return; }
      if (e.target.closest('#btn-cmp-alterar')) { cmpAlterada = cmpAlterada === null ? Math.min(4, cmpItems.length - 1) : null; renderCumplimiento(); return; }
      const tz = e.target.closest('[data-traza]'); if (tz) { cerrarTodos(); goto('trazas'); selectTraza(tz.dataset.traza); return; }
      const gf = e.target.closest('#policies tr[data-gr]'); if (gf) { abrirModalGr(gf.dataset.gr); return; }
      const ag = e.target.closest('.agent[data-agente]'); if (ag) { abrirModalAgente(ag.dataset.agente); return; }
      const kf = e.target.closest('[data-kpi-fin]'); if (kf) { abrirModalKpiFin(kf.dataset.kpiFin); return; }
      const ult = e.target.closest('#ultimas tr[data-id]'); if (ult) { abrirModalTraza(ult.dataset.id); return; }
      const row = e.target.closest('#t-trazas tr[data-id], #r-trazas tr[data-id]'); if (row) { selectTraza(row.dataset.id); return; }
      const chip = e.target.closest('#hist-chips .chip'); if (chip) { filtroTipo = chip.dataset.t; renderHistorico(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches) return;
      if (e.target.matches('.agent[data-agente]')) abrirModalAgente(e.target.dataset.agente);
      else if (e.target.matches('[data-kpi-fin]')) abrirModalKpiFin(e.target.dataset.kpiFin);
      else if (e.target.matches('#caps tr[data-cap]')) abrirModalCap(e.target.dataset.cap);
      else if (e.target.matches('#policies tr[data-gr]')) abrirModalGr(e.target.dataset.gr);
      else if (e.target.matches('#cambios tr[data-cambio]')) abrirModalCambio(Number(e.target.dataset.cambio));
    });
    // Formularios de «Nuevo cap» y «Nuevo guardrail»
    document.addEventListener('submit', (e) => { e.preventDefault(); if (e.target.id === 'form-cap') guardarCapNuevo(); else if (e.target.id === 'form-gr') guardarGrNuevo(); });
    document.addEventListener('input', (e) => {
      if (e.target.closest('#form-cap')) actualizarPreviewCap();
      else if (e.target.closest('#form-gr')) actualizarPreviewGr();
    });
    document.addEventListener('change', (e) => {
      if (e.target.matches('#nc-ambito, #nc-tipo')) { sugerirLimiteCap(); actualizarPreviewCap(); }
      else if (e.target.matches('#ng-plantilla')) ajustarPlantillaGr(true);
      else if (e.target.closest('#form-gr')) actualizarPreviewGr();
    });
    $('btn-new-cap').addEventListener('click', abrirModalCapNuevo);
    $('btn-new-policy').addEventListener('click', abrirModalGrNuevo);
    document.querySelectorAll('dialog.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
    $('btn-back').innerHTML = `${ic('arrow-left')} Volver al triaje`;
    $('btn-json').innerHTML = `${ic('upload')} Cargar JSON`;
    $('btn-json').addEventListener('click', () => $('file-json').click());
    $('file-json').addEventListener('change', () => { const f = $('file-json').files[0]; if (f) cargarArchivo(f); $('file-json').value = ''; });
    $('fuente').addEventListener('change', () => setFuente($('fuente').value));
    $('periodo').addEventListener('change', () => { periodoDias = Number($('periodo').value); renderResumen(); renderFinops(); });
    const H = { 'h-agentes': ['cpu', 'Agentes'], 'h-coste': ['euro', 'Coste diario frente al cap'], 'h-alertas': ['bell', 'Alertas activas'], 'h-reasoning': ['brain', 'Razonamiento registrado'], 'h-replay': ['repeat', 'Replay'], 'h-replays': ['history', 'Replays anteriores'], 'h-niveles': ['sliders-horizontal', 'Niveles de autonomía'], 'h-agentes-aut': ['cpu', 'Histórico de la autonomía y comportamiento de los agentes'], 'h-correctivas': ['lightbulb', 'Caps superados: acciones correctivas sugeridas'], 'h-guardrails': ['shield-check', 'Guardrails'], 'h-cambios': ['history', 'Cambios de nivel (auditoría)'], 'h-caps': ['scale', 'Caps configurados'], 'h-coste-ag': ['euro', 'Coste diario por agente'], 'h-tokens': ['cpu', 'Tokens por agente'], 'h-modelos': ['database', 'Modelos'], 'h-reco': ['lightbulb', 'Recomendaciones de ahorro'], 'h-hist': ['history', 'Histórico de gobierno'] };
    Object.entries(H).forEach(([id, [i, t]]) => titulo(id, i, t));
    document.querySelectorAll('[data-close]').forEach((b) => { b.innerHTML = ic('x'); });
    $('btn-export-trazas').innerHTML = `${ic('download')} Exportar trazas`;
    $('btn-export-trazas').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(G, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `gobierno-agentes-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    $('btn-replay').innerHTML = `${ic('play')} Ejecutar replay`;
    $('btn-replay').addEventListener('click', () => renderDiff(true));
    ['rp-modo', 'rp-modelo', 'rp-prompt'].forEach((id) => $(id).addEventListener('change', () => renderDiff(false)));
    $('btn-new-policy').innerHTML = `${ic('plus')} Nuevo guardrail`;
    $('btn-coste-cap').innerHTML = `${ic('chart-column')} Ampliar`;
    $('btn-new-cap').innerHTML = `${ic('plus')} Nuevo cap`;
    ['t', 'r'].forEach((pre) => ['agente', 'canal', 'dec', 'res'].forEach((k) => $(`${pre}-${k}`).addEventListener('change', () => listaTrazas(pre))));
    // Tooltip de gráficos, waterfall y referencias a guardrails
    const tip = $('tip');
    document.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { tip.style.display = 'none'; return; }
      tip.textContent = el.dataset.tip; tip.style.display = 'block';
      const w = tip.offsetWidth; tip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - w - 8)}px`; tip.style.top = `${e.clientY - 28 - (tip.offsetHeight > 30 ? tip.offsetHeight - 22 : 0)}px`;
    });
    ['t-agente', 'r-agente'].forEach((id) => $(id).querySelectorAll('option[value]:not([value=""])').forEach((o) => { o.textContent = `Agente de ${o.textContent}`; }));
    medirFijos();
    window.addEventListener('resize', () => { medirFijos(); ajustarAgentes(); });
    initResizer();
  }

  bind();
  renderAll();
})();
