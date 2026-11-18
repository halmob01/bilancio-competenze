# Piano integrato: il portale dello studente

Diario di bordo, bilancio di competenze, portfolio digitale e curriculum, con salvataggio sul server della scuola.

Scritto il 12 novembre 2026. **Solo piano, nessun codice.** Le domande da fare agli studenti e i dettagli dell'interfaccia si rifiniscono strada facendo, sezione per sezione. Sostituisce, per la parte server, le ipotesi di `docs/FUTURO.md` §2 (Cloudflare, cartelle di rete).

---

## 0. In una pagina

**Che cosa vogliamo.** Uno studente apre il telefono, inquadra il QR del suo cartellino ed è dentro. Durante l'anno carica nel **portfolio** le cose che fa (una foto e due righe guidate); durante il tirocinio compila il **diario** una volta a settimana; quando serve fa il **bilancio di competenze** partendo da quello che ha già raccolto; alla fine ottiene il **curriculum** già quasi pronto. Tutto si scarica (PDF, Word) e il lavoro resta suo negli anni.

**Principi che non si toccano.**
1. **Stupido da fare.** Telefono prima di tutto, una domanda per schermata, esempi del proprio indirizzo, niente campi obbligatori inutili, salvataggio sempre automatico.
2. **Una cosa si racconta una volta sola.** Quello che è nel diario o nel portfolio non si riscrive nel bilancio o nel curriculum: si importa con un tocco e si corregge.
3. **Funziona anche senza rete e senza accesso**, come oggi. Il server aggiunge sicurezza e continuità, non è una condizione per usare i siti.
4. **I dati restano a scuola**: server della scuola, nessun servizio esterno, nessuna telemetria.
5. **Le parole sono dello studente**: nessuna riscrittura automatica, nessun voto, nessuna classifica (regole di `design.md` §9 e del bilancio).

**Come è fatto.** Apache (che c'è già, con HTTPS) serve i siti e passa le richieste dei dati a un piccolo programma **Node.js** che gira solo dentro il server; i dati stanno in un file **SQLite** e le foto, già ridotte dal telefono, in una cartella fuori dal sito.

**In che ordine.** F0 server e fondamenta → F1 accesso con QR e salvataggio dei siti esistenti → F2 portfolio con foto → F3 competenze ufficiali dei tre indirizzi → F4 lingue → F5 strumenti dei docenti → F6 prove con gli studenti e rifinitura. Dati veri solo dopo **DPO** e **backup** (§14, §15).

---

## 1. Cosa c'è oggi (da cui partiamo)

| Pezzo | Stato | File |
|---|---|---|
| Pagina iniziale con tre card | fatta | `index.html` |
| Bilancio di competenze (6 sezioni, 9 schermate; esperienze guidate, «so fare» in due tempi) | fatto, salva nel browser (`bilancio-competenze-v1`) e invia al Foglio Google | `bilancio/`, `js/app.js`, `js/bilancio.js`, `js/dati.js` |
| Curriculum (6 passi, Word e PDF con caratteri incorporati, Europass) | fatto, salva nel browser (`cv-v1`); importa dal bilancio e dal diario | `cv/`, `js/cv.js`, `js/docx.js`, `js/pdf.js` |
| Diario di bordo (tirocini, settimane) | prototipo, salva nel browser (`diario-tirocinio-v1`) | `diario/` |
| Portfolio | **non c'è** | — |
| Accesso, server, docenti | **non c'è** (solo il Foglio Google per il bilancio) | `apps-script/` |
| Test | 86 test (logica, contratto con lo script del foglio, Word, PDF, pagine) | `tests/` |

Cose già pronte da riusare:
- **Importazione tra siti** con le regole giuste (solo su richiesta, in sola lettura, dati riletti con controlli): diario → bilancio, diario → curriculum, bilancio → curriculum. Il portfolio entra nello stesso schema.
- **PDF e Word senza librerie esterne** (`js/pdf.js`, `js/docx.js`): il PDF sa già incorporare immagini JPEG (la foto del curriculum), quindi può fare anche il portfolio.
- **Dal progetto del laboratorio** (`halmob01/laboratorio-ele`): accesso con **codice personale e QR**, QR della classe alla lavagna con conferma del docente, permessi firmati, password dei docenti, pannello docente, classi (`worker/auth.js`, `worker/index.js`, `src/accesso/`). E l'intera **filiera della traduzione in arabo** (97 file di frasi, controllo delle frasi mancanti).
- **Controllo di vaghezza** (`L.vaghezza`): servirà identico nel portfolio.

## 2. Il server (quello che sappiamo)

Da `diagnosi.txt` e dalla verifica fatta dal PC della scuola (11 novembre 2026):

| Cosa | Stato |
|---|---|
| Sistema | Debian 13, 3,8 GB di memoria (3 disponibili), 94 GB liberi |
| Sito | Apache 2.4.69, HTTPS con Let's Encrypt valido (scade il 23/01/2027, rinnovo automatico attivo), HTTP porta a HTTPS |
| Cartella del sito | `/var/www/html`; la radice porta a `/progetto/`; **`/studenti/` è già usata** (cartelle personali di circa 45 studenti) |
| Moduli Apache | `rewrite`, `ssl`, `php` attivi; **`proxy` e `headers` non attivi** |
| Database | MariaDB solo in locale; pannello solo dalla rete della scuola (da confermare da fuori) |
| Accessi | SSH solo con chiavi, niente root; FTP con TLS obbligatorio; firewall e fail2ban attivi |
| Backup | **nessun backup dei dati** |
| Node.js | non presente; script `installa-portale.sh` pronto (versione LTS v26.13.0, provato contro nodejs.org) |
| Vincolo | sul server ci sono altre cose che **non vanno toccate** |

Da chiarire ancora: la prova **da fuori scuola** (cosa è esposto a Internet), chi aggiorna il **DNS dinamico** (`sytes.net` di solito chiede una conferma ogni 30 giorni), il **percorso esatto** della cartella `catalfamo` dove mettere i siti.

## 3. Architettura

```
telefono / PC  ──HTTPS──►  Apache (c'è già)
                             ├─ /<cartella dei siti>/        file statici: home, diario, bilancio, portfolio, curriculum
                             └─ /<cartella dei siti>/api/    inoltrato a ► Node.js  (127.0.0.1:3100, non raggiungibile da fuori)
                                                                          ├─ /var/lib/portale/portale.sqlite   (dati)
                                                                          └─ /var/lib/portale/foto/            (foto ridotte)
```

- **Apache resta la porta d'ingresso** e continua a servire i file statici, come oggi. Al programma Node arriva solo il percorso `/api/`, sullo **stesso indirizzo** dei siti (niente problemi tra domini, cookie sicuri).
- **Node.js** in `/opt/portale` (cartella sua, nessun pacchetto di sistema toccato), avviato da un servizio systemd con un **utente di sistema dedicato**, limiti di memoria e processore perché non rubi risorse agli altri, riavvio automatico.
- **SQLite** con il modulo integrato di Node (`node:sqlite`, provato funzionante con v26.13.0). Un solo file, nessun server di database da proteggere, backup = copiare un file. Se il modulo integrato desse problemi si passa a `better-sqlite3` senza cambiare il resto (il database sta dietro un solo modulo del programma).
- **Niente framework pesanti.** Node con il server HTTP standard e pochissime dipendenze, come il resto del progetto (che oggi ha zero dipendenze). Più facile da mantenere e da far controllare.
- **Pubblicazione**: uno script crea la cartella pulita dei siti (solo i file necessari) e il pacchetto del programma; si caricano con SFTP/FileZilla o `rsync`; il programma tiene le versioni precedenti per tornare indietro in un minuto.

**Cosa deve fare il collega, una volta sola** (tutto reversibile, da approvare lui):
1. eseguire `installa-portale.sh` (Node, cartelle; eventualmente l'account `gcatalfamo`);
2. attivare i moduli `proxy` e `proxy_http` di Apache e aggiungere **un** file di configurazione che inoltra `/…/api/` a Node (prima `apache2ctl configtest`, poi ricarica senza interrompere nessuno);
3. creare il servizio systemd e l'utente di sistema del programma (preparo i file e lo script, come per Node);
4. attivare il **backup** (§14).

**Se attivare `mod_proxy` non fosse accettabile**: il programma si scrive comunque in Node, ma si può esporre con un piccolo adattatore PHP (che c'è già) al posto del proxy. È peggiore (più lento, più codice), lo terrei solo come ripiego.

## 4. Accesso: QR e codice personale

Ripreso dal laboratorio, che funziona già con studenti veri.

**Studenti** (niente email, niente password da ricordare):
- Il docente prepara la classe (nome e cognome, classe, indirizzo, anno) e stampa i **cartellini**: nome, classe, codice personale scritto (per esempio `3ELA-K7Q2`, senza lettere che si confondono) e **QR**.
- Lo studente inquadra il QR con la fotocamera del telefono → si apre il portale già dentro. Il codice viaggia nella parte dell'indirizzo dopo `#`, che non finisce nei registri del server.
- Il telefono resta collegato fino al 31 agosto.
- **Dai PC della scuola**, per chi preferisce lavorare con tastiera e schermo grande, si entra con il **codice identificativo del cartellino**, scritto nel campo di accesso. In più, per comodità, il PC può mostrare un **QR sullo schermo** da inquadrare con il telefono su cui lo studente è già entrato (come WhatsApp Web): niente da digitare. Nessun PIN.
  Sui PC il collegamento dura solo finché il browser è aperto, si chiude da solo dopo un periodo di inattività e «Esci» è sempre in vista. Uscendo si può scegliere di togliere anche la copia del lavoro salvata in quel browser.
- **Prima volta in aula, senza cartellini**: QR della classe alla lavagna (scade dopo 5 minuti), lo studente sceglie il suo nome, il docente conferma con un clic. Finché non è confermato, il lavoro resta solo sul telefono.
- Cartellino perso o fotografato da un compagno: il docente **rigenera** il codice, il vecchio smette di funzionare, il lavoro resta.

**Docenti**: email e password scelta da loro (invito dell'amministratore), come nel laboratorio. **Amministratore**: gestisce docenti, classi, cancellazioni.

**Senza accesso** i siti funzionano come oggi, solo sul dispositivo: utile per le prove e per chi non ha ancora il cartellino.

Sicurezza: permesso firmato in un cookie `HttpOnly`, `Secure`, `SameSite=Strict`; blocco dopo troppi tentativi sbagliati; il codice in chiaro solo dove serve per ristampare i cartellini.

**Decisione del 12 novembre 2026: niente PIN per ora**, basta il codice del cartellino (più semplice per gli studenti). Per contenere il rischio di un cartellino fotografato senza aggiungere passaggi: codice di 6 caratteri dopo la sigla della classe (praticamente impossibile da indovinare, con il blocco dei tentativi); nel pannello il docente vede l'ultimo accesso e i dispositivi collegati di ogni studente e può scollegarli rigenerando il codice; per le cancellazioni c'è un **cestino di 30 giorni**: quello che viene cancellato (un'attività con le sue foto, una settimana del diario, un'esperienza, un intero documento) resta recuperabile per 30 giorni **dallo studente e dal docente**, così un dispetto o un errore si annulla. Dopo 30 giorni si cancella davvero. Il PIN (4 cifre, chiesto solo su un dispositivo nuovo) resta pronto da aggiungere se servirà: il resto del sistema non cambia.

## 5. Dati

**Uno studente, un profilo, quattro documenti.**

| Cosa | Contenuto | Chi lo scrive |
|---|---|---|
| Profilo | nome e cognome, classe, indirizzo, anno, lingua dell'interfaccia | docente (nome, classe), studente (lingua) |
| Diario | come oggi (`diario-tirocinio-v1`) | studente |
| Bilancio | come oggi (`bilancio-competenze-v1`) | studente |
| Portfolio | attività (§7) | studente |
| Curriculum | come oggi (`cv-v1`) | studente |
| Foto | file ridotti, legati a un'attività o al curriculum | studente |
| Conferme | «ho visto questo lavoro» del docente (§10) | docente |

**I siti continuano a salvare nel browser come oggi** e in più, quando lo studente è entrato, copiano ogni salvataggio sul server (un file condiviso `js/archivio.js`, una voce `urlApi` in `js/config.js`: se è vuota, tutto funziona esattamente come adesso). All'apertura il sito confronta le due versioni:
- se una delle due è più nuova, usa quella;
- se sono cambiate **tutte e due** (telefono e PC usati senza rete), **chiede quale tenere**: mai sovrascrivere in silenzio;
- senza rete, i salvataggi aspettano e partono quando torna.

Il **nome** si scrive una volta (lo mette il docente) e lo usano tutti i siti: oggi è ripetuto in bilancio e curriculum.

**Curriculum e dati di contatto**: oggi indirizzo, telefono, email e foto del curriculum non lasciano mai il dispositivo. Proposta: salvarli sul server **solo se lo studente lo sceglie** («Tieni il curriculum anche sul server»), e mai visibili ai docenti. Da decidere con il DPO.

**Limiti** (per proteggere il server): documento fino a 1 MB, foto fino a 400 KB l'una, 200 MB per studente.

## 6. Come si parlano i siti

| Da | A | Cosa passa | Come |
|---|---|---|---|
| Profilo | tutti | nome, classe, indirizzo, anno | automatico |
| Diario (una settimana) | Portfolio | «Aggiungi al portfolio»: cosa ho fatto, data, azienda | un tocco, poi si aggiunge la foto |
| Diario (un tirocinio) | Bilancio | una cosa fatta (contesto tirocinio, azienda, periodo, parole delle settimane) | come oggi |
| Diario (un tirocinio) | Curriculum | voce «Tirocinio»: azienda, città, periodo, compiti | come oggi |
| Portfolio (attività) | Bilancio «Che cosa hai fatto» | l'attività diventa una cosa fatta, con foto come prova | scegli dall'elenco |
| Portfolio (attività) | Bilancio «Un esempio per ogni so fare» | collegare l'attività come esempio | scegli dall'elenco |
| Portfolio | Curriculum | competenze dimostrate; sezione facoltativa «Lavori svolti» | proposta da accettare |
| Bilancio | Curriculum | competenze dichiarate e documentate, esperienze | come oggi |
| Portfolio, bilancio, curriculum, diario | PDF/Word | documenti da scaricare | §9 |

Regole, uguali per tutte le frecce: **si importa solo su richiesta**, la sorgente non viene mai modificata, niente doppioni, i dati letti vengono ricontrollati. Con il server l'importazione funziona anche tra dispositivi diversi (oggi serve caricare una copia).

**La scelta più importante**: il portfolio diventa **l'archivio delle cose fatte**. Oggi nel bilancio lo studente racconta «una cosa precisa che hai fatto»: con il portfolio quella cosa c'è già, con foto e data. Il bilancio diventa il momento in cui **si sceglie** dal portfolio e **si ragiona** (difficoltà, aiuto, quanto lo so fare), non quello in cui si scrive da zero. Per chi non ha portfolio resta la strada di oggi.

## 7. Portfolio (sito nuovo)

**Un'attività** = foto (da 1 a 4) + che cosa ho fatto + dove e quando + competenze + facoltativi (difficoltà, chi mi ha aiutato). Pensato per il telefono, da fare in un minuto in laboratorio o in azienda:

1. **+ Nuova attività** (pulsante grande in alto).
2. **Foto**: si apre la fotocamera o la galleria. Suggerimento sempre visibile: *fotografa il lavoro, non le persone*.
3. **Che cosa hai fatto?** Una frase guidata con un verbo («Ho cablato…», «Ho configurato…», «Ho eseguito…») e l'avviso di vaghezza già usato nel bilancio. Dettatura con il microfono della tastiera.
4. **Dove e quando**: scuola o laboratorio / tirocinio (con l'azienda presa dal diario) / fuori; data proposta oggi.
5. **Quali competenze hai usato?** Da 1 a 3 tra quelle del proprio indirizzo e anno (§8), con le parole semplici, non quelle del decreto. Si può saltare.
6. **Salva.** L'attività compare nell'elenco con la miniatura.

L'elenco si sfoglia per data, per luogo o per competenza. Da desktop: elenco a sinistra e attività aperta a destra, come nel bilancio.

**Foto: ridotte sul telefono, prima di partire.** Il server non riceve mai la foto in alta risoluzione.
- Lato più lungo 1280 pixel, JPEG di qualità media: circa **120–200 KB** invece dei 3–5 MB di una foto da telefono. Più una miniatura da 320 pixel (circa 15 KB) per gli elenchi.
- JPEG e non altri formati perché si incorpora direttamente in PDF e Word (`pdf.js` lo fa già).
- La riduzione **toglie anche i dati nascosti** della foto (posizione GPS, modello del telefono).
- Il server controlla tipo e dimensione e salva le foto **fuori dal sito**, con nomi casuali; le consegna solo a chi ha il permesso.
- Stima: 20 attività all'anno × 3 foto = circa 10 MB per studente all'anno. 300 studenti per 4 anni ≈ 12 GB: ci stanno.
- Da provare: le foto dell'iPhone (formato HEIC) di solito arrivano già convertite in JPEG dal browser.

**Privacy delle foto** (soprattutto per Estetica, dove il lavoro è su una persona): mai volti riconoscibili senza consenso scritto; inquadrare il risultato (mani, una zona del viso coperta), mai documenti o schermi con dati di clienti; il portfolio è **privato** (lo vedono lo studente e i suoi docenti). Una pagina pubblica condivisibile con link o QR è una funzione successiva, solo con consenso (dei genitori per i minorenni) e scelta attività per attività.

## 8. Competenze dei tre indirizzi

**Il riferimento normativo.** Le figure IeFP nazionali sono quelle dell'Accordo Stato-Regioni del 1° agosto 2019 (Rep. 155/CSR: allegato 1 operatori, triennio, EQF 3; allegato 2 tecnici, quarto anno, EQF 4). Regione Lombardia le ha recepite nel proprio repertorio con la **DGR 3192 del 3 giugno 2020** (allegato B1 competenze di base, allegato B2 competenze tecnico-professionali, separati per qualifiche e diplomi) e lo ha aggiornato con la **DGR 4615 del 23 giugno 2025**.

**Le figure del CFP.**

| Indirizzo | III anno (qualifica, EQF 3) | IV anno (diploma, EQF 4) |
|---|---|---|
| Elettrico | Operatore elettrico | Tecnico elettrico |
| Estetica | Operatore del benessere, indirizzo erogazione dei servizi di trattamento estetico | Tecnico dei trattamenti estetici |
| Informatica | Operatore informatico | Tecnico informatico |

**Cosa ho potuto confermare** (da più fonti concordanti, non dal testo regionale, che da qui non riesco a leggere):
- *Operatore elettrico*: posa delle canalizzazioni secondo lo schema; cablaggio e installazione dei componenti; verifiche di funzionamento (misure, prove, schede di verifica) che portano al collaudo; manutenzione; lettura degli schemi; sicurezza.
- *Operatore informatico*: installare, configurare e usare hardware e software (strumenti d'ufficio e comunicazione digitale) secondo le esigenze dell'utente; installazione, configurazione e manutenzione di sistemi, reti e dispositivi; supporto agli utenti.
- *Operatore del benessere (estetica)*: accoglienza e analisi dei bisogni del cliente; trattamenti estetici di base scegliendo i prodotti cosmetici adatti; igiene e sicurezza; collaborazione alla gestione dell'esercizio. Al quarto anno compare l'analisi delle caratteristiche della pelle. Attenzione: il diploma IeFP di estetica **non abilita** da solo all'esercizio della professione; il curriculum non deve dire il contrario.
- Comune a tutte le figure: le fasi di lavoro (pianificare le operazioni, preparare strumenti e spazi, controllare il risultato) e sicurezza, qualità e ambiente.

**Cosa serve per farlo bene.** Il testo esatto degli **allegati B2 della Regione Lombardia** (qualifiche e diplomi) per le sei figure. Sono sul sito della Regione, nella pagina «Repertorio IeFP», che dalla scuola si apre senza problemi: basta scaricare i PDF e caricarli nel progetto, poi li trasformo in un catalogo.

**Il catalogo** (`js/competenze.js`, un file condiviso da tutti i siti): per ogni indirizzo e anno, l'elenco delle competenze con
- il **titolo ufficiale** (per il docente e i documenti),
- una **frase semplice** per lo studente («Posare canaline e tubi seguendo lo schema»),
- uno o due **esempi** di attività,
- il legame con le **sei situazioni** che il bilancio usa già (capire, fare, collaborare, verificare, spiegare, migliorare), che restano come base comune ai tre indirizzi.

Dove si usa: nel portfolio per etichettare le attività; nel bilancio come secondo livello facoltativo («quali di queste competenze del tuo indirizzo hai già usato?», con l'esempio preso dal portfolio); nel curriculum per proporre frasi di competenza **solo se documentate**; nel pannello docente per vedere quali competenze hanno evidenze. Le frasi semplici le scriviamo e le facciamo rivedere ai docenti di ogni indirizzo.

## 9. Documenti da scaricare

| Documento | Formati | Stato |
|---|---|---|
| Curriculum | Word, PDF, stampa; Europass | c'è; in più: versione **in inglese** (§11) |
| Bilancio | PDF diretto (oggi solo stampa) | da fare, con il motore di `pdf.js` |
| Portfolio | PDF con foto: copertina, attività in ordine di data o per competenza | da fare |
| Diario | PDF per tirocinio | da fare (era già in lista) |
| Pacchetto completo | file ZIP con tutti i dati e le foto | da fare: è anche il modo di portarsi via il proprio lavoro alla fine del percorso |

## 9 bis. La mia area (pagina personale dello studente)

Quando lo studente è entrato, la pagina iniziale diventa **la sua area**: un posto solo dove vede e ritrova tutto il suo lavoro, dal telefono e dal PC.

- **I quattro percorsi** (diario, bilancio, portfolio, curriculum) come oggi le card, ma con il suo stato: «in corso», «completo», ultima modifica, e il pulsante per continuare da dove era.
- **I miei documenti**: per ogni documento i pulsanti per scaricarlo (PDF; Word per il curriculum) e per stamparlo; più «Scarica tutto» (il pacchetto completo con dati e foto, §9).
- **Gli anni**: alla fine di ogni anno (o quando il docente chiude l'anno) il portale conserva una **copia fissa** di bilancio e curriculum di quell'anno, per esempio «Bilancio, III anno, giugno 2027». Lo studente le ritrova tutte negli anni successivi, accanto alla versione in corso: si vede il percorso, che è lo scopo del portfolio. Il portfolio invece è uno solo e cresce negli anni.
- **Cestino**: le cose cancellate negli ultimi 30 giorni, da ripristinare (§4).
- **Il mio profilo**: nome e classe (li mette il docente), lingua dell'interfaccia, «Esci».
- **Copia a scuola**: «La copia nella tua cartella della scuola è aggiornata a ieri sera» (§14 bis).
- **Chi vede il mio lavoro**: una riga chiara: «Lo vedono solo i tuoi docenti». Più avanti, qui si sceglierà anche se e che cosa rendere visibile con un link pubblico (§7).

Senza accesso la pagina iniziale resta quella di oggi, con le tre card e il lavoro salvato solo sul dispositivo.

## 10. Docenti

Un pannello semplice, da PC:
- **Classi e studenti**: crea, importa un elenco incollato, stampa i cartellini con QR, rigenera i codici, sposta da una classe all'altra a inizio anno.
- **Avanzamento**: per ogni studente, a che punto è con diario, bilancio, portfolio e curriculum (completo, in corso, da iniziare). Niente punteggi né classifiche.
- **Lettura**: il lavoro dello studente in sola lettura (senza i dati di contatto del curriculum).
- **Cestino**: le cose cancellate dagli studenti della classe negli ultimi 30 giorni, con chi le ha cancellate e quando; il docente le ripristina con un clic.
- **Conferma delle attività del portfolio**: «ho visto questo lavoro». È la conferma di un fatto, non un voto: resta coerente con il bilancio non valutativo.
- **Esportazione** della classe (riepilogo in foglio di calcolo): quando c'è, il **Foglio Google può andare in pensione**. Fino ad allora l'invio di oggi continua a funzionare.

## 11. Lingue

**Non è tardi**: conviene prepararlo prima del portfolio, perché ogni testo nuovo nasce già traducibile.

- **Interfaccia** in italiano (predefinita), **inglese** e **arabo** per primi; poi le lingue più diffuse nella scuola (da chiedere alla segreteria: probabilmente albanese, rumeno, spagnolo, ucraino, cinese, urdu). La lingua si sceglie con un tocco e resta nel profilo.
- **Modalità bilingue**: la domanda nella lingua dello studente **con sotto l'italiano**. Aiuta chi sta imparando l'italiano e lo abitua alle parole che troverà nei documenti e al lavoro.
- **Che cosa scrive lo studente**: in italiano, se può (i documenti sono per la scuola e per le aziende italiane); può anche scrivere nella sua lingua, il sito non lo impedisce. Nessuna traduzione automatica dei suoi testi (stessa regola della «nessuna riscrittura»).
- **Documenti**: curriculum in **italiano e in inglese** (Europass ha già la struttura; cambiano le etichette, i contenuti restano quelli dello studente). Bilancio e portfolio in italiano.
- **Arabo**: interfaccia da destra a sinistra (`dir="rtl"`) e un carattere con l'alfabeto arabo (Fira Sans non lo ha: serve un carattere libero come Noto Sans Arabic). PDF e Word **in arabo non si fanno**: il motore di oggi non gestisce la scrittura araba, e i documenti servono in italiano o inglese.
- **Come si traduce**: tutte le frasi dei siti in file di testi per lingua, un test che segnala le frasi mancanti, traduzione con revisione di un madrelingua (docente, mediatore, studente più grande). È la stessa filiera usata nel laboratorio per l'arabo.

## 12. Interfaccia per gli studenti

Regole per tutti e quattro i siti (le domande precise si scrivono e si provano sito per sito):
- **Telefono prima di tutto**: una domanda per schermata, pulsanti grandi, tastiera giusta per ogni campo, niente da ingrandire.
- **Guidati**: per ogni domanda un esempio del proprio indirizzo, frasi d'avvio con un verbo, avviso se la risposta è troppo vaga («dice dove eri, non che cosa hai fatto»).
- **Brevi**: sessioni di 5–10 minuti; si riprende dal punto esatto; si vede quanto manca.
- **Ragionare davvero**: poche domande ma che chiedono un fatto, una prova, una difficoltà, un aiuto (sono la struttura del bilancio, che funziona).
- **Mai bloccati**: nessun campo obbligatorio tranne l'indispensabile, nessuna risposta sbagliata.
- **Accessibili**: contrasto, testo ingrandibile al 200%, lettore di schermo, nessuna informazione affidata al solo colore.
- **Dettatura** con il microfono della tastiera del telefono (funziona in tutte le lingue); la dettatura dentro l'app resta in `docs/FUTURO.md`.
- **Prove con studenti veri** a ogni fase: 3–5 studenti per indirizzo, anche con un prototipo di carta prima del codice, misurando il tempo reale e dove si bloccano.

## 13. Privacy e sicurezza

**Prima dei dati veri, il DPO.** Una scheda di una pagina da portargli (la scrivo io): quali dati (nomi, testi, foto di lavori, curriculum solo se lo studente vuole), perché, dove stanno (server della scuola, nessun servizio esterno), chi li vede (lo studente e i suoi docenti), per quanto tempo (proposta: fino a 12 mesi dopo l'uscita dal CFP, poi cancellati; lo studente può scaricare tutto prima), come si cancellano, minorenni e consenso dei genitori per le foto e per qualsiasi pubblicazione.

**Misure tecniche**: HTTPS (c'è); cookie sicuri; il programma Node ascolta solo dentro il server, con un utente senza privilegi; foto fuori dal sito e servite solo con permesso; limiti di dimensione e di tentativi; registri senza dati personali; aggiornamenti; copia di backup cifrata.

## 14. Backup

Oggi sul server **non c'è nessun backup dei dati**. Per il nostro progetto, prima dei dati veri:
- ogni notte: copia coerente del database (SQLite ha un comando apposito) e delle nuove foto;
- conservazione: 7 copie giornaliere, 4 settimanali, 12 mensili;
- **fuori dal server** (un altro disco, un NAS, un altro computer della scuola): chi e dove lo decide il collega;
- una **prova di ripristino** all'inizio e una volta all'anno: un backup mai provato non è un backup.

## 14 bis. Copia nelle cartelle personali della rete della scuola

Ogni studente ritrova il suo lavoro anche nella **sua cartella sui computer della scuola**, già pronto da aprire, senza fare niente.

**Chiarimento (12 novembre 2026).** Gli studenti lavorano **sempre e solo sul server online** (`afolmet-rozzano.sytes.net`): dal telefono in tirocinio, da casa e dai PC della scuola (aprendo il portale nel browser). Il **computer della scuola con le cartelle degli studenti non è su Internet e non deve esserlo**: riceve soltanto la copia notturna. Funziona perché il server online sta anche dentro la rete della scuola (dall'interno il suo nome porta all'indirizzo `192.168.10.24`, nella stessa rete dei PC): la copia passa dentro la scuola, senza aprire niente verso l'esterno, sia che la mandi il server online sia che la vada a prendere il computer interno.

- **Una copia, in un solo verso**: dal portale alla cartella. Il portale resta la fonte; quello che lo studente cambia nella cartella non torna indietro (lo dice un file `LEGGIMI` nella cartella).
- **Cosa ci mette**, in una sottocartella `Portale` della cartella dello studente: diario, bilancio, portfolio e curriculum in **PDF** (e il curriculum anche in **Word**), le **foto** del portfolio e un file con tutti i dati (lo stesso del «pacchetto completo», §9). I PDF e il Word si generano sul server con lo stesso codice dei siti (`js/pdf.js` e `js/docx.js` funzionano anche in Node; le correzioni scritte a mano sull'anteprima del curriculum restano solo nel browser).
- **Quando**: ogni notte, e solo per chi ha cambiato qualcosa dall'ultima volta.
- **Dove scrive**: **solo** dentro la sottocartella `Portale`. Non legge, non cambia e non cancella niente altro nella cartella dello studente.
- **Come**: un'attività programmata sul server del portale che raggiunge la condivisione di rete delle cartelle degli studenti con un **account di servizio** che può scrivere solo lì. In alternativa, se chi gestisce la rete preferisce, uno script sul server delle cartelle che **va a prendere** i file dal portale con una chiave sua. La scelta dipende da com'è fatta la rete (vedi le domande sotto).
- **Abbinamento**: per ogni studente il portale deve sapere il nome della sua cartella di rete (di solito il suo nome utente di Windows). Lo si inserisce importando l'elenco della classe, una volta all'anno.
- **I docenti** che oggi leggono le cartelle degli studenti vedranno anche questa copia: va detto nell'informativa (§13).

Domande per chi gestisce la rete della scuola: dove stanno le cartelle degli studenti (quale server, Windows o NAS, e il percorso della condivisione); come si chiamano gli account degli studenti; se il server del portale può raggiungere quella condivisione; se si può creare un account di servizio che scriva solo nelle sottocartelle `Portale`.

## 15. Fasi

Ogni fase si chiude con test automatici, prova nel browser su telefono e PC e documentazione aggiornata. Dimensione: S = pochi giorni di lavoro, M = una o due settimane, L = di più.

| Fase | Cosa | Pronto quando | Dipende da | Dim. |
|---|---|---|---|---|
| **F0 Fondamenta** | Node e cartelle sul server; script di pubblicazione dei siti; configurazione di Apache e servizio systemd (preparati, li applica il collega); backup; scheda per il DPO | i siti di oggi girano dal vostro server in HTTPS; il programma risponde a «sono vivo»; il backup è provato | collega | S |
| **F1 Accesso e salvataggio** | programma con database; classi, studenti, cartellini con QR; accesso; `archivio.js` nei tre siti esistenti; conflitti; **la mia area** (prima versione: percorsi, documenti da scaricare, cestino); pannello docente minimo (classi, cartellini, avanzamento) | una classe di prova lavora da telefono e PC sugli stessi dati; senza rete non si perde niente | F0; dati veri solo dopo il DPO | L |
| **F2 Portfolio** | sito nuovo; foto ridotte; importazioni portfolio → bilancio e curriculum, diario → portfolio; PDF del portfolio | uno studente crea un'attività con foto in meno di un minuto, la ritrova nel bilancio e la scarica in PDF | F1 | L |
| **F3 Competenze** | catalogo dagli allegati regionali; frasi semplici riviste dai docenti; uso in portfolio, bilancio e curriculum | ogni indirizzo e anno ha il suo elenco, approvato da un docente dell'indirizzo | allegati B2; docenti | M |
| **F4 Lingue** | testi in file per lingua; inglese e arabo (con RTL); curriculum anche in inglese | un'intera sessione si fa in arabo e in inglese; il test delle frasi mancanti è verde | (meglio prima di F2) | M |
| **F5 Docenti** | conferme delle attività; esportazione della classe; lettura dei documenti; pensione del Foglio Google | un docente segue la classe senza il Foglio | F1, F2 | M |
| **F5 bis Copia nelle cartelle** | attività notturna che scrive PDF, Word, foto e dati nella cartella di rete di ogni studente; abbinamento studente-cartella | uno studente apre la sua cartella da un PC della scuola e trova il suo lavoro aggiornato alla sera prima | F1, F2; chi gestisce la rete | M |
| **F6 Rifinitura** | prove con studenti per indirizzo; tempi reali; accessibilità; guida per studenti e docenti | dati delle prove raccolti e problemi principali risolti | tutto | M |

**Ordine consigliato**: F0 → F1 → **F4 prima di F2** (così il portfolio nasce già tradotto) → F2 → F3 (può partire in parallelo appena arrivano gli allegati) → F5 → F6. Le domande e i testi di ogni sito si rifiniscono in parallelo con i docenti.

## 16. Rischi

| Rischio | Cosa facciamo |
|---|---|
| Server condiviso, «non toccare nulla» | tutto in cartelle e utente nostri; ogni passo reversibile, prima mostrato e poi eseguito; un solo file di configurazione Apache |
| Nessun backup oggi | backup è condizione per i dati veri (§14) |
| DPO lento o contrario | F0, F1 con dati finti e il lavoro sui contenuti procedono; i siti funzionano anche solo sul dispositivo |
| `mod_proxy` non concesso | ripiego con adattatore PHP (§3) |
| DNS dinamico che decade | chiarire chi lo conferma; meglio un sottodominio del dominio di AFOL |
| Foto di persone (Estetica) | regole e avviso nell'interfaccia; portfolio privato; pubblicazione solo con consenso |
| `node:sqlite` ancora giovane | dietro un solo modulo, si cambia con `better-sqlite3` |
| Traduzioni sbagliate | revisione madrelingua; test delle frasi mancanti |
| Studenti che non lo usano | prove con studenti a ogni fase; sessioni brevi; valore visibile subito (il curriculum che si compone da solo) |
| Una sola persona che sviluppa | codice semplice, senza framework, con test e documentazione in `docs/` |

## 17. Decisioni da prendere

Già prese: accesso con il solo codice del cartellino, senza PIN (§4); accesso anche dai PC della scuola con il codice identificativo del cartellino, senza PIN (§4); copia notturna del lavoro di ogni studente nella sua cartella di rete (§14 bis).


1. **Percorso dei siti** sul server (la cartella `catalfamo`: percorso esatto) e indirizzo pubblico (resta `sytes.net` o un sottodominio di AFOL?).
2. **`mod_proxy`**: il collega accetta di attivarlo?
3. **Dove vanno i backup** e chi li controlla.
4. **Curriculum sul server**: solo se lo studente lo sceglie (proposta) o mai?
5. **Conservazione**: per quanto tempo dopo l'uscita dal CFP (proposta: 12 mesi)?
6. **Lingue**: quali oltre a inglese e arabo, e chi può rivedere le traduzioni?
7. **Allegati B2** della Regione: chi li scarica (proposta: tu dalla scuola) e quale docente per indirizzo rivede le frasi semplici?
8. **Portfolio e bilancio**: va bene che il portfolio diventi l'archivio delle cose fatte da cui il bilancio pesca (§6)?
9. **Pagina pubblica del portfolio** (link o QR da mettere nel curriculum): sì, più avanti, con consenso?
10. **Foglio Google**: lo teniamo finché il pannello docente non lo sostituisce (proposta) o lo togliamo prima?

## Fonti sulle competenze

- Regione Lombardia, [Repertorio IeFP](https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/formazione-professionale/percorsi-iefp-its-e-ifts/repertorio-iefp---istruzione-e-formazione-professionale) (allegati B1 e B2) e [DGR 4615 del 23 giugno 2025](https://www.regione.lombardia.it/content/dam/rl/canali-tematici-servizi/03-istruzione-formazione-e-lavoro/03-formazione-professionale/01-percorsi-iefp--its-e-ifts/red-repertorio-iefp-ifl/allegati/DGR%204615_2025_completo.pdf.pdf): da scaricare, non leggibili da questo ambiente.
- Provincia di Trento, [profilo Operatore elettrico](https://certificazionecompetenze.provincia.tn.it/repertorioProfili/ricercaProfilo/43/dettaglio); Provincia di Mantova, [figura Operatore elettrico](https://www.guidaorientamento.mantova.it/pdf_figure/iefp_operatore_elettrico.pdf) e [Operatore del benessere](https://guidaorientamento.mantova.it/pdf_figure/iefp_operatore_benessere.pdf).
- INAPP Atlante Lavoro, [Operatore del benessere](https://atlantelavoro.inapp.org/public/files/repertori/13404_Operatore%20del%20benessere_1.pdf) e [Operatore informatico](https://www.inapp.gov.it/atlantelavoro/repertorio-nazionale-qualificazioni/profilo/?id_profilo=13616); CNOS-FAP, [Il nuovo Repertorio delle qualifiche e dei diplomi](https://www.cnos-fap.it/sites/default/files/newsletter/[site-date-yyyy]/[site-date-month]/01_frisanco_nuove_qualifiche_e_diplomi.pdf).
- Dopo la terza media (Provincia di Cremona), [Tecnico dei trattamenti estetici](https://www.dopolaterzamedia.provincia.cremona.it/it-it/corsi/scheda-corso/8); Confestetica, [titoli IeFP e abilitazione](https://www.confestetica.it/punto-estetico/news/lestetista-e-abilitata-solo-con-legge-statale-i-titoli-regionali-iefp-servono-per-assolvere-lobbligo-scolastico-ma-non-abilitano).
