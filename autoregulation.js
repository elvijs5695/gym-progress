// Conservative within-session autoregulation. Exact percentage reductions are
// practical heuristics; advice is optional. Bodyweight work is adjusted by reps.
import {Equipment,snapSelectable} from './exercise-library.js';

export function evaluateAutoregulation(justCompleted, allSets, appState, equipment=Equipment.OTHER) {
  const next = allSets.filter(s=>s.status==='PENDING'&&s.setNumber>justCompleted.setNumber).sort((a,b)=>a.setNumber-b.setNumber)[0];
  if(!next)return null;
  const actualReps=Number(justCompleted.actualReps); if(!Number.isFinite(actualReps))return null;
  const actualWeight=Number(justCompleted.actualWeightKg??justCompleted.plannedWeightKg??0);
  const inputMax=Math.max(3,Math.min(6,Number(appState.rirInputMax??3)));
  const targetMin=Math.max(0,Math.min(inputMax,Number(appState.targetRirMin??1)));
  const previous=allSets.filter(s=>s.status==='COMPLETE'&&s.setNumber<justCompleted.setNumber).sort((a,b)=>a.setNumber-b.setNumber);
  const prior=[...previous].reverse().find(s=>!s.failure&&s.rir!=null);
  const previousRir=prior?.rir==null?null:Number(prior.rir);
  const failuresSoFar=previous.filter(s=>s.failure).length+(justCompleted.failure?1:0);
  const repDeficit=Math.max(0,Number(justCompleted.targetReps??0)-actualReps);
  const firstSet=Number(justCompleted.setNumber)===1;
  const currentRir=justCompleted.rir==null?null:Number(justCompleted.rir);

  const repAdvice=(amount,reason)=>({title:'Performance red flag',reason,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg:actualWeight,suggestedReps:Math.max(1,Number(next.targetReps)-amount),kind:'REDUCE_REPS'});
  const weightAdvice=(percent,reason)=> equipment===Equipment.BODYWEIGHT
    ? repAdvice(percent>=7.5?2:1,reason)
    : ({title:'Performance red flag',reason,nextSetId:next.id,nextSetNumber:next.setNumber,suggestedWeightKg:Math.min(actualWeight,snapSelectable(actualWeight*(1-percent/100),equipment)),suggestedReps:Number(next.targetReps),kind:'REDUCE_WEIGHT'});

  if(justCompleted.failure&&firstSet)return weightAdvice(repDeficit>=3?7.5:5,repDeficit>=2?'Failure came on the first set and reps were well below target. Today’s target is probably too ambitious.':'Failure came on the first set, before normal set-to-set fatigue should dominate. Ease the next set slightly.');
  if(justCompleted.failure&&(failuresSoFar>=2||repDeficit>=2))return weightAdvice(5,'Failure is repeating or the rep target was missed by several reps. Ease the next set rather than repeatedly grinding.');
  if(justCompleted.failure)return repAdvice(1,'A later set reached failure near the rep target. Trim one rep from the next target to manage fatigue.');
  if(repDeficit>=2)return weightAdvice(5,'The set finished several reps below target. Ease the next set slightly and reassess.');
  if(currentRir!=null&&currentRir<targetMin){
    const below=targetMin-currentRir;
    if(firstSet)return below>=2?weightAdvice(5,'The first set was much closer to failure than your target RIR range. Ease the next set slightly.'):repAdvice(1,'The first set was closer to failure than your target RIR range. Trim one rep from the next target.');
    if(previousRir!=null&&previousRir-currentRir>=2)return repAdvice(1,'RIR dropped sharply compared with the previous set. Trim one rep from the next target.');
    const prev=previous.at(-1); if(prev&&!prev.failure&&prev.rir!=null&&Number(prev.rir)<targetMin)return weightAdvice(2.5,'Two sets in a row are harder than your target RIR range. Use a small adjustment for the next set.');
    if(currentRir===0&&targetMin>=2)return repAdvice(1,'This set reached 0 RIR while your target is farther from failure. Trim the next rep target and reassess.');
  }
  return null;
}
