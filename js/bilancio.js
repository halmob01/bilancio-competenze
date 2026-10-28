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
      aggiornato: '',
      profilo: { nome: '', classe: '', indirizzo: '' },
      anni: { anno1: '', anno2: '', anno3: '', anno4: '', tirocinio: '' },
      esperienze: [],
      sofare: sofare,
      sguardo: sguardo,
      orientamento: orientamento
    };
  }

  function testo(v, max) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  }

  function inElenco(v, elenco) {
    return elenco.some(function (x) { return x.id === v; }) ? v : '';
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

    s.aggiornato = testo(grezzo.aggiornato, 40);

    const p = grezzo.profilo || {};
    s.profilo.nome = testo(p.nome, 80);
    s.profilo.classe = testo(p.classe, 40);
    s.profilo.indirizzo = inElenco(p.indirizzo, DATI.INDIRIZZI);

    const a = grezzo.anni || {};
    Object.keys(s.anni).forEach(function (k) { s.anni[k] = testo(a[k], MAX_LUNGO); });

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

    return s;
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
      // Un anno o il tirocinio possono restare vuoti: basta raccontarne tre.
      const anniPieni = Object.keys(stato.anni).filter(function (k) { return pieno(stato.anni[k]); }).length;
      if (stato.profilo.indirizzo !== '' && anniPieni >= 3) return 'completa';
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
    statoVuoto: statoVuoto,
    esperienzaVuota: esperienzaVuota,
    normalizza: normalizza,
    haProva: haProva,
    esperienzaCompleta: esperienzaCompleta,
    statoSezione: statoSezione,
    componiBilancio: componiBilancio,
    componiOrientamento: componiOrientamento,
    avanzamento: avanzamento,
    nomeQuando: nomeQuando
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LOGICA;
  else radice.BC_LOGICA = LOGICA;
})(typeof window !== 'undefined' ? window : globalThis);
