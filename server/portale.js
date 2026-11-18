/* Portale dello studente — programma del server (fase F0: fondamenta).
   Ascolta solo su 127.0.0.1: da fuori ci si arriva soltanto attraverso Apache, che inoltra il percorso /api/.
   Nessuna dipendenza esterna: server HTTP standard di Node e SQLite integrato.

   Configurazione (variabili d'ambiente, sul server in /etc/portale/portale.env):
     PORTALE_PORTA    porta locale (predefinita 3100)
     PORTALE_DATI     cartella dei dati (predefinita /var/lib/portale)
     PORTALE_ORIGINE  indirizzo pubblico dei siti, per esempio https://portale.esempio.it
                      (le richieste che scrivono devono arrivare da qui)

   Avvio: node server/portale.js */
'use strict';

const http = require('node:http');
const path = require('node:path');
const DB = require('./db.js');

const VERSIONE = '0.1.0';
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

function rispondi(res, stato, oggetto) {
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

function creaServer(opzioni) {
  const o = opzioni || {};
  const db = o.db || DB.apri(path.join(o.dati || '/var/lib/portale', 'portale.sqlite'));
  const origine = o.origine || '';
  const avvio = new Date().toISOString();

  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, 'http://locale');
    const via = url.pathname;
    const metodo = req.method;

    Promise.resolve().then(async function () {
      if (!via.startsWith('/api/')) return rispondi(res, 404, { ok: false, errore: 'percorso' });

      if (metodo !== 'GET' && metodo !== 'HEAD' && !richiestaFidata(req, origine)) {
        req.resume();
        return rispondi(res, 403, { ok: false, errore: 'origine' });
      }

      // «Sono vivo»: risponde anche il database.
      if (via === '/api/stato' && (metodo === 'GET' || metodo === 'HEAD')) {
        return rispondi(res, 200, { ok: true, versione: VERSIONE, schema: DB.versione(db), avvio: avvio });
      }

      // Prova del limite e della lettura del corpo, usata dai test: non salva niente.
      if (via === '/api/eco' && metodo === 'POST') {
        const corpo = await leggiCorpo(req, MAX_CORPO);
        let dati;
        try { dati = JSON.parse(corpo.toString('utf8') || 'null'); } catch (e) { return rispondi(res, 400, { ok: false, errore: 'json' }); }
        return rispondi(res, 200, { ok: true, byte: corpo.length, tipo: dati === null ? 'null' : typeof dati });
      }

      req.resume();
      return rispondi(res, 404, { ok: false, errore: 'percorso' });
    }).catch(function (e) {
      if (e && e.stato === 413) { res.setHeader('Connection', 'close'); return rispondi(res, 413, { ok: false, errore: 'dimensione' }); }
      try { DB.annota(db, 'errore', e && e.message); } catch (e2) { /* il registro non deve fermare la risposta */ }
      if (!res.headersSent) rispondi(res, 500, { ok: false, errore: 'interno' });
    });
  });

  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.db = db;
  return server;
}

if (require.main === module) {
  const porta = Number(process.env.PORTALE_PORTA || 3100);
  const dati = process.env.PORTALE_DATI || '/var/lib/portale';
  const origine = (process.env.PORTALE_ORIGINE || '').replace(/\/+$/, '');
  if (!origine) console.warn('Attenzione: PORTALE_ORIGINE non è impostata, le richieste che scrivono non controllano l\'origine.');
  const server = creaServer({ dati: dati, origine: origine });
  server.listen(porta, '127.0.0.1', function () {
    DB.annota(server.db, 'avvio', 'versione ' + VERSIONE);
    console.log('Portale in ascolto su 127.0.0.1:' + porta + ' (dati in ' + dati + ')');
  });
  const ferma = function () { server.close(function () { server.db.close(); process.exit(0); }); };
  process.on('SIGTERM', ferma);
  process.on('SIGINT', ferma);
}

module.exports = { creaServer, VERSIONE, MAX_CORPO };
