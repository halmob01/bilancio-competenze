/* Motore delle situazioni di lavoro (SST): associa un'attività dello studente alle situazioni di una mappa.
   Logica pura: nessun accesso al DOM, nessuna richiesta di rete, nessun servizio esterno. I contenuti (le mappe) stanno
   in js/contenuti/ e si passano al motore: lo stesso motore vale per ogni indirizzo e per ogni SST.

   Lo studente non vede niente di tutto questo: scrive che cosa ha fatto e, se vuole, conferma il suggerimento.
   Esiti:
   - «scelta»      lo studente ha scelto o confermato la situazione, e niente la contraddice;
   - «automatica»  nessuna scelta, ma il testo indica la situazione con un segnale netto;
   - «proposta»    segnale debole: si mostra «È questo?»; se resta senza risposta diventa un caso dubbio per il docente;
   - «dubbio»      il docente deve guardare (motivi: nessuna, ambigua, contrasto, contesto, livello, vuota).
   Associare non vuol dire validare: «osservata» resta un atto del docente, fuori da questo motore. */
(function (radice) {
  'use strict';

  const PESO = { forte: 3, debole: 1 };
  const SOGLIE = {
    automatica: 3,   // almeno un segnale forte
    proposta: 2,     // due segnali deboli
    margine: 2,      // nella stessa dimensione, la seconda situazione deve stare almeno 2 punti sotto la prima
    maxDeboli: 2,    // i segnali deboli non possono pesare più di così
    maxSituazioni: 3,
    distanza: 3      // parole al massimo fra un termine e il successivo, nei termini di più parole
  };
  const LUOGHI = ['scuola', 'tirocinio', 'fuori'];

  // Parole che non dicono niente del lavoro: non si propongono mai come lessico nuovo.
  const VUOTE = ('il lo la i gli le un uno una di a da in con su per tra fra e ed o ma che non piu poi anche come quando dove ' +
    'ho hai ha abbiamo avete hanno era erano sono stato stata stati fatto fare fatta mio mia miei mie suo sua tutto tutti tutta ' +
    'del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle ' +
    'sul sullo sulla sui sugli sulle questo questa quello quella cosa cose volta volte prima dopo molto poco ancora gia solo ' +
    'mi ci si ti vi ne lui lei noi voi loro me te se perche quindi allora oggi ieri settimana giorno giorni lavoro tutor scuola ' +
    'laboratorio tirocinio compagno compagni docente prof').split(' ');

  // Minuscole, senza accenti, senza punteggiatura: «Ho configurato l'IP» → ['ho', 'configurato', 'l', 'ip'].
  function parole(testo) {
    return String(typeof testo === 'string' ? testo : '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  }

  function parte(p) {
    return p.slice(-1) === '*' ? { prefisso: p.slice(0, -1) } : { uguale: p };
  }
  function combacia(p, w) { return p.prefisso !== undefined ? w.indexOf(p.prefisso) === 0 && w.length >= p.prefisso.length : w === p.uguale; }

  // Un termine del lessico: «stampante di rete», «aggiorn* * pc». Il «*» da solo è un posto libero e si ignora:
  // fra una parte e la successiva sono comunque ammesse fino a SOGLIE.distanza parole.
  function compilaTermine(t) {
    const parti = [];
    String(t).split(/\s+/).forEach(function (p) {
      if (!p || p === '*') return;
      const stella = p.slice(-1) === '*';
      parole(p).forEach(function (w, i, tutte) { parti.push(parte(stella && i === tutte.length - 1 ? w + '*' : w)); });
    });
    return { testo: t, parti: parti };
  }

  function trovato(termine, w) {
    const pp = termine.parti;
    if (!pp.length) return false;
    for (let i = 0; i < w.length; i++) {
      if (!combacia(pp[0], w[i])) continue;
      let pos = i;
      let ok = true;
      for (let k = 1; k < pp.length && ok; k++) {
        ok = false;
        for (let j = pos + 1; j <= Math.min(w.length - 1, pos + 1 + SOGLIE.distanza); j++) {
          if (combacia(pp[k], w[j])) { pos = j; ok = true; break; }
        }
      }
      if (ok) return true;
    }
    return false;
  }

  // Prepara una o più mappe per l'uso: per ogni situazione, i termini già scomposti.
  function compila(mappe) {
    const elenco = [];
    (Array.isArray(mappe) ? mappe : [mappe]).filter(Boolean).forEach(function (m) {
      m.situazioni.forEach(function (s) {
        elenco.push({ mappa: m, sit: s,
          forte: ((s.lessico && s.lessico.forte) || []).map(compilaTermine),
          debole: ((s.lessico && s.lessico.debole) || []).map(compilaTermine) });
      });
    });
    return { elenco: elenco, perId: elenco.reduce(function (o, x) { o[x.sit.id] = x; return o; }, {}) };
  }

  // Punteggio di ogni situazione per un testo, dalla più probabile. Ogni termine conta una volta.
  function punteggi(testo, indice) {
    const w = parole(testo);
    return indice.elenco.map(function (x) {
      const forti = x.forte.filter(function (t) { return trovato(t, w); }).map(function (t) { return t.testo; });
      const deboli = x.debole.filter(function (t) { return trovato(t, w); }).map(function (t) { return t.testo; });
      const punteggio = forti.length * PESO.forte + Math.min(SOGLIE.maxDeboli, deboli.length * PESO.debole);
      return { id: x.sit.id, dimensione: x.sit.dimensione, mappa: x.mappa.id, punteggio: punteggio, forti: forti, termini: forti.concat(deboli) };
    }).filter(function (r) { return r.punteggio > 0; })
      .sort(function (a, b) { return b.punteggio - a.punteggio || a.id.localeCompare(b.id); });
  }

  // Livello atteso per anno: qualifica (III EQF) fino al terzo anno, diploma (IV) al quarto.
  function eqfAtteso(anno) { return anno === 'anno4' ? 4 : 3; }

  // Controlli di coerenza su una situazione associata: luogo ammesso e livello della scheda rispetto all'anno.
  function controlli(x, att) {
    const m = [];
    const contesti = x.sit.contesti || LUOGHI;
    if (att.luogo && contesti.indexOf(att.luogo) === -1) m.push('contesto');
    if (att.anno && x.mappa.eqf > eqfAtteso(att.anno)) m.push('livello');
    return m;
  }

  // att = { testo, luogo, anno, scelte: [id] }. Restituisce { esito, situazioni: [{ id, origine }], motivi, candidati }.
  function associa(att, indice) {
    const a = att || {};
    const candidati = punteggi(a.testo, indice);
    const scelte = (Array.isArray(a.scelte) ? a.scelte : []).filter(function (id) { return indice.perId[id]; });
    const risultato = function (esito, sit, motivi) {
      return { esito: esito, situazioni: sit, motivi: motivi || [], candidati: candidati.slice(0, 3) };
    };

    if (scelte.length) {
      const motivi = [];
      const top = candidati[0];
      const sostegno = candidati.filter(function (c) { return scelte.indexOf(c.id) !== -1; });
      // Lo studente ha scelto una situazione che il testo non sostiene, mentre ne indica con forza un'altra.
      if (top && top.punteggio >= SOGLIE.automatica && scelte.indexOf(top.id) === -1 && !sostegno.length) motivi.push('contrasto');
      scelte.forEach(function (id) { controlli(indice.perId[id], a).forEach(function (x) { if (motivi.indexOf(x) === -1) motivi.push(x); }); });
      return risultato(motivi.length ? 'dubbio' : 'scelta', scelte.map(function (id) { return { id: id, origine: 'studente' }; }), motivi);
    }

    if (!parole(a.testo).length) return risultato('dubbio', [], ['vuota']);

    const forti = candidati.filter(function (c) { return c.punteggio >= SOGLIE.automatica; });
    if (!forti.length) {
      // Una proposta ha senso solo se non è a pari merito con un'altra.
      if (candidati.length && candidati[0].punteggio >= SOGLIE.proposta && !(candidati[1] && candidati[1].punteggio === candidati[0].punteggio)) {
        return risultato('proposta', [{ id: candidati[0].id, origine: 'proposta' }]);
      }
      return risultato('dubbio', [], ['nessuna']);
    }

    // Per ogni dimensione si tiene la migliore. Un'altra situazione della stessa dimensione si tiene anche lei se ha un
    // segnale forte tutto suo (l'attività ha coperto due cose: un backup e una formattazione); se invece è vicina alla
    // prima senza prove proprie, la dimensione è ambigua e non si associa. Dimensioni diverse non si escludono.
    const perDimensione = {};
    candidati.forEach(function (c) { (perDimensione[c.mappa + '|' + c.dimensione] = perDimensione[c.mappa + '|' + c.dimensione] || []).push(c); });
    const nette = [];
    let ambigue = 0;
    Object.keys(perDimensione).forEach(function (k) {
      const l = perDimensione[k];
      if (l[0].punteggio < SOGLIE.automatica) return;
      const top = l[0];
      const proprie = l.slice(1).filter(function (c) {
        return c.punteggio >= SOGLIE.automatica && c.forti.some(function (t) { return top.forti.indexOf(t) === -1; });
      });
      const vicine = l.slice(1).filter(function (c) { return proprie.indexOf(c) === -1 && top.punteggio - c.punteggio < SOGLIE.margine; });
      if (vicine.length) { ambigue++; return; }
      nette.push(top);
      proprie.forEach(function (c) { nette.push(c); });
    });
    if (!nette.length) return risultato('dubbio', [], ['ambigua']);
    nette.sort(function (x, y) { return y.punteggio - x.punteggio; });
    const scelti = nette.slice(0, SOGLIE.maxSituazioni);
    const motivi = [];
    scelti.forEach(function (c) { controlli(indice.perId[c.id], a).forEach(function (x) { if (motivi.indexOf(x) === -1) motivi.push(x); }); });
    if (motivi.length) return risultato('dubbio', scelti.map(function (c) { return { id: c.id, origine: 'automatica' }; }), motivi);
    const r = risultato('automatica', scelti.map(function (c) { return { id: c.id, origine: 'automatica' }; }));
    if (ambigue) r.note = ['in_parte_ambigua'];
    return r;
  }

  // Per il docente: quando aggancia un caso dubbio a una situazione, le parole del testo che il lessico di quella
  // situazione non conosce ancora, da proporre come lessico nuovo (il docente le accetta o le scarta).
  function paroleNuove(testo, indice, id) {
    const x = indice.perId[id];
    if (!x) return [];
    const termini = x.forte.concat(x.debole);
    const viste = {};
    return parole(testo).filter(function (w) {
      if (w.length < 3 || /^\d+$/.test(w) || VUOTE.indexOf(w) !== -1 || viste[w]) return false;
      viste[w] = true;
      return !termini.some(function (t) { return t.parti.length === 1 && combacia(t.parti[0], w); });
    });
  }

  // Controlli sui contenuti di una mappa (usati dai test): campi obbligatori, id unici, competenze esistenti, lessico presente.
  function verificaMappa(m, competenze) {
    const errori = [];
    if (!m || !m.id || !m.eqf || !Array.isArray(m.dimensioni) || !Array.isArray(m.situazioni)) return ['struttura'];
    if (!m.fonte || !m.fonte.sst || !m.fonte.ada || !m.fonte.ada.length) errori.push('fonte');
    const dim = m.dimensioni.map(function (d) { return d.id; });
    const ids = {};
    m.situazioni.forEach(function (s) {
      const dove = s.id || '(senza id)';
      if (!s.id || ids[s.id]) errori.push(dove + ': id mancante o doppio');
      ids[s.id] = true;
      if (dim.indexOf(s.dimensione) === -1) errori.push(dove + ': dimensione');
      if (['FVG', 'CFP', 'RL'].indexOf(s.origine) === -1) errori.push(dove + ': origine');
      if (!s.codice || typeof s.grado !== 'number') errori.push(dove + ': codice o grado');
      if (!s.docente || !s.studente) errori.push(dove + ': testi');
      if (s.studente && s.studente.length > 90) errori.push(dove + ': testo studente troppo lungo');
      if (competenze && !competenze.esiste(s.competenza)) errori.push(dove + ': competenza');
      if (!s.lessico || !s.lessico.forte || !s.lessico.forte.length) errori.push(dove + ': lessico');
      if (s.contesti && s.contesti.some(function (c) { return LUOGHI.indexOf(c) === -1; })) errori.push(dove + ': contesti');
    });
    return errori;
  }

  const SITUAZIONI = { SOGLIE: SOGLIE, parole: parole, compila: compila, punteggi: punteggi, associa: associa, paroleNuove: paroleNuove, verificaMappa: verificaMappa, eqfAtteso: eqfAtteso };
  if (typeof module !== 'undefined' && module.exports) module.exports = SITUAZIONI;
  else radice.BC_SITUAZIONI = SITUAZIONI;
})(typeof window !== 'undefined' ? window : globalThis);
