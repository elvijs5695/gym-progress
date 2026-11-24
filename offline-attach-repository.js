/** Persist and clear the guest copy in one IndexedDB transaction only after the
 * target account state has been validated. A recovery copy is kept alongside.
 * All account and guest revisions are optimistic, preventing cross-tab loss.
 */
import {COLLECTIONS,clone,fingerprint} from './data-contract.js';
const STORE='gym-progress-v2';
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Attachment transaction aborted'));});
const db=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(STORE,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onupgradeneeded=()=>reject(Error('Open the app once before attaching data'));});
export async function loadScopedSnapshot(scope){if(scope!=='guest'&&!/^account:[a-f0-9-]{36}$/.test(scope))throw Error('Invalid workspace');const d=await db();try{const tx=d.transaction(['meta','rows'],'readonly');const [meta,rows]=await Promise.all([req(tx.objectStore('meta').get(scope)),req(tx.objectStore('rows').index('workspace').getAll(scope))]);if(!meta)return null;const state=clone(meta.state);for(const k of Object.keys(COLLECTIONS))state[k]=[];for(const r of rows)state[r.collection].push(r.value);for(const [name,idKey] of Object.entries(COLLECTIONS)){const order=new Map((meta.order?.[name]||[]).map((id,i)=>[String(id),i]));state[name].sort((a,b)=>(order.get(String(a[idKey]))??0)-(order.get(String(b[idKey]))??0));}return {state,revision:meta.revision||0};}finally{d.close();}}
export const loadOfflineSnapshot=()=>loadScopedSnapshot('guest');
// This method does NOT overwrite any account rows from the database without
// first comparing the revision captured by the controller.
export async function commitOfflineAttachment({accountScope,accountRevision,guestRevision,guestFingerprint,merged,emptyGuest,recoveryKey}){
 if(!/^account:[a-f0-9-]{36}$/.test(accountScope)||!merged||!emptyGuest||!recoveryKey)throw new Error('Unsafe ownership transfer request');
 const d=await db();try{
  const tx=d.transaction(['meta','rows','recovery'],'readwrite'),finished=txDone(tx);finished.catch(()=>{});const head=tx.objectStore('meta'),rows=tx.objectStore('rows');
  const [accountMeta,guestMeta,guestRows,accountRows]=await Promise.all([req(head.get(accountScope)),req(head.get('guest')),req(rows.index('workspace').getAll('guest')),req(rows.index('workspace').getAll(accountScope))]);
  if((accountMeta?.revision||0)!==accountRevision||(guestMeta?.revision||0)!==guestRevision){tx.abort();throw new Error('Another tab changed training data. Reload and review before attaching.');}
  const actual=clone(guestMeta?.state||{});
  // The fingerprint must use the same *persisted order* as the preview. IDB's
  // workspace index does not guarantee collection-level semantic ordering.
  for(const [name,idKey] of Object.entries(COLLECTIONS)){
   const order=new Map((guestMeta?.order?.[name]||[]).map((id,i)=>[String(id),i]));
   actual[name]=guestRows.filter(r=>r.collection===name).map(r=>r.value);
   actual[name].sort((a,b)=>(order.get(String(a[idKey]))??0)-(order.get(String(b[idKey]))??0));
  }
  if(fingerprint(Object.fromEntries(Object.keys(COLLECTIONS).map(k=>[k,actual[k]])))!==guestFingerprint){tx.abort();throw new Error('Offline data changed. Review attachment again.');}
  const order={},accountKeys=new Set();for(const [name,idKey]of Object.entries(COLLECTIONS)){order[name]=[];for(const row of merged[name]||[]){const id=String(row[idKey]),key=JSON.stringify([accountScope,name,id]);accountKeys.add(key);order[name].push(id);rows.put({key,workspace:accountScope,collection:name,value:row});}}
  for(const row of accountRows)if(!accountKeys.has(row.key))rows.delete(row.key);
  const accountHead=clone(merged);for(const k of Object.keys(COLLECTIONS))delete accountHead[k];
  const nextRevision=accountRevision+1;head.put({state:accountHead,order,revision:nextRevision,updatedAt:Date.now()},accountScope);
  // Write the full original offline profile into recovery before clearing it.
  tx.objectStore('recovery').put({key:JSON.stringify(['guest',recoveryKey]),workspace:'guest',createdAt:Date.now(),state:actual,fingerprint:fingerprint(actual)});
  for(const row of guestRows)rows.delete(row.key);
  const guestHead=clone(emptyGuest);for(const k of Object.keys(COLLECTIONS))delete guestHead[k];
  head.put({state:guestHead,order:Object.fromEntries(Object.keys(COLLECTIONS).map(k=>[k,[]])),revision:guestRevision+1,updatedAt:Date.now()},'guest');
  await finished;
  return {accountRevision:nextRevision};
 }finally{d.close();}
}
