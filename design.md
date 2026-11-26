# Percorsi per gli studenti — Identità visiva

**Stato:** V3, 26 novembre 2026 (senza logo AFOL, nuovo sfondo e nuova impaginazione). Sostituisce la V1 (palette Babel e tipografia di sito-filosofia).
**Fonte del brand:** skill `afol-brand`, copiata dalla repo `halmob01/cfp-news` in [`.claude/skills/afol-brand/`](.claude/skills/afol-brand/SKILL.md). Ogni valore lì è marcato come **Ufficiale** (linee guida AFOL), **Osservato** (misurato su sito e social) o **Proposta**. Qui non si inventano valori: si applicano quelli.
**Vale per:** pagina iniziale, bilancio (`/bilancio/`), curriculum (`/cv/`), diario (`/diario/`) e la pagina Apps Script (`apps-script/Index.html`).

## 1. Architettura di marca

**Senza il logo AFOL** (decisione del 26 novembre 2026): gli strumenti hanno nome proprio (Diario di bordo, Bilancio di competenze, Curriculum) e dal brand AFOL prendono soltanto rosso, Fira Sans e sistema dei cerchi. Nessun logo AFOL in testate, pagine, piè di pagina o favicon.

- Segno dei siti: un tratto di linea che finisce in un anello, rosso, accanto al nome in testata (disegnato in CSS).
- Favicon: lo stesso segno in bianco su un quadrato rosso (`img/icona.svg`, `img/favicon-32.png`, `img/favicon-180.png`).

Tono verbale invariato rispetto alla V1: diretto, rispettoso, non enfatico, domande concrete («Che cosa hai imparato finora?»), niente slogan motivazionali.

**Chi legge vede i siti per la prima volta** (26/11/2026): nessun testo a schermo parla di versioni precedenti, di cose spostate o cambiate. Le prove con pochi studenti non lasciano tracce nell'interfaccia: i loro dati si recuperano in silenzio. I testi su dove sta il lavoro dicono sempre il vero: «solo su questo dispositivo» senza accesso, «anche sul server della scuola» da entrati (attributo `data-con-accesso`).

## 2. Colori

| Ruolo | Token | Valore | Fonte |
|---|---|---|---|
| Rosso (unico) | `--afol-rosso` | `#CC0000` | Ufficiale |
| Rosso al passaggio del mouse | `--afol-rosso-scuro` | `#A30000` | Proposta |
| Titoli | `--afol-nero` | `#1A1A1A` | Proposta |
| Testo | `--afol-grigio-scuro` | `#333333` | Ufficiale |
| Note, metadati | `--afol-grigio-medio` | `#666666` | Ufficiale |
| Fondo della pagina | `--afol-bianco` | `#FFFFFF` | Ufficiale |
| Pannelli di spiegazione, schede della pagina iniziale | `--afol-grigio-chiaro` | `#F5F5F5` | Ufficiale |
| Filetti e bordi delle schede | `--afol-grigio-bordo` | `#CCCCCC` | Ufficiale |
| Bordo dei campi e delle scelte | `--c-bordo-campo` | `#8A8A8A` | Proposta (3,4:1, WCAG 1.4.11) |
| Fondo dei blocchi di aiuto | `--afol-fondo-rosato` | `#FCF3F4` | Osservato |
| Superfici | `--afol-bianco` | `#FFFFFF` | Ufficiale |

Regole: **un solo rosso** e molti neutri; il rosso per pulsanti, occhielli, linee e anelli; mai rosso su rosso; nessun secondo colore saturo, nemmeno per distinguere Elettrico, Informatica ed Estetica. Uno stato non dipende mai dal solo colore (la scelta attiva è anche in grassetto, il passo corrente ha anche il testo «Passo 2 di 6»).

## 3. Carattere

**Fira Sans**, una sola famiglia, self-hosted in `fonts/` (400, 600, 800, 900). Nessuna richiesta a Google Fonts: il sito non fa richieste di rete esterne. La gerarchia nasce dal peso:

| Elemento | Peso | Misura |
|---|---|---|
| H1 delle pagine iniziali, titolo del dossier | 900 | `clamp(36px … 60px)` |
| Titolo di schermata, sottotitolo | 800 | `clamp(24px … 34px)` |
| Titoli di schede e blocchi | 800 | 18–26 px |
| Occhiello (`01 / 06`, gruppi, «SEI SEZIONI») | 600, maiuscolo, spaziatura 0,12 em, rosso | 14 px |
| Testo | 400, interlinea 1,55 | 16–17 px |
| Note | 400, `#666` | 14–15 px |

Titoli in minuscolo, di un solo colore: **nessuna parola evidenziata** con un colore diverso (deciso il 26/11/2026: l'effetto risultava artificioso). La gerarchia la fanno peso e dimensione. Le citazioni dello studente nel dossier restano in Fira Sans, con un filetto rosso a sinistra.

**Eccezione: il foglio del curriculum.** È il documento dello studente, non un materiale AFOL: conserva i suoi modelli (Contemporaneo con Anton, Classico con EB Garamond, Europass) perché l'anteprima deve coincidere con il Word e il PDF generati in `js/docx.js` e `js/pdf.js`. Anton ed EB Garamond restano caricati solo per quello (`--f-cv-display`, `--f-cv-libro`).

## 4. Il sistema dei cerchi

Le sei regole di `reference/cerchi.md`: tratto uniforme (la parete dell'anello è spessa quanto la linea), rosso su chiaro e bianco su rosso, solo orizzontale e verticale, la linea entra dal bordo e finisce in un anello. Usi nell'interfaccia:

- **Fascia d'apertura**: sul rosso, da 900 px, un grande anello bianco (diametro ≈ 3,9 t, foro vuoto) su cui arriva una linea bianca che sale dal bordo basso della fascia.
- **Indice della home di ogni sito**: una linea della metropolitana che entra dal bordo sinistro dello schermo e finisce nell'ultima fermata; un anello per sezione con numero e nome sotto. Sul telefono la linea è verticale.
- **Indice laterale delle schermate di lavoro** (da 1100 px): linea verticale grigia con un anello per sezione; grigio da iniziare, rosso vuoto in corso o completa, rosso pieno la sezione aperta.
- **Avanzamento** (sotto i 1100 px): linea orizzontale con anelli in testata.
- **Pagina iniziale**: una linea attraversa le tre schede, ciascuna con il suo anello.
- **Firma**: la catena dei quattro cerchi (`img/catena.svg`, fori 0,40 D, passo 1,3 D e 2,9 D) sotto il titolo del dossier e, in bianco, nel piè di pagina.
- **Segni piccoli**: l'anello prima del numero di sezione, il segno della testata, i «+» degli esempi apribili.

## 5. Sfondo e impaginazione

- **Fondo bianco** ovunque. Il grigio chiaro `#F5F5F5` segna ciò che spiega (la colonna di introduzione, la fascia di spiegazione sopra il lavoro, le schede della pagina iniziale); il bianco è il posto dove si scrive.
- **Home di ogni sito e pagina iniziale**: si apre con una **fascia rossa a tutta larghezza** (titolo bianco 900, sottotitolo, testo, pulsanti invertiti: bianco pieno con testo rosso, o bordo bianco). Sotto, sul bianco, l'indice come linea con le fermate (o le tre schede dei percorsi).
- **Schermate di lavoro** (rivedute il 26/11/2026, «meno modulo, più lettura»): da 1100 px indice laterale fisso a sinistra (232 px) e lavoro a destra. Il lavoro è **una colonna sola**: occhiello, titolo, un paragrafo d'apertura più grande (al massimo 62 caratteri per riga), poi le domande in una colonna di 760 px. Niente pannelli grigi né colonne affiancate; le parti si separano con lo spazio, non con filetti. L'aiuto è una nota a margine (filetto rosso di 3 px, senza fondo). Le scelte sono su fondo grigio chiaro senza cornice; quella fatta diventa bianca con il bordo rosso e il testo in grassetto. Sotto i 1000 px «Avanti» resta fisso in basso.
- **Piè di pagina** (pagina iniziale): scuro `#1A1A1A`, catena dei cerchi in bianco, una frase sulla privacy.
- Margini 20 px sul telefono (16 sotto i 360), da 28 a 72 px oltre; contenitore di 1240 px; testo fino a circa 66 caratteri. Movimento sobrio (200 ms), `prefers-reduced-motion` rispettato.

## 6. Componenti

- **Pulsante principale**: fondo rosso, testo bianco 600, angoli 6 px, altezza 48 px; hover `#A30000`. Sul rosso è invertito.
- **Pulsante secondario**: bordo 2 px rosso, testo rosso, fondo trasparente; hover fondo rosato.
- **Fuoco da tastiera**: contorno 3 px `#1A1A1A` staccato di 2 px (bianco sulla fascia rossa).
- **Testata**: bianca, filetto rosso di 4 px in alto, «← Tutti i percorsi», segno e nome del sito in 800.
- **Schede**: bianche con bordo 1 px `#CCCCCC`, angoli 6 px; la scheda aperta e il dossier hanno il filetto rosso in alto di 6 px.
- **Aiuto**: nota a margine con filetto rosso di 3 px, senza fondo. **Suggerimenti mentre si scrive**: fondo rosato con filetto rosso.
- **Scelte**: righe su fondo grigio chiaro senza bordo; scelta attiva bianca con bordo rosso, testo in grassetto, radio come anello rosso pieno.
- **Dialoghi**: bianchi con filetto rosso in alto, fondo scurito dietro.

Restano esclusi: badge, punteggi, confetti, mascotte, foto stock, sfumature, ombre pesanti, colori per indirizzo.

## 7. Accessibilità (verificata sui contrasti della skill)

- `#CC0000` su bianco 5,89:1 e su `#F5F5F5` circa 5,4:1: va bene anche per testo normale (occhielli, link).
- Bianco su `#CC0000` 5,89:1: pulsanti e piè di pagina.
- `#333333` su bianco 12,6:1; `#666666` su bianco 5,7:1.
- Bordi dei campi a 3,4:1; target di almeno 44 px; percorso completo da tastiera.
- Gli SVG decorativi dei cerchi sono sfondi CSS, quindi ignorati dagli screen reader.

## 8. File

- `css/tokens.css`: token AFOL e ruoli (`--c-*`) usati dall'interfaccia, `@font-face`.
- `css/stile.css`: componenti, stampa del dossier e del curriculum.
- `img/`: icona dei siti, catena dei cerchi (rossa e bianca), logo Europass del curriculum.
- `.claude/skills/afol-brand/`: il brand kit completo, da consultare per qualsiasi nuovo materiale (anche social, video, slide).
