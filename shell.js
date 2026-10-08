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
  // Recorrido de la demo (modo presentador): pasos del guion de 12 minutos con un botón «Ir» que lleva a la
  // pantalla exacta, aunque esté en la otra página. Se activa con el interruptor «Modo presentador» de Inicio.
  // ---------------------------------------------------------------------------
  const PAGINA_URL = { triaje: 'index.html', gobierno: 'gobierno.html' };
  const PASOS = [
    { min: '0–2', pagina: 'triaje', titulo: 'Las seis fases del proceso', que: 'Recorrer las seis fases numeradas (clic en cada una para ver su ficha)', frase: 'Así funciona el proceso de punta a punta', accion: 'fases' },
    { min: '2–4', pagina: 'triaje', titulo: 'Procesar el Paquete A', que: 'Contadores y registro en vivo; pausar y continuar a mitad', frase: 'Aprobados y a revisar en segundos', accion: 'procesar' },
    { min: '4–5', pagina: 'triaje', titulo: 'Ficha de un «A revisar» (MSG-A-08)', que: 'Regla que incumple y evidencias resaltadas: al pasar el ratón, el título cambia al tipo de evidencia', frase: 'Cada decisión es explicable', accion: 'ficha:MSG-A-08:mensaje' },
    { min: '5–6', pagina: 'gobierno', titulo: 'Resumen y agentes', que: 'Inicio → Resumen (KPI y alertas de todas las fuentes) → Agentes: ficha de Reglas y kill switch', frase: 'Control total y parada inmediata', accion: 'agentes' },
    { min: '6–7', pagina: 'gobierno', titulo: 'Trazabilidad y Reasoning & Replay', que: 'Waterfall de una traza y replay What-if con gpt-5-mini', frase: 'Auditamos y probamos antes de cambiar', accion: 'goto:replay' },
    { min: '7–8', pagina: 'gobierno', titulo: 'Autonomía y guardrails', que: 'Niveles L0-L3 y los guardrails G-02 (importe) y G-04 (lesionados)', frase: 'Autonomía graduada con límites claros', accion: 'goto:guardrails' },
    { min: '8–8:30', pagina: 'triaje', titulo: 'Respuesta cruda de MSG-A-12', que: 'Bloque _gobernanza: datos de un menor y de salud, por qué Salud y no Auto ni Hogar, hash y retención', frase: 'El modelo no se autocertifica: la plataforma deja la prueba en cada decisión', accion: 'ficha:MSG-A-12:json' },
    { min: '8:30–9', pagina: 'gobierno', titulo: 'Termómetro de cumplimiento', que: 'Termómetros, controles en ámbar, inventario de datos personales y «Simular una alteración»', frase: 'La solución deja a la aseguradora en condiciones de demostrar que cumple', accion: 'goto:cumplimiento' },
    { min: '9–10', pagina: 'gobierno', titulo: 'Knowledge bases', que: 'Condicionados Auto degradada por 340 documentos de 2024: comparativa de configuraciones y «Aplicar»', frase: 'El conocimiento también se degrada, y se vigila igual que los agentes', accion: 'kb:KB-02:comparativa' },
    { min: '10–12', pagina: 'gobierno', titulo: 'FinOps e Histórico', que: 'Cap superado, recomendaciones y la línea de tiempo con todo lo tocado en la demo', frase: 'Coste bajo control y todo auditado', accion: 'goto:finops' },
  ];
  const CLAVE_PRES = 'demo.presentador';    // preferencia (localStorage): el modo presentador está activado
  const CLAVE_REC = 'demo.recorrido';       // estado del recorrido en esta sesión: { activo, paso, vistos, plegado }
  const leerRec = () => { try { return { activo: false, paso: 0, vistos: [], plegado: false, ...JSON.parse(sessionStorage.getItem(CLAVE_REC) || '{}') }; } catch { return { activo: false, paso: 0, vistos: [], plegado: false }; } };
  const guardarRec = (r) => { try { sessionStorage.setItem(CLAVE_REC, JSON.stringify(r)); } catch { /* sin almacenamiento */ } };
  const presentador = () => { try { return localStorage.getItem(CLAVE_PRES) === '1'; } catch { return false; } };
  const escR = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const Recorrido = {
    PASOS, acciones: {}, pagina: null, aviso: '',
    presentador,
    setPresentador(on) {
      try { localStorage.setItem(CLAVE_PRES, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
      if (!on) { const r = leerRec(); r.activo = false; guardarRec(r); }
      this.pintar(); document.dispatchEvent(new CustomEvent('recorrido:presentador', { detail: on }));
    },
    empezar() { const r = leerRec(); r.activo = true; r.plegado = false; guardarRec(r); this.pintar(); },
    cerrar() { const r = leerRec(); r.activo = false; guardarRec(r); this.pintar(); },
    ir(n) {
      const p = PASOS[n]; if (!p) return;
      const r = leerRec(); r.activo = true; r.paso = n; if (!r.vistos.includes(n)) r.vistos.push(n); guardarRec(r);
      if (p.pagina !== this.pagina) { location.href = `${PAGINA_URL[p.pagina]}#demo=${n}`; return; }
      this.aviso = '';
      const [nombre, ...args] = p.accion.split(':');
      const fn = this.acciones[nombre];
      // Fuera del clic en curso: así un popover que abra el paso no lo cierra el propio clic al terminar
      setTimeout(() => {
        try { const msg = fn ? fn(...args) : ''; this.aviso = typeof msg === 'string' ? msg : ''; } catch (e) { this.aviso = `No se pudo ejecutar el paso: ${e.message}`; }
        this.pintar();
      }, 0);
    },
    pintar() {
      let el = document.getElementById('recorrido');
      const r = leerRec();
      if (!presentador() || !r.activo) { if (el) el.remove(); return; }
      if (!el) { el = Object.assign(document.createElement('aside'), { id: 'recorrido', className: 'recorrido' }); el.setAttribute('aria-label', 'Recorrido de la demo'); document.body.appendChild(el); }
      el.classList.toggle('plegado', !!r.plegado);
      const p = PASOS[r.paso];
      el.innerHTML = `<div class="rec-cab"><b>${lucide('route')} Recorrido de la demo</b><span class="rec-pos">Paso ${r.paso + 1} de ${PASOS.length}</span>
          <button type="button" class="rec-btn" data-rec="plegar" title="${r.plegado ? 'Desplegar' : 'Plegar'}" aria-label="${r.plegado ? 'Desplegar' : 'Plegar'}">${lucide(r.plegado ? 'chevron-up' : 'chevron-down')}</button>
          <button type="button" class="rec-btn" data-rec="cerrar" title="Cerrar el recorrido" aria-label="Cerrar el recorrido">${lucide('x')}</button></div>
        <div class="rec-cuerpo">
          <div class="rec-actual"><span class="rec-min">${escR(p.min)} min · ${p.pagina === 'triaje' ? 'Triaje' : 'Gobierno'}</span><b>${escR(p.titulo)}</b><p>${escR(p.que)}</p><p class="rec-frase">«${escR(p.frase)}»</p>${this.aviso ? `<p class="rec-aviso">${lucide('circle-alert')} ${escR(this.aviso)}</p>` : ''}
            <div class="rec-nav"><button type="button" class="btn btn-sm" data-rec="ant" ${r.paso ? '' : 'disabled'}>${lucide('chevron-left')} Anterior</button><button type="button" class="btn btn-sm btn-primary" data-rec-ir="${r.paso}">${lucide('play')} Ir</button><button type="button" class="btn btn-sm" data-rec="sig" ${r.paso < PASOS.length - 1 ? '' : 'disabled'}>Siguiente ${lucide('chevron-right')}</button></div></div>
          <ol class="rec-lista">${PASOS.map((x, i) => `<li class="${i === r.paso ? 'is-actual' : ''}${r.vistos.includes(i) ? ' is-visto' : ''}"><button type="button" data-rec-ir="${i}"><span class="rec-check">${r.vistos.includes(i) ? lucide('check') : i + 1}</span><span class="rec-t">${escR(x.titulo)}</span><span class="rec-m">${escR(x.min)}</span></button></li>`).join('')}</ol>
          <button type="button" class="rec-reset" data-rec="reiniciar">${lucide('rotate-ccw')} Empezar de nuevo</button>
        </div>`;
    },
    init(acciones = {}) {
      this.acciones = acciones;
      this.pagina = (document.querySelector('.shell') || {}).dataset ? document.querySelector('.shell').dataset.pagina : null;
      document.addEventListener('click', (ev) => {
        const ir = ev.target.closest('[data-rec-ir]'); if (ir) { this.ir(Number(ir.dataset.recIr)); return; }
        const b = ev.target.closest('[data-rec]'); if (!b) return;
        const r = leerRec();
        if (b.dataset.rec === 'cerrar') return this.cerrar();
        if (b.dataset.rec === 'plegar') { r.plegado = !r.plegado; guardarRec(r); return this.pintar(); }
        if (b.dataset.rec === 'ant' && r.paso > 0) { r.paso -= 1; guardarRec(r); this.aviso = ''; return this.pintar(); }
        if (b.dataset.rec === 'sig' && r.paso < PASOS.length - 1) { r.paso += 1; guardarRec(r); this.aviso = ''; return this.pintar(); }
        if (b.dataset.rec === 'reiniciar') { guardarRec({ activo: true, paso: 0, vistos: [], plegado: false }); this.aviso = ''; return this.pintar(); }
      });
      // Llegada desde la otra página con «#demo=N»: se ejecuta el paso cuando la página ya está pintada
      const m = location.hash.match(/demo=(\d+)/);
      if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => this.ir(Number(m[1])), 350); }
      this.pintar();
    },
  };

  root.Shell = { USUARIO, initShell, Recorrido };
})(typeof window !== 'undefined' ? window : globalThis);
