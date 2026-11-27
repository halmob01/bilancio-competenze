#!/usr/bin/env node
/* Prova le mappe delle situazioni su un elenco di frasi e stampa il resoconto.
   Uso:  node strumenti/prova-mappa.cjs                      tutti gli indirizzi, con le frasi di tests/dati/
         node strumenti/prova-mappa.cjs elettrico            un indirizzo
         node strumenti/prova-mappa.cjs frasi.json mappa.js [mappa2.js …]   un file di frasi qualsiasi
   Ogni frase: { testo, luogo, anno, atteso: [id] | [] (fuori dalla mappa) | "dubbio" (troppo vaga), tipo, fonte }.
   Per provare frasi vere di una classe: copiarle in un file con lo stesso formato, senza nomi né dati personali. */
'use strict';
const path = require('node:path');
const S = require('../js/situazioni.js');

function valuta(frasi, mappe) {
  const indice = S.compila(mappe);
  return frasi.map(function (f) {
    const r = S.associa({ testo: f.testo, luogo: f.luogo, anno: f.anno }, indice);
    const ids = r.situazioni.map(function (x) { return x.id; });
    const fuori = f.atteso === 'dubbio' || (Array.isArray(f.atteso) && !f.atteso.length);
    let giudizio;
    if (r.esito === 'automatica') giudizio = !fuori && ids.every(function (i) { return f.atteso.indexOf(i) !== -1; }) ? 'giusta' : 'sbagliata';
    else if (r.esito === 'proposta') giudizio = !fuori && f.atteso.indexOf(ids[0]) !== -1 ? 'proposta giusta' : 'proposta sbagliata';
    else giudizio = fuori ? 'dubbio corretto' : 'dubbio';
    return { frase: f, esito: r, ids: ids, giudizio: giudizio };
  });
}

function riepilogo(righe) {
  const conta = {};
  righe.forEach(function (r) { conta[r.giudizio] = (conta[r.giudizio] || 0) + 1; });
  return conta;
}

// Le mappe di ogni indirizzo e il file di frasi di prova.
const INDIRIZZI = {
  informatica: { frasi: 'tests/dati/frasi-informatica.json', mappe: ['js/contenuti/sst-ict-05.js'] },
  elettrico: { frasi: 'tests/dati/frasi-elettrico.json', mappe: ['js/contenuti/sst-imp-03.js'] },
  estetica: { frasi: 'tests/dati/frasi-estetica.json', mappe: ['js/contenuti/sst-ben-13.js', 'js/contenuti/sst-ben-14.js'] }
};
function carica(f) { return require(path.resolve(__dirname, '..', f)); }
function perIndirizzo(id) {
  const c = INDIRIZZI[id];
  return { frasi: carica(c.frasi), mappe: c.mappe.map(carica) };
}

function stampa(titolo, frasi, mappe) {
  console.log('\n===== ' + titolo);
  const righe = valuta(frasi, mappe);
  const tipi = Array.from(new Set(frasi.map(function (f) { return f.tipo || 'frasi'; })));
  tipi.forEach(function (t) {
    const r = righe.filter(function (x) { return (x.frase.tipo || 'frasi') === t; });
    console.log('\n' + t + ' (' + r.length + '): ' + JSON.stringify(riepilogo(r)));
    r.forEach(function (x) {
      console.log('  ' + x.giudizio.padEnd(19) + (x.ids.join(', ') || '-').padEnd(28) + (x.esito.motivi.join(',') || '').padEnd(10) + x.frase.testo.slice(0, 80));
    });
  });
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] && /\.json$/.test(a[0])) stampa(a[0], require(path.resolve(a[0])), a.slice(1).map(function (f) { return require(path.resolve(f)); }));
  else (a[0] ? [a[0]] : Object.keys(INDIRIZZI)).forEach(function (id) { const x = perIndirizzo(id); stampa(id, x.frasi, x.mappe); });
}

module.exports = { valuta: valuta, riepilogo: riepilogo, INDIRIZZI: INDIRIZZI, perIndirizzo: perIndirizzo };
