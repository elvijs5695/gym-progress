import {clone,fingerprint} from './data-contract.js';
export const WORKOUT_ENGINE_VERSION='2.0.0';

/** Standard rest after skipping an exercise. The countdown is optional and
 * can always be skipped. Zero-rest activities still offer a 60-second rest. */
export function skippedExerciseRest(members, at = Date.now()) {
 const duration = Math.max(0,...(members||[]).map(e=>Math.max(0,Number(e?.plannedRestSeconds)||0)))||60;
 return {setId:null,setIds:[],startedAt:at,endsAt:at+duration*1000,
   plannedSeconds:duration,warned30:false,count3:false,count2:false,count1:false,beeped0:false};
}

export function beginSkippedExerciseRest(runtime, members, at = Date.now()) {
 if(!runtime)throw new Error('Cannot start skipped-exercise rest without an active workout');
 runtime.entry=null;runtime.supersetEntry=null;runtime.supersetTimed={};
 delete runtime.cardioDraft;
 runtime.reminderStartedAt=null;
 runtime.rest=skippedExerciseRest(members,at);
 runtime.phase='REST';runtime.phaseStartedAt=at;
 return runtime.rest;
}
export function capturedDuration(runtime,time=Date.now()){
 if(runtime?.cardioDraft?.durationSeconds!=null)return runtime.cardioDraft.durationSeconds;
 return Math.max(0,Math.round((time-Number(runtime?.phaseStartedAt??time))/1000));
}
export function freezeCardio(runtime,time=Date.now()){
 if(!runtime.cardioDraft)runtime.cardioDraft={durationSeconds:capturedDuration(runtime,time),pausedAt:time,values:{distance:'',hr:'',power:'',rpe:''},unavailable:{distance:false,hr:false,power:false,rpe:false}};
 runtime.phase='CARDIO_ENTRY';return runtime.cardioDraft;
}
export function resumeCardio(runtime,time=Date.now()){
 const draft=runtime.cardioDraft;if(!draft)return;
 runtime.phaseStartedAt=time-draft.durationSeconds*1000;runtime.phase='TIMED_SET';delete runtime.cardioDraft;
}
export function appendRevision(state,kind,before,after=null,meta={}){
 state.revisions=state.revisions||[];state.revisions.push({id:crypto.randomUUID(),at:Date.now(),engine:WORKOUT_ENGINE_VERSION,kind,before:clone(before),after:clone(after),...meta});
}
export function workoutCheckpoint(state){return clone({runtime:state.runtime,template_exercises:state.template_exercises,workout_sessions:state.workout_sessions,session_exercises:state.session_exercises,performed_sets:state.performed_sets});}
export function restoreCheckpoint(state,checkpoint){for(const [k,v] of Object.entries(checkpoint))state[k]=clone(v);}
export function createCommandBus({getState,onError=()=>{}}){
 let chain=Promise.resolve();const running=new Map();
 return function dispatch(name,fn,args=[]){
  const state=getState(),r=state?.runtime,key=fingerprint([name,args,r?.sessionId,r?.currentExerciseIndex,r?.currentSetIndex,r?.phase]);
  if(running.has(key))return running.get(key);
  const job=chain.catch(()=>{}).then(async()=>{if(getState()!==state)throw new Error('Workspace changed before the action completed');return fn(...args);});
  chain=job;running.set(key,job);job.finally(()=>running.delete(key)).catch(()=>{});
  job.catch(onError);return job;
 };
}
export function validateCardioValues(values,unavailable={}){
 const definitions={distance:{label:'Distance',min:0,max:100000},hr:{label:'Average heart rate',min:20,max:250},power:{label:'Average power',min:0,max:5000},rpe:{label:'RPE',min:1,max:10,integer:true}};
 const result={},errors={};
 for(const [key,d]of Object.entries(definitions)){
  const raw=values[key];if(unavailable[key]||raw==null||String(raw).trim()===''){result[key]=null;continue;}
  const n=Number(raw);if(!Number.isFinite(n)||n<d.min||n>d.max||(d.integer&&!Number.isInteger(n)))errors[key]=`${d.label}: enter ${d.min}–${d.max}${d.integer?' (whole number)':''}`;else result[key]=n;
 }return {values:result,errors,valid:Object.keys(errors).length===0};
}

/** Resolve stale REST nextAction against actual pending set rows, preserving
 * intentional pending set/superset actions but never entering STRETCH early.
 * Exercises are ordered by the current session order (postpone-safe). */
export function resolvePendingWorkoutAction(exercises,performedSets,proposed){
 const exs=Array.isArray(exercises)?exercises:[],sets=Array.isArray(performedSets)?performedSets:[];
 const pendingByExercise=new Map();
 for(const row of sets)if(row.status==='PENDING'){const key=String(row.sessionExerciseId);
   if(!pendingByExercise.has(key))pendingByExercise.set(key,new Set());
   pendingByExercise.get(key).add(Number(row.setNumber));
 }
 const available=(i)=>i>=0&&i<exs.length&&pendingByExercise.has(String(exs[i].id));
 const index=Number(proposed?.exerciseIndex);
 if(proposed&&Number.isInteger(index)&&available(index)){
   if(proposed.type==='EXERCISE')return proposed;
   if(['SET','SUPERSET'].includes(proposed.type)){
     const pending=pendingByExercise.get(String(exs[index].id));
     const rows=sets.filter(row=>String(row.sessionExerciseId)===String(exs[index].id));
     const row=rows.sort((a,b)=>Number(a.setNumber)-Number(b.setNumber))[proposed.setIndex];
     if(row?.status==='PENDING'&&pending.has(Number(row.setNumber))){
       if(proposed.type!=='SUPERSET')return proposed;
       const lead=exs[index];const peers=exs.filter(e=>e.supersetGroupId&&e.supersetGroupId===lead.supersetGroupId);
       if(peers.length>=2&&peers.every(peer=>pendingByExercise.get(String(peer.id))?.has(Number(row.setNumber))))return proposed;
     }
   }
 }
 const i=exs.findIndex((_,idx)=>available(idx));
 return i<0?{type:'STRETCH'}:{type:'EXERCISE',exerciseIndex:i};
}
