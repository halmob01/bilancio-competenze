# Il sistema dei cerchi

Stato: **Osservato**. Regole e proporzioni sono misurate su logo, post e profilo Instagram di AFOL (novembre 2026), non tratte da un manuale ufficiale. Le misure da file piccoli hanno un margine di circa ±5%.

## I quattro usi

| Uso | Come appare | Riferimento in `presentazione/assets/` |
|---|---|---|
| 1. Nel logo | Linea a quattro cerchi sotto «METROPOLITANA» | `4d5837c7….png` |
| 2. Come firma | Sotto il titolo di un post: cerchio, cerchio, linea lunga, cerchio, cerchio | `36eff82c….jpg` («LAVORA CON NOI») |
| 3. Come cornice | Una linea entra dal bordo e finisce in un anello; una barra scende dall'alto; un grande disco rosso sta dietro la persona | `dedcdb3f….jpg`, `40de720a….jpg` |
| 4. Come percorso | Sul profilo una linea attraversa tre post affiancati; ogni anello è una tappa con un nome (Formazione, Orientamento, Lavoro) | `b7846c7a….jpg` |

## Le sei regole

1. **Tratto uniforme**: la parete dell'anello è spessa quanto la linea che lo raggiunge.
2. **Colore**: rosso su fondi chiari, rosati o su foto; bianco su fondo rosso. Testo nero accanto, parola chiave in rosso.
3. **Direzione**: solo orizzontale e verticale; le svolte sono angoli retti, come in una mappa della metropolitana.
4. **Scala**: piccolo come firma, enorme come sfondo, anche tagliato dal bordo.
5. **Bordo**: la linea entra dal bordo del formato, come se continuasse fuori, e finisce in un anello. In un percorso attraversa i confini tra i post senza interruzioni.
6. **Ruolo**: separa il titolo dal resto, guida lo sguardo, collega i contenuti in sequenza, incornicia una persona.

## A. La catena del logo e della firma

Elementi: quattro dischi pieni con foro, uniti a coppie da un collo corto e collegati al centro da una linea lunga. Unità: **D** = diametro del disco.

| Parametro | Valore misurato |
|---|---|
| Diametro del foro | 0,40 D |
| Parete del disco | 0,30 D |
| Spessore del collo tra i dischi di una coppia | ≈ 0,5 D |
| Spessore della linea lunga | ≈ 0,5 D |
| Distanza tra i centri di una coppia | 1,3 D |
| Distanza tra il secondo e il terzo centro | 2,9 D |
| Larghezza totale | 6,6 D |

Esempio con D = 100: centri a x = 50, 180, 470, 600; collo e linea alti 50; fori di diametro 40; larghezza 650.

Nel logo la catena è larga quanto la scritta «METROPOLITANA». Nella firma sta sotto il titolo, allineata a sinistra con il testo, e di solito è larga quanto il titolo.

Misure della firma su «LAVORA CON NOI»: la catena è larga esattamente quanto il titolo, il diametro D dei cerchi è circa 1,6 volte l'altezza delle maiuscole del titolo e lo stacco tra titolo e catena è circa 0,4 volte l'altezza delle maiuscole.

## B. La linea che finisce in un anello

Usata come cornice e come percorso. Unità: **t** = spessore della linea.

| Parametro | Valore misurato | Su un post largo 1080 px |
|---|---|---|
| Spessore della linea (t) | 3,6% della larghezza | 38 px |
| Diametro esterno dell'anello | ≈ 3,9 t (13,9% della larghezza) | 150 px |
| Diametro del foro | ≈ 0,51 del diametro esterno | 77 px |
| Parete dell'anello | ≈ t | 37 px |
| Posizione dell'anello nella cornice | centro a circa il 26% della larghezza e il 13% dell'altezza | x 284, y 176 su 1350 |

Il foro è vuoto: lascia vedere il fondo o la foto. In un percorso la linea si interrompe sull'anello e riprende dopo, non attraversa il foro.

## C. La barra verticale

Una barra rossa che scende dal bordo superiore e si ferma dietro la testa della persona, entrando nel disco di sfondo.

| Parametro | Valore misurato | Su 1080 px |
|---|---|---|
| Larghezza | ≈ 2,2 t (7,9% della larghezza) | 85 px |
| Asse | coincide con l'asse verticale del disco di sfondo | x 800 |

## D. Il disco di sfondo

Un disco rosso pieno dietro la persona fotografata, che è scontornata e si sovrappone al disco.

| Parametro | Valore misurato | Su 1080 × 1350 |
|---|---|---|
| Diametro | ≈ 49% della larghezza | 532 px |
| Centro | 74% della larghezza, 54% dell'altezza | x 800, y 724 |

Nel post osservato il disco sta tutto sopra la fascia dei loghi; in altri materiali può essere tagliato dal bordo.

## E. La tappa con etichetta

Anello sulla linea con un'etichetta sotto, centrata: Fira Sans ExtraBold, bianca su foto o rossa su fondo chiaro. Nella griglia del profilo le tappe sono Formazione, Orientamento, Lavoro.

## F. Altre micrografiche osservate

- **Fascia dei loghi**: banda bianca in fondo al post (circa 14% dell'altezza), con il logo AFOL a sinistra e i loghi dei partner allineati sulla stessa linea centrale, alti circa metà della fascia.
- **Separatore**: il punto mediano «•» tra luogo e indirizzo («Teatro Teca • v.le Europa»).
- **Avatar**: nel profilo l'icona quadrata viene ritagliata a cerchio, quindi il logo deve stare tutto dentro il cerchio inscritto.

## File pronti (`assets/micrografiche/`)

| File | Contenuto |
|---|---|
| `linea_anello_rosso.svg`, `linea_anello_bianco.svg` | Linea con anello, foro trasparente |
| `barra_verticale_rosso.svg`, `barra_verticale_bianco.svg` | Barra verticale 85 × 600 px |
| `disco_sfondo_rosso.svg`, `disco_sfondo_bianco.svg` | Disco di 532 px |
| `catena_firma_rosso.svg`, `catena_firma_bianco.svg` | Catena a quattro cerchi con fori trasparenti, D = 60 px |
| `tappa_rosso.svg`, `tappa_bianco.svg` | Tappa con etichetta di esempio in testo vivo |
| `modello_post_cornice_1080x1350.svg` | Post 4:5 con linea, anello, barra, disco, testi segnaposto e fascia dei loghi |
| `modello_post_firma_1080.svg` | Post quadrato con titolo in maiuscolo e firma a catena |
| `modello_percorso_3post_3240x1080.svg` | Tre post affiancati con linea e tre tappe |
| `fascia_loghi_1080.svg` | Fascia bianca con il logo AFOL e due posti per i partner |

I modelli usano testo vivo in Fira Sans: per vederli corretti il carattere deve essere installato. I file a forma pura sono anche in PDF in `assets/pdf/micrografiche/`. Anteprime in `assets/anteprime/micrografiche/`.

## Generatore

`scripts/cerchi.py` disegna in SVG catena, linea con anello e disco a qualsiasi scala. `scripts/micrografiche.py CARTELLA` rigenera tutti i file di `assets/micrografiche/` con le misure di questa pagina (richiede shapely per la catena).
