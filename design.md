# Percorsi per gli studenti — Identità visiva

**Stato:** V2, 26 novembre 2026. Sostituisce la V1 (palette Babel e tipografia di sito-filosofia).
**Fonte del brand:** skill `afol-brand`, copiata dalla repo `halmob01/cfp-news` in [`.claude/skills/afol-brand/`](.claude/skills/afol-brand/SKILL.md). Ogni valore lì è marcato come **Ufficiale** (linee guida AFOL), **Osservato** (misurato su sito e social) o **Proposta**. Qui non si inventano valori: si applicano quelli.
**Vale per:** pagina iniziale, bilancio (`/bilancio/`), curriculum (`/cv/`), diario (`/diario/`) e la pagina Apps Script (`apps-script/Index.html`).

## 1. Architettura di marca

Modello **con garante** (`reference/identita.md`): gli strumenti hanno nome proprio (Diario di bordo, Bilancio di competenze, Curriculum) ed ereditano da AFOL Metropolitana rosso, Fira Sans e sistema dei cerchi.

- Pagina iniziale: logo AFOL a colori in testata (almeno 120 px di larghezza), piè di pagina rosso con il logo negativo.
- Testate dei tre siti: icona quadrata AFOL (bianco su rosso) da 40 px, perché il logo intero sotto i 120 px non si legge (`reference/logo.md`).
- Favicon: l'icona quadrata (`img/favicon-32.png`, `img/favicon-180.png`).
- I loghi sono la **ricostruzione vettoriale non ufficiale** della skill (`img/afol_logo_colore.svg`, `img/afol_logo_negativo.svg`). Se AFOL fornisce i file originali, vanno sostituiti.

Tono verbale invariato rispetto alla V1: diretto, rispettoso, non enfatico, domande concrete («Che cosa hai imparato finora?»), niente slogan motivazionali. È coerente con la voce AFOL (diretta, concreta, «tu» e «noi», senza gergo).

## 2. Colori

| Ruolo | Token | Valore | Fonte |
|---|---|---|---|
| Rosso (unico) | `--afol-rosso` | `#CC0000` | Ufficiale |
| Rosso al passaggio del mouse | `--afol-rosso-scuro` | `#A30000` | Proposta |
| Titoli | `--afol-nero` | `#1A1A1A` | Proposta |
| Testo | `--afol-grigio-scuro` | `#333333` | Ufficiale |
| Note, metadati | `--afol-grigio-medio` | `#666666` | Ufficiale |
| Fondo della pagina | `--afol-grigio-chiaro` | `#F5F5F5` | Ufficiale |
| Filetti e bordi delle schede | `--afol-grigio-bordo` | `#CCCCCC` | Ufficiale |
| Bordo dei campi e delle scelte | `--c-bordo-campo` | `#8A8A8A` | Proposta (3,4:1, WCAG 1.4.11) |
| Fondo dei blocchi di aiuto | `--afol-fondo-rosato` | `#FCF3F4` | Osservato |
| Superfici | `--afol-bianco` | `#FFFFFF` | Ufficiale |

Regole: **un solo rosso** e molti neutri; il rosso per pulsanti, occhielli, parola chiave dei titoli, linee e anelli; mai rosso su rosso; nessun secondo colore saturo, nemmeno per distinguere Elettrico, Informatica ed Estetica. Uno stato non dipende mai dal solo colore (la scelta attiva è anche in grassetto, il passo corrente ha anche il testo «Passo 2 di 6»).

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

Titoli in minuscolo con **una** parola chiave in rosso («Bilancio di *competenze*», «Diario di *bordo*», «Il tuo *curriculum*»). Le citazioni dello studente nel dossier restano in Fira Sans, con un filetto rosso a sinistra.

**Eccezione: il foglio del curriculum.** È il documento dello studente, non un materiale AFOL: conserva i suoi modelli (Contemporaneo con Anton, Classico con EB Garamond, Europass) perché l'anteprima deve coincidere con il Word e il PDF generati in `js/docx.js` e `js/pdf.js`. Anton ed EB Garamond restano caricati solo per quello (`--f-cv-display`, `--f-cv-libro`).

## 4. Il sistema dei cerchi

Le sei regole di `reference/cerchi.md`: tratto uniforme (la parete dell'anello è spessa quanto la linea), rosso su chiaro e bianco su rosso, solo orizzontale e verticale, la linea entra dal bordo e finisce in un anello. Usi nell'interfaccia:

- **Firma**: la catena dei quattro cerchi (`img/catena.svg`, proporzioni misurate: fori 0,40 D, passo 1,3 D e 2,9 D) sotto l'H1 delle pagine iniziali e sotto il titolo del dossier. Solo lì, non a ogni titolo.
- **Percorso**: la barra di avanzamento è una linea con un anello per sezione; anello grigio da fare, anello rosso vuoto completato, anello rosso pieno corrente.
- **Tappe**: nella pagina iniziale una linea entra dal bordo sinistro dello schermo e attraversa le tre schede, ciascuna con il suo anello; sul telefono la linea diventa verticale.
- **Segni piccoli**: l'anello prima del numero di sezione, l'anello sulle voci che mancano di qualcosa, i «+» degli esempi apribili.

## 5. Componenti

- **Pulsante principale**: fondo rosso, testo bianco 600, angoli 6 px, altezza 48 px; hover `#A30000`.
- **Pulsante secondario**: bordo 2 px rosso, testo rosso, fondo trasparente; hover fondo rosato.
- **Fuoco da tastiera**: contorno 3 px `#1A1A1A` staccato di 2 px, su tutto.
- **Testata**: bianca, filetto rosso di 4 px in alto, icona AFOL, «← Tutti i percorsi», nome del sito in 800.
- **Schede**: bianche su fondo grigio chiaro, bordo 1 px `#CCCCCC`, angoli 6 px; quella aperta o l'indice della home hanno il filetto rosso in alto di 6 px.
- **Aiuto e suggerimenti**: fondo rosato con filetto rosso di 4 px a sinistra.
- **Scelte**: righe bianche con bordo grigio; scelta attiva con bordo rosso, testo in grassetto, radio come anello rosso pieno.
- **Dialoghi**: bianchi con filetto rosso in alto, fondo scurito dietro.
- **Piè di pagina** (pagina iniziale): rosso pieno, logo negativo bianco, testo bianco.

Restano esclusi: badge, punteggi, confetti, mascotte, foto stock, sfumature, ombre pesanti, colori per indirizzo.

## 6. Layout e movimento

Invariati rispetto alla V1: contenitore di lavoro di 1240 px, margini 20 px sul telefono (16 sotto i 360) e da 28 a 72 px oltre; colonna di testo fino a circa 66 caratteri; da 1000 px home a due colonne e schermate con introduzione e risposta affiancate; da 1200 px indice delle sezioni come striscia orizzontale. Movimento sobrio (200 ms), `prefers-reduced-motion` rispettato.

## 7. Accessibilità (verificata sui contrasti della skill)

- `#CC0000` su bianco 5,89:1 e su `#F5F5F5` circa 5,4:1: va bene anche per testo normale (occhielli, link).
- Bianco su `#CC0000` 5,89:1: pulsanti e piè di pagina.
- `#333333` su bianco 12,6:1; `#666666` su bianco 5,7:1.
- Bordi dei campi a 3,4:1; target di almeno 44 px; percorso completo da tastiera.
- Gli SVG decorativi dei cerchi sono sfondi CSS, quindi ignorati dagli screen reader.

## 8. File

- `css/tokens.css`: token AFOL e ruoli (`--c-*`) usati dall'interfaccia, `@font-face`.
- `css/stile.css`: componenti, stampa del dossier e del curriculum.
- `img/`: loghi, icona, catena dei cerchi.
- `.claude/skills/afol-brand/`: il brand kit completo, da consultare per qualsiasi nuovo materiale (anche social, video, slide).
