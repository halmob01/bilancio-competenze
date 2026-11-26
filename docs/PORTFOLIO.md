# Le mie attività (portfolio)

Sito `/portfolio/`, fase F2 del piano (`docs/PIANO-PORTALE.md` §7). Prima versione del 26 novembre 2026.

## Che cos'è

L'archivio delle cose fatte. Ogni volta che finisce un lavoro in laboratorio o in tirocinio, lo studente aggiunge un'attività: da una a quattro foto, che cosa ha fatto con le sue parole, dove e quando, da una a tre competenze del suo percorso. Il bilancio di competenze poi **sceglie** da qui invece di far scrivere da zero.

## Decisioni (26 novembre 2026)

| Tema | Decisione |
|---|---|
| Ordine | **Prima sul dispositivo**: attività e foto salvate nel browser, come gli altri siti. Il collegamento al server arriva con F1 (`archivio.js`). |
| Nome | **«Le mie attività»** nella pagina iniziale e nella testata; il percorso resta `/portfolio/`. |
| Competenze | Dagli **allegati B2 della Regione Lombardia** (DGR 3192/2020; la DGR 4615/2025 non tocca le nostre figure). Dal I al III anno la figura di qualifica, al IV quella di diploma più le competenze del III. Tutti gli indirizzi interni (elettrico: civili, industriali e terziario, impianti speciali, cablaggio; tecnico elettrico: impianti civili/industriali e building automation; tecnico informatico: sistemi e reti, sviluppo ICT). |
| Linguaggio | Lo studente vede **solo la frase semplice**. Il testo ufficiale resta nel catalogo (`js/competenze.js`) per i documenti e i docenti. Le frasi semplici sono una prima stesura **da rivedere con i docenti** di ogni indirizzo (`RIVISTO = false`). |
| Indirizzo interno | Non si chiede allo studente il nome tecnico del suo indirizzo: le competenze sono raggruppate in «In ogni lavoro», «Nel tuo mestiere» e «Se lavori su…». |
| Collegamenti | Diario → attività, attività → bilancio, PDF delle attività. Attività → curriculum: più avanti. |
| Privacy delle foto | **Solo un avviso**, sempre visibile nella prima schermata e nel passo delle foto: fotografa il lavoro, non le persone; niente volti, documenti o schermi con dati di clienti; in azienda chiedi prima al tutor; per Estetica inquadra solo la zona trattata. Nessuna casella da spuntare. |

## Come funziona

**Un'attività in quattro passi** (pensati per il telefono, si salta tutto quello che non serve):
1. **Le foto**: «Scatta una foto» (apre la fotocamera) o «Scegli dalla galleria»; al massimo quattro; la prima è la copertina.
2. **Che cosa hai fatto**: una o due frasi che cominciano con un verbo; esempio del proprio indirizzo; lo stesso avviso di vaghezza del bilancio (`L.vaghezza`), che suggerisce e non blocca.
3. **Dove e quando**: a scuola o in laboratorio, in tirocinio (con le aziende del diario come suggerimento), fuori da scuola; luogo preciso facoltativo; data proposta oggi.
4. **Che cosa sai fare**: indirizzo e anno chiesti una volta sola (o presi dal bilancio con un tocco), poi da una a tre competenze; difficoltà e aiuto facoltativi.

Un'attività lasciata del tutto vuota non viene conservata.

**Home**: fascia rossa con «+ Nuova attività» e, se nel diario ci sono settimane compilate, «Prendi dal diario»; sotto, le miniature dalla più recente, con i filtri per luogo e per competenza. Ogni attività ha una scheda con le foto grandi, il testo e le competenze, da cui si modifica o si elimina.

**Foto**: ridotte nel browser prima di salvarle (lato lungo 1280 pixel, JPEG di qualità 0,8, più una miniatura da 320). La foto viene ridisegnata, quindi perde i dati nascosti dell'originale (posizione GPS, modello del telefono). Stanno in IndexedDB (`portfolio-foto`), non nel `localStorage`. All'avvio si tolgono le foto che nessuna attività usa più.

**Salva e scarica**: PDF delle attività (con le foto, in Fira Sans), copia `.json` con le foto dentro (per passare a un altro dispositivo), caricamento di una copia, cancellazione di tutto.

## Dati

- `localStorage`, chiave `portfolio-attivita-v1`: `{ versione: 1, aggiornato, profilo: { indirizzo, anno }, attivita: [...] }`.
- Un'attività: `{ id, fatto, luogo, dove, data, competenze: [id], difficolta, aiuto, foto: [id], diario: { tirocinio, settimana } | null }`.
- IndexedDB `portfolio-foto`, archivio `foto`: `{ id, jpeg (Blob), mini (Blob), w, h, creata }`.
- La copia `.json` aggiunge `foto: { id: { jpeg, mini, w, h } }` in base64; al caricamento si accettano solo JPEG e identificativi validi.

## Collegamenti con gli altri siti

Le regole del piano (§6): si importa solo su richiesta, la sorgente non viene mai modificata, i dati letti vengono ricontrollati.

- **Diario → attività** (`A.proposteDalDiario`): una proposta per ogni settimana con «Che cosa hai fatto» compilato; diventa un'attività in tirocinio con testo, data, azienda, difficoltà e aiuto. Le settimane già portate sono segnate.
- **Attività → bilancio** (`L.esperienzeDalPortfolio`, in `js/bilancio.js`): nella schermata «Che cosa hai fatto» il riquadro «Dalle tue attività» propone le attività descritte; il testo diventa una cosa fatta, con la prova «N foto in Le mie attività». La cosa fatta tiene il riferimento all'attività (campo `attivita`), così non si inserisce due volte. Le foto restano nel portfolio.

## File

- `portfolio/index.html`, `portfolio/js/app.js` (interfaccia), `portfolio/js/attivita.js` (logica pura), `portfolio/js/foto.js` (riduzione e IndexedDB).
- `js/competenze.js`: catalogo delle competenze, condiviso.
- `js/pdf.js`: blocco `foto` e impaginazione `portfolio` (il curriculum non cambia).
- `docs/fonti/`: allegati B2 (qualifiche e diplomi) e DGR 4615/2025, scaricati dal sito della Regione Lombardia il 26 novembre 2026.
- Test: `tests/portfolio.test.cjs`.

## Da fare

- Far rivedere le frasi semplici ai docenti dei tre indirizzi, poi `RIVISTO = true`.
- Collegamento al server (F1): un tipo di documento `portfolio` nel programma, e il caricamento delle foto (fino a 400 KB l'una, 200 MB per studente, servite solo con permesso).
- Attività → curriculum (sezione «Lavori svolti», competenze documentate).
- Provare su iPhone (HEIC dalla galleria) e su un telefono Android economico (memoria nella riduzione di foto grandi).
- Conferma del docente «ho visto questo lavoro» (F5).
