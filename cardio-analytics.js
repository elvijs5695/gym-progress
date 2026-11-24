import {finiteNumber,numberInRange,positiveNumber,sameId,trackingModeOf,finiteSum} from './domain-values.js';

/** Exercise-level cardio analytics. Training load is NOT a fitness/performance score. */
export const CARDIO_EFFORT_COLORS={
  easy:'#70b995',moderate:'#e8cf80',hard:'#e9ad83',veryhard:'#e99b9b',unknown:'#b8bcc4',mixed:'#b8bcc4',aborted:'#d97777'
};
export function cardioEffortFromRpe(rpe){
  const n=numberInRange(rpe,1,10);
  if(n==null)return {key:'unknown',label:'Effort not recorded',color:CARDIO_EFFORT_COLORS.unknown,rpe:null};
  const key=n<=3?'easy':n<=6?'moderate':n<=8?'hard':'veryhard';
  return {key,label:{easy:'Easy',moderate:'Moderate',hard:'Hard',veryhard:'Very hard'}[key],color:CARDIO_EFFORT_COLORS[key],rpe:n};
}

/** One aggregation contract for exercise summaries, session cards, Progress and exports.
 * Each average uses only the duration of rows that actually record that metric.
 * Unknown distance/load stay null. An explicitly recorded zero distance stays zero.
 */
export function summarizeCardioSets(sets=[]){
  const complete=sets.filter(s=>s?.status==='COMPLETE');
  const timed=complete.map(set=>({set,seconds:positiveNumber(set.actualDurationSeconds)}));
  const totalDurationSeconds=finiteSum(timed.map(x=>x.seconds??0));
  const distances=complete.map(s=>numberInRange(s.distanceKm)).filter(v=>v!=null);
  const totalDistanceKm=distances.length?finiteSum(distances):null;
  const average=(field,min,max)=>{
    const rows=timed.map(x=>({...x,value:numberInRange(x.set[field],min,max)})).filter(x=>x.seconds!=null&&x.value!=null);
    const duration=finiteSum(rows.map(x=>x.seconds)),weighted=finiteSum(rows.map(x=>x.value*x.seconds));
    return {value:duration>0&&weighted!=null?weighted/duration:null,seconds:duration??0,count:rows.length};
  };
  const hr=average('averageHeartRateBpm',30,240),power=average('averagePowerWatts',1,2500),rpe=average('sessionRpe',1,10);
  const paced=timed.filter(x=>x.seconds!=null&&numberInRange(x.set.distanceKm)!=null);
  const paceDurationSeconds=finiteSum(paced.map(x=>x.seconds)),paceDistanceKm=finiteSum(paced.map(x=>Number(x.set.distanceKm)));
  const paceSecondsPerKm=paceDistanceKm>0&&paceDurationSeconds>0?paceDurationSeconds/paceDistanceKm:null;
  const load=rpe.value!=null?rpe.value*rpe.seconds/60:null;
  return {
    completedSets:complete.length,totalDurationSeconds,totalDistanceKm,
    averageHeartRateBpm:hr.value,averagePowerWatts:power.value,sessionRpe:rpe.value,
    cardioLoad:load!=null&&Number.isFinite(load)?load:null,paceSecondsPerKm,paceDurationSeconds,paceDistanceKm,
    durationRecordedCount:timed.filter(x=>x.seconds!=null).length,distanceRecordedCount:distances.length,
    rpeDurationSeconds:rpe.seconds,heartRateDurationSeconds:hr.seconds,powerDurationSeconds:power.seconds,
    coverage:{rpe:totalDurationSeconds>0?rpe.seconds/totalDurationSeconds:0,heartRate:totalDurationSeconds>0?hr.seconds/totalDurationSeconds:0,power:totalDurationSeconds>0?power.seconds/totalDurationSeconds:0,distance:totalDurationSeconds>0?paceDurationSeconds/totalDurationSeconds:0}
  };
}

export function summarizeSessionCardio(state,session){
  const ids=new Set((state.session_exercises||[]).filter(e=>sameId(e.sessionId,session?.id)&&trackingModeOf(e)==='CARDIO').map(e=>String(e.id)));
  const summary=summarizeCardioSets((state.performed_sets||[]).filter(s=>s.sessionExerciseId!=null&&ids.has(String(s.sessionExerciseId))));
  // Aliases retain the existing compact-card interface while all callers share one calculation.
  return {...summary,duration:summary.totalDurationSeconds,distance:summary.totalDistanceKm,meanHr:summary.averageHeartRateBpm,meanRpe:summary.sessionRpe};
}
/**
 * Workout-day effort display: never average lifting RIR and cardio RPE together.
 * A mixed session has a neutral timeline point and separate cardio/strength labels.
 */
export function workoutCardioEffort(state,session){
  const exercises=(state.session_exercises||[]).filter(e=>sameId(e.sessionId,session?.id));
  let cardioCount=0,strengthCount=0;const cardioSets=[];
  for(const e of exercises){
    const sets=(state.performed_sets||[]).filter(s=>sameId(s.sessionExerciseId,e.id)&&s.status==='COMPLETE');
    if(!sets.length)continue;
    if(trackingModeOf(e)==='CARDIO'){
      cardioCount++;
      cardioSets.push(...sets);
    } else strengthCount++;
  }
  const summary=summarizeCardioSets(cardioSets),effort=cardioEffortFromRpe(summary.sessionRpe);
  return {mode:cardioCount&&strengthCount?'mixed':cardioCount?'cardio':strengthCount?'strength':'empty',effort,cardioCount,strengthCount,coverage:summary.coverage};
}
export const cardioLoad=(minutes,rpe)=>{const m=positiveNumber(minutes),r=numberInRange(rpe,1,10),value=m!=null&&r!=null?m*r:null;return value!=null&&Number.isFinite(value)?value:null;};
function hasCompleteCoverage(row,field){return row.coverage?.[field]==null||row.coverage[field]>=1-1e-9;}
function paceValue(row){return Object.hasOwn(row,'paceSecondsPerKm')?positiveNumber(row.paceSecondsPerKm):positiveNumber(row.totalDistanceKm)&&positiveNumber(row.totalDurationSeconds)?Number(row.totalDurationSeconds)/Number(row.totalDistanceKm):null;}
export function preferredCardioMetric(rows){
  const valid=rows.filter(r=>r.completedSets>0);
  if(valid.filter(r=>numberInRange(r.averagePowerWatts,1,2500)!=null&&positiveNumber(r.totalDurationSeconds)&&hasCompleteCoverage(r,'power')).length>=2)return 'POWER';
  if(valid.filter(r=>paceValue(r)!=null&&hasCompleteCoverage(r,'distance')).length>=2)return 'PACE';
  return 'DURATION';
}
/**
 * Conservative like-for-like comparison, never a cross-modality synthetic score.
 * Same exercise is guaranteed by caller. Comparable effort = session RPE +/- 1.
 * Pace: comparable distance +/- 10%. Power: comparable duration +/- 15%.
 */
export function compareCardioAtMatchedEffort(rows,metric){
  if(!['PACE','POWER'].includes(metric))return null;
  const eligible=rows.filter(r=>Number(r.completedSets)>0&&numberInRange(r.sessionRpe,1,10)!=null&&hasCompleteCoverage(r,'rpe')&&
    (metric==='PACE'?paceValue(r)!=null&&hasCompleteCoverage(r,'distance'):numberInRange(r.averagePowerWatts,1,2500)!=null&&positiveNumber(r.totalDurationSeconds)&&hasCompleteCoverage(r,'power')))
    .map((row,index)=>({row,index,time:finiteNumber(row.sessionStartedAt)}))
    .sort((a,b)=>a.time!=null&&b.time!=null?a.time-b.time||a.index-b.index:a.index-b.index).map(x=>x.row);
  if(eligible.length<2)return null;
  const current=eligible.at(-1),anchor=metric==='PACE'?current.totalDistanceKm:current.totalDurationSeconds;
  const older=eligible.slice(0,-1).reverse().find(r=>{
    const comparison=metric==='PACE'?r.totalDistanceKm:r.totalDurationSeconds;
    return Math.abs(Number(current.sessionRpe)-Number(r.sessionRpe))<=1&&
      Number(anchor)>0&&Math.abs(Number(comparison)-Number(anchor))/Number(anchor)<=(metric==='PACE'?.10:.15);
  });
  if(!older)return null;
  const currentValue=metric==='PACE'?paceValue(current):Number(current.averagePowerWatts);
  const oldValue=metric==='PACE'?paceValue(older):Number(older.averagePowerWatts);
  // Pace improvement is the decrease in seconds/km, not an unlabelled increase in speed.
  const changePct=(metric==='PACE'?1-currentValue/oldValue:currentValue/oldValue-1)*100;
  return Number.isFinite(changePct)?{metric,current,older,currentValue,oldValue,changePct,comparisonVersion:'MATCHED_CARDIO_V2',changeBasis:metric==='PACE'?'PACE_DECREASE':'POWER_INCREASE'}:null;
}
