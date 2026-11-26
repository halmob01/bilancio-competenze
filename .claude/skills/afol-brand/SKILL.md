---
name: afol-brand
description: Brand kit di AFOL Metropolitana (colori, carattere Fira Sans, logo, payoff, tono, sistema grafico dei cerchi) con misure e codici precisi. Da usare per redesign di siti o pagine, post social, grafiche video come quelle del TG studentesco, slide e qualsiasi materiale che deve risultare on brand AFOL.
---

# Brand kit AFOL Metropolitana

AFOL Metropolitana (Agenzia Metropolitana per la Formazione, l'Orientamento e il Lavoro) è l'ente della Città metropolitana di Milano che gestisce scuole di formazione professionale, tra cui il CFP di Rozzano, servizi per il lavoro e orientamento.

Questa skill raccoglie la sua identità visiva e verbale con codici, misure e regole d'uso, ricavati dalla presentazione `presentazione/` di questa repo e dall'analisi di sito, logo e social AFOL (novembre 2026).

Per documenti Word istituzionali (UDA, programmi, relazioni) esiste anche la skill `afolmet-brand`, che applica lo stesso marchio ai file .docx. Questa skill copre tutto il resto.

## Come usarla

1. Leggi questo file: contiene i valori che servono quasi sempre.
2. Apri il riferimento del lavoro da fare:
   - `reference/identita.md`: nome, famiglia di marchi, valori, payoff, tono di voce.
   - `reference/logo.md`: versioni del logo, struttura misurata, regole d'uso, file disponibili.
   - `reference/cerchi.md`: il sistema grafico dei cerchi, con regole e proporzioni misurate.
   - `reference/social.md`: post, caroselli, griglia del profilo.
   - `reference/video.md`: grafiche video, per esempio il TG studentesco (sigla, logo a schermo, sottopancia, titoli).
   - `reference/web.md`: redesign di siti e pagine, con variabili CSS e componenti.
   - `reference/tokens.css` e `reference/tokens.json`: tutti i valori pronti da usare.
3. Per il logo usa i vettoriali di `assets/vettoriali/` (ricostruzione non ufficiale, vedi `reference/logo.md`) o, quando disponibili, i file ufficiali forniti da AFOL. Non ridisegnarlo a mano.
4. Per le micrografiche (linea con anello, barra verticale, disco, catena, tappa) e per i modelli di post usa i file di `assets/micrografiche/` (vedi `reference/cerchi.md` e `reference/social.md`). Per misure diverse: `scripts/micrografiche.py` e `scripts/cerchi.py`; per rigenerare i vettoriali del logo, `scripts/logo_afol.py`.

## Grado di certezza

| Etichetta | Significato |
|---|---|
| **Ufficiale** | Dichiarato da AFOL: sito afolmet.it o linee guida grafiche interne per i documenti. |
| **Osservato** | Misurato o dedotto da logo, sito, post e profilo Instagram. Non viene da un manuale ufficiale: è una buona approssimazione da verificare quando possibile. |
| **Proposta** | Applicazione coerente con il marchio, suggerita dove AFOL non mostra esempi (per esempio grafiche video). |

Quando produci qualcosa basato su un valore Osservato o su una Proposta, non presentarlo come norma ufficiale AFOL.

## I valori essenziali

### Colori

| Ruolo | HEX | RGB | Fonte |
|---|---|---|---|
| **Rosso AFOL** (primario) | `#CC0000` | 204, 0, 0 | Ufficiale (linee guida documenti) |
| Grigio scuro, testi | `#333333` | 51, 51, 51 | Ufficiale |
| Grigio medio, note | `#666666` | 102, 102, 102 | Ufficiale |
| Grigio chiaro, fondi | `#F5F5F5` | 245, 245, 245 | Ufficiale |
| Grigio bordi | `#CCCCCC` | 204, 204, 204 | Ufficiale |
| Rosso misurato nel file del logo | `#CE1319` | 206, 19, 25 | Osservato |
| Rosso dell'icona social | `#D91A2A` | 217, 26, 42 | Osservato |
| Grigio del payoff nel logo | ≈ `#555555` | | Osservato |
| Fondo rosato dei post | ≈ `#FCF3F4` | | Osservato |

Usa `#CC0000` come rosso di riferimento. I rossi osservati servono solo per accostarsi a un materiale esistente che li usa (per esempio un'icona sul profilo). Non mescolare due rossi diversi nello stesso lavoro.

**Proporzione**: un solo colore forte e molti neutri. Il rosso comanda e si usa con parsimonia: linee, anelli, parole chiave, fondi pieni d'impatto. Niente secondo colore saturo, salvo nei sottomarchi che lo hanno già (il servizio DIL usa banner verdi).

Contrasti (WCAG 2.1):

| Coppia | Rapporto | Esito |
|---|---|---|
| `#CC0000` su bianco | 5,89 | AA per testo normale |
| Bianco su `#CC0000` | 5,89 | AA per testo normale |
| `#CC0000` su `#F5F5F5` | ≈ 5,4 | AA |
| `#333333` su bianco | 12,63 | AAA |
| `#666666` su bianco | 5,74 | AA |

### Carattere

- **Fira Sans** (Ufficiale per i documenti; Osservato su sito e materiali). Senza grazie, licenza libera SIL OFL, su Google Fonts:
  `https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;600;800;900&display=swap`
- Una sola famiglia, più pesi: 300 Light, 400 Regular, 600 SemiBold, 800 ExtraBold, 900 Black. La gerarchia nasce dal peso, non dal cambio di font.
- Nei post i titoli sono in **Fira Sans Black (900)**, con proporzioni naturali: verificato per sovrapposizione su «LAVORA CON NOI» (0,91), «Lombardia» (0,93) e «orientamento» (0,89). Sono in minuscolo per le frasi e in maiuscolo per le etichette brevi.
- Riserva: `Arial, Helvetica, sans-serif`. Fuori dal web i file woff2 sono nel pacchetto npm `@fontsource/fira-sans`.
- Il logo è costruito con caratteri esistenti (verifica per sovrapposizione sul file a 260 px, vedi `reference/logo.md`): «Afol» è Fira Sans ExtraBold allargato al 117% circa, il payoff è Fira Sans Bold; «METROPOLITANA» non è Fira e si avvicina a un bastoni geometrico come Montserrat ExtraBold. Per il logo usa comunque i file di `assets/vettoriali/`, non ricomporlo ogni volta.

### Voce

- Payoff (Ufficiale): **«Colleghiamo il lavoro»**. Prima persona plurale, verbo d'azione, tre parole.
- Titoli brevi in nero o grigio scuro con **una** parola chiave in rosso.
- Hashtag ufficiale: `#afolmet`.
- Valori e promessa in `reference/identita.md`.

### Il sistema dei cerchi

È il segno che rende AFOL riconoscibile prima ancora del nome: una linea con anelli, come una linea della metropolitana con le sue fermate. Nasce nel logo, sotto «METROPOLITANA», e torna in post, firme e griglie social. Sei regole (Osservato):

1. **Tratto uniforme**: la parete dell'anello è spessa quanto la linea.
2. **Colore**: rosso su fondi chiari o su foto; bianco su fondo rosso.
3. **Direzione**: solo orizzontale e verticale, con angoli retti.
4. **Scala**: piccolo come firma, enorme come elemento di sfondo.
5. **Bordo**: la linea entra dal bordo del formato e finisce in un anello.
6. **Ruolo**: separa il titolo, guida lo sguardo, collega più post, incornicia le persone.

Proporzioni misurate e quattro usi (logo, firma, cornice, percorso) in `reference/cerchi.md`.

## Regole da non violare

- Non ridisegnare, deformare, ruotare o ricolorare il logo, e non aggiungere ombre o contorni.
- Non usare i PNG a bassa risoluzione di `assets/` in grande: usa i vettoriali. Per stampe ufficiali dell'ente preferisci i file originali di AFOL, se esistono.
- Non usare diagonali o angoli diversi da 90° nelle linee del sistema dei cerchi.
- Non mettere il rosso su rosso, né testo rosso piccolo su foto.
- Non usare più di un rosso nello stesso lavoro.
- Non inventare dati, date, nomi di servizi o citazioni: usa segnaposto tra parentesi quadre e dichiarali.

## Procedura consigliata

1. Capisci il formato (web, post 1080×1080, video 1920×1080, slide, stampa) e apri il riferimento corrispondente.
2. Carica i token e Fira Sans.
3. Imposta griglia e margini, poi il segno dei cerchi, poi i testi, poi il logo.
4. Controlla: un solo rosso, contrasti in tabella, linee solo orizzontali o verticali, logo intatto, gerarchia fatta di pesi, nessun contenuto inventato spacciato per vero.
5. Mostra il risultato in uso e non solo su fondo bianco.
