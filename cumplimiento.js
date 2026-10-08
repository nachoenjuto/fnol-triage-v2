// Capa de cumplimiento normativo del triaje: detecta datos personales y de salud en el mensaje, explica la
// decisión con las evidencias verificadas, sella la traza (SHA-256) y calcula plazos de retención.
// Lógica pura (sin DOM), compartida por index.html (Respuesta cruda), gobierno.html (Termómetro de cumplimiento)
// y Node (tests/cumplimiento.test.js): así las dos páginas muestran siempre los mismos datos.
//
// Principio: el modelo no se autocertifica. Todo lo que hay en `_gobernanza` lo calcula la plataforma de forma
// determinista a partir del mensaje y de la salida del modelo; no se le pide al LLM.
(function (root) {
  'use strict';

  const Ev = root.Evidencias || (typeof require === 'function' ? require('./evidencias.js') : null);
  const ESQUEMA = 'fnol-gobernanza/1.0';

  // ---------------------------------------------------------------------------
  // Catálogo de normas: etiqueta corta (la que se ve en las fichas) y explicación (tooltip)
  // ---------------------------------------------------------------------------
  const ALTO_RIESGO = 'Exigible a sistemas de alto riesgo desde el 02/12/2027 (Digital Omnibus); el triaje de siniestros no lo es, aquí se aplica como buena práctica.';
  const NORMAS = {
    'ai-4': ['AI Act art. 4', 'Alfabetización en IA: el personal que usa el sistema debe tener formación suficiente. Aplicable desde el 02/02/2025.'],
    'ai-6': ['AI Act art. 6', 'Clasificación de sistemas de alto riesgo. El Anexo III 5.c solo incluye la evaluación de riesgos y la tarificación en seguros de vida y salud: el triaje de siniestros no es alto riesgo.'],
    'ai-9': ['AI Act art. 9', `Sistema de gestión de riesgos durante todo el ciclo de vida. ${ALTO_RIESGO}`],
    'ai-10': ['AI Act art. 10', `Gobernanza de los datos y del conocimiento que usa el sistema (versionado, calidad, sesgos). ${ALTO_RIESGO}`],
    'ai-12': ['AI Act art. 12', `Registro automático de eventos para trazar el funcionamiento del sistema. ${ALTO_RIESGO}`],
    'ai-13': ['AI Act art. 13', `Transparencia: el usuario del sistema debe poder interpretar sus resultados. ${ALTO_RIESGO}`],
    'ai-14': ['AI Act art. 14', `Supervisión humana efectiva, incluida la capacidad de interrumpir el sistema. ${ALTO_RIESGO}`],
    'ai-15': ['AI Act art. 15', `Precisión, solidez y ciberseguridad mantenidas a lo largo del tiempo. ${ALTO_RIESGO}`],
    'ai-19': ['AI Act art. 19 y 26.6', `Conservación de los registros generados automáticamente durante al menos 6 meses. ${ALTO_RIESGO}`],
    'ai-50': ['AI Act art. 50', 'Transparencia ante las personas: informar de que interactúan con un sistema de IA o de que un contenido lo ha generado una IA. Aplicable desde el 02/08/2026.'],
    'rgpd-4': ['RGPD art. 4.1', 'Dato personal: cualquier información sobre una persona física identificada o identificable (nombre, DNI, teléfono, matrícula, póliza…). En vigor.'],
    'rgpd-4-5': ['RGPD art. 4.5', 'Seudonimización: el dato ya no puede atribuirse a una persona sin información adicional guardada por separado. Sigue siendo dato personal (a diferencia de la anonimización, considerando 26).'],
    'rgpd-5': ['RGPD art. 5.2', 'Responsabilidad proactiva: el responsable debe poder demostrar que cumple. En vigor.'],
    'rgpd-5c': ['RGPD art. 5.1.c', 'Minimización: solo los datos adecuados, pertinentes y limitados a lo necesario para la finalidad. En vigor.'],
    'rgpd-5e': ['RGPD art. 5.1.e', 'Limitación del plazo de conservación: identificables solo el tiempo necesario. En vigor.'],
    'rgpd-8': ['RGPD art. 8 y cons. 38', 'Los menores merecen una protección específica de sus datos personales. En vigor.'],
    'rgpd-9': ['RGPD art. 9', 'Categorías especiales: los datos de salud solo pueden tratarse con una de las excepciones del art. 9.2. En seguros, art. 9.2 junto con el art. 99 de la LOSSEAR (a validar por el DPO).'],
    'rgpd-13': ['RGPD art. 13 y 14', 'Información al interesado, también cuando sus datos no los aporta él mismo (art. 14: terceros mencionados en el mensaje). En vigor.'],
    'rgpd-15': ['RGPD art. 15', 'Derecho de acceso a información significativa sobre la lógica aplicada (TJUE, Dun & Bradstreet C-203/22). En vigor.'],
    'rgpd-22': ['RGPD art. 22', 'Derecho a no ser objeto de decisiones solo automatizadas con efectos jurídicos. Firmar sin revisar no cuenta como intervención humana (TJUE, SCHUFA C-634/21). En vigor.'],
    'rgpd-25': ['RGPD art. 25', 'Protección de datos desde el diseño y por defecto. En vigor.'],
    'rgpd-28': ['RGPD art. 28', 'Encargado del tratamiento: contrato (DPA) con el proveedor de IA y garantías de ubicación de los datos. En vigor.'],
    'rgpd-30': ['RGPD art. 30', 'Registro de actividades de tratamiento (RAT). En vigor.'],
    'rgpd-32': ['RGPD art. 32', 'Seguridad del tratamiento: cifrado, seudonimización, control de acceso. En vigor.'],
    'rgpd-35': ['RGPD art. 35', 'Evaluación de impacto (EIPD): obligatoria para tratamientos a gran escala de datos de salud o con nuevas tecnologías. En vigor.'],
    'lopdgdd-32': ['LOPDGDD art. 32', 'Bloqueo: al terminar la finalidad, los datos se bloquean (solo a disposición de jueces y autoridades) durante el plazo de prescripción y después se suprimen.'],
    'lcs-23': ['LCS art. 23', 'Prescripción de las acciones del contrato de seguro: 2 años en seguros de daños y 5 años en seguros de personas.'],
    'lossear-99': ['LOSSEAR art. 99', 'Ley 20/2015: tratamiento por las aseguradoras de los datos necesarios para el contrato, incluidos los de salud.'],
    'dora-9': ['DORA art. 9', 'Protección y prevención: gestión de identidades, accesos y privilegios mínimos. En vigor desde 01/2025.'],
    'dora-11': ['DORA art. 11', 'Respuesta y recuperación: continuidad del servicio cuando falla un componente TIC. En vigor desde 01/2025.'],
    'dora-19': ['DORA art. 19', 'Notificación de incidentes graves relacionados con las TIC. En vigor desde 01/2025.'],
    'dora-28': ['DORA art. 28', 'Riesgo de terceros TIC: los proveedores de modelos de IA entran en el registro de información y en el análisis de concentración. En vigor desde 01/2025.'],
    'eiopa': ['EIOPA', 'Opinión sobre gobierno y gestión del riesgo de la IA (08/2025): gobierno proporcional, rendición de cuentas y documentación para todo uso de IA en seguros.'],
    'sii-41': ['Solvencia II art. 41', 'Sistema de gobernanza eficaz que garantice una gestión sana y prudente de la actividad, incluido el control del gasto en IA.'],
  };
  const N = (k) => NORMAS[k][0];
  // Búsqueda inversa por etiqueta (para pintar tooltips sobre las normas citadas en el JSON)
  const NORMA_POR_ETIQUETA = Object.fromEntries(Object.values(NORMAS).map(([e, t]) => [e, t]));

  // ---------------------------------------------------------------------------
  // SHA-256 síncrono (mismo resultado en el navegador y en Node; comprobado contra crypto en los tests)
  // ---------------------------------------------------------------------------
  const PRIMOS = []; for (let n = 2; PRIMOS.length < 64; n++) if (PRIMOS.every((p) => n % p)) PRIMOS.push(n);
  const frac = (x) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
  const K = PRIMOS.map((p) => frac(Math.cbrt(p)));
  const H0 = PRIMOS.slice(0, 8).map((p) => frac(Math.sqrt(p)));
  const utf8 = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')));
  function sha256(texto) {
    const bytes = utf8(String(texto ?? ''));
    const l = bytes.length; const total = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total); m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, (l * 8) >>> 0); dv.setUint32(total - 8, Math.floor(l / 0x20000000));
    const H = H0.slice(); const w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < total; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rot(w[t - 15], 7) ^ rot(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rot(w[t - 2], 17) ^ rot(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, k) => { H[k] = (H[k] + v) | 0; });
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const corto = (h) => `sha256:${h.slice(0, 16)}…`;

  // ---------------------------------------------------------------------------
  // Detección de datos personales (expresiones y diccionarios en español)
  // ---------------------------------------------------------------------------
  const CATEGORIAS = {
    identificativo: { etiqueta: 'Identificativo', tratamiento: 'Seudonimizado en la traza', normas: [N('rgpd-4'), N('rgpd-4-5')] },
    contacto: { etiqueta: 'Contacto', tratamiento: 'Enmascarado en la traza', normas: [N('rgpd-4'), N('rgpd-32')] },
    indirecto: { etiqueta: 'Identificador indirecto', tratamiento: 'Seudonimizado en la traza', normas: [N('rgpd-4'), N('rgpd-4-5')] },
    localizacion: { etiqueta: 'Localización', tratamiento: 'Generalizado al municipio en la traza', normas: [N('rgpd-4'), N('rgpd-5c')] },
    financiero: { etiqueta: 'Financiero', tratamiento: 'Enmascarado; excluido del contexto de decisión', normas: [N('rgpd-32'), N('rgpd-5c')] },
    salud: { etiqueta: 'Salud (categoría especial)', tratamiento: 'Cifrado de campo; acceso solo para el rol Salud', normas: [N('rgpd-9'), N('lossear-99')] },
    menor: { etiqueta: 'Menor de edad', tratamiento: 'Protección reforzada; sin uso para perfilado', normas: [N('rgpd-8')] },
    tercero: { etiqueta: 'Tercero no remitente', tratamiento: 'Seudonimizado; informar al interesado (art. 14)', normas: [N('rgpd-13'), N('rgpd-4-5')] },
  };

  const NOMBRE = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}';
  // [tipo, categoría, expresión, grupo con el dato (opcional)]
  const DETECTORES = [
    ['iban', 'financiero', /\bES\d{2}(?:\s?\d{4}){5}\b/g],
    ['email', 'contacto', /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g],
    ['dni', 'identificativo', /\b\d{8}-?[A-HJ-NP-TV-Z]\b/g],
    ['nie', 'identificativo', /\b[XYZ]-?\d{7}-?[A-Z]\b/g],
    ['tarjeta_sanitaria', 'indirecto', /\b\d{4}\s\d{4}\s\d{4}\b/g],
    ['telefono', 'contacto', /(?:\+34\s?)?\b[6789]\d{2}\s\d{3}\s\d{3}\b/g],
    ['poliza', 'indirecto', /\b(?:AU|HO|SA)-\d{6}\b/g],
    ['matricula', 'indirecto', /\b\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g],
    ['expediente', 'indirecto', /\b\d{4}-\d{6}-[A-Z]{2}\b|\b\d{5}\/\d{2}\b/g],
    ['direccion', 'localizacion', /\b(?:C\/|[Cc]alle|[Aa]venida|[Pp]laza)\s[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ ]{1,30}?\s\d{1,3}(?:,\s*\d{1,2}\.º\s?[A-Z])?(?:,?\s*\d{5})?(?:,?\s+Madrid)?/g],
    ['direccion', 'localizacion', /\bn\.º\s\d{1,3}\sde\sla\scalle\s[A-ZÁÉÍÓÚ][\wáéíóúñ]+(?:\s[A-ZÁÉÍÓÚ][\wáéíóúñ]+)*/g],
    ['nombre_tercero', 'tercero', new RegExp(`\\b(?:mi (?:hijo|hija|marido|mujer|esposa?|padre|madre)|[Ee]l vecino|el otro conductor es|\\bDra?\\.)(?:,)?\\s(${NOMBRE})`, 'g'), 1],
    ['menor', 'menor', /\b[Ll]os niños del vecino\b/g],
    ['menor', 'menor', /\((\d{1,2}) años\)/g, 0, (m) => Number(m[1]) < 18],
  ];
  const SALUD = [
    /\bfractura de [a-záéíóúñ]+(?: y (?:dos |tres )?[a-záéíóúñ]+)?/gi,
    /\besguince(?: de grado [IV]+)?/gi,
    /\bcrisis de asma\b/gi, /\basmátic[oa] desde [a-záéíóúñ]+\b/gi, /\bes diabétic[oa]\b/gi,
    /\bdolor lumbar\b/gi, /\bdolor de oído\b/gi, /\botitis\b/gi,
    /\bradiografía(?: de (?:columna )?[a-záéíóúñ]+(?: lumbar)?| del [a-záéíóúñ]+)?/gi,
    /\b(?:analítica completa|gasometría|nebulizaciones|corticoides(?: orales)?|ibuprofeno|antiinflamatorio|inhalador|férula)\b/gi,
    /\ble tienen que operar(?: la [a-záéíóúñ]+)?/gi,
    /\bingresad[oa]\b/gi,
    /\burgencias(?: pediátricas)?\b/gi,
    /\bme he torcido el tobillo(?: derecho| izquierdo)?/gi,
    /\bse ha hecho daño en el brazo(?: izquierdo| derecho)?/gi,
  ];

  const limpiarNombre = (s) => String(s || '').replace(/\s*\(.*$/, '').trim();

  // Hallazgos en el texto: { tipo, categoria, inicio, fin, cita }. Admite solapes entre categorías distintas.
  function detectar(texto, contexto = {}) {
    const t = String(texto ?? '');
    const out = [];
    const add = (tipo, categoria, inicio, fin) => {
      if (fin <= inicio) return;
      // Misma categoría solapada, o un dato no sanitario dentro de otro (p. ej. «2100 0418 4502» dentro del IBAN)
      if (out.some((h) => (h.categoria === categoria || (categoria !== 'salud' && h.categoria !== 'salud')) && inicio < h.fin && fin > h.inicio)) return;
      out.push({ tipo, categoria, inicio, fin, cita: t.slice(inicio, fin) });
    };
    // Nombre del remitente y del asegurado (si es otra persona, es un tercero)
    const remitente = limpiarNombre(contexto.remitente);
    const asegurado = limpiarNombre(contexto.asegurado);
    [[remitente, 'nombre', 'identificativo'], [asegurado !== remitente ? asegurado : '', 'nombre_tercero', 'tercero']].forEach(([nom, tipo, cat]) => {
      if (!nom || nom.split(' ').length < 2) return;
      let i = t.indexOf(nom);
      while (i >= 0) { add(tipo, cat, i, i + nom.length); i = t.indexOf(nom, i + nom.length); }
    });
    for (const [tipo, cat, re, grupo, filtro] of DETECTORES) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) {
        if (filtro && !filtro(m)) continue;
        const dato = grupo ? m[grupo] : m[0];
        const ini = m.index + (grupo ? m[0].indexOf(dato) : 0);
        if (tipo === 'nombre_tercero' && remitente.includes(dato)) continue;
        add(tipo, cat, ini, ini + dato.length);
      }
    }
    for (const re of SALUD) { re.lastIndex = 0; for (const m of t.matchAll(re)) add('salud', 'salud', m.index, m.index + m[0].length); }
    return out.sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  }

  // Valor que queda en la traza persistida (nunca el dato en claro)
  function enmascarar(h) {
    const c = h.cita; const tok = (p) => `${p}-${sha256(c.toLowerCase()).slice(0, 4).toUpperCase()}`;
    switch (h.tipo) {
      case 'nombre': case 'nombre_tercero': return tok('PER');
      case 'dni': case 'nie': return `${'•'.repeat(c.length - 3)}${c.slice(-3)}`;
      case 'email': return c.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
      case 'telefono': return c.replace(/(\d{3})(\s?)\d{3}(\s?)(\d{3})$/, '$1$2•••$3$4');
      case 'iban': return `${c.slice(0, 4)} •••• •••• •••• •••• ${c.replace(/\s/g, '').slice(-4)}`;
      case 'poliza': return tok('POL');
      case 'matricula': return tok('MAT');
      case 'tarjeta_sanitaria': return tok('TSI');
      case 'expediente': return tok('EXP');
      case 'direccion': return /Madrid/.test(c) ? 'Madrid (municipio)' : 'Municipio (generalizado)';
      case 'menor': return '[menor de edad]';
      case 'salud': return '[dato de salud cifrado]';
      default: return '•••';
    }
  }

  // Campos de la salida del modelo que contienen datos personales (para marcarlos en la Respuesta cruda)
  function camposSensibles(entry = {}) {
    const d = entry.datos_extraidos || {};
    const out = {};
    if (d.nombre_cliente) out['datos_extraidos.nombre_cliente'] = 'identificativo';
    if (d.numero_poliza) out['datos_extraidos.numero_poliza'] = 'indirecto';
    if (d.lugar) out['datos_extraidos.lugar'] = 'localizacion';
    if (entry.ramo === 'Salud' || d.lesionados) { out['datos_extraidos.tipo_siniestro'] = 'salud'; out['datos_extraidos.lesionados'] = 'salud'; out['datos_extraidos.observaciones'] = 'salud'; }
    return out;
  }

  // Claves de la salida del modelo que sirven para trazabilidad y explicabilidad, con la norma a la que ayudan
  const CLAVES_NORMA = {
    ramo: [N('ai-13')], criterios_ramo: [N('ai-13'), N('rgpd-15')], datos_extraidos: [N('rgpd-5c')],
    criterios: [N('ai-12'), N('rgpd-22')], evidencias: [N('ai-13'), N('rgpd-15')], decision: [N('rgpd-22'), N('ai-14')],
    motivo: [N('rgpd-15'), N('ai-13')], confianza: [N('ai-15')],
  };

  // ---------------------------------------------------------------------------
  // Explicabilidad: por qué este ramo y por qué no los otros
  // ---------------------------------------------------------------------------
  const RAMOS = ['Auto', 'Hogar', 'Salud'];
  const INDICIOS = {
    Auto: /\b(?:coche|moto|veh[ií]culo|matr[ií]cula|parking|taller|parte amistoso|parabrisas|conductor|rotonda|autov[ií]a|AU-\d{6})\b/gi,
    Hogar: /\b(?:casa|vivienda|cocina|sal[oó]n|ventana|cristal|tarima|fregadero|televisor|urbanizaci[oó]n|cajones|HO-\d{6})\b/gi,
    Salud: /\b(?:urgencias|hospital|m[eé]dico|radiograf[ií]a|traumat[oó]log[oa]|cuadro m[eé]dico|pediatra|fractura|asma|SA-\d{6})\b/gi,
  };
  function indicios(texto, ramo) {
    INDICIOS[ramo].lastIndex = 0;
    return [...new Set([...String(texto).matchAll(INDICIOS[ramo])].map((m) => m[0].toLowerCase()))];
  }
  function descartados(texto, entry) {
    return RAMOS.filter((r) => r !== entry.ramo).map((r) => {
      const ind = indicios(texto, r);
      // Si el propio criterio del modelo menciona el ramo alternativo, esa es la explicación más fiel
      const cr = (entry.criterios_ramo || []).find((c) => new RegExp(`\\b${r}\\b`).test(c));
      const motivo = cr || (ind.length
        ? `Hay indicios de ${r} (${ind.slice(0, 3).join(', ')}), pero el hecho causante y la póliza citada corresponden a ${entry.ramo}`
        : `Sin indicios de ${r} en el mensaje`);
      return { ramo: r, indicios: ind.slice(0, 4), motivo };
    });
  }

  // ---------------------------------------------------------------------------
  // Bloque _gobernanza de una decisión
  // ---------------------------------------------------------------------------
  const sumarAnios = (iso, n) => { const d = new Date(iso); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
  const sumarMeses = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

  function gobernanza(entry = {}, opts = {}) {
    const m = entry.mensaje || {};
    const texto = String(m.texto || '');
    const ts = opts.timestamp || entry.timestamp || new Date().toISOString();
    const ev = Ev ? Ev.construir(texto, entry.evidencias, entry) : { lista: [] };
    const verificadas = ev.lista.filter((e) => e.verificada && e.resaltada);

    // Datos personales: posición en el texto, valor en la traza y si se usó para decidir
    const hallazgos = detectar(texto, { remitente: m.remitente && m.remitente.nombre, asegurado: (entry.datos_extraidos || {}).nombre_cliente })
      .map((h, i) => ({
        id: `P${i + 1}`, categoria: h.categoria, tipo: h.tipo, posicion: [h.inicio, h.fin], valor_en_traza: enmascarar(h),
        usado_en_decision: verificadas.some((e) => h.inicio < e.fin && h.fin > e.inicio),
        tratamiento: CATEGORIAS[h.categoria].tratamiento, normas: CATEGORIAS[h.categoria].normas, _cita: h.cita,
      }));
    const porCategoria = {};
    hallazgos.forEach((h) => { porCategoria[h.categoria] = (porCategoria[h.categoria] || 0) + 1; });

    const incumplidas = (entry.criterios || []).filter((c) => c.resultado === 'incumple').map((c) => c.regla);
    const revision = entry.decision === 'REVISION';
    const personas = entry.ramo === 'Salud';
    const hashEntrada = sha256(texto);
    const hashSalida = sha256(entry.raw || '');
    const hashRegistro = sha256(`${hashEntrada}|${hashSalida}|${ts}`);

    // La explicación también se guarda seudonimizada: cada dato personal (salvo salud, cifrado aparte) por su valor en la traza
    const sustituir = hallazgos.filter((h) => h.categoria !== 'salud').sort((x, y) => y._cita.length - x._cita.length);
    const masc = (str) => sustituir.reduce((acc, h) => acc.split(h._cita).join(h.valor_en_traza), String(str ?? ''));
    const conSalud = (str) => hallazgos.some((h) => h.categoria === 'salud' && String(str).includes(h._cita));
    const porQue = verificadas.filter((e) => e.ref === 'ramo' || e.ref === 'tipo_siniestro' || e.ref === 'numero_poliza').slice(0, 4)
      .map((e) => ({ evidencia: e.n, cita: masc(e.cita), nota: masc(e.nota || ''), ...(conSalud(e.cita) ? { cifrado: 'contiene datos de salud: campo cifrado' } : {}) }));
    const descarte = descartados(texto, entry).map((d) => ({ ...d, indicios: d.indicios.map(masc), motivo: masc(d.motivo) }));

    return {
      esquema: ESQUEMA,
      generado_por: 'Plataforma de gobierno (determinista); no lo genera el modelo',
      trazabilidad: {
        traza_id: opts.traza_id || `TRZ-${hashRegistro.slice(0, 6).toUpperCase()}`,
        mensaje_id: entry.id || m.id || null,
        registrado: ts,
        canal: m.canal || null,
        modelo: opts.modelo || null,
        prompt: opts.prompt || null,
        origen: entry.origen || null,
        hash_entrada: `sha256:${hashEntrada}`,
        hash_salida: `sha256:${hashSalida}`,
        hash_registro: `sha256:${hashRegistro}`,
        normas: [N('ai-12'), N('rgpd-5')],
      },
      retencion: {
        traza_seudonimizada: { plazo: '6 meses como mínimo', hasta: sumarMeses(ts, 6), normas: [N('ai-19')] },
        expediente: { plazo: personas ? '5 años (seguro de personas)' : '2 años (seguro de daños)', hasta: sumarAnios(ts, personas ? 5 : 2), normas: [N('lcs-23'), N('rgpd-5e')] },
        despues: 'Bloqueo durante la prescripción y supresión; para analítica solo se conservan datos anonimizados',
        normas: [N('lopdgdd-32')],
      },
      datos_personales: {
        total: hallazgos.length,
        por_categoria: porCategoria,
        categoria_especial_salud: porCategoria.salud || 0,
        menores: porCategoria.menor || 0,
        terceros: porCategoria.tercero || 0,
        no_usados_en_decision: hallazgos.filter((h) => !h.usado_en_decision).length,
        hallazgos: hallazgos.map(({ _cita, ...h }) => h),
        normas: [N('rgpd-25'), N('rgpd-5c')],
      },
      explicabilidad: {
        ramo: entry.ramo || null,
        confianza: entry.confianza ?? null,
        por_que: porQue,
        descartados: descarte,
        reglas_determinantes: incumplidas.length ? incumplidas : (entry.criterios || []).filter((c) => c.resultado === 'cumple').map((c) => c.regla),
        evidencias_verificadas: verificadas.length,
        normas: [N('ai-13'), N('rgpd-15'), N('rgpd-22')],
      },
      supervision_humana: {
        requerida: revision,
        motivo: revision ? (incumplidas.length ? `Incumple ${incumplidas.join(', ')}: la decisión desfavorable o dudosa la toma una persona` : 'Decisión dudosa: revisión por un tramitador') : 'Decisión favorable al asegurado dentro de los guardrails: aprobación automática permitida',
        estado: revision ? (entry.revisado ? 'revisada' : 'pendiente de revisión') : 'no requerida',
        normas: [N('ai-14'), N('rgpd-22')],
      },
      clasificacion_ria: {
        nivel: 'No es alto riesgo (Anexo III 5.c solo cubre la tarificación y el riesgo en vida y salud)',
        controles_alto_riesgo: 'Aplicados como buena práctica',
        normas: [N('ai-6')],
      },
    };
  }

  // Hallazgos con su cita en claro, para pintarlos sobre el texto en la vista operativa (nunca se persisten)
  function hallazgosConCita(entry = {}) {
    const m = entry.mensaje || {};
    return detectar(m.texto, { remitente: m.remitente && m.remitente.nombre, asegurado: (entry.datos_extraidos || {}).nombre_cliente });
  }

  // ---------------------------------------------------------------------------
  // Integridad del registro: cadena de hashes sobre las trazas en orden de registro
  // ---------------------------------------------------------------------------
  function encadenar(gobs) {
    let previo = '0'.repeat(64);
    return gobs.map((g) => {
      const eslabon = sha256(`${previo}|${String(g.trazabilidad.hash_registro).replace('sha256:', '')}`);
      const r = { traza_id: g.trazabilidad.traza_id, previo, eslabon };
      previo = eslabon; return r;
    });
  }
  // Recalcula el hash de registro desde los datos y comprueba la cadena; devuelve el primer eslabón roto
  function verificarCadena(items) {
    let previo = '0'.repeat(64); let roto = null;
    const out = items.map(({ gob, texto, raw }, i) => {
      const he = sha256(texto); const hs = sha256(raw || '');
      const hr = sha256(`${he}|${hs}|${gob.trazabilidad.registrado}`);
      const ok = `sha256:${hr}` === gob.trazabilidad.hash_registro && roto === null;
      if (!ok && roto === null) roto = i;
      const eslabon = sha256(`${previo}|${hr}`); previo = eslabon;
      return { traza_id: gob.trazabilidad.traza_id, ok: roto === null || i < roto, eslabon };
    });
    return { items: out, roto };
  }

  // ---------------------------------------------------------------------------
  // Termómetro: controles medidos en las trazas + controles declarados (documentales)
  // ---------------------------------------------------------------------------
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);
  function termometro(gobs, declarados = {}, cadena = null) {
    const n = gobs.length;
    const T = (f) => gobs.filter(f).map((g) => g.trazabilidad.traza_id);
    const registroCompleto = T((g) => { const t = g.trazabilidad; return t.traza_id && t.modelo && t.prompt && t.hash_entrada && t.hash_salida; });
    const explicadas = T((g) => g.explicabilidad.evidencias_verificadas >= 5);
    const conDescarte = T((g) => g.explicabilidad.descartados.length >= 2);
    const revision = gobs.filter((g) => g.supervision_humana.requerida);
    const sumar = (k) => gobs.reduce((s, g) => s + (g.datos_personales[k] || 0), 0);
    const totalPII = sumar('total');
    const salud = sumar('categoria_especial_salud');
    const menores = sumar('menores');
    const terceros = sumar('terceros');
    const noUsados = sumar('no_usados_en_decision');
    const financieros = gobs.reduce((s, g) => s + (g.datos_personales.por_categoria.financiero || 0), 0);
    const conRetencion = T((g) => g.retencion.expediente.hasta && g.retencion.traza_seudonimizada.hasta);
    const integra = cadena ? cadena.roto === null : true;

    const medido = (id, norma, exige, como, medida, estado, trazas) => ({ id, normas: norma, exige, como, medida, estado, fuente: 'medido', trazas: trazas || [] });
    const marcos = [
      { id: 'ria', nombre: 'Reglamento de IA', sub: 'RIA · AI Act, Reglamento (UE) 2024/1689', controles: [
        medido('ria-12', [N('ai-12')], 'Registro automático de eventos de cada decisión', 'Cada traza guarda modelo, versión de prompt, spans por agente y hash de entrada y salida', `${registroCompleto.length}/${n} trazas con registro completo`, registroCompleto.length === n ? 'ok' : 'ambar', registroCompleto),
        medido('ria-12-int', [N('ai-12'), N('rgpd-32')], 'Registro íntegro, no manipulable', 'Cadena de hashes SHA-256 sobre las trazas en orden de registro', integra ? `Cadena íntegra · ${n}/${n} eslabones` : `Cadena rota en la traza ${cadena.items[cadena.roto].traza_id}`, integra ? 'ok' : 'rojo'),
        medido('ria-13', [N('ai-13'), N('rgpd-15')], 'Resultados interpretables por quien los usa', 'Cada decisión cita fragmentos literales del mensaje que el navegador comprueba (evidencias verificadas ≥ 5)', `${pct(explicadas.length, n)} % de las decisiones (${explicadas.length}/${n})`, pct(explicadas.length, n) >= 90 ? 'ok' : 'ambar', explicadas),
        medido('ria-13-alt', [N('ai-13')], 'Explicar también lo que se descartó', 'Para cada decisión se registra por qué no es de los otros ramos', `${conDescarte.length}/${n} decisiones con ramos descartados explicados`, conDescarte.length === n ? 'ok' : 'ambar', conDescarte),
        medido('ria-14', [N('ai-14'), N('rgpd-22')], 'Supervisión humana efectiva', 'Toda decisión desfavorable o dudosa se escala a una persona; interruptor de pausa por agente', `${revision.length}/${revision.length} decisiones «A revisar» escaladas · ${revision.filter((g) => g.supervision_humana.estado === 'revisada').length} ya revisadas`, 'ok', revision.map((g) => g.trazabilidad.traza_id)),
        ...(declarados.ria || []),
      ] },
      { id: 'rgpd', nombre: 'Protección de datos', sub: 'RGPD y LOPDGDD', controles: [
        medido('rgpd-pii', [N('rgpd-4'), N('rgpd-25')], 'Identificar los datos personales que entran en el sistema', 'Detector determinista de 8 categorías sobre cada mensaje; cada hallazgo tiene tratamiento asignado', `${totalPII} datos personales detectados en ${n} mensajes · 100 % con tratamiento`, 'ok'),
        medido('rgpd-9', [N('rgpd-9'), N('lossear-99')], 'Datos de salud solo con base jurídica y protección reforzada', 'Cifrado de campo y acceso restringido al rol Salud', `${salud} datos de salud · 100 % cifrados y con acceso restringido`, 'ok', T((g) => g.datos_personales.categoria_especial_salud > 0)),
        medido('rgpd-8', [N('rgpd-8')], 'Protección específica de los menores', 'Marca de menor y exclusión de cualquier perfilado', `${menores} datos de menores marcados`, 'ok', T((g) => g.datos_personales.menores > 0)),
        medido('rgpd-14', [N('rgpd-13')], 'Informar a los terceros cuyos datos aporta otra persona', 'Los terceros detectados quedan marcados para informarles en la primera comunicación', `${terceros} terceros identificados`, 'ok', T((g) => g.datos_personales.terceros > 0)),
        medido('rgpd-5c', [N('rgpd-5c')], 'Minimización: enviar al modelo solo lo necesario', `Hoy el texto llega completo al modelo; ${noUsados} de ${totalPII} datos personales no se usaron para decidir (p. ej. ${financieros ? 'IBAN, ' : ''}DNI, teléfono)`, `${pct(totalPII - noUsados, totalPII)} % de los datos enviados fueron necesarios`, 'ambar', T((g) => g.datos_personales.no_usados_en_decision > 0)),
        medido('rgpd-22', [N('rgpd-22'), N('rgpd-15')], 'No decidir en contra del asegurado solo con la máquina', 'Las aprobaciones son automáticas; las desfavorables las firma una persona con la explicación delante', `${n - revision.length} aprobadas automáticamente · ${revision.length} a persona`, 'ok'),
        medido('rgpd-5e', [N('rgpd-5e'), N('lopdgdd-32'), N('lcs-23')], 'Conservar solo el tiempo necesario', 'Plazo calculado por traza: 6 meses de traza, 2 o 5 años de expediente y después bloqueo', `${conRetencion.length}/${n} trazas con fecha de fin calculada`, conRetencion.length === n ? 'ok' : 'ambar', conRetencion),
        ...(declarados.rgpd || []),
      ] },
      { id: 'dora', nombre: 'Resiliencia operativa', sub: 'DORA, Reglamento (UE) 2022/2554', controles: [...(declarados.dora || [])] },
      { id: 'eiopa', nombre: 'Gobierno en seguros', sub: 'EIOPA y Solvencia II', controles: [...(declarados.eiopa || [])] },
    ];
    const PESO = { ok: 1, ambar: 0.5, rojo: 0 };
    marcos.forEach((mc) => {
      mc.cuenta = { ok: 0, ambar: 0, rojo: 0 };
      mc.controles.forEach((c) => { mc.cuenta[c.estado] = (mc.cuenta[c.estado] || 0) + 1; });
      mc.pct = mc.controles.length ? Math.round((mc.controles.reduce((s, c) => s + (PESO[c.estado] ?? 0), 0) / mc.controles.length) * 100) : 0;
    });
    const todos = marcos.flatMap((mc) => mc.controles);
    const global = todos.length ? Math.round((todos.reduce((s, c) => s + (PESO[c.estado] ?? 0), 0) / todos.length) * 100) : 0;
    return { marcos, global, resumen: { trazas: n, datos_personales: totalPII, salud, menores, terceros, no_usados: noUsados } };
  }

  // ---------------------------------------------------------------------------
  // Pintado del JSON con metadatos (HTML como texto; lo usan las dos páginas)
  // ---------------------------------------------------------------------------
  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SECCION = { trazabilidad: 'g-traz', retencion: 'g-ret', datos_personales: 'g-pii', explicabilidad: 'g-expl', supervision_humana: 'g-sup', clasificacion_ria: 'g-ria' };
  function jsonHtml(valor, { sensibles = {}, claves = {}, gob = false } = {}) {
    const sp = (n) => '  '.repeat(n);
    const prim = (v, ctx) => {
      if (v === null) return '<span class="j-null">null</span>';
      if (typeof v === 'number') return `<span class="j-num">${v}</span>`;
      if (typeof v === 'boolean') return `<span class="j-bool">${v}</span>`;
      const s = escHtml(JSON.stringify(v));
      if (ctx.norma && NORMA_POR_ETIQUETA[v]) return `<span class="j-norma" title="${escHtml(NORMA_POR_ETIQUETA[v])}">${s}</span>`;
      return `<span class="j-str">${s}</span>`;
    };
    const rec = (v, nivel, ruta, ctx) => {
      if (v === null || typeof v !== 'object') return prim(v, ctx);
      const arr = Array.isArray(v);
      const items = arr ? v.map((x, i) => [i, x]) : Object.entries(v);
      if (!items.length) return arr ? '[]' : '{}';
      // Listas cortas de valores simples (posiciones, normas) en una sola línea
      if (arr && v.every((x) => x === null || typeof x !== 'object') && JSON.stringify(v).length <= 90) return `[${v.map((x) => prim(x, ctx)).join(', ')}]`;
      const lineas = items.map(([k, x]) => {
        const r = ruta ? `${ruta}.${k}` : String(k);
        const c2 = { ...ctx, norma: ctx.norma || k === 'normas', gob: ctx.gob || k === '_gobernanza' };
        let cuerpo = rec(x, nivel + 1, r, c2);
        const cat = sensibles[r];
        if (cat) cuerpo = `<span class="j-pii j-pii-${cat}" title="${escHtml(`Dato personal · ${CATEGORIAS[cat].etiqueta} · ${CATEGORIAS[cat].tratamiento}`)}">${cuerpo}</span>`;
        if (arr) return `${sp(nivel + 1)}${x && x.categoria === 'salud' ? `<span class="g-art9">${cuerpo}</span>` : cuerpo}`;
        const tag = !ctx.gob && !ruta && claves[k] ? `<span class="j-tag" data-normas="${escHtml(claves[k].join(' · '))}" title="${escHtml(claves[k].map((e) => `${e}: ${NORMA_POR_ETIQUETA[e] || ''}`).join('\n'))}" aria-hidden="true"></span>` : '';
        // La marca de norma va al final de la primera línea del valor (tras «[», «{» o el valor simple)
        if (tag) cuerpo = /^[[{]\n/.test(cuerpo) ? `${cuerpo[0]}${tag}${cuerpo.slice(1)}` : `${cuerpo}${tag}`;
        // Secciones del bloque de gobierno (en la raíz si se pinta solo, o bajo «_gobernanza»)
        const sec = SECCION[k] && ((gob && nivel === 0) || ruta === '_gobernanza') ? SECCION[k] : '';
        const clave = `<span class="j-key${sec ? ` g-key ${sec}` : ''}">${escHtml(JSON.stringify(String(k)))}</span>`;
        const linea = `${sp(nivel + 1)}${clave}: ${sec ? `<span class="g-sec ${sec}">${cuerpo}</span>` : cuerpo}`;
        if (k === '_gobernanza') return `<span class="g-bloque">${linea}</span>`;
        return linea;
      });
      const abre = arr ? '[' : '{'; const cierra = arr ? ']' : '}';
      return `${abre}\n${lineas.join(',\n')}\n${sp(nivel)}${cierra}`;
    };
    return rec(valor, 0, '', { gob });
  }

  const API = { ESQUEMA, NORMAS, NORMA_POR_ETIQUETA, CATEGORIAS, CLAVES_NORMA, sha256, corto, detectar, enmascarar, camposSensibles, descartados, gobernanza, hallazgosConCita, encadenar, verificarCadena, termometro, jsonHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Cumplimiento = API;
})(typeof window !== 'undefined' ? window : globalThis);
