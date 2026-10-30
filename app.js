/* Triage de mensajes — app autosuficiente (HTML + JS), estado solo de sesión.
 * Flujo: elegir paquete → por cada mensaje: clasificar ramo + extraer datos +
 * aplicar reglas (IA o motor local) → registrar decisión → contadores.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constantes
  // ---------------------------------------------------------------------------
  const SS = {
    cfg: 'triage.cfg',
    prompts: 'triage.prompts',
    paquete: 'triage.paquete',
    estrategia: 'triage.estrategia',
    seudonimizar: 'triage.seudonimizar',
    motor: 'triage.motor',
    log: 'triage.log',
  };
  const DECISION = { CLEARED: 'DESPEJADO', REVIEW: 'REVISION' };
  const RAMOS = ['Auto', 'Hogar', 'Salud'];

  // Reintentos para errores transitorios: base 2s, tope 32s, máx 5
  const RETRY = { base: 2000, cap: 32000, max: 5, transient: [408, 429, 500, 502, 503, 504] };
  const REQUEST_TIMEOUT_MS = 45000;
  const NETWORK_RETRIES = 2; // «Failed to fetch» suele ser CORS o URL errónea: no insistir 5 veces
  const MAX_OUTPUT_TOKENS = 2500; // el JSON de salida es largo y los modelos de razonamiento gastan tokens pensando

  // Latencia simulada del motor local (consulta de póliza / integración)
  const LOCAL_LATENCY_MS = [80, 250];
  // Cadencia de la reproducción de resultados guardados o de archivo
  const REPLAY_LATENCY_MS = [3000, 5000];

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const rnd = (min, max) => Math.random() * (max - min) + min;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isoDate = (d) => d.toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const fmtEur = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString(I18N.locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }));
  const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ssGet = (k, fallback) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  // Iconos de canal: mismos iconos Lucide que la ficha de fase «Multicanalidad» (icons.js)
  const CANAL_LUCIDE = { email: 'mail', web: 'globe', chat: 'messages-square', telefono: 'phone', whatsapp: 'message-circle' };
  const CANAL_LABEL = { email: I18N.t('triaje.email'), web: I18N.t('triaje.formulario_web'), chat: I18N.t('triaje.chat'), telefono: I18N.t('triaje.telefono'), whatsapp: I18N.t('triaje.whatsapp') };
  // Origen de la decisión: el valor guardado es interno (lo leen /^IA/ y /^reglas locales/, y va en el JSON exportado)
  // y solo se traduce al mostrarlo. «… (archivo)» se añade al reproducir un JSON exportado.
  const ORIGEN_CLAVE = { 'IA': 'triaje.origen.ia', 'IA (guardado)': 'triaje.origen.ia_guardado', 'reglas locales': 'triaje.origen.reglas_locales', 'reglas locales (sin ficha guardada)': 'triaje.origen.sin_ficha' };
  function origenTexto(o) {
    const s = String(o || '');
    const archivo = s.match(/^(.*) \(archivo\)$/);
    if (archivo) return I18N.t('triaje.origen.archivo', { origen: origenTexto(archivo[1]) });
    const fallback = s.match(/^reglas locales \(fallback IA: (.*)\)$/);
    if (fallback) return I18N.t('triaje.origen.fallback', { error: fallback[1] });
    return ORIGEN_CLAVE[s] ? I18N.t(ORIGEN_CLAVE[s]) : s;
  }
  const canalIcon = (canal) => `<span class="canal-icon canal-${escapeHtml(canal)}" title="${escapeHtml(CANAL_LABEL[canal] || canal)}" aria-label="${escapeHtml(CANAL_LABEL[canal] || canal)}">${lucide(CANAL_LUCIDE[canal] || 'messages-square')}</span>`;

  // ---------------------------------------------------------------------------
  // Estado (solo sesión)
  // ---------------------------------------------------------------------------
  const state = {
    paqueteId: ssGet(SS.paquete, PAQUETES[0].id),
    seudonimizar: ssGet(SS.seudonimizar, true), // datos personales como marcadores antes de llamar al modelo (RGPD art. 5.1.c)
    estrategia: ssGet(SS.estrategia, '1paso'), // '1paso' (todas las reglas, por defecto) | '2pasos' (ramo → reglas del ramo)
    motor: ssGet(SS.motor, 'auto'), // 'auto' | 'guardado' | 'archivo'
    archivo: null, // { nombre, entradas: [...] } cargado con «Reproducir desde archivo» (solo memoria)
    prompts: Object.fromEntries(Object.entries(PROMPT_BLOQUES).map(([k, v]) => [k, v.texto])),
    log: ssGet(SS.log, []),
    running: false,
    paused: false,
    cancelled: false,
    sort: { key: 'timestamp', dir: 'desc' },
  };
  Object.assign(state.prompts, ssGet(SS.prompts, {}));

  const paqueteActual = () => PAQUETES.find((p) => p.id === state.paqueteId) || PAQUETES[0];

  // ---------------------------------------------------------------------------
  // Motor local (modo degradado sin IA): motor-local.js, con las expresiones del idioma de la página
  const localTriage = (msg) => MotorLocal.triage(msg, { fmtEur });

  // ---------------------------------------------------------------------------
  // Cliente Azure AI Foundry (chat/completions y Responses API)
  // ---------------------------------------------------------------------------
  const DEFAULT_API_VERSION = { deployments: '2024-10-21', models: '2024-05-01-preview' };
  class PermanentError extends Error {}

  function routeFromUrl(raw) {
    if (/\/openai\/v1\/responses/i.test(raw)) return 'responses';
    if (/\/openai\/v1\/chat\/completions/i.test(raw)) return 'v1';
    if (/\/models\/chat\/completions/i.test(raw)) return 'models';
    if (/\/openai\/deployments\//i.test(raw)) return 'deployments';
    return null;
  }

  function buildEndpointUrl(cfg) {
    const raw = cfg.endpoint.trim().replace(/\/+$/, '');
    let origin;
    try { origin = new URL(raw).origin; } catch { throw new PermanentError(I18N.t('triaje.endpoint_no_valido', { raw })); }
    const route = cfg.route || 'v1';
    if (routeFromUrl(raw) === route && /\?api-version=|\/openai\/v1\//i.test(raw)) return raw;
    if (route === 'responses') return `${origin}/openai/v1/responses`;
    if (route === 'v1') return `${origin}/openai/v1/chat/completions`;
    const version = encodeURIComponent(cfg.apiVersion || DEFAULT_API_VERSION[route]);
    if (route === 'models') return `${origin}/models/chat/completions?api-version=${version}`;
    return `${origin}/openai/deployments/${encodeURIComponent(cfg.deployment)}/chat/completions?api-version=${version}`;
  }

  // Compatibilidad de parámetros: los modelos de razonamiento rechazan temperature y max_tokens.
  const paramCompat = { drop: new Set(), useMaxTokens: false };
  const isReasoningModel = (name) => /^(gpt-5|o[1-9])/i.test(String(name || '').trim());

  function buildBody(cfg, messages, { jsonMode, maxTokens }) {
    const reasoning = isReasoningModel(cfg.deployment);
    if (jsonMode && !messages.some((m) => m.role === 'user' && /json/i.test(m.content))) {
      messages = messages.map((m, i, arr) => (i === arr.length - 1 && m.role === 'user' ? { ...m, content: I18N.t('triaje.responde_unicamente_con_un', { content: m.content }) } : m));
    }
    let body;
    if (cfg.route === 'responses') {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      body = { model: cfg.deployment, input: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })), max_output_tokens: maxTokens };
      if (system) body.instructions = system;
      if (reasoning) body.reasoning = { effort: 'low' }; else body.temperature = 0;
      if (jsonMode) body.text = { format: { type: 'json_object' } };
    } else {
      body = { model: cfg.deployment, messages };
      if (paramCompat.useMaxTokens) body.max_tokens = maxTokens; else body.max_completion_tokens = maxTokens;
      if (reasoning) body.reasoning_effort = 'low'; else body.temperature = 0;
      if (jsonMode) body.response_format = { type: 'json_object' };
    }
    paramCompat.drop.forEach((p) => delete body[p]);
    return body;
  }

  function extractContent(cfg, data) {
    if (cfg.route === 'responses') {
      const text = (data.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('');
      const u = data.usage || {};
      return { text, truncated: data.status === 'incomplete' && data.incomplete_details?.reason === 'max_output_tokens', usage: { input: u.input_tokens, output: u.output_tokens, reasoning: u.output_tokens_details?.reasoning_tokens } };
    }
    const choice = data.choices?.[0];
    const u = data.usage || {};
    return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length', usage: { input: u.prompt_tokens, output: u.completion_tokens, reasoning: u.completion_tokens_details?.reasoning_tokens } };
  }

  function adaptParams(errorText) {
    const msg = String(errorText);
    if (/max_completion_tokens/i.test(msg) && /unsupported|not supported|unrecognized|unknown/i.test(msg) && !paramCompat.useMaxTokens) { paramCompat.useMaxTokens = true; return true; }
    if (/use 'max_completion_tokens'/i.test(msg) && paramCompat.useMaxTokens) { paramCompat.useMaxTokens = false; return true; }
    const m = msg.match(/Unsupported (?:parameter|value): '([a-z_]+)'/i) || msg.match(/'([a-z_]+)' (?:is not supported|does not support)/i);
    if (m && !paramCompat.drop.has(m[1])) { paramCompat.drop.add(m[1]); return true; }
    return false;
  }

  async function callChat(cfg, messages, { jsonMode = true, maxTokens = MAX_OUTPUT_TOKENS, onProgress = null } = {}) {
    const url = buildEndpointUrl(cfg);
    const started = performance.now();
    const progress = (label) => onProgress && onProgress(`${label} · ${((performance.now() - started) / 1000).toFixed(0)} s`);

    for (let attempt = 0, adaptations = 0; ; attempt++) {
      const body = buildBody(cfg, messages, { jsonMode, maxTokens });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const label = attempt ? `Reintento ${attempt}` : I18N.t('triaje.esperando_respuesta_del_modelo');
      progress(label);
      const ticker = setInterval(() => progress(label), 1000);
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': cfg.apiKey, Authorization: `Bearer ${cfg.apiKey}` },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer); clearInterval(ticker);
        const reason = err.name === 'AbortError' ? I18N.t('triaje.sin_respuesta_en_s', { REQUEST_TIMEOUT_MS: REQUEST_TIMEOUT_MS / 1000 }) : err.message;
        if (attempt >= NETWORK_RETRIES) throw new PermanentError(I18N.t('triaje.red_timeout_tras_intentos', { attempt: attempt + 1, reason, url }));
        progress(I18N.t('triaje.sin_respuesta_reintentando', { reason }));
        await sleep(Math.min(RETRY.cap, RETRY.base * 2 ** attempt) + rnd(0, 500));
        continue;
      }
      clearTimeout(timer); clearInterval(ticker);

      if (res.ok) {
        const data = await res.json();
        const { text, truncated, usage } = extractContent(cfg, data);
        console.info('[triage][llm] tokens', usage);
        if (!text && truncated) throw new Error(I18N.t('triaje.respuesta_vacia_el_modelo'));
        return { text, usage, truncated };
      }
      const text = await res.text().catch(() => '');
      if (res.status === 400 && adaptations < 4 && adaptParams(text)) {
        adaptations++; attempt--; // la adaptación no consume reintento
        console.info('[triage][llm] parámetro adaptado', { drop: [...paramCompat.drop], useMaxTokens: paramCompat.useMaxTokens });
        continue;
      }
      if (RETRY.transient.includes(res.status) && attempt < RETRY.max) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000;
        await sleep(retryAfter || Math.min(RETRY.cap, RETRY.base * 2 ** attempt) + rnd(0, 500));
        continue;
      }
      throw new PermanentError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  }

  // Validación de la respuesta del modelo: campos obligatorios con valores por defecto seguros
  function parseTriage(raw) {
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) return null;
    let obj;
    try { obj = JSON.parse(match[0]); } catch { return null; }
    const decision = String(obj.decision || '').toUpperCase().replace('Ó', 'O');
    if (![DECISION.CLEARED, DECISION.REVIEW].includes(decision)) return null;
    if (typeof obj.motivo !== 'string' || !obj.motivo.trim()) return null;
    const ramoRaw = String(obj.ramo || '').trim();
    const ramo = RAMOS.find((r) => r.toLowerCase() === ramoRaw.toLowerCase()) || 'Indeterminado';
    const confianza = Number(obj.confianza);
    const datos = (obj.datos_extraidos && typeof obj.datos_extraidos === 'object') ? obj.datos_extraidos : {};
    const criterios = Array.isArray(obj.criterios) ? obj.criterios
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        regla: String(c.regla ?? '—'),
        descripcion: String(c.descripcion ?? ''),
        resultado: ['cumple', 'incumple', 'no_aplica'].includes(c.resultado) ? c.resultado : 'no_aplica',
        evidencia: String(c.evidencia ?? ''),
      })) : [];
    return {
      ramo,
      criterios_ramo: Array.isArray(obj.criterios_ramo) ? obj.criterios_ramo.map((c) => String(c)).filter(Boolean) : [],
      datos_extraidos: datos,
      criterios,
      evidencias: Evidencias.validar(obj.evidencias),
      decision,
      motivo: obj.motivo.trim().slice(0, 240),
      confianza: Number.isFinite(confianza) ? Math.max(0, Math.min(1, confianza)) : 0.5,
    };
  }

  function parseRamo(raw) {
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) return null;
    let obj;
    try { obj = JSON.parse(match[0]); } catch { return null; }
    const ramoRaw = String(obj.ramo || '').trim();
    const ramo = RAMOS.find((r) => r.toLowerCase() === ramoRaw.toLowerCase()) || 'Indeterminado';
    return {
      ramo,
      criterios_ramo: Array.isArray(obj.criterios_ramo) ? obj.criterios_ramo.map((c) => String(c)).filter(Boolean) : [],
      confianza: Number.isFinite(Number(obj.confianza)) ? Number(obj.confianza) : null,
    };
  }

  const sumUsage = (a, b) => ({
    input: (a?.input || 0) + (b?.input || 0),
    output: (a?.output || 0) + (b?.output || 0),
    reasoning: (a?.reasoning || 0) + (b?.reasoning || 0),
  });

  // Seudonimiza el mensaje si está activado; devuelve lo que se envía y cómo deshacerlo al volver
  function prepararEnvio(msg) {
    if (!state.seudonimizar) return { envio: msg, mapa: [], seud: false };
    const { mensaje, mapa } = Cumplimiento.seudonimizarMensaje(msg);
    return { envio: mensaje, mapa, seud: true };
  }
  const resumenEnvio = (envio, mapa, extra) => Cumplimiento.resumenSeudonimizacion(
    { asunto: envio.asunto, remitente: `${envio.remitente.nombre} (${envio.remitente.contacto})`, texto: envio.texto }, mapa, extra);

  async function aiTriage(msg, cfg, onProgress) {
    const { envio, mapa, seud } = prepararEnvio(msg);
    const r = await aiTriageEnvio(envio, cfg, onProgress, seud);
    if (!seud) return r;
    // La respuesta llega con marcadores: se reconstruyen los valores reales (la salida cruda se conserva tal cual)
    const { raw, usage, pasos, ...resto } = r;
    return { ...Cumplimiento.rehidratar(resto, mapa), raw, usage, pasos, seudonimizacion: resumenEnvio(envio, mapa) };
  }

  async function aiTriageEnvio(msg, cfg, onProgress, seud) {
    if (state.estrategia === '1paso') {
      const t0 = performance.now();
      const { text, usage } = await callChat(cfg, [
        { role: 'system', content: buildSystemPrompt(state.prompts) },
        { role: 'user', content: buildUserPrompt(msg, null, seud) },
      ], { onProgress });
      const duracion_ms = Math.round(performance.now() - t0);
      const parsed = parseTriage(text);
      if (!parsed) throw new Error(I18N.t('triaje.respuesta_del_modelo_no'));
      return { ...parsed, raw: text, usage, pasos: [{ nombre: I18N.t('triaje.triaje_todas_las_reglas'), usage, duracion_ms }] };
    }

    // Paso 1: clasificar el ramo con un prompt corto
    const t1 = performance.now();
    const p1 = await callChat(cfg, [
      { role: 'system', content: state.prompts.ramo },
      { role: 'user', content: buildUserPrompt(msg, null, seud) },
    ], { maxTokens: 800, onProgress: (p) => onProgress && onProgress(`paso 1/2 ramo · ${p}`) });
    const ms1 = Math.round(performance.now() - t1);
    const ramoInfo = parseRamo(p1.text);
    if (!ramoInfo) throw new Error(I18N.t('triaje.respuesta_de_clasificacion_de'));

    // Paso 2: extracción + reglas solo del ramo clasificado (todas si es Indeterminado)
    const ramoPrevio = ramoInfo.ramo === 'Indeterminado' ? null : ramoInfo.ramo;
    const t2 = performance.now();
    const p2 = await callChat(cfg, [
      { role: 'system', content: buildSystemPrompt(state.prompts, ramoPrevio) },
      { role: 'user', content: buildUserPrompt(msg, ramoPrevio, seud) },
    ], { onProgress: (p) => onProgress && onProgress(`paso 2/2 reglas ${ramoInfo.ramo} · ${p}`) });
    const ms2 = Math.round(performance.now() - t2);
    const parsed = parseTriage(p2.text);
    if (!parsed) throw new Error(I18N.t('triaje.respuesta_del_modelo_no'));

    const discrepancia = parsed.ramo !== ramoInfo.ramo ? I18N.t('triaje.paso_2_propone_frente', { ramo: I18N.etiqueta('ramo', parsed.ramo), ramo2: I18N.etiqueta('ramo', ramoInfo.ramo) }) : null;
    return {
      ...parsed,
      ramo: ramoInfo.ramo,
      criterios_ramo: [...ramoInfo.criterios_ramo, ...(discrepancia ? [`⚠ ${discrepancia}`] : []), ...parsed.criterios_ramo.filter((c) => !ramoInfo.criterios_ramo.includes(c))],
      decision: discrepancia ? DECISION.REVIEW : parsed.decision,
      motivo: discrepancia ? `${discrepancia}. ${parsed.motivo}` : parsed.motivo,
      raw: I18N.t('triaje.paso_1_clasificacion_de', { text: p1.text, text2: p2.text }),
      usage: sumUsage(p1.usage, p2.usage),
      pasos: [{ nombre: I18N.t('triaje.paso_1_ramo'), usage: p1.usage, duracion_ms: ms1 }, { nombre: I18N.t('triaje.paso_2_reglas'), usage: p2.usage, duracion_ms: ms2 }],
    };
  }

  // ---------------------------------------------------------------------------
  // Configuración IA (sessionStorage)
  // ---------------------------------------------------------------------------
  function readConfigFromForm() {
    return {
      endpoint: $('cfg-endpoint').value.trim(),
      deployment: $('cfg-deployment').value.trim(),
      route: $('cfg-route').value,
      apiVersion: $('cfg-api-version').value.trim(),
      apiKey: $('cfg-api-key').value.trim(),
    };
  }
  function saveConfig(cfg) { ssSet(SS.cfg, cfg); }
  function loadConfig() {
    const c = ssGet(SS.cfg, {});
    $('cfg-endpoint').value = c.endpoint || '';
    $('cfg-deployment').value = c.deployment || '';
    if (c.route) $('cfg-route').value = c.route;
    $('cfg-api-version').value = c.apiVersion || '';
    $('cfg-api-key').value = c.apiKey || '';
  }
  const aiEnabled = (cfg) => Boolean(cfg.endpoint && cfg.apiKey && (cfg.deployment || /chat\/completions|\/responses/i.test(cfg.endpoint)));

  function updateModeBadge() {
    const cfg = readConfigFromForm();
    const on = aiEnabled(cfg);
    if (state.motor === 'guardado') $('mode-badge').textContent = I18N.t('triaje.motor_resultados_guardados');
    else if (state.motor === 'archivo') $('mode-badge').textContent = `Motor: archivo (${state.archivo?.nombre || '—'})`;
    else $('mode-badge').textContent = on ? `Motor: IA (${cfg.deployment || 'endpoint'})` : I18N.t('triaje.motor_reglas_locales_sin');
    $('ai-dot').className = `dot ${on ? 'dot-on' : 'dot-off'}`;
    $('ai-dot').title = on ? I18N.t('triaje.ia_configurada') : I18N.t('triaje.ia_sin_configurar');
  }

  // ---------------------------------------------------------------------------
  // Barra lateral: paquete y prompts
  // ---------------------------------------------------------------------------
  function renderPaquete() {
    const sel = $('sel-paquete');
    sel.replaceChildren(...PAQUETES.map((p) => Object.assign(document.createElement('option'), { value: p.id, textContent: `${p.nombre} — ${p.mensajes.length} mensajes` })));
    sel.value = state.paqueteId;
    const p = paqueteActual();
    $('paquete-desc').textContent = p.descripcion;
    $('paquete-lista').replaceChildren(...p.mensajes.map((m) => {
      const li = document.createElement('li');
      li.innerHTML = `${canalIcon(m.canal)} <span class="msg-id">${escapeHtml(m.id)}</span> <span class="msg-canal">${escapeHtml(CANAL_LABEL[m.canal] || m.canal)}</span><br><span class="msg-asunto">${escapeHtml(m.asunto)}</span>`;
      li.title = m.texto;
      return li;
    }));
    $('btn-run').innerHTML = state.motor === 'archivo' && state.archivo
      ? `${lucide('play')} Reproducir archivo (${state.archivo.entradas.length})`
      : `${lucide('play')} Procesar ${escapeHtml(p.nombre)} (${p.mensajes.length})`;
    $('sel-estrategia').value = state.estrategia;
    $('chk-seud').checked = state.seudonimizar;
    syncEstrategiaUI();
    syncMotorUI();
  }

  function syncMotorUI() {
    const p = paqueteActual();
    const guardados = p.mensajes.filter((m) => RESULTADOS_GUARDADOS[m.id]).length;
    const sel = $('sel-motor');
    sel.querySelector('[value="guardado"]').disabled = guardados === 0;
    sel.querySelector('[value="guardado"]').textContent = I18N.t('triaje.resultados_guardados_reproduccion_fichas', { guardados, mensajes: p.mensajes.length });
    const opArchivo = sel.querySelector('[value="archivo"]');
    opArchivo.disabled = !state.archivo;
    opArchivo.textContent = state.archivo ? I18N.t('triaje.archivo_cargado_fichas_35', { nombre: state.archivo.nombre, entradas: state.archivo.entradas.length }) : I18N.t('triaje.archivo_cargado_reproduccion_carga');
    if ((state.motor === 'guardado' && guardados === 0) || (state.motor === 'archivo' && !state.archivo)) state.motor = 'auto';
    sel.value = state.motor;
    $('motor-hint').textContent = {
      auto: I18N.t('triaje.llama_a_la_ia'),
      guardado: I18N.t('triaje.reproduce_fichas_generadas_con'),
      archivo: I18N.t('triaje.reproduce_las_fichas_del'),
    }[state.motor];
    updateModeBadge();
  }

  // La sección del prompt de clasificación (paso 1) solo aplica en modo 2 pasos
  function syncEstrategiaUI() {
    const sec = document.querySelector('#prompt-sections details[data-bloque="ramo"]');
    if (sec) sec.hidden = state.estrategia !== '2pasos';
  }

  // Icono Lucide por bloque de prompt: clasificación de ramo y una regla por ramo (mismos iconos que en la ficha de fases)
  const BLOQUE_ICON = { ramo: 'tags', base: 'scan-text', auto: 'car', hogar: 'house', salud: 'heart-pulse' };

  // Conecta un <textarea> de bloque de prompt con su contador de caracteres, la marca de «editado» y el botón de restaurar
  function bindPromptField(root, key, def) {
    const ta = root.querySelector('textarea');
    ta.value = state.prompts[key];
    const count = root.querySelector(`[data-count="${key}"]`);
    const flag = root.querySelector('.edited-flag');
    const sync = () => { count.textContent = ta.value.length; flag.hidden = ta.value === def.texto; };
    sync();
    ta.addEventListener('input', () => {
      state.prompts[key] = ta.value;
      // Persistir solo los bloques que difieren del original
      const edited = Object.fromEntries(Object.entries(state.prompts).filter(([k, v]) => v !== PROMPT_BLOQUES[k].texto));
      ssSet(SS.prompts, edited);
      sync();
    });
    root.querySelector(`[data-restore="${key}"]`).addEventListener('click', () => { ta.value = def.texto; ta.dispatchEvent(new Event('input')); });
    root.querySelector(`[data-grande="${key}"]`).addEventListener('click', () => abrirEditorPrompt(def, ta));
  }

  // Editor ancho de un bloque de prompt: el menú lateral es estrecho, así que se edita aquí y se devuelve al guardar
  function abrirEditorPrompt(def, ta) {
    const dlg = $('modal-prompt'); const area = $('prompt-grande');
    $('modal-prompt-title').textContent = def.titulo;
    area.value = ta.value;
    const cuenta = () => { $('prompt-grande-count').textContent = `${area.value.length} caracteres${area.value === def.texto ? '' : I18N.t('triaje.editado')}`; };
    area.oninput = cuenta; cuenta();
    $('prompt-grande-restaurar').onclick = () => { area.value = def.texto; cuenta(); };
    $('prompt-grande-guardar').onclick = () => { ta.value = area.value; ta.dispatchEvent(new Event('input')); dlg.close(); };
    dlg.showModal(); area.focus();
  }

  function renderPromptSections() {
    const wrap = $('prompt-sections');
    const campos = (key) => `
      <textarea data-prompt="${key}" rows="14" spellcheck="false"></textarea>
      <div class="row between">
        <small class="muted"><span data-count="${key}"></span> ${I18N.t('triaje.caracteres')}</small>
        <span class="row"><button class="btn btn-ghost btn-sm" type="button" data-grande="${key}" title="${I18N.t('triaje.abrir_el_bloque_en')}">${lucide('maximize-2')} ${I18N.t('triaje.editar_en_grande')}</button><button class="btn btn-ghost btn-sm" type="button" data-restore="${key}">${I18N.t('triaje.restaurar')}</button></span>
      </div>`;

    // «Prompt base» va directo, sin colapsable propio: es el bloque principal del prompt
    const base = document.createElement('div');
    base.className = 'prompt-base';
    const baseDef = PROMPT_BLOQUES.base;
    const baseEdited = state.prompts.base !== baseDef.texto;
    base.innerHTML = `
      <h3>${lucide('scan-text', 'lucide-svg section-ico')} ${escapeHtml(baseDef.titulo)} <span class="edited-flag" ${baseEdited ? '' : 'hidden'}>${I18N.t('triaje.editado_2')}</span></h3>
      ${campos('base')}`;
    bindPromptField(base, 'base', baseDef);

    // El resto (clasificación de ramo y una regla por ramo), cada uno colapsable, con la misma jerarquía entre sí
    const resto = Object.entries(PROMPT_BLOQUES).filter(([key]) => key !== 'base').map(([key, def]) => {
      const details = document.createElement('details');
      details.className = 'card section';
      details.dataset.bloque = key;
      const edited = state.prompts[key] !== def.texto;
      details.innerHTML = `
        <summary>${lucide(BLOQUE_ICON[key], 'lucide-svg section-ico')} ${escapeHtml(def.titulo)} <span class="edited-flag" ${edited ? '' : 'hidden'}>${I18N.t('triaje.editado_2')}</span></summary>
        <div class="section-body">${campos(key)}</div>`;
      bindPromptField(details, key, def);
      return details;
    });

    wrap.replaceChildren(base, ...resto);
  }

  // ---------------------------------------------------------------------------
  // Registro y render del panel principal
  // ---------------------------------------------------------------------------
  function persistLog() { ssSet(SS.log, state.log); }

  function renderCounters() {
    const entries = state.log;
    const cleared = entries.filter((e) => e.decision === DECISION.CLEARED).length;
    const review = entries.filter((e) => e.decision === DECISION.REVIEW).length;
    const total = entries.length;
    $('cnt-cleared').textContent = cleared;
    $('cnt-review').textContent = review;
    $('pct-cleared').textContent = total ? I18N.t('triaje.del_lote', { total: Math.round((cleared / total) * 100) }) : '—';
    $('pct-review').textContent = total ? I18N.t('triaje.del_lote', { total: Math.round((review / total) * 100) }) : '—';
    if (total) {
      $('cnt-cycle').textContent = fmtMs(entries.reduce((a, e) => a + e.duracion_ms, 0) / total);
      $('cycle-sub').textContent = I18N.t('triaje.por_mensaje_procesados', { total });
    } else {
      $('cnt-cycle').textContent = '—';
      $('cycle-sub').textContent = I18N.t('triaje.por_mensaje');
    }
    const porRamo = {};
    entries.forEach((e) => { porRamo[e.ramo] = (porRamo[e.ramo] || 0) + 1; });
    $('ramo-chips').replaceChildren(...Object.entries(porRamo).map(([r, n]) => Object.assign(document.createElement('span'), { className: `chip chip-${r.toLowerCase()}`, textContent: `${I18N.etiqueta('ramo', r)} ${n}` })));
  }

  function sortedFilteredLog() {
    const ramo = $('filter-ramo').value;
    const onlyReview = $('filter-review').checked;
    const rows = state.log.filter((e) => (!ramo || e.ramo === ramo) && (!onlyReview || e.decision === DECISION.REVIEW));
    const { key, dir } = state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const va = a[key] ?? '', vb = b[key] ?? '';
      if (typeof va === 'number' || typeof vb === 'number') return ((Number(va) || 0) - (Number(vb) || 0)) * mul;
      return String(va).localeCompare(String(vb), I18N.locale) * mul;
    });
  }

  // Decisión en el registro: la vigente y, si una persona actuó, si validó la revisión o hizo override
  function pillDecision(e) {
    const rev = e.revision && e.revision.a ? e.revision : null;
    const final = rev ? rev.a : e.decision;
    const base = `<span class="pill ${final === DECISION.REVIEW ? 'pill-review' : 'pill-ok'}">${final === DECISION.REVIEW ? I18N.t('triaje.a_revisar') : I18N.t('triaje.aprobado')}</span>`;
    if (!rev) return base;
    return rev.accion === 'override'
      ? `${base} <span class="pill pill-time" title="${I18N.t('triaje.override_de_el_agente', { usuario: escapeHtml(rev.usuario) })}">${lucide('repeat')} ${I18N.t('triaje.override')}</span>`
      : `${base} <span class="pill pill-revisado" title="${I18N.t('triaje.revision_validada_por', { usuario: escapeHtml(rev.usuario) })}">${lucide('circle-check')} ${I18N.t('triaje.validado')}</span>`;
  }

  function renderLog() {
    const rows = sortedFilteredLog();
    $('log-count').textContent = state.log.length ? `(${state.log.length})` : '';
    $('log-empty').hidden = rows.length > 0;
    document.querySelectorAll('#log-table th[data-sort]').forEach((th) => {
      th.classList.toggle('sorted', th.dataset.sort === state.sort.key);
      th.dataset.dir = th.dataset.sort === state.sort.key ? state.sort.dir : '';
    });
    const FRv = fraudeDe();
    $('log-body').replaceChildren(...rows.map((e) => {
      const tr = document.createElement('tr');
      tr.className = e.decision === DECISION.REVIEW ? 'row-review' : 'row-ok';
      tr.dataset.id = e.id;
      tr.tabIndex = 0;
      const ramoMark = e.esperado?.ramo ? (e.esperado.ramo === e.ramo ? `<span class="mark ok" title="${I18N.t('triaje.coincide_con_el_ramo')}">${lucide('check')}</span>` : `<span class="mark ko" title="${I18N.t('triaje.esperado', { ramo: escapeHtml(I18N.etiqueta('ramo', e.esperado.ramo)) })}">${lucide('x')}</span>`) : '';
      tr.innerHTML = [
        `<td><strong>${escapeHtml(e.id)}</strong><br><span class="muted small">${escapeHtml(e.asunto)}</span></td>`,
        `<td><span class="pill pill-ramo-${e.ramo.toLowerCase()}">${escapeHtml(I18N.etiqueta('ramo', e.ramo))}</span> ${ramoMark}</td>`,
        `<td>${fmtEur(e.importe)}</td>`,
        `<td>${pillDecision(e)}${chipFraude(FRv[e.id])}</td>`,
        `<td class="motivo">${escapeHtml(e.motivo)}</td>`,
        `<td>${escapeHtml(origenTexto(e.origen))}</td>`,
        `<td>${Math.round(e.confianza * 100)} %</td>`,
        `<td>${fmtMs(e.duracion_ms)}</td>`,
        `<td>${new Date(e.timestamp).toLocaleTimeString(I18N.locale)}</td>`,
      ].join('');
      return tr;
    }));
  }

  function setProgress(done, total) { $('progress-bar').style.width = `${total ? (done / total) * 100 : 0}%`; }
  function setStatus(id, text, kind = '') { const el = $(id); el.textContent = text; el.className = `status ${kind}`; }

  // ---------------------------------------------------------------------------
  // Ficha del mensaje (panel lateral)
  // ---------------------------------------------------------------------------
  // Las etiquetas son siempre literales de la propia app (o ya vienen escapadas/con iconos
  // Lucide por el llamante), nunca texto de usuario: no se re-escapan aquí.
  function kv(pairs) {
    return pairs.filter(([, v]) => v !== undefined).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }
  function fmtValue(v) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    if (typeof v === 'boolean') return v ? I18N.t('triaje.si') : I18N.t('triaje.no');
    if (Array.isArray(v)) return v.length ? escapeHtml(v.join(', ')) : '<span class="muted">—</span>';
    if (typeof v === 'object') return `<code>${escapeHtml(JSON.stringify(v))}</code>`;
    return escapeHtml(v);
  }
  const DATOS_LABELS = {
    nombre_cliente: I18N.t('triaje.cliente'), numero_poliza: I18N.t('triaje.no_de_poliza'), tipo_siniestro: I18N.t('triaje.tipo_de_siniestro'), fecha_hecho: I18N.t('triaje.fecha_del_hecho'),
    importe_estimado_eur: I18N.t('triaje.importe_estimado'), lugar: I18N.t('triaje.lugar'), terceros_implicados: I18N.t('triaje.terceros_implicados'), lesionados: I18N.t('triaje.lesionados'),
    documentacion_mencionada: I18N.t('triaje.documentacion_mencionada'), observaciones: I18N.t('triaje.observaciones'),
  };
  const RESULT_ICON = { cumple: lucide('check'), incumple: lucide('x'), no_aplica: lucide('minus') };

  // Etiquetas y colores de cada tipo de evidencia
  const REF_LABEL = {
    numero_poliza: I18N.t('triaje.no_de_poliza'), tipo_siniestro: I18N.t('triaje.tipo_de_siniestro'), fecha_hecho: I18N.t('triaje.fecha_del_hecho'), importe_estimado_eur: I18N.t('triaje.importe'), lugar: I18N.t('triaje.lugar'),
    nombre_cliente: I18N.t('triaje.cliente'), documentacion_mencionada: I18N.t('triaje.documentacion'), lesionados: I18N.t('triaje.lesionados'), terceros_implicados: I18N.t('triaje.terceros'), observaciones: I18N.t('triaje.observaciones'), ramo: I18N.t('triaje.ramo'),
  };
  function refInfo(ref, entry) {
    if (String(ref).startsWith('regla:')) {
      const cod = ref.slice(6); const c = (entry.criterios || []).find((x) => x.regla === cod);
      return { clase: c && c.resultado === 'incumple' ? 'ev-incumple' : 'ev-regla', label: `Regla ${cod}${c && c.resultado === 'incumple' ? I18N.t('triaje.incumple') : ''}` };
    }
    return { clase: ref === 'ramo' ? 'ev-ramo' : ref === 'fecha_hecho' ? 'ev-fecha' : 'ev-dato', label: REF_LABEL[ref] || ref };
  }
  const DATOS_ESENCIALES = ['numero_poliza', 'fecha_hecho', 'importe_estimado_eur'];

  // Cronología: pasos reales con su duración (IA) o una sola etapa (motor local, resultados guardados)
  function etapasDe(entry) {
    const ia = /^IA/.test(entry.origen || '');
    const pasos = entry.pasos || [];
    const tok = (u) => (u ? `${u.input ?? '?'}↑ ${u.output ?? '?'}↓${u.reasoning ? ` ${u.reasoning}⟳` : ''} tokens` : '');
    const etapas = [{ nombre: I18N.t('triaje.mensaje_recibido'), det: I18N.t('triaje.normalizado_al_formato_comun', { canal: CANAL_LABEL[entry.mensaje.canal] || entry.mensaje.canal }) }];
    if (ia && pasos.length > 1) pasos.forEach((p) => etapas.push({ nombre: p.nombre, ms: p.duracion_ms, det: tok(p.usage) }));
    else if (ia) etapas.push({ nombre: I18N.t('triaje.clasificacion_extraccion_y_reglas'), ms: pasos[0] && pasos[0].duracion_ms, det: I18N.t('triaje.una_sola_llamada_al', { usage: tok(entry.usage) }).replace(/ · $/, '') });
    else etapas.push({ nombre: I18N.t('triaje.motor_local_de_reglas'), ms: entry.duracion_ms, det: I18N.t('triaje.expresiones_regulares_sin_ia') });
    etapas.push({ nombre: entry.decision === DECISION.REVIEW ? I18N.t('triaje.escalado_a_revision_humana') : I18N.t('triaje.aprobado_automaticamente'), det: entry.motivo, review: entry.decision === DECISION.REVIEW });
    return etapas;
  }

  const modalState = { lista: [], idx: 0, entry: null, tab: 'mensaje', raw: 'gobierno', adj: 0, zoom: 1 };
  const TABS = [['mensaje', 'messages-square', I18N.t('triaje.mensaje')], ['adjuntos', 'paperclip', I18N.t('triaje.adjuntos')], ['datos', 'database', I18N.t('triaje.datos_extraidos')], ['reglas', 'list-checks', I18N.t('triaje.reglas_de_negocio')], ['razonamiento', 'brain', I18N.t('triaje.razonamiento')], ['json', 'braces', I18N.t('triaje.respuesta_cruda')]];
  // La pestaña «Adjuntos» solo existe en los mensajes que traen adjuntos
  const tabsDe = (entry) => TABS.filter(([k]) => k !== 'adjuntos' || ((entry.mensaje || {}).adjuntos || []).length);
  function setTab(nombre) {
    if (!document.querySelector(`#modal-tabs .ficha-tab[data-tab="${nombre}"]`)) nombre = 'mensaje';
    modalState.tab = nombre;
    document.querySelectorAll('#modal-tabs .ficha-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === nombre)));
    document.querySelectorAll('#modal .ficha-panel').forEach((p) => { p.hidden = p.id !== `tab-${nombre}`; });
  }

  // Título de la columna de evidencias: «Evidencias» o el tipo de la evidencia activa (hover o seleccionada)
  const TIPO_EV = { 'ev-ramo': I18N.t('triaje.ramo'), 'ev-dato': I18N.t('triaje.dato_extraido'), 'ev-fecha': I18N.t('triaje.fecha_del_hecho'), 'ev-incumple': I18N.t('triaje.regla_que_incumple'), 'ev-regla': I18N.t('triaje.regla_que_cumple') };
  function tituloEvidencia(n) {
    const h = $('ev-titulo');
    const e = n && (modalState.evs || []).find((x) => String(x.n) === String(n));
    if (!e) { h.textContent = I18N.t('triaje.evidencias'); return; }
    const info = refInfo(e.ref, modalState.entry || {});
    const detalle = info.clase === 'ev-fecha' ? '' : info.clase.startsWith('ev-regla') || info.clase === 'ev-incumple' ? e.ref.slice(6) : info.clase === 'ev-ramo' ? (modalState.entry || {}).ramo || '' : info.label;
    h.innerHTML = `<span class="ev-activa ${info.clase}">${e.n} · ${escapeHtml(TIPO_EV[info.clase])}${detalle ? ` <small>${escapeHtml(detalle)}</small>` : ''}</span>`;
  }

  function pintarEvidencias(entry, m) {
    const ev = Evidencias.construir(m.texto, entry.evidencias, entry);
    modalState.evs = ev.lista;
    const segs = Evidencias.segmentos(m.texto, ev.lista);
    const faltan = DATOS_ESENCIALES.filter((k) => (entry.datos_extraidos || {})[k] == null && !ev.lista.some((e) => e.ref === k));
    const r = ev.resumen;
    const resumen = !r.total && !faltan.length ? I18N.t('triaje.sin_evidencias_para_este')
      : I18N.t('triaje.fragmento_del_mensaje_resaltado', { n: r.resaltadas })
        + (r.pedidas ? I18N.t('triaje.el_modelo_cito_y', { pedidas: r.pedidas, modelo: r.modelo }) : '')
        + (r.respaldo ? I18N.t('triaje.reconstruida_a_partir_de', { n: r.respaldo }) : '');
    const lista = ev.lista.map((e) => {
      const info = refInfo(e.ref, entry);
      const tag = !e.verificada ? I18N.t('triaje.no_localizada')
        : e.origen === 'respaldo' ? I18N.t('triaje.reconstruida')
        : I18N.t('triaje.verificada');
      return `<li class="ev-item ${info.clase}${e.resaltada ? '' : ' ev-sin'}" data-n="${e.n}"><span class="ev-num">${e.n}</span><div><strong>${escapeHtml(info.label)}</strong> <q>${escapeHtml(e.cita)}</q>${e.nota ? `<small>${escapeHtml(e.nota)}</small>` : ''}</div>${tag}</li>`;
    }).join('') + faltan.map((k) => `<li class="ev-item ev-falta"><span class="ev-num">–</span><div><strong>${escapeHtml(REF_LABEL[k])}</strong><small>${I18N.t('triaje.no_consta_en_el')}</small></div></li>`).join('');
    const cont = $('modal-texto'); cont.replaceChildren();
    segs.forEach((sg) => {
      if (!sg.ev) { cont.append(document.createTextNode(sg.t)); return; }
      const info = refInfo(sg.ev.ref, entry);
      const mark = Object.assign(document.createElement('mark'), { className: `ev ${info.clase}`, title: `${info.label}${sg.ev.nota ? `: ${sg.ev.nota}` : ''}` });
      mark.dataset.n = sg.ev.n; mark.append(document.createTextNode(sg.t));
      mark.append(Object.assign(document.createElement('sup'), { textContent: sg.ev.n }));
      cont.append(mark);
    });
    $('modal-evid-resumen').textContent = resumen;
    $('modal-evid').innerHTML = lista;
  }

  // Bloque _gobernanza de una decisión (determinista: se recalcula y se guarda en la propia entrada)
  // Indicadores de fraude (fraude.js, sin IA): se evalúa todo el registro a la vez porque los cruces (cuenta, teléfono,
  // duplicados) necesitan ver el lote. No cambia la decisión del triaje y nunca llega al cliente.
  const fraudeDe = () => (typeof Fraude !== 'undefined' && typeof FRAUDE_DEMO !== 'undefined' ? Fraude.evaluar(state.log, FRAUDE_DEMO) : {});
  function gobDe(entry) {
    const af = typeof Fraude !== 'undefined' ? Fraude.paraGobernanza(fraudeDe()[entry.id]) : null;
    entry.gobernanza = Cumplimiento.gobernanza(entry, { ...(entry.gob_opts || {}), ...(af ? { antifraude: af } : {}) });
    return entry.gobernanza;
  }
  const NIVEL_FR = { siu: ['pill-fr-siu', 'SIU'], vigilancia: ['pill-fr-vig', I18N.t('triaje.vigilancia')] };
  const chipFraude = (v) => {
    if (!v || (v.nivel === 'sin' && v.pago !== 'retenido')) return '';
    const [cls, l] = NIVEL_FR[v.nivel] || ['pill-fr-pago', I18N.t('triaje.pago_retenido')];
    return ` <span class="pill ${cls}" title="${I18N.t('triaje.indicadores_de_fraude_score', { score: v.score })}">${lucide('shield-alert')} ${l}${v.nivel !== 'sin' ? ` · ${v.score}` : ''}</span>`;
  };
  // Bloque «Indicadores de fraude» de la pestaña de reglas: score, indicadores con su cita y qué pasa ahora
  function pintarFraude(entry) {
    const v = fraudeDe()[entry.id]; const box = $('modal-fraude-ind');
    if (!box) return;
    if (!v || !v.indicadores.length) { box.innerHTML = `<h3>${lucide('shield-alert')} ${I18N.t('triaje.indicadores_de_fraude')}</h3><p class="small muted">${I18N.t('triaje.sin_indicios_ningun_indicador')}</p>`; return; }
    const lbl = { siu: I18N.t('triaje.escalado_a_la_siu'), vigilancia: I18N.t('triaje.vigilancia'), sin: I18N.t('triaje.sin_indicios_2') }[v.nivel];
    box.innerHTML = `<h3>${lucide('shield-alert')} ${I18N.t('triaje.indicadores_de_fraude')} <span class="pill ${(NIVEL_FR[v.nivel] || ['pill-fr-pago'])[0]}">${escapeHtml(lbl)} · ${v.score}</span></h3>
      <p class="small muted">${I18N.t('triaje.motor_sin_ia_que')}</p>
      <ul class="criterios">${v.indicadores.map((x) => `<li class="crit ${x.aplicado ? 'crit-incumple' : 'crit-no_aplica'}"><span class="crit-icon" aria-hidden="true">${x.aplicado ? lucide('circle-alert') : lucide('minus')}</span><div><strong>${escapeHtml(x.id)}</strong> ${escapeHtml(x.nombre)} <b>${x.aplicado ? `+${x.aplicado}` : x.contraindicio ? I18N.t('triaje.contraindicio_no_suma') : I18N.t('triaje.inactivo')}</b><br><small>${escapeHtml(x.detalle || '')}${x.citas.length ? I18N.t('triaje.texto', { cita: x.citas.map((c) => `«${escapeHtml(c.cita)}»`).join(' ') }) : ''}</small></div></li>`).join('')}</ul>
      <p class="small" style="margin-top:.5rem"><strong>${I18N.t('triaje.que_pasa_ahora')}</strong> ${I18N.t('triaje.el_detalle_el_escenario', { accion: escapeHtml(v.accion) })}</p>`;
  }

  // Pestaña «Adjuntos»: miniaturas, visor (PDF del navegador o imagen con zoom) y datos extraídos de cada adjunto,
  // contrastados con el texto del mensaje. El parte se genera con pdf-lib al abrirlo (adjuntos.js).
  const ADJ_LABELS = {
    fecha_hecho: I18N.t('triaje.fecha'), hora: I18N.t('triaje.hora'), lugar: I18N.t('triaje.lugar'), heridos: I18N.t('triaje.heridos'), danos_otros_bienes: I18N.t('triaje.danos_a_otros_bienes'), testigos: I18N.t('triaje.testigos'),
    vehiculo_a: I18N.t('triaje.vehiculo_a'), vehiculo_b: I18N.t('triaje.vehiculo_b'), circunstancias_a: I18N.t('triaje.circunstancias_a'), circunstancias_b: I18N.t('triaje.circunstancias_b'), firmado_ambos: I18N.t('triaje.firmado_por_ambos'),
    conductor: I18N.t('triaje.conductor'), dni: 'DNI', vehiculo: I18N.t('triaje.vehiculo'), matricula: I18N.t('triaje.matricula'), aseguradora: I18N.t('triaje.aseguradora'), poliza: I18N.t('triaje.poliza'), punto_choque: I18N.t('triaje.punto_de_choque'), danos: I18N.t('triaje.danos'),
    vista: I18N.t('triaje.vista'), zona_danada: I18N.t('triaje.zona_danada'), danos_visibles: I18N.t('triaje.danos_visibles'), gravedad_aparente: I18N.t('triaje.gravedad_aparente'), matricula_visible: I18N.t('triaje.matricula_visible'),
  };
  const CONTRASTE = { coincide: ['circle-check', 'ok', I18N.t('triaje.coincide')], no_consta: ['circle-help', 'aviso', I18N.t('triaje.no_consta_en_el')], discrepa: ['circle-x', 'ko', I18N.t('triaje.discrepa')] };
  const fmtKb = (b) => (b == null ? '' : I18N.t('triaje.kb', { maximumFractionDigits: (b / 1024).toLocaleString(I18N.locale, { maximumFractionDigits: 1 }) }));
  function valorAdjunto(k, v) {
    if (/^circunstancias_/.test(k)) {
      const C = typeof Adjuntos !== 'undefined' ? Adjuntos.CIRCUNSTANCIAS : [];
      return v && v.length ? v.map((n) => `${n} · ${escapeHtml(C[n - 1] || '')}`).join('<br>') : I18N.t('triaje.ninguna');
    }
    if (k === 'fecha_hecho' && v) return escapeHtml(new Date(`${v}T12:00:00`).toLocaleDateString(I18N.locale));
    return fmtValue(v);
  }
  function datosAdjuntoHtml(datos) {
    const planos = Object.entries(datos).filter(([, v]) => !v || typeof v !== 'object' || Array.isArray(v));
    const grupos = Object.entries(datos).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    return `<dl class="kv">${kv(planos.map(([k, v]) => [ADJ_LABELS[k] || k, valorAdjunto(k, v)]))}</dl>`
      + grupos.map(([k, g]) => `<h4>${escapeHtml(ADJ_LABELS[k] || k)}</h4><dl class="kv">${kv(Object.entries(g).map(([kk, v]) => [ADJ_LABELS[kk] || kk, valorAdjunto(kk, v)]))}</dl>`).join('');
  }
  function pintarAdjuntos(entry) {
    const lista = (entry.mensaje || {}).adjuntos || [];
    if (!lista.length) return;
    const m = entry.mensaje;
    const idx = Math.min(modalState.adj, lista.length - 1);
    const a = lista[idx];
    const huella = (entry.adjuntos_recibidos || []).find((h) => h.id === a.id) || {};
    $('adj-lista').innerHTML = lista.map((x, i) => {
      const h = (entry.adjuntos_recibidos || []).find((y) => y.id === x.id) || {};
      const mini = x.mime === 'application/pdf' ? `<span class="adj-mini pdf">${lucide('file-text')}<b>${I18N.t('triaje.pdf')}</b></span>` : `<img class="adj-mini" src="${escapeHtml(x.src)}" alt="" loading="lazy">`;
      return `<li><button type="button" class="adj-item" data-adj="${i}" aria-pressed="${i === idx}">${mini}<span><strong>${escapeHtml(x.titulo)}</strong><small>${escapeHtml(x.archivo)}${h.bytes ? ` · ${fmtKb(h.bytes)}` : ''}</small></span></button></li>`;
    }).join('');
    const esImg = a.mime.startsWith('image/');
    $('adj-barra').innerHTML = `<span class="adj-nombre">${lucide(esImg ? 'image' : 'file-text')} ${escapeHtml(a.archivo)}</span>
      <span class="row">
        ${esImg ? `<button class="btn btn-ghost btn-icon" type="button" data-zoom="-1" aria-label="${I18N.t('triaje.alejar')}" title="${I18N.t('triaje.alejar')}">${lucide('zoom-out')}</button><span class="adj-zoom" aria-live="polite">${Math.round(modalState.zoom * 100)} %</span><button class="btn btn-ghost btn-icon" type="button" data-zoom="1" aria-label="${I18N.t('triaje.acercar')}" title="${I18N.t('triaje.acercar')}">${lucide('zoom-in')}</button><button class="btn btn-sm btn-ghost" type="button" data-zoom="0">${I18N.t('triaje.ajustar')}</button>` : ''}
        <a class="btn btn-sm btn-ghost" id="adj-abrir" target="_blank" rel="noopener" aria-disabled="true">${lucide('external-link')} ${I18N.t('triaje.abrir')}</a>
        <a class="btn btn-sm btn-ghost" id="adj-bajar" download="${escapeHtml(a.archivo)}" aria-disabled="true">${lucide('download')} ${I18N.t('triaje.descargar')}</a>
      </span>`;
    const visor = $('adj-visor');
    // Clave del adjunto visible: un PDF que termina de generarse tarde no pisa lo que se ha elegido después
    const clave = `${entry.id}/${a.id}`; modalState.adjClave = clave;
    visor.classList.toggle('es-img', esImg);
    if (esImg) {
      visor.innerHTML = `<img src="${escapeHtml(a.src)}" alt="${escapeHtml(a.titulo)}" draggable="false" style="width:${modalState.zoom * 100}%">`;
      visor.classList.toggle('ampliada', modalState.zoom > 1);
      ['adj-abrir', 'adj-bajar'].forEach((id) => { $(id).href = a.src; $(id).removeAttribute('aria-disabled'); });
    } else {
      visor.innerHTML = `<p class="muted center adj-cargando">${lucide('file-text')} ${I18N.t('triaje.abriendo_el_pdf')}</p>`;
      Adjuntos.url(a, m).then((u) => {
        if (modalState.adjClave !== clave) return;
        visor.innerHTML = `<iframe src="${u}#view=FitH&navpanes=0" title="${escapeHtml(a.titulo)}"></iframe>`;
        ['adj-abrir', 'adj-bajar'].forEach((id) => { $(id).href = u; $(id).removeAttribute('aria-disabled'); });
      }).catch((e) => { if (modalState.adjClave === clave) visor.innerHTML = `<p class="muted center">${I18N.t('triaje.no_se_pudo_generar', { message: escapeHtml(e.message) })}</p>`; });
    }

    // Panel lateral: lo que extrajo el modelo de este adjunto y su contraste con el mensaje
    const ext = (entry.adjuntos || []).find((x) => x.id === a.id);
    const pie = huella.sha256 ? `<p class="small muted adj-huella" title="${I18N.t('triaje.sha256', { sha256: escapeHtml(huella.sha256) })}">${lucide('fingerprint')} ${I18N.t('triaje.sha256_2', { sha256: escapeHtml(huella.sha256.slice(0, 16)), bytes: fmtKb(huella.bytes) })}</p>` : '';
    if (!ext) {
      $('adj-datos').innerHTML = `<h3>${I18N.t('triaje.datos_extraidos')}</h3><p class="small muted">${/^IA/.test(entry.origen || '') ? I18N.t('triaje.el_modelo_no_devolvio') : I18N.t('triaje.sin_datos_extraidos_el')}</p>${pie}`;
      return;
    }
    const n = { coincide: 0, no_consta: 0, discrepa: 0 }; (ext.contraste || []).forEach((c) => { n[c.resultado] = (n[c.resultado] || 0) + 1; });
    $('adj-datos').innerHTML = `<h3>${I18N.t('triaje.datos_extraidos')}</h3>
      ${entry.adjuntos_origen === 'guardado' ? `<p class="small adj-aviso">${lucide('info')} ${I18N.t('triaje.tomados_de_los_resultados')}</p>` : ''}
      <p class="small">${escapeHtml(ext.resumen || '')}</p>
      ${(ext.reglas || []).length ? `<p class="small adj-reglas">${I18N.t('triaje.refuerza', { span: ext.reglas.map((r) => `<span>${escapeHtml(r)}</span>`).join(' ') })}</p>` : ''}
      ${datosAdjuntoHtml(ext.datos || {})}
      <h4>${I18N.t('triaje.contraste_con_el_mensaje')} <small class="muted">${I18N.t('triaje.coinciden', { coincide: n.coincide, no_consta: n.no_consta ? I18N.t('triaje.no_constan', { no_consta: n.no_consta }) : '', discrepan: n.discrepa ? ` · ${n.discrepa} discrepan` : '' })}</small></h4>
      <ul class="adj-contraste">${(ext.contraste || []).map((c) => {
        const [ico, cls, txt] = CONTRASTE[c.resultado] || CONTRASTE.no_consta;
        return `<li class="${cls}"><span class="ci" title="${txt}">${lucide(ico)}</span><div><strong>${escapeHtml(ADJ_LABELS[c.campo] || c.campo)}</strong> ${escapeHtml(c.detalle || '')}${c.cita ? `<q>${escapeHtml(c.cita)}</q>` : ''}</div></li>`;
      }).join('')}</ul>${pie}`;
  }

  // Respuesta cruda: la salida del modelo tal cual y, debajo, el bloque añadido por la plataforma
  function pintarRaw(entry) {
    const gob = gobDe(entry);
    const vista = modalState.raw === 'modelo' || modalState.raw === 'enviado' ? modalState.raw : 'gobierno';
    const conGob = vista === 'gobierno';
    document.querySelectorAll('#tab-json .seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.raw === vista)));
    $('raw-leyenda').classList.toggle('sin-gob', !conGob);
    $('raw-filtro').style.display = vista === 'enviado' ? 'none' : '';
    $('modal-copy-raw').innerHTML = `${lucide('copy')} ${vista === 'enviado' ? I18N.t('triaje.copiar_texto') : I18N.t('triaje.copiar_json')}`;
    if (vista === 'enviado') { pintarEnviado(entry); return; }
    let modelo = null;
    try { const m = String(entry.raw || '').match(/^\s*\{[\s\S]*\}\s*$/); if (m) modelo = JSON.parse(m[0]); } catch { modelo = null; }
    const opts = { sensibles: Cumplimiento.camposSensibles(entry), claves: Cumplimiento.CLAVES_NORMA, plegable: true };
    let html; let texto;
    if (modelo) {
      const obj = conGob ? { ...modelo, _gobernanza: gob } : modelo;
      html = Cumplimiento.jsonHtml(obj, opts); texto = JSON.stringify(obj, null, 2);
    } else {
      const base = entry.raw || I18N.t('triaje.sin_respuesta_cruda_decision');
      html = escapeHtml(base) + (conGob ? `\n\n${Cumplimiento.jsonHtml({ _gobernanza: gob }, opts)}` : '');
      texto = base + (conGob ? `\n\n${JSON.stringify({ _gobernanza: gob }, null, 2)}` : '');
    }
    $('modal-raw').innerHTML = html;
    modalState.rawTexto = texto;
    // Cada botón de la leyenda se apaga si su color no aparece en esta respuesta
    document.querySelectorAll('#raw-leyenda .rl-btn').forEach((b) => { b.disabled = !$('modal-raw').querySelector(FOCO_RAW[b.dataset.foco]); });
    if (modalState.rawFoco && !$('modal-raw').querySelector(FOCO_RAW[modalState.rawFoco])) modalState.rawFoco = null;
    enfocarRaw(modalState.rawFoco);
    const dp = gob.datos_personales;
    $('raw-nota').textContent = conGob
      ? I18N.t('triaje.el_bloque_gobernanza_lo', { total: dp.total, categoria_especial_salud: dp.categoria_especial_salud, menores: dp.menores, terceros: dp.terceros })
      : I18N.t('triaje.salida_del_modelo_tal');
  }

  // Plegado del JSON. Un botón de la leyenda pliega todo y deja abierto solo el camino hasta lo que marca ese color
  // (una sección de «_gobernanza» se abre entera); el resto de líneas queda atenuado.
  const FOCO_RAW = { pii: '.j-pii:not(.j-pii-salud), .g-key.g-pii', salud: '.j-pii-salud, .g-art9', tag: '.j-tag', traz: '.g-key.g-traz', expl: '.g-key.g-expl', sup: '.g-key.g-sup', ret: '.g-key.g-ret', norma: '.j-norma' };
  function plegarNodo(n, plegado) {
    n.classList.toggle('plegado', plegado);
    const b = n.querySelector('.j-tog');
    b.setAttribute('aria-expanded', String(!plegado));
    b.setAttribute('aria-label', I18N.t(plegado ? 'cumpl.desplegar' : 'cumpl.plegar', { clave: b.dataset.clave }));
  }
  function enfocarRaw(foco) {
    const pre = $('modal-raw');
    modalState.rawFoco = foco || null;
    document.querySelectorAll('#raw-leyenda .rl-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.foco === modalState.rawFoco)));
    pre.classList.toggle('enfoque', !!foco);
    pre.querySelectorAll('.j-ver').forEach((l) => l.classList.remove('j-ver'));
    pre.querySelectorAll('.j-nodo').forEach((n) => plegarNodo(n, !!foco));
    if (!foco) return;
    pre.querySelectorAll(FOCO_RAW[foco]).forEach((m) => {
      const linea = m.closest('.j-l'); if (!linea) return;
      for (let a = linea; a; a = a.parentElement.closest('.j-l')) { a.classList.add('j-ver'); if (a !== linea) plegarNodo(a, false); }
      // Una sección o un valor que es un objeto entero se abre con todo su contenido
      if (linea.classList.contains('j-nodo') && (m.classList.contains('g-key') || m.querySelector('.j-in'))) {
        plegarNodo(linea, false);
        linea.querySelectorAll('.j-nodo').forEach((n) => plegarNodo(n, false));
        linea.querySelectorAll('.j-l').forEach((l) => l.classList.add('j-ver'));
      }
    });
    const primera = pre.querySelector('.j-ver'); if (primera) pre.scrollTop = primera.offsetTop - pre.offsetTop - 8;
  }

  // Lo que recibió el modelo: el mensaje con los datos personales cambiados por marcadores
  function pintarEnviado(entry) {
    const sd = entry.seudonimizacion;
    const envio = gob_envio(entry);
    if (!sd || !sd.activa) {
      const texto = envio.aplica === false ? envio.motivo : I18N.t('triaje.activa_seudonimizar_antes_de', { motivo: envio.motivo });
      $('modal-raw').textContent = texto; modalState.rawTexto = texto;
      $('raw-nota').textContent = '';
      return;
    }
    const e = sd.enviado || {};
    const adj = (entry.mensaje || {}).adjuntos || [];
    const lineaAdj = (a) => { const h = (entry.adjuntos_recibidos || []).find((x) => x.id === a.id) || {}; return `· ${a.archivo} (${a.mime}${h.bytes ? `, ${fmtKb(h.bytes)}` : ''}${h.sha256 ? `, sha256:${h.sha256.slice(0, 16)}…` : ''})`; };
    const bloqueAdj = !adj.length ? ''
      : entry.adjuntos_origen === 'guardado' ? I18N.t('triaje.adjuntos_no_se_envian', { adj: adj.length, lineaAdj: adj.map(lineaAdj).join('\n') })
      : I18N.t('triaje.adjuntos_enviados_tal_cual', { adj: adj.length, lineaAdj: adj.map(lineaAdj).join('\n') });
    const texto = `Asunto: ${e.asunto}\nRemitente: ${e.remitente}\n\n${e.texto}${bloqueAdj}`;
    $('modal-raw').innerHTML = escapeHtml(texto).replace(/\[[A-Z_]+_\d+\]/g, (t) => `<mark class="raw-tok">${t}</mark>`);
    modalState.rawTexto = texto;
    const NOMBRE_TIPO = { nombre: ['nombre', 'nombres'], nombre_tercero: [I18N.t('triaje.nombre_de_tercero'), I18N.t('triaje.nombres_de_terceros')], dni: ['DNI', 'DNI'], nie: ['NIE', 'NIE'], email: ['email', 'emails'], telefono: ['teléfono', 'teléfonos'], iban: ['IBAN', 'IBAN'], tarjeta_sanitaria: [I18N.t('triaje.tarjeta_sanitaria'), I18N.t('triaje.tarjetas_sanitarias')], poliza: ['póliza', 'pólizas'], matricula: ['matrícula', 'matrículas'], expediente: ['expediente', 'expedientes'], direccion: ['dirección', 'direcciones'] };
    const tipos = Object.entries(sd.por_tipo || {}).map(([k, n]) => `${n} ${(NOMBRE_TIPO[k] || [k, k])[n === 1 ? 0 : 1]}`).join(', ');
    $('raw-nota').textContent = I18N.t('triaje.datos_personales_sustituidos_por', { reproduccion_de_una_resp: sd.simulada ? I18N.t('triaje.reproduccion_de_una_respuesta') : '', sustituidos: sd.sustituidos, ninguno: tipos || 'ninguno' })
      + I18N.t('triaje.la_tabla_de_correspondencias')
      + (adj.length && entry.adjuntos_origen !== 'guardado' ? I18N.t('triaje.la_seudonimizacion_solo_se') : '');
  }
  const gob_envio = (entry) => (entry.gobernanza && entry.gobernanza.datos_personales.envio_al_modelo) || {};

  function pintarSiguientePaso(entry) {
    const paso = Evidencias.siguientePaso(entry);
    // Los «A revisar» se validan y los aprobados admiten override desde la tarjeta Decisión; tras eso no hay nada que marcar
    const review = entry.decision === DECISION.REVIEW || !!entry.revision;
    const card = $('modal-sig'); card.className = `sig-card ${paso.tono === 'ok' ? 'ok' : ''}`;
    const borrador = Evidencias.borradorSolicitud(entry, paso);
    card.innerHTML = `<span class="k">${I18N.t('triaje.siguiente_paso_recomendado')}</span>
      <div class="t">${lucide(paso.icono)} ${escapeHtml(paso.titulo)}</div>
      <div class="small">${escapeHtml(paso.detalle)}</div>
      ${paso.pedir.length ? `<div class="small muted">${I18N.t('triaje.que_pedir_al_cliente')}</div><div class="pedir">${paso.pedir.map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>` : ''}
      ${paso.otras && paso.otras.length ? `<div class="small muted">${I18N.t('triaje.tambien', { otras: escapeHtml(paso.otras.join(' · ')) })}</div>` : ''}
      <div class="sig-acciones">
        ${review ? '' : `<button class="btn btn-sm btn-primary" type="button" id="btn-revisado">${lucide('check')} ${entry.revisado ? I18N.t('triaje.revisado') : I18N.t('triaje.marcar_como_tramitado')}</button>`}
        ${borrador ? `<button class="btn btn-sm" type="button" id="btn-solicitud">${lucide('copy')} ${I18N.t('triaje.copiar_solicitud_al_cliente')}</button>` : ''}
      </div>`;
    if (!review) $('btn-revisado').addEventListener('click', () => { entry.revisado = !entry.revisado; gobDe(entry); persistLog(); pintarSiguientePaso(entry); pintarIndicadores(entry); pintarRaw(entry); });
    const bs = $('btn-solicitud');
    if (bs) bs.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(borrador); bs.innerHTML = `${lucide('check')} Copiado`; } catch { bs.textContent = I18N.t('triaje.no_se_pudo_copiar'); }
      setTimeout(() => { bs.innerHTML = I18N.t('triaje.copiar_solicitud_al_cliente_2', { copy: lucide('copy') }); }, 1800);
    });
  }

  // Acción humana desde la tarjeta Decisión. Las dos piden confirmación con un comentario opcional y se pueden cancelar.
  // · Validar (solo «A revisar»): el tramitador resuelve la revisión y elige el resultado. No cuenta como override:
  //   el agente ya había escalado el caso, así que no afecta a su autonomía.
  // · Override (solo «Aprobado»): el tramitador cambia una decisión que el agente tomó solo y la pasa a «A revisar».
  //   Cuenta en la tasa de override del agente de Reglas y puede proponer bajarle de nivel (gobierno.html).
  const ACC_REV = {
    validar: { icono: 'circle-check', boton: I18N.t('triaje.validar'), titulo: I18N.t('triaje.validar_la_revision'), confirmar: I18N.t('triaje.confirmar'), pista: I18N.t('triaje.que_has_comprobado'), ayuda: I18N.t('triaje.resuelves_un_caso_que') },
    override: { icono: 'repeat', boton: I18N.t('triaje.override'), titulo: I18N.t('triaje.cambiar_a_a_revisar'), confirmar: I18N.t('triaje.pasar_a_a_revisar'), pista: I18N.t('triaje.por_que_no_estas'), ayuda: I18N.t('triaje.cambias_una_decision_que') },
  };
  const RESULTADO_REV = { aprobada: I18N.t('triaje.aprobar'), mantenida: I18N.t('triaje.mantener_en_a_revisar') };
  // Decisión vigente tras la acción humana (la del agente se conserva en entry.decision)
  const decisionFinal = (e) => (e.revision && e.revision.a ? e.revision.a : e.decision);
  function tarjetaDecision(entry, inc) {
    const review = entry.decision === DECISION.REVIEW;
    const rev = entry.revision && entry.revision.a ? entry.revision : null;
    const final = decisionFinal(entry);
    const finalReview = final === DECISION.REVIEW;
    const accion = review ? 'validar' : 'override';
    const abierta = !rev && modalState.revForm === accion;
    const quien = rev ? `${escapeHtml(rev.usuario)} · ${new Date(rev.fecha).toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}` : '';
    const sub = entry.revisado && !rev ? I18N.t('triaje.revisado_2') : inc.length ? `incumple ${escapeHtml(inc.join(', '))}` : I18N.t('triaje.sin_reglas_incumplidas');
    // Columna derecha: el botón (sigue visible con el formulario abierto, así la tarjeta no cambia de alto)
    // o, tras la acción, quién la hizo, el cambio y el comentario (recortado a dos líneas; entero al pasar el ratón)
    const lado = rev
      ? `<span class="pill ${rev.accion === 'override' ? 'pill-time' : 'pill-revisado'}">${lucide(ACC_REV[rev.accion === 'override' ? 'override' : 'validar'].icono)} ${rev.accion === 'override' ? I18N.t('triaje.override') : I18N.t('triaje.validado')}</span>
        <span class="dec-quien">${quien}</span>
        ${rev.de !== rev.a ? `<span class="dec-antes">${I18N.t('triaje.el_agente_decidio', { aprobado: review ? I18N.t('triaje.a_revisar') : I18N.t('triaje.aprobado') })}</span>` : ''}
        ${rev.comentario ? `<q class="dec-coment" title="${escapeHtml(rev.comentario)}">${escapeHtml(rev.comentario)}</q>` : ''}`
      : `<button class="btn btn-sm${review ? ' btn-primary' : ''}" type="button" data-rev="${accion}" aria-expanded="${abierta}" aria-controls="modal-rev">${lucide(ACC_REV[accion].icono)} ${ACC_REV[accion].boton}</button>`;
    return `<div class="kpi-tile ico dec-tile${abierta ? ' activa' : ''}" style="--tc:${finalReview ? 'var(--review)' : 'var(--ok)'}">
      <span class="kpi-ico">${lucide(finalReview ? 'eye' : 'thumbs-up')}</span>
      <div class="txt"><span class="l">${I18N.t('triaje.decision')}</span><span class="v">${finalReview ? I18N.t('triaje.a_revisar') : I18N.t('triaje.aprobado')}</span><span class="s">${sub}</span></div>
      <div class="dec-lado">${lado}</div>
    </div>`;
  }
  // Formulario de la acción: fila propia bajo las tres tarjetas, fuera de su rejilla, para no moverlas
  function pintarFormRevision(entry) {
    const accion = entry.decision === DECISION.REVIEW ? 'validar' : 'override';
    const f = !entry.revision && modalState.revForm === accion && ACC_REV[accion];
    const box = $('modal-rev');
    box.hidden = !f;
    box.innerHTML = f ? `<form class="dec-form" data-accion="${accion}">
        <b>${f.titulo}</b>
        ${accion === 'validar' ? `<fieldset class="dec-resultado"><legend>${I18N.t('triaje.resultado_de_la_revision')}</legend>${Object.entries(RESULTADO_REV).map(([k, l], i) => `<label class="inline"><input type="radio" name="dec-resultado" value="${k}"${i ? '' : ' checked'}> ${l}</label>`).join('')}</fieldset>` : ''}
        <label for="dec-coment">${I18N.t('triaje.comentario')} <span class="muted">${I18N.t('triaje.opcional')}</span></label>
        <textarea id="dec-coment" rows="2" maxlength="500" placeholder="${f.pista}"></textarea>
        <p class="small muted">${f.ayuda}</p>
        <div class="dec-acciones"><button class="btn btn-sm btn-primary" type="submit">${lucide('check')} ${f.confirmar}</button><button class="btn btn-sm" type="button" data-rev="cancelar">${I18N.t('triaje.cancelar')}</button></div>
      </form>` : '';
  }
  function revisar(entry, accion, { resultado, comentario } = {}) {
    const de = entry.decision;
    const a = accion === 'override' ? DECISION.REVIEW : resultado === 'aprobada' ? DECISION.CLEARED : DECISION.REVIEW;
    entry.revision = { accion: accion === 'override' ? 'override' : 'validada', ...(accion === 'override' ? {} : { resultado }), de, a, usuario: Shell.USUARIO.nombre, fecha: new Date().toISOString(), ...(comentario ? { comentario } : {}) };
    entry.revisado = true;
    modalState.revForm = null;
    gobDe(entry); persistLog(); renderLog();
    pintarIndicadores(entry); pintarSiguientePaso(entry); pintarRaw(entry);
  }

  function pintarIndicadores(entry) {
    const ramoColor = { Auto: 'var(--auto)', Hogar: 'var(--hogar)', Salud: 'var(--salud)' }[entry.ramo] || 'var(--muted)';
    const ramoIcon = { Auto: 'car', Hogar: 'house', Salud: 'heart-pulse' }[entry.ramo] || 'circle-help';
    const inc = (entry.criterios || []).filter((c) => c.resultado === 'incumple').map((c) => c.regla);
    const esperado = entry.esperado || {};
    $('modal-kpis').innerHTML = `
      ${tarjetaDecision(entry, inc)}
      <div class="kpi-tile ico" style="--tc:${ramoColor}"><span class="kpi-ico">${lucide(ramoIcon)}</span><div class="txt"><span class="l">${I18N.t('triaje.ramo')}</span><span class="v">${escapeHtml(I18N.etiqueta('ramo', entry.ramo))}</span><span class="s">${esperado.ramo ? (esperado.ramo === entry.ramo ? I18N.t('triaje.coincide_con_el_esperado') : `esperado ${escapeHtml(esperado.ramo)}`) : escapeHtml(entry.origen.startsWith('IA') ? I18N.t('triaje.asignado_por_el_modelo') : I18N.t('triaje.asignado_por_reglas_locales'))}</span></div></div>
      <div class="kpi-tile ico conf" style="--tc:${entry.confianza >= 0.85 ? 'var(--ok)' : entry.confianza >= 0.7 ? 'var(--review)' : 'var(--error)'}"><span class="kpi-ico">${lucide('gauge')}</span><div class="txt"><span class="l">${I18N.t('triaje.confianza')}</span><span class="v" style="color:var(--tc)">${entry.confianza >= 0.85 ? I18N.t('triaje.alta') : entry.confianza >= 0.7 ? I18N.t('triaje.media') : I18N.t('triaje.baja')}</span><span class="s">${I18N.t('triaje.del_modelo_en_su')}</span></div><svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${I18N.t('triaje.confianza_por_ciento', { confianza: Math.round(entry.confianza * 100) })}"><circle class="pista" cx="32" cy="32" r="26"/><circle class="valor" cx="32" cy="32" r="26" stroke-dasharray="${(entry.confianza * 163.36).toFixed(1)} 999"/><text x="32" y="37" text-anchor="middle">${Math.round(entry.confianza * 100)}%</text></svg></div>`;
    pintarFormRevision(entry);
  }

  function openModal(entry, lista, { conservarTab = false } = {}) {
    if (lista) modalState.lista = lista; else modalState.lista = sortedFilteredLog();
    modalState.idx = Math.max(0, modalState.lista.findIndex((e) => e.id === entry.id));
    if (modalState.entry !== entry) modalState.revForm = null;
    modalState.entry = entry;
    const m = entry.mensaje;
    const datos = entry.datos_extraidos || {};
    const esperado = entry.esperado || {};
    $('modal-title').textContent = `${entry.id} · ${m.asunto}`;
    $('modal-canal').innerHTML = canalIcon(m.canal);
    $('modal-pos').textContent = modalState.lista.length > 1 ? I18N.t('triaje.de', { idx: modalState.idx + 1, lista: modalState.lista.length }) : '';
    $('modal-prev').disabled = modalState.idx <= 0; $('modal-next').disabled = modalState.idx >= modalState.lista.length - 1;
    $('modal-prev').innerHTML = lucide('chevron-left'); $('modal-next').innerHTML = lucide('chevron-right');
    $('modal-copy-raw').innerHTML = `${lucide('copy')} Copiar JSON`;
    $('modal-tabs').innerHTML = tabsDe(entry).map(([k, icono, label]) => {
      const nInc = k === 'reglas' ? (entry.criterios || []).filter((c) => c.resultado === 'incumple').length : 0;
      const n = k === 'reglas' ? ` <span class="n${nInc ? '' : ' vacio'}">${nInc || 0}</span>` : k === 'adjuntos' ? ` <span class="n n-adj">${m.adjuntos.length}</span>` : '';
      return `<button class="ficha-tab" type="button" role="tab" data-tab="${k}" aria-selected="false">${lucide(icono)} ${label}${n}</button>`;
    }).join('');
    modalState.adj = 0; modalState.zoom = 1;
    setTab(conservarTab ? modalState.tab : 'mensaje');
    tituloEvidencia(null);
    pintarIndicadores(entry);

    pintarEvidencias(entry, m);
    pintarSiguientePaso(entry);
    const etapas = etapasDe(entry);
    $('modal-crono').innerHTML = etapas.map((e) => `<li class="${e.review ? 'review' : ''}"><b>${escapeHtml(e.nombre)}</b>${e.ms != null ? `<span class="ms">${fmtMs(e.ms)}</span>` : ''}${e.det ? `<small>${escapeHtml(e.det)}</small>` : ''}</li>`).join('')
      + `<li class="crono-total" style="--dc:transparent">${I18N.t('triaje.ciclo_total', { duracion_ms: fmtMs(entry.duracion_ms) })}</li>`;

    $('modal-mensaje').innerHTML = kv([
      [I18N.t('triaje.remitente'), escapeHtml(m.remitente.nombre)],
      [I18N.t('triaje.contacto'), escapeHtml(m.remitente.contacto)],
      [I18N.t('triaje.canal'), escapeHtml(CANAL_LABEL[m.canal] || m.canal)],
      [I18N.t('triaje.recibido'), new Date(m.fecha_recepcion).toLocaleString(I18N.locale)],
      [I18N.t('triaje.asunto'), escapeHtml(m.asunto)],
    ]);
    const keys = [...Object.keys(DATOS_LABELS), ...Object.keys(datos).filter((k) => !DATOS_LABELS[k])];
    $('modal-datos').innerHTML = kv(keys.filter((k) => k in datos).map((k) => [DATOS_LABELS[k] || k, k === 'importe_estimado_eur' ? fmtEur(datos[k]) : fmtValue(datos[k])]));

    const ramoOk = esperado.ramo ? (esperado.ramo === entry.ramo ? `<span class="mark ok">${lucide('check')} ${I18N.t('triaje.coincide_2')}</span>` : `<span class="mark ko">${lucide('x')} ${I18N.t('triaje.esperado_2', { ramo: escapeHtml(I18N.etiqueta('ramo', esperado.ramo)) })}</span>`) : '';
    const colorRamo = { Auto: 'var(--auto)', Hogar: 'var(--hogar)', Salud: 'var(--salud)' }[entry.ramo] || 'var(--muted)';
    const hReglas = $('modal-reglas-h');
    hReglas.textContent = I18N.t('triaje.reglas_de_negocio_del', { ramo: I18N.etiqueta('ramo', entry.ramo) }); hReglas.style.color = colorRamo; hReglas.style.borderLeftColor = colorRamo;
    $('modal-ramo').innerHTML = `${I18N.t('triaje.asignado_por_el', { motor_local: entry.origen.startsWith('IA') ? I18N.t('triaje.modelo') : I18N.t('triaje.motor_local') })} <strong>${escapeHtml(I18N.etiqueta('ramo', entry.ramo))}</strong> ${ramoOk}`;
    $('modal-ramo-criterios').replaceChildren(...(entry.criterios_ramo || []).map((c) => Object.assign(document.createElement('li'), { textContent: c })));
    if (!(entry.criterios_ramo || []).length) $('modal-ramo-criterios').innerHTML = I18N.t('triaje.sin_criterios_de_clasificacion');
    $('modal-criterios').replaceChildren(...(entry.criterios || []).map((c) => {
      const li = document.createElement('li');
      li.className = `crit crit-${c.resultado}`;
      li.innerHTML = `<span class="crit-icon" aria-hidden="true">${RESULT_ICON[c.resultado] || '–'}</span><div><strong>${escapeHtml(c.regla)}</strong> ${escapeHtml(c.descripcion)}<br><small>${escapeHtml(c.evidencia)}</small></div>`;
      return li;
    }));
    if (!(entry.criterios || []).length) $('modal-criterios').innerHTML = I18N.t('triaje.el_resultado_no_incluye');
    pintarFraude(entry);
    pintarAdjuntos(entry);

    $('modal-resultado').innerHTML = kv([
      [I18N.t('triaje.decision'), entry.decision === DECISION.REVIEW ? I18N.t('triaje.a_revisar_revision_humana') : I18N.t('triaje.aprobado_automaticamente')],
      [I18N.t('triaje.motivo'), escapeHtml(entry.motivo)],
      [I18N.t('triaje.confianza'), `${Math.round(entry.confianza * 100)} %`],
      [I18N.t('triaje.origen'), escapeHtml(origenTexto(entry.origen))],
      [I18N.t('triaje.ciclo'), fmtMs(entry.duracion_ms)],
      [I18N.t('triaje.tokens'), entry.usage ? `${entry.usage.input ?? '?'} entrada · ${entry.usage.output ?? '?'} salida${entry.usage.reasoning != null ? ` (${entry.usage.reasoning} razonamiento)` : ''}` : undefined],
      ...(entry.pasos && entry.pasos.length > 1 ? entry.pasos.map((p) => [`${lucide('corner-down-right')} ${escapeHtml(p.nombre)}`, `${p.duracion_ms != null ? `${fmtMs(p.duracion_ms)} · ` : ''}${p.usage?.input ?? '?'} entrada · ${p.usage?.output ?? '?'} salida${p.usage?.reasoning != null ? ` (${p.usage.reasoning} razonamiento)` : ''}`]) : []),
      [I18N.t('triaje.referencia_demo'), esperado.ramo ? `${esperado.revision ? I18N.t('triaje.a_revisar_esperado') : I18N.t('triaje.aprobado_esperado')}${esperado.nota ? ` — ${escapeHtml(esperado.nota)}` : ''}` : undefined],
    ]);
    pintarRaw(entry);
    $('modal').classList.remove('cerrando');
    if (!$('modal').open) $('modal').showModal();
    $('modal').querySelector('.ficha-body').scrollTop = 0;
  }

  // Cierre del panel con su animación de salida; sin animación (prefers-reduced-motion) se cierra al momento
  function cerrarFicha() {
    const d = $('modal');
    if (!d.open || d.classList.contains('cerrando')) return;
    d.classList.add('cerrando');
    if (getComputedStyle(d).animationName !== 'panel-sale') { d.close(); return; }
    const fin = (ev) => { if (ev && (ev.target !== d || ev.animationName !== 'panel-sale')) return; d.removeEventListener('animationend', fin); clearTimeout(t); if (d.classList.contains('cerrando')) d.close(); };
    const t = setTimeout(fin, 400);
    d.addEventListener('animationend', fin);
  }

  function navegarModal(delta) {
    const e = modalState.lista[modalState.idx + delta];
    if (e) openModal(e, modalState.lista, { conservarTab: true });
  }

  // ---------------------------------------------------------------------------
  // Procesamiento del paquete con pausa / continuar / cancelar
  // ---------------------------------------------------------------------------
  async function waitWhilePaused() {
    while (state.paused && !state.cancelled) await sleep(150);
  }

  // Simula la espera del modelo con el mismo estado en vivo, respetando pausa y cancelación
  async function simulateModelWait(onProgress) {
    const total = rnd(REPLAY_LATENCY_MS[0], REPLAY_LATENCY_MS[1]);
    const t0 = performance.now();
    while (performance.now() - t0 < total) {
      if (state.cancelled) return;
      onProgress && onProgress(I18N.t('triaje.esperando_respuesta_del_modelo_2', { t0: ((performance.now() - t0) / 1000).toFixed(0) }));
      await sleep(250);
    }
  }

  async function triageOne(msg, cfg, onProgress) {
    if (state.motor === 'guardado') {
      const guardado = RESULTADOS_GUARDADOS[msg.id];
      await simulateModelWait(onProgress);
      if (!guardado) return { ...localTriage(msg), origen: 'reglas locales (sin ficha guardada)' };
      const r = expandirResultadoGuardado(guardado);
      const { usage, ...json } = r;
      const raw = JSON.stringify(json, null, 2);
      const { envio, mapa, seud } = prepararEnvio(msg);
      // Reproducción: se muestra la salida tal y como la habría devuelto el modelo con el mensaje seudonimizado
      if (seud) return { ...r, raw: Cumplimiento.seudonimizarTexto(raw, mapa), origen: 'IA (guardado)', seudonimizacion: resumenEnvio(envio, mapa, { simulada: true }) };
      return { ...r, raw, origen: 'IA (guardado)' };
    }
    if (state.motor === 'archivo') {
      const e = msg.__entrada; // entrada del archivo asociada a este mensaje
      await simulateModelWait(onProgress);
      return {
        ramo: e.ramo, criterios_ramo: e.criterios_ramo || [], datos_extraidos: e.datos_extraidos || {}, criterios: e.criterios || [],
        decision: e.decision, motivo: e.motivo, confianza: e.confianza ?? 0.5, evidencias: e.evidencias || [], raw: e.raw || null, usage: e.usage || null, pasos: e.pasos || null, seudonimizacion: e.seudonimizacion || null,
        adjuntos: e.adjuntos || null, adjuntos_origen: e.adjuntos_origen || null,
        origen: `${e.origen || 'IA'} (archivo)`,
      };
    }
    if (!aiEnabled(cfg)) {
      await sleep(rnd(LOCAL_LATENCY_MS[0], LOCAL_LATENCY_MS[1]));
      return { ...localTriage(msg), origen: 'reglas locales' };
    }
    try {
      return { ...(await aiTriage(msg, cfg, onProgress)), origen: 'IA' };
    } catch (err) {
      if (err instanceof PermanentError) throw err; // credenciales/endpoint mal: abortar lote
      console.warn('[triage][llm] fallback a reglas locales', msg.id, err.message);
      return { ...localTriage(msg), origen: `reglas locales (fallback IA: ${err.message.slice(0, 60)})` };
    }
  }

  function setRunButtons() {
    $('btn-run').disabled = state.running;
    $('btn-pause').disabled = !state.running;
    $('btn-pause').innerHTML = state.paused ? `${lucide('play')} Continuar` : `${lucide('pause')} Pausar`;
    $('sel-paquete').disabled = state.running;
  }

  async function runBatch() {
    if (state.running) return;
    const cfg = readConfigFromForm();
    saveConfig(cfg);
    updateModeBadge();
    const paquete = paqueteActual();
    let mensajes = paquete.mensajes;
    if (state.motor === 'archivo') {
      if (!state.archivo) { setStatus('run-status', I18N.t('triaje.carga_primero_un_archivo'), 'error'); return; }
      const todos = PAQUETES.flatMap((p) => p.mensajes);
      mensajes = state.archivo.entradas.map((e) => {
        const original = todos.find((m) => m.id === e.id);
        const base = original || { id: e.id, canal: e.mensaje.canal || '—', fecha_recepcion: e.timestamp, remitente: { nombre: '—', contacto: '—' }, asunto: e.mensaje.asunto || e.asunto, texto: e.mensaje.texto || '', esperado: e.esperado };
        return { ...base, __entrada: e };
      });
    }

    state.running = true; state.paused = false; state.cancelled = false;
    setRunButtons();
    setProgress(0, mensajes.length);
    setStatus('run-status', `Procesando 0/${mensajes.length}…`);

    try {
      for (let i = 0; i < mensajes.length; i++) {
        await waitWhilePaused();
        if (state.cancelled) break;
        const msg = mensajes[i];
        const t0 = performance.now();
        // Recepción: el agente multicanal registra tamaño y SHA-256 de cada adjunto
        const recibidos = (msg.adjuntos || []).length && typeof Adjuntos !== 'undefined' ? await Adjuntos.huellas(msg) : null;
        const result = await triageOne(msg, cfg, (p) => setStatus('run-status', `${msg.id} (${i + 1}/${mensajes.length}): ${p}…`));
        if (state.cancelled || !result) break;
        // Fase 1: el modelo en vivo aún no recibe los adjuntos; sus datos se toman de los resultados guardados
        const adjGuardados = (msg.adjuntos || []).length && /^IA/.test(result.origen || '') && RESULTADOS_GUARDADOS[msg.id] && RESULTADOS_GUARDADOS[msg.id].adj;
        const adjuntos = result.adjuntos || adjGuardados || null;
        const { __entrada, ...mensajeLimpio } = msg;
        state.log.unshift({
          id: msg.id,
          asunto: msg.asunto,
          paquete: state.motor === 'archivo' ? 'archivo' : paquete.id,
          ramo: result.ramo,
          importe: result.datos_extraidos?.importe_estimado_eur ?? null,
          decision: result.decision,
          motivo: result.motivo,
          confianza: result.confianza,
          origen: result.origen,
          criterios: result.criterios,
          criterios_ramo: result.criterios_ramo || [],
          pasos: result.pasos || null,
          datos_extraidos: result.datos_extraidos,
          evidencias: result.evidencias || [],
          raw: result.raw || null,
          seudonimizacion: result.seudonimizacion || null,
          adjuntos,
          adjuntos_origen: result.adjuntos_origen || (result.adjuntos ? 'modelo' : adjuntos ? 'guardado' : null),
          adjuntos_recibidos: recibidos || (msg.__entrada && msg.__entrada.adjuntos_recibidos) || null,
          usage: result.usage || null,
          duracion_ms: Math.round(performance.now() - t0),
          timestamp: new Date().toISOString(),
          esperado: msg.esperado,
          mensaje: mensajeLimpio,
          gob_opts: {
            // En «Resultados guardados» del Paquete A se usa la misma traza que el panel de gobierno
            // (y al reproducir un archivo exportado, la traza y el modelo que se registraron entonces)
            traza_id: (msg.__entrada && msg.__entrada.gob_opts && msg.__entrada.gob_opts.traza_id) || (state.motor === 'guardado' && typeof TRAZA_DEMO !== 'undefined' ? TRAZA_DEMO[msg.id] : undefined),
            modelo: /^IA/.test(result.origen || '') ? ((msg.__entrada && msg.__entrada.gob_opts && msg.__entrada.gob_opts.modelo) || (state.motor === 'guardado' ? 'gpt-5' : (cfg && cfg.deployment) || I18N.t('triaje.modelo_ia'))) : I18N.t('triaje.motor_local_sin_ia'),
            prompt: /^IA/.test(result.origen || '') ? PROMPT_VERSION : 'reglas locales',
          },
        });
        gobDe(state.log[0]);
        persistLog();
        setProgress(i + 1, mensajes.length);
        if (!state.paused) setStatus('run-status', `Procesando ${i + 1}/${mensajes.length}…`);
        renderCounters();
        renderLog();
      }
      if (!state.cancelled) {
        const lote = state.motor === 'archivo' ? 'archivo' : paquete.id;
        const nombre = state.motor === 'archivo' ? I18N.t('triaje.archivo_nombre', { nombre: state.archivo.nombre }) : paquete.nombre;
        const review = state.log.filter((e) => e.paquete === lote && e.decision === DECISION.REVIEW).length;
        setStatus('run-status', I18N.t('triaje.paquete_completado', { nombre, aprobados: I18N.t('triaje.n_aprobados', { n: mensajes.length - review }), revisar: I18N.t('triaje.n_a_revisar', { n: review }) }), 'ok');
      }
    } catch (err) {
      setStatus('run-status', `Lote interrumpido: ${err.message}`, 'error');
    } finally {
      state.running = false; state.paused = false;
      setRunButtons();
    }
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    setRunButtons();
    setStatus('run-status', state.paused ? I18N.t('triaje.en_pausa_se_completara') : I18N.t('triaje.reanudando'));
  }

  function resetBatch() {
    state.cancelled = true; state.paused = false;
    state.log = [];
    persistLog();
    renderCounters();
    renderLog();
    setProgress(0, 1);
    setStatus('run-status', state.running ? I18N.t('triaje.lote_cancelado_y_registro') : '');
  }

  // ---------------------------------------------------------------------------
  // Exportación
  // ---------------------------------------------------------------------------
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function exportJson() {
    const data = state.log.map(({ mensaje, ...e }) => ({ ...e, mensaje: { id: mensaje.id, canal: mensaje.canal, asunto: mensaje.asunto, texto: mensaje.texto, remitente: mensaje.remitente, ...(mensaje.adjuntos ? { adjuntos: mensaje.adjuntos } : {}) } }));
    download(`triage-registro-${isoDate(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
  }
  function exportCsv() {
    const cols = ['paquete', 'id', 'asunto', 'ramo', 'importe', 'decision', 'motivo', 'confianza', 'origen', 'duracion_ms', 'timestamp'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(';'), ...state.log.map((e) => cols.map((c) => esc(e[c])).join(';'))];
    download(`triage-registro-${isoDate(new Date())}.csv`, '﻿' + lines.join('\n'), 'text/csv;charset=utf-8');
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  function bind() {
    // Menú lateral común con el panel de gobierno (shell.js): plegado deja solo los iconos de las secciones
    Shell.initShell();
    // Recorrido de la demo (modo presentador): acciones de los pasos que ocurren en el triaje
    // Cierra la ficha de la fase abierta en la barra (la cierra el Escape de la propia barra)
    const cerrarFase = () => { if (!$('phase-pop').hidden) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); };
    Shell.Recorrido.init({
      fases: () => { window.scrollTo({ top: 0 }); const f = document.querySelector('.phase'); if (f) f.click(); return ''; },
      procesar: () => {
        cerrarFase();
        const total = ((PAQUETES.find((p) => p.id === 'A') || {}).mensajes || []).length;
        const hechos = () => state.log.filter((e) => e.paquete === 'A').length;
        // El paso no termina hasta que están los 13 mensajes: el recorrido no deja avanzar mientras tanto
        const listo = () => !state.running && hechos() >= total;
        if (state.running) return { aviso: '', listo };                                   // ya en marcha: se espera a que acabe
        if (hechos() >= total) return I18N.t('triaje.el_paquete_a_ya');
        if (hechos()) resetBatch();   // lote cortado (por ejemplo, al cambiar de página a mitad): se vuelve a procesar entero
        $('sel-motor').value = 'guardado'; $('sel-motor').dispatchEvent(new Event('change'));
        $('sel-paquete').value = 'A'; $('sel-paquete').dispatchEvent(new Event('change'));
        $('btn-run').click();
        return { aviso: '', listo };
      },
      ficha: (id, tab) => {
        cerrarFase();
        const e = state.log.find((x) => x.id === id);
        if (!e) return I18N.t('triaje.todavia_no_hay_ficha', { id });
        openModal(e); if (tab) setTab(tab);
        return '';
      },
      // Subpasos: abre la ficha de una fase de la barra (sin cerrarla si ya está abierta) o la cierra
      fase: (id) => {
        const pop = $('phase-pop');
        if (id === 'cerrar') { cerrarFase(); return ''; }
        const b = document.querySelector(`.phase[data-phase="${id}"]`);
        if (b && (pop.hidden || !b.classList.contains('is-active'))) b.click();
        return '';
      },
      // Subpasos: despliega el menú lateral y la sección «Paquete de mensajes»
      paquete: () => {
        const shell = document.querySelector('.shell');
        if (shell && shell.classList.contains('nav-collapsed')) { const t = document.querySelector('.sidenav-toggle'); if (t) t.click(); }
        const d = document.querySelector('.nav-sec summary[title="Paquete de mensajes"]'); if (d && !d.parentElement.open) d.parentElement.open = true;
        return '';
      },
      // Estado del lote para los avisos de espera del recorrido
      lote: () => ({ total: ((PAQUETES.find((p) => p.id === 'A') || {}).mensajes || []).length, hechos: state.log.filter((e) => e.paquete === 'A').length, procesando: !!state.running }),
    });
    $('btn-toggle-config').addEventListener('click', () => {
      const panel = $('config-panel');
      panel.hidden = !panel.hidden;
      $('btn-toggle-config').setAttribute('aria-expanded', String(!panel.hidden));
    });
    ['cfg-endpoint', 'cfg-deployment', 'cfg-route', 'cfg-api-version', 'cfg-api-key'].forEach((id) => {
      $(id).addEventListener(id === 'cfg-route' ? 'change' : 'input', () => {
        if (id === 'cfg-endpoint') { const r = routeFromUrl($('cfg-endpoint').value); if (r) $('cfg-route').value = r; }
        saveConfig(readConfigFromForm());
        updateModeBadge();
      });
    });
    $('btn-test-ai').addEventListener('click', async () => {
      const cfg = readConfigFromForm();
      if (!aiEnabled(cfg)) { setStatus('ai-status', I18N.t('triaje.faltan_endpoint_deployment_o'), 'error'); return; }
      setStatus('ai-status', `Probando ${buildEndpointUrl(cfg)}…`);
      $('btn-test-ai').disabled = true;
      try {
        const { text } = await callChat(cfg, [{ role: 'user', content: I18N.t('triaje.responde_solo_con_este') }], { maxTokens: 300, onProgress: (p) => setStatus('ai-status', `${p}…`) });
        setStatus('ai-status', I18N.t('triaje.conexion_correcta_respuesta', { text: String(text).slice(0, 60) }), 'ok');
      } catch (err) {
        const hint = /api version/i.test(err.message) ? I18N.t('triaje.prueba_otra_ruta_de') : '';
        setStatus('ai-status', `Error: ${err.message}${hint}`, 'error');
      } finally {
        $('btn-test-ai').disabled = false;
      }
    });
    $('btn-clear-ai').addEventListener('click', () => { $('cfg-api-key').value = ''; saveConfig(readConfigFromForm()); updateModeBadge(); setStatus('ai-status', I18N.t('triaje.clave_eliminada_de_la')); });

    $('sel-motor').addEventListener('change', () => { state.motor = $('sel-motor').value; ssSet(SS.motor, state.motor); renderPaquete(); });
    $('file-replay').addEventListener('change', async () => {
      const file = $('file-replay').files[0];
      if (!file) return;
      try {
        const data = Fechas.alDia(JSON.parse(await file.text()));
        if (!Array.isArray(data) || !data.length || !data.every((e) => e && e.id && e.decision && e.mensaje)) throw new Error(I18N.t('triaje.el_archivo_no_tiene'));
        // El export va de más reciente a más antiguo: reproducir en el orden original
        state.archivo = { nombre: file.name, entradas: [...data].reverse() };
        state.motor = 'archivo';
        ssSet(SS.motor, state.motor);
        setStatus('run-status', I18N.t('triaje.archivo_cargado_fichas_listas', { name: file.name, data: data.length }), 'ok');
      } catch (err) {
        state.archivo = null;
        setStatus('run-status', I18N.t('triaje.no_se_pudo_cargar', { message: err.message }), 'error');
      }
      renderPaquete();
    });
    $('chk-seud').addEventListener('change', () => { state.seudonimizar = $('chk-seud').checked; ssSet(SS.seudonimizar, state.seudonimizar); });
    $('sel-estrategia').addEventListener('change', () => { state.estrategia = $('sel-estrategia').value; ssSet(SS.estrategia, state.estrategia); syncEstrategiaUI(); });
    $('sel-paquete').addEventListener('change', () => { state.paqueteId = $('sel-paquete').value; ssSet(SS.paquete, state.paqueteId); renderPaquete(); });

    $('btn-run').addEventListener('click', runBatch);
    $('btn-pause').addEventListener('click', togglePause);
    $('btn-reset').addEventListener('click', resetBatch);
    $('filter-ramo').addEventListener('change', renderLog);
    $('filter-review').addEventListener('change', renderLog);
    $('btn-export-json').addEventListener('click', exportJson);
    $('btn-export-csv').addEventListener('click', exportCsv);

    document.querySelectorAll('#log-table th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        state.sort = { key, dir: state.sort.key === key && state.sort.dir === 'asc' ? 'desc' : 'asc' };
        renderLog();
      });
    });
    $('log-body').addEventListener('click', (ev) => {
      const tr = ev.target.closest('tr[data-id]');
      if (!tr) return;
      const entry = state.log.find((e) => e.id === tr.dataset.id);
      if (entry) openModal(entry);
    });
    $('log-body').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return;
      const tr = ev.target.closest('tr[data-id]');
      const entry = tr && state.log.find((e) => e.id === tr.dataset.id);
      if (entry) openModal(entry);
    });
    $('modal-close').addEventListener('click', cerrarFicha);
    // Tarjeta Decisión: Validar / Override abren el formulario; Cancelar (o Esc dentro) lo cierra sin registrar nada
    const botonRev = () => $('modal-kpis').querySelector('[data-rev]');
    const cerrarFormRev = () => { modalState.revForm = null; pintarIndicadores(modalState.entry); const b = botonRev(); if (b) b.focus(); };
    ['modal-kpis', 'modal-rev'].forEach((id) => $(id).addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-rev]'); const entry = modalState.entry;
      if (!b || !entry) return;
      if (b.dataset.rev === 'cancelar' || modalState.revForm === b.dataset.rev) { cerrarFormRev(); return; }
      modalState.revForm = b.dataset.rev;
      pintarIndicadores(entry);
      const f = $('modal-rev').querySelector('input:checked, textarea'); if (f) f.focus();
    }));
    $('modal-rev').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = ev.target.closest('.dec-form');
      const r = f && f.querySelector('input[name="dec-resultado"]:checked');
      if (f && modalState.entry) revisar(modalState.entry, f.dataset.accion, { resultado: r ? r.value : undefined, comentario: $('dec-coment').value.trim() });
    });
    $('modal-rev').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault(); ev.stopPropagation();
      cerrarFormRev();
    });
    // Esc cierra con animación (la leyenda abierta se cierra antes, en su propio manejador); 'close' limpia el estado si se cierra desde fuera
    $('modal').addEventListener('cancel', (ev) => { ev.preventDefault(); cerrarFicha(); });
    $('modal').addEventListener('close', () => $('modal').classList.remove('cerrando'));
    $('modal-prev').addEventListener('click', () => navegarModal(-1));
    $('modal-next').addEventListener('click', () => navegarModal(1));
    $('modal-tabs').addEventListener('click', (ev) => { const b = ev.target.closest('.ficha-tab'); if (b) setTab(b.dataset.tab); });
    $('modal').addEventListener('keydown', (ev) => {
      if (ev.target.closest('input, textarea, select')) return;
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); navegarModal(-1); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); navegarModal(1); }
    });
    // Resaltado cruzado: pasar el ratón por un fragmento o una evidencia ilumina su pareja y sustituye el título
    // «Evidencias» por el tipo de la evidencia activa; un clic la fija. La leyenda solo se abre desde su botón.
    const marcar = (el, clase, on) => {
      $('modal').querySelectorAll(`[data-n="${el.dataset.n}"]`).forEach((x) => x.classList.toggle(clase, on));
    };
    const activa = () => { const sel = $('modal').querySelector('mark.ev.is-sel, .ev-item.is-sel'); return sel ? sel.dataset.n : null; };
    ['mouseover', 'mouseout'].forEach((tipo) => $('modal').addEventListener(tipo, (ev) => {
      const el = ev.target.closest('mark.ev[data-n], .ev-item[data-n]');
      if (!el) return;
      marcar(el, 'is-on', tipo === 'mouseover');
      tituloEvidencia(tipo === 'mouseover' ? el.dataset.n : activa());
    }));
    $('modal').addEventListener('click', (ev) => {
      if (ev.target.closest('#btn-leyenda, #ev-pop')) return;
      const el = ev.target.closest('mark.ev[data-n], .ev-item[data-n]');
      const ya = el && el.classList.contains('is-sel');
      $('modal').querySelectorAll('.is-sel').forEach((x) => x.classList.remove('is-sel'));
      if (el && !ya) marcar(el, 'is-sel', true);
      tituloEvidencia(activa());
    });
    // Leyenda: popover que se abre al pasar el ratón o con el foco sobre el botón, y se fija con un clic
    const pop = $('ev-pop'); const btnLey = $('btn-leyenda');
    let fijada = false;
    const verLeyenda = (on) => { pop.hidden = !on; btnLey.setAttribute('aria-expanded', String(on)); };
    btnLey.addEventListener('mouseenter', () => verLeyenda(true));
    btnLey.addEventListener('mouseleave', () => { if (!fijada) setTimeout(() => { if (!fijada && !pop.matches(':hover')) verLeyenda(false); }, 120); });
    pop.addEventListener('mouseleave', () => { if (!fijada) verLeyenda(false); });
    btnLey.addEventListener('focus', () => verLeyenda(true));
    btnLey.addEventListener('blur', () => { if (!fijada) verLeyenda(false); });
    btnLey.addEventListener('click', () => { fijada = !fijada; verLeyenda(fijada); });
    $('modal').addEventListener('click', (ev) => { if (fijada && !ev.target.closest('#btn-leyenda, #ev-pop')) { fijada = false; verLeyenda(false); } });
    $('modal').addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !pop.hidden) { ev.preventDefault(); fijada = false; verLeyenda(false); btnLey.focus(); } });
    $('modal-copy-raw').addEventListener('click', async () => {
      const b = $('modal-copy-raw');
      try { await navigator.clipboard.writeText(modalState.rawTexto || $('modal-raw').textContent); b.innerHTML = `${lucide('check')} Copiado`; } catch { b.textContent = I18N.t('triaje.no_se_pudo_copiar'); }
      setTimeout(() => { b.innerHTML = `${lucide('copy')} ${modalState.raw === 'enviado' ? I18N.t('triaje.copiar_texto') : I18N.t('triaje.copiar_json')}`; }, 1800);
    });
    $('tab-json').addEventListener('click', (ev) => {
      const b = ev.target.closest('.seg-btn'); if (!b || !modalState.entry) return;
      modalState.raw = b.dataset.raw; pintarRaw(modalState.entry);
    });
    // Plegar un nodo (flecha o «… N claves»), ver solo un color de la leyenda, o plegar y desplegar todo
    $('modal-raw').addEventListener('click', (ev) => {
      const t = ev.target.closest('.j-tog, .j-elip'); if (!t) return;
      const n = t.closest('.j-nodo'); plegarNodo(n, !n.classList.contains('plegado'));
    });
    $('raw-filtro').addEventListener('click', (ev) => {
      const f = ev.target.closest('.rl-btn');
      if (f) { enfocarRaw(modalState.rawFoco === f.dataset.foco ? null : f.dataset.foco); return; }
      const p = ev.target.closest('[data-plegar]'); if (!p) return;
      enfocarRaw(null);
      if (p.dataset.plegar === 'todo') $('modal-raw').querySelectorAll('.j-nodo').forEach((n) => plegarNodo(n, true));
      $('modal-raw').scrollTop = 0;
    });
    // Adjuntos: elegir archivo, zoom de la imagen (botones, Ctrl + rueda, clic) y arrastrar para moverla
    $('adj-lista').addEventListener('click', (ev) => {
      const b = ev.target.closest('.adj-item'); if (!b || !modalState.entry) return;
      modalState.adj = Number(b.dataset.adj); modalState.zoom = 1; pintarAdjuntos(modalState.entry);
    });
    const zoom = (z) => {
      const nuevo = Math.min(4, Math.max(1, z));
      if (nuevo === modalState.zoom || !modalState.entry) return;
      const v = $('adj-visor'); const fx = (v.scrollLeft + v.clientWidth / 2) / v.scrollWidth; const fy = (v.scrollTop + v.clientHeight / 2) / v.scrollHeight;
      modalState.zoom = nuevo; pintarAdjuntos(modalState.entry);
      const img = v.querySelector('img');
      const centrar = () => { v.scrollLeft = fx * v.scrollWidth - v.clientWidth / 2; v.scrollTop = fy * v.scrollHeight - v.clientHeight / 2; };
      if (img && !img.complete) img.addEventListener('load', centrar, { once: true }); else centrar();
    };
    $('adj-barra').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-zoom]'); if (!b) return;
      const d = Number(b.dataset.zoom); zoom(d ? modalState.zoom + d * 0.5 : 1);
    });
    $('adj-visor').addEventListener('wheel', (ev) => {
      if (!ev.ctrlKey || !ev.currentTarget.classList.contains('es-img')) return;
      ev.preventDefault(); zoom(modalState.zoom + (ev.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });
    let arrastre = null;
    $('adj-visor').addEventListener('pointerdown', (ev) => {
      const v = ev.currentTarget; if (!v.classList.contains('es-img')) return;
      arrastre = { x: ev.clientX, y: ev.clientY, l: v.scrollLeft, t: v.scrollTop, movido: false };
    });
    $('adj-visor').addEventListener('pointermove', (ev) => {
      if (!arrastre) return;
      const v = ev.currentTarget; const dx = ev.clientX - arrastre.x; const dy = ev.clientY - arrastre.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) arrastre.movido = true;
      v.scrollLeft = arrastre.l - dx; v.scrollTop = arrastre.t - dy;
    });
    const soltar = (ev) => {
      if (!arrastre) return;
      const clic = !arrastre.movido; arrastre = null;
      if (clic && ev.type === 'pointerup' && ev.target.tagName === 'IMG') zoom(modalState.zoom > 1 ? 1 : 2);
    };
    ['pointerup', 'pointerleave'].forEach((t) => $('adj-visor').addEventListener(t, soltar));
    // Clic fuera del panel (en el velo, que pertenece al propio <dialog>)
    $('modal').addEventListener('click', (ev) => {
      if (ev.target !== $('modal')) return;
      const r = $('modal').getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) cerrarFicha();
    });
  }

  // ---------------------------------------------------------------------------
  // Fases de la cabecera: panel emergente con la descripción de cada paso
  // ---------------------------------------------------------------------------
  // Iconos Lucide: definidos en icons.js (LUCIDE + función lucide()), compartidos con gobierno.js.

  // Colores por grupo semántico (variables de styles.css)
  const C = { primary: 'var(--primary)', ok: 'var(--ok)', review: 'var(--review)', muted: 'var(--muted)', time: 'var(--time)', auto: 'var(--auto)', hogar: 'var(--hogar)', salud: 'var(--salud)', teal: '#3f7a6a' };
  const RAMO_ITEMS = (detalles) => [
    { icono: 'car', color: C.auto, etiqueta: I18N.t('triaje.auto'), detalle: detalles[0] },
    { icono: 'house', color: C.hogar, etiqueta: I18N.t('triaje.hogar'), detalle: detalles[1] },
    { icono: 'heart-pulse', color: C.salud, etiqueta: I18N.t('triaje.salud'), detalle: detalles[2] },
  ];

  // Contenido de cada panel: título, descripción, secciones con lista de ítems (icono + color + etiqueta + detalle), cierre y motores ('ia' | 'logica')
  const PHASE_INFO = {
    multicanal: {
      titulo: I18N.t('triaje.multicanalidad'),
      descripcion: I18N.t('triaje.recibe_los_mensajes_de'),
      secciones: [
        { titulo: I18N.t('triaje.canales_de_entrada'), items: [
          { icono: 'mail', color: C.primary, etiqueta: I18N.t('triaje.email_2'), detalle: I18N.t('triaje.texto_largo_a_veces') },
          { icono: 'message-circle', color: C.primary, etiqueta: I18N.t('triaje.whatsapp_2'), detalle: I18N.t('triaje.mensajes_cortos_e_informales') },
          { icono: 'messages-square', color: C.primary, etiqueta: I18N.t('triaje.chat_2'), detalle: I18N.t('triaje.conversacion_desde_la_web') },
          { icono: 'globe', color: C.primary, etiqueta: I18N.t('triaje.formulario_web_2'), detalle: I18N.t('triaje.campos_estructurados_mas_texto') },
          { icono: 'phone', color: C.primary, etiqueta: I18N.t('triaje.telefono_2'), detalle: I18N.t('triaje.transcripcion_de_la_llamada') },
        ] },
        { titulo: I18N.t('triaje.unificacion'), items: [
          { icono: 'inbox', color: C.teal, etiqueta: I18N.t('triaje.un_unico_formato_de'), detalle: I18N.t('triaje.id_canal_asunto_texto') },
          { icono: 'route', color: C.teal, etiqueta: I18N.t('triaje.se_conserva_el_canal'), detalle: I18N.t('triaje.visible_en_la_lista') },
          { icono: 'merge', color: C.teal, etiqueta: I18N.t('triaje.mismo_flujo_para_todos'), detalle: I18N.t('triaje.clasificacion_extraccion_y_reglas_2') },
        ] },
      ],
      cierre: I18N.t('triaje.el_canal_no_cambia'),
      motores: ['logica', 'ia'],
    },
    ramo: {
      titulo: I18N.t('triaje.clasificacion_por_ramo'),
      descripcion: I18N.t('triaje.determina_a_que_ramo'),
      secciones: [
        { titulo: I18N.t('triaje.ramos'), items: [
          ...RAMO_ITEMS([I18N.t('triaje.vehiculo_colision_lunas_robo'), I18N.t('triaje.vivienda_o_contenido_agua'), I18N.t('triaje.prestacion_sanitaria_urgencias_cirugia')]),
          { icono: 'circle-help', color: C.muted, etiqueta: I18N.t('triaje.indeterminado'), detalle: I18N.t('triaje.si_no_puede_decidirse') },
        ] },
      ],
      cierre: I18N.t('triaje.se_utiliza_logica_semantica'),
      motores: ['ia'],
    },
    datos: {
      titulo: I18N.t('triaje.extraccion_de_datos'),
      descripcion: I18N.t('triaje.convierte_el_texto_libre'),
      secciones: [
        { titulo: I18N.t('triaje.datos_que_se_extraen'), cols: true, items: [
          { icono: 'user', color: C.time, etiqueta: I18N.t('triaje.nombre_del_cliente') },
          { icono: 'file-text', color: C.time, etiqueta: I18N.t('triaje.numero_de_poliza') },
          { icono: 'tag', color: C.time, etiqueta: I18N.t('triaje.tipo_de_siniestro') },
          { icono: 'calendar', color: C.time, etiqueta: I18N.t('triaje.fecha_del_hecho') },
          { icono: 'euro', color: C.time, etiqueta: I18N.t('triaje.importe_estimado') },
          { icono: 'map-pin', color: C.time, etiqueta: I18N.t('triaje.lugar') },
          { icono: 'users', color: C.time, etiqueta: I18N.t('triaje.terceros_implicados') },
          { icono: 'bandage', color: C.time, etiqueta: I18N.t('triaje.lesionados') },
          { icono: 'paperclip', color: C.time, etiqueta: I18N.t('triaje.documentacion') },
        ] },
      ],
      cierre: I18N.t('triaje.solo_se_recoge_lo'),
      motores: ['ia'],
    },
    reglas: {
      titulo: I18N.t('triaje.reglas_de_negocio'),
      descripcion: I18N.t('triaje.aplica_el_bloque_de'),
      secciones: [
        { titulo: I18N.t('triaje.reglas_por_ramo'), items: [
          { icono: 'car', color: C.auto, etiqueta: I18N.t('triaje.auto'), reglas: [['A2', I18N.t('triaje.comunicacion_en_un_maximo')], ['A3', I18N.t('triaje.conductor_tomador_o_declarado')], ['A6', I18N.t('triaje.danos_estimados_inferiores_a')]] },
          { icono: 'house', color: C.hogar, etiqueta: I18N.t('triaje.hogar'), reglas: [['H3', I18N.t('triaje.danos_por_agua_subitos')], ['H4', I18N.t('triaje.robo_con_signos_de')], ['H9', I18N.t('triaje.danos_estimados_inferiores_a_2')]] },
          { icono: 'heart-pulse', color: C.salud, etiqueta: I18N.t('triaje.salud'), reglas: [['S2', I18N.t('triaje.fuera_del_periodo_de')], ['S4', I18N.t('triaje.autorizacion_previa_en_cirugias')], ['S5', I18N.t('triaje.asistencia_en_centros_del')]] },
        ] },
        { titulo: I18N.t('triaje.resultado_de_cada_regla'), cols: true, items: [
          { icono: 'check', color: C.ok, etiqueta: I18N.t('triaje.cumple') },
          { icono: 'x', color: C.review, etiqueta: I18N.t('triaje.incumple_2') },
          { icono: 'minus', color: C.muted, etiqueta: I18N.t('triaje.no_aplica') },
        ] },
      ],
      cierre: I18N.t('triaje.cada_regla_se_evalua'),
      motores: ['ia'],
    },
    registro: {
      titulo: I18N.t('triaje.trazabilidad'),
      descripcion: I18N.t('triaje.deja_traza_completa_de'),
      secciones: [
        { titulo: I18N.t('triaje.que_se_registra'), cols: true, items: [
          { icono: 'tags', color: C.teal, etiqueta: I18N.t('triaje.ramo_y_decision') },
          { icono: 'list-checks', color: C.teal, etiqueta: I18N.t('triaje.motivo_y_criterios') },
          { icono: 'cpu', color: C.teal, etiqueta: I18N.t('triaje.motor_y_tokens') },
          { icono: 'timer', color: C.teal, etiqueta: I18N.t('triaje.tiempo_de_proceso') },
        ] },
        { titulo: I18N.t('triaje.que_se_puede_hacer'), cols: true, items: [
          { icono: 'file-search', color: C.primary, etiqueta: I18N.t('triaje.abrir_la_ficha') },
          { icono: 'filter', color: C.primary, etiqueta: I18N.t('triaje.filtrar_por_ramo_estado') },
          { icono: 'download', color: C.primary, etiqueta: I18N.t('triaje.exportar_json_csv') },
          { icono: 'play', color: C.primary, etiqueta: I18N.t('triaje.reproducir_desde_archivo') },
        ] },
      ],
      cierre: I18N.t('triaje.todo_queda_trazable_y'),
      motores: ['logica'],
    },
    automatizacion: {
      titulo: I18N.t('triaje.automatizacion'),
      descripcion: I18N.t('triaje.convierte_las_decisiones_en'),
      secciones: [
        { titulo: I18N.t('triaje.salidas_del_triaje'), items: [
          { icono: 'circle-check', color: C.ok, etiqueta: I18N.t('triaje.aprobado_2'), detalle: I18N.t('triaje.continua_la_tramitacion_sin') },
          { icono: 'user-check', color: C.review, etiqueta: I18N.t('triaje.a_revisar_2'), detalle: I18N.t('triaje.se_deriva_a_un') },
        ] },
        { titulo: I18N.t('triaje.indicadores'), cols: true, items: [
          { icono: 'chart-column', color: C.time, etiqueta: I18N.t('triaje.aprobados_a_revisar') },
          { icono: 'gauge', color: C.time, etiqueta: I18N.t('triaje.tiempo_medio_de_ciclo') },
        ] },
      ],
      cierre: I18N.t('triaje.el_objetivo_es_maximizar'),
      motores: ['logica'],
    },
  };

  function renderPhase(info) {
    const ico = (it) => `<span class="phase-ico" style="--c:${it.color}">${lucide(it.icono)}</span>`;
    // Ítem con sublista de reglas (código + texto) bajo el ramo
    const reglas = (it) => `<li class="ramo-block"><div class="ramo-head">${ico(it)}<span>${it.etiqueta}</span></div><ul class="rule-list">${it.reglas.map(([codigo, texto]) => `<li><span class="rule-code" style="--c:${it.color}">${escapeHtml(codigo)}</span><span>${escapeHtml(texto)}</span></li>`).join('')}</ul></li>`;
    const item = (it) => (it.reglas ? reglas(it) : `<li>${ico(it)}<span>${it.etiqueta}${it.detalle ? ` <small>— ${it.detalle}</small>` : ''}</span></li>`);
    const seccion = (sec) => `<h4>${escapeHtml(sec.titulo)}</h4><ul class="phase-list${sec.cols ? ' cols' : ''}">${sec.items.map(item).join('')}</ul>`;
    const BADGE = {
      ia: `<span class="phase-badge phase-badge-ia">${lucide('sparkles')} ${I18N.t('triaje.ia_generativa')}</span>`,
      logica: `<span class="phase-badge phase-badge-logica">${lucide('workflow')} ${I18N.t('triaje.logica_de_negocio')}</span>`,
    };
    const badges = (info.motores || []).map((m) => BADGE[m] || '').join(' ');
    return `<h3>${escapeHtml(info.titulo)}</h3><p class="phase-desc">${escapeHtml(info.descripcion)}</p>${info.secciones.map(seccion).join('')}<p class="phase-cierre">${info.cierre}</p>${badges}`;
  }

  function bindPhases() {
    const pop = $('phase-pop');
    const caret = pop.querySelector('.phase-pop-caret');
    const topbar = pop.closest('.submenu');
    const buttons = [...document.querySelectorAll('.phase')];
    let active = null; // botón cuya descripción se muestra
    let pinned = false; // fijado con clic (móvil / teclado)
    let hideTimer = null;

    // Coordenadas de viewport (position: fixed): el popover cuelga de .submenu, que hace scroll
    // horizontal (overflow-x: auto), así que no puede vivir dentro de ese contenedor recortado.
    const position = (btn) => {
      const tb = topbar.getBoundingClientRect();
      const bb = btn.getBoundingClientRect();
      const maxLeft = Math.max(16, tb.right - pop.offsetWidth - 16);
      const left = Math.min(bb.left, maxLeft);
      pop.style.left = `${left}px`;
      pop.style.top = `${tb.bottom + 10}px`;
      pop.style.setProperty('--pop-max-h', `${Math.max(240, window.innerHeight - tb.bottom - 10 - 16)}px`); // el scroll solo aparece si no cabe en pantalla
      caret.style.left = `${Math.max(12, Math.min(bb.left - left + 18, pop.offsetWidth - 24))}px`;
    };

    const show = (btn) => {
      clearTimeout(hideTimer);
      const info = PHASE_INFO[btn.dataset.phase];
      if (!info) return;
      buttons.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-expanded', String(b === btn)); });
      $('phase-pop-body').innerHTML = renderPhase(info);
      pop.hidden = false;
      active = btn;
      position(btn); // alineado bajo la fase, sin salirse del ancho de la barra
    };
    const hide = () => {
      pop.hidden = true;
      buttons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-expanded', 'false'); });
      active = null; pinned = false;
    };
    const scheduleHide = () => { if (!pinned) hideTimer = setTimeout(hide, 150); };

    buttons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => { if (!pinned) show(btn); });
      btn.addEventListener('mouseleave', scheduleHide);
      btn.addEventListener('focus', () => { if (!pinned) show(btn); });
      btn.addEventListener('blur', scheduleHide);
      btn.addEventListener('click', () => {
        if (pinned && active === btn) { hide(); return; }
        show(btn); pinned = true;
      });
    });
    pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    pop.addEventListener('mouseleave', scheduleHide);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !pop.hidden) hide(); });
    document.addEventListener('click', (ev) => { if (!pop.hidden && ev.isTrusted && !ev.target.closest('.phase, #phase-pop, #recorrido')) hide(); });
    window.addEventListener('resize', () => { if (active) position(active); });
    window.addEventListener('scroll', () => { if (active) position(active); }, { passive: true });
  }

  // Altura real de la cabecera para que la barra de submenú (.submenu) quede pegada justo debajo
  function medirTopH() {
    const topbar = document.querySelector('.topbar');
    if (topbar) document.documentElement.style.setProperty('--top-h', `${topbar.offsetHeight}px`);
    // Cabecera + barra de fases (ambas fijas): el panel lateral se ancla justo debajo
    const submenu = document.querySelector('.submenu');
    if (topbar) document.documentElement.style.setProperty('--head-h', `${topbar.offsetHeight + (submenu ? submenu.offsetHeight : 0)}px`);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  loadConfig();
  renderPromptSections();
  renderPaquete();
  bind();
  bindPhases();
  updateModeBadge();
  setRunButtons();
  renderCounters();
  renderLog();
  medirTopH();
  window.addEventListener('resize', medirTopH);
})();
