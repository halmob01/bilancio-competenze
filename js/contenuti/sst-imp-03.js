/* Mappa delle situazioni di lavoro: SST-IMP-03 «Installazione di impianti elettrici civili» (EQF 3), indirizzo Elettrico.
   CONTENUTO, non codice: il motore è js/situazioni.js.

   Fonte della struttura: Regione Friuli Venezia Giulia, Repertorio delle qualificazioni regionali, settore «Meccanica,
   impianti, automotive», versione 1.7 (gennaio 2020), Parte 2 «Installazione e manutenzione di impianti elettrici,
   termoidraulici, termosanitari»: SST-IMP-03, versione 4 del 15/01/2020, correlata al QPR-IMP-03 «Installazione di impianti
   elettrici civili», EQF 3. I testi «docente» sono una RIFORMULAZIONE delle situazioni FVG: per l'uso formale fa fede la scheda.

   Aggancio lombardo: Regione Lombardia, DGR 3192/2020, Allegato B2 qualifiche, figura 21 Operatore elettrico, indirizzo
   «Installazione/manutenzione di impianti elettrici civili», competenza «Realizzare impianti elettrici ad uso civile nel rispetto
   della normativa di settore e delle indicazioni contenute nel progetto» (el-civili in js/competenze.js), stessa ADA dell'Atlante:
   ADA.7.56.165 «Installazione/manutenzione di impianti elettrici civili e del terziario».
   La situazione C.1 non è nella SST-IMP-03: viene dalla competenza comune agli indirizzi «Effettuare le verifiche di funzionamento
   dell'impianto elettrico…» (el-verifiche). In FVG le verifiche hanno un QPR proprio (QPR-IMP-09), ma di livello EQF 4.

   grado e soglia: come in sst-ict-05.js (grado = ordine di numerazione; soglia da leggere sulla scheda originale).
   Stato: BOZZA da rivedere con i docenti di Elettrico. */
(function (radice) {
  'use strict';

  const MAPPA = {
    id: 'SST-IMP-03',
    titolo: 'Installazione di impianti elettrici civili',
    indirizzo: 'elettrico',
    eqf: 3,
    stato: 'bozza',
    versione: '0.1 del 27/11/2026',
    fonte: {
      sst: 'Regione FVG, Repertorio delle qualificazioni regionali, Meccanica impianti automotive, v. 1.7 (gennaio 2020), SST-IMP-03 v. 4',
      qpr: 'QPR-IMP-03 Installazione di impianti elettrici civili, EQF 3',
      url: 'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/formazione-lavoro/formazione/FOGLIA15/allegati/Meccanica_Impianti_Automotive_-_Repertorio_2020_Gennaio.pdf',
      lombardia: 'DGR 3192/2020, Allegato B2 qualifiche, figura 21 Operatore elettrico, indirizzo impianti civili',
      ada: ['ADA.7.56.165']
    },
    soglia: null,
    dimensioni: [
      { id: 'canalizzazioni', numero: 1, titolo: 'Canalizzazioni' },
      { id: 'cavi', numero: 2, titolo: 'Cavi' },
      { id: 'componenti', numero: 3, titolo: 'Componenti ed apparecchiature' },
      { id: 'quadri', numero: 4, titolo: 'Quadri elettrici civili' },
      { id: 'protezione', numero: 5, titolo: 'Impianti di protezione' },
      { id: 'verifiche', numero: 6, titolo: 'Verifiche di funzionamento (aggiunta CFP)' }
    ],
    situazioni: [
      // ---------- 1. Canalizzazioni ----------
      { id: 'imp03-1.1', codice: '1.1', origine: 'FVG', dimensione: 'canalizzazioni', grado: 1, competenza: 'el-civili',
        docente: 'Canalizzazioni sottotraccia: scanalatura, posa di tubazioni e scatole da incasso, con allineamento, sorpassi e raccordi.',
        studente: 'Ho fatto le tracce nel muro e messo tubi e scatole da incasso',
        lessico: { forte: ['sottotraccia', 'scanalat*', 'tracc* * muro', 'tracce', 'scatol* * incasso', 'scatol* 503', 'corrugat*', 'muratur*'],
          debole: ['tub*', 'scatol*', 'incass*'] } },
      { id: 'imp03-1.2', codice: '1.2', origine: 'FVG', dimensione: 'canalizzazioni', grado: 2, competenza: 'el-civili',
        docente: 'Canalizzazioni a vista: posa e fissaggio di tubi, canali e scatole a vista, anche in vani tecnici.',
        studente: 'Ho montato tubi, canaline e scatole a vista',
        lessico: { forte: ['a vista', 'canalin*', 'canalett*', 'canale portacavi', 'canali portacavi', 'tubo rigido', 'tubi rigidi', 'vano tecnico', 'vani tecnici', 'passerell*'],
          debole: ['tassell*', 'fissat*', 'tub*', 'scatol*'] } },
      { id: 'imp03-1.3', codice: '1.3', origine: 'FVG', dimensione: 'canalizzazioni', grado: 3, competenza: 'el-civili',
        docente: 'Canalizzazioni interrate: posa di tubazioni e pozzetti per condutture elettriche interrate.',
        studente: 'Ho posato tubi e pozzetti sottoterra',
        lessico: { forte: ['interrat*', 'pozzett*', 'cavidott*', 'sottoterra', 'scav*'],
          debole: ['tub*'] } },
      { id: 'imp03-1.4', codice: '1.4', origine: 'FVG', dimensione: 'canalizzazioni', grado: 4, competenza: 'el-civili',
        docente: 'Tracciatura dei percorsi di tubazioni, canali, scatole, quadri e pozzetti (sottotraccia, a vista o interrati).',
        studente: 'Ho segnato sul muro dove passano tubi, scatole e quadri',
        lessico: { forte: ['tracciatur*', 'tracciat* * percors*', 'segnat* * muro', 'segnat* * percors*', 'percors* * tub*', 'filo a piombo', 'livella'],
          debole: ['percors*', 'segn*', 'misur*'] } },
      // ---------- 2. Cavi ----------
      { id: 'imp03-2.1', codice: '2.1', origine: 'FVG', dimensione: 'cavi', grado: 1, competenza: 'el-civili',
        docente: 'Posa di cavi per circuiti luce e prese in ambienti interni.',
        studente: 'Ho infilato i cavi dei circuiti luce e prese',
        lessico: { forte: ['infil*', 'sonda', 'tirafil*', 'circuit* luce', 'circuit* prese', 'circuit* * luce', 'fase e neutro', 'fase neutro', 'conduttor*'],
          debole: ['cav*', 'fil*', 'circuit*'] } },
      { id: 'imp03-2.2', codice: '2.2', origine: 'FVG', dimensione: 'cavi', grado: 2, competenza: 'el-civili',
        docente: 'Posa delle dorsali per la distribuzione dell\'energia nell\'unità abitativa.',
        studente: 'Ho posato la linea principale (dorsale) che porta corrente in casa',
        lessico: { forte: ['dorsal*', 'linea principale', 'linee principali'],
          debole: ['cav*', 'linea'] } },
      { id: 'imp03-2.3', codice: '2.3', origine: 'FVG', dimensione: 'cavi', grado: 3, competenza: 'el-civili',
        docente: 'Posa di cavi per luci e prese in aree esterne, rispettando i gradi di protezione.',
        studente: 'Ho portato luci e prese all\'esterno (giardino, terrazzo)',
        lessico: { forte: ['all esterno', 'esterni', 'giardin*', 'terrazz*', 'balcon*', 'grado ip', 'ip55', 'ip 55', 'ip65', 'ip 65', 'ip44', 'ip 44'],
          debole: ['esterno', 'cav*'] } },
      { id: 'imp03-2.4', codice: '2.4', origine: 'FVG', dimensione: 'cavi', grado: 4, competenza: 'el-civili',
        docente: 'Posa di cavi nei servizi condominiali (ingressi, scale, autorimesse, centrali termiche) con gradi di protezione adeguati.',
        studente: 'Ho posato cavi nelle parti comuni di un condominio',
        lessico: { forte: ['condomin*', 'vano scala', 'vani scala', 'androne', 'centrale termica', 'parti comuni', 'aree comuni', 'garage'],
          debole: ['scale', 'cav*'] } },
      { id: 'imp03-2.5', codice: '2.5', origine: 'FVG', dimensione: 'cavi', grado: 5, competenza: 'el-civili',
        docente: 'Posa dei montanti: cavi di alimentazione monofase o trifase dal punto di prelievo ai quadri delle utenze.',
        studente: 'Ho posato i cavi dal contatore ai quadri (montanti)',
        lessico: { forte: ['montant*', 'contator*', 'punto di prelievo', 'punti di prelievo'],
          debole: ['cav*', 'alimentazion*'] } },
      // ---------- 3. Componenti ed apparecchiature ----------
      { id: 'imp03-3.1', codice: '3.1', origine: 'FVG', dimensione: 'componenti', grado: 1, competenza: 'el-civili',
        docente: 'Montaggio e collegamento di apparecchi di comando e prese: interruttori, deviatori, pulsanti, dimmer, prese.',
        studente: 'Ho collegato interruttori, deviatori, pulsanti o prese',
        lessico: { forte: ['deviat*', 'invertit*', 'pulsant*', 'dimmer', 'punto luce', 'punti luce', 'frutt*', 'placc*', 'prese', 'presa', 'schuko', 'interruttore della luce', 'comando * luce', 'accension*'],
          debole: ['interruttor*', 'collegat*', 'luce'] } },
      { id: 'imp03-3.2', codice: '3.2', origine: 'FVG', dimensione: 'componenti', grado: 2, competenza: 'el-civili',
        docente: 'Montaggio di corpi illuminanti per ambienti ordinari: apparecchi da incasso, plafoniere, sospensioni.',
        studente: 'Ho montato lampade, plafoniere o faretti',
        lessico: { forte: ['plafonier*', 'lampadar*', 'farett*', 'sospension*', 'corpo illuminant*', 'corpi illuminant*', 'lampad*', 'led'],
          debole: ['luce', 'luci'] } },
      { id: 'imp03-3.3', codice: '3.3', origine: 'FVG', dimensione: 'componenti', grado: 3, competenza: 'el-civili',
        docente: 'Montaggio di componenti: relè, temporizzatori, interruttori crepuscolari, sensori, trasformatori SELV.',
        studente: 'Ho montato relè, temporizzatori, crepuscolari o sensori',
        lessico: { forte: ['rele', 'passo passo', 'temporizzator*', 'crepuscolar*', 'sensor*', 'rilevator* * presenza', 'trasformator*', 'selv', 'minuteri*', 'timer'],
          debole: ['component*'] } },
      { id: 'imp03-3.4', codice: '3.4', origine: 'FVG', dimensione: 'componenti', grado: 4, competenza: 'el-civili',
        docente: 'Installazione di corpi illuminanti per ambienti particolari, con le protezioni adeguate (autorimesse, cantine).',
        studente: 'Ho montato luci speciali per cantine, garage o ambienti umidi',
        lessico: { forte: ['plafonier* stagn*', 'lampad* stagn*', 'stagna', 'stagne', 'cantin*', 'autorimess*', 'ambient* umid*', 'ambienti particolari'],
          debole: ['lampad*', 'luci', 'protezion*'] } },
      // ---------- 4. Quadri elettrici civili ----------
      { id: 'imp03-4.1', codice: '4.1', origine: 'FVG', dimensione: 'quadri', grado: 1, competenza: 'el-civili',
        docente: 'Montaggio e cablaggio di quadri civili monofase: centralini domestici, quadretti di montante.',
        studente: 'Ho montato e cablato il quadretto (centralino) di un appartamento',
        lessico: { forte: ['centralin*', 'quadrett*', 'quadro monofase', 'quadri monofase', 'quadro * appartamento', 'quadro di casa', 'magnetotermic*', 'differenzial*', 'salvavita', 'guida din', 'barra din'],
          debole: ['quadr*', 'cabl*', 'interruttor*'] } },
      { id: 'imp03-4.2', codice: '4.2', origine: 'FVG', dimensione: 'quadri', grado: 2, competenza: 'el-civili',
        docente: 'Montaggio e cablaggio di quadri civili trifase, domestici o condominiali.',
        studente: 'Ho montato e cablato un quadro trifase',
        lessico: { forte: ['quadro trifase', 'quadri trifase', 'quadro * trifase', 'quadro condominial*', 'quadri condominial*', 'quadro * condominio'],
          debole: ['trifase', 'quadr*', 'cabl*'] } },
      // ---------- 5. Impianti di protezione ----------
      { id: 'imp03-5.1', codice: '5.1', origine: 'FVG', dimensione: 'protezione', grado: 1, competenza: 'el-civili',
        docente: 'Collegamenti equipotenziali principali e supplementari e collettore di terra.',
        studente: 'Ho fatto i collegamenti di terra (equipotenziali) e il collettore',
        lessico: { forte: ['equipotenzial*', 'collettor* * terra', 'nodo * terra', 'giallo verde', 'gialloverde', 'eqp', 'eqs'],
          debole: ['terra'] } },
      { id: 'imp03-5.2', codice: '5.2', origine: 'FVG', dimensione: 'protezione', grado: 2, competenza: 'el-civili',
        docente: 'Collegamento dei limitatori di sovratensione (SPD) all\'impianto elettrico e di terra.',
        studente: 'Ho collegato i limitatori di sovratensione (SPD)',
        lessico: { forte: ['sovratension*', 'spd', 'scaricator*', 'limitator*'],
          debole: ['protezion*'] } },
      { id: 'imp03-5.3', codice: '5.3', origine: 'FVG', dimensione: 'protezione', grado: 3, competenza: 'el-civili',
        docente: 'Realizzazione dell\'impianto di dispersione con dispersori intenzionali e di fatto.',
        studente: 'Ho realizzato l\'impianto di terra con i dispersori (picchetti)',
        lessico: { forte: ['dispersor*', 'picchett*', 'impianto di terra', 'messa a terra', 'impianti di terra'],
          debole: ['terra'] } },
      { id: 'imp03-5.4', codice: '5.4', origine: 'FVG', dimensione: 'protezione', grado: 4, competenza: 'el-civili',
        docente: 'Protezione dalle scariche atmosferiche: impianto di captazione e calate (LPS).',
        studente: 'Ho lavorato a un parafulmine (captazione e calate)',
        lessico: { forte: ['parafulmin*', 'captazion*', 'calat*', 'fulmin*', 'scariche atmosferiche', 'lps'],
          debole: ['protezion*'] } },
      // ---------- 6. Verifiche (aggiunta CFP) ----------
      { id: 'imp03-c1', codice: 'C.1', origine: 'CFP', dimensione: 'verifiche', grado: 1, competenza: 'el-verifiche',
        docente: 'Verifiche di funzionamento dell\'impianto prima della messa in tensione: continuità, isolamento, prova dei differenziali (Allegato B2, competenza «Effettuare le verifiche di funzionamento dell\'impianto elettrico»).',
        studente: 'Ho controllato l\'impianto con gli strumenti prima di dare tensione',
        lessico: { forte: ['multimetro', 'tester', 'misur* * tension*', 'misurat*', 'continuita', 'isolamento', 'megger', 'collaud*', 'verificat* * impianto', 'verific* * impianto', 'prima di dare tensione', 'prova * differenzial*'],
          debole: ['controll*', 'verific*', 'prov*', 'tension*', 'misur*'] } }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MAPPA;
  else (radice.BC_MAPPE = radice.BC_MAPPE || []).push(MAPPA);
})(typeof window !== 'undefined' ? window : globalThis);
