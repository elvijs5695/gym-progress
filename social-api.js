import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SOCIAL_CONFIGURED} from './social-config.js';

const SESSION_KEY=`gym-progress-v2-session:${SUPABASE_URL}`;
const REFRESH_LOCK_KEY=`gym-progress-v2-refresh:${SUPABASE_URL}`;
let session=readSession(),generation=0,refreshInFlight=null,workspaceStatus=null;
const requests=new Set();
const responseBodies=new WeakMap();
export class AccountChangedError extends Error {constructor(){super('Account changed during the request');this.name='AccountChangedError';}}
function readSession(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return s?.user?.id&&s?.access_token?s:null;}catch{return null;}}
function invalidate(){generation++;workspaceStatus=null;for(const c of requests)c.abort();requests.clear();}
function writeSession(value,{accountChange=false}={}){if(accountChange||session?.user?.id!==value?.user?.id)invalidate();session=value||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);}
function adoptStoredSession(next){const changed=session?.user?.id!==next?.user?.id;if(changed)invalidate();session=next;if(changed&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('gp:auth-changed'));return next;}
function sameCredentials(a,b){return a?.user?.id===b?.user?.id&&a?.access_token===b?.access_token&&a?.refresh_token===b?.refresh_token;}
function headers(token=session?.access_token){const h={apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json','x-client-info':'gym-progress/2.1.0; protocol=2'};if(token)h.Authorization=`Bearer ${token}`;return h;}
async function parse(res){const text=responseBodies.has(res)?responseBodies.get(res):await res.text();responseBodies.delete(res);let body;try{body=text?JSON.parse(text):null;}catch{body=text;}if(!res.ok){const e=new Error(body?.message||body?.error_description||body?.error||`HTTP ${res.status}`);e.status=res.status;e.code=body?.code||body?.error_code;const retry=Number(res.headers?.get('Retry-After'));e.retryAfterSeconds=Number.isFinite(retry)&&retry>0?retry:null;throw e;}return body;}
function configured(){if(!SOCIAL_CONFIGURED)throw new Error('The application connection is unavailable.');}
async function request(path,options={}){
 configured();const controller=new AbortController();let rejectAbort;
 const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason||new DOMException('Request aborted','AbortError'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
 const timer=setTimeout(()=>{const error=new Error('The request timed out. Please retry.');error.name='TimeoutError';controller.abort(error);},20000);requests.add(controller);
 // Fetch resolves at headers. Keep ownership cancellation and the deadline active
 // until the body is consumed as well; parse() uses this private buffered text.
 const download=(async()=>{const response=await fetch(`${SUPABASE_URL}${path}`,{...options,signal:controller.signal,cache:'no-store',credentials:'omit'});const text=await response.text();responseBodies.set(response,text);return response;})();
 try{return await Promise.race([download,aborted]);}finally{clearTimeout(timer);controller.signal.removeEventListener('abort',rejectAbort);requests.delete(controller);}
}
function checkGeneration(expected){if(expected!==generation)throw new AccountChangedError();}
export function authGeneration(){return generation;}
export function socialConfigured(){return SOCIAL_CONFIGURED;}
export function socialSession(){return session?structuredClone(session):null;}
export function socialUser(){return session?.user||null;}
export function socialOwnerId(){return workspaceStatus?.legacy_owner_id||null;}
export function socialSignedIn(){return !!session?.access_token;}
const otpRequests=new Map(),otpDeadlines=new Map();
let otpAttempt=0,otpEmail=null,otpVerification=0;
export class EmailOtpCancelledError extends Error {constructor(){super('Email sign-in was cancelled');this.name='EmailOtpCancelledError';}}
// Cancelling a dialog invalidates its authentication attempt, not an existing
// account session. Keep send requests/deadlines: mail may already be on its way.
export function cancelEmailOtp(){otpAttempt++;otpEmail=null;otpVerification++;}
function emailAddress(value){const email=String(value??'').trim();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');return email;}
function emailOtpAttempt(key){if(otpEmail!==key){cancelEmailOtp();otpEmail=key;}return otpAttempt;}
function checkEmailOtp(expected,attempt,verification=null){checkGeneration(expected);if(attempt!==otpAttempt||verification!==null&&verification!==otpVerification)throw new EmailOtpCancelledError();}
export function otpRetrySeconds(email){return Math.max(0,Math.ceil(((otpDeadlines.get(String(email??'').trim().toLowerCase())||0)-Date.now())/1000));}
function emailOtpCooldown(email){const error=new Error('Please wait before requesting another code.');error.code='OTP_COOLDOWN';error.retryAfterSeconds=Math.max(1,otpRetrySeconds(email));return error;}
export async function sendEmailOtp(value){
  const email=emailAddress(value),key=email.toLowerCase(),attempt=emailOtpAttempt(key),expected=generation;
  const pending=otpRequests.get(key);
  if(pending){if(pending.attempt===attempt&&pending.expected===expected)return pending.task;throw emailOtpCooldown(email);}
  if(otpRetrySeconds(email))throw emailOtpCooldown(email);
  // Reserve the cooldown before dispatch, including uncertain/network failures.
  // A cancelled/late response must not allow a second request to bypass it.
  otpDeadlines.set(key,Date.now()+60000);otpVerification++;
  const task=(async()=>{
    try{
      const result=await parse(await request('/auth/v1/otp',{method:'POST',headers:headers(null),body:JSON.stringify({email,create_user:true})}));
      otpDeadlines.set(key,Math.max(otpDeadlines.get(key)||0,Date.now()+60000));
      checkEmailOtp(expected,attempt);return result;
    }catch(error){
      if(error.status===429)otpDeadlines.set(key,Math.max(otpDeadlines.get(key)||0,Date.now()+Math.max(60,error.retryAfterSeconds||60)*1000));
      checkEmailOtp(expected,attempt);throw error;
    }
  })();
  const entry={attempt,expected,task};otpRequests.set(key,entry);
  try{return await task;}finally{if(otpRequests.get(key)===entry)otpRequests.delete(key);}
}
export async function verifyEmailOtp(value,code){
  const email=emailAddress(value),token=String(code??'').trim();
  if(!/^\d{6,10}$/.test(token))throw new Error('Enter the complete email code.');
  const expected=generation,attempt=emailOtpAttempt(email.toLowerCase()),verification=++otpVerification;
  try{
    const data=await parse(await request('/auth/v1/verify',{method:'POST',headers:headers(null),body:JSON.stringify({email,token,type:'email'})}));
    checkEmailOtp(expected,attempt,verification);
    if(typeof data?.user?.id!=='string'||!data.user.id||typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token)
      throw new Error('Authentication returned an incomplete session. Please try again.');
    writeSession(data,{accountChange:true});return data;
  }catch(error){checkEmailOtp(expected,attempt,verification);throw error;}
}
export async function refreshSocialSession(){
 if(refreshInFlight)return refreshInFlight;if(!session?.refresh_token)return null;
 const expected=generation,initial=session,userId=session.user.id;
 const currentStored=()=>{checkGeneration(expected);const latest=readSession();if(latest?.user?.id!==userId){adoptStoredSession(latest);throw new AccountChangedError();}return latest;};
 const refresh=async()=>{
   // Another tab may have completed rotation while this tab waited for the lock.
   const baseline=currentStored();adoptStoredSession(baseline);
   if(!sameCredentials(baseline,initial))return baseline;
   try{
     const data=await parse(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headers(null),body:JSON.stringify({refresh_token:baseline.refresh_token})}));
     const latest=currentStored();
     if(!sameCredentials(latest,baseline))return adoptStoredSession(latest);
     if(data?.user?.id!==userId)throw new AccountChangedError();
     if(typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token)throw new Error('The refreshed session is incomplete. Please sign in again.');
     writeSession(data);return data;
   }catch(error){
     const latest=currentStored();
     // A stale failed request must not sign out a newer same-user session.
     if(!sameCredentials(latest,baseline))return adoptStoredSession(latest);
     if([400,401,403].includes(Number(error?.status)))writeSession(null,{accountChange:true});throw error;
   }
 };
 const locks=globalThis.navigator?.locks;
 const task=locks?.request?locks.request(REFRESH_LOCK_KEY,{mode:'exclusive'},refresh):refresh();
 refreshInFlight=task;try{return await task;}finally{if(refreshInFlight===task)refreshInFlight=null;}
}
export async function signOutSocial(){const token=session?.access_token;writeSession(null,{accountChange:true});if(token){try{await request('/auth/v1/logout',{method:'POST',headers:headers(token)});}catch{}}}
async function authedFetch(path,options={}){
 if(!session?.access_token)throw new Error('Sign in to use your account.');const expected=generation;
 try{let res=await request(path,{...options,headers:{...headers(),...(options.headers||{})}});checkGeneration(expected);
 if(res.status===401&&session?.refresh_token){await refreshSocialSession();checkGeneration(expected);res=await request(path,{...options,headers:{...headers(),...(options.headers||{})}});}
 const body=await parse(res);checkGeneration(expected);return body;}catch(error){checkGeneration(expected);throw error;}
}
export async function rpc(name,args={}){if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('Invalid RPC name');return authedFetch(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(args)});}
export async function getWorkspaceStatus({refresh=false,workspaceId=null}={}){if(workspaceStatus&&!refresh&&(!workspaceId||workspaceStatus.workspace_id===workspaceId))return workspaceStatus;const result=workspaceId?await rpc('gp_v2_status',{p_workspace_id:workspaceId}):await rpc('gp_v2_ensure_workspace');if(result?.protocol!==2||result.minimum_client_protocol!=null&&(!Number.isSafeInteger(result.minimum_client_protocol)||result.minimum_client_protocol>2)){workspaceStatus=null;throw new Error('Database protocol 2 with a minimum client protocol of 2 or lower is required.');}workspaceStatus=result;return result;}
export async function getMyProfile(){if(!socialSignedIn())return null;await getWorkspaceStatus();const rows=await authedFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(socialOwnerId())}&select=id,display_name`);return rows?.[0]||null;}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key!==SESSION_KEY&&event.key!==null)return;adoptStoredSession(readSession());});

export async function setDisplayName(name){return rpc('social_set_display_name',{p_name:name});}
export async function findFriend(email){const r=await rpc('social_find_user_by_email',{p_email:email});return Array.isArray(r)?r[0]||null:r;}
export async function sendFriendRequest(email){return rpc('social_send_friend_request',{p_email:email});}
export async function listFriends(){return rpc('social_list_friends');}
export async function listIncomingRequests(){return rpc('social_list_incoming_requests');}
export async function listNotifications(limit=20){return rpc('social_list_notifications',{p_limit:limit});}
export async function acceptFriendRequest(id){return rpc('social_accept_friend_request',{p_request_id:id});}
export async function rejectFriendRequest(id){return rpc('social_reject_friend_request',{p_request_id:id});}
export async function removeFriend(id){return rpc('social_remove_friend',{p_friend_id:id});}
export async function getFeed(beforeAt=null,beforeId=null,limit=20){return rpc('social_feed',{p_before_at:beforeAt,p_before_id:beforeId,p_limit:limit});}
export async function getTimeline(sinceIso){return rpc('social_timeline',{p_since:sinceIso});}
export async function hasUnseen(){return !!(await rpc('social_has_unseen'));}
export async function markSeen(){return rpc('social_mark_seen');}
const SOCIAL_EVENT_KEYS=['client_event_id','user_id','event_type','occurred_at','comment','workout_name','duration_seconds','effort','progress_percent','exercise_names','exercise_name','record_kind','record_value','previous_value','record_unit','increase_percent'];
function normalizedSocialEvent(e,uid){
  const source={...e,user_id:uid};
  return Object.fromEntries(SOCIAL_EVENT_KEYS.map(key=>[key,source[key]??null]));
}
export async function publishEvents(events){
  if(!events?.length)return [];
  await getWorkspaceStatus();const uid=socialOwnerId();if(!uid)throw new Error('Account workspace is not connected.');
  const body=events.map(e=>normalizedSocialEvent(e,uid));
  return authedFetch('/rest/v1/activity_events?on_conflict=user_id,client_event_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
}
export async function deleteEvent(id){return authedFetch(`/rest/v1/activity_events?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}

export async function eraseMyCloudTraining(scope='all'){
  return rpc('gym_erase_my_training_cloud',{p_scope:scope});
}
export async function deleteMyAccount(){
  const result=await rpc('gym_delete_my_account');
  writeSession(null);
  return result;
}

function comparisonPointBody(points){
  return (points||[]).map(p=>({
    client_point_id:p.clientPointId,
    canonical_exercise_id:p.canonicalExerciseId,
    occurred_at:p.occurredAt,
    e1rm_kg:p.e1rmKg,
    formula_version:p.formulaVersion||'EPLEY_RIR_V1',
    source_programme_exercise_ids:p.sourceProgrammeExerciseIds||[],
    source_labels:p.sourceLabels||[]
  }));
}
// The database owns the privacy gate. Old clients cannot bypass opt-out via REST.
export async function getComparisonPreference(){return rpc('social_comparison_preference');}
export async function setComparisonEnabled(enabled){
  if(typeof enabled!=='boolean')throw new Error('An explicit sharing choice is required.');
  return rpc('social_set_comparison_enabled',{p_enabled:enabled});
}
export async function replaceComparisonPoints(points,{preferenceRevision,sourceCursor}={}){
  if(!socialUser()?.id)throw new Error('Sign in to compare exercises.');
  if(!Number.isSafeInteger(preferenceRevision)||preferenceRevision<1||!Number.isSafeInteger(sourceCursor)||sourceCursor<0)
    throw new Error('Refresh sharing settings and training sync before publishing.');
  return rpc('social_reconcile_comparison_points',{
    p_points:comparisonPointBody(points),p_preference_revision:preferenceRevision,p_source_cursor:sourceCursor
  });
}
// Kept for callers; never append a partial session batch as a full publication.
export async function publishComparisonPoints(points,options={}){
  return replaceComparisonPoints(points,options);
}
export async function listCommonComparableExercises(friendId){return rpc('social_common_comparable_exercises',{p_friend_id:friendId});}
export async function getExerciseComparison(friendId,canonicalExerciseId,sinceIso=null){return rpc('social_exercise_comparison',{p_friend_id:friendId,p_canonical_exercise_id:canonicalExerciseId,p_since:sinceIso});}
