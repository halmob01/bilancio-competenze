# Bilancio di competenze

**Che cosa hai imparato finora?**

Applicazione statica per gli studenti IeFP di tutti gli anni (Elettrico, Informatica, Estetica), fatta di **tre siti sullo stesso indirizzo** e una pagina iniziale che li presenta:

| Indirizzo | Sito | A che cosa serve |
|---|---|---|
| `/` | Pagina iniziale | tre card per scegliere il percorso |
| `/diario/` | Diario di bordo | una scheda a settimana durante il tirocinio ([docs/DIARIO.md](docs/DIARIO.md)) |
| `/bilancio/` | Bilancio di competenze | il bilancio riflessivo, con un doppio esito: un dossier di autovalutazione non valutativo e un breve testo per presentarsi agli open day |
| `/cv/` | Curriculum | il foglio da consegnare a un'azienda, in Word, PDF o stampa; può prendere nome, esperienze e competenze dal bilancio e i tirocini dal diario |

Ogni sito ha il suo salvataggio sul dispositivo e la testata ha il link «Tutti i percorsi» verso la pagina iniziale (sul telefono, dove la testata è piena, il link sta nella schermata iniziale di ogni sito). I siti restano separati: si parlano solo leggendo, su richiesta dello studente, i dati salvati dagli altri nello stesso browser (o da una copia `.json` caricata), senza mai scriverci.

**Prototipo V1, non ancora collaudato con studenti.** Implementa l'identità visiva proposta in [`design.md`](design.md); i contenuti didattici sono una prima stesura da rivedere con i docenti dei tre indirizzi.

## Il bilancio (`/bilancio/`)

Il curriculum non è più una sezione del bilancio (fino al 10 novembre 2026 era la sezione 06): è il sito `/cv/`, descritto sotto.

| | Sezione | Schermate |
|---|---|---|
| 01 | Il tuo percorso | anno frequentato, indirizzo, nome e classe; gli anni già vissuti e il tirocinio in poche righe (il percorso mostra solo gli anni fino a quello frequentato) |
| 02 | Le esperienze che ricordi | schede esperienza: quando, contesto, azione, prova, difficoltà, aiuto, autonomia |
| 03 | Che cosa so fare | una schermata con sei situazioni comuni ai tre indirizzi: capire, fare, collaborare, verificare, spiegare, migliorare |
| 04 | Uno sguardo critico | scuola, tirocinio, che cosa devo ancora imparare |
| 05 | Bilancio | dossier: So fare / Ho imparato così / Posso dimostrarlo / Devo ancora imparare |
| 06 | Orientamento | quattro domande guida, poi il testo per l'open day |

Regole didattiche applicate (da `design.md` §9):

- **Nessuna competenza dichiarata con un solo click.** Se lo studente dice di saper fare qualcosa, serve un esempio scritto o un'esperienza collegata; altrimenti la voce compare nel bilancio come «da documentare».
- **«Non l'ho mai affrontato» è distinto da «Non lo so ancora fare»** e finisce in una parte diversa del dossier.
- **Esempi filtrati per indirizzo, categorie comuni.** Gli esempi si aprono a richiesta e sono sempre etichettati come esempi.
- **Nessuna riscrittura automatica.** La bozza per l'open day mette in fila le risposte dello studente senza cambiarle.
- Nessun punteggio, badge, classifica o colore diverso per indirizzo.

## Il curriculum (`/cv/`)

Sei passi: i tuoi dati (nome, indirizzo di studio, recapiti, foto), che lavoro cerchi e profilo, formazione, tirocini e lavori (tipo, azienda, città, date, mansione, compiti; quante voci servono), competenze, lingue e interessi, anteprima con Word, PDF e stampa su A4.

- Il curriculum usa solo le parole dello studente. Dal bilancio, solo se lo studente lo chiede, prende nome e indirizzo di studio, il testo delle schede esperienza e, con «Proponi dalle mie risposte», una frase di competenza solo per le situazioni dichiarate **e** documentate con un esempio. Il bilancio viene letto (dal salvataggio di questo browser o da una copia `.json`) e non viene mai modificato.
- **Il curriculum non viene inviato a nessuno**, nemmeno al docente: contiene recapiti personali (indirizzo, telefono, email, foto) e resta sul dispositivo, da stampare, scaricare in Word o in PDF. Si salva nella chiave `cv-v1` del `localStorage`.
- **Chi aveva già scritto il curriculum nel bilancio non perde niente**: il primo sito aperto (bilancio o curriculum) lo mette al sicuro in `cv-v1`; anche una vecchia copia `.json` del bilancio si può caricare nel curriculum.

- Prima di stampare lo studente può scegliere il **modello** (Contemporaneo, predefinito; Classico, con l'ordine e i titoli del modello della scuola; Europass, con la struttura del formato europeo: intestazione anagrafica, esperienza lavorativa, istruzione e formazione, tabella delle lingue compilata dalle scelte dello studente (frasi in italiano semplice, il livello europeo da A1 a C2 si vede solo nella tabella), patente, blu ufficiale e logo Europass in testa, in `img/europass-logo.png`), il **colore dei titoli** (sette colori leggibili in stampa), **carattere** (moderno, elegante, semplice) e **dimensione**, aggiungere luogo, data e riga per la firma e **correggere il testo direttamente sul foglio**. Le correzioni valgono per la stampa e restano finché i dati non cambiano; le parole fra due asterischi (**così**) vanno in grassetto.


## Online e raccolta dei dati

- **Indirizzo pubblico:** GitHub Pages, ramo `main`, cartella radice: `https://halmob01.github.io/bilancio-competenze/` (pagina iniziale); il bilancio è in `…/bilancio/`. Chi ha il vecchio indirizzo del bilancio vede ora le tre card e sceglie. I dati salvati non cambiano perché l'origine (`halmob01.github.io`) è la stessa.
- **Raccolta in un Foglio Google del docente:** lo studente preme «Invia al docente» nel **bilancio** e le risposte arrivano in una riga del foglio; se corregge e invia di nuovo, la riga si aggiorna. Il collegamento passa da uno script Apps Script del docente (`apps-script/Codice.gs`) il cui URL va in `js/config.js`. Istruzioni passo per passo: [docs/FOGLIO-GOOGLE.md](docs/FOGLIO-GOOGLE.md).
- Finché `urlInvio` è vuoto, il pulsante di invio non compare e resta solo la copia da scaricare.

## Dati e privacy

- Prima dell'invio le risposte restano nel `localStorage` del browser (`bilancio-competenze-v1`), con salvataggio automatico dichiarato nella testata («Salvato alle 10:42»). Il curriculum ha la sua chiave (`cv-v1`) e il diario la sua (`diario-tirocinio-v1`).
- L'unica richiesta di rete verso l'esterno è l'invio del bilancio al foglio configurato (il curriculum e il diario non inviano niente; il curriculum legge solo i caratteri del sito per il Word e il PDF). Font self-hosted, nessuno script esterno, nessuna telemetria.
- Per l'invio servono nome e indirizzo; l'app genera un codice anonimo per riconoscere la riga dello studente.
- Da «Le tue risposte»: invia al docente, **scarica una copia** (file `.json`), **carica una copia** per riprendere su un altro dispositivo, **stampa o salva in PDF** il dossier, scarica il curriculum **in Word o in PDF** (entrambi si generano nel browser con i caratteri incorporati e riproducono il modello scelto, comprese le correzioni scritte sul foglio), **cancella** le risposte dal browser.
- La dettatura **non** è implementata: è una funzione futura condizionata a una verifica della privacy.

## Struttura

- `index.html` — pagina iniziale con le tre card (senza script).
- `bilancio/index.html`, `cv/index.html`, `diario/index.html` — scheletro, testata e dialoghi di ciascun sito.
- `js/config.js` — URL dell'applicazione web Apps Script per l'invio.
- `js/dati.js` — contenuti: sezioni, situazioni, esempi per indirizzo, scala di autonomia, domande.
- `js/bilancio.js` — logica pura: stato, normalizzazione dei dati caricati, completamento delle sezioni, composizione del dossier e della bozza.
- `js/cv.js` — logica pura del curriculum: stato proprio, normalizzazione, composizione del foglio, importazione dal bilancio, passaggio dei vecchi dati.
- `js/docx.js` — creazione del file Word (.docx) del curriculum, con i caratteri incorporati; senza librerie né richieste di rete.
- `js/pdf.js` — creazione del PDF del curriculum, con i caratteri incorporati e il testo selezionabile, senza passare dalla stampa.
- `fonts/ttf/` — sottoinsiemi latini dei caratteri (Fira Sans, Anton, EB Garamond, Liberation Sans) per incorporarli in Word e PDF.
- `js/app.js` — interfaccia del bilancio; `cv/js/app.js` — interfaccia del curriculum (anteprima, Word, PDF); `diario/js/app.js` — interfaccia del diario. Costruiscono il DOM con nodi e `textContent`.
- `css/tokens.css` — token di `design.md` §10 (palette Babel, tipografia e griglia di sito-filosofia) e `@font-face`.
- `css/stile.css` — componenti e stampa.
- `apps-script/Codice.gs` — script da incollare nel Foglio Google del docente.
- `fonts/` — Anton, Fira Sans, EB Garamond (sottoinsieme latino, SIL Open Font License; licenze accanto ai file).

## Prova e verifica

```sh
python3 -m http.server 8000
```

```sh
node --test tests/*.test.cjs
```

La CI controlla la sintassi ed esegue i test (contenuti, regola dell'esempio obbligatorio, distinzione «mai» / «non ancora», normalizzazione delle copie caricate, unica richiesta di rete verso il foglio configurato, assenza di `innerHTML`; lo script Apps Script è eseguito con un foglio simulato di 26 colonne: intestazioni, riepilogo senza formule, aggiornamento della riga, rifiuto degli invii non validi, testi che sembrano formule). Il percorso completo è stato inoltre provato in Chromium a 390×844 e 1440×900, compresa la ripresa dopo il ricaricamento e l'anteprima di stampa. **Non equivale a una prova con studenti su dispositivi reali.**

## Documentazione

- [Guida breve con screenshot](docs/GUIDA.md)
- [Diario di bordo del tirocinio e collegamento con bilancio e curriculum](docs/DIARIO.md)
- [Aggiornamenti futuri](docs/FUTURO.md): dettatura vocale, backend di rete, script del foglio
- [Identità visiva V1](design.md)
- [Raccogliere le risposte in un Foglio Google](docs/FOGLIO-GOOGLE.md)
- [Stato del prototipo e decisioni aperte](docs/STATO-PROTOTIPO.md)
