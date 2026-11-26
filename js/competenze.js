/* Catalogo delle competenze tecnico-professionali dei tre indirizzi del CFP.
   Fonte: Regione Lombardia, Repertorio dell'offerta di IeFP (DGR 3192 del 3 giugno 2020; la DGR 4615 del 23 giugno 2025
   non cambia queste figure): allegato B2 qualifiche (III anno, EQF 3) e allegato B2 diplomi (IV anno, EQF 4).
   Copia dei PDF in docs/fonti/. «ufficiale» è il testo dell'allegato; «semplice» è la frase che vede lo studente,
   scritta per questo progetto e DA RIVEDERE con i docenti di ogni indirizzo (RIVISTO = false finché non succede).
   Dal I al III anno vale la figura di qualifica; al IV quella di diploma, più le competenze del III anno.
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
          { id: 'civili', titolo: 'Se lavori su impianti di case e uffici', competenze: [
            c('el-civili', 'Realizzare un impianto elettrico di una casa o di un ufficio seguendo il progetto',
              'Realizzare impianti elettrici ad uso civile nel rispetto della normativa di settore e delle indicazioni contenute nel progetto.')
          ] },
          { id: 'industriali', titolo: 'Se lavori su impianti industriali, di negozi e servizi', competenze: [
            c('el-industriali', 'Realizzare un impianto elettrico industriale o di un negozio seguendo il progetto',
              'Realizzare impianti elettrici industriali e del terziario nel rispetto della normativa di settore e delle indicazioni contenute nel progetto.')
          ] },
          { id: 'speciali', titolo: 'Se lavori su allarmi e reti dati', competenze: [
            c('el-speciali', 'Realizzare un impianto di allarme, antincendio, videosorveglianza o controllo accessi, o una rete dati',
              'Realizzare impianti per la sicurezza (antintrusione, antincendio, video sorveglianza, controllo accessi) e per la rete dati nel rispetto della normativa di settore e sulla base delle specifiche tecniche contenute nel progetto esecutivo.')
          ] },
          { id: 'cablaggio', titolo: 'Se lavori su componenti e automazione', competenze: [
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
          { id: 'impianti4', titolo: 'Se lavori su impianti civili e industriali', competenze: [
            c('tel-progettare', 'Progettare un piccolo impianto civile o industriale',
              'Progettare impianti civili e industriali di piccola dimensione.'),
            c('tel-acquisti', 'Capire che materiali servono e prepararne l\'acquisto restando nel budget',
              'Intervenire nel processo di approvvigionamento identificando le esigenze di acquisto sulla base delle specifiche di budget.'),
            c('tel-realizzare', 'Realizzare o mantenere un impianto organizzando il lavoro e i documenti',
              'Intervenire nella realizzazione e/o manutenzione di impianti elettrici civili/industriali, curandone gli aspetti organizzativi e documentativi.')
          ] },
          { id: 'domotica4', titolo: 'Se lavori su domotica e building automation', competenze: [
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
          { id: 'reti4', titolo: 'Se lavori su sistemi e reti', competenze: [
            c('tinf-sistemi', 'Installare hardware e software in un sistema esistente, controllando che siano compatibili',
              'Installare hardware, software o componenti di sottosistema in un sistema esistente o proposto, conformandosi ai processi e alle procedure definite, identificando la compatibilità delle specifiche hardware e software e proponendo eventuali azioni di recupero.')
          ] },
          { id: 'sviluppo4', titolo: 'Se lavori sullo sviluppo di programmi', competenze: [
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

  // Gruppi da mostrare a uno studente: anno 'anno1'…'anno4' (come nel bilancio). Senza anno: la qualifica.
  // Al IV anno prima le competenze del diploma, poi quelle del III anno (che si continuano a usare).
  function gruppiPer(indirizzo, anno) {
    const f = FIGURE[indirizzo];
    if (!f) return [];
    if (anno !== 'anno4') return f.qualifica.gruppi;
    return f.diploma.gruppi.concat(f.qualifica.gruppi.map(function (g) {
      return { id: g.id, titolo: g.titolo + ' (dal terzo anno)', competenze: g.competenze };
    }));
  }

  function figuraPer(indirizzo, anno) {
    const f = FIGURE[indirizzo];
    if (!f) return '';
    return (anno === 'anno4' ? f.diploma : f.qualifica).figura;
  }

  // Tutte le competenze di tutte le figure, per id (le ricorsive compaiono una volta sola).
  const PER_ID = {};
  Object.keys(FIGURE).forEach(function (ind) {
    ['qualifica', 'diploma'].forEach(function (liv) {
      FIGURE[ind][liv].gruppi.forEach(function (g) {
        g.competenze.forEach(function (x) { PER_ID[x.id] = x; });
      });
    });
  });
  function trova(id) { return PER_ID[id] || null; }
  function esiste(id) { return Object.prototype.hasOwnProperty.call(PER_ID, id); }

  const COMPETENZE = { RIVISTO: RIVISTO, FIGURE: FIGURE, gruppiPer: gruppiPer, figuraPer: figuraPer, trova: trova, esiste: esiste };
  if (typeof module !== 'undefined' && module.exports) module.exports = COMPETENZE;
  else radice.BC_COMPETENZE = COMPETENZE;
})(typeof window !== 'undefined' ? window : globalThis);
