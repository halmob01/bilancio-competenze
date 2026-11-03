/* Bilancio di competenze — creazione di un file Word (.docx) del curriculum.
   Nessuna libreria e nessuna richiesta di rete: il file è un archivio ZIP (senza compressione) di piccoli file XML.
   Il modello in ingresso lo costruisce app.js a partire dal curriculum mostrato a schermo.
   Usato dal browser (window.BC_DOCX) e dai test Node (module.exports). */
(function (radice) {
  'use strict';

  // ---------- Archivio ZIP senza compressione ----------
  const TAVOLA_CRC = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(byte) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < byte.length; i++) c = TAVOLA_CRC[(c ^ byte[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(s) { return new TextEncoder().encode(s); }

  function zip(file) {
    const parti = [];
    const centrale = [];
    let scarto = 0;
    const ora = 0;
    const data = ((2026 - 1980) << 9) | (1 << 5) | 1;
    file.forEach(function (f) {
      const nome = utf8(f.nome);
      const crc = crc32(f.dati);
      const dim = f.dati.length;
      const lh = new Uint8Array(30 + nome.length);
      const a = new DataView(lh.buffer);
      a.setUint32(0, 0x04034b50, true); a.setUint16(4, 20, true); a.setUint16(6, 0x0800, true);
      a.setUint16(8, 0, true); a.setUint16(10, ora, true); a.setUint16(12, data, true);
      a.setUint32(14, crc, true); a.setUint32(18, dim, true); a.setUint32(22, dim, true);
      a.setUint16(26, nome.length, true); a.setUint16(28, 0, true);
      lh.set(nome, 30);
      parti.push(lh, f.dati);
      const ch = new Uint8Array(46 + nome.length);
      const c = new DataView(ch.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, ora, true); c.setUint16(14, data, true);
      c.setUint32(16, crc, true); c.setUint32(20, dim, true); c.setUint32(24, dim, true);
      c.setUint16(28, nome.length, true); c.setUint32(42, scarto, true);
      ch.set(nome, 46);
      centrale.push(ch);
      scarto += lh.length + dim;
    });
    const dimCentrale = centrale.reduce(function (s, x) { return s + x.length; }, 0);
    const fine = new Uint8Array(22);
    const e = new DataView(fine.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, file.length, true); e.setUint16(10, file.length, true);
    e.setUint32(12, dimCentrale, true); e.setUint32(16, scarto, true);
    const tutti = parti.concat(centrale, [fine]);
    const totale = tutti.reduce(function (s, x) { return s + x.length; }, 0);
    const out = new Uint8Array(totale);
    let p = 0;
    tutti.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }

  // ---------- XML ----------
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

  function esadecimale(c) { return String(c || '000000').replace('#', '').toUpperCase(); }

  // Un tratto di testo. o: { b, i, caps, colore, sz (mezzi punti), spaziatura (ventesimi di punto), font, sottolineato }
  function corsa(testo, o) {
    const x = o || {};
    let pr = '';
    if (x.font) pr += '<w:rFonts w:ascii="' + esc(x.font) + '" w:hAnsi="' + esc(x.font) + '" w:cs="' + esc(x.font) + '"/>';
    if (x.b) pr += '<w:b/><w:bCs/>';
    if (x.i) pr += '<w:i/><w:iCs/>';
    if (x.caps) pr += '<w:caps/>';
    if (x.colore) pr += '<w:color w:val="' + esadecimale(x.colore) + '"/>';
    if (x.spaziatura) pr += '<w:spacing w:val="' + x.spaziatura + '"/>';
    if (x.sz) pr += '<w:sz w:val="' + x.sz + '"/><w:szCs w:val="' + x.sz + '"/>';
    if (x.sottolineato) pr += '<w:u w:val="single"/>';
    const righe = String(testo === null || testo === undefined ? '' : testo).split('\n');
    const corpo = righe.map(function (r, i) {
      return (i ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + esc(r) + '</w:t>';
    }).join('');
    return '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + corpo + '</w:r>';
  }

  // Più tratti, ciascuno eventualmente in grassetto: [{ t, b }]
  function corse(tratti, base) {
    return (tratti || []).map(function (t) {
      return corsa(t.t, Object.assign({}, base, t.b ? { b: true } : {}));
    }).join('');
  }

  // Un paragrafo. o: { keepNext, bordoSotto: {colore, sz}, prima, dopo, sx, sporgenza, allinea }
  function paragrafo(contenuto, o) {
    const x = o || {};
    let pr = '';
    if (x.keepNext) pr += '<w:keepNext/>';
    if (x.bordoSotto) pr += '<w:pBdr><w:bottom w:val="single" w:sz="' + x.bordoSotto.sz + '" w:space="2" w:color="' + esadecimale(x.bordoSotto.colore) + '"/></w:pBdr>';
    pr += '<w:spacing w:before="' + (x.prima || 0) + '" w:after="' + (x.dopo === undefined ? 40 : x.dopo) + '" w:line="' + (x.interlinea || 264) + '" w:lineRule="auto"/>';
    if (x.sx || x.sporgenza) pr += '<w:ind w:left="' + (x.sx || 0) + '"' + (x.sporgenza ? ' w:hanging="' + x.sporgenza + '"' : '') + '/>';
    if (x.allinea) pr += '<w:jc w:val="' + x.allinea + '"/>';
    return '<w:p><w:pPr>' + pr + '</w:pPr>' + (contenuto || '') + '</w:p>';
  }

  // Tabella. colonne: larghezze in ventesimi di punto. righe: stringhe XML di <w:tr>.
  function tabella(colonne, righe, bordi) {
    const totale = colonne.reduce(function (s, c) { return s + c; }, 0);
    const b = bordi ? ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (l) {
      return '<w:' + l + ' w:val="single" w:sz="4" w:space="0" w:color="' + esadecimale(bordi) + '"/>';
    }).join('') : ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (l) {
      return '<w:' + l + ' w:val="nil"/>';
    }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + totale + '" w:type="dxa"/><w:tblBorders>' + b + '</w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="' + (bordi ? 50 : 0) + '" w:type="dxa"/><w:left w:w="' + (bordi ? 90 : 0) + '" w:type="dxa"/>' +
      '<w:bottom w:w="' + (bordi ? 50 : 0) + '" w:type="dxa"/><w:right w:w="' + (bordi ? 90 : 160) + '" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      '<w:tblGrid>' + colonne.map(function (c) { return '<w:gridCol w:w="' + c + '"/>'; }).join('') + '</w:tblGrid>' +
      righe.join('') + '</w:tbl>';
  }

  // Cella. o: { larghezza, span, unisciSotto ('restart'|'continue'), sfondo, allinea verticale }
  function cella(contenuto, o) {
    const x = o || {};
    let pr = '<w:tcW w:w="' + x.larghezza + '" w:type="dxa"/>';
    if (x.span) pr += '<w:gridSpan w:val="' + x.span + '"/>';
    if (x.unisci === 'restart') pr += '<w:vMerge w:val="restart"/>';
    if (x.unisci === 'continue') pr += '<w:vMerge/>';
    if (x.sfondo) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + esadecimale(x.sfondo) + '"/>';
    if (x.verticale) pr += '<w:vAlign w:val="' + x.verticale + '"/>';
    return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + (contenuto || paragrafo('', { dopo: 0 })) + '</w:tc>';
  }

  function riga(celle) { return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + celle.join('') + '</w:tr>'; }

  // Immagine in linea. rid: identificatore del rapporto; cx, cy in EMU.
  function immagine(rid, cx, cy, nome, id) {
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:docPr id="' + id + '" name="' + esc(nome) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + esc(nome) + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  // ---------- Documento ----------
  const LARGHEZZA = 10092; // A4 meno i margini, in ventesimi di punto
  const FONT = { moderno: 'Calibri', classico: 'Garamond', semplice: 'Arial' };
  const GRIGIO = '595959';
  const ABILITA = ['Ascolto', 'Lettura', 'Interazione', 'Produzione orale', 'Produzione scritta'];

  function creaDocumento(m) {
    const eu = m.layout === 'europass';
    const font = FONT[m.carattere] || FONT.moderno;
    const base = Math.round(21 * (m.scala || 1)); // 10,5 pt
    const sz = function (k) { return Math.max(12, Math.round(base * k)); };
    const colore = m.colore || '000000';
    const titoli = m.titoli || colore;
    const corpo = [];
    let nImg = 0;
    const rapporti = [];
    const media = [];
    const aggiungiImmagine = function (dati, est) {
      nImg++;
      const nome = 'immagine' + nImg + '.' + est;
      const rid = 'rIdImg' + nImg;
      media.push({ nome: 'word/media/' + nome, dati: dati });
      rapporti.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + nome + '"/>');
      return rid;
    };
    const normale = { font: font, sz: base };

    // --- intestazione ---
    if (eu && m.logo) {
      const rid = aggiungiImmagine(m.logo, 'png');
      corpo.push(paragrafo(immagine(rid, 1760000, 347000, 'Europass', nImg + 10), { dopo: 160 }));
    }
    const nomeStile = eu
      ? { font: font, b: true, sz: sz(2.2), colore: '000000' }
      : (m.carattere === 'moderno'
        ? { font: 'Arial Narrow', b: true, caps: true, sz: sz(3), colore: colore }
        : { font: font, b: m.carattere === 'semplice', caps: m.carattere === 'classico', sz: sz(2.6), colore: colore, spaziatura: m.carattere === 'classico' ? 20 : 0 });
    const testoIntest = [];
    testoIntest.push(paragrafo(corsa(m.nome || 'Il tuo nome', nomeStile), { dopo: 60, interlinea: 240 }));
    if (!eu && m.occupazione) testoIntest.push(paragrafo(corsa(m.occupazione, { font: font, sz: sz(1.15) }), { dopo: 80 }));
    if (eu) {
      (m.contatti || []).forEach(function (c) {
        testoIntest.push(paragrafo(corsa(c.etichetta + ': ', { font: font, b: true, sz: sz(0.95) }) + corsa(c.valore, { font: font, sz: sz(0.95) }), { dopo: 20 }));
      });
      if (m.anagrafica) testoIntest.push(paragrafo(corsa(m.anagrafica.replace(/\s*\|\s*/g, '   |   '), { font: font, sz: sz(0.95) }), { prima: 60, dopo: 40 }));
    } else if ((m.contatti || []).length) {
      const t = [];
      m.contatti.forEach(function (c, i) {
        if (i) t.push(corsa('     ', { font: font, sz: sz(0.9) }));
        t.push(corsa(c.etichetta + ' ', { font: font, sz: sz(0.75), colore: GRIGIO, caps: true, spaziatura: 10 }));
        t.push(corsa(c.valore, { font: font, sz: sz(0.94) }));
      });
      testoIntest.push(paragrafo(t.join(''), { dopo: 80, bordoSotto: { colore: colore, sz: m.layout === 'modello' ? 12 : 6 } }));
    }
    if (m.foto) {
      const rid = aggiungiImmagine(m.foto.dati, m.foto.est);
      const wf = 1700;
      corpo.push(tabella([wf, LARGHEZZA - wf], [riga([
        cella(paragrafo(immagine(rid, 1080000, 1368000, 'Foto', nImg + 10), { dopo: 0 }), { larghezza: wf }),
        cella(testoIntest.join(''), { larghezza: LARGHEZZA - wf, verticale: 'center' })
      ])]));
      if (!eu) corpo.push(paragrafo('', { dopo: 0, bordoSotto: { colore: colore, sz: m.layout === 'modello' ? 12 : 6 } }));
    } else {
      corpo.push(testoIntest.join(''));
    }

    // --- sezioni ---
    const colPeriodo = eu ? 2520 : 2000;
    (m.sezioni || []).forEach(function (s) {
      const stile = eu
        ? { font: font, b: true, caps: true, sz: sz(0.95), colore: titoli, spaziatura: 10 }
        : { font: font, b: true, caps: true, sz: sz(0.85), colore: titoli, spaziatura: 20 };
      const bordo = eu ? { colore: titoli, sz: 6 } : { colore: m.layout === 'modello' ? colore : 'D0D0D0', sz: 4 };
      corpo.push(paragrafo(corsa(s.titolo, stile), { keepNext: true, prima: eu ? 300 : 260, dopo: 100, bordoSotto: bordo }));
      (s.blocchi || []).forEach(function (b) {
        if (b.t === 'par') {
          corpo.push(paragrafo(corse(b.runs, Object.assign({}, normale, b.grassetto ? { b: true } : {})), { dopo: 60 }));
        } else if (b.t === 'voce') {
          corpo.push(paragrafo(eu ? corse(b.runs, normale) : corsa('•\t', normale) + corse(b.runs, normale), eu ? { dopo: 40 } : { dopo: 40, sx: 284, sporgenza: 284 }));
        } else if (b.t === 'riga') {
          const dx = [];
          if (b.titolo) dx.push(paragrafo(corsa(b.titolo, { font: font, b: true, sz: base }), { dopo: 20 }));
          if (b.sotto) dx.push(paragrafo(corsa(b.sotto, { font: font, sz: sz(0.94), colore: eu ? '000000' : GRIGIO }), { dopo: 20 }));
          if (b.runs && b.runs.length) dx.push(paragrafo(corse(b.runs, normale), { dopo: 20 }));
          corpo.push(tabella([colPeriodo, LARGHEZZA - colPeriodo], [riga([
            cella(paragrafo(corsa(b.periodo || '', { font: font, sz: sz(0.85), colore: eu ? '000000' : GRIGIO }), { dopo: 20 }), { larghezza: colPeriodo }),
            cella(dx.join(''), { larghezza: LARGHEZZA - colPeriodo })
          ])]));
          corpo.push(paragrafo('', { dopo: 40, interlinea: 120 }));
        } else if (b.t === 'madre') {
          corpo.push(paragrafo(corsa(b.etichetta + ' ', { font: font, b: true, sz: base }) + corsa(b.valore, normale), { dopo: 100 }));
        } else if (b.t === 'nota') {
          corpo.push(paragrafo(corsa(b.testo, { font: font, sz: sz(0.8), colore: GRIGIO }), { prima: 80 }));
        } else if (b.t === 'lingue') {
          const w0 = 1900;
          const w = Math.floor((LARGHEZZA - w0) / 5);
          const colonne = [w0, w, w, w, w, LARGHEZZA - w0 - 4 * w];
          const sf = 'E9EEF8';
          const t = function (testo, o2) { return corsa(testo, Object.assign({ font: font, sz: sz(0.9) }, o2)); };
          const c = function (testo, o2, o3) { return paragrafo(t(testo, o2), { dopo: 0, allinea: o3 || 'center' }); };
          const righeTab = [];
          righeTab.push(riga([
            cella(c('Altre lingue', { b: true, colore: titoli }), { larghezza: colonne[0], unisci: 'restart', sfondo: sf, verticale: 'center' }),
            cella(c('Comprensione', { b: true, colore: titoli }), { larghezza: colonne[1] + colonne[2], span: 2, sfondo: sf }),
            cella(c('Parlato', { b: true, colore: titoli }), { larghezza: colonne[3] + colonne[4], span: 2, sfondo: sf }),
            cella(c('Scritto', { b: true, colore: titoli }), { larghezza: colonne[5], sfondo: sf })]));
          righeTab.push(riga([
            cella('', { larghezza: colonne[0], unisci: 'continue', sfondo: sf })].concat(
            ABILITA.map(function (a, i) { return cella(c(a, { sz: sz(0.75) }), { larghezza: colonne[i + 1], sfondo: sf }); }))));
          (b.righe || []).forEach(function (r) {
            const celleRiga = [cella(c(r.lingua, { b: true }, 'left'), { larghezza: colonne[0] })];
            if (r.livelli) r.livelli.forEach(function (l, i) { celleRiga.push(cella(c(l || '–'), { larghezza: colonne[i + 1] })); });
            else celleRiga.push(cella(c(r.testo || '', {}, 'left'), { larghezza: LARGHEZZA - colonne[0], span: 5 }));
            righeTab.push(riga(celleRiga));
          });
          corpo.push(tabella(colonne, righeTab, titoli));
        }
      });
    });

    if (m.consenso) corpo.push(paragrafo(corsa(m.consenso, { font: font, sz: sz(0.8), colore: GRIGIO }), { prima: 360 }));
    if (m.firma) corpo.push(paragrafo(corsa(m.firma, { font: font, sz: sz(0.94) }) + corsa('_'.repeat(24), { font: font, colore: '7F7F7F' }), { prima: 280 }));

    const sezioneFinale = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="907" w:bottom="1020" w:left="907" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + corpo.join('') + sezioneFinale + '</w:body></w:document>';
    return { xml: xml, rapporti: rapporti, media: media, font: font, base: base };
  }

  function creaDocx(modello) {
    const d = creaDocumento(modello);
    const stili = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + esc(d.font) + '" w:hAnsi="' + esc(d.font) + '" w:cs="' + esc(d.font) + '"/><w:sz w:val="' + d.base + '"/><w:szCs w:val="' + d.base + '"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normale"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
    const tipi = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
    const radiceRel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const docRel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdStili" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' + d.rapporti.join('') + '</Relationships>';
    const file = [
      { nome: '[Content_Types].xml', dati: utf8(tipi) },
      { nome: '_rels/.rels', dati: utf8(radiceRel) },
      { nome: 'word/document.xml', dati: utf8(d.xml) },
      { nome: 'word/styles.xml', dati: utf8(stili) },
      { nome: 'word/_rels/document.xml.rels', dati: utf8(docRel) }
    ].concat(d.media);
    return zip(file);
  }

  const DOCX = { creaDocx: creaDocx, crc32: crc32, zip: zip, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = DOCX;
  else radice.BC_DOCX = DOCX;
})(typeof window !== 'undefined' ? window : globalThis);
