'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const D = require('../js/dati.js');
const B = require('../js/bilancio.js');
const C = require('../js/cv.js');

function cvCompilato() {
  const s = C.statoVuoto();
  s.profilo = { nome: 'Luca Rossi', indirizzo: 'elettrico' };
  Object.assign(s.cv, { citta: 'Rozzano', telefono: '333 1234567', email: 'luca.rossi@example.org', profilo: 'Studente del quarto anno.' });
  s.cv.formazione = [{ id: 'f1', periodo: '2023 – oggi', titolo: 'Formazione professionale, Elettrico', ente: 'Ente di formazione, Milano' }, { id: 'f2', periodo: '', titolo: '', ente: '' }];
  return { s };
}

function lavoro(campi) {
  return Object.assign(C.lavoroVuoto('tirocinio'), campi);
}

test('il curriculum riporta solo le parole dello studente, in ordine', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'Impianti Verdi', citta: 'Milano, Italia', mansione: 'Aiuto elettricista', dal: '2025-03', al: '2025-05', compiti: 'Cablare il **quadro**.' })];
  s.cv.competenze = 'Cablaggio di quadri\n\n  Lettura di schemi  ';
  s.cv.lingue = 'Italiano – madrelingua';
  s.cv.consenso = true;
  const c = C.componiCV(s);
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
  const e = C.componiCV(s).esperienze;
  assert.deepEqual(e.map((x) => x.titolo), ['Terza', 'Seconda', 'Prima']);
  assert.equal(e[0].periodo, 'settembre 2025 – oggi');
  assert.equal(e[0].dove, '', 'senza mansione il titolo è l\'azienda e non si ripete');
});

test('se le date non si possono confrontare resta l\'ordine scritto dallo studente', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'A', dal: 'primavera 2024' }), lavoro({ azienda: 'B', dal: '2025-01' })];
  assert.deepEqual(C.componiCV(s).esperienze.map((x) => x.titolo), ['A', 'B']);
  assert.equal(C.componiCV(s).esperienze[0].periodo, 'primavera 2024', 'il testo libero resta com\'è');
  assert.equal(C.formatoMese('2025-13'), '2025-13');
  assert.equal(C.formatoMese('2025-12'), 'dicembre 2025');
});

test('il curriculum segnala che cosa manca e lo stato della sezione segue', () => {
  const s = C.statoVuoto();
  assert.equal(C.statoCV(s), 'vuota');
  assert.equal(C.componiCV(s).mancanti.length, 3);
  s.cv.telefono = '333';
  assert.equal(C.statoCV(s), 'in_corso');
  const { s: pieno } = cvCompilato();
  assert.equal(C.statoCV(pieno), 'in_corso', 'senza competenze o lingue non è completo');
  pieno.cv.lingue = 'Italiano – madrelingua';
  assert.equal(C.statoCV(pieno), 'completa');
});

test('il curriculum sopravvive alla copia e i dati non validi vengono scartati', () => {
  const { s } = cvCompilato();
  s.cv.lavoro = [lavoro({ azienda: 'Azienda', citta: 'Milano', mansione: 'Aiuto', dal: '2025-03', al: '2025-05', inCorso: false, compiti: 'Cablaggio' })];
  s.cv.foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  s.cv.formato = { impaginazione: 'modello', colore: 'blu', carattere: 'classico', dimensione: 'piccolo', firma: true, luogo: 'Milano' };
  assert.deepEqual(C.normalizza(JSON.parse(JSON.stringify(s))), s);
  const n = C.normalizza({
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
  assert.equal(C.normalizza({ cv: { lavoro: Array.from({ length: 30 }, () => ({ azienda: 'X' })) } }).cv.lavoro.length, C.MAX_LAVORO);
  assert.deepEqual(C.normalizza({}).cv, C.statoVuoto().cv);
});

test('il curriculum riporta nazionalità, occupazione desiderata e foto', () => {
  const { s } = cvCompilato();
  s.cv.nazionalita = 'Italiana';
  s.cv.occupazione = 'Tecnico elettricista';
  s.cv.foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const c = C.componiCV(s);
  assert.ok(c.contatti.some((x) => x.etichetta === 'Nazionalità' && x.valore === 'Italiana'));
  assert.equal(c.occupazione, 'Tecnico elettricista');
  assert.equal(c.foto, s.cv.foto);
});

test('la foto accetta solo un piccolo JPEG e l\'aspetto solo valori previsti', () => {
  const ok = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  assert.equal(C.normalizza({ cv: { foto: ok } }).cv.foto, ok);
  ['data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'https://example.org/f.jpg', 'javascript:alert(1)', ok + '"onerror="x', 42]
    .forEach((f) => assert.equal(C.normalizza({ cv: { foto: f } }).cv.foto, '', String(f)));
  assert.equal(C.normalizza({ cv: { foto: 'data:image/jpeg;base64,' + 'A'.repeat(200000) } }).cv.foto, '', 'troppo grande');

  const n = C.normalizza({ cv: { formato: { colore: 'fucsia', carattere: 'comic', dimensione: 'enorme', firma: 'sì', luogo: 'Milano' } } });
  assert.deepEqual(n.cv.formato, { impaginazione: 'originale', colore: 'nero', carattere: 'moderno', dimensione: 'normale', firma: false, luogo: 'Milano' });
  const v = C.normalizza({ cv: { formato: { impaginazione: 'modello', colore: 'blu', carattere: 'classico', dimensione: 'grande', firma: true } } });
  assert.deepEqual([v.cv.formato.impaginazione, v.cv.formato.colore, v.cv.formato.carattere, v.cv.formato.dimensione, v.cv.formato.firma], ['modello', 'blu', 'classico', 'grande', true]);
  assert.equal(C.normalizza({ cv: { formato: { impaginazione: 'caotica' } } }).cv.formato.impaginazione, 'originale');
  assert.equal(C.statoVuoto().cv.formato.impaginazione, 'originale', 'di default l\'impaginazione originale');
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
  assert.deepEqual(C.PASSI.map((x) => x.id), ['contatti', 'profilo', 'formazione', 'esperienze', 'competenze', 'anteprima']);
  const app = fs.readFileSync(path.join(__dirname, '../cv/js/app.js'), 'utf8');
  assert.ok(app.includes("art. 13 del D. Lgs. 196/2003"), 'frase di consenso del modello della scuola');
  assert.ok(app.includes("'Esperienze professionali'") && app.includes("'Istruzione e formazione'") && app.includes("'Interessi'"));
});

test('i modelli del curriculum: Contemporaneo, Classico ed Europass', () => {
  assert.deepEqual(D.CV_IMPAGINAZIONI.map((x) => [x.id, x.nome]), [
    ['originale', 'Contemporaneo'],
    ['modello', 'Classico'],
    ['europass', 'Europass']
  ]);
  assert.equal(C.normalizza({ cv: { formato: { impaginazione: 'europass' } } }).cv.formato.impaginazione, 'europass');
  assert.ok(!D.CV_CARATTERI.some((x) => /classico/i.test(x.nome)), 'nessun carattere chiamato come un modello');
});

test('Europass: lingue madri, livelli europei e testo libero senza traduzioni inventate', () => {
  const r = C.lingueEuropass(['Italiano: madrelingua', 'Inglese: b1', 'Francese: B1 B1 A2 A2 A2', 'Spagnolo: base', 'Tedesco']);
  assert.deepEqual(r.madre, ['Italiano']);
  assert.deepEqual(r.altre[0], { lingua: 'Inglese', livelli: ['B1', 'B1', 'B1', 'B1', 'B1'], testo: '' });
  assert.deepEqual(r.altre[1].livelli, ['B1', 'B1', 'A2', 'A2', 'A2']);
  assert.deepEqual(r.altre[2], { lingua: 'Spagnolo', livelli: null, testo: 'base' }, '«base» non diventa un livello');
  assert.equal(r.altre[3].livelli, null);
  assert.deepEqual(C.lingueEuropass([]), { madre: [], altre: [] });
  assert.equal(C.lingueEuropass(['Inglese: B7']).altre[0].livelli, null);
});

test('Europass: blu ufficiale tra i colori e dati anagrafici nel curriculum composto', () => {
  assert.ok(D.CV_COLORI.some((c) => c.id === 'europass' && c.hex.toLowerCase() === '#0e4194'));
  const s = C.statoVuoto();
  s.cv.nascita = '14/03/2009'; s.cv.nazionalita = 'Italiana'; s.cv.patente = 'AM'; s.cv.lingue = 'Italiano: madrelingua\nInglese: B1';
  const d = C.componiCV(s);
  assert.deepEqual([d.nascita, d.nazionalita, d.patente], ['14/03/2009', 'Italiana', 'AM']);
  assert.equal(d.lingueEu.altre[0].lingua, 'Inglese');
  assert.equal(C.normalizza({ cv: { formato: { colore: 'europass' } } }).cv.formato.colore, 'europass');
});

test('lingue scelte con frasi semplici: il livello europeo resta dietro le quinte', () => {
  const s = C.statoVuoto();
  const it = Object.assign(C.linguaVuota(), { nome: 'Italiano', madre: true });
  const en = Object.assign(C.linguaVuota(), { nome: 'Inglese' });
  Object.keys(en.livelli).forEach((k) => { en.livelli[k] = 'B1'; });
  const fr = Object.assign(C.linguaVuota(), { nome: 'Francese' });
  Object.assign(fr.livelli, { ascolto: 'A2', lettura: 'B1', interazione: 'A1' });
  s.cv.lingueElenco = [it, en, fr, Object.assign(C.linguaVuota(), { nome: '   ' })];
  const d = C.componiCV(s);
  assert.deepEqual(d.lingue, ['Italiano: madrelingua', 'Inglese: intermedio', 'Francese: ascolto elementare, lettura intermedio, conversazione base']);
  assert.deepEqual(d.lingueEu.madre, ['Italiano']);
  assert.deepEqual(d.lingueEu.altre[0].livelli, ['B1', 'B1', 'B1', 'B1', 'B1']);
  assert.deepEqual(d.lingueEu.altre[1].livelli, ['A2', 'B1', 'A1', '', '']);
  D.LINGUA_LIVELLI.forEach((x) => assert.ok(!/^[ABC][12]$/.test(x.scelta) && x.scelta.length > 10, 'frasi, non codici'));
  assert.equal(C.statoCV(s), 'in_corso');
  const n = C.normalizza(JSON.parse(JSON.stringify(s)));
  assert.equal(n.cv.lingueElenco.length, 4);
  assert.equal(C.normalizza({ cv: { lingueElenco: [{ nome: 'X', livelli: { ascolto: 'C9', lettura: 'C2' } }] } }).cv.lingueElenco[0].livelli.ascolto, '');
  assert.deepEqual(D.LINGUA_LIVELLI.map((x) => x.id), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.equal(D.LINGUA_LIVELLI[5].scelta, 'Come un madrelingua');
  assert.equal(C.normalizza({ cv: { lingueElenco: new Array(30).fill({ nome: 'Y' }) } }).cv.lingueElenco.length, C.MAX_LINGUE);
});

test('senza elenco di lingue valgono ancora le righe di testo delle versioni precedenti', () => {
  const s = C.statoVuoto();
  s.cv.lingue = 'Italiano: madrelingua';
  assert.deepEqual(C.componiCV(s).lingue, ['Italiano: madrelingua']);
});

test('il logo Europass è nel repository ed è usato solo dal modello Europass', () => {
  const app = fs.readFileSync(path.join(__dirname, '../cv/js/app.js'), 'utf8');
  assert.ok(fs.existsSync(path.join(__dirname, '../img/europass-logo.png')));
  // Due soli usi: il disegno nel modello Europass e la lettura per il file Word dello stesso modello.
  assert.equal(app.split('img/europass-logo.png').length - 1, 2);
  assert.ok(app.indexOf('img/europass-logo.png') > app.indexOf('function cvEuropass'));
  assert.ok(app.includes("modello.layout === 'europass'"));
});



// ---------- Curriculum come sito a parte ----------
function bilancioConDati() {
  const s = B.statoVuoto();
  s.profilo = { nome: '  Sara Bianchi ', classe: '3B', indirizzo: 'informatica', anno: 'anno3' };
  const e1 = Object.assign(B.esperienzaVuota(), { id: 'e1', titolo: 'Rete di classe', azione: 'Ho configurato tre computer.' });
  const e2 = Object.assign(B.esperienzaVuota(), { id: 'e2', titolo: 'Senza azione', azione: '   ' });
  s.esperienze = [e1, e2];
  s.sofare.capire = { livello: 'autonomo_noto', esempio: 'Letto uno schema.', esperienze: [], come: '' };
  s.sofare.fare = { livello: 'autonomo_noto', esempio: '', esperienze: [], come: '' };   // dichiarata ma senza esempio
  s.sofare.spiegare = { livello: 'non_ancora', esempio: 'x', esperienze: [], come: '' }; // non dichiarata
  return s;
}

test('dal bilancio il curriculum prende nome, schede con un\'azione e competenze documentate', () => {
  const r = C.leggiBilancio(JSON.parse(JSON.stringify(bilancioConDati())));
  assert.equal(r.nome, 'Sara Bianchi');
  assert.equal(r.indirizzo, 'informatica');
  assert.deepEqual(r.esperienze, [{ id: 'e1', titolo: 'Rete di classe', azione: 'Ho configurato tre computer.' }], 'solo le schede con un\'azione scritta');
  assert.deepEqual(r.competenze, [D.SITUAZIONI[0].cv], 'solo le situazioni dichiarate E documentate, come nel bilancio');
});

test('un dato che non è un bilancio non viene importato', () => {
  [null, undefined, 42, 'testo', [], {}, { versione: 99, profilo: {} }, { versione: 1 }, { versione: 1, profilo: 'x' }, { tipo: 'cv', versione: 1, cv: {} }]
    .forEach((x) => assert.equal(C.leggiBilancio(x), null, JSON.stringify(x)));
  // i dati si ricontrollano con le regole del bilancio: un indirizzo inventato o un testo troppo lungo non passano
  const r = C.leggiBilancio({ versione: 1, profilo: { nome: 'A'.repeat(500), indirizzo: 'meccanica' } });
  assert.equal(r.nome.length, 80);
  assert.equal(r.indirizzo, '');
  assert.deepEqual(r.esperienze, []);
});

test('l\'importazione non modifica il bilancio', () => {
  const grezzo = JSON.parse(JSON.stringify(bilancioConDati()));
  const prima = JSON.stringify(grezzo);
  C.leggiBilancio(grezzo);
  assert.equal(JSON.stringify(grezzo), prima);
});

test('il curriculum scritto nel bilancio di una versione precedente passa al nuovo sito', () => {
  const vecchio = Object.assign(bilancioConDati(), {
    cv: { telefono: '333 111 2222', email: 'sara@example.org', foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', formazione: [{ id: 'f1', titolo: 'Informatica', periodo: '', ente: '' }] }
  });
  const s = C.daBilancioVecchio(JSON.parse(JSON.stringify(vecchio)));
  assert.equal(s.tipo, 'cv');
  assert.equal(s.profilo.nome.trim(), 'Sara Bianchi');
  assert.equal(s.profilo.indirizzo, 'informatica');
  assert.equal(s.cv.telefono, '333 111 2222');
  assert.equal(s.cv.formazione[0].titolo, 'Informatica');
  assert.ok(s.cv.foto.startsWith('data:image/jpeg'));
  assert.ok(!('esperienze' in s) && !('sofare' in s), 'del bilancio non resta niente');
  // niente da portare: curriculum assente o vuoto
  assert.equal(C.daBilancioVecchio(bilancioConDati()), null);
  assert.equal(C.daBilancioVecchio(Object.assign(bilancioConDati(), { cv: {} })), null);
  assert.equal(C.daBilancioVecchio({ cv: 'x' }), null);
  assert.equal(C.daBilancioVecchio(null), null);
  // anche la sola foto o la sola data di nascita contano
  assert.ok(C.daBilancioVecchio({ profilo: {}, cv: { nascita: '14/03/2009' } }));
});

test('il salvataggio del curriculum è proprio: chiave e forma', () => {
  assert.equal(C.CHIAVE, 'cv-v1');
  assert.notEqual(C.CHIAVE, 'bilancio-competenze-v1');
  const s = C.statoVuoto();
  assert.deepEqual(Object.keys(s).sort(), ['aggiornato', 'cv', 'profilo', 'tipo', 'versione']);
  assert.deepEqual(Object.keys(s.profilo), ['nome', 'indirizzo']);
  assert.deepEqual(C.normalizza(JSON.parse(JSON.stringify(s))), s);
  assert.deepEqual(C.normalizza(null), s);
  assert.equal(C.normalizza({ profilo: { nome: 'Ada', indirizzo: 'estetica' } }).profilo.indirizzo, 'estetica');
  assert.equal(C.normalizza({ profilo: { indirizzo: 'volo' } }).profilo.indirizzo, '');
});

test('i passi del curriculum hanno uno stato ciascuno', () => {
  const s = C.statoVuoto();
  assert.deepEqual(C.avanzamento(s).stati, ['vuota', 'vuota', 'vuota', 'vuota', 'vuota', 'vuota']);
  const { s: pieno } = cvCompilato();
  pieno.cv.occupazione = 'Tecnico elettricista';
  pieno.cv.lavoro = [lavoro({ azienda: 'Impianti Verdi' })];
  pieno.cv.competenze = 'Cablaggio';
  pieno.cv.lingue = 'Italiano: madrelingua';
  const av = C.avanzamento(pieno);
  assert.deepEqual(av.stati, ['completa', 'completa', 'completa', 'completa', 'completa', 'completa']);
  assert.equal(av.complete, av.totale);
  assert.equal(C.statoPasso(s, 'inesistente'), 'vuota');
});

test('il sito del curriculum non scrive nel bilancio né nel diario e non invia niente', () => {
  const app = fs.readFileSync(path.join(__dirname, '../cv/js/app.js'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|XMLHttpRequest|sendBeacon|WebSocket/.test(app));
  // una sola fetch: i caratteri del Word e del PDF, file del sito
  assert.equal((app.match(/fetch\(/g) || []).length, 1);
  assert.ok(app.includes("fetch('../fonts/ttf/' + n + '.ttf')"));
  assert.ok(!/URL_INVIO|BC_CONFIG|script\.google\.com/.test(app), 'il curriculum non va al foglio del docente');
  // scrive solo le sue due chiavi; quelle del bilancio e del diario si leggono e basta
  const scritture = app.match(/localStorage\.(setItem|removeItem)\(([^,)]+)/g) || [];
  scritture.forEach((x) => assert.ok(/C\.CHIAVE\b|CHIAVE_POSIZIONE/.test(x), x));
  assert.ok(!/setItem\([^)]*(bilancio|diario)/i.test(app));
  const cfg = fs.readFileSync(path.join(__dirname, '../cv/index.html'), 'utf8');
  assert.ok(!/https?:\/\//.test(cfg), 'nessuna risorsa esterna');
});

test('il bilancio mette al sicuro il curriculum prima di salvarsi senza', () => {
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(app.includes('function portaIlCurriculum'));
  // la mette al sicuro prima di normalizzare (che scarta il curriculum) sia all'apertura sia con una copia caricata
  assert.ok(/portaIlCurriculum\(dati\);\s*stato = L\.normalizza\(dati\)/.test(app));
  assert.equal((app.match(/portaIlCurriculum\(dati\);/g) || []).length, 2);
  // e non sovrascrive un curriculum già scritto nel nuovo sito
  assert.ok(/localStorage\.getItem\(window\.BC_CV\.CHIAVE\)\) return/.test(app));
});
