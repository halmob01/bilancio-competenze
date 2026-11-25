# Istruzioni per la sessione dal PC: accesso al server e pubblicazione

Scritto il **25 novembre 2026** per una nuova sessione di Claude Code aperta **sul PC del docente** (Windows). Dal cloud il server della scuola non si raggiunge: la rete dell'ambiente lo blocca e SSH non si può usare. Questa sessione invece lavora dal PC, che arriva al server con SSH e SFTP.

Prima di cominciare leggi anche `docs/RIPRESA-BACKEND.md` (stato del backend e decisioni prese) e `docs/PIANO-PORTALE.md` §2, §3 e §3 bis (dove stanno le cose sul server e come si pubblica). In questo file trovi solo quello che è cambiato e i passi da fare.

> **Nessuna credenziale in questo repository.** La password dell'account e la chiave privata non si scrivono mai in file, commit, messaggi o comandi salvati. La password la conosce il docente; la chiave sta solo in `%USERPROFILE%\.ssh` sul PC.

---

## 1. Che cosa è cambiato dal 18 novembre

| Cosa | Prima (negli appunti) | Ora |
|---|---|---|
| Account sul server | si pensava a `aeberlin` o a root | **`gcatalfamo`**, creato dal collega per il docente |
| Accesso SSH | come root, con sudo senza password | come `gcatalfamo`, **con chiave** `id_ed25519_gcatalfamo` (`-o IdentitiesOnly=yes -o PreferredAuthentications=publickey`) |
| FileZilla | account non noto | `gcatalfamo` con password (provvisoria, **da cambiare** al primo accesso) |
| Cartella | `/var/www/html/gcatalfamo/` | uguale. Il collega scrive «ti butta dentro una cartella e basta»: l'account potrebbe essere **chiuso** in quella cartella e **senza sudo** (da verificare, §4) |
| Codice | backend sul ramo `claude/ecstatic-hopper-lm1vdf` | tutto in **`main`** (stesso commit `94c03c6`) |

Host: `afolmet-rozzano.sytes.net`. Indirizzo pubblico dei siti: `https://afolmet-rozzano.sytes.net/gcatalfamo/`.

**Conseguenza.** Se `gcatalfamo` non ha sudo, si possono pubblicare **solo i siti statici**. Il backend (`deploy/installa-portale.sh`, `/opt/portale`, `/var/lib/portale`, `/etc/portale`, systemd, Apache) richiede root: lo installa il collega con i comandi preparati, oppure serve un accesso con sudo.

---

## 2. Preparare il PC (una volta)

1. **Git per Windows** (include Git Bash, che serve per `deploy/prepara-siti.sh`): `winget install Git.Git`.
2. **Node.js 22 o più recente** per i test: `winget install OpenJS.NodeJS.LTS`.
3. **OpenSSH client**: su Windows 10/11 c'è già. Verifica con `ssh -V` e `scp` nel cmd.
4. **La chiave**, come indicato dal collega (nel cmd):
   ```
   if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
   explorer "%USERPROFILE%\.ssh"
   ```
   e incolla lì `id_ed25519_gcatalfamo` (privata, 444 byte) e `id_ed25519_gcatalfamo.pub` (pubblica, 93 byte).
   Se SSH rifiuta la chiave per «permissions too open», restringi i permessi alla sola tua utenza:
   ```
   icacls "%USERPROFILE%\.ssh\id_ed25519_gcatalfamo" /inheritance:r /grant:r "%USERNAME%:R"
   ```
5. **Un nome breve per il server**: crea (o completa) `%USERPROFILE%\.ssh\config` con:
   ```
   Host scuola
       HostName afolmet-rozzano.sytes.net
       User gcatalfamo
       IdentityFile ~/.ssh/id_ed25519_gcatalfamo
       IdentitiesOnly yes
       PreferredAuthentications publickey
   ```
   Da qui in poi bastano `ssh scuola`, `scp file scuola:percorso`, `sftp scuola`.
6. **Il repository**:
   ```
   git clone https://github.com/halmob01/bilancio-competenze.git
   cd bilancio-competenze
   node --test tests/*.test.cjs
   ```
   I test devono essere tutti verdi (103 al 18/11).

---

## 3. Primo accesso e cambio della password

1. `ssh scuola`. Al primo collegamento SSH chiede di confermare l'impronta del server: rispondi `yes` solo se l'host è `afolmet-rozzano.sytes.net`.
2. **Cambio password** (la vecchia è passata in chat): `passwd`. **La scrive il docente nel terminale**, non va dettata a Claude né messa in un comando. Poi va aggiornata in FileZilla.
   - Se `passwd` non è permesso (account solo SFTP), chiedere al collega di cambiarla.
3. In FileZilla usare **SFTP** (`sftp://afolmet-rozzano.sytes.net`, porta 22), non FTP sulla 21, che manda la password in chiaro. In FileZilla si può usare anche la chiave (Modifica, Impostazioni, SFTP, aggiungi il file della chiave privata).

---

## 4. Diagnosi dell'account (solo lettura)

Comandi da lanciare dopo `ssh scuola`, **nessuno modifica niente**:

```
whoami; id; groups
echo "home: $HOME"; pwd
sudo -n -l 2>&1 | head -20
ls -la /var/www/html/gcatalfamo
ls -ld /var/www/html /var/www/html/gcatalfamo
command -v git node tar rsync
df -h /var/www/html | tail -1
```

Come leggere il risultato:

| Risultato | Significa | Si può fare |
|---|---|---|
| `ssh` apre una shell e `sudo -n -l` elenca dei permessi | account con sudo | tutto il piano: siti, backend, `aggiorna.sh` (§6) |
| shell aperta, `sudo` rifiuta | account normale | solo i siti statici (§5). Il backend lo installa il collega |
| `ssh` si chiude subito o dice «This service allows sftp connections only» | account solo SFTP, chiuso nella cartella | solo i siti statici, caricati con `sftp`/`scp` o FileZilla (§5, variante B) |

Annota l'esito in `docs/RIPRESA-BACKEND.md` §3 (senza credenziali).

---

## 5. Pubblicare i siti statici

È il passo che si può fare con qualunque tipo di account. **Prima chiedi conferma al docente**: la decisione del 18/11 era spostare sul server per ultimo, e gli studenti che hanno lavorato su GitHub Pages devono prima fare «Scarica una copia» (il salvataggio del browser è legato all'indirizzo).

1. **Pacchetto** (in Git Bash, dalla cartella del repository, su `main` aggiornato):
   ```
   git checkout main && git pull
   bash deploy/prepara-siti.sh
   ```
   Crea `dist/siti/` e `dist/siti-AAAA-MM-GG-<commit>.tar.gz` (solo i file dei siti, `urlInvio` vuoto, `versione.txt`).

2. **Variante A, con shell**:
   ```
   scp dist/siti-*.tar.gz scuola:/var/www/html/gcatalfamo/
   ssh scuola
   cd /var/www/html/gcatalfamo
   ls -la                     # controlla che cosa c'è prima di sovrascrivere
   tar -xzf siti-*.tar.gz --no-same-owner
   rm siti-*.tar.gz
   find . -type d -exec chmod 755 {} +
   find . -type f -exec chmod 644 {} +
   ```
   Il `chown` e il `chmod 2755 .` scritti in `RIPRESA-BACKEND.md` §4.1 erano pensati per root. Come `gcatalfamo` non si possono fare e non servono: i file restano di `gcatalfamo`. Che il gruppo `webdev` (forse anche gli studenti) possa scrivere nella cartella va segnalato al collega.

3. **Variante B, solo SFTP**: niente `tar` sul server. Carica il **contenuto** di `dist/siti/` dentro la cartella:
   ```
   sftp scuola
   cd /var/www/html/gcatalfamo
   put -r dist/siti/*
   ```
   Se il chroot fa vedere la cartella come `/`, usa `cd /` o il percorso che `pwd` mostra. In alternativa trascina `dist/siti/` con FileZilla.

4. **Verifica**: apri `https://afolmet-rozzano.sytes.net/gcatalfamo/` e `.../gcatalfamo/versione.txt`, poi `/diario/`, `/bilancio/`, `/cv/`. Le pagine devono aprirsi senza errori nella console del browser.

---

## 6. Il backend (solo se c'è sudo, altrimenti preparare per il collega)

Non installare niente senza il via del docente e **avvisando il collega**: è il suo server e alcuni passi toccano pacchetti di sistema e Apache. In ordine:

1. `sudo bash installa-portale.sh --controlla`, poi senza `--controlla` (lo script è in `deploy/`; caricarlo in `~`, **non** in `/var/www/html`, dove sarebbe scaricabile da chiunque).
2. Completare `/etc/portale/portale.env` (`PORTALE_ORIGINE=https://afolmet-rozzano.sytes.net`).
3. Copiare il programma in `/opt/portale/app/`: `server/`, `js/dati.js`, `js/bilancio.js`, `js/cv.js`, `diario/js/diario.js`.
4. `deploy/portale.service`, `deploy/portale-backup.service` e `.timer` in `/etc/systemd/system/`, poi `systemctl daemon-reload` ed `enable --now`.
5. Apache: `a2enmod proxy proxy_http`, includere `deploy/apache-portale-api.conf` (con `PERCORSO` = `gcatalfamo`) **dentro** il `<VirtualHost *:443>`, `apachectl configtest`, ricaricare.
6. `node /opt/portale/app/server/amministra.js crea-docente ...` per il primo amministratore.

Se l'account non ha sudo: prepara un unico file di istruzioni per il collega con questi passi e falli eseguire a lui.

**Limiti da ricordare** (piano §2):
- **Niente dati veri degli studenti** finché il portale condivide il nome di dominio con le pagine PHP e JS degli studenti in `/var/www/html/studenti/`. Prima serve un nome di dominio dedicato con un VirtualHost senza PHP.
- Mai clonare il repository dentro `/var/www/html/`.
- I `.htaccess` sono ignorati (`AllowOverride None`).

---

## 7. Da segnalare al collega (non toccare)

- Il vecchio `installa-portale.sh` in `/var/www/html/`, scaricabile da Internet: va spostato.
- `info.php` pubblico; `debian.txt`, `office.iso`, `ninite.exe`, `orario.xls` scaricabili; `test/` e `tesina/` con permessi 777 e PHP attivo; aggiornamenti automatici spenti.
- Chi rinnova il DNS dinamico `sytes.net`. Se decade, i QR stampati porterebbero a un indirizzo di qualcun altro.
- Se gli studenti sono nel gruppo `webdev`, che può scrivere in `gcatalfamo/`.

---

## 8. Regole di lavoro per la sessione

- Comandi di **sola lettura** liberi. Ogni modifica sul server (caricare, cancellare, `chmod`, installare) va **mostrata e approvata** dal docente prima di eseguirla.
- Prima di sovrascrivere o cancellare sul server, guardare che cosa c'è (`ls -la`).
- Le modifiche al codice si fanno nel repository e si pubblicano con commit e push su un ramo. Il server riceve solo copie di versioni pronte.
- Alla fine aggiornare `docs/RIPRESA-BACKEND.md` con quello che è stato fatto e scoperto, senza credenziali.

---

## 9. Messaggio da incollare nella nuova sessione

```
Lavoriamo al portale dello studente (repository halmob01/bilancio-competenze, clonato in questa cartella).
Leggi docs/SESSIONE-PC.md, poi docs/RIPRESA-BACKEND.md e docs/PIANO-PORTALE.md §2, §3, §3 bis.
La chiave SSH è già in %USERPROFILE%\.ssh (id_ed25519_gcatalfamo): non leggerne il contenuto e non chiedermi la password.
Parti dal §2 (verifica del PC) e poi dal §4 (diagnosi dell'account, solo lettura). Fermati e chiedimi prima di modificare qualsiasi cosa sul server.
```
