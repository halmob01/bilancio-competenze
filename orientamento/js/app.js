/* Orientamento — interfaccia della parte «Cosa faccio dopo».
   Costruisce il DOM con nodi e textContent: i testi dello studente non sono mai interpretati come HTML. */
(function () {
  'use strict';

  const O = window.BC_ORIENTAMENTO;
  const B = window.BC_LOGICA;
  let parte = null;  // null = home; altrimenti 'entrata' o 'uscita'
  function sezioni() { const x = O.PARTI.find(function (y) { return y.id === parte; }); return x ? x.passi : []; }

  let stato = O.statoVuoto();
  let vista = null; // null = home; altrimenti { s }
  let archivioDisponibile = true;
  let timerSalva = null;
  let entrata = false;

  const $ = function (id) { return document.getElementById(id); };
  const principale = $('principale');
  const pieno = O.pieno;
  const ARCH = window.BC_ARCHIVIO;
  const M = ARCH.memoria;

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
      else if (k === 'selected') el.selected = !!v;
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
  function chiedi(t, ok, conferma) { messaggio(t, { ok: ok, conferma: conferma }); }

  function adattaAltezza(el) {
    el.style.height = 'auto';
    if (el.scrollHeight > el.clientHeight) el.style.height = (el.scrollHeight + 2) + 'px';
  }

  // ---------- Archivio locale ----------
  function caricaArchivio() {
    try {
      const grezzo = M.getItem(O.CHIAVE);
      if (grezzo) stato = O.normalizza(JSON.parse(grezzo));
    } catch (e) { archivioDisponibile = false; }
  }
  // Dalla home si entra in una delle due parti.
  function apri(id, s) { parte = id; vai(s || 0); }
  function scriviArchivio() {
    stato.aggiornato = new Date().toISOString();
    try {
      M.setItem(O.CHIAVE, JSON.stringify(stato));
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

  // ---------- Quello che c'è negli altri percorsi (solo lettura) ----------
  function leggiAltro(chiave) {
    try { return JSON.parse(M.getItem(chiave) || 'null'); } catch (e) { return null; }
  }
  function attivitaSalvate() {
    const p = leggiAltro('portfolio-attivita-v1');
    return p && Array.isArray(p.attivita) ? p.attivita.filter(function (a) { return a && typeof a.id === 'string'; }) : [];
  }
  function titoloAttivita(a) {
    const t = String(a.fatto || '').trim().split(/\n/)[0];
    return !t ? 'Attività senza descrizione' : (t.length > 80 ? t.slice(0, 78).replace(/\s+\S*$/, '') + '…' : t);
  }
  function promemoria() { return O.promemoria(leggiAltro('bilancio-competenze-v1'), B); }
  // L'indirizzo e l'anno si propongono da quello che lo studente ha già detto altrove: si possono sempre cambiare.
  function profiloProposto() {
    const s = ARCH.sessione();
    const p = s && s.profilo ? s.profilo : {};
    const b = leggiAltro('bilancio-competenze-v1');
    const a = leggiAltro('portfolio-attivita-v1');
    const da = function (o) { return o && o.profilo ? o.profilo : {}; };
    const ind = [p.indirizzo, da(b).indirizzo, da(a).indirizzo].find(function (x) { return O.INDIRIZZI.some(function (i) { return i.id === x; }); }) || '';
    const anno = [p.anno ? 'anno' + p.anno : '', da(b).anno, da(a).anno].find(function (x) { return O.ANNI.some(function (i) { return i.id === x; }); }) || '';
    return { indirizzo: ind, anno: anno };
  }
  function nome(lista, id) { const x = lista.find(function (y) { return y.id === id; }); return x ? x.testo : ''; }

  // ---------- Navigazione ----------
  function vai(s) {
    if (s === null) parte = null;
    vista = (s === null) ? null : { s: s };
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

  const ETICHETTA_STATO = { vuota: 'Da iniziare', in_corso: 'In corso', completa: 'Completa' };
  function statoSezione(i) {
    if (sezioni()[i].id === 'strada') return stato.profilo.indirizzo && stato.profilo.anno ? 'Completa' : 'Da guardare';
    return ETICHETTA_STATO[O.statoPasso(stato, sezioni()[i].id)];
  }
  function vociIndice(classe) {
    return sezioni().map(function (s, i) {
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
    $('avanzamento').hidden = false;
    $('barra').style.width = vista ? ((vista.s + 1) / sezioni().length * 100) + '%' : '0%';
    const avanzamento = $('avanzamento');
    avanzamento.querySelectorAll('.avanzamento__nodo').forEach(function (n) { n.remove(); });
    sezioni().forEach(function (_, i) {
      const nodo = document.createElement('span');
      nodo.className = 'avanzamento__nodo' + (vista && i === vista.s ? ' avanzamento__nodo--attivo' : vista && i < vista.s ? ' avanzamento__nodo--completato' : '');
      nodo.style.left = (i / (sezioni().length - 1) * 100) + '%';
      nodo.setAttribute('aria-hidden', 'true');
      avanzamento.appendChild(nodo);
    });
    if (vista) $('tappa-nome').textContent = sezioni()[vista.s].titolo;
  }

  // ---------- Elementi ricorrenti ----------
  function campo(o) {
    const sugg = o.suggerimento ? h('p', { class: 'campo__suggerimento', id: o.id + '-sugg', text: o.suggerimento }) : null;
    const controllo = o.area
      ? h('textarea', { id: o.id, maxlength: o.max || 2000, 'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); adattaAltezza(e.target); modificato(); } })
      : h('input', { type: o.tipo || 'text', id: o.id, maxlength: o.max || 200, autocomplete: 'off',
        'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); modificato(); } });
    return h('div', { class: 'campo' }, h('label', { for: o.id, text: o.etichetta }), sugg, controllo);
  }
  function selezione(o) {
    return h('div', { class: 'campo' }, h('label', { for: o.id, text: o.etichetta }),
      h('select', { id: o.id, onchange: function (e) { o.aggiorna(e.target.value); } },
        h('option', { value: '', text: 'Scegli', selected: !o.valore }),
        o.opzioni.map(function (x) { return h('option', { value: x.id, text: x.testo, selected: x.id === o.valore }); })));
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
      s < sezioni().length - 1
        ? h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: function () { vai(s + 1); } }, 'Avanti')
        : h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: scaricaCopia }, 'Scarica una copia'));
  }
  function meta(s) { return String(s + 1).padStart(2, '0') + ' / ' + String(sezioni().length).padStart(2, '0'); }

  // ---------- Home ----------
  const NOMI_STATO = { vuota: 'Da iniziare', in_corso: 'In corso', completa: 'Completa' };
  function statoParte(p) {
    const stati = p.passi.map(function (x) { return O.statoPasso(stato, x.id); });
    if (stati.every(function (x) { return x === 'completa'; })) return 'Completa';
    return stati.some(function (x) { return x !== 'vuota'; }) ? 'In corso' : 'Da iniziare';
  }
  function disegnaHome() {
    return h('div', { class: 'home' },
      h('div', { class: 'home__fascia' }, h('div', { class: 'home__fascia-dentro' },
        h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' }),
        h('h1', { text: 'Orientamento' }),
        h('p', { class: 'home__sottotitolo', text: 'Due modi di guardare il CFP.' }),
        h('p', { class: 'home__testo misura', text: 'Uno è per chi deve ancora scegliere. L\'altro è per te.' }))),
      h('section', { class: 'home__indice', 'aria-labelledby': 'home-parti' },
        h('h2', { id: 'home-parti', class: 'meta', text: 'Scegli da dove partire' }),
        h('ul', { class: 'percorsi' }, O.PARTI.map(function (p, i) {
          return h('li', null, h('a', { class: 'percorso', href: '#' + p.id, onclick: function (e) { e.preventDefault(); apri(p.id, 0); } },
            h('span', { class: 'meta percorso__num', text: String(i + 1).padStart(2, '0') }),
            h('span', { class: 'percorso__titolo', text: p.titolo }),
            h('span', { class: 'percorso__testo', text: p.per }),
            h('span', { class: 'meta percorso__stato', text: statoParte(p) }),
            h('span', { class: 'percorso__apri', text: statoParte(p) === 'Da iniziare' ? 'Inizia' : 'Riprendi' })));
        }))));
  }

  // ---------- Racconto il CFP ----------
  const E = function () { return stato.entrata; };

  function schermataRacconto() {
    const intro = [h('p', { text: 'All\'open day parlerai a ragazzi di terza media. Rispondi con parole tue.' })];
    const risposta = O.RACCONTO.map(function (r) {
      return campo({ id: 'f-ra-' + r.id, etichetta: r.etichetta, suggerimento: 'Per esempio: ' + r.esempio, area: true, valore: E()[r.id], aggiorna: function (v) { E()[r.id] = v; } });
    });
    return [testa(meta(0), 'Che cosa racconteresti a chi deve scegliere?'), corpo(intro, risposta)];
  }

  function schermataMedie() {
    const intro = [h('p', { text: 'I ragazzi di terza media ti faranno delle domande. Rispondi a quelle che vuoi.' })];
    const risposta = O.MEDIE.map(function (m) {
      const id = 'f-me-' + m.id;
      const aiuto = m.id === 'dopo' && O.fraseStrade(stato)
        ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () {
          const v = (E().medie.dopo || '').trim();
          E().medie.dopo = (v ? v + '\n' : '') + O.fraseStrade(stato);
          modificato(); ridisegna(id);
        } }, 'Usa le strade che hai scelto in «Cosa faccio dopo»') : null;
      return h('div', { class: 'campo-con-aiuto' }, campo({ id: id, etichetta: m.domanda, suggerimento: 'Per esempio: ' + m.esempio, area: true, valore: E().medie[m.id], aggiorna: function (v) { E().medie[m.id] = v; } }), aiuto);
    });
    return [testa(meta(1), 'Le domande dei ragazzi'), corpo(intro, risposta)];
  }

  function schermataTesto() {
    const intro = [h('p', { text: '«Componi una bozza» mette in fila le tue risposte. Poi correggi tu.' })];
    const risposta = [
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () {
          const bozza = O.componiTesto(stato);
          if (!bozza) { avvisa('Prima rispondi ad almeno una domanda.'); return; }
          const applica = function () { E().testo = bozza; modificato(); ridisegna('f-te-testo'); };
          if (pieno(E().testo)) chiedi('Sostituire il testo attuale con la bozza delle tue risposte?', 'Sostituisci', applica); else applica();
        } }, 'Componi una bozza dalle risposte'),
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { stampa(); } }, 'Stampa o salva in PDF'),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: scaricaCopia }, 'Scarica una copia')),
      campo({ id: 'f-te-testo', etichetta: 'Il tuo testo', area: true, max: O.MAX_TESTO, valore: E().testo, aggiorna: function (v) { E().testo = v; } })
    ];
    return [testa(meta(2), 'Il tuo testo per l\'open day'), corpo(intro, risposta)];
  }

  function foglioEntrata() {
    const p = stato.profilo;
    const sess = ARCH.sessione();
    const intestazione = [nome(O.INDIRIZZI, p.indirizzo), nome(O.ANNI, p.anno)].filter(Boolean).join(' · ');
    const domande = O.MEDIE.filter(function (m) { return pieno(E().medie[m.id]); });
    return h('article', { class: 'dossier', 'aria-label': 'Il tuo foglio per l\'open day' },
      h('header', { class: 'dossier__testa' },
        h('p', { class: 'meta', text: 'Orientamento · Racconto il CFP' }),
        h('p', { class: 'dossier__titolo', text: sess && sess.profilo ? sess.profilo.nome + (sess.profilo.cognome ? ' ' + sess.profilo.cognome : '') : 'Il mio racconto del CFP' }),
        intestazione ? h('p', { class: 'meta', text: intestazione }) : null),
      h('section', { class: 'dossier__parte' }, h('h3', { text: 'Il mio testo' }),
        pieno(E().testo) ? h('p', { class: 'libro orientamento-anteprima', text: E().testo.trim() }) : h('p', { class: 'vuoto', text: 'Ancora nulla.' })),
      domande.length ? h('section', { class: 'dossier__parte' }, h('h3', { text: 'Se mi chiedono' }),
        h('ul', { class: 'voci' }, domande.map(function (m) { return voce(m.domanda, E().medie[m.id]); }))) : null);
  }

  // ---------- 01 La strada ----------
  function schermataStrada() {
    const p = stato.profilo;
    if (!p.indirizzo && !p.anno) { const x = profiloProposto(); p.indirizzo = x.indirizzo; p.anno = x.anno; if (p.indirizzo || p.anno) modificato(); }
    const intro = [h('p', { text: 'Ecco la strada del CFP e i punti in cui puoi cambiare.' })];
    const risposta = [
      h('div', { class: 'coppia' },
        selezione({ id: 'f-indirizzo', etichetta: 'Che indirizzo fai?', opzioni: O.INDIRIZZI, valore: p.indirizzo, aggiorna: function (v) { p.indirizzo = v; modificato(); ridisegna('f-indirizzo'); } }),
        selezione({ id: 'f-anno', etichetta: 'In che anno sei?', opzioni: O.ANNI, valore: p.anno, aggiorna: function (v) { p.anno = v; modificato(); ridisegna('f-anno'); } })),
      p.indirizzo && p.anno
        ? [h('p', { class: 'meta', text: O.eQuadriennale(p) ? 'Il tuo percorso dura 4 anni.' : 'Il tuo percorso: 3 anni + il quarto anno.' }), mappa(p), noteMappa(p)]
        : h('p', { class: 'vuoto', text: 'Scegli indirizzo e anno: vedi la tua strada.' })
    ];
    return [testa(meta(0), 'La strada'), corpo(intro, risposta)];
  }
  function mappa(p) {
    return h('ol', { class: 'strada', 'aria-label': 'La strada del CFP' }, O.mappa(p).map(function (t) {
      return h('li', { class: 'strada__tappa' + (t.qui ? ' strada__tappa--qui' : '') + (t.facoltativa ? ' strada__tappa--facoltativa' : '') },
        h('span', { class: 'strada__segno', 'aria-hidden': 'true' }),
        h('div', { class: 'strada__corpo' },
          h('h3', { class: 'strada__titolo' }, t.titolo, t.qui ? h('span', { class: 'strada__qui', text: 'Sei qui' }) : null),
          h('p', { text: t.testo }),
          t.cambi.length ? h('div', { class: 'strada__cambi' },
            h('p', { class: 'meta', text: 'Qui puoi anche:' }),
            h('ul', null, t.cambi.map(function (id) { const st = O.strada(id); return h('li', null, h('strong', { text: st.titolo + ': ' }), st.testo); }))) : null));
    }));
  }
  function noteMappa(p) {
    return h('ul', { class: 'note-strada' }, O.note(p).map(function (n) { return h('li', { class: 'nota', text: n.testo }); }));
  }

  // ---------- 02 Cosa mi piace ----------
  function schermataPiace() {
    const u = stato.uscita;
    const att = attivitaSalvate();
    const intro = [h('p', { text: 'Pensa a quello che hai fatto finora. Che cosa ti è piaciuto di più?' })];
    const scelte = att.length
      ? h('fieldset', { class: 'campo' },
        h('legend', { text: 'Quali attività ti sono piaciute di più? Scegline fino a ' + O.MAX_ATTIVITA + '.' }),
        h('div', { class: 'scelte' }, att.map(function (a) {
          const id = 'f-att-' + a.id;
          return h('label', { class: 'scelta', for: id },
            h('input', { type: 'checkbox', id: id, checked: u.attivita.indexOf(a.id) !== -1, onchange: function (e) {
              if (e.target.checked && u.attivita.length >= O.MAX_ATTIVITA) { e.target.checked = false; avvisa('Puoi sceglierne ' + O.MAX_ATTIVITA + '. Toglierne una per sceglierne un\'altra.'); return; }
              u.attivita = u.attivita.filter(function (x) { return x !== a.id; });
              if (e.target.checked) u.attivita.push(a.id);
              modificato();
            } }),
            h('span', { text: titoloAttivita(a) }));
        })))
      : h('div', { class: 'aiuto' }, h('p', { text: 'Non hai ancora scritto nessuna attività.' }), h('a', { class: 'pulsante pulsante--secondario pulsante--piccolo', href: '../portfolio/', text: 'Vai a «Le mie attività»' }));
    const risposta = [
      scelte,
      campo({ id: 'f-piace', etichetta: 'Che cosa ti piace fare?', area: true, suggerimento: 'Per esempio: «Mi piace quando capisco perché una cosa non funziona.»', valore: u.piace, aggiorna: function (v) { u.piace = v; } })
    ];
    return [testa(meta(1), 'Cosa mi piace'), corpo(intro, risposta)];
  }

  // ---------- 03 Cosa so fare ----------
  function schermataSoFare() {
    const u = stato.uscita;
    const pm = promemoria();
    const elenco = function (titolo, voci, vuoto) {
      return h('div', { class: 'promemoria' }, h('h3', { class: 'meta', text: titolo }),
        voci.length ? h('ul', { class: 'voci' }, voci.map(function (v) { return h('li', { class: 'voce', text: v }); })) : h('p', { class: 'vuoto', text: vuoto }));
    };
    const intro = [h('p', { text: 'Qui trovi quello che hai scritto nel bilancio. Non lo puoi cambiare da qui.' }),
      h('a', { class: 'pulsante pulsante--secondario pulsante--piccolo', href: '../bilancio/', text: 'Apri il bilancio' })];
    const risposta = [
      elenco('Quello che so fare', pm.soFare, 'Nel bilancio non c\'è ancora niente.'),
      elenco('Quello che devo ancora imparare', pm.devoImparare, 'Nel bilancio non c\'è ancora niente.'),
      campo({ id: 'f-imparare', etichetta: 'Che cosa vorresti imparare ancora?', area: true, valore: u.imparare, aggiorna: function (v) { u.imparare = v; } })
    ];
    return [testa(meta(2), 'Cosa so fare'), corpo(intro, risposta)];
  }

  // ---------- 04 Dove vorrei andare ----------
  function schermataDove() {
    const u = stato.uscita;
    const disponibili = O.stradeDisponibili(stato.profilo);
    const scelta = function (id) { return u.strade.find(function (x) { return x.id === id; }); };
    const intro = [h('p', { text: 'Scegli fino a ' + O.MAX_STRADE + ' strade che ti interessano. Puoi cambiare idea quando vuoi.' })];
    const risposta = [
      h('fieldset', { class: 'campo' },
        h('legend', { text: 'Quali strade ti interessano?' }),
        h('div', { class: 'scelte scelte--carte' }, disponibili.map(function (st) {
          const id = 'f-strada-' + st.id;
          return h('label', { class: 'scelta scelta--carta', for: id },
            h('input', { type: 'checkbox', id: id, checked: !!scelta(st.id), onchange: function (e) {
              if (e.target.checked) {
                if (st.id === 'nonso') u.strade = [];
                else u.strade = u.strade.filter(function (x) { return x.id !== 'nonso'; });
                if (u.strade.length >= O.MAX_STRADE) { e.target.checked = false; avvisa('Puoi sceglierne ' + O.MAX_STRADE + '. Togline una per sceglierne un\'altra.'); return; }
                u.strade.push({ id: st.id, perche: '' });
              } else u.strade = u.strade.filter(function (x) { return x.id !== st.id; });
              modificato(); ridisegna(id);
            } }),
            h('span', null, h('b', { class: 'scelta__blocco' }, h('strong', { text: st.titolo }), h('small', { text: st.testo }))));
        }))),
      u.strade.filter(function (x) { return x.id !== 'nonso'; }).map(function (x) {
        const st = O.strada(x.id);
        return campo({ id: 'f-perche-' + x.id, etichetta: 'Perché ti interessa «' + st.titolo + '»?', area: true, valore: x.perche, aggiorna: function (v) { x.perche = v; } });
      })
    ];
    return [testa(meta(3), 'Dove vorrei andare'), corpo(intro, risposta)];
  }

  // ---------- 05 I prossimi passi ----------
  function formatoData(iso) { const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function schermataPassi() {
    const u = stato.uscita;
    const intro = [h('p', { text: 'Scrivi fino a ' + O.MAX_PASSI + ' cose da fare nei prossimi mesi. Piccole e concrete.' }),
      h('p', { class: 'nota', text: 'Per esempio: «Chiedere al docente come funziona il quarto anno.»' })];
    const schede = u.passi.length
      ? h('ul', { class: 'schede', 'aria-label': 'I prossimi passi' }, u.passi.map(function (p, i) {
        const pre = 'f-passo-' + p.id + '-';
        return h('li', { class: 'scheda scheda--aperta', id: 'scheda-' + p.id },
          h('div', { class: 'scheda__testa' }, h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }), h('h3', { class: 'scheda__titolo', text: 'Passo ' + (i + 1) })),
          h('div', { class: 'scheda__modulo' },
            campo({ id: pre + 'cosa', etichetta: 'Che cosa faccio?', max: 200, valore: p.cosa, aggiorna: function (v) { p.cosa = v; } }),
            campo({ id: pre + 'con', etichetta: 'Con chi ne parlo?', max: 200, valore: p.con, aggiorna: function (v) { p.con = v; } }),
            campo({ id: pre + 'entro', etichetta: 'Entro quando?', tipo: 'date', valore: p.entro, aggiorna: function (v) { p.entro = v; } }),
            h('div', { class: 'scheda__azioni' }, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () {
              chiedi('Togliere il passo ' + (i + 1) + '?', 'Togli', function () { u.passi = u.passi.filter(function (x) { return x.id !== p.id; }); modificato(); ridisegna('aggiungi-passo'); });
            } }, 'Togli questo passo'))));
      }))
      : h('p', { class: 'vuoto', text: 'Non hai ancora scritto nessun passo.' });
    const risposta = [schede,
      h('div', null, h('button', { type: 'button', class: 'pulsante', id: 'aggiungi-passo', disabled: u.passi.length >= O.MAX_PASSI, onclick: function () {
        const p = O.passoVuoto(); u.passi.push(p); modificato(); ridisegna('f-passo-' + p.id + '-cosa');
      } }, 'Aggiungi un passo'))];
    return [testa(meta(4), 'I prossimi passi'), corpo(intro, risposta)];
  }

  // ---------- 06 Il mio foglio ----------
  function voce(etichetta, testoV) {
    return pieno(testoV) ? h('li', { class: 'voce' }, h('p', { class: 'meta', text: etichetta }), h('blockquote', { text: testoV.trim() })) : null;
  }
  function foglioUscita() {
    const u = stato.uscita; const p = stato.profilo;
    const att = attivitaSalvate().filter(function (a) { return u.attivita.indexOf(a.id) !== -1; });
    const pm = promemoria();
    const sess = ARCH.sessione();
    const intestazione = [nome(O.INDIRIZZI, p.indirizzo), nome(O.ANNI, p.anno), p.indirizzo && p.anno ? (O.eQuadriennale(p) ? 'percorso di 4 anni' : 'percorso 3 + 1') : ''].filter(Boolean).join(' · ');
    const parte = function (titolo, contenuto, vuoto) {
      const c = [].concat(contenuto).filter(Boolean);
      return h('section', { class: 'dossier__parte' }, h('h3', { text: titolo }), c.length ? c : h('p', { class: 'vuoto', text: vuoto }));
    };
    return h('article', { class: 'dossier', 'aria-label': 'Il tuo foglio di orientamento' },
      h('header', { class: 'dossier__testa' },
        h('p', { class: 'meta', text: 'Orientamento · Cosa faccio dopo' }),
        h('p', { class: 'dossier__titolo', text: sess && sess.profilo ? sess.profilo.nome + (sess.profilo.cognome ? ' ' + sess.profilo.cognome : '') : 'Il mio orientamento' }),
        intestazione ? h('p', { class: 'meta', text: intestazione }) : null),
      parte('Cosa mi piace', [
        att.length ? h('ul', { class: 'voci' }, att.map(function (a) { return h('li', { class: 'voce', text: titoloAttivita(a) }); })) : null,
        pieno(u.piace) ? h('ul', { class: 'voci' }, voce('Mi piace', u.piace)) : null], 'Ancora nulla.'),
      parte('Cosa so fare', [
        pm.soFare.length ? h('ul', { class: 'voci' }, pm.soFare.map(function (v) { return h('li', { class: 'voce', text: v }); })) : null,
        pieno(u.imparare) ? h('ul', { class: 'voci' }, voce('Vorrei imparare ancora', u.imparare)) : null], 'Ancora nulla.'),
      parte('Dove vorrei andare', u.strade.length ? h('ul', { class: 'voci' }, u.strade.map(function (x) {
        const st = O.strada(x.id);
        return h('li', { class: 'voce' }, h('p', { class: 'meta', text: st.titolo }), pieno(x.perche) ? h('blockquote', { text: x.perche.trim() }) : h('p', { text: st.testo }));
      })) : null, 'Ancora nulla.'),
      parte('I miei prossimi passi', u.passi.filter(function (x) { return pieno(x.cosa); }).length ? h('ul', { class: 'voci' }, u.passi.filter(function (x) { return pieno(x.cosa); }).map(function (x) {
        return h('li', { class: 'voce' }, h('p', { text: x.cosa.trim() }),
          h('p', { class: 'meta', text: [pieno(x.con) ? 'Con: ' + x.con.trim() : '', x.entro ? 'Entro il ' + formatoData(x.entro) : ''].filter(Boolean).join(' · ') }));
      })) : null, 'Ancora nulla.'));
  }
  function schermataFoglio() {
    const risposta = [
      h('p', { class: 'misura', text: 'Rileggilo e portalo a un docente.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () { stampa(); } }, 'Stampa o salva in PDF'),
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: scaricaCopia }, 'Scarica una copia')),
      foglioUscita()
    ];
    return [testa(meta(5), 'Il mio foglio'), corpo(null, risposta, true)];
  }

  // ---------- Disegno ----------
  function disegna() {
    principale.textContent = '';
    if (!vista) aggiungi(principale, disegnaHome());
    else {
      const id = sezioni()[vista.s].id;
      const contenuto = id === 'racconto' ? schermataRacconto() : id === 'medie' ? schermataMedie() : id === 'testo' ? schermataTesto()
        : id === 'strada' ? schermataStrada() : id === 'piace' ? schermataPiace() : id === 'sofare' ? schermataSoFare()
          : id === 'dove' ? schermataDove() : id === 'prossimi' ? schermataPassi() : schermataFoglio();
      aggiungi(principale, h('div', { class: 'lavoro' },
        h('nav', { class: 'rail', 'aria-label': 'Passi di «' + O.PARTI.find(function (x) { return x.id === parte; }).titolo + '»' }, h('ol', { id: 'rail-elenco' })),
        h('div', null, h('section', { class: 'schermata' + (entrata ? ' schermata--entra' : ''), 'aria-labelledby': 'titolo-schermata' }, contenuto), navigazione())));
    }
    aggiornaTestata(); aggiornaIndice();
    principale.querySelectorAll('textarea').forEach(adattaAltezza);
  }

  // ---------- Copia, stampa, cancellazione ----------
  function scaricaFile(blob, nomeFile) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nomeFile });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function scaricaCopia() {
    clearTimeout(timerSalva); scriviArchivio();
    scaricaFile(new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' }), 'orientamento-' + new Date().toISOString().slice(0, 10) + '.json');
    $('salvato').textContent = 'Copia scaricata';
  }
  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) { avvisa('Il file non è una copia valida.'); return; }
      if (!dati || dati.versione !== O.VERSIONE || !dati.uscita) { avvisa('Il file non è una copia valida.'); return; }
      const applica = function () { stato = O.normalizza(dati); scriviArchivio(); $('dialogo-salva').close(); vai(null); };
      if (stato.aggiornato) chiedi('Sostituire il lavoro attuale con quello del file?', 'Sostituisci', applica); else applica();
    };
    lettore.readAsText(file);
  }
  function preparaStampa() {
    const s = $('stampa'); s.textContent = '';
    if (parte !== 'uscita') s.appendChild(foglioEntrata());
    if (parte !== 'entrata') s.appendChild(foglioUscita());
  }
  function stampa() { preparaStampa(); window.print(); }
  function cancellaTutto() {
    chiedi('Cancellare tutto? Se non hai una copia, lo perdi.', 'Cancella tutto', function () {
      clearTimeout(timerSalva); timerSalva = null;
      try { M.removeItem(O.CHIAVE); } catch (e) { /* niente da fare */ }
      stato = O.statoVuoto(); $('salvato').textContent = 'Cancellato'; $('dialogo-salva').close(); vai(null);
    });
  }

  // ---------- Avvio ----------
  caricaArchivio();
  // Le risposte della vecchia sezione «Orientamento» del bilancio si portano qui una volta (la sezione nel bilancio non c'è più).
  (function () {
    const b = leggiAltro('bilancio-competenze-v1');
    if (O.importaDalBilancio(stato, b && b.orientamento)) { scriviArchivio(); } else if (!stato.entrata.importato) { stato.entrata.importato = true; }
  })();
  disegna();
  if (!archivioDisponibile) $('salvato').textContent = 'Salvataggio non disponibile: scarica una copia';
  else if (stato.aggiornato) $('salvato').textContent = 'Lavoro ritrovato';
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

  // Dal server può arrivare una versione più nuova (altro dispositivo, correzione di un docente): si ricarica.
  ARCH.quandoCambia(function (tipo) {
    if (tipo === 'orientamento') { stato = O.statoVuoto(); caricaArchivio(); }
    ridisegna();
  });
  ARCH.mostraUtente();
  ARCH.avvio();
})();
