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

  // Messaggi e conferme in un dialogo dell'app, al posto di alert e confirm del browser.
  function messaggio(testo, o) {
    const d = $('dialogo-messaggio');
    const opz = o || {};
    if (d.open) d.close();
    $('messaggio-testo').textContent = testo;
    $('messaggio-ok').textContent = opz.ok || 'Va bene';
    $('messaggio-annulla').textContent = opz.annulla || 'Annulla';
    $('messaggio-annulla').hidden = !opz.conferma;
    $('messaggio-ok').onclick = function () { d.close(); if (opz.conferma) opz.conferma(); };
    $('messaggio-annulla').onclick = function () { d.close(); };
    d.showModal();
  }
  function avvisa(testo) { messaggio(testo); }
  function chiedi(testo, ok, conferma, annulla) { messaggio(testo, { ok: ok, conferma: conferma, annulla: annulla }); }

  // Il campo di testo cresce con quello che si scrive.
  function adattaAltezza(el) {
    el.style.height = 'auto';
    if (el.scrollHeight > el.clientHeight) el.style.height = (el.scrollHeight + 2) + 'px';
  }

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
      if (grezzo) {
        const dati = JSON.parse(grezzo);
        portaIlCurriculum(dati);
        stato = L.normalizza(dati);
      }
      const pos = JSON.parse(localStorage.getItem(CHIAVE_POSIZIONE) || 'null');
      if (pos && D.SEZIONI[pos.s] && D.SEZIONI[pos.s].schermate[pos.k]) ripresa = { s: pos.s, k: pos.k };
    } catch (e) {
      archivioDisponibile = false;
    }
  }

  // Una versione precedente conservava il curriculum dentro il bilancio. Prima che il bilancio lo lasci cadere salvandosi,
  // lo si mette al sicuro nel salvataggio del sito del curriculum (una volta sola: se c'è già, non si tocca).
  function portaIlCurriculum(dati) {
    try {
      if (!window.BC_CV || localStorage.getItem(window.BC_CV.CHIAVE)) return;
      const vecchio = window.BC_CV.daBilancioVecchio(dati);
      if (vecchio) localStorage.setItem(window.BC_CV.CHIAVE, JSON.stringify(vecchio));
    } catch (e) { /* il curriculum resta nella copia scaricata */ }
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
    let trovata = D.SEZIONI[s].schermate.findIndex(function (x) { return x.id === schermataId; });
    // Una situazione di «Che cosa so fare» si apre nel secondo tempo, quello degli esempi.
    if (sezioneId === 'sofare' && trovata === -1 && D.SITUAZIONI.some(function (x) { return x.id === schermataId; })) {
      trovata = D.SEZIONI[s].schermate.findIndex(function (x) { return x.id === 'esempi'; });
      situazioneAperta = schermataId;
    }
    const k = Math.max(0, trovata);
    esperienzaAperta = esperienzaId || null;
    vai(s, k, { tieniEsperienza: true });
    // Una domanda dello sguardo critico è un blocco della schermata: ci si porta lì.
    const ancora = trovata === -1 ? $('blocco-sg-' + schermataId) : null;
    if (ancora) { ancora.scrollIntoView(); ancora.focus({ preventScroll: true }); }
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
    // Nodi circolari in corrispondenza delle sezioni, senza alterare la navigazione.
    const avanzamento = $('avanzamento');
    avanzamento.querySelectorAll('.avanzamento__nodo').forEach(function (n) { n.remove(); });
    D.SEZIONI.forEach(function (sezione, indice) {
      const primaSchermata = SEQUENZA.findIndex(function (t) { return t[0] === indice; });
      const percentuale = D.SEZIONI.length === 1 ? 50 : (primaSchermata / (SEQUENZA.length - 1)) * 100;
      const nodo = document.createElement('span');
      nodo.className = 'avanzamento__nodo' + (indice === vista.s ? ' avanzamento__nodo--attivo' : indice < vista.s ? ' avanzamento__nodo--completato' : '');
      nodo.style.left = percentuale + '%';
      nodo.setAttribute('aria-hidden', 'true');
      avanzamento.appendChild(nodo);
    });
    $('tappa-nome').textContent = D.SEZIONI[vista.s].titolo;
  }

  // ---------- Elementi ricorrenti ----------
  function campo(o) {
    const id = o.id;
    const sugg = o.suggerimento ? h('p', { class: 'campo__suggerimento', id: id + '-sugg', text: o.suggerimento }) : null;
    let controllo;
    if (o.area) {
      controllo = h('textarea', {
        id: id, class: [o.lungo ? 'lungo' : '', o.libro ? 'libro' : ''].join(' ').trim() || null,
        rows: o.righe || null, maxlength: o.max || 4000,
        'aria-describedby': sugg ? id + '-sugg' : null,
        'aria-labelledby': o.etichettaDa || null,
        value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); adattaAltezza(e.target); modificato(); }
      });
    } else {
      controllo = h('input', {
        type: o.tipo || 'text', id: id, maxlength: o.max || 200, autocomplete: o.autocomplete || 'off',
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
      h('div', { class: 'scelte' + (o.riga ? ' scelte--riga' : '') + (o.quattro ? ' scelte--quattro' : '') },
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

  function casella(o) {
    return h('label', { class: 'scelta', for: o.id },
      h('input', { type: 'checkbox', id: o.id, checked: o.valore, onchange: function (e) { o.aggiorna(e.target.checked); } }),
      h('span', { text: o.testo }));
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
    return String(vista.s + 1).padStart(2, '0') + ' / ' + String(D.SEZIONI.length).padStart(2, '0') +
      (extra ? ' · ' + extra : '');
  }

  function corpo(intro, risposta, pieno) {
    return h('div', { class: 'schermata__corpo' + (pieno ? ' schermata__corpo--pieno' : '') },
      intro ? h('div', { class: 'colonna-intro' }, intro) : null,
      h('div', { class: 'colonna-risposta' }, risposta));
  }

  // Schermata a tutta larghezza: la spiegazione in una fascia in alto e il lavoro sotto, senza colonna stretta.
  function corpoLargo(intro, risposta) {
    return h('div', { class: 'schermata__corpo schermata__corpo--largo' },
      intro ? h('div', { class: 'fascia' }, intro) : null,
      h('div', { class: 'lavoro-largo' }, risposta));
  }

  // Da 900px c'è spazio per affiancare l'elenco e la voce aperta; sotto, una cosa per volta.
  function largo() { return window.matchMedia('(min-width: 900px)').matches; }

  // Elenco + dettaglio. gruppi: [{ id, titolo, azioni }] (facoltativi); voci: [{ id, gruppo, titolo, nota, stato }];
  // aperta: id della voce aperta; dettaglio: il nodo della voce aperta; apri(id), chiudi(): azioni.
  function elencoDettaglio(o) {
    const gruppi = o.gruppi || [{ id: '' }];
    const elenco = h('div', { class: 'ed__elenco', role: 'group', 'aria-label': o.aria },
      gruppi.map(function (g) {
        const voci = o.voci.filter(function (v) { return (v.gruppo || '') === g.id; });
        return h('section', { class: 'ed__gruppo' },
          g.titolo ? h('h3', { class: 'ed__titolo-gruppo', text: g.titolo }) : null,
          voci.length ? h('ul', { class: 'ed__voci' }, voci.map(function (v) {
            return h('li', null, h('button', {
              type: 'button', id: o.prefisso + v.id,
              class: 'ed__voce' + (v.id === o.aperta ? ' ed__voce--aperta' : '') + (v.stato === 'manca' ? ' ed__voce--manca' : ''),
              'aria-current': v.id === o.aperta ? 'true' : null,
              onclick: function () { o.apri(v.id); }
            },
              h('span', { class: 'ed__voce-titolo', text: v.titolo }),
              v.nota ? h('span', { class: 'meta ed__voce-nota', text: v.nota }) : null));
          })) : null,
          g.azioni || null);
      }));
    const dettaglio = h('div', { class: 'ed__dettaglio' },
      o.aperta ? h('button', { type: 'button', class: 'pulsante pulsante--testo ed__torna', onclick: o.chiudi }, 'Torna all\'elenco') : null,
      o.dettaglio || h('p', { class: 'vuoto ed__vuoto', text: o.vuoto }));
    return h('div', { class: 'ed' + (o.aperta ? ' ed--aperto' : '') }, elenco, dettaglio);
  }

  function navigazione() {
    const i = posizione();
    const ultima = i === SEQUENZA.length - 1;
    const sez = D.SEZIONI[vista.s];
    return h('nav', { class: 'navigazione', 'aria-label': 'Navigazione tra le schermate' },
      h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { passo(-1); } }, 'Indietro'),
      sez.schermate.length > 1 ? h('span', { class: 'meta', text: 'Passo ' + (vista.k + 1) + ' di ' + sez.schermate.length }) : null,
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
      h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' }),
      h('h1', { text: 'Bilancio di competenze' }),
      h('p', { class: 'home__sottotitolo', text: 'Che cosa hai imparato finora?' }),
      h('p', { class: 'home__testo misura', text: 'Ricostruisci le esperienze del tuo percorso, riconosci ciò che sai fare e individua quello che devi ancora imparare. Alla fine avrai un bilancio scritto con le tue parole e un breve testo per presentarti agli open day. Il curriculum è un percorso a parte: lo trovi nella pagina iniziale.' }),
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
      h('p', { text: URL_INVIO
        ? 'Indirizzo e nome servono a intestare il tuo bilancio e a inviarlo al docente. L\'indirizzo ti mostra anche esempi adatti a te.'
        : 'Queste informazioni servono a intestare il tuo bilancio e a mostrarti esempi del tuo indirizzo. Il nome compare solo sul documento che stampi o scarichi.' })
    ];
    const risposta = [
      gruppoScelte({
        legenda: 'Che anno frequenti?', nome: 'anno', riga: true, quattro: true,
        opzioni: D.ANNI.map(function (x) { return { id: x.id, testo: x.testo }; }),
        valore: stato.profilo.anno,
        aggiorna: function (id) { stato.profilo.anno = id; modificato(); }
      }),
      gruppoScelte({
        legenda: 'Quale indirizzo frequenti?', nome: 'indirizzo',
        opzioni: D.INDIRIZZI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: stato.profilo.indirizzo,
        aggiorna: function (id) { stato.profilo.indirizzo = id; modificato(); }
      }),
      campo({ id: 'f-nome', etichetta: URL_INVIO ? 'Nome e cognome' : 'Nome e cognome', suggerimento: URL_INVIO ? 'Serve per inviare il bilancio al docente.' : null, max: 80, autocomplete: 'name', valore: stato.profilo.nome, aggiorna: function (v) { stato.profilo.nome = v; } }),
      campo({ id: 'f-classe', etichetta: 'Classe', max: 40, valore: stato.profilo.classe, aggiorna: function (v) { stato.profilo.classe = v; } })
    ];
    return [testa(metaSchermata(), 'Da dove parti'), corpo(intro, risposta)];
  }

  // I tirocini variano da studente a studente (alternanza simulata o tirocinio al primo anno, uno o più negli anni
  // successivi, percorsi personalizzati): un solo campo, con parole che valgono per qualunque caso.
  function etichettaRicordo(k) {
    return k === 'tirocinio' ? 'Alternanza o tirocini' : L.nomeQuando(k);
  }

  function schermataAnni() {
    const nomi = { anno1: 'I anno', anno2: 'II anno', anno3: 'III anno', anno4: 'IV anno', tirocinio: etichettaRicordo('tirocinio') };
    // Si chiede solo degli anni già vissuti; quelli nascosti restano nei dati se lo studente cambia anno.
    const campi = L.anniDelPercorso(stato.profilo.anno).concat('tirocinio');
    const intro = [
      h('p', { text: stato.profilo.anno === 'anno1'
        ? 'Scrivi che cosa ricordi di questo primo anno: un laboratorio, una persona, un lavoro, un momento difficile. Bastano poche parole.'
        : 'Per ogni anno scrivi che cosa ricordi: un laboratorio, una persona, un lavoro, un momento difficile. Bastano poche parole.' }),
      aiuto('Non serve essere completi. Queste righe ti aiuteranno a ritrovare le esperienze nella prossima sezione.', 'Se un anno non l\'hai frequentato qui, lascia il campo vuoto.'),
      esempio('Vedi un esempio', h('p', { text: '«I anno: il primo circuito con il deviatore su un pannello di prova. Ho sbagliato i collegamenti e li ho rifatti due volte.»' }))
    ];
    const risposta = h('div', { class: 'anni' }, campi.map(function (k) {
      return campo({ id: 'f-' + k, etichetta: nomi[k], suggerimento: k === 'tirocinio' ? 'Scrivi di tutti quelli che hai fatto, anche se sono più di uno o in anni diversi.' : null, area: true, righe: 3, valore: stato.anni[k], aggiorna: function (v) { stato.anni[k] = v; } });
    }));
    return [testa(metaSchermata(), stato.profilo.anno === 'anno1' ? 'Il tuo primo anno in poche righe' : 'Il tuo percorso in poche righe'), corpo(intro, risposta)];
  }

  // ---------- 02 Che cosa hai fatto ----------
  // Una cosa precisa per volta, raggruppata per contesto (scuola, tirocinio, fuori). Il dato salvato resta quello di sempre:
  // il contesto raggruppa i periodi (quando), non è un campo nuovo.
  const contestoNuovo = {}; // id esperienza → contesto scelto prima di avere il periodo («scuola» chiede ancora l'anno)

  function contestoDi(e) {
    const c = D.CONTESTI.find(function (x) { return x.quando.indexOf(e.quando) !== -1; });
    return c ? c.id : (contestoNuovo[e.id] || '');
  }

  function mancanti(e) {
    const m = [];
    if (!pieno(e.azione)) m.push('che cosa hai fatto');
    if (!pieno(e.titolo)) m.push('un nome');
    if (!e.quando) m.push('dove e quando');
    return m;
  }

  function riassunto(testo) {
    const s = String(testo || '').trim().replace(/\s+/g, ' ');
    return s.length > 46 ? s.slice(0, 44).trim() + '…' : s;
  }

  function titoloVoce(e) {
    return pieno(e.titolo) ? e.titolo.trim() : (pieno(e.azione) ? riassunto(e.azione) : 'Una cosa nuova');
  }

  function notaVoce(e) {
    const m = mancanti(e);
    return [L.nomeQuando(e.quando), m.length ? 'manca: ' + m[0] : 'completa'].filter(Boolean).join(' · ');
  }

  // Il periodo dell'esperienza: solo gli anni già vissuti, il tirocinio e «fuori da scuola».
  // Un valore già scelto resta sempre disponibile, anche se poi lo studente cambia anno.
  function opzioniQuando(attuale) {
    const visibili = L.anniDelPercorso(stato.profilo.anno);
    return D.QUANDO.filter(function (x) {
      return x.id === attuale || x.id === 'tirocinio' || x.id === 'fuori' || visibili.indexOf(x.id) !== -1;
    });
  }

  function nuovaEsperienza(contestoId) {
    const e = L.esperienzaVuota();
    if (contestoId === 'tirocinio' || contestoId === 'fuori') e.quando = contestoId;
    else { contestoNuovo[e.id] = 'scuola'; if (stato.profilo.anno) e.quando = stato.profilo.anno; }
    stato.esperienze.push(e);
    esperienzaAperta = e.id;
    modificato();
    ridisegna('f-esp-' + e.id + '-azione');
  }

  function eliminaEsperienza(e) {
    chiedi('Eliminare «' + titoloVoce(e) + '»? Non si può annullare.', 'Elimina', function () {
      stato.esperienze = stato.esperienze.filter(function (x) { return x.id !== e.id; });
      Object.keys(stato.sofare).forEach(function (k) {
        stato.sofare[k].esperienze = stato.sofare[k].esperienze.filter(function (id) { return id !== e.id; });
      });
      esperienzaAperta = null;
      modificato();
      ridisegna();
    });
  }

  // Aggiorna nell'elenco il nome e lo stato della voce mentre si scrive, senza ridisegnare.
  function aggiornaVoce(e) {
    const b = $('esp-voce-' + e.id);
    if (!b) return;
    b.querySelector('.ed__voce-titolo').textContent = titoloVoce(e);
    b.querySelector('.ed__voce-nota').textContent = notaVoce(e);
    b.classList.toggle('ed__voce--manca', mancanti(e).length > 0);
  }

  const MESSAGGI_VAGHEZZA = {
    generica: '«Tirocinio» o «scuola» dicono dove eri, non che cosa hai fatto. Scrivi una cosa precisa, con un verbo: «Ho montato…», «Ho configurato…», «Ho accolto…».',
    corta: 'Racconta un po\' di più: con che cosa lavoravi, con chi, come è andata?'
  };

  function dettaglioEsperienza(e) {
    const p = 'f-esp-' + e.id + '-';
    const ctx = contestoDi(e);
    const testoCampo = function (chiave, etichetta, suggerimento, righe, dopo) {
      return campo({ id: p + chiave, etichetta: etichetta, suggerimento: suggerimento, area: true, righe: righe || 3, valore: e[chiave],
        aggiorna: function (v) { e[chiave] = v; aggiornaVoce(e); if (dopo) dopo(); } });
    };

    // Avvisi che compaiono mentre si scrive: non bloccano niente.
    const avvisoAzione = h('p', { class: 'suggerimento-vivo', id: p + 'azione-avviso', role: 'status', 'aria-live': 'polite', hidden: true });
    const controllaAzione = function () {
      const c = L.vaghezza(e.azione);
      avvisoAzione.hidden = !c;
      avvisoAzione.textContent = MESSAGGI_VAGHEZZA[c] || '';
    };
    const avvisoTitolo = h('p', { class: 'suggerimento-vivo', id: p + 'titolo-avviso', role: 'status', 'aria-live': 'polite', hidden: true });
    const controllaTitolo = function () {
      const g = L.titoloGenerico(e.titolo);
      avvisoTitolo.hidden = !g;
      avvisoTitolo.textContent = g ? '«' + e.titolo.trim() + '» dice solo dove. Dai un nome a quello che hai fatto: «Quadro elettrico in tirocinio», «Rete dell\'ufficio».' : '';
    };

    const dove = gruppoScelte({
      legenda: 'Dove è successo?', nome: p + 'dove', riga: true,
      opzioni: D.CONTESTI.map(function (c) { return { id: c.id, testo: c.breve }; }), valore: ctx,
      aggiorna: function (id) {
        if (id === 'scuola') {
          contestoNuovo[e.id] = 'scuola';
          if (D.CONTESTI[0].quando.indexOf(e.quando) === -1) e.quando = stato.profilo.anno || '';
        } else { e.quando = id; delete contestoNuovo[e.id]; }
        modificato();
        ridisegna(p + 'dove-' + id);
      }
    });
    const anno = ctx === 'scuola' ? gruppoScelte({
      legenda: 'In che anno?', nome: p + 'anno', riga: true,
      opzioni: opzioniQuando(e.quando).filter(function (x) { return D.CONTESTI[0].quando.indexOf(x.id) !== -1; }), valore: e.quando,
      aggiorna: function (id) { e.quando = id; modificato(); aggiornaVoce(e); }
    }) : null;
    const luogo = ctx === 'tirocinio'
      ? testoCampo('contesto', 'Dove eri e con chi?', 'L\'azienda, la città e chi ti seguiva. Per esempio: «Impianti Verdi, Milano, con il tutor Marco».', 2) : null;

    const esempioAzione = esempio('Vedi un esempio', esempiPerIndirizzo(Object.keys(D.ESEMPI_ESPERIENZA).reduce(function (m, k) { m[k] = '«' + D.ESEMPI_ESPERIENZA[k].azione + '»'; return m; }, {})));

    const forma = h('div', { class: 'ed__forma' },
      h('h3', { text: 'Una cosa che hai fatto' }),
      dove, anno, luogo,
      testoCampo('azione', 'Che cosa hai fatto tu, di preciso?', 'Una cosa sola: un lavoro, un giorno, un compito. Comincia con un verbo: «Ho montato…», «Ho preparato…», «Ho spiegato…».', 4, controllaAzione),
      avvisoAzione,
      esempioAzione,
      campo({ id: p + 'titolo', etichetta: 'Come la chiami? Poche parole', suggerimento: 'Serve a ritrovarla nell\'elenco: «Quadro elettrico in laboratorio».', max: 200, valore: e.titolo,
        aggiorna: function (v) { e.titolo = v; aggiornaVoce(e); controllaTitolo(); } }),
      avvisoTitolo,
      h('div', { class: 'due-colonne' },
        testoCampo('difficolta', 'Che cosa è stato difficile?', 'Che cosa non sapevi fare prima?', 3),
        testoCampo('aiuto', 'Chi o che cosa ti ha aiutato?', 'Un compagno, il tutor, un manuale, un video, un errore.', 3)),
      testoCampo('prova', 'Come potresti dimostrarlo?', 'Una foto, un lavoro finito, una relazione, il giudizio del tutor o del docente.', 3),
      h('details', { class: 'dettagli', open: !!e.autonomia || (ctx !== 'tirocinio' && pieno(e.contesto)) },
        h('summary', { text: 'Altri dettagli' }),
        h('div', { class: 'dettagli__corpo' },
          ctx !== 'tirocinio' ? testoCampo('contesto', 'Dove eri e con chi?', null, 2) : null,
          gruppoScelte({
            legenda: 'Oggi, quanto sapresti rifarlo?', nome: p + 'autonomia', riga: true, opzioni: D.AUTONOMIA, valore: e.autonomia,
            aggiorna: function (id) { e.autonomia = id; modificato(); }
          }))),
      h('div', { class: 'ed__azioni-fine' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () { esperienzaAperta = null; ridisegna('esp-voce-' + e.id); } }, 'Fatto'),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { eliminaEsperienza(e); } }, 'Elimina')));
    controllaAzione();
    controllaTitolo();
    return forma;
  }

  // ---------- Diario di bordo del tirocinio ----------
  // Il diario è un sito a parte, sullo stesso indirizzo. Il bilancio ne importa i tirocini (anche il curriculum, che è un altro sito):
  // dal salvataggio dello stesso browser oppure da una copia del diario caricata da file (per esempio da un altro dispositivo).
  let diarioCaricato = null; // letto da file, resta in memoria e non viene salvato nel bilancio

  function proposteDalDiario() {
    try {
      const g = diarioCaricato || JSON.parse(localStorage.getItem('diario-tirocinio-v1') || 'null');
      return L.esperienzeDalDiario(g);
    } catch (e) { return []; }
  }

  function scegliFileDiario() {
    const inp = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: function (e) {
      const f = e.target.files[0];
      inp.remove();
      if (!f) return;
      const lettore = new FileReader();
      lettore.onload = function () {
        let d;
        try { d = JSON.parse(lettore.result); } catch (x) { avvisa('Il file non è una copia valida del diario.'); return; }
        if (!d || d.versione !== 1 || !Array.isArray(d.tirocini)) { avvisa('Il file non è una copia valida del diario.'); return; }
        diarioCaricato = d;
        ridisegna();
      };
      lettore.readAsText(f);
    } });
    document.body.appendChild(inp);
    inp.click();
  }

  // Il riquadro «Dal tuo diario di bordo». azione: { intro, pulsante(pr), gia(pr), crea(pr) }
  function riquadroDiario(azione) {
    const proposte = proposteDalDiario();
    const carica = h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: scegliFileDiario }, 'Carica la copia di un diario');
    if (!proposte.length) {
      return h('details', { class: 'esempio' },
        h('summary', { text: 'Hai scritto un diario di bordo dei tirocini?' }),
        h('div', { class: 'esempio__corpo' },
          h('p', { text: 'Se l\'hai compilato su questo dispositivo comparirà qui da solo. Se l\'hai scritto su un altro dispositivo scarica una copia dal diario e caricala qui.' }),
          h('p', null, carica)));
    }
    return aiuto(
      h('p', { class: 'meta', text: 'Dal tuo diario di bordo' }),
      h('p', { text: azione.intro }),
      proposte.map(function (pr) {
        const gia = azione.gia(pr);
        return h('p', null,
          h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', disabled: gia, onclick: function () { azione.crea(pr); } }, gia ? 'Già inserito: ' + azione.nome(pr) : azione.pulsante(pr)),
          ' ', h('span', { class: 'meta', text: pr.settimane + (pr.settimane === 1 ? ' settimana' : ' settimane') }));
      }),
      diarioCaricato ? h('p', null, h('span', { class: 'meta', text: 'Diario caricato da file. ' }),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { diarioCaricato = null; ridisegna(); } }, 'Dimentica il file'))
        : h('p', null, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: scegliFileDiario }, 'Carica la copia di un altro diario')));
  }

  function schermataEsperienze() {
    const anni = Object.keys(stato.anni).filter(function (k) { return pieno(stato.anni[k]); });
    const pieneAbbastanza = stato.esperienze.length >= L.MAX_ESPERIENZE;
    const intro = [
      h('p', { text: 'Racconta le cose che hai fatto davvero, una alla volta: un lavoro, un montaggio, un trattamento, una consegna. Non «il tirocinio» in generale: una cosa precisa che hai fatto lì.' }),
      aiuto('Bastano due o tre cose. Per ognuna dici dove, che cosa hai fatto tu e come potresti dimostrarlo. Nel bilancio entra solo quello che scrivi.'),
      anni.length ? esempio('I tuoi appunti sul percorso', h('dl', null, anni.map(function (k) {
        return [h('dt', { text: etichettaRicordo(k) }), h('dd', { text: stato.anni[k] })];
      }))) : null,
      riquadroDiario({
        intro: 'Hai scritto il diario dei tirocini. Puoi trasformarne uno alla volta in una cosa da raccontare: poi rileggila e correggila.',
        nome: function (pr) { return pr.titolo; },
        pulsante: function (pr) { return 'Crea la scheda: ' + pr.titolo; },
        gia: function (pr) { return pieneAbbastanza || stato.esperienze.some(function (x) { return x.titolo === pr.titolo; }); },
        crea: function (pr) {
          const e = L.esperienzaVuota();
          e.titolo = pr.titolo; e.quando = 'tirocinio'; e.contesto = pr.contesto; e.azione = pr.azione; e.difficolta = pr.difficolta; e.aiuto = pr.aiuto;
          stato.esperienze.push(e);
          esperienzaAperta = e.id;
          modificato();
          ridisegna('f-esp-' + e.id + '-azione');
        }
      })
    ];

    // Da desktop c'è sempre una voce aperta; sul telefono si parte dall'elenco.
    if (!esperienzaAperta && stato.esperienze.length && largo()) {
      const prima = stato.esperienze.find(function (x) { return mancanti(x).length; }) || stato.esperienze[0];
      esperienzaAperta = prima.id;
    }
    const aperta = stato.esperienze.find(function (x) { return x.id === esperienzaAperta; }) || null;
    if (!aperta) esperienzaAperta = null;

    const gruppi = D.CONTESTI.map(function (c) {
      return {
        id: c.id, titolo: c.titolo,
        azioni: h('p', { class: 'ed__azioni' }, h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', disabled: pieneAbbastanza,
          'aria-label': 'Aggiungi una cosa: ' + c.titolo.toLowerCase(), onclick: function () { nuovaEsperienza(c.id); } }, '+ Aggiungi'))
      };
    });
    const senza = stato.esperienze.filter(function (e) { return !contestoDi(e); });
    if (senza.length) gruppi.push({ id: 'senza', titolo: 'Da collocare' });

    const risposta = elencoDettaglio({
      aria: 'Le cose che hai fatto', prefisso: 'esp-voce-', aperta: esperienzaAperta,
      gruppi: gruppi,
      voci: stato.esperienze.map(function (e) {
        return { id: e.id, gruppo: contestoDi(e) || 'senza', titolo: titoloVoce(e), nota: notaVoce(e), stato: mancanti(e).length ? 'manca' : 'ok' };
      }),
      apri: function (id) { esperienzaAperta = id; ridisegna('f-esp-' + id + '-azione'); },
      chiudi: function () { const id = esperienzaAperta; esperienzaAperta = null; ridisegna('esp-voce-' + id); },
      dettaglio: aperta ? dettaglioEsperienza(aperta) : null,
      vuoto: 'Scegli dove è successa una cosa e premi «+ Aggiungi». Poi racconta che cosa hai fatto tu.'
    });
    return [testa(metaSchermata(), 'Che cosa hai fatto'), corpoLargo(intro, risposta)];
  }

  // ---------- 03 Che cosa so fare (in due tempi) ----------
  // Primo tempo: il livello per ognuna delle sei situazioni. Secondo tempo: l'esempio, scegliendo tra le cose già raccontate
  // o scrivendolo, solo per le situazioni che si dichiarano di saper fare. Le regole non cambiano: senza esempio la voce resta
  // «da documentare»; «mai affrontato» è diverso da «non lo so ancora fare».
  let situazioneAperta = null;

  function livelloDi(sit) {
    return D.AUTONOMIA.find(function (a) { return a.id === stato.sofare[sit.id].livello; }) || null;
  }

  function rigaLivello(sit) {
    const r = stato.sofare[sit.id];
    const p = 'f-sf-' + sit.id + '-';
    const scegli = function (id, idFocus) { r.livello = id; modificato(); ridisegna(idFocus); };
    const radio = h('div', { class: 'livelli__scelte' }, D.AUTONOMIA.map(function (a) {
      const id = p + 'livello-' + a.id;
      return h('label', { class: 'livello', for: id },
        h('input', { type: 'radio', name: p + 'livello', id: id, value: a.id, checked: r.livello === a.id, onchange: function () { scegli(a.id, id); } }),
        h('span', { text: a.testo }));
    }));
    // Sul telefono un selettore: una riga per situazione invece di cinque.
    const select = h('select', { class: 'livelli__select', id: p + 'livello-select', 'aria-label': sit.domanda, onchange: function (ev) { scegli(ev.target.value, p + 'livello-select'); } },
      h('option', { value: '', text: 'Scegli la frase più vicina…' }),
      D.AUTONOMIA.map(function (a) { return h('option', { value: a.id, text: a.testo, selected: r.livello === a.id }); }));
    return h('div', { class: 'livelli__riga', role: 'group', 'aria-labelledby': 'blocco-' + sit.id },
      h('h3', { id: 'blocco-' + sit.id, tabindex: '-1', text: sit.domanda }),
      esempio('Che cosa conta · un esempio', [h('p', { text: sit.anche })].concat(esempiPerIndirizzo(sit.esempi))),
      radio, select);
  }

  function schermataLivelli() {
    const fatte = D.SITUAZIONI.filter(function (s) { return stato.sofare[s.id].livello; }).length;
    const intro = [
      h('p', { text: 'Sei situazioni di lavoro tra le più comuni. Per ognuna scegli la frase più vicina alla verità di oggi.' }),
      aiuto('Non c\'è una risposta giusta: «non l\'ho mai affrontato» è una risposta come le altre. Se dici di saperlo fare, nel passo dopo ti chiediamo un esempio: senza esempio la voce resta in sospeso nel bilancio.'),
      h('p', { class: 'meta livelli__conta', role: 'status', text: fatte + ' situazioni su ' + D.SITUAZIONI.length + ' con una risposta' })
    ];
    const risposta = h('div', { class: 'livelli' }, D.SITUAZIONI.map(rigaLivello));
    return [testa(metaSchermata(), 'Quanto lo sai fare, oggi?'), corpoLargo(intro, risposta)];
  }

  function notaSituazione(sit) {
    const l = livelloDi(sit);
    if (!l) return { nota: 'scegli prima il livello', stato: 'manca' };
    if (l.dichiara) return L.haProva(stato, sit.id) ? { nota: 'so fare · con esempio', stato: 'ok' } : { nota: 'so fare · manca l\'esempio', stato: 'manca' };
    return { nota: l.breve + ' · facoltativo', stato: 'ok' };
  }

  function dettaglioSituazione(sit) {
    const r = stato.sofare[sit.id];
    const l = livelloDi(sit);
    const p = 'f-sf-' + sit.id + '-';
    const parti = [
      h('h3', { id: 'blocco-' + sit.id, tabindex: '-1', text: sit.domanda }),
      l
        ? h('p', { class: 'nota' }, 'Hai scelto: «' + l.testo + '». ',
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA('sofare', 'livelli'); } }, 'Cambia'))
        : h('p', { class: 'nota' }, 'Prima scegli quanto lo sai fare. ',
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA('sofare', 'livelli'); } }, 'Vai alla scelta'))
    ];
    if (l && l.dichiara) {
      const avviso = h('p', { class: 'avviso', id: p + 'avviso', role: 'note', hidden: L.haProva(stato, sit.id) },
        'Manca ancora un esempio: collega una cosa che hai raccontato o scrivilo qui sotto. Per ora nel bilancio la voce resta in sospeso.');
      const aggiornaAvviso = function () {
        avviso.hidden = L.haProva(stato, sit.id);
        const b = $('sf-voce-' + sit.id);
        if (b) { const n = notaSituazione(sit); b.querySelector('.ed__voce-nota').textContent = n.nota; b.classList.toggle('ed__voce--manca', n.stato === 'manca'); }
      };
      parti.push(
        avviso,
        stato.esperienze.length
          ? gruppoScelte({
            legenda: 'Dove l\'hai fatto? Collega una o più delle cose che hai raccontato', nome: p + 'esperienze', multipla: true,
            opzioni: stato.esperienze.map(function (e) { return { id: e.id, testo: titoloVoce(e) }; }),
            valore: r.esperienze,
            aggiorna: function (id, attiva) {
              r.esperienze = r.esperienze.filter(function (x) { return x !== id; });
              if (attiva) r.esperienze.push(id);
              modificato(); aggiornaAvviso();
            }
          })
          : h('p', { class: 'nota' }, 'Non hai ancora raccontato cose che hai fatto. ',
            h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA('esperienze', 'elenco'); } }, 'Vai a «Che cosa hai fatto»')),
        campo({ id: p + 'esempio', etichetta: 'Oppure scrivi un esempio: quando l\'hai fatto e che cosa hai fatto?', area: true, righe: 3, valore: r.esempio,
          aggiorna: function (v) { r.esempio = v; aggiornaAvviso(); } }),
        campo({ id: p + 'come', etichetta: 'Come l\'hai imparato? Chi o che cosa ti ha aiutato?', area: true, righe: 3, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    } else if (l && l.id === 'non_ancora') {
      parti.push(campo({ id: p + 'come', etichetta: 'Che cosa ti servirebbe per impararlo?', area: true, righe: 3, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    } else if (l && l.id === 'mai') {
      parti.push(campo({ id: p + 'come', etichetta: 'Ti piacerebbe affrontarlo? In quale occasione?', area: true, righe: 3, valore: r.come, aggiorna: function (v) { r.come = v; } }));
    }
    parti.push(esempio('Vedi un esempio', esempiPerIndirizzo(sit.esempi)));
    parti.push(h('div', { class: 'ed__azioni-fine' },
      h('button', { type: 'button', class: 'pulsante', onclick: function () { situazioneAperta = null; ridisegna('sf-voce-' + sit.id); } }, 'Fatto')));
    return h('div', { class: 'ed__forma', role: 'group', 'aria-labelledby': 'blocco-' + sit.id }, parti);
  }

  function schermataEsempi() {
    const dichiarate = D.SITUAZIONI.filter(function (s) { const l = livelloDi(s); return l && l.dichiara; });
    const senzaProva = dichiarate.filter(function (s) { return !L.haProva(stato, s.id); });
    const intro = [
      h('p', { text: 'Per ogni cosa che dici di saper fare serve un esempio: collega una delle cose che hai raccontato oppure scrivilo con parole tue.' }),
      aiuto(dichiarate.length
        ? (senzaProva.length ? 'Ti manca l\'esempio per ' + senzaProva.length + (senzaProva.length === 1 ? ' situazione' : ' situazioni') + '. Per le altre puoi aggiungere, se vuoi, come hai imparato o che cosa ti servirebbe.'
          : 'Hai un esempio per tutte le situazioni che dichiari di saper fare. Per le altre puoi aggiungere, se vuoi, una riga.')
        : 'Non hai dichiarato di saper fare nessuna situazione: non serve nessun esempio. Puoi aggiungere una riga alle altre, se vuoi.')
    ];
    if (!situazioneAperta && largo()) situazioneAperta = (senzaProva[0] || dichiarate[0] || D.SITUAZIONI[0]).id;
    const aperta = D.SITUAZIONI.find(function (s) { return s.id === situazioneAperta; }) || null;
    if (!aperta) situazioneAperta = null;
    const risposta = elencoDettaglio({
      aria: 'Le sei situazioni', prefisso: 'sf-voce-', aperta: situazioneAperta,
      voci: D.SITUAZIONI.map(function (s) { const n = notaSituazione(s); return { id: s.id, titolo: s.verbo, nota: n.nota, stato: n.stato }; }),
      apri: function (id) { situazioneAperta = id; ridisegna('blocco-' + id); },
      chiudi: function () { const id = situazioneAperta; situazioneAperta = null; ridisegna('sf-voce-' + id); },
      dettaglio: aperta ? dettaglioSituazione(aperta) : null,
      vuoto: 'Scegli una situazione dall\'elenco.'
    });
    return [testa(metaSchermata(), 'Un esempio per ogni «so fare»'), corpoLargo(intro, risposta)];
  }

  // ---------- 04 Uno sguardo critico ----------
  // Le tre domande stanno insieme: gli id delle risposte (scuola, tirocinio, ancora) restano quelli di sempre.
  function schermataSguardo() {
    const intro = [
      h('p', { text: 'Tre domande per guardare il tuo percorso con occhio critico. Puoi essere critico: questo bilancio non è una valutazione della scuola su di te.' }),
      aiuto('Bastano poche righe. Un episodio preciso vale più di un elenco di aggettivi.')
    ];
    const risposta = h('div', { class: 'blocchi blocchi--tre' }, D.SGUARDO.map(function (g) {
      return h('section', { class: 'blocco', 'aria-labelledby': 'blocco-sg-' + g.id },
        h('h3', { id: 'blocco-sg-' + g.id, tabindex: '-1', text: g.domanda }),
        h('p', { class: 'blocco__nota', text: g.aiuto }),
        campo({ id: 'f-sg-' + g.id, etichettaDa: 'blocco-sg-' + g.id, area: true, righe: 6, valore: stato.sguardo[g.id], aggiorna: function (v) { stato.sguardo[g.id] = v; } }),
        esempio('Vedi un esempio', h('p', { text: g.esempio })));
    }));
    return [testa(metaSchermata(), 'Uno sguardo critico'), corpoLargo(intro, risposta)];
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
    const annoScelto = D.ANNI.find(function (x) { return x.id === stato.profilo.anno; });
    const intestazione = [ind ? 'Indirizzo ' + ind.nome : '', annoScelto ? annoScelto.testo : '', stato.profilo.classe, data ? 'Aggiornato il ' + data : ''].filter(Boolean).join(' · ');

    const soFare = b.soFare.map(function (x) {
      return h('li', { class: 'voce' },
        h('p', null, h('strong', { text: x.situazione }), ' — ' + x.livello),
        x.esempio ? h('blockquote', { text: x.esempio }) : null,
        x.esperienze.length ? h('p', { class: 'meta', text: 'Esperienze: ' + x.esperienze.join(' · ') }) : null,
        interattivo ? h('p', { class: 'voce__fonte' }, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vaiA(x.rif.sezione, x.rif.schermata); } }, 'Torna alla risposta')) : null);
    });
    const daDoc = b.daDocumentare.length ? [
      h('h4', { text: 'Manca ancora un esempio' }),
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
        'Ancora nulla: racconta le difficoltà e gli aiuti nelle esperienze e come hai imparato nella sezione «Che cosa so fare».'),
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

  // ---------- 07 Orientamento ----------
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
          if (!bozza) { avvisa('Rispondi prima ad almeno una domanda della schermata precedente.'); return; }
          const applica = function () { stato.orientamento.testo = bozza; modificato(); ridisegna('f-or-testo'); };
          if (pieno(stato.orientamento.testo)) chiedi('Sostituire il testo attuale con la bozza delle tue risposte?', 'Sostituisci', applica);
          else applica();
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
      case 'sofare': return sch.id === 'livelli' ? schermataLivelli() : schermataEsempi();
      case 'sguardo': return schermataSguardo();
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
    principale.querySelectorAll('textarea').forEach(adattaAltezza);
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

  // Quello che parte per il foglio: lo stato del bilancio (il curriculum è un altro sito e non è mai incluso).
  function senzaCV(st) {
    return L.statoPerIlFoglio(st);
  }

  let invioInCorso = false;

  function inviaAlDocente() {
    if (!URL_INVIO || invioInCorso) return;
    if (!pieno(stato.profilo.nome) || !stato.profilo.indirizzo) {
      chiedi('Per inviare le risposte al docente servono il tuo nome e l\'indirizzo. Li trovi nella prima schermata.', 'Vai alla prima schermata', function () {
        if ($('dialogo-risposte').open) $('dialogo-risposte').close();
        vaiA('percorso', 'chi');
      }, 'Più tardi');
      return;
    }
    chiedi('Inviare le risposte al foglio del docente? Potrai correggerle e inviarle di nuovo: la tua riga verrà aggiornata.', 'Invia', eseguiInvio);
  }

  // Il contenuto e il modo dell'invio sono quelli di sempre: lo script del docente non cambia.
  function eseguiInvio() {
    if (invioInCorso) return;
    clearTimeout(timerSalva);
    scriviArchivio();
    invioInCorso = true;
    $('salvato').textContent = 'Invio in corso…';
    // text/plain evita la richiesta preliminare CORS, che Apps Script non gestisce.
    fetch(URL_INVIO, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(senzaCV(stato)),
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
        avvisa('Risposte inviate al docente.');
      })
      .catch(function (err) {
        $('salvato').textContent = 'Invio non riuscito';
        avvisa(err && err.message === 'nome'
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
    scaricaFile(new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' }), nomeFile());
    $('salvato').textContent = 'Copia scaricata';
  }

  function scaricaFile(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) {
        avvisa('Il file non è una copia valida del bilancio.');
        return;
      }
      if (dati && dati.tipo === 'cv') {
        avvisa('Questa è la copia di un curriculum, non di un bilancio. La carichi nel sito del curriculum.');
        return;
      }
      if (!dati || dati.versione !== L.VERSIONE || !dati.profilo) {
        avvisa('Il file non è una copia valida del bilancio.');
        return;
      }
      const applica = function () {
        portaIlCurriculum(dati);
        stato = L.normalizza(dati);
        scriviArchivio();
        $('dialogo-risposte').close();
        vai(null);
      };
      if (stato.aggiornato) chiedi('Sostituire le risposte attuali con quelle del file?', 'Sostituisci', applica);
      else applica();
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
    chiedi('Cancellare tutte le risposte da questo browser? Se non hai scaricato una copia, andranno perse.', 'Cancella tutto', function () {
      clearTimeout(timerSalva);
      timerSalva = null;
      try { localStorage.removeItem(CHIAVE); localStorage.removeItem(CHIAVE_POSIZIONE); } catch (e) { /* niente da fare */ }
      stato = L.statoVuoto();
      ripresa = null;
      $('salvato').textContent = 'Risposte cancellate';
      $('dialogo-risposte').close();
      vai(null);
    });
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
    $('testo-dialogo').textContent = 'Sono salvate su questo dispositivo, in questo browser e arrivano al docente solo quando premi «Invia al docente». Puoi inviarle più volte: conta l\'ultimo invio.';
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
