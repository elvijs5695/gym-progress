import {uuid} from './exercise-identity.js';

const DEFINITIONS=[
  ['programme','workout_template','workout_templates'],
  ['programme','template_exercise','template_exercises'],
  ['programme','user_exercise','user_exercises'],
  ['workout_log','workout_session','workout_sessions'],
  ['workout_log','session_exercise','session_exercises'],
  ['workout_log','performed_set','performed_sets']
];

function stableObject(value){
  if(value==null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stableObject);
  return Object.fromEntries(Object.keys(value).sort().filter(k=>!k.startsWith('__sync')).map(k=>[k,stableObject(value[k])]));
}
function fingerprint(record){return JSON.stringify(stableObject(record));}
function key(type,id){return `${type}:${String(id)}`;}
function newDomain(){return {enabled:false,lastSuccessfulSyncAt:null,serverCursor:null};}

/**
 * Local-only sync metadata. It does not contact a server. Calling it before each
 * IndexedDB save makes future cloud exchange safe to add without changing the
 * IndexedDB database/store/key identity or replacing the local training state.
 */
export function ensureSyncFoundation(state,{migration=false}={}){
  state.sync_foundation=state.sync_foundation&&typeof state.sync_foundation==='object'?state.sync_foundation:{};
  const sync=state.sync_foundation;
  sync.version=1;
  sync.deviceId=sync.deviceId||uuid();
  sync.domains=sync.domains&&typeof sync.domains==='object'?sync.domains:{};
  sync.domains.programme={...newDomain(),...(sync.domains.programme||{})};
  sync.domains.workout_log={...newDomain(),...(sync.domains.workout_log||{})};
  sync.records=sync.records&&typeof sync.records==='object'?sync.records:{};
  const timestamp=Date.now(),seen=new Set();

  for(const [domain,type,arrayName] of DEFINITIONS){
    const rows=Array.isArray(state[arrayName])?state[arrayName]:[];
    for(const row of rows){
      if(row?.id==null)continue;
      const k=key(type,row.id),fp=fingerprint(row);seen.add(k);
      const existing=sync.records[k];
      if(!existing){
        sync.records[k]={domain,entityType:type,localId:String(row.id),syncId:uuid(),revision:1,deletedAt:null,updatedAt:timestamp,pending:true,fingerprint:fp,legacy:migration===true};
      }else if(existing.deletedAt!=null||existing.fingerprint!==fp){
        existing.domain=domain;existing.entityType=type;existing.localId=String(row.id);existing.deletedAt=null;
        existing.revision=Math.max(1,Number(existing.revision||0)+1);existing.updatedAt=timestamp;existing.pending=true;existing.fingerprint=fp;
      }
    }
  }
  for(const [k,record] of Object.entries(sync.records)){
    if(seen.has(k)||record.deletedAt!=null)continue;
    record.deletedAt=timestamp;record.updatedAt=timestamp;record.revision=Math.max(1,Number(record.revision||0)+1);record.pending=true;
  }
  return state;
}

export function syncFoundationCounts(state){
  const records=Object.values(state?.sync_foundation?.records||{});
  return {
    programme:records.filter(r=>r.domain==='programme'&&r.deletedAt==null).length,
    workoutLog:records.filter(r=>r.domain==='workout_log'&&r.deletedAt==null).length,
    pending:records.filter(r=>r.pending).length,
    tombstones:records.filter(r=>r.deletedAt!=null).length
  };
}
