/* Pannello dei docenti — logica pura (nessun accesso al DOM): elenco di studenti incollato, esportazione CSV, testi di stato.
   Usato dal browser (window.BC_DOCENTI) e dai test Node. */
(function (radice) {
  'use strict';

  const MAX_PER_RICHIESTA = 60; // quanti studenti il server accetta in una volta

  // «ROSSI MARIO» → «Rossi Mario»; «de luca» → «De Luca»; «D'ANGELO» → «D'Angelo». Solo se è tutto maiuscolo o tutto minuscolo.
  function capitalizza(t) {
    const s = String(t || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    const tuttoUguale = s === s.toUpperCase() || s === s.toLowerCase();
    if (!tuttoUguale) return s;
    return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, function (_, a, l) { return a + l.toUpperCase(); });
  }

  // Un elenco incollato da un foglio di calcolo o scritto a mano. Una riga per studente; le colonne sono separate da tabulazione,
  // punto e virgola o virgola; con una colonna sola («Rossi Mario») la prima parola è il cognome. ordine: 'cognome-nome' (predefinito)
  // oppure 'nome-cognome'. Una prima riga che dice «cognome» e «nome» si salta.
  function parsaElenco(testo, ordine) {
    const inverso = ordine === 'nome-cognome';
    const righe = String(testo || '').split(/\r?\n/);
    const out = [];
    let scartate = 0;
    righe.forEach(function (riga, i) {
      const r = riga.trim();
      if (!r) return;
      let a; let b;
      const colonne = r.split(/\t|;/).map(function (x) { return x.trim(); }).filter(Boolean);
      const virgole = colonne.length === 1 ? r.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : colonne;
      if (virgole.length >= 2) { a = virgole[0]; b = virgole.slice(1).join(' '); }
      else {
        const parole = virgole[0].split(/\s+/);
        if (parole.length < 2) { scartate++; return; }
        a = parole[0]; b = parole.slice(1).join(' ');
      }
      if (/^cognome$/i.test(a) && /^nome$/i.test(b) || /^nome$/i.test(a) && /^cognome$/i.test(b)) return; // intestazione
      if (i === 0 && /^(cognome|nome|alunno|studente)\b/i.test(a) && /^(cognome|nome)\b/i.test(b)) return;
      const cognome = capitalizza(inverso ? b : a);
      const nome = capitalizza(inverso ? a : b);
      if (!cognome || !nome || cognome.length > 60 || nome.length > 60) { scartate++; return; }
      out.push({ cognome: cognome, nome: nome });
    });
    return { righe: out, scartate: scartate };
  }

  // Divide in gruppi che il server accetta in una richiesta.
  function inGruppi(elenco) {
    const out = [];
    for (let i = 0; i < elenco.length; i += MAX_PER_RICHIESTA) out.push(elenco.slice(i, i + MAX_PER_RICHIESTA));
    return out;
  }

  const STATO = { vuota: 'Da iniziare', in_corso: 'In corso', completa: 'Completo' };
  function statoTesto(p) {
    if (!p) return STATO.vuota;
    const base = STATO[p.stato] || STATO.vuota;
    return p.dettaglio ? base + ' (' + p.dettaglio + ')' : base;
  }

  // «mai», «oggi», «ieri», «3 giorni fa», poi la data. adesso serve solo ai test.
  function ultimoAccesso(iso, adesso) {
    if (!iso) return 'Mai';
    const t = Date.parse(iso);
    if (isNaN(t)) return 'Mai';
    const ora = adesso ? new Date(adesso) : new Date();
    const giorno = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    const diff = Math.round((giorno(ora) - giorno(new Date(t))) / 86400000);
    if (diff <= 0) return 'Oggi';
    if (diff === 1) return 'Ieri';
    if (diff < 7) return diff + ' giorni fa';
    return new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  }

  function formatoByte(n) {
    if (!(n > 0)) return '0 MB';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    if (n < 1024 * 1024 * 1024) return (Math.round(n / 1024 / 102.4) / 10).toString().replace('.', ',') + ' MB';
    return (Math.round(n / 1024 / 1024 / 102.4) / 10).toString().replace('.', ',') + ' GB';
  }

  // CSV per Excel e Fogli in italiano: punto e virgola, UTF-8 con BOM, righe CRLF. Una cella che comincia come una formula
  // (= + - @) si protegge, così un nome non diventa mai un calcolo.
  function cella(v) {
    let t = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  const NOMI_ANNO = { 1: 'I anno', 2: 'II anno', 3: 'III anno', 4: 'IV anno' };
  function csvRiepilogo(riepilogo) {
    const cl = riepilogo.classe || {};
    const intest = ['Cognome', 'Nome', 'Classe', 'Indirizzo', 'Anno', 'Attività', 'Foto', 'File', 'Diario', 'Bilancio', 'Curriculum', 'Orientamento', 'Ultimo accesso', 'Attivo'];
    const righe = [intest].concat((riepilogo.studenti || []).map(function (s) {
      return [s.cognome, s.nome, cl.nome || '', cl.indirizzo || '', NOMI_ANNO[cl.anno] || '', s.percorsi.portfolio.dettaglio || '0 attività', s.foto, s.file,
        statoTesto(s.percorsi.diario), statoTesto(s.percorsi.bilancio), statoTesto(s.percorsi.curriculum), statoTesto(s.percorsi.orientamento), s.ultimoAccesso ? s.ultimoAccesso.slice(0, 10) : 'Mai', s.attivo ? 'sì' : 'no'];
    }));
    return '﻿' + righe.map(function (r) { return r.map(cella).join(';'); }).join('\r\n') + '\r\n';
  }
  // Come si dice il livello di una risposta, con la prova: «da solo, in situazioni note · con prova».
  function livelloTesto(r, livelli) {
    if (!r || !r.livello) return '';
    const l = (livelli || []).find(function (x) { return x.id === r.livello; });
    if (!l) return '';
    return l.breve + (l.dichiara ? (r.prova ? ' · con prova' : ' · senza prova') : '');
  }
  // Una riga per studente, una colonna per competenza (frase semplice): per vedere a colpo d'occhio chi ha risposto e come.
  function csvCompetenze(dati) {
    const comp = dati.competenze || [];
    const righe = [['Cognome', 'Nome', 'Classe'].concat(comp.map(function (c) { return c.semplice; }))].concat((dati.studenti || []).map(function (s) {
      return [s.cognome, s.nome, (dati.classe && dati.classe.nome) || ''].concat(comp.map(function (c) { return livelloTesto(s.risposte[c.id], dati.livelli); }));
    }));
    return '\ufeff' + righe.map(function (r) { return r.map(cella).join(';'); }).join('\r\n') + '\r\n';
  }
  function nomeFileCsv(classe, oggi, prefisso) {
    const n = String((classe && classe.nome) || 'classe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'classe';
    const d = oggi || new Date().toISOString().slice(0, 10);
    return (prefisso || 'riepilogo') + '-' + n + '-' + d + '.csv';
  }

  // L'anno scolastico di oggi: da settembre in poi è «2026/27», prima «2025/26».
  function annoScolastico(oggi) {
    const d = oggi ? new Date(oggi) : new Date();
    const a = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    return a + '/' + String(a + 1).slice(2);
  }

  const DOCENTI = {
    MAX_PER_RICHIESTA: MAX_PER_RICHIESTA, capitalizza: capitalizza, parsaElenco: parsaElenco, inGruppi: inGruppi, statoTesto: statoTesto,
    ultimoAccesso: ultimoAccesso, formatoByte: formatoByte, csvRiepilogo: csvRiepilogo, csvCompetenze: csvCompetenze, livelloTesto: livelloTesto, nomeFileCsv: nomeFileCsv, annoScolastico: annoScolastico
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DOCENTI;
  else radice.BC_DOCENTI = DOCENTI;
})(typeof window !== 'undefined' ? window : globalThis);
