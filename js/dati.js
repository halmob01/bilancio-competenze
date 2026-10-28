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
    { id: 'con_aiuto', testo: 'Lo faccio con l\'aiuto di qualcuno', breve: 'con aiuto', dichiara: true },
    { id: 'autonomo_noto', testo: 'Lo faccio in autonomia in situazioni che conosco', breve: 'in autonomia, in situazioni note', dichiara: true },
    { id: 'autonomo_nuovo', testo: 'Lo faccio in autonomia anche in situazioni nuove', breve: 'in autonomia, anche in situazioni nuove', dichiara: true }
  ];

  const QUANDO = [
    { id: 'anno1', testo: 'I anno' },
    { id: 'anno2', testo: 'II anno' },
    { id: 'anno3', testo: 'III anno' },
    { id: 'anno4', testo: 'IV anno' },
    { id: 'tirocinio', testo: 'Tirocinio o alternanza' },
    { id: 'fuori', testo: 'Fuori da scuola' }
  ];

  // Situazioni comuni ai tre indirizzi (design.md §7: capire / fare / collaborare /
  // verificare / spiegare / migliorare). Gli esempi cambiano per indirizzo;
  // «anche» ricorda che competenze professionali e di base si intrecciano.
  const SITUAZIONI = [
    {
      id: 'capire',
      verbo: 'Capire',
      domanda: 'Quando ricevi un compito, riesci a capire che cosa ti viene chiesto?',
      anche: 'Qui entrano anche la lettura di testi tecnici, in italiano e in inglese, e l\'ascolto di chi ti dà le indicazioni.',
      esempi: {
        elettrico: 'Leggere lo schema di un impianto civile e capire quali circuiti realizzare prima di prendere in mano i cavi.',
        informatica: 'Capire dal racconto di un utente che cosa non funziona sul suo computer, anche quando lo spiega in modo confuso.',
        estetica: 'Capire dalla cliente quale trattamento desidera e accorgersi se ci sono controindicazioni.'
      }
    },
    {
      id: 'fare',
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
      verbo: 'Spiegare',
      domanda: 'Sai spiegare a qualcuno quello che hai fatto o come si fa?',
      anche: 'Qui entrano anche la scrittura di una relazione o di un rapporto, e l\'uso di un linguaggio adatto a chi ascolta.',
      esempi: {
        elettrico: 'Spiegare al cliente come funziona il nuovo impianto o compilare il rapporto di un intervento.',
        informatica: 'Spiegare a un utente non esperto una procedura passo per passo, oppure scriverla in un breve documento.',
        estetica: 'Consigliare alla cliente i prodotti e i gesti da ripetere a casa, con parole chiare.'
      }
    },
    {
      id: 'migliorare',
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

  // Sei sezioni (design.md §6.2). Ogni sezione ha una o più schermate:
  // una sola domanda principale per schermata.
  const SEZIONI = [
    {
      id: 'percorso',
      titolo: 'Il tuo percorso',
      schermate: [
        { id: 'chi', titolo: 'Da dove parti' },
        { id: 'anni', titolo: 'Quattro anni in poche righe' }
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
      schermate: SITUAZIONI.map(function (s) { return { id: s.id, titolo: s.verbo }; })
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
      esempio: '«Mi chiamo Sara, faccio il quarto anno di Informatica.»'
    },
    {
      id: 'racconto',
      etichetta: 'Un\'esperienza che racconteresti a un ragazzo o una ragazza di terza media.',
      esempio: '«Al terzo anno abbiamo rimesso in funzione i computer di un\'associazione del quartiere…»'
    },
    {
      id: 'difficile',
      etichetta: 'Una cosa che è stata difficile, e come l\'hai affrontata.',
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

  const DATI = {
    ESEMPI_ESPERIENZA: ESEMPI_ESPERIENZA,
    INDIRIZZI: INDIRIZZI,
    AUTONOMIA: AUTONOMIA,
    QUANDO: QUANDO,
    SITUAZIONI: SITUAZIONI,
    SGUARDO: SGUARDO,
    SEZIONI: SEZIONI,
    ORIENTAMENTO: ORIENTAMENTO
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATI;
  else radice.BC_DATI = DATI;
})(typeof window !== 'undefined' ? window : globalThis);
