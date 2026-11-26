/* Portale dello studente — copia notturna del database (la avvia un timer di systemd).
   Crea in PORTALE_DATI/backup una copia coerente con la data nel nome e tiene:
   le ultime 7 copie giornaliere, 4 settimanali (domenica) e 12 mensili (giorno 1).
   Le foto (PORTALE_DATI/foto) si specchiano in backup/foto: i file nuovi si copiano, quelli tolti dal portale si tolgono anche
   dalla copia (così «elimina subito» vale anche nel backup). Portare le copie FUORI dal server è un passo a parte,
   deciso con il collega (piano §14).

   Avvio: node server/backup.js */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const DB = require('./db.js');

const NOME = /^portale-(\d{4})-(\d{2})-(\d{2})\.sqlite$/;

function dataDi(nome) {
  const m = NOME.exec(nome);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

// Dato l'elenco dei file, restituisce quelli da cancellare. Pura: si prova nei test senza toccare il disco.
function daCancellare(nomi) {
  const copie = nomi.map(function (n) { return { n: n, d: dataDi(n) }; }).filter(function (c) { return c.d; })
    .sort(function (a, b) { return b.d - a.d; }); // dalla più recente
  const tieni = new Set();
  copie.slice(0, 7).forEach(function (c) { tieni.add(c.n); });
  copie.filter(function (c) { return c.d.getUTCDay() === 0; }).slice(0, 4).forEach(function (c) { tieni.add(c.n); });
  copie.filter(function (c) { return c.d.getUTCDate() === 1; }).slice(0, 12).forEach(function (c) { tieni.add(c.n); });
  return copie.filter(function (c) { return !tieni.has(c.n); }).map(function (c) { return c.n; });
}

// Specchio delle foto: i file non cambiano mai (nomi casuali), quindi basta copiare quelli che mancano e togliere quelli che non ci sono più.
function specchiaFoto(dati) {
  const src = path.join(dati, 'foto');
  const dst = path.join(dati, 'backup', 'foto');
  const r = { copiate: 0, tolte: 0 };
  if (!fs.existsSync(src)) return r;
  fs.mkdirSync(dst, { recursive: true, mode: 0o700 });
  const presenti = new Set();
  fs.readdirSync(src).forEach(function (s) {
    const ds = path.join(src, s);
    if (!fs.statSync(ds).isDirectory()) return;
    fs.mkdirSync(path.join(dst, s), { recursive: true, mode: 0o700 });
    fs.readdirSync(ds).forEach(function (f) {
      presenti.add(s + '/' + f);
      const d = path.join(dst, s, f);
      if (!fs.existsSync(d)) { fs.copyFileSync(path.join(ds, f), d); fs.chmodSync(d, 0o600); r.copiate++; }
    });
  });
  fs.readdirSync(dst).forEach(function (s) {
    const dd = path.join(dst, s);
    if (!fs.statSync(dd).isDirectory()) return;
    fs.readdirSync(dd).forEach(function (f) {
      if (!presenti.has(s + '/' + f)) { fs.unlinkSync(path.join(dd, f)); r.tolte++; }
    });
  });
  return r;
}

async function esegui(dati, oggi) {
  const cartella = path.join(dati, 'backup');
  const g = oggi || new Date();
  const nome = 'portale-' + g.toISOString().slice(0, 10) + '.sqlite';
  const db = DB.apri(path.join(dati, 'portale.sqlite'));
  try {
    await DB.copia(db, path.join(cartella, nome));
    const via = daCancellare(fs.readdirSync(cartella));
    via.forEach(function (n) { fs.unlinkSync(path.join(cartella, n)); });
    const foto = specchiaFoto(dati);
    DB.annota(db, 'backup', nome + (via.length ? ', tolte ' + via.length : '') + (foto.copiate || foto.tolte ? ', foto +' + foto.copiate + ' −' + foto.tolte : ''));
    return { copia: nome, tolte: via, foto: foto };
  } finally {
    db.close();
  }
}

if (require.main === module) {
  esegui(process.env.PORTALE_DATI || '/var/lib/portale').then(function (r) {
    console.log('Copia fatta: ' + r.copia + (r.tolte.length ? ' (tolte ' + r.tolte.join(', ') + ')' : ''));
  }, function (e) {
    console.error('Copia NON riuscita: ' + e.message);
    process.exit(1);
  });
}

module.exports = { esegui, daCancellare, specchiaFoto };
