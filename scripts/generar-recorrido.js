// Genera data/recorrido.js (pasos del Recorrido de la demo, modo presentador) a partir de _docs/guion-demo.md.
// Uso: `node scripts/generar-recorrido.js` o `make recorrido`, cada vez que cambie el guion.
// De cada paso del guion toma el título, el minuto, la pantalla, la frase clave, los clics y todo el texto para decir
// (párrafos en cita), que se trocea en subtítulos de una o dos frases con su tipo: introducción, para qué sirve,
// qué es y qué hace, o valor. La página y la acción que ejecuta «Ir» en cada paso están en MAPA.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const GUION = path.join(RAIZ, '_docs', 'guion-demo.md');
const SALIDA = path.join(RAIZ, 'data', 'recorrido.js');
const MAX_CHUNK = 230;   // caracteres por subtítulo (una o dos frases)
const MAX_TXT = 400;     // límite de shell.js por subtítulo

// Encabezado del guion → página y acción del paso (las acciones las registra cada página en Shell.Recorrido.init).
// «requiere: 'lote'»: el paso necesita el Paquete A procesado (si no, el panel avisa y ofrece ir al paso 4).
// «momentos»: lo que se ve en cada subpaso. Cada uno es [frase, acciones]: se engancha al primer subtítulo del paso
// que contiene la frase, que tiene que ser única en el paso (así sobrevive a cambios de redacción y de troceo) y ejecuta sus acciones en orden al llegar
// a él, por tiempo o con los botones de subtítulo. Acciones comunes (shell.js): ver:SELECTOR[~texto] (scroll y
// resaltado), clic:SELECTOR[~texto], cerrar (ventanas), arriba, espera:ms. El resto son acciones de cada página.
// Las acciones que cambian el estado de la demo (kill switch, guardrails, medidas, alteración, replay, comparativa)
// son idempotentes («deja X en tal estado»), así que repetirlas al volver atrás no duplica nada.
const MAPA = [
  // Introducción: las cuatro secciones de intro.html (la acción «sec:X» enseña la sección X)
  ['## 1. El problema', { pagina: 'intro', accion: 'sec:problema', titulo: 'El problema: FNOL y el gobierno de la IA', min: '0–1', momentos: [
    ['Antes de empezar', 'arriba | ver:#cifras-fnol'], ['cinco canales a la vez', 'ver:#canales'], ['se decide buena parte', 'ver:#decide'], ['Hoy todo ese trabajo', 'ver:#hoy'],
    ['un segundo problema', 'ver:#sec-problema .hero-puntos'], ['Gartner', 'ver:#porque'],
  ] }],
  ['## 2. La solución', { pagina: 'intro', accion: 'sec:solucion', titulo: 'La solución: plataforma integrada y gobernada', min: '1–3', momentos: [
    ['Antes de entrar en el detalle', 'arriba | ver:#logicalis'], ['Y así se ve el panel de gobierno', 'ver:#kpis-resumen'], ['cuatro especialistas', 'ver:#agentes'],
    ['La base de todo es la trazabilidad', 'ver:#base'],
    ['nivel de autonomía, que va de L0', 'ver:.pilar~Autonomía'], ['El gasto lo controlamos', 'ver:.pilar~Gasto'], ['Para el fraude', 'ver:.pilar~Fraude'],
    ['El RGPD, DORA', 'ver:.pilar~Cumplimiento'],
  ] }],
  ['## 3. Los actores', { pagina: 'intro', accion: 'sec:actores', titulo: 'Los actores: el tramitador y quien gobierna la IA', min: '3–4', momentos: [
    ['dos tipos de usuario', 'arriba | ver:#usuarios .usuario-card~El tramitador'], ['los equipos que gobiernan la IA', 'ver:#usuarios .usuario-card~IT, Finanzas'],
  ] }],
  ['## 4. La demo', { pagina: 'intro', accion: 'sec:demo', titulo: 'La demo: un viaje de principio a fin', min: '4–5', momentos: [
    ['La demo es un viaje', 'arriba | ver:#viaje'], ['termina en el panel de gobierno', 'ver:#preguntas-panel'], ['Vamos a verlo', 'ver:#empezar-demo'],
  ] }],
  ['### Paso 1 ', { pagina: 'triaje', accion: 'fases', momentos: [
    ['Aquí veis las seis fases', 'fase:multicanal'], ['Las cuatro primeras', 'fase:reglas'], ['Las dos últimas', 'fase:registro'],
    ['Para la aseguradora', 'fase:cerrar | paquete | ver:#paquete-lista li~MSG-A-11 | ver:#paquete-lista li~MSG-A-08'], ['Para el tramitador', 'fase:automatizacion'],
  ] }],
  ['### Paso 2 ', { pagina: 'triaje', accion: 'procesar', momentos: [
    ['Los contadores', 'ver:.counters'], ['cada aviso deja su traza', 'ver:#log-table'],
    ['dedique su tiempo', 'ver:#log-body tr[data-id=MSG-A-04] | ver:#log-body tr[data-id=MSG-A-08] | ver:#log-body tr[data-id=MSG-A-13]'],
  ] }],
  ['### Paso 3 ', { pagina: 'triaje', accion: 'ficha:MSG-A-01:mensaje', requiere: 'lote', momentos: [
    ['Esta es la ficha de una decisión', 'clic:#modal-tabs [data-tab=mensaje]'], ['el botón Override', 'ver:#modal-kpis [data-rev=override]'], ['tres adjuntos', 'clic:#modal-tabs [data-tab=adjuntos] | clic:#adj-lista [data-adj="0"]'],
    ['Las fotos muestran', 'clic:#adj-lista [data-adj="1"]'], ['En las siguientes pestañas', 'clic:#modal-tabs [data-tab=datos]'],
    ['Los avisos sencillos', 'clic:#modal-tabs [data-tab=reglas]'], ['El tramitador no tiene que fiarse', 'clic:#modal-tabs [data-tab=razonamiento]'],
  ] }],
  ['### Paso 4 ', { pagina: 'triaje', accion: 'ficha:MSG-A-08:mensaje', requiere: 'lote', momentos: [
    ['qué regla ha incumplido', 'clic:#modal-tabs [data-tab=reglas]'], ['Si un dato no aparece', 'clic:#modal-tabs [data-tab=datos]'],
    ['lo que ha recibido el modelo', 'clic:#modal-tabs [data-tab=json] | clic:[data-raw=enviado]'],
    ['El tramitador entiende el motivo', 'clic:#modal-tabs [data-tab=mensaje] | ver:#modal-kpis [data-rev=validar]'], ['el modelo decide sin saber', 'clic:#modal-tabs [data-tab=json] | clic:[data-raw=enviado]'],
  ] }],
  ['### Paso 5 ', { pagina: 'triaje', accion: 'ficha:MSG-A-12:json', requiere: 'lote', momentos: [
    ['En la respuesta cruda vemos', 'clic:[data-raw=gobierno]'], ['qué datos personales hay', 'ver:#modal-raw .g-key.g-pii'], ['por qué no es de los otros dos', 'ver:#modal-raw .g-key.g-expl'],
    ['sello SHA-256', 'ver:#modal-raw .g-key.g-traz | ver:#modal-raw .g-key.g-ret'], ['Los datos de salud y los de menores', 'ver:#modal-raw .g-key.g-pii'],
    ['la cadena de hashes se rompe', 'ver:#modal-raw .g-key.g-traz'],
  ] }],
  ['### 6.0 ', { pagina: 'gobierno', accion: 'goto:inicio', titulo: 'Entrada al panel de gobierno', requiere: 'lote', momentos: [
    ['Está organizado en trece secciones', 'ver:#inicio-grupos'], ['Cada ficha de esta portada', 'ver:#inicio-hero'],
  ] }],
  ['### Paso 6 ', { pagina: 'gobierno', accion: 'goto:resumen', requiere: 'lote', momentos: [
    ['El Resumen nos ofrece', 'ver:#kpis'], ['Al abrir el indicador de alertas', 'kpi:res-alertas'], ['cada agente tiene su tarjeta', 'cerrar | ver:#agents'],
    ['Ahora mismo tenemos un 81', 'ver:#kpis'], ['lo paramos al momento', 'ver:#agents | agente:extraccion:pausado | espera:3500 | agente:extraccion:activo'],
  ] }],
  ['### Paso 7 ', { pagina: 'gobierno', accion: 'agentes', requiere: 'lote', momentos: [
    ['La sección de Agentes', 'ver:#ag-tabs'], ['identidad propia', 'ver:#ag-ficha h3~Identidad'], ['En la ficha vemos su configuración', 'ver:#ag-ficha h3~Configuración'],
    ['índice de calidad', 'ver:#ag-ficha h3~Calidad'], ['decidimos con números', 'ver:#ag-ficha h3~Rendimiento'],
  ] }],
  ['### Paso 8 ', { pagina: 'gobierno', accion: 'goto:trazas', requiere: 'lote', momentos: [
    ['Cada mensaje genera una traza', 'sel:MSG-A-08 | ver:#traza-detalle'], ['como un error del proveedor', 'sel:MSG-A-10 | ver:#traza-detalle'], ['la lista se puede filtrar', 'ver:#t-res'],
    ['Ante una reclamación, la decisión', 'sel:MSG-A-08 | traza:MSG-A-08'], ['los fallos del proveedor', 'cerrar | sel:MSG-A-10 | ver:#traza-detalle'],
  ] }],
  ['### Paso 9 ', { pagina: 'gobierno', accion: 'goto:autonomia', requiere: 'lote', momentos: [
    ['nos muestra en qué nivel', 'ver:#levels'], ['Cada subida o bajada', 'ver:#cambios'], ['tasa de correcciones', 'cambio:4,1'],
  ] }],
  ['### Paso 10 ', { pagina: 'gobierno', accion: 'goto:guardrails', requiere: 'lote', momentos: [
    ['reúne las condiciones', 'ver:#kpis-gr'], ['Un guardrail es una condición', 'ver:#policies'], ['Cada guardrail tiene su ficha', 'gr:G-04'], ['El guardrail de importe', 'gr:G-02'],
    ['cualquier guardrail que se activa', 'cerrar | ver:#policies tr[data-gr=G-09] | guardrail:G-09:on | espera:3500 | guardrail:G-09:off'],
  ] }],
  ['### Paso 11 ', { pagina: 'gobierno', accion: 'goto:hitl', requiere: 'lote', momentos: [
    ['nos enseña la cola', 'ver:#kpis-hitl'], ['Cada traza que se escala', 'ver:#hitl-cola | traza:MSG-A-04'], ['El panel también mide', 'cerrar | ver:#hitl-calidad'],
    ['aún no tienen la formación', 'med:M-10'], ['cada override alimenta', 'cerrar | ver:#hitl-overrides'],
  ] }],
  ['### Paso 12 ', { pagina: 'gobierno', accion: 'goto:fraude', requiere: 'lote', momentos: [
    ['puntúa cada mensaje', 'ver:#fr-niveles'], ['combina tres fuentes', 'fr:MSG-A-13'], ['cada mensaje recibe una puntuación', 'cerrar | ver:#fr-lote'],
    ['El histórico también puede restar', 'fr:MSG-A-04'], ['Ningún siniestro se rechaza', 'cerrar | ver:#fr-mapa | ver:#fr-siu'], ['2.080', 'ver:#kpis-fr'],
  ] }],
  ['### Paso 13 ', { pagina: 'gobierno', accion: 'goto:replay', requiere: 'lote', momentos: [
    ['nos enseña cómo ha llegado', 'ver:#r-lista'], ['El razonamiento se muestra', 'sel:MSG-A-08 | ver:#steps'], ['El replay repite una traza', 'sel:MSG-A-04 | ver:#card-replay'],
    ['En modo what-if', 'replay:whatif:gpt-5-mini'], ['pasar el agente de Reglas a gpt-5-mini', 'ver:#replays'],
  ] }],
  ['### Paso 14 ', { pagina: 'gobierno', accion: 'kb:KB-02:salud', requiere: 'lote', momentos: [
    ['medir la salud', 'cerrar | ver:#kpis-kb | kb:KB-02:salud'], ['La ficha nos enseña su configuración', 'kb:KB-02:config'], ['se colaron 340', 'kb:KB-02:fuente'],
    ['el cambio se mide antes', 'kb:KB-02:comparativa | kb-aplicar:KB-02'],
  ] }],
  ['### Paso 15 ', { pagina: 'gobierno', accion: 'goto:cumplimiento', requiere: 'lote', momentos: [
    ['termómetro normativo', 'ver:#cmp-hero'], ['Los controles se agrupan', 'ver:#cmp-termos'], ['Una matriz nos dice', 'ver:#cmp-matriz'], ['inventario de datos personales', 'cmp:MSG-A-12'],
    ['La cobertura nos dice', 'cerrar | ver:#cmp-matriz'], ['Un registro manipulado', 'ver:#cmp-cadena | alteracion:on | espera:4000 | alteracion:off'],
  ] }],
  ['### Paso 16 ', { pagina: 'gobierno', accion: 'goto:finops', requiere: 'lote', momentos: [
    ['controlar el gasto al segundo', 'ver:#kpis-fin'], ['Cada decisión suma su coste', 'ver:#fin-agentes'], ['Cuando se supera uno', 'ver:#correctivas'],
    ['El gasto se desglosa', 'ver:#fin-porque | espera:4000 | ver:#modelos'], ['No esperamos 8 horas', 'ver:#caps'], ['El gasto del mes va por', 'kpi:coste-mensual'],
    ['sabemos exactamente dónde actuar', 'cerrar | ver:#fin-agentes'],
  ] }],
  ['### Paso 17 ', { pagina: 'gobierno', accion: 'goto:medidas', requiere: 'lote', momentos: [
    ['junta en una sola lista', 'medida:M-01:abierta | medida:M-02:abierta | ver:#kpis-med'], ['La lista cubre coste', 'ver:#med-lista'], ['Cada problema viene de otra sección', 'med:M-01'],
    ['Cada ahorro se apoya en evidencia', 'cerrar | medida:M-01:aplicada | ver:#kpis-med'], ['Lo que necesita aprobación', 'medida:M-02:pendiente | ver:#med-lista'],
  ] }],
  ['### Paso 18 ', { pagina: 'gobierno', accion: 'goto:historico', requiere: 'lote', momentos: [
    ['El Histórico es la línea', 'ver:#timeline'], ['Se puede filtrar', 'ver:#hist-chips'], ['Un auditor puede ver', 'ver:#timeline'],
  ] }],
  ['## 7. Cierre', { pagina: 'gobierno', accion: 'goto:historico', titulo: 'Cierre', min: '34–35', requiere: 'lote', momentos: [['Hemos visto entrar', 'arriba']] }],
];
const TIPO_DE = { 'Para qué sirve esta sección': 'para', 'Qué es y qué hace': 'que', Valor: 'valor' };

const limpio = (t) => t.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();

// La pantalla del paso con nombres de página en lugar de ficheros (`index.html` → Triaje)
const PAGINAS = { 'intro.html': 'Introducción', 'index.html': 'Triaje', 'gobierno.html': 'Panel de gobierno' };
const pantallaLegible = (t) => limpio(t.replace(/`([\w-]+\.html)`/g, (m, f) => PAGINAS[f] || f)).replace(/\.$/, '');

// Trocea un párrafo en subtítulos de una o dos frases (sin cortar frases salvo que una sola pase del límite)
function trocear(parrafo) {
  const frases = parrafo.split(/(?<=[.!?…])\s+(?=[«¿¡"A-ZÁÉÍÓÚÑ0-9])/u);
  const out = []; let cur = '';
  frases.forEach((f) => {
    if (cur && (cur.length + 1 + f.length) > MAX_CHUNK) { out.push(cur); cur = f; } else cur = cur ? `${cur} ${f}` : f;
  });
  if (cur) out.push(cur);
  return out.flatMap((c) => {
    if (c.length <= MAX_TXT) return [c];
    const partes = []; let resto = c;
    while (resto.length > MAX_TXT) { const corte = resto.lastIndexOf(', ', MAX_TXT); const i = corte > 100 ? corte + 1 : MAX_TXT; partes.push(resto.slice(0, i).trim()); resto = resto.slice(i).trim(); }
    if (resto) partes.push(resto);
    return partes;
  });
}

const lineas = fs.readFileSync(GUION, 'utf8').split('\n');
const esInicio = (l) => MAPA.find(([pre]) => l.startsWith(pre));
const pasos = [];
let paso = null; let etiqueta = null; let enClics = false;
for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  const m = esInicio(l);
  if (m) {
    const [, cfg] = m;
    const tit = l.replace(/^#+\s*/, '').replace(/^Paso \d+ · /, '').replace(/^6\.0 /, '').replace(/^\d+\.\s*/, '');
    const min = (tit.match(/\((?:min )?([^)]*)\)\s*$/) || [])[1] || '';
    paso = { min: cfg.min || min.replace('-', '–').replace(/^≈/, ''), pagina: cfg.pagina, titulo: cfg.titulo || tit.replace(/\s*\([^)]*\)\s*$/, ''), accion: cfg.accion, ...(cfg.requiere ? { requiere: cfg.requiere } : {}), que: '', frase: '', clics: [], subtitulos: [], _momentos: cfg.momentos || [] };
    pasos.push(paso); etiqueta = null; enClics = false; continue;
  }
  if (!paso) continue;
  // Fin del paso: otro encabezado de nivel 2 que no es un paso (Parte 2, anexos…) o la línea horizontal antes de un anexo
  if (/^## /.test(l)) { paso = null; continue; }
  if (/^### /.test(l)) {
    if (!paso.pagina.startsWith('intro')) { paso = null; continue; }
    etiqueta = l.replace(/^###\s*[\d.]+\s*/, '').trim(); continue;   // apartados de la introducción (2.1, 2.2…) como etiqueta
  }
  const pantalla = l.match(/^\*\*Pantalla:\*\*\s*(.+)$/); if (pantalla && !paso.que) { paso.que = pantallaLegible(pantalla[1]); continue; }
  const frase = l.match(/^\*\*Frase clave:\*\*\s*«(.+)»\s*$/); if (frase) { paso.frase = limpio(frase[1]); continue; }
  if (/^\*\*Clics\*\*\s*$/.test(l)) { enClics = true; etiqueta = null; continue; }
  if (enClics) {
    const c = l.match(/^\d+\.\s+(.+)$/); if (c) { paso.clics.push(limpio(c[1])); continue; }
    if (l.trim() && !/^\d+\./.test(l)) enClics = false;
  }
  const bold = l.match(/^\*\*([^*]+)\*\*\s*$/); if (bold) { etiqueta = bold[1].trim(); continue; }
  if (l.startsWith('>')) {
    const bloque = [];
    while (i < lineas.length && lineas[i].startsWith('>')) { bloque.push(lineas[i].replace(/^>\s?/, '')); i++; }
    i--;
    const tipo = TIPO_DE[etiqueta] || 'intro';
    const extra = tipo === 'intro' && etiqueta && !/^(Clics|Notas|Norma|Pantalla)/.test(etiqueta) ? etiqueta.replace(/:.*/, '') : '';
    bloque.join('\n').split(/\n\s*\n/).map(limpio).filter(Boolean).forEach((par) => {
      trocear(par).forEach((texto) => paso.subtitulos.push({ tipo, ...(extra ? { etiqueta: extra } : {}), texto }));
    });
    etiqueta = null;
  }
}

// Acciones de cada subpaso: cada momento va al primer subtítulo que contiene su frase (sin distinguir mayúsculas)
const sinTildes = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
pasos.forEach((p, n) => {
  p._momentos.forEach(([frase, acc]) => {
    const hay = p.subtitulos.filter((x) => sinTildes(x.texto).includes(sinTildes(frase)));
    if (hay.length !== 1) { console.error(`Paso ${n + 1} (${p.titulo}): ${hay.length ? `${hay.length} subtítulos contienen` : 'ningún subtítulo contiene'} «${frase}»; el ancla tiene que ser única`); process.exit(1); }
    const u = hay[0];
    u.accion = [...(u.accion || []), ...acc.split('|').map((x) => x.trim()).filter(Boolean)];
  });
  delete p._momentos;
});

const faltan = MAPA.filter(([pre]) => !lineas.some((l) => l.startsWith(pre))).map(([pre]) => pre);
if (faltan.length) { console.error(`No encuentro en el guion: ${faltan.join(', ')}`); process.exit(1); }
pasos.forEach((p, n) => { if (!p.frase || !p.subtitulos.length) { console.error(`Paso ${n + 1} (${p.titulo}) sin frase clave o sin texto para decir`); process.exit(1); } });

const js = `// Pasos del Recorrido de la demo (modo presentador, shell.js). GENERADO desde _docs/guion-demo.md con
// \`node scripts/generar-recorrido.js\` (o \`make recorrido\`): no editar a mano, cambiar el guion y regenerar.
// Cada paso: minuto, página, título, pantalla («que»), frase clave, acción de «Ir», clics y subtítulos con su tipo
// (intro · para: para qué sirve · que: qué es y qué hace · valor). Cada presentador puede editarlos en el engranaje
// del recorrido (se guardan solo en su navegador) y elegir qué tipos de subtítulo se muestran.
const RECORRIDO_DEMO = ${JSON.stringify({ pasos }, null, 2)};
`;
fs.writeFileSync(SALIDA, js);
console.log(`${pasos.length} pasos y ${pasos.reduce((a, p) => a + p.subtitulos.length, 0)} subtítulos → ${path.relative(RAIZ, SALIDA)}`);
