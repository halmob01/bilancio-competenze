#!/usr/bin/env bash
# Portale dello studente — crea il pacchetto dei siti da pubblicare sul server della scuola.
# Mette dentro solo i file che servono ai siti (niente docs, test, script del foglio, programma del server)
# e svuota l'invio al Foglio Google.
#
# Uso (dalla cartella del progetto):  bash deploy/prepara-siti.sh
# Risultato: dist/siti/ e dist/siti-AAAA-MM-GG-<commit>.tar.gz

set -euo pipefail
cd "$(dirname "$0")/.."

DIST="dist"
# Cartella dei siti nell'indirizzo (la stessa di PORTALE_PERCORSO sul server).
PERCORSO="${PORTALE_PERCORSO:-/gcatalfamo/}"
rm -rf "$DIST/siti"
mkdir -p "$DIST/siti"

cp -R index.html bilancio cv diario portfolio docenti js css fonts img "$DIST/siti/"

# Il Foglio Google non si usa più: senza indirizzo il pulsante «Invia al docente» non compare.
cat > "$DIST/siti/js/config.js" <<EOF
/* Configurazione dei siti sul server della scuola.
   urlInvio: vuoto, il Foglio Google non si usa più (il pulsante «Invia al docente» non compare). */
window.BC_CONFIG = {
  urlApi: '${PERCORSO}api/',
  urlInvio: ''
};
EOF

COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "sconosciuto")
DATA=$(date +%Y-%m-%d)
echo "$DATA $COMMIT" > "$DIST/siti/versione.txt"

find "$DIST/siti" -type d -exec chmod 755 {} +
find "$DIST/siti" -type f -exec chmod 644 {} +

PACCHETTO="$DIST/siti-$DATA-$COMMIT.tar.gz"
tar -czf "$PACCHETTO" -C "$DIST/siti" --owner=0 --group=0 .
echo "Pacchetto pronto: $PACCHETTO ($(du -h "$PACCHETTO" | cut -f1), $(find "$DIST/siti" -type f | wc -l) file)"
