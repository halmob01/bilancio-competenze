# Bilancio di competenze

**Quattro anni. Che cosa hai imparato?**

Applicazione statica per il bilancio riflessivo delle competenze degli studenti del quarto anno IeFP (Elettrico, Informatica, Estetica), con un doppio esito: un dossier di autovalutazione non valutativo e un breve testo per presentarsi agli open day.

**Prototipo V1, non ancora collaudato con studenti.** Implementa l'identità visiva proposta in [`design.md`](design.md); i contenuti didattici sono una prima stesura da rivedere con i docenti dei tre indirizzi.

## Il percorso

| | Sezione | Schermate |
|---|---|---|
| 01 | Il tuo percorso | indirizzo, nome e classe facoltativi; quattro anni e tirocinio in poche righe |
| 02 | Le esperienze che ricordi | schede esperienza: quando, contesto, azione, prova, difficoltà, aiuto, autonomia |
| 03 | Che cosa so fare | sei situazioni comuni ai tre indirizzi: capire, fare, collaborare, verificare, spiegare, migliorare |
| 04 | Uno sguardo critico | scuola, tirocinio, che cosa devo ancora imparare |
| 05 | Bilancio | dossier: So fare / Ho imparato così / Posso dimostrarlo / Devo ancora imparare |
| 06 | Orientamento | quattro domande guida, poi il testo per l'open day |

Regole didattiche applicate (da `design.md` §9):

- **Nessuna competenza dichiarata con un solo click.** Se lo studente dice di saper fare qualcosa, serve un esempio scritto o un'esperienza collegata; altrimenti la voce compare nel bilancio come «da documentare».
- **«Non l'ho mai affrontato» è distinto da «Non lo so ancora fare»** e finisce in una parte diversa del dossier.
- **Esempi filtrati per indirizzo, categorie comuni.** Gli esempi si aprono a richiesta e sono sempre etichettati come esempi.
- **Nessuna riscrittura automatica.** La bozza per l'open day mette in fila le risposte dello studente senza cambiarle.
- Nessun punteggio, badge, classifica o colore diverso per indirizzo.

## Dati e privacy

- Le risposte restano nel `localStorage` del browser (`bilancio-competenze-v1`), con salvataggio automatico dichiarato nella testata («Salvato alle 10:42»).
- Da «Le tue risposte»: **scarica una copia** (file `.json`), **carica una copia** per riprendere su un altro dispositivo, **stampa o salva in PDF** il dossier, **cancella** le risposte dal browser.
- Nessuna richiesta di rete: font self-hosted, nessuno script esterno, nessuna telemetria.
- La consegna in **Google Drive controllato dal docente** (design.md §9) per ora è manuale: lo studente carica il file scaricato nella cartella indicata. L'integrazione diretta richiede prima una decisione su autenticazione e permessi; vedi [docs/STATO-PROTOTIPO.md](docs/STATO-PROTOTIPO.md).
- La dettatura **non** è implementata: è una funzione futura condizionata a una verifica della privacy.

## Struttura

- `index.html` — scheletro della pagina, testata e dialoghi.
- `js/dati.js` — contenuti: sezioni, situazioni, esempi per indirizzo, scala di autonomia, domande.
- `js/bilancio.js` — logica pura: stato, normalizzazione dei dati caricati, completamento delle sezioni, composizione del dossier e della bozza.
- `js/app.js` — interfaccia; costruisce il DOM con nodi e `textContent`.
- `css/tokens.css` — token di `design.md` §10 (palette Babel, tipografia e griglia di sito-filosofia) e `@font-face`.
- `css/stile.css` — componenti e stampa.
- `fonts/` — Anton, Geist, Geist Mono, EB Garamond (sottoinsieme latino, SIL Open Font License; licenze accanto ai file).

## Prova e verifica

```sh
python3 -m http.server 8000
```

```sh
node --test tests/*.test.cjs
```

La CI controlla la sintassi ed esegue i test (contenuti, regola dell'esempio obbligatorio, distinzione «mai» / «non ancora», normalizzazione delle copie caricate, assenza di risorse remote e di `innerHTML`). Il percorso completo è stato inoltre provato in Chromium a 390×844 e 1440×900, compresa la ripresa dopo il ricaricamento e l'anteprima di stampa. **Non equivale a una prova con studenti su dispositivi reali.**

## Documentazione

- [Identità visiva V1](design.md)
- [Stato del prototipo e decisioni aperte](docs/STATO-PROTOTIPO.md)
