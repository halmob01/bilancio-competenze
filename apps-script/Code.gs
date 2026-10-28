/**
 * Bilancio di competenze — Apps Script backend v1.
 * Deploy as web app: Execute as ME, access limited to intended audience.
 * REQUIRED Script Property: SPREADSHEET_ID
 * NO third party services, analytics or external AI.
 */
const BC = Object.freeze({
  names: ['Classi','Studenti','Risposte','Elaborati','Eventi'],
  tracks: ['elettrico','informatica','estetica'],
  sections: ['percorso','esperienze','competenze','tirocinio','bilancio','orientamento'],
  ttl: 21600, // 6 hours, students may log in again
  maxPayload: 30000,
  maxField: 7000
});
function db_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Configurare SPREADSHEET_ID in Script Properties.');
  return SpreadsheetApp.openById(id);
}
function sh_(name) {const s=db_().getSheetByName(name); if(!s)throw Error('Scheda mancante: '+name);return s;}
function rows_(name){const s=sh_(name),n=s.getLastRow();return n<2?[]:s.getRange(2,1,n-1,s.getLastColumn()).getValues();}
function findStudent_(id) { const r=rows_('Studenti'); const idx=r.findIndex(x=>x[0]===id); return idx<0?null:{row:idx+2,v:r[idx]}; }
function digest_(salt,code){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt+':'+code).map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');
}
function rand_() {return Utilities.getUuid().replace(/-/g,'');}
function scrub_(x,depth){
  if(depth>8)throw Error('Struttura non valida.');
  if(x===null || typeof x==='boolean')return x;
  if(typeof x==='number') { if(!Number.isFinite(x))throw Error('Valore numerico non valido.'); return x;}
  if(typeof x==='string') {if(x.length>BC.maxField)throw Error('Risposta troppo lunga.');return x;}
  if(Array.isArray(x)) {if(x.length>100)throw Error('Troppi elementi.');return x.map(v=>scrub_(v,depth+1));}
  if(typeof x==='object' && Object.getPrototypeOf(x)===Object.prototype) {
    const z={};const ks=Object.keys(x);if(ks.length>80)throw Error('Troppi campi.');
    for(const k of ks) {if(!/^[a-zA-Z0-9_-]{1,60}$/.test(k) || ['__proto__','constructor','prototype'].includes(k))throw Error('Campo non valido.');z[k]=scrub_(x[k],depth+1);}return z;
  }
  throw Error('Tipo non consentito.');
}
function error_(e) {return {ok:false,error:String(e.message||e)};}
function log_(id,action,outcome,note){
  try {sh_('Eventi').appendRow([new Date(),id,action,outcome,String(note||'').slice(0,180)]);} catch(e) {console.error('Errore log eventi');}
}
function auth_(token){
  if(typeof token!=='string'|| !/^[a-f0-9]{32}$/.test(token))throw Error('Accesso non valido.');
  const id=CacheService.getScriptCache().get('bc:'+token);
  if(!id)throw Error('Sessione scaduta. Accedi nuovamente.');
  const s=findStudent_(id);
  if(!s || s.v[6]!=='active')throw Error('Utente non attivo.');
  return {id,row:s.row,record:s.v};
}
function doGet(){
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Bilancio di competenze');
}
function login(code) {
 try{
  code=String(code||'').trim().toUpperCase();
  if(!/^[A-Z0-9-]{8,30}$/.test(code))throw Error('Codice non valido.');
  const all=rows_('Studenti'); const found=all.find(r=>r[6]==='active' && digest_(r[4],code)===r[5]);
  if(!found){Utilities.sleep(300);throw Error('Codice non riconosciuto.');}
  const token=rand_();CacheService.getScriptCache().put('bc:'+token,found[0],BC.ttl);
  sh_('Studenti').getRange(all.findIndex(r=>r[0]===found[0])+2,9).setValue(new Date());
  log_(found[0],'login','ok','');
  return {ok:true,token,student:{id:found[0],name:found[2],track:found[3]}};
 }catch(e){return error_(e);}
}
function loadMine(token) {
 try{
  const {id,record}=auth_(token);
  const data={};
  for(const r of rows_('Risposte'))if(r[0]===id && BC.sections.includes(r[1])){
    let v=null;try{v=JSON.parse(r[4]);}catch(e){v=null;}
    data[r[1]]={revision:Number(r[2])||0,content:v,updatedAt:r[6]};
  }
  return {ok:true,student:{id,name:record[2],track:record[3]},data};
 }catch(e){return error_(e);}
}
function saveSection(token,section,content,expectedRevision){
 let lock;
 try{
  const {id}=auth_(token);
  if(!BC.sections.includes(section))throw Error('Sezione sconosciuta.');
  const clean=scrub_(content,0),json=JSON.stringify(clean);
  if(json.length>BC.maxPayload)throw Error('Risposta troppo lunga.');
  if(!Number.isInteger(expectedRevision)||expectedRevision<0)throw Error('Revisione non valida.');
  lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw Error('Server occupato. Riprova.');
  const s=sh_('Risposte'),r=rows_('Risposte'),idx=r.findIndex(x=>x[0]===id&&x[1]===section);
  const previous=idx<0?0:Number(r[idx][2])||0;
  if(expectedRevision!==previous)return {ok:false,conflict:true,error:'Risposta modificata altrove: ricarica prima di salvare.'};
  const next=previous+1,now=new Date();
  if(idx<0)s.appendRow([id,section,next,'v1',json,now,now]);
  else s.getRange(idx+2,1,1,7).setValues([[id,section,next,'v1',json,r[idx][5],now]]);
  log_(id,'save:'+section,'ok','revision '+next);
  return {ok:true,revision:next,updatedAt:now.toISOString()};
 }catch(e){return error_(e);}finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
function logout(token) {
 try{auth_(token);CacheService.getScriptCache().remove('bc:'+token);return {ok:true};}
 catch(e){return error_(e);}
}
/**
 * Teacher setup helper (run manually in Apps Script editor).
 * Creates demo account and returns one-time access code in execution log.
 * NEVER copy access code into GitHub or public documents.
 */
function adminCreateDemo() {
 const s=sh_('Studenti'),id='demo-'+rand_().slice(0,12);
 const code='BC-'+rand_().slice(0,12).toUpperCase(),salt=rand_();
 s.appendRow([id,'DEMO','Studente demo','informatica',salt,digest_(salt,code),'active',new Date(),' ',0]);
 console.log('CODICE DIMOSTRATIVO (conservare privatamente): '+code);
 return 'Creato studente demo: '+id;
}
function adminHealthcheck(){
 const names=['LEGGIMI','Config',...BC.names],missing=names.filter(x=>!db_().getSheetByName(x));
 if(missing.length)throw Error('Mancano schede: '+missing.join(', '));
 return 'Schema OK. Schede verificate: '+names.join(', ');
}
