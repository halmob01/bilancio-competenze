'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/competenze.js');
const A = require('../portfolio/js/attivita.js');
const L = require('../js/bilancio.js');
const P = require('../js/pdf.js');

// JPEG 8 × 6 rosso, per provare il PDF con le foto.
const JPEG = new Uint8Array(Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAGAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiaKKK8Q/Uj//Z', 'base64'));
const carica = (n) => new Uint8Array(fs.readFileSync(path.join(__dirname, '../fonts/ttf', n + '.ttf')));

function attivitaCompilata() {
  const s = A.statoVuoto();
  s.profilo = { indirizzo: 'elettrico', anno: 'anno3' };
  s.attivita.push(Object.assign(A.attivitaVuota('2026-03-10'), {
    fatto: 'Ho cablato un quadro con due differenziali seguendo lo schema.', luogo: 'scuola', dove: 'Laboratorio impianti',
    competenze: ['el-verifiche', 'sicurezza'], foto: ['fabc1234'], difficolta: 'Capire lo schema.', aiuto: 'Il docente.'
  }));
  s.attivita.push(Object.assign(A.attivitaVuota('2026-04-02'), { fatto: 'Ho montato le canaline.', luogo: 'tirocinio', dove: 'Elettro Rossi' }));
  return s;
}

test('il catalogo copre le sei figure dei tre indirizzi, con testo ufficiale e frase semplice', () => {
  ['elettrico', 'informatica', 'estetica'].forEach((ind) => {
    ['qualifica', 'diploma'].forEach((liv) => {
      const f = C.FIGURE[ind][liv];
      assert.ok(f.figura && /Allegato B2/.test(f.fonte), ind + ' ' + liv);
      const ids = f.gruppi.flatMap((g) => g.competenze.map((c) => c.id));
      assert.equal(new Set(ids).size, ids.length, 'nessun doppione in ' + f.figura);
      f.gruppi.forEach((g) => g.competenze.forEach((c) => {
        assert.ok(c.semplice.length > 10 && c.semplice.length < 120, c.id + ': frase semplice breve');
        assert.ok(c.ufficiale.length > c.semplice.length / 2, c.id + ': testo ufficiale');
        assert.ok(!/[«»]/.test(c.semplice));
      }));
    });
  });
  assert.equal(C.figuraPer('elettrico', 'anno2'), 'Operatore elettrico', 'dal I al III anno la qualifica');
  assert.equal(C.figuraPer('estetica', 'anno4'), 'Tecnico dei trattamenti estetici');
  assert.deepEqual(C.gruppiPer('nessuno', 'anno1'), []);
  // Gli indirizzi dell'operatore elettrico sono tutti e quattro, come richiesto dal CFP.
  const el = C.gruppiPer('elettrico', 'anno3').map((g) => g.id);
  ['civili', 'industriali', 'speciali', 'cablaggio'].forEach((x) => assert.ok(el.includes(x), x));
  // Al IV anno prima il diploma, poi il III anno.
  const quarto = C.gruppiPer('informatica', 'anno4');
  assert.equal(quarto[0].id, 'mestiere4');
  assert.ok(quarto.some((g) => g.competenze.some((c) => c.id === 'inf-manutenzione')), 'al IV anno restano le competenze del III');
  assert.equal(C.trova('sicurezza').id, 'sicurezza');
  assert.equal(C.esiste('inventata'), false);
});

test('le attività sopravvivono alla copia e i dati non validi vengono scartati', () => {
  const s = attivitaCompilata();
  assert.deepEqual(A.normalizza(JSON.parse(JSON.stringify(s))), s);
  const n = A.normalizza({
    profilo: { indirizzo: 'meccanica', anno: 'anno9' },
    attivita: [null, {
      id: 'x', fatto: 42, luogo: 'luna', data: '2026-02-30x', competenze: ['el-verifiche', 'inventata', 'el-verifiche', 'sicurezza', 'pianificare', 'strumenti'],
      foto: ['fabc1234', '../../etc/passwd', 'fabc1234', 'fdef5678', 'f1111111', 'f2222222', 'f3333333'], diario: { settimana: '' }, extra: 'no'
    }, { id: 'x', fatto: 'Doppio' }]
  });
  assert.deepEqual(n.profilo, { indirizzo: '', anno: '' });
  assert.equal(n.attivita.length, 2);
  const a = n.attivita[0];
  assert.equal(a.fatto, ''); assert.equal(a.luogo, ''); assert.equal(a.data, '');
  assert.deepEqual(a.competenze, ['el-verifiche', 'sicurezza', 'pianificare'], 'solo competenze del catalogo, senza doppioni, al massimo tre');
  assert.deepEqual(a.foto, ['fabc1234', 'fdef5678', 'f1111111', 'f2222222', 'f3333333'], 'solo identificativi validi, senza doppioni, nessun limite di quattro');
  assert.equal(a.diario, null);
  assert.ok(!('extra' in a));
  assert.notEqual(n.attivita[0].id, n.attivita[1].id, 'gli id doppi si rinnovano');
  assert.deepEqual(A.normalizza('boh'), A.statoVuoto());
});

test('elenco, titolo, riassunto e promemoria di un\'attività', () => {
  const s = attivitaCompilata();
  assert.deepEqual(A.ordinate(s).map((a) => a.data), ['2026-04-02', '2026-03-10'], 'dalla più recente');
  assert.equal(A.titolo({ fatto: '' }), 'Attività senza descrizione');
  assert.ok(A.titolo({ fatto: 'parola '.repeat(30) }).endsWith('…'));
  assert.equal(A.riassunto(s.attivita[0]), '10 marzo 2026 · A scuola · Laboratorio impianti');
  assert.deepEqual(A.mancanti(s.attivita[1]), ['una foto o un file']);
  s.attivita[1].file.push({ id: 'dabc12345', nome: 'planimetria.dwg', byte: 4000 });
  assert.deepEqual(A.mancanti(s.attivita[1]), [], 'un file basta come prova');
  s.attivita[1].file.pop();
  assert.deepEqual(Object.keys(A.fotoUsate(s)), ['fabc1234']);
});

test('dal diario: una proposta per settimana compilata, quelle già portate sono segnate, il diario non cambia', () => {
  const diario = { versione: 1, tirocini: [{ id: 't1', azienda: 'Elettro Rossi', settimane: [
    { id: 's1', dal: '2026-03-02', fatto: 'Ho tirato i cavi.', difficolta: 'Spazi stretti.' },
    { id: 's2', dal: '2026-03-09', fatto: '' },
    { id: 's3', dal: '2026-03-16', fatto: 'Ho montato le prese.' }] }, 'rotto'] };
  const prima = JSON.stringify(diario);
  const s = A.statoVuoto();
  let p = A.proposteDalDiario(diario, s);
  assert.deepEqual(p.map((x) => x.settimana), ['s3', 's1'], 'solo le settimane con «che cosa hai fatto», dalla più recente');
  const a = A.attivitaDaProposta(p[1]);
  assert.equal(a.luogo, 'tirocinio'); assert.equal(a.dove, 'Elettro Rossi'); assert.equal(a.data, '2026-03-02');
  assert.equal(a.difficolta, 'Spazi stretti.');
  assert.deepEqual(a.diario, { tirocinio: 't1', settimana: 's1' });
  s.attivita.push(a);
  p = A.proposteDalDiario(diario, s);
  assert.equal(p.find((x) => x.settimana === 's1').gia, true);
  assert.equal(JSON.stringify(diario), prima, 'il diario non viene modificato');
  assert.deepEqual(A.proposteDalDiario(null, s), []);
});

test('dalle attività il bilancio propone cose fatte con le parole dello studente e un riferimento', () => {
  const s = attivitaCompilata();
  const p = L.esperienzeDalPortfolio(JSON.parse(JSON.stringify(s)));
  assert.equal(p.length, 2);
  const scuola = p.find((x) => x.id === s.attivita[0].id);
  assert.equal(scuola.quando, 'anno3', 'a scuola: l\'anno del profilo');
  assert.equal(scuola.azione, s.attivita[0].fatto);
  assert.ok(scuola.contesto.includes('Laboratorio impianti') && scuola.contesto.includes('10/03/2026'));
  assert.match(scuola.prova, /Una foto in «Le mie attività»/);
  assert.equal(p.find((x) => x.id === s.attivita[1].id).quando, 'tirocinio');
  // Il riferimento sopravvive nel bilancio; uno non valido sparisce.
  const e = Object.assign(L.esperienzaVuota(), { titolo: scuola.titolo, attivita: scuola.id });
  const b = L.normalizza({ esperienze: [e, Object.assign(L.esperienzaVuota(), { attivita: '<img>' })] });
  assert.equal(b.esperienze[0].attivita, scuola.id);
  assert.ok(!('attivita' in b.esperienze[1]));
  assert.deepEqual(L.esperienzeDalPortfolio({ attivita: [{ id: 'a12345', fatto: '' }, 7] }), [], 'senza testo non c\'è niente da raccontare');
});

test('il PDF delle attività contiene le foto e il testo, in Fira Sans', async () => {
  const s = attivitaCompilata();
  const m = A.modelloPdf(s, { fabc1234: JPEG }, { nome: 'Sara Bianchi' });
  assert.equal(m.layout, 'portfolio');
  assert.equal(m.nome, 'Le attività di Sara Bianchi');
  assert.equal(m.occupazione, 'Operatore elettrico · III anno');
  assert.equal(m.sezioni.length, 2);
  assert.ok(m.sezioni.some((x) => x.blocchi.some((b) => b.t === 'foto')), 'la foto è nella sezione della sua attività');
  const byte = await P.creaPdf(m, { f: carica('firasans-regular'), fs: carica('firasans-semibold') });
  const t = Buffer.from(byte).toString('latin1');
  assert.ok(t.startsWith('%PDF-1.5'));
  assert.equal((t.match(/\/Subtype \/Image/g) || []).length, 1, 'una foto incorporata');
  assert.ok(/\/Width 8 \/Height 6/.test(t), 'con le sue dimensioni');
  assert.ok(t.includes('/Title (Le mie attivita)'));
  assert.ok(!t.includes('ANTON'), 'niente Anton nel documento delle attività');
});

test('foto senza limite di quattro e file allegati: normalizzati, ripuliti, con nomi sicuri', () => {
  const molte = Array.from({ length: 30 }, (_, i) => 'f' + String(1000000 + i));
  const n = A.normalizza({ attivita: [{ id: 'a1x2y3', fatto: 'Ho fatto una cosa.', foto: molte,
    file: [{ id: 'dabc12345', nome: '../../etc/passwd', byte: 1234 }, { id: 'dabc12345', nome: 'doppio', byte: 1 }, { id: 'sbagliato', nome: 'x', byte: 1 },
      { id: 'ddef56789', nome: '  Relazione: finale?.docx ', byte: 99 * 1024 * 1024 }, 7, null, { id: 'dghi11111', nome: 42, byte: 'molti' }] }] });
  const a = n.attivita[0];
  assert.equal(a.foto.length, 30, 'tutte le foto');
  assert.deepEqual(a.file.map((x) => x.id), ['dabc12345', 'ddef56789', 'dghi11111'], 'solo id validi, senza doppioni');
  assert.equal(a.file[0].nome, '.._.._etc_passwd'.replace(/^\.+/, ''), 'niente percorsi');
  assert.equal(a.file[1].nome, 'Relazione_ finale_.docx', 'caratteri vietati sostituiti');
  assert.equal(a.file[1].byte, 0, 'oltre 25 MB non è una dimensione credibile');
  assert.deepEqual([a.file[2].nome, a.file[2].byte], ['file', 0]);
  assert.equal(A.formatoByte(0), ''); assert.equal(A.formatoByte(900), '900 B'); assert.equal(A.formatoByte(150 * 1024), '150 KB');
  assert.equal(A.formatoByte(3.5 * 1024 * 1024), '3,5 MB');
  assert.deepEqual(Object.keys(A.fileUsati(n)).sort(), ['dabc12345', 'ddef56789', 'dghi11111']);
  assert.deepEqual(A.normalizza(JSON.parse(JSON.stringify(n))), n);
});

test('le attività si dividono per anno di corso, dentro ogni anno dalla più recente', () => {
  const s = A.statoVuoto();
  const mk = (data, anno, fatto) => Object.assign(A.attivitaVuota(data, anno), { fatto: fatto });
  s.attivita.push(mk('2025-10-01', 'anno1', 'Uno'), mk('2026-03-01', 'anno2', 'Due'), mk('2025-12-01', 'anno1', 'Tre'), mk('2026-01-01', '', 'Senza'), mk('2026-05-01', 'anno9', 'Anno falso'));
  const n = A.normalizza(JSON.parse(JSON.stringify(s)));
  const g = A.perAnno(n);
  assert.deepEqual(g.map((x) => x.id), ['anno1', 'anno2', 'anno3', 'anno4', '']);
  assert.deepEqual(g[0].attivita.map((a) => a.fatto), ['Tre', 'Uno'], 'I anno, dalla più recente');
  assert.deepEqual(g[1].attivita.map((a) => a.fatto), ['Due']);
  assert.deepEqual(g[2].attivita.concat(g[3].attivita), []);
  assert.deepEqual(g[4].attivita.map((a) => a.fatto), ['Anno falso', 'Senza'], 'un anno non valido finisce in «senza anno»');
  assert.equal(A.etichettaAnno('anno2'), 'II anno');
  // Il documento va per anno, dal più vecchio al più nuovo, e dice anno e file
  const a = n.attivita[0]; a.file.push({ id: 'dabc12345', nome: 'planimetria.dwg', byte: 150 * 1024 });
  const m = A.modelloPdf(n, {});
  assert.match(m.sezioni[0].titolo, /^I anno · /);
  assert.deepEqual(m.sezioni.slice(0, 3).map((x) => x.titolo.split(' · ')[0]), ['I anno', 'I anno', 'II anno'], 'prima i primi anni');
  assert.ok(!/anno ·/.test(m.sezioni[3].titolo + m.sezioni[4].titolo), 'senza anno, solo la data');
  assert.ok(m.sezioni[0].blocchi.some((b) => b.runs && b.runs[0].t === 'File: ' && /planimetria\.dwg \(150 KB\)/.test(b.runs[1].t)));
});
