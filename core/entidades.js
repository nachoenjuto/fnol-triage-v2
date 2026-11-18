// Entidades del mensaje (NER): personas con su papel y sus documentos, vehículos, lugares, organizaciones,
// identificadores, importes y todas las fechas con lo que son (fecha del accidente, del robo, de la denuncia…).
//   detectar(msg)            extracción determinista sin IA (motor local), con I18N.motor('entidades');
//   validar(obj, msg)        normaliza la respuesta del modelo: catálogos cerrados, fechas ISO, letra del DNI, citas literales;
//   expandir(c)              resultados guardados en formato compacto → entidades;
//   claves(e) · comparar()   exactitud de la extracción frente a las entidades esperadas del mensaje (esperado.ner).
// Los formatos (DNI, NIE, matrícula, teléfono, IBAN, póliza…) son comunes a todos los idiomas; las palabras que dan el
// papel de cada entidad están en locales/<idioma>/motor.js. Funciona en el navegador (global `Entidades`) y en Node.
(function (root) {
  'use strict';
  const I18N = root.I18N || require('./i18n/node.js')();
  const P = () => I18N.motor('entidades');
  const PF = () => I18N.motor('fechas');

  // Valores internos (no se traducen; las etiquetas están en locales/<idioma>/ui-triaje.js, entidad.<grupo>.<valor>)
  const CATALOGO = {
    fechas: ['accidente', 'robo', 'hecho', 'descubrimiento_dano', 'ultima_estancia', 'denuncia', 'contratacion_poliza', 'renovacion_poliza',
      'permiso_conducir', 'atencion_medica', 'cirugia', 'ingreso', 'alta_medica', 'cita_medica', 'baja_laboral', 'presupuesto', 'factura',
      'reparacion', 'peritacion', 'siniestro_anterior', 'otra'],
    precision: ['exacta', 'relativa', 'aproximada'],
    personas: ['tomador', 'asegurado', 'comunicante', 'conductor', 'conductor_contrario', 'familiar', 'lesionado', 'testigo', 'vecino', 'medico', 'perito', 'otro'],
    vehiculos: ['asegurado', 'contrario', 'otro'],
    lugares: ['domicilio', 'lugar_hecho', 'centro_medico', 'taller', 'comisaria', 'empresa', 'otro'],
    organizaciones: ['centro_medico', 'taller', 'reparador', 'aseguradora', 'policia', 'suministradora', 'administrador', 'comercio', 'empresa', 'otra'],
    identificadores: ['poliza', 'denuncia', 'atestado', 'iban', 'tarjeta_sanitaria', 'incidencia', 'expediente', 'factura', 'otro'],
    importes: ['presupuesto', 'factura', 'reembolso', 'valor_bienes', 'franquicia', 'otro'],
  };
  const GRUPOS = ['fechas', 'personas', 'vehiculos', 'lugares', 'organizaciones', 'identificadores', 'importes'];
  // Equivalencia con las etiquetas del estándar NER (PER, LOC, ORG, DATE, MONEY) y entidades de dominio (MISC)
  const NER = { fechas: 'DATE', personas: 'PER', vehiculos: 'MISC', lugares: 'LOC', organizaciones: 'ORG', identificadores: 'MISC', importes: 'MONEY' };

  const FORMATOS = {
    dni: /\b\d{8}-?[A-HJ-NP-TV-Z]\b/g,
    nie: /\b[XYZ]-?\d{7}-?[A-Z]\b/g,
    telefono: /(?:\+34\s?)?\b[6789]\d{2}\s\d{3}\s\d{3}\b/g,
    email: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g,
    matricula: /\b\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g,
  };
  const IDS = [
    ['iban', /\bES\d{2}(?:\s?\d{4}){5}\b/g],
    ['poliza', /\b(?:AU|HO|SA|ME)-\d{6,8}\b/g],
    ['atestado', /\b\d{4}-\d{6}-[A-Z]{2}\b/g],
    ['denuncia', /\b\d{5}\/\d{2}\b/g],
    ['incidencia', /\bINC-\d{4}-\d{4,}\b/g],
    ['tarjeta_sanitaria', /\b\d{4}\s\d{4}\s\d{4}\b/g],
  ];
  const NOMBRE = '\\p{Lu}\\p{Ll}+(?:\\s\\p{Lu}\\p{Ll}+){0,3}';
  const ORG = '(?:de(?:l| la)?\\s)?\\p{Lu}[\\p{L}]+(?:\\s(?:de(?:l| la| los)?\\s)?\\p{Lu}[\\p{L}]+){0,3}';

  const DIA = 864e5;
  const p2 = (n) => String(n).padStart(2, '0');
  const iso = (ms) => { const f = new Date(ms); return `${f.getUTCFullYear()}-${p2(f.getUTCMonth() + 1)}-${p2(f.getUTCDate())}`; };
  const utc = (a, m, d) => Date.UTC(a, m - 1, d);
  const todas = (re, t) => [...t.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))];
  // \b que entiende las letras con tilde («rozó», «caí», «revisión»): las listas de palabras del idioma se leen así
  const LIM = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
  const cacheUni = new Map();
  const uni = (re) => { if (!cacheUni.has(re)) cacheUni.set(re, new RegExp(re.source.replace(/\\b/g, LIM), re.flags.replace('u', '') + 'u')); return cacheUni.get(re); };
  const uniLista = (l) => l.map(([k, re]) => [k, uni(re)]);
  const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const soloAlnum = (s) => String(s || '').replace(/[^\dA-Za-z]/g, '').toUpperCase();

  // Letra de control del DNI y del NIE
  function dniValido(s) {
    const x = soloAlnum(s).replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
    if (!/^\d{8}[A-Z]$/.test(x)) return false;
    return 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(x.slice(0, 8)) % 23] === x[8];
  }

  // Frase que contiene la posición i: de un punto, ! o ? seguido de espacio y mayúscula al siguiente (sin cortar en «Dra.»)
  function frase(t, i) {
    const abrev = P().abreviaturas;
    const fin = (k) => /[.!?]/.test(t[k]) && /\s/.test(t[k + 1] || ' ') && !abrev.test(t.slice(Math.max(0, k - 6), k));
    let a = i; while (a > 0 && !fin(a - 1)) a--;
    let b = i; while (b < t.length && !fin(b)) b++;
    return [a, Math.min(t.length, b + 1)];
  }
  // La palabra de la lista más cercana a [ini, fin) dentro de su frase: [tipo, distancia] o null
  function masCercana(t, ini, fin, lista) {
    const [a, b] = frase(t, ini);
    const trozo = t.slice(a, b);
    let mejor = null;
    lista.forEach(([tipo, re], orden) => {
      for (const m of todas(re, trozo)) {
        const s = a + m.index; const e = s + m[0].length;
        if (s < fin && e > ini) continue;   // la propia entidad
        const d = e <= ini ? ini - e : s - fin;
        if (!mejor || d < mejor[1] || (d === mejor[1] && orden < mejor[2])) mejor = [tipo, d, orden];
      }
    });
    return mejor;
  }
  const solapa = (a, b) => a.inicio < b.fin && b.inicio < a.fin;
  const rango = (x) => ({ exacta: 2, relativa: 1, aproximada: 0 }[x.precision] || 0) * 2 + (x.hora ? 1 : 0);

  // ── Fechas ──
  function buscarFechas(msg) {
    const t = msg.texto; const p = P(); const f = PF();
    const recep = utc(+msg.fecha_recepcion.slice(0, 4), +msg.fecha_recepcion.slice(5, 7), +msg.fecha_recepcion.slice(8, 10));
    const anio = new Date(recep).getUTCFullYear();
    const SEM = f.dias.join('|'); const MES = f.meses.join('|');
    const mes = (nombre) => f.meses.findIndex((x) => x.toLowerCase() === nombre.toLowerCase()) + 1;
    const dsem = (nombre) => f.dias.findIndex((x) => sinTildes(x) === sinTildes(nombre));
    // Día sin mes: el mes (anterior, el de la recepción o el siguiente) en que cae ese día de la semana, el más cercano
    const sinMes = (d, sem) => {
      const r = new Date(recep);
      const cands = [-1, 0, 1].map((k) => utc(r.getUTCFullYear(), r.getUTCMonth() + 1 + k, d)).filter((ms) => new Date(ms).getUTCDate() === d);
      const ok = sem == null ? cands : cands.filter((ms) => new Date(ms).getUTCDay() === sem);
      return (ok.length ? ok : cands).sort((x, y) => Math.abs(x - recep) - Math.abs(y - recep))[0];
    };
    const c = [];
    const add = (m, ms, precision) => c.push({ inicio: m.index, fin: m.index + m[0].length, cita: m[0], ms, precision });
    for (const m of todas(new RegExp(f.diaMes(SEM, MES), 'gi'), t)) add(m, utc(m[4] ? +m[4] : anio, mes(m[3]), +m[2]), 'exacta');
    for (const m of todas(new RegExp(f.semanaDia(SEM, MES), 'gi'), t)) add(m, sinMes(+m[2], dsem(m[1])), 'exacta');
    for (const m of todas(new RegExp(f.diaSuelto(SEM, MES), 'gi'), t)) add(m, sinMes(+m[2]), 'exacta');
    for (const m of todas(new RegExp(f.mesAnio(SEM, MES), 'gi'), t)) add(m, utc(+m[2], mes(m[1]), 15), 'aproximada');
    for (const m of todas(/(?<![\d/])(0[1-9]|1[0-2])\/(20\d\d)(?![\d/])/g, t)) add(m, utc(+m[2], +m[1], 15), 'aproximada');
    for (const m of todas(/(?<![\d/.,])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])/g, t)) add(m, utc(m[3] ? +m[3] : anio, +m[2], +m[1]), 'exacta');
    for (const [re, dd] of p.relativas) for (const m of todas(uni(re), t)) add(m, recep + dd * DIA, 'relativa');
    for (const m of todas(uni(p.haceN), t)) {
      const n = p.numeros[m[1].toLowerCase()] ?? Number(m[1]);
      add(m, recep - n * (p.semana.test(m[2]) ? 7 : 1) * DIA, 'relativa');
    }
    // Las más largas primero; una relativa pegada a una fecha explícita («Ayer 13/09», «hoy 14/09») se queda con la explícita
    c.sort((a, b) => a.inicio - b.inicio || (b.fin - b.inicio) - (a.fin - a.inicio));
    const out = [];
    for (const x of c) {
      if (out.some((y) => solapa(x, y))) continue;
      const prev = out[out.length - 1];
      if (prev && x.inicio - prev.fin <= 2 && /^[\s,]*$/.test(t.slice(prev.fin, x.inicio))) {
        if (prev.precision === 'relativa' && x.precision !== 'relativa') { Object.assign(prev, { fin: x.fin, cita: t.slice(prev.inicio, x.fin), ms: x.ms, precision: x.precision }); continue; }
        if (x.precision === 'relativa') { prev.fin = x.fin; prev.cita = t.slice(prev.inicio, x.fin); continue; }
      }
      out.push(x);
    }
    return { fechas: out, recep };
  }

  function fechas(msg) {
    const t = msg.texto; const p = P();
    const { fechas: fs, recep } = buscarFechas(msg);
    let hecho = false;
    return fs.map((x, i) => {
      // Hora: en la misma frase, detrás de la fecha y antes de la siguiente
      const [, finFrase] = frase(t, x.inicio);
      const tope = Math.min(finFrase, fs[i + 1] ? fs[i + 1].inicio : t.length, x.fin + 60);
      const h = t.slice(x.fin, tope).match(p.hora);
      const hora = h && x.precision !== 'aproximada' ? `${p2(h[1])}:${h[2] || '00'}` : null;
      let tipo = (masCercana(t, x.inicio, x.fin, uniLista(p.contexto)) || [null])[0];
      if (tipo === 'medico') tipo = x.ms > recep ? 'cita_medica' : 'atencion_medica';
      // Sin palabra que la explique: la primera fecha pasada es la del hecho; las demás, «otra»
      if (!tipo) tipo = !hecho && i === 0 && x.ms <= recep ? 'hecho' : 'otra';
      if (['accidente', 'robo', 'hecho'].includes(tipo)) hecho = true;
      return { fecha: iso(x.ms), hora, tipo, precision: x.precision, cita: x.cita, inicio: x.inicio, fin: x.fin };
    })
      // La misma fecha con el mismo papel dicha dos veces («esta mañana (13/09)»): se queda la más precisa
      .filter((x, i, l) => !l.some((y, j) => j !== i && y.fecha === x.fecha && y.tipo === x.tipo && (rango(y) > rango(x) || (rango(y) === rango(x) && j < i))));
  }

  // ── Personas, con su DNI o NIE, teléfono y email ──
  function personas(msg) {
    const t = msg.texto; const p = P();
    const remitente = String(msg.remitente.nombre || '').replace(/\s*\(.*\)\s*$/, '').trim();
    const comunica = /\(/.test(msg.remitente.nombre || '');
    const lista = [];
    const norm = sinTildes;
    const buscar = (nombre) => lista.find((x) => { const a = norm(x.nombre_propio); const b = norm(nombre); return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `); });
    const nueva = (nombre, rol, inicio) => {
      const ya = buscar(nombre);
      if (ya) { if (nombre.length > ya.nombre_propio.length) ya.nombre_propio = nombre; ya.menciones.push(inicio); return ya; }
      const x = { nombre_propio: nombre, rol, dni: null, telefono: null, email: null, menciones: [inicio] };
      lista.push(x); return x;
    };
    if (remitente) {
      const i = t.indexOf(remitente);
      nueva(remitente, comunica ? 'comunicante' : 'tomador', i);
    }
    for (const [re, rol] of p.personas(NOMBRE)) for (const m of todas(re, t)) {
      const nombre = m[1].replace(p.finNombre, '');
      nueva(nombre, rol, m.index + m[0].length - m[1].length);
    }
    const yo = lista[0];
    const contacto = String(msg.remitente.contacto || '');
    // Dueño de un dato: «Mi DNI» → remitente; «Su DNI» → la persona nombrada antes (un familiar si lo hay); si no, la más cercana
    const duenio = (pos) => {
      const antes = t.slice(Math.max(0, pos - 60), pos);
      const previas = lista.filter((x) => x.menciones.some((i) => i >= 0 && i < pos)).map((x) => [x, Math.max(...x.menciones.filter((i) => i < pos))]).sort((a, b) => b[1] - a[1]);
      if (p.propio.test(antes)) return yo;
      if (p.ajeno.test(antes)) return (previas.find(([x]) => x !== yo && x.rol === 'familiar') || previas.find(([x]) => x !== yo) || [yo])[0];
      const cerca = previas.find(([, i]) => pos - i < 110);
      return cerca ? cerca[0] : yo;
    };
    for (const tipo of ['dni', 'nie']) for (const m of todas(FORMATOS[tipo], t)) { const x = duenio(m.index); if (x && !x.dni) x.dni = m[0]; }
    for (const m of todas(FORMATOS.telefono, t)) { const x = duenio(m.index); if (x && !x.telefono) x.telefono = m[0]; }
    for (const m of todas(FORMATOS.email, t)) { if (yo && !yo.email) yo.email = m[0]; }
    if (yo && !yo.telefono && FORMATOS.telefono.source && new RegExp(FORMATOS.telefono.source).test(contacto)) yo.telefono = contacto;
    if (yo && !yo.email && new RegExp(FORMATOS.email.source).test(contacto)) yo.email = contacto;
    return lista.map(({ menciones, ...x }) => ({ ...x, cita: t.includes(x.nombre_propio) ? x.nombre_propio : null }));
  }

  // ── Vehículos ──
  function vehiculos(msg) {
    const t = msg.texto; const p = P();
    return todas(FORMATOS.matricula, t).map((m) => {
      const antes = t.slice(Math.max(0, m.index - 45), m.index);
      const mm = antes.match(p.modelo);
      let modelo = mm ? mm[1].split(' ') : [];
      while (modelo.length && p.noModelo.includes(modelo[0])) modelo.shift();
      const [a] = frase(t, m.index);
      const rol = p.contrario.test(t.slice(Math.max(a, m.index - 90), m.index)) ? 'contrario' : 'asegurado';
      return { matricula: m[0], modelo_vehiculo: modelo.join(' ') || null, rol, cita: m[0], inicio: m.index, fin: m.index + m[0].length };
    });
  }

  // ── Lugares: direcciones postales y carreteras ──
  function lugares(msg) {
    const t = msg.texto; const p = P();
    const hallados = [];
    for (const re of [...p.direcciones, p.carretera]) for (const m of todas(re, t)) {
      const x = { inicio: m.index, fin: m.index + m[0].length, lugar: m[0].replace(/[,\s]+$/, '') };
      if (!hallados.some((y) => solapa(x, y))) hallados.push(x);
    }
    return hallados.sort((a, b) => a.inicio - b.inicio).map((x) => {
      const cp = x.lugar.match(p.cpMunicipio);
      const carretera = /^(?:AP|[AMN])-\d/.test(x.lugar);
      const tipo = (masCercana(t, x.inicio, x.fin, uniLista(p.tipoLugar)) || [carretera ? 'lugar_hecho' : 'otro'])[0];
      const municipio = cp && cp[2] ? cp[2] : (/\bMadrid\b/.test(x.lugar) ? 'Madrid' : null);
      return { lugar: x.lugar, tipo, cp: cp ? cp[1] : null, municipio, cita: x.lugar, inicio: x.inicio, fin: x.fin };
    });
  }

  // ── Organizaciones ──
  function organizaciones(msg) {
    const t = msg.texto; const out = [];
    for (const [re, tipo] of P().organizaciones(ORG)) for (const m of todas(re, t)) {
      const nombre = m[1] || m[2]; const inicio = m.index + m[0].indexOf(nombre);
      const x = { organizacion: nombre, tipo, cita: nombre, inicio, fin: inicio + nombre.length };
      if (!out.some((y) => solapa(x, y))) out.push(x);
    }
    return out.sort((a, b) => a.inicio - b.inicio);
  }

  // ── Identificadores (póliza, denuncia, atestado, IBAN, tarjeta sanitaria, incidencia) ──
  function identificadores(msg) {
    const t = msg.texto; const out = [];
    for (const [tipo, re] of IDS) for (const m of todas(re, t)) {
      const x = { tipo, codigo: m[0], cita: m[0], inicio: m.index, fin: m.index + m[0].length };
      if (!out.some((y) => solapa(x, y))) out.push(x);
    }
    return out.sort((a, b) => a.inicio - b.inicio);
  }

  // ── Importes ──
  function importes(msg) {
    const t = msg.texto; const p = P();
    return todas(p.importe, t).map((m) => {
      const fin = m.index + m[0].length;
      const concepto = (masCercana(t, m.index, fin, uniLista(p.conceptos)) || ['otro'])[0];
      return { importe: p.importeNumero(m[1]), concepto, cita: m[0], inicio: m.index, fin };
    });
  }

  const sinPos = (l) => l.map(({ inicio, fin, ...x }) => x);
  function detectar(msg) {
    return {
      fechas: sinPos(fechas(msg)), personas: personas(msg), vehiculos: sinPos(vehiculos(msg)), lugares: sinPos(lugares(msg)),
      organizaciones: sinPos(organizaciones(msg)), identificadores: sinPos(identificadores(msg)), importes: sinPos(importes(msg)),
    };
  }

  // ── Respuesta del modelo → entidades válidas ──
  // Se descarta lo que no está en el mensaje (ni la cita ni el valor) y lo que no tiene forma; los tipos fuera del
  // catálogo pasan a «otra/otro». El DNI con la letra de control mal se conserva marcado (dni_valido: false).
  function validar(obj, msg) {
    if (!obj || typeof obj !== 'object') return null;
    const t = msg.texto; const cab = `${msg.remitente.nombre} ${msg.remitente.contacto}`;
    const s = (v) => (v == null ? null : String(v).trim() || null);
    const cat = (g, v, def) => (CATALOGO[g].includes(v) ? v : def);
    const enTexto = (v) => !!v && (t.includes(v) || cab.includes(v));
    const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v)) ? v : null);
    const lista = (g) => (Array.isArray(obj[g]) ? obj[g].filter((x) => x && typeof x === 'object') : []);
    const out = {
      fechas: lista('fechas').map((x) => ({ fecha: fechaOk(s(x.fecha ?? x.valor)), hora: /^\d{1,2}:\d{2}$/.test(s(x.hora) || '') ? s(x.hora) : null, tipo: cat('fechas', s(x.tipo), 'otra'), precision: cat('precision', s(x.precision), 'exacta'), cita: s(x.cita) }))
        .filter((x) => enTexto(x.cita)),
      personas: lista('personas').map((x) => ({ nombre_propio: s(x.nombre_propio ?? x.nombre), rol: cat('personas', s(x.rol), 'otro'), dni: s(x.dni), telefono: s(x.telefono), email: s(x.email), cita: s(x.cita) }))
        .filter((x) => enTexto(x.nombre_propio) || enTexto(x.cita))
        .map((x) => ({ ...x, cita: enTexto(x.cita) ? x.cita : t.includes(x.nombre_propio) ? x.nombre_propio : null, ...(x.dni ? { dni_valido: dniValido(x.dni) } : {}) })),
      vehiculos: lista('vehiculos').map((x) => ({ matricula: s(x.matricula), modelo_vehiculo: s(x.modelo_vehiculo ?? x.marca_modelo), rol: cat('vehiculos', s(x.rol), 'otro'), cita: s(x.cita) || s(x.matricula) }))
        .filter((x) => enTexto(x.matricula)),
      lugares: lista('lugares').map((x) => ({ lugar: s(x.lugar ?? x.texto), tipo: cat('lugares', s(x.tipo), 'otro'), cp: s(x.cp), municipio: s(x.municipio), cita: s(x.cita) || s(x.lugar ?? x.texto) }))
        .filter((x) => enTexto(x.cita)),
      organizaciones: lista('organizaciones').map((x) => ({ organizacion: s(x.organizacion ?? x.nombre), tipo: cat('organizaciones', s(x.tipo), 'otra'), cita: s(x.cita) || s(x.organizacion ?? x.nombre) }))
        .filter((x) => enTexto(x.cita)),
      identificadores: lista('identificadores').map((x) => ({ tipo: cat('identificadores', s(x.tipo), 'otro'), codigo: s(x.codigo ?? x.valor), cita: s(x.cita) || s(x.codigo ?? x.valor) }))
        .filter((x) => enTexto(x.codigo) || enTexto(x.cita)),
      importes: lista('importes').map((x) => ({ importe: Number.isFinite(Number(x.importe ?? x.valor)) ? Number(x.importe ?? x.valor) : null, concepto: cat('importes', s(x.concepto), 'otro'), cita: s(x.cita) }))
        .filter((x) => x.importe != null && enTexto(x.cita)),
    };
    // Sin duplicados (misma clave)
    for (const g of GRUPOS) { const vistas = new Set(); out[g] = out[g].filter((x) => { const k = clave(g, x); if (vistas.has(k)) return false; vistas.add(k); return true; }); }
    return out;
  }

  // Formato compacto de los resultados guardados (data/demo/resultados.js, campo `ent`)
  function expandir(c) {
    if (!c) return null;
    const l = (k) => c[k] || [];
    return {
      fechas: l('fechas').map(([fecha, hora, tipo, precision, cita]) => ({ fecha, hora, tipo, precision, cita })),
      personas: l('personas').map(([nombre_propio, rol, dni, telefono, email]) => ({ nombre_propio, rol, dni, telefono, email, cita: nombre_propio, ...(dni ? { dni_valido: dniValido(dni) } : {}) })),
      vehiculos: l('vehiculos').map(([matricula, modelo_vehiculo, rol]) => ({ matricula, modelo_vehiculo, rol, cita: matricula })),
      lugares: l('lugares').map(([lugar, tipo, cp, municipio]) => ({ lugar, tipo, cp, municipio, cita: lugar })),
      organizaciones: l('organizaciones').map(([organizacion, tipo]) => ({ organizacion, tipo, cita: organizacion })),
      identificadores: l('identificadores').map(([tipo, codigo]) => ({ tipo, codigo, cita: codigo })),
      importes: l('importes').map(([importe, concepto, cita]) => ({ importe, concepto, cita })),
    };
  }

  // ── Exactitud de la extracción ──
  // Clave de cada entidad: grupo|tipo|valor normalizado. Las personas dan además una clave por DNI, teléfono y email.
  function clave(g, x) {
    switch (g) {
      case 'fechas': return `fecha|${x.tipo}|${x.fecha || '?'}`;
      case 'personas': return `persona|${x.rol}|${sinTildes(x.nombre_propio)}`;
      case 'vehiculos': return `vehiculo|${x.rol}|${soloAlnum(x.matricula)}`;
      case 'lugares': return `lugar|${x.tipo}|${sinTildes(x.lugar)}`;
      case 'organizaciones': return `organizacion|${x.tipo}|${sinTildes(x.organizacion)}`;
      case 'identificadores': return `id|${x.tipo}|${soloAlnum(x.codigo)}`;
      case 'importes': return `importe|${x.concepto}|${x.importe}`;
      default: return '';
    }
  }
  function claves(ent) {
    if (!ent) return [];
    const out = [];
    for (const g of GRUPOS) for (const x of ent[g] || []) {
      out.push(clave(g, x));
      if (g === 'personas') {
        if (x.dni) out.push(`dni|${soloAlnum(x.dni)}`);
        if (x.telefono) out.push(`telefono|${String(x.telefono).replace(/\D/g, '').slice(-9)}`);
        if (x.email) out.push(`email|${String(x.email).toLowerCase()}`);
      }
    }
    return out;
  }
  // Grupo de una clave, para el desglose (dni, teléfono y email cuentan como datos de las personas)
  const GRUPO_DE = { fecha: 'fechas', persona: 'personas', dni: 'personas', telefono: 'personas', email: 'personas', vehiculo: 'vehiculos', lugar: 'lugares', organizacion: 'organizaciones', id: 'identificadores', importe: 'importes' };
  // Lugares y organizaciones se dan por buenos con el mismo tipo y una palabra significativa en común (el texto cambia
  // entre «C/ Toledo 88» y «calle Toledo 88, Madrid»); el resto, con la clave exacta. Personas: mismo papel y nombre
  // que empieza igual («Raúl Méndez» y «Raúl Méndez Torres»).
  const palabras = (s) => new Set(sinTildes(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !['calle', 'avenida', 'paseo', 'plaza', 'madrid'].includes(w)));
  function casan(a, b) {
    if (a === b) return true;
    const [ga, ta, ...va] = a.split('|'); const [gb, tb, ...vb] = b.split('|');
    if (ga !== gb || ta !== tb) return false;
    const x = va.join('|'); const y = vb.join('|');
    if (ga === 'persona') {
      // «Dra. Lorenzo» y «Dr Lorenzo» son la misma persona
      const sinTitulo = (v) => v.replace(/^dra?\.?\s+/, '');
      const [a, b] = [sinTitulo(x), sinTitulo(y)];
      return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
    }
    if (ga === 'lugar' || ga === 'organizacion') { const px = palabras(x); return [...palabras(y)].some((w) => px.has(w)); }
    return false;
  }
  function comparar(esperadas, ent) {
    const obtenidas = claves(ent);
    const libres = [...obtenidas];
    const acertadas = []; const faltan = [];
    for (const e of esperadas || []) {
      const i = libres.findIndex((o) => casan(e, o));
      if (i >= 0) { acertadas.push(e); libres.splice(i, 1); } else faltan.push(e);
    }
    const porGrupo = {};
    const sumar = (k, campo) => { const g = GRUPO_DE[k.split('|')[0]] || 'otros'; (porGrupo[g] = porGrupo[g] || { esperadas: 0, acertadas: 0, sobran: 0 })[campo]++; };
    (esperadas || []).forEach((k) => sumar(k, 'esperadas'));
    acertadas.forEach((k) => sumar(k, 'acertadas'));
    libres.forEach((k) => sumar(k, 'sobran'));
    const n = (esperadas || []).length;
    return {
      esperadas: n, obtenidas: obtenidas.length, acertadas: acertadas.length, faltan, sobran: libres, por_grupo: porGrupo,
      cobertura: n ? acertadas.length / n : null, precision: obtenidas.length ? acertadas.length / obtenidas.length : null,
    };
  }

  const total = (ent) => (ent ? GRUPOS.reduce((s, g) => s + (ent[g] || []).length, 0) : 0);

  // Frase del suceso («se rompió el latiguillo del agua fría»): la primera palabra de accidente, robo o daño del texto
  // (si no hay, la de atención médica) y lo que sigue hasta la coma o el punto, como mucho 8 palabras
  // sucesos() da todas las frases candidatas, en orden; suceso() la primera
  const CORTE = /[,.;:!?()\n]| y | and | und /;
  function sucesos(texto) {
    const t = String(texto || ''); const ctx = Object.fromEntries(P().contexto);
    const frase6 = (s) => s.split(CORTE)[0].split(/\s+/).slice(0, 6).join(' ').trim();
    const out = [];
    for (const grupo of [['accidente', 'robo', 'hecho'], ['cirugia', 'medico', 'descubrimiento_dano']]) {
      grupo.filter((k) => ctx[k]).flatMap((k) => todas(uni(ctx[k]), t)).sort((a, b) => a.index - b.index).forEach((m) => out.push(frase6(t.slice(m.index))));
    }
    // Sin palabra del suceso: la primera parte del texto con al menos cuatro palabras
    const parte = t.split(/[,.;:!?()\n]/).map((x) => x.trim()).find((x) => x.split(/\s+/).length >= 4);
    if (parte) out.push(parte.split(/\s+/).slice(0, 6).join(' '));
    return [...new Set(out.filter(Boolean))];
  }
  const suceso = (texto) => sucesos(texto)[0] || null;

  const api = { CATALOGO, GRUPOS, NER, dniValido, suceso, sucesos, detectar, validar, expandir, clave, claves, comparar, total, _fechas: fechas };
  root.Entidades = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
