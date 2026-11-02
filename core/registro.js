// Registro del triaje (sessionStorage «triage.log»): resultado guardado de un mensaje y puesta al día de las fichas
// cuando cambia el idioma de la página.
// Cambiar de idioma recarga la página y el registro vuelve tal cual, con los textos del idioma en que se trió. Las
// fichas que salen de los datos de la demo se rehacen con los datos ya traducidos: el mensaje viene de PAQUETES y el
// resultado se calcula otra vez igual que al triar (resultado guardado o motor local, los dos deterministas y con las
// mismas decisiones en todos los idiomas: tests/motores-idioma.test.js). La respuesta de un modelo en vivo y la de un
// archivo no se pueden rehacer: se quedan en el idioma que dice su campo `idioma`.
// Funciona en el navegador (global `Registro`: ui/triage/triaje.js, ui/governance/gobierno.js) y en Node (tests/registro.test.js).
(function (root) {
  'use strict';

  const dep = (nombre, fichero) => root[nombre] || require(fichero);
  const ORIGEN_GUARDADO = 'IA (guardado)';
  const esLocal = (origen) => /^reglas locales/.test(origen);

  // Resumen de lo que se envía al modelo con los datos personales cambiados por marcadores
  const resumenEnvio = (envio, mapa, extra) => dep('Cumplimiento', './cumplimiento.js').resumenSeudonimizacion(
    { asunto: envio.asunto, remitente: `${envio.remitente.nombre} (${envio.remitente.contacto})`, texto: envio.texto }, mapa, extra);

  // Resultado guardado de un mensaje con la salida cruda que habría devuelto el modelo. Con seudonimización, la salida
  // lleva los marcadores que habría visto el modelo y se añade el resumen de lo enviado
  function resultadoGuardado(msg, guardado, { expandir, seudonimizar }) {
    const r = expandir(guardado);
    const { usage, ...json } = r;
    const raw = JSON.stringify(json, null, 2);
    if (!seudonimizar) return { ...r, raw, origen: ORIGEN_GUARDADO };
    const C = dep('Cumplimiento', './cumplimiento.js');
    const { mensaje: envio, mapa } = C.seudonimizarMensaje(msg);
    return { ...r, raw: C.seudonimizarTexto(raw, mapa), origen: ORIGEN_GUARDADO, seudonimizacion: resumenEnvio(envio, mapa, { simulada: true }) };
  }

  // Rehace en el sitio las fichas de otro idioma que se pueden rehacer. Una ficha sin `idioma` (anterior a este campo)
  // se rehace si se puede y, si no, se deja como está. Devuelve cuántas ha rehecho.
  // d: { idioma, mensajes (los de PAQUETES), guardados (RESULTADOS_GUARDADOS), expandir, fmtEur? }
  function rehacerEnIdioma(log, d) {
    const porId = new Map(d.mensajes.map((m) => [m.id, m]));
    let rehechas = 0;
    for (const e of log || []) {
      if (e.idioma === d.idioma || e.paquete === 'archivo') continue;
      const msg = porId.get(e.id);
      const origen = e.origen || '';
      let r = null;
      if (msg) e.esperado = msg.esperado;   // la referencia de la demo es un dato, también en una respuesta en vivo
      if (msg && origen === ORIGEN_GUARDADO && d.guardados[e.id]) r = resultadoGuardado(msg, d.guardados[e.id], { expandir: d.expandir, seudonimizar: !!e.seudonimizacion });
      else if (msg && esLocal(origen)) r = dep('MotorLocal', './motor-local.js').triage(msg, d.fmtEur ? { fmtEur: d.fmtEur } : undefined);
      if (!r) continue;
      // Ramo, decisión, confianza y origen no cambian con el idioma; la revisión humana es de quien la hizo
      Object.assign(e, {
        asunto: msg.asunto, mensaje: { ...msg },
        criterios_ramo: r.criterios_ramo || [], datos_extraidos: r.datos_extraidos, criterios: r.criterios, motivo: r.motivo, evidencias: r.evidencias || [],
        idioma: d.idioma,
      });
      if (origen === ORIGEN_GUARDADO) Object.assign(e, { raw: r.raw, seudonimizacion: r.seudonimizacion || null, ...(r.adjuntos ? { adjuntos: r.adjuntos } : {}) });
      rehechas++;
    }
    return rehechas;
  }

  const Registro = { resultadoGuardado, resumenEnvio, rehacerEnIdioma };
  root.Registro = Registro;
  if (typeof module !== 'undefined' && module.exports) module.exports = Registro;
})(typeof window !== 'undefined' ? window : globalThis);
