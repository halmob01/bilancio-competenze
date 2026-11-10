'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const D = require('../js/dati.js');
const L = require('../js/bilancio.js');

function conEsperienza(stato, campi) {
  const e = Object.assign(L.esperienzaVuota(), campi);
  stato.esperienze.push(e);
  return e;
}

test('sei sezioni, schermate con un solo compito (il curriculum è un sito a parte)', () => {
  assert.equal(D.SEZIONI.length, 6);
  assert.deepEqual(D.SEZIONI.map((x) => x.id), ['percorso', 'esperienze', 'sofare', 'sguardo', 'bilancio', 'orientamento']);
  D.SEZIONI.forEach((s) => assert.ok(s.schermate.length >= 1, s.id));
  // «Che cosa so fare» è in due tempi (livello, poi esempio); lo sguardo critico ha le tre domande insieme.
  // Gli id delle sei situazioni e delle tre risposte non cambiano mai (li legge lo script del docente).
  assert.deepEqual(D.SEZIONI[2].schermate.map((x) => x.id), ['livelli', 'esempi']);
  assert.deepEqual(D.SEZIONI[3].schermate.map((x) => x.id), ['domande']);
  assert.deepEqual(D.SGUARDO.map((x) => x.id), ['scuola', 'tirocinio', 'ancora']);
  assert.deepEqual(D.SITUAZIONI.map((x) => x.id), ['capire', 'fare', 'collaborare', 'verificare', 'spiegare', 'migliorare']);
});

test('ogni situazione ha un esempio per ciascun indirizzo', () => {
  D.SITUAZIONI.forEach((s) => {
    D.INDIRIZZI.forEach((i) => assert.ok(s.esempi[i.id] && s.esempi[i.id].length > 20, s.id + '/' + i.id));
  });
  D.INDIRIZZI.forEach((i) => assert.ok(D.ESEMPI_ESPERIENZA[i.id], i.id));
});

test('scala di autonomia: «mai affrontato» distinto da «non lo so fare»', () => {
  const ids = D.AUTONOMIA.map((a) => a.id);
  assert.ok(ids.includes('mai'));
  assert.ok(ids.includes('non_ancora'));
  assert.notEqual(D.AUTONOMIA[0].testo, D.AUTONOMIA[1].testo);
  assert.ok(D.AUTONOMIA.every((a) => /[a-z]/.test(a.testo)), 'solo opzioni testuali');
});

test('nessun linguaggio da gamification nei testi', () => {
  const testi = JSON.stringify(D) + fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  ['superpoter', 'livello sbloccato', 'sblocca', 'XP', 'punti esperienza', 'badge', 'complimenti!'].forEach((p) => {
    assert.ok(!testi.toLowerCase().includes(p.toLowerCase()), p);
  });
});

test('una competenza dichiarata senza esempio resta da documentare', () => {
  const s = L.statoVuoto();
  s.sofare.capire.livello = 'autonomo_noto';
  let b = L.componiBilancio(s);
  assert.equal(b.soFare.length, 0);
  assert.equal(b.daDocumentare.length, 1);
  assert.equal(L.statoSezione(s, 'sofare'), 'in_corso');

  s.sofare.capire.esempio = 'Ho letto lo schema del quadro prima di cablarlo.';
  b = L.componiBilancio(s);
  assert.equal(b.soFare.length, 1);
  assert.equal(b.daDocumentare.length, 0);
  assert.equal(b.possoDimostrarlo[0].testo, 'Ho letto lo schema del quadro prima di cablarlo.');
});

test('un\'esperienza collegata vale come esempio', () => {
  const s = L.statoVuoto();
  const e = conEsperienza(s, { titolo: 'Quadro', quando: 'anno3', azione: 'Cablato' });
  s.sofare.fare.livello = 'con_aiuto';
  s.sofare.fare.esperienze = [e.id];
  assert.ok(L.haProva(s, 'fare'));
  assert.deepEqual(L.componiBilancio(s).soFare[0].esperienze, ['Quadro']);
});

test('«non ancora» e «mai» finiscono in parti diverse del bilancio', () => {
  const s = L.statoVuoto();
  s.sofare.verificare.livello = 'non_ancora';
  s.sofare.verificare.come = 'Esercitarmi con il multimetro.';
  s.sofare.spiegare.livello = 'mai';
  s.sguardo.ancora = 'Stimare i tempi.';
  const b = L.componiBilancio(s);
  assert.deepEqual(b.devoImparare.map((x) => x.testo), ['Esercitarmi con il multimetro.', 'Stimare i tempi.']);
  assert.deepEqual(b.maiAffrontato.map((x) => x.situazione), ['Spiegare']);
  assert.equal(b.soFare.length, 0);
  assert.equal(b.hoImparato.length, 0, 'il «come» di chi non lo sa fare non è «ho imparato così»');
});

test('le difficoltà, gli aiuti e le prove delle esperienze entrano nel dossier con rimando', () => {
  const s = L.statoVuoto();
  const e = conEsperienza(s, { titolo: 'Rete', quando: 'tirocinio', azione: 'Configurata', prova: 'Procedura scritta', difficolta: 'I log', aiuto: 'Il tecnico' });
  const b = L.componiBilancio(s);
  assert.equal(b.hoImparato.length, 2);
  assert.equal(b.possoDimostrarlo[0].testo, 'Procedura scritta');
  assert.deepEqual(b.possoDimostrarlo[0].rif, { sezione: 'esperienze', schermata: 'elenco', esperienza: e.id });
});

test('il testo per l\'open day mette in fila le risposte senza riscriverle', () => {
  const s = L.statoVuoto();
  s.orientamento.presentati = '  Sono Sara.  ';
  s.orientamento.consiglio = 'Venite a vedere i laboratori.';
  assert.equal(L.componiOrientamento(s), 'Sono Sara.\n\nVenite a vedere i laboratori.');
  assert.equal(L.componiOrientamento(L.statoVuoto()), '');
});

test('stato delle sezioni', () => {
  const s = L.statoVuoto();
  assert.ok(D.SEZIONI.every((x) => L.statoSezione(s, x.id) === 'vuota'));

  s.profilo.indirizzo = 'estetica';
  s.anni.anno1 = 'a'; s.anni.anno2 = 'b';
  assert.equal(L.statoSezione(s, 'percorso'), 'in_corso');
  s.anni.anno3 = 'c';
  assert.equal(L.statoSezione(s, 'percorso'), 'completa');

  conEsperienza(s, { titolo: 'Uno', quando: 'anno4', azione: 'x' });
  assert.equal(L.statoSezione(s, 'esperienze'), 'in_corso');
  conEsperienza(s, { titolo: 'Due', quando: 'anno2', azione: 'y' });
  assert.equal(L.statoSezione(s, 'esperienze'), 'completa');

  D.SITUAZIONI.forEach((x) => { s.sofare[x.id].livello = 'mai'; });
  assert.equal(L.statoSezione(s, 'sofare'), 'completa');
  assert.equal(L.statoSezione(s, 'bilancio'), 'in_corso');
  Object.keys(s.sguardo).forEach((k) => { s.sguardo[k] = 'risposta'; });
  assert.equal(L.statoSezione(s, 'bilancio'), 'completa');
  assert.equal(L.avanzamento(s).complete, 5);
});

test('normalizza scarta dati estranei, tipi sbagliati e riferimenti orfani', () => {
  const s = L.normalizza({
    profilo: { nome: 42, indirizzo: 'cucina', extra: 'x' },
    anni: { anno1: 'ok', anno9: 'no' },
    esperienze: [{ id: 'a', titolo: 'T', quando: 'anno5', situazioni: ['fare', 'volare'] }, { id: 'a', titolo: 'Doppione' }, null],
    sofare: { capire: { livello: 'esperto', esperienze: ['a', 'zzz'] } },
    orientamento: { testo: '<script>' },
    pericolo: true
  });
  assert.equal(s.profilo.nome, '');
  assert.equal(s.profilo.indirizzo, '');
  assert.equal(s.anni.anno1, 'ok');
  assert.ok(!('anno9' in s.anni));
  assert.equal(s.esperienze.length, 2);
  assert.notEqual(s.esperienze[0].id, s.esperienze[1].id);
  assert.equal(s.esperienze[0].quando, '');
  assert.deepEqual(s.esperienze[0].situazioni, ['fare']);
  assert.equal(s.sofare.capire.livello, '');
  assert.deepEqual(s.sofare.capire.esperienze, ['a']);
  assert.equal(s.orientamento.testo, '<script>', 'il testo resta testo: è l\'interfaccia a non interpretarlo');
  assert.ok(!('pericolo' in s));
  const vuoto = L.normalizza(null);
  assert.match(vuoto.codice, /^[a-z0-9]{20}$/);
  assert.deepEqual(Object.assign({}, vuoto, { codice: '' }), Object.assign(L.statoVuoto(), { codice: '' }));
});

test('andata e ritorno di una copia scaricata', () => {
  const s = L.statoVuoto();
  s.profilo.nome = 'Luca';
  conEsperienza(s, { titolo: 'Quadro', quando: 'anno3', azione: 'Cablato' });
  const r = L.normalizza(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r, s);
});

test('il codice del compilatore sopravvive alla copia e ai valori non validi', () => {
  const s = L.statoVuoto();
  assert.equal(L.normalizza(JSON.parse(JSON.stringify(s))).codice, s.codice);
  assert.notEqual(L.normalizza({ codice: '=FORMULA()' }).codice, '=FORMULA()');
});

test('l\'unica richiesta di rete è l\'invio al foglio configurato', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../bilancio/index.html'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(app));
  assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket/.test(app));
  // Una sola fetch: l'invio al foglio (i caratteri del Word e del PDF sono del sito del curriculum).
  assert.equal((app.match(/fetch\(/g) || []).length, 1);
  assert.ok(app.includes('fetch(URL_INVIO'));
  const url = (config.match(/urlInvio:\s*'([^']*)'/) || [])[1];
  assert.ok(url === '' || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url), 'urlInvio: ' + url);
  assert.ok(!/https?:\/\//.test(html), 'nessuna risorsa esterna: font e script sono locali');
});

test('le competenze proposte vengono solo dalle situazioni dichiarate e documentate', () => {
  const s = L.statoVuoto();
  s.sofare.capire = { livello: 'autonomo_noto', esempio: 'Letto uno schema.', esperienze: [], come: '' };
  s.sofare.fare = { livello: 'autonomo_noto', esempio: '', esperienze: [], come: '' };   // senza esempio
  s.sofare.verificare = { livello: 'non_ancora', esempio: 'x', esperienze: [], come: '' }; // non dichiarata
  s.sofare.spiegare = { livello: 'mai', esempio: '', esperienze: [], come: '' };
  assert.deepEqual(L.suggerisciCompetenze(s), [D.SITUAZIONI[0].cv]);
});

test('l\'invio al docente non include il curriculum', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes('body: JSON.stringify(senzaCV(stato))'));
  // il bilancio non ha più il curriculum; uno stato o una copia di una versione precedente che lo conserva non lo manda comunque
  assert.ok(!('cv' in L.statoVuoto()));
  const vecchio = Object.assign(L.statoVuoto(), { cv: { telefono: '333 1234567' } });
  assert.ok(!('cv' in L.statoPerIlFoglio(vecchio)), 'il curriculum non parte mai');
  assert.ok(vecchio.cv.telefono, 'e resta sul dispositivo');
  assert.ok(!('cv' in L.normalizza(JSON.parse(JSON.stringify(vecchio)))), 'il bilancio rilegge una vecchia copia senza il curriculum');
  const script = fs.readFileSync(path.join(__dirname, '../apps-script/Codice.gs'), 'utf8');
  assert.ok(!/\.cv\b|telefono|email/i.test(script.replace(/Dati completi|^\s*\/\/.*$/gm, '')), 'lo script del foglio non legge dati del curriculum');
});

test('bilancio: nessun campo è obbligatorio per andare avanti e non restano scritte «facoltativo» nelle etichette', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(!/\(facoltativ[oa]\)/.test(app));
  assert.ok(!/class: 'pulsante navigazione__avanti'[^)]*disabled/.test(app), 'il pulsante Avanti non si disabilita mai');
});


test('il percorso si adatta all\'anno frequentato', () => {
  assert.deepEqual(L.anniDelPercorso(''), ['anno1', 'anno2', 'anno3', 'anno4'], 'senza anno scelto si mostrano tutti');
  assert.deepEqual(L.anniDelPercorso('anno1'), ['anno1']);
  assert.deepEqual(L.anniDelPercorso('anno3'), ['anno1', 'anno2', 'anno3']);
  assert.deepEqual(L.anniDelPercorso('anno9'), ['anno1', 'anno2', 'anno3', 'anno4']);
  assert.equal(L.normalizza({ profilo: { anno: 'anno2' } }).profilo.anno, 'anno2');
  assert.equal(L.normalizza({ profilo: { anno: 'quinto' } }).profilo.anno, '');
  // Un primo anno basta che racconti il suo anno: non gli si chiedono tre righe che non può avere.
  const s = L.statoVuoto();
  s.profilo.indirizzo = 'estetica'; s.profilo.anno = 'anno1'; s.anni.anno1 = 'Il primo laboratorio.';
  assert.equal(L.statoSezione(s, 'percorso'), 'completa');
  s.profilo.anno = 'anno3';
  assert.equal(L.statoSezione(s, 'percorso'), 'in_corso', 'al terzo anno ne servono tre');
  s.anni.anno2 = 'b'; s.anni.tirocinio = 'c';
  assert.equal(L.statoSezione(s, 'percorso'), 'completa');
});

test('nessun riferimento al quarto anno nell\'interfaccia e nei testi dell\'app', () => {
  ['js/app.js', 'js/dati.js', 'js/bilancio.js', 'js/cv.js', 'cv/js/app.js', 'bilancio/index.html', 'README.md'].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/quart[oa] anno|quattro anni|studenti di quarta/i.test(t), f);
  });
});

test('i tirocini sono un solo campo libero: nessun numero fisso per anno', () => {
  const s = L.statoVuoto();
  assert.ok('tirocinio' in s.anni && !('tirocinio2' in s.anni), 'un solo campo, di qualunque lunghezza');
  // una versione precedente aveva un secondo campo: il testo confluisce nell'unico campo senza perdere nulla
  const n = L.normalizza({ anni: { tirocinio: 'Un mese in un negozio di computer.', tirocinio2: 'Due mesi in uno studio.' } });
  assert.equal(n.anni.tirocinio, 'Un mese in un negozio di computer.\n\nDue mesi in uno studio.');
  assert.ok(!('tirocinio2' in n.anni));
  assert.equal(L.normalizza({ anni: { tirocinio2: 'Solo questo.' } }).anni.tirocinio, 'Solo questo.');
  // al foglio del docente parte il bilancio così com'è, senza curriculum
  const f = L.statoPerIlFoglio(n);
  assert.equal(f.anni.tirocinio, n.anni.tirocinio);
  assert.ok(!('cv' in f));
  // le parole non fissano né il singolare né il plurale né l'anno
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(!/tirociniPlurali|tirocinio2|Primo tirocinio|Secondo tirocinio/.test(app));
  const g = D.SGUARDO.find((x) => x.id === 'tirocinio');
  assert.ok(/alternanza e i tirocini/.test(g.domanda) && !g.domandaPlurale);
});

test('i testi d\'esempio non parlano di anni che lo studente può non aver ancora vissuto', () => {
  const dati = fs.readFileSync(path.join(__dirname, '../js/dati.js'), 'utf8');
  assert.ok(!/\bal (terzo|secondo|primo) anno/i.test(dati));
  Object.values(D.ESEMPI_ESPERIENZA).forEach((x) => assert.ok(D.QUANDO.some((q) => q.id === x.quando), 'il periodo dell\'esempio è un id valido'));
});

// ---------- Interfaccia più corta: esperienze guidate, so fare in due tempi ----------
test('«tirocinio» da solo o una frase che dice solo dove non basta: compare un suggerimento, mai un blocco', () => {
  ['Tirocinio', 'tirocinio.', 'Ho fatto il tirocinio', 'Ho fatto lo stage in azienda', 'Stage', 'Ho aiutato', 'Ho fatto tutto', 'Lavoro']
    .forEach((x) => assert.equal(L.vaghezza(x), 'generica', x));
  ['Ho montato il quadro', 'Cose varie', 'Ho cablato un quadro']
    .forEach((x) => assert.equal(L.vaghezza(x), 'corta', x));
  ['Ho montato il quadro della palazzina con il tutor', 'Ho configurato due stampanti di rete e aggiornato i computer della segreteria.']
    .forEach((x) => assert.equal(L.vaghezza(x), '', x));
  assert.equal(L.vaghezza(''), '', 'un campo vuoto non è vago: è vuoto');
  assert.equal(L.vaghezza('   '), '');
  // le esperienze d'esempio dell'app non devono far comparire l'avviso
  Object.values(D.ESEMPI_ESPERIENZA).forEach((e) => assert.equal(L.vaghezza(e.azione), '', e.titolo));
  // un titolo che dice solo dove
  ['Tirocinio', 'Il tirocinio', 'Scuola', 'Stage in azienda'].forEach((x) => assert.equal(L.titoloGenerico(x), true, x));
  ['Quadro elettrico in tirocinio', 'Rete dell\'ufficio', ''].forEach((x) => assert.equal(L.titoloGenerico(x), false, x));
  Object.values(D.ESEMPI_ESPERIENZA).forEach((e) => assert.equal(L.titoloGenerico(e.titolo), false, e.titolo));
  // il controllo non cambia né salva niente: il bilancio riporta le parole dello studente così come sono
  const s = L.statoVuoto();
  const e = conEsperienza(s, { titolo: 'Tirocinio', azione: 'Tirocinio', quando: 'tirocinio' });
  L.vaghezza(e.azione);
  assert.equal(e.azione, 'Tirocinio');
  assert.equal(L.esperienzaCompleta(e), true, 'non blocca il completamento');
});

test('i contesti raggruppano i periodi senza cambiare il dato salvato', () => {
  const periodi = D.CONTESTI.reduce((m, c) => m.concat(c.quando), []);
  assert.deepEqual(periodi.slice().sort(), D.QUANDO.map((x) => x.id).sort(), 'ogni periodo sta in un contesto, una volta sola');
  assert.deepEqual(D.CONTESTI.map((c) => c.id), ['scuola', 'tirocinio', 'fuori']);
  // il periodo resta quello di sempre: lo script del docente lo riconosce per id
  const s = L.normalizza({ esperienze: [{ id: 'a', titolo: 'T', quando: 'tirocinio' }, { id: 'b', titolo: 'U', quando: 'anno2' }] });
  assert.deepEqual(s.esperienze.map((e) => e.quando), ['tirocinio', 'anno2']);
});

test('«Che cosa so fare» in due tempi e lo sguardo critico in una schermata, con le regole di sempre', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes('function schermataLivelli') && app.includes('function schermataEsempi') && !app.includes('function schermataSofare'));
  assert.ok(app.includes('function elencoDettaglio') && app.includes('function corpoLargo'));
  // dal bilancio si torna alla risposta: una situazione si apre negli esempi, una domanda dello sguardo critico si raggiunge nella schermata
  assert.ok(/trovata = D\.SEZIONI\[s\]\.schermate\.findIndex\(function \(x\) \{ return x\.id === 'esempi'; \}\);\s*situazioneAperta = schermataId;/.test(app));
  assert.ok(app.includes("$('blocco-sg-' + schermataId)"));
  // le sei situazioni e le tre domande hanno gli id di sempre (li legge lo script del docente)
  assert.deepEqual(D.SITUAZIONI.map((x) => x.id), ['capire', 'fare', 'collaborare', 'verificare', 'spiegare', 'migliorare']);
  assert.ok(app.includes("'f-sg-' + g.id"));
  // lo stato di «so fare» non dipende da dove si scrive: senza esempio la voce resta in sospeso
  const s = L.statoVuoto();
  D.SITUAZIONI.forEach((x) => { s.sofare[x.id].livello = 'autonomo_noto'; });
  assert.equal(L.statoSezione(s, 'sofare'), 'in_corso');
  assert.equal(L.componiBilancio(s).daDocumentare.length, 6);
  const e = conEsperienza(s, { titolo: 'Rete', azione: 'Ho configurato la rete dell\'ufficio', quando: 'tirocinio' });
  D.SITUAZIONI.forEach((x) => { s.sofare[x.id].esperienze = [e.id]; });
  assert.equal(L.statoSezione(s, 'sofare'), 'completa', 'collegare una cosa raccontata vale come esempio');
  // «mai affrontato» resta distinto da «non lo so ancora fare»
  s.sofare.capire.livello = 'mai'; s.sofare.fare.livello = 'non_ancora';
  const b = L.componiBilancio(s);
  assert.deepEqual([b.maiAffrontato.length, b.devoImparare.length], [1, 1]);
});

test('l\'interfaccia delle esperienze non chiede più otto campi in fila e non scrive al posto dello studente', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes('function dettaglioEsperienza') && !app.includes('function moduloEsperienza'));
  assert.ok(app.includes("'Che cosa hai fatto tu, di preciso?'"));
  // gli avvisi non cambiano i dati: nessuna assegnazione a e.azione / e.titolo dentro i controlli
  const controlli = app.slice(app.indexOf('const controllaAzione'), app.indexOf('const dove = gruppoScelte'));
  assert.ok(!/e\.(azione|titolo)\s*=[^=]/.test(controlli));
  // le esperienze scritte con la versione precedente (anche senza periodo) restano raggiungibili
  assert.ok(app.includes("'Da collocare'"));
});
