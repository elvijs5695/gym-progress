import assert from 'node:assert/strict';
import {persistWorkoutIntelligence} from '../progression-intelligence.js';
import {ensureSyncFoundation,syncFoundationCounts} from '../sync-foundation.js';

const state={
  app_state:{targetRirMin:1,targetRirMax:2,progressionRirThreshold:2,lastSetZeroRirAcceptable:false},
  workout_templates:[{id:1,name:'A',position:0,isActive:true}],
  template_exercises:[{id:1,workoutId:1,userExerciseId:'bench',programmeExerciseId:'bench-a',name:'Bench Press'}],
  user_exercises:[{id:'bench',displayName:'Bench Press',equipment:'BARBELL'}],
  workout_sessions:[],session_exercises:[],performed_sets:[],tracker_items:[],tracker_entries:[]
};
for(let i=0;i<10;i++){
  const sid=i+1,eid=i+1,accepted=[0,3,6].includes(i);
  state.workout_sessions.push({id:sid,workoutId:1,workoutName:'A',startedAt:1_700_000_000_000+i*86_400_000,endedAt:1,status:'COMPLETE'});
  state.session_exercises.push({id:eid,sessionId:sid,templateExerciseId:1,userExerciseId:'bench',programmeExerciseId:'bench-a',name:'Bench Press',position:0,targetSets:1,targetReps:8,plannedWeightKg:100,plannedRestSeconds:120,equipment:'BARBELL',trackingMode:'WEIGHT_REPS',status:'COMPLETE',progressionOffered:accepted,progressionAccepted:accepted});
  state.performed_sets.push({id:eid,sessionExerciseId:eid,setNumber:1,targetReps:8,actualReps:8,plannedWeightKg:100,actualWeightKg:100,rir:2,failure:false,plannedRestSeconds:120,status:'COMPLETE'});
}
const result=persistWorkoutIntelligence(state,10);
assert(result);
const current=state.session_exercises.at(-1);
assert.equal(current.recommendation,'HOLD');
assert.equal(current.trendState,'ON_TRACK');
assert.equal(current.trendConfidence,'MEDIUM');
assert.equal(current.expectedProgressionInterval,3);
assert(Array.isArray(current.recommendationReasonCodes));
assert.equal(state.workout_sessions.at(-1).fatigueState,'NORMAL');

ensureSyncFoundation(state,{migration:true});
const k='user_exercise:bench';
const originalSyncId=state.sync_foundation.records[k].syncId;
const rev=state.sync_foundation.records[k].revision;
state.user_exercises[0].displayName='Bench Press Updated';
ensureSyncFoundation(state);
assert.equal(state.sync_foundation.records[k].syncId,originalSyncId);
assert.equal(state.sync_foundation.records[k].revision,rev+1);
state.workout_sessions=state.workout_sessions.filter(s=>s.id!==1);
ensureSyncFoundation(state);
assert(state.sync_foundation.records['workout_session:1'].deletedAt!=null);
assert(syncFoundationCounts(state).tombstones>=1);
console.log('OK: adaptive progression + local sync metadata tests passed');
