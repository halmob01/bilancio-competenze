/* Bilancio di competenze — contenuti.
   Solo dati: nessuna logica di interfaccia. Usato dal browser (window.BC_DATI)
   e dai test Node (module.exports). */
(function (radice) {
  'use strict';

  const INDIRIZZI = [
    { id: 'elettrico', nome: 'Elettrico', figura: 'Tecnico elettrico' },
    { id: 'informatica', nome: 'Informatica', figura: 'Tecnico informatico' },
    { id: 'estetica', nome: 'Estetica', figura: 'Tecnico dei trattamenti estetici' }
  ];

  // Scala di autonomia: solo opzioni testuali esplicite (design.md §6.5, §9).
  // «Non l'ho mai affrontato» è distinto da «Non lo so ancora fare».
  const AUTONOMIA = [
    { id: 'mai', testo: 'Non l\'ho mai affrontato', breve: 'mai affrontato', dichiara: false },
    { id: 'non_ancora', testo: 'Non lo so ancora fare', breve: 'non ancora', dichiara: false },
    { id: 'con_aiuto', testo: 'Lo faccio se qualcuno mi aiuta', breve: 'con aiuto', dichiara: true },
    { id: 'autonomo_noto', testo: 'Lo faccio da solo se la situazione è già nota', breve: 'in autonomia, in situazioni note', dichiara: true },
    { id: 'autonomo_nuovo', testo: 'Lo faccio da solo anche se la situazione è nuova', breve: 'in autonomia, anche in situazioni nuove', dichiara: true }
  ];

  const QUANDO = [
    { id: 'anno1', testo: 'I anno' },
    { id: 'anno2', testo: 'II anno' },
    { id: 'anno3', testo: 'III anno' },
    { id: 'anno4', testo: 'IV anno' },
    { id: 'tirocinio', testo: 'Tirocinio o alternanza' },
    { id: 'fuori', testo: 'Fuori da scuola' }
  ];

  // Anni di frequenza: da qui il percorso mostra solo gli anni già vissuti.
  const ANNI = QUANDO.slice(0, 4);

  // Situazioni comuni ai tre indirizzi (design.md §7: capire / fare / collaborare /
  // verificare / spiegare / migliorare). Gli esempi cambiano per indirizzo;
  // «anche» ricorda che competenze professionali e di base si intrecciano.
  const SITUAZIONI = [
    {
      id: 'capire',
      cv: 'Comprensione di consegne, schemi e documentazione tecnica',
      verbo: 'Capire',
      domanda: 'Quando ricevi un compito, riesci a capire che cosa ti viene chiesto?',
      anche: 'Qui entrano anche la lettura di testi tecnici, in italiano e in inglese e l\'ascolto di chi ti dà le indicazioni.',
      esempi: {
        elettrico: 'Leggere lo schema di un impianto civile e capire quali circuiti realizzare prima di prendere in mano i cavi.',
        informatica: 'Capire dal racconto di un utente che cosa non funziona sul suo computer, anche quando lo spiega in modo confuso.',
        estetica: 'Capire dalla cliente quale trattamento desidera e accorgersi se ci sono controindicazioni.'
      }
    },
    {
      id: 'fare',
      cv: 'Esecuzione di lavori del proprio mestiere dall\'inizio alla fine',
      verbo: 'Fare',
      domanda: 'Sai realizzare un lavoro del tuo mestiere dall\'inizio alla fine?',
      anche: 'Qui entrano anche l\'organizzazione dei tempi, dei materiali e degli strumenti.',
      esempi: {
        elettrico: 'Cablare un quadro o un punto luce seguendo lo schema, con i materiali giusti e il posto di lavoro in ordine.',
        informatica: 'Installare e configurare un sistema operativo, una stampante di rete o un piccolo programma.',
        estetica: 'Eseguire una pulizia del viso o una manicure seguendo il protocollo, dalla preparazione della cabina al congedo.'
      }
    },
    {
      id: 'collaborare',
      cv: 'Lavoro in squadra e rapporto con tutor, colleghi e clienti',
      verbo: 'Collaborare',
      domanda: 'Come lavori con gli altri: compagni, colleghi, tutor, clienti?',
      anche: 'Qui entrano anche il rispetto dei ruoli, la puntualità e il modo in cui chiedi e offri aiuto.',
      esempi: {
        elettrico: 'Dividersi i compiti in coppia in cantiere e avvisare il collega prima di intervenire su un circuito.',
        informatica: 'Lavorare a un progetto di gruppo e accordarsi su chi fa che cosa, senza rifare il lavoro degli altri.',
        estetica: 'Gestire i turni di cabina con le colleghe e passare le informazioni su una cliente.'
      }
    },
    {
      id: 'verificare',
      cv: 'Controllo del risultato e rispetto delle norme di sicurezza e igiene',
      verbo: 'Verificare',
      domanda: 'Controlli il risultato del tuo lavoro e le condizioni di sicurezza?',
      anche: 'Qui entrano anche le misure, i calcoli e le norme di sicurezza e di igiene.',
      esempi: {
        elettrico: 'Misurare con il multimetro e verificare l\'impianto prima di dare tensione, usando i dispositivi di protezione.',
        informatica: 'Provare che un programma o una rete funzionino davvero e fare una copia di sicurezza prima di modificare.',
        estetica: 'Sterilizzare gli strumenti e controllare la reazione della pelle durante e dopo il trattamento.'
      }
    },
    {
      id: 'spiegare',
      cv: 'Capacità di spiegare e documentare il lavoro svolto',
      verbo: 'Spiegare',
      domanda: 'Sai spiegare a qualcuno quello che hai fatto o come si fa?',
      anche: 'Qui entrano anche la scrittura di una relazione o di un rapporto e l\'uso di un linguaggio adatto a chi ascolta.',
      esempi: {
        elettrico: 'Spiegare al cliente come funziona il nuovo impianto o compilare il rapporto di un intervento.',
        informatica: 'Spiegare a un utente non esperto una procedura passo per passo, oppure scriverla in un breve documento.',
        estetica: 'Consigliare alla cliente i prodotti e i gesti da ripetere a casa, con parole chiare.'
      }
    },
    {
      id: 'migliorare',
      cv: 'Analisi degli errori e capacità di migliorare il proprio lavoro',
      verbo: 'Migliorare',
      domanda: 'Quando qualcosa va storto, riesci a capire perché e a fare meglio la volta dopo?',
      anche: 'Qui entrano anche la ricerca di informazioni, la richiesta di un parere e la capacità di accettare una critica.',
      esempi: {
        elettrico: 'Rifare un collegamento sbagliato dopo aver capito dove era l\'errore, senza nasconderlo.',
        informatica: 'Cercare nella documentazione o in un forum la causa di un errore che non avevi mai visto.',
        estetica: 'Rivedere l\'organizzazione di un trattamento che durava troppo e faceva aspettare la cliente successiva.'
      }
    }
  ];

  // Domande del percorso critico (sezione 04). Giudizi anche critici su scuola e tirocinio.
  const SGUARDO = [
    {
      id: 'scuola',
      domanda: 'Che cosa ti è servito davvero della scuola? Che cosa avresti cambiato?',
      aiuto: 'Pensa a un laboratorio, una materia, un docente, un modo di lavorare. Puoi essere critico: questo bilancio non è una valutazione della scuola su di te.',
      esempio: '«Nell\'azienda in cui ho fatto il tirocinio al terzo anno ho imparato più che in aula, perché facevo lavori veri e se sbagliavo dovevo rifare. A scuola avrei voluto meno teoria ripetuta e più casi veri.»'
    },
    {
      id: 'tirocinio',
      domanda: 'Che cosa ti ha insegnato il tirocinio che a scuola non avevi visto? Che cosa non ha funzionato?',
      aiuto: 'Se non hai ancora fatto il tirocinio, racconta un\'altra esperienza di lavoro o scrivi che cosa ti aspetti.',
      esempio: '«In azienda i tempi erano molto più stretti. Il tutor all\'inizio non aveva tempo per me; ho imparato a fare domande precise.»'
    },
    {
      id: 'ancora',
      domanda: 'Che cosa devi ancora imparare per lavorare bene? Come pensi di farlo?',
      aiuto: 'Scegli una o due cose concrete. Indica anche da chi o da che cosa potresti farti aiutare.',
      esempio: '«Devo imparare a preventivare i tempi di un lavoro. Posso chiedere al tutor di farmi provare a stimarli prima di iniziare.»'
    }
  ];

  // Sette sezioni (design.md §6.2, più il curriculum). Ogni sezione ha una o più schermate:
  // una sola domanda principale per schermata.
  const SEZIONI = [
    {
      id: 'percorso',
      titolo: 'Il tuo percorso',
      schermate: [
        { id: 'chi', titolo: 'Da dove parti' },
        { id: 'anni', titolo: 'Il tuo percorso in poche righe' }
      ]
    },
    {
      id: 'esperienze',
      titolo: 'Le esperienze che ricordi',
      schermate: [{ id: 'elenco', titolo: 'Le esperienze che ricordi' }]
    },
    {
      id: 'sofare',
      titolo: 'Che cosa so fare',
      // Una sola schermata con sei blocchi: gli id delle situazioni restano quelli di sempre.
      schermate: [{ id: 'situazioni', titolo: 'Che cosa sai fare' }]
    },
    {
      id: 'sguardo',
      titolo: 'Uno sguardo critico',
      schermate: SGUARDO.map(function (g) { return { id: g.id, titolo: g.domanda }; })
    },
    {
      id: 'bilancio',
      titolo: 'Bilancio',
      schermate: [{ id: 'dossier', titolo: 'Il tuo bilancio' }]
    },
    {
      id: 'cv',
      titolo: 'Curriculum vitae',
      schermate: [
        { id: 'contatti', titolo: 'I tuoi dati' },
        { id: 'profilo', titolo: 'Che lavoro cerchi' },
        { id: 'formazione', titolo: 'La tua formazione' },
        { id: 'esperienze', titolo: 'Le esperienze di lavoro' },
        { id: 'competenze', titolo: 'Competenze, lingue e altro' },
        { id: 'anteprima', titolo: 'Il tuo curriculum' }
      ]
    },
    {
      id: 'orientamento',
      titolo: 'Orientamento',
      schermate: [
        { id: 'domande', titolo: 'Che cosa racconteresti?' },
        { id: 'testo', titolo: 'Il tuo testo per l\'open day' }
      ]
    }
  ];

  const ORIENTAMENTO = [
    {
      id: 'presentati',
      etichetta: 'Chi sei e che cosa studi, in due righe.',
      esempio: '«Mi chiamo Sara e frequento Informatica.»'
    },
    {
      id: 'racconto',
      etichetta: 'Un\'esperienza che racconteresti a un ragazzo o una ragazza di terza media.',
      esempio: '«Al terzo anno abbiamo rimesso in funzione i computer di un\'associazione del quartiere…»'
    },
    {
      id: 'difficile',
      etichetta: 'Una cosa che è stata difficile e come l\'hai affrontata.',
      esempio: '«All\'inizio non capivo gli schemi. Mi è servito rifarli a mano, più volte.»'
    },
    {
      id: 'consiglio',
      etichetta: 'Un consiglio onesto per chi deve scegliere.',
      esempio: '«Venite a vedere i laboratori e chiedete agli studenti, non solo ai docenti.»'
    }
  ];

  // Esperienza d'esempio per indirizzo: mostrata come ESEMPIO, mai come risposta.
  const ESEMPI_ESPERIENZA = {
    elettrico: {
      titolo: 'Impianto di una cucina in laboratorio',
      quando: 'III anno',
      azione: 'Ho tracciato le linee, posato le canaline e collegato prese e punti luce secondo lo schema.',
      prova: 'Le foto dell\'impianto e la scheda di collaudo firmata dal docente.',
      difficolta: 'Non sapevo dimensionare le sezioni dei cavi: ho rifatto il calcolo con il docente.'
    },
    informatica: {
      titolo: 'Rete dell\'ufficio durante il tirocinio',
      quando: 'Tirocinio o alternanza',
      azione: 'Ho configurato due stampanti di rete e aggiornato i computer della segreteria.',
      prova: 'Il documento di procedura che ho scritto e il giudizio del tutor aziendale.',
      difficolta: 'Una stampante non veniva vista dalla rete: ho dovuto chiedere al tecnico come leggere i log.'
    },
    estetica: {
      titolo: 'Prima cliente esterna in salone',
      quando: 'II anno',
      azione: 'Ho accolto la cliente, ho fatto l\'analisi della pelle e una pulizia del viso completa.',
      prova: 'La scheda cliente compilata e il commento della docente di laboratorio.',
      difficolta: 'Ero in ritardo sui tempi: ho imparato a preparare la cabina prima dell\'arrivo.'
    }
  };

  // Aspetto del curriculum: scelte limitate, tutte leggibili in stampa.
  const CV_COLORI = [
    { id: 'nero', nome: 'Nero', hex: '#000000' },
    { id: 'grigio', nome: 'Grigio', hex: '#4a4a4a' },
    { id: 'blu', nome: 'Blu', hex: '#1f4e8c' },
    { id: 'verde', nome: 'Verde', hex: '#1e6b4a' },
    { id: 'rosso', nome: 'Rosso', hex: '#b3261e' },
    { id: 'viola', nome: 'Viola', hex: '#6b2d7b' },
    { id: 'europass', nome: 'Blu Europass', hex: '#0e4194' }
  ];
  // Tipi di esperienza di lavoro per il curriculum.
  const CV_TIPI_LAVORO = [
    { id: 'tirocinio', testo: 'Tirocinio' },
    { id: 'apprendistato', testo: 'Apprendistato' },
    { id: 'alternanza', testo: 'Alternanza scuola-lavoro' },
    { id: 'lavoro', testo: 'Lavoro' },
    { id: 'altro', testo: 'Altro' }
  ];
  const CV_IMPAGINAZIONI = [
    { id: 'originale', nome: 'Contemporaneo' },
    { id: 'modello', nome: 'Classico' },
    { id: 'europass', nome: 'Europass' }
  ];
  const CV_CARATTERI = [
    { id: 'moderno', nome: 'Moderno' },
    { id: 'classico', nome: 'Elegante' },
    { id: 'semplice', nome: 'Semplice' }
  ];
  const CV_DIMENSIONI = [
    { id: 'piccolo', nome: 'Piccolo', scala: 0.92 },
    { id: 'normale', nome: 'Normale', scala: 1 },
    { id: 'grande', nome: 'Grande', scala: 1.08 }
  ];

  // Lingue: lo studente sceglie frasi in italiano semplice, mai i codici europei.
  // Il codice (A1-C2) serve solo alla tabella del formato Europass; «breve» è la parola usata negli altri modelli.
  const LINGUA_LIVELLI = [
    { id: 'A1', scelta: 'Poche parole e frasi semplici', breve: 'base' },
    { id: 'A2', scelta: 'Frasi semplici di tutti i giorni', breve: 'elementare' },
    { id: 'B1', scelta: 'Me la cavo nel quotidiano', breve: 'intermedio' },
    { id: 'B2', scelta: 'Mi esprimo con sicurezza', breve: 'buono' },
    { id: 'C1', scelta: 'Quasi come un madrelingua', breve: 'ottimo' },
    { id: 'C2', scelta: 'Come un madrelingua', breve: 'come un madrelingua' }
  ];
  // Le cinque abilità del formato Europass, con parole di tutti i giorni.
  const LINGUA_ABILITA = [
    { id: 'ascolto', domanda: 'Quando ascolto, capisco', breve: 'ascolto' },
    { id: 'lettura', domanda: 'Quando leggo, capisco', breve: 'lettura' },
    { id: 'interazione', domanda: 'Quando parlo con qualcuno', breve: 'conversazione' },
    { id: 'orale', domanda: 'Quando racconto o presento qualcosa a voce', breve: 'esposizione orale' },
    { id: 'scritto', domanda: 'Quando scrivo', breve: 'scrittura' }
  ];

  const DATI = {
    LINGUA_LIVELLI: LINGUA_LIVELLI,
    LINGUA_ABILITA: LINGUA_ABILITA,
    CV_COLORI: CV_COLORI,
    CV_TIPI_LAVORO: CV_TIPI_LAVORO,
    CV_IMPAGINAZIONI: CV_IMPAGINAZIONI,
    CV_CARATTERI: CV_CARATTERI,
    CV_DIMENSIONI: CV_DIMENSIONI,
    ESEMPI_ESPERIENZA: ESEMPI_ESPERIENZA,
    INDIRIZZI: INDIRIZZI,
    AUTONOMIA: AUTONOMIA,
    QUANDO: QUANDO,
    ANNI: ANNI,
    SITUAZIONI: SITUAZIONI,
    SGUARDO: SGUARDO,
    SEZIONI: SEZIONI,
    ORIENTAMENTO: ORIENTAMENTO
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATI;
  else radice.BC_DATI = DATI;
})(typeof window !== 'undefined' ? window : globalThis);
