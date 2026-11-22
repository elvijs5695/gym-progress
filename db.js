import {redactWorkoutHistory} from './data-erasure.js';
import {COLLECTIONS,clone,fingerprint} from './data-contract.js';
// Production has account-isolated stores. Original stores remain available for
// explicit recovery; records are never erased or merged implicitly.
export const DB_NAME='gym-progress-v2';
let connection=null,workspace='guest',observedRevision=null,writeQueue=Promise.resolve(),knownRows=new Map();
export class StaleWorkspaceError extends Error{constructor(){super('This workspace changed in another tab. Reload before editing.');this.name='StaleWorkspaceError';}}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Database request failed'));});}
function complete(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Database write failed'));tx.onabort=()=>reject(tx.error||new Error('Database transaction cancelled'));});}
function openDb(){
 if(connection)return connection;
 connection=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta');for(const name of ['rows','recovery'])if(!d.objectStoreNames.contains(name)){const s=d.createObjectStore(name,{keyPath:'key'});s.createIndex('workspace','workspace');}};
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>{connection=null;reject(r.error);};r.onblocked=()=>reject(new Error('Close another Gym Progress window to complete the storage update.'));
 });return connection;
}
export function currentWorkspace(){return workspace;}
export async function setWorkspace(key){
 if(typeof key!=='string'||!/^guest$|^account:[a-f0-9-]{36}$/.test(key))throw new Error('Invalid local workspace');
 await writeQueue.catch(()=>{});
 // A service worker has no access to window.localStorage/auth. Record only
 // the currently selected LOCAL workspace, never credentials, so an unused
 // signed-out account with old pending records cannot block future releases.
 const d=await openDb(),tx=d.transaction('meta','readwrite'),done=complete(tx);
 tx.objectStore('meta').put({activeScope:key,changedAt:Date.now()},'__active-workspace__');
 await done;
 workspace=key;observedRevision=null;knownRows=new Map();return loadState();
}
export async function loadState(){
 const scope=workspace,d=await openDb(),tx=d.transaction(['meta','rows'],'readonly');
 const [meta,records]=await Promise.all([request(tx.objectStore('meta').get(scope)),request(tx.objectStore('rows').index('workspace').getAll(scope))]);
 if(scope!==workspace)throw new Error('Account changed while loading');observedRevision=meta?.revision||0;knownRows=new Map();if(!meta)return null;
 const state=clone(meta.state);for(const name of Object.keys(COLLECTIONS))state[name]=[];
 for(const r of records){state[r.collection].push(r.value);knownRows.set(r.key,fingerprint(r.value));}
 for(const name of Object.keys(COLLECTIONS)){const positions=new Map((meta.order?.[name]||[]).map((x,i)=>[x,i]));state[name].sort((a,b)=>(positions.get(String(a[COLLECTIONS[name]]))??0)-(positions.get(String(b[COLLECTIONS[name]]))??0));}return state;
}
export function saveState(value,{expectedWorkspace=workspace}={}){if(expectedWorkspace!==workspace)return Promise.reject(new Error('Workspace changed before save'));const scope=expectedWorkspace,snapshot=clone(value);const job=writeQueue.catch(()=>{}).then(()=>writeSnapshot(scope,snapshot));writeQueue=job;return job;}
async function writeSnapshot(scope,snapshot){
 if(scope!==workspace)throw new Error('Account changed before save');
 const d=await openDb(),tx=d.transaction(['meta','rows'],'readwrite'),done=complete(tx),metaStore=tx.objectStore('meta'),rows=tx.objectStore('rows');const current=await request(metaStore.get(scope));
 if((current?.revision||0)!==(observedRevision??0)){tx.abort();await done.catch(()=>{});throw new StaleWorkspaceError();}
 const head={...snapshot},order={},nextRows=new Map();let writes=0;
 for(const [name,idKey]of Object.entries(COLLECTIONS)){delete head[name];order[name]=[];for(const row of snapshot[name]||[]){const id=String(row[idKey]),key=JSON.stringify([scope,name,id]),fp=fingerprint(row);order[name].push(id);nextRows.set(key,fp);if(knownRows.get(key)!==fp){rows.put({key,workspace:scope,collection:name,value:row});writes++;}}}
 for(const key of knownRows.keys())if(!nextRows.has(key)){rows.delete(key);writes++;}
 const revision=(current?.revision||0)+1;metaStore.put({state:head,order,revision,updatedAt:Date.now()},scope);await done;if(scope===workspace){observedRevision=revision;knownRows=nextRows;}return {revision,recordWrites:writes};
}
export async function saveRecoveryState(state,key='pre-restore'){
 if(state==null)return;const scope=workspace,d=await openDb(),record={key:JSON.stringify([scope,key]),workspace:scope,createdAt:Date.now(),state:clone(state),fingerprint:fingerprint(state)};
 const tx=d.transaction('recovery','readwrite'),done=complete(tx);tx.objectStore('recovery').put(record);await done;const check=await loadRecoveryState(key);if(fingerprint(check)!==record.fingerprint)throw new Error('Recovery verification failed. Restore cancelled.');return {key,verified:true};
}
export async function loadRecoveryState(key='pre-restore'){const d=await openDb(),tx=d.transaction('recovery','readonly');return (await request(tx.objectStore('recovery').get(JSON.stringify([workspace,key]))))?.state??null;}
export async function recoveryList(){const d=await openDb(),tx=d.transaction('recovery','readonly');return (await request(tx.objectStore('recovery').index('workspace').getAll(workspace))).map(({key,createdAt})=>({key:JSON.parse(key)[1],createdAt}));}
export async function wipeState({expectedWorkspace=workspace}={}){const scope=expectedWorkspace;await writeQueue.catch(()=>{});if(scope!==workspace)throw new Error('Workspace changed before erase');const d=await openDb(),tx=d.transaction(['meta','rows','recovery'],'readwrite'),done=complete(tx);tx.objectStore('meta').delete(scope);for(const name of ['rows','recovery']){const s=tx.objectStore(name),r=s.index('workspace').openKeyCursor(scope);r.onsuccess=()=>{const c=r.result;if(c){s.delete(c.primaryKey);c.continue();}};}await done;observedRevision=0;knownRows=new Map();}
export async function flushSaves(){await writeQueue;}
export async function purgeRecoveryStates({expectedWorkspace=workspace}={}){const scope=expectedWorkspace;if(scope!==workspace)throw new Error('Workspace changed before recovery purge');const d=await openDb(),tx=d.transaction('recovery','readwrite'),done=complete(tx),store=tx.objectStore('recovery'),cursor=store.index('workspace').openKeyCursor(scope);cursor.onsuccess=()=>{const item=cursor.result;if(item){store.delete(item.primaryKey);item.continue();}};await done;}

export async function redactRecoveryHistory({expectedWorkspace=workspace}={}){const scope=expectedWorkspace;if(scope!==workspace)throw new Error('Workspace changed before recovery cleanup');const d=await openDb(),tx=d.transaction('recovery','readwrite'),done=complete(tx),store=tx.objectStore('recovery'),request=store.index('workspace').openCursor(scope);request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;const record=cursor.value;redactWorkoutHistory(record.state);record.fingerprint=fingerprint(record.state);cursor.update(record);cursor.continue();};await done;}
