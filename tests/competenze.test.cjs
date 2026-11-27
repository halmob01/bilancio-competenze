'use strict';
// Correzioni normative del 27/11/2026: competenze di base, trasversali, indirizzo del Repertorio, curvatura, avvertenza EQF.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/competenze.js');
const L = require('../js/bilancio.js');
const D = require('../js/dati.js');

test('competenze di base: DGR 3192/2020, Allegato B1, III livello fino al terzo anno e IV al quarto', () => {
  const terzo = C.gruppiPer('elettrico', 'anno3').find((g) => g.area === 'base');
  const quarto = C.gruppiPer('elettrico', 'anno4').find((g) => g.area === 'base');
  assert.ok(terzo && quarto);
  assert.match(terzo.fonte, /DGR 3192\/2020, Allegato B1/); assert.match(terzo.fonte, /A2 QCER/);
  assert.match(quarto.fonte, /B1 QCER/);
  assert.ok(terzo.competenze.every((c) => /^base3-/.test(c.id)) && quarto.competenze.every((c) => /^base4-/.test(c.id)));
  assert.ok(terzo.competenze.some((c) => c.ufficiale.startsWith('Esprimersi e comunicare in lingua italiana')));
  assert.ok(quarto.competenze.some((c) => c.ufficiale.startsWith('Utilizzare le reti e gli strumenti informatici in maniera consapevole')));
  assert.equal(terzo.competenze.length, 9); assert.equal(quarto.competenze.length, 8, 'al IV anno matematica e scienze sono una competenza sola');
});

test('competenze trasversali: le quattro dell\'Accordo Regioni 18/12/2019, Allegato 2', () => {
  const g = C.gruppiPer('estetica', 'anno1').find((x) => x.area === 'trasversale');
  assert.match(g.fonte, /Accordo Regioni 18\/12\/2019, Allegato 2/);
  assert.deepEqual(g.competenze.map((c) => c.ufficiale), [
    'Lavorare con gli altri in maniera costruttiva', 'Gestire il proprio apprendimento e sviluppo professionale',
    'Agire in modo imprenditoriale ed innovativo', 'Sviluppare e mantenere il proprio benessere fisico ed emotivo']);
  // Le sei situazioni hanno un riferimento normativo
  D.SITUAZIONI.forEach((s) => assert.ok(Array.isArray(s.riferimenti) && s.riferimenti.length && s.riferimenti.every((r) => r.fonte && r.testo), s.id));
  assert.ok(D.SITUAZIONI.find((s) => s.id === 'collaborare').riferimenti.some((r) => /Lavorare con gli altri/.test(r.testo)));
});

test('nuove competenze: id unici, testi brevi per lo studente, riconosciute dal catalogo', () => {
  const tutte = C.BASE.qualifica.competenze.concat(C.BASE.diploma.competenze, C.TRASVERSALI);
  const ids = tutte.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  tutte.forEach((c) => {
    assert.ok(C.esiste(c.id), c.id);
    assert.ok(c.semplice.length > 10 && c.semplice.length < 120, c.id);
    assert.ok(!/[«»]/.test(c.semplice));
  });
  // Nessun id nuovo coincide con quelli delle figure
  Object.values(C.FIGURE).forEach((f) => ['qualifica', 'diploma'].forEach((liv) => f[liv].gruppi.forEach((g) => g.competenze.forEach((c) => assert.ok(!/^(base[34]|tr)-/.test(c.id))))));
});

test('indirizzo del Repertorio: lo standard è figura più indirizzo scelto (Decreto 12550/2013, §3.2)', () => {
  const art = C.articolazioniPer('elettrico', 'anno3');
  assert.deepEqual(art.qualifica.map((x) => x.id), ['civili', 'industriali', 'speciali', 'cablaggio']);
  assert.ok(art.qualifica.every((x) => x.indirizzo));
  assert.deepEqual(art.diploma, [], 'gli indirizzi del diploma solo al IV anno');
  assert.deepEqual(C.articolazioniPer('elettrico', 'anno4').diploma.map((x) => x.indirizzo), ['Impianti elettrici civili/industriali', 'Building automation']);
  assert.deepEqual(C.articolazioniPer('informatica', 'anno4').diploma.map((x) => x.indirizzo), ['Sistemi, reti e data management', 'Sviluppo soluzioni ICT']);
  const filtrati = C.gruppiPer('elettrico', 'anno3', { articolazioni: { qualifica: 'civili' } }).map((g) => g.id);
  assert.ok(filtrati.includes('civili') && !filtrati.includes('industriali') && !filtrati.includes('cablaggio'));
  assert.ok(filtrati.includes('tutti') && filtrati.includes('mestiere'), 'le competenze comuni restano');
  const inventato = C.gruppiPer('elettrico', 'anno3', { articolazioni: { qualifica: 'inventato' } }).map((g) => g.id);
  assert.ok(inventato.includes('industriali'), 'un indirizzo non valido non filtra niente');
  assert.deepEqual(C.infoPer('elettrico', 'anno3', { qualifica: 'civili' }).indirizzi, ['Installazione/manutenzione di impianti elettrici civili']);
  // Nel bilancio l'indirizzo scelto si salva e si ripulisce
  const n = L.normalizza({ profilo: { indirizzo: 'elettrico', anno: 'anno3', articolazioni: { qualifica: 'civili', diploma: 'domotica4' } } });
  assert.deepEqual(n.profilo.articolazioni, { qualifica: 'civili', diploma: '' }, 'al III anno nessun indirizzo di diploma');
  assert.deepEqual(L.normalizza({ profilo: { indirizzo: 'estetica', anno: 'anno2', articolazioni: { qualifica: 'civili' } } }).profilo.articolazioni, { qualifica: '', diploma: '' });
  const lista = L.regionaliPer(n).map((x) => x.id);
  assert.ok(lista.includes('el-civili') && !lista.includes('el-industriali'));
  // Una risposta già data su un indirizzo non più mostrato non si perde
  n.regionali['el-industriali'] = { livello: 'mai', nota: '' };
  assert.ok(L.regionaliPer(n).some((x) => x.id === 'el-industriali' && x.gruppoTitolo === 'Già scelte prima'));
});

test('curvatura dei quadriennali (DGR 2954/2024, All. B, punto 5): vuota finché il PFP non la fornisce', () => {
  assert.ok(C.CURVATURE.informatica && Array.isArray(C.CURVATURE.informatica.competenze));
  assert.ok(!C.gruppiPer('informatica', 'anno1').some((g) => g.area === 'curvatura'), 'nessun testo inventato');
});

test('riferimenti nel dossier: EQF del titolo, non dello studente, e avvertenza sulla certificazione', () => {
  const s = L.statoVuoto();
  s.profilo = Object.assign(s.profilo, { indirizzo: 'informatica', anno: 'anno3' });
  s.sofare.collaborare.livello = 'con_aiuto';
  s.regionali['tr-collaborare'] = { livello: 'con_aiuto', nota: 'Nel progetto di gruppo.' };
  const r = L.riferimentiRegionali(s);
  assert.equal(r.situazioni[0].id, 'collaborare');
  assert.ok(r.voci.find((v) => v.id === 'tr-collaborare').fonte.includes('Accordo Regioni'));
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.match(app, /D\.Lgs\. 13\/2013/);
  assert.match(app, /del titolo/);
  assert.ok(!/'Competenza regionale: '/.test(app));
  const docenti = fs.readFileSync(path.join(__dirname, '../docenti/js/app.js'), 'utf8');
  assert.match(docenti, /del titolo di riferimento/);
});
