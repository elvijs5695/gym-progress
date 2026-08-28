import {Equipment,gradingIncrement,snapSelectable,stepSelectable} from './exercise-library.js';
import {PERFORMANCE_RULES,assessSet} from './performance-rules.js';

/** Optional next-session reduction after actionable failure below the original target. */
export function evaluateFutureAdjustment(exercise,sets,appState){
  const completed=(sets||[]).filter(x=>x.status==='COMPLETE');if(!completed.length)return null;
  const assessed=completed.map(set=>({set,result:assessSet(exercise,set,appState,{targetRir:Number(appState?.targetRirMin??1),basis:'ORIGINAL_EXERCISE',allowLastSetException:true})}));
  const actionable=assessed.filter(x=>x.result.actionableFailure);if(!actionable.length)return null;
  const rules=PERFORMANCE_RULES.futureAdjustment,averageDeficit=actionable.reduce((a,x)=>a+x.result.deficitRatio,0)/actionable.length,first=actionable.some(x=>Number(x.set.setNumber)===1);
  const severe=actionable.length>=2||averageDeficit>=Number(rules.severeDeficitRatio??.10),strong=severe||first||averageDeficit>=Number(rules.strongDeficitRatio??.05);
  const baseReason=actionable.length>=2?'Several sets failed below the programmed target.':'A set failed below the programmed target.';
  if(exercise.equipment===Equipment.BODYWEIGHT){
    const amount=Number(rules.bodyweightReductionReps?.[strong?'strong':'mild']??1);
    return {kind:'REDUCE_REPS',suggestedReps:Math.max(1,Number(exercise.targetReps||1)-amount),failureCount:actionable.length,severe,reason:`${baseReason} A small rep-target reduction next time is optional.`};
  }
  const used=completed.map(x=>x.actualWeightKg).filter(x=>x!=null).map(Number),minimumUsed=used.length?Math.min(...used):Number(exercise.plannedWeightKg||0),baseWeight=Math.min(Number(exercise.plannedWeightKg||0),minimumUsed),percent=Number(rules.loadedReductionPercent?.[strong?'strong':'mild']??2.5),step=gradingIncrement(exercise.equipment||Equipment.OTHER);
  let reduced=Math.floor((baseWeight*(1-percent/100))/step)*step;if(reduced>=baseWeight-.0001&&baseWeight>0)reduced=stepSelectable(baseWeight,-1,exercise.equipment||Equipment.OTHER);reduced=snapSelectable(Math.max(step,reduced),exercise.equipment||Equipment.OTHER);
  return {kind:'REDUCE_WEIGHT',suggestedWeightKg:reduced,failureCount:actionable.length,severe,reason:`${baseReason} A small working-weight reduction next time is optional.`};
}
