import {uuid} from './exercise-identity.js';
import {ensureSyncFoundation} from './sync-foundation.js';
import {listTrainingSyncRecords,upsertTrainingSyncRecords,deleteLegacyTrainingSyncSnapshots} from './social-api.js';

const TYPE_TO_ARRAY={
  workout_template:'workout_templates',template_exercise:'template_exercises',user_exercise:'user_exercises',
  workout_session:'workout_sessions',session_exercise:'session_exercises',performed_set:'performed_sets',
  tracker_item:'tracker_items',tracker_entry:'tracker_entries'
};
const TYPE_DOMAIN={
  workout_template:'programme',template_exercise:'programme',user_exercise:'programme',programme_schedule:'programme',
  workout_session:'workout_log',session_exercise:'workout_log',performed_set:'workout_log',
  tracker_item:'tracker',tracker_entry:'tracker'
};
const ORDER=['workout_template','user_exercise','template_exercise','programme_schedule','workout_session','session_exercise','performed_set','tracker_item','tracker_entry'];
const NUMERIC_TYPES=new Set(['workout_template','template_exercise','workout_session','session_exercise','performed_set']);
const REF_KEYS=new Set(['workoutSyncId','userExerciseSyncId','sessionSyncId','templateExerciseSyncId','sessionExerciseSyncId','itemSyncId','nextWorkoutSyncId']);

const clone=v=>v==null?v:structuredClone(v);
const stable=v=>{
  if(v==null||typeof v!=='object')return v;
  if(Array.isArray(v))return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
};
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const key=(type,id)=>`${type}:${String(id)}`;
const norm=s=>String(s??'').trim().toLocaleLowerCase();
const nextNumericId=arr=>arr.reduce((m,x)=>Math.max(m,Number(x?.id)||0),0)+1;
const timeToMinutes=v=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(v||''));return m?Math.max(0,Math.min(1439,Number(m[1])*60+Number(m[2]))):0;};
const minutesToTime=v=>{const n=Math.max(0,Math.min(1439,Number(v)||0));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
const asMs=v=>{if(v==null)return null;if(typeof v==='number')return v;const n=Date.parse(v);return Number.isFinite(n)?n:null;};

function metaForLocal(state,type,localId){return state.sync_foundation?.records?.[key(type,localId)]||null;}
function directMetaForSync(state,syncId){return Object.values(state.sync_foundation?.records||{}).find(r=>r.syncId===syncId)||null;}
function aliasForSync(state,syncId){return state.sync_foundation?.aliases?.[syncId]||null;}
function metaForSync(state,syncId){const direct=directMetaForSync(state,syncId);if(direct)return direct;const a=aliasForSync(state,syncId);return a?metaForLocal(state,a.entityType,a.localId):null;}
function registerAlias(state,syncId,type,localId){if(!syncId)return;state.sync_foundation.aliases=state.sync_foundation.aliases||{};state.sync_foundation.aliases[syncId]={entityType:type,localId:String(localId)};}
function localIdForSync(state,syncId){return metaForSync(state,syncId)?.localId??null;}
function syncIdForLocal(state,type,localId){return metaForLocal(state,type,localId)?.syncId??null;}
function scheduleRow(state){return {id:'global',nextWorkoutSyncId:state?.app_state?.nextWorkoutId==null?null:syncIdForLocal(state,'workout_template',state.app_state.nextWorkoutId),nextSessionAt:state?.app_state?.nextSessionAt??null};}
function rowForMeta(state,meta){if(meta.entityType==='programme_schedule')return scheduleRow(state);const arr=state[TYPE_TO_ARRAY[meta.entityType]]||[];return arr.find(x=>String(x.id)===String(meta.localId))||null;}
function cleanPayload(p){if(!p||typeof p!=='object')return p;return Object.fromEntries(Object.entries(p).filter(([k])=>!REF_KEYS.has(k)&&k!=='preferredId'));}

function recordPayload(state,meta){
  if(meta.deletedAt!=null)return null;
  if(meta.entityType==='programme_schedule'){const s=scheduleRow(state);return {nextWorkoutSyncId:s.nextWorkoutSyncId,nextSessionAt:s.nextSessionAt};}
  const row=rowForMeta(state,meta);if(!row)return null;
  const base={...clone(row)};delete base.id;
  switch(meta.entityType){
    case'workout_template': return base;
    case'user_exercise': return {...base,preferredId:String(row.id)};
    case'template_exercise':{
      delete base.workoutId;delete base.userExerciseId;
      return {...base,workoutSyncId:syncIdForLocal(state,'workout_template',row.workoutId),userExerciseSyncId:row.userExerciseId?syncIdForLocal(state,'user_exercise',row.userExerciseId):null};
    }
    case'workout_session':{
      delete base.workoutId;
      return {...base,workoutSyncId:row.workoutId!=null?syncIdForLocal(state,'workout_template',row.workoutId):null};
    }
    case'session_exercise':{
      delete base.sessionId;delete base.templateExerciseId;delete base.userExerciseId;
      return {...base,sessionSyncId:syncIdForLocal(state,'workout_session',row.sessionId),templateExerciseSyncId:row.templateExerciseId!=null?syncIdForLocal(state,'template_exercise',row.templateExerciseId):null,userExerciseSyncId:row.userExerciseId?syncIdForLocal(state,'user_exercise',row.userExerciseId):null};
    }
    case'performed_set':{
      delete base.sessionExerciseId;
      return {...base,sessionExerciseSyncId:syncIdForLocal(state,'session_exercise',row.sessionExerciseId)};
    }
    case'tracker_item':{delete base.productiveStart;delete base.productiveEnd;return {...base,preferredId:String(row.id),productiveStartMinutes:timeToMinutes(row.productiveStart||'08:00'),productiveEndMinutes:timeToMinutes(row.productiveEnd||'22:00')};}
    case'tracker_entry':{
      delete base.itemId;
      return {...base,itemSyncId:syncIdForLocal(state,'tracker_item',row.itemId)};
    }
    default:return base;
  }
}

function eligibleCloudRecord(state,meta){
  if(meta.domain!=='workout_log'||meta.deletedAt!=null)return true;
  const row=rowForMeta(state,meta);if(!row)return false;
  let session=null;
  if(meta.entityType==='workout_session')session=row;
  else if(meta.entityType==='session_exercise')session=(state.workout_sessions||[]).find(x=>String(x.id)===String(row.sessionId));
  else if(meta.entityType==='performed_set'){
    const ex=(state.session_exercises||[]).find(x=>String(x.id)===String(row.sessionExerciseId));
    session=ex?(state.workout_sessions||[]).find(x=>String(x.id)===String(ex.sessionId)):null;
  }
  return !!session&&String(session.status||'').toUpperCase()!=='ACTIVE';
}

function remoteRecords(rows,state){
  const own=state.sync_foundation?.deviceId,all=[];
  for(const row of rows||[]){
    if(row?.entity_type==='device_snapshot'){
      const snap=row?.payload;if(!snap||snap.schema!=='gym-progress-sync-snapshot-v1'||!Array.isArray(snap.records))continue;
      if(snap.deviceId===own)continue;
      for(const r of snap.records){
        if(!TYPE_DOMAIN[r.entityType])continue;
        all.push({...r,domain:row.domain||TYPE_DOMAIN[r.entityType],sourceDeviceId:snap.deviceId||'legacy',sourceServerRevision:Number(row.server_revision||0),sourceUpdatedAt:row.updated_at||null,sourceKind:'legacy'});
      }
      continue;
    }
    if(!TYPE_DOMAIN[row?.entity_type]||!row?.sync_id)continue;
    all.push({
      domain:row.domain||TYPE_DOMAIN[row.entity_type],entityType:row.entity_type,syncId:row.sync_id,
      revision:Number(row.revision||1),deletedAt:asMs(row.deleted_at),updatedAt:asMs(row.updated_at)||0,
      payload:row.payload??null,sourceDeviceId:'cloud',sourceServerRevision:Number(row.server_revision||0),sourceUpdatedAt:row.updated_at||null,sourceKind:'record'
    });
  }
  const better=(a,b)=>{
    if(Number(a.revision)!==Number(b.revision))return Number(a.revision)>Number(b.revision);
    if(a.sourceKind!==b.sourceKind)return a.sourceKind==='record';
    if(Number(a.updatedAt)!==Number(b.updatedAt))return Number(a.updatedAt)>Number(b.updatedAt);
    return Number(a.sourceServerRevision)>Number(b.sourceServerRevision);
  };
  const best=new Map();
  for(const r of all){const prev=best.get(r.syncId);if(!prev||better(r,prev))best.set(r.syncId,r);}
  return [...best.values()].sort((a,b)=>ORDER.indexOf(a.entityType)-ORDER.indexOf(b.entityType));
}

function logicalMatch(state,type,p){
  if(type==='programme_schedule')return {id:'global'};
  const arr=state[TYPE_TO_ARRAY[type]]||[];
  switch(type){
    case'workout_template':return arr.find(x=>norm(x.name)===norm(p?.name)&&Number(x.position)===Number(p?.position))||null;
    case'user_exercise':return arr.find(x=>(p?.preferredId&&String(x.id)===String(p.preferredId))||(p?.canonicalExerciseId&&x.canonicalExerciseId===p.canonicalExerciseId)||(norm(x.displayName)===norm(p?.displayName)&&x.equipment===p?.equipment))||null;
    case'template_exercise':{
      if(p?.programmeExerciseId){const exact=arr.find(x=>x.programmeExerciseId===p.programmeExerciseId);if(exact)return exact;}
      const parent=localIdForSync(state,p?.workoutSyncId),user=localIdForSync(state,p?.userExerciseSyncId);
      return arr.find(x=>String(x.workoutId)===String(parent)&&Number(x.position)===Number(p?.position)&&((user&&String(x.userExerciseId)===String(user))||norm(x.name)===norm(p?.name)))||null;
    }
    case'workout_session':return arr.find(x=>Number(x.startedAt)===Number(p?.startedAt)&&norm(x.workoutName)===norm(p?.workoutName))||null;
    case'session_exercise':{
      const parent=localIdForSync(state,p?.sessionSyncId),user=localIdForSync(state,p?.userExerciseSyncId);
      return arr.find(x=>String(x.sessionId)===String(parent)&&Number(x.position)===Number(p?.position)&&((p?.programmeExerciseId&&x.programmeExerciseId===p.programmeExerciseId)||(p?.canonicalExerciseId&&x.canonicalExerciseId===p.canonicalExerciseId)||(user&&String(x.userExerciseId)===String(user))||norm(x.name)===norm(p?.name)))||null;
    }
    case'performed_set':{const parent=localIdForSync(state,p?.sessionExerciseSyncId);return arr.find(x=>String(x.sessionExerciseId)===String(parent)&&Number(x.setNumber)===Number(p?.setNumber))||null;}
    case'tracker_item':return arr.find(x=>(p?.preferredId&&String(x.id)===String(p.preferredId))||(norm(x.name)===norm(p?.name)&&Number(x.position)===Number(p?.position)))||null;
    case'tracker_entry':{const parent=localIdForSync(state,p?.itemSyncId);return arr.find(x=>String(x.itemId)===String(parent)&&String(x.localDate)===String(p?.localDate))||null;}
    default:return null;
  }
}

function makeLocalRow(state,type,p,existing=null){
  const arr=state[TYPE_TO_ARRAY[type]]||[],base=cleanPayload(clone(p||{}));
  if(existing)base.id=existing.id;
  else if(NUMERIC_TYPES.has(type))base.id=nextNumericId(arr);
  else {const preferred=String(p?.preferredId||'');base.id=preferred&&!arr.some(x=>String(x.id)===preferred)?preferred:uuid();}
  if(type==='template_exercise'){base.workoutId=Number(localIdForSync(state,p.workoutSyncId));base.userExerciseId=p.userExerciseSyncId?localIdForSync(state,p.userExerciseSyncId):null;}
  if(type==='workout_session'){const wid=p.workoutSyncId?localIdForSync(state,p.workoutSyncId):null;base.workoutId=wid==null?null:Number(wid);}
  if(type==='session_exercise'){base.sessionId=Number(localIdForSync(state,p.sessionSyncId));const te=p.templateExerciseSyncId?localIdForSync(state,p.templateExerciseSyncId):null;base.templateExerciseId=te==null?null:Number(te);base.userExerciseId=p.userExerciseSyncId?localIdForSync(state,p.userExerciseSyncId):null;}
  if(type==='performed_set')base.sessionExerciseId=Number(localIdForSync(state,p.sessionExerciseSyncId));
  if(type==='tracker_item'){base.productiveStart=minutesToTime(p.productiveStartMinutes??480);base.productiveEnd=minutesToTime(p.productiveEndMinutes??1320);delete base.productiveStartMinutes;delete base.productiveEndMinutes;delete base.preferredId;}
  if(type==='tracker_entry')base.itemId=localIdForSync(state,p.itemSyncId);
  return base;
}

function removeRow(state,type,localId){
  if(type==='programme_schedule'){state.app_state.nextWorkoutId=null;state.app_state.nextSessionAt=null;return;}
  if(type==='workout_session'){
    const exIds=new Set((state.session_exercises||[]).filter(x=>String(x.sessionId)===String(localId)).map(x=>String(x.id)));
    state.workout_sessions=(state.workout_sessions||[]).filter(x=>String(x.id)!==String(localId));
    state.session_exercises=(state.session_exercises||[]).filter(x=>String(x.sessionId)!==String(localId));
    state.performed_sets=(state.performed_sets||[]).filter(x=>!exIds.has(String(x.sessionExerciseId)));
    return;
  }
  if(type==='session_exercise'){state.performed_sets=(state.performed_sets||[]).filter(x=>String(x.sessionExerciseId)!==String(localId));}
  if(type==='tracker_item'){state.tracker_entries=(state.tracker_entries||[]).filter(x=>String(x.itemId)!==String(localId));}
  const name=TYPE_TO_ARRAY[type];state[name]=(state[name]||[]).filter(x=>String(x.id)!==String(localId));
}
function saveRow(state,type,row){const name=TYPE_TO_ARRAY[type],arr=state[name]||[],i=arr.findIndex(x=>String(x.id)===String(row.id));if(i>=0)arr[i]=row;else arr.push(row);state[name]=arr;}
function localPayloadForMeta(state,meta){return recordPayload(state,meta);}
function setMetaFromRemote(state,type,rowId,remote,{pending=false,preserveSyncId=true}={}){
  const k=key(type,rowId),old=state.sync_foundation.records[k]||{};
  const syncId=preserveSyncId&&old.syncId?old.syncId:remote.syncId;
  state.sync_foundation.records[k]={...old,domain:TYPE_DOMAIN[type],entityType:type,localId:String(rowId),syncId,revision:Number(remote.revision||1),deletedAt:remote.deletedAt??null,updatedAt:Number(remote.updatedAt||Date.now()),pending,fingerprint:remote.deletedAt==null?JSON.stringify(stable(rowForMeta(state,{entityType:type,localId:String(rowId)}))):null,legacy:false};
  if(remote.syncId!==syncId)registerAlias(state,remote.syncId,type,rowId);
  return state.sync_foundation.records[k];
}
function adoptMeta(state,type,rowId,remote){
  const k=key(type,rowId),m=state.sync_foundation.records[k]||{};
  m.domain=TYPE_DOMAIN[type];m.entityType=type;m.localId=String(rowId);m.syncId=m.syncId||remote.syncId;state.sync_foundation.records[k]=m;
  if(remote.syncId!==m.syncId)registerAlias(state,remote.syncId,type,rowId);
  return m;
}
function localState(state,m){return {revision:Number(m?.revision||0),deletedAt:m?.deletedAt??null,payload:m?localPayloadForMeta(state,m):null,pending:!!m?.pending};}
function sameRecordState(local,remote){return (local.deletedAt!=null)===(remote.deletedAt!=null)&&(local.deletedAt!=null||same(local.payload,remote.payload));}
function isConflict(local,remote){return local.pending&&!sameRecordState(local,remote)&&local.revision<=Number(remote.revision||0);}

function findLocalForRemote(state,remote){
  let m=metaForSync(state,remote.syncId),row=m?rowForMeta(state,m):null;
  if(!row&&!m&&remote.deletedAt==null){row=logicalMatch(state,remote.entityType,remote.payload);if(row){m=metaForLocal(state,remote.entityType,row.id)||adoptMeta(state,remote.entityType,row.id,remote);if(m?.syncId!==remote.syncId)registerAlias(state,remote.syncId,remote.entityType,row.id);}}
  return {m,row};
}

export async function getTrainingSyncPreview(state){
  ensureSyncFoundation(state);const rows=await listTrainingSyncRecords(),remotes=remoteRecords(rows,state);
  const counts={workouts:0,exercises:0,schedule:0,logs:0,tracker:0,conflicts:0,remoteRecords:remotes.length,cloudDevices:new Set(remotes.map(r=>r.sourceDeviceId)).size};
  for(const r of remotes){
    const {m,row}=findLocalForRemote(state,r);if(!m&&!row&&r.deletedAt!=null)continue;
    const local=m?localState(state,m):{revision:0,deletedAt:null,payload:null,pending:false};
    const different=!m||!sameRecordState(local,r);if(!different)continue;
    if(r.entityType==='workout_template')counts.workouts++;
    else if(r.entityType==='template_exercise'||r.entityType==='user_exercise')counts.exercises++;
    else if(r.entityType==='programme_schedule')counts.schedule++;
    else if(r.entityType==='workout_session')counts.logs++;
    else if(r.entityType.startsWith('tracker_'))counts.tracker++;
    if(m&&isConflict(local,r))counts.conflicts++;
  }
  const pending=Object.values(state.sync_foundation.records).filter(r=>r.pending);
  counts.localWorkouts=pending.filter(r=>r.entityType==='workout_template').length;
  counts.localExercises=pending.filter(r=>r.entityType==='template_exercise'||r.entityType==='user_exercise').length;
  counts.localSchedule=pending.filter(r=>r.entityType==='programme_schedule').length;
  counts.localLogs=pending.filter(r=>r.entityType==='workout_session').length;
  counts.localTracker=pending.filter(r=>r.domain==='tracker').length;
  counts.rows=rows;counts.remotes=remotes;return counts;
}

function applyRemotePayload(state,type,row,remote){
  if(type==='programme_schedule'){
    const wid=remote.payload?.nextWorkoutSyncId?localIdForSync(state,remote.payload.nextWorkoutSyncId):null;
    state.app_state.nextWorkoutId=wid==null?null:Number(wid);
    state.app_state.nextSessionAt=remote.payload?.nextSessionAt??null;
    return true;
  }
  if(row){const desired=makeLocalRow(state,type,remote.payload,row);if(!same(row,desired)){saveRow(state,type,desired);return true;}return false;}
  const desired=makeLocalRow(state,type,remote.payload,null);
  if((type==='template_exercise'&&!Number.isFinite(desired.workoutId))||(type==='session_exercise'&&!Number.isFinite(desired.sessionId))||(type==='performed_set'&&!Number.isFinite(desired.sessionExerciseId))||(type==='tracker_entry'&&!desired.itemId))return false;
  saveRow(state,type,desired);return desired.id;
}

function cloudRowForMeta(state,meta){
  const payload=recordPayload(state,meta);
  return {domain:meta.domain,entity_type:meta.entityType,sync_id:meta.syncId,revision:Number(meta.revision||1),deleted_at:meta.deletedAt==null?null:new Date(Number(meta.deletedAt)).toISOString(),payload};
}

export async function runTrainingSync(state,{domains=['programme','workout_log','tracker'],conflictPolicy='local',preview=null}={}){
  ensureSyncFoundation(state);const fetched=preview?.rows||await listTrainingSyncRecords(),remotes=preview?.remotes||remoteRecords(fetched,state),enabled=new Set(domains);let changed=false,conflicts=0;
  const byType=Object.fromEntries(ORDER.map(t=>[t,remotes.filter(r=>r.entityType===t&&enabled.has(TYPE_DOMAIN[t]))]));
  for(const type of ORDER){
    for(const remote of byType[type]){
      let {m,row}=findLocalForRemote(state,remote);
      if(!m&&!row&&remote.deletedAt!=null)continue;
      if(row&&!m)m=adoptMeta(state,type,row.id,remote);
      if(!m&&type==='programme_schedule')m=metaForLocal(state,type,'global');
      const local=m?localState(state,m):null;
      if(local&&sameRecordState(local,remote)){
        if(Number(remote.revision||0)>local.revision){m.revision=Number(remote.revision);m.updatedAt=Math.max(Number(m.updatedAt||0),Number(remote.updatedAt||0));}
        if(m.syncId!==remote.syncId)registerAlias(state,remote.syncId,type,m.localId);
        continue;
      }
      if(local&&local.revision>Number(remote.revision||0)){
        // Cloud copy is stale. Preserve the newer local version and repair cloud below.
        m.pending=true;continue;
      }
      const conflict=local&&isConflict(local,remote);
      if(conflict){
        conflicts++;
        if(conflictPolicy==='local'){
          m.revision=Math.max(local.revision,Number(remote.revision||0))+1;m.updatedAt=Date.now();m.pending=true;
          if(m.syncId!==remote.syncId)registerAlias(state,remote.syncId,type,m.localId);
          continue;
        }
      }
      if(remote.deletedAt!=null){
        if(m){removeRow(state,type,m.localId);setMetaFromRemote(state,type,m.localId,remote,{pending:false});changed=true;}
        continue;
      }
      if(!remote.payload)continue;
      if(m&&row){
        if(applyRemotePayload(state,type,row,remote)===true)changed=true;
        setMetaFromRemote(state,type,m.localId,remote,{pending:false});
      }else if(m&&type==='programme_schedule'){
        if(applyRemotePayload(state,type,{id:'global'},remote)===true)changed=true;
        setMetaFromRemote(state,type,'global',remote,{pending:false});
      }else{
        const created=applyRemotePayload(state,type,null,remote);if(created===false)continue;
        const newId=created===true?'global':created;setMetaFromRemote(state,type,newId,remote,{pending:false,preserveSyncId:false});changed=true;
      }
    }
  }

  ensureSyncFoundation(state);
  const uploadCandidates=Object.values(state.sync_foundation.records).filter(m=>enabled.has(m.domain)&&eligibleCloudRecord(state,m));
  const uploadBySyncId=new Map();
  for(const m of uploadCandidates){
    if(!m?.syncId)continue;const prev=uploadBySyncId.get(m.syncId);
    if(!prev||Number(m.revision||0)>Number(prev.revision||0)||(Number(m.revision||0)===Number(prev.revision||0)&&Number(m.updatedAt||0)>Number(prev.updatedAt||0))||(Number(m.revision||0)===Number(prev.revision||0)&&Number(m.updatedAt||0)===Number(prev.updatedAt||0)&&m.deletedAt!=null&&prev.deletedAt==null))uploadBySyncId.set(m.syncId,m);
  }
  const upload=[...uploadBySyncId.values()];
  for(let i=0;i<upload.length;i+=200)await upsertTrainingSyncRecords(upload.slice(i,i+200).map(m=>cloudRowForMeta(state,m)));
  // Old 1.5.0/1.6.0 clients stored whole-device snapshots. Once canonical record rows
  // exist, remove those legacy rows so they cannot keep reintroducing stale state.
  await deleteLegacyTrainingSyncSnapshots([...enabled]);
  const maxCursor=Math.max(0,...(fetched||[]).map(x=>Number(x.server_revision||0)));
  const completedAt=Date.now();
  for(const domain of enabled){
    Object.values(state.sync_foundation.records).filter(r=>r.domain===domain&&eligibleCloudRecord(state,r)).forEach(r=>{r.pending=false;});
    const d=state.sync_foundation.domains[domain];d.enabled=true;d.lastSuccessfulSyncAt=completedAt;d.serverCursor=String(maxCursor);d.status='Synced';
  }
  return {changed,conflicts};
}

export function enabledSyncDomains(state){return ['programme','workout_log','tracker'].filter(d=>state?.sync_foundation?.domains?.[d]?.enabled);}
export function syncStatusLabel(state){
  const ds=state?.sync_foundation?.domains||{},enabled=enabledSyncDomains(state);if(!enabled.length)return'Not enabled';
  const pending=Object.values(state?.sync_foundation?.records||{}).some(r=>r.pending&&enabled.includes(r.domain));if(pending)return'Changes pending';
  const times=enabled.map(d=>Number(ds[d]?.lastSuccessfulSyncAt||0)).filter(Boolean);return times.length?`Synced ${new Date(Math.min(...times)).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Enabled';
}
