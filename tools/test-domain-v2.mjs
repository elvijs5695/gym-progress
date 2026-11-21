import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseMetrics,sessionMetrics,sessionDifficultyLevel,exerciseSets,sessionExercises,previousIdenticalSession} from '../metrics.js';
import {summarizeCardioSets,compareCardioAtMatchedEffort,preferredCardioMetric} from '../cardio-analytics.js';
import {assessSet,acceptableLastSetZeroRir,progressionSetQualifies,captureAnalysisContext,effectiveRir} from '../performance-rules.js';
import {reducedSelectableWeight,stepSelectable,recommendRamp} from '../exercise-library.js';
import {evaluateAutoregulation} from '../autoregulation.js';
import {evaluateFutureAdjustment} from '../future-adjustment.js';
import {historicalE1rm,qualifyingE1rm,e1rmConfidence} from '../exercise-identity.js';
import {exerciseHistoryRows,progressMetricValue,sourceForProgressMetric} from '../progress-analytics.js';
import {performanceScore,assessExerciseTrend,assessWorkoutFatigue,persistWorkoutIntelligence} from '../progression-intelligence.js';
import {captureRecommendationTarget,currentRecommendationTarget,recommendationWeight,recommendationReps} from '../recommendation-guard.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const settings=()=>({targetRirMin:1,targetRirMax:2,progressionRirThreshold:2,lastSetZeroRirAcceptable:false,rirInputMax:5,difficultyComfortableMinRir:2.5,difficultyChallengingMinRir:1.5,difficultyHardMinRir:.5});
const exercise=(extra={})=>({id:1,sessionId:1,userExerciseId:'bench',programmeExerciseId:'bench-a',name:'Bench',position:0,status:'COMPLETE',equipment:'BARBELL',trackingMode:'WEIGHT_REPS',dumbbellLoad:'SINGLE',plannedWeightKg:63.5,targetSets:1,targetReps:10,...extra});
const set=(extra={})=>({id:1,sessionExerciseId:1,setNumber:1,status:'COMPLETE',plannedWeightKg:63.5,targetReps:10,actualWeightKg:63.5,actualReps:10,rir:2,failure:false,...extra});
const session=(extra={})=>({id:1,workoutId:1,workoutName:'A',status:'COMPLETE',startedAt:1000,endedAt:2000,...extra});
const fixture=(e=exercise(),sets=[set()])=>({app_state:settings(),template_exercises:[],workout_sessions:[session()],session_exercises:[e],performed_sets:sets});
const cardio=(extra={})=>set({actualWeightKg:0,actualReps:0,rir:null,actualDurationSeconds:600,distanceKm:null,sessionRpe:null,averageHeartRateBpm:null,averagePowerWatts:null,...extra});

test('advice acceptance preserves exact low manual decimals and explicit zero; invalid input never falls back',()=>{
  assert.equal(recommendationWeight('0.3333'),.3333);assert.equal(recommendationWeight('7.4'),7.4);assert.equal(recommendationWeight('0'),0);
  for(const value of ['', '  ',null,undefined,Infinity,'Infinity','NaN',-1,false])assert.equal(recommendationWeight(value),null);
  assert.equal(recommendationReps('8'),8);for(const value of ['0','2.5','',null,Infinity])assert.equal(recommendationReps(value),null);
});
test('recommendation baseline detects account/state replacement, programme edits, set edits and completed target',()=>{
  const state=fixture(exercise({templateExerciseId:7}),[set({status:'PENDING'})]);state.template_exercises=[{id:7,initialWeightKg:7.4,reps:10}];
  const capture=()=>captureRecommendationTarget(state,1,{setId:1,contextVersion:4});
  const current=token=>currentRecommendationTarget(state,token,{contextVersion:4,requireTemplate:true,requirePendingSet:true});
  let token=capture();assert.equal(current(token).set,state.performed_sets[0]);
  assert.equal(currentRecommendationTarget(structuredClone(state),token,{contextVersion:4}),null);
  assert.equal(currentRecommendationTarget(state,token,{contextVersion:5}),null);
  state.template_exercises[0].initialWeightKg=8;assert.equal(current(token),null);
  token=capture();state.performed_sets[0].plannedWeightKg=7.7;assert.equal(current(token),null);
  token=capture();state.performed_sets[0].status='COMPLETE';assert.equal(current(token),null);
  token=capture();assert.equal(current(token),null);
});

test('volume uses exact actual decimals and one/per-pair dumbbell semantics, without source mutation',()=>{
  const state=fixture(exercise({equipment:'DUMBBELL',dumbbellLoad:'PAIR',plannedWeightKg:999}),[set({actualWeightKg:28.75})]);
  const original=structuredClone(state);
  near(exerciseMetrics(state,state.session_exercises[0]).volume,575);
  assert.deepEqual(state,original);
  state.session_exercises[0].dumbbellLoad='SINGLE';
  near(exerciseMetrics(state,state.session_exercises[0]).volume,287.5);
  const normal=fixture();near(exerciseMetrics(normal,normal.session_exercises[0]).volume,635);
});
test('timed, cardio and bodyweight measurements never leak into lifting volume/e1RM',()=>{
  for(const mode of ['TIME_ONLY','CARDIO','BODYWEIGHT_REPS']){
    const state=fixture(exercise({trackingMode:mode}),[set({actualDurationSeconds:90})]),m=exerciseMetrics(state,state.session_exercises[0]);
    assert.equal(m.volume,0);assert.equal(m.bestE1rm,null);
    if(mode!=='BODYWEIGHT_REPS')assert.equal(m.avgRir,null);
  }
});
test('a missing actual weight is not replaced by planned load',()=>{
  const state=fixture(exercise(),[set({actualWeightKg:null,failure:true})]),e=state.session_exercises[0],s=state.performed_sets[0];
  const m=exerciseMetrics(state,e);assert.equal(m.volume,0);assert.equal(m.maxWeight,null);assert.equal(m.volumeRecordedSets,0);
  assert.equal(assessSet(e,s,settings()).capacityRatio,null);assert.equal(progressionSetQualifies(e,s,settings()),false);
});
test('pending/skipped records cannot contribute measurements or failure flags',()=>{
  const state=fixture(exercise(),[set(),set({id:2,setNumber:2,status:'SKIPPED',actualWeightKg:1000,failure:true}),set({id:3,status:'PENDING',actualWeightKg:1000})]);
  const m=exerciseMetrics(state,state.session_exercises[0]);assert.equal(m.completedSets,1);near(m.volume,635);assert.equal(m.failureCount,0);
});
test('mutable indexes observe parent moves, ordering and middle-row replacements',()=>{
  const state=fixture(exercise(),[set({id:1}),set({id:2,setNumber:2}),set({id:3,setNumber:3})]);
  assert.equal(exerciseSets(state,1).length,3);
  state.performed_sets[1].sessionExerciseId=2;
  assert.deepEqual(exerciseSets(state,1).map(s=>s.id),[1,3]);assert.equal(exerciseSets(state,'2')[0].id,2);
  state.performed_sets[1]=set({id:4,setNumber:0});
  assert.deepEqual(exerciseSets(state,1).map(s=>s.id),[4,1,3]);
  sessionExercises(state,1);state.session_exercises[0].sessionId=2;
  assert.equal(sessionExercises(state,1).length,0);assert.equal(sessionExercises(state,'2').length,1);
});
test('cardio summaries expose recorded RPE, heart rate, power and duration-weighted load consistently',()=>{
  const summary=summarizeCardioSets([cardio({sessionRpe:4,averageHeartRateBpm:120,averagePowerWatts:100}),cardio({id:2,actualDurationSeconds:1800,sessionRpe:8,averageHeartRateBpm:160,averagePowerWatts:200})]);
  near(summary.sessionRpe,7);near(summary.averageHeartRateBpm,150);near(summary.averagePowerWatts,175);near(summary.cardioLoad,280);
  const state=fixture(exercise({equipment:'CARDIO',trackingMode:'CARDIO'}),[cardio({sessionRpe:7})]);
  assert.equal(exerciseMetrics(state,state.session_exercises[0]).sessionRpe,7);assert.equal(exerciseMetrics(state,state.session_exercises[0]).cardioLoad,70);
});
test('missing cardio observations stay null, explicit zero distance remains zero',()=>{
  const missing=summarizeCardioSets([cardio()]),zero=summarizeCardioSets([cardio({distanceKm:0})]);
  assert.equal(missing.totalDistanceKm,null);assert.equal(missing.cardioLoad,null);assert.equal(missing.sessionRpe,null);
  assert.equal(zero.totalDistanceKm,0);assert.equal(zero.paceSecondsPerKm,null);
  assert.equal(progressMetricValue(missing,'DISTANCE'),null);assert.equal(progressMetricValue(zero,'DISTANCE'),0);
});
test('partial metric coverage cannot fabricate whole-activity pace or matched effort',()=>{
  const summary=summarizeCardioSets([cardio({distanceKm:5,sessionRpe:5,averageHeartRateBpm:140}),cardio({id:2})]);
  near(summary.paceSecondsPerKm,120);near(summary.sessionRpe,5);near(summary.averageHeartRateBpm,140);
  near(summary.coverage.distance,.5);near(summary.coverage.rpe,.5);assert.equal(summary.cardioLoad,50);
  assert.equal(compareCardioAtMatchedEffort([summary,summary],'PACE'),null);
  const withStop=summarizeCardioSets([cardio({distanceKm:5}),cardio({id:2,distanceKm:0})]);near(withStop.paceSecondsPerKm,240);
});
test('matched pace percentage describes seconds/km reduction and sorts actual dates',()=>{
  const old={completedSets:1,sessionStartedAt:1,totalDistanceKm:5,totalDurationSeconds:1800,sessionRpe:5};
  const latest={...old,sessionStartedAt:2,totalDurationSeconds:1500};
  const match=compareCardioAtMatchedEffort([latest,old],'PACE');
  assert.equal(match.current,latest);near(match.changePct,100/6);assert.equal(match.changeBasis,'PACE_DECREASE');
});
test('invalid optional cardio measurements never become valid metrics',()=>{
  for(const value of [Infinity,NaN,'',false,-1]){
    const summary=summarizeCardioSets([cardio({sessionRpe:value,averagePowerWatts:value,averageHeartRateBpm:value})]);
    assert.equal(summary.sessionRpe,null);assert.equal(summary.averagePowerWatts,null);assert.equal(summary.averageHeartRateBpm,null);
  }
  assert.equal(preferredCardioMetric([{completedSets:1,averagePowerWatts:Infinity,totalDurationSeconds:20},{completedSets:1,averagePowerWatts:Infinity,totalDurationSeconds:20}]),'DURATION');
});
test('every emitted reduction is finite, positive and below both manual load and equipment recommendation grid',()=>{
  for(const equipment of ['BARBELL','DUMBBELL','MACHINE','CABLE','OTHER'])for(const base of [.01,.125,.25,.5,1,2.49,2.5,2.75,10.3,28.75,63.5,97.5,100])for(const percent of [2.5,5,7.5,50]){
    const next=reducedSelectableWeight(base,equipment,percent);
    if(next!=null){assert.ok(Number.isFinite(next));assert.ok(next>0&&next<base);}
    assert.ok(stepSelectable(base,-1,equipment)<=base);
  }
  assert.equal(reducedSelectableWeight(1,'CABLE',5),null);
  assert.equal(stepSelectable(1,-1,'CABLE'),1);
  assert.deepEqual(recommendRamp(Infinity,8,'HEAVY_COMPOUND',null,'','BARBELL'),[]);
});
test('future and in-session advice never raise sub-step manual weights or an already-lower next prescription',()=>{
  const e=exercise({equipment:'CABLE',plannedWeightKg:1,targetReps:8,targetSets:2}),failed=set({plannedWeightKg:1,actualWeightKg:1,targetReps:8,actualReps:4,rir:null,failure:true}),pending=set({id:2,setNumber:2,status:'PENDING',plannedWeightKg:1,targetReps:8});
  assert.equal(evaluateFutureAdjustment(e,[failed],settings()),null);
  assert.equal(evaluateAutoregulation(failed,[failed,pending],settings(),e),null);
  const actual=set({actualReps:5,targetReps:8,failure:true,rir:null}),next={...pending,plannedWeightKg:50};
  const advice=evaluateAutoregulation(actual,[actual,next],settings(),exercise({targetReps:8,targetSets:2}));
  assert.ok(advice.suggestedWeightKg<50&&advice.suggestedWeightKg<actual.actualWeightKg);
  near(advice.suggestedWeightKg,45);
});
test('bodyweight tracking mode is assessed as reps even with OTHER equipment',()=>{
  const e=exercise({trackingMode:'BODYWEIGHT_REPS',equipment:'OTHER',targetSets:2,targetReps:8,plannedWeightKg:0});
  const failed=set({actualWeightKg:0,plannedWeightKg:0,targetReps:8,actualReps:4,rir:null,failure:true}),next=set({id:2,setNumber:2,status:'PENDING',targetReps:8});
  assert.equal(evaluateFutureAdjustment(e,[failed],settings()).kind,'REDUCE_REPS');
  assert.equal(evaluateAutoregulation(failed,[failed,next],settings(),e).kind,'REDUCE_REPS');
});
test('last-set exception requires a recorded zero RIR and original load, never missing effort',()=>{
  const e=exercise({targetSets:3}),s=set({setNumber:3,rir:null}),app={...settings(),lastSetZeroRirAcceptable:true};
  assert.equal(acceptableLastSetZeroRir(e,s,app),false);
  assert.equal(acceptableLastSetZeroRir(e,{...s,rir:0},app),true);
  assert.equal(acceptableLastSetZeroRir(e,{...s,rir:0,actualWeightKg:20},app),false);
  assert.equal(progressionSetQualifies(e,{...s,rir:0},app),false);
  assert.equal(effectiveRir({status:'COMPLETE',rir:Infinity}),null);
});
test('e1RM requires finite actual measures; qualifying confidence matches the eligibility gate',()=>{
  assert.equal(qualifyingE1rm(set({actualReps:1,rir:0})),63.5);
  assert.equal(e1rmConfidence(set({actualReps:1,rir:0})),'DIRECT');
  for(const invalid of [set({actualWeightKg:Infinity}),set({actualReps:1.5}),set({actualReps:0}),set({status:'PENDING'}),set({rir:3,actualReps:2})]){
    assert.equal(qualifyingE1rm(invalid),null);assert.equal(e1rmConfidence(invalid),'NOT_ELIGIBLE');
  }
  near(historicalE1rm(set({actualReps:10,rir:null})),63.5*(1+10/30));
});
test('cardio and timed rows cannot dilute a lifting failure rate or contaminate RIR',()=>{
  const e=exercise({targetSets:4}),state=fixture(e,[set({failure:true,rir:null,actualReps:1}),set({id:2,setNumber:2,failure:true,rir:null,actualReps:1}),set({id:3,setNumber:3}),set({id:4,setNumber:4})]);
  state.session_exercises.push(exercise({id:2,equipment:'CARDIO',trackingMode:'CARDIO',targetSets:10}));
  for(let i=0;i<10;i++)state.performed_sets.push(cardio({id:i+10,sessionExerciseId:2,rir:5,sessionRpe:1}));
  const m=sessionMetrics(state,state.workout_sessions[0]);assert.equal(m.completedSets,14);assert.equal(m.strengthCompletedSets,4);near(m.avgRir,1);
  assert.equal(sessionDifficultyLevel(m,settings()).key,'failure');
});
test('volume progress does not compare a changed exercise composition or an aborted session',()=>{
  const state=fixture();state.workout_sessions.push(session({id:2,startedAt:3000}));state.session_exercises.push(exercise({id:2,sessionId:2,programmeExerciseId:'new-occurrence'}));state.performed_sets.push(set({id:2,sessionExerciseId:2}));
  assert.equal(previousIdenticalSession(state,state.workout_sessions[1]),null);
  state.session_exercises[1].programmeExerciseId='bench-a';assert.equal(previousIdenticalSession(state,state.workout_sessions[1]).id,1);
  state.workout_sessions[1].status='ABORTED';assert.equal(previousIdenticalSession(state,state.workout_sessions[1]),null);
});
test('whole exercises from aborted sessions remain chartable while partial work stays in History',()=>{
  const state=fixture();state.workout_sessions[0].status='ABORTED';
  assert.equal(exerciseHistoryRows(state,{userExerciseId:'bench'}).length,1);
  state.session_exercises[0].targetSets=2;
  assert.equal(exerciseHistoryRows(state,{userExerciseId:'bench'}).length,0);
  assert.equal(exerciseHistoryRows(state,{userExerciseId:'bench'},{includePartialAborted:true}).length,1);
  assert.equal(assessWorkoutFatigue(state,state.workout_sessions[0]).state,'INSUFFICIENT_DATA');
});
function history(){
  const state={app_state:settings(),workout_sessions:[],session_exercises:[],performed_sets:[],template_exercises:[]};
  for(let i=1;i<=10;i++){
    state.workout_sessions.push(session({id:i,startedAt:1000*i,endedAt:1000*i+500}));
    state.session_exercises.push(exercise({id:i,sessionId:i,progressionOffered:[1,4,7].includes(i),progressionAccepted:[1,4,7].includes(i)}));
    state.performed_sets.push(set({id:i,sessionExerciseId:i}));
  }
  return state;
}
test('an active exposure absent from finished history uses all prior exposures, not just the first',()=>{
  const state=history(),active=exercise({id:11,sessionId:11,status:'ACTIVE'});state.workout_sessions.push(session({id:11,startedAt:11000,status:'ACTIVE'}));state.session_exercises.push(active);state.performed_sets.push(set({id:11,sessionExerciseId:11}));
  const assessment=assessExerciseTrend(state,active);assert.equal(assessment.historyExposures,10);assert.equal(assessment.expectedInterval,3);
});
test('analysis context preserves settings and previous computed values without rewriting measurements',()=>{
  const state=history(),e=state.session_exercises.at(-1),s=state.workout_sessions.at(-1);
  s.analysisContext=captureAnalysisContext(state.app_state,{capturedAt:s.startedAt});
  const baseline=performanceScore(state,e),measurements=structuredClone(state.performed_sets);
  state.app_state.targetRirMin=5;near(performanceScore(state,e),baseline);
  e.recommendation='OLD_VALUE';e.normalisedPerformance=77;s.fatigueState='OLD_STATE';
  persistWorkoutIntelligence(state,s.id);
  assert.equal(e.legacyAnalysis.values.recommendation,'OLD_VALUE');assert.equal(e.legacyAnalysis.values.normalisedPerformance,77);assert.equal(s.legacyAnalysis.values.fatigueState,'OLD_STATE');
  assert.equal(e.analysisProvenance.version,'GYM_PROGRESS_DOMAIN_V2');assert.deepEqual(state.performed_sets,measurements);
});
test('unrated strength and cardio-only workouts do not assert a normal fatigue pattern',()=>{
  const unknown=fixture(exercise(),[set({rir:null})]);assert.equal(performanceScore(unknown,unknown.session_exercises[0]),null);assert.equal(assessWorkoutFatigue(unknown,unknown.workout_sessions[0]).state,'INSUFFICIENT_DATA');
  const cardioOnly=fixture(exercise({trackingMode:'CARDIO',equipment:'CARDIO'}),[cardio({sessionRpe:7})]);assert.equal(assessWorkoutFatigue(cardioOnly,cardioOnly.workout_sessions[0]).state,'INSUFFICIENT_DATA');
});
test('cycle-best history retains archived and unassigned occurrences and identifies metric sources',()=>{
  const state=history();state.template_exercises=[{userExerciseId:'bench',programmeExerciseId:'current-a'},{userExerciseId:'bench',programmeExerciseId:'current-b'}];
  state.session_exercises.forEach((e,i)=>{e.programmeExerciseId=i<3?'archived':i<7?'current-a':'current-b';});
  state.session_exercises[9].programmeExerciseId=null;
  const original=structuredClone(state),rows=exerciseHistoryRows(state,{userExerciseId:'bench'});
  const allIds=rows.flatMap(r=>r.sourceSessionExerciseIds).sort((a,b)=>a-b);
  assert.deepEqual(allIds,state.session_exercises.map(e=>e.id));assert.deepEqual(state,original);
  const cycle=rows.find(r=>r.cycleMembers>1);assert.ok(cycle);assert.ok(sourceForProgressMetric(cycle,'VOLUME').sourceSetIds.length>0);
});
test('different equipment or tracking contexts are never combined into synthetic cycle records',()=>{
  const state=history();state.session_exercises.forEach((e,i)=>{e.programmeExerciseId=i%2?'a':'b';if(i%2)e.equipment='DUMBBELL';});
  const rows=exerciseHistoryRows(state,{userExerciseId:'bench'});assert.equal(rows.length,10);assert.ok(rows.every(r=>r.aggregationMode==='EXPOSURE'));
});
