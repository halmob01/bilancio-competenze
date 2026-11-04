/* Bilancio di competenze — logica pura (stato, completamento, dossier).
   Nessun accesso al DOM: usato dal browser (window.BC_LOGICA) e dai test Node. */
(function (radice) {
  'use strict';

  const DATI = (typeof module !== 'undefined' && module.exports)
    ? require('./dati.js')
    : radice.BC_DATI;

  const VERSIONE = 1;
  const MAX_BREVE = 200;
  const MAX_LUNGO = 4000;
  const MAX_ESPERIENZE = 30;
  const MAX_FORMAZIONE = 6;
  const MAX_LAVORO = 10;
  const MAX_PROFILO = 600;
  const MAX_LINGUE = 8;
  const MAX_FOTO = 150000;

  const CAMPI_ESPERIENZA = ['titolo', 'quando', 'contesto', 'azione', 'prova', 'difficolta', 'aiuto', 'autonomia'];

  function statoVuoto() {
    const sofare = {};
    DATI.SITUAZIONI.forEach(function (s) {
      sofare[s.id] = { livello: '', esempio: '', esperienze: [], come: '' };
    });
    const sguardo = {};
    DATI.SGUARDO.forEach(function (g) { sguardo[g.id] = ''; });
    const orientamento = { testo: '' };
    DATI.ORIENTAMENTO.forEach(function (o) { orientamento[o.id] = ''; });
    return {
      versione: VERSIONE,
      codice: nuovoCodice(),
      aggiornato: '',
      inviato: '',
      profilo: { nome: '', classe: '', indirizzo: '', anno: '' },
      anni: { anno1: '', anno2: '', anno3: '', anno4: '', tirocinio: '' },
      esperienze: [],
      sofare: sofare,
      sguardo: sguardo,
      orientamento: orientamento,
      cv: cvVuoto()
    };
  }

  // Dati del curriculum. Restano sul dispositivo dello studente: l'app non li
  // include nell'invio al docente.
  function cvVuoto() {
    return {
      telefono: '', email: '', citta: '', nascita: '', patente: '',
      occupazione: '', nazionalita: '', foto: '',
      profilo: '',
      formato: { impaginazione: 'originale', colore: 'nero', carattere: 'moderno', dimensione: 'normale', firma: false, luogo: '' },
      formazione: [],
      lavoro: [],
      competenze: '', lingue: '', digitali: '', altro: '',
      lingueElenco: [],
      consenso: false
    };
  }

  function linguaVuota() {
    const livelli = {};
    DATI.LINGUA_ABILITA.forEach(function (a) { livelli[a.id] = ''; });
    return { id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nome: '', madre: false, livelli: livelli };
  }

  function lavoroVuoto(tipo) {
    return { id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tipo: tipo || '', azienda: '', citta: '', mansione: '', dal: '', al: '', inCorso: false, compiti: '' };
  }

  function formazioneVuota() {
    return { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), periodo: '', titolo: '', ente: '' };
  }

  function testo(v, max) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  }

  function inElenco(v, elenco) {
    return elenco.some(function (x) { return x.id === v; }) ? v : '';
  }

  // Codice anonimo del compilatore: permette al foglio del docente di
  // aggiornare la stessa riga quando lo studente invia di nuovo.
  function nuovoCodice() {
    let c = '';
    while (c.length < 20) c += Math.random().toString(36).slice(2);
    return c.slice(0, 20);
  }

  function nuovoId() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function esperienzaVuota() {
    const e = { id: nuovoId(), situazioni: [] };
    CAMPI_ESPERIENZA.forEach(function (c) { e[c] = ''; });
    return e;
  }

  // Ricostruisce uno stato valido da dati salvati o importati: scarta chiavi
  // sconosciute, tipi errati e riferimenti a esperienze inesistenti.
  function normalizza(grezzo) {
    const s = statoVuoto();
    if (!grezzo || typeof grezzo !== 'object') return s;

    if (/^[a-z0-9]{12,40}$/.test(grezzo.codice)) s.codice = grezzo.codice;
    s.aggiornato = testo(grezzo.aggiornato, 40);
    s.inviato = testo(grezzo.inviato, 40);

    const p = grezzo.profilo || {};
    s.profilo.nome = testo(p.nome, 80);
    s.profilo.classe = testo(p.classe, 40);
    s.profilo.indirizzo = inElenco(p.indirizzo, DATI.INDIRIZZI);
    s.profilo.anno = inElenco(p.anno, DATI.ANNI);

    const a = grezzo.anni || {};
    Object.keys(s.anni).forEach(function (k) { s.anni[k] = testo(a[k], MAX_LUNGO); });
    // Una versione precedente aveva un secondo campo per i tirocini: il testo confluisce nell'unico campo, senza perdere nulla.
    if (pieno(a.tirocinio2)) s.anni.tirocinio = [s.anni.tirocinio, testo(a.tirocinio2, MAX_LUNGO)].filter(pieno).join('\n\n').slice(0, MAX_LUNGO);

    const visti = {};
    (Array.isArray(grezzo.esperienze) ? grezzo.esperienze : []).slice(0, MAX_ESPERIENZE).forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      let id = testo(e.id, 40);
      if (!id || visti[id]) id = nuovoId();
      visti[id] = true;
      const n = { id: id };
      n.titolo = testo(e.titolo, MAX_BREVE);
      n.quando = inElenco(e.quando, DATI.QUANDO);
      n.contesto = testo(e.contesto, MAX_LUNGO);
      n.azione = testo(e.azione, MAX_LUNGO);
      n.prova = testo(e.prova, MAX_LUNGO);
      n.difficolta = testo(e.difficolta, MAX_LUNGO);
      n.aiuto = testo(e.aiuto, MAX_LUNGO);
      n.autonomia = inElenco(e.autonomia, DATI.AUTONOMIA);
      n.situazioni = (Array.isArray(e.situazioni) ? e.situazioni : [])
        .filter(function (x) { return inElenco(x, DATI.SITUAZIONI); });
      s.esperienze.push(n);
    });

    const sf = grezzo.sofare || {};
    DATI.SITUAZIONI.forEach(function (sit) {
      const g = sf[sit.id] || {};
      s.sofare[sit.id] = {
        livello: inElenco(g.livello, DATI.AUTONOMIA),
        esempio: testo(g.esempio, MAX_LUNGO),
        esperienze: (Array.isArray(g.esperienze) ? g.esperienze : [])
          .filter(function (id) { return visti[id]; }),
        come: testo(g.come, MAX_LUNGO)
      };
    });

    const sg = grezzo.sguardo || {};
    Object.keys(s.sguardo).forEach(function (k) { s.sguardo[k] = testo(sg[k], MAX_LUNGO); });

    const o = grezzo.orientamento || {};
    Object.keys(s.orientamento).forEach(function (k) { s.orientamento[k] = testo(o[k], MAX_LUNGO); });

    const c = grezzo.cv || {};
    ['telefono', 'nascita', 'patente'].forEach(function (k) { s.cv[k] = testo(c[k], 60); });
    s.cv.email = testo(c.email, 120);
    s.cv.occupazione = testo(c.occupazione, 120);
    s.cv.nazionalita = testo(c.nazionalita, 60);
    // La foto resta un piccolo JPEG ridimensionato dall'app: altro non viene accettato.
    s.cv.foto = (typeof c.foto === 'string' && c.foto.length <= MAX_FOTO && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(c.foto)) ? c.foto : '';
    const f0 = c.formato && typeof c.formato === 'object' ? c.formato : {};
    s.cv.formato.impaginazione = inElenco(f0.impaginazione, DATI.CV_IMPAGINAZIONI) || 'originale';
    s.cv.formato.colore = inElenco(f0.colore, DATI.CV_COLORI) || 'nero';
    s.cv.formato.carattere = inElenco(f0.carattere, DATI.CV_CARATTERI) || 'moderno';
    s.cv.formato.dimensione = inElenco(f0.dimensione, DATI.CV_DIMENSIONI) || 'normale';
    s.cv.formato.firma = f0.firma === true;
    s.cv.formato.luogo = testo(f0.luogo, 80);
    s.cv.citta = testo(c.citta, 80);
    s.cv.profilo = testo(c.profilo, MAX_PROFILO);
    ['competenze', 'lingue', 'digitali', 'altro'].forEach(function (k) { s.cv[k] = testo(c[k], MAX_LUNGO); });
    s.cv.consenso = c.consenso === true;
    const idG = {};
    (Array.isArray(c.lingueElenco) ? c.lingueElenco : []).slice(0, MAX_LINGUE).forEach(function (g) {
      if (!g || typeof g !== 'object') return;
      let id = testo(g.id, 40);
      if (!id || idG[id]) id = linguaVuota().id;
      idG[id] = true;
      const n = { id: id, nome: testo(g.nome, 60), madre: g.madre === true, livelli: {} };
      const l0 = g.livelli && typeof g.livelli === 'object' ? g.livelli : {};
      DATI.LINGUA_ABILITA.forEach(function (a) { n.livelli[a.id] = inElenco(l0[a.id], DATI.LINGUA_LIVELLI); });
      s.cv.lingueElenco.push(n);
    });
    const idF = {};
    (Array.isArray(c.formazione) ? c.formazione : []).slice(0, MAX_FORMAZIONE).forEach(function (f) {
      if (!f || typeof f !== 'object') return;
      let id = testo(f.id, 40);
      if (!id || idF[id]) id = formazioneVuota().id;
      idF[id] = true;
      s.cv.formazione.push({ id: id, periodo: testo(f.periodo, 60), titolo: testo(f.titolo, MAX_BREVE), ente: testo(f.ente, MAX_BREVE) });
    });
    const idL = {};
    (Array.isArray(c.lavoro) ? c.lavoro : []).slice(0, MAX_LAVORO).forEach(function (l) {
      if (!l || typeof l !== 'object') return;
      let id = testo(l.id, 40);
      if (!id || idL[id]) id = lavoroVuoto().id;
      idL[id] = true;
      s.cv.lavoro.push({
        id: id, tipo: inElenco(l.tipo, DATI.CV_TIPI_LAVORO),
        azienda: testo(l.azienda, MAX_BREVE), citta: testo(l.citta, 80), mansione: testo(l.mansione, MAX_BREVE),
        dal: testo(l.dal, 40), al: testo(l.al, 40), inCorso: l.inCorso === true, compiti: testo(l.compiti, MAX_LUNGO)
      });
    });

    return s;
  }

  // Quello che parte per il foglio del docente: tutto il bilancio tranne il curriculum (recapiti e foto restano sul dispositivo).
  function statoPerIlFoglio(stato) {
    const copia = Object.assign({}, stato);
    delete copia.cv;
    return copia;
  }

  // Anni da mostrare in base all'anno frequentato: se non è stato scelto, tutti.
  function anniDelPercorso(anno) {
    const ids = DATI.ANNI.map(function (x) { return x.id; });
    const i = ids.indexOf(anno);
    return i === -1 ? ids : ids.slice(0, i + 1);
  }

  function pieno(v) {
    return typeof v === 'string' && v.trim() !== '';
  }

  function trovaEsperienza(stato, id) {
    return stato.esperienze.find(function (e) { return e.id === id; }) || null;
  }

  function livello(id) {
    return DATI.AUTONOMIA.find(function (a) { return a.id === id; }) || null;
  }

  // Una competenza dichiarata richiede almeno un esempio (design.md §9):
  // un testo scritto o un'esperienza collegata.
  function haProva(stato, sitId) {
    const r = stato.sofare[sitId];
    if (!r) return false;
    if (pieno(r.esempio)) return true;
    return r.esperienze.some(function (id) { return trovaEsperienza(stato, id); });
  }

  function esperienzaCompleta(e) {
    return pieno(e.titolo) && pieno(e.azione) && e.quando !== '';
  }

  // Stato di una sezione: 'vuota' | 'in_corso' | 'completa'. Il bilancio è
  // un documento derivato: è completo quando lo sono le tre sezioni che lo alimentano.
  function statoSezione(stato, sezId) {
    let fatti = 0;
    let totale = 0;
    function conta(ok) { totale++; if (ok) fatti++; }

    if (sezId === 'percorso') {
      conta(stato.profilo.indirizzo !== '');
      Object.keys(stato.anni).forEach(function (k) { conta(pieno(stato.anni[k])); });
      // Un anno o il tirocinio possono restare vuoti: bastano tre righe, o una per ogni anno già vissuto se sono meno di tre.
      const anniPieni = Object.keys(stato.anni).filter(function (k) { return pieno(stato.anni[k]); }).length;
      const servono = Math.min(3, anniDelPercorso(stato.profilo.anno).length);
      if (stato.profilo.indirizzo !== '' && anniPieni >= servono) return 'completa';
    } else if (sezId === 'esperienze') {
      const complete = stato.esperienze.filter(esperienzaCompleta).length;
      if (complete >= 2) return 'completa';
      return stato.esperienze.length ? 'in_corso' : 'vuota';
    } else if (sezId === 'sofare') {
      let toccate = 0;
      DATI.SITUAZIONI.forEach(function (sit) {
        const r = stato.sofare[sit.id];
        const l = livello(r.livello);
        conta(l !== null && (!l.dichiara || haProva(stato, sit.id)));
        if (l !== null || pieno(r.esempio) || pieno(r.come) || r.esperienze.length) toccate++;
      });
      if (fatti === totale) return 'completa';
      return toccate ? 'in_corso' : 'vuota';
    } else if (sezId === 'sguardo') {
      Object.keys(stato.sguardo).forEach(function (k) { conta(pieno(stato.sguardo[k])); });
    } else if (sezId === 'bilancio') {
      const parti = ['esperienze', 'sofare', 'sguardo'].map(function (id) { return statoSezione(stato, id); });
      if (parti.every(function (x) { return x === 'completa'; })) return 'completa';
      return parti.some(function (x) { return x !== 'vuota'; }) ? 'in_corso' : 'vuota';
    } else if (sezId === 'cv') {
      const c = stato.cv;
      const c2 = componiCV(stato);
      const toccato = pieno(c.telefono) || pieno(c.email) || pieno(c.citta) || pieno(c.profilo) ||
        c.formazione.some(function (f) { return pieno(f.titolo); }) || c.lavoro.some(function (l) { return pieno(l.azienda) || pieno(l.mansione); }) ||
        pieno(c.competenze) || c2.lingue.length > 0 || pieno(c.digitali) || pieno(c.altro);
      if (c2.mancanti.length === 0 && (pieno(c.competenze) || c2.lingue.length > 0)) return 'completa';
      return toccato ? 'in_corso' : 'vuota';
    } else if (sezId === 'orientamento') {
      if (pieno(stato.orientamento.testo)) return 'completa';
      DATI.ORIENTAMENTO.forEach(function (o) { conta(pieno(stato.orientamento[o.id])); });
      return fatti ? 'in_corso' : 'vuota';
    }

    if (totale && fatti === totale) return 'completa';
    return fatti ? 'in_corso' : 'vuota';
  }

  function nomeQuando(id) {
    const q = DATI.QUANDO.find(function (x) { return x.id === id; });
    return q ? q.testo : '';
  }

  // Dossier non valutativo (design.md §7 «Bilancio»): So fare / Ho imparato così /
  // Posso dimostrarlo / Devo ancora imparare. Riporta soltanto le parole dello
  // studente; ogni voce ha un rimando («rif») alla schermata di origine.
  function componiBilancio(stato) {
    const b = {
      soFare: [],
      daDocumentare: [],
      hoImparato: [],
      possoDimostrarlo: [],
      devoImparare: [],
      maiAffrontato: []
    };

    DATI.SITUAZIONI.forEach(function (sit) {
      const r = stato.sofare[sit.id];
      const l = livello(r.livello);
      const rif = { sezione: 'sofare', schermata: sit.id };
      const collegate = r.esperienze.map(function (id) { return trovaEsperienza(stato, id); }).filter(Boolean);

      if (l && l.dichiara) {
        if (haProva(stato, sit.id)) {
          b.soFare.push({ situazione: sit.verbo, livello: l.breve, esempio: r.esempio.trim(), esperienze: collegate.map(function (e) { return e.titolo || 'Esperienza senza titolo'; }), rif: rif });
        } else {
          b.daDocumentare.push({ situazione: sit.verbo, livello: l.breve, rif: rif });
        }
        if (pieno(r.come)) b.hoImparato.push({ testo: r.come.trim(), fonte: sit.verbo, rif: rif });
        if (pieno(r.esempio)) b.possoDimostrarlo.push({ testo: r.esempio.trim(), fonte: sit.verbo, rif: rif });
      } else if (l && l.id === 'non_ancora') {
        // Per chi non lo sa ancora fare, «come» raccoglie che cosa gli servirebbe.
        b.devoImparare.push({ testo: pieno(r.come) ? r.come.trim() : '', fonte: sit.verbo, rif: rif });
      } else if (l && l.id === 'mai') {
        b.maiAffrontato.push({ situazione: sit.verbo, nota: r.come.trim(), rif: rif });
      }
    });

    stato.esperienze.forEach(function (e) {
      const rif = { sezione: 'esperienze', schermata: 'elenco', esperienza: e.id };
      const fonte = [e.titolo || 'Esperienza senza titolo', nomeQuando(e.quando)].filter(Boolean).join(' · ');
      if (pieno(e.difficolta)) b.hoImparato.push({ testo: e.difficolta.trim(), fonte: fonte + ' — la difficoltà', rif: rif });
      if (pieno(e.aiuto)) b.hoImparato.push({ testo: e.aiuto.trim(), fonte: fonte + ' — l\'aiuto', rif: rif });
      if (pieno(e.prova)) b.possoDimostrarlo.push({ testo: e.prova.trim(), fonte: fonte, rif: rif });
    });

    if (pieno(stato.sguardo.ancora)) {
      b.devoImparare.push({ testo: stato.sguardo.ancora.trim(), fonte: 'Uno sguardo critico', rif: { sezione: 'sguardo', schermata: 'ancora' } });
    }

    return b;
  }

  // Bozza del testo per l'open day: le risposte dello studente in ordine,
  // senza alcuna riscrittura (design.md §7 «Orientamento»).
  function componiOrientamento(stato) {
    return DATI.ORIENTAMENTO
      .map(function (o) { return (stato.orientamento[o.id] || '').trim(); })
      .filter(Boolean)
      .join('\n\n');
  }

  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  // «2025-03» (dal selettore del mese) diventa «marzo 2025»; il testo libero resta com'è.
  function formatoMese(v) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(v || '').trim());
    return m && +m[2] >= 1 && +m[2] <= 12 ? MESI[+m[2] - 1] + ' ' + m[1] : String(v || '').trim();
  }

  function periodoLavoro(l) {
    const dal = formatoMese(l.dal);
    const al = l.inCorso ? 'oggi' : formatoMese(l.al);
    return [dal, al].filter(Boolean).join(' – ');
  }

  // Chiave per ordinare dalla più recente: serve che le date siano nel formato del selettore.
  function chiaveLavoro(l) {
    if (l.inCorso) return /^\d{4}-\d{2}$/.test(l.dal) ? '9999-99-' + l.dal : null;
    const k = /^\d{4}-\d{2}$/.test(l.al) ? l.al : (/^\d{4}-\d{2}$/.test(l.dal) ? l.dal : null);
    return k && k + '-' + (/^\d{4}-\d{2}$/.test(l.dal) ? l.dal : '');
  }

  function righe(v) {
    return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // Frasi per il campo «competenze»: solo per le situazioni che lo studente dice
  // di saper fare E ha documentato con un esempio, come nel bilancio.
  function suggerisciCompetenze(stato) {
    return DATI.SITUAZIONI.filter(function (sit) {
      const l = livello(stato.sofare[sit.id].livello);
      return l && l.dichiara && haProva(stato, sit.id);
    }).map(function (sit) { return sit.cv; });
  }

  // Curriculum: solo le parole dello studente, ordinate. Nessuna riscrittura.
  // Lingue nel formato Europass. Ogni riga è «Lingua: livello»:
  // - «madrelingua» o «lingua madre» la mette tra le lingue madri;
  // - un livello europeo (A1-C2) vale per tutte e cinque le abilità;
  // - cinque livelli di seguito («B1 B1 A2 A2 A2») sono, nell'ordine: ascolto, lettura,
  //   interazione orale, produzione orale, produzione scritta;
  // - qualsiasi altro testo resta com'è, senza essere tradotto in un livello.
  function lingueEuropass(righeLingue) {
    const madre = [];
    const altre = [];
    righeLingue.forEach(function (r) {
      const i = r.indexOf(':');
      const nome = (i === -1 ? r : r.slice(0, i)).trim();
      const resto = i === -1 ? '' : r.slice(i + 1).trim();
      if (!nome) return;
      if (/madre|madrelingua/i.test(resto)) { madre.push(nome); return; }
      const liv = resto.toUpperCase().split(/[\s,;\/]+/).filter(Boolean);
      const valido = function (x) { return /^[ABC][12]$/.test(x); };
      let livelli = null;
      if (liv.length === 1 && valido(liv[0])) livelli = [liv[0], liv[0], liv[0], liv[0], liv[0]];
      else if (liv.length === 5 && liv.every(valido)) livelli = liv;
      altre.push({ lingua: nome, livelli: livelli, testo: livelli ? '' : resto });
    });
    return { madre: madre, altre: altre };
  }

  // Lingue dell'elenco strutturato: una riga di testo per gli altri modelli e i dati per la tabella Europass.
  // Se l'elenco è vuoto valgono le righe di testo libero salvate da versioni precedenti.
  function lingueDelCV(c) {
    const elenco = (c.lingueElenco || []).filter(function (g) { return pieno(g.nome); });
    if (!elenco.length) return { righe: righe(c.lingue), eu: lingueEuropass(righe(c.lingue)) };
    const parola = function (id) { return (DATI.LINGUA_LIVELLI.find(function (x) { return x.id === id; }) || {}).breve || ''; };
    const righeTesto = elenco.map(function (g) {
      const nome = g.nome.trim();
      if (g.madre) return nome + ': madrelingua';
      const parti = DATI.LINGUA_ABILITA.filter(function (a) { return g.livelli[a.id]; });
      if (!parti.length) return nome;
      const uguali = parti.length === DATI.LINGUA_ABILITA.length && parti.every(function (a) { return g.livelli[a.id] === g.livelli[parti[0].id]; });
      return nome + ': ' + (uguali ? parola(g.livelli[parti[0].id])
        : parti.map(function (a) { return a.breve + ' ' + parola(g.livelli[a.id]); }).join(', '));
    });
    return {
      righe: righeTesto,
      eu: {
        madre: elenco.filter(function (g) { return g.madre; }).map(function (g) { return g.nome.trim(); }),
        altre: elenco.filter(function (g) { return !g.madre; }).map(function (g) {
          const liv = DATI.LINGUA_ABILITA.map(function (a) { return g.livelli[a.id] || ''; });
          return { lingua: g.nome.trim(), livelli: liv.some(Boolean) ? liv : null, testo: '' };
        })
      }
    };
  }

  function componiCV(stato) {
    const c = stato.cv;
    const contatti = [];
    if (pieno(c.citta)) contatti.push({ etichetta: 'Indirizzo', valore: c.citta.trim() });
    if (pieno(c.telefono)) contatti.push({ etichetta: 'Telefono', valore: c.telefono.trim() });
    if (pieno(c.email)) contatti.push({ etichetta: 'Email', valore: c.email.trim() });
    if (pieno(c.nascita)) contatti.push({ etichetta: 'Nato/a il', valore: c.nascita.trim() });
    if (pieno(c.nazionalita)) contatti.push({ etichetta: 'Nazionalità', valore: c.nazionalita.trim() });
    if (pieno(c.patente)) contatti.push({ etichetta: 'Patente', valore: c.patente.trim() });

    const formazione = c.formazione.filter(function (f) { return pieno(f.titolo); }).map(function (f) {
      return { periodo: f.periodo.trim(), titolo: f.titolo.trim(), ente: f.ente.trim() };
    });

    const lingue = lingueDelCV(c);

    const lavori = c.lavoro.filter(function (l) { return pieno(l.azienda) || pieno(l.mansione); });
    // Dalla più recente alla più vecchia, ma solo se tutte le date si possono confrontare.
    const chiavi = lavori.map(chiaveLavoro);
    if (lavori.length > 1 && chiavi.every(function (k) { return k !== null; })) {
      lavori.sort(function (a, b) { const ka = chiaveLavoro(a), kb = chiaveLavoro(b); return ka < kb ? 1 : ka > kb ? -1 : 0; });
    }
    const esperienze = lavori.map(function (l) {
      const tipo = (DATI.CV_TIPI_LAVORO.find(function (x) { return x.id === l.tipo; }) || {}).testo || '';
      const conMansione = pieno(l.mansione);
      return {
        id: l.id,
        titolo: conMansione ? l.mansione.trim() : l.azienda.trim(),
        dove: (conMansione ? [l.azienda.trim(), l.citta.trim()] : [l.citta.trim()]).filter(Boolean).join(', '),
        periodo: periodoLavoro(l),
        tipo: tipo,
        descrizione: (l.compiti || '').trim()
      };
    });

    const mancanti = [];
    if (!pieno(stato.profilo.nome)) mancanti.push('il tuo nome (sezione 01)');
    if (!pieno(c.telefono) && !pieno(c.email)) mancanti.push('un telefono o un indirizzo email');
    if (!formazione.length) mancanti.push('almeno un titolo di studio o corso');

    return {
      nome: (stato.profilo.nome || '').trim(),
      occupazione: c.occupazione.trim(),
      foto: c.foto,
      formato: c.formato,
      contatti: contatti,
      nascita: c.nascita.trim(),
      nazionalita: c.nazionalita.trim(),
      patente: c.patente.trim(),
      lingueEu: lingue.eu,
      profilo: c.profilo.trim(),
      formazione: formazione,
      esperienze: esperienze,
      competenze: righe(c.competenze),
      lingue: lingue.righe,
      digitali: righe(c.digitali),
      altro: righe(c.altro),
      consenso: c.consenso === true,
      mancanti: mancanti
    };
  }

  // Proposte di schede esperienza a partire dal diario di bordo (sito collegato, stessa origine).
  // Legge solo i campi di testo che il contratto prevede (docs/DIARIO.md) e non si fida di nient'altro.
  function esperienzeDalDiario(grezzo) {
    if (!grezzo || typeof grezzo !== 'object' || !Array.isArray(grezzo.tirocini)) return [];
    const t = function (v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; };
    const data = function (iso) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '');
      return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    };
    const proposte = grezzo.tirocini.slice(0, 12).map(function (tir) {
      if (!tir || typeof tir !== 'object') return null;
      const settimane = (Array.isArray(tir.settimane) ? tir.settimane : []).slice(0, 80).filter(function (x) { return x && typeof x === 'object'; });
      const azienda = t(tir.azienda, MAX_BREVE);
      const raccogli = function (campo) {
        return settimane.map(function (x) {
          const testoCampo = t(x[campo], MAX_LUNGO);
          return testoCampo ? 'Settimana dal ' + (data(x.dal) || '…') + ': ' + testoCampo : '';
        }).filter(Boolean).join('\n\n').slice(0, MAX_LUNGO);
      };
      const periodo = [data(tir.dal) ? 'dal ' + data(tir.dal) : '', data(tir.al) ? 'al ' + data(tir.al) : ''].filter(Boolean).join(' ');
      const mese = function (iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : ''; };
      const proposta = {
        id: t(tir.id, 40),
        azienda: azienda,
        citta: t(tir.citta, 80),
        dalMese: mese(tir.dal),
        alMese: mese(tir.al),
        // Per il curriculum: le cose fatte, una per settimana, da accorciare.
        compiti: settimane.map(function (x) { return t(x.fatto, MAX_LUNGO); }).filter(Boolean).join('\n').slice(0, 1000),
        titolo: ('Tirocinio' + (azienda ? ' presso ' + azienda : '')).slice(0, MAX_BREVE),
        contesto: [azienda, t(tir.citta, 80), periodo].filter(Boolean).join(', ').slice(0, MAX_LUNGO),
        azione: raccogli('fatto'),
        difficolta: raccogli('difficolta'),
        aiuto: raccogli('aiuto'),
        settimane: settimane.length
      };
      return (azienda || proposta.azione || proposta.difficolta) ? proposta : null;
    }).filter(Boolean);
    // Due tirocini nella stessa azienda (anni diversi) non devono scambiarsi per lo stesso: si distinguono dal periodo.
    const conteggio = {};
    proposte.forEach(function (p) { conteggio[p.titolo] = (conteggio[p.titolo] || 0) + 1; });
    const visti = {};
    proposte.forEach(function (p) {
      if (conteggio[p.titolo] < 2) return;
      visti[p.titolo] = (visti[p.titolo] || 0) + 1;
      const inizio = p.dalMese ? p.dalMese.slice(5) + '/' + p.dalMese.slice(0, 4) : '';
      p.titolo = (p.titolo + ' (' + (inizio ? 'dal ' + inizio : visti[p.titolo]) + ')').slice(0, MAX_BREVE);
    });
    return proposte;
  }

  function avanzamento(stato) {
    const stati = DATI.SEZIONI.map(function (s) { return statoSezione(stato, s.id); });
    return {
      stati: stati,
      complete: stati.filter(function (x) { return x === 'completa'; }).length,
      totale: stati.length
    };
  }

  const LOGICA = {
    VERSIONE: VERSIONE,
    MAX_ESPERIENZE: MAX_ESPERIENZE,
    MAX_FORMAZIONE: MAX_FORMAZIONE,
    MAX_LAVORO: MAX_LAVORO,
    MAX_PROFILO: MAX_PROFILO,
    MAX_LINGUE: MAX_LINGUE,
    linguaVuota: linguaVuota,
    statoVuoto: statoVuoto,
    esperienzaVuota: esperienzaVuota,
    normalizza: normalizza,
    haProva: haProva,
    esperienzaCompleta: esperienzaCompleta,
    statoSezione: statoSezione,
    componiBilancio: componiBilancio,
    componiOrientamento: componiOrientamento,
    formazioneVuota: formazioneVuota,
    lavoroVuoto: lavoroVuoto,
    formatoMese: formatoMese,
    periodoLavoro: periodoLavoro,
    suggerisciCompetenze: suggerisciCompetenze,
    lingueEuropass: lingueEuropass,
    anniDelPercorso: anniDelPercorso,
    esperienzeDalDiario: esperienzeDalDiario,
    statoPerIlFoglio: statoPerIlFoglio,
    componiCV: componiCV,
    avanzamento: avanzamento,
    nomeQuando: nomeQuando
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LOGICA;
  else radice.BC_LOGICA = LOGICA;
})(typeof window !== 'undefined' ? window : globalThis);
