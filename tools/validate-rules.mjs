import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  PERFORMANCE_RULES,
  effectiveRir,
  assessSet,
  progressionSetQualifies,
  sessionIsFailure
} from '../performance-rules.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const spec=JSON.parse(fs.readFileSync(path.join(root,'performance-rule-cases.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'performance-rules.json'),'utf8'));
const errors=[];
const near=(a,b,tol=1e-9)=>Math.abs(Number(a)-Number(b))<=tol;
const state=(extra={})=>({
  targetRirMin:1,
  targetRirMax:2,
  progressionRirThreshold:2,
  lastSetZeroRirAcceptable:false,
  ...extra
});
const makeExercise=input=>({
  equipment:input.equipment||'BARBELL',
  plannedWeightKg:Number(input.targetWeightKg||0),
  targetReps:Number(input.targetReps||0),
  targetSets:Number(input.targetSets||1)
});
const makeSet=input=>({
  id:1,
  status:'COMPLETE',
  setNumber:Number(input.setNumber||1),
  targetReps:Number(input.targetReps||0),
  plannedWeightKg:Number(input.targetWeightKg||0),
  actualWeightKg:Number(input.actualWeightKg??input.targetWeightKg??0),
  actualReps:Number(input.actualReps??0),
  rir:input.actualRir==null?null:Number(input.actualRir),
  failure:input.failure===true
});

if(config.schema!==spec.schema.replace('-cases','-rules')){
  // Explicit schema names intentionally differ, but must share the same v1 family.
  if(!(config.schema==='gym-progress-performance-rules-v1'&&spec.schema==='gym-progress-performance-rule-cases-v1'))errors.push('Rules/cases schema family mismatch');
}
if(Number(config.version)!==Number(spec.rulesVersion))errors.push('Rules version does not match rule cases');
if(Number(PERFORMANCE_RULES.effort.failureEffectiveRir)!==Number(config.effort.failureEffectiveRir))errors.push('Bundled JS defaults differ from performance-rules.json');

for(const c of spec.cases){
  const i=c.input||{},e=c.expected||{};
  try{
    if(c.id==='failure-is-zero-rir'){
      const value=effectiveRir({status:'COMPLETE',failure:true,rir:null});
      if(!near(value,e.effectiveRir))errors.push(`${c.id}: expected effectiveRir ${e.effectiveRir}, got ${value}`);
      continue;
    }
    if(['extra-reps-offset-low-rir','failed-extra-rep-can-still-meet-target','one-extra-rep-does-not-equal-two-rir','higher-load-offsets-low-rir','weight-does-not-replace-missing-target-reps'].includes(c.id)){
      const exercise=makeExercise(i),set=makeSet(i),appState=state({progressionRirThreshold:Number(i.targetRir||2)});
      const result=assessSet(exercise,set,appState,{targetRir:Number(i.targetRir||2),basis:'ORIGINAL_EXERCISE',allowLastSetException:true});
      const progresses=progressionSetQualifies(exercise,set,appState);
      if('targetCapacityMet'in e&&result.targetMet!==e.targetCapacityMet)errors.push(`${c.id}: targetCapacityMet expected ${e.targetCapacityMet}, got ${result.targetMet}`);
      if('actionableFailure'in e&&result.actionableFailure!==e.actionableFailure)errors.push(`${c.id}: actionableFailure expected ${e.actionableFailure}, got ${result.actionableFailure}`);
      if('progressionMayQualify'in e&&progresses!==e.progressionMayQualify)errors.push(`${c.id}: progressionMayQualify expected ${e.progressionMayQualify}, got ${progresses}`);
      continue;
    }
    if(c.id==='last-set-zero-rir-exception'){
      const exercise=makeExercise({...i,equipment:'BARBELL',targetWeightKg:80}),set=makeSet({...i,equipment:'BARBELL',targetWeightKg:80,actualWeightKg:80,actualRir:null}),appState=state({lastSetZeroRirAcceptable:true,progressionRirThreshold:Number(i.targetRir||2)});
      const result=assessSet(exercise,set,appState,{targetRir:Number(i.targetRir||2),basis:'ORIGINAL_EXERCISE',allowLastSetException:true});
      const progresses=progressionSetQualifies(exercise,set,appState);
      if(result.lastSetException!==e.downgradeSuppressed)errors.push(`${c.id}: downgradeSuppressed expected ${e.downgradeSuppressed}, got ${result.lastSetException}`);
      if(progresses!==e.progressionMayQualify)errors.push(`${c.id}: progressionMayQualify expected ${e.progressionMayQualify}, got ${progresses}`);
      continue;
    }
    if(c.id==='single-failure-does-not-fail-workout'||c.id==='systemic-failure'){
      const value=sessionIsFailure(i.actionableFailures,i.completedSets,i.failedExercises);
      if(value!==e.sessionFailure)errors.push(`${c.id}: sessionFailure expected ${e.sessionFailure}, got ${value}`);
      continue;
    }
    if(c.id==='bodyweight-primary-progress-metric'){
      const value=i.equipment==='BODYWEIGHT'?PERFORMANCE_RULES.chart.bodyweightPrimaryMetric:PERFORMANCE_RULES.chart.loadedPrimaryMetric;
      if(value!==e.primaryMetric)errors.push(`${c.id}: primaryMetric expected ${e.primaryMetric}, got ${value}`);
      continue;
    }
    errors.push(`${c.id}: no executable validator mapping`);
  }catch(error){errors.push(`${c.id}: ${error?.stack||error}`);}
}

if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`OK: ${spec.cases.length} performance-rule cases passed`);
