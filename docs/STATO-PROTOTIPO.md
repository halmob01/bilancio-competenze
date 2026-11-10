# Stato del prototipo V1

Data: 28 ottobre 2026.

## Che cosa c'è

Il percorso completo in sei sezioni, utilizzabile da smartphone e da computer, con salvataggio locale, copia scaricabile e ricaricabile, stampa del dossier. L'identità visiva segue `design.md`:

- palette Babel (`--bc-paper`, `--bc-ink`, `--bc-red` solo come segnale, `--bc-mist` per i blocchi d'aiuto, `--bc-blush` per gli avvisi);
- Anton per apertura e nome nel dossier, Fira Sans per tutta l'interfaccia, EB Garamond solo per le citazioni del dossier e il testo per l'open day, Fira Mono per i metadati;
- indice laterale da 1200px, barra sottile con nome della sezione e stato su mobile; colonna introduzione (5/12) e colonna risposta (7/12) separate da un filetto da 1000px;
- pulsanti pill da almeno 44–48px, scelte come righe testuali esplicite, focus sempre visibile, `prefers-reduced-motion` rispettato, animazione d'ingresso di 220ms solo al cambio di schermata.

## Scelte fatte in autonomia, da confermare

1. **Sei sezioni.** `design.md` nomina esplicitamente Esperienze, Che cosa so fare, Bilancio e Orientamento. Ho aggiunto «Il tuo percorso» (indirizzo e ricordi degli anni frequentati, che fanno da promemoria per le esperienze) e «Uno sguardo critico» (scuola, tirocinio, che cosa devo ancora imparare), per dare spazio ai giudizi anche critici richiesti dal §2.
2. **Soglie di completamento.** Percorso: indirizzo e almeno tre righe fra anni e tirocinio. Esperienze: almeno due schede con titolo, quando e azione. Che cosa so fare: tutte e sei le situazioni con una risposta e un esempio dove si dichiara di saper fare. Lo stato «Completa» è un'indicazione per lo studente, non blocca la navigazione.
3. **«Con aiuto» rientra in «So fare»**, con l'indicazione «con aiuto» ben visibile. In alternativa si potrebbe spostarlo in una voce «Sto imparando».
4. **Un campo per tre significati.** Nella sezione 03 il secondo campo cambia domanda con la risposta: «Come l'hai imparato?» se lo sai fare, «Che cosa ti servirebbe?» se non ancora, «Ti piacerebbe affrontarlo?» se mai. Se lo studente cambia risposta, il testo già scritto resta.
5. **Raccolta in un Foglio Google** tramite Apps Script del docente, una riga per studente aggiornata a ogni invio (vedi `docs/FOGLIO-GOOGLE.md`).
6. **I ricordi degli anni frequentati non entrano nel dossier**: servono solo come promemoria nella sezione 02.
7. **Curriculum vitae** (fino al 10 novembre 2026 sezione 06 del bilancio, oggi il sito `/cv/`: vedi in fondo), costruito sulle voci del modello della scuola (foto, indirizzo, nazionalità, occupazione desiderata, esperienze con mansione e compiti, istruzione, lingue, software, interessi, formula di consenso, luogo/data/firma); data di nascita, nazionalità, patente e foto sono facoltative. Tre modelli a scelta: «Europass» (struttura del formato europeo: intestazione anagrafica, esperienza lavorativa, istruzione e formazione, tabella delle lingue compilata dalle scelte dello studente: per ogni lingua una frase semplice come «Me la cavo nel quotidiano» (le scelte vanno da «Poche parole e frasi semplici» a «Come un madrelingua», per chi è bilingue), valida per tutte le abilità o scelta abilità per abilità; i codici A1-C2 compaiono solo nella tabella, non nell'interfaccia, patente, blu #0E4194; cambiando modello da o verso Europass le correzioni scritte a mano sul foglio decadono; il logo Europass è in testa al foglio (`img/europass-logo.png`, scaricato dal sito ufficiale); manca la griglia di autovalutazione delle competenze digitali), «Contemporaneo» (predefinito, l'impaginazione originale: profilo, formazione, esperienze; titoli grigi) e «Classico» (ispirato al modello della scuola: esperienze prima della formazione, titoli del modello, titoli e linee colorati). La grafica non è identica a quella del modello Word. Tirocini, apprendistati e lavori si scrivono in una schermata propria (tipo, azienda, città, date dal calendario o «ancora in corso», mansione, compiti), con tutte le voci che servono (fino a 10) e un aiuto per riprendere il testo dalle schede della sezione 02. Compaiono dalla più recente alla più vecchia, se le date sono state scelte dal calendario. Non viene inviato al docente, per non raccogliere recapiti personali nel foglio: se serve, è una scelta da prendere con le famiglie e la scuola.
8. **Formula di consenso** in fondo al curriculum, solo se lo studente la attiva: è il testo del modello della scuola (art. 13 D. Lgs. 196/2003 e Reg. UE 2016/679), da far verificare perché il D. Lgs. 196/2003 è stato modificato nel tempo.
9. **Aspetto e correzioni sul foglio.** Colore, carattere, dimensione e firma si cambiano senza ricostruire il documento; il testo si corregge cliccandoci sopra (incolla solo testo semplice). Le correzioni a mano non cambiano le risposte e decadono se lo studente modifica i dati.

## Decisioni aperte

- **Codice di classe.** L'URL dello script è pubblico; un codice dettato in aula ridurrebbe il rischio di righe false.
- **Vista docente.** Per ora è il foglio stesso; il JSON dell'ultima colonna permette di ricaricare nell'app il lavoro di uno studente.
- **Dettatura.** Non implementata (design.md §9).
- **Curriculum.** Il formato è una pagina A4 semplice. Da verificare con i docenti: quali voci chiedere (per esempio la data di nascita), se aggiungere il formato europeo e se raccogliere il curriculum nel foglio.
- **Contenuti.** Le domande e gli esempi per indirizzo sono una prima stesura da rivedere con i docenti di Elettrico, Informatica ed Estetica, anche rispetto alle competenze del repertorio regionale.

## Verifiche da fare in classe

- Durata reale del percorso (stimata in circa tre ore, non misurata).
- Leggibilità su telefoni economici e con zoom del testo al 200%.
- Navigazione con lettore di schermo (VoiceOver, TalkBack): la struttura è semantica ma non è stata provata con tecnologie assistive reali.
- Verifica del contrasto dell'indicatore rosso sui radio selezionati: lo stato è comunicato anche dal bordo nero più spesso, non dal solo colore.

## Revisione UX del 3 novembre 2026

Modifiche solo all'interfaccia e ai testi visibili. **Lo script del docente (`apps-script/Codice.gs`) non è stato toccato** e i dati inviati hanno la stessa forma di prima: stessa versione, stessi id di situazioni, livelli, periodi e indirizzi. Due test (`tests/apps-script.test.cjs`) bloccano questo contratto: se gli id dell'app e quelli dello script divergono, i test falliscono.

- **Font.** Fira Sans per interfaccia e metadati (niente più Geist e niente carattere monospazio): le famiglie scendono a tre.
- **Desktop.** Contenitore centrato di 1240px, home a due colonne con l'indice a destra, barra di avanzamento allineata al contenuto.
- **Percorso più corto.** «Che cosa so fare» è una sola schermata con sei blocchi (da «Torna alla risposta» nel bilancio ci si porta sul blocco giusto). Nelle esperienze restano in vista sei campi; contesto, autonomia e situazioni stanno in «Aggiungi dettagli». Nelle situazioni si può riprendere il testo da un'esperienza.
- **Lessico.** Frasi di autonomia più corte; «da documentare» diventa «manca ancora un esempio»; meno testo di contorno; una sola indicazione di avanzamento.
- **Errori e conferme.** Al posto di `alert` e `confirm` del browser ci sono dialoghi dell'app. Se per l'invio mancano nome o indirizzo, la prima schermata lo dice subito e il dialogo porta lì.
- **Usabilità.** Metadati a 14px senza maiuscolo; «Le tue risposte» diventa «Salva e stampa»; «Avanti» resta visibile su schermi stretti; i campi di testo crescono mentre si scrive; i tre indirizzi sono in colonna.

Non toccati: `apps-script/Code.gs` e `Index.html` (versione alternativa con accesso a codice, non collegata all'app); conviene decidere con il docente se tenerla.

## Tutti gli anni

Nella prima schermata lo studente indica che anno frequenta. Da lì il percorso si adatta: la schermata dei ricordi chiede solo degli anni già vissuti (più il tirocinio), i periodi delle esperienze offrono solo quegli anni (più tirocinio e «fuori da scuola»), il bilancio mostra l'anno nell'intestazione e la sezione «Il tuo percorso» risulta completa con una riga per ogni anno vissuto (fino a un massimo di tre). Se l'anno non è scelto si mostrano tutti gli anni. Se lo studente cambia anno i testi già scritti restano. I **tirocini non hanno un numero fisso**: la scansione tradizionale (alternanza simulata o tirocinio al primo anno, un tirocinio al secondo, due al terzo, uno al quarto) ha molte eccezioni e personalizzazioni, quindi la schermata dei ricordi ha un solo campo, «Alternanza o tirocini», valido per qualunque percorso e per qualunque anno («scrivi di tutti quelli che hai fatto»), e la domanda dello sguardo critico parla di «l'alternanza e i tirocini». Nel foglio del docente arriva tutto nella colonna «Tirocinio (ricordi)», come prima. Gli esempi non parlano di anni che lo studente non ha ancora vissuto. I testi non parlano più di «quarto anno».

Lo script del docente non cambia: i dati dei ricordi mantengono le stesse chiavi (`anno1` ... `anno4`, `tirocinio`) e il nuovo campo `anno` del profilo viene ignorato dal foglio. Per ora l'anno non compare nel foglio: il docente lo legge dalla colonna Classe.

## Curriculum in Word e in PDF

Nell'anteprima del curriculum ci sono due pulsanti, entrambi senza servizi esterni e senza inviare dati. Partono dal foglio mostrato a schermo, quindi includono le correzioni scritte a mano, e riproducono i tre modelli (Contemporaneo, Classico, Europass con logo e tabella delle lingue), colore, carattere, dimensione, foto e firma.

- **Scarica in Word** crea un `.docx` con i caratteri **incorporati nel file** (Fira Sans, Anton, EB Garamond; Arial per il carattere «Semplice», che è già in ogni computer): chi lo apre trova gli stessi caratteri del sito anche senza averli installati. Nel Word il grassetto di Fira Sans è il Bold (700) invece del SemiBold (600) del sito. Verificato con LibreOffice, che usa i caratteri incorporati pur non avendoli installati, e con `python-docx`; **non provato con Microsoft Word**: va controllato su Windows e su Mac (Word per Mac legge i caratteri incorporati dalle versioni recenti).
- **Scarica in PDF** crea il PDF direttamente, con il testo selezionabile e gli stessi caratteri incorporati (per «Semplice» Liberation Sans, equivalente di Arial). L'impaginazione è stata confrontata con il PDF che produce la stampa del browser: stesso numero di pagine e stessa struttura, con differenze minime di spaziatura. Il PDF non applica la crenatura (kerning) fra le lettere. Se la creazione non riesce, l'app propone di aprire la finestra di stampa.

I caratteri incorporati sono sottoinsiemi latini (lettere accentate comprese) di file con licenza OFL, in `fonts/ttf/`: un nome con caratteri fuori da questo insieme (per esempio cirillico o arabo) comparirebbe con un segno di riserva.

I contenuti didattici (domande, esempi, frasi dei livelli) restano per ora come esempi da rivedere con i docenti. Lo script del Foglio Google resta quello attuale: l'app è un prototipo e la raccolta dei dati verrà ripensata (vedi sotto).

## Backend: da decidere

Per salvare cv e diari di tutti gli studenti nelle cartelle di rete della scuola serve un servizio che riceva i file e li scriva in quelle cartelle: un sito statico non può scrivere su una cartella di rete. Prima di costruire qualcosa vanno chiarite alcune cose (dove sono i file della scuola, chi amministra la rete, come si identificano gli studenti, privacy dei minori). Vedi la discussione con il docente.

## Diario di bordo (prototipo)

Primo prototipo del diario del tirocinio in `diario/`, sito a parte sullo stesso indirizzo del bilancio. Il collegamento va dal diario al bilancio: il bilancio e il curriculum importano i tirocini dello studente, dallo stesso dispositivo o da una copia del diario caricata da file (vedi [DIARIO.md](DIARIO.md)); il diario non legge nulla dal bilancio. Le ore non si chiedono (8 al giorno). Vale quanto detto per il bilancio: contenuti e domande sono esempi da rivedere con i docenti, il salvataggio è sul dispositivo e il backend di rete verrà deciso in un secondo momento.

Cose rimandate a un aggiornamento futuro (dettatura vocale con il metodo scelto, backend sulla rete della scuola, script del foglio): vedi [FUTURO.md](FUTURO.md).

Importazione dal diario con più tirocini: nessun numero fisso e nessun doppione per errore. Due tirocini nella stessa azienda in anni diversi restano due proposte distinte (il titolo si distingue dal periodo, per esempio «Tirocinio presso Officina Verde (dal 03/2025)») e si possono inserire entrambi nel bilancio e nel curriculum. Anche una lingua sola è un caso previsto: solo la madrelingua, solo una lingua straniera o nessuna, in tutti e tre i modelli e nelle esportazioni.

## Pagina iniziale e curriculum come sito a parte (10 novembre 2026)

Primo intervento verso un portale con più strumenti che si parlano (vedi la discussione sul portfolio): il progetto ora è fatto di tre siti sullo stesso indirizzo e di una pagina iniziale. **Il contenuto e il funzionamento del bilancio, del curriculum e del diario non cambiano**: cambiano gli indirizzi e il modo in cui si scambiano i dati.

- **Pagina iniziale** (`/`): tre card semplici (diario di bordo, bilancio di competenze, curriculum), nella stessa grafica, senza script. Il bilancio si sposta da `/` a `/bilancio/`; il vecchio indirizzo apre la pagina iniziale.
- **Curriculum** (`/cv/`): sei passi (i tuoi dati, che lavoro cerchi, formazione, esperienze di lavoro, competenze, anteprima), con Word, PDF e stampa. Ha il suo salvataggio (`cv-v1`) e la sua logica (`js/cv.js`). Prima il nome veniva dalla sezione 01 del bilancio: ora ha il suo campo (con l'indirizzo di studio, che serve agli esempi).
- **Importazione dal bilancio**, solo su richiesta e in sola lettura: nome e indirizzo di studio (pulsante nel primo passo), schede esperienza con un'azione scritta («Riprendi il testo da una tua esperienza del bilancio») e competenze dichiarate e documentate («Proponi dalle mie risposte»). Il bilancio si legge dal salvataggio dello stesso browser o da una copia `.json` caricata. Il diario si importa come prima.
- **Nessuna perdita di dati**: chi aveva già scritto il curriculum dentro il bilancio lo ritrova. Il primo dei due siti aperto lo copia in `cv-v1` (il bilancio lo fa prima di salvarsi senza, il curriculum se non trova il proprio); una vecchia copia `.json` del bilancio si può caricare anche nel curriculum.
- **Foglio Google**: invariato. L'invio parte dal bilancio, con lo stesso contenuto e lo stesso metodo di prima (provato intercettando la richiesta), e non è mai stato incluso il curriculum. L'indirizzo della pagina non conta per lo script, che non controlla l'origine. Le righe del foglio restano le stesse perché il codice anonimo dello studente è nel salvataggio del bilancio, che non cambia chiave.
- **Link «Tutti i percorsi»** nella testata dei tre siti (sotto i 640px nella schermata iniziale di ciascuno, perché la testata di lavoro è piena). Sostituisce la regola «nessun pulsante tra i siti» del diario.
- **Da sapere**: l'interfaccia del curriculum duplica una parte degli elementi di base di quella del bilancio (campi, dialoghi), come già fa il diario; un modulo condiviso è un passo successivo. Le schermate in `docs/guida/` sono quelle di prima e mostrano ancora il curriculum dentro il bilancio.

## Bilancio più corto e meno vago (10 novembre 2026)

Dalle prime prove con studenti: il bilancio era troppo complesso, da desktop era una colonna stretta e lunga (fino a circa 7.000 px nella schermata «Che cosa sai fare»), e nelle esperienze gli studenti scrivevano «tirocinio» in generale. **Cambia l'interfaccia, non i dati**: il modello salvato, gli id di situazioni, livelli, periodi e indirizzi e il contenuto inviato al Foglio Google restano quelli di prima (lo bloccano `tests/apps-script.test.cjs` e i test del bilancio); chi ha già dei dati salvati li ritrova.

- **Desktop.** Da 1200px l'indice non è più una colonna a sinistra ma una striscia orizzontale sopra il lavoro (vale anche per curriculum e diario); il lavoro usa tutta la larghezza: una fascia di spiegazione in alto e sotto il lavoro. Dove ci sono elenchi (esperienze, esempi) da 900px l'**elenco sta a sinistra e la voce aperta a destra**; sul telefono una voce per volta, con «Torna all'elenco». Il dossier finale è su due colonne a schermo (la stampa non cambia).
- **Che cosa hai fatto** (prima «Le esperienze che ricordi»). Si sceglie **dove** (a scuola o in laboratorio, in tirocinio o alternanza, fuori da scuola; per la scuola anche l'anno) e si racconta **una cosa precisa per volta**, raggruppate per contesto. I campi in vista passano da otto a sei (azione, nome, difficoltà e aiuto affiancati, prova; il resto in «Altri dettagli»). Il contesto raggruppa i periodi già esistenti (`D.CONTESTI`): nessun campo nuovo. Chi ha esperienze senza periodo le trova in «Da collocare». Il tirocinio del diario si importa come prima.
- **Controllo di vaghezza** (`L.vaghezza`, `L.titoloGenerico`, in `js/bilancio.js`): mentre si scrive compare un suggerimento se l'azione è «tirocinio», «ho fatto il tirocinio», «ho fatto lo stage in azienda» o ha meno di sei parole, e se il nome è solo «Tirocinio» o «Scuola». Non blocca niente, non riscrive niente e non cambia il completamento. Le frasi riconosciute sono una lista corta da correggere con gli esempi veri degli studenti.
- **Che cosa so fare in due tempi.** 1) Una schermata con le sei situazioni, una riga ciascuna (da desktop cinque scelte in fila, sul telefono un selettore). 2) Gli esempi, con l'elenco delle situazioni e il dettaglio: per quelle dichiarate «so fare» si **collega una cosa già raccontata** oppure si scrive l'esempio (come l'hai imparato è facoltativo); per le altre una riga facoltativa. Le regole sono quelle di sempre: senza esempio la voce resta «da documentare» (un'esperienza collegata vale come esempio), «mai affrontato» è diverso da «non lo so ancora fare». Il campo «Riprendi il testo da una tua esperienza» non c'è più: il collegamento basta. Da «Torna alla risposta» nel dossier si arriva alla situazione giusta.
- **Sguardo critico** su una sola schermata, con le tre domande affiancate da desktop (id delle risposte invariati).
- **Misure** (studente di prova, desktop 1440): le schermate passano da 10 a 9. «Che cosa sai fare» da circa 6.970 px a circa 1.800 + 1.480 px in due schermate; lo sguardo critico da tre schermate a una; il dossier da circa 4.050 a circa 3.180 px. Non è una misura sugli studenti: **la durata del percorso («circa tre ore») va rimisurata**.
- **Non fatto, da decidere dopo le prossime prove**: «Il tuo percorso in poche righe» (un campo libero per anno e per il tirocinio) resta, anche se si sovrappone alle cose fatte; il testo per l'open day resta una sezione del percorso; l'estetica degli elenchi va provata con studenti su telefoni veri.

