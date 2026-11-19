import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
function extract(a,b){const x=source.indexOf(a),y=source.indexOf(b,x+1);assert(x>=0&&y>x,`${a} / ${b}`);return source.slice(x,y);}
const makeContext=(x)=>{vm.createContext(x);return x;};
const e0={id:1,name:'Bench',trackingMode:'WEIGHT_REPS',equipment:'BARBELL',targetReps:8,plannedWeightKg:100};
const e1={id:2,name:'Cycling',trackingMode:'CARDIO',equipment:'CARDIO',targetSeconds:1200};
const sets={1:[{id:10,status:'COMPLETE',targetReps:8,plannedWeightKg:100},{id:11,status:'PENDING',targetReps:8,plannedWeightKg:95}],2:[{id:12,status:'PENDING',targetDurationSeconds:1200,plannedWeightKg:0}]};
const runtime={phase:'REST',nextAction:{type:'SET',exerciseIndex:0,setIndex:1}};
const ctx=makeContext({
  runtime:()=>runtime,currentActiveContext:()=>({e:e0,exs:[e0,e1]}),state:{},
  TrackingMode:{CARDIO:'CARDIO'},Equipment:{BODYWEIGHT:'BODYWEIGHT'},
  S:(x)=>x,esc:(x)=>String(x),sessionDisplayName:e=>e.name,
  exerciseSets:(_s,id)=>sets[id],formatDuration:ms=>`${Math.round(ms/60000)}m`,formatKg:x=>`${x} kg`,
  exerciseActionButtons:()=>'<div data-management="true"></div>',
  displayAction:(_e,a)=>a.type==='STRETCH'?'Stretching':'Exercise'
});
vm.runInContext(extract('function nextExerciseDecisionCard({duringRest=false}={}){','function phasePanel('),ctx);
let html=ctx.nextExerciseDecisionCard({duringRest:true});
assert.match(html,/NEXT SET/,'Rest between sets must display NEXT SET');
assert.match(html,/95 kg/,'Autoregulated next-set weight must show');
assert.doesNotMatch(html,/data-management/,'No Later/Replace/Skip between sets of the same exercise');
runtime.nextAction={type:'EXERCISE',exerciseIndex:1};
html=ctx.nextExerciseDecisionCard({duringRest:true});
assert.match(html,/NEXT EXERCISE/);
assert.match(html,/Cycling/);
assert.match(html,/data-management/,'Management choices must appear before a new exercise');
assert.doesNotMatch(html,/BEGIN EXERCISE/,'Rest card must not force skipping rest');
runtime.phase='PRE_EXERCISE';
html=ctx.nextExerciseDecisionCard();
assert.match(html,/BEFORE EXERCISE/);
assert.match(html,/BEGIN EXERCISE/);
assert.match(html,/data-management/);
let completedRender=0,persistCount=0;
const set={id:15,status:'PENDING',plannedWeightKg:63.5,plannedRestSeconds:90,targetReps:8};
const rt={phase:'SET',workingWeight:63.5};
const completeCtx=makeContext({
  currentActiveContext:()=>({rt,set}),
  enableAudio:()=>new Promise(()=>{}), // must NOT block completion if audio is unavailable
  now:()=>100000,
  render:()=>{completedRender++},persist:async()=>{persistCount++},
  toast:msg=>{throw new Error(`Unexpected UI error: ${msg}`)},console
});
vm.runInContext(extract('async function setComplete(){','async function adjustEntryReps('),completeCtx);
await Promise.race([completeCtx.setComplete(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Set Complete blocked by audio')),100))]);
assert.equal(rt.phase,'ENTRY','Set Complete must enter RIR entry');
assert.equal(rt.entry.weight,63.5,'Manual weight must remain exact');
assert.equal(rt.rest.endsAt-rt.rest.startedAt,90000,'Rest starts at completion');
assert.equal(completedRender,1,'UI should render immediately');
assert.equal(persistCount,1,'Completion must persist');
const exercise={id:1,name:'Bench',equipment:'BARBELL',removeWeights:false,status:'ACTIVE'};
rt.entry.rir=2;
Object.assign(completeCtx,{
  currentActiveContext:()=>({rt,s:{},exs:[exercise],e:exercise,sets:[set],set}),
  state:{app_state:{}},ui:{restExpand:false},
  Equipment:{BODYWEIGHT:'BODYWEIGHT'},
  evaluateAutoregulation:()=>null,progressionQualifies:()=>false,evaluateFutureAdjustment:()=>null,
  supersetPartnerAction:()=>null,nextActionAfterExercise:()=>({type:'STRETCH'}),
  queuePostSetPrompts:()=>{},settleRestOrRender:async()=>{}
});
vm.runInContext(extract('async function saveSet(){','function supersetPartnerAction('),completeCtx);
await completeCtx.saveSet();
assert.equal(set.status,'COMPLETE','Save set must commit the performed set');
assert.equal(set.actualWeightKg,63.5,'Save set must preserve manual actual weight');
assert.equal(set.rir,2,'Save set must preserve chosen RIR');
assert.equal(rt.phase,'REST','Save set must transition to rest');
assert.equal(rt.nextAction.type,'STRETCH','Final set must transition toward stretching');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert.match(css,/\.alternative-choice[^{}]*\{[^{}]*grid-template-columns:minmax\(0,1fr\) auto/,'Replace choice must use non-overlapping columns');
console.log('OK: shared UI contract PWA — first/pre-exercise, rest/next card, same-exercise set, manual load and Set Complete without Web Audio');
