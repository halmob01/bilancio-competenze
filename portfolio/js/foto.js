/* Le mie attività — foto: riduzione nel browser e archivio in IndexedDB.
   Ogni foto viene ridisegnata su una tela e salvata come JPEG nuovo: lato lungo al massimo 1280 pixel più una miniatura
   da 320. Ridisegnarla toglie anche i dati nascosti della foto originale (posizione GPS, modello del telefono).
   Le foto non passano mai dal localStorage (circa 5 MB per tutto l'indirizzo).
   Da entrati le foto vanno anche sul server della scuola (fino a 400 KB l'una): partono in coda appena sono pronte,
   senza rete aspettano; su un altro dispositivo si vedono dal server. Senza accesso nessuna richiesta di rete. */
(function (radice) {
  'use strict';

  const DB = 'portfolio-foto';
  const STORE = 'foto';
  const LATO = 1280;
  const LATO_MINI = 320;
  const QUALITA = 0.8;
  const QUALITA_MINI = 0.72;
  const MAX_BYTE = 380 * 1024;      // il server accetta fino a 400 KB
  const MAX_BYTE_MINI = 50 * 1024;  // e 60 KB per la miniatura

  let aperto = null;
  function apri() {
    if (aperto) return aperto;
    aperto = new Promise(function (ok, ko) {
      if (!radice.indexedDB) { ko(new Error('IndexedDB non disponibile')); return; }
      // Da entrati ogni studente ha il suo archivio di foto («portfolio-foto-u12»): su un PC condiviso non si mescolano.
      const nome = DB + (radice.BC_ARCHIVIO ? radice.BC_ARCHIVIO.suffisso() : '');
      const r = radice.indexedDB.open(nome, 1);
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
        const st = tx.objectStore(STORE);
        let risultato;
        const r = fn(st);
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
  function tutteLeChiavi() { return operazione('readonly', function (st) { return st.getAllKeys(); }); }
  function svuota() { return operazione('readwrite', function (st) { return st.clear(); }); }

  // Toglie dall'archivio le foto che nessuna attività usa più.
  function pulisci(usate) {
    return tutteLeChiavi().then(function (chiavi) {
      return Promise.all((chiavi || []).filter(function (k) { return !usate[k]; }).map(elimina));
    });
  }

  // ---------- Riduzione ----------
  function caricaImmagine(file) {
    // createImageBitmap rispetta l'orientamento della foto (EXIF) dove è supportato; altrimenti un <img>, che lo rispetta da solo.
    if (radice.createImageBitmap) {
      return radice.createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return caricaConImg(file); });
    }
    return caricaConImg(file);
  }
  function caricaConImg(file) {
    return new Promise(function (ok, ko) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('Immagine non leggibile')); };
      img.src = url;
    });
  }
  function aJpeg(sorgente, lato, qualita) {
    const w0 = sorgente.width; const h0 = sorgente.height;
    const k = Math.min(1, lato / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)); const h = Math.max(1, Math.round(h0 * k));
    const tela = document.createElement('canvas');
    tela.width = w; tela.height = h;
    const ctx = tela.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); // le immagini trasparenti diventano su fondo bianco
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sorgente, 0, 0, w, h);
    return new Promise(function (ok, ko) {
      tela.toBlob(function (b) { b ? ok({ blob: b, w: w, h: h }) : ko(new Error('Conversione non riuscita')); }, 'image/jpeg', qualita);
    });
  }
  // Da un file scelto dallo studente al record da salvare: { id, jpeg, mini, w, h, creata }.
  // Una foto molto ricca di dettagli può restare sopra il limite: si riprova con qualità più bassa e poi con meno pixel.
  function entroIlLimite(img, lato, qualita, massimo) {
    return aJpeg(img, lato, qualita).then(function (r) {
      if (r.blob.size <= massimo || (qualita <= 0.5 && lato <= 640)) return r;
      return qualita > 0.5 ? entroIlLimite(img, lato, Math.max(0.5, qualita - 0.1), massimo) : entroIlLimite(img, Math.round(lato * 0.8), 0.7, massimo);
    });
  }
  function riduci(file, id) {
    if (!file || !/^image\//.test(file.type || 'image/')) return Promise.reject(new Error('Non è un\'immagine'));
    return caricaImmagine(file).then(function (img) {
      return Promise.all([entroIlLimite(img, LATO, QUALITA, MAX_BYTE), entroIlLimite(img, LATO_MINI, QUALITA_MINI, MAX_BYTE_MINI)]).then(function (r) {
        if (img.close) img.close();
        return { id: id, jpeg: r[0].blob, mini: r[1].blob, w: r[0].w, h: r[0].h, creata: new Date().toISOString() };
      });
    });
  }

  // ---------- Copia da scaricare ----------
  function aBase64(blob) {
    return new Promise(function (ok, ko) {
      const r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { ko(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function daBase64(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new Blob([out], { type: 'image/jpeg' });
  }
  function eJpeg(b64) { return typeof b64 === 'string' && b64.slice(0, 4) === '/9j/'; } // FF D8 FF in base64

  // La foto di un record (da questo dispositivo) o, se non c'è e si è entrati, dal server.
  function recordO(id) {
    return leggi(id).catch(function () { return null; }).then(function (rec) {
      if (rec) return rec;
      return Promise.all([daServer(id, false), daServer(id, true)]).then(function (b) { return b[0] && b[1] ? { jpeg: b[0], mini: b[1], w: 0, h: 0 } : null; });
    });
  }
  // I byte del JPEG grande, per il PDF.
  function jpegGrande(id) {
    return recordO(id).then(function (rec) { return rec ? rec.jpeg.arrayBuffer().then(function (b) { return new Uint8Array(b); }) : null; });
  }
  // Le foto di una copia: { id: { jpeg, mini, w, h } } in base64.
  function esporta(ids) {
    const out = {};
    return Promise.all(ids.map(function (id) {
      return recordO(id).then(function (rec) {
        if (!rec) return null;
        return Promise.all([aBase64(rec.jpeg), aBase64(rec.mini)]).then(function (b) { out[id] = { jpeg: b[0], mini: b[1], w: rec.w, h: rec.h }; });
      });
    })).then(function () { return out; });
  }
  function importa(foto, idValido) {
    const ids = Object.keys(foto || {}).filter(function (id) { return idValido.test(id) && foto[id] && eJpeg(foto[id].jpeg) && eJpeg(foto[id].mini); });
    return ids.reduce(function (p, id) {
      return p.then(function () {
        const x = foto[id];
        return salva({ id: id, jpeg: daBase64(x.jpeg), mini: daBase64(x.mini), w: Number(x.w) || 0, h: Number(x.h) || 0, creata: new Date().toISOString() });
      });
    }, Promise.resolve()).then(function () { return ids.length; });
  }

  // ---------- Server (solo da entrati) ----------
  const ARCH = radice.BC_ARCHIVIO;
  const CHIAVE_TOGLIERE = 'foto-da-togliere';
  let usate = function () { return []; }; // le foto che le attività usano adesso (le dà il sito)
  let inCorso = null;

  function entrato() { return !!(ARCH && ARCH.attivo && ARCH.sessione()); }
  function daTogliere() { try { return JSON.parse(ARCH.memoria.getItem(CHIAVE_TOGLIERE) || '[]'); } catch (e) { return []; } }
  function scriviDaTogliere(l) { try { ARCH.memoria.setItem(CHIAVE_TOGLIERE, JSON.stringify(l)); } catch (e) { /* resta in memoria */ } }

  // Si toglie dal server quando si toglie dal telefono; senza rete la richiesta aspetta.
  function togliDalServer(id) {
    if (!entrato()) return Promise.resolve();
    const l = daTogliere();
    if (l.indexOf(id) === -1) { l.push(id); scriviDaTogliere(l); }
    return sincronizza();
  }

  // Manda al server le foto che mancano e toglie quelle da togliere. Una sola volta alla volta.
  function sincronizza() {
    if (!entrato()) return Promise.resolve(true);
    if (inCorso) return inCorso;
    inCorso = Promise.resolve().then(function () {
      return ARCH.richiesta('GET', 'foto').then(function (r) {
        if (r.stato !== 200) return false;
        const suServer = {};
        (r.json.foto || []).forEach(function (f) { suServer[f.id] = true; });
        // 1. da togliere
        const togli = daTogliere();
        const rimaste = [];
        let passo = togli.reduce(function (p, id) {
          return p.then(function () {
            if (!suServer[id]) return;
            return ARCH.richiesta('DELETE', 'foto/' + id).then(function (x) { if (x.stato === 200 || x.stato === 404) delete suServer[id]; else rimaste.push(id); });
          });
        }, Promise.resolve());
        // 2. da mandare: usate dalle attività, presenti qui e non ancora sul server
        passo = passo.then(function () { scriviDaTogliere(rimaste); });
        const manca = usate().filter(function (id) { return !suServer[id] && togli.indexOf(id) === -1; });
        return manca.reduce(function (p, id) {
          return p.then(function (ok) {
            return leggi(id).then(function (rec) {
              if (!rec) return ok;
              return Promise.all([aBase64(rec.jpeg), aBase64(rec.mini)]).then(function (b) {
                return ARCH.richiesta('PUT', 'foto/' + id, { jpeg: b[0], mini: b[1] });
              }).then(function (x) { return ok && x.stato === 200; });
            }).catch(function () { return false; });
          });
        }, passo.then(function () { return rimaste.length === 0; }));
      });
    }).catch(function () { return false; }).then(function (ok) { inCorso = null; return ok; });
    return inCorso;
  }

  // C'è ancora qualcosa da mandare o da togliere? (per «Esci» e per il segnale di salvataggio)
  function inSospeso() {
    if (!entrato()) return false;
    if (daTogliere().length) return true;
    return pendenti;
  }
  let pendenti = false;
  function controllaPendenti() {
    if (!entrato()) { pendenti = false; return Promise.resolve(false); }
    return ARCH.richiesta('GET', 'foto').then(function (r) {
      if (r.stato !== 200) return;
      const s = {}; (r.json.foto || []).forEach(function (f) { s[f.id] = true; });
      return Promise.all(usate().filter(function (id) { return !s[id]; }).map(function (id) { return leggi(id).then(function (x) { return !!x; }).catch(function () { return false; }); }))
        .then(function (l) { pendenti = l.some(Boolean); });
    }).catch(function () { /* senza rete resta com'è */ });
  }

  // Una foto che non è su questo dispositivo si prende dal server (da entrati).
  function daServer(id, mini) {
    if (!entrato()) return Promise.resolve(null);
    return fetch(ARCH.urlApi('foto/' + id + (mini ? '/mini' : '')), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; });
  }
  function urlServer(id, mini) { return entrato() ? ARCH.urlApi('foto/' + id + (mini ? '/mini' : '')) : ''; }

  function avviaSincronizzazione(fnUsate) {
    usate = fnUsate;
    if (!ARCH || !ARCH.attivo) return;
    ARCH.registraSincronizzatore({ nome: 'foto', invia: function () { return sincronizza().then(function (ok) { return controllaPendenti().then(function () { return ok; }); }); }, inSospeso: inSospeso });
    controllaPendenti().then(sincronizza).then(controllaPendenti);
  }

  radice.BC_FOTO = {
    salva: salva, leggi: leggi, elimina: elimina, pulisci: pulisci, svuota: svuota,
    riduci: riduci, esporta: esporta, importa: importa, LATO: LATO, LATO_MINI: LATO_MINI,
    jpegGrande: jpegGrande,
    togliDalServer: togliDalServer, sincronizza: sincronizza, daServer: daServer, urlServer: urlServer,
    avviaSincronizzazione: avviaSincronizzazione, controllaPendenti: controllaPendenti
  };
})(window);
