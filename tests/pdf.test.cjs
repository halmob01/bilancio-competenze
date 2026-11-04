'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../js/pdf.js');

const carica = (n) => new Uint8Array(fs.readFileSync(path.join(__dirname, '../fonts/ttf', n + '.ttf')));
const CARATTERI = { f: carica('firasans-regular'), fs: carica('firasans-semibold'), d: carica('anton-regular') };

function modello(extra) {
  return Object.assign({
    layout: 'originale', carattere: 'moderno', scala: 1, colore: '#000000', titoli: '#666666', logo: null, foto: null,
    nome: 'Sara Bianchi', occupazione: 'Tecnico', anagrafica: '', contatti: [{ etichetta: 'Email', valore: 's@e.it' }],
    sezioni: [{ titolo: 'Profilo', blocchi: [{ t: 'par', runs: [{ t: 'Ciao ', b: false }, { t: 'mondo àèìòù', b: true }] }] }],
    consenso: '', firma: null
  }, extra || {});
}

const testoDi = (b) => Buffer.from(b).toString('latin1');

test('i caratteri incorporati si leggono: metriche e mappa dei glifi', () => {
  const f = P.leggiFont(CARATTERI.f);
  assert.equal(f.upm, 1000);
  assert.ok(f.glifo(65) > 0 && f.glifo(0xE0) > 0, 'A e à ci sono');
  assert.equal(f.glifo(0x4E2D), 0, 'un ideogramma non è nel sottoinsieme');
  assert.ok(f.adv(f.glifo(77)) > f.adv(f.glifo(105)), 'M più larga di i');
  assert.ok(f.asc > 0.8 && f.disc > 0.1);
});

test('il PDF è ben formato: intestazione, tabella dei riferimenti coerente, caratteri incorporati', async () => {
  const byte = await P.creaPdf(modello(), CARATTERI, {});
  const t = testoDi(byte);
  assert.ok(t.startsWith('%PDF-1.'));
  assert.ok(t.trimEnd().endsWith('%%EOF'));
  const inizio = Number(/startxref\n(\d+)/.exec(t)[1]);
  assert.ok(t.slice(inizio).startsWith('xref'));
  const n = Number(/xref\n0 (\d+)/.exec(t.slice(inizio))[1]);
  const voci = t.slice(inizio).split('\n').slice(2, 2 + n);
  voci.slice(1).forEach((v, i) => {
    const scarto = Number(v.slice(0, 10));
    assert.ok(t.slice(scarto).startsWith((i + 1) + ' 0 obj'), 'oggetto ' + (i + 1));
  });
  assert.ok(t.includes('/Type /Catalog') && t.includes('/FontFile2') && t.includes('/ToUnicode'));
  assert.ok(!/fetch|http:\/\/|https:\/\//.test(t.replace(/http:\/\/www\.w3\.org[^\s]*/g, '')), 'nessun collegamento esterno');
});

test('un curriculum lungo va su più pagine e ogni pagina ha il suo contenuto', async () => {
  const lungo = Array.from({ length: 120 }, (_, i) => ({ t: 'voce', runs: [{ t: 'Competenza numero ' + i + ' con un testo abbastanza lungo da occupare spazio.', b: false }] }));
  const byte = await P.creaPdf(modello({ sezioni: [{ titolo: 'Competenze', blocchi: lungo }] }), CARATTERI, {});
  const pagine = (testoDi(byte).match(/\/Type \/Page /g) || []).length;
  assert.ok(pagine >= 3, 'pagine: ' + pagine);
});

test('la foto JPEG entra nel file così com\'è e se ne leggono le dimensioni', async () => {
  // JPEG minimo con un blocco SOF0 da 3 x 2 punti
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9]);
  assert.deepEqual(P.dimensioniJpeg(jpeg), { w: 3, h: 2 });
  const byte = await P.creaPdf(modello({ foto: { dati: jpeg, est: 'jpeg' } }), CARATTERI, {});
  const t = testoDi(byte);
  assert.ok(t.includes('/Filter /DCTDecode') && t.includes('/Width 3 /Height 2'));
});

test('nessuna richiesta di rete nel modulo PDF', () => {
  const t = fs.readFileSync(path.join(__dirname, '../js/pdf.js'), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML/.test(t));
});

test('i caratteri del sito sono tutti presenti e con licenza', () => {
  ['firasans-regular', 'firasans-semibold', 'firasans-bold', 'anton-regular', 'ebgaramond-regular', 'ebgaramond-italic', 'liberationsans-regular', 'liberationsans-bold']
    .forEach((n) => assert.ok(fs.existsSync(path.join(__dirname, '../fonts/ttf', n + '.ttf')), n));
  ['fira-sans', 'anton', 'eb-garamond'].forEach((n) => assert.ok(fs.existsSync(path.join(__dirname, '../fonts/LICENSE-' + n + '.txt')), n));
});
