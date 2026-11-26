# Piano integrato: il portale dello studente

Diario di bordo, bilancio di competenze, portfolio digitale e curriculum, con salvataggio sul server della scuola.

Scritto il 12 novembre 2026, **aggiornato il 18 novembre 2026** con le decisioni prese, la diagnosi del server e il backend già scritto (programma in `server/`, script in `deploy/`, 103 test verdi; dettagli in `docs/RIPRESA-BACKEND.md`). Niente è ancora installato sul server della scuola e i siti non sono ancora collegati al programma. Le domande da fare agli studenti e i dettagli dell'interfaccia si rifiniscono strada facendo, sezione per sezione. Sostituisce, per la parte server, le ipotesi di `docs/FUTURO.md` §2 (Cloudflare, cartelle di rete).

---

## 0. In una pagina

**Che cosa vogliamo.** Uno studente apre il telefono, inquadra il QR del suo cartellino ed è dentro. Durante l'anno carica nel **portfolio** le cose che fa (una foto e due righe guidate); durante il tirocinio compila il **diario** una volta a settimana; quando serve fa il **bilancio di competenze** partendo da quello che ha già raccolto; alla fine ottiene il **curriculum** già quasi pronto. Tutto si scarica (PDF, Word) e il lavoro resta suo negli anni.

**Principi che non si toccano.**
1. **Stupido da fare.** Telefono prima di tutto, una domanda per schermata, esempi del proprio indirizzo, niente campi obbligatori inutili, salvataggio sempre automatico.
2. **Una cosa si racconta una volta sola.** Quello che è nel diario o nel portfolio non si riscrive nel bilancio o nel curriculum: si importa con un tocco e si corregge.
3. **Funziona anche senza rete e senza accesso**, come oggi. Il server aggiunge sicurezza e continuità, non è una condizione per usare i siti.
4. **I dati restano a scuola**: server della scuola, nessun servizio esterno, nessuna telemetria (il Foglio Google, che era solo una prova, è stato tolto).
5. **Le parole sono dello studente**: nessuna riscrittura **automatica**, nessun voto, nessuna classifica (regole di `design.md` §9 e del bilancio). I docenti possono correggere, ma le loro correzioni sono sempre **visibili, firmate e reversibili** (§10).

**Come è fatto.** Apache (che c'è già, con HTTPS) serve i siti e passa le richieste dei dati a un piccolo programma **Node.js** che gira solo dentro il server; i dati stanno in un file **SQLite** e le foto, già ridotte dal telefono, in una cartella fuori dal sito.

**In che ordine.** F0 server e fondamenta → F1 accesso con QR e salvataggio dei siti esistenti → F2 portfolio con foto → F3 competenze ufficiali dei tre indirizzi → F4 lingue → F5 strumenti dei docenti → F6 prove con gli studenti e rifinitura. Il programma si sviluppa e si prova su GitHub; **l'installazione sul server della scuola si fa per ultima** (decisione del 18 novembre 2026). Dati veri solo dopo **DPO**, **backup** e **nome di dominio dedicato** (§2, §13, §14, §15).

---

## 1. Cosa c'è oggi (da cui partiamo)

| Pezzo | Stato | File |
|---|---|---|
| Pagina iniziale con tre card | fatta | `index.html` |
| Bilancio di competenze (6 sezioni, 9 schermate; esperienze guidate, «so fare» in due tempi) | fatto, salva nel browser (`bilancio-competenze-v1`); in `main` ha ancora l'invio al Foglio Google, spento nel pacchetto per il server | `bilancio/`, `js/app.js`, `js/bilancio.js`, `js/dati.js` |
| Curriculum (6 passi, Word e PDF con caratteri incorporati, Europass) | fatto, salva nel browser (`cv-v1`); importa dal bilancio e dal diario | `cv/`, `js/cv.js`, `js/docx.js`, `js/pdf.js` |
| Diario di bordo (tirocini, settimane) | prototipo, salva nel browser (`diario-tirocinio-v1`) | `diario/` |
| Portfolio («Le mie attività») | **prima versione fatta il 26/11/2026**, salva nel browser (attività nel `localStorage`, foto in IndexedDB); importa dal diario, il bilancio importa da lui, PDF con foto (`docs/PORTFOLIO.md`) | `portfolio/`, `js/competenze.js` |
| Programma del server: accesso di studenti e docenti, classi, cartellini, documenti con revisioni, correzioni dei docenti con registro, backup | **scritto e provato**, non ancora installato; i siti non lo usano ancora | `server/`, `tests/server.test.cjs` |
| Preparazione del server: Node, utente, cartelle, servizio, backup notturno, inoltro Apache, pacchetto dei siti | **pronti**, non ancora applicati | `deploy/` |
| Foglio Google | **tolto** (era una prova su un account personale); nel pacchetto per il server l'invio è spento | `apps-script/` (resta come storia) |
| Test | 103 test: 86 dei siti (logica, contratto con lo script del foglio, Word, PDF, pagine) e 17 del server | `tests/` |

Cose già pronte da riusare:
- **Importazione tra siti** con le regole giuste (solo su richiesta, in sola lettura, dati riletti con controlli): diario → bilancio, diario → curriculum, bilancio → curriculum. Il portfolio entra nello stesso schema.
- **PDF e Word senza librerie esterne** (`js/pdf.js`, `js/docx.js`): il PDF sa già incorporare immagini JPEG (la foto del curriculum), quindi può fare anche il portfolio.
- **Dal progetto del laboratorio** (`halmob01/laboratorio-ele`): l'idea dell'accesso con **codice personale e QR**, QR della classe alla lavagna con conferma del docente, pannello docente, classi (`worker/auth.js`, `worker/index.js`, `src/accesso/`), e l'intera **filiera della traduzione in arabo** (97 file di frasi, controllo delle frasi mancanti). Quel codice è per Cloudflare Workers: l'accesso qui è stato riscritto per Node e SQLite. Dal laboratorio viene anche una lezione: un limite dei tentativi **per IP** blocca tutta la scuola, che esce con un solo indirizzo (§4).
- **Controllo di vaghezza** (`L.vaghezza`): servirà identico nel portfolio.

## 2. Il server (quello che sappiamo)

Dalla diagnosi di sola lettura fatta via SSH il **18 novembre 2026** (prima: `diagnosi.txt` e verifica dell'11 novembre):

| Cosa | Stato |
|---|---|
| Sistema | Debian 13.7, x86_64, 3,9 GB di memoria (2,9 disponibili), 92 GB liberi |
| Sito | Apache 2.4, **un solo nome** (`afolmet-rozzano.sytes.net`), `DocumentRoot /var/www/html`; HTTPS con Let's Encrypt, rinnovo automatico (`certbot.timer`), la porta 80 rimanda a HTTPS |
| Cartella del sito | `/var/www/html`, gruppo `webdev` con setgid. **`/studenti/`**: cartelle personali degli studenti, con **7.426 file PHP**; gli studenti hanno **account Linux** con la home lì e **pubblicano HTML e PHP** sullo stesso indirizzo |
| Cartella dei siti del portale | **`/var/www/html/gcatalfamo/`** (decisa il 18/11), cioè `https://afolmet-rozzano.sytes.net/gcatalfamo/`; oggi vuota, di `aeberlin:webdev`, scrivibile dal gruppo |
| Moduli Apache | `rewrite`, `ssl`, **`php8.4` (mod_php con prefork: il PHP gira come `www-data`)**; **`proxy`, `proxy_http` e `headers` non attivi**. PHP-FPM è acceso ma Apache non lo usa |
| `.htaccess` | **ignorati** (`AllowOverride None` su `/var/www/`): non si può proteggere niente con un `.htaccess` |
| Node.js | c'è un Node di sistema **v20.19.2** (troppo vecchio per `node:sqlite`, non va toccato); il nostro Node va a parte in `/opt/portale` |
| Porte | 22 (SSH), 21 e 40000-40100 (FTP), 80, 443, MariaDB solo locale; **3100 libera** |
| Accessi | il docente entra in SSH come **root** (sudo senza password); firewall ufw e fail2ban attivi |
| Aggiornamenti | **`unattended-upgrades` non attivo**: nessun aggiornamento di sicurezza automatico |
| Backup | **nessun backup dei dati** |
| Vincolo | sul server ci sono altre cose che **non vanno toccate** |

**La conseguenza più importante.** Gli studenti pubblicano pagine sullo **stesso nome di dominio** del portale. Una loro pagina può leggere quello che i siti salvano nel browser (anche i recapiti del curriculum) e chiamare l'API a nome di chi la apre; un loro PHP può chiamare direttamente il programma su `127.0.0.1:3100` e fingere qualsiasi IP. Per le prove con dati finti va bene; **prima dei dati veri serve un nome di dominio solo per il portale** (sottodominio AFOL o un secondo nome), con un VirtualHost senza PHP (§3, §16).

**Da segnalare al collega** (non nostro, non toccato): `info.php` pubblico; `debian.txt`, `office.iso` (2,7 GB), `ninite.exe`, `orario.xls` scaricabili da Internet; `test/` e `tesina/` scrivibili da tutti (777) con PHP attivo; aggiornamenti automatici spenti; il vecchio `installa-portale.sh` in `/var/www/html/` (scaricabile, da spostare).

Da chiarire ancora: chi aggiorna il **DNS dinamico** (`sytes.net` di solito chiede una conferma ogni 30 giorni; se decade, i QR stampati porterebbero a un indirizzo di qualcun altro); con quale account si usa FileZilla; se gli studenti sono nel gruppo `webdev` (che oggi può scrivere in `gcatalfamo/`).

## 3. Architettura

```
telefono / PC  ──HTTPS──►  Apache (c'è già)
                             ├─ /<cartella dei siti>/        file statici: home, diario, bilancio, portfolio, curriculum
                             └─ /<cartella dei siti>/api/    inoltrato a ► Node.js  (127.0.0.1:3100, non raggiungibile da fuori)
                                                                          ├─ /var/lib/portale/portale.sqlite   (dati)
                                                                          └─ /var/lib/portale/foto/            (foto ridotte)
```

- **Apache resta la porta d'ingresso** e continua a servire i file statici, come oggi. Al programma Node arriva solo il percorso `/api/`, sullo **stesso indirizzo** dei siti (niente problemi tra domini). Il cookie dell'accesso vale solo per `/gcatalfamo/api/` (`PORTALE_PERCORSO`).
- **Dove stanno le cose**: i siti in `/var/www/html/gcatalfamo/` (pubblici); il programma in `/opt/portale/app/` e i dati (database, foto, backup) in `/var/lib/portale/`, **mai sotto `/var/www/html`** e leggibili solo dall'utente `portale` (né Apache né il PHP degli studenti possono aprirli).
- **Node.js v26.13.1** (LTS, aggiornamento di sicurezza del 10/11/2026, al posto della v26.13.0) in `/opt/portale` (cartella sua, nessun pacchetto di sistema toccato, il Node v20 di sistema resta com'è), avviato da un servizio systemd con un **utente di sistema dedicato**, limiti di memoria (400 MB) e processore (50%), protezioni di systemd, riavvio automatico.
- **SQLite** con il modulo integrato di Node (`node:sqlite`, provato con v26.13.1). Un solo file, nessun server di database da proteggere. Se il modulo integrato desse problemi si passa a `better-sqlite3` cambiando solo `server/db.js`.
- **Niente framework e nessuna dipendenza esterna.** Node con il server HTTP standard, come il resto del progetto. Più facile da mantenere e da far controllare.
- **Nome di dominio dedicato prima dei dati veri** (§2): stesso programma, ma un VirtualHost suo, con il suo certificato e senza PHP. Per le prove basta `/gcatalfamo/` sul nome attuale.
- **Pubblicazione**: con git sul server e un comando di aggiornamento, vedi §3 bis.

**Installazione, una volta sola** (tutto reversibile; il docente ha l'accesso root e può farlo lui, ma va concordato con il collega; **si fa per ultima**, quando il programma e i siti collegati sono pronti):
1. `deploy/installa-portale.sh` (pronto e provato): scarica Node controllando l'impronta del file, crea l'utente `portale`, le cartelle e `/etc/portale/portale.env` (da completare con `PORTALE_ORIGINE`). Ha `--controlla` (solo controlli) e `--disinstalla`;
2. `apt install git` e clonare il repository in `/opt/portale/sorgente/`, poi `aggiorna.sh` (§3 bis, da scrivere);
3. il servizio `deploy/portale.service` e la copia notturna `deploy/portale-backup.service` + `.timer` (pronti);
4. attivare i moduli `proxy` e `proxy_http` di Apache e includere `deploy/apache-portale-api.conf` con **una riga dentro il `<VirtualHost *:443>`** esistente (non in `conf-enabled`, che varrebbe anche per la porta 80); prima `apache2ctl configtest`, poi ricarica senza interrompere nessuno;
5. portare il **backup** fuori dal server (§14).

**Se attivare `mod_proxy` non fosse accettabile**: il programma si scrive comunque in Node, ma si può esporre con un piccolo adattatore PHP (che c'è già) al posto del proxy. È peggiore (più lento, più codice), lo terrei solo come ripiego.

## 3 bis. Sviluppo e pubblicazione: GitHub e server insieme

Deciso il 18 novembre 2026. **Si sviluppa su GitHub, si pubblica sul server della scuola.** Sono due cose separate: il codice resta nel repository e si lavora sui rami come oggi; il server riceve una **copia** della versione pronta, solo quando lo decide il docente.

**Come funziona**

```
GitHub (repository)                         sviluppo: rami, pull request, test automatici
   │  git pull del ramo scelto (normalmente main)
   ▼
/opt/portale/sorgente/                      il repository clonato sul server (NON pubblico)
   │  aggiorna.sh copia solo quello che serve
   ├─► /var/www/html/gcatalfamo/            i siti, quello che vedono gli studenti
   └─► /opt/portale/app/                    il programma Node (NON pubblico)
```

- **git sul server**: pacchetto standard di Debian (`apt install git`), da concordare con il collega perché è un pacchetto di sistema.
- **Mai clonare il repository dentro `/var/www/html/`**: tutto quello che sta lì è pubblico e su questo server i `.htaccess` sono ignorati (`AllowOverride None`), quindi da Internet si scaricherebbero la cartella `.git` con tutta la storia, `docs/`, `tests/`, lo script del foglio e il codice del server.
- **Un comando per aggiornare**: `sudo /opt/portale/aggiorna.sh`. Lo script:
  1. scarica le novità del ramo scelto (`git pull`);
  2. esegue i test (`node --test`): se non passano, si ferma e non pubblica niente;
  3. mette da parte la versione pubblicata, per **tornare indietro in un minuto** (`aggiorna.sh --indietro`);
  4. copia i soli file dei siti in `gcatalfamo/` (la stessa scelta di `deploy/prepara-siti.sh`, con `urlInvio` vuoto) e il programma in `/opt/portale/app/` (`server/` più `js/dati.js`, `js/bilancio.js`, `js/cv.js`, `diario/js/diario.js`, che servono per ricontrollare i documenti);
  5. riavvia il programma solo se è cambiato, e controlla che risponda «sono vivo»;
  6. scrive in un registro che cosa ha pubblicato (data, ramo, commit).
- **Cartella di prova**: lo stesso script può pubblicare un altro ramo in `/var/www/html/gcatalfamo-prova/` (`aggiorna.sh --prova NOME-RAMO`), per vedere una modifica prima di darla agli studenti. Solo i siti, con dati finti: il programma vero resta uno.
- **Repository pubblico o privato**: se è pubblico il server lo scarica senza password; se è privato serve una **deploy key** di sola lettura, che dà accesso solo a quel repository e non all'account.

**Il ciclo di lavoro**: sviluppo su un ramo → il docente controlla e unisce a `main` con una pull request → sul server `aggiorna.sh` → gli studenti vedono la nuova versione.

**GitHub Pages** può restare acceso come anteprima per il docente, ma gli studenti usano **un solo indirizzo**: il salvataggio nel browser è legato all'indirizzo, e chi lavora un po' su GitHub e un po' sul server non ritrova le sue cose. Quando gli studenti passano al server, su GitHub Pages resta solo un avviso con il nuovo indirizzo (dopo che ognuno ha fatto «Scarica una copia» e «Carica una copia»).

## 4. Accesso: QR e codice personale

L'idea viene dal laboratorio, che funziona già con studenti veri; il codice è nuovo (`server/api.js`, `server/sicurezza.js`). **Fatto** = già nel programma del server; il resto è da fare.

**Studenti** (niente email, niente password da ricordare):
- Il docente prepara la classe (nome e cognome, classe, indirizzo, anno) e stampa i **cartellini**: nome, classe, codice personale scritto e **QR**. *Fatto lato server; la pagina dei cartellini è da fare.*
- **Il codice scritto** ha 8 caratteri presi da un alfabeto senza caratteri che si confondono (niente 0/O, 1/I/L, 2/Z, 5/S, 8/B) e si stampa come `3ELA-K7QH-M4XT`. La **sigla della classe è solo un aiuto**: non conta per entrare, così il cartellino resta valido quando lo studente cambia classe. Si accetta scritto in minuscolo, con spazi o trattini. *Fatto.*
- **Il QR** porta un codice diverso e lungo (32 caratteri), che nessuno deve digitare: lo studente lo inquadra con la fotocamera e si apre il portale già dentro. Il codice viaggia nella parte dell'indirizzo dopo `#`, che non finisce nei registri del server; la pagina lo toglie subito dall'indirizzo. *Fatto lato server; la pagina è da fare.*
- Dal telefono (QR) si resta collegati fino al 31 agosto. *Fatto.*
- **Dai PC della scuola**, per chi preferisce lavorare con tastiera e schermo grande, si entra con il **codice identificativo del cartellino**, scritto nel campo di accesso. In più, per comodità, il PC può mostrare un **QR sullo schermo** da inquadrare con il telefono su cui lo studente è già entrato (come WhatsApp Web): niente da digitare. Nessun PIN.
  Sui PC (codice scritto) il cookie dura solo finché il browser è aperto e il server chiude comunque la sessione **dopo 30 minuti senza richieste** e dopo 8 ore (*fatto*): non ci si affida alla chiusura del browser, che con «riprendi da dove eri» conserva i cookie. «Esci» è sempre in vista e **toglie sempre** la copia del lavoro salvata in quel browser (sui PC condivisi non è una scelta). Il QR sullo schermo del PC, se si farà, chiede una **conferma sul telefono** («Stai collegando un PC: confermi?») e vale una volta sola per un minuto, perché un compagno non possa far inquadrare il QR del suo PC.
- **Prima volta in aula, senza cartellini**: QR della classe alla lavagna (scade dopo 5 minuti), lo studente sceglie il suo nome, il docente conferma con un clic. Finché non è confermato, il lavoro resta solo sul telefono.
- Cartellino perso o fotografato da un compagno: il docente **rigenera** il codice; il vecchio codice e il vecchio QR smettono di funzionare e **tutti i dispositivi collegati escono subito**; il lavoro resta. *Fatto.*

**Docenti**: email e password. Non c'è un server di posta: l'amministratore crea il docente (dal pannello o dal terminale con `server/amministra.js`), che riceve a voce una **password provvisoria** e la cambia al primo accesso (almeno 10 caratteri; cambiandola esce dagli altri dispositivi). Sessione chiusa dopo 2 ore senza richieste, 12 ore al massimo. *Fatto.* **Amministratore**: gestisce docenti, classi, cancellazioni e legge il registro degli accessi ai documenti (§10).

**Senza accesso** i siti funzionano come oggi, solo sul dispositivo: utile per le prove e per chi non ha ancora il cartellino.

Sicurezza (*fatto*): sessione in un cookie `HttpOnly`, `Secure`, `SameSite=Strict`, limitato a `/gcatalfamo/api/`; nel database solo l'impronta del token; le richieste che scrivono devono venire dalle pagine del portale (intestazione propria e origine controllata); il codice in chiaro solo dove serve per ristampare i cartellini.

**Limite dei tentativi per dispositivo, non per IP** (18 novembre 2026). A scuola tutti escono con lo stesso indirizzo: nel laboratorio 20 errori bloccavano l'intera scuola. Ogni browser riceve un **cookie tecnico firmato dal server**: 10 codici sbagliati in 10 minuti bloccano **solo quel browser** per 10 minuti, i compagni continuano; il QR non ha limiti (non si può indovinare). Per i docenti: 5 password sbagliate per dispositivo in 15 minuti, 30 all'ora per account. Contro chi cancella i cookie per riprovare all'infinito: al massimo 300 dispositivi nuovi ogni 10 minuti per IP e 1000 in tutto, abbastanza per una scuola che entra la mattina. Con 300 studenti, indovinare un codice richiede in media 5 × 10^8 tentativi: circa 3 anni da un IP vero, circa 1 anno al massimo ritmo possibile; oltre 300 errori in 10 minuti il registro segna un allarme. *Fatto e provato con una classe intera dallo stesso IP.*

**Decisione del 12 novembre 2026: niente PIN per ora**, basta il codice del cartellino (più semplice per gli studenti). Per contenere il rischio di un cartellino fotografato senza aggiungere passaggi: codice di 8 caratteri (con il limite dei tentativi non si indovina); nel pannello il docente vede l'ultimo accesso e i dispositivi collegati di ogni studente e può scollegarli rigenerando il codice (*fatto lato server*); ogni salvataggio lascia una **revisione** con l'autore, quindi anche un testo cambiato per dispetto si recupera (§5); per le cancellazioni c'è un **cestino di 30 giorni**: quello che viene cancellato (un'attività con le sue foto, una settimana del diario, un'esperienza, un intero documento) resta recuperabile per 30 giorni **dallo studente e dal docente**, così un dispetto o un errore si annulla. Dopo 30 giorni si cancella davvero. Il PIN (4 cifre, chiesto solo su un dispositivo nuovo) resta pronto da aggiungere se servirà: il resto del sistema non cambia.

## 5. Dati

**Uno studente, un profilo, quattro documenti.**

| Cosa | Contenuto | Chi lo scrive |
|---|---|---|
| Profilo | nome e cognome, classe, indirizzo, anno, lingua dell'interfaccia | docente (nome, classe), studente (lingua) |
| Diario | come oggi (`diario-tirocinio-v1`) | studente; il docente corregge o commenta (da decidere, §17) |
| Bilancio | come oggi (`bilancio-competenze-v1`) | studente; il docente corregge (se anche i livelli, da decidere, §17) |
| Portfolio | attività (§7) | studente |
| Curriculum | come oggi (`cv-v1`), con recapiti e foto | studente e docente (spesso lo scrivono insieme) |
| Foto | file ridotti, legati a un'attività o al curriculum | studente |
| Conferme | «ho visto questo lavoro» del docente (§10) | docente |

**I siti continuano a salvare nel browser come oggi** e in più, quando lo studente è entrato, copiano ogni salvataggio sul server (un file condiviso `js/archivio.js`, una voce `urlApi` in `js/config.js`: se è vuota, tutto funziona esattamente come adesso). *Da fare: è il prossimo passo.*

**Come il server tiene i documenti** (*fatto*, `server/api.js`):
- ogni documento (diario, bilancio, curriculum) ha un **numero di revisione**; chi salva dichiara da quale revisione parte. Se nel frattempo qualcun altro ha salvato (l'altro dispositivo, o un docente), il server **non sovrascrive** e restituisce la versione attuale (risposta 409). Non ci si affida all'ora dei dispositivi, che può essere sbagliata;
- il server **ricontrolla** ogni documento con le stesse funzioni dei siti (`normalizza` di `js/bilancio.js`, `js/cv.js`, `diario/js/diario.js`): i campi sconosciuti spariscono;
- ogni salvataggio lascia una **revisione** con l'autore (lo studente o il nome del docente); i salvataggi dello stesso autore entro 10 minuti diventano una revisione sola; si tengono 30 giorni (le ultime 5 sempre). Lo studente e il docente possono rivedere e recuperare una versione precedente.

**Come i siti useranno il server** (*da fare*):
- salvataggio nel browser **separato per studente**: oggi le chiavi sono uguali per tutti e su un PC condiviso lo studente che entra dopo caricherebbe il lavoro di quello prima;
- quando il server risponde che c'è una versione più nuova, il sito **unisce voce per voce** (tirocini, settimane ed esperienze hanno già un identificativo) e chiede allo studente solo se la stessa voce è cambiata da tutte e due le parti: mai sovrascrivere in silenzio, e la versione scartata resta comunque nelle revisioni;
- senza rete, i salvataggi aspettano e partono quando torna;
- al primo accesso, il lavoro già salvato nel browser senza server si propone allo studente («Questo lavoro è tuo?») e non si carica da solo; «Carica una copia» vale come una modifica fatta adesso.

Il **nome** si scrive una volta (lo mette il docente) e lo usano tutti i siti: oggi è ripetuto in bilancio e curriculum. Per il bilancio resta anche nel documento (`profilo.nome`).

**Curriculum e dati di contatto** (deciso il 18 novembre 2026): il curriculum si salva sul server **come gli altri documenti**, con recapiti e foto, ed è **visibile ai docenti**, che spesso lo scrivono insieme allo studente. Va detto nell'informativa (§13).

**Limiti** (per proteggere il server): documento fino a 1 MB (*fatto*), foto fino a 400 KB l'una, 200 MB per studente.

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

**Privacy delle foto** (soprattutto per Estetica, dove il lavoro è su una persona): mai volti riconoscibili senza consenso scritto; inquadrare il risultato (mani, una zona del viso coperta), mai documenti o schermi con dati di clienti; il portfolio è **privato** (lo vedono lo studente e i docenti). In tirocinio: **chiedi al tutor prima di fotografare in azienda**, e nella convenzione di tirocinio va aggiunta una frase sulle foto (deciso il 18/11). Una foto da togliere subito la decidono i **docenti** («elimina subito», senza cestino, con una riga nel registro); anche lo studente può eliminare subito le proprie foto. Nel browser, foto e coda di invio stanno in IndexedDB, non nel `localStorage` (che tiene circa 5 MB per tutto l'indirizzo). Una pagina pubblica condivisibile con link o QR è una funzione successiva, solo con consenso (dei genitori per i minorenni) e scelta attività per attività.

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

**Fatto il 26 novembre 2026.** Gli **allegati B2 della Regione Lombardia** (qualifiche e diplomi) sono stati scaricati dal sito della Regione (`docs/fonti/`) e trasformati nel catalogo `js/competenze.js`: testo ufficiale di ogni competenza delle sei figure, con tutti gli indirizzi interni, e una frase semplice per lo studente, **da rivedere con i docenti**. La DGR 4615/2025 non cambia le nostre figure.

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
- **Chi vede il mio lavoro**: una riga chiara: «Lo vedono i docenti del CFP». Più avanti, qui si sceglierà anche se e che cosa rendere visibile con un link pubblico (§7).
- **Correzioni dei docenti**: «La prof.ssa Rossi ha corretto il tuo curriculum il 12/11», con le parti cambiate in evidenza e «Vedi com'era prima» (le revisioni ci sono già sul server).
- **Dispositivi**: «Nuovo dispositivo collegato il 12/11 alle 10:40», per accorgersi di un cartellino usato da altri.

Senza accesso la pagina iniziale resta quella di oggi, con le tre card e il lavoro salvato solo sul dispositivo.

## 10. Docenti

**Chi vede che cosa** (deciso il 12-18 novembre 2026): **tutti i docenti vedono tutti gli studenti e possono modificare e correggere** i loro documenti, curriculum compreso. Ogni lettura e ogni modifica di un docente finisce in un **registro** (chi, quale studente, quale documento, quando), che l'amministratore consulta; lo studente vede chi ha corretto e può ritrovare la versione di prima. *Fatto lato server.* I **genitori** non hanno accesso al portale.

Un pannello semplice, da PC (*le funzioni ci sono sul server, le pagine sono da fare*):
- **Classi e studenti**: crea, importa un elenco incollato, stampa i cartellini con QR, rigenera i codici, sposta da una classe all'altra a inizio anno.
- **Avanzamento**: per ogni studente, a che punto è con diario, bilancio, portfolio e curriculum (completo, in corso, da iniziare). Niente punteggi né classifiche.
- **Lettura e correzione**: il docente apre il documento dello studente **negli stessi siti** (bilancio, curriculum, diario, portfolio), con una fascia fissa in alto «Stai modificando il curriculum di Mario Rossi, 3ELA»; in questa modalità non si salva niente nel browser del docente. Restano da decidere i limiti per il bilancio e il diario (§17).
- **Cestino**: le cose cancellate dagli studenti della classe negli ultimi 30 giorni, con chi le ha cancellate e quando; il docente le ripristina con un clic.
- **Conferma delle attività del portfolio**: «ho visto questo lavoro». È la conferma di un fatto, non un voto: resta coerente con il bilancio non valutativo.
- **Esportazione** della classe (riepilogo in foglio di calcolo): sostituisce il Foglio Google, che è già stato tolto; conviene farla presto (in F1), perché i docenti non restino senza strumento.
- **Foto da togliere**: «elimina subito», con una riga nel registro (§7).

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

**Prima dei dati veri, il DPO.** Una scheda da portargli (la scrivo io), che dica:
- **quali dati**: nomi, classe, testi di diario, bilancio e portfolio, foto di lavori, **curriculum con recapiti e foto**; nel diario possono comparire assenze e stati d'animo, nelle foto di Estetica la pelle (possibili dati sulla salute);
- **perché e con quale base giuridica** (per un ente pubblico di formazione probabilmente il compito di interesse pubblico; il consenso serve solo per foto di persone e pubblicazioni);
- **dove stanno**: server della scuola, nessun servizio esterno (il Foglio Google è stato tolto);
- **chi li vede**: lo studente e **tutti i docenti**, che possono anche correggere, con un **registro** di letture e modifiche; i genitori non accedono al portale (le loro eventuali richieste passano dalla segreteria, che scarica il pacchetto completo dello studente);
- **per quanto tempo**: proposta fino a 12 mesi dopo l'uscita dal CFP, poi cancellati; lo studente può scaricare tutto prima. Va detto che i dati restano anche nei backup (fino a 12 mesi), nelle revisioni (30 giorni), nel cestino (30 giorni) e nelle cartelle di rete;
- **minorenni**: consenso dei genitori per foto di persone e per qualsiasi pubblicazione; frase sulle foto nella convenzione di tirocinio;
- se serve una **valutazione d'impatto** (DPIA): con minori e foto è probabile che il DPO la chieda.

**Misure tecniche**
- *Fatte*: il programma ascolta solo dentro il server, con un utente senza privilegi e le protezioni di systemd; dati leggibili solo da quell'utente, fuori dalla cartella del sito; cookie sicuri e limitati al percorso dell'API; richieste che scrivono accettate solo dalle pagine del portale; intestazioni di sicurezza sulle risposte dell'API; limite dei tentativi per dispositivo; documenti ricontrollati e al massimo 1 MB; revisioni con l'autore; registro delle letture dei docenti; registro tecnico senza dati personali; copia notturna del database.
- *Da fare*: **nome di dominio dedicato** senza PHP (§2); backup cifrato fuori dal server; intestazioni di sicurezza anche sulle pagine statiche (serve il modulo `headers` di Apache, oggi spento); foto servite solo con permesso; secondo fattore (TOTP) per i docenti, che ora possono modificare il lavoro di tutti, oppure pannello solo dalla rete della scuola; **aggiornamenti di sicurezza** del server (oggi spenti) e di Node (mensili, a mano: `/opt/portale` non riceve gli aggiornamenti di Debian).

## 14. Backup

Oggi sul server **non c'è nessun backup dei dati**. Per il nostro progetto, prima dei dati veri:
- ogni notte alle 2:17: copia coerente del database con l'API di backup di SQLite, in `/var/lib/portale/backup/` (*fatto*: `server/backup.js`, `deploy/portale-backup.timer`); le foto con una copia a parte (*da fare*);
- conservazione: 7 copie giornaliere, 4 settimanali, 12 mensili (*fatto*);
- **fuori dal server** (un altro disco, un NAS, un altro computer della scuola): chi e dove lo decide il collega;
- una **prova di ripristino** all'inizio e una volta all'anno: un backup mai provato non è un backup.
- La copia nelle cartelle di rete (§14 bis) **non è un backup**: si sovrascrive ogni notte.

## 14 bis. Copia nelle cartelle personali della rete della scuola

Ogni studente ritrova il suo lavoro anche nella **sua cartella sui computer della scuola**, già pronto da aprire, senza fare niente.

**Chiarimento (12 novembre 2026).** Gli studenti lavorano **sempre e solo sul server online** (`afolmet-rozzano.sytes.net`): dal telefono in tirocinio, da casa e dai PC della scuola (aprendo il portale nel browser). Il **computer della scuola con le cartelle degli studenti non è su Internet e non deve esserlo**: riceve soltanto la copia notturna. Funziona perché il server online sta anche dentro la rete della scuola (dall'interno il suo nome porta all'indirizzo `192.168.10.24`, nella stessa rete dei PC): la copia passa dentro la scuola, senza aprire niente verso l'esterno, sia che la mandi il server online sia che la vada a prendere il computer interno.

- **Una copia, in un solo verso**: dal portale alla cartella. Il portale resta la fonte; quello che lo studente cambia nella cartella non torna indietro (lo dice un file `LEGGIMI` nella cartella).
- **Cosa ci mette**, in una sottocartella `Portale` della cartella dello studente: diario, bilancio, portfolio e curriculum in **PDF** (e il curriculum anche in **Word**), le **foto** del portfolio e un file con tutti i dati (lo stesso del «pacchetto completo», §9). `js/pdf.js` e `js/docx.js` funzionano anche in Node, ma oggi il curriculum si costruisce **leggendo la pagina mostrata a schermo** (`cv/js/app.js`, `modelloDaDocumento`) e `pdf.js` sa impaginare solo il curriculum: per generare i documenti sul server serve prima un costruttore del curriculum che non usi la pagina, e le impaginazioni di diario, bilancio e portfolio.
- **Quando**: ogni notte, e solo per chi ha cambiato qualcosa dall'ultima volta.
- **Dove scrive**: **solo** dentro la sottocartella `Portale`. Non legge, non cambia e non cancella niente altro nella cartella dello studente.
- **Come**: un'attività programmata sul server del portale che raggiunge la condivisione di rete delle cartelle degli studenti con un **account di servizio** che può scrivere solo lì. In alternativa uno script sul server delle cartelle che **va a prendere** i file dal portale con una chiave sua di sola lettura. **Questa seconda strada è la più sicura**: il server esposto a Internet non conserva nessuna password della rete interna, e se venisse violato non potrebbe scrivere nelle cartelle degli studenti. La scelta dipende da com'è fatta la rete (vedi le domande sotto).
- **Abbinamento**: per ogni studente il portale deve sapere il nome della sua cartella di rete (di solito il suo nome utente di Windows). Lo si inserisce importando l'elenco della classe, una volta all'anno.
- **Abbinamento controllato**: prima della prima scrittura si controlla che il nome della cartella corrisponda allo studente, perché un errore metterebbe il lavoro di uno nella cartella di un altro.
- **I docenti** che oggi leggono le cartelle degli studenti vedranno anche questa copia, curriculum compreso (va bene: lo vedono già nel portale); va detto nell'informativa (§13).

Domande per chi gestisce la rete della scuola: dove stanno le cartelle degli studenti (quale server, Windows o NAS, e il percorso della condivisione); come si chiamano gli account degli studenti; se il server del portale può raggiungere quella condivisione; se si può creare un account di servizio che scriva solo nelle sottocartelle `Portale`.

## 15. Fasi

Ogni fase si chiude con test automatici, prova nel browser su telefono e PC e documentazione aggiornata. Dimensione: S = pochi giorni di lavoro, M = una o due settimane, L = di più.

### Tabella di marcia (decisa il 26 novembre 2026)

Si procede **un blocco alla volta**: ogni blocco si chiude con test, prova nel browser con il server vero avviato nelle prove, commit su `main` e una pausa per provarlo prima di andare avanti.

| # | Blocco | Che cosa | Stato |
|---|---|---|---|
| 1 | **R. Redesign leggero** | le schermate di lavoro dei quattro siti: meno «modulo burocratico» (pannelli grigi, riquadri, filetti), più spazio e lettura; testata compatta, testi brevi, «Dove va il mio lavoro?» | **fatto il 26/11/2026** (`design.md`) |
| 2 | **F1.2 Foto sul server** | invio delle foto delle attività (ridotte sul telefono), controllo del formato, quota per studente, foto consegnate solo allo studente e ai docenti | **fatto il 26/11/2026** (`docs/RIPRESA-BACKEND.md` §4.7); manca la pulizia delle foto non più usate, che arriva con il cestino |
| 3 | **F1.3 Pannello docente minimo** | accesso dei docenti; classi; elenco incollato da un foglio; cartellini con QR da stampare (libreria QR con licenza MIT copiata nel progetto); avanzamento della classe; esportazione in foglio di calcolo | da fare |
| 4 | **F1.4 Cestino** | cose cancellate recuperabili per 30 giorni da studente e docente; «elimina subito» per le foto | da fare |
| 5 | **F0 Installazione** | `deploy/aggiorna.sh` (pubblica da git dopo i test, cartella di prova, ritorno alla versione precedente), `deploy/LEGGIMI.md` per il collega, configurazione per il nome di dominio dedicato, backup fuori dal server; poi installazione sul server della scuola con dati finti | da fare |
| 6 | **Prova con una classe** | una classe vera per un paio di settimane, con dati finti o dopo il parere del DPO; raccolta dei problemi | da fare |
| 7 | **F3 Competenze** | revisione delle frasi semplici con un docente per indirizzo; secondo livello nel bilancio con le competenze del proprio indirizzo; attività → curriculum (lavori svolti, competenze documentate) | da fare |
| 8 | **F5 Docenti** | modalità docente nei siti (lettura e correzione con fascia in alto), avviso allo studente, conferma «ho visto questo lavoro», secondo fattore per i docenti; prima vanno prese le decisioni 4-6 del §17 | da fare |
| 9 | **F4 Lingue** | inglese e arabo (con testo da destra a sinistra), curriculum in inglese | da fare |
| 10 | **Documenti e senza rete** | PDF diretto di bilancio e diario, pacchetto ZIP con tutto, copie fisse di fine anno, pagine che si aprono anche senza rete (service worker) | da fare |
| 11 | **F5 bis Copia nelle cartelle** | ogni notte il lavoro di ogni studente nella sua cartella di rete | da fare, serve chi gestisce la rete |
| 12 | **F6 Rifinitura** | prove con studenti dei tre indirizzi, guide per studenti e docenti, accessibilità | da fare |

**Fatto finora**: F0 preparato (script, servizio, backup, inoltro Apache; niente installato); F1 programma del server; F1 blocco 1 (siti collegati, accesso con il cartellino, la mia area, 26/11); F2 prima versione di «Le mie attività» sul dispositivo (26/11); catalogo delle competenze dagli allegati B2 (26/11).

**Condizioni per i dati veri** (non cambiano): parere del DPO, nome di dominio dedicato senza PHP, backup fuori dal server con prova di ripristino, `PORTALE_ORIGINE` impostata, aggiornamenti di sicurezza attivi sul server.

| Fase | Cosa | Pronto quando | Dipende da | Dim. |
|---|---|---|---|---|
| **F0 Fondamenta** | Node e cartelle sul server; git sul server e `aggiorna.sh` con cartella di prova e ritorno alla versione precedente (§3 bis); configurazione di Apache e servizio systemd (preparati, li applica il collega); backup; scheda per il DPO | i siti di oggi girano dal vostro server in HTTPS; il programma risponde a «sono vivo»; il backup è provato | collega | S |
| **F1 Accesso e salvataggio** | programma con database; classi, studenti, cartellini con QR; accesso; `archivio.js` nei tre siti esistenti; conflitti; **la mia area** (prima versione: percorsi, documenti da scaricare, cestino); pannello docente minimo (classi, cartellini, avanzamento) | una classe di prova lavora da telefono e PC sugli stessi dati; senza rete non si perde niente | F0; dati veri solo dopo il DPO | L |
| **F2 Portfolio** | sito nuovo; foto ridotte; importazioni portfolio → bilancio e curriculum, diario → portfolio; PDF del portfolio | uno studente crea un'attività con foto in meno di un minuto, la ritrova nel bilancio e la scarica in PDF | F1 | L |
| **F3 Competenze** | catalogo dagli allegati regionali; frasi semplici riviste dai docenti; uso in portfolio, bilancio e curriculum | ogni indirizzo e anno ha il suo elenco, approvato da un docente dell'indirizzo | allegati B2; docenti | M |
| **F4 Lingue** | testi in file per lingua; inglese e arabo (con RTL); curriculum anche in inglese | un'intera sessione si fa in arabo e in inglese; il test delle frasi mancanti è verde | (meglio prima di F2) | M |
| **F5 Docenti** | conferme delle attività; esportazione completa della classe; lettura e correzione dei documenti nei siti («modalità docente»), avviso allo studente delle correzioni; secondo fattore per i docenti | un docente segue e corregge la classe dal portale | F1, F2 | M |
| **F5 bis Copia nelle cartelle** | attività notturna che scrive PDF, Word, foto e dati nella cartella di rete di ogni studente; abbinamento studente-cartella | uno studente apre la sua cartella da un PC della scuola e trova il suo lavoro aggiornato alla sera prima | F1, F2; chi gestisce la rete | M |
| **F6 Rifinitura** | prove con studenti per indirizzo; tempi reali; accessibilità; guida per studenti e docenti | dati delle prove raccolti e problemi principali risolti | tutto | M |

**Ordine consigliato all'inizio** (superato dalla tabella di marcia qui sopra): F0 → F1 → **F4 prima di F2** (così il portfolio nasce già tradotto) → F2 → F3 (può partire in parallelo appena arrivano gli allegati) → F5 → F6. Le domande e i testi di ogni sito si rifiniscono in parallelo con i docenti. Per F4 può bastare preparare in F1 la struttura (file dei testi, direzione del testo) e tradurre quando i testi sono stabili.

**Stato al 18 novembre 2026** (il programma si sviluppa e si prova su GitHub, l'installazione sul server è l'ultimo passo):

| Fase | Fatto | Da fare |
|---|---|---|
| F0 | script di installazione provato (Node v26.13.1, utente, cartelle), servizio systemd, copia notturna, inoltro Apache per le prove, pacchetto dei siti (`deploy/prepara-siti.sh`), diagnosi del server | `aggiorna.sh` (§3 bis), `deploy/LEGGIMI.md`, configurazione per il nome di dominio dedicato, scheda per il DPO, backup fuori dal server; applicare tutto sul server |
| F1 | programma con database e migrazioni; classi, studenti, codici e QR; accesso di studenti e docenti; documenti con revisioni e conflitti; correzioni dei docenti con registro; rigenerazione dei codici; limite dei tentativi per dispositivo; 17 test | `archivio.js` nei tre siti (salvataggio per studente, unione per voce, coda senza rete); pagina di accesso; la mia area; pagine dei docenti (classi, cartellini, avanzamento, correzione); cestino per voce; esportazione della classe |
| F1 bis | (26/11/2026) **blocco 1**: `js/archivio.js` nei quattro siti (salvataggio per studente, invio al server, coda senza rete, unione voce per voce con domanda solo sulle voci cambiate dalle due parti), accesso con codice e QR nella pagina iniziale, «questo lavoro è tuo?», la mia area (prima versione), «Esci» che svuota il browser; documento `portfolio` sul server | blocco 2: foto delle attività sul server; blocco 3: pagine dei docenti (classi, cartellini con QR, avanzamento, esportazione); blocco 4: cestino |
| F2 | (26/11/2026) sito «Le mie attività» sul dispositivo: attività in quattro passi, foto ridotte in IndexedDB, catalogo delle competenze dagli allegati B2, diario → attività, attività → bilancio, PDF con foto, copia con le foto; 6 test | collegamento al server (documento `portfolio`, caricamento delle foto); attività → curriculum; revisione delle frasi semplici con i docenti; prove su iPhone e Android |
| F3-F6 | F3 in parte: catalogo pronto | come nella tabella |

## 16. Rischi

| Rischio | Cosa facciamo |
|---|---|
| Server condiviso, «non toccare nulla» | tutto in cartelle e utente nostri; ogni passo reversibile, prima mostrato e poi eseguito; un solo file di configurazione Apache; il docente lavora come root: solo comandi preparati, concordati con il collega |
| Pagine HTML e PHP degli studenti sullo stesso indirizzo del portale | **nome di dominio dedicato** senza PHP prima dei dati veri (§2); dati leggibili solo dall'utente `portale`; cookie limitato al percorso dell'API; richieste che scrivono solo dalle pagine del portale; limite dei tentativi che non si fida dell'IP |
| Tutta la scuola esce con lo stesso IP | limite dei tentativi **per dispositivo** (§4, fatto) |
| Account di un docente rubato (ora può modificare il lavoro di tutti) | registro di letture e modifiche; revisioni recuperabili; secondo fattore o pannello solo dalla rete della scuola (da decidere) |
| Server senza aggiornamenti automatici | segnalato al collega; Node aggiornato a mano ogni mese |
| Nessun backup oggi | backup è condizione per i dati veri (§14) |
| DPO lento o contrario | F0, F1 con dati finti e il lavoro sui contenuti procedono; i siti funzionano anche solo sul dispositivo |
| `mod_proxy` non concesso | ripiego con adattatore PHP (§3) |
| Studenti che passano da GitHub al server e non ritrovano il lavoro | «Scarica una copia» e «Carica una copia» prima del passaggio; avviso su GitHub Pages (§3 bis) |
| DNS dinamico che decade | chiarire chi lo conferma; meglio un sottodominio del dominio di AFOL |
| Foto di persone (Estetica) | regole e avviso nell'interfaccia; portfolio privato; pubblicazione solo con consenso |
| `node:sqlite` ancora giovane | dietro un solo modulo (`server/db.js`), si cambia con `better-sqlite3` |
| Traduzioni sbagliate | revisione madrelingua; test delle frasi mancanti |
| Studenti che non lo usano | prove con studenti a ogni fase; sessioni brevi; valore visibile subito (il curriculum che si compone da solo) |
| Una sola persona che sviluppa | codice semplice, senza framework, con test e documentazione in `docs/` |

## 17. Decisioni da prendere

**Già prese**
- Accesso con il solo codice del cartellino, senza PIN, anche dai PC della scuola (§4).
- Cestino di 30 giorni ripristinabile da studente e docente (§4).
- Copia notturna del lavoro di ogni studente nella sua cartella di rete (§14 bis).
- Siti in `/var/www/html/gcatalfamo/`; dati fuori dalla cartella del sito (§2, §3).
- Sviluppo su GitHub e pubblicazione sul server con git e `aggiorna.sh`; installazione sul server per ultima (§3 bis, §15).
- **Tutti i docenti vedono tutti gli studenti e possono modificare e correggere**, con registro (§10).
- **Curriculum sul server** come gli altri documenti, visibile ai docenti (§5).
- **Foglio Google tolto**; l'esportazione della classe lo sostituisce (§10).
- Genitori senza accesso al portale (§10, §13).
- Foto da togliere subito: decidono i docenti; frase sulle foto nella convenzione di tirocinio (§7).
- Limite dei tentativi per dispositivo, non per IP (§4).
- **Portfolio** (26/11/2026): si chiama «Le mie attività»; prima sul dispositivo e poi sul server; competenze dagli allegati B2 lombardi, mostrate allo studente solo con la frase semplice; collegamenti diario → attività, attività → bilancio e PDF; per le foto solo un avviso, senza casella da spuntare (`docs/PORTFOLIO.md`).

**Da decidere**
1. **Indirizzo pubblico e nome di dominio dedicato**: un sottodominio di AFOL o un secondo nome? Necessario prima dei dati veri (§2). Chi conferma il DNS dinamico?
2. **`mod_proxy`** e **`apt install git`**: il collega è d'accordo?
3. **Dove vanno i backup** fuori dal server e chi li controlla.
4. **Bilancio**: il docente può cambiare i livelli e le scelte dello studente, o solo correggere i testi e commentare? (proposta: solo testi e commenti, perché è un'autovalutazione). Oggi il server permette tutto.
5. **Diario**: il docente lo corregge come gli altri documenti o lascia solo commenti?
6. Lo studente può **annullare** una correzione del docente o solo vederla?
7. **Conservazione**: per quanto tempo dopo l'uscita dal CFP (proposta: 12 mesi)? Gli ex studenti possono ancora entrare per scaricare il lavoro?
8. **Repository pubblico o privato** (per `git pull` dal server serve, se privato, una deploy key).
9. **Lingue**: quali oltre a inglese e arabo, e chi può rivedere le traduzioni?
10. **Allegati B2**: scaricati il 26/11/2026. Resta da decidere quale docente per indirizzo rivede le frasi semplici.
11. ~~Portfolio e bilancio~~: **deciso il 26/11/2026**, il portfolio è l'archivio delle cose fatte e il bilancio pesca da lì (`docs/PORTFOLIO.md`).
12. **Pagina pubblica del portfolio** (link o QR da mettere nel curriculum): sì, più avanti, con consenso?
13. **Secondo fattore per i docenti** (TOTP) o pannello solo dalla rete della scuola?

## Fonti sulle competenze

- Regione Lombardia, [Repertorio IeFP](https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/formazione-professionale/percorsi-iefp-its-e-ifts/repertorio-iefp---istruzione-e-formazione-professionale) (allegati B1 e B2) e [DGR 4615 del 23 giugno 2025](https://www.regione.lombardia.it/content/dam/rl/canali-tematici-servizi/03-istruzione-formazione-e-lavoro/03-formazione-professionale/01-percorsi-iefp--its-e-ifts/red-repertorio-iefp-ifl/allegati/DGR%204615_2025_completo.pdf.pdf): da scaricare, non leggibili da questo ambiente.
- Provincia di Trento, [profilo Operatore elettrico](https://certificazionecompetenze.provincia.tn.it/repertorioProfili/ricercaProfilo/43/dettaglio); Provincia di Mantova, [figura Operatore elettrico](https://www.guidaorientamento.mantova.it/pdf_figure/iefp_operatore_elettrico.pdf) e [Operatore del benessere](https://guidaorientamento.mantova.it/pdf_figure/iefp_operatore_benessere.pdf).
- INAPP Atlante Lavoro, [Operatore del benessere](https://atlantelavoro.inapp.org/public/files/repertori/13404_Operatore%20del%20benessere_1.pdf) e [Operatore informatico](https://www.inapp.gov.it/atlantelavoro/repertorio-nazionale-qualificazioni/profilo/?id_profilo=13616); CNOS-FAP, [Il nuovo Repertorio delle qualifiche e dei diplomi](https://www.cnos-fap.it/sites/default/files/newsletter/[site-date-yyyy]/[site-date-month]/01_frisanco_nuove_qualifiche_e_diplomi.pdf).
- Dopo la terza media (Provincia di Cremona), [Tecnico dei trattamenti estetici](https://www.dopolaterzamedia.provincia.cremona.it/it-it/corsi/scheda-corso/8); Confestetica, [titoli IeFP e abilitazione](https://www.confestetica.it/punto-estetico/news/lestetista-e-abilitata-solo-con-legge-statale-i-titoli-regionali-iefp-servono-per-assolvere-lobbligo-scolastico-ma-non-abilitano).
