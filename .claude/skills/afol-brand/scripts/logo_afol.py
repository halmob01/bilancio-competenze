"""Ricostruzione vettoriale del logo AFOL Metropolitana dal file a 260 px.

Testi convertiti in tracciati (fontTools + HarfBuzz), adattati ai riquadri misurati
sul logo originale; catena dei cerchi con le misure rilevate.
Coordinate del logo originale x10 (il file misura 260x149 px -> 2600x1490 unita').

Requisiti:
    pip install fonttools brotli uharfbuzz shapely
    npm install @fontsource/fira-sans @fontsource/montserrat   (nella cartella scripts/,
    oppure indica la cartella @fontsource con la variabile FONTSOURCE)

Uso:
    python3 logo_afol.py CARTELLA_USCITA kit
genera i sette SVG di assets/vettoriali/.
"""
import io, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

import os
QUI = os.path.dirname(os.path.abspath(__file__))
FS = os.environ.get('FONTSOURCE', os.path.join(QUI, 'node_modules', '@fontsource')) + '/'
FONTS = {
    'fira800': FS + 'fira-sans/files/fira-sans-latin-800-normal.woff2',
    'fira700': FS + 'fira-sans/files/fira-sans-latin-700-normal.woff2',
    'mont800': FS + 'montserrat/files/montserrat-latin-800-normal.woff2',
}
ROSSO = '#CC0000'
GRIGIO = '#555555'


def shape(fontfile, text):
    data = open(fontfile, 'rb').read()
    tt = TTFont(io.BytesIO(data))
    sfnt = io.BytesIO(); tt.flavor = None; tt.save(sfnt); raw = sfnt.getvalue()
    face = hb.Face(raw); font = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': False})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    return tt, gs, [(order[i.codepoint], p.x_offset, p.y_offset, p.x_advance) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


def text_path(fontfile, text, box):
    """Tracciato del testo adattato al riquadro box=(x0,y0,x1,y1): l'inchiostro riempie il riquadro."""
    tt, gs, glyphs = shape(fontfile, text)
    # bounds
    bp = BoundsPen(gs); x = 0
    for name, dx, dy, adv in glyphs:
        gs[name].draw(TransformPen(bp, (1, 0, 0, 1, x + dx, dy))); x += adv
    xmin, ymin, xmax, ymax = bp.bounds
    X0, Y0, X1, Y1 = box
    sx = (X1 - X0) / (xmax - xmin); sy = (Y1 - Y0) / (ymax - ymin)
    pen = SVGPathPen(gs); x = 0
    for name, dx, dy, adv in glyphs:
        # font: y verso l'alto -> SVG: y verso il basso
        t = (sx, 0, 0, -sy, X0 + (x + dx - xmin) * sx, Y1 + (dy + ymin) * sy)
        gs[name].draw(TransformPen(pen, t)); x += adv
    return pen.getCommands(), round(sx / sy, 3)


def catena(colore=ROSSO, foro='#FFFFFF', bianco_foro=True):
    # misure in unita' x10 dal logo a 260 px
    cy = 1100; D = 310; r = D / 2; rf = 62.5
    cs = [390, 795, 1705, 2145]
    s = f'<rect x="{cs[0]}" y="{cy - 75}" width="{cs[1] - cs[0]}" height="150" fill="{colore}"/>'
    s += f'<rect x="{cs[2]}" y="{cy - 75}" width="{cs[3] - cs[2]}" height="150" fill="{colore}"/>'
    s += f'<rect x="{cs[1]}" y="{cy - 82}" width="{cs[2] - cs[1]}" height="164" fill="{colore}"/>'
    s += ''.join(f'<circle cx="{c}" cy="{cy}" r="{r}" fill="{colore}"/>' for c in cs)
    s += ''.join(f'<circle cx="{c}" cy="{cy}" r="{rf}" fill="{foro}"/>' for c in cs)
    return s


def logo(rosso=ROSSO, grigio=GRIGIO, foro='#FFFFFF', fondo=None, met_font='mont800'):
    afol, k1 = text_path(FONTS['fira800'], 'Afol', (260, 0, 2310, 730))
    met, k2 = text_path(FONTS[met_font], 'METROPOLITANA', (240, 760, 2290, 930))
    pay, k3 = text_path(FONTS['fira700'], 'colleghiamo il lavoro', (250, 1270, 2290, 1490))
    bg = f'<rect x="0" y="0" width="2600" height="1490" fill="{fondo}"/>' if fondo else ''
    body = (f'{bg}<path d="{afol}" fill="{rosso}"/><path d="{met}" fill="{rosso}"/>'
            f'{catena(rosso, foro)}<path d="{pay}" fill="{grigio}"/>')
    info = {'allargamento_afol': k1, 'allargamento_metropolitana': k2, 'allargamento_payoff': k3}
    return body, info


def svg(body, title, W=2600, H=1490, pad=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {W + 2 * pad} {H + 2 * pad}" '
            f'width="{(W + 2 * pad) / 5:.0f}" height="{(H + 2 * pad) / 5:.0f}" role="img">'
            f'<title>{title}</title>{body}</svg>')


if __name__ == '__main__':
    out = sys.argv[1]
    b, info = logo()
    open(out + '/afol_logo_colore.svg', 'w').write(svg(b, 'AFOL Metropolitana, ricostruzione non ufficiale', pad=100))
    print(info)


# ---- catena come tracciato unico con fori veri (per versioni su fondo trasparente) ----
def catena_path():
    from shapely.geometry import Point, box
    from shapely.ops import unary_union
    cy = 1100; r = 155; rf = 62.5
    cs = [390, 795, 1705, 2145]
    parts = [Point(c, cy).buffer(r, 256) for c in cs]
    parts += [box(cs[0], cy - 75, cs[1], cy + 75), box(cs[2], cy - 75, cs[3], cy + 75), box(cs[1], cy - 82, cs[2], cy + 82)]
    g = unary_union(parts)
    for c in cs:
        g = g.difference(Point(c, cy).buffer(rf, 128))
    def ring(coords):
        pts = list(coords)
        return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts[:-1]) + 'Z'
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    d = ''
    for p in polys:
        d += ring(p.exterior.coords) + ''.join(ring(i.coords) for i in p.interiors)
    return d


def logo_tracciati(rosso, grigio):
    afol, _ = text_path(FONTS['fira800'], 'Afol', (260, 0, 2310, 730))
    met, _ = text_path(FONTS['mont800'], 'METROPOLITANA', (240, 760, 2290, 930))
    pay, _ = text_path(FONTS['fira700'], 'colleghiamo il lavoro', (250, 1270, 2290, 1490))
    return (f'<g id="afol"><path d="{afol}" fill="{rosso}"/></g>'
            f'<g id="metropolitana"><path d="{met}" fill="{rosso}"/></g>'
            f'<g id="linea-cerchi"><path d="{catena_path()}" fill="{rosso}" fill-rule="evenodd"/></g>'
            f'<g id="payoff"><path d="{pay}" fill="{grigio}"/></g>')


def doc(body, title, vb, wpx):
    x, y, w, h = vb
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" '
            f'width="{wpx}" height="{wpx * h / w:.0f}">\n<title>{title}</title>\n<desc>Ricostruzione vettoriale non ufficiale dal logo a 260 px di afolmet.it. '
            f'Afol: Fira Sans ExtraBold allargato al 117%. METROPOLITANA: carattere geometrico approssimato (Montserrat ExtraBold). '
            f'Payoff: Fira Sans Bold. Testi convertiti in tracciati.</desc>\n{body}\n</svg>\n')


def kit(out):
    R, G, W, K = '#CC0000', '#555555', '#FFFFFF', '#1A1A1A'
    pad = 120
    vb = (260 - pad, 0 - pad, 2050 + 2 * pad, 1490 + 2 * pad)
    files = {
        'afol_logo_colore.svg': doc(logo_tracciati(R, G), 'AFOL Metropolitana - logo a colori', vb, 1200),
        'afol_logo_negativo.svg': doc(logo_tracciati(W, W), 'AFOL Metropolitana - logo negativo bianco', vb, 1200),
        'afol_logo_nero.svg': doc(logo_tracciati(K, K), 'AFOL Metropolitana - logo monocromo nero', vb, 1200),
        'afol_logo_rosso.svg': doc(logo_tracciati(R, R), 'AFOL Metropolitana - logo monocromo rosso', vb, 1200),
    }
    # icona social: quadrato rosso, logo bianco largo il 63% del lato, centrato
    L = 2700; lw = 0.63 * L; s = lw / 2050; lh = 1490 * s
    tx = (L - lw) / 2 - 260 * s; ty = (L - lh) / 2
    icona = (f'<rect width="{L}" height="{L}" fill="{R}"/>'
             f'<g transform="translate({tx:.1f},{ty:.1f}) scale({s:.5f})">{logo_tracciati(W, W)}</g>')
    files['afol_icona_social.svg'] = doc(icona, 'AFOL Metropolitana - icona social', (0, 0, L, L), 1080)
    # catena da sola
    cvb = (390 - 155 - 60, 1100 - 155 - 60, 2145 - 390 + 310 + 120, 310 + 120)
    files['afol_linea_cerchi_rosso.svg'] = doc(f'<path d="{catena_path()}" fill="{R}" fill-rule="evenodd"/>', 'AFOL - linea a quattro cerchi, rossa', cvb, 1200)
    files['afol_linea_cerchi_bianco.svg'] = doc(f'<path d="{catena_path()}" fill="{W}" fill-rule="evenodd"/>', 'AFOL - linea a quattro cerchi, bianca', cvb, 1200)
    for n, c in files.items():
        open(out + '/' + n, 'w').write(c)
    return list(files)


if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'kit':
    print(kit(sys.argv[1]))
