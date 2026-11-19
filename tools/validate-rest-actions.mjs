import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=fs.readFileSync(path.resolve(import.meta.dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.resolve(import.meta.dirname,'../styles.css'),'utf8');
const extract=(first,last)=>{const a=app.indexOf(first),b=app.indexOf(last,a+1);assert(a>=0&&b>a,`${first} unavailable`);return app.slice(a,b);};
const source=extract('function nextPendingActivity(exs){','function nextActionAfterExercise(')+
  extract("async function postponeExercise(where='next'){",'async function skipExercise(){')+
  extract('async function skipExercise(){','function beginStretch(){')+
  extract('async function confirmReplacement(){','function exerciseActionButtons(');
let renderCount=0,persistCount=0,dialogCb=null;
const state={app_state:{maxRampUpSets:3},runtime:{sessionId:15,phase:'REST',phaseStartedAt:720,rest:{setId:10,setIds:[10],startedAt:1000,endsAt:121000,countdownStage:1,count3:false,beeped0:false},currentExerciseIndex:0,currentSetIndex:0,nextAction:{type:'EXERCISE',exerciseIndex:1}},session_exercises:[
  {id:1,sessionId:15,position:0,name:'Bench',status:'COMPLETE'},
  {id:2,sessionId:15,position:1,name:'Rows',status:'PENDING'},
  {id:3,sessionId:15,position:2,name:'Squat',status:'PENDING'}
],performed_sets:[{id:10,sessionExerciseId:1,status:'COMPLETE'},{id:20,sessionExerciseId:2,status:'PENDING'},{id:30,sessionExerciseId:3,status:'PENDING'}]};
const window={__gpPostponeTargetId:2};
const context={state,window,now:()=>2000,render:()=>{renderCount++;},persist:async()=>{persistCount++;},closeDialog:()=>{},toast:()=>{},flashTransition:()=>{},queuePostSetPrompts:()=>{},alertDialog:()=>{},
  getSessionExercise:id=>state.session_exercises.find(x=>x.id===id),sessionDisplayName:e=>e.name,
  $:()=>({value:'42.5'}),runtime:()=>state.runtime,uuid:()=> 'replacement-occurrence-uuid',
  Equipment:{BODYWEIGHT:'BODYWEIGHT',CARDIO:'CARDIO',BARBELL:'BARBELL',DUMBBELL:'DUMBBELL',OTHER:'OTHER'},
  RampMode:{AUTO:'AUTO'},recommendRamp:()=>[],DumbbellLoad:{SINGLE:'SINGLE'},
  exerciseSets:(st,id)=>st.performed_sets.filter(x=>x.sessionExerciseId===id),
  sessionExercises:(st,id)=>st.session_exercises.filter(x=>x.sessionId===id).sort((a,b)=>a.position-b.position),
  currentActiveContext:()=>({rt:state.runtime,exs:context.sessionExercises(state,15)}),
  replacementExerciseTarget:()=>context.sessionExercises(state,15)[state.runtime.nextAction.exerciseIndex],
  confirmDialog:(title,msg,ok,callback)=>{dialogCb=callback;},
  afterRest:()=>{throw new Error('Rest should not end by exercise management')}
};
vm.createContext(context);vm.runInContext(source,context);
const originalRest=JSON.stringify(state.runtime.rest),originalPhaseStartedAt=state.runtime.phaseStartedAt;
await context.postponeExercise('end');
assert.equal(JSON.stringify(state.runtime.rest),originalRest,'Postpone must retain rest and timestamps');
assert.equal(state.runtime.phase,'REST');
assert.equal(state.runtime.phaseStartedAt,originalPhaseStartedAt);
assert.equal(context.sessionExercises(state,15)[state.runtime.nextAction.exerciseIndex].name,'Squat','Next should be Squat after postponing Rows');
assert.equal(state.runtime.currentExerciseIndex,0,'Completed active exercise should keep its identity');
// Reset rest and exercise statuses in a fresh context; skip upcoming exercise during rest.
state.session_exercises[1].position=1;state.session_exercises[2].position=2;
state.runtime.nextAction={type:'EXERCISE',exerciseIndex:1};
await context.skipExercise();assert.equal(typeof dialogCb,'function');await dialogCb();
assert.equal(JSON.stringify(state.runtime.rest),originalRest,'Skip must retain rest and timestamps');
assert.equal(state.runtime.phase,'REST');
assert.equal(state.runtime.nextAction.type,'EXERCISE');
assert.equal(context.sessionExercises(state,15)[state.runtime.nextAction.exerciseIndex].name,'Squat','Next should be Squat after skipping Rows');
assert.equal(state.performed_sets.find(x=>x.sessionExerciseId===2).status,'SKIPPED');
// Replacing during rest must update the next prescription without resetting the rest phase.
state.session_exercises[1].status='PENDING';state.session_exercises[1].name='Rows';
state.performed_sets.find(x=>x.sessionExerciseId===2).status='PENDING';
state.runtime.nextAction={type:'EXERCISE',exerciseIndex:1};
window.__gpReplacement={targetId:2,chosen:{key:'db_row',name:'Dumbbell Row',canonical:{id:'canonical-db-row',equipment:'DUMBBELL'},user:{id:'known-row',displayName:'Dumbbell Row',canonicalExerciseId:'canonical-db-row',equipment:'DUMBBELL',dumbbellLoad:'SINGLE',exerciseType:'COMPOUND',trackingMode:'WEIGHT_REPS'}}};
await context.confirmReplacement();
assert.equal(JSON.stringify(state.runtime.rest),originalRest,'Replacement must not alter rest');
assert.equal(state.runtime.phase,'REST');
assert.equal(state.runtime.phaseStartedAt,originalPhaseStartedAt);
assert.equal(state.session_exercises[1].name,'Dumbbell Row');
assert.equal(state.performed_sets.find(x=>x.sessionExerciseId===2).plannedWeightKg,42.5);
assert.match(css,/\.exercise-secondary-actions\s*\{[^}]*justify-content:center/);
assert.match(css,/\.exercise-secondary-actions \.exercise-management\s*\{[^}]*flex:1 1 0/);
assert.match(css,/var\(--accent2\)/,'Management colour should contrast with primary Complete');
console.log('OK: postpone/skip preserve rest timers, advance next target, and evenly distribute blue secondary controls');
