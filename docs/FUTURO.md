# Aggiornamenti futuri

Cose decise o discusse che **non sono ancora nel prototipo**. Il prototipo (bilancio, curriculum con Word e PDF, diario di bordo) funziona da solo, salva sul dispositivo e non richiede niente di quanto segue.

## 1. Dettatura vocale nell'app (bilancio e diario)

Compilare i testi parlando, come un vocale di WhatsApp, **conservando solo il testo**: l'audio resta in memoria, si trasforma in testo, il testo compare nel campo e lo studente lo corregge; l'audio non viene mai salvato né inviato. Nessuna riscrittura automatica.

**Intanto** le schede del diario ricordano di usare il microfono della tastiera del telefono.

**Metodo scelto per il prototipo** (da provare):
- Libreria: [Transformers.js v4](https://github.com/huggingface/transformers.js/releases/tag/4.0.0) (Hugging Face, Apache-2.0, versione 4.3.2 al momento della verifica), con modello **Whisper `base`** (circa 80 MB, più circa 10 MB del programma che lo fa girare).
- **Caricamento solo al primo uso del microfono**: il peso di partenza dei siti non cambia (oggi 282 KB il bilancio e 172 KB il diario, non compressi); il modello si scarica una volta e resta nel browser.
- **WebGPU** quando il telefono lo ha (anche Safari 26 e successivi), **metodo più lento** (WASM) altrimenti.
- File del modello **ospitati nel sito**, senza servizi esterni. Dal mio ambiente di lavoro Hugging Face non è raggiungibile: i file del modello vanno scaricati e messi in una cartella del sito prima della prova.
- Esempio da adattare: [whisper-web](https://github.com/xenova/whisper-web).

**Da verificare prima di decidere:**
- Qualità sull'italiano parlato da studenti (nessun confronto pubblicato trovato): prova con tre o quattro studenti, anche con termini tecnici come «multimetro» o «quadro».
- Velocità sui telefoni della scuola: se `base` non basta si passa a `small` (circa 250 MB) oppure al server.
- Alcune versioni convertite di Whisper danno testo sbagliato sulla scheda grafica di certi Mac con processore Apple; una versione vecchia della libreria poteva inventare frasi.
- Tempi di scaricamento del modello: circa 10 secondi con il wifi della scuola e circa 35 con il 4G (stime).

**Alternativa con il backend:** trascrizione sul server della scuola, con qualità migliore e nessun peso sui telefoni. Candidati: Whisper più grande oppure **Parakeet TDT v3** (NVIDIA, 25 lingue europee tra cui l'italiano; porting nel browser esistenti ma da circa 2,5 GB, quindi adatto al server). L'audio lascerebbe il telefono verso il server scolastico: va detto agli studenti.

**Scartati:** Moonshine (solo inglese), Whisper large-v3-turbo nel browser (circa 1,5 GB).

## 2. Backend sulla rete interna della scuola

Salvare cv e diari di tutti gli studenti nelle cartelle di rete: serve un piccolo servizio, un sito statico non può scrivere su una cartella di rete. Si decide in un secondo momento, insieme a privacy e direzione. Le due strade discusse:
- **Cloudflare Workers** come porta con accesso tramite account scolastico (Cloudflare Access) e **Tunnel** verso un servizio nella rete della scuola: i dati restano in casa.
- **Dati su Cloudflare** con un programma sul server della scuola che li ritira ogni notte nelle cartelle.

Da chiarire: dove stanno i file della scuola, chi gestisce la rete, se gli studenti hanno un account scolastico, privacy dei minori e conservazione. Il **salvataggio sul dispositivo resta anche dopo**. Con il backend i due siti possono importarsi i dati anche senza stare sullo stesso indirizzo.

## 3. Diario di bordo

Esportazione in Word e PDF come per il curriculum, vista per il docente, salvataggio nelle cartelle della scuola, dettatura (punto 1).

## 4. Script del Foglio Google

Il prototipo lo lascia com'è. Quando si modificherà: colonna «Anno» (oggi il docente lo ricava dalla colonna «Classe»), eventuale raccolta del diario e del curriculum (oggi non inviati), accesso degli studenti.

## 5. Contenuti e verifiche

- Domande, esempi e frasi dei livelli restano esempi da rivedere con i docenti dei tre indirizzi e per ogni anno.
- Aprire un Word scaricato con Microsoft Word su Windows e su Mac (finora provato con LibreOffice).
- Prova con studenti su telefoni veri, con zoom del testo e con lettore di schermo.
- Valutare C1 e C2 e le frasi dei livelli delle lingue con i docenti di lingue.
