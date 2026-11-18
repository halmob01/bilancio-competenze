/* Portale dello studente — database SQLite (modulo integrato node:sqlite).
   Tutto il resto del programma passa da qui: se un giorno servisse better-sqlite3, si cambia solo questo file.
   Lo schema cresce per «migrazioni» numerate: ognuna si applica una volta sola, nell'ordine, e il numero
   raggiunto è salvato nel file stesso (PRAGMA user_version). */
'use strict';

const sqlite = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

// Ogni voce è una migrazione. Non si modificano mai quelle già pubblicate: se ne aggiunge una nuova in fondo.
const MIGRAZIONI = [
  // 1. Fondamenta: un registro tecnico, senza dati personali (avvii, backup, errori del programma).
  `CREATE TABLE registro (
     id INTEGER PRIMARY KEY,
     quando TEXT NOT NULL,
     evento TEXT NOT NULL,
     dettaglio TEXT NOT NULL DEFAULT ''
   );`
];

function apri(percorso) {
  if (percorso !== ':memory:') fs.mkdirSync(path.dirname(percorso), { recursive: true, mode: 0o700 });
  const db = new sqlite.DatabaseSync(percorso);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migra(db);
  return db;
}

function versione(db) {
  return db.prepare('PRAGMA user_version').get().user_version;
}

function migra(db) {
  const da = versione(db);
  for (let i = da; i < MIGRAZIONI.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRAZIONI[i]);
      db.exec('PRAGMA user_version = ' + (i + 1));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

function annota(db, evento, dettaglio) {
  db.prepare('INSERT INTO registro (quando, evento, dettaglio) VALUES (?, ?, ?)')
    .run(new Date().toISOString(), String(evento).slice(0, 60), String(dettaglio || '').slice(0, 500));
}

// Copia coerente del database anche mentre il programma lavora (API di backup di SQLite).
async function copia(db, destinazione) {
  fs.mkdirSync(path.dirname(destinazione), { recursive: true, mode: 0o700 });
  const temporaneo = destinazione + '.parziale';
  try { fs.unlinkSync(temporaneo); } catch (e) { /* non c'era */ }
  await sqlite.backup(db, temporaneo);
  fs.chmodSync(temporaneo, 0o600);
  fs.renameSync(temporaneo, destinazione); // la copia compare solo quando è completa
  return destinazione;
}

module.exports = { apri, versione, annota, copia, MIGRAZIONI };
