import {uuid} from './exercise-identity.js';

export const SYNC_PROTOCOL=2;
export const SYNC_DOMAINS=['programme','workout_log','tracker'];
export const SCHEDULE_SYNC_ID='00000000-0000-4000-8000-000000000001';
export const SYNC_DEFINITIONS=[
  ['programme','workout_template','workout_templates'],
  ['programme','user_exercise','user_exercises'],
  ['programme','template_exercise','template_exercises'],
  ['workout_log','workout_session','workout_sessions'],
  ['workout_log','session_exercise','session_exercises'],
  ['workout_log','performed_set','performed_sets'],
  ['tracker','tracker_item','tracker_items'],
  ['tracker','tracker_state','tracker_states','itemId'],
  ['tracker','tracker_entry','tracker_entries']
];
export const TYPE_TO_ARRAY=Object.fromEntries(SYNC_DEFINITIONS.map(([,type,array])=>[type,array]));
export const TYPE_DOMAIN={...Object.fromEntries(SYNC_DEFINITIONS.map(([domain,type])=>[type,domain])),programme_schedule:'programme'};
export const SYNC_ORDER=['workout_template','user_exercise','template_exercise','programme_schedule','workout_session','session_exercise','performed_set','tracker_item','tracker_state','tracker_entry'];
export const syncKey=(type,id)=>`${type}:${String(id)}`;
export const cloneSync=value=>value==null?value:structuredClone(value);
export function stableSyncValue(value){
  if(value==null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stableSyncValue);
  return Object.fromEntries(Object.keys(value).sort().filter(key=>!key.startsWith('__sync')).map(key=>[key,stableSyncValue(value[key])]));
}
export const syncFingerprint=value=>JSON.stringify(stableSyncValue(value));
export const sameSyncValue=(a,b)=>syncFingerprint(a)===syncFingerprint(b);
const integer=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
const domainState=()=>({enabled:false,lastSuccessfulSyncAt:null,serverCursor:0,status:'Not enabled'});

export function scheduleValue(state){
  const next=state.app_state?.nextWorkoutId;
  return {nextWorkoutSyncId:next==null?null:state.sync_foundation?.records?.[syncKey('workout_template',next)]?.syncId??null,nextSessionAt:state.app_state?.nextSessionAt??null};
}

/** Local mutation generations and server revisions are deliberately separate.
 * Historical tracker rows, unknown fields and prior metadata are retained.
 * Account ownership is assigned by the account-workspace controller, never here.
 */
export function ensureSyncFoundation(state,{migration=false}={}){
  const prior=state.sync_foundation&&typeof state.sync_foundation==='object'?state.sync_foundation:{};
  const upgrading=prior.version!==4;
  if(prior.version!==4&&!prior.legacyFoundation&&Object.keys(prior).length)prior.legacyFoundation=cloneSync(prior);
  state.sync_foundation=prior;const sync=prior;
  const converted=state.v2?.protocol===2;
  sync.version=4;sync.protocol=SYNC_PROTOCOL;sync.deviceId=sync.deviceId||uuid();
  sync.workspaceId=sync.workspaceId||state.v2?.workspaceId||state.workspaceId||null;
  sync.legacyOwnerId=sync.legacyOwnerId||state.v2?.legacyOwnerId||state.workspace?.originOwnerId||null;
  sync.eraseEpoch=sync.eraseEpoch==null?null:integer(sync.eraseEpoch);
  sync.domains=sync.domains&&typeof sync.domains==='object'?sync.domains:{};
  for(const domain of SYNC_DOMAINS)sync.domains[domain]={...domainState(),...(sync.domains[domain]||{}),serverCursor:integer(sync.domains[domain]?.serverCursor)};
  sync.records=sync.records&&typeof sync.records==='object'?sync.records:{};
  sync.aliases=sync.aliases&&typeof sync.aliases==='object'?sync.aliases:{};
  for(const name of ['outbox','conflicts','resolvedConflicts','deferredRemote','recoveryArchive','outboxHistory','quarantine','suppressedIds','reviewArchive'])if(!Array.isArray(sync[name]))sync[name]=[];
  const seen=new Set(),availableTypes=new Set(),timestamp=Date.now();
  const observe=(domain,type,localId,row,suggestedSyncId=null)=>{
    const key=syncKey(type,localId),fingerprint=syncFingerprint(row);seen.add(key);
    let meta=sync.records[key];
    if(!meta){
      meta=sync.records[key]={domain,entityType:type,localId:String(localId),syncId:suggestedSyncId||uuid(),revision:1,serverRevision:0,deletedAt:null,updatedAt:timestamp,pending:true,fingerprint,legacy:migration===true};
    }else{
      meta.domain=domain;meta.entityType=type;meta.localId=String(localId);meta.syncId=meta.syncId||suggestedSyncId||uuid();
      if(meta.serverRevision==null){meta.serverRevision=0;meta.pending=true;meta.unbased=!converted;}
      meta.serverRevision=integer(meta.serverRevision);meta.revision=Math.max(1,integer(meta.revision));
      // The converter preserves decimal spelling (1.0); JSON numbers have the same
      // value in JS (1). Canonicalise equivalent fingerprints only on initial import.
      if(upgrading&&converted&&meta.pending===false&&typeof meta.fingerprint==='string'){
        try{if(sameSyncValue(JSON.parse(meta.fingerprint),row))meta.fingerprint=fingerprint;}catch{}
      }
      if(meta.deletedAt!=null||meta.fingerprint!==fingerprint){
        meta.revision++;meta.deletedAt=null;meta.updatedAt=timestamp;meta.pending=true;meta.fingerprint=fingerprint;
      }
    }
    if(sync.suppressedIds.includes(meta.syncId)){meta.suppressed=true;meta.pending=false;}
    return meta;
  };
  for(const [domain,type,array,idField='id'] of SYNC_DEFINITIONS){
    if(!Array.isArray(state[array]))continue;availableTypes.add(type);
    const identifiers=new Set();
    for(const row of state[array]){
      const id=row?.[idField];
      if(id==null||identifiers.has(String(id))){
        const issue={kind:'LOCAL_ID_INVALID',entityType:type,record:cloneSync(row)};
        if(!sync.quarantine.some(existing=>sameSyncValue(existing,issue)))sync.quarantine.push(issue);
        continue;
      }
      identifiers.add(String(id));observe(domain,type,id,row);
    }
  }
  const scheduleKey=syncKey('programme_schedule','global');
  if((state.workout_templates||[]).length||sync.records[scheduleKey]||state.app_state?.nextWorkoutId!=null||state.app_state?.nextSessionAt!=null){
    availableTypes.add('programme_schedule');observe('programme','programme_schedule','global',scheduleValue(state),SCHEDULE_SYNC_ID);
  }
  for(const [key,meta] of Object.entries(sync.records)){
    if(!availableTypes.has(meta.entityType)||seen.has(key)||meta.deletedAt!=null||meta.suppressed)continue;
    meta.deletedAt=timestamp;meta.updatedAt=timestamp;meta.revision=Math.max(1,integer(meta.revision)+1);meta.pending=true;meta.fingerprint=null;
  }
  return state;
}

export function syncFoundationCounts(state){
  const records=Object.values(state?.sync_foundation?.records||{});
  return {programme:records.filter(r=>r.domain==='programme'&&r.deletedAt==null).length,workoutLog:records.filter(r=>r.domain==='workout_log'&&r.deletedAt==null).length,tracker:records.filter(r=>r.domain==='tracker'&&r.deletedAt==null).length,pending:records.filter(r=>r.pending&&!r.suppressed).length,tombstones:records.filter(r=>r.deletedAt!=null).length,conflicts:(state?.sync_foundation?.conflicts||[]).filter(c=>!c.resolution).length};
}
