# Ripresa del lavoro: backend del portale dello studente

Stato al **18 novembre 2026**, aggiornato il **26 novembre 2026** (§4.6: siti collegati). Questo file serve a chi riprende il lavoro in una nuova sessione: dice che cosa è stato deciso, che cosa è stato fatto, che cosa manca e da dove ripartire.

---

## 1. Dove sta il lavoro

| Cosa | Dove |
|---|---|
| Codice del backend, script e test | ramo **`claude/ecstatic-hopper-lm1vdf`** (partito da `main` al commit `373e97c`) |
| Piano generale del portale (`docs/PIANO-PORTALE.md`) | **in questo ramo** (unito il 18/11/2026 dal ramo `claude/affectionate-ptolemy-k0gtgx`); non ancora in `main` |
| Sito pubblico attuale | GitHub Pages da `main` (`https://halmob01.github.io/bilancio-competenze/`), non toccato |
| Server della scuola | **niente installato**; c'è solo un vecchio `installa-portale.sh` in `/var/www/html/` (da spostare: è scaricabile da chiunque) |

Le modifiche di questo ramo non vanno online da sole: GitHub Pages cambia solo se il ramo si unisce a `main`; il server cambia solo se si carica a mano il pacchetto dei siti o il programma.

Commit del ramo, dal più vecchio:
1. `8512325` Server: prime fondamenta (F0)
2. `3ff39e1` Pubblicazione: pacchetto dei siti per il server della scuola
3. `014f1b8` Server: accesso, documenti con revisioni e correzioni dei docenti (F1)
4. `65798e5` Accesso: limite dei tentativi per dispositivo, non per IP

Prova: `node --test tests/*.test.cjs` → **103 test, tutti verdi** (86 dei siti + 17 del server), con Node 22 (CI) e con Node 26.13.1 (quella del server).

---

## 2. Decisioni prese (non rimetterle in discussione senza motivo)

Dal piano e dalla discussione con il docente (12-18 novembre 2026):

- **Architettura**: Apache (già presente, HTTPS) serve i file statici e inoltra `/…/api/` a un programma **Node.js** che ascolta solo su `127.0.0.1:3100`; dati in **SQLite** (`node:sqlite`, nessuna dipendenza); foto ridotte in una cartella fuori dal sito.
- **Cartella dei siti sul server**: **`/var/www/html/gcatalfamo/`** → indirizzo `https://afolmet-rozzano.sytes.net/gcatalfamo/`. I **dati non stanno mai sotto `/var/www/html`**: database, foto e backup in `/var/lib/portale/`, programma in `/opt/portale/app/`.
- **Accesso studenti**: solo codice del cartellino, con QR; niente PIN, niente email. Dai PC della scuola si scrive il codice.
- **Docenti**: email e password. **Tutti i docenti vedono tutti gli studenti** e **possono modificare e correggere** i loro documenti, curriculum compreso (con i recapiti: «glielo scrivono loro»). I **genitori** non hanno accesso.
- **Foto da togliere subito**: decidono i docenti. Alle **aziende** serve una frase nella convenzione di tirocinio sulle foto.
- **Foglio Google**: era solo una prova su un account personale, **tolto**. Nel pacchetto per il server `urlInvio` è vuoto; in `main` `js/config.js` ha ancora l'indirizzo vecchio.
- **Ordine di lavoro scelto dal docente**: prima il backend (sviluppato e provato qui), **lo spostamento sul server della scuola per ultimo**.
- **Sviluppo su GitHub, pubblicazione sul server con git** (piano §3 bis): il repository clonato in `/opt/portale/sorgente/` (mai dentro `/var/www/html/`), un comando `sudo /opt/portale/aggiorna.sh` che scarica `main`, esegue i test, mette da parte la versione pubblicata, copia siti e programma, riavvia e controlla; `--indietro` per tornare alla versione precedente, `--prova RAMO` per pubblicare un ramo in `/var/www/html/gcatalfamo-prova/`. GitHub Pages resta solo come anteprima: gli studenti usano un solo indirizzo.
- **Limite dei tentativi per dispositivo, non per IP**: a scuola tutti escono con lo stesso IP (problema già avuto nel sito del laboratorio, dove 20 errori bloccavano tutti).

---

## 3. Il server della scuola (dalla diagnosi del 18/11/2026)

Raccolta con un comando di sola lettura lanciato dal docente via SSH:

- Debian 13.7, x86_64, 3,9 GB di RAM (2,9 disponibili), 92 GB liberi.
- Il docente entra in SSH **come root** (sudo senza password): può installare da solo, ma deve avvisare il collega e usare solo comandi preparati.
- Node di sistema **v20.19.2** in `/usr/bin/node` (troppo vecchio per `node:sqlite`; non va toccato).
- Apache 2.4 con **un solo nome**, `afolmet-rozzano.sytes.net`, `DocumentRoot /var/www/html` (porta 80 rimanda a HTTPS; 443 con Let's Encrypt, rinnovo con `certbot.timer`).
- Moduli Apache attivi: tra gli altri `rewrite`, `ssl`, `php8.4` (**mod_php con prefork**: il PHP gira come `www-data`); **`proxy`, `proxy_http`, `headers` non attivi**. PHP-FPM 8.4 è acceso ma Apache non lo usa.
- `AllowOverride None` su `/var/www/`: i file `.htaccess` sono ignorati.
- `/var/www/html/` è del gruppo `webdev` con setgid; `gcatalfamo/` è di `aeberlin:webdev`, `drwxrwsr-x` (il gruppo può scrivere).
- `/var/www/html/studenti/`: cartelle personali degli studenti con **7.426 file PHP** e file `.bashrc`/`.profile` (gli studenti hanno account Linux con la home lì). **Gli studenti pubblicano HTML e PHP sullo stesso indirizzo del portale.**
- Porte in ascolto: 22, 21 (FTP, passive 40000-40100), 80, 443, MariaDB solo locale (3306). **3100 libera.** ufw e fail2ban attivi.
- `unattended-upgrades` **non attivo** (nessun aggiornamento di sicurezza automatico).
- Problemi del server da segnalare al collega (non nostri, non toccati): `info.php` pubblico; `debian.txt`, `office.iso` (2,7 GB), `ninite.exe`, `orario.xls` scaricabili da Internet; `test/` e `tesina/` scrivibili da tutti (777) con PHP attivo.

**Conseguenza principale**: con gli studenti che pubblicano PHP e JavaScript sullo stesso nome di dominio, una loro pagina può leggere il `localStorage` dei siti e chiamare l'API a nome di chi la apre; un loro PHP può chiamare direttamente `127.0.0.1:3100` e fingere qualsiasi IP. **Prima dei dati veri serve un nome di dominio solo per il portale** (sottodominio AFOL o altro), con un VirtualHost senza PHP.

Ancora da sapere: con quale account il docente usa FileZilla (`aeberlin`?); se gli studenti sono nel gruppo `webdev` (comando di controllo già dato, risposta non ricevuta); `PermitRootLogin` di SSH.

---

## 4. Che cosa è stato fatto

### 4.1 Pubblicazione dei siti (`deploy/prepara-siti.sh`)
Crea `dist/siti/` e `dist/siti-AAAA-MM-GG-<commit>.tar.gz` con i soli file dei siti (`index.html`, `bilancio/`, `cv/`, `diario/`, `js/`, `css/`, `fonts/`, `img/`, 35 file, circa 0,5 MB), `js/config.js` con `urlInvio: ''`, permessi 644/755 e `versione.txt`. `dist/` è in `.gitignore`. Provato in Chromium da una sottocartella `/gcatalfamo/`: le quattro pagine si aprono senza errori. Tutti i percorsi dei siti sono relativi.

Comandi già dati al docente per installarlo (non ancora eseguiti, perché lo spostamento è rimandato): caricare il `.tar.gz` in `/var/www/html/gcatalfamo/`, poi `tar -xzf … --no-same-owner`, `chown -R aeberlin:webdev .`, `chmod` 755/644 e `chmod 2755 .` (toglie la scrittura al gruppo `webdev`).

**Attenzione per lo spostamento**: il `localStorage` è legato all'indirizzo; il lavoro salvato su `halmob01.github.io` non compare sul nuovo indirizzo. Ogni studente deve «Scarica una copia» là e «Carica una copia» qua.

### 4.2 Preparazione del server (`deploy/installa-portale.sh`)
Da eseguire come root sul server (`--controlla` per i soli controlli, `--si` per non chiedere conferma, `--sviluppatore UTENTE`, `--disinstalla [--anche-i-dati]`). Fa solo questo:
- scarica **Node v26.13.1** (LTS «Lithium», aggiornamento di sicurezza del 10/11/2026; la v26.13.0 del piano è superata) in `/opt/portale/node-v26.13.1`, con le **impronte SHA-256 scritte nello script** (x64 `5c063e46…bc864`, arm64 `89e18531…92d5dd`), e il collegamento `/opt/portale/node`;
- crea l'utente di sistema `portale` (senza shell);
- crea `/opt/portale/app` (proprietario lo sviluppatore o root, gruppo `portale`, 2750), `/var/lib/portale/{foto,backup}` (solo `portale`, 700), `/etc/portale/portale.env` (root:portale 640) con `PORTALE_PORTA=3100`, `PORTALE_DATI`, `PORTALE_PERCORSO=/gcatalfamo/`, `PORTALE_ORIGINE=` **da completare**;
- prova che Node con SQLite parta come utente `portale`.

Non tocca Apache, systemd, pacchetti o porte. Si può rieseguire (non rifà quello che c'è e non cambia il proprietario di `app`). Provato in un ambiente Debian di prova: installazione, seconda esecuzione, controlli.

### 4.3 File per systemd e Apache (`deploy/`)
- `portale.service`: utente `portale`, `EnvironmentFile=/etc/portale/portale.env`, `ExecStart=/opt/portale/node/bin/node --disable-warning=ExperimentalWarning /opt/portale/app/server/portale.js`, `MemoryMax=400M`, `CPUQuota=50%`, protezioni (`ProtectSystem=strict`, `ReadWritePaths=/var/lib/portale`, `NoNewPrivileges`, nessuna capability, `UMask=0077`…).
- `portale-backup.service` + `portale-backup.timer`: copia del database ogni notte alle 2:17.
- `apache-portale-api.conf`: **solo per la fase di prova**. `ProxyPass "/PERCORSO/api/" "http://127.0.0.1:3100/api/"` più `LimitRequestBody 2 MB`, da includere con una riga **dentro** il `<VirtualHost *:443>` esistente (non in `conf-enabled`, che varrebbe anche per la porta 80). Richiede `a2enmod proxy proxy_http`. Sostituire `PERCORSO` con `gcatalfamo`.

### 4.4 Il programma (`server/`, nessuna dipendenza esterna)

| File | Che cosa fa |
|---|---|
| `portale.js` | server HTTP su 127.0.0.1; intestazioni di sicurezza su ogni risposta (`nosniff`, `no-store`, CSP `default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy`, CORP); corpo massimo 1 MB (413); le richieste che scrivono richiedono `X-Portale: 1` e `Origin` uguale a `PORTALE_ORIGINE` (altrimenti 403); IP da `X-Forwarded-For` solo se la connessione è locale; cookie con `Path=<PORTALE_PERCORSO>api/`, `HttpOnly`, `Secure`, `SameSite=Strict` |
| `api.js` | tutte le richieste (vedi sotto) |
| `db.js` | apertura di SQLite (WAL, foreign keys), **migrazioni numerate** in `PRAGMA user_version` (oggi 3), registro tecnico, copia coerente con l'API di backup di SQLite, impostazioni |
| `sicurezza.js` | codici, token, password (scrypt), cookie del dispositivo firmati (HMAC), contatori dei tentativi |
| `backup.js` | copia notturna in `/var/lib/portale/backup/portale-AAAA-MM-GG.sqlite`, tiene 7 giornaliere, 4 settimanali (domenica), 12 mensili (giorno 1) |
| `amministra.js` | dal terminale: `crea-docente EMAIL "NOME" [--admin]` (stampa la password provvisoria), `reimposta-password`, `disattiva-docente`, `elenco-docenti`, `stato` |

**Tabelle** (migrazioni 1-3): `registro`, `classi`, `studenti` (codice e codice QR in chiaro per ristampare i cartellini, `versione_codice`, `attivo`, `cartella_rete`), `docenti`, `sessioni` (solo l'impronta SHA-256 del token), `documenti` (uno per studente e tipo, con `rev`), `revisioni` (con autore), `letture` (registro delle letture e modifiche dei docenti), `impostazioni`.

**Richieste dell'API**

| Metodo e percorso | Chi | Che cosa |
|---|---|---|
| `GET /api/stato` | tutti | «sono vivo», versione, schema |
| `POST /api/accesso/studente` `{codice}` o `{qr}` | tutti | apre la sessione dello studente |
| `POST /api/accesso/docente` `{email, password}` | tutti | apre la sessione del docente |
| `POST /api/esci` | collegati | chiude la sessione |
| `GET /api/io` | collegati | profilo (studente: nome, cognome, classe, indirizzo, anno) |
| `GET /api/documenti` | studente | elenco dei suoi documenti con revisione |
| `GET/PUT /api/documenti/:tipo` | studente | legge / salva `{base, dati}` |
| `GET /api/documenti/:tipo/revisioni[/:rev]` | studente | cronologia e versioni precedenti |
| `GET/POST /api/classi` | docente | elenco e creazione delle classi |
| `GET/POST /api/classi/:id/studenti` | docente | studenti con codice stampato, QR, ultimo accesso, dispositivi; aggiunta da `{studenti: [{nome, cognome}]}` |
| `PATCH /api/studenti/:id` | docente | nome, cognome, classe, attivo |
| `POST /api/studenti/:id/rigenera` | docente | nuovi codici, i vecchi non valgono, tutte le sessioni chiuse |
| `GET/PUT /api/studenti/:id/documenti/:tipo` (+ `/revisioni`) | docente | lettura e correzione, sempre nel registro |
| `POST /api/docente/password` | docente | cambio password, esce dagli altri dispositivi |
| `GET/POST /api/docenti`, `GET /api/studenti/:id/registro` | amministratore | docenti; chi ha letto o modificato il lavoro di uno studente |

**Regole implementate**
- **Codice del cartellino**: 8 caratteri dall'alfabeto `ACDEFGHJKMNPQRTUVWXY34679` (niente caratteri ambigui), stampato come `3ELE-XXXX-XXXX`. La sigla della classe è solo un aiuto: non conta per l'accesso, così il cartellino resta valido negli anni. Si accetta scritto in minuscolo, con spazi o trattini. Il **QR** porta un codice diverso di 32 caratteri.
- **Durata delle sessioni**: dal QR (telefono) fino al 31 agosto, cookie persistente; con il codice scritto (PC) cookie di sessione, chiusura dopo **30 minuti** senza richieste e comunque dopo 8 ore; docenti 2 ore di inattività, 12 ore al massimo.
- **Documenti** gestiti: `diario`, `bilancio`, `cv`. Il server li ricontrolla con le **stesse funzioni dei siti** (`diario/js/diario.js`, `js/bilancio.js`, `js/cv.js` → `normalizza`), quindi i campi sconosciuti spariscono.
- **Niente sovrascritture in silenzio**: ogni salvataggio dichiara `base` (la revisione da cui parte); se nel frattempo un altro ha salvato, risposta **409** con la versione attuale. Gli stessi dati non creano una revisione nuova.
- **Revisioni**: ogni salvataggio lascia una revisione con l'autore (studente o nome del docente); i salvataggi dello stesso autore entro 10 minuti diventano una revisione sola; si tengono 30 giorni (le ultime 5 sempre).
- **Docenti**: tutti leggono e correggono tutti; lettura, modifica, rigenerazione e cambio di profilo vanno in `letture`. Lo studente vede `autore: {tipo: 'docente', nome}`.
- **Limite dei tentativi per dispositivo** (cookie tecnico `portale_disp`, firmato, un anno): 10 codici sbagliati in 10 minuti bloccano solo quel browser; docenti 5 password sbagliate per dispositivo in 15 minuti e 30 all'ora per account; il QR non ha limite. Dispositivi nuovi: al massimo 300 ogni 10 minuti per IP e 1000 in tutto (contro chi cancella i cookie). Con 300 studenti servono in media 5 × 10^8 tentativi per indovinare un codice: circa 3 anni da un IP vero, circa 1 anno al massimo complessivo. Oltre 300 errori in 10 minuti il registro segna «allarme».

### 4.5 Test (`tests/server.test.cjs`, 17 test)
Avviano davvero il server su una porta locale con un database temporaneo. Coprono: intestazioni e 404/405/401; origine e `X-Portale`; corpo oltre 1 MB; cookie dei docenti; accesso degli studenti con codice scritto in vari modi e con QR; una classe intera dallo stesso IP mentre un compagno è bloccato; tetto ai dispositivi nuovi; docenti bloccati per dispositivo; salvataggio, conflitto 409, dati ricontrollati; correzione del docente con registro e revisioni; rigenerazione del cartellino; inattività e uscita; cambio password; codici e scrypt; fine dell'anno scolastico; backup e rotazione.

La CI (`.github/workflows/test.yml`) controlla anche la sintassi di `server/*.js` e degli script in `deploy/`.

### 4.6 Siti collegati al server (F1, blocco 1, 26 novembre 2026)

Decisioni del 26/11: si fa F1 a blocchi, uno alla volta, provandoli prima di andare avanti; l'accesso e la mia area stanno **nella pagina iniziale**; per i QR dei cartellini (blocco del pannello docente) si userà una libreria MIT copiata nel progetto.

| File | Che cosa fa |
|---|---|
| `js/config.js` | `urlApi`: indirizzo dell'API (per esempio `/gcatalfamo/api/`). **Vuoto = tutto come prima**: nessun accesso, salvataggio solo sul dispositivo. `deploy/prepara-siti.sh` lo imposta con `PORTALE_PERCORSO` (predefinito `/gcatalfamo/`). |
| `js/archivio.js` | `BC_ARCHIVIO.memoria` sostituisce `localStorage` in tutti i siti (stessi comandi). Da entrati: chiavi con il prefisso dello studente (`u12:…`); con il QR `localStorage`, con il codice scritto `sessionStorage` (sparisce chiudendo il browser); ogni documento salvato parte verso il server dopo 2 secondi (`PUT` con `base`); senza rete riprova al ritorno della rete e ogni 30 secondi; uscendo dalla pagina prova con `keepalive`; a ogni apertura di pagina legge dal server i quattro documenti e applica le versioni più nuove; al 409 unisce e, se la stessa voce è cambiata dalle due parti, chiede quale tenere; nome e «Esci» in testata; avviso se la sessione è finita (il lavoro resta). |
| `js/unione.js` | unione a tre vie (ultima versione comune, questo dispositivo, server): elenchi con `id` voce per voce, il resto campo per campo; voce cancellata da una parte e cambiata dall'altra: resta; `aggiornato`: il più recente. |
| `js/area.js` | pagina iniziale: campo «Entra con il codice del tuo cartellino»; QR con `#qr=…` (tolto subito dall'indirizzo); al primo accesso «questo lavoro è tuo?» per il lavoro salvato prima di entrare; la mia area (saluto, classe, stato dei percorsi con ultima modifica e correzioni dei docenti, chi vede il lavoro, «Esci»). |
| `server/api.js` | tipo di documento `portfolio` (solo i testi, ricontrollati con `portfolio/js/attivita.js`). |

**«Esci»** manda prima quello che manca (se non ci riesce chiede conferma), chiude la sessione e toglie dal browser **tutte** le chiavi dello studente e il suo archivio delle foto (`portfolio-foto-u12`).

**Provato** (26/11) in Chromium con il server vero avviato nello script di prova: telefono con QR e PC con codice sulla stessa studentessa, diario scritto sul telefono e ritrovato sul PC, stessa voce cambiata sui due dispositivi (domanda e unione: restano la città scritta dal telefono e l'azienda scelta sul PC), «Esci» che svuota il browser, lavoro fatto senza accesso adottato al primo ingresso, cartellino rigenerato (avviso, lavoro conservato). Test automatici: `tests/unione.test.cjs`, tipo `portfolio` in `tests/server.test.cjs`.

### 4.7 Foto sul server (F1, blocco 2, 26 novembre 2026)

- **Archivio:** tabella `foto` (migrazione 4: studente, id scelto dal telefono, nome casuale del file, byte, dimensioni); i file in `PORTALE_DATI/foto/<id studente>/<nome casuale>.jpg` e `…-m.jpg` (miniatura), cartella 700, file 600, **fuori dal sito**.
- **Controlli:** JPEG vero (inizia FF D8 FF, finisce FF D9, ha le dimensioni); grande fino a 400 KB e 1600 px, miniatura fino a 60 KB e 480 px; id `f[a-z0-9]{6,40}`; **200 MB e 1500 foto per studente** (413 «quota»). Il caricamento è JSON con i due JPEG in base64 (resta sotto il limite di 1 MB del corpo e di 2 MB di Apache).
- **Richieste:** studente `GET /api/foto` (elenco), `PUT /api/foto/:id`, `GET /api/foto/:id` e `/mini`, `DELETE /api/foto/:id`. Docente `GET /api/studenti/:id/foto` (+ `/:fid`, `/:fid/mini`) e `DELETE /api/studenti/:id/foto/:fid` («elimina subito», con una riga nel registro). Le foto si consegnano solo allo studente e ai docenti (404 agli altri), con `nosniff`, `private, max-age=60`, CSP con `sandbox`. Le letture dei docenti vanno nel registro (una volta ogni 10 minuti per studente).
- **Telefono** (`portfolio/js/foto.js`): la riduzione tiene la foto sotto 380 KB (abbassa qualità e poi pixel); da entrati ogni foto parte in coda appena è pronta (confronto con l'elenco del server: manda solo quelle che mancano), senza rete aspetta; le foto tolte si tolgono dal server (anche in coda); una foto non presente su questo dispositivo si mostra, si mette nel PDF e nella copia prendendola dal server. «Esci» aspetta le foto e, se non ci riesce, chiede conferma (`registraSincronizzatore` in `js/archivio.js`).
- **Backup:** `server/backup.js` specchia `foto/` in `backup/foto` (copia le nuove, toglie quelle eliminate, così «elimina subito» vale anche lì). Resta da portare fuori dal server.
- **Non ancora:** pulizia delle foto non più usate da nessuna attività (si farà con il cestino, blocco 4), foto del curriculum.
- **Provato** (26/11, server vero): foto dal telefono sul server (87 e 83 KB), PC che le mostra senza averle, PDF dal PC con le foto, foto tolta senza rete che parte al ritorno della rete, «Esci» con foto ancora da mandare. Test: `foto: caricamento controllato…` e `backup delle foto…` in `tests/server.test.cjs`.

### 4.8 Più foto, file allegati e anni di corso (26 novembre 2026)

Decisioni del docente: **nessun limite di 4 foto** (il tetto serviva solo nel piano), attività **ordinate per anno di corso**, **file allegati** (Word, CAD, codice…) fino a **25 MB l'uno** e **1 GB per studente** (foto e file insieme).

- **Dati dell'attività:** `anno` (I-IV, proposto dal profilo, scelto al passo «Dove e quando»), `foto` (fino a 100) e `file: [{ id, nome, byte }]` (fino a 50). I tetti tengono solo il documento sotto 1 MB; il vero limite è la quota. Home con schede per anno (Tutte, I, II, III, IV, «senza anno» se serve); in «Tutte» le attività sono in sezioni per anno; il PDF va per anno, dal più vecchio al più recente, con i nomi dei file.
- **Server:** tabella `allegati` (migrazione 5); file in `PORTALE_DATI/allegati/<id studente>/<nome casuale>.bin` (700/600, fuori dal sito, senza l'estensione vera). `PUT /api/allegati/:id` con il file **grezzo** nel corpo e il nome in `X-Nome`: il corpo si legge **solo dopo** aver controllato che sia uno studente (un visitatore non fa caricare 25 MB); `GET /api/allegati` (elenco), `GET /api/allegati/:id` (download), `DELETE`. Docenti: `GET /api/studenti/:id/allegati` (+ `/:aid`) e `DELETE` («elimina subito», con riga nel registro; letture nel registro una ogni 10 minuti).
- **Che cosa si accetta:** qualsiasi file, **tranne un programma compilato riconosciuto dai primi byte** (Windows MZ, Linux ELF, Mac Mach-O): 415. Il **codice sorgente** (Python, Java, C, HTML, PHP, script…) è testo e passa; chi deve consegnare un programma compilato lo mette in un ZIP. Il divieto serve a evitare incidenti, non è una barriera: le protezioni vere sono che il server **non apre e non esegue mai** i file, li consegna **solo come allegato** (`application/octet-stream`, `Content-Disposition: attachment`, `nosniff`), li tiene **fuori dal sito con nomi casuali** e li fa vedere **solo allo studente e ai docenti**. Prima dei dati veri: valutare con il collega un antivirus sul server (per esempio ClamAV) che controlli i file in arrivo.
- **Quota unica:** foto e file insieme, 1 GB per studente (413 «quota»); controllo della dimensione dichiarata prima di leggere il corpo.
- **Apache:** `LimitRequestBody` a 26 MB solo per `/…/api/allegati/<id>` e timeout del proxy a 300 secondi (`deploy/apache-portale-api.conf`); il programma accetta richieste fino a 5 minuti (`requestTimeout`), le intestazioni restano a 10 secondi.
- **Telefono e PC** (`portfolio/js/file.js`): il file si salva nel browser (IndexedDB «portfolio-file-u12») e, da entrati, parte verso il server in coda (confronto con l'elenco del server); senza rete aspetta; un file rifiutato (spazio finito, programma) non si ritenta all'infinito (spazio finito si riprova a ogni apertura); un file solo sul server si scarica da lì con il suo nome. I file **non stanno nella copia `.json`** (sarebbe enorme): si scaricano uno per uno dalla scheda; lo dice «Dove va il mio lavoro?».
- **Backup:** `server/backup.js` specchia anche `allegati/` in `backup/allegati`. **Attenzione allo spazio:** con 1 GB per studente il backup raddoppia l'occupazione; controllare con il collega.
- **Provato** (26/11, server vero): 6 foto in una sola attività, un Word, un disegno CAD e un file Python caricati, un `.exe` rifiutato con messaggio («Mettilo in un file ZIP»), schede per anno e sezioni in «Tutte», download identico all'originale dal PC e da un secondo dispositivo che non ha i file, file tolto che sparisce dal server e dal disco. Test: `file allegati…` in `tests/server.test.cjs`, due test nuovi in `tests/portfolio.test.cjs`.

**Sul server**, in `/opt/portale/app` oltre a `server/` servono: `js/dati.js`, `js/bilancio.js`, `js/cv.js`, `js/competenze.js`, `diario/js/diario.js`, `portfolio/js/attivita.js`.

---

## 5. Che cosa manca (in ordine consigliato)

1. ~~Collegare i siti al server~~ (le foto: §4.7): **fatto il 26/11/2026** (§4.6). Restano da fare: modalità senza rete con service worker (oggi senza rete la pagina deve essere già aperta o nella cache del browser); QR sullo schermo del PC; correzioni sul foglio del curriculum salvate nel documento. Era:
   - salvataggio locale **separato per studente** (oggi le chiavi `bilancio-competenze-v1`, `cv-v1`, `diario-tirocinio-v1` sono uguali per tutti; su un PC condiviso lo studente dopo caricherebbe il lavoro di quello prima);
   - invio al server con `base`, coda quando non c'è rete;
   - gestione del 409 con **unione per voce** (tirocini, settimane ed esperienze hanno già un `id`), chiedendo allo studente solo se la stessa voce è cambiata da tutte e due le parti;
   - primo accesso di chi ha già lavorato senza server o su due dispositivi; «Carica una copia» trattato come una modifica fatta adesso;
   - all'uscita da un PC, togliere la copia locale;
   - pagina di accesso (codice scritto, lettura del QR con `#` nell'indirizzo e poi `history.replaceState`), «la mia area».
2. **Cestino per voce** (una settimana, un'esperienza, un'attività), 30 giorni, ripristinabile da studente e docente; «elimina subito» per le foto.
3. **Pagine dei docenti**: classi, importazione dell'elenco, **stampa dei cartellini con QR**, avanzamento, lettura e correzione nei siti stessi («modalità docente» con fascia in alto, senza salvare nel browser del docente), avviso allo studente delle correzioni.
4. **Portfolio** con foto (ridotte sul telefono, JPEG ~1280 px; sul server controllo dei primi byte, nomi casuali, fuori dal sito; foto e coda locale in IndexedDB, non in `localStorage`).
5. **Sicurezza da completare**: secondo fattore (TOTP) per i docenti o pannello solo dalla rete della scuola; service worker per l'uso senza rete; correzioni sul foglio del curriculum salvate nel documento.
6. **`deploy/LEGGIMI.md`**, la guida passo per passo per il server (già citata dagli script ma non ancora scritta), e la configurazione Apache per il **nome di dominio dedicato** (`deploy/apache-portale-vhost.conf`, citata ma non scritta).
7. **`deploy/aggiorna.sh`** (piano §3 bis, da scrivere e provare): pubblicazione dal repository clonato sul server, con test prima di pubblicare, versione precedente da ripristinare, cartella di prova, registro delle pubblicazioni. Sostituisce il pacchetto caricato a mano con FileZilla (`deploy/prepara-siti.sh` resta come alternativa senza git).
8. **Spostamento sul server** (ultimo, per decisione del docente): `apt install git` (con il collega) → installa-portale → clonare il repository in `/opt/portale/sorgente/` → `aggiorna.sh` (copia `server/`, `js/{dati,bilancio,cv,competenze}.js`, `diario/js/diario.js` e `portfolio/js/attivita.js` in `/opt/portale/app`, i siti in `gcatalfamo/`) → servizio → backup → Apache.
9. Copia notturna nelle cartelle di rete degli studenti (piano §14 bis), dopo tutto il resto.

## 6. Decisioni ancora aperte

1. **Bilancio**: il docente può cambiare i livelli e le scelte dello studente, o solo correggere i testi e commentare? (proposta: solo testi e commenti, perché è un'autovalutazione). Oggi il server permette tutto.
2. **Diario**: il docente lo corregge come gli altri documenti o lascia solo commenti?
3. Lo studente può **annullare** una correzione del docente o solo vederla?
4. **Nome di dominio dedicato** per il portale (da chiedere al collega; necessario prima dei dati veri).
5. **Dove vanno i backup** fuori dal server e chi li controlla.
6. Titolare del trattamento, chi gestisce il server e chi aggiorna Node; ore disponibili per sviluppo e manutenzione.
7. Studenti che lasciano il CFP: possono ancora entrare per scaricare il lavoro, e fino a quando?
8. **Repository pubblico o privato?** Se privato, il server ha bisogno di una deploy key di sola lettura per `git pull`. E `apt install git` va concordato con il collega.

## 7. Prima dei dati veri (condizioni)

Parere del **DPO** (con base giuridica, accesso di tutti i docenti con registro, procedura per le richieste dei genitori, frase per le aziende, conservazione) · **nome di dominio dedicato** senza PHP · **backup** fuori dal server con una prova di ripristino · `PORTALE_ORIGINE` impostata · aggiornamenti di sicurezza attivi sul server.

## 8. Come riprendere

```sh
git fetch origin
git checkout claude/ecstatic-hopper-lm1vdf
node --test tests/*.test.cjs        # 103 test verdi
PORTALE_DATI=/tmp/portale PORTALE_PORTA=3100 node server/portale.js   # prova locale
PORTALE_DATI=/tmp/portale node server/amministra.js crea-docente prof@scuola.it "Nome Cognome" --admin
bash deploy/prepara-siti.sh         # pacchetto dei siti
```

Il docente scrive in italiano semplice e non vuole emoji. Il piano completo è `docs/PIANO-PORTALE.md`, in questo ramo.

### 4.9 Pannello dei docenti (F1, blocco 3, 26 novembre 2026)
- Indirizzo: `/docenti/` (sito statico, copiato da `deploy/prepara-siti.sh`). Accesso con email e password; la password provvisoria va cambiata al primo accesso.
- I docenti vedono solo «Attività e avanzamento» (stati di portfolio, diario, bilancio, curriculum, foto, file, ultimo accesso); la lettura dei testi è il blocco 8.
- Classi: elenco incollato da un foglio, codici, nuovo codice, sposta, disattiva, esportazione CSV (punto e virgola, BOM, celle protette da formule).
- Cartellini: griglia A4, 10 per foglio (85x50 mm). Il QR contiene `<sito>/#qr=<codice>`; verificato leggendo il QR stampato con jsQR e accedendo come studente.
- Pagina dello studente: attività per anno, foto, file scaricabili, «Elimina subito» (senza cestino, registrato nel registro letture).
- Solo l'amministratore: crea docenti, reimposta password (mostrata una volta), disattiva. Il primo amministratore resta da terminale.
- Libreria QR: `js/qrcode.js` (qrcode-generator, MIT, licenza in `js/LICENSE-qrcode-generator.txt`).
- Prova nel browser: lo script e2e è stato eseguito con il server vero (accesso, cambio password, classe, elenco, cartellini, avanzamento, CSV, studente, docenti).

### 4.10 Cestino di 30 giorni (F1, blocco 4, 26 novembre 2026)
- **Come funziona.** Il server non conosce «cancella attività»: a ogni salvataggio confronta il documento con la versione precedente (`server/cestino.js`) e le voci con un `id` che non ci sono più (attività, tirocini, settimane, esperienze, lingue, formazione…) vanno nella tabella `cestino`, intere, con chi le ha tolte e quando. Una settimana di un tirocinio che resta si conserva da sola; di un tirocinio tolto si conserva tutto, settimane comprese. Una scheda appena creata e vuota non entra nel cestino.
- **Foto e file.** Quando lo studente li toglie (il sito lo fa da solo quando l'attività sparisce) il server li segna `eliminata` ma li lascia sul disco. Non si leggono, non contano nella quota (ma c'è un tetto di 2 GB con il cestino, contro chi carica e toglie di continuo). Salvare un documento che li usa li rimette a posto: vale anche per il ripristino di una revisione.
- **Ripristino.** Studente: `POST /api/cestino/:id/ripristina`; docente: `POST /api/studenti/:id/cestino/:cid/ripristina` (riga nel registro, il documento risulta modificato dal docente). Se il posto non c'è più (la settimana ma non il tirocinio) risponde 409 `contenitore`.
- **Elimina per sempre** (solo lo studente): `DELETE /api/cestino/:id` toglie la voce e le sue foto e file, se nessuna attività li usa più. «Elimina subito» dei docenti resta senza cestino.
- **Scadenza.** `pulisci()` (ogni ora): voci oltre 30 giorni; foto e file oltre 31 giorni (un giorno in più, così una voce ancora nel cestino non perde le foto).
- **Interfaccia.** Pagina iniziale: pulsante «Cestino» (`js/area.js`). Pannello docenti: «Cancellato di recente» nella pagina dello studente. Migrazione 7.
- Non fatto: vista del cestino di tutta la classe; per i testi cancellati dentro un campo restano le revisioni (§5).

### 4.11 Orientamento in uscita (26 novembre 2026)
- **Sito** `orientamento/` (card 05 nella pagina iniziale). Parte «Cosa faccio dopo»: La strada, Cosa mi piace, Cosa so fare, Dove vorrei andare, I prossimi passi, Il mio foglio (stampa e copia). Modello: il diario.
- **Documento** `orientamento` (chiave locale `orientamento-v1`): `profilo{indirizzo, anno}` e `uscita{piace, attivita[max 3], imparare, strade[max 2: id + perche], passi[max 3: id, cosa, con, entro]}`. Normalizzato in `orientamento/js/orientamento.js`, usato anche dal server (`TIPI.orientamento`).
- **Dialogo con le altre sezioni**: solo lettura. Le attività piaciute si scelgono dal portfolio (per id); il bilancio si legge per il promemoria. Mai modificati.
- **Mappa**: percorso 3+1 oppure quattro anni (`PERCORSO_QUADRIENNALE`, oggi Informatica I e II; da aggiornare ogni settembre). Tutti i fatti hanno la fonte in `docs/FILIERA.md`, con l'elenco di quello che resta da verificare.
- **Pannello docenti**: quinta colonna «Orientamento» nell'avanzamento e nel CSV (6 passi). **Cestino**: i passi e le strade tolti si recuperano come ogni altra voce.
- **Non fatto**: «Racconto il CFP» (orientamento in entrata: le quattro domande e il testo per l'open day oggi nel bilancio, più le domande dei ragazzi delle medie). Quando si sposta, la sezione 07 si toglie dal bilancio.

### 4.12 Bilancio agganciato alle competenze regionali (26 novembre 2026)
- **Principio**: lo studente vede solo la frase semplice (`semplice` in `js/competenze.js`); il documento salva l'identificativo della competenza del catalogo con la sua risposta; il «motore» (`riferimentiRegionali`) sa tornare al testo ufficiale, alla figura (es. Operatore elettrico) e al livello EQF.
- **Dati**: `bilancio.regionali = { <id competenza>: { livello, nota } }`, stessa scala di autonomia delle sei situazioni. Gli id non presenti nel catalogo si scartano. Le sei situazioni restano la base comune a tutti gli indirizzi: le regionali sono un **secondo livello** e non cambiano lo stato della sezione.
- **Prova**: per chi dichiara «da solo» basta una frase (`nota`) oppure almeno un'attività del portfolio con quella competenza (`attivitaPer`, letta in sola lettura). Senza prova la voce resta «da documentare», come per le situazioni.
- **Dossier**: le competenze regionali entrano negli stessi quattro elenchi (so fare, ho imparato, devo ancora imparare, mai affrontato); in fondo un riquadro con il testo ufficiale (aperto nella stampa, chiuso sullo schermo).
- **Pagine**: `bilancio/` e `orientamento/` caricano `js/competenze.js`; il curriculum no (non cambia).
- **Non fatto**: le frasi regionali non entrano ancora nel campo «competenze» del curriculum (solo le sei situazioni); la vista dei docenti per competenza (blocco 8).

### 4.13 Racconto il CFP: orientamento in entrata (27 novembre 2026)
- **Orientamento** ha due parti nella stessa pagina e nello stesso documento: «Racconto il CFP» (`entrata`: 3 passi) e «Cosa faccio dopo» (`uscita`: 6 passi). L'avanzamento per il pannello conta 9 passi.
- **Racconto il CFP**: (1) le quattro domande dell'open day (presentati, racconto, difficile, consiglio); (2) sei domande dei ragazzi di terza media, tutte facoltative (giornata, pratica, iscriversi, professori, dopo, rifaresti), con un pulsante che porta le strade scelte in «Cosa faccio dopo» nella risposta «dopo»; (3) il testo per l'open day, con la bozza che mette in fila le risposte senza riscriverle. Si stampa un foglio con il testo e le risposte date. Nessuna pagina pubblica, nessuna foto.
- **Dal bilancio**: la sezione 07 «Orientamento» non c'è più. Le risposte già scritte lì si copiano nella nuova parte **una volta sola** (`importaDalBilancio`, segnata da `entrata.importato`), solo se la parte è ancora vuota. Il bilancio le conserva nel documento ma non le mostra né le stampa; `DATI.ORIENTAMENTO` e `componiOrientamento` restano solo per leggerle (e per il foglio Google, spento).
- Il bilancio ha cinque sezioni.

### 4.14 Vista dei docenti per competenza (27 novembre 2026)
- **Server** (sola lettura, docenti): `GET /api/classi/:id/competenze` e `GET /api/studenti/:id/competenze`. Per ogni competenza regionale dell'indirizzo e anno della classe: lo studente ha risposto? A che livello? C'è una prova (attività del portfolio collegata o frase)? Quante attività la mostrano? **Nessun testo dello studente** nella risposta (provato dal test).
- **Pannello**: nella classe, scheda «Competenze»: elenco per gruppo, con riassunto («3 risposte · 2 su 3 con prova»); aprendo una competenza si vede il testo ufficiale della Regione e chi ha risposto, con link allo studente. «Esporta le competenze in CSV»: una riga per studente, una colonna per competenza. Nella pagina dello studente: «Competenze regionali» con livello e prova.
- **Registro**: come l'avanzamento della classe, questa vista non scrive nel registro delle letture, perché non mostra testi. Se il blocco 8 deciderà che anche i livelli vanno registrati (§17), basta aggiungere una riga alla lettura.
- Non fatto: filtri (per livello, per «senza prova»); correzione delle risposte da parte dei docenti.

### 4.14 Correzioni normative su competenze e orientamento (27 novembre 2026)
Verifica sui testi della cartella di progetto «Filiera 4+2». Ogni correzione ha la sua fonte nel codice (commenti) e in `docs/FILIERA.md` (segnate **[rev. 27/11]**).
- **Competenze di base** (`js/competenze.js`, `BASE`): le competenze culturali di base della DGR 3192/2020, Allegato B1, con il testo ufficiale; fino al III anno quelle di III livello EQF (lingua straniera A2 QCER), al IV anno quelle di IV livello (B1 QCER), che presuppongono le prime. Frasi semplici da rivedere con i docenti dell'area culturale.
- **Competenze personali, sociali, di apprendimento e imprenditoriali** (`TRASVERSALI`): le quattro dell'Accordo Regioni 18/12/2019, Allegato 2, richieste con valutazione distinta nei quadriennali di filiera (DGR 2954/2024, All. B, punto 2). Le sei situazioni del bilancio hanno ora `riferimenti` (in `js/dati.js`) verso B1, B2 ricorsive e Allegato 2: corrispondenza di massima, da rivedere.
- **Indirizzo del Repertorio** (`articolazioniPer`, `profilo.articolazioni` nel bilancio): lo standard è la figura più l'indirizzo scelto (Decreto 12550/2013, §3.2). Nella schermata delle competenze lo studente sceglie su che cosa lavora la classe; gli altri indirizzi spariscono, le risposte già date restano in «Già scelte prima». Il dossier riporta il nome ufficiale dell'indirizzo.
- **Curvatura dei quadriennali** (`CURVATURE`): il posto per le competenze del profilo curvato verso l'ITS (DGR 2954/2024, All. B, punto 5). È vuoto: il testo va preso dal PFP del CFP, non si inventa.
- **EQF e certificazione**: nel dossier e nel pannello docenti il livello EQF è detto «del titolo di riferimento», non un livello raggiunto, con l'avvertenza che il bilancio è autovalutazione e non valutazione né certificazione (D.Lgs. 13/2013). Il riquadro si chiama «Le competenze di riferimento» e ogni voce riporta la sua fonte.
- **Orientamento** (`orientamento/js/orientamento.js`): nel quadriennale la mappa ha la tappa della qualifica al terzo anno (DGR 2954/2024, All. B, punto 3); la nota sulla riforma dice che l'accesso diretto a ITS ed Esame di Stato in Lombardia oggi non vale (SETT 2025, par. III); dal diploma all'ITS serve il certificato IFTS (legge 99/2022, art. 1 c. 2); la strada «Scuola professionale» non promette il riconoscimento (Decreto 12550/2013, §4.6); nuova nota sui passaggi nei quadriennali fino al II anno (DGR 2954/2024, All. B, punto 6).
