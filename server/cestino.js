'use strict';
// Il cestino (piano §4): quando un salvataggio toglie una voce da un documento (un'attività, un tirocinio, una settimana,
// un'esperienza…), la voce non va persa: si conserva per 30 giorni e si può rimettere al suo posto.
// Qui c'è solo la logica pura (nessun database): trovare le voci tolte, dare un titolo, rimetterle nel documento.

const GIORNI = 30;
const MAX_PER_SALVATAGGIO = 200;
const MAX_PER_STUDENTE = 500;

function oggetto(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function elencoConId(v) { return Array.isArray(v) && v.length > 0 && v.every(function (x) { return oggetto(x) && typeof x.id === 'string' && x.id !== ''; }); }

// Una voce vale la pena di essere conservata se ha dentro qualcosa di scritto o di scelto: una scheda appena creata e
// subito tolta non deve riempire il cestino.
const CAMPI_NOME = ['titolo', 'azienda', 'nome', 'dove', 'istituto', 'qualifica']; // testi liberi anche se corti
function haContenuto(voce) {
  return Object.keys(voce).some(function (k) {
    if (k === 'id') return false;
    const v = voce[k];
    if (typeof v === 'string') return v.length >= 12 || (CAMPI_NOME.indexOf(k) !== -1 && v.trim().length >= 2);
    if (Array.isArray(v)) return v.length > 0;
    if (oggetto(v)) return haContenuto(v);
    return false;
  });
}

// Le voci che c'erano in «prima» e non ci sono più in «dopo». Si cerca dentro gli oggetti e dentro le voci rimaste
// (le settimane di un tirocinio che resta); di una voce tolta si conserva tutto, con quello che ha dentro.
// percorso: i nomi da seguire per arrivare all'elenco; «@id» vuol dire «la voce con quell'id».
function vociTolte(prima, dopo, percorso, out) {
  out = out || []; percorso = percorso || [];
  if (!oggetto(prima) || !oggetto(dopo)) return out;
  Object.keys(prima).forEach(function (k) {
    const a = prima[k]; const b = dopo[k];
    if (elencoConId(a)) {
      const nuove = {};
      (Array.isArray(b) ? b : []).forEach(function (x) { if (oggetto(x) && typeof x.id === 'string') nuove[x.id] = x; });
      a.forEach(function (x) {
        if (!nuove[x.id]) { if (haContenuto(x)) out.push({ percorso: percorso.concat([k]), voce: x }); }
        else vociTolte(x, nuove[x.id], percorso.concat([k, '@' + x.id]), out);
      });
    } else if (oggetto(a) && oggetto(b)) vociTolte(a, b, percorso.concat([k]), out);
  });
  return out;
}

// Il «contenitore» di un percorso dentro un documento, oppure null se non c'è più (per esempio il tirocinio è stato tolto).
function elencoDi(dati, percorso, crea) {
  let cur = dati;
  for (let i = 0; i < percorso.length; i++) {
    const t = percorso[i];
    if (t.charAt(0) === '@') {
      if (!Array.isArray(cur)) return null;
      const id = t.slice(1);
      cur = cur.find(function (x) { return x && x.id === id; });
      if (!cur) return null;
    } else {
      if (!oggetto(cur)) return null;
      if (i === percorso.length - 1) {
        if (!Array.isArray(cur[t])) { if (!crea) return null; cur[t] = []; }
        return cur[t];
      }
      cur = cur[t];
      if (cur === undefined) return null;
    }
  }
  return null;
}

// Rimette la voce nel documento. Ritorna {dati} oppure {errore: 'contenitore'} se il posto non c'è più, oppure {gia: true}
// se una voce con quell'id c'è già.
function rimetti(dati, percorso, voce) {
  const copia = JSON.parse(JSON.stringify(dati));
  const el = elencoDi(copia, percorso, true);
  if (!el) return { errore: 'contenitore' };
  if (el.some(function (x) { return x && x.id === voce.id; })) return { gia: true, dati: copia };
  el.push(voce);
  return { dati: copia };
}

const TITOLI = ['titolo', 'azienda', 'fatto', 'nome', 'dove', 'qualifica', 'istituto', 'luogo'];
function titoloDi(voce) {
  for (let i = 0; i < TITOLI.length; i++) {
    const v = voce[TITOLI[i]];
    if (typeof v === 'string' && v.trim().length >= 2) { const t = v.trim().replace(/\s+/g, ' '); return t.length > 70 ? t.slice(0, 69) + '…' : t; }
  }
  if (typeof voce.dal === 'string' && voce.dal) return 'dal ' + voce.dal;
  return '';
}
// Che cosa è la voce: l'ultimo nome del percorso («attivita», «tirocini», «settimane»…).
function genereDi(percorso) {
  for (let i = percorso.length - 1; i >= 0; i--) if (percorso[i].charAt(0) !== '@') return percorso[i];
  return '';
}

// Gli id di foto e file dentro una voce (un'attività): servono per rimetterli a posto o toglierli davvero.
function riferimenti(voce) {
  const foto = []; const file = [];
  (function visita(v) {
    if (Array.isArray(v)) { v.forEach(visita); return; }
    if (!oggetto(v)) return;
    if (Array.isArray(v.foto)) v.foto.forEach(function (x) { if (typeof x === 'string') foto.push(x); });
    if (Array.isArray(v.file)) v.file.forEach(function (x) { if (x && typeof x.id === 'string') file.push(x.id); });
    Object.keys(v).forEach(function (k) { if (k !== 'foto' && k !== 'file') visita(v[k]); });
  })(voce);
  return { foto: foto, file: file };
}

module.exports = { GIORNI, MAX_PER_SALVATAGGIO, MAX_PER_STUDENTE, vociTolte, rimetti, titoloDi, genereDi, riferimenti, haContenuto };
