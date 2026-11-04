/* Bilancio di competenze — creazione di un PDF del curriculum, senza passare dalla stampa.
   Nessuna libreria e nessuna richiesta di rete: i caratteri (Fira Sans, Anton, EB Garamond, Liberation Sans) sono incorporati nel file,
   il testo resta selezionabile e l'impaginazione segue il foglio mostrato a schermo.
   Il modello in ingresso è lo stesso del file Word (vedi docx.js). Usato dal browser (window.BC_PDF) e dai test Node (module.exports). */
(function (radice) {
  'use strict';

  const PAGINA = { w: 595.28, h: 841.89 };
  const MARGINI = { sx: 45.35, dx: 45.35, su: 51.02, giu: 51.02 }; // 16 mm e 18 mm, come la stampa
  const LARGHEZZA = PAGINA.w - MARGINI.sx - MARGINI.dx;
  const GRIGIO = '#666666';
  const FILETTO = '#EBEBEB';

  // ---------- Lettura di un font TrueType ----------
  function leggiFont(byte) {
    const dv = new DataView(byte.buffer, byte.byteOffset, byte.byteLength);
    const n = dv.getUint16(4);
    const tab = {};
    for (let i = 0; i < n; i++) {
      const o = 12 + 16 * i;
      const tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
      tab[tag] = { o: dv.getUint32(o + 8), l: dv.getUint32(o + 12) };
    }
    const head = tab.head.o;
    const hhea = tab.hhea.o;
    const upm = dv.getUint16(head + 18);
    const nMetriche = dv.getUint16(hhea + 34);
    const nGlifi = dv.getUint16(tab.maxp.o + 4);
    const avanzamento = new Uint16Array(nGlifi);
    let ultimo = 0;
    for (let g = 0; g < nGlifi; g++) {
      if (g < nMetriche) ultimo = dv.getUint16(tab.hmtx.o + 4 * g);
      avanzamento[g] = ultimo;
    }
    // cmap: formato 12 (Unicode completo) oppure 4 (Unicode di base)
    const cmap = new Map();
    const c0 = tab.cmap.o;
    const nSub = dv.getUint16(c0 + 2);
    let sotto = null;
    for (let i = 0; i < nSub; i++) {
      const piattaforma = dv.getUint16(c0 + 4 + 8 * i);
      const codifica = dv.getUint16(c0 + 6 + 8 * i);
      const off = c0 + dv.getUint32(c0 + 8 + 8 * i);
      const formato = dv.getUint16(off);
      if ((piattaforma === 3 && codifica === 10 && formato === 12) || (!sotto && ((piattaforma === 3 && codifica === 1) || piattaforma === 0) && (formato === 4 || formato === 12))) sotto = { off: off, formato: formato };
    }
    if (sotto && sotto.formato === 12) {
      const nGruppi = dv.getUint32(sotto.off + 12);
      for (let i = 0; i < nGruppi; i++) {
        const g = sotto.off + 16 + 12 * i;
        const a = dv.getUint32(g); const b = dv.getUint32(g + 4); const inizio = dv.getUint32(g + 8);
        for (let c = a; c <= b && c - a < 70000; c++) cmap.set(c, inizio + (c - a));
      }
    } else if (sotto) {
      const o = sotto.off;
      const segX2 = dv.getUint16(o + 6);
      const fine = o + 14; const ini = fine + segX2 + 2; const delta = ini + segX2; const rango = delta + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const e = dv.getUint16(fine + 2 * s); const b = dv.getUint16(ini + 2 * s);
        const d = dv.getInt16(delta + 2 * s); const r = dv.getUint16(rango + 2 * s);
        for (let c = b; c <= e && c !== 0xFFFF; c++) {
          let g;
          if (r === 0) g = (c + d) & 0xFFFF;
          else {
            const p = rango + 2 * s + r + 2 * (c - b);
            g = dv.getUint16(p);
            if (g !== 0) g = (g + d) & 0xFFFF;
          }
          if (g) cmap.set(c, g);
        }
      }
    }
    const asc = dv.getInt16(hhea + 4);
    const disc = dv.getInt16(hhea + 6);
    let cap = asc * 0.7;
    if (tab['OS/2'] && dv.getUint16(tab['OS/2'].o) >= 2 && tab['OS/2'].l >= 90) cap = dv.getInt16(tab['OS/2'].o + 88) || cap;
    const post = tab.post ? tab.post.o : 0;
    return {
      byte: byte, upm: upm, asc: asc / upm, disc: Math.abs(disc) / upm, cap: cap / upm,
      bbox: [dv.getInt16(head + 36), dv.getInt16(head + 38), dv.getInt16(head + 40), dv.getInt16(head + 42)].map(function (x) { return Math.round(x * 1000 / upm); }),
      angolo: post ? dv.getInt16(post + 4) + dv.getUint16(post + 6) / 65536 : 0,
      glifo: function (cp) { return cmap.get(cp) || 0; },
      adv: function (g) { return avanzamento[g] / upm; }
    };
  }

  // ---------- Compressione ----------
  function comprimi(byte) {
    return new Response(new Blob([byte]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  const ASCII = new TextEncoder();
  function testo(s) { return ASCII.encode(s); }
  function num(x) { return (Math.round(x * 100) / 100).toString(); }
  function colorePdf(h) {
    const c = String(h || '#000000').replace('#', '');
    return [0, 2, 4].map(function (i) { return num(parseInt(c.slice(i, i + 2), 16) / 255); }).join(' ');
  }
  function esadecimale4(n) { return ('0000' + n.toString(16)).slice(-4).toUpperCase(); }

  // Dimensioni di un JPEG (cerca il blocco SOF).
  function dimensioniJpeg(b) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
    return null;
  }

  // ---------- Impaginazione ----------
  // Stili: { f: chiave del carattere, s: corpo in punti, c: colore, caps, ls: spaziatura tra le lettere, fb: grassetto simulato }
  function creaPdfAsync(m, caratteri, immagini) {
    const eu = m.layout === 'europass';
    const k = m.scala || 1;
    const base = 10.5 * k;
    const colore = m.colore || '#000000';
    const titoli = m.titoli || colore;
    const interlinea = 1.45;

    // Famiglie: ogni chiave punta a un font già letto (leggiFont). Il grassetto di Garamond è simulato come nel browser.
    const famiglia = m.carattere === 'classico'
      ? { n: 'g', b: 'g', fbOn: true, i: 'gi' }
      : m.carattere === 'semplice'
        ? { n: 'l', b: 'lb', fbOn: false, i: 'l' }
        : { n: 'f', b: 'fs', fbOn: false, i: 'f' };
    const fonti = {};
    Object.keys(caratteri).forEach(function (c) { fonti[c] = leggiFont(caratteri[c]); });
    const usati = {};
    Object.keys(fonti).forEach(function (c) { usati[c] = new Map(); });

    const grassetto = function (st) { return Object.assign({}, st, { f: famiglia.b, fb: famiglia.fbOn }); };
    const corpoSt = { f: famiglia.n, s: base, c: '#000000' };

    // misura il testo di un tratto
    const trasforma = function (t, st) { return st.caps ? t.toLocaleUpperCase('it') : t; };
    const larghezzaTratto = function (t, st) {
      const f = fonti[st.f]; let w = 0;
      for (const ch of trasforma(t, st)) {
        let g = f.glifo(ch.codePointAt(0)); if (!g) g = f.glifo(63);
        w += f.adv(g) * st.s + (st.ls || 0);
      }
      return w;
    };

    // Un paragrafo diventa righe di segmenti [{ t, st, w }]. runs: [{ t, st }]
    function avvolgi(runs, larghezza) {
      const righe = [];
      let corrente = { seg: [], w: 0, s: 0 };
      const chiudi = function () {
        while (corrente.seg.length && /^\s+$/.test(corrente.seg[corrente.seg.length - 1].t)) {
          corrente.w -= corrente.seg[corrente.seg.length - 1].w; corrente.seg.pop();
        }
        righe.push(corrente); corrente = { seg: [], w: 0, s: 0 };
      };
      runs.forEach(function (r) {
        r.t.split(/(\n|\s+)/).forEach(function (tok) {
          if (tok === '') return;
          if (tok === '\n') { corrente.s = Math.max(corrente.s, r.st.s); chiudi(); return; }
          const spazio = /^\s+$/.test(tok);
          let w = larghezzaTratto(tok, r.st);
          if (!spazio && corrente.w + w > larghezza + 0.01 && corrente.seg.length) chiudi();
          if (spazio && !corrente.seg.length) return;
          if (!spazio && w > larghezza) { // parola più larga della riga: si spezza
            let pezzo = '';
            for (const ch of tok) {
              if (larghezzaTratto(pezzo + ch, r.st) > larghezza && pezzo) {
                corrente.seg.push({ t: pezzo, st: r.st, w: larghezzaTratto(pezzo, r.st) }); corrente.w += larghezzaTratto(pezzo, r.st); corrente.s = Math.max(corrente.s, r.st.s);
                chiudi(); pezzo = '';
              }
              pezzo += ch;
            }
            tok = pezzo; w = larghezzaTratto(tok, r.st);
          }
          corrente.seg.push({ t: tok, st: r.st, w: w });
          corrente.w += w;
          corrente.s = Math.max(corrente.s, r.st.s);
        });
      });
      if (corrente.seg.length || !righe.length) chiudi();
      righe.forEach(function (r) { if (!r.s) r.s = (runs[0] && runs[0].st.s) || base; });
      return righe;
    }

    const pagine = [];
    let ops = null;
    let y = 0; // distanza dal bordo alto della pagina
    const maxY = PAGINA.h - MARGINI.giu;
    const nuovaPagina = function () { ops = []; pagine.push(ops); y = MARGINI.su; };
    nuovaPagina();
    const assicura = function (h) { if (y + h > maxY && y > MARGINI.su + 1) nuovaPagina(); };
    const Y = function (alto) { return PAGINA.h - alto; };

    function disegnaTratto(seg, x, base_y) {
      const st = seg.st; const f = fonti[st.f];
      const mappa = usati[st.f];
      let hex = '';
      for (const ch of trasforma(seg.t, st)) {
        const cp = ch.codePointAt(0);
        let g = f.glifo(cp); let u = cp;
        if (!g) { g = f.glifo(63); u = 63; }
        mappa.set(g, u);
        hex += esadecimale4(g);
      }
      if (!hex) return;
      let o = 'q BT /' + st.f + ' ' + num(st.s) + ' Tf ' + colorePdf(st.c) + ' rg ';
      if (st.ls) o += num(st.ls) + ' Tc ';
      if (st.fb) o += '2 Tr ' + colorePdf(st.c) + ' RG ' + num(st.s * 0.022) + ' w ';
      o += '1 0 0 1 ' + num(x) + ' ' + num(Y(base_y)) + ' Tm <' + hex + '> Tj ET Q';
      ops.push(o);
    }

    // Altezza di una riga e posizione della linea di base
    const altezzaRiga = function (r) { return r.s * interlinea; };
    const lineaBase = function (r, alto) {
      const f = fonti[r.seg.length ? r.seg[0].st.f : Object.keys(fonti)[0]];
      const contenuto = (f.asc + f.disc) * r.s;
      return alto + (altezzaRiga(r) - contenuto) / 2 + f.asc * r.s;
    };

    function disegnaRighe(righe, x, larghezza, allinea) {
      righe.forEach(function (r) {
        assicura(altezzaRiga(r));
        let px = x;
        if (allinea === 'centro') px = x + (larghezza - r.w) / 2;
        r.seg.forEach(function (sg) { disegnaTratto(sg, px, lineaBase(r, y)); px += sg.w; });
        y += altezzaRiga(r);
      });
    }

    const altezzaRighe = function (righe) { return righe.reduce(function (s, r) { return s + altezzaRiga(r); }, 0); };

    function linea(x1, y1, x2, y2, col, sp) {
      ops.push(num(sp) + ' w ' + colorePdf(col) + ' RG ' + num(x1) + ' ' + num(Y(y1)) + ' m ' + num(x2) + ' ' + num(Y(y2)) + ' l S');
    }
    function rettangolo(x, alto, w, h, col) {
      ops.push(colorePdf(col) + ' rg ' + num(x) + ' ' + num(Y(alto + h)) + ' ' + num(w) + ' ' + num(h) + ' re f');
    }

    // Un paragrafo intero (con eventuale spazio prima e dopo); può andare su più pagine.
    function paragrafo(runs, o) {
      const x = (o && o.x) || MARGINI.sx;
      const w = (o && o.w) || LARGHEZZA;
      const righe = avvolgi(runs, w - ((o && o.rientro) || 0));
      y += (o && o.prima) || 0;
      if (o && o.tieni) assicura(altezzaRighe(righe) + (o.tieni || 0));
      disegnaRighe(righe, x + ((o && o.rientro) || 0), w - ((o && o.rientro) || 0), o && o.allinea);
      y += (o && o.dopo) || 0;
      return righe;
    }

    // ---------- Immagini ----------
    const xobj = []; // { nome, dati, w, h }
    const aggiungiImmagine = function (spec) { const nome = 'Im' + (xobj.length + 1); xobj.push(Object.assign({ nome: nome }, spec)); return nome; };
    function disegnaImmagine(nome, x, alto, w, h) {
      ops.push('q ' + num(w) + ' 0 0 ' + num(h) + ' ' + num(x) + ' ' + num(Y(alto + h)) + ' cm /' + nome + ' Do Q');
    }

    // ---------- Intestazione ----------
    const stNome = eu
      ? { f: famiglia.b, fb: famiglia.fbOn, s: 26 * k, c: '#000000' }
      : m.carattere === 'moderno'
        ? { f: 'd', s: 32 * k, c: colore, caps: true }
        : m.carattere === 'classico'
          ? { f: 'g', s: 32 * k, c: colore, caps: true, ls: 0.04 * 32 * k }
          : { f: 'lb', s: 26 * k, c: colore, caps: true };
    const stMeta = { f: famiglia.n, s: base * 0.8, c: GRIGIO, caps: true, ls: 0.02 * base * 0.8 };

    if (eu && m.logo && immagini.logo) {
      const hl = 28.5; const wl = hl * immagini.logo.w / immagini.logo.h;
      const nome = aggiungiImmagine({ tipo: 'raster', raster: immagini.logo });
      disegnaImmagine(nome, MARGINI.sx, y, wl, hl);
      y += hl + 12;
    }

    const inizioIntestazione = y;
    let xTesto = MARGINI.sx;
    let wTesto = LARGHEZZA;
    let hFoto = 0;
    if (m.foto) {
      const dim = dimensioniJpeg(m.foto.dati);
      if (dim) {
        const wf = 85.04; hFoto = 107.72;
        const nome = aggiungiImmagine({ tipo: 'jpeg', dati: m.foto.dati, w: dim.w, h: dim.h });
        disegnaImmagine(nome, MARGINI.sx, y, wf, hFoto);
        xTesto = MARGINI.sx + wf + 18; wTesto = LARGHEZZA - wf - 18;
      }
    }
    const opzTesto = { x: xTesto, w: wTesto };
    paragrafo([{ t: m.nome || 'Il tuo nome', st: stNome }], Object.assign({ dopo: 4 }, opzTesto));
    if (!eu && m.occupazione) paragrafo([{ t: m.occupazione, st: { f: famiglia.n, s: base * 1.15, c: '#000000' } }], Object.assign({ dopo: 7 }, opzTesto));
    if (eu) {
      (m.contatti || []).forEach(function (c) {
        paragrafo([{ t: c.etichetta + ': ', st: { f: famiglia.b, fb: famiglia.fbOn, s: base * 0.95, c: '#000000' } }, { t: c.valore, st: { f: famiglia.n, s: base * 0.95, c: '#000000' } }], Object.assign({ dopo: 1 }, opzTesto));
      });
      if (m.anagrafica) paragrafo([{ t: m.anagrafica.replace(/\s*\|\s*/g, '   |   '), st: { f: famiglia.n, s: base * 0.95, c: '#000000' } }], Object.assign({ prima: 4 }, opzTesto));
    } else if ((m.contatti || []).length) {
      const r = [];
      m.contatti.forEach(function (c, i) {
        if (i) r.push({ t: '      ', st: { f: famiglia.n, s: base * 0.9, c: '#000000' } });
        r.push({ t: c.etichetta + ' ', st: stMeta });
        r.push({ t: c.valore, st: { f: famiglia.n, s: base * 0.94, c: '#000000' } });
      });
      paragrafo(r, Object.assign({ dopo: 3 }, opzTesto));
    }
    if (hFoto && y < inizioIntestazione + hFoto) y = inizioIntestazione + hFoto;
    if (!eu) { y += 9; linea(MARGINI.sx, y, MARGINI.sx + LARGHEZZA, y, colore, m.layout === 'modello' ? 1.5 : 0.75); y += 1; }

    // ---------- Sezioni ----------
    const colPeriodo = eu ? 126 : 85;
    const gap = 12;
    const stSotto = { f: famiglia.n, s: base * 0.94, c: eu ? '#000000' : GRIGIO };

    (m.sezioni || []).forEach(function (sez) {
      // titolo della sezione, tenuto insieme alla prima riga che segue
      const stTitolo = eu
        ? { f: famiglia.b, fb: famiglia.fbOn, s: base * 0.95, c: titoli, caps: true, ls: 0.04 * base * 0.95 }
        : m.carattere === 'classico'
          ? { f: famiglia.b, fb: famiglia.fbOn, s: base * 0.9, c: titoli, caps: true, ls: 0.06 * base * 0.9 }
          : { f: famiglia.b, fb: famiglia.fbOn, s: base * 0.85, c: titoli, caps: true, ls: 0.08 * base * 0.85 };
      const righeT = avvolgi([{ t: sez.titolo, st: stTitolo }], LARGHEZZA);
      assicura((eu ? 16.5 : 10.5) + altezzaRighe(righeT) + 12 + 60);
      y += eu ? 16.5 : 10.5;
      disegnaRighe(righeT, MARGINI.sx, LARGHEZZA);
      y += 4.5;
      linea(MARGINI.sx, y, MARGINI.sx + LARGHEZZA, y, eu ? titoli : (m.layout === 'modello' ? colore : FILETTO), eu ? 0.75 : (m.layout === 'modello' ? 0.75 : 0.75));
      y += 7.5;

      (sez.blocchi || []).forEach(function (b) {
        if (b.t === 'par') {
          const runs = b.runs.map(function (r) { return { t: r.t, st: (r.b || b.grassetto) ? grassetto(corpoSt) : corpoSt }; });
          let wMax = LARGHEZZA;
          if (b.stretto) { const f0 = fonti[corpoSt.f]; wMax = Math.min(LARGHEZZA, 68 * f0.adv(f0.glifo(48)) * base); }
          paragrafo(runs, { dopo: 4, w: wMax });
        } else if (b.t === 'voce') {
          const runs = b.runs.map(function (r) { return { t: r.t, st: r.b ? grassetto(corpoSt) : corpoSt }; });
          if (eu) paragrafo(runs, { dopo: 3 });
          else {
            const righe = avvolgi(runs, LARGHEZZA - 15);
            assicura(altezzaRiga(righe[0]));
            disegnaTratto({ t: '•', st: corpoSt }, MARGINI.sx + 2, lineaBase(righe[0], y));
            disegnaRighe(righe, MARGINI.sx + 15, LARGHEZZA - 15);
            y += 3;
          }
        } else if (b.t === 'riga') {
          const xDx = MARGINI.sx + colPeriodo + gap;
          const wDx = LARGHEZZA - colPeriodo - gap;
          const periodo = avvolgi([{ t: b.periodo || '', st: { f: famiglia.n, s: base * 0.85, c: eu ? '#000000' : GRIGIO, ls: m.carattere === 'classico' ? 0.06 * base * 0.85 : 0 } }], colPeriodo);
          const stTit = m.carattere === 'classico' ? { f: famiglia.i, s: base, c: '#000000' } : grassetto(corpoSt);
          const blocchiDx = [];
          if (b.titolo) blocchiDx.push({ righe: avvolgi([{ t: b.titolo, st: stTit }], wDx), dopo: 0 });
          if (b.sotto) blocchiDx.push({ righe: avvolgi([{ t: b.sotto, st: stSotto }], wDx), dopo: 0 });
          if (b.runs && b.runs.length) blocchiDx.push({ righe: avvolgi(b.runs.map(function (r) { return { t: r.t, st: r.b ? grassetto(corpoSt) : corpoSt }; }), wDx), dopo: 0, prima: 3 });
          const hDx = blocchiDx.reduce(function (s, x) { return s + (x.prima || 0) + altezzaRighe(x.righe); }, 0);
          const h = Math.max(hDx, altezzaRighe(periodo)) + 12;
          assicura(h);
          y += 6;
          const y0 = y;
          disegnaRighe(periodo, MARGINI.sx, colPeriodo);
          y = y0;
          blocchiDx.forEach(function (x) { y += x.prima || 0; disegnaRighe(x.righe, xDx, wDx); });
          y = y0 + Math.max(hDx, altezzaRighe(periodo)) + 6;
        } else if (b.t === 'madre') {
          paragrafo([{ t: b.etichetta + ' ', st: grassetto(corpoSt) }, { t: b.valore, st: corpoSt }], { dopo: 7 });
        } else if (b.t === 'nota') {
          paragrafo([{ t: b.testo, st: { f: famiglia.n, s: base * 0.8, c: GRIGIO } }], { prima: 4 });
        } else if (b.t === 'lingue') {
          disegnaTabellaLingue(b.righe);
        }
      });
    });

    function disegnaTabellaLingue(righeLingue) {
      const w0 = 95; const w = (LARGHEZZA - w0) / 5;
      const xs = [MARGINI.sx, MARGINI.sx + w0, MARGINI.sx + w0 + w, MARGINI.sx + w0 + 2 * w, MARGINI.sx + w0 + 3 * w, MARGINI.sx + w0 + 4 * w, MARGINI.sx + LARGHEZZA];
      const sf = '#E9EEF8';
      const pad = 3;
      const sz = base * 0.9;
      const stT = { f: famiglia.b, fb: famiglia.fbOn, s: sz, c: titoli };
      const stN = { f: famiglia.n, s: sz, c: '#000000' };
      const stNB = { f: famiglia.b, fb: famiglia.fbOn, s: sz, c: '#000000' };
      const stAb = { f: famiglia.n, s: base * 0.75, c: '#000000' };
      const celle = []; // { x1, x2, riga1, riga2, testo, st, fill, allinea }
      const ABIL = ['Ascolto', 'Lettura', 'Interazione', 'Produzione orale', 'Produzione scritta'];
      const altezze = [];
      const hRiga = function (st) { return st.s * interlinea + 2 * pad; };
      altezze.push(hRiga(stT)); altezze.push(hRiga(stAb));
      celle.push({ a: 0, b: 1, r1: 0, r2: 2, t: 'Altre lingue', st: stT, fill: sf, allinea: 'centro' });
      celle.push({ a: 1, b: 3, r1: 0, r2: 1, t: 'Comprensione', st: stT, fill: sf, allinea: 'centro' });
      celle.push({ a: 3, b: 5, r1: 0, r2: 1, t: 'Parlato', st: stT, fill: sf, allinea: 'centro' });
      celle.push({ a: 5, b: 6, r1: 0, r2: 1, t: 'Scritto', st: stT, fill: sf, allinea: 'centro' });
      ABIL.forEach(function (t, i) { celle.push({ a: i + 1, b: i + 2, r1: 1, r2: 2, t: t, st: stAb, fill: sf, allinea: 'centro' }); });
      righeLingue.forEach(function (r, i) {
        const ri = 2 + i;
        celle.push({ a: 0, b: 1, r1: ri, r2: ri + 1, t: r.lingua, st: stNB, allinea: 'sx' });
        if (r.livelli) r.livelli.forEach(function (l, j) { celle.push({ a: j + 1, b: j + 2, r1: ri, r2: ri + 1, t: l || '–', st: stN, allinea: 'centro' }); });
        else celle.push({ a: 1, b: 6, r1: ri, r2: ri + 1, t: r.testo || '', st: stN, allinea: 'sx' });
        // altezza della riga: il testo più alto
        let h = hRiga(stN);
        const lungo = avvolgi([{ t: r.livelli ? r.lingua : (r.testo || ' '), st: stN }], (r.livelli ? w0 : xs[6] - xs[1]) - 2 * pad);
        h = Math.max(h, altezzaRighe(lungo) + 2 * pad);
        altezze.push(h);
      });
      const hTot = altezze.reduce(function (s, x) { return s + x; }, 0);
      assicura(hTot + 4);
      const y0 = y;
      const yRiga = [y0];
      altezze.forEach(function (h) { yRiga.push(yRiga[yRiga.length - 1] + h); });
      celle.forEach(function (c) { if (c.fill) rettangolo(xs[c.a], yRiga[c.r1], xs[c.b] - xs[c.a], yRiga[c.r2] - yRiga[c.r1], c.fill); });
      celle.forEach(function (c) {
        const x1 = xs[c.a]; const x2 = xs[c.b]; const ya = yRiga[c.r1]; const yb = yRiga[c.r2];
        linea(x1, ya, x2, ya, titoli, 0.5); linea(x1, yb, x2, yb, titoli, 0.5); linea(x1, ya, x1, yb, titoli, 0.5); linea(x2, ya, x2, yb, titoli, 0.5);
        const righe = avvolgi([{ t: c.t, st: c.st }], x2 - x1 - 2 * pad);
        const salva = y;
        y = ya + ((yb - ya) - altezzaRighe(righe)) / 2;
        const antiSalto = maxY; // il testo di una cella non cambia pagina
        righe.forEach(function (r) {
          let px = x1 + pad;
          if (c.allinea === 'centro') px = x1 + (x2 - x1 - r.w) / 2;
          r.seg.forEach(function (sg) { disegnaTratto(sg, px, lineaBase(r, y)); px += sg.w; });
          y += altezzaRiga(r);
        });
        y = salva; void antiSalto;
      });
      y = y0 + hTot;
    }

    if (m.consenso) paragrafo([{ t: m.consenso, st: { f: famiglia.n, s: base * 0.8, c: GRIGIO } }], { prima: 18 });
    if (m.firma) {
      assicura(40);
      y += 15;
      const righe = avvolgi([{ t: m.firma, st: { f: famiglia.n, s: base * 0.94, c: '#000000' } }], LARGHEZZA);
      const yRiga = y;
      disegnaRighe(righe, MARGINI.sx, LARGHEZZA);
      const ultima = righe[righe.length - 1];
      const xl = MARGINI.sx + ultima.w;
      linea(xl, yRiga + altezzaRighe(righe) - 3, xl + 12 * base * 0.94, yRiga + altezzaRighe(righe) - 3, '#000000', 0.6);
    }

    return assembla(pagine, fonti, usati, xobj, m);
  }

  // ---------- Costruzione del file ----------
  function assembla(pagine, fonti, usati, xobj, m) {
    const oggetti = []; // { dict, flusso }
    const nuovo = function (dict, flusso) { oggetti.push({ dict: dict, flusso: flusso || null }); return oggetti.length; };
    const catalogo = nuovo('');
    const alberoPagine = nuovo('');
    const lavori = [];

    // Caratteri
    const rifFont = {};
    Object.keys(fonti).forEach(function (chiave) {
      const mappa = usati[chiave];
      if (!mappa.size) return;
      const f = fonti[chiave];
      const nomeBase = 'BCSUBS+' + chiave.toUpperCase();
      const idFile = nuovo('');
      const idDescr = nuovo('');
      const idCid = nuovo('');
      const idToUni = nuovo('');
      const idFont = nuovo('');
      rifFont[chiave] = idFont;
      const gids = Array.from(mappa.keys()).sort(function (a, b) { return a - b; });
      const larghezze = gids.map(function (g) { return g + ' [' + Math.round(f.adv(g) * 1000) + ']'; }).join(' ');
      let cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n';
      for (let i = 0; i < gids.length; i += 100) {
        const pezzo = gids.slice(i, i + 100);
        cmap += pezzo.length + ' beginbfchar\n' + pezzo.map(function (g) {
          const cp = mappa.get(g);
          const u = cp > 0xFFFF ? esadecimale4(0xD800 + ((cp - 0x10000) >> 10)) + esadecimale4(0xDC00 + ((cp - 0x10000) & 0x3FF)) : esadecimale4(cp);
          return '<' + esadecimale4(g) + '> <' + u + '>';
        }).join('\n') + '\nendbfchar\n';
      }
      cmap += 'endcmap CMapName currentdict /CMap defineresource pop end end';
      lavori.push(comprimi(f.byte).then(function (z) {
        oggetti[idFile - 1] = { dict: '<< /Filter /FlateDecode /Length1 ' + f.byte.length + ' ', flusso: z };
      }));
      oggetti[idDescr - 1] = { dict: '<< /Type /FontDescriptor /FontName /' + nomeBase + ' /Flags 4 /FontBBox [' + f.bbox.join(' ') + '] /ItalicAngle ' + num(f.angolo) +
        ' /Ascent ' + Math.round(f.asc * 1000) + ' /Descent -' + Math.round(f.disc * 1000) + ' /CapHeight ' + Math.round(f.cap * 1000) + ' /StemV 80 /FontFile2 ' + idFile + ' 0 R >>', flusso: null };
      oggetti[idCid - 1] = { dict: '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /' + nomeBase + ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + idDescr + ' 0 R /CIDToGIDMap /Identity /DW 500 /W [' + larghezze + '] >>', flusso: null };
      lavori.push(comprimi(testo(cmap)).then(function (z) { oggetti[idToUni - 1] = { dict: '<< /Filter /FlateDecode ', flusso: z }; }));
      oggetti[idFont - 1] = { dict: '<< /Type /Font /Subtype /Type0 /BaseFont /' + nomeBase + ' /Encoding /Identity-H /DescendantFonts [' + idCid + ' 0 R] /ToUnicode ' + idToUni + ' 0 R >>', flusso: null };
    });

    // Immagini
    const rifImg = {};
    xobj.forEach(function (im) {
      if (im.tipo === 'jpeg') {
        rifImg[im.nome] = nuovo('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ', im.dati);
      } else {
        const idMaschera = nuovo('');
        const idImg = nuovo('');
        rifImg[im.nome] = idImg;
        const r = im.raster;
        lavori.push(comprimi(r.alpha).then(function (z) {
          oggetti[idMaschera - 1] = { dict: '<< /Type /XObject /Subtype /Image /Width ' + r.w + ' /Height ' + r.h + ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode ', flusso: z };
        }));
        lavori.push(comprimi(r.rgb).then(function (z) {
          oggetti[idImg - 1] = { dict: '<< /Type /XObject /Subtype /Image /Width ' + r.w + ' /Height ' + r.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ' + idMaschera + ' 0 R /Filter /FlateDecode ', flusso: z };
        }));
      }
    });

    // Pagine
    const idPagine = [];
    const risorse = '<< /Font << ' + Object.keys(rifFont).map(function (c) { return '/' + c + ' ' + rifFont[c] + ' 0 R'; }).join(' ') + ' >> /XObject << ' +
      Object.keys(rifImg).map(function (n) { return '/' + n + ' ' + rifImg[n] + ' 0 R'; }).join(' ') + ' >> >>';
    pagine.forEach(function (ops) {
      const idContenuto = nuovo('');
      const idPag = nuovo('<< /Type /Page /Parent ' + alberoPagine + ' 0 R /MediaBox [0 0 ' + PAGINA.w + ' ' + PAGINA.h + '] /Resources ' + risorse + ' /Contents ' + idContenuto + ' 0 R >>');
      idPagine.push(idPag);
      lavori.push(comprimi(testo(ops.join('\n'))).then(function (z) { oggetti[idContenuto - 1] = { dict: '<< /Filter /FlateDecode ', flusso: z }; }));
    });
    oggetti[alberoPagine - 1] = { dict: '<< /Type /Pages /Count ' + idPagine.length + ' /Kids [' + idPagine.map(function (i) { return i + ' 0 R'; }).join(' ') + '] >>', flusso: null };
    const titoloDoc = String(m.nome || 'Curriculum').replace(/[^\x20-\x7E]/g, '').replace(/[()\\]/g, '');
    const idInfo = nuovo('<< /Title (Curriculum ' + titoloDoc + ') /Producer (Bilancio di competenze) >>');
    oggetti[catalogo - 1] = { dict: '<< /Type /Catalog /Pages ' + alberoPagine + ' 0 R >>', flusso: null };

    return Promise.all(lavori).then(function () {
      const parti = [];
      const scarti = [];
      let pos = 0;
      const metti = function (b) { parti.push(b); pos += b.length; };
      metti(testo('%PDF-1.5\n%âãÏÓ\n'.replace(/[^\x00-\x7F]/g, 'x')));
      oggetti.forEach(function (o, i) {
        scarti.push(pos);
        if (o.flusso) {
          metti(testo((i + 1) + ' 0 obj\n' + o.dict + '/Length ' + o.flusso.length + ' >>\nstream\n'));
          metti(o.flusso);
          metti(testo('\nendstream\nendobj\n'));
        } else {
          metti(testo((i + 1) + ' 0 obj\n' + o.dict + '\nendobj\n'));
        }
      });
      const xref = pos;
      let tab = 'xref\n0 ' + (oggetti.length + 1) + '\n0000000000 65535 f \n';
      scarti.forEach(function (s) { tab += ('0000000000' + s).slice(-10) + ' 00000 n \n'; });
      tab += 'trailer\n<< /Size ' + (oggetti.length + 1) + ' /Root ' + catalogo + ' 0 R /Info ' + idInfo + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
      metti(testo(tab));
      const out = new Uint8Array(pos);
      let p = 0;
      parti.forEach(function (b) { out.set(b, p); p += b.length; });
      return out;
    });
  }

  // caratteri: { f: regular, fs: semibold, d: anton, g: garamond, gi: garamond italico, l: liberation, lb: liberation bold }, byte dei file TTF
  // immagini: { logo: { w, h, rgb, alpha } }
  function creaPdf(modello, caratteri, immagini) {
    return creaPdfAsync(modello, caratteri, immagini || {});
  }

  const PDF = { creaPdf: creaPdf, leggiFont: leggiFont, dimensioniJpeg: dimensioniJpeg };
  if (typeof module !== 'undefined' && module.exports) module.exports = PDF;
  else radice.BC_PDF = PDF;
})(typeof window !== 'undefined' ? window : globalThis);
