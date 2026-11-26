"""Micrografiche AFOL Metropolitana in SVG, con le proporzioni misurate sui post AFOL
(vedi reference/cerchi.md e reference/social.md).

Uso:
    python3 micrografiche.py CARTELLA_USCITA

Scrive:
- elementi singoli (fondo trasparente, rosso e bianco): linea con anello, barra verticale,
  disco di sfondo, firma (catena) sotto un titolo, tappa con etichetta;
- modelli impaginati con testo vivo in Fira Sans (da sostituire): post 4:5 con cornice,
  post quadrato con firma, percorso su tre post, fascia dei loghi.
Le misure sono riferite a un post largo 1080 px. Nessuna dipendenza esterna.
"""
import os
import re
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)

ROSSO = "#CC0000"
BIANCO = "#FFFFFF"
NERO = "#1A1A1A"
ROSATO = "#FCF3F4"
GRIGIO_FONDO = "#E2E2E2"

# Proporzioni misurate (post 900x1119 riportato a 1080 di larghezza)
T = 38            # spessore della linea  (3,6% della larghezza)
ANELLO_D = 150    # diametro esterno dell'anello (circa 3,9 t)
ANELLO_FORO = 77  # diametro del foro (circa 0,51 del diametro)
BARRA = 85        # larghezza della barra verticale (circa 2,2 t)
DISCO_D = 532     # diametro del disco di sfondo (49% della larghezza)
FASCIA_H = 185    # altezza della fascia dei loghi su 1350 (13,8%)
MARGINE = 77      # margine sinistro dei testi (7,1%)
FONT = "'Fira Sans', Arial, sans-serif"


def doc(w, h, corpo, titolo, sfondo=None):
    bg = f'<rect width="{w}" height="{h}" fill="{sfondo}"/>' if sfondo else ""
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
            f'<title>{titolo}</title>\n{bg}{corpo}\n</svg>\n')


def anello_path(cx, cy, d=ANELLO_D, foro=ANELLO_FORO):
    """Anello come tracciato con foro vero (evenodd)."""
    R, r = d / 2, foro / 2
    return (f'M{cx - R},{cy} a{R},{R} 0 1,0 {2 * R},0 a{R},{R} 0 1,0 {-2 * R},0 Z '
            f'M{cx - r},{cy} a{r},{r} 0 1,0 {2 * r},0 a{r},{r} 0 1,0 {-2 * r},0 Z')


def linea_anello(x_anello, cy, colore, x_bordo=0):
    """Linea che entra dal bordo e finisce nell'anello; il foro resta trasparente."""
    x_fine = x_anello - ANELLO_D / 2 + 2
    return (f'<rect x="{x_bordo}" y="{cy - T / 2}" width="{x_fine - x_bordo}" height="{T}" fill="{colore}"/>'
            f'<path d="{anello_path(x_anello, cy)}" fill="{colore}" fill-rule="evenodd"/>')


def testo(x, y, righe, size, peso=900, colore=NERO, interlinea=1.1, chiave=None):
    """Testo vivo; 'chiave' = parola da colorare in rosso."""
    out = []
    for i, r in enumerate(righe):
        if chiave and chiave in r:
            a, b = r.split(chiave, 1)
            r = f'{a}<tspan fill="{ROSSO}">{chiave}</tspan>{b}'
        out.append(f'<text x="{x}" y="{y + i * size * interlinea:.0f}" font-family="{FONT}" '
                   f'font-weight="{peso}" font-size="{size}" fill="{colore}">{r}</text>')
    return "".join(out)


def logo_afol(x, y, larghezza, colore_file="afol_logo_colore.svg"):
    """Inserisce il logo vettoriale ricostruito (assets/vettoriali)."""
    s = open(os.path.join(QUI, "..", "assets", "vettoriali", colore_file), encoding="utf-8").read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    corpo = s.split("</desc>", 1)[1].rsplit("</svg>", 1)[0]
    _, _, vw, vh = [float(v) for v in vb.split()]
    h = larghezza * vh / vw
    return f'<svg x="{x}" y="{y}" width="{larghezza}" height="{h:.1f}" viewBox="{vb}">{corpo}</svg>', h


def elementi(out):
    f = {}
    for nome, col in (("rosso", ROSSO), ("bianco", BIANCO)):
        f[f"linea_anello_{nome}.svg"] = doc(400, 200, linea_anello(285, 100, col), f"AFOL - linea con anello ({nome})")
        f[f"barra_verticale_{nome}.svg"] = doc(BARRA, 600, f'<rect width="{BARRA}" height="600" fill="{col}"/>',
                                               f"AFOL - barra verticale ({nome})")
        f[f"disco_sfondo_{nome}.svg"] = doc(DISCO_D, DISCO_D, f'<circle cx="{DISCO_D / 2}" cy="{DISCO_D / 2}" r="{DISCO_D / 2}" fill="{col}"/>',
                                            f"AFOL - disco di sfondo ({nome})")
        cw = _catena_larghezza(60)
        f[f"catena_firma_{nome}.svg"] = doc(int(cw) + 1, 60, _catena_forata(60, col), f"AFOL - catena per la firma ({nome})")
        tappa = (f'<rect x="0" y="{100 - T / 2}" width="{200 - ANELLO_D / 2 + 2}" height="{T}" fill="{col}"/>'
                 f'<rect x="{200 + ANELLO_D / 2 - 2}" y="{100 - T / 2}" width="{200 - ANELLO_D / 2 + 2}" height="{T}" fill="{col}"/>'
                 f'<path d="{anello_path(200, 100)}" fill="{col}" fill-rule="evenodd"/>'
                 + testo(200, 230, ["Tappa"], 40, 800, col).replace("<text ", '<text text-anchor="middle" '))
        f[f"tappa_{nome}.svg"] = doc(400, 260, tappa, f"AFOL - tappa con etichetta ({nome})")
    for n, c in f.items():
        open(os.path.join(out, n), "w", encoding="utf-8").write(c)
    return list(f)


def _catena_larghezza(D):
    from cerchi import PASSO_COPPIA, PASSO_LUNGO
    return (2 * PASSO_COPPIA + PASSO_LUNGO) * D + D


def _catena_forata(D, colore):
    """Catena a quattro cerchi come unico tracciato con fori veri (richiede shapely)."""
    from shapely.geometry import Point, box
    from shapely.ops import unary_union
    from cerchi import FORO, COLLO, PASSO_COPPIA, PASSO_LUNGO
    cy = D / 2
    c = [D / 2]
    c.append(c[0] + PASSO_COPPIA * D); c.append(c[1] + PASSO_LUNGO * D); c.append(c[2] + PASSO_COPPIA * D)
    th = COLLO * D
    g = unary_union([Point(x, cy).buffer(D / 2, 128) for x in c] + [box(c[0], cy - th / 2, c[3], cy + th / 2)])
    for x in c:
        g = g.difference(Point(x, cy).buffer(D * FORO / 2, 64))
    def anello(coords):
        pts = list(coords)[:-1]
        return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    d = "".join(anello(p.exterior.coords) + "".join(anello(i.coords) for i in p.interiors) for p in polys)
    return f'<path d="{d}" fill="{colore}" fill-rule="evenodd"/>'


def _segmenti(xs, y, colore=ROSSO):
    """Tratti di linea tra anelli consecutivi (la linea non attraversa il foro)."""
    out = ""
    for a, b in zip(xs[:-1], xs[1:]):
        x1 = a + (ANELLO_D / 2 - 2 if a > 0 else 0)
        x2 = b - (ANELLO_D / 2 - 2 if b < xs[-1] else 0)
        out += f'<rect x="{x1}" y="{y - T / 2}" width="{x2 - x1}" height="{T}" fill="{colore}"/>'
    return out


def modelli(out):
    f = {}
    # 1. Post 4:5 con cornice (dal post AFOL sull'orientamento)
    W, H = 1080, 1350
    banda_y = H - FASCIA_H
    logo, lh = logo_afol(80, banda_y + (FASCIA_H - 125) / 2, 125 * 2290 / 1730)
    corpo = (f'<circle cx="800" cy="724" r="{DISCO_D / 2}" fill="{ROSSO}"/>'
             f'<rect x="{800 - BARRA / 2}" y="0" width="{BARRA}" height="724" fill="{ROSSO}"/>'
             + linea_anello(284, 176, ROSSO)
             + '<rect x="560" y="300" width="480" height="760" fill="none" stroke="#6B6363" stroke-width="3" stroke-dasharray="14 10"/>'
             + testo(640, 690, ["[foto scontornata]"], 30, 400, "#6B6363")
             + testo(MARGINE, 400, ["titolo del post", "su più righe", "con una parola", "chiave in rosso"], 52, 900, NERO, 1.08, "chiave")
             + testo(MARGINE, 690, ["giovedì 19 novembre", "ore 9.30"], 34, 600, NERO, 1.25)
             + testo(MARGINE, 790, ["Luogo • indirizzo"], 26, 400, NERO)
             + f'<rect x="0" y="{banda_y}" width="{W}" height="{FASCIA_H}" fill="{BIANCO}"/>' + logo
             + f'<rect x="460" y="{banda_y + 50}" width="200" height="85" fill="none" stroke="#CCCCCC" stroke-dasharray="8 6"/>'
             + f'<rect x="780" y="{banda_y + 50}" width="200" height="85" fill="none" stroke="#CCCCCC" stroke-dasharray="8 6"/>'
             + testo(560, banda_y + 100, ["logo partner"], 20, 400, "#999999").replace("<text ", '<text text-anchor="middle" ')
             + testo(880, banda_y + 100, ["logo partner"], 20, 400, "#999999").replace("<text ", '<text text-anchor="middle" '))
    f["modello_post_cornice_1080x1350.svg"] = doc(W, H, corpo, "AFOL - modello post con cornice", ROSATO)
    # 2. Post quadrato con titolo e firma (da «Lavora con noi»)
    W = H = 1080
    corpo = (testo(105, 125, ["LAVORA CON NOI"], 49, 900, ROSSO)
             + f'<g transform="translate(104,140)">{_catena_forata(53, ROSSO)}</g>'
             + '<rect x="560" y="240" width="480" height="800" fill="none" stroke="#6B6363" stroke-width="3" stroke-dasharray="14 10"/>'
             + testo(640, 680, ["[foto scontornata]"], 30, 400, "#6B6363")
             + testo(105, 420, ["testo dell'annuncio", "su più righe", "con la parte", "chiave in rosso"], 43, 800, NERO, 1.12, "chiave in rosso"))
    f["modello_post_firma_1080.svg"] = doc(W, H, corpo, "AFOL - modello post con firma", GRIGIO_FONDO)
    # 3. Percorso su tre post (griglia del profilo)
    W, H = 3240, 1080
    y = 760
    corpo = (f'<rect width="{W}" height="{H}" fill="#D9D9D9"/>'
             + testo(1620, 420, ["[tre foto affiancate]"], 40, 400, "#6B6363").replace("<text ", '<text text-anchor="middle" ')
             + _segmenti([0, 540, 1620, 2700, W], y)
             + "".join(f'<path d="{anello_path(x, y)}" fill="{ROSSO}" fill-rule="evenodd"/>' for x in (540, 1620, 2700))
             + "".join(testo(x, y + 130, [t], 52, 800, BIANCO).replace("<text ", '<text text-anchor="middle" ')
                       for x, t in ((540, "Tappa uno"), (1620, "Tappa due"), (2700, "Tappa tre")))
             + '<line x1="1080" y1="0" x2="1080" y2="1080" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="20 14"/>'
             + '<line x1="2160" y1="0" x2="2160" y2="1080" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="20 14"/>')
    f["modello_percorso_3post_3240x1080.svg"] = doc(W, H, corpo, "AFOL - modello percorso su tre post")
    # 4. Fascia dei loghi
    logo, lh = logo_afol(80, (FASCIA_H - 125) / 2, 125 * 2290 / 1730)
    corpo = (logo + f'<rect x="460" y="50" width="200" height="85" fill="none" stroke="#CCCCCC" stroke-dasharray="8 6"/>'
             f'<rect x="780" y="50" width="200" height="85" fill="none" stroke="#CCCCCC" stroke-dasharray="8 6"/>')
    f["fascia_loghi_1080.svg"] = doc(1080, FASCIA_H, corpo, "AFOL - fascia dei loghi", BIANCO)
    for n, c in f.items():
        open(os.path.join(out, n), "w", encoding="utf-8").write(c)
    return list(f)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    print(elementi(out) + modelli(out))
