/** Read-only access to the original PWA store for export/device preferences.
 * Never upgrades, deletes, merges or assigns the legacy training workspace. */
export async function readOriginalLocalState(){
 if(typeof indexedDB==='undefined')return null;
 if(typeof indexedDB.databases==='function'){
  const databases=await indexedDB.databases();
  if(!databases.some(item=>item.name==='gym-progress-pwa'))return null;
 }
 return new Promise((resolve,reject)=>{
  const opening=indexedDB.open('gym-progress-pwa');let absent=false;
  opening.onupgradeneeded=()=>{absent=true;opening.transaction.abort();};
  opening.onerror=()=>absent?resolve(null):reject(new Error('The original local database could not be read.'));
  opening.onblocked=()=>reject(new Error('The original local database could not be read.'));
  opening.onsuccess=()=>{
   const db=opening.result;
   if(!db.objectStoreNames.contains('kv')){db.close();resolve(null);return;}
   const transaction=db.transaction('kv','readonly'),request=transaction.objectStore('kv').get('app-state');
   request.onsuccess=()=>resolve(request.result&&typeof request.result==='object'?structuredClone(request.result):null);
   request.onerror=()=>reject(new Error('The original local database could not be read.'));
   transaction.oncomplete=transaction.onabort=transaction.onerror=()=>db.close();
  };
 });
}
export function originalDevicePreferences(state){
 const settings=state?.app_state||{},result={};
 if(['en','lv'].includes(settings.languageCode))result.languageCode=settings.languageCode;
 for(const key of ['soundEnabled','keepScreenAwake'])if(typeof settings[key]==='boolean')result[key]=settings[key];
 return result;
}
export function originalLocalBackup(state){return {...structuredClone(state),schema:'gym-progress-backup-v6',exported_at_ms:Date.now()};}
