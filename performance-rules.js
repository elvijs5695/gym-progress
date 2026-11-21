import {Equipment} from './exercise-library.js';
import {finiteNumber,numberInRange,repetitionCount,isRepExercise,assessmentEquipment,sameId} from './domain-values.js';

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
  for(const [key,value] of Object.entries(extra)){
    if(!Object.hasOwn(base,key))continue;
    out[key]=value&&typeof value==='object'&&!Array.isArray(value)?mergeRules(base[key]||{},value):value;
  }
  return out;
}

function validRules(rules){
  const shape=(expected,actual)=>Object.entries(expected).every(([key,value])=>value&&typeof value==='object'?actual?.[key]&&typeof actual[key]==='object'&&!Array.isArray(actual[key])&&shape(value,actual[key]):typeof actual?.[key]===typeof value&&(typeof value!=='number'||Number.isFinite(actual[key])));
  if(!shape(DEFAULT_RULES,rules)||rules.schema!==DEFAULT_RULES.schema||!Number.isInteger(rules.version)||rules.version<1)return false;
  if(rules.effort.failureEffectiveRir!==0||rules.capacity.loadedFormula!=='epley_with_rir')return false;
  const fractions=[rules.effort.exerciseFailure.minimumFailureRate,rules.effort.sessionFailure.minimumFailureRate,rules.effort.sessionFailure.multiExerciseFailureRate,rules.capacity.targetToleranceRatio,rules.capacity.progressionToleranceRatio,rules.capacity.minimumActualRepsRatio,rules.autoregulation.strongDeficitRatio,rules.autoregulation.severeDeficitRatio,rules.futureAdjustment.strongDeficitRatio,rules.futureAdjustment.severeDeficitRatio];
  if(fractions.some(v=>v<0||v>1))return false;
  if([rules.effort.exerciseFailure.minimumFailures,rules.effort.sessionFailure.minimumFailures,rules.effort.sessionFailure.multiExerciseMinimum,...Object.values(rules.autoregulation.bodyweightReductionReps),...Object.values(rules.futureAdjustment.bodyweightReductionReps)].some(v=>!Number.isInteger(v)||v<1))return false;
  return [...Object.values(rules.autoregulation.loadedReductionPercent),...Object.values(rules.futureAdjustment.loadedReductionPercent)].every(v=>v>0&&v<100);
}

export async function loadPerformanceRules(){
  try{
    const response=await fetch('./performance-rules.json',{cache:'no-cache'});
    if(!response.ok)throw new Error(`Rules HTTP ${response.status}`);
    const loaded=await response.json();
    if(loaded?.schema!=='gym-progress-performance-rules-v1')throw new Error('Unsupported performance rules schema');
    const merged=mergeRules(clone(DEFAULT_RULES),loaded);
    if(!validRules(merged))throw new Error('Invalid performance rule values');
    PERFORMANCE_RULES=merged;
  }catch(error){
    console.warn('Using bundled performance-rule defaults',error);
    PERFORMANCE_RULES=clone(DEFAULT_RULES);
  }
  return PERFORMANCE_RULES;
}

export const ANALYSIS_VERSION='GYM_PROGRESS_DOMAIN_V2';
const SETTINGS_KEYS=['targetRirMin','targetRirMax','progressionRirThreshold','lastSetZeroRirAcceptable','rirInputMax','difficultyComfortableMinRir','difficultyChallengingMinRir','difficultyHardMinRir'];
export function captureAnalysisContext(appState={}, {capturedAt=null,origin='SESSION_START'}={}){
  return {version:ANALYSIS_VERSION,rulesVersion:PERFORMANCE_RULES.version,capturedAt,origin,settings:Object.fromEntries(SETTINGS_KEYS.filter(key=>Object.hasOwn(appState,key)).map(key=>[key,appState[key]])),performanceRules:clone(PERFORMANCE_RULES)};
}
export function analysisContextFor(state,exerciseOrSession){return exerciseOrSession?.analysisContext||(state.workout_sessions||[]).find(s=>sameId(s.id,exerciseOrSession?.sessionId))?.analysisContext||null;}
export function performanceSettingsFor(state,exerciseOrSession){return analysisContextFor(state,exerciseOrSession)?.settings||state.app_state||{};}
export function performanceRulesFor(state,exerciseOrSession){const rules=analysisContextFor(state,exerciseOrSession)?.performanceRules;return rules&&validRules(rules)?rules:PERFORMANCE_RULES;}

export function effectiveRir(set,rules=PERFORMANCE_RULES){
  if(set?.status&&set.status!=='COMPLETE')return null;
  if(set?.failure===true)return Number(rules.effort.failureEffectiveRir??0);
  return numberInRange(set?.rir);
}

export function estimatedCapacity(equipment,weightKg,reps,rir){
  const cleanReps=repetitionCount(reps),reserve=numberInRange(rir),weight=numberInRange(weightKg);
  if(cleanReps==null||reserve==null)return null;
  if(cleanReps===0)return 0;
  if(equipment===Equipment.BODYWEIGHT)return cleanReps+reserve;
  if(weight==null)return null;
  const value=weight*(1+(cleanReps+reserve)/30);return Number.isFinite(value)?value:null;
}

export function capacityRatio(exercise,set,targetRir,{basis='ORIGINAL_EXERCISE',rules=PERFORMANCE_RULES}={}){
  return assessSet(exercise,set,{}, {targetRir,basis,rules,allowLastSetException:false}).capacityRatio;
}

export function acceptableLastSetZeroRir(exercise,set,appState,rules=PERFORMANCE_RULES){
  if(appState?.lastSetZeroRirAcceptable!==true||set?.status!=='COMPLETE'||!isRepExercise(exercise))return false;
  const policy=rules.lastSetZeroRir||{};
  if(policy.requiresMultipleSets!==false&&Number(exercise?.targetSets)<=1)return false;
  if(Number(set?.setNumber)!==Number(exercise?.targetSets))return false;
  const required=repetitionCount(policy.requiresOriginalTargetReps!==false?exercise?.targetReps:set?.targetReps),actual=repetitionCount(set?.actualReps);
  if(!(required>0)||actual==null||actual<required)return false;
  if(assessmentEquipment(exercise)!==Equipment.BODYWEIGHT){
    const planned=numberInRange(exercise?.plannedWeightKg),weight=numberInRange(set?.actualWeightKg);
    if(planned==null||weight==null||weight+1e-9<planned)return false;
  }
  const rir=effectiveRir(set,rules),atZero=rir!=null&&Math.abs(rir)<1e-9;
  if(!atZero)return false;
  return !set?.failure||policy.acceptsFailedNextRep!==false;
}

export function assessSet(exercise,set,appState,{targetRir=Number(appState?.targetRirMin??1),basis='ORIGINAL_EXERCISE',allowLastSetException=true,rules=PERFORMANCE_RULES,toleranceRatio=Number(rules.capacity.targetToleranceRatio??.98)}={}){
  const eligible=isRepExercise(exercise)&&set?.status==='COMPLETE',actualReps=eligible?repetitionCount(set?.actualReps):null,rir=eligible?effectiveRir(set,rules):null,useSet=basis==='CURRENT_SET',equipment=assessmentEquipment(exercise);
  const targetReps=repetitionCount(useSet?set?.targetReps:exercise?.targetReps);
  const targetWeight=equipment===Equipment.BODYWEIGHT?0:numberInRange(useSet?set?.plannedWeightKg:exercise?.plannedWeightKg);
  // A prescription is not an observed result. Missing actual load cannot borrow the plan.
  const actualWeight=equipment===Equipment.BODYWEIGHT?0:numberInRange(set?.actualWeightKg);
  const minimumReps=targetReps==null?null:targetReps*Number(rules.capacity.minimumActualRepsRatio??1);
  const minimumRepsMet=targetReps>0&&actualReps!=null&&actualReps+1e-9>=minimumReps;
  const targetCapacity=targetReps>0&&actualReps!=null&&rir!=null?estimatedCapacity(equipment,targetWeight,targetReps,targetRir):null;
  const actualCapacity=actualReps!=null&&rir!=null?estimatedCapacity(equipment,actualWeight,actualReps,rir):null;
  const ratio=targetCapacity>0&&actualCapacity!=null?actualCapacity/targetCapacity:null;
  const capacityMet=ratio!=null&&ratio+1e-9>=toleranceRatio;
  const lastSetException=allowLastSetException&&basis==='ORIGINAL_EXERCISE'&&acceptableLastSetZeroRir(exercise,set,appState,rules);
  const targetMet=(minimumRepsMet&&capacityMet)||lastSetException;
  return {effectiveRir:rir,actualCapacity,targetCapacity,capacityRatio:ratio,minimumRepsMet,capacityMet,lastSetException,targetMet,actionableFailure:eligible&&set?.failure===true&&ratio!=null&&!targetMet,deficitRatio:ratio==null?null:Math.max(0,1-ratio)};
}

export function targetCapacityMet(exercise,set,appState){return assessSet(exercise,set,appState).targetMet;}
export function setIsUnderTarget(exercise,set,appState){return !assessSet(exercise,set,appState).targetMet;}
export function actionableFailure(exercise,set,appState,rules=PERFORMANCE_RULES){return assessSet(exercise,set,appState,{rules}).actionableFailure;}

export function progressionSetQualifies(exercise,set,appState,rules=PERFORMANCE_RULES){
  const capacity=rules.capacity||{};
  if(!isRepExercise(exercise)||set?.status!=='COMPLETE'||repetitionCount(set?.actualReps)==null||effectiveRir(set,rules)==null)return false;
  if(capacity.progressionRequiresOriginalRepTarget!==false&&Number(set.targetReps)<Number(exercise?.targetReps))return false;
  if(Number(set.actualReps)+1e-9<Number(exercise?.targetReps||0)*Number(capacity.minimumActualRepsRatio??1))return false;
  if(capacity.progressionRequiresOriginalLoad!==false&&assessmentEquipment(exercise)!==Equipment.BODYWEIGHT&&(numberInRange(set.actualWeightKg)==null||Number(set.actualWeightKg)+.0001<Number(exercise?.plannedWeightKg||0)))return false;
  if(capacity.failureBlocksProgression===true&&set?.failure)return false;
  const result=assessSet(exercise,set,appState,{targetRir:Number(appState?.progressionRirThreshold??2),basis:'ORIGINAL_EXERCISE',allowLastSetException:false,rules,toleranceRatio:Number(capacity.progressionToleranceRatio??.995)});
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
