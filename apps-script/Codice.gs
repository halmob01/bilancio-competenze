/**
 * Bilancio di competenze — ricezione delle risposte in un Foglio Google.
 *
 * Da incollare in Estensioni > Apps Script del foglio del docente e da
 * pubblicare come applicazione web (istruzioni in docs/FOGLIO-GOOGLE.md).
 * Ogni studente occupa una riga, riconosciuta dal codice anonimo che l'app
 * genera sul dispositivo: un nuovo invio aggiorna la riga invece di duplicarla.
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

function foglio() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(FOGLIO) || ss.insertSheet(FOGLIO);
  var h = intestazioni();
  if (sh.getLastRow() === 0) {
    sh.appendRow(h);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(3);
    sh.getRange(1, 1, 1, h.length).setFontWeight('bold');
  }
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
      if (ultima > 1) {
        var codici = sh.getRange(2, 2, ultima - 1, 1).getValues();
        for (var i = 0; i < codici.length; i++) {
          if (codici[i][0] === d.codice) { trovata = i + 2; break; }
        }
      }
      if (trovata > 0) sh.getRange(trovata, 1, 1, valori.length).setValues([valori]);
      else sh.appendRow(valori);
      return risposta({ ok: true, ricevuto: ora.toISOString(), aggiornata: trovata > 0 });
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
