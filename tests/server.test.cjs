'use strict';
// Test del programma del server: si avvia davvero su una porta locale, con un database in una cartella temporanea.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { creaServer } = require('../server/portale.js');
const DB = require('../server/db.js');
const S = require('../server/sicurezza.js');
const API = require('../server/api.js');
const BACKUP = require('../server/backup.js');
const AMM = require('../server/amministra.js');

const ORIGINE = 'https://prova.scuola.it';

async function avvia() {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'portale-'));
  const server = creaServer({ dati: cartella, origine: ORIGINE, percorso: '/gcatalfamo/' });
  await new Promise(function (ok) { server.listen(0, '127.0.0.1', ok); });
  const porta = server.address().port;
  function chiedi(metodo, via, corpo, opz) {
    const o = opz || {};
    return new Promise(function (ok, ko) {
      const testo = corpo === undefined ? '' : (typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
      const h = Object.assign({}, o.intestazioni || {});
      if (metodo !== 'GET' && o.fidata !== false) { h.Origin = ORIGINE; h['X-Portale'] = '1'; }
      if (o.cookie) h.Cookie = 'portale=' + o.cookie;
      if (testo) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(testo); }
      const req = http.request({ host: '127.0.0.1', port: porta, path: via, method: metodo, headers: h }, function (res) {
        let b = '';
        res.on('data', function (d) { b += d; });
        res.on('end', function () {
          let j = null; try { j = JSON.parse(b); } catch (e) { /* non JSON */ }
          const sc = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
          const m = /portale=([^;]*)/.exec(sc);
          ok({ stato: res.statusCode, json: j, intestazioni: res.headers, setCookie: sc, cookie: m ? m[1] : '' });
        });
      });
      req.on('error', ko);
      if (testo) req.write(testo);
      req.end();
    });
  }
  async function chiudi() {
    await new Promise(function (ok) { server.close(ok); });
    server.db.close();
    fs.rmSync(cartella, { recursive: true, force: true });
  }
  return { server, chiedi, chiudi, cartella };
}

// Prepara un amministratore, una classe e due studenti; restituisce i cookie e i codici.
async function preparaClasse(p) {
  const testo = await AMM.esegui(['crea-docente', 'prof@scuola.it', 'Anna Rossi', '--admin'], p.server.db);
  const pw = /Password provvisoria: (\S+)/.exec(testo)[1];
  const acc = await p.chiedi('POST', '/api/accesso/docente', { email: 'PROF@scuola.it', password: pw });
  assert.equal(acc.stato, 200, JSON.stringify(acc.json));
  const docente = acc.cookie;
  const cl = await p.chiedi('POST', '/api/classi', { nome: '3ELA', indirizzo: 'elettrico', anno: 3, annoScolastico: '2026/27' }, { cookie: docente });
  assert.equal(cl.stato, 200);
  const ag = await p.chiedi('POST', '/api/classi/' + cl.json.id + '/studenti', { studenti: [{ nome: 'Sara', cognome: 'Bianchi' }, { nome: 'Luca', cognome: 'Verdi' }, { nome: '', cognome: 'Senza nome' }] }, { cookie: docente });
  assert.equal(ag.json.creati.length, 2, 'la riga senza nome è scartata');
  const el = await p.chiedi('GET', '/api/classi/' + cl.json.id + '/studenti', undefined, { cookie: docente });
  return { docente, pw, classeId: cl.json.id, studenti: el.json.studenti };
}

test('lo schema del database arriva all\'ultima migrazione', () => {
  const db = DB.apri(':memory:');
  assert.equal(DB.versione(db), DB.MIGRAZIONI.length);
  DB.apri; db.close();
});

test('«sono vivo» risponde con le intestazioni di sicurezza; percorsi sconosciuti 404', async () => {
  const p = await avvia();
  try {
    const r = await p.chiedi('GET', '/api/stato');
    assert.equal(r.stato, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.schema, DB.MIGRAZIONI.length);
    assert.equal(r.intestazioni['x-content-type-options'], 'nosniff');
    assert.equal(r.intestazioni['cache-control'], 'no-store');
    assert.match(r.intestazioni['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal((await p.chiedi('GET', '/api/niente')).stato, 404);
    assert.equal((await p.chiedi('GET', '/fuori')).stato, 404);
    assert.equal((await p.chiedi('DELETE', '/api/io')).stato, 405);
    assert.equal((await p.chiedi('GET', '/api/io')).stato, 401);
  } finally { await p.chiudi(); }
});

test('le richieste che scrivono devono venire dalle pagine del portale', async () => {
  const p = await avvia();
  try {
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: 'x' }, { fidata: false })).stato, 403);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: 'x' }, { fidata: false, intestazioni: { Origin: ORIGINE } })).stato, 403, 'manca X-Portale');
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: 'x' }, { fidata: false, intestazioni: { Origin: 'https://studenti.esempio.it', 'X-Portale': '1' } })).stato, 403, 'altra origine');
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', '{rotto')).stato, 400);
  } finally { await p.chiudi(); }
});

test('un corpo oltre 1 MB viene rifiutato', async () => {
  const p = await avvia();
  try {
    const r = await p.chiedi('POST', '/api/accesso/studente', { codice: 'x'.repeat(1100 * 1024) });
    assert.equal(r.stato, 413);
  } finally { await p.chiudi(); }
});

test('docente: password sbagliata rifiutata; cookie sicuro e limitato al percorso dell\'API', async () => {
  const p = await avvia();
  try {
    const testo = await AMM.esegui(['crea-docente', 'prof@scuola.it', 'Anna Rossi'], p.server.db);
    const pw = /Password provvisoria: (\S+)/.exec(testo)[1];
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: 'sbagliata!!' })).stato, 401);
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'nessuno@scuola.it', password: pw })).stato, 401);
    const r = await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: pw });
    assert.equal(r.stato, 200);
    assert.match(r.setCookie, /Path=\/gcatalfamo\/api\//);
    assert.match(r.setCookie, /HttpOnly/);
    assert.match(r.setCookie, /SameSite=Strict/);
    assert.match(r.setCookie, /Secure/);
    assert.doesNotMatch(r.setCookie, /Max-Age/, 'il docente ha un cookie di sessione');
    const io = await p.chiedi('GET', '/api/io', undefined, { cookie: r.cookie });
    assert.equal(io.json.profilo.nome, 'Anna Rossi');
    assert.equal(io.json.profilo.admin, false);
    assert.equal((await p.chiedi('GET', '/api/docenti', undefined, { cookie: r.cookie })).stato, 403, 'solo l\'amministratore');
  } finally { await p.chiudi(); }
});

test('studente: entra con il codice scritto in qualsiasi modo o con il QR; un codice sbagliato no', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = k.studenti.find(function (s) { return s.nome === 'Sara'; });
    assert.match(sara.codice, /^3ELA-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const scritto = sara.codice.toLowerCase().replace(/-/g, ' ');
    const r1 = await p.chiedi('POST', '/api/accesso/studente', { codice: scritto });
    assert.equal(r1.stato, 200);
    assert.equal(r1.json.profilo.classe, '3ELA');
    assert.equal(r1.json.profilo.indirizzo, 'elettrico');
    assert.doesNotMatch(r1.setCookie, /Max-Age/, 'dal PC: cookie che si chiude con il browser');
    const senzaSigla = sara.codice.slice(5);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: senzaSigla })).stato, 200, 'la sigla della classe non serve');
    const r2 = await p.chiedi('POST', '/api/accesso/studente', { qr: sara.qr });
    assert.equal(r2.stato, 200);
    assert.match(r2.setCookie, /Max-Age=\d+/, 'dal telefono: resta collegato');
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAAA' })).stato, 401);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { qr: 'x'.repeat(30) })).stato, 401);
    assert.equal((await p.chiedi('GET', '/api/classi', undefined, { cookie: r1.cookie })).stato, 403, 'lo studente non vede le classi');
    const el = await p.chiedi('GET', '/api/classi/' + k.classeId + '/studenti', undefined, { cookie: k.docente });
    assert.equal(el.json.studenti.find(function (s) { return s.nome === 'Sara'; }).dispositivi, 3, 'il docente vede i dispositivi collegati');
  } finally { await p.chiudi(); }
});

test('troppi codici sbagliati dallo stesso IP: blocco temporaneo, gli altri IP continuano', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const ip = { 'X-Forwarded-For': '10.0.0.9' };
    for (let i = 0; i < 20; i++) await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAA' + 'ACDEFGHJKMNPQRTUVWXY'[i] }, { intestazioni: ip });
    const bloccato = await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice }, { intestazioni: ip });
    assert.equal(bloccato.stato, 429, 'anche con il codice giusto, finché dura il blocco');
    const altro = await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice }, { intestazioni: { 'X-Forwarded-For': '10.0.0.10' } });
    assert.equal(altro.stato, 200);
  } finally { await p.chiudi(); }
});

test('documenti: salvataggio con revisione, conflitto se un altro ha salvato prima, dati ricontrollati', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const st = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    const vuoto = await p.chiedi('GET', '/api/documenti/diario', undefined, { cookie: st });
    assert.deepEqual([vuoto.json.rev, vuoto.json.dati], [0, null]);
    const diario = { versione: 1, tirocini: [{ id: 't1', azienda: 'Officina Verde', settimane: [] }], intruso: '<script>' };
    const s1 = await p.chiedi('PUT', '/api/documenti/diario', { base: 0, dati: diario }, { cookie: st });
    assert.equal(s1.stato, 200);
    assert.equal(s1.json.rev, 1);
    const letto = await p.chiedi('GET', '/api/documenti/diario', undefined, { cookie: st });
    assert.equal(letto.json.dati.tirocini[0].azienda, 'Officina Verde');
    assert.equal(letto.json.dati.intruso, undefined, 'i campi sconosciuti non vengono salvati');
    // Un secondo dispositivo parte ancora dalla revisione 0: non sovrascrive, riceve la versione attuale.
    const s2 = await p.chiedi('PUT', '/api/documenti/diario', { base: 0, dati: { versione: 1, tirocini: [] } }, { cookie: st });
    assert.equal(s2.stato, 409);
    assert.equal(s2.json.rev, 1);
    assert.equal(s2.json.dati.tirocini[0].azienda, 'Officina Verde');
    // Salvare gli stessi dati non crea una revisione nuova.
    const s3 = await p.chiedi('PUT', '/api/documenti/diario', { base: 1, dati: letto.json.dati }, { cookie: st });
    assert.equal(s3.json.invariato, true);
    assert.equal((await p.chiedi('PUT', '/api/documenti/pagella', { base: 0, dati: {} }, { cookie: st })).stato, 404);
    assert.equal((await p.chiedi('PUT', '/api/documenti/diario', { dati: {} }, { cookie: st })).stato, 400, 'serve la base');
    const elenco = await p.chiedi('GET', '/api/documenti', undefined, { cookie: st });
    assert.deepEqual(elenco.json.documenti.map(function (d) { return [d.tipo, d.rev]; }), [['diario', 1]]);
  } finally { await p.chiudi(); }
});

test('il docente legge e corregge: tutto finisce nel registro e lo studente vede chi ha cambiato', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = k.studenti[0];
    const st = (await p.chiedi('POST', '/api/accesso/studente', { codice: sara.codice })).cookie;
    await p.chiedi('PUT', '/api/documenti/cv', { base: 0, dati: { versione: 1, tipo: 'cv', profilo: { nome: 'Sara Bianchi' }, cv: { profilo: 'Mi piace il lavro' } } }, { cookie: st });
    await p.chiedi('PUT', '/api/documenti/cv', { base: 1, dati: { versione: 1, tipo: 'cv', profilo: { nome: 'Sara Bianchi' }, cv: { profilo: 'Mi piace il lavro di squadra' } } }, { cookie: st });
    const doc = await p.chiedi('GET', '/api/studenti/' + sara.id + '/documenti/cv', undefined, { cookie: k.docente });
    assert.equal(doc.stato, 200);
    assert.equal(doc.json.rev, 2);
    const dati = doc.json.dati; dati.cv.profilo = 'Mi piace il lavoro di squadra';
    const corr = await p.chiedi('PUT', '/api/studenti/' + sara.id + '/documenti/cv', { base: 2, dati: dati }, { cookie: k.docente });
    assert.equal(corr.json.rev, 3);
    const visto = await p.chiedi('GET', '/api/documenti/cv', undefined, { cookie: st });
    assert.equal(visto.json.dati.cv.profilo, 'Mi piace il lavoro di squadra');
    assert.deepEqual(visto.json.autore, { tipo: 'docente', nome: 'Anna Rossi' });
    const rev = await p.chiedi('GET', '/api/documenti/cv/revisioni', undefined, { cookie: st });
    assert.deepEqual(rev.json.revisioni.map(function (r) { return [r.rev, r.autore.tipo]; }), [[3, 'docente'], [2, 'studente']], 'due salvataggi ravvicinati dello studente sono una revisione sola');
    const prima = await p.chiedi('GET', '/api/documenti/cv/revisioni/2', undefined, { cookie: st });
    assert.equal(prima.json.dati.cv.profilo, 'Mi piace il lavro di squadra', 'la versione di prima resta recuperabile');
    const reg = await p.chiedi('GET', '/api/studenti/' + sara.id + '/registro', undefined, { cookie: k.docente });
    assert.deepEqual(reg.json.registro.map(function (r) { return r.azione; }), ['modifica', 'lettura']);
    // Uno studente non vede i documenti di un altro.
    assert.equal((await p.chiedi('GET', '/api/studenti/' + k.studenti[1].id + '/documenti/cv', undefined, { cookie: st })).stato, 403);
  } finally { await p.chiudi(); }
});

test('cartellino rigenerato: il vecchio codice non vale più e i dispositivi collegati escono', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = k.studenti[0];
    const st = (await p.chiedi('POST', '/api/accesso/studente', { qr: sara.qr })).cookie;
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: st })).stato, 200);
    assert.equal((await p.chiedi('POST', '/api/studenti/' + sara.id + '/rigenera', {}, { cookie: k.docente })).stato, 200);
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: st })).stato, 401);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: sara.codice })).stato, 401);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { qr: sara.qr })).stato, 401);
    const nuovo = (await p.chiedi('GET', '/api/classi/' + k.classeId + '/studenti', undefined, { cookie: k.docente })).json.studenti[0];
    assert.notEqual(nuovo.codice, sara.codice);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: nuovo.codice })).stato, 200);
  } finally { await p.chiudi(); }
});

test('uscita e inattività: la sessione dal PC si chiude dopo 30 minuti senza richieste', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const st = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    p.server.db.prepare("UPDATE sessioni SET ultimo_uso = ? WHERE metodo = 'codice'").run(new Date(Date.now() - 31 * 60 * 1000).toISOString());
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: st })).stato, 401);
    const st2 = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    const esci = await p.chiedi('POST', '/api/esci', {}, { cookie: st2 });
    assert.match(esci.setCookie, /Max-Age=0/);
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: st2 })).stato, 401);
  } finally { await p.chiudi(); }
});

test('il docente cambia la password provvisoria; studente disattivato non entra', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    assert.equal((await p.chiedi('POST', '/api/docente/password', { vecchia: k.pw, nuova: 'corta' }, { cookie: k.docente })).stato, 400);
    const r = await p.chiedi('POST', '/api/docente/password', { vecchia: k.pw, nuova: 'una password lunga' }, { cookie: k.docente });
    assert.equal(r.stato, 200);
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: k.docente })).stato, 401, 'le altre sessioni escono');
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: r.cookie })).stato, 200);
    assert.equal((await p.chiedi('PATCH', '/api/studenti/' + k.studenti[1].id, { attivo: false }, { cookie: r.cookie })).stato, 200);
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[1].codice })).stato, 401);
  } finally { await p.chiudi(); }
});

test('codici: alfabeto senza caratteri ambigui, lettura tollerante, password con scrypt', async () => {
  for (let i = 0; i < 50; i++) assert.match(S.nuovoCodice(), /^[ACDEFGHJKMNPQRTUVWXY34679]{8}$/);
  assert.equal(S.codiceStampato('3ela', 'ACDE4679'), '3ELA-ACDE-4679');
  assert.equal(S.codiceDaTesto(' 3ela-acde 4679 '), 'ACDE4679');
  assert.equal(S.codiceDaTesto('ACD'), '');
  assert.equal(S.codiceDaTesto('OOOO0000'), '', 'lettere ambigue escluse');
  assert.ok(S.nuovoCodiceQr().length >= 30);
  const h = await S.hashPassword('segreto lungo');
  assert.ok(await S.verificaPassword('segreto lungo', h));
  assert.ok(!(await S.verificaPassword('segreto lunga', h)));
  assert.ok(!(await S.verificaPassword('x', '')));
});

test('fine dell\'anno scolastico: sempre il 31 agosto che viene', () => {
  const f = function (s) { return API.fineAnnoScolastico(Date.parse(s)).toISOString().slice(0, 10); };
  assert.equal(f('2026-11-18T10:00:00Z'), '2027-08-31');
  assert.equal(f('2027-06-10T10:00:00Z'), '2027-08-31');
  assert.equal(f('2027-09-01T10:00:00Z'), '2028-08-31');
});

test('backup: copia coerente e rotazione 7 giornaliere, 4 settimanali, 12 mensili', async () => {
  const nomi = [];
  const d = new Date(Date.UTC(2026, 10, 18));
  for (let i = 0; i < 500; i++) { nomi.push('portale-' + d.toISOString().slice(0, 10) + '.sqlite'); d.setUTCDate(d.getUTCDate() - 1); }
  const via = BACKUP.daCancellare(nomi.concat(['altro-file.txt']));
  const restano = nomi.filter(function (n) { return via.indexOf(n) === -1; });
  assert.ok(restano.length <= 7 + 4 + 12 && restano.length >= 20, 'restano ' + restano.length);
  assert.ok(restano.indexOf('portale-2026-11-18.sqlite') !== -1);
  assert.ok(restano.indexOf('portale-2025-12-01.sqlite') !== -1, 'il mensile di dicembre resta');
  assert.ok(via.indexOf('altro-file.txt') === -1, 'non tocca altri file');

  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'portale-bk-'));
  try {
    const db = DB.apri(path.join(cartella, 'portale.sqlite'));
    DB.annota(db, 'prova', 'prima della copia');
    db.close();
    const r = await BACKUP.esegui(cartella, new Date(Date.UTC(2026, 10, 18)));
    assert.equal(r.copia, 'portale-2026-11-18.sqlite');
    const copia = DB.apri(path.join(cartella, 'backup', r.copia));
    assert.equal(copia.prepare("SELECT dettaglio FROM registro WHERE evento = 'prova'").get().dettaglio, 'prima della copia');
    copia.close();
  } finally { fs.rmSync(cartella, { recursive: true, force: true }); }
});
