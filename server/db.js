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
   );`,

  // 2. Accesso e documenti (fase F1).
  `CREATE TABLE classi (
     id INTEGER PRIMARY KEY,
     nome TEXT NOT NULL,                       -- per esempio 3ELA
     indirizzo TEXT NOT NULL DEFAULT '',       -- elettrico, estetica, informatica
     anno INTEGER NOT NULL DEFAULT 0,          -- 1..4
     anno_scolastico TEXT NOT NULL DEFAULT '', -- per esempio 2026/27
     creata TEXT NOT NULL
   );
   CREATE TABLE studenti (
     id INTEGER PRIMARY KEY,
     classe_id INTEGER REFERENCES classi(id),
     nome TEXT NOT NULL,
     cognome TEXT NOT NULL,
     codice TEXT NOT NULL UNIQUE,              -- in chiaro: serve per ristampare i cartellini
     codice_qr TEXT NOT NULL UNIQUE,
     versione_codice INTEGER NOT NULL DEFAULT 1,
     attivo INTEGER NOT NULL DEFAULT 1,
     cartella_rete TEXT NOT NULL DEFAULT '',
     creato TEXT NOT NULL
   );
   CREATE INDEX studenti_classe ON studenti(classe_id);
   CREATE TABLE docenti (
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     nome TEXT NOT NULL,
     password TEXT NOT NULL,
     admin INTEGER NOT NULL DEFAULT 0,
     attivo INTEGER NOT NULL DEFAULT 1,
     creato TEXT NOT NULL
   );
   CREATE TABLE sessioni (
     impronta TEXT PRIMARY KEY,
     tipo TEXT NOT NULL CHECK (tipo IN ('studente', 'docente')),
     utente_id INTEGER NOT NULL,
     metodo TEXT NOT NULL,                     -- qr, codice, password
     versione_codice INTEGER NOT NULL DEFAULT 0,
     dispositivo TEXT NOT NULL DEFAULT '',
     creata TEXT NOT NULL,
     ultimo_uso TEXT NOT NULL,
     scade TEXT NOT NULL,
     inattivita_s INTEGER NOT NULL             -- dopo quanti secondi senza richieste si chiude
   );
   CREATE INDEX sessioni_utente ON sessioni(tipo, utente_id);
   CREATE TABLE documenti (
     studente_id INTEGER NOT NULL REFERENCES studenti(id),
     tipo TEXT NOT NULL,
     rev INTEGER NOT NULL,
     dati TEXT NOT NULL,
     aggiornato TEXT NOT NULL,
     autore_tipo TEXT NOT NULL,
     autore_id INTEGER NOT NULL,
     PRIMARY KEY (studente_id, tipo)
   );
   CREATE TABLE revisioni (
     id INTEGER PRIMARY KEY,
     studente_id INTEGER NOT NULL REFERENCES studenti(id),
     tipo TEXT NOT NULL,
     rev INTEGER NOT NULL,
     dati TEXT NOT NULL,
     quando TEXT NOT NULL,
     autore_tipo TEXT NOT NULL,
     autore_id INTEGER NOT NULL
   );
   CREATE INDEX revisioni_documento ON revisioni(studente_id, tipo, rev);
   CREATE TABLE letture (
     id INTEGER PRIMARY KEY,
     docente_id INTEGER NOT NULL REFERENCES docenti(id),
     studente_id INTEGER NOT NULL REFERENCES studenti(id),
     tipo TEXT NOT NULL,
     azione TEXT NOT NULL,                     -- lettura, modifica, rigenera, ...
     quando TEXT NOT NULL
   );
   CREATE INDEX letture_studente ON letture(studente_id, quando);`,

  // 3. Impostazioni del programma (per esempio la chiave segreta che firma i cookie dei dispositivi).
  `CREATE TABLE impostazioni (
     chiave TEXT PRIMARY KEY,
     valore TEXT NOT NULL
   );`,

  // 4. Foto delle attività: i file stanno fuori dal sito (PORTALE_DATI/foto/<id studente>/), qui solo l'elenco.
  `CREATE TABLE foto (
     studente_id INTEGER NOT NULL REFERENCES studenti(id),
     id TEXT NOT NULL,                         -- scelto dal telefono, lo stesso scritto nelle attività
     file TEXT NOT NULL,                       -- nome casuale del file (senza estensione)
     byte INTEGER NOT NULL,
     byte_mini INTEGER NOT NULL,
     w INTEGER NOT NULL,
     h INTEGER NOT NULL,
     creata TEXT NOT NULL,
     PRIMARY KEY (studente_id, id)
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

// Legge un'impostazione; se non c'è, la crea con il valore dato dalla funzione (una volta sola).
function impostazione(db, chiave, crea) {
  const r = db.prepare('SELECT valore FROM impostazioni WHERE chiave = ?').get(chiave);
  if (r) return r.valore;
  const v = crea();
  db.prepare('INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES (?, ?)').run(chiave, v);
  return db.prepare('SELECT valore FROM impostazioni WHERE chiave = ?').get(chiave).valore;
}

module.exports = { apri, versione, annota, copia, impostazione, MIGRAZIONI };
