'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../diario/js/diario.js');
const L = require('../js/bilancio.js');

function diarioCompilato() {
  const s = D.statoVuoto();
  const t = Object.assign(D.tirocinioVuoto(), { azienda: 'Studio Rete Sicura', citta: 'Milano', dal: '2025-03-03', al: '2025-05-30', obiettivi: ['Imparare a leggere i log'] });
  t.settimane.push(Object.assign(D.settimanaVuota('2025-03-03'), { fatto: 'Ho configurato due stampanti.', imparato: 'Leggere i log.', difficolta: 'Una stampante non si vedeva.', aiuto: 'Il tecnico.', umore: 'bene', assenzeGiorni: ['gio'], assenze: 'Visita medica.', comunicato: true }));
  t.settimane.push(Object.assign(D.settimanaVuota('2025-03-10'), { fatto: 'Ho aggiornato i computer.', imparato: 'Fare le copie di sicurezza.' }));
  s.tirocini.push(t); s.corrente = t.id;
  return s;
}

test('il diario sopravvive alla copia e i dati non validi vengono scartati', () => {
  const s = diarioCompilato();
  assert.deepEqual(D.normalizza(JSON.parse(JSON.stringify(s))), s);
  const n = D.normalizza({
    tirocini: [null, { id: 'x', azienda: 42, dal: 'ieri', ore: '35', settimane: [{ id: 'a', dal: '2025-02-30x', umore: 'felicissimo', assenzeGiorni: ['lun', 'dom', 'lun', 'mer'], assenze: 'Un ritardo.', comunicato: 'sì', fatto: 'ok' }, 7] }, { id: 'x', azienda: 'Doppio' }],
    corrente: 'inesistente'
  });
  assert.equal(n.tirocini.length, 2);
  assert.equal(n.tirocini[0].azienda, '');
  assert.equal(n.tirocini[0].dal, '');
  assert.ok(!('ore' in n.tirocini[0]) && !('ore' in n.tirocini[0].settimane[0]), 'le ore non esistono più: gli studenti fanno 8 ore al giorno');
  assert.equal(n.tirocini[0].settimane[0].umore, '');
  assert.equal(n.tirocini[0].settimane[0].assenze, 'Un ritardo.');
  assert.deepEqual(n.tirocini[0].settimane[0].assenzeGiorni, ['lun', 'mer'], 'solo giorni validi e senza doppioni');
  assert.equal(n.tirocini[0].settimane[0].comunicato, false, 'solo true vale come comunicato');
  assert.ok(!('giorni' in n.tirocini[0].settimane[0]));
  assert.notEqual(n.tirocini[0].id, n.tirocini[1].id, 'gli id doppi si rinnovano');
  assert.equal(n.corrente, n.tirocini[0].id);
  assert.deepEqual(D.normalizza('boh'), D.statoVuoto());
});

test('la settimana proposta è quella dopo l\'ultima, sempre un lunedì', () => {
  const t = D.tirocinioVuoto();
  assert.equal(D.prossimaSettimana(t, '2025-03-05'), '2025-03-03', 'senza settimane: il lunedì di oggi');
  t.dal = '2025-03-12';
  assert.equal(D.prossimaSettimana(t, '2025-06-01'), '2025-03-10', 'o l\'inizio del tirocinio');
  t.settimane.push(D.settimanaVuota('2025-03-12'));
  assert.equal(D.prossimaSettimana(t), '2025-03-17');
  assert.equal(D.lunedi('2025-03-09'), '2025-03-03', 'la domenica appartiene alla settimana che finisce');
  assert.equal(D.piuGiorni('2025-12-29', 7), '2026-01-05');
  assert.equal(D.etichettaSettimana('2025-03-03'), 'Settimana dal 3 marzo');
});

test('dal diario il bilancio propone schede esperienza con le parole dello studente', () => {
  const s = diarioCompilato();
  const p = L.esperienzeDalDiario(JSON.parse(JSON.stringify(s)));
  assert.equal(p.length, 1);
  assert.equal(p[0].titolo, 'Tirocinio presso Studio Rete Sicura');
  assert.equal(p[0].settimane, 2);
  assert.ok(p[0].contesto.includes('Studio Rete Sicura') && p[0].contesto.includes('dal 03/03/2025 al 30/05/2025'));
  assert.ok(p[0].azione.includes('Settimana dal 03/03/2025: Ho configurato due stampanti.') && p[0].azione.includes('Settimana dal 10/03/2025: Ho aggiornato i computer.'));
  assert.ok(p[0].difficolta.includes('Una stampante non si vedeva.'));
  assert.ok(p[0].aiuto.includes('Il tecnico.'));
  // per il curriculum: azienda, città, mesi e compiti dalle settimane
  assert.equal(p[0].azienda, 'Studio Rete Sicura');
  assert.equal(p[0].citta, 'Milano');
  assert.equal(p[0].dalMese, '2025-03');
  assert.equal(p[0].alMese, '2025-05');
  assert.equal(p[0].compiti, 'Ho configurato due stampanti.\nHo aggiornato i computer.');
  assert.ok(L.esperienzeDalDiario({ tirocini: [{ azienda: 'A', settimane: new Array(80).fill({ fatto: 'x'.repeat(500) }) }] })[0].compiti.length <= 1000, 'i compiti restano brevi');
  // dati sporchi o ostili
  assert.deepEqual(L.esperienzeDalDiario(null), []);
  assert.deepEqual(L.esperienzeDalDiario({ tirocini: 'no' }), []);
  assert.deepEqual(L.esperienzeDalDiario({ tirocini: [null, 5, { azienda: '' }] }), [], 'senza azienda né testi non si propone nulla');
  const lungo = L.esperienzeDalDiario({ tirocini: [{ azienda: 'A', settimane: new Array(200).fill({ dal: '2025-01-06', fatto: 'x'.repeat(3000) }) }] });
  assert.ok(lungo[0].azione.length <= 4000, 'rispetta il limite dei campi del bilancio');
});

test('il diario non invia nulla in rete e non interpreta i testi come HTML', () => {
  ['diario/js/diario.js', 'diario/js/app.js'].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(t), f);
    assert.ok(!/\.cv\b|\.telefono|\.email|\bcv:/.test(t), f + ' non legge il curriculum');
  });
});

test('il diario è indipendente: non legge il bilancio; sono il bilancio e il curriculum a importarlo (il solo link è alla pagina iniziale)', () => {
  assert.equal(D.CHIAVE, 'diario-tirocinio-v1');
  ['diario/js/diario.js', 'diario/js/app.js', 'diario/index.html'].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/bilancio-competenze-v1|BC_LOGICA|BC_DATI|js\/bilancio\.js/.test(t), f + ' non dipende dal bilancio');
  });
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const cv = fs.readFileSync(path.join(__dirname, '../cv/js/app.js'), 'utf8');
  assert.ok(app.includes("'diario-tirocinio-v1'") && app.includes("const CHIAVE = 'bilancio-competenze-v1'"));
  assert.ok(cv.includes("'diario-tirocinio-v1'"));
  // importa nel bilancio (esperienze) e nel curriculum (esperienze di lavoro), anche da file
  assert.ok(/riquadroDiario\(\{[^]*?Crea la scheda/.test(app) && /riquadroDiario\(\{[^]*?Aggiungi al curriculum/.test(cv));
  assert.ok(app.includes('scegliFileDiario') && app.includes('diarioCaricato'));
  assert.ok(cv.includes('scegliFileDiario') && cv.includes('diarioCaricato'));
  // dal diario l'unico collegamento visibile è «Tutti i percorsi», verso la pagina iniziale: mai direttamente al bilancio o al curriculum
  const html = fs.readFileSync(path.join(__dirname, '../diario/index.html'), 'utf8');
  assert.deepEqual(html.match(/href="\.\.\/"/g), ['href="../"']);
  assert.ok(!/href="\.\.\/(bilancio|cv)\//.test(html) && !/bilancio-competenze\//.test(html), 'nessun collegamento diretto al bilancio o al curriculum');
});

test('il diario non ha più le ore: 8 ore al giorno, sempre', () => {
  ['diario/js/diario.js', 'diario/js/app.js'].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/\.ore\b|'ore'|Quante ore|ore a settimana/.test(t), f);
  });
});

test('assenze e ritardi: una domanda libera e una casella, senza elenco di giorni', () => {
  const app = fs.readFileSync(path.join(__dirname, '../diario/js/app.js'), 'utf8');
  assert.ok(app.includes("'Hai fatto assenze o ritardi?'"));
  assert.ok(app.includes("Hai comunicato assenze o ritardi prima ai tutor della scuola e dell\\'azienda?"));
  assert.ok(!/Quali giorni/.test(app));
  const w = D.settimanaVuota('2025-03-03');
  assert.equal(w.assenze, '');
  assert.deepEqual(w.assenzeGiorni, []);
  assert.deepEqual(D.GIORNI.map((g) => g.id), ['lun', 'mar', 'mer', 'gio', 'ven', 'sab']);
  assert.equal(w.comunicato, false);
});

test('due tirocini nella stessa azienda in anni diversi restano due proposte distinte', () => {
  const a = { id: 'a', azienda: 'Officina Verde', dal: '2024-03-04', al: '2024-04-05', settimane: [{ id: 'w1', dal: '2024-03-04', fatto: 'Primo.' }] };
  const b = { id: 'b', azienda: 'Officina Verde', dal: '2025-03-03', al: '2025-04-04', settimane: [{ id: 'w2', dal: '2025-03-03', fatto: 'Secondo.' }] };
  const c = { id: 'c', azienda: 'Altra', settimane: [{ id: 'w3', fatto: 'x' }] };
  const p = L.esperienzeDalDiario({ tirocini: [a, b, c] });
  assert.deepEqual(p.map((x) => x.titolo), ['Tirocinio presso Officina Verde (dal 03/2024)', 'Tirocinio presso Officina Verde (dal 03/2025)', 'Tirocinio presso Altra']);
  assert.deepEqual(p.map((x) => x.dalMese), ['2024-03', '2025-03', '']);
  const senzaDate = L.esperienzeDalDiario({ tirocini: [{ azienda: 'Z', settimane: [{ fatto: 'a' }] }, { azienda: 'Z', settimane: [{ fatto: 'b' }] }] });
  assert.deepEqual(senzaDate.map((x) => x.titolo), ['Tirocinio presso Z (1)', 'Tirocinio presso Z (2)']);
  // un percorso con molti tirocini: nessun numero fisso
  const tanti = L.esperienzeDalDiario({ tirocini: Array.from({ length: 7 }, (_, i) => ({ azienda: 'Az' + i, settimane: [{ fatto: 'x' }] })) });
  assert.equal(tanti.length, 7);
});

test('la traccia con i cerchi c\'è anche nella prima pagina del diario, del bilancio e del curriculum', () => {
  ['js/app.js', 'cv/js/app.js'].forEach((f) => {
    const a = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const g = a.slice(a.indexOf('function aggiornaTestata'), a.indexOf('// ---------- Elementi ricorrenti'));
    assert.ok(g.includes("$('avanzamento').hidden = false;") && !/avanzamento'\)\.hidden = !/.test(g), f);
  });
  const app = fs.readFileSync(path.join(__dirname, '../diario/js/app.js'), 'utf8');
  const fn = app.slice(app.indexOf('function aggiornaTestata'), app.indexOf('// ---------- Elementi ricorrenti'));
  assert.ok(fn.includes("$('avanzamento').hidden = false;"), 'la traccia non si nasconde nella home');
  assert.ok(!/avanzamento'\)\.hidden = !vista/.test(fn));
  // nella home nessun cerchio è pieno e la barra è a zero
  assert.ok(fn.includes("vista ? ((vista.s + 1) / SEZIONI.length * 100) + '%' : '0%'"));
});
