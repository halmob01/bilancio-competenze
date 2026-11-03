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

test('sette sezioni, schermate con un solo compito', () => {
  assert.equal(D.SEZIONI.length, 7);
  assert.deepEqual(D.SEZIONI.map((x) => x.id), ['percorso', 'esperienze', 'sofare', 'sguardo', 'bilancio', 'cv', 'orientamento']);
  D.SEZIONI.forEach((s) => assert.ok(s.schermate.length >= 1, s.id));
  // Le sei situazioni sono blocchi di un'unica schermata: i loro id non cambiano mai (li legge lo script del docente).
  assert.deepEqual(D.SEZIONI[2].schermate.map((x) => x.id), ['situazioni']);
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
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(app));
  assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket/.test(app));
  assert.equal((app.match(/fetch\(/g) || []).length, 1);
  assert.ok(app.includes('fetch(URL_INVIO'));
  const url = (config.match(/urlInvio:\s*'([^']*)'/) || [])[1];
  assert.ok(url === '' || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url), 'urlInvio: ' + url);
  assert.ok(!/https?:\/\//.test(html), 'nessuna risorsa esterna: font e script sono locali');
});

// ---------- Curriculum ----------
function cvCompilato() {
  const s = L.statoVuoto();
  s.profilo = { nome: 'Luca Rossi', classe: '4A', indirizzo: 'elettrico' };
  Object.assign(s.cv, { citta: 'Rozzano', telefono: '333 1234567', email: 'luca.rossi@example.org', profilo: 'Studente del quarto anno.' });
  s.cv.formazione = [{ id: 'f1', periodo: '2023 – oggi', titolo: 'Formazione professionale, Elettrico', ente: 'Ente di formazione, Milano' }, { id: 'f2', periodo: '', titolo: '', ente: '' }];
  return { s };
}

function lavoro(campi) {
  return Object.assign(L.lavoroVuoto('tirocinio'), campi);
}

test('il curriculum riporta solo le parole dello studente, in ordine', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'Impianti Verdi', citta: 'Milano, Italia', mansione: 'Aiuto elettricista', dal: '2025-03', al: '2025-05', compiti: 'Cablare il **quadro**.' })];
  s.cv.competenze = 'Cablaggio di quadri\n\n  Lettura di schemi  ';
  s.cv.lingue = 'Italiano – madrelingua';
  s.cv.consenso = true;
  const c = L.componiCV(s);
  assert.equal(c.nome, 'Luca Rossi');
  assert.deepEqual(c.contatti.map((x) => x.etichetta), ['Indirizzo', 'Telefono', 'Email']);
  assert.equal(c.formazione.length, 1, 'le voci senza titolo non compaiono');
  assert.deepEqual(c.esperienze.map((e) => [e.titolo, e.dove, e.periodo, e.tipo, e.descrizione]),
    [['Aiuto elettricista', 'Impianti Verdi, Milano, Italia', 'marzo 2025 – maggio 2025', 'Tirocinio', 'Cablare il **quadro**.']]);
  assert.deepEqual(c.competenze, ['Cablaggio di quadri', 'Lettura di schemi']);
  assert.equal(c.consenso, true);
  assert.deepEqual(c.mancanti, []);
});

test('più tirocini: dalla più recente alla più vecchia, voci vuote ignorate', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [
    lavoro({ azienda: 'Prima', dal: '2024-02', al: '2024-04' }),
    lavoro({ azienda: '' }),                                        // voce vuota: ignorata
    lavoro({ azienda: 'Terza', dal: '2025-09', inCorso: true }),
    lavoro({ azienda: 'Seconda', dal: '2024-10', al: '2025-01' })
  ];
  const e = L.componiCV(s).esperienze;
  assert.deepEqual(e.map((x) => x.titolo), ['Terza', 'Seconda', 'Prima']);
  assert.equal(e[0].periodo, 'settembre 2025 – oggi');
  assert.equal(e[0].dove, '', 'senza mansione il titolo è l\'azienda e non si ripete');
});

test('se le date non si possono confrontare resta l\'ordine scritto dallo studente', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'A', dal: 'primavera 2024' }), lavoro({ azienda: 'B', dal: '2025-01' })];
  assert.deepEqual(L.componiCV(s).esperienze.map((x) => x.titolo), ['A', 'B']);
  assert.equal(L.componiCV(s).esperienze[0].periodo, 'primavera 2024', 'il testo libero resta com\'è');
  assert.equal(L.formatoMese('2025-13'), '2025-13');
  assert.equal(L.formatoMese('2025-12'), 'dicembre 2025');
});

test('il curriculum segnala che cosa manca e lo stato della sezione segue', () => {
  const s = L.statoVuoto();
  assert.equal(L.statoSezione(s, 'cv'), 'vuota');
  assert.equal(L.componiCV(s).mancanti.length, 3);
  s.cv.telefono = '333';
  assert.equal(L.statoSezione(s, 'cv'), 'in_corso');
  const { s: pieno } = cvCompilato();
  assert.equal(L.statoSezione(pieno, 'cv'), 'in_corso', 'senza competenze o lingue non è completo');
  pieno.cv.lingue = 'Italiano – madrelingua';
  assert.equal(L.statoSezione(pieno, 'cv'), 'completa');
});

test('le competenze proposte vengono solo dalle situazioni dichiarate e documentate', () => {
  const s = L.statoVuoto();
  s.sofare.capire = { livello: 'autonomo_noto', esempio: 'Letto uno schema.', esperienze: [], come: '' };
  s.sofare.fare = { livello: 'autonomo_noto', esempio: '', esperienze: [], come: '' };   // senza esempio
  s.sofare.verificare = { livello: 'non_ancora', esempio: 'x', esperienze: [], come: '' }; // non dichiarata
  s.sofare.spiegare = { livello: 'mai', esempio: '', esperienze: [], come: '' };
  assert.deepEqual(L.suggerisciCompetenze(s), [D.SITUAZIONI[0].cv]);
});

test('il curriculum sopravvive alla copia e i dati non validi vengono scartati', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'Azienda', citta: 'Milano', mansione: 'Aiuto', dal: '2025-03', al: '2025-05', inCorso: false, compiti: 'Cablaggio' })];
  s.cv.foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  s.cv.formato = { impaginazione: 'modello', colore: 'blu', carattere: 'classico', dimensione: 'piccolo', firma: true, luogo: 'Milano' };
  assert.deepEqual(L.normalizza(JSON.parse(JSON.stringify(s))), s);
  const n = L.normalizza({
    cv: { email: 42, consenso: 'sì', formazione: [null, { id: 'x', titolo: 'T' }, { id: 'x', titolo: 'Doppio' }],
      lavoro: [null, { id: 'l', tipo: 'volo', azienda: 'A', inCorso: 'sì' }, { id: 'l', azienda: 'B' }] }
  });
  assert.equal(n.cv.email, '');
  assert.equal(n.cv.consenso, false, 'solo true vale come consenso');
  assert.equal(n.cv.formazione.length, 2);
  assert.notEqual(n.cv.formazione[0].id, n.cv.formazione[1].id);
  assert.equal(n.cv.lavoro.length, 2);
  assert.notEqual(n.cv.lavoro[0].id, n.cv.lavoro[1].id);
  assert.deepEqual([n.cv.lavoro[0].tipo, n.cv.lavoro[0].inCorso], ['', false]);
  assert.equal(L.normalizza({ cv: { lavoro: Array.from({ length: 30 }, () => ({ azienda: 'X' })) } }).cv.lavoro.length, L.MAX_LAVORO);
  assert.deepEqual(L.normalizza({}).cv, L.statoVuoto().cv);
});

test('l\'invio al docente non include il curriculum', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes('body: JSON.stringify(senzaCV(stato))'));
  assert.ok(/delete copia\.cv/.test(app));
  const script = fs.readFileSync(path.join(__dirname, '../apps-script/Codice.gs'), 'utf8');
  assert.ok(!/\.cv\b|telefono|email/i.test(script.replace(/Dati completi|^\s*\/\/.*$/gm, '')), 'lo script del foglio non legge dati del curriculum');
});

test('il curriculum riporta nazionalità, occupazione desiderata e foto', () => {
  const { s } = cvCompilato();
  s.cv.nazionalita = 'Italiana';
  s.cv.occupazione = 'Tecnico elettricista';
  s.cv.foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const c = L.componiCV(s);
  assert.ok(c.contatti.some((x) => x.etichetta === 'Nazionalità' && x.valore === 'Italiana'));
  assert.equal(c.occupazione, 'Tecnico elettricista');
  assert.equal(c.foto, s.cv.foto);
});

test('la foto accetta solo un piccolo JPEG e l\'aspetto solo valori previsti', () => {
  const ok = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  assert.equal(L.normalizza({ cv: { foto: ok } }).cv.foto, ok);
  ['data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'https://example.org/f.jpg', 'javascript:alert(1)', ok + '"onerror="x', 42]
    .forEach((f) => assert.equal(L.normalizza({ cv: { foto: f } }).cv.foto, '', String(f)));
  assert.equal(L.normalizza({ cv: { foto: 'data:image/jpeg;base64,' + 'A'.repeat(200000) } }).cv.foto, '', 'troppo grande');

  const n = L.normalizza({ cv: { formato: { colore: 'fucsia', carattere: 'comic', dimensione: 'enorme', firma: 'sì', luogo: 'Milano' } } });
  assert.deepEqual(n.cv.formato, { impaginazione: 'originale', colore: 'nero', carattere: 'moderno', dimensione: 'normale', firma: false, luogo: 'Milano' });
  const v = L.normalizza({ cv: { formato: { impaginazione: 'modello', colore: 'blu', carattere: 'classico', dimensione: 'grande', firma: true } } });
  assert.deepEqual([v.cv.formato.impaginazione, v.cv.formato.colore, v.cv.formato.carattere, v.cv.formato.dimensione, v.cv.formato.firma], ['modello', 'blu', 'classico', 'grande', true]);
  assert.equal(L.normalizza({ cv: { formato: { impaginazione: 'caotica' } } }).cv.formato.impaginazione, 'originale');
  assert.equal(L.statoVuoto().cv.formato.impaginazione, 'originale', 'di default l\'impaginazione originale');
});

test('i colori del curriculum sono leggibili sul foglio bianco', () => {
  function luminanza(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  D.CV_COLORI.forEach((c) => {
    const contrasto = 1.05 / (luminanza(c.hex) + 0.05);
    assert.ok(contrasto >= 4.5, c.id + ' ' + contrasto.toFixed(2));
  });
});

test('le schermate del curriculum e il documento nel modello della scuola', () => {
  const cv = D.SEZIONI.find((x) => x.id === 'cv');
  assert.deepEqual(cv.schermate.map((x) => x.id), ['contatti', 'profilo', 'formazione', 'esperienze', 'competenze', 'anteprima']);
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes("art. 13 del D. Lgs. 196/2003"), 'frase di consenso del modello della scuola');
  assert.ok(app.includes("'Esperienze professionali'") && app.includes("'Istruzione e formazione'") && app.includes("'Interessi'"));
});

test('i modelli del curriculum: Contemporaneo, Classico ed Europass', () => {
  assert.deepEqual(D.CV_IMPAGINAZIONI.map((x) => [x.id, x.nome]), [
    ['originale', 'Contemporaneo'],
    ['modello', 'Classico'],
    ['europass', 'Europass']
  ]);
  assert.equal(L.normalizza({ cv: { formato: { impaginazione: 'europass' } } }).cv.formato.impaginazione, 'europass');
  assert.ok(!D.CV_CARATTERI.some((x) => /classico/i.test(x.nome)), 'nessun carattere chiamato come un modello');
});

test('Europass: lingue madri, livelli europei e testo libero senza traduzioni inventate', () => {
  const r = L.lingueEuropass(['Italiano: madrelingua', 'Inglese: b1', 'Francese: B1 B1 A2 A2 A2', 'Spagnolo: base', 'Tedesco']);
  assert.deepEqual(r.madre, ['Italiano']);
  assert.deepEqual(r.altre[0], { lingua: 'Inglese', livelli: ['B1', 'B1', 'B1', 'B1', 'B1'], testo: '' });
  assert.deepEqual(r.altre[1].livelli, ['B1', 'B1', 'A2', 'A2', 'A2']);
  assert.deepEqual(r.altre[2], { lingua: 'Spagnolo', livelli: null, testo: 'base' }, '«base» non diventa un livello');
  assert.equal(r.altre[3].livelli, null);
  assert.deepEqual(L.lingueEuropass([]), { madre: [], altre: [] });
  assert.equal(L.lingueEuropass(['Inglese: B7']).altre[0].livelli, null);
});

test('Europass: blu ufficiale tra i colori e dati anagrafici nel curriculum composto', () => {
  assert.ok(D.CV_COLORI.some((c) => c.id === 'europass' && c.hex.toLowerCase() === '#0e4194'));
  const s = L.statoVuoto();
  s.cv.nascita = '14/03/2009'; s.cv.nazionalita = 'Italiana'; s.cv.patente = 'AM'; s.cv.lingue = 'Italiano: madrelingua\nInglese: B1';
  const d = L.componiCV(s);
  assert.deepEqual([d.nascita, d.nazionalita, d.patente], ['14/03/2009', 'Italiana', 'AM']);
  assert.equal(d.lingueEu.altre[0].lingua, 'Inglese');
  assert.equal(L.normalizza({ cv: { formato: { colore: 'europass' } } }).cv.formato.colore, 'europass');
});

test('nessun campo è obbligatorio per andare avanti e non restano scritte «facoltativo» nelle etichette', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(!/\(facoltativ[oa]\)/.test(app));
  assert.ok(!/class: 'pulsante navigazione__avanti'[^)]*disabled/.test(app), 'il pulsante Avanti non si disabilita mai');
});

test('lingue scelte con frasi semplici: il livello europeo resta dietro le quinte', () => {
  const s = L.statoVuoto();
  const it = Object.assign(L.linguaVuota(), { nome: 'Italiano', madre: true });
  const en = Object.assign(L.linguaVuota(), { nome: 'Inglese' });
  Object.keys(en.livelli).forEach((k) => { en.livelli[k] = 'B1'; });
  const fr = Object.assign(L.linguaVuota(), { nome: 'Francese' });
  Object.assign(fr.livelli, { ascolto: 'A2', lettura: 'B1', interazione: 'A1' });
  s.cv.lingueElenco = [it, en, fr, Object.assign(L.linguaVuota(), { nome: '   ' })];
  const d = L.componiCV(s);
  assert.deepEqual(d.lingue, ['Italiano: madrelingua', 'Inglese: intermedio', 'Francese: ascolto elementare, lettura intermedio, conversazione base']);
  assert.deepEqual(d.lingueEu.madre, ['Italiano']);
  assert.deepEqual(d.lingueEu.altre[0].livelli, ['B1', 'B1', 'B1', 'B1', 'B1']);
  assert.deepEqual(d.lingueEu.altre[1].livelli, ['A2', 'B1', 'A1', '', '']);
  D.LINGUA_LIVELLI.forEach((x) => assert.ok(!/^[ABC][12]$/.test(x.scelta) && x.scelta.length > 10, 'frasi, non codici'));
  assert.equal(L.statoSezione(s, 'cv'), 'in_corso');
  const n = L.normalizza(JSON.parse(JSON.stringify(s)));
  assert.equal(n.cv.lingueElenco.length, 4);
  assert.equal(L.normalizza({ cv: { lingueElenco: [{ nome: 'X', livelli: { ascolto: 'C9', lettura: 'B2' } }] } }).cv.lingueElenco[0].livelli.ascolto, '');
  assert.equal(L.normalizza({ cv: { lingueElenco: new Array(30).fill({ nome: 'Y' }) } }).cv.lingueElenco.length, L.MAX_LINGUE);
});

test('senza elenco di lingue valgono ancora le righe di testo delle versioni precedenti', () => {
  const s = L.statoVuoto();
  s.cv.lingue = 'Italiano: madrelingua';
  assert.deepEqual(L.componiCV(s).lingue, ['Italiano: madrelingua']);
});

test('il logo Europass è nel repository ed è usato solo dal modello Europass', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(fs.existsSync(path.join(__dirname, '../img/europass-logo.png')));
  assert.equal(app.split('img/europass-logo.png').length - 1, 1);
  assert.ok(app.indexOf('img/europass-logo.png') > app.indexOf('function cvEuropass'));
});
