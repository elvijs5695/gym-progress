import {Equipment} from './exercise-library.js';

const DEFAULT_RULES={
  schema:'gym-progress-performance-rules-v1',version:1,
  effort:{failureEffectiveRir:0,exerciseFailure:{singleSetActionableFailure:true,minimumFailures:2,minimumFailureRate:.5},sessionFailure:{minimumFailures:2,minimumFailureRate:.25,multiExerciseMinimum:2,multiExerciseFailureRate:.15}},
  capacity:{loadedFormula:'epley_with_rir',targetToleranceRatio:.98,progressionToleranceRatio:.995,minimumActualRepsRatio:1,progressionRequiresOriginalLoad:true,progressionRequiresOriginalRepTarget:true,failureBlocksProgression:true},
  lastSetZeroRir:{requiresMultipleSets:true,requiresOriginalTargetReps:true,acceptsFailedNextRep:true,suppressesDowngradeOnly:true},
  autoregulation:{strongDeficitRatio:.05,severeDeficitRatio:.10,loadedReductionPercent:{mild:2.5,strong:5,severe:7.5},bodyweightReductionReps:{mild:1,strong:1,severe:2}},
  futureAdjustment:{actionableFailureOnly:true,strongDeficitRatio:.05,severeDeficitRatio:.10,loadedReductionPercent:{mild:2.5,strong:5},bodyweightReductionReps:{mild:1,strong:2}},
  chart:{failureOverridePrimaryMetricOnly:true,loadedPrimaryMetric:'WEIGHT',bodyweightPrimaryMetric:'REPS',failureOverrideUsesActionableFailures:true}
};

const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
export let PERFORMANCE_RULES=clone(DEFAULT_RULES);

function mergeRules(base,extra){
  if(!extra||typeof extra!=='object'||Array.isArray(extra))return base;
  const out={...base};
  for(const [key,value] of Object.entries(extra))out[key]=value&&typeof value==='object'&&!Array.isArray(value)?mergeRules(base?.[key]||{},value):value;
  return out;
}

export async function loadPerformanceRules(){
  try{
    const response=await fetch('./performance-rules.json',{cache:'no-cache'});
    if(!response.ok)throw new Error(`Rules HTTP ${response.status}`);
    const loaded=await response.json();
    if(loaded?.schema!=='gym-progress-performance-rules-v1')throw new Error('Unsupported performance rules schema');
    PERFORMANCE_RULES=mergeRules(clone(DEFAULT_RULES),loaded);
  }catch(error){
    console.warn('Using bundled performance-rule defaults',error);
    PERFORMANCE_RULES=clone(DEFAULT_RULES);
  }
  return PERFORMANCE_RULES;
}

export function effectiveRir(set){
  if(set?.status&&set.status!=='COMPLETE')return null;
  if(set?.failure)return Number(PERFORMANCE_RULES.effort.failureEffectiveRir??0);
  return set?.rir==null?null:Number(set.rir);
}

export function estimatedCapacity(equipment,weightKg,reps,rir){
  const cleanReps=Math.max(0,Number(reps)||0),reserve=Math.max(0,Number(rir)||0);
  if(equipment===Equipment.BODYWEIGHT)return cleanReps+reserve;
  return Math.max(0,Number(weightKg)||0)*(1+(cleanReps+reserve)/30);
}

export function capacityRatio(exercise,set,targetRir,{basis='ORIGINAL_EXERCISE'}={}){
  const reps=set?.actualReps==null?null:Number(set.actualReps),rir=effectiveRir(set);
  if(reps==null||rir==null)return null;
  const useSet=basis==='CURRENT_SET';
  const targetReps=Number(useSet?set?.targetReps:exercise?.targetReps)||0;
  const targetWeight=Number(useSet?set?.plannedWeightKg:exercise?.plannedWeightKg)||0;
  const target=estimatedCapacity(exercise?.equipment,targetWeight,targetReps,Number(targetRir)||0);
  if(!(target>0))return null;
  const actual=estimatedCapacity(exercise?.equipment,Number(set?.actualWeightKg??set?.plannedWeightKg)||0,reps,rir);
  return actual/target;
}

export function acceptableLastSetZeroRir(exercise,set,appState){
  if(appState?.lastSetZeroRirAcceptable!==true||set?.status!=='COMPLETE')return false;
  const policy=PERFORMANCE_RULES.lastSetZeroRir||{};
  if(policy.requiresMultipleSets!==false&&Number(exercise?.targetSets)<=1)return false;
  if(Number(set?.setNumber)!==Number(exercise?.targetSets))return false;
  const required=Number(policy.requiresOriginalTargetReps!==false?exercise?.targetReps:set?.targetReps)||0;
  if(Number(set?.actualReps||0)<required)return false;
  const atZero=Math.abs(Number(effectiveRir(set)))<1e-9;
  if(!atZero)return false;
  return !set?.failure||policy.acceptsFailedNextRep!==false;
}

export function assessSet(exercise,set,appState,{targetRir=Number(appState?.targetRirMin??1),basis='ORIGINAL_EXERCISE',allowLastSetException=true,toleranceRatio=Number(PERFORMANCE_RULES.capacity.targetToleranceRatio??.98)}={}){
  const actualReps=set?.actualReps==null?null:Number(set.actualReps),rir=effectiveRir(set),useSet=basis==='CURRENT_SET';
  const targetReps=Number(useSet?set?.targetReps:exercise?.targetReps)||0;
  const targetWeight=Number(useSet?set?.plannedWeightKg:exercise?.plannedWeightKg)||0;
  const actualWeight=Number(set?.actualWeightKg??set?.plannedWeightKg)||0;
  const minimumReps=targetReps*Number(PERFORMANCE_RULES.capacity.minimumActualRepsRatio??1);
  const minimumRepsMet=actualReps!=null&&actualReps+1e-9>=minimumReps;
  const targetCapacity=actualReps!=null&&rir!=null?estimatedCapacity(exercise?.equipment,targetWeight,targetReps,targetRir):null;
  const actualCapacity=actualReps!=null&&rir!=null?estimatedCapacity(exercise?.equipment,actualWeight,actualReps,rir):null;
  const ratio=targetCapacity>0&&actualCapacity!=null?actualCapacity/targetCapacity:null;
  const capacityMet=ratio!=null&&ratio+1e-9>=toleranceRatio;
  const lastSetException=allowLastSetException&&basis==='ORIGINAL_EXERCISE'&&acceptableLastSetZeroRir(exercise,set,appState);
  const targetMet=(minimumRepsMet&&capacityMet)||lastSetException;
  return {effectiveRir:rir,actualCapacity,targetCapacity,capacityRatio:ratio,minimumRepsMet,capacityMet,lastSetException,targetMet,actionableFailure:!!set?.failure&&!targetMet,deficitRatio:Math.max(0,1-(ratio??0))};
}

export function targetCapacityMet(exercise,set,appState){return assessSet(exercise,set,appState).targetMet;}
export function setIsUnderTarget(exercise,set,appState){return !assessSet(exercise,set,appState).targetMet;}
export function actionableFailure(exercise,set,appState){return assessSet(exercise,set,appState).actionableFailure;}

export function progressionSetQualifies(exercise,set,appState){
  const capacity=PERFORMANCE_RULES.capacity||{};
  if(set?.status!=='COMPLETE'||set?.actualReps==null||effectiveRir(set)==null)return false;
  if(capacity.progressionRequiresOriginalRepTarget!==false&&Number(set.targetReps)<Number(exercise?.targetReps))return false;
  if(Number(set.actualReps)+1e-9<Number(exercise?.targetReps||0)*Number(capacity.minimumActualRepsRatio??1))return false;
  if(capacity.progressionRequiresOriginalLoad!==false&&exercise?.equipment!==Equipment.BODYWEIGHT&&Number(set.actualWeightKg||0)+.0001<Number(exercise?.plannedWeightKg||0))return false;
  if(capacity.failureBlocksProgression===true&&set?.failure)return false;
  const result=assessSet(exercise,set,appState,{targetRir:Number(appState?.progressionRirThreshold??2),basis:'ORIGINAL_EXERCISE',allowLastSetException:false,toleranceRatio:Number(capacity.progressionToleranceRatio??.995)});
  return result.minimumRepsMet&&result.capacityMet;
}

export function exerciseIsFailure(actionableFailures,completedSets){
  const failures=Math.max(0,Number(actionableFailures)||0),count=Math.max(0,Number(completedSets)||0),rule=PERFORMANCE_RULES.effort.exerciseFailure;
  if(!count||!failures)return false;
  if(count===1&&rule.singleSetActionableFailure!==false)return true;
  return failures>=Number(rule.minimumFailures||2)&&failures/count>=Number(rule.minimumFailureRate||.5);
}

export function sessionIsFailure(actionableFailures,completedSets,failedExercises){
  const failures=Math.max(0,Number(actionableFailures)||0),count=Math.max(0,Number(completedSets)||0),failed=Math.max(0,Number(failedExercises)||0),rule=PERFORMANCE_RULES.effort.sessionFailure;
  if(!count||!failures)return false;
  const rate=failures/count;
  return failures>=Number(rule.minimumFailures||2)&&(rate>=Number(rule.minimumFailureRate||.25)||(failed>=Number(rule.multiExerciseMinimum||2)&&rate>=Number(rule.multiExerciseFailureRate||.15)));
}
