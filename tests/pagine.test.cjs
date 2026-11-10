'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const radice = path.join(__dirname, '..');
const PAGINE = ['index.html', 'bilancio/index.html', 'cv/index.html', 'diario/index.html'];
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

test('la pagina iniziale ha tre card: diario, bilancio, curriculum', () => {
  const html = leggi('index.html');
  assert.deepEqual([...html.matchAll(/<a class="percorso" href="([^"]+)"/g)].map((m) => m[1]), ['diario/', 'bilancio/', 'cv/']);
  assert.ok(!/<script/i.test(html), 'la pagina iniziale non ha script');
  assert.ok(!/https?:\/\//.test(html), 'nessuna risorsa esterna');
});

test('i tre siti hanno il link alla pagina iniziale e si riconoscono tra loro solo da lì', () => {
  ['bilancio/index.html', 'cv/index.html', 'diario/index.html'].forEach((f) => {
    const html = leggi(f);
    assert.equal((html.match(/<a class="testata__tutti" href="\.\.\/">Tutti i percorsi<\/a>/g) || []).length, 1, f);
  });
  ['js/app.js', 'cv/js/app.js', 'diario/js/app.js'].forEach((f) => {
    assert.ok(leggi(f).includes("h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' })"), f);
  });
});

test('gli script di ogni sito si caricano nell\'ordine giusto', () => {
  const ordine = (f) => [...leggi(f).matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ordine('bilancio/index.html'), ['../js/config.js', '../js/dati.js', '../js/bilancio.js', '../js/cv.js', '../js/app.js']);
  assert.deepEqual(ordine('cv/index.html'), ['../js/dati.js', '../js/bilancio.js', '../js/cv.js', '../js/docx.js', '../js/pdf.js', 'js/app.js']);
  assert.ok(!ordine('bilancio/index.html').some((s) => /docx|pdf/.test(s)), 'Word e PDF sono del curriculum');
});

test('la versione degli stili è la stessa in tutte le pagine', () => {
  const v = PAGINE.map((f) => (leggi(f).match(/stile\.css\?v=([\w-]+)/) || [])[1]);
  assert.ok(v.every((x) => x && x === v[0]), v.join(' '));
});
