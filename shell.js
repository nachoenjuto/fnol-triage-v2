// Marco común de index.html y gobierno.html: menú lateral plegable (plegado, solo iconos) con el usuario y el
// botón de plegar al pie, para que las dos páginas tengan exactamente el mismo comportamiento. El estado del menú
// se recuerda en este navegador y se comparte entre las dos páginas (preferencia del usuario, no datos).
// Estructura esperada: .shell > nav.sidenav > (.sidenav-body + .sidenav-foot) y .shell > .shell-main > … + footer.pie
(function (root) {
  'use strict';

  // Usuario de la demo: no hay autenticación, se simula una sesión iniciada
  const USUARIO = { nombre: 'Ignacio Sánchez', rol: 'Responsable de Siniestros', iniciales: 'IS' };
  const CLAVE = 'shell.nav';

  const leer = () => { try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; } };
  const guardar = (abierto) => { try { localStorage.setItem(CLAVE, abierto ? '1' : '0'); } catch { /* sin almacenamiento */ } };

  function initShell({ onChange } = {}) {
    const shell = document.querySelector('.shell');
    if (!shell) return null;
    const pie = shell.querySelector('.sidenav-foot');
    pie.innerHTML = `<div class="usuario" title="${USUARIO.nombre} · ${USUARIO.rol} (sesión simulada)">
        <span class="avatar" aria-hidden="true">${USUARIO.iniciales}</span>
        <span class="lbl"><b>${USUARIO.nombre}</b><small>${USUARIO.rol} · sesión simulada</small></span>
      </div>
      <button type="button" class="sidenav-toggle nav-item" aria-expanded="true"></button>`;
    const boton = pie.querySelector('.sidenav-toggle');

    const set = (abierto, { guardarEstado = true } = {}) => {
      shell.classList.toggle('nav-collapsed', !abierto);
      boton.setAttribute('aria-expanded', String(abierto));
      const txt = abierto ? 'Plegar menú' : 'Desplegar menú';
      boton.innerHTML = `${lucide(abierto ? 'panel-left-close' : 'panel-left-open')}<span class="lbl">${txt}</span>`;
      boton.title = txt; boton.setAttribute('aria-label', txt);
      if (guardarEstado) guardar(abierto);
      if (onChange) setTimeout(() => onChange(abierto), 200);
    };
    boton.addEventListener('click', () => set(shell.classList.contains('nav-collapsed')));

    // Plegado: un clic en el icono de una sección (index.html) despliega el menú y abre esa sección
    shell.querySelectorAll('.nav-sec > summary').forEach((s) => s.addEventListener('click', (ev) => {
      if (!shell.classList.contains('nav-collapsed')) return;
      ev.preventDefault();
      set(true);
      s.parentElement.open = true;
    }));

    set(leer(), { guardarEstado: false });
    return { set, abierto: () => !shell.classList.contains('nav-collapsed') };
  }

  // ---------------------------------------------------------------------------
  // Recorrido de la demo (modo presentador): los pasos del guion (data/recorrido.js) con un botón «Ir» que lleva a la
  // pantalla exacta, aunque esté en la otra página. El modo presentador se activa en Inicio con contraseña.
  // Panel flotante que se arrastra por la cabecera y se minimiza en una barra al pie. El engranaje abre la
  // configuración: demo automática (un tiempo por pantalla común a todas), subtítulos (pie o arriba) y editor de los
  // textos de cada paso, que solo ve quien los edita (se guardan en su navegador).
  // Con una ventana modal abierta, el panel y los subtítulos se mueven dentro de ella para seguir visibles y usables.
  // ---------------------------------------------------------------------------
  const PAGINA_URL = { triaje: 'index.html', gobierno: 'gobierno.html' };
  const PASOS = (typeof RECORRIDO_DEMO !== 'undefined' ? RECORRIDO_DEMO : root.RECORRIDO_DEMO || { pasos: [] }).pasos;
  const CLAVE_PRES = 'demo.presentador';        // sessionStorage: modo presentador desbloqueado en esta pestaña
  const CLAVE_REC = 'demo.recorrido';           // sessionStorage: { activo, paso, vistos, min, reproduciendo }
  const CLAVE_CONF = 'demo.recorrido.config';   // localStorage: configuración y textos editados (solo este navegador)
  const CLAVE_POS = 'demo.recorrido.pos';       // localStorage: posición del panel arrastrado
  // SHA-256 de la contraseña del modo presentador (no se guarda en claro). En una demo estática solo disuade:
  // quien abra las herramientas del navegador puede saltárselo. Protegerlo de verdad exige un servidor.
  const HASH_CLAVE = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
  const SEG = { min: 10, max: 600, def: 45 };
  const MAX_SUBS = 8; const MAX_TXT = 300;
  const ESPERA_MAX = 180000;   // un paso que espera (el lote) empieza a contar como mucho a los 3 minutos
  const CONF_DEF = { auto: false, segundos: SEG.def, alTerminar: 'parar', pausarAlTocar: true, subtitulos: true, subPos: 'pie', subTam: 'normal', textos: {} };
  const alm = (s) => ({
    get: (k, d) => { try { const v = s().getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { s().setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
    del: (k) => { try { s().removeItem(k); } catch { /* sin almacenamiento */ } },
  });
  const ss = alm(() => sessionStorage); const ls = alm(() => localStorage);
  const byId = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const escR = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const leerRec = () => {
    const g = ss.get(CLAVE_REC, {}); const r = { activo: false, paso: 0, vistos: [], min: false, reproduciendo: false, ...(g && typeof g === 'object' ? g : {}) };
    r.paso = clamp(Number(r.paso) || 0, 0, Math.max(0, PASOS.length - 1)); if (!Array.isArray(r.vistos)) r.vistos = [];
    return r;
  };
  const guardarRec = (r) => ss.set(CLAVE_REC, r);
  const presentador = () => ss.get(CLAVE_PRES, false) === true;

  // Configuración guardada: se valida campo a campo; lo que no cuadra (o un JSON corrupto) vuelve al valor por defecto
  function normalizarConfig(o) {
    const c = { ...CONF_DEF, textos: {} };
    if (!o || typeof o !== 'object') return c;
    ['auto', 'pausarAlTocar', 'subtitulos'].forEach((k) => { if (typeof o[k] === 'boolean') c[k] = o[k]; });
    const s = Number(o.segundos); if (o.segundos !== '' && o.segundos != null && Number.isFinite(s)) c.segundos = Math.round(clamp(s, SEG.min, SEG.max));
    if (['parar', 'repetir'].includes(o.alTerminar)) c.alTerminar = o.alTerminar;
    if (['pie', 'arriba'].includes(o.subPos)) c.subPos = o.subPos;
    if (['normal', 'grande'].includes(o.subTam)) c.subTam = o.subTam;
    if (o.textos && typeof o.textos === 'object') {
      Object.entries(o.textos).forEach(([k, t]) => {
        const n = Number(k); if (!Number.isInteger(n) || n < 0 || n >= PASOS.length || !t || typeof t !== 'object') return;
        const x = {};
        if (typeof t.frase === 'string') x.frase = t.frase.slice(0, MAX_TXT);
        if (Array.isArray(t.subtitulos)) x.subtitulos = t.subtitulos.filter((u) => u && typeof u === 'object').slice(0, MAX_SUBS).map((u) => ({ tecnico: String(u.tecnico ?? '').slice(0, MAX_TXT), negocio: String(u.negocio ?? '').slice(0, MAX_TXT) }));
        if (Object.keys(x).length) c.textos[n] = x;
      });
    }
    return c;
  }
  const leerConf = () => normalizarConfig(ls.get(CLAVE_CONF, null));
  const guardarConf = (c) => ls.set(CLAVE_CONF, normalizarConfig(c));
  // Paso con los textos editados por este presentador encima de los del guion
  const pasoDe = (n, conf) => { const b = PASOS[n]; if (!b) return null; const t = conf.textos[n] || {}; return { ...b, frase: t.frase ?? b.frase, subtitulos: t.subtitulos ?? b.subtitulos ?? [] }; };
  // Subtítulo que toca a los `ms` de un paso que dura `durMs`: se reparten a partes iguales y el último se queda
  const cueEn = (subs, ms, durMs) => (subs.length ? clamp(Math.floor(ms / (durMs / subs.length)), 0, subs.length - 1) : -1);

  async function sha256Hex(t) {
    if (root.Cumplimiento && root.Cumplimiento.sha256) return root.Cumplimiento.sha256(t);
    if (root.crypto && root.crypto.subtle) { const b = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
    return '';
  }

  // Reloj del paso en curso (en memoria): parado · esperando (a que termine la acción) · contando · pausado · fin
  const reloj = { fase: 'parado', inicio: 0, acumulado: 0, listo: null, espera: 0, previa: '', cue: -1 };
  const durMs = (conf) => conf.segundos * 1000;
  const transcurrido = () => reloj.acumulado + (reloj.fase === 'contando' ? Date.now() - reloj.inicio : 0);
  const parar = () => { reloj.fase = 'parado'; reloj.acumulado = 0; reloj.listo = null; reloj.cue = -1; };
  // Con una ventana modal abierta todo lo de fuera queda inerte y debajo: el panel y los subtítulos se mudan a ella
  const anclar = () => {
    if (typeof document === 'undefined') return;
    const host = [...document.querySelectorAll('dialog[open]')].filter((d) => d.id !== 'rec-clave').pop() || document.body;
    ['recorrido', 'rec-subs'].forEach((id) => { const x = byId(id); if (x && x.parentElement !== host) host.appendChild(x); });
  };

  const Recorrido = {
    PASOS, acciones: {}, pagina: null, aviso: '', vista: 'pasos', edPaso: 0,
    presentador,
    // Pruebas (tests/recorrido.test.js)
    _normalizarConfig: normalizarConfig, _cueEn: cueEn, _pasoDe: pasoDe, CONF_DEF, HASH_CLAVE, sha256Hex,

    setPresentador(on) {
      if (on && !presentador()) { this.pedirClave(); return; }
      if (!on) { ss.set(CLAVE_PRES, false); const r = leerRec(); r.activo = false; r.reproduciendo = false; guardarRec(r); parar(); }
      this.pintar(); document.dispatchEvent(new CustomEvent('recorrido:presentador', { detail: on }));
    },
    activarPresentador() { ss.set(CLAVE_PRES, true); this.pintar(); document.dispatchEvent(new CustomEvent('recorrido:presentador', { detail: true })); },
    pedirClave() {
      let d = byId('rec-clave');
      if (!d) {
        d = Object.assign(document.createElement('dialog'), { id: 'rec-clave', className: 'rec-clave' });
        d.setAttribute('aria-labelledby', 'rec-clave-t'); document.body.appendChild(d);
        d.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const inp = d.querySelector('input');
          if ((await sha256Hex(inp.value)) === HASH_CLAVE) { d.close(); this.activarPresentador(); return; }
          d.querySelector('.rec-clave-err').textContent = 'Contraseña incorrecta.';
          inp.value = ''; inp.focus(); d.classList.remove('mal'); void d.offsetWidth; d.classList.add('mal');
        });
        d.addEventListener('click', (ev) => { if (ev.target.closest('[data-clave-cancelar]')) d.close(); });
      }
      d.innerHTML = `<form method="dialog"><div class="rec-clave-cab">${lucide('lock')}<h2 id="rec-clave-t">Activar el modo presentador</h2></div>
        <p>Da acceso al recorrido de la demo y a su reproducción automática.</p>
        <label>Contraseña<input type="password" autocomplete="off" required></label><p class="rec-clave-err" role="alert"></p>
        <div class="rec-fila"><button type="button" class="btn btn-sm" data-clave-cancelar>Cancelar</button><button type="submit" class="btn btn-sm btn-primary">${lucide('check')} Activar</button></div></form>`;
      d.showModal(); d.querySelector('input').focus();
    },
    empezar() { const r = leerRec(); r.activo = true; r.min = false; guardarRec(r); this.pintar(); },
    cerrar() { const r = leerRec(); r.activo = false; r.reproduciendo = false; guardarRec(r); parar(); this.pintar(); },
    ir(n) {
      const p = PASOS[n]; if (!p) return;
      const r = leerRec(); r.activo = true; r.paso = n; if (!r.vistos.includes(n)) r.vistos.push(n); guardarRec(r);
      if (p.pagina !== this.pagina) { location.href = `${PAGINA_URL[p.pagina]}#demo=${n}`; return; }
      this.aviso = ''; parar();
      const [nombre, ...args] = p.accion.split(':');
      const fn = this.acciones[nombre];
      // Fuera del clic en curso: así un popover que abra el paso no lo cierra el propio clic al terminar.
      // La acción devuelve un aviso (texto) o { aviso, listo }: con «listo», la cuenta del paso espera a que se cumpla.
      setTimeout(() => {
        let res; try { res = fn ? fn(...args) : ''; } catch (e) { res = `No se pudo ejecutar el paso: ${e.message}`; }
        const o = res && typeof res === 'object' ? res : { aviso: res };
        this.aviso = typeof o.aviso === 'string' ? o.aviso : '';
        this.arrancar(typeof o.listo === 'function' ? o.listo : null);
        this.pintar();
      }, 0);
    },
    arrancar(listo) {
      parar();
      if (listo && !listo()) Object.assign(reloj, { fase: 'esperando', listo, espera: Date.now() });
      else Object.assign(reloj, { fase: 'contando', inicio: Date.now() });
    },
    avanzar() {
      const r = leerRec(); const conf = leerConf();
      if (r.paso < PASOS.length - 1) return this.ir(r.paso + 1);
      if (conf.alTerminar === 'repetir') { r.vistos = []; guardarRec(r); return this.ir(0); }
      r.reproduciendo = false; guardarRec(r); this.aviso = 'Fin del recorrido.'; this.pintar();
    },
    reproducir() {
      const r = leerRec(); r.reproduciendo = true; guardarRec(r); this.aviso = '';
      if (reloj.fase === 'pausado') { reloj.fase = reloj.previa; if (reloj.fase === 'contando') reloj.inicio = Date.now(); return this.pintar(); }
      if (reloj.fase === 'contando' || reloj.fase === 'esperando') return this.pintar();
      if (reloj.fase === 'fin') return this.avanzar();
      this.ir(r.paso);
    },
    pausar(motivo = '') {
      const r = leerRec(); if (!r.reproduciendo) return;
      r.reproduciendo = false; guardarRec(r);
      if (reloj.fase === 'contando') reloj.acumulado += Date.now() - reloj.inicio;
      if (reloj.fase === 'contando' || reloj.fase === 'esperando') { reloj.previa = reloj.fase; reloj.fase = 'pausado'; }
      this.aviso = motivo; this.pintar();
    },
    // Mueve el reloj del paso a una fracción de su duración (tirador de la barra de progreso) y ajusta el subtítulo.
    // Si el paso ya había terminado, vuelve a contar desde ese punto; la demo automática sigue si estaba en marcha.
    buscar(frac) {
      if (!['contando', 'pausado', 'fin'].includes(reloj.fase)) return;
      const conf = leerConf();
      reloj.acumulado = clamp(frac, 0, 0.999) * durMs(conf);
      if (reloj.fase === 'fin') reloj.fase = 'contando';
      if (reloj.fase === 'contando') reloj.inicio = Date.now();
      reloj.cue = -1; this.vivo(conf, leerRec());
    },
    tick() {
      const r = leerRec(); if (!presentador() || !r.activo) return;
      const conf = leerConf();
      if (reloj.fase === 'esperando' && (!reloj.listo || reloj.listo() || Date.now() - reloj.espera > ESPERA_MAX)) Object.assign(reloj, { fase: 'contando', inicio: Date.now(), acumulado: 0, listo: null });
      if (reloj.fase === 'contando' && transcurrido() >= durMs(conf)) {
        reloj.acumulado = durMs(conf); reloj.fase = 'fin';
        if (r.reproduciendo) { this.avanzar(); return; }
      }
      this.vivo(conf, r);
    },
    // Partes que cambian cada segundo (barra de progreso, cuenta atrás y subtítulo) sin repintar el panel
    vivo(conf, r) {
      const el = byId('recorrido');
      if (el) {
        const D = durMs(conf); const t = transcurrido(); const ultimo = r.paso >= PASOS.length - 1;
        const pct = ['contando', 'pausado', 'fin'].includes(reloj.fase) ? clamp(t / D, 0, 1) * 100 : 0;
        const activo = ['contando', 'pausado', 'fin'].includes(reloj.fase);
        el.querySelectorAll('.rec-prog').forEach((b) => {
          b.querySelector('i').style.width = `${pct}%`; b.querySelector('.rec-tirador').style.left = `${pct}%`;
          b.classList.toggle('activo', activo); b.setAttribute('aria-valuenow', String(Math.round(pct)));
          b.setAttribute('aria-valuetext', activo ? `${mmss(t)} de ${mmss(D)}` : 'Sin paso en curso');
        });
        const txt = {
          esperando: 'Esperando a que termine el paso…',
          contando: r.reproduciendo ? `${ultimo && conf.alTerminar === 'parar' ? 'Fin' : 'Siguiente pantalla'} en ${mmss(D - t)}` : `Paso en curso · ${mmss(t)} de ${mmss(D)}`,
          pausado: `En pausa · quedan ${mmss(D - t)}`,
          fin: r.reproduciendo ? '' : 'Paso completado',
        }[reloj.fase] || '';
        el.querySelectorAll('.rec-estado').forEach((x) => { if (x.textContent !== txt) x.textContent = txt; });
        el.querySelectorAll('.rec-cuenta').forEach((x) => { const c = reloj.fase === 'contando' || reloj.fase === 'pausado' ? mmss(D - t) : reloj.fase === 'esperando' ? '…' : ''; if (x.textContent !== c) x.textContent = c; });
      }
      this.pintarSubs(conf, r);
    },
    pintarSubs(conf = leerConf(), r = leerRec()) {
      let s = byId('rec-subs');
      const p = pasoDe(r.paso, conf); const subs = ((p && p.subtitulos) || []).filter((u) => u.tecnico || u.negocio);
      const ver = presentador() && r.activo && conf.subtitulos && subs.length && reloj.fase !== 'parado';
      if (!ver) { if (s) s.remove(); reloj.cue = -1; return; }
      const k = reloj.fase === 'esperando' ? 0 : cueEn(subs, transcurrido(), durMs(conf));
      if (!s) { s = Object.assign(document.createElement('div'), { id: 'rec-subs' }); s.setAttribute('role', 'status'); s.setAttribute('aria-live', 'polite'); document.body.appendChild(s); anclar(); }
      s.className = `rec-subs pos-${conf.subPos} tam-${conf.subTam}${s.classList.contains('entra') ? ' entra' : ''}`;
      if (k === reloj.cue && s.dataset.paso === String(r.paso)) return;
      reloj.cue = k; s.dataset.paso = String(r.paso);
      const u = subs[k];
      s.innerHTML = `<div class="rs-cab">Paso ${r.paso + 1} · ${escR(p.titulo)}${subs.length > 1 ? ` · ${k + 1}/${subs.length}` : ''}</div>
        ${u.tecnico ? `<p class="rs-tec">${lucide('cpu')}<span>${escR(u.tecnico)}</span></p>` : ''}${u.negocio ? `<p class="rs-neg">${lucide('shield-check')}<span>${escR(u.negocio)}</span></p>` : ''}`;
      s.classList.remove('entra'); void s.offsetWidth; s.classList.add('entra');
    },
    // Posición guardada del panel, siempre dentro de la pantalla; minimizado va acoplado al pie
    posicionar() {
      const el = byId('recorrido'); if (!el) return;
      const pos = ls.get(CLAVE_POS, null);
      if (el.classList.contains('min') || !pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) { ['left', 'top', 'right', 'bottom'].forEach((k) => el.style.removeProperty(k)); return; }
      const x = clamp(pos.x, 8, Math.max(8, innerWidth - el.offsetWidth - 8));
      const y = clamp(pos.y, 8, Math.max(8, innerHeight - el.offsetHeight - 8));
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
    },
    pintar() {
      if (typeof document === 'undefined') return;
      let el = byId('recorrido');
      const r = leerRec(); const conf = leerConf();
      if (!presentador() || !r.activo) { if (el) el.remove(); const s = byId('rec-subs'); if (s) s.remove(); return; }
      if (!el) { el = Object.assign(document.createElement('aside'), { id: 'recorrido', className: 'recorrido' }); el.setAttribute('aria-label', 'Recorrido de la demo'); document.body.appendChild(el); }
      const scroll = (el.querySelector('.rec-cuerpo') || {}).scrollTop || 0;
      const cfg = this.vista === 'config' && !r.min;
      el.classList.toggle('min', !!r.min); el.classList.toggle('cfg', cfg);
      const p = pasoDe(r.paso, conf); const N = PASOS.length;
      const play = conf.auto ? `<button type="button" class="rec-btn rec-play" data-rec="${r.reproduciendo ? 'pausa' : 'play'}" title="${r.reproduciendo ? 'Pausar la demo' : 'Reproducir la demo automática'}" aria-label="${r.reproduciendo ? 'Pausar' : 'Reproducir'}">${lucide(r.reproduciendo ? 'pause' : 'play')}</button>` : '';
      if (r.min) {
        el.innerHTML = `<div class="rec-prog" role="slider" tabindex="0" aria-label="Posición dentro del paso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" title="Arrastra o pulsa para ir hacia atrás o hacia delante dentro del paso"><i></i><b class="rec-tirador"></b></div><div class="rec-cab rec-cab-min">
            <button type="button" class="rec-min-txt" data-rec="restaurar" title="Desplegar el recorrido">${lucide('route')}<span class="rec-min-pos">${r.paso + 1}/${N}</span><span class="rec-min-t">${escR(p.titulo)}</span></button>
            ${this.aviso ? `<span class="rec-min-aviso" title="${escR(this.aviso)}" role="img" aria-label="${escR(this.aviso)}">${lucide('circle-alert')}</span>` : ''}<span class="rec-cuenta"></span><button type="button" class="rec-btn" data-rec="ant" title="Paso anterior" aria-label="Paso anterior" ${r.paso ? '' : 'disabled'}>${lucide('chevron-left')}</button>${play}<button type="button" class="rec-btn" data-rec="sig" title="Paso siguiente" aria-label="Paso siguiente" ${r.paso < N - 1 ? '' : 'disabled'}>${lucide('chevron-right')}</button>
            <button type="button" class="rec-btn" data-rec="restaurar" title="Desplegar" aria-label="Desplegar">${lucide('chevron-up')}</button>
            <button type="button" class="rec-btn" data-rec="cerrar" title="Cerrar el recorrido" aria-label="Cerrar el recorrido">${lucide('x')}</button></div>`;
      } else {
        el.innerHTML = `<div class="rec-cab" title="Arrastra para mover · doble clic para devolverlo a su sitio"><b>${lucide('route')} Recorrido de la demo</b><span class="rec-pos" title="Paso ${r.paso + 1} de ${N}">${r.paso + 1} / ${N}</span>${play}
            <button type="button" class="rec-btn" data-rec="config" title="Configuración" aria-label="Configuración" aria-pressed="${cfg}">${lucide('settings')}</button>
            <button type="button" class="rec-btn" data-rec="minimizar" title="Minimizar al pie" aria-label="Minimizar">${lucide('minus')}</button>
            <button type="button" class="rec-btn" data-rec="cerrar" title="Cerrar el recorrido" aria-label="Cerrar el recorrido">${lucide('x')}</button></div>
          <div class="rec-prog" role="slider" tabindex="0" aria-label="Posición dentro del paso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" title="Arrastra o pulsa para ir hacia atrás o hacia delante dentro del paso"><i></i><b class="rec-tirador"></b></div><div class="rec-estado" aria-live="off"></div>
          <div class="rec-cuerpo">${cfg ? this.htmlConfig(conf) : this.htmlPasos(conf, r, p)}</div>`;
        el.querySelector('.rec-cuerpo').scrollTop = scroll;
      }
      anclar(); this.posicionar(); this.vivo(conf, r);
    },
    htmlPasos(conf, r, p) {
      const N = PASOS.length;
      return `<div class="rec-actual"><span class="rec-min">${escR(p.min)} min · ${p.pagina === 'triaje' ? 'Triaje' : 'Gobierno'}</span><b>${escR(p.titulo)}</b><p>${escR(p.que)}</p><p class="rec-frase">«${escR(p.frase)}»</p>${this.aviso ? `<p class="rec-aviso">${lucide('circle-alert')} ${escR(this.aviso)}</p>` : ''}
          <div class="rec-nav"><button type="button" class="btn btn-sm" data-rec="ant" ${r.paso ? '' : 'disabled'}>${lucide('chevron-left')} Anterior</button><button type="button" class="btn btn-sm btn-primary" data-rec-ir="${r.paso}">${lucide('play')} Ir</button><button type="button" class="btn btn-sm" data-rec="sig" ${r.paso < N - 1 ? '' : 'disabled'}>Siguiente ${lucide('chevron-right')}</button></div></div>
        <ol class="rec-lista">${PASOS.map((x, i) => `<li class="${i === r.paso ? 'is-actual' : ''}${r.vistos.includes(i) ? ' is-visto' : ''}"><button type="button" data-rec-ir="${i}"><span class="rec-check">${r.vistos.includes(i) ? lucide('check') : i + 1}</span><span class="rec-t">${escR(x.titulo)}</span><span class="rec-m">${escR(x.min)}</span></button></li>`).join('')}</ol>
        <button type="button" class="rec-reset" data-rec="reiniciar">${lucide('rotate-ccw')} Empezar de nuevo</button>`;
    },
    htmlConfig(conf) {
      const n = clamp(this.edPaso, 0, PASOS.length - 1); const p = pasoDe(n, conf);
      const opt = (v, l, cur) => `<option value="${escR(v)}"${String(v) === String(cur) ? ' selected' : ''}>${escR(l)}</option>`;
      const chk = (k, l, sub) => `<label class="rec-chk"><input type="checkbox" data-conf="${k}"${conf[k] ? ' checked' : ''}><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</label>`;
      return `<div class="rec-conf">
        <div class="rec-conf-cab"><button type="button" class="rec-volver" data-rec="pasos">${lucide('chevron-left')} Pasos</button><b>Configuración</b></div>
        <fieldset><legend>Reproducción</legend>
          ${chk('auto', 'Demo automática', 'Añade ▶ / ⏸ a la cabecera y pasa sola de una pantalla a la siguiente')}
          <label class="rec-campo">Tiempo por pantalla <span><input type="number" min="${SEG.min}" max="${SEG.max}" step="5" value="${conf.segundos}" data-conf="segundos"> s</span></label>
          <small>El mismo para todas las pantallas (de ${SEG.min} a ${SEG.max} s). «Procesar el Paquete A» empieza a contar cuando termina el lote.</small>
          <label class="rec-campo">Al terminar <select data-conf="alTerminar">${opt('parar', 'Parar', conf.alTerminar)}${opt('repetir', 'Volver a empezar', conf.alTerminar)}</select></label>
          ${chk('pausarAlTocar', 'Pausar si toco la pantalla', 'Un clic o una tecla fuera del recorrido pausa la demo')}
        </fieldset>
        <fieldset><legend>Subtítulos</legend>
          ${chk('subtitulos', 'Mostrar subtítulos', 'Qué hace cada función y cómo ayuda al negocio a cumplir')}
          <label class="rec-campo">Posición <select data-conf="subPos">${opt('pie', 'Pie de pantalla', conf.subPos)}${opt('arriba', 'Parte superior', conf.subPos)}</select></label>
          <label class="rec-campo">Tamaño <select data-conf="subTam">${opt('normal', 'Normal', conf.subTam)}${opt('grande', 'Grande', conf.subTam)}</select></label>
        </fieldset>
        <fieldset><legend>Textos del guion</legend>
          <small>${lucide('lock')} Solo los ves tú: se guardan en este navegador.</small>
          <label class="rec-campo">Paso <select data-ed-paso>${PASOS.map((x, i) => opt(i, `${i + 1}. ${x.titulo}${conf.textos[i] ? ' · editado' : ''}`, n)).join('')}</select></label>
          <label class="rec-campo rec-col">Frase clave<input type="text" maxlength="${MAX_TXT}" data-ed="frase" value="${escR(p.frase)}"></label>
          ${p.subtitulos.map((u, k) => `<div class="rec-cue"><div class="rec-cue-cab"><b>Subtítulo ${k + 1}</b><button type="button" class="rec-btn" data-rec="quitar-cue" data-k="${k}" title="Quitar este subtítulo" aria-label="Quitar el subtítulo ${k + 1}">${lucide('trash-2')}</button></div>
            <label><span>${lucide('cpu')} Técnico-funcional</span><textarea rows="2" maxlength="${MAX_TXT}" data-ed-cue="${k}" data-campo="tecnico">${escR(u.tecnico)}</textarea></label>
            <label><span>${lucide('shield-check')} Negocio y cumplimiento</span><textarea rows="2" maxlength="${MAX_TXT}" data-ed-cue="${k}" data-campo="negocio">${escR(u.negocio)}</textarea></label></div>`).join('')}
          ${p.subtitulos.length < MAX_SUBS ? `<button type="button" class="btn btn-sm" data-rec="add-cue">${lucide('plus')} Añadir subtítulo</button>` : ''}
          <div class="rec-fila"><button type="button" class="btn btn-sm" data-rec="restaurar-paso" ${conf.textos[n] ? '' : 'disabled'}>${lucide('rotate-ccw')} Restaurar este paso</button><button type="button" class="btn btn-sm" data-rec="restaurar-todo" ${Object.keys(conf.textos).length ? '' : 'disabled'}>Restaurar todos</button></div>
          <div class="rec-fila"><button type="button" class="btn btn-sm" data-rec="exportar">${lucide('download')} Exportar JSON</button><label class="btn btn-sm">${lucide('upload')} Importar JSON<input type="file" accept="application/json,.json" data-rec-importar hidden></label></div>
          <p class="rec-conf-msg" role="status"></p>
        </fieldset></div>`;
    },
    // Lee del editor el paso que se está editando y lo guarda como textos propios de este presentador
    guardarTextos() {
      const el = byId('recorrido'); if (!el) return;
      const conf = leerConf(); const n = this.edPaso;
      const subs = []; el.querySelectorAll('[data-ed-cue]').forEach((t) => { const k = Number(t.dataset.edCue); subs[k] = subs[k] || { tecnico: '', negocio: '' }; subs[k][t.dataset.campo] = t.value; });
      conf.textos[n] = { frase: (el.querySelector('[data-ed="frase"]') || {}).value ?? pasoDe(n, conf).frase, subtitulos: subs.filter(Boolean) };
      guardarConf(conf);
      if (leerRec().paso === n) { reloj.cue = -1; this.pintarSubs(); }
    },
    mensajeConf(t) { const m = document.querySelector('#recorrido .rec-conf-msg'); if (m) m.textContent = t; },
    exportar() {
      const conf = leerConf();
      const blob = new Blob([JSON.stringify({ recorrido: 'fnol-triage', exportado: new Date().toISOString(), ...conf }, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'recorrido-demo.json' });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    importar(file) {
      file.text().then((txt) => {
        const o = JSON.parse(txt); if (!o || typeof o !== 'object') throw new Error('no es un objeto');
        guardarConf({ ...leerConf(), ...o }); reloj.cue = -1; this.pintar();
        this.mensajeConf('Configuración y textos importados.');
      }).catch((e) => this.mensajeConf(`No se pudo importar: ${e.message}`));
    },
    init(acciones = {}) {
      this.acciones = acciones;
      this.pagina = (document.querySelector('.shell') || {}).dataset ? document.querySelector('.shell').dataset.pagina : null;
      ls.del(CLAVE_PRES);   // la antigua preferencia permanente del modo presentador: ahora pide contraseña en cada sesión
      document.addEventListener('click', (ev) => {
        const ir = ev.target.closest('[data-rec-ir]'); if (ir) { this.ir(Number(ir.dataset.recIr)); return; }
        const b = ev.target.closest('[data-rec]'); if (!b) return;
        const r = leerRec(); const conf = leerConf(); const a = b.dataset.rec;
        if (a === 'cerrar') return this.cerrar();
        if (a === 'minimizar' || a === 'restaurar') { r.min = a === 'minimizar'; guardarRec(r); return this.pintar(); }
        if (a === 'config') { this.vista = this.vista === 'config' ? 'pasos' : 'config'; this.edPaso = r.paso; return this.pintar(); }
        if (a === 'pasos') { this.vista = 'pasos'; return this.pintar(); }
        if (a === 'play') return this.reproducir();
        if (a === 'pausa') return this.pausar('');
        if (a === 'ant' || a === 'sig') {
          const n = r.paso + (a === 'ant' ? -1 : 1); if (n < 0 || n >= PASOS.length) return;
          if (r.reproduciendo) return this.ir(n);
          r.paso = n; guardarRec(r); this.aviso = ''; parar(); return this.pintar();
        }
        if (a === 'reiniciar') { guardarRec({ activo: true, paso: 0, vistos: [], min: false, reproduciendo: false }); this.aviso = ''; parar(); return this.pintar(); }
        if (a === 'add-cue' || a === 'quitar-cue') {
          this.guardarTextos(); const c = leerConf(); const t = c.textos[this.edPaso] || { subtitulos: pasoDe(this.edPaso, c).subtitulos };
          t.subtitulos = (t.subtitulos || []).slice();
          if (a === 'add-cue') t.subtitulos.push({ tecnico: '', negocio: '' }); else t.subtitulos.splice(Number(b.dataset.k), 1);
          c.textos[this.edPaso] = t; guardarConf(c); reloj.cue = -1; return this.pintar();
        }
        if (a === 'restaurar-paso') { delete conf.textos[this.edPaso]; guardarConf(conf); reloj.cue = -1; this.pintar(); return this.mensajeConf('Paso restaurado con los textos del guion.'); }
        if (a === 'restaurar-todo') { if (!confirm('¿Restaurar todos los textos del guion? Se pierden tus cambios.')) return; conf.textos = {}; guardarConf(conf); reloj.cue = -1; this.pintar(); return this.mensajeConf('Todos los textos restaurados.'); }
        if (a === 'exportar') return this.exportar();
      });
      document.addEventListener('input', (ev) => { if (ev.target.closest && ev.target.closest('#recorrido [data-ed], #recorrido [data-ed-cue]')) this.guardarTextos(); });
      document.addEventListener('change', (ev) => {
        const t = ev.target; if (!t.closest || !t.closest('#recorrido')) return;
        if (t.matches('[data-ed-paso]')) { this.edPaso = Number(t.value); return this.pintar(); }
        if (t.matches('[data-rec-importar]')) { if (t.files[0]) this.importar(t.files[0]); return; }
        if (!t.matches('[data-conf]')) return;
        const conf = leerConf(); const k = t.dataset.conf;
        conf[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
        guardarConf(conf);
        if (k === 'auto' && !t.checked) this.pausar('');
        reloj.cue = -1; this.pintar();
      });
      // Arrastrar el panel por la cabecera (doble clic: vuelve a su sitio)
      document.addEventListener('pointerdown', (ev) => {
        const cab = ev.target.closest && ev.target.closest('#recorrido:not(.min) .rec-cab');
        if (!cab || ev.button !== 0 || ev.target.closest('button, input, select, textarea, label')) return;
        const el = byId('recorrido'); const b0 = el.getBoundingClientRect(); const dx = ev.clientX - b0.left; const dy = ev.clientY - b0.top;
        el.classList.add('arrastrando'); cab.setPointerCapture(ev.pointerId); ev.preventDefault();
        const mover = (e) => Object.assign(el.style, { left: `${clamp(e.clientX - dx, 8, innerWidth - el.offsetWidth - 8)}px`, top: `${clamp(e.clientY - dy, 8, innerHeight - 48)}px`, right: 'auto', bottom: 'auto' });
        const soltar = () => { cab.removeEventListener('pointermove', mover); el.classList.remove('arrastrando'); const b = el.getBoundingClientRect(); ls.set(CLAVE_POS, { x: Math.round(b.left), y: Math.round(b.top) }); this.posicionar(); };
        cab.addEventListener('pointermove', mover); cab.addEventListener('pointerup', soltar, { once: true }); cab.addEventListener('pointercancel', soltar, { once: true });
      });
      // Tirador de la barra de progreso: clic o arrastre para ir hacia atrás o hacia delante; flechas ±5 s, Inicio al principio
      document.addEventListener('pointerdown', (ev) => {
        const barra = ev.target.closest && ev.target.closest('#recorrido .rec-prog.activo');
        if (!barra || ev.button !== 0) return;
        ev.preventDefault(); barra.setPointerCapture(ev.pointerId); barra.classList.add('moviendo');
        const mover = (e) => { const b = barra.getBoundingClientRect(); this.buscar((e.clientX - b.left) / b.width); };
        mover(ev);
        barra.addEventListener('pointermove', mover);
        const fin = () => { barra.removeEventListener('pointermove', mover); barra.classList.remove('moviendo'); };
        barra.addEventListener('pointerup', fin, { once: true }); barra.addEventListener('pointercancel', fin, { once: true });
      });
      document.addEventListener('keydown', (ev) => {
        const barra = ev.target.closest && ev.target.closest('#recorrido .rec-prog.activo'); if (!barra) return;
        const salto = { ArrowLeft: -5000, ArrowRight: 5000 }[ev.key];
        if (salto) { ev.preventDefault(); this.buscar((transcurrido() + salto) / durMs(leerConf())); } else if (ev.key === 'Home') { ev.preventDefault(); this.buscar(0); }
      });
      document.addEventListener('dblclick', (ev) => { if (ev.target.closest && ev.target.closest('#recorrido:not(.min) .rec-cab') && !ev.target.closest('button')) { ls.del(CLAVE_POS); this.posicionar(); } });
      addEventListener('resize', () => this.posicionar());
      // Pausar si el presentador toca la pantalla: solo interacciones reales (los clics que hace la propia demo no cuentan)
      const tocar = (ev) => {
        if (!ev.isTrusted || !leerRec().reproduciendo || !leerConf().pausarAlTocar) return;
        if (ev.target && ev.target.closest && ev.target.closest('#recorrido, #rec-subs, #rec-clave')) return;
        this.pausar('En pausa porque has tocado la pantalla. Pulsa ▶ para seguir.');
      };
      document.addEventListener('pointerdown', tocar, true); document.addEventListener('keydown', tocar, true);
      // Ventanas modales que se abren o se cierran: el panel y los subtítulos van con la de encima
      new MutationObserver(anclar).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'] });
      setInterval(() => this.tick(), 250);
      // Llegada desde la otra página con «#demo=N»: se ejecuta el paso cuando la página ya está pintada
      const m = location.hash.match(/demo=(\d+)/);
      if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => this.ir(Number(m[1])), 350); }
      else { const r = leerRec(); if (presentador() && r.activo && r.reproduciendo) this.arrancar(null); }
      this.pintar();
    },
  };

  root.Shell = { USUARIO, initShell, Recorrido };
})(typeof window !== 'undefined' ? window : globalThis);
