import {CANONICAL_BY_ID,CANONICAL_BY_KEY,canonicalName} from './exercise-catalogue.js';
import {REVIEWED_MIGRATION} from './exercise-migration-map.js';
import {Equipment,DumbbellLoad,ExerciseType,bestMatch} from './exercise-library.js';

export const TrackingMode={WEIGHT_REPS:'WEIGHT_REPS',BODYWEIGHT_REPS:'BODYWEIGHT_REPS',TIME_ONLY:'TIME_ONLY'};
export const E1RM_FORMULA_VERSION='EPLEY_RIR_V1';

export function uuid(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});
}
export function trackingModeFor(equipment){return equipment===Equipment.BODYWEIGHT?TrackingMode.BODYWEIGHT_REPS:TrackingMode.WEIGHT_REPS;}
export function canonicalExerciseById(id){return id?CANONICAL_BY_ID.get(id)||null:null;}
export function canonicalExerciseByKey(key){return key?CANONICAL_BY_KEY.get(key)||null:null;}
export function canonicalDisplayName(canonical,lang='en'){return canonicalName(canonical,lang);}
export function effectiveRir(set){return set?.failure?0:(set?.rir==null?null:Number(set.rir));}
export function qualifyingE1rm(set){
  if(!set||set.status!=='COMPLETE')return null;
  const weight=Number(set.actualWeightKg??0),reps=Number(set.actualReps??0),rir=effectiveRir(set);
  if(!(weight>0)||!(reps>0)||rir==null||rir<0||rir>2)return null;
  const effective=reps+rir;if(effective>10)return null;
  if(reps===1&&rir===0)return weight;
  return weight*(1+effective/30);
}
export function e1rmConfidence(set){const rir=effectiveRir(set);if(rir==null)return'NOT_ELIGIBLE';const effective=Number(set.actualReps||0)+rir;if(Number(set.actualReps||0)===1&&rir===0)return'DIRECT';if(effective>=2&&effective<=5)return'HIGH';if(effective>=6&&effective<=10&&rir<=2)return'STANDARD';return'NOT_ELIGIBLE';}

function inferReviewedUser(state){
  const names=new Set((state.workout_templates||[]).map(w=>String(w.name||'').trim()));
  if(['Strength','Hypertrophy','Volume'].every(x=>names.has(x)))return'User A';
  if(['Day 1','Day 2','Day 3'].every(x=>names.has(x)))return'User B';
  return null;
}
function cleanName(v){return String(v||'').trim();}
function normalized(v){return cleanName(v).toLowerCase().replace(/\s+/g,' ');}
function reviewedUserRow(label,id){return REVIEWED_MIGRATION.users.find(x=>x.userLabel===label&&x.userExerciseId===id)||null;}
function reviewedOccurrence(label,oldId){return REVIEWED_MIGRATION.programmeOccurrences.find(x=>x.userLabel===label&&Number(x.oldTemplateId)===Number(oldId))||null;}
function existingUserExercise(state,id){return (state.user_exercises||[]).find(x=>x.id===id)||null;}
function createGenericUserExercise(state,template,lang){
  // Generic migration is deliberately conservative. Reuse only when legacy key + equipment + exact display name all agree.
  const match=(state.user_exercises||[]).find(u=>!u.archived&&normalized(u.displayName)===normalized(template.name)&&u.equipment===(template.equipment||Equipment.OTHER)&&(u.legacyExerciseKey||null)===(template.exerciseKey||null));
  if(match)return match;
  // Legacy migration is intentionally conservative: an existing structured exerciseKey may
  // establish a canonical link, but a display-name similarity alone must never do so. Custom
  // exercises remain local until the user explicitly chooses/links a catalogue exercise.
  const lib=bestMatch(template.name);
  const canonical=template.exerciseKey?(canonicalExerciseByKey(template.exerciseKey)||[...CANONICAL_BY_ID.values()].find(x=>x.legacyExerciseKey===template.exerciseKey)||null):null;
  const u={id:uuid(),canonicalExerciseId:canonical?.id||null,displayName:cleanName(template.name)||canonical?.nameEn||'Exercise',createdLanguage:lang||'en',equipment:template.equipment||canonical?.equipment||lib?.equipment||Equipment.OTHER,dumbbellLoad:template.dumbbellLoad||canonical?.dumbbellLoad||lib?.dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:template.exerciseType||canonical?.exerciseType||lib?.type||ExerciseType.MODERATE_COMPOUND,trackingMode:template.trackingMode||trackingModeFor(template.equipment||canonical?.equipment||Equipment.OTHER),archived:false,candidateCanonicalExerciseId:null,legacyExerciseKey:template.exerciseKey||null};
  state.user_exercises.push(u);return u;
}
function ensureMappedUserExercise(state,row,template,lang){
  let u=existingUserExercise(state,row.userExerciseId);if(u)return u;
  const canonical=canonicalExerciseById(row.canonicalId);
  const correctedEquipment=canonical?.equipment||template?.equipment||row.equipment?.[0]||Equipment.OTHER;
  u={id:row.userExerciseId,canonicalExerciseId:row.canonicalId||null,displayName:row.displayName,createdLanguage:lang||'en',equipment:correctedEquipment,dumbbellLoad:canonical?.dumbbellLoad||template?.dumbbellLoad||row.dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:canonical?.exerciseType||template?.exerciseType||ExerciseType.MODERATE_COMPOUND,trackingMode:trackingModeFor(correctedEquipment),archived:false,candidateCanonicalExerciseId:null,legacyExerciseKey:row.legacyExerciseKeys?.[0]||template?.exerciseKey||null};
  state.user_exercises.push(u);return u;
}
export function ensureExerciseIdentityState(state){
  if(!state.user_exercises)state.user_exercises=[];
  if(!state.tracker_items)state.tracker_items=[];
  if(!state.tracker_entries)state.tracker_entries=[];
  const lang=state.app_state?.languageCode==='lv'?'lv':'en',label=inferReviewedUser(state);
  const byTemplateId=new Map();
  for(const t of state.template_exercises||[]){
    let u,occ=label?reviewedOccurrence(label,t.id):null;
    if(occ){const row=reviewedUserRow(label,occ.userExerciseId);u=ensureMappedUserExercise(state,row,t,lang);t.userExerciseId=u.id;t.programmeExerciseId=t.programmeExerciseId||occ.programmeExerciseId;t.name=u.displayName;t.equipment=u.equipment;t.dumbbellLoad=u.dumbbellLoad;t.exerciseType=u.exerciseType;}
    else{u=t.userExerciseId?existingUserExercise(state,t.userExerciseId):null;u=u||createGenericUserExercise(state,t,lang);t.userExerciseId=u.id;t.programmeExerciseId=t.programmeExerciseId||uuid();}
    t.trackingMode=t.trackingMode||u.trackingMode||trackingModeFor(t.equipment);t.targetSeconds=Math.max(0,Number(t.targetSeconds||0));t.compareWithFriends=t.compareWithFriends===true;t.supersetGroupId=t.supersetGroupId||null;byTemplateId.set(Number(t.id),t);
  }
  for(const s of state.session_exercises||[]){
    const t=s.templateExerciseId!=null?byTemplateId.get(Number(s.templateExerciseId)):null;
    let u=t?.userExerciseId?existingUserExercise(state,t.userExerciseId):null;
    if(!u&&s.userExerciseId)u=existingUserExercise(state,s.userExerciseId);
    if(!u){
      // Orphan history: match reviewed source name only when exactly one reviewed user exercise fits, otherwise keep local.
      let row=null;if(label){const matches=REVIEWED_MIGRATION.users.filter(x=>x.userLabel===label&&[x.displayName,...(x.sourceNames||[]),...(x.historicalNames||[])].some(n=>normalized(n)===normalized(s.name)));if(matches.length===1)row=matches[0];}
      u=row?ensureMappedUserExercise(state,row,s,lang):createGenericUserExercise(state,s,lang);
    }
    s.userExerciseId=u.id;s.programmeExerciseId=s.programmeExerciseId||t?.programmeExerciseId||uuid();s.canonicalExerciseId=u.canonicalExerciseId||null;s.trackingMode=s.trackingMode||t?.trackingMode||u.trackingMode||trackingModeFor(s.equipment);s.targetSeconds=Math.max(0,Number(s.targetSeconds??t?.targetSeconds??0));s.compareWithFriends=s.compareWithFriends===true||t?.compareWithFriends===true;s.supersetGroupId=s.supersetGroupId||t?.supersetGroupId||null;
  }
  for(const set of state.performed_sets||[]){set.targetDurationSeconds=Math.max(0,Number(set.targetDurationSeconds||0));set.actualDurationSeconds=set.actualDurationSeconds==null?null:Math.max(0,Number(set.actualDurationSeconds));}
  for(const u of state.user_exercises){
    if(!u.canonicalExerciseId&&u.legacyExerciseKey){const c=canonicalExerciseByKey(u.legacyExerciseKey)||[...CANONICAL_BY_ID.values()].find(x=>x.legacyExerciseKey===u.legacyExerciseKey)||null;if(c){u.canonicalExerciseId=c.id;u.equipment=c.equipment||u.equipment;u.dumbbellLoad=c.dumbbellLoad||u.dumbbellLoad;u.exerciseType=c.exerciseType||u.exerciseType;}}
    u.archived=u.archived===true;u.createdLanguage=u.createdLanguage==='lv'?'lv':'en';const allowed=u.equipment===Equipment.BODYWEIGHT?[TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY]:[Equipment.BARBELL,Equipment.DUMBBELL,Equipment.MACHINE,Equipment.CABLE].includes(u.equipment)?[TrackingMode.WEIGHT_REPS,TrackingMode.TIME_ONLY]:[TrackingMode.WEIGHT_REPS,TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY];u.trackingMode=allowed.includes(u.trackingMode)?u.trackingMode:trackingModeFor(u.equipment);u.candidateCanonicalExerciseId=u.candidateCanonicalExerciseId||null;
  }
  for(const t of state.template_exercises||[]){const u=existingUserExercise(state,t.userExerciseId);if(u?.canonicalExerciseId&&!t.canonicalExerciseId)t.canonicalExerciseId=u.canonicalExerciseId;const allowed=t.equipment===Equipment.BODYWEIGHT?[TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY]:[Equipment.BARBELL,Equipment.DUMBBELL,Equipment.MACHINE,Equipment.CABLE].includes(t.equipment)?[TrackingMode.WEIGHT_REPS,TrackingMode.TIME_ONLY]:[TrackingMode.WEIGHT_REPS,TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY];t.trackingMode=allowed.includes(t.trackingMode)?t.trackingMode:trackingModeFor(t.equipment);if(t.equipment===Equipment.BODYWEIGHT)t.initialWeightKg=0;}
  return state;
}
export function getUserExercise(state,id){return (state.user_exercises||[]).find(x=>x.id===id)||null;}
export function displayNameForSessionExercise(state,e){return getUserExercise(state,e.userExerciseId)?.displayName||e.name||'Exercise';}
export function activeUserExercises(state){return (state.user_exercises||[]).filter(x=>!x.archived).slice().sort((a,b)=>a.displayName.localeCompare(b.displayName));}
export function isFriendComparableUserExercise(u){const c=canonicalExerciseById(u?.canonicalExerciseId);return !!(c?.friendE1rmEligible&&c?.comparisonMetric==='E1RM');}
