/* Le mie attività — file allegati (Word, disegni CAD, codice, PDF, ZIP…): archivio in IndexedDB e copia sul server.
   Un file resta com'è: non si legge, non si apre, non si cambia. Si salva sul dispositivo e, da entrati, parte verso il server
   (fino a 25 MB l'uno) in coda, senza rete aspetta. Su un altro dispositivo si scarica dal server.
   Un programma compilato (exe, dll, ELF, Mach-O) si rifiuta guardando i primi byte; il codice sorgente passa.
   Senza accesso nessuna richiesta di rete. Stessa logica di foto.js, con il file intero al posto della riduzione. */
(function (radice) {
  'use strict';

  const DB = 'portfolio-file';
  const STORE = 'file';
  const MAX_BYTE = 25 * 1024 * 1024;
  const CHIAVE_TOGLIERE = 'file-da-togliere';
  const ARCH = radice.BC_ARCHIVIO;

  let aperto = null;
  function apri() {
    if (aperto) return aperto;
    aperto = new Promise(function (ok, ko) {
      if (!radice.indexedDB) { ko(new Error('IndexedDB non disponibile')); return; }
      // Da entrati ogni studente ha il suo archivio («portfolio-file-u12»): su un PC condiviso non si mescolano.
      const r = radice.indexedDB.open(DB + (ARCH ? ARCH.suffisso() : ''), 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ko(r.error); };
    });
    aperto.catch(function () { aperto = null; });
    return aperto;
  }
  function operazione(modo, fn) {
    return apri().then(function (db) {
      return new Promise(function (ok, ko) {
        const tx = db.transaction(STORE, modo);
        let risultato;
        const r = fn(tx.objectStore(STORE));
        if (r) r.onsuccess = function () { risultato = r.result; };
        tx.oncomplete = function () { ok(risultato); };
        tx.onerror = function () { ko(tx.error); };
        tx.onabort = function () { ko(tx.error || new Error('Spazio esaurito')); };
      });
    });
  }
  function salva(rec) { return operazione('readwrite', function (st) { return st.put(rec); }); }
  function leggi(id) { return operazione('readonly', function (st) { return st.get(id); }); }
  function elimina(id) { return operazione('readwrite', function (st) { return st.delete(id); }); }
  function chiavi() { return operazione('readonly', function (st) { return st.getAllKeys(); }); }
  function svuota() { return operazione('readwrite', function (st) { return st.clear(); }); }
  function pulisci(usati) {
    return chiavi().then(function (k) { return Promise.all((k || []).filter(function (x) { return !usati[x]; }).map(elimina)); });
  }

  // ---------- Controlli prima di accettare ----------
  // Un programma compilato si riconosce dai primi byte, non dal nome (il codice sorgente è testo e passa).
  function eProgramma(byte) {
    if (byte.length < 4) return false;
    if (byte[0] === 0x4D && byte[1] === 0x5A) return true;                                         // exe, dll, scr
    if (byte[0] === 0x7F && byte[1] === 0x45 && byte[2] === 0x4C && byte[3] === 0x46) return true; // ELF
    const m = ((byte[0] << 24) | (byte[1] << 16) | (byte[2] << 8) | byte[3]) >>> 0;
    return m === 0xFEEDFACE || m === 0xFEEDFACF || m === 0xCEFAEDFE || m === 0xCFFAEDFE;          // Mach-O
  }
  // Restituisce '' se il file va bene, altrimenti il motivo («vuoto», «grande», «programma»).
  function controlla(file) {
    if (!file || !(file.size > 0)) return Promise.resolve('vuoto');
    if (file.size > MAX_BYTE) return Promise.resolve('grande');
    return file.slice(0, 4).arrayBuffer().then(function (b) { return eProgramma(new Uint8Array(b)) ? 'programma' : ''; }).catch(function () { return ''; });
  }

  // ---------- Server (solo da entrati) ----------
  let usati = function () { return []; };
  let inCorso = null;
  let rifare = false; // arrivato qualcosa di nuovo mentre si stava mandando: si rifà il giro
  let pendenti = false;
  function entrato() { return !!(ARCH && ARCH.attivo && ARCH.sessione()); }
  function daTogliere() { try { return JSON.parse(ARCH.memoria.getItem(CHIAVE_TOGLIERE) || '[]'); } catch (e) { return []; } }
  function scriviDaTogliere(l) { try { ARCH.memoria.setItem(CHIAVE_TOGLIERE, JSON.stringify(l)); } catch (e) { /* resta in memoria */ } }

  function togliDalServer(id) {
    if (!entrato()) return Promise.resolve();
    const l = daTogliere();
    if (l.indexOf(id) === -1) { l.push(id); scriviDaTogliere(l); }
    return sincronizza();
  }

  // Manda i file che mancano e toglie quelli da togliere. Un file rifiutato dal server (spazio finito, programma) non si ritenta.
  function sincronizza() {
    if (!entrato()) return Promise.resolve(true);
    if (inCorso) { rifare = true; return inCorso; }
    inCorso = Promise.resolve().then(function () {
      return ARCH.richiesta('GET', 'allegati').then(function (r) {
        if (r.stato !== 200) return false;
        const suServer = {};
        (r.json.allegati || []).forEach(function (f) { suServer[f.id] = true; });
        const togli = daTogliere();
        const rimaste = [];
        let passo = togli.reduce(function (p, id) {
          return p.then(function () {
            if (!suServer[id]) return;
            return ARCH.richiesta('DELETE', 'allegati/' + id).then(function (x) { if (x.stato === 200 || x.stato === 404) delete suServer[id]; else rimaste.push(id); });
          });
        }, Promise.resolve());
        passo = passo.then(function () { scriviDaTogliere(rimaste); });
        const manca = usati().filter(function (id) { return !suServer[id] && togli.indexOf(id) === -1; });
        return manca.reduce(function (p, id) {
          return p.then(function (ok) {
            return leggi(id).then(function (rec) {
              if (!rec || rec.errore) return ok;
              return ARCH.richiestaGrezza('PUT', 'allegati/' + id, rec.blob, { 'X-Nome': encodeURIComponent(rec.nome) }).then(function (x) {
                if (x.stato === 200) return ok;
                if (x.stato === 413 || x.stato === 415 || x.stato === 400) { rec.errore = x.stato === 415 ? 'programma' : x.json.errore === 'quota' ? 'quota' : 'grande'; return salva(rec).then(function () { return ok; }); }
                return false;
              });
            }).catch(function () { return false; });
          });
        }, passo.then(function () { return rimaste.length === 0; }));
      });
    }).catch(function () { return false; }).then(function (ok) {
      inCorso = null;
      if (rifare) { rifare = false; return sincronizza(); }
      return controllaPendenti().then(function () { return ok; });
    });
    return inCorso;
  }

  function inSospeso() { return entrato() && (daTogliere().length > 0 || pendenti); }
  function controllaPendenti() {
    if (!entrato()) { pendenti = false; return Promise.resolve(false); }
    return ARCH.richiesta('GET', 'allegati').then(function (r) {
      if (r.stato !== 200) return;
      const s = {}; (r.json.allegati || []).forEach(function (f) { s[f.id] = true; });
      return Promise.all(usati().filter(function (id) { return !s[id]; }).map(function (id) { return leggi(id).then(function (x) { return !!x && !x.errore; }).catch(function () { return false; }); }))
        .then(function (l) { pendenti = l.some(Boolean); });
    }).catch(function () { /* senza rete resta com'è */ });
  }

  function avviaSincronizzazione(fnUsati) {
    usati = fnUsati;
    if (!ARCH || !ARCH.attivo) return;
    ARCH.registraSincronizzatore({ nome: 'file', invia: function () { return sincronizza().then(function (ok) { return controllaPendenti().then(function () { return ok; }); }); }, inSospeso: inSospeso });
    // Un rifiuto per spazio finito si riprova a ogni apertura: forse nel frattempo è stato liberato.
    Promise.all(usati().map(function (id) { return leggi(id).then(function (r) { if (r && r.errore === 'quota') { delete r.errore; return salva(r); } }).catch(function () {}); }))
      .then(controllaPendenti).then(sincronizza).then(controllaPendenti);
  }

  // ---------- Scaricare ----------
  // Un file qui sul dispositivo si scarica da lì; uno che c'è solo sul server si prende dal server e si salva con il suo nome.
  function salvaBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome || 'file';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function scarica(id, nome) {
    return leggi(id).catch(function () { return null; }).then(function (rec) {
      if (rec) { salvaBlob(rec.blob, rec.nome || nome); return true; }
      if (!entrato()) return false;
      return fetch(ARCH.urlApi('allegati/' + id), { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) return false;
        return r.blob().then(function (b) { salvaBlob(b, nome); return true; });
      }).catch(function () { return false; });
    });
  }
  // Che cosa si sa di un file: è qui, è solo sul server, ha un problema.
  function stato(id) { return leggi(id).catch(function () { return null; }).then(function (r) { return r ? { locale: true, errore: r.errore || '' } : { locale: false, errore: '' }; }); }

  radice.BC_FILE = {
    MAX_BYTE: MAX_BYTE, salva: salva, leggi: leggi, elimina: elimina, pulisci: pulisci, svuota: svuota,
    controlla: controlla, togliDalServer: togliDalServer, sincronizza: sincronizza, avviaSincronizzazione: avviaSincronizzazione,
    controllaPendenti: controllaPendenti, scarica: scarica, stato: stato
  };
})(window);
