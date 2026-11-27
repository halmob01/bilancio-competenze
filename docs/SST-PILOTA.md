# Mappe delle situazioni di lavoro (SST): pilota su Informatica, Elettrico ed Estetica

Scritto il 27 novembre 2026. Prime mappe delle situazioni di lavoro e primo motore di associazione automatica. **Non c'è ancora interfaccia**: qui si verifica se mappe e lessico reggono, prima di toccare portfolio e area docenti.

## L'idea in breve

Lo studente scrive che cosa ha fatto, come oggi nel portfolio. Il portale associa l'attività a una o più **situazioni tipo** della SST del suo mestiere. Ogni situazione, lato docente, ha codice, dimensione, competenza del Repertorio lombardo, ADA dell'Atlante e livello. Il docente interviene solo sui casi dubbi. Lo studente non vede sigle né spiegazioni per i docenti.

## Le fonti

**Il metodo.** Il Decreto 12267/2024 (Indicazioni e strumenti, §1.3) indica le SST del Repertorio delle qualificazioni del Friuli Venezia Giulia come riferimento per le casistiche tecnico-professionali fino al IV livello. Il Repertorio FVG definisce la SST come schema di classificazione della complessità esecutiva di una competenza: situazioni lavorative a difficoltà crescente, identificate dalle condizioni di esercizio.

**L'aggancio fra FVG e Lombardia** è il codice ADA dell'Atlante del lavoro, che compare sia nelle schede FVG sia accanto alle competenze dell'Allegato B2 della DGR 3192/2020.

| Indirizzo | Scheda FVG | Competenze lombarde (DGR 3192/2020, All. B2) | ADA |
|---|---|---|---|
| Informatica | **SST-ICT-05** «Integrazione componenti», EQF 3 (QPR-ICT-05, e-CF B.2a). Repertorio «Servizi di informatica», v. 1.8, maggio 2020 | Operatore informatico (fig. 24): installare e configurare (`inf-installare`), manutenzione (`inf-manutenzione`) | ADA.16.239.782 |
| Elettrico | **SST-IMP-03** «Installazione di impianti elettrici civili», EQF 3, v. 4 (QPR-IMP-03). Repertorio «Meccanica, impianti, automotive», v. 1.7, gennaio 2020 | Operatore elettrico (fig. 21), indirizzo impianti civili: realizzare impianti civili (`el-civili`); più le verifiche (`el-verifiche`) | ADA.7.56.165 |
| Estetica | **SST-BEN-13** «Servizi estetici di base (manicure, pedicure, epilazione)» e **SST-BEN-14** «Trattamenti viso», EQF 3, v. 4. Repertorio «Servizi alla persona», v. 1.7, gennaio 2020 | Operatore del benessere (fig. 10), indirizzo trattamento estetico: eseguire i trattamenti di base (`est-trattamenti`), che comprende i trattamenti viso e corpo | ADA.24.137.406 |

I testi «docente» delle situazioni sono una riformulazione delle schede FVG, non il testo ufficiale. Per l'uso formale fa fede la scheda originale.

**Per il IV anno di Informatica** le competenze del Tecnico informatico lombardo riprendono i testi e-CF B.2 e B.4, gli stessi dei QPR FVG. Le candidate naturali sono la SST-ICT-06 (B.2b, EQF 4) e le SST-ICT-13 e 14 (rilascio della soluzione).

## Le mappe

I file sono in `js/contenuti/`, uno per scheda. Sono contenuti: il motore non li conosce e funziona con qualunque mappa nello stesso formato.

| File | Dimensioni | Situazioni | Aggiunte del CFP |
|---|---|---|---|
| `sst-ict-05.js` | sistemi, applicazioni, reti, collaudo e documentazione | 13 FVG | 3: assemblaggio del PC, office, cablaggio della rete (abilità B2) |
| `sst-imp-03.js` | canalizzazioni, cavi, componenti, quadri civili, impianti di protezione | 19 FVG | 1: verifiche prima della messa in tensione (competenza B2 `el-verifiche`; in FVG è il QPR-IMP-09, di livello EQF 4) |
| `sst-ben-13.js` | manicure, pedicure, smalto, epilazione | 15 FVG | nessuna |
| `sst-ben-14.js` | esfoliazione, idratanti, purificanti, lenitivi, anti age | 17 FVG | nessuna |

Ogni situazione ha:
- il codice FVG;
- la dimensione;
- il grado, cioè l'ordine nella colonna;
- la competenza lombarda;
- un testo per lo studente («Ho fatto una pulizia del viso»), uno per il docente e un lessico.

### Da verificare sulle schede originali
- **Soglia di autonomia:** nelle schede FVG è segnata da un colore che nel testo consultato non è leggibile. Il campo `soglia` resta `null` e non è stato inventato.
- **Grado:** è preso dall'ordine di numerazione.
- **SST-BEN-13, situazioni 1.2 e 1.3:** nel testo consultato le descrizioni sembrano quelle dei trattamenti viso (errore di impaginazione). Titolo e numero sono affidabili.
- **SST-BEN-13, situazione 4.4:** l'epilazione permanente con laser, luce pulsata o elettrocoagulazione è nella scheda FVG. Va deciso con i docenti se tenerla, dato che l'uso di questi apparecchi è soggetto a norme specifiche.
- **Aggiunte del CFP:** l'attribuzione delle competenze e le situazioni aggiunte sono proposte da confermare.

## Il motore

File: `js/situazioni.js`. È logica pura: niente DOM, niente rete, niente servizi esterni. Gira nel browser dello studente e nel server.

1. **Punteggio.** Il lessico di ogni situazione ha tre tipi di parole:
   - **forti** (3 punti), che bastano da sole;
   - **deboli** (1 punto, al massimo 2 in tutto), che aiutano solo insieme ad altre;
   - **generiche**: il nome del servizio, come «pedicure» o «ceretta». Valgono come forti solo se il testo non nomina una situazione più precisa della stessa dimensione: «pedicure con il micromotore» va a 2.4, non anche a 2.1.

   I termini di più parole valgono se compaiono in ordine, a poca distanza.
2. **Associazione automatica.** Serve almeno un segnale forte.
   - Per ogni dimensione si tiene la situazione migliore. Un'altra della stessa dimensione si tiene solo se ha un segnale forte suo; se è vicina senza prove proprie, la dimensione è ambigua.
   - **Ogni parola dello studente vale per una sola situazione**: «quadro trifase del condominio» è un quadro (4.2), non anche cavi condominiali (2.4).
   - Si associano al massimo tre situazioni.
3. **Proposta.** Con soli segnali deboli, e senza pari merito, si propone la situazione migliore («È questo?»). Senza risposta dello studente diventa un caso dubbio.
4. **Casi dubbi per il docente.** I motivi possibili sono:
   - `nessuna`: niente nel testo;
   - `ambigua`;
   - `contrasto`: la scelta dello studente non è sostenuta dal testo, che indica con forza un'altra situazione;
   - `contesto`: il luogo non è ammesso;
   - `livello`: la scheda è di livello EQF superiore all'anno;
   - `vuota`.
5. **Lessico che cresce.** Quando il docente aggancia un caso dubbio, `paroleNuove` propone le parole del testo che il lessico non conosce ancora.

Associare non vuol dire validare: lo stato «osservata» resta un atto del docente.

## La prova

Comando: `node strumenti/prova-mappa.cjs`, oppure con il nome di un indirizzo. Le frasi sono in `tests/dati/frasi-<indirizzo>.json`, in tre gruppi:
- **repo:** frasi già presenti nella repo (studente di prova, esempi del bilancio e del portfolio, test);
- **scritte per la prova:** scritte insieme al lessico;
- **variazioni:** scritte dopo, cercando parole che il lessico non contiene.

| Indirizzo | Gruppo | Frasi | Automatiche giuste | Automatiche sbagliate | Proposte | Al docente |
|---|---|---|---|---|---|---|
| Informatica | repo | 23 | 18 | 0 | 0 | 5, tutte corrette |
| | scritte per la prova | 30 | 23 | 1 | 0 | 6, tutte corrette |
| | variazioni | 15 | 5 | 1 | 2 (1 giusta) | 7 (2 corrette) |
| Elettrico | repo | 11 | 6 | 0 | 1 sbagliata | 4 (3 corrette) |
| | scritte per la prova | 18 | 15 | 0 | 1 sbagliata | 2, corrette |
| | variazioni | 12 | 6 | 0 | 0 | 6 (3 corrette) |
| Estetica | repo | 7 | 2 | 0 | 0 | 5, tutte corrette |
| | scritte per la prova | 20 | 16 | 0 | 0 | 4, corrette |
| | variazioni | 12 | 5 | 0 | 1 sbagliata | 6 (4 corrette) |

Le «corrette» al docente sono frasi fuori mappa o troppo vaghe. Una proposta sbagliata non fa danni: lo studente risponde «no» e la frase va al docente.

**Come leggere questi numeri.** Nessuna frase è di uno studente vero. Inoltre le due regole del motore (parole usate una volta sola, nome generico del servizio) sono nate guardando gli errori su Elettrico ed Estetica, compresa una variazione: «plafoniera stagna». Per Elettrico ed Estetica, quindi, anche le variazioni non sono più del tutto «cieche». Il dato affidabile è qualitativo: con parole nuove circa metà delle frasi va al docente, che è il comportamento voluto, e le associazioni automatiche sbagliate sono rare.

**Errori automatici noti** (Informatica):
- «montato ram e processore sulla scheda madre» → C.1 e 1.1: va deciso se montare la RAM in assemblaggio vale anche come potenziamento;
- «ho stampato i documenti per la segretaria» → 4.1, per la parola «documenti». È il tipo di correzione che il lessico deve imparare.

**Esempi di frasi che vanno al docente perché il lessico non conosce le parole:**
- «rotto il muro col flessibile per far passare i tubi»;
- «ho tirato i fili nella stanza»;
- «ho tolto le pellicine e dato la forma a mandorla»;
- «ho pulito la pelle del viso e tolto i brufoli»;
- «settato l'ip del pc a mano».

Con l'aggancio del docente e `paroleNuove` queste parole entrano nel lessico.

## Che cosa serve prima dell'interfaccia

1. **Frasi vere.** Per ogni indirizzo servono 50-100 descrizioni di attività scritte da studenti, anonime e nello stesso formato: `node strumenti/prova-mappa.cjs frasi-classe.json js/contenuti/<mappa>.js`.
2. **Revisione dei docenti di ogni indirizzo:**
   - situazioni aggiunte dal CFP;
   - attribuzione delle competenze;
   - grado e soglia sulla scheda FVG originale;
   - lessico, con le parole del laboratorio;
   - i punti segnalati sopra.
3. **Estensione delle mappe:**
   - le altre competenze di ogni figura, per esempio impianti industriali (QPR-IMP-04), manutenzione (QPR-IMP-08), massaggi e make-up (SST-BEN-16 e 18);
   - le schede di IV livello per il diploma.

## Dopo: dove entra nel portale

- **Portfolio:** nel passo «Che cosa hai fatto», sotto il campo, compare la situazione proposta con «È questo?». La scelta delle competenze di oggi diventa la scelta del lavoro, con «Non lo trovo» in fondo. Nessun passaggio in più.
- **Area docenti:** la scheda SST in formato FVG con le caselle per studente (dichiarata, documentata, osservata), l'elenco «Da agganciare» con i casi dubbi e la proposta di parole nuove.
- **Bilancio, diario, curriculum:** leggono le associazioni senza chiedere niente allo studente.

## Come aggiungere una mappa

1. Crea un nuovo file in `js/contenuti/` con lo stesso formato.
2. Aggiungilo all'elenco `INDIRIZZI` di `strumenti/prova-mappa.cjs`.
3. Controllalo con `S.verificaMappa(mappa, competenze)`: campi obbligatori, id unici, competenze esistenti, lessico, contesti.
4. Provalo sulle frasi di quell'indirizzo.
