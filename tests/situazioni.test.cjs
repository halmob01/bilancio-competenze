'use strict';
// Motore delle situazioni (js/situazioni.js) e prima mappa: SST-ICT-05 (Informatica).
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/situazioni.js');
const MAPPA = require('../js/contenuti/sst-ict-05.js');
const C = require('../js/competenze.js');
const { valuta, riepilogo } = require('../strumenti/prova-mappa.cjs');
const FRASI = require('./dati/frasi-informatica.json');

test('la mappa SST-ICT-05 è completa: fonte, dimensioni, situazioni, competenze del catalogo, lessico', () => {
  assert.deepEqual(S.verificaMappa(MAPPA, C), []);
  assert.equal(MAPPA.eqf, 3);
  assert.deepEqual(MAPPA.fonte.ada, ['ADA.16.239.782']);
  assert.deepEqual(MAPPA.dimensioni.map((d) => d.numero), [1, 2, 3, 4]);
  // Le situazioni FVG sono quelle della scheda: 1.1-1.4, 2.1-2.3, 3.1-3.3, 4.1-4.3
  assert.deepEqual(MAPPA.situazioni.filter((s) => s.origine === 'FVG').map((s) => s.codice),
    ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3']);
  // Le aggiunte del CFP sono dichiarate come tali e citano l'Allegato B2
  MAPPA.situazioni.filter((s) => s.origine === 'CFP').forEach((s) => assert.match(s.docente, /Allegato B2/));
  // Tutte le competenze stanno sulla stessa ADA della figura
  MAPPA.situazioni.forEach((s) => assert.ok(['inf-installare', 'inf-manutenzione'].includes(s.competenza), s.id));
  assert.equal(MAPPA.soglia, null, 'la soglia di autonomia va letta sulla scheda originale, non inventata');
});

test('verificaMappa trova gli errori di contenuto', () => {
  const rotta = JSON.parse(JSON.stringify(MAPPA));
  rotta.situazioni[0].competenza = 'inventata';
  rotta.situazioni[1].id = rotta.situazioni[2].id;
  rotta.situazioni[3].lessico.forte = [];
  rotta.situazioni[4].dimensione = 'nessuna';
  const e = S.verificaMappa(rotta, C).join(' | ');
  ['competenza', 'doppio', 'lessico', 'dimensione'].forEach((x) => assert.match(e, new RegExp(x)));
});

test('il testo si normalizza: maiuscole, accenti, apostrofi', () => {
  assert.deepEqual(S.parole("Ho configurato l'IP. Perché? Città!"), ['ho', 'configurato', 'l', 'ip', 'perche', 'citta']);
});

test('frasi già presenti nella repo: nessuna associazione automatica sbagliata', () => {
  const righe = valuta(FRASI.filter((f) => f.tipo === 'repo'), [MAPPA]);
  const r = riepilogo(righe);
  assert.equal(r.sbagliata || 0, 0, JSON.stringify(righe.filter((x) => x.giudizio === 'sbagliata').map((x) => x.frase.testo)));
  assert.ok((r.giusta || 0) >= 15);
});

test('frasi scritte per la prova: al massimo un errore automatico (caso noto: montare la RAM in assemblaggio)', () => {
  const righe = valuta(FRASI.filter((f) => f.tipo === 'sintetica'), [MAPPA]);
  assert.ok((riepilogo(righe).sbagliata || 0) <= 1);
});

test('casi dubbi: niente testo, fuori mappa, pari merito, contrasto con la scelta', () => {
  const ind = S.compila([MAPPA]);
  assert.deepEqual(S.associa({ testo: '  ' }, ind).motivi, ['vuota']);
  assert.equal(S.associa({ testo: 'Ho fatto le fotocopie.' }, ind).esito, 'dubbio');
  // Tre situazioni a pari merito: niente proposta
  assert.equal(S.associa({ testo: 'prime configurazioni di rete' }, ind).esito, 'dubbio');
  // Scelta dello studente sostenuta dal testo: resta sua
  const ok = S.associa({ testo: 'Ho configurato la stampante di rete', scelte: ['ict05-3.1'] }, ind);
  assert.equal(ok.esito, 'scelta'); assert.equal(ok.situazioni[0].origine, 'studente');
  // Scelta che il testo non sostiene, mentre indica con forza un'altra situazione: dubbio
  const no = S.associa({ testo: 'Ho crimpato i cavi di rete', scelte: ['ict05-2.2'] }, ind);
  assert.equal(no.esito, 'dubbio'); assert.deepEqual(no.motivi, ['contrasto']);
  // Scelta senza testo: si rispetta
  assert.equal(S.associa({ testo: '', scelte: ['ict05-2.2'] }, ind).esito, 'scelta');
  // Id inesistenti nella scelta si ignorano
  assert.equal(S.associa({ testo: 'Ho crimpato i cavi', scelte: ['inventata'] }, ind).esito, 'automatica');
});

test('segnale debole: proposta, che lo studente conferma con un tocco', () => {
  const ind = S.compila([MAPPA]);
  const r = S.associa({ testo: 'installato l\'antivirus su tutti i pc' }, ind);
  assert.equal(r.esito, 'proposta'); assert.equal(r.situazioni[0].origine, 'proposta');
});

test('due cose diverse nella stessa attività: si associano entrambe', () => {
  const ind = S.compila([MAPPA]);
  const r = S.associa({ testo: 'Prima di modificare la rete faccio una copia di sicurezza e dopo provo che tutto funzioni.' }, ind);
  assert.deepEqual(r.situazioni.map((x) => x.id).sort(), ['ict05-1.3', 'ict05-4.2']);
});

test('controlli di contesto e di livello', () => {
  const finta = JSON.parse(JSON.stringify(MAPPA));
  finta.id = 'SST-FINTA'; finta.eqf = 4;
  finta.situazioni = [Object.assign({}, MAPPA.situazioni.find((s) => s.id === 'ict05-c3'), { id: 'finta-1', contesti: ['tirocinio'] })];
  const ind = S.compila([finta]);
  assert.deepEqual(S.associa({ testo: 'Ho crimpato i cavi', luogo: 'scuola', anno: 'anno4' }, ind).motivi, ['contesto']);
  assert.deepEqual(S.associa({ testo: 'Ho crimpato i cavi', luogo: 'tirocinio', anno: 'anno2' }, ind).motivi, ['livello']);
  assert.equal(S.associa({ testo: 'Ho crimpato i cavi', luogo: 'tirocinio', anno: 'anno4' }, ind).esito, 'automatica');
});

test('per il docente: le parole nuove da proporre al lessico quando aggancia un caso dubbio', () => {
  const ind = S.compila([MAPPA]);
  const p = S.paroleNuove('Ho settato l\'ip del pc a mano', ind, 'ict05-3.1');
  assert.ok(p.includes('settato') && p.includes('mano'));
  assert.ok(!p.includes('ho') && !p.includes('del'), 'niente parole vuote');
  assert.deepEqual(S.paroleNuove('x', ind, 'inventata'), []);
});

test('il motore non tocca il DOM e non fa richieste di rete', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  ['js/situazioni.js', 'js/contenuti/sst-ict-05.js'].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/document\.|fetch\(|XMLHttpRequest|innerHTML/.test(t), f);
  });
});

// ---------- Elettrico ed Estetica ----------
const { perIndirizzo, INDIRIZZI } = require('../strumenti/prova-mappa.cjs');

test('tutte le mappe sono complete e agganciate a competenze del catalogo e a un\'ADA', () => {
  Object.keys(INDIRIZZI).forEach((ind) => perIndirizzo(ind).mappe.forEach((m) => {
    assert.deepEqual(S.verificaMappa(m, C), [], m.id);
    assert.equal(m.indirizzo, ind, m.id);
    assert.match(m.fonte.url, /^https:\/\/www\.regione\.fvg\.it\//, m.id);
    assert.ok(m.fonte.ada.every((a) => /^ADA\.\d+\.\d+\.\d+$/.test(a)), m.id);
  }));
  const el = require('../js/contenuti/sst-imp-03.js');
  assert.deepEqual(el.fonte.ada, ['ADA.7.56.165']);
  assert.deepEqual(Array.from(new Set(el.situazioni.map((s) => s.competenza))).sort(), ['el-civili', 'el-verifiche']);
  assert.equal(el.situazioni.filter((s) => s.origine === 'FVG').length, 19, 'SST-IMP-03: 4 + 5 + 4 + 2 + 4 situazioni');
  ['sst-ben-13.js', 'sst-ben-14.js'].forEach((f) => {
    const m = require('../js/contenuti/' + f);
    assert.deepEqual(m.fonte.ada, ['ADA.24.137.406']);
    assert.ok(m.situazioni.every((s) => s.competenza === 'est-trattamenti' && s.origine === 'FVG'), f);
  });
  // Gli id delle situazioni non si ripetono fra mappe diverse
  const ids = Object.keys(INDIRIZZI).flatMap((ind) => perIndirizzo(ind).mappe.flatMap((m) => m.situazioni.map((s) => s.id)));
  assert.equal(new Set(ids).size, ids.length);
});

test('frasi già nella repo, per ogni indirizzo: nessuna associazione automatica sbagliata', () => {
  Object.keys(INDIRIZZI).forEach((ind) => {
    const x = perIndirizzo(ind);
    const righe = valuta(x.frasi.filter((f) => f.tipo === 'repo'), x.mappe);
    assert.equal(riepilogo(righe).sbagliata || 0, 0, ind + ': ' + JSON.stringify(righe.filter((r) => r.giudizio === 'sbagliata').map((r) => r.frase.testo)));
  });
});

test('nome generico del servizio: vale solo se non c\'è una situazione più precisa nella stessa dimensione', () => {
  const ind = S.compila([require('../js/contenuti/sst-ben-13.js')]);
  assert.deepEqual(S.associa({ testo: 'Ho fatto una pedicure' }, ind).situazioni.map((x) => x.id), ['ben13-2.1']);
  assert.deepEqual(S.associa({ testo: 'pedicure con il micromotore e le frese' }, ind).situazioni.map((x) => x.id), ['ben13-2.4']);
  assert.deepEqual(S.associa({ testo: 'ceretta all\'inguine e al baffetto' }, ind).situazioni.map((x) => x.id), ['ben13-4.2']);
});

test('ogni parola dello studente vale per una sola situazione', () => {
  const ind = S.compila([require('../js/contenuti/sst-imp-03.js')]);
  assert.deepEqual(S.associa({ testo: 'quadro trifase del condominio' }, ind).situazioni.map((x) => x.id), ['imp03-4.2']);
  assert.deepEqual(S.associa({ testo: 'luce della cantina con la plafoniera stagna' }, ind).situazioni.map((x) => x.id), ['imp03-3.4']);
});
