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
  const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
  const DIAS = 'lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo';
  const PATRON_FECHA = [
    new RegExp(`\\b(?:(?:${DIAS})\\s+)?\\d{1,2}\\s+de\\s+(?:${MESES})(?:\\s+de\\s+\\d{4})?\\b`, 'i'),
    new RegExp(`\\b(?:el\\s+)?(?:${DIAS})\\s+\\d{1,2}\\b`, 'i'),
    /\b(?:ayer|anoche|hoy)\s+\d{1,2}\/\d{1,2}\b/i,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
    /\b(?:ayer|anoche|hoy|este\s+finde|el\s+pasado\s+d[ií]a\s+\d{1,2}|esta\s+(?:ma[ñn]ana|tarde|noche)|ahora\s+mismo|hace\s+\w+\s+(?:d[ií]as?|semanas?))\b/i,
  ];
  const PATRON_IMPORTE = /(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s?(?:€|euros?)/gi;
  const PATRON_HORA = /\b(?:sobre|hacia|a)\s+las\s+\d{1,2}(?::\d{2})?\s*(?:h\b)?/i;
  // Vehículo con su matrícula (así no se confunde con el del tercero, que no suele llevarla)
  const PATRON_VEHICULO = /\b(?:Seat|Peugeot|Toyota|Renault|Opel|Volkswagen|Kia|Nissan|Skoda|Citro[eë]n|Ford|Honda|BMW|Audi|Mercedes|Hyundai|Dacia|Fiat)\s+[\wÀ-ÿ-]+(?:\s+[\wÀ-ÿ-]+)?\s+\d{4}\s?[A-Z]{3}\b/;
  const PATRON_CENTRO = /\b(?:Hospital|Cl[ií]nica|Centro M[eé]dico)\s+[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñÑ-]*(?:\s+(?:[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñÑ-]*|de|del|la))*[A-Za-zÁÉÍÓÚáéíóúñÑ]/;
  const PATRON_LESION = /\b(?:fractura de [a-záéíóúñ]+(?: y [^,.;]{1,20})?|esguince(?: de grado [IV]+)?|herid[oa]s? (?:leve|grave)s?|ingresad[oa]\b|contusi[oó]n[^,.;]{0,20}|\d+ puntos)/i;
  const PATRON_SIN_LESION = /\b(?:no hubo heridos|nadie (?:se ha hecho|ha resultado) (?:da[ñn]o|herido)|sin heridos|nadie herido)\b/i;
  const PATRON_DOCS = /\b(parte amistoso|atestado|denuncia|facturas?|presupuesto|informe(?: de [a-záéíóúñ]+)?|fotos?|tarjeta(?: sanitaria)?(?: [\d ]{9,})?|prescripci[oó]n|volante)\b/gi;

  // Patrones por regla (solo para el motor local: no hay modelo que cite)
  const PATRON_REGLA = {
    A3: /mi\s+(?:hijo|hija|sobrin\w+|amig\w+|novi\w+|cu[ñn]ad\w+)[^.]{0,60}?\b(?:cogi[oó]|conduc\w+|llevaba)\b/i,
    A4: /\b(?:cervez\w+|alcohol|copas|drog\w+|sin carn[eé]|sin permiso)\b/i,
    A5: /\b(?:herid\w+|lesion\w+|fractura[^,.;]*|ingresad\w+|ambulancia)\b/i,
    A6: PATRON_IMPORTE,
    H2: /\b(?:desde hace [^.,]*|hace (?:unos|varios|un par de) (?:meses|semanas))\b/i,
    H3: /\b(?:humedad\w*|filtraci\w+|condensaci\w+|silicona|junta)\b/i,
    H4: /\b(?:se han llevado[^.,;]*|rob\w+|sustra\w+|han entrado en casa)\b/i,
    H5: /\b(?:cristal\w*|mampara|vitrocer[aá]mica|sobretensi[oó]n|subida de tensi[oó]n)\b/i,
    H9: PATRON_IMPORTE,
    S2: /\b(?:oper\w+|cirug[ií]a|hospitaliz\w+|ingres\w+)\b/i,
    S3: /\b(?:arrastraba|ya ten[ií]a|desde hace (?:a[ñn]os|un par de a[ñn]os))\b/i,
    S4: /\b(?:me operaron|ya me han operado|adjunto la factura|\d+\s+sesiones)\b/i,
    S5: /\b(?:fuera del cuadro|no est[aá] en (?:vuestro|el) cuadro|cl[ií]nica privada|cuadro m[eé]dico)\b/i,
    S7: /\breembols\w+/i,
    S8: /\b(?:laboral|en el trabajo|mutua|accidente de tr[aá]fico)\b/i,
  };

  const fmtMiles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmtEuros = (n) => `${fmtMiles(n)} €`;

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
    const out = [];
    const add = (ref, cita, nota) => { if (cita) out.push({ ref, cita, nota }); };
    const buscar = (re) => { re.lastIndex = 0; const m = re.exec(t); return m ? m[0] : null; };

    // Ramo: citas entre comillas de criterios_ramo o, en el motor local, las palabras clave del ramo asignado
    for (const c of entry.criterios_ramo || []) {
      const citas = citasDeTexto(c);
      const resto = String(c).replace(/["“«][^"”»]*["”»]\s*:?\s*/, '').trim();
      if (citas.length) { citas.forEach((q) => add('ramo', q, resto || 'Indicio del ramo')); continue; }
      const local = String(c).match(/^(Auto|Hogar|Salud): (.+) \(\d+\)$/);
      if (local && local[1] === entry.ramo && !/sin indicios/.test(local[2])) local[2].split(', ').slice(0, 3).forEach((w) => add('ramo', w, `Indicio de ${entry.ramo}`));
    }

    if (datos.numero_poliza) add('numero_poliza', String(datos.numero_poliza), 'Póliza identificada');
    if (datos.fecha_hecho) { for (const re of PATRON_FECHA) { const f = buscar(re); if (f) { add('fecha_hecho', f, 'Fecha del hecho'); break; } } }
    if (datos.importe_estimado_eur != null) {
      PATRON_IMPORTE.lastIndex = 0;
      let n = 0;
      for (const m of t.matchAll(PATRON_IMPORTE)) { if (n++ >= 3) break; add('importe_estimado_eur', m[0], `Importe mencionado (total estimado ${fmtEuros(datos.importe_estimado_eur)})`); }
    }
    if (datos.lugar) {
      const l = String(datos.lugar); const partes = [l, l.split(',')[0], l.replace(/^.*?\b(?:de|del|en)\s+(?=[A-ZÁÉÍÓÚ])/, '')];
      const hallada = partes.find((p) => p && localizar(t, p));
      if (hallada) add('lugar', hallada, 'Lugar del hecho');
    }
    // Hora, vehículo, centro sanitario y lesiones: suman evidencias cuando el modelo cita poco
    const hora = buscar(PATRON_HORA); if (hora && datos.fecha_hecho) add('fecha_hecho', hora, 'Hora del hecho');
    if (entry.ramo === 'Auto') { const v = buscar(PATRON_VEHICULO); if (v) add('ramo', v, 'Vehículo asegurado'); }
    if (entry.ramo === 'Salud') { const h = buscar(PATRON_CENTRO); if (h) add('lugar', h, 'Centro sanitario'); }
    if (datos.lesionados) { const l = buscar(PATRON_LESION); if (l) add('lesionados', l, 'Lesión mencionada'); }
    else { const l = buscar(PATRON_SIN_LESION); if (l) add('lesionados', l, 'Sin lesionados'); }
    PATRON_DOCS.lastIndex = 0;
    const vistos = new Set();
    for (const m of t.matchAll(PATRON_DOCS)) { const k = m[0].toLowerCase(); if (vistos.has(k) || vistos.size >= 3) continue; vistos.add(k); add('documentacion_mencionada', m[0].trim(), 'Documentación mencionada'); }

    for (const c of entry.criterios || []) {
      if (c.resultado === 'no_aplica') continue;
      const citas = citasDeTexto(c.evidencia);
      const origenLocal = /^reglas locales/.test(entry.origen || '') || !citas.length;
      const pat = PATRON_REGLA[c.regla];
      const hallada = citas[0] || (c.resultado === 'incumple' && origenLocal && pat ? buscar(pat instanceof RegExp ? new RegExp(pat.source, pat.flags.replace('g', '')) : pat) : null);
      if (hallada) add(`regla:${c.regla}`, hallada, c.evidencia || c.descripcion);
    }
    return out;
  }

  // Evidencias finales de una ficha: las del modelo (verificadas) y, si hay pocas, las de respaldo
  function construir(texto, evidenciasModelo, entry = {}) {
    const delModelo = anclar(texto, evidenciasModelo, 'modelo');
    const verificadasModelo = delModelo.filter((e) => e.verificada).length;
    let lista = delModelo;
    if (verificadasModelo < 5) {
      const extra = anclar(texto, respaldo(texto, entry), 'respaldo')
        .filter((e) => e.verificada && !delModelo.some((m) => m.verificada && m.inicio < e.fin && m.fin > e.inicio));
      lista = [...delModelo, ...extra];
    }
    const final = resolver(lista);
    const verificadas = final.filter((e) => e.verificada).length;
    return {
      lista: final,
      resumen: { total: final.length, verificadas, resaltadas: final.filter((e) => e.resaltada).length, modelo: final.filter((e) => e.origen === 'modelo' && e.verificada).length, respaldo: final.filter((e) => e.origen === 'respaldo').length, pedidas: delModelo.length },
    };
  }

  // ---------------------------------------------------------------------------
  // Siguiente paso recomendado: tabla fija por regla incumplida (más fiable y barata que pedirlo al modelo)
  // ---------------------------------------------------------------------------
  const ACCIONES = {
    A1: ['Verificar vigencia y pago de la póliza', 'Comprobar con Cartera si la póliza estaba vigente y al corriente en la fecha del hecho.', []],
    A2: ['Pedir justificación del retraso', 'La comunicación supera los 7 días del art. 16 LCS: solicitar la causa del retraso.', ['motivo del retraso en la comunicación']],
    A3: ['Confirmar quién conducía', 'Comprobar si el conductor está declarado en la póliza o valorar su inclusión.', ['datos del conductor (DNI y fecha de nacimiento)']],
    A4: ['Valorar circunstancias agravantes', 'Reunir el atestado o informe antes de decidir.', ['atestado o informe policial']],
    A5: ['Derivar a daños corporales', 'Hay lesionados o faltan documentos de terceros: gestión especializada.', ['atestado o parte amistoso firmado', 'datos del otro conductor']],
    A6: ['Encargar peritación del vehículo', 'El importe supera el umbral de despeje directo.', ['presupuesto detallado del taller']],
    A7: ['Reunir la documentación del despeje directo', 'Falta documentación para aprobar de forma automática.', ['fotos de los daños', 'presupuesto del taller']],
    A8: ['Revisar la coherencia del relato', 'Hay incoherencias o siniestralidad previa: revisar con un tramitador senior.', []],
    H1: ['Verificar vigencia de la póliza', 'Comprobar que la vivienda estaba asegurada en la fecha del hecho.', []],
    H2: ['Pedir justificación del plazo', 'El daño puede ser anterior a los 7 días de plazo.', ['fecha en que se conoció el daño']],
    H3: ['Enviar perito al domicilio', 'Confirmar si el daño por agua fue súbito o una filtración progresiva.', ['fotos y factura del fontanero']],
    H4: ['Pedir denuncia y relación de objetos; enviar perito', 'El robo requiere denuncia y signos de fuerza; falta información esencial.', ['denuncia policial', 'relación valorada de los objetos sustraídos', 'fotos de los accesos forzados']],
    H5: ['Pedir informe técnico', 'Necesario para el despeje directo por sobretensión o cristales.', ['informe técnico o presupuesto']],
    H6: ['Pedir denuncia o fecha verificable', 'Vandalismo o fenómeno atmosférico sin denuncia o con importe alto.', ['denuncia o parte meteorológico']],
    H7: ['Revisar la antigüedad de la póliza', 'Póliza reciente con un siniestro de importe alto.', []],
    H8: ['Verificar si la vivienda estaba habitada', 'La condición de vivienda deshabitada limita la cobertura.', ['periodo de ocupación de la vivienda']],
    H9: ['Peritación obligatoria', 'El importe supera los 10.000 €.', ['presupuesto detallado']],
    S1: ['Verificar al asegurado', 'Comprobar que la persona atendida figura en la póliza y está al corriente.', []],
    S2: ['Comprobar el periodo de carencia', 'La prestación podría estar dentro del periodo de carencia.', []],
    S3: ['Revisar preexistencias', 'Comparar con el cuestionario de salud de la contratación.', ['informe médico previo']],
    S4: ['Gestionar la autorización previa', 'La prestación requería autorización y no consta.', ['informe y prescripción médica']],
    S5: ['Verificar el cuadro médico', 'El centro no consta en el cuadro: comprobar la modalidad de reembolso.', ['factura del centro']],
    S6: ['Reunir la documentación', 'Falta documentación para el despeje directo.', []],
    S7: ['Valorar el reembolso o la exclusión', 'Importe alto o prestación posiblemente excluida.', ['facturas originales']],
    S8: ['Coordinar con el otro seguro', 'Corresponde primero al seguro del vehículo o a la mutua laboral.', ['parte del accidente']],
  };

  function siguientePaso(entry = {}) {
    const incumplidas = (entry.criterios || []).filter((c) => c.resultado === 'incumple');
    if (entry.decision === 'DESPEJADO') {
      return { tono: 'ok', icono: 'circle-check', titulo: 'Tramitar con normalidad', detalle: 'No incumple ninguna regla y hay información suficiente: abrir el expediente y confirmar la recepción al cliente.', pedir: [], reglas: [] };
    }
    if (entry.ramo === 'Indeterminado') {
      return { tono: 'review', icono: 'user-check', titulo: 'Asignar el ramo manualmente', detalle: 'No se pudo determinar el ramo con suficiente confianza: un tramitador debe clasificarlo.', pedir: ['confirmación del tipo de siniestro'], reglas: [] };
    }
    const [primera, ...resto] = incumplidas;
    const a = primera && ACCIONES[primera.regla];
    if (a) return { tono: 'review', icono: 'user-check', titulo: a[0], detalle: a[1], pedir: [...new Set(incumplidas.flatMap((c) => (ACCIONES[c.regla] || [])[2] || []))], reglas: incumplidas.map((c) => c.regla), otras: resto.map((c) => (ACCIONES[c.regla] || [])[0]).filter(Boolean) };
    return { tono: 'review', icono: 'user-check', titulo: 'Revisión por un tramitador', detalle: entry.motivo || 'Falta información o hay indicios que requieren una persona.', pedir: [], reglas: incumplidas.map((c) => c.regla) };
  }

  // Borrador del mensaje al cliente pidiendo lo que falta
  function borradorSolicitud(entry, paso) {
    const nombre = (entry.mensaje && entry.mensaje.remitente && entry.mensaje.remitente.nombre) || '';
    const poliza = entry.datos_extraidos && entry.datos_extraidos.numero_poliza;
    const lista = (paso && paso.pedir) || [];
    if (!lista.length) return '';
    return `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}, hemos recibido su aviso${poliza ? ` (póliza ${poliza})` : ''}. Para poder tramitarlo necesitamos que nos envíe:\n${lista.map((x) => `- ${x}`).join('\n')}\nGracias, quedamos a su disposición.`;
  }

  const API = { MAX_EVIDENCIAS, validar, normalizar, localizar, anclar, resolver, segmentos, respaldo, construir, siguientePaso, borradorSolicitud, ACCIONES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Evidencias = API;
})(typeof window !== 'undefined' ? window : globalThis);
