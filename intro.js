// Páginas de introducción: mismo marco que el triaje y el gobierno (menú lateral de shell.js) y altura real de la
// cabecera para que el menú quede pegado debajo aunque el título ocupe varias líneas.
(function () {
  'use strict';
  const ajustar = () => {
    const topbar = document.querySelector('.topbar');
    if (topbar) document.documentElement.style.setProperty('--top-h', `${topbar.offsetHeight}px`);
  };
  ajustar();
  addEventListener('resize', ajustar);
  Shell.initShell();
  // Recorrido de la demo (modo presentador): estas páginas son los dos primeros pasos; «Ir» solo sube al principio
  Shell.Recorrido.init({ inicio: () => { window.scrollTo({ top: 0 }); return ''; } });
})();
