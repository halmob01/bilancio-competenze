'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const radice = path.join(__dirname, '..');
const PAGINE = ['index.html', 'bilancio/index.html', 'cv/index.html', 'diario/index.html', 'portfolio/index.html', 'orientamento/index.html', 'docenti/index.html'];
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

test('ogni pagina trova i suoi file: stili, script, caratteri e link', () => {
  PAGINE.forEach((f) => {
    const html = leggi(f);
    const cartella = path.dirname(path.join(radice, f));
    const riferimenti = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|#|mailto:|data:)/.test(u));
    assert.ok(riferimenti.length > 0, f);
    riferimenti.forEach((u) => {
      const file = path.resolve(cartella, u.split('?')[0].split('#')[0]);
      assert.ok(file.startsWith(radice), f + ' esce dal sito: ' + u);
      const esiste = fs.existsSync(file) && (!fs.statSync(file).isDirectory() || fs.existsSync(path.join(file, 'index.html')));
      assert.ok(esiste, f + ' → ' + u);
    });
  });
});

test('la pagina iniziale ha cinque card: attività, diario, bilancio, curriculum, orientamento', () => {
  const html = leggi('index.html');
  assert.deepEqual([...html.matchAll(/<a class="percorso" href="([^"]+)"/g)].map((m) => m[1]), ['portfolio/', 'diario/', 'bilancio/', 'cv/', 'orientamento/']);
  // Gli unici script servono all'accesso con il cartellino e alla mia area; senza server configurato non fanno niente.
  assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]), ['js/config.js', 'js/unione.js', 'js/archivio.js', 'js/area.js']);
  assert.ok(!/https?:\/\//.test(html), 'nessuna risorsa esterna');
});

test('in ogni sito, in alto a sinistra, il portale dello studente riporta alla pagina iniziale', () => {
  ['bilancio/index.html', 'cv/index.html', 'diario/index.html', 'portfolio/index.html', 'orientamento/index.html', 'docenti/index.html'].forEach((f) => {
    const html = leggi(f);
    const riga = html.slice(html.indexOf('<div class="testata__riga">'));
    assert.ok(/^<div class="testata__riga">\s*<a class="testata__portale" href="\.\.\/"[^>]*><span class="testata__portale-testo">Portale dello studente<\/span><\/a>/.test(riga), f);
    assert.ok(!/testata__tutti|Tutti i percorsi/.test(html), f);
  });
  assert.ok(/<a class="testata__portale" href="\.\/" aria-current="page">/.test(leggi('index.html')));
  ['js/app.js', 'cv/js/app.js', 'diario/js/app.js', 'portfolio/js/app.js', 'orientamento/js/app.js'].forEach((f) => {
    assert.ok(!leggi(f).includes('home__tutti'), f);
  });
});

test('nessuna durata promessa agli studenti', () => {
  ['index.html', 'js/app.js', 'cv/js/app.js', 'diario/js/app.js', 'portfolio/js/app.js', 'orientamento/js/app.js', 'orientamento/js/orientamento.js', 'js/dati.js'].forEach((f) => {
    assert.ok(!/circa (mezz|un'ora|\w+ ore|\d+ minuti)/i.test(leggi(f)), f);
  });
});

test('gli script di ogni sito si caricano nell\'ordine giusto', () => {
  const ordine = (f) => [...leggi(f).matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const comuni = ['../js/config.js', '../js/unione.js', '../js/archivio.js'];
  assert.deepEqual(ordine('bilancio/index.html'), ['../js/config.js', '../js/unione.js', '../js/archivio.js', '../js/dati.js', '../js/competenze.js', '../js/bilancio.js', '../js/cv.js', '../js/app.js']);
  assert.deepEqual(ordine('cv/index.html'), comuni.concat(['../js/dati.js', '../js/bilancio.js', '../js/cv.js', '../js/docx.js', '../js/pdf.js', 'js/app.js']));
  assert.deepEqual(ordine('portfolio/index.html'), comuni.concat(['../js/dati.js', '../js/bilancio.js', '../js/competenze.js', '../js/pdf.js', 'js/attivita.js', 'js/foto.js', 'js/file.js', 'js/app.js']));
  assert.deepEqual(ordine('diario/index.html'), comuni.concat(['js/diario.js', 'js/app.js']));
  assert.deepEqual(ordine('orientamento/index.html'), comuni.concat(['../js/dati.js', '../js/competenze.js', '../js/bilancio.js', 'js/orientamento.js', 'js/app.js']));
  assert.ok(!ordine('bilancio/index.html').some((s) => /docx|pdf/.test(s)), 'Word e PDF non sono del bilancio');
});

test('la versione degli stili è la stessa in tutte le pagine', () => {
  const v = PAGINE.map((f) => (leggi(f).match(/stile\.css\?v=([\w-]+)/) || [])[1]);
  assert.ok(v.every((x) => x && x === v[0]), v.join(' '));
});
