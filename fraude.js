// Motor de indicadores de fraude: calcula, sin IA y de forma determinista, el score antifraude de cada mensaje
// cruzando su texto con el resto del lote y con el histórico de pólizas y siniestros (data/fraude.js).
// Lógica pura (sin DOM), compartida por index.html (ficha del triaje), gobierno.html (sección «Indicadores de
// fraude») y Node (tests/fraude.test.js).
//
// Principio: el indicio no acusa, prioriza. El score decide quién mira el caso (vigilancia o SIU), nunca rechaza un
// siniestro, y no se comunica al cliente. Cada indicador de relato lleva su cita literal del mensaje.
(function (root) {
  'use strict';

  const NIVELES_DEF = [[70, 'siu', I18N.t('fraude.escalado_a_la_siu')], [40, 'vigilancia', I18N.t('fraude.vigilancia')], [0, 'sin', I18N.t('fraude.sin_indicios')]];
  const DIA = 864e5;

  // Señales de relato: frases del mensaje que activan el indicador (se guarda cada cita con su posición)
  const RELATO = {
    'IF-01': /\b(?:lo |la )?contrat(?:amos|é|e|ó)[^.]{0,30}?hace (?:solo |sólo |apenas )?(?:\d+|un[ao]?|dos|tres|cuatro) (?:d[ií]as|semanas?)\b/gi,
    'IF-06': /\b(?:ya me pas[óo]|otra vez|de nuevo|igual que la [úu]ltima vez)[^.!?\p{Extended_Pictographic}]{0,70}/giu,
    'IF-07': /\b(?:todav[ií]a no s[ée] cu[áa]nto|no estoy segur[oa]|no s[ée] por d[óo]nde)\b/gi,
    'IF-08': /\b(?:todav[ií]a no hemos ido a la polic[ií]a|no hemos (?:puesto|presentado) denuncia|no est[áa] forzada|la puerta parece bien|las c[áa]maras no enfocan[^.]{0,20}|sin testigos)/gi,
    'IF-09': /\b(?:necesito que venga alguien hoy|que venga alguien hoy|puedo ir al m[íi]o|mi taller de confianza|el taller de al lado de casa)/gi,
    'IF-10': /\b(?:(?:las )?joyas valdr[áa]n unos [\d.]+ ?€|no tenemos facturas|sin facturas?|eran heredadas)/gi,
  };
  const IBAN = /\bES\d{2}(?: ?\d{4}){5}\b/g;
  const TEL = /(?:\+34 ?)?\b[6-9]\d{2} ?\d{3} ?\d{3}\b/g;
  const POLIZA = /\b(AU|HO|SA)-\d{6}\b/;
  const CONDUCTOR_JOVEN = /\bmi (hij[oa]|sobrin[oa]|nieto|nieta) (\p{Lu}\p{Ll}+)[^.]{0,12}\((?:tiene )?(\d{2}) a[ñn]os\)/u;
  const NO_DECLARADO = /no s[ée] si lo (?:incluimos|declaramos|pusimos)|no est[áa] declarad[oa]/i;

  const soloDigitos = (s) => String(s || '').replace(/\D/g, '');
  const sinEspacios = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
  const diasEntre = (a, b) => Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / DIA);
  const fmtDia = (iso) => { const [, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const citas = (texto, re) => { const out = []; re.lastIndex = 0; let m; while ((m = re.exec(texto))) { out.push({ cita: m[0].trim(), inicio: m.index, fin: m.index + m[0].trim().length }); if (!m[0]) re.lastIndex++; } return out; };

  // Normaliza una entrada del triaje o un mensaje + resultado guardado al formato que evalúa el motor
  function entradaDe(e = {}) {
    const m = e.mensaje || e;
    const d = e.datos_extraidos || {};
    const texto = String(m.texto || '');
    return {
      id: e.id || m.id, texto, canal: m.canal || null, recepcion: m.fecha_recepcion || e.timestamp || null,
      remitente: (m.remitente && m.remitente.nombre) || d.nombre_cliente || '', poliza: d.numero_poliza || (texto.match(POLIZA) || [])[0] || null,
      importe: e.importe != null ? e.importe : d.importe_estimado_eur != null ? d.importe_estimado_eur : null,
      decision: e.decision || null, fecha_hecho: d.fecha_hecho || null, ramo: e.ramo || null,
    };
  }

  const nivelDe = (score, niveles = NIVELES_DEF) => { const n = niveles.find(([min]) => score >= min) || niveles[niveles.length - 1]; return { clave: n[1], etiqueta: n[2] }; };

  // Evalúa el lote completo (los indicadores relacionales necesitan ver todos los mensajes a la vez).
  // opts: { indicadores (catálogo con pesos y activo), escenarios, historico, niveles }
  function evaluar(entradas, opts = {}) {
    const cat = Object.fromEntries((opts.indicadores || []).map((i) => [i.id, i]));
    const H = opts.historico || {};
    const pol = H.polizas || {}; const sin = H.siniestros || []; const prov = (H.proveedores || []).filter((p) => p.casos_marcados >= 3);
    const niveles = opts.niveles ? opts.niveles.map(([a, b, c]) => [a, b, c]) : NIVELES_DEF;
    const E = entradas.map(entradaDe);

    // Cruces: IBAN y teléfono → pólizas distintas que los usan (lote + histórico)
    const porIban = {}; const porTel = {};
    const anotar = (mapa, clave, ref) => { if (!clave) return; (mapa[clave] = mapa[clave] || []).push(ref); };
    E.forEach((e) => {
      citas(e.texto, IBAN).forEach((c) => anotar(porIban, sinEspacios(c.cita), { id: e.id, poliza: e.poliza, titular: e.remitente, cita: c }));
      [...new Set(citas(e.texto, TEL).map((c) => soloDigitos(c.cita).slice(-9)))].forEach((t) => anotar(porTel, t, { id: e.id, poliza: e.poliza, titular: e.remitente }));
    });
    sin.forEach((s) => { if (s.iban) anotar(porIban, sinEspacios(s.iban), { id: s.id, poliza: s.poliza, titular: s.titular, historico: true, fecha: s.fecha }); if (s.telefono) anotar(porTel, soloDigitos(s.telefono).slice(-9), { id: s.id, poliza: s.poliza, titular: s.titular, historico: true }); });
    const polizasDistintas = (refs) => new Set(refs.map((r) => r.poliza || r.titular)).size;
    // Duplicados del lote: misma póliza en dos mensajes con importes distintos
    const porPoliza = {}; E.forEach((e) => { if (e.poliza) (porPoliza[e.poliza] = porPoliza[e.poliza] || []).push(e); });

    const res = {};
    E.forEach((e) => {
      const ind = [];
      const add = (id, extra) => {
        const c = cat[id] || { id, nombre: id, peso: 0, activo: true };
        if (ind.some((x) => x.id === id)) { const x = ind.find((y) => y.id === id); x.citas.push(...(extra.citas || [])); return; }
        ind.push({ id, nombre: c.nombre, grupo: c.grupo, icono: c.icono, fuente: c.fuente, peso: c.peso, activo: c.activo !== false, citas: [], detalle: '', ...extra });
      };
      // Relato (citas literales)
      Object.entries(RELATO).forEach(([id, re]) => { const cs = citas(e.texto, re); if (cs.length && id !== 'IF-01' && id !== 'IF-06') add(id, { citas: cs, detalle: I18N.t('fraude.del_mensaje', { cs: cs.length, frases: cs.length === 1 ? 'frase' : 'frases' }) }); });
      // IF-01: póliza reciente (histórico) o mención en el texto
      const p = e.poliza && pol[e.poliza];
      const cs01 = citas(e.texto, RELATO['IF-01']);
      if (p && p.alta && e.recepcion && diasEntre(p.alta, e.recepcion) < 30) add('IF-01', { citas: cs01, detalle: I18N.t('fraude.alta_el_dias_antes', { alta: fmtDia(p.alta), recepcion: diasEntre(p.alta, e.recepcion), nota: p.nota ? ` · ${p.nota}` : '' }) });
      else if (cs01.length) add('IF-01', { citas: cs01, detalle: I18N.t('fraude.el_cliente_dice_que') });
      // IF-02: madrugada o al límite del plazo
      if (e.recepcion) {
        const h = Number(String(e.recepcion).slice(11, 13));
        const dias = e.fecha_hecho ? diasEntre(e.fecha_hecho, e.recepcion) : null;
        if (h >= 0 && h < 6) add('IF-02', { detalle: I18N.t('fraude.recibido_a_las', { recepcion: String(e.recepcion).slice(11, 16) }) });
        else if (dias === 6 || dias === 7) add('IF-02', { detalle: I18N.t('fraude.comunicado_el_dia_del', { dias }) });
      }
      // IF-03: IBAN compartido entre pólizas distintas
      Object.entries(porIban).forEach(([iban, refs]) => {
        if (!refs.some((r) => r.id === e.id) || polizasDistintas(refs) < 2) return;
        const otros = refs.filter((r) => r.id !== e.id);
        add('IF-03', { citas: refs.filter((r) => r.id === e.id).map((r) => r.cita), detalle: I18N.t('fraude.la_cuenta_aparece_tambien', { iban: iban.slice(-4), id: otros.map((r) => (r.historico ? `${r.id} (${r.titular}, ${fmtDia(r.fecha)})` : r.id)).join(' y ') }), enlaces: otros.map((r) => r.id) });
      });
      // IF-04: teléfono repetido en pólizas distintas
      Object.entries(porTel).forEach(([tel, refs]) => {
        if (!refs.some((r) => r.id === e.id) || polizasDistintas(refs) < 2) return;
        const otros = refs.filter((r) => r.id !== e.id);
        add('IF-04', { detalle: I18N.t('fraude.el_telefono_aparece_tambien', { tel: tel.slice(-3), id: otros.map((r) => r.id).join(' y ') }), enlaces: otros.map((r) => r.id) });
      });
      // IF-05: proveedor con 3 o más casos marcados
      prov.forEach((pr) => { const i = e.texto.indexOf(pr.nombre); if (i >= 0) add('IF-05', { citas: [{ cita: pr.nombre, inicio: i, fin: i + pr.nombre.length }], detalle: pr.nota || I18N.t('fraude.casos_marcados_en_90', { casos_marcados: pr.casos_marcados }) }); });
      // IF-06: siniestro previo sobre el mismo bien en 12 meses (histórico) o mención en el texto
      const previos = sin.filter((s) => s.poliza && s.poliza === e.poliza && e.recepcion && diasEntre(s.fecha, e.recepcion) > 0 && diasEntre(s.fecha, e.recepcion) <= 365);
      const cs06 = citas(e.texto, RELATO['IF-06']);
      if (previos.length) add('IF-06', { citas: cs06, detalle: previos.map((s) => `${s.id} · ${fmtDia(s.fecha)} · ${s.tipo}${s.lugar ? I18N.t('fraude.en', { lugar: s.lugar }) : ''}${s.conductor ? I18N.t('fraude.conducia', { conductor: s.conductor }) : ''}`).join(' · '), enlaces: previos.map((s) => s.id) });
      else if (cs06.length) add('IF-06', { citas: cs06, detalle: I18N.t('fraude.el_cliente_menciona_un') });
      // IF-11: conductor joven que el tomador no sabe si está declarado; se anula si la póliza lo tiene declarado
      const cj = e.texto.match(CONDUCTOR_JOVEN);
      if (cj && Number(cj[3]) < 25 && NO_DECLARADO.test(e.texto)) {
        const i = e.texto.indexOf(cj[0]);
        const declarado = p && (p.conductores || []).some((n) => n.split(' ')[0] === cj[2]);
        add('IF-11', { citas: [{ cita: cj[0], inicio: i, fin: i + cj[0].length }], detalle: declarado ? I18N.t('fraude.contraindicio', { cj: p.nota || I18N.t('fraude.figura_entre_los_conductores', { cj: cj[2] }) }) : I18N.t('fraude.anos_no_consta_como', { cj: cj[2], cj2: cj[3] }), contraindicio: declarado });
      }
      // IF-12: misma póliza en dos mensajes del lote con importes distintos
      const dup = (porPoliza[e.poliza] || []).filter((x) => x.id !== e.id && x.importe != null && e.importe != null && x.importe !== e.importe);
      if (dup.length) add('IF-12', { detalle: I18N.t('fraude.misma_poliza_en', { importe: dup.map((x) => `${x.id} (${x.importe} €)`).join(', ') }), enlaces: dup.map((x) => x.id) });

      // Indicadores creados por el usuario: se activan con frases literales del mensaje (palabras completas, sin distinguir mayúsculas)
      (opts.indicadores || []).filter((i) => Array.isArray(i.frases) && i.frases.length && (!e.ramo || !i.ramos || !i.ramos.length || i.ramos.includes(e.ramo))).forEach((i) => {
        const cs = i.frases.filter((f) => String(f).trim()).flatMap((f) => citas(e.texto, new RegExp(`(?<![\\p{L}\\d])${escRe(String(f).trim())}(?![\\p{L}\\d])`, 'giu')));
        if (cs.length) add(i.id, { citas: cs, detalle: I18N.t('fraude.del_mensaje', { cs: cs.length, frases: cs.length === 1 ? 'frase' : 'frases' }) });
      });
      ind.forEach((x) => { x.aplicado = x.activo && !x.contraindicio ? x.peso : 0; });
      ind.sort((a, b) => b.aplicado - a.aplicado || a.id.localeCompare(b.id));
      const score = Math.min(100, ind.reduce((s, x) => s + x.aplicado, 0));
      const nivel = nivelDe(score, niveles);
      const ibanCompartido = ind.some((x) => x.id === 'IF-03' && x.aplicado);
      const despejado = e.decision === 'DESPEJADO';
      const pago = !despejado ? 'no_aplica' : nivel.clave !== 'sin' || ibanCompartido ? 'retenido' : 'libre';
      const accion = nivel.clave === 'siu' ? I18N.t('fraude.sin_despeje_automatico_cola')
        : nivel.clave === 'vigilancia' ? (despejado ? I18N.t('fraude.se_tramita_con_el') : I18N.t('fraude.revision_con_el_indicio'))
          : ibanCompartido ? I18N.t('fraude.pago_retenido_hasta_verificar') : I18N.t('fraude.solo_se_registra');
      // Escenario: el de más indicadores en común (al menos 2, o su indicador clave); a igualdad, el más específico
      const disparados = new Set(ind.map((x) => x.id));
      const esc = (opts.escenarios || []).map((s) => ({ s, n: s.indicadores.filter((i) => disparados.has(i)).length }))
        .filter(({ s, n }) => n >= 2 || (s.clave && disparados.has(s.clave)))
        .sort((a, b) => b.n - a.n || b.n / b.s.indicadores.length - a.n / a.s.indicadores.length)[0];
      res[e.id] = {
        id: e.id, score, nivel: nivel.clave, etiqueta: nivel.etiqueta, indicadores: ind, escenario: esc ? esc.s.id : null,
        pago, importe: e.importe, accion, enlaces: [...new Set(ind.flatMap((x) => x.enlaces || []))], contraindicios: ind.filter((x) => x.contraindicio).length,
      };
    });
    return res;
  }

  // Cifras del lote para los KPI
  function resumen(evals) {
    const L = Object.values(evals);
    const ret = L.filter((x) => x.pago === 'retenido');
    return {
      analizados: L.length, con_indicios: L.filter((x) => x.nivel !== 'sin').length, vigilancia: L.filter((x) => x.nivel === 'vigilancia').length,
      siu: L.filter((x) => x.nivel === 'siu').length, retenidos: ret.length, importe_retenido: ret.reduce((s, x) => s + (x.importe || 0), 0),
      enlazados: L.filter((x) => x.nivel === 'sin' && x.indicadores.some((i) => i.aplicado)).length,
    };
  }

  // Bloque para _gobernanza: sin citas ni datos personales (solo ids, pesos y nivel)
  const paraGobernanza = (ev) => (ev ? { score: ev.score, nivel: ev.nivel, indicadores: ev.indicadores.filter((x) => x.aplicado).map((x) => `${x.id}+${x.aplicado}`), contraindicios: ev.indicadores.filter((x) => x.contraindicio).map((x) => x.id), escenario: ev.escenario, pago: ev.pago, comunicado_al_cliente: false } : null);

  // Términos que nunca pueden llegar al cliente (G-12)
  const ACUSATORIO = /\b(fraude|fraudulent\w*|sospech\w*|SIU|indicio\w*|investigaci[óo]n)\b/i;

  const API = { evaluar, resumen, entradaDe, nivelDe, paraGobernanza, ACUSATORIO, NIVELES: NIVELES_DEF };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Fraude = API;
})(typeof window !== 'undefined' ? window : globalThis);
