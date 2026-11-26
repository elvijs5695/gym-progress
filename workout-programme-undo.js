/**
 * Recovery navigation for older/reloaded sessions whose in-memory Undo stack
 * is absent. Navigate backwards in PLANNED exercise/set order, including
 * SKIPPED rows. Never infer order from the most recently completed timestamp.
 */
export function previousProgrammeDecision(state){
 const rt=state?.runtime;
 if(rt?.sessionId==null)return null;
 const exercises=(state.session_exercises||[]).filter(e=>String(e.sessionId)===String(rt.sessionId))
   .slice().sort((a,b)=>(a.position??0)-(b.position??0));
 const allSets=state.performed_sets||[];
 // A REST nextAction can point ahead of the last displayed exercise.
 let index=rt.phase==='STRETCH'||rt.phase==='FINAL'?exercises.length-1:
   Math.max(0,Number(rt.currentExerciseIndex)||0,Number.isInteger(rt.nextAction?.exerciseIndex)?rt.nextAction.exerciseIndex:-1);
 index=Math.min(exercises.length-1,index);
 for(let i=index;i>=0;i--){
   const e=exercises[i];
   const sets=allSets.filter(s=>String(s.sessionExerciseId)===String(e.id))
     .sort((a,b)=>Number(b.setNumber||0)-Number(a.setNumber||0));
   const terminal=sets.find(s=>s.status==='SKIPPED'||s.status==='COMPLETE');
   if(!terminal)continue;
   // A skip of a whole (possibly grouped) exercise must undo the SKIP,
   // without touching any partner's already COMPLETED work.
   const group=e.supersetGroupId?exercises.filter(x=>x.supersetGroupId===e.supersetGroupId):[e];
   const whollySkipped=group.every(member=>{
      const rows=allSets.filter(s=>String(s.sessionExerciseId)===String(member.id));
      return rows.length>0&&rows.every(s=>s.status==='SKIPPED');
   });
   return {type:terminal.status,exerciseId:e.id,exerciseIndex:i,setId:terminal.id,
     setNumber:terminal.setNumber,wholeSkip:terminal.status==='SKIPPED'&&whollySkipped,
     memberIds:terminal.status==='SKIPPED'&&whollySkipped?group.map(x=>x.id):[e.id]};
 }
 return null;
}
/** Restore a skipped exercise to its pre-exercise choice stage, not the last
 * completed workout. Existing completed sets and all other sessions survive. */
export function restoreSkippedProgrammeDecision(state,decision,at=Date.now()){
 if(decision?.type!=='SKIPPED'||state?.runtime?.sessionId==null)return false;
 const rt=state.runtime;
 const exerciseIds=new Set(decision.memberIds.map(String));
 const members=(state.session_exercises||[]).filter(x=>String(x.sessionId)===String(rt.sessionId)&&exerciseIds.has(String(x.id)));
 if(!members.length||!members.some(x=>String(x.id)===String(decision.exerciseId)))return false;
 const sets=(state.performed_sets||[]).filter(s=>exerciseIds.has(String(s.sessionExerciseId)));
 const targets=decision.wholeSkip?sets.filter(s=>s.status==='SKIPPED'):
   sets.filter(s=>String(s.id)===String(decision.setId)&&s.status==='SKIPPED');
 if(!targets.length)return false;
 for(const set of targets){
   set.status='PENDING';set.completedAt=null;
   // A skipped set should never inherit actual performance measurements.
   for(const key of ['actualReps','actualWeightKg','rir','failure','actualRestSeconds','actualDurationSeconds','distanceKm','averageHeartRateBpm','averagePowerWatts','sessionRpe'])if(key in set)set[key]=null;
 }
 for(const member of members){
   const rows=(state.performed_sets||[]).filter(s=>String(s.sessionExerciseId)===String(member.id));
   if(rows.some(s=>s.status==='PENDING')){
     member.status=rows.some(s=>s.status==='COMPLETE')?'ACTIVE':'PENDING';
     member.endedAt=null;
   }
 }
 const ordered=(state.session_exercises||[]).filter(x=>String(x.sessionId)===String(rt.sessionId))
    .slice().sort((a,b)=>(a.position??0)-(b.position??0));
 const lead=members.slice().sort((a,b)=>(a.position??0)-(b.position??0))[0];
 const leadSets=(state.performed_sets||[]).filter(s=>String(s.sessionExerciseId)===String(lead.id))
   .sort((a,b)=>Number(a.setNumber)-Number(b.setNumber));
 rt.currentExerciseIndex=ordered.findIndex(x=>String(x.id)===String(lead.id));
 rt.currentSetIndex=Math.max(0,leadSets.findIndex(s=>s.status==='PENDING'));
 rt.phase=decision.wholeSkip?'PRE_EXERCISE':'SET';
 rt.phaseStartedAt=at;rt.reminderStartedAt=at;
 rt.rest=null;rt.nextAction=null;rt.entry=null;rt.supersetEntry=null;rt.supersetTimed={};
 delete rt.cardioDraft;delete rt.deferredRestSetId;delete rt.unloadQueue;delete rt.unloadContinuation;
 return true;
}
