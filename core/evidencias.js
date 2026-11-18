// Evidencias del triaje: localiza en el texto del mensaje los fragmentos en los que se basa cada dato,
// ramo o regla, para resaltarlos en la ficha. Lógica pura (sin DOM): funciona en el navegador
// (global `Evidencias`) y en Node (tests/evidencias.test.js).
//
// Principio: el modelo CITA, el navegador COMPRUEBA. Una evidencia solo se resalta si su cita se
// encuentra de verdad en el mensaje (exacta o, si no, normalizada: mayúsculas, acentos, espacios,
// comillas). Nunca se pide al modelo posiciones numéricas: los LLM cuentan mal los caracteres.
(function (root) {
  'use strict';

  const MAX_EVIDENCIAS = 12;
  const MAX_CITA = 160;
  const MAX_NOTA = 140;
  const MIN_CITA = 3;

  // ---------------------------------------------------------------------------
  // Validación del campo `evidencias` que devuelve el modelo (nunca se fía de la salida cruda)
  // ---------------------------------------------------------------------------
  function validar(evs) {
    if (!Array.isArray(evs)) return [];
    const vistos = new Set();
    const out = [];
    for (const e of evs) {
      if (!e || typeof e !== 'object' || typeof e.cita !== 'string') continue;
      const cita = e.cita.trim().slice(0, MAX_CITA);
      if (cita.length < MIN_CITA) continue;
      const ref = typeof e.ref === 'string' && e.ref.trim() ? e.ref.trim().slice(0, 40) : 'otro';
      const clave = `${ref}|${cita.toLowerCase()}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      out.push({ ref, cita, nota: typeof e.nota === 'string' ? e.nota.trim().slice(0, MAX_NOTA) : '' });
      if (out.length >= MAX_EVIDENCIAS) break;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Normalización con mapa de posiciones (para casar «Nos han entrado EN casa» con «nos han entrado en casa»)
  // ---------------------------------------------------------------------------
  function normalizar(texto) {
    const s = String(texto ?? '');
    let norm = '';
    const ini = []; const fin = []; // por cada unidad UTF-16 de `norm`: rango [ini, fin) en el original
    let ultimoEspacio = false;
    let i = 0;
    for (const ch of s) {
      const a = i; const b = i + ch.length; i = b;
      if (/\s/.test(ch)) {
        if (!ultimoEspacio && norm.length) { norm += ' '; ini.push(a); fin.push(b); }
        ultimoEspacio = true;
        continue;
      }
      ultimoEspacio = false;
      const c = ch
        .replace(/[“”«»„]/g, '"').replace(/[‘’´`]/g, "'").replace(/[–—]/g, '-').replace('…', '...')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      for (let u = 0; u < c.length; u++) { norm += c[u]; ini.push(a); fin.push(b); }
    }
    return { norm, ini, fin };
  }

  const limpiarCita = (c) => String(c ?? '').trim()
    .replace(/^["'«“‘]+|["'»”’]+$/g, '')
    .replace(/^(\.{3}|…)+|(\.{3}|…)+$/g, '')
    .trim();

  // Devuelve { inicio, fin, tipo } sobre el texto original, o null si la cita no está en el mensaje
  function localizar(texto, cita) {
    const t = String(texto ?? '');
    const c = limpiarCita(cita);
    if (c.length < MIN_CITA) return null;
    const i = t.indexOf(c);
    if (i >= 0) return { inicio: i, fin: i + c.length, tipo: 'exacta' };
    const T = normalizar(t);
    const C = normalizar(c).norm.trim();
    if (C.length < MIN_CITA) return null;
    const k = T.norm.indexOf(C);
    if (k >= 0) return { inicio: T.ini[k], fin: T.fin[k + C.length - 1], tipo: 'normalizada' };
    return null;
  }

  // ---------------------------------------------------------------------------
  // Anclado: asigna posiciones, resuelve solapes (gana la primera de la lista) y numera por orden de aparición
  // ---------------------------------------------------------------------------
  function anclar(texto, evs, origen = 'modelo') {
    return validar(evs).map((e) => {
      const pos = localizar(texto, e.cita);
      return { ref: e.ref, nota: e.nota, cita: pos ? String(texto).slice(pos.inicio, pos.fin) : e.cita, inicio: pos ? pos.inicio : null, fin: pos ? pos.fin : null, verificada: !!pos, origen };
    });
  }

  function resolver(lista) {
    const aceptadas = [];
    const items = lista.map((e) => {
      const solapa = e.verificada && aceptadas.some((a) => e.inicio < a.fin && e.fin > a.inicio);
      const resaltada = e.verificada && !solapa;
      if (resaltada) aceptadas.push(e);
      return { ...e, resaltada };
    });
    const orden = [...items.filter((e) => e.resaltada).sort((a, b) => a.inicio - b.inicio), ...items.filter((e) => !e.resaltada)];
    return orden.map((e, k) => ({ ...e, n: k + 1 }));
  }

  // Trocea el texto en segmentos { t, ev } (ev = evidencia resaltada o null) para pintarlo sin HTML de por medio
  function segmentos(texto, lista) {
    const t = String(texto ?? '');
    const res = lista.filter((e) => e.resaltada).sort((a, b) => a.inicio - b.inicio);
    const out = []; let pos = 0;
    for (const e of res) {
      if (e.inicio > pos) out.push({ t: t.slice(pos, e.inicio), ev: null });
      out.push({ t: t.slice(e.inicio, e.fin), ev: e });
      pos = e.fin;
    }
    if (pos < t.length) out.push({ t: t.slice(pos), ev: null });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Respaldo sin IA: reconstruye evidencias desde lo que ya hay (datos extraídos, criterios y citas entre comillas)
  // ---------------------------------------------------------------------------
  // Lo que depende del idioma del mensaje (fechas, importes, horas, lesiones, documentos y patrones por regla) está
  // en locales/<idioma>/motor.js: I18N.motor('evidencias'). Vehículo con matrícula y centro sanitario son nombres
  // propios y valen para todos.
  const P = () => I18N.motor('evidencias');
  // Vehículo con su matrícula (así no se confunde con el del tercero, que no suele llevarla)
  const PATRON_VEHICULO = /\b(?:Seat|Peugeot|Toyota|Renault|Opel|Volkswagen|Kia|Nissan|Skoda|Citro[eë]n|Ford|Honda|BMW|Audi|Mercedes|Hyundai|Dacia|Fiat)\s+[\wÀ-ÿ-]+(?:\s+[\wÀ-ÿ-]+)?\s+\d{4}\s?[A-Z]{3}\b/;
  const PATRON_CENTRO = /\b(?:Hospital|Cl[ií]nica|Centro M[eé]dico)\s+[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñÑ-]*(?:\s+(?:[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñÑ-]*|de|del|la))*[A-Za-zÁÉÍÓÚáéíóúñÑ]/;

  // Fragmentos entre comillas de un criterio («...», "...", “...”) y el trozo tras los dos puntos
  function citasDeTexto(s) {
    const t = String(s ?? '');
    const out = [];
    for (const m of t.matchAll(/["“«]([^"”»]{3,160})["”»]/g)) out.push(m[1]);
    return out;
  }

  function respaldo(texto, entry = {}) {
    const t = String(texto ?? '');
    const datos = entry.datos_extraidos || {};
    const p = P();
    const out = [];
    const add = (ref, cita, nota) => { if (cita) out.push({ ref, cita, nota }); };
    const buscar = (re) => { re.lastIndex = 0; const m = re.exec(t); return m ? m[0] : null; };

    // Ramo: citas entre comillas de criterios_ramo o, en el motor local, las palabras clave del ramo asignado. Las
    // palabras clave van al final (si se solapan con un dato o una regla, gana la regla), sin el número de póliza
    // y solo las que están en el texto (el ramo también se decide con el asunto).
    const palabrasRamo = [];
    for (const c of entry.criterios_ramo || []) {
      const citas = citasDeTexto(c);
      const resto = String(c).replace(/["“«][^"”»]*["”»]\s*:?\s*/, '').trim();
      if (citas.length) { citas.forEach((q) => add('ramo', q, resto || I18N.t('evid.indicio_del_ramo'))); continue; }
      // El motor local escribe «<etiqueta del ramo>: palabras (n)» (core/motor-local.js)
      const local = String(c).match(/^(.+?): (.+) \((\d+)\)$/);
      if (local && local[1] === I18N.etiqueta('ramo', entry.ramo) && +local[3] > 0) palabrasRamo.push(...local[2].split(', ').filter((w) => w.toLowerCase() !== String(datos.numero_poliza || '').toLowerCase() && localizar(t, w)).slice(0, 3));
    }

    if (datos.numero_poliza) add('numero_poliza', String(datos.numero_poliza), I18N.t('evid.poliza_identificada'));
    if (datos.fecha_hecho) { for (const re of p.fecha) { const f = buscar(re); if (f) { add('fecha_hecho', f, I18N.t('evid.fecha_del_hecho')); break; } } }
    if (datos.importe_estimado_eur != null) {
      let n = 0;
      for (const m of t.matchAll(p.importe)) { if (n++ >= 3) break; add('importe_estimado_eur', m[0], I18N.t('evid.importe_mencionado', { total: I18N.fmt.eur(datos.importe_estimado_eur) })); }
    }
    if (datos.lugar) {
      const l = String(datos.lugar); const partes = [l, l.split(',')[0], l.replace(p.antesDelLugar, '')];
      const hallada = partes.find((p) => p && localizar(t, p));
      if (hallada) add('lugar', hallada, I18N.t('evid.lugar_del_hecho'));
    }
    // Hora, vehículo, centro sanitario y lesiones: suman evidencias cuando el modelo cita poco
    const hora = buscar(p.hora); if (hora && datos.fecha_hecho) add('fecha_hecho', hora, I18N.t('evid.hora_del_hecho'));
    if (entry.ramo === 'Auto') { const v = buscar(PATRON_VEHICULO); if (v) add('ramo', v, I18N.t('evid.vehiculo_asegurado')); }
    if (entry.ramo === 'Salud') { const h = buscar(PATRON_CENTRO); if (h) add('lugar', h, I18N.t('evid.centro_sanitario')); }
    if (datos.lesionados) { const l = buscar(p.lesion); if (l) add('lesionados', l, I18N.t('evid.lesion_mencionada')); }
    else { const l = buscar(p.sinLesion); if (l) add('lesionados', l, I18N.t('evid.sin_lesionados')); }
    const vistos = new Set();
    for (const m of t.matchAll(p.docs)) { const k = m[0].toLowerCase(); if (vistos.has(k) || vistos.size >= 3) continue; vistos.add(k); add('documentacion_mencionada', m[0].trim(), I18N.t('evid.documentacion_mencionada')); }

    for (const c of entry.criterios || []) {
      if (c.resultado === 'no_aplica') continue;
      const citas = citasDeTexto(c.evidencia);
      const origenLocal = /^reglas locales/.test(entry.origen || '') || !citas.length;
      const pat = p.reglas[c.regla];
      const hallada = citas[0] || (c.resultado === 'incumple' && origenLocal && pat ? buscar(pat instanceof RegExp ? new RegExp(pat.source, pat.flags.replace('g', '')) : pat) : null);
      if (hallada) add(`regla:${c.regla}`, hallada, c.evidencia || c.descripcion);
    }
    palabrasRamo.forEach((w) => add('ramo', w, I18N.t('evid.indicio_de', { ramo: I18N.etiqueta('ramo', entry.ramo) })));
    return out;
  }

  // Campos de datos_extraidos que se resaltan en verde: cada uno con valor tiene que quedar anclado en el texto
  const CAMPOS_DATO = ['nombre_cliente', 'numero_poliza', 'tipo_siniestro', 'fecha_hecho', 'importe_estimado_eur', 'lugar', 'terceros_implicados', 'lesionados', 'documentacion_mencionada'];
  const conValor = (v) => v != null && v !== '' && !(Array.isArray(v) && !v.length);
  const ENT = () => root.Entidades || (typeof require !== 'undefined' ? require('./entidades.js') : null);

  // Fragmentos candidatos para cada campo que el modelo no citó, en orden de preferencia
  function candidatosDato(texto, entry, campo) {
    const t = String(texto ?? ''); const d = entry.datos_extraidos || {}; const ent = d.entidades || {};
    const p = P(); const loc = I18N.motor('local');
    const primera = (re) => { if (!re) return null; const m = new RegExp(re.source, re.flags.replace('g', '')).exec(t); return m ? m[0] : null; };
    const citas = (g, filtro = () => true) => (ent[g] || []).filter(filtro).map((x) => x.cita).filter(Boolean);
    const v = d[campo];
    switch (campo) {
      case 'nombre_cliente': { const n = String(v).replace(/\s*\(.*$/, '').trim(); return [n, ...citas('personas', (x) => x.rol === 'tomador' || x.rol === 'comunicante'), n.split(/\s+/).slice(0, 2).join(' ')]; }
      case 'numero_poliza': return [String(v)];
      case 'tipo_siniestro': { const E = ENT(); return E ? E.sucesos(t) : []; }
      case 'fecha_hecho': return [...citas('fechas', (x) => x.fecha === v), ...p.fecha.map(primera)];
      case 'importe_estimado_eur': return [...citas('importes'), primera(p.importe)];
      case 'lugar': { const l = String(v); return [l, l.split(',')[0], ...citas('lugares', (x) => x.tipo === 'lugar_hecho'), ...citas('lugares'), ...citas('organizaciones', (x) => x.tipo === 'centro_medico')]; }
      case 'terceros_implicados': return v ? [primera(loc.terceros), primera(p.terceros), ...citas('personas', (x) => x.rol === 'conductor_contrario' || x.rol === 'vecino'), ...citas('vehiculos', (x) => x.rol === 'contrario')] : [primera(p.sinTerceros)];
      case 'lesionados': return v ? [primera(p.lesion), primera(p.lesionExtra), primera(loc.lesionados)] : [primera(p.sinLesion)];
      case 'documentacion_mencionada': {
        // El modelo resume («presupuesto del cristalero»): se prueban sus trozos, de más largo a más corto
        const trozos = (Array.isArray(v) ? v : [v]).map(String).flatMap((x) => {
          const w = x.split(/\s+/); const out = [];
          for (let n = w.length; n >= 1; n--) for (let i = 0; i + n <= w.length; i++) { const z = w.slice(i, i + n).join(' '); if (n > 1 || z.length >= 6) out.push(z); }
          return out;
        });
        return [primera(p.docs), ...trozos];
      }
      default: return [];
    }
  }
  const NOTA_DATO = { nombre_cliente: 'evid.cliente_identificado', numero_poliza: 'evid.poliza_identificada', tipo_siniestro: 'evid.que_ha_pasado', fecha_hecho: 'evid.fecha_del_hecho', importe_estimado_eur: 'evid.importe_del_siniestro', lugar: 'evid.lugar_del_hecho', documentacion_mencionada: 'evid.documentacion_mencionada' };
  const notaDato = (campo, v) => (campo === 'lesionados' ? I18N.t(v ? 'evid.lesion_mencionada' : 'evid.sin_lesionados') : campo === 'terceros_implicados' ? I18N.t(v ? 'evid.terceros_implicados' : 'evid.sin_terceros') : I18N.t(NOTA_DATO[campo]));

  // Completa la lista: cada campo con valor que no tenga ya un fragmento resaltado recibe el primer candidato que
  // aparezca en el texto sin pisar otro resaltado
  function completarDatos(texto, previas, entry) {
    const t = String(texto ?? ''); const d = entry.datos_extraidos || {};
    const lista = previas.filter((e) => e.resaltada);
    const ocupado = (i, f) => lista.some((e) => i < e.fin && f > e.inicio);
    const extra = [];
    for (const campo of CAMPOS_DATO) {
      if (!conValor(d[campo]) || lista.some((e) => e.ref === campo)) continue;
      // Cada candidato entero y, si pisa otro resaltado, su comienzo de 5, 4 o 3 palabras
      const variantes = candidatosDato(t, entry, campo).filter(Boolean).flatMap((c) => {
        const w = limpiarCita(c).split(/\s+/); const out = [w.join(' ')];
        for (let n = Math.min(5, w.length - 1); n >= 3; n--) out.push(w.slice(0, n).join(' '));
        if (w.length > 1 && w[0].length >= 6) out.push(w[0]);
        return out;
      });
      for (const c of variantes) {
        const cita = limpiarCita(c);
        if (cita.length < MIN_CITA) continue;
        let i = t.indexOf(cita); let pos = null;
        while (i >= 0 && !pos) { if (!ocupado(i, i + cita.length)) pos = { inicio: i, fin: i + cita.length }; else i = t.indexOf(cita, i + 1); }
        if (!pos) { const l = localizar(t, cita); if (l && !ocupado(l.inicio, l.fin)) pos = l; }
        if (!pos) continue;
        // Sin palabras cortadas ni cola de palabras vacías («la puerta de» → «la puerta»), sin signos al final
        let { inicio, fin } = pos;
        if (/\p{L}/u.test(t[fin] || '') && /\p{L}/u.test(t[fin - 1] || '')) { const k = t.lastIndexOf(' ', fin); if (k > inicio) fin = k; }
        let z = t.slice(inicio, fin);
        const VACIAS = /\s(?:de|del|la|las|el|los|en|un|una|y|a|al|con|of|the|in|on|and|to|a|der|die|das|dem|den|im|am|mit|und)$/i;
        while (VACIAS.test(z) || /[\s:;,]$/.test(z)) z = z.replace(VACIAS, '').replace(/[\s:;,]+$/, '');
        if (z.length < MIN_CITA) continue;
        pos = { inicio, fin: inicio + z.length };
        const e = { ref: campo, nota: notaDato(campo, d[campo]), cita: t.slice(pos.inicio, pos.fin), inicio: pos.inicio, fin: pos.fin, verificada: true, origen: 'completado' };
        lista.push(e); extra.push(e);
        break;
      }
    }
    // DNI y NIE del texto, con el nombre de su titular si las entidades lo saben
    const titular = Object.fromEntries(((d.entidades && d.entidades.personas) || []).filter((x) => x.dni).map((x) => [x.dni, x.nombre_propio]));
    for (const mm of t.matchAll(/\b\d{8}-?[A-HJ-NP-TV-Z]\b|\b[XYZ]-?\d{7}-?[A-Z]\b/g)) {
      const i = mm.index; const f = i + mm[0].length;
      if (ocupado(i, f)) continue;
      const e = { ref: 'dni', nota: titular[mm[0]] ? I18N.t('evid.dni_de', { nombre: titular[mm[0]] }) : I18N.t('evid.dni'), cita: mm[0], inicio: i, fin: f, verificada: true, origen: 'completado' };
      lista.push(e); extra.push(e);
    }
    return extra;
  }

  // Evidencias finales de una ficha: las del modelo (verificadas), las de respaldo si hay pocas y, al final, un
  // fragmento para cada dato extraído que siga sin resaltar (origen «completado»; `completar: false` lo omite, como hace
  // core/cumplimiento.js para no contar como «usado para decidir» un dato que solo se señala)
  function construir(texto, evidenciasModelo, entry = {}, { completar = true } = {}) {
    const delModelo = anclar(texto, evidenciasModelo, 'modelo');
    const verificadasModelo = delModelo.filter((e) => e.verificada).length;
    let lista = delModelo;
    if (verificadasModelo < 5) {
      const extra = anclar(texto, respaldo(texto, entry), 'respaldo')
        .filter((e) => e.verificada && !delModelo.some((m) => m.verificada && m.inicio < e.fin && m.fin > e.inicio));
      lista = [...delModelo, ...extra];
    }
    const final = resolver(completar ? [...lista, ...completarDatos(texto, resolver(lista), entry)] : lista);
    const verificadas = final.filter((e) => e.verificada).length;
    return {
      lista: final,
      resumen: { total: final.length, verificadas, resaltadas: final.filter((e) => e.resaltada).length, modelo: final.filter((e) => e.origen === 'modelo' && e.verificada).length, respaldo: final.filter((e) => e.origen === 'respaldo' || e.origen === 'completado').length, pedidas: delModelo.length },
    };
  }

  // ---------------------------------------------------------------------------
  // Siguiente paso recomendado: tabla fija por regla incumplida (más fiable y barata que pedirlo al modelo)
  // ---------------------------------------------------------------------------
  const ACCIONES = {
    A1: [I18N.t('evid.verificar_vigencia_y_pago'), I18N.t('evid.comprobar_con_cartera_si'), []],
    A2: [I18N.t('evid.pedir_justificacion_del_retraso'), I18N.t('evid.la_comunicacion_supera_los'), [I18N.t('evid.motivo_del_retraso_en')]],
    A3: [I18N.t('evid.confirmar_quien_conducia'), I18N.t('evid.comprobar_si_el_conductor'), [I18N.t('evid.datos_del_conductor_dni')]],
    A4: [I18N.t('evid.valorar_circunstancias_agravantes'), I18N.t('evid.reunir_el_atestado_o'), [I18N.t('evid.atestado_o_informe_policial')]],
    A5: [I18N.t('evid.derivar_a_danos_corporales'), I18N.t('evid.hay_lesionados_o_faltan'), [I18N.t('evid.atestado_o_parte_amistoso'), I18N.t('evid.datos_del_otro_conductor')]],
    A6: [I18N.t('evid.encargar_peritacion_del_vehiculo'), I18N.t('evid.el_importe_supera_el'), [I18N.t('evid.presupuesto_detallado_del_taller')]],
    A7: [I18N.t('evid.reunir_la_documentacion_del'), I18N.t('evid.falta_documentacion_para_aprobar'), [I18N.t('evid.fotos_de_los_danos'), I18N.t('evid.presupuesto_del_taller')]],
    A8: [I18N.t('evid.revisar_la_coherencia_del'), I18N.t('evid.hay_incoherencias_o_siniestralidad'), []],
    H1: [I18N.t('evid.verificar_vigencia_de_la'), I18N.t('evid.comprobar_que_la_vivienda'), []],
    H2: [I18N.t('evid.pedir_justificacion_del_plazo'), I18N.t('evid.el_dano_puede_ser'), [I18N.t('evid.fecha_en_que_se')]],
    H3: [I18N.t('evid.enviar_perito_al_domicilio'), I18N.t('evid.confirmar_si_el_dano'), [I18N.t('evid.fotos_y_factura_del')]],
    H4: [I18N.t('evid.pedir_denuncia_y_relacion'), I18N.t('evid.el_robo_requiere_denuncia'), [I18N.t('evid.denuncia_policial'), I18N.t('evid.relacion_valorada_de_los'), I18N.t('evid.fotos_de_los_accesos')]],
    H5: [I18N.t('evid.pedir_informe_tecnico'), I18N.t('evid.necesario_para_el_despeje'), [I18N.t('evid.informe_tecnico_o_presupuesto')]],
    H6: [I18N.t('evid.pedir_denuncia_o_fecha'), I18N.t('evid.vandalismo_o_fenomeno_atmosferico'), [I18N.t('evid.denuncia_o_parte_meteorologico')]],
    H7: [I18N.t('evid.revisar_la_antiguedad_de'), I18N.t('evid.poliza_reciente_con_un'), []],
    H8: [I18N.t('evid.verificar_si_la_vivienda'), I18N.t('evid.la_condicion_de_vivienda'), [I18N.t('evid.periodo_de_ocupacion_de')]],
    H9: [I18N.t('evid.peritacion_obligatoria'), I18N.t('evid.el_importe_supera_los'), [I18N.t('evid.presupuesto_detallado')]],
    S1: [I18N.t('evid.verificar_al_asegurado'), I18N.t('evid.comprobar_que_la_persona'), []],
    S2: [I18N.t('evid.comprobar_el_periodo_de'), I18N.t('evid.la_prestacion_podria_estar'), []],
    S3: [I18N.t('evid.revisar_preexistencias'), I18N.t('evid.comparar_con_el_cuestionario'), [I18N.t('evid.informe_medico_previo')]],
    S4: [I18N.t('evid.gestionar_la_autorizacion_previa'), I18N.t('evid.la_prestacion_requeria_autorizacion'), [I18N.t('evid.informe_y_prescripcion_medica')]],
    S5: [I18N.t('evid.verificar_el_cuadro_medico'), I18N.t('evid.el_centro_no_consta'), [I18N.t('evid.factura_del_centro')]],
    S6: [I18N.t('evid.reunir_la_documentacion'), I18N.t('evid.falta_documentacion_para_el'), []],
    S7: [I18N.t('evid.valorar_el_reembolso_o'), I18N.t('evid.importe_alto_o_prestacion'), [I18N.t('evid.facturas_originales')]],
    S8: [I18N.t('evid.coordinar_con_el_otro'), I18N.t('evid.corresponde_primero_al_seguro'), [I18N.t('evid.parte_del_accidente')]],
  };

  function siguientePaso(entry = {}) {
    const incumplidas = (entry.criterios || []).filter((c) => c.resultado === 'incumple');
    if (entry.decision === 'DESPEJADO') {
      return { tono: 'ok', icono: 'circle-check', titulo: I18N.t('evid.tramitar_con_normalidad'), detalle: I18N.t('evid.no_incumple_ninguna_regla'), pedir: [], reglas: [] };
    }
    if (entry.ramo === 'Indeterminado') {
      return { tono: 'review', icono: 'user-check', titulo: I18N.t('evid.asignar_el_ramo_manualmente'), detalle: I18N.t('evid.no_se_pudo_determinar'), pedir: [I18N.t('evid.confirmacion_del_tipo_de')], reglas: [] };
    }
    const [primera, ...resto] = incumplidas;
    const a = primera && ACCIONES[primera.regla];
    if (a) return { tono: 'review', icono: 'user-check', titulo: a[0], detalle: a[1], pedir: [...new Set(incumplidas.flatMap((c) => (ACCIONES[c.regla] || [])[2] || []))], reglas: incumplidas.map((c) => c.regla), otras: resto.map((c) => (ACCIONES[c.regla] || [])[0]).filter(Boolean) };
    return { tono: 'review', icono: 'user-check', titulo: I18N.t('evid.revision_por_un_tramitador'), detalle: entry.motivo || I18N.t('evid.falta_informacion_o_hay'), pedir: [], reglas: incumplidas.map((c) => c.regla) };
  }

  // Borrador del mensaje al cliente pidiendo lo que falta
  function borradorSolicitud(entry, paso) {
    const nombre = (entry.mensaje && entry.mensaje.remitente && entry.mensaje.remitente.nombre) || '';
    const poliza = entry.datos_extraidos && entry.datos_extraidos.numero_poliza;
    const lista = (paso && paso.pedir) || [];
    if (!lista.length) return '';
    return I18N.t('evid.hola_hemos_recibido_su', { split: nombre ? ` ${nombre.split(' ')[0]}` : '', poliza: poliza ? I18N.t('evid.poliza', { poliza }) : '', lista: lista.map((x) => `- ${x}`).join('\n') });
  }

  const API = { MAX_EVIDENCIAS, CAMPOS_DATO, validar, normalizar, localizar, anclar, resolver, segmentos, respaldo, construir, siguientePaso, borradorSolicitud, ACCIONES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Evidencias = API;
})(typeof window !== 'undefined' ? window : globalThis);
