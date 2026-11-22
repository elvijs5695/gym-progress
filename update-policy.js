/** Explicit version-switch gate. A completed workout is not synonymous with a
 * completed upload. Only pending local upload records in enabled domains veto
 * signed-in updates; remote orphans remain in Data review, not this gate.
 */
export function preserveRefreshUpdateIntent(reason){return reason==='sync-running'||reason==='local-save-or-workspace';}

export function updateGate({state,authenticated=false,bootstrapStatus='ready',syncInFlight=false,writeBlocked=false,workspaceTransition=false,dirty=false,dialogOpen=false}={}){
 if(!state||writeBlocked||workspaceTransition)return {safe:false,reason:'local-save-or-workspace'};
 if(state.runtime)return {safe:false,reason:'active-workout'};
 if(dirty||dialogOpen)return {safe:false,reason:'unsaved-input'};
 if(syncInFlight||authenticated&&bootstrapStatus!=='ready')return {safe:false,reason:'sync-running'};
 if(authenticated){
  const f=state.sync_foundation||{},enabled=new Set(Object.entries(f.domains||{}).filter(([,d])=>d?.enabled).map(([name])=>name));
  const localPending=Object.values(f.records||{}).some(meta=>meta?.pending&&!meta.suppressed&&enabled.has(meta.domain));
  const outboxPending=(f.outbox||[]).some(item=>enabled.has(({workout_template:'programme',user_exercise:'programme',template_exercise:'programme',programme_schedule:'programme',workout_session:'workout_log',session_exercise:'workout_log',performed_set:'workout_log',tracker_item:'tracker',tracker_state:'tracker',tracker_entry:'tracker'})[item?.mutation?.entity_type]));
  if(localPending||outboxPending)return {safe:false,reason:'sync-pending'};
  if(f.blocked)return {safe:false,reason:'sync-blocked'};
 }
 return {safe:true,reason:'safe'};
}
