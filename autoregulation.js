import {Equipment,reducedSelectableWeight} from './exercise-library.js';
import {PERFORMANCE_RULES,assessSet} from './performance-rules.js';
import {isRepExercise,assessmentEquipment,numberInRange,repetitionCount} from './domain-values.js';

/** Optional within-session adjustment relative to the target currently shown for the set. */
export function evaluateAutoregulation(justCompleted,allSets,appState,exercise,performanceRules=PERFORMANCE_RULES){
  if(!isRepExercise(exercise)||justCompleted?.status!=='COMPLETE')return null;
  const next=(allSets||[]).filter(s=>s.status==='PENDING'&&Number(s.setNumber)>Number(justCompleted.setNumber)).sort((a,b)=>a.setNumber-b.setNumber)[0];
  if(!next||justCompleted?.actualReps==null)return null;
  const assessment=set=>assessSet(exercise,set,appState,{targetRir:Number(appState?.targetRirMin??1),basis:'CURRENT_SET',allowLastSetException:false,rules:performanceRules});
  const current=assessment(justCompleted);if(current.targetMet||current.capacityRatio==null)return null;
  const completed=(allSets||[]).filter(s=>s.status==='COMPLETE'&&Number(s.setNumber)<=Number(justCompleted.setNumber));
  const failures=completed.filter(s=>assessment(s).actionableFailure).length;
  const previous=completed.filter(s=>s.id!==justCompleted.id).sort((a,b)=>a.setNumber-b.setNumber).at(-1);
  const previousUnder=previous?!assessment(previous).targetMet:false;
  const rules=performanceRules.autoregulation,firstSet=Number(justCompleted.setNumber)===1,bodyweight=assessmentEquipment(exercise)===Equipment.BODYWEIGHT;
  let severity='mild';
  if((current.deficitRatio>=Number(rules.severeDeficitRatio??.10)&&(firstSet||bodyweight))||(bodyweight&&failures>=2))severity='severe';
  else if(current.deficitRatio>=Number(rules.strongDeficitRatio??.05)||(firstSet&&current.actionableFailure)||failures>=2||previousUnder)severity='strong';
  const actualWeight=bodyweight?0:numberInRange(justCompleted.actualWeightKg);
  const baseReason=current.actionableFailure?'The set reached failure below the current load, rep and RIR target.':Number(justCompleted.rir)===0?'The set reached 0 RIR below the current load, rep and RIR target.':'The set finished below the current load, rep and RIR target.';
  if(bodyweight){
    const amount=Number(rules.bodyweightReductionReps?.[severity]??1);
    const target=repetitionCount(next.targetReps),suggestedReps=target==null?null:Math.max(1,target-amount);
    if(suggestedReps==null||suggestedReps>=target)return null;
    return {title:'Performance adjustment',reason:`${baseReason} Reducing the next rep target is optional.`,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg:actualWeight,suggestedReps,baseReps:target,kind:'REDUCE_REPS'};
  }
  const percent=Number(rules.loadedReductionPercent?.[severity]??2.5);
  const nextWeight=numberInRange(next.plannedWeightKg),baseWeight=actualWeight!=null&&nextWeight!=null?Math.min(actualWeight,nextWeight):null;
  const suggestedWeightKg=reducedSelectableWeight(baseWeight,assessmentEquipment(exercise),percent),suggestedReps=repetitionCount(next.targetReps);
  if(suggestedWeightKg==null||!(suggestedReps>0))return null;
  return {title:'Performance adjustment',reason:`${baseReason} Keep the rep target and reduce the next load if needed.`,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg,suggestedReps,baseWeightKg:baseWeight,kind:'REDUCE_WEIGHT'};
}
