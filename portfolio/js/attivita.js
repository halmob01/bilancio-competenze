/* Le mie attività (portfolio) — logica pura: stato, normalizzazione, proposte dal diario, documento da scaricare.
   Nessun accesso al DOM: usato dal browser (window.BC_ATTIVITA) e dai test Node.
   Le foto non stanno qui: questo stato tiene solo i loro identificativi; i file (JPEG ridotti) sono in IndexedDB (foto.js).
   Il portfolio legge il diario solo su richiesta dello studente e non lo modifica mai (piano del portale §6). */
(function (radice) {
  'use strict';

  const C = (typeof module !== 'undefined' && module.exports) ? require('../../js/competenze.js') : radice.BC_COMPETENZE;

  const CHIAVE = 'portfolio-attivita-v1';
  const VERSIONE = 1;
  const MAX_ATTIVITA = 300;
  const MAX_FOTO = 4;
  const MAX_COMPETENZE = 3;
  const MAX_BREVE = 200;
  const MAX_LUNGO = 4000;

  // Stessi identificativi dei contesti del bilancio, così un'attività diventa una «cosa fatta» senza traduzioni.
  const LUOGHI = [
    { id: 'scuola', testo: 'A scuola o in laboratorio', breve: 'A scuola' },
    { id: 'tirocinio', testo: 'In tirocinio o alternanza', breve: 'In tirocinio' },
    { id: 'fuori', testo: 'Fuori da scuola', breve: 'Fuori da scuola' }
  ];
  const INDIRIZZI = [
    { id: 'elettrico', testo: 'Elettrico' }, { id: 'informatica', testo: 'Informatica' }, { id: 'estetica', testo: 'Estetica' }
  ];
  const ANNI = [
    { id: 'anno1', testo: 'I anno' }, { id: 'anno2', testo: 'II anno' }, { id: 'anno3', testo: 'III anno' }, { id: 'anno4', testo: 'IV anno' }
  ];

  function testo(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }
  function inElenco(v, elenco) { return elenco.some(function (x) { return x.id === v; }) ? v : ''; }
  function dataValida(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : ''; }
  function nuovoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function oggiIso(d) {
    const x = d || new Date();
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
  }
  const ID_FOTO = /^f[a-z0-9]{6,40}$/;

  function statoVuoto() { return { versione: VERSIONE, aggiornato: '', profilo: { indirizzo: '', anno: '' }, attivita: [] }; }

  function attivitaVuota(oggi) {
    return { id: nuovoId('a'), fatto: '', luogo: '', dove: '', data: oggi || oggiIso(), competenze: [], difficolta: '', aiuto: '', foto: [], diario: null };
  }
  function nuovoIdFoto() { return nuovoId('f'); }

  // Ricostruisce uno stato valido da dati salvati o caricati: scarta chiavi sconosciute, tipi errati, competenze inesistenti.
  function normalizza(grezzo) {
    const s = statoVuoto();
    if (!grezzo || typeof grezzo !== 'object') return s;
    s.aggiornato = testo(grezzo.aggiornato, 40);
    const p = grezzo.profilo || {};
    s.profilo.indirizzo = inElenco(p.indirizzo, INDIRIZZI);
    s.profilo.anno = inElenco(p.anno, ANNI);
    const visti = {};
    (Array.isArray(grezzo.attivita) ? grezzo.attivita : []).slice(0, MAX_ATTIVITA).forEach(function (a) {
      if (!a || typeof a !== 'object') return;
      let id = testo(a.id, 40);
      if (!id || visti[id]) id = nuovoId('a');
      visti[id] = true;
      const d = a.diario && typeof a.diario === 'object' ? { tirocinio: testo(a.diario.tirocinio, 40), settimana: testo(a.diario.settimana, 40) } : null;
      s.attivita.push({
        id: id,
        fatto: testo(a.fatto, MAX_LUNGO),
        luogo: inElenco(a.luogo, LUOGHI),
        dove: testo(a.dove, MAX_BREVE),
        data: dataValida(a.data),
        competenze: (Array.isArray(a.competenze) ? a.competenze : [])
          .filter(function (x, i, arr) { return typeof x === 'string' && C.esiste(x) && arr.indexOf(x) === i; }).slice(0, MAX_COMPETENZE),
        difficolta: testo(a.difficolta, MAX_LUNGO),
        aiuto: testo(a.aiuto, MAX_LUNGO),
        foto: (Array.isArray(a.foto) ? a.foto : [])
          .filter(function (x, i, arr) { return typeof x === 'string' && ID_FOTO.test(x) && arr.indexOf(x) === i; }).slice(0, MAX_FOTO),
        diario: d && d.settimana ? d : null
      });
    });
    return s;
  }

  // Il titolo di un'attività è l'inizio di quello che lo studente ha scritto: niente campo in più da riempire.
  function titolo(a) {
    const t = String(a.fatto || '').trim().split(/\n/)[0];
    if (!t) return 'Attività senza descrizione';
    return t.length > 90 ? t.slice(0, 88).replace(/\s+\S*$/, '') + '…' : t;
  }

  function formatoData(iso) {
    if (!iso) return '';
    const p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function luogo(id) { return LUOGHI.find(function (l) { return l.id === id; }) || null; }

  // Riga breve sotto il titolo: «12 marzo 2026 · In tirocinio · Studio Rete Sicura».
  function riassunto(a) {
    const l = luogo(a.luogo);
    return [formatoData(a.data), l ? l.breve : '', a.dove.trim()].filter(Boolean).join(' · ');
  }

  // Dalla più recente; a parità di data, l'ultima inserita prima.
  function ordinate(stato) {
    return stato.attivita.map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) {
      if (x.a.data !== y.a.data) return x.a.data < y.a.data ? 1 : -1;
      return y.i - x.i;
    }).map(function (x) { return x.a; });
  }

  // Che cosa manca perché l'attività serva come prova: niente blocchi, solo un promemoria.
  function mancanti(a) {
    const m = [];
    if (!a.foto.length) m.push('una foto');
    if (!pieno(a.fatto)) m.push('che cosa hai fatto');
    if (!a.luogo) m.push('dove');
    return m;
  }

  // Tutte le foto usate dalle attività: le altre, in IndexedDB, sono avanzi da eliminare.
  function fotoUsate(stato) {
    const u = {};
    stato.attivita.forEach(function (a) { a.foto.forEach(function (f) { u[f] = true; }); });
    return u;
  }

  // ---------- Dal diario (sola lettura) ----------
  // Una proposta per ogni settimana in cui lo studente ha scritto che cosa ha fatto. Le settimane già portate qui sono segnate.
  function proposteDalDiario(grezzo, stato) {
    if (!grezzo || typeof grezzo !== 'object' || !Array.isArray(grezzo.tirocini)) return [];
    const gia = {};
    (stato ? stato.attivita : []).forEach(function (a) { if (a.diario) gia[a.diario.settimana] = true; });
    const t = function (v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; };
    const out = [];
    grezzo.tirocini.slice(0, 12).forEach(function (tir) {
      if (!tir || typeof tir !== 'object') return;
      const azienda = t(tir.azienda, MAX_BREVE);
      (Array.isArray(tir.settimane) ? tir.settimane : []).slice(0, 80).forEach(function (w) {
        if (!w || typeof w !== 'object') return;
        const fatto = t(w.fatto, MAX_LUNGO);
        if (!fatto) return;
        const id = t(w.id, 40);
        out.push({
          tirocinio: t(tir.id, 40), settimana: id, azienda: azienda,
          data: dataValida(w.dal), fatto: fatto,
          difficolta: t(w.difficolta, MAX_LUNGO), aiuto: t(w.aiuto, MAX_LUNGO),
          gia: !!(id && gia[id])
        });
      });
    });
    return out.sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
  }

  function attivitaDaProposta(p) {
    const a = attivitaVuota(p.data || oggiIso());
    a.fatto = p.fatto; a.luogo = 'tirocinio'; a.dove = p.azienda;
    a.difficolta = p.difficolta; a.aiuto = p.aiuto;
    a.diario = p.settimana ? { tirocinio: p.tirocinio, settimana: p.settimana } : null;
    return a;
  }

  // ---------- Documento da scaricare (PDF) ----------
  // Modello per pdf.js (layout «portfolio»). foto: { idFoto: Uint8Array del JPEG }; quelle mancanti si saltano.
  function modelloPdf(stato, foto, o) {
    const opz = o || {};
    const figura = C.figuraPer(stato.profilo.indirizzo, stato.profilo.anno);
    const anno = ANNI.find(function (x) { return x.id === stato.profilo.anno; });
    const sezioni = ordinate(stato).map(function (a) {
      const blocchi = [];
      if (pieno(a.fatto)) blocchi.push({ t: 'par', runs: [{ t: a.fatto.trim() }] });
      const img = a.foto.map(function (id) { return foto[id]; }).filter(Boolean);
      if (img.length) blocchi.push({ t: 'foto', immagini: img });
      a.competenze.forEach(function (id) {
        const c = C.trova(id);
        if (c) blocchi.push({ t: 'voce', runs: [{ t: c.semplice }] });
      });
      if (pieno(a.difficolta)) blocchi.push({ t: 'par', runs: [{ t: 'Che cosa è stato difficile: ', b: true }, { t: a.difficolta.trim() }] });
      if (pieno(a.aiuto)) blocchi.push({ t: 'par', runs: [{ t: 'Chi o che cosa mi ha aiutato: ', b: true }, { t: a.aiuto.trim() }] });
      return { titolo: riassunto(a) || 'Attività', blocchi: blocchi };
    });
    return {
      layout: 'portfolio', carattere: 'moderno', colore: '#CC0000', titoli: '#CC0000', scala: 1,
      nome: opz.nome ? 'Le attività di ' + opz.nome : 'Le mie attività',
      occupazione: [figura, anno ? anno.testo : ''].filter(Boolean).join(' · '),
      contatti: [{ etichetta: 'Attività', valore: String(stato.attivita.length) }],
      sezioni: sezioni.length ? sezioni : [{ titolo: 'Le mie attività', blocchi: [{ t: 'par', runs: [{ t: 'Ancora nessuna attività.' }] }] }],
      titoloDocumento: 'Le mie attivita'
    };
  }

  const ATTIVITA = {
    CHIAVE: CHIAVE, VERSIONE: VERSIONE, MAX_ATTIVITA: MAX_ATTIVITA, MAX_FOTO: MAX_FOTO, MAX_COMPETENZE: MAX_COMPETENZE,
    LUOGHI: LUOGHI, INDIRIZZI: INDIRIZZI, ANNI: ANNI, ID_FOTO: ID_FOTO,
    statoVuoto: statoVuoto, attivitaVuota: attivitaVuota, nuovoIdFoto: nuovoIdFoto, normalizza: normalizza,
    titolo: titolo, riassunto: riassunto, formatoData: formatoData, luogo: luogo, ordinate: ordinate, mancanti: mancanti,
    fotoUsate: fotoUsate, proposteDalDiario: proposteDalDiario, attivitaDaProposta: attivitaDaProposta,
    modelloPdf: modelloPdf, oggiIso: oggiIso, pieno: pieno
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ATTIVITA;
  else radice.BC_ATTIVITA = ATTIVITA;
})(typeof window !== 'undefined' ? window : globalThis);
