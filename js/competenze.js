/* Catalogo delle competenze tecnico-professionali dei tre indirizzi del CFP.
   Fonte: Regione Lombardia, Repertorio dell'offerta di IeFP (DGR 3192 del 3 giugno 2020; la DGR 4615 del 23 giugno 2025
   non cambia queste figure): allegato B2 qualifiche (III anno, EQF 3) e allegato B2 diplomi (IV anno, EQF 4).
   Copia dei PDF in docs/fonti/. «ufficiale» è il testo dell'allegato; «semplice» è la frase che vede lo studente,
   scritta per questo progetto e DA RIVEDERE con i docenti di ogni indirizzo (RIVISTO = false finché non succede).
   Dal I al III anno vale la figura di qualifica; al IV quella di diploma, più le competenze del III anno.
   Oltre alle tecnico-professionali (B2): le competenze di base (DGR 3192/2020, Allegato B1), le competenze personali, sociali,
   di apprendimento e imprenditoriali (Accordo Regioni 18/12/2019, Allegato 2) e, quando il PFP le fornisce, quelle della
   curvatura del profilo nei quadriennali di filiera (DGR 2954/2024, Allegato B, punto 5).
   Il catalogo serve all'autovalutazione: non valida né certifica competenze (D.Lgs. 13/2013).
   Nessun accesso al DOM: usato dal browser (window.BC_COMPETENZE) e dai test Node. */
(function (radice) {
  'use strict';

  const RIVISTO = false;

  // Competenze ricorsive: uguali in tutte le figure di qualifica. Un solo id, così si riconoscono negli anni.
  const PIANIFICARE = {
    id: 'pianificare',
    semplice: 'Organizzare il lavoro: decidere le fasi seguendo istruzioni, schemi o disegni',
    ufficiale: 'Definire e pianificare fasi delle operazioni da compiere, nel rispetto della normativa sulla sicurezza, sulla base delle istruzioni ricevute, della documentazione di appoggio (schemi, disegni, procedure, distinte materiali) e del sistema di relazioni.'
  };
  const STRUMENTI = {
    id: 'strumenti',
    semplice: 'Preparare e tenere in ordine attrezzi, strumenti e macchinari',
    ufficiale: 'Approntare, monitorare e curare la manutenzione ordinaria di strumenti, utensili, attrezzature e macchinari necessari alle diverse fasi di lavorazione/servizio sulla base della tipologia di materiali da impiegare, delle indicazioni/procedure previste, del risultato atteso.'
  };
  const SICUREZZA = {
    id: 'sicurezza',
    semplice: 'Lavorare in sicurezza, con igiene e rispetto per l\'ambiente',
    ufficiale: 'Operare in sicurezza e nel rispetto delle norme di igiene e di salvaguardia ambientale, identificando e prevenendo situazioni di rischio per sé, per altri e per l\'ambiente.'
  };

  function c(id, semplice, ufficiale) { return { id: id, semplice: semplice, ufficiale: ufficiale }; }

  // gruppi: { id, titolo (per lo studente), competenze }. Gli indirizzi interni di una figura sono gruppi «Se lavori su…»:
  // lo studente non deve conoscere il nome tecnico del suo indirizzo.
  const FIGURE = {
    elettrico: {
      qualifica: {
        figura: 'Operatore elettrico', fonte: 'Allegato B2 qualifiche, figura 21', eqf: 3,
        gruppi: [
          { id: 'tutti', titolo: 'In ogni lavoro', competenze: [PIANIFICARE, STRUMENTI, SICUREZZA] },
          { id: 'mestiere', titolo: 'Nel tuo mestiere', competenze: [
            c('el-verifiche', 'Controllare che un impianto funzioni: misure, prove e verifiche',
              'Effettuare le verifiche di funzionamento dell\'impianto elettrico in coerenza con gli standard progettuali, di qualità e sicurezza.'),
            c('el-manutenzione', 'Trovare un guasto e riparare, o fare la manutenzione di un impianto',
              'Effettuare la manutenzione ordinaria, straordinaria, preventiva e predittiva di impianti elettrici, individuando eventuali anomalie e problemi di funzionamento e conseguenti interventi di ripristino.')
          ] },
          { id: 'civili', titolo: 'Se lavori su impianti di case e uffici', indirizzo: 'Installazione/manutenzione di impianti elettrici civili', competenze: [
            c('el-civili', 'Realizzare un impianto elettrico di una casa o di un ufficio seguendo il progetto',
              'Realizzare impianti elettrici ad uso civile nel rispetto della normativa di settore e delle indicazioni contenute nel progetto.')
          ] },
          { id: 'industriali', titolo: 'Se lavori su impianti industriali, di negozi e servizi', indirizzo: 'Installazione/manutenzione di impianti elettrici industriali e del terziario', competenze: [
            c('el-industriali', 'Realizzare un impianto elettrico industriale o di un negozio seguendo il progetto',
              'Realizzare impianti elettrici industriali e del terziario nel rispetto della normativa di settore e delle indicazioni contenute nel progetto.')
          ] },
          { id: 'speciali', titolo: 'Se lavori su allarmi e reti dati', indirizzo: 'Installazione/manutenzione di impianti speciali per la sicurezza e per il cablaggio strutturato', competenze: [
            c('el-speciali', 'Realizzare un impianto di allarme, antincendio, videosorveglianza o controllo accessi, o una rete dati',
              'Realizzare impianti per la sicurezza (antintrusione, antincendio, video sorveglianza, controllo accessi) e per la rete dati nel rispetto della normativa di settore e sulla base delle specifiche tecniche contenute nel progetto esecutivo.')
          ] },
          { id: 'cablaggio', titolo: 'Se lavori su componenti e automazione', indirizzo: 'Installazione e cablaggio di componenti elettrici, elettronici e fluidici', competenze: [
            c('el-cablaggio', 'Montare e cablare componenti elettrici, elettronici o pneumatici, poi avviarli e regolarli',
              'Effettuare l\'installazione dei componenti meccatronici di varie tipologie e il relativo cablaggio, sulla base della documentazione tecnica ricevuta eseguendo la successiva fase di avvio, taratura e regolazione dei singoli componenti.')
          ] }
        ]
      },
      diploma: {
        figura: 'Tecnico elettrico', fonte: 'Allegato B2 diplomi, figura 23', eqf: 4,
        gruppi: [
          { id: 'mestiere4', titolo: 'Nel tuo mestiere, al quarto anno', competenze: [
            c('tel-collaudo', 'Collaborare al collaudo e all\'avvio di un impianto e preparare i documenti per la certificazione',
              'Collaborare nelle fasi di collaudo, avvio e messa in servizio dell\'impianto elettrico in base alle specifiche progettuali, predisponendo la reportistica ai fini della certificazione delle procedure adottate e della corrispondenza agli standard di riferimento.')
          ] },
          { id: 'impianti4', titolo: 'Se lavori su impianti civili e industriali', indirizzo: 'Impianti elettrici civili/industriali', competenze: [
            c('tel-progettare', 'Progettare un piccolo impianto civile o industriale',
              'Progettare impianti civili e industriali di piccola dimensione.'),
            c('tel-acquisti', 'Capire che materiali servono e prepararne l\'acquisto restando nel budget',
              'Intervenire nel processo di approvvigionamento identificando le esigenze di acquisto sulla base delle specifiche di budget.'),
            c('tel-realizzare', 'Realizzare o mantenere un impianto organizzando il lavoro e i documenti',
              'Intervenire nella realizzazione e/o manutenzione di impianti elettrici civili/industriali, curandone gli aspetti organizzativi e documentativi.')
          ] },
          { id: 'domotica4', titolo: 'Se lavori su domotica e building automation', indirizzo: 'Building automation', competenze: [
            c('tel-ba-installare', 'Installare i componenti di un impianto di domotica o building automation',
              'Intervenire nell\'installazione di elementi per un impianto di building automation in base alle specifiche progettuali.'),
            c('tel-ba-programmare', 'Cablare, programmare e configurare un impianto di building automation e intervenire se non funziona',
              'Collaborare al cablaggio, alla programmazione e alla configurazione dell\'impianto intervenendo in caso di malfunzionamento dell\'impianto.')
          ] }
        ]
      }
    },
    informatica: {
      qualifica: {
        figura: 'Operatore informatico', fonte: 'Allegato B2 qualifiche, figura 24', eqf: 3,
        gruppi: [
          { id: 'tutti', titolo: 'In ogni lavoro', competenze: [PIANIFICARE, STRUMENTI, SICUREZZA] },
          { id: 'mestiere', titolo: 'Nel tuo mestiere', competenze: [
            c('inf-installare', 'Installare, configurare e usare computer, programmi per l\'ufficio e strumenti per comunicare',
              'Installare, configurare e utilizzare supporti informatici hardware e software tipici dell\'office automation e della comunicazione digitale sulla base delle specifiche esigenze del cliente.'),
            c('inf-manutenzione', 'Trovare e risolvere problemi di computer, reti e dispositivi',
              'Eseguire la manutenzione ordinaria e straordinaria di sistemi, reti, dispositivi e terminali utenti, individuando eventuali anomalie e problemi di funzionamento.'),
            c('inf-dati', 'Gestire dati e archivi digitali: inserirli, tenerli in ordine, trasferirli',
              'Effettuare l\'elaborazione, manutenzione e trasmissione di dati gestiti da archivi digitali.')
          ] }
        ]
      },
      diploma: {
        figura: 'Tecnico informatico', fonte: 'Allegato B2 diplomi, figura 25', eqf: 4,
        gruppi: [
          { id: 'mestiere4', titolo: 'Nel tuo mestiere, al quarto anno', competenze: [
            c('tinf-documentare', 'Preparare documenti o presentazioni che spiegano un prodotto, un servizio o un programma',
              'Elaborare prodotti di comunicazione che descrivono prodotti, servizi, componenti o applicazioni conformi con i requisiti relativi alla documentazione, identificando e selezionando lo stile e il media appropriato per il materiale di presentazione.'),
            c('tinf-interventi', 'Installare, aggiornare o dismettere apparecchiature annotando indirizzi e configurazioni',
              'Curare gli interventi necessari pianificati per implementare la soluzione, tra cui l\'installazione, l\'aggiornamento e la dismissione, registrando tutte le informazioni rilevanti, compreso gli indirizzi delle apparecchiature, i dati di configurazione e di performance.'),
            c('tinf-sicurezza', 'Proteggere dati e sistemi: controllare e intervenire contro intrusioni e falle',
              'Collaborare all\'implementazione delle politiche della sicurezza dell\'informazione, controllando e attuando interventi a fronte di intrusioni, frodi e buchi o falle della sicurezza al fine di assicurare che i rischi legati siano analizzati e gestiti per i dati e le informazioni aziendali.')
          ] },
          { id: 'reti4', titolo: 'Se lavori su sistemi e reti', indirizzo: 'Sistemi, reti e data management', competenze: [
            c('tinf-sistemi', 'Installare hardware e software in un sistema esistente, controllando che siano compatibili',
              'Installare hardware, software o componenti di sottosistema in un sistema esistente o proposto, conformandosi ai processi e alle procedure definite, identificando la compatibilità delle specifiche hardware e software e proponendo eventuali azioni di recupero.')
          ] },
          { id: 'sviluppo4', titolo: 'Se lavori sullo sviluppo di programmi', indirizzo: 'Sviluppo soluzioni ICT', competenze: [
            c('tinf-progettare', 'Progettare un\'applicazione partendo da quello che serve al cliente',
              'Realizzare sulla base delle analisi effettuate, delle specifiche rilevate e dei modelli esistenti un nuovo modello per implementare le applicazioni in conformità con la politica e le esigenze dell\'utente/cliente.'),
            c('tinf-sviluppare', 'Scrivere o modificare un programma semplice e provarlo',
              'Adattare le soluzioni esistenti, sviluppando e collaudando applicativi di bassa complessità.'),
            c('tinf-test', 'Preparare ed eseguire test per controllare che un sistema faccia quello che deve',
              'Costruire, effettuandone la relativa implementazione, le procedure di test sistematico per i sistemi IT o per i requisiti di usabilità del cliente per stabilire la conformità con le specifiche di progettazione.')
          ] }
        ]
      }
    },
    estetica: {
      qualifica: {
        figura: 'Operatore del benessere, erogazione dei servizi di trattamento estetico', fonte: 'Allegato B2 qualifiche, figura 10', eqf: 3,
        gruppi: [
          { id: 'tutti', titolo: 'In ogni lavoro', competenze: [PIANIFICARE, STRUMENTI, SICUREZZA] },
          { id: 'mestiere', titolo: 'Nel tuo mestiere', competenze: [
            c('est-accoglienza', 'Accogliere il cliente e capire di che cosa ha bisogno',
              'Effettuare l\'accoglienza e l\'assistenza adottando adeguate modalità di approccio e orientamento al cliente.'),
            c('est-esercizio', 'Aiutare nella gestione e nella promozione del centro estetico',
              'Collaborare alla gestione e promozione dell\'esercizio.'),
            c('est-trattamenti', 'Eseguire trattamenti estetici di base scegliendo i prodotti adatti',
              'Eseguire i trattamenti di base, individuando i prodotti cosmetici in funzione del trattamento da realizzare.')
          ] }
        ]
      },
      diploma: {
        figura: 'Tecnico dei trattamenti estetici', fonte: 'Allegato B2 diplomi, figura 9', eqf: 4,
        gruppi: [
          { id: 'mestiere4', titolo: 'Nel tuo mestiere, al quarto anno', competenze: [
            c('test-planning', 'Organizzare gli appuntamenti e tenere aggiornate le schede dei clienti',
              'Intervenire nell\'organizzazione dell\'esercizio gestendo il planning e l\'archivio delle schede cliente, funzionalmente ai servizi richiesti.'),
            c('test-gestione', 'Seguire la promozione, la cassa e i documenti del centro',
              'Intervenire nella gestione dell\'esercizio presidiandone la promozione e i flussi informativi a supporto delle attività di carattere contabile, fiscale e commerciale.'),
            c('test-accoglienza', 'Accogliere il cliente e adattare il servizio a lui',
              'Predisporre e gestire l\'accoglienza e l\'assistenza della clientela in funzione della personalizzazione del servizio.'),
            c('test-pelle', 'Osservare la pelle e capire quale trattamento serve',
              'Analizzare le caratteristiche e lo stato della pelle, individuando le specificità e le tipologie di intervento.'),
            c('test-trattamenti', 'Programmare ed eseguire un trattamento su misura e controllare il risultato',
              'Programmare ed effettuare trattamenti estetici personalizzati sulla base delle esigenze del cliente, scegliendo i prodotti cosmetici e verificandone l\'applicazione e il risultato rispetto al benessere psico-fisico del cliente.')
          ] }
        ]
      }
    }
  };

  // ---------- Competenze di base ----------
  // Fonte: Regione Lombardia, DGR 3192/2020, Allegato B1 «Standard minimi formativi competenze di base del terzo e quarto anno».
  // Livello: III anno = III EQF (lingua straniera A2 QCER), IV anno = IV EQF (lingua straniera B1 QCER).
  // Le competenze di IV livello presuppongono quelle di III (B1, parte I): al IV anno si mostrano solo quelle di IV.
  // «semplice» è scritta per questo progetto, DA RIVEDERE con i docenti dell'area culturale (vale RIVISTO).
  const FONTE_BASE = 'Regione Lombardia, DGR 3192/2020, Allegato B1 (competenze di base)';
  function b(id, semplice, ufficiale, area) { return { id: id, semplice: semplice, ufficiale: ufficiale, area: area }; }
  const BASE = {
    qualifica: { livello: 'III livello EQF; lingua straniera A2 QCER', competenze: [
      b('base3-italiano', 'Parlare, leggere e scrivere in italiano a scuola, al lavoro e nella vita',
        'Esprimersi e comunicare in lingua italiana in contesti personali, professionali e di vita', 'Competenze alfabetiche funzionali'),
      b('base3-media', 'Comunicare con immagini, suoni e strumenti digitali',
        'Comunicare utilizzando semplici materiali visivi, sonori e digitali, con riferimento anche ai linguaggi e alle forme espressive artistiche e creative', 'Competenze alfabetiche funzionali'),
      b('base3-lingua', 'Capire e farti capire in una lingua straniera, in situazioni semplici',
        'Esprimersi e comunicare in lingua straniera in contesti personali, professionali e di vita (liv. A2 QCER)', 'Competenza linguistica'),
      b('base3-matematica', 'Usare numeri e calcoli per risolvere problemi del lavoro e della vita',
        'Utilizzare concetti matematici, semplici procedure di calcolo e di analisi per descrivere e interpretare dati di realtà e per risolvere situazioni problematiche di vario tipo legate al proprio contesto di vita quotidiano e professionale', 'Competenze matematiche, scientifiche e tecnologiche'),
      b('base3-scienze', 'Capire i fenomeni e i materiali del tuo mestiere, rispettando l\'ambiente',
        'Utilizzare concetti e semplici procedure scientifiche per leggere fenomeni e risolvere semplici problemi legati al proprio contesto di vita quotidiano e professionale, nel rispetto dell\'ambiente', 'Competenze matematiche, scientifiche e tecnologiche'),
      b('base3-economia', 'Conoscere il lavoro del tuo settore e le sue opportunità',
        'Identificare la cultura distintiva e le opportunità del proprio ambito lavorativo, nel contesto e nel sistema socio-economico territoriale e complessivo', 'Competenze storico-geografico-giuridiche ed economiche'),
      b('base3-storia', 'Leggere il tuo territorio e la sua storia, confrontando epoche e luoghi',
        'Leggere il proprio territorio e contesto storico-culturale e lavorativo, in una dimensione diacronica attraverso il confronto fra epoche e in una dimensione sincronica attraverso il confronto fra aree geografiche e culturali', 'Competenze storico-geografico-giuridiche ed economiche'),
      b('base3-digitale', 'Usare computer, telefono e app per comunicare e trovare informazioni',
        'Utilizzare le tecnologie informatiche per la comunicazione e la ricezione di informazioni', 'Competenza digitale'),
      b('base3-cittadinanza', 'Conoscere e rispettare diritti e doveri, a scuola, al lavoro e fuori',
        'Esercitare diritti e doveri nel proprio ambito esperienziale di vita e professionale, nel tessuto sociale e civile locale e nel rispetto dell\'ambiente', 'Competenza di cittadinanza')
    ] },
    diploma: { livello: 'IV livello EQF; lingua straniera B1 QCER', competenze: [
      b('base4-italiano', 'Usare l\'italiano in modo adatto a ogni situazione, anche tecnica',
        'Utilizzare il patrimonio lessicale ed espressivo della lingua italiana secondo le esigenze comunicative nei vari contesti sociali, culturali, economici, tecnologici e professionali', 'Competenze alfabetiche funzionali'),
      b('base4-media', 'Scegliere e usare immagini, video e strumenti della rete per comunicare',
        'Selezionare e utilizzare le forme di comunicazione visiva e multimediale, con riferimento anche alle diverse forme espressive e agli strumenti tecnici della comunicazione in rete', 'Competenze alfabetiche funzionali'),
      b('base4-lingua', 'Usare una lingua straniera, anche quella del tuo mestiere, a scuola e al lavoro',
        'Utilizzare i codici anche settoriali della lingua straniera per comprendere le diverse tradizioni culturali in una prospettiva interculturale e interagire nei diversi contesti di studio e di lavoro (liv. B1 QCER)', 'Competenza linguistica'),
      b('base4-matscienze', 'Usare matematica e metodo scientifico per risolvere problemi del tuo settore',
        'Rappresentare la realtà e risolvere situazioni problematiche di vita e del proprio settore professionale avvalendosi degli strumenti matematici fondamentali e sulla base di modelli e metodologie scientifiche', 'Competenze matematiche, scientifiche e tecnologiche'),
      b('base4-economia', 'Usare gli strumenti dell\'economia e dell\'organizzazione del lavoro',
        'Utilizzare nel proprio ambito professionale i principali strumenti e modelli relativi all\'economia, alla gestione aziendale e all\'organizzazione dei processi lavorativi', 'Competenze storico-geografico-giuridiche ed economiche'),
      b('base4-storia', 'Capire come cambia il tuo settore e che cosa lo fa crescere',
        'Riconoscere gli aspetti caratteristici, le tendenze evolutive, i limiti e le potenzialità di crescita del sistema socio-economico e del settore professionale di riferimento, in rapporto all\'ambiente, ai processi di innovazione scientifico-tecnologica e di sviluppo del capitale umano', 'Competenze storico-geografico-giuridiche ed economiche'),
      b('base4-digitale', 'Usare reti e strumenti informatici con consapevolezza, per studio e lavoro',
        'Utilizzare le reti e gli strumenti informatici in maniera consapevole nelle attività di studio, ricerca, sociali e professionali', 'Competenza digitale'),
      b('base4-cittadinanza', 'Scegliere come comportarti secondo regole tue, la Costituzione e i valori del mestiere',
        'Valutare fatti e orientare i propri comportamenti in riferimento ad un proprio codice etico, coerente con i principi della Costituzione e con i valori della comunità professionale di appartenenza, nel rispetto dell\'ambiente e delle diverse identità culturali', 'Competenza di cittadinanza')
    ] }
  };

  // ---------- Competenze personali, sociali, di apprendimento e imprenditoriali ----------
  // Fonte: Accordo tra le Regioni del 18 dicembre 2019 (19/210/CR10/C9), Allegato 2; per i quadriennali di filiera la Lombardia
  // ne chiede sviluppo, valutazione e certificazione distinta (DGR 2954/2024, Allegato B, punto 2). Per i percorsi ordinari
  // l'Accordo (punto 4) le esclude dai requisiti d'esame e dagli attestati: nel bilancio restano autovalutazione.
  const FONTE_TRASVERSALI = 'Accordo Regioni 18/12/2019, Allegato 2 (competenze personali, sociali, di apprendimento e imprenditoriali)';
  const TRASVERSALI = [
    { id: 'tr-collaborare', semplice: 'Lavorare con gli altri: collaborare, ascoltare, gestire un disaccordo', ufficiale: 'Lavorare con gli altri in maniera costruttiva' },
    { id: 'tr-apprendere', semplice: 'Organizzare il tuo modo di imparare e capire che cosa ti serve', ufficiale: 'Gestire il proprio apprendimento e sviluppo professionale' },
    { id: 'tr-iniziativa', semplice: 'Prendere iniziative, proporre idee e portarle a termine', ufficiale: 'Agire in modo imprenditoriale ed innovativo' },
    { id: 'tr-benessere', semplice: 'Prenderti cura della tua salute e gestire la fatica e lo stress', ufficiale: 'Sviluppare e mantenere il proprio benessere fisico ed emotivo' }
  ];

  // ---------- Curvatura del profilo nei percorsi quadriennali di filiera ----------
  // DGR 2954/2024, Allegato B, punto 5: nei quadriennali la Figura si curva in un Profilo verso la Figura/Profilo ITS, con competenze
  // tecnico-professionali e culturali declinate dall'istituzione formativa. Il testo NON è normato dalla Regione: va preso dal PFP
  // del CFP (Scheda per la rilevazione delle soluzioni formative, Decreto 17944/2024). Finché non c'è, l'elenco resta vuoto e il
  // catalogo mostra solo la figura nazionale. Forma: { <indirizzo>: { anni: ['anno1', …], profilo: '…', fonte: '…', competenze: [ {id, semplice, ufficiale} ] } }.
  const CURVATURE = {
    informatica: { anni: ['anno1', 'anno2', 'anno3', 'anno4'], profilo: '', fonte: 'PFP del CFP (da inserire)', competenze: [] }
  };

  // Gli indirizzi del Repertorio tra cui scegliere: lo standard minimo è la Figura più l'indirizzo scelto (Decreto 12550/2013, Indicazioni
  // regionali, §3.2). «qualifica» per I-IV anno, «diploma» solo al IV.
  function articolazioniPer(indirizzo, anno) {
    const f = FIGURE[indirizzo];
    if (!f) return { qualifica: [], diploma: [] };
    function se(liv) { return f[liv].gruppi.filter(function (g) { return g.indirizzo; }).map(function (g) { return { id: g.id, titolo: g.titolo, indirizzo: g.indirizzo }; }); }
    return { qualifica: se('qualifica'), diploma: anno === 'anno4' ? se('diploma') : [] };
  }

  // Gruppi da mostrare a uno studente: anno 'anno1'…'anno4' (come nel bilancio). Senza anno: la qualifica.
  // Al IV anno prima le competenze del diploma, poi quelle del III anno (che si continuano a usare).
  // opz.articolazioni = { qualifica: <id gruppo>, diploma: <id gruppo> }: se c'è, degli indirizzi si mostra solo quello scelto.
  // opz.soloTecniche: solo le competenze tecnico-professionali (senza base, trasversali e curvatura).
  // Ogni gruppo ha «area» (tecnica, curvatura, base, trasversale) e «fonte»; «chiuso» = da mostrare chiuso.
  function gruppiPer(indirizzo, anno, opz) {
    const f = FIGURE[indirizzo];
    if (!f) return [];
    const o = opz || {};
    const art = o.articolazioni || {};
    function filtra(liv, gruppi) {
      const scelto = art[liv];
      const valido = scelto && gruppi.some(function (g) { return g.indirizzo && g.id === scelto; });
      return gruppi.filter(function (g) { return !valido || !g.indirizzo || g.id === scelto; });
    }
    function conFonte(g, fonte, extra) {
      // Un gruppo «Se lavori su…» resta chiuso, tranne quello dell'indirizzo che lo studente ha scelto.
      const scelto = g.indirizzo && (art.qualifica === g.id || art.diploma === g.id);
      return Object.assign({ id: g.id, titolo: g.titolo, competenze: g.competenze, area: 'tecnica', fonte: fonte, chiuso: !!g.indirizzo && !scelto }, g.indirizzo ? { indirizzo: g.indirizzo } : {}, extra || {});
    }
    let out;
    if (anno !== 'anno4') out = filtra('qualifica', f.qualifica.gruppi).map(function (g) { return conFonte(g, 'Repertorio IeFP Lombardia, ' + f.qualifica.fonte); });
    else {
      out = filtra('diploma', f.diploma.gruppi).map(function (g) { return conFonte(g, 'Repertorio IeFP Lombardia, ' + f.diploma.fonte); })
        .concat(filtra('qualifica', f.qualifica.gruppi).map(function (g) {
          return conFonte(g, 'Repertorio IeFP Lombardia, ' + f.qualifica.fonte, { titolo: g.titolo + ' (dal terzo anno)' });
        }));
    }
    if (o.soloTecniche) return out;
    const cv = CURVATURE[indirizzo];
    if (cv && cv.competenze.length && cv.anni.indexOf(anno) !== -1) {
      out.push({ id: 'curvatura', titolo: 'Nel tuo percorso di quattro anni', competenze: cv.competenze, area: 'curvatura', fonte: cv.fonte, chiuso: false });
    }
    const base = anno === 'anno4' ? BASE.diploma : BASE.qualifica;
    out.push({ id: 'base', titolo: 'Le competenze di base', competenze: base.competenze, area: 'base', fonte: FONTE_BASE + ', ' + base.livello, chiuso: true });
    out.push({ id: 'trasversali', titolo: 'Come lavori con gli altri e come impari', competenze: TRASVERSALI, area: 'trasversale', fonte: FONTE_TRASVERSALI, chiuso: true });
    return out;
  }

  function figuraPer(indirizzo, anno) {
    const f = FIGURE[indirizzo];
    if (!f) return '';
    return (anno === 'anno4' ? f.diploma : f.qualifica).figura;
  }

  // Tutte le competenze, per id (le ricorsive compaiono una volta sola). Dalle figure, dalla base, dalle trasversali e dalle curvature.
  const PER_ID = {};
  Object.keys(FIGURE).forEach(function (ind) {
    ['qualifica', 'diploma'].forEach(function (liv) {
      FIGURE[ind][liv].gruppi.forEach(function (g) {
        g.competenze.forEach(function (x) { PER_ID[x.id] = x; });
      });
    });
  });
  BASE.qualifica.competenze.concat(BASE.diploma.competenze, TRASVERSALI).forEach(function (x) { PER_ID[x.id] = x; });
  Object.keys(CURVATURE).forEach(function (ind) { CURVATURE[ind].competenze.forEach(function (x) { PER_ID[x.id] = x; }); });
  function trova(id) { return PER_ID[id] || null; }
  function esiste(id) { return Object.prototype.hasOwnProperty.call(PER_ID, id); }

  // La figura regionale di riferimento: nome, livello europeo (EQF) del titolo e allegato da cui viene. Per documenti e docenti, non per lo studente.
  // Attenzione: «eqf» è il livello del TITOLO di riferimento (qualifica o diploma), non un livello raggiunto dallo studente.
  // Con «articolazioni» aggiunge il nome ufficiale degli indirizzi scelti.
  function infoPer(indirizzo, anno, articolazioni) {
    const f = FIGURE[indirizzo];
    if (!f) return null;
    const x = anno === 'anno4' ? f.diploma : f.qualifica;
    const art = articolazioni || {};
    const indirizzi = [];
    ['diploma', 'qualifica'].forEach(function (liv) {
      if (liv === 'diploma' && anno !== 'anno4') return;
      const g = art[liv] && f[liv].gruppi.find(function (y) { return y.indirizzo && y.id === art[liv]; });
      if (g) indirizzi.push(g.indirizzo);
    });
    return { figura: x.figura, eqf: x.eqf, fonte: x.fonte, titolo: anno === 'anno4' ? 'diploma professionale (IV anno)' : 'qualifica (III anno)', indirizzi: indirizzi };
  }

  const COMPETENZE = { RIVISTO: RIVISTO, FIGURE: FIGURE, BASE: BASE, TRASVERSALI: TRASVERSALI, CURVATURE: CURVATURE, articolazioniPer: articolazioniPer, gruppiPer: gruppiPer, figuraPer: figuraPer, infoPer: infoPer, trova: trova, esiste: esiste };
  if (typeof module !== 'undefined' && module.exports) module.exports = COMPETENZE;
  else radice.BC_COMPETENZE = COMPETENZE;
})(typeof window !== 'undefined' ? window : globalThis);
