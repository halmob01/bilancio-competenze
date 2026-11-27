/* Pagina iniziale: accesso con il cartellino e «la mia area» (piano del portale §4 e §9 bis).
   Senza server configurato (BC_CONFIG.urlApi vuoto) non fa niente: la pagina resta quella statica con le cinque card.
   - Accesso dal telefono: il QR del cartellino porta qui con «#qr=…» nell'indirizzo; il codice si toglie subito
     dall'indirizzo (history.replaceState) e non finisce nei registri del server.
   - Accesso dal PC della scuola: si scrive il codice del cartellino.
   - Da entrati: saluto, classe, stato dei quattro percorsi, chi vede il lavoro, «Esci». */
(function () {
  'use strict';

  const ARCH = window.BC_ARCHIVIO;
  if (!ARCH || !ARCH.attivo) return;

  const NOMI = { portfolio: 'le attività', diario: 'il diario', bilancio: 'il bilancio', cv: 'il curriculum', orientamento: 'l\'orientamento' };
  const TIPO_DI = { 'portfolio/': 'portfolio', 'diario/': 'diario', 'bilancio/': 'bilancio', 'cv/': 'cv', 'orientamento/': 'orientamento' };
  const INDIRIZZI = { elettrico: 'Elettrico', informatica: 'Informatica', estetica: 'Estetica' };

  const fascia = document.querySelector('.home__fascia-dentro');
  if (!fascia) return;
  const originale = fascia.cloneNode(true);

  function el(tag, cls, testo) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (testo) e.textContent = testo;
    return e;
  }

  // ---------- Accesso ----------
  function mostraAccesso(messaggio) {
    fascia.textContent = '';
    Array.prototype.forEach.call(originale.childNodes, function (n) { fascia.appendChild(n.cloneNode(true)); });
    const form = el('form', 'accesso');
    form.setAttribute('novalidate', '');
    const id = 'codice-cartellino';
    const lab = el('label', 'accesso__etichetta', 'Entra con il codice del tuo cartellino');
    lab.setAttribute('for', id);
    const riga = el('div', 'accesso__riga');
    const inp = el('input', 'accesso__codice');
    Object.assign(inp, { id: id, type: 'text', autocomplete: 'off', spellcheck: false, maxLength: 24, placeholder: '3ELE-XXXX-XXXX' });
    inp.setAttribute('autocapitalize', 'characters');
    inp.setAttribute('aria-describedby', 'accesso-nota accesso-errore');
    const btn = el('button', 'pulsante', 'Entra');
    btn.type = 'submit';
    riga.appendChild(inp); riga.appendChild(btn);
    const errore = el('p', 'accesso__errore', messaggio || '');
    errore.id = 'accesso-errore'; errore.setAttribute('role', 'alert'); errore.hidden = !messaggio;
    const nota = el('p', 'nota', 'Dal telefono: inquadra il QR del cartellino.');
    nota.id = 'accesso-nota';
    form.appendChild(lab); form.appendChild(riga); form.appendChild(errore); form.appendChild(nota);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const codice = inp.value.trim();
      if (!codice) { errore.hidden = false; errore.textContent = 'Scrivi il codice che trovi sul cartellino.'; inp.focus(); return; }
      btn.disabled = true; btn.textContent = 'Controllo…';
      ARCH.entra({ codice: codice }).then(function (r) {
        btn.disabled = false; btn.textContent = 'Entra';
        if (r.ok) { dopoAccesso(); return; }
        errore.hidden = false;
        errore.textContent = r.errore === 'tentativi' ? 'Troppi tentativi da questo dispositivo: riprova tra 10 minuti.'
          : r.errore === 'rete' ? 'Il server non risponde. Riprova tra poco.'
            : 'Codice sbagliato. Ricopialo dal cartellino.';
        inp.focus();
      });
    });
    fascia.appendChild(form);
  }

  // Appena entrati: il lavoro fatto su questo dispositivo prima di entrare si propone, non si carica da solo (piano §5).
  function dopoAccesso() {
    ARCH.lavoroSenzaAccesso().then(function (tipi) {
      if (!tipi.length) return null;
      const elenco = tipi.map(function (t) { return NOMI[t]; });
      const testo = 'Qui c\'è già del lavoro: ' + elenco.join(', ').replace(/, ([^,]*)$/, ' e $1') + '. È tuo?';
      return ARCH.domanda(testo, 'Sì, è mio', 'No').then(function (mio) { return mio ? ARCH.adotta(tipi) : null; });
    }).then(function () { return ARCH.avvio(); }).then(mostraArea);
  }

  // ---------- La mia area ----------
  function quando(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function mostraArea() {
    const s = ARCH.sessione();
    if (!s) { mostraAccesso(); return; }
    const p = s.profilo;
    fascia.textContent = '';
    const occhiello = el('p', 'occhiello', [p.classe, INDIRIZZI[p.indirizzo] || '', p.anno ? p.anno + '° anno' : ''].filter(Boolean).join(' · ') || 'Il tuo spazio');
    const h1 = el('h1', '', 'Ciao, ' + p.nome);
    const sotto = el('p', 'home__sottotitolo', 'Questo è il tuo portale dello studente.');
    const az = el('div', 'home__azioni');
    const esci = el('button', 'pulsante pulsante--secondario', 'Esci');
    esci.type = 'button';
    esci.addEventListener('click', function () { ARCH.esci(location.href.split('#')[0]); });
    const cest = el('button', 'pulsante pulsante--secondario', 'Cestino');
    cest.type = 'button';
    cest.addEventListener('click', apriCestino);
    az.appendChild(cest);
    az.appendChild(esci);
    [occhiello, h1, sotto, az].forEach(function (n) { fascia.appendChild(n); });
    statoPercorsi();
  }

  // ---------- Cestino: quello che hai cancellato negli ultimi 30 giorni ----------
  const DOVE = { portfolio: 'Le mie attività', diario: 'Diario', bilancio: 'Bilancio', cv: 'Curriculum', orientamento: 'Orientamento' };
  const COSA = { attivita: 'Attività', tirocini: 'Tirocinio', settimane: 'Settimana', esperienze: 'Esperienza', lingueElenco: 'Lingua', formazione: 'Formazione', lavoro: 'Lavoro', passi: 'Passo', strade: 'Strada' };
  function giorniFa(iso) {
    const g = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
    return g <= 0 ? 'oggi' : g === 1 ? 'ieri' : g + ' giorni fa';
  }
  function giorniRimasti(iso) {
    const g = Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
    return g === 1 ? 'resta ancora 1 giorno' : 'restano ' + g + ' giorni';
  }
  function apriCestino() {
    const d = document.createElement('dialog');
    d.className = 'cestino';
    d.setAttribute('aria-labelledby', 'cestino-titolo');
    const h = el('h2', '', 'Cestino'); h.id = 'cestino-titolo';
    const sotto = el('p', '', 'Qui trovi quello che hai cancellato negli ultimi 30 giorni.');
    const esito = el('p', 'cestino__esito'); esito.setAttribute('role', 'status');
    const ul = el('ul', 'cestino__elenco');
    const az = el('div', 'dialogo__azioni');
    const chiudi = el('button', 'pulsante', 'Chiudi'); chiudi.type = 'button'; chiudi.onclick = function () { d.close(); };
    az.appendChild(chiudi);
    [h, sotto, ul, esito, az].forEach(function (n) { d.appendChild(n); });
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d);
    d.showModal();

    function vuoto() { if (!ul.children.length) { sotto.textContent = 'Il cestino è vuoto.'; } }
    function riga(v) {
      const li = el('li', 'cestino__voce');
      const testa = el('p', 'cestino__titolo', (COSA[v.genere] || 'Voce') + (v.titolo ? ': ' + v.titolo : ''));
      const meta = el('p', 'meta', (DOVE[v.tipo] || '') + ' · cancellato ' + giorniFa(v.quando) + ' · ' + giorniRimasti(v.scade));
      const bt = el('div', 'cestino__azioni');
      const rimetti = el('button', 'pulsante', 'Rimetti a posto'); rimetti.type = 'button';
      const via = el('button', 'pulsante pulsante--testo', 'Elimina per sempre'); via.type = 'button';
      rimetti.onclick = function () {
        rimetti.disabled = true; esito.textContent = '';
        ARCH.richiesta('POST', 'cestino/' + v.id + '/ripristina').then(function (r) {
          if (r.stato === 200) { li.remove(); esito.textContent = 'Fatto. Lo trovi in «' + (DOVE[v.tipo] || 'Le mie attività') + '».'; vuoto(); }
          else { rimetti.disabled = false; esito.textContent = r.stato === 409 ? 'Non si può rimettere qui. Prima rimetti il tirocinio.' : 'Non è andata. Riprova tra poco.'; }
        });
      };
      via.onclick = function () {
        ARCH.domanda('Eliminare per sempre? Non si può tornare indietro.', 'Elimina', 'Annulla').then(function (si) {
          if (!si) return;
          ARCH.richiesta('DELETE', 'cestino/' + v.id).then(function (r) {
            if (r.stato === 200) { li.remove(); esito.textContent = 'Eliminato.'; vuoto(); } else esito.textContent = 'Non è andata. Riprova tra poco.';
          });
        });
      };
      bt.appendChild(rimetti); bt.appendChild(via);
      [testa, meta, bt].forEach(function (n) { li.appendChild(n); });
      return li;
    }
    ARCH.richiesta('GET', 'cestino').then(function (r) {
      if (r.stato !== 200) { sotto.textContent = 'Non riesco a aprire il cestino. Riprova tra poco.'; return; }
      r.json.voci.forEach(function (v) { ul.appendChild(riga(v)); });
      vuoto();
    });
  }

  function statoPercorsi() {
    ARCH.elencoDocumenti().then(function (r) {
      const docs = {};
      ((r.json && r.json.documenti) || []).forEach(function (d) { docs[d.tipo] = d; });
      document.querySelectorAll('a.percorso').forEach(function (a) {
        const tipo = TIPO_DI[a.getAttribute('href')];
        if (!tipo) return;
        let riga = a.querySelector('.percorso__stato');
        if (!riga) { riga = el('span', 'meta percorso__stato'); a.insertBefore(riga, a.querySelector('.percorso__apri')); }
        const d = docs[tipo];
        if (!d) { riga.textContent = 'Da iniziare'; return; }
        riga.textContent = 'Modificato il ' + quando(d.aggiornato) +
          (d.autore && d.autore.tipo === 'docente' ? ' da ' + (d.autore.nome || 'un docente') : '');
        const apri = a.querySelector('.percorso__apri');
        if (apri && !apri.dataset.continua) { apri.dataset.continua = '1'; apri.textContent = 'Continua'; }
      });
    });
  }

  // ---------- Avvio ----------
  const qr = /^#qr=([A-Za-z0-9_-]{20,64})$/.exec(location.hash);
  if (qr) {
    history.replaceState(null, '', location.pathname + location.search);
    ARCH.entra({ qr: qr[1] }).then(function (r) {
      if (r.ok) dopoAccesso();
      else mostraAccesso(r.errore === 'rete' ? 'Il server non risponde. Riprova tra poco.' : 'Questo QR non vale più. Chiedi un cartellino nuovo al docente.');
    });
  } else if (ARCH.sessione()) {
    mostraArea();
    ARCH.avvio().then(function (s) {
      if (!s) mostraAccesso('Entra di nuovo con il tuo cartellino.');
      else { mostraArea(); }
    });
  } else {
    mostraAccesso();
  }
})();
