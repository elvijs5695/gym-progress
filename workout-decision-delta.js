/**
 * Pure workout-action delta. One decision changes only the current workout's
 * touched records, not the complete session/history/database. No browser APIs.
 *
 * Safety: validate all expected fields before applying any change. Concurrent
 * edits or imported stale journals fail closed instead of overwriting training.
 */
import {clone,fingerprint} from './data-contract.js';
export const WORKOUT_JOURNAL_FORMAT=1;
export const WORKOUT_JOURNAL_MAX_ACTIONS=96;
export const WORKOUT_JOURNAL_MAX_BYTES=4_000_000;
const FORBIDDEN=new Set(['__proto__','constructor','prototype']);
const COLLECTIONS=Object.freeze({sessionExercises:'session_exercises',performedSets:'performed_sets',templateExercises:'template_exercises'});
const equal=(a,b)=>fingerprint(a)===fingerprint(b);
const own=(value,key)=>value!=null&&Object.prototype.hasOwnProperty.call(value,key);
const ids=rows=>new Map((Array.isArray(rows)?rows:[]).filter(x=>x?.id!=null).map(x=>[String(x.id),x]));
function fields(before,after,{exclude=[]}={}){
 const ignored=new Set(exclude),all=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);
 return [...all].filter(key=>!ignored.has(key)&&!FORBIDDEN.has(key)&&(!own(before,key)||!own(after,key)||!equal(before[key],after[key])));
}
function changeList(before,after){
 const left=ids(before),right=ids(after),out=[];
 for(const key of new Set([...left.keys(),...right.keys()])){
  const b=left.get(key)||null,a=right.get(key)||null;
  if(!b||!a){out.push({id:key,before:clone(b),after:clone(a),keys:[]});continue;}
  const changed=fields(b,a,{exclude:['id']});if(changed.length)out.push({id:key,before:clone(b),after:clone(a),keys:changed});
 }
 return out;
}
export function createWorkoutDecisionDelta(before,after){
 if(!before||!after||String(before.sessionId)!==String(after.sessionId))return null;
 const changes={session:fields(before.session,after.session,{exclude:['id','startedAt']}),collections:{}};
 for(const [captured] of Object.entries(COLLECTIONS)){
  // An exercise replacement changes which templates are *captured*, not which
  // template records exist. Never delete a programme template on this basis.
  const left=before[captured]||[],right=after[captured]||[];
  if(captured==='templateExercises'){
   const keys=new Set(left.map(x=>String(x.id)));
   changes.collections[captured]=changeList(left,right.filter(x=>keys.has(String(x.id)))).filter(c=>c.before&&c.after);
  }else changes.collections[captured]=changeList(left,right);
 }
 const oldUserIds=new Set((before.userExerciseIds||[]).map(String));
 const introduced=(after.userExercises||[]).filter(x=>!oldUserIds.has(String(x.id)));
 const delta={format:WORKOUT_JOURNAL_FORMAT,sessionId:before.sessionId,
  before:{at:before.capturedAt,runtime:clone(before.runtime),session:clone(before.session)},
  after:{at:after.capturedAt,runtime:clone(after.runtime),session:clone(after.session)},
  sessionKeys:changes.session,collections:changes.collections,
  introducedUsers:clone(introduced)};
 return delta;
}
function rebaseRunningClocks(runtime,snapshot,at){
 if(!runtime||!snapshot)return;
 const captured=Number(snapshot.at);
 if(!Number.isFinite(captured))return;
 const saved=snapshot.runtime;
 for(const key of ['phaseStartedAt','reminderStartedAt']){
  if(Number.isFinite(Number(saved?.[key])))runtime[key]=at-Math.max(0,captured-Number(saved[key]));
 }
 if(runtime.rest&&saved?.rest){
  const remaining=Math.max(0,Number(saved.rest.endsAt||0)-captured);
  runtime.rest.endsAt=at+remaining;
  runtime.rest.startedAt=at-Math.max(0,Number(saved.rest.plannedSeconds||0)*1000-remaining);
 }
 for(const [key,entry] of Object.entries(runtime.supersetTimed||{})){
  const old=saved?.supersetTimed?.[key];
  if(entry?.startedAt&&old?.startedAt)entry.startedAt=at-Math.max(0,captured-Number(old.startedAt));
 }
}
function validateCollectionChange(array,change,source){
 const record=array.find(row=>String(row.id)===String(change.id))||null;
 const expected=change[source];
 if(!expected&&!record)return;
 if(!expected&&record)throw Error('Workout journal conflict: a supposedly absent record exists');
 if(expected&&!record)throw Error('Workout journal conflict: a changed record is missing');
 const keys=change.keys?.length?change.keys:Object.keys(expected||{});
 for(const key of keys){
  if(FORBIDDEN.has(key)||key==='id')throw Error('Unsafe workout journal field');
  if(own(record,key)!==own(expected,key)||own(record,key)&&!equal(record[key],expected[key])){
   throw Error('Workout journal conflict: training data has changed since this decision');
  }
 }
}
function applyCollectionChange(array,change,target){
 const index=array.findIndex(row=>String(row.id)===String(change.id)),replacement=change[target];
 if(!replacement){if(index>=0)array.splice(index,1);return;}
 if(index<0){array.push(clone(replacement));return;}
 for(const key of change.keys){
  if(own(replacement,key))array[index][key]=clone(replacement[key]);
  else delete array[index][key];
 }
}
export function applyWorkoutDecisionDelta(state,delta,target,at=Date.now()){
 if(!state||!delta||delta.format!==WORKOUT_JOURNAL_FORMAT||!['before','after'].includes(target))return false;
 const source=target==='before'?'after':'before';
 if(String(state.runtime?.sessionId)!==String(delta.sessionId))return false;
 const session=(state.workout_sessions||[]).find(x=>String(x.id)===String(delta.sessionId));
 if(!session)return false;
 const expectedSession=delta[source]?.session;
 if(!expectedSession||!delta[target]?.session)return false;
 try{
  for(const key of delta.sessionKeys||[]){
   if(FORBIDDEN.has(key)||key==='id'||key==='startedAt'||own(session,key)!==own(expectedSession,key)||own(session,key)&&!equal(session[key],expectedSession[key]))throw Error('Workout session changed since the decision');
  }
  for(const [captured,stored] of Object.entries(COLLECTIONS)){
   const changes=delta.collections?.[captured]||[];
   if(!Array.isArray(changes)||changes.length>10000)throw Error('Invalid workout journal');
   for(const change of changes)validateCollectionChange(state[stored]||[],change,source);
  }
  // Newly created identities are only removed after all other current-session
  // relationships have been restored. Pre-existing IDs are never removed.
  for(const entry of delta.introducedUsers||[]){
   if(!entry||entry.id==null)throw Error('Invalid user identity in journal');
   // A reused global identity ID must never silently take over another user's
   // distinct exercise. Validate before changing any workout rows.
   if(target==='after'){
    const existing=(state.user_exercises||[]).find(x=>String(x.id)===String(entry.id));
    if(existing&&!equal(existing,entry))throw Error('Workout identity collision during Redo');
   }
  }
 }catch{return false;}
 for(const key of delta.sessionKeys||[]){
  if(own(delta[target].session,key))session[key]=clone(delta[target].session[key]);
  else delete session[key];
 }
 for(const [captured,stored] of Object.entries(COLLECTIONS))for(const change of delta.collections?.[captured]||[])
  applyCollectionChange(state[stored],change,target);
 const identities=state.user_exercises||(state.user_exercises=[]);
 if(target==='before'){
  const referenced=new Set([...(state.template_exercises||[]),...(state.session_exercises||[])]
   .map(x=>x.userExerciseId).filter(x=>x!=null).map(String));
  for(const user of delta.introducedUsers||[]){
   if(referenced.has(String(user.id)))continue;
   const index=identities.findIndex(x=>String(x.id)===String(user.id));
   if(index>=0&&equal(identities[index],user))identities.splice(index,1);
  }
 }else{
  for(const user of delta.introducedUsers||[])
   if(!identities.some(x=>String(x.id)===String(user.id)))identities.push(clone(user));
 }
 // Preserve the workout total elapsed clock. Local phase/rest clocks are
 // rebased so a restored countdown never expires instantly after a reload.
 state.runtime=clone(delta[target].runtime);
 if(state.runtime?.rest)delete state.runtime.rest.autoAdvancing;
 rebaseRunningClocks(state.runtime,delta[target],at);
 return true;
}
export function compactWorkoutJournal(journal){
 // The oldest actions are intentionally pruned; newer actions and the current
 // state are never modified. This is a local undo budget, not training history.
 while(journal.undo.length>WORKOUT_JOURNAL_MAX_ACTIONS)journal.undo.shift();
 while(journal.redo.length>WORKOUT_JOURNAL_MAX_ACTIONS)journal.redo.shift();
 while(JSON.stringify(journal).length>WORKOUT_JOURNAL_MAX_BYTES&&(journal.undo.length||journal.redo.length)){
  // Even a single oversized entry is unsafe to retain; drop only the journal
  // entry, NEVER the training data it described.
  if(journal.undo.length)journal.undo.shift();else journal.redo.shift();
 }
 return journal;
}
export function validWorkoutJournal(journal,sessionId){
 if(!journal||journal.format!==WORKOUT_JOURNAL_FORMAT||String(journal.sessionId)!==String(sessionId))return false;
 if(!Array.isArray(journal.undo)||!Array.isArray(journal.redo)||journal.undo.length>WORKOUT_JOURNAL_MAX_ACTIONS||journal.redo.length>WORKOUT_JOURNAL_MAX_ACTIONS)return false;
 if(JSON.stringify(journal).length>WORKOUT_JOURNAL_MAX_BYTES+100000)return false;
 return [...journal.undo,...journal.redo].every(step=>
  step&&typeof step.action==='string'&&step.delta?.format===WORKOUT_JOURNAL_FORMAT&&String(step.delta.sessionId)===String(sessionId)
  &&Object.keys(COLLECTIONS).every(key=>Array.isArray(step.delta.collections?.[key]))
  &&Array.isArray(step.delta.introducedUsers)&&Array.isArray(step.delta.sessionKeys));
}
