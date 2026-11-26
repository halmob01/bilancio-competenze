/* Le mie attività — foto: riduzione nel browser e archivio in IndexedDB.
   Ogni foto viene ridisegnata su una tela e salvata come JPEG nuovo: lato lungo al massimo 1280 pixel più una miniatura
   da 320. Ridisegnarla toglie anche i dati nascosti della foto originale (posizione GPS, modello del telefono).
   Le foto non passano mai dal localStorage (circa 5 MB per tutto l'indirizzo). Nessuna richiesta di rete. */
(function (radice) {
  'use strict';

  const DB = 'portfolio-foto';
  const STORE = 'foto';
  const LATO = 1280;
  const LATO_MINI = 320;
  const QUALITA = 0.8;
  const QUALITA_MINI = 0.72;

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
  function riduci(file, id) {
    if (!file || !/^image\//.test(file.type || 'image/')) return Promise.reject(new Error('Non è un\'immagine'));
    return caricaImmagine(file).then(function (img) {
      return Promise.all([aJpeg(img, LATO, QUALITA), aJpeg(img, LATO_MINI, QUALITA_MINI)]).then(function (r) {
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

  // Le foto di una copia: { id: { jpeg, mini, w, h } } in base64.
  function esporta(ids) {
    const out = {};
    return Promise.all(ids.map(function (id) {
      return leggi(id).then(function (rec) {
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

  radice.BC_FOTO = {
    salva: salva, leggi: leggi, elimina: elimina, pulisci: pulisci, svuota: svuota,
    riduci: riduci, esporta: esporta, importa: importa, LATO: LATO, LATO_MINI: LATO_MINI
  };
})(window);
