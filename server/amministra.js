/* Portale dello studente — amministrazione dal terminale del server.
   Si esegue come utente «portale», che è l'unico a poter aprire i dati:
     sudo -u portale /opt/portale/node/bin/node /opt/portale/app/server/amministra.js <comando>

   Comandi:
     crea-docente EMAIL "NOME COGNOME" [--admin]   crea un docente e stampa la password provvisoria
     reimposta-password EMAIL                       nuova password provvisoria (il docente esce ovunque)
     disattiva-docente EMAIL                        il docente non può più entrare
     elenco-docenti
     stato                                          numeri del database (nessun dato personale) */
'use strict';

const path = require('node:path');
const DB = require('./db.js');
const API = require('./api.js');
const S = require('./sicurezza.js');

async function esegui(argomenti, db) {
  const [comando, ...resto] = argomenti;
  const api = API.creaApi(db);
  const docente = function (email) { return db.prepare('SELECT * FROM docenti WHERE email = ?').get(String(email || '').toLowerCase()); };

  if (comando === 'crea-docente') {
    const admin = resto.includes('--admin');
    const [email, nome] = resto.filter(function (x) { return x !== '--admin'; });
    const r = await api.creaDocente({ email: email, nome: nome, admin: admin });
    if (r.errore) return 'Non creato: ' + ({ email: 'email non valida', nome: 'manca il nome', esiste: 'esiste già' }[r.errore] || r.errore);
    DB.annota(db, 'docente creato', 'id ' + r.id + (admin ? ' (admin)' : ''));
    return 'Creato ' + r.email + (admin ? ' (amministratore)' : '') + '\nPassword provvisoria: ' + r.passwordProvvisoria +
      '\nComunicala a voce o di persona; il docente la cambia al primo accesso.';
  }
  if (comando === 'reimposta-password') {
    const d = docente(resto[0]);
    if (!d) return 'Docente non trovato.';
    const provvisoria = S.casuale(14, 'abcdefghjkmnpqrstuvwxyz23456789');
    db.prepare('UPDATE docenti SET password = ?, deve_cambiare = 1 WHERE id = ?').run(await S.hashPassword(provvisoria), d.id);
    db.prepare("DELETE FROM sessioni WHERE tipo = 'docente' AND utente_id = ?").run(d.id);
    DB.annota(db, 'password reimpostata', 'id ' + d.id);
    return 'Nuova password provvisoria per ' + d.email + ': ' + provvisoria;
  }
  if (comando === 'disattiva-docente') {
    const d = docente(resto[0]);
    if (!d) return 'Docente non trovato.';
    db.prepare('UPDATE docenti SET attivo = 0 WHERE id = ?').run(d.id);
    db.prepare("DELETE FROM sessioni WHERE tipo = 'docente' AND utente_id = ?").run(d.id);
    DB.annota(db, 'docente disattivato', 'id ' + d.id);
    return 'Disattivato ' + d.email + '.';
  }
  if (comando === 'elenco-docenti') {
    const righe = db.prepare('SELECT email, nome, admin, attivo FROM docenti ORDER BY nome').all();
    return righe.length ? righe.map(function (d) { return (d.attivo ? '  ' : 'x ') + d.nome + ' <' + d.email + '>' + (d.admin ? ' [admin]' : ''); }).join('\n') : 'Nessun docente.';
  }
  if (comando === 'stato') {
    const n = function (t) { return db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n; };
    return 'Schema ' + DB.versione(db) + ': ' + n('classi') + ' classi, ' + n('studenti') + ' studenti, ' + n('docenti') + ' docenti, ' +
      n('documenti') + ' documenti, ' + n('revisioni') + ' revisioni, ' + n('sessioni') + ' sessioni.';
  }
  return 'Comandi: crea-docente EMAIL "NOME" [--admin] | reimposta-password EMAIL | disattiva-docente EMAIL | elenco-docenti | stato';
}

if (require.main === module) {
  const db = DB.apri(path.join(process.env.PORTALE_DATI || '/var/lib/portale', 'portale.sqlite'));
  esegui(process.argv.slice(2), db).then(function (t) { console.log(t); db.close(); }, function (e) { console.error('Errore: ' + e.message); db.close(); process.exit(1); });
}

module.exports = { esegui };
