// Fechas siempre al día. Los datos de la demo están escritos con «hoy» = ANCLA (17/09/2026). Al cargar la página se
// desplazan Δ días (hoy − ANCLA) todas las fechas de mensajes, resultados guardados y panel de gobierno:
//   ISO (2026-09-14T09:12:00), dd/mm (13/09, «jueves 10/09»), mm/aaaa (03/2026), «12 de septiembre», «sábado 12 de septiembre»,
//   «el jueves 10», «el pasado día 8», «1–3/09» y «julio de 2026». El día de la semana se recalcula, la hora no cambia.
// Las formas con nombres de días y meses dependen del idioma de los datos: I18N.motor('fechas'), en locales/<idioma>/motor.js.
// Los desfases entre hecho, recepción y procesado se conservan (A2/H2 dan lo mismo) y las citas de las evidencias se
// transforman igual que el mensaje, así que siguen siendo literales.
// Antes de CORTE el «hoy» del dataset es ayer: las trazas del lote son de las 09:02 a las 09:41.
// ?fecha=AAAA-MM-DD fija el día (capturas y pruebas); ?fecha=ancla deja los datos como están escritos.
(function (raiz) {
  const ANCLA = '2026-09-17';
  const CORTE = '09:45';
  const DIA = 864e5;
  // Fechas normativas que no se mueven (AI Act art. 50 aplicable desde el 02/08/2026)
  const FIJAS = ['02/08/2026'];
  const p2 = (n) => String(n).padStart(2, '0');
  const utc = (a, m, d) => Date.UTC(a, m - 1, d);
  const partes = (ms) => { const f = new Date(ms); return { a: f.getUTCFullYear(), m: f.getUTCMonth() + 1, d: f.getUTCDate(), s: f.getUTCDay() }; };
  const anclaMs = utc(2026, 9, 17);
  // Un día sin mes («el jueves 10», «día 8») se refiere al mes del ancla si no pasa del día 17; si no, al anterior
  const sinMes = (d) => (d <= 17 ? utc(2026, 9, d) : utc(2026, 8, d));
  const mayus = (orig, nuevo) => (orig[0] === orig[0].toUpperCase() ? nuevo[0].toUpperCase() + nuevo.slice(1) : nuevo);

  // Δ en días enteros entre el ancla y `ahora` (fecha local), con el corte de la mañana
  function delta(ahora = new Date(), fijada = null) {
    if (fijada === 'ancla') return 0;
    if (fijada && /^\d{4}-\d{2}-\d{2}$/.test(fijada)) return Math.round((utc(+fijada.slice(0, 4), +fijada.slice(5, 7), +fijada.slice(8, 10)) - anclaMs) / DIA);
    const hhmm = `${p2(ahora.getHours())}:${p2(ahora.getMinutes())}`;
    const d = Math.round((utc(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate()) - anclaMs) / DIA);
    return hhmm < CORTE ? d - 1 : d;
  }

  // Una expresión por idioma, con los grupos en el mismo orden en todos
  const I18N = raiz.I18N || require('./locales/node.js')();
  const cache = {};
  function formas() {
    if (cache[I18N.idioma]) return cache[I18N.idioma];
    const P = I18N.motor('fechas');
    const SEM = P.dias.join('|');
    const MES = P.meses.join('|');
    const re = new RegExp([
      /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?!\d)/.source, // 1-3 ISO
      P.diaMes(SEM, MES), // 4-7 [día de la semana] d de mes [de aaaa]
      P.semanaDia(SEM, MES), // 8-9 jueves 10
      P.diaSuelto(SEM, MES), // 10-11 el pasado día 8
      /(?<![\d/])(\d{1,2})[–-](\d{1,2})\/(0[5-9])(?![\d/])/.source, // 12-14 1–3/09
      `(?:(${SEM})\\s+)?${/(?<![\d/])(\d{1,2})\/(0[5-9])(?:\/(\d{4}))?(?![\d/])/.source}`, // 15-18 [día de la semana] dd/mm[/aaaa]
      /(?<![\d/])(0[1-9]|1[0-2])\/(20\d\d)(?![\d/])/.source, // 19-20 mm/aaaa
      P.mesAnio(SEM, MES), // 21-22 julio de 2026
    ].join('|'), 'gi');
    const mes = (nombre) => P.meses.findIndex((x) => x.toLowerCase() === nombre.toLowerCase()) + 1;
    return (cache[I18N.idioma] = { P, re, mes });
  }
  const iso = (f) => `${f.a}-${p2(f.m)}-${p2(f.d)}`;

  // `vistas` (opcional) recoge cada fecha ya desplazada en ISO: las pruebas comparan así los idiomas
  function desplazarTexto(s, dd, vistas) {
    if (!dd || typeof s !== 'string') return s;
    const { P, re, mes } = formas();
    const mv = (ms) => { const f = partes(ms + dd * DIA); if (vistas) vistas.push(iso(f)); return f; };
    return s.replace(re, (m, ia, im, id, sem, d1, mes1, a1, sem2, d2, dia, d3, r1, r2, rm, sem4, d4, m4, a4, m5, a5, mes6, a6) => {
      if (ia) return iso(mv(utc(+ia, +im, +id)));
      if (d1) return mayus(m, P.fmtDiaMes(mv(utc(a1 ? +a1 : 2026, mes(mes1), +d1)), !!sem, !!a1));
      if (sem2) return mayus(m, P.fmtSemanaDia(mv(sinMes(+d2)), m));
      if (dia) return P.fmtDiaSuelto(mv(sinMes(+d3)), dia, m);
      if (r1) { const f1 = mv(utc(2026, +rm, +r1)), f2 = mv(utc(2026, +rm, +r2)); return f1.m === f2.m ? `${f1.d}–${f2.d}/${p2(f2.m)}` : `${f1.d}/${p2(f1.m)}–${f2.d}/${p2(f2.m)}`; }
      if (d4) {
        if (FIJAS.includes(m)) return m;
        const f = mv(utc(a4 ? +a4 : 2026, +m4, +d4));
        return mayus(m, `${sem4 ? `${P.dias[f.s]} ` : ''}${d4.length === 1 ? f.d : p2(f.d)}/${p2(f.m)}${a4 ? `/${f.a}` : ''}`);
      }
      if (m5) { const f = mv(utc(+a5, +m5, 15)); return `${p2(f.m)}/${f.a}`; }
      if (mes6) return mayus(m, P.fmtMesAnio(mv(utc(+a6, mes(mes6), 15))));
      return m;
    });
  }

  // Recorre objetos y arrays y desplaza todas las cadenas (las claves no se tocan). Modifica en el sitio.
  // `vistos` evita desplazar dos veces un objeto compartido (FRAUDE_DEMO también cuelga de GOBIERNO_DEMO.fraude).
  function desplazar(obj, dd, vistos = new WeakSet()) {
    if (!dd || !obj || typeof obj !== 'object') return obj;
    const rec = (o) => {
      if (vistos.has(o)) return;
      vistos.add(o);
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string') o[k] = desplazarTexto(v, dd);
        else if (v && typeof v === 'object') rec(v);
      }
    };
    rec(obj);
    return obj;
  }

  const api = { ANCLA, CORTE, delta, desplazarTexto, desplazar };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // Navegador: se aplica una sola vez a los datos que haya cargados en la página
  let fijada = null;
  try { fijada = new URLSearchParams(location.search).get('fecha'); } catch { fijada = null; }
  const dd = delta(new Date(), fijada);
  api.dias = dd;
  api.hoy = iso(partes(anclaMs + dd * DIA));
  // Para «Cargar JSON» y «Reproducir desde archivo»: solo se desplazan los archivos generados en la fecha ancla
  api.alDia = (datos) => {
    if (!dd || !datos) return datos;
    if (Array.isArray(datos)) return datos.length && datos[0] && datos[0].ancla === ANCLA ? desplazar(datos, dd) : datos;
    return datos.ancla === ANCLA ? desplazar(datos, dd) : datos;
  };
  /* global PAQUETES, RESULTADOS_GUARDADOS, GOBIERNO_DEMO, FRAUDE_DEMO */
  const vistos = new WeakSet();
  if (typeof PAQUETES !== 'undefined') desplazar(PAQUETES, dd, vistos);
  if (typeof RESULTADOS_GUARDADOS !== 'undefined') desplazar(RESULTADOS_GUARDADOS, dd, vistos);
  if (typeof GOBIERNO_DEMO !== 'undefined') desplazar(GOBIERNO_DEMO, dd, vistos);
  if (typeof FRAUDE_DEMO !== 'undefined') desplazar(FRAUDE_DEMO, dd, vistos);
  raiz.Fechas = api;
})(typeof window !== 'undefined' ? window : globalThis);
