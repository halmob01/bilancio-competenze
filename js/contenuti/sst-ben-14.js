/* Mappa delle situazioni di lavoro: SST-BEN-14 «Esecuzione dei trattamenti viso» (EQF 3), indirizzo Estetica.
   CONTENUTO, non codice: il motore è js/situazioni.js.

   Fonte della struttura: Regione Friuli Venezia Giulia, Repertorio delle qualificazioni regionali, settore «Servizi alla
   persona», versione 1.7 (gennaio 2020): SST-BEN-14, versione 4 del 15/01/2020, correlata al QPR-BEN-14, EQF 3.
   I testi «docente» sono una RIFORMULAZIONE delle situazioni FVG: per l'uso formale fa fede la scheda.

   Aggancio lombardo: stessa competenza di sst-ben-13.js, est-trattamenti (DGR 3192/2020, Allegato B2 qualifiche, figura 10),
   che tra le abilità comprende le «tecniche manuali di base per l'esecuzione di trattamenti estetici viso e corpo» e l'uso di
   «attrezzature meccaniche ed elettriche»; ADA.24.137.406.

   La scheda ha in ogni dimensione una variante «benessere» (rituali multisensoriali) e una «con attrezzature» (alta frequenza,
   ultrasuoni, radiofrequenza, laser). Le stesse parole valgono per più dimensioni: qui sono segnali deboli, e le frasi che
   citano solo l'apparecchio vanno di norma al docente come casi dubbi. È voluto.
   Stato: BOZZA da rivedere con i docenti di Estetica. */
(function (radice) {
  'use strict';

  const MAPPA = {
    id: 'SST-BEN-14',
    titolo: 'Esecuzione dei trattamenti viso',
    indirizzo: 'estetica',
    eqf: 3,
    stato: 'bozza',
    versione: '0.1 del 27/11/2026',
    fonte: {
      sst: 'Regione FVG, Repertorio delle qualificazioni regionali, Servizi alla persona, v. 1.7 (gennaio 2020), SST-BEN-14 v. 4',
      qpr: 'QPR-BEN-14 Esecuzione dei trattamenti viso, EQF 3',
      url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/formazione-lavoro/formazione/FOGLIA15/allegati/Servizi_alla_persona_-_Repertorio_2020_Gennaio.pdf',
      lombardia: 'DGR 3192/2020, Allegato B2 qualifiche, figura 10 Operatore del benessere, indirizzo trattamento estetico',
      ada: ['ADA.24.137.406']
    },
    soglia: null,
    dimensioni: [
      { id: 'esfoliazione', numero: 1, titolo: 'Esfoliazione' },
      { id: 'idratanti', numero: 2, titolo: 'Idratanti' },
      { id: 'purificanti', numero: 3, titolo: 'Sebo-riequilibranti / dermopurificanti' },
      { id: 'lenitivi', numero: 4, titolo: 'Dermolenitivi' },
      { id: 'antiage', numero: 5, titolo: 'Anti age' }
    ],
    situazioni: [
      // ---------- 1. Esfoliazione ----------
      { id: 'ben14-1.1', codice: '1.1', origine: 'FVG', dimensione: 'esfoliazione', grado: 1, competenza: 'est-trattamenti',
        docente: 'Esfoliazione meccanica manuale con prodotti leggermente abrasivi.',
        studente: 'Ho fatto uno scrub o un gommage al viso',
        lessico: { forte: ['gommage', 'scrub * viso', 'viso * scrub', 'esfoliazione meccanica', 'esfoliant* * viso', 'granul*'],
          debole: ['scrub', 'esfolia*', 'viso'] } },
      { id: 'ben14-1.2', codice: '1.2', origine: 'FVG', dimensione: 'esfoliazione', grado: 2, competenza: 'est-trattamenti',
        docente: 'Esfoliazione chimica con prodotti ad azione cheratolitica (retinolo, AHA, acido glicolico).',
        studente: 'Ho fatto un peeling chimico al viso',
        lessico: { forte: ['peeling', 'acido glicolico', 'acidi', 'aha', 'retinolo', 'esfoliazione chimica', 'cheratolitic*'],
          debole: ['esfolia*', 'viso'] } },
      { id: 'ben14-1.3', codice: '1.3', origine: 'FVG', dimensione: 'esfoliazione', grado: 3, competenza: 'est-trattamenti',
        docente: 'Esfoliazione «benessere»: trattamento in stile SPA con rituali olistici e stimolazione multisensoriale.',
        studente: 'Ho fatto un rituale esfoliante di benessere (stile SPA)',
        lessico: { forte: ['rituale esfoliant*', 'esfoliazion* * rituale', 'rituale * esfolia*'],
          debole: ['rituale', 'spa', 'olistic*', 'multisensorial*'] } },
      // ---------- 2. Idratanti ----------
      { id: 'ben14-2.1', codice: '2.1', origine: 'FVG', dimensione: 'idratanti', grado: 1, competenza: 'est-trattamenti',
        docente: 'Trattamento idratante o nutriente con prodotti idratanti o occlusivi che ripristinano il film idrolipidico.',
        studente: 'Ho fatto un trattamento idratante o nutriente al viso',
        lessico: { forte: ['idratant* * viso', 'viso * idratant*', 'nutrient* * viso', 'viso * nutrient*', 'maschera idratante', 'crema idratante', 'film idrolipidico'],
          debole: ['idratant*', 'nutrient*', 'maschera', 'viso'] } },
      { id: 'ben14-2.2', codice: '2.2', origine: 'FVG', dimensione: 'idratanti', grado: 2, competenza: 'est-trattamenti',
        docente: 'Talasso: trattamento remineralizzante a base di oligominerali contro il rilassamento cutaneo.',
        studente: 'Ho fatto un trattamento con alghe o sali marini (talasso)',
        lessico: { forte: ['talasso*', 'alghe', 'oligominerali', 'remineralizzant*', 'sali marini'],
          debole: ['viso'] } },
      { id: 'ben14-2.3', codice: '2.3', origine: 'FVG', dimensione: 'idratanti', grado: 3, competenza: 'est-trattamenti',
        docente: 'Idratante «benessere»: trattamenti SPA con cioccolato, miele e altri ingredienti aromatici.',
        studente: 'Ho fatto un trattamento viso di benessere con cioccolato o miele',
        lessico: { forte: ['cioccolat*', 'maschera al miele', 'trattamento al miele', 'aromatic*'],
          debole: ['rituale', 'spa', 'benessere'] } },
      { id: 'ben14-2.4', codice: '2.4', origine: 'FVG', dimensione: 'idratanti', grado: 4, competenza: 'est-trattamenti',
        docente: 'Idratante con attrezzature: alta frequenza, ultrasuoni o radiofrequenza.',
        studente: 'Ho fatto un trattamento idratante al viso con un apparecchio',
        lessico: { forte: ['idrat* * ultrasuon*', 'ultrasuon* * idrat*', 'idrat* * alta frequenza', 'idrat* * radiofrequenz*'],
          debole: ['alta frequenza', 'ultrasuon*', 'radiofrequenz*', 'apparecchi*'] } },
      // ---------- 3. Sebo-riequilibranti / dermopurificanti ----------
      { id: 'ben14-3.1', codice: '3.1', origine: 'FVG', dimensione: 'purificanti', grado: 1, competenza: 'est-trattamenti',
        docente: 'Trattamento equilibrante: detersione profonda con prodotti dermopurificanti e seboregolatori.',
        studente: 'Ho fatto un trattamento purificante per pelle grassa',
        lessico: { forte: ['seboregol*', 'seboequilibrant*', 'sebo equilibrant*', 'riequilibrant*', 'dermopurificant*', 'purificant* * viso', 'pelle grassa', 'pelli grasse', 'pori dilatati'],
          debole: ['purificant*', 'sebo', 'pori', 'viso'] } },
      { id: 'ben14-3.2', codice: '3.2', origine: 'FVG', dimensione: 'purificanti', grado: 2, competenza: 'est-trattamenti',
        docente: 'Pulizia del viso: vapore per aprire i pori, estrazione, prodotti dermopurificanti.',
        studente: 'Ho fatto una pulizia del viso',
        lessico: { forte: ['pulizia del viso', 'pulizia viso', 'pulizie del viso', 'pulizia * viso', 'vapor*', 'vapozon*', 'estrazion*', 'comedon*', 'punti neri'],
          debole: ['pulizia', 'pori', 'viso'] } },
      { id: 'ben14-3.3', codice: '3.3', origine: 'FVG', dimensione: 'purificanti', grado: 3, competenza: 'est-trattamenti',
        docente: 'Dermopurificante «benessere»: trattamento delicato con oligoelementi per purificare, regolare, opacizzare e riparare.',
        studente: 'Ho fatto un trattamento purificante delicato di benessere',
        lessico: { forte: ['oligoelement*', 'opacizzant*'],
          debole: ['rituale', 'spa', 'purificant*'] } },
      { id: 'ben14-3.4', codice: '3.4', origine: 'FVG', dimensione: 'purificanti', grado: 4, competenza: 'est-trattamenti',
        docente: 'Dermopurificante con attrezzature: alta frequenza, microdermoabrasione, ultrasuoni o laser.',
        studente: 'Ho fatto un trattamento purificante con un apparecchio',
        lessico: { forte: ['microdermoabrasion*', 'microdermabrasion*', 'purific* * alta frequenza', 'alta frequenza * purific*'],
          debole: ['alta frequenza', 'ultrasuon*', 'laser', 'apparecchi*'] } },
      // ---------- 4. Dermolenitivi ----------
      { id: 'ben14-4.1', codice: '4.1', origine: 'FVG', dimensione: 'lenitivi', grado: 1, competenza: 'est-trattamenti',
        docente: 'Trattamento lenitivo ed elasticizzante con bendaggi imbevuti di principi attivi lenitivi, calmanti, decongestionanti.',
        studente: 'Ho fatto un trattamento lenitivo per pelle sensibile o arrossata',
        lessico: { forte: ['lenitiv*', 'calmant*', 'pelle sensibile', 'pelli sensibili', 'arrossament*', 'arrossat*', 'couperose'],
          debole: ['bend*', 'bandelett*', 'viso'] } },
      { id: 'ben14-4.2', codice: '4.2', origine: 'FVG', dimensione: 'lenitivi', grado: 2, competenza: 'est-trattamenti',
        docente: 'Lenitivo «benessere»: trattamenti calmanti con rituali manuali in ambienti multisensoriali.',
        studente: 'Ho fatto un rituale lenitivo di benessere',
        lessico: { forte: ['rituale lenitiv*', 'rituale calmant*'],
          debole: ['rituale', 'spa', 'multisensorial*'] } },
      { id: 'ben14-4.3', codice: '4.3', origine: 'FVG', dimensione: 'lenitivi', grado: 3, competenza: 'est-trattamenti',
        docente: 'Lenitivo con attrezzature: ultrasuoni per stimolare il rinnovamento cellulare e l\'elasticità.',
        studente: 'Ho fatto un trattamento lenitivo con gli ultrasuoni',
        lessico: { forte: ['lenitiv* * ultrasuon*', 'ultrasuon* * lenitiv*'],
          debole: ['ultrasuon*', 'apparecchi*'] } },
      // ---------- 5. Anti age ----------
      { id: 'ben14-5.1', codice: '5.1', origine: 'FVG', dimensione: 'antiage', grado: 1, competenza: 'est-trattamenti',
        docente: 'Anti age «ridefinire»: trattamento elasticizzante con bendaggi e principi attivi che stimolano collagene ed elastina.',
        studente: 'Ho fatto un trattamento anti age (rughe, elasticità)',
        lessico: { forte: ['anti age', 'antiage', 'anti eta', 'antieta', 'antirughe', 'rughe', 'collagene', 'elastin*', 'elasticizzant*', 'rassodant*'],
          debole: ['bend*', 'bandelett*', 'viso'] } },
      { id: 'ben14-5.2', codice: '5.2', origine: 'FVG', dimensione: 'antiage', grado: 2, competenza: 'est-trattamenti',
        docente: 'Anti age «benessere»: trattamenti ossigenanti ed elasticizzanti con rituali manuali multisensoriali.',
        studente: 'Ho fatto un rituale anti age di benessere',
        lessico: { forte: ['ossigenant*', 'rituale anti age', 'rituale antiage'],
          debole: ['rituale', 'spa'] } },
      { id: 'ben14-5.3', codice: '5.3', origine: 'FVG', dimensione: 'antiage', grado: 3, competenza: 'est-trattamenti',
        docente: 'Anti age con attrezzature: radiofrequenza o laser di fotoringiovanimento.',
        studente: 'Ho fatto un trattamento anti age con un apparecchio',
        lessico: { forte: ['fotoringiovaniment*', 'radiofrequenz* * rughe', 'rughe * radiofrequenz*', 'anti age * radiofrequenz*'],
          debole: ['radiofrequenz*', 'laser', 'apparecchi*'] } }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MAPPA;
  else (radice.BC_MAPPE = radice.BC_MAPPE || []).push(MAPPA);
})(typeof window !== 'undefined' ? window : globalThis);
