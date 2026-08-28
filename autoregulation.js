import {Equipment} from './exercise-library.js';
import {PERFORMANCE_RULES,assessSet} from './performance-rules.js';
const q25=n=>Math.round(Number(n||0)*4)/4;

/** Optional within-session adjustment relative to the target currently shown for the set. */
export function evaluateAutoregulation(justCompleted,allSets,appState,exercise){
  const next=(allSets||[]).filter(s=>s.status==='PENDING'&&Number(s.setNumber)>Number(justCompleted.setNumber)).sort((a,b)=>a.setNumber-b.setNumber)[0];
  if(!next||justCompleted?.actualReps==null)return null;
  const assessment=set=>assessSet(exercise,set,appState,{targetRir:Number(appState?.targetRirMin??1),basis:'CURRENT_SET',allowLastSetException:false});
  const current=assessment(justCompleted);if(current.targetMet||current.capacityRatio==null)return null;
  const completed=(allSets||[]).filter(s=>s.status==='COMPLETE'&&Number(s.setNumber)<=Number(justCompleted.setNumber));
  const failures=completed.filter(s=>assessment(s).actionableFailure).length;
  const previous=completed.filter(s=>s.id!==justCompleted.id).sort((a,b)=>a.setNumber-b.setNumber).at(-1);
  const previousUnder=previous?!assessment(previous).targetMet:false;
  const rules=PERFORMANCE_RULES.autoregulation,firstSet=Number(justCompleted.setNumber)===1,bodyweight=exercise?.equipment===Equipment.BODYWEIGHT;
  let severity='mild';
  if((current.deficitRatio>=Number(rules.severeDeficitRatio??.10)&&(firstSet||bodyweight))||(bodyweight&&failures>=2))severity='severe';
  else if(current.deficitRatio>=Number(rules.strongDeficitRatio??.05)||(firstSet&&current.actionableFailure)||failures>=2||previousUnder)severity='strong';
  const actualWeight=Number(justCompleted.actualWeightKg??justCompleted.plannedWeightKg??0);
  const baseReason=current.actionableFailure?'The set reached failure below the current load, rep and RIR target.':Number(justCompleted.rir)===0?'The set reached 0 RIR below the current load, rep and RIR target.':'The set finished below the current load, rep and RIR target.';
  if(bodyweight){
    const amount=Number(rules.bodyweightReductionReps?.[severity]??1);
    return {title:'Performance adjustment',reason:`${baseReason} Reducing the next rep target is optional.`,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg:actualWeight,suggestedReps:Math.max(1,Number(next.targetReps)-amount),kind:'REDUCE_REPS'};
  }
  const percent=Number(rules.loadedReductionPercent?.[severity]??2.5);
  return {title:'Performance adjustment',reason:`${baseReason} Keep the rep target and reduce the next load if needed.`,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg:Math.max(.25,Math.min(actualWeight,q25(actualWeight*(1-percent/100)))),suggestedReps:Number(next.targetReps),kind:'REDUCE_WEIGHT'};
}
