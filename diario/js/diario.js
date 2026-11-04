/* Diario di bordo del tirocinio — logica pura (stato, settimane, lettura del bilancio).
   Nessun accesso al DOM: usato dal browser (window.BC_DIARIO) e dai test Node.
   Il diario e il bilancio stanno sullo stesso indirizzo e si scambiano dati leggendo il salvataggio dell'altro
   (contratto in docs/DIARIO.md). Il diario non legge mai il curriculum. */
(function (radice) {
  'use strict';

  const L = (typeof module !== 'undefined' && module.exports) ? require('../../js/bilancio.js') : radice.BC_LOGICA;

  const CHIAVE = 'diario-tirocinio-v1';
  const CHIAVE_BILANCIO = 'bilancio-competenze-v1';
  const VERSIONE = 1;
  const MAX_TIROCINI = 5;
  const MAX_SETTIMANE = 80;
  const MAX_OBIETTIVI = 10;
  const MAX_BREVE = 200;
  const MAX_LUNGO = 4000;

  const GIORNI = [
    { id: 'lun', testo: 'Lun' }, { id: 'mar', testo: 'Mar' }, { id: 'mer', testo: 'Mer' },
    { id: 'gio', testo: 'Gio' }, { id: 'ven', testo: 'Ven' }, { id: 'sab', testo: 'Sab' }
  ];

  // Come è andata la settimana: poche frasi esplicite, mai una scala numerica o un'emoji.
  const UMORI = [
    { id: 'bene', testo: 'È andata bene' },
    { id: 'cosi', testo: 'È andata così così' },
    { id: 'dura', testo: 'È stata una settimana dura' },
    { id: 'lunga', testo: 'Mi è sembrata lunga' }
  ];

  function testo(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }
  function inElenco(v, elenco) { return elenco.some(function (x) { return x.id === v; }) ? v : ''; }
  function dataValida(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : ''; }
  function nuovoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function statoVuoto() { return { versione: VERSIONE, aggiornato: '', corrente: '', tirocini: [] }; }

  function tirocinioVuoto() {
    return { id: nuovoId('t'), azienda: '', citta: '', dal: '', al: '', ore: '', obiettivi: [], settimane: [] };
  }

  function settimanaVuota(dal) {
    return { id: nuovoId('s'), dal: dal || '', giorni: [], ore: '', fatto: '', imparato: '', difficolta: '', aiuto: '', umore: '', obiettivi: [], note: '' };
  }

  // Ricostruisce uno stato valido da dati salvati o caricati: scarta chiavi sconosciute e tipi errati.
  function normalizza(grezzo) {
    const s = statoVuoto();
    if (!grezzo || typeof grezzo !== 'object') return s;
    s.aggiornato = testo(grezzo.aggiornato, 40);
    const visti = {};
    (Array.isArray(grezzo.tirocini) ? grezzo.tirocini : []).slice(0, MAX_TIROCINI).forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      let id = testo(t.id, 40);
      if (!id || visti[id]) id = nuovoId('t');
      visti[id] = true;
      const n = {
        id: id, azienda: testo(t.azienda, MAX_BREVE), citta: testo(t.citta, 80),
        dal: dataValida(t.dal), al: dataValida(t.al), ore: testo(t.ore, 6).replace(/[^\d]/g, ''),
        obiettivi: (Array.isArray(t.obiettivi) ? t.obiettivi : []).slice(0, MAX_OBIETTIVI).map(function (x) { return testo(x, MAX_BREVE).trim(); }).filter(Boolean),
        settimane: []
      };
      const vs = {};
      (Array.isArray(t.settimane) ? t.settimane : []).slice(0, MAX_SETTIMANE).forEach(function (w) {
        if (!w || typeof w !== 'object') return;
        let wid = testo(w.id, 40);
        if (!wid || vs[wid]) wid = nuovoId('s');
        vs[wid] = true;
        n.settimane.push({
          id: wid, dal: dataValida(w.dal),
          giorni: (Array.isArray(w.giorni) ? w.giorni : []).filter(function (g) { return inElenco(g, GIORNI); }),
          ore: testo(w.ore, 3).replace(/[^\d]/g, ''),
          fatto: testo(w.fatto, MAX_LUNGO), imparato: testo(w.imparato, MAX_LUNGO),
          difficolta: testo(w.difficolta, MAX_LUNGO), aiuto: testo(w.aiuto, MAX_LUNGO),
          umore: inElenco(w.umore, UMORI),
          obiettivi: (Array.isArray(w.obiettivi) ? w.obiettivi : []).slice(0, MAX_OBIETTIVI).map(function (x) { return testo(x, MAX_BREVE).trim(); }).filter(Boolean),
          note: testo(w.note, MAX_LUNGO)
        });
      });
      s.tirocini.push(n);
    });
    s.corrente = s.tirocini.some(function (t) { return t.id === grezzo.corrente; }) ? grezzo.corrente : (s.tirocini[0] ? s.tirocini[0].id : '');
    return s;
  }

  // ---------- Date ----------
  function aData(iso) { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function inIso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function lunedi(iso) {
    const d = aData(iso);
    const g = (d.getDay() + 6) % 7; // lunedì = 0
    d.setDate(d.getDate() - g);
    return inIso(d);
  }
  function piuGiorni(iso, n) { const d = aData(iso); d.setDate(d.getDate() + n); return inIso(d); }

  // La settimana da proporre: quella dopo l'ultima scritta; se non ce ne sono, quella dell'inizio del tirocinio o di oggi.
  function prossimaSettimana(t, oggi) {
    const date = t.settimane.map(function (w) { return w.dal; }).filter(Boolean).sort();
    if (date.length) return piuGiorni(lunedi(date[date.length - 1]), 7);
    return lunedi(t.dal || oggi || inIso(new Date()));
  }

  function etichettaSettimana(iso) {
    if (!iso) return 'Settimana senza data';
    return 'Settimana dal ' + aData(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  }

  function completa(w) { return pieno(w.fatto) && pieno(w.imparato); }

  // ---------- Dal bilancio ----------
  // Legge il salvataggio del bilancio con le sue stesse regole e ne ricava solo ciò che serve al diario.
  function dalBilancio(grezzo) {
    const vuoto = { obiettivi: [], ricordi: [], esperienze: [] };
    if (!grezzo || typeof grezzo !== 'object' || !L) return vuoto;
    const s = L.normalizza(grezzo);
    const b = L.componiBilancio(s);
    return {
      // Quello che lo studente ha scritto di dover ancora imparare: obiettivi per il tirocinio.
      obiettivi: b.devoImparare.map(function (x) {
        if (!x.testo) return x.fonte + ': ancora da imparare';
        return x.fonte === 'Uno sguardo critico' ? x.testo : x.fonte + ': ' + x.testo;
      }),
      ricordi: [s.anni.tirocinio, s.anni.tirocinio2].filter(pieno).map(function (x) { return x.trim(); }),
      esperienze: s.esperienze.filter(function (e) { return e.quando === 'tirocinio' && pieno(e.titolo); }).map(function (e) { return e.titolo.trim(); })
    };
  }

  const DIARIO = {
    CHIAVE: CHIAVE, CHIAVE_BILANCIO: CHIAVE_BILANCIO, VERSIONE: VERSIONE, MAX_TIROCINI: MAX_TIROCINI, MAX_SETTIMANE: MAX_SETTIMANE, MAX_OBIETTIVI: MAX_OBIETTIVI,
    GIORNI: GIORNI, UMORI: UMORI,
    statoVuoto: statoVuoto, tirocinioVuoto: tirocinioVuoto, settimanaVuota: settimanaVuota, normalizza: normalizza,
    lunedi: lunedi, piuGiorni: piuGiorni, prossimaSettimana: prossimaSettimana, etichettaSettimana: etichettaSettimana,
    completa: completa, dalBilancio: dalBilancio, pieno: pieno
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DIARIO;
  else radice.BC_DIARIO = DIARIO;
})(typeof window !== 'undefined' ? window : globalThis);
