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
7. **Curriculum vitae** (sezione 06, prima dell'orientamento), costruito sulle voci del modello della scuola (foto, indirizzo, nazionalità, occupazione desiderata, esperienze con mansione e compiti, istruzione, lingue, software, interessi, formula di consenso, luogo/data/firma); data di nascita, nazionalità, patente e foto sono facoltative. Tre modelli a scelta: «Europass» (struttura del formato europeo: intestazione anagrafica, esperienza lavorativa, istruzione e formazione, tabella delle lingue compilata dalle scelte dello studente: per ogni lingua una frase semplice come «Me la cavo nel quotidiano» (le scelte vanno da «Poche parole e frasi semplici» a «Come un madrelingua», per chi è bilingue), valida per tutte le abilità o scelta abilità per abilità; i codici A1-C2 compaiono solo nella tabella, non nell'interfaccia, patente, blu #0E4194; cambiando modello da o verso Europass le correzioni scritte a mano sul foglio decadono; il logo Europass è in testa al foglio (`img/europass-logo.png`, scaricato dal sito ufficiale); manca la griglia di autovalutazione delle competenze digitali), «Contemporaneo» (predefinito, l'impaginazione originale: profilo, formazione, esperienze; titoli grigi) e «Classico» (ispirato al modello della scuola: esperienze prima della formazione, titoli del modello, titoli e linee colorati). La grafica non è identica a quella del modello Word. Tirocini, apprendistati e lavori si scrivono in una schermata propria (tipo, azienda, città, date dal calendario o «ancora in corso», mansione, compiti), con tutte le voci che servono (fino a 10) e un aiuto per riprendere il testo dalle schede della sezione 02. Compaiono dalla più recente alla più vecchia, se le date sono state scelte dal calendario. Non viene inviato al docente, per non raccogliere recapiti personali nel foglio: se serve, è una scelta da prendere con le famiglie e la scuola.
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

Nella prima schermata lo studente indica che anno frequenta. Da lì il percorso si adatta: la schermata dei ricordi chiede solo degli anni già vissuti (più il tirocinio), i periodi delle esperienze offrono solo quegli anni (più tirocinio e «fuori da scuola»), il bilancio mostra l'anno nell'intestazione e la sezione «Il tuo percorso» risulta completa con una riga per ogni anno vissuto (fino a un massimo di tre). Se l'anno non è scelto si mostrano tutti gli anni. Se lo studente cambia anno i testi già scritti restano. Dal secondo anno i tirocini possono essere più di uno (uno in prima e uno in seconda, due in terza): si chiedono due campi, «Primo tirocinio» e «Secondo tirocinio», e la domanda dello sguardo critico è al plurale. Nel foglio del docente i due testi arrivano insieme nella colonna «Tirocinio (ricordi)», introdotti da «Primo tirocinio:» e «Secondo tirocinio:», così lo script non cambia. Gli esempi non parlano di anni che lo studente non ha ancora vissuto. I testi non parlano più di «quarto anno».

Lo script del docente non cambia: i dati dei ricordi mantengono le stesse chiavi (`anno1` ... `anno4`, `tirocinio`) e il nuovo campo `anno` del profilo viene ignorato dal foglio. Per ora l'anno non compare nel foglio: il docente lo legge dalla colonna Classe.

## Curriculum in Word e in PDF

Nell'anteprima del curriculum ci sono due pulsanti, entrambi senza servizi esterni e senza inviare dati. Partono dal foglio mostrato a schermo, quindi includono le correzioni scritte a mano, e riproducono i tre modelli (Contemporaneo, Classico, Europass con logo e tabella delle lingue), colore, carattere, dimensione, foto e firma.

- **Scarica in Word** crea un `.docx` con i caratteri **incorporati nel file** (Fira Sans, Anton, EB Garamond; Arial per il carattere «Semplice», che è già in ogni computer): chi lo apre trova gli stessi caratteri del sito anche senza averli installati. Nel Word il grassetto di Fira Sans è il Bold (700) invece del SemiBold (600) del sito. Verificato con LibreOffice, che usa i caratteri incorporati pur non avendoli installati, e con `python-docx`; **non provato con Microsoft Word**: va controllato su Windows e su Mac (Word per Mac legge i caratteri incorporati dalle versioni recenti).
- **Scarica in PDF** crea il PDF direttamente, con il testo selezionabile e gli stessi caratteri incorporati (per «Semplice» Liberation Sans, equivalente di Arial). L'impaginazione è stata confrontata con il PDF che produce la stampa del browser: stesso numero di pagine e stessa struttura, con differenze minime di spaziatura. Il PDF non applica la crenatura (kerning) fra le lettere. Se la creazione non riesce, l'app propone di aprire la finestra di stampa.

I caratteri incorporati sono sottoinsiemi latini (lettere accentate comprese) di file con licenza OFL, in `fonts/ttf/`: un nome con caratteri fuori da questo insieme (per esempio cirillico o arabo) comparirebbe con un segno di riserva.

I contenuti didattici (domande, esempi, frasi dei livelli) restano per ora come esempi da rivedere con i docenti. Lo script del Foglio Google resta quello attuale: l'app è un prototipo e la raccolta dei dati verrà ripensata (vedi sotto).

## Backend: da decidere

Per salvare cv e diari di tutti gli studenti nelle cartelle di rete della scuola serve un servizio che riceva i file e li scriva in quelle cartelle: un sito statico non può scrivere su una cartella di rete. Prima di costruire qualcosa vanno chiarite alcune cose (dove sono i file della scuola, chi amministra la rete, come si identificano gli studenti, privacy dei minori). Vedi la discussione con il docente.
