"""Construye slides-sesion-v4.pptx a partir de slides-sesion-v3.pptx (que no se toca):

- Slide 11: los cuatro agentes rotulados como «Lo que se gobierna» y, debajo, la capa de gobierno con las once
  secciones del panel en los cinco bloques del menú.
- Slide 12: título nuevo («Cada agente, inventariado…»): es el inventario de agentes, no una pieza de la capa.
- Slides 14-25: una por sección de gobierno (Agentes no, ver plan) y una de seudonimización, todas con el mismo
  diseño: qué hace, qué gana el negocio, normas, dónde se ve en la demo y la captura de la sección.
- Slide 27 («Vamos a verlo»): lo que se verá del gobierno, con las secciones nuevas.

Plan y decisiones: plan-slides-sesion-pilares.md. Iconos: los SVG de Lucide de icons.js, con el color de la
plantilla, igual que en la v3. Capturas: img/observabilidad/ (se regeneran con `make capturas`).

Uso (desde la raíz del repo):
    python3 _docs/build_slides_sesion_v4.py
"""
import copy
import json
import os
import subprocess

from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.opc.package import Part
from pptx.opc.packuri import PackURI
from pptx.util import Emu, Inches, Pt

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, '_docs')
IMG = os.path.join(DOCS, 'img', 'observabilidad')
ORIGEN = os.path.join(DOCS, 'slides-sesion-v3.pptx')
DESTINO = os.path.join(DOCS, 'slides-sesion-v4.pptx')

AZUL, MARINO, GRIS, GRIS_CLARO = RGBColor(0x19, 0x4B, 0xFF), RGBColor(0x0B, 0x1F, 0x5B), RGBColor(0x59, 0x59, 0x59), RGBColor(0x7F, 0x7F, 0x7F)
FONDO, CELESTE, BLANCO, BORDE = RGBColor(0xF4, 0xF6, 0xFB), RGBColor(0xE8, 0xEE, 0xFF), RGBColor(0xFF, 0xFF, 0xFF), RGBColor(0xBF, 0xBF, 0xBF)
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'asvg': 'http://schemas.microsoft.com/office/drawing/2016/SVG/main'}

# ── Contenido de las slides por sección (cifras del dataset de la demo, data/gobierno.js) ──
SECCIONES = [
    dict(bloque='Operación', icono='layout-dashboard', titulo='Resumen: el estado del sistema en diez segundos',
         hace='Ocho indicadores en vivo: autonomía efectiva, escalados, overrides, coste frente al presupuesto, alertas, cumplimiento y conocimiento. Una tarjeta por agente con su modelo, su coste del día y un interruptor de pausa. Las alertas de coste, conocimiento y cumplimiento, cada una enlazada a su origen.',
         negocio='Dirección sabe de un vistazo si el sistema va bien: el 81 % de las decisiones sale sin intervención humana y las personas corrigen el 2,1 %. Un agente se para desde aquí y sus mensajes esperan en cola: no se pierde ninguno.',
         normas='AI Act art. 14 · EIOPA', demo='Gobierno › Resumen', captura='01-resumen.png',
         notas='Es la pantalla de dirección. En la fila de arriba, los indicadores: el 81 % de las decisiones sale sola y las personas corrigen el 2,1 %, por debajo del objetivo del 3 %. Debajo, cada agente con su coste del día y su interruptor de pausa. A remarcar: se puede parar un agente sin perder ningún mensaje.'),
    dict(bloque='Operación', icono='route', titulo='Trazabilidad: qué pasó con cada mensaje',
         hace='Una traza por mensaje con la cascada de agentes: modelo, tokens, latencia y coste de cada paso. Registra el guardrail que saltó y la corrección humana, con quién, cuándo y por qué. Lista filtrable por agente, canal, decisión y resultado, exportable en JSON.',
         negocio='Con un identificador se contesta al auditor o al reclamante: qué pasó, quién decidió y cuánto costó. En MSG-A-04 una persona corrigió al agente porque le faltaba un dato del sistema de pólizas, y la traza lo deja escrito.',
         normas='AI Act art. 12 · RGPD art. 5.2 y 30 · DORA art. 28', demo='Gobierno › Trazabilidad', captura='03-trazabilidad.png',
         notas='La auditoría mensaje a mensaje. A la izquierda, cuánto tardó cada agente, con qué modelo y cuántos tokens. A la derecha, la corrección humana: el agente no veía los conductores declarados de la póliza. A remarcar: con un solo identificador se responde qué pasó, quién decidió y cuánto costó.'),
    dict(bloque='Control', icono='sliders-horizontal', titulo='Autonomía: cuánto decide cada agente solo',
         hace='Cuatro niveles por agente, de L0 Manual (solo sugiere) a L3 Autónomo (decide y ejecuta). Cada cambio de nivel queda auditado con su motivo, quién lo aprobó, la configuración del agente en ese momento y si es reversible.',
         negocio='La autonomía se gana y se pierde con datos. El agente de Reglas bajó de L3 a L2 cuando su tasa de override llegó al 4,1 %, por encima del objetivo del 3 %.',
         normas='AI Act art. 14 · RGPD art. 22', demo='Gobierno › Autonomía', captura='c24-autonomia.png',
         notas='Arriba, el registro de la última bajada de nivel del agente de Reglas: el motivo, quién la aprobó y que es reversible. Abajo, la evolución de su nivel, con subidas en verde y bajadas en rojo. A remarcar: la autonomía es un resultado medido, nunca una decisión implícita.'),
    dict(bloque='Control', icono='shield-check', titulo='Guardrails: los límites que frenan al agente',
         hace='Nueve condiciones: confianza baja, importe por encima del límite del ramo, ramos que no coinciden, lesionados, datos esenciales que faltan, coste y formato. Cada una escala a una persona, cambia a un modelo más barato o marca la traza. Antes de activar uno nuevo se ve cuántas veces habría saltado.',
         negocio='Las reglas de la aseguradora mandan sobre el modelo. El guardrail de importe (G-02) saltó 118 veces en 14 días y explica el 62 % de los escalados.',
         normas='AI Act art. 9 y 14', demo='Gobierno › Guardrails', captura='15-guardrail-g02.png',
         notas='La ficha del guardrail de importe: 118 disparos en dos semanas, unas ocho al día, y en qué canal y ramo saltan. Los de importe y lesionados explican la mayoría de los escalados, y es lo esperado: son decisiones que no queremos que tome una máquina.'),
    dict(bloque='Control', icono='user-check', titulo='Intervención humana: una supervisión demostrable',
         hace='Cola de revisión con el motivo, el estado y el revisor de cada caso escalado. Mide cuánto tarda cada tramitador y cuántas aprobaciones se firman en menos de 30 segundos. Lleva la formación en IA de cada tramitador.',
         negocio='3.180 escalados en 14 días, revisados en una mediana de 14 minutos. El 3,3 % se aprueba en menos de 30 segundos y tres tramitadores pasan del máximo del 5 %: dos de ellos aún no tienen la formación en IA.',
         normas='RGPD art. 22 (SCHUFA) · AI Act art. 14 y 4', demo='Gobierno › Intervención humana', captura='45-hitl-calidad.png',
         notas='Volvemos a la sentencia SCHUFA de la slide 8: firmar sin revisar no cuenta como intervención humana. Aquí se mide. En la demo, la cola con cada caso escalado; en la captura, cuánto tarda cada tramitador: tres pasan del 5 % de aprobaciones exprés, y dos de ellos son los nuevos, sin la formación en IA.'),
    dict(bloque='Calidad', icono='brain', titulo='Razonamiento y replay: el porqué y el «¿y si…?»',
         hace='El razonamiento registrado de cada agente: qué recibió, qué pasos siguió y qué devolvió. El replay repite cualquier traza con los mismos prompts y modelos, o con otro modelo o versión de prompt, y compara decisión, coste y latencia.',
         negocio='Un cambio de modelo se decide con datos. Con gpt-5-mini en Reglas la decisión fue la misma y el coste bajó un 82 % (RP-0006). Con gpt-5-nano un Aprobado pasó a A revisar (RP-0005), y se vio antes de desplegar.',
         normas='RGPD art. 15 · AI Act art. 15', demo='Gobierno › Razonamiento y replay', captura='c21-replay.png',
         notas='Arriba, el razonamiento de cada agente tal como quedó registrado: es el registro estructurado que devuelve el agente, no su pensamiento interno. Abajo, el replay con un modelo más pequeño: misma decisión y un 82 % menos de coste. A remarcar: un cambio de modelo, que suele dar miedo, pasa a ser una decisión con datos.'),
    dict(bloque='Calidad', icono='book-open', titulo='Knowledge Bases: el conocimiento con el que deciden',
         hace='Inventario de las nueve bases que consultan los agentes: índices RAG, Markdown, runbooks, tablas y plantillas. Salud medida contra umbrales (recall, fidelidad, frescura, duplicados, datos personales), comparativa de configuraciones y rúbricas versionadas que deciden si un reindexado se publica.',
         negocio='El conocimiento envejece y se vigila como los agentes. 340 condicionados de 2024 bajaron el recall de Condicionados Auto a 0,81; con un filtro de vigencia vuelve a 0,88.',
         normas='AI Act art. 10 · RGPD art. 17', demo='Gobierno › Knowledge Bases', captura='32-kb-comparativa.png',
         notas='Un agente puede estar bien y equivocarse porque consulta conocimiento degradado. En el ejemplo, alguien sincronizó condicionados de 2024 y el recall cayó. La comparativa prueba varias configuraciones sobre el mismo corpus y la recomendada lo arregla. A remarcar: cada traza dice qué versión de cada base usó.'),
    dict(bloque='Cumplimiento y coste', icono='thermometer', titulo='Cumplimiento: la prueba en cada decisión',
         hace='Cada decisión lleva un bloque _gobernanza que calcula la plataforma: datos personales detectados, por qué este ramo y no otro, sello SHA-256 encadenado y plazo de retención. El termómetro agrega esos bloques por marco (AI Act, RGPD, DORA, EIOPA) y separa los controles medidos en las trazas de los declarados.',
         negocio='El DPO tiene la evidencia recalculada con cada traza: 89 % de cobertura, con los controles en ámbar a la vista (EIPD pendiente, aviso de IA en WhatsApp). Si alguien altera un registro, la cadena de hashes se rompe y se ve.',
         normas='RGPD art. 5.1.c, 9 y 22 · AI Act art. 12 · DORA · EIOPA', demo='Gobierno › Cumplimiento', captura='34-termometro.png',
         notas='El modelo no se autocertifica: el bloque de gobierno lo calcula la plataforma en cada decisión. El termómetro lo agrega por marco. Hay controles en ámbar y eso da credibilidad: un 100 % no se lo cree nadie. A remarcar: es la evidencia que necesita el DPO, no un certificado.'),
    dict(bloque='Cumplimiento y coste', icono='eye-off', titulo='Seudonimizar antes de llamar al modelo',
         hace='Antes de llamar al modelo, nombres, DNI, teléfonos, IBAN, pólizas, matrículas y direcciones se cambian por marcadores como [PERSONA_1] o [POLIZA_AU_1]. Los datos de salud y la edad de los menores se mantienen porque hacen falta para decidir. La tabla de correspondencias solo vive en memoria durante la llamada.',
         negocio='En MSG-A-08 llegan al modelo 8 marcadores en lugar de los datos reales, y el tramitador ve la ficha de siempre. La traza guarda qué tipos se sustituyeron y el hash del texto enviado, y el control de minimización pasa a verde.',
         normas='RGPD art. 5.1.c, 9, 25 y 32', demo='Triaje › Respuesta cruda › Enviado al modelo', captura='43-enviado-al-modelo.png',
         notas='Es la respuesta al RGPD art. 9 de la slide 8. El modelo no necesita el nombre ni el DNI del asegurado para decidir, así que no los recibe. La fractura y la diabetes sí viajan, porque hacen falta para decidir. Al volver la respuesta, la plataforma pone los valores reales y el tramitador ve la ficha de siempre.'),
    dict(bloque='Cumplimiento y coste', icono='coins', titulo='FinOps: el coste de cada decisión, bajo control',
         hace='Límites de gasto a cinco niveles: global, por agente, por traza, por tokens de razonamiento y por llamadas por minuto. Avisan al 80 % y actúan al 100 %. Cada alerta llega con la acción sugerida y su ahorro, y una comparativa de modelos dice cuál conviene a cada agente.',
         negocio='El agente de Reglas se lleva el 79 % del gasto. Al superar su límite diario (114 %) pasó solo a un modelo más barato, sin parar el proceso. El mes cerrará en 428 € de un presupuesto de 500 €.',
         normas='Solvencia II art. 41', demo='Gobierno › FinOps', captura='c29-acciones.png',
         notas='Arriba, las alertas de coste: qué pasó, qué límite saltó, qué hizo el sistema solo y qué acción sugiere, con su ahorro. Abajo, las acciones para el límite del agente de Reglas: unas se simulan con replay antes de aplicarlas y las de presupuesto las aprueba el comité. A remarcar: sabemos lo que cuesta cada decisión.'),
    dict(bloque='Mejora y auditoría', icono='wrench', titulo='Medidas correctivas: cada problema con su dueño',
         hace='Una lista de trabajo con los problemas que detecta el resto del panel: coste, conocimiento, cumplimiento, calidad y resiliencia. Cada uno trae alternativas con su impacto, su efecto secundario, su esfuerzo, quién la aprueba y cómo se valida, ordenadas por severidad × impacto ÷ esfuerzo.',
         negocio='Aplicar M-01 (gpt-5-mini en los casos sencillos) ahorra 237 € al mes. Verificar una medida de cumplimiento pone su control en verde en el termómetro.',
         normas='AI Act art. 9 · EIOPA', demo='Gobierno › Medidas correctivas', captura='37-medidas.png',
         notas='Ver los problemas no basta: hay que cerrarlos. Esta sección junta en una lista todo lo que el resto del panel detecta, con varias alternativas por problema. Arriba quedan las victorias rápidas. A remarcar: el gobierno se cierra cuando cada problema tiene dueño, alternativa y verificación.'),
    dict(bloque='Mejora y auditoría', icono='history', titulo='Histórico: el libro de registro',
         hace='Una línea de tiempo con alertas, cambios de políticas y de nivel, replays, overrides, despliegues, incidentes y operaciones. Cada evento lleva fecha, agente, motivo y responsable, también lo que se hace en directo, como pausar un agente o apagar un guardrail.',
         negocio='Cuando llega un auditor, la evidencia ya está: qué cambió, cuándo, por qué y quién lo aprobó. Se rellena sola, sin trabajo extra del equipo.',
         normas='AI Act art. 12 · EIOPA', demo='Gobierno › Histórico', captura='11-historico.png',
         notas='Todo lo anterior deja rastro aquí, con fecha, agente, motivo y responsable. En la demo, lo que toquemos en directo aparecerá como «Operador (esta sesión)». A remarcar: es el libro de registro que pide el regulador y se rellena solo.'),
]

# Slide 11: la capa de gobierno en los cinco bloques del menú
BLOQUES = [
    ('Operación', [('layout-dashboard', 'Resumen'), ('route', 'Trazabilidad')]),
    ('Control', [('sliders-horizontal', 'Autonomía'), ('shield-check', 'Guardrails'), ('user-check', 'Intervención humana')]),
    ('Calidad', [('brain', 'Razonamiento y replay'), ('book-open', 'Knowledge Bases')]),
    ('Cumplimiento y coste', [('thermometer', 'Cumplimiento'), ('coins', 'FinOps')]),
    ('Mejora y auditoría', [('wrench', 'Medidas correctivas'), ('history', 'Histórico')]),
]


def lucide():
    """Contenido SVG de cada icono de icons.js (el mismo juego de iconos que el panel)."""
    out = subprocess.run(['node', '-e', f"const fs=require('fs');eval(fs.readFileSync({json.dumps(os.path.join(RAIZ, 'icons.js'))},'utf8').split('function lucide(')[0].replace(/^const LUCIDE/m,'globalThis.LUCIDE'));process.stdout.write(JSON.stringify(LUCIDE))"],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


ICONOS = {}


def svg_part(prs, nombre, color, extra=None):
    clave = (nombre, color)
    if clave not in ICONOS:
        cuerpo = extra if extra is not None else LUC[nombre]
        svg = (f'<!-- @license lucide-static - ISC -->\n<svg class="lucide lucide-{nombre}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
               f'fill="none" stroke="#{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{cuerpo}</svg>').encode()
        n = len([p for p in prs.part.package.iter_parts() if str(p.partname).startswith('/ppt/media/')]) + 1
        while True:
            uri = PackURI(f'/ppt/media/icono-{n}.svg')
            if not any(p.partname == uri for p in prs.part.package.iter_parts()): break
            n += 1
        ICONOS[clave] = Part(uri, 'image/svg+xml', prs.part.package, svg)
    return ICONOS[clave]


def icono(prs, slide, nombre, x, y, lado, color='194BFF', extra=None):
    """Imagen SVG editable, como los iconos de la v3 (p:pic con svgBlip)."""
    rid = slide.part.relate_to(svg_part(prs, nombre, color, extra), RT.IMAGE)
    sid = max([int(e.get('id')) for e in slide.shapes._spTree.iter() if e.tag.endswith('}cNvPr')] + [1]) + 1
    xml = (f'<p:pic xmlns:p="{NS["p"]}" xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}"><p:nvPicPr><p:cNvPr id="{sid}" name="Icono {nombre}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
           f'<p:blipFill><a:blip><a:extLst><a:ext uri="{{96DAC541-7B7A-43D3-8B79-37D633B846F1}}"><asvg:svgBlip xmlns:asvg="{NS["asvg"]}" r:embed="{rid}"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
           f'<p:spPr><a:xfrm><a:off x="{Inches(x)}" y="{Inches(y)}"/><a:ext cx="{Inches(lado)}" cy="{Inches(lado)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
    slide.shapes._spTree.append(etree.fromstring(xml))


def caja(slide, forma, x, y, w, h, relleno=None, linea=None):
    s = slide.shapes.add_shape(forma, Inches(x), Inches(y), Inches(w), Inches(h))
    if relleno is None: s.fill.background()
    else: s.fill.solid(); s.fill.fore_color.rgb = relleno
    if linea is None: s.line.fill.background()
    else: s.line.color.rgb = linea; s.line.width = Pt(0.75)
    s.shadow.inherit = False
    if forma == MSO_SHAPE.ROUNDED_RECTANGLE: s.adjustments[0] = 0.06
    return s


def texto(slide, x, y, w, h, parrafos, tam=10.5, color=GRIS, negrita=False, fuente='Montserrat Medium', ancla=MSO_ANCHOR.TOP, espacio=4):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = ancla
    tf.margin_left = tf.margin_right = Inches(0.02); tf.margin_top = tf.margin_bottom = Inches(0.02)
    for i, p_ in enumerate(parrafos if isinstance(parrafos, list) else [parrafos]):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.space_after = Pt(espacio)
        r = para.add_run(); r.text = p_
        r.font.size = Pt(tam); r.font.color.rgb = color; r.font.bold = negrita; r.font.name = fuente
    return tb


def numero_de_slide(slide, modelo):
    """Copia el marcador de número de slide de una slide existente (lleva el campo slidenum)."""
    ph = [s for s in modelo.placeholders if s.placeholder_format.type is not None and 'SLIDE_NUMBER' in str(s.placeholder_format.type)][0]
    slide.shapes._spTree.append(copy.deepcopy(ph._element))


FUENTE_TITULO = os.path.join(os.path.expanduser('~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/05ead52c-581b-4beb-b4f7-102e4af27382/2de13103-0621-49d5-8ba2-e247facac554/skills/md-to-pptx/assets/fonts'), 'RobotoSlab.ttf')


def titulo(slide, txt):
    """Título con la caja roja de la plantilla: no salta de línea, así que su ancho es el del texto (Roboto Slab 26 pt
    medido + 0,27 pulgadas de márgenes, como en la v3) y debe caber antes del logo (unas 10 pulgadas)."""
    from PIL import ImageFont
    ancho = ImageFont.truetype(os.environ.get('FUENTE_TITULO', FUENTE_TITULO), 260).getlength(txt) / 10 / 72 + 0.27
    assert ancho < 10.1, f'Título demasiado largo para la caja de la plantilla: «{txt}» ({ancho:.1f} pulgadas)'
    t = slide.shapes.title; t.text = txt
    t.left, t.top, t.width, t.height = Emu(482400), Emu(349200), Inches(ancho), Emu(429768)
    t.text_frame._txBody.bodyPr.set('wrap', 'none')


def notas(slide, txt):
    slide.notes_slide.notes_text_frame.text = txt


def frases(t):
    """Parte un bloque en frases para pintarlas como párrafos separados."""
    import re
    return [f.strip() for f in re.split(r'(?<=[.:])\s+(?=[A-ZÁÉÍÓÚ0-9«\[])', t) if f.strip()]


def slide_seccion(prs, layout, modelo, n, total, d):
    s = prs.slides.add_slide(layout)
    for ph in list(s.placeholders):
        if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
    numero_de_slide(s, modelo)
    titulo(s, d['titulo'])
    # bloque del menú
    chip = caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.53, 1.0, 2.3, 0.3, CELESTE); chip.adjustments[0] = 0.5
    texto(s, 0.53, 1.0, 2.3, 0.3, f'{d["bloque"].upper()} · {n} DE {total}', tam=9, color=AZUL, negrita=True, fuente='Montserrat', ancla=MSO_ANCHOR.MIDDLE).text_frame.paragraphs[0].alignment = 2
    # Qué hace
    caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.53, 1.5, 5.95, 2.55, FONDO)
    caja(s, MSO_SHAPE.OVAL, 0.73, 1.68, 0.56, 0.56, BLANCO)
    icono(prs, s, d['icono'], 0.84, 1.79, 0.34)
    texto(s, 1.42, 1.72, 4.9, 0.45, 'Qué hace', tam=13, color=AZUL, negrita=True, fuente='Montserrat', ancla=MSO_ANCHOR.MIDDLE)
    texto(s, 0.73, 2.32, 5.55, 1.68, frases(d['hace']), tam=10.5)
    # Qué gana el negocio
    caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.53, 4.2, 5.95, 1.85, BLANCO, BORDE)
    caja(s, MSO_SHAPE.RECTANGLE, 0.53, 4.2, 0.07, 1.85, AZUL)
    texto(s, 0.78, 4.32, 5.5, 0.4, 'Qué gana el negocio', tam=13, color=MARINO, negrita=True, fuente='Montserrat')
    texto(s, 0.78, 4.75, 5.5, 1.25, frases(d['negocio']), tam=10.5)
    # Normas y demo
    nchip = caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.53, 6.25, 5.95, 0.3, CELESTE); nchip.adjustments[0] = 0.5
    texto(s, 0.65, 6.25, 5.75, 0.3, d['normas'], tam=9, color=AZUL, negrita=True, fuente='Montserrat', ancla=MSO_ANCHOR.MIDDLE)
    icono(prs, s, 'monitor', 0.55, 6.68, 0.2, color='7F7F7F', extra=MONITOR)
    texto(s, 0.8, 6.62, 5.6, 0.3, f'En la demo: {d["demo"]}', tam=9, color=GRIS_CLARO, ancla=MSO_ANCHOR.MIDDLE)
    # Captura, encajada en su marco sin deformarla
    caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 6.75, 1.0, 6.06, 5.95, FONDO)
    ruta = os.path.join(IMG, d['captura'])
    with Image.open(ruta) as im: rw, rh = im.size
    bw, bh = 5.7, 5.6
    w, h = (bw, bw * rh / rw) if rw / rh >= bw / bh else (bh * rw / rh, bh)
    pic = s.shapes.add_picture(ruta, Inches(6.75 + (6.06 - w) / 2), Inches(1.0 + (5.95 - h) / 2), Inches(w), Inches(h))
    pic.line.color.rgb = BORDE; pic.line.width = Pt(0.75)
    notas(s, d['notas'])
    return s


def mover(prs, slide, pos):
    """Coloca la slide en la posición pos (1 = primera)."""
    lst = prs.slides._sldIdLst
    el = [e for e in lst if e.get(f'{{{NS["r"]}}}id') == [r for r, p in prs.part.rels.items() if p.target_part is slide.part][0]][0]
    lst.remove(el); lst.insert(pos - 1, el)


def rehacer_slide11(prs, s):
    # Fuera la capa de gobierno de la v3 (los seis óvalos con su icono y sus textos), se conservan los agentes
    quitar = [sh for sh in s.shapes if sh.top is not None and Emu(sh.top).inches > 3.8 and Emu(sh.top).inches < 6.2]
    for sh in quitar: sh._element.getparent().remove(sh._element)
    texto(s, 0.53, 1.0, 12.28, 0.35, 'Lo que se gobierna: cuatro agentes especializados', tam=12, color=MARINO, negrita=True, fuente='Montserrat')
    caja(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.53, 3.8, 12.28, 2.45, CELESTE)
    texto(s, 0.78, 3.9, 11.8, 0.4, 'Capa de gobierno común a todos los agentes', tam=14, color=AZUL, negrita=True, fuente='Montserrat')
    col_w, x0 = 12.28 / 5, 0.53
    for i, (bloque, items) in enumerate(BLOQUES):
        x = x0 + i * col_w + 0.2
        texto(s, x, 4.38, col_w - 0.3, 0.3, bloque.upper(), tam=9, color=AZUL, negrita=True, fuente='Montserrat')
        for j, (ic, nombre) in enumerate(items):
            y = 4.75 + j * 0.45
            caja(s, MSO_SHAPE.OVAL, x, y, 0.36, 0.36, BLANCO)
            icono(prs, s, ic, x + 0.07, y + 0.07, 0.22)
            texto(s, x + 0.45, y - 0.02, col_w - 0.75, 0.4, nombre, tam=11, color=MARINO, negrita=True, fuente='Montserrat', ancla=MSO_ANCHOR.MIDDLE)
    notas(s, '(10-11 min) «No es una IA que lo hace todo. Son cuatro especialistas, y cada uno tiene sus propios límites.» Arriba, lo que se gobierna: los cuatro agentes. Abajo, la capa de gobierno, con las mismas secciones y bloques que el menú del panel: operación, control, calidad, cumplimiento y coste, y mejora y auditoría. Las vemos una a una en las slides siguientes.')


def cambiar_texto(s, viejo, nuevo):
    for sh in s.shapes:
        if not sh.has_text_frame: continue
        for p_ in sh.text_frame.paragraphs:
            for r in p_.runs:
                if viejo in r.text: r.text = r.text.replace(viejo, nuevo); return True
    raise ValueError(f'No encuentro «{viejo}»')


def main():
    global LUC, MONITOR
    LUC = lucide()
    prs = Presentation(ORIGEN)
    # el icono «monitor» no está en icons.js: se toma el de la v3
    MONITOR = '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'
    s11, s12, s13, s15 = prs.slides[10], prs.slides[11], prs.slides[12], prs.slides[14]
    rehacer_slide11(prs, s11)
    titulo(s12, 'Cada agente, inventariado')
    notas(s12, '(11-12 min) Es el inventario de agentes, lo que muestra la sección Agentes del panel: cada uno con una función, su modelo y su versión de prompt, su nivel de autonomía y un responsable con permisos mínimos. Al final siempre hay un técnico de seguros: la IA prepara, la persona decide.')
    notas(s13, '(12-13 min) «Todo lo que voy a decir ahora lo vais a ver funcionando.» Seis pilares; en las slides siguientes, cada sección del panel con lo que hace y lo que gana el negocio.')
    # Slides por sección: detrás de la 13
    layout = s12.slide_layout
    nuevas = [slide_seccion(prs, layout, s12, i + 1, len(SECCIONES), d) for i, d in enumerate(SECCIONES)]
    for i, s in enumerate(nuevas): mover(prs, s, 14 + i)
    # Minuto de cada slide nueva (unos 40 s cada una, de 13:00 a 21:00)
    for i, s in enumerate(nuevas):
        a = 13 * 60 + i * 40; b = a + 40
        tf = s.notes_slide.notes_text_frame; tf.text = f'({a // 60}:{a % 60:02d}-{b // 60}:{b % 60:02d}) {tf.text}'
    # «Vamos a verlo»: lo que se verá del gobierno
    cambiar_texto(s15, 'Autonomía, overrides y kill switch por agente', 'Autonomía, guardrails y revisión humana')
    cambiar_texto(s15, 'Trazas, razonamiento y replay: por qué decidió y qué pasaría con otro modelo', 'Trazas, razonamiento y replay what-if')
    cambiar_texto(s15, 'Guardrails, caps de coste e histórico de cambios', 'Conocimiento, cumplimiento, FinOps y medidas')
    tf = s15.notes_slide.notes_text_frame; tf.text = tf.text.replace('(14-15 min)', '(21-22 min)')
    prs.save(DESTINO)
    print(f'{os.path.relpath(DESTINO, RAIZ)}: {len(prs.slides)} slides')


if __name__ == '__main__':
    main()
