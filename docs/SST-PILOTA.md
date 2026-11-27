# Mappa delle situazioni di lavoro: pilota su Informatica (SST-ICT-05)

Scritto il 27 novembre 2026. Prima mappa delle situazioni di lavoro e primo motore di associazione automatica. **Non c'è ancora interfaccia**: qui si verifica se la mappa e il lessico reggono, prima di toccare portfolio e area docenti.

## L'idea in breve

Lo studente scrive che cosa ha fatto, come oggi nel portfolio. Il portale associa l'attività a una o più **situazioni tipo** della SST del suo mestiere. Ogni situazione, lato docente, ha codice, dimensione, competenza del Repertorio lombardo, ADA dell'Atlante e livello. Il docente interviene solo sui casi dubbi. Lo studente non vede sigle né spiegazioni per i docenti.

## Le fonti

- **Struttura della SST:** Regione Friuli Venezia Giulia, Repertorio delle qualificazioni regionali, settore «Servizi di informatica», versione 1.8 (maggio 2020). Si usa la scheda **SST-ICT-05 «Integrazione componenti»**, EQF 3, correlata al QPR-ICT-05 [e-CF B.2a]. Il Repertorio FVG definisce la SST come schema di classificazione della complessità esecutiva di una competenza: situazioni lavorative a difficoltà crescente, identificate dalle condizioni di esercizio. Stessa definizione del Decreto 12267/2024 (Indicazioni e strumenti, §1.3), che indica le SST FVG come riferimento per le casistiche tecnico-professionali fino al IV livello.
- **Aggancio lombardo:** Regione Lombardia, DGR 3192/2020, Allegato B2 qualifiche, figura 24 Operatore informatico. Le due competenze *Installare, configurare e utilizzare supporti informatici…* e *Eseguire la manutenzione ordinaria e straordinaria di sistemi, reti, dispositivi e terminali utenti…* insistono sulla stessa area di attività dell'Atlante, **ADA.16.239.782** «Supporto operativo ai sistemi e alle reti informatiche». È il ponte fra la scheda FVG e il catalogo `js/competenze.js` (`inf-installare`, `inf-manutenzione`).
- **Perché questa scheda:** le competenze del Tecnico informatico lombardo (Allegato B2 diplomi) riprendono alla lettera i testi e-CF B.2 e B.4, gli stessi dei QPR FVG. La SST-ICT-06 (B.2b, EQF 4) e le SST-ICT-13 e 14 (rilascio della soluzione, B.4a e B.4b) sono quindi le candidate naturali per il IV anno.

I testi «docente» delle situazioni sono una riformulazione della scheda FVG, non il testo ufficiale. Per l'uso formale fa fede la scheda originale.

## La mappa

File: `js/contenuti/sst-ict-05.js`. È un contenuto: il motore non lo conosce e funziona con qualunque mappa nello stesso formato.

| Codice | Dimensione | Competenza | Che cosa legge lo studente |
|---|---|---|---|
| C.1 (CFP) | 1. Sistemi | installare | Ho montato un computer pezzo per pezzo |
| 1.1 | 1. Sistemi | installare | Ho installato o aggiornato il sistema operativo, o potenziato un PC (memoria, disco) |
| 1.2 | 1. Sistemi | manutenzione | Ho sostituito un pezzo guasto di un computer e installato i driver |
| 1.3 | 1. Sistemi | installare | Ho salvato i dati di un utente e li ho rimessi a posto (backup e ripristino) |
| 1.4 | 1. Sistemi | installare | Ho preparato un computer per chi lo usa: utenti, desktop, avvio automatico |
| 2.1 | 2. Applicazioni | installare | Ho installato e configurato un browser o un programma di posta |
| 2.2 | 2. Applicazioni | installare | Ho spostato la posta e i contatti di qualcuno su un nuovo computer |
| 2.3 | 2. Applicazioni | installare | Ho installato il programma che usa l'azienda (gestionale o simile) |
| C.2 (CFP) | 2. Applicazioni | installare | Ho installato o configurato i programmi per l'ufficio (Office o simili) |
| C.3 (CFP) | 3. Reti | manutenzione | Ho preparato o controllato i cavi di rete |
| 3.1 | 3. Reti | installare | Ho collegato alla rete un computer, una stampante o un altro dispositivo |
| 3.2 | 3. Reti | installare | Ho configurato un router o uno switch di una rete locale |
| 3.3 | 3. Reti | installare | Ho diviso una rete in sottoreti e configurato i dispositivi in mezzo |
| 4.1 | 4. Collaudo e documentazione | manutenzione | Ho scritto che cosa ho fatto in un rapporto o in una procedura |
| 4.2 | 4. Collaudo e documentazione | manutenzione | Ho provato che tutto funzionasse, anche con test o misure |
| 4.3 | 4. Collaudo e documentazione | manutenzione | Ho trovato e risolto un problema, cercando la soluzione |

- Le **13 situazioni FVG** sono quelle della scheda, con la sua numerazione.
- Le **3 situazioni CFP** non sono nella scheda FVG: vengono dalle abilità dell'Allegato B2 (assemblaggio del PC, cablaggio della rete, office automation). Sono marcate `origine: 'CFP'` e vanno confermate dai docenti.
- **Da verificare sulla scheda originale:**
  - il **grado**, cioè la posizione nella colonna: qui è l'ordine di numerazione;
  - la **soglia** di piena autonomia, che nella scheda FVG è indicata da un colore non leggibile nel testo consultato. Il campo `soglia` resta `null` e non è stato inventato.
- **Assegnazione delle competenze:** l'attribuzione di ogni situazione a «installare» o a «manutenzione» è una proposta. Le due competenze condividono l'ADA e alcune abilità, come il cablaggio.
- **Lessico:** ogni situazione ha parole «forti», che bastano da sole, e «deboli», che aiutano solo insieme ad altre. Il lessico è la parte da far crescere con i docenti.

## Il motore

File: `js/situazioni.js`. È logica pura: niente DOM, niente rete, niente servizi esterni. Gira nel browser dello studente e nel server.

1. **Punteggio.** Ogni situazione prende 3 punti per ogni parola forte trovata e 1 per ogni debole, con un tetto di 2 per le deboli. I termini di più parole valgono se compaiono in ordine, a poca distanza («configurato due stampanti di rete» trova «stampante di rete»).
2. **Associazione automatica.** Serve almeno un segnale forte. Per ogni dimensione si tiene la situazione migliore. Un'altra della stessa dimensione si tiene solo se ha un segnale forte suo: per esempio «backup» e «formattare» sono due cose diverse. Se invece è vicina senza prove proprie, la dimensione è ambigua e non si associa. Dimensioni diverse si sommano: un'installazione più un test. Il massimo è tre situazioni.
3. **Proposta.** Con solo segnali deboli, e senza pari merito, si propone la situazione migliore («È questo?»). Senza risposta dello studente diventa un caso dubbio.
4. **Casi dubbi per il docente.** I motivi possibili sono:
   - `nessuna`: niente nel testo;
   - `ambigua`;
   - `contrasto`: lo studente ha scelto una situazione che il testo non sostiene, mentre ne indica un'altra con forza;
   - `contesto`: il luogo non è ammesso per quella situazione;
   - `livello`: la scheda è di un livello EQF superiore a quello atteso per l'anno;
   - `vuota`.
5. **Lessico che cresce.** Quando il docente aggancia un caso dubbio, `paroleNuove` propone le parole del testo che il lessico non conosce ancora. Il docente le accetta o le scarta.

Associare non vuol dire validare: lo stato «osservata» resta un atto del docente, fuori dal motore.

## La prova

Comando: `node strumenti/prova-mappa.cjs`. Frasi in `tests/dati/frasi-informatica.json`, in tre gruppi.

| Gruppo | Frasi | Automatiche giuste | Automatiche sbagliate | Proposte | Al docente |
|---|---|---|---|---|---|
| Frasi già presenti nella repo (studente di prova, esempi del bilancio e del portfolio, test del diario) | 23 | 18 | 0 | 0 | 5, tutte fuori mappa o troppo vaghe: corretto |
| Frasi scritte per la prova, insieme al lessico | 30 | 23 | 1 | 0 | 6, tutte corrette |
| Variazioni scritte dopo, con parole che il lessico non contiene | 15 | 5 | 1 | 2 (1 giusta) | 7 (2 corrette) |

**Come leggere questi numeri.** Nessuna di queste frasi è di uno studente vero. I primi due gruppi sono scritti dalla stessa mano del lessico e sono ottimisti per costruzione. Il terzo è la stima più onesta: con parole nuove circa una frase su tre finisce al docente, che è il comportamento voluto. Le associazioni automatiche sbagliate restano rare, ma ci sono.

I due errori automatici:
- «montato ram e processore sulla scheda madre» → C.1 *e* 1.1. Montare la RAM rientra nell'assemblaggio, ma la scheda FVG mette il potenziamento della memoria in 1.1. Va deciso dai docenti se in assemblaggio vale anche 1.1.
- «ho stampato i documenti per la segretaria» → 4.1, per la parola «documenti». È fuori mappa. «Documento» da solo è un segnale troppo debole per essere forte: è il tipo di correzione che il lessico deve imparare.

Che cosa va ai docenti tra le variazioni: «ho reinstallato il sistema da capo», «settato l'ip del pc a mano», «ho clonato il disco», «preparato 10 portatili», «ho rimosso un programma che rallentava il pc». Sono attività vere e chiare per un docente, con parole che il lessico non conosceva. Con l'aggancio del docente e `paroleNuove` entrano nel lessico.

## Che cosa serve prima dell'interfaccia

1. **Frasi vere.** Servono 50-100 descrizioni di attività scritte da studenti di Informatica, anonime e copiate nello stesso formato. Sono l'unico modo per tarare soglie e lessico. Lo strumento accetta qualunque file: `node strumenti/prova-mappa.cjs frasi-classe.json`.
2. **Revisione dei docenti di Informatica:**
   - le situazioni CFP;
   - l'assegnazione installare/manutenzione;
   - il grado e la soglia sulla scheda FVG originale;
   - il lessico, con le parole che usano davvero in laboratorio.
3. **Decisioni:**
   - se il IV anno usa la SST-ICT-06 e la SST-ICT-14;
   - come trattare la curvatura ITS del quadriennale.

## Dopo: dove entra nel portale

- **Portfolio:** nel passo «Che cosa hai fatto», sotto il campo, compare la situazione proposta con «È questo?». La scelta delle competenze di oggi diventa la scelta del lavoro, con «Non lo trovo» in fondo. Nessun passaggio in più.
- **Area docenti:** la scheda SST in formato FVG con le caselle per studente (dichiarata, documentata, osservata), l'elenco «Da agganciare» con i casi dubbi e la proposta di parole nuove.
- **Bilancio, diario, curriculum:** leggono le associazioni senza chiedere niente allo studente.

## Come aggiungere una mappa

Un nuovo file in `js/contenuti/` con lo stesso formato. `S.verificaMappa(mappa, competenze)` controlla:
- i campi obbligatori;
- gli id unici;
- le competenze esistenti;
- il lessico presente;
- i contesti validi.

Poi si prova con `strumenti/prova-mappa.cjs` sulle frasi di quell'indirizzo.
