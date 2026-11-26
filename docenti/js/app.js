/* Pannello dei docenti — interfaccia.
   Viste (indirizzo dopo #): / classi · /classe/ID · /classe/ID/cartellini · /studente/ID · /docenti (amministratore) · /password.
   Costruisce il DOM con nodi e textContent: i testi degli studenti non sono mai interpretati come HTML.
   Parla solo con l'API del portale (BC_CONFIG.urlApi); senza server dice che non è collegato. */
(function () {
  'use strict';

  const API = (window.BC_CONFIG && window.BC_CONFIG.urlApi) || '';
  const D = window.BC_DOCENTI;
  const C = window.BC_COMPETENZE;
  const PERCORSI = [
    { id: 'portfolio', titolo: 'Attività' }, { id: 'diario', titolo: 'Diario' },
    { id: 'bilancio', titolo: 'Bilancio' }, { id: 'curriculum', titolo: 'Curriculum' }
  ];
  const INDIRIZZI = { elettrico: 'Elettrico', informatica: 'Informatica', estetica: 'Estetica' };
  const ANNI = { 1: 'I anno', 2: 'II anno', 3: 'III anno', 4: 'IV anno' };
  const ANNI_ATT = { anno1: 'I anno', anno2: 'II anno', anno3: 'III anno', anno4: 'IV anno' };

  let io = null;           // il docente collegato: { id, nome, email, admin, cambiaPassword }
  let schedaClasse = 'avanzamento';
  let numero = 0;          // cambia a ogni disegno: una risposta che arriva tardi non disegna sopra un'altra pagina

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

  // ---------- Messaggi ----------
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
  function avvisa(t) { messaggio(t); }
  function chiedi(t, ok, conferma) { messaggio(t, { ok: ok, conferma: conferma }); }

  // Una finestra con un contenuto qualsiasi (moduli, schede, password).
  function finestra(titolo, contenuto, classe) {
    const d = h('dialog', { class: 'finestra' + (classe ? ' ' + classe : ''), 'aria-labelledby': 'finestra-titolo' },
      h('h2', { id: 'finestra-titolo', text: titolo }), contenuto);
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d);
    d.showModal();
    return d;
  }

  // ---------- API ----------
  function api(metodo, via, corpo) {
    const o = { method: metodo, credentials: 'same-origin', headers: { 'X-Portale': '1' } };
    if (corpo !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corpo); }
    return fetch(API + via, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { stato: r.status, json: j || {} }; });
    }).catch(function () { return { stato: 0, json: {} }; });
  }
  // Se la sessione è finita si torna alla pagina di accesso.
  function controlla(r) {
    if (r.stato === 401) { io = null; aggiornaMenu(); vistaAccesso('La sessione è finita. Entra di nuovo.'); return false; }
    if (r.stato === 0) { avvisa('Il server non risponde. Riprova tra poco.'); return false; }
    return true;
  }

  // ---------- Menu e percorso ----------
  function aggiornaMenu() {
    const m = $('menu');
    m.textContent = '';
    if (!io) return;
    if (!io.cambiaPassword) {
      aggiungi(m, [
        h('a', { href: '#/', class: 'menu__voce', text: 'Classi' }),
        io.admin ? h('a', { href: '#/docenti', class: 'menu__voce', text: 'Docenti' }) : null,
        h('a', { href: '#/password', class: 'menu__voce', text: 'Password' })
      ]);
    }
    aggiungi(m, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: esci }, 'Esci (' + io.nome.split(' ')[0] + ')'));
  }
  function esci() { api('POST', 'esci', {}).then(function () { io = null; aggiornaMenu(); location.hash = '#/'; vistaAccesso(); }); }

  function percorso() {
    const p = (location.hash || '#/').replace(/^#/, '').split('/').filter(Boolean);
    return p;
  }
  function vai(h2) { if (location.hash === h2) route(); else location.hash = h2; }

  function pagina(contenuto, classe) {
    principale.textContent = '';
    aggiungi(principale, h('div', { class: 'pannello' + (classe ? ' ' + classe : '') }, contenuto));
    window.scrollTo(0, 0);
    const t = principale.querySelector('h1');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }
  function caricamento() { principale.textContent = ''; aggiungi(principale, h('div', { class: 'pannello' }, h('p', { class: 'vuoto', role: 'status', text: 'Un momento…' }))); }
  function indietro(testo, href) { return h('a', { class: 'pannello__indietro', href: href, text: '← ' + testo }); }

  // ---------- Anello di stato ----------
  function stato(p) {
    const s = p && p.stato || 'vuota';
    return h('span', { class: 'stato stato--' + s },
      h('span', { class: 'stato__anello', 'aria-hidden': 'true' }),
      h('span', { class: 'stato__testo' }, h('span', { class: 'stato__nome', text: D.statoTesto({ stato: s }) }), p && p.dettaglio ? h('span', { class: 'meta', text: p.dettaglio }) : null));
  }

  // ---------- Accesso ----------
  function vistaAccesso(errore) {
    principale.textContent = '';
    const form = h('form', { class: 'accesso', novalidate: '' });
    const email = h('input', { class: 'accesso__codice accesso__campo', id: 'f-email', type: 'email', autocomplete: 'username', placeholder: 'nome@scuola.it', 'aria-label': 'Email' });
    const pw = h('input', { class: 'accesso__codice accesso__campo', id: 'f-pw', type: 'password', autocomplete: 'current-password', placeholder: 'Password', 'aria-label': 'Password' });
    const err = h('p', { class: 'accesso__errore', role: 'alert', hidden: !errore, text: errore || '' });
    const vai2 = h('button', { type: 'submit', class: 'pulsante' }, 'Entra');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!email.value.trim() || !pw.value) { err.hidden = false; err.textContent = 'Scrivi email e password.'; return; }
      vai2.disabled = true;
      api('POST', 'accesso/docente', { email: email.value.trim(), password: pw.value }).then(function (r) {
        vai2.disabled = false;
        if (r.stato === 200 && r.json.profilo) { io = r.json.profilo; aggiornaMenu(); route(); return; }
        err.hidden = false;
        err.textContent = r.stato === 429 ? 'Troppi tentativi. Riprova tra qualche minuto.' : r.stato === 0 ? 'Il server non risponde. Riprova tra poco.' : 'Email o password sbagliate.';
      });
    });
    aggiungi(form, [h('label', { class: 'accesso__etichetta', for: 'f-email', text: 'Entra nel pannello' }), email, pw, err, h('div', null, vai2)]);
    aggiungi(principale, h('div', { class: 'home' }, h('div', { class: 'home__fascia' }, h('div', { class: 'home__fascia-dentro' },
      h('h1', { text: 'Pannello docenti' }), h('p', { class: 'home__sottotitolo', text: 'Classi, cartellini e lavoro degli studenti.' }), form))));
    email.focus();
  }

  function vistaNonCollegato() {
    pagina([h('h1', { text: 'Pannello docenti' }), h('p', { class: 'vuoto', text: 'Questa pagina funziona solo sul server della scuola, dove il portale è collegato.' })]);
  }

  // ---------- Password ----------
  function vistaPassword() {
    const forzata = io.cambiaPassword;
    const campo = function (id, etichetta, tipo) {
      return h('div', { class: 'campo' }, h('label', { for: id, text: etichetta }), h('input', { id: id, type: tipo || 'password', autocomplete: id === 'p-vecchia' ? 'current-password' : 'new-password' }));
    };
    const err = h('p', { class: 'accesso__errore accesso__errore--chiaro', role: 'alert', hidden: true });
    const form = h('form', { class: 'modulo', novalidate: '' },
      forzata ? h('p', { text: 'Scegli una password tua. Dopo potrai usare il pannello.' }) : null,
      campo('p-vecchia', forzata ? 'Password provvisoria' : 'Password attuale'), campo('p-nuova', 'Nuova password (almeno 10 caratteri)'), campo('p-ripeti', 'Ripeti la nuova password'), err,
      h('div', { class: 'home__azioni' }, h('button', { type: 'submit', class: 'pulsante' }, 'Cambia password')));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const v = $('p-vecchia').value; const n = $('p-nuova').value;
      const e2 = function (t) { err.hidden = false; err.textContent = t; };
      if (n.length < 10) return e2('La nuova password deve avere almeno 10 caratteri.');
      if (n !== $('p-ripeti').value) return e2('Le due password non sono uguali.');
      api('POST', 'docente/password', { vecchia: v, nuova: n }).then(function (r) {
        if (!controlla(r)) return;
        if (r.stato === 200) { io.cambiaPassword = false; aggiornaMenu(); avvisa('Password cambiata.'); vai('#/'); return; }
        e2(r.stato === 401 ? 'La password attuale non è giusta.' : 'La nuova password non va bene: provane un\'altra.');
      });
    });
    pagina([h('h1', { text: forzata ? 'Scegli la tua password' : 'Cambia password' }), form]);
  }

  // ---------- Classi ----------
  function vistaClassi() {
    const n = ++numero;
    caricamento();
    api('GET', 'classi').then(function (r) {
      if (n !== numero || !controlla(r)) return;
      const classi = r.json.classi || [];
      pagina([
        h('div', { class: 'pannello__testa' }, h('h1', { text: 'Le classi' }),
          h('button', { type: 'button', class: 'pulsante', id: 'nuova-classe', onclick: function () { moduloClasse(null); } }, '+ Nuova classe')),
        classi.length ? h('ul', { class: 'classi' }, classi.map(function (c) {
          return h('li', null, h('a', { class: 'classe-carta', href: '#/classe/' + c.id },
            h('span', { class: 'classe-carta__nome', text: c.nome }),
            h('span', { class: 'meta', text: [INDIRIZZI[c.indirizzo] || '', ANNI[c.anno] || '', c.anno_scolastico].filter(Boolean).join(' · ') }),
            h('span', { class: 'classe-carta__n', text: c.studenti === 1 ? '1 studente' : c.studenti + ' studenti' })));
        })) : h('p', { class: 'vuoto', text: 'Non c\'è ancora nessuna classe. Creane una per aggiungere gli studenti.' })
      ]);
    });
  }

  // Nuova classe (c = null) o modifica.
  function moduloClasse(c) {
    const opz = function (valori, scelto) { return Object.keys(valori).map(function (k) { return h('option', { value: k, text: valori[k], selected: String(scelto) === k ? 'selected' : null }); }); };
    const nome = h('input', { id: 'c-nome', type: 'text', maxlength: '20', placeholder: 'Per esempio 3ELE', value: c ? c.nome : '' });
    const ind = h('select', { id: 'c-ind' }, opz(INDIRIZZI, c ? c.indirizzo : ''));
    const anno = h('select', { id: 'c-anno' }, opz(ANNI, c ? c.anno : 1));
    const sco = h('input', { id: 'c-sco', type: 'text', maxlength: '9', value: c ? c.anno_scolastico : D.annoScolastico() });
    const err = h('p', { class: 'accesso__errore accesso__errore--chiaro', role: 'alert', hidden: true });
    const form = h('form', { class: 'modulo', novalidate: '' },
      h('div', { class: 'campo' }, h('label', { for: 'c-nome', text: 'Nome della classe' }), nome),
      h('div', { class: 'campo' }, h('label', { for: 'c-ind', text: 'Indirizzo' }), ind),
      h('div', { class: 'campo' }, h('label', { for: 'c-anno', text: 'Anno di corso' }), anno),
      h('div', { class: 'campo' }, h('label', { for: 'c-sco', text: 'Anno scolastico' }), sco), err,
      h('div', { class: 'dialogo__azioni' }, h('button', { type: 'submit', class: 'pulsante' }, c ? 'Salva' : 'Crea la classe'),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { d.close(); } }, 'Annulla')));
    const d = finestra(c ? 'Modifica la classe' : 'Nuova classe', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!nome.value.trim()) { err.hidden = false; err.textContent = 'Scrivi il nome della classe.'; return; }
      const corpo = { nome: nome.value.trim(), indirizzo: ind.value, anno: Number(anno.value), annoScolastico: sco.value.trim() };
      (c ? api('PATCH', 'classi/' + c.id, corpo) : api('POST', 'classi', corpo)).then(function (r) {
        if (!controlla(r)) return;
        if (r.stato !== 200) { err.hidden = false; err.textContent = 'Non è stato salvato.'; return; }
        d.close();
        if (c) route(); else vai('#/classe/' + r.json.id);
      });
    });
    nome.focus();
  }

  // ---------- Una classe ----------
  function vistaClasse(id, scheda, nuovi) {
    const n = ++numero;
    caricamento();
    Promise.all([api('GET', 'classi/' + id + '/riepilogo'), api('GET', 'classi/' + id + '/studenti'), api('GET', 'classi')]).then(function (r) {
      if (n !== numero || !controlla(r[0]) || !controlla(r[1])) return;
      if (r[0].stato === 404) { pagina([indietro('Le classi', '#/'), h('p', { class: 'vuoto', text: 'Classe non trovata.' })]); return; }
      const classe = r[0].json.classe;
      const codici = {};
      (r[1].json.studenti || []).forEach(function (s) { codici[s.id] = s; });
      const studenti = (r[0].json.studenti || []).map(function (s) { return Object.assign({}, s, { codice: (codici[s.id] || {}).codice, qr: (codici[s.id] || {}).qr }); });
      const altre = (r[2].json.classi || []).filter(function (c) { return c.id !== classe.id; });
      const sottotitolo = [INDIRIZZI[classe.indirizzo] || '', ANNI[classe.anno] || '', classe.anno_scolastico].filter(Boolean).join(' · ');
      const attivi = studenti.filter(function (s) { return s.attivo; });
      pagina([
        indietro('Le classi', '#/'),
        h('div', { class: 'pannello__testa' },
          h('div', null, h('h1', { text: classe.nome }), h('p', { class: 'meta', text: sottotitolo + ' · ' + (attivi.length === 1 ? '1 studente' : attivi.length + ' studenti') })),
          h('div', { class: 'pannello__azioni' },
            h('a', { class: 'pulsante', href: '#/classe/' + classe.id + '/cartellini' }, 'Cartellini da stampare'),
            h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { scaricaCsv(r[0].json); } }, 'Esporta in CSV'),
            h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { moduloClasse(classe); } }, 'Modifica la classe'))),
        h('div', { class: 'anni-schede', role: 'tablist' }, [['avanzamento', 'Avanzamento'], ['studenti', 'Studenti e codici']].map(function (x) {
          return h('button', { type: 'button', role: 'tab', class: 'anno-scheda', id: 'scheda-' + x[0], 'aria-selected': scheda === x[0] ? 'true' : 'false',
            onclick: function () { schedaClasse = x[0]; vistaClasse(id, x[0]); } }, x[1]);
        })),
        scheda === 'avanzamento' ? tabellaAvanzamento(attivi) : elencoStudenti(classe, studenti, altre, nuovi)
      ]);
    });
  }

  function scaricaCsv(riepilogo) {
    const blob = new Blob([D.csvRiepilogo(riepilogo)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: D.nomeFileCsv(riepilogo.classe) });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function tabellaAvanzamento(studenti) {
    if (!studenti.length) return h('p', { class: 'vuoto', text: 'Non ci sono ancora studenti: aggiungili da «Studenti e codici».' });
    const conta = function (id, stato2) { return studenti.filter(function (s) { return s.percorsi[id].stato === stato2; }).length; };
    return h('div', { class: 'tabella-scroll' }, h('table', { class: 'tabella' },
      h('caption', { class: 'visivamente-nascosto', text: 'Avanzamento degli studenti' }),
      h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Studente' }), PERCORSI.map(function (p) { return h('th', { scope: 'col', text: p.titolo }); }), h('th', { scope: 'col', text: 'Ultimo accesso' }))),
      h('tbody', null, studenti.map(function (s) {
        return h('tr', null,
          h('th', { scope: 'row' }, h('a', { href: '#/studente/' + s.id, text: s.cognome + ' ' + s.nome }), s.foto || s.file ? h('span', { class: 'meta', text: [s.foto ? s.foto + ' foto' : '', s.file ? s.file + ' file' : ''].filter(Boolean).join(' · ') }) : null),
          PERCORSI.map(function (p) { return h('td', null, stato(s.percorsi[p.id])); }),
          h('td', null, h('span', { text: D.ultimoAccesso(s.ultimoAccesso) })));
      })),
      h('tfoot', null, h('tr', null, h('th', { scope: 'row', text: 'Completi / in corso' }),
        PERCORSI.map(function (p) { return h('td', null, h('span', { class: 'meta', text: conta(p.id, 'completa') + ' / ' + conta(p.id, 'in_corso') })); }), h('td')))));
  }

  // Studenti, codici, aggiunta da un elenco incollato.
  function elencoStudenti(classe, studenti, altre, nuovi) {
    const righe = studenti.map(function (s) {
      return h('tr', { class: s.attivo ? null : 'riga-spenta' },
        h('th', { scope: 'row' }, h('a', { href: '#/studente/' + s.id, text: s.cognome + ' ' + s.nome }), s.attivo ? null : h('span', { class: 'meta', text: 'Non attivo' })),
        h('td', null, h('span', { class: 'codice', text: s.codice || '' })),
        h('td', null, h('span', { text: D.ultimoAccesso(s.ultimoAccesso) }), s.dispositivi ? h('span', { class: 'meta', text: s.dispositivi === 1 ? '1 dispositivo' : s.dispositivi + ' dispositivi' }) : null),
        h('td', { class: 'tabella__azioni' },
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { nuovoCodice(s, classe); } }, 'Nuovo codice'),
          altre.length ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { spostaStudente(s, classe, altre); } }, 'Sposta') : null,
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { attivaStudente(s, classe, !s.attivo); } }, s.attivo ? 'Disattiva' : 'Riattiva')));
    });
    return [
      aggiungiStudenti(classe),
      nuovi && nuovi.length ? h('p', { class: 'avviso', role: 'status' }, nuovi.length === 1 ? 'Aggiunto 1 studente.' : 'Aggiunti ' + nuovi.length + ' studenti.', ' ', h('a', { href: '#/classe/' + classe.id + '/cartellini', text: 'Stampa i cartellini' })) : null,
      studenti.length ? h('div', { class: 'tabella-scroll' }, h('table', { class: 'tabella' },
        h('caption', { class: 'visivamente-nascosto', text: 'Studenti della classe' }),
        h('thead', null, h('tr', null, ['Studente', 'Codice del cartellino', 'Ultimo accesso', ''].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
        h('tbody', null, righe))) : h('p', { class: 'vuoto', text: 'Nessuno studente.' })
    ];
  }

  function aggiungiStudenti(classe) {
    const area = h('textarea', { id: 'elenco', rows: '5', placeholder: 'Rossi Mario\nBianchi Sara\n…', 'aria-describedby': 'elenco-sugg' });
    const ordine = h('select', { id: 'ordine' }, h('option', { value: 'cognome-nome', text: 'Prima il cognome' }), h('option', { value: 'nome-cognome', text: 'Prima il nome' }));
    const anteprima = h('div', { class: 'anteprima' });
    const controlla2 = function () {
      const r = D.parsaElenco(area.value, ordine.value);
      anteprima.textContent = '';
      if (!r.righe.length) { aggiungi(anteprima, h('p', { class: 'vuoto', text: area.value.trim() ? 'Non ho trovato nessun nome. Scrivi cognome e nome, uno studente per riga.' : '' })); return; }
      aggiungi(anteprima, [
        h('p', { class: 'meta', text: r.righe.length + (r.righe.length === 1 ? ' studente' : ' studenti') + (r.scartate ? ' · ' + r.scartate + ' righe saltate' : '') }),
        h('ul', { class: 'anteprima__elenco' }, r.righe.map(function (x) { return h('li', null, h('strong', { text: x.cognome }), ' ' + x.nome); })),
        h('button', { type: 'button', class: 'pulsante', id: 'conferma-elenco', onclick: function () { salva(r.righe); } }, r.righe.length === 1 ? 'Aggiungi 1 studente' : 'Aggiungi ' + r.righe.length + ' studenti')]);
    };
    const salva = function (righe) {
      const bottone = $('conferma-elenco'); if (bottone) bottone.disabled = true;
      const creati = [];
      D.inGruppi(righe).reduce(function (p, g) {
        return p.then(function (ok) {
          if (!ok) return false;
          return api('POST', 'classi/' + classe.id + '/studenti', { studenti: g }).then(function (r) { if (!controlla(r)) return false; if (r.stato !== 200) return false; r.json.creati.forEach(function (x) { creati.push(x); }); return true; });
        });
      }, Promise.resolve(true)).then(function (ok) {
        if (!ok) avvisa('Non tutti gli studenti sono stati aggiunti. Controlla l\'elenco.');
        schedaClasse = 'studenti';
        vistaClasse(classe.id, 'studenti', creati);
      });
    };
    area.addEventListener('input', controlla2); ordine.addEventListener('change', controlla2);
    return h('details', { class: 'dettagli', open: true },
      h('summary', { text: 'Aggiungi studenti da un elenco' }),
      h('div', { class: 'dettagli__corpo' },
        h('p', { class: 'campo__suggerimento', id: 'elenco-sugg', text: 'Incolla i nomi da un foglio di calcolo o scrivili: uno studente per riga.' }),
        h('div', { class: 'campo' }, h('label', { for: 'elenco', text: 'Elenco' }), area),
        h('div', { class: 'campo campo--stretto' }, h('label', { for: 'ordine', text: 'In ogni riga' }), ordine), anteprima));
  }

  function nuovoCodice(s, classe) {
    chiedi('Fare un nuovo codice per ' + s.cognome + ' ' + s.nome + '? Il vecchio cartellino smette di funzionare e i suoi dispositivi escono. Il lavoro resta.', 'Nuovo codice', function () {
      api('POST', 'studenti/' + s.id + '/rigenera', {}).then(function (r) { if (!controlla(r)) return; schedaClasse = 'studenti'; vistaClasse(classe.id, 'studenti'); });
    });
  }
  function attivaStudente(s, classe, attivo) {
    const fai = function () { api('PATCH', 'studenti/' + s.id, { attivo: attivo }).then(function (r) { if (!controlla(r)) return; schedaClasse = 'studenti'; vistaClasse(classe.id, 'studenti'); }); };
    if (attivo) fai(); else chiedi('Disattivare ' + s.cognome + ' ' + s.nome + '? Non potrà più entrare, il lavoro resta.', 'Disattiva', fai);
  }
  function spostaStudente(s, classe, altre) {
    const sel = h('select', { id: 'dest' }, altre.map(function (c) { return h('option', { value: c.id, text: c.nome + ' · ' + c.anno_scolastico }); }));
    const d = finestra('Sposta ' + s.cognome + ' ' + s.nome, h('form', { class: 'modulo' },
      h('div', { class: 'campo' }, h('label', { for: 'dest', text: 'In quale classe?' }), sel),
      h('div', { class: 'dialogo__azioni' }, h('button', { type: 'submit', class: 'pulsante' }, 'Sposta'), h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { d.close(); } }, 'Annulla'))));
    d.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      api('PATCH', 'studenti/' + s.id, { classeId: Number(sel.value) }).then(function (r) { if (!controlla(r)) return; d.close(); schedaClasse = 'studenti'; vistaClasse(classe.id, 'studenti'); });
    });
  }

  // ---------- Cartellini ----------
  function indirizzoDelSito() { return new URL('../', location.href).href; }
  function qrSvg(testo) {
    const q = window.qrcode(0, 'M');
    q.addData(testo); q.make();
    const doc = new DOMParser().parseFromString(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }), 'image/svg+xml');
    const svg = document.importNode(doc.documentElement, true);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR del cartellino');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    return svg;
  }
  function cartellino(s, classe) {
    const sito = indirizzoDelSito();
    return h('li', { class: 'cartellino' },
      h('div', { class: 'cartellino__testo' },
        h('p', { class: 'cartellino__sito', text: 'Percorsi per gli studenti' }),
        h('p', { class: 'cartellino__nome', text: s.nome + ' ' + s.cognome }),
        h('p', { class: 'cartellino__classe', text: [classe.nome, INDIRIZZI[classe.indirizzo] || ''].filter(Boolean).join(' · ') }),
        h('p', { class: 'cartellino__etichetta', text: 'Il tuo codice' }),
        h('p', { class: 'cartellino__codice', text: s.codice })),
      h('div', { class: 'cartellino__qr' }, qrSvg(sito + '#qr=' + s.qr)),
      h('p', { class: 'cartellino__piede', text: 'Inquadra il QR con la fotocamera, oppure scrivi il codice su ' + sito.replace(/^https?:\/\//, '').replace(/\/$/, '') }));
  }
  function vistaCartellini(id) {
    const n = ++numero;
    caricamento();
    api('GET', 'classi/' + id + '/studenti').then(function (r) {
      if (n !== numero || !controlla(r)) return;
      if (r.stato === 404) { pagina([indietro('Le classi', '#/'), h('p', { class: 'vuoto', text: 'Classe non trovata.' })]); return; }
      const classe = r.json.classe;
      const attivi = (r.json.studenti || []).filter(function (s) { return s.attivo; });
      const scelti = {}; attivi.forEach(function (s) { scelti[s.id] = true; });
      const griglia = h('ol', { class: 'cartellini', 'aria-label': 'Cartellini' });
      const ridisegna = function () {
        griglia.textContent = '';
        attivi.filter(function (s) { return scelti[s.id]; }).forEach(function (s) { griglia.appendChild(cartellino(s, classe)); });
        conta.textContent = Object.keys(scelti).filter(function (k) { return scelti[k]; }).length + ' cartellini · ' + (function (f) { return f === 1 ? '1 foglio' : f + ' fogli'; })(Math.ceil(Object.keys(scelti).filter(function (k) { return scelti[k]; }).length / 10));
      };
      const conta = h('span', { class: 'meta' });
      const scelta = h('details', { class: 'dettagli' }, h('summary', { text: 'Scegli gli studenti' }),
        h('div', { class: 'dettagli__corpo' }, h('div', { class: 'scelte scelte--riga' }, attivi.map(function (s) {
          return h('label', { class: 'scelta' }, h('input', { type: 'checkbox', checked: true, onchange: function (e) { scelti[s.id] = e.target.checked; ridisegna(); } }), h('span', { text: s.cognome + ' ' + s.nome }));
        }))));
      pagina([
        indietro(classe.nome, '#/classe/' + classe.id),
        h('div', { class: 'pannello__testa' }, h('div', null, h('h1', { text: 'Cartellini di ' + classe.nome }), h('p', { class: 'meta', text: 'Fogli A4 con 10 cartellini, da ritagliare.' })),
          h('div', { class: 'pannello__azioni' }, conta, h('button', { type: 'button', class: 'pulsante', id: 'stampa-cartellini', onclick: function () { window.print(); } }, 'Stampa'))),
        attivi.length ? h('p', { class: 'avviso', text: 'Ogni cartellino dà accesso al lavoro dello studente: consegnalo di persona e tienilo da parte.' }) : null,
        attivi.length ? scelta : h('p', { class: 'vuoto', text: 'Non ci sono studenti attivi.' }),
        griglia
      ], 'pannello--cartellini');
      ridisegna();
    });
  }
  // In stampa esce solo la griglia dei cartellini.
  window.addEventListener('beforeprint', function () {
    const s = $('stampa'); s.textContent = '';
    const g = principale.querySelector('.cartellini');
    if (g) s.appendChild(g.cloneNode(true));
  });

  // ---------- Uno studente ----------
  function vistaStudente(id) {
    const n = ++numero;
    caricamento();
    Promise.all([api('GET', 'studenti/' + id), api('GET', 'studenti/' + id + '/documenti/portfolio'), api('GET', 'studenti/' + id + '/allegati'), api('GET', 'studenti/' + id + '/foto')]).then(function (r) {
      if (n !== numero || !controlla(r[0])) return;
      if (r[0].stato === 404) { pagina([indietro('Le classi', '#/'), h('p', { class: 'vuoto', text: 'Studente non trovato.' })]); return; }
      const s = r[0].json.studente;
      const doc = (r[1].json && r[1].json.dati) || { attivita: [] };
      const allegati = {}; ((r[2].json && r[2].json.allegati) || []).forEach(function (a) { allegati[a.id] = a; });
      const quota = r[3].json || {};
      const attivita = (doc.attivita || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
      pagina([
        indietro(s.classe || 'Le classi', s.classeId ? '#/classe/' + s.classeId : '#/'),
        h('div', { class: 'pannello__testa' }, h('div', null, h('h1', { text: s.nome + ' ' + s.cognome }),
          h('p', { class: 'meta', text: [s.classe, INDIRIZZI[s.indirizzo] || '', s.attivo ? '' : 'Non attivo', 'Ultimo accesso: ' + D.ultimoAccesso(s.ultimoAccesso)].filter(Boolean).join(' · ') })),
          h('div', { class: 'pannello__azioni' },
            h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { mostraCestino(s); } }, 'Cancellato di recente'),
            io.admin ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { mostraRegistro(s); } }, 'Registro delle letture') : null)),
        h('section', null, h('h2', { class: 'meta occhiello', text: 'Percorsi' }),
          h('ul', { class: 'percorsi-studente' }, PERCORSI.map(function (p) {
            const x = r[0].json.percorsi[p.id];
            return h('li', null, h('span', { class: 'percorsi-studente__nome', text: p.titolo }), stato(x),
              h('span', { class: 'meta', text: x && x.aggiornato ? 'Modificato il ' + new Date(x.aggiornato).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + (x.autore && x.autore.tipo === 'docente' ? ' da ' + (x.autore.nome || 'un docente') : '') : '' }));
          })),
          h('p', { class: 'meta', text: 'Spazio usato: ' + D.formatoByte(s.byte) + ' su ' + D.formatoByte(quota.quota || 1073741824) + ' · ' + s.foto + ' foto · ' + s.file + ' file' })),
        h('section', null, h('h2', { class: 'meta occhiello', text: attivita.length === 1 ? 'Un\'attività' : attivita.length + ' attività' }),
          attivita.length ? ['anno1', 'anno2', 'anno3', 'anno4', ''].map(function (a) {
            const el = attivita.filter(function (x) { return (x.anno || '') === a; });
            if (!el.length) return null;
            return h('div', { class: 'anno-sezione' }, h('h3', { class: 'anno-sezione__titolo' }, ANNI_ATT[a] || 'Senza anno', h('span', { class: 'meta', text: el.length === 1 ? '1 attività' : el.length + ' attività' })),
              h('ul', { class: 'galleria' }, el.map(function (x) { return cartaAttivita(s, x, allegati); })));
          }) : h('p', { class: 'vuoto', text: 'Ancora nessuna attività.' }))
      ]);
    });
  }

  function titoloAttivita(a) {
    const t = String(a.fatto || '').trim().split(/\n/)[0];
    return !t ? 'Attività senza descrizione' : (t.length > 90 ? t.slice(0, 88).replace(/\s+\S*$/, '') + '…' : t);
  }
  function dataBreve(iso) { if (!iso) return ''; const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function cartaAttivita(s, a, allegati) {
    const foto = a.foto || []; const file = a.file || [];
    return h('li', null, h('button', { type: 'button', class: 'carta', onclick: function () { schedaAttivita(s, a, allegati); } },
      h('span', { class: 'carta__foto' }, foto.length ? h('img', { alt: '', loading: 'lazy', src: API + 'studenti/' + s.id + '/foto/' + foto[0] + '/mini' }) : h('span', { class: 'carta__senza carta__senza--' + (file.length ? 'file' : 'foto'), text: file.length ? (file.length === 1 ? '1 file' : file.length + ' file') : 'Senza foto' }),
        foto.length > 1 ? h('span', { class: 'carta__conta', text: '+' + (foto.length - 1) }) : null),
      h('span', { class: 'carta__testo' }, h('span', { class: 'meta', text: dataBreve(a.data) }), h('span', { class: 'carta__titolo', text: titoloAttivita(a) }))));
  }

  function schedaAttivita(s, a, allegati) {
    const corpo = h('div', { class: 'scheda-docente' });
    const sez = function (titolo, c) { return c ? h('section', null, h('h3', { class: 'meta occhiello', text: titolo }), c) : null; };
    const foto = a.foto || []; const file = (a.file || []);
    const comp = (a.competenze || []).map(function (x) { return C.trova(x); }).filter(Boolean);
    const d = finestra(dataBreve(a.data) || 'Attività', corpo, 'finestra--larga');
    aggiungi(corpo, [
      h('p', { class: 'meta', text: [ANNI_ATT[a.anno] || '', a.luogo === 'scuola' ? 'A scuola o in laboratorio' : a.luogo === 'tirocinio' ? 'In tirocinio' : a.luogo === 'fuori' ? 'Fuori da scuola' : '', a.dove || ''].filter(Boolean).join(' · ') }),
      a.fatto ? h('blockquote', { class: 'citazione', text: a.fatto }) : h('p', { class: 'vuoto', text: 'Non ha scritto che cosa ha fatto.' }),
      foto.length ? h('ul', { class: 'foto-grandi' + (foto.length === 1 ? ' foto-grandi--una' : '') }, foto.map(function (f) {
        return h('li', null, h('img', { alt: 'Foto dell\'attività', loading: 'lazy', src: API + 'studenti/' + s.id + '/foto/' + f }),
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { eliminaSubito('foto', f, 'questa foto', d, s); } }, 'Elimina subito'));
      })) : null,
      file.length ? sez('File', h('ul', { class: 'file-elenco' }, file.map(function (f) {
        const info = allegati[f.id];
        return h('li', { class: 'file' }, h('span', { class: 'file__icona', 'aria-hidden': 'true' }),
          h('span', { class: 'file__testo' }, h('span', { class: 'file__nome', text: f.nome }), h('span', { class: 'meta', text: info ? D.formatoByte(info.byte) : 'Non è sul server' })),
          h('span', { class: 'file__azioni' },
            info ? h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Scarica ' + f.nome, onclick: function () { scaricaFile(s, f); } }, 'Scarica') : null,
            info ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { eliminaSubito('allegati', f.id, '«' + f.nome + '»', d, s); } }, 'Elimina subito') : null));
      }))) : null,
      comp.length ? sez('Che cosa sa fare', h('ul', { class: 'competenze' }, comp.map(function (c) { return h('li', { text: c.semplice }); }))) : null,
      a.difficolta ? sez('Che cosa è stato difficile', h('p', { class: 'testo-libero', text: a.difficolta })) : null,
      a.aiuto ? sez('Chi o che cosa lo ha aiutato', h('p', { class: 'testo-libero', text: a.aiuto })) : null,
      h('div', { class: 'dialogo__azioni' }, h('button', { type: 'button', class: 'pulsante', onclick: function () { d.close(); } }, 'Chiudi'))
    ]);
  }

  function scaricaFile(s, f) {
    fetch(API + 'studenti/' + s.id + '/allegati/' + f.id, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) { avvisa('Il file non si può scaricare.'); return; }
      return r.blob().then(function (b) {
        const url = URL.createObjectURL(b);
        const a = h('a', { href: url, download: f.nome });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      });
    }).catch(function () { avvisa('Il file non si può scaricare.'); });
  }
  // «Elimina subito»: lo decidono i docenti, senza cestino e con una riga nel registro. L'attività resta con il segnaposto.
  function eliminaSubito(tipo, id, nome, finestra2, s) {
    chiedi('Eliminare subito ' + nome + '? Non si può recuperare e la scelta resta nel registro.', 'Elimina', function () {
      api('DELETE', 'studenti/' + s.id + '/' + tipo + '/' + id).then(function (r) {
        if (!controlla(r)) return;
        if (finestra2 && finestra2.open) finestra2.close();
        vistaStudente(s.id);
      });
    });
  }
  // Quello che lo studente ha cancellato negli ultimi 30 giorni: il docente lo rimette a posto (la scelta resta nel registro).
  const DOVE = { portfolio: 'Le mie attività', diario: 'Diario', bilancio: 'Bilancio', cv: 'Curriculum' };
  const COSA = { attivita: 'Attività', tirocini: 'Tirocinio', settimane: 'Settimana', esperienze: 'Esperienza', lingueElenco: 'Lingua', formazione: 'Formazione', lavoro: 'Lavoro' };
  function mostraCestino(s) {
    api('GET', 'studenti/' + s.id + '/cestino').then(function (r) {
      if (!controlla(r)) return;
      const voci = r.json.voci || [];
      const esito = h('p', { class: 'cestino__esito', role: 'status' });
      const elenco = h('ul', { class: 'cestino__elenco' }, voci.map(function (v) {
        const li = h('li', { class: 'cestino__voce' });
        const rimetti = h('button', { type: 'button', class: 'pulsante' }, 'Rimetti a posto');
        rimetti.addEventListener('click', function () {
          rimetti.disabled = true;
          api('POST', 'studenti/' + s.id + '/cestino/' + v.id + '/ripristina').then(function (x) {
            if (!controlla(x)) return;
            if (x.stato === 200) { li.remove(); esito.textContent = 'Fatto: rimesso in «' + (DOVE[v.tipo] || 'Le mie attività') + '».'; }
            else { rimetti.disabled = false; esito.textContent = x.stato === 409 ? 'Non si può rimettere: manca il tirocinio. Rimettilo prima.' : 'Non è andata. Riprova tra poco.'; }
          });
        });
        const giorni = Math.max(0, Math.ceil((Date.parse(v.scade) - Date.now()) / 86400000));
        li.appendChild(h('p', { class: 'cestino__titolo', text: (COSA[v.genere] || 'Voce') + (v.titolo ? ': ' + v.titolo : '') }));
        li.appendChild(h('p', { class: 'meta', text: (DOVE[v.tipo] || '') + ' · cancellato il ' + new Date(v.quando).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' · ' + (giorni === 1 ? 'resta 1 giorno' : 'restano ' + giorni + ' giorni') + (v.foto || v.file ? ' · ' + [v.foto ? v.foto + ' foto' : '', v.file ? v.file + ' file' : ''].filter(Boolean).join(', ') : '') }));
        li.appendChild(h('div', { class: 'cestino__azioni' }, rimetti));
        return li;
      }));
      const d = finestra('Cancellato di recente', h('div', null,
        h('p', { text: voci.length ? 'Cose cancellate da ' + s.nome + ' negli ultimi 30 giorni.' : 'Non c\'è niente da rimettere a posto.' }),
        elenco, esito,
        h('div', { class: 'dialogo__azioni' }, h('button', { type: 'button', class: 'pulsante', onclick: function () { d.close(); } }, 'Chiudi'))), 'finestra--larga');
      d.addEventListener('close', function () { vistaStudente(s.id); });
    });
  }
  function mostraRegistro(s) {
    api('GET', 'studenti/' + s.id + '/registro').then(function (r) {
      if (!controlla(r)) return;
      const reg = r.json.registro || [];
      const d = finestra('Registro di ' + s.nome + ' ' + s.cognome, h('div', null,
        reg.length ? h('ul', { class: 'registro' }, reg.map(function (x) { return h('li', null, h('span', { class: 'meta', text: new Date(x.quando).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }), ' ' + x.docente + ': ' + [x.azione, x.tipo].filter(Boolean).join(' · ')); })) : h('p', { class: 'vuoto', text: 'Nessuna lettura registrata.' }),
        h('div', { class: 'dialogo__azioni' }, h('button', { type: 'button', class: 'pulsante', onclick: function () { d.close(); } }, 'Chiudi'))), 'finestra--larga');
    });
  }

  // ---------- Docenti (amministratore) ----------
  function vistaDocenti() {
    if (!io.admin) { vai('#/'); return; }
    const n = ++numero;
    caricamento();
    api('GET', 'docenti').then(function (r) {
      if (n !== numero || !controlla(r)) return;
      const docenti = r.json.docenti || [];
      pagina([
        h('div', { class: 'pannello__testa' }, h('h1', { text: 'I docenti' }), h('button', { type: 'button', class: 'pulsante', onclick: moduloDocente }, '+ Nuovo docente')),
        h('div', { class: 'tabella-scroll' }, h('table', { class: 'tabella' },
          h('caption', { class: 'visivamente-nascosto', text: 'Docenti' }),
          h('thead', null, h('tr', null, ['Docente', 'Email', 'Ruolo', ''].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
          h('tbody', null, docenti.map(function (d) {
            return h('tr', { class: d.attivo ? null : 'riga-spenta' },
              h('th', { scope: 'row', text: d.nome }, d.attivo ? null : h('span', { class: 'meta', text: 'Non attivo' })),
              h('td', { text: d.email }), h('td', { text: d.admin ? 'Amministratore' : 'Docente' }),
              h('td', { class: 'tabella__azioni' },
                h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { reimpostaPassword(d); } }, 'Nuova password'),
                d.id === io.id ? null : h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { attivaDocente(d, !d.attivo); } }, d.attivo ? 'Disattiva' : 'Riattiva')));
          }))))
      ]);
    });
  }
  function mostraPassword(titolo, email, pw) {
    const d = finestra(titolo, h('div', null,
      h('p', { text: 'Password provvisoria per ' + email + ':' }), h('p', { class: 'codice codice--grande', text: pw }),
      h('p', { class: 'meta', text: 'Comunicala di persona. Si vede solo adesso e va cambiata al primo accesso.' }),
      h('div', { class: 'dialogo__azioni' }, h('button', { type: 'button', class: 'pulsante', onclick: function () { d.close(); } }, 'Ho finito'))));
  }
  function moduloDocente() {
    const nome = h('input', { id: 'd-nome', type: 'text', maxlength: '80', autocomplete: 'off' });
    const email = h('input', { id: 'd-email', type: 'email', autocomplete: 'off' });
    const admin = h('input', { id: 'd-admin', type: 'checkbox' });
    const err = h('p', { class: 'accesso__errore accesso__errore--chiaro', role: 'alert', hidden: true });
    const form = h('form', { class: 'modulo', novalidate: '' },
      h('div', { class: 'campo' }, h('label', { for: 'd-nome', text: 'Nome e cognome' }), nome),
      h('div', { class: 'campo' }, h('label', { for: 'd-email', text: 'Email' }), email),
      h('label', { class: 'scelta', for: 'd-admin' }, admin, h('span', { text: 'È amministratore (gestisce anche i docenti)' })), err,
      h('div', { class: 'dialogo__azioni' }, h('button', { type: 'submit', class: 'pulsante' }, 'Crea il docente'), h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { d.close(); } }, 'Annulla')));
    const d = finestra('Nuovo docente', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      api('POST', 'docenti', { nome: nome.value.trim(), email: email.value.trim(), admin: admin.checked }).then(function (r) {
        if (!controlla(r)) return;
        if (r.stato !== 200) { err.hidden = false; err.textContent = r.json.errore === 'esiste' ? 'Esiste già un docente con questa email.' : r.json.errore === 'email' ? 'L\'email non è valida.' : 'Scrivi nome ed email.'; return; }
        d.close(); mostraPassword('Docente creato', r.json.email, r.json.passwordProvvisoria); vistaDocenti();
      });
    });
    nome.focus();
  }
  function reimpostaPassword(d) {
    chiedi('Fare una nuova password provvisoria per ' + d.nome + '? Esce da tutti i dispositivi e dovrà sceglierne una sua.', 'Nuova password', function () {
      api('POST', 'docenti/' + d.id + '/password', {}).then(function (r) {
        if (!controlla(r)) return;
        if (r.stato === 200) { mostraPassword('Nuova password', r.json.email, r.json.passwordProvvisoria); if (d.id === io.id) { io = null; aggiornaMenu(); } else vistaDocenti(); }
      });
    });
  }
  function attivaDocente(d, attivo) {
    const fai = function () { api('PATCH', 'docenti/' + d.id, { attivo: attivo }).then(function (r) { if (controlla(r)) vistaDocenti(); }); };
    if (attivo) fai(); else chiedi('Disattivare ' + d.nome + '? Non potrà più entrare.', 'Disattiva', fai);
  }

  // ---------- Percorso ----------
  function route() {
    numero++;
    if (!API) { vistaNonCollegato(); return; }
    if (!io) { vistaAccesso(); return; }
    if (io.cambiaPassword) { vistaPassword(); return; }
    const p = percorso();
    if (!p.length) return vistaClassi();
    if (p[0] === 'classe' && p[1] && p[2] === 'cartellini') return vistaCartellini(p[1]);
    if (p[0] === 'classe' && p[1]) return vistaClasse(p[1], schedaClasse);
    if (p[0] === 'studente' && p[1]) return vistaStudente(p[1]);
    if (p[0] === 'docenti') return vistaDocenti();
    if (p[0] === 'password') return vistaPassword();
    vistaClassi();
  }

  $('vai-home').addEventListener('click', function () { vai('#/'); });
  window.addEventListener('hashchange', route);
  if (!API) { vistaNonCollegato(); return; }
  api('GET', 'io').then(function (r) {
    if (r.stato === 200 && r.json.profilo && r.json.profilo.tipo === 'docente') io = r.json.profilo;
    aggiornaMenu();
    route();
  });
})();
