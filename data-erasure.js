/** Redact workout history while retaining unrelated programme and Tracker evidence. */
const HISTORY=new Set(['workout_session','session_exercise','performed_set','workout_sessions','session_exercises','performed_sets','workout_log']);
const isHistory=record=>[record?.entity_type,record?.entityType,record?.domain,record?.collection,record?.type,record?.record?.entity_type,record?.record?.entityType].some(value=>HISTORY.has(value))||/MISSING_SESSION|WORKOUT_HISTORY|ORPHAN_(?:WORKOUT_SESSION|SESSION_EXERCISE|PERFORMED_SET)/.test(record?.code||'');
function redactSyncHistory(sync,{legacy=false}={}){
 if(!sync||typeof sync!=='object')return;
 for(const [key,meta]of Object.entries(sync.records||{}))if(isHistory(meta)||HISTORY.has(key.split(':')[0])){
  if(legacy)delete sync.records[key];
  else sync.records[key]={domain:meta.domain,entityType:meta.entityType,localId:meta.localId,syncId:meta.syncId,serverRevision:meta.serverRevision,revision:Number(meta.revision||0)+1,deletedAt:Date.now(),pending:true,fingerprint:null};
 }
 for(const field of ['conflicts','resolvedConflicts','recoveryArchive','quarantine','deferredRemote'])if(Array.isArray(sync[field]))sync[field]=sync[field].filter(record=>!isHistory(record));
 for(const field of ['outbox','outboxHistory'])if(Array.isArray(sync[field]))sync[field]=sync[field].filter(record=>!isHistory(record.mutation));
 for(const [key,alias]of Object.entries(sync.aliases||{}))if(isHistory(alias))delete sync.aliases[key];
 // Upgrades preserve the prior foundation verbatim. Its queues and conflict
 // alternatives contain original payloads too, not just the record metadata.
 redactSyncHistory(sync.legacyFoundation,{legacy:true});
}
export function redactWorkoutHistory(state){
 state.workout_sessions=[];state.session_exercises=[];state.performed_sets=[];state.runtime=null;
 // The new local Undo journal contains past set identities/values; it must
 // be erased from current AND recovery snapshots when logs are deleted.
 delete state.local_workout_journal;
 state.revisions=(state.revisions||[]).filter(record=>record.kind!=='undo_set'&&!record.before?.workout_sessions&&!isHistory(record));
 delete state.analysisHistory;
 if(state.v2){for(const field of ['rawCanonical','unresolvedRecords','conversionWarnings'])if(Array.isArray(state.v2[field]))state.v2[field]=state.v2[field].filter(record=>!isHistory(record));state.v2.historyErasedAt=Date.now();}
 if(state.integrity){for(const field of ['warnings','importWarnings'])if(Array.isArray(state.integrity[field]))state.integrity[field]=state.integrity[field].filter(record=>!isHistory(record));}
 redactSyncHistory(state.sync_foundation);
 return state;
}
