import {Equipment,reducedSelectableWeight} from './exercise-library.js';
import {PERFORMANCE_RULES,assessSet} from './performance-rules.js';
import {isRepExercise,assessmentEquipment,numberInRange,repetitionCount} from './domain-values.js';

/** Optional next-session reduction after actionable failure below the original target. */
export function evaluateFutureAdjustment(exercise,sets,appState,performanceRules=PERFORMANCE_RULES){
  if(!isRepExercise(exercise))return null;
  const completed=(sets||[]).filter(x=>x.status==='COMPLETE');if(!completed.length)return null;
  const assessed=completed.map(set=>({set,result:assessSet(exercise,set,appState,{targetRir:Number(appState?.targetRirMin??1),basis:'ORIGINAL_EXERCISE',allowLastSetException:true,rules:performanceRules})}));
  const actionable=assessed.filter(x=>x.result.actionableFailure);if(!actionable.length)return null;
  const rules=performanceRules.futureAdjustment,averageDeficit=actionable.reduce((a,x)=>a+x.result.deficitRatio,0)/actionable.length,first=actionable.some(x=>Number(x.set.setNumber)===1);
  const severe=actionable.length>=2||averageDeficit>=Number(rules.severeDeficitRatio??.10),strong=severe||first||averageDeficit>=Number(rules.strongDeficitRatio??.05);
  const baseReason=actionable.length>=2?'Several sets failed below the programmed target.':'A set failed below the programmed target.';
  if(assessmentEquipment(exercise)===Equipment.BODYWEIGHT){
    const amount=Number(rules.bodyweightReductionReps?.[strong?'strong':'mild']??1);
    const base=repetitionCount(exercise.targetReps),suggestedReps=base==null?null:Math.max(1,base-amount);
    if(suggestedReps==null||suggestedReps>=base)return null;
    return {kind:'REDUCE_REPS',suggestedReps,baseReps:base,failureCount:actionable.length,severe,reason:`${baseReason} A small rep-target reduction next time is optional.`};
  }
  const planned=numberInRange(exercise.plannedWeightKg),used=completed.map(x=>numberInRange(x.actualWeightKg)).filter(x=>x!=null);
  if(planned==null||!used.length)return null;
  const baseWeight=Math.min(planned,...used),percent=Number(rules.loadedReductionPercent?.[strong?'strong':'mild']??2.5),reduced=reducedSelectableWeight(baseWeight,assessmentEquipment(exercise),percent);
  if(reduced==null)return null;
  return {kind:'REDUCE_WEIGHT',suggestedWeightKg:reduced,baseWeightKg:baseWeight,failureCount:actionable.length,severe,reason:`${baseReason} A small working-weight reduction next time is optional.`};
}
