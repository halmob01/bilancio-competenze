/* Pagina iniziale: accesso con il cartellino e «la mia area» (piano del portale §4 e §9 bis).
   Senza server configurato (BC_CONFIG.urlApi vuoto) non fa niente: la pagina resta quella statica con le quattro card.
   - Accesso dal telefono: il QR del cartellino porta qui con «#qr=…» nell'indirizzo; il codice si toglie subito
     dall'indirizzo (history.replaceState) e non finisce nei registri del server.
   - Accesso dal PC della scuola: si scrive il codice del cartellino.
   - Da entrati: saluto, classe, stato dei quattro percorsi, chi vede il lavoro, «Esci». */
(function () {
  'use strict';

  const ARCH = window.BC_ARCHIVIO;
  if (!ARCH || !ARCH.attivo) return;

  const NOMI = { portfolio: 'le attività', diario: 'il diario', bilancio: 'il bilancio', cv: 'il curriculum' };
  const TIPO_DI = { 'portfolio/': 'portfolio', 'diario/': 'diario', 'bilancio/': 'bilancio', 'cv/': 'cv' };
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
    Object.assign(inp, { id: id, type: 'text', autocomplete: 'off', spellcheck: false, maxLength: 24, placeholder: '3ELA-XXXX-XXXX' });
    inp.setAttribute('autocapitalize', 'characters');
    inp.setAttribute('aria-describedby', 'accesso-nota accesso-errore');
    const btn = el('button', 'pulsante', 'Entra');
    btn.type = 'submit';
    riga.appendChild(inp); riga.appendChild(btn);
    const errore = el('p', 'accesso__errore', messaggio || '');
    errore.id = 'accesso-errore'; errore.setAttribute('role', 'alert'); errore.hidden = !messaggio;
    const nota = el('p', 'nota', 'Dal telefono basta inquadrare il QR del cartellino con la fotocamera. Senza entrare puoi lavorare lo stesso: il lavoro resta solo su questo dispositivo.');
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
          : r.errore === 'rete' ? 'Il server della scuola non risponde. Controlla la connessione e riprova.'
            : 'Codice non riconosciuto. Controlla il cartellino: ricopia lettere e numeri, i trattini non servono.';
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
      const testo = 'Su questo dispositivo c\'è del lavoro salvato prima di entrare: ' + elenco.join(', ').replace(/, ([^,]*)$/, ' e $1') +
        '. È tuo? Se sì, lo copio nel tuo spazio sul server. Se l\'ha fatto qualcun altro su questo dispositivo, rispondi di no: resta dov\'è.';
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
    const sotto = el('p', 'home__sottotitolo', 'Il tuo lavoro è salvato sul server della scuola.');
    const testo = el('p', 'home__testo misura', s.metodo === 'qr'
      ? 'Su questo telefono resti collegato fino al 31 agosto. Puoi lavorare anche senza rete: quando torna, le modifiche partono da sole.'
      : 'Stai usando il codice del cartellino: quando hai finito premi «Esci», così il tuo lavoro viene tolto da questo computer. Dopo 30 minuti senza usarlo esci da solo.');
    const az = el('div', 'home__azioni');
    const esci = el('button', 'pulsante pulsante--secondario', 'Esci');
    esci.type = 'button';
    esci.addEventListener('click', function () { ARCH.esci(location.href.split('#')[0]); });
    az.appendChild(esci);
    const chi = el('p', 'nota', 'Chi vede il tuo lavoro: tu e i docenti del CFP. Le correzioni dei docenti restano firmate e puoi sempre ritrovare la versione di prima.');
    [occhiello, h1, sotto, testo, az, chi].forEach(function (n) { fascia.appendChild(n); });
    // I testi pensati per chi lavora senza accesso qui non valgono più.
    const notaPC = document.querySelector('.home__sotto > .nota');
    if (notaPC) notaPC.textContent = s.metodo === 'qr'
      ? 'Il lavoro è sul server e anche su questo telefono, così puoi continuare senza rete.'
      : 'Su un computer della scuola premi «Esci» quando hai finito.';
    const piede = document.querySelector('.piede p');
    if (piede) piede.textContent = 'Il tuo lavoro è salvato sul server della scuola. Lo vedono solo tu e i docenti del CFP.';
    statoPercorsi();
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
        riga.textContent = 'Ultima modifica: ' + quando(d.aggiornato) +
          (d.autore && d.autore.tipo === 'docente' ? ', corretto da ' + (d.autore.nome || 'un docente') : '');
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
      else mostraAccesso(r.errore === 'rete' ? 'Il server della scuola non risponde. Riprova quando c\'è rete.' : 'Questo QR non vale più: chiedi al docente un cartellino nuovo, oppure scrivi il codice.');
    });
  } else if (ARCH.sessione()) {
    mostraArea();
    ARCH.avvio().then(function (s) {
      if (!s) mostraAccesso('Non sei più collegato. Entra di nuovo con il tuo cartellino.');
      else { mostraArea(); }
    });
  } else {
    mostraAccesso();
  }
})();
