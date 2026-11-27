/* Mappa delle situazioni di lavoro: SST-BEN-13 «Esecuzione dei servizi estetici di base (manicure, pedicure, epilazione)»
   (EQF 3), indirizzo Estetica. CONTENUTO, non codice: il motore è js/situazioni.js.

   Fonte della struttura: Regione Friuli Venezia Giulia, Repertorio delle qualificazioni regionali, settore «Servizi alla
   persona», versione 1.7 (gennaio 2020), processo «Gestione ed erogazione di servizi di trattamenti estetici e di acconciatura»:
   SST-BEN-13, versione 4 del 15/01/2020, correlata al QPR-BEN-13, EQF 3. I testi «docente» sono una RIFORMULAZIONE.
   ATTENZIONE: nel testo consultato le descrizioni delle situazioni 1.2 e 1.3 (manicure) sembrano riprese dai trattamenti viso
   (errore di impaginazione): titolo e numero sono affidabili, la descrizione va controllata sulla scheda originale.

   Aggancio lombardo: Regione Lombardia, DGR 3192/2020, Allegato B2 qualifiche, figura 10 Operatore del benessere, indirizzo
   «Erogazione dei servizi di trattamento estetico», competenza «Eseguire i trattamenti di base, individuando i prodotti cosmetici
   in funzione del trattamento da realizzare» (est-trattamenti in js/competenze.js), ADA.24.137.406 «Realizzazione di trattamenti
   estetici e di benessere fisico». La competenza lombarda comprende anche i trattamenti viso: vedi sst-ben-14.js.

   La situazione 4.4 (epilazione permanente con laser, luce pulsata, elettrocoagulazione) è nella scheda FVG; l'uso di questi
   apparecchi è soggetto a norme specifiche sugli apparecchi per l'estetica: va deciso con i docenti se tenerla per gli studenti.
   Stato: BOZZA da rivedere con i docenti di Estetica. */
(function (radice) {
  'use strict';

  const MAPPA = {
    id: 'SST-BEN-13',
    titolo: 'Esecuzione dei servizi estetici di base (manicure, pedicure, epilazione)',
    indirizzo: 'estetica',
    eqf: 3,
    stato: 'bozza',
    versione: '0.1 del 27/11/2026',
    fonte: {
      sst: 'Regione FVG, Repertorio delle qualificazioni regionali, Servizi alla persona, v. 1.7 (gennaio 2020), SST-BEN-13 v. 4',
      qpr: 'QPR-BEN-13 Esecuzione dei servizi estetici di base, EQF 3',
      url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/formazione-lavoro/formazione/FOGLIA15/allegati/Servizi_alla_persona_-_Repertorio_2020_Gennaio.pdf',
      lombardia: 'DGR 3192/2020, Allegato B2 qualifiche, figura 10 Operatore del benessere, indirizzo trattamento estetico',
      ada: ['ADA.24.137.406']
    },
    soglia: null,
    dimensioni: [
      { id: 'manicure', numero: 1, titolo: 'Esecuzione manicure' },
      { id: 'pedicure', numero: 2, titolo: 'Esecuzione pedicure' },
      { id: 'smalto', numero: 3, titolo: 'Applicazione dello smalto' },
      { id: 'epilazione', numero: 4, titolo: 'Epilazione' }
    ],
    situazioni: [
      // ---------- 1. Manicure ----------
      { id: 'ben13-1.1', codice: '1.1', origine: 'FVG', dimensione: 'manicure', grado: 1, competenza: 'est-trattamenti',
        docente: 'Manicure base: taglio o spinta delle cuticole e limatura delle unghie secondo la forma o la richiesta della cliente.',
        studente: 'Ho fatto una manicure: cuticole e forma delle unghie',
        lessico: { generico: ['manicure'], forte: ['cuticol*', 'limat* * unghi*', 'lim* * unghi*', 'spingipelle', 'tronchesin*', 'forma * unghi*'],
          debole: ['unghi*', 'mani', 'lima'] } },
      { id: 'ben13-1.2', codice: '1.2', origine: 'FVG', dimensione: 'manicure', grado: 2, competenza: 'est-trattamenti',
        docente: 'Manicure con trattamento idratante e/o nutriente delle mani (descrizione da verificare sulla scheda originale).',
        studente: 'Ho fatto un trattamento idratante o nutriente alle mani',
        lessico: { forte: ['paraffin* * mani', 'mani * paraffin*', 'idratant* * mani', 'mani * idratant*', 'nutrient* * mani', 'scrub * mani', 'mani * scrub', 'argill* * mani'],
          debole: ['paraffin*', 'idratant*', 'nutrient*'] } },
      { id: 'ben13-1.3', codice: '1.3', origine: 'FVG', dimensione: 'manicure', grado: 3, competenza: 'est-trattamenti',
        docente: 'Manicure con trattamento schiarente delle mani (descrizione da verificare sulla scheda originale).',
        studente: 'Ho fatto un trattamento schiarente o antimacchia alle mani',
        lessico: { forte: ['schiarent*', 'antimacchi*', 'depigmentant*', 'macchi* * mani'],
          debole: ['macchi*'] } },
      // ---------- 2. Pedicure ----------
      { id: 'ben13-2.1', codice: '2.1', origine: 'FVG', dimensione: 'pedicure', grado: 1, competenza: 'est-trattamenti',
        docente: 'Pedicure base: cuticole, limatura delle unghie, rimozione di duroni e callosità con la raspa.',
        studente: 'Ho fatto una pedicure: unghie, cuticole e duroni',
        lessico: { generico: ['pedicure'], forte: ['duron*', 'callosit*', 'calli', 'raspa'],
          debole: ['pied*', 'unghi*'] } },
      { id: 'ben13-2.2', codice: '2.2', origine: 'FVG', dimensione: 'pedicure', grado: 2, competenza: 'est-trattamenti',
        docente: 'Pedicure con trattamento idratante e/o purificante: esfoliazione con massaggio, poi paraffina o argilla.',
        studente: 'Ho fatto un trattamento idratante o purificante ai piedi',
        lessico: { forte: ['paraffin* * pied*', 'pied* * paraffin*', 'argill* * pied*', 'pied* * argill*', 'scrub * pied*', 'pied* * scrub', 'idratant* * pied*', 'pied* * idratant*'],
          debole: ['paraffin*', 'argill*', 'pied*'] } },
      { id: 'ben13-2.3', codice: '2.3', origine: 'FVG', dimensione: 'pedicure', grado: 3, competenza: 'est-trattamenti',
        docente: 'Trattamenti cheratolitici e decongestionanti: drenanti, vasoprotettori, lenitivi, crioattivi, anche con frese per gli ispessimenti.',
        studente: 'Ho fatto un trattamento per piedi e gambe affaticati o per la pelle ispessita',
        lessico: { forte: ['cheratolitic*', 'decongestionant*', 'gambe pesanti', 'crioattiv*', 'ispessiment*', 'drenant* * pied*', 'drenant* * gambe'],
          debole: ['drenant*', 'gambe', 'pied*'] } },
      { id: 'ben13-2.4', codice: '2.4', origine: 'FVG', dimensione: 'pedicure', grado: 4, competenza: 'est-trattamenti',
        docente: 'Pedicure estetica con micromotore e le principali frese.',
        studente: 'Ho fatto una pedicure con il micromotore e le frese',
        lessico: { forte: ['micromotor*', 'fresa', 'frese', 'fresett*'],
          debole: ['pedicure', 'pied*'] } },
      // ---------- 3. Smalto ----------
      { id: 'ben13-3.1', codice: '3.1', origine: 'FVG', dimensione: 'smalto', grado: 1, competenza: 'est-trattamenti',
        docente: 'Applicazione di smalto colorato: base trasparente e colore, curando l\'insieme della mano.',
        studente: 'Ho messo lo smalto colorato',
        lessico: { forte: ['smalt* colorat*', 'smaltat*', 'smalto normale', 'smalto tradizionale', 'applicat* * smalto', 'mess* * smalto', 'base trasparente'],
          debole: ['smalt*', 'colore'] } },
      { id: 'ben13-3.2', codice: '3.2', origine: 'FVG', dimensione: 'smalto', grado: 2, competenza: 'est-trattamenti',
        docente: 'French: base trasparente, punta bianca a pennello o a spot, copertura con smalto naturale.',
        studente: 'Ho fatto una french',
        lessico: { forte: ['french', 'punta bianca', 'punte bianche', 'lunetta'],
          debole: ['smalt*'] } },
      { id: 'ben13-3.3', codice: '3.3', origine: 'FVG', dimensione: 'smalto', grado: 3, competenza: 'est-trattamenti',
        docente: 'Smalto semipermanente: opacizzazione, primer, base, colore o french, top coat, polimerizzazione con lampada UV o LED.',
        studente: 'Ho messo lo smalto semipermanente con la lampada',
        lessico: { forte: ['semipermanent*', 'lampada uv', 'lampada led', 'lampad* * uv', 'fornett*', 'gel polish', 'primer', 'top coat', 'opacizz*'],
          debole: ['smalt*', 'lampad*'] } },
      { id: 'ben13-3.4', codice: '3.4', origine: 'FVG', dimensione: 'smalto', grado: 4, competenza: 'est-trattamenti',
        docente: 'Semipermanente con nail art: disegni a mano libera o accessori per unghie sul semipermanente.',
        studente: 'Ho fatto una nail art (disegni o decorazioni sulle unghie)',
        lessico: { forte: ['nail art', 'decorazion* * unghi*', 'disegn* * unghi*', 'strass', 'brillantin*', 'decorat* * unghi*'],
          debole: ['disegn*', 'decorazion*'] } },
      // ---------- 4. Epilazione ----------
      { id: 'ben13-4.1', codice: '4.1', origine: 'FVG', dimensione: 'epilazione', grado: 1, competenza: 'est-trattamenti',
        docente: 'Epilazione standard di gambe, braccia e ascelle con cera (al miele o al titanio), strappo contropelo.',
        studente: 'Ho fatto la ceretta a gambe, braccia o ascelle',
        lessico: { generico: ['ceretta', 'cerette'], forte: ['cera * gambe', 'gamb* * cera', 'cera * braccia', 'ascell*', 'cera al miele', 'cera al titanio', 'strisc*', 'contropelo'],
          debole: ['cera', 'epila*', 'depila*', 'gambe', 'braccia'] } },
      { id: 'ben13-4.2', codice: '4.2', origine: 'FVG', dimensione: 'epilazione', grado: 2, competenza: 'est-trattamenti',
        docente: 'Epilazione standard di zone sensibili (inguine, labbro superiore, sopracciglia) con cera a temperatura corporea o a caldo.',
        studente: 'Ho fatto la ceretta in zone delicate (inguine, baffetto, sopracciglia)',
        lessico: { forte: ['inguin*', 'bikini', 'baffett*', 'labbro superiore', 'sopraccigli*', 'cera a caldo', 'cera calda', 'cera tiepida', 'zone sensibili', 'zona sensibile'],
          debole: ['cera', 'viso', 'epila*', 'depila*'] } },
      { id: 'ben13-4.3', codice: '4.3', origine: 'FVG', dimensione: 'epilazione', grado: 3, competenza: 'est-trattamenti',
        docente: 'Epilazione con pasta di zucchero (sugaring), strappo nel verso del pelo.',
        studente: 'Ho fatto l\'epilazione con la pasta di zucchero',
        lessico: { forte: ['pasta di zucchero', 'sugaring', 'zucchero'],
          debole: ['epila*', 'depila*'] } },
      { id: 'ben13-4.4', codice: '4.4', origine: 'FVG', dimensione: 'epilazione', grado: 4, competenza: 'est-trattamenti',
        docente: 'Epilazione permanente con apparecchiature specifiche (laser, luce pulsata, elettrocoagulazione).',
        studente: 'Ho fatto un\'epilazione definitiva con un apparecchio (laser, luce pulsata)',
        lessico: { forte: ['laser', 'luce pulsata', 'ipl', 'elettrocoagulazion*', 'epilazione definitiva', 'epilazione permanente', 'permanente'],
          debole: ['apparecchi*', 'epila*'] } }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MAPPA;
  else (radice.BC_MAPPE = radice.BC_MAPPE || []).push(MAPPA);
})(typeof window !== 'undefined' ? window : globalThis);
