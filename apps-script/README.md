# Apps Script + Google Sheets — integrazione V1

Questa è **una base funzionante** per autenticazione tramite codice, lettura privata e salvataggio delle sei sezioni. NON è ancora l'esperienza didattica completa, né include la generazione automatica dei documenti.

## Risorsa creata nel Drive collegato
Google Sheets: https://docs.google.com/spreadsheets/d/11FPoL-ZhRVF_A6wBEQ0hFfB7D-Ot8mmKr3kF-2a5cJ8/edit

Schede: LEGGIMI, Config, Classi, Studenti, Risposte, Elaborati, Eventi. Non condividere il foglio con gli studenti.

## Attivazione da account proprietario
1. Aprire il foglio e scegliere **Estensioni > Apps Script**.
2. Incollare il contenuto di \`apps-script/Code.gs\` nel progetto Apps Script.
3. Creare un file HTML chiamato esattamente **Index** e incollare \`apps-script/Index.html\`.
4. In **Impostazioni progetto > Proprietà script**, aggiungere **SPREADSHEET_ID** con valore \`11FPoL-ZhRVF_A6wBEQ0hFfB7D-Ot8mmKr3kF-2a5cJ8\`.
5. Eseguire \`adminHealthcheck\` dall'editor e autorizzare lo script. Verificare il risultato in log.
6. Eseguire \`adminCreateDemo\` dall'editor. Annotare privatamente il codice apparso nei log; non pubblicarlo.
7. **Distribuisci > Nuova distribuzione > App web**; esegui come proprietario; seleziona il pubblico ristretto appropriato alla scuola. NON pubblicare finché permessi e policy dati non sono stati verificati.
8. Aprire il link di web app da browser in incognito, accedere con il codice demo, compilare, salvare, cambiare sezione, chiudere e riaprire. Ispezionare il foglio: le risposte devono comparire in \`Risposte\`.

## Sicurezza / limiti
- I codici sono conservati come SHA-256 con salt; i token temporanei vivono in CacheService (6 ore). Il token non va nei link, nei log o nel foglio.
- Il server non accetta student_id dal client per consultare o scrivere risposte: deriva sempre l'identità dalla sessione.
- Script Properties e Spreadsheet ID non sostituiscono un modello di autorizzazione: eseguire come proprietario con accesso 'Chiunque' espone login a chiunque conosca l'URL; per dati reali scegliere la restrizione più stretta compatibile con gli account degli studenti.
- Google Apps Script e Google Sheets sono servizi Google: l'impegno 'solo Drive' va inteso come **nessun servizio terzo o database esterno**, non come impossibilità per Google di elaborare dati durante il funzionamento.
- I codici d'accesso sono credenziali, vanno distribuiti in modo riservato; cambiare codice/revocare credenziali è ancora una funzione amministrativa da implementare.
- \`adminCreateDemo\` serve esclusivamente per test senza dati veri.
- Non inserire dati reali prima di definire conservazione, informative, visibilità, modalità di cancellazione ed eventuale regolamento d'istituto.

## Miglioramenti obbligatori prima del prodotto finito
- Form guidati per le 3 aree, livelli di autonomia, prove di competenza, rubriche IeFP, esempi differenziati e domande strutturate (attualmente ogni sezione ha una textarea).
- Gestione classi, import utenti, reset/revoca credenziali e account docenti.
- Generazione di due output, bilancio personale e testo orientamento, in Drive; versione stampabile.
- Autosalvataggio controllato e risoluzione dei conflitti da più dispositivi.
- Sicurezza: throttling per tentativi di login, difesa anti-bruteforce, gestione scadenza e dati cancellabili.
- Test unitari di validazione, flusso end-to-end, controllo accessi, verifica privacy e deploy su account proprietario.
- Audio/trascrizione solo dopo verifica esplicita che la tecnologia scelta non usi servizi terzi.

## Struttura dati
\`Studenti\`: student_id, class_id, display_name, track, code_salt, code_hash, status, created_at, last_seen_at, revision.
\`Risposte\`: student_id, section_id, revision, content_version, response_json, created_at, updated_at.
\`Elaborati\`: student_id, report_type, file_id, file_name, source_revision, generated_at.

La UI attuale è una base tecnica minimale; **lo stile completo segue design.md**.
