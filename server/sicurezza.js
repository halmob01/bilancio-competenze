/* Portale dello studente — codici, password, sessioni e limite dei tentativi.
   Nessuna dipendenza: usa il modulo crypto di Node. */
'use strict';

const crypto = require('node:crypto');

// Alfabeto senza lettere e cifre che si confondono (0/O, 1/I/L, 5/S, 2/Z, 8/B).
const ALFABETO = 'ACDEFGHJKMNPQRTUVWXY34679';

function casuale(n, alfabeto) {
  const a = alfabeto || ALFABETO;
  const byte = crypto.randomBytes(n * 2);
  let s = '';
  for (let i = 0; s.length < n; i++) {
    if (i >= byte.length) return s + casuale(n - s.length, a);
    const v = byte[i];
    if (v < 256 - (256 % a.length)) s += a[v % a.length]; // niente sbilanciamento verso le prime lettere
  }
  return s;
}

// Codice del cartellino: 8 caratteri (25^8 ≈ 1,5 × 10^11 combinazioni), stampati in due gruppi.
// La sigla della classe davanti è solo un aiuto per chi legge: non conta per l'accesso,
// così il cartellino resta valido anche quando lo studente cambia classe.
const LUNGHEZZA_CODICE = 8;
function nuovoCodice() { return casuale(LUNGHEZZA_CODICE); }
function codiceStampato(sigla, codice) {
  const s = String(sigla || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return (s ? s + '-' : '') + codice.slice(0, 4) + '-' + codice.slice(4);
}
// Da quello che lo studente scrive (spazi, trattini, minuscole, sigla) ricava il codice vero.
function codiceDaTesto(t) {
  const pulito = String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (pulito.length < LUNGHEZZA_CODICE) return '';
  const c = pulito.slice(-LUNGHEZZA_CODICE);
  return /^[ACDEFGHJKMNPQRTUVWXY34679]+$/.test(c) ? c : '';
}

// Il QR porta un codice lungo e diverso, che nessuno deve digitare.
function nuovoCodiceQr() { return crypto.randomBytes(24).toString('base64url'); }

// Token di sessione: nel cookie va il token, nel database solo la sua impronta.
function nuovoToken() { return crypto.randomBytes(32).toString('base64url'); }
function impronta(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }

// Password dei docenti: scrypt con sale casuale.
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function hashPassword(pw) {
  return new Promise(function (ok, ko) {
    const sale = crypto.randomBytes(16);
    crypto.scrypt(String(pw), sale, 32, SCRYPT, function (e, k) {
      if (e) ko(e); else ok('scrypt$' + SCRYPT.N + '$' + sale.toString('base64') + '$' + k.toString('base64'));
    });
  });
}
function verificaPassword(pw, salvato) {
  return new Promise(function (ok) {
    const p = String(salvato || '').split('$');
    if (p.length !== 4 || p[0] !== 'scrypt') {
      // Fa comunque il calcolo, perché il tempo di risposta non riveli se l'account esiste.
      crypto.scrypt(String(pw), 'nessuno', 32, SCRYPT, function () { ok(false); });
      return;
    }
    const opz = Object.assign({}, SCRYPT, { N: Number(p[1]) });
    const atteso = Buffer.from(p[3], 'base64');
    crypto.scrypt(String(pw), Buffer.from(p[2], 'base64'), atteso.length, opz, function (e, k) {
      ok(!e && crypto.timingSafeEqual(k, atteso));
    });
  });
}
function passwordValida(pw) { return typeof pw === 'string' && pw.length >= 10 && pw.length <= 200; }

// Limite dei tentativi sbagliati, in memoria (il programma è uno solo).
// Conta per una chiave (un IP, un'email) e anche nel complesso: sul server girano pagine PHP di altri,
// che possono chiamare il programma direttamente e fingere qualsiasi IP.
function creaLimite(opz) {
  const finestra = opz.finestraMs;
  const perChiave = opz.perChiave;
  const totale = opz.totale;
  const errori = new Map(); // chiave -> [istanti]
  let tutti = [];
  const pulisci = function (arr, ora) { while (arr.length && arr[0] <= ora - finestra) arr.shift(); return arr; };
  return {
    bloccato: function (chiave, ora) {
      const t = ora || Date.now();
      pulisci(tutti, t);
      const a = errori.get(chiave);
      return tutti.length >= totale || (a ? pulisci(a, t).length >= perChiave : false);
    },
    errore: function (chiave, ora) {
      const t = ora || Date.now();
      tutti.push(t);
      if (!errori.has(chiave)) errori.set(chiave, []);
      errori.get(chiave).push(t);
      if (errori.size > 5000) { errori.forEach(function (v, k) { if (!pulisci(v, t).length) errori.delete(k); }); }
    },
    riuscito: function (chiave) { errori.delete(chiave); }
  };
}

module.exports = {
  ALFABETO, LUNGHEZZA_CODICE, casuale, nuovoCodice, codiceStampato, codiceDaTesto, nuovoCodiceQr,
  nuovoToken, impronta, hashPassword, verificaPassword, passwordValida, creaLimite
};
