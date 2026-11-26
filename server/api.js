/* Portale dello studente — le richieste dell'API (fase F1).
   Ogni funzione riceve il contesto della richiesta (c) e restituisce [stato, oggetto].
   Regole che valgono ovunque:
   - lo studente vede e scrive solo i propri documenti;
   - tutti i docenti vedono e possono correggere i documenti di tutti gli studenti (decisione del 12/11/2026),
     e ogni lettura o modifica di un docente finisce nel registro;
   - nessun documento si sovrascrive in silenzio: chi salva dichiara da quale revisione parte (base),
     e se nel frattempo qualcun altro ha salvato riceve 409 con la versione attuale;
   - ogni salvataggio lascia una revisione, con chi l'ha fatto e quando. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const S = require('./sicurezza.js');
const DB = require('./db.js');
const CESTINO = require('./cestino.js');
const BILANCIO = require('../js/bilancio.js');
const CV = require('../js/cv.js');
const DIARIO = require('../diario/js/diario.js');
const ATTIVITA = require('../portfolio/js/attivita.js');

// I documenti che il server conosce e la funzione che li ricontrolla (la stessa usata dai siti).
const TIPI = {
  diario: DIARIO.normalizza,
  bilancio: BILANCIO.normalizza,
  cv: CV.normalizza,
  portfolio: ATTIVITA.normalizza // solo i testi; le foto arrivano con il blocco 2 di F1
};
const INDIRIZZI = ['elettrico', 'estetica', 'informatica'];

const ORA_MS = 3600 * 1000;
const DURATA = {
  qr: { inattivita: 120 * 24 * 3600, scade: fineAnnoScolastico }, // telefono: fino al 31 agosto
  codice: { inattivita: 30 * 60, scade: function (t) { return new Date(t + 8 * ORA_MS); } }, // PC della scuola
  password: { inattivita: 2 * 3600, scade: function (t) { return new Date(t + 12 * ORA_MS); } } // docenti
};
const REVISIONE_UNITA_MS = 10 * 60 * 1000; // salvataggi dello stesso autore entro 10 minuti: una sola revisione
const REVISIONI_GIORNI = 30;

// Foto delle attività (piano §5): già ridotte sul telefono, qui si controlla soltanto.
const FOTO_MAX_BYTE = 400 * 1024;          // la foto grande
const FOTO_MINI_MAX_BYTE = 60 * 1024;      // la miniatura
const FOTO_LATO_MAX = 1600;                // lato lungo della foto grande (il telefono la riduce a 1280)
const FOTO_MINI_LATO_MAX = 480;
const QUOTA_BYTE = 1024 * 1024 * 1024;     // per studente, foto e file insieme
const FOTO_QUOTA_BYTE = QUOTA_BYTE;
const FOTO_MAX_PER_STUDENTE = 5000;
// File allegati alle attività (Word, CAD, codice…)
const ALLEGATO_MAX_BYTE = 25 * 1024 * 1024;
const ALLEGATI_MAX_PER_STUDENTE = 2000;
const ID_ALLEGATO = /^d[a-z0-9]{6,40}$/;
const ID_FOTO = /^f[a-z0-9]{6,40}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Un programma compilato (Windows, Linux, Mac) si riconosce dai primi byte, non dal nome. Il codice sorgente è testo e passa.
function eProgramma(b) {
  if (b.length < 4) return false;
  if (b[0] === 0x4D && b[1] === 0x5A) return true;                                                  // MZ: exe, dll, scr, com
  if (b[0] === 0x7F && b[1] === 0x45 && b[2] === 0x4C && b[3] === 0x46) return true;                // ELF
  const m = b.readUInt32BE(0);
  return m === 0xFEEDFACE || m === 0xFEEDFACF || m === 0xCEFAEDFE || m === 0xCFFAEDFE;             // Mach-O
}

// Il nome originale serve solo a chi scarica: niente percorsi, niente caratteri di controllo.
function nomePulito(v) {
  const t = String(typeof v === 'string' ? v : '').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, '_').replace(/^[.\s]+/, '').trim().slice(0, 120);
  return t || 'file';
}

// Legge le dimensioni di un JPEG vero e proprio (inizia con FF D8, finisce con FF D9, ha un blocco SOF). Altrimenti null.
function dimensioniJpeg(b) {
  if (!Buffer.isBuffer(b) || b.length < 125 || b[0] !== 0xFF || b[1] !== 0xD8 || b[2] !== 0xFF) return null;
  if (b[b.length - 2] !== 0xFF || b[b.length - 1] !== 0xD9) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xFF) { i++; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      const h = (b[i + 5] << 8) | b[i + 6]; const w = (b[i + 7] << 8) | b[i + 8];
      return w > 0 && h > 0 ? { w: w, h: h } : null;
    }
    if (m === 0xD8 || (m >= 0xD0 && m <= 0xD7) || m === 0x01) { i += 2; continue; }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

function fineAnnoScolastico(t) {
  const d = new Date(t);
  let anno = d.getUTCFullYear();
  if (d.getUTCMonth() > 7) anno += 1; // da settembre vale il 31 agosto dell'anno dopo
  return new Date(Date.UTC(anno, 7, 31, 21, 59, 59)); // fine giornata in Italia
}

function testo(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function adesso() { return new Date().toISOString(); }
function intero(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; }

function creaApi(db, opzioni) {
  const o = opzioni || {};
  // Limite dei tentativi. A scuola tutti escono con lo stesso indirizzo IP: un limite per IP bloccherebbe
  // l'intera scuola per gli errori di pochi. Per questo si conta per DISPOSITIVO (cookie tecnico firmato):
  // chi sbaglia troppe volte blocca solo il proprio browser per 10 minuti, i compagni continuano.
  // Chi vuole aggirarlo cancellando i cookie deve chiedere ogni volta un dispositivo nuovo, e il server ne dà
  // al massimo 300 ogni 10 minuti per IP e 1000 in tutto: abbastanza per una scuola che entra la mattina.
  // Con 300 studenti, per indovinare un codice di 8 caratteri servono in media 5 × 10^8 tentativi:
  // circa 3 anni da un IP vero, circa 1 anno al ritmo massimo complessivo (IP falsi da una pagina PHP
  // sul server stesso). Dopo 300 errori in 10 minuti il registro segna un «allarme».
  // Il QR non ha limiti: il suo codice è lungo 32 caratteri e non si può indovinare.
  const DIECI_MINUTI = 10 * 60 * 1000;
  const segreto = DB.impostazione(db, 'segreto-dispositivi', function () { return S.nuovoToken(); });
  const nuoviDispositivi = S.creaLimite({ finestraMs: DIECI_MINUTI, perChiave: 300, totale: 1000 });
  const erroriStudente = S.creaLimite({ finestraMs: DIECI_MINUTI, perChiave: 10 });          // per dispositivo
  const erroriDocente = S.creaLimite({ finestraMs: 15 * 60 * 1000, perChiave: 5 });         // per dispositivo
  const erroriEmail = S.creaLimite({ finestraMs: 60 * 60 * 1000, perChiave: 30 });          // per account docente
  const allarme = S.creaLimite({ finestraMs: DIECI_MINUTI, perChiave: 300 });               // solo per il registro
  let ultimoAllarme = 0;

  // Il dispositivo che fa la richiesta; se non ne ha uno valido, gliene dà uno nuovo (se il limite lo permette).
  function dispositivo(c) {
    const v = S.dispositivoValido(c.cookieDispositivo, segreto);
    if (v) return v;
    if (nuoviDispositivi.bloccato(c.ip)) return '';
    nuoviDispositivi.errore(c.ip);
    const nuovo = S.nuovoDispositivo(segreto);
    c.impostaCookieDispositivo(nuovo);
    return S.dispositivoValido(nuovo, segreto);
  }
  function tentativoSbagliato() {
    allarme.errore('tutti');
    if (allarme.bloccato('tutti') && Date.now() - ultimoAllarme > DIECI_MINUTI) {
      ultimoAllarme = Date.now();
      DB.annota(db, 'allarme', 'più di 300 accessi sbagliati in 10 minuti');
    }
  }

  const q = {
    sessione: db.prepare('SELECT * FROM sessioni WHERE impronta = ?'),
    usaSessione: db.prepare('UPDATE sessioni SET ultimo_uso = ? WHERE impronta = ?'),
    togliSessione: db.prepare('DELETE FROM sessioni WHERE impronta = ?'),
    togliSessioniDi: db.prepare('DELETE FROM sessioni WHERE tipo = ? AND utente_id = ?'),
    nuovaSessione: db.prepare('INSERT INTO sessioni (impronta, tipo, utente_id, metodo, versione_codice, dispositivo, creata, ultimo_uso, scade, inattivita_s) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    scadute: db.prepare('DELETE FROM sessioni WHERE scade < ?'),
    studente: db.prepare('SELECT s.*, c.nome AS classe, c.indirizzo, c.anno, c.anno_scolastico FROM studenti s LEFT JOIN classi c ON c.id = s.classe_id WHERE s.id = ?'),
    studenteDaCodice: db.prepare('SELECT * FROM studenti WHERE codice = ? AND attivo = 1'),
    studenteDaQr: db.prepare('SELECT * FROM studenti WHERE codice_qr = ? AND attivo = 1'),
    docente: db.prepare('SELECT * FROM docenti WHERE id = ?'),
    docenteDaEmail: db.prepare('SELECT * FROM docenti WHERE email = ?'),
    documento: db.prepare('SELECT * FROM documenti WHERE studente_id = ? AND tipo = ?'),
    documenti: db.prepare('SELECT tipo, rev, aggiornato, autore_tipo, autore_id FROM documenti WHERE studente_id = ?'),
    inserisciDocumento: db.prepare('INSERT INTO documenti (studente_id, tipo, rev, dati, aggiornato, autore_tipo, autore_id) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    aggiornaDocumento: db.prepare('UPDATE documenti SET rev = ?, dati = ?, aggiornato = ?, autore_tipo = ?, autore_id = ? WHERE studente_id = ? AND tipo = ?'),
    ultimaRevisione: db.prepare('SELECT * FROM revisioni WHERE studente_id = ? AND tipo = ? ORDER BY rev DESC LIMIT 1'),
    nuovaRevisione: db.prepare('INSERT INTO revisioni (studente_id, tipo, rev, dati, quando, autore_tipo, autore_id) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    unisciRevisione: db.prepare('UPDATE revisioni SET rev = ?, dati = ?, quando = ? WHERE id = ?'),
    potaRevisioni: db.prepare('DELETE FROM revisioni WHERE studente_id = ? AND tipo = ? AND quando < ? AND rev < ?'),
    revisioni: db.prepare('SELECT rev, quando, autore_tipo, autore_id FROM revisioni WHERE studente_id = ? AND tipo = ? ORDER BY rev DESC'),
    revisione: db.prepare('SELECT * FROM revisioni WHERE studente_id = ? AND tipo = ? AND rev = ?'),
    registra: db.prepare('INSERT INTO letture (docente_id, studente_id, tipo, azione, quando) VALUES (?, ?, ?, ?, ?)'),
    classi: db.prepare('SELECT c.*, (SELECT COUNT(*) FROM studenti s WHERE s.classe_id = c.id AND s.attivo = 1) AS studenti FROM classi c ORDER BY c.anno_scolastico DESC, c.nome'),
    classe: db.prepare('SELECT * FROM classi WHERE id = ?'),
    nuovaClasse: db.prepare('INSERT INTO classi (nome, indirizzo, anno, anno_scolastico, creata) VALUES (?, ?, ?, ?, ?)'),
    studentiDiClasse: db.prepare(`SELECT s.id, s.nome, s.cognome, s.codice, s.codice_qr, s.attivo,
        (SELECT MAX(ultimo_uso) FROM sessioni x WHERE x.tipo = 'studente' AND x.utente_id = s.id) AS ultimo_accesso,
        (SELECT COUNT(*) FROM sessioni x WHERE x.tipo = 'studente' AND x.utente_id = s.id AND x.scade > ?) AS dispositivi
      FROM studenti s WHERE s.classe_id = ? ORDER BY s.cognome, s.nome`),
    nuovoStudente: db.prepare('INSERT INTO studenti (classe_id, nome, cognome, codice, codice_qr, creato) VALUES (?, ?, ?, ?, ?, ?)'),
    codiceUsato: db.prepare('SELECT 1 FROM studenti WHERE codice = ?'),
    nuoviCodici: db.prepare('UPDATE studenti SET codice = ?, codice_qr = ?, versione_codice = versione_codice + 1 WHERE id = ?'),
    modificaStudente: db.prepare('UPDATE studenti SET nome = ?, cognome = ?, classe_id = ?, attivo = ? WHERE id = ?'),
    docenti: db.prepare('SELECT id, email, nome, admin, attivo, creato, deve_cambiare FROM docenti ORDER BY nome'),
    docentePassword: db.prepare('UPDATE docenti SET password = ?, deve_cambiare = 1 WHERE id = ?'),
    docenteAttivo: db.prepare('UPDATE docenti SET attivo = ? WHERE id = ?'),
    modificaClasse: db.prepare('UPDATE classi SET nome = ?, indirizzo = ?, anno = ?, anno_scolastico = ? WHERE id = ?'),
    studentiRiepilogo: db.prepare(`SELECT s.id, s.nome, s.cognome, s.attivo,
        (SELECT MAX(ultimo_uso) FROM sessioni x WHERE x.tipo = 'studente' AND x.utente_id = s.id) AS ultimo_accesso,
        (SELECT COUNT(*) FROM sessioni x WHERE x.tipo = 'studente' AND x.utente_id = s.id AND x.scade > ?) AS dispositivi
      FROM studenti s WHERE s.classe_id = ? ORDER BY s.cognome, s.nome`),
    nuovoDocente: db.prepare('INSERT INTO docenti (email, nome, password, admin, creato, deve_cambiare) VALUES (?, ?, ?, ?, ?, 1)'),
    cambiaPassword: db.prepare('UPDATE docenti SET password = ?, deve_cambiare = 0 WHERE id = ?'),
    foto: db.prepare('SELECT * FROM foto WHERE studente_id = ? AND id = ?'),
    fotoElenco: db.prepare('SELECT id, byte, byte_mini, w, h, creata FROM foto WHERE studente_id = ? AND eliminata IS NULL ORDER BY creata'),
    fotoTotali: db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(byte + byte_mini), 0) AS byte FROM foto WHERE studente_id = ? AND eliminata IS NULL'),
    fotoTutte: db.prepare('SELECT COALESCE(SUM(byte + byte_mini), 0) AS byte FROM foto WHERE studente_id = ?'),
    fotoInCestino: db.prepare('UPDATE foto SET eliminata = ? WHERE studente_id = ? AND id = ? AND eliminata IS NULL'),
    fotoRimessa: db.prepare('UPDATE foto SET eliminata = NULL WHERE studente_id = ? AND id = ? AND eliminata IS NOT NULL'),
    fotoScadute: db.prepare('SELECT studente_id, id, file FROM foto WHERE eliminata IS NOT NULL AND eliminata < ?'),
    nuovaFoto: db.prepare('INSERT INTO foto (studente_id, id, file, byte, byte_mini, w, h, creata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    togliFoto: db.prepare('DELETE FROM foto WHERE studente_id = ? AND id = ?'),
    allegato: db.prepare('SELECT * FROM allegati WHERE studente_id = ? AND id = ?'),
    allegatiElenco: db.prepare('SELECT id, nome, byte, creata FROM allegati WHERE studente_id = ? AND eliminata IS NULL ORDER BY creata'),
    allegatiTotali: db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(byte), 0) AS byte FROM allegati WHERE studente_id = ? AND eliminata IS NULL'),
    allegatiTutti: db.prepare('SELECT COALESCE(SUM(byte), 0) AS byte FROM allegati WHERE studente_id = ?'),
    allegatoInCestino: db.prepare('UPDATE allegati SET eliminata = ? WHERE studente_id = ? AND id = ? AND eliminata IS NULL'),
    allegatoRimesso: db.prepare('UPDATE allegati SET eliminata = NULL WHERE studente_id = ? AND id = ? AND eliminata IS NOT NULL'),
    allegatiScaduti: db.prepare('SELECT studente_id, id, file FROM allegati WHERE eliminata IS NOT NULL AND eliminata < ?'),
    cestinoElenco: db.prepare('SELECT id, tipo, percorso, titolo, quando, autore_tipo, autore_id, dati FROM cestino WHERE studente_id = ? ORDER BY id DESC'),
    cestinoUna: db.prepare('SELECT * FROM cestino WHERE studente_id = ? AND id = ?'),
    cestinoNuova: db.prepare('INSERT INTO cestino (studente_id, tipo, percorso, voce_id, titolo, dati, quando, autore_tipo, autore_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    cestinoTogli: db.prepare('DELETE FROM cestino WHERE studente_id = ? AND id = ?'),
    cestinoTogliVoce: db.prepare('DELETE FROM cestino WHERE studente_id = ? AND tipo = ? AND percorso = ? AND voce_id = ?'),
    cestinoPota: db.prepare('DELETE FROM cestino WHERE studente_id = ? AND id NOT IN (SELECT id FROM cestino WHERE studente_id = ? ORDER BY id DESC LIMIT ?)'),
    cestinoScaduto: db.prepare('DELETE FROM cestino WHERE quando < ?'),
    nuovoAllegato: db.prepare('INSERT INTO allegati (studente_id, id, file, nome, byte, creata) VALUES (?, ?, ?, ?, ?, ?)'),
    togliAllegato: db.prepare('DELETE FROM allegati WHERE studente_id = ? AND id = ?'),
    ultimaLettura: db.prepare('SELECT quando FROM letture WHERE docente_id = ? AND studente_id = ? AND tipo = ? AND azione = ? ORDER BY id DESC LIMIT 1'),
    registro: db.prepare('SELECT l.quando, l.tipo, l.azione, d.nome AS docente FROM letture l JOIN docenti d ON d.id = l.docente_id WHERE l.studente_id = ? ORDER BY l.id DESC LIMIT 200')
  };

  function transazione(f) {
    db.exec('BEGIN IMMEDIATE');
    try { const r = f(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  // ---------- sessioni ----------
  function apriSessione(c, tipo, utenteId, metodo, versioneCodice) {
    const token = S.nuovoToken();
    const t = Date.now();
    const d = DURATA[metodo];
    const scade = d.scade(t);
    q.nuovaSessione.run(S.impronta(token), tipo, utenteId, metodo, versioneCodice || 0,
      testo(c.req.headers['user-agent'], 160), new Date(t).toISOString(), new Date(t).toISOString(), scade.toISOString(), d.inattivita);
    c.impostaCookie(token, metodo === 'qr' ? Math.floor((scade - t) / 1000) : 0);
  }

  function sessioneDi(c) {
    const token = c.cookie;
    if (!token) return null;
    const imp = S.impronta(token);
    const s = q.sessione.get(imp);
    if (!s) return null;
    const t = Date.now();
    if (Date.parse(s.scade) < t || Date.parse(s.ultimo_uso) + s.inattivita_s * 1000 < t) { q.togliSessione.run(imp); return null; }
    let utente;
    if (s.tipo === 'studente') {
      utente = q.studente.get(s.utente_id);
      if (!utente || !utente.attivo || utente.versione_codice !== s.versione_codice) { q.togliSessione.run(imp); return null; }
    } else {
      utente = q.docente.get(s.utente_id);
      if (!utente || !utente.attivo) { q.togliSessione.run(imp); return null; }
    }
    if (t - Date.parse(s.ultimo_uso) > 60 * 1000) q.usaSessione.run(new Date(t).toISOString(), imp);
    return { impronta: imp, tipo: s.tipo, metodo: s.metodo, utente: utente };
  }

  function profiloStudente(u) {
    return { tipo: 'studente', id: u.id, nome: u.nome, cognome: u.cognome, classe: u.classe || '', indirizzo: u.indirizzo || '', anno: u.anno || 0, annoScolastico: u.anno_scolastico || '' };
  }
  function profiloDocente(u) { return { tipo: 'docente', id: u.id, nome: u.nome, email: u.email, admin: !!u.admin, cambiaPassword: !!u.deve_cambiare }; }

  // ---------- documenti ----------
  function leggiDocumento(studenteId, tipo) {
    const d = q.documento.get(studenteId, tipo);
    if (!d) return { rev: 0, dati: null, aggiornato: '', autore: null };
    return { rev: d.rev, dati: JSON.parse(d.dati), aggiornato: d.aggiornato, autore: autore(d.autore_tipo, d.autore_id) };
  }
  function autore(tipo, id) {
    if (tipo === 'docente') { const d = q.docente.get(id); return { tipo: 'docente', nome: d ? d.nome : '' }; }
    return { tipo: 'studente' };
  }

  function salvaDocumento(studenteId, tipo, corpo, autoreTipo, autoreId) {
    if (!corpo || typeof corpo !== 'object' || !corpo.dati || typeof corpo.dati !== 'object') return [400, { ok: false, errore: 'formato' }];
    if (!Number.isInteger(corpo.base) || corpo.base < 0) return [400, { ok: false, errore: 'base' }];
    const pulito = JSON.stringify(TIPI[tipo](corpo.dati));
    return transazione(function () {
      const ora = adesso();
      const attuale = q.documento.get(studenteId, tipo);
      const rev = attuale ? attuale.rev : 0;
      if (corpo.base !== rev) {
        return [409, Object.assign({ ok: false, errore: 'conflitto' }, leggiDocumento(studenteId, tipo))];
      }
      if (attuale && attuale.dati === pulito) return [200, { ok: true, rev: rev, invariato: true }];
      if (attuale) metteNelCestino(studenteId, tipo, JSON.parse(attuale.dati), JSON.parse(pulito), autoreTipo, autoreId, ora);
      if (tipo === 'portfolio') rimettiFileUsati(studenteId, JSON.parse(pulito));
      const nuova = rev + 1;
      if (attuale) q.aggiornaDocumento.run(nuova, pulito, ora, autoreTipo, autoreId, studenteId, tipo);
      else q.inserisciDocumento.run(studenteId, tipo, nuova, pulito, ora, autoreTipo, autoreId);
      const ultima = q.ultimaRevisione.get(studenteId, tipo);
      if (ultima && ultima.rev === rev && ultima.autore_tipo === autoreTipo && ultima.autore_id === autoreId &&
          Date.now() - Date.parse(ultima.quando) < REVISIONE_UNITA_MS) {
        q.unisciRevisione.run(nuova, pulito, ora, ultima.id);
      } else {
        q.nuovaRevisione.run(studenteId, tipo, nuova, pulito, ora, autoreTipo, autoreId);
      }
      const limite = new Date(Date.now() - REVISIONI_GIORNI * 24 * ORA_MS).toISOString();
      q.potaRevisioni.run(studenteId, tipo, limite, nuova - 5); // le ultime 5 restano comunque
      return [200, { ok: true, rev: nuova, aggiornato: ora }];
    });
  }

  // ---------- cestino ----------
  // Quello che un salvataggio toglie dal documento si conserva per 30 giorni (vedi server/cestino.js).
  function metteNelCestino(studenteId, tipo, prima, dopo, autoreTipo, autoreId, ora) {
    const tolte = CESTINO.vociTolte(prima, dopo).slice(0, CESTINO.MAX_PER_SALVATAGGIO);
    tolte.forEach(function (t) {
      const perc = JSON.stringify(t.percorso);
      q.cestinoTogliVoce.run(studenteId, tipo, perc, t.voce.id);
      q.cestinoNuova.run(studenteId, tipo, perc, t.voce.id, CESTINO.titoloDi(t.voce), JSON.stringify(t.voce), ora, autoreTipo, autoreId);
    });
    if (tolte.length) q.cestinoPota.run(studenteId, studenteId, CESTINO.MAX_PER_STUDENTE);
  }
  // Una foto o un file scritto in un'attività non può essere «in cestino» da solo: salvare un documento che li usa li rimette a posto
  // (vale anche per il ripristino di una revisione precedente).
  function rimettiFileUsati(studenteId, dati) {
    const r = CESTINO.riferimenti(dati);
    r.foto.forEach(function (id) { q.fotoRimessa.run(studenteId, id); });
    r.file.forEach(function (id) { q.allegatoRimesso.run(studenteId, id); });
  }
  const GIORNO_MS = 24 * ORA_MS;
  function elencoCestino(studenteId) {
    return q.cestinoElenco.all(studenteId).map(function (r) {
      const perc = JSON.parse(r.percorso);
      const rif = CESTINO.riferimenti(JSON.parse(r.dati));
      return { id: r.id, tipo: r.tipo, genere: CESTINO.genereDi(perc), titolo: r.titolo, quando: r.quando,
        scade: new Date(Date.parse(r.quando) + CESTINO.GIORNI * GIORNO_MS).toISOString(), autore: autore(r.autore_tipo, r.autore_id),
        foto: rif.foto.length, file: rif.file.length };
    });
  }
  function ripristinaVoce(studenteId, cid, autoreTipo, autoreId) {
    const r = q.cestinoUna.get(studenteId, cid);
    if (!r) return [404, { ok: false, errore: 'cestino' }];
    const doc = leggiDocumento(studenteId, r.tipo);
    const rim = CESTINO.rimetti(doc.dati || TIPI[r.tipo]({}), JSON.parse(r.percorso), JSON.parse(r.dati));
    if (rim.errore) return [409, { ok: false, errore: 'contenitore' }]; // per esempio la settimana, ma il tirocinio non c'è più
    if (rim.gia) { q.cestinoTogli.run(studenteId, cid); return [200, { ok: true, tipo: r.tipo, gia: true }]; }
    const sal = salvaDocumento(studenteId, r.tipo, { base: doc.rev, dati: rim.dati }, autoreTipo, autoreId);
    if (sal[0] !== 200) return sal;
    q.cestinoTogli.run(studenteId, cid);
    return [200, { ok: true, tipo: r.tipo, titolo: r.titolo }];
  }
  // «Elimina per sempre» (solo lo studente): la voce e le sue foto e file, se nessuna attività li usa più.
  function svuotaVoce(studenteId, cid) {
    const r = q.cestinoUna.get(studenteId, cid);
    if (!r) return [404, { ok: false, errore: 'cestino' }];
    const rif = CESTINO.riferimenti(JSON.parse(r.dati));
    const doc = q.documento.get(studenteId, 'portfolio');
    const testoDoc = doc ? doc.dati : '';
    rif.foto.forEach(function (id) { if (testoDoc.indexOf('"' + id + '"') === -1) toglieFotoDefinitiva(studenteId, id); });
    rif.file.forEach(function (id) { if (testoDoc.indexOf('"' + id + '"') === -1) toglieAllegatoDefinitivo(studenteId, id); });
    q.cestinoTogli.run(studenteId, cid);
    return [200, { ok: true }];
  }

  function elencoRevisioni(studenteId, tipo) {
    return q.revisioni.all(studenteId, tipo).map(function (r) {
      return { rev: r.rev, quando: r.quando, autore: autore(r.autore_tipo, r.autore_id) };
    });
  }
  function unaRevisione(studenteId, tipo, rev) {
    const r = q.revisione.get(studenteId, tipo, rev);
    if (!r) return [404, { ok: false, errore: 'revisione' }];
    return [200, { ok: true, rev: r.rev, quando: r.quando, autore: autore(r.autore_tipo, r.autore_id), dati: JSON.parse(r.dati) }];
  }

  // ---------- foto ----------
  const cartellaFoto = o.cartellaFoto || '';
  function fileFoto(studenteId, file, mini) { return path.join(cartellaFoto, String(studenteId), file + (mini ? '-m' : '') + '.jpg'); }

  function decodificaJpeg(b64, maxByte, maxLato) {
    if (typeof b64 !== 'string' || b64.length < 100 || b64.length > Math.ceil(maxByte * 4 / 3) + 8 || !BASE64.test(b64)) return null;
    const byte = Buffer.from(b64, 'base64');
    if (byte.length > maxByte) return null;
    const d = dimensioniJpeg(byte);
    if (!d || Math.max(d.w, d.h) > maxLato) return null;
    return { byte: byte, w: d.w, h: d.h };
  }

  function caricaFoto(studenteId, id, corpo) {
    if (!cartellaFoto) return [503, { ok: false, errore: 'foto' }];
    if (!ID_FOTO.test(id)) return [400, { ok: false, errore: 'id' }];
    const esiste = q.foto.get(studenteId, id);
    if (esiste) { if (esiste.eliminata) q.fotoRimessa.run(studenteId, id); return [200, { ok: true, invariato: true }]; }
    const b = corpo || {};
    const grande = decodificaJpeg(b.jpeg, FOTO_MAX_BYTE, FOTO_LATO_MAX);
    const mini = decodificaJpeg(b.mini, FOTO_MINI_MAX_BYTE, FOTO_MINI_LATO_MAX);
    if (!grande || !mini) return [400, { ok: false, errore: 'formato' }];
    const t = q.fotoTotali.get(studenteId);
    if (t.n >= FOTO_MAX_PER_STUDENTE || occupato(studenteId) + grande.byte.length + mini.byte.length > QUOTA_BYTE || occupatoConCestino(studenteId) + grande.byte.length + mini.byte.length > 2 * QUOTA_BYTE) return [413, { ok: false, errore: 'quota' }];
    const file = S.casuale(32, 'abcdef0123456789');
    fs.mkdirSync(path.join(cartellaFoto, String(studenteId)), { recursive: true, mode: 0o700 });
    fs.writeFileSync(fileFoto(studenteId, file, false), grande.byte, { mode: 0o600 });
    fs.writeFileSync(fileFoto(studenteId, file, true), mini.byte, { mode: 0o600 });
    try {
      q.nuovaFoto.run(studenteId, id, file, grande.byte.length, mini.byte.length, grande.w, grande.h, adesso());
    } catch (e) {
      try { fs.unlinkSync(fileFoto(studenteId, file, false)); fs.unlinkSync(fileFoto(studenteId, file, true)); } catch (e2) { /* niente da togliere */ }
      throw e;
    }
    return [200, { ok: true }];
  }

  function leggiFoto(studenteId, id, mini) {
    if (!cartellaFoto || !ID_FOTO.test(id)) return [404, { ok: false, errore: 'foto' }];
    const f = q.foto.get(studenteId, id);
    if (!f || f.eliminata) return [404, { ok: false, errore: 'foto' }];
    let byte;
    try { byte = fs.readFileSync(fileFoto(studenteId, f.file, mini)); } catch (e) { return [404, { ok: false, errore: 'foto' }]; }
    return [200, { binario: byte, tipo: 'image/jpeg' }];
  }

  // Lo studente «toglie» una foto: finisce nel cestino insieme all'attività, per 30 giorni.
  function eliminaFoto(studenteId, id) {
    if (!cartellaFoto || !ID_FOTO.test(id)) return [404, { ok: false, errore: 'foto' }];
    if (!q.foto.get(studenteId, id)) return [404, { ok: false, errore: 'foto' }];
    q.fotoInCestino.run(adesso(), studenteId, id);
    return [200, { ok: true }];
  }
  function toglieFotoDefinitiva(studenteId, id) {
    const f = q.foto.get(studenteId, id);
    if (!f) return false;
    q.togliFoto.run(studenteId, id);
    [false, true].forEach(function (m) { try { fs.unlinkSync(fileFoto(studenteId, f.file, m)); } catch (e) { /* già tolto */ } });
    return true;
  }
  // «Elimina subito» (decisione dei docenti): senza cestino.
  function eliminaFotoSubito(studenteId, id) {
    if (!cartellaFoto || !ID_FOTO.test(id)) return [404, { ok: false, errore: 'foto' }];
    return toglieFotoDefinitiva(studenteId, id) ? [200, { ok: true }] : [404, { ok: false, errore: 'foto' }];
  }

  function elencoFoto(studenteId) {
    return [200, { ok: true, foto: q.fotoElenco.all(studenteId).map(function (f) { return { id: f.id, byte: f.byte, w: f.w, h: f.h, creata: f.creata }; }), quota: QUOTA_BYTE, occupato: occupato(studenteId) }];
  }

  // Spazio usato da uno studente: foto e file insieme.
  function occupato(studenteId) { return q.fotoTotali.get(studenteId).byte + q.allegatiTotali.get(studenteId).byte; }
  // Con il cestino: serve un tetto, altrimenti caricare e togliere ripetutamente riempirebbe il disco per 30 giorni.
  function occupatoConCestino(studenteId) { return q.fotoTutte.get(studenteId).byte + q.allegatiTutti.get(studenteId).byte; }

  // ---------- allegati (file) ----------
  const cartellaAllegati = o.cartellaAllegati || '';
  function fileAllegato(studenteId, file) { return path.join(cartellaAllegati, String(studenteId), file + '.bin'); }

  // Il corpo è il file così com'è (non JSON); il nome originale arriva in X-Nome, codificato per l'indirizzo.
  async function caricaAllegato(c, studenteId, id) {
    if (!cartellaAllegati) { c.scarta(); return [503, { ok: false, errore: 'allegati' }]; }
    if (!ID_ALLEGATO.test(id)) { c.scarta(); return [400, { ok: false, errore: 'id' }]; }
    const esiste = q.allegato.get(studenteId, id);
    if (esiste) { c.scarta(); if (esiste.eliminata) q.allegatoRimesso.run(studenteId, id); return [200, { ok: true, invariato: true }]; }
    let nome = '';
    try { nome = nomePulito(decodeURIComponent(String(c.req.headers['x-nome'] || ''))); } catch (e) { nome = 'file'; }
    const dich = Number(c.req.headers['content-length'] || 0);
    const t = q.allegatiTotali.get(studenteId);
    if (dich > ALLEGATO_MAX_BYTE) { c.scarta(); return [413, { ok: false, errore: 'dimensione' }]; }
    if (t.n >= ALLEGATI_MAX_PER_STUDENTE || occupato(studenteId) + dich > QUOTA_BYTE || occupatoConCestino(studenteId) + dich > 2 * QUOTA_BYTE) { c.scarta(); return [413, { ok: false, errore: 'quota' }]; }
    const byte = await c.leggiGrezzo(ALLEGATO_MAX_BYTE);
    if (!byte.length) return [400, { ok: false, errore: 'vuoto' }];
    if (eProgramma(byte)) return [415, { ok: false, errore: 'programma' }];
    if (occupato(studenteId) + byte.length > QUOTA_BYTE || occupatoConCestino(studenteId) + byte.length > 2 * QUOTA_BYTE) return [413, { ok: false, errore: 'quota' }];
    const file = S.casuale(32, 'abcdef0123456789');
    fs.mkdirSync(path.join(cartellaAllegati, String(studenteId)), { recursive: true, mode: 0o700 });
    fs.writeFileSync(fileAllegato(studenteId, file), byte, { mode: 0o600 });
    try { q.nuovoAllegato.run(studenteId, id, file, nome, byte.length, adesso()); }
    catch (e) { try { fs.unlinkSync(fileAllegato(studenteId, file)); } catch (e2) { /* niente da togliere */ } throw e; }
    return [200, { ok: true, nome: nome }];
  }

  // Si scarica sempre come allegato, mai aperto nel browser, con un tipo che non si può interpretare.
  function leggiAllegato(studenteId, id) {
    if (!cartellaAllegati || !ID_ALLEGATO.test(id)) return [404, { ok: false, errore: 'allegato' }];
    const f = q.allegato.get(studenteId, id);
    if (!f || f.eliminata) return [404, { ok: false, errore: 'allegato' }];
    let byte;
    try { byte = fs.readFileSync(fileAllegato(studenteId, f.file)); } catch (e) { return [404, { ok: false, errore: 'allegato' }]; }
    const ascii = f.nome.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_');
    return [200, { binario: byte, tipo: 'application/octet-stream',
      // Senza «sandbox» nella CSP: per un download è inutile e Chrome può annullarlo.
      intestazioni: { 'Content-Disposition': 'attachment; filename="' + ascii + '"; filename*=UTF-8\'\'' + encodeURIComponent(f.nome),
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Cache-Control': 'private, no-store' } }];
  }

  function eliminaAllegato(studenteId, id) {
    if (!cartellaAllegati || !ID_ALLEGATO.test(id)) return [404, { ok: false, errore: 'allegato' }];
    if (!q.allegato.get(studenteId, id)) return [404, { ok: false, errore: 'allegato' }];
    q.allegatoInCestino.run(adesso(), studenteId, id);
    return [200, { ok: true }];
  }
  function toglieAllegatoDefinitivo(studenteId, id) {
    const f = q.allegato.get(studenteId, id);
    if (!f) return false;
    q.togliAllegato.run(studenteId, id);
    try { fs.unlinkSync(fileAllegato(studenteId, f.file)); } catch (e) { /* già tolto */ }
    return true;
  }
  function eliminaAllegatoSubito(studenteId, id) {
    if (!cartellaAllegati || !ID_ALLEGATO.test(id)) return [404, { ok: false, errore: 'allegato' }];
    return toglieAllegatoDefinitivo(studenteId, id) ? [200, { ok: true }] : [404, { ok: false, errore: 'allegato' }];
  }

  function elencoAllegati(studenteId) {
    return [200, { ok: true, allegati: q.allegatiElenco.all(studenteId), quota: QUOTA_BYTE, occupato: occupato(studenteId), massimo: ALLEGATO_MAX_BYTE }];
  }

  // Un docente che apre le foto di uno studente finisce nel registro; per non riempirlo con le miniature di una galleria
  // la stessa azione dello stesso docente sullo stesso studente si scrive una volta ogni 10 minuti.
  function registraLettura(docenteId, studenteId, tipo, azione) {
    const u = q.ultimaLettura.get(docenteId, studenteId, tipo, azione);
    if (u && Date.now() - Date.parse(u.quando) < REVISIONE_UNITA_MS) return;
    q.registra.run(docenteId, studenteId, tipo, azione, adesso());
  }

  // ---------- codici ----------
  function codiciNuovi() {
    for (let i = 0; i < 20; i++) {
      const c = S.nuovoCodice();
      if (!q.codiceUsato.get(c)) return { codice: c, qr: S.nuovoCodiceQr() };
    }
    throw new Error('impossibile generare un codice libero');
  }

  // ---------- controlli di accesso ----------
  const serveStudente = function (c) { return c.sessione && c.sessione.tipo === 'studente'; };
  const serveDocente = function (c) { return c.sessione && c.sessione.tipo === 'docente'; };
  const serveAdmin = function (c) { return serveDocente(c) && !!c.sessione.utente.admin; };

  // ---------- le richieste ----------
  const rotte = [];
  function rotta(metodo, schema, permesso, f) {
    const nomi = [];
    const re = new RegExp('^' + schema.replace(/:([a-z]+)/g, function (_, n) { nomi.push(n); return '([^/]+)'; }) + '$');
    rotte.push({ metodo: metodo, re: re, nomi: nomi, permesso: permesso, f: f });
  }

  // Accesso
  rotta('POST', '/api/accesso/studente', null, function (c) {
    const disp = dispositivo(c);
    if (!disp) return [429, { ok: false, errore: 'dispositivi' }];
    const b = c.corpo || {};
    if (typeof b.qr === 'string') {
      const s = b.qr.length >= 20 && b.qr.length <= 64 ? q.studenteDaQr.get(b.qr) : null;
      if (!s) { tentativoSbagliato(); return [401, { ok: false, errore: 'codice' }]; }
      apriSessione(c, 'studente', s.id, 'qr', s.versione_codice);
      return [200, { ok: true, profilo: profiloStudente(q.studente.get(s.id)) }];
    }
    if (erroriStudente.bloccato(disp)) return [429, { ok: false, errore: 'tentativi' }];
    const cod = S.codiceDaTesto(b.codice);
    const s = cod ? q.studenteDaCodice.get(cod) : null;
    if (!s) { erroriStudente.errore(disp); tentativoSbagliato(); return [401, { ok: false, errore: 'codice' }]; }
    erroriStudente.riuscito(disp);
    apriSessione(c, 'studente', s.id, 'codice', s.versione_codice);
    return [200, { ok: true, profilo: profiloStudente(q.studente.get(s.id)) }];
  });

  rotta('POST', '/api/accesso/docente', null, async function (c) {
    const disp = dispositivo(c);
    if (!disp) return [429, { ok: false, errore: 'dispositivi' }];
    const b = c.corpo || {};
    const email = testo(b.email, 200).toLowerCase();
    if (erroriDocente.bloccato(disp) || erroriEmail.bloccato(email)) return [429, { ok: false, errore: 'tentativi' }];
    const d = email ? q.docenteDaEmail.get(email) : null;
    const giusta = await S.verificaPassword(typeof b.password === 'string' ? b.password : '', d && d.attivo ? d.password : '');
    if (!d || !d.attivo || !giusta) {
      erroriDocente.errore(disp); erroriEmail.errore(email); tentativoSbagliato();
      return [401, { ok: false, errore: 'credenziali' }];
    }
    erroriDocente.riuscito(disp);
    apriSessione(c, 'docente', d.id, 'password', 0);
    return [200, { ok: true, profilo: profiloDocente(d) }];
  });

  rotta('POST', '/api/esci', null, function (c) {
    if (c.sessione) q.togliSessione.run(c.sessione.impronta);
    c.impostaCookie('', -1);
    return [200, { ok: true }];
  });

  rotta('GET', '/api/io', function (c) { return !!c.sessione; }, function (c) {
    const u = c.sessione.utente;
    return [200, { ok: true, profilo: c.sessione.tipo === 'studente' ? profiloStudente(u) : profiloDocente(u), metodo: c.sessione.metodo }];
  });

  // Lo studente e i suoi documenti
  rotta('GET', '/api/documenti', serveStudente, function (c) {
    return [200, { ok: true, documenti: q.documenti.all(c.sessione.utente.id).map(function (d) {
      return { tipo: d.tipo, rev: d.rev, aggiornato: d.aggiornato, autore: autore(d.autore_tipo, d.autore_id) };
    }) }];
  });
  rotta('GET', '/api/documenti/:tipo', serveStudente, function (c, p) {
    if (!TIPI[p.tipo]) return [404, { ok: false, errore: 'tipo' }];
    return [200, Object.assign({ ok: true }, leggiDocumento(c.sessione.utente.id, p.tipo))];
  });
  rotta('PUT', '/api/documenti/:tipo', serveStudente, function (c, p) {
    if (!TIPI[p.tipo]) return [404, { ok: false, errore: 'tipo' }];
    return salvaDocumento(c.sessione.utente.id, p.tipo, c.corpo, 'studente', c.sessione.utente.id);
  });
  rotta('GET', '/api/documenti/:tipo/revisioni', serveStudente, function (c, p) {
    if (!TIPI[p.tipo]) return [404, { ok: false, errore: 'tipo' }];
    return [200, { ok: true, revisioni: elencoRevisioni(c.sessione.utente.id, p.tipo) }];
  });
  rotta('GET', '/api/documenti/:tipo/revisioni/:rev', serveStudente, function (c, p) {
    if (!TIPI[p.tipo]) return [404, { ok: false, errore: 'tipo' }];
    return unaRevisione(c.sessione.utente.id, p.tipo, intero(p.rev));
  });

  // Le foto dello studente
  rotta('GET', '/api/foto', serveStudente, function (c) { return elencoFoto(c.sessione.utente.id); });
  rotta('PUT', '/api/foto/:id', serveStudente, function (c, p) { return caricaFoto(c.sessione.utente.id, p.id, c.corpo); });
  rotta('GET', '/api/foto/:id', serveStudente, function (c, p) { return leggiFoto(c.sessione.utente.id, p.id, false); });
  rotta('GET', '/api/foto/:id/mini', serveStudente, function (c, p) { return leggiFoto(c.sessione.utente.id, p.id, true); });
  rotta('DELETE', '/api/foto/:id', serveStudente, function (c, p) { return eliminaFoto(c.sessione.utente.id, p.id); });
  // Il cestino: le cose tolte negli ultimi 30 giorni
  rotta('GET', '/api/cestino', serveStudente, function (c) { return [200, { ok: true, voci: elencoCestino(c.sessione.utente.id), giorni: CESTINO.GIORNI }]; });
  rotta('POST', '/api/cestino/:id/ripristina', serveStudente, function (c, p) { return ripristinaVoce(c.sessione.utente.id, intero(p.id), 'studente', c.sessione.utente.id); });
  rotta('DELETE', '/api/cestino/:id', serveStudente, function (c, p) { return svuotaVoce(c.sessione.utente.id, intero(p.id)); });
  // I file allegati (Word, CAD, codice…)
  rotta('GET', '/api/allegati', serveStudente, function (c) { return elencoAllegati(c.sessione.utente.id); });
  rotta('PUT', '/api/allegati/:id', serveStudente, function (c, p) { return caricaAllegato(c, c.sessione.utente.id, p.id); });
  rotta('GET', '/api/allegati/:id', serveStudente, function (c, p) { return leggiAllegato(c.sessione.utente.id, p.id); });
  rotta('DELETE', '/api/allegati/:id', serveStudente, function (c, p) { return eliminaAllegato(c.sessione.utente.id, p.id); });

  // Docenti: classi e studenti
  // Come sta andando una classe: per ogni studente lo stato dei quattro percorsi (stessi criteri dei siti), nessun testo dello studente.
  function statoDi(avanz) {
    if (avanz.complete === avanz.totale) return 'completa';
    return avanz.stati.some(function (x) { return x !== 'vuota'; }) ? 'in_corso' : 'vuota';
  }
  function percorsiDi(studenteId) {
    const docs = {};
    q.documenti.all(studenteId).forEach(function (d) { docs[d.tipo] = d; });
    const leggi = function (tipo) { const d = q.documento.get(studenteId, tipo); return d ? JSON.parse(d.dati) : null; };
    const riga = function (tipo, stato, dettaglio) {
      const d = docs[tipo];
      return { stato: d ? stato : 'vuota', dettaglio: d ? dettaglio : '', aggiornato: d ? d.aggiornato : '', autore: d ? autore(d.autore_tipo, d.autore_id) : null };
    };
    const out = {};
    const p = leggi('portfolio');
    const nAtt = p && Array.isArray(p.attivita) ? p.attivita.length : 0;
    out.portfolio = riga('portfolio', nAtt ? 'in_corso' : 'vuota', nAtt === 1 ? '1 attività' : nAtt + ' attività');
    const dia = leggi('diario');
    const sett = dia ? dia.tirocini.reduce(function (n, t) { return n + t.settimane.filter(DIARIO.completa).length; }, 0) : 0;
    out.diario = riga('diario', dia && dia.tirocini.length ? 'in_corso' : 'vuota', dia ? dia.tirocini.length + (dia.tirocini.length === 1 ? ' tirocinio, ' : ' tirocini, ') + sett + (sett === 1 ? ' settimana' : ' settimane') : '');
    const bil = leggi('bilancio');
    const ab = bil ? BILANCIO.avanzamento(bil) : null;
    out.bilancio = riga('bilancio', ab ? statoDi(ab) : 'vuota', ab ? ab.complete + ' di ' + ab.totale + ' sezioni' : '');
    const cv = leggi('cv');
    const ac = cv ? CV.avanzamento(cv) : null;
    out.curriculum = riga('cv', ac ? statoDi(ac) : 'vuota', ac ? ac.complete + ' di ' + ac.totale + ' passi' : '');
    out.attivita = nAtt;
    return out;
  }
  rotta('GET', '/api/classi/:id/riepilogo', serveDocente, function (c, p) {
    const cl = q.classe.get(intero(p.id));
    if (!cl) return [404, { ok: false, errore: 'classe' }];
    return [200, { ok: true, classe: cl, studenti: q.studentiRiepilogo.all(adesso(), cl.id).map(function (s) {
      const pc = percorsiDi(s.id);
      const t = q.fotoTotali.get(s.id); const f = q.allegatiTotali.get(s.id);
      return { id: s.id, nome: s.nome, cognome: s.cognome, attivo: !!s.attivo, ultimoAccesso: s.ultimo_accesso || '', dispositivi: s.dispositivi,
        percorsi: { portfolio: pc.portfolio, diario: pc.diario, bilancio: pc.bilancio, curriculum: pc.curriculum },
        foto: t.n, file: f.n, byte: t.byte + f.byte };
    }) }];
  });
  rotta('PATCH', '/api/classi/:id', serveDocente, function (c, p) {
    const cl = q.classe.get(intero(p.id));
    if (!cl) return [404, { ok: false, errore: 'classe' }];
    const b = c.corpo || {};
    const nome = b.nome === undefined ? cl.nome : testo(b.nome, 20);
    if (!nome) return [400, { ok: false, errore: 'nome' }];
    const indirizzo = b.indirizzo === undefined ? cl.indirizzo : (INDIRIZZI.indexOf(b.indirizzo) !== -1 ? b.indirizzo : '');
    const anno = b.anno === undefined ? cl.anno : ([1, 2, 3, 4].indexOf(b.anno) !== -1 ? b.anno : 0);
    q.modificaClasse.run(nome, indirizzo, anno, b.annoScolastico === undefined ? cl.anno_scolastico : testo(b.annoScolastico, 9), cl.id);
    return [200, { ok: true }];
  });
  // La scheda di uno studente (senza i codici): per l'intestazione della sua pagina nel pannello.
  rotta('GET', '/api/studenti/:id', serveDocente, function (c, p) {
    const s = q.studente.get(intero(p.id));
    if (!s) return [404, { ok: false, errore: 'studente' }];
    const sess = q.studentiRiepilogo.all(adesso(), s.classe_id).find(function (x) { return x.id === s.id; });
    const t = q.fotoTotali.get(s.id); const f = q.allegatiTotali.get(s.id);
    return [200, { ok: true, studente: { id: s.id, nome: s.nome, cognome: s.cognome, attivo: !!s.attivo, classeId: s.classe_id, classe: s.classe || '', indirizzo: s.indirizzo || '', anno: s.anno || 0,
      annoScolastico: s.anno_scolastico || '', ultimoAccesso: sess ? sess.ultimo_accesso || '' : '', dispositivi: sess ? sess.dispositivi : 0, foto: t.n, file: f.n, byte: t.byte + f.byte },
      percorsi: percorsiDi(s.id) }];
  });
  rotta('GET', '/api/classi', serveDocente, function () {
    return [200, { ok: true, classi: q.classi.all() }];
  });
  rotta('POST', '/api/classi', serveDocente, function (c) {
    const b = c.corpo || {};
    const nome = testo(b.nome, 20);
    const indirizzo = INDIRIZZI.indexOf(b.indirizzo) !== -1 ? b.indirizzo : '';
    const anno = [1, 2, 3, 4].indexOf(b.anno) !== -1 ? b.anno : 0;
    if (!nome) return [400, { ok: false, errore: 'nome' }];
    const r = q.nuovaClasse.run(nome, indirizzo, anno, testo(b.annoScolastico, 9), adesso());
    return [200, { ok: true, id: Number(r.lastInsertRowid) }];
  });
  rotta('GET', '/api/classi/:id/studenti', serveDocente, function (c, p) {
    const cl = q.classe.get(intero(p.id));
    if (!cl) return [404, { ok: false, errore: 'classe' }];
    return [200, { ok: true, classe: cl, studenti: q.studentiDiClasse.all(adesso(), cl.id).map(function (s) {
      return { id: s.id, nome: s.nome, cognome: s.cognome, attivo: !!s.attivo, codice: S.codiceStampato(cl.nome, s.codice),
        qr: s.codice_qr, ultimoAccesso: s.ultimo_accesso || '', dispositivi: s.dispositivi };
    }) }];
  });
  rotta('POST', '/api/classi/:id/studenti', serveDocente, function (c, p) {
    const cl = q.classe.get(intero(p.id));
    if (!cl) return [404, { ok: false, errore: 'classe' }];
    const elenco = Array.isArray((c.corpo || {}).studenti) ? c.corpo.studenti.slice(0, 60) : [];
    const validi = elenco.map(function (s) { return { nome: testo(s && s.nome, 60), cognome: testo(s && s.cognome, 60) }; })
      .filter(function (s) { return s.nome && s.cognome; });
    if (!validi.length) return [400, { ok: false, errore: 'elenco' }];
    const creati = transazione(function () {
      return validi.map(function (s) {
        const k = codiciNuovi();
        const r = q.nuovoStudente.run(cl.id, s.nome, s.cognome, k.codice, k.qr, adesso());
        return { id: Number(r.lastInsertRowid), nome: s.nome, cognome: s.cognome };
      });
    });
    return [200, { ok: true, creati: creati }];
  });
  rotta('PATCH', '/api/studenti/:id', serveDocente, function (c, p) {
    const s = q.studente.get(intero(p.id));
    if (!s) return [404, { ok: false, errore: 'studente' }];
    const b = c.corpo || {};
    const classeId = b.classeId === undefined ? s.classe_id : (q.classe.get(intero(b.classeId)) ? intero(b.classeId) : null);
    if (classeId === null) return [400, { ok: false, errore: 'classe' }];
    const attivo = b.attivo === undefined ? s.attivo : (b.attivo ? 1 : 0);
    q.modificaStudente.run(testo(b.nome, 60) || s.nome, testo(b.cognome, 60) || s.cognome, classeId, attivo, s.id);
    if (!attivo) q.togliSessioniDi.run('studente', s.id);
    q.registra.run(c.sessione.utente.id, s.id, '', 'profilo', adesso());
    return [200, { ok: true }];
  });
  // Cartellino perso o fotografato: nuovo codice, il vecchio non vale più e tutti i dispositivi escono.
  rotta('POST', '/api/studenti/:id/rigenera', serveDocente, function (c, p) {
    const s = q.studente.get(intero(p.id));
    if (!s) return [404, { ok: false, errore: 'studente' }];
    transazione(function () {
      const k = codiciNuovi();
      q.nuoviCodici.run(k.codice, k.qr, s.id);
      q.togliSessioniDi.run('studente', s.id);
      q.registra.run(c.sessione.utente.id, s.id, '', 'rigenera', adesso());
    });
    return [200, { ok: true }];
  });

  // Docenti: documenti degli studenti (lettura e correzione, sempre registrate)
  function studenteEDocumento(p) {
    const s = q.studente.get(intero(p.id));
    if (!s) return [404, { ok: false, errore: 'studente' }];
    if (!TIPI[p.tipo]) return [404, { ok: false, errore: 'tipo' }];
    return null;
  }
  rotta('GET', '/api/studenti/:id/documenti/:tipo', serveDocente, function (c, p) {
    const e = studenteEDocumento(p); if (e) return e;
    q.registra.run(c.sessione.utente.id, intero(p.id), p.tipo, 'lettura', adesso());
    return [200, Object.assign({ ok: true }, leggiDocumento(intero(p.id), p.tipo))];
  });
  rotta('PUT', '/api/studenti/:id/documenti/:tipo', serveDocente, function (c, p) {
    const e = studenteEDocumento(p); if (e) return e;
    const r = salvaDocumento(intero(p.id), p.tipo, c.corpo, 'docente', c.sessione.utente.id);
    if (r[0] === 200 && !r[1].invariato) q.registra.run(c.sessione.utente.id, intero(p.id), p.tipo, 'modifica', adesso());
    return r;
  });
  rotta('GET', '/api/studenti/:id/documenti/:tipo/revisioni', serveDocente, function (c, p) {
    const e = studenteEDocumento(p); if (e) return e;
    return [200, { ok: true, revisioni: elencoRevisioni(intero(p.id), p.tipo) }];
  });
  rotta('GET', '/api/studenti/:id/documenti/:tipo/revisioni/:rev', serveDocente, function (c, p) {
    const e = studenteEDocumento(p); if (e) return e;
    q.registra.run(c.sessione.utente.id, intero(p.id), p.tipo, 'lettura revisione', adesso());
    return unaRevisione(intero(p.id), p.tipo, intero(p.rev));
  });

  // Le foto di uno studente viste da un docente: letture nel registro; «elimina subito» decisa dai docenti, con una riga nel registro.
  rotta('GET', '/api/studenti/:id/foto', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    return elencoFoto(intero(p.id));
  });
  rotta('GET', '/api/studenti/:id/foto/:fid', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    registraLettura(c.sessione.utente.id, intero(p.id), 'portfolio', 'lettura foto');
    return leggiFoto(intero(p.id), p.fid, false);
  });
  rotta('GET', '/api/studenti/:id/foto/:fid/mini', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    registraLettura(c.sessione.utente.id, intero(p.id), 'portfolio', 'lettura foto');
    return leggiFoto(intero(p.id), p.fid, true);
  });
  rotta('DELETE', '/api/studenti/:id/foto/:fid', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    const r = eliminaFotoSubito(intero(p.id), p.fid);
    if (r[0] === 200) q.registra.run(c.sessione.utente.id, intero(p.id), 'portfolio', 'elimina foto ' + p.fid, adesso());
    return r;
  });

  rotta('GET', '/api/studenti/:id/allegati', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    return elencoAllegati(intero(p.id));
  });
  rotta('GET', '/api/studenti/:id/allegati/:aid', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    registraLettura(c.sessione.utente.id, intero(p.id), 'portfolio', 'lettura file');
    return leggiAllegato(intero(p.id), p.aid);
  });
  rotta('DELETE', '/api/studenti/:id/allegati/:aid', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    const r = eliminaAllegatoSubito(intero(p.id), p.aid);
    if (r[0] === 200) q.registra.run(c.sessione.utente.id, intero(p.id), 'portfolio', 'elimina file ' + p.aid, adesso());
    return r;
  });

  // Il cestino di uno studente, per i docenti: lo vedono e rimettono a posto quello che serve, con una riga nel registro.
  rotta('GET', '/api/studenti/:id/cestino', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    registraLettura(c.sessione.utente.id, intero(p.id), 'cestino', 'lettura');
    return [200, { ok: true, voci: elencoCestino(intero(p.id)), giorni: CESTINO.GIORNI }];
  });
  rotta('POST', '/api/studenti/:id/cestino/:cid/ripristina', serveDocente, function (c, p) {
    const e = studenteEDocumento({ id: p.id, tipo: 'portfolio' }); if (e) return e;
    const r = ripristinaVoce(intero(p.id), intero(p.cid), 'docente', c.sessione.utente.id);
    if (r[0] === 200) q.registra.run(c.sessione.utente.id, intero(p.id), r[1].tipo || 'cestino', 'ripristina dal cestino', adesso());
    return r;
  });

  // Docenti: la propria password
  rotta('POST', '/api/docente/password', serveDocente, async function (c) {
    const b = c.corpo || {};
    if (!passwordValida(b.nuova)) return [400, { ok: false, errore: 'password corta' }];
    const d = q.docente.get(c.sessione.utente.id);
    if (!(await S.verificaPassword(typeof b.vecchia === 'string' ? b.vecchia : '', d.password))) return [401, { ok: false, errore: 'credenziali' }];
    q.cambiaPassword.run(await S.hashPassword(b.nuova), d.id);
    q.togliSessioniDi.run('docente', d.id); // esce da tutti gli altri dispositivi
    apriSessione(c, 'docente', d.id, 'password', 0);
    return [200, { ok: true }];
  });

  // Amministratore
  rotta('GET', '/api/docenti', serveAdmin, function () { return [200, { ok: true, docenti: q.docenti.all() }]; });
  rotta('POST', '/api/docenti', serveAdmin, async function (c) {
    const r = await creaDocente(c.corpo || {});
    return r.errore ? [400, { ok: false, errore: r.errore }] : [200, Object.assign({ ok: true }, r)];
  });
  // Un docente nuovo o con la password reimpostata la cambia al primo accesso. La nuova password provvisoria si vede una volta sola.
  rotta('POST', '/api/docenti/:id/password', serveAdmin, async function (c, p) {
    const d = q.docente.get(intero(p.id));
    if (!d) return [404, { ok: false, errore: 'docente' }];
    const provvisoria = S.casuale(14, 'abcdefghjkmnpqrstuvwxyz23456789');
    q.docentePassword.run(await S.hashPassword(provvisoria), d.id);
    q.togliSessioniDi.run('docente', d.id);
    DB.annota(db, 'password reimpostata', 'id ' + d.id + ' da docente ' + c.sessione.utente.id);
    // chi reimposta la propria password esce come gli altri
    return [200, { ok: true, email: d.email, passwordProvvisoria: provvisoria }];
  });
  rotta('PATCH', '/api/docenti/:id', serveAdmin, function (c, p) {
    const d = q.docente.get(intero(p.id));
    if (!d) return [404, { ok: false, errore: 'docente' }];
    const b = c.corpo || {};
    if (b.attivo !== undefined) {
      if (d.id === c.sessione.utente.id && !b.attivo) return [400, { ok: false, errore: 'te stesso' }];
      q.docenteAttivo.run(b.attivo ? 1 : 0, d.id);
      if (!b.attivo) q.togliSessioniDi.run('docente', d.id);
      DB.annota(db, b.attivo ? 'docente riattivato' : 'docente disattivato', 'id ' + d.id + ' da docente ' + c.sessione.utente.id);
    }
    return [200, { ok: true }];
  });
  rotta('GET', '/api/studenti/:id/registro', serveAdmin, function (c, p) {
    return [200, { ok: true, registro: q.registro.all(intero(p.id)) }];
  });

  function passwordValida(pw) { return S.passwordValida(pw); }

  // Usata dall'API e dal programma di amministrazione (amministra.js). Restituisce la password provvisoria.
  async function creaDocente(b) {
    const email = testo(b.email, 200).toLowerCase();
    const nome = testo(b.nome, 80);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { errore: 'email' };
    if (!nome) return { errore: 'nome' };
    if (q.docenteDaEmail.get(email)) return { errore: 'esiste' };
    const provvisoria = S.casuale(14, 'abcdefghjkmnpqrstuvwxyz23456789');
    const r = q.nuovoDocente.run(email, nome, await S.hashPassword(provvisoria), b.admin ? 1 : 0, adesso());
    return { id: Number(r.lastInsertRowid), email: email, passwordProvvisoria: provvisoria };
  }

  async function gestisci(c) {
    c.sessione = sessioneDi(c);
    let trovata = false;
    for (const r of rotte) {
      const m = r.re.exec(c.via);
      if (!m) continue;
      trovata = true;
      if (r.metodo !== c.metodo) continue;
      if (r.permesso && !r.permesso(c)) return c.sessione ? [403, { ok: false, errore: 'permesso' }] : [401, { ok: false, errore: 'accesso' }];
      const p = {};
      r.nomi.forEach(function (n, i) { p[n] = decodeURIComponent(m[i + 1]); });
      return await r.f(c, p);
    }
    return trovata ? [405, { ok: false, errore: 'metodo' }] : null;
  }

  // Ogni ora: sessioni scadute, voci del cestino oltre i 30 giorni, foto e file tolti da più di 31 giorni (un giorno in più, così
  // una voce ancora nel cestino non perde mai le sue foto).
  function pulisci() {
    q.scadute.run(adesso());
    q.cestinoScaduto.run(new Date(Date.now() - CESTINO.GIORNI * GIORNO_MS).toISOString());
    const limite = new Date(Date.now() - (CESTINO.GIORNI + 1) * GIORNO_MS).toISOString();
    q.fotoScadute.all(limite).forEach(function (f) { toglieFotoDefinitiva(f.studente_id, f.id); });
    q.allegatiScaduti.all(limite).forEach(function (f) { toglieAllegatoDefinitivo(f.studente_id, f.id); });
  }

  return { gestisci: gestisci, creaDocente: creaDocente, pulisci: pulisci, TIPI: TIPI };
}

module.exports = { creaApi, fineAnnoScolastico, TIPI, dimensioniJpeg, FOTO_QUOTA_BYTE, FOTO_MAX_BYTE, QUOTA_BYTE, ALLEGATO_MAX_BYTE, eProgramma, nomePulito };
