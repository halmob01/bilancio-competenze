/* Diario di bordo del tirocinio — interfaccia.
   Costruisce il DOM con nodi e textContent: i testi dello studente non sono mai interpretati come HTML. */
(function () {
  'use strict';

  const D = window.BC_DIARIO;
  const SEZIONI = [
    { titolo: 'I tuoi tirocini' },
    { titolo: 'Le settimane' },
    { titolo: 'Il diario' }
  ];

  let stato = D.statoVuoto();
  let vista = null; // null = home; altrimenti { s }
  let aperto = null; // tirocinio in modifica
  let settimanaAperta = null;
  let archivioDisponibile = true;
  let timerSalva = null;
  let entrata = false;

  const $ = function (id) { return document.getElementById(id); };
  const principale = $('principale');

  // ---------- Costruzione del DOM ----------
  function h(tag, props) {
    const el = document.createElement(tag);
    const p = props || {};
    Object.keys(p).forEach(function (k) {
      const v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) aggiungi(el, arguments[i]);
    return el;
  }
  function aggiungi(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { aggiungi(el, x); }); return; }
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  const pieno = D.pieno;

  // ---------- Messaggi e conferme ----------
  function messaggio(testoMsg, o) {
    const d = $('dialogo-messaggio');
    const opz = o || {};
    if (d.open) d.close();
    $('messaggio-testo').textContent = testoMsg;
    $('messaggio-ok').textContent = opz.ok || 'Va bene';
    $('messaggio-annulla').textContent = opz.annulla || 'Annulla';
    $('messaggio-annulla').hidden = !opz.conferma;
    $('messaggio-ok').onclick = function () { d.close(); if (opz.conferma) opz.conferma(); };
    $('messaggio-annulla').onclick = function () { d.close(); };
    d.showModal();
  }
  function avvisa(t) { messaggio(t); }
  function chiedi(t, ok, conferma, annulla) { messaggio(t, { ok: ok, conferma: conferma, annulla: annulla }); }

  function adattaAltezza(el) {
    el.style.height = 'auto';
    if (el.scrollHeight > el.clientHeight) el.style.height = (el.scrollHeight + 2) + 'px';
  }

  // ---------- Archivio locale ----------
  function caricaArchivio() {
    try {
      const grezzo = localStorage.getItem(D.CHIAVE);
      if (grezzo) stato = D.normalizza(JSON.parse(grezzo));
    } catch (e) { archivioDisponibile = false; }
  }
  function scriviArchivio() {
    stato.aggiornato = new Date().toISOString();
    try {
      localStorage.setItem(D.CHIAVE, JSON.stringify(stato));
      archivioDisponibile = true;
      $('salvato').textContent = 'Salvato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      archivioDisponibile = false;
      $('salvato').textContent = 'Non salvato: scarica una copia';
    }
  }
  function modificato() {
    $('salvato').textContent = 'Modifiche in corso';
    clearTimeout(timerSalva);
    timerSalva = setTimeout(scriviArchivio, 500);
    aggiornaIndice();
  }
  window.addEventListener('pagehide', function () { if (timerSalva) { clearTimeout(timerSalva); scriviArchivio(); } });

  // ---------- Selezione ----------
  function corrente() {
    return stato.tirocini.find(function (t) { return t.id === stato.corrente; }) || stato.tirocini[0] || null;
  }
  function nomeTirocinio(t, i) { return pieno(t.azienda) ? t.azienda : 'Tirocinio ' + (i + 1); }
  function formatoData(iso) { const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function periodo(t) {
    return [t.dal ? 'dal ' + formatoData(t.dal) : '', t.al ? 'al ' + formatoData(t.al) : ''].filter(Boolean).join(' ');
  }
  function ordinate(t) {
    return t.settimane.slice().sort(function (a, b) { return a.dal < b.dal ? -1 : a.dal > b.dal ? 1 : 0; });
  }

  // ---------- Navigazione ----------
  function vai(s, opz) {
    vista = (s === null) ? null : { s: s };
    if (!opz || !opz.tieni) { aperto = null; settimanaAperta = null; }
    entrata = true; disegna(); entrata = false;
    window.scrollTo(0, 0);
    const titolo = principale.querySelector('h1, h2');
    if (titolo) { titolo.setAttribute('tabindex', '-1'); titolo.focus({ preventScroll: true }); }
  }
  function ridisegna(idFocus) {
    const y = window.scrollY;
    disegna();
    window.scrollTo(0, y);
    if (idFocus && $(idFocus)) $(idFocus).focus({ preventScroll: true });
  }

  function statoSezione(i) {
    const ts = stato.tirocini;
    if (i === 0) return ts.length ? (ts.some(function (t) { return pieno(t.azienda); }) ? 'Completa' : 'In corso') : 'Da iniziare';
    const t = corrente();
    const n = t ? t.settimane.length : 0;
    if (i === 1) return n === 0 ? 'Da iniziare' : n + (n === 1 ? ' settimana' : ' settimane');
    return n === 0 ? 'Da iniziare' : 'Da rileggere';
  }
  function vociIndice(classe) {
    return SEZIONI.map(function (s, i) {
      return h('li', null, h('button', {
        type: 'button', class: classe, 'aria-current': vista && vista.s === i ? 'step' : null,
        onclick: function () { if ($('dialogo-indice').open) $('dialogo-indice').close(); vai(i); }
      },
        h('span', { class: 'meta rail__num', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'rail__nome', text: s.titolo }),
        h('span', { class: 'meta rail__stato', text: statoSezione(i) })));
    });
  }
  function aggiornaIndice() {
    const rail = $('rail-elenco');
    if (rail) { rail.textContent = ''; aggiungi(rail, vociIndice('rail__voce')); }
    const el = $('indice-elenco'); el.textContent = ''; aggiungi(el, vociIndice('indice-dialogo__voce'));
    if (vista) $('tappa-stato').textContent = statoSezione(vista.s);
  }
  function aggiornaTestata() {
    $('tappa-mobile').hidden = !vista;
    // La traccia con i tre cerchi c'è anche nella prima pagina (nessun cerchio pieno finché non si comincia).
    $('avanzamento').hidden = false;
    $('barra').style.width = vista ? ((vista.s + 1) / SEZIONI.length * 100) + '%' : '0%';
    const avanzamento = $('avanzamento');
    avanzamento.querySelectorAll('.avanzamento__nodo').forEach(function (n) { n.remove(); });
    SEZIONI.forEach(function (_, i) {
      const nodo = document.createElement('span');
      nodo.className = 'avanzamento__nodo' + (vista && i === vista.s ? ' avanzamento__nodo--attivo' : vista && i < vista.s ? ' avanzamento__nodo--completato' : '');
      nodo.style.left = (i / (SEZIONI.length - 1) * 100) + '%';
      nodo.setAttribute('aria-hidden', 'true');
      avanzamento.appendChild(nodo);
    });
    if (vista) $('tappa-nome').textContent = SEZIONI[vista.s].titolo;
  }

  // ---------- Elementi ricorrenti ----------
  function campo(o) {
    const sugg = o.suggerimento ? h('p', { class: 'campo__suggerimento', id: o.id + '-sugg', text: o.suggerimento }) : null;
    const controllo = o.area
      ? h('textarea', { id: o.id, maxlength: o.max || 4000, 'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); adattaAltezza(e.target); modificato(); } })
      : h('input', { type: o.tipo || 'text', id: o.id, maxlength: o.max || 200, autocomplete: 'off', inputmode: o.modo || null,
        'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); modificato(); } });
    return h('div', { class: 'campo' }, h('label', { for: o.id, text: o.etichetta, class: o.nascosta ? 'visivamente-nascosto' : null }), sugg, controllo);
  }
  function gruppoScelte(o) {
    return h('fieldset', { class: 'campo' },
      h('legend', { text: o.legenda }),
      h('div', { class: 'scelte' + (o.riga ? ' scelte--riga' : '') }, o.opzioni.map(function (op) {
        const id = o.nome + '-' + op.id;
        const sel = o.multipla ? o.valore.indexOf(op.id) !== -1 : o.valore === op.id;
        return h('label', { class: 'scelta', for: id },
          h('input', { type: o.multipla ? 'checkbox' : 'radio', name: o.nome, id: id, value: op.id, checked: sel,
            onchange: function (e) { o.aggiorna(op.id, e.target.checked); } }),
          h('span', { text: op.testo }));
      })));
  }
  function casella(o) {
    return h('label', { class: 'scelta', for: o.id },
      h('input', { type: 'checkbox', id: o.id, checked: o.valore, onchange: function (e) { o.aggiorna(e.target.checked); } }),
      h('span', { text: o.testo }));
  }
  function aiuto() {
    return h('div', { class: 'aiuto' }, Array.prototype.slice.call(arguments).map(function (t) { return typeof t === 'string' ? h('p', { text: t }) : t; }));
  }
  function testa(meta, titolo) {
    return h('div', { class: 'schermata__testa' },
      h('span', { class: 'meta' }, h('span', { class: 'segno', 'aria-hidden': 'true' }), meta),
      h('h2', { id: 'titolo-schermata', text: titolo }));
  }
  function corpo(intro, risposta, pieno2) {
    return h('div', { class: 'schermata__corpo' + (pieno2 ? ' schermata__corpo--pieno' : '') },
      intro ? h('div', { class: 'colonna-intro' }, intro) : null,
      h('div', { class: 'colonna-risposta' }, risposta));
  }
  function navigazione() {
    const s = vista.s;
    return h('nav', { class: 'navigazione', 'aria-label': 'Navigazione tra le schermate' },
      h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { s === 0 ? vai(null) : vai(s - 1); } }, 'Indietro'),
      s < SEZIONI.length - 1
        ? h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: function () { vai(s + 1); } }, 'Avanti')
        : h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: scaricaCopia }, 'Scarica una copia'));
  }
  function meta(s) { return String(s + 1).padStart(2, '0') + ' / ' + String(SEZIONI.length).padStart(2, '0'); }

  // ---------- Home ----------
  function disegnaHome() {
    const iniziato = !!stato.aggiornato;
    return h('div', { class: 'home' },
      h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' }),
      h('h1', { text: 'Diario di bordo' }),
      h('p', { class: 'home__sottotitolo', text: 'Che cosa hai fatto e imparato questa settimana?' }),
      h('p', { class: 'home__testo misura', text: 'Durante il tirocinio scrivi una scheda a settimana: che cosa hai fatto, che cosa hai imparato, che cosa è stato difficile e chi ti ha aiutato. Bastano poche righe con le tue parole.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () { vai(stato.tirocini.length ? 1 : 0); } }, iniziato ? 'Riprendi da dove eri' : 'Inizia'),
        iniziato ? h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { vai(2); } }, 'Rileggi il diario') : null),
      h('p', { class: 'nota', text: 'Il diario resta su questo dispositivo finché non scarichi una copia. Puoi dettare i testi con il microfono della tastiera del telefono.' }),
      h('section', { class: 'home__indice', 'aria-labelledby': 'home-indice' },
        h('h2', { id: 'home-indice', class: 'meta', text: 'Tre passi' }),
        h('ol', null, SEZIONI.map(function (s, i) {
          return h('li', null, h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }), h('span', { text: s.titolo }));
        }))));
  }

  // ---------- 01 I tuoi tirocini ----------
  function moduloTirocinio(t) {
    const p = 'f-tir-' + t.id + '-';
    return h('div', { class: 'scheda__modulo' },
      campo({ id: p + 'azienda', etichetta: 'Nome dell\'azienda', max: 200, valore: t.azienda, aggiorna: function (v) { t.azienda = v; } }),
      campo({ id: p + 'citta', etichetta: 'Città', max: 80, valore: t.citta, aggiorna: function (v) { t.citta = v; } }),
      h('div', { class: 'coppia' },
        campo({ id: p + 'dal', etichetta: 'Dal', tipo: 'date', valore: t.dal, aggiorna: function (v) { t.dal = v; } }),
        campo({ id: p + 'al', etichetta: 'Al', tipo: 'date', valore: t.al, aggiorna: function (v) { t.al = v; } })),
      campo({ id: p + 'obiettivi', etichetta: 'Che cosa vuoi imparare in questo tirocinio?', area: true,
        suggerimento: 'Un obiettivo per riga, con parole tue. Per esempio: «Imparare a leggere uno schema elettrico».',
        valore: t.obiettivi.join('\n'), aggiorna: function (v) {
          t.obiettivi = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, D.MAX_OBIETTIVI);
        } }),
      h('div', { class: 'scheda__azioni' },
        h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: function () { aperto = null; ridisegna(); } }, 'Chiudi la scheda')));
  }

  function schermataTirocini() {
    const intro = [
      h('p', { text: 'Scrivi dove fai il tirocinio e che cosa vuoi imparare. Se ne fai più di uno, aggiungili uno alla volta.' })
    ];
    const elenco = stato.tirocini.length
      ? h('ul', { class: 'schede', 'aria-label': 'I tuoi tirocini' }, stato.tirocini.map(function (t, i) {
        const apertoQui = aperto === t.id;
        return h('li', { class: 'scheda' + (apertoQui ? ' scheda--aperta' : ''), id: 'scheda-' + t.id },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('h3', { class: 'scheda__titolo', text: nomeTirocinio(t, i) }),
            apertoQui ? null : h('span', { class: 'meta', text: [periodo(t), t.settimane.length + (t.settimane.length === 1 ? ' settimana' : ' settimane')].filter(Boolean).join(' · ') })),
          apertoQui ? moduloTirocinio(t) : h('div', { class: 'scheda__azioni' },
            h('button', { type: 'button', class: 'pulsante pulsante--piccolo', onclick: function () { stato.corrente = t.id; modificato(); vai(1); } }, 'Apri le settimane'),
            h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', id: 'mod-' + t.id, onclick: function () { aperto = t.id; ridisegna('f-tir-' + t.id + '-azienda'); } }, 'Modifica'),
            h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina ' + nomeTirocinio(t, i), onclick: function () { eliminaTirocinio(t, i); } }, 'Elimina')));
      }))
      : h('p', { class: 'vuoto', text: 'Non hai ancora inserito un tirocinio.' });
    const risposta = [
      elenco,
      h('div', null, h('button', { type: 'button', class: 'pulsante', id: 'aggiungi-tirocinio', disabled: stato.tirocini.length >= D.MAX_TIROCINI, onclick: function () {
        const t = D.tirocinioVuoto();
        stato.tirocini.push(t); stato.corrente = t.id; aperto = t.id;
        modificato(); ridisegna('f-tir-' + t.id + '-azienda');
      } }, 'Aggiungi un tirocinio'))
    ];
    return [testa(meta(0), 'I tuoi tirocini'), corpo(intro, risposta)];
  }

  function eliminaTirocinio(t, i) {
    chiedi('Eliminare «' + nomeTirocinio(t, i) + '» con tutte le sue settimane? Non si può annullare.', 'Elimina', function () {
      stato.tirocini = stato.tirocini.filter(function (x) { return x.id !== t.id; });
      if (stato.corrente === t.id) stato.corrente = stato.tirocini[0] ? stato.tirocini[0].id : '';
      modificato(); ridisegna('aggiungi-tirocinio');
    });
  }

  // ---------- 02 Le settimane ----------
  function mancanti(w) {
    const m = [];
    if (!w.dal) m.push('la data');
    if (!pieno(w.fatto)) m.push('che cosa hai fatto');
    if (!pieno(w.imparato)) m.push('che cosa hai imparato');
    return m;
  }

  function moduloSettimana(t, w) {
    const p = 'f-set-' + w.id + '-';
    const t2 = function (chiave, etichetta, sugg) {
      return campo({ id: p + chiave, etichetta: etichetta, suggerimento: sugg || null, area: true, valore: w[chiave], aggiorna: function (v) { w[chiave] = v; } });
    };
    return h('div', { class: 'scheda__modulo' },
      campo({ id: p + 'dal', etichetta: 'Settimana dal (il lunedì)', tipo: 'date', valore: w.dal, aggiorna: function (v) { w.dal = v; } }),
      // La domanda sulle assenze: si scelgono i giorni e si scrive quando e perché.
      h('fieldset', { class: 'campo' },
        h('legend', { text: 'Hai fatto assenze o ritardi?' }),
        h('p', { class: 'campo__suggerimento', text: 'Se sì, scrivi quando e perché. Se no, lascia vuoto.' }),
        h('div', { class: 'scelte scelte--riga', role: 'group', 'aria-label': 'In quali giorni' }, D.GIORNI.map(function (g) {
          const id = p + 'assenzagiorno-' + g.id;
          return h('label', { class: 'scelta', for: id },
            h('input', { type: 'checkbox', id: id, value: g.id, checked: w.assenzeGiorni.indexOf(g.id) !== -1,
              onchange: function (e) { w.assenzeGiorni = w.assenzeGiorni.filter(function (x) { return x !== g.id; }); if (e.target.checked) w.assenzeGiorni.push(g.id); modificato(); } }),
            h('span', { text: g.testo }));
        })),
        campo({ id: p + 'assenze', etichetta: 'Quando e perché', nascosta: true, area: true, valore: w.assenze, aggiorna: function (v) { w.assenze = v; } })),
      casella({ id: p + 'comunicato', testo: 'Hai comunicato assenze o ritardi prima ai tutor della scuola e dell\'azienda?', valore: w.comunicato,
        aggiorna: function (v) { w.comunicato = v; modificato(); } }),
      h('p', { class: 'nota', text: 'Puoi dettare i testi: tocca il microfono sulla tastiera del telefono e controlla quello che ha scritto.' }),
      t2('fatto', 'Che cosa hai fatto, concretamente?', 'Racconta le tue azioni: che lavoro hai svolto e con quali strumenti.'),
      t2('imparato', 'Che cosa hai imparato di nuovo?', 'Una cosa che non sapevi fare o non avevi mai visto.'),
      t2('difficolta', 'Che cosa è stato difficile?'),
      t2('aiuto', 'Chi o che cosa ti ha aiutato?', 'Un collega, il tutor, un manuale, un video, un errore da cui hai imparato.'),
      t.obiettivi.length ? gruppoScelte({ legenda: 'Su quali obiettivi hai lavorato?', nome: p + 'obiettivi', multipla: true,
        opzioni: t.obiettivi.map(function (o) { return { id: o, testo: o }; }), valore: w.obiettivi,
        aggiorna: function (id, attiva) { w.obiettivi = w.obiettivi.filter(function (x) { return x !== id; }); if (attiva) w.obiettivi.push(id); modificato(); } }) : null,
      gruppoScelte({ legenda: 'Com\'è andata la settimana?', nome: p + 'umore', opzioni: D.UMORI, valore: w.umore,
        aggiorna: function (id) { w.umore = id; modificato(); } }),
      t2('note', 'Altre note', 'Per esempio un\'idea, una domanda per il docente, qualcosa da ricordare.'),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: function () { settimanaAperta = null; ridisegna(); } }, 'Chiudi la scheda')));
  }

  function schermataSettimane() {
    const t = corrente();
    if (!t) {
      return [testa(meta(1), 'Le settimane'), corpo([h('p', { text: 'Per scrivere le settimane ti serve un tirocinio.' })],
        h('div', null, h('button', { type: 'button', class: 'pulsante', onclick: function () { vai(0); } }, 'Aggiungi un tirocinio')))];
    }
    const intro = [
      h('p', { text: 'Una scheda a settimana, da compilare nel giorno in cui ti ricordi meglio che cosa hai fatto: di solito il venerdì.' }),
      aiuto('Frasi brevi e cose vere. Meglio un episodio preciso che un elenco di aggettivi.')
    ];
    const selettore = stato.tirocini.length > 1 ? h('div', { class: 'campo' },
      h('label', { for: 'scelta-tirocinio', text: 'Tirocinio' }),
      h('select', { id: 'scelta-tirocinio', onchange: function (e) { stato.corrente = e.target.value; modificato(); ridisegna('scelta-tirocinio'); } },
        stato.tirocini.map(function (x, i) { return h('option', { value: x.id, text: nomeTirocinio(x, i), selected: x.id === t.id }); }))) : null;
    const settimane = ordinate(t);
    const elenco = settimane.length
      ? h('ul', { class: 'schede', 'aria-label': 'Le settimane' }, settimane.map(function (w, i) {
        const apertoQui = settimanaAperta === w.id;
        const m = mancanti(w);
        return h('li', { class: 'scheda' + (apertoQui ? ' scheda--aperta' : ''), id: 'scheda-' + w.id },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('h3', { class: 'scheda__titolo', text: D.etichettaSettimana(w.dal) }),
            apertoQui ? null : h('span', { class: 'meta', text: m.length ? 'Manca: ' + m.join(', ') : 'Completa' })),
          apertoQui ? moduloSettimana(t, w) : h('div', { class: 'scheda__azioni' },
            h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', id: 'mod-' + w.id, 'aria-label': 'Modifica ' + D.etichettaSettimana(w.dal),
              onclick: function () { settimanaAperta = w.id; ridisegna('f-set-' + w.id + '-fatto'); } }, 'Modifica'),
            h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina ' + D.etichettaSettimana(w.dal), onclick: function () {
              chiedi('Eliminare la scheda «' + D.etichettaSettimana(w.dal) + '»? Non si può annullare.', 'Elimina', function () {
                t.settimane = t.settimane.filter(function (x) { return x.id !== w.id; });
                modificato(); ridisegna('aggiungi-settimana');
              });
            } }, 'Elimina')));
      }))
      : h('p', { class: 'vuoto', text: 'Non hai ancora scritto nessuna settimana.' });
    const risposta = [
      h('p', { class: 'meta', text: nomeTirocinio(t, stato.tirocini.indexOf(t)) + (periodo(t) ? ' · ' + periodo(t) : '') }),
      selettore, elenco,
      h('div', null, h('button', { type: 'button', class: 'pulsante', id: 'aggiungi-settimana', disabled: t.settimane.length >= D.MAX_SETTIMANE, onclick: function () {
        const w = D.settimanaVuota(D.prossimaSettimana(t));
        t.settimane.push(w); settimanaAperta = w.id;
        modificato(); ridisegna('f-set-' + w.id + '-fatto');
      } }, 'Aggiungi la settimana'))
    ];
    return [testa(meta(1), 'Le settimane'), corpo(intro, risposta)];
  }

  // ---------- 03 Il diario ----------
  function voce(etichetta, testoV) {
    return pieno(testoV) ? h('li', { class: 'voce' }, h('p', { class: 'meta', text: etichetta }), h('blockquote', { text: testoV.trim() })) : null;
  }

  // Giorni scelti, testo libero e se sono stati comunicati ai tutor: vuoto se non ci sono state assenze o ritardi.
  function riassuntoAssenze(w) {
    const giorni = D.GIORNI.filter(function (g) { return w.assenzeGiorni.indexOf(g.id) !== -1; }).map(function (g) { return g.testo; }).join(', ');
    if (!giorni && !pieno(w.assenze)) return '';
    return [giorni ? 'Giorni: ' + giorni + '.' : '', pieno(w.assenze) ? w.assenze.trim() : '',
      w.comunicato ? 'Comunicati prima ai tutor della scuola e dell\'azienda.' : 'Non comunicati prima ai tutor.'].filter(Boolean).join('\n');
  }

  function riepilogo(t) {
    const ind = stato.tirocini.indexOf(t);
    const intest = [periodo(t), t.citta, t.settimane.length + (t.settimane.length === 1 ? ' settimana' : ' settimane')].filter(Boolean).join(' · ');
    const settimane = ordinate(t);
    return h('article', { class: 'dossier', 'aria-label': 'Il tuo diario di bordo' },
      h('header', { class: 'dossier__testa' },
        h('p', { class: 'meta', text: 'Diario di bordo' }),
        h('p', { class: 'dossier__titolo', text: nomeTirocinio(t, ind) }),
        intest ? h('p', { class: 'meta', text: intest }) : null),
      t.obiettivi.length ? h('section', { class: 'dossier__parte' }, h('h3', { text: 'Che cosa voglio imparare' }),
        h('ul', { class: 'voci' }, t.obiettivi.map(function (o) { return h('li', { class: 'voce' }, h('blockquote', { text: o })); }))) : null,
      settimane.length ? settimane.map(function (w) {
        const um = D.UMORI.find(function (u) { return u.id === w.umore; });
        return h('section', { class: 'dossier__parte' },
          h('h3', { text: D.etichettaSettimana(w.dal) }),
          h('p', { class: 'meta', text: um ? um.testo : '' }),
          h('ul', { class: 'voci' }, [
            voce('Che cosa ho fatto', w.fatto), voce('Che cosa ho imparato', w.imparato), voce('Che cosa è stato difficile', w.difficolta),
            voce('Chi o che cosa mi ha aiutato', w.aiuto),
            voce('Assenze o ritardi', riassuntoAssenze(w)),
            w.obiettivi.length ? voce('Obiettivi su cui ho lavorato', w.obiettivi.join('\n')) : null, voce('Note', w.note)]));
      }) : h('section', { class: 'dossier__parte' }, h('p', { class: 'vuoto', text: 'Ancora nulla: scrivi la prima settimana nella sezione «Le settimane».' })));
  }

  function schermataDiario() {
    const t = corrente();
    if (!t) return [testa(meta(2), 'Il diario'), corpo(null, h('div', null, h('p', { class: 'vuoto', text: 'Non hai ancora un tirocinio.' }), h('button', { type: 'button', class: 'pulsante', onclick: function () { vai(0); } }, 'Aggiungi un tirocinio')), true)];
    const risposta = [
      h('p', { class: 'misura', text: 'Questo documento raccoglie soltanto le tue parole. Rileggilo prima di consegnarlo e correggi le schede dove serve.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () { stampa(); } }, 'Stampa o salva in PDF'),
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: scaricaCopia }, 'Scarica una copia')),
      h('p', { class: 'nota', text: 'Il tuo bilancio di competenze e il tuo curriculum possono importare questo diario: dal bilancio, nella sezione «Le esperienze che ricordi» o nel curriculum, potrai scegliere il tirocinio e trasformarlo in una scheda. Se li compili su un altro dispositivo scarica una copia del diario e caricala da lì.' }),
      riepilogo(t)
    ];
    return [testa(meta(2), 'Il tuo diario'), corpo(null, risposta, true)];
  }

  // ---------- Disegno ----------
  function disegna() {
    principale.textContent = '';
    if (!vista) aggiungi(principale, disegnaHome());
    else {
      const s = vista.s;
      const contenuto = s === 0 ? schermataTirocini() : s === 1 ? schermataSettimane() : schermataDiario();
      aggiungi(principale, h('div', { class: 'lavoro' },
        h('nav', { class: 'rail', 'aria-label': 'Sezioni del diario' }, h('ol', { id: 'rail-elenco' })),
        h('div', null, h('section', { class: 'schermata' + (entrata ? ' schermata--entra' : ''), 'aria-labelledby': 'titolo-schermata' }, contenuto), navigazione())));
    }
    aggiornaTestata(); aggiornaIndice();
    principale.querySelectorAll('textarea').forEach(adattaAltezza);
  }

  // ---------- Copia, stampa, cancellazione ----------
  function scaricaFile(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function scaricaCopia() {
    clearTimeout(timerSalva); scriviArchivio();
    scaricaFile(new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' }), 'diario-di-bordo-' + new Date().toISOString().slice(0, 10) + '.json');
    $('salvato').textContent = 'Copia scaricata';
  }
  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) { avvisa('Il file non è una copia valida del diario.'); return; }
      if (!dati || dati.versione !== D.VERSIONE || !Array.isArray(dati.tirocini)) { avvisa('Il file non è una copia valida del diario.'); return; }
      const applica = function () { stato = D.normalizza(dati); scriviArchivio(); $('dialogo-salva').close(); vai(null); };
      if (stato.aggiornato) chiedi('Sostituire il diario attuale con quello del file?', 'Sostituisci', applica); else applica();
    };
    lettore.readAsText(file);
  }
  function preparaStampa() {
    const s = $('stampa'); s.textContent = '';
    const t = corrente();
    if (t) s.appendChild(riepilogo(t));
  }
  function stampa() { preparaStampa(); window.print(); }
  function cancellaTutto() {
    chiedi('Cancellare tutto il diario da questo browser? Se non hai scaricato una copia andrà perso.', 'Cancella tutto', function () {
      clearTimeout(timerSalva); timerSalva = null;
      try { localStorage.removeItem(D.CHIAVE); } catch (e) { /* niente da fare */ }
      stato = D.statoVuoto(); $('salvato').textContent = 'Diario cancellato'; $('dialogo-salva').close(); vai(null);
    });
  }

  // ---------- Avvio ----------
  caricaArchivio();
  disegna();
  if (!archivioDisponibile) $('salvato').textContent = 'Salvataggio non disponibile: scarica una copia';
  else if (stato.aggiornato) $('salvato').textContent = 'Diario ritrovato';
  $('vai-home').addEventListener('click', function () { vai(null); });
  $('apri-salva').addEventListener('click', function () { $('dialogo-salva').showModal(); });
  $('chiudi-salva').addEventListener('click', function () { $('dialogo-salva').close(); });
  $('apri-indice').addEventListener('click', function () { $('dialogo-indice').showModal(); });
  $('chiudi-indice').addEventListener('click', function () { $('dialogo-indice').close(); });
  $('scarica').addEventListener('click', scaricaCopia);
  $('carica').addEventListener('click', function () { $('file-copia').click(); });
  $('file-copia').addEventListener('change', function (e) { if (e.target.files[0]) caricaCopia(e.target.files[0]); e.target.value = ''; });
  $('stampa-dialogo').addEventListener('click', function () { $('dialogo-salva').close(); stampa(); });
  $('cancella').addEventListener('click', cancellaTutto);
  window.addEventListener('beforeprint', preparaStampa);
})();
