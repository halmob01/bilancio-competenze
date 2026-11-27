/* Mappa delle situazioni di lavoro: SST-ICT-05 «Integrazione componenti» (EQF 3), indirizzo Informatica.
   CONTENUTO, non codice: il motore è js/situazioni.js. Si cambia questo file senza toccare il motore.

   Fonte della struttura (dimensioni e situazioni numerate): Regione Friuli Venezia Giulia, Repertorio delle qualificazioni
   regionali, settore «Servizi di informatica», versione 1.8 (maggio 2020), SST-ICT-05 correlata al QPR-ICT-05
   «Integrazione componenti» [e-CF B.2a], EQF 3. La SST è definita lì come schema di classificazione della complessità
   esecutiva di una competenza, attraverso situazioni lavorative a difficoltà crescente identificate dalle condizioni di
   esercizio (contesto, prodotti/servizi, attività, strumenti, tecniche, materiali).
   I testi «docente» sono una RIFORMULAZIONE delle situazioni FVG, non il testo ufficiale: per l'uso formale fa fede la scheda FVG.

   Aggancio lombardo: le situazioni sono associate alle competenze dell'Operatore informatico (Regione Lombardia, DGR 3192/2020,
   Allegato B2 qualifiche, figura 24) che insistono sulla stessa area di attività dell'Atlante del lavoro:
   ADA.16.239.782 «Supporto operativo ai sistemi e alle reti informatiche» (inf-installare, inf-manutenzione in js/competenze.js).
   Le situazioni con origine «CFP» non sono nella SST FVG: vengono dalle abilità dell'Allegato B2 (assemblaggio del PC,
   cablaggio della rete, programmi per l'ufficio) e sono proposte di questo progetto.

   grado: posizione nella colonna della dimensione, dal più semplice (1). Nella SST FVG la posizione indica la complessità
   crescente e un colore segna la soglia di piena autonomia: il colore non è leggibile nel testo consultato, quindi «soglia»
   resta null finché i docenti non la verificano sulla scheda originale.
   lessico: parole dello studente. «forte» = indica da solo la situazione; «debole» = aiuta solo insieme ad altro.
   Un termine che finisce con * vale per tutte le parole che iniziano così. Più parole = devono comparire vicine e in ordine.
   Stato: BOZZA da rivedere con i docenti di Informatica. */
(function (radice) {
  'use strict';

  const MAPPA = {
    id: 'SST-ICT-05',
    titolo: 'Integrazione componenti',
    indirizzo: 'informatica',
    eqf: 3,
    stato: 'bozza',
    versione: '0.1 del 27/11/2026',
    fonte: {
      sst: 'Regione FVG, Repertorio delle qualificazioni regionali, Servizi di informatica, v. 1.8 (maggio 2020), SST-ICT-05',
      qpr: 'QPR-ICT-05 Integrazione componenti [e-CF B.2a], EQF 3',
      url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/formazione-lavoro/formazione/FOGLIA15/allegati/Servizi_informatici_-_Repertorio_2020_Maggio.pdf',
      lombardia: 'DGR 3192/2020, Allegato B2 qualifiche, figura 24 Operatore informatico',
      ada: ['ADA.16.239.782']
    },
    soglia: null,
    dimensioni: [
      { id: 'sistemi', numero: 1, titolo: 'Installazione e integrazione di sistemi (hardware e sistema operativo)' },
      { id: 'applicazioni', numero: 2, titolo: 'Installazione e integrazione di applicazioni' },
      { id: 'reti', numero: 3, titolo: 'Installazione e configurazione di reti' },
      { id: 'collaudo', numero: 4, titolo: 'Test di integrazione e documentazione' }
    ],
    situazioni: [
      // ---------- 1. Sistemi ----------
      { id: 'ict05-c1', codice: 'C.1', origine: 'CFP', dimensione: 'sistemi', grado: 0, competenza: 'inf-installare',
        docente: 'Assemblaggio di un PC: montaggio di scheda madre, processore, memoria, archiviazione e alimentatore, primo avvio (Allegato B2, abilità «assemblare e configurare i componenti di un PC»).',
        studente: 'Ho montato un computer pezzo per pezzo',
        lessico: { forte: ['assembl*', 'mont* computer', 'mont* pc', 'mont* il pc', 'da zero', 'pasta termica', 'dissipator*', 'processor*', 'cpu', 'scheda madre', 'case'],
          debole: ['mont*', 'component*', 'pezz*'] } },
      { id: 'ict05-1.1', codice: '1.1', origine: 'FVG', dimensione: 'sistemi', grado: 1, competenza: 'inf-installare',
        docente: 'Installazione e aggiornamento di hardware e sistema operativo: potenziamento di memoria o disco, installazione del sistema operativo, aggiornamenti.',
        studente: 'Ho installato o aggiornato il sistema operativo, o potenziato un PC (memoria, disco)',
        lessico: { forte: ['sistema operativ*', 'sistemi operativ*', 'windows', 'linux', 'ubuntu', 'macos', 'format*', 'ssd', 'hard disk', 'disco fisso', 'ram', 'memoria ram', 'chiavetta avviabil*', 'iso', 'aggiorn* * computer', 'aggiorn* * pc', 'aggiornament*'],
          debole: ['instal*', 'aggiorn*', 'pc', 'computer', 'disco', 'memoria'] } },
      { id: 'ict05-1.2', codice: '1.2', origine: 'FVG', dimensione: 'sistemi', grado: 2, competenza: 'inf-manutenzione',
        docente: 'Sostituzione di componenti hardware guasti o obsoleti, installazione dei driver, aggiornamento dell\'inventario IT.',
        studente: 'Ho sostituito un pezzo guasto di un computer e installato i driver',
        lessico: { forte: ['sostitu*', 'driver', 'alimentator*', 'scheda video', 'scheda grafica', 'ventol*', 'inventari*', 'guast*', 'bruciat*', 'rott*'],
          debole: ['cambi*', 'pezz*', 'component*'] } },
      { id: 'ict05-1.3', codice: '1.3', origine: 'FVG', dimensione: 'sistemi', grado: 3, competenza: 'inf-installare',
        docente: 'Gestione dei dati: salvataggio e ripristino di dati e profilo utente, per esempio nella sostituzione di una postazione.',
        studente: 'Ho salvato i dati di un utente e li ho rimessi a posto (backup e ripristino)',
        lessico: { forte: ['backup', 'back up', 'copia di sicurezza', 'copie di sicurezza', 'ripristin*', 'profilo utente', 'salvat* * dati', 'salv* * file', 'recuper* * dati', 'recuper* * file', 'trasfer* * dati', 'spost* * dati'],
          debole: ['dati', 'file', 'salv*', 'copi*'] } },
      { id: 'ict05-1.4', codice: '1.4', origine: 'FVG', dimensione: 'sistemi', grado: 4, competenza: 'inf-installare',
        docente: 'Personalizzazione del sistema operativo: utenti locali, desktop, programmi in avvio automatico, attività pianificate.',
        studente: 'Ho preparato un computer per chi lo usa: utenti, desktop, avvio automatico',
        lessico: { forte: ['utent* local*', 'account local*', 'cre* * utent*', 'cre* * account', 'avvio automatico', 'esecuzione automatica', 'attivita pianificat*', 'operazion* pianificat*', 'utilita di pianificazione', 'task scheduler', 'personalizz*', 'desktop'],
          debole: ['utent*', 'account', 'impostazion*'] } },
      // ---------- 2. Applicazioni ----------
      { id: 'ict05-2.1', codice: '2.1', origine: 'FVG', dimensione: 'applicazioni', grado: 1, competenza: 'inf-installare',
        docente: 'Installazione e configurazione di browser e client di posta elettronica.',
        studente: 'Ho installato e configurato un browser o un programma di posta',
        lessico: { forte: ['browser', 'chrome', 'firefox', 'edge', 'client di posta', 'outlook', 'thunderbird', 'posta elettronica', 'account di posta', 'email', 'mail'],
          debole: ['posta', 'instal*', 'configur*'] } },
      { id: 'ict05-2.2', codice: '2.2', origine: 'FVG', dimensione: 'applicazioni', grado: 2, competenza: 'inf-installare',
        docente: 'Gestione dei dati utente nelle applicazioni: migrazione di caselle di posta e contatti.',
        studente: 'Ho spostato la posta e i contatti di qualcuno su un nuovo computer',
        lessico: { forte: ['migr*', 'rubrica', 'contatti', 'casella di posta', 'caselle di posta', 'mailbox', 'spost* * posta', 'esport* * posta', 'pst'],
          debole: ['posta', 'spost*', 'esport*', 'import*'] } },
      { id: 'ict05-2.3', codice: '2.3', origine: 'FVG', dimensione: 'applicazioni', grado: 3, competenza: 'inf-installare',
        docente: 'Installazione del client di un\'applicazione aziendale.',
        studente: 'Ho installato il programma che usa l\'azienda (gestionale o simile)',
        lessico: { forte: ['gestional*', 'programma aziendal*', 'applicazion* aziendal*', 'software aziendal*', 'client'],
          debole: ['programm*', 'software', 'applicazion*', 'instal*'] } },
      { id: 'ict05-c2', codice: 'C.2', origine: 'CFP', dimensione: 'applicazioni', grado: 0, competenza: 'inf-installare',
        docente: 'Installazione e configurazione dei programmi di office automation (Allegato B2, abilità «installare, configurare e applicare le funzionalità dei principali software di Office Automation»).',
        studente: 'Ho installato o configurato i programmi per l\'ufficio (Office o simili)',
        lessico: { forte: ['office', 'libreoffice', 'pacchetto office', 'word', 'excel', 'licenz*'],
          debole: ['programm*', 'instal*'] } },
      // ---------- 3. Reti ----------
      { id: 'ict05-c3', codice: 'C.3', origine: 'CFP', dimensione: 'reti', grado: 0, competenza: 'inf-manutenzione',
        docente: 'Cablaggio della rete: preparazione e verifica di cavi e prese (Allegato B2, abilità «applicare tecniche e procedure di cablaggio della rete»).',
        studente: 'Ho preparato o controllato i cavi di rete',
        lessico: { forte: ['crimp*', 'rj45', 'rj 45', 'cavo di rete', 'cavi di rete', 'cavo ethernet', 'cavi ethernet', 'patch', 'patch panel', 'presa di rete', 'prese di rete', 'cablaggio', 'ordine dei colori', 'pinza', 'tester'],
          debole: ['cav*', 'presa', 'prese'] } },
      { id: 'ict05-3.1', codice: '3.1', origine: 'FVG', dimensione: 'reti', grado: 1, competenza: 'inf-installare',
        docente: 'Installazione di dispositivi finali in rete: configurazione di rete delle postazioni, stampante di rete.',
        studente: 'Ho collegato alla rete un computer, una stampante o un altro dispositivo',
        lessico: { forte: ['stampant*', 'stampante di rete', 'indirizzo ip', 'indirizzi ip', 'ip statico', 'scheda di rete', 'scanner', 'collegat* * rete', 'colleg* * wifi', 'wi fi', 'wifi'],
          debole: ['ip', 'rete', 'dhcp', 'configur*'] } },
      { id: 'ict05-3.2', codice: '3.2', origine: 'FVG', dimensione: 'reti', grado: 2, competenza: 'inf-installare',
        docente: 'Gestione della LAN aziendale: configurazione di base di router e switch.',
        studente: 'Ho configurato un router o uno switch di una rete locale',
        lessico: { forte: ['router', 'switch', 'access point', 'rete locale', 'lan', 'packet tracer', 'dhcp server', 'server dhcp'],
          debole: ['rete', 'dhcp', 'configur*'] } },
      { id: 'ict05-3.3', codice: '3.3', origine: 'FVG', dimensione: 'reti', grado: 3, competenza: 'inf-installare',
        docente: 'LAN con sottoreti: configurazione dei dispositivi intermedi.',
        studente: 'Ho diviso una rete in sottoreti e configurato i dispositivi in mezzo',
        lessico: { forte: ['sottoret*', 'subnet*', 'vlan', 'maschera di sottorete', 'subnet mask', 'routing', 'instradament*'],
          debole: ['gateway', 'rete', 'configur*'] } },
      // ---------- 4. Collaudo e documentazione ----------
      { id: 'ict05-4.1', codice: '4.1', origine: 'FVG', dimensione: 'collaudo', grado: 1, competenza: 'inf-manutenzione',
        docente: 'Documentazione dell\'intervento.',
        studente: 'Ho scritto che cosa ho fatto in un rapporto o in una procedura',
        lessico: { forte: ['documento', 'documenti', 'documentat*', 'procedura', 'rapport*', 'report', 'relazion*', 'verbal*', 'registro', 'scheda * intervento', 'annot*', 'scritt* * procedura', 'scriv* * procedura'],
          debole: ['scritt*', 'scriv*'] } },
      { id: 'ict05-4.2', codice: '4.2', origine: 'FVG', dimensione: 'collaudo', grado: 2, competenza: 'inf-manutenzione',
        docente: 'Test di funzionamento e di prestazioni.',
        studente: 'Ho provato che tutto funzionasse, anche con test o misure',
        lessico: { forte: ['ping', 'test', 'collaud*', 'speed test', 'benchmark', 'prestazion*', 'performance', 'velocita', 'prov* che', 'verific* che', 'controll* che', 'tutto funzion*'],
          debole: ['prov*', 'verific*', 'controll*', 'funzion*'] } },
      { id: 'ict05-4.3', codice: '4.3', origine: 'FVG', dimensione: 'collaudo', grado: 3, competenza: 'inf-manutenzione',
        docente: 'Risoluzione delle anomalie frequenti e note, anche con l\'aiuto di una knowledge base.',
        studente: 'Ho trovato e risolto un problema, cercando la soluzione',
        lessico: { forte: ['problem*', 'non funzion*', 'non si vede*', 'non veniva vist*', 'errore', 'errori', 'log', 'forum', 'risolt*', 'risolv*', 'soluzion*', 'lent*', 'bloccat*', 'virus', 'malware', 'diagnos*', 'causa', 'anomali*', 'knowledge base'],
          debole: ['cerc*', 'documentazion*'] } }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MAPPA;
  else (radice.BC_MAPPE = radice.BC_MAPPE || []).push(MAPPA);
})(typeof window !== 'undefined' ? window : globalThis);
