// Shared public Supabase reference data. Offline-first: restore the last good
// snapshot synchronously and refresh without blocking the user's first screen.
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SOCIAL_CONFIGURED} from './social-config.js';
import {CANONICAL_EXERCISES,CANONICAL_BY_ID,CANONICAL_BY_KEY} from './exercise-catalogue.js';
import {installPublishedRelations} from './exercise-alternatives.js';
const STORAGE_KEY=`gym-progress-reference-snapshot-v2:${SUPABASE_URL}`;
const POLL_KEY=`gym-progress-reference-last-check-v2:${SUPABASE_URL}`;
const REFRESH_MS=6*60*60*1000;
function validate(snapshot){
  if(snapshot?.schemaVersion!==2||!Array.isArray(snapshot.exercises)||snapshot.exercises.length<190||
     !Array.isArray(snapshot.relations)||snapshot.relations.length<30)return false;
  const keys=new Set(),ids=new Set();
  for(const e of snapshot.exercises){
    if(typeof e.id!=='string'||typeof e.key!=='string'||!e.nameEn||ids.has(e.id)||keys.has(e.key))return false;
    ids.add(e.id);keys.add(e.key);
  }
  return snapshot.relations.every(r=>['EQUIVALENT','CLOSE'].includes(r.relationship)&&keys.has(r.sourceKey)&&keys.has(r.targetKey));
}
function install(snapshot){
  if(!validate(snapshot))throw new Error('Invalid reference catalogue');
  // Mutate the exported array/maps IN PLACE: every existing screen references them.
  // Validate and construct relations FIRST. It may reject the snapshot;
  // the live catalogue must not be partially replaced on that failure.
  installPublishedRelations(snapshot.relations);
  CANONICAL_EXERCISES.splice(0,CANONICAL_EXERCISES.length,...snapshot.exercises);
  CANONICAL_BY_ID.clear();CANONICAL_BY_KEY.clear();
  for(const e of CANONICAL_EXERCISES){CANONICAL_BY_ID.set(e.id,e);CANONICAL_BY_KEY.set(e.key,e);}
}
export function restoreCachedReferenceData(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;install(JSON.parse(raw));return true;}catch{return false;}
}
export async function refreshReferenceData(){
  if(!SOCIAL_CONFIGURED)return false;
  const last=Number(localStorage.getItem(POLL_KEY)||0);
  if(Date.now()-last<REFRESH_MS)return false;
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),8000);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/gym_exercise_reference_snapshot`,{
      headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'},signal:abort.signal,cache:'no-store'
    });
    if(!response.ok)throw new Error(`Reference catalogue HTTP ${response.status}`);
    const snapshot=await response.json();
    if(!validate(snapshot))throw new Error('Incomplete reference catalogue');
    const encoded=JSON.stringify(snapshot),changed=encoded!==localStorage.getItem(STORAGE_KEY);
    install(snapshot);
    localStorage.setItem(STORAGE_KEY,encoded);
    localStorage.setItem(POLL_KEY,String(Date.now()));
    return changed;
  }finally{clearTimeout(timeout);}
}
