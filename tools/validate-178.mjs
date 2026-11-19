import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');
function between(a,b){const start=src.indexOf(a),stop=src.indexOf(b,start+a.length);assert.ok(start>=0&&stop>start,a);return src.slice(start,stop)}
const ctx=(c)=>{vm.createContext(c);return c;};
// Data-integrity: same-day strength and cardio remain separated; only recorded HR contributes.
const cardio=ctx({
  state:{session_exercises:[{id:1,sessionId:5,trackingMode:'CARDIO'},{id:2,sessionId:5,trackingMode:'CARDIO'},{id:3,sessionId:5,trackingMode:'WEIGHT_REPS'}]},
  TrackingMode:{CARDIO:'CARDIO'},exerciseSets:(_s,id)=>({1:[{status:'COMPLETE',actualDurationSeconds:600,distanceKm:2,averageHeartRateBpm:120,sessionRpe:4}],2:[{status:'COMPLETE',actualDurationSeconds:1800,distanceKm:null,averageHeartRateBpm:150,sessionRpe:8}],3:[{status:'COMPLETE',actualDurationSeconds:null,sessionRpe:null}]}[id])
});
vm.runInContext(between('function sessionCardioSummary(session){','function workoutLogEffort('),cardio);
const sum=cardio.sessionCardioSummary({id:5});
assert.equal(sum.duration,2400);assert.equal(sum.distance,2);assert.equal(sum.meanHr,142.5);assert.equal(sum.meanRpe,7);
// Cardio N/A is a legible input value, and it is a true null when saved.
const button={classList:{toggle:()=>{}},setAttribute:()=>{},textContent:''};
const row={classList:{toggle:()=>{}}};
const field={disabled:false,type:'number',tagName:'INPUT',value:'250',nextElementSibling:button,closest:()=>row};
const na=ctx({document:{getElementById:()=>field}});
vm.runInContext(between('function toggleCardioNA(id){','function cancelCardioSet(){'),na);
na.toggleCardioNA('cardio-power');assert.equal(field.disabled,true);assert.equal(field.type,'text');assert.equal(field.value,'-');assert.equal(button.textContent,'N/A');
na.toggleCardioNA('cardio-power');assert.equal(field.disabled,false);assert.equal(field.type,'number');assert.equal(field.value,'');
// Set Complete's first set must go back without modifying the actual log, not call undoLastSet.
const setRt={phase:'ENTRY',entry:{weight:28.75},rest:{startedAt:1000,endsAt:10000}};let persisted=0,rendered=0;
const back=ctx({runtime:()=>setRt,now:()=>2000,persist:async()=>{persisted++},render:()=>{rendered++}});
vm.runInContext(between('async function cancelSetEntry(){','async function undoLastSet(){'),back);
await back.cancelSetEntry();assert.equal(setRt.phase,'SET');assert.equal(setRt.entry,null);assert.equal(setRt.rest,null);assert.equal(persisted,1);assert.equal(rendered,1);
// Real cardio timer must be frozen for data entry and then resume without counting form-entry seconds.
let t=100000;
const rt={phase:'TIMED_SET',phaseStartedAt:50000};
const paused=ctx({runtime:()=>rt,now:()=>t,closeDialog:()=>{},persist:async()=>{},render:()=>{}});
paused.window={__gpCardioDuration:50,__gpCardioOpenedAt:100000};
vm.runInContext(between('function cancelCardioSet(){','async function saveCardioSet(){'),paused);
t=145000;paused.cancelCardioSet();assert.equal(rt.phaseStartedAt,95000);assert.equal(paused.window.__gpCardioDuration,null);
// Both flow controls are present, not obsolete change-exercise CTA.
assert.ok(!src.includes('class="ghost small-btn change-exercise"'));
assert.ok(src.includes('gp.skipExercise()')&&src.includes('gp.backToExerciseChoice()'));
assert.ok(src.includes("metrics=cardio?['DURATION','DISTANCE','PACE','POWER'"));
assert.ok(src.includes('if(wasReviewedDuringRest){await beginPreparedExercise();return;}'));
assert.ok(src.includes("if(rt.phase==='TIMED_SET'&&window.__gpCardioDuration)return;"));
assert.ok(src.includes('Back to set'));
console.log('OK: 1.7.8 regression tests — first set Back, cardio N/A, paused timer, duration-weighted session summary and rest/next flow');
