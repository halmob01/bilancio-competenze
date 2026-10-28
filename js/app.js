/* Bilancio di competenze — interfaccia.
   Costruisce il DOM con nodi e textContent: i testi dello studente non sono mai interpretati come HTML. */
(function () {
  'use strict';

  const D = window.BC_DATI;
  const L = window.BC_LOGICA;
  const URL_INVIO = ((window.BC_CONFIG || {}).urlInvio || '').trim();

  const CHIAVE = 'bilancio-competenze-v1';
  const CHIAVE_POSIZIONE = 'bilancio-competenze-posizione-v1';
  const STATO_TESTO = { vuota: 'Da iniziare', in_corso: 'In corso', completa: 'Completa' };

  // Sequenza piatta delle schermate: [indice sezione, indice schermata].
  const SEQUENZA = [];
  D.SEZIONI.forEach(function (s, i) { s.schermate.forEach(function (_, j) { SEQUENZA.push([i, j]); }); });

  let stato = L.statoVuoto();
  let vista = null; // null = home; altrimenti { s, k }
  let ripresa = null; // ultima schermata di lavoro, per «Riprendi»
  let esperienzaAperta = null;
  let archivioDisponibile = true;
  let timerSalva = null;
  let entrata = false; // animazione d'ingresso solo quando si cambia schermata

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

  function pieno(v) { return typeof v === 'string' && v.trim() !== ''; }

  // ---------- Archivio locale ----------
  function caricaArchivio() {
    try {
      const grezzo = localStorage.getItem(CHIAVE);
      if (grezzo) stato = L.normalizza(JSON.parse(grezzo));
      const pos = JSON.parse(localStorage.getItem(CHIAVE_POSIZIONE) || 'null');
      if (pos && D.SEZIONI[pos.s] && D.SEZIONI[pos.s].schermate[pos.k]) ripresa = { s: pos.s, k: pos.k };
    } catch (e) {
      archivioDisponibile = false;
    }
  }

  function scriviArchivio() {
    stato.aggiornato = new Date().toISOString();
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(stato));
      archivioDisponibile = true;
      const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      $('salvato').textContent = 'Salvato alle ' + ora;
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

  function salvaPosizione() {
    try { localStorage.setItem(CHIAVE_POSIZIONE, JSON.stringify(ripresa)); } catch (e) { /* facoltativo */ }
  }

  window.addEventListener('pagehide', function () {
    if (timerSalva) { clearTimeout(timerSalva); scriviArchivio(); }
  });

  // ---------- Navigazione ----------
  function posizione() {
    if (!vista) return -1;
    return SEQUENZA.findIndex(function (x) { return x[0] === vista.s && x[1] === vista.k; });
  }

  function vai(s, k, opzioni) {
    vista = (s === null) ? null : { s: s, k: k || 0 };
    if (vista) { ripresa = vista; salvaPosizione(); }
    if (!opzioni || !opzioni.tieniEsperienza) esperienzaAperta = null;
    entrata = true;
    disegna();
    entrata = false;
    window.scrollTo(0, 0);
    const titolo = principale.querySelector('h1, h2');
    if (titolo) { titolo.setAttribute('tabindex', '-1'); titolo.focus({ preventScroll: true }); }
  }

  function vaiA(sezioneId, schermataId, esperienzaId) {
    const s = D.SEZIONI.findIndex(function (x) { return x.id === sezioneId; });
    const k = Math.max(0, D.SEZIONI[s].schermate.findIndex(function (x) { return x.id === schermataId; }));
    esperienzaAperta = esperienzaId || null;
    vai(s, k, { tieniEsperienza: true });
  }

  function passo(delta) {
    const i = posizione() + delta;
    if (i < 0) vai(null);
    else if (i < SEQUENZA.length) vai(SEQUENZA[i][0], SEQUENZA[i][1]);
  }

  // Ridisegna la schermata corrente mantenendo il punto di lavoro.
  function ridisegna(idFocus) {
    const y = window.scrollY;
    disegna();
    window.scrollTo(0, y);
    if (idFocus && $(idFocus)) $(idFocus).focus({ preventScroll: true });
  }

  // ---------- Indice (rail e dialogo) ----------
  function vociIndice(classe) {
    const av = L.avanzamento(stato);
    return D.SEZIONI.map(function (s, i) {
      return h('li', null, h('button', {
        type: 'button', class: classe,
        'aria-current': vista && vista.s === i ? 'step' : null,
        onclick: function () { if ($('dialogo-indice').open) $('dialogo-indice').close(); vai(i, 0); }
      },
        h('span', { class: 'meta rail__num', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'rail__nome', text: s.titolo }),
        h('span', { class: 'meta rail__stato', text: STATO_TESTO[av.stati[i]] })
      ));
    });
  }

  function aggiornaIndice() {
    const rail = $('rail-elenco');
    if (rail) { rail.textContent = ''; aggiungi(rail, vociIndice('rail__voce')); }
    const el = $('indice-elenco');
    el.textContent = '';
    aggiungi(el, vociIndice('indice-dialogo__voce'));
    if (vista) $('tappa-stato').textContent = STATO_TESTO[L.statoSezione(stato, D.SEZIONI[vista.s].id)];
  }

  function aggiornaTestata() {
    const lavoro = !!vista;
    $('avanzamento').hidden = !lavoro;
    $('tappa-mobile').hidden = !lavoro;
    if (!lavoro) return;
    const i = posizione();
    $('barra').style.width = ((i + 1) / SEQUENZA.length * 100) + '%';
    $('tappa-nome').textContent = 'Sezione ' + (vista.s + 1) + ' di ' + D.SEZIONI.length + ' · ' + D.SEZIONI[vista.s].titolo;
  }

  // ---------- Elementi ricorrenti ----------
  function campo(o) {
    const id = o.id;
    const sugg = o.suggerimento ? h('p', { class: 'campo__suggerimento', id: id + '-sugg', text: o.suggerimento }) : null;
    let controllo;
    if (o.area) {
      controllo = h('textarea', {
        id: id, class: [o.lungo ? 'lungo' : '', o.libro ? 'libro' : ''].join(' ').trim() || null,
        rows: o.righe || null, maxlength: 4000,
        'aria-describedby': sugg ? id + '-sugg' : null,
        'aria-labelledby': o.etichettaDa || null,
        value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); modificato(); }
      });
    } else {
      controllo = h('input', {
        type: 'text', id: id, maxlength: o.max || 200, autocomplete: o.autocomplete || 'off',
        'aria-describedby': sugg ? id + '-sugg' : null,
        value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); modificato(); }
      });
    }
    return h('div', { class: 'campo' },
      o.etichetta ? h('label', { for: id, text: o.etichetta }) : null,
      sugg, controllo);
  }

  function gruppoScelte(o) {
    return h('fieldset', { class: 'campo' },
      h('legend', { text: o.legenda }),
      h('div', { class: 'scelte' + (o.riga ? ' scelte--riga' : '') },
        o.opzioni.map(function (op) {
          const id = o.nome + '-' + op.id;
          const selezionata = o.multipla ? o.valore.indexOf(op.id) !== -1 : o.valore === op.id;
          return h('label', { class: 'scelta', for: id },
            h('input', {
              type: o.multipla ? 'checkbox' : 'radio', name: o.nome, id: id, value: op.id, checked: selezionata,
              onchange: function (e) { o.aggiorna(op.id, e.target.checked, id); }
            }),
            h('span', { text: op.testo }));
        })));
  }

  function aiuto() {
    return h('div', { class: 'aiuto' }, Array.prototype.slice.call(arguments).map(function (t) {
      return typeof t === 'string' ? h('p', { text: t }) : t;
    }));
  }

  function esempio(titolo, corpo) {
    return h('details', { class: 'esempio' },
      h('summary', { text: titolo }),
      h('div', { class: 'esempio__corpo' }, corpo));
  }

  function indirizziVisibili() {
    const scelto = stato.profilo.indirizzo;
    return scelto ? D.INDIRIZZI.filter(function (x) { return x.id === scelto; }) : D.INDIRIZZI;
  }

  function esempiPerIndirizzo(mappa) {
    const vis = indirizziVisibili();
    return vis.map(function (ind) {
      return h('div', null,
        vis.length > 1 ? h('p', { class: 'meta', text: ind.nome }) : null,
        h('p', { text: mappa[ind.id] }));
    });
  }

  function testa(meta, titolo) {
    return h('div', { class: 'schermata__testa' },
      h('span', { class: 'meta' }, h('span', { class: 'segno', 'aria-hidden': 'true' }), meta),
      h('h2', { id: 'titolo-schermata', text: titolo }));
  }

  function metaSchermata(extra) {
    const s = D.SEZIONI[vista.s];
    return String(vista.s + 1).padStart(2, '0') + ' / ' + String(D.SEZIONI.length).padStart(2, '0') +
      ' · ' + s.titolo + (extra ? ' · ' + extra : '');
  }

  function corpo(intro, risposta, pieno) {
    return h('div', { class: 'schermata__corpo' + (pieno ? ' schermata__corpo--pieno' : '') },
      intro ? h('div', { class: 'colonna-intro' }, intro) : null,
      h('div', { class: 'colonna-risposta' }, risposta));
  }

  function navigazione() {
    const i = posizione();
    const ultima = i === SEQUENZA.length - 1;
    const sez = D.SEZIONI[vista.s];
    return h('nav', { class: 'navigazione', 'aria-label': 'Navigazione tra le schermate' },
      h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { passo(-1); } }, 'Indietro'),
      h('span', { class: 'meta', text: 'Sezione ' + (vista.s + 1) + ' di ' + D.SEZIONI.length +
        (sez.schermate.length > 1 ? ' · schermata ' + (vista.k + 1) + ' di ' + sez.schermate.length : '') }),
      ultima
        ? (URL_INVIO
          ? h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: inviaAlDocente }, 'Invia al docente')
          : h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: scaricaCopia }, 'Scarica una copia'))
        : h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: function () { passo(1); } }, 'Avanti'));
  }

  // ---------- Home ----------
  function disegnaHome() {
    const iniziato = !!stato.aggiornato;
    return h('div', { class: 'home' },
      h('h1', { text: 'Bilancio di competenze' }),
      h('p', { class: 'home__sottotitolo', text: 'Quattro anni. Che cosa hai imparato?' }),
      h('p', { class: 'home__testo misura', text: 'Ricostruisci le esperienze del tuo percorso, riconosci ciò che sai fare e individua quello che devi ancora imparare. Alla fine avrai un bilancio scritto con le tue parole e un breve testo per presentarti agli open day.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () {
          vai(ripresa ? ripresa.s : 0, ripresa ? ripresa.k : 0);
        } }, iniziato && ripresa ? 'Riprendi da dove eri' : 'Inizia'),
        iniziato ? h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { vaiA('bilancio', 'dossier'); } }, 'Vai al bilancio') : null),
      h('p', { class: 'nota', text: URL_INVIO
        ? 'Puoi tornare sulle risposte per correggerle, anche dopo averle inviate al docente: un nuovo invio sostituisce il precedente.'
        : 'Puoi tornare sulle risposte per correggerle. Le risposte restano su questo dispositivo finché non scarichi una copia.' }),
      h('section', { class: 'home__indice', 'aria-labelledby': 'home-indice' },
        h('h2', { id: 'home-indice', class: 'meta', text: 'Sei sezioni · circa tre ore' }),
        h('ol', null, D.SEZIONI.map(function (s, i) {
          return h('li', null,
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('span', { text: s.titolo }));
        }))));
  }

  // ---------- 01 Il tuo percorso ----------
  function schermataChi() {
    const intro = [
      h('p', { text: 'Queste informazioni servono a intestare il tuo bilancio e a mostrarti esempi del tuo indirizzo.' }),
      aiuto('Il nome è facoltativo: compare solo sul documento che stampi o scarichi.')
    ];
    const risposta = [
      gruppoScelte({
        legenda: 'Quale indirizzo frequenti?', nome: 'indirizzo', riga: true,
        opzioni: D.INDIRIZZI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: stato.profilo.indirizzo,
        aggiorna: function (id) { stato.profilo.indirizzo = id; modificato(); }
      }),
      campo({ id: 'f-nome', etichetta: 'Nome e cognome (facoltativo)', max: 80, autocomplete: 'name', valore: stato.profilo.nome, aggiorna: function (v) { stato.profilo.nome = v; } }),
      campo({ id: 'f-classe', etichetta: 'Classe (facoltativo)', max: 40, valore: stato.profilo.classe, aggiorna: function (v) { stato.profilo.classe = v; } })
    ];
    return [testa(metaSchermata(), 'Da dove parti'), corpo(intro, risposta)];
  }

  function schermataAnni() {
    const nomi = { anno1: 'I anno', anno2: 'II anno', anno3: 'III anno', anno4: 'IV anno', tirocinio: 'Tirocinio o alternanza' };
    const intro = [
      h('p', { text: 'Per ogni anno scrivi che cosa ricordi: un laboratorio, una persona, un lavoro, un momento difficile. Bastano poche parole.' }),
      aiuto('Non serve essere completi. Queste righe ti aiuteranno a ritrovare le esperienze nella prossima sezione.', 'Se un anno non l\'hai frequentato qui, lascia il campo vuoto.'),
      esempio('Vedi un esempio', h('p', { text: '«I anno: il primo circuito con il deviatore su un pannello di prova. Ho sbagliato i collegamenti e li ho rifatti due volte.»' }))
    ];
    const risposta = h('div', { class: 'anni' }, Object.keys(nomi).map(function (k) {
      return campo({ id: 'f-' + k, etichetta: nomi[k], area: true, righe: 3, valore: stato.anni[k], aggiorna: function (v) { stato.anni[k] = v; } });
    }));
    return [testa(metaSchermata(), 'Quattro anni in poche righe'), corpo(intro, risposta)];
  }

  // ---------- 02 Le esperienze ----------
  function mancanti(e) {
    const m = [];
    if (!pieno(e.titolo)) m.push('un titolo');
    if (!e.quando) m.push('quando');
    if (!pieno(e.azione)) m.push('che cosa hai fatto');
    return m;
  }

  function moduloEsperienza(e) {
    const p = 'f-esp-' + e.id + '-';
    const testoCampo = function (chiave, etichetta, suggerimento, area) {
      return campo({ id: p + chiave, etichetta: etichetta, suggerimento: suggerimento, area: area, righe: 3, valore: e[chiave], aggiorna: function (v) { e[chiave] = v; } });
    };
    return h('div', { class: 'scheda__modulo' },
      testoCampo('titolo', 'Titolo', 'Poche parole per riconoscerla, per esempio «Quadro elettrico in laboratorio».', false),
      gruppoScelte({
        legenda: 'Quando', nome: p + 'quando', riga: true, opzioni: D.QUANDO, valore: e.quando,
        aggiorna: function (id) { e.quando = id; modificato(); }
      }),
      testoCampo('contesto', 'Dove eri e con chi?', null, true),
      testoCampo('azione', 'Che cosa hai fatto tu, concretamente?', 'Racconta le tue azioni, non quelle del gruppo in generale.', true),
      testoCampo('prova', 'Come potresti dimostrarlo?', 'Una foto, un lavoro finito, una relazione, una scheda, il giudizio del tutor o del docente.', true),
      testoCampo('difficolta', 'Che cosa non sapevi fare prima? Che cosa è stato difficile?', null, true),
      testoCampo('aiuto', 'Quale aiuto ti è servito?', 'Da chi o da che cosa: un compagno, il tutor, un manuale, un video, un errore.', true),
      gruppoScelte({
        legenda: 'Oggi, quanto sapresti rifarlo?', nome: p + 'autonomia', opzioni: D.AUTONOMIA, valore: e.autonomia,
        aggiorna: function (id) { e.autonomia = id; modificato(); }
      }),
      gruppoScelte({
        legenda: 'In quali situazioni rientra? (facoltativo)', nome: p + 'situazioni', riga: true, multipla: true,
        opzioni: D.SITUAZIONI.map(function (s) { return { id: s.id, testo: s.verbo }; }), valore: e.situazioni,
        aggiorna: function (id, attiva) {
          e.situazioni = e.situazioni.filter(function (x) { return x !== id; });
          if (attiva) e.situazioni.push(id);
          modificato();
        }
      }),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: function () {
        esperienzaAperta = null; ridisegna('esp-' + e.id + '-modifica');
      } }, 'Chiudi la scheda')));
  }

  function schedaEsperienza(e, n) {
    const aperta = esperienzaAperta === e.id;
    const m = mancanti(e);
    return h('li', { class: 'scheda' + (aperta ? ' scheda--aperta' : ''), id: 'scheda-' + e.id },
      h('div', { class: 'scheda__testa' },
        h('span', { class: 'meta', text: String(n).padStart(2, '0') }),
        h('h3', { class: 'scheda__titolo', text: pieno(e.titolo) ? e.titolo : 'Esperienza senza titolo' }),
        aperta ? null : h('span', { class: 'meta', text: [L.nomeQuando(e.quando), m.length ? 'Manca: ' + m.join(', ') : 'Completa'].filter(Boolean).join(' · ') })),
      aperta ? moduloEsperienza(e) : h('div', { class: 'scheda__azioni' },
        h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', id: 'esp-' + e.id + '-modifica',
          'aria-label': 'Modifica ' + (e.titolo || 'esperienza ' + n),
          onclick: function () { esperienzaAperta = e.id; ridisegna('f-esp-' + e.id + '-titolo'); } }, 'Modifica'),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina ' + (e.titolo || 'esperienza ' + n),
          onclick: function () { eliminaEsperienza(e); } }, 'Elimina')));
  }

  function eliminaEsperienza(e) {
    if (!window.confirm('Eliminare l\'esperienza «' + (e.titolo || 'senza titolo') + '»? Non si può annullare.')) return;
    stato.esperienze = stato.esperienze.filter(function (x) { return x.id !== e.id; });
    Object.keys(stato.sofare).forEach(function (k) {
      stato.sofare[k].esperienze = stato.sofare[k].esperienze.filter(function (id) { return id !== e.id; });
    });
    modificato();
    ridisegna('aggiungi-esperienza');
  }

  function schermataEsperienze() {
    const es = indirizziVisibili().map(function (ind) {
      const x = D.ESEMPI_ESPERIENZA[ind.id];
      return h('div', null,
        h('p', { class: 'meta', text: 'Esempio · ' + ind.nome }),
        h('dl', null,
          h('dt', { text: 'Titolo' }), h('dd', { text: x.titolo }),
          h('dt', { text: 'Quando' }), h('dd', { text: x.quando }),
          h('dt', { text: 'Azione' }), h('dd', { text: x.azione }),
          h('dt', { text: 'Prova' }), h('dd', { text: x.prova }),
          h('dt', { text: 'Difficoltà' }), h('dd', { text: x.difficolta })));
    });
    const anni = Object.keys(stato.anni).filter(function (k) { return pieno(stato.anni[k]); });
    const intro = [
      h('p', { text: 'Scegli almeno due esperienze: a scuola, in laboratorio, in tirocinio o fuori. Per ognuna racconta che cosa hai fatto tu, come puoi dimostrarlo e che cosa è stato difficile.' }),
      aiuto('L\'esempio serve solo a capire che cosa scrivere. Nel bilancio entra soltanto quello che hai fatto davvero.'),
      esempio('Vedi un esempio (non è una tua esperienza)', es),
      anni.length ? esempio('I tuoi appunti sui quattro anni', h('dl', null, anni.map(function (k) {
        return [h('dt', { text: L.nomeQuando(k) || 'Tirocinio' }), h('dd', { text: stato.anni[k] })];
      }))) : null
    ];
    const pieneAbbastanza = stato.esperienze.length >= L.MAX_ESPERIENZE;
    const risposta = [
      stato.esperienze.length
        ? h('ul', { class: 'schede', 'aria-label': 'Le tue esperienze' }, stato.esperienze.map(function (e, i) { return schedaEsperienza(e, i + 1); }))
        : h('p', { class: 'vuoto', text: 'Non hai ancora inserito esperienze.' }),
      h('div', null,
        h('button', { type: 'button', class: 'pulsante', id: 'aggiungi-esperienza', disabled: pieneAbbastanza, onclick: function () {
          const e = L.esperienzaVuota();
          stato.esperienze.push(e);
          esperienzaAperta = e.id;
          modificato();
          ridisegna('f-esp-' + e.id + '-titolo');
        } }, 'Aggiungi un\'esperienza'))
    ];
    return [testa(metaSchermata(), 'Le esperienze che ricordi'), corpo(intro, risposta)];
  }

  // ---------- 03 Che cosa so fare ----------
  function schermataSituazione(sit) {
    const r = stato.sofare[sit.id];
    const l = D.AUTONOMIA.find(function (a) { return a.id === r.livello; });
    const p = 'f-sf-' + sit.id + '-';

    const intro = [
      h('p', { text: sit.anche }),
      esempio('Vedi un esempio', esempiPerIndirizzo(sit.esempi)),
      aiuto('Scegli la frase più vicina alla verità di oggi. Se dichiari di saperlo fare, serve almeno un esempio concreto: senza esempio la competenza resta «da documentare».')
    ];

    const avviso = h('p', { class: 'avviso', id: p + 'avviso', role: 'note', hidden: !(l && l.dichiara && !L.haProva(stato, sit.id)) },
      'Manca ancora un esempio: scrivilo qui sotto o collega un\'esperienza. Per ora nel bilancio comparirà come «da documentare».');
    function aggiornaAvviso() { avviso.hidden = !(l && l.dichiara && !L.haProva(stato, sit.id)); }

    const risposta = [
      gruppoScelte({
        legenda: 'Quanto lo sai fare oggi?', nome: p + 'livello', opzioni: D.AUTONOMIA, valore: r.livello,
        aggiorna: function (id, _, idInput) { r.livello = id; modificato(); ridisegna(idInput); }
      })
    ];

    if (l && l.dichiara) {
      risposta.push(
        avviso,
        campo({ id: p + 'esempio', etichetta: 'Un esempio concreto: quando l\'hai fatto e che cosa hai fatto?', area: true, valore: r.esempio,
          aggiorna: function (v) { r.esempio = v; aggiornaAvviso(); } }),
        stato.esperienze.length
          ? gruppoScelte({
            legenda: 'Collega una o più delle tue esperienze (facoltativo)', nome: p + 'esperienze', multipla: true,
            opzioni: stato.esperienze.map(function (e, i) { return { id: e.id, testo: e.titolo || 'Esperienza ' + (i + 1) }; }),
            valore: r.esperienze,
            aggiorna: function (id, attiva) {
              r.esperienze = r.esperienze.filter(function (x) { return x !== id; });
              if (attiva) r.esperienze.push(id);
              aggiornaAvviso(); modificato();
            }
          })
          : h('p', { class: 'nota' }, 'Non hai ancora esperienze da collegare. ',
            h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA('esperienze', 'elenco'); } }, 'Vai alle esperienze')),
        campo({ id: p + 'come', etichetta: 'Come l\'hai imparato? Chi o che cosa ti ha aiutato?', area: true, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    } else if (l && l.id === 'non_ancora') {
      risposta.push(campo({ id: p + 'come', etichetta: 'Che cosa ti servirebbe per impararlo? (facoltativo)', area: true, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    } else if (l && l.id === 'mai') {
      risposta.push(campo({ id: p + 'come', etichetta: 'Ti piacerebbe affrontarlo? In quale occasione? (facoltativo)', area: true, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    }

    return [testa(metaSchermata(sit.verbo), sit.domanda), corpo(intro, risposta)];
  }

  // ---------- 04 Uno sguardo critico ----------
  function schermataSguardo(g) {
    const intro = [aiuto(g.aiuto), esempio('Vedi un esempio', h('p', { text: g.esempio }))];
    const risposta = campo({ id: 'f-sg-' + g.id, etichettaDa: 'titolo-schermata', area: true, lungo: true, valore: stato.sguardo[g.id],
      aggiorna: function (v) { stato.sguardo[g.id] = v; } });
    return [testa(metaSchermata(), g.domanda), corpo(intro, risposta)];
  }

  // ---------- 05 Bilancio ----------
  function voce(testo, fonte, rif, conPulsante) {
    return h('li', { class: 'voce' },
      testo ? h('blockquote', { text: testo }) : null,
      h('p', { class: 'voce__fonte' },
        h('span', { class: 'meta', text: fonte }),
        conPulsante && rif ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA(rif.sezione, rif.schermata, rif.esperienza); } }, 'Torna alla risposta') : null));
  }

  function parte(titolo, contenuto, vuoto) {
    const pieno = Array.isArray(contenuto) ? contenuto.length : contenuto;
    return h('section', { class: 'dossier__parte' },
      h('h3', { text: titolo }),
      pieno ? contenuto : h('p', { class: 'vuoto', text: vuoto }));
  }

  function dossier(interattivo) {
    const b = L.componiBilancio(stato);
    const ind = D.INDIRIZZI.find(function (x) { return x.id === stato.profilo.indirizzo; });
    const data = stato.aggiornato ? new Date(stato.aggiornato).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const intestazione = [ind ? 'Indirizzo ' + ind.nome : '', stato.profilo.classe, data ? 'Aggiornato il ' + data : ''].filter(Boolean).join(' · ');

    const soFare = b.soFare.map(function (x) {
      return h('li', { class: 'voce' },
        h('p', null, h('strong', { text: x.situazione }), ' — ' + x.livello),
        x.esempio ? h('blockquote', { text: x.esempio }) : null,
        x.esperienze.length ? h('p', { class: 'meta', text: 'Esperienze: ' + x.esperienze.join(' · ') }) : null,
        interattivo ? h('p', { class: 'voce__fonte' }, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA(x.rif.sezione, x.rif.schermata); } }, 'Torna alla risposta')) : null);
    });
    const daDoc = b.daDocumentare.length ? [
      h('h4', { text: 'Da documentare' }),
      h('p', { class: 'nota', text: 'Hai indicato di saperlo fare, ma manca ancora un esempio.' }),
      h('ul', { class: 'voci' }, b.daDocumentare.map(function (x) { return voce('', x.situazione + ' — ' + x.livello, x.rif, interattivo); }))
    ] : [];

    const devo = b.devoImparare.map(function (x) { return voce(x.testo, x.fonte + (x.rif.sezione === 'sofare' ? ' — non lo so ancora fare' : ''), x.rif, interattivo); });
    const mai = b.maiAffrontato.length ? [
      h('h4', { text: 'Non l\'ho mai affrontato' }),
      h('p', { class: 'nota', text: 'Situazioni che il percorso non ti ha ancora proposto: non è la stessa cosa di «non lo so fare».' }),
      h('ul', { class: 'voci' }, b.maiAffrontato.map(function (x) { return voce(x.nota, x.situazione, x.rif, interattivo); }))
    ] : [];

    return h('article', { class: 'dossier', 'aria-label': 'Il tuo bilancio' },
      h('header', { class: 'dossier__testa' },
        h('p', { class: 'meta', text: 'Bilancio di competenze' }),
        h('p', { class: 'dossier__titolo', text: pieno(stato.profilo.nome) ? stato.profilo.nome : 'Il mio bilancio' }),
        intestazione ? h('p', { class: 'meta', text: intestazione }) : null),
      parte('So fare', (soFare.length ? [h('ul', { class: 'voci' }, soFare)] : []).concat(daDoc), 'Ancora nulla: compila la sezione «Che cosa so fare».'),
      parte('Ho imparato così', b.hoImparato.length ? h('ul', { class: 'voci' }, b.hoImparato.map(function (x) { return voce(x.testo, x.fonte, x.rif, interattivo); })) : null,
        'Ancora nulla: racconta le difficoltà e gli aiuti nelle esperienze, e come hai imparato nella sezione «Che cosa so fare».'),
      parte('Posso dimostrarlo', b.possoDimostrarlo.length ? h('ul', { class: 'voci' }, b.possoDimostrarlo.map(function (x) { return voce(x.testo, x.fonte, x.rif, interattivo); })) : null,
        'Ancora nulla: indica le prove nelle schede esperienza o gli esempi nella sezione «Che cosa so fare».'),
      parte('Devo ancora imparare', (devo.length ? [h('ul', { class: 'voci' }, devo)] : []).concat(mai),
        'Ancora nulla: rispondi alla domanda «Che cosa devi ancora imparare?» nella sezione «Uno sguardo critico».'),
      pieno(stato.orientamento.testo) ? h('section', { class: 'dossier__parte' },
        h('h3', { text: 'Per l\'open day' }),
        h('p', { class: 'libro orientamento-anteprima', text: stato.orientamento.testo })) : null);
  }

  function schermataBilancio() {
    const intro = null;
    const risposta = [
      h('p', { class: 'misura', text: 'Questo documento raccoglie soltanto le tue parole. Non è un voto: serve a te, al docente e a chi ti accompagnerà nelle scelte. Da ogni voce puoi tornare alla risposta per correggerla.' }),
      h('div', { class: 'home__azioni' },
        URL_INVIO ? h('button', { type: 'button', class: 'pulsante', onclick: inviaAlDocente }, 'Invia al docente') : null,
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: stampa }, 'Stampa o salva in PDF')),
      notaInvio(),
      dossier(true)
    ];
    return [testa(metaSchermata(), 'Il tuo bilancio'), corpo(intro, risposta, true)];
  }

  // ---------- 06 Orientamento ----------
  function schermataOrientamentoDomande() {
    const intro = [
      h('p', { text: 'Agli open day ti ascolteranno ragazzi e ragazze di terza media e le loro famiglie. Rispondi con parole tue: anche le difficoltà fanno parte del racconto.' }),
      aiuto('Frasi brevi, cose vere. Meglio un episodio preciso che un elenco di aggettivi.')
    ];
    const risposta = D.ORIENTAMENTO.map(function (o) {
      return campo({ id: 'f-or-' + o.id, etichetta: o.etichetta, suggerimento: 'Per esempio: ' + o.esempio, area: true, valore: stato.orientamento[o.id],
        aggiorna: function (v) { stato.orientamento[o.id] = v; } });
    });
    return [testa(metaSchermata(), 'Che cosa racconteresti a chi deve scegliere?'), corpo(intro, risposta)];
  }

  function schermataOrientamentoTesto() {
    const intro = [
      h('p', { text: 'Puoi partire da una bozza che mette in fila le tue risposte, senza cambiarle. Poi correggi, taglia, aggiungi.' }),
      aiuto('Nessuna correzione automatica: il testo resta tuo. Rileggilo ad alta voce prima di considerarlo finito.'),
      h('p', { class: 'nota', text: URL_INVIO
        ? 'Quando hai finito, premi «Invia al docente». Se correggi qualcosa dopo l\'invio, invia di nuovo: la tua riga verrà aggiornata.'
        : 'Quando hai finito, scarica una copia e consegnala come indicato dal docente. Puoi anche stampare il bilancio insieme a questo testo.' }),
      notaInvio()
    ];
    const risposta = [
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () {
          const bozza = L.componiOrientamento(stato);
          if (!bozza) { window.alert('Rispondi prima ad almeno una domanda della schermata precedente.'); return; }
          if (pieno(stato.orientamento.testo) && !window.confirm('Sostituire il testo attuale con la bozza delle tue risposte?')) return;
          stato.orientamento.testo = bozza;
          modificato();
          ridisegna('f-or-testo');
        } }, 'Componi una bozza dalle risposte'),
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: stampa }, 'Stampa bilancio e testo')),
      campo({ id: 'f-or-testo', etichetta: 'Il tuo testo', area: true, lungo: true, libro: true, valore: stato.orientamento.testo,
        aggiorna: function (v) { stato.orientamento.testo = v; } })
    ];
    return [testa(metaSchermata(), 'Il tuo testo per l\'open day'), corpo(intro, risposta)];
  }

  // ---------- Disegno ----------
  function schermataCorrente() {
    const sez = D.SEZIONI[vista.s];
    const sch = sez.schermate[vista.k];
    switch (sez.id) {
      case 'percorso': return sch.id === 'chi' ? schermataChi() : schermataAnni();
      case 'esperienze': return schermataEsperienze();
      case 'sofare': return schermataSituazione(D.SITUAZIONI.find(function (s) { return s.id === sch.id; }));
      case 'sguardo': return schermataSguardo(D.SGUARDO.find(function (g) { return g.id === sch.id; }));
      case 'bilancio': return schermataBilancio();
      case 'orientamento': return sch.id === 'domande' ? schermataOrientamentoDomande() : schermataOrientamentoTesto();
    }
    return [];
  }

  function disegna() {
    principale.textContent = '';
    if (!vista) {
      aggiungi(principale, disegnaHome());
    } else {
      aggiungi(principale, h('div', { class: 'lavoro' },
        h('nav', { class: 'rail', 'aria-label': 'Sezioni del bilancio' }, h('ol', { id: 'rail-elenco' })),
        h('div', null,
          h('section', { class: 'schermata' + (entrata ? ' schermata--entra' : ''), 'aria-labelledby': 'titolo-schermata' }, schermataCorrente()),
          navigazione())));
    }
    aggiornaTestata();
    aggiornaIndice();
  }

  // ---------- Copia, stampa, cancellazione ----------
  function nomeFile() {
    const nome = (stato.profilo.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const oggi = new Date().toISOString().slice(0, 10);
    return 'bilancio-competenze' + (nome ? '-' + nome : '') + '-' + oggi + '.json';
  }

  // ---------- Invio al Foglio Google del docente ----------
  function dataOra(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' alle ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function notaInvio() {
    if (!URL_INVIO) return null;
    if (!stato.inviato) return h('p', { class: 'nota', text: 'Non hai ancora inviato le risposte al docente.' });
    const modificato = stato.aggiornato && stato.aggiornato > stato.inviato;
    return h('p', { class: modificato ? 'avviso' : 'nota', text: 'Ultimo invio: ' + dataOra(stato.inviato) + '.' +
      (modificato ? ' Hai modificato qualcosa dopo: invia di nuovo per aggiornare.' : '') });
  }

  let invioInCorso = false;

  function inviaAlDocente() {
    if (!URL_INVIO || invioInCorso) return;
    if (!pieno(stato.profilo.nome) || !stato.profilo.indirizzo) {
      window.alert('Per inviare le risposte al docente servono il tuo nome e l\'indirizzo. Li trovi nella prima schermata.');
      if ($('dialogo-risposte').open) $('dialogo-risposte').close();
      vaiA('percorso', 'chi');
      return;
    }
    if (!window.confirm('Inviare le risposte al foglio del docente? Potrai correggerle e inviarle di nuovo: la tua riga verrà aggiornata.')) return;

    clearTimeout(timerSalva);
    scriviArchivio();
    invioInCorso = true;
    $('salvato').textContent = 'Invio in corso…';
    // text/plain evita la richiesta preliminare CORS, che Apps Script non gestisce.
    fetch(URL_INVIO, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(stato),
      redirect: 'follow'
    })
      .then(function (r) { return r.json(); })
      .then(function (esito) {
        if (!esito || !esito.ok) throw new Error((esito && esito.errore) || 'risposta');
        stato.inviato = new Date().toISOString(); // ora del dispositivo, confrontabile con «aggiornato»
        try { localStorage.setItem(CHIAVE, JSON.stringify(stato)); } catch (e) { /* resta in memoria */ }
        $('salvato').textContent = 'Inviato alle ' + new Date(stato.inviato).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        if ($('dialogo-risposte').open) aggiornaDialogo();
        if (vista) ridisegna();
        window.alert('Risposte inviate al docente.');
      })
      .catch(function (err) {
        $('salvato').textContent = 'Invio non riuscito';
        window.alert(err && err.message === 'nome'
          ? 'Invio non riuscito: manca il nome.'
          : 'Invio non riuscito. Controlla la connessione e riprova; se non funziona, scarica una copia e consegnala al docente.');
      })
      .then(function () { invioInCorso = false; });
  }

  function aggiornaDialogo() {
    const el = $('esito-dialogo');
    el.textContent = '';
    aggiungi(el, notaInvio());
  }

  function scaricaCopia() {
    clearTimeout(timerSalva);
    scriviArchivio();
    const blob = new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nomeFile() });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    $('salvato').textContent = 'Copia scaricata';
  }

  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) {
        window.alert('Il file non è una copia valida del bilancio.');
        return;
      }
      if (!dati || dati.versione !== L.VERSIONE || !dati.profilo) {
        window.alert('Il file non è una copia valida del bilancio.');
        return;
      }
      if (stato.aggiornato && !window.confirm('Sostituire le risposte attuali con quelle del file?')) return;
      stato = L.normalizza(dati);
      scriviArchivio();
      $('dialogo-risposte').close();
      vai(null);
    };
    lettore.readAsText(file);
  }

  function preparaStampa() {
    const s = $('stampa');
    s.textContent = '';
    s.appendChild(dossier(false));
  }

  function stampa() {
    preparaStampa();
    window.print();
  }

  function cancellaTutto() {
    if (!window.confirm('Cancellare tutte le risposte da questo browser? Se non hai scaricato una copia, andranno perse.')) return;
    clearTimeout(timerSalva);
    timerSalva = null;
    try { localStorage.removeItem(CHIAVE); localStorage.removeItem(CHIAVE_POSIZIONE); } catch (e) { /* niente da fare */ }
    stato = L.statoVuoto();
    ripresa = null;
    $('salvato').textContent = 'Risposte cancellate';
    $('dialogo-risposte').close();
    vai(null);
  }

  // ---------- Avvio ----------
  caricaArchivio();
  disegna();
  if (!archivioDisponibile) $('salvato').textContent = 'Salvataggio non disponibile: scarica una copia';
  else if (stato.aggiornato) $('salvato').textContent = 'Risposte ritrovate';

  $('vai-home').addEventListener('click', function () { vai(null); });
  $('apri-risposte').addEventListener('click', function () { aggiornaDialogo(); $('dialogo-risposte').showModal(); });
  if (URL_INVIO) {
    $('invia').hidden = false;
    $('invia').addEventListener('click', inviaAlDocente);
    $('scarica').className = 'pulsante pulsante--secondario';
    $('testo-dialogo').textContent = 'Sono salvate su questo dispositivo, in questo browser, e arrivano al docente solo quando premi «Invia al docente». Puoi inviarle più volte: conta l\'ultimo invio.';
  }
  $('chiudi-risposte').addEventListener('click', function () { $('dialogo-risposte').close(); });
  $('apri-indice').addEventListener('click', function () { $('dialogo-indice').showModal(); });
  $('chiudi-indice').addEventListener('click', function () { $('dialogo-indice').close(); });
  $('scarica').addEventListener('click', scaricaCopia);
  $('carica').addEventListener('click', function () { $('file-copia').click(); });
  $('file-copia').addEventListener('change', function (e) {
    if (e.target.files[0]) caricaCopia(e.target.files[0]);
    e.target.value = '';
  });
  $('stampa-dialogo').addEventListener('click', function () { $('dialogo-risposte').close(); stampa(); });
  $('cancella').addEventListener('click', cancellaTutto);
  window.addEventListener('beforeprint', preparaStampa);
})();
