/* Unione di due versioni dello stesso documento (questo dispositivo e il server), partendo dall'ultima versione comune.
   Serve quando lo stesso lavoro è cambiato su due dispositivi, o un docente l'ha corretto mentre lo studente scriveva.
   Regole (piano del portale §5):
   - si unisce voce per voce: gli elenchi di oggetti con un «id» (tirocini, settimane, esperienze, attività…) si uniscono
     per id, gli altri valori campo per campo;
   - se una voce è cambiata da una parte sola, vince quel cambiamento;
   - se la stessa voce è cambiata da tutte e due le parti in modo diverso è un conflitto: si sceglie la parte indicata
     (preferenza 'locale' o 'server') e il conflitto viene segnalato, così lo studente può decidere;
   - una voce cancellata da una parte e modificata dall'altra non si perde: resta la versione modificata;
   - «aggiornato» non è una voce: vale il più recente.
   Logica pura, senza DOM: usata dal browser (window.BC_UNIONE) e dai test Node. */
(function (radice) {
  'use strict';

  function uguali(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function oggetto(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function elencoConId(v) {
    return Array.isArray(v) && v.every(function (x) { return oggetto(x) && typeof x.id === 'string' && x.id !== ''; });
  }

  function unisci(base, locale, server, preferenza) {
    const conflitti = [];
    const pref = preferenza === 'server' ? 'server' : 'locale';

    function valore(b, l, s, via) {
      if (uguali(l, s)) return l;
      if (b !== undefined && uguali(l, b)) return s;
      if (b !== undefined && uguali(s, b)) return l;
      // Cambiati tutti e due: si scende dentro se si può, altrimenti è un conflitto.
      if (oggetto(l) && oggetto(s)) return oggetti(oggetto(b) ? b : {}, l, s, via, b === undefined || !oggetto(b));
      if (elencoConId(l) && elencoConId(s) && (b === undefined || elencoConId(b))) return elenchi(b || [], l, s, via);
      conflitti.push(via || '(documento)');
      return pref === 'server' ? s : l;
    }

    function oggetti(b, l, s, via, senzaBase) {
      const out = {};
      const chiavi = Object.keys(l).concat(Object.keys(s).filter(function (k) { return !(k in l); }));
      chiavi.forEach(function (k) {
        const v = via ? via + '.' + k : k;
        if (k === 'aggiornato' && typeof l[k] === 'string' && typeof s[k] === 'string') { out[k] = l[k] > s[k] ? l[k] : s[k]; return; }
        const bk = senzaBase ? undefined : b[k];
        if (!(k in s)) { out[k] = l[k]; return; }
        if (!(k in l)) { out[k] = s[k]; return; }
        out[k] = valore(bk, l[k], s[k], v);
      });
      return out;
    }

    function elenchi(b, l, s, via) {
      const perId = function (arr) { const m = {}; arr.forEach(function (x) { m[x.id] = x; }); return m; };
      const mb = perId(b); const ml = perId(l); const ms = perId(s);
      // Ordine: quello di questo dispositivo, poi le voci nuove arrivate dal server.
      const ordine = l.map(function (x) { return x.id; }).concat(s.map(function (x) { return x.id; }).filter(function (id) { return !ml[id]; }));
      const out = [];
      ordine.forEach(function (id) {
        const v = (via || '') + '[' + id + ']';
        const xb = mb[id]; const xl = ml[id]; const xs = ms[id];
        if (xl && xs) { out.push(valore(xb, xl, xs, v)); return; }
        if (xb) {
          // C'era: una parte l'ha tolta. Se l'altra non l'ha toccata la si toglie; se l'ha cambiata, resta.
          const rimasta = xl || xs;
          if (!uguali(rimasta, xb)) out.push(rimasta);
          return;
        }
        out.push(xl || xs); // nuova da una parte sola
      });
      return out;
    }

    let dati;
    if (base === undefined || base === null) dati = valore(undefined, locale, server, '');
    else dati = valore(base, locale, server, '');
    return { dati: dati, conflitti: conflitti };
  }

  const UNIONE = { unisci: unisci, uguali: uguali };
  if (typeof module !== 'undefined' && module.exports) module.exports = UNIONE;
  else radice.BC_UNIONE = UNIONE;
})(typeof window !== 'undefined' ? window : globalThis);
