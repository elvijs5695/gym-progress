// Bounded, current-session-only workout history. No copies of historical sessions.
// The WORKOUT clock is read exclusively from workout_session.startedAt and is NEVER
// rebased by undo/redo. Only local working-stage clocks are rebased.
import {clone,fingerprint} from './data-contract.js';
import {createWorkoutDecisionDelta,applyWorkoutDecisionDelta,compactWorkoutJournal,validWorkoutJournal,WORKOUT_JOURNAL_FORMAT,WORKOUT_JOURNAL_MAX_ACTIONS} from './workout-decision-delta.js';
export const WORKOUT_STEP_LIMIT=WORKOUT_JOURNAL_MAX_ACTIONS;
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
  templateExercises:(state.template_exercises||[]).filter(x=>templateIds.has(String(x.id))),
  // Retain identity provenance for replacements made during the current session.
  // The IDs alone tell Undo whether an unreferenced identity was just created;
  // full records are included only for identities this session references.
  userExerciseIds:(state.user_exercises||[]).map(x=>String(x.id)),
  userExercises:(state.user_exercises||[]).filter(x=>ex.some(e=>e.userExerciseId!=null&&String(e.userExerciseId)===String(x.id)))});
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
 const currentExercises=state.session_exercises.filter(x=>String(x.sessionId)===String(sid));
 const oldIds=new Set(currentExercises.map(x=>String(x.id)));
 const currentUserIds=new Set(currentExercises.map(x=>x.userExerciseId).filter(x=>x!=null).map(String));
 const priorIdentityIds=new Set(checkpoint.userExerciseIds||[]);
 state.workout_sessions=state.workout_sessions.map(x=>String(x.id)===String(sid)?clone(checkpoint.session):x);
 state.workout_sessions.find(x=>String(x.id)===String(sid)).startedAt=startedAt;
 state.session_exercises=state.session_exercises.filter(x=>String(x.sessionId)!==String(sid)).concat(clone(checkpoint.sessionExercises));
 state.performed_sets=state.performed_sets.filter(x=>!oldIds.has(String(x.sessionExerciseId))).concat(clone(checkpoint.performedSets));
 const savedTemplates=new Map(checkpoint.templateExercises.map(x=>[String(x.id),x]));
 state.template_exercises=state.template_exercises.map(x=>savedTemplates.has(String(x.id))?clone(savedTemplates.get(String(x.id))):x);
 // A replacement can create a new global user-exercise identity. Undo must
 // remove it ONLY if it was created since the checkpoint AND no other
 // programme/session refers to it; never delete a pre-existing catalogue item.
 if(Array.isArray(checkpoint.userExerciseIds)){
   const referenced=new Set([...state.template_exercises,...state.session_exercises]
     .map(x=>x.userExerciseId).filter(x=>x!=null).map(String));
   state.user_exercises=(state.user_exercises||[]).filter(x=>{
     const id=String(x.id);return !currentUserIds.has(id)||priorIdentityIds.has(id)||referenced.has(id);
   });
 }
 const existingUsers=new Set((state.user_exercises||[]).map(x=>String(x.id)));
 for(const user of checkpoint.userExercises||[])if(!existingUsers.has(String(user.id))){
   state.user_exercises.push(clone(user));existingUsers.add(String(user.id));
 }
 state.runtime=clone(checkpoint.runtime);if(state.runtime?.rest)delete state.runtime.rest.autoAdvancing;rebaseRunningClocks(state.runtime,checkpoint,at);
 return true;
}
/**
 * The action journal is LOCAL workspace metadata, persisted in the same
 * IndexedDB transaction as its workout snapshot. It is not a Supabase entity.
 * Old sessions without a journal retain the programme-position fallback.
 */
export function hydrateWorkoutStepHistory(state){
 sessionKey=null;undo=[];redo=[];
 const sid=state?.runtime?.sessionId;
 if(sid==null){if(state)delete state.local_workout_journal;return false;}
 const stored=state.local_workout_journal;
 if(!validWorkoutJournal(stored,sid)){
  if(state)delete state.local_workout_journal;
  return false;
 }
 sessionKey=String(sid);undo=clone(stored.undo);redo=clone(stored.redo);return true;
}
function syncJournal(state){
 if(!state||sessionKey==null)return;
 const journal=compactWorkoutJournal({format:WORKOUT_JOURNAL_FORMAT,sessionId:sessionKey,undo:clone(undo),redo:clone(redo)});
 undo=journal.undo;redo=journal.redo;
 state.local_workout_journal=journal;
}
export function resetWorkoutStepHistory(state=null){
 sessionKey=null;undo=[];redo=[];
 if(state)delete state.local_workout_journal;
}
export function recordWorkoutStep(action,before,after,state=null){
 if(!WORKOUT_STEP_ACTIONS.has(action)||!before||!after||String(before.sessionId)!==String(after.sessionId))return false;
 const key=String(after.sessionId);
 if(key!==sessionKey){sessionKey=key;undo=[];redo=[];}
 // Do not turn the passing of time into a user Undo step.
 const simplified=x=>({...x,capturedAt:0});
 if(fingerprint(simplified(before))===fingerprint(simplified(after)))return false;
 const delta=createWorkoutDecisionDelta(before,after);
 if(!delta)return false;
 undo.push({action,delta});redo=[];
 compactWorkoutJournal({undo,redo});
 if(state)syncJournal(state);
 return true;
}
/** Reconstruct a manually undone legacy action so Redo survives a reload. */
export function rememberRecoveredProgrammeUndo(before,after,action='skipExercise',state=null){
 if(!before||!after||String(before.sessionId)!==String(after.sessionId))return false;
 const key=String(after.sessionId);
 if(sessionKey!==key){sessionKey=key;undo=[];redo=[];}
 const delta=createWorkoutDecisionDelta(after,before);
 if(!delta)return false;
 redo.push({action,delta});compactWorkoutJournal({undo,redo});
 if(state)syncJournal(state);
 return true;
}
export function canUndoWorkoutStep(state){return !!undo.length&&String(state?.runtime?.sessionId)===sessionKey;}
export function canRedoWorkoutStep(state){return !!redo.length&&String(state?.runtime?.sessionId)===sessionKey;}
export function undoWorkoutStep(state,at=Date.now()){
 if(!canUndoWorkoutStep(state))return null;
 const step=undo.at(-1);
 if(!applyWorkoutDecisionDelta(state,step.delta,'before',at))return null;
 undo.pop();redo.push(step);syncJournal(state);return step.action;
}
export function redoWorkoutStep(state,at=Date.now()){
 if(!canRedoWorkoutStep(state))return null;
 const step=redo.at(-1);
 if(!applyWorkoutDecisionDelta(state,step.delta,'after',at))return null;
 redo.pop();undo.push(step);syncJournal(state);return step.action;
}
export function stepHistorySize(){return {undo:undo.length,redo:redo.length};}
