/* Le mie attività (portfolio) — interfaccia.
   Costruisce il DOM con nodi e textContent: i testi dello studente non sono mai interpretati come HTML.
   Viste: home (fascia e miniature) · attività in quattro passi · scheda di un'attività · proposte dal diario. */
(function () {
  'use strict';

  const A = window.BC_ATTIVITA;
  const C = window.BC_COMPETENZE;
  const F = window.BC_FOTO;
  const L = window.BC_LOGICA;

  const PASSI = [
    { id: 'foto', titolo: 'Le foto' },
    { id: 'fatto', titolo: 'Che cosa hai fatto' },
    { id: 'dove', titolo: 'Dove e quando' },
    { id: 'competenze', titolo: 'Che cosa sai fare' }
  ];
  const CHIAVE_DIARIO = 'diario-tirocinio-v1';
  const CHIAVE_BILANCIO = 'bilancio-competenze-v1';

  // Esempi di frase per indirizzo: si comincia con un verbo e si dice che cosa, con che cosa, per chi.
  const ESEMPI = {
    elettrico: 'Ho cablato un quadro con due interruttori differenziali seguendo lo schema, poi ho controllato le tensioni con il multimetro.',
    informatica: 'Ho installato il sistema operativo su un PC del laboratorio e ho configurato la stampante di rete.',
    estetica: 'Ho eseguito una manicure completa: ho preparato la postazione, scelto il prodotto adatto alle unghie della cliente e applicato lo smalto.'
  };

  let stato = A.statoVuoto();
  let vista = null; // null = home; { modo: 'passo', id, k } | { modo: 'vedi', id } | { modo: 'diario' }
  let filtro = { luogo: '', competenza: '' };
  let archivioDisponibile = true;
  let fotoDisponibili = true;
  let timerSalva = null;
  let entrata = false;
  let inLavorazione = 0; // foto in preparazione
  const urlFoto = {}; // id -> { mini, grande } URL degli oggetti, per non rileggere IndexedDB a ogni disegno

  const $ = function (id) { return document.getElementById(id); };
  const principale = $('principale');
  const pieno = A.pieno;

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

  // ---------- Archivio locale (testi nel localStorage, foto in IndexedDB) ----------
  function caricaArchivio() {
    try {
      const grezzo = localStorage.getItem(A.CHIAVE);
      if (grezzo) stato = A.normalizza(JSON.parse(grezzo));
    } catch (e) { archivioDisponibile = false; }
  }
  function scriviArchivio() {
    timerSalva = null;
    stato.aggiornato = new Date().toISOString();
    try {
      localStorage.setItem(A.CHIAVE, JSON.stringify(stato));
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

  function leggiAltro(chiave) {
    try { const g = localStorage.getItem(chiave); return g ? JSON.parse(g) : null; } catch (e) { return null; }
  }

  // ---------- Foto: URL per le immagini ----------
  function urlDi(id, grande) {
    const u = urlFoto[id];
    if (u && (grande ? u.grande : u.mini)) return Promise.resolve(grande ? u.grande : u.mini);
    return F.leggi(id).then(function (rec) {
      if (!rec) return '';
      urlFoto[id] = urlFoto[id] || {};
      if (!urlFoto[id].mini) urlFoto[id].mini = URL.createObjectURL(rec.mini);
      if (grande && !urlFoto[id].grande) urlFoto[id].grande = URL.createObjectURL(rec.jpeg);
      return grande ? urlFoto[id].grande : urlFoto[id].mini;
    }).catch(function () { return ''; });
  }
  function dimentica(id) {
    const u = urlFoto[id];
    if (u) { if (u.mini) URL.revokeObjectURL(u.mini); if (u.grande) URL.revokeObjectURL(u.grande); delete urlFoto[id]; }
  }
  // Un'immagine che si riempie quando la foto è letta dall'archivio.
  function immagine(id, alt, grande, classe) {
    const img = h('img', { class: classe || null, alt: alt, decoding: 'async' });
    urlDi(id, grande).then(function (u) { if (u) img.src = u; else img.replaceWith(h('span', { class: classe ? classe + ' foto-mancante' : 'foto-mancante', text: 'Foto non trovata su questo dispositivo' })); });
    return img;
  }

  // ---------- Selezione ----------
  function trova(id) { return stato.attivita.find(function (a) { return a.id === id; }) || null; }
  function corrente() { return vista && vista.id ? trova(vista.id) : null; }
  function vuota(a) { return !a.foto.length && !pieno(a.fatto) && !pieno(a.dove) && !a.competenze.length && !pieno(a.difficolta) && !pieno(a.aiuto); }

  // Uscendo da un'attività rimasta del tutto vuota, non la si conserva.
  function lasciaAttivita() {
    const a = corrente();
    if (a && vuota(a)) { stato.attivita = stato.attivita.filter(function (x) { return x.id !== a.id; }); modificato(); }
  }

  // ---------- Navigazione ----------
  function vai(v) {
    if (vista && vista.modo === 'passo' && (!v || v.id !== vista.id)) lasciaAttivita();
    vista = v;
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

  function statoPasso(a, k) {
    if (!a) return 'vuota';
    if (k === 0) return a.foto.length ? 'completa' : 'vuota';
    if (k === 1) return pieno(a.fatto) ? 'completa' : 'vuota';
    if (k === 2) return a.luogo && a.data ? 'completa' : (a.luogo || pieno(a.dove) ? 'in_corso' : 'vuota');
    return a.competenze.length ? 'completa' : 'vuota';
  }
  const STATO_TESTO = { vuota: 'Da fare', in_corso: 'In corso', completa: 'Fatto' };
  function vociIndice(classe) {
    const a = corrente();
    return PASSI.map(function (p, i) {
      const st = statoPasso(a, i);
      return h('li', null, h('button', {
        type: 'button', class: classe, 'data-stato': st,
        'aria-current': vista && vista.modo === 'passo' && vista.k === i ? 'step' : null,
        onclick: function () { if ($('dialogo-indice').open) $('dialogo-indice').close(); vai({ modo: 'passo', id: vista.id, k: i }); }
      },
        h('span', { class: 'meta rail__num', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'rail__nome', text: p.titolo }),
        h('span', { class: 'meta rail__stato', text: STATO_TESTO[st] })));
    });
  }
  function aggiornaIndice() {
    const inPasso = vista && vista.modo === 'passo';
    const rail = $('rail-elenco');
    if (rail) { rail.textContent = ''; if (inPasso) aggiungi(rail, vociIndice('rail__voce')); }
    const el = $('indice-elenco'); el.textContent = '';
    if (inPasso) {
      aggiungi(el, vociIndice('indice-dialogo__voce'));
      $('tappa-stato').textContent = STATO_TESTO[statoPasso(corrente(), vista.k)];
    }
  }
  function aggiornaTestata() {
    const inPasso = vista && vista.modo === 'passo';
    $('tappa-mobile').hidden = !inPasso;
    $('avanzamento').hidden = !inPasso;
    if (!inPasso) return;
    $('barra').style.width = ((vista.k + 1) / PASSI.length * 100) + '%';
    const av = $('avanzamento');
    av.querySelectorAll('.avanzamento__nodo').forEach(function (n) { n.remove(); });
    PASSI.forEach(function (_, i) {
      const nodo = document.createElement('span');
      nodo.className = 'avanzamento__nodo' + (i === vista.k ? ' avanzamento__nodo--attivo' : i < vista.k ? ' avanzamento__nodo--completato' : '');
      nodo.style.left = (i / (PASSI.length - 1) * 100) + '%';
      nodo.setAttribute('aria-hidden', 'true');
      av.appendChild(nodo);
    });
    $('tappa-nome').textContent = PASSI[vista.k].titolo;
  }

  // ---------- Elementi ricorrenti ----------
  function campo(o) {
    const sugg = o.suggerimento ? h('p', { class: 'campo__suggerimento', id: o.id + '-sugg', text: o.suggerimento }) : null;
    const controllo = o.area
      ? h('textarea', { id: o.id, maxlength: o.max || 4000, 'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '', class: o.classe || null,
        oninput: function (e) { o.aggiorna(e.target.value); adattaAltezza(e.target); modificato(); } })
      : h('input', { type: o.tipo || 'text', id: o.id, maxlength: o.max || 200, autocomplete: 'off', list: o.lista || null,
        'aria-describedby': sugg ? o.id + '-sugg' : null, value: o.valore || '',
        oninput: function (e) { o.aggiorna(e.target.value); modificato(); } });
    return h('div', { class: 'campo' }, h('label', { for: o.id, text: o.etichetta }), sugg, controllo, o.dopo || null);
  }
  function gruppoScelte(o) {
    return h('fieldset', { class: 'campo' },
      h('legend', { text: o.legenda }),
      o.suggerimento ? h('p', { class: 'campo__suggerimento', text: o.suggerimento }) : null,
      h('div', { class: 'scelte' + (o.riga ? ' scelte--riga' : '') }, o.opzioni.map(function (op) {
        const id = o.nome + '-' + op.id;
        const sel = o.multipla ? o.valore.indexOf(op.id) !== -1 : o.valore === op.id;
        return h('label', { class: 'scelta', for: id },
          h('input', { type: o.multipla ? 'checkbox' : 'radio', name: o.nome, id: id, value: op.id, checked: sel,
            disabled: o.multipla && !sel && o.max && o.valore.length >= o.max,
            onchange: function (e) { o.aggiorna(op.id, e.target.checked); } }),
          h('span', { text: op.testo }));
      })));
  }
  function aiuto() {
    return h('div', { class: 'aiuto' }, Array.prototype.slice.call(arguments).map(function (t) { return typeof t === 'string' ? h('p', { text: t }) : t; }));
  }
  function testa(meta, titolo) {
    return h('div', { class: 'schermata__testa' },
      h('span', { class: 'meta' }, h('span', { class: 'segno', 'aria-hidden': 'true' }), meta),
      h('h2', { id: 'titolo-schermata', text: titolo }));
  }
  function corpo(intro, risposta) {
    return h('div', { class: 'schermata__corpo' },
      intro ? h('div', { class: 'colonna-intro' }, intro) : null,
      h('div', { class: 'colonna-risposta' }, risposta));
  }
  function avvisoFoto() {
    const ind = stato.profilo.indirizzo;
    return aiuto(
      h('p', null, h('strong', { text: 'Fotografa il lavoro, non le persone.' }), ' Niente volti, documenti o schermi con dati di clienti o colleghi. In azienda chiedi prima al tutor se puoi fotografare.'),
      ind === 'estetica' || !ind ? 'Per un trattamento inquadra solo la zona trattata (le mani, un dettaglio della pelle), mai il viso.' : null);
  }

  // ---------- Home ----------
  function proposteDiario() { return A.proposteDalDiario(leggiAltro(CHIAVE_DIARIO), stato); }

  function nuovaAttivita(daProposta) {
    const a = daProposta ? A.attivitaDaProposta(daProposta) : A.attivitaVuota(A.oggiIso());
    stato.attivita.push(a);
    modificato();
    vai({ modo: 'passo', id: a.id, k: 0 });
  }

  function disegnaHome() {
    const n = stato.attivita.length;
    const dalDiario = proposteDiario().filter(function (p) { return !p.gia; }).length;
    return h('div', { class: 'home' },
      h('div', { class: 'home__fascia' }, h('div', { class: 'home__fascia-dentro' },
        h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' }),
        h('h1', { text: 'Le mie attività' }),
        h('p', { class: 'home__sottotitolo', text: 'Fotografa quello che fai. Scrivi due righe.' }),
        h('p', { class: 'home__testo misura', text: 'Ogni volta che finisci un lavoro in laboratorio o in tirocinio, aggiungi un\'attività: una o più foto e che cosa hai fatto, con le tue parole. Ci vuole un minuto. Così, quando farai il bilancio di competenze o il curriculum, le prove sono già qui.' }),
        h('div', { class: 'home__azioni' },
          h('button', { type: 'button', class: 'pulsante pulsante--grande', id: 'nuova', disabled: n >= A.MAX_ATTIVITA, onclick: function () { nuovaAttivita(); } }, '+ Nuova attività'),
          dalDiario ? h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { vai({ modo: 'diario' }); } },
            'Prendi dal diario (' + dalDiario + ')') : null),
        h('p', { class: 'nota', text: 'Le attività e le foto restano su questo dispositivo. Fotografa il lavoro, non le persone.' }))),
      h('section', { class: 'home__sotto', 'aria-labelledby': 'titolo-galleria' },
        h('h2', { id: 'titolo-galleria', class: 'meta occhiello', text: n ? (n === 1 ? 'Un\'attività' : n + ' attività') : 'Ancora nessuna attività' }),
        n ? galleria() : h('div', { class: 'galleria-vuota' },
          h('p', { text: 'Qui compariranno le tue attività, dalla più recente.' }),
          avvisoFoto())));
  }

  function galleria() {
    const usate = {};
    stato.attivita.forEach(function (a) { a.competenze.forEach(function (c) { usate[c] = true; }); });
    const elenco = A.ordinate(stato).filter(function (a) {
      return (!filtro.luogo || a.luogo === filtro.luogo) && (!filtro.competenza || a.competenze.indexOf(filtro.competenza) !== -1);
    });
    const opzComp = Object.keys(usate).map(function (id) { return C.trova(id); }).filter(Boolean);
    return [
      h('div', { class: 'filtri', role: 'group', 'aria-label': 'Mostra' },
        [{ id: '', testo: 'Tutte' }].concat(A.LUOGHI.map(function (l) { return { id: l.id, testo: l.breve }; })).map(function (l) {
          return h('button', { type: 'button', class: 'filtro', 'aria-pressed': filtro.luogo === l.id ? 'true' : 'false',
            onclick: function () { filtro.luogo = l.id; ridisegna(); } }, l.testo);
        }),
        opzComp.length ? h('label', { class: 'filtri__comp' },
          h('span', { class: 'visivamente-nascosto', text: 'Che cosa sai fare' }),
          h('select', { onchange: function (e) { filtro.competenza = e.target.value; ridisegna(); } },
            h('option', { value: '', text: 'Tutto quello che sai fare' }),
            opzComp.map(function (c) { return h('option', { value: c.id, text: c.semplice, selected: filtro.competenza === c.id ? 'selected' : null }); }))) : null),
      elenco.length ? h('ul', { class: 'galleria' }, elenco.map(function (a) {
        const manca = A.mancanti(a);
        return h('li', null, h('button', { type: 'button', class: 'carta', id: 'carta-' + a.id, onclick: function () { vai({ modo: 'vedi', id: a.id }); } },
          h('span', { class: 'carta__foto' }, a.foto.length ? immagine(a.foto[0], '', false) : h('span', { class: 'carta__senza', text: 'Senza foto' }),
            a.foto.length > 1 ? h('span', { class: 'carta__conta', text: '+' + (a.foto.length - 1) }) : null),
          h('span', { class: 'carta__testo' },
            h('span', { class: 'meta', text: A.riassunto(a) }),
            h('span', { class: 'carta__titolo', text: A.titolo(a) }),
            manca.length ? h('span', { class: 'meta carta__manca', text: 'Manca ' + manca.join(', ') }) : null)));
      })) : h('p', { class: 'vuoto', text: 'Nessuna attività con questo filtro.' })
    ];
  }

  // ---------- Passo 1: le foto ----------
  function passoFoto(a) {
    const piene = a.foto.length >= A.MAX_FOTO;
    const scegli = function (cattura) {
      const input = h('input', { type: 'file', accept: 'image/*', multiple: cattura ? null : true, capture: cattura ? 'environment' : null, hidden: true,
        onchange: function (e) { aggiungiFoto(a, Array.prototype.slice.call(e.target.files || [])); input.remove(); } });
      document.body.appendChild(input);
      input.click();
    };
    const intro = [
      h('p', { text: 'Da una a quattro foto del lavoro finito o di un passaggio importante. Se non hai una foto puoi andare avanti e aggiungerla dopo.' }),
      avvisoFoto()
    ];
    const risposta = [
      fotoDisponibili ? null : h('p', { class: 'avviso', text: 'Questo browser non permette di salvare le foto (per esempio in una finestra anonima). Puoi scrivere l\'attività e aggiungere le foto da un altro browser.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', id: 'scatta', disabled: piene || !fotoDisponibili, onclick: function () { scegli(true); } }, 'Scatta una foto'),
        h('button', { type: 'button', class: 'pulsante pulsante--secondario', id: 'galleria', disabled: piene || !fotoDisponibili, onclick: function () { scegli(false); } }, 'Scegli dalla galleria')),
      inLavorazione ? h('p', { class: 'meta', role: 'status', text: inLavorazione === 1 ? 'Sto preparando la foto…' : 'Sto preparando ' + inLavorazione + ' foto…' }) : null,
      a.foto.length ? h('ul', { class: 'striscia', 'aria-label': 'Le foto di questa attività' }, a.foto.map(function (id, i) {
        return h('li', { class: 'striscia__foto' },
          immagine(id, 'Foto ' + (i + 1), false),
          h('div', { class: 'striscia__azioni' },
            i > 0 ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { a.foto.splice(i, 1); a.foto.unshift(id); modificato(); ridisegna(); } }, 'Metti per prima') : h('span', { class: 'meta', text: 'In copertina' }),
            h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Togli la foto ' + (i + 1), onclick: function () { togliFoto(a, id); } }, 'Togli')));
      })) : h('p', { class: 'vuoto', text: 'Nessuna foto per ora.' }),
      piene ? h('p', { class: 'nota', text: 'Hai già quattro foto: per aggiungerne un\'altra togline una.' }) : null
    ];
    return [testa('01 / 04', 'Le foto'), corpo(intro, risposta)];
  }

  function aggiungiFoto(a, files) {
    const posto = A.MAX_FOTO - a.foto.length;
    const scelti = files.filter(function (f) { return /^image\//.test(f.type || 'image/'); }).slice(0, Math.max(0, posto));
    if (files.length > scelti.length && posto <= files.length) avvisa('Al massimo quattro foto per attività: ho preso le prime ' + scelti.length + '.');
    if (!scelti.length) return;
    inLavorazione += scelti.length; ridisegna();
    scelti.reduce(function (p, file) {
      return p.then(function () {
        const id = A.nuovoIdFoto();
        return F.riduci(file, id).then(F.salva).then(function () {
          if (a.foto.length < A.MAX_FOTO) a.foto.push(id);
          modificato();
        }).catch(function () {
          avvisa('Non sono riuscito a usare una delle foto. Prova a scattarla di nuovo o a sceglierne un\'altra.');
        }).then(function () { inLavorazione--; ridisegna(); });
      });
    }, Promise.resolve()).then(function () { scriviArchivio(); });
  }

  function togliFoto(a, id) {
    chiedi('Togliere questa foto dall\'attività? Verrà cancellata da questo dispositivo.', 'Togli', function () {
      a.foto = a.foto.filter(function (x) { return x !== id; });
      scriviArchivio();
      F.elimina(id).catch(function () { /* resta un avanzo, lo toglie la pulizia */ });
      dimentica(id);
      ridisegna('galleria');
    });
  }

  // ---------- Passo 2: che cosa hai fatto ----------
  function passoFatto(a) {
    const ind = stato.profilo.indirizzo;
    const esempi = ind ? [ESEMPI[ind]] : [ESEMPI.elettrico, ESEMPI.informatica, ESEMPI.estetica];
    const avviso = h('p', { class: 'suggerimento-vivo', id: 'avviso-fatto', role: 'status', 'aria-live': 'polite', hidden: true });
    const controlla = function () {
      const c = L.vaghezza(a.fatto);
      avviso.hidden = !c;
      avviso.textContent = c === 'generica'
        ? 'Così dice dove eri, non che cosa hai fatto. Prova a cominciare con un verbo: «Ho cablato…», «Ho installato…», «Ho eseguito…».'
        : c === 'corta' ? 'Aggiungi un dettaglio: con che cosa, per chi, come hai controllato il risultato.' : '';
    };
    const intro = [
      h('p', { text: 'Racconta quello che hai fatto tu, in una o due frasi. Comincia con un verbo e di\' che cosa, con che cosa e come è andata.' }),
      h('details', { class: 'esempio' }, h('summary', { text: esempi.length > 1 ? 'Vedi degli esempi' : 'Vedi un esempio' }),
        h('div', { class: 'esempio__corpo' }, esempi.map(function (e) { return h('p', { text: e }); }))),
      h('p', { class: 'nota', text: 'Puoi dettare: tocca il microfono sulla tastiera del telefono e poi controlla quello che ha scritto.' })
    ];
    const risposta = [
      campo({ id: 'f-fatto', etichetta: 'Che cosa hai fatto?', area: true, classe: 'lungo', valore: a.fatto, max: 4000,
        aggiorna: function (v) { a.fatto = v; clearTimeout(controlla.t); controlla.t = setTimeout(controlla, 600); }, dopo: avviso })
    ];
    setTimeout(controlla, 0);
    return [testa('02 / 04', 'Che cosa hai fatto'), corpo(intro, risposta)];
  }

  // ---------- Passo 3: dove e quando ----------
  function passoDove(a) {
    const diario = leggiAltro(CHIAVE_DIARIO);
    const aziende = diario && Array.isArray(diario.tirocini)
      ? diario.tirocini.map(function (t) { return t && typeof t.azienda === 'string' ? t.azienda.trim() : ''; }).filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }) : [];
    const etichettaDove = a.luogo === 'tirocinio' ? 'In quale azienda?' : a.luogo === 'scuola' ? 'In quale laboratorio o materia?' : 'Dove?';
    const risposta = [
      gruppoScelte({ legenda: 'Dove è successo?', nome: 'f-luogo', opzioni: A.LUOGHI, valore: a.luogo,
        aggiorna: function (id) { a.luogo = id; modificato(); ridisegna('f-luogo-' + id); } }),
      a.luogo ? campo({ id: 'f-dove', etichetta: etichettaDove, valore: a.dove, max: 200, lista: a.luogo === 'tirocinio' && aziende.length ? 'aziende-diario' : null,
        suggerimento: a.luogo === 'tirocinio' && aziende.length ? 'Puoi scegliere un\'azienda del tuo diario.' : 'Facoltativo.',
        aggiorna: function (v) { a.dove = v; } }) : null,
      aziende.length ? h('datalist', { id: 'aziende-diario' }, aziende.map(function (x) { return h('option', { value: x }); })) : null,
      campo({ id: 'f-data', etichetta: 'Quando?', tipo: 'date', valore: a.data, max: 10, aggiorna: function (v) { a.data = v; } })
    ];
    return [testa('03 / 04', 'Dove e quando'), corpo([h('p', { text: 'Dove eri e in che giorno. Se non ricordi la data esatta, scegli un giorno di quella settimana.' })], risposta)];
  }

  // ---------- Passo 4: che cosa sai fare ----------
  function passoCompetenze(a) {
    const p = stato.profilo;
    const bilancio = leggiAltro(CHIAVE_BILANCIO);
    const dalBilancio = bilancio && bilancio.profilo && (A.INDIRIZZI.some(function (x) { return x.id === bilancio.profilo.indirizzo; }))
      ? { indirizzo: bilancio.profilo.indirizzo, anno: A.ANNI.some(function (x) { return x.id === bilancio.profilo.anno; }) ? bilancio.profilo.anno : '' } : null;
    const profiloCompleto = p.indirizzo && p.anno;
    const intro = [
      h('p', { text: 'Che cosa sai fare, secondo questa attività? Scegli da una a tre voci. Sono le competenze del tuo percorso, dette in modo semplice.' }),
      h('p', { class: 'nota', text: 'Puoi anche saltare questo passo e tornarci dopo.' })
    ];
    const profilo = h('div', { class: 'profilo-breve' },
      profiloCompleto ? h('p', { class: 'meta' }, 'Competenze di: ', h('strong', { text: C.figuraPer(p.indirizzo, p.anno) }), ' · ',
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { p.anno = ''; p.indirizzo = ''; modificato(); ridisegna(); } }, 'Cambia')) : [
        h('p', { text: 'Per mostrarti le competenze giuste dimmi indirizzo e anno. Lo chiedo una volta sola.' }),
        dalBilancio && !p.indirizzo ? h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: function () {
          p.indirizzo = dalBilancio.indirizzo; if (dalBilancio.anno) p.anno = dalBilancio.anno; modificato(); ridisegna();
        } }, 'Prendi dal bilancio di competenze') : null,
        gruppoScelte({ legenda: 'Quale indirizzo frequenti?', nome: 'f-indirizzo', opzioni: A.INDIRIZZI, valore: p.indirizzo, riga: true,
          aggiorna: function (id) { p.indirizzo = id; modificato(); ridisegna('f-indirizzo-' + id); } }),
        gruppoScelte({ legenda: 'Che anno frequenti?', nome: 'f-anno', opzioni: A.ANNI, valore: p.anno, riga: true,
          aggiorna: function (id) { p.anno = id; modificato(); ridisegna('f-anno-' + id); } })
      ]);
    const gruppi = profiloCompleto ? C.gruppiPer(p.indirizzo, p.anno) : [];
    const scelte = gruppi.map(function (g) {
      return gruppoScelte({ legenda: g.titolo, nome: 'f-comp-' + g.id, multipla: true, max: A.MAX_COMPETENZE,
        opzioni: g.competenze.map(function (c) { return { id: c.id, testo: c.semplice }; }), valore: a.competenze,
        aggiorna: function (id, attiva) {
          a.competenze = a.competenze.filter(function (x) { return x !== id; });
          if (attiva && a.competenze.length < A.MAX_COMPETENZE) a.competenze.push(id);
          modificato(); ridisegna('f-comp-' + g.id + '-' + id);
        } });
    });
    // Competenze scelte che non sono più tra quelle mostrate (anno o indirizzo cambiati): restano visibili e si possono togliere.
    const mostrate = {};
    gruppi.forEach(function (g) { g.competenze.forEach(function (c) { mostrate[c.id] = true; }); });
    const altre = a.competenze.filter(function (id) { return !mostrate[id]; }).map(C.trova).filter(Boolean);
    const risposta = [
      profilo,
      profiloCompleto ? h('p', { class: 'meta', role: 'status', text: a.competenze.length ? 'Scelte: ' + a.competenze.length + ' di ' + A.MAX_COMPETENZE : 'Nessuna voce scelta' }) : null,
      altre.length ? gruppoScelte({ legenda: 'Già scelte prima', nome: 'f-comp-altre', multipla: true, opzioni: altre.map(function (c) { return { id: c.id, testo: c.semplice }; }), valore: a.competenze,
        aggiorna: function (id) { a.competenze = a.competenze.filter(function (x) { return x !== id; }); modificato(); ridisegna(); } }) : null,
      scelte,
      h('details', { class: 'dettagli', open: pieno(a.difficolta) || pieno(a.aiuto) ? 'open' : null },
        h('summary', { text: 'Vuoi aggiungere altro? (facoltativo)' }),
        h('div', { class: 'dettagli__corpo' },
          campo({ id: 'f-difficolta', etichetta: 'Che cosa è stato difficile?', area: true, valore: a.difficolta, aggiorna: function (v) { a.difficolta = v; } }),
          campo({ id: 'f-aiuto', etichetta: 'Chi o che cosa ti ha aiutato?', area: true, valore: a.aiuto, aggiorna: function (v) { a.aiuto = v; } })))
    ];
    return [testa('04 / 04', 'Che cosa sai fare'), corpo(intro, risposta)];
  }

  function navigazionePassi() {
    const k = vista.k;
    return h('nav', { class: 'navigazione', 'aria-label': 'Navigazione tra i passi' },
      h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { k === 0 ? vai(null) : vai({ modo: 'passo', id: vista.id, k: k - 1 }); } }, k === 0 ? 'Torna alle attività' : 'Indietro'),
      h('span', { class: 'meta', text: 'Passo ' + (k + 1) + ' di ' + PASSI.length }),
      k < PASSI.length - 1
        ? h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: function () { vai({ modo: 'passo', id: vista.id, k: k + 1 }); } }, 'Avanti')
        : h('button', { type: 'button', class: 'pulsante', onclick: function () {
          const id = vista.id;
          clearTimeout(timerSalva); scriviArchivio();
          vai({ modo: 'vedi', id: id });
          $('salvato').textContent = 'Attività salvata';
        } }, 'Salva l\'attività'));
  }

  // ---------- Scheda di un'attività ----------
  function schedaAttivita(a) {
    const comp = a.competenze.map(C.trova).filter(Boolean);
    const manca = A.mancanti(a);
    return h('div', { class: 'schermata' + (entrata ? ' schermata--entra' : '') },
      h('button', { type: 'button', class: 'pulsante pulsante--testo ed__torna-sempre', onclick: function () { vai(null); } }, '← Tutte le attività'),
      h('div', { class: 'schermata__testa' },
        h('span', { class: 'meta' }, h('span', { class: 'segno', 'aria-hidden': 'true' }),
          [A.luogo(a.luogo) ? A.luogo(a.luogo).breve : 'Attività', a.dove.trim()].filter(Boolean).join(' · ')),
        h('h2', { id: 'titolo-schermata', text: a.data ? A.formatoData(a.data) : 'Attività senza data' })),
      h('div', { class: 'scheda-attivita' },
        a.foto.length ? h('ul', { class: 'foto-grandi' + (a.foto.length === 1 ? ' foto-grandi--una' : '') }, a.foto.map(function (id, i) {
          return h('li', null, immagine(id, 'Foto ' + (i + 1) + ' dell\'attività', true));
        })) : h('p', { class: 'avviso', text: 'Questa attività non ha ancora una foto.' }),
        h('div', { class: 'scheda-attivita__testo' },
          pieno(a.fatto) ? h('blockquote', { class: 'citazione', text: a.fatto }) : h('p', { class: 'vuoto', text: 'Non hai ancora scritto che cosa hai fatto.' }),
          comp.length ? h('section', null, h('h3', { class: 'meta occhiello', text: 'Che cosa so fare' }),
            h('ul', { class: 'competenze' }, comp.map(function (c) { return h('li', { text: c.semplice }); }))) : null,
          pieno(a.difficolta) ? h('section', null, h('h3', { class: 'meta occhiello', text: 'Che cosa è stato difficile' }), h('p', { class: 'testo-libero', text: a.difficolta })) : null,
          pieno(a.aiuto) ? h('section', null, h('h3', { class: 'meta occhiello', text: 'Chi o che cosa mi ha aiutato' }), h('p', { class: 'testo-libero', text: a.aiuto })) : null,
          manca.length ? h('p', { class: 'nota', text: 'Manca ' + manca.join(', ') + '.' }) : null,
          h('div', { class: 'home__azioni' },
            h('button', { type: 'button', class: 'pulsante', id: 'modifica', onclick: function () { vai({ modo: 'passo', id: a.id, k: manca.indexOf('una foto') !== -1 ? 0 : 1 }); } }, 'Modifica'),
            h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { eliminaAttivita(a); } }, 'Elimina')))));
  }

  function eliminaAttivita(a) {
    chiedi('Eliminare questa attività con le sue foto? Non si può annullare.', 'Elimina', function () {
      stato.attivita = stato.attivita.filter(function (x) { return x.id !== a.id; });
      a.foto.forEach(function (id) { F.elimina(id).catch(function () {}); dimentica(id); });
      clearTimeout(timerSalva); scriviArchivio();
      vista = null; vai(null);
    });
  }

  // ---------- Dal diario ----------
  function schermataDiario() {
    const proposte = proposteDiario();
    return h('div', { class: 'schermata' + (entrata ? ' schermata--entra' : '') },
      h('button', { type: 'button', class: 'pulsante pulsante--testo ed__torna-sempre', onclick: function () { vai(null); } }, '← Tutte le attività'),
      testa('Dal tuo diario di bordo', 'Prendi una settimana dal diario'),
      corpo([
        h('p', { text: 'Ogni settimana del diario in cui hai scritto che cosa hai fatto può diventare un\'attività. Il testo, la data e l\'azienda vengono copiati: poi aggiungi le foto e scegli che cosa sai fare.' }),
        h('p', { class: 'nota', text: 'Il diario non viene modificato. Se lo compili su un altro dispositivo, qui vedi solo quello salvato in questo browser.' })
      ], proposte.length ? h('ul', { class: 'schede' }, proposte.map(function (p) {
        return h('li', { class: 'scheda' },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: [p.data ? A.formatoData(p.data) : '', p.azienda].filter(Boolean).join(' · ') }),
            p.gia ? h('span', { class: 'meta', text: 'Già tra le tue attività' }) : null),
          h('p', { class: 'testo-libero', text: p.fatto.length > 280 ? p.fatto.slice(0, 278) + '…' : p.fatto }),
          h('div', { class: 'scheda__azioni' },
            h('button', { type: 'button', class: 'pulsante pulsante--piccolo' + (p.gia ? ' pulsante--secondario' : ''), onclick: function () { nuovaAttivita(p); } },
              p.gia ? 'Aggiungi di nuovo' : 'Aggiungi alle attività')));
      })) : h('p', { class: 'vuoto', text: 'Nel diario di questo browser non ci sono settimane con «Che cosa hai fatto» compilato.' })));
  }

  // ---------- Disegno ----------
  function disegna() {
    principale.textContent = '';
    if (vista && vista.id && !corrente()) vista = null;
    if (!vista) aggiungi(principale, disegnaHome());
    else if (vista.modo === 'vedi') aggiungi(principale, h('div', { class: 'lavoro lavoro--singolo' }, schedaAttivita(corrente())));
    else if (vista.modo === 'diario') aggiungi(principale, h('div', { class: 'lavoro lavoro--singolo' }, schermataDiario()));
    else {
      const a = corrente();
      const k = vista.k;
      const contenuto = k === 0 ? passoFoto(a) : k === 1 ? passoFatto(a) : k === 2 ? passoDove(a) : passoCompetenze(a);
      aggiungi(principale, h('div', { class: 'lavoro' },
        h('nav', { class: 'rail', 'aria-label': 'Passi dell\'attività' }, h('ol', { id: 'rail-elenco' })),
        h('div', null, h('section', { class: 'schermata' + (entrata ? ' schermata--entra' : ''), 'aria-labelledby': 'titolo-schermata' }, contenuto), navigazionePassi())));
    }
    aggiornaTestata(); aggiornaIndice();
    principale.querySelectorAll('textarea').forEach(adattaAltezza);
  }

  // ---------- Copia, PDF, cancellazione ----------
  function scaricaFile(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function dataFile() { return new Date().toISOString().slice(0, 10); }

  function scaricaCopia() {
    clearTimeout(timerSalva); scriviArchivio();
    $('salvato').textContent = 'Preparo la copia…';
    const ids = Object.keys(A.fotoUsate(stato));
    F.esporta(ids).catch(function () { return {}; }).then(function (foto) {
      const copia = Object.assign({}, stato, { foto: foto });
      scaricaFile(new Blob([JSON.stringify(copia)], { type: 'application/json' }), 'le-mie-attivita-' + dataFile() + '.json');
      $('salvato').textContent = 'Copia scaricata';
    });
  }
  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) { avvisa('Il file non è una copia valida delle tue attività.'); return; }
      if (!dati || dati.versione !== A.VERSIONE || !Array.isArray(dati.attivita)) { avvisa('Il file non è una copia valida delle tue attività.'); return; }
      const applica = function () {
        $('salvato').textContent = 'Carico la copia…';
        F.importa(dati.foto || {}, A.ID_FOTO).catch(function () { return 0; }).then(function () {
          stato = A.normalizza(dati);
          scriviArchivio();
          F.pulisci(A.fotoUsate(stato)).catch(function () {});
          if ($('dialogo-salva').open) $('dialogo-salva').close();
          vista = null; vai(null);
        });
      };
      if (stato.attivita.length) chiedi('Sostituire le tue attività con quelle del file? Quelle di adesso, con le foto, verranno cancellate da questo dispositivo.', 'Sostituisci', applica);
      else applica();
    };
    lettore.readAsText(file);
  }

  function leggiFont(nomi) {
    return Promise.all(nomi.map(function (n) {
      return fetch('../fonts/ttf/' + n + '.ttf').then(function (r) {
        if (!r.ok) throw new Error('font');
        return r.arrayBuffer();
      }).then(function (b) { return new Uint8Array(b); });
    }));
  }
  function scaricaPdf() {
    clearTimeout(timerSalva); scriviArchivio();
    $('salvato').textContent = 'Preparo il PDF…';
    const ids = Object.keys(A.fotoUsate(stato));
    const foto = {};
    Promise.all([
      leggiFont(['firasans-regular', 'firasans-semibold']),
      Promise.all(ids.map(function (id) {
        return F.leggi(id).then(function (rec) { return rec ? rec.jpeg.arrayBuffer() : null; }).then(function (b) { if (b) foto[id] = new Uint8Array(b); }).catch(function () {});
      }))
    ]).then(function (r) {
      const bilancio = leggiAltro(CHIAVE_BILANCIO);
      const nome = bilancio && bilancio.profilo && typeof bilancio.profilo.nome === 'string' ? bilancio.profilo.nome.trim().slice(0, 80) : '';
      return window.BC_PDF.creaPdf(A.modelloPdf(stato, foto, { nome: nome }), { f: r[0][0], fs: r[0][1] });
    }).then(function (byte) {
      scaricaFile(new Blob([byte], { type: 'application/pdf' }), 'le-mie-attivita-' + dataFile() + '.pdf');
      $('salvato').textContent = 'PDF scaricato';
    }).catch(function () {
      $('salvato').textContent = '';
      avvisa('Non sono riuscito a creare il PDF. Riprova; se non funziona, scarica una copia delle attività.');
    });
  }

  function cancellaTutto() {
    chiedi('Cancellare tutte le attività e le foto da questo browser? Se non hai scaricato una copia andranno perse.', 'Cancella tutto', function () {
      clearTimeout(timerSalva); timerSalva = null;
      try { localStorage.removeItem(A.CHIAVE); } catch (e) { /* niente da fare */ }
      F.svuota().catch(function () {});
      Object.keys(urlFoto).forEach(dimentica);
      stato = A.statoVuoto(); $('salvato').textContent = 'Attività cancellate';
      $('dialogo-salva').close(); vista = null; vai(null);
    });
  }

  // ---------- Avvio ----------
  caricaArchivio();
  disegna();
  if (!archivioDisponibile) $('salvato').textContent = 'Salvataggio non disponibile: scarica una copia';
  else if (stato.aggiornato) $('salvato').textContent = 'Attività ritrovate';
  // Le foto che nessuna attività usa più (per esempio dopo un'uscita a metà) si tolgono all'avvio.
  F.pulisci(A.fotoUsate(stato)).catch(function () { fotoDisponibili = false; if (vista) ridisegna(); });
  $('vai-home').addEventListener('click', function () { vai(null); });
  $('apri-salva').addEventListener('click', function () { $('dialogo-salva').showModal(); });
  $('chiudi-salva').addEventListener('click', function () { $('dialogo-salva').close(); });
  $('apri-indice').addEventListener('click', function () { $('dialogo-indice').showModal(); });
  $('chiudi-indice').addEventListener('click', function () { $('dialogo-indice').close(); });
  $('scarica').addEventListener('click', scaricaCopia);
  $('scarica-pdf').addEventListener('click', function () { $('dialogo-salva').close(); scaricaPdf(); });
  $('carica').addEventListener('click', function () { $('file-copia').click(); });
  $('file-copia').addEventListener('change', function (e) { if (e.target.files[0]) caricaCopia(e.target.files[0]); e.target.value = ''; });
  $('cancella').addEventListener('click', cancellaTutto);
})();
