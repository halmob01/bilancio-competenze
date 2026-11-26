/* Configurazione dell'invio al Foglio Google del docente.
   urlInvio: indirizzo dell'applicazione web Apps Script (termina con /exec).
   Se resta vuoto, il pulsante «Invia al docente» non compare e resta
   disponibile solo la copia da scaricare. Vedi docs/FOGLIO-GOOGLE.md. */
/* urlApi: indirizzo dell'API del portale sul server della scuola, per esempio '/gcatalfamo/api/'.
   Se resta vuoto i siti salvano solo sul dispositivo, come sempre, e l'accesso con il cartellino non compare. */
window.BC_CONFIG = {
  urlApi: '',
  urlInvio: 'https://script.google.com/macros/s/AKfycbxtED5Urp88qujtnSCn8Q4m7dvqgh_tAnRvskoLjZItAJaLrNhIlVwpq806cb1T9Nif/exec'
};
