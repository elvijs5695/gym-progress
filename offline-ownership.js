/**
 * Offline profile -> authenticated account transfer.
 * Explicit only. Existing account rows and their sync metadata are immutable.
 * Source IDs and relationships are remapped, preserving *all* guest history.
 * No network or authentication logic belongs in this pure module.
 */
import {clone,inspectState,fingerprint} from './data-contract.js';
import {uuid} from './exercise-identity.js';
import {ensureSyncFoundation} from './sync-foundation.js';

const COLLECTIONS=['workout_templates','user_exercises','template_exercises','workout_sessions','session_exercises','performed_sets','tracker_items','tracker_states','tracker_entries'];
const NUMERIC=['workout_templates','template_exercises','workout_sessions','session_exercises','performed_sets'];
const numberMap=(rows,existing)=>{const map=new Map();let next=Math.max(0,...(existing||[]).map(r=>Number(r.id)||0));for(const row of rows||[])map.set(String(row.id),++next);return map;};
const remap=(map,value,absent=null)=>value==null?null:(map.get(String(value))??absent);
export function offlineTrainingCounts(s){const c={};for(const name of COLLECTIONS)c[name]=(s?.[name]||[]).length;return c;}
export function hasOfflineTraining(s){return COLLECTIONS.some(n=>(s?.[n]||[]).length>0);}
export function offlineTrainingFingerprint(s){return fingerprint(Object.fromEntries(COLLECTIONS.map(n=>[n,s?.[n]||[]])));}
export function attachOfflineTraining(account,guest,{transferId=uuid(),at=Date.now()}={}){
 if(!account||!guest||!hasOfflineTraining(guest))throw new Error('No offline training data to attach.');
 if(account.runtime||guest.runtime)throw new Error('Finish or discard an active workout before transferring data.');
 const report=inspectState(guest);if(report.errors.length||report.warnings.length)throw new Error('Offline records require review before transfer: '+(report.errors[0]||report.warnings[0]?.type));
 const accountReport=inspectState(account);if(accountReport.errors.length)throw new Error('Account data requires review before transfer: '+accountReport.errors[0]);
 const sourceHash=offlineTrainingFingerprint(guest);
 if(account.offline_imports?.some(i=>i.sourceFingerprint===sourceHash))throw new Error('These offline records have already been attached to this account.');
 const out=clone(account);
 for(const name of COLLECTIONS)if(!Array.isArray(out[name]))out[name]=[];
 const maps=Object.fromEntries(NUMERIC.map(n=>[n,numberMap(guest[n],out[n])]));
 const exMap=new Map(),itemMap=new Map(),programmeMap=new Map(),groupMap=new Map();
 const assignUnique=(map,id)=>{if(!map.has(String(id)))map.set(String(id),uuid());return map.get(String(id));};
 for(const row of guest.user_exercises||[]){const r=clone(row);r.id=assignUnique(exMap,row.id);out.user_exercises.push(r);}
 const firstPosition=Math.max(-1,...out.workout_templates.map(r=>Number(r.position)||0))+1;
 for(const [i,row] of (guest.workout_templates||[]).entries()){const r=clone(row);r.id=remap(maps.workout_templates,row.id);r.position=firstPosition+i;out.workout_templates.push(r);}
 for(const row of guest.template_exercises||[]){const r=clone(row);r.id=remap(maps.template_exercises,row.id);r.workoutId=remap(maps.workout_templates,row.workoutId);r.userExerciseId=remap(exMap,row.userExerciseId);if(row.programmeExerciseId!=null)r.programmeExerciseId=assignUnique(programmeMap,row.programmeExerciseId);if(row.supersetGroupId!=null)r.supersetGroupId=assignUnique(groupMap,row.supersetGroupId);out.template_exercises.push(r);}
 for(const row of guest.workout_sessions||[]){const r=clone(row);r.id=remap(maps.workout_sessions,row.id);r.workoutId=remap(maps.workout_templates,row.workoutId);out.workout_sessions.push(r);}
 for(const row of guest.session_exercises||[]){const r=clone(row);r.id=remap(maps.session_exercises,row.id);r.sessionId=remap(maps.workout_sessions,row.sessionId);r.templateExerciseId=remap(maps.template_exercises,row.templateExerciseId);r.userExerciseId=remap(exMap,row.userExerciseId);if(row.programmeExerciseId!=null)r.programmeExerciseId=assignUnique(programmeMap,row.programmeExerciseId);if(row.supersetGroupId!=null)r.supersetGroupId=assignUnique(groupMap,row.supersetGroupId);out.session_exercises.push(r);}
 for(const row of guest.performed_sets||[]){const r=clone(row);r.id=remap(maps.performed_sets,row.id);r.sessionExerciseId=remap(maps.session_exercises,row.sessionExerciseId);out.performed_sets.push(r);}
 for(const row of guest.tracker_items||[]){const r=clone(row);r.id=assignUnique(itemMap,row.id);r.position=Math.max(0,...out.tracker_items.map(x=>Number(x.position)||0))+1;out.tracker_items.push(r);}
 for(const row of guest.tracker_states||[]){const r=clone(row);r.itemId=remap(itemMap,row.itemId);out.tracker_states.push(r);}
 for(const row of guest.tracker_entries||[]){const r=clone(row);r.itemId=remap(itemMap,row.itemId);const day=String(row.id||'').startsWith('day:')?String(row.localDate||String(row.id).split(':').at(-1)):null;r.id=day?`day:${r.itemId}:${day}`:uuid();out.tracker_entries.push(r);}
 if(!(account.workout_templates||[]).length && (guest.workout_templates||[]).length){out.app_state={...out.app_state,nextWorkoutId:remap(maps.workout_templates,guest.app_state?.nextWorkoutId)||out.workout_templates[0]?.id||null};}
 out.offline_imports=[...(out.offline_imports||[]),{id:transferId,sourceFingerprint:sourceHash,at,counts:offlineTrainingCounts(guest)}];
 // Preserve account revisions; imported rows become new, pending records.
 ensureSyncFoundation(out);
 const result=inspectState(out);if(result.errors.length||result.warnings.length)throw new Error('Attached records failed relationship validation: '+(result.errors[0]||result.warnings[0]?.type));
 return {state:out,sourceFingerprint:sourceHash,transferId,counts:offlineTrainingCounts(guest)};
}
