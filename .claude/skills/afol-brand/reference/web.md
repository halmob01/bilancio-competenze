# Web: redesign di siti e pagine

Stato: i valori di colore e carattere sono **Ufficiali** od **Osservati** su afolmet.it; i componenti sono una **Proposta** coerente con il marchio.

## Base

Carica il carattere e i token (`tokens.css`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;600;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css">
```

## Struttura del sito osservata

- Testata bianca con il logo a colori a sinistra.
- Piè di pagina scuro o rosso con il logo negativo bianco.
- Icona quadrata bianco su rosso come favicon e immagine dei profili.

## Tipografia

| Elemento | Desktop | Mobile | Peso | Colore |
|---|---|---|---|---|
| H1 | 48–56 px | 34–40 px | 800 | `--afol-testo` |
| H2 | 34–40 px | 26–30 px | 800 | `--afol-testo` |
| H3 | 24–26 px | 20–22 px | 600 | `--afol-testo` |
| Occhiello | 14–16 px, maiuscolo, spaziatura 0,12 em | uguale | 600 | `--afol-rosso` |
| Testo | 17–18 px, interlinea 1,55 | 16–17 px | 400 | `--afol-testo` |
| Note, didascalie | 14 px | 14 px | 400 | `--afol-grigio-medio` |

Larghezza della colonna di testo: 60–75 caratteri (circa 680–760 px).

## Componenti

- **Pulsante principale**: fondo `--afol-rosso`, testo bianco 600, angoli 4–6 px, padding 12 × 24 px; al passaggio del mouse rosso più scuro `#A30000`. Il fuoco da tastiera ha un contorno di 3 px `#1A1A1A` staccato di 2 px.
- **Pulsante secondario**: bordo 2 px rosso, testo rosso, fondo trasparente.
- **Link**: rosso, sottolineati nel testo corrente.
- **Schede**: fondo bianco su `--afol-grigio-chiaro`, bordo 1 px `--afol-grigio-bordo` oppure filetto rosso in alto di 4–6 px.
- **Separatore di sezione**: la catena dei cerchi (`cerchi.md`, A) in piccolo, D = 16–20 px, sotto il titolo di sezione. È la firma del marchio sul web: usala a ogni titolo di primo livello, non a tutti.
- **Hero**: titolo grande a sinistra, foto di persona scontornata a destra su un grande disco rosso, e una linea che entra dal bordo sinistro e finisce in un anello.
- **Percorso**: per i passi di una procedura (iscrizione, orientamento), usa una linea orizzontale con anelli numerati, che diventa verticale su mobile.

## Accessibilità

- `#CC0000` su bianco ha contrasto 5,89 e va bene anche per testo normale; non usare rosso su grigi più scuri di `#F5F5F5`.
- Mai affidare un'informazione al solo colore rosso: aggiungi un'icona o un testo.
- Le immagini con persone devono avere un testo alternativo che le descriva.
- Gli SVG decorativi dei cerchi hanno `aria-hidden="true"`.

## Da evitare

Ombre pesanti, sfumature di colore, più di un rosso, icone in stili diversi, font diversi da Fira Sans (salvo un carattere da titolo deciso esplicitamente), cerchi con diagonali o tratti di spessore diverso.
