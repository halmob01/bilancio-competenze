#!/usr/bin/env node
/* Prova una mappa delle situazioni su un elenco di frasi e stampa il resoconto.
   Uso: node strumenti/prova-mappa.cjs [frasi.json] [mappa.js]
   Predefiniti: tests/dati/frasi-informatica.json e js/contenuti/sst-ict-05.js.
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

if (require.main === module) {
  const frasi = require(path.resolve(process.argv[2] || path.join(__dirname, '../tests/dati/frasi-informatica.json')));
  const mappa = require(path.resolve(process.argv[3] || path.join(__dirname, '../js/contenuti/sst-ict-05.js')));
  const righe = valuta(frasi, [mappa]);
  const tipi = Array.from(new Set(frasi.map(function (f) { return f.tipo || 'frasi'; })));
  tipi.forEach(function (t) {
    const r = righe.filter(function (x) { return (x.frase.tipo || 'frasi') === t; });
    console.log('\n' + t + ' (' + r.length + '): ' + JSON.stringify(riepilogo(r)));
    r.forEach(function (x) {
      console.log('  ' + x.giudizio.padEnd(19) + (x.ids.join(', ') || '-').padEnd(28) + (x.esito.motivi.join(',') || '').padEnd(10) + x.frase.testo.slice(0, 80));
    });
  });
}

module.exports = { valuta: valuta, riepilogo: riepilogo };
