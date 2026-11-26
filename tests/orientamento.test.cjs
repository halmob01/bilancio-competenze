'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const O = require('../orientamento/js/orientamento.js');
const B = require('../js/bilancio.js');

test('lo stato si ripulisce: chiavi sconosciute, strade non valide, tetti', () => {
  const s = O.normalizza({ versione: 1, extra: 'x', profilo: { indirizzo: 'elettrico', anno: 'anno9' }, uscita: {
    piace: 'x'.repeat(5000), imparare: 7, attivita: ['a12345', 'a12345', 'sbagliato', 'a22222', 'a33333', 'a44444'],
    strade: [{ id: 'lavoro', perche: 'soldi' }, { id: 'lavoro', perche: 'doppia' }, { id: 'inventata' }, { id: 'its' }, { id: 'quinto' }],
    passi: [{ id: 'p1', cosa: 'Chiedere', entro: '2027-02-30x' }, { cosa: 'b' }, { cosa: 'c' }, { cosa: 'd' }] } });
  assert.deepEqual(s.profilo, { indirizzo: 'elettrico', anno: '' });
  assert.equal(s.uscita.piace.length, 2000); assert.equal(s.uscita.imparare, '');
  assert.deepEqual(s.uscita.attivita, ['a12345', 'a22222', 'a33333']);
  assert.deepEqual(s.uscita.strade.map((x) => x.id), ['lavoro', 'its'], 'max 2, nessun doppione, solo strade vere');
  assert.equal(s.uscita.passi.length, 3); assert.equal(s.uscita.passi[0].entro, '');
  assert.ok(s.uscita.passi.every((p) => p.id), 'ogni passo ha un id (serve all\'unione e al cestino)');
  assert.deepEqual(O.normalizza(null), O.statoVuoto());
  assert.deepEqual(O.normalizza(JSON.parse(JSON.stringify(s))), O.normalizza(s), 'normalizzare due volte non cambia niente');
});

test('la mappa dipende dal percorso: 3+1 oppure quattro anni (solo Informatica I e II nel 2026/27)', () => {
  assert.equal(O.eQuadriennale({ indirizzo: 'informatica', anno: 'anno1' }), true);
  assert.equal(O.eQuadriennale({ indirizzo: 'informatica', anno: 'anno2' }), true);
  assert.equal(O.eQuadriennale({ indirizzo: 'informatica', anno: 'anno3' }), false);
  assert.equal(O.eQuadriennale({ indirizzo: 'elettrico', anno: 'anno1' }), false);
  const classico = O.mappa({ indirizzo: 'elettrico', anno: 'anno3' });
  assert.deepEqual(classico.map((t) => t.id), ['anno1', 'anno2', 'qualifica', 'diploma', 'maturita']);
  assert.deepEqual(classico.filter((t) => t.qui).map((t) => t.id), ['qualifica'], 'una sola tappa è «Sei qui»');
  assert.deepEqual(classico.find((t) => t.id === 'qualifica').cambi, ['quarto', 'lavoro', 'apprendistato', 'scuola']);
  const quad = O.mappa({ indirizzo: 'informatica', anno: 'anno2' });
  assert.deepEqual(quad.map((t) => t.id), ['anni', 'diploma', 'maturita']);
  assert.ok(quad[0].qui);
  assert.ok(!quad.some((t) => t.cambi.indexOf('quarto') !== -1), 'chi fa quattro anni non ha «il quarto anno» come scelta');
  // Ogni strada citata nella mappa esiste
  [classico, quad].forEach((m) => m.forEach((t) => t.cambi.forEach((id) => assert.ok(O.strada(id), id))));
});

test('le note non promettono scorciatoie a chi non è nella filiera, e le strade cambiano con l\'anno', () => {
  assert.ok(!O.note({ indirizzo: 'elettrico', anno: 'anno3' }).some((n) => n.id === 'riforma'));
  const r = O.note({ indirizzo: 'informatica', anno: 'anno1' }).find((n) => n.id === 'riforma');
  assert.ok(r && /Chiedi al docente/.test(r.testo) && /A certe condizioni/.test(r.testo), 'la riforma è condizionata e rimanda al docente');
  assert.deepEqual(O.stradeDisponibili({ indirizzo: 'elettrico', anno: 'anno2' }).map((x) => x.id), ['quarto', 'lavoro', 'apprendistato', 'scuola', 'nonso']);
  assert.deepEqual(O.stradeDisponibili({ indirizzo: 'estetica', anno: 'anno4' }).map((x) => x.id), ['lavoro', 'apprendistato', 'ifts', 'its', 'quinto', 'scuola', 'nonso']);
  assert.ok(O.stradeDisponibili({}).length === O.STRADE.length, 'senza profilo si mostrano tutte');
});

test('avanzamento: stessa forma di bilancio e curriculum', () => {
  assert.deepEqual(O.avanzamento(null), { stati: ['vuota', 'vuota', 'vuota', 'vuota', 'vuota', 'vuota'], complete: 0, totale: 6 });
  const s = O.statoVuoto();
  s.profilo = { indirizzo: 'elettrico', anno: 'anno3' };
  s.uscita.piace = 'Mi piacciono i quadri'; s.uscita.attivita = ['a12345'];
  s.uscita.imparare = 'Gli schemi';
  s.uscita.strade = [{ id: 'quarto', perche: 'Voglio il diploma' }];
  s.uscita.passi = [{ id: 'p1', cosa: 'Chiedere al docente', con: '', entro: '' }];
  const a = O.avanzamento(s);
  assert.deepEqual([a.complete, a.totale], [6, 6]);
  s.uscita.strade = [{ id: 'nonso', perche: '' }];
  assert.equal(O.statoPasso(s, 'dove'), 'completa', '«Non lo so ancora» è una risposta valida');
  s.uscita.strade = [{ id: 'its', perche: '' }];
  assert.equal(O.statoPasso(s, 'dove'), 'in_corso');
});

test('il promemoria legge il bilancio senza modificarlo', () => {
  assert.deepEqual(O.promemoria(null, B), { soFare: [], devoImparare: [] });
  const b = B.statoVuoto();
  b.sofare.capire = { livello: 'solo', esempio: 'Leggo uno schema.', esperienze: [], come: '' };
  const copia = JSON.stringify(b);
  const pm = O.promemoria(b, B);
  assert.equal(JSON.stringify(b), copia);
  assert.ok(Array.isArray(pm.soFare) && Array.isArray(pm.devoImparare));
});

test('i testi della mappa sono corti e senza emoji (per chi legge con fatica)', () => {
  const testi = [].concat(O.STRADE.map((s) => s.testo), O.mappa({ indirizzo: 'elettrico', anno: 'anno1' }).map((t) => t.testo), O.mappa({ indirizzo: 'informatica', anno: 'anno1' }).map((t) => t.testo),
    O.note({ indirizzo: 'informatica', anno: 'anno1' }).map((n) => n.testo));
  testi.forEach((t) => {
    assert.ok(t.length <= 220, 'troppo lungo: ' + t);
    assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t), 'emoji: ' + t);
  });
});

test('la pagina carica gli script giusti e i fatti sulla filiera hanno un documento con le fonti', () => {
  const f = fs.readFileSync(path.join(__dirname, '../docs/FILIERA.md'), 'utf8');
  assert.match(f, /legge 8 agosto 2024, n\. 121|Legge 8 agosto 2024, n\. 121/);
  assert.match(f, /Da verificare/);
});
