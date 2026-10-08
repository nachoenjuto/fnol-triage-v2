"""Monta las capturas compuestas de las slides (dos capturas apiladas, mismo ancho, separadas por una franja blanca):
    python3 scripts/componer-capturas.py      (o: make capturas, después de scripts/capturas.mjs)
"""
import os
from PIL import Image

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '_docs', 'img', 'observabilidad')
PARES = {
    'c21-replay.png': ('05-reasoning-replay.png', '05b-replay-diff.png'),
    'c24-autonomia.png': ('13-autonomia-auditoria.png', '13b-autonomia-evolucion.png'),
    'c28-caps.png': ('17-cap03-consumo.png', '20-coste-mensual.png'),
    'c29-acciones.png': ('19-caps-superados.png', '17b-cap03-acciones.png'),
    'c31-simular.png': ('18-nuevo-cap.png', '16-nuevo-guardrail.png'),
}
HUECO = 36  # px a 2×

for salida, (arriba, abajo) in PARES.items():
    a, b = (Image.open(os.path.join(IMG, f)).convert('RGB') for f in (arriba, abajo))
    w = max(a.width, b.width)
    a, b = (im if im.width == w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) for im in (a, b))
    lienzo = Image.new('RGB', (w, a.height + HUECO + b.height), 'white')
    lienzo.paste(a, (0, 0)); lienzo.paste(b, (0, a.height + HUECO))
    lienzo.save(os.path.join(IMG, salida), optimize=True)
    print(f'  {salida}  {lienzo.width}×{lienzo.height}  ({arriba} + {abajo})')
