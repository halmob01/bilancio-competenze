# Logo AFOL Metropolitana

## Versioni (Ufficiale: sono i tre file usati su afolmet.it)

| Versione | Aspetto | Uso | File originale in `assets/` |
|---|---|---|---|
| Principale | A colori su fondo chiaro, con payoff | Testate, documenti, fondi chiari | `afol_logo_colore_260px.png` (260×149, trasparente) |
| Negativo | Tutto bianco | Fondi scuri o rossi, piè di pagina del sito | `afol_logo_negativo_bianco.png` (134×89, trasparente) |
| Icona social | Logo bianco su quadrato rosso | Immagine del profilo, favicon, avatar | `afol_icona_social.jpg` (270×270) |

I file originali sono a bassa risoluzione: servono solo come riferimento.

## Vettoriali ricostruiti (`assets/vettoriali/`)

Stato: **ricostruzione non ufficiale**, fatta nel novembre 2026 perché non erano disponibili i file originali. I testi sono convertiti in tracciati, quindi non serve avere i font installati. Anteprime in `assets/anteprime/`.

| File | Contenuto |
|---|---|
| `afol_logo_colore.svg` | Rosso `#CC0000`, payoff grigio `#555555`, fondo trasparente |
| `afol_logo_rosso.svg` | Tutto rosso |
| `afol_logo_negativo.svg` | Tutto bianco, per fondi rossi o scuri |
| `afol_logo_nero.svg` | Monocromo `#1A1A1A`, per stampe a un colore |
| `afol_icona_social.svg` | Quadrato rosso con il logo bianco largo il 63% del lato e centrato, come l'icona dei profili |
| `afol_linea_cerchi_rosso.svg`, `afol_linea_cerchi_bianco.svg` | Solo la catena dei quattro cerchi |

Nelle versioni su fondo trasparente i fori dei cerchi sono veri fori (`fill-rule="evenodd"`), non dischi bianchi: si possono appoggiare su qualsiasi fondo. Ogni file ha i gruppi `afol`, `metropolitana`, `linea-cerchi` e `payoff`, che si selezionano separatamente in un editor vettoriale.

**Fedeltà** (sovrapposizione con l'originale a 260 px, 1 = identico): logo intero 0,88; «Afol» 0,87; «METROPOLITANA» 0,81; linea dei cerchi 0,93. Differenze note: la «l» di «Afol» conserva il piccolo ricciolo di Fira, che nell'originale è più netto; «METROPOLITANA» usa un carattere approssimato. Per a schermo, social, video e materiali interni vanno bene. Se AFOL fornisce i file originali, quelli hanno la precedenza.

Le stesse sette versioni sono in PDF vettoriale in `assets/pdf/`, aperte e salvate con VectorCraft (pacchetto ArtCraft): servono per la stampa e per i programmi che non importano bene gli SVG.

Per rigenerarli o modificarli: `scripts/logo_afol.py CARTELLA kit`.

## I caratteri del logo (Osservato, verificato per sovrapposizione)

| Riga | Carattere | Corrispondenza |
|---|---|---|
| «Afol» | Fira Sans ExtraBold (800), allargato in orizzontale al 117% circa | 0,87 |
| «METROPOLITANA» | Non è Fira, nemmeno allargato (0,58). Il più vicino tra quelli provati è Montserrat ExtraBold (800), con proporzioni quasi naturali (94%) | 0,82 |
| «colleghiamo il lavoro» | Fira Sans Bold (700), proporzioni naturali | 0,78 |

Confronto visivo in `assets/anteprime/confronto_caratteri.png` (rosso: logo; blu: carattere; grigio: coincidenza). Provati: Fira Sans, Fira Sans Condensed ed Extra Condensed, Montserrat, Poppins, dal peso 400 al 900 e con spaziatura da 0 a 0,1 em. La misura viene da un file piccolo: è un'ottima ipotesi di lavoro, non una certezza.

## Struttura (Osservata sul file a 260 px)

Quattro righe impilate, **tutte della stessa larghezza** (blocco giustificato, circa 205 px nel file):

| Riga | Contenuto | Colore | Altezza relativa |
|---|---|---|---|
| 1 | «Afol», Fira Sans ExtraBold allargato | Rosso | 2,35 D |
| 2 | «METROPOLITANA» in maiuscolo | Rosso | 0,55 D |
| 3 | Linea con quattro cerchi | Rosso | 1 D |
| 4 | «colleghiamo il lavoro» in minuscolo | Grigio scuro ≈ `#555555` | ≈ 0,7 D |

D è il diametro dei cerchi della riga 3. Tra le righe c'è solo un piccolo stacco (circa 0,1 D): il logo è compatto.

La linea a quattro cerchi è descritta in dettaglio in `cerchi.md`.

## Regole d'uso

Dedotte dalle prassi comuni dei manuali di marca e coerenti con come AFOL usa il logo:

- **Area di rispetto** (Proposta): lascia libero intorno al logo almeno 1 D (il diametro di un cerchio della linea).
- **Dimensione minima** (Proposta): almeno 120 px di larghezza a schermo, 25 mm in stampa. Sotto queste misure il payoff non si legge: usa l'icona quadrata.
- **Fondi**: versione a colori su bianco o grigi chiari; negativo su rosso, su grigio scuro o su foto scure e uniformi. Mai il rosso su rosso.
- **Non fare**: deformare, ruotare, cambiare i colori, separare le righe, togliere la linea dei cerchi, aggiungere ombre o contorni, ricomporre il logo con testo vivo invece di usare i vettoriali.
- **Co-branding**: nei post AFOL i loghi dell'ente e dei partner stanno in una fascia bianca in basso, allineati e alla stessa altezza ottica (Osservato).

## Dove sta il logo nei materiali (Osservato)

- Sito: logo a colori in testata, negativo bianco nel piè di pagina rosso o scuro.
- Post: spesso non c'è il logo intero. Il marchio è affidato al sistema dei cerchi e al rosso; i loghi stanno nella fascia bassa quando ci sono partner.
- Profilo social: icona quadrata bianco su rosso.
