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

const S = require('./sicurezza.js');
const BILANCIO = require('../js/bilancio.js');
const CV = require('../js/cv.js');
const DIARIO = require('../diario/js/diario.js');

// I documenti che il server conosce e la funzione che li ricontrolla (la stessa usata dai siti).
const TIPI = {
  diario: DIARIO.normalizza,
  bilancio: BILANCIO.normalizza,
  cv: CV.normalizza
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
  const limiteStudenti = S.creaLimite({ finestraMs: 10 * 60 * 1000, perChiave: 20, totale: 200 });
  const limiteDocenti = S.creaLimite({ finestraMs: 15 * 60 * 1000, perChiave: 5, totale: 100 });

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
    docenti: db.prepare('SELECT id, email, nome, admin, attivo, creato FROM docenti ORDER BY nome'),
    nuovoDocente: db.prepare('INSERT INTO docenti (email, nome, password, admin, creato) VALUES (?, ?, ?, ?, ?)'),
    cambiaPassword: db.prepare('UPDATE docenti SET password = ? WHERE id = ?'),
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
  function profiloDocente(u) { return { tipo: 'docente', id: u.id, nome: u.nome, email: u.email, admin: !!u.admin }; }

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
    if (limiteStudenti.bloccato(c.ip)) return [429, { ok: false, errore: 'tentativi' }];
    const b = c.corpo || {};
    let s = null; let metodo = '';
    if (typeof b.qr === 'string' && b.qr.length >= 20 && b.qr.length <= 64) { s = q.studenteDaQr.get(b.qr); metodo = 'qr'; }
    else { const cod = S.codiceDaTesto(b.codice); if (cod) s = q.studenteDaCodice.get(cod); metodo = 'codice'; }
    if (!s) { limiteStudenti.errore(c.ip); return [401, { ok: false, errore: 'codice' }]; }
    limiteStudenti.riuscito(c.ip);
    apriSessione(c, 'studente', s.id, metodo, s.versione_codice);
    return [200, { ok: true, profilo: profiloStudente(q.studente.get(s.id)) }];
  });

  rotta('POST', '/api/accesso/docente', null, async function (c) {
    const b = c.corpo || {};
    const email = testo(b.email, 200).toLowerCase();
    const chiave = 'email:' + email;
    if (limiteDocenti.bloccato(c.ip) || limiteDocenti.bloccato(chiave)) return [429, { ok: false, errore: 'tentativi' }];
    const d = email ? q.docenteDaEmail.get(email) : null;
    const giusta = await S.verificaPassword(typeof b.password === 'string' ? b.password : '', d && d.attivo ? d.password : '');
    if (!d || !d.attivo || !giusta) { limiteDocenti.errore(c.ip); limiteDocenti.errore(chiave); return [401, { ok: false, errore: 'credenziali' }]; }
    limiteDocenti.riuscito(c.ip); limiteDocenti.riuscito(chiave);
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

  // Docenti: classi e studenti
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

  function pulisci() { q.scadute.run(adesso()); }

  return { gestisci: gestisci, creaDocente: creaDocente, pulisci: pulisci, TIPI: TIPI };
}

module.exports = { creaApi, fineAnnoScolastico, TIPI };
