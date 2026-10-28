# Bilancio di competenze — Brand identity & UI design system

**Stato:** proposta V1 da sottoporre a revisione; non è ancora un'interfaccia implementata.  
**Progetto:** bilancio riflessivo delle competenze per studenti del quarto anno IeFP (Elettrico, Informatica, Estetica), con doppio esito: autovalutazione e racconto per orientamento/open day.  
**Scelta di fondo:** **colori da Babel** + **font, struttura editoriale, proporzioni e spazio da sito-filosofia**. Nessuna nuova palette inventata.

## 1. Fonti reali e provenienza

Repository consultati (branch `main`):
- Babel: `halmob01/babel-sito`, file `styles/base.css`, `styles/editorial.css`, `styles/home.css`, `styles/pages.css`.
- Filosofia: `halmob01/sito-filosofia`, file `css/tokens.css`, `css/base.css`, `css/layout.css`, `css/components.css`.

Distinzione fondamentale: **Babel fornisce SOLO la palette** in questa identità. **Sito-filosofia fornisce tipografia, layout, ritmi, componenti editoriali e logica di leggibilità**. Non copiare da Babel il font Neue Haas o gli effetti dello storytelling; non copiare da filosofia i colori lilla.

## 2. Posizionamento e tono visivo

Un *quaderno di lavoro editoriale interattivo*, non un gestionale HR, non un portfolio pubblicitario, non un quiz infantile.  
Attributi: **adulto, rigoroso, contemporaneo, leggibile, misurato, personale**.

Il design deve aiutare a ricordare esperienze, fornire prove di competenza e formulare giudizi anche critici su scuola e tirocinio. Evitare di trasformare l'autovalutazione in un voto o un premio.

### Identità verbale

Nome progetto: **Bilancio di competenze**.  
Sottotitolo operativo suggerito: **Quattro anni. Che cosa hai imparato?**  
Testo d'avvio: «Ricostruisci le esperienze del tuo percorso, riconosci ciò che sai fare e individua quello che devi ancora imparare.»  
Tono: diretto, rispettoso, non enfatico; domande concrete e non slogan motivazionali.

Esempi:
- Sì: «Racconta un problema che hai risolto durante un tirocinio.»
- Sì: «Che cosa non sapevi fare prima? Quale aiuto ti è servito?»
- No: «Scopri i tuoi superpoteri!», «Diventa la versione migliore di te!», «Sblocca il prossimo livello!»

## 3. Sistema cromatico — estratto da Babel

I valori seguenti sono **originali**, dal `:root` di `babel-sito/styles/base.css`:

| Ruolo | Token | HEX | Impiego |
|---|---|---|---|
| Sfondo principale | `--bc-paper` | `#FAF8F6` | tele della pagina |
| Testo e pulsanti principali | `--bc-ink` | `#000000` | testo, tratti, azioni primarie |
| Accento | `--bc-red` | `#FF3B30` | progresso, stato attivo, segni, numeri selezionati |
| Secondario caldo | `--bc-blush` | `#FFC9C2` | note visive, blocchi occasionali |
| Fondo evidenza | `--bc-mist` | `#FFF0ED` | spiegazioni, casi professionali, esempi |

Da Babel anche `--ink-60`, `--ink-30`, `--ink-10` come neri con opacità 60%, 30%, 8%. Il bianco `#FFFFFF` è una superficie funzionale neutra già presente nelle UI.

**Regola di contrasto:** non usare il rosso Babel come colore di testo piccolo sul fondo chiaro e non usare bianco su rosso per testo normale senza adeguata verifica del contrasto; il rosso è un *segnale*, non il colore del corpo testuale. Preferire nero su rosso o nero su rosa; gli stati non devono dipendere dal solo colore.

Distribuzione visiva indicativa: 75–85% carta chiara; 10–20% testo/linee nero; rosso in accenti piccoli e focalizzati; rosa e mist solo dove servono. Non introdurre altri colori per i tre indirizzi: la stessa identità vale per tutti.

## 4. Tipografia — da sito-filosofia

Font effettivamente dichiarati in `sito-filosofia/css/tokens.css` e caricati da `css/base.css`:

- **Anton** (display): titoli principali, numeri di sezione e grandi parole isolabili. Mai per lunghi paragrafi. Font condensato, senza bisogno di fingere pesi che non possiede.
- **Geist** (interfaccia): domande, spiegazioni brevi, pulsanti, selettori, risposta scritta, microtesti.
- **EB Garamond** (narrativa, con misura): brevi estratti del racconto personale, testo conclusivo destinato all'open day, blocchi di lettura; **non** per etichette o form.
- **Geist Mono** (metadati): `01 / 06`, «TIROCINIO», «SALVATO», indicatori e piccoli dettagli editoriali.

Corrispondenza con fonti: `--f-display: Anton`, `--f-sans: Geist`, `--f-libro: EB Garamond`, `--f-mono: Geist Mono`.

Scala proposta **adattata alla funzione**, mantenendo le proporzioni del sito-filosofia:
- H1 apertura Anton uppercase: `clamp(56px, 10vw, 120px)`, line-height `0.90`.
- Titolo di sezione Geist 600: `clamp(30px, 5vw, 48px)`, line-height `1.08`.
- Domanda principale Geist 600: `clamp(24px, 3.2vw, 36px)`, line-height `1.15`.
- Corpo istruzioni Geist 400: `clamp(17px, 1.5vw, 19px)`, line-height `1.55–1.62`.
- Racconto conclusivo EB Garamond: `clamp(20px, 2vw, 23px)`, line-height `1.48`.
- Metadati Geist Mono: `12–14px` con spaziatura misurata.

Non impiegare EB Garamond per un lungo questionario su smartphone: il centro dell'esperienza deve rimanere Geist.

## 5. Layout — da sito-filosofia

- **Griglia responsive:** 4 colonne mobile, 8 tablet (da 768px), 12 desktop (da 1200px).
- **Gap:** 14px mobile, 20px tablet, 24px desktop.
- **Margini:** 20px mobile (16px su schermi sotto 360px), da 28 a 72px su tablet/desktop.
- **Massimo contenitore:** 1720px (ereditato), ma la colonna di testo resta stretta.
- **Misura del testo:** circa 54ch per Geist; niente istruzioni a tutta larghezza.
- **Ritmo verticale:** sezioni ampie, riferimento `clamp(64px, 12vw, 100px)`; fino a `clamp(96px, 9vw, 140px)` su desktop.
- **Distribuzione desktop:** nella fase di lavoro usare 4–5 colonne per introduzione/promemoria e 7–8 per la risposta, con filetto divisorio; su mobile una sola colonna.

**Adattamento necessario:** il sito-filosofia permette sezioni narrative immersive; qui però c'è un compito di 3 ore. Niente scroll obbligati da molte viewport, niente transizioni che ostacolino la compilazione. Spazio sì, dispersione no.

## 6. Grammatica grafica

Metafore visive: **indice editoriale**, **timeline del percorso**, **nota a margine**, **filetto**, **numero grande**, **documento annotato**, **traccia di avanzamento**.

Componenti:
1. **Apertura** — Anton su fondo carta; un sommario breve in Geist; piccolo segno rosso. No hero fotografico.
2. **Indice di percorso** — 6 sezioni, numerazione Geist Mono `01—06`; sul desktop rail laterale discreto; sul mobile barra sottile con nome tappa e stato.
3. **Domanda** — titolo Geist, una consegna alla volta, esempio concreto apribile e non imposto.
4. **Scheda esperienza** — superficie carta o bianca, bordo sottile, angoli lievemente arrotondati (raggio 8px); contesto, azione, prova, difficoltà, autonomia.
5. **Scala di autonomia** — selettore a opzioni testuali esplicite; mai sola scala numerica o emoji.
6. **Campo racconto** — textarea larga, leggibile, con spazio sufficiente; pulsante «Detta la risposta» solo se una soluzione privacy-compatibile è disponibile; trascrizione sempre rivedibile.
7. **Blocco di aiuto** — superficie `--bc-mist`, filetto verticale, testo Geist; pochi casi reali adattati agli indirizzi.
8. **Bilancio finale** — impaginazione tipo dossier, con sezioni chiare, citazioni in EB Garamond e margini ampi; possibilità di stampa e salvataggio.
9. **Pulsanti** — pill come in sito-filosofia: primaria nera con testo bianco; secondaria trasparente con bordo nero. Altezze almeno 44–48px.
10. **Progresso** — sottile linea nera con indicatore rosso; testo sempre presente («Sezione 2 di 6»).

### Componenti da NON introdurre
- badge di gamification, XP, confetti, mascotte;
- colori diversi per Elettrico / Informatica / Estetica;
- icone grandi ornamentali, carte con grandi ombre, dashboard aziendale standard;
- foto stock di studenti o professionisti, illustrazioni 3D, gradienti decorativi;
- progressi mostrati come giudizi di valore sulla persona.

## 7. Sequenza UI di riferimento

### Home
Titolo `BILANCIO DI COMPETENZE` (Anton)  
Sottotitolo `Quattro anni. Che cosa hai imparato?` (Geist)  
Spiegazione sobria in 2 frasi. Pulsante nero `Inizia`. Piccola indicazione «Puoi tornare sulle risposte per correggerle».

### Sezione «Le esperienze»
`01 / 06` (Geist Mono); titolo «Le esperienze che ricordi» (Geist).  
Timeline I–IV anno e tirocinio non rigidamente legati a una sola annualità. Possibilità di aggiungere esperienze multiple. Nei casi suggeriti distinguere tra *esempio* e *cosa ho fatto davvero*.

### Sezione «Che cosa so fare»
Domande organizzate per situazioni, non per elenchi ministeriali. Esempi filtrati per indirizzo ma categorie comuni: capire / fare / collaborare / verificare / spiegare / migliorare. Le competenze professionali e di base si intrecciano.

### Sezione «Bilancio»
Pagina tipo documento: **So fare / Ho imparato così / Posso dimostrarlo / Devo ancora imparare**. Dossier non valutativo, con rimandi alle risposte originali.

### Sezione «Orientamento»
Testo per presentarsi agli open day. Possibilità di rivedere la trascrizione prima di salvare. Nessuna riscrittura automatica che falsifichi o edulcori le difficoltà dichiarate.

## 8. Comportamento e movimento

Motion sobrio come principio, non imitazione degli effetti più scenografici:
- cambi tappa fluidi 180–260ms;
- apparizione leggera di blocchi, senza animazioni complesse;
- microfeedback su salvataggio, con testo («Salvato» e, se disponibile, orario);
- nessun audio automatico, parallax, effetto glitch o movimento continuo;
- `prefers-reduced-motion` rispettato.

Il comportamento non deve distrarre mentre si leggono e si scrivono risposte personali.

## 9. Requisiti accessibilità e didattica

- Contrasto WCAG AA per testo normale; contrasto del focus visibile; target minimo 44px.
- Percorso utilizzabile completamente da tastiera, screen reader e smartphone.
- Risposte aperte editabili; salvataggio esplicito o autosalvataggio trasparente; ripresa senza perdita di dati.
- Nessuna competenza dichiarata «acquisita» sulla sola base di un click: richiedere almeno un esempio.
- Opzione `Non l'ho mai affrontato`, distinta da `Non lo so fare`.
- La possibilità di dettare/trascrivere è **funzione futura condizionata a una verifica tecnica della privacy**. Non introdurre trascrizione browser remota sotto l'etichetta «dati solo nel Drive».
- Raccolta dati: destinazione esclusiva Google Drive controllato dal docente; definire autenticazione e permessi prima dello sviluppo. Nessuna telemetria di terzi aggiunta implicitamente.

## 10. Token CSS iniziali (solo riferimento, non ancora implementazione)

```css
:root {
  /* Babel — valori originali */
  --bc-paper: #FAF8F6;
  --bc-ink: #000000;
  --bc-red: #FF3B30;
  --bc-blush: #FFC9C2;
  --bc-mist: #FFF0ED;
  --bc-white: #FFFFFF;
  --bc-ink-60: rgba(0, 0, 0, .6);
  --bc-ink-30: rgba(0, 0, 0, .3);
  --bc-ink-10: rgba(0, 0, 0, .08);

  /* sito-filosofia — famiglie tipografiche */
  --f-display: "Anton", Impact, "Arial Narrow", sans-serif;
  --f-sans: "Geist", system-ui, sans-serif;
  --f-libro: "EB Garamond", Garamond, serif;
  --f-mono: "Geist Mono", ui-monospace, monospace;

  /* sito-filosofia — griglia e ritmo */
  --cols: 4;
  --gap: 14px;
  --m: 20px;
  --max: 1720px;
  --measure: 54ch;
  --space-section: clamp(64px, 12vw, 100px);
  --radius-card: 8px;
  --radius-control: 999px;
}
@media (max-width: 359px) { :root { --m: 16px; } }
@media (min-width: 768px) {
  :root { --cols: 8; --gap: 20px; --m: clamp(28px, 4vw, 72px); }
}
@media (min-width: 1200px) {
  :root { --cols: 12; --gap: 24px; --space-section: clamp(96px, 9vw, 140px); }
}
```

I font dovranno essere self-hosted, come in sito-filosofia, senza copiare file binari non necessari nella fase di specifica.

## 11. Verifiche prima di approvare la V1

- Provare home, una domanda e bilancio finale a 390px e a 1440px.
- Verificare che il rosso sia un accento e non invada la pagina.
- Verificare la leggibilità di Anton sui titoli lunghi e l'uso sobrio di EB Garamond.
- Una sola domanda principale per schermata; né home chilometrica né microstep inutili.
- Verificare contrasto, navigazione e completamento senza audio.
- Separare sempre **identità visiva** da **standard IeFP e logica dei dati**.

---

**Decisione da portare avanti:** Babel = tavolozza; sito-filosofia = sistema editoriale. Il risultato è autonomo, destinato a studenti di quarta e non infantile. Questa identità è una proposta V1, pronta per essere criticata prima dell'implementazione.
