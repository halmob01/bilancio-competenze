'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const X = require('../js/docx.js');

const MODELLO = {
  layout: 'originale', carattere: 'moderno', scala: 1, colore: '#000000', titoli: '#666666', logo: null, foto: null,
  nome: 'Sara <Bianchi> & C.', occupazione: 'Tecnico', anagrafica: '', contatti: [{ etichetta: 'Email', valore: 's@e.it' }],
  sezioni: [
    { titolo: 'Profilo', blocchi: [{ t: 'par', runs: [{ t: 'Ciao ', b: false }, { t: 'mondo', b: true }, { t: '\u0001\nriga', b: false }] }] },
    { titolo: 'Esperienze', blocchi: [{ t: 'riga', periodo: '2025', titolo: 'Aiuto', sotto: 'Azienda', runs: [{ t: 'Compiti', b: false }] }] },
    { titolo: 'Competenze', blocchi: [{ t: 'voce', runs: [{ t: 'Reti', b: false }] }] }
  ],
  consenso: '', firma: 'Milano, 03/11/2026 '
};

// Legge i file di un archivio ZIP senza compressione e controlla i CRC.
function leggiZip(byte) {
  const dv = new DataView(byte.buffer, byte.byteOffset, byte.byteLength);
  const file = {};
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const crc = dv.getUint32(p + 14, true);
    const dim = dv.getUint32(p + 18, true);
    const lungNome = dv.getUint16(p + 26, true);
    const nome = Buffer.from(byte.subarray(p + 30, p + 30 + lungNome)).toString('utf8');
    const dati = byte.subarray(p + 30 + lungNome, p + 30 + lungNome + dim);
    assert.equal(zlib.crc32(Buffer.from(dati)) >>> 0, crc, 'CRC di ' + nome);
    file[nome] = dati;
    p += 30 + lungNome + dim;
  }
  assert.equal(dv.getUint32(p, true), 0x02014b50, 'segue la directory centrale');
  return file;
}

test('il file Word è un archivio valido con le parti obbligatorie', () => {
  const byte = X.creaDocx(MODELLO);
  assert.equal(String.fromCharCode(byte[0], byte[1]), 'PK');
  const f = leggiZip(byte);
  ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels'].forEach((n) => assert.ok(f[n], n));
});

test('il testo è protetto: simboli XML escapati, caratteri di controllo tolti, a capo mantenuti', () => {
  const xml = Buffer.from(leggiZip(X.creaDocx(MODELLO))['word/document.xml']).toString('utf8');
  assert.ok(xml.includes('Sara &lt;Bianchi&gt; &amp; C.'));
  assert.ok(!xml.includes('\u0001'));
  assert.ok(xml.includes('<w:br/>'));
  assert.ok(xml.includes('<w:b/>'), 'il grassetto di <strong> arriva nel Word');
  assert.equal(X.crc32(new TextEncoder().encode('123456789')), 0xCBF43926, 'CRC32 di riferimento');
});

test('Europass: logo, foto e tabella delle lingue entrano nel file', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const m = Object.assign({}, MODELLO, {
    layout: 'europass', logo: png, foto: { dati: new Uint8Array([255, 216, 1, 2]), est: 'jpeg' },
    sezioni: [{ titolo: 'Competenze linguistiche', blocchi: [
      { t: 'madre', etichetta: 'Lingua madre:', valore: 'Italiano' },
      { t: 'lingue', righe: [{ lingua: 'Inglese', livelli: ['B1', 'B1', 'A2', 'A2', ''], testo: '' }, { lingua: 'Arabo', livelli: null, testo: 'base' }] }] }]
  });
  const f = leggiZip(X.creaDocx(m));
  assert.deepEqual(Array.from(f['word/media/immagine1.png']), Array.from(png));
  assert.ok(f['word/media/immagine2.jpeg']);
  const xml = Buffer.from(f['word/document.xml']).toString('utf8');
  assert.ok(xml.includes('Comprensione') && xml.includes('Produzione scritta') && xml.includes('B1'));
  assert.ok(xml.includes('<w:gridSpan w:val="5"/>'), 'una lingua senza livelli occupa tutta la riga');
  assert.ok(xml.includes('–'), 'un\'abilità non scelta resta un trattino');
  const rel = Buffer.from(f['word/_rels/document.xml.rels']).toString('utf8');
  assert.ok(rel.includes('media/immagine1.png') && rel.includes('media/immagine2.jpeg'));
});

test('nessuna richiesta di rete nel modulo Word', () => {
  const t = fs.readFileSync(path.join(__dirname, '../js/docx.js'), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML/.test(t));
});
