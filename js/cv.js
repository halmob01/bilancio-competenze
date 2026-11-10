/* Curriculum vitae — logica pura (stato, normalizzazione, composizione del foglio, importazione dal bilancio).
   Nessun accesso al DOM: usato dal browser (window.BC_CV) e dai test Node.
   Il curriculum è un sito a parte (cv/): ha il suo salvataggio sul dispositivo (chiave «cv-v1») e può importare, su richiesta
   dello studente, nome, esperienze e competenze dal bilancio e i tirocini dal diario. Non scrive mai nel bilancio né nel diario. */
(function (radice) {
  'use strict';

  const DATI = (typeof module !== 'undefined' && module.exports)
    ? require('./dati.js')
    : radice.BC_DATI;
  const BIL = (typeof module !== 'undefined' && module.exports)
    ? require('./bilancio.js')
    : radice.BC_LOGICA;

  const VERSIONE = 1;
  const CHIAVE = 'cv-v1';
  const CHIAVE_BILANCIO = 'bilancio-competenze-v1'; // solo lettura
  const MAX_BREVE = 200;
  const MAX_LUNGO = 4000;
  const MAX_FORMAZIONE = 6;
  const MAX_LAVORO = 10;
  const MAX_PROFILO = 600;
  const MAX_LINGUE = 8;
  const MAX_FOTO = 150000;

  // I passi del sito (una schermata ciascuno).
  const PASSI = [
    { id: 'contatti', titolo: 'I tuoi dati' },
    { id: 'profilo', titolo: 'Che lavoro cerchi' },
    { id: 'formazione', titolo: 'La tua formazione' },
    { id: 'esperienze', titolo: 'Le esperienze di lavoro' },
    { id: 'competenze', titolo: 'Competenze, lingue e altro' },
    { id: 'anteprima', titolo: 'Il tuo curriculum' }
  ];

  function testo(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }
  function inElenco(v, elenco) { return elenco.some(function (x) { return x.id === v; }) ? v : ''; }

  // Il nome e l'indirizzo di studio servono al foglio e agli esempi; il resto sta in «cv».
  function statoVuoto() {
    return { versione: VERSIONE, tipo: 'cv', aggiornato: '', profilo: { nome: '', indirizzo: '' }, cv: cvVuoto() };
  }

  // Dati del curriculum. Restano sul dispositivo dello studente: il sito non li invia a nessuno.
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

  // Ricostruisce uno stato valido da dati salvati o importati. Accetta anche una copia del bilancio di una versione precedente
  // (che conservava il curriculum nella chiave «cv»): ne prende nome, indirizzo di studio e curriculum, e nient'altro.
  function normalizza(grezzo) {
    const s = statoVuoto();
    if (!grezzo || typeof grezzo !== 'object') return s;
    s.aggiornato = testo(grezzo.aggiornato, 40);
    const p = grezzo.profilo && typeof grezzo.profilo === 'object' ? grezzo.profilo : {};
    s.profilo.nome = testo(p.nome, 80);
    s.profilo.indirizzo = inElenco(p.indirizzo, DATI.INDIRIZZI);

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
    if (!pieno(stato.profilo.nome)) mancanti.push('il tuo nome');
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

  // Il curriculum ha qualcosa di scritto oltre al nome?
  function toccato(stato) {
    const c = stato.cv;
    const c2 = componiCV(stato);
    return pieno(c.telefono) || pieno(c.email) || pieno(c.citta) || pieno(c.profilo) || pieno(c.occupazione) ||
      c.formazione.some(function (f) { return pieno(f.titolo); }) || c.lavoro.some(function (l) { return pieno(l.azienda) || pieno(l.mansione); }) ||
      pieno(c.competenze) || c2.lingue.length > 0 || pieno(c.digitali) || pieno(c.altro);
  }

  // Stato del curriculum nel suo insieme: 'vuota' | 'in_corso' | 'completa'.
  function statoCV(stato) {
    const c = stato.cv;
    const c2 = componiCV(stato);
    if (c2.mancanti.length === 0 && (pieno(c.competenze) || c2.lingue.length > 0)) return 'completa';
    return toccato(stato) ? 'in_corso' : 'vuota';
  }

  // Stato di un passo, per l'indice.
  function statoPasso(stato, id) {
    const c = stato.cv;
    const c2 = componiCV(stato);
    const tutti = function (v) { return v.every(Boolean); };
    const qualcuno = function (v) { return v.some(Boolean); };
    let cond;
    if (id === 'contatti') {
      cond = [pieno(stato.profilo.nome), pieno(c.telefono) || pieno(c.email)];
      if (tutti(cond)) return 'completa';
      return qualcuno(cond.concat([pieno(c.citta), pieno(c.nascita), pieno(c.nazionalita), pieno(c.patente), c.foto !== ''])) ? 'in_corso' : 'vuota';
    }
    if (id === 'profilo') {
      cond = [pieno(c.occupazione), pieno(c.profilo)];
      return tutti(cond) ? 'completa' : qualcuno(cond) ? 'in_corso' : 'vuota';
    }
    if (id === 'formazione') return c2.formazione.length ? 'completa' : 'vuota';
    if (id === 'esperienze') return c2.esperienze.length ? 'completa' : 'vuota';
    if (id === 'competenze') {
      if (pieno(c.competenze) && c2.lingue.length > 0) return 'completa';
      return qualcuno([pieno(c.competenze), c2.lingue.length > 0, pieno(c.digitali), pieno(c.altro)]) ? 'in_corso' : 'vuota';
    }
    if (id === 'anteprima') return statoCV(stato);
    return 'vuota';
  }

  function avanzamento(stato) {
    const stati = PASSI.map(function (p) { return statoPasso(stato, p.id); });
    return { stati: stati, complete: stati.filter(function (x) { return x === 'completa'; }).length, totale: stati.length };
  }

  // Che cosa il curriculum può prendere da un bilancio (salvato su questo dispositivo o caricato da file).
  // Il bilancio viene riletto con le sue regole di controllo e non è mai modificato. Se il dato non è un bilancio: null.
  function leggiBilancio(grezzo) {
    if (!grezzo || typeof grezzo !== 'object' || grezzo.versione !== BIL.VERSIONE || !grezzo.profilo || typeof grezzo.profilo !== 'object') return null;
    const b = BIL.normalizza(grezzo);
    return {
      nome: b.profilo.nome.trim(),
      indirizzo: b.profilo.indirizzo,
      aggiornato: b.aggiornato,
      // Le schede con un'azione scritta: da lì si può riprendere il testo dei compiti.
      esperienze: b.esperienze.filter(function (e) { return pieno(e.azione); }).map(function (e) {
        return { id: e.id, titolo: e.titolo, azione: e.azione };
      }),
      // Solo le competenze dichiarate E documentate con un esempio, come nel bilancio.
      competenze: BIL.suggerisciCompetenze(b)
    };
  }

  // Una versione precedente del bilancio conservava il curriculum nella chiave «cv»: se c'è qualcosa di scritto, lo stato
  // del nuovo sito che ne deriva (con nome e indirizzo di studio); altrimenti null.
  function daBilancioVecchio(grezzo) {
    if (!grezzo || typeof grezzo !== 'object' || !grezzo.cv || typeof grezzo.cv !== 'object') return null;
    const s = normalizza(grezzo);
    return toccato(s) || s.cv.foto !== '' || pieno(s.cv.nascita) || pieno(s.cv.nazionalita) || pieno(s.cv.patente) ? s : null;
  }

  const CV = {
    VERSIONE: VERSIONE,
    CHIAVE: CHIAVE,
    CHIAVE_BILANCIO: CHIAVE_BILANCIO,
    PASSI: PASSI,
    MAX_FORMAZIONE: MAX_FORMAZIONE,
    MAX_LAVORO: MAX_LAVORO,
    MAX_PROFILO: MAX_PROFILO,
    MAX_LINGUE: MAX_LINGUE,
    statoVuoto: statoVuoto,
    normalizza: normalizza,
    linguaVuota: linguaVuota,
    formazioneVuota: formazioneVuota,
    lavoroVuoto: lavoroVuoto,
    formatoMese: formatoMese,
    periodoLavoro: periodoLavoro,
    lingueEuropass: lingueEuropass,
    componiCV: componiCV,
    statoCV: statoCV,
    statoPasso: statoPasso,
    avanzamento: avanzamento,
    leggiBilancio: leggiBilancio,
    daBilancioVecchio: daBilancioVecchio,
    esperienzeDalDiario: BIL.esperienzeDalDiario
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CV;
  else radice.BC_CV = CV;
})(typeof window !== 'undefined' ? window : globalThis);
