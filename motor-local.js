// Motor local de reglas (modo degradado sin IA): ramo por palabras clave, extracción por expresiones regulares y
// reglas heurísticas. La lógica (umbrales, combinaciones y decisión) es común a todos los idiomas; las expresiones
// dependen del idioma de los mensajes y están en locales/<idioma>/motor.js (I18N.motor('local')).
// Funciona en el navegador (global `MotorLocal`, lo usa app.js) y en Node (tests/motores-idioma.test.js).
(function (root) {
  'use strict';

  const RAMOS = ['Auto', 'Hogar', 'Salud'];
  const DECISION = { CLEARED: 'DESPEJADO', REVIEW: 'REVISION' };
  const DIA = 86400000;
  const isoDate = (d) => d.toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DIA);
  const P = () => root.I18N.motor('local');

  function classifyRamo(text) {
    const kw = P().ramo;
    const hits = RAMOS.map((r) => [r, [...new Set((text.match(kw[r]) || []).map((w) => w.toLowerCase()))]]);
    const scores = hits.map(([r, words]) => [r, words.length]).sort((a, b) => b[1] - a[1]);
    const [best, second] = scores;
    const ramo = best[1] === 0 || best[1] === second[1] ? 'Indeterminado' : best[0];
    const criterios = hits.map(([r, words]) => `${r}: ${words.length ? words.join(', ') : root.I18N.t('triaje.sin_indicios')} (${words.length})`);
    return { ramo, criterios };
  }

  function extract(msg) {
    const p = P();
    const t = msg.texto;
    const recepcion = new Date(msg.fecha_recepcion);
    const year = recepcion.getFullYear();

    let fecha = null;
    let m = t.match(p.fechaDiaMes);
    if (m) fecha = `${year}-${String(p.mes(m)).padStart(2, '0')}-${p.dia(m).padStart(2, '0')}`;
    if (!fecha && (m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) fecha = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (!fecha && (m = t.match(p.haceN))) {
      const n = p.numeros[m[1].toLowerCase()] ?? Number(m[1]);
      fecha = isoDate(new Date(recepcion.getTime() - n * (p.semana.test(m[2]) ? 7 : 1) * DIA));
    }
    if (!fecha && p.ayer.test(t)) fecha = isoDate(new Date(recepcion.getTime() - DIA));
    if (!fecha && p.hoy.test(t)) fecha = isoDate(recepcion);
    // «29 de diciembre» recibido el 2 de enero: el hecho es del año anterior
    if (fecha && fecha > isoDate(recepcion)) fecha = `${year - 1}${fecha.slice(4)}`;

    const importes = [...t.matchAll(p.importe)].map(p.importeNumero);
    const poliza = t.match(/\b(AU|HO|SA)-\d{6}\b/);
    // «No hubo heridos», «sin heridos», «nadie herido»: quitar antes de buscar lesionados
    const sinNegaciones = t.replace(p.negacionLesion, '');
    const docs = [...new Set((t.match(p.docs) || []).map((d) => d.toLowerCase()))];

    return {
      nombre_cliente: msg.remitente.nombre,
      numero_poliza: poliza ? poliza[0] : null,
      tipo_siniestro: msg.asunto,
      fecha_hecho: fecha,
      importe_estimado_eur: importes.length ? Math.max(...importes) : null,
      lugar: null,
      terceros_implicados: p.terceros.test(t),
      lesionados: p.lesionados.test(sinNegaciones),
      documentacion_mencionada: docs,
      observaciones: root.I18N.t('triaje.extraccion_local_por_expresiones'),
    };
  }

  // Cada regla: [código, clave de la descripción, evaluador(texto, datos, mensaje, expresiones) → 'cumple'|'incumple'|'no_aplica', clave de la evidencia]
  const REGLAS = {
    Auto: [
      ['A2', 'triaje.comunicacion_en_7_dias', (t, d, m) => (d.fecha_hecho ? (daysBetween(d.fecha_hecho, m.fecha_recepcion) > 7 ? 'incumple' : 'cumple') : 'no_aplica'), 'triaje.fecha_del_hecho_vs'],
      ['A3', 'triaje.conductor_declarado_en_poliza', (t, d, m, r) => (r.A3.test(t) ? 'incumple' : 'cumple'), 'triaje.mencion_de_otro_conductor'],
      ['A4', 'triaje.sin_alcohol_drogas_ni', (t, d, m, r) => (r.A4.test(t) ? 'incumple' : 'cumple'), 'triaje.circunstancias_agravantes'],
      ['A5', 'triaje.terceros_documentados_y_sin', (t, d, m, r) => (d.lesionados || (d.terceros_implicados && !r.A5documento.test(t)) ? 'incumple' : 'cumple'), 'triaje.lesionados_parte_amistoso'],
      ['A6', 'triaje.importe_inferior_a_6', (t, d) => (d.importe_estimado_eur == null ? 'no_aplica' : d.importe_estimado_eur > 6000 ? 'incumple' : 'cumple'), 'triaje.importe_extraido'],
      ['A7', 'triaje.caso_de_despeje_directo', (t, d) => (d.documentacion_mencionada.length ? 'cumple' : 'no_aplica'), 'triaje.documentacion_mencionada'],
    ],
    Hogar: [
      ['H2', 'triaje.comunicacion_en_7_dias', (t, d, m, r) => (r.H2.test(t) ? 'incumple' : 'cumple'), 'triaje.antiguedad_del_dano'],
      ['H3', 'triaje.dano_por_agua_subito', (t, d, m, r) => (r.H3filtracion.test(t) ? 'incumple' : r.H3agua.test(t) ? 'cumple' : 'no_aplica'), 'triaje.tipo_de_dano_por'],
      ['H4', 'triaje.robo_con_fuerza_denuncia', (t, d, m, r) => {
        if (!r.H4robo.test(t)) return 'no_aplica';
        const sinFuerza = r.H4sinFuerza.test(t);
        const joyas = r.H4joyas.test(t) && (d.importe_estimado_eur || 0) > 3000;
        return sinFuerza || joyas || !r.H4denuncia.test(t) ? 'incumple' : 'cumple';
      }, 'triaje.fuerza_denuncia_y_limites'],
      ['H5', 'triaje.cristales_electrico_1_500', (t, d, m, r) => (r.H5.test(t) ? ((d.importe_estimado_eur || 0) < 1500 ? 'cumple' : 'incumple') : 'no_aplica'), 'triaje.importe_del_dano'],
      ['H9', 'triaje.importe_inferior_a_10', (t, d) => (d.importe_estimado_eur == null ? 'no_aplica' : d.importe_estimado_eur > 10000 ? 'incumple' : 'cumple'), 'triaje.importe_extraido'],
    ],
    Salud: [
      ['S2', 'triaje.fuera_de_periodo_de', (t, d, m, r) => (r.S2contratacion.test(t) && r.S2cirugia.test(t) ? 'incumple' : 'cumple'), 'triaje.antiguedad_de_la_poliza'],
      ['S3', 'triaje.sin_preexistencias_no_declaradas', (t, d, m, r) => (r.S3.test(t) ? 'incumple' : 'cumple'), 'triaje.mencion_de_patologia_previa'],
      ['S4', 'triaje.autorizacion_previa_cuando_procede', (t, d, m, r) => {
        const ses = t.match(r.S4sesiones);
        if (r.S4realizada.test(t) && r.S4cirugia.test(t)) return 'incumple';
        if (ses && Number(ses[1]) > 10) return 'incumple';
        return 'cumple';
      }, 'triaje.prestacion_realizada_sin_autorizacion'],
      ['S5', 'triaje.centro_del_cuadro_medico', (t, d, m, r) => (r.S5fuera.test(t) ? 'incumple' : r.S5cuadro.test(t) ? 'cumple' : 'no_aplica'), 'triaje.mencion_del_cuadro_medico'],
      ['S7', 'triaje.reembolso_2_000_y', (t, d, m, r) => (r.S7.test(t) && (d.importe_estimado_eur || 0) > 2000 ? 'incumple' : 'cumple'), 'triaje.importe_del_reembolso'],
      ['S8', 'triaje.no_corresponde_a_trafico', (t, d, m, r) => (r.S8.test(t) ? 'incumple' : 'cumple'), 'triaje.origen_de_la_lesion'],
    ],
  };

  // fmtEur: formato del importe en el motivo (el de la página; en Node, el de I18N)
  function triage(msg, { fmtEur = (n) => root.I18N.fmt.eur(n) } = {}) {
    const text = `${msg.asunto}. ${msg.texto}`;
    const { ramo, criterios: criterios_ramo } = classifyRamo(text);
    const datos = extract(msg);
    const r = P().reglas;
    const criterios = (REGLAS[ramo] || []).map(([regla, desc, evaluar, evid]) => ({ regla, descripcion: root.I18N.t(desc), resultado: evaluar(text, datos, msg, r), evidencia: root.I18N.t(evid) }));
    const incumplidas = criterios.filter((c) => c.resultado === 'incumple');
    let decision; let motivo;
    if (ramo === 'Indeterminado') {
      decision = DECISION.REVIEW; motivo = root.I18N.t('triaje.ramo_no_determinable_por');
    } else if (incumplidas.length) {
      decision = DECISION.REVIEW; motivo = root.I18N.t('triaje.motor.incumple', { reglas: incumplidas.map((c) => `${c.regla} (${c.descripcion})`).join(', ') });
    } else {
      decision = DECISION.CLEARED; motivo = root.I18N.t('triaje.ramo_sin_incumplimientos_en', { ramo, importe_estimado_eur: fmtEur(datos.importe_estimado_eur) });
    }
    return { ramo, criterios_ramo, datos_extraidos: datos, criterios, decision, motivo, confianza: ramo === 'Indeterminado' ? 0.3 : 0.6 + Math.min(0.25, criterios.length * 0.04) };
  }

  const MotorLocal = { triage, classifyRamo, extract, REGLAS };
  root.MotorLocal = MotorLocal;
  if (typeof module !== 'undefined' && module.exports) module.exports = MotorLocal;
})(typeof window !== 'undefined' ? window : globalThis);
