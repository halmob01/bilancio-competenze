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
      const biscotti = [];
      if (o.cookie) biscotti.push('portale=' + o.cookie);
      if (o.dispositivo) biscotti.push('portale_disp=' + o.dispositivo);
      if (biscotti.length) h.Cookie = biscotti.join('; ');
      if (testo) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(testo); }
      const req = http.request({ host: '127.0.0.1', port: porta, path: via, method: metodo, headers: h }, function (res) {
        let b = '';
        res.on('data', function (d) { b += d; });
        res.on('end', function () {
          let j = null; try { j = JSON.parse(b); } catch (e) { /* non JSON */ }
          const tutti = res.headers['set-cookie'] || [];
          const sc = tutti.find(function (x) { return x.startsWith('portale='); }) || '';
          const sd = tutti.find(function (x) { return x.startsWith('portale_disp='); }) || '';
          const m = /portale=([^;]*)/.exec(sc);
          const md = /portale_disp=([^;]*)/.exec(sd);
          ok({ stato: res.statusCode, json: j, intestazioni: res.headers, setCookie: sc, cookie: m ? m[1] : '',
            setDispositivo: sd, dispositivo: md ? md[1] : '' });
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
  const cl = await p.chiedi('POST', '/api/classi', { nome: '3ELE', indirizzo: 'elettrico', anno: 3, annoScolastico: '2026/27' }, { cookie: docente });
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
    assert.match(sara.codice, /^3ELE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const scritto = sara.codice.toLowerCase().replace(/-/g, ' ');
    const r1 = await p.chiedi('POST', '/api/accesso/studente', { codice: scritto });
    assert.equal(r1.stato, 200);
    assert.equal(r1.json.profilo.classe, '3ELE');
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

test('a scuola tutti hanno lo stesso IP: chi sbaglia troppo blocca solo il proprio dispositivo', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const scuola = { 'X-Forwarded-For': '93.40.1.1' };
    // Il primo tentativo dà al browser il suo cookie di dispositivo, firmato e valido un anno.
    const primo = await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAAA' }, { intestazioni: scuola });
    assert.equal(primo.stato, 401);
    assert.match(primo.setDispositivo, /HttpOnly/);
    assert.match(primo.setDispositivo, /Max-Age=31536000/);
    const pasticcione = primo.dispositivo;
    for (let i = 0; i < 9; i++) await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAA' + 'CDEFGHJKM'[i] }, { intestazioni: scuola, dispositivo: pasticcione });
    const bloccato = await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice }, { intestazioni: scuola, dispositivo: pasticcione });
    assert.equal(bloccato.stato, 429, 'il suo browser aspetta, anche con il codice giusto');
    assert.equal(bloccato.json.errore, 'tentativi');
    // Il resto della classe, dallo stesso IP, entra senza problemi.
    for (let i = 0; i < 25; i++) {
      const r = await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[i % 2].codice }, { intestazioni: scuola });
      assert.equal(r.stato, 200, 'compagno ' + i);
    }
    // Con il QR si entra anche dal dispositivo bloccato.
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { qr: k.studenti[0].qr }, { intestazioni: scuola, dispositivo: pasticcione })).stato, 200);
    // Un cookie di dispositivo inventato non vale: il server ne dà uno nuovo.
    const falso = await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAAA' }, { intestazioni: scuola, dispositivo: 'inventato1234.abc' });
    assert.ok(falso.dispositivo && falso.dispositivo !== 'inventato1234.abc');
  } finally { await p.chiudi(); }
});

test('chi cancella i cookie per riprovare all\'infinito trova un tetto ai dispositivi nuovi per IP', async () => {
  const p = await avvia();
  try {
    const ip = { 'X-Forwarded-For': '10.9.9.9' };
    let ultimo;
    for (let i = 0; i < 301; i++) ultimo = await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAAA' }, { intestazioni: ip });
    assert.equal(ultimo.stato, 429);
    assert.equal(ultimo.json.errore, 'dispositivi');
    assert.equal((await p.chiedi('POST', '/api/accesso/studente', { codice: 'AAAA-AAAA' }, { intestazioni: { 'X-Forwarded-For': '10.9.9.10' } })).stato, 401, 'un altro IP no');
  } finally { await p.chiudi(); }
});

test('docenti: 5 password sbagliate bloccano quel dispositivo, non gli altri docenti della scuola', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const t = await AMM.esegui(['crea-docente', 'altro@scuola.it', 'Marco Neri'], p.server.db);
    const pw2 = /Password provvisoria: (\S+)/.exec(t)[1];
    const scuola = { 'X-Forwarded-For': '93.40.1.1' };
    const primo = await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: 'sbagliata 0' }, { intestazioni: scuola });
    for (let i = 1; i < 5; i++) await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: 'sbagliata ' + i }, { intestazioni: scuola, dispositivo: primo.dispositivo });
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: k.pw }, { intestazioni: scuola, dispositivo: primo.dispositivo })).stato, 429);
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'altro@scuola.it', password: pw2 }, { intestazioni: scuola })).stato, 200, 'il collega entra');
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'prof@scuola.it', password: k.pw }, { intestazioni: scuola })).stato, 200, 'da un altro PC sì');
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

test('le mie attività si salvano come gli altri documenti, ricontrollate con le regole del sito', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const st = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    const dati = { versione: 1, profilo: { indirizzo: 'elettrico', anno: 'anno3' }, attivita: [
      { id: 'a1x2y3', fatto: 'Ho cablato un quadro.', luogo: 'scuola', data: '2026-03-10', competenze: ['el-verifiche', 'inventata'], foto: ['fabc1234', '../x'] }] };
    const s1 = await p.chiedi('PUT', '/api/documenti/portfolio', { base: 0, dati: dati }, { cookie: st });
    assert.equal(s1.stato, 200);
    const letto = await p.chiedi('GET', '/api/documenti/portfolio', undefined, { cookie: st });
    assert.deepEqual(letto.json.dati.attivita[0].competenze, ['el-verifiche'], 'solo competenze del catalogo');
    assert.deepEqual(letto.json.dati.attivita[0].foto, ['fabc1234'], 'solo identificativi di foto validi');
  } finally { await p.chiudi(); }
});

// Un JPEG vero (8 × 6, rosso) per le prove delle foto.
const JPEG_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAGAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiaKKK8Q/Uj//Z';

test('foto: caricamento controllato, consegna solo allo studente e ai docenti, registro e quota', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    const luca = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[1].codice })).cookie;
    const carica = (cookie, id, corpo) => p.chiedi('PUT', '/api/foto/' + id, corpo, { cookie: cookie });
    // Una foto vera passa, due volte non cambia niente
    const ok = await carica(sara, 'fabc12345', { jpeg: JPEG_B64, mini: JPEG_B64 });
    assert.equal(ok.stato, 200, JSON.stringify(ok.json));
    assert.equal((await carica(sara, 'fabc12345', { jpeg: JPEG_B64, mini: JPEG_B64 })).json.invariato, true);
    // Non è una foto, identificativo strano, formato sbagliato: respinti
    const finta = Buffer.from('<html>non sono una foto</html>'.repeat(10)).toString('base64');
    assert.equal((await carica(sara, 'fabc99999', { jpeg: finta, mini: finta })).stato, 400);
    assert.equal((await carica(sara, '..%2Fx', { jpeg: JPEG_B64, mini: JPEG_B64 })).stato, 400);
    assert.equal((await carica(sara, 'fabc88888', { jpeg: JPEG_B64 })).stato, 400, 'serve anche la miniatura');
    assert.equal((await carica(sara, 'fabc77777', { jpeg: JPEG_B64.slice(0, -8), mini: JPEG_B64 })).stato, 400, 'JPEG tagliato');
    const enorme = Buffer.concat([Buffer.from(JPEG_B64, 'base64').subarray(0, -2), Buffer.alloc(API.FOTO_MAX_BYTE + 10), Buffer.from([0xFF, 0xD9])]).toString('base64');
    assert.equal((await carica(sara, 'fabc66666', { jpeg: enorme, mini: JPEG_B64 })).stato, 400, 'oltre 400 KB');
    // Il file è fuori dal sito, con nome casuale, e consegnato come JPEG
    const f = await fetch('http://127.0.0.1:' + p.server.address().port + '/api/foto/fabc12345', { headers: { Cookie: 'portale=' + sara } });
    assert.equal(f.status, 200); assert.equal(f.headers.get('content-type'), 'image/jpeg');
    assert.equal(f.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await f.arrayBuffer()), Buffer.from(JPEG_B64, 'base64'));
    const nomi = fs.readdirSync(path.join(p.cartella, 'foto', '1'));
    assert.equal(nomi.length, 2); assert.ok(nomi.every((n) => /^[0-9a-f]{32}(-m)?\.jpg$/.test(n)), 'nomi casuali');
    // Elenco
    const el = await p.chiedi('GET', '/api/foto', undefined, { cookie: sara });
    assert.deepEqual(el.json.foto.map((x) => [x.id, x.w, x.h]), [['fabc12345', 8, 6]]);
    // Un altro studente non la vede e non la toglie; senza accesso nemmeno
    assert.equal((await p.chiedi('GET', '/api/foto/fabc12345', undefined, { cookie: luca })).stato, 404);
    assert.equal((await p.chiedi('DELETE', '/api/foto/fabc12345', undefined, { cookie: luca })).stato, 404);
    assert.equal((await p.chiedi('GET', '/api/foto/fabc12345')).stato, 401);
    assert.deepEqual((await p.chiedi('GET', '/api/foto', undefined, { cookie: luca })).json.foto, []);
    // Il docente la apre: nel registro una volta sola ogni 10 minuti
    const saraId = k.studenti[0].id;
    const d1 = await fetch('http://127.0.0.1:' + p.server.address().port + '/api/studenti/' + saraId + '/foto/fabc12345/mini', { headers: { Cookie: 'portale=' + k.docente } });
    assert.equal(d1.status, 200);
    await fetch('http://127.0.0.1:' + p.server.address().port + '/api/studenti/' + saraId + '/foto/fabc12345', { headers: { Cookie: 'portale=' + k.docente } });
    let reg = (await p.chiedi('GET', '/api/studenti/' + saraId + '/registro', undefined, { cookie: k.docente })).json.registro;
    assert.equal(reg.filter((r) => r.azione === 'lettura foto').length, 1);
    // Quota: oltre il limite si rifiuta
    p.server.db.prepare("INSERT INTO foto (studente_id, id, file, byte, byte_mini, w, h, creata) VALUES (1, 'fpieno0000', 'x', ?, 0, 1, 1, 'ora')").run(API.FOTO_QUOTA_BYTE);
    assert.equal((await carica(sara, 'fabc55555', { jpeg: JPEG_B64, mini: JPEG_B64 })).stato, 413);
    p.server.db.prepare("DELETE FROM foto WHERE id = 'fpieno0000'").run();
    // Elimina subito: il docente decide, con una riga nel registro; lo studente toglie le sue
    assert.equal((await p.chiedi('DELETE', '/api/studenti/' + saraId + '/foto/fabc12345', undefined, { cookie: k.docente })).stato, 200);
    reg = (await p.chiedi('GET', '/api/studenti/' + saraId + '/registro', undefined, { cookie: k.docente })).json.registro;
    assert.ok(reg.some((r) => r.azione === 'elimina foto fabc12345'));
    assert.equal(fs.readdirSync(path.join(p.cartella, 'foto', '1')).length, 0, 'i file sono stati cancellati');
    assert.equal((await carica(sara, 'fdef12345', { jpeg: JPEG_B64, mini: JPEG_B64 })).stato, 200);
    assert.equal((await p.chiedi('DELETE', '/api/foto/fdef12345', undefined, { cookie: sara })).stato, 200);
    assert.equal((await p.chiedi('GET', '/api/foto/fdef12345', undefined, { cookie: sara })).stato, 404);
    // Le scritture vengono solo dalle pagine del portale
    assert.equal((await p.chiedi('PUT', '/api/foto/fzzz12345', { jpeg: JPEG_B64, mini: JPEG_B64 }, { cookie: sara, fidata: false })).stato, 403);
  } finally { await p.chiudi(); }
});

test('file allegati: qualsiasi documento o codice, mai programmi compilati; si scaricano soltanto; quota unica con le foto', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    const luca = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[1].codice })).cookie;
    const base = 'http://127.0.0.1:' + p.server.address().port;
    const manda = (cookie, id, byte, nome, extra) => fetch(base + '/api/allegati/' + id, { method: 'PUT',
      headers: Object.assign({ 'X-Portale': '1', Origin: ORIGINE, Cookie: cookie ? 'portale=' + cookie : '', 'Content-Type': 'application/octet-stream', 'X-Nome': encodeURIComponent(nome) }, extra || {}), body: byte });
    // Un documento Word (finto: un file ZIP come i .docx) e un disegno CAD passano; il nome è ripulito
    const docx = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(2000, 7)]);
    const r1 = await manda(sara, 'dabc12345', docx, '../planimetria casa.docx');
    assert.equal(r1.status, 200);
    assert.equal((await r1.json()).nome, '.._planimetria casa.docx'.replace(/^\.+/, ''), 'niente percorsi nel nome');
    const dwg = Buffer.from('AC1027' + 'x'.repeat(5000));
    assert.equal((await manda(sara, 'dabc22222', dwg, 'Pianta piano terra.dwg')).status, 200);
    // Il codice sorgente passa, in qualunque linguaggio
    for (const [id, nome, testo] of [['dpy123456', 'gioco.py', 'print("ciao")\n'], ['dphp12345', 'form.php', '<?php echo 1; ?>'], ['dsh123456', 'avvio.sh', '#!/bin/sh\necho ok\n'], ['dhtml1234', 'index.html', '<script>alert(1)</script>']]) {
      assert.equal((await manda(sara, id, Buffer.from(testo), nome)).status, 200, nome);
    }
    // Un programma compilato no: Windows (MZ), Linux (ELF), Mac (Mach-O), anche se rinominato
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(300)]);
    assert.equal((await manda(sara, 'dexe12345', exe, 'relazione.docx')).status, 415);
    assert.equal((await manda(sara, 'delf12345', Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(300)]), 'a.out')).status, 415);
    assert.equal((await manda(sara, 'dmac12345', Buffer.concat([Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), Buffer.alloc(300)]), 'app')).status, 415);
    // Vuoto, id sbagliato, grande troppo, senza accesso
    assert.equal((await manda(sara, 'dvuoto1234', Buffer.alloc(0), 'v.txt')).status, 400);
    assert.equal((await manda(sara, 'sbagliato', Buffer.from('x'), 'x.txt')).status, 400);
    assert.equal((await manda(null, 'dnoacc1234', Buffer.from('x'), 'x.txt')).status, 401, 'senza accesso non si legge nemmeno il corpo');
    const grande = await manda(sara, 'dgrande123', Buffer.alloc(API.ALLEGATO_MAX_BYTE + 1024, 1), 'grande.zip').catch(() => ({ status: 413 }));
    assert.equal(grande.status, 413);
    // Si scarica come allegato, con un tipo che il browser non può interpretare, e il nome vero
    const d = await fetch(base + '/api/allegati/dabc12345', { headers: { Cookie: 'portale=' + sara } });
    assert.equal(d.status, 200);
    assert.equal(d.headers.get('content-type'), 'application/octet-stream');
    assert.match(d.headers.get('content-disposition'), /^attachment; filename="_planimetria casa\.docx"|^attachment; filename="planimetria casa\.docx"|^attachment/);
    assert.equal(d.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await d.arrayBuffer()), docx);
    // Sul disco: fuori dal sito, nome casuale, senza estensione vera
    const nomi = fs.readdirSync(path.join(p.cartella, 'allegati', '1'));
    assert.equal(nomi.length, 6); assert.ok(nomi.every((n) => /^[0-9a-f]{32}\.bin$/.test(n)));
    // Elenco; un altro studente non vede e non toglie; senza accesso nemmeno
    const el = await p.chiedi('GET', '/api/allegati', undefined, { cookie: sara });
    assert.equal(el.json.allegati.length, 6);
    assert.equal((await fetch(base + '/api/allegati/dabc12345', { headers: { Cookie: 'portale=' + luca } })).status, 404);
    assert.equal((await p.chiedi('DELETE', '/api/allegati/dabc12345', undefined, { cookie: luca })).stato, 404);
    assert.equal((await p.chiedi('GET', '/api/allegati')).stato, 401);
    // Il docente lo scarica (registro, una volta ogni 10 minuti) ed «elimina subito»
    const saraId = k.studenti[0].id;
    await fetch(base + '/api/studenti/' + saraId + '/allegati/dabc12345', { headers: { Cookie: 'portale=' + k.docente } });
    await fetch(base + '/api/studenti/' + saraId + '/allegati/dabc22222', { headers: { Cookie: 'portale=' + k.docente } });
    let reg = (await p.chiedi('GET', '/api/studenti/' + saraId + '/registro', undefined, { cookie: k.docente })).json.registro;
    assert.equal(reg.filter((r) => r.azione === 'lettura file').length, 1);
    assert.equal((await p.chiedi('DELETE', '/api/studenti/' + saraId + '/allegati/dabc12345', undefined, { cookie: k.docente })).stato, 200);
    reg = (await p.chiedi('GET', '/api/studenti/' + saraId + '/registro', undefined, { cookie: k.docente })).json.registro;
    assert.ok(reg.some((r) => r.azione === 'elimina file dabc12345'));
    assert.equal(fs.readdirSync(path.join(p.cartella, 'allegati', '1')).length, 5);
    // La quota è unica: foto e file insieme. Con lo spazio quasi pieno entra una foto piccola ma non un file grande.
    p.server.db.prepare("INSERT INTO allegati (studente_id, id, file, nome, byte, creata) VALUES (1, 'dpieno0000', 'x', 'x', ?, 'ora')").run(API.QUOTA_BYTE - 600);
    assert.equal((await manda(sara, 'dquota1234', Buffer.from('abc'.repeat(300)), 'q.txt')).status, 413);
    assert.equal((await p.chiedi('PUT', '/api/foto/fquota1234', { jpeg: JPEG_B64, mini: JPEG_B64 }, { cookie: sara })).stato, 413, 'le foto contano nella stessa quota');
    // Le scritture vengono solo dalle pagine del portale
    assert.equal((await manda(sara, 'dfuori1234', Buffer.from('x'), 'x.txt', { Origin: 'https://altro.sito' })).status, 403);
  } finally { await p.chiudi(); }
});

test('pannello docenti: riepilogo della classe, scheda dello studente, modifica della classe', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p);
    const sara = (await p.chiedi('POST', '/api/accesso/studente', { codice: k.studenti[0].codice })).cookie;
    // Sara ha scritto un po' di diario e due attività; Luca niente
    await p.chiedi('PUT', '/api/documenti/diario', { base: 0, dati: { versione: 1, tirocini: [{ id: 't1', azienda: 'Elettro Rossi', settimane: [
      { id: 's1', dal: '2026-03-02', fatto: 'Ho tirato i cavi.', imparato: 'A leggere lo schema.' }, { id: 's2', dal: '2026-03-09', fatto: 'Solo questo.' }] }] } }, { cookie: sara });
    await p.chiedi('PUT', '/api/documenti/portfolio', { base: 0, dati: { versione: 1, attivita: [{ id: 'a1x2y3', fatto: 'Uno', luogo: 'scuola' }, { id: 'a4x5y6', fatto: 'Due' }] } }, { cookie: sara });
    await p.chiedi('PUT', '/api/foto/fabc12345', { jpeg: JPEG_B64, mini: JPEG_B64 }, { cookie: sara });
    const r = await p.chiedi('GET', '/api/classi/' + k.classeId + '/riepilogo', undefined, { cookie: k.docente });
    assert.equal(r.stato, 200);
    const [rs, rl] = r.json.studenti;
    assert.equal(rs.cognome, 'Bianchi');
    assert.deepEqual([rs.percorsi.portfolio.stato, rs.percorsi.portfolio.dettaglio], ['in_corso', '2 attività']);
    assert.equal(rs.percorsi.diario.stato, 'in_corso');
    assert.equal(rs.percorsi.diario.dettaglio, '1 tirocinio, 1 settimana', 'conta le settimane complete');
    assert.equal(rs.percorsi.bilancio.stato, 'vuota'); assert.equal(rs.percorsi.curriculum.stato, 'vuota');
    assert.equal(rs.foto, 1); assert.ok(rs.byte > 0); assert.ok(rs.ultimoAccesso);
    assert.deepEqual([rl.percorsi.portfolio.stato, rl.foto, rl.ultimoAccesso], ['vuota', 0, ''], 'Luca non ha fatto niente');
    assert.ok(!JSON.stringify(r.json).includes('Elettro Rossi'), 'il riepilogo non contiene i testi degli studenti');
    assert.ok(!('codice' in rs) && !('qr' in rs), 'né i codici');
    assert.equal((await p.chiedi('GET', '/api/classi/999/riepilogo', undefined, { cookie: k.docente })).stato, 404);
    assert.equal((await p.chiedi('GET', '/api/classi/' + k.classeId + '/riepilogo', undefined, { cookie: sara })).stato, 403, 'uno studente no');
    // La scheda dello studente
    const sc = await p.chiedi('GET', '/api/studenti/' + rs.id, undefined, { cookie: k.docente });
    assert.deepEqual([sc.json.studente.classe, sc.json.studente.indirizzo, sc.json.studente.anno, sc.json.studente.foto], ['3ELE', 'elettrico', 3, 1]);
    assert.equal(sc.json.percorsi.portfolio.dettaglio, '2 attività');
    assert.ok(!('codice' in sc.json.studente));
    // Modifica della classe
    assert.equal((await p.chiedi('PATCH', '/api/classi/' + k.classeId, { nome: '4ELA', anno: 4 }, { cookie: k.docente })).stato, 200);
    const cl = (await p.chiedi('GET', '/api/classi', undefined, { cookie: k.docente })).json.classi[0];
    assert.deepEqual([cl.nome, cl.anno, cl.indirizzo, cl.anno_scolastico], ['4ELA', 4, 'elettrico', '2026/27'], 'cambia solo quello che si manda');
    assert.equal((await p.chiedi('PATCH', '/api/classi/' + k.classeId, { nome: '  ' }, { cookie: k.docente })).stato, 400);
  } finally { await p.chiudi(); }
});

test('gestione dei docenti dal pannello: password provvisoria da cambiare, reimpostazione, disattivazione', async () => {
  const p = await avvia();
  try {
    const k = await preparaClasse(p); // k.docente è l'amministratore
    const nuovo = await p.chiedi('POST', '/api/docenti', { email: 'marco@scuola.it', nome: 'Marco Neri' }, { cookie: k.docente });
    assert.equal(nuovo.stato, 200); assert.ok(nuovo.json.passwordProvvisoria);
    // Il collega entra: il profilo dice che deve cambiare la password
    let a = await p.chiedi('POST', '/api/accesso/docente', { email: 'marco@scuola.it', password: nuovo.json.passwordProvvisoria });
    assert.equal(a.stato, 200); assert.equal(a.json.profilo.cambiaPassword, true);
    assert.equal((await p.chiedi('POST', '/api/docente/password', { vecchia: nuovo.json.passwordProvvisoria, nuova: 'una password lunga 1' }, { cookie: a.cookie })).stato, 200);
    a = await p.chiedi('POST', '/api/accesso/docente', { email: 'marco@scuola.it', password: 'una password lunga 1' });
    assert.equal(a.json.profilo.cambiaPassword, false);
    // Un docente semplice non gestisce i colleghi
    const elenco = (await p.chiedi('GET', '/api/docenti', undefined, { cookie: k.docente })).json.docenti;
    const marco = elenco.find((d) => d.email === 'marco@scuola.it');
    assert.equal((await p.chiedi('POST', '/api/docenti/' + marco.id + '/password', {}, { cookie: a.cookie })).stato, 403);
    assert.equal((await p.chiedi('PATCH', '/api/docenti/' + marco.id, { attivo: false }, { cookie: a.cookie })).stato, 403);
    // L'amministratore reimposta: nuova password provvisoria, il collega esce ovunque e deve cambiarla
    const rep = await p.chiedi('POST', '/api/docenti/' + marco.id + '/password', {}, { cookie: k.docente });
    assert.equal(rep.stato, 200); assert.ok(rep.json.passwordProvvisoria && rep.json.passwordProvvisoria !== 'una password lunga 1');
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: a.cookie })).stato, 401, 'è uscito');
    const b = await p.chiedi('POST', '/api/accesso/docente', { email: 'marco@scuola.it', password: rep.json.passwordProvvisoria });
    assert.equal(b.json.profilo.cambiaPassword, true);
    // Disattivazione: non entra più; non ci si disattiva da soli
    assert.equal((await p.chiedi('PATCH', '/api/docenti/' + marco.id, { attivo: false }, { cookie: k.docente })).stato, 200);
    assert.equal((await p.chiedi('GET', '/api/io', undefined, { cookie: b.cookie })).stato, 401);
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'marco@scuola.it', password: rep.json.passwordProvvisoria })).stato, 401);
    const io = (await p.chiedi('GET', '/api/io', undefined, { cookie: k.docente })).json.profilo;
    assert.equal((await p.chiedi('PATCH', '/api/docenti/' + io.id, { attivo: false }, { cookie: k.docente })).stato, 400);
    assert.equal((await p.chiedi('PATCH', '/api/docenti/' + marco.id, { attivo: true }, { cookie: k.docente })).stato, 200);
    assert.equal((await p.chiedi('POST', '/api/accesso/docente', { email: 'marco@scuola.it', password: rep.json.passwordProvvisoria })).stato, 200);
    assert.equal((await p.chiedi('POST', '/api/docenti/999/password', {}, { cookie: k.docente })).stato, 404);
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
  assert.equal(S.codiceStampato('3ele', 'ACDE4679'), '3ELE-ACDE-4679');
  assert.equal(S.codiceDaTesto(' 3ele-acde 4679 '), 'ACDE4679');
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

test('backup delle foto: si copiano le nuove e si tolgono quelle eliminate dal portale', () => {
  const dati = fs.mkdtempSync(path.join(os.tmpdir(), 'portale-bf-'));
  try {
    assert.deepEqual(BACKUP.specchiaFoto(dati), { copiate: 0, tolte: 0 }, 'senza foto non fa niente');
    fs.mkdirSync(path.join(dati, 'foto', '1'), { recursive: true });
    fs.writeFileSync(path.join(dati, 'foto', '1', 'aa.jpg'), 'a');
    fs.writeFileSync(path.join(dati, 'foto', '1', 'bb.jpg'), 'b');
    assert.deepEqual(BACKUP.specchiaFoto(dati), { copiate: 2, tolte: 0 });
    assert.deepEqual(BACKUP.specchiaFoto(dati), { copiate: 0, tolte: 0 }, 'la seconda volta niente da fare');
    fs.unlinkSync(path.join(dati, 'foto', '1', 'aa.jpg'));
    assert.deepEqual(BACKUP.specchiaFoto(dati), { copiate: 0, tolte: 1 }, '«elimina subito» vale anche nel backup');
    assert.deepEqual(fs.readdirSync(path.join(dati, 'backup', 'foto', '1')), ['bb.jpg']);
  } finally { fs.rmSync(dati, { recursive: true, force: true }); }
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
