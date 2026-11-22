import {uuid} from './exercise-identity.js';
import {rpc,socialUser,authGeneration} from './social-api.js';
import {ensureSyncFoundation,SYNC_DOMAINS,SYNC_ORDER,TYPE_DOMAIN,TYPE_TO_ARRAY,syncKey,cloneSync,sameSyncValue,syncFingerprint,scheduleValue} from './sync-foundation.js';
import {SyncDataError,isUuid,REFERENCES,metaForLocal,metaForSync,rowForMeta,recordPayload,eligibleForUpload,validateRemoteRecord,decodeRemoteRow,saveLocalRow,removeLocalRow,requiredDependants,archiveLocalVersion,adoptRemoteMetadata,localMatchesRemote,operationMatchesLocal,remoteOrder,localIdOf,reconnectOptionalReferences} from './sync-codec.js';

const openConflicts=state=>(state.sync_foundation?.conflicts||[]).filter(c=>!c.resolution);
const nonnegativeInteger=value=>Number.isSafeInteger(value)&&value>=0;
const nonemptyTraining=state=>Object.values(TYPE_TO_ARRAY).some(name=>(state[name]||[]).length);
const sameRecord=(a,b)=>(a?.deleted_at!=null)===(b?.deleted_at!=null)&&(a?.deleted_at!=null||sameSyncValue(a?.payload,b?.payload));
const metadataSnapshot=(state,meta)=>({localRevision:meta?.revision??0,serverRevision:meta?.serverRevision??0,deleted_at:meta?.deletedAt==null?null:new Date(meta.deletedAt).toISOString(),payload:meta&&meta.deletedAt==null?recordPayload(state,meta):null});
function addArchive(state,entry){const rows=state.sync_foundation.recoveryArchive;if(!rows.some(old=>sameSyncValue(old,entry)))rows.push(cloneSync(entry));}
function conflictFor(state,meta,remote,{code='CONCURRENT_EDIT',operation=null,targetSyncId=null}={}){
  let local;try{local=metadataSnapshot(state,meta);}catch{local={localRevision:meta?.revision??0,payload:null,record:cloneSync(rowForMeta(state,meta))};}
  const type=meta?.entityType||remote?.entity_type,syncId=meta?.syncId||remote?.entity_id;
  let conflict=openConflicts(state).find(c=>c.entityType===type&&c.syncId===syncId);
  if(!conflict){conflict={id:uuid(),entityType:type,domain:TYPE_DOMAIN[type],syncId,localId:meta?.localId??null,code,local,remote:cloneSync(remote),alternatives:[],createdAt:Date.now()};state.sync_foundation.conflicts.push(conflict);}
  else{
    if(!sameSyncValue(conflict.local,local)||!sameSyncValue(conflict.remote,remote))conflict.alternatives.push({local:cloneSync(conflict.local),remote:cloneSync(conflict.remote)});
    conflict.local=local;conflict.remote=cloneSync(remote);conflict.code=code;
  }
  if(operation)conflict.operation=cloneSync(operation);
  if(targetSyncId)conflict.targetSyncId=targetSyncId;
  if(meta){meta.pending=true;meta.conflictId=conflict.id;}
  return conflict;
}
function retainDeferred(state,remote,reason='WAITING_FOR_PARENT'){
  const array=state.sync_foundation.deferredRemote,index=array.findIndex(x=>x.record.entity_id===remote.entity_id&&x.record.entity_type===remote.entity_type);
  if(index>=0){if(array[index].record.revision>=remote.revision)return;addArchive(state,{entityType:remote.entity_type,syncId:remote.entity_id,reason:'SUPERSEDED_DEFERRED_VERSION',remote:array[index].record});array[index]={record:cloneSync(remote),reason};}
  else array.push({record:cloneSync(remote),reason});
}
function applyRemote(state,record,{force=false,initiallyEmptyProgramme=false}={}){
  const type=record.entity_type,sync=state.sync_foundation;
  if(record.alias_of){
    const primary=metaForSync(state,type,record.alias_of);
    if(!primary||!rowForMeta(state,primary))return {deferred:true,reason:'WAITING_FOR_ALIAS_PRIMARY'};
    const direct=Object.values(sync.records).find(m=>m.entityType===type&&m.syncId===record.entity_id);
    if(direct&&direct!==primary){
      conflictFor(state,direct,record,{code:'ALIAS_REBIND_REQUIRED',targetSyncId:record.alias_of});direct.aliasOf=record.alias_of;direct.suppressed=true;
    }
    sync.aliases[record.entity_id]={entityType:type,localId:primary.localId,canonicalSyncId:record.alias_of};
    addArchive(state,{entityType:type,syncId:record.entity_id,reason:'SERVER_IDENTITY_ALIAS',remote:record});return {changed:false};
  }
  let meta=metaForSync(state,type,record.entity_id),row=meta?rowForMeta(state,meta):null;
  if(meta&&record.revision<=Number(meta.serverRevision||0)&&!meta.unbased&&!force)return {changed:false};
  if(meta?.suppressed&&!force){addArchive(state,{entityType:type,syncId:record.entity_id,reason:'ERASE_SUPPRESSED_REMOTE',remote:record});return {changed:false};}
  if(meta&&localMatchesRemote(state,meta,record)){
    meta.serverRevision=record.revision;meta.serverPayload=cloneSync(record.payload);meta.pending=false;meta.unbased=false;
    return {changed:false};
  }
  const bootstrapSchedule=type==='programme_schedule'&&initiallyEmptyProgramme&&Number(meta?.serverRevision||0)===0;
  if(meta?.pending&&!force&&!bootstrapSchedule){conflictFor(state,meta,record);return {changed:false,conflict:true};}
  if(record.deleted_at!=null){
    if(!meta){addArchive(state,{entityType:type,syncId:record.entity_id,reason:'REMOTE_TOMBSTONE',remote:record});return {changed:false};}
    if(requiredDependants(state,meta).length)return {deferred:true,reason:'DEPENDANTS_PRESENT'};
    archiveLocalVersion(state,meta,'REMOTE_DELETE');removeLocalRow(state,meta);
    meta.serverRevision=record.revision;meta.deletedAt=Date.parse(record.deleted_at);meta.serverPayload=null;meta.pending=false;meta.fingerprint=null;meta.unbased=false;
    return {changed:true};
  }
  const decoded=decodeRemoteRow(state,record,row);
  if(decoded.deferred)return decoded;
  if(meta&&row)archiveLocalVersion(state,meta,force?'CONFLICT_CLOUD_CHOICE':'REMOTE_UPDATE');
  saveLocalRow(state,type,decoded.row);
  if(meta&&String(localIdOf(type,decoded.row))!==String(meta.localId))delete sync.records[syncKey(type,meta.localId)];
  adoptRemoteMetadata(state,record,decoded.row,decoded);return {changed:true};
}
function applyDeferred(state,options={}){
  // Local UI changes can occur while a page is in flight. Detect them before
  // any remote version is considered, even if its UI persistence is queued.
  ensureSyncFoundation(state);
  let changed=false,progress=true;
  while(progress){
    progress=false;const remaining=[];
    for(const item of state.sync_foundation.deferredRemote.slice().sort((a,b)=>remoteOrder(a.record,b.record))){
      try{const result=applyRemote(state,item.record,options);if(result.deferred)remaining.push({...item,reason:result.reason});else{progress=true;changed=changed||result.changed;}}
      catch(error){if(!(error instanceof SyncDataError))throw error;state.sync_foundation.quarantine.push({kind:error.code,entityType:item.record.entity_type,record:cloneSync(item.record),message:error.message});progress=true;}
    }
    state.sync_foundation.deferredRemote=remaining;
  }
  return reconnectOptionalReferences(state)||changed;
}
function validateStatus(status,workspaceId=null){
  if(status?.protocol!==2||status.minimum_client_protocol>2||!isUuid(status.workspace_id)||!isUuid(status.legacy_owner_id)||!nonnegativeInteger(status.erase_epoch)||!nonnegativeInteger(status.head_cursor)||(workspaceId&&status.workspace_id!==workspaceId))throw new SyncDataError('PROTOCOL_MISMATCH','A matching protocol 2 workspace is required.');
  return status;
}
function validatePage(page,context,after,snapshot=null){
  if(page?.protocol!==2||page.workspace_id!==context.workspaceId||page.erase_epoch!==context.epoch||!nonnegativeInteger(page.snapshot_cursor)||!nonnegativeInteger(page.next_cursor)||!Array.isArray(page.changes)||typeof page.has_more!=='boolean')throw new SyncDataError('INVALID_PULL_PAGE','The download page did not match the captured workspace/epoch.');
  if(snapshot!=null&&page.snapshot_cursor!==snapshot)throw new SyncDataError('SNAPSHOT_CHANGED','The server changed the download snapshot.');
  if(page.next_cursor<after||page.next_cursor>page.snapshot_cursor||page.has_more&&page.next_cursor<=after||!page.has_more&&page.next_cursor!==page.snapshot_cursor)throw new SyncDataError('INVALID_PULL_CURSOR','The server returned an incomplete or non-advancing cursor.');
  let previous=after;
  for(const record of page.changes){validateRemoteRecord(record);if(record.cursor<=previous||record.cursor>page.next_cursor)throw new SyncDataError('INVALID_CHANGE_ORDER','Changes must be strictly ordered within the snapshot.');previous=record.cursor;}
  if(page.has_more&&(!page.changes.length||previous!==page.next_cursor))throw new SyncDataError('INVALID_PULL_CURSOR','An intermediate page must end at its last returned change.');
  return page;
}

/** Dependency injection is for deterministic protocol tests; production uses the authenticated RPC client. */
export function createTrainingSyncClient({rpc:callRpc=rpc,user:currentUser=socialUser,generation:currentGeneration=authGeneration}={}){
  const running=new WeakMap();
  function capture(state,{isCurrent=()=>true}={}){
    ensureSyncFoundation(state);const accountId=currentUser()?.id,generation=currentGeneration(),owner=state.sync_foundation.accountId;
    if(!accountId)throw new SyncDataError('SIGN_IN_REQUIRED','Sign in to sync this account workspace.');
    if(owner&&owner!==accountId)throw new SyncDataError('ACCOUNT_MISMATCH','Local data belongs to a different account.');
    const assert=()=>{if(currentUser()?.id!==accountId||currentGeneration()!==generation||!isCurrent(state)||state.sync_foundation.accountId&&state.sync_foundation.accountId!==accountId)throw new SyncDataError('ACCOUNT_CHANGED','Account or workspace changed during sync.');};
    return {accountId,generation,assert};
  }
  async function statusFor(state,guard){
    const workspaceId=state.sync_foundation.workspaceId||null;
    const status=validateStatus(await callRpc('gp_v2_status',{p_workspace_id:workspaceId}),workspaceId);guard.assert();return status;
  }
  async function persistChecked(state,persist,guard){guard.assert();await persist(state,{accountId:guard.accountId,workspaceId:state.sync_foundation.workspaceId});guard.assert();}
  async function acceptStatus(state,status,guard,persist){
    const sync=state.sync_foundation;
    if(!sync.accountId){
      const verifiedImport=sync.workspaceId===status.workspace_id&&sync.legacyOwnerId===status.legacy_owner_id&&state.v2?.protocol===2;
      if(nonemptyTraining(state)&&!verifiedImport)throw new SyncDataError('LOCAL_OWNER_UNCONFIRMED','Choose an account workspace or explicitly import this data before syncing.');
      sync.accountId=guard.accountId;
    }
    if(sync.legacyOwnerId&&sync.legacyOwnerId!==status.legacy_owner_id)throw new SyncDataError('OWNER_MAPPING_MISMATCH','The imported owner does not match this account binding.');
    if(sync.eraseEpoch!=null&&sync.eraseEpoch!==status.erase_epoch||sync.eraseEpoch==null&&status.erase_epoch>0&&nonemptyTraining(state)){
      sync.blocked={code:'EPOCH_MISMATCH',expectedEpoch:sync.eraseEpoch,serverEpoch:status.erase_epoch};
      await persistChecked(state,persist,guard);throw new SyncDataError('EPOCH_MISMATCH','Cloud data was erased on another device. Local data is retained; review before exchanging changes.',sync.blocked);
    }
    sync.workspaceId=status.workspace_id;sync.legacyOwnerId=status.legacy_owner_id;sync.eraseEpoch=status.erase_epoch;
    await persistChecked(state,persist,guard);
    return {...guard,workspaceId:status.workspace_id,epoch:status.erase_epoch,assert:()=>{guard.assert();if(state.sync_foundation!==sync||sync.workspaceId!==status.workspace_id||sync.eraseEpoch!==status.erase_epoch)throw new SyncDataError('WORKSPACE_CHANGED','The workspace or erase generation changed during sync.');}};
  }
  async function fetchPages(context,{after=0,onPage,limit=200}={}){
    let snapshot=null,cursor=after,pages=0;
    do{
      const page=await callRpc('gp_v2_pull',{p_workspace_id:context.workspaceId,p_after_cursor:cursor,p_limit:limit,p_snapshot_cursor:snapshot});context.assert();
      if(page?.erase_epoch!==context.epoch)throw new SyncDataError('EPOCH_MISMATCH','Cloud erasure changed during download.',{serverEpoch:page?.erase_epoch});
      validatePage(page,context,cursor,snapshot);snapshot=page.snapshot_cursor;
      await onPage(page);context.assert();cursor=page.next_cursor;pages++;
      if(!page.has_more)return {cursor,snapshot,pages};
    }while(true);
  }
  async function getTrainingSyncPreview(state,options={}){
    const guard=capture(state,options),status=await statusFor(state,guard),context={...guard,workspaceId:status.workspace_id,epoch:status.erase_epoch};
    const domains=new Set(options.domains||SYNC_DOMAINS),rows=[];
    const after=Math.min(...[...domains].map(domain=>Number(state.sync_foundation.domains[domain]?.serverCursor||0)));
    await fetchPages(context,{after:Number.isFinite(after)?after:0,limit:options.pageSize||200,onPage:page=>{rows.push(...page.changes);}});
    const latest=new Map();for(const record of rows)latest.set(`${record.entity_type}:${record.entity_id}`,record);
    const remotes=[...latest.values()],counts={workouts:0,exercises:0,schedule:0,logs:0,tracker:0,conflicts:openConflicts(state).length,remoteRecords:remotes.filter(r=>!r.alias_of).length,cloudDevices:1};
    for(const record of remotes){
      if(record.alias_of||!domains.has(TYPE_DOMAIN[record.entity_type]))continue;
      const meta=metaForSync(state,record.entity_type,record.entity_id);
      if(meta&&record.revision<=Number(meta.serverRevision||0)&&!meta.unbased||meta&&localMatchesRemote(state,meta,record))continue;
      if(record.entity_type==='workout_template')counts.workouts++;else if(['user_exercise','template_exercise'].includes(record.entity_type))counts.exercises++;else if(record.entity_type==='programme_schedule')counts.schedule++;else if(record.entity_type==='workout_session')counts.logs++;else if(TYPE_DOMAIN[record.entity_type]==='tracker')counts.tracker++;
      if(meta?.pending&&!openConflicts(state).some(c=>c.syncId===meta.syncId))counts.conflicts++;
    }
    const pending=Object.values(state.sync_foundation.records).filter(m=>m.pending&&!m.suppressed&&eligibleForUpload(state,m));
    counts.localWorkouts=pending.filter(m=>m.entityType==='workout_template').length;counts.localExercises=pending.filter(m=>['template_exercise','user_exercise'].includes(m.entityType)).length;counts.localSchedule=pending.filter(m=>m.entityType==='programme_schedule').length;counts.localLogs=pending.filter(m=>m.entityType==='workout_session').length;counts.localTracker=pending.filter(m=>m.domain==='tracker').length;
    return {...counts,rows,remotes,accountId:guard.accountId,authGeneration:guard.generation,workspaceId:status.workspace_id,eraseEpoch:status.erase_epoch,conflictItems:listTrainingSyncConflicts(state),blocked:state.sync_foundation.eraseEpoch!=null&&state.sync_foundation.eraseEpoch!==status.erase_epoch?'EPOCH_MISMATCH':null};
  }
  function buildOutbox(state,domains){
    ensureSyncFoundation(state);const sync=state.sync_foundation;
    const occupied=new Set(sync.outbox.map(item=>item.mutation.entity_id));
    const candidates=Object.values(sync.records).filter(meta=>meta.pending&&!meta.suppressed&&!meta.conflictId&&domains.has(meta.domain)&&eligibleForUpload(state,meta)&&!occupied.has(meta.syncId)).sort((a,b)=>SYNC_ORDER.indexOf(a.entityType)-SYNC_ORDER.indexOf(b.entityType));
    const queued=new Set(sync.outbox.filter(item=>!item.blocked&&domains.has(TYPE_DOMAIN[item.mutation.entity_type])).map(item=>item.mutation.entity_id));
    for(const meta of candidates){
      let payload;
      try{payload=recordPayload(state,meta);}catch(error){sync.quarantine.push({kind:error.code||'ENCODE_ERROR',entityType:meta.entityType,syncId:meta.syncId,record:cloneSync(rowForMeta(state,meta)),message:error.message});continue;}
      if(meta.deletedAt==null){
        const missing=(REFERENCES[meta.entityType]||[]).some(([wire,type])=>{
          const id=payload[wire];if(!id)return false;const parent=metaForSync(state,type,id);return !parent||Number(parent.serverRevision||0)<=0&&!queued.has(id);
        });
        if(missing){meta.waitingForDependency=true;continue;}
      }
      delete meta.waitingForDependency;
      const mutation={operation_id:uuid(),entity_type:meta.entityType,entity_id:meta.syncId,expected_revision:Number(meta.serverRevision||0),deleted_at:meta.deletedAt==null?null:new Date(meta.deletedAt).toISOString(),payload:cloneSync(payload)};
      sync.outbox.push({mutation,recordKey:syncKey(meta.entityType,meta.localId),localRevision:meta.revision,accountId:sync.accountId,workspaceId:sync.workspaceId,createdAt:Date.now()});queued.add(meta.syncId);
    }
  }
  async function flushOutbox(state,context,domains,persist){
    let applied=0;
    while(true){
      const candidates=state.sync_foundation.outbox.filter(item=>domains.has(TYPE_DOMAIN[item.mutation.entity_type])&&!item.blocked).sort((a,b)=>SYNC_ORDER.indexOf(a.mutation.entity_type)-SYNC_ORDER.indexOf(b.mutation.entity_type));
      const batch=[],batchIds=new Set();
      for(const item of candidates){
        if(batch.length>=200)break;
        const operation=item.mutation;
        const ready=operation.deleted_at!=null||(REFERENCES[operation.entity_type]||[]).every(([wire,type])=>{
          const id=operation.payload?.[wire];if(!id)return true;
          return Number(metaForSync(state,type,id)?.serverRevision||0)>0||batchIds.has(id);
        });
        if(ready){batch.push(item);batchIds.add(operation.entity_id);}
      }
      if(!batch.length)return applied;
      if(batch.some(item=>item.accountId!==context.accountId||item.workspaceId!==context.workspaceId))throw new SyncDataError('OUTBOX_OWNER_MISMATCH','A pending operation belongs to another account workspace.');
      // The exact operation UUID, expected version and payload must reach durable storage first.
      await persistChecked(state,persist,context);
      const response=await callRpc('gp_v2_apply',{p_workspace_id:context.workspaceId,p_erase_epoch:context.epoch,p_mutations:batch.map(item=>cloneSync(item.mutation))});context.assert();
      if(response?.status==='epoch_mismatch'||response?.erase_epoch!==context.epoch){state.sync_foundation.blocked={code:'EPOCH_MISMATCH',expectedEpoch:context.epoch,serverEpoch:response?.erase_epoch};await persistChecked(state,persist,context);throw new SyncDataError('EPOCH_MISMATCH','Cloud data was erased during sync. All local proposals are retained.');}
      if(response?.protocol!==2||response.workspace_id!==context.workspaceId||response.status!=='ok'||!Array.isArray(response.results))throw new SyncDataError('INVALID_APPLY_RESPONSE','The server did not acknowledge the captured mutation batch.');
      const resultIds=new Set();
      for(const result of response.results){if(!batch.some(item=>item.mutation.operation_id===result.operation_id)||resultIds.has(result.operation_id))throw new SyncDataError('INVALID_RECEIPT','The mutation receipt is unknown or duplicated.');resultIds.add(result.operation_id);}
      if(resultIds.size!==batch.length)throw new SyncDataError('INCOMPLETE_RECEIPTS','Not every operation has an acknowledgement. Pending operations are retained.');
      ensureSyncFoundation(state);
      for(const item of batch){
        const result=response.results.find(r=>r.operation_id===item.mutation.operation_id),meta=state.sync_foundation.records[item.recordKey];
        if(result.record)validateRemoteRecord(result.record);
        if(result.status==='applied'||result.status==='replayed'){
          if(!meta||result.record?.entity_id!==item.mutation.entity_id||result.record?.entity_type!==item.mutation.entity_type||result.record.revision!==item.mutation.expected_revision+1||!sameRecord(item.mutation,result.record))throw new SyncDataError('INVALID_ACKNOWLEDGED_RECORD','The receipt does not match the exact submitted operation.');
          meta.serverRevision=Math.max(Number(meta.serverRevision||0),result.record.revision);meta.serverPayload=cloneSync(result.record.payload);meta.unbased=false;
          meta.pending=!operationMatchesLocal(state,meta,item.mutation);applied++;
        }else if(result.status==='conflict'){
          conflictFor(state,meta,result.record,{code:result.code==='entity_alias'?'ENTITY_ALIAS':'CONCURRENT_EDIT',operation:item.mutation,targetSyncId:result.alias_of||null});
        }else if(result.status==='operation_id_reused'){
          item.blocked=true;conflictFor(state,meta,result.record,{code:'OPERATION_ID_REUSED',operation:item.mutation});continue;
        }else throw new SyncDataError('UNKNOWN_RECEIPT','The server returned an unsupported operation result.');
        state.sync_foundation.outboxHistory.push({...cloneSync(item),receipt:cloneSync(result)});
        state.sync_foundation.outbox=state.sync_foundation.outbox.filter(op=>op.mutation.operation_id!==item.mutation.operation_id);
      }
      await persistChecked(state,persist,context);
    }
  }
  async function execute(state,{domains=SYNC_DOMAINS,preview=null,persist,isCurrent,pageSize=200}={}){
    if(typeof persist!=='function')throw new SyncDataError('PERSIST_REQUIRED','Sync requires a durable persistence callback.');
    const selected=new Set(domains.filter(domain=>SYNC_DOMAINS.includes(domain)));if(!selected.size)return {changed:false,conflicts:openConflicts(state).length};
    const guard=capture(state,{isCurrent});
    if(preview&&(preview.accountId!==guard.accountId||preview.authGeneration!==guard.generation))throw new SyncDataError('PREVIEW_OWNER_CHANGED','The account changed after this sync preview.');
    const status=await statusFor(state,guard),context=await acceptStatus(state,status,guard,persist),initiallyEmptyProgramme=!(state.workout_templates||[]).length;
    let changed=false,applied=await flushOutbox(state,context,selected,persist);
    const after=Math.min(...[...selected].map(domain=>Number(state.sync_foundation.domains[domain].serverCursor||0)));
    try{
      await fetchPages(context,{after,limit:pageSize,onPage:async page=>{
        for(const record of page.changes){const domain=TYPE_DOMAIN[record.entity_type];if(selected.has(domain)&&record.cursor>Number(state.sync_foundation.domains[domain].serverCursor||0))retainDeferred(state,record);}
        changed=applyDeferred(state,{initiallyEmptyProgramme})||changed;
        for(const domain of selected)state.sync_foundation.domains[domain].serverCursor=page.next_cursor;
        await persistChecked(state,persist,context);
      }});
    }catch(error){
      if(error.code==='EPOCH_MISMATCH'){state.sync_foundation.blocked={code:error.code,expectedEpoch:context.epoch,...error.details};await persistChecked(state,persist,context);}throw error;
    }
    // A final dependency pass may now connect records whose parents arrived on later pages.
    changed=applyDeferred(state,{initiallyEmptyProgramme})||changed;
    // A cursor can already be past a valid parent (e.g. after an interrupted
    // historical import). A normal incremental sync would then report
    // "Waiting for related records" indefinitely. Replay a verified cloud
    // snapshot from cursor 0, but only for the affected selected domains and
    // at most once every six hours. This is READ-ONLY reconciliation; no
    // record is deleted or fabricated when a parent genuinely does not exist.
    const relevantDeferred=()=>state.sync_foundation.deferredRemote.some(item=>selected.has(TYPE_DOMAIN[item.record.entity_type]));
    if(relevantDeferred()&&Date.now()-Number(state.sync_foundation.lastDependencyRecheckAt||0)>6*60*60*1000){
      await fetchPages(context,{after:0,limit:pageSize,onPage:async page=>{
        for(const record of page.changes)if(selected.has(TYPE_DOMAIN[record.entity_type]))retainDeferred(state,record);
        changed=applyDeferred(state,{initiallyEmptyProgramme})||changed;
        await persistChecked(state,persist,context);
      }});
      state.sync_foundation.lastDependencyRecheckAt=Date.now();
      changed=applyDeferred(state,{initiallyEmptyProgramme})||changed;
      await persistChecked(state,persist,context);
    }
    buildOutbox(state,selected);await persistChecked(state,persist,context);
    applied+=await flushOutbox(state,context,selected,persist);
    ensureSyncFoundation(state);
    for(const domain of selected){
      const info=state.sync_foundation.domains[domain];info.enabled=true;
      const conflict=openConflicts(state).some(c=>c.domain===domain),deferred=state.sync_foundation.deferredRemote.some(item=>TYPE_DOMAIN[item.record.entity_type]===domain),pending=Object.values(state.sync_foundation.records).some(meta=>meta.domain===domain&&meta.pending&&!meta.suppressed&&eligibleForUpload(state,meta));
      info.status=conflict?'Conflict requires review':deferred?'Related records need review':pending?'Changes pending':'Synced';
      if(!conflict&&!deferred&&!pending)info.lastSuccessfulSyncAt=Date.now();
    }
    await persistChecked(state,persist,context);
    const pendingRecords=Object.values(state.sync_foundation.records).filter(meta=>selected.has(meta.domain)&&meta.pending&&!meta.suppressed&&eligibleForUpload(state,meta));
    const pendingIds=new Set([...pendingRecords.map(meta=>meta.syncId),...state.sync_foundation.outbox.filter(item=>selected.has(TYPE_DOMAIN[item.mutation.entity_type])).map(item=>item.mutation.entity_id)]);
    return {changed,conflicts:openConflicts(state).length,conflictItems:listTrainingSyncConflicts(state),applied,deferred:state.sync_foundation.deferredRemote.length,pending:pendingIds.size,waitingForDependencies:pendingRecords.filter(meta=>meta.waitingForDependency).length,outboxPending:state.sync_foundation.outbox.length};
  }
  function runTrainingSync(state,options={}){
    if(running.has(state))return running.get(state);
    const task=execute(state,options).finally(()=>{if(running.get(state)===task)running.delete(state);});running.set(state,task);return task;
  }
  async function resolveTrainingSyncConflict(state,id,choice,{persist,isCurrent,expectedLocalRevision=null}={}){
    if(!['local','cloud'].includes(choice)||typeof persist!=='function')throw new SyncDataError('INVALID_RESOLUTION','Choose one record version and provide durable persistence.');
    const guard=capture(state,{isCurrent}),conflict=openConflicts(state).find(c=>c.id===id);if(!conflict)throw new SyncDataError('CONFLICT_NOT_FOUND','This conflict is no longer open.');
    let meta=metaForSync(state,conflict.entityType,conflict.syncId);
    if(meta&&Number(meta.revision)!==Number(expectedLocalRevision??conflict.local.localRevision))throw new SyncDataError('LOCAL_CHANGED','This record changed after the conflict was shown. Review the new values.');
    if(conflict.targetSyncId&&conflict.targetSyncId!==conflict.syncId)throw new SyncDataError('ALIAS_REBIND_REQUIRED','This legacy identity redirects to a primary record. Review the preserved identity alternatives before applying a new operation.');
    if(choice==='cloud'){
      if(!conflict.remote){if(meta){if(requiredDependants(state,meta).length)throw new SyncDataError('DEPENDANTS_PRESENT','Resolve related records before removing this parent.');archiveLocalVersion(state,meta,'CONFLICT_CLOUD_ABSENCE');removeLocalRow(state,meta);meta.deletedAt=Date.now();meta.serverRevision=0;meta.pending=false;meta.suppressed=true;state.sync_foundation.suppressedIds.push(meta.syncId);}}
      else{const result=applyRemote(state,conflict.remote,{force:true});if(result.deferred)throw new SyncDataError(result.reason,'Related records must be available before choosing this version.');meta=metaForSync(state,conflict.entityType,conflict.syncId);}
    }else if(meta){
      archiveLocalVersion(state,meta,'CONFLICT_LOCAL_CHOICE');meta.serverRevision=Number(conflict.remote?.revision||0);meta.serverPayload=cloneSync(conflict.remote?.payload??null);meta.pending=true;meta.unbased=false;
    }
    if(meta)delete meta.conflictId;
    conflict.resolution={choice,at:Date.now()};state.sync_foundation.resolvedConflicts.push(cloneSync(conflict));state.sync_foundation.conflicts=state.sync_foundation.conflicts.filter(c=>c.id!==id);
    state.sync_foundation.outbox=state.sync_foundation.outbox.filter(item=>{if(item.mutation.entity_id!==conflict.syncId)return true;state.sync_foundation.outboxHistory.push({...cloneSync(item),resolution:choice});return false;});
    ensureSyncFoundation(state);await persistChecked(state,persist,guard);return {resolved:true,choice};
  }
  return {getTrainingSyncPreview,runTrainingSync,resolveTrainingSyncConflict};
}
const client=createTrainingSyncClient();
export const getTrainingSyncPreview=client.getTrainingSyncPreview;
export const runTrainingSync=client.runTrainingSync;
export const resolveTrainingSyncConflict=client.resolveTrainingSyncConflict;
export function listTrainingSyncConflicts(state){return openConflicts(state).map(conflict=>{const meta=metaForSync(state,conflict.entityType,conflict.syncId);let local=conflict.local;try{if(meta)local=metadataSnapshot(state,meta);}catch{}return {...cloneSync(conflict),local:cloneSync(local),localChanged:local.localRevision!==conflict.local.localRevision};});}
export function enabledSyncDomains(state){return SYNC_DOMAINS.filter(domain=>state?.sync_foundation?.domains?.[domain]?.enabled);}
export function syncStatusLabel(state){
  const sync=state?.sync_foundation;if(sync?.blocked)return 'Sync paused: cloud erasure requires review';
  const enabled=enabledSyncDomains(state);if(!enabled.length)return 'Not enabled';
  if(openConflicts(state).length)return 'Conflict requires review';
  if(sync.deferredRemote?.length)return `Related records need review (${sync.deferredRemote.length})`;
  if(sync.outbox?.length||Object.values(sync.records||{}).some(meta=>meta.pending&&!meta.suppressed&&enabled.includes(meta.domain)))return 'Changes pending';
  const times=enabled.map(domain=>Number(sync.domains[domain]?.lastSuccessfulSyncAt||0));return times.every(Boolean)?`Synced ${new Date(Math.min(...times)).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Enabled';
}

/** Call only after an explicit successful erase RPC; it never silently adopts an unexpected epoch. */
export function resetAfterCloudErasure(state,result,{scope='all'}={}){
  ensureSyncFoundation(state);const sync=state.sync_foundation;
  if(!result?.ok||result.workspace_id!==sync.workspaceId||!nonnegativeInteger(result.erase_epoch)||result.erase_epoch<=Number(sync.eraseEpoch??-1))throw new SyncDataError('INVALID_ERASE_RECEIPT','The erase receipt does not match this workspace.');
  const erased=new Set(scope==='workout_log'?['workout_log']:SYNC_DOMAINS),removedIds=new Set();
  for(const [key,meta] of Object.entries(sync.records))if(erased.has(meta.domain)){
    const retainsRow=meta.entityType==='programme_schedule'?(state.workout_templates||[]).length>0||state.app_state?.nextWorkoutId!=null||state.app_state?.nextSessionAt!=null:!!rowForMeta(state,meta);
    if(retainsRow){meta.suppressed=true;meta.pending=false;meta.serverRevision=0;sync.suppressedIds.push(meta.syncId);}
    else {removedIds.add(meta.syncId);delete sync.records[key];}
  }
  sync.suppressedIds=[...new Set(sync.suppressedIds)].filter(id=>!removedIds.has(id));
  for(const field of ['outbox','outboxHistory'])sync[field]=sync[field].filter(item=>!erased.has(TYPE_DOMAIN[item.mutation?.entity_type]));
  for(const field of ['conflicts','resolvedConflicts','recoveryArchive','quarantine'])sync[field]=sync[field].filter(item=>!erased.has(item.domain||TYPE_DOMAIN[item.entityType||item.record?.entity_type]));
  sync.deferredRemote=sync.deferredRemote.filter(item=>!erased.has(TYPE_DOMAIN[item.record.entity_type]));
  for(const [id,alias] of Object.entries(sync.aliases))if(erased.has(TYPE_DOMAIN[alias.entityType]))delete sync.aliases[id];
  // History-only erasure redacts this copy upstream; retain unrelated originals.
  if(scope==='all')delete sync.legacyFoundation;
  sync.eraseEpoch=result.erase_epoch;delete sync.blocked;
  for(const domain of SYNC_DOMAINS){sync.domains[domain].serverCursor=0;sync.domains[domain].lastSuccessfulSyncAt=null;sync.domains[domain].status=erased.has(domain)?'Erased; local originals excluded from sync':'Changes pending';}
  return state;
}
