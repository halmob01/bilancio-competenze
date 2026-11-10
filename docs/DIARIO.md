# Diario di bordo del tirocinio (prototipo)

Un secondo sito, in `diario/`, con la stessa grafica del bilancio. Lo studente scrive **una scheda a settimana** durante il tirocinio: che cosa ha fatto, che cosa ha imparato, che cosa è stato difficile, chi lo ha aiutato, su quali obiettivi ha lavorato e come è andata la settimana. Gli studenti fanno 8 ore al giorno: **le ore non si chiedono**.

- **Indirizzo:** `…/bilancio-competenze/diario/` (stesso indirizzo del bilancio, percorso diverso). Per gli studenti è un sito a parte. Dal 10 novembre 2026 c'è una pagina iniziale con tre card (diario, bilancio, curriculum) e la testata ha il link «Tutti i percorsi»; resta la scelta di non avere pulsanti diretti da un sito all'altro (il link porta sempre alla pagina iniziale). Sostituisce la decisione precedente («nessun pulsante»).
- **Passi:** 01 I tuoi tirocini (azienda, città, periodo, obiettivi), 02 Le settimane (assenze o ritardi con i giorni scelti e se sono stati comunicati ai tutor, testi, come è andata), 03 Il diario (riepilogo da stampare o salvare in PDF).
- **Più tirocini:** fino a 12 (il numero cambia da studente a studente), ognuno con le sue settimane; la settimana proposta è sempre quella dopo l'ultima.
- **Dettatura:** per ora con il microfono della tastiera del telefono (la scheda lo ricorda); una dettatura dentro l'app, che conservi solo il testo, è una funzione futura che dipende dal backend e dalla privacy.
- **Salvataggio:** sul dispositivo (`localStorage`, chiave `diario-tirocinio-v1`) più copia `.json` da scaricare e ricaricare. Nessuna richiesta di rete. Il salvataggio nelle cartelle della scuola arriverà con il backend.
- **Nessun tutor aziendale:** i soggetti sono lo studente e, più avanti, la scuola.

## Come il bilancio e il curriculum importano il diario

Il **diario è indipendente**: non legge nulla dal bilancio. Sono il **bilancio** (`/bilancio/`) e il **curriculum** (`/cv/`, un sito a parte dal 10 novembre 2026) a importare i tirocini di *quel* studente dal suo diario, in due modi:

1. **Stesso dispositivo.** I siti stanno sullo stesso indirizzo, quindi il browser li tratta come lo stesso sito e il bilancio e il curriculum leggono da soli il salvataggio del diario (`diario-tirocinio-v1`). Non servono link né server.
2. **Da file.** Se il diario è stato scritto su un altro dispositivo, nel bilancio o nel curriculum si carica la copia `.json` del diario («Carica la copia di un diario»). Il file resta in memoria e non viene salvato. È lo stesso passaggio che in futuro farà il backend, riconoscendo lo studente.

| Dove | Che cosa propone | Che cosa crea |
|---|---|---|
| Bilancio, sezione «Le esperienze che ricordi» | Un tirocinio per volta | Una scheda esperienza con titolo, contesto e le parole delle settimane (cosa ho fatto, difficoltà, aiuto) |
| Curriculum, schermata «Le esperienze di lavoro» | Un tirocinio per volta | Una voce di tipo «Tirocinio» con azienda, città, periodo (mesi) e come compiti le cose fatte, una riga per settimana (da accorciare); la **mansione** non c'è nel diario e la scrive lo studente |

Regole del contratto:
- **Si legge e basta:** il bilancio e il curriculum non scrivono mai nel salvataggio del diario e il diario non legge né il bilancio né il curriculum.
- **Solo se lo studente preme il pulsante:** la scheda o la voce si creano su richiesta, poi lo studente le rilegge e le corregge. Non si creano doppioni.
- **Dati non fidati:** il bilancio rilegge il diario con le proprie regole di controllo (tipi, lunghezze, date), come per una copia caricata da file. Un file sbagliato viene rifiutato con un messaggio.
- **Versioni:** il diario ha `versione: 1`; se cambia forma si aggiorna la lettura nel bilancio.
- **Non funziona con più sottodomini** (`bilancio.scuola.it`, `cv.scuola.it` e `diario.scuola.it`): vanno sotto lo stesso indirizzo con percorsi diversi, oppure si importa da file o dal backend.

## Forma dei dati del diario

```
{ versione: 1, aggiornato, corrente,
  tirocini: [ { id, azienda, citta, dal, al, obiettivi: [testo],
    settimane: [ { id, dal, assenzeGiorni: [lun..sab], assenze, comunicato, fatto, imparato, difficolta, aiuto, umore, obiettivi: [testo], note } ] } ] }
```

## Che cosa manca (idee per la prossima fase)

Dettatura nell'app che conservi solo il testo (metodo scelto in [FUTURO.md](FUTURO.md)), salvataggio nelle cartelle della scuola, accesso con l'account scolastico, esportazione in Word e PDF come per il curriculum, vista per il docente. Vedi le note sul backend in [STATO-PROTOTIPO.md](STATO-PROTOTIPO.md).
