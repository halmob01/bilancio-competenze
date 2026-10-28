# Stato del prototipo V1

Data: 28 ottobre 2026.

## Che cosa c'è

Il percorso completo in sei sezioni, utilizzabile da smartphone e da computer, con salvataggio locale, copia scaricabile e ricaricabile, stampa del dossier. L'identità visiva segue `design.md`:

- palette Babel (`--bc-paper`, `--bc-ink`, `--bc-red` solo come segnale, `--bc-mist` per i blocchi d'aiuto, `--bc-blush` per gli avvisi);
- Anton per apertura e nome nel dossier, Geist per tutta l'interfaccia, EB Garamond solo per le citazioni del dossier e il testo per l'open day, Geist Mono per i metadati;
- indice laterale da 1200px, barra sottile con nome della sezione e stato su mobile; colonna introduzione (5/12) e colonna risposta (7/12) separate da un filetto da 1000px;
- pulsanti pill da almeno 44–48px, scelte come righe testuali esplicite, focus sempre visibile, `prefers-reduced-motion` rispettato, animazione d'ingresso di 220ms solo al cambio di schermata.

## Scelte fatte in autonomia, da confermare

1. **Sei sezioni.** `design.md` nomina esplicitamente Esperienze, Che cosa so fare, Bilancio e Orientamento. Ho aggiunto «Il tuo percorso» (indirizzo e ricordi dei quattro anni, che fanno da promemoria per le esperienze) e «Uno sguardo critico» (scuola, tirocinio, che cosa devo ancora imparare), per dare spazio ai giudizi anche critici richiesti dal §2.
2. **Soglie di completamento.** Percorso: indirizzo e almeno tre righe fra anni e tirocinio. Esperienze: almeno due schede con titolo, quando e azione. Che cosa so fare: tutte e sei le situazioni con una risposta, e un esempio dove si dichiara di saper fare. Lo stato «Completa» è un'indicazione per lo studente, non blocca la navigazione.
3. **«Con aiuto» rientra in «So fare»**, con l'indicazione «con aiuto» ben visibile. In alternativa si potrebbe spostarlo in una voce «Sto imparando».
4. **Un campo per tre significati.** Nella sezione 03 il secondo campo cambia domanda con la risposta: «Come l'hai imparato?» se lo sai fare, «Che cosa ti servirebbe?» se non ancora, «Ti piacerebbe affrontarlo?» se mai. Se lo studente cambia risposta, il testo già scritto resta.
5. **Raccolta in un Foglio Google** tramite Apps Script del docente, una riga per studente aggiornata a ogni invio (vedi `docs/FOGLIO-GOOGLE.md`).
6. **I ricordi dei quattro anni non entrano nel dossier**: servono solo come promemoria nella sezione 02.

## Decisioni aperte

- **Codice di classe.** L'URL dello script è pubblico; un codice dettato in aula ridurrebbe il rischio di righe false.
- **Vista docente.** Per ora è il foglio stesso; il JSON dell'ultima colonna permette di ricaricare nell'app il lavoro di uno studente.
- **Dettatura.** Non implementata (design.md §9).
- **Contenuti.** Le domande e gli esempi per indirizzo sono una prima stesura da rivedere con i docenti di Elettrico, Informatica ed Estetica, anche rispetto alle competenze del repertorio regionale.

## Verifiche da fare in classe

- Durata reale del percorso (stimata in circa tre ore, non misurata).
- Leggibilità su telefoni economici e con zoom del testo al 200%.
- Navigazione con lettore di schermo (VoiceOver, TalkBack): la struttura è semantica ma non è stata provata con tecnologie assistive reali.
- Verifica del contrasto dell'indicatore rosso sui radio selezionati: lo stato è comunicato anche dal bordo nero più spesso, non dal solo colore.
