# Raccogliere le risposte in un Foglio Google

Le risposte arrivano in un Foglio Google del docente, una riga per studente. Se uno studente corregge e invia di nuovo, la sua riga viene aggiornata e non duplicata: l'app genera sul dispositivo un codice anonimo che identifica la riga.

La configurazione si fa una volta sola, in circa dieci minuti.

## 1. Creare il foglio e lo script

1. Con l'account Google della scuola, crea un nuovo Foglio Google, per esempio «Bilancio di competenze 2026-27».
2. Dal foglio apri **Estensioni → Apps Script**.
3. Cancella il contenuto di `Codice.gs` e incolla tutto il file [`apps-script/Codice.gs`](../apps-script/Codice.gs) di questa repository. Salva.

## 2. Pubblicarlo come applicazione web

1. In Apps Script premi **Esegui il deployment → Nuovo deployment**.
2. Tipo: **Applicazione web**.
3. **Esegui come:** «Me» (il docente). Lo script scrive nel foglio con i tuoi permessi.
4. **Chi ha accesso:** «Chiunque». Serve perché gli studenti inviano dall'app senza accedere con un account. Gli studenti non vedono il foglio: possono solo aggiungere o aggiornare la propria riga.
5. Premi **Esegui il deployment** e autorizza lo script. Google mostra un avviso perché lo script non è verificato: è il tuo script, puoi proseguire da «Avanzate».
6. Copia l'**URL dell'applicazione web**, che termina con `/exec`.

Per verificare che funzioni, apri l'URL nel browser: deve comparire `{"ok":true,"servizio":"bilancio-competenze"}`.

## 3. Collegare l'app

Nel file [`js/config.js`](../js/config.js) incolla l'URL:

```js
window.BC_CONFIG = {
  urlInvio: 'https://script.google.com/macros/s/XXXXXXXX/exec'
};
```

Dopo il commit su `main`, GitHub Pages pubblica la nuova versione in uno o due minuti. Nell'app compare il pulsante **Invia al docente** in tre punti: nel dialogo «Le tue risposte», nella schermata del bilancio e nell'ultima schermata.

## Che cosa contiene il foglio

Nel foglio «Risposte» (creato al primo invio), con le prime tre colonne bloccate:

- ricevuto, codice, nome, classe, indirizzo, ultima modifica;
- i ricordi dei quattro anni e del tirocinio;
- numero di esperienze e testo di tutte le schede;
- per ognuna delle sei situazioni: livello, esempio (con le esperienze collegate) e come l'ha imparato / che cosa serve;
- scuola, tirocinio, che cosa devo ancora imparare;
- le quattro risposte di orientamento e il testo per l'open day;
- l'ultima colonna con tutti i dati in JSON, da cui si può ricostruire la copia dello studente.

I testi che iniziano con `=`, `+`, `-` o `@` sono salvati come testo, non come formule.

## Riepilogo di classe

La scheda «Riepilogo» si crea al primo invio (o all'apertura del foglio) e si aggiorna da sola, perché contiene formule. Per ogni gruppo (tutti gli indirizzi, Elettrico, Informatica, Estetica) mostra quanti studenti hanno inviato e, per ognuna delle sei situazioni, quanti hanno scelto ciascun livello e quanti non hanno risposto.

Per vedere una sola classe scrivi la classe nella cella **B3**, esattamente come la scrivono gli studenti (per esempio `4B`); lascia vuoto per tutte.

## Scheda studente

Nella scheda «Scheda studente» scegli un nome dal menu a tendina in **B1**: sotto compare il suo bilancio impaginato (So fare, da documentare, Ho imparato così, Posso dimostrarlo, Devo ancora imparare, Non l'ho mai affrontato, lo sguardo critico su scuola e tirocinio, il testo per l'open day). Le regole sono le stesse dell'app. Per stamparla: File → Stampa.

Se lo stesso nome compare in più righe (per esempio perché lo studente ha cambiato dispositivo), viene mostrato l'invio più recente con un avviso.

## Il menu «Bilancio»

All'apertura del foglio compare il menu **Bilancio** con due voci: aggiornare la scheda dello studente scelto (utile se ha appena inviato di nuovo) e ricreare il riepilogo (se lo hai modificato per errore; il filtro in B3 viene conservato). La prima volta Google chiede di autorizzare lo script.

## Se modifichi lo script

Dopo una modifica a `Codice.gs` (anche per passare a una versione nuova di questa repository) incolla il nuovo codice, salva, poi usa **Esegui il deployment → Gestisci deployment → Modifica → Nuova versione**: l'URL resta lo stesso. Un «Nuovo deployment» invece crea un URL diverso, da rimettere in `js/config.js`.

## Privacy e limiti

- I dati vanno solo nel foglio del docente: nessun altro servizio, nessuna telemetria. Prima dell'invio, le risposte restano nel browser dello studente.
- Per l'invio servono nome e indirizzo, altrimenti il docente non saprebbe di chi è la riga. La classe è facoltativa ma consigliata.
- L'URL `/exec` è pubblico: chi lo conosce potrebbe inviare righe false. Lo script accetta solo dati nel formato dell'app, ne limita la dimensione e rifiuta gli invii senza nome. Se serve di più, si può aggiungere un codice di classe da dettare in aula.
- Uno studente che cambia dispositivo senza caricare la propria copia genera un nuovo codice, quindi una seconda riga: in quel caso basta cancellare la riga più vecchia.
- Al termine dell'anno conviene archiviare il foglio e ritirare il deployment (**Gestisci deployment → Archivia**).
