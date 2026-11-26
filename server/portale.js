/* Portale dello studente — programma del server (fase F0: fondamenta).
   Ascolta solo su 127.0.0.1: da fuori ci si arriva soltanto attraverso Apache, che inoltra il percorso /api/.
   Nessuna dipendenza esterna: server HTTP standard di Node e SQLite integrato.

   Configurazione (variabili d'ambiente, sul server in /etc/portale/portale.env):
     PORTALE_PORTA    porta locale (predefinita 3100)
     PORTALE_DATI     cartella dei dati (predefinita /var/lib/portale)
     PORTALE_ORIGINE  indirizzo pubblico dei siti, per esempio https://portale.esempio.it
                      (le richieste che scrivono devono arrivare da qui)
     PORTALE_PERCORSO cartella dei siti nell'indirizzo, per esempio /gcatalfamo/ (predefinita /):
                      il cookie vale solo per PORTALE_PERCORSO + api/

   Avvio: node server/portale.js */
'use strict';

const http = require('node:http');
const path = require('node:path');
const DB = require('./db.js');
const API = require('./api.js');

const VERSIONE = '0.2.0';
const MAX_CORPO = 1024 * 1024; // 1 MB: il documento più grande previsto dal piano (§5)

// Intestazioni di sicurezza su ogni risposta dell'API (Apache non ha mod_headers attivo).
const INTESTAZIONI = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Una foto: JPEG consegnato solo a chi ha il permesso (lo decide api.js), mai in cache condivise.
function rispondiBinario(res, stato, byte, tipo) {
  res.writeHead(stato, {
    'Content-Type': tipo, 'Content-Length': byte.length, 'Cache-Control': 'private, max-age=60',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin'
  });
  res.end(byte);
}

function rispondi(res, stato, oggetto) {
  if (oggetto && oggetto.binario) return rispondiBinario(res, stato, oggetto.binario, oggetto.tipo || 'application/octet-stream');
  const corpo = JSON.stringify(oggetto);
  res.writeHead(stato, Object.assign({ 'Content-Length': Buffer.byteLength(corpo) }, INTESTAZIONI));
  res.end(corpo);
}

// Legge il corpo della richiesta fermandosi oltre il limite, senza tenerlo tutto in memoria.
function leggiCorpo(req, limite) {
  return new Promise(function (ok, ko) {
    const dichiarata = Number(req.headers['content-length'] || 0);
    if (dichiarata > limite) { const e = new Error('troppo grande'); e.stato = 413; ko(e); req.resume(); return; }
    const pezzi = []; let n = 0; let finito = false;
    req.on('data', function (p) {
      if (finito) return;
      n += p.length;
      if (n > limite) { finito = true; const e = new Error('troppo grande'); e.stato = 413; ko(e); return; }
      pezzi.push(p);
    });
    req.on('end', function () { if (!finito) ok(Buffer.concat(pezzi)); });
    req.on('error', ko);
  });
}

// Una richiesta che scrive deve venire dalle pagine del portale: stessa origine e intestazione propria.
// Una pagina di un altro sito non può aggiungere X-Portale senza il permesso del server (CORS), che non diamo.
function richiestaFidata(req, origine) {
  if (req.headers['x-portale'] !== '1') return false;
  if (!origine) return true; // solo in prova, senza PORTALE_ORIGINE
  return req.headers.origin === origine;
}

const NOME_COOKIE = 'portale';            // la sessione
const NOME_DISPOSITIVO = 'portale_disp';  // cookie tecnico del dispositivo, per il limite dei tentativi

function leggiCookie(req, nome) {
  const h = req.headers.cookie || '';
  for (const parte of h.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return '';
}

// L'IP del visitatore: dietro Apache arriva in X-Forwarded-For (Apache aggiunge l'ultimo valore).
// Da un programma locale (per esempio una pagina PHP sul server) questa intestazione può essere falsa:
// per questo il limite dei tentativi conta per dispositivo e non si fida dell'IP (vedi api.js).
function ipDi(req) {
  const diretto = req.socket.remoteAddress || '';
  const locale = diretto === '127.0.0.1' || diretto === '::1' || diretto === '::ffff:127.0.0.1';
  const inoltrato = String(req.headers['x-forwarded-for'] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  return locale && inoltrato.length ? inoltrato[inoltrato.length - 1] : diretto;
}

function creaServer(opzioni) {
  const o = opzioni || {};
  const db = o.db || DB.apri(path.join(o.dati || '/var/lib/portale', 'portale.sqlite'));
  const origine = o.origine || '';
  const percorsoCookie = (o.percorso || '/').replace(/\/?$/, '/') + 'api/';
  const cookieSicuro = o.cookieSicuro !== false;
  const avvio = new Date().toISOString();
  const cookie = function (nome, valore, secondi) {
    let v = nome + '=' + valore + '; Path=' + percorsoCookie + '; HttpOnly; SameSite=Strict';
    if (cookieSicuro) v += '; Secure';
    if (secondi > 0) v += '; Max-Age=' + secondi;
    if (secondi < 0) v += '; Max-Age=0';
    return v;
  };
  const api = API.creaApi(db, { cartellaFoto: o.dati ? path.join(o.dati, 'foto') : '' });
  api.pulisci();
  const pulizia = setInterval(function () { try { api.pulisci(); } catch (e) { /* riprova alla prossima */ } }, 3600 * 1000);
  pulizia.unref();

  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, 'http://locale');
    const via = url.pathname;
    const metodo = req.method;
    const cookieDaImpostare = [];

    Promise.resolve().then(async function () {
      if (!via.startsWith('/api/')) return rispondi(res, 404, { ok: false, errore: 'percorso' });

      const scrive = metodo !== 'GET' && metodo !== 'HEAD';
      if (scrive && !richiestaFidata(req, origine)) {
        req.resume();
        return rispondi(res, 403, { ok: false, errore: 'origine' });
      }

      // «Sono vivo»: risponde anche il database.
      if (via === '/api/stato' && !scrive) {
        return rispondi(res, 200, { ok: true, versione: VERSIONE, schema: DB.versione(db), avvio: avvio });
      }

      let corpo = null;
      if (scrive) {
        const byte = await leggiCorpo(req, MAX_CORPO);
        if (byte.length) {
          try { corpo = JSON.parse(byte.toString('utf8')); } catch (e) { return rispondi(res, 400, { ok: false, errore: 'json' }); }
        }
      } else {
        req.resume();
      }

      const c = {
        req: req, via: via, metodo: metodo, corpo: corpo, ip: ipDi(req),
        cookie: leggiCookie(req, NOME_COOKIE), cookieDispositivo: leggiCookie(req, NOME_DISPOSITIVO),
        impostaCookie: function (valore, secondi) { cookieDaImpostare.push(cookie(NOME_COOKIE, valore, secondi)); },
        impostaCookieDispositivo: function (valore) { cookieDaImpostare.push(cookie(NOME_DISPOSITIVO, valore, 365 * 24 * 3600)); }
      };
      const r = await api.gestisci(c);
      if (!r) return rispondi(res, 404, { ok: false, errore: 'percorso' });
      if (cookieDaImpostare.length) res.setHeader('Set-Cookie', cookieDaImpostare);
      return rispondi(res, r[0], r[1]);
    }).catch(function (e) {
      if (e && e.stato === 413) { res.setHeader('Connection', 'close'); return rispondi(res, 413, { ok: false, errore: 'dimensione' }); }
      try { DB.annota(db, 'errore', (e && e.message) || String(e)); } catch (e2) { /* il registro non deve fermare la risposta */ }
      if (o.mostraErrori) console.error(e);
      if (!res.headersSent) rispondi(res, 500, { ok: false, errore: 'interno' });
    });
  });

  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.db = db;
  server.api = api;
  server.on('close', function () { clearInterval(pulizia); });
  return server;
}

if (require.main === module) {
  const porta = Number(process.env.PORTALE_PORTA || 3100);
  const dati = process.env.PORTALE_DATI || '/var/lib/portale';
  const origine = (process.env.PORTALE_ORIGINE || '').replace(/\/+$/, '');
  if (!origine) console.warn('Attenzione: PORTALE_ORIGINE non è impostata, le richieste che scrivono non controllano l\'origine.');
  const percorso = process.env.PORTALE_PERCORSO || '/';
  const server = creaServer({ dati: dati, origine: origine, percorso: percorso });
  server.listen(porta, '127.0.0.1', function () {
    DB.annota(server.db, 'avvio', 'versione ' + VERSIONE);
    console.log('Portale in ascolto su 127.0.0.1:' + porta + ' (dati in ' + dati + ')');
  });
  const ferma = function () { server.close(function () { server.db.close(); process.exit(0); }); };
  process.on('SIGTERM', ferma);
  process.on('SIGINT', ferma);
}

module.exports = { creaServer, VERSIONE, MAX_CORPO };
