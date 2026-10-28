'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const L = require('../js/bilancio.js');

// ---------- Simulazione dei servizi Apps Script usati da Codice.gs ----------
const MAX_RIGHE = 1000;

function colonnaDaLettere(s) {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function nuovoFoglio(nome) {
  const celle = new Map(); // "r,c" -> valore
  const formati = new Map(); // "r,c" -> { peso }
  const leggi = (r, c) => (celle.has(r + ',' + c) ? celle.get(r + ',' + c) : '');
  const ultima = () => { let m = 0; for (const k of celle.keys()) { const r = +k.split(',')[0]; if (celle.get(k) !== '' && r > m) m = r; } return m; };
  const ultimaColonna = () => { let m = 0; for (const k of celle.keys()) { const c = +k.split(',')[1]; if (celle.get(k) !== '' && c > m) m = c; } return m; };

  function intervallo(r, c, nr, nc) {
    const metodi = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => leggi(r + i, c + j))),
      getValue: () => leggi(r, c),
      setValues: (v) => { v.forEach((riga, i) => riga.forEach((x, j) => celle.set((r + i) + ',' + (c + j), x))); return proxy; },
      setValue: (x) => { celle.set(r + ',' + c, x); return proxy; },
      clear: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { celle.delete((r + i) + ',' + (c + j)); formati.delete((r + i) + ',' + (c + j)); } return proxy; },
      setFontWeights: (p) => { p.forEach((riga, i) => riga.forEach((x, j) => formati.set((r + i) + ',' + (c + j), { peso: x }))); return proxy; },
      getSheet: () => foglio,
      getRow: () => r,
      getColumn: () => c
    };
    const proxy = new Proxy(metodi, { get: (o, k) => (k in o ? o[k] : () => proxy) });
    return proxy;
  }

  const metodi = {
    celle, formati, leggi,
    getName: () => nome,
    getLastRow: ultima,
    getMaxRows: () => MAX_RIGHE,
    appendRow: (riga) => { const r = ultima() + 1; riga.forEach((x, j) => celle.set(r + ',' + (j + 1), x)); },
    clear: () => { celle.clear(); formati.clear(); },
    getDataRange: () => intervallo(1, 1, Math.max(ultima(), 1), Math.max(ultimaColonna(), 1)),
    getRange: (a, b, c, d) => {
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d*))?$/);
        const c1 = colonnaDaLettere(m[1]);
        const r1 = +m[2];
        if (!m[3]) return intervallo(r1, c1, 1, 1);
        return intervallo(r1, c1, m[4] ? +m[4] - r1 + 1 : MAX_RIGHE - r1 + 1, colonnaDaLettere(m[3]) - c1 + 1);
      }
      return intervallo(a, b, c || 1, d || 1);
    }
  };
  const foglio = new Proxy(metodi, { get: (o, k) => (k in o ? o[k] : () => foglio) });
  return foglio;
}

function ambiente() {
  const fogli = {};
  const ss = {
    getSheetByName: (n) => fogli[n] || null,
    insertSheet: (n) => (fogli[n] = nuovoFoglio(n))
  };
  const catena = new Proxy({}, { get: () => () => catena });
  const ctx = {
    fogli,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      newDataValidation: () => catena,
      getUi: () => catena
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ setMimeType() { return this; }, testo: t })
    },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' ') },
    Session: { getScriptTimeZone: () => 'Europe/Rome' }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Codice.gs'), 'utf8'), ctx);
  ctx.invia = (oggetto) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(oggetto) } }).testo);
  ctx.righe = () => {
    const f = fogli.Risposte;
    const n = f.getLastRow();
    return f.getRange(1, 1, n, ctx.intestazioni().length).getValues();
  };
  return ctx;
}

// Valutatore minimo delle formule generate per il riepilogo.
function dividiArgomenti(s) {
  const out = []; let liv = 0; let virg = false; let cur = '';
  for (const ch of s) {
    if (ch === '"') virg = !virg;
    if (!virg && ch === '(') liv++;
    if (!virg && ch === ')') liv--;
    if (!virg && liv === 0 && ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

function valuta(formula, riep, risposte) {
  const b3 = String(riep.leggi(3, 2));
  let m = formula.match(/^=IF\(\$B\$3="",(COUNTIFS\(.*\)),(COUNTIFS\(.*\))\)$/);
  if (m) {
    const scelta = b3 === '' ? m[1] : m[2];
    const arg = dividiArgomenti(scelta.slice('COUNTIFS('.length, -1));
    let n = 0;
    for (let r = 2; r <= risposte.getLastRow(); r++) {
      let ok = true;
      for (let i = 0; i < arg.length; i += 2) {
        const col = colonnaDaLettere(arg[i].match(/!\$([A-Z]+)\$2/)[1]);
        const v = String(risposte.leggi(r, col));
        const crit = arg[i + 1] === '$B$3' ? b3 : JSON.parse(arg[i + 1]);
        if (crit === '<>' ? v === '' : v !== crit) ok = false;
      }
      if (ok) n++;
    }
    return n;
  }
  m = formula.match(/^=\$B\$(\d+)-SUM\(B(\d+):F\2\)$/);
  if (m) {
    let somma = 0;
    for (let c = 2; c <= 6; c++) somma += valuta(riep.leggi(+m[2], c), riep, risposte);
    return valuta(riep.leggi(+m[1], 2), riep, risposte) - somma;
  }
  return formula;
}

function statoCompilato(nome, indirizzo, classe) {
  const s = L.statoVuoto();
  s.profilo = { nome: nome || 'Sara Bianchi', classe: classe || '4B', indirizzo: indirizzo || 'informatica' };
  const e = Object.assign(L.esperienzaVuota(), { titolo: 'Rete ufficio', quando: 'tirocinio', azione: 'Configurato stampanti', prova: 'Procedura', difficolta: 'I log' });
  s.esperienze.push(e);
  s.sofare.capire = { livello: 'autonomo_noto', esempio: 'Ho capito il guasto.', esperienze: [e.id], come: 'Con il tutor.' };
  s.sofare.fare = { livello: 'con_aiuto', esempio: '', esperienze: [], come: '' };
  s.sofare.verificare = { livello: 'non_ancora', esempio: '', esperienze: [], come: 'Più prove guidate.' };
  s.sofare.spiegare = { livello: 'mai', esempio: '', esperienze: [], come: '' };
  s.sguardo.scuola = 'Il laboratorio.';
  s.orientamento.testo = '=SOMMA(A1)';
  return s;
}

// ---------- Foglio Risposte ----------
test('il primo invio crea intestazione e riga', () => {
  const g = ambiente();
  const esito = g.invia(statoCompilato());
  assert.equal(esito.ok, true);
  const righe = g.righe();
  assert.equal(righe.length, 2);
  const [h, r] = righe;
  const col = (nome) => r[h.indexOf(nome)];
  assert.equal(col('Nome'), 'Sara Bianchi');
  assert.equal(col('Indirizzo'), 'Informatica');
  assert.equal(col('N. esperienze'), 1);
  assert.match(col('Esperienze'), /Rete ufficio \(Tirocinio\)/);
  assert.equal(col('Capire — livello'), 'In autonomia, situazioni note');
  assert.match(col('Capire — esempio'), /Esperienze collegate: Rete ufficio/);
  assert.equal(col('Testo open day'), '\'=SOMMA(A1)', 'nessuna formula eseguita');
  assert.equal(JSON.parse(col('Dati completi (JSON)')).profilo.nome, 'Sara Bianchi');
});

test('un nuovo invio dello stesso studente aggiorna la riga', () => {
  const g = ambiente();
  const s = statoCompilato();
  g.invia(s);
  s.sguardo.ancora = 'Stimare i tempi.';
  const esito = g.invia(s);
  assert.equal(esito.aggiornata, true);
  const righe = g.righe();
  assert.equal(righe.length, 2);
  assert.equal(righe[1][righe[0].indexOf('Devo ancora imparare')], 'Stimare i tempi.');
  g.invia(statoCompilato('Altro Studente'));
  assert.equal(g.righe().length, 3, 'un altro studente ha una riga sua');
});

test('rifiuta invii senza nome o malformati', () => {
  const g = ambiente();
  const s = statoCompilato();
  s.profilo.nome = '  ';
  assert.deepEqual(g.invia(s), { ok: false, errore: 'nome' });
  assert.equal(g.invia({ versione: 2 }).errore, 'formato');
  assert.equal(JSON.parse(g.doPost({ postData: { contents: '{non json' } }).testo).ok, false);
  assert.equal(g.fogli.Risposte, undefined);
});

// ---------- Riepilogo ----------
test('il riepilogo conta i livelli per situazione, indirizzo e classe', () => {
  const g = ambiente();
  g.invia(statoCompilato('A', 'informatica', '4B'));
  g.invia(statoCompilato('B', 'informatica', '4C'));
  const c = statoCompilato('C', 'elettrico', '4B');
  c.sofare.capire.livello = 'mai';
  g.invia(c);
  const riep = g.fogli.Riepilogo;
  const ris = g.fogli.Risposte;
  assert.ok(riep, 'creato al primo invio');
  assert.ok(g.fogli['Scheda studente'], 'scheda creata al primo invio');

  function tabella(gruppo) {
    let r = 1;
    while (riep.leggi(r, 1) !== gruppo) r++;
    const out = { studenti: valuta(riep.leggi(r, 2), riep, ris), righe: {} };
    const intest = [2, 3, 4, 5, 6, 7].map((col) => riep.leggi(r + 1, col));
    for (let i = 0; i < 6; i++) {
      const riga = {};
      intest.forEach((nome, j) => { riga[nome] = valuta(riep.leggi(r + 2 + i, j + 2), riep, ris); });
      out.righe[riep.leggi(r + 2 + i, 1)] = riga;
    }
    return out;
  }

  let tutti = tabella('Tutti gli indirizzi');
  assert.equal(tutti.studenti, 3);
  assert.equal(tutti.righe.Capire['In autonomia, situazioni note'], 2);
  assert.equal(tutti.righe.Capire["Non l'ho mai affrontato"], 1);
  assert.equal(tutti.righe.Verificare['Non lo so ancora fare'], 3);
  assert.equal(tutti.righe.Collaborare['Senza risposta'], 3);
  assert.equal(tutti.righe.Capire['Senza risposta'], 0);

  const info = tabella('Informatica');
  assert.equal(info.studenti, 2);
  assert.equal(info.righe.Capire["Non l'ho mai affrontato"], 0);
  assert.equal(tabella('Estetica').studenti, 0);

  riep.getRange('B3').setValue('4B');
  tutti = tabella('Tutti gli indirizzi');
  assert.equal(tutti.studenti, 2, 'filtro per classe');
  assert.equal(tabella('Informatica').studenti, 1);

  g.costruisciRiepilogo(g.SpreadsheetApp.getActiveSpreadsheet());
  assert.equal(riep.leggi(3, 2), '4B', 'ricreare il riepilogo conserva il filtro');
});

// ---------- Scheda studente ----------
function testoScheda(g) {
  const sh = g.fogli['Scheda studente'];
  const out = [];
  for (let r = 4; r <= sh.getLastRow(); r++) out.push([sh.leggi(r, 1), sh.leggi(r, 2)]);
  return out;
}

test('la scheda compone il bilancio dello studente scelto', () => {
  const g = ambiente();
  g.invia(statoCompilato('Sara Bianchi'));
  g.invia(statoCompilato('Luca Rossi', 'elettrico'));
  const sh = g.fogli['Scheda studente'];
  sh.getRange('B1').setValue('Sara Bianchi');
  g.onEdit({ range: sh.getRange('B1') });
  const righe = testoScheda(g);
  const prima = righe.map((r) => r[0]);
  assert.equal(righe[0][0], 'Sara Bianchi');
  assert.match(righe[1][0], /Indirizzo Informatica · 4B/);
  ['So fare', 'Da documentare', 'Ho imparato così', 'Posso dimostrarlo', 'Devo ancora imparare', "Non l'ho mai affrontato", 'Uno sguardo critico', "Per l'open day"]
    .forEach((s) => assert.ok(prima.includes(s), s));
  const trova = (a) => righe.find((r) => r[0] === a);
  assert.match(trova('Capire')[1], /in autonomia, in situazioni note\nHo capito il guasto\.\nEsperienze: Rete ufficio/);
  assert.match(trova('Fare')[1], /manca un esempio/);
  assert.equal(trova('Verificare')[1], 'Più prove guidate.');
  assert.equal(trova('Testo')[1], '\'=SOMMA(A1)', 'il testo non diventa formula');
  assert.equal(sh.formati.get('4,1').peso, 'bold', 'nome in grassetto');

  sh.getRange('B1').setValue('Luca Rossi');
  g.onEdit({ range: sh.getRange('B1') });
  const dopo = testoScheda(g);
  assert.equal(dopo[0][0], 'Luca Rossi');
  assert.ok(!dopo.some((r) => r[0] === 'Sara Bianchi'), 'la scheda precedente è cancellata');
});

test('la scheda segnala nomi assenti e invii doppi', () => {
  const g = ambiente();
  g.invia(statoCompilato('Sara Bianchi'));
  g.invia(statoCompilato('Sara Bianchi')); // altro dispositivo, altro codice
  g.mostraScheda('Sara Bianchi');
  assert.ok(testoScheda(g).some((r) => /2 invii con questo nome/.test(r[1])));
  g.mostraScheda('Nessuno');
  assert.match(testoScheda(g)[0][0], /Nessuno studente/);
  g.mostraScheda('');
  assert.equal(testoScheda(g).length, 0);
});

test('modifiche sulle altre celle o fogli non ridisegnano la scheda', () => {
  const g = ambiente();
  g.invia(statoCompilato());
  const ris = g.fogli.Risposte;
  assert.doesNotThrow(() => g.onEdit({ range: ris.getRange('B1') }));
  assert.doesNotThrow(() => g.onEdit({}));
});
