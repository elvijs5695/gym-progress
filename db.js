const DB_NAME = 'gym-progress-pwa';
const DB_VERSION = 1;
const STORE = 'kv';
const STATE_KEY = 'app-state';

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function getValue(key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get(key);
    req.onsuccess=()=>resolve(req.result??null);
    req.onerror=()=>reject(req.error);
  });
}

async function putValue(key,value){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(structuredClone(value),key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

export async function loadState(){return getValue(STATE_KEY);}
export async function saveRecoveryState(state,key='pre-upgrade'){if(state!=null)await putValue(`recovery:${key}`,state);}
export async function loadRecoveryState(key='pre-upgrade'){return getValue(`recovery:${key}`);}

export async function saveState(state){return putValue(STATE_KEY,state);}

export async function wipeState(){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(STATE_KEY);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
