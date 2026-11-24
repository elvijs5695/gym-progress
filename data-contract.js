/** Versioned portable data contract. Raw measurements are never rounded or inferred. */
export const DATA_SCHEMA='gym-progress-backup-v2';
export const DATA_VERSION=2;
export const COLLECTIONS=Object.freeze({workout_templates:'id',user_exercises:'id',template_exercises:'id',workout_sessions:'id',session_exercises:'id',performed_sets:'id',tracker_items:'id',tracker_states:'itemId',tracker_entries:'id'});
const NUMBER_IDS=new Set(['workout_templates','template_exercises','workout_sessions','session_exercises','performed_sets']);
const UNSAFE_KEYS=new Set(['__proto__','prototype','constructor']);
export const clone=value=>value==null?value:structuredClone(value);
export function stable(value){if(value==null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));}
export const fingerprint=value=>JSON.stringify(stable(value));
export const validId=value=>typeof value==='number'?Number.isSafeInteger(value)&&value>0:typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value);
export function assertJSON(value,path='data',depth=0){
 if(depth>40)throw new Error(`${path}: nesting exceeds 40 levels`);
 if(value==null||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error(`${path}: non-finite number`);return;}
 if(typeof value==='string'){if(value.length>2000000)throw new Error(`${path}: text is too large`);return;}
 if(typeof value!=='object')throw new Error(`${path}: unsupported value`);
 for(const [k,v] of Object.entries(value)){if(UNSAFE_KEYS.has(k))throw new Error(`${path}: reserved object key`);assertJSON(v,`${path}.${k}`,depth+1);}
}
export function inspectState(input){
 assertJSON(input);if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Backup must contain an object');
 const errors=[],warnings=[],counts={};
 for(const [key,value]of [['app_state',input.app_state],['runtime',input.runtime]])try{assertDataFields(value,key,{recursive:true});}catch(error){errors.push(error.message);}
 for(const [name,idKey]of Object.entries(COLLECTIONS)){
  const rows=input[name]??[];if(!Array.isArray(rows)){errors.push(`${name}: expected a list`);continue;}
  counts[name]=rows.length;const seen=new Set();if(rows.length>1000000)errors.push(`${name}: too many records for this import`);
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)){errors.push(`${name}: invalid record`);continue;}
   try{assertDataFields(row,name);}catch(error){errors.push(error.message);}
   const id=row[idKey];if(!validId(id)||(NUMBER_IDS.has(name)&&!(typeof id==='number'&&Number.isSafeInteger(id))))errors.push(`${name}: invalid ${idKey}`);
   if(seen.has(String(id)))errors.push(`${name}: duplicate ${idKey} ${id}`);seen.add(String(id));
   for(const k of ['userExerciseId','programmeExerciseId','canonicalExerciseId','supersetGroupId','exerciseKey','itemId'])if(row[k]!=null&&row[k]!==''&&!validId(row[k]))errors.push(`${name}.${id}: invalid ${k}`);
  }
 }
 const relation=(children,field,parents,required=true)=>{const ids=new Set((input[parents]||[]).map(r=>String(r.id)));for(const row of input[children]||[])if((required||row[field]!=null)&&!ids.has(String(row[field])))warnings.push({type:'missing_parent',collection:children,id:row.id??row.itemId,field,value:row[field]??null,parent:parents});};
 relation('template_exercises','workoutId','workout_templates');relation('session_exercises','sessionId','workout_sessions');relation('performed_sets','sessionExerciseId','session_exercises');relation('tracker_states','itemId','tracker_items');relation('tracker_entries','itemId','tracker_items');relation('template_exercises','userExerciseId','user_exercises',false);relation('session_exercises','userExerciseId','user_exercises',false);
 return {errors:[...new Set(errors)],warnings,counts};
}
export function minutesToTime(value){const n=Number(value);if(!Number.isInteger(n)||n<0||n>1439)throw new Error('Invalid time in backup');return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
export function parseBackup(input){
 const raw=typeof input==='string'?JSON.parse(input):clone(input);
 if(![DATA_SCHEMA,'gym-progress-backup-v6','gym-progress-backup-v5','gym-progress-backup-v4','gym-progress-backup-v3','progression-backup-v2','progression-backup-v1'].includes(raw?.schema))throw new Error('Unsupported Gym Progress backup format');
 const state=raw.state?clone(raw.state):clone(raw),report=inspectState(state);if(report.errors.length)throw new Error(report.errors.slice(0,8).join('\n'));
 state.integrity={...(state.integrity||{}),importWarnings:report.warnings};state.app_state=state.app_state||{};
 for(const [key,def]of [['morningReminderTime','08:00'],['eveningReminderTime','19:00']]){const mk=key.replace('Time','Minutes');if(state.app_state[key]==null&&Number.isFinite(state.app_state[mk]))state.app_state[key]=minutesToTime(state.app_state[mk]);if(state.app_state[key]==null)state.app_state[key]=def;}
 for(const row of state.tracker_items||[]){if(row.productiveStart==null&&row.productiveStartMinutes!=null)row.productiveStart=minutesToTime(row.productiveStartMinutes);if(row.productiveEnd==null&&row.productiveEndMinutes!=null)row.productiveEnd=minutesToTime(row.productiveEndMinutes);}
 state.runtime=state.runtime??null;return {state,report,original:raw};
}
export function createBackup(state){const report=inspectState(state);if(report.errors.length)throw new Error(report.errors.join('\n'));return {...clone(state),schema:DATA_SCHEMA,formatVersion:DATA_VERSION,exported_at_ms:Date.now()};}
export function assertPreserved(before,after){for(const [collection,idKey]of Object.entries(COLLECTIONS)){const rows=new Map((after[collection]||[]).map(r=>[String(r[idKey]),r]));for(const original of before[collection]||[]){const row=rows.get(String(original[idKey]));if(!row)throw new Error(`Preservation failed: missing ${collection} ${original[idKey]}`);for(const [key,value]of Object.entries(original))if(fingerprint(row[key])!==fingerprint(value))throw new Error(`Preservation failed: changed ${collection} ${original[idKey]}.${key}`);}}return true;}

const NUMERIC_FIELDS=new Set(['workoutId','sessionId','sessionExerciseId','templateExerciseId','position','setNumber','sets','reps','targetSets','targetReps','actualReps','targetSeconds','targetDurationSeconds','actualDurationSeconds','initialWeightKg','plannedWeightKg','actualWeightKg','nextWeightKg','workingWeight','weight','weightKg','rir','targetRirMin','targetRirMax','progressionRirThreshold','rirInputMax','difficultyComfortableMinRir','difficultyChallengingMinRir','difficultyHardMinRir','maxRampUpSets','restSeconds','plannedRestSeconds','actualRestSeconds','distanceKm','averageHeartRateBpm','averagePowerWatts','sessionRpe','targetAmount','amount','increment','productiveStartMinutes','productiveEndMinutes','currentExerciseIndex','currentSetIndex','durationSeconds','startedAt','endedAt','completedAt','phaseStartedAt','reminderStartedAt','pausedAt','endsAt','plannedSeconds','warmupStartedAt','warmupEndedAt','stretchStartedAt','stretchEndedAt','rampStartedAt','rampEndedAt','unloadStartedAt','unloadEndedAt','inactivityReminderHours','nextSessionAt','nextReps']);
const BOOLEAN_FIELDS=new Set(['failure','enabled','isActive','archived','compareWithFriends','requiresCalibration','keepScreenAwake','soundEnabled','motivationEnabled','starterPromptDismissed','lastSetZeroRirAcceptable','removeWeights','warmupSkipped','stretchSkipped','rampSkipped','unloadSkipped','progressionOffered','progressionAccepted','futureAdjustmentOffered','futureAdjustmentAccepted','advancesRotation']);
const TOKEN_FIELDS=new Set(['phase','status','trackingMode','equipment','dumbbellLoad','exerciseType','rampMode']);
/** Known display/control fields cannot carry markup or coercible strings. Unknown extension data stays intact. */
export function assertDataFields(value,path='record',{recursive=false}={}){
 if(!value||typeof value!=='object')return;
 for(const [key,item]of Object.entries(value)){
  if(item==null)continue;
  if(NUMERIC_FIELDS.has(key)&&(typeof item!=='number'||!Number.isFinite(item)))throw new Error(`${path}.${key}: expected a finite number or null`);
  if(BOOLEAN_FIELDS.has(key)&&typeof item!=='boolean')throw new Error(`${path}.${key}: expected true, false or null`);
  if(TOKEN_FIELDS.has(key)&&(typeof item!=='string'||!/^[A-Z][A-Z0-9_]{0,63}$/.test(item)))throw new Error(`${path}.${key}: invalid state value`);
  if(recursive&&typeof item==='object'&&key!=='values')assertDataFields(item,`${path}.${key}`,{recursive:true});
 }
}
