/* Curriculum vitae — interfaccia.
   Costruisce il DOM con nodi e textContent: i testi dello studente non sono mai interpretati come HTML.
   Sito a parte rispetto al bilancio: salva sul dispositivo (chiave «cv-v1») e non invia niente a nessuno.
   Dal bilancio e dal diario legge, solo su richiesta dello studente: non li modifica mai. */
(function () {
  'use strict';

  const D = window.BC_DATI;
  const C = window.BC_CV;
  const PASSI = C.PASSI;

  const CHIAVE_POSIZIONE = 'cv-posizione-v1';
  const STATO_TESTO = { vuota: 'Da iniziare', in_corso: 'In corso', completa: 'Completa' };

  let stato = C.statoVuoto();
  let vista = null; // null = home; altrimenti { k }
  let ripresa = null; // ultimo passo di lavoro, per «Riprendi»
  let archivioDisponibile = true;
  let ripresoDalBilancio = false;
  let timerSalva = null;
  let entrata = false; // animazione d'ingresso solo quando si cambia schermata
  // (il diario letto da un file è più sotto, nella parte «Dal diario di bordo»)
  let bilancioCaricato = null; // bilancio letto da un file (già controllato da C.leggiBilancio)

  const $ = function (id) { return document.getElementById(id); };
  const principale = $('principale');

  // ---------- Costruzione del DOM ----------
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
  function scriviArchivio() {
    stato.aggiornato = new Date().toISOString();
    try {
      localStorage.setItem(C.CHIAVE, JSON.stringify(stato));
      archivioDisponibile = true;
      const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      $('salvato').textContent = 'Salvato alle ' + ora;
    } catch (e) {
      archivioDisponibile = false;
      $('salvato').textContent = 'Non salvato: scarica una copia';
    }
  }

  function caricaArchivio() {
    try {
      const grezzo = localStorage.getItem(C.CHIAVE);
      if (grezzo) {
        stato = C.normalizza(JSON.parse(grezzo));
      } else {
        // Una versione precedente del bilancio conservava qui il curriculum: lo riprendo una volta sola.
        const vecchio = C.daBilancioVecchio(JSON.parse(localStorage.getItem(C.CHIAVE_BILANCIO) || 'null'));
        if (vecchio) { stato = vecchio; ripresoDalBilancio = true; }
      }
      const pos = JSON.parse(localStorage.getItem(CHIAVE_POSIZIONE) || 'null');
      if (pos && PASSI[pos.k]) ripresa = { k: pos.k };
    } catch (e) {
      archivioDisponibile = false;
    }
  }

  let cvVersione = 0; // cambia a ogni modifica dei dati: invalida le correzioni scritte sul foglio

  function modificato(opzioni) {
    if (!opzioni || !opzioni.aspetto) cvVersione++;
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
  function vai(k, opzioni) {
    vista = (k === null) ? null : { k: k || 0 };
    if (vista) { ripresa = vista; salvaPosizione(); }
    entrata = true;
    disegna();
    entrata = false;
    window.scrollTo(0, 0);
    const titolo = principale.querySelector('h1, h2');
    if (titolo) { titolo.setAttribute('tabindex', '-1'); titolo.focus({ preventScroll: true }); }
  }

  function passo(delta) {
    const i = (vista ? vista.k : -1) + delta;
    if (i < 0) vai(null);
    else if (i < PASSI.length) vai(i);
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
    const av = C.avanzamento(stato);
    return PASSI.map(function (p, i) {
      return h('li', null, h('button', {
        type: 'button', class: classe,
        'aria-current': vista && vista.k === i ? 'step' : null,
        onclick: function () { if ($('dialogo-indice').open) $('dialogo-indice').close(); vai(i); }
      },
        h('span', { class: 'meta rail__num', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'rail__nome', text: p.titolo }),
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
    if (vista) $('tappa-stato').textContent = STATO_TESTO[C.statoPasso(stato, PASSI[vista.k].id)];
  }

  function aggiornaTestata() {
    $('tappa-mobile').hidden = !vista;
    // La traccia con i cerchi c'è anche nella prima pagina (nessun cerchio pieno finché non si comincia).
    $('avanzamento').hidden = false;
    $('barra').style.width = vista ? ((vista.k + 1) / PASSI.length * 100) + '%' : '0%';
    const avanzamento = $('avanzamento');
    avanzamento.querySelectorAll('.avanzamento__nodo').forEach(function (n) { n.remove(); });
    PASSI.forEach(function (_, i) {
      const nodo = document.createElement('span');
      nodo.className = 'avanzamento__nodo' + (vista && i === vista.k ? ' avanzamento__nodo--attivo' : vista && i < vista.k ? ' avanzamento__nodo--completato' : '');
      nodo.style.left = (i / (PASSI.length - 1) * 100) + '%';
      nodo.setAttribute('aria-hidden', 'true');
      avanzamento.appendChild(nodo);
    });
    if (vista) $('tappa-nome').textContent = PASSI[vista.k].titolo;
  }

  // ---------- Elementi ricorrenti ----------
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
    return String(vista.k + 1).padStart(2, '0') + ' / ' + String(PASSI.length).padStart(2, '0') + (extra ? ' · ' + extra : '');
  }

  function corpo(intro, risposta, pieno) {
    return h('div', { class: 'schermata__corpo' + (pieno ? ' schermata__corpo--pieno' : '') },
      intro ? h('div', { class: 'colonna-intro' }, intro) : null,
      h('div', { class: 'colonna-risposta' }, risposta));
  }

  function navigazione() {
    return h('nav', { class: 'navigazione', 'aria-label': 'Navigazione tra i passi' },
      h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { passo(-1); } }, 'Indietro'),
      h('span', { class: 'meta', text: 'Passo ' + (vista.k + 1) + ' di ' + PASSI.length }),
      vista.k < PASSI.length - 1
        ? h('button', { type: 'button', class: 'pulsante navigazione__avanti', onclick: function () { passo(1); } }, 'Avanti')
        : null);
  }

  // ---------- Home ----------
  function disegnaHome() {
    const iniziato = !!stato.aggiornato;
    return h('div', { class: 'home' },
      h('a', { class: 'home__tutti', href: '../', text: 'Tutti i percorsi' }),
      h('h1', { text: 'Il tuo curriculum' }),
      h('p', { class: 'home__sottotitolo', text: 'Il foglio da consegnare a un\'azienda.' }),
      h('p', { class: 'home__testo misura', text: 'Scrivi i tuoi dati, la formazione, i tirocini e le competenze con parole tue. Alla fine scarichi il curriculum in Word o in PDF, oppure lo stampi. Se hai già compilato il bilancio di competenze o il diario di bordo su questo dispositivo, puoi prenderne nome, esperienze e competenze senza riscriverli.' }),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: function () { vai(ripresa ? ripresa.k : 0); } },
          iniziato && ripresa ? 'Riprendi da dove eri' : 'Inizia'),
        iniziato ? h('button', { type: 'button', class: 'pulsante pulsante--secondario', onclick: function () { vai(PASSI.length - 1); } }, 'Vai al curriculum') : null),
      h('p', { class: 'nota', text: 'Il curriculum contiene recapiti personali: resta su questo dispositivo e non viene inviato a nessuno. Per riprenderlo su un altro dispositivo scarica una copia da «Salva e stampa».' }),
      h('section', { class: 'home__indice', 'aria-labelledby': 'home-indice' },
        h('h2', { id: 'home-indice', class: 'meta', text: 'Sei passi · circa mezz\'ora' }),
        h('ol', null, PASSI.map(function (p, i) {
          return h('li', null,
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('span', { text: p.titolo }));
        }))));
  }

  // ---------- Dal bilancio di competenze (lettura soltanto) ----------
  function bilancioLocale() {
    try { return C.leggiBilancio(JSON.parse(localStorage.getItem(C.CHIAVE_BILANCIO) || 'null')); } catch (e) { return null; }
  }
  // Il file caricato ha la precedenza sul salvataggio di questo dispositivo.
  function bilancio() { return bilancioCaricato || bilancioLocale(); }

  function scegliFileBilancio() {
    const inp = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: function (e) {
      const f = e.target.files[0];
      inp.remove();
      if (!f) return;
      const lettore = new FileReader();
      lettore.onload = function () {
        let d;
        try { d = JSON.parse(lettore.result); } catch (x) { avvisa('Il file non è una copia valida del bilancio.'); return; }
        const letto = C.leggiBilancio(d);
        if (!letto) { avvisa('Il file non è una copia valida del bilancio.'); return; }
        bilancioCaricato = letto;
        ridisegna();
      };
      lettore.readAsText(f);
    } });
    document.body.appendChild(inp);
    inp.click();
  }

  // Il riquadro del primo passo: che cosa c'è nel bilancio e come prenderlo.
  function riquadroBilancio() {
    const b = bilancio();
    const carica = h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: scegliFileBilancio }, 'Carica la copia di un bilancio');
    if (!b) {
      return h('details', { class: 'esempio' },
        h('summary', { text: 'Hai compilato il bilancio di competenze?' }),
        h('div', { class: 'esempio__corpo' },
          h('p', { text: 'Se l\'hai compilato su questo dispositivo comparirà qui da solo. Se l\'hai scritto su un altro dispositivo scarica una copia dal bilancio e caricala qui. Il bilancio non viene modificato.' }),
          h('p', null, carica)));
    }
    const nomeNuovo = b.nome && b.nome !== (stato.profilo.nome || '').trim();
    const indirizzoNuovo = b.indirizzo && b.indirizzo !== stato.profilo.indirizzo;
    const prendi = function () {
      if (b.nome) stato.profilo.nome = b.nome;
      if (b.indirizzo) stato.profilo.indirizzo = b.indirizzo;
      modificato();
      ridisegna('f-cv-nome');
    };
    return aiuto(
      h('p', { class: 'meta', text: 'Dal tuo bilancio di competenze' }),
      h('p', { text: 'Ho trovato il tuo bilancio' + (b.nome ? ' («' + b.nome + '»)' : '') + '. Puoi prenderne il nome e l\'indirizzo; le esperienze e le competenze le trovi nei passi «Le esperienze di lavoro» e «Competenze, lingue e altro».' }),
      h('p', null,
        h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', disabled: !(nomeNuovo || indirizzoNuovo), onclick: function () {
          if (pieno(stato.profilo.nome) && nomeNuovo) chiedi('Sostituire il nome già scritto con quello del bilancio?', 'Sostituisci', prendi);
          else prendi();
        } }, nomeNuovo || indirizzoNuovo ? 'Prendi nome e indirizzo dal bilancio' : 'Nome e indirizzo già presi')),
      bilancioCaricato
        ? h('p', null, h('span', { class: 'meta', text: 'Bilancio caricato da file. ' }),
          h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { bilancioCaricato = null; ridisegna(); } }, 'Dimentica il file'))
        : h('p', null, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: scegliFileBilancio }, 'Carica la copia di un altro bilancio')));
  }

  // ---------- Diario di bordo del tirocinio ----------
  // Il diario è un sito a parte, sullo stesso indirizzo. Il bilancio e il curriculum ne importano i tirocini:
  // dal salvataggio dello stesso browser oppure da una copia del diario caricata da file (per esempio da un altro dispositivo).
  let diarioCaricato = null; // letto da file, resta in memoria e non viene salvato nel curriculum

  function proposteDalDiario() {
    try {
      const g = diarioCaricato || JSON.parse(localStorage.getItem('diario-tirocinio-v1') || 'null');
      return C.esperienzeDalDiario(g);
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



  // ---------- Il curriculum ----------
  const PROFILO_ESEMPI = {
    elettrico: '«Studente di Elettrico. Ho realizzato impianti civili in laboratorio e in tirocinio, con attenzione alla sicurezza. Cerco un\'azienda dove continuare a imparare. Preciso, affidabile, curioso.»',
    informatica: '«Studente di Informatica. In tirocinio ho configurato computer e stampanti di rete e scritto una procedura per gli utenti. Mi piace capire perché un sistema non funziona. Paziente, ordinato, curioso.»',
    estetica: '«Studentessa di Estetica. So accogliere la cliente e seguire un trattamento dalla preparazione della cabina al congedo, con cura dell\'igiene. Puntuale, empatica, precisa.»'
  };

  // Il testo del curriculum può avere parole in grassetto scritte tra due asterischi: **così**.
  function conGrassetto(testo) {
    return String(testo || '').split(/\*\*(.+?)\*\*/g).map(function (parte, i) {
      return i % 2 ? h('strong', { text: parte }) : parte;
    });
  }

  // Ridimensiona la foto nel browser (JPEG piccolo): non viene mai inviata altrove.
  function caricaFoto(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { avvisa('La foto è troppo grande: scegline una più piccola.'); return; }
    const fine = function (img) {
      const lato = 480;
      const k = Math.min(1, lato / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      stato.cv.foto = c.toDataURL('image/jpeg', 0.85);
      modificato();
      ridisegna('f-cv-foto');
    };
    const errore = function () { avvisa('Non riesco a leggere questa foto: prova con un\'altra.'); };
    if (window.createImageBitmap) {
      window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(fine, errore);
    } else {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); fine(img); };
      img.onerror = errore;
      img.src = url;
    }
  }

  function schermataCVContatti() {
    const c = stato.cv;
    const intro = [
      h('p', { text: 'Il curriculum è il foglio che consegni a un\'azienda o a un tutor. Qui scrivi i tuoi dati: servono solo per stamparlo.' }),
      aiuto('I dati del curriculum, foto compresa, restano su questo dispositivo: il sito non li invia a nessuno. Compila solo ciò che vuoi far comparire sul foglio.'),
      riquadroBilancio()
    ];
    const risposta = [
      campo({ id: 'f-cv-nome', etichetta: 'Nome e cognome', max: 80, autocomplete: 'name', valore: stato.profilo.nome, aggiorna: function (v) { stato.profilo.nome = v; } }),
      gruppoScelte({
        legenda: 'Quale indirizzo frequenti?', nome: 'indirizzo',
        opzioni: D.INDIRIZZI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: stato.profilo.indirizzo,
        aggiorna: function (id) { stato.profilo.indirizzo = id; modificato(); }
      }),
      campo({ id: 'f-cv-citta', etichetta: 'Indirizzo e città', max: 80, autocomplete: 'street-address', suggerimento: 'Per esempio: via Roma 1, Rozzano (MI).', valore: c.citta, aggiorna: function (v) { c.citta = v; } }),
      campo({ id: 'f-cv-telefono', etichetta: 'Telefono', tipo: 'tel', max: 40, autocomplete: 'tel', valore: c.telefono, aggiorna: function (v) { c.telefono = v; } }),
      campo({ id: 'f-cv-email', etichetta: 'Email', tipo: 'email', max: 120, autocomplete: 'email', suggerimento: 'Un indirizzo semplice, per esempio nome.cognome@…', valore: c.email, aggiorna: function (v) { c.email = v; } }),
      campo({ id: 'f-cv-nascita', etichetta: 'Data di nascita', max: 40, suggerimento: 'Come vuoi che compaia, per esempio 14/03/2009.', valore: c.nascita, aggiorna: function (v) { c.nascita = v; } }),
      campo({ id: 'f-cv-nazionalita', etichetta: 'Nazionalità', max: 60, valore: c.nazionalita, aggiorna: function (v) { c.nazionalita = v; } }),
      campo({ id: 'f-cv-patente', etichetta: 'Patente', max: 40, suggerimento: 'Per esempio AM, oppure «in corso».', valore: c.patente, aggiorna: function (v) { c.patente = v; } }),
      h('div', { class: 'campo' },
        h('label', { for: 'f-cv-foto', text: 'Foto' }),
        h('p', { class: 'campo__suggerimento', text: 'Una foto nitida, con sfondo semplice e un abbigliamento da colloquio. Resta su questo dispositivo.' }),
        c.foto ? h('img', { class: 'cv__anteprima-foto', src: c.foto, alt: 'La tua foto' }) : null,
        h('input', { type: 'file', id: 'f-cv-foto', accept: 'image/*', onchange: function (e) { caricaFoto(e.target.files[0]); e.target.value = ''; } }),
        c.foto ? h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { c.foto = ''; modificato(); ridisegna('f-cv-foto'); } }, 'Togli la foto')) : null)
    ];
    return [testa(metaSchermata(), 'I tuoi dati'), corpo(intro, risposta)];
  }

  function schermataCVProfilo() {
    const c = stato.cv;
    const intro = [
      h('p', { text: 'Chi legge il curriculum guarda prima di tutto qui: che lavoro cerchi e che persona sei.' }),
      aiuto('Nel profilo scrivi i tuoi obiettivi e al massimo tre qualità, con parole tue e senza aggettivi generici.'),
      esempio('Vedi un esempio di profilo', esempiPerIndirizzo(PROFILO_ESEMPI))
    ];
    const risposta = [
      campo({ id: 'f-cv-occupazione', etichetta: 'Occupazione desiderata', max: 120, suggerimento: 'Il lavoro che cerchi, in poche parole. Per esempio: Tecnico elettricista, Addetta ai trattamenti estetici.', valore: c.occupazione, aggiorna: function (v) { c.occupazione = v; } }),
      campo({ id: 'f-cv-profilo', etichetta: 'Profilo: obiettivi e qualità', area: true, righe: 5, max: C.MAX_PROFILO,
        suggerimento: 'Massimo ' + C.MAX_PROFILO + ' caratteri. Per mettere una parola in grassetto scrivila tra due asterischi: **così**.', valore: c.profilo, aggiorna: function (v) { c.profilo = v; } })
    ];
    return [testa(metaSchermata(), 'Che lavoro cerchi'), corpo(intro, risposta)];
  }

  function schermataCVFormazione() {
    const c = stato.cv;
    if (!c.formazione.length) c.formazione.push(C.formazioneVuota());
    const intro = [
      h('p', { text: 'Elenca i percorsi di studio e i corsi che hai fatto, dal più recente.' }),
      aiuto('Scrivi il nome del corso come lo conosci e dove lo stai frequentando. Se hai fatto corsi di sicurezza o altri attestati, aggiungili come voci separate.'),
      esempio('Vedi un esempio', h('dl', null,
        h('dt', { text: 'Periodo' }), h('dd', { text: '2023 – oggi' }),
        h('dt', { text: 'Titolo' }), h('dd', { text: 'Percorso di formazione professionale, indirizzo Elettrico' }),
        h('dt', { text: 'Dove' }), h('dd', { text: 'Il nome del tuo ente di formazione, con la città' }),
        h('dt', { text: 'Altro' }), h('dd', { text: '2024 · Corso sulla sicurezza nei luoghi di lavoro' })))
    ];
    const risposta = [
      h('ul', { class: 'schede', 'aria-label': 'La tua formazione' }, c.formazione.map(function (f, i) {
        const p = 'f-cv-fo-' + f.id + '-';
        return h('li', { class: 'scheda scheda--aperta' },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('h3', { class: 'scheda__titolo', text: pieno(f.titolo) ? f.titolo : 'Nuova voce' })),
          h('div', { class: 'scheda__modulo' },
            campo({ id: p + 'titolo', etichetta: 'Titolo o corso', max: 200, valore: f.titolo, aggiorna: function (v) { f.titolo = v; } }),
            campo({ id: p + 'ente', etichetta: 'Dove (ente e città)', max: 200, valore: f.ente, aggiorna: function (v) { f.ente = v; } }),
            campo({ id: p + 'periodo', etichetta: 'Periodo', max: 60, suggerimento: 'Per esempio 2023 – oggi.', valore: f.periodo, aggiorna: function (v) { f.periodo = v; } })),
          h('div', { class: 'scheda__azioni' },
            c.formazione.length > 1 ? h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina la voce ' + (i + 1),
              onclick: function () {
                c.formazione = c.formazione.filter(function (x) { return x.id !== f.id; });
                modificato(); ridisegna('aggiungi-formazione');
              } }, 'Elimina') : null));
      })),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario', id: 'aggiungi-formazione', disabled: c.formazione.length >= C.MAX_FORMAZIONE,
        onclick: function () {
          const f = C.formazioneVuota();
          c.formazione.push(f);
          modificato(); ridisegna('f-cv-fo-' + f.id + '-titolo');
        } }, 'Aggiungi un\'altra voce'))
    ];
    return [testa(metaSchermata(), 'La tua formazione'), corpo(intro, risposta)];
  }

  function schermataCVEsperienze() {
    const c = stato.cv;
    if (!c.lavoro.length) c.lavoro.push(C.lavoroVuoto('tirocinio'));
    const intro = [
      h('p', { text: 'Scrivi i tirocini, gli apprendistati e i lavori che hai fatto, dal più recente. Se ne hai fatti più di uno, aggiungili uno alla volta.' }),
      aiuto('Per ogni esperienza servono l\'azienda, il periodo, la tua mansione e i compiti che svolgevi. Per i compiti usa dei verbi («Cablare…», «Configurare…», «Accogliere…») e metti in grassetto le competenze scrivendole tra due asterischi: **così**.',
        'Se hai già raccontato l\'esperienza nel bilancio di competenze, puoi riprendere il testo da lì e poi accorciarlo.'),
      esempio('Vedi un esempio', h('dl', null,
        h('dt', { text: 'Tipo' }), h('dd', { text: 'Tirocinio' }),
        h('dt', { text: 'Azienda' }), h('dd', { text: 'Impianti Verdi, Milano' }),
        h('dt', { text: 'Periodo' }), h('dd', { text: 'marzo 2025 – maggio 2025' }),
        h('dt', { text: 'Mansione' }), h('dd', { text: 'Aiuto elettricista' }),
        h('dt', { text: 'Compiti' }), h('dd', { text: 'Cablare il quadro elettrico di una palazzina, collaudare i circuiti, tenere in ordine il posto di lavoro.' })))
    ];
    const dalBilancio = bilancio();
    const conAzione = dalBilancio ? dalBilancio.esperienze : [];
    intro.push(riquadroDiario({
      intro: 'Puoi aggiungere al curriculum i tirocini del diario, uno alla volta: azienda, città, periodo e i compiti presi dalle tue settimane. La mansione nel diario non c\'è: scrivila tu. Poi accorcia i compiti.',
      nome: function (pr) { return pr.titolo.replace(/^Tirocinio presso /, ''); },
      pulsante: function (pr) { return 'Aggiungi al curriculum: ' + pr.titolo.replace(/^Tirocinio presso /, ''); },
      // Lo stesso tirocinio è la stessa azienda con lo stesso inizio: due tirocini nella stessa azienda in anni diversi sono due voci.
      gia: function (pr) { return c.lavoro.length >= C.MAX_LAVORO || c.lavoro.some(function (x) { return pieno(x.azienda) && pieno(pr.azienda) && x.azienda.trim() === pr.azienda && (x.dal || '') === (pr.dalMese || ''); }); },
      crea: function (pr) {
        const l = C.lavoroVuoto('tirocinio');
        l.azienda = pr.azienda; l.citta = pr.citta; l.dal = pr.dalMese; l.al = pr.alMese; l.compiti = pr.compiti;
        const soloVuota = c.lavoro.length === 1 && !pieno(c.lavoro[0].azienda) && !pieno(c.lavoro[0].mansione) && !pieno(c.lavoro[0].compiti);
        if (soloVuota) c.lavoro = [l]; else c.lavoro.push(l);
        modificato();
        ridisegna('f-cv-la-' + l.id + '-mansione');
      }
    }));
    const risposta = [
      h('ul', { class: 'schede', 'aria-label': 'Le tue esperienze di lavoro' }, c.lavoro.map(function (l, i) {
        const p = 'f-cv-la-' + l.id + '-';
        return h('li', { class: 'scheda scheda--aperta' },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('h3', { class: 'scheda__titolo', text: pieno(l.azienda) ? l.azienda : 'Nuova esperienza' })),
          h('div', { class: 'scheda__modulo' },
            gruppoScelte({ legenda: 'Che tipo di esperienza è?', nome: p + 'tipo', riga: true, opzioni: D.CV_TIPI_LAVORO, valore: l.tipo,
              aggiorna: function (id) { l.tipo = id; modificato(); } }),
            campo({ id: p + 'azienda', etichetta: 'Nome dell\'azienda', max: 200, valore: l.azienda, aggiorna: function (v) { l.azienda = v; } }),
            campo({ id: p + 'citta', etichetta: 'Città e Paese', max: 80, suggerimento: 'Per esempio Milano, Italia.', valore: l.citta, aggiorna: function (v) { l.citta = v; } }),
            h('div', { class: 'coppia' },
              campo({ id: p + 'dal', etichetta: 'Dal', tipo: 'month', max: 40, valore: l.dal, aggiorna: function (v) { l.dal = v; } }),
              l.inCorso ? null : campo({ id: p + 'al', etichetta: 'Al', tipo: 'month', max: 40, valore: l.al, aggiorna: function (v) { l.al = v; } })),
            casella({ id: p + 'incorso', testo: 'È ancora in corso', valore: l.inCorso,
              aggiorna: function (v) { l.inCorso = v; modificato(); ridisegna(p + 'incorso'); } }),
            campo({ id: p + 'mansione', etichetta: 'Mansione', max: 200, suggerimento: 'Il tuo ruolo, per esempio Aiuto elettricista.', valore: l.mansione, aggiorna: function (v) { l.mansione = v; } }),
            campo({ id: p + 'compiti', etichetta: 'Compiti svolti', area: true, righe: 4, suggerimento: 'Verbi all\'infinito o al passato. Competenze in grassetto: **così**.', valore: l.compiti, aggiorna: function (v) { l.compiti = v; } }),
            conAzione.length ? h('div', { class: 'campo' },
              h('label', { for: p + 'riprendi', text: 'Riprendi il testo da una tua esperienza del bilancio' }),
              h('select', { id: p + 'riprendi', onchange: function (e) {
                const sc = conAzione.find(function (x) { return x.id === e.target.value; });
                e.target.value = '';
                if (!sc) return;
                const applica = function () {
                  l.compiti = sc.azione.trim();
                  if (!pieno(l.mansione) && pieno(sc.titolo)) l.mansione = sc.titolo.trim();
                  modificato(); ridisegna(p + 'compiti');
                };
                if (pieno(l.compiti)) chiedi('Sostituire i compiti già scritti con il testo della scheda del bilancio?', 'Sostituisci', applica);
                else applica();
              } },
                h('option', { value: '', text: 'Scegli una scheda…' }),
                conAzione.map(function (x) { return h('option', { value: x.id, text: pieno(x.titolo) ? x.titolo : 'Esperienza senza titolo' }); }))) : null),
          h('div', { class: 'scheda__azioni' },
            c.lavoro.length > 1 ? h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina l\'esperienza ' + (i + 1),
              onclick: function () {
                chiedi('Eliminare questa esperienza dal curriculum?', 'Elimina', function () {
                  c.lavoro = c.lavoro.filter(function (x) { return x.id !== l.id; });
                  modificato(); ridisegna('aggiungi-lavoro');
                });
              } }, 'Elimina') : null));
      })),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario', id: 'aggiungi-lavoro', disabled: c.lavoro.length >= C.MAX_LAVORO,
        onclick: function () {
          const l = C.lavoroVuoto('tirocinio');
          c.lavoro.push(l);
          modificato(); ridisegna('f-cv-la-' + l.id + '-azienda');
        } }, 'Aggiungi un\'altra esperienza')),
      h('p', { class: 'nota', text: 'Nel curriculum compaiono dalla più recente alla più vecchia, se per ogni esperienza hai scelto le date dal calendario. Una voce senza azienda né mansione viene ignorata.' })
    ];
    return [testa(metaSchermata(), 'Le esperienze di lavoro'), corpo(intro, risposta)];
  }

  // ----- Lingue: si sceglie tra frasi in italiano semplice, mai tra i codici europei -----
  function selezioneLivello(o) {
    return h('div', { class: 'campo' },
      h('label', { for: o.id, text: o.etichetta }),
      h('select', { id: o.id, onchange: function (e) { o.aggiorna(e.target.value); } },
        h('option', { value: '', text: 'Scegli…' }),
        D.LINGUA_LIVELLI.map(function (x) { return h('option', { value: x.id, text: x.scelta, selected: o.valore === x.id }); })));
  }

  function sezioneLingue() {
    const c = stato.cv;
    if (!c.lingueElenco.length) c.lingueElenco.push(C.linguaVuota());
    return h('div', { class: 'lingue' },
      h('h3', { class: 'lingue__titolo', text: 'Lingue' }),
      h('ul', { class: 'schede', 'aria-label': 'Le tue lingue' }, c.lingueElenco.map(function (g, i) {
        const p = 'f-cv-lg-' + g.id + '-';
        const valori = D.LINGUA_ABILITA.map(function (a) { return g.livelli[a.id]; });
        const tuttiUguali = valori[0] && valori.every(function (v) { return v === valori[0]; });
        const diversi = valori.filter(Boolean).length > 0 && !tuttiUguali;
        return h('li', { class: 'scheda scheda--aperta' },
          h('div', { class: 'scheda__testa' },
            h('span', { class: 'meta', text: String(i + 1).padStart(2, '0') }),
            h('h4', { class: 'scheda__titolo', text: pieno(g.nome) ? g.nome : 'Nuova lingua' })),
          h('div', { class: 'scheda__modulo' },
            campo({ id: p + 'nome', etichetta: 'Lingua', max: 60, suggerimento: i === 0 ? 'Per esempio Italiano, Inglese, Spagnolo, Arabo.' : null, valore: g.nome, aggiorna: function (v) { g.nome = v; } }),
            casella({ id: p + 'madre', testo: 'È la mia lingua madre', valore: g.madre,
              aggiorna: function (v) { g.madre = v; modificato(); ridisegna(p + 'madre'); } }),
            g.madre ? null : [
              selezioneLivello({ id: p + 'generale', etichetta: 'Come te la cavi con questa lingua?', valore: tuttiUguali ? valori[0] : '',
                aggiorna: function (v) {
                  D.LINGUA_ABILITA.forEach(function (a) { g.livelli[a.id] = v; });
                  modificato(); ridisegna(p + 'generale');
                } }),
              h('details', { class: 'dettagli', open: diversi },
                h('summary', { text: 'Scegli abilità per abilità' }),
                h('div', { class: 'dettagli__corpo' }, D.LINGUA_ABILITA.map(function (a) {
                  return selezioneLivello({ id: p + a.id, etichetta: a.domanda, valore: g.livelli[a.id],
                    aggiorna: function (v) { g.livelli[a.id] = v; modificato(); } });
                })))]),
          h('div', { class: 'scheda__azioni' },
            c.lingueElenco.length > 1 ? h('button', { type: 'button', class: 'pulsante pulsante--testo', 'aria-label': 'Elimina la lingua ' + (pieno(g.nome) ? g.nome : i + 1),
              onclick: function () {
                c.lingueElenco = c.lingueElenco.filter(function (x) { return x.id !== g.id; });
                modificato(); ridisegna('aggiungi-lingua');
              } }, 'Elimina') : null));
      })),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario', id: 'aggiungi-lingua', disabled: c.lingueElenco.length >= C.MAX_LINGUE,
        onclick: function () {
          const g = C.linguaVuota();
          c.lingueElenco.push(g);
          modificato(); ridisegna('f-cv-lg-' + g.id + '-nome');
        } }, 'Aggiungi un\'altra lingua')));
  }

  function schermataCVCompetenze() {
    const c = stato.cv;
    const intro = [
      h('p', { text: 'Una riga per ogni voce. Evita gli aggettivi generici: meglio quello che sai fare davvero.' }),
      aiuto('«Proponi dalle mie risposte» aggiunge una frase per ogni situazione che hai dichiarato di saper fare e documentato con un esempio nel bilancio di competenze. Poi correggi come vuoi.'),
      esempio('Vedi un esempio', h('dl', null,
        h('dt', { text: 'Lingue' }), h('dd', { text: 'Italiano: madrelingua · Inglese: intermedio' }),
        h('dt', { text: 'Digitali' }), h('dd', { text: 'Word buono, Excel base, programmi del mio settore' }),
        h('dt', { text: 'Interessi' }), h('dd', { text: 'Squadra di calcio dal 2019 · Volontariato in oratorio' })))
    ];
    const risposta = [
      campo({ id: 'f-cv-competenze', etichetta: 'Competenze professionali', area: true, righe: 5, suggerimento: 'Una per riga.', valore: c.competenze, aggiorna: function (v) { c.competenze = v; } }),
      h('div', null, h('button', { type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo', onclick: function () {
        const b = bilancio();
        if (!b) { avvisa('Non trovo il bilancio di competenze su questo dispositivo. Nel primo passo («I tuoi dati») puoi caricarne una copia; oppure scrivi tu le competenze qui sotto.'); return; }
        const sug = b.competenze;
        if (!sug.length) { avvisa('Nel bilancio non ci sono ancora competenze dichiarate e documentate con un esempio. Scrivile tu qui sotto.'); return; }
        const gia = c.competenze.split('\n').map(function (x) { return x.trim(); });
        const nuove = sug.filter(function (x) { return gia.indexOf(x) === -1; });
        if (nuove.length) c.competenze = (pieno(c.competenze) ? c.competenze.replace(/\s+$/, '') + '\n' : '') + nuove.join('\n');
        modificato(); ridisegna('f-cv-competenze');
      } }, 'Proponi dalle mie risposte')),
      sezioneLingue(),
      campo({ id: 'f-cv-digitali', etichetta: 'Software e capacità digitali', area: true, righe: 3, suggerimento: 'Per esempio: Word buono, Excel base, programmi usati in azienda.', valore: c.digitali, aggiorna: function (v) { c.digitali = v; } }),
      campo({ id: 'f-cv-altro', etichetta: 'Interessi', area: true, righe: 3, suggerimento: 'Interessi e competenze maturate fuori da scuola: passioni, progetti, associazioni, volontariato.', valore: c.altro, aggiorna: function (v) { c.altro = v; } }),
      casella({ id: 'f-cv-consenso', testo: 'Aggiungi in fondo la frase sul trattamento dei dati personali', valore: c.consenso,
        aggiorna: function (v) { c.consenso = v; modificato(); } })
    ];
    return [testa(metaSchermata(), 'Competenze, lingue e altro'), corpo(intro, risposta)];
  }

  // ----- Documento e aspetto -----
  const FRASE_CONSENSO = 'Autorizzo il trattamento dei dati personali contenuti nel mio curriculum vitae in base all\'art. 13 del D. Lgs. 196/2003 e all\'art. 13 del Regolamento UE 2016/679 relativo alla protezione delle persone fisiche con riguardo al trattamento dei dati personali.';

  // Ogni sezione ha un titolo per ciascuna impaginazione; l'ordine delle sezioni lo decide il CSS.
  function cvSezione(chiave, titoloOriginale, titoloModello, contenuto) {
    return h('section', { class: 'cv__parte cv__parte--' + chiave },
      h('h3', null, h('span', { class: 't-orig', text: titoloOriginale }), h('span', { class: 't-mod', text: titoloModello })),
      contenuto);
  }

  function luogoFirma(v) { return pieno(v) ? v.trim() + ', ' : ''; }

  function dataOggi() {
    return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Applica colore, carattere, dimensione e firma a un documento già costruito:
  // non lo ricostruisce, così le correzioni scritte a mano nell'anteprima restano.
  function applicaAspetto(el) {
    const f = stato.cv.formato;
    const col = D.CV_COLORI.find(function (x) { return x.id === f.colore; }) || D.CV_COLORI[0];
    const dim = D.CV_DIMENSIONI.find(function (x) { return x.id === f.dimensione; }) || D.CV_DIMENSIONI[1];
    el.style.setProperty('--cv-colore', col.hex);
    // Nell'impaginazione originale i titoli restano grigi finché il colore è il nero.
    el.style.setProperty('--cv-titoli', (f.impaginazione === 'originale' && f.colore === 'nero') ? '#666666' : col.hex);
    D.CV_IMPAGINAZIONI.forEach(function (x) { el.classList.toggle('cv--impag-' + x.id, x.id === f.impaginazione); });
    el.style.setProperty('--cv-s', String(dim.scala));
    D.CV_CARATTERI.forEach(function (x) { el.classList.toggle('cv--' + x.id, x.id === f.carattere); });
    el.classList.toggle('cv--senza-firma', !f.firma);
    const luogo = el.querySelector('.cv__firma-luogo');
    if (luogo) luogo.textContent = luogoFirma(f.luogo);
  }

  // Formato Europass: struttura propria (intestazione anagrafica, date a sinistra, tabella delle lingue).
  function euSezione(titolo, contenuto) {
    return h('section', { class: 'cv__parte' }, h('h3', { text: titolo }), contenuto);
  }

  function cvEuropass(d) {
    const elenco = function (righe) { return h('ul', { class: 'cv__elenco' }, righe.map(function (r) { return h('li', null, conGrassetto(r)); })); };
    const recapiti = d.contatti.filter(function (x) { return ['Indirizzo', 'Telefono', 'Email'].indexOf(x.etichetta) !== -1; });
    const anagrafica = [d.nascita ? 'Data di nascita: ' + d.nascita : '', d.nazionalita ? 'Nazionalità: ' + d.nazionalita : ''].filter(Boolean);
    const ABILITA = ['Ascolto', 'Lettura', 'Interazione', 'Produzione orale', 'Produzione scritta'];
    const lin = d.lingueEu;
    let lingue = null;
    if (lin.madre.length || lin.altre.length) {
      lingue = h('div', null,
        lin.madre.length ? h('p', { class: 'eu-madre' }, h('strong', { text: 'Lingua madre: ' }), lin.madre.join(', ')) : null,
        lin.altre.length ? h('div', { class: 'eu-lingue-scroll' }, h('table', { class: 'eu-lingue' },
          h('thead', null,
            h('tr', null, h('th', { rowspan: '2', text: 'Altre lingue' }), h('th', { colspan: '2', text: 'Comprensione' }), h('th', { colspan: '2', text: 'Parlato' }), h('th', { text: 'Scritto' })),
            h('tr', null, ABILITA.map(function (a) { return h('th', { class: 'eu-abilita', text: a }); }))),
          h('tbody', null, lin.altre.map(function (l) {
            return h('tr', null, h('th', { scope: 'row', text: l.lingua }),
              l.livelli
                ? l.livelli.map(function (x) { return h('td', { text: x || '–' }); })
                : h('td', { colspan: '5', class: 'eu-testo', text: l.testo || '' }));
          })))) : null,
        lin.altre.some(function (l) { return l.livelli; })
          ? h('p', { class: 'eu-nota', text: 'Livelli: A1 e A2: utente base · B1 e B2: utente autonomo · C1 e C2: utente avanzato. Quadro comune europeo di riferimento per la conoscenza delle lingue.' }) : null);
    }
    const art = h('article', { class: 'cv', 'aria-label': 'Il tuo curriculum' },
      h('img', { class: 'eu-logo', src: '../img/europass-logo.png', alt: 'Europass', contenteditable: 'false' }),
      h('header', { class: 'cv__testa' },
        d.foto ? h('img', { class: 'cv__foto', src: d.foto, alt: '', contenteditable: 'false' }) : null,
        h('div', { class: 'cv__intestazione' },
          h('p', { class: 'cv__nome', text: d.nome || 'Il tuo nome' }),
          recapiti.length ? h('ul', { class: 'cv__contatti' }, recapiti.map(function (x) {
            return h('li', null, h('span', { class: 'meta', text: x.etichetta + ':' }), ' ' + x.valore);
          })) : null,
          anagrafica.length ? h('p', { class: 'eu-anagrafica', text: anagrafica.join('  |  ') }) : null)),
      d.occupazione ? euSezione('Occupazione desiderata', h('p', { class: 'cv__titolo', text: d.occupazione })) : null,
      d.profilo ? euSezione('Profilo', h('p', { class: 'cv__profilo' }, conGrassetto(d.profilo))) : null,
      d.esperienze.length ? euSezione('Esperienza lavorativa', h('div', null, d.esperienze.map(function (e) {
        return h('div', { class: 'cv__riga' },
          h('span', { class: 'cv__periodo', text: e.periodo }),
          h('div', null,
            h('p', { class: 'cv__titolo', text: e.titolo }),
            [e.dove, e.tipo].filter(Boolean).length ? h('p', { class: 'cv__sotto', text: [e.dove, e.tipo].filter(Boolean).join(' · ') }) : null,
            e.descrizione ? h('p', { class: 'cv__testo' }, conGrassetto(e.descrizione)) : null));
      }))) : null,
      d.formazione.length ? euSezione('Istruzione e formazione', h('div', null, d.formazione.map(function (f) {
        return h('div', { class: 'cv__riga' },
          h('span', { class: 'cv__periodo', text: f.periodo }),
          h('div', null, h('p', { class: 'cv__titolo', text: f.titolo }), f.ente ? h('p', { class: 'cv__sotto', text: f.ente }) : null));
      }))) : null,
      lingue ? euSezione('Competenze linguistiche', lingue) : null,
      d.competenze.length ? euSezione('Competenze professionali', elenco(d.competenze)) : null,
      d.digitali.length ? euSezione('Competenze digitali', elenco(d.digitali)) : null,
      d.patente ? euSezione('Patente di guida', h('p', { text: d.patente })) : null,
      d.altro.length ? euSezione('Informazioni aggiuntive', elenco(d.altro)) : null,
      d.consenso ? h('p', { class: 'cv__consenso', text: FRASE_CONSENSO }) : null,
      h('p', { class: 'cv__firma' }, h('span', { class: 'cv__firma-luogo' }), dataOggi() + '   Firma ', h('span', { class: 'cv__firma-riga' })));
    applicaAspetto(art);
    return art;
  }

  function cvDocumento() {
    const d = C.componiCV(stato);
    if (stato.cv.formato.impaginazione === 'europass') return cvEuropass(d);
    const elenco = function (righe) { return h('ul', { class: 'cv__elenco' }, righe.map(function (r) { return h('li', null, conGrassetto(r)); })); };
    const art = h('article', { class: 'cv', 'aria-label': 'Il tuo curriculum' },
      h('header', { class: 'cv__testa' },
        d.foto ? h('img', { class: 'cv__foto', src: d.foto, alt: '', contenteditable: 'false' }) : null,
        h('div', { class: 'cv__intestazione' },
          h('p', { class: 'cv__nome', text: d.nome || 'Il tuo nome' }),
          d.occupazione ? h('p', { class: 'cv__occupazione', text: d.occupazione }) : null,
          d.contatti.length ? h('ul', { class: 'cv__contatti' }, d.contatti.map(function (x) {
            return h('li', null, h('span', { class: 'meta', text: x.etichetta }), ' ' + x.valore);
          })) : null)),
      d.profilo ? cvSezione('profilo', 'Profilo', 'Profilo', h('p', { class: 'cv__profilo' }, conGrassetto(d.profilo))) : null,
      d.esperienze.length ? cvSezione('esperienze', 'Esperienze', 'Esperienze professionali', h('div', null, d.esperienze.map(function (e) {
        return h('div', { class: 'cv__riga' },
          h('span', { class: 'cv__periodo', text: e.periodo }),
          h('div', null,
            h('p', { class: 'cv__titolo', text: e.titolo }),
            [e.dove, e.tipo].filter(Boolean).length ? h('p', { class: 'cv__sotto', text: [e.dove, e.tipo].filter(Boolean).join(' · ') }) : null,
            e.descrizione ? h('p', { class: 'cv__testo' }, conGrassetto(e.descrizione)) : null));
      }))) : null,
      d.formazione.length ? cvSezione('formazione', 'Istruzione e formazione', 'Istruzione e formazione', h('div', null, d.formazione.map(function (f) {
        return h('div', { class: 'cv__riga' },
          h('span', { class: 'cv__periodo', text: f.periodo }),
          h('div', null, h('p', { class: 'cv__titolo', text: f.titolo }), f.ente ? h('p', { class: 'cv__sotto', text: f.ente }) : null));
      }))) : null,
      d.competenze.length ? cvSezione('competenze', 'Competenze professionali', 'Competenze professionali', elenco(d.competenze)) : null,
      d.lingue.length ? cvSezione('lingue', 'Lingue', 'Lingue', elenco(d.lingue)) : null,
      d.digitali.length ? cvSezione('digitali', 'Competenze digitali', 'Software e capacità digitali', elenco(d.digitali)) : null,
      d.altro.length ? cvSezione('altro', 'Altre informazioni', 'Interessi', elenco(d.altro)) : null,
      d.consenso ? h('p', { class: 'cv__consenso', text: FRASE_CONSENSO }) : null,
      h('p', { class: 'cv__firma' }, h('span', { class: 'cv__firma-luogo' }), dataOggi() + '   Firma ', h('span', { class: 'cv__firma-riga' })));
    applicaAspetto(art);
    return art;
  }

  // Le correzioni scritte a mano nell'anteprima valgono finché i dati non cambiano.
  let cvManuale = null;
  let cvManualeVersione = -1;

  function cvPerLaStampa() {
    const base = (cvManuale && cvManualeVersione === cvVersione) ? cvManuale.cloneNode(true) : cvDocumento();
    base.removeAttribute('contenteditable');
    base.classList.remove('cv--modificabile');
    applicaAspetto(base);
    return base;
  }

  function pannelloAspetto(doc) {
    const f = stato.cv.formato;
    const cambia = function (chiave, valore) {
      f[chiave] = valore;
      // Europass nasce nel suo blu: se il colore era ancora il nero predefinito lo si cambia (resta modificabile).
      if (chiave === 'impaginazione' && valore === 'europass' && f.colore === 'nero') f.colore = 'europass';
      modificato({ aspetto: true });
      // Europass ha una struttura diversa dagli altri modelli: il foglio si ricostruisce e le correzioni a mano decadono.
      if (chiave === 'impaginazione' && (valore === 'europass') !== (doc.classList.contains('cv--impag-europass'))) {
        cvManuale = null;
        ridisegna('cv-impaginazione-' + valore);
        return;
      }
      applicaAspetto(doc);
      if (cvManuale) applicaAspetto(cvManuale);
    };
    return h('section', { class: 'aspetto', 'aria-labelledby': 'aspetto-titolo' },
      h('h3', { id: 'aspetto-titolo', class: 'meta', text: 'Aspetto del curriculum' }),
      gruppoScelte({ legenda: 'Modello', nome: 'cv-impaginazione', riga: false, opzioni: D.CV_IMPAGINAZIONI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: f.impaginazione, aggiorna: function (id) { cambia('impaginazione', id); } }),
      h('fieldset', { class: 'campo' },
        h('legend', { text: 'Colore dei titoli' }),
        h('div', { class: 'colori' }, D.CV_COLORI.map(function (c) {
          return h('label', { class: 'colore', for: 'cv-colore-' + c.id },
            h('input', { type: 'radio', name: 'cv-colore', id: 'cv-colore-' + c.id, value: c.id, checked: f.colore === c.id,
              onchange: function () { cambia('colore', c.id); } }),
            h('span', { style: 'background:' + c.hex, 'aria-hidden': 'true' }),
            h('span', { class: 'visivamente-nascosto', text: c.nome }));
        }))),
      gruppoScelte({ legenda: 'Carattere', nome: 'cv-carattere', riga: true, opzioni: D.CV_CARATTERI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: f.carattere, aggiorna: function (id) { cambia('carattere', id); } }),
      gruppoScelte({ legenda: 'Dimensione del testo', nome: 'cv-dimensione', riga: true, opzioni: D.CV_DIMENSIONI.map(function (x) { return { id: x.id, testo: x.nome }; }),
        valore: f.dimensione, aggiorna: function (id) { cambia('dimensione', id); } }),
      casella({ id: 'cv-firma', testo: 'Aggiungi data e riga per la firma', valore: f.firma, aggiorna: function (v) { cambia('firma', v); } }),
      campo({ id: 'cv-luogo', etichetta: 'Luogo (per la firma)', max: 80, suggerimento: 'Per esempio Milano. Appare prima della data di oggi.', valore: f.luogo, aggiorna: function (v) { f.luogo = v; modificato({ aspetto: true }); applicaAspetto(doc); if (cvManuale) applicaAspetto(cvManuale); } }));
  }

  function schermataCVAnteprima() {
    const d = C.componiCV(stato);
    const riuso = cvManuale && cvManualeVersione === cvVersione;
    const doc = riuso ? cvManuale.cloneNode(true) : cvDocumento();
    doc.setAttribute('contenteditable', 'true');
    doc.setAttribute('spellcheck', 'true');
    doc.setAttribute('role', 'textbox');
    doc.setAttribute('aria-multiline', 'true');
    doc.setAttribute('aria-label', 'Il tuo curriculum: puoi correggere il testo');
    doc.classList.add('cv--modificabile');
    applicaAspetto(doc);
    const salva = function () { cvManuale = doc.cloneNode(true); cvManualeVersione = cvVersione; };
    doc.addEventListener('input', salva);
    // Incolla solo testo semplice: niente formattazioni che rovinano la pagina.
    doc.addEventListener('paste', function (e) {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, t);
    });
    const risposta = [
      d.mancanti.length
        ? h('p', { class: 'avviso' }, 'Per un curriculum completo manca ancora: ' + d.mancanti.join(', ') + '.')
        : h('p', { class: 'nota', text: 'Il curriculum ha le informazioni essenziali. Rileggilo prima di stamparlo.' }),
      aiuto('Clicca sul foglio per correggere una parola o una riga direttamente nel curriculum. Queste correzioni valgono solo per la stampa e restano finché non cambi i dati: per modifiche definitive usa «Modifica i dati».'),
      pannelloAspetto(doc),
      h('div', { class: 'home__azioni' },
        h('button', { type: 'button', class: 'pulsante', onclick: scaricaWord }, 'Scarica in Word'),
        h('button', { type: 'button', class: 'pulsante', onclick: scaricaPdf }, 'Scarica in PDF'),
        h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () { vai(0); } }, 'Modifica i dati'),
        riuso ? h('button', { type: 'button', class: 'pulsante pulsante--testo', onclick: function () {
          chiedi('Annullare le correzioni scritte a mano sul foglio?', 'Annulla le correzioni', function () { cvManuale = null; ridisegna(); }, 'Tieni le correzioni');
        } }, 'Annulla le correzioni sul foglio') : null),
      h('p', { class: 'nota', text: 'Il curriculum resta su questo dispositivo e non viene inviato al docente.' }),
      doc
    ];
    return [testa(metaSchermata(), 'Il tuo curriculum'), corpo(null, risposta, true)];
  }



  // ---------- Disegno ----------
  function schermataCorrente() {
    return {
      contatti: schermataCVContatti, profilo: schermataCVProfilo, formazione: schermataCVFormazione,
      esperienze: schermataCVEsperienze, competenze: schermataCVCompetenze, anteprima: schermataCVAnteprima
    }[PASSI[vista.k].id]();
  }

  function disegna() {
    principale.textContent = '';
    if (!vista) {
      aggiungi(principale, disegnaHome());
    } else {
      aggiungi(principale, h('div', { class: 'lavoro' },
        h('nav', { class: 'rail', 'aria-label': 'Passi del curriculum' }, h('ol', { id: 'rail-elenco' })),
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
    return 'curriculum' + (nome ? '-' + nome : '') + '-' + oggi + '.json';
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

  // ---------- Curriculum in Word e in PDF ----------
  // ---------- Curriculum in Word e in PDF ----------
  // I tratti di testo di un elemento, con il grassetto di <strong> (le parole fra due asterischi).
  function trattiDa(nodo) {
    const out = [];
    (function visita(n, grassetto) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3) { if (c.textContent) out.push({ t: c.textContent, b: grassetto }); }
        else if (c.nodeType === 1) {
          if (c.tagName === 'BR') out.push({ t: '\n', b: false });
          else visita(c, grassetto || c.tagName === 'STRONG' || c.tagName === 'B');
        }
      });
    })(nodo, false);
    return out;
  }

  const ORDINE_CV = {
    originale: { profilo: 1, formazione: 2, esperienze: 3, competenze: 4, lingue: 5, digitali: 6, altro: 7 },
    modello: { profilo: 1, esperienze: 2, formazione: 3, competenze: 4, lingue: 5, digitali: 6, altro: 7 }
  };

  // Legge il curriculum così com'è sul foglio (comprese le correzioni a mano) e lo descrive per il file Word.
  function modelloDaDocumento(el) {
    const cls = el.classList;
    const layout = cls.contains('cv--impag-europass') ? 'europass' : cls.contains('cv--impag-modello') ? 'modello' : 'originale';
    const eu = layout === 'europass';
    const foto = el.querySelector('.cv__foto');
    const testoDi = function (sel, radice) { const x = (radice || el).querySelector(sel); return x ? x.textContent.trim() : ''; };
    const m = {
      layout: layout,
      carattere: cls.contains('cv--classico') ? 'classico' : cls.contains('cv--semplice') ? 'semplice' : 'moderno',
      scala: parseFloat(el.style.getPropertyValue('--cv-s')) || 1,
      colore: el.style.getPropertyValue('--cv-colore').trim(),
      titoli: el.style.getPropertyValue('--cv-titoli').trim(),
      logo: null,
      foto: foto ? bytesDaDataUrl(foto.getAttribute('src')) : null,
      nome: testoDi('.cv__nome'),
      occupazione: testoDi('.cv__occupazione'),
      anagrafica: testoDi('.eu-anagrafica'),
      contatti: Array.prototype.map.call(el.querySelectorAll('.cv__contatti li'), function (li) {
        const et = li.querySelector('.meta');
        const e = et ? et.textContent.trim() : '';
        return { etichetta: e.replace(/:$/, ''), valore: li.textContent.replace(et ? et.textContent : '', '').trim() };
      }),
      sezioni: [],
      consenso: testoDi('.cv__consenso'),
      firma: cls.contains('cv--senza-firma') ? null : (testoDi('.cv__firma') ? testoDi('.cv__firma') + ' ' : null)
    };
    let parti = Array.prototype.slice.call(el.querySelectorAll(':scope > .cv__parte'));
    if (!eu) {
      const chiave = function (p) { return (p.className.match(/cv__parte--(\w+)/) || [])[1]; };
      parti = parti.sort(function (a, b) { return (ORDINE_CV[layout][chiave(a)] || 9) - (ORDINE_CV[layout][chiave(b)] || 9); });
    }
    parti.forEach(function (p) {
      const h3 = p.querySelector('h3');
      const spanTitolo = !eu && h3 ? h3.querySelector(layout === 'modello' ? '.t-mod' : '.t-orig') : null;
      const sez = { titolo: (spanTitolo || h3 || p).textContent.trim(), blocchi: [] };
      (function visita(n) {
        Array.prototype.forEach.call(n.children, function (c) {
          if (c === h3) return;
          if (c.classList.contains('cv__riga')) {
            const dx = c.children[1];
            const testo = dx ? dx.querySelector('.cv__testo') : null;
            sez.blocchi.push({ t: 'riga', periodo: testoDi('.cv__periodo', c),
              titolo: dx ? testoDi('.cv__titolo', dx) : '', sotto: dx ? testoDi('.cv__sotto', dx) : '', runs: testo ? trattiDa(testo) : [] });
          } else if (c.classList.contains('cv__profilo')) {
            sez.blocchi.push({ t: 'par', runs: trattiDa(c), stretto: true }); // il profilo ha una larghezza massima (68 caratteri)
          } else if (c.classList.contains('cv__elenco')) {
            Array.prototype.forEach.call(c.children, function (li) { sez.blocchi.push({ t: 'voce', runs: trattiDa(li) }); });
          } else if (c.classList.contains('eu-madre')) {
            const forte = c.querySelector('strong');
            const et = forte ? forte.textContent.trim() : '';
            sez.blocchi.push({ t: 'madre', etichetta: et, valore: c.textContent.replace(forte ? forte.textContent : '', '').trim() });
          } else if (c.classList.contains('eu-nota')) {
            sez.blocchi.push({ t: 'nota', testo: c.textContent.trim() });
          } else if (c.tagName === 'TABLE') {
            sez.blocchi.push({ t: 'lingue', righe: Array.prototype.map.call(c.querySelectorAll('tbody tr'), function (tr) {
              const td = tr.querySelectorAll('td');
              const lungo = td.length === 1;
              return { lingua: tr.querySelector('th').textContent.trim(),
                livelli: lungo ? null : Array.prototype.map.call(td, function (x) { return x.textContent.trim() === '–' ? '' : x.textContent.trim(); }),
                testo: lungo ? td[0].textContent.trim() : '' };
            }) });
          } else if (c.tagName === 'P') {
            sez.blocchi.push({ t: 'par', runs: trattiDa(c), grassetto: c.classList.contains('cv__titolo') });
          } else {
            visita(c);
          }
        });
      })(p);
      m.sezioni.push(sez);
    });
    return m;
  }

  function bytesDaDataUrl(u) {
    const r = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+\/=]+)$/.exec(u || '');
    if (!r) return null;
    const bin = atob(r[2]);
    const dati = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) dati[i] = bin.charCodeAt(i);
    return { dati: dati, est: r[1] === 'png' ? 'png' : 'jpeg' };
  }

  // Il logo Europass è un'immagine del sito: la si rilegge dal disegno, senza altre richieste.
  // Restituisce i byte del PNG (per il Word) e i punti dell'immagine con la trasparenza (per il PDF).
  function bytesLogo() {
    return new Promise(function (risolvi) {
      const img = new Image();
      img.onload = function () {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const cx = c.getContext('2d');
          cx.drawImage(img, 0, 0);
          const px = cx.getImageData(0, 0, c.width, c.height).data;
          const rgb = new Uint8Array(c.width * c.height * 3);
          const alpha = new Uint8Array(c.width * c.height);
          for (let i = 0, j = 0; i < px.length; i += 4, j++) {
            rgb[j * 3] = px[i]; rgb[j * 3 + 1] = px[i + 1]; rgb[j * 3 + 2] = px[i + 2]; alpha[j] = px[i + 3];
          }
          c.toBlob(function (b) {
            if (!b) { risolvi(null); return; }
            b.arrayBuffer().then(function (x) { risolvi({ png: new Uint8Array(x), raster: { w: c.width, h: c.height, rgb: rgb, alpha: alpha } }); }, function () { risolvi(null); });
          }, 'image/png');
        } catch (e) { risolvi(null); }
      };
      img.onerror = function () { risolvi(null); };
      img.src = '../img/europass-logo.png';
    });
  }

  function nomeFileCV(estensione) {
    return nomeFile().replace(/\.json$/, '.' + estensione);
  }

  // I caratteri sono file del sito (cartella fonts/ttf): non è una richiesta verso altri indirizzi.
  function leggiFileFont(nomi) {
    return Promise.all(nomi.map(function (n) {
      return fetch('../fonts/ttf/' + n + '.ttf').then(function (r) {
        if (!r.ok) throw new Error('font');
        return r.arrayBuffer();
      }).then(function (b) { return new Uint8Array(b); });
    })).then(function (liste) {
      const out = {};
      nomi.forEach(function (n, i) { out[n] = liste[i]; });
      return out;
    });
  }

  // Quali caratteri servono, in base al carattere scelto per il curriculum.
  function fontDelModello(m) {
    if (m.carattere === 'classico') return { pdf: { g: 'ebgaramond-regular', gi: 'ebgaramond-italic' } };
    if (m.carattere === 'semplice') return { pdf: { l: 'liberationsans-regular', lb: 'liberationsans-bold' } };
    return { pdf: m.layout === 'europass' ? { f: 'firasans-regular', fs: 'firasans-semibold' } : { f: 'firasans-regular', fs: 'firasans-semibold', d: 'anton-regular' } };
  }

  function scaricaWord() {
    const modello = modelloDaDocumento(cvPerLaStampa());
    const eu = modello.layout === 'europass';
    const files = modello.carattere === 'classico' ? ['ebgaramond-regular', 'ebgaramond-italic']
      : modello.carattere === 'semplice' ? [] : ['firasans-regular', 'firasans-bold'].concat(eu ? [] : ['anton-regular']);
    Promise.all([leggiFileFont(files).catch(function () { return null; }), eu ? bytesLogo() : Promise.resolve(null)]).then(function (r) {
      const f = r[0];
      const incorporati = {};
      if (f) {
        if (f['firasans-regular']) incorporati['Fira Sans'] = { r: f['firasans-regular'], b: f['firasans-bold'] };
        if (f['anton-regular']) incorporati['Anton'] = { r: f['anton-regular'] };
        if (f['ebgaramond-regular']) incorporati['EB Garamond'] = { r: f['ebgaramond-regular'], i: f['ebgaramond-italic'] };
      }
      modello.logo = r[1] ? r[1].png : null;
      const byte = window.BC_DOCX.creaDocx(modello, incorporati);
      scaricaFile(new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), nomeFileCV('docx'));
      $('salvato').textContent = 'Word scaricato';
    });
  }

  // PDF scaricato direttamente, con i caratteri incorporati. Se qualcosa non riesce si ripiega sulla stampa.
  function scaricaPdf() {
    const modello = modelloDaDocumento(cvPerLaStampa());
    const eu = modello.layout === 'europass';
    const nomi = fontDelModello(modello).pdf;
    const chiavi = Object.keys(nomi);
    Promise.all([leggiFileFont(chiavi.map(function (c) { return nomi[c]; })), eu ? bytesLogo() : Promise.resolve(null)]).then(function (r) {
      const caratteri = {};
      chiavi.forEach(function (c) { caratteri[c] = r[0][nomi[c]]; });
      modello.logo = r[1] ? r[1].png : null;
      return window.BC_PDF.creaPdf(modello, caratteri, { logo: r[1] ? r[1].raster : null });
    }).then(function (byte) {
      scaricaFile(new Blob([byte], { type: 'application/pdf' }), nomeFileCV('pdf'));
      $('salvato').textContent = 'PDF scaricato';
    }).catch(function () {
      chiedi('Non sono riuscito a creare il PDF. Vuoi aprire la finestra di stampa e salvarlo da lì?', 'Apri la stampa', stampa, 'No');
    });
  }


  function caricaCopia(file) {
    const lettore = new FileReader();
    lettore.onload = function () {
      let dati;
      try { dati = JSON.parse(lettore.result); } catch (e) {
        avvisa('Il file non è una copia valida del curriculum.');
        return;
      }
      if (dati && typeof dati === 'object' && dati.sofare && !dati.cv) {
        avvisa('Questa è la copia di un bilancio di competenze. Per prenderne nome, esperienze e competenze usa «Carica la copia di un bilancio» nel primo passo.');
        return;
      }
      // Vale anche la copia di una versione precedente del bilancio, che conservava qui il curriculum.
      if (!dati || typeof dati !== 'object' || dati.versione !== C.VERSIONE || !dati.profilo || typeof dati.cv !== 'object' || !dati.cv) {
        avvisa('Il file non è una copia valida del curriculum.');
        return;
      }
      const applica = function () {
        stato = C.normalizza(dati);
        cvManuale = null;
        scriviArchivio();
        $('dialogo-risposte').close();
        vai(null);
      };
      if (stato.aggiornato) chiedi('Sostituire il curriculum attuale con quello del file?', 'Sostituisci', applica);
      else applica();
    };
    lettore.readAsText(file);
  }

  function preparaStampa() {
    const s = $('stampa');
    s.textContent = '';
    s.appendChild(cvPerLaStampa());
  }

  function stampa() {
    preparaStampa();
    window.print();
  }

  function cancellaTutto() {
    chiedi('Cancellare il curriculum da questo browser? Se non hai scaricato una copia, andrà perso. Il bilancio e il diario non vengono toccati.', 'Cancella tutto', function () {
      clearTimeout(timerSalva);
      timerSalva = null;
      try { localStorage.removeItem(C.CHIAVE); localStorage.removeItem(CHIAVE_POSIZIONE); } catch (e) { /* niente da fare */ }
      stato = C.statoVuoto();
      cvManuale = null;
      ripresa = null;
      $('salvato').textContent = 'Curriculum cancellato';
      $('dialogo-risposte').close();
      vai(null);
    });
  }

  // ---------- Avvio ----------
  caricaArchivio();
  if (ripresoDalBilancio) scriviArchivio();
  disegna();
  if (!archivioDisponibile) $('salvato').textContent = 'Salvataggio non disponibile: scarica una copia';
  else if (ripresoDalBilancio) $('salvato').textContent = 'Curriculum ripreso dal bilancio';
  else if (stato.aggiornato) $('salvato').textContent = 'Curriculum ritrovato';

  $('vai-home').addEventListener('click', function () { vai(null); });
  $('apri-risposte').addEventListener('click', function () { $('dialogo-risposte').showModal(); });
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
