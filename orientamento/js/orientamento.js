/* Orientamento — logica pura: stato, normalizzazione, la mappa della filiera, le strade possibili, avanzamento.
   Nessun accesso al DOM: usato dal browser (window.BC_ORIENTAMENTO) e dai test Node (e dal server, per lo stato del pannello).
   Due parti: «Racconto il CFP» (orientamento in entrata: per chi deve scegliere) e «Cosa faccio dopo» (in uscita: per te).
   I fatti sulla filiera hanno la fonte in docs/FILIERA.md.
   Il documento resta indipendente: legge attività e bilancio solo su richiesta, e non li modifica mai. */
(function (radice) {
  'use strict';

  const CHIAVE = 'orientamento-v1';
  const VERSIONE = 1;
  const MAX_ATTIVITA = 3;
  const MAX_STRADE = 2;
  const MAX_PASSI = 3;
  const MAX_BREVE = 200;
  const MAX_LUNGO = 2000;
  const MAX_TESTO = 4000;

  // Racconto il CFP: le quattro domande dell'open day (gli id sono quelli che il bilancio aveva, per portare con sé le vecchie risposte)
  // e le domande che di solito fanno i ragazzi di terza media. Tutto facoltativo, tutto con le parole dello studente.
  const RACCONTO = [
    { id: 'presentati', etichetta: 'Chi sei e che cosa studi, in due righe.', esempio: '«Mi chiamo Sara e frequento Informatica.»' },
    { id: 'racconto', etichetta: 'Un\'esperienza da raccontare a chi è in terza media.', esempio: '«In un progetto di laboratorio abbiamo rimesso in funzione i computer di un\'associazione del quartiere…»' },
    { id: 'difficile', etichetta: 'Una cosa che è stata difficile e come l\'hai affrontata.', esempio: '«All\'inizio non capivo gli schemi. Mi è servito rifarli a mano, più volte.»' },
    { id: 'consiglio', etichetta: 'Un consiglio onesto per chi deve scegliere.', esempio: '«Venite a vedere i laboratori e chiedete agli studenti, non solo ai docenti.»' }
  ];
  const MEDIE = [
    { id: 'giornata', domanda: 'Com\'è una giornata al CFP?', esempio: '«Al mattino teoria, poi il laboratorio. Si finisce nel pomeriggio.»' },
    { id: 'pratica', domanda: 'Si fa solo pratica o anche studio?', esempio: '«Si fa tanta pratica, ma serve anche studiare: gli schemi si imparano prima sul quaderno.»' },
    { id: 'iscriversi', domanda: 'Devo essere bravo a scuola per iscrivermi?', esempio: '«No. Conta più la voglia di imparare un mestiere.»' },
    { id: 'prof', domanda: 'Come sono i professori?', esempio: '«Ti seguono da vicino, e in laboratorio lavorano con te.»' },
    { id: 'dopo', domanda: 'Che cosa si può fare dopo il CFP?', esempio: '«Si può lavorare, oppure fare il quarto anno.»' },
    { id: 'rifaresti', domanda: 'Rifaresti la stessa scelta?', esempio: '«Sì, perché …»' }
  ];

  const INDIRIZZI = [{ id: 'elettrico', testo: 'Elettrico' }, { id: 'informatica', testo: 'Informatica' }, { id: 'estetica', testo: 'Estetica' }];
  const ANNI = [{ id: 'anno1', testo: 'I anno' }, { id: 'anno2', testo: 'II anno' }, { id: 'anno3', testo: 'III anno' }, { id: 'anno4', testo: 'IV anno' }];

  // I percorsi di quattro anni della nuova filiera (riforma 4+2, legge 121/2024) al CFP: nel 2026/27 solo Informatica, I e II anno.
  // Da aggiornare a ogni settembre (vedi docs/FILIERA.md, «Da verificare»): chi non ci sta dentro segue il percorso 3+1.
  const PERCORSO_QUADRIENNALE = { informatica: ['anno1', 'anno2'] };

  // Le strade dopo la qualifica o dopo il diploma. Frasi corte: le leggono anche ragazzi che fanno fatica a leggere.
  const STRADE = [
    { id: 'lavoro', titolo: 'Lavorare', testo: 'Cerco lavoro con il mio titolo.' },
    { id: 'apprendistato', titolo: 'Apprendistato', testo: 'Lavoro in un\'azienda con un contratto e intanto continuo a studiare.' },
    { id: 'quarto', titolo: 'Quarto anno', testo: 'Faccio un anno in più e prendo il diploma professionale.' },
    { id: 'scuola', titolo: 'Scuola professionale', testo: 'Passo a una scuola professionale. Mi riconoscono quello che ho già fatto.' },
    { id: 'ifts', titolo: 'Corso IFTS', testo: 'Dopo il diploma faccio un corso tecnico più avanzato.' },
    { id: 'its', titolo: 'ITS Academy', testo: 'Dopo il diploma vado in una scuola di alta formazione tecnica.' },
    { id: 'quinto', titolo: 'Quinto anno e maturità', testo: 'Faccio un anno in più, poi l\'Esame di Stato. Con la maturità posso andare all\'università.' },
    { id: 'nonso', titolo: 'Non lo so ancora', testo: 'Va bene così. Intanto guardo le strade e ne parlo con un docente.' }
  ];

  function testo(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }
  function inElenco(v, elenco) { return elenco.some(function (x) { return x.id === v; }) ? v : ''; }
  function dataValida(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : ''; }
  function nuovoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function statoVuoto() {
    return { versione: VERSIONE, aggiornato: '', profilo: { indirizzo: '', anno: '' },
      uscita: { piace: '', attivita: [], imparare: '', strade: [], passi: [] },
      entrata: entrataVuota() };
  }
  function entrataVuota() {
    const e = { importato: false, testo: '', medie: {} };
    RACCONTO.forEach(function (r) { e[r.id] = ''; });
    MEDIE.forEach(function (m) { e.medie[m.id] = ''; });
    return e;
  }
  function passoVuoto() { return { id: nuovoId('p'), cosa: '', con: '', entro: '' }; }

  // Ricostruisce uno stato valido da dati salvati o caricati: scarta chiavi sconosciute e tipi errati.
  function normalizza(grezzo) {
    const s = statoVuoto();
    if (!grezzo || typeof grezzo !== 'object') return s;
    s.aggiornato = testo(grezzo.aggiornato, 40);
    const p = grezzo.profilo && typeof grezzo.profilo === 'object' ? grezzo.profilo : {};
    s.profilo.indirizzo = inElenco(p.indirizzo, INDIRIZZI);
    s.profilo.anno = inElenco(p.anno, ANNI);
    const u = grezzo.uscita && typeof grezzo.uscita === 'object' ? grezzo.uscita : {};
    s.uscita.piace = testo(u.piace, MAX_LUNGO);
    s.uscita.imparare = testo(u.imparare, MAX_LUNGO);
    s.uscita.attivita = (Array.isArray(u.attivita) ? u.attivita : [])
      .filter(function (x, i, arr) { return typeof x === 'string' && /^a[a-z0-9]{4,39}$/.test(x) && arr.indexOf(x) === i; }).slice(0, MAX_ATTIVITA);
    const viste = {};
    (Array.isArray(u.strade) ? u.strade : []).forEach(function (x) {
      if (!x || typeof x !== 'object' || !STRADE.some(function (st) { return st.id === x.id; }) || viste[x.id]) return;
      viste[x.id] = true;
      if (s.uscita.strade.length < MAX_STRADE) s.uscita.strade.push({ id: x.id, perche: testo(x.perche, MAX_LUNGO) });
    });
    const idP = {};
    (Array.isArray(u.passi) ? u.passi : []).slice(0, MAX_PASSI).forEach(function (x) {
      if (!x || typeof x !== 'object') return;
      let id = testo(x.id, 40);
      if (!id || idP[id]) id = nuovoId('p');
      idP[id] = true;
      s.uscita.passi.push({ id: id, cosa: testo(x.cosa, MAX_BREVE), con: testo(x.con, MAX_BREVE), entro: dataValida(x.entro) });
    });
    const en = grezzo.entrata && typeof grezzo.entrata === 'object' ? grezzo.entrata : {};
    s.entrata.importato = en.importato === true;
    s.entrata.testo = testo(en.testo, MAX_TESTO);
    RACCONTO.forEach(function (r) { s.entrata[r.id] = testo(en[r.id], MAX_LUNGO); });
    const me = en.medie && typeof en.medie === 'object' && !Array.isArray(en.medie) ? en.medie : {};
    MEDIE.forEach(function (m) { s.entrata.medie[m.id] = testo(me[m.id], MAX_LUNGO); });
    return s;
  }

  // Le risposte che lo studente aveva scritto nella sezione «Orientamento» del bilancio (ora tolta di lì): si portano qui una volta sola.
  // Ritorna true se ha copiato qualcosa. «legacy» è l'oggetto orientamento del bilancio come salvato.
  function importaDalBilancio(stato, legacy) {
    const e = stato.entrata;
    if (e.importato) return false;
    e.importato = true;
    if (!legacy || typeof legacy !== 'object') return false;
    const vuota = !pieno(e.testo) && RACCONTO.every(function (r) { return !pieno(e[r.id]); });
    if (!vuota) return false;
    let copiato = false;
    RACCONTO.forEach(function (r) { if (pieno(legacy[r.id])) { e[r.id] = testo(legacy[r.id], MAX_LUNGO); copiato = true; } });
    if (pieno(legacy.testo)) { e.testo = testo(legacy.testo, MAX_TESTO); copiato = true; }
    return copiato;
  }

  // La bozza del testo per l'open day: le risposte in ordine, senza riscriverle.
  function componiTesto(stato) {
    return RACCONTO.map(function (r) { return (stato.entrata[r.id] || '').trim(); }).filter(Boolean).join('\n\n');
  }
  // Le strade scelte in «Cosa faccio dopo», per rispondere a «che cosa si può fare dopo il CFP?».
  function fraseStrade(stato) {
    const t = stato.uscita.strade.filter(function (x) { return x.id !== 'nonso'; }).map(function (x) { return strada(x.id).titolo; });
    return t.length ? 'Dopo il CFP io penso di: ' + t.join(', ') + '.' : '';
  }

  // ---------- La mappa ----------
  function eQuadriennale(profilo) {
    const a = PERCORSO_QUADRIENNALE[profilo && profilo.indirizzo];
    return !!a && a.indexOf(profilo.anno) !== -1;
  }

  // Le tappe della strada, per il percorso dello studente. «qui»: la tappa in cui si trova. «cambi»: gli id delle strade possibili in quel punto.
  function mappa(profilo) {
    const quad = eQuadriennale(profilo);
    const a = profilo && profilo.anno;
    const t = [];
    if (quad) {
      t.push({ id: 'anni', titolo: 'Dal 1° al 4° anno', testo: 'Impari il mestiere in laboratorio e in azienda. Il tuo percorso dura quattro anni.', qui: !!a && a !== '', cambi: ['scuola'] });
      t.push({ id: 'diploma', titolo: 'Fine del 4° anno: diploma professionale', testo: 'Ricevi il diploma professionale.', qui: false, cambi: ['lavoro', 'apprendistato', 'ifts', 'its', 'quinto'] });
    } else {
      t.push({ id: 'anno1', titolo: '1° anno', testo: 'Impari le basi del mestiere.', qui: a === 'anno1', cambi: [] });
      t.push({ id: 'anno2', titolo: '2° anno', testo: 'Impari di più, in laboratorio e in azienda.', qui: a === 'anno2', cambi: [] });
      t.push({ id: 'qualifica', titolo: 'Fine del 3° anno: qualifica', testo: 'Ricevi la qualifica professionale. Con la qualifica puoi andare al quarto anno.', qui: a === 'anno3', cambi: ['quarto', 'lavoro', 'apprendistato', 'scuola'] });
      t.push({ id: 'diploma', titolo: 'Fine del 4° anno: diploma professionale', testo: 'Ricevi il diploma professionale.', qui: a === 'anno4', cambi: ['lavoro', 'apprendistato', 'ifts', 'its', 'quinto'] });
    }
    t.push({ id: 'maturita', titolo: 'Dopo il diploma: quinto anno e maturità', testo: 'Un anno in più per l\'Esame di Stato. Poi puoi andare all\'università o in un ITS.', qui: false, cambi: [], facoltativa: true });
    return t;
  }

  // Le note da mostrare sotto la mappa. Solo fatti con fonte (docs/FILIERA.md); nessuna promessa.
  function note(profilo) {
    const n = [{ id: 'passaggi', testo: 'Puoi anche cambiare scuola. La scuola che ti accoglie guarda quello che hai già fatto e decide in che anno inserirti.' },
      { id: 'quinto', testo: 'Il quinto anno non è per tutti gli indirizzi e la Regione non lo finanzia: chiedi quanto costa e dove si fa.' }];
    if (eQuadriennale(profilo)) {
      n.unshift({ id: 'riforma', testo: 'Il tuo percorso è nella nuova filiera 4+2 (riforma del 2024). A certe condizioni puoi entrare in un ITS o fare l\'Esame di Stato in modo più diretto. Chiedi al docente se valgono per te.' });
    }
    return n;
  }

  // Le strade che ha senso mostrare, per il punto in cui si trova lo studente.
  function stradeDisponibili(profilo) {
    const quad = eQuadriennale(profilo);
    const a = profilo && profilo.anno;
    let ids;
    if (quad || a === 'anno4') ids = ['lavoro', 'apprendistato', 'ifts', 'its', 'quinto', 'scuola', 'nonso'];
    else if (a === 'anno1' || a === 'anno2' || a === 'anno3') ids = ['quarto', 'lavoro', 'apprendistato', 'scuola', 'nonso'];
    else ids = STRADE.map(function (x) { return x.id; });
    return ids.map(function (id) { return STRADE.find(function (x) { return x.id === id; }); });
  }
  function strada(id) { return STRADE.find(function (x) { return x.id === id; }) || null; }

  // ---------- Avanzamento (stessa forma di bilancio e curriculum: serve anche al pannello dei docenti) ----------
  const PASSI_ENTRATA = [{ id: 'racconto', titolo: 'Che cosa racconteresti' }, { id: 'medie', titolo: 'Le domande dei ragazzi' }, { id: 'testo', titolo: 'Il testo per l\'open day' }];
  const PASSI_USCITA = [
    { id: 'strada', titolo: 'La strada' }, { id: 'piace', titolo: 'Cosa mi piace' }, { id: 'sofare', titolo: 'Cosa so fare' },
    { id: 'dove', titolo: 'Dove vorrei andare' }, { id: 'prossimi', titolo: 'I prossimi passi' }, { id: 'foglio', titolo: 'Il mio foglio' }
  ];
  const PARTI = [
    { id: 'entrata', titolo: 'Racconto il CFP', per: 'Per chi deve scegliere dopo la terza media.', passi: PASSI_ENTRATA },
    { id: 'uscita', titolo: 'Cosa faccio dopo', per: 'Per te: le strade dopo il CFP.', passi: PASSI_USCITA }
  ];
  const PASSI = PASSI_ENTRATA.concat(PASSI_USCITA);
  function statoPasso(stato, id) {
    const u = stato.uscita;
    const en = stato.entrata;
    if (id === 'racconto') {
      const n = RACCONTO.filter(function (r) { return pieno(en[r.id]); }).length;
      return n === RACCONTO.length ? 'completa' : (n ? 'in_corso' : 'vuota');
    }
    if (id === 'medie') {
      const n = MEDIE.filter(function (m) { return pieno(en.medie[m.id]); }).length;
      return n >= 3 ? 'completa' : (n ? 'in_corso' : 'vuota');
    }
    if (id === 'testo') return pieno(en.testo) ? 'completa' : 'vuota';
    if (id === 'strada') return stato.profilo.indirizzo && stato.profilo.anno ? 'completa' : (stato.profilo.indirizzo || stato.profilo.anno ? 'in_corso' : 'vuota');
    if (id === 'piace') return pieno(u.piace) && u.attivita.length ? 'completa' : (pieno(u.piace) || u.attivita.length ? 'in_corso' : 'vuota');
    if (id === 'sofare') return pieno(u.imparare) ? 'completa' : 'vuota';
    if (id === 'dove') return u.strade.length ? (u.strade.every(function (x) { return x.id === 'nonso' || pieno(x.perche); }) ? 'completa' : 'in_corso') : 'vuota';
    if (id === 'prossimi') {
      const scritti = u.passi.filter(function (x) { return pieno(x.cosa); });
      return scritti.length ? 'completa' : (u.passi.length ? 'in_corso' : 'vuota');
    }
    // Il foglio è un riepilogo: è completo quando gli altri passi lo sono (tranne «La strada», che non chiede niente di personale).
    const altri = ['piace', 'sofare', 'dove', 'prossimi'].map(function (x) { return statoPasso(stato, x); });
    if (altri.every(function (x) { return x === 'completa'; })) return 'completa';
    return altri.some(function (x) { return x !== 'vuota'; }) ? 'in_corso' : 'vuota';
  }
  function avanzamento(stato) {
    const s = normalizza(stato);
    const stati = PASSI.map(function (p) { return statoPasso(s, p.id); });
    return { stati: stati, complete: stati.filter(function (x) { return x === 'completa'; }).length, totale: stati.length };
  }

  // ---------- Promemoria dal bilancio (solo lettura) ----------
  // Dal bilancio dello studente: le cose che dice di saper fare (con un esempio) e quelle che deve ancora imparare.
  // «grezzo» è il bilancio come salvato; B è BC_LOGICA (js/bilancio.js). Senza bilancio le due liste sono vuote.
  function promemoria(grezzo, B) {
    if (!grezzo || typeof grezzo !== 'object' || !B) return { soFare: [], devoImparare: [] };
    const b = B.componiBilancio(B.normalizza(grezzo));
    return {
      soFare: b.soFare.map(function (x) { return x.situazione + (x.livello ? ' (' + x.livello + ')' : ''); }),
      devoImparare: b.devoImparare.map(function (x) { return x.testo || x.fonte; }).filter(Boolean)
    };
  }

  const ORIENTAMENTO = {
    CHIAVE: CHIAVE, VERSIONE: VERSIONE, MAX_ATTIVITA: MAX_ATTIVITA, MAX_STRADE: MAX_STRADE, MAX_PASSI: MAX_PASSI,
    INDIRIZZI: INDIRIZZI, ANNI: ANNI, STRADE: STRADE, PASSI: PASSI, PASSI_ENTRATA: PASSI_ENTRATA, PASSI_USCITA: PASSI_USCITA, PARTI: PARTI,
    RACCONTO: RACCONTO, MEDIE: MEDIE, MAX_TESTO: MAX_TESTO, importaDalBilancio: importaDalBilancio, componiTesto: componiTesto, fraseStrade: fraseStrade, PERCORSO_QUADRIENNALE: PERCORSO_QUADRIENNALE,
    statoVuoto: statoVuoto, passoVuoto: passoVuoto, normalizza: normalizza, pieno: pieno,
    eQuadriennale: eQuadriennale, mappa: mappa, note: note, stradeDisponibili: stradeDisponibili, strada: strada,
    statoPasso: statoPasso, avanzamento: avanzamento, promemoria: promemoria
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ORIENTAMENTO;
  else radice.BC_ORIENTAMENTO = ORIENTAMENTO;
})(typeof window !== 'undefined' ? window : globalThis);
