import {assertJSON,assertDataFields} from './data-contract.js';
import {uuid} from './exercise-identity.js';
import {TYPE_TO_ARRAY,TYPE_DOMAIN,SYNC_ORDER,syncKey,cloneSync,scheduleValue,syncFingerprint,sameSyncValue} from './sync-foundation.js';

export const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid=value=>typeof value==='string'&&UUID_PATTERN.test(value);
export class SyncDataError extends Error {constructor(code,message,details={}){super(message);this.name='SyncDataError';this.code=code;this.details=details;}}
export const REFERENCES={
  template_exercise:[['workoutSyncId','workout_template','workoutId',true],['userExerciseSyncId','user_exercise','userExerciseId',false]],
  workout_session:[['workoutSyncId','workout_template','workoutId',false]],
  session_exercise:[['sessionSyncId','workout_session','sessionId',true],['templateExerciseSyncId','template_exercise','templateExerciseId',false],['userExerciseSyncId','user_exercise','userExerciseId',false]],
  performed_set:[['sessionExerciseSyncId','session_exercise','sessionExerciseId',true]],
  tracker_state:[['itemSyncId','tracker_item','itemId',true]],
  tracker_entry:[['itemSyncId','tracker_item','itemId',true]],
  programme_schedule:[['nextWorkoutSyncId','workout_template','nextWorkoutId',false]]
};
const NUMERIC_TYPES=new Set(['workout_template','template_exercise','workout_session','session_exercise','performed_set']);
const ALL_REFERENCE_FIELDS=new Set(Object.values(REFERENCES).flat().map(([wire])=>wire));
export const localIdOf=(type,row)=>type==='tracker_state'?row?.itemId:type==='programme_schedule'?'global':row?.id;
export function metaForLocal(state,type,id){return id==null?null:state.sync_foundation?.records?.[syncKey(type,id)]||null;}
export function metaForSync(state,type,id){
  if(!id)return null;
  const direct=Object.values(state.sync_foundation?.records||{}).find(m=>m.entityType===type&&m.syncId===id);
  if(direct)return direct;
  const alias=state.sync_foundation?.aliases?.[id];
  return alias?.entityType===type?metaForLocal(state,type,alias.localId):null;
}
export function rowForMeta(state,meta){
  if(!meta)return null;
  if(meta.entityType==='programme_schedule')return {id:'global',...scheduleValue(state)};
  const key=meta.entityType==='tracker_state'?'itemId':'id';
  return (state[TYPE_TO_ARRAY[meta.entityType]]||[]).find(row=>String(row[key])===String(meta.localId))||null;
}
function minutes(value){
  const match=/^(\d{2}):(\d{2})$/.exec(String(value));
  if(!match||Number(match[1])>23||Number(match[2])>59)throw new SyncDataError('INVALID_TIME','Tracker time must be HH:mm.',{value});
  return Number(match[1])*60+Number(match[2]);
}
function clock(value){
  if(!Number.isInteger(value)||value<0||value>1439)throw new SyncDataError('INVALID_TIME','Tracker minute value is outside the day.',{value});
  return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
}
function basePayload(row){return Object.fromEntries(Object.entries(cloneSync(row)).filter(([key])=>key!=='id'&&!key.startsWith('__sync')&&!ALL_REFERENCE_FIELDS.has(key)));}
export function recordPayload(state,meta){
  if(meta.deletedAt!=null)return null;
  const row=rowForMeta(state,meta);if(!row)throw new SyncDataError('MISSING_LOCAL_RECORD','The local record is missing.',{entityType:meta.entityType,localId:meta.localId});
  const source=meta.entityType==='programme_schedule'?state.app_state:row;
  const payload=meta.entityType==='programme_schedule'?{...cloneSync(meta.serverPayload||{}),nextSessionAt:state.app_state?.nextSessionAt??null}:basePayload(row);
  for(const [wire,type,localField,required] of REFERENCES[meta.entityType]||[]){
    delete payload[localField];
    const localId=source?.[localField],parent=localId==null?null:metaForLocal(state,type,localId);
    const savedReference=meta.unresolvedReferences?.[wire];
    const value=parent?.syncId||(localId==null?savedReference||null:null);
    if((required||localId!=null)&&!isUuid(value))throw new SyncDataError('MISSING_PARENT','A referenced record has no stable sync identity.',{wire,type,localId});
    payload[wire]=value;
  }
  if(['user_exercise','tracker_item','tracker_entry'].includes(meta.entityType))payload.preferredId=meta.wirePreferredId??String(row.id);
  if(meta.entityType==='tracker_item'){
    if(row.productiveStart!=null){payload.productiveStartMinutes=minutes(row.productiveStart);delete payload.productiveStart;}
    if(row.productiveEnd!=null){payload.productiveEndMinutes=minutes(row.productiveEnd);delete payload.productiveEnd;}
  }
  return payload;
}
export function eligibleForUpload(state,meta){
  if(meta.suppressed||meta.aliasOf||!TYPE_DOMAIN[meta.entityType])return false;
  if(meta.domain!=='workout_log'||meta.deletedAt!=null)return true;
  const row=rowForMeta(state,meta);if(!row)return false;
  let session=row;
  if(meta.entityType==='session_exercise')session=(state.workout_sessions||[]).find(s=>String(s.id)===String(row.sessionId));
  if(meta.entityType==='performed_set'){
    const exercise=(state.session_exercises||[]).find(e=>String(e.id)===String(row.sessionExerciseId));
    session=exercise&&(state.workout_sessions||[]).find(s=>String(s.id)===String(exercise.sessionId));
  }
  return !!session&&['COMPLETE','ABORTED'].includes(session.status);
}
export function validateRemoteRecord(record){
  try{assertJSON(record);if(record?.deleted_at==null)assertDataFields(record?.payload);}catch(error){throw new SyncDataError('INVALID_REMOTE_FIELDS',error.message);}
  if(!record||!TYPE_DOMAIN[record.entity_type]||!isUuid(record.entity_id)||!Number.isSafeInteger(record.revision)||record.revision<1||!Number.isSafeInteger(record.cursor)||record.cursor<0)throw new SyncDataError('INVALID_REMOTE_ENVELOPE','Invalid sync record envelope.',{record:cloneSync(record)});
  if(record.alias_of!=null&&(!isUuid(record.alias_of)||record.alias_of===record.entity_id))throw new SyncDataError('INVALID_REMOTE_ALIAS','Invalid server identity alias.',{record:cloneSync(record)});
  if(record.deleted_at!=null&&!Number.isFinite(Date.parse(record.deleted_at)))throw new SyncDataError('INVALID_REMOTE_TOMBSTONE','Invalid deletion timestamp.',{record:cloneSync(record)});
  if(record.deleted_at==null&&(!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload)))throw new SyncDataError('INVALID_REMOTE_PAYLOAD','A live record must contain an object payload.',{record:cloneSync(record)});
  for(const [wire,, ,required] of REFERENCES[record.entity_type]||[]){
    const value=record.payload?.[wire];
    if(record.deleted_at==null&&(required||value!=null)&&!isUuid(value))throw new SyncDataError('INVALID_REMOTE_PARENT','A remote parent UUID is missing or invalid.',{record:cloneSync(record),wire});
  }
  return record;
}
const nextNumericId=rows=>rows.reduce((max,row)=>Number.isSafeInteger(row.id)&&row.id>=0?Math.max(max,row.id):max,0)+1;
export function decodeRemoteRow(state,record,existing=null){
  const type=record.entity_type,payload=record.payload||{},row=Object.fromEntries(Object.entries(cloneSync(payload)).filter(([key])=>!ALL_REFERENCE_FIELDS.has(key)&&key!=='preferredId'&&key!=='id'));
  const unresolvedReferences={};
  for(const [wire,parentType,localField,required] of REFERENCES[type]||[]){
    const reference=payload[wire],meta=reference?metaForSync(state,parentType,reference):null,parent=meta?rowForMeta(state,meta):null;
    if(required&&(!meta||!parent||meta.deletedAt!=null))return {deferred:true,reason:'MISSING_PARENT',wire,reference};
    if(reference&&(!meta||!parent||meta.deletedAt!=null))unresolvedReferences[wire]=reference;
    const id=meta&&parent&&meta.deletedAt==null?meta.localId:null;
    row[localField]=id==null?null:NUMERIC_TYPES.has(parentType)?Number(id):String(id);
  }
  const rows=state[TYPE_TO_ARRAY[type]]||[];
  if(type==='programme_schedule')row.id='global';
  else if(type==='tracker_state'){
    const collision=rows.find(item=>String(item.itemId)===String(row.itemId)&&item!==existing);
    if(collision)return {deferred:true,reason:'LOCAL_KEY_COLLISION',record:cloneSync(collision)};
  }else if(existing)row.id=existing.id;
  else if(NUMERIC_TYPES.has(type))row.id=nextNumericId(rows);
  else{
    const preferred=typeof payload.preferredId==='string'&&payload.preferredId.length<=200?payload.preferredId:null;
    row.id=preferred&&!rows.some(item=>String(item.id)===preferred)?preferred:uuid();
  }
  if(type==='tracker_item'){
    if(payload.productiveStartMinutes!=null){row.productiveStart=clock(payload.productiveStartMinutes);delete row.productiveStartMinutes;}
    if(payload.productiveEndMinutes!=null){row.productiveEnd=clock(payload.productiveEndMinutes);delete row.productiveEndMinutes;}
  }
  return {row,unresolvedReferences,wirePreferredId:payload.preferredId};
}
export function saveLocalRow(state,type,row){
  if(type==='programme_schedule'){state.app_state=state.app_state||{};state.app_state.nextWorkoutId=row.nextWorkoutId;state.app_state.nextSessionAt=row.nextSessionAt??null;return;}
  const name=TYPE_TO_ARRAY[type],array=state[name]||(state[name]=[]),id=localIdOf(type,row),index=array.findIndex(item=>String(localIdOf(type,item))===String(id));
  if(index<0)array.push(row);else array[index]=row;
}
export function requiredDependants(state,meta){
  const children=[];
  for(const [type,references] of Object.entries(REFERENCES))for(const [,parentType,field,required] of references){
    if(!required||parentType!==meta.entityType)continue;
    for(const row of state[TYPE_TO_ARRAY[type]]||[])if(String(row[field])===String(meta.localId))children.push({entityType:type,localId:localIdOf(type,row)});
  }
  return children;
}
export function removeLocalRow(state,meta){
  if(meta.entityType==='programme_schedule'){state.app_state.nextWorkoutId=null;state.app_state.nextSessionAt=null;return;}
  const name=TYPE_TO_ARRAY[meta.entityType];state[name]=(state[name]||[]).filter(row=>String(localIdOf(meta.entityType,row))!==String(meta.localId));
}
export function archiveLocalVersion(state,meta,reason){
  const row=rowForMeta(state,meta);if(!row)return;
  const archive=state.sync_foundation.recoveryArchive,entry={entityType:meta.entityType,syncId:meta.syncId,localId:meta.localId,serverRevision:meta.serverRevision,reason,record:cloneSync(row)};
  if(!archive.some(old=>sameSyncValue(old,entry)))archive.push(entry);
}
export function adoptRemoteMetadata(state,record,row,{unresolvedReferences={},wirePreferredId}={}){
  const type=record.entity_type,id=localIdOf(type,row),key=syncKey(type,id),prior=state.sync_foundation.records[key]||{};
  const meta={...prior,domain:TYPE_DOMAIN[type],entityType:type,localId:String(id),syncId:record.entity_id,revision:Math.max(1,Number(prior.revision)||1),serverRevision:record.revision,deletedAt:record.deleted_at==null?null:Date.parse(record.deleted_at),updatedAt:Date.parse(record.updated_at)||Date.now(),pending:false,fingerprint:record.deleted_at==null?syncFingerprint(type==='programme_schedule'?scheduleValue(state):row):null,serverPayload:cloneSync(record.payload),unresolvedReferences,legacy:false,unbased:false};
  if(wirePreferredId!=null)meta.wirePreferredId=wirePreferredId;
  state.sync_foundation.records[key]=meta;return meta;
}
export function localMatchesRemote(state,meta,remote){
  if((meta.deletedAt!=null)!==(remote.deleted_at!=null))return false;
  if(meta.deletedAt!=null)return true;
  try{return sameSyncValue(recordPayload(state,meta),remote.payload);}catch{return false;}
}
export function operationMatchesLocal(state,meta,operation){
  if((meta.deletedAt!=null)!==(operation.deleted_at!=null))return false;
  if(meta.deletedAt!=null)return true;
  try{return sameSyncValue(recordPayload(state,meta),operation.payload);}catch{return false;}
}
export function remoteOrder(a,b){
  if((a.deleted_at!=null)!==(b.deleted_at!=null))return a.deleted_at!=null?1:-1;
  const order=SYNC_ORDER.indexOf(a.entity_type)-SYNC_ORDER.indexOf(b.entity_type);
  return (a.deleted_at!=null?-order:order)||a.cursor-b.cursor;
}

/** Optional cross-domain references keep their wire UUID while a domain is disabled.
 * Reconnect them only through exact metadata/aliases when the parent becomes available.
 */
export function reconnectOptionalReferences(state){
  let changed=false;
  for(const meta of Object.values(state.sync_foundation.records)){
    const unresolved=meta.unresolvedReferences;if(!unresolved||meta.deletedAt!=null)continue;
    const row=meta.entityType==='programme_schedule'?state.app_state:rowForMeta(state,meta);if(!row)continue;
    const beforeFingerprint=syncFingerprint(meta.entityType==='programme_schedule'?scheduleValue(state):row);
    let rowChanged=false;
    for(const [wire,parentType,localField,required] of REFERENCES[meta.entityType]||[]){
      if(required||!unresolved[wire])continue;
      const parentMeta=metaForSync(state,parentType,unresolved[wire]),parent=parentMeta&&parentMeta.deletedAt==null?rowForMeta(state,parentMeta):null;
      if(!parent)continue;
      if(row[localField]==null){row[localField]=NUMERIC_TYPES.has(parentType)?Number(parentMeta.localId):String(parentMeta.localId);rowChanged=true;changed=true;}
      delete unresolved[wire];
    }
    if(rowChanged){
      // The parent link is derived, but unrelated edits made during the network
      // await remain local mutations. Never absorb them into a clean baseline.
      if(meta.fingerprint!==beforeFingerprint){meta.revision++;meta.pending=true;meta.updatedAt=Date.now();}
      meta.fingerprint=syncFingerprint(meta.entityType==='programme_schedule'?scheduleValue(state):row);
    }
  }
  return changed;
}
