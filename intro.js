// Introducción (intro.html): cinco secciones en una sola página (la idea, el problema, la solución, los actores y la
// demo), una visible cada vez y con su propio enlace (#intro, #problema, #solucion, #actores, #demo). Mismo marco que
// el triaje y el gobierno (menú lateral de shell.js) y altura real de la cabecera para que el menú quede pegado debajo
// aunque el título ocupe varias líneas.
(function () {
  'use strict';
  const ajustar = () => {
    const topbar = document.querySelector('.topbar');
    if (topbar) document.documentElement.style.setProperty('--top-h', `${topbar.offsetHeight}px`);
  };
  ajustar();
  addEventListener('resize', ajustar);

  const secciones = [...document.querySelectorAll('.intro-sec')];
  const ids = secciones.map((s) => s.dataset.sec);
  const sub = document.getElementById('intro-sub');
  const mostrar = (id, { scroll = true } = {}) => {
    if (!ids.includes(id)) id = ids[0];
    const n = ids.indexOf(id);
    secciones.forEach((s) => { s.hidden = s.dataset.sec !== id; });
    document.querySelectorAll('.nav-item[data-sec]').forEach((a) => {
      const activo = a.dataset.sec === id;
      a.classList.toggle('is-active', activo);
      if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const titulo = secciones[n].dataset.titulo;
    if (sub) sub.textContent = I18N.t('intro.introduccion_de', { v: n + 1, ids: ids.length, titulo });
    document.title = `FNOL — ${titulo}`;
    // «#demo=N» (llegada desde otra página del recorrido) lo consume shell.js: no se pisa
    if (location.hash !== `#${id}` && !/demo=\d+/.test(location.hash)) history.replaceState(null, '', `#${id}`);
    ajustar();
    if (scroll) window.scrollTo({ top: 0 });
  };
  // Los enlaces del menú y de «Anterior / Siguiente» cambian el hash; atrás y adelante del navegador también
  addEventListener('hashchange', () => { if (!/demo=\d+/.test(location.hash)) mostrar(location.hash.slice(1)); });
  mostrar(location.hash.slice(1), { scroll: false });

  Shell.initShell();
  // Recorrido de la demo (modo presentador): las cuatro últimas secciones son los cuatro primeros pasos (#intro no tiene paso); «Ir» abre la sección
  Shell.Recorrido.init({
    inicio: () => { window.scrollTo({ top: 0 }); return ''; },
    sec: (id) => { mostrar(id); return ''; },
  });
})();
