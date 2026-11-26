'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/unione.js');
const D = require('../diario/js/diario.js');
const A = require('../portfolio/js/attivita.js');

const copia = (x) => JSON.parse(JSON.stringify(x));

function diario() {
  const s = D.statoVuoto();
  const t = Object.assign(D.tirocinioVuoto(), { id: 't1', azienda: 'Elettro Rossi' });
  t.settimane.push(Object.assign(D.settimanaVuota('2026-03-02'), { id: 's1', fatto: 'Ho tirato i cavi.' }));
  s.tirocini.push(t); s.corrente = 't1';
  return s;
}

test('cambiamenti in voci diverse si uniscono senza domande', () => {
  const base = diario();
  const locale = copia(base); const server = copia(base);
  locale.tirocini[0].settimane[0].imparato = 'A leggere lo schema.';           // qui
  server.tirocini[0].settimane.push(Object.assign(D.settimanaVuota('2026-03-09'), { id: 's2', fatto: 'Ho montato le prese.' })); // altrove
  server.tirocini[0].citta = 'Rozzano';
  const r = U.unisci(base, locale, server);
  assert.deepEqual(r.conflitti, []);
  assert.equal(r.dati.tirocini[0].settimane[0].imparato, 'A leggere lo schema.');
  assert.equal(r.dati.tirocini[0].citta, 'Rozzano');
  assert.deepEqual(r.dati.tirocini[0].settimane.map((w) => w.id), ['s1', 's2']);
  assert.deepEqual(D.normalizza(r.dati), r.dati, 'il risultato è un diario valido');
});

test('la stessa voce cambiata dalle due parti è un conflitto: vince la parte scelta', () => {
  const base = diario();
  const locale = copia(base); const server = copia(base);
  locale.tirocini[0].settimane[0].fatto = 'Ho tirato i cavi nel corridoio.';
  server.tirocini[0].settimane[0].fatto = 'Ho tirato i cavi in cucina.';
  locale.tirocini[0].azienda = 'Elettro Rossi srl'; // solo qui: non è un conflitto
  const r = U.unisci(base, locale, server);
  assert.deepEqual(r.conflitti, ['tirocini[t1].settimane[s1].fatto']);
  assert.equal(r.dati.tirocini[0].settimane[0].fatto, 'Ho tirato i cavi nel corridoio.');
  assert.equal(r.dati.tirocini[0].azienda, 'Elettro Rossi srl');
  const s = U.unisci(base, locale, server, 'server');
  assert.equal(s.dati.tirocini[0].settimane[0].fatto, 'Ho tirato i cavi in cucina.');
  assert.equal(s.dati.tirocini[0].azienda, 'Elettro Rossi srl', 'la preferenza vale solo per i conflitti');
});

test('una voce cancellata da una parte e cambiata dall\'altra non si perde; cancellata e intatta sparisce', () => {
  const base = A.statoVuoto();
  base.attivita.push(Object.assign(A.attivitaVuota('2026-03-01'), { id: 'a1', fatto: 'Uno' }));
  base.attivita.push(Object.assign(A.attivitaVuota('2026-03-02'), { id: 'a2', fatto: 'Due' }));
  const locale = copia(base); const server = copia(base);
  locale.attivita = locale.attivita.filter((a) => a.id !== 'a1');    // tolta qui, intatta sul server: sparisce
  server.attivita = server.attivita.filter((a) => a.id !== 'a2');    // tolta sul server…
  locale.attivita.find((a) => a.id === 'a2').fatto = 'Due, corretta'; // …ma cambiata qui: resta
  const r = U.unisci(base, locale, server);
  assert.deepEqual(r.dati.attivita.map((a) => [a.id, a.fatto]), [['a2', 'Due, corretta']]);
  assert.deepEqual(r.conflitti, []);
});

test('«aggiornato» non è un conflitto e senza versione comune si uniscono le voci nuove', () => {
  const l = { aggiornato: '2026-11-26T10:00:00Z', attivita: [{ id: 'a1', fatto: 'Qui' }] };
  const s = { aggiornato: '2026-11-26T11:00:00Z', attivita: [{ id: 'a2', fatto: 'Là' }] };
  const r = U.unisci(undefined, l, s);
  assert.equal(r.dati.aggiornato, '2026-11-26T11:00:00Z');
  assert.deepEqual(r.dati.attivita.map((a) => a.id), ['a1', 'a2']);
  assert.deepEqual(r.conflitti, []);
  assert.deepEqual(U.unisci({ x: 1 }, { x: 1 }, { x: 1 }).dati, { x: 1 });
});
