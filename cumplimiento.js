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
  const ALTO_RIESGO = I18N.t('cumpl.exigible_a_sistemas_de');
  const NORMAS = {
    'ai-4': ['AI Act art. 4', I18N.t('cumpl.alfabetizacion_en_ia_el')],
    'ai-6': ['AI Act art. 6', I18N.t('cumpl.clasificacion_de_sistemas_de')],
    'ai-9': ['AI Act art. 9', I18N.t('cumpl.sistema_de_gestion_de', { ALTO_RIESGO })],
    'ai-10': ['AI Act art. 10', I18N.t('cumpl.gobernanza_de_los_datos', { ALTO_RIESGO })],
    'ai-12': ['AI Act art. 12', I18N.t('cumpl.registro_automatico_de_eventos', { ALTO_RIESGO })],
    'ai-13': ['AI Act art. 13', I18N.t('cumpl.transparencia_el_usuario_del', { ALTO_RIESGO })],
    'ai-14': ['AI Act art. 14', I18N.t('cumpl.supervision_humana_efectiva_incluida', { ALTO_RIESGO })],
    'ai-15': ['AI Act art. 15', I18N.t('cumpl.precision_solidez_y_ciberseguridad', { ALTO_RIESGO })],
    'ai-19': ['AI Act art. 19 y 26.6', I18N.t('cumpl.conservacion_de_los_registros', { ALTO_RIESGO })],
    'ai-50': ['AI Act art. 50', I18N.t('cumpl.transparencia_ante_las_personas')],
    'rgpd-4': ['RGPD art. 4.1', I18N.t('cumpl.dato_personal_cualquier_informacion')],
    'rgpd-4-5': ['RGPD art. 4.5', I18N.t('cumpl.seudonimizacion_el_dato_ya')],
    'rgpd-5': ['RGPD art. 5.2', I18N.t('cumpl.responsabilidad_proactiva_el_responsable')],
    'rgpd-5c': ['RGPD art. 5.1.c', I18N.t('cumpl.minimizacion_solo_los_datos')],
    'rgpd-5e': ['RGPD art. 5.1.e', I18N.t('cumpl.limitacion_del_plazo_de')],
    'rgpd-8': ['RGPD art. 8 y cons. 38', I18N.t('cumpl.los_menores_merecen_una')],
    'rgpd-9': ['RGPD art. 9', I18N.t('cumpl.categorias_especiales_los_datos')],
    'rgpd-13': ['RGPD art. 13 y 14', I18N.t('cumpl.informacion_al_interesado_tambien')],
    'rgpd-15': ['RGPD art. 15', I18N.t('cumpl.derecho_de_acceso_a')],
    'rgpd-17': ['RGPD art. 17', I18N.t('cumpl.derecho_de_supresion_alcanza')],
    'rgpd-22': ['RGPD art. 22', I18N.t('cumpl.derecho_a_no_ser')],
    'rgpd-25': ['RGPD art. 25', I18N.t('cumpl.proteccion_de_datos_desde')],
    'rgpd-28': ['RGPD art. 28', I18N.t('cumpl.encargado_del_tratamiento_contrato')],
    'rgpd-30': ['RGPD art. 30', I18N.t('cumpl.registro_de_actividades_de')],
    'rgpd-32': ['RGPD art. 32', I18N.t('cumpl.seguridad_del_tratamiento_cifrado')],
    'rgpd-35': ['RGPD art. 35', I18N.t('cumpl.evaluacion_de_impacto_eipd')],
    'lopdgdd-32': ['LOPDGDD art. 32', I18N.t('cumpl.bloqueo_al_terminar_la')],
    'lcs-23': ['LCS art. 23', I18N.t('cumpl.prescripcion_de_las_acciones')],
    'lossear-99': ['LOSSEAR art. 99', I18N.t('cumpl.ley_20_2015_tratamiento')],
    'lossear-99-7': ['LOSSEAR art. 99.7', I18N.t('cumpl.ficheros_comunes_del_sector')],
    'rgpd-c47': ['RGPD cons. 47', I18N.t('cumpl.el_tratamiento_estrictamente_necesario')],
    'dora-9': ['DORA art. 9', I18N.t('cumpl.proteccion_y_prevencion_gestion')],
    'dora-11': ['DORA art. 11', I18N.t('cumpl.respuesta_y_recuperacion_continuidad')],
    'dora-19': ['DORA art. 19', I18N.t('cumpl.notificacion_de_incidentes_graves')],
    'dora-28': ['DORA art. 28', I18N.t('cumpl.riesgo_de_terceros_tic')],
    'eiopa': ['EIOPA', I18N.t('cumpl.opinion_sobre_gobierno_y')],
    'sii-41': ['Solvencia II art. 41', I18N.t('cumpl.sistema_de_gobernanza_eficaz')],
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
    identificativo: { etiqueta: I18N.t('cumpl.identificativo'), tratamiento: I18N.t('cumpl.seudonimizado_en_la_traza'), normas: [N('rgpd-4'), N('rgpd-4-5')] },
    contacto: { etiqueta: I18N.t('cumpl.contacto'), tratamiento: I18N.t('cumpl.enmascarado_en_la_traza'), normas: [N('rgpd-4'), N('rgpd-32')] },
    indirecto: { etiqueta: I18N.t('cumpl.identificador_indirecto'), tratamiento: I18N.t('cumpl.seudonimizado_en_la_traza'), normas: [N('rgpd-4'), N('rgpd-4-5')] },
    localizacion: { etiqueta: I18N.t('cumpl.localizacion'), tratamiento: I18N.t('cumpl.generalizado_al_municipio_en'), normas: [N('rgpd-4'), N('rgpd-5c')] },
    financiero: { etiqueta: I18N.t('cumpl.financiero'), tratamiento: I18N.t('cumpl.enmascarado_excluido_del_contexto'), normas: [N('rgpd-32'), N('rgpd-5c')] },
    salud: { etiqueta: I18N.t('cumpl.salud_categoria_especial'), tratamiento: I18N.t('cumpl.cifrado_de_campo_acceso'), normas: [N('rgpd-9'), N('lossear-99')] },
    menor: { etiqueta: I18N.t('cumpl.menor_de_edad'), tratamiento: I18N.t('cumpl.proteccion_reforzada_sin_uso'), normas: [N('rgpd-8')] },
    tercero: { etiqueta: I18N.t('cumpl.tercero_no_remitente'), tratamiento: I18N.t('cumpl.seudonimizado_informar_al_interesado'), normas: [N('rgpd-13'), N('rgpd-4-5')] },
  };

  // [tipo, categoría, expresión, grupo con el dato (opcional), filtro (opcional)]. Los formatos (IBAN, DNI, teléfono,
  // póliza, matrícula…) valen para todos los idiomas; direcciones, terceros, menores y salud se escriben distinto en
  // cada uno y están en locales/<idioma>/motor.js (I18N.motor('cumplimiento')).
  const FORMATOS = [
    ['iban', 'financiero', /\bES\d{2}(?:\s?\d{4}){5}\b/g],
    ['email', 'contacto', /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g],
    ['dni', 'identificativo', /\b\d{8}-?[A-HJ-NP-TV-Z]\b/g],
    ['nie', 'identificativo', /\b[XYZ]-?\d{7}-?[A-Z]\b/g],
    ['tarjeta_sanitaria', 'indirecto', /\b\d{4}\s\d{4}\s\d{4}\b/g],
    ['telefono', 'contacto', /(?:\+34\s?)?\b[6789]\d{2}\s\d{3}\s\d{3}\b/g],
    ['poliza', 'indirecto', /\b(?:AU|HO|SA)-\d{6}\b/g],
    ['matricula', 'indirecto', /\b\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g],
    ['expediente', 'indirecto', /\b\d{4}-\d{6}-[A-Z]{2}\b|\b\d{5}\/\d{2}\b/g],
  ];
  const NOMBRE = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}';
  const detectores = {};
  function DETECTORES() {
    if (detectores[I18N.idioma]) return detectores[I18N.idioma];
    const P = I18N.motor('cumplimiento');
    return (detectores[I18N.idioma] = [
      ...FORMATOS,
      ...P.direccion.map((re) => ['direccion', 'localizacion', re]),
      ['nombre_tercero', 'tercero', P.nombreTercero(NOMBRE), 1],
      ...P.menor.map(([re, filtro]) => ['menor', 'menor', re, 0, filtro]),
    ]);
  }

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
    for (const [tipo, cat, re, grupo, filtro] of DETECTORES()) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) {
        if (filtro && !filtro(m)) continue;
        const dato = grupo ? m[grupo] : m[0];
        const ini = m.index + (grupo ? m[0].indexOf(dato) : 0);
        if (tipo === 'nombre_tercero' && remitente.includes(dato)) continue;
        add(tipo, cat, ini, ini + dato.length);
      }
    }
    for (const re of I18N.motor('cumplimiento').salud) { re.lastIndex = 0; for (const m of t.matchAll(re)) add('salud', 'salud', m.index, m.index + m[0].length); }
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
      case 'direccion': return /Madrid/.test(c) ? I18N.t('cumpl.madrid_municipio') : I18N.t('cumpl.municipio_generalizado');
      case 'menor': return '[menor de edad]';
      case 'salud': return '[dato de salud cifrado]';
      default: return '•••';
    }
  }

  // ---------------------------------------------------------------------------
  // Seudonimización antes de enviar al modelo (RGPD art. 4.5 y 5.1.c)
  // Cada dato personal se cambia por un marcador estable; la tabla de correspondencias
  // solo vive en memoria durante la llamada y se usa para reconstruir la respuesta.
  // Se mantienen los datos de salud y la edad de los menores: hacen falta para decidir.
  // ---------------------------------------------------------------------------
  const MARCADOR = {
    nombre: 'PERSONA', nombre_tercero: 'PERSONA', dni: 'DNI', nie: 'NIE', email: 'EMAIL', telefono: 'TELEFONO', iban: 'IBAN',
    tarjeta_sanitaria: 'TARJETA_SANITARIA', poliza: 'POLIZA', matricula: 'MATRICULA', expediente: 'EXPEDIENTE', direccion: 'DIRECCION',
  };
  const SE_MANTIENEN = I18N.t('cumpl.datos_de_salud_y');

  function seudonimizarMensaje(msg = {}) {
    const mapa = []; const porValor = new Map(); const cuenta = {};
    const marcador = (tipo, categoria, valor) => {
      const clave = `${MARCADOR[tipo]}|${valor.toLowerCase()}`;
      if (porValor.has(clave)) return porValor.get(clave);
      // La póliza conserva su prefijo de ramo (AU, HO, SA): es un indicio de clasificación, no un dato personal
      const base = tipo === 'poliza' ? `POLIZA_${valor.slice(0, 2)}` : MARCADOR[tipo];
      cuenta[base] = (cuenta[base] || 0) + 1;
      const token = `[${base}_${cuenta[base]}]`;
      porValor.set(clave, token); mapa.push({ token, valor, tipo, categoria });
      return token;
    };
    const remitente = (msg.remitente && msg.remitente.nombre) || '';
    const sustituir = (texto) => {
      const t = String(texto ?? '');
      let out = ''; let i = 0;
      for (const h of detectar(t, { remitente }).filter((x) => MARCADOR[x.tipo])) {
        if (h.inicio < i) continue;
        out += t.slice(i, h.inicio) + marcador(h.tipo, h.categoria, h.cita); i = h.fin;
      }
      return out + t.slice(i);
    };
    const nombre = limpiarNombre(remitente);
    const nombreSeud = nombre.split(' ').length >= 2 ? remitente.replace(nombre, marcador('nombre', 'identificativo', nombre)) : remitente;
    const texto = sustituir(msg.texto);
    // Un nombre detectado una vez («mi hijo Pablo») se sustituye también donde vuelve a aparecer suelto
    const repetidos = (str) => mapa.filter((m) => m.tipo === 'nombre' || m.tipo === 'nombre_tercero')
      .reduce((acc, m) => acc.replace(new RegExp(`(?<![\\wÁÉÍÓÚáéíóúñÑ])${m.valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\wÁÉÍÓÚáéíóúñÑ])`, 'g'), m.token), str);
    const mensaje = {
      ...msg,
      asunto: repetidos(sustituir(msg.asunto)),
      texto: repetidos(texto),
      remitente: { ...(msg.remitente || {}), nombre: nombreSeud, contacto: sustituir(msg.remitente && msg.remitente.contacto) },
    };
    return { mensaje, mapa };
  }

  // Vuelve a poner los valores reales en la respuesta del modelo (cadenas a cualquier profundidad)
  function rehidratar(valor, mapa = []) {
    if (typeof valor === 'string') return mapa.reduce((acc, m) => acc.split(m.token).join(m.valor), valor);
    if (Array.isArray(valor)) return valor.map((v) => rehidratar(v, mapa));
    if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, rehidratar(v, mapa)]));
    return valor;
  }

  // Lo contrario, sobre un texto: para mostrar cómo habría llegado una respuesta guardada
  function seudonimizarTexto(texto, mapa = []) {
    return [...mapa].sort((a, b) => b.valor.length - a.valor.length).reduce((acc, m) => acc.split(m.valor).join(m.token), String(texto ?? ''));
  }

  // Resumen que se guarda en la entrada: sin la tabla de correspondencias, solo los marcadores y el texto enviado
  function resumenSeudonimizacion(enviado, mapa, extra = {}) {
    const porTipo = {};
    mapa.forEach((m) => { porTipo[m.tipo] = (porTipo[m.tipo] || 0) + 1; });
    return { activa: true, sustituidos: mapa.length, por_tipo: porTipo, marcadores: mapa.map((m) => ({ token: m.token, tipo: m.tipo, categoria: m.categoria })), enviado, ...extra };
  }

  // Campos de la salida del modelo que contienen datos personales (para marcarlos en la Respuesta cruda)
  function camposSensibles(entry = {}) {
    const d = entry.datos_extraidos || {};
    const out = {};
    if (d.nombre_cliente) out['datos_extraidos.nombre_cliente'] = 'identificativo';
    if (d.numero_poliza) out['datos_extraidos.numero_poliza'] = 'indirecto';
    if (d.lugar) out['datos_extraidos.lugar'] = 'localizacion';
    (entry.adjuntos || []).forEach((a, i) => {
      const da = a.datos || {};
      if (da.lugar) out[`adjuntos.${i}.datos.lugar`] = 'localizacion';
      [['vehiculo_a', false], ['vehiculo_b', true]].forEach(([k, tercero]) => PII_VEHICULO.forEach(([campo, tipo]) => {
        if (da[k] && da[k][campo]) out[`adjuntos.${i}.datos.${k}.${campo}`] = tercero ? 'tercero' : tipo === 'nombre' || tipo === 'dni' ? 'identificativo' : 'indirecto';
      }));
    });
    if (entry.ramo === 'Salud' || d.lesionados) { out['datos_extraidos.tipo_siniestro'] = 'salud'; out['datos_extraidos.lesionados'] = 'salud'; out['datos_extraidos.observaciones'] = 'salud'; }
    return out;
  }

  // Claves de la salida del modelo que sirven para trazabilidad y explicabilidad, con la norma a la que ayudan
  const CLAVES_NORMA = {
    ramo: [N('ai-13')], criterios_ramo: [N('ai-13'), N('rgpd-15')], datos_extraidos: [N('rgpd-5c')],
    criterios: [N('ai-12'), N('rgpd-22')], evidencias: [N('ai-13'), N('rgpd-15')], decision: [N('rgpd-22'), N('ai-14')],
    motivo: [N('rgpd-15'), N('ai-13')], confianza: [N('ai-15')], adjuntos: [N('ai-13'), N('rgpd-5c')],
  };

  // ---------------------------------------------------------------------------
  // Explicabilidad: por qué este ramo y por qué no los otros
  // ---------------------------------------------------------------------------
  const RAMOS = ['Auto', 'Hogar', 'Salud'];
  // Palabras que apuntan a cada ramo: I18N.motor('cumplimiento').indicios
  function indicios(texto, ramo) {
    const re = I18N.motor('cumplimiento').indicios[ramo];
    re.lastIndex = 0;
    return [...new Set([...String(texto).matchAll(re)].map((m) => m[0].toLowerCase()))];
  }
  function descartados(texto, entry) {
    return RAMOS.filter((r) => r !== entry.ramo).map((r) => {
      const ind = indicios(texto, r);
      // Si el propio criterio del modelo menciona el ramo alternativo, esa es la explicación más fiel
      const cr = (entry.criterios_ramo || []).find((c) => new RegExp(`\\b${r}\\b`).test(c));
      const motivo = cr || (ind.length
        ? I18N.t('cumpl.hay_indicios_de_pero', { v: r, ind: ind.slice(0, 3).join(', '), ramo: entry.ramo })
        : I18N.t('cumpl.sin_indicios_de_en', { v: r }));
      return { ramo: r, indicios: ind.slice(0, 4), motivo };
    });
  }

  // ---------------------------------------------------------------------------
  // Conocimiento usado por cada decisión: catálogo común con la sección «Knowledge bases» del panel
  // (data/gobierno.js · knowledge[] usa los mismos ids y versiones; lo comprueba tests/cumplimiento.test.js).
  // Solo KB-01 (los bloques de reglas de prompts.js) es real en la demo; el resto está simulado.
  // ---------------------------------------------------------------------------
  const CONOCIMIENTO = {
    'KB-01': { nombre: I18N.t('cumpl.reglas_de_negocio_auto'), version: 'v2.3', simulada: false },
    'KB-02': { nombre: I18N.t('cumpl.condicionados_auto_2026'), version: '2026.09.2', simulada: true },
    'KB-03': { nombre: I18N.t('cumpl.condicionados_hogar_2026'), version: '2026.08.1', simulada: true },
    'KB-04': { nombre: I18N.t('cumpl.manual_de_tramitacion_de'), version: '4.2', simulada: true },
    'KB-05': { nombre: I18N.t('cumpl.cuadro_medico_concertado'), version: '2026-09-16', simulada: true },
    'KB-06': { nombre: I18N.t('cumpl.red_de_talleres_y'), version: '2026-09-08', simulada: true },
    'KB-07': { nombre: I18N.t('cumpl.runbook_de_danos_corporales'), version: 'v1.4', simulada: true },
    'KB-08': { nombre: I18N.t('cumpl.corpus_normativo_lcs_lossear'), version: '2026.07', simulada: true },
    'KB-09': { nombre: I18N.t('cumpl.plantillas_de_comunicacion_al'), version: 'v3.0', simulada: true },
  };
  function conocimientoDe(entry = {}, prompt = '') {
    const ia = !/local/.test(String(prompt)) && prompt;
    const v = (String(prompt).match(/v\d+(?:\.\d+)*/) || [])[0];
    const ids = ['KB-01'];
    if (ia) {
      ids.push('KB-04', 'KB-08');
      if (entry.ramo === 'Auto') ids.push('KB-02', 'KB-06');
      if (entry.ramo === 'Hogar') ids.push('KB-03');
      if (entry.ramo === 'Salud') ids.push('KB-05');
      if ((entry.datos_extraidos || {}).lesionados && entry.ramo === 'Auto') ids.push('KB-07');
      if (entry.decision === 'REVISION') ids.push('KB-09');
    }
    return ids.map((id) => ({ kb: id, nombre: CONOCIMIENTO[id].nombre, version: id === 'KB-01' ? (ia ? v || CONOCIMIENTO[id].version : 'reglas locales') : CONOCIMIENTO[id].version, ...(CONOCIMIENTO[id].simulada ? { simulada: true } : {}) }));
  }

  // ---------------------------------------------------------------------------
  // Bloque _gobernanza de una decisión
  // ---------------------------------------------------------------------------
  const sumarAnios = (iso, n) => { const d = new Date(iso); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
  const sumarMeses = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

  // Qué recibió el modelo: seudonimizado o en claro (sin modelo, no aplica)
  function envioAlModelo(entry = {}) {
    const sd = entry.seudonimizacion;
    if (!/^IA/.test(entry.origen || '')) return { aplica: false, motivo: I18N.t('cumpl.decision_del_motor_local') };
    if (!sd || !sd.activa) return { aplica: true, seudonimizado: false, motivo: I18N.t('cumpl.el_texto_llego_completo') };
    const e = sd.enviado || {};
    return {
      aplica: true,
      seudonimizado: true,
      ...(sd.simulada ? { modo: I18N.t('cumpl.simulado_sobre_la_respuesta') } : {}),
      sustituidos: sd.sustituidos,
      por_tipo: sd.por_tipo,
      marcadores: (sd.marcadores || []).map((m) => m.token),
      se_mantienen: SE_MANTIENEN,
      correspondencias: I18N.t('cumpl.solo_en_memoria_durante'),
      hash_enviado: `sha256:${sha256(String(e.texto || ''))}`,
      normas: [N('rgpd-4-5'), N('rgpd-5c'), N('rgpd-25')],
    };
  }

  // Adjuntos: huella de cada archivo tal y como se recibió, datos personales que el modelo leyó en ellos y cómo llegaron
  // al modelo. La seudonimización por marcadores solo se aplica al texto, así que los adjuntos van con los datos en claro.
  const PII_VEHICULO = [['conductor', 'nombre'], ['dni', 'dni'], ['matricula', 'matricula'], ['poliza', 'poliza']];
  function adjuntosGob(entry = {}) {
    const lista = (entry.mensaje || {}).adjuntos || [];
    if (!lista.length) return null;
    const recibidos = entry.adjuntos_recibidos || [];
    const hallazgos = [];
    (entry.adjuntos || []).forEach((a) => {
      const d = a.datos || {};
      [['vehiculo_a', false], ['vehiculo_b', true]].forEach(([k, tercero]) => {
        PII_VEHICULO.forEach(([campo, tipoBase]) => {
          const v = d[k] && d[k][campo];
          if (!v) return;
          const tipo = tercero && tipoBase === 'nombre' ? 'nombre_tercero' : tipoBase;
          const categoria = tercero ? 'tercero' : tipoBase === 'nombre' || tipoBase === 'dni' ? 'identificativo' : 'indirecto';
          hallazgos.push({ adjunto: a.id, campo: `${k}.${campo}`, categoria, tipo, valor_en_traza: enmascarar({ cita: String(v), tipo }) });
        });
      });
      if (d.firmado_ambos) hallazgos.push({ adjunto: a.id, campo: 'firmas', categoria: 'identificativo', tipo: 'firma', valor_en_traza: '[firma manuscrita: no se extrae]' });
    });
    const ia = /^IA/.test(entry.origen || '');
    return {
      recibidos: lista.length,
      archivos: lista.map((a) => {
        const h = recibidos.find((x) => x.id === a.id) || {};
        return { id: a.id, archivo: a.archivo, mime: a.mime, bytes: h.bytes ?? null, hash: h.sha256 ? `sha256:${h.sha256}` : I18N.t('cumpl.pendiente_se_calcula_al') };
      }),
      datos_extraidos: !entry.adjuntos ? I18N.t('cumpl.ninguno_el_motor_local') : entry.adjuntos_origen === 'guardado' ? I18N.t('cumpl.tomados_de_los_resultados') : I18N.t('cumpl.por_el_modelo_en'),
      datos_personales: { total: hallazgos.length, terceros: hallazgos.filter((h) => h.categoria === 'tercero').length, hallazgos },
      envio_al_modelo: !ia ? I18N.t('cumpl.no_aplica_motor_local') : entry.adjuntos_origen === 'guardado' ? I18N.t('cumpl.no_se_envian_al')
        : I18N.t('cumpl.sin_seudonimizar_la_sustitucion'),
      normas: [N('ai-12'), N('rgpd-4-5'), N('rgpd-13')],
    };
  }

  const DEC_TXT = { REVISION: I18N.t('cumpl.a_revisar'), DESPEJADO: I18N.t('cumpl.aprobado') };
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
    const rev = entry.revision && entry.revision.a ? entry.revision : null;   // acción humana desde la ficha (validar u override)
    const personas = entry.ramo === 'Salud';
    const hashEntrada = sha256(texto);
    const hashSalida = sha256(entry.raw || '');
    const hashRegistro = sha256(`${hashEntrada}|${hashSalida}|${ts}`);

    // La explicación también se guarda seudonimizada: cada dato personal (salvo salud, cifrado aparte) por su valor en la traza
    const sustituir = hallazgos.filter((h) => h.categoria !== 'salud').sort((x, y) => y._cita.length - x._cita.length);
    const masc = (str) => sustituir.reduce((acc, h) => acc.split(h._cita).join(h.valor_en_traza), String(str ?? ''));
    const conSalud = (str) => hallazgos.some((h) => h.categoria === 'salud' && String(str).includes(h._cita));
    const porQue = verificadas.filter((e) => e.ref === 'ramo' || e.ref === 'tipo_siniestro' || e.ref === 'numero_poliza').slice(0, 4)
      .map((e) => ({ evidencia: e.n, cita: masc(e.cita), nota: masc(e.nota || ''), ...(conSalud(e.cita) ? { cifrado: I18N.t('cumpl.contiene_datos_de_salud') } : {}) }));
    const descarte = descartados(texto, entry).map((d) => ({ ...d, indicios: d.indicios.map(masc), motivo: masc(d.motivo) }));

    return {
      esquema: ESQUEMA,
      generado_por: I18N.t('cumpl.plataforma_de_gobierno_determinista'),
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
        conocimiento: conocimientoDe(entry, opts.prompt),
        normas: [N('ai-12'), N('ai-10'), N('rgpd-5')],
      },
      retencion: {
        traza_seudonimizada: { plazo: I18N.t('cumpl.6_meses_como_minimo'), hasta: sumarMeses(ts, 6), normas: [N('ai-19')] },
        expediente: { plazo: personas ? I18N.t('cumpl.5_anos_seguro_de') : I18N.t('cumpl.2_anos_seguro_de'), hasta: sumarAnios(ts, personas ? 5 : 2), normas: [N('lcs-23'), N('rgpd-5e')] },
        despues: I18N.t('cumpl.bloqueo_durante_la_prescripcion'),
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
        envio_al_modelo: envioAlModelo(entry),
        normas: [N('rgpd-25'), N('rgpd-5c')],
      },
      ...(adjuntosGob(entry) ? { adjuntos: adjuntosGob(entry) } : {}),
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
        motivo: revision ? (incumplidas.length ? I18N.t('cumpl.incumple_la_decision_desfavorable', { incumplidas: incumplidas.join(', ') }) : I18N.t('cumpl.decision_dudosa_revision_por')) : I18N.t('cumpl.decision_favorable_al_asegurado'),
        // Override = una persona cambia una decisión que el agente tomó solo (Aprobado → A revisar): cuenta para su autonomía.
        // Validar = una persona resuelve un caso que el agente ya escaló: no es override.
        estado: rev && rev.accion === 'override' ? I18N.t('cumpl.override_una_persona_paso')
          : revision ? (rev ? `revisada: ${rev.resultado === 'aprobada' ? 'aprobada' : I18N.t('cumpl.se_mantiene_en_revision')}` : entry.revisado ? 'revisada' : I18N.t('cumpl.pendiente_de_revision')) : I18N.t('cumpl.no_requerida'),
        ...(rev ? { accion_humana: { tipo: rev.accion === 'override' ? 'override' : 'revision', de: DEC_TXT[rev.de] || rev.de, a: DEC_TXT[rev.a] || rev.a, cuenta_para_autonomia: rev.accion === 'override', revisor: rev.usuario, fecha: rev.fecha, comentario: rev.comentario || null } } : {}),
        normas: [N('ai-14'), N('rgpd-22')],
      },
      ...(opts.antifraude ? { antifraude: { ...opts.antifraude, nota: I18N.t('cumpl.indicador_interno_de_priorizacion'), normas: [N('rgpd-22'), N('rgpd-c47')] } } : {}),
      clasificacion_ria: {
        nivel: I18N.t('cumpl.no_es_alto_riesgo'),
        controles_alto_riesgo: I18N.t('cumpl.aplicados_como_buena_practica'),
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
    const envio = (g) => g.datos_personales.envio_al_modelo || {};
    const alModelo = T((g) => envio(g).aplica !== false && g.datos_personales.total > 0);
    const seudonimizadas = T((g) => envio(g).aplica !== false && g.datos_personales.total > 0 && envio(g).seudonimizado);
    const sustituidos = gobs.reduce((s2, g) => s2 + (envio(g).sustituidos || 0), 0);

    const medido = (id, norma, exige, como, medida, estado, trazas) => ({ id, normas: norma, exige, como, medida, estado, fuente: 'medido', trazas: trazas || [] });
    const marcos = [
      { id: 'ria', nombre: I18N.t('cumpl.reglamento_de_ia'), sub: I18N.t('cumpl.ria_ai_act_reglamento'), controles: [
        medido('ria-12', [N('ai-12')], I18N.t('cumpl.registro_automatico_de_eventos_2'), I18N.t('cumpl.cada_traza_guarda_modelo'), I18N.t('cumpl.trazas_con_registro_completo', { registroCompleto: registroCompleto.length, v: n }), registroCompleto.length === n ? 'ok' : 'ambar', registroCompleto),
        medido('ria-12-int', [N('ai-12'), N('rgpd-32')], I18N.t('cumpl.registro_integro_no_manipulable'), I18N.t('cumpl.cadena_de_hashes_sha'), integra ? I18N.t('cumpl.cadena_integra_eslabones', { v: n }) : I18N.t('cumpl.cadena_rota_en_la', { traza_id: cadena.items[cadena.roto].traza_id }), integra ? 'ok' : 'rojo'),
        medido('ria-13', [N('ai-13'), N('rgpd-15')], I18N.t('cumpl.resultados_interpretables_por_quien'), I18N.t('cumpl.cada_decision_cita_fragmentos'), I18N.t('cumpl.de_las_decisiones', { explicadas: pct(explicadas.length, n), explicadas2: explicadas.length, v: n }), pct(explicadas.length, n) >= 90 ? 'ok' : 'ambar', explicadas),
        medido('ria-13-alt', [N('ai-13')], I18N.t('cumpl.explicar_tambien_lo_que'), I18N.t('cumpl.para_cada_decision_se'), I18N.t('cumpl.decisiones_con_ramos_descartados', { conDescarte: conDescarte.length, v: n }), conDescarte.length === n ? 'ok' : 'ambar', conDescarte),
        medido('ria-14', [N('ai-14'), N('rgpd-22')], I18N.t('cumpl.supervision_humana_efectiva'), I18N.t('cumpl.toda_decision_desfavorable_o'), I18N.t('cumpl.decisiones_a_revisar_escaladas', { revision: revision.length, revisada: revision.filter((g) => g.supervision_humana.estado === 'revisada').length }), 'ok', revision.map((g) => g.trazabilidad.traza_id)),
        ...(declarados.ria || []),
      ] },
      { id: 'rgpd', nombre: I18N.t('cumpl.proteccion_de_datos'), sub: 'RGPD y LOPDGDD', controles: [
        medido('rgpd-pii', [N('rgpd-4'), N('rgpd-25')], I18N.t('cumpl.identificar_los_datos_personales'), I18N.t('cumpl.detector_determinista_de_8'), I18N.t('cumpl.datos_personales_detectados_en', { totalPII, v: n }), 'ok'),
        medido('rgpd-9', [N('rgpd-9'), N('lossear-99')], I18N.t('cumpl.datos_de_salud_solo'), I18N.t('cumpl.cifrado_de_campo_y'), I18N.t('cumpl.datos_de_salud_100', { salud }), 'ok', T((g) => g.datos_personales.categoria_especial_salud > 0)),
        medido('rgpd-8', [N('rgpd-8')], I18N.t('cumpl.proteccion_especifica_de_los'), I18N.t('cumpl.marca_de_menor_y'), I18N.t('cumpl.datos_de_menores_marcados', { menores }), 'ok', T((g) => g.datos_personales.menores > 0)),
        medido('rgpd-14', [N('rgpd-13')], I18N.t('cumpl.informar_a_los_terceros'), I18N.t('cumpl.los_terceros_detectados_quedan'), `${terceros} terceros identificados`, 'ok', T((g) => g.datos_personales.terceros > 0)),
        seudonimizadas.length && seudonimizadas.length === alModelo.length
          ? medido('rgpd-5c', [N('rgpd-5c'), N('rgpd-4-5')], I18N.t('cumpl.minimizacion_enviar_al_modelo'), I18N.t('cumpl.seudonimizacion_antes_de_enviar'), I18N.t('cumpl.trazas_con_datos_personales', { seudonimizadas: seudonimizadas.length, alModelo: alModelo.length, sustituidos }), 'ok', seudonimizadas)
          : medido('rgpd-5c', [N('rgpd-5c')], I18N.t('cumpl.minimizacion_enviar_al_modelo'), seudonimizadas.length ? I18N.t('cumpl.de_trazas_llegaron_al', { seudonimizadas: alModelo.length - seudonimizadas.length, alModelo: alModelo.length, noUsados, totalPII }) : I18N.t('cumpl.hoy_el_texto_llega', { noUsados, totalPII, IBAN: financieros ? 'IBAN, ' : '' }), seudonimizadas.length ? `${seudonimizadas.length}/${alModelo.length} trazas seudonimizadas` : I18N.t('cumpl.de_los_datos_enviados', { totalPII: pct(totalPII - noUsados, totalPII) }), 'ambar', T((g) => g.datos_personales.no_usados_en_decision > 0)),
        medido('rgpd-22', [N('rgpd-22'), N('rgpd-15')], I18N.t('cumpl.no_decidir_en_contra'), I18N.t('cumpl.las_aprobaciones_son_automaticas'), I18N.t('cumpl.aprobadas_automaticamente_a_persona', { revision: n - revision.length, revision2: revision.length }), 'ok'),
        medido('rgpd-5e', [N('rgpd-5e'), N('lopdgdd-32'), N('lcs-23')], I18N.t('cumpl.conservar_solo_el_tiempo'), I18N.t('cumpl.plazo_calculado_por_traza'), I18N.t('cumpl.trazas_con_fecha_de', { conRetencion: conRetencion.length, v: n }), conRetencion.length === n ? 'ok' : 'ambar', conRetencion),
        ...(declarados.rgpd || []),
      ] },
      { id: 'dora', nombre: I18N.t('cumpl.resiliencia_operativa'), sub: 'DORA, Reglamento (UE) 2022/2554', controles: [...(declarados.dora || [])] },
      { id: 'eiopa', nombre: I18N.t('cumpl.gobierno_en_seguros'), sub: 'EIOPA y Solvencia II', controles: [...(declarados.eiopa || [])] },
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
  const SECCION = { trazabilidad: 'g-traz', retencion: 'g-ret', datos_personales: 'g-pii', adjuntos: 'g-pii', explicabilidad: 'g-expl', supervision_humana: 'g-sup', clasificacion_ria: 'g-ria' };
  // Con «plegable», cada objeto o lista lleva un botón para plegarlo (en la sangría, sin texto) y cada línea va en un
  // .j-l: lo que se copia o se selecciona sigue siendo el mismo JSON.
  function jsonHtml(valor, { sensibles = {}, claves = {}, gob = false, plegable = false } = {}) {
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
        const nodo = plegable && /^[[{]<span class="j-in">/.test(cuerpo);
        const sangria = nodo ? `${sp(nivel + 1).slice(2)}<button type="button" class="j-tog" aria-expanded="true" data-clave="${escHtml(String(k))}" aria-label="${I18N.t('cumpl.plegar', { clave: escHtml(String(k)) })}"></button>` : sp(nivel + 1);
        const envolver = (l) => (plegable ? `<span class="j-l${nodo ? ' j-nodo' : ''}">${l}</span>` : l);
        const cat = sensibles[r];
        if (cat) cuerpo = `<span class="j-pii j-pii-${cat}" title="${escHtml(`Dato personal · ${CATEGORIAS[cat].etiqueta} · ${CATEGORIAS[cat].tratamiento}`)}">${cuerpo}</span>`;
        if (arr) return envolver(`${sangria}${x && x.categoria === 'salud' ? `<span class="g-art9">${cuerpo}</span>` : cuerpo}`);
        const tag = !ctx.gob && !ruta && claves[k] ? `<span class="j-tag" data-normas="${escHtml(claves[k].join(' · '))}" title="${escHtml(claves[k].map((e) => `${e}: ${NORMA_POR_ETIQUETA[e] || ''}`).join('\n'))}" aria-hidden="true"></span>` : '';
        // La marca de norma va al final de la primera línea del valor (tras «[», «{» o el valor simple)
        if (tag) cuerpo = /^[[{](<span class="j-in">)?\n/.test(cuerpo) ? `${cuerpo[0]}${tag}${cuerpo.slice(1)}` : `${cuerpo}${tag}`;
        // Secciones del bloque de gobierno (en la raíz si se pinta solo, o bajo «_gobernanza»)
        const sec = SECCION[k] && ((gob && nivel === 0) || ruta === '_gobernanza') ? SECCION[k] : '';
        const clave = `<span class="j-key${sec ? ` g-key ${sec}` : ''}">${escHtml(JSON.stringify(String(k)))}</span>`;
        const linea = envolver(`${sangria}${clave}: ${sec ? `<span class="g-sec ${sec}">${cuerpo}</span>` : cuerpo}`);
        if (k === '_gobernanza') return `<span class="g-bloque">${linea}</span>`;
        return linea;
      });
      const abre = arr ? '[' : '{'; const cierra = arr ? ']' : '}';
      if (plegable) return `${abre}<span class="j-in">\n${lineas.join(',\n')}\n${sp(nivel)}</span><span class="j-elip" data-n="${items.length} ${arr ? (items.length === 1 ? 'elemento' : 'elementos') : (items.length === 1 ? 'clave' : 'claves')}"></span>${cierra}`;
      return `${abre}\n${lineas.join(',\n')}\n${sp(nivel)}${cierra}`;
    };
    return rec(valor, 0, '', { gob });
  }

  // Tasa de override de un agente: decisiones que tomó solo («Aprobado») y que una persona cambió después, entre todas las
  // que tomó solo. Resolver un caso que el agente ya escaló (validar) no es override y no cuenta. Por encima del umbral
  // se propone bajarle un nivel; la propuesta queda pendiente de que la apruebe una persona.
  function tasaOverride(trazas = [], nivel = null, umbral = 3) {
    const solas = trazas.filter((t) => t.decision === 'DESPEJADO').length;
    const overrides = trazas.filter((t) => t.decision === 'DESPEJADO' && t.override).length;
    const tasa = solas ? (overrides / solas) * 100 : 0;
    const proponerBajada = tasa > umbral && nivel != null && nivel > 0;
    return { solas, overrides, tasa, proponerBajada, nivelPropuesto: proponerBajada ? nivel - 1 : null };
  }

  const API = { tasaOverride, seudonimizarMensaje, rehidratar, seudonimizarTexto, resumenSeudonimizacion, ESQUEMA, NORMAS, CONOCIMIENTO, conocimientoDe, NORMA_POR_ETIQUETA, CATEGORIAS, CLAVES_NORMA, sha256, corto, detectar, enmascarar, camposSensibles, descartados, gobernanza, hallazgosConCita, encadenar, verificarCadena, termometro, jsonHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Cumplimiento = API;
})(typeof window !== 'undefined' ? window : globalThis);
