'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../server/cestino.js');

const testoLungo = 'Ho cablato un quadro con due differenziali.';

test('si trovano le voci tolte, anche dentro un tirocinio che resta; le schede vuote no', () => {
  const prima = { aggiornato: 'x', tirocini: [
    { id: 't1', azienda: 'Elettro Rossi', settimane: [{ id: 's1', fatto: testoLungo, dal: '2026-03-02' }, { id: 's2', fatto: 'Seconda settimana di lavoro.' }] },
    { id: 't2', azienda: 'Altra ditta srl', settimane: [{ id: 's3', fatto: 'Una settimana da perdere.' }] }],
    attivita: [{ id: 'a1', fatto: '', luogo: 'scuola', foto: [], file: [] }, { id: 'a2', fatto: testoLungo, foto: ['fabc12345'], file: [{ id: 'dabc12345', nome: 'x.dwg', byte: 3 }] }],
    cv: { lingueElenco: [{ id: 'l1', nome: 'Inglese', livelli: { parlato: 'B1' } }] } };
  const dopo = { aggiornato: 'y', tirocini: [{ id: 't1', azienda: 'Elettro Rossi', settimane: [{ id: 's2', fatto: 'Seconda settimana di lavoro.' }] }],
    attivita: [], cv: { lingueElenco: [] } };
  const r = C.vociTolte(prima, dopo);
  assert.deepEqual(r.map((x) => x.percorso.join('/') + ':' + x.voce.id), ['tirocini/@t1/settimane:s1', 'tirocini:t2', 'attivita:a2', 'cv/lingueElenco:l1'],
    'la scheda vuota a1 non conta; le settimane di t2 viaggiano dentro t2');
  assert.equal(C.vociTolte(prima, prima).length, 0);
  assert.equal(C.vociTolte(null, dopo).length, 0);
});

test('titolo, genere, riferimenti a foto e file', () => {
  assert.equal(C.titoloDi({ id: 'a', fatto: '  Ho   cablato un quadro  ' }), 'Ho cablato un quadro');
  assert.equal(C.titoloDi({ id: 'a', fatto: 'x'.repeat(200) }).length, 70);
  assert.equal(C.titoloDi({ id: 's', dal: '2026-03-02' }), 'dal 2026-03-02');
  assert.equal(C.titoloDi({ id: 'z' }), '');
  assert.equal(C.genereDi(['tirocini', '@t1', 'settimane']), 'settimane');
  assert.deepEqual(C.riferimenti({ id: 'a', foto: ['f1', 'f2'], file: [{ id: 'd1' }], figli: [{ foto: ['f3'] }] }), { foto: ['f1', 'f2', 'f3'], file: ['d1'] });
});

test('si rimette la voce al suo posto; se il posto non c\'è più lo si dice; due volte non raddoppia', () => {
  const doc = { tirocini: [{ id: 't1', settimane: [] }], attivita: [] };
  const voce = { id: 's1', fatto: testoLungo };
  const r1 = C.rimetti(doc, ['tirocini', '@t1', 'settimane'], voce);
  assert.deepEqual(r1.dati.tirocini[0].settimane, [voce]);
  assert.deepEqual(doc.tirocini[0].settimane, [], 'il documento di partenza non si tocca');
  assert.equal(C.rimetti(r1.dati, ['tirocini', '@t1', 'settimane'], voce).gia, true);
  assert.equal(C.rimetti(doc, ['tirocini', '@t9', 'settimane'], voce).errore, 'contenitore');
  assert.deepEqual(C.rimetti({ attivita: [] }, ['attivita'], { id: 'a1' }).dati.attivita, [{ id: 'a1' }]);
  assert.deepEqual(C.rimetti({ cv: {} }, ['cv', 'lingueElenco'], { id: 'l1' }).dati.cv.lingueElenco, [{ id: 'l1' }]);
});
