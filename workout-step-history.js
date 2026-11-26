// Bounded, current-session-only workout history. No copies of historical sessions.
// The WORKOUT clock is read exclusively from workout_session.startedAt and is NEVER
// rebased by undo/redo. Only local working-stage clocks are rebased.
import {clone,fingerprint} from './data-contract.js';
export const WORKOUT_STEP_LIMIT=24;
export const WORKOUT_STEP_ACTIONS=new Set([
 'beginPreparedExercise','finishWarmup','startRamp','skipRamp','finishRamp',
 'startTimedSet','finishTimedSet','saveCardioSet','cancelCardioSet',
 'setComplete','saveSet','saveSupersetSet','supersetComplete','skipSet','skipExercise',
 'skipRest','skipSupersetSet','skipSuperset','postponeExercise','confirmReplacement','toggleSupersetTimed','disableRampPermanently','finishUnload','finishStretch'
]);
let sessionKey=null,undo=[],redo=[];
function elapsed(ts,at){return Number.isFinite(Number(ts))?Math.max(0,at-Number(ts)):null;}
export function captureWorkoutStep(state,at=Date.now()){
 const rt=state?.runtime,sid=rt?.sessionId;if(sid==null)return null;
 const s=state.workout_sessions?.find(x=>String(x.id)===String(sid));if(!s)return null;
 const ex=state.session_exercises?.filter(x=>String(x.sessionId)===String(sid))||[];
 const exerciseIds=new Set(ex.map(x=>String(x.id)));
 const sets=state.performed_sets?.filter(x=>exerciseIds.has(String(x.sessionExerciseId)))||[];
 const templateIds=new Set(ex.map(x=>x.templateExerciseId).filter(x=>x!=null).map(String));
 return clone({sessionId:sid,capturedAt:at,runtime:rt,
  session:s,sessionExercises:ex,performedSets:sets,
  // A completed working set may change its corresponding programme template;
  // never copy or restore unrelated workout templates.
  templateExercises:(state.template_exercises||[]).filter(x=>templateIds.has(String(x.id)))});
}
function rebaseRunningClocks(runtime,checkpoint,at){
 const source=checkpoint.runtime,oldAt=checkpoint.capturedAt;
 if(!runtime||!source)return;
 for(const key of ['phaseStartedAt','reminderStartedAt']){
  const delay=elapsed(source[key],oldAt);
  if(delay!=null)runtime[key]=at-delay;
 }
 if(runtime.rest&&source.rest){
  const remaining=Math.max(0,Number(source.rest.endsAt||0)-oldAt);
  runtime.rest.endsAt=at+remaining;
  runtime.rest.startedAt=at-Math.max(0,Number(source.rest.plannedSeconds||0)*1000-remaining);
 }
 for(const [id,item] of Object.entries(runtime.supersetTimed||{})){
  const old=source.supersetTimed?.[id];
  if(item?.startedAt&&old?.startedAt){item.startedAt=at-Math.max(0,oldAt-Number(old.startedAt));}
 }
}
export function restoreWorkoutStep(state,checkpoint,at=Date.now()){
 if(!checkpoint||String(state?.runtime?.sessionId)!==String(checkpoint.sessionId))return false;
 const sid=checkpoint.sessionId;
 // Only touch the current workout. Historic sessions, logs, Tracker and aliases stay.
 const current=state.workout_sessions.find(x=>String(x.id)===String(sid));
 if(!current)return false;
 const startedAt=current.startedAt;
 const oldIds=new Set(state.session_exercises.filter(x=>String(x.sessionId)===String(sid)).map(x=>String(x.id)));
 state.workout_sessions=state.workout_sessions.map(x=>String(x.id)===String(sid)?clone(checkpoint.session):x);
 state.workout_sessions.find(x=>String(x.id)===String(sid)).startedAt=startedAt;
 state.session_exercises=state.session_exercises.filter(x=>String(x.sessionId)!==String(sid)).concat(clone(checkpoint.sessionExercises));
 state.performed_sets=state.performed_sets.filter(x=>!oldIds.has(String(x.sessionExerciseId))).concat(clone(checkpoint.performedSets));
 const savedTemplates=new Map(checkpoint.templateExercises.map(x=>[String(x.id),x]));
 state.template_exercises=state.template_exercises.map(x=>savedTemplates.has(String(x.id))?clone(savedTemplates.get(String(x.id))):x);
 state.runtime=clone(checkpoint.runtime);if(state.runtime?.rest)delete state.runtime.rest.autoAdvancing;rebaseRunningClocks(state.runtime,checkpoint,at);
 return true;
}
export function resetWorkoutStepHistory(){sessionKey=null;undo=[];redo=[];}
export function recordWorkoutStep(action,before,after){
 if(!WORKOUT_STEP_ACTIONS.has(action)||!before||!after||String(before.sessionId)!==String(after.sessionId))return false;
 const key=String(after.sessionId);
 if(key!==sessionKey){sessionKey=key;undo=[];redo=[];}
 // Pure value equality ignoring the capture clock; routine timer motion is not
 // itself an undoable workout decision.
 const simplified=x=>({...x,capturedAt:0});
 if(fingerprint(simplified(before))===fingerprint(simplified(after)))return false;
 undo.push({action,before,after});if(undo.length>WORKOUT_STEP_LIMIT)undo.shift();redo=[];return true;
}
export function canUndoWorkoutStep(state){return !!undo.length&&String(state?.runtime?.sessionId)===sessionKey;}
export function canRedoWorkoutStep(state){return !!redo.length&&String(state?.runtime?.sessionId)===sessionKey;}
export function undoWorkoutStep(state,at=Date.now()){
 if(!canUndoWorkoutStep(state))return null;
 const step=undo.at(-1);if(!restoreWorkoutStep(state,step.before,at))return null;
 undo.pop();redo.push(step);return step.action;
}
export function redoWorkoutStep(state,at=Date.now()){
 if(!canRedoWorkoutStep(state))return null;
 const step=redo.at(-1);if(!restoreWorkoutStep(state,step.after,at))return null;
 redo.pop();undo.push(step);return step.action;
}
export function stepHistorySize(){return {undo:undo.length,redo:redo.length};}
