import {Equipment,gradingIncrement,snapSelectable,stepSelectable} from './exercise-library.js';

/** Optional next-session down-adjustment after an exercise reaches failure. Mirrors Android. */
export function evaluateFutureAdjustment(exercise,sets){
  const completed=(sets||[]).filter(x=>x.status==='COMPLETE');
  if(!completed.length)return null;
  const failures=completed.filter(x=>x.failure);
  if(!failures.length)return null;
  const averageDeficit=completed.reduce((a,x)=>a+Math.max(0,Number(x.targetReps||0)-Number(x.actualReps||0)),0)/completed.length;
  const firstSetFailure=failures.some(x=>Number(x.setNumber)===1);
  const severe=failures.length>=2||firstSetFailure||averageDeficit>=2;
  if(exercise.equipment===Equipment.BODYWEIGHT){
    const amount=severe&&failures.length>=2?2:1;
    return {kind:'REDUCE_REPS',suggestedReps:Math.max(1,Number(exercise.targetReps||1)-amount),failureCount:failures.length,severe,reason:failures.length>=2?'Several sets reached failure. Reduce the rep target slightly next time while keeping the bodyweight movement unchanged.':'This bodyweight exercise reached failure. Reduce the rep target slightly next time.'};
  }
  const used=completed.map(x=>x.actualWeightKg).filter(x=>x!=null).map(Number);
  const usedWeight=used.length?Math.min(...used):Number(exercise.plannedWeightKg||0),percent=severe ? 0.05 : 0.025,step=gradingIncrement(exercise.equipment||Equipment.OTHER);
  let reduced=Math.floor((usedWeight*(1-percent))/step)*step;
  if(reduced>=usedWeight-.0001&&usedWeight>0)reduced=stepSelectable(usedWeight,-1,exercise.equipment||Equipment.OTHER);
  reduced=snapSelectable(Math.max(step,reduced),exercise.equipment||Equipment.OTHER);
  return {kind:'REDUCE_WEIGHT',suggestedWeightKg:reduced,failureCount:failures.length,severe,reason:failures.length>=2?'Several sets reached failure. A small working-weight reduction next time may keep the exercise closer to the intended effort.':'This exercise reached failure. A small working-weight reduction next time may be more appropriate.'};
}
