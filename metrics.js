import {volumeMultiplier} from './exercise-library.js';
import {PERFORMANCE_RULES,effectiveRir,actionableFailure,performanceSettingsFor,performanceRulesFor} from './performance-rules.js';
import {heaviestHistoricalE1rm,TrackingMode} from './exercise-identity.js';
import {finiteNumber,numberInRange,repetitionCount,sameId,trackingModeOf,isRepExercise,finiteSum} from './domain-values.js';
import {summarizeCardioSets} from './cardio-analytics.js';
export const COLORS={blue:'#92b8e8',green:'#70b995',lightgreen:'#a6d9b8',yellow:'#e8cf80',red:'#e99b9b',deepred:'#d97777',orange:'#e9ad83',gray:'#b8bcc4'};
export function roundQuarter(v){return Math.round(Number(v||0)*4)/4;}
const appLocale=()=>typeof document!=='undefined'&&document.documentElement?.lang==='lv'?'lv-LV':'en-GB';
export function formatNumber(value,{minimumFractionDigits=0,maximumFractionDigits=2,useGrouping=false,locale=appLocale()}={}){
  if(value==null||value===''||typeof value==='boolean'||!Number.isFinite(Number(value)))return '—';
  return new Intl.NumberFormat('en-GB',{minimumFractionDigits,maximumFractionDigits,useGrouping}).format(Number(value));
}
export function formatKg(v){
  const text=formatNumber(v);
  return text==='—'?text:`${text} kg`;
}
export function formatKgFixed(v){
  const text=formatNumber(v,{minimumFractionDigits:2,maximumFractionDigits:2});
  return text==='—'?text:`${text} kg`;
}
export function formatKgRounded(v){return formatKg(v);}
export function formatDuration(ms){
  const total=Math.max(0,Math.floor((ms||0)/1000)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
export function dateOnly(ms){return new Intl.DateTimeFormat(appLocale(),{day:'numeric',month:'short',year:'numeric'}).format(new Date(ms));}
export function dateTime(ms){return new Intl.DateTimeFormat(appLocale(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));}
export function iso(ms){return ms==null?null:new Date(ms).toISOString();}
// Source arrays are mutable. Validate every member's identity and grouping key;
// checking only length/endpoints misses replacements and parent reassignment.
const setIndexes=new WeakMap(),exerciseIndexes=new WeakMap();
let activeRenderBatch=0,renderSequence=0;
export function beginMetricsRender(){activeRenderBatch=++renderSequence;}
export function endMetricsRender(){activeRenderBatch=0;}
function groupedRows(rows,key,order,cache){
  const old=cache.get(rows);
  if(old&&activeRenderBatch&&old.batch===activeRenderBatch)return old.groups;
  if(old&&old.members.length===rows.length&&old.members.every((entry,i)=>entry.row===rows[i]&&entry.parent===rows[i][key]&&entry.order===rows[i][order])){old.batch=activeRenderBatch;return old.groups;}
  const groups=new Map();
  for(const row of rows){const k=String(row[key]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
  for(const rowsInGroup of groups.values())rowsInGroup.sort((a,b)=>Number(a[order])-Number(b[order]));
  cache.set(rows,{batch:activeRenderBatch,members:rows.map(row=>({row,parent:row[key],order:row[order]})),groups});
  return groups;
}
export function exerciseSets(state,exerciseId){return exerciseId==null?[]:groupedRows(state.performed_sets||[],'sessionExerciseId','setNumber',setIndexes).get(String(exerciseId))?.slice()||[];}
export function sessionExercises(state,sessionId){return sessionId==null?[]:groupedRows(state.session_exercises||[],'sessionId','position',exerciseIndexes).get(String(sessionId))?.slice()||[];}
export function exerciseMetrics(state,e){
  const complete=exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE');
  const mode=trackingModeOf(e),repBased=isRepExercise(e),loaded=mode===TrackingMode.WEIGHT_REPS,multiplier=volumeMultiplier(e.equipment,e.dumbbellLoad);
  const settings=performanceSettingsFor(state,e),rules=performanceRulesFor(state,e);
  const measured=loaded?complete.filter(s=>numberInRange(s.actualWeightKg)!=null&&repetitionCount(s.actualReps)!=null):[];
  const volume=finiteSum(measured.map(s=>Number(s.actualWeightKg)*Number(s.actualReps)*multiplier));
  const rirs=repBased?complete.map(s=>effectiveRir(s,rules)).filter(v=>v!=null):[];
  const bestE1rm=loaded?heaviestHistoricalE1rm(measured)||null:null;
  const cardio=summarizeCardioSets(mode===TrackingMode.CARDIO?complete:[]);
  const totalDurationSeconds=finiteSum(complete.map(s=>numberInRange(s.actualDurationSeconds)??0));
  const weights=mode===TrackingMode.CARDIO||mode===TrackingMode.BODYWEIGHT_REPS||e.equipment==='BODYWEIGHT'?[]:complete.map(s=>numberInRange(s.actualWeightKg)).filter(v=>v!=null);
  const reps=repBased?complete.map(s=>repetitionCount(s.actualReps)).filter(v=>v!=null):[];
  const maxWeight=weights.length?Math.max(...weights):null,maxReps=reps.length?Math.max(...reps):null;
  const failureCount=repBased?complete.filter(s=>s.failure===true).length:0;
  const actionableFailureCount=repBased?complete.filter(s=>actionableFailure(e,s,settings,rules)).length:0;
  const avgRir=rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null;
  return {...cardio,volume,avgRir,effectiveRirAvg:avgRir,completedSets:complete.length,strengthCompletedSets:repBased?complete.length:0,effortRecordedSets:rirs.length,volumeRecordedSets:measured.length,bestE1rm,maxWeight,maxReps,totalDurationSeconds,failureCount,actionableFailureCount,analysisVersion:'GYM_PROGRESS_METRICS_V2'};
}
/** Compare *prescribed* programme composition, never how the user executed it.
 * A skipped/failed/incomplete set is not a programme edit. Likewise, moving an
 * exercise later within a live session or changing weight/reps during normal
 * progression must not trigger a misleading shared-card asterisk.
 * A different exercise (including a deliberate replacement) or a changed
 * prescribed number of sets is a material comparison change.
 * Sort to ignore in-session ordering while retaining duplicate occurrences.
 * Superset UUIDs are deliberately excluded: they are not volume operands.
 */
export function programmeCompositionSignature(state,session){
 const members=sessionExercises(state,session?.id).map(e=>{
  const identity=e.programmeExerciseId!=null?`programme:${e.programmeExerciseId}`:
   e.templateExerciseId!=null?`template:${e.templateExerciseId}`:
   e.userExerciseId!=null?`user:${e.userExerciseId}`:
   e.canonicalExerciseId!=null?`canonical:${e.canonicalExerciseId}`:
   `name:${String(e.name||'').trim().toLocaleLowerCase('en')}`;
  const planned=Number(e.targetSets);
  const prescribedSets=Number.isInteger(planned)&&planned>0?planned:exerciseSets(state,e.id).length;
  return JSON.stringify([identity,prescribedSets,trackingModeOf(e),e.equipment??null,e.dumbbellLoad??null]);
 });
 return JSON.stringify(members.sort());
}
/** Whole workout-DAY strength load, not matched-exercise progression.
 * Compare consecutive completed sessions of the same workout template, even
 * when its exercises/sets have changed. Cardio/bodyweight-rep volume must not
 * be mixed with kilograms lifted; exercises with no measured load are excluded.
 * A zero/unknown historical denominator cannot form a meaningful percentage.
 */
export function dayVolumeProgress(state,current){
 const none={percent:null,structureChanged:false,previousSessionId:null,currentVolume:null,previousVolume:null};
 if(current?.status!=='COMPLETE')return none;
 const previous=(state.workout_sessions||[]).filter(s=>!sameId(s.id,current.id)&&s.status==='COMPLETE'&&
   Number(s.startedAt)<Number(current.startedAt)&&
   (current.workoutId!=null?sameId(s.workoutId,current.workoutId):s.workoutName===current.workoutName))
   .sort((a,b)=>Number(b.startedAt)-Number(a.startedAt))[0];
 if(!previous)return none;
 const strengthLoad=session=>{
   const measurable=sessionExercises(state,session.id).filter(e=>trackingModeOf(e)===TrackingMode.WEIGHT_REPS).map(e=>exerciseMetrics(state,e));
   return {volume:finiteSum(measurable.map(m=>m.volume)),sets:measurable.reduce((n,m)=>n+m.volumeRecordedSets,0)};
 };
 const structure=session=>programmeCompositionSignature(state,session);
 const actual=strengthLoad(current),historical=strengthLoad(previous);
 const result={percent:null,structureChanged:structure(current)!==structure(previous),previousSessionId:previous.id,
   currentVolume:actual.volume,previousVolume:historical.volume};
 if(actual.sets>0&&historical.sets>0&&historical.volume>0)result.percent=(actual.volume/historical.volume-1)*100;
 return result;
}
// Compatibility for older consumers; new code should use dayVolumeProgress.
export const matchedVolumeProgress=dayVolumeProgress;
export function sessionMetrics(state,session){
  const es=sessionExercises(state,session.id); const em=es.map(e=>exerciseMetrics(state,e));
  const volume=em.some(m=>m.volume==null)?null:finiteSum(em.map(m=>m.volume)),failures=em.reduce((a,m)=>a+m.failureCount,0),actionableFailures=em.reduce((a,m)=>a+m.actionableFailureCount,0);
  const completeSets=es.flatMap(e=>exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE'));
  const strengthSets=es.filter(isRepExercise).flatMap(e=>exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE'));
  const rirs=strengthSets.map(s=>effectiveRir(s,performanceRulesFor(state,session))).filter(v=>v!=null);
  const volumeComparison=dayVolumeProgress(state,session);
  const avgRir=rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null;
  return {volume,avgRir,effectiveRirAvg:avgRir,completedSets:completeSets.length,strengthCompletedSets:strengthSets.length,effortRecordedSets:rirs.length,progressPercent:volumeComparison.percent,volumeComparison,failureCount:failures,actionableFailureCount:actionableFailures,failedExercises:em.filter(m=>m.actionableFailureCount>0).length,analysisSettings:performanceSettingsFor(state,session),analysisRules:performanceRulesFor(state,session)};
}
function volumeStructure(state,session){return JSON.stringify(sessionExercises(state,session.id).filter(e=>trackingModeOf(e)===TrackingMode.WEIGHT_REPS).map(e=>[e.programmeExerciseId??e.userExerciseId??e.templateExerciseId??e.name,e.equipment,e.dumbbellLoad]));}
export function previousIdenticalSession(state,current){
  if(current?.status!=='COMPLETE')return null;
  const structure=volumeStructure(state,current);if(structure==='[]')return null;
  return (state.workout_sessions||[]).filter(s=>!sameId(s.id,current.id)&&s.status==='COMPLETE'&&s.startedAt<current.startedAt&&
    (current.workoutId!=null?sameId(s.workoutId,current.workoutId):s.workoutName===current.workoutName)&&volumeStructure(state,s)===structure).sort((a,b)=>b.startedAt-a.startedAt)[0]||null;
}
/** Exercise-level difficulty; failureCount means actionable failures. */
export function difficultyLevel(avgRir,failureCount,appState,sessionStatus=null,completedSets=0,rules=PERFORMANCE_RULES){
  if(sessionStatus==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  const count=Math.max(0,Number(completedSets||0)),failures=Math.max(0,Number(failureCount||0));
  if(count<=0&&avgRir==null)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  const rule=rules.effort.exerciseFailure,rate=count?failures/count:0;
  const failed=count===1&&rule.singleSetActionableFailure?failures>=1:failures>=Number(rule.minimumFailures||2)&&rate>=Number(rule.minimumFailureRate||.5);
  if(failed)return {key:'failure',label:'Failure',color:COLORS.deepred};
  return effortFromScore(avgRir,appState);
}
export function sessionDifficultyLevel(metrics,appState,sessionStatus=null){
  if(sessionStatus==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  const count=Math.max(0,Number(metrics?.strengthCompletedSets??metrics?.completedSets??0));if(!count)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  const failures=Math.max(0,Number(metrics?.actionableFailureCount||0)),rate=failures/count,rule=(metrics?.analysisRules||PERFORMANCE_RULES).effort.sessionFailure;
  const systemic=failures>=Number(rule.minimumFailures||2)&&(rate>=Number(rule.minimumFailureRate||.25)||(Number(metrics?.failedExercises||0)>=Number(rule.multiExerciseMinimum||2)&&rate>=Number(rule.multiExerciseFailureRate||.15)));
  if(systemic)return {key:'failure',label:'Failure',color:COLORS.deepred};
  return effortFromScore(metrics?.avgRir,metrics?.analysisSettings||appState);
}
function effortFromScore(score,appState){
  score=finiteNumber(score);if(score==null)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  if(score>=(numberInRange(appState?.difficultyComfortableMinRir)??2.5))return {key:'comfortable',label:'Comfortable',color:COLORS.green};
  if(score>=(numberInRange(appState?.difficultyChallengingMinRir)??1.5))return {key:'challenging',label:'Challenging',color:COLORS.yellow};
  if(score>=(numberInRange(appState?.difficultyHardMinRir)??.5))return {key:'hard',label:'Hard',color:COLORS.orange};
  return {key:'very-hard',label:'Very hard',color:COLORS.red};
}
export function exerciseProgressPercent(state,e,previous){
  const m=exerciseMetrics(state,e); if(!m.completedSets||!previous)return null;
  const old=sessionExercises(state,previous.id).find(x=>sameId(x.programmeExerciseId,e.programmeExerciseId))||sessionExercises(state,previous.id).find(x=>sameId(x.userExerciseId,e.userExerciseId)&&Number(x.position)===Number(e.position))||sessionExercises(state,previous.id).find(x=>x.name===e.name&&Number(x.position)===Number(e.position)); if(!old||trackingModeOf(old)!==trackingModeOf(e)||old.equipment!==e.equipment||old.dumbbellLoad!==e.dumbbellLoad)return null;
  const oldVol=exerciseMetrics(state,old).volume; return oldVol>0?(m.volume/oldVol-1)*100:null;
}
export function phaseDuration(start,end,skipped){return skipped?(appLocale()==='lv-LV'?'Izlaists':'Skipped'):start!=null&&end!=null?formatDuration(end-start):'—';}
