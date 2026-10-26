// Genera el Word de un guion a partir de su markdown (plantilla Word normal, sin marca). Por defecto,
// _docs/guion-demo.md → _docs/guion-demo.docx; con argumento, otro guion: `node … _docs/guion-demo-corto.md`.
// El texto para decir en voz alta (párrafos en cita, «> …», también viñetas «> - …») sale en verde; los párrafos,
// además, con un filete verde a la izquierda. Uso: `make guion-docx` (instala la librería docx en una carpeta temporal, fuera del repositorio).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, LevelFormat, PageNumber, Footer, Header, TableOfContents, PageBreak,
} = require('docx');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.resolve(RAIZ, process.argv[2] || path.join('_docs', 'guion-demo.md'));
const SALIDA = ENTRADA.replace(/\.md$/, '.docx');

const VERDE = '1E7B34';
const AZUL = '1B2A4A';
const GRIS = '667085';
const ANCHO = 9638;   // A4 (11906) menos márgenes de 2 cm (1134 × 2), en DXA
const FUENTE = 'Calibri';

// ── Texto en línea: **negrita**, `código`, [enlace](url) → texto ──
function runs(texto, base = {}) {
  const out = [];
  const t = texto.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let i = 0; let m;
  while ((m = re.exec(t))) {
    if (m.index > i) out.push(new TextRun({ text: t.slice(i, m.index), ...base }));
    const s = m[0];
    if (s.startsWith('**')) out.push(new TextRun({ text: s.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: s.slice(1, -1), font: 'Consolas', size: (base.size || 22) - 2, ...base, ...(base.color ? {} : { color: AZUL }) }));
    i = m.index + s.length;
  }
  if (i < t.length) out.push(new TextRun({ text: t.slice(i), ...base }));
  return out;
}

// ── Tablas markdown ──
const celdas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
function tabla(filas) {
  const cab = celdas(filas[0]); const cuerpo = filas.slice(2).map(celdas);
  const n = cab.length;
  const borde = { style: BorderStyle.SINGLE, size: 4, color: 'C9CED8' };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  // Recuadro de un mensaje (una columna): cabecera azul clara y texto del cliente en cursiva
  if (n === 1) {
    const filasT = [
      new TableRow({ children: [new TableCell({ width: { size: ANCHO, type: WidthType.DXA }, borders: bordes, shading: { type: ShadingType.CLEAR, fill: 'DCE3F0', color: 'auto' }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: runs(cab[0], { bold: true, color: AZUL, size: 21 }) })] })] }),
      ...cuerpo.map((c) => {
        const esCita = /^«/.test(c[0]);
        return new TableRow({ children: [new TableCell({ width: { size: ANCHO, type: WidthType.DXA }, borders: bordes, shading: { type: ShadingType.CLEAR, fill: esCita ? 'F5F6F8' : 'FFFFFF', color: 'auto' }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: runs(c[0], { italics: esCita, size: 20 }) })] })] });
      }),
    ];
    return new Table({ width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO], rows: filasT });
  }
  // Tabla normal: anchos según el texto de cada columna (mínimo 8 %)
  const largo = cab.map((h, k) => Math.max(h.length, ...cuerpo.map((f) => (f[k] || '').length)));
  const peso = largo.map((l) => Math.max(Math.sqrt(l), 3));
  const suma = peso.reduce((a, b) => a + b, 0);
  let anchos = peso.map((p) => Math.max(Math.round((p / suma) * ANCHO), Math.round(ANCHO * 0.08)));
  const ajuste = ANCHO - anchos.reduce((a, b) => a + b, 0); anchos[anchos.indexOf(Math.max(...anchos))] += ajuste;
  const celda = (txt, k, cabecera) => new TableCell({
    width: { size: anchos[k], type: WidthType.DXA }, borders: bordes, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: cabecera ? { type: ShadingType.CLEAR, fill: 'DCE3F0', color: 'auto' } : undefined,
    children: [new Paragraph({ children: runs(txt || '', { size: 19, ...(cabecera ? { bold: true, color: AZUL } : {}) }) })],
  });
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: anchos,
    rows: [new TableRow({ tableHeader: true, children: cab.map((h, k) => celda(h, k, true)) }), ...cuerpo.map((f) => new TableRow({ children: cab.map((_, k) => celda(f[k], k, false)) }))],
  });
}

// ── Recorrido del markdown ──
const lineas = fs.readFileSync(ENTRADA, 'utf8').split('\n');
const hijos = [];
let lista = 0;           // instancia de lista numerada (cada lista reinicia en 1)
let enLista = false;
let primerH2 = true;
let titulo = '';
const espacio = () => new Paragraph({ spacing: { after: 0 }, children: [] });

for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  if (!/^\d+\.\s/.test(l)) enLista = false;
  if (!l.trim()) continue;

  // Título del documento, subtítulo e índice
  if (l.startsWith('# ')) {
    titulo = l.slice(2).trim();
    hijos.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: titulo })] }));
    continue;
  }
  if (l.startsWith('## ')) {
    if (primerH2) {
      primerH2 = false;
      hijos.push(new Paragraph({ children: [new PageBreak()] }));
      hijos.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Índice', bold: true, size: 32, color: AZUL })] }));   // sin estilo de título: no entra en el propio índice
      hijos.push(new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }));
    }
    hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: runs(l.slice(3).trim()) }));
    continue;
  }
  if (l.startsWith('### ')) { hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: runs(l.slice(4).trim()) })); continue; }
  if (/^---\s*$/.test(l)) { hijos.push(new Paragraph({ spacing: { before: 120, after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9CED8', space: 1 } }, children: [] })); continue; }

  // Texto para decir: bloque de cita → párrafos verdes con filete verde
  if (l.startsWith('>')) {
    const bloque = [];
    while (i < lineas.length && lineas[i].startsWith('>')) { bloque.push(lineas[i].replace(/^>\s?/, '')); i++; }
    i--;
    const filete = { left: { style: BorderStyle.SINGLE, size: 18, color: VERDE, space: 8 } };
    bloque.join('\n').split(/\n\s*\n/).forEach((par) => {
      const ls = par.split('\n').map((x) => x.trim()).filter(Boolean);
      if (!ls.length) return;
      if (ls.every((x) => x.startsWith('- '))) {   // viñetas para decir: en verde, sin filete
        // Un párrafo con filete izquierdo dentro de una lista (o con viñeta y tabulador) cuelga Word para Mac al abrir
        ls.forEach((x) => hijos.push(new Paragraph({ numbering: { reference: 'vinetas-verdes', level: 0 }, spacing: { after: 80, line: 300 }, children: runs(x.slice(2), { color: VERDE, size: 23 }) })));
        return;
      }
      hijos.push(new Paragraph({ indent: { left: 284 }, spacing: { before: 60, after: 120, line: 300 }, border: filete, children: runs(ls.join(' '), { color: VERDE, size: 23 }) }));
    });
    continue;
  }

  // Tablas
  if (l.trim().startsWith('|')) {
    const filas = [];
    while (i < lineas.length && lineas[i].trim().startsWith('|')) { filas.push(lineas[i]); i++; }
    i--;
    hijos.push(tabla(filas)); hijos.push(espacio());
    continue;
  }

  // Listas
  const vin = l.match(/^\s*-\s+(.*)$/);
  if (vin) { hijos.push(new Paragraph({ numbering: { reference: 'vinetas', level: l.startsWith('  ') ? 1 : 0 }, spacing: { after: 60 }, children: runs(vin[1]) })); continue; }
  const num = l.match(/^\d+\.\s+(.*)$/);
  if (num) {
    if (!enLista) { lista += 1; enLista = true; }
    hijos.push(new Paragraph({ numbering: { reference: 'numeros', level: 0, instance: lista }, spacing: { after: 60 }, children: runs(num[1]) }));
    continue;
  }

  // Etiquetas de bloque («**Clics**», «**Valor**»…): en azul y pegadas a lo que viene
  const etiqueta = l.match(/^\*\*([^*]+)\*\*\s*$/);
  if (etiqueta) { hijos.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: etiqueta[1], bold: true, color: AZUL, size: 22 })] })); continue; }

  // Párrafo normal (Pantalla, Frase clave, notas…)
  const frase = l.match(/^\*\*Frase clave:\*\*\s*(.+)$/);
  if (frase) { hijos.push(new Paragraph({ spacing: { before: 80, after: 120 }, children: [new TextRun({ text: 'Frase clave: ', bold: true }), ...runs(frase[1], { italics: true, bold: true, color: VERDE })] })); continue; }
  hijos.push(new Paragraph({ spacing: { after: 120 }, children: runs(l.trim()) }));
}

const doc = new Document({
  creator: 'Logicalis', title: titulo, description: titulo,
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FUENTE, size: 22 }, paragraph: { spacing: { line: 276 } } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 44, bold: true, color: AZUL, font: FUENTE }, paragraph: { spacing: { after: 240 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: AZUL, font: FUENTE }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: AZUL, font: FUENTE }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 2 } } } },
    ],
  },
  numbering: {
    config: [
      { reference: 'vinetas', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1134, hanging: 283 } } } },
      ] },
      { reference: 'vinetas-verdes', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } }, run: { color: VERDE } } }] },
      { reference: 'numeros', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: titulo, size: 16, color: GRIS })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Texto en verde: para decir en voz alta · página ', size: 16, color: GRIS }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRIS }), new TextRun({ text: ' de ', size: 16, color: GRIS }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRIS })] })] }) },
    children: hijos,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(SALIDA, buf); console.log(`${path.relative(RAIZ, SALIDA)} · ${hijos.length} bloques`); });
