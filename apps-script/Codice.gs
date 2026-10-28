/**
 * Bilancio di competenze — ricezione delle risposte in un Foglio Google.
 *
 * Da incollare in Estensioni > Apps Script del foglio del docente e da
 * pubblicare come applicazione web (istruzioni in docs/FOGLIO-GOOGLE.md).
 * Ogni studente occupa una riga, riconosciuta dal codice anonimo che l'app
 * genera sul dispositivo: un nuovo invio aggiorna la riga invece di duplicarla.
 *
 * Fogli creati dallo script:
 * - «Risposte»: una riga per studente, tutte le risposte in colonne;
 * - «Riepilogo»: quanti studenti per livello, per situazione e per indirizzo,
 *   con formule che si aggiornano da sole (filtro per classe nella cella B3);
 * - «Scheda studente»: scelto un nome in B1, compone il suo bilancio
 *   impaginato e pronto da stampare.
 * Il menu «Bilancio» del foglio permette di ricreare riepilogo e scheda.
 */

var FOGLIO = 'Risposte';
var MAX_CELLA = 49000; // limite di Fogli: 50.000 caratteri per cella
var MAX_RICHIESTA = 400000;

var SITUAZIONI = [
  ['capire', 'Capire'], ['fare', 'Fare'], ['collaborare', 'Collaborare'],
  ['verificare', 'Verificare'], ['spiegare', 'Spiegare'], ['migliorare', 'Migliorare']
];
var LIVELLI = {
  mai: "Non l'ho mai affrontato",
  non_ancora: 'Non lo so ancora fare',
  con_aiuto: "Con l'aiuto di qualcuno",
  autonomo_noto: 'In autonomia, situazioni note',
  autonomo_nuovo: 'In autonomia, anche situazioni nuove'
};
var QUANDO = {
  anno1: 'I anno', anno2: 'II anno', anno3: 'III anno', anno4: 'IV anno',
  tirocinio: 'Tirocinio', fuori: 'Fuori da scuola'
};
var INDIRIZZI = { elettrico: 'Elettrico', informatica: 'Informatica', estetica: 'Estetica' };

function intestazioni() {
  var h = ['Ricevuto', 'Codice', 'Nome', 'Classe', 'Indirizzo', 'Ultima modifica',
    'I anno', 'II anno', 'III anno', 'IV anno', 'Tirocinio (ricordi)',
    'N. esperienze', 'Esperienze'];
  SITUAZIONI.forEach(function (s) {
    h.push(s[1] + ' — livello', s[1] + ' — esempio', s[1] + ' — come / che cosa serve');
  });
  h.push('Scuola', 'Tirocinio (giudizio)', 'Devo ancora imparare',
    'Orientamento — chi sei', 'Orientamento — esperienza', 'Orientamento — difficoltà',
    'Orientamento — consiglio', 'Testo open day', 'Dati completi (JSON)');
  return h;
}

function t(v) {
  var s = typeof v === 'string' ? v : '';
  // Evita che un testo che inizia con = + - @ venga interpretato come formula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.length > MAX_CELLA ? s.slice(0, MAX_CELLA) + ' […]' : s;
}

function riga(d, ricevuto) {
  var p = d.profilo || {};
  var a = d.anni || {};
  var esp = Array.isArray(d.esperienze) ? d.esperienze : [];
  var testoEsp = esp.map(function (e, i) {
    var parti = [(i + 1) + '. ' + (e.titolo || 'Senza titolo') + (QUANDO[e.quando] ? ' (' + QUANDO[e.quando] + ')' : '')];
    if (e.contesto) parti.push('Contesto: ' + e.contesto);
    if (e.azione) parti.push('Azione: ' + e.azione);
    if (e.prova) parti.push('Prova: ' + e.prova);
    if (e.difficolta) parti.push('Difficoltà: ' + e.difficolta);
    if (e.aiuto) parti.push('Aiuto: ' + e.aiuto);
    if (LIVELLI[e.autonomia]) parti.push('Autonomia: ' + LIVELLI[e.autonomia]);
    return parti.join('\n');
  }).join('\n\n');

  var r = [ricevuto, t(d.codice), t(p.nome), t(p.classe), INDIRIZZI[p.indirizzo] || '', t(d.aggiornato),
    t(a.anno1), t(a.anno2), t(a.anno3), t(a.anno4), t(a.tirocinio),
    esp.length, t(testoEsp)];

  var sf = d.sofare || {};
  SITUAZIONI.forEach(function (s) {
    var x = sf[s[0]] || {};
    var collegate = (Array.isArray(x.esperienze) ? x.esperienze : []).map(function (id) {
      var e = esp.filter(function (y) { return y.id === id; })[0];
      return e ? (e.titolo || 'Esperienza') : null;
    }).filter(Boolean);
    var esempio = x.esempio || '';
    if (collegate.length) esempio += (esempio ? '\n' : '') + 'Esperienze collegate: ' + collegate.join(', ');
    r.push(LIVELLI[x.livello] || '', t(esempio), t(x.come));
  });

  var sg = d.sguardo || {};
  var o = d.orientamento || {};
  r.push(t(sg.scuola), t(sg.tirocinio), t(sg.ancora),
    t(o.presentati), t(o.racconto), t(o.difficile), t(o.consiglio), t(o.testo),
    t(JSON.stringify(d)));
  return r;
}

// Un foglio nuovo ha solo 26 colonne (A–Z), ma qui ne servono 40: senza
// allargarlo, le colonne oltre la Z (le ultime situazioni, lo sguardo critico,
// l'open day) non verrebbero scritte.
function assicuraColonne(sh, n) {
  var max = sh.getMaxColumns();
  if (max < n) sh.insertColumnsAfter(max, n - max);
}

function foglio() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(FOGLIO) || ss.insertSheet(FOGLIO);
  var h = intestazioni();
  assicuraColonne(sh, h.length);
  if (sh.getLastRow() === 0) {
    sh.appendRow(h);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(3);
  } else {
    // Riallinea le intestazioni se il foglio è stato creato da una versione precedente.
    sh.getRange(1, 1, 1, h.length).setValues([h]);
  }
  sh.getRange(1, 1, 1, h.length).setFontWeight('bold');
  return sh;
}

function risposta(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var corpo = e && e.postData ? e.postData.contents : '';
    if (!corpo || corpo.length > MAX_RICHIESTA) return risposta({ ok: false, errore: 'dimensione' });
    var d = JSON.parse(corpo);
    if (!d || d.versione !== 1 || !/^[a-z0-9]{12,40}$/.test(d.codice || '') || !d.profilo) {
      return risposta({ ok: false, errore: 'formato' });
    }
    if (!String(d.profilo.nome || '').trim()) return risposta({ ok: false, errore: 'nome' });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sh = foglio();
      var ora = new Date();
      var valori = riga(d, ora);
      var ultima = sh.getLastRow();
      var trovata = -1;
      var aggiunta = false;
      if (ultima > 1) {
        var codici = sh.getRange(2, 2, ultima - 1, 1).getValues();
        for (var i = 0; i < codici.length; i++) {
          if (codici[i][0] === d.codice) { trovata = i + 2; break; }
        }
      }
      if (trovata > 0) sh.getRange(trovata, 1, 1, valori.length).setValues([valori]);
      else { sh.appendRow(valori); trovata = sh.getLastRow(); aggiunta = true; }
      // Verifica che l'ultima colonna (i dati completi) sia stata scritta davvero:
      // se no, l'app deve dirlo allo studente invece di fingere un invio riuscito.
      SpreadsheetApp.flush();
      var ultimaCella = String(sh.getRange(trovata, valori.length).getValue());
      if (!ultimaCella) return risposta({ ok: false, errore: 'colonne' });
      try { preparaViste(SpreadsheetApp.getActiveSpreadsheet(), false); } catch (errViste) { /* l'invio resta valido */ }
      return risposta({ ok: true, ricevuto: ora.toISOString(), aggiornata: !aggiunta });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return risposta({ ok: false, errore: 'server' });
  }
}

function doGet() {
  return risposta({ ok: true, servizio: 'bilancio-competenze' });
}

/* ------------------------------------------------------------------ */
/* Viste per il docente: riepilogo di classe e scheda dello studente. */
/* ------------------------------------------------------------------ */

var RIEPILOGO = 'Riepilogo';
var SCHEDA = 'Scheda studente';
var ORDINE_LIVELLI = ['autonomo_nuovo', 'autonomo_noto', 'con_aiuto', 'non_ancora', 'mai'];
var DICHIARA = { con_aiuto: true, autonomo_noto: true, autonomo_nuovo: true };
var LIVELLI_BREVI = {
  con_aiuto: 'con aiuto',
  autonomo_noto: 'in autonomia, in situazioni note',
  autonomo_nuovo: 'in autonomia, anche in situazioni nuove'
};
var GRIGIO = '#6b6b6b';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bilancio')
    .addItem('Aggiorna la scheda dello studente', 'menuScheda')
    .addItem('Ricrea il riepilogo di classe', 'menuRiepilogo')
    .addToUi();
  try { preparaViste(SpreadsheetApp.getActiveSpreadsheet(), false); } catch (e) { /* al primo invio */ }
}

function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() === SCHEDA && e.range.getRow() === 1 && e.range.getColumn() === 2) {
    mostraScheda(e.range.getValue());
  }
}

function menuScheda() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDA);
  if (sh) mostraScheda(sh.getRange('B1').getValue());
}

function menuRiepilogo() {
  costruisciRiepilogo(SpreadsheetApp.getActiveSpreadsheet());
}

function preparaViste(ss, forza) {
  foglio();
  if (forza || !ss.getSheetByName(RIEPILOGO)) costruisciRiepilogo(ss);
  if (forza || !ss.getSheetByName(SCHEDA)) costruisciScheda(ss);
}

function lettereColonna(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Intervallo aperto di una colonna del foglio Risposte, per nome di intestazione.
function colonnaRisposte(nome) {
  var i = intestazioni().indexOf(nome);
  if (i < 0) throw new Error('Colonna sconosciuta: ' + nome);
  var c = lettereColonna(i + 1);
  return "'" + FOGLIO + "'!$" + c + '$2:$' + c;
}

// COUNTIFS con il filtro facoltativo per classe scritto in B3.
function formulaConta(criteri) {
  var base = criteri.map(function (c) { return c[0] + ',' + c[1]; }).join(',');
  return '=IF($B$3="",COUNTIFS(' + base + '),COUNTIFS(' + base + ',' + colonnaRisposte('Classe') + ',$B$3))';
}

function costruisciRiepilogo(ss) {
  var sh = ss.getSheetByName(RIEPILOGO) || ss.insertSheet(RIEPILOGO);
  var classe = sh.getLastRow() >= 3 ? sh.getRange('B3').getValue() : '';
  sh.clear();

  var LARGH = 7;
  function riga() {
    var r = Array.prototype.slice.call(arguments);
    while (r.length < LARGH) r.push('');
    return r;
  }
  var righe = [
    riga('Riepilogo di classe'),
    riga('Si aggiorna da solo a ogni invio. Per vedere una sola classe scrivi in B3 la classe come compare nel foglio Risposte; lascia vuoto per tutte.'),
    riga('Classe', classe),
    riga()
  ];
  var titoli = [];
  var intestazioniTabelle = [];
  var gruppi = [['Tutti gli indirizzi', null], ['Elettrico', 'Elettrico'], ['Informatica', 'Informatica'], ['Estetica', 'Estetica']];

  gruppi.forEach(function (g) {
    var filtro = g[1] ? [[colonnaRisposte('Indirizzo'), '"' + g[1] + '"']] : [];
    var rigaStudenti = righe.length + 1;
    titoli.push(rigaStudenti);
    righe.push(riga(g[0], formulaConta([[colonnaRisposte('Codice'), '"<>"']].concat(filtro)), 'studenti'));
    intestazioniTabelle.push(righe.length + 1);
    righe.push(['Situazione'].concat(ORDINE_LIVELLI.map(function (l) { return LIVELLI[l]; }), ['Senza risposta']));
    SITUAZIONI.forEach(function (s) {
      var n = righe.length + 1;
      var r = [s[1]];
      ORDINE_LIVELLI.forEach(function (l) {
        r.push(formulaConta([[colonnaRisposte(s[1] + ' — livello'), '"' + LIVELLI[l] + '"']].concat(filtro)));
      });
      r.push('=$B$' + rigaStudenti + '-SUM(B' + n + ':F' + n + ')');
      righe.push(r);
    });
    righe.push(riga());
  });

  sh.getRange(1, 1, righe.length, LARGH).setValues(righe);
  sh.getRange('A1').setFontSize(16).setFontWeight('bold');
  sh.getRange(2, 1, 1, LARGH).merge().setWrap(true).setFontColor(GRIGIO);
  sh.getRange('A3').setFontWeight('bold');
  sh.getRange('B3').setBackground('#FFF0ED').setFontWeight('bold');
  titoli.forEach(function (r) { sh.getRange(r, 1, 1, 3).setFontWeight('bold').setFontSize(12); });
  intestazioniTabelle.forEach(function (r) {
    sh.getRange(r, 1, 1, LARGH).setFontWeight('bold').setWrap(true).setVerticalAlignment('top')
      .setBorder(false, false, true, false, false, false);
  });
  sh.setColumnWidth(1, 200);
  for (var c = 2; c <= LARGH; c++) sh.setColumnWidth(c, 140);
  return sh;
}

function costruisciScheda(ss) {
  var sh = ss.getSheetByName(SCHEDA) || ss.insertSheet(SCHEDA);
  var nome = sh.getLastRow() >= 1 ? sh.getRange('B1').getValue() : '';
  sh.clear();
  sh.getRange('A1').setValue('Studente').setFontWeight('bold');
  var regola = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(FOGLIO).getRange('C2:C'), true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('B1').setDataValidation(regola).setBackground('#FFF0ED').setFontWeight('bold');
  sh.getRange('A2').setValue('Scegli un nome in B1: la scheda si compone da sola. Per stamparla: File → Stampa.').setFontColor(GRIGIO);
  sh.setColumnWidth(1, 230);
  sh.setColumnWidth(2, 640);
  if (nome) mostraScheda(nome);
  return sh;
}

// Stesse regole dell'app (js/bilancio.js): una competenza dichiarata senza
// esempio resta «da documentare»; «mai» è distinto da «non ancora».
function componiBilancio(d) {
  var b = { soFare: [], daDocumentare: [], hoImparato: [], possoDimostrarlo: [], devoImparare: [], maiAffrontato: [] };
  var esp = Array.isArray(d.esperienze) ? d.esperienze : [];
  var sf = d.sofare || {};
  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }
  function titolo(e) { return e.titolo || 'Esperienza senza titolo'; }

  SITUAZIONI.forEach(function (s) {
    var r = sf[s[0]] || {};
    var collegate = (Array.isArray(r.esperienze) ? r.esperienze : []).map(function (id) {
      return esp.filter(function (e) { return e.id === id; })[0];
    }).filter(Boolean);
    if (DICHIARA[r.livello]) {
      if (pieno(r.esempio) || collegate.length) {
        var testo = LIVELLI_BREVI[r.livello];
        if (pieno(r.esempio)) testo += '\n' + r.esempio.trim();
        if (collegate.length) testo += '\nEsperienze: ' + collegate.map(titolo).join(' · ');
        b.soFare.push([s[1], testo]);
      } else {
        b.daDocumentare.push([s[1], LIVELLI_BREVI[r.livello] + ' — manca un esempio']);
      }
      if (pieno(r.come)) b.hoImparato.push([s[1], r.come.trim()]);
      if (pieno(r.esempio)) b.possoDimostrarlo.push([s[1], r.esempio.trim()]);
    } else if (r.livello === 'non_ancora') {
      b.devoImparare.push([s[1], pieno(r.come) ? r.come.trim() : 'Non lo so ancora fare.']);
    } else if (r.livello === 'mai') {
      b.maiAffrontato.push([s[1], pieno(r.come) ? r.come.trim() : '']);
    }
  });

  esp.forEach(function (e) {
    var fonte = titolo(e) + (QUANDO[e.quando] ? ' · ' + QUANDO[e.quando] : '');
    if (pieno(e.difficolta)) b.hoImparato.push([fonte + ' — difficoltà', e.difficolta.trim()]);
    if (pieno(e.aiuto)) b.hoImparato.push([fonte + ' — aiuto', e.aiuto.trim()]);
    if (pieno(e.prova)) b.possoDimostrarlo.push([fonte, e.prova.trim()]);
  });

  var sg = d.sguardo || {};
  if (pieno(sg.ancora)) b.devoImparare.push(['Uno sguardo critico', sg.ancora.trim()]);
  return b;
}

function righeScheda(d, ricevuto, invii) {
  var p = d.profilo || {};
  var sg = d.sguardo || {};
  var o = d.orientamento || {};
  var b = componiBilancio(d);
  var out = [];
  function aggiungi(stile, a, testo) { out.push({ stile: stile, a: a || '', b: testo || '' }); }
  function sezione(titolo, voci, vuoto) {
    aggiungi('vuota');
    aggiungi('sezione', titolo);
    if (!voci.length && vuoto) aggiungi('nota', '', vuoto);
    voci.forEach(function (v) { aggiungi('voce', v[0], v[1]); });
  }

  aggiungi('titolo', p.nome || 'Senza nome');
  var info = [INDIRIZZI[p.indirizzo] ? 'Indirizzo ' + INDIRIZZI[p.indirizzo] : '', p.classe || ''].filter(Boolean).join(' · ');
  var quando = ricevuto instanceof Date ? 'Inviato il ' + Utilities.formatDate(ricevuto, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '';
  aggiungi('nota', info, quando);
  if (invii > 1) aggiungi('nota', '', 'Ci sono ' + invii + ' invii con questo nome: è mostrato il più recente.');

  sezione('So fare', b.soFare, b.daDocumentare.length ? '' : 'Nessuna voce.');
  if (b.daDocumentare.length) {
    aggiungi('sotto', 'Da documentare');
    b.daDocumentare.forEach(function (v) { aggiungi('voce', v[0], v[1]); });
  }
  sezione('Ho imparato così', b.hoImparato, 'Nessuna voce.');
  sezione('Posso dimostrarlo', b.possoDimostrarlo, 'Nessuna voce.');
  sezione('Devo ancora imparare', b.devoImparare, b.maiAffrontato.length ? '' : 'Nessuna voce.');
  if (b.maiAffrontato.length) {
    aggiungi('sotto', "Non l'ho mai affrontato");
    b.maiAffrontato.forEach(function (v) { aggiungi('voce', v[0], v[1]); });
  }
  sezione('Uno sguardo critico', [
    ['Scuola', sg.scuola || ''], ['Tirocinio', sg.tirocinio || '']
  ].filter(function (v) { return v[1].trim(); }), 'Nessuna voce.');
  sezione("Per l'open day", o.testo && o.testo.trim() ? [['Testo', o.testo.trim()]] : [
    ['Chi sei', o.presentati || ''], ['Esperienza', o.racconto || ''], ['Difficoltà', o.difficile || ''], ['Consiglio', o.consiglio || '']
  ].filter(function (v) { return v[1].trim(); }), 'Nessuna voce.');
  return out;
}

function mostraScheda(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SCHEDA) || costruisciScheda(ss);
  var area = sh.getRange(4, 1, Math.max(sh.getMaxRows() - 3, 1), 2);
  area.clear();
  area.breakApart();
  nome = String(nome || '').trim();
  if (!nome) return;

  var dati = ss.getSheetByName(FOGLIO).getDataRange().getValues();
  var h = dati[0];
  var iNome = h.indexOf('Nome');
  var iRic = h.indexOf('Ricevuto');
  var iJson = h.indexOf('Dati completi (JSON)');
  var trovate = dati.slice(1).filter(function (r) { return String(r[iNome]).trim() === nome; });
  if (!trovate.length) {
    sh.getRange(4, 1).setValue('Nessuno studente con questo nome nel foglio Risposte.');
    return;
  }
  trovate.sort(function (x, y) { return (y[iRic] instanceof Date ? y[iRic].getTime() : 0) - (x[iRic] instanceof Date ? x[iRic].getTime() : 0); });
  var d;
  try { d = JSON.parse(trovate[0][iJson]); } catch (e) {
    sh.getRange(4, 1).setValue('I dati di questo studente non sono leggibili: consulta la sua riga nel foglio Risposte.');
    return;
  }

  var righe = righeScheda(d, trovate[0][iRic], trovate.length);
  var STILI = {
    titolo: { peso: 'bold', dim: 18, colore: '#000000' },
    sezione: { peso: 'bold', dim: 14, colore: '#000000' },
    sotto: { peso: 'bold', dim: 11, colore: '#000000' },
    voce: { peso: 'normal', dim: 11, colore: '#000000' },
    nota: { peso: 'normal', dim: 10, colore: GRIGIO },
    vuota: { peso: 'normal', dim: 6, colore: '#000000' }
  };
  var valori = righe.map(function (r) { return [t(r.a), t(r.b)]; });
  var pesi = righe.map(function (r) { return [STILI[r.stile].peso, 'normal']; });
  var dim = righe.map(function (r) { var x = STILI[r.stile].dim; return [x, r.stile === 'voce' ? 11 : x]; });
  var colori = righe.map(function (r) { return [r.stile === 'voce' ? GRIGIO : STILI[r.stile].colore, STILI[r.stile].colore]; });
  var rng = sh.getRange(4, 1, valori.length, 2);
  rng.setValues(valori).setFontWeights(pesi).setFontSizes(dim).setFontColors(colori)
    .setWrap(true).setVerticalAlignment('top');
  righe.forEach(function (r, i) {
    if (r.stile === 'titolo' || r.stile === 'sezione') sh.getRange(4 + i, 1, 1, 2).merge();
    if (r.stile === 'sezione') sh.getRange(4 + i, 1, 1, 2).setBorder(false, false, true, false, false, false);
  });
}
