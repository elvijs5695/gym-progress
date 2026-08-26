import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SOCIAL_CONFIGURED} from './social-config.js';

const SESSION_KEY='gym-progress-social-session-v1';
let session=readSession();

function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function writeSession(s){session=s||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);}
function headers(token=session?.access_token){const h={'apikey':SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};if(token)h.Authorization=`Bearer ${token}`;return h;}
async function parse(res){const text=await res.text();let body=null;try{body=text?JSON.parse(text):null;}catch{body=text;}if(!res.ok)throw new Error(body?.message||body?.error_description||body?.error||text||`HTTP ${res.status}`);return body;}
export function socialConfigured(){return SOCIAL_CONFIGURED;}
export function socialSession(){return session;}
export function socialUser(){return session?.user||null;}
export function socialSignedIn(){return !!session?.access_token;}

export async function sendEmailOtp(email){
  if(!SOCIAL_CONFIGURED)throw new Error('Supabase publishable key is not configured.');
  return parse(await fetch(`${SUPABASE_URL}/auth/v1/otp`,{method:'POST',headers:headers(null),body:JSON.stringify({email:String(email).trim(),create_user:true})}));
}
export async function verifyEmailOtp(email,token){
  const data=await parse(await fetch(`${SUPABASE_URL}/auth/v1/verify`,{method:'POST',headers:headers(null),body:JSON.stringify({email:String(email).trim(),token:String(token).trim(),type:'email'})}));
  writeSession(data);return data;
}
export async function refreshSocialSession(){
  if(!session?.refresh_token)return null;
  try{const data=await parse(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:headers(null),body:JSON.stringify({refresh_token:session.refresh_token})}));writeSession(data);return data;}catch{writeSession(null);return null;}
}
export async function signOutSocial(){
  if(session?.access_token){try{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:headers()});}catch{}}
  writeSession(null);
}
async function authedFetch(path,options={}){
  if(!session?.access_token)throw new Error('Sign in to use Friends.');
  let res=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:{...headers(),...(options.headers||{})}});
  if(res.status===401&&session?.refresh_token){await refreshSocialSession();if(session?.access_token)res=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:{...headers(),...(options.headers||{})}});}
  return parse(res);
}
export async function rpc(name,args={}){return authedFetch(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(args)});}
export async function getMyProfile(){const uid=socialUser()?.id;if(!uid)return null;const rows=await authedFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=id,display_name`);return rows?.[0]||null;}
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
  const uid=socialUser()?.id;if(!uid)throw new Error('Sign in to share.');
  const body=events.map(e=>normalizedSocialEvent(e,uid));
  return authedFetch('/rest/v1/activity_events?on_conflict=user_id,client_event_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
}
export async function deleteEvent(id){return authedFetch(`/rest/v1/activity_events?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
