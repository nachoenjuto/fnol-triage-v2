// Adjuntos de los mensajes: la declaración amistosa de accidente se genera en el navegador con pdf-lib (vendor/) a
// partir de `contenido`, ya desplazado por fechas.js, así que la fecha del parte siempre cuadra con la del mensaje.
// Las fotos son archivos estáticos de data/adjuntos/. `huellas` calcula tamaño y SHA-256 de cada archivo tal y como
// se recibe, para el bloque _gobernanza.adjuntos.
(function (raiz) {
  const PDF_LIB = 'vendor/pdf-lib.min.js';
  const CIRCUNSTANCIAS = [
    'estaba estacionado / parado',
    'salía de un estacionamiento / abría una puerta',
    'iba a estacionar',
    'salía de un aparcamiento, lugar privado o camino',
    'entraba en un aparcamiento, lugar privado o camino',
    'entraba en una glorieta',
    'circulaba por una glorieta',
    'chocaba en la parte trasera, mismo sentido y carril',
    'circulaba en el mismo sentido y en carril diferente',
    'cambiaba de carril',
    'adelantaba',
    'giraba a la derecha',
    'giraba a la izquierda',
    'daba marcha atrás',
    'invadía el sentido contrario',
    'venía de la derecha (en un cruce)',
    'no respetó la prioridad o un semáforo en rojo',
  ];

  let cargando = null;
  function cargarPdfLib() {
    if (raiz.PDFLib) return Promise.resolve(raiz.PDFLib);
    if (typeof document === 'undefined') return Promise.reject(new Error('pdf-lib no disponible'));
    cargando = cargando || new Promise((ok, ko) => {
      const s = Object.assign(document.createElement('script'), { src: PDF_LIB, async: true });
      s.onload = () => ok(raiz.PDFLib);
      s.onerror = () => { cargando = null; ko(new Error('No se pudo cargar pdf-lib')); };
      document.head.append(s);
    });
    return cargando;
  }

  // Declaración amistosa de accidente (formato europeo, una página A4). Determinista: mismas entradas, mismos bytes.
  async function parteAmistoso(c, { PDFLib = raiz.PDFLib, recibido } = {}) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const fecha = new Date(recibido || '2026-01-01T00:00:00');
    doc.setTitle('Declaración amistosa de accidente de automóvil'); doc.setAuthor(c.a.tomador); doc.setSubject(`Póliza ${c.a.poliza}`);
    doc.setProducer('Escáner del móvil'); doc.setCreator('Escáner del móvil'); doc.setCreationDate(fecha); doc.setModificationDate(fecha);
    const pg = doc.addPage([595, 842]);
    const f = await doc.embedFont(StandardFonts.Helvetica);
    const fb = await doc.embedFont(StandardFonts.HelveticaBold);
    const fm = await doc.embedFont(StandardFonts.HelveticaOblique);
    const NEGRO = rgb(0.13, 0.13, 0.13); const GRIS = rgb(0.42, 0.42, 0.42); const TINTA = rgb(0.08, 0.2, 0.55);
    const AZUL = rgb(0.87, 0.92, 0.98); const AMARILLO = rgb(0.99, 0.96, 0.82); const LINEA = rgb(0.55, 0.55, 0.55);
    // Coordenadas desde arriba para escribir como en papel
    const Y = (y) => 842 - y;
    const txt = (s, x, y, { size = 7, font = f, color = NEGRO, max } = {}) => {
      let t = String(s ?? ''); let sz = size;
      if (max) while (sz > 5 && font.widthOfTextAtSize(t, sz) > max) sz -= 0.25;
      pg.drawText(t, { x, y: Y(y), size: sz, font, color });
    };
    const mano = (s, x, y, o = {}) => txt(s, x, y, { size: 9, font: fm, color: TINTA, ...o });
    const caja = (x, y, w, h, o = {}) => pg.drawRectangle({ x, y: Y(y + h), width: w, height: h, borderColor: LINEA, borderWidth: 0.6, ...o });
    const titulo = (n, s, x, y) => { txt(n, x, y, { font: fb, size: 7.5 }); txt(s, x + 10, y, { font: fb, size: 7, color: GRIS }); };
    const casilla = (x, y, marcada) => {
      caja(x, y, 8, 8, { color: rgb(1, 1, 1) });
      if (marcada) pg.drawSvgPath('M0 4 L3 8 L9 -1', { x, y: Y(y), borderColor: TINTA, borderWidth: 1.4 });
    };

    pg.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.985, 0.98, 0.965) });
    txt('DECLARACIÓN AMISTOSA DE ACCIDENTE DE AUTOMÓVIL', 30, 38, { font: fb, size: 13 });
    txt('No constituye reconocimiento de responsabilidad: recoge las identidades y los hechos para agilizar la liquidación. Firmada por ambos conductores.', 30, 52, { size: 6.5, color: GRIS });

    // 1–5 · cabecera
    caja(30, 62, 120, 40); titulo('1', 'Fecha y hora', 34, 72); mano(`${c.fecha}   ${c.hora} h`, 36, 92);
    caja(150, 62, 285, 40); titulo('2', 'Localización', 154, 72); mano(c.localizacion, 156, 92, { max: 274 });
    caja(435, 62, 130, 40); titulo('3', 'Heridos, incluso leves', 439, 72);
    txt('No', 446, 92); casilla(460, 85, !c.heridos); txt('Sí', 500, 92); casilla(512, 85, !!c.heridos);
    caja(30, 102, 285, 32); titulo('4', 'Daños materiales en otros vehículos u objetos', 34, 112);
    txt('No', 46, 127); casilla(60, 120, !c.danos_otros); txt('Sí', 100, 127); casilla(112, 120, !!c.danos_otros);
    caja(315, 102, 250, 32); titulo('5', 'Testigos', 319, 112); mano(c.testigos || 'Ninguno', 321, 128, { max: 238 });

    // Columnas A y B, con las circunstancias en el centro
    const columna = (v, x, letra, fondo) => {
      const w = 185;
      caja(x, 142, w, 452, { color: fondo });
      txt(`VEHÍCULO ${letra}`, x + 60, 156, { font: fb, size: 10 });
      let y = 172;
      const bloque = (n, nombre, filas) => {
        titulo(n, nombre, x + 6, y); y += 12;
        filas.forEach(([k, val]) => { txt(k, x + 8, y, { size: 6, color: GRIS }); mano(val, x + 8, y + 10, { size: 8.5, max: w - 16 }); y += 21; });
        y += 3;
      };
      bloque('6', 'Tomador / asegurado', [['Nombre y apellidos', v.tomador], ['Dirección', v.direccion], ['Teléfono', v.telefono]]);
      bloque('7', 'Vehículo', [['Marca y modelo · Matrícula', `${v.marca} · ${v.matricula}`]]);
      bloque('8', 'Entidad aseguradora', [['Nombre', v.aseguradora], ['N.º de póliza', v.poliza]]);
      bloque('9', 'Conductor', [['Nombre y apellidos', v.conductor], ['DNI · Permiso de conducir', `${v.dni} · ${v.permiso}`]]);
      titulo('10', 'Punto de choque inicial', x + 6, y); y += 8;
      // Silueta del coche vista desde arriba con la flecha en el punto de choque
      const cx = x + w / 2 - 22; const cy = y + 4;
      caja(cx, cy, 44, 78, { borderColor: GRIS, borderWidth: 1, color: rgb(1, 1, 1) });
      pg.drawRectangle({ x: cx + 6, y: Y(cy + 22), width: 32, height: 12, borderColor: GRIS, borderWidth: 0.6 });
      txt('delante', cx + 9, cy - 1, { size: 5.5, color: GRIS });
      const fy = v.choque === 'delantero' ? cy + 3 : cy + 75; const dir = v.choque === 'delantero' ? -1 : 1;
      pg.drawSvgPath(`M0 0 L0 ${dir * 16} M-4 ${dir * 5} L0 0 L4 ${dir * 5}`, { x: cx + 32, y: Y(fy + dir * -2), borderColor: rgb(0.75, 0.1, 0.1), borderWidth: 1.6 });
      y += 90;
      titulo('11', 'Daños visibles', x + 6, y); mano(v.danos, x + 8, y + 13, { size: 8.5, max: w - 16 }); y += 26;
      titulo('14', 'Observaciones', x + 6, y); mano(v.observaciones || '—', x + 8, y + 13, { size: 8, max: w - 16 });
    };
    columna(c.a, 30, 'A', AZUL);
    columna(c.b, 380, 'B', AMARILLO);
    caja(215, 142, 165, 452, { color: rgb(1, 1, 1) });
    titulo('12', 'Circunstancias', 252, 156);
    txt('Marque cada casilla aplicable', 240, 166, { size: 6, color: GRIS });
    txt('A', 223, 178, { font: fb, size: 7 }); txt('B', 366, 178, { font: fb, size: 7 });
    CIRCUNSTANCIAS.forEach((s, i) => {
      const y = 186 + i * 22.5;
      casilla(220, y, (c.circunstancias_a || []).includes(i + 1));
      casilla(364, y, (c.circunstancias_b || []).includes(i + 1));
      txt(String(i + 1), 233, y + 7, { font: fb, size: 6.5 });
      const palabras = s.split(' '); let l1 = ''; let l2 = '';
      palabras.forEach((p) => { if (!l2 && f.widthOfTextAtSize(`${l1} ${p}`, 6) < 112) l1 = `${l1} ${p}`.trim(); else l2 = `${l2} ${p}`.trim(); });
      txt(l1, 244, y + 4, { size: 6 }); if (l2) txt(l2, 244, y + 11, { size: 6 });
    });
    txt('N.º de casillas', 262, 584, { size: 6.5, color: GRIS });
    mano(String((c.circunstancias_a || []).length), 228, 586); mano(String((c.circunstancias_b || []).length), 362, 586);

    // 13 · croquis: calzada de dos carriles con los dos coches en el mismo carril, A detrás de B
    caja(30, 602, 535, 120, { color: rgb(1, 1, 1) });
    titulo('13', 'Croquis del accidente en el momento del choque', 34, 612);
    pg.drawLine({ start: { x: 60, y: Y(632) }, end: { x: 540, y: Y(632) }, thickness: 1, color: GRIS });
    pg.drawLine({ start: { x: 60, y: Y(706) }, end: { x: 540, y: Y(706) }, thickness: 1, color: GRIS });
    pg.drawLine({ start: { x: 60, y: Y(669) }, end: { x: 540, y: Y(669) }, thickness: 0.8, color: GRIS, dashArray: [8, 6] });
    txt(c.croquis_via || '', 64, 628, { size: 6, color: GRIS });
    const coche = (x, letra, fondo) => {
      pg.drawRectangle({ x, y: Y(700), width: 62, height: 24, color: fondo, borderColor: TINTA, borderWidth: 1.2 });
      mano(letra, x + 27, 692, { size: 11 });
    };
    coche(250, 'A', AZUL); coche(316, 'B', AMARILLO);
    pg.drawSvgPath('M0 0 L40 0 M34 -4 L40 0 L34 4', { x: 180, y: Y(688), borderColor: TINTA, borderWidth: 1.2 });
    pg.drawSvgPath('M0 0 L40 0 M34 -4 L40 0 L34 4', { x: 400, y: Y(688), borderColor: TINTA, borderWidth: 1.2 });
    mano(`sentido ${c.croquis_sentido || ''}`.trim(), 450, 700, { size: 7.5 });
    pg.drawSvgPath('M0 0 L5 -6 L10 0 L15 -6 L20 0', { x: 307, y: Y(682), borderColor: rgb(0.75, 0.1, 0.1), borderWidth: 1.2 });

    // 15 · firmas
    caja(30, 730, 267, 62); titulo('15', 'Firma del conductor A', 34, 740);
    caja(298, 730, 267, 62); titulo('15', 'Firma del conductor B', 302, 740);
    pg.drawSvgPath('M0 0 C10 -18 18 10 28 -6 S44 -16 52 -2 C58 6 66 -10 78 -4 L96 -8', { x: 70, y: Y(778), borderColor: TINTA, borderWidth: 1.1 });
    pg.drawSvgPath('M0 0 C6 -16 14 -16 18 0 C22 12 30 -14 40 -8 C48 -2 52 -12 64 -6 C72 -2 80 -10 92 -4', { x: 340, y: Y(778), borderColor: TINTA, borderWidth: 1.1 });

    txt('Copia escaneada con el móvil y enviada por email por el conductor A. Datos ficticios generados para la demo.', 30, 812, { size: 6, color: GRIS });
    return doc.save({ useObjectStreams: false });
  }

  // Bytes de un adjunto: el PDF se genera; la imagen se descarga de data/adjuntos/
  const bytesCache = new Map();
  async function bytes(adj, msg) {
    const k = `${msg.id}/${adj.id}`;
    if (!bytesCache.has(k)) {
      bytesCache.set(k, (async () => {
        if (adj.tipo === 'declaracion_amistosa') {
          const PDFLib = await cargarPdfLib();
          return parteAmistoso(adj.contenido, { PDFLib, recibido: msg.fecha_recepcion });
        }
        const r = await fetch(adj.src);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return new Uint8Array(await r.arrayBuffer());
      })().catch((e) => { bytesCache.delete(k); throw e; }));
    }
    return bytesCache.get(k);
  }
  const urlCache = new Map();
  async function url(adj, msg) {
    const k = `${msg.id}/${adj.id}`;
    if (!urlCache.has(k)) urlCache.set(k, URL.createObjectURL(new Blob([await bytes(adj, msg)], { type: adj.mime })));
    return urlCache.get(k);
  }
  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  // Lo que registra el agente multicanal al recibir el mensaje: archivo, tipo, tamaño y SHA-256 de cada adjunto
  async function huellas(msg) {
    return Promise.all((msg.adjuntos || []).map(async (a) => {
      const base = { id: a.id, archivo: a.archivo, mime: a.mime };
      try {
        const b = await bytes(a, msg);
        const h = raiz.crypto && raiz.crypto.subtle ? hex(await raiz.crypto.subtle.digest('SHA-256', b)) : null;
        return { ...base, bytes: b.length, sha256: h };
      } catch (e) { return { ...base, bytes: null, sha256: null, error: e.message }; }
    }));
  }

  raiz.Adjuntos = { CIRCUNSTANCIAS, cargarPdfLib, parteAmistoso, bytes, url, huellas };
})(typeof window !== 'undefined' ? window : globalThis);
