#!/usr/bin/env bash
# Portale dello studente — preparazione del server (piano §3, fase F0, passo 1).
#
# Che cosa fa (e solo questo):
#   - scarica Node.js in /opt/portale, controllando l'impronta del file (non usa apt, non tocca Node di sistema);
#   - crea l'utente di sistema «portale», senza password e senza shell;
#   - crea le cartelle del programma e dei dati, con i permessi giusti;
#   - crea /etc/portale/portale.env con la configurazione da completare.
# Che cosa NON fa: non tocca Apache, non crea servizi systemd, non apre porte, non cambia pacchetti.
# Quei passi sono a parte (deploy/LEGGIMI.md), da approvare uno per uno.
#
# Uso (da un utente con sudo):
#   sudo bash installa-portale.sh --controlla                  solo controlli, nessuna modifica
#   sudo bash installa-portale.sh                              installa (chiede conferma)
#   sudo bash installa-portale.sh --sviluppatore NOMEUTENTE    in più: NOMEUTENTE può caricare il programma
#                                                              in /opt/portale/app (per esempio con FileZilla)
#   sudo bash installa-portale.sh --disinstalla                toglie tutto tranne i dati
#   sudo bash installa-portale.sh --disinstalla --anche-i-dati toglie anche /var/lib/portale (IRREVERSIBILE)
# Si può eseguire più volte: quello che c'è già non viene rifatto.

set -euo pipefail

NODE_VERSIONE="v26.13.1"   # LTS «Lithium», aggiornamento di sicurezza del 10/11/2026
declare -A NODE_SHA256=(
  [x64]="5c063e46bab0fbc1c17cc445d7ff129cbdcd0471be6ed83b6ab864f8143bc864"
  [arm64]="89e1853138db51e8b82d3e98ba9c0d3f2956a28e5e55ea1b7e12d25aae92d5dd"
)

UTENTE="portale"
PROGRAMMA="/opt/portale"
DATI="/var/lib/portale"
CONFIG="/etc/portale"
PORTA="3100"

TMP_DA_TOGLIERE=""
trap '[ -n "$TMP_DA_TOGLIERE" ] && rm -rf "$TMP_DA_TOGLIERE"' EXIT

MODO="installa"; SVILUPPATORE=""; ANCHE_DATI=0; SI=0
while [ $# -gt 0 ]; do
  case "$1" in
    --controlla) MODO="controlla" ;;
    --disinstalla) MODO="disinstalla" ;;
    --anche-i-dati) ANCHE_DATI=1 ;;
    --sviluppatore) SVILUPPATORE="${2:-}"; shift ;;
    --si) SI=1 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "Opzione sconosciuta: $1 (vedi --help)"; exit 2 ;;
  esac
  shift
done

ok()    { printf '  [ok]  %s\n' "$*"; }
nota()  { printf '  [--]  %s\n' "$*"; }
ferma() { printf '  [NO]  %s\n' "$*" >&2; exit 1; }
chiedi() {
  [ "$SI" = 1 ] && return 0
  read -r -p "  $1 Scrivi «si» per continuare: " r
  [ "$r" = "si" ] || { echo "  Annullato, nessuna modifica."; exit 0; }
}

[ "$(id -u)" = 0 ] || ferma "Serve sudo: sudo bash $0 $*"

case "$(uname -m)" in
  x86_64) ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  *) ferma "Processore non previsto: $(uname -m)" ;;
esac
NODE_DIR="$PROGRAMMA/node-$NODE_VERSIONE"
NODE_FILE="node-$NODE_VERSIONE-linux-$ARCH.tar.xz"

# ---------------------------------------------------------------- controlli
controlli() {
  echo "Controlli"
  if [ -r /etc/debian_version ]; then ok "Debian $(cat /etc/debian_version)"; else nota "non sembra Debian: proseguo, ma è da verificare"; fi
  ok "processore $ARCH"
  for c in curl tar xz sha256sum useradd runuser; do
    command -v "$c" >/dev/null 2>&1 && ok "comando $c presente" || ferma "manca il comando $c"
  done
  local liberi; liberi=$(df -Pm /opt | awk 'NR==2 {print $4}')
  [ "$liberi" -gt 500 ] && ok "spazio in /opt: ${liberi} MB liberi" || ferma "meno di 500 MB liberi in /opt"
  if ! command -v ss >/dev/null 2>&1; then nota "comando ss assente: non posso controllare la porta $PORTA"
  elif ss -ltnH "sport = :$PORTA" | grep -q .; then
    if systemctl is-active --quiet portale 2>/dev/null; then ok "porta $PORTA usata dal portale stesso"
    else ferma "la porta $PORTA è già usata da un altro programma: va scelta un'altra porta"; fi
  else ok "porta $PORTA libera"; fi
  id "$UTENTE" >/dev/null 2>&1 && nota "l'utente $UTENTE esiste già" || ok "l'utente $UTENTE non esiste ancora"
  [ -d "$NODE_DIR" ] && nota "Node $NODE_VERSIONE è già in $NODE_DIR" || ok "Node $NODE_VERSIONE da scaricare"
  if [ -n "$SVILUPPATORE" ]; then id "$SVILUPPATORE" >/dev/null 2>&1 && ok "utente sviluppatore $SVILUPPATORE trovato" || ferma "l'utente $SVILUPPATORE non esiste"; fi
  if command -v node >/dev/null 2>&1; then nota "c'è già un Node di sistema ($(node -v)): non viene toccato"; fi
}

# ---------------------------------------------------------------- installazione
scarica_node() {
  if [ -x "$NODE_DIR/bin/node" ]; then ok "Node già presente"; return; fi
  local tmp; tmp=$(mktemp -d)
  TMP_DA_TOGLIERE="$tmp"
  echo "  Scarico $NODE_FILE da nodejs.org..."
  curl -fsSL --proto '=https' --retry 3 -o "$tmp/$NODE_FILE" "https://nodejs.org/dist/$NODE_VERSIONE/$NODE_FILE"
  echo "${NODE_SHA256[$ARCH]}  $tmp/$NODE_FILE" | sha256sum -c --quiet - || ferma "l'impronta del file non corrisponde: NON installo"
  ok "impronta del file verificata"
  mkdir -p "$NODE_DIR"
  tar -xJf "$tmp/$NODE_FILE" -C "$NODE_DIR" --strip-components=1 --no-same-owner
  chown -R root:root "$NODE_DIR"
  chmod -R go-w "$NODE_DIR"
  rm -rf "$tmp"; TMP_DA_TOGLIERE=""
  ok "Node installato in $NODE_DIR"
}

installa() {
  controlli
  echo
  echo "Verranno creati: utente di sistema «$UTENTE», $PROGRAMMA, $DATI, $CONFIG."
  [ -n "$SVILUPPATORE" ] && echo "L'utente «$SVILUPPATORE» potrà caricare il programma in $PROGRAMMA/app."
  chiedi "Nient'altro sul server viene modificato."
  echo
  echo "Installazione"

  if ! id "$UTENTE" >/dev/null 2>&1; then
    useradd --system --user-group --home-dir "$DATI" --no-create-home --shell /usr/sbin/nologin \
      --comment "Portale dello studente" "$UTENTE"
    ok "utente $UTENTE creato"
  fi

  mkdir -p "$PROGRAMMA"; chown root:root "$PROGRAMMA"; chmod 755 "$PROGRAMMA"
  scarica_node
  ln -sfn "$NODE_DIR" "$PROGRAMMA/node"   # per aggiornare Node: nuova cartella e si sposta questo collegamento
  ok "$PROGRAMMA/node → $(basename "$NODE_DIR")"

  # Il programma: lo legge l'utente portale (gruppo), lo scrive solo lo sviluppatore (o root). Il servizio
  # non può modificare il proprio codice.
  local nuova=0; [ -d "$PROGRAMMA/app" ] || nuova=1
  mkdir -p "$PROGRAMMA/app"
  if [ -n "$SVILUPPATORE" ]; then chown -R "$SVILUPPATORE:$UTENTE" "$PROGRAMMA/app"
  elif [ "$nuova" = 1 ]; then chown "root:$UTENTE" "$PROGRAMMA/app"
  else chgrp "$UTENTE" "$PROGRAMMA/app"; fi   # già esistente: il proprietario resta quello di prima
  chmod 2750 "$PROGRAMMA/app"
  ok "$PROGRAMMA/app pronto (proprietario $(stat -c %U "$PROGRAMMA/app"), gruppo $UTENTE)"

  # I dati: solo l'utente portale. Nessun altro utente (né Apache né PHP) può leggerli.
  mkdir -p "$DATI/foto" "$DATI/backup"
  chown -R "$UTENTE:$UTENTE" "$DATI"
  chmod 700 "$DATI" "$DATI/foto" "$DATI/backup"
  ok "$DATI pronto (solo $UTENTE)"

  mkdir -p "$CONFIG"; chown root:root "$CONFIG"; chmod 755 "$CONFIG"
  if [ ! -f "$CONFIG/portale.env" ]; then
    cat > "$CONFIG/portale.env" <<EOF
# Configurazione del portale dello studente (letta dal servizio systemd).
PORTALE_PORTA=$PORTA
PORTALE_DATI=$DATI
# Indirizzo pubblico dei siti, senza la barra finale. DA COMPLETARE prima dei dati veri,
# per esempio: PORTALE_ORIGINE=https://portale.esempio.it
PORTALE_ORIGINE=
EOF
    ok "$CONFIG/portale.env creato (da completare: PORTALE_ORIGINE)"
  else
    nota "$CONFIG/portale.env esiste già: non lo tocco"
  fi
  chown "root:$UTENTE" "$CONFIG/portale.env"; chmod 640 "$CONFIG/portale.env"

  echo
  echo "Prova"
  runuser -u "$UTENTE" -- "$PROGRAMMA/node/bin/node" -e \
    "const s=require('node:sqlite');const d=new s.DatabaseSync(':memory:');d.exec('create table t(x)');console.log('  [ok]  Node '+process.version+' con SQLite funzionante, come utente '+require('os').userInfo().username)" \
    2>/dev/null || ferma "Node non parte come utente $UTENTE"

  echo
  echo "Fatto. Prossimi passi (deploy/LEGGIMI.md): caricare il programma in $PROGRAMMA/app,"
  echo "installare il servizio (deploy/portale.service), poi la configurazione di Apache."
}

# ---------------------------------------------------------------- disinstallazione
disinstalla() {
  echo "Disinstallazione"
  if systemctl list-unit-files 2>/dev/null | grep -q '^portale\.'; then
    ferma "c'è ancora il servizio portale: prima toglierlo (deploy/LEGGIMI.md, «Tornare indietro»)"
  fi
  echo "Verranno tolti: $PROGRAMMA, $CONFIG, l'utente $UTENTE."
  if [ "$ANCHE_DATI" = 1 ]; then
    echo "ATTENZIONE: verrà cancellato anche $DATI con TUTTI i dati degli studenti. Non si può annullare."
    chiedi "Hai una copia dei dati?"
  else
    echo "$DATI (i dati) resta dov'è."
    chiedi ""
  fi
  rm -rf "$PROGRAMMA" "$CONFIG"; ok "programma e configurazione tolti"
  if [ "$ANCHE_DATI" = 1 ]; then rm -rf "$DATI"; ok "dati cancellati"; fi
  if id "$UTENTE" >/dev/null 2>&1; then userdel "$UTENTE"; ok "utente $UTENTE tolto"; fi
}

case "$MODO" in
  controlla) controlli; echo; echo "Solo controlli: nessuna modifica." ;;
  installa) installa ;;
  disinstalla) disinstalla ;;
esac
