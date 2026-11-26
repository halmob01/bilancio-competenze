/* Archivio comune dei siti: salvataggio sul dispositivo e, quando lo studente è entrato, copia sul server della scuola.
   I siti usano BC_ARCHIVIO.memoria al posto di localStorage, con gli stessi comandi (getItem, setItem, removeItem).
   - Senza server configurato (BC_CONFIG.urlApi vuoto) o senza accesso: tutto resta esattamente come prima.
   - Da entrati: le chiavi hanno il prefisso dello studente («u12:…»), così su un PC condiviso ognuno vede solo il suo;
     con il QR (telefono) si usa il localStorage, con il codice scritto (PC della scuola) il sessionStorage, che il
     browser cancella quando si chiude;
     ogni documento salvato parte verso il server qualche secondo dopo; senza rete aspetta e riparte da solo;
     se nel frattempo il documento è cambiato altrove (altro dispositivo, correzione di un docente) le due versioni
     si uniscono voce per voce (unione.js) e si chiede allo studente solo se la stessa voce è cambiata da tutte e due
     le parti. Il server tiene comunque tutte le versioni precedenti.
   Il server: vedi server/api.js (PUT con «base», 409 con la versione attuale). */
(function () {
  'use strict';

  const CFG = window.BC_CONFIG || {};
  const API = typeof CFG.urlApi === 'string' ? CFG.urlApi : '';
  const U = window.BC_UNIONE;
  const DOCUMENTI = {
    'bilancio-competenze-v1': 'bilancio',
    'cv-v1': 'cv',
    'diario-tirocinio-v1': 'diario',
    'portfolio-attivita-v1': 'portfolio'
  };
  const CHIAVE_DI = {};
  Object.keys(DOCUMENTI).forEach(function (k) { CHIAVE_DI[DOCUMENTI[k]] = k; });
  const CHIAVE_SESSIONE = 'portale-sessione-v1';
  const ATTESA_INVIO = 2000;

  // ---------- Sessione ----------
  function leggiSessione() {
    if (!API) return null;
    try {
      const s = sessionStorage.getItem(CHIAVE_SESSIONE) || localStorage.getItem(CHIAVE_SESSIONE);
      const j = s ? JSON.parse(s) : null;
      return j && j.profilo && Number.isInteger(j.profilo.id) && (j.metodo === 'qr' || j.metodo === 'codice') ? j : null;
    } catch (e) { return null; }
  }
  let sessione = leggiSessione();
  let scaduta = false;

  function fisica() { return sessione && sessione.metodo === 'codice' ? sessionStorage : localStorage; }
  function prefisso() { return sessione ? 'u' + sessione.profilo.id + ':' : ''; }

  // ---------- Memoria (al posto di localStorage) ----------
  const memoria = {
    getItem: function (k) { return fisica().getItem(prefisso() + k); },
    setItem: function (k, v) {
      fisica().setItem(prefisso() + k, v);
      if (sessione && DOCUMENTI[k]) cambiato(DOCUMENTI[k], false);
    },
    removeItem: function (k) {
      fisica().removeItem(prefisso() + k);
      if (sessione && DOCUMENTI[k]) cambiato(DOCUMENTI[k], true);
    }
  };

  // Stato della sincronizzazione di un documento: { rev, base (JSON dell'ultima versione del server), sporco, svuota, n }.
  function leggiMeta(tipo) {
    try { return JSON.parse(fisica().getItem(prefisso() + 'sync:' + tipo) || 'null') || { rev: 0, base: '', sporco: false, svuota: false, n: 0 }; }
    catch (e) { return { rev: 0, base: '', sporco: false, svuota: false, n: 0 }; }
  }
  function scriviMeta(tipo, m) { try { fisica().setItem(prefisso() + 'sync:' + tipo, JSON.stringify(m)); } catch (e) { /* senza spazio: resta in memoria */ } }
  function leggiDoc(tipo) {
    try { const g = fisica().getItem(prefisso() + CHIAVE_DI[tipo]); return g ? JSON.parse(g) : null; } catch (e) { return null; }
  }
  function scriviDoc(tipo, dati) { fisica().setItem(prefisso() + CHIAVE_DI[tipo], JSON.stringify(dati)); }

  // ---------- Richieste ----------
  function richiesta(metodo, via, corpo) {
    const o = { method: metodo, credentials: 'same-origin', headers: { 'X-Portale': '1' } };
    if (corpo !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corpo); }
    return fetch(API + via, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { stato: r.status, json: j || {} }; });
    }).catch(function () { return { stato: 0, json: {} }; });
  }

  // ---------- Avvisi ai siti ----------
  const ascoltatori = [];
  function quandoCambia(fn) { ascoltatori.push(fn); }
  function avvisa(tipo) { ascoltatori.forEach(function (fn) { try { fn(tipo); } catch (e) { /* un sito rotto non blocca gli altri */ } }); }

  function scriviStato(t) { const el = document.getElementById('salvato'); if (el && t) el.textContent = t; }
  function ora() { return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }

  // ---------- Invio ----------
  const timer = {};
  const inCorso = {};
  function cambiato(tipo, svuota) {
    const m = leggiMeta(tipo);
    m.sporco = true; m.svuota = !!svuota; m.n = (m.n || 0) + 1;
    scriviMeta(tipo, m);
    clearTimeout(timer[tipo]);
    timer[tipo] = setTimeout(function () { invia(tipo); }, ATTESA_INVIO);
  }

  function invia(tipo) {
    if (!sessione || scaduta) return Promise.resolve(false);
    if (inCorso[tipo]) return inCorso[tipo];
    const m = leggiMeta(tipo);
    if (!m.sporco) return Promise.resolve(true);
    const dati = m.svuota ? {} : leggiDoc(tipo);
    if (!dati) { m.sporco = false; scriviMeta(tipo, m); return Promise.resolve(true); }
    const n = m.n;
    inCorso[tipo] = richiesta('PUT', 'documenti/' + tipo, { base: m.rev, dati: dati }).then(function (r) {
      inCorso[tipo] = null;
      if (r.stato === 200) {
        const m2 = leggiMeta(tipo);
        m2.rev = r.json.rev; m2.base = JSON.stringify(dati); m2.svuota = false;
        m2.sporco = m2.n !== n; // cambiato di nuovo mentre partiva: si rimanda
        scriviMeta(tipo, m2);
        scriviStato('Salvato sul server alle ' + ora());
        if (m2.sporco) return invia(tipo);
        return true;
      }
      if (r.stato === 409) return conflitto(tipo, r.json).then(function () { return invia(tipo); });
      if (r.stato === 401) { sessioneScaduta(); return false; }
      if (r.stato === 0) scriviStato('Salvato qui: invio al server appena c\'è rete');
      else scriviStato('Salvato qui: il server non l\'ha accettato (' + r.stato + ')');
      return false;
    });
    return inCorso[tipo];
  }
  function inviaTutto() {
    return Object.keys(CHIAVE_DI).reduce(function (p, t) {
      return p.then(function (ok) { return invia(t).then(function (x) { return ok && x !== false; }); });
    }, Promise.resolve(true));
  }
  function inSospeso() { return Object.keys(CHIAVE_DI).filter(function (t) { return leggiMeta(t).sporco; }); }

  // Il server ha una versione più nuova di quella da cui siamo partiti: si uniscono le due.
  function conflitto(tipo, r) {
    const m = leggiMeta(tipo);
    const server = r.dati;
    if (m.svuota || !server) { m.rev = r.rev || 0; m.base = server ? JSON.stringify(server) : ''; scriviMeta(tipo, m); return Promise.resolve(); }
    const locale = leggiDoc(tipo);
    const base = m.base ? JSON.parse(m.base) : undefined;
    let u = U.unisci(base, locale, server, 'locale');
    const fatto = function (risultato) {
      scriviDoc(tipo, risultato.dati);
      const m2 = leggiMeta(tipo);
      m2.rev = r.rev; m2.base = JSON.stringify(server); m2.sporco = !U.uguali(risultato.dati, server); m2.svuota = false;
      scriviMeta(tipo, m2);
      avvisa(tipo);
    };
    if (!u.conflitti.length) { fatto(u); return Promise.resolve(); }
    const chi = r.autore && r.autore.tipo === 'docente' ? 'un docente (' + (r.autore.nome || '') + ')' : 'un altro dispositivo';
    const nome = { bilancio: 'il bilancio', cv: 'il curriculum', diario: 'il diario', portfolio: 'le attività' }[tipo];
    return domanda(
      'Mentre lavoravi qui, ' + chi + ' ha cambiato ' + nome + '. ' +
      (u.conflitti.length === 1 ? 'Una parte è stata cambiata' : u.conflitti.length + ' parti sono state cambiate') +
      ' da tutte e due le parti. Quale versione tieni per ' + (u.conflitti.length === 1 ? 'questa parte' : 'queste parti') + '? Il resto viene unito, e l\'altra versione resta tra quelle precedenti sul server.',
      'Quella di questo dispositivo', 'L\'altra versione'
    ).then(function (tieniQuesta) {
      if (!tieniQuesta) u = U.unisci(base, locale, server, 'server');
      fatto(u);
    });
  }

  // ---------- Ricezione (all'apertura di ogni pagina) ----------
  function ricevi(tipo) {
    return richiesta('GET', 'documenti/' + tipo).then(function (r) {
      if (r.stato === 401) { sessioneScaduta(); return; }
      if (r.stato !== 200) return;
      const m = leggiMeta(tipo);
      const locale = leggiDoc(tipo);
      if (!r.json.rev) { // sul server non c'è ancora
        if (locale && !m.rev) { m.sporco = true; m.n = (m.n || 0) + 1; scriviMeta(tipo, m); }
        return;
      }
      if (r.json.rev === m.rev) return;
      if (!m.sporco || !locale) {
        scriviDoc(tipo, r.json.dati);
        scriviMeta(tipo, { rev: r.json.rev, base: JSON.stringify(r.json.dati), sporco: false, svuota: false, n: m.n || 0 });
        avvisa(tipo);
        return;
      }
      return conflitto(tipo, r.json);
    });
  }

  // ---------- Avvio, accesso, uscita ----------
  function avvio() {
    if (!sessione) return Promise.resolve(null);
    return richiesta('GET', 'io').then(function (r) {
      if (r.stato === 401) { sessioneScaduta(); return null; }
      if (r.stato === 200 && r.json.profilo && r.json.profilo.tipo === 'studente') {
        sessione.profilo = r.json.profilo;
        salvaSessione();
      }
      return Object.keys(CHIAVE_DI).reduce(function (p, t) { return p.then(function () { return ricevi(t); }); }, Promise.resolve())
        .then(inviaTutto).then(function () { return sessione; });
    });
  }

  function salvaSessione() {
    try {
      const testo = JSON.stringify(sessione);
      if (sessione.metodo === 'codice') { sessionStorage.setItem(CHIAVE_SESSIONE, testo); localStorage.removeItem(CHIAVE_SESSIONE); }
      else { localStorage.setItem(CHIAVE_SESSIONE, testo); sessionStorage.removeItem(CHIAVE_SESSIONE); }
    } catch (e) { /* senza memoria si resta collegati solo in questa pagina */ }
  }

  // credenziale: { codice } (scritto) o { qr }. Restituisce { ok, profilo } oppure { ok: false, errore }.
  function entra(credenziale) {
    return richiesta('POST', 'accesso/studente', credenziale).then(function (r) {
      if (r.stato === 200 && r.json.profilo) {
        sessione = { profilo: r.json.profilo, metodo: credenziale.qr ? 'qr' : 'codice' };
        scaduta = false;
        salvaSessione();
        return { ok: true, profilo: sessione.profilo };
      }
      return { ok: false, errore: r.stato === 0 ? 'rete' : r.stato === 429 ? 'tentativi' : 'codice' };
    });
  }

  // Lavoro salvato su questo dispositivo prima di entrare (chiavi senza prefisso) che sul server non c'è.
  function lavoroSenzaAccesso() {
    if (!sessione) return Promise.resolve([]);
    const trovati = Object.keys(DOCUMENTI).filter(function (k) {
      try { return !!localStorage.getItem(k); } catch (e) { return false; }
    }).map(function (k) { return DOCUMENTI[k]; });
    return trovati.reduce(function (p, t) {
      return p.then(function (acc) {
        return richiesta('GET', 'documenti/' + t).then(function (r) { if (r.stato === 200 && !r.json.rev && !leggiDoc(t)) acc.push(t); return acc; });
      });
    }, Promise.resolve([]));
  }
  // «Questo lavoro è tuo?»: sì. Il lavoro passa dalla chiave senza prefisso a quella dello studente e parte verso il server.
  function adotta(tipi) {
    tipi.forEach(function (t) {
      const k = CHIAVE_DI[t];
      const g = localStorage.getItem(k);
      if (!g) return;
      fisica().setItem(prefisso() + k, g);
      localStorage.removeItem(k);
      cambiato(t, false);
    });
    return inviaTutto();
  }

  function togliCopiaLocale() {
    if (!sessione) return;
    const p = prefisso();
    [localStorage, sessionStorage].forEach(function (st) {
      try {
        for (let i = st.length - 1; i >= 0; i--) { const k = st.key(i); if (k && k.indexOf(p) === 0) st.removeItem(k); }
        st.removeItem(CHIAVE_SESSIONE);
      } catch (e) { /* niente da fare */ }
    });
    try { if (window.indexedDB) window.indexedDB.deleteDatabase('portfolio-foto' + suffisso()); } catch (e) { /* niente da fare */ }
  }

  // «Esci» toglie sempre la copia del lavoro da questo browser (piano §4). Prima prova a mandare quello che manca.
  function esci(dove) {
    if (!sessione) { location.href = dove || location.href; return Promise.resolve(); }
    return inviaTutto().then(function () {
      const mancano = inSospeso();
      if (!mancano.length) return true;
      return domanda('Alcune modifiche non sono ancora arrivate al server (forse manca la rete). Se esci adesso andranno perse.', 'Resta e riprova', 'Esci comunque')
        .then(function (resta) { return !resta; });
    }).then(function (procedi) {
      if (!procedi) return;
      return richiesta('POST', 'esci', {}).then(function () {
        togliCopiaLocale();
        sessione = null;
        location.href = dove || location.href.split('#')[0];
      });
    });
  }

  function sessioneScaduta() {
    if (scaduta) return;
    scaduta = true;
    const testa = document.querySelector('.testata');
    if (!testa || document.getElementById('avviso-sessione')) return;
    const casa = document.querySelector('a.testata__tutti');
    const p = document.createElement('p');
    p.id = 'avviso-sessione'; p.className = 'avviso-sessione'; p.setAttribute('role', 'status');
    p.textContent = 'Non sei più collegato al server: il lavoro resta su questo dispositivo. ';
    const a = document.createElement('a');
    a.href = casa ? casa.getAttribute('href') : './';
    a.textContent = 'Entra di nuovo';
    p.appendChild(a);
    testa.appendChild(p);
  }

  // ---------- Una domanda con due risposte, nello stile dei siti ----------
  function domanda(testo, si, no) {
    return new Promise(function (ok) {
      const d = document.createElement('dialog');
      d.setAttribute('aria-labelledby', 'domanda-portale-testo');
      const p = document.createElement('p'); p.id = 'domanda-portale-testo'; p.textContent = testo;
      const az = document.createElement('div'); az.className = 'dialogo__azioni';
      const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'pulsante'; b1.textContent = si;
      const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'pulsante pulsante--secondario'; b2.textContent = no;
      let risposta = true;
      b1.onclick = function () { risposta = true; d.close(); };
      b2.onclick = function () { risposta = false; d.close(); };
      d.addEventListener('close', function () { d.remove(); ok(risposta); });
      d.addEventListener('cancel', function () { risposta = true; });
      az.appendChild(b1); az.appendChild(b2); d.appendChild(p); d.appendChild(az);
      document.body.appendChild(d);
      d.showModal();
    });
  }

  // ---------- Nome e «Esci» nella testata dei siti ----------
  function mostraUtente() {
    if (!sessione) return;
    const riga = document.querySelector('.testata__riga');
    const casa = document.querySelector('a.testata__tutti');
    if (!riga || !casa || document.getElementById('utente-portale')) return;
    const box = document.createElement('span');
    box.id = 'utente-portale'; box.className = 'testata__utente';
    const nome = document.createElement('span');
    nome.className = 'meta';
    nome.textContent = sessione.profilo.nome + (sessione.profilo.cognome ? ' ' + sessione.profilo.cognome.charAt(0) + '.' : '');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pulsante pulsante--testo'; b.textContent = 'Esci';
    b.onclick = function () { esci(casa.href); };
    box.appendChild(nome); box.appendChild(b);
    const salvato = document.getElementById('salvato');
    riga.insertBefore(box, salvato ? salvato.nextSibling : null);
  }

  function suffisso() { return sessione ? '-u' + sessione.profilo.id : ''; }

  // Senza rete i salvataggi aspettano: si riprova quando torna e ogni 30 secondi.
  if (API) {
    window.addEventListener('online', function () { inviaTutto(); });
    setInterval(function () { if (sessione && inSospeso().length) inviaTutto(); }, 30000);
    // Uscendo dalla pagina si prova a mandare subito quello che aspetta (senza poter leggere la risposta:
    // alla prossima apertura il confronto con il server sistema tutto).
    window.addEventListener('pagehide', function () {
      if (!sessione || scaduta) return;
      inSospeso().forEach(function (t) {
        const m = leggiMeta(t);
        const dati = m.svuota ? {} : leggiDoc(t);
        if (!dati) return;
        try {
          fetch(API + 'documenti/' + t, { method: 'PUT', keepalive: true, credentials: 'same-origin',
            headers: { 'X-Portale': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ base: m.rev, dati: dati }) });
        } catch (e) { /* troppo grande per keepalive: partirà alla prossima apertura */ }
      });
    });
  }

  window.BC_ARCHIVIO = {
    attivo: !!API,
    memoria: memoria,
    sessione: function () { return sessione; },
    suffisso: suffisso,
    quandoCambia: quandoCambia,
    avvio: avvio,
    entra: entra,
    esci: esci,
    lavoroSenzaAccesso: lavoroSenzaAccesso,
    adotta: adotta,
    inviaTutto: inviaTutto,
    inSospeso: inSospeso,
    elencoDocumenti: function () { return sessione ? richiesta('GET', 'documenti') : Promise.resolve({ stato: 0, json: {} }); },
    mostraUtente: mostraUtente,
    domanda: domanda
  };
})();
