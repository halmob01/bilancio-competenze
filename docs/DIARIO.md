# Diario di bordo del tirocinio (prototipo)

Un secondo sito, in `diario/`, con la stessa grafica del bilancio. Lo studente scrive **una scheda a settimana** durante il tirocinio: che cosa ha fatto, che cosa ha imparato, che cosa è stato difficile, chi lo ha aiutato, su quali obiettivi ha lavorato e come è andata la settimana.

- **Indirizzo:** `…/bilancio-competenze/diario/` (stesso indirizzo del bilancio, percorso diverso). Per gli studenti è un sito a parte: **non ci sono pulsanti** per passare dall'uno all'altro.
- **Passi:** 01 I tuoi tirocini (azienda, periodo, ore, obiettivi), 02 Le settimane, 03 Il diario (riepilogo da stampare o salvare in PDF).
- **Più tirocini:** fino a 5, ognuno con le sue settimane; la settimana proposta è sempre quella dopo l'ultima.
- **Dettatura:** per ora con il microfono della tastiera del telefono (la scheda lo ricorda); una dettatura dentro l'app, che conservi solo il testo, è una funzione futura che dipende dal backend e dalla privacy.
- **Salvataggio:** sul dispositivo (`localStorage`, chiave `diario-tirocinio-v1`) più copia `.json` da scaricare e ricaricare. Nessuna richiesta di rete. Il salvataggio nelle cartelle della scuola arriverà con il backend.
- **Nessun tutor aziendale:** i soggetti sono lo studente e, più avanti, la scuola.

## Come i due siti comunicano

Stanno sullo stesso indirizzo, quindi il browser li tratta come lo stesso sito e ognuno può **leggere** il salvataggio dell'altro. Non servono link né server. **Non funzionerebbe con due sottodomini diversi** (`bilancio.scuola.it` e `diario.scuola.it`): vanno tenuti sotto lo stesso indirizzo, con percorsi diversi, oppure serve il backend.

| Dal sito | Legge | Salvataggio letto | Che cosa ne ricava |
|---|---|---|---|
| Diario | Bilancio | `bilancio-competenze-v1` | Gli obiettivi («Devo ancora imparare»: sguardo critico e situazioni «Non lo so ancora fare»), i ricordi scritti sul tirocinio e i titoli delle esperienze di tirocinio. Con «Proponi dal mio bilancio» gli obiettivi si riprendono in un clic. |
| Bilancio | Diario | `diario-tirocinio-v1` | Nella sezione «Le esperienze che ricordi» propone una scheda esperienza per ogni tirocinio, con titolo, contesto e le parole delle settimane (cosa ho fatto, difficoltà, aiuto). La scheda si crea solo se lo studente preme il pulsante e poi si rilegge e si corregge. Non si creano doppioni. |

Regole del contratto:
- **Si legge e basta:** un sito non scrive mai nel salvataggio dell'altro.
- **Solo il necessario:** il diario non legge mai il curriculum (recapiti, foto, data di nascita). Un test lo verifica.
- **Dati non fidati:** ciascun sito rilegge i dati dell'altro con le proprie regole di controllo (tipi, lunghezze, caratteri), come per una copia caricata da file.
- **Versioni:** entrambi i salvataggi hanno `versione: 1`; se cambiano forma si aggiorna la lettura nell'altro sito.

## Forma dei dati del diario

```
{ versione: 1, aggiornato, corrente,
  tirocini: [ { id, azienda, citta, dal, al, ore, obiettivi: [testo],
    settimane: [ { id, dal, giorni: [lun..sab], ore, fatto, imparato, difficolta, aiuto, umore, obiettivi: [testo], note } ] } ] }
```

## Che cosa manca (idee per la prossima fase)

Dettatura nell'app che conservi solo il testo, salvataggio nelle cartelle della scuola, accesso con l'account scolastico, esportazione in Word e PDF come per il curriculum, vista per il docente. Vedi le note sul backend in [STATO-PROTOTIPO.md](STATO-PROTOTIPO.md).
