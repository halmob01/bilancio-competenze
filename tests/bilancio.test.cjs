'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const D = require('../js/dati.js');
const L = require('../js/bilancio.js');

function conEsperienza(stato, campi) {
  const e = Object.assign(L.esperienzaVuota(), campi);
  stato.esperienze.push(e);
  return e;
}

test('sei sezioni, una sola domanda principale per schermata', () => {
  assert.equal(D.SEZIONI.length, 6);
  D.SEZIONI.forEach((s) => assert.ok(s.schermate.length >= 1, s.id));
  assert.deepEqual(D.SEZIONI[2].schermate.map((x) => x.id), ['capire', 'fare', 'collaborare', 'verificare', 'spiegare', 'migliorare']);
});

test('ogni situazione ha un esempio per ciascun indirizzo', () => {
  D.SITUAZIONI.forEach((s) => {
    D.INDIRIZZI.forEach((i) => assert.ok(s.esempi[i.id] && s.esempi[i.id].length > 20, s.id + '/' + i.id));
  });
  D.INDIRIZZI.forEach((i) => assert.ok(D.ESEMPI_ESPERIENZA[i.id], i.id));
});

test('scala di autonomia: «mai affrontato» distinto da «non lo so fare»', () => {
  const ids = D.AUTONOMIA.map((a) => a.id);
  assert.ok(ids.includes('mai'));
  assert.ok(ids.includes('non_ancora'));
  assert.notEqual(D.AUTONOMIA[0].testo, D.AUTONOMIA[1].testo);
  assert.ok(D.AUTONOMIA.every((a) => /[a-z]/.test(a.testo)), 'solo opzioni testuali');
});

test('nessun linguaggio da gamification nei testi', () => {
  const testi = JSON.stringify(D) + fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  ['superpoter', 'livello sbloccato', 'sblocca', 'XP', 'punti esperienza', 'badge', 'complimenti!'].forEach((p) => {
    assert.ok(!testi.toLowerCase().includes(p.toLowerCase()), p);
  });
});

test('una competenza dichiarata senza esempio resta da documentare', () => {
  const s = L.statoVuoto();
  s.sofare.capire.livello = 'autonomo_noto';
  let b = L.componiBilancio(s);
  assert.equal(b.soFare.length, 0);
  assert.equal(b.daDocumentare.length, 1);
  assert.equal(L.statoSezione(s, 'sofare'), 'in_corso');

  s.sofare.capire.esempio = 'Ho letto lo schema del quadro prima di cablarlo.';
  b = L.componiBilancio(s);
  assert.equal(b.soFare.length, 1);
  assert.equal(b.daDocumentare.length, 0);
  assert.equal(b.possoDimostrarlo[0].testo, 'Ho letto lo schema del quadro prima di cablarlo.');
});

test('un\'esperienza collegata vale come esempio', () => {
  const s = L.statoVuoto();
  const e = conEsperienza(s, { titolo: 'Quadro', quando: 'anno3', azione: 'Cablato' });
  s.sofare.fare.livello = 'con_aiuto';
  s.sofare.fare.esperienze = [e.id];
  assert.ok(L.haProva(s, 'fare'));
  assert.deepEqual(L.componiBilancio(s).soFare[0].esperienze, ['Quadro']);
});

test('«non ancora» e «mai» finiscono in parti diverse del bilancio', () => {
  const s = L.statoVuoto();
  s.sofare.verificare.livello = 'non_ancora';
  s.sofare.verificare.come = 'Esercitarmi con il multimetro.';
  s.sofare.spiegare.livello = 'mai';
  s.sguardo.ancora = 'Stimare i tempi.';
  const b = L.componiBilancio(s);
  assert.deepEqual(b.devoImparare.map((x) => x.testo), ['Esercitarmi con il multimetro.', 'Stimare i tempi.']);
  assert.deepEqual(b.maiAffrontato.map((x) => x.situazione), ['Spiegare']);
  assert.equal(b.soFare.length, 0);
  assert.equal(b.hoImparato.length, 0, 'il «come» di chi non lo sa fare non è «ho imparato così»');
});

test('le difficoltà, gli aiuti e le prove delle esperienze entrano nel dossier con rimando', () => {
  const s = L.statoVuoto();
  const e = conEsperienza(s, { titolo: 'Rete', quando: 'tirocinio', azione: 'Configurata', prova: 'Procedura scritta', difficolta: 'I log', aiuto: 'Il tecnico' });
  const b = L.componiBilancio(s);
  assert.equal(b.hoImparato.length, 2);
  assert.equal(b.possoDimostrarlo[0].testo, 'Procedura scritta');
  assert.deepEqual(b.possoDimostrarlo[0].rif, { sezione: 'esperienze', schermata: 'elenco', esperienza: e.id });
});

test('il testo per l\'open day mette in fila le risposte senza riscriverle', () => {
  const s = L.statoVuoto();
  s.orientamento.presentati = '  Sono Sara.  ';
  s.orientamento.consiglio = 'Venite a vedere i laboratori.';
  assert.equal(L.componiOrientamento(s), 'Sono Sara.\n\nVenite a vedere i laboratori.');
  assert.equal(L.componiOrientamento(L.statoVuoto()), '');
});

test('stato delle sezioni', () => {
  const s = L.statoVuoto();
  assert.ok(D.SEZIONI.every((x) => L.statoSezione(s, x.id) === 'vuota'));

  s.profilo.indirizzo = 'estetica';
  s.anni.anno1 = 'a'; s.anni.anno2 = 'b';
  assert.equal(L.statoSezione(s, 'percorso'), 'in_corso');
  s.anni.anno3 = 'c';
  assert.equal(L.statoSezione(s, 'percorso'), 'completa');

  conEsperienza(s, { titolo: 'Uno', quando: 'anno4', azione: 'x' });
  assert.equal(L.statoSezione(s, 'esperienze'), 'in_corso');
  conEsperienza(s, { titolo: 'Due', quando: 'anno2', azione: 'y' });
  assert.equal(L.statoSezione(s, 'esperienze'), 'completa');

  D.SITUAZIONI.forEach((x) => { s.sofare[x.id].livello = 'mai'; });
  assert.equal(L.statoSezione(s, 'sofare'), 'completa');
  assert.equal(L.statoSezione(s, 'bilancio'), 'in_corso');
  Object.keys(s.sguardo).forEach((k) => { s.sguardo[k] = 'risposta'; });
  assert.equal(L.statoSezione(s, 'bilancio'), 'completa');
  assert.equal(L.avanzamento(s).complete, 5);
});

test('normalizza scarta dati estranei, tipi sbagliati e riferimenti orfani', () => {
  const s = L.normalizza({
    profilo: { nome: 42, indirizzo: 'cucina', extra: 'x' },
    anni: { anno1: 'ok', anno9: 'no' },
    esperienze: [{ id: 'a', titolo: 'T', quando: 'anno5', situazioni: ['fare', 'volare'] }, { id: 'a', titolo: 'Doppione' }, null],
    sofare: { capire: { livello: 'esperto', esperienze: ['a', 'zzz'] } },
    orientamento: { testo: '<script>' },
    pericolo: true
  });
  assert.equal(s.profilo.nome, '');
  assert.equal(s.profilo.indirizzo, '');
  assert.equal(s.anni.anno1, 'ok');
  assert.ok(!('anno9' in s.anni));
  assert.equal(s.esperienze.length, 2);
  assert.notEqual(s.esperienze[0].id, s.esperienze[1].id);
  assert.equal(s.esperienze[0].quando, '');
  assert.deepEqual(s.esperienze[0].situazioni, ['fare']);
  assert.equal(s.sofare.capire.livello, '');
  assert.deepEqual(s.sofare.capire.esperienze, ['a']);
  assert.equal(s.orientamento.testo, '<script>', 'il testo resta testo: è l\'interfaccia a non interpretarlo');
  assert.ok(!('pericolo' in s));
  assert.deepEqual(L.normalizza(null), L.statoVuoto());
});

test('andata e ritorno di una copia scaricata', () => {
  const s = L.statoVuoto();
  s.profilo.nome = 'Luca';
  conEsperienza(s, { titolo: 'Quadro', quando: 'anno3', azione: 'Cablato' });
  const r = L.normalizza(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r, s);
});

test('l\'interfaccia non usa innerHTML né servizi remoti', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(app));
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(app));
  assert.ok(!/https?:\/\//.test(html), 'nessuna risorsa esterna: font e script sono locali');
});
