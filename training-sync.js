import {uuid} from './exercise-identity.js';
import {ensureSyncFoundation} from './sync-foundation.js';
import {listTrainingSyncSnapshots,upsertTrainingSyncSnapshot} from './social-api.js';

const TYPE_TO_ARRAY={
  workout_template:'workout_templates',template_exercise:'template_exercises',user_exercise:'user_exercises',
  workout_session:'workout_sessions',session_exercise:'session_exercises',performed_set:'performed_sets',
  tracker_item:'tracker_items',tracker_entry:'tracker_entries'
};
const TYPE_DOMAIN={
  workout_template:'programme',template_exercise:'programme',user_exercise:'programme',
  workout_session:'workout_log',session_exercise:'workout_log',performed_set:'workout_log',
  tracker_item:'tracker',tracker_entry:'tracker'
};
const ORDER=['workout_template','user_exercise','template_exercise','workout_session','session_exercise','performed_set','tracker_item','tracker_entry'];
const REVERSE_ORDER=[...ORDER].reverse();
const NUMERIC_TYPES=new Set(['workout_template','template_exercise','workout_session','session_exercise','performed_set']);
const REF_KEYS=new Set(['workoutSyncId','userExerciseSyncId','sessionSyncId','templateExerciseSyncId','sessionExerciseSyncId','itemSyncId']);

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

function metaForLocal(state,type,localId){return state.sync_foundation?.records?.[key(type,localId)]||null;}
function metaForSync(state,syncId){return Object.values(state.sync_foundation?.records||{}).find(r=>r.syncId===syncId)||null;}
function localIdForSync(state,syncId){return metaForSync(state,syncId)?.localId??null;}
function syncIdForLocal(state,type,localId){return metaForLocal(state,type,localId)?.syncId??null;}
function rowForMeta(state,meta){const arr=state[TYPE_TO_ARRAY[meta.entityType]]||[];return arr.find(x=>String(x.id)===String(meta.localId))||null;}
function cleanPayload(p){if(!p||typeof p!=='object')return p;return Object.fromEntries(Object.entries(p).filter(([k])=>!REF_KEYS.has(k)&&k!=='preferredId'));}

function recordPayload(state,meta){
  if(meta.deletedAt!=null)return null;
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

function eligibleSnapshotRecord(state,meta){
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

function snapshot(state,domain){
  ensureSyncFoundation(state);
  const sync=state.sync_foundation,records=Object.values(sync.records)
    .filter(r=>r.domain===domain&&eligibleSnapshotRecord(state,r))
    .map(r=>({syncId:r.syncId,entityType:r.entityType,revision:Number(r.revision||1),deletedAt:r.deletedAt??null,updatedAt:Number(r.updatedAt||0),payload:recordPayload(state,r)}));
  return {schema:'gym-progress-sync-snapshot-v1',deviceId:sync.deviceId,domain,generatedAt:Date.now(),records};
}

function remoteRecords(rows,state){
  const own=state.sync_foundation?.deviceId,all=[];
  for(const row of rows||[]){
    const snap=row?.payload;if(!snap||snap.schema!=='gym-progress-sync-snapshot-v1'||!Array.isArray(snap.records))continue;
    if(snap.deviceId===own)continue;
    for(const r of snap.records)all.push({...r,domain:row.domain||TYPE_DOMAIN[r.entityType],sourceDeviceId:snap.deviceId,sourceServerRevision:Number(row.server_revision||0),sourceUpdatedAt:row.updated_at||null});
  }
  const best=new Map();
  for(const r of all){const prev=best.get(r.syncId);if(!prev||r.sourceServerRevision>prev.sourceServerRevision)best.set(r.syncId,r);}
  return [...best.values()].sort((a,b)=>ORDER.indexOf(a.entityType)-ORDER.indexOf(b.entityType));
}

function logicalMatch(state,type,p){
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
    case'performed_set':{
      const parent=localIdForSync(state,p?.sessionExerciseSyncId);return arr.find(x=>String(x.sessionExerciseId)===String(parent)&&Number(x.setNumber)===Number(p?.setNumber))||null;
    }
    case'tracker_item':return arr.find(x=>(p?.preferredId&&String(x.id)===String(p.preferredId))||(norm(x.name)===norm(p?.name)&&Number(x.position)===Number(p?.position)))||null;
    case'tracker_entry':{
      const parent=localIdForSync(state,p?.itemSyncId);return arr.find(x=>String(x.itemId)===String(parent)&&String(x.localDate)===String(p?.localDate))||null;
    }
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

function removeRow(state,type,localId){const name=TYPE_TO_ARRAY[type];state[name]=(state[name]||[]).filter(x=>String(x.id)!==String(localId));}
function saveRow(state,type,row){const name=TYPE_TO_ARRAY[type],arr=state[name]||[],i=arr.findIndex(x=>String(x.id)===String(row.id));if(i>=0)arr[i]=row;else arr.push(row);state[name]=arr;}
function setMeta(state,type,rowId,remote,{pending=false}={}){
  const k=key(type,rowId);state.sync_foundation.records[k]={domain:TYPE_DOMAIN[type],entityType:type,localId:String(rowId),syncId:remote.syncId,revision:Number(remote.revision||1),deletedAt:remote.deletedAt??null,updatedAt:Number(remote.updatedAt||Date.now()),pending,fingerprint:remote.deletedAt==null?JSON.stringify(stable(rowForMeta(state,{entityType:type,localId:String(rowId)}))):null,legacy:false};
}
function adoptMeta(state,type,rowId,remote){
  const k=key(type,rowId),m=state.sync_foundation.records[k]||{};m.domain=TYPE_DOMAIN[type];m.entityType=type;m.localId=String(rowId);m.syncId=remote.syncId;state.sync_foundation.records[k]=m;return m;
}

function localPayloadFor(state,type,row){const m=metaForLocal(state,type,row.id);return m?recordPayload(state,m):null;}
function conflictFor(state,type,row,remote){const m=metaForLocal(state,type,row.id);if(!m)return false;return !!m.pending&&!same(localPayloadFor(state,type,row),remote.payload);
}

export async function getTrainingSyncPreview(state){
  ensureSyncFoundation(state);const rows=await listTrainingSyncSnapshots(),remotes=remoteRecords(rows,state);
  const counts={workouts:0,exercises:0,logs:0,tracker:0,conflicts:0,remoteRecords:remotes.length,cloudDevices:new Set(remotes.map(r=>r.sourceDeviceId)).size};
  for(const r of remotes){
    const local=metaForSync(state,r.syncId),row=local?rowForMeta(state,local):logicalMatch(state,r.entityType,r.payload);
    const lp=row?localPayloadFor(state,r.entityType,row):null;
    const different=!row||r.deletedAt!=null||!same(lp,r.payload);
    if(!different)continue;
    if(r.entityType==='workout_template')counts.workouts++;
    else if(r.entityType==='template_exercise'||r.entityType==='user_exercise')counts.exercises++;
    else if(r.entityType==='workout_session')counts.logs++;
    else if(r.entityType.startsWith('tracker_'))counts.tracker++;
    if(row&&conflictFor(state,r.entityType,row,r))counts.conflicts++;
  }
  const pending=Object.values(state.sync_foundation.records).filter(r=>r.pending&&r.deletedAt==null);
  counts.localWorkouts=pending.filter(r=>r.entityType==='workout_template').length;
  counts.localExercises=pending.filter(r=>r.entityType==='template_exercise'||r.entityType==='user_exercise').length;
  counts.localLogs=pending.filter(r=>r.entityType==='workout_session').length;
  counts.localTracker=pending.filter(r=>r.domain==='tracker').length;
  counts.rows=rows;counts.remotes=remotes;return counts;
}

export async function runTrainingSync(state,{domains=['programme','workout_log','tracker'],conflictPolicy='local',preview=null}={}){
  ensureSyncFoundation(state);const fetched=preview?.rows||await listTrainingSyncSnapshots(),remotes=preview?.remotes||remoteRecords(fetched,state),enabled=new Set(domains);let changed=false,conflicts=0;
  const byType=Object.fromEntries(ORDER.map(t=>[t,remotes.filter(r=>r.entityType===t&&enabled.has(TYPE_DOMAIN[t]))]));
  for(const type of ORDER){
    for(const remote of byType[type]){
      let m=metaForSync(state,remote.syncId),row=m?rowForMeta(state,m):null;
      if(!row&&!m)row=logicalMatch(state,type,remote.payload);
      if(row&&!m)m=adoptMeta(state,type,row.id,remote);
      const hasConflict=row&&conflictFor(state,type,row,remote);
      if(hasConflict){conflicts++;if(conflictPolicy==='local'){m=adoptMeta(state,type,row.id,remote);m.pending=true;continue;}}
      if(remote.deletedAt!=null){
        if(row){removeRow(state,type,row.id);setMeta(state,type,row.id,remote,{pending:false});changed=true;}
        continue;
      }
      if(row){const desired=makeLocalRow(state,type,remote.payload,row);if(!same(row,desired)){saveRow(state,type,desired);changed=true;}setMeta(state,type,row.id,remote,{pending:false});}
      else {const desired=makeLocalRow(state,type,remote.payload,null);if((type==='template_exercise'&&!Number.isFinite(desired.workoutId))||(type==='session_exercise'&&!Number.isFinite(desired.sessionId))||(type==='performed_set'&&!Number.isFinite(desired.sessionExerciseId))||(type==='tracker_entry'&&!desired.itemId))continue;saveRow(state,type,desired);setMeta(state,type,desired.id,remote,{pending:false});changed=true;}
    }
  }
  ensureSyncFoundation(state);
  const maxCursor=Math.max(0,...(fetched||[]).map(x=>Number(x.server_revision||0)));
  for(const domain of enabled){
    const d=state.sync_foundation.domains[domain];d.enabled=true;d.status='Syncing';
    const snap=snapshot(state,domain),row={domain,entity_type:'device_snapshot',sync_id:d.snapshotSyncId,revision:1,deleted_at:null,payload:snap};
    await upsertTrainingSyncSnapshot(row);
    Object.values(state.sync_foundation.records).filter(r=>r.domain===domain).forEach(r=>{r.pending=false;});
    d.lastSuccessfulSyncAt=Date.now();d.serverCursor=String(maxCursor);d.status='Synced';
  }
  return {changed,conflicts};
}

export function enabledSyncDomains(state){return ['programme','workout_log','tracker'].filter(d=>state?.sync_foundation?.domains?.[d]?.enabled);}
export function syncStatusLabel(state){
  const ds=state?.sync_foundation?.domains||{},enabled=enabledSyncDomains(state);if(!enabled.length)return'Not enabled';
  const pending=Object.values(state?.sync_foundation?.records||{}).some(r=>r.pending&&enabled.includes(r.domain));if(pending)return'Changes pending';
  const times=enabled.map(d=>Number(ds[d]?.lastSuccessfulSyncAt||0)).filter(Boolean);return times.length?`Synced ${new Date(Math.min(...times)).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Enabled';
}
