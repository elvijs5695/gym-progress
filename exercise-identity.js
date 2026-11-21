import {CANONICAL_BY_ID,CANONICAL_BY_KEY,canonicalName} from './exercise-catalogue.js';
import {Equipment,DumbbellLoad,ExerciseType,bestMatch} from './exercise-library.js';

export const TrackingMode={WEIGHT_REPS:'WEIGHT_REPS',BODYWEIGHT_REPS:'BODYWEIGHT_REPS',TIME_ONLY:'TIME_ONLY',CARDIO:'CARDIO'};
export const E1RM_FORMULA_VERSION='EPLEY_HEAVIEST_V2';

export function uuid(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});
}
export function trackingModeFor(equipment){return equipment===Equipment.CARDIO?TrackingMode.CARDIO:equipment===Equipment.BODYWEIGHT?TrackingMode.BODYWEIGHT_REPS:TrackingMode.WEIGHT_REPS;}
export function canonicalExerciseById(id){return id?CANONICAL_BY_ID.get(id)||null:null;}
export function canonicalExerciseByKey(key){
 if(!key)return null;
 const direct=CANONICAL_BY_KEY.get(key);if(direct)return direct;
 const legacy=[...CANONICAL_BY_ID.values()].filter(exercise=>exercise.legacyExerciseKey===key);
 return legacy.length===1?legacy[0]:null;
}
export function canonicalDisplayName(canonical,lang='en'){return canonicalName(canonical,lang);}
// Validate derived measurements without changing the archived source record.
function finiteMeasurement(value){
  if(value==null||typeof value==='boolean'||typeof value==='object'||String(value).trim()==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
export function effectiveRir(set){
  if(set?.status&&set.status!=='COMPLETE')return null;
  if(set?.failure===true)return 0;
  const value=finiteMeasurement(set?.rir);return value!=null&&value>=0?value:null;
}
export function historicalE1rm(set){
  if(!set||set.status!=='COMPLETE')return null;
  const weight=finiteMeasurement(set.actualWeightKg),reps=finiteMeasurement(set.actualReps);if(!(weight>0)||!(reps>0)||!Number.isInteger(reps))return null;
  const raw=effectiveRir(set),rir=raw!=null&&raw>=0&&raw<=2?raw:0;
  if(reps===1&&rir===0)return weight;
  const value=weight*(1+(reps+rir)/30);return Number.isFinite(value)?value:null;
}
export function qualifyingE1rm(set){
  if(!set||set.status!=='COMPLETE')return null;
  const weight=finiteMeasurement(set.actualWeightKg),reps=finiteMeasurement(set.actualReps),rir=effectiveRir(set);
  if(!(weight>0)||!(reps>0)||!Number.isInteger(reps)||rir==null||rir<0||rir>2)return null;
  const effective=reps+rir;if(effective>10)return null;
  if(reps===1&&rir===0)return weight;
  const value=weight*(1+effective/30);return Number.isFinite(value)?value:null;
}
export function heaviestHistoricalE1rm(sets=[]){
  const eligible=sets.filter(s=>historicalE1rm(s)!=null)
    .sort((a,b)=>Number(b.actualWeightKg)-Number(a.actualWeightKg)||Number(a.actualReps)-Number(b.actualReps)||Number(a.setNumber||0)-Number(b.setNumber||0));
  return eligible.length?(historicalE1rm(eligible[0])||0):0;
}
export function heaviestQualifyingE1rm(sets=[]){
  const eligible=sets.map(s=>({s,v:qualifyingE1rm(s)})).filter(x=>x.v!=null)
    .sort((a,b)=>Number(b.s.actualWeightKg)-Number(a.s.actualWeightKg)||Number(a.s.actualReps)-Number(b.s.actualReps));
  return eligible.length?eligible[0].v:null;
}
export function e1rmConfidence(set){if(qualifyingE1rm(set)==null)return'NOT_ELIGIBLE';const rir=effectiveRir(set),effective=Number(set.actualReps)+rir;if(Number(set.actualReps)===1&&rir===0)return'DIRECT';if(effective>=2&&effective<=5)return'HIGH';if(effective>=6&&effective<=10)return'STANDARD';return'NOT_ELIGIBLE';}

function existingUserExercise(state,id){return (state.user_exercises||[]).find(x=>x.id===id)||null;}
function setMissing(row,key,value){if(row[key]===undefined)row[key]=value;}
function localIdentity(state,row,lang){
 // Never infer a person or a canonical exercise from a programme name or numeric ID.
 const supplied=row.userExerciseId;
 if(supplied!=null){const known=existingUserExercise(state,supplied);if(known)return known;}
 const canonical=row.canonicalExerciseId?canonicalExerciseById(row.canonicalExerciseId):null;
 const u={id:supplied||uuid(),canonicalExerciseId:row.canonicalExerciseId??null,displayName:String(row.name||canonical?.nameEn||'Exercise'),createdLanguage:lang,equipment:row.equipment||Equipment.OTHER,dumbbellLoad:row.dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:row.exerciseType||ExerciseType.MODERATE_COMPOUND,trackingMode:row.trackingMode||trackingModeFor(row.equipment),archived:false,candidateCanonicalExerciseId:null,legacyExerciseKey:row.exerciseKey??null};
 state.user_exercises.push(u);return u;
}
export function ensureExerciseIdentityState(state){
 state.user_exercises=state.user_exercises||[];state.tracker_items=state.tracker_items||[];state.tracker_states=state.tracker_states||[];
 const lang=state.app_state?.languageCode==='lv'?'lv':'en',byId=new Map();
 for(const e of state.template_exercises||[]){
  const u=e.userExerciseId===null?null:(existingUserExercise(state,e.userExerciseId)||localIdentity(state,e,lang));
  if(u)setMissing(e,'userExerciseId',u.id);setMissing(e,'programmeExerciseId',uuid());setMissing(e,'trackingMode',u?.trackingMode||trackingModeFor(e.equipment));setMissing(e,'targetSeconds',0);setMissing(e,'compareWithFriends',false);setMissing(e,'supersetGroupId',null);byId.set(e.id,e);
 }
 for(const e of state.session_exercises||[]){
  let u=existingUserExercise(state,e.userExerciseId);const t=byId.get(e.templateExerciseId);
  // Only an explicit stable link or exact existing template identity can be inherited.
  if(!u&&e.userExerciseId===undefined&&t&&t.exerciseKey===e.exerciseKey&&t.equipment===e.equipment)u=existingUserExercise(state,t.userExerciseId);
  if(!u&&e.userExerciseId!==null)u=localIdentity(state,e,lang);
  if(u)setMissing(e,'userExerciseId',u.id);setMissing(e,'programmeExerciseId',t?.programmeExerciseId||uuid());setMissing(e,'trackingMode',trackingModeFor(e.equipment));setMissing(e,'canonicalExerciseId',null);setMissing(e,'targetSeconds',0);setMissing(e,'compareWithFriends',false);setMissing(e,'supersetGroupId',null);
 }
 for(const row of state.performed_sets||[]){setMissing(row,'targetDurationSeconds',0);setMissing(row,'actualDurationSeconds',null);}
 return state;
}
export function getUserExercise(state,id){return (state.user_exercises||[]).find(x=>x.id===id)||null;}
const normalizedName=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function isCatalogueDisplayName(value,canonical){
 if(!canonical)return false;
 const key=normalizedName(value);
 return Boolean(key&&[canonical.nameEn,canonical.nameLv,...(canonical.aliasesEn||[])].some(name=>normalizedName(name)===key));
}
/** Localise a known catalogue name without altering its stable identity, source
 * text or a personal label. A historical custom name remains historical. */
export function displayNameForUserExercise(state,user,fallback='Exercise',lang=state?.app_state?.languageCode||'en'){
 const raw=user?.displayName||fallback;
 const canonical=canonicalExerciseById(user?.canonicalExerciseId);
 if(canonical&&user?.displayNameMode!=='CUSTOM'&&(user?.displayNameMode==='CATALOGUE'||isCatalogueDisplayName(raw,canonical)))return canonicalName(canonical,lang)||raw;
 return raw;
}
export function displayNameForSessionExercise(state,e,lang=state?.app_state?.languageCode||'en'){
 const user=getUserExercise(state,e?.userExerciseId),raw=e?.name||user?.displayName||'Exercise';
 if(e?.displayNameMode==='CUSTOM'||e?.displayNameMode==null&&user?.displayNameMode==='CUSTOM'&&raw===user.displayName)return raw;
 const canonical=canonicalExerciseById(e?.canonicalExerciseId)||canonicalExerciseById(user?.canonicalExerciseId);
 return canonical&&isCatalogueDisplayName(raw,canonical)?canonicalName(canonical,lang)||raw:raw;
}
export function activeUserExercises(state){return (state.user_exercises||[]).filter(x=>!x.archived).slice().sort((a,b)=>a.displayName.localeCompare(b.displayName));}
export function isFriendComparableUserExercise(u){const c=canonicalExerciseById(u?.canonicalExerciseId);return !!(c?.friendE1rmEligible&&c?.comparisonMetric==='E1RM');}
