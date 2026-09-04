import {uuid} from './exercise-identity.js';

const SCHEDULE_SYNC_ID='00000000-0000-4000-8000-000000000001';
const SCHEDULE_KEY='programme_schedule:global';

const DEFINITIONS=[
  ['programme','workout_template','workout_templates'],
  ['programme','template_exercise','template_exercises'],
  ['programme','user_exercise','user_exercises'],
  ['workout_log','workout_session','workout_sessions'],
  ['workout_log','session_exercise','session_exercises'],
  ['workout_log','performed_set','performed_sets'],
  ['tracker','tracker_item','tracker_items'],
  ['tracker','tracker_entry','tracker_entries']
];

function stableObject(value){
  if(value==null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stableObject);
  return Object.fromEntries(Object.keys(value).sort().filter(k=>!k.startsWith('__sync')).map(k=>[k,stableObject(value[k])]));
}
function fingerprint(record){return JSON.stringify(stableObject(record));}
function key(type,id){return `${type}:${String(id)}`;}
function newDomain(){return {enabled:false,lastSuccessfulSyncAt:null,serverCursor:null,snapshotSyncId:uuid(),status:'Not enabled'};}

/**
 * Local-first sync metadata. Every user-created training record receives a stable
 * cross-device UUID while the existing IndexedDB/local IDs remain untouched.
 */
export function ensureSyncFoundation(state,{migration=false}={}){
  state.sync_foundation=state.sync_foundation&&typeof state.sync_foundation==='object'?state.sync_foundation:{};
  const sync=state.sync_foundation;
  sync.version=2;
  sync.deviceId=sync.deviceId||uuid();
  sync.domains=sync.domains&&typeof sync.domains==='object'?sync.domains:{};
  for(const domain of ['programme','workout_log','tracker']){
    sync.domains[domain]={...newDomain(),...(sync.domains[domain]||{})};
    sync.domains[domain].snapshotSyncId=sync.domains[domain].snapshotSyncId||uuid();
  }
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

  // Training schedule is user-created programme state, not a device preference.
  // It uses one deterministic sync identity on every device and refers to the
  // workout by its cross-device sync ID rather than by a local numeric ID.
  const nextWorkoutId=state?.app_state?.nextWorkoutId;
  const nextWorkoutSyncId=nextWorkoutId==null?null:sync.records[key('workout_template',nextWorkoutId)]?.syncId||null;
  const scheduleValue={nextWorkoutSyncId,nextSessionAt:state?.app_state?.nextSessionAt??null};
  const scheduleFp=fingerprint(scheduleValue);seen.add(SCHEDULE_KEY);
  const schedule=sync.records[SCHEDULE_KEY];
  if(!schedule){
    sync.records[SCHEDULE_KEY]={domain:'programme',entityType:'programme_schedule',localId:'global',syncId:SCHEDULE_SYNC_ID,revision:1,deletedAt:null,updatedAt:timestamp,pending:true,fingerprint:scheduleFp,legacy:migration===true};
  }else if(schedule.deletedAt!=null||schedule.fingerprint!==scheduleFp){
    schedule.domain='programme';schedule.entityType='programme_schedule';schedule.localId='global';schedule.syncId=SCHEDULE_SYNC_ID;schedule.deletedAt=null;
    schedule.revision=Math.max(1,Number(schedule.revision||0)+1);schedule.updatedAt=timestamp;schedule.pending=true;schedule.fingerprint=scheduleFp;
  }else{schedule.syncId=SCHEDULE_SYNC_ID;}

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
    tracker:records.filter(r=>r.domain==='tracker'&&r.deletedAt==null).length,
    pending:records.filter(r=>r.pending).length,
    tombstones:records.filter(r=>r.deletedAt!=null).length
  };
}
