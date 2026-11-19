/** Exercise-level cardio analytics. Training load is NOT a fitness/performance score. */
export const CARDIO_EFFORT_COLORS={
  easy:'#70b995',moderate:'#e8cf80',hard:'#e9ad83',veryhard:'#e99b9b',unknown:'#b8bcc4',mixed:'#b8bcc4',aborted:'#d97777'
};
export function cardioEffortFromRpe(rpe){
  if(!Number.isFinite(Number(rpe))||Number(rpe)<1||Number(rpe)>10)return {key:'unknown',label:'Effort not recorded',color:CARDIO_EFFORT_COLORS.unknown,rpe:null};
  const n=Number(rpe),key=n<=3?'easy':n<=6?'moderate':n<=8?'hard':'veryhard';
  return {key,label:{easy:'Easy',moderate:'Moderate',hard:'Hard',veryhard:'Very hard'}[key],color:CARDIO_EFFORT_COLORS[key],rpe:n};
}
/**
 * Workout-day effort display: never average lifting RIR and cardio RPE together.
 * A mixed session has a neutral timeline point and separate cardio/strength labels.
 */
export function workoutCardioEffort(state,session){
  const exercises=state.session_exercises.filter(e=>String(e.sessionId)===String(session.id));
  let cardioCount=0,strengthCount=0,weighted=0,seconds=0;
  for(const e of exercises){
    const sets=state.performed_sets.filter(s=>String(s.sessionExerciseId)===String(e.id)&&s.status==='COMPLETE');
    if(!sets.length)continue;
    if(e.trackingMode==='CARDIO'){
      cardioCount++;
      for(const s of sets){const rpe=Number(s.sessionRpe),duration=Number(s.actualDurationSeconds);if(rpe>=1&&rpe<=10&&duration>0){weighted+=rpe*duration;seconds+=duration;}}
    } else strengthCount++;
  }
  const effort=cardioEffortFromRpe(seconds>0?weighted/seconds:null);
  return {mode:cardioCount&&strengthCount?'mixed':cardioCount?'cardio':strengthCount?'strength':'empty',effort,cardioCount,strengthCount};
}
export const cardioLoad=(minutes,rpe)=>Number.isFinite(minutes)&&Number.isFinite(rpe)&&minutes>0&&rpe>=1&&rpe<=10?minutes*rpe:null;
export function preferredCardioMetric(rows){
  const valid=rows.filter(r=>r.completedSets>0);
  if(valid.filter(r=>Number(r.averagePowerWatts)>0).length>=2)return 'POWER';
  if(valid.filter(r=>Number(r.totalDistanceKm)>0&&Number(r.totalDurationSeconds)>0).length>=2)return 'PACE';
  return 'DURATION';
}
/**
 * Conservative like-for-like comparison, never a cross-modality synthetic score.
 * Same exercise is guaranteed by caller. Comparable effort = session RPE +/- 1.
 * Pace: comparable distance +/- 10%. Power: comparable duration +/- 15%.
 */
export function compareCardioAtMatchedEffort(rows,metric){
  if(!['PACE','POWER'].includes(metric))return null;
  const eligible=rows.filter(r=>Number(r.completedSets)>0&&Number(r.sessionRpe)>=1&&Number(r.sessionRpe)<=10&&
    (metric==='PACE'?Number(r.totalDistanceKm)>0&&Number(r.totalDurationSeconds)>0:Number(r.averagePowerWatts)>0&&Number(r.totalDurationSeconds)>0));
  if(eligible.length<2)return null;
  const current=eligible.at(-1),anchor=metric==='PACE'?current.totalDistanceKm:current.totalDurationSeconds;
  const older=eligible.slice(0,-1).reverse().find(r=>{
    const comparison=metric==='PACE'?r.totalDistanceKm:r.totalDurationSeconds;
    return Math.abs(Number(current.sessionRpe)-Number(r.sessionRpe))<=1&&
      Number(anchor)>0&&Math.abs(Number(comparison)-Number(anchor))/Number(anchor)<=(metric==='PACE'?.10:.15);
  });
  if(!older)return null;
  const currentValue=metric==='PACE'?current.totalDurationSeconds/current.totalDistanceKm:current.averagePowerWatts;
  const oldValue=metric==='PACE'?older.totalDurationSeconds/older.totalDistanceKm:older.averagePowerWatts;
  return {metric, current,older,currentValue,oldValue,changePct:((metric==='PACE'?oldValue/currentValue:currentValue/oldValue)-1)*100};
}
