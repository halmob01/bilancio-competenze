'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const L = require('../js/bilancio.js');

// Simulazione minima dei servizi Apps Script usati da Codice.gs.
function ambiente() {
  const righe = [];
  const sh = {
    getLastRow: () => righe.length,
    appendRow: (r) => { righe.push(r.slice()); },
    setFrozenRows() {}, setFrozenColumns() {},
    getRange: (riga, col, nRighe, nCol) => ({
      setFontWeight() {},
      getValues: () => righe.slice(riga - 1, riga - 1 + nRighe).map((r) => r.slice(col - 1, col - 1 + nCol)),
      setValues: (v) => { righe[riga - 1] = v[0].slice(); }
    })
  };
  const ctx = {
    righe,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sh, insertSheet: () => sh }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ setMimeType() { return this; }, testo: t })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Codice.gs'), 'utf8'), ctx);
  ctx.invia = (oggetto) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(oggetto) } }).testo);
  return ctx;
}

function statoCompilato() {
  const s = L.statoVuoto();
  s.profilo = { nome: 'Sara Bianchi', classe: '4B', indirizzo: 'informatica' };
  const e = Object.assign(L.esperienzaVuota(), { titolo: 'Rete ufficio', quando: 'tirocinio', azione: 'Configurato stampanti', prova: 'Procedura' });
  s.esperienze.push(e);
  s.sofare.capire = { livello: 'autonomo_noto', esempio: 'Ho capito il guasto.', esperienze: [e.id], come: 'Con il tutor.' };
  s.orientamento.testo = '=SOMMA(A1)';
  return s;
}

test('il primo invio crea intestazione e riga', () => {
  const g = ambiente();
  const esito = g.invia(statoCompilato());
  assert.equal(esito.ok, true);
  assert.equal(g.righe.length, 2);
  const h = g.righe[0];
  const r = g.righe[1];
  assert.equal(h.length, r.length);
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
  assert.equal(g.righe.length, 2);
  assert.equal(g.righe[1][g.righe[0].indexOf('Devo ancora imparare')], 'Stimare i tempi.');
  g.invia(L.normalizza(Object.assign(statoCompilato(), { codice: undefined })));
  assert.equal(g.righe.length, 3, 'un altro studente ha una riga sua');
});

test('rifiuta invii senza nome o malformati', () => {
  const g = ambiente();
  const s = statoCompilato();
  s.profilo.nome = '  ';
  assert.deepEqual(g.invia(s), { ok: false, errore: 'nome' });
  assert.equal(g.invia({ versione: 2 }).errore, 'formato');
  assert.equal(JSON.parse(g.doPost({ postData: { contents: '{non json' } }).testo).ok, false);
  assert.equal(g.righe.length, 0);
});
