"""Generatore SVG del sistema dei cerchi AFOL Metropolitana.

Proporzioni osservate sul logo e sui post AFOL (vedi reference/cerchi.md):
- catena a quattro cerchi del logo e della firma;
- linea che entra dal bordo e finisce in un anello (cornice e percorso);
- disco di sfondo.

Uso da riga di comando (scrive esempi nella cartella indicata):
    python3 cerchi.py OUT_DIR

Uso come modulo:
    from cerchi import catena, documento
    s, w, h = catena(D=40)
    open("firma.svg", "w").write(documento(s, w, h))

Nessuna dipendenza esterna. Misure in pixel SVG.
"""
import os
import sys

ROSSO = "#CC0000"
BIANCO = "#FFFFFF"

# Catena (unita' D = diametro del disco)
FORO = 0.40          # diametro del foro / D
COLLO = 0.50         # spessore del collo e della linea lunga / D
PASSO_COPPIA = 1.3   # distanza tra i centri di una coppia / D
PASSO_LUNGO = 2.9    # distanza tra secondo e terzo centro / D

# Linea con anello (unita' t = spessore della linea)
ANELLO_DIAM = 3.9    # diametro esterno dell'anello / t
ANELLO_FORO = 2.0    # diametro del foro / t  (parete ~ t)
BARRA = 2.2          # spessore della barra verticale / t


def catena(D=100, x0=0, y0=0, colore=ROSSO, foro=BIANCO):
    """Catena a quattro cerchi. Restituisce (svg_interno, larghezza, altezza)."""
    cy = y0 + D / 2
    c = [x0 + D / 2]
    c.append(c[0] + PASSO_COPPIA * D)
    c.append(c[1] + PASSO_LUNGO * D)
    c.append(c[2] + PASSO_COPPIA * D)
    th = COLLO * D
    s = f'<rect x="{c[0]}" y="{cy - th / 2}" width="{c[3] - c[0]}" height="{th}" fill="{colore}"/>'
    s += "".join(f'<circle cx="{x}" cy="{cy}" r="{D / 2}" fill="{colore}"/>' for x in c)
    s += "".join(f'<circle cx="{x}" cy="{cy}" r="{D * FORO / 2}" fill="{foro}"/>' for x in c)
    return s, c[3] + D / 2 - x0, D


def anello(cx, cy, t, colore=ROSSO, foro=BIANCO):
    """Anello con parete circa uguale allo spessore t della linea."""
    return (f'<circle cx="{cx}" cy="{cy}" r="{ANELLO_DIAM * t / 2}" fill="{colore}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{ANELLO_FORO * t / 2}" fill="{foro}"/>')


def linea_con_anello(x_anello, cy, t, x_bordo=0, colore=ROSSO, foro=BIANCO):
    """Linea orizzontale che entra dal bordo (x_bordo) e finisce in un anello centrato in x_anello."""
    x1, x2 = sorted([x_bordo, x_anello])
    s = f'<rect x="{x1}" y="{cy - t / 2}" width="{x2 - x1}" height="{t}" fill="{colore}"/>'
    return s + anello(x_anello, cy, t, colore, foro)


def percorso(xs, cy, t, x_bordo=0, x_fine=None, colore=ROSSO, foro=BIANCO):
    """Una linea che attraversa piu' tappe (anelli) in xs; parte dal bordo e, se dato, prosegue fino a x_fine."""
    fine = x_fine if x_fine is not None else max(xs)
    s = f'<rect x="{x_bordo}" y="{cy - t / 2}" width="{fine - x_bordo}" height="{t}" fill="{colore}"/>'
    return s + "".join(anello(x, cy, t, colore, foro) for x in xs)


def barra_verticale(x, t, y_fine, colore=ROSSO):
    """Barra che scende dal bordo superiore, spessa circa 2t."""
    w = BARRA * t
    return f'<rect x="{x - w / 2}" y="0" width="{w}" height="{y_fine}" fill="{colore}"/>'


def disco(cx, cy, r, colore=ROSSO):
    """Disco pieno di sfondo (dietro la persona)."""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{colore}"/>'


def documento(interno, larghezza, altezza, sfondo=None, margine=0):
    m = margine
    W, H = larghezza + 2 * m, altezza + 2 * m
    bg = f'<rect x="{-m}" y="{-m}" width="{W}" height="{H}" fill="{sfondo}"/>' if sfondo else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-m} {-m} {W} {H}" '
            f'width="{W}" height="{H}" aria-hidden="true">{bg}{interno}</svg>')


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)

    s, w, h = catena(D=100)
    open(os.path.join(out, "catena_positivo.svg"), "w").write(documento(s, w, h, BIANCO, 30))
    s, w, h = catena(D=100, colore=BIANCO, foro=ROSSO)
    open(os.path.join(out, "catena_negativo.svg"), "w").write(documento(s, w, h, ROSSO, 30))

    # post cornice 1080x1080: linea con anello in alto a sinistra, barra in alto a destra, disco in basso a destra
    t = 40
    s = disco(800, 1080, 380) + barra_verticale(780, t, 300) + linea_con_anello(250, 180, t)
    open(os.path.join(out, "post_cornice.svg"), "w").write(documento(s, 1080, 1080, "#FCF3F4"))

    # percorso su tre post affiancati (3240x1080)
    s = percorso([540, 1620, 2700], 760, t, x_fine=3240)
    open(os.path.join(out, "percorso_tre_post.svg"), "w").write(documento(s, 3240, 1080, BIANCO))
    print("Scritti 5 esempi in", out)
