'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../docenti/js/docenti.js');

test('elenco incollato da un foglio: colonne, maiuscole, intestazione, righe scartate', () => {
  const t = 'Cognome\tNome\nROSSI\tMARIO\nde luca\tAnna Maria\n\nD\'ANGELO;Luca\nBianchi, Sara\nSolo\nVerdi Paolo';
  const r = D.parsaElenco(t);
  assert.deepEqual(r.righe, [
    { cognome: 'Rossi', nome: 'Mario' }, { cognome: 'De Luca', nome: 'Anna Maria' }, { cognome: 'D\'Angelo', nome: 'Luca' },
    { cognome: 'Bianchi', nome: 'Sara' }, { cognome: 'Verdi', nome: 'Paolo' }]);
  assert.equal(r.scartate, 1, 'una riga con una parola sola non basta');
  assert.deepEqual(D.parsaElenco('Mario\tRossi', 'nome-cognome').righe, [{ cognome: 'Rossi', nome: 'Mario' }]);
  assert.deepEqual(D.parsaElenco('Rossi Mario De Luca').righe, [{ cognome: 'Rossi', nome: 'Mario De Luca' }], 'con una colonna sola il primo è il cognome');
  assert.deepEqual(D.parsaElenco('').righe, []);
  assert.deepEqual(D.parsaElenco('x\ty'.repeat(40)).righe, [], 'nomi assurdi scartati');
  // Un nome misto non si tocca (potrebbe essere scritto apposta)
  assert.equal(D.capitalizza('McDonald'), 'McDonald');
  assert.equal(D.capitalizza('  anna   maria '), 'Anna Maria');
  assert.equal(D.capitalizza('SANT\'ANGELO-ROSSI'), 'Sant\'Angelo-Rossi');
});

test('gruppi da 60: il server accetta al massimo 60 studenti per volta', () => {
  const lunga = Array.from({ length: 130 }, (_, i) => ({ cognome: 'C' + i, nome: 'N' + i }));
  assert.deepEqual(D.inGruppi(lunga).map((g) => g.length), [60, 60, 10]);
  assert.deepEqual(D.inGruppi([]), []);
});

test('stato, ultimo accesso e dimensioni si leggono in italiano', () => {
  assert.equal(D.statoTesto({ stato: 'in_corso', dettaglio: '3 di 6 sezioni' }), 'In corso (3 di 6 sezioni)');
  assert.equal(D.statoTesto({ stato: 'vuota', dettaglio: '' }), 'Da iniziare');
  assert.equal(D.statoTesto(null), 'Da iniziare');
  const adesso = '2026-11-26T15:00:00';
  assert.equal(D.ultimoAccesso('', adesso), 'Mai');
  assert.equal(D.ultimoAccesso('2026-11-26T08:00:00', adesso), 'Oggi');
  assert.equal(D.ultimoAccesso('2026-11-25T23:50:00', adesso), 'Ieri');
  assert.equal(D.ultimoAccesso('2026-11-21T10:00:00', adesso), '5 giorni fa');
  assert.match(D.ultimoAccesso('2026-10-01T10:00:00', adesso), /1 ottobre/);
  assert.equal(D.formatoByte(0), '0 MB'); assert.equal(D.formatoByte(300 * 1024), '300 KB');
  assert.equal(D.formatoByte(3.5 * 1024 * 1024), '3,5 MB'); assert.equal(D.formatoByte(1.5 * 1024 * 1024 * 1024), '1,5 GB');
  assert.equal(D.annoScolastico('2026-11-26'), '2026/27'); assert.equal(D.annoScolastico('2027-06-10'), '2026/27'); assert.equal(D.annoScolastico('2027-09-01'), '2027/28');
});

test('CSV: punto e virgola, BOM, virgolette, e nessun nome può diventare una formula', () => {
  const r = { classe: { nome: '3ELE', indirizzo: 'elettrico', anno: 3 }, studenti: [
    { cognome: 'Bianchi', nome: 'Sara', attivo: true, ultimoAccesso: '2026-11-26T10:00:00Z', foto: 3, file: 1,
      percorsi: { portfolio: { stato: 'in_corso', dettaglio: '2 attività' }, diario: { stato: 'in_corso', dettaglio: '1 tirocinio, 4 settimane' },
        bilancio: { stato: 'completa', dettaglio: '6 di 6 sezioni' }, curriculum: { stato: 'vuota', dettaglio: '' } } },
    { cognome: '=CMD()', nome: 'Luca; "il Rosso"', attivo: false, ultimoAccesso: '', foto: 0, file: 0,
      percorsi: { portfolio: { stato: 'vuota', dettaglio: '0 attività' }, diario: { stato: 'vuota' }, bilancio: { stato: 'vuota' }, curriculum: { stato: 'vuota' } } }] };
  const c = D.csvRiepilogo(r);
  assert.ok(c.startsWith('﻿Cognome;Nome;Classe'), 'BOM e intestazione');
  const righe = c.trim().split('\r\n');
  assert.equal(righe.length, 3);
  assert.equal(righe[1], 'Bianchi;Sara;3ELE;elettrico;III anno;2 attività;3;1;In corso (1 tirocinio, 4 settimane);Completo (6 di 6 sezioni);Da iniziare;Da iniziare;2026-11-26;sì');
  assert.ok(righe[2].startsWith('\'=CMD();"Luca; ""il Rosso"""'), righe[2]);
  assert.equal(D.nomeFileCsv({ nome: '3ELE' }, '2026-11-26'), 'riepilogo-3ele-2026-11-26.csv');
  assert.equal(D.nomeFileCsv(null, '2026-11-26'), 'riepilogo-classe-2026-11-26.csv');
});

test('la libreria dei QR è quella con licenza MIT, e il QR di un cartellino si costruisce', () => {
  const lic = fs.readFileSync(path.join(__dirname, '../js/LICENSE-qrcode-generator.txt'), 'utf8');
  assert.match(lic, /MIT/); assert.match(lic, /Kazuhiko Arase/);
  const qrcode = require('../js/qrcode.js');
  const q = qrcode(0, 'M');
  q.addData('https://portale.scuola.it/gcatalfamo/#qr=' + 'a'.repeat(32));
  q.make();
  assert.ok(q.getModuleCount() >= 29 && q.getModuleCount() <= 45);
  assert.match(q.createSvgTag({ cellSize: 2, margin: 0 }), /^<svg /);
});

test('competenze: come si dice il livello e il CSV con una colonna per competenza', () => {
  const livelli = [{ id: 'con_aiuto', breve: 'con aiuto', dichiara: true }, { id: 'non_ancora', breve: 'non ancora', dichiara: false }];
  assert.equal(D.livelloTesto({ livello: 'con_aiuto', prova: true }, livelli), 'con aiuto · con prova');
  assert.equal(D.livelloTesto({ livello: 'con_aiuto', prova: false }, livelli), 'con aiuto · senza prova');
  assert.equal(D.livelloTesto({ livello: 'non_ancora', prova: false }, livelli), 'non ancora', 'chi non dichiara non ha bisogno di prove');
  assert.equal(D.livelloTesto({ livello: '' }, livelli), ''); assert.equal(D.livelloTesto(null, livelli), '');
  const dati = { classe: { nome: '3ELE' }, livelli, competenze: [{ id: 'a', semplice: 'Controllare; misurare' }, { id: 'b', semplice: 'Riparare' }],
    studenti: [{ cognome: 'Bianchi', nome: 'Sara', risposte: { a: { livello: 'con_aiuto', prova: true }, b: { livello: '' } } },
      { cognome: '=CMD()', nome: 'Luca', risposte: { a: { livello: 'non_ancora' } } }] };
  const righe = D.csvCompetenze(dati).replace(/\r\n$/, '').split('\r\n');
  assert.equal(righe[0], '﻿Cognome;Nome;Classe;"Controllare; misurare";Riparare');
  assert.equal(righe[1], 'Bianchi;Sara;3ELE;con aiuto · con prova;');
  assert.ok(righe[2].startsWith('\'=CMD();Luca;3ELE;non ancora'), righe[2]);
  assert.equal(D.nomeFileCsv({ nome: '3ELE' }, '2026-11-27', 'competenze'), 'competenze-3ele-2026-11-27.csv');
});
