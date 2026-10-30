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
  // useGrouping 'always': en es-ES los números de cuatro cifras no llevan punto de miles por defecto (3180 en vez de 3.180)
  const eur = (n, d = 2) => Number(n || 0).toLocaleString(I18N.locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  const num = (n) => Number(n || 0).toLocaleString(I18N.locale, { useGrouping: 'always' });
  // Número con `d` decimales fijos y la coma o el punto del idioma (sin separador de miles, como toFixed)
  const numero = (n) => Number(n || 0).toLocaleString(I18N.locale, { maximumFractionDigits: 20, useGrouping: false });
  const dec = (n, d = 2) => Number(n || 0).toLocaleString(I18N.locale, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
  const pct = (n) => `${Math.round(n * 100)} %`;
  const ms = (v) => (v >= 1000 ? `${dec(v / 1000, 1)} s` : `${Math.round(v)} ms`);
  const hora = (iso) => new Date(iso).toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fecha = (iso) => new Date(iso).toLocaleDateString(I18N.locale, { day: '2-digit', month: 'short' });
  const fechaHora = (iso) => new Date(iso).toLocaleString(I18N.locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
  const svgAg = (id) => (esPrincipal(id) ? I18N.t('gob.ag_de', { id: agNombre(id) }) : agNombre(id)); // en SVG no hay saltos de línea: siempre abreviado
  const agTag = (id) => `<span class="ag" style="--c:${agColor(id)}"><i class="dot"></i>${agLbl(id)}</span>`;
  const CANAL = { email: ['mail', I18N.t('gob.email')], web: ['globe', I18N.t('gob.formulario_web')], chat: ['messages-square', I18N.t('gob.chat')], telefono: ['phone', I18N.t('gob.telefono')], whatsapp: ['message-circle', I18N.t('gob.whatsapp')] };
  const canalInfo = (c) => CANAL[c] || ['messages-square', c];
  const canal = (c) => { const [i, l] = canalInfo(c); return `<span title="${esc(l)}" style="display:inline-flex;align-items:center;gap:.3rem">${ic(i)}<span class="muted small">${esc(l)}</span></span>`; };
  const ramoPill = (r) => `<span class="pill pill-${esc(String(r || 'indeterminado').toLowerCase())}">${esc(r)}</span>`;
  const decPill = (d) => (d === 'REVISION' ? `<span class="pill pill-review">${ic('user-check')} ${I18N.t('gob.a_revisar')}</span>` : `<span class="pill pill-ok">${ic('circle-check')} ${I18N.t('gob.aprobado')}</span>`);
  const resPill = (t) => ({ auto: `<span class="pill pill-ok">${ic('zap')} ${I18N.t('gob.autonomo')}</span>`, humano: `<span class="pill pill-review">${ic('user-check')} ${I18N.t('gob.escalado')}</span>`, override: `<span class="pill pill-time">${ic('repeat')} ${I18N.t('gob.override')}</span>` }[t.resultado] || '');
  const lvlBadge = (n, title) => `<span class="lvl l${n}" title="${esc(title || (G.niveles[n] || {}).desc || '')}">${I18N.t('gob.l', { v: n })}</span>`;
  const SEV_ICON = { crit: 'triangle-alert', warn: 'circle-alert', info: 'info', ok: 'circle-check' };

  // Guardrails y caps: tooltip con la descripción en cualquier referencia (G-04, CAP-03)
  const grTip = (id) => { const p = POL[id]; if (!p) return ''; return p.tipo ? I18N.t('gob.limite', { id, tipo: I18N.dato(p.tipo), ambito: I18N.dato(p.ambito), limite: p.limite, unidad: p.unidad, accion: p.accion }) : `${id} · ${p.condicion} → ${p.accion}${p.descripcion ? `. ${p.descripcion}` : ''}`; };
  const grRef = (id) => (POL[id] ? `<span class="gr" data-tip="${esc(grTip(id))}">${esc(id)}</span>` : esc(id));
  // Aplica sobre texto YA escapado: envuelve los códigos de guardrail / cap
  const conGuardrails = (html) => String(html).replace(/\b(G-\d{2}|CAP-\d{2})\b/g, (m) => grRef(m));

  // Marco normativo: etiquetas con tooltip junto al título de cada bloque (qué norma respalda lo que se ve)
  // Catálogo compartido con la ficha del triaje (cumplimiento.js): misma etiqueta y explicación en las dos páginas
  const NORMA = Cumplimiento.NORMAS;
  const normas = (...ids) => `<span class="normas">${ids.map((k) => `<span class="norma" data-tip="${esc(NORMA[k][1])}">${ic('scale')} ${esc(NORMA[k][0])}</span>`).join('')}</span>`;
  const NORMAS_BLOQUE = {
    'h-agentes': ['ai-14'], 'h-alertas': ['eiopa'], 'h-trazas': ['ai-12', 'rgpd-5', 'dora-28'], 'h-reasoning': ['rgpd-15', 'ai-13'], 'h-replay': ['ai-15', 'eiopa'],
    'h-niveles': ['ai-14', 'rgpd-22'], 'h-cambios': ['rgpd-5', 'eiopa'], 'h-guardrails': ['ai-9', 'ai-14'], 'h-hitl-mec': ['ai-14', 'rgpd-22'], 'h-hitl-cola': ['ai-14', 'rgpd-22'], 'h-hitl-agentes': ['ai-14'], 'h-caps': ['sii-41'], 'h-fr-escenarios': ['rgpd-22', 'rgpd-c47'], 'h-fr-siu': ['ai-14', 'rgpd-22'], 'h-fr-gob': ['rgpd-22', 'lossear-99-7', 'eiopa'], 'h-fr-limites': ['ai-9'], 'h-modelos': ['dora-28'], 'h-hist': ['ai-12', 'rgpd-5'],
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
      const rev = e.revision && e.revision.a ? e.revision : null;
      const incidencias = /fallback/i.test(e.origen || '') ? [I18N.t('gob.fallback_al_motor_local', { replace: e.origen.replace(/^.*fallback IA:\s*/i, '').replace(/\)$/, '') })] : [];
      const id = (e.gobernanza && e.gobernanza.trazabilidad && e.gobernanza.trazabilidad.traza_id) || `TRZ-S${String(i + 1).padStart(3, '0')}`;
      const inicio = new Date(new Date(e.timestamp).getTime() - dur).toISOString();
      return {
        id, mensaje: e.id, asunto: e.asunto, canal: e.mensaje?.canal || 'chat',
        inicio, ramo: e.ramo, decision: e.decision, confianza: e.confianza ?? 0, motivo: e.motivo,
        resultado: rev && rev.accion === 'override' ? 'override' : e.decision === 'REVISION' ? 'humano' : 'auto', guardrail: incumple.length ? I18N.t('gob.guardrail_incumple', { reglas: incumple.join(', ') }) : undefined,
        incidencias: incidencias.length ? incidencias : undefined, spans, origen: e.origen,
        ...(rev ? accionHumanaDeSesion(rev) : accionHumanaDeDemo(id, inicio)),
      };
    });
  }

  // Acción humana registrada en la ficha del triaje (app.js · revisar):
  // · override: el agente aprobó solo y una persona lo pasó a «A revisar» → cuenta en la tasa de override de Reglas
  // · validada: el agente ya lo había escalado y una persona resolvió la revisión → no es override
  function accionHumanaDeSesion(rev) {
    if (!rev) return {};
    const base = { usuario: rev.usuario, fecha: rev.fecha, de: rev.de, a: rev.a, motivo: rev.comentario || '', sesion: true };
    return rev.accion === 'override' ? { override: base } : { revision: { ...base, resultado: rev.resultado || 'aprobada' } };
  }
  // Sin acción en la ficha, la traza conserva la que ya registra la demo con el mismo id (con el motor «guardado» los ids
  // coinciden): así la revisión de L. Prieto en MSG-A-04 sigue en la cola, con su tiempo desplazado al inicio de la sesión.
  function accionHumanaDeDemo(id, inicio) {
    const t = (GOBIERNO_DEMO.trazas || []).find((x) => x.id === id && (x.revision || x.override));
    if (!t) return {};
    const k = t.override ? 'override' : 'revision'; const a = t[k];
    return { [k]: { ...a, fecha: new Date(new Date(inicio).getTime() + (new Date(a.fecha) - new Date(t.inicio))).toISOString() } };
  }
  // Eventos del histórico y efecto en la autonomía de lo que se hizo en la sesión: cada override suma a la tasa de Reglas
  // (overrides entre aprobaciones automáticas); por encima del 3 % se propone bajarle un nivel, pendiente de que lo apruebe una persona.
  const UMBRAL_OVERRIDE = 3;
  function efectoSesion(trazas, agentes) {
    const eventos = []; const traza = (t) => `${t.id} (${t.mensaje})`;
    trazas.forEach((t) => {
      if (t.override && t.override.sesion) eventos.push({ fecha: t.override.fecha, tipo: 'override', sev: 'warn', agente: 'reglas', titulo: I18N.t('gob.override_humano_en_aprobado', { traza: traza(t) }), detalle: I18N.t('gob.el_agente_lo_habia', { motivo: t.override.motivo ? `${t.override.motivo} · ` : '', confianza: Math.round(t.confianza * 100) }), usuario: t.override.usuario });
      if (t.revision && t.revision.sesion) eventos.push({ fecha: t.revision.fecha, tipo: 'revision', sev: 'info', agente: 'reglas', titulo: I18N.t('gob.revision_humana_en', { traza: traza(t), se_mantiene_en_a: t.revision.resultado === 'aprobada' ? I18N.t('gob.a_revisar_aprobado') : I18N.t('gob.se_mantiene_en_a') }), detalle: I18N.t('gob.no_es_override_el', { motivo: t.revision.motivo ? `${t.revision.motivo} · ` : '' }), usuario: t.revision.usuario });
    });
    const reglas = agentes.find((a) => a.id === 'reglas');
    const { solas: aprobadasSolas, overrides, tasa, proponerBajada, nivelPropuesto } = Cumplimiento.tasaOverride(trazas, reglas ? reglas.nivel : null, UMBRAL_OVERRIDE);
    const propuesta = proponerBajada
      ? { fecha: new Date().toISOString(), agente: 'reglas', de: reglas.nivel, a: nivelPropuesto, motivo: I18N.t('gob.propuesta_tasa_de_override', { replace: dec(tasa, 1), overrides, aprobadasSolas, UMBRAL_OVERRIDE }), usuario: I18N.t('gob.sistema_pendiente_de_aprobacion'), pendiente: true }
      : null;
    return { eventos, overrides, aprobadasSolas, tasa, propuesta, altaConfianza: trazas.filter((t) => t.override && t.confianza >= 0.85).length };
  }

  function setFuente(f) {
    const status = $('fuente-status');
    if (f === 'sesion') {
      const trazas = trazasDesdeSesion();
      if (!trazas) { status.textContent = I18N.t('gob.la_sesion_actual_no'); $('fuente').value = 'demo'; return setFuente('demo'); }
      const extra = [{ id: 'ia', nombre: I18N.t('gob.ia_clasificacion_extraccion_reglas'), icono: 'sparkles', modelo: '—', prompt: '—', nivel: 2, estado: 'activo' }, { id: 'local', nombre: I18N.t('gob.motor_local_sin_ia'), icono: 'workflow', modelo: 'reglas', prompt: '—', nivel: 3, estado: 'activo' }];
      const agentes = [...GOBIERNO_DEMO.agentes, ...extra];
      const ses = efectoSesion(trazas, agentes);
      const alertas = ses.propuesta ? [{ sev: 'warn', titulo: I18N.t('gob.override_de_reglas_en', { replace: dec(ses.tasa, 1), UMBRAL_OVERRIDE }), detalle: I18N.t('gob.se_propone_bajar_reglas', { de: ses.propuesta.de, propuesta: ses.propuesta.a }), cuando: 'sesión', origen: 'autonomia', goto: 'autonomia' }] : [];
      G = { ...GOBIERNO_DEMO, agentes, precios: { ...GOBIERNO_DEMO.precios, local: { in: 0, out: 0 } }, trazas, razonamiento: {},
        eventos: [...ses.eventos.sort((a, b) => b.fecha.localeCompare(a.fecha)), ...(GOBIERNO_DEMO.eventos || [])],
        cambios_autonomia: [...(ses.propuesta ? [ses.propuesta] : []), ...(GOBIERNO_DEMO.cambios_autonomia || [])],
        sesion: ses, alertas_autonomia: alertas };
      status.textContent = I18N.t('gob.trazas_de_la_sesion', { trazas: trazas.length });
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
      const datos = Fechas.alDia(JSON.parse(await file.text()));
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.agentes) || !Array.isArray(datos.trazas) || !datos.trazas.every((t) => t && t.id && Array.isArray(t.spans))) throw new Error(I18N.t('gob.no_tiene_el_esquema'));
      archivo = { nombre: file.name, datos };
      const op = $('fuente').querySelector('[value="archivo"]');
      op.disabled = false; op.textContent = `Archivo JSON · ${file.name}`;
      $('fuente').value = 'archivo';
      setFuente('archivo');
    } catch (err) {
      $('fuente-status').textContent = I18N.t('gob.no_se_pudo_cargar', { message: err.message });
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
      kpi({ cls: 'primary', icono: 'activity', etiqueta: I18N.t('gob.mensajes_procesados'), valor: num(totalMsgs), sub: I18N.t('gob.dia_dia_de_media', { dias: dias.length, dias2: dias.length > 1 ? 's' : '', dias3: num(Math.round(totalMsgs / dias.length)) }), id: 'res-msgs' }),
      kpi({ ...aut, id: 'res-aut' }), conGoto(kpi(esc1), 'hitl'), conGoto(kpi(ovr), 'hitl'),
      kpi({ cls: 'warn', icono: 'euro', etiqueta: I18N.t('gob.coste_del_periodo'), valor: eur(coste, coste < 10 ? 2 : 0), sub: I18N.t('gob.del_cap_mensual_por', { capMes: Math.round((coste / capMes) * 100), capMes2: eur(capMes, 0), totalMsgs: eur(totalMsgs ? coste / totalMsgs : 0, 4) }), medidor: (coste / capMes) * 100, id: 'res-coste' }),
      (() => { const al = alertasTodas(); const c = al.filter((x) => x.sev === 'crit').length; return kpi({ ...alr, id: 'res-alertas', cls: c ? 'crit' : 'warn', valor: String(al.length), sub: `${I18N.t('gob.n_criticas', { n: c })} · ${I18N.t('gob.n_avisos', { n: al.length - c })} · ${origenesTexto(al)}` }); })(),
      (() => { const { T } = estadoCumplimiento(); const p = T.marcos.reduce((a, m) => a + m.cuenta.ambar + m.cuenta.rojo, 0); return conGoto(kpi({ cls: T.global >= 90 ? 'ok' : 'warn', icono: 'thermometer', etiqueta: I18N.t('gob.cumplimiento'), valor: `${T.global} %`, sub: I18N.t('gob.cobertura_de_controles_parciales', { v: p }), medidor: T.global }), 'cumplimiento'); })(),
      (() => { const E = estadoKB(); const ok = E.filter(({ s }) => s.estado === 'ok').length; const r = E.filter(({ s }) => s.estado === 'rojo').length; return conGoto(kpi({ cls: r ? 'crit' : ok < E.length ? 'warn' : 'ok', icono: 'book-open', etiqueta: I18N.t('gob.knowledge_bases'), valor: `${ok} / ${E.length}`, sub: `${I18N.t('gob.kb_sanas')} · ${I18N.t('gob.n_criticas', { n: r })}` }), 'knowledge'); })(),
    ].join('');
    $('agents').innerHTML = agentesPrincipales().map((a) => agentCard(a, false)).join('');
    $('alerts').innerHTML = alertasTodas().map(alertaHtml).join('') || I18N.t('gob.sin_alertas_activas');
    $('res-cumplimiento').innerHTML = resumenCumplimiento();
    $('res-conocimiento').innerHTML = resumenConocimiento();
    // Últimas trazas con sus datos personales y las knowledge bases que usaron (del bloque _gobernanza)
    const gobDe = Object.fromEntries(cmpItems.map((x) => [x.gob.trazabilidad.traza_id, x.gob]));
    $('ultimas').innerHTML = G.trazas.slice(-5).reverse().map((t) => {
      const g = gobDe[t.id];
      const extra = g ? `<td class="tnum">${g.datos_personales.total}${g.datos_personales.categoria_especial_salud ? ` <span class="pill pill-crit" title="${I18N.t('gob.datos_de_salud_rgpd')}">${I18N.t('gob.salud', { categoria_especial_salud: g.datos_personales.categoria_especial_salud })}</span>` : ''}${g.datos_personales.menores ? ` <span class="pill pill-warn">${I18N.t('gob.menor')}</span>` : ''}</td><td class="tnum" title="${esc(g.trazabilidad.conocimiento.map((c) => `${c.kb} ${c.version}`).join(' · '))}">${g.trazabilidad.conocimiento.length}</td>` : I18N.t('gob.texto');
      return rowTraza(t, false).replace(/<\/tr>$/, `${extra}</tr>`);
    }).join('');
    $('h-ultimas').innerHTML = I18N.t('gob.ultimas_trazas', { route: ic('route') });
    $('coste-sub').textContent = I18N.t('gob.dia_linea_discontinua_cap', { capDiario: eur(capDiario(), 0) });
    $('chart-coste').innerHTML = chartCoste();
    $('legend-coste').innerHTML = `<span><i style="background:var(--primary)"></i>${I18N.t('gob.coste_total_dia')}</span><span><i style="background:var(--warn)"></i>${I18N.t('gob.dia_80_del_cap')}</span><span><i style="background:var(--crit);height:2px"></i>${I18N.t('gob.cap_diario_global_cap')}</span>`;
  }

  const ESTADO = { activo: ['pill-ok', 'circle-check', I18N.t('gob.activo')], degradado: ['pill-warn', 'triangle-alert', I18N.t('gob.degradado_gpt_5_mini')], pausado: ['pill-muted', 'pause', I18N.t('gob.pausado')] };
  function agentCard(a, aut) {
    const estado = estadoAgente(a);
    const [pc, pi, pl] = ESTADO[estado] || ESTADO.activo;
    const uso = a.cap_hoy ? a.coste_hoy / a.cap_hoy : 0;
    const lvl = G.niveles[a.nivel] || { nombre: '—', desc: '' };
    const guardrails = G.politicas.filter((p) => p.agente === a.id).map((p) => grRef(p.id)).join(', ') || '—';
    // Icono y nombre grandes arriba; estado y nivel en medio; los datos de detalle al pie, en letra pequeña
    return `<article class="card agent${estado === 'pausado' ? ' is-off' : ''}" data-agente="${esc(a.id)}" role="button" tabindex="0" title="${I18N.t('gob.ver_el_agente_en')}">
      <div class="ag-head"><span class="ag-ico ag-ico-lg">${ic(a.icono || 'cpu')}</span><div class="ag-titulo"><span class="ag-eyebrow">${I18N.t('gob.agente')}</span><strong class="ag-nombre">${esc(a.nombre)}</strong></div>
        <label class="switch${estado === 'pausado' ? ' off' : ''}" title="${estado === 'pausado' ? I18N.t('gob.reanudar_el_agente') : I18N.t('gob.pausar_el_agente_kill')}" data-switch="${esc(a.id)}"><i></i>${ic('power')}</label></div>
      <p class="ag-desc">${esc(a.descripcion || '')}</p>
      <div class="row ag-estado"><span class="pill ${pc}">${ic(pi)} ${pl}</span>${lvlBadge(a.nivel)}<span class="small muted">${esc(lvl.nombre)}</span></div>
      ${aut
        ? `<dl class="ag-det"><dt>${I18N.t('gob.umbral_confianza')}</dt><dd>${conGuardrails(esc(a.umbral || '—'))}</dd><dt>${I18N.t('gob.guardrails')}</dt><dd>${guardrails}</dd><dt>${I18N.t('gob.escalado_14_d')}</dt><dd>${esc(a.escalado_14d || '—')}</dd><dt>${I18N.t('gob.override_14_d')}</dt><dd>${esc(a.override_14d || '—')}</dd></dl>`
        : `<dl class="ag-det"><dt>${I18N.t('gob.modelo')}</dt><dd class="mono">${esc(I18N.dato(a.modelo))}</dd><dt>${I18N.t('gob.prompt')}</dt><dd class="mono">${esc(a.prompt)}</dd><dt>${I18N.t('gob.latencia_p95')}</dt><dd>${ms(a.p95_ms || 0)}</dd><dt>${I18N.t('gob.coste_hoy')}</dt><dd>${eur(a.coste_hoy)} / ${eur(a.cap_hoy, 0)} <span class="${uso >= 1 ? 'delta up' : 'muted'}">(${Math.round(uso * 100)} %)</span><div class="meter" style="--c:${uso >= 1 ? 'var(--crit)' : uso >= .8 ? 'var(--warn)' : 'var(--ok)'}"><i style="width:${Math.min(100, uso * 100)}%"></i></div></dd></dl>`}
    </article>`;
  }

  // Kill switch: pausa / reanuda un agente, lo oscurece y deja rastro en el histórico
  function toggleAgente(id) {
    const a = AG[id]; if (!a) return;
    const nuevo = estadoAgente(a) === 'pausado' ? (a.estado === 'pausado' ? 'activo' : a.estado) : 'pausado';
    estados[id] = nuevo; ssSet('gobierno.estados', estados);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'operacion', sev: nuevo === 'pausado' ? 'warn' : 'ok', agente: id, titulo: `${esPrincipal(id) ? I18N.t('gob.agente_de') : ''}${a.nombre}: ${nuevo === 'pausado' ? I18N.t('gob.pausado_con_el_kill') : 'reanudado'}`, detalle: nuevo === 'pausado' ? I18N.t('gob.los_mensajes_que_dependen') : I18N.t('gob.se_procesa_la_cola'), usuario: I18N.t('gob.operador_esta_sesion') });
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
    const rows = G.trazas.filter((t) => (!fc || t.canal === fc) && (!fd || t.decision === fd) && (!fr || (fr === 'incidencia' ? (t.incidencias || []).length : fr === 'persona' ? t.resultado !== 'auto' : t.resultado === fr)) && (!fa || t.spans.some((s) => s[0] === fa)));
    $(`${pre}-trazas`).innerHTML = rows.length ? rows.map((t) => rowTraza(t, true)).join('') : I18N.t('gob.ninguna_traza_cumple_el');
  }
  function markSel() { document.querySelectorAll('#t-trazas tr, #r-trazas tr, #ultimas tr').forEach((r) => r.classList.toggle('is-sel', r.dataset.id === selId)); }
  function selectTraza(id) { selId = id; markSel(); renderDetalle(); renderSteps(); }

  // ---------------------------------------------------------------------------
  // Ficha de una traza: mismo renderizador para el panel fijo y la modal explicada
  // ---------------------------------------------------------------------------
  function waterfall(t) {
    const total = tr(t).dur;
    return `<div class="spans">${t.spans.map((s) => `<div class="span"><span>${agTag(s[0])}</span><div class="bar" style="--c:${agColor(s[0])}" data-tip="${I18N.t('gob.tokens', { svgAg: esc(svgAg(s[0])), v: ms(s[2]), v2: esc(s[3]), v3: num(s[4] + s[5] + s[6]), spanCost: eur(spanCost(s), 4) })}"><i style="left:${(s[1] / total) * 100}%;width:${Math.max(1.2, (s[2] / total) * 100)}%"></i><em style="left:${Math.min(80, ((s[1] + s[2]) / total) * 100 + 1)}%">${ms(s[2])}</em></div><span class="r mono">${esc(s[3])} · ${num(s[4])}↑ ${num(s[5])}↓${s[6] ? ` ${num(s[6])}⟳` : ''}</span></div>`).join('')}</div>`;
  }

  // Frase explicativa por agente (usa el razonamiento registrado si existe)
  function explicaSpan(t, s, i) {
    const raz = ((G.razonamiento || {})[t.id] || [])[i];
    const tok = s[4] + s[5] + s[6];
    const conModelo = tok ? ` ${I18N.t('gob.con')} <span class="mono">${esc(s[3])}</span> ${I18N.t('gob.en_tokens', { v: ms(s[2]), tok: num(tok), de_razonamiento: s[6] ? I18N.t('gob.de_razonamiento', { v: num(s[6]) }) : '', spanCost: eur(spanCost(s), 4) })}` : I18N.t('gob.en', { v: ms(s[2]), sin_modelo_de_lenguaje: s[3] === 'stt-es' ? I18N.t('gob.transcripcion_de_voz') : I18N.t('gob.sin_modelo_de_lenguaje') });
    const que = { multicanal: I18N.t('gob.normalizo_el_mensaje'), clasificacion: I18N.t('gob.asigno_el_ramo'), extraccion: I18N.t('gob.extrajo_los_datos'), reglas: I18N.t('gob.evaluo_las_reglas_del'), ia: I18N.t('gob.clasifico_extrajo_y_aplico'), local: I18N.t('gob.decidio_con_el_motor') }[s[0]] || I18N.t('gob.proceso_el_mensaje');
    return `<li><span class="ag-ico" style="--c:${agColor(s[0])}">${ic((AG[s[0]] || {}).icono || 'cpu')}</span><div><strong>${agLbl(s[0])}</strong> ${que}${conModelo}.${raz ? ` <span class="muted">${esc(raz.salida)}</span>` : ''}</div></li>`;
  }

  function fichaTraza(t, modo) {
    const m = tr(t);
    const versiones = t.origen ? '—' : agentesPrincipales().map((a) => `${a.id} ${a.prompt}`).join(' · ') || '—';
    const conCmp = cmpItems.some((x) => x.gob.trazabilidad.traza_id === t.id);
    const botones = `<button class="btn btn-sm" type="button" data-goto="replay">${ic('brain')} ${I18N.t('gob.ver_razonamiento')}</button><button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('repeat')} ${I18N.t('gob.replay')}</button>${conCmp ? `<button class="btn btn-sm" type="button" data-cmp-ficha="${esc(t.id)}">${ic('fingerprint')} ${I18N.t('gob.cumplimiento')}</button>` : ''}`;
    const pills = `${ramoPill(t.ramo)} ${decPill(t.decision)} ${resPill(t)}`;
    const datos = `<dl class="kv"><dt>${I18N.t('gob.inicio')}</dt><dd>${new Date(t.inicio).toLocaleString(I18N.locale)}</dd><dt>${I18N.t('gob.canal')}</dt><dd>${canal(t.canal)}</dd><dt>${I18N.t('gob.confianza')}</dt><dd>${pct(t.confianza)}</dd><dt>${I18N.t('gob.guardrail')}</dt><dd>${t.guardrail ? `<span class="policy fail">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span>` : `<span class="policy pass">${ic('check')} ${I18N.t('gob.ninguno_disparado')}</span>`}</dd>${frTraza(t)}<dt>${I18N.t('gob.versiones')}</dt><dd class="mono">${esc(versiones)}</dd>${t.origen ? `<dt>${I18N.t('gob.origen')}</dt><dd>${esc(I18N.dato(t.origen))}</dd>` : ''}<dt>${I18N.t('gob.ciclo_tokens_coste')}</dt><dd>${ms(m.dur)} · ${num(m.tokens)} · ${eur(m.coste, 4)}</dd><dt>${I18N.t('gob.incidencias')}</dt><dd>${(t.incidencias || []).map((i) => `<span class="pill pill-warn">${ic('circle-alert')} ${conGuardrails(esc(i))}</span>`).join(' ') || '<span class="muted">—</span>'}</dd></dl>`;
    const decTxt = (d) => (d === 'DESPEJADO' ? I18N.t('gob.aprobado_2') : I18N.t('gob.a_revisar_2'));
    // Override: una persona cambia una decisión que el agente tomó solo (cuenta para su autonomía).
    // Revisión: una persona resuelve un caso que el agente ya escaló (no es override).
    const override = t.override
      ? `<div class="box" style="border-color:var(--time)"><b>${ic('repeat')} ${I18N.t('gob.override_humano', { usuario: esc(t.override.usuario), fecha: hora(t.override.fecha) })}</b><br>${decTxt(t.override.de)} → ${decTxt(t.override.a)}<br>${t.override.motivo ? `<span class="small">${esc(t.override.motivo)}</span><br>` : ''}<span class="muted small">${I18N.t('gob.el_agente_lo_habia_2')}</span></div>`
      : t.revision
        ? `<div class="box" style="border-color:var(--ok)"><b>${ic('user-check')} ${I18N.t('gob.revision_humana', { usuario: esc(t.revision.usuario), fecha: hora(t.revision.fecha) })}</b><br>${decTxt(t.revision.de)} → ${t.revision.resultado === 'aprobada' ? decTxt('DESPEJADO') : `${decTxt('REVISION')} <span class="small muted">${I18N.t('gob.se_mantiene')}</span>`}<br>${t.revision.motivo ? `<span class="small">${esc(t.revision.motivo)}</span><br>` : ''}<span class="muted small">${I18N.t('gob.no_es_override_el_2', { nota: t.revision.nota ? `${esc(t.revision.nota)} ` : '' })}</span></div>`
        : '';
    if (modo === 'panel') {
      return `<div class="card-head"><h2>${ic('route')} ${esc(t.id)} · ${esc(t.mensaje)} <span class="muted" style="font-weight:400">· ${esc(t.asunto)}</span></h2><div class="row">${pills} ${botones}</div></div>
        <div class="two">
          <div><h3 style="margin-bottom:.5rem">${I18N.t('gob.cadena_de_agentes_waterfall')}</h3>${waterfall(t)}<p class="muted small" style="margin-top:.6rem">${I18N.t('gob.tokens_de_entrada_salida')}</p>${t.motivo ? `<p class="small" style="margin-top:.5rem"><b>${I18N.t('gob.motivo')}</b> ${esc(t.motivo)}</p>` : ''}</div>
          <div class="detail">${datos}${override}</div>
        </div>`;
    }
    // Modal: ficha explicada paso a paso
    const [ci, cl] = canalInfo(t.canal);
    return `<div class="row">${pills} ${botones}</div>
      <div><h3>${I18N.t('gob.que_llego')}</h3><p class="small">${ic(ci)} <b>${esc(t.mensaje)}</b> ${I18N.t('gob.recibido_por', { asunto: esc(t.asunto) })} <b>${esc(cl)}</b> ${I18N.t('gob.procesado_el', { ES: new Date(t.inicio).toLocaleString(I18N.locale) })}</p></div>
      <div><h3>${I18N.t('gob.que_hizo_cada_agente')}</h3><div class="explica"><ul>${t.spans.map((s, i) => explicaSpan(t, s, i)).join('')}</ul></div></div>
      <div><h3>${I18N.t('gob.cadena_de_agentes_waterfall')}</h3>${waterfall(t)}<p class="muted small" style="margin-top:.4rem">${I18N.t('gob.tokens_de_entrada_salida_2', { dur: ms(m.dur), tokens: num(m.tokens), coste: eur(m.coste, 4) })}</p></div>
      <div><h3>${I18N.t('gob.decision')}</h3><p class="small">${I18N.t('gob.con_confianza', { decision: decPill(t.decision), confianza: pct(t.confianza), escalada_a_una_persona_2: t.resultado === 'auto' ? I18N.t('gob.ejecutada_de_forma_autonoma') : t.resultado === 'override' ? I18N.t('gob.ejecutada_de_forma_autonoma_2') : t.revision ? I18N.t('gob.escalada_a_una_persona', { la_mantuvo_en_revision: t.revision.resultado === 'aprobada' ? I18N.t('gob.la_aprobo') : I18N.t('gob.la_mantuvo_en_revision') }) : I18N.t('gob.escalada_a_una_persona_2'), motivo: t.motivo ? ` <b>${I18N.t('gob.motivo')}</b> ${esc(t.motivo)}` : '' })}</p>${t.guardrail ? `<p class="small" style="margin-top:.4rem"><span class="policy fail">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span> <span class="muted">${I18N.t('gob.pasa_el_raton_por')}</span></p>` : ''}</div>
      ${override}
      <div class="two"><div><h3>${I18N.t('gob.datos_de_la_traza')}</h3>${datos}</div><div><h3>${I18N.t('gob.coste')}</h3><div class="kpi-mini"><div class="box"><span class="muted small">${I18N.t('gob.coste')}</span><b>${eur(m.coste, 4)}</b></div><div class="box"><span class="muted small">${I18N.t('gob.tokens_2')}</span><b>${num(m.tokens)}</b></div><div class="box"><span class="muted small">${I18N.t('gob.ciclo')}</span><b>${ms(m.dur)}</b></div></div>${m.coste > 0.05 ? `<p class="small" style="margin-top:.5rem;color:var(--crit)">${ic('triangle-alert')} ${I18N.t('gob.por_encima_del_cap', { CAP: grRef('CAP-04') })}</p>` : ''}</div></div>`;
  }

  function renderDetalle() {
    const t = G.trazas.find((x) => x.id === selId) || G.trazas[G.trazas.length - 1];
    if (!t) { $('traza-detalle').innerHTML = I18N.t('gob.sin_trazas'); return; }
    selId = t.id;
    $('traza-detalle').innerHTML = fichaTraza(t, 'panel');
    $('r-summary-sel').innerHTML = `${I18N.t('gob.seleccionada')} <span class="mono">${esc(t.id)}</span> · ${esc(t.mensaje)}`;
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
    if (!t) { $('steps').innerHTML = I18N.t('gob.sin_trazas'); renderDiff(false); return; }
    if (!steps) {
      $('steps').innerHTML = `<div class="box"><b>${ic('info')} ${esc(t.id)} · ${esc(t.mensaje)}</b><br><span class="small">${I18N.t('gob.esta_traza_no_tiene')}</span>${t.guardrail ? `<br><span class="policy fail" style="margin-top:.4rem">${ic('shield-check')} ${conGuardrails(esc(t.guardrail))}</span>` : ''}</div>`;
      renderDiff(false); return;
    }
    // Resultado guardado del mensaje (citas, campos y criterios): alimenta los gráficos de cada agente si existe
    const guardado = typeof RESULTADOS_GUARDADOS !== 'undefined' && RESULTADOS_GUARDADOS[t.mensaje];
    const r = guardado ? expandirResultadoGuardado(guardado) : null;
    const msg = typeof PAQUETES !== 'undefined' ? PAQUETES.flatMap((p) => p.mensajes).find((m) => m.id === t.mensaje) : null;
    const spanDe = (ag) => t.spans.find((x) => x[0] === ag) || ['', 0, 0, '—', 0, 0, 0];
    $('steps').innerHTML = rzCadena(t, steps, r) + rzLeyenda() + (msg && r ? rzMensaje(msg, r) : '') + steps.map((s) => { const sp = spanDe(s.agente); return `<div class="step" style="--c:${agColor(s.agente)}">
      <div class="h"><span class="ag-ico" style="--c:${agColor(s.agente)}">${ic((AG[s.agente] || {}).icono || 'cpu')}</span><strong>${agLbl(s.agente)}</strong><span class="muted small mono">${I18N.t('gob.tok', { sp: esc(sp[3]), sp2: ms(sp[2]), sp3: num(sp[4] + sp[5] + sp[6]) })}</span></div>
      <div class="io"><div class="box"><span class="muted small">${I18N.t('gob.entrada')}</span><br>${esc(s.entrada)}</div><div class="box"><span class="muted small">${I18N.t('gob.salida')}</span><br>${esc(s.salida)}</div></div>
      ${rzVisual(s, t, r, sp)}
      <ol class="rz-pasos">${s.pasos.map(rzPaso).join('')}</ol>
    </div>`; }).join('');
    renderDiff(false);
  }

  // --- Piezas gráficas del razonamiento registrado -------------------------------------------
  // Tipo de cada paso: explícito ({ tipo, texto }) o deducido del texto registrado
  const RZ_TIPO = {
    cita: ['scan-text', I18N.t('gob.cita_del_mensaje')], inferencia: ['lightbulb', I18N.t('gob.inferencia')], regla: ['list-checks', I18N.t('gob.regla_evaluada')],
    alerta: ['triangle-alert', I18N.t('gob.regla_incumplida')], descarte: ['eye-off', I18N.t('gob.descartado')], privacidad: ['lock', I18N.t('gob.dato_protegido')],
    incidencia: ['refresh-cw', I18N.t('gob.incidencia_tecnica')], decision: ['git-branch', I18N.t('gob.decision')], dato: ['info', I18N.t('gob.dato')],
  };
  const rzTipo = (txt) => {
    if (/INCUMPLE/.test(txt)) return 'alerta';
    if (/^Decisión/.test(txt)) return 'decision';
    if (/\b429\b|reintento|backoff/i.test(txt)) return 'incidencia';
    if (/categoría especial|restring|datos? personales|dato de un menor|interesado distinto|IBAN/i.test(txt)) return 'privacidad';
    if (/^(Descartado|Sin indicios)|no activa|no es un siniestro/i.test(txt)) return 'descarte';
    if (/\b[AHS]\d\b.*\b(cumple|no aplica|no evaluable)/.test(txt)) return 'regla';
    if (/^Indicios/.test(txt)) return 'cita';
    if (/→/.test(txt)) return 'inferencia';
    if (/"[^"]+"/.test(txt)) return 'cita';
    return 'dato';
  };
  // Texto ya escapado: resalta las citas literales y los códigos de regla
  const rzMarcar = (html) => conGuardrails(String(html)
    .replace(/&quot;(.+?)&quot;/g, I18N.t('gob.1'))
    .replace(/\b([AHS]\d)\b(\s+INCUMPLE)?/g, (m, c, inc) => `<span class="rz-cod${inc ? ' ko' : ''}">${c}${inc ? ' incumple' : ''}</span>`)
    .replace(/ → /g, I18N.t('gob.texto_2')));
  function rzPaso(p) {
    const texto = typeof p === 'string' ? p : p.texto;
    const tipo = (typeof p === 'object' && RZ_TIPO[p.tipo]) ? p.tipo : rzTipo(texto);
    return `<li class="rz-p rz-${tipo}"><span class="rz-i" data-tip="${esc(RZ_TIPO[tipo][1])}">${ic(RZ_TIPO[tipo][0])}</span><span>${rzMarcar(esc(texto))}</span></li>`;
  }
  const rzLeyenda = () => `<p class="rz-ley small muted">${['cita', 'inferencia', 'regla', 'alerta', 'descarte', 'privacidad', 'decision'].map((k) => `<span class="rz-${k}"><span class="rz-i">${ic(RZ_TIPO[k][0])}</span>${RZ_TIPO[k][1]}</span>`).join('')}</p>`;

  // Cadena de agentes con lo que pasa de uno a otro; el último nodo lleva el color de la decisión
  function rzCadena(t, steps, r) {
    const conf = (s) => { const c = rzConfianzas(s); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top ? `${top[0]} · ${dec(top[1], 2)}` : s.salida; };
    const pasa = (s) => {
      if (s.agente === 'multicanal') { const m = String(s.entrada).match(/([\d.]+) caracteres/); return m ? `texto · ${m[1]} car.` : I18N.t('gob.texto_normalizado'); }
      if (s.agente === 'clasificacion') return conf(s);
      if (s.agente === 'extraccion' && r) { const v = Object.values(r.datos_extraidos || {}); return `${v.length} campos · ${v.filter(rzNulo).length} nulos`; }
      return PASA[s.agente] || '';
    };
    const nodos = steps.map((s, i) => {
      const sp = t.spans.find((x) => x[0] === s.agente) || ['', 0, 0, '—'];
      const fin = i === steps.length - 1;
      const cls = fin ? (t.decision === 'REVISION' ? ' rv' : ' ok') : '';
      const nodo = `<div class="rz-nodo${cls}" style="--c:${agColor(s.agente)}"><b>${ic((AG[s.agente] || {}).icono || 'cpu')} ${esc(agNombre(s.agente))}</b><span class="mono">${esc(sp[3])} · ${ms(sp[2])}</span>${fin ? `<span class="rz-dec">${t.decision === 'REVISION' ? I18N.t('gob.a_revisar') : I18N.t('gob.aprobado')} · ${pct(t.confianza)}</span>` : `<span class="rz-sal">${esc(pasa(s))}</span>`}</div>`;
      return nodo;
    });
    return `<div class="rz-cadena">${nodos.join('')}</div>`;
  }

  // Mensaje original con las citas que los agentes usaron como evidencia, coloreadas por agente
  function rzMensaje(msg, r) {
    const texto = msg.texto; const bajo = texto.toLowerCase(); const marcas = [];
    (r.evidencias || []).forEach((e) => {
      const i = bajo.indexOf(String(e.cita || '').toLowerCase());
      if (i < 0 || !e.cita || marcas.some((m) => i < m.fin && i + e.cita.length > m.ini)) return;
      const ag = e.ref === 'ramo' ? 'clasificacion' : String(e.ref).startsWith('regla:') ? 'reglas' : 'extraccion';
      marcas.push({ ini: i, fin: i + e.cita.length, ag, tip: `${String(e.ref).replace('regla:', I18N.t('gob.regla'))} · ${e.nota}` });
    });
    marcas.sort((a, b) => a.ini - b.ini);
    let html = ''; let pos = 0;
    marcas.forEach((m) => { html += esc(texto.slice(pos, m.ini)) + `<mark class="rz-m" style="--c:${agColor(m.ag)}" data-tip="${esc(m.tip)}">${esc(texto.slice(m.ini, m.fin))}</mark>`; pos = m.fin; });
    html += esc(texto.slice(pos));
    const n = (ag) => marcas.filter((m) => m.ag === ag).length;
    return `<details class="rz-msg" open><summary>${ic('scan-text')} ${I18N.t('gob.mensaje_original_citas_usadas', { marcas: marcas.length })} <span class="rz-ley-ag">${['clasificacion', 'extraccion', 'reglas'].map((a) => `<span style="--c:${agColor(a)}"><i></i>${esc(agNombre(a))} ${n(a)}</span>`).join('')}</span></summary><p>${html}</p></details>`;
  }

  // Gráfico propio de cada agente
  const rzNulo = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  function rzConfianzas(s) {
    if (s.confianzas) return s.confianzas;
    const p = (s.pasos || []).map((x) => (typeof x === 'string' ? x : x.texto)).find((x) => /Confianza de ramo/.test(x));
    const m = p && p.match(/(\d),(\d+)/); const ramo = (String(s.salida).match(/Ramo = (\w+)/) || [])[1];
    return m && ramo ? { [ramo]: parseFloat(`${m[1]}.${m[2]}`) } : {};
  }
  function rzVisual(s, t, r, sp) {
    if (s.agente === 'multicanal') {
      const stt = (s.pasos || []).join(' ').match(/STT (\d),(\d+)/);
      return stt ? `<div class="rz-vis"><span class="rz-tit">${I18N.t('gob.transcripcion_de_voz_2')}</span>${rzBarra(I18N.t('gob.confianza_stt'), parseFloat(`${stt[1]}.${stt[2]}`), 0.7, I18N.t('gob.minimo_0_7'), 'var(--ag-multicanal)')}</div>` : '';
    }
    if (s.agente === 'clasificacion') {
      const c = Object.entries(rzConfianzas(s)).sort((a, b) => b[1] - a[1]);
      if (!c.length) return '';
      return `<div class="rz-vis"><span class="rz-tit">${I18N.t('gob.confianza_por_ramo')}</span>${c.map(([ramo, v]) => rzBarra(ramo, v, 0.85, I18N.t('gob.g_01_0_85'), `var(--${ramo.toLowerCase()}, var(--muted))`)).join('')}${r && r.criterios_ramo ? `<ul class="rz-cr small">${r.criterios_ramo.map((x) => `<li>${rzMarcar(esc(x))}</li>`).join('')}</ul>` : ''}</div>`;
    }
    if (s.agente === 'extraccion' && r && r.datos_extraidos) return rzCampos(r, t);
    if (s.agente === 'reglas' && r && r.criterios) return rzReglas(r, t, sp);
    return '';
  }
  const rzNum = (v) => numero(Math.round(v * 100) / 100);
  const rzBarra = (lbl, v, umbral, umbralLbl, color) => `<div class="rz-barra"><span>${esc(lbl)}</span><div class="rz-track"><i style="width:${Math.max(0.5, v * 100)}%;background:${color}"></i>${umbral != null ? `<b style="left:${umbral * 100}%" data-tip="${esc(umbralLbl)}"></b>` : ''}</div><span class="mono">${rzNum(v)}</span></div>`;

  const CAMPO_LBL = { nombre_cliente: I18N.t('gob.cliente'), numero_poliza: I18N.t('gob.poliza'), tipo_siniestro: I18N.t('gob.tipo'), fecha_hecho: I18N.t('gob.fecha'), importe_estimado_eur: I18N.t('gob.importe'), lugar: I18N.t('gob.lugar'), terceros_implicados: I18N.t('gob.terceros'), lesionados: I18N.t('gob.lesionados'), documentacion_mencionada: I18N.t('gob.documentacion'), observaciones: I18N.t('gob.observaciones') };
  const ORIGEN = { literal: ['ok', I18N.t('gob.literal')], normalizado: ['time', I18N.t('gob.normalizado')], deducido: ['warn', I18N.t('gob.deducido')], nota: ['review', I18N.t('gob.nota_del_agente')], nulo: ['muted', I18N.t('gob.nulo')] };
  function rzCampos(r, t) {
    const texto = String(((typeof PAQUETES !== 'undefined' && PAQUETES.flatMap((p) => p.mensajes).find((m) => m.id === t.mensaje)) || {}).texto || '').toLowerCase();
    const val = (k, v) => (rzNulo(v) ? '—' : typeof v === 'boolean' ? (v ? 'sí' : 'no') : k === 'importe_estimado_eur' ? eur(v, 0) : Array.isArray(v) ? v.join(', ') : String(v));
    const filas = Object.entries(r.datos_extraidos).map(([k, v]) => {
      const ev = (r.evidencias || []).find((e) => e.ref === k);
      const sv = String(Array.isArray(v) ? v.join(', ') : v).toLowerCase();
      const o = rzNulo(v) ? 'nulo' : k === 'observaciones' ? 'nota' : ev ? (String(ev.cita).toLowerCase().includes(sv) ? 'literal' : 'normalizado') : (typeof v !== 'boolean' && texto.includes(sv) ? 'literal' : 'deducido');
      const tip = ev ? I18N.t('gob.cita', { cita: ev.cita }) : o === 'nulo' ? I18N.t('gob.el_mensaje_no_lo') : o === 'deducido' ? I18N.t('gob.sin_cita_literal_deducido') : '';
      return { k, o, html: `<div class="rz-campo o-${o}"${tip ? ` data-tip="${esc(tip)}"` : ''}><span class="k">${esc(CAMPO_LBL[k] || k)}</span><span class="v">${esc(val(k, v))}</span><span class="pill pill-${ORIGEN[o][0]}">${ORIGEN[o][1]}</span></div>` };
    });
    const cuenta = Object.keys(ORIGEN).map((o) => [o, filas.filter((f) => f.o === o).length]).filter(([, n]) => n);
    return `<div class="rz-vis"><span class="rz-tit">${I18N.t('gob.campos_extraidos_y_de')}</span>
      <div class="rz-stack">${cuenta.map(([o, n]) => `<i class="pill-${ORIGEN[o][0]}" style="flex:${n}" data-tip="${ORIGEN[o][1]}: ${n}">${n}</i>`).join('')}</div>
      <p class="small muted rz-stack-ley">${cuenta.map(([o, n]) => `<span><i class="pill-${ORIGEN[o][0]}"></i>${ORIGEN[o][1]} ${n}</span>`).join('')}</p>
      <div class="rz-campos">${filas.map((f) => f.html).join('')}</div></div>`;
  }

  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const RES = { cumple: ['ok', 'check', 'cumple'], incumple: ['crit', 'x', 'incumple'], no_aplica: ['muted', 'minus', I18N.t('gob.no_aplica')] };
  function rzReglas(r, t, sp) {
    const C = r.criterios; const por = (k) => C.filter((c) => c.resultado === k);
    const inc = por('incumple');
    const matriz = C.map((c) => { const [cls, i] = RES[c.resultado] || RES.no_aplica; return `<span class="rz-regla pill pill-${cls}" data-tip="${esc(`${c.regla} · ${c.descripcion} — ${c.evidencia}`)}">${ic(i)} ${esc(c.regla)}</span>`; }).join('');
    const detalle = inc.map((c) => `<div class="rz-inc">${ic('triangle-alert')}<div><b>${I18N.t('gob.incumple', { regla: esc(c.regla) })}</b> · ${esc(c.descripcion)}<br><span class="small">${rzMarcar(esc(c.evidencia))}</span></div></div>`).join('');
    const arbol = `<div class="rz-arbol">
      <span class="pill pill-ok">${pl(por('cumple').length, 'cumple', 'cumplen')}</span><span class="pill pill-crit">${pl(inc.length, 'incumple', 'incumplen')}</span><span class="pill pill-muted">${pl(por('no_aplica').length, I18N.t('gob.no_aplica'), I18N.t('gob.no_aplican'))}</span>
      <span class="rz-fl">→</span><span class="small">${I18N.t('gob.alguna_incumple')} <b>${inc.length ? I18N.t('gob.si', { regla: inc.map((c) => esc(c.regla)).join(', ') }) : I18N.t('gob.no')}</b></span>
      <span class="rz-fl">→</span>${decPill(r.decision)}<span class="small">${I18N.t('gob.confianza_2', { confianza: pct(r.confianza) })}</span></div>`;
    // Tokens de la llamada: entrada, salida y razonamiento frente al cap de razonamiento (CAP-05)
    const cap = ((G.caps || []).find((c) => c.id === 'CAP-05') || {}).limite;
    const tot = Math.max(1, sp[4] + sp[5] + sp[6]);
    const tok = sp[4] ? `<span class="rz-tit" style="margin-top:.6rem">${I18N.t('gob.tokens_de_la_llamada')}</span><div class="rz-stack rz-tok">${[['in', sp[4], I18N.t('gob.entrada')], ['out', sp[5], I18N.t('gob.salida')], ['raz', sp[6], I18N.t('gob.razonamiento')]].filter(([, n]) => n).map(([k, n, l]) => `<i class="t-${k}" style="flex:${n / tot}" data-tip="${l}: ${num(n)}"></i>`).join('')}</div>
      <p class="small muted rz-stack-ley"><span><i class="t-in"></i>${I18N.t('gob.entrada_2', { sp: num(sp[4]) })}</span><span><i class="t-out"></i>${I18N.t('gob.salida_2', { sp: num(sp[5]) })}</span>${sp[6] ? `<span${cap && sp[6] > cap ? ' class="rz-sobre"' : ''}><i class="t-raz"></i>${I18N.t('gob.razonamiento_2', { sp: num(sp[6]), cap: cap ? ` / ${conGuardrails('CAP-05')} ${num(cap)}` : '' })}</span>` : ''}</p>` : '';
    return `<div class="rz-vis"><span class="rz-tit">${I18N.t('gob.reglas_evaluadas')}</span><div class="rz-chips">${matriz}</div>${detalle}${arbol}${r.motivo ? `<p class="small" style="margin:.4rem 0 0"><b>${I18N.t('gob.motivo')}</b> ${esc(r.motivo)}</p>` : ''}${tok}</div>`;
  }

  // Replay simulado: «idéntico» reproduce la decisión; «what-if» estima coste/latencia con otro modelo o prompt de Reglas
  function renderDiff(run) {
    const t = G.trazas.find((x) => x.id === selId);
    if (!t) { $('rp-diff').innerHTML = ''; return; }
    const m = tr(t);
    const whatif = $('rp-modo').value === 'whatif'; const modelo = $('rp-modelo').value.split(' ')[0]; const prompt = $('rp-prompt').value.split(' ')[0];
    if (!run) { $('rp-diff').innerHTML = `<div class="box" style="grid-column:1/-1"><b>${ic('info')} ${I18N.t('gob.replay_de', { id: esc(t.id), mensaje: esc(t.mensaje) })}</b><br><span class="small">${I18N.t('gob.el_replay_vuelve_a')} <b>${I18N.t('gob.identico')}</b> ${I18N.t('gob.verifica_que_la_decision')} <b>${I18N.t('gob.what_if')}</b> ${I18N.t('gob.permite_cambiar_el_modelo')}</span></div>`; return; }
    const chg = whatif && (modelo !== 'gpt-5' || prompt !== 'v2.3');
    const factor = !chg ? 1 : modelo === 'gpt-5-mini' ? .18 : modelo === 'gpt-5-nano' ? .04 : .82;
    const lat = !chg ? 1.06 : modelo === 'gpt-5-mini' ? .59 : modelo === 'gpt-5-nano' ? .45 : .88;
    const cambia = chg && modelo === 'gpt-5-nano' && t.decision === 'REVISION';
    const dec2 = cambia ? 'DESPEJADO' : t.decision;
    const motivo2 = !chg ? I18N.t('gob.identico_al_original') : cambia ? I18N.t('gob.gpt_5_nano_no') : prompt === 'v2.4' ? I18N.t('gob.misma_decision_el_motivo') : I18N.t('gob.misma_decision_y_mismas');
    const d = (v) => `<span class="delta ${Math.abs(v) < .005 ? 'same' : v < 0 ? 'down' : 'up'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} %</span>`;
    $('rp-diff').innerHTML = `
      <div class="box"><h4>${I18N.t('gob.original', { inicio: hora(t.inicio) })}</h4><dl class="kv"><dt>${I18N.t('gob.ramo')}</dt><dd>${ramoPill(t.ramo)}</dd><dt>${I18N.t('gob.decision')}</dt><dd>${decPill(t.decision)}</dd><dt>${I18N.t('gob.confianza')}</dt><dd>${pct(t.confianza)}</dd><dt>${I18N.t('gob.coste')}</dt><dd>${eur(m.coste, 4)}</dd><dt>${I18N.t('gob.ciclo')}</dt><dd>${ms(m.dur)}</dd><dt>${I18N.t('gob.reglas_modelo')}</dt><dd class="mono">${I18N.t('gob.gpt_5_v2_3')}</dd></dl></div>
      <div class="box" style="border-color:${cambia ? 'var(--crit)' : 'var(--ok)'}"><h4>${I18N.t('gob.replay_ahora', { modo: whatif ? 'what-if' : I18N.t('gob.modo_identico') })}</h4><dl class="kv"><dt>${I18N.t('gob.ramo')}</dt><dd>${ramoPill(t.ramo)} <span class="delta same">${I18N.t('gob.igual_2')}</span></dd><dt>${I18N.t('gob.decision')}</dt><dd>${decPill(dec2)} ${cambia ? I18N.t('gob.distinta') : I18N.t('gob.igual')}</dd><dt>${I18N.t('gob.confianza')}</dt><dd>${pct(cambia ? .71 : chg ? Math.max(0, t.confianza - .02) : t.confianza)}</dd><dt>${I18N.t('gob.coste')}</dt><dd>${eur(m.coste * factor, 4)} ${d(factor - 1)}</dd><dt>${I18N.t('gob.ciclo')}</dt><dd>${ms(Math.round(m.dur * lat))} ${d(lat - 1)}</dd><dt>${I18N.t('gob.reglas_modelo')}</dt><dd class="mono">${esc(modelo)} · ${esc(prompt)}</dd></dl><p class="small" style="margin-top:.5rem"><b>${I18N.t('gob.motivo')}</b> ${conGuardrails(esc(motivo2))}</p>${cambia ? `<p class="small" style="color:var(--crit)"><b>${ic('triangle-alert')} ${I18N.t('gob.regresion')}</b> ${I18N.t('gob.el_cambio_no_es')}</p>` : ''}</div>`;
  }

  function renderReplays() {
    const delta = (v) => `<span class="delta ${v < -0.01 ? 'down' : v > 0.01 ? 'up' : 'same'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} %</span>`;
    $('replays').innerHTML = (G.replays || []).map((r) => `<tr><td class="mono">${esc(r.id)}</td><td class="tnum">${fechaHora(r.fecha)}</td><td class="mono">${esc(r.traza)}</td><td>${esc(r.modo)}</td><td>${esc(r.cambio)}</td><td><span class="delta same">${esc(r.ramo)}</span></td><td>${String(r.decision).startsWith('DISTINTA') ? `<span class="delta up">${esc(r.decision)}</span>` : `<span class="delta same">${esc(r.decision)}</span>`}</td><td>${delta(r.dcoste)}</td><td>${delta(r.dlat)}</td><td>${esc(r.usuario)}</td></tr>`).join('') || I18N.t('gob.sin_replays_registrados');
  }

  // ---------------------------------------------------------------------------
  // Autonomía (niveles, agentes, auditoría) y ficha modal del agente
  // ---------------------------------------------------------------------------
  const CAMBIO_ICON = { nivel: 'sliders-horizontal', modelo: 'cpu', prompt: 'file-text', guardrail: 'shield-check', incidencia: 'activity' };
  function renderAutonomia() {
    $('kpis-aut').innerHTML = G.kpis.autonomia.map(kpi).join('');
    $('levels').innerHTML = G.niveles.map((l) => `<div class="level l${l.n}"><b>${lvlBadge(l.n, l.desc)} ${esc(l.nombre)}</b><span class="muted">${esc(l.desc)}</span><span class="small">${agentesPrincipales().filter((a) => a.nivel === l.n).map((a) => agTag(a.id)).join(' ') || I18N.t('gob.sin_agentes')}</span></div>`).join('');
    $('cambios').innerHTML = (G.cambios_autonomia || []).map((c, i) => `<tr class="clickable" data-cambio="${i}" tabindex="0"><td class="tnum">${fechaHora(c.fecha)}</td><td>${agTag(c.agente)}</td><td>${c.de === c.a ? `${lvlBadge(c.a)} <span class="muted small">${I18N.t('gob.sin_cambio')}</span>` : `${lvlBadge(c.de)} → ${lvlBadge(c.a)}`}</td><td class="wrap">${c.pendiente ? I18N.t('gob.pendiente_de_aprobacion') : ''}${conGuardrails(esc(c.motivo))}</td><td>${esc(c.usuario)}</td></tr>`).join('');
  }

  // Identidad del agente: quién es, con qué credencial actúa, quién responde de él y qué puede tocar
  function identidadAgente(a) {
    const idn = a.identidad;
    if (!idn) return `<div><h3>${ic('badge-check')} ${I18N.t('gob.identidad_y_permisos')}</h3><p class="muted small">${I18N.t('gob.sin_identidad_registrada_para')}</p></div>`;
    const lista = (xs, icono, cls) => `<ul class="permisos">${(xs || []).map((x) => `<li class="${cls}">${ic(icono)} ${esc(x)}</li>`).join('')}</ul>`;
    return `<div><h3>${ic('badge-check')} ${I18N.t('gob.identidad_y_permisos_2', { eiopa: normas('dora-9', 'rgpd-25', 'eiopa') })}</h3><div class="tw"><table class="identidad"><tbody>
      <tr><th>${I18N.t('gob.identidad')}</th><td class="mono">${esc(idn.id)}</td><th>${I18N.t('gob.responsable')}</th><td>${esc(idn.responsable)}</td></tr>
      <tr><th>${I18N.t('gob.credencial')}</th><td>${esc(idn.credencial)}</td><th>${I18N.t('gob.proveedor_y_region')}</th><td>${esc(idn.proveedor)}</td></tr>
      <tr><th>${I18N.t('gob.datos_que_trata')}</th><td colspan="3">${esc(idn.datos)}</td></tr>
      <tr><th>${I18N.t('gob.puede')}</th><td>${lista(idn.puede, 'check', 'si')}</td><th>${I18N.t('gob.no_puede')}</th><td>${lista(idn.no_puede, 'x', 'no')}</td></tr>
    </tbody></table></div></div>`;
  }

  // ---------------------------------------------------------------------------
  // Agentes: una pestaña por agente (en el orden de la cadena) con su ficha completa en el propio panel
  // ---------------------------------------------------------------------------
  let agSel = ssGet('gobierno.agente', 'multicanal'); let agEjemplo = null;
  const PASA = { multicanal: I18N.t('gob.texto_normalizado'), clasificacion: I18N.t('gob.ramo_indicios'), extraccion: I18N.t('gob.10_campos') };
  // Contrato de entrada y salida: qué recibe y qué devuelve cada agente (esquema resumido)
  const CONTRATO = {
    multicanal: { entrada: [['canal', I18N.t('gob.email_web_chat_whatsapp')], ['contenido', I18N.t('gob.asunto_y_cuerpo_campos')], ['adjuntos', I18N.t('gob.lista_de_ficheros_fotos')]],
      salida: [['id', I18N.t('gob.texto_msg')], ['canal', 'texto'], ['fecha_recepcion', I18N.t('gob.fecha_iso')], ['remitente', I18N.t('gob.texto_3')], ['asunto', 'texto'], ['texto', I18N.t('gob.texto_normalizado_sin_emojis')]] },
    clasificacion: { entrada: [['id', 'texto'], ['canal', 'texto'], ['texto', I18N.t('gob.texto_normalizado')]],
      salida: [['ramo', I18N.t('gob.auto_hogar_salud_indeterminado')], ['criterios_ramo', I18N.t('gob.lista_de_cita_literal')], ['confianza', I18N.t('gob.numero_0_1_por')]] },
    extraccion: { entrada: [['texto', I18N.t('gob.texto_normalizado')], ['ramo', I18N.t('gob.el_que_asigno_clasificacion')]],
      salida: [['nombre_cliente', I18N.t('gob.texto_null')], ['numero_poliza', I18N.t('gob.texto_null')], ['tipo_siniestro', I18N.t('gob.texto_null')], ['fecha_hecho', I18N.t('gob.aaaa_mm_dd_null')], ['importe_estimado_eur', I18N.t('gob.numero_null')], ['lugar', I18N.t('gob.texto_null')], ['terceros_implicados', I18N.t('gob.si_no')], ['lesionados', I18N.t('gob.si_no')], ['documentacion_mencionada', I18N.t('gob.lista_de_textos')], ['observaciones', I18N.t('gob.texto_null')]] },
    reglas: { entrada: [['datos_extraidos', I18N.t('gob.los_10_campos_de')], ['ramo', 'texto'], [I18N.t('gob.bloque_de_reglas'), `prompts.js · ${PROMPT_VERSION}`], [I18N.t('gob.knowledge_bases_2'), I18N.t('gob.condicionados_cuadro_medico_red')]],
      salida: [['criterios', I18N.t('gob.lista_de')], ['evidencias', I18N.t('gob.lista_de_5_a')], ['decision', I18N.t('gob.despejado_revision')], ['motivo', I18N.t('gob.texto_maximo_200_caracteres')], ['confianza', I18N.t('gob.numero_0_1')]] },
  };
  const INCID_AG = { multicanal: /STT|transcrip/i, clasificacion: /G-0[36]/, extraccion: /429|CAP-06/, reglas: /CAP-0[45]|razonamiento/i };
  const pctil = (xs, p) => { if (!xs.length) return 0; const o = [...xs].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.ceil(p * o.length) - 1)]; };

  function verAgente(id) {
    if (!AG[id]) return;
    cerrarTodos(); agSel = id; ssSet('gobierno.agente', id); agEjemplo = null;
    goto('agentes'); renderAgentes();
  }

  function datosAgente(a) {
    const spans = G.trazas.flatMap((t) => t.spans.filter((s) => s[0] === a.id).map((s) => ({ t, s })));
    const dur = spans.map(({ s }) => s[2]);
    const tok = spans.reduce((acc, { s }) => [acc[0] + s[4], acc[1] + s[5], acc[2] + s[6]], [0, 0, 0]);
    const coste = spans.reduce((acc, { s }) => acc + spanCost(s), 0);
    const guard = new Set(G.politicas.filter((p) => p.agente === a.id).map((p) => p.id));
    const escaladas = spans.filter(({ t }) => (String(t.guardrail || '').match(/G-\d{2}/g) || []).some((g) => guard.has(g)));
    const incid = spans.filter(({ t }) => (t.incidencias || []).some((i) => INCID_AG[a.id] && INCID_AG[a.id].test(i)));
    const k = G.agentes.findIndex((x) => x.id === a.id);
    const serie = G.diario.slice(-14).map((d) => d[2][k] || 0);
    return { spans, p50: pctil(dur, 0.5), p95: pctil(dur, 0.95), tok, coste, escaladas, incid, serie };
  }

  // Métricas de calidad propias de cada agente, calculadas sobre las trazas y sus bloques _gobernanza
  // Índice de calidad del agente: media de las filas medibles, en un círculo de porcentaje con el color del semáforo
  function calidadIndice(Q) {
    const ps = Q.filter((q) => q.p != null).map((q) => q.p);
    if (!ps.length) return '';
    const v = Math.round(ps.reduce((s, x) => s + x, 0) / ps.length);
    const r = 30; const L = 2 * Math.PI * r; const c = colorPct(v);
    const txt = v >= 90 ? I18N.t('gob.calidad_alta') : v >= 70 ? I18N.t('gob.calidad_a_vigilar') : I18N.t('gob.calidad_baja');
    return `<div class="ag-q-ring"><svg viewBox="0 0 76 76" width="76" height="76" aria-hidden="true"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(L * v) / 100} ${L}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" style="font-size:17px;font-weight:800;fill:${c}">${v}%</text></svg>
      <div><b style="color:${c}">${txt}</b><span class="muted small">${I18N.t('gob.indice_de_calidad_media', { ps: ps.length, confianza_3: ps.length > 2 ? I18N.t('gob.confianza_3') : '' })}</span></div></div>`;
  }

  function calidadAgente(a) {
    const items = cmpItems;
    const esperado = Object.fromEntries(PAQUETES.flatMap((p) => p.mensajes).map((m) => [m.id, m.esperado || {}]));
    const n = items.length || 1;
    // p: porcentaje de la fila (0-100) cuando se puede medir; entra en el índice de calidad del agente
    const fila = (l, v, s, ok, p = null) => ({ l, v, s, ok, p: p == null ? null : Math.max(0, Math.min(100, Math.round(p))) });
    if (a.id === 'multicanal') {
      const canales = {}; items.forEach((x) => { const c = x.entry.mensaje.canal; canales[c] = (canales[c] || 0) + 1; });
      return [fila(I18N.t('gob.mensajes_normalizados'), `${items.length}/${items.length}`, I18N.t('gob.al_formato_unico_sin'), true, 100), fila(I18N.t('gob.canales'), Object.entries(canales).map(([c, v]) => `${canalInfo(c)[1]} ${v}`).join(' · '), I18N.t('gob.el_canal_no_cambia'), true), fila(I18N.t('gob.datos_personales_transportados'), num(items.reduce((s, x) => s + x.gob.datos_personales.total, 0)), I18N.t('gob.solo_los_transporta_no'), true)];
    }
    if (a.id === 'clasificacion') {
      const ok = items.filter((x) => !esperado[x.entry.id].ramo || esperado[x.entry.id].ramo === x.entry.ramo).length;
      const desc = items.filter((x) => x.gob.explicabilidad.descartados.length >= 2).length;
      const ramos = {}; items.forEach((x) => { ramos[x.entry.ramo] = (ramos[x.entry.ramo] || 0) + 1; });
      return [fila(I18N.t('gob.acierto_de_ramo_frente'), `${ok}/${items.length}`, `${Math.round((ok / n) * 100)} %`, ok === items.length, (ok / n) * 100), fila(I18N.t('gob.ramos_descartados_explicados'), `${desc}/${items.length}`, I18N.t('gob.por_que_no_es'), desc === items.length, (desc / n) * 100), fila(I18N.t('gob.reparto'), Object.entries(ramos).map(([r, v]) => `${r} ${v}`).join(' · '), I18N.t('gob.auto_hogar_salud'), true)];
    }
    if (a.id === 'extraccion') {
      const campos = ['nombre_cliente', 'numero_poliza', 'tipo_siniestro', 'fecha_hecho', 'importe_estimado_eur', 'lugar'];
      const llenos = items.reduce((s, x) => s + campos.filter((c) => x.entry.datos_extraidos[c] != null).length, 0);
      const nulos = items.reduce((s, x) => s + campos.filter((c) => x.entry.datos_extraidos[c] == null).length, 0);
      const evDatos = items.reduce((s, x) => s + Evidencias.construir(x.texto, x.entry.evidencias, x.entry).lista.filter((e) => e.verificada && e.ref !== 'ramo' && !e.ref.startsWith('regla:')).length, 0);
      return [fila(I18N.t('gob.campos_clave_extraidos'), `${Math.round((llenos / (campos.length * n)) * 100)} %`, I18N.t('gob.de', { llenos, items: campos.length * items.length }), true, (llenos / (campos.length * n)) * 100), fila(I18N.t('gob.campos_en_nulo_no'), num(nulos), I18N.t('gob.nunca_se_inventan_msg'), true), fila(I18N.t('gob.evidencias_de_datos_verificadas'), dec2(evDatos / n), I18N.t('gob.por_mensaje_citas_literales'), evDatos / n >= 4, (evDatos / n / 4) * 100)];
    }
    const ok = items.filter((x) => esperado[x.entry.id].revision == null || esperado[x.entry.id].revision === (x.entry.decision === 'REVISION')).length;
    const conf = items.reduce((s, x) => s + (x.entry.confianza || 0), 0) / n;
    const inc = {}; items.forEach((x) => (x.entry.criterios || []).filter((c) => c.resultado === 'incumple').forEach((c) => { inc[c.regla] = (inc[c.regla] || 0) + 1; }));
    const ov = G.trazas.filter((t) => t.resultado === 'override').length;
    const ovAlta = G.trazas.filter((t) => t.resultado === 'override' && t.confianza >= 0.85).length;
    return [fila(I18N.t('gob.acierto_de_la_decision'), `${ok}/${items.length}`, `${Math.round((ok / n) * 100)} %`, ok === items.length, (ok / n) * 100), fila(I18N.t('gob.confianza_media'), dec2(conf), I18N.t('gob.umbral_g_01_0'), conf >= 0.85, conf * 100), fila(I18N.t('gob.evidencias_verificadas'), dec2(items.reduce((s, x) => s + x.gob.explicabilidad.evidencias_verificadas, 0) / n), I18N.t('gob.por_decision_minimo_5'), true, (items.reduce((s, x) => s + x.gob.explicabilidad.evidencias_verificadas, 0) / n / 5) * 100), fila(I18N.t('gob.reglas_que_mas_frenan'), Object.entries(inc).sort((x, y) => y[1] - x[1]).map(([r, v]) => `${r} ×${v}`).join(' · ') || '—', I18N.t('gob.en_el_periodo'), true), fila(I18N.t('gob.overrides_humanos'), num(ov), I18N.t('gob.decisiones_tomadas_solas_y'), ov <= 1), fila(I18N.t('gob.overrides_con_confianza_alta'), num(ovAlta), I18N.t('gob.el_agente_estaba_seguro'), ovAlta === 0)];
  }

  // Ejemplo real de lo que recibe y devuelve el agente, sacado de una traza del Paquete A
  function ejemploAgente(a, x) {
    const e = x.entry; const m = e.mensaje;
    if (a.id === 'multicanal') return { id: m.id, canal: m.canal, fecha_recepcion: m.fecha_recepcion, remitente: m.remitente, asunto: m.asunto, texto: `${m.texto.slice(0, 160)}…` };
    if (a.id === 'clasificacion') return { ramo: e.ramo, criterios_ramo: e.criterios_ramo, confianza: e.confianza };
    if (a.id === 'extraccion') return { datos_extraidos: e.datos_extraidos };
    return { criterios: (e.criterios || []).filter((c) => c.resultado === 'incumple').concat((e.criterios || []).filter((c) => c.resultado !== 'incumple').slice(0, 2)), evidencias: (e.evidencias || []).slice(0, 3), decision: e.decision, motivo: e.motivo, confianza: e.confianza };
  }

  function renderAgentes() {
    const ags = agentesPrincipales();
    if (!AG[agSel]) agSel = ags[0] && ags[0].id;
    $('ag-tabs').innerHTML = ags.map((a, i) => {
      const est = estadoAgente(a); const [pc] = ESTADO[est] || ESTADO.activo; const uso = a.cap_hoy ? a.coste_hoy / a.cap_hoy : 0;
      return `${i ? `<span class="ag-pasa" aria-hidden="true">${ic('arrow-right')}<small>${esc(PASA[ags[i - 1].id] || '')}</small></span>` : ''}<button type="button" class="ag-tab${a.id === agSel ? ' is-active' : ''}" role="tab" aria-selected="${a.id === agSel}" data-ag-tab="${esc(a.id)}" >
        <span class="ag-ico">${ic(a.icono || 'cpu')}</span><span class="ag-tab-txt"><b>${esc(a.nombre)}</b><span class="small"><span class="pill ${pc}" style="padding:.05rem .4rem">${esc((ESTADO[est] || ESTADO.activo)[2].replace(/ \(.*\)/, ''))}</span> ${lvlBadge(a.nivel)} <span class="muted">${eur(a.coste_hoy)} / ${eur(a.cap_hoy, 0)}</span></span><span class="meter" style="--c:${uso >= 1 ? 'var(--crit)' : uso >= 0.8 ? 'var(--warn)' : 'var(--ok)'}"><i style="width:${Math.min(100, uso * 100)}%"></i></span></span></button>`;
    }).join('');
    const a = AG[agSel]; if (!a) { $('ag-ficha').innerHTML = ''; return; }
    const est = estadoAgente(a); const [pc, pi, pl] = ESTADO[est] || ESTADO.activo;
    const lvl = G.niveles[a.nivel] || { nombre: '—', desc: '' };
    const D = datosAgente(a); const Q = calidadAgente(a);
    const uso = a.cap_hoy ? a.coste_hoy / a.cap_hoy : 0;
    const hist = [...(a.historial || [])].sort((x, y) => y.fecha.localeCompare(x.fecha));
    const tl = (items) => (items.length ? `<ul class="mini-tl">${items.map((h) => `<li><span class="t">${fechaHora(h.fecha)}</span><span class="ico">${ic(CAMBIO_ICON[h.tipo] || 'info')}</span><div><b>${esc({ nivel: I18N.t('gob.nivel'), modelo: I18N.t('gob.modelo'), prompt: I18N.t('gob.prompt'), guardrail: I18N.t('gob.guardrail') }[h.tipo] || I18N.t('gob.incidencia'))}: ${conGuardrails(esc(h.de))} → ${conGuardrails(esc(h.a))}</b><small>${conGuardrails(esc(h.motivo))} · ${esc(h.usuario)}</small></div></li>`).join('')}</ul>` : I18N.t('gob.sin_registros'));
    const caja = (l, v, s) => `<div class="box"><span class="muted small">${l}</span><b>${v}</b>${s ? `<small class="muted">${s}</small>` : ''}</div>`;
    const caps = G.caps.filter((c) => c.ambito === a.nombre || (a.id === 'reglas' && c.id === 'CAP-04'));
    const kbs = (G.knowledge || GOBIERNO_DEMO.knowledge || []).filter((k) => (k.agentes || []).includes(a.id));
    const recos = (G.recomendaciones || []).filter((r) => `${r.titulo} ${r.detalle}`.includes(a.nombre));
    // Datos personales que ve el agente: los dos primeros, el texto completo; Extracción y Reglas, solo los campos extraídos
    const cats = {};
    cmpItems.forEach((x) => {
      if (a.id === 'multicanal' || a.id === 'clasificacion') Object.entries(x.gob.datos_personales.por_categoria).forEach(([c, v]) => { cats[c] = (cats[c] || 0) + v; });
      else Object.values(Cumplimiento.camposSensibles(x.entry)).forEach((c) => { cats[c] = (cats[c] || 0) + 1; });
    });
    if (!agEjemplo || !cmpItems[agEjemplo]) agEjemplo = Math.max(0, cmpItems.findIndex((x) => x.entry.id === 'MSG-A-12'));
    const ej = cmpItems[agEjemplo];
    const raz = ej && ((G.razonamiento || {})[ej.gob.trazabilidad.traza_id] || []).find((r) => r.agente === a.id);
    const C = CONTRATO[a.id] || { entrada: [], salida: [] };
    const tablaC = (xs) => `<table class="kv-tabla"><tbody>${xs.map(([k, v]) => `<tr><th class="mono">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;

    $('ag-ficha').innerHTML = `
      <div class="card ag-cab">
        <div class="ag-cab-top"><span class="ag-ico ag-ico-xl">${ic(a.icono || 'cpu')}</span>
          <div><h2>${agLbl(a.id)}</h2><p class="small muted">${esc(a.descripcion || '')}</p>
            <div class="row" style="margin-top:.4rem"><span class="pill ${pc}">${ic(pi)} ${pl}</span>${lvlBadge(a.nivel)}<span class="small muted">${esc(lvl.nombre)} · ${esc(lvl.desc || '')}</span><span class="small muted">${I18N.t('gob.responsable_2', { responsable: esc((a.identidad || {}).responsable || '—') })}</span></div></div>
          <label class="switch${est === 'pausado' ? ' off' : ''}" title="${est === 'pausado' ? I18N.t('gob.reanudar_el_agente') : I18N.t('gob.pausar_el_agente_kill')}" data-switch="${esc(a.id)}"><i></i>${ic('power')} ${est === 'pausado' ? I18N.t('gob.pausado') : I18N.t('gob.kill_switch')}</label></div>
        <div class="kpi-mini">
          ${caja(I18N.t('gob.modelo'), `<span class="mono">${esc(I18N.dato(a.modelo))}</span>`)}${caja(I18N.t('gob.prompt'), `<span class="mono">${esc(a.prompt)}</span>`)}
          ${caja(I18N.t('gob.trazas_del_periodo'), num(D.spans.length), `${num(D.tok[0] + D.tok[1] + D.tok[2])} tokens`)}
          ${caja(I18N.t('gob.latencia_p50_p95'), `${ms(D.p50)} / ${ms(D.p95)}`, `p95 declarado ${ms(a.p95_ms || 0)}`)}
          ${caja(I18N.t('gob.coste_hoy_cap'), `${eur(a.coste_hoy || 0)} / ${eur(a.cap_hoy || 0, 0)}`, `<span class="meter" style="--c:${uso >= 1 ? 'var(--crit)' : uso >= 0.8 ? 'var(--warn)' : 'var(--ok)'}"><i style="width:${Math.min(100, uso * 100)}%"></i></span>`)}
          ${caja(I18N.t('gob.coste_medio_por_traza'), eur(D.spans.length ? D.coste / D.spans.length : 0, 4))}
          ${caja(I18N.t('gob.escalado_14_d'), esc(a.escalado_14d || '—'), I18N.t('gob.por_sus_guardrails', { escaladas: D.escaladas.length, trazas: D.escaladas.length === 1 ? 'traza' : 'trazas' }))}
          ${caja(I18N.t('gob.override_14_d'), esc(a.override_14d || '—'))}
        </div>
      </div>
      <div class="two">
        <div class="card">${identidadAgente(a)}</div>
        <div class="card"><h3>${ic('sliders-horizontal')} ${I18N.t('gob.configuracion_y_variables')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.variable')}</th><th>${I18N.t('gob.valor')}</th><th>${I18N.t('gob.efecto')}</th></tr></thead><tbody>${(a.variables || []).map((v) => `<tr><td><b>${esc(v.nombre)}</b></td><td class="wrap">${conGuardrails(esc(v.valor))}</td><td class="wrap">${conGuardrails(esc(v.efecto))}</td></tr>`).join('') || I18N.t('gob.sin_variables_registradas')}</tbody></table></div>
          <h3 style="margin-top:1rem">${ic('shield-check')} ${I18N.t('gob.guardrails_y_caps_que')}</h3>
          <p class="small">${G.politicas.filter((p) => p.agente === a.id).map((p) => `${grRef(p.id)} <span class="muted">${I18N.t('gob.disparos', { disparos: num(p.disparos) })}</span>${politicaActiva(p) ? '' : I18N.t('gob.inactivo')}`).join(' · ') || I18N.t('gob.ningun_guardrail')}</p>
          <p class="small" style="margin-top:.3rem">${caps.map((c) => `<a href="#" data-cap="${esc(c.id)}" class="mono">${esc(c.id)}</a> <span class="muted">${esc(I18N.dato(c.tipo))}</span> <span class="pill ${capEstadoDe(c) === 'superado' ? 'pill-crit' : capEstadoDe(c) === 'aviso' ? 'pill-warn' : 'pill-ok'}">${capEstadoDe(c)}</span>`).join(' · ') || I18N.t('gob.sin_caps_propios_le')}</p></div>
      </div>
      <div class="two">
        <div class="card"><h3>${ic('activity')} ${I18N.t('gob.rendimiento_y_coste')}</h3>
          <div class="ag-serie"><span class="muted small">${I18N.t('gob.coste_diario_14_dias', { reduce: eur(D.serie.reduce((s, v) => s + v, 0)) })}</span>${sparkSvg(D.serie, 'var(--primary)')}</div>
          <div class="kpi-mini" style="margin-top:.6rem">${caja(I18N.t('gob.tokens_de_entrada'), num(D.tok[0]))}${caja(I18N.t('gob.tokens_de_salida'), num(D.tok[1]))}${caja(I18N.t('gob.razonamiento'), num(D.tok[2]))}</div>
          <h3 style="margin-top:1rem">${I18N.t('gob.comportamiento_segun_el_modelo')}</h3><div class="tw tabla-compacta"><table><thead><tr><th>${I18N.t('gob.modelo')}</th><th>${I18N.t('gob.periodo')}</th><th>${I18N.t('gob.precision')}</th><th>${I18N.t('gob.escalado')}</th><th>${I18N.t('gob.override')}</th><th>${I18N.t('gob.coste_msg')}</th><th>${I18N.t('gob.p95')}</th></tr></thead><tbody>${(a.modelos || []).map((mo) => `<tr><td class="mono">${esc(I18N.dato(mo.modelo))}</td><td>${esc(mo.periodo)}</td><td>${esc(mo.precision)}</td><td class="tnum">${esc(mo.escalado)}</td><td class="tnum">${esc(mo.override)}</td><td class="tnum">${esc(mo.coste_msg)}</td><td class="tnum">${ms(mo.p95_ms)}</td></tr>`).join('') || I18N.t('gob.sin_datos_por_modelo')}</tbody></table></div>
          ${recos.length ? `<div class="box" style="margin-top:.8rem">${ic('lightbulb')} <b>${I18N.t('gob.finops')}</b> ${recos.map((r) => `${esc(r.titulo)}. <span class="muted">${esc(r.detalle)}</span>`).join(' ')}</div>` : ''}</div>
        <div class="card"><h3>${ic('badge-check')} ${I18N.t('gob.calidad_paquete_a')}</h3>
          ${calidadIndice(Q)}
          <div class="tw ag-q-tabla"><table><tbody>${Q.map((q) => `<tr><td>${esc(q.l)}${q.p != null ? `<div class="ag-q-bar" style="--c:${colorPct(q.p)}" title="${q.p} %"><i style="width:${q.p}%"></i></div>` : ''}</td><td class="tnum"><b style="color:${q.ok ? 'var(--ok)' : 'var(--warn)'}">${esc(q.v)}</b></td><td class="muted small wrap">${esc(q.s)}</td></tr>`).join('')}</tbody></table></div>
          <h3 style="margin-top:1rem">${ic('circle-alert')} ${I18N.t('gob.incidencias')}</h3>
          ${D.incid.length ? `<ul class="kb-acc-lista">${D.incid.map(({ t }) => `<li><a href="#" class="mono" data-traza="${esc(t.id)}">${esc(t.id)}</a> ${esc(t.mensaje)} · ${conGuardrails(esc((t.incidencias || []).join(' · ')))}</li>`).join('')}</ul>` : I18N.t('gob.sin_incidencias_en_el')}</div>
      </div>
      <div class="two">
        <div class="card"><h3>${ic('book-open')} ${I18N.t('gob.knowledge_bases_que_consume')}</h3>${kbs.length ? `<ul class="ag-kbs">${kbs.map((k) => `<li data-kb="${esc(k.id)}" tabindex="0" role="button"><span class="mono">${esc(k.id)}</span> <b>${esc(k.nombre)}</b> <span class="muted small">${I18N.t('gob.v', { version: esc(k.version) })}</span> ${saludPill(saludKB(k).estado)}${k.simulada ? I18N.t('gob.simulada') : ''}</li>`).join('')}</ul>` : I18N.t('gob.no_consulta_knowledge_bases')}</div>
        <div class="card"><h3>${ic('fingerprint')} ${I18N.t('gob.datos_personales_que_trata', { rgpd: normas(...(cats.salud ? ['rgpd-9', 'rgpd-5c'] : ['rgpd-5c', 'rgpd-25'])) })}</h3><p class="small">${esc((a.identidad || {}).datos || '')}</p>
          <p class="small" style="margin-top:.4rem">${Object.entries(cats).map(([c, v]) => `<span class="pill pill-muted" data-tip="${esc(Cumplimiento.CATEGORIAS[c].tratamiento)}"><span class="pii-dot pii-${c}"></span> ${esc(Cumplimiento.CATEGORIAS[c].etiqueta)} · ${v}</span>`).join(' ') || I18N.t('gob.ninguno')}</p>
          <p class="muted small" style="margin-top:.4rem">${I18N.t('gob.detalle_por_mensaje_en', { solo_ve_los_campos: a.id === 'multicanal' || a.id === 'clasificacion' ? I18N.t('gob.recibe_el_texto_completo') : I18N.t('gob.solo_ve_los_campos') })} <a href="#" data-goto="cumplimiento">${I18N.t('gob.termometro_de_cumplimiento')}</a>.</p></div>
      </div>
      <div class="two">
        <div class="card"><h3>${ic('sliders-horizontal')} ${I18N.t('gob.historico_de_autonomia')}</h3>${tl(hist.filter((h) => h.tipo === 'nivel' || h.tipo === 'guardrail'))}</div>
        <div class="card"><h3>${ic('history')} ${I18N.t('gob.cambios_de_modelo_prompt')}</h3>${tl(hist.filter((h) => h.tipo === 'modelo' || h.tipo === 'prompt' || h.tipo === 'incidencia'))}</div>
      </div>
      <div class="card"><div class="card-head"><h3>${ic('route')} ${I18N.t('gob.ultimas_trazas_del_agente')}</h3><button class="btn btn-sm" type="button" data-goto="trazas">${I18N.t('gob.abrir_trazabilidad')}</button></div>
        <div class="tw"><table><thead><tr><th>${I18N.t('gob.traza')}</th><th>${I18N.t('gob.mensaje')}</th><th>${I18N.t('gob.inicio_del_paso')}</th><th>${I18N.t('gob.duracion')}</th><th>${I18N.t('gob.modelo')}</th><th>${I18N.t('gob.tokens_2')}</th><th>${I18N.t('gob.coste')}</th><th>${I18N.t('gob.decision_final')}</th></tr></thead><tbody>${D.spans.slice(-6).reverse().map(({ t, s }) => `<tr class="clickable" data-traza="${esc(t.id)}" tabindex="0"><td class="mono">${esc(t.id)}</td><td>${esc(t.mensaje)}</td><td class="tnum">+${ms(s[1])}</td><td class="tnum">${ms(s[2])}</td><td class="mono">${esc(s[3])}</td><td class="tnum">${num(s[4])}↑ ${num(s[5])}↓${s[6] ? ` ${num(s[6])}⟳` : ''}</td><td class="tnum">${eur(spanCost(s), 4)}</td><td>${decPill(t.decision)}</td></tr>`).join('')}</tbody></table></div></div>
      <details class="card ag-contrato"><summary><h3>${ic('braces')} ${I18N.t('gob.contrato_de_entrada_y')} <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">${I18N.t('gob.para_perfiles_tecnicos_que')}</span></h3></summary>
        <div class="two" style="margin-top:.8rem"><div><h3>${I18N.t('gob.recibe')}</h3>${tablaC(C.entrada)}</div><div><h3>${I18N.t('gob.devuelve')}</h3>${tablaC(C.salida)}</div></div>
        ${ej ? `<div style="margin-top:1rem"><div class="row" style="margin-bottom:.5rem"><h3>${I18N.t('gob.ejemplo_real')}</h3><label class="f">${I18N.t('gob.traza')}<select id="ag-ejemplo">${cmpItems.map((x, i) => `<option value="${i}"${i === agEjemplo ? ' selected' : ''}>${esc(x.gob.trazabilidad.traza_id)} · ${esc(x.entry.id)} · ${esc(x.entry.ramo)}</option>`).join('')}</select></label></div>
          ${raz ? `<p class="small"><b>${I18N.t('gob.entrada_3')}</b> ${esc(raz.entrada)}</p><ul class="small" style="margin:.3rem 0 .5rem 1.1rem">${raz.pasos.map((p) => `<li>${conGuardrails(esc(p))}</li>`).join('')}</ul><p class="small"><b>${I18N.t('gob.salida_3')}</b> ${esc(raz.salida)}</p>` : ''}
          <pre class="raw-json" style="margin-top:.5rem">${Cumplimiento.jsonHtml(ejemploAgente(a, ej), { sensibles: Cumplimiento.camposSensibles(ej.entry) })}</pre></div>` : ''}
      </details>`;
    ajustarAgentes();
  }


  // ---------------------------------------------------------------------------
  // Guardrails
  // ---------------------------------------------------------------------------
  const SEV = { humano: I18N.t('gob.escala_a_persona'), degradar: I18N.t('gob.degrada_el_modelo'), marcar: I18N.t('gob.marca_la_traza') };
  function renderGuardrails() {
    const P = G.politicas;
    const activos = P.filter(politicaActiva).length;
    const disparos = P.reduce((a, p) => a + (p.disparos || 0), 0);
    const escaladosGr = P.filter((p) => p.severidad === 'humano').reduce((a, p) => a + (p.disparos || 0), 0);
    $('kpis-gr').innerHTML = [
      kpi({ cls: 'ok', icono: 'shield-check', etiqueta: I18N.t('gob.guardrails_activos'), valor: `${activos} / ${P.length}`, sub: `${P.length - activos} inactivo${P.length - activos === 1 ? '' : 's'}` }),
      kpi({ cls: 'review', icono: 'bell', etiqueta: I18N.t('gob.disparos_en_14_dias'), valor: num(disparos), sub: I18N.t('gob.escalados_a_persona_resto', { escaladosGr: num(escaladosGr) }) }),
      conGoto(kpi({ cls: 'time', icono: 'user-check', etiqueta: I18N.t('gob.escalan_a_una_persona'), valor: I18N.t('gob.de_2', { humano: P.filter((p) => p.severidad === 'humano').length, P: P.length }), sub: I18N.t('gob.guardrails_que_pasa_despues') }), 'hitl'),
      kpi({ cls: 'primary', icono: 'gauge', etiqueta: I18N.t('gob.mas_disparado'), valor: [...P].sort((x, y) => y.disparos - x.disparos)[0]?.id || '—', sub: [...P].sort((x, y) => y.disparos - x.disparos)[0]?.condicion || '' }),
    ].join('');
    $('policies').innerHTML = P.map((p) => { const max = Math.max(1, ...(p.disparos_dia || [1])); const activa = politicaActiva(p); return `<tr class="clickable${activa ? '' : ' muted'}" data-gr="${esc(p.id)}" tabindex="0"><td class="mono"><b>${esc(p.id)}</b>${p.nuevo ? I18N.t('gob.nuevo') : ''}</td><td>${agTag(p.agente)}</td><td class="wrap">${esc(p.condicion)}<br><small class="muted">${conGuardrails(esc(p.descripcion || ''))}</small></td><td class="wrap">${esc(p.accion)}</td><td><span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span></td><td><span class="tnum" style="display:inline-block;min-width:2.2rem"><b>${num(p.disparos)}</b></span> <span class="bars" style="--c:${agColor(p.agente)}" data-tip="${I18N.t('gob.disparos_por_dia_ultimos', { disparos_dia: (p.disparos_dia || []).join(' · ') })}">${(p.disparos_dia || []).map((v) => `<i style="height:${Math.max(2, (v / max) * 18)}px"></i>`).join('')}</span></td><td><label class="switch${activa ? '' : ' off'}" data-guardrail="${esc(p.id)}" title="${activa ? I18N.t('gob.desactivar') : I18N.t('gob.activar')} ${esc(p.id)}"><i></i>${activa ? I18N.t('gob.activo') : I18N.t('gob.inactivo_2')}</label></td></tr>`; }).join('');
    const ultimos = P.flatMap((p) => (p.ultimos || []).map(([f, traza, res]) => ({ f, id: p.id, agente: p.agente, traza, res }))).sort((x, y) => y.f.localeCompare(x.f));
    $('h-disparos').innerHTML = I18N.t('gob.ultimos_disparos', { history: ic('history') });
    $('disparos').innerHTML = ultimos.map((u) => { const tid = (u.traza.match(/TRZ-[0-9A-Z]+/) || [])[0]; const existe = tid && G.trazas.some((t) => t.id === tid); return `<tr><td class="tnum">${fechaHora(u.f)}</td><td>${grRef(u.id)}</td><td>${agTag(u.agente)}</td><td class="mono">${existe ? `<button class="btn btn-sm" type="button" data-traza="${esc(tid)}">${ic('route')} ${esc(u.traza)}</button>` : esc(u.traza)}</td><td>${esc(u.res)}</td></tr>`; }).join('') || I18N.t('gob.sin_disparos_registrados');
  }
  function toggleGuardrail(id) {
    const p = G.politicas.find((x) => x.id === id); if (!p) return;
    const nuevo = !politicaActiva(p); grOverrides[id] = nuevo;
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: nuevo ? 'ok' : 'warn', agente: p.agente, titulo: `${p.id} ${nuevo ? 'activado' : 'desactivado'}: ${p.condicion}`, detalle: nuevo ? I18N.t('gob.vuelve_a_aplicarse', { accion: p.accion }) : I18N.t('gob.deja_de_aplicarse_hasta', { accion: p.accion }), usuario: I18N.t('gob.operador_esta_sesion') });
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_diario_total_frente')}">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      <path d="${area}" fill="var(--primary)" opacity=".1"/>
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - pr}" y="${ys(cap) - 5}" text-anchor="end" style="fill:var(--crit);font-weight:700">${I18N.t('gob.cap', { cap: eur(cap, 0) })}</text>
      <path d="${line}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${costeDia(D[i]) >= cap * .8 ? 'var(--warn)' : 'var(--primary)'}" stroke="var(--surface)" stroke-width="2"/><rect x="${p[0] - 18}" y="${pt}" width="36" height="${H - pt - pb}" fill="transparent" data-tip="${I18N.t('gob.mensajes', { D: fecha(D[i][0]), D2: eur(costeDia(D[i])), D3: num(D[i][1]) })}"/>`).join('')}
      <text x="${last[0]}" y="${last[1] - 10}" text-anchor="end" style="fill:var(--text);font-weight:700">${I18N.t('gob.hoy_parcial', { D: eur(costeDia(D[D.length - 1])) })}</text>
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_diario_apilado_por')}">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      ${D.map((d, i) => { let acc = 0; const segs = d[2].map((v, k) => [ids[k], v]).filter(([id]) => !ocultos.has(id)); return segs.map(([id, v], k) => { const y0 = ys(acc), y1 = ys(acc + v); acc += v; const top = k === segs.length - 1; return `<rect x="${xs(i) - bw / 2}" y="${y1 + (top ? 0 : 1)}" width="${bw}" height="${Math.max(0, y0 - y1 - 1)}" rx="${top ? 3 : 0}" fill="${agColor(id)}" data-tip="${I18N.t('gob.de_3', { fecha: fecha(d[0]), id: esc(svgAg(id)), v: eur(v), vis: eur(vis(d)) })}"/>`; }).join(''); }).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      ${D.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  const TOK = [['in', I18N.t('gob.entrada'), 'var(--primary)'], ['out', I18N.t('gob.salida'), 'var(--ag-clasificacion)'], ['reasoning', I18N.t('gob.razonamiento'), 'var(--ag-extraccion)']];
  function chartTokens() {
    const tot = G.agentes.filter((a) => !ocultos.has(a.id)).map((a) => { const s = G.trazas.flatMap((t) => t.spans.filter((x) => x[0] === a.id)); return [a, [s.reduce((v, x) => v + x[4], 0), s.reduce((v, x) => v + x[5], 0), s.reduce((v, x) => v + x[6], 0)].map((v, k) => (tokOcultos.has(TOK[k][0]) ? 0 : v))]; }).filter((t) => t[1][0] + t[1][1] + t[1][2] > 0);
    if (!tot.length) return I18N.t('gob.sin_tokens_que_mostrar');
    const W = 640, rowH = 44, H = 14 + tot.length * rowH, pl = 210, pr = 60, max = Math.max(...tot.map((t) => t[1][0] + t[1][1] + t[1][2]));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.tokens_del_lote_por')}">
      ${tot.map(([a, vals], i) => { const y = 14 + i * rowH; let acc = 0; const segs = vals.map((v, k) => [k, v]).filter(([, v]) => v > 0); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(svgAg(a.id).length > 30 ? `${svgAg(a.id).slice(0, 28)}…` : svgAg(a.id))}</text>${segs.map(([k, v], j) => { const x0 = xs(acc); acc += v; const w = Math.max(0, xs(acc) - x0 - 2); return `<rect x="${x0}" y="${y}" width="${w}" height="22" rx="${j === segs.length - 1 ? 4 : 0}" fill="${TOK[k][2]}" data-tip="${I18N.t('gob.tokens_3', { id: esc(svgAg(a.id)), TOK: TOK[k][1], v: num(v) })}"/>`; }).join('')}<text x="${xs(acc) + 6}" y="${y + 15}" class="tnum">${I18N.t('gob.k', { replace: dec(acc / 1000, 1) })}</text>`; }).join('')}
    </svg>`;
  }

  // Coste por modelo apilado por agente (barras horizontales)
  function chartModelos() {
    const M = (G.modelos || []).map((mo) => [mo, Object.entries(mo.coste_por_agente || {}).filter(([id]) => !ocultos.has(id))]).filter(([, segs]) => segs.length);
    if (!M.length) return I18N.t('gob.sin_modelos_que_mostrar');
    const W = 640, rowH = 40, H = 14 + M.length * rowH, pl = 100, pr = 70, max = Math.max(...M.map(([, segs]) => segs.reduce((a, [, v]) => a + v, 0)));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_de_14_dias')}">
      ${M.map(([mo, segs], i) => { const y = 14 + i * rowH; let acc = 0; return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600" class="mono">${esc(mo.id)}</text>${segs.map(([id, v], j) => { const x0 = xs(acc); acc += v; const w = Math.max(0, xs(acc) - x0 - 2); return `<rect x="${x0}" y="${y}" width="${w}" height="22" rx="${j === segs.length - 1 ? 4 : 0}" fill="${agColor(id)}" data-tip="${esc(mo.id)} · ${esc(svgAg(id))}: ${eur(v)}"/>`; }).join('')}<text x="${xs(acc) + 6}" y="${y + 15}" class="tnum">${eur(acc, 0)}</text>`; }).join('')}
    </svg>`;
  }

  // Tokens por modelo (entrada / salida / razonamiento, en millones)
  function chartModelosTok() {
    const M = (G.modelos || []).filter((mo) => mo.tokens && (mo.tokens.in + mo.tokens.out + mo.tokens.reasoning) > 0);
    const keys = TOK.filter(([k]) => !tokOcultos.has(k));
    if (!M.length || !keys.length) return I18N.t('gob.sin_tokens_que_mostrar');
    const W = 640, H = 220, pl = 44, pr = 16, pt = 14, pb = 28, n = M.length;
    const max = Math.max(...M.flatMap((mo) => keys.map(([k]) => mo.tokens[k]))) / 1e6;
    const ymax = Math.max(1, Math.ceil(max * 1.1));
    const gw = (W - pl - pr) / n, bw = Math.min(22, (gw * .7) / keys.length);
    const ys = (v) => pt + (1 - v / ymax) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.tokens_por_modelo_en')}">
      <g class="grid">${[0, .25, .5, .75, 1].map((f) => { const v = Math.round(ymax * f * 10) / 10; return `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${I18N.t('gob.m', { v })}</text>`; }).join('')}</g>
      ${M.map((mo, i) => { const cx = pl + gw * (i + .5); const x0 = cx - (bw * keys.length + 2 * (keys.length - 1)) / 2; return keys.map(([k, label, color], j) => { const v = mo.tokens[k] / 1e6; return `<rect x="${x0 + j * (bw + 2)}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${color}" data-tip="${I18N.t('gob.tokens_4', { id: esc(mo.id), label, tokens: num(mo.tokens[k]) })}"/>`; }).join('') + `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="mono">${esc(mo.id)}</text>`; }).join('')}
    </svg>`;
  }

  function renderCharts() {
    const ids = G.agentes.slice(0, 4);
    $('chart-stack').innerHTML = chartStack();
    $('legend-stack').innerHTML = ids.map((a) => legendBtn(a.id, 'agente', agColor(a.id), a.nombre, agLbl(a.id))).join('') + `<span><i style="background:var(--crit);height:2px"></i>${I18N.t('gob.cap_diario_global')}</span>`;
    $('chart-tokens').innerHTML = chartTokens();
    $('legend-tokens').innerHTML = TOK.map(([k, l, c]) => legendBtn(k, 'token', c, l)).join('');
    $('chart-modelos').innerHTML = chartModelos();
    $('legend-modelos').innerHTML = ids.map((a) => legendBtn(a.id, 'agente', agColor(a.id), a.nombre, agLbl(a.id))).join('');
    $('chart-modelos-tok').innerHTML = chartModelosTok();
    $('legend-modelos-tok').innerHTML = TOK.map(([k, l, c]) => legendBtn(k, 'token', c, l)).join('');
  }

  // FinOps · bajo los KPI: cómo va el gasto de cada agente (A) y dónde se va el dinero y por qué (B)
  function chartFinAgentes() {
    const D = diarioVisible(), n = D.length, total = D.reduce((s, d) => s + costeDia(d), 0) || 1;
    const filas = G.agentes.slice(0, 4).map((a, k) => { const v = D.map((d) => d[2][k] || 0); return { a, v, suma: v.reduce((s, x) => s + x, 0) }; }).sort((x, y) => y.suma - x.suma);
    const W = 220, H = 60, pt = 6, pb = 4;
    return filas.map(({ a, v, suma }) => {
      const cap = a.cap_hoy, hoy = v[n - 1], sobre = cap != null && hoy > cap, color = agColor(a.id);
      const ymax = Math.max(cap || 0, ...v) * 1.12 || 1;
      const xs = (i) => (n > 1 ? 4 + (i / (n - 1)) * (W - 8) : W / 2), ys = (x) => pt + (1 - x / ymax) * (H - pt - pb);
      const pts = v.map((x, i) => `${xs(i).toFixed(1)},${ys(x).toFixed(1)}`).join(' ');
      return `<div class="fa-fila${sobre ? ' sobre' : ''}" data-ver-agente="${esc(a.id)}" role="button" tabindex="0" title="${I18N.t('gob.abrir_la_ficha_de', { id: esc(svgAg(a.id)) })}">
        <div class="fa-ag">${agLbl(a.id)}<span class="small tnum ${sobre ? 'fa-crit' : 'muted'}">${I18N.t('gob.hoy', { hoy: eur(hoy), cap: cap != null ? ` / ${eur(cap, 0)}` : '' })}</span></div>
        <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_diario_de_frente', { id: esc(svgAg(a.id)) })}">
          <polygon points="${xs(0)},${ys(0)} ${pts} ${xs(n - 1)},${ys(0)}" fill="${color}" opacity=".12"/>
          ${cap != null ? `<line x1="0" x2="${W}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1" stroke-dasharray="4 3"/>` : ''}
          <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
          ${v.map((x, i) => `<circle cx="${xs(i)}" cy="${ys(x)}" r="${i === n - 1 ? 4 : 2.2}" fill="${cap != null && x > cap ? 'var(--crit)' : color}" data-tip="${fecha(D[i][0])} · ${esc(svgAg(a.id))}: ${eur(x)}${cap != null ? I18N.t('gob.de_su_cap', { cap: Math.round((x / cap) * 100) }) : ''}"/>`).join('')}
        </svg>
        <div class="fa-tot"><b class="tnum">${eur(suma)}</b><span class="small muted tnum">${I18N.t('gob.del_total', { total: Math.round((suma / total) * 100) })}</span></div>
      </div>`;
    }).join('');
  }

  // Coste de cada agente por tipo de token: tokens_por_agente × precios (razonamiento a precio de salida).
  // Lo que el modelo no cobra por tokens (la voz, por minuto) o lo que no trae desglose va en su propio tramo.
  const COSTE_TIPO = [...TOK, ['voz', I18N.t('gob.transcripcion_de_voz_2'), 'var(--muted)'], ['otro', I18N.t('gob.sin_desglose_por_tokens'), 'var(--grid)']];
  let finModo = 'eur';
  function costePorTipo() {
    const out = {};
    (G.modelos || []).forEach((mo) => {
      const p = G.precios[mo.id] || { in: 0, out: 0 };
      Object.entries(mo.coste_por_agente || {}).forEach(([id, c]) => {
        const o = out[id] = out[id] || { tipos: {}, tokens: {}, modelos: [] };
        o.modelos.push(mo.id);
        const t = (mo.tokens_por_agente || {})[id];
        let resto = c;
        if (t) [['in', p.in], ['out', p.out], ['reasoning', p.out]].forEach(([k, pr]) => { const v = ((t[k] || 0) / 1e6) * pr; o.tipos[k] = (o.tipos[k] || 0) + v; o.tokens[k] = (o.tokens[k] || 0) + (t[k] || 0); resto -= v; });
        if (resto > 0.005) { const k = /^stt/.test(mo.id) ? 'voz' : 'otro'; o.tipos[k] = (o.tipos[k] || 0) + resto; }
      });
    });
    return out;
  }
  function chartFinPorque() {
    const C = costePorTipo();
    const filas = G.agentes.filter((a) => C[a.id]).map((a) => ({ a, c: C[a.id], suma: Object.values(C[a.id].tipos).reduce((s, v) => s + v, 0) })).sort((x, y) => y.suma - x.suma);
    if (!filas.length) return I18N.t('gob.el_dataset_no_trae');
    const max = Math.max(...filas.map((f) => f.suma));
    const recos = G.recomendaciones || [];
    return filas.map(({ a, c, suma }, i) => {
      const tipos = COSTE_TIPO.filter(([k]) => c.tipos[k] > 0);
      const segs = tipos.map(([k, l, color]) => { const v = c.tipos[k], share = v / suma, w = finModo === 'pct' ? share * 100 : (v / max) * 100; const lbl = w >= 11 ? (finModo === 'pct' ? `${Math.round(share * 100)} %` : eur(v, v < 10 ? 2 : 0)) : ''; return `<i class="bar-h" style="--i:${i};width:${w}%;background:${color}${k === 'otro' ? ';color:var(--muted)' : ''}" data-tip="${I18N.t('gob.de_su_coste', { id: esc(svgAg(a.id)), v: l, v2: eur(v), share: Math.round(share * 100), tokens: c.tokens[k] ? ` · ${num(c.tokens[k])} tokens` : '' })}">${lbl}</i>`; }).join('');
      const [k0, l0] = tipos.reduce((m, t) => (c.tipos[t[0]] > c.tipos[m[0]] ? t : m), tipos[0]);
      const porque = I18N.t('gob.de_su_coste_2', { l0, suma: Math.round((c.tipos[k0] / suma) * 100), se_paga_por_minuto: c.tokens[k0] ? ` · ${dec(c.tokens[k0] / 1e6, 1)} M tokens` : k0 === 'voz' ? I18N.t('gob.se_paga_por_minuto') : '' });
      const palabra = a.nombre.split(' ')[0];
      const chips = recos.filter((r) => `${r.titulo} ${r.detalle}`.includes(palabra)).map((r) => `<button class="pill pill-time fp-reco" type="button" data-ir-reco="${esc(r.id)}" title="${esc(r.titulo)}">${ic('lightbulb')} ${esc(r.id)}</button>`).join('');
      return `<div class="fp-fila">
        <div class="fa-ag">${agLbl(a.id)}<span class="small muted mono">${c.modelos.map(esc).join(' + ')}</span></div>
        <div class="fp-bar">${segs}</div>
        <b class="tnum fp-tot">${eur(suma)}</b>
        <div class="fp-por small muted">${porque}${chips}</div>
      </div>`;
    }).join('');
  }
  function renderFinGraf() {
    $('fin-agentes').innerHTML = chartFinAgentes();
    $('fin-modo').innerHTML = [['eur', '€'], ['pct', I18N.t('gob.de_cada_agente')]].map(([k, l]) => `<button type="button" class="seg-btn" data-fin-modo="${k}" aria-pressed="${finModo === k}">${l}</button>`).join('');
    $('fin-porque').innerHTML = chartFinPorque();
    const C = costePorTipo();
    $('legend-porque').innerHTML = COSTE_TIPO.filter(([k]) => Object.values(C).some((c) => c.tipos[k] > 0)).map(([, l, color]) => `<span><i style="background:${color}"></i>${l}</span>`).join('');
  }

  // ---------------------------------------------------------------------------
  // FinOps: KPI, caps, modelos, recomendaciones
  // ---------------------------------------------------------------------------
  const CAP_ESTADO = { ok: ['pill-ok', 'check', I18N.t('gob.dentro')], aviso: ['pill-warn', 'circle-alert', I18N.t('gob.aviso_80')], superado: ['pill-crit', 'triangle-alert', I18N.t('gob.superado')] };
  const capRow = (c) => { const u = c.consumo / c.limite; const [pc, pi, pl] = CAP_ESTADO[c.estado] || CAP_ESTADO.ok; const f = (v) => (c.unidad === '€' ? eur(v, v < 1 ? 3 : 2) : `${num(v)} ${esc(c.unidad)}`); return `<tr class="clickable" data-cap="${esc(c.id)}" tabindex="0" title="${I18N.t('gob.ver_el_detalle_de', { id: esc(c.id) })}"><td class="mono"><b>${esc(c.id)}</b>${c.nuevo ? I18N.t('gob.nuevo') : ''}</td><td>${ambitoHtml(c)}</td><td>${esc(I18N.dato(c.tipo))}</td><td class="tnum">${f(c.limite)}</td><td class="tnum">${f(c.consumo)}</td><td><div class="meter" style="--c:${u >= 1 ? 'var(--crit)' : u >= .8 ? 'var(--warn)' : 'var(--ok)'};margin:0"><i style="width:${Math.min(100, u * 100)}%"></i></div><span class="small muted tnum">${Math.round(u * 100)} %</span></td><td class="wrap">${conGuardrails(esc(c.accion))}</td><td>${((n) => (n ? `<button class="pill pill-warn cap-chip" type="button" data-ir-alerta="${esc(c.id)}" title="${I18N.t('gob.ver_la_alerta_de', { id: esc(c.id) })}">${ic('bell')} ${n}</button>` : '<span class="muted">—</span>'))(alertasDeCap(c.id).length)}</td><td><span class="pill ${pc}">${ic(pi)} ${pl}</span></td></tr>`; };
  // Escenario de ahorro (ahorro.js): hipótesis del dataset (`kpis.negocio`), editables en la ficha sin guardarse
  let ahorroEdit = {};
  const ahorroParams = () => ({ ...((G.kpis && G.kpis.negocio) || {}), ...ahorroEdit });
  const ahorroDe = (dias, p = ahorroParams()) => Ahorro.calcular({ mensajes: dias.reduce((a, d) => a + d[1], 0), autonomia: datosResumen().pAut, costeIA: dias.reduce((a, d) => a + costeDia(d), 0), dias: dias.length }, p);
  const meur = (v) => (Math.abs(v) >= 1e6 ? `${dec(v / 1e6, 2)} M€` : eur(v, 0));
  function renderFinops() {
    const dias = diarioVisible(), hoy = G.diario[G.diario.length - 1], cap = capDiario();
    const totalMsgs = dias.reduce((a, d) => a + d[1], 0), coste = dias.reduce((a, d) => a + costeDia(d), 0);
    const porAgente = G.agentes.slice(0, 4).map((a, k) => [a.id, dias.reduce((s, d) => s + (d[2][k] || 0), 0)]);
    const reparto = porAgente.sort((a, b) => b[1] - a[1]).map(([id, v]) => `<span class="agn"><span class="pre"></span>${esc(AG[id].nombre.split(' ')[0])}</span> ${Math.round((v / coste) * 100)} %`).join(' · ');
    const superados = G.caps.filter((c) => c.estado === 'superado');
    $('kpis-fin').innerHTML = [
      kpi({ cls: 'warn', icono: 'euro', etiqueta: I18N.t('gob.coste_hoy_parcial'), valor: eur(costeDia(hoy)), sub: I18N.t('gob.del_cap_diario_mensajes', { cap: Math.round((costeDia(hoy) / cap) * 100), cap2: eur(cap, 0), hoy: num(hoy[1]) }), medidor: (costeDia(hoy) / cap) * 100, id: 'coste-hoy' }),
      kpi({ ...G.kpis.finops[0], id: 'coste-mensual' }),
      kpi({ ...G.kpis.finops[1], id: 'caps-superados', valor: String(superados.length), ...(capsNuevos.some((c) => c.estado === 'superado') ? { sub: superados.map((c) => c.id).join(' · ') } : {}) }),
      kpi({ cls: 'time', icono: 'cpu', etiqueta: I18N.t('gob.coste_medio_por_mensaje'), valor: eur(totalMsgs ? coste / totalMsgs : 0, 4), subHtml: reparto, id: 'coste-medio' }),
      ((a) => kpi({ cls: 'ok', icono: 'banknote', etiqueta: I18N.t('gob.ahorro_estimado'), valor: eur(a.neto, 0), sub: I18N.t('gob.al_ano_mensajes_automatizados', { anual: meur(a.anual), automatizados: num(a.automatizados), retorno: num(Math.round(a.retorno)) }), id: 'ahorro' }))(ahorroDe(dias)),
    ].join('');
    $('caps').innerHTML = G.caps.map(capRow).join('');
    renderCorrectivas();
    renderFinGraf();
    const totalModelos = (G.modelos || []).reduce((a, mo) => a + (mo.coste || 0), 0);
    $('modelos').innerHTML = (G.modelos || []).map((mo) => { const p = G.precios[mo.id]; const share = totalModelos ? mo.coste / totalModelos : 0; return `<tr><td class="mono"><b>${esc(mo.id)}</b></td><td>${esc(mo.proveedor)}</td><td class="tnum">${p ? I18N.t('gob.por_m', { in: eur(p.in), out: eur(p.out) }) : '—'}</td><td>${(mo.agentes || []).map(agTag).join('<br>')}</td><td class="tnum">${num(mo.llamadas)}</td><td class="tnum">${I18N.t('gob.m_m_m', { replace: dec(mo.tokens.in / 1e6, 1), replace2: dec(mo.tokens.out / 1e6, 1), replace3: dec(mo.tokens.reasoning / 1e6, 1) })}</td><td class="tnum"><b>${eur(mo.coste)}</b></td><td><div class="meter" style="--c:var(--primary);margin:0"><i style="width:${share * 100}%"></i></div><span class="small muted tnum">${Math.round(share * 100)} %</span></td><td class="tnum">${ms(mo.p95_ms)}</td><td class="tnum">${esc(mo.exito.json_valido)}</td><td class="tnum">${esc(mo.exito.sin_reintento)}</td><td class="tnum">${esc(mo.exito.estable_replay)}</td><td>${esc(mo.exito.precision)}</td></tr>`; }).join('') || I18N.t('gob.sin_modelos_en_el');
    renderCharts();
    $('recos').innerHTML = (G.recomendaciones || []).map((r) => `<div class="alert ${r.sev}" data-reco="${esc(r.id)}"><span class="ico">${ic(r.sev === 'info' ? 'lightbulb' : SEV_ICON[r.sev])}</span><div><b>${esc(r.id)} · ${conGuardrails(esc(r.titulo))}</b><small>${conGuardrails(esc(r.detalle))}</small></div><button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('play')} ${I18N.t('gob.simular_con_replay')}</button></div>`).join('');
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_diario_total_de', { v: n })}">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      ${dias.map((d, i) => { const v = vals[i]; const esHoy = i === n - 1; return `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${esHoy ? 'var(--warn)' : 'var(--primary)'}" opacity="${esHoy ? 1 : .5}" data-tip="${fecha(d[0])}${esHoy ? I18N.t('gob.hoy_2') : ''}: ${eur(v)}"/>`; }).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(cap)}" y2="${ys(cap)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${W - pr}" y="${ys(cap) - 6}" text-anchor="end" style="fill:var(--crit)">${I18N.t('gob.cap_diario', { cap: eur(cap, 0) })}</text>
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_acumulado_del_mes')}">
      <g class="grid">${ticksDe(ymax).map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${v} €</text>`).join('')}</g>
      <polygon points="${area}" fill="var(--primary)" opacity=".15"/>
      <polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2"/>
      ${acumulado.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3" fill="var(--primary)" data-tip="${I18N.t('gob.acumulados', { dias: fecha(dias[i][0]), v: eur(v) })}"/>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(capMes)}" y2="${ys(capMes)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${W - pr}" y="${ys(capMes) - 6}" text-anchor="end" style="fill:var(--crit)">${I18N.t('gob.cap_mensual', { capMes: eur(capMes, 0) })}</text>
      ${dias.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg>`;
  }

  // Barras horizontales con el % de consumo de cada cap, coloreadas por estado
  function chartCapsConsumo(caps) {
    const COLOR = { ok: 'var(--ok)', aviso: 'var(--warn)', superado: 'var(--crit)' };
    const rowH = 34, W = 640, H = 14 + caps.length * rowH, pl = 90, pr = 60;
    const max = Math.max(100, ...caps.map((c) => (c.consumo / c.limite) * 100));
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.porcentaje_de_consumo_de')}">
      ${caps.map((c, i) => { const y = 14 + i * rowH; const u = Math.round((c.consumo / c.limite) * 100); const w = Math.max(0, xs(Math.min(max, u)) - pl); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600" class="mono">${esc(c.id)}</text><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${COLOR[c.estado] || COLOR.ok}" data-tip="${I18N.t('gob.del_limite', { id: esc(c.id), ambito: esc(I18N.dato(c.ambito)), v: u })}"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${u} %</text>`; }).join('')}
      <line x1="${xs(100)}" x2="${xs(100)}" y1="6" y2="${H - 6}" stroke="var(--border)" stroke-dasharray="4 3"/>
    </svg>`;
  }

  // Barras horizontales del coste por agente (€ y % del total)
  function chartCosteAgente(porAgente, total) {
    const rowH = 34, W = 640, H = 14 + porAgente.length * rowH, pl = 215, pr = 90;
    const max = Math.max(...porAgente.map(([, v]) => v), 0.0001);
    const xs = (v) => pl + (v / max) * (W - pl - pr);
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.coste_por_agente_del')}">
      ${porAgente.map(([a, v], i) => { const y = 14 + i * rowH; const share = total ? Math.round((v / total) * 100) : 0; const nombre = svgAg(a.id).length > 30 ? `${svgAg(a.id).slice(0, 28)}…` : svgAg(a.id); const w = Math.max(0, xs(v) - pl); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(nombre)}</text><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${agColor(a.id)}" data-tip="${I18N.t('gob.del_coste', { id: esc(svgAg(a.id)), v: eur(v), share })}"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${eur(v)} · ${share} %</text>`; }).join('')}
    </svg>`;
  }

  const KPI_FIN = {
    'coste-hoy': {
      icono: 'euro',
      titulo: I18N.t('gob.coste_hoy_parcial'),
      render: () => {
        const dias = diarioVisible(), hoy = G.diario[G.diario.length - 1], cap = capDiario(), gasto = costeDia(hoy);
        return `<p class="small muted">${I18N.t('gob.el_coste_de_hoy', { CAP: grRef('CAP-01') })}</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('euro')} ${I18N.t('gob.coste_hoy')}</span><b>${eur(gasto)}</b></div>
            <div class="box"><span class="muted small">${ic('gauge')} ${I18N.t('gob.del_cap_diario')}</span><b>${Math.round((gasto / cap) * 100)} %</b></div>
            <div class="box"><span class="muted small">${ic('activity')} ${I18N.t('gob.mensajes_hoy')}</span><b>${num(hoy[1])}</b></div>
            <div class="box"><span class="muted small">${ic('coins')} ${I18N.t('gob.coste_medio_mensaje_hoy')}</span><b>${eur(hoy[1] ? gasto / hoy[1] : 0, 4)}</b></div>
          </div>
          <div><h3>${I18N.t('gob.coste_diario_de_los', { dias: dias.length })}</h3>${chartCosteDiario(dias, cap)}</div>`;
      },
    },
    'coste-mensual': {
      icono: 'wallet',
      titulo: I18N.t('gob.coste_mensual'),
      render: () => {
        const info = G.kpis.finops[0] || {};
        const capMes = G.kpis.cap_mensual || 500;
        const dias = G.diario;
        const ultima = new Date(dias[dias.length - 1][0]);
        const diasEnMes = new Date(ultima.getFullYear(), ultima.getMonth() + 1, 0).getDate();
        const diasRestantes = Math.max(0, diasEnMes - ultima.getDate());
        const proyM = String(info.sub || '').match(/proyecci[oó]n[^\d]*([\d.,]+)\s*€/i);
        const proyeccion = proyM ? Number(proyM[1].replace(/\./g, '').replace(',', '.')) : null;
        return `<p class="small muted">${I18N.t('gob.el_coste_mensual_acumula', { CAP: grRef('CAP-02') })}</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('euro')} ${I18N.t('gob.coste_del_mes')}</span><b>${esc(info.valor || '—')}</b></div>
            <div class="box"><span class="muted small">${ic('gauge')} ${I18N.t('gob.del_cap_mensual')}</span><b>${Math.round(info.medidor || 0)} %</b></div>
            <div class="box"><span class="muted small">${ic('wallet')} ${I18N.t('gob.cap_mensual_2')}</span><b>${eur(capMes, 0)}</b></div>
            ${proyeccion != null ? `<div class="box"><span class="muted small">${ic('chart-column')} ${I18N.t('gob.proyeccion_de_cierre')}</span><b>${eur(proyeccion, 0)}</b></div>` : ''}
            <div class="box"><span class="muted small">${ic('hourglass')} ${I18N.t('gob.dias_restantes_del_mes')}</span><b>${diasRestantes}</b></div>
          </div>
          <div><h3>${I18N.t('gob.coste_acumulado')}</h3><span class="muted small">${I18N.t('gob.ultimos_dias_con_historico', { dias: dias.length })}</span>${chartCosteAcumulado(dias, capMes)}</div>`;
      },
    },
    'caps-superados': {
      icono: 'triangle-alert',
      titulo: I18N.t('gob.caps_superados'),
      render: () => {
        const superados = G.caps.filter((c) => c.estado === 'superado');
        const aviso = G.caps.filter((c) => c.estado === 'aviso');
        const ok = G.caps.filter((c) => c.estado === 'ok');
        const orden = [...superados, ...aviso, ...ok];
        return `<p class="small muted">${I18N.t('gob.los_caps_de_finops')}</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('triangle-alert')} ${I18N.t('gob.superados')}</span><b>${superados.length}</b></div>
            <div class="box"><span class="muted small">${ic('circle-alert')} ${I18N.t('gob.en_aviso_80')}</span><b>${aviso.length}</b></div>
            <div class="box"><span class="muted small">${ic('check')} ${I18N.t('gob.dentro_de_limite')}</span><b>${ok.length}</b></div>
            <div class="box"><span class="muted small">${ic('list-checks')} ${I18N.t('gob.caps_configurados')}</span><b>${G.caps.length}</b></div>
          </div>
          <div><h3>${I18N.t('gob.de_consumo_por_cap')}</h3>${chartCapsConsumo(orden)}</div>
          <div><h3>${I18N.t('gob.detalle_de_los_caps')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.cap_2')}</th><th>${I18N.t('gob.ambito')}</th><th>${I18N.t('gob.tipo')}</th><th>${I18N.t('gob.limite_2')}</th><th>${I18N.t('gob.consumo')}</th><th style="min-width:160px">${I18N.t('gob.uso')}</th><th>${I18N.t('gob.accion_al_superar')}</th><th>${I18N.t('gob.estado')}</th></tr></thead><tbody>${orden.map(capRow).join('')}</tbody></table></div></div>`;
      },
    },
    'coste-medio': {
      icono: 'coins',
      titulo: I18N.t('gob.coste_medio_por_mensaje'),
      render: () => {
        const dias = diarioVisible();
        const totalMsgs = dias.reduce((a, d) => a + d[1], 0), coste = dias.reduce((a, d) => a + costeDia(d), 0);
        const porAgente = G.agentes.slice(0, 4).map((a, k) => [a, dias.reduce((s, d) => s + (d[2][k] || 0), 0)]).sort((a, b) => b[1] - a[1]);
        const masCaro = porAgente[0];
        return `<p class="small muted">${I18N.t('gob.el_coste_medio_por')}</p>
          <div class="kpi-mini">
            <div class="box"><span class="muted small">${ic('coins')} ${I18N.t('gob.coste_medio')}</span><b>${eur(totalMsgs ? coste / totalMsgs : 0, 4)}</b></div>
            <div class="box"><span class="muted small">${ic('euro')} ${I18N.t('gob.coste_del_periodo')}</span><b>${eur(coste)}</b></div>
            <div class="box"><span class="muted small">${ic('activity')} ${I18N.t('gob.mensajes_procesados')}</span><b>${num(totalMsgs)}</b></div>
            <div class="box"><span class="muted small">${ic('cpu')} ${I18N.t('gob.agente_mas_caro')}</span><b style="font-size:1rem">${masCaro ? agLbl(masCaro[0].id) : '—'}</b></div>
          </div>
          <div><h3>${I18N.t('gob.reparto_del_coste_por', { dias: dias.length })}</h3>${chartCosteAgente(porAgente, coste)}</div>`;
      },
    },
  };

  // ---------------------------------------------------------------------------
  // Resumen: fichas modales animadas de los 6 KPI y del gráfico «Coste diario frente al cap»
  // ---------------------------------------------------------------------------
  const FMT_CONT = {
    int: (v) => num(Math.round(v)), dec1: (v) => dec(v, 1), pct0: (v) => `${Math.round(v)} %`,
    pct1: (v) => `${dec(v, 1)} %`, eur0: (v) => eur(v, 0), eur2: (v) => eur(v, 2), eur4: (v) => eur(v, 4),
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
    // Las minilíneas usan vector-effect=non-scaling-stroke, que mide el trazo discontinuo en píxeles de pantalla:
    // en lugar de dibujarlas con stroke-dasharray se descubren de izquierda a derecha (clip-path en el CSS)
    root.querySelectorAll('.span .bar i').forEach((b, k) => b.style.setProperty('--i', k));
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || I18N.t('gob.serie_diaria'))}">
      ${fechas.map((d, i) => (finde(d) ? `<rect x="${xs(i) - (W - pl - pr) / n / 2}" y="${pt}" width="${(W - pl - pr) / n}" height="${H - pt - pb}" fill="var(--muted)" opacity=".07"/>` : '')).join('')}
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((q) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * q)}" y2="${ys(ymax * q)}"/><text x="${pl - 6}" y="${ys(ymax * q) + 4}" text-anchor="end">${(o.tick || f)(ymax * q)}</text>`).join('')}</g>
      ${vals.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${o.colorDe ? o.colorDe(v, i) : col}" opacity="${i === n - 1 ? 1 : 0.78}" data-tip="${fecha(fechas[i])}${i === n - 1 ? I18N.t('gob.hoy_parcial_2') : ''}: ${f(v)}${o.unit ? ` ${o.unit}` : ''}"/>`).join('')}
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || I18N.t('gob.tendencia'))}">
      <g class="grid">${[0, 0.5, 1].map((q) => { const v = lo + (hi - lo) * q; return `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 6}" y="${ys(v) + 4}" text-anchor="end">${f(v)}</text>`; }).join('')}</g>
      <polygon points="${xs(0)},${ys(lo)} ${pts} ${xs(n - 1)},${ys(lo)}" fill="${col}" opacity=".13"/>
      ${o.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${ys(o.ref.v)}" y2="${ys(o.ref.v)}" stroke="${o.ref.color || 'var(--ok)'}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${pl + 4}" y="${ys(o.ref.v) - 5}" style="fill:${o.ref.color || 'var(--ok)'};font-weight:700">${esc(o.ref.label)}</text>` : ''}
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      ${vals.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="${i === n - 1 ? 5 : 3.4}" fill="${o.puntoDe ? o.puntoDe(v) : col}" stroke="var(--surface)" stroke-width="2" data-tip="${fecha(fechas[i])}: ${f(v)}"/>`).join('')}
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }
  const pct1v = (v) => `${dec(v, 1)} %`;
  // Barras apiladas por día: series = [{ label, color, vals }]
  function chartApilada(series, fechas, o = {}) {
    const n = fechas.length, W = 640, H = o.H || 220, pl = 46, pr = 16, pt = 16, pb = 28;
    const tot = fechas.map((_, i) => series.reduce((a, s) => a + s.vals[i], 0)), ymax = Math.max(...tot, o.ref ? o.ref.v * 1.15 : 0) * 1.1;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb), bw = Math.min(28, ((W - pl - pr) / n) * 0.62), f = o.fmt || ((v) => num(Math.round(v)));
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || I18N.t('gob.serie_apilada'))}">
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((q) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * q)}" y2="${ys(ymax * q)}"/><text x="${pl - 6}" y="${ys(ymax * q) + 4}" text-anchor="end">${f(ymax * q)}</text>`).join('')}</g>
      ${fechas.map((d, i) => { let acc = 0; return series.map((s, k) => { const v = s.vals[i], y0 = ys(acc), y1 = ys(acc + v); acc += v; return `<rect x="${xs(i) - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1 - 1)}" rx="${k === series.length - 1 ? 3 : 0}" fill="${s.color}" data-tip="${fecha(d)} · ${esc(s.label)}: ${f(v)}"/>`; }).join(''); }).join('')}
      ${o.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${ys(o.ref.v)}" y2="${ys(o.ref.v)}" stroke="${o.ref.color || 'var(--crit)'}" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${pl + 4}" y="${ys(o.ref.v) - 5}" style="fill:${o.ref.color || 'var(--crit)'};font-weight:700">${esc(o.ref.label)}</text>` : ''}
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }
  // Anillo animado con reparto [etiqueta, valor, color] y texto central
  function chartAnillo(items, centro, sub) {
    const R = 54, C = 2 * Math.PI * R, total = items.reduce((a, [, v]) => a + v, 0) || 1; let off = 0;
    return `<svg class="donut" viewBox="0 0 160 160" role="img" aria-label="${esc(sub || I18N.t('gob.reparto'))}">
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
    icono: 'activity', titulo: I18N.t('gob.mensajes_procesados'),
    render: () => {
      const d = datosResumen(); const msgs = d.dias.map((x) => x[1]);
      const pico = Math.max(...msgs), laborables = d.dias.filter((x) => !finde(x[0])), fines = d.dias.filter((x) => finde(x[0]));
      const media = (a) => (a.length ? a.reduce((s, x) => s + x[1], 0) / a.length : 0);
      const trz = G.trazas || []; const mix = (k, claves) => claves.map((c) => trz.filter((t) => t[k] === c).length + 1);
      const canales = distribuir(d.total, mix('canal', CANALES_ORDEN), 'msg-canal').map((v, i) => [canalInfo(CANALES_ORDEN[i])[1], v, ['var(--primary)', 'var(--ag-clasificacion)', 'var(--ag-extraccion)', 'var(--ag-reglas)', 'var(--auto)'][i]]);
      const ramos = distribuir(d.total, mix('ramo', ['Auto', 'Hogar', 'Salud']), 'msg-ramo').map((v, i) => [['Auto', 'Hogar', 'Salud'][i], v, ['var(--auto)', 'var(--hogar)', 'var(--salud)'][i]]);
      return `<p class="small muted">${I18N.t('gob.cada_mensaje_de_cliente')}</p>
        <div class="kpi-mini">${kmini('activity', I18N.t('gob.mensajes_en_el_periodo'), cnt(d.total))}${kmini('chart-column', I18N.t('gob.media_diaria'), cnt(Math.round(d.total / d.n)))}${kmini('gauge', I18N.t('gob.dia_de_mayor_carga'), cnt(pico), fecha(d.fechas[msgs.indexOf(pico)]))}${kmini('calendar', I18N.t('gob.laborable_vs_fin_de'), `${cnt(Math.round(media(laborables)))} / ${cnt(Math.round(media(fines)))}`, I18N.t('gob.mensajes_al_dia_de'))}</div>
        <div><h3>${I18N.t('gob.mensajes_por_dia_barras')}</h3>${chartBarras(msgs, d.fechas, { linea: mediaMovil(msgs), aria: I18N.t('gob.mensajes_procesados_por_dia'), unit: 'mensajes' })}${leyenda([[I18N.t('gob.mensajes_2'), 'var(--primary)'], [I18N.t('gob.media_movil_3_d'), 'var(--ag-extraccion)'], [I18N.t('gob.fin_de_semana'), 'var(--muted)', ';opacity:.3']])}</div>
        <div class="two"><div><h3>${I18N.t('gob.por_canal_de_entrada')}</h3>${anilloConLeyenda(canales, num(d.total), 'mensajes')}</div><div><h3>${I18N.t('gob.por_ramo')}</h3>${anilloConLeyenda(ramos, num(d.total), 'mensajes')}</div></div>
        <p class="muted small">${I18N.t('gob.el_reparto_por_canal')}</p>`;
    },
  };

  KPI_FIN['res-aut'] = {
    icono: 'zap', titulo: I18N.t('gob.autonomia_efectiva'),
    render: () => {
      const d = datosResumen(); const base = serieAround('aut-dia', d.n, d.pAut, 1.6, d.pAut); if (d.n > 3) { base[d.n - 3] = d.pAut - 2.4; base[d.n - 2] = d.pAut - 3.1; }
      const porNivel = G.agentes.filter((a) => a.cap_hoy != null);
      return `<p class="small muted">${I18N.t('gob.porcentaje_de_decisiones_que')} <b>${I18N.t('gob.sin_intervencion_humana')}</b>${I18N.t('gob.ni_escalado_por_un')}</p>
        <div class="kpi-mini">${kmini('zap', I18N.t('gob.autonomia_efectiva'), cnt(d.pAut, 'pct0'))}${kmini('circle-check', I18N.t('gob.decisiones_autonomas'), cnt(d.nAut))}${kmini('user-check', I18N.t('gob.pasaron_por_una_persona'), cnt(d.nEsc))}${kmini('gauge', I18N.t('gob.margen_sobre_el_objetivo'), `<span style="color:var(--${d.pAut >= 80 ? 'ok' : 'crit'})">${I18N.t('gob.pp', { pAut: d.pAut >= 80 ? '+' : '', replace: dec(d.pAut - 80, 1) })}</span>`, I18N.t('gob.objetivo_80'))}</div>
        <div class="two"><div><h3>${I18N.t('gob.reparto_de_decisiones')}</h3>${anilloConLeyenda([[I18N.t('gob.autonomas'), d.nAut, 'var(--ok)'], [I18N.t('gob.escaladas_a_una_persona'), d.nEsc, 'var(--review)']], `${Math.round(d.pAut)} %`, 'autónomas')}</div>
        <div><h3>${I18N.t('gob.autonomia_por_agente')}</h3><ul class="rel-list lvl-list">${porNivel.map((a) => `<li>${agTag(a.id)}${lvlBadge(a.nivel)}<span class="small muted">${esc((G.niveles[a.nivel] || {}).nombre || '')}</span><span class="meter" style="--c:var(--lc-${a.nivel})"><i style="width:${(a.nivel + 1) * 25}%"></i></span></li>`).join('')}</ul><p class="muted small" style="margin-top:.4rem">${I18N.t('gob.una_barra_mas_llena')}</p></div></div>
        <div><h3>${I18N.t('gob.autonomia_efectiva_por_dia')}</h3>${chartTendencia(base, d.fechas, { min: Math.floor(Math.min(...base) - 3), max: 100, ref: { v: 80, label: I18N.t('gob.objetivo_80_2') }, aria: I18N.t('gob.autonomia_efectiva_por_dia'), puntoDe: (v) => (v >= 80 ? 'var(--ok)' : 'var(--warn)'), color: 'var(--ok)' })}<p class="muted small">${I18N.t('gob.la_caida_de_los')}</p></div>`;
    },
  };

  // ---------------------------------------------------------------------------
  // Intervención humana (HITL): escalados, overrides, cola de revisión y calidad de la revisión
  // ---------------------------------------------------------------------------
  function hitlEscalados() {
    const d = datosResumen();
    const causas = [...String((d.aut && G.kpis.autonomia && G.kpis.autonomia[1] && G.kpis.autonomia[1].sub) || '').matchAll(/(G-\d{2})[^\d]*(\d+) %/g)].map((m) => [m[1], Number(m[2])]);
    const base = causas.length ? causas : [['G-02', 62], ['G-04', 20], ['G-05', 11]]; const resto = Math.max(0, 100 - base.reduce((a, [, v]) => a + v, 0));
    const filas = [...base, ...(resto ? [['otras', resto]] : [])];
    const colores = ['var(--ag-reglas)', 'var(--review)', 'var(--ag-extraccion)', 'var(--muted)'];
    const nombre = (id) => { const p = G.politicas.find((x) => x.id === id); return id === 'otras' ? I18N.t('gob.otras_confianza_discrepancia') : `${id} · ${p ? p.condicion.split(' · ')[0].replace(/ \(.*$/, '') : ''}`.replace(/(.{40}).+/, '$1…'); };
    const porDia = d.dias.map((x, i) => { const aut = serieAround('aut-dia', d.n, d.pAut, 1.6, d.pAut)[i]; return Math.round(x[1] * (100 - aut) / 100); });
    const series = filas.map(([id, pc], k) => ({ label: id === 'otras' ? I18N.t('gob.otras') : id, color: colores[k % colores.length], vals: porDia.map((v, i) => Math.round(v * pc / 100)) }));
    return `<div class="card-head"><h2>${ic('user-check')} ${I18N.t('gob.escalados_a_una_persona')}</h2><button class="btn btn-sm" type="button" data-goto="guardrails">${I18N.t('gob.abrir_guardrails')}</button></div>
      <p class="small muted">${I18N.t('gob.decisiones_que_un_guardrail')}</p>
      <div class="kpi-mini">${kmini('user-check', I18N.t('gob.escalados_en_el_periodo'), cnt(d.nEsc))}${kmini('gauge', I18N.t('gob.de_los_mensajes'), cnt(d.pEsc, 'pct0'))}${kmini('shield-check', I18N.t('gob.causa_principal'), esc(filas[0][0]), I18N.t('gob.de_los_escalados', { filas: filas[0][1] }))}${kmini('timer', I18N.t('gob.resolucion_humana_mediana'), cnt(14, 'int') + ' min', I18N.t('gob.desde_que_llega_a'))}</div>
      <div class="two"><div><h3>${I18N.t('gob.causas_de_escalado')}</h3>${anilloConLeyenda(filas.map(([id, pc], k) => [nombre(id), Math.round(d.nEsc * pc / 100), colores[k % colores.length]]), `${Math.round(d.pEsc)} %`, 'escalados')}</div>
      <div><h3>${I18N.t('gob.ranking_de_guardrails_por')}</h3>${hbars([...G.politicas].filter((p) => p.severidad === 'humano').sort((a, b) => b.disparos - a.disparos).slice(0, 6).map((p) => [p.id, p.disparos, agColor(p.agente)]), { pl: 56, aria: I18N.t('gob.guardrails_con_mas_disparos') })}</div></div>
      <div><h3>${I18N.t('gob.escalados_por_dia_y')}</h3>${chartApilada(series, d.fechas, { aria: I18N.t('gob.escalados_por_dia_y') })}${leyenda(series.map((s) => [s.label, s.color]))}</div>`;
  }

  function hitlOverrides() {
    const d = datosResumen(); const serie = [1.7, 1.9, 1.6, 1.8, 1.9, 2.0, 1.8, 1.7, 2.1, 1.9, 2.2, 3.4, 4.1, d.pOvr].slice(-d.n); const cambiadas = Math.round(numDe(d.ovr && d.ovr.sub, 67));
    const porAgente = G.agentes.filter((a) => a.cap_hoy != null).map((a) => [`${svgAg(a.id)}`, numDe(a.override_14d && a.override_14d !== '—' ? a.override_14d : '0', 0), agColor(a.id)]);
    const motivos = [[I18N.t('gob.dato_no_accesible_al'), 41, 'var(--ag-extraccion)'], [I18N.t('gob.importe_mal_interpretado'), 22, 'var(--ag-reglas)'], [I18N.t('gob.cobertura_o_exclusion'), 19, 'var(--review)'], [I18N.t('gob.otros'), 18, 'var(--muted)']];
    const recientes = (G.eventos || []).filter((e) => e.tipo === 'override').slice(0, 3);
    return `<div class="card-head"><h2>${ic('repeat')} ${I18N.t('gob.overrides_decisiones_que_cambia')}</h2><button class="btn btn-sm" type="button" data-goto="autonomia">${I18N.t('gob.abrir_autonomia')}</button></div>
      <p class="small muted">${I18N.t('gob.un')} <b>${I18N.t('gob.override_2')}</b> ${I18N.t('gob.es_una_decision_que')}</p>
      ${G.sesion ? `<p class="small">${ic('user-check')} <b>${I18N.t('gob.sesion_actual')}</b> ${I18N.t('gob.sobre_aprobaciones_automaticas', { overrides: G.sesion.overrides, overrides2: I18N.t('gob.palabra_override', { n: G.sesion.overrides }), aprobadasSolas: G.sesion.aprobadasSolas, replace: dec(G.sesion.tasa, 1), span: G.sesion.propuesta ? ` · <span style="color:var(--crit)">${I18N.t('gob.por_encima_del_3', { propuesta: G.sesion.propuesta.a })}</span>` : '' })}</p>` : ''}
      <div class="kpi-mini">${kmini('repeat', I18N.t('gob.tasa_de_override'), cnt(d.pOvr, 'pct1'))}${kmini('user-check', I18N.t('gob.decisiones_cambiadas'), cnt(cambiadas))}${kmini('gauge', I18N.t('gob.objetivo'), '≤ 3 %', `<span style="color:var(--${d.pOvr <= 3 ? 'ok' : 'crit'})">${d.pOvr <= 3 ? I18N.t('gob.dentro_del_objetivo') : I18N.t('gob.por_encima')}</span>`)}${kmini('triangle-alert', I18N.t('gob.pico_del_periodo'), cnt(Math.max(...serie), 'pct1'), I18N.t('gob.semana_del_15_09'))}</div>
      <div><h3>${I18N.t('gob.tasa_de_override_por')}</h3>${chartTendencia(serie, d.fechas, { min: 0, max: 5, ref: { v: 3, label: I18N.t('gob.umbral_de_bajada_de'), color: 'var(--crit)' }, aria: I18N.t('gob.tasa_de_override_por'), color: 'var(--time)', puntoDe: (v) => (v > 3 ? 'var(--crit)' : 'var(--time)') })}</div>
      <div class="two"><div><h3>${I18N.t('gob.override_por_agente_14')}</h3>${hbars(porAgente.map(([l, v, c]) => [l, v, c]), { pl: 190, fmt: (v) => `${numero(v)} %`, total: 100, aria: I18N.t('gob.override_por_agente') })}</div>
      <div><h3>${I18N.t('gob.por_que_cambia_una')}</h3>${anilloConLeyenda(motivos.map(([l, v, c]) => [l, v, c]), `${cambiadas}`, 'overrides')}</div></div>
      ${recientes.length ? `<div><h3>${I18N.t('gob.overrides_recientes')}</h3><ul class="mini-tl">${recientes.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:var(--review)">${ic('user-check')}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}`;
  }

  // Tiempo que tarda una persona en revisar un escalado (segundos → texto), por tramos
  const TRAMOS_REV = [[I18N.t('gob.30_s'), 4], [I18N.t('gob.30_s_2_min'), 17], [I18N.t('gob.2_10_min'), 38], [I18N.t('gob.10_30_min'), 29], [I18N.t('gob.30_min'), 12]];
  // Tramitadores que revisan los escalados: 11 en plantilla, 2 incorporaciones recientes sin la formación en IA (M-10)
  const TRAMITADORES = [['L. Prieto', 16, 1, 9], ['M. Ortega', 14, 2, 12], ['A. Ruiz', 13, 11, 4], ['S. Gil', 12, 2, 15], ['J. Herrera', 11, 3, 13], ['C. Molina', 10, 2, 16], ['R. Vidal', 9, 1, 18], ['P. Lozano', 7, 3, 14], ['E. Campos', 5, 2, 17], ['I. Soler', 2, 9, 6, true], ['D. Rey', 1, 14, 5, true]];
  const HITL_MEDIDAS = ['M-14', 'M-15', 'M-11', 'M-10'];
  const EXPRES_MAX = 5;   // % máximo de revisiones de menos de 30 s antes de sospechar que se firma sin revisar

  // Una fila por traza del periodo que pasó por una persona (escalada por guardrail o cambiada con override)
  function colaHitl() {
    const gobDe = Object.fromEntries((cmpItems || []).map((x) => [x.gob.trazabilidad.traza_id, x.gob]));
    return G.trazas.filter((t) => t.resultado !== 'auto').map((t) => {
      const cod = (String(t.guardrail || '').match(/G-\d{2}/) || [])[0]; const agente = (cod && POL[cod] && POL[cod].agente) || 'reglas';
      const sup = (gobDe[t.id] || {}).supervision_humana || {};
      const r = rng(`rev-${t.id}`);
      const minutos = (f) => Math.max(0, Math.round((new Date(f) - new Date(t.inicio)) / 60000));
      if (t.override) return { t, agente, estado: 'cambiada', revisor: t.override.usuario.replace(/ \(.*\)$/, ''), min: minutos(t.override.fecha) };
      if (t.revision) return { t, agente, estado: t.revision.resultado === 'aprobada' ? 'aprobada' : 'revisada', revisor: t.revision.usuario.replace(/ \(.*\)$/, ''), min: minutos(t.revision.fecha) };
      if (sup.estado === 'revisada') return { t, agente, estado: 'revisada', revisor: TRAMITADORES[Math.floor(r() * 8)][0], min: Math.round(4 + r() * 30) };
      return { t, agente, estado: 'pendiente', revisor: null, min: null };
    });
  }
  const EST_HITL = { pendiente: ['pill-review', 'user-check', I18N.t('gob.pendiente_de_revision')], revisada: ['pill-ok', 'circle-check', I18N.t('gob.revisada_se_mantiene')], aprobada: ['pill-ok', 'circle-check', I18N.t('gob.revisada_aprobada')], cambiada: ['pill-time', 'repeat', I18N.t('gob.override_aprobacion_cambiada')] };

  function hitlCalidad() {
    const d = datosResumen();
    const porTramo = distribuir(d.nEsc, TRAMOS_REV.map(([, p]) => p), 'rev-tramos');
    const expres = (porTramo[0] / (d.nEsc || 1)) * 100;
    const porTram = distribuir(d.nEsc, TRAMITADORES.map((x) => x[1]), 'rev-tram');
    const formados = TRAMITADORES.filter((x) => !x[4]).length;
    const confirman = 100 - (numDe(d.ovr && d.ovr.sub, 67) / (d.nEsc || 1)) * 100;
    return `<div class="card-head"><h2>${ic('scan-eye')} ${I18N.t('gob.calidad_de_la_revision')}</h2>${normas('rgpd-22', 'ai-14', 'ai-4')}</div>
      <p class="small muted">${I18N.t('gob.que_una_persona_vea')}</p>
      <div class="kpi-mini">${kmini('timer', I18N.t('gob.revision_mediana'), `${cnt(14)} min`, I18N.t('gob.desde_que_llega_a_2'))}${kmini('zap', I18N.t('gob.revisiones_expres_30_s'), cnt(expres, 'pct1'), `<span style="color:var(--${expres <= EXPRES_MAX ? 'ok' : 'crit'})">${I18N.t('gob.del_maximo', { por_encima: expres <= EXPRES_MAX ? 'dentro' : I18N.t('gob.por_encima'), EXPRES_MAX })}</span>`)}${kmini('circle-check', I18N.t('gob.confirman_la_decision_del'), cnt(confirman, 'pct1'), I18N.t('gob.el_resto_la_cambian'))}${kmini('graduation-cap', I18N.t('gob.tramitadores_formados_en_ia'), I18N.t('gob.de_4', { formados, TRAMITADORES: TRAMITADORES.length }), 'AI Act art. 4 · ver M-10')}</div>
      <div class="two"><div><h3>${I18N.t('gob.tiempo_que_tarda_una')}</h3>${hbars(TRAMOS_REV.map(([l], i) => [l, porTramo[i], i === 0 ? 'var(--crit)' : i === 1 ? 'var(--warn)' : 'var(--ok)']), { pl: 110, aria: I18N.t('gob.revisiones_por_tiempo_de') })}<p class="muted small">${I18N.t('gob.en_rojo_las_aprobaciones')}</p></div>
      <div><h3>${I18N.t('gob.por_tramitador_14_dias')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.tramitador')}</th><th>${I18N.t('gob.revisiones')}</th><th>${I18N.t('gob.mediana')}</th><th>${I18N.t('gob.expres')}</th><th>${I18N.t('gob.override')}</th><th>${I18N.t('gob.formacion_ia')}</th></tr></thead><tbody>${TRAMITADORES.map(([n, , ex, med, nuevo], i) => `<tr><td>${esc(n)}</td><td class="tnum">${num(porTram[i])}</td><td class="tnum">${I18N.t('gob.min', { med })}</td><td class="tnum"><span style="color:var(--${ex > EXPRES_MAX ? 'crit' : 'text'})">${ex} %</span></td><td class="tnum">${dec(1.2 + rng(`ovr-${n}`)() * 2.6, 1)} %</td><td>${nuevo ? `<span class="pill pill-warn" data-medida="M-10" role="button" tabindex="0" title="${I18N.t('gob.abrir_la_medida_m')}">${ic('circle-alert')} ${I18N.t('gob.pendiente')}</span>` : `<span class="pill pill-ok">${ic('circle-check')} ${I18N.t('gob.si_2')}</span>`}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  }

  function renderHitl() {
    const d = datosResumen();
    const cola = colaHitl(); const pend = cola.filter((c) => c.estado === 'pendiente').length;
    const porTramo = distribuir(d.nEsc, TRAMOS_REV.map(([, p]) => p), 'rev-tramos'); const expres = (porTramo[0] / (d.nEsc || 1)) * 100;
    const { T } = estadoCumplimiento(); const ctl = T.marcos.flatMap((m) => m.controles).find((c) => c.id === 'ria-14');
    const ags = agentesPrincipales(); const activos = ags.filter((a) => estadoAgente(a) === 'activo').length;
    const grHumano = G.politicas.filter((p) => p.severidad === 'humano'); const grInact = grHumano.filter((p) => !politicaActiva(p)).length;
    $('kpis-hitl').innerHTML = [
      kpi({ cls: 'review', icono: 'user-check', etiqueta: I18N.t('gob.escalados_a_una_persona'), valor: num(d.nEsc), sub: I18N.t('gob.de_los_mensajes_del', { pEsc: String(Math.round(d.pEsc)) }) }),
      kpi({ cls: d.pOvr <= 3 ? 'time' : 'crit', icono: 'repeat', etiqueta: I18N.t('gob.tasa_de_override'), valor: `${dec(d.pOvr, 1)} %`, sub: I18N.t('gob.decisiones_que_cambia_un'), medidor: (d.pOvr / 5) * 100 }),
      kpi({ cls: pend ? 'warn' : 'ok', icono: 'inbox', etiqueta: I18N.t('gob.pendientes_de_revision'), valor: String(pend), sub: I18N.t('gob.de_trazas_con_intervencion', { cola: cola.length }) }),
      kpi({ cls: expres <= EXPRES_MAX ? 'ok' : 'crit', icono: 'zap', etiqueta: I18N.t('gob.revisiones_expres'), valor: `${dec(expres, 1)} %`, sub: I18N.t('gob.aprobadas_en_menos_de', { EXPRES_MAX }), medidor: (expres / (EXPRES_MAX * 2)) * 100 }),
      ctl ? conGoto(kpi({ cls: ctl.estado === 'ok' ? 'ok' : 'warn', icono: 'scale', etiqueta: I18N.t('gob.supervision_humana_efectiva'), valor: ctl.estado === 'ok' ? I18N.t('gob.cubierto') : I18N.t('gob.parcial'), sub: 'AI Act art. 14 · RGPD art. 22 · en el Termómetro' }), 'cumplimiento') : '',
    ].join('');
    titulo('h-hitl-mec', 'shield-check', I18N.t('gob.mecanismos_de_supervision'));
    const mec = [
      ['guardrails', 'shield-check', I18N.t('gob.escalado_por_guardrail_o'), I18N.t('gob.guardrails_envian_la_decision', { grHumano: grHumano.length, grInact: grInact ? ` (${grInact} inactivo${grInact === 1 ? '' : 's'})` : '' }), I18N.t('gob.guardrails')],
      ['autonomia', 'sliders-horizontal', I18N.t('gob.override_y_nivel_de'), I18N.t('gob.si_el_override_de'), I18N.t('gob.autonomia')],
      ['resumen', 'power', I18N.t('gob.interruptor_de_pausa_kill'), I18N.t('gob.de_agentes_activos_al', { activos, ags: ags.length }), I18N.t('gob.resumen')],
      ['cumplimiento', 'scale', I18N.t('gob.control_normativo'), ctl ? `${ctl.exige}: ${ctl.medida}.` : I18N.t('gob.supervision_humana_efectiva_ai'), I18N.t('gob.termometro')],
    ];
    $('hitl-mec').innerHTML = mec.map(([v, i, t, txt, dest]) => `<article class="box alert-link" data-goto="${v}" role="button" tabindex="0" title="${I18N.t('gob.ir_a', { dest: esc(dest) })}"><b>${ic(i)} ${esc(t)}</b><span class="small">${esc(txt)}</span><span class="muted small">${esc(dest)} ${ic('arrow-right')}</span></article>`).join('');
    titulo('h-hitl-cola', 'inbox', I18N.t('gob.cola_de_revision', { cola: cola.length }));
    $('btn-hitl-trazas').innerHTML = I18N.t('gob.ver_en_trazabilidad', { route: ic('route') });
    $('hitl-cola').innerHTML = cola.map(({ t, agente, estado, revisor, min }) => { const [cls, i, l] = EST_HITL[estado]; return `<tr class="clickable" data-id="${esc(t.id)}" tabindex="0"><td class="mono">${esc(t.id)}</td><td class="tnum">${fechaHora(t.inicio)}</td><td>${esc(t.mensaje)}<br><small class="muted">${esc(t.asunto || '')}</small></td><td>${esc(t.ramo)}</td><td>${agTag(agente)}</td><td class="wrap small">${conGuardrails(esc(t.guardrail || (t.override ? I18N.t('gob.aprobado_por_el_agente') : I18N.t('gob.confianza_baja'))))}</td><td><span class="pill ${cls}">${ic(i)} ${l}</span></td><td>${revisor ? esc(revisor) : '<span class="muted">—</span>'}</td><td class="tnum">${min != null ? `${min} min` : I18N.t('gob.en_cola')}</td></tr>`; }).join('') || I18N.t('gob.ninguna_traza_de_la');
    $('hitl-escalados').innerHTML = hitlEscalados();
    $('hitl-overrides').innerHTML = hitlOverrides();
    $('hitl-calidad').innerHTML = hitlCalidad();
    titulo('h-hitl-agentes', 'bot', I18N.t('gob.intervencion_humana_por_agente'));
    $('hitl-agentes').innerHTML = ags.map((a) => `<tr><td>${agTag(a.id)}</td><td>${lvlBadge(a.nivel)}</td><td class="small">${conGuardrails(esc(a.umbral || '—'))}</td><td class="tnum">${esc(a.escalado_14d || '—')}</td><td class="tnum">${esc(a.override_14d || '—')}</td><td><button class="btn btn-sm" type="button" data-ver-agente="${esc(a.id)}">${I18N.t('gob.ver_agente')}</button></td></tr>`).join('');
    titulo('h-hitl-med', 'wrench', I18N.t('gob.medidas_que_salen_de'));
    $('hitl-med').innerHTML = HITL_MEDIDAS.map((id) => medidas().find((m) => m.id === id)).filter(Boolean).map((m) => { const est = estadoMedida(m); return `<div class="alert ${m.sev} alert-link" data-medida="${esc(m.id)}" role="button" tabindex="0" title="${I18N.t('gob.abrir', { id: esc(m.id) })}"><span class="ico">${ic(SEV_ICON[m.sev] || 'lightbulb')}</span><div><b>${esc(m.id)} · ${esc(m.titulo)}</b><small>${esc(m.detalle)}</small></div><span class="alert-meta"><span class="pill ${MED_EST[est][0]}">${esc(MED_EST[est][1])}</span></span></div>`; }).join('');
  }

  KPI_FIN['res-coste'] = {
    icono: 'euro', titulo: I18N.t('gob.coste_del_periodo'),
    render: () => {
      const d = datosResumen(); const ids = G.agentes.slice(0, 4).map((a) => a.id);
      const porAg = ids.map((id, k) => [id, d.dias.reduce((s, x) => s + (x[2][k] || 0), 0)]);
      const series = ids.map((id, k) => ({ label: svgAg(id), color: agColor(id), vals: d.dias.map((x) => x[2][k] || 0) }));
      const pm = d.total ? d.coste / d.total : 0; const proy = (G.kpis.finops && G.kpis.finops[0] && /proyecci[oó]n[^\d]*([\d.,]+)/i.exec(G.kpis.finops[0].sub || '')) ? numDe(/proyecci[oó]n[^\d]*([\d.,]+)/i.exec(G.kpis.finops[0].sub)[1], null) : null;
      return `<p class="small muted">${I18N.t('gob.gasto_en_llamadas_a')}</p>
        <div class="kpi-mini">${kmini('euro', I18N.t('gob.coste_del_periodo'), cnt(d.coste, d.coste < 10 ? 'eur2' : 'eur0'))}${kmini('gauge', I18N.t('gob.del_cap_mensual'), cnt((d.coste / d.capMes) * 100, 'pct0'), I18N.t('gob.de_5', { capMes: eur(d.capMes, 0) }))}${kmini('coins', I18N.t('gob.coste_por_mensaje'), cnt(pm, 'eur4'))}${proy != null ? kmini('chart-column', I18N.t('gob.proyeccion_de_cierre_de'), cnt(proy, 'eur0')) : kmini('activity', I18N.t('gob.coste_medio_diario'), cnt(d.coste / d.n, 'eur2'))}</div>
        <div><h3>${I18N.t('gob.coste_diario_apilado_por')}</h3>${chartApilada(series, d.fechas, { fmt: (v) => `${dec(v, v < 10 ? 1 : 0)} €`, ref: { v: capDiario(), label: `cap diario ${eur(capDiario(), 0)}` }, aria: I18N.t('gob.coste_diario_por_agente') })}${leyenda([...series.map((s) => [s.label, s.color]), [I18N.t('gob.cap_diario_2'), 'var(--crit)']])}</div>
        <div class="two"><div><h3>${I18N.t('gob.reparto_del_coste')}</h3>${anilloConLeyenda(porAg.map(([id, v]) => [svgAg(id), Math.round(v * 100) / 100, agColor(id)]), eur(d.coste, 0), 'periodo')}</div>
        <div><h3>${I18N.t('gob.coste_acumulado_frente_al')}</h3>${chartCosteAcumulado(G.diario, d.capMes)}</div></div>`;
    },
  };

  // Orígenes de las alertas: orden, color, icono y sección a la que llevan
  // [origen (id interno de la alerta), color, icono, vista, sección, nombre dentro de una frase, título del grupo]
  const ORIGENES_AL = [['coste', 'var(--primary)', 'coins', 'finops', I18N.t('gob.finops_2'), 'coste', I18N.t('gob.coste')], ['autonomia', 'var(--review)', 'sliders-horizontal', 'autonomia', I18N.t('gob.autonomia'), 'autonomía', I18N.t('gob.autonomia')], ['fraude', 'var(--crit)', 'shield-alert', 'fraude', I18N.t('gob.fraude'), 'fraude', I18N.t('gob.fraude')], ['kb', 'var(--time)', 'book-open', 'knowledge', I18N.t('gob.knowledge_bases'), 'conocimiento', I18N.t('gob.knowledge_bases')], ['cumplimiento', 'var(--warn)', 'thermometer', 'cumplimiento', I18N.t('gob.cumplimiento'), 'cumplimiento', I18N.t('gob.cumplimiento')]];
  const tituloOrigen = (o) => (ORIGENES_AL.find((x) => x[0] === o) || [])[6] || o;
  const origenesTexto = (al) => { const n = ORIGENES_AL.filter(([o]) => al.some((a) => a.origen === o)).map((x) => x[5]); return n.length > 1 ? I18N.t('gob.y', { v: n.slice(0, -1).join(', '), v2: n[n.length - 1] }) : n[0] || I18N.t('gob.sin_alertas'); };

  KPI_FIN['res-alertas'] = {
    icono: 'bell', titulo: I18N.t('gob.alertas_activas'),
    render: () => {
      const act = alertasTodas(); const evs = (G.eventos || []).filter((e) => e.tipo === 'alerta' || e.tipo === 'incidente');
      const fechasEv = fechasSerie(); const porDia = (sev) => fechasEv.map((f) => evs.filter((e) => e.fecha.slice(0, 10) === f && e.sev === sev).length);
      const series = [{ label: I18N.t('gob.critica'), color: 'var(--crit)', vals: porDia('crit') }, { label: I18N.t('gob.aviso'), color: 'var(--warn)', vals: porDia('warn') }, { label: I18N.t('gob.informativa'), color: 'var(--time)', vals: porDia('info') }, { label: I18N.t('gob.cerrada'), color: 'var(--ok)', vals: porDia('ok') }];
      const nCrit = act.filter((a) => a.sev === 'crit').length, nWarn = act.filter((a) => a.sev === 'warn').length;
      const grupos = ORIGENES_AL.map(([o, color, icono, vista, dest, , titulo]) => ({ o, titulo, color, icono, vista, dest, al: act.filter((a) => a.origen === o) })).filter((g) => g.al.length);
      return `<p class="small muted">${I18N.t('gob.situaciones_que_requieren_atencion')}</p>
        <div class="kpi-mini">${kmini('bell', I18N.t('gob.alertas_activas'), cnt(act.length), origenesTexto(act))}${kmini('triangle-alert', I18N.t('gob.criticas'), `<span style="color:var(--crit)">${cnt(nCrit)}</span>`)}${kmini('circle-alert', I18N.t('gob.avisos'), `<span style="color:var(--warn)">${cnt(nWarn)}</span>`)}${kmini('shield-alert', I18N.t('gob.de_fraude'), cnt(act.filter((a) => a.origen === 'fraude').length), I18N.t('gob.siu_y_pagos_retenidos'))}${kmini('history', I18N.t('gob.eventos_en_14_dias'), cnt(evs.length), I18N.t('gob.alertas_e_incidentes'))}</div>
        <div class="two"><div><h3>${I18N.t('gob.por_severidad')}</h3>${anilloConLeyenda([[I18N.t('gob.critica'), nCrit, 'var(--crit)'], [I18N.t('gob.aviso'), nWarn, 'var(--warn)'], [I18N.t('gob.informativa'), act.length - nCrit - nWarn, 'var(--time)']].filter((x) => x[1] > 0), String(act.length), 'activas')}</div>
        <div><h3>${I18N.t('gob.por_origen')}</h3>${anilloConLeyenda(grupos.map((g) => [g.titulo, g.al.length, g.color]), String(grupos.length), grupos.length === 1 ? 'fuente' : 'fuentes')}</div></div>
        <div><h3>${I18N.t('gob.alertas_activas_por_origen')}</h3>${grupos.map((g) => `<div class="al-grupo"><div class="al-grupo-h"><span style="color:${g.color}">${ic(g.icono)}</span><b>${esc(g.titulo)}</b><span class="pill pill-muted">${g.al.length}</span><button class="btn btn-sm" type="button" data-goto="${g.vista}">${ic('arrow-right')} ${I18N.t('gob.ir_a', { dest: esc(g.dest) })}</button></div><div class="alerts">${g.al.map(alertaHtml).join('')}</div></div>`).join('') || I18N.t('gob.sin_alertas_activas')}</div>
        <div><h3>${I18N.t('gob.alertas_e_incidentes_por')}</h3>${chartApilada(series, fechasEv, { H: 180, fmt: (v) => String(Math.round(v)), aria: I18N.t('gob.alertas_por_dia_y') })}${leyenda(series.map((s) => [s.label, s.color]))}
        <div class="row" style="margin-top:.6rem"><button class="btn btn-sm" type="button" data-goto="historico">${ic('history')} ${I18N.t('gob.ver_el_historico')}</button></div></div>`;
    },
  };

  KPI_FIN['coste-cap'] = {
    icono: 'euro', titulo: I18N.t('gob.coste_diario_frente_al'),
    render: () => {
      const d = datosResumen(); const cap = capDiario(); const vals = d.dias.map(costeDia); const hoy = vals[vals.length - 1];
      const sobre = d.dias.map((x, i) => [x[0], vals[i], vals[i] / cap]).filter(([, , u]) => u >= 0.8).reverse();
      const nCap = vals.filter((v) => v >= cap).length, nAviso = vals.filter((v) => v >= cap * 0.8 && v < cap).length;
      const ids = G.agentes.slice(0, 4).map((a) => a.id);
      const series = ids.map((id, k) => ({ label: svgAg(id), color: agColor(id), vals: d.dias.map((x) => x[2][k] || 0) }));
      return `<p class="small muted">${I18N.t('gob.coste_total_de_los', { CAP: grRef('CAP-01') })}</p>
        <div class="kpi-mini">${kmini('euro', I18N.t('gob.coste_hoy_parcial'), cnt(hoy, 'eur2'))}${kmini('gauge', I18N.t('gob.del_cap_diario'), cnt((hoy / cap) * 100, 'pct0'), `cap ${eur(cap, 0)}`)}${kmini('triangle-alert', I18N.t('gob.dias_sobre_el_cap'), `<span style="color:var(--${nCap ? 'crit' : 'ok'})">${cnt(nCap)}</span>`, I18N.t('gob.de_6', { v: d.n }))}${kmini('circle-alert', I18N.t('gob.dias_en_aviso_80'), `<span style="color:var(--warn)">${cnt(nAviso)}</span>`)}${kmini('chart-column', I18N.t('gob.dia_mas_caro'), cnt(Math.max(...vals), 'eur2'), fecha(d.fechas[vals.indexOf(Math.max(...vals))]))}</div>
        <div><h3>${I18N.t('gob.coste_total_por_dia')}</h3>${chartCoste()}${leyenda([[I18N.t('gob.coste_total_dia'), 'var(--primary)'], [I18N.t('gob.dia_80_del_cap'), 'var(--warn)'], [I18N.t('gob.cap_diario_global'), 'var(--crit)']])}</div>
        <div><h3>${I18N.t('gob.de_que_agente_viene')}</h3>${chartApilada(series, d.fechas, { fmt: (v) => `${dec(v, v < 10 ? 1 : 0)} €`, ref: { v: cap, label: `cap ${eur(cap, 0)}` }, aria: I18N.t('gob.coste_diario_por_agente') })}${leyenda(series.map((s) => [s.label, s.color]))}</div>
        ${sobre.length ? `<div><h3>${I18N.t('gob.dias_cerca_del_cap')}</h3><div class="tw tabla-compacta"><table><thead><tr><th>${I18N.t('gob.dia')}</th><th>${I18N.t('gob.coste')}</th><th style="min-width:180px">${I18N.t('gob.uso_del_cap')}</th><th>${I18N.t('gob.estado')}</th></tr></thead><tbody>${sobre.map(([f, v, u]) => `<tr><td class="tnum">${fecha(f)}</td><td class="tnum"><b>${eur(v)}</b></td><td><div class="meter" style="--c:var(--${u >= 1 ? 'crit' : 'warn'});margin:0"><i style="width:${Math.min(100, u * 100)}%"></i></div><span class="small muted tnum">${Math.round(u * 100)} %</span></td><td><span class="pill ${u >= 1 ? 'pill-crit' : 'pill-warn'}">${u >= 1 ? I18N.t('gob.superado') : I18N.t('gob.aviso_80')}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
    },
  };

  // FinOps · ficha del ahorro estimado: escenario, hipótesis editables, cálculo paso a paso y ahorro por día
  function ahorroResultado() {
    const d = datosResumen(), p = { ...Ahorro.DEFECTO, ...ahorroParams() }, a = ahorroDe(d.dias, p);
    const pct = (v) => `${num(Math.round(v * 100))} %`;
    const origen = (m) => `<span class="pill ${m ? 'pill-ok' : 'pill-time'}">${m ? I18N.t('gob.medido') : I18N.t('gob.hipotesis')}</span>`;
    const pasos = [
      [I18N.t('gob.mensajes_procesados'), true, I18N.t('gob.todos_los_canales_en'), num(a.mensajes)],
      [I18N.t('gob.mensajes_automatizados'), true, I18N.t('gob.de_autonomia_efectiva', { mensajes: num(a.mensajes), pAut: dec(d.pAut, 0) }), num(a.automatizados)],
      [I18N.t('gob.coste_evitado_en_automatizados'), false, I18N.t('gob.por_mensaje_a_mano', { automatizados: num(a.automatizados), mensaje: eur(a.mensaje) }), eur(a.evitadoAut, 0)],
      [I18N.t('gob.coste_evitado_en_escalados'), false, I18N.t('gob.del_tiempo_datos_ya', { escalados: num(a.escalados), mensaje: eur(a.mensaje), ahorro_escalados: pct(p.ahorro_escalados) }), eur(a.evitadoEsc, 0)],
      [I18N.t('gob.coste_de_la_ia'), true, I18N.t('gob.llamadas_a_modelos_de'), `− ${eur(a.costeIA)}`],
    ];
    const tramitador = [
      [I18N.t('gob.salario_bruto_anual'), `${eur(p.salario_bruto, 0)}`],
      [I18N.t('gob.coste_empresa'), `× ${dec(p.factor_ss)} (Seguridad Social) = ${eur(a.costeEmpresa, 0)}`],
      [I18N.t('gob.con_estructura'), I18N.t('gob.puesto_licencias_supervision', { estructura: pct(p.estructura), costeTotal: eur(a.costeTotal, 0) })],
      [I18N.t('gob.horas_de_tramitacion_al'), `${num(p.horas_convenio)} h × ${pct(p.productividad)} = ${num(Math.round(a.horas))} h`],
      [I18N.t('gob.coste_por_hora'), eur(a.hora)],
      [I18N.t('gob.coste_de_tramitar_un'), `${I18N.t('gob.min_min', { minutos_mensaje: dec(p.minutos_mensaje, p.minutos_mensaje % 1 ? 1 : 0), hora: eur(a.hora / 60, 3) })} <b>${eur(a.mensaje)}</b>`],
    ];
    const cm = a.mensaje, fa = d.pAut / 100;
    const series = [
      { label: I18N.t('gob.automatizados'), color: 'var(--ok)', vals: d.dias.map((x) => x[1] * fa * cm) },
      { label: I18N.t('gob.escalados_tiempo_ahorrado'), color: 'var(--ag-extraccion)', vals: d.dias.map((x) => x[1] * (1 - fa) * cm * p.ahorro_escalados) },
    ];
    const escs = Ahorro.ESCENARIOS.map((e) => [e, ahorroDe(d.dias, { ...p, minutos_mensaje: e.minutos_mensaje })]);
    return `<div class="kpi-mini">${kmini('banknote', I18N.t('gob.ahorro_neto_del_periodo'), eur(a.neto, 0), `${d.n} ${d.n === 1 ? 'día' : 'días'}`)}${kmini('calendar', I18N.t('gob.proyeccion_anual'), meur(a.anual), I18N.t('gob.al_ritmo_del_periodo'))}${kmini('coins', I18N.t('gob.retorno_por_de_ia'), `${num(Math.round(a.retorno))} €`, I18N.t('gob.coste_evitado_coste_ia'))}${kmini('scale', I18N.t('gob.coste_por_mensaje'), `${eur(a.mensaje)} a mano`, I18N.t('gob.con_ia', { costeIAMensaje: eur(a.costeIAMensaje, 4) }))}</div>
      <div><h3>${I18N.t('gob.como_se_calcula')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.paso')}</th><th>${I18N.t('gob.dato')}</th><th>${I18N.t('gob.calculo')}</th><th>${I18N.t('gob.resultado')}</th></tr></thead><tbody>${pasos.map(([l, m, c, v]) => `<tr><td>${l}</td><td>${origen(m)}</td><td class="small muted">${c}</td><td class="tnum">${v}</td></tr>`).join('')}<tr class="ahorro-total"><td colspan="3"><b>${I18N.t('gob.ahorro_neto')}</b></td><td class="tnum"><b>${eur(a.neto, 0)}</b></td></tr></tbody></table></div></div>
      <div><h3>${I18N.t('gob.coste_de_un_tramitador')}</h3><div class="tw"><table><tbody>${tramitador.map(([l, v]) => `<tr><td>${l}</td><td class="tnum">${v}</td></tr>`).join('')}</tbody></table></div></div>
      <div><h3>${I18N.t('gob.coste_evitado_por_dia_2')}</h3>${chartApilada(series, d.fechas, { fmt: (v) => eur(v, 0), aria: I18N.t('gob.coste_evitado_por_dia') })}${leyenda(series.map((s) => [s.label, s.color]))}</div>
      <div><h3>${I18N.t('gob.escenarios')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.escenario')}</th><th>${I18N.t('gob.minutos_por_mensaje')}</th><th>${I18N.t('gob.coste_por_mensaje_a')}</th><th>${I18N.t('gob.ahorro_neto_del_periodo')}</th><th>${I18N.t('gob.proyeccion_anual')}</th></tr></thead><tbody>${escs.map(([e, r]) => `<tr${e.minutos_mensaje === p.minutos_mensaje ? ' class="ahorro-total"' : ''}><td>${e.nombre}</td><td class="tnum">${e.minutos_mensaje}</td><td class="tnum">${eur(r.mensaje)}</td><td class="tnum">${eur(r.neto, 0)}</td><td class="tnum">${meur(r.anual)}</td></tr>`).join('')}</tbody></table></div></div>
      <p class="muted small">${I18N.t('gob.es_un_escenario_de')}</p>`;
  }
  KPI_FIN['ahorro'] = {
    icono: 'banknote', titulo: I18N.t('gob.ahorro_estimado'),
    render: () => {
      const p = { ...Ahorro.DEFECTO, ...ahorroParams() };
      const campo = (k, l, v, o) => `<label class="f">${l}<input type="number" data-ahorro="${k}" value="${v}" min="${o[0]}" max="${o[1]}" step="${o[2]}"></label>`;
      return `<p class="small muted">${I18N.t('gob.lo_que_costaria_tramitar')}</p>
        <div class="ahorro-ctl">
          <div class="seg" role="group" aria-label="${I18N.t('gob.escenario')}">${Ahorro.ESCENARIOS.map((e) => `<button type="button" class="seg-btn" data-ahorro-esc="${e.minutos_mensaje}" aria-pressed="${e.minutos_mensaje === p.minutos_mensaje}">${e.nombre}</button>`).join('')}</div>
          ${campo('salario_bruto', I18N.t('gob.salario_bruto_anual_2'), p.salario_bruto, [12000, 80000, 500])}
          ${campo('minutos_mensaje', I18N.t('gob.minutos_por_mensaje'), p.minutos_mensaje, [1, 60, 0.5])}
          ${campo('ahorro_escalados', I18N.t('gob.tiempo_ahorrado_en_un'), Math.round(p.ahorro_escalados * 100), [0, 100, 5])}
          <button type="button" class="btn btn-sm" data-ahorro-reset${Object.keys(ahorroEdit).length ? '' : ' disabled'}>${ic('rotate-ccw')} ${I18N.t('gob.valores_de_partida')}</button>
        </div>
        <div id="ahorro-res">${ahorroResultado()}</div>`;
    },
  };
  function ahorroCambia(redibujar) {
    if (redibujar) { $('modal-kpi-fin-body').innerHTML = KPI_FIN.ahorro.render(); animar($('modal-kpi-fin-body')); }
    else {
      $('ahorro-res').innerHTML = ahorroResultado();
      const m = ahorroParams().minutos_mensaje ?? Ahorro.DEFECTO.minutos_mensaje;
      document.querySelectorAll('[data-ahorro-esc]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.ahorroEsc) === m)));
      const r = document.querySelector('[data-ahorro-reset]'); if (r) r.disabled = !Object.keys(ahorroEdit).length;
    }
    renderFinops();
  }

  function abrirModalKpiFin(key) {
    const info = KPI_FIN[key];
    if (!info) return;
    $('modal-kpi-fin-title').innerHTML = `${ic(info.icono)} ${esc(info.titulo)}`;
    $('modal-kpi-fin-body').innerHTML = info.render();
    abrir('modal-kpi-fin');
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
    return `<svg class="gauge" viewBox="0 0 218 124" role="img" aria-label="${I18N.t('gob.consumo_del_cap_del', { v: Math.round(u * 100) })}">
      <path d="${arc(0.001, aviso / 1.2)}" fill="none" stroke="var(--ok)" stroke-opacity=".2" stroke-width="14"/>
      <path d="${arc(aviso / 1.2, 1 / 1.2)}" fill="none" stroke="var(--warn)" stroke-opacity=".28" stroke-width="14"/>
      <path d="${arc(1 / 1.2, 0.999)}" fill="none" stroke="var(--crit)" stroke-opacity=".28" stroke-width="14"/>
      ${f > 0.004 ? `<path d="${arc(0.001, Math.max(0.006, f))}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>` : ''}
      <line x1="${m0x}" y1="${m0y}" x2="${m1x}" y2="${m1y}" stroke="var(--text)" stroke-width="2"/>
      <text x="${m1x + 3}" y="${m1y - 2}" style="font-size:9px;fill:var(--muted)">100 %</text>
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" style="font-size:30px;font-weight:800;fill:${color}">${Math.round(u * 100)} %</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${I18N.t('gob.del_limite_2')}</text>
    </svg>`;
  }

  // Barras horizontales [etiqueta, valor, color, html?] con el valor y el % al final
  function hbars(items, opts = {}) {
    const total = opts.total || items.reduce((a, [, v]) => a + v, 0) || 1;
    const rowH = 30, W = 640, pl = opts.pl || 150, pr = 90, H = 8 + items.length * rowH, max = Math.max(...items.map(([, v]) => v), 0.0001);
    const f = opts.fmt || ((v) => num(v));
    return `<svg class="chart" data-orient="h" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || I18N.t('gob.distribucion'))}">${items.map(([label, v, color], i) => { const y = 4 + i * rowH; const w = Math.max(v > 0 ? 3 : 0, ((v / max) * (W - pl - pr))); return `<text x="${pl - 10}" y="${y + 15}" text-anchor="end" style="fill:var(--text);font-weight:600">${esc(label)}</text><rect x="${pl}" y="${y}" width="${W - pl - pr}" height="20" rx="4" fill="${color}" opacity=".1"/><rect x="${pl}" y="${y}" width="${w}" height="20" rx="4" fill="${color}" data-tip="${esc(label)}: ${f(v)} · ${Math.round((v / total) * 100)} %"/><text x="${pl + w + 6}" y="${y + 15}" class="tnum">${f(v)} · ${Math.round((v / total) * 100)} %</text>`; }).join('')}</svg>`;
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
  const ambitoHtml = (c) => { const a = agenteDeAmbito(c.ambito); return a ? agTag(a.id) : esc(I18N.dato(c.ambito)); };
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
    const tick = (v) => (c.unidad === '€' ? `${v.toLocaleString(I18N.locale, { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' })} €` : num(Math.round(v)));
    const acum = /mensual/i.test(c.tipo);
    const bw = Math.min(26, ((W - pl - pr) / n) * 0.62);
    const col = (v) => (v >= c.limite ? 'var(--crit)' : v >= aviso ? 'var(--warn)' : 'var(--primary)');
    const pts = serie.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.consumo_de_en_los', { id: esc(c.id), v: n })}">
      <g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * f)}" y2="${ys(ymax * f)}"/><text x="${pl - 6}" y="${ys(ymax * f) + 4}" text-anchor="end">${tick(ymax * f)}</text>`).join('')}</g>
      ${acum ? `<polygon points="${xs(0)},${ys(0)} ${pts} ${xs(n - 1)},${ys(0)}" fill="var(--primary)" opacity=".14"/><polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2.2"/>${serie.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3.2" fill="${col(v)}" stroke="var(--surface)" stroke-width="1.5" data-tip="${I18N.t('gob.acumulados_2', { fechas: fecha(fechas[i]), capFmt: capFmt(c, v) })}"/>`).join('')}`
        : serie.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${col(v)}" opacity="${i === n - 1 ? 1 : 0.62}" data-tip="${I18N.t('gob.del_limite_3', { fechas: fecha(fechas[i]), hoy_parcial_2: i === n - 1 ? I18N.t('gob.hoy_parcial_2') : '', capFmt: capFmt(c, v), limite: Math.round((v / c.limite) * 100) })}"/>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(aviso)}" y2="${ys(aviso)}" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="3 4"/>
      <text x="${pl + 4}" y="${ys(aviso) - 4}" style="fill:var(--warn)">${I18N.t('gob.aviso_2', { aviso_pct: c.aviso_pct || 80 })}</text>
      <line x1="${pl}" x2="${W - pr}" y1="${ys(c.limite)}" y2="${ys(c.limite)}" stroke="var(--crit)" stroke-width="1.6" stroke-dasharray="6 4"/>
      <text x="${pl + 4}" y="${ys(c.limite) - 5}" style="fill:var(--crit);font-weight:700">${I18N.t('gob.limite_3', { limite: capFmt(c, c.limite) })}</text>
      ${fechas.map((d, i) => (n > 8 && i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`)).join('')}
    </svg>`;
  }

  // Acciones correctivas: las del dataset o, si no hay, unas genéricas según el tipo de cap
  function capCorrectivas(c) {
    if (c.correctivas && c.correctivas.length) return c.correctivas;
    const t = String(c.tipo);
    if (c.estado === 'ok') return [{ titulo: I18N.t('gob.sin_accion_necesaria_el'), detalle: I18N.t('gob.revisa_la_tendencia_cada'), impacto: I18N.t('gob.preventiva'), tipo: 'proceso' }];
    const base = /diario|mensual/i.test(t)
      ? [{ titulo: I18N.t('gob.mover_los_casos_sencillos'), detalle: I18N.t('gob.validar_primero_con_un'), impacto: I18N.t('gob.hasta_80_coste'), tipo: 'modelo', replay: true }, { titulo: I18N.t('gob.reprogramar_los_lotes_no'), detalle: I18N.t('gob.reparte_el_consumo_a'), impacto: I18N.t('gob.suaviza_el_pico'), tipo: 'proceso' }]
      : [{ titulo: I18N.t('gob.reducir_el_tamano_del'), detalle: I18N.t('gob.enviar_solo_el_bloque'), impacto: I18N.t('gob.25_tokens'), tipo: 'prompt', replay: true }];
    return [...base, { titulo: I18N.t('gob.reevaluar_el_limite_de', { id: c.id }), detalle: I18N.t('gob.si_el_consumo_es'), impacto: I18N.t('gob.requiere_aprobacion'), tipo: 'config', aprobacion: true }];
  }
  const CORR_ICON = { modelo: 'cpu', prompt: 'file-text', config: 'sliders-horizontal', proceso: 'workflow' };
  const CORR_LABEL = { modelo: I18N.t('gob.modelo'), prompt: I18N.t('gob.prompt'), config: I18N.t('gob.configuracion'), proceso: I18N.t('gob.proceso') };
  const corrEstado = (c, k, x) => (x.estado === 'aplicada' ? 'aplicada' : correctivasEstado[`${c.id}:${k}`] || '');
  function correctivaBotones(c, k, x) {
    const est = corrEstado(c, k, x);
    const replay = x.replay ? `<button class="btn btn-sm" type="button" data-goto="replay" data-replay="1">${ic('play')} ${I18N.t('gob.simular_con_replay')}</button>` : '';
    const traza = x.traza && G.trazas.some((t) => t.id === x.traza) ? `<button class="btn btn-sm" type="button" data-traza="${esc(x.traza)}">${ic('route')} ${I18N.t('gob.ver_traza')}</button>` : '';
    // Solo se puede deshacer lo hecho en esta sesión (no lo que el dataset trae ya aplicado)
    const deshacer = correctivasEstado[`${c.id}:${k}`] && x.estado !== 'aplicada' ? `<button class="btn btn-sm" type="button" data-corr-undo="${esc(c.id)}:${k}" title="${I18N.t('gob.quita_la_accion_simulada')}">${ic('undo-2')} ${I18N.t('gob.deshacer')}</button>` : '';
    const accion = est === 'aplicada' ? `<span class="pill pill-ok">${ic('circle-check')} ${x.auto ? I18N.t('gob.aplicada_automaticamente') : I18N.t('gob.aplicada')}</span>${deshacer}` : est === 'pendiente' ? `<span class="pill pill-time">${ic('hourglass')} ${I18N.t('gob.pendiente_de_aprobacion_2')}</span>${deshacer}` : `<button class="btn btn-sm btn-primary" type="button" data-corr="${esc(c.id)}:${k}">${x.aprobacion ? I18N.t('gob.solicitar_aprobacion', { check: ic('user-check') }) : `${ic('check')} Aplicar`}</button>`;
    return `${replay}${traza}${accion}`;
  }
  function correctivaItem(c, k, x) {
    return `<li class="corr"><span class="ag-ico" style="--c:var(--${x.tipo === 'modelo' ? 'ag-reglas' : x.tipo === 'prompt' ? 'ag-extraccion' : x.tipo === 'config' ? 'time' : 'ag-clasificacion'})">${ic(CORR_ICON[x.tipo] || 'cpu')}</span>
      <div><b>${esc(x.titulo)}</b><small>${conGuardrails(esc(x.detalle))}</small><div class="row small" style="margin-top:.3rem"><span class="pill pill-muted">${esc(CORR_LABEL[x.tipo] || I18N.t('gob.accion'))}</span><span class="pill pill-ok">${ic('zap')} ${esc(x.impacto)}</span>${x.ref ? `<span class="pill pill-time">${esc(x.ref)}</span>` : ''}</div></div>
      <div class="row corr-actions">${correctivaBotones(c, k, x)}</div></li>`;
  }
  function aplicarCorrectiva(capId, k) {
    const c = G.caps.find((x) => x.id === capId); if (!c) return;
    const x = capCorrectivas(c)[k]; if (!x) return;
    const nuevo = x.aprobacion ? 'pendiente' : 'aplicada';
    correctivasEstado[`${capId}:${k}`] = nuevo; ssSet('gobierno.correctivas', correctivasEstado);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: nuevo === 'aplicada' ? 'ok' : 'info', agente: (capAgentes(c)[0] || [])[0] || null, titulo: `${nuevo === 'aplicada' ? I18N.t('gob.accion_correctiva_aplicada') : I18N.t('gob.aprobacion_solicitada_para_una')} sobre ${c.id}`, detalle: `${x.titulo}. Impacto esperado: ${x.impacto}.${nuevo === 'pendiente' ? I18N.t('gob.queda_pendiente_del_comite') : ''}`, usuario: I18N.t('gob.operador_esta_sesion') });
    renderAll();
    if ($('modal-cap').open) abrirModalCap(capId);
  }
  function deshacerCorrectiva(capId, k) {
    const c = G.caps.find((x) => x.id === capId); const x = c && capCorrectivas(c)[k]; if (!x) return;
    const antes = correctivasEstado[`${capId}:${k}`]; if (!antes) return;
    delete correctivasEstado[`${capId}:${k}`]; ssSet('gobierno.correctivas', correctivasEstado);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente: (capAgentes(c)[0] || [])[0] || null, titulo: `${antes === 'aplicada' ? I18N.t('gob.accion_correctiva_deshecha') : I18N.t('gob.solicitud_de_aprobacion_retirada')} sobre ${c.id}`, detalle: I18N.t('gob.vuelve_a_quedar_como', { titulo: x.titulo }), usuario: I18N.t('gob.operador_esta_sesion') });
    renderAll();
    if ($('modal-cap').open) abrirModalCap(capId);
    if ($('modal-med').open) { const m = medidas().find((y) => y.alternativas.some((a) => a.corr === `${capId}:${k}`)); if (m) abrirModalMed(m.id); }
  }

  // Alertas de coste de FinOps: qué ha pasado y cuándo (la alerta), qué regla la disparó y qué hizo sola (el cap)
  // y qué tiene que hacer una persona (la acción correctiva sugerida, con Aplicar / Deshacer).
  // Las alertas del dataset nombran sus caps; un cap superado o en aviso sin alerta (p. ej. uno creado en la sesión) genera la suya.
  const capsDeTexto = (txt) => [...new Set(String(txt).match(/CAP-\d+/g) || [])].map((id) => G.caps.find((c) => c.id === id)).filter(Boolean);
  function alertasCoste() {
    // Los caps de la alerta son los que nombra su título (el detalle puede citar otros solo como contexto)
    const out = (G.alertas || []).map((a) => ({ ...a, caps: capsDeTexto(a.titulo).length ? capsDeTexto(a.titulo) : capsDeTexto(a.detalle) }));
    const cubiertos = new Set(out.flatMap((a) => a.caps.map((c) => c.id)));
    G.caps.filter((c) => (c.estado === 'superado' || c.estado === 'aviso') && !cubiertos.has(c.id)).forEach((c) => out.push({
      sev: c.estado === 'superado' ? 'crit' : 'warn', titulo: `${c.id} ${c.estado === 'superado' ? 'superado' : I18N.t('gob.en_aviso')} · ${c.tipo}: ${capFmt(c, c.consumo)} / ${capFmt(c, c.limite)}`,
      detalle: I18N.t('gob.accion_configurada', { accion: c.accion }), cuando: c.nuevo ? I18N.t('gob.cap_creado_en_esta') : I18N.t('gob.periodo_actual'), caps: [c],
    }));
    const orden = { crit: 0, warn: 1, info: 2 };
    return out.sort((a, b) => (orden[a.sev] ?? 9) - (orden[b.sev] ?? 9));
  }
  const alertasDeCap = (id) => alertasCoste().filter((a) => a.caps.some((c) => c.id === id));
  function renderCorrectivas() {
    const al = alertasCoste();
    $('card-correctivas').hidden = !al.length;
    $('correctivas').innerHTML = al.map((a, n) => {
      // Acción sugerida: la primera pendiente del cap más grave de la alerta
      const c = a.caps.slice().sort((x, y) => (y.estado === 'superado') - (x.estado === 'superado'))[0];
      const lista = c ? capCorrectivas(c) : []; const k = c ? lista.findIndex((x, i) => !corrEstado(c, i, x)) : -1; const x = k >= 0 ? lista[k] : null;
      // Última acción aplicada (o solicitada) en esta sesión para ese cap: se puede deshacer desde la propia alerta
      const hecha = c ? lista.map((y, i) => [y, i]).filter(([, i]) => correctivasEstado[`${c.id}:${i}`]).pop() : null;
      const chips = a.caps.map((cp) => { const [pc, pi] = CAP_ESTADO[cp.estado] || CAP_ESTADO.ok; return `<button class="pill ${pc} cap-chip" type="button" data-cap="${esc(cp.id)}" title="${I18N.t('gob.ver_la_ficha_de', { id: esc(cp.id) })}">${ic(pi)} ${esc(cp.id)} · ${Math.round(capUso(cp) * 100)} %</button>`; }).join(' ');
      return `<div class="alert ${a.sev} alerta-coste" id="alerta-coste-${n}" data-alerta-caps="${esc(a.caps.map((cp) => cp.id).join(' '))}"><span class="ico">${ic(SEV_ICON[a.sev] || 'info')}</span>
        <div><b>${conGuardrails(esc(a.titulo))}</b><small>${conGuardrails(esc(a.detalle))}</small>
          <div class="alerta-coste-det small">
            <span class="muted">${ic('history')} ${esc(a.cuando || '—')}</span>
            ${chips ? `<span>${chips}</span>` : ''}
            ${c ? `<span class="muted">${ic('zap')} <b class="inl">${I18N.t('gob.hizo_el_cap')}</b> ${conGuardrails(esc(c.accion))}</span>` : ''}
            ${x ? `<span>${ic('lightbulb')} <b class="inl">${I18N.t('gob.sugerida')}</b> ${esc(x.titulo)} <span class="pill pill-ok">${esc(x.impacto)}</span></span>` : c ? `<span class="muted">${ic('circle-check')} ${I18N.t('gob.acciones_sugeridas_aplicadas_o')}</span>` : ''}
          </div></div>
        <div class="row" style="justify-content:flex-end">${x ? `<button class="btn btn-sm btn-primary" type="button" data-corr="${esc(c.id)}:${k}">${x.aprobacion ? ic('user-check') : ic('check')} ${x.aprobacion ? I18N.t('gob.solicitar_aprobacion_2') : I18N.t('gob.aplicar')}</button>` : ''}${hecha ? `<button class="btn btn-sm" type="button" data-corr-undo="${esc(c.id)}:${hecha[1]}" title="${I18N.t('gob.deshacer_2', { titulo: esc(hecha[0].titulo) })}">${ic('undo-2')} ${I18N.t('gob.deshacer')}</button>` : ''}</div></div>`;
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
    $('modal-cap-title').innerHTML = `${ic('scale')} <span class="mono">${esc(c.id)}</span> · ${esc(I18N.dato(c.tipo))} · ${ambitoHtml(c)} <span class="pill ${pc}">${ic(pi)} ${pl}</span>${c.nuevo ? ` <span class="pill pill-time">${ic('plus')} ${I18N.t('gob.creado_en_esta_sesion')}</span>` : ''}`;
    $('modal-cap-body').innerHTML = `
      <p class="small muted">${I18N.t('gob.al_superarse', { ambito: esc(c.descripcion || I18N.t('gob.limite_de_para', { toLowerCase: String(I18N.dato(c.tipo)).toLowerCase(), ambito: I18N.dato(c.ambito) })) })} <b>${conGuardrails(esc(c.accion))}</b>.</p>
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('scale')} ${I18N.t('gob.limite_2')}</span><b>${capFmt(c, c.limite)}</b></div>
        <div class="box"><span class="muted small">${ic('coins')} ${I18N.t('gob.consumo_actual')}</span><b>${capFmt(c, c.consumo)}</b></div>
        <div class="box"><span class="muted small">${ic('gauge')} ${margen >= 0 ? I18N.t('gob.margen_restante') : I18N.t('gob.exceso_sobre_el_limite')}</span><b style="color:var(--${margen >= 0 ? 'ok' : 'crit'})">${margen >= 0 ? '' : '+'}${capFmt(c, Math.abs(margen))}</b></div>
        <div class="box"><span class="muted small">${ic('triangle-alert')} ${I18N.t('gob.superaciones')}</span><b>${nSup}</b><span class="muted small">${I18N.t('gob.aviso_3', { nAv, nAv2: nAv === 1 ? '' : 's' })}</span></div>
        <div class="box"><span class="muted small">${ic('calendar')} ${I18N.t('gob.activo_desde')}</span><b>${c.desde ? new Date(c.desde).toLocaleDateString(I18N.locale, { day: '2-digit', month: 'short' }) : '—'}</b><span class="muted small">${esc(c.propietario || I18N.t('gob.gobierno_ia'))}</span></div>
      </div>
      <div class="cap-hero">
        <div class="box cap-gauge">${gaugeSvg(u, (c.aviso_pct || 80) / 100)}<span class="small muted">${I18N.t('gob.aviso_al_accion_al', { aviso_pct: c.aviso_pct || 80 })}</span></div>
        <div><h3>${I18N.t('gob.frente_al_limite', { consumo_de_los_ultimos: /mensual/i.test(c.tipo) ? I18N.t('gob.consumo_acumulado_del_mes') : I18N.t('gob.consumo_de_los_ultimos') })}</h3>${serie.length ? chartCapSerie(c, serie, fechas) : I18N.t('gob.sin_serie_historica')}<div class="legend"><span><i style="background:var(--primary)"></i>${I18N.t('gob.dentro')}</span><span><i style="background:var(--warn)"></i>${I18N.t('gob.aviso_4')}</span><span><i style="background:var(--crit)"></i>${I18N.t('gob.limite_4')}</span></div></div>
      </div>
      <div class="two">
        <div><h3>${I18N.t('gob.agentes_implicados_reparto_del')}</h3>
          <div class="stackbar" role="img" aria-label="${I18N.t('gob.reparto_del_consumo_por')}">${agentes.map(([aid, v]) => `<i style="flex:${v};background:${agColor(aid)}" data-tip="${esc(agNombre(aid))}: ${Math.round(v * 100)} %"></i>`).join('')}</div>
          <ul class="rel-list">${agentes.map(([aid, v]) => { const a = AG[aid]; const est = estadoAgente(a); return `<li>${agTag(aid)}<span class="meter" style="--c:${agColor(aid)}"><i style="width:${v * 100}%"></i></span><b class="tnum">${Math.round(v * 100)} %</b>${lvlBadge(a.nivel)}<span class="pill ${(ESTADO[est] || ESTADO.activo)[0]}">${(ESTADO[est] || ESTADO.activo)[2].replace(/ \(.*\)/, '')}</span><button class="btn btn-sm" type="button" data-ver-agente="${esc(aid)}">${I18N.t('gob.ver_agente')}</button></li>`; }).join('')}</ul>
        </div>
        <div><h3>${I18N.t('gob.relacion_con_guardrails_y')}</h3>
          ${relGr.length ? `<ul class="rel-list simple">${relGr.map((p) => `<li>${grRef(p.id)} <span class="small">${esc(p.condicion)} → ${esc(p.accion)}</span></li>`).join('')}</ul>` : I18N.t('gob.ningun_guardrail_enlazado_la')}
          ${(G.recomendaciones || []).filter((r) => lista.some((x) => x.ref === r.id)).map((r) => `<div class="alert ${r.sev}" style="margin-top:.5rem"><span class="ico">${ic('lightbulb')}</span><div><b>${esc(r.id)} · ${conGuardrails(esc(r.titulo))}</b></div></div>`).join('')}
        </div>
      </div>
      <div><h3>${I18N.t('gob.historico_de_superaciones_y', { cap_nuevo_sin_historico: c.nuevo ? I18N.t('gob.cap_nuevo_sin_historico') : '' })}</h3>
        ${sup.length ? `<div class="sup-grid"><div>${barrasSup.length ? `<span class="muted small">${I18N.t('gob.superaciones_por_agente')}</span>${hbars(barrasSup, { pl: 170, aria: I18N.t('gob.superaciones_por_agente') })}` : I18N.t('gob.solo_ha_habido_avisos')}</div>
        <div class="tw tabla-compacta"><table><thead><tr><th>${I18N.t('gob.fecha')}</th><th>${I18N.t('gob.agente')}</th><th>${I18N.t('gob.valor')}</th><th>${I18N.t('gob.accion_automatica')}</th><th>${I18N.t('gob.duracion')}</th><th>${I18N.t('gob.estado')}</th></tr></thead><tbody>${sup.map((s) => `<tr><td class="tnum">${fechaHora(s.fecha)}</td><td>${agTag(s.agente)}</td><td class="tnum"><b>${capFmt(c, s.valor)}</b> <span class="muted small">${Math.round((s.valor / c.limite) * 100)} %</span></td><td class="wrap">${conGuardrails(esc(s.accion))}${s.traza && G.trazas.some((t) => t.id === s.traza) ? ` <button class="btn btn-sm" type="button" data-traza="${esc(s.traza)}">${ic('route')} ${esc(s.traza)}</button>` : ''}</td><td>${esc(s.duracion)}</td><td><span class="pill ${s.estado === 'resuelto' ? 'pill-ok' : 'pill-warn'}">${esc(I18N.dato(s.estado))}</span></td></tr>`).join('')}</tbody></table></div></div>` : I18N.t('gob.este_cap_no_se')}
      </div>
      <div><h3>${c.estado === 'ok' ? I18N.t('gob.recomendaciones_preventivas') : I18N.t('gob.accion_correctiva_sugerida')}</h3><ul class="corr-list">${lista.map((x, k) => correctivaItem(c, k, x)).join('')}</ul></div>
      ${evs.length ? `<div><h3>${I18N.t('gob.actividad_relacionada_en_el')}</h3><ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}`;
    abrir('modal-cap');
  }

  // ---- Nuevo cap -----------------------------------------------------------
  const TIPOS_CAP = [
    { v: I18N.t('gob.coste_diario'), u: '€', paso: 0.5 }, { v: I18N.t('gob.coste_mensual'), u: '€', paso: 10 }, { v: I18N.t('gob.coste_por_traza'), u: '€', paso: 0.005 },
    { v: I18N.t('gob.tokens_por_traza'), u: 'tok', paso: 100 }, { v: I18N.t('gob.tokens_de_razonamiento_por'), u: 'tok', paso: 50 }, { v: I18N.t('gob.llamadas_minuto'), u: 'req', paso: 5 },
  ];
  const ACCIONES_CAP = [I18N.t('gob.solo_alertar'), I18N.t('gob.alertar_y_marcar_la'), I18N.t('gob.degradar_a_gpt_5'), I18N.t('gob.pausar_lotes_no_urgentes'), I18N.t('gob.encolar_rate_limit_interno'), I18N.t('gob.escalar_a_humano')];
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
    const ambitos = ['Global', ...G.agentes.slice(0, 4).map((a) => a.nombre), I18N.t('gob.por_mensaje')];
    $('modal-cap-nuevo-title').innerHTML = I18N.t('gob.nuevo_cap_de_finops', { plus: ic('plus') });
    $('modal-cap-nuevo-body').innerHTML = `
      <p class="small muted">${I18N.t('gob.un_cap_limita_el')}</p>
      <div class="form-grid">
        <form id="form-cap" class="form" autocomplete="off" novalidate>
          <label class="f">${I18N.t('gob.ambito')}<select id="nc-ambito">${ambitos.map((a) => `<option value="${esc(a)}">${agenteDeAmbito(a) ? I18N.t('gob.agente_de') : ''}${esc(a)}</option>`).join('')}</select></label>
          <label class="f">${I18N.t('gob.que_se_mide')}<select id="nc-tipo">${TIPOS_CAP.map((t) => `<option>${esc(t.v)}</option>`).join('')}</select></label>
          <label class="f">${I18N.t('gob.limite_2')}<span class="input-unit"><input id="nc-limite" type="number" min="0" step="any" inputmode="decimal" aria-describedby="nc-err"><b id="nc-unidad">€</b></span></label>
          <label class="f"><span>${I18N.t('gob.umbral_de_aviso')} <b id="nc-aviso-v" class="tnum">80 %</b> ${I18N.t('gob.del_limite_2')}</span><input id="nc-aviso" type="range" min="50" max="95" step="5" value="80"></label>
          <label class="f">${I18N.t('gob.al_superar_el_limite')}<select id="nc-accion">${ACCIONES_CAP.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>
          <label class="f">${I18N.t('gob.notificar_a')}<select id="nc-notif"><option>${I18N.t('gob.finops_2')}</option><option>${I18N.t('gob.gobierno_ia')}</option><option>${I18N.t('gob.comite_ia')}</option><option>${I18N.t('gob.responsable_del_agente')}</option></select></label>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.descripcion_opcional')}<input id="nc-desc" type="text" maxlength="140" placeholder="${I18N.t('gob.para_que_sirve_este')}"></label>
          <p id="nc-err" class="form-err" role="alert" hidden></p>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn" type="button" data-close="modal-cap-nuevo">${I18N.t('gob.cancelar')}</button><button class="btn btn-primary" type="submit">${ic('check')} ${I18N.t('gob.crear_cap')}</button></div>
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
    const c = { id: I18N.t('gob.nuevo_2'), ambito, tipo: t.v, unidad: t.u, limite: ok ? limite : 1, consumo: base.consumo, aviso_pct: aviso };
    const u = ok ? base.consumo / limite : 0; const dias = ok ? base.serie.filter((v) => v >= limite).length : 0; const avisos = ok ? base.serie.filter((v) => v >= limite * aviso / 100 && v < limite).length : 0;
    const est = u >= 1 ? ['crit', 'superado'] : u >= aviso / 100 ? ['warn', I18N.t('gob.en_aviso')] : ['ok', I18N.t('gob.dentro_del_limite')];
    const dup = G.caps.find((x) => x.ambito === ambito && x.tipo === t.v);
    $('nc-preview').innerHTML = `<h3>${I18N.t('gob.vista_previa')}</h3>
      ${ok ? `<div class="cap-gauge">${gaugeSvg(u, aviso / 100)}</div>
        <p class="small"><span class="pill pill-${est[0]}">${est[1]}</span> ${I18N.t('gob.con_este_limite_el', { consumo: capFmt(c, base.consumo) })} <b>${Math.round(u * 100)} %</b>${I18N.t('gob.en_los_ultimos_14')} <b>${dias}</b> ${I18N.t('gob.y_saltado_el_aviso', { veces: dias === 1 ? 'vez' : 'veces', avisos, veces2: avisos === 1 ? 'vez' : 'veces' })}</p>
        ${chartCapSerie(c, base.serie, fechasSerie(), 170)}` : I18N.t('gob.introduce_un_limite_mayor')}
      ${dup ? `<p class="small" style="margin-top:.5rem">${ic('info')} ${I18N.t('gob.ya_existe')} <b>${esc(dup.id)}</b> ${I18N.t('gob.con_el_mismo_ambito')}</p>` : ''}`;
  }
  function guardarCapNuevo() {
    const { t, ambito, limite, aviso, base } = leerCapNuevo(); const err = $('nc-err');
    if (!Number.isFinite(limite) || limite <= 0) { err.textContent = I18N.t('gob.indica_un_limite_numerico'); err.hidden = false; $('nc-limite').focus(); return; }
    err.hidden = true;
    const id = siguienteId('CAP', G.caps);
    const c = { id, ambito, tipo: t.v, limite, unidad: t.u, consumo: Math.round(base.consumo * 1000) / 1000, accion: $('nc-accion').value, aviso_pct: aviso, notificar: $('nc-notif').value, descripcion: $('nc-desc').value.trim() || undefined, desde: new Date().toISOString().slice(0, 10), propietario: $('nc-notif').value, serie: base.serie, superaciones: [], nuevo: true };
    c.estado = capEstadoDe(c);
    capsNuevos.push(c); ssSet('gobierno.caps_nuevos', capsNuevos);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente: (agenteDeAmbito(ambito) || {}).id || null, titulo: `Nuevo cap ${id}: ${t.v} · ${ambito} · ${capFmt(c, limite)}`, detalle: I18N.t('gob.aviso_al_al_superarlo', { aviso, accion: c.accion, notificar: c.notificar }), usuario: I18N.t('gob.operador_esta_sesion') });
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
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.disparos_de_por_dia', { id: esc(p.id) })}">
      <g class="grid">${[0, 0.5, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * f)}" y2="${ys(ymax * f)}"/><text x="${pl - 6}" y="${ys(ymax * f) + 4}" text-anchor="end">${Math.round(ymax * f)}</text>`).join('')}</g>
      ${D.map((v, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${Math.max(0, ys(0) - ys(v))}" rx="3" fill="${c}" opacity="${i === n - 1 ? 1 : 0.7}" data-tip="${I18N.t('gob.disparo', { fechas: fecha(fechas[i]), v, v2: v === 1 ? '' : 's', pico_del_periodo_2: i === pico && max > 0 ? I18N.t('gob.pico_del_periodo_2') : '' })}"/><text x="${xs(i)}" y="${ys(v) - 5}" text-anchor="middle" style="fill:var(--text);font-weight:${i === pico && max > 0 ? 800 : 500}">${v}</text>`).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${ys(media)}" y2="${ys(media)}" stroke="var(--time)" stroke-width="1.4" stroke-dasharray="5 4"/>
      <text x="${pl + 4}" y="${ys(media) - 5}" style="fill:var(--time);font-weight:700">${I18N.t('gob.media_dia', { replace: dec(media, 1) })}</text>
      ${fechas.map((d, i) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d)}</text>`).join('')}
    </svg>`;
  }
  // Disparos por hora del día (24 barras)
  function chartHoras(horas, color) {
    const W = 760, H = 150, pl = 30, pr = 16, pt = 12, pb = 24, max = Math.max(1, ...horas);
    const bw = (W - pl - pr) / 24, ys = (v) => pt + (1 - v / max) * (H - pt - pb);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.disparos_por_hora_del')}">
      ${horas.map((v, h) => `<rect x="${pl + h * bw + 2}" y="${ys(v)}" width="${bw - 4}" height="${Math.max(0, ys(0) - ys(v))}" rx="2" fill="${color}" opacity="${0.35 + 0.65 * (v / max)}" data-tip="${I18N.t('gob.00_59_disparo', { padStart: String(h).padStart(2, '0'), v, v2: v === 1 ? '' : 's' })}"/>${h % 3 === 0 ? `<text x="${pl + h * bw + bw / 2}" y="${H - 7}" text-anchor="middle">${I18N.t('gob.h', { padStart: String(h).padStart(2, '0') })}</text>` : ''}`).join('')}
    </svg>`;
  }

  function abrirModalGr(id) {
    const p = G.politicas.find((x) => x.id === id); if (!p) return;
    const activa = politicaActiva(p); const total = p.disparos || 0, D = p.disparos_dia || [];
    const fechas = fechasSerie(); const r = rng(`gr-${p.id}`);
    const media = D.length ? total / D.length : 0; const max = Math.max(0, ...D);
    const totalEscalados = G.politicas.filter((x) => x.severidad === 'humano').reduce((a, x) => a + (x.disparos || 0), 0);
    const compartido = p.severidad === 'humano' && totalEscalados ? Math.round((total / totalEscalados) * 100) : null;
    const override = total ? dec(1.5 + r() * 7, 1) : null; const resolucion = p.severidad === 'humano' && total ? Math.round(4 + r() * 18) : null;
    const canalPesos = p.id === 'G-09' ? [0, 0, 0, 1, 0] : [0.3, 0.2, 0.2, 0.1, 0.2];
    const canales = total ? distribuir(total, canalPesos.map((v) => v || 0.0001), `${p.id}c`).map((v, i) => [canalInfo(CANALES_ORDEN[i])[1], p.id === 'G-09' && i !== 3 ? 0 : v, 'var(--primary)']) : [];
    const ramoPesos = p.id === 'G-04' ? [0.55, 0.15, 0.3] : p.id === 'G-02' ? [0.4, 0.4, 0.2] : [0.4, 0.33, 0.27];
    const ramos = total ? distribuir(total, ramoPesos, `${p.id}r`).map((v, i) => [['Auto', 'Hogar', 'Salud'][i], v, ['var(--auto)', 'var(--hogar)', 'var(--salud)'][i]]) : [];
    const horasPeso = Array.from({ length: 24 }, (_, h) => (h < 7 ? 0.25 : h < 9 ? 1 : h < 14 ? 2.3 : h < 16 ? 1.3 : h < 20 ? 1.9 : 0.6));
    const horas = total ? distribuir(total, horasPeso, `${p.id}h`) : horasPeso.map(() => 0);
    const relCaps = [...new Set(`${p.descripcion || ''} ${p.accion} ${p.condicion}`.match(/CAP-\d{2}/g) || [])];
    const evs = (G.eventos || []).filter((e) => `${e.titulo} ${e.detalle}`.includes(p.id)).slice(0, 6);
    const ult = (p.ultimos || []).slice().sort((a, b) => b[0].localeCompare(a[0]));
    $('modal-gr-title').innerHTML = `${ic('shield-check')} <span class="mono">${esc(p.id)}</span> · ${esc(p.condicion)} <span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span> <span class="pill ${activa ? 'pill-ok' : 'pill-muted'}">${activa ? I18N.t('gob.activo') : I18N.t('gob.inactivo_2')}</span>${p.nuevo ? ` <span class="pill pill-time">${ic('plus')} ${I18N.t('gob.creado_en_esta_sesion')}</span>` : ''}`;
    $('modal-gr-body').innerHTML = `
      <p class="small muted">${conGuardrails(esc(p.descripcion || I18N.t('gob.sin_descripcion')))}</p>
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('bell')} ${I18N.t('gob.disparos_en_14_dias')}</span><b>${num(total)}</b></div>
        <div class="box"><span class="muted small">${ic('chart-column')} ${I18N.t('gob.media_por_dia')}</span><b>${dec(media, 1)}</b></div>
        <div class="box"><span class="muted small">${ic('gauge')} ${I18N.t('gob.pico_diario')}</span><b>${max}</b>${max ? `<span class="muted small">${fecha(fechas[D.indexOf(max)])}</span>` : ''}</div>
        ${compartido != null ? `<div class="box"><span class="muted small">${ic('user-check')} ${I18N.t('gob.parte_de_los_escalados')}</span><b>${compartido} %</b></div>` : ''}
        ${override ? `<div class="box"><span class="muted small">${ic('repeat')} ${I18N.t('gob.override_humano_tras_el')}</span><b>${override} %</b></div>` : ''}
        ${resolucion ? `<div class="box"><span class="muted small">${ic('timer')} ${I18N.t('gob.resolucion_humana_mediana')}</span><b>${I18N.t('gob.min_2', { resolucion })}</b></div>` : ''}
      </div>
      <div><h3>${I18N.t('gob.disparos_por_dia_ultimos_2', { D: D.length })}</h3>${total ? chartDisparos(p, fechas) : `<div class="box"><span class="muted">${ic('info')} ${I18N.t('gob.este_guardrail_todavia_no', { se_acaba_de_crear: p.nuevo ? I18N.t('gob.se_acaba_de_crear') : '' })}</span></div>`}</div>
      ${total ? `<div class="two"><div><h3>${I18N.t('gob.disparos_por_canal')}</h3>${hbars(canales, { pl: 130, aria: I18N.t('gob.disparos_por_canal') })}</div><div><h3>${I18N.t('gob.disparos_por_ramo')}</h3>${hbars(ramos, { pl: 80, aria: I18N.t('gob.disparos_por_ramo') })}</div></div>
      <div><h3>${I18N.t('gob.disparos_por_hora_del')}</h3>${chartHoras(horas, agColor(p.agente))}<p class="muted small">${I18N.t('gob.distribuciones_estimadas_para_la')}</p></div>` : ''}
      <div class="two">
        <div><h3>${I18N.t('gob.condicion_y_accion')}</h3><dl class="kv"><dt>${I18N.t('gob.agente')}</dt><dd>${agTag(p.agente)} <button class="btn btn-sm" type="button" data-ver-agente="${esc(p.agente)}">${I18N.t('gob.ver_agente')}</button></dd><dt>${I18N.t('gob.condicion')}</dt><dd>${esc(p.condicion)}</dd><dt>${I18N.t('gob.accion')}</dt><dd>${esc(p.accion)}</dd><dt>${I18N.t('gob.efecto')}</dt><dd><span class="sev sev-${esc(p.severidad || 'humano')}">${SEV[p.severidad] || esc(p.severidad)}</span></dd><dt>${I18N.t('gob.estado')}</dt><dd><label class="switch${activa ? '' : ' off'}" data-guardrail="${esc(p.id)}" data-reabrir="${esc(p.id)}" style="margin-left:0"><i></i>${activa ? I18N.t('gob.activo') : I18N.t('gob.inactivo_2')}</label> <span class="muted small">${I18N.t('gob.se_registra_en_el')}</span></dd></dl></div>
        <div><h3>${I18N.t('gob.relaciones')}</h3>${relCaps.length ? `<p class="small">${I18N.t('gob.caps_vinculados', { grRef: relCaps.map(grRef).join(' · ') })}</p>` : ''}${evs.length ? `<ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${esc(e.usuario)}</small></div></li>`).join('')}</ul>` : I18N.t('gob.sin_eventos_en_el')}</div>
      </div>
      <div><h3>${I18N.t('gob.ultimos_disparos_2')}</h3>${ult.length ? `<div class="tw"><table><thead><tr><th>${I18N.t('gob.fecha')}</th><th>${I18N.t('gob.traza')}</th><th>${I18N.t('gob.resultado')}</th></tr></thead><tbody>${ult.map(([f, traza, res]) => { const tid = (traza.match(/TRZ-[0-9A-Z]+/) || [])[0]; const existe = tid && G.trazas.some((t) => t.id === tid); return `<tr><td class="tnum">${fechaHora(f)}</td><td class="mono">${existe ? `<button class="btn btn-sm" type="button" data-traza="${esc(tid)}">${ic('route')} ${esc(traza)}</button>` : esc(traza)}</td><td>${esc(res)}</td></tr>`; }).join('')}</tbody></table></div>` : I18N.t('gob.sin_disparos_registrados_2')}</div>`;
    abrir('modal-gr');
  }

  // ---- Nuevo guardrail -----------------------------------------------------
  const PLANTILLAS_GR = [
    { id: 'conf', label: I18N.t('gob.confianza_de_la_decision'), unidad: '', def: 0.85, paso: 0.01, cond: (v) => I18N.t('gob.confianza_de_la_decision_2', { replace: numero(v) }), tasa: (v) => 0.0004 + (v - 0.7) * 0.016 },
    { id: 'imp', label: I18N.t('gob.importe_estimado_superior_a'), unidad: '€', def: 6000, paso: 500, cond: (v) => `Importe > ${num(v)} €`, tasa: (v) => 0.0065 * (6000 / Math.max(v, 100)) ** 0.8 },
    { id: 'raz', label: I18N.t('gob.tokens_de_razonamiento_por_2'), unidad: 'tok', def: 2000, paso: 100, cond: (v) => I18N.t('gob.tokens_de_razonamiento', { v: num(v) }), tasa: (v) => 0.0025 * (2000 / Math.max(v, 100)) ** 1.2 },
    { id: 'coste', label: I18N.t('gob.coste_de_la_traza'), unidad: '€', def: 0.05, paso: 0.005, cond: (v) => I18N.t('gob.coste_de_la_traza_2', { replace: numero(v) }), tasa: (v) => 0.003 * (0.05 / Math.max(v, 0.005)) ** 1.1 },
    { id: 'stt', label: I18N.t('gob.confianza_de_la_transcripcion'), unidad: '', def: 0.7, paso: 0.05, cond: (v) => I18N.t('gob.transcripcion_telefonica_con_confianza', { replace: numero(v) }), tasa: (v) => 0.0005 + (v - 0.5) * 0.004 },
    { id: 'les', label: I18N.t('gob.hay_lesionados'), fijo: I18N.t('gob.lesionados_si'), tasa: () => 0.0038 },
    { id: 'ind', label: I18N.t('gob.ramo_indeterminado'), fijo: I18N.t('gob.ramo_indeterminado_2'), tasa: () => 0.0013 },
    { id: 'dat', label: I18N.t('gob.faltan_datos_clave_poliza'), fijo: I18N.t('gob.no_de_poliza_y'), tasa: () => 0.0052 },
    { id: 'cus', label: I18N.t('gob.condicion_personalizada'), custom: true, tasa: () => 0.002 },
  ];
  const ACCIONES_GR = [
    { v: I18N.t('gob.escalar_a_humano'), sev: 'humano' }, { v: I18N.t('gob.escalar_a_humano_pedir'), sev: 'humano' },
    { v: I18N.t('gob.degradar_modelo_a_gpt'), sev: 'degradar' }, { v: I18N.t('gob.fallback_a_motor_local'), sev: 'marcar' }, { v: I18N.t('gob.marcar_la_traza_para'), sev: 'marcar' },
  ];

  function abrirModalGrNuevo() {
    $('modal-gr-nuevo-title').innerHTML = `${ic('plus')} Nuevo guardrail`;
    $('modal-gr-nuevo-body').innerHTML = `
      <p class="small muted">${I18N.t('gob.un_guardrail_limita_la')}</p>
      <div class="form-grid">
        <form id="form-gr" class="form" autocomplete="off" novalidate>
          <label class="f">${I18N.t('gob.agente_al_que_aplica')}<select id="ng-agente">${G.agentes.slice(0, 4).map((a) => `<option value="${esc(a.id)}"${a.id === 'reglas' ? ' selected' : ''}>${I18N.t('gob.agente_de_2', { nombre: esc(a.nombre) })}</option>`).join('')}</select></label>
          <label class="f">${I18N.t('gob.cuando_se_dispara')}<select id="ng-plantilla">${PLANTILLAS_GR.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select></label>
          <label class="f" id="ng-umbral-w">${I18N.t('gob.umbral')}<span class="input-unit"><input id="ng-umbral" type="number" min="0" step="any" inputmode="decimal"><b id="ng-unidad"></b></span></label>
          <label class="f" id="ng-cond-w" style="grid-column:1/-1" hidden>${I18N.t('gob.condicion')}<input id="ng-cond" type="text" maxlength="120" placeholder="${I18N.t('gob.ej_canal_telefono_y')}"></label>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.que_hace_cuando_se')}<select id="ng-accion">${ACCIONES_GR.map((a) => `<option>${esc(a.v)}</option>`).join('')}</select></label>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.descripcion_opcional')}<input id="ng-desc" type="text" maxlength="200" placeholder="${I18N.t('gob.por_que_existe_este')}"></label>
          <label class="inline-check"><input id="ng-activa" type="checkbox" checked> ${I18N.t('gob.activarlo_al_crearlo')}</label>
          <p id="ng-err" class="form-err" role="alert" hidden></p>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn" type="button" data-close="modal-gr-nuevo">${I18N.t('gob.cancelar')}</button><button class="btn btn-primary" type="submit">${ic('check')} ${I18N.t('gob.crear_guardrail')}</button></div>
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
    $('ng-preview').innerHTML = `<h3>${I18N.t('gob.asi_quedara_en_la')}</h3>
      <div class="box" style="background:var(--surface)"><div class="row" style="justify-content:space-between"><b class="mono">${esc(siguienteId('G', G.politicas))}</b><span class="sev sev-${accion.sev}">${SEV[accion.sev]}</span></div><div style="margin:.4rem 0">${agTag(agente)}</div><div><b>${condicion ? esc(condicion) : I18N.t('gob.escribe_la_condicion')}</b></div><div class="small muted" style="margin-top:.2rem">→ ${esc(accion.v)}</div></div>
      <h3 style="margin-top:.8rem">${I18N.t('gob.impacto_estimado')}</h3>
      ${valido ? `<div class="kpi-mini"><div class="box"><span class="muted small">${I18N.t('gob.disparos_en_14_dias')}</span><b>≈ ${num(n)}</b></div><div class="box"><span class="muted small">${I18N.t('gob.mensajes_afectados')}</span><b>${dec(pctMsgs, pctMsgs < 1 ? 2 : 1)} %</b></div></div>
        <p class="small muted" style="margin-top:.5rem">${I18N.t('gob.estimacion_orientativa_sobre_mensajes', { msgs: num(msgs), los_casos_disparados_se_: accion.sev === 'humano' ? I18N.t('gob.cada_disparo_envia_el', { v: num(n) }) : accion.sev === 'degradar' ? I18N.t('gob.los_casos_disparados_se') : I18N.t('gob.los_casos_disparados_se_2') })}</p>` : I18N.t('gob.completa_la_condicion_para')}`;
  }
  function guardarGrNuevo() {
    const { t, umbral, accion, condicion, agente } = leerGrNuevo(); const err = $('ng-err');
    if (t.custom && !condicion) { err.textContent = I18N.t('gob.escribe_la_condicion_del'); err.hidden = false; $('ng-cond').focus(); return; }
    if (t.def != null && (!Number.isFinite(umbral) || umbral <= 0)) { err.textContent = I18N.t('gob.indica_un_umbral_numerico'); err.hidden = false; $('ng-umbral').focus(); return; }
    err.hidden = true;
    const id = siguienteId('G', G.politicas);
    const p = { id, agente, condicion, accion: accion.v, severidad: accion.sev, disparos: 0, activa: $('ng-activa').checked, descripcion: $('ng-desc').value.trim() || I18N.t('gob.guardrail_creado_en_esta', { condicion, accion: accion.v }), disparos_dia: Array(14).fill(0), ultimos: [], nuevo: true };
    grNuevos.push(p); ssSet('gobierno.gr_nuevos', grNuevos);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente, titulo: `Nuevo guardrail ${id}: ${condicion}`, detalle: `${accion.v}. ${p.activa ? I18N.t('gob.activo_desde_su_creacion') : I18N.t('gob.creado_inactivo')}`, usuario: I18N.t('gob.operador_esta_sesion') });
    $('modal-gr-nuevo').close();
    goto('guardrails'); renderAll();
    const fila = document.querySelector(`#policies tr[data-gr="${id}"]`);
    if (fila) { fila.scrollIntoView({ block: 'center', behavior: 'smooth' }); fila.classList.add('is-new'); setTimeout(() => fila.classList.remove('is-new'), 2600); }
  }

  // ---------------------------------------------------------------------------
  // Autonomía · auditoría: registro completo de un cambio de nivel
  // ---------------------------------------------------------------------------
  const CRITERIOS_NIVEL = {
    1: [I18N.t('gob.piloto_con_muestra_minima'), I18N.t('gob.una_persona_confirma_cada'), I18N.t('gob.metricas_de_base_registradas')],
    2: [I18N.t('gob.precision_97_en_el'), I18N.t('gob.guardrails_definidos_y_activos'), I18N.t('gob.tasa_de_override_inferior'), I18N.t('gob.escalado_a_humano_con')],
    3: [I18N.t('gob.precision_99_en_7'), I18N.t('gob.override_por_debajo_del'), I18N.t('gob.sin_incidentes_criticos_en'), I18N.t('gob.auditoria_a_posteriori_definida'), I18N.t('gob.cap_de_coste_configurado')],
  };
  const CRITERIOS_BAJADA = [I18N.t('gob.tasa_de_override_por_2'), I18N.t('gob.incidente_o_aprobaciones_indebidas'), I18N.t('gob.revision_del_comite_ia')];
  const CONSECUENCIA = { sube: I18N.t('gob.menos_casos_pasan_por'), baja: I18N.t('gob.mas_casos_pasan_por'), igual: I18N.t('gob.el_nivel_de_autonomia') };

  function chartNivelesAgente(mismos, sel) {
    const W = 640, H = 200, pl = 92, pr = 20, pt = 14, pb = 28;
    const t0 = new Date(mismos[0][0].fecha).getTime(), t1 = Math.max(new Date(hoyIso()).getTime(), new Date(mismos[mismos.length - 1][0].fecha).getTime() + 864e5);
    const xs = (iso) => pl + ((new Date(iso).getTime() - t0) / (t1 - t0 || 1)) * (W - pl - pr), ys = (n) => pt + (1 - n / 3) * (H - pt - pb);
    let d = `M${xs(mismos[0][0].fecha)},${ys(mismos[0][0].de)}`; let nivel = mismos[0][0].de;
    mismos.forEach(([c]) => { d += ` L${xs(c.fecha)},${ys(nivel)} L${xs(c.fecha)},${ys(c.a)}`; nivel = c.a; });
    d += ` L${xs(new Date(t1).toISOString())},${ys(nivel)}`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.evolucion_del_nivel_de')}">
      <g class="grid">${G.niveles.map((l) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(l.n)}" y2="${ys(l.n)}"/><text x="${pl - 8}" y="${ys(l.n) + 4}" text-anchor="end">${I18N.t('gob.l_2', { v: l.n, nombre: esc(l.nombre) })}</text>`).join('')}</g>
      <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linejoin="round"/>
      ${mismos.map(([c, i]) => `<circle cx="${xs(c.fecha)}" cy="${ys(c.a)}" r="${i === sel ? 8 : 5}" fill="${c.de === c.a ? 'var(--surface)' : c.a > c.de ? 'var(--ok)' : 'var(--crit)'}" stroke="${i === sel ? 'var(--text)' : 'var(--primary)'}" stroke-width="${i === sel ? 3 : 1.6}" data-cambio="${i}" style="cursor:pointer" data-tip="${fechaHora(c.fecha)} · ${c.de === c.a ? I18N.t('gob.sin_cambio_l', { v: c.a }) : `L${c.de} → L${c.a}`} · ${esc(c.usuario)}"/>`).join('')}
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
    const tipo = c.de === c.a ? ['pill-muted', 'sliders-horizontal', I18N.t('gob.cambio_de_configuracion')] : c.a > c.de ? ['pill-ok', 'zap', I18N.t('gob.promocion')] : ['pill-crit', 'undo-2', I18N.t('gob.degradacion')];
    const dir = c.de === c.a ? 'igual' : c.a > c.de ? 'sube' : 'baja';
    const auditId = `AUD-${c.fecha.slice(0, 10).replace(/-/g, '')}-${String(orden).padStart(2, '0')}`;
    const rol = /Comité/.test(c.usuario) ? I18N.t('gob.organo_colegiado_acta_del') : /Sistema/.test(c.usuario) ? I18N.t('gob.automatico_guardrail_del_sistema') : /Gobierno/.test(c.usuario) ? I18N.t('gob.equipo_de_gobierno_ia') : I18N.t('gob.equipo_tecnico');
    const vigente = sig ? I18N.t('gob.dia_hasta', { fecha: diasEntre(c.fecha, sig[0].fecha), fecha2: diasEntre(c.fecha, sig[0].fecha) === 1 ? '' : 's', fecha3: fechaHora(sig[0].fecha) }) : I18N.t('gob.dias_hasta_hoy', { hoyIso: diasEntre(c.fecha, hoyIso()) });
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
      <p class="small"><b>${I18N.t('gob.motivo')}</b> ${conGuardrails(esc(c.motivo))}</p>
      ${c.pendiente ? `<p class="small"><span class="pill pill-review">${ic('clock')} ${I18N.t('gob.pendiente_de_aprobacion_2')}</span> ${I18N.t('gob.es_una_propuesta_generada')}</p>` : ''}
      <p class="small muted">${CONSECUENCIA[dir]}</p>
      <div class="two">
        <div><h3>${I18N.t('gob.registro_de_auditoria')}</h3><dl class="kv"><dt>${I18N.t('gob.id_de_auditoria')}</dt><dd class="mono">${esc(auditId)}</dd><dt>${I18N.t('gob.fecha_y_hora')}</dt><dd>${new Date(c.fecha).toLocaleString(I18N.locale)}</dd><dt>${I18N.t('gob.agente')}</dt><dd>${agTag(c.agente)} <button class="btn btn-sm" type="button" data-ver-agente="${esc(c.agente)}">${I18N.t('gob.ver_agente')}</button></dd><dt>${I18N.t('gob.aprobado_por')}</dt><dd>${esc(c.usuario)}</dd><dt>${I18N.t('gob.tipo_de_aprobacion')}</dt><dd>${esc(rol)}</dd><dt>${I18N.t('gob.estado_del_cambio')}</dt><dd>${sig ? `<span class="pill pill-muted">${I18N.t('gob.sustituido_por', { padStart: esc(`AUD-${sig[0].fecha.slice(0, 10).replace(/-/g, '')}-${String(asc.findIndex(([, i]) => i === sig[1]) + 1).padStart(2, '0')}`) })}</span>` : I18N.t('gob.vigente')}</dd><dt>${I18N.t('gob.tiempo_vigente')}</dt><dd>${esc(vigente)}</dd><dt>${I18N.t('gob.reversible')}</dt><dd>${I18N.t('gob.si_se_puede_volver', { de: lvlBadge(c.de) })}</dd></dl></div>
        <div><h3>${I18N.t('gob.estado_del_agente_en')}</h3><dl class="kv"><dt>${I18N.t('gob.modelo')}</dt><dd class="mono">${esc(modelo)}</dd><dt>${I18N.t('gob.version_de_prompt')}</dt><dd class="mono">${esc(prompt)}</dd><dt>${I18N.t('gob.guardrails_del_agente')}</dt><dd>${G.politicas.filter((p) => p.agente === c.agente).map((p) => grRef(p.id)).join(', ') || '—'}</dd><dt>${I18N.t('gob.umbral_de_confianza')}</dt><dd>${conGuardrails(esc(a.umbral || '—'))}</dd><dt>${I18N.t('gob.override_14_d')}</dt><dd>${esc(a.override_14d || '—')}</dd><dt>${I18N.t('gob.escalado_14_d')}</dt><dd>${esc(a.escalado_14d || '—')}</dd></dl></div>
      </div>
      ${crit.length ? `<div><h3>${dir === 'sube' ? I18N.t('gob.criterios_para_pasar_a', { v: c.a }) : I18N.t('gob.motivos_de_la_bajada')}</h3><ul class="crit-list">${crit.map((x, k) => `<li class="${dir === 'baja' ? (k === 0 ? 'ko' : 'na') : 'ok'}"><span>${ic(dir === 'baja' ? (k === 0 ? 'circle-x' : 'minus') : 'circle-check')}</span>${esc(x)}${dir === 'baja' ? (k === 0 ? I18N.t('gob.disparo_la_bajada') : I18N.t('gob.no_fue_el_motivo')) : ''}</li>`).join('')}</ul></div>` : ''}
      <div><h3>${I18N.t('gob.evolucion_del_nivel_de_2', { agente: agLbl(c.agente) })}</h3>${chartNivelesAgente(mismos, idx)}<div class="legend"><span><i style="background:var(--ok)"></i>${I18N.t('gob.promocion')}</span><span><i style="background:var(--crit)"></i>${I18N.t('gob.degradacion')}</span><span><i style="background:var(--surface);border:1.5px solid var(--primary)"></i>${I18N.t('gob.sin_cambio_de_nivel')}</span></div></div>
      ${evs.length ? `<div><h3>${I18N.t('gob.eventos_del_agente_en')}</h3><ul class="mini-tl">${evs.map((e) => `<li><span class="t">${fechaHora(e.fecha)}</span><span class="ico" style="--c:${(TIPOS[e.tipo] || [])[2] || 'var(--muted)'}">${ic((TIPOS[e.tipo] || ['info'])[0])}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))} · ${esc(e.usuario)}</small></div></li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:space-between">
        ${ant ? `<button class="btn btn-sm" type="button" data-cambio="${ant[1]}">${ic('arrow-left')} ${I18N.t('gob.anterior', { fecha: fechaHora(ant[0].fecha) })}</button>` : '<span></span>'}
        ${sig ? `<button class="btn btn-sm" type="button" data-cambio="${sig[1]}">${I18N.t('gob.siguiente', { fecha: fechaHora(sig[0].fecha) })} ${ic('chevron-right')}</button>` : '<span></span>'}
      </div>`;
    abrir('modal-cambio');
  }

  // ---------------------------------------------------------------------------
  // Histórico
  // ---------------------------------------------------------------------------
  const TIPOS = { alerta: ['bell', I18N.t('gob.alertas'), 'var(--crit)'], politica: ['sliders-horizontal', I18N.t('gob.politicas_y_niveles'), 'var(--time)'], replay: ['repeat', I18N.t('gob.replays'), 'var(--ag-clasificacion)'], override: ['repeat', I18N.t('gob.overrides'), 'var(--review)'], revision: ['user-check', I18N.t('gob.revisiones'), 'var(--ok)'], despliegue: ['rocket', I18N.t('gob.despliegues'), 'var(--primary)'], incidente: ['activity', I18N.t('gob.incidentes'), 'var(--warn)'], operacion: ['power', I18N.t('gob.operacion'), 'var(--muted)'] };
  function renderHistorico() {
    const evs = G.eventos || [];
    $('hist-chips').innerHTML = `<button class="chip${filtroTipo ? '' : ' is-active'}" type="button" data-t="">${I18N.t('gob.todo')}</button>` + Object.entries(TIPOS).filter(([k]) => k !== 'operacion' || evs.some((e) => e.tipo === 'operacion')).map(([k, [i, l]]) => `<button class="chip${filtroTipo === k ? ' is-active' : ''}" type="button" data-t="${k}">${ic(i)} ${l} (${evs.filter((e) => e.tipo === k).length})</button>`).join('');
    const lista = evs.filter((e) => !filtroTipo || e.tipo === filtroTipo).sort((a, b) => b.fecha.localeCompare(a.fecha));
    let day = ''; let out = '';
    lista.forEach((e) => {
      const d = e.fecha.slice(0, 10);
      if (d !== day) { day = d; out += `<div class="day">${new Date(d).toLocaleDateString(I18N.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</div>`; }
      const [i, , c] = TIPOS[e.tipo] || ['info', '', 'var(--muted)'];
      out += `<div class="ev"><span class="t">${hora(e.fecha).slice(0, 5)}</span><span class="ico" style="--c:${c}">${ic(i)}</span><div><b>${conGuardrails(esc(e.titulo))}</b><small>${conGuardrails(esc(e.detalle))}</small></div><div class="row" style="justify-content:flex-end">${e.agente ? agTag(e.agente) : ''}<span class="pill pill-muted">${esc(e.usuario)}</span></div></div>`;
    });
    $('timeline').innerHTML = out || I18N.t('gob.sin_eventos_de_este');
  }

  // ---------------------------------------------------------------------------
  // Render completo, navegación y eventos
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Knowledge Bases: inventario, salud contra umbrales, comparativa de configuraciones y rúbricas editables
  // ---------------------------------------------------------------------------
  const KB_TIPO = { rag: ['database', I18N.t('gob.indice_rag')], markdown: ['file-text', I18N.t('gob.markdown')], runbook: ['list-ordered', I18N.t('gob.runbook')], tabla: ['table-2', I18N.t('gob.tabla_de_referencia')], plantilla: ['mail', I18N.t('gob.plantillas')] };
  const KB_FUENTE_ICO = { SharePoint: 'folder', 'Google Drive': 'folder', Git: 'git-branch' };
  const dec2 = (v) => (v == null ? '—' : v.toLocaleString(I18N.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const horas = (h) => (h == null ? '—' : h < 48 ? `${num(h)} h` : I18N.t('gob.dias', { v: num(Math.round(h / 24)) }));
  // [clave, etiqueta, formato, ok, rojo, umbral]
  const UMBRAL_KB = [
    ['recall', I18N.t('gob.recall_de_recuperacion'), dec2, (v) => v >= 0.85, (v) => v < 0.75, '≥ 0,85'],
    ['precision', I18N.t('gob.precision_del_contexto'), dec2, (v) => v >= 0.80, (v) => v < 0.70, '≥ 0,80'],
    ['fidelidad', I18N.t('gob.fidelidad_groundedness'), dec2, (v) => v >= 0.90, (v) => v < 0.80, '≥ 0,90'],
    ['citas', I18N.t('gob.exactitud_de_las_citas'), dec2, (v) => v >= 0.95, (v) => v < 0.85, '≥ 0,95'],
    ['exactitud', I18N.t('gob.exactitud_de_la_respuesta'), dec2, (v) => v >= 0.98, (v) => v < 0.90, '≥ 0,98'],
    ['sin_respuesta', I18N.t('gob.consultas_sin_respuesta'), (v) => `${dec2(v)} %`, (v) => v <= 5, (v) => v > 15, '≤ 5 %'],
    ['frescura_h', I18N.t('gob.antiguedad_de_la_ultima'), horas, (v, k) => !k.fuente.sla_h || v <= k.fuente.sla_h, (v, k) => k.fuente.sla_h && v > 3 * k.fuente.sla_h, I18N.t('gob.segun_sla')],
    ['obsoletos', I18N.t('gob.documentos_obsoletos_indexados'), (v) => num(v), (v) => v === 0, () => false, '0'],
    ['duplicados', I18N.t('gob.casi_duplicados_similitud_0'), (v) => `${dec2(v)} %`, (v) => v <= 2, (v) => v > 10, '≤ 2 %'],
    ['deriva_pp', I18N.t('gob.deriva_tras_el_ultimo'), (v) => `${num(v)} pp`, (v) => v <= 3, (v) => v > 10, I18N.t('gob.3_pp')],
    ['p95_ms', I18N.t('gob.latencia_p95_de_la'), (v) => ms(v), (v) => v <= 400, (v) => v > 1000, I18N.t('gob.400_ms')],
    ['pii', I18N.t('gob.chunks_con_datos_personales'), (v) => num(v), (v) => v === 0, () => false, '0'],
  ];
  const kbAcciones = ssGet('gobierno.kb_acciones', {});      // { 'KB-02': [{ fecha, texto }] } acciones de esta sesión
  const rubEditadas = ssGet('gobierno.rubricas', {});         // rúbricas editadas en esta sesión
  let kbFiltro = ''; let kbSel = null; let kbSec = 'salud'; let rubSel = null;
  const rubricas = () => (G.rubricas || GOBIERNO_DEMO.rubricas || []).map((r) => rubEditadas[r.id] || r);
  const rubricaDe = (kb) => rubricas().find((r) => r.id === kb.rubrica);

  function saludKB(kb) {
    const fuente = kb.fuente || {};
    const checks = UMBRAL_KB.filter(([k]) => kb.metricas[k] != null).map(([k, l, fmt, ok, rojo, umbral]) => {
      const v = kb.metricas[k]; const nivel = rojo(v, kb) ? 'rojo' : ok(v, kb) ? 'ok' : 'ambar';
      return { k, l, valor: fmt(v), umbral: k === 'frescura_h' ? (fuente.sla_h ? `≤ ${horas(fuente.sla_h)}` : I18N.t('gob.sin_sla')) : umbral, nivel };
    });
    const motivos = checks.filter((c) => c.nivel !== 'ok').map((c) => `${c.l}: ${c.valor}`);
    if (fuente.errores) motivos.push(I18N.t('gob.errores_de_sincronizacion', { errores: fuente.errores }));
    const r = rubricaDe(kb);
    if (r && r.acuerdo < 0.9) motivos.push(I18N.t('gob.acuerdo_juez_humano_de', { id: r.id, acuerdo: dec2(r.acuerdo) }));
    const estado = checks.some((c) => c.nivel === 'rojo') ? 'rojo' : motivos.length ? 'ambar' : 'ok';
    return { estado, checks, motivos };
  }
  const SALUD_PILL = { ok: ['pill-ok', 'circle-check', I18N.t('gob.sana')], ambar: ['pill-warn', 'circle-alert', I18N.t('gob.degradada')], rojo: ['pill-crit', 'circle-x', I18N.t('gob.critica')] };
  const saludPill = (e) => { const [c, i, t] = SALUD_PILL[e]; return `<span class="pill ${c}">${ic(i)} ${t}</span>`; };
  function sparkSvg(vals, color) {
    if (!vals || vals.length < 2) return '';
    // Escala mínima del 15 % del máximo: variaciones de 0,01 no deben parecer una caída
    const W = 120; const H = 28; const mx = Math.max(...vals); const r = Math.max(mx - Math.min(...vals), Math.abs(mx) * 0.15) || 1; const mn = mx - r;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 3 - ((v - mn) / r) * (H - 6)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }
  const kbEvento = (kb, titulo, detalle, sev = 'info') => {
    (kbAcciones[kb.id] = kbAcciones[kb.id] || []).unshift({ fecha: new Date().toISOString(), texto: titulo });
    ssSet('gobierno.kb_acciones', kbAcciones);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev, agente: (kb.agentes || [])[0] || null, titulo: `${kb.id} · ${titulo}`, detalle, usuario: I18N.t('gob.operador_esta_sesion') });
  };

  function renderKnowledge() {
    const KB = G.knowledge || GOBIERNO_DEMO.knowledge || [];
    const salud = Object.fromEntries(KB.map((k) => [k.id, saludKB(k)]));
    const cuenta = (e) => KB.filter((k) => salud[k.id].estado === e).length;
    const rag = KB.filter((k) => k.metricas.recall != null);
    const sinResp = KB.filter((k) => k.metricas.sin_respuesta != null);
    const R = rubricas();
    $('kpis-kb').innerHTML = [
      { cls: 'time', icono: 'book-open', etiqueta: I18N.t('gob.bases_de_conocimiento'), valor: String(KB.length), sub: I18N.t('gob.real_simuladas_en_la', { simulada: KB.filter((k) => !k.simulada).length, simulada2: KB.filter((k) => k.simulada).length }) },
      { cls: cuenta('rojo') ? 'crit' : cuenta('ambar') ? 'warn' : 'ok', icono: 'activity', etiqueta: 'Salud', valor: `${cuenta('ok')} / ${KB.length}`, sub: I18N.t('gob.sanas_degradadas_criticas', { ok: cuenta('ok'), ambar: cuenta('ambar'), rojo: cuenta('rojo') }) },
      { cls: 'review', icono: 'scan-text', etiqueta: I18N.t('gob.recall_medio_rag'), valor: dec2(rag.reduce((a, k) => a + k.metricas.recall, 0) / (rag.length || 1)), sub: I18N.t('gob.indices_vectoriales_umbral_0', { rag: rag.length }) },
      { cls: 'time', icono: 'circle-help', etiqueta: I18N.t('gob.consultas_sin_respuesta'), valor: `${dec2(sinResp.reduce((a, k) => a + k.metricas.sin_respuesta, 0) / (sinResp.length || 1))} %`, sub: I18N.t('gob.media_candidatas_a_contenido') },
      { cls: 'ok', icono: 'flask-conical', etiqueta: I18N.t('gob.rubricas'), valor: String(R.length), sub: I18N.t('gob.de_kb_evaluadas_acuerdo', { rubrica: KB.filter((k) => k.rubrica).length, KB: KB.length, R: dec2(R.reduce((a, r) => a + r.acuerdo, 0) / (R.length || 1)) }) },
    ].map(kpi).join('');
    titulo('h-kb', 'book-open', I18N.t('gob.inventario_de_conocimiento'));
    $('kb-filtro').innerHTML = [['', I18N.t('gob.todas')], ...Object.entries(KB_TIPO).map(([k, [, l]]) => [k, l]), ['!ambar', I18N.t('gob.con_problemas')]].map(([k, l]) => `<button type="button" class="chip${kbFiltro === k ? ' is-active' : ''}" data-kb-filtro="${k}">${esc(l)}</button>`).join('');
    const vis = KB.filter((k) => !kbFiltro || (kbFiltro === '!ambar' ? salud[k.id].estado !== 'ok' : k.tipo === kbFiltro));
    $('kb-lista').innerHTML = vis.map((k) => {
      const s = salud[k.id]; const [ti, tl] = KB_TIPO[k.tipo];
      const color = s.estado === 'ok' ? 'var(--ok)' : s.estado === 'ambar' ? 'var(--warn)' : 'var(--crit)';
      return `<article class="card kb kb-${s.estado}" data-kb="${esc(k.id)}" role="button" tabindex="0" title="${I18N.t('gob.ver_la_ficha_de_2', { nombre: esc(k.nombre) })}">
        <div class="kb-top"><span class="ag-ico ag-ico-lg">${ic(ti)}</span><div class="kb-tit"><strong class="ag-nombre">${esc(k.nombre)}</strong><span class="muted small">${I18N.t('gob.v_2', { id: esc(k.id), tl: esc(tl), version: esc(k.version) })}</span></div>${saludPill(s.estado)}</div>
        <p class="small kb-desc">${esc(k.descripcion)}</p>
        <div class="kb-det">
        <div class="kb-meta small"><span>${ic(KB_FUENTE_ICO[k.fuente.sistema] || 'plug-zap')} ${esc(k.fuente.sistema)}</span><span>${ic('file-text')} ${num(k.documentos)} ${k.tipo === 'tabla' ? 'registros' : 'doc.'}${k.chunks ? ` · ${num(k.chunks)} chunks` : ''}</span><span>${ic('timer')} ${esc(k.fuente.sync)}</span></div>
        <div class="kb-spark"><span class="muted small">${I18N.t('gob.14_d', { nombre: esc(k.serie.nombre) })}</span>${sparkSvg(k.serie.valores, color)}</div>
        <div class="kb-pie small"><span>${(k.agentes || []).map(agTag).join(' ')}</span><span>${k.rubrica ? `<span class="pill pill-muted">${ic('flask-conical')} ${esc(k.rubrica)}</span>` : I18N.t('gob.sin_rubrica')}${k.simulada ? I18N.t('gob.simulada') : I18N.t('gob.real')}</span></div>
        </div>
      </article>`;
    }).join('') || I18N.t('gob.ninguna_base_de_conocimiento');

    titulo('h-rub', 'flask-conical', I18N.t('gob.rubricas_de_evaluacion'));
    $('rub-lista').innerHTML = R.map((r) => {
      const tipos = {}; r.preguntas.forEach((p) => { tipos[p[1]] = (tipos[p[1]] || 0) + 1; });
      const pesos = r.criterios.reduce((a, c) => a + Number(c[1]), 0);
      return `<tr class="clickable" data-rub="${esc(r.id)}" tabindex="0"><td class="mono"><b>${esc(r.id)}</b>${rubEditadas[r.id] ? I18N.t('gob.editada') : ''}</td><td class="wrap">${esc(r.nombre)}</td><td>${r.kb.map((id) => `<span class="pill pill-muted">${esc(id)}</span>`).join(' ')}</td><td class="mono">${esc(r.version)}</td>
        <td>${r.criterios.length}${pesos !== 100 ? ` <span class="pill pill-crit">${I18N.t('gob.pesos', { pesos })}</span>` : ''}</td><td>${r.preguntas.length} <span class="muted small">${Object.entries(tipos).map(([t, n]) => `${esc(TIPO_PREG[t] || t)} ${n}`).join(' · ')}</span></td>
        <td><span class="tnum" style="color:${r.acuerdo >= 0.9 ? 'var(--ok)' : 'var(--warn)'}"><b>${dec2(r.acuerdo)}</b></span><div class="meter" style="--c:${r.acuerdo >= 0.9 ? 'var(--ok)' : 'var(--warn)'}"><i style="width:${r.acuerdo * 100}%"></i></div></td>
        <td>${esc(r.responsable)}</td><td class="tnum">${esc(r.actualizada)}</td><td><button class="btn btn-sm" type="button" data-rub-editar="${esc(r.id)}">${ic('pencil')} ${I18N.t('gob.editar')}</button></td></tr>`;
    }).join('');
    if (kbSel && $('modal-kb').open) pintarModalKB();
  }

  const TIPO_PREG = { factual: 'factual', clausula: 'cláusula', exclusion: 'exclusión', plazo: 'plazo', trampa: I18N.t('gob.trampa_sin_respuesta') };
  const KB_SECS = [['salud', 'activity', 'Salud'], ['config', 'sliders-horizontal', I18N.t('gob.configuracion')], ['comparativa', 'chart-column', I18N.t('gob.comparativa')], ['evaluacion', 'flask-conical', I18N.t('gob.evaluacion')], ['fuente', 'refresh-cw', I18N.t('gob.fuente_y_sincronizacion')], ['uso', 'scan-text', I18N.t('gob.uso')], ['versiones', 'history', I18N.t('gob.versiones')]];

  // Al navegar entre knowledge bases con la ventana abierta se mantiene la pestaña elegida; solo al abrirla empieza en Salud
  function abrirModalKB(id) { kbSel = id; if (!$('modal-kb').open) kbSec = 'salud'; pintarModalKB(); if (!$('modal-kb').open) $('modal-kb').showModal(); }
  function pintarModalKB() {
    const k = (G.knowledge || GOBIERNO_DEMO.knowledge).find((x) => x.id === kbSel); if (!k) return;
    const s = saludKB(k); const [ti, tl] = KB_TIPO[k.tipo]; const r = rubricaDe(k);
    $('modal-kb-title').innerHTML = `${ic(ti)} ${esc(k.id)} · ${esc(k.nombre)} ${saludPill(s.estado)} ${k.simulada ? I18N.t('gob.simulada_en_la_demo') : I18N.t('gob.real_2')}`;
    const secs = KB_SECS.filter(([id]) => id !== 'comparativa' || (k.comparativa || []).length);
    // Si la pestaña elegida no existe en esta KB (p. ej. sin comparativa), se muestra Salud sin olvidar la elección
    const secActual = secs.some(([id]) => id === kbSec) ? kbSec : 'salud';
    const tabla = (filas) => `<div class="tw"><table class="kv-tabla"><tbody>${filas.filter(([, v]) => v != null && v !== '').map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>`;
    const c = k.config || {};
    let cuerpo = '';
    if (secActual === 'salud') {
      cuerpo = `${k.nota ? `<div class="box kb-nota">${ic('circle-alert')} ${esc(k.nota)}</div>` : ''}
        <div class="two"><div class="tw"><table><thead><tr><th>${I18N.t('gob.metrica')}</th><th>${I18N.t('gob.valor')}</th><th>${I18N.t('gob.umbral')}</th><th>${I18N.t('gob.estado')}</th></tr></thead><tbody>${s.checks.map((x) => `<tr><td>${esc(x.l)}</td><td class="tnum"><b>${esc(x.valor)}</b></td><td class="muted">${esc(x.umbral)}</td><td>${saludPill(x.nivel)}</td></tr>`).join('')}</tbody></table></div>
        <div><h3>${I18N.t('gob.14_dias', { nombre: esc(k.serie.nombre) })}</h3><div class="kb-spark-grande">${sparkSvg(k.serie.valores, s.estado === 'ok' ? 'var(--ok)' : s.estado === 'ambar' ? 'var(--warn)' : 'var(--crit)')}</div>
          <p class="small" style="margin-top:.6rem">${s.motivos.length ? `<b>${I18N.t('gob.motivos')}</b> ${esc(s.motivos.join(' · '))}` : I18N.t('gob.todas_las_metricas_dentro')}</p>
          <p class="small muted" style="margin-top:.4rem">${I18N.t('gob.agentes_que_la_consumen', { agTag: (k.agentes || []).map(agTag).join(' '), responsable: esc(k.responsable) })}</p></div></div>`;
    } else if (secActual === 'config') {
      cuerpo = tabla([[I18N.t('gob.estrategia_de_chunking'), esc(c.chunking)], [I18N.t('gob.tamano_de_chunk'), c.chunk != null ? `${esc(String(c.chunk))}${typeof c.chunk === 'number' ? ' tokens' : ''}` : null], [I18N.t('gob.solapamiento_overlap'), c.overlap != null ? `${c.overlap} %` : null], [I18N.t('gob.modelo_de_embeddings'), c.embeddings && esc(c.embeddings)], [I18N.t('gob.indice_y_metrica'), c.indice && esc(c.indice)], ['top-k', c.top_k], [I18N.t('gob.umbral_de_similitud'), c.umbral != null ? dec2(c.umbral) : null], [I18N.t('gob.busqueda_hibrida'), c.hibrida && esc(c.hibrida)], [I18N.t('gob.reranker'), c.reranker && esc(c.reranker)], [I18N.t('gob.filtros_por_metadatos'), c.filtros && esc(c.filtros)], [I18N.t('gob.clave_de_consulta'), c.clave && esc(c.clave)], [I18N.t('gob.pasos'), c.pasos], [I18N.t('gob.plantillas'), c.plantillas], [I18N.t('gob.versiones_del_indice_retenidas'), c.versiones]])
        + `<p class="muted small" style="margin-top:.5rem">${I18N.t('gob.cambiar_el_modelo_de')}</p>`;
    } else if (secActual === 'comparativa') {
      const cmp = k.comparativa; const mx = Math.max(...cmp.map((x) => x.recall));
      cuerpo = `<p class="small" style="margin-bottom:.6rem">${I18N.t('gob.el_mismo_corpus_indexado', { rubrica: esc(k.rubrica || '—') })}</p>
        <div class="tw"><table><thead><tr><th>${I18N.t('gob.configuracion')}</th><th>${I18N.t('gob.recall')}</th><th></th><th>${I18N.t('gob.precision')}</th><th>${I18N.t('gob.fidelidad')}</th><th>${I18N.t('gob.p95')}</th><th>${I18N.t('gob.tokens_de_contexto')}</th><th></th></tr></thead><tbody>${cmp.map((x, i) => `<tr class="${x.actual ? 'is-sel' : ''}"><td><b>${esc(x.config)}</b> ${x.actual ? I18N.t('gob.actual') : ''} ${x.recomendada ? I18N.t('gob.recomendada') : ''}</td>
          <td class="tnum"><b>${dec2(x.recall)}</b></td><td style="min-width:110px"><div class="meter" style="--c:${x.recall === mx ? 'var(--ok)' : 'var(--primary)'}"><i style="width:${x.recall * 100}%"></i></div></td><td class="tnum">${dec2(x.precision)}</td><td class="tnum">${dec2(x.fidelidad)}</td><td class="tnum">${ms(x.p95_ms)}</td><td class="tnum">${num(x.tokens)}</td>
          <td>${x.actual ? '' : `<button class="btn btn-sm" type="button" data-kb-acc="aplicar:${i}">${ic('check')} ${I18N.t('gob.aplicar')}</button>`}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small" style="margin-top:.5rem">${I18N.t('gob.aplicar_programa_un_reindexado')}</p>`;
    } else if (secActual === 'evaluacion') {
      const e = k.evaluacion;
      cuerpo = !e ? `<p class="small">${I18N.t('gob.esta_base_de_conocimiento')} <b>${I18N.t('gob.no_tiene_rubrica')}</b>${I18N.t('gob.no_se_evalua', { al_ser_un_runbook: k.tipo === 'runbook' ? I18N.t('gob.al_ser_un_runbook') : '' })}</p>`
        : `<div class="row" style="margin-bottom:.6rem"><span class="pill ${e.aciertos / e.preguntas >= 0.9 ? 'pill-ok' : 'pill-warn'}">${ic('flask-conical')} ${I18N.t('gob.de_aciertos', { aciertos: e.aciertos, preguntas: e.preguntas, preguntas2: Math.round((e.aciertos / e.preguntas) * 100) })}</span><span class="muted small">${I18N.t('gob.ultima_ejecucion_rubrica_acuerdo', { fecha: fechaHora(e.fecha), version: esc(r ? `${r.id} ${r.version}` : '—'), acuerdo: r ? dec2(r.acuerdo) : '—' })}</span>${r ? `<button class="btn btn-sm" type="button" data-rub-editar="${esc(r.id)}">${ic('pencil')} ${I18N.t('gob.editar_rubrica')}</button>` : ''}</div>
          ${e.fallos.length ? `<div class="tw"><table><thead><tr><th>${I18N.t('gob.pregunta')}</th><th>${I18N.t('gob.esperado')}</th><th>${I18N.t('gob.obtenido')}</th><th>${I18N.t('gob.motivo_2')}</th></tr></thead><tbody>${e.fallos.map((x) => `<tr><td class="wrap">${esc(x.pregunta)}</td><td class="wrap">${esc(x.esperado)}</td><td class="wrap">${esc(x.obtenido)}</td><td class="wrap"><span class="pill pill-warn">${esc(x.motivo)}</span></td></tr>`).join('')}</tbody></table></div>` : I18N.t('gob.sin_fallos_en_la')}`;
    } else if (secActual === 'fuente') {
      const f = k.fuente;
      cuerpo = tabla([[I18N.t('gob.sistema'), `${ic(KB_FUENTE_ICO[f.sistema] || 'plug-zap')} ${esc(f.sistema)}`], [I18N.t('gob.ruta'), `<span class="mono">${esc(f.ruta)}</span>`], [I18N.t('gob.sincronizacion'), esc(f.sync)], [I18N.t('gob.ultima'), fechaHora(f.ultima)], [I18N.t('gob.sla_de_frescura'), f.sla_h ? horas(f.sla_h) : I18N.t('gob.sin_sla')], [I18N.t('gob.altas_cambios_bajas'), I18N.t('gob.14_dias_2', { altas: num(f.altas), cambios: num(f.cambios), bajas: num(f.bajas) })], [I18N.t('gob.errores'), f.errores ? `<span class="pill pill-crit">${num(f.errores)}</span>` : I18N.t('gob.0')]]);
    } else if (secActual === 'uso') {
      cuerpo = `<div class="two"><div><h3>${I18N.t('gob.mas_consultado_14_dias', { consultas_14d: num(k.uso.consultas_14d) })}</h3><ol class="kb-top-lista">${k.uso.top.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
        <div><h3>${I18N.t('gob.consultas_sin_respuesta')}</h3>${k.uso.sin_respuesta.length ? `<ul class="kb-top-lista">${k.uso.sin_respuesta.map((x) => `<li>${ic('circle-help')} ${esc(x)}</li>`).join('')}</ul><p class="muted small">${I18N.t('gob.candidatas_a_contenido_nuevo')}</p>` : I18N.t('gob.ninguna')}</div></div>`;
    } else if (secActual === 'versiones') {
      cuerpo = `<div class="tw"><table><thead><tr><th>${I18N.t('gob.version')}</th><th>${I18N.t('gob.fecha')}</th><th>${I18N.t('gob.cambio')}</th><th>${esc(k.serie.nombre)}</th><th></th></tr></thead><tbody>${k.versiones.map(([v, f, ch, m], i) => `<tr><td class="mono"><b>${esc(v)}</b>${i === 0 ? I18N.t('gob.en_uso') : ''}</td><td class="tnum">${esc(f)}</td><td class="wrap">${esc(ch)}</td><td class="tnum">${m == null ? '—' : dec2(m)}</td><td>${i ? `<button class="btn btn-sm" type="button" data-kb-acc="version:${esc(v)}">${ic('undo-2')} ${I18N.t('gob.volver_a_esta_version')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small" style="margin-top:.5rem">${I18N.t('gob.cada_traza_registra_la')} <span class="mono">${I18N.t('gob.gobernanza_trazabilidad_conocimiento')}</span>${I18N.t('gob.asi_el_replay_es')}</p>`;
    }
    const acc = kbAcciones[k.id] || [];
    $('modal-kb-body').innerHTML = `<div class="chips kb-secs">${secs.map(([id, i, l]) => `<button type="button" class="chip${secActual === id ? ' is-active' : ''}" data-kb-sec="${id}">${ic(i)} ${l}</button>`).join('')}</div>
      <div class="kb-sec">${cuerpo}</div>
      <div class="kb-acciones"><h3>${I18N.t('gob.acciones')}</h3><div class="row">
        ${k.tipo === 'rag' || k.tipo === 'tabla' ? `<button class="btn btn-sm" type="button" data-kb-acc="reindexar">${ic('refresh-cw')} ${k.tipo === 'tabla' ? I18N.t('gob.sincronizar_ahora') : I18N.t('gob.reindexar')}</button>` : ''}
        ${k.rubrica ? `<button class="btn btn-sm" type="button" data-kb-acc="rubricas">${ic('flask-conical')} ${I18N.t('gob.ejecutar_rubrica')}</button>` : ''}
        ${k.metricas.obsoletos ? `<button class="btn btn-sm" type="button" data-kb-acc="cuarentena">${ic('archive')} ${I18N.t('gob.cuarentena_de_obsoletos', { obsoletos: num(k.metricas.obsoletos) })}</button>` : ''}
        ${k.metricas.pii ? `<button class="btn btn-sm" type="button" data-kb-acc="suprimir">${ic('eye-off')} ${I18N.t('gob.suprimir_chunks_con_datos', { pii: num(k.metricas.pii) })}</button>` : ''}
        <button class="btn btn-sm" type="button" data-kb-acc="pausar">${ic('pause')} ${I18N.t('gob.pausar_la_kb')}</button></div>
        ${acc.length ? `<ul class="kb-acc-lista">${acc.map((a) => `<li><span class="muted tnum">${hora(a.fecha)}</span> ${esc(a.texto)}</li>`).join('')}</ul>` : I18N.t('gob.las_acciones_son_simuladas')}</div>`;
  }

  function accionKB(acc) {
    const k = (G.knowledge || GOBIERNO_DEMO.knowledge).find((x) => x.id === kbSel); if (!k) return;
    const r = rubricaDe(k);
    const [tipo, arg] = acc.split(':');
    if (tipo === 'reindexar') kbEvento(k, k.tipo === 'tabla' ? I18N.t('gob.sincronizacion_manual_lanzada') : I18N.t('gob.reindexado_lanzado'), I18N.t('gob.se_reconstruye_el_indice', { sin_rubrica_se_publica: r ? I18N.t('gob.se_publica_solo_si', { id: r.id }) : I18N.t('gob.sin_rubrica_se_publica') }));
    if (tipo === 'rubricas') kbEvento(k, I18N.t('gob.rubrica_en_ejecucion', { id: r.id, version: r.version }), I18N.t('gob.preguntas_de_muestra_resultado', { preguntas: r.preguntas.length }));
    if (tipo === 'cuarentena') kbEvento(k, I18N.t('gob.documentos_obsoletos_en_cuarentena', { obsoletos: num(k.metricas.obsoletos) }), I18N.t('gob.dejan_de_recuperarse_hasta'), 'ok');
    if (tipo === 'suprimir') kbEvento(k, I18N.t('gob.supresion_de_chunks_con', { pii: num(k.metricas.pii) }), I18N.t('gob.se_borran_de_la'), 'ok');
    if (tipo === 'pausar') kbEvento(k, I18N.t('gob.kb_pausada'), I18N.t('gob.los_agentes_dejan_de'), 'warn');
    if (tipo === 'aplicar') { const x = k.comparativa[Number(arg)]; kbEvento(k, I18N.t('gob.configuracion_programada', { config: x.config }), I18N.t('gob.reindexado_nocturno_con_puerta', { id: r ? ` (${r.id})` : '', recall: dec2(x.recall) })); }
    if (tipo === 'version') kbEvento(k, I18N.t('gob.vuelta_a_la_version', { arg }), I18N.t('gob.requiere_aprobacion_del_responsable'), 'warn');
    renderHistorico(); pintarModalKB();
  }

  // Editor de rúbricas (simulado: se guarda en esta sesión y sube la versión menor)
  function abrirModalRub(id) {
    const r = rubricas().find((x) => x.id === id); if (!r) return;
    rubSel = id;
    const fila = (c) => `<div class="rub-fila rub-crit"><input class="rc-nombre" value="${esc(c[0])}" aria-label="${I18N.t('gob.criterio')}" placeholder="${I18N.t('gob.criterio')}"><input class="rc-peso" type="number" min="0" max="100" value="${esc(c[1])}" aria-label="${I18N.t('gob.peso')}"><input class="rc-desc" value="${esc(c[2])}" aria-label="${I18N.t('gob.descripcion')}" placeholder="${I18N.t('gob.que_se_puntua')}"><button type="button" class="btn btn-sm" data-rub-quitar aria-label="${I18N.t('gob.quitar')}">${ic('x')}</button></div>`;
    const preg = (p) => `<div class="rub-fila rub-preg"><input class="rp-q" value="${esc(p[0])}" aria-label="${I18N.t('gob.pregunta')}" placeholder="${I18N.t('gob.pregunta')}"><select class="rp-tipo" aria-label="${I18N.t('gob.tipo')}">${Object.entries(TIPO_PREG).map(([k, l]) => `<option value="${k}"${p[1] === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><input class="rp-esp" value="${esc(p[2])}" aria-label="${I18N.t('gob.respuesta_esperada')}" placeholder="${I18N.t('gob.respuesta_esperada')}"><input class="rp-fu" value="${esc(p[3])}" aria-label="${I18N.t('gob.fuentes_esperadas')}" placeholder="${I18N.t('gob.fuentes')}"><button type="button" class="btn btn-sm" data-rub-quitar aria-label="${I18N.t('gob.quitar')}">${ic('x')}</button></div>`;
    $('modal-rub-title').innerHTML = `${ic('flask-conical')} ${I18N.t('gob.editar_rubrica_2', { id: esc(r.id) })} <span class="mono muted" style="font-weight:400">${esc(r.version)}</span>`;
    $('modal-rub-body').innerHTML = `<form id="form-rub" class="rub-form">
      <label class="f">${I18N.t('gob.nombre')}<input id="rub-nombre" value="${esc(r.nombre)}" required></label>
      <div><div class="card-head" style="margin-bottom:.4rem"><h3>${I18N.t('gob.criterios_y_pesos')} <span class="muted" id="rub-suma"></span></h3><button type="button" class="btn btn-sm" data-rub-add="crit">${ic('plus')} ${I18N.t('gob.criterio')}</button></div><div id="rub-crits">${r.criterios.map(fila).join('')}</div></div>
      <div><div class="card-head" style="margin-bottom:.4rem"><h3>${I18N.t('gob.preguntas_de_referencia_golden')}</h3><button type="button" class="btn btn-sm" data-rub-add="preg">${ic('plus')} ${I18N.t('gob.pregunta')}</button></div><div id="rub-pregs">${r.preguntas.map(preg).join('')}</div></div>
      <div><h3>${I18N.t('gob.historial')}</h3><ul class="kb-acc-lista">${(r.historial || []).map(([v, f, ch, u]) => `<li><span class="mono">${esc(v)}</span> <span class="muted tnum">${esc(f)}</span> ${esc(ch)} <span class="muted">· ${esc(u)}</span></li>`).join('')}</ul></div>
      <p class="small" id="rub-error" role="alert" style="color:var(--crit)"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-close="modal-rub">${I18N.t('gob.cancelar')}</button><button class="btn btn-primary" type="submit">${ic('save')} ${I18N.t('gob.guardar_como_nueva_version')}</button></div>
    </form>`;
    $('modal-rub').dataset.plantillaCrit = fila(['', 0, '']); $('modal-rub').dataset.plantillaPreg = preg(['', 'factual', '', '']);
    sumaRub();
    if (!$('modal-rub').open) $('modal-rub').showModal();
  }
  function sumaRub() {
    const s = [...document.querySelectorAll('#rub-crits .rc-peso')].reduce((a, i) => a + (Number(i.value) || 0), 0);
    $('rub-suma').textContent = `· suman ${s}${s === 100 ? '' : I18N.t('gob.deben_sumar_100')}`;
    $('rub-suma').style.color = s === 100 ? '' : 'var(--crit)';
    return s;
  }
  function guardarRub(ev) {
    ev.preventDefault();
    const r = rubricas().find((x) => x.id === rubSel); if (!r) return;
    const criterios = [...document.querySelectorAll('#rub-crits .rub-crit')].map((f) => [f.querySelector('.rc-nombre').value.trim(), Number(f.querySelector('.rc-peso').value) || 0, f.querySelector('.rc-desc').value.trim()]).filter((c) => c[0]);
    const preguntas = [...document.querySelectorAll('#rub-pregs .rub-preg')].map((f) => [f.querySelector('.rp-q').value.trim(), f.querySelector('.rp-tipo').value, f.querySelector('.rp-esp').value.trim(), f.querySelector('.rp-fu').value.trim()]).filter((p) => p[0]);
    const suma = criterios.reduce((a, c) => a + c[1], 0);
    if (!criterios.length || !preguntas.length) { $('rub-error').textContent = I18N.t('gob.la_rubrica_necesita_al'); return; }
    if (suma !== 100) { $('rub-error').textContent = I18N.t('gob.los_pesos_suman_deben', { suma }); return; }
    const version = String(r.version).replace(/(\d+)$/, (m) => String(Number(m) + 1));
    const hoy = new Date().toISOString().slice(0, 10);
    const nueva = { ...r, nombre: $('rub-nombre').value.trim() || r.nombre, criterios, preguntas, version, actualizada: hoy, historial: [[version, hoy, I18N.t('gob.editada_en_el_panel', { criterios: criterios.length, preguntas: preguntas.length }), I18N.t('gob.operador_esta_sesion')], ...(r.historial || [])] };
    rubEditadas[r.id] = nueva; ssSet('gobierno.rubricas', rubEditadas);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente: null, titulo: I18N.t('gob.rubrica_actualizada_a', { id: r.id, version }), detalle: I18N.t('gob.criterios_preguntas_de_referencia', { criterios: criterios.length, preguntas: preguntas.length, kb: r.kb.join(', ') }), usuario: I18N.t('gob.operador_esta_sesion') });
    $('modal-rub').close();
    renderKnowledge(); renderHistorico();
  }

  // ---------------------------------------------------------------------------
  // Medidas correctivas: lo que hay que hacer para que el sistema esté sano, con sus alternativas.
  // Las de coste comparten estado con las acciones correctivas de FinOps; al verificar una medida, los controles
  // del Termómetro que corrige pasan a verde.
  // ---------------------------------------------------------------------------
  const medidasEstado = ssGet('gobierno.medidas', {});   // { 'M-01': { estado, alt, sim } } en esta sesión
  let medOrden = 'prioridad'; let medDim = ''; let medRapidas = false; let medOcultar = false;
  const MED_DIM = { coste: ['coins', I18N.t('gob.coste')], conocimiento: ['book-open', I18N.t('gob.conocimiento')], cumplimiento: ['scale', I18N.t('gob.cumplimiento')], calidad: ['badge-check', I18N.t('gob.calidad')], resiliencia: ['activity', I18N.t('gob.resiliencia')] };
  const MED_SEV = { crit: ['pill-crit', I18N.t('gob.critico'), 3], warn: ['pill-warn', I18N.t('gob.aviso'), 2], info: ['pill-time', I18N.t('gob.mejora'), 1] };
  const MED_EST = { abierta: ['pill-muted', I18N.t('gob.abierta')], pendiente: ['pill-time', I18N.t('gob.pendiente_de_aprobacion_2')], aplicada: ['pill-warn', I18N.t('gob.aplicada_por_verificar')], verificada: ['pill-ok', I18N.t('gob.verificada')] };
  const ESF = { bajo: 1, medio: 2, alto: 3 };
  const APRUEBA_FUERA = [I18N.t('gob.comite_ia'), 'DPO', I18N.t('gob.legal')];
  const medidas = () => G.medidas || GOBIERNO_DEMO.medidas || [];
  const recomendada = (m) => m.alternativas.find((a) => a.rec) || m.alternativas[0];
  const prioridad = (m) => (MED_SEV[m.sev][2] * m.impacto) / ESF[recomendada(m).esfuerzo];
  const rapida = (m) => recomendada(m).esfuerzo === 'bajo' && m.impacto >= 2;
  const corrDe = (a) => { if (!a.corr) return null; const [cap, k] = a.corr.split(':'); const c = (G.caps || []).find((x) => x.id === cap); const x = c && capCorrectivas(c)[Number(k)]; return x ? { cap, k: Number(k), x, estado: x.estado === 'aplicada' ? 'aplicada' : correctivasEstado[a.corr] || '' } : null; };
  // Controles medidos en verde con las trazas de la fuente actual (sin contar las medidas verificadas a mano)
  let medidosOk = { items: null, set: new Set() };
  function controlesMedidosOk() {
    if (medidosOk.items === cmpItems) return medidosOk.set;
    const T = Cumplimiento.termometro((cmpItems || []).map((x) => x.gob), {}, null);
    medidosOk = { items: cmpItems, set: new Set(T.marcos.flatMap((mc) => mc.controles).filter((c) => c.fuente === 'medido' && c.estado === 'ok').map((c) => c.id)) };
    return medidosOk.set;
  }
  function estadoMedida(m) {
    const e = medidasEstado[m.id] || {};
    if (e.estado === 'verificada') return 'verificada';
    // Verificada por las propias trazas: sus controles medidos ya cumplen (p. ej. seudonimización activa en la sesión)
    const med = controlesMedidosOk();
    if ((m.controles || []).length && m.controles.every((c) => med.has(c))) return 'verificada';
    const corrs = m.alternativas.map(corrDe).filter(Boolean);
    if (corrs.some((c) => c.estado === 'aplicada')) return 'aplicada';
    if (corrs.some((c) => c.estado === 'pendiente')) return 'pendiente';
    return e.estado || 'abierta';
  }
  const abiertaMed = (m) => !['aplicada', 'verificada'].includes(estadoMedida(m));
  const necesitaAprobacion = (a) => { const c = corrDe(a); return c ? !!c.x.aprobacion : APRUEBA_FUERA.includes(a.aprueba); };
  // Controles del Termómetro corregidos por medidas verificadas
  const controlesVerificados = () => { const r = {}; medidas().filter((m) => estadoMedida(m) === 'verificada').forEach((m) => (m.controles || []).forEach((c) => { r[c] = m.id; })); return r; };
  function termometroGob(gobs, decl, cadena) {
    const T = Cumplimiento.termometro(gobs, decl, cadena);
    const ver = controlesVerificados(); if (!Object.keys(ver).length) return T;
    const PESO = { ok: 1, ambar: 0.5, rojo: 0 };
    T.marcos.forEach((mc) => {
      mc.controles = mc.controles.map((c) => (ver[c.id] && c.estado !== 'ok' ? { ...c, estado: 'ok', medida: I18N.t('gob.corregido_con_la_medida', { medida: c.medida, id: ver[c.id] }) } : c));
      mc.cuenta = { ok: 0, ambar: 0, rojo: 0 }; mc.controles.forEach((c) => { mc.cuenta[c.estado] += 1; });
      mc.pct = mc.controles.length ? Math.round((mc.controles.reduce((s, c) => s + PESO[c.estado], 0) / mc.controles.length) * 100) : 0;
    });
    const todos = T.marcos.flatMap((mc) => mc.controles);
    T.global = Math.round((todos.reduce((s, c) => s + PESO[c.estado], 0) / (todos.length || 1)) * 100);
    return T;
  }

  // Ahorro de las medidas de coste: conseguido (alternativa aplicada o medida verificada), pendiente de aprobación y aún posible
  function ahorroMedidas() {
    let conseguido = 0; let pendiente = 0; let posible = 0;
    medidas().filter((m) => m.dim === 'coste').forEach((m) => {
      const est = estadoMedida(m); const e = medidasEstado[m.id] || {};
      const elegidas = m.alternativas.map((a, k) => ({ a, k, c: corrDe(a) })).filter(({ k, c }) => (c && c.estado) || (e.alt === k && est !== 'abierta'));
      const hechas = elegidas.filter(({ c }) => est === 'verificada' || (c ? c.estado === 'aplicada' : est === 'aplicada'));
      const sumar = (l) => l.reduce((x, { a }) => x + (a.ahorro_mes || 0), 0);
      conseguido += sumar(hechas);
      pendiente += sumar(elegidas.filter((x) => !hechas.includes(x)));
      if (!elegidas.length) posible += recomendada(m).ahorro_mes || 0;
    });
    return { conseguido, pendiente, posible, total: conseguido + pendiente + posible };
  }

  function accionMedida(id, tipo, k) {
    const m = medidas().find((x) => x.id === id); if (!m) return;
    const e = medidasEstado[id] || (medidasEstado[id] = {});
    const a = m.alternativas[k];
    const evento = (titulo, detalle, sev = 'info') => G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev, agente: m.agente, titulo: `${m.id} · ${titulo}`, detalle, usuario: I18N.t('gob.operador_esta_sesion') });
    if (tipo === 'simular') { e.sim = k; evento(I18N.t('gob.simulacion_de', { titulo: a.titulo }), I18N.t('gob.impacto_estimado_validacion', { impacto: a.impacto, valida: a.valida })); }
    if (tipo === 'quitar-sim') { delete e.sim; evento(I18N.t('gob.simulacion_retirada', { titulo: a.titulo }), I18N.t('gob.la_alternativa_vuelve_a')); }
    if (tipo === 'deshacer') {
      const c = corrDe(a);
      delete e.alt; if (e.estado !== 'verificada') delete e.estado;
      if (c) { delete correctivasEstado[a.corr]; ssSet('gobierno.correctivas', correctivasEstado); }
      evento(I18N.t('gob.medida_deshecha', { titulo: a.titulo }), I18N.t('gob.vuelve_a_quedar_abierta'));
    }
    if (tipo === 'desverificar') { if (corrDe(a)) delete e.estado; else e.estado = 'aplicada'; evento(I18N.t('gob.verificacion_retirada'), I18N.t('gob.la_medida_vuelve_a')); }
    if (tipo === 'aplicar') {
      const c = corrDe(a); e.alt = k;
      if (c) { ssSet('gobierno.medidas', medidasEstado); aplicarCorrectiva(c.cap, c.k); return; }
      e.estado = necesitaAprobacion(a) ? 'pendiente' : 'aplicada';
      evento(e.estado === 'pendiente' ? I18N.t('gob.aprobacion_solicitada_a', { aprueba: a.aprueba, titulo: a.titulo }) : I18N.t('gob.medida_aplicada', { titulo: a.titulo }), I18N.t('gob.se_verificara_con', { impacto: a.impacto, valida: a.valida }), e.estado === 'pendiente' ? 'info' : 'ok');
    }
    if (tipo === 'verificar') { e.estado = 'verificada'; evento(I18N.t('gob.medida_verificada'), (m.controles || []).length ? I18N.t('gob.controles_del_termometro_corregidos', { controles: m.controles.join(', ') }) : I18N.t('gob.comprobada_en_produccion'), 'ok'); }
    if (tipo === 'reabrir') { delete medidasEstado[id]; m.alternativas.forEach((x) => { if (x.corr) delete correctivasEstado[x.corr]; }); ssSet('gobierno.correctivas', correctivasEstado); evento(I18N.t('gob.medida_reabierta'), I18N.t('gob.vuelve_a_la_lista')); }
    ssSet('gobierno.medidas', medidasEstado);
    renderAll();
    if ($('modal-med').open) abrirModalMed(id);
  }

  function altHtml(m, a, k, compacto) {
    const est = estadoMedida(m); const e = medidasEstado[m.id] || {}; const c = corrDe(a);
    const elegida = (c && c.estado) || (e.alt === k && est !== 'abierta');
    // Todo lo que se aplica en la demo se puede quitar, para ver subir y bajar los KPI y el Termómetro.
    // Lo que el dataset trae ya aplicado, o lo verificado por las propias trazas, no se deshace.
    const deshacible = elegida && (c ? !!correctivasEstado[a.corr] : e.alt === k);
    const deshacer = deshacible ? `<button class="btn btn-sm" type="button" data-med-acc="deshacer:${m.id}:${k}" title="${I18N.t('gob.quita_la_medida_aplicada')}">${ic('undo-2')} ${I18N.t('gob.deshacer')}</button>` : '';
    const simulable = a.valida && /replay|Rúbrica|rúbrica|Vista previa|Simulación/i.test(a.valida);
    const simular = !simulable ? '' : e.sim === k
      ? `<button class="btn btn-sm" type="button" data-med-acc="quitar-sim:${m.id}:${k}">${ic('x')} ${I18N.t('gob.quitar_simulacion')}</button>`
      : `<button class="btn btn-sm" type="button" data-med-acc="simular:${m.id}:${k}">${ic('play')} ${I18N.t('gob.simular')}</button>`;
    const botones = est === 'verificada'
      ? (e.estado === 'verificada' && elegida ? `<button class="btn btn-sm" type="button" data-med-acc="desverificar:${m.id}:${k}">${ic('undo-2')} ${I18N.t('gob.quitar_verificacion')}</button>` : '')
      : elegida
      ? `<button class="btn btn-sm btn-primary" type="button" data-med-acc="verificar:${m.id}:${k}">${ic('circle-check')} ${I18N.t('gob.marcar_como_verificada')}</button>${deshacer}`
      : `${simular}<button class="btn btn-sm" type="button" data-med-acc="aplicar:${m.id}:${k}">${necesitaAprobacion(a) ? I18N.t('gob.solicitar_aprobacion', { check: ic('user-check') }) : `${ic('check')} Aplicar`}</button>`;
    return `<div class="med-alt${a.rec ? ' rec' : ''}${elegida ? ' elegida' : ''}">
      ${a.rec ? I18N.t('gob.recomendada_2') : ''}<b>${esc(a.titulo)}</b>
      <span class="med-imp">${esc(a.impacto)}</span>
      ${compacto ? '' : `<span class="muted small">${I18N.t('gob.efecto_2', { efecto: esc(a.efecto) })}</span>`}
      <span class="muted small">${I18N.t('gob.esfuerzo_aprueba', { esfuerzo: esc(a.esfuerzo), aprueba: esc(a.aprueba) })}</span>
      <span class="muted small">${I18N.t('gob.se_valida_con', { valida: esc(a.valida) })}</span>
      ${e.sim === k ? `<span class="small med-sim">${ic('play')} ${I18N.t('gob.simulado', { impacto: esc(a.impacto) })}</span>` : ''}
      ${elegida ? `<span class="small"><span class="pill ${MED_EST[est][0]}">${esc(MED_EST[est][1])}</span></span>` : ''}
      <div class="row">${botones}</div></div>`;
  }

  function renderMedidas() {
    const M = medidas();
    const T = estadoCumplimiento().T;
    const ab = M.filter(abiertaMed);
    const AH = ahorroMedidas();
    $('med-termo').innerHTML = `<div class="med-termo" style="--c:${colorPct(T.global)}" data-goto="cumplimiento" role="button" tabindex="0" title="${I18N.t('gob.termometro_de_cumplimiento_cambia')}"><span class="v">${T.global}<small>%</small></span><span class="l">${I18N.t('gob.cumplimiento_2')}</span></div>`;
    $('kpis-med').innerHTML = [
      { cls: ab.some((m) => m.sev === 'crit') ? 'crit' : 'warn', icono: 'wrench', etiqueta: I18N.t('gob.medidas_abiertas'), valor: String(ab.length), sub: I18N.t('gob.en_total', { crit: I18N.t('gob.n_criticas', { n: ab.filter((m) => m.sev === 'crit').length }), M: M.length }) },
      { cls: 'ok', icono: 'euro', etiqueta: I18N.t('gob.ahorro_conseguido'), valor: `${num(AH.conseguido)} €/mes`, sub: I18N.t('gob.de_mes_posibles_aplica', { total: num(AH.total), pendiente: AH.pendiente ? I18N.t('gob.pendientes_de_aprobacion', { pendiente: num(AH.pendiente) }) : '' }), medidor: AH.total ? (AH.conseguido / AH.total) * 100 : 0, id: null },
      { cls: 'warn', icono: 'scale', etiqueta: I18N.t('gob.riesgos_normativos'), valor: String(ab.filter((m) => (m.controles || []).length).length), sub: I18N.t('gob.controles_del_termometro_por') },
      { cls: 'review', icono: 'book-open', etiqueta: I18N.t('gob.kb_por_sanear'), valor: String(ab.filter((m) => m.kb).length), sub: I18N.t('gob.knowledge_bases_con_medida') },
      { cls: 'time', icono: 'circle-check', etiqueta: I18N.t('gob.aplicadas_y_verificadas'), valor: `${M.length - ab.length}`, sub: `${M.filter((m) => estadoMedida(m) === 'verificada').length} verificadas` },
    ].map(kpi).join('');
    $('med-filtros').innerHTML = [['', I18N.t('gob.todas')], ...Object.entries(MED_DIM).map(([k, [, l]]) => [k, l])].map(([k, l]) => `<button type="button" class="chip${medDim === k ? ' is-active' : ''}" data-med-dim="${k}">${esc(l)}</button>`).join('')
      + `<button type="button" class="chip${medRapidas ? ' is-active' : ''}" data-med-rapidas>${ic('zap')} ${I18N.t('gob.victorias_rapidas')}</button><button type="button" class="chip${medOcultar ? ' is-active' : ''}" data-med-ocultar>${ic('eye-off')} ${I18N.t('gob.ocultar_verificadas')}</button>`;
    $('med-orden').innerHTML = `<span class="muted small">${I18N.t('gob.ordenar_por')}</span><div class="seg">${[['prioridad', I18N.t('gob.prioridad')], ['severidad', I18N.t('gob.severidad')]].map(([k, l]) => `<button type="button" class="seg-btn" data-med-orden="${k}" aria-pressed="${medOrden === k}">${l}</button>`).join('')}</div>`;
    const lista = M.filter((m) => (!medDim || m.dim === medDim) && (!medRapidas || rapida(m)) && (!medOcultar || estadoMedida(m) !== 'verificada'))
      .sort((a, b) => (medOrden === 'prioridad' ? prioridad(b) - prioridad(a) : MED_SEV[b.sev][2] - MED_SEV[a.sev][2] || b.impacto - a.impacto) || a.id.localeCompare(b.id));
    $('med-lista').innerHTML = lista.map((m, i) => {
      const est = estadoMedida(m); const [sc, sl] = MED_SEV[m.sev]; const [di, dl] = MED_DIM[m.dim];
      return `<article class="card med${est === 'verificada' ? ' med-ok' : ''}" data-medida="${esc(m.id)}">
        <div class="med-cab"><span class="pill ${sc}">${sl}</span><span class="muted small">${ic(di)} ${esc(dl)}${m.agente ? ` · ${agTag(m.agente)}` : ''}</span>${rapida(m) ? `<span class="pill pill-ok">${ic('zap')} ${I18N.t('gob.victoria_rapida')}</span>` : ''}<span class="med-num muted small"><span class="pill ${MED_EST[est][0]}">${esc(MED_EST[est][1])}</span> · #${i + 1} · ${esc(m.id)}</span></div>
        <h3 class="med-tit">${esc(m.titulo)}</h3>
        <p class="small muted">${esc(m.detalle)} <a href="#" data-goto="${esc(m.origen[0])}">${esc(m.origen[1])} →</a></p>
        <div class="med-alts" style="--n:${m.alternativas.length}">${m.alternativas.map((a, k) => altHtml(m, a, k, true)).join('')}</div>
        ${est !== 'abierta' ? `<button type="button" class="med-reabrir" data-med-acc="reabrir:${m.id}:0">${ic('rotate-ccw')} ${I18N.t('gob.reabrir')}</button>` : ''}
      </article>`;
    }).join('') || I18N.t('gob.ninguna_medida_con_este');
  }

  function abrirModalMed(id) {
    const m = medidas().find((x) => x.id === id); if (!m) return;
    const est = estadoMedida(m); const [sc, sl] = MED_SEV[m.sev];
    $('modal-med-title').innerHTML = `${ic('wrench')} ${esc(m.id)} · ${esc(m.titulo)}`;
    $('modal-med-body').innerHTML = `<div class="row"><span class="pill ${sc}">${sl}</span><span class="pill ${MED_EST[est][0]}">${esc(MED_EST[est][1])}</span><span class="muted small">${I18N.t('gob.prioridad_2', { dim: esc(MED_DIM[m.dim][1]), agente: m.agente ? ` · ${agLbl(m.agente)}` : '', prioridad: dec2(prioridad(m)) })}</span></div>
      <div><h3>${I18N.t('gob.que_pasa')}</h3><p class="small">${esc(m.detalle)}</p><p class="small" style="margin-top:.4rem"><button class="btn btn-sm" type="button" data-goto="${esc(m.origen[0])}">${ic('arrow-right')} ${esc(m.origen[1])}</button>${(m.controles || []).length ? ` <span class="muted">${I18N.t('gob.al_verificarla_corrige_en', { span: m.controles.map((c) => `<span class="mono">${esc(c)}</span>`).join(', ') })}</span>` : ''}</p></div>
      <div><h3>${I18N.t('gob.alternativas')}</h3><div class="med-alts" style="--n:${m.alternativas.length}">${m.alternativas.map((a, k) => altHtml(m, a, k, false)).join('')}</div></div>`;
    if (!$('modal-med').open) $('modal-med').showModal();
  }

  // ---------------------------------------------------------------------------
  // Estado compartido por la landing (Inicio) y el Resumen: alertas de todas las fuentes, cumplimiento y conocimiento
  // ---------------------------------------------------------------------------
  const CONTROLES_ALERTA = ['rgpd-35', 'ria-50'];   // controles documentales parciales que se elevan a alerta
  const estadoCumplimiento = () => { const cadena = Cumplimiento.verificarCadena(cmpItems); return { T: termometroGob(cmpItems.map((x) => x.gob), declaradosConKB(), cadena), cadena }; };
  const estadoKB = () => { const KB = G.knowledge || GOBIERNO_DEMO.knowledge || []; return KB.map((k) => ({ k, s: saludKB(k) })); };
  function alertasTodas() {
    const out = (G.alertas || []).map((a) => ({ ...a, origen: 'coste', goto: 'finops' }));
    (G.alertas_autonomia || []).forEach((a) => out.push(a));
    estadoKB().filter(({ s }) => s.estado !== 'ok').filter(({ k, s }) => s.estado === 'rojo' || k.metricas.obsoletos > 10 || k.metricas.pii).forEach(({ k, s }) => out.push({ sev: s.estado === 'rojo' ? 'crit' : 'warn', titulo: `${k.id} · ${k.nombre}: ${s.estado === 'rojo' ? 'crítica' : 'degradada'}`, detalle: k.nota || s.motivos.slice(0, 2).join(' · '), cuando: 'conocimiento', origen: 'kb', goto: 'knowledge', kb: k.id }));
    alertasFraude().forEach((a) => out.push(a));
    const { T, cadena } = estadoCumplimiento();
    if (cadena.roto !== null) out.push({ sev: 'crit', titulo: I18N.t('gob.cadena_de_integridad_del'), detalle: I18N.t('gob.la_traza_no_coincide', { traza_id: cadena.items[cadena.roto].traza_id }), cuando: 'cumplimiento', origen: 'cumplimiento', goto: 'cumplimiento' });
    T.marcos.flatMap((m) => m.controles).filter((c) => c.estado !== 'ok' && CONTROLES_ALERTA.includes(c.id)).forEach((c) => out.push({ sev: 'warn', titulo: `${c.normas.join(' · ')}: ${c.exige}`, detalle: c.medida, cuando: 'cumplimiento', origen: 'cumplimiento', goto: 'cumplimiento' }));
    const orden = { crit: 0, warn: 1, info: 2, ok: 3 };
    return out.sort((a, b) => (orden[a.sev] ?? 9) - (orden[b.sev] ?? 9));
  }
  // Fraude: casos escalados a la SIU (abren la ficha del caso), pagos retenidos y caps antifraude en aviso o superados
  function alertasFraude() {
    const L = Object.values(FR); const out = [];
    L.filter((v) => v.nivel === 'siu').forEach((v) => {
      const s = (FD().escenarios || []).find((x) => x.id === v.escenario);
      out.push({ sev: 'crit', titulo: I18N.t('gob.score_escalado_a_la', { id: v.id, score: v.score }), detalle: I18N.t('gob.sin_despeje_automatico_g', { nombre: s ? `${s.id} ${s.nombre}. ` : '' }), cuando: 'fraude', origen: 'fraude', goto: 'fraude', frCaso: v.id });
    });
    const ret = L.filter((v) => v.pago === 'retenido');
    if (ret.length) {
      const imp = ret.reduce((a, v) => a + (v.importe || 0), 0); const c11 = (G.caps || []).find((c) => c.id === 'CAP-11');
      out.push({ sev: 'warn', titulo: I18N.t('gob.pendientes_de_verificar', { ret: ret.length, pagos_retenidos: ret.length === 1 ? I18N.t('gob.pago_retenido') : I18N.t('gob.pagos_retenidos'), imp: eur(imp, 0) }), detalle: I18N.t('gob.indicio_en_vigilancia_o', { id: ret.map((v) => v.id).join(', '), limite: c11 ? I18N.t('gob.cap_11_al', { limite: Math.round((imp / c11.limite) * 100) }) : '' }), cuando: 'fraude', origen: 'fraude', goto: 'fraude' });
    }
    (G.caps || []).filter((c) => c.ambito === 'Antifraude' && c.id !== 'CAP-11' && c.estado !== 'ok').forEach((c) => out.push({ sev: c.estado === 'superado' ? 'crit' : 'warn', titulo: `${c.id} ${c.estado === 'superado' ? 'superado' : I18N.t('gob.en_aviso')} · ${c.tipo}: ${num(c.consumo)} / ${num(c.limite)} ${c.unidad}`, detalle: I18N.t('gob.accion_configurada', { accion: c.accion }), cuando: 'fraude', origen: 'fraude', goto: 'fraude' }));
    return out;
  }
  const alertaHtml = (a) => `<div class="alert ${a.sev} alert-link" ${a.frCaso ? `data-fr-caso="${esc(a.frCaso)}"` : `data-goto="${esc(a.goto)}"`} role="button" tabindex="0" title="${a.frCaso ? I18N.t('gob.abrir_el_caso', { frCaso: esc(a.frCaso) }) : I18N.t('gob.ir_a', { dest: esc(tituloOrigen(a.origen)) })}"><span class="ico">${ic(SEV_ICON[a.sev] || 'info')}</span><div><b>${conGuardrails(esc(a.titulo))}</b><small>${conGuardrails(esc(a.detalle))}</small></div><span class="muted small alert-meta"><span class="pill pill-muted">${esc(I18N.dato(a.origen))}</span>${a.cuando && !['conocimiento', 'cumplimiento', 'fraude'].includes(a.cuando) ? `<br>${esc(a.cuando)}` : ''}</span></div>`;
  const conGoto = (html, vista) => html.replace('<article class="card kpi', `<article data-goto="${vista}" role="button" tabindex="0" class="card kpi kpi-goto`);

  // Bloques de cumplimiento y conocimiento del Resumen
  function resumenCumplimiento() {
    const { T, cadena } = estadoCumplimiento();
    const parciales = T.marcos.flatMap((m) => m.controles).filter((c) => c.estado !== 'ok').sort((a, b) => (CONTROLES_ALERTA.includes(b.id) ? 1 : 0) - (CONTROLES_ALERTA.includes(a.id) ? 1 : 0) || (a.fuente === 'medido' ? -1 : 1)).slice(0, 3);
    const r = T.resumen;
    return `<div class="res-termos">${T.marcos.map((m) => `<div class="res-termo"><span class="small"><b>${esc(m.nombre)}</b></span><div class="meter" style="--c:${colorPct(m.pct)}"><i style="width:${m.pct}%"></i></div><b class="tnum" style="color:${colorPct(m.pct)}">${m.pct} %</b></div>`).join('')}</div>
      <h3 style="margin-top:.9rem">${I18N.t('gob.controles_parciales_destacados')}</h3>
      <ul class="res-lista">${parciales.map((c) => `<li><span class="pill pill-warn">${ic('circle-alert')} ${esc(c.normas[0])}</span> ${esc(c.exige)} <span class="muted small">· ${esc(c.medida)}</span></li>`).join('')}</ul>
      <div class="res-datos">
        <div class="box"><span class="muted small">${I18N.t('gob.datos_personales')}</span><b>${num(r.datos_personales)}</b><small class="muted">${I18N.t('gob.en_mensajes', { trazas: r.trazas })}</small></div>
        <div class="box"><span class="muted small">${I18N.t('gob.de_salud_art_9')}</span><b>${num(r.salud)}</b><small class="muted">${I18N.t('gob.cifrados')}</small></div>
        <div class="box"><span class="muted small">${I18N.t('gob.de_menores')}</span><b>${num(r.menores)}</b><small class="muted">${I18N.t('gob.proteccion_reforzada')}</small></div>
        <div class="box"><span class="muted small">${I18N.t('gob.cadena_de_integridad')}</span><b style="color:${cadena.roto === null ? 'var(--ok)' : 'var(--crit)'}">${cadena.roto === null ? I18N.t('gob.integra', { check: ic('check') }) : `${ic('x')} Rota`}</b><small class="muted">${I18N.t('gob.eslabones', { items: cadena.items.length })}</small></div>
      </div>`;
  }
  function resumenConocimiento() {
    const E = estadoKB(); const R = rubricas();
    const mal = E.filter(({ s }) => s.estado !== 'ok').sort((a, b) => (a.s.estado === 'rojo' ? -1 : 1) - (b.s.estado === 'rojo' ? -1 : 1));
    return `<div class="res-datos" style="margin-bottom:.8rem">
        <div class="box"><span class="muted small">${I18N.t('gob.sanas')}</span><b style="color:var(--ok)">${E.filter(({ s }) => s.estado === 'ok').length} / ${E.length}</b></div>
        <div class="box"><span class="muted small">${I18N.t('gob.degradadas')}</span><b style="color:var(--warn)">${E.filter(({ s }) => s.estado === 'ambar').length}</b></div>
        <div class="box"><span class="muted small">${I18N.t('gob.criticas')}</span><b style="color:var(--crit)">${E.filter(({ s }) => s.estado === 'rojo').length}</b></div>
        <div class="box"><span class="muted small">${I18N.t('gob.acuerdo_juez_humano')}</span><b>${dec2(R.reduce((a, x) => a + x.acuerdo, 0) / (R.length || 1))}</b><small class="muted">${I18N.t('gob.rubricas_2', { R: R.length })}</small></div>
      </div>
      <ul class="res-lista">${mal.map(({ k, s }) => `<li data-kb="${esc(k.id)}" role="button" tabindex="0" class="res-kb">${saludPill(s.estado)} <b>${esc(k.nombre)}</b> <span class="muted small">· ${esc(s.motivos[0] || '')}</span></li>`).join('') || I18N.t('gob.todas_las_knowledge_bases')}</ul>`;
  }

  // ---------------------------------------------------------------------------
  // Indicadores de fraude: score antifraude del lote (fraude.js), escenarios, catálogo, relaciones y cola de la SIU.
  // El motor no usa IA: cruza el texto de cada mensaje con el resto del lote y con el histórico de data/fraude.js.
  // ---------------------------------------------------------------------------
  const frCfg = ssGet('gobierno.fraude_cfg', {}); // cambios de la sesión en el catálogo: { 'IF-09': { activo, peso } }
  let FR = {}; let FRL = [];                         // evaluación por mensaje y entradas del lote
  const FD = () => G.fraude || FRAUDE_DEMO;
  const frNuevos = ssGet('gobierno.fraude_nuevos', []); // indicadores creados en esta sesión
  const frCatalogo = () => [...FD().indicadores, ...frNuevos.filter((n) => !FD().indicadores.some((i) => i.id === n.id))].map((i) => ({ ...i, ...(frCfg[i.id] || {}) }));
  const NIVEL_FR = { siu: ['pill-crit', 'search-check', 'SIU', 'var(--crit)'], vigilancia: ['pill-warn', 'eye', I18N.t('gob.vigilancia'), 'var(--warn)'], sin: ['pill-ok', 'circle-check', I18N.t('gob.sin_indicios'), 'var(--ok)'] };
  const PAGO_FR = { retenido: ['pill-warn', 'banknote', I18N.t('gob.retenido')], libre: ['pill-ok', 'banknote', I18N.t('gob.libre')], no_aplica: ['pill-time', 'user-check', I18N.t('gob.en_revision')] };
  const EST_SIU = { pendiente: ['pill-crit', 'inbox', I18N.t('gob.pendiente')], en_investigacion: ['pill-review', 'search-check', I18N.t('gob.en_investigacion')], en_verificacion: ['pill-warn', 'hourglass', I18N.t('gob.en_verificacion')], confirmado: ['pill-crit', 'triangle-alert', I18N.t('gob.confirmado')], descartado: ['pill-ok', 'circle-check', I18N.t('gob.descartado')], registrado: ['pill-time', 'minus', I18N.t('gob.solo_registro')] };
  const nivelFrPill = (n) => { const [c, i, l] = NIVEL_FR[n] || NIVEL_FR.sin; return `<span class="pill ${c}">${ic(i)} ${l}</span>`; };
  const pagoPill = (p) => { const [c, i, l] = PAGO_FR[p] || PAGO_FR.no_aplica; return `<span class="pill ${c}">${ic(i)} ${l}</span>`; };
  const estSiuPill = (s) => { const [c, i, l] = EST_SIU[s] || EST_SIU.registrado; return `<span class="pill ${c}">${ic(i)} ${l}</span>`; };
  const scoreBar = (s, n) => `<span class="fr-score" title="${I18N.t('gob.score_vigilancia_desde_40', { v: s })}"><i style="width:${s}%;background:${(NIVEL_FR[n] || NIVEL_FR.sin)[3]}"></i><u style="left:40%"></u><u style="left:70%"></u></span><b class="tnum">${s}</b>`;

  // Lote que evalúa el motor: la sesión del triaje (con su texto) o los mensajes de la demo que tienen traza
  function loteFraude() {
    if ($('fuente').value === 'sesion') {
      const log = ssGet('triage.log', []);
      if (Array.isArray(log) && log.length) return [...log].reverse().map((e) => ({ ...e, decision_triaje: e.decision, traza: e.gobernanza && e.gobernanza.trazabilidad && e.gobernanza.trazabilidad.traza_id }));
    }
    const ids = new Set(G.trazas.map((t) => t.mensaje));
    return PAQUETES.flatMap((p) => p.mensajes).filter((m) => ids.has(m.id)).map((m) => {
      const r = RESULTADOS_GUARDADOS[m.id] ? expandirResultadoGuardado(RESULTADOS_GUARDADOS[m.id]) : {};
      const t = G.trazas.find((x) => x.mensaje === m.id) || {};
      // Tras una revisión o un override, la decisión vigente es la del tramitador (MSG-A-04 pasa a aprobado al revisarlo)
      const humana = t.override || t.revision;
      return { id: m.id, asunto: m.asunto, ramo: t.ramo || r.ramo, mensaje: m, decision: humana ? humana.a : (t.decision || r.decision), decision_triaje: t.decision || r.decision, override: t.override, revision: t.revision, datos_extraidos: r.datos_extraidos || {}, traza: t.id };
    });
  }
  function evaluarFraude() { FRL = loteFraude(); FR = Fraude.evaluar(FRL, { ...FD(), indicadores: frCatalogo() }); }
  const seguimiento = (id) => {
    const s = (FD().seguimiento || {})[id]; const ev = FR[id];
    if (s) return s;
    if (!ev) return null;
    return { estado: ev.nivel === 'siu' ? 'pendiente' : ev.nivel === 'vigilancia' || ev.pago === 'retenido' ? 'en_verificacion' : 'registrado', responsable: ev.nivel === 'siu' ? 'SIU' : ev.pago === 'retenido' ? I18N.t('gob.tesoreria') : '—', nota: ev.accion };
  };
  const casosFr = () => FRL.filter((e) => FR[e.id] && (FR[e.id].score > 0 || FR[e.id].pago === 'retenido'));

  function renderFraude() {
    const D = FD(); const R = Fraude.resumen(FR); const dias = D.diario || [];
    const siu14 = dias.reduce((s, d) => s + d[3], 0); const hoy = dias[dias.length - 1] || [];
    const casos = D.escenarios.reduce((s, x) => s + (x.casos_14d || 0), 0); const conf = D.escenarios.reduce((s, x) => s + (x.confirmados_14d || 0), 0);
    const cat = frCatalogo(); const disp = cat.reduce((s, i) => s + i.disparos_14d, 0); const fp = cat.reduce((s, i) => s + i.disparos_14d * i.fp, 0) / (disp || 1);
    const cap = (id) => (G.caps || []).find((c) => c.id === id);
    titulo('h-fraude', 'shield-alert', I18N.t('gob.indicadores_de_fraude'));
    $('fr-niveles').innerHTML = (D.niveles || []).map(([min, k, l, txt]) => `<div class="fr-nivel" style="--c:${NIVEL_FR[k][3]}"><b>${ic(NIVEL_FR[k][1])} ${esc(l)}</b><span class="mono small">${k === 'sin' ? '0–39' : k === 'vigilancia' ? '40–69' : `≥ ${min}`}</span><span class="small muted">${esc(txt)}</span></div>`).join('');
    $('kpis-fr').innerHTML = [
      kpi({ cls: 'primary', icono: 'scan-eye', etiqueta: I18N.t('gob.mensajes_analizados'), valor: num(R.analizados), sub: I18N.t('gob.del_lote_motor_sin') }),
      kpi({ cls: R.siu ? 'crit' : R.con_indicios ? 'warn' : 'ok', icono: 'shield-alert', etiqueta: I18N.t('gob.con_indicios'), valor: String(R.con_indicios), sub: I18N.t('gob.en_vigilancia_en_la', { vigilancia: R.vigilancia, siu: R.siu }) }),
      kpi({ cls: R.retenidos ? 'warn' : 'ok', icono: 'banknote', etiqueta: I18N.t('gob.pagos_retenidos_2'), valor: eur(R.importe_retenido, 0), sub: I18N.t('gob.a_la_espera_de', { retenidos: R.retenidos, pagos: R.retenidos === 1 ? 'pago' : 'pagos', CAP: cap('CAP-11') ? I18N.t('gob.cap_11_al_2', { CAP: Math.round(capUso(cap('CAP-11')) * 100) }) : '' }) }),
      kpi({ cls: 'review', icono: 'search-check', etiqueta: I18N.t('gob.escalados_a_la_siu'), valor: num(siu14), sub: I18N.t('gob.en_14_dias_hoy', { hoy: hoy[3] ?? 0, limite: cap('CAP-10') ? cap('CAP-10').limite : 15 }) }),
      kpi({ cls: 'time', icono: 'badge-check', etiqueta: I18N.t('gob.confirmados_por_la_siu'), valor: `${Math.round((conf / (casos || 1)) * 100)} %`, sub: I18N.t('gob.de_casos_de_los', { conf, casos }) }),
      kpi({ cls: fp > 0.7 ? 'warn' : 'ok', icono: 'circle-x', etiqueta: I18N.t('gob.falsos_positivos'), valor: `${Math.round(fp * 100)} %`, sub: I18N.t('gob.de_los_disparos_de') }),
    ].join('');

    // Casos del lote
    titulo('h-fr-lote', 'list-checks', I18N.t('gob.casos_del_lote', { FRL: FRL.length }));
    const orden = { siu: 0, vigilancia: 1, sin: 2 };
    const filas = [...FRL].sort((a, b) => (orden[FR[a.id].nivel] - orden[FR[b.id].nivel]) || FR[b.id].score - FR[a.id].score || a.id.localeCompare(b.id));
    $('fr-lote').innerHTML = filas.map((e) => {
      const v = FR[e.id]; const esc0 = v.escenario && D.escenarios.find((s) => s.id === v.escenario);
      const contra = v.contraindicios ? ` <span class="pill pill-time" title="${I18N.t('gob.el_historico_anula_un')}">${ic('undo-2')} ${I18N.t('gob.contraindicio')}</span>` : '';
      return `<tr class="clickable${v.score ? '' : ' muted'}" data-fr-caso="${esc(e.id)}" tabindex="0"><td><b class="mono">${esc(e.id)}</b><br><span class="small muted">${esc(e.asunto || '')}</span></td><td>${canal((e.mensaje || {}).canal)}</td><td>${decPill(e.decision_triaje)}${e.override ? ` <span class="pill pill-time" title="${esc(e.override.motivo)}">${ic('repeat')} ${I18N.t('gob.override_2')}</span>` : ''}</td><td class="fr-score-td">${scoreBar(v.score, v.nivel)}</td><td>${nivelFrPill(v.nivel)}${contra}</td><td class="small">${esc0 ? `<span class="mono">${esc(esc0.id)}</span> ${esc(esc0.nombre)}` : '<span class="muted">—</span>'}</td><td>${pagoPill(v.pago)}</td><td class="small wrap">${conGuardrails(esc(v.accion))}</td></tr>`;
    }).join('');

    // Escenarios
    titulo('h-fr-escenarios', 'route', I18N.t('gob.escenarios_de_fraude', { escenarios: D.escenarios.length }));
    $('fr-escenarios').innerHTML = D.escenarios.map((s) => {
      const enLote = FRL.filter((e) => FR[e.id].escenario === s.id);
      const disparados = (id) => enLote.some((e) => FR[e.id].indicadores.some((x) => x.id === id));
      return `<article class="fr-esc${enLote.length ? ' en-lote' : ''}">
        <div class="fr-esc-top"><span class="fr-esc-ico">${ic(s.icono)}</span><span class="mono small">${esc(s.id)}</span>${ramoPill(s.ramo)}${enLote.length ? `<span class="pill pill-warn">${ic('scan-eye')} ${I18N.t('gob.en_el_lote')}</span>` : I18N.t('gob.historico')}</div>
        <h4>${esc(s.nombre)}</h4>
        <p class="small">${esc(s.narrativa)}</p>
        <div class="chips">${s.indicadores.map((i) => { const x = cat.find((c) => c.id === i) || { nombre: i }; return `<button type="button" class="fr-chip${disparados(i) ? ' on' : ''}" data-fr-indicador="${esc(i)}" title="${I18N.t('gob.ver_detalle', { nombre: esc(x.nombre) })}">${esc(i)}</button>`; }).join('')}</div>
        <dl class="fr-kv small"><dt>${I18N.t('gob.umbral')}</dt><dd>${I18N.t('gob.score', { umbral: s.umbral, vigilancia: s.umbral >= 70 ? 'SIU' : 'vigilancia' })}</dd><dt>${I18N.t('gob.accion')}</dt><dd>${conGuardrails(esc(s.accion))}</dd><dt>${I18N.t('gob.falsos_positivos')}</dt><dd>${esc(s.falsos_positivos)}</dd></dl>
        <div class="fr-esc-pie">${normas(...s.normas)}<span class="muted small">${I18N.t('gob.casos_en_14_dias', { casos_14d: s.casos_14d, confirmados_14d: s.confirmados_14d })}</span></div>
        ${enLote.length ? `<div class="row">${enLote.map((e) => `<button class="btn btn-sm" type="button" data-fr-caso="${esc(e.id)}">${ic('scan-eye')} ${I18N.t('gob.ver', { id: esc(e.id), score: FR[e.id].score })}</button>`).join('')}</div>` : ''}
      </article>`;
    }).join('');

    // Mapa de relaciones y cola de la SIU
    titulo('h-fr-mapa', 'network', I18N.t('gob.mapa_de_relaciones'));
    $('fr-mapa').innerHTML = mapaFraude();
    const cola = [
      ...casosFr().map((e) => { const v = FR[e.id]; const s = seguimiento(e.id) || {}; return { lote: true, id: e.id, sub: e.asunto, escenario: v.escenario, score: v.score, nivel: v.nivel, estado: s.estado, responsable: s.responsable, nota: s.nota, fecha: s.fecha }; }),
      ...(D.cola || []).map((c) => ({ ...c, id: c.caso, sub: `${c.ramo} · ${(D.escenarios.find((s) => s.id === c.escenario) || {}).nombre || ''}` })),
    ];
    titulo('h-fr-siu', 'search-check', I18N.t('gob.cola_de_la_siu', { cola: cola.length }));
    $('fr-siu').innerHTML = cola.map((c) => `<tr${c.lote ? ` class="clickable" data-fr-caso="${esc(c.id)}" tabindex="0"` : ''}><td><b class="mono">${esc(c.id)}</b>${c.lote ? I18N.t('gob.lote') : ''}<br><span class="small muted">${esc(c.sub || '')}</span></td><td class="mono small">${esc(c.escenario || '—')}</td><td class="tnum"><b>${c.score}</b></td><td>${estSiuPill(c.estado)}</td><td class="small">${esc(c.responsable || '—')}${c.abierto || c.fecha ? `<br><span class="muted">${fechaHora(c.abierto || c.fecha)}</span>` : ''}</td><td class="small wrap">${esc(c.lote ? c.nota || '' : c.nota || '')}${c.importe ? ` <span class="muted">· ${eur(c.importe, 0)}</span>` : ''}</td></tr>`).join('');

    // Catálogo
    titulo('h-fr-cat', 'list-ordered', I18N.t('gob.catalogo_de_indicadores', { cat: cat.length }));
    $('btn-fr-reset').innerHTML = `${ic('rotate-ccw')} Restaurar`;
    $('btn-fr-nuevo').innerHTML = `${ic('plus')} Nuevo indicador`;
    $('btn-fr-reset').style.display = Object.keys(frCfg).length ? '' : 'none';
    $('fr-cat').innerHTML = cat.map((i) => {
      const enLote = Object.values(FR).filter((v) => v.indicadores.some((x) => x.id === i.id && x.aplicado)).length;
      const cambiado = (i.nuevo ? I18N.t('gob.nuevo') : '') + (frCfg[i.id] ? I18N.t('gob.cambiado') : '');
      return `<tr data-fr-fila="${esc(i.id)}" class="clickable${i.activo ? '' : ' muted'}" tabindex="0" title="${I18N.t('gob.ver_el_detalle_de', { id: esc(i.id) })}"><td><label class="switch${i.activo ? '' : ' off'}" data-fr-ind="${esc(i.id)}" role="switch" aria-checked="${i.activo}" tabindex="0" title="${i.activo ? I18N.t('gob.desactivar') : I18N.t('gob.activar')} ${esc(i.id)}"><i></i></label></td><td><b class="mono">${esc(i.id)}</b> ${ic(i.icono)} ${esc(i.nombre)}${cambiado}<br><small class="muted">${esc(i.no_es)}</small></td><td class="small">${esc(i.grupo)}</td><td class="small wrap">${esc(i.senal)}</td><td class="small">${esc(I18N.dato(i.fuente))}</td><td><input class="fr-peso" type="number" min="0" max="60" step="5" value="${i.peso}" data-fr-peso="${esc(i.id)}" aria-label="${I18N.t('gob.peso_de', { id: esc(i.id) })}"></td><td class="tnum">${num(i.disparos_14d)}</td><td><span class="meter" style="--c:${i.fp > 0.75 ? 'var(--warn)' : 'var(--primary)'}"><i style="width:${Math.round(i.fp * 100)}%"></i></span> <span class="tnum small">${Math.round(i.fp * 100)} %</span></td><td class="tnum">${enLote ? `<b>${enLote}</b>` : I18N.t('gob.0_2')}</td></tr>`;
    }).join('');

    // Guardrails y caps antifraude
    titulo('h-fr-limites', 'shield-check', I18N.t('gob.guardrails_y_caps_antifraude'));
    const grs = (G.politicas || []).filter((p) => ['G-10', 'G-11', 'G-12'].includes(p.id));
    const caps = (G.caps || []).filter((c) => c.ambito === 'Antifraude');
    $('fr-limites').innerHTML = grs.map((p) => `<tr class="clickable" data-fr-gr="${esc(p.id)}" tabindex="0"><td>${grRef(p.id)}</td><td class="small wrap">${esc(p.condicion)}</td><td class="small muted">${I18N.t('gob.guardrail_2', { inactivo: politicaActiva(p) ? 'activo' : 'inactivo' })}</td><td class="tnum">${I18N.t('gob.hoy_en_14_d', { disparos_dia: (p.disparos_dia || [])[13] ?? 0, disparos: num(p.disparos) })}</td><td class="small wrap">${esc(p.accion)}</td></tr>`).join('')
      + caps.map((c) => { const [pc, pi, pl] = CAP_ESTADO[capEstadoDe(c)] || CAP_ESTADO.ok; return `<tr class="clickable" data-cap="${esc(c.id)}" tabindex="0"><td>${grRef(c.id)}</td><td class="small wrap">${esc(I18N.dato(c.tipo))}</td><td class="tnum small">${I18N.t('gob.limite_3', { limite: capFmt(c, c.limite) })}</td><td><span class="tnum">${capFmt(c, c.consumo)}</span> <span class="pill ${pc}">${ic(pi)} ${pl}</span></td><td class="small wrap">${esc(c.accion)}</td></tr>`; }).join('');

    titulo('h-fr-evol', 'chart-column', I18N.t('gob.evolucion_en_14_dias'));
    $('fr-evol').innerHTML = chartFraude(dias);

    // Gobierno del modelo y equidad por canal
    titulo('h-fr-gob', 'scale', I18N.t('gob.gobierno_del_modelo_antifraude'));
    const g12 = grs.find((p) => p.id === 'G-12');
    const pr = [
      ['user-check', I18N.t('gob.decide_una_persona'), I18N.t('gob.un_score_alto_no'), ['rgpd-22', 'ai-14']],
      ['eye-off', I18N.t('gob.el_cliente_no_ve'), I18N.t('gob.g_12_bloquea_cualquier', { disparos: g12 ? I18N.t('gob.veces_en_14_dias', { disparos: g12.disparos }) : '' }), ['rgpd-13']],
      ['file-search', I18N.t('gob.cada_punto_tiene_su'), I18N.t('gob.los_indicadores_de_relato'), ['rgpd-15', 'ai-13']],
      ['undo-2', I18N.t('gob.los_contraindicios_restan'), I18N.t('gob.el_historico_puede_anular'), ['eiopa']],
      ['coins', I18N.t('gob.uso_proporcionado_del_fichero'), I18N.t('gob.cap_09_limita_las'), ['lossear-99-7']],
      ['scale', I18N.t('gob.base_juridica'), I18N.t('gob.interes_legitimo_en_prevenir'), ['rgpd-c47']],
    ];
    $('fr-gob').innerHTML = `<ul class="fr-princ">${pr.map(([i, t, txt, ns]) => `<li><b>${ic(i)} ${esc(t)}</b><span class="small">${conGuardrails(esc(txt))}</span>${normas(...ns)}</li>`).join('')}</ul>`;
    const C = D.canales || []; const peor = [...C].sort((a, b) => b.alertas - a.alertas)[0];
    const resto = C.filter((c) => c !== peor); const media = resto.reduce((s, c) => s + c.alertas, 0) / (resto.length || 1);
    titulo('h-fr-canales', 'users', I18N.t('gob.equidad_por_canal'));
    const maxA = Math.max(...C.map((c) => c.alertas), 1);
    $('fr-canales').innerHTML = `<div class="fr-canales">${C.map((c) => { const [ci, cl] = canalInfo(c.canal); const alta = c.alertas > media * 1.4; return `<div class="fr-canal"><span>${ic(ci)} ${esc(cl)}</span><span class="meter" style="--c:${alta ? 'var(--warn)' : 'var(--primary)'}"><i style="width:${(c.alertas / maxA) * 100}%"></i></span><b class="tnum" style="${alta ? 'color:var(--warn)' : ''}">${dec(c.alertas, 1)}</b><span class="small muted tnum">${I18N.t('gob.confirma', { confirmadas: Math.round(c.confirmadas * 100) })}</span></div>`; }).join('')}</div>
      ${peor && peor.nota ? `<div class="alert warn" style="margin-top:.8rem"><span class="ico">${ic('circle-alert')}</span><div><b>${I18N.t('gob.alertas_por_cada_100', { canal: esc(canalInfo(peor.canal)[1]), replace: numero(peor.alertas), replace2: dec(media, 1) })}</b><small>${esc(peor.nota)}</small></div><button class="btn btn-sm" type="button" data-medida="M-18">${ic('wrench')} ${I18N.t('gob.ver_m_18')}</button></div>` : ''}`;
  }

  // Grafo en tres columnas: casos del lote → lo que los une (cuenta, proveedor, póliza) → expedientes del histórico
  function mapaFraude() {
    const H = FD().historico || {}; const sin = H.siniestros || []; const pol = H.polizas || {};
    const nodos = { caso: [], ent: [], hist: [] }; const idx = {}; const aristas = [];
    const nodo = (col, key, label, sub, color) => { if (!idx[key]) { idx[key] = { col, key, label, sub, color }; nodos[col].push(idx[key]); } return key; };
    const arista = (a, b, tipo) => { if (!aristas.some((x) => x[0] === a && x[1] === b)) aristas.push([a, b, tipo]); };
    const norm = (s) => String(s || '').replace(/\s+/g, '');
    FRL.forEach((e) => {
      const v = FR[e.id]; if (!v) return;
      const poliza = Fraude.entradaDe(e).poliza;
      v.indicadores.forEach((x) => {
        let ent = null;
        if (x.id === 'IF-03' && x.citas[0]) {
          const k = norm(x.citas[0].cita); ent = nodo('ent', `iban:${k}`, `Cuenta …${k.slice(-4)}`, I18N.t('gob.iban_compartido_if_03'), 'var(--crit)');
          sin.filter((s) => norm(s.iban) === k).forEach((s) => arista(ent, nodo('hist', s.id, s.id, `${s.titular || s.poliza} · ${fecha(s.fecha)}`, 'var(--muted)'), 'IF-03'));
        } else if (x.id === 'IF-05' && x.citas[0]) {
          const n = x.citas[0].cita; ent = nodo('ent', `prov:${n}`, n, I18N.t('gob.proveedor_recurrente_if_05'), 'var(--warn)');
          sin.filter((s) => s.proveedor === n).forEach((s) => arista(ent, nodo('hist', s.id, s.id, `${s.titular || s.poliza} · ${fecha(s.fecha)}`, 'var(--muted)'), 'IF-05'));
        } else if (['IF-01', 'IF-06', 'IF-11'].includes(x.id) && poliza) {
          const p = pol[poliza] || {};
          const sub = x.id === 'IF-01' && p.alta ? I18N.t('gob.alta_el_if_01', { alta: fecha(p.alta) }) : x.id === 'IF-11' ? I18N.t('gob.conductor_declarado_contraindicio') : I18N.t('gob.siniestro_previo_if_06');
          ent = nodo('ent', `pol:${poliza}`, I18N.t('gob.poliza_2', { poliza }), sub, x.contraindicio ? 'var(--ok)' : 'var(--review)');
          (x.enlaces || []).filter((id) => sin.some((s) => s.id === id)).forEach((id) => { const s = sin.find((y) => y.id === id); arista(ent, nodo('hist', s.id, s.id, `${s.tipo} · ${fecha(s.fecha)}`, 'var(--muted)'), 'IF-06'); });
        }
        if (ent) arista(nodo('caso', e.id, e.id, `score ${v.score} · ${NIVEL_FR[v.nivel][2]}`, NIVEL_FR[v.nivel][3]), ent, x.id);
      });
    });
    if (!nodos.caso.length) return I18N.t('gob.ningun_caso_del_lote');
    const W = 980, fil = 52, nw = 220, nh = 40, X = { caso: 10, ent: 380, hist: 750 };
    const n = Math.max(nodos.caso.length, nodos.ent.length, nodos.hist.length);
    const Hh = 30 + n * fil;
    ['caso', 'ent', 'hist'].forEach((c) => { const off = (n - nodos[c].length) * fil / 2; nodos[c].forEach((x, i) => { x.x = X[c]; x.y = 26 + off + i * fil; }); });
    const cab = [['caso', I18N.t('gob.casos_del_lote_2')], ['ent', I18N.t('gob.lo_que_los_une')], ['hist', I18N.t('gob.historico_2')]];
    return `<svg class="chart fr-mapa" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${I18N.t('gob.relaciones_entre_los_casos')}">
      ${cab.map(([c, t]) => `<text x="${X[c]}" y="14" class="fr-mapa-cab">${t}</text>`).join('')}
      ${aristas.map(([a, b, t]) => { const p = idx[a], q = idx[b]; const x1 = p.x + nw, y1 = p.y + nh / 2, x2 = q.x, y2 = q.y + nh / 2, mx = (x1 + x2) / 2; return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${q.color === 'var(--muted)' ? p.color : q.color}" stroke-width="2" stroke-dasharray="${t === 'IF-11' ? '4 3' : ''}" opacity=".9"><title>${esc(t)}</title></path>`; }).join('')}
      ${Object.values(idx).map((x) => `<g ${x.col === 'caso' ? `data-fr-caso="${esc(x.key)}" class="fr-nodo clickable"` : 'class="fr-nodo"'}><rect x="${x.x}" y="${x.y}" width="${nw}" height="${nh}" rx="5" fill="var(--surface)" stroke="${x.color}" stroke-width="${x.col === 'caso' ? 2 : 1.3}"/><text x="${x.x + 9}" y="${x.y + 16}" class="fr-mapa-t">${esc(x.label)}</text><text x="${x.x + 9}" y="${x.y + 31}" class="fr-mapa-s">${esc(x.sub.length > 38 ? `${x.sub.slice(0, 37)}…` : x.sub)}</text></g>`).join('')}
    </svg>`;
  }

  // Barras por día: mensajes con indicios y, encima, escalados a la SIU
  function chartFraude(dias) {
    if (!dias.length) return I18N.t('gob.sin_historico');
    const W = 640, H = 220, pl = 36, pr = 10, pt = 14, pb = 28, n = dias.length;
    const ymax = Math.max(...dias.map((d) => d[2])) * 1.15;
    const xs = (i) => pl + ((i + 0.5) / n) * (W - pl - pr), ys = (v) => pt + (1 - v / ymax) * (H - pt - pb); const bw = Math.min(26, ((W - pl - pr) / n) * 0.62);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${I18N.t('gob.mensajes_con_indicios_y')}">
      <g class="grid">${[0, 0.5, 1].map((f) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(ymax * f)}" y2="${ys(ymax * f)}"/><text x="${pl - 6}" y="${ys(ymax * f) + 4}" text-anchor="end">${Math.round(ymax * f)}</text>`).join('')}</g>
      ${dias.map((d, i) => `<rect x="${xs(i) - bw / 2}" y="${ys(d[2])}" width="${bw}" height="${ys(0) - ys(d[2])}" rx="3" fill="var(--warn)" opacity="${i === n - 1 ? 0.9 : 0.5}" data-tip="${I18N.t('gob.con_indicios_de_mensajes', { fecha: fecha(d[0]), hoy_parcial_2: i === n - 1 ? I18N.t('gob.hoy_parcial_2') : '', v: d[2], v2: num(d[1]), v3: d[3], v4: num(d[4]) })}"/><rect x="${xs(i) - bw / 2}" y="${ys(d[3])}" width="${bw}" height="${ys(0) - ys(d[3])}" rx="3" fill="var(--crit)" data-tip="${I18N.t('gob.escalados_a_la_siu_2', { fecha: fecha(d[0]), v: d[3] })}"/>`).join('')}
      ${dias.map((d, i) => (i % 2 ? '' : `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle">${fecha(d[0])}</text>`)).join('')}
    </svg><div class="legend"><span><i style="background:var(--warn)"></i> ${I18N.t('gob.con_indicios_40')}</span><span><i style="background:var(--crit)"></i> ${I18N.t('gob.escalados_a_la_siu_3')}</span></div>`;
  }

  // Ficha de un caso: texto con las citas, desglose del score, triaje frente a antifraude y seguimiento
  function abrirModalFraude(id) {
    const e = FRL.find((x) => x.id === id); const v = FR[id]; if (!e || !v) return;
    const D = FD(); const m = e.mensaje || {}; const texto = String(m.texto || '');
    const s = seguimiento(id) || {}; const esc0 = v.escenario && D.escenarios.find((x) => x.id === v.escenario);
    // Citas sin solapes, en orden, con el indicador que las activa
    const cs = v.indicadores.flatMap((x) => x.citas.map((c) => ({ ...c, id: x.id, off: !x.aplicado }))).sort((a, b) => a.inicio - b.inicio).filter((c, i, arr) => !arr.slice(0, i).some((p) => c.inicio < p.fin));
    let html = ''; let pos = 0;
    cs.forEach((c) => { html += esc(texto.slice(pos, c.inicio)) + `<mark class="fr-cita${c.off ? ' off' : ''}" title="${esc(c.id)}">${esc(texto.slice(c.inicio, c.fin))}<sup>${esc(c.id)}</sup></mark>`; pos = c.fin; });
    html += esc(texto.slice(pos));
    const max = 100;
    const filas = v.indicadores.map((x) => `<div class="fr-ind clickable${x.aplicado ? '' : ' off'}" data-fr-indicador="${esc(x.id)}" role="button" tabindex="0" title="${I18N.t('gob.ver_el_detalle_de', { id: esc(x.id) })}"><span class="mono">${esc(x.id)}</span><span>${ic(x.icono || 'info')} ${esc(x.nombre)}${x.contraindicio ? I18N.t('gob.contraindicio_2') : !x.activo ? I18N.t('gob.inactivo_3') : ''}<br><small class="muted">${esc(x.detalle || '')}${x.fuente ? ` · ${esc(I18N.dato(x.fuente))}` : ''}</small></span><span class="fr-ind-bar"><i style="width:${(x.peso / max) * 100}%;${x.aplicado ? '' : 'opacity:.3'}"></i></span><b class="tnum">${x.aplicado ? `+${x.aplicado}` : `<s>+${x.peso}</s>`}</b></div>`).join('');
    const traza = e.traza && G.trazas.some((t) => t.id === e.traza);
    $('modal-fraude-title').innerHTML = `${ic('shield-alert')} <span class="mono">${esc(id)}</span> · ${esc(e.asunto || m.asunto || '')} ${nivelFrPill(v.nivel)}`;
    $('modal-fraude-body').innerHTML = `
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('gauge')} ${I18N.t('gob.score_antifraude')}</span><b style="color:${NIVEL_FR[v.nivel][3]}">${v.score}</b><span class="muted small">${I18N.t('gob.vigilancia_40_siu_70')}</span></div>
        <div class="box"><span class="muted small">${ic('list-checks')} ${I18N.t('gob.triaje')}</span><b>${e.decision_triaje === 'REVISION' ? I18N.t('gob.a_revisar') : I18N.t('gob.aprobado')}</b><span class="muted small">${e.override ? `override: ${e.override.a === 'DESPEJADO' ? 'aprobado' : I18N.t('gob.a_revisar_3')}` : e.revision ? `revisado: ${e.revision.a === 'DESPEJADO' ? 'aprobado' : I18N.t('gob.a_revisar_3')}` : I18N.t('gob.no_cambia_por_el')}</span></div>
        <div class="box"><span class="muted small">${ic('banknote')} ${I18N.t('gob.pago')}</span><b>${PAGO_FR[v.pago][2]}</b><span class="muted small">${v.importe != null ? eur(v.importe, 0) : I18N.t('gob.sin_importe')}</span></div>
        <div class="box"><span class="muted small">${ic('route')} ${I18N.t('gob.escenario')}</span><b>${esc0 ? esc(esc0.id) : '—'}</b><span class="muted small">${esc0 ? esc(esc0.nombre) : I18N.t('gob.no_encaja_en_ninguno')}</span></div>
        <div class="box"><span class="muted small">${ic('search-check')} ${I18N.t('gob.seguimiento')}</span><b>${(EST_SIU[s.estado] || EST_SIU.registrado)[2]}</b><span class="muted small">${esc(s.responsable || '—')}</span></div>
      </div>
      <div class="two">
        <div><h3>${I18N.t('gob.indicadores_desglose_del_score')}</h3><div class="fr-umbral"><i style="width:${v.score}%;background:${NIVEL_FR[v.nivel][3]}"></i><u style="left:40%"><span>40</span></u><u style="left:70%"><span>70</span></u></div>
          <div class="fr-inds">${filas || I18N.t('gob.ningun_indicador_disparado')}</div></div>
        <div><h3>${I18N.t('gob.mensaje_del_cliente_citas')}</h3><div class="box fr-texto">${html}</div>
          <p class="small muted" style="margin-top:.4rem">${ic('eye-off')} ${I18N.t('gob.ni_el_score_ni', { G: grRef('G-12') })}</p></div>
      </div>
      <div class="two">
        <div><h3>${I18N.t('gob.que_pasa_ahora')}</h3><p class="small"><b>${conGuardrails(esc(v.accion))}.</b>${s.nota ? ` ${esc(s.nota)}` : ''}</p>${esc0 ? `<p class="small muted" style="margin-top:.3rem">${I18N.t('gob.accion_del_escenario', { accion: conGuardrails(esc(esc0.accion)) })}</p>` : ''}</div>
        <div><h3>${I18N.t('gob.relacionado')}</h3><div class="row">${traza ? `<button class="btn btn-sm" type="button" data-traza="${esc(e.traza)}">${ic('route')} ${I18N.t('gob.traza_2', { traza: esc(e.traza) })}</button>` : ''}${v.enlaces.filter((x) => FR[x]).map((x) => `<button class="btn btn-sm" type="button" data-fr-caso="${esc(x)}">${ic('link')} ${esc(x)}</button>`).join('')}${v.enlaces.filter((x) => !FR[x]).map((x) => `<span class="pill pill-time">${ic('history')} ${esc(x)}</span>`).join('')}</div>
          ${esc0 ? `<div style="margin-top:.5rem">${normas(...esc0.normas)}</div>` : ''}</div>
      </div>`;
    abrir('modal-fraude');
  }
  // Ficha de un indicador del catálogo: qué detecta, cómo pesa, en qué escenarios entra y dónde se activa en el lote
  function abrirModalFrInd(id) {
    const i = frCatalogo().find((x) => x.id === id); if (!i) return;
    const base = FD().indicadores.find((x) => x.id === id);
    const D = FD();
    const hits = FRL.map((e) => ({ e, v: FR[e.id], x: FR[e.id] && FR[e.id].indicadores.find((y) => y.id === id) })).filter((h) => h.x)
      .sort((a, b) => b.x.aplicado - a.x.aplicado || b.v.score - a.v.score);
    const suma = hits.filter((h) => h.x.aplicado).length;
    const escs = D.escenarios.filter((s) => s.indicadores.includes(id));
    const estado = i.activo ? I18N.t('gob.activo_2') : I18N.t('gob.inactivo_4');
    const pesoSub = base && base.peso !== i.peso ? I18N.t('gob.cambiado_en_esta_sesion', { peso: base.peso }) : I18N.t('gob.puntos_sobre_100_del');
    $('modal-fr-ind-title').innerHTML = `${ic(i.icono || 'tag')} <span class="mono">${esc(i.id)}</span> · ${esc(i.nombre)} ${estado}`;
    $('modal-fr-ind-body').innerHTML = `
      <div class="kpi-mini">
        <div class="box"><span class="muted small">${ic('gauge')} ${I18N.t('gob.peso')}</span><b>+${i.peso}</b><span class="muted small">${esc(pesoSub)}</span></div>
        <div class="box"><span class="muted small">${ic('tag')} ${I18N.t('gob.grupo')}</span><b>${esc(i.grupo || '—')}</b><span class="muted small">${(i.ramos || []).map(esc).join(' · ') || I18N.t('gob.todos_los_ramos')}</span></div>
        <div class="box"><span class="muted small">${ic('activity')} ${I18N.t('gob.disparos_14_d')}</span><b>${num(i.disparos_14d || 0)}</b><span class="muted small">${I18N.t('gob.en_todo_el_flujo')}</span></div>
        <div class="box"><span class="muted small">${ic('circle-x')} ${I18N.t('gob.falsos_positivos')}</span><b style="color:${i.fp > 0.75 ? 'var(--warn)' : 'inherit'}">${Math.round((i.fp || 0) * 100)} %</b><span class="muted small">${I18N.t('gob.casos_que_la_siu')}</span></div>
        <div class="box"><span class="muted small">${ic('scan-eye')} ${I18N.t('gob.en_el_lote_2')}</span><b>${suma}</b><span class="muted small">${hits.length > suma ? I18N.t('gob.mas_sin_sumar', { suma: hits.length - suma }) : I18N.t('gob.de_mensajes', { FRL: FRL.length })}</span></div>
      </div>
      <div class="two">
        <div><h3>${I18N.t('gob.que_detecta')}</h3><p class="small">${esc(i.senal || '—')}</p>
          <dl class="fr-kv small"><dt>${I18N.t('gob.fuente')}</dt><dd>${esc(i.fuente || '—')}</dd>${Array.isArray(i.frases) && i.frases.length ? `<dt>${I18N.t('gob.frases')}</dt><dd>${i.frases.map((f) => `«${esc(f)}»`).join(' ')}</dd>` : ''}</dl></div>
        <div><h3>${I18N.t('gob.que_no_es_un')}</h3><p class="small">${esc(i.no_es || '—')}</p>
          <p class="small muted" style="margin-top:.4rem">${ic('info')} ${I18N.t('gob.un_indicador_solo_suma', { G: grRef('G-12') })}</p></div>
      </div>
      <h3>${I18N.t('gob.escenarios_en_los_que', { escs: escs.length })}</h3>
      ${escs.length ? `<ul class="fr-act">${escs.map((s) => `<li><b class="mono">${esc(s.id)}</b> <span class="small">${ic(s.icono)} ${esc(s.nombre)}${s.clave === id ? I18N.t('gob.indicador_clave') : ''}</span><span class="small muted">${I18N.t('gob.indicadores_umbral', { indicadores: s.indicadores.length, umbral: s.umbral })}</span></li>`).join('')}</ul>` : I18N.t('gob.no_forma_parte_de')}
      <h3>${I18N.t('gob.donde_se_activa_en', { hits: hits.length })}</h3>
      ${hits.length ? `<ul class="fr-act">${hits.map(({ e, v, x }) => `<li><button class="btn btn-sm" type="button" data-fr-caso="${esc(e.id)}">${ic('scan-eye')} ${esc(e.id)}</button> <span class="small">${esc(x.detalle || '')}${x.citas.length ? ` <span class="muted">· ${x.citas.map((c) => `«${esc(c.cita)}»`).join(' ')}</span>` : ''}</span><span class="small">${x.aplicado ? `<b>+${x.aplicado}</b>` : x.contraindicio ? I18N.t('gob.contraindicio_3') : I18N.t('gob.no_suma')} · ${nivelFrPill(v.nivel)} ${v.score}</span></li>`).join('')}</ul>` : I18N.t('gob.ningun_mensaje_del_lote')}
      <div class="row" style="justify-content:flex-end;margin-top:.8rem"><button class="btn btn-sm" type="button" data-fr-ind="${esc(i.id)}">${ic('power')} ${i.activo ? I18N.t('gob.desactivar') : I18N.t('gob.activar')}</button></div>`;
    abrir('modal-fr-ind');
  }
  // ---- Nuevo indicador de fraude -------------------------------------------
  const GRUPOS_FR = [I18N.t('gob.relato'), I18N.t('gob.economico'), I18N.t('gob.temporal'), I18N.t('gob.relacional'), I18N.t('gob.historial'), I18N.t('gob.conductor'), I18N.t('gob.canal')];
  function abrirModalFrNuevo() {
    const id = siguienteId('IF', frCatalogo());
    $('modal-fr-nuevo-title').innerHTML = `${ic('plus')} ${I18N.t('gob.nuevo_indicador_de_fraude')} <span class="mono">${esc(id)}</span>`;
    $('modal-fr-nuevo-body').innerHTML = `
      <p class="small muted">${I18N.t('gob.un_indicador_suma_puntos')}</p>
      <div class="form-grid">
        <form id="form-fr" class="form" autocomplete="off" novalidate>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.nombre')}<input id="nf-nombre" type="text" maxlength="70" placeholder="${I18N.t('gob.ej_pide_el_pago')}"></label>
          <label class="f">${I18N.t('gob.grupo')}<select id="nf-grupo">${GRUPOS_FR.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>
          <label class="f">${I18N.t('gob.peso_puntos')}<span class="input-unit"><input id="nf-peso" type="number" min="5" max="60" step="5" value="15"><b>${I18N.t('gob.de_100')}</b></span></label>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.frases_que_lo_activan')}<textarea id="nf-frases" rows="3" placeholder="${I18N.t('gob.en_efectivo_10_a')}"></textarea></label>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.senal_que_detecta')}<input id="nf-senal" type="text" maxlength="140" placeholder="${I18N.t('gob.el_cliente_pide_cobrar')}"></label>
          <fieldset class="f" style="grid-column:1/-1;border:0;padding:0;margin:0"><legend>${I18N.t('gob.ramos')}</legend><div class="row">${['Auto', 'Hogar', 'Salud'].map((r) => `<label class="inline-check"><input type="checkbox" class="nf-ramo" value="${r}" checked> ${r}</label>`).join('')}</div></fieldset>
          <label class="f" style="grid-column:1/-1">${I18N.t('gob.que_no_debe_leerse')}<input id="nf-noes" type="text" maxlength="180" placeholder="${I18N.t('gob.ej_pequenas_franquicias_que')}"></label>
          <label class="inline-check"><input id="nf-activo" type="checkbox" checked> ${I18N.t('gob.activarlo_al_crearlo')}</label>
          <p id="nf-err" class="form-err" role="alert" hidden></p>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn" type="button" data-close="modal-fr-nuevo">${I18N.t('gob.cancelar')}</button><button class="btn btn-primary" type="submit">${ic('check')} ${I18N.t('gob.crear_indicador')}</button></div>
        </form>
        <div class="box preview" id="nf-preview" aria-live="polite"></div>
      </div>`;
    actualizarPreviewFr();
    abrir('modal-fr-nuevo');
    $('nf-nombre').focus();
  }
  function leerFrNuevo() {
    return {
      id: siguienteId('IF', frCatalogo()), grupo: $('nf-grupo').value, icono: 'tag', nombre: $('nf-nombre').value.trim(),
      senal: $('nf-senal').value.trim(), frases: $('nf-frases').value.split('\n').map((x) => x.trim()).filter(Boolean),
      fuente: I18N.t('gob.mensaje_cita_literal'), peso: Math.max(5, Math.min(60, Math.round(Number($('nf-peso').value) || 15))),
      ramos: [...document.querySelectorAll('.nf-ramo:checked')].map((x) => x.value), activo: $('nf-activo').checked,
      no_es: $('nf-noes').value.trim() || I18N.t('gob.indicador_creado_en_esta'), disparos_14d: 0, fp: 0, nuevo: true,
    };
  }
  // Vista previa: qué mensajes del lote lo activarían y cómo cambiaría su nivel
  function actualizarPreviewFr() {
    const n = leerFrNuevo(); const box = $('nf-preview'); if (!box) return;
    if (!n.frases.length) { box.innerHTML = `<h3>${I18N.t('gob.vista_previa')}</h3><p class="small muted">${I18N.t('gob.escribe_al_menos_una', { FRL: FRL.length })}</p>`; return; }
    const R2 = Fraude.evaluar(FRL, { ...FD(), indicadores: [...frCatalogo(), { ...n, activo: true }] });
    const hits = FRL.filter((e) => R2[e.id].indicadores.some((x) => x.id === n.id));
    box.innerHTML = `<h3>${I18N.t('gob.vista_previa_2', { id: n.id })}</h3><p class="small"><b>${hits.length}</b> ${I18N.t('gob.de_mensajes_del_lote', { FRL: FRL.length, se_crea_inactivo_no: n.activo ? '' : I18N.t('gob.se_crea_inactivo_no') })}</p>
      ${hits.length ? `<ul class="fr-act">${hits.map((e) => { const a = FR[e.id]; const b = R2[e.id]; const x = b.indicadores.find((i) => i.id === n.id); return `<li><b class="mono">${esc(e.id)}</b> <span class="small muted">«${esc(x.citas[0].cita)}»</span><span class="small">${a.score} → <b>${b.score}</b>${a.nivel !== b.nivel ? ` · ${nivelFrPill(b.nivel)}` : ''}</span></li>`; }).join('')}</ul>` : I18N.t('gob.ningun_mensaje_del_lote_2')}`;
  }
  function guardarFrNuevo() {
    const n = leerFrNuevo(); const err = $('nf-err');
    if (!n.nombre) { err.textContent = I18N.t('gob.ponle_un_nombre_al'); err.hidden = false; $('nf-nombre').focus(); return; }
    if (!n.frases.length) { err.textContent = I18N.t('gob.escribe_al_menos_una_2'); err.hidden = false; $('nf-frases').focus(); return; }
    if (!n.ramos.length) { err.textContent = I18N.t('gob.elige_al_menos_un'); err.hidden = false; return; }
    err.hidden = true;
    if (!n.senal) n.senal = I18N.t('gob.el_mensaje_contiene', { frases: n.frases.map((f) => `«${f}»`).join(', ') });
    frNuevos.push(n); ssSet('gobierno.fraude_nuevos', frNuevos);
    G.eventos.unshift({ fecha: new Date().toISOString(), tipo: 'politica', sev: 'info', agente: 'reglas', titulo: I18N.t('gob.nuevo_indicador_de_fraude_2', { id: n.id, nombre: n.nombre }), detalle: I18N.t('gob.indicador_nuevo_detalle', { peso: n.peso, frases: I18N.t('gob.n_frases', { n: n.frases.length }), estado: I18N.t(n.activo ? 'gob.estado_activo' : 'gob.estado_inactivo') }), usuario: I18N.t('gob.operador_esta_sesion') });
    $('modal-fr-nuevo').close();
    renderAll();
    const fila = document.querySelector(`#fr-cat tr[data-fr-fila="${n.id}"]`);
    if (fila) { fila.scrollIntoView({ block: 'center', behavior: 'smooth' }); fila.classList.add('is-new'); setTimeout(() => fila.classList.remove('is-new'), 2600); }
  }
  const frTraza = (t) => { const v = FR[t.mensaje]; return v && (v.score || v.pago === 'retenido') ? `<dt>${I18N.t('gob.antifraude')}</dt><dd>${I18N.t('gob.score_2', { nivel: nivelFrPill(v.nivel), score: v.score, retenido: v.pago === 'retenido' ? ` · ${pagoPill('retenido')}` : '' })} <button class="btn btn-sm" type="button" data-fr-caso="${esc(t.mensaje)}">${ic('shield-alert')} ${I18N.t('gob.ver_2')}</button></dd>` : ''; };
  function guardarFrCfg() { ssSet('gobierno.fraude_cfg', frCfg); evaluarFraude(); renderFraude(); renderInicio(); }

  // Landing: una ficha por cada sección del menú, agrupadas por la pregunta a la que responden
  function renderInicio() {
    const alertas = alertasTodas(); const crit = alertas.filter((a) => a.sev === 'crit').length; const avisos = alertas.length - crit;
    const { T } = estadoCumplimiento(); const E = estadoKB();
    const ags = agentesPrincipales(); const noActivos = ags.filter((a) => estadoAgente(a) !== 'activo');
    const dias = diarioVisible(); const coste = dias.reduce((a, d) => a + costeDia(d), 0);
    const pol = G.politicas || []; const activos = pol.filter(politicaActiva).length;
    const capsSup = (G.caps || []).filter((c) => capEstadoDe(c) === 'superado').length;
    const niveles = [3, 2, 1, 0].map((n) => [n, ags.filter((a) => a.nivel === n).length]).filter(([, c]) => c).map(([n, c]) => I18N.t('gob.en_l', { v: c, v2: n })).join(' · ');
    const kbCrit = E.filter(({ s }) => s.estado === 'rojo'); const kbOk = E.filter(({ s }) => s.estado === 'ok').length;
    const repl = G.replays || []; const cambios = repl.filter((r) => String(r.decision).startsWith('DISTINTA')).length;
    const ev = G.eventos || [];
    // Por sección: [pregunta, cifra grande, texto bajo la cifra, estado, normas]
    const nCritAl = I18N.t('gob.n_criticas', { n: crit });
    const F = {
      resumen: [I18N.t('gob.va_bien_el_sistema'), String(alertas.length), `alertas activas · ${nCritAl}`, crit ? 'crit' : avisos ? 'warn' : 'ok', ['ai-14', 'eiopa']],
      agentes: [I18N.t('gob.quien_es_que_hace'), I18N.t('gob.de_7', { noActivos: ags.length - noActivos.length, ags: ags.length }), `agentes activos${noActivos.length ? ` · ${noActivos.map((a) => `${a.nombre}: ${(ESTADO[estadoAgente(a)] || ESTADO.activo)[2].replace(/ \(.*\)/, '').toLowerCase()}`).join(', ')}` : ''}`, noActivos.length ? 'warn' : 'ok', ['dora-9', 'ai-14']],
      trazas: [I18N.t('gob.que_paso_con_este'), num(G.trazas.length), I18N.t('gob.trazas_con_incidencia_con', { incidencias: G.trazas.filter((t) => (t.incidencias || []).length).length, auto: G.trazas.filter((t) => t.resultado !== 'auto').length }), G.trazas.some((t) => (t.incidencias || []).length) ? 'warn' : 'ok', ['ai-12', 'rgpd-5']],
      replay: [I18N.t('gob.por_que_decidio_eso'), String(repl.length), I18N.t('gob.replays_de_decision', { cambios, cambios2: cambios === 1 ? 'cambio' : 'cambios' }), cambios ? 'warn' : 'ok', ['rgpd-15', 'ai-15']],
      autonomia: [I18N.t('gob.cuanta_libertad_tiene_cada'), G.kpis.resumen[0].valor, I18N.t('gob.autonomia_efectiva_2', { niveles: niveles || '—' }), 'ok', ['ai-14', 'rgpd-22']],
      guardrails: [I18N.t('gob.que_limites_frenan_a'), I18N.t('gob.de_8', { activos, pol: pol.length }), I18N.t('gob.activos_disparos_en_14', { disparos: num(pol.reduce((a, p) => a + (p.disparos || 0), 0)) }), activos < pol.length ? 'warn' : 'ok', ['ai-9', 'ai-14']],
      hitl: (() => { const d = datosResumen(); const pend = colaHitl().filter((c) => c.estado === 'pendiente').length; return [I18N.t('gob.que_hacen_las_personas'), String(pend), I18N.t('gob.de_revision_override', { pendientes: pend === 1 ? 'pendiente' : 'pendientes', replace: dec(d.pOvr, 1) }), d.pOvr > 3 ? 'crit' : pend ? 'warn' : 'ok', ['ai-14', 'rgpd-22']]; })(),
      knowledge: [I18N.t('gob.con_que_conocimiento_deciden'), I18N.t('gob.de_9', { kbOk, E: E.length }), I18N.t('gob.sanas_2', { ninguna_critica: kbCrit.length ? `${kbCrit.map(({ k }) => k.id).join(', ')} ${kbCrit.length === 1 ? 'crítica' : 'críticas'}` : I18N.t('gob.ninguna_critica') }), kbCrit.length ? 'crit' : kbOk < E.length ? 'warn' : 'ok', ['ai-10', 'rgpd-17']],
      cumplimiento: [I18N.t('gob.podemos_demostrar_que_cumplimos'), `${T.global} %`, I18N.t('gob.cobertura_de_controles_parciales_2', { rojo: T.marcos.reduce((a, m) => a + m.cuenta.ambar + m.cuenta.rojo, 0) }), T.global >= 90 ? 'ok' : 'warn', ['ai-12', 'rgpd-5']],
      finops: [I18N.t('gob.cuanto_cuesta_y_estamos'), eur(coste, 0), I18N.t('gob.en_el_periodo_2', { capsSup, caps_superados_2: capsSup === 1 ? I18N.t('gob.cap_superado') : I18N.t('gob.caps_superados_2') }), capsSup ? 'crit' : 'ok', ['sii-41']],
      medidas: (() => { const ab = medidas().filter(abiertaMed); const cr = ab.filter((m) => m.sev === 'crit').length; const AH = ahorroMedidas(); return [I18N.t('gob.que_hay_que_hacer'), String(ab.length), I18N.t('gob.texto_4', { medidas_abiertas_2: ab.length === 1 ? I18N.t('gob.medida_abierta') : I18N.t('gob.medidas_abiertas_2'), cr, criticas: cr === 1 ? I18N.t('gob.medidas.critica') : I18N.t('gob.medidas.criticas'), posible: AH.conseguido ? I18N.t('gob.de_mes_ahorrados', { conseguido: num(AH.conseguido), total: num(AH.total) }) : I18N.t('gob.mes_de_ahorro_posible', { posible: num(AH.posible) }) }), cr ? 'crit' : ab.length ? 'warn' : 'ok', ['ai-9', 'rgpd-5']]; })(),
      fraude: (() => { const r = Fraude.resumen(FR); return [I18N.t('gob.hay_indicios_de_fraude'), String(r.con_indicios), I18N.t('gob.con_indicios_en_la', { casos: r.con_indicios === 1 ? 'caso' : 'casos', siu: r.siu, retenidos: r.retenidos, pagos_retenidos: r.retenidos === 1 ? I18N.t('gob.pago_retenido') : I18N.t('gob.pagos_retenidos') }), r.siu ? 'warn' : 'ok', ['rgpd-22', 'rgpd-c47']]; })(),
      historico: [I18N.t('gob.que_ha_cambiado_cuando'), num(ev.length), `eventos${ev.length ? I18N.t('gob.ultimo', { fecha: fechaHora(ev.reduce((a, e) => (e.fecha > a ? e.fecha : a), ev[0].fecha)) }) : ''}`, 'ok', ['ai-12', 'rgpd-5']],
    };
    // Resumen, Trazabilidad y Razonamiento son vistas de consulta, y Guardrails solo enumera límites (un guardrail
    // inactivo no es una incidencia): sin etiqueta de estado
    const SIN_ESTADO = ['resumen', 'trazas', 'replay', 'guardrails'];
    const GRUPOS = MENU;
    const SEM = { ok: ['var(--ok)', I18N.t('gob.sin_incidencias'), 'pill-ok', 'circle-check', I18N.t('gob.al_dia')], warn: ['var(--warn)', I18N.t('gob.hay_algo_que_mirar'), 'pill-warn', 'circle-alert', I18N.t('gob.revisar')], crit: ['var(--crit)', I18N.t('gob.requiere_atencion'), 'pill-crit', 'triangle-alert', I18N.t('gob.atencion')] };
    const tab = Object.fromEntries(TABS.map(([v, i, l]) => [v, [i, l]]));
    $('inicio-hero').innerHTML = `<div><h2>${ic('house')} ${I18N.t('gob.gobierno_de_los_agentes')}</h2>
        <p>${I18N.t('gob.que_esta_pasando_cuanto')}</p>
        <div class="row" style="margin-top:.6rem">${crit ? `<span class="pill pill-crit">${ic('triangle-alert')} ${crit} ${crit === 1 ? I18N.t('gob.alerta_critica') : I18N.t('gob.alertas_criticas')}</span>` : ''}<span class="pill pill-warn">${ic('circle-alert')} ${I18N.t('gob.avisos_2', { avisos })}</span><span class="pill" style="background:color-mix(in srgb, ${colorPct(T.global)} 14%, transparent);color:${colorPct(T.global)}">${ic('thermometer')} ${I18N.t('gob.cumplimiento_3', { global: T.global })}</span><span class="pill pill-muted">${ic('book-open')} ${I18N.t('gob.de_kb_sanas', { kbOk, E: E.length })}</span></div></div>
      <div class="inicio-acc"><button class="btn btn-primary" type="button" data-goto="resumen">${ic('layout-dashboard')} ${I18N.t('gob.ver_el_resumen')}</button>
        <div class="inicio-pres"><label class="switch${Shell.Recorrido.presentador() ? '' : ' off'}" data-presentador role="switch" aria-checked="${Shell.Recorrido.presentador()}" tabindex="0" title="${I18N.t('gob.activa_el_recorrido_guiado')}"><i></i>${I18N.t('gob.modo_presentador')}</label>
        ${Shell.Recorrido.presentador() ? `<button class="btn btn-sm" type="button" data-rec-empezar>${ic('route')} ${I18N.t('gob.recorrido_de_la_demo')}</button>` : ''}</div></div>`;
    // Fichas agrupadas por bloque, con su nombre y su pregunta. En cada ficha manda la cifra; el estado solo se marca
    // cuando hay algo que mirar (al día = un punto verde; revisar y atención = etiqueta)
    $('inicio-grupos').innerHTML = GRUPOS.map(([g, pregG, vs]) => `<div class="inicio-grupo"><div class="inicio-grupo-cab"><h3>${esc(g)}</h3><p class="inicio-grupo-preg">${esc(pregG)}</p></div><div class="inicio-fichas">${vs.map((v) => {
      const [preg, cifra, texto, sem, ns] = F[v]; const [, semTxt, semCls, semIco, semLbl] = SEM[sem]; const [i, l] = tab[v] || ['info', v];
      const estado = SIN_ESTADO.includes(v) ? '' : sem === 'ok' ? `<span class="inicio-ok" title="${semLbl}: ${semTxt.toLowerCase()}" aria-label="${semLbl}"></span>` : `<span class="pill ${semCls} inicio-estado" title="${semTxt}">${ic(semIco)} ${semLbl}</span>`;
      return `<article class="card inicio-ficha" data-goto="${v}" role="button" tabindex="0" title="${I18N.t('gob.abrir_2', { preg: esc(preg), v: esc(l) })}">
        <div class="inicio-top"><span class="ag-ico">${ic(i)}</span><strong class="ag-nombre">${esc(l)}</strong>${estado}</div>
        <div class="inicio-cifra"><b>${esc(cifra)}</b><span>${esc(texto)}</span></div>
        <div class="inicio-pie">${normas(...ns)}<span class="inicio-abrir">${I18N.t('gob.abrir_3')} ${ic('arrow-right')}</span></div>
      </article>`;
    }).join('')}</div></div>`).join('');
    igualarFichasInicio();
  }

  // Todas las fichas de Inicio con el mismo alto (el de la más alta), sea cual sea el número de columnas.
  // Se recalcula al cambiar el ancho de la rejilla (cambio de columnas, panel lateral, vista que pasa a visible).
  let anchoInicio = 0;
  function igualarFichasInicio() {
    const fichas = [...document.querySelectorAll('#inicio-grupos .inicio-ficha')];
    fichas.forEach((f) => { f.style.height = ''; });
    const alto = Math.max(0, ...fichas.map((f) => f.offsetHeight));
    if (alto) fichas.forEach((f) => { f.style.height = `${alto}px`; });
  }
  if (window.ResizeObserver) {
    new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w && w !== anchoInicio) { anchoInicio = w; igualarFichasInicio(); }
    }).observe($('inicio-grupos'));
  }

  // ---------------------------------------------------------------------------
  // Termómetro de cumplimiento: controles medidos en las trazas (cumplimiento.js) + declarados (documentales)
  // ---------------------------------------------------------------------------
  const ESTADO_CMP = { ok: ['pill-ok', 'circle-check', I18N.t('gob.cubierto')], ambar: ['pill-warn', 'circle-alert', I18N.t('gob.parcial')], rojo: ['pill-crit', 'circle-x', I18N.t('gob.sin_cubrir')] };
  const CAT_ICONO = { identificativo: 'user', contacto: 'phone', indirecto: 'fingerprint', localizacion: 'map-pin', financiero: 'wallet', salud: 'heart-pulse', menor: 'users', tercero: 'user-check' };
  let cmpFiltro = ''; let cmpSoloAmbar = false; let cmpAlterada = null; let cmpItems = [];

  // Controles documentales + los dos que se miden con el catálogo de Knowledge Bases (AI Act art. 10 y RGPD art. 17)
  function declaradosConKB() {
    const base = G.cumplimiento_declarado || GOBIERNO_DEMO.cumplimiento_declarado || {};
    const KB = G.knowledge || GOBIERNO_DEMO.knowledge || [];
    if (!KB.length) return base;
    const conRub = KB.filter((k) => k.rubrica).length;
    const conPii = KB.filter((k) => k.metricas.pii);
    const medido = (id, normas, exige, como, medida, estado) => ({ id, normas, exige, como, medida, estado, fuente: 'medido', trazas: [] });
    const ria10 = medido('ria-10', ['AI Act art. 10'], I18N.t('gob.gobierno_de_los_datos'), I18N.t('gob.catalogo_de_knowledge_bases'), I18N.t('gob.kb_versionadas_y_registradas', { KB: KB.length, conRub }), conRub === KB.length ? 'ok' : 'ambar');
    const rgpd17 = medido('rgpd-17', ['RGPD art. 17'], I18N.t('gob.supresion_tambien_en_los'), I18N.t('gob.al_suprimir_un_dato'), conPii.length ? I18N.t('gob.pendientes_de_supresion', { id: conPii.map((k) => I18N.t('gob.chunks_con_datos_personales_2', { pii: num(k.metricas.pii), id: k.id })).join(' · ') }) : I18N.t('gob.ningun_chunk_con_datos'), conPii.length ? 'ambar' : 'ok');
    return { ...base, ria: (base.ria || []).map((c) => (c.id === 'ria-10' ? ria10 : c)), rgpd: [...(base.rgpd || []), rgpd17] };
  }

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
      const entry = { ...r, id: m.id, raw: JSON.stringify(json, null, 2), origen: 'IA', mensaje: m, timestamp: new Date(t.inicio).toISOString(), revisado: !!(t.override || t.revision), ...(t.override || t.revision ? { revision: { accion: t.override ? 'override' : 'validada', ...(t.revision ? { resultado: t.revision.resultado } : {}), de: (t.override || t.revision).de, a: (t.override || t.revision).a, usuario: (t.override || t.revision).usuario, fecha: (t.override || t.revision).fecha, comentario: (t.override || t.revision).motivo } } : {}) };
      const reglas = t.spans.find((s) => s[0] === 'reglas');
      return { entry, gob: Cumplimiento.gobernanza(entry, { traza_id: t.id, modelo: reglas ? reglas[3] : null, prompt: PROMPT_VERSION }), texto: m.texto, raw: entry.raw };
    });
  }

  const colorPct = (p) => (p >= 90 ? 'var(--ok)' : p >= 70 ? 'var(--warn)' : 'var(--crit)');
  function termoSvg(p) {
    const alto = 132; const lleno = Math.round((alto * p) / 100);
    return `<svg class="termo-svg" viewBox="0 0 48 180" role="img" aria-label="${I18N.t('gob.por_ciento_de_controles', { v: p })}">
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
    const T = termometroGob(cmpItems.map((x) => x.gob), declaradosConKB(), cadena);
    const todos = T.marcos.flatMap((mc) => mc.controles.map((c) => ({ ...c, marco: mc.id })));
    const cuenta = (e) => todos.filter((c) => c.estado === e).length;
    const fuente = $('fuente').value === 'sesion' && ssGet('triage.log', []).length ? I18N.t('gob.la_sesion_actual_del') : I18N.t('gob.las_13_trazas_del');

    $('cmp-hero').innerHTML = `<div class="cmp-hero-main">
        <div class="cmp-global" style="--c:${colorPct(T.global)}"><span class="v">${T.global}<small>%</small></span><span class="l">${I18N.t('gob.de_cobertura_de_controles')}</span></div>
        <div class="cmp-hero-txt">
          <h2>${ic('thermometer')} ${I18N.t('gob.termometro_de_cumplimiento_2', { eiopa: normas('ai-12', 'rgpd-5', 'eiopa') })}</h2>
          <p class="small">${I18N.t('gob.como_se_guardan_las', { fuente: esc(fuente) })} <span class="mono">${I18N.t('gob.gobernanza')}</span> ${I18N.t('gob.que_se_ven_en')}</p>
          <div class="row" style="margin-top:.5rem"><span class="pill pill-ok">${ic('circle-check')} ${I18N.t('gob.cubiertos', { ok: cuenta('ok') })}</span><span class="pill pill-warn">${ic('circle-alert')} ${I18N.t('gob.parciales', { ambar: cuenta('ambar') })}</span>${cuenta('rojo') ? `<span class="pill pill-crit">${ic('circle-x')} ${I18N.t('gob.sin_cubrir_2', { rojo: cuenta('rojo') })}</span>` : ''}<span class="pill pill-muted">${ic('activity')} ${I18N.t('gob.medidos_en_las_trazas', { medido: todos.filter((c) => c.fuente === 'medido').length })}</span><span class="pill pill-muted">${ic('file-text')} ${I18N.t('gob.declarados_documentales', { declarado: todos.filter((c) => c.fuente === 'declarado').length })}</span></div>
        </div>
        <div class="cmp-hero-acc"><button class="btn btn-primary btn-sm" type="button" id="btn-cmp-export">${ic('download')} ${I18N.t('gob.exportar_evidencias_de_cumplimiento')}</button></div>
      </div>
      <p class="muted small cmp-aviso">${ic('info')} ${I18N.t('gob.indicador_tecnico_de_cobertura')}</p>`;

    $('cmp-termos').innerHTML = T.marcos.map((mc) => `<button type="button" class="card termo${cmpFiltro === mc.id ? ' is-active' : ''}" data-cmp-marco="${mc.id}" aria-pressed="${cmpFiltro === mc.id}">
        ${termoSvg(mc.pct)}
        <div class="termo-txt"><span class="termo-pct" style="color:${colorPct(mc.pct)}">${mc.pct} %</span><b>${esc(mc.nombre)}</b><span class="muted small">${esc(mc.sub)}</span>
        <span class="termo-cuenta"><span class="pill pill-ok">${mc.cuenta.ok}</span><span class="pill pill-warn">${mc.cuenta.ambar}</span>${mc.cuenta.rojo ? `<span class="pill pill-crit">${mc.cuenta.rojo}</span>` : ''}<span class="muted small">${I18N.t('gob.de_controles', { controles: mc.controles.length })}</span></span></div>
      </button>`).join('');

    titulo('h-cmp-matriz', 'list-checks', I18N.t('gob.que_exige_cada_norma'));
    $('cmp-filtro').innerHTML = [['', I18N.t('gob.todas')], ...T.marcos.map((mc) => [mc.id, mc.nombre])].map(([k, l]) => `<button type="button" class="chip${cmpFiltro === k ? ' is-active' : ''}" data-cmp-marco="${k}">${esc(l)}</button>`).join('');
    $('cmp-filtro-estado').innerHTML = `<button type="button" class="chip${cmpSoloAmbar ? ' is-active' : ''}" data-cmp-ambar="1">${ic('circle-alert')} ${I18N.t('gob.solo_parciales')}</button>`;
    const filas = todos.filter((c) => (!cmpFiltro || c.marco === cmpFiltro) && (!cmpSoloAmbar || c.estado !== 'ok'));
    $('cmp-matriz').innerHTML = filas.map((c) => {
      const [cls, icono, txt] = ESTADO_CMP[c.estado];
      const tz = (c.trazas || []);
      return `<tr><td><span class="pill ${cls}">${ic(icono)} ${txt}</span></td>
        <td><span class="normas" style="margin:0">${c.normas.map((e) => `<span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA[e] || e)}">${ic('scale')} ${esc(Cumplimiento.normaVisible(e))}</span>`).join('')}</span></td>
        <td class="wrap">${esc(c.exige)}</td><td class="wrap">${esc(c.como)}</td><td class="wrap"><b>${esc(c.medida)}</b></td>
        <td>${c.fuente === 'medido' ? `<span class="pill pill-time">${ic('activity')} ${I18N.t('gob.medido')}</span>` : `<span class="pill pill-muted">${ic('file-text')} ${I18N.t('gob.declarado')}</span>`}</td>
        <td class="wrap">${tz.length ? `${tz.slice(0, 3).map((id) => `<a href="#" class="mono" data-cmp-traza="${esc(id)}">${esc(id)}</a>`).join(' ')}${tz.length > 3 ? ` <span class="muted small">+${tz.length - 3}</span>` : ''}` : '<span class="muted">—</span>'}</td></tr>`;
    }).join('') || I18N.t('gob.ningun_control_con_este');

    titulo('h-cmp-ciclo', 'route', I18N.t('gob.ciclo_de_vida_de'));
    const PASOS = [
      ['inbox', I18N.t('gob.ingesta'), I18N.t('gob.mensaje_de_cualquiera_de'), ['AI Act art. 12'], I18N.t('gob.al_recibir')],
      ['scan-text', I18N.t('gob.deteccion_de_datos_personales'), I18N.t('gob.8_categorias_salud_menores'), ['RGPD art. 4.1', 'RGPD art. 9'], I18N.t('gob.al_recibir')],
      ['eye-off', I18N.t('gob.seudonimizacion'), I18N.t('gob.nombres_dni_poliza_y'), ['RGPD art. 4.5', 'RGPD art. 25'], I18N.t('gob.antes_de_registrar')],
      ['sparkles', I18N.t('gob.decision_del_modelo'), I18N.t('gob.cita_las_evidencias_que'), ['AI Act art. 13', 'RGPD art. 5.1.c'], 'segundos'],
      ['user-check', I18N.t('gob.supervision_humana'), I18N.t('gob.toda_decision_desfavorable_o'), ['AI Act art. 14', 'RGPD art. 22'], I18N.t('gob.antes_de_comunicar')],
      ['link', I18N.t('gob.registro_sellado'), I18N.t('gob.hash_de_la_salida'), ['AI Act art. 12', 'RGPD art. 5.2'], I18N.t('gob.al_decidir')],
      ['archive', I18N.t('gob.retencion'), I18N.t('gob.traza_seudonimizada_6_meses'), ['AI Act art. 19 y 26.6', 'LCS art. 23'], I18N.t('gob.6_meses_2_5')],
      ['lock', I18N.t('gob.bloqueo_y_supresion'), I18N.t('gob.bloqueo_durante_la_prescripcion'), ['LOPDGDD art. 32', 'RGPD art. 5.1.e'], I18N.t('gob.al_prescribir')],
    ];
    $('cmp-ciclo').innerHTML = PASOS.map(([i, t, d, ns, cuando], k) => `<div class="ciclo-paso"><span class="ciclo-n">${k + 1}</span><span class="ciclo-ico">${ic(i)}</span><b>${esc(t)}</b><span class="small">${esc(d)}</span><span class="ciclo-cuando">${ic('timer')} ${esc(cuando)}</span><span class="normas" style="margin:0">${ns.map((e) => `<span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA[e] || e)}">${esc(Cumplimiento.normaVisible(e))}</span>`).join('')}</span></div>`).join('');

    titulo('h-cmp-inv', 'fingerprint', I18N.t('gob.inventario_de_datos_personales', { datos_personales: T.resumen.datos_personales, trazas: T.resumen.trazas }));
    $('cmp-inv').innerHTML = cmpItems.map((x, i) => {
      const dp = x.gob.datos_personales;
      const chips = Object.entries(dp.por_categoria).map(([c, nn]) => `<span class="pill pill-muted" data-tip="${esc(Cumplimiento.CATEGORIAS[c].etiqueta)} · ${esc(Cumplimiento.CATEGORIAS[c].tratamiento)}"><span class="pii-dot pii-${c}"></span> ${ic(CAT_ICONO[c])} ${nn}</span>`).join(' ');
      const muestra = dp.hallazgos.filter((h) => h.categoria !== 'salud').slice(0, 2).map((h) => `<span class="mono">${esc(h.valor_en_traza)}</span>`).join(' · ');
      return `<tr class="clickable" data-cmp-item="${i}" tabindex="0"><td class="mono">${esc(x.gob.trazabilidad.traza_id)}</td><td>${esc(x.entry.id)}</td><td>${ramoPill(x.entry.ramo)}</td><td class="wrap">${chips}</td>
        <td>${dp.categoria_especial_salud ? `<span class="pill pill-crit">${ic('heart-pulse')} ${dp.categoria_especial_salud}</span>` : '<span class="muted">—</span>'}</td>
        <td>${dp.menores ? `<span class="pill pill-warn">${dp.menores}</span>` : '<span class="muted">—</span>'}</td><td>${dp.terceros || '<span class="muted">—</span>'}</td>
        <td>${I18N.t('gob.de_10', { no_usados_en_decision: dp.no_usados_en_decision, total: dp.total })}</td><td>${muestra}</td></tr>`;
    }).join('');

    titulo('h-cmp-cadena', 'link', I18N.t('gob.integridad_del_registro'));
    $('btn-cmp-alterar').innerHTML = cmpAlterada === null ? I18N.t('gob.simular_una_alteracion', { alert: ic('triangle-alert') }) : `${ic('undo-2')} Restaurar`;
    $('cmp-cadena').innerHTML = `<p class="small" style="margin-bottom:.5rem">${cadena.roto === null ? `<span class="pill pill-ok">${ic('circle-check')} ${I18N.t('gob.cadena_integra')}</span> ${I18N.t('gob.de_eslabones_verificados_al', { items: cadena.items.length })}` : `<span class="pill pill-crit">${ic('circle-x')} ${I18N.t('gob.cadena_rota')}</span> ${I18N.t('gob.la_traza')} <b class="mono">${esc(cadena.items[cadena.roto].traza_id)}</b> ${I18N.t('gob.no_coincide_con_su')}`}</p>
      <ol class="eslabones">${cadena.items.map((e) => `<li class="${e.ok ? 'ok' : 'ko'}"><span class="mono">${esc(e.traza_id)}</span><span class="mono muted">${e.eslabon.slice(0, 12)}…</span>${e.ok ? ic('check') : ic('x')}</li>`).join('')}</ol>`;

    titulo('h-cmp-seud', 'eye-off', I18N.t('gob.seudonimizar_no_es_anonimizar'));
    $('cmp-seud').innerHTML = `<div class="seud-col"><b>${ic('fingerprint')} ${I18N.t('gob.seudonimizado')} <span class="norma" data-tip="${esc(Cumplimiento.NORMA_POR_ETIQUETA['RGPD art. 4.5'])}">${I18N.t('gob.rgpd_art_4_5')}</span></b><p class="small">${I18N.t('gob.el_dato_se_sustituye')}<span class="mono">${I18N.t('gob.per_0b01')}</span>, <span class="mono">${I18N.t('gob.pol')}</span>${I18N.t('gob.y_la_clave_se')} <b>${I18N.t('gob.sigue_siendo_dato_personal')}</b>${I18N.t('gob.es_lo_que_corresponde')}</p><p class="small muted">${I18N.t('gob.se_aplica_a_trazas')}</p></div>
      <div class="seud-col"><b>${ic('lock')} ${I18N.t('gob.anonimizado')} <span class="norma" data-tip="${I18N.t('gob.rgpd_considerando_26_la')}">${I18N.t('gob.rgpd_cons_26')}</span></b><p class="small">${I18N.t('gob.irreversible_no_hay_clave')}</p><p class="small muted">${I18N.t('gob.se_aplica_a_cuadros')}</p></div>`;
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
        <div><h3>${I18N.t('gob.mensaje_con_los_datos')}</h3><p class="cmp-texto">${html}</p><ul class="pii-ley">${ley}</ul>
          <p class="muted small" style="margin-top:.5rem">${I18N.t('gob.vista_con_permisos_de')}</p></div>
        <div><h3>${I18N.t('gob.hallazgos_y_tratamiento')}</h3><div class="tw"><table><thead><tr><th>${I18N.t('gob.dato')}</th><th>${I18N.t('gob.categoria')}</th><th>${I18N.t('gob.valor_en_la_traza')}</th><th>${I18N.t('gob.para_decidir')}</th></tr></thead><tbody>${dp.hallazgos.map((h) => `<tr><td class="mono">${esc(h.id)}</td><td><span class="pii-dot pii-${h.categoria}"></span> ${esc(Cumplimiento.CATEGORIAS[h.categoria].etiqueta)}</td><td class="mono">${esc(h.valor_en_traza)}</td><td>${h.usado_en_decision ? `<span class="pill pill-ok">${I18N.t('gob.si_3')}</span>` : `<span class="pill pill-warn" data-tip="${I18N.t('gob.se_envio_al_modelo')}">${I18N.t('gob.no_2')}</span>`}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div><h3>${I18N.t('gob.bloque_gobernanza_el_mismo')}</h3><pre class="raw-json">${Cumplimiento.jsonHtml({ _gobernanza: x.gob }, {})}</pre></div>`;
    $('modal-cmp').showModal();
  }

  function exportarCumplimiento() {
    const T = termometroGob(cmpItems.map((x) => x.gob), declaradosConKB(), Cumplimiento.verificarCadena(cmpItems));
    const datos = { esquema: Cumplimiento.ESQUEMA, generado: new Date().toISOString(), aviso: I18N.t('gob.indicador_tecnico_de_cobertura_2'), termometro: T, cadena: Cumplimiento.encadenar(cmpItems.map((x) => x.gob)), trazas: cmpItems.map((x) => x.gob) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `evidencias-cumplimiento-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function renderAll() {
    AG = Object.fromEntries(G.agentes.map((a) => [a.id, a]));
    POL = Object.fromEntries([...(G.politicas || []), ...(G.caps || [])].map((p) => [p.id, p]));
    incluirNuevos();
    cmpItems = entradasCumplimiento();
    evaluarFraude();
    if (!G.trazas.some((t) => t.id === selId)) selId = G.trazas.length ? G.trazas[G.trazas.length - 1].id : null;
    renderResumen();
    renderInicio();
    titulo('h-res-cmp', 'thermometer', I18N.t('gob.cumplimiento'));
    titulo('h-res-kb', 'book-open', I18N.t('gob.knowledge_bases'));
    titulo('h-trazas', 'route', `Trazas (${G.trazas.length})`);
    $('r-summary').innerHTML = `${ic('route')} Trazas (${G.trazas.length}) · filtros`;
    listaTrazas('t'); listaTrazas('r');
    renderDetalle();
    renderSteps();
    renderReplays();
    renderAutonomia();
    renderGuardrails();
    renderHitl();
    renderFinops();
    renderHistorico();
    renderKnowledge();
    renderCumplimiento();
    renderAgentes();
    renderMedidas();
    renderFraude();
    { const nf = $('tabs').querySelector('[data-view="fraude"] .n'); if (nf) nf.textContent = Fraude.resumen(FR).con_indicios || ''; }
    $('tabs').querySelector('[data-view="finops"] .n').textContent = G.caps.filter((c) => c.estado === 'superado').length || '';
    ajustarAgentes();
  }

  const TABS = [['inicio', 'house', I18N.t('gob.inicio')], ['resumen', 'layout-dashboard', I18N.t('gob.resumen')], ['agentes', 'bot', I18N.t('gob.agentes')], ['trazas', 'route', I18N.t('gob.trazabilidad')], ['replay', 'brain', I18N.t('gob.razonamiento_y_replay')], ['autonomia', 'sliders-horizontal', I18N.t('gob.autonomia')], ['guardrails', 'shield-check', I18N.t('gob.guardrails')], ['fraude', 'shield-alert', I18N.t('gob.fraude')], ['hitl', 'user-check', I18N.t('gob.intervencion_humana')], ['knowledge', 'book-open', I18N.t('gob.knowledge_bases')], ['cumplimiento', 'thermometer', I18N.t('gob.cumplimiento')], ['finops', 'coins', I18N.t('gob.finops_2')], ['medidas', 'wrench', I18N.t('gob.medidas_correctivas')], ['historico', 'history', I18N.t('gob.historico_2')]];
  // Menú lateral e Inicio comparten los mismos grupos: [nombre, pregunta a la que responde, secciones]
  const MENU = [
    [I18N.t('gob.operacion'), I18N.t('gob.que_esta_pasando'), ['resumen', 'agentes', 'trazas']],
    [I18N.t('gob.control'), I18N.t('gob.cuanto_decide_la_maquina'), ['autonomia', 'guardrails', 'hitl']],
    [I18N.t('gob.riesgo'), I18N.t('gob.hay_indicios_de_fraude_2'), ['fraude']],
    [I18N.t('gob.calidad'), I18N.t('gob.deciden_bien_y_con'), ['replay', 'knowledge']],
    [I18N.t('gob.cumplimiento_y_coste'), I18N.t('gob.cumplimos_y_cuanto_cuesta'), ['cumplimiento', 'finops']],
    [I18N.t('gob.mejora_y_auditoria'), I18N.t('gob.que_hay_que_corregir'), ['medidas', 'historico']],
  ];
  function goto(v, opts = {}) {
    document.querySelectorAll('.tab').forEach((b) => { b.classList.toggle('is-active', b.dataset.view === v); b.setAttribute('aria-selected', String(b.dataset.view === v)); });
    document.querySelectorAll('.view').forEach((s) => s.classList.toggle('is-active', s.dataset.view === v));
    if (opts.replay) { const card = $('card-replay'); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); card.style.outline = '2px solid var(--primary)'; setTimeout(() => { card.style.outline = ''; }, 1600); }
    else window.scrollTo({ top: 0 });
    if (v === 'hitl') animar(document.querySelector('.view[data-view="hitl"]'));
    if (v === 'finops') animar($('fin-graf'));
    if (v === 'fraude') animar(document.querySelector('.view[data-view="fraude"]'));
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

  // ---------------------------------------------------------------------------
  // Navegación entre los elementos de una lista desde su ventana emergente (‹ 3 de 13 ›), para todas las ventanas
  // que se abren desde una lista: recuerda la lista de origen y «pulsa» el elemento anterior o siguiente.
  // ---------------------------------------------------------------------------
  const NAV_ATTR = ['data-fr-caso', 'data-fr-fila', 'data-fr-indicador', 'data-id', 'data-gr', 'data-cap', 'data-cambio', 'data-kb', 'data-rub', 'data-cmp-item', 'data-cmp-ficha', 'data-kpi-fin', 'data-medida'];
  let nav = null; // { dlg, attr, cont, valor }
  const itemsNav = () => (nav ? [...nav.cont.querySelectorAll(`:scope > [${nav.attr}]`)] : []);
  function pintarNav() {
    document.querySelectorAll('.mh-nav').forEach((x) => x.remove());
    if (!nav || !nav.dlg.open) return;
    const items = itemsNav(); const i = items.findIndex((x) => x.getAttribute(nav.attr) === nav.valor);
    if (items.length < 2 || i < 0) return;
    const head = nav.dlg.querySelector('.modal-head'); if (!head) return;
    const div = document.createElement('div'); div.className = 'mh-nav';
    div.innerHTML = `<span class="mh-pos">${I18N.t('gob.de_11', { v: i + 1, items: items.length })}</span><button class="btn btn-sm" type="button" data-nav="-1" aria-label="${I18N.t('gob.anterior_2')}" title="${I18N.t('gob.anterior_3')}" ${i ? '' : 'disabled'}>${ic('chevron-left')}</button><button class="btn btn-sm" type="button" data-nav="1" aria-label="${I18N.t('gob.siguiente_2')}" title="${I18N.t('gob.siguiente_3')}" ${i < items.length - 1 ? '' : 'disabled'}>${ic('chevron-right')}</button>`;
    head.insertBefore(div, head.querySelector('[data-close]'));
  }
  function navegar(d) {
    const items = itemsNav(); const i = items.findIndex((x) => x.getAttribute(nav.attr) === nav.valor);
    const sig = items[i + d]; if (sig) sig.click();
  }
  // Gráficos animados al abrir una ventana, al navegar a otro elemento y al cambiar de pestaña dentro de ella:
  // cada vez que se repinta el cuerpo de una ventana (o una de sus secciones), sus gráficos se vuelven a animar.
  function initAnimModales() {
    const obs = new MutationObserver((muts) => {
      const raices = new Set(muts.map((m) => m.target.closest('.modal-body')).filter(Boolean));
      raices.forEach((r) => { if (r.closest('dialog').open) animar(r); });
    });
    document.querySelectorAll('dialog .modal-body').forEach((b) => obs.observe(b, { childList: true }));
  }
  function initNavModales() {
    document.addEventListener('click', (e) => {
      // Dentro de una ventana solo cuenta el indicador de fraude (desglose de un caso): se vuelve a la anterior al cerrarlo
      if (e.target.closest('dialog') && !e.target.closest('[data-fr-indicador]')) return;
      let el = e.target; let attr = null;
      while (el && el.nodeType === 1 && !(attr = NAV_ATTR.find((x) => el.hasAttribute(x)))) el = el.parentElement;
      if (!attr) return;
      const antes = new Set(document.querySelectorAll('dialog[open]'));
      let cont = el.parentElement; let valor = el.getAttribute(attr);
      // La ficha de cumplimiento abierta desde Trazabilidad navega por la lista del Termómetro
      // Un indicador de fraude, se abra desde un escenario o desde un caso, navega por el catálogo
      if (attr === 'data-fr-indicador') { const tr = document.querySelector(`#fr-cat tr[data-fr-fila="${CSS.escape(valor)}"]`); if (!tr) return; attr = 'data-fr-fila'; cont = tr.parentElement; }
      if (attr === 'data-cmp-ficha') { const k = cmpItems.findIndex((x) => x.gob.trazabilidad.traza_id === valor); const li = document.querySelector(`[data-cmp-item="${k}"]`); if (!li) return; attr = 'data-cmp-item'; valor = String(k); cont = li.parentElement; }
      // Abierta desde un elemento sin hermanos (chip de una alerta, enlace en un texto): usa la lista más larga que lo contenga
      const hermanos = (c) => c.querySelectorAll(`:scope > [${attr}]`).length;
      if (hermanos(cont) < 2) {
        const mejor = [...document.querySelectorAll(`[${attr}="${CSS.escape(valor)}"]`)].map((x) => x.parentElement).filter((p) => !p.closest('dialog')).sort((a, b) => hermanos(b) - hermanos(a))[0];
        if (mejor && hermanos(mejor) > hermanos(cont)) cont = mejor;
      }
      setTimeout(() => {
        const abiertos = [...document.querySelectorAll('dialog[open]')];
        const dlg = abiertos.find((d) => !antes.has(d)) || (nav && nav.cont === cont && abiertos.includes(nav.dlg) ? nav.dlg : null);
        if (!dlg) return;
        const prev = !nav ? null : nav.dlg === dlg ? nav.prev : nav.dlg.open ? nav : null;
        nav = { dlg, attr, cont, valor, prev }; pintarNav();
        if (prev) dlg.addEventListener('close', () => { if (nav && nav.dlg === dlg && prev.dlg.open) { nav = prev; pintarNav(); } }, { once: true });
      }, 0);
    }, true);
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-nav]'); if (b && nav) { e.stopPropagation(); navegar(Number(b.dataset.nav)); } }, true);
    document.addEventListener('keydown', (e) => {
      if (!nav || !nav.dlg.open || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      e.preventDefault(); navegar(e.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  function bind() {
    initNavModales();
    initAnimModales();
    document.addEventListener('submit', (e) => { if (e.target.id === 'form-rub') guardarRub(e); });
    document.addEventListener('change', (e) => { if (e.target.id === 'ag-ejemplo') { agEjemplo = Number(e.target.value); renderAgentes(); } });
    document.addEventListener('input', (e) => { if (e.target.classList && e.target.classList.contains('rc-peso')) sumaRub(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-kb], tr[data-rub], tr[data-traza]')) e.target.click(); });
    const tabMenu = Object.fromEntries(TABS.map(([v, i, l]) => [v, [i, l]]));
    const botonMenu = (v) => { const [i, l] = tabMenu[v]; return `<button class="tab nav-item${v === 'inicio' ? ' is-active' : ''}" type="button" role="tab" data-view="${v}" aria-selected="${v === 'inicio'}" aria-label="${l}" title="${l}">${ic(i)}<span class="lbl">${l}</span>${v === 'finops' || v === 'fraude' ? I18N.t('gob.texto_5') : ''}</button>`; };
    $('tabs').innerHTML = botonMenu('inicio') + MENU.map(([g, , vs]) => `<div class="nav-grupo" role="presentation">${esc(g)}</div>${vs.map(botonMenu).join('')}`).join('');
    // Menú lateral común con el triaje (shell.js); al plegar o desplegar se reajustan las tarjetas de agentes
    Shell.initShell({ onChange: () => ajustarAgentes() });
    // Recorrido de la demo (modo presentador): acciones de los pasos que ocurren en el panel
    // El guion trabaja con la fuente «Sesión actual» (las trazas del lote procesado en el triaje) si hay lote
    const trazaDeMensaje = (msg) => G.trazas.find((t) => t.mensaje === msg);
    const fuenteSesion = () => {
      const hayLote = (ssGet('triage.log', []) || []).length > 0;
      if (hayLote && $('fuente').value !== 'sesion') { $('fuente').value = 'sesion'; setFuente('sesion'); }
      return hayLote ? '' : I18N.t('gob.sin_lote_procesado_en');
    };
    Shell.Recorrido.init({
      agentes: () => { const aviso = fuenteSesion(); verAgente('reglas'); return aviso; },
      goto: (v) => { cerrarTodos(); const aviso = fuenteSesion(); goto(v); return aviso; },
      // Si la ficha de esa KB ya está abierta, solo cambia de pestaña (sin cerrarla y volverla a abrir)
      kb: (id, sec) => {
        if (!($('modal-kb').open && kbSel === id)) { cerrarTodos(); fuenteSesion(); goto('knowledge'); abrirModalKB(id); }
        kbSec = sec || 'salud'; pintarModalKB(); return '';
      },
      // ── Subpasos del recorrido: ventanas y selección (solo ver) ──
      sel: (msg) => { const t = trazaDeMensaje(msg); if (t) selectTraza(t.id); return ''; },
      traza: (msg) => { const t = trazaDeMensaje(msg); if (t) abrirModalTraza(t.id); return ''; },
      kpi: (key) => { abrirModalKpiFin(key); return ''; },
      gr: (id) => { abrirModalGr(id); return ''; },
      cambio: (texto) => { const i = (G.cambios_autonomia || []).findIndex((c) => String(c.motivo || '').includes(texto)); if (i >= 0) abrirModalCambio(i); return ''; },
      fr: (id) => { abrirModalFraude(id); return ''; },
      med: (id) => { abrirModalMed(id); return ''; },
      cmp: (msg) => { const i = cmpItems.findIndex((x) => x.entry && x.entry.id === msg); if (i >= 0) abrirModalCmp(i); return ''; },
      // ── Subpasos que cambian el estado de la demo: dejan X en un estado (idempotentes) y quedan en el Histórico ──
      agente: (id, estado) => {
        const a = AG[id]; if (!a) return '';
        const pausado = estadoAgente(a) === 'pausado';
        if ((estado === 'pausado') !== pausado) toggleAgente(id);
        return '';
      },
      guardrail: (id, v) => { const p = (G.politicas || []).find((x) => x.id === id); if (p && politicaActiva(p) !== (v === 'on')) toggleGuardrail(id); return ''; },
      medida: (id, estado) => {
        const m = medidas().find((x) => x.id === id); if (!m) return '';
        const est = estadoMedida(m); const k = m.alternativas.indexOf(recomendada(m));
        if (estado === 'abierta' && ['aplicada', 'pendiente'].includes(est)) accionMedida(id, 'reabrir', 0);
        if ((estado === 'aplicada' || estado === 'pendiente') && est === 'abierta') accionMedida(id, 'aplicar', k);
        return '';
      },
      alteracion: (v) => { if ((cmpAlterada !== null) !== (v === 'on')) { cmpAlterada = v === 'on' ? Math.min(4, cmpItems.length - 1) : null; renderCumplimiento(); } return ''; },
      'kb-aplicar': (id) => {
        const hechas = ssGet('gobierno.recorrido_kb', []); if (hechas.includes(id)) return '';
        const k = (G.knowledge || GOBIERNO_DEMO.knowledge || []).find((x) => x.id === id); if (!k) return '';
        const i = (k.comparativa || []).findIndex((x) => x.recomendada && !x.actual); if (i < 0) return '';
        kbSel = id; accionKB(`aplicar:${i}`); ssSet('gobierno.recorrido_kb', [...hechas, id]);
        return '';
      },
      replay: (modo, modelo) => {
        $('rp-modo').value = modo === 'whatif' ? 'whatif' : 'identico';
        const o = [...$('rp-modelo').options].find((x) => x.value.split(' ')[0] === modelo); if (o) $('rp-modelo').value = o.value;
        renderDiff(true); $('card-replay').scrollIntoView({ block: 'center', behavior: 'smooth' });
        return '';
      },
      // Estado del lote del triaje (misma pestaña) para los avisos de espera del recorrido
      lote: () => ({ total: ((PAQUETES.find((x) => x.id === 'A') || {}).mensajes || []).length, hechos: (ssGet('triage.log', []) || []).filter((e) => e.paquete === 'A').length, procesando: false }),
    });
    document.addEventListener('recorrido:presentador', () => renderInicio());
    $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) goto(b.dataset.view); });
    // Navegación, modales, kill switch, guardrails y leyendas: un único delegado de clic
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) { const dlg = go.closest('dialog'); if (dlg) dlg.close(); goto(go.dataset.goto, { replay: !!go.dataset.replay }); return; }
      const cl = e.target.closest('[data-close]'); if (cl) { $(cl.dataset.close).close(); return; }
      const fsw = e.target.closest('[data-fr-ind]'); if (fsw) { e.preventDefault(); const i = frCatalogo().find((x) => x.id === fsw.dataset.frInd); frCfg[i.id] = { ...(frCfg[i.id] || {}), activo: !i.activo }; guardarFrCfg(); if ($('modal-fr-ind').open) abrirModalFrInd(i.id); return; }
      const fid = e.target.closest('[data-fr-indicador], #fr-cat tr[data-fr-fila]'); if (fid && !e.target.closest('input')) { abrirModalFrInd(fid.dataset.frIndicador || fid.dataset.frFila); return; }
      if (e.target.closest('#btn-fr-nuevo')) { abrirModalFrNuevo(); return; }
      if (e.target.closest('#btn-fr-reset')) { Object.keys(frCfg).forEach((k) => delete frCfg[k]); guardarFrCfg(); return; }
      const fgr = e.target.closest('[data-fr-gr]'); if (fgr) { abrirModalGr(fgr.dataset.frGr); return; }
      const fca = e.target.closest('[data-fr-caso]'); if (fca && !e.target.closest('input')) { if (fca.closest('#modal-fr-ind')) cerrarTodos(); abrirModalFraude(fca.dataset.frCaso); return; }
      const sw = e.target.closest('[data-switch]'); if (sw) { e.preventDefault(); e.stopPropagation(); toggleAgente(sw.dataset.switch); return; }
      const gr = e.target.closest('[data-guardrail]'); if (gr) { e.preventDefault(); toggleGuardrail(gr.dataset.guardrail); if (gr.dataset.reabrir) abrirModalGr(gr.dataset.reabrir); return; }
      const cb = e.target.closest('[data-cambio]'); if (cb) { abrirModalCambio(Number(cb.dataset.cambio)); return; }
      const ae = e.target.closest('[data-ahorro-esc]'); if (ae) { ahorroEdit = { ...ahorroEdit, minutos_mensaje: Number(ae.dataset.ahorroEsc) }; ahorroCambia(true); return; }
      if (e.target.closest('[data-ahorro-reset]')) { ahorroEdit = {}; ahorroCambia(true); return; }
      const fm = e.target.closest('[data-fin-modo]'); if (fm) { finModo = fm.dataset.finModo; renderFinGraf(); animar($('fin-porque').closest('.card')); return; }
      const irc = e.target.closest('[data-ir-reco]'); if (irc) { const al = document.querySelector(`#recos [data-reco="${irc.dataset.irReco}"]`); if (al) { al.scrollIntoView({ block: 'center', behavior: 'smooth' }); al.style.outline = '2px solid var(--primary)'; setTimeout(() => { al.style.outline = ''; }, 1600); } return; }
      const va = e.target.closest('[data-ver-agente]'); if (va) { verAgente(va.dataset.verAgente); return; }
      const ia = e.target.closest('[data-ir-alerta]'); if (ia) { e.stopPropagation(); const al = [...document.querySelectorAll('#correctivas [data-alerta-caps]')].find((x) => x.dataset.alertaCaps.split(' ').includes(ia.dataset.irAlerta)); if (al) { al.scrollIntoView({ behavior: 'smooth', block: 'center' }); al.classList.remove('is-new'); void al.offsetWidth; al.classList.add('is-new'); } return; }
      const cu = e.target.closest('[data-corr-undo]'); if (cu) { e.stopPropagation(); const [cid, k] = cu.dataset.corrUndo.split(':'); deshacerCorrectiva(cid, Number(k)); return; }
      const co = e.target.closest('[data-corr]'); if (co) { const [cid, k] = co.dataset.corr.split(':'); aplicarCorrectiva(cid, Number(k)); return; }
      const cp = e.target.closest('[data-cap]'); if (cp) { abrirModalCap(cp.dataset.cap); return; }
      const lg = e.target.closest('[data-legend]'); if (lg) { const set = lg.dataset.legend === 'agente' ? ocultos : tokOcultos; set.has(lg.dataset.key) ? set.delete(lg.dataset.key) : set.add(lg.dataset.key); renderCharts(); return; }
      const pr = e.target.closest('[data-presentador]'); if (pr) { e.preventDefault(); Shell.Recorrido.setPresentador(!Shell.Recorrido.presentador()); return; }
      if (e.target.closest('[data-rec-empezar]')) { Shell.Recorrido.empezar(); return; }
      const at = e.target.closest('[data-ag-tab]'); if (at) { agSel = at.dataset.agTab; ssSet('gobierno.agente', agSel); renderAgentes(); return; }
      const ma = e.target.closest('[data-med-acc]'); if (ma) { e.stopPropagation(); const [t, id, k] = ma.dataset.medAcc.split(':'); accionMedida(id, t, Number(k)); return; }
      const md = e.target.closest('[data-med-dim]'); if (md) { medDim = md.dataset.medDim; renderMedidas(); return; }
      const mo = e.target.closest('[data-med-orden]'); if (mo) { medOrden = mo.dataset.medOrden; renderMedidas(); return; }
      if (e.target.closest('[data-med-rapidas]')) { medRapidas = !medRapidas; renderMedidas(); return; }
      if (e.target.closest('[data-med-ocultar]')) { medOcultar = !medOcultar; renderMedidas(); return; }
      const mc = e.target.closest('[data-medida]'); if (mc && !e.target.closest('a, button')) { abrirModalMed(mc.dataset.medida); return; }
      const re = e.target.closest('[data-rub-editar]'); if (re) { e.stopPropagation(); abrirModalRub(re.dataset.rubEditar); return; }
      const ra = e.target.closest('[data-rub-add]'); if (ra) { const cont = ra.dataset.rubAdd === 'crit' ? $('rub-crits') : $('rub-pregs'); cont.insertAdjacentHTML('beforeend', ra.dataset.rubAdd === 'crit' ? $('modal-rub').dataset.plantillaCrit : $('modal-rub').dataset.plantillaPreg); sumaRub(); return; }
      const rq = e.target.closest('[data-rub-quitar]'); if (rq) { rq.closest('.rub-fila').remove(); sumaRub(); return; }
      const rb = e.target.closest('[data-rub]'); if (rb) { abrirModalRub(rb.dataset.rub); return; }
      const kf2 = e.target.closest('[data-kb-filtro]'); if (kf2) { kbFiltro = kf2.dataset.kbFiltro; renderKnowledge(); return; }
      const ks = e.target.closest('[data-kb-sec]'); if (ks) { kbSec = ks.dataset.kbSec; pintarModalKB(); return; }
      const ka = e.target.closest('[data-kb-acc]'); if (ka) { accionKB(ka.dataset.kbAcc); return; }
      const kb = e.target.closest('[data-kb]'); if (kb) { abrirModalKB(kb.dataset.kb); return; }
      const cm = e.target.closest('[data-cmp-marco]'); if (cm) { cmpFiltro = cmpFiltro === cm.dataset.cmpMarco ? '' : cm.dataset.cmpMarco; renderCumplimiento(); return; }
      const ca = e.target.closest('[data-cmp-ambar]'); if (ca) { cmpSoloAmbar = !cmpSoloAmbar; renderCumplimiento(); return; }
      const cf = e.target.closest('[data-cmp-ficha]'); if (cf) { const k = cmpItems.findIndex((x) => x.gob.trazabilidad.traza_id === cf.dataset.cmpFicha); if (k >= 0) { cerrarTodos(); abrirModalCmp(k); } return; }
      const ci = e.target.closest('[data-cmp-item]'); if (ci) { abrirModalCmp(Number(ci.dataset.cmpItem)); return; }
      const ct = e.target.closest('[data-cmp-traza]'); if (ct) { e.preventDefault(); const t = G.trazas.find((x) => x.id === ct.dataset.cmpTraza); if (t) { goto('trazas'); selectTraza(t.id); } else { const k = cmpItems.findIndex((x) => x.gob.trazabilidad.traza_id === ct.dataset.cmpTraza); if (k >= 0) abrirModalCmp(k); } return; }
      if (e.target.closest('#btn-cmp-export')) { exportarCumplimiento(); return; }
      if (e.target.closest('#btn-cmp-alterar')) { cmpAlterada = cmpAlterada === null ? Math.min(4, cmpItems.length - 1) : null; renderCumplimiento(); return; }
      const tz = e.target.closest('[data-traza]'); if (tz) { cerrarTodos(); goto('trazas'); selectTraza(tz.dataset.traza); return; }
      const gf = e.target.closest('#policies tr[data-gr]'); if (gf) { abrirModalGr(gf.dataset.gr); return; }
      const ag = e.target.closest('.agent[data-agente]'); if (ag) { verAgente(ag.dataset.agente); return; }
      const kf = e.target.closest('[data-kpi-fin]'); if (kf) { abrirModalKpiFin(kf.dataset.kpiFin); return; }
      const ult = e.target.closest('#ultimas tr[data-id], #hitl-cola tr[data-id]'); if (ult) { abrirModalTraza(ult.dataset.id); return; }
      const row = e.target.closest('#t-trazas tr[data-id], #r-trazas tr[data-id]'); if (row) { selectTraza(row.dataset.id); return; }
      const chip = e.target.closest('#hist-chips .chip'); if (chip) { filtroTipo = chip.dataset.t; renderHistorico(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches) return;
      if (e.target.matches('.agent[data-agente]')) verAgente(e.target.dataset.agente);
      else if (e.target.matches('.fa-fila[data-ver-agente]')) verAgente(e.target.dataset.verAgente);
      else if (e.target.matches('[data-kpi-fin]')) abrirModalKpiFin(e.target.dataset.kpiFin);
      else if (e.target.matches('#caps tr[data-cap]')) abrirModalCap(e.target.dataset.cap);
      else if (e.target.matches('#policies tr[data-gr]')) abrirModalGr(e.target.dataset.gr);
      else if (e.target.matches('#cambios tr[data-cambio]')) abrirModalCambio(Number(e.target.dataset.cambio));
      else if (e.target.matches('tr[data-fr-caso]')) abrirModalFraude(e.target.dataset.frCaso);
      else if (e.target.matches('[data-fr-ind]')) e.target.click();
      else if (e.target.matches('#fr-cat tr[data-fr-fila], .fr-ind[data-fr-indicador]')) abrirModalFrInd(e.target.dataset.frFila || e.target.dataset.frIndicador);
      else if (e.target.matches('tr[data-fr-gr]')) abrirModalGr(e.target.dataset.frGr);
    });
    // Formularios de «Nuevo cap» y «Nuevo guardrail»
    document.addEventListener('submit', (e) => { e.preventDefault(); if (e.target.id === 'form-cap') guardarCapNuevo(); else if (e.target.id === 'form-gr') guardarGrNuevo(); else if (e.target.id === 'form-fr') guardarFrNuevo(); });
    document.addEventListener('input', (e) => {
      if (e.target.matches('[data-ahorro]')) { const k = e.target.dataset.ahorro, v = Number(e.target.value); if (!(v >= Number(e.target.min) && v <= Number(e.target.max))) return; ahorroEdit = { ...ahorroEdit, [k]: k === 'ahorro_escalados' ? v / 100 : v }; ahorroCambia(false); return; }
      if (e.target.closest('#form-cap')) actualizarPreviewCap();
      else if (e.target.closest('#form-gr')) actualizarPreviewGr();
      else if (e.target.closest('#form-fr')) actualizarPreviewFr();
    });
    document.addEventListener('change', (e) => {
      if (e.target.matches('.fr-peso')) { const id = e.target.dataset.frPeso; const v = Math.max(0, Math.min(60, Math.round(Number(e.target.value) || 0))); frCfg[id] = { ...(frCfg[id] || {}), peso: v }; guardarFrCfg(); return; }
      if (e.target.matches('#nc-ambito, #nc-tipo')) { sugerirLimiteCap(); actualizarPreviewCap(); }
      else if (e.target.matches('#ng-plantilla')) ajustarPlantillaGr(true);
      else if (e.target.closest('#form-gr')) actualizarPreviewGr();
      else if (e.target.closest('#form-fr')) actualizarPreviewFr();
    });
    $('btn-new-cap').addEventListener('click', abrirModalCapNuevo);
    $('btn-new-policy').addEventListener('click', abrirModalGrNuevo);
    document.querySelectorAll('dialog.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
    $('btn-back').innerHTML = I18N.t('gob.volver_al_triaje', { left: ic('arrow-left') });
    $('btn-json').innerHTML = `${ic('upload')} Cargar JSON`;
    $('btn-json').addEventListener('click', () => $('file-json').click());
    $('file-json').addEventListener('change', () => { const f = $('file-json').files[0]; if (f) cargarArchivo(f); $('file-json').value = ''; });
    $('fuente').addEventListener('change', () => setFuente($('fuente').value));
    $('periodo').addEventListener('change', () => { periodoDias = Number($('periodo').value); renderResumen(); renderFinops(); });
    const H = { 'h-fin-agentes': ['activity', I18N.t('gob.como_va_el_gasto')], 'h-fin-porque': ['coins', I18N.t('gob.donde_se_va_el')], 'h-agentes': ['cpu', I18N.t('gob.agentes')], 'h-coste': ['euro', I18N.t('gob.coste_diario_frente_al')], 'h-alertas': ['bell', I18N.t('gob.alertas_activas')], 'h-reasoning': ['brain', I18N.t('gob.razonamiento_registrado')], 'h-replay': ['repeat', I18N.t('gob.replay')], 'h-replays': ['history', I18N.t('gob.replays_anteriores')], 'h-niveles': ['sliders-horizontal', I18N.t('gob.niveles_de_autonomia')], 'h-correctivas': ['bell', I18N.t('gob.alertas_de_coste')], 'h-guardrails': ['shield-check', I18N.t('gob.guardrails')], 'h-cambios': ['history', I18N.t('gob.cambios_de_nivel_auditoria')], 'h-caps': ['scale', I18N.t('gob.caps_configurados')], 'h-coste-ag': ['euro', I18N.t('gob.coste_diario_por_agente')], 'h-tokens': ['cpu', I18N.t('gob.tokens_por_agente')], 'h-modelos': ['database', I18N.t('gob.modelos')], 'h-reco': ['lightbulb', I18N.t('gob.recomendaciones_de_ahorro')], 'h-hist': ['history', I18N.t('gob.historico_de_gobierno')], 'h-med': ['wrench', I18N.t('gob.medidas_correctivas')] };
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
    $('btn-hitl-trazas').addEventListener('click', () => { $('t-res').value = 'persona'; listaTrazas('t'); goto('trazas'); });
    ['t', 'r'].forEach((pre) => ['agente', 'canal', 'dec', 'res'].forEach((k) => $(`${pre}-${k}`).addEventListener('change', () => listaTrazas(pre))));
    // Tooltip de gráficos, waterfall y referencias a guardrails
    const tip = $('tip');
    document.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { tip.style.display = 'none'; return; }
      tip.textContent = el.dataset.tip; tip.style.display = 'block';
      const w = tip.offsetWidth; tip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - w - 8)}px`; tip.style.top = `${e.clientY - 28 - (tip.offsetHeight > 30 ? tip.offsetHeight - 22 : 0)}px`;
    });
    ['t-agente', 'r-agente'].forEach((id) => $(id).querySelectorAll('option[value]:not([value=""])').forEach((o) => { o.textContent = I18N.t('gob.agente_de_3', { textContent: o.textContent }); }));
    medirFijos();
    window.addEventListener('resize', () => { medirFijos(); ajustarAgentes(); });
    initResizer();
  }

  bind();
  renderAll();
})();
