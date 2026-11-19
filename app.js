import {loadState,saveState,wipeState} from './db.js?v=1.7.6';
import {alternativeRelation,alternativePriority} from './exercise-alternatives.js?v=1.7.6';
import {restoreCachedReferenceData,refreshReferenceData} from './exercise-reference-cache.js?v=1.7.6';
import {EXERCISES,ExerciseType,RampMode,Equipment,DumbbellLoad,bestMatch,byKey,equipmentFor,dumbbellLoadFor,recommendRamp,warmupFamily,snapSelectable,stepSelectable,gradingIncrement,progressionIncrement,suggestedNextWeight} from './exercise-library.js?v=1.7.6';
import {COLORS,roundQuarter,formatKg,formatKgFixed,formatKgRounded,formatDuration,dateOnly,dateTime,iso,exerciseSets,sessionExercises,exerciseMetrics,sessionMetrics,previousIdenticalSession,difficultyLevel,sessionDifficultyLevel,exerciseProgressPercent,phaseDuration} from './metrics.js?v=1.7.6';
import {workoutCardioEffort,preferredCardioMetric,compareCardioAtMatchedEffort} from './cardio-analytics.js?v=1.7.6';
import {evaluateAutoregulation} from './autoregulation.js?v=1.7.6';
import {manualHtml} from './manual.js?v=1.7.6';
import {languageCode,localeFor,t,localizeDom} from './i18n.js?v=1.7.6';
import {StarterGoal,StarterExperience,buildStarterProgramme,missingStarterWeightKeys} from './starter-programme.js?v=1.7.6';
import {evaluateFutureAdjustment} from './future-adjustment.js?v=1.7.6';
import {loadPerformanceRules,progressionSetQualifies} from './performance-rules.js?v=1.7.6';
import {socialConfigured,socialSignedIn,socialUser,sendEmailOtp,verifyEmailOtp,signOutSocial,getMyProfile,setDisplayName,findFriend,sendFriendRequest,listFriends,listIncomingRequests,listNotifications,acceptFriendRequest,rejectFriendRequest,removeFriend,getFeed,getTimeline,hasUnseen,markSeen,publishEvents,deleteEvent,publishComparisonPoints,replaceComparisonPoints,listCommonComparableExercises,getExerciseComparison,eraseMyCloudTraining,deleteMyAccount} from './social-api.js?v=1.7.6';
import {CANONICAL_EXERCISES,CANONICAL_BY_ID,CANONICAL_BY_KEY,canonicalName,canonicalSuggestions} from './exercise-catalogue.js?v=1.7.6';
import {TrackingMode,E1RM_FORMULA_VERSION,uuid,trackingModeFor,ensureExerciseIdentityState,getUserExercise,displayNameForSessionExercise,activeUserExercises,isFriendComparableUserExercise,canonicalExerciseById,canonicalExerciseByKey,qualifyingE1rm,heaviestQualifyingE1rm} from './exercise-identity.js?v=1.7.6';
import {persistWorkoutIntelligence,trendLabel,fatigueSummary} from './progression-intelligence.js?v=1.7.6';
import {ensureSyncFoundation} from './sync-foundation.js?v=1.7.6';
import {getTrainingSyncPreview,runTrainingSync,enabledSyncDomains,syncStatusLabel} from './training-sync.js?v=1.7.6';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>Date.now();
const APP_VERSION='1.7.6';
const INFO_MESSAGE_MS=3000;
const uid=(arr)=>arr.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;
const appEl=$('#app');
const statusRoot=$('#status-root');
let state=null;
let route={name:'home',id:null};
let ui={selectedWorkoutId:null,expandedWorkoutId:null,progressExercise:'',progressRange:'3m',progressMetric:'WEIGHT',customStart:'',customEnd:'',toast:null,toastStartedAt:0,toastDuration:INFO_MESSAGE_MS,movedWorkoutId:null,transitionMessage:null,transitionStartedAt:0,transitionDuration:INFO_MESSAGE_MS,setStatusMessage:null,restExpand:false,timelineDays:null,timelineEndMs:null,advancedExercise:false,trackerExpanded:false,logLimit:40};
let socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null,compareFriendId:null,compareExercises:[],compareExerciseId:null,comparePoints:[],compareExpanded:false};
const socialDeletePending=new Set();
const S=(en,lv)=>languageCode(state)==='lv'?lv:en;
const SOCIAL_NOTIFIED_KEY='gym-progress-social-notified-v1';
async function saveRecoveryState(value,key='pre-upgrade'){
  // Best-effort secondary snapshot that does not depend on a new IndexedDB module API.
  // Keeping the app compatible with the previous db.js prevents mixed service-worker
  // caches from blanking the whole PWA during an update.
  try{if(value!=null)localStorage.setItem(`gym-progress-recovery:${key}`,JSON.stringify(value));}catch(e){console.warn('Recovery snapshot not stored',e);}
}
function socialNotifiedIds(){try{return new Set(JSON.parse(localStorage.getItem(SOCIAL_NOTIFIED_KEY)||'[]'));}catch{return new Set();}}
function markSocialNotificationDelivered(id){const seen=socialNotifiedIds();seen.add(id);localStorage.setItem(SOCIAL_NOTIFIED_KEY,JSON.stringify([...seen].slice(-300)));}
let tickHandle=null,wakeLock=null,audioCtx=null,lastReminderKey='';
let trackerRenderedDate=trackerTodayKey();
let trackerVisualBucket=-1;
const sentTrackerReminderKeys=new Set();
const TRACKER_NOTIFICATIONS_KEY='gym-progress-tracker-notifications-enabled';
function trackerNotificationsEnabled(){return localStorage.getItem(TRACKER_NOTIFICATIONS_KEY)!=='0';}

function defaults(){return {
  internalVersion:8,
  app_state:{id:1,nextWorkoutId:null,keepScreenAwake:true,progressionRirThreshold:2,targetRirMin:1,targetRirMax:2,rirInputMax:3,difficultyComfortableMinRir:2.5,difficultyChallengingMinRir:1.5,difficultyHardMinRir:0.5,motivationEnabled:true,inactivityReminderHours:72,eveningReminderTime:'19:00',morningReminderTime:'08:00',nextSessionAt:null,lastInactivityReminderFor:null,nextEveningReminderFor:null,nextMorningReminderFor:null,languageCode:'en',starterPromptDismissed:false,lastSetZeroRirAcceptable:false,maxRampUpSets:3},
  workout_templates:[],user_exercises:[],template_exercises:[],workout_sessions:[],session_exercises:[],performed_sets:[],tracker_items:[],tracker_states:[],runtime:null
};}
function localDataCounts(s){return {workouts:Array.isArray(s?.workout_templates)?s.workout_templates.length:0,templates:Array.isArray(s?.template_exercises)?s.template_exercises.length:0,sessions:Array.isArray(s?.workout_sessions)?s.workout_sessions.length:0,sessionExercises:Array.isArray(s?.session_exercises)?s.session_exercises.length:0,sets:Array.isArray(s?.performed_sets)?s.performed_sets.length:0};}
function hasTrainingData(s){const c=localDataCounts(s);return c.workouts+c.templates+c.sessions+c.sessionExercises+c.sets>0;}
function migrationPreservedTrainingData(before,after){const a=localDataCounts(before),b=localDataCounts(after);return (!a.workouts||b.workouts===a.workouts)&&(!a.templates||b.templates===a.templates)&&(!a.sessions||b.sessions===a.sessions)&&(!a.sessionExercises||b.sessionExercises===a.sessionExercises)&&(!a.sets||b.sets===a.sets);}
function normalize(s){
  const d=defaults(),x={...d,...(s||{})};
  x.app_state={...d.app_state,...(x.app_state||{})};
  x.app_state.rirInputMax=Number(x.app_state.rirInputMax)<=3?3:5;
  x.app_state.targetRirMin=Math.max(0,Math.min(x.app_state.rirInputMax,Number(x.app_state.targetRirMin??1)));
  x.app_state.targetRirMax=Math.max(x.app_state.targetRirMin,Math.min(x.app_state.rirInputMax,Number(x.app_state.targetRirMax??2)));
  x.app_state.progressionRirThreshold=Math.max(0,Math.min(x.app_state.rirInputMax,Number(x.app_state.progressionRirThreshold??2)));
  x.app_state.motivationEnabled=x.app_state.motivationEnabled!==false;
  x.app_state.inactivityReminderHours=Math.max(24,Math.min(720,Number(x.app_state.inactivityReminderHours??72)));
  x.app_state.eveningReminderTime=/^\d{2}:\d{2}$/.test(String(x.app_state.eveningReminderTime||''))?String(x.app_state.eveningReminderTime):'19:00';
  x.app_state.morningReminderTime=/^\d{2}:\d{2}$/.test(String(x.app_state.morningReminderTime||''))?String(x.app_state.morningReminderTime):'08:00';
  x.app_state.nextSessionAt=x.app_state.nextSessionAt==null?null:Number(x.app_state.nextSessionAt);
  x.app_state.languageCode=x.app_state.languageCode==='lv'?'lv':'en';
  x.app_state.starterPromptDismissed=x.app_state.starterPromptDismissed===true;
  x.app_state.lastSetZeroRirAcceptable=x.app_state.lastSetZeroRirAcceptable===true;
  x.app_state.maxRampUpSets=Math.max(0,Math.min(6,Number(x.app_state.maxRampUpSets??3)));
  for(const k of ['workout_templates','user_exercises','template_exercises','workout_sessions','session_exercises','performed_sets','tracker_items']) if(!Array.isArray(x[k]))x[k]=[];
  const today=trackerTodayKey(),legacyTrackerEntries=Array.isArray(x.tracker_entries)?x.tracker_entries:[],incomingTrackerStates=Array.isArray(x.tracker_states)?x.tracker_states:[];
  const trackerStateByItem=new Map();
  for(const row of incomingTrackerStates){if(row?.itemId==null)continue;trackerStateByItem.set(String(row.itemId),{itemId:row.itemId,localDate:today,amount:String(row.localDate)===today?Math.max(0,Number(row.amount||0)):0});}
  for(const row of legacyTrackerEntries){if(row?.itemId==null||String(row.localDate)!==today||trackerStateByItem.has(String(row.itemId)))continue;trackerStateByItem.set(String(row.itemId),{itemId:row.itemId,localDate:today,amount:Math.max(0,Number(row.amount||0))});}
  x.tracker_states=x.tracker_items.map(item=>trackerStateByItem.get(String(item.id))||{itemId:item.id,localDate:today,amount:0});
  delete x.tracker_entries;
  x.template_exercises=x.template_exercises.map(e=>{const m=byKey(e.exerciseKey)||bestMatch(e.name);const equipment=e.equipment||m?.equipment||equipmentFor(e.exerciseKey,e.name);return {...e,equipment,dumbbellLoad:equipment===Equipment.DUMBBELL?(e.dumbbellLoad||m?.dumbbellLoad||dumbbellLoadFor(e.exerciseKey,e.name)):DumbbellLoad.SINGLE};});
  x.session_exercises=x.session_exercises.map(e=>{const m=byKey(e.exerciseKey)||bestMatch(e.name);const equipment=e.equipment||m?.equipment||equipmentFor(e.exerciseKey,e.name);return {...e,note:String(e.note||'').slice(0,500),equipment,dumbbellLoad:equipment===Equipment.DUMBBELL?(e.dumbbellLoad||m?.dumbbellLoad||dumbbellLoadFor(e.exerciseKey,e.name)):DumbbellLoad.SINGLE};});
  ensureExerciseIdentityState(x);ensureRotation(x);x.internalVersion=8;ensureSyncFoundation(x,{migration:Number(s?.internalVersion||0)<6});return x;
}
function ensureRotation(s=state){
  const active=s.workout_templates.filter(w=>w.isActive!==false).sort((a,b)=>a.position-b.position);
  if(!active.length){s.app_state.nextWorkoutId=null;return;}
  if(!active.some(w=>w.id===s.app_state.nextWorkoutId))s.app_state.nextWorkoutId=active[0].id;
}
let trainingSyncInFlight=null,trainingSyncTimer=null,suppressTrainingSyncSchedule=false,lastSyncConflictNoticeAt=0,trainingSyncReviewToken=0;
function scheduleTrainingSync(delay=4500){
  if(suppressTrainingSyncSchedule||!state||!socialSignedIn()||!enabledSyncDomains(state).length)return;
  if(trainingSyncTimer)clearTimeout(trainingSyncTimer);
  trainingSyncTimer=setTimeout(()=>{trainingSyncTimer=null;void performTrainingSync({reason:'local-change'});},Math.max(250,Number(delay)||0));
}
async function persistImmediately(){ensureSyncFoundation(state);await saveState(state);scheduleTrainingSync();}

function trainingSyncSummaryText(p){
  const parts=[];
  if(p.workouts)parts.push(`${p.workouts} ${p.workouts===1?S('workout day','treniņa diena'):S('workout days','treniņa dienas')}`);
  if(p.exercises)parts.push(`${p.exercises} ${S('programme exercises','programmas vingrinājumi')}`);
  if(p.schedule)parts.push(`${p.schedule} ${S('schedule state','grafika stāvoklis')}`);
  if(p.logs)parts.push(`${p.logs} ${p.logs===1?S('workout log','treniņa ieraksts'):S('workout logs','treniņu ieraksti')}`);
  if(p.tracker)parts.push(`${p.tracker} ${S('Tracker records','Tracker ieraksti')}`);
  return parts.length?parts.join(' · '):S('No cloud differences found.','Atšķirības mākonī nav atrastas.');
}
function trainingSyncHasDifferences(preview){
  return ['workouts','exercises','schedule','logs','tracker','localWorkouts','localExercises','localSchedule','localLogs','localTracker','conflicts'].some(k=>Number(preview?.[k]||0)>0);
}
function openTrainingSyncLoadingDialog(){
  window.__gpTrainingSyncPreview=null;
  openDialog(`<h2>${esc(S('Sync training data','Sinhronizēt treniņu datus'))}</h2><div class="sync-loading-row"><span class="sync-loading-spinner" aria-hidden="true"></span><span>${esc(S('Checking local and cloud data…','Pārbauda lokālos un mākoņa datus…'))}</span></div>`);
}
function openTrainingSyncDialog(preview){
  window.__gpTrainingSyncPreview=preview;
  const enabled=enabledSyncDomains(state),firstSetup=!enabled.length,hasCloud=preview.remoteRecords>0;
  if(!trainingSyncHasDifferences(preview)){
    openDialog(`<h2>${esc(S('Up to date','Viss sinhronizēts'))}</h2><div class="dialog-copy">${esc(S('Programme, workout history, schedule and Tracker are already in sync.','Programma, treniņu vēsture, grafiks un Tracker jau ir sinhronizēti.'))}</div><div class="dialog-actions"><button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);
    return;
  }
  const localParts=[];
  if(preview.localWorkouts)localParts.push(`${preview.localWorkouts} ${S('workout days','treniņa dienas')}`);
  if(preview.localExercises)localParts.push(`${preview.localExercises} ${S('programme exercises','programmas vingrinājumi')}`);
  if(preview.localSchedule)localParts.push(`${preview.localSchedule} ${S('schedule state','grafika stāvoklis')}`);
  if(preview.localLogs)localParts.push(`${preview.localLogs} ${S('workout logs','treniņu ieraksti')}`);
  if(preview.localTracker)localParts.push(`${preview.localTracker} ${S('Tracker records','Tracker ieraksti')}`);
  const cloudParts=[];
  if(preview.workouts)cloudParts.push(`${preview.workouts} ${preview.workouts===1?S('workout day','treniņa diena'):S('workout days','treniņa dienas')}`);
  if(preview.exercises)cloudParts.push(`${preview.exercises} ${S('programme exercises','programmas vingrinājumi')}`);
  if(preview.schedule)cloudParts.push(`${preview.schedule} ${S('schedule state','grafika stāvoklis')}`);
  if(preview.logs)cloudParts.push(`${preview.logs} ${preview.logs===1?S('workout log','treniņa ieraksts'):S('workout logs','treniņu ieraksti')}`);
  if(preview.tracker)cloudParts.push(`${preview.tracker} ${S('Tracker records','Tracker ieraksti')}`);
  const cloudCopy=hasCloud?`<div class="small sync-difference-list"><strong>${esc(S('Cloud differences found','Mākonī atrastas atšķirības'))}:</strong><ul>${(cloudParts.length?cloudParts:[S('No record-level differences found','Ierakstu līmeņa atšķirības nav atrastas')]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="dialog-copy">${esc(S('No training data is stored in your cloud account yet. This device can upload its local data first.','Tavā mākoņa kontā vēl nav treniņu datu. Šī ierīce var pirmā augšupielādēt lokālos datus.'))}</div>`;
  const conflictChoice=(value,label,checked)=>`<label class="sync-conflict-row"><span>${esc(label)}</span><input type="radio" name="sync-conflict" value="${value}" ${checked?'checked':''}></label>`;
  const conflictCopy=preview.conflicts?`<div class="sync-warning"><strong>${preview.conflicts} ${S('programme/data conflicts need a choice','programmas/datu konfliktiem nepieciešama izvēle')}.</strong><div class="small">${esc(S('Independent records will still merge. Choose which side wins only where the same logical record differs.','Neatkarīgie ieraksti tik un tā tiks apvienoti. Izvēlies, kura puse uzvar tikai tur, kur atšķiras viens un tas pats loģiskais ieraksts.'))}</div><div class="sync-conflict-list">${conflictChoice('local',S('Keep this device for conflicts','Konfliktos paturēt šīs ierīces versiju'),true)}${conflictChoice('cloud',S('Use cloud for conflicts','Konfliktos izmantot mākoņa versiju'),false)}</div></div>`:'';
  const domainRow=(id,label,checked)=>`<label class="setting-toggle-row sync-domain-row"><span class="setting-toggle-copy"><strong>${esc(label)}</strong></span><span class="setting-toggle-control"><input id="${id}" class="setting-toggle-input" type="checkbox" ${checked?'checked':''}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>`;
  openDialog(`<h2>${esc(firstSetup?S('Protect & sync your training data','Aizsargā un sinhronizē treniņu datus'):S('Sync differences found','Atrastas sinhronizācijas atšķirības'))}</h2>${cloudCopy}${localParts.length?`<div class="small sync-difference-list"><strong>${esc(S('This device has changes to exchange','Šajā ierīcē ir sinhronizējamas izmaiņas'))}:</strong><ul>${localParts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<div class="sync-domain-list">${domainRow('sync-programme',S('Programme','Programma'),firstSetup||enabled.includes('programme'))}${domainRow('sync-history',S('Workout history','Treniņu vēsture'),firstSetup||enabled.includes('workout_log'))}${domainRow('sync-tracker','Tracker',firstSetup||enabled.includes('tracker'))}</div>${conflictCopy}<div class="small muted">${esc(S('Gym Progress stays fully usable offline. Logging out never deletes local training data.','Gym Progress joprojām pilnībā darbojas bezsaistē. Izrakstīšanās nekad nedzēš lokālos treniņu datus.'))}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Not now','Ne tagad'))}</button><button onclick="gp.confirmTrainingSync()">${esc(S('Sync & merge','Sinhronizēt un apvienot'))}</button></div>`);
}
async function openTrainingSyncReview(){
  if(!socialSignedIn())return;
  const token=++trainingSyncReviewToken;
  openTrainingSyncLoadingDialog();
  try{
    const preview=await getTrainingSyncPreview(state);
    if(token!==trainingSyncReviewToken)return;
    openTrainingSyncDialog(preview);
  }catch(e){
    if(token!==trainingSyncReviewToken)return;
    openDialog(`<h2>${esc(S('Sync check failed','Sinhronizācijas pārbaude neizdevās'))}</h2><div class="dialog-copy">${esc(e?.message||e)}</div><div class="dialog-actions"><button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);
  }
}
async function confirmTrainingSync(){
  if(trainingSyncInFlight)return;
  const domains=[];if($('#sync-programme')?.checked)domains.push('programme');if($('#sync-history')?.checked)domains.push('workout_log');if($('#sync-tracker')?.checked)domains.push('tracker');
  if(!domains.length){toast(S('Select at least one data type.','Izvēlies vismaz vienu datu veidu.'));return;}
  const conflictPolicy=document.querySelector('input[name="sync-conflict"]:checked')?.value||'local',preview=window.__gpTrainingSyncPreview||null;
  for(const d of ['programme','workout_log','tracker'])state.sync_foundation.domains[d].enabled=domains.includes(d);
  closeDialog();toast(S('Syncing training data…','Sinhronizē treniņu datus…'));
  await performTrainingSync({reason:'manual',preview,domains,conflictPolicy,force:true});
}
async function performTrainingSync({reason='auto',preview=null,domains=null,conflictPolicy='local',force=false}={}){
  if(!state||!socialSignedIn()||trainingSyncInFlight)return trainingSyncInFlight;
  const activeDomains=domains||enabledSyncDomains(state);if(!activeDomains.length&&!force)return null;
  trainingSyncInFlight=(async()=>{
    try{
      const p=preview||await getTrainingSyncPreview(state);
      if(p.conflicts&&!force){for(const d of activeDomains)state.sync_foundation.domains[d].status='Conflict requires review';await saveState(state);if(Date.now()-lastSyncConflictNoticeAt>30000){lastSyncConflictNoticeAt=Date.now();toast(S('Sync conflict requires review in Settings.','Sinhronizācijas konflikts jāpārskata iestatījumos.'));}return null;}
      suppressTrainingSyncSchedule=true;
      const result=await runTrainingSync(state,{domains:activeDomains,conflictPolicy,preview:p});
      if(result.changed)ensureRotation();
      ensureSyncFoundation(state);await saveState(state);
      if(reason==='manual')toast(S('Programme, workout history, schedule and Tracker synced.','Programma, treniņu vēsture, grafiks un Tracker sinhronizēti.'));
      if(result.changed)render();
      return result;
    }catch(e){for(const d of activeDomains){const domain=state.sync_foundation?.domains?.[d];if(domain)domain.status='Sync failed — local data safe';}await saveState(state).catch(()=>{});if(reason==='manual')toast(`${S('Sync failed — local data is safe','Sinhronizācija neizdevās — lokālie dati ir drošībā')}: ${e?.message||e}`);return null;}
    finally{suppressTrainingSyncSchedule=false;trainingSyncInFlight=null;}
  })();return trainingSyncInFlight;
}

// Coalesce persistence requests raised by one UI event. Callers may still await
// persist(); the actual IndexedDB write remains ordered and failure-propagating.
let persistInFlight = null;
function persist() {
  if (persistInFlight) return persistInFlight;
  persistInFlight = Promise.resolve()
    .then(() => persistImmediately())
    .finally(() => { persistInFlight = null; });
  return persistInFlight;
}

function renderStatus(){
  const root=statusRoot;if(!root)return;
  const isTransition=!!ui.transitionMessage,message=ui.transitionMessage||ui.toast;
  if(message){
    const started=isTransition?ui.transitionStartedAt:ui.toastStartedAt,duration=Math.max(1,isTransition?ui.transitionDuration:ui.toastDuration),elapsed=Math.max(0,Date.now()-started),remaining=Math.max(80,duration-elapsed),opacity=Math.max(0,1-elapsed/duration);
    root.innerHTML=`<div class="status-message ${isTransition?'transition-status':'toast-status'} status-fading" style="opacity:${opacity};animation-duration:${remaining}ms">${esc(message)}</div>`;
  }else root.innerHTML='';
  document.body.classList.toggle('status-visible',!!message);
}
function toast(msg,duration=INFO_MESSAGE_MS){
  ui.toast=msg;ui.toastStartedAt=Date.now();ui.toastDuration=duration;renderStatus();
  setTimeout(()=>{if(ui.toast===msg){ui.toast=null;renderStatus();}},duration);
}
function nav(name,id=null){if(name==='logs'&&route.name!=='logs'){ui.timelineDays=null;ui.timelineEndMs=null;}if(name==='friends'&&route.name!=='friends'){socialUi.timelineDays=null;socialUi.timelineEndMs=null;}route={name,id};window.scrollTo({top:0,behavior:'instant'});render();if(name==='friends')void enterFriends();if(['programme','workout','logs','session','settings'].includes(name))scheduleTrainingSync(300);}
function activeSession(){return state.workout_sessions.find(s=>s.status==='ACTIVE')||null;}
function getWorkout(id){return state.workout_templates.find(w=>w.id===Number(id));}
function getTemplateExercises(workoutId){return state.template_exercises.filter(e=>e.workoutId===Number(workoutId)).sort((a,b)=>a.position-b.position);}
function getSession(id){return state.workout_sessions.find(s=>s.id===Number(id));}
function getSessionExercise(id){return state.session_exercises.find(e=>e.id===Number(id));}
function getSet(id){return state.performed_sets.find(s=>s.id===Number(id));}
function userExerciseName(id,fallback='Exercise'){return getUserExercise(state,id)?.displayName||fallback;}
function templateDisplayName(e){return userExerciseName(e?.userExerciseId,e?.name||'Exercise');}
function sessionDisplayName(e){return displayNameForSessionExercise(state,e);}
function trackingLabel(e){return e?.trackingMode===TrackingMode.CARDIO?'Cardio':e?.trackingMode===TrackingMode.TIME_ONLY?'Timed':e?.equipment===Equipment.BODYWEIGHT?'Bodyweight':'Weight + reps';}
function catalogueGlobeSvg(){return `<span class="catalogue-link-glyph" aria-hidden="true"></span>`;}
function catalogueInlineGlobe(linked){return `<span class="catalogue-inline-status ${linked?'linked':'local'}">${catalogueGlobeSvg()}</span>`;}
function canonicalStatusIcon(u){const linked=!!u?.canonicalExerciseId,candidate=!!u?.candidateCanonicalExerciseId,label=linked?S('Linked to exercise catalogue','Saistīts ar vingrinājumu katalogu'):candidate?S('Catalogue match available','Pieejama kataloga atbilstība'):S('Not linked to exercise catalogue','Nav saistīts ar vingrinājumu katalogu');return `<span class="catalogue-status ${linked?'linked':'local'} ${candidate?'candidate':''}" title="${esc(label)}" aria-label="${esc(label)}">${catalogueGlobeSvg()}</span>`;}
function catalogueSearchMatch(name){const q=String(name||'').trim().toLowerCase();if(!q)return null;return CANONICAL_EXERCISES.find(c=>[c.nameEn,c.nameLv,...(c.aliasesEn||[])].some(n=>String(n||'').trim().toLowerCase()===q))||null;}
function createUserExerciseFromInput(name,equipment,dumbbellLoad,exerciseType,trackingMode,canonical=null){const lang=languageCode(state),display=String(name||'').trim()||(canonical?canonicalName(canonical,lang):'Exercise');const u={id:uuid(),canonicalExerciseId:canonical?.id||null,displayName:display,createdLanguage:lang,equipment:canonical?.equipment||equipment||Equipment.OTHER,dumbbellLoad:canonical?.dumbbellLoad||dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:canonical?.exerciseType||exerciseType||ExerciseType.MODERATE_COMPOUND,trackingMode:trackingMode||((canonical?.equipment||equipment)===Equipment.BODYWEIGHT?TrackingMode.BODYWEIGHT_REPS:TrackingMode.WEIGHT_REPS),archived:false,candidateCanonicalExerciseId:null,legacyExerciseKey:canonical?.legacyExerciseKey||null};state.user_exercises.push(u);return u;}
function findUserExerciseForForm(old,canonical,selectedUserId=null){if(selectedUserId){const selected=getUserExercise(state,selectedUserId);if(selected&&!selected.archived)return selected;}if(old?.userExerciseId){const existing=getUserExercise(state,old.userExerciseId);if(existing)return existing;}if(canonical){const same=activeUserExercises(state).filter(u=>u.canonicalExerciseId===canonical.id);if(same.length===1)return same[0];}return null;}

function setCatalogueLinkForExercise(templateId){
  const te=state.template_exercises.find(x=>x.id===Number(templateId)),u=te?getUserExercise(state,te.userExerciseId):null;if(!u)return;
  const lang=languageCode(state),linked=canonicalExerciseById(u.canonicalExerciseId),candidate=canonicalExerciseById(u.candidateCanonicalExerciseId);
  const initial=linked?.id||candidate?.id||'';
  const suggestions=CANONICAL_EXERCISES.filter(c=>c.status==='ACTIVE').slice().sort((a,b)=>canonicalName(a,lang).localeCompare(canonicalName(b,lang)));
  const opts=suggestions.map(c=>`<option value="${c.id}" ${initial===c.id?'selected':''}>${esc(canonicalName(c,lang))} · ${esc(c.equipment.toLowerCase())}</option>`).join('');
  const status=linked?`${S('Linked to','Saistīts ar')} ${canonicalName(linked,lang)}`:S('Not linked','Nav saistīts');
  openDialog(`<h2>${esc(S('Exercise catalogue','Vingrinājumu katalogs'))}</h2><div class="row between catalogue-dialog-head"><div><div class="title">${esc(u.displayName)}</div><div class="small">${esc(status)}</div></div>${canonicalStatusIcon(u)}</div>${linked?`<button class="secondary full catalogue-unlink" onclick="gp.unlinkCatalogueExercise(${te.id})">${esc(S('Unlink','Atvienot'))}</button>`:''}<div class="note">${esc(S('A catalogue link gives this exercise a stable identity across languages and enables friend comparison when the movement is comparable. Linking also applies to existing history without changing your workout records.','Kataloga saite piešķir vingrinājumam stabilu identitāti dažādās valodās un ļauj salīdzināt ar draugiem, ja kustība ir salīdzināma. Saite attiecas arī uz esošo vēsturi, nemainot treniņu ierakstus.'))}</div><label class="field">${esc(S('Catalogue exercise','Kataloga vingrinājums'))}</label><select id="f-canonical-link">${opts}</select><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.saveCatalogueLink(${te.id})">${esc(S('Save','Saglabāt'))}</button></div>`);
}
async function saveCatalogueLink(templateId){const te=state.template_exercises.find(x=>x.id===Number(templateId)),u=te?getUserExercise(state,te.userExerciseId):null,id=$('#f-canonical-link')?.value||null;if(!u||!id)return;const c=canonicalExerciseById(id);if(!c)return;u.canonicalExerciseId=id;u.candidateCanonicalExerciseId=null;u.equipment=c.equipment;u.dumbbellLoad=c.dumbbellLoad;u.exerciseType=c.exerciseType;state.template_exercises.filter(x=>x.userExerciseId===u.id).forEach(x=>{x.equipment=u.equipment;x.dumbbellLoad=u.dumbbellLoad;x.exerciseType=u.exerciseType;if(!c.friendE1rmEligible)x.compareWithFriends=false;});await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();}
async function unlinkCatalogueExercise(templateId){const te=state.template_exercises.find(x=>x.id===Number(templateId)),u=te?getUserExercise(state,te.userExerciseId):null;if(!u)return;u.canonicalExerciseId=null;u.candidateCanonicalExerciseId=null;state.template_exercises.filter(x=>x.userExerciseId===u.id).forEach(x=>x.compareWithFriends=false);await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();}

function trackerTodayKey(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function trackerAmount(item){const row=(state.tracker_states||[]).find(x=>String(x.itemId)===String(item.id));return row&&String(row.localDate)===trackerTodayKey()?Number(row.amount||0):0;}
function trackerState(item){const today=trackerTodayKey();let row=(state.tracker_states||[]).find(x=>String(x.itemId)===String(item.id));if(!row){row={itemId:item.id,localDate:today,amount:0};state.tracker_states.push(row);}else if(String(row.localDate)!==today){row.localDate=today;row.amount=0;}return row;}
function rollTrackerStatesToToday(){const today=trackerTodayKey();let changed=false;state.tracker_states=Array.isArray(state.tracker_states)?state.tracker_states:[];for(const item of state.tracker_items||[]){let row=state.tracker_states.find(x=>String(x.itemId)===String(item.id));if(!row){state.tracker_states.push({itemId:item.id,localDate:today,amount:0});changed=true;}else if(String(row.localDate)!==today){row.localDate=today;row.amount=0;changed=true;}}const valid=new Set((state.tracker_items||[]).map(x=>String(x.id)));const before=state.tracker_states.length;state.tracker_states=state.tracker_states.filter(x=>valid.has(String(x.itemId)));return changed||state.tracker_states.length!==before;}
function trackerUnit(item){return String(item.unit||'').trim();}
function trackerPace(item,at=new Date()){
  const parseTime=v=>{const [h,m]=String(v||'').split(':').map(Number);return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);};
  const start=parseTime(item.productiveStart||'08:00'),end=Math.max(start+1,parseTime(item.productiveEnd||'22:00')),cur=at.getHours()*60+at.getMinutes(),span=end-start;
  const target=Math.max(.01,Number(item.targetAmount||0)),increment=Math.max(.01,Number(item.increment||1)),steps=Math.max(1,Math.ceil((target-1e-9)/increment));
  const timeFraction=Math.max(0,Math.min(1,(cur-start)/span));
  let dueSteps=0,slot=0;
  if(cur>=end){dueSteps=steps;slot=steps>span/60?6:steps;}
  else if(cur>start){
    const elapsed=cur-start;
    if(steps>span/60){
      // Dense targets use six equal checkpoints across the configured productive window.
      const checkpointCount=6,checkpointSpan=span/checkpointCount;
      const checkpoint=Math.min(checkpointCount,Math.floor(elapsed/checkpointSpan+1e-9));
      dueSteps=checkpoint>0?Math.floor((steps*checkpoint)/checkpointCount+1e-9):0;slot=checkpoint;
    }else{
      // Each increment owns an equal time window; the last one is due at the configured end time.
      const interval=span/steps;dueSteps=Math.floor(elapsed/interval+1e-9);slot=dueSteps;
    }
  }
  dueSteps=Math.max(0,Math.min(steps,dueSteps));
  const dueAmount=cur>=end?target:Math.min(target,dueSteps*increment);
  return{start,end,cur,target,increment,steps,dueSteps,dueAmount,slot,timeFraction};
}
function trackerBehind(item,at=new Date()){const amount=trackerAmount(item),pace=trackerPace(item,at);return amount+1e-6<pace.target&&amount+1e-6<pace.dueAmount;}
function trackerTimeFraction(item,at=new Date()){return trackerPace(item,at).timeFraction;}
function refreshTrackerTimeVisuals(at=new Date()){if(route.name!=='home')return;document.querySelectorAll('.tracker-row[data-tracker-id]').forEach(row=>{const item=(state.tracker_items||[]).find(x=>String(x.id)===row.dataset.trackerId);if(!item)return;const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount||0)),done=amount+1e-6>=target,behind=!done&&trackerBehind(item,at),marker=row.querySelector('.tracker-progress-now');row.classList.toggle('done',done);row.classList.toggle('behind',behind);if(marker)marker.style.left=`${trackerTimeFraction(item,at)*100}%`;});}
function renderTrackerCard(){const items=(state.tracker_items||[]).filter(x=>x.enabled!==false).slice().sort((a,b)=>(a.position||0)-(b.position||0));if(!items.length)return `<div class="card tracker-card tracker-card-accent"><div class="row between"><div><div class="title">Tracker</div><div class="subtitle">Daily essentials</div></div><button class="icon-btn tracker-settings-btn" onclick="gp.openTrackerSettings()" aria-label="Tracker settings">${mainNavIcon('settings')}</button></div><div class="note">Add water, protein, supplements or any daily target.</div></div>`;const at=new Date();return `<div class="card tracker-card tracker-card-accent"><div class="row between"><div><div class="title">Tracker</div><div class="subtitle">Daily essentials</div></div><button class="icon-btn tracker-settings-btn" onclick="gp.openTrackerSettings()" aria-label="Tracker settings">${mainNavIcon('settings')}</button></div><div class="tracker-list">${items.map(item=>{const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount||0)),unit=trackerUnit(item),done=amount>=target,behind=!done&&trackerBehind(item,at),fill=Math.max(0,Math.min(1,amount/target)),timeFraction=trackerTimeFraction(item,at);return `<div class="tracker-row ${done?'done':''} ${behind?'behind':''}" data-tracker-id="${esc(String(item.id))}"><div class="tracker-progress-zone"><div class="tracker-progress-bg"><span class="tracker-progress-fill" style="width:${fill*100}%"></span><span class="tracker-progress-now" style="left:${timeFraction*100}%"></span></div><div class="tracker-row-main"><div class="grow min-zero tracker-name">${esc(item.name)}</div><button class="tracker-amount-button" onclick="gp.setTrackerAmount('${item.id}')">${amount}/${Number(item.targetAmount||0)}${unit?` ${esc(unit)}`:''}</button></div></div><div class="tracker-controls"><button class="tracker-step-btn" onclick="gp.adjustTracker('${item.id}',-1)" aria-label="Decrease">−</button><button class="tracker-step-btn" onclick="gp.adjustTracker('${item.id}',1)" aria-label="Increase">+</button></div></div>`;}).join('')}</div></div>`;}

function supersetPairForExercise(exs,e){if(!e?.supersetGroupId)return null;const pair=exs.filter(x=>x.supersetGroupId===e.supersetGroupId).sort((a,b)=>a.position-b.position);return pair.length===2?pair:null;}
function supersetPairSetInfo(exs,e,setNumber,{excludeSetIds=[]}={}){const pair=supersetPairForExercise(exs,e);if(!pair)return null;const excluded=new Set(excludeSetIds.map(Number));const items=pair.map(member=>{const sets=exerciseSets(state,member.id),set=sets.find(x=>x.setNumber===setNumber&&x.status==='PENDING'&&!excluded.has(Number(x.id)));return{e:member,sets,set};});if(items.some(x=>!x.set))return null;return{pair,items};}
function hasPendingRamp(e){return !!(e&&e.rampEndedAt==null&&shouldRamp(e));}
function nextPrescriptionHtml(e,set,{forceWorking=false,header=false}={}){if(!e||!set)return'';if(!forceWorking&&hasPendingRamp(e))return `${esc(S('Ramp-up','Iesildīšanās'))} · ${esc(sessionDisplayName(e))}`;if(header)return esc(sessionDisplayName(e));if([TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode))return `${esc(sessionDisplayName(e))} · ${formatDuration(Number(set.targetDurationSeconds||e.targetSeconds||60)*1000)}`;const load=e.equipment===Equipment.BODYWEIGHT?t('Bodyweight',languageCode(state)):formatKg(set.plannedWeightKg??e.plannedWeightKg);return `${esc(sessionDisplayName(e))} · ${load} × ${set.targetReps}`;}
function nextTargetAfterExclusions(exs,excludeSetIds=[]){const excluded=new Set(excludeSetIds.map(Number));for(const candidate of exs.slice().sort((a,b)=>a.position-b.position)){const sets=exerciseSets(state,candidate.id).slice().sort((a,b)=>a.setNumber-b.setNumber),set=sets.find(x=>x.status==='PENDING'&&!excluded.has(Number(x.id)));if(!set)continue;const pairInfo=supersetPairSetInfo(exs,candidate,set.setNumber,{excludeSetIds:[...excluded]});if(pairInfo)return{pairInfo};return{e:candidate,set};}return null;}
function displayAction(exs,action,{header=false,forceWorking=false}={}){if(!action)return'';if(action.type==='STRETCH')return esc(S('Stretching','Stiepšanās'));if(action.type==='FINAL')return esc(S('Workout complete','Treniņš pabeigts'));if(action.type==='UNLOAD'){const u=exs[action.exerciseIndex];return u?`${esc(S('Remove weights','Noņemt svarus'))} · ${esc(sessionDisplayName(u))}`:esc(S('Remove weights','Noņemt svarus'));}const targetE=exs[action.exerciseIndex];if(!targetE)return'';const targetSet=exerciseSets(state,targetE.id)[action.setIndex]||exerciseSets(state,targetE.id).find(x=>x.status==='PENDING');if(!targetSet)return'';const pairInfo=supersetPairSetInfo(exs,targetE,targetSet.setNumber);if(pairInfo){const names=pairInfo.items.map(x=>sessionDisplayName(x.e));const ramping=!forceWorking&&pairInfo.items.some(x=>hasPendingRamp(x.e));if(ramping)return `${esc(S('Ramp-up','Iesildīšanās'))} · ${esc(names.join(' + '))}`;if(header)return `${esc(S('Superset','Supersets'))} · ${esc(names.join(' + '))}`;return `${esc(S('Superset','Supersets'))}\n${pairInfo.items.map(x=>nextPrescriptionHtml(x.e,x.set,{forceWorking:true})).join('\n')}`;}return nextPrescriptionHtml(targetE,targetSet,{forceWorking,header});}
function previewAfterCurrentSet(ctx){const {rt,exs,e,sets,set}=ctx;if(!e||!set)return{type:'STRETCH'};const pair=supersetPairForExercise(exs,e);if(pair){const action=nextActionAfterSuperset(exs,pair,set.setNumber);return action||{type:'STRETCH'};}const superAction=supersetPartnerAction(exs,e,set);if(superAction?.type==='SUPERSET_IMMEDIATE')return{type:'SET',exerciseIndex:superAction.exerciseIndex,setIndex:superAction.setIndex};if(superAction?.type==='SUPERSET_AFTER_REST')return{type:'SUPERSET',exerciseIndex:superAction.exerciseIndex,setIndex:superAction.setIndex};const pendingSame=sets.findIndex(x=>x.status==='PENDING'&&x.id!==set.id);if(pendingSame>=0)return{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:pendingSame};if(e.removeWeights)return{type:'UNLOAD',exerciseIndex:rt.currentExerciseIndex};return nextActionAfterExercise(exs,e);}
function previewNextAction(ctx=currentActiveContext()){const {rt,exs,e,set}=ctx;if(!rt)return null;if(rt.phase==='WARMUP')return{type:'EXERCISE',exerciseIndex:0};if(rt.phase==='RAMP_PROMPT'||rt.phase==='RAMP_ACTIVE')return{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:rt.currentSetIndex,forceWorking:true};if(rt.phase==='UNLOAD')return rt.nextAction||{type:'STRETCH'};if(rt.phase==='REST')return rt.nextAction||{type:'STRETCH'};if(rt.phase==='STRETCH')return{type:'FINAL'};if(rt.phase==='FINAL')return null;if(rt.phase==='SUPERSET_ENTRY'&&Array.isArray(rt.supersetEntry)&&rt.supersetEntry.length){const first=getSet(rt.supersetEntry[0].setId),lead=e,pair=lead?supersetPairForExercise(exs,lead):null;if(first&&pair)return nextActionAfterSuperset(exs,pair,first.setNumber)||{type:'STRETCH'};}if(['ENTRY','SET','TIMED_SET'].includes(rt.phase)&&e&&set)return previewAfterCurrentSet(ctx);return null;}
function focusStageGroups(exs){const groups=[],seen=new Set();for(const e of exs.slice().sort((a,b)=>a.position-b.position)){const key=e.supersetGroupId?`s:${e.supersetGroupId}`:`e:${e.id}`;if(seen.has(key))continue;seen.add(key);groups.push({key,members:exs.filter(x=>(e.supersetGroupId?x.supersetGroupId===e.supersetGroupId:x.id===e.id)).sort((a,b)=>a.position-b.position)});}return groups;}
function focusStageInfo(exs,e){if(!e)return null;const groups=focusStageGroups(exs),i=groups.findIndex(g=>g.members.some(x=>x.id===e.id));if(i<0)return null;const group=groups[i],name=group.members.length>1?`${S('Superset','Supersets')} ${group.members.map(sessionDisplayName).join(' + ')}`:sessionDisplayName(group.members[0]);return{index:i+1,total:groups.length,name};}
function headerActionLabel(exs,action,{forceWorking=false}={}){if(!action)return'';if(action.type==='STRETCH')return S('Stretching','Stiepšanās');if(action.type==='FINAL')return S('Workout complete','Treniņš pabeigts');if(action.type==='UNLOAD'){const u=exs[action.exerciseIndex];return u?`${S('Deload','Noņemt svarus')} ${sessionDisplayName(u)}`:S('Deload','Noņemt svarus');}const targetE=exs[action.exerciseIndex];if(!targetE)return'';const group=focusStageGroups(exs).find(g=>g.members.some(x=>x.id===targetE.id)),stage=focusStageInfo(exs,targetE),name=stage?.name||sessionDisplayName(targetE),members=group?.members||[targetE];if(!forceWorking&&members.some(x=>hasPendingRamp(x)))return `${S('Ramp-up','Iesildīšanās')} ${name}`;return name;}
function activeHeaderState(ctx=currentActiveContext()){const {rt,exs,e}=ctx;if(!rt)return{stage:'',now:'',next:''};let focus=e;if(rt.phase==='REST'&&rt.rest?.setIds?.length){const owner=exs.find(x=>exerciseSets(state,x.id).some(s=>rt.rest.setIds.map(Number).includes(Number(s.id))));if(owner)focus=owner;}if((rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.entry?.setId){const owner=exs.find(x=>exerciseSets(state,x.id).some(s=>Number(s.id)===Number(rt.entry.setId)));if(owner)focus=owner;}const stageInfo=focusStageInfo(exs,focus),stage=['WARMUP','STRETCH','FINAL'].includes(rt.phase)?'':stageInfo?`${stageInfo.index}/${stageInfo.total}`:'';const focusName=stageInfo?.name||(focus?sessionDisplayName(focus):'');let current='';if(rt.phase==='WARMUP')current=S('Warm-up','Iesildīšanās');else if(rt.phase==='RAMP_PROMPT'||rt.phase==='RAMP_ACTIVE')current=`${S('Ramp-up','Iesildīšanās')} ${focusName}`;else if(rt.phase==='REST')current=`${S('Rest','Atpūta')} ${focusName}`.trim();else if(rt.phase==='UNLOAD')current=`${S('Deload','Noņemt svarus')} ${focusName}`.trim();else if(rt.phase==='STRETCH')current=S('Stretching','Stiepšanās');else if(rt.phase==='FINAL')current=S('Workout complete','Treniņš pabeigts');else current=focusName;const action=previewNextAction(ctx),next=action?headerActionLabel(exs,action,{forceWorking:!!action.forceWorking}):'';return{stage,current,next};}

function simpleActiveHeaderState(ctx=currentActiveContext()){
  const {rt,exs,e}=ctx;if(!rt||!exs?.length)return{stage:'',next:''};
  // Warm-up, stretching and the completed-workout screen deliberately keep the
  // header quiet: only the thin progress bar remains visible.
  if(['WARMUP','STRETCH','FINAL'].includes(rt.phase))return{stage:'',next:''};
  let focus=e;
  if(rt.phase==='REST'&&rt.rest?.setIds?.length){const ids=new Set(rt.rest.setIds.map(Number));focus=exs.find(x=>exerciseSets(state,x.id).some(set=>ids.has(Number(set.id))))||focus;}
  if((rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.entry?.setId){focus=exs.find(x=>exerciseSets(state,x.id).some(set=>Number(set.id)===Number(rt.entry.setId)))||focus;}
  const currentStage=focusStageInfo(exs,focus),groups=focusStageGroups(exs);
  let next='';
  if(focus){
    const currentIndex=groups.findIndex(g=>g.members.some(x=>x.id===focus.id));
    const nextGroup=groups.slice(Math.max(0,currentIndex+1)).find(g=>g.members.some(member=>exerciseSets(state,member.id).some(set=>set.status==='PENDING')));
    next=nextGroup?(nextGroup.members.length>1?`${S('Superset','Supersets')} ${nextGroup.members.map(sessionDisplayName).join(' + ')}`:sessionDisplayName(nextGroup.members[0])):S('Stretching','Stiepšanās');
  }
  return{stage:currentStage?`${currentStage.index}/${currentStage.total}`:'',next};
}
function workoutProgressFraction(){
  const rt=runtime(),ses=rt?getSession(rt.sessionId):activeSession();if(!rt||!ses)return 0;
  const exs=sessionExercises(state,ses.id),all=exs.flatMap(e=>exerciseSets(state,e.id).map(set=>({e,set})));
  if(!all.length)return ses.stretchEndedAt?1:0;
  let total=0,done=0;const entryIds=new Set([rt.entry?.setId,...(rt.supersetEntry||[]).map(x=>x.setId)].filter(Boolean).map(Number)),restIds=new Set((rt.rest?.setIds||[rt.rest?.setId]).filter(Boolean).map(Number));
  for(const {e,set} of all){const work=.70,rest=Number(set.plannedRestSeconds||0)>0?.30:0;total+=work+rest;if(set.status==='SKIPPED'){done+=work+rest;continue;}if(set.status==='COMPLETE'){done+=work;if(set.actualRestSeconds!=null)done+=rest;else if(rt.rest&&restIds.has(Number(set.id))&&rest>0){const span=Math.max(1,Number(rt.rest.endsAt)-Number(rt.rest.startedAt)),elapsed=Math.max(0,Math.min(span,now()-Number(rt.rest.startedAt)));done+=rest*(elapsed/span);}continue;}if(entryIds.has(Number(set.id)))done+=work;if(rt.phase==='TIMED_SET'&&Number(ctxSetIdSafe())===Number(set.id)){const target=Math.max(1,Number(set.targetDurationSeconds||e.targetSeconds||60)),elapsed=Math.max(0,(now()-Number(rt.phaseStartedAt||now()))/1000);done+=work*Math.min(1,elapsed/target);}if(rt.rest&&restIds.has(Number(set.id))&&rest>0){const span=Math.max(1,Number(rt.rest.endsAt)-Number(rt.rest.startedAt)),elapsed=Math.max(0,Math.min(span,now()-Number(rt.rest.startedAt)));done+=rest*(elapsed/span);}}
  return Math.max(0,Math.min(1,done/Math.max(.001,total)));
}
function ctxSetIdSafe(){try{return currentActiveContext().set?.id??null}catch{return null}}
function refreshWorkoutProgressBar(){const el=document.querySelector('.workout-progress-fill');if(el)el.style.width=`${(workoutProgressFraction()*100).toFixed(1)}%`;}
function renderNextInfo(){const ctx=currentActiveContext(),action=previewNextAction(ctx);if(!ctx.rt||!action)return'';const label=displayAction(ctx.exs,action,{forceWorking:!!action.forceWorking});if(!label)return'';const lines=label.split('\n');return `<div class="next-info ${lines.length>1?'superset-next-info':''}"><span>${esc(S('NEXT','TĀLĀK'))}${lines.length>1?' · '+esc(S('SUPERSET','SUPERSETS')):''}</span>${lines.map((line,i)=>i===0&&lines.length>1?'':`<strong>${line}</strong>`).join('')}</div>`;}
function setForCurrentPending(e){return exerciseSets(state,e.id).find(x=>x.status==='PENDING')||null;}
function runtime(){return state.runtime;}
function fmtPct(v){return v==null?'—':`${v>=0?'+':''}${v.toFixed(1)}%`;}
function nextWorkoutAfter(workoutId){const all=state.workout_templates.filter(w=>w.isActive!==false).sort((a,b)=>a.position-b.position);if(!all.length)return null;const i=all.findIndex(w=>w.id===workoutId);return all[(i<0?0:(i+1)%all.length)].id;}
function suggestedNextSessionAt(fromMs=now()){return Number(fromMs)+72*60*60*1000;}
function nextSessionDateLabel(ms){return new Intl.DateTimeFormat(localeFor(languageCode(state)),{day:'numeric',month:'short'}).format(new Date(ms));}
function localDateInput(ms){const d=new Date(ms),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function timeParts(value,fallback){const m=/^(\d{2}):(\d{2})$/.exec(String(value||''));if(!m)return fallback;return[Math.max(0,Math.min(23,Number(m[1]))),Math.max(0,Math.min(59,Number(m[2])))];}
function nextReminderTimes(nextAt){const d=new Date(nextAt),[eh,em]=timeParts(state.app_state.eveningReminderTime,[19,0]),[mh,mm]=timeParts(state.app_state.morningReminderTime,[8,0]);return{evening:new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,eh,em,0,0).getTime(),morning:new Date(d.getFullYear(),d.getMonth(),d.getDate(),mh,mm,0,0).getTime()};}
function latestRecordedSessionAt(){const rows=state.workout_sessions.filter(x=>x.status==='COMPLETE'||x.status==='ABORTED').map(x=>Number(x.endedAt||x.startedAt||0)).filter(Boolean);return rows.length?Math.max(...rows):null;}
async function showBrowserNotification(title,body,tag){if(!('Notification'in window)||Notification.permission!=='granted')return false;const lang=languageCode(state);title=t(title,lang);body=t(body,lang);try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,tag,icon:'./icons/icon-192.png',badge:'./icons/favicon-64.png'});return true;}new Notification(title,{body,tag,icon:'./icons/icon-192.png'});return true;}catch{return false;}}
async function requestNotificationPermission(){if(!('Notification'in window)){toast('Browser notifications are not available here');return;}const result=await Notification.requestPermission();toast(result==='granted'?'Notifications enabled':'Notifications not enabled');render();}
async function checkMotivationReminders(){const a=state?.app_state;if(!a?.motivationEnabled)return;let changed=false;const t=now();if(!activeSession()){const last=latestRecordedSessionAt();if(last!=null&&t>=last+Number(a.inactivityReminderHours||72)*3600000&&a.lastInactivityReminderFor!==last){const days=Math.round(Number(a.inactivityReminderHours||72)/24);if(await showBrowserNotification('Ready for another session?',`It’s been ${days} ${days===1?'day':'days'} since your last recorded workout.`,'gym-inactivity')){a.lastInactivityReminderFor=last;changed=true;}}}const nextAt=a.nextSessionAt==null?null:Number(a.nextSessionAt);if(nextAt!=null){const {evening,morning}=nextReminderTimes(nextAt);if(t>=evening&&t<morning&&a.nextEveningReminderFor!==nextAt){if(await showBrowserNotification('Gym tomorrow','Your next session is planned for tomorrow.','gym-next-evening')){a.nextEveningReminderFor=nextAt;changed=true;}}if(t>=morning&&a.nextMorningReminderFor!==nextAt){if(await showBrowserNotification(t>nextAt?'Planned session is due':'Gym today',t>nextAt?'Your planned gym session is now overdue.':'Your next session is planned for today.','gym-next-morning')){a.nextMorningReminderFor=nextAt;changed=true;}}}if(changed)await persist();}

const UPDATE_ANNOUNCEMENT_KEY='gym-progress-pwa-update-brief-version';
const LAST_SEEN_APP_VERSION_KEY='gym-progress-pwa-last-seen-version';
const UPDATE_FEATURES=[
  {version:'1.5.0',key:'identity',en:'Exercises now keep a stable identity, so renaming them does not break history.',lv:'Vingrinājumiem tagad ir stabila identitāte, tāpēc pārdēvēšana nesabojā vēsturi.'},
  {version:'1.5.1',key:'tracker',en:'You can track daily things like protein, pills and water.',lv:'Tagad vari sekot ikdienas lietām, piemēram, olbaltumvielām, tabletēm un ūdenim.'},
  {version:'1.5.3',key:'friends',en:'Supported barbell and dumbbell exercises can be compared with friends.',lv:'Atbalstītos stieņa un hanteļu vingrinājumus vari salīdzināt ar draugiem.'},
  {version:'1.5.5',key:'supersets',en:'You can join two neighbouring exercises into a superset.',lv:'Divus blakus vingrinājumus vari apvienot supersetā.'},
  {version:'1.5.8',key:'timed-supersets',en:'Timed exercises can now be used in supersets and can keep weight when relevant.',lv:'Laika vingrinājumus tagad vari izmantot supersetos un, ja vajadzīgs, saglabāt darba svaru.'},
  {version:'1.5.8',key:'comparison-chart',en:'Friend progress now appears together on one comparison chart.',lv:'Tavs un drauga progress tagad redzams kopā vienā salīdzināšanas grafikā.'},
  {version:'1.5.8',key:'daily-tracker-reset',en:'Tracker starts a fresh daily total automatically at local midnight.',lv:'Tracker automātiski sāk jaunu dienas uzskaiti vietējā pusnaktī.'},
  {version:'1.5.9',key:'tracker-polish',en:'Tracker is easier to manage, with notification controls and clearer daily progress.',lv:'Tracker tagad ir vieglāk pārvaldīt ar paziņojumu vadību un skaidrāku dienas progresu.'},
  {version:'1.5.9',key:'chart-scale',en:'Progress charts now use cleaner, easier-to-read scale labels.',lv:'Progresa grafikiem tagad ir skaidrākas un vieglāk nolasāmas skalas.'},
  {version:'1.5.10',key:'session-cues',en:'Workout cues, tracker progress and friend comparison are clearer, and deleted comparison records stay in sync.',lv:'Treniņa norādes, Tracker progress un draugu salīdzinājums ir skaidrāki, un dzēstie salīdzinājuma ieraksti tiek sinhronizēti.'},
  {version:'1.5.11',key:'phase-cues',en:'Workout current/next cues and result-entry rest controls are more reliable.',lv:'Treniņa pašreizējās/nākamās darbības norādes un atpūtas vadība rezultātu ievadē ir uzticamākas.'},
  {version:'1.5.12',key:'fixed-stage-header',en:'The workout header now shows stage, current action and next action together, and the finish summary is clearer.',lv:'Treniņa galvene tagad vienlaikus rāda posmu, pašreizējo un nākamo darbību, un treniņa noslēguma kopsavilkums ir skaidrāks.'},
  {version:'1.5.13',key:'scrolling-active-status',en:'The workout header now keeps time and stage fixed while long Now/Next text scrolls.',lv:'Treniņa galvenē laiks un posms paliek vietā, bet garš Tagad/Tālāk teksts rit horizontāli.'}
  ,{version:'1.5.17',key:'interface-polish',en:'Home, workout and Friends screens are cleaner and faster to use.',lv:'Sākuma, treniņa un Draugu ekrāni tagad ir tīrāki un ātrāk lietojami.'}
  ,{version:'1.5.18',key:'tracker-pace-exact-weights',en:'Tracker pacing now follows real due windows, and programme weights keep exact manual values.',lv:'Tracker temps tagad seko faktiskajiem izpildes logiem, un programmas svari saglabā precīzi ievadītās vērtības.'}
  ,{version:'1.5.19',key:'tracker-six-checkpoints',en:'Dense Tracker goals now use six evenly spaced checkpoints across your active day.',lv:'Blīviem Tracker mērķiem tagad ir seši vienmērīgi sadalīti kontrolpunkti aktīvās dienas laikā.'}
  ,{version:'1.5.20',key:'workout-progress-intelligence',en:'Workout progress is clearer and Progress uses the best occurrence in each cycle.',lv:'Treniņa progress ir skaidrāks, un Progresa sadaļa ciklā izmanto labāko izpildījumu.'}
  ,{version:'1.6.0',key:'account-sync',en:'Account sync now exchanges and merges your programme, workout history and Tracker between signed-in devices. Gym Progress still works fully offline.',lv:'Konta sinhronizācija tagad apmaina un apvieno tavu programmu, treniņu vēsturi un Tracker starp pieslēgtām ierīcēm. Gym Progress joprojām pilnībā darbojas bezsaistē.'}
  ,{version:'1.7.0',key:'stable-sync-review',en:'Sync review now opens immediately with a loading state. When all selected training data already matches the cloud, the review shows a single Close action instead of offering an unnecessary sync.',lv:'Sinhronizācijas pārskats tagad atveras uzreiz ar ielādes stāvokli. Ja atlasītie treniņu dati jau sakrīt ar mākoni, pārskatā tiek rādīta tikai poga Aizvērt, nevis nevajadzīga sinhronizācija.'}
  ,{version:'1.7.2',key:'exercise-comments',en:'Workout comments now belong to each exercise and are saved immediately after that exercise is finished.',lv:'Treniņa komentāri tagad pieder katram vingrinājumam un tiek saglabāti uzreiz pēc vingrinājuma pabeigšanas.'}
  ,{version:'1.7.2',key:'local-first-reliability',en:'Local data renders before cloud work, temporary network errors no longer clear your login, and workout volume/progress now use one consistent total.',lv:'Lokālie dati tagad tiek parādīti pirms mākoņa darbībām, pagaidu tīkla kļūdas vairs neizdzēš pieslēgšanos, un treniņa apjoms/progress izmanto vienu konsekventu kopējo vērtību.'}
  ,{version:'1.7.3',key:'exact-loads-e1rm',importance:5,en:'Exact manually entered weights are preserved in logs and progression. Progress e1RM now uses the heaviest valid completed set and can recover older weighted sets even when historical RIR is missing.',lv:'Precīzi manuāli ievadītie svari tiek saglabāti žurnālos un progresijā. Progresa e1RM tagad izmanto smagāko derīgo pabeigto piegājienu un spēj aprēķināt arī vecākus svara piegājienus bez vēsturiska RIR.'}
  ,{version:'1.7.3',key:'postpone-return',importance:4,en:'Occupied equipment? Postpone an exercise until after the next exercise or the end. After a long break the app can offer a conservative session-only load reduction.',lv:'Aprīkojums aizņemts? Atliek vingrinājumu pēc nākamā vai uz treniņa beigām. Pēc ilgāka pārtraukuma lietotne var piedāvāt konservatīvu svaru samazinājumu tikai šim treniņam.'}
  ,{version:'1.7.3',key:'ramp-up',importance:4,en:'Ramp-up sets now climb close to the working load, including decimal work weights such as 97.5 kg.',lv:'Iesildīšanās piegājieni tagad pietuvojas darba svaram, arī pie decimāliem darba svariem, piemēram, 97,5 kg.'}
  ,{version:'1.7.3',key:'celebration-gallery',importance:3,en:'Workout celebration can rotate photos from the celebrations folder, and Share stays disabled until a card is selected.',lv:'Treniņa noslēguma attēls var rotēt fotogrāfijas no celebrations mapes, un Kopīgot paliek neaktīvs, kamēr nav izvēlēta kartīte.'}
  ,{version:'1.7.6',key:'cardio-activity-progress',importance:5,en:'Cardio now uses one continuous activity with a target duration, dedicated metrics and per-exercise Progress. Similar-effort pace and power can be compared without mixing them with strength e1RM.',lv:'Kardio tagad ir viena nepārtraukta aktivitāte ar mērķa ilgumu, atsevišķiem rādītājiem un katra vingrinājuma progresu. Līdzīgas piepūles temps un jauda tiek salīdzināti atsevišķi no spēka e1RM.'}
  ,{version:'1.7.6',key:'rest-safe-management',importance:5,en:'You can use Later, Replace and Skip before the next exercise during rest. The rest countdown continues untouched while Next updates to the newly selected exercise.',lv:'Atpūtas laikā pirms nākamā vingrinājuma var izmantot Vēlāk, Aizstāt un Izlaist. Atpūtas laika atskaite netiek pārtraukta, bet Tālāk atjaunojas ar izvēlēto vingrinājumu.'}
  ,{version:'1.7.6',key:'cardio-effort',importance:4,en:'Cardio RPE indicates effort on workout-day cards and timeline points. Missing effort and mixed strength/cardio days are neutral; heart rate and training load remain supporting metrics.',lv:'Kardio RPE rāda piepūli treniņu dienu kartītēs un laika skalā. Ja piepūle nav ievadīta vai treniņš ir jaukts, krāsa ir neitrāla; pulss un slodzes apjoms paliek papildrādītāji.'}
  ,{version:'1.7.6',key:'pwa-start-actions-ui',importance:3,en:'PWA workout start no longer waits for audio or slow storage, and the centred blue-grey Later, Replace and Skip buttons are distinct from Complete.',lv:'PWA treniņa sākums vairs negaida audio vai lēnu datu saglabāšanu; centrētās zilpelēkās Vēlāk, Aizstāt un Izlaist pogas ir atšķirīgas no Pabeigt.'}
  ,{version:'1.7.5',key:'sql-reference-exercises',importance:5,en:'The exercise-substitution catalogue now updates from shared Supabase reference data, prioritises your familiar exercises, and remains usable offline. Cardio exercises are now linked to canonical catalogue identities.',lv:'Vingrinājumu aizstāšanas katalogs tagad tiek atjaunināts no kopīgajiem Supabase atsauces datiem, dod priekšroku pazīstamiem vingrinājumiem un darbojas arī bezsaistē. Kardio vingrinājumiem piešķirtas kataloga identitātes.'}
  ,{version:'1.7.5',key:'sql-cardio-categories',importance:4,en:'The shared catalogue now distinguishes cardio from strength exercises. Fourteen cardio activities are available, including running, cycling, rowing, swimming and hiking.',lv:'Kopīgajā katalogā kardio vingrinājumi tagad ir nodalīti no spēka vingrinājumiem. Pieejami četrpadsmit kardio vingrinājumi, tostarp skriešana, riteņbraukšana, airēšana, peldēšana un pārgājieni.'}
  ,{version:'1.7.4',key:'cardio-tracking',importance:5,en:'Cardio exercises track duration, optional distance, heart rate, power and session effort, separately from lifting volume and without an invented overall cardio percentage.',lv:'Kardio vingrinājumi saglabā ilgumu, neobligātu distanci, pulsu, jaudu un pašvērtējumu, atsevišķi no spēka treniņa apjoma un bez izdomāta kopējā kardio procenta.'}
  ,{version:'1.7.4',key:'exercise-replacement',importance:5,en:'Replace an exercise with a related movement, prioritising exercises from other programme days with known recorded weights. Later and Skip actions stay in the workout; the programme is untouched.',lv:'Aizstāj vingrinājumu ar līdzīgu, vispirms piedāvājot vingrinājumus no citām programmas dienām ar zināmiem darba svariem. Atlikt un Izlaist pieejami treniņā; programma netiek mainīta.'}
  ,{version:'1.7.4',key:'warmup-rest-whole-note',importance:4,en:'Barbell ramp-ups use practical large plates, rest shows the real adjusted next weight, and the optional private whole-workout log comment is restored.',lv:'Stieņa iesildīšanās izmanto praktiskus lielo svaru ripu variantus, atpūtā redzams faktiskais nākamais svars, un atjaunots neobligātais privātais treniņa kopējais komentārs.'}
  ,{version:'1.7.4',key:'faster-sections-tracker',importance:2,en:'Tracker + responds without waiting for storage; Logs uses lazy batches, and repeated metric lookups use local indexes. Comment fields request sentence capitalisation.',lv:'Tracker + reaģē negaidot datu saglabāšanu; žurnāls ielādē kopsavilkumus pa daļām, aprēķini izmanto lokālus indeksus. Komentāros aktivizēti teikumu sākuma lielie burti.'}
  ,{version:'1.7.3',key:'formula-audit',importance:2,en:'Exercise/workout comparison formulas and historical e1RM handling were audited for consistent occurrence matching.',lv:'Vingrinājumu/treniņu salīdzināšanas formulas un vēsturiskā e1RM apstrāde ir pārbaudīta, lai konsekventi salīdzinātu vienus un tos pašus programmas gadījumus.'}
  ,{version:'1.7.1',key:'tracker-current-state',en:'Tracker now syncs one current daily state per item instead of accumulating historical daily rows. The state resets at local midnight.',lv:'Tracker tagad sinhronizē vienu pašreizējās dienas stāvokli katram ierakstam, nevis uzkrāj vēsturiskas dienu rindas. Stāvoklis tiek atiestatīts vietējā pusnaktī.'}
  ,{version:'1.6.4',key:'sync-restore-ui',en:'Sync restore now treats an empty device as a restore, not a programme conflict; login updates the account header immediately; share checkmarks turn green only when selected.',lv:'Sinhronizācijas atjaunošana tagad tukšu ierīci uztver kā atjaunošanu, nevis programmas konfliktu; pēc pieslēgšanās konta galvene atjaunojas uzreiz; kopīgošanas ķeksītis kļūst zaļš tikai tad, kad izvēlēts.'}
  ,{version:'1.6.4',key:'account-home',en:'Account is now an app-level control instead of a Friends setting. Use the account button from anywhere; Settings is the main place for account, sync and deletion controls.',lv:'Konts tagad ir visas lietotnes vadība, nevis Draugu iestatījums. Konta poga pieejama visur; Iestatījumi ir galvenā vieta kontam, sinhronizācijai un dzēšanai.'}
  ,{version:'1.6.4',key:'trend-actions',en:'PROGRESS / HOLD / REDUCE are the app’s immediate recommendation for the next exposure: increase the challenge, keep it unchanged, or consider reducing it. They are based on completed sets versus the programmed target and RIR/failure—not a rating of you.',lv:'PROGRESS / HOLD / REDUCE ir lietotnes tūlītējais ieteikums nākamajai reizei: palielināt slodzi, saglabāt to vai apsvērt samazinājumu. Tas balstās pabeigtajos piegājienos pret mērķi un RIR/atteici, nevis vērtē tevi.'}
  ,{version:'1.6.4',key:'trend-states',en:'Trend labels describe how one exercise is changing across recent exposures compared with your own pattern: On track = normal; Progression approaching = improving; Slower than usual = taking longer; Stalled = flat materially longer; Declining = recent performance is moving down. Calibrating means there is not enough history yet.',lv:'Tendenču apzīmējumi rāda, kā vingrinājums mainās pēdējās reizēs pret tavu paša ritmu: On track = normāli; Progression approaching = uzlabojas; Slower than usual = prasa ilgāku laiku; Stalled = ilgstoši stāv uz vietas; Declining = sniegums krītas. Calibrating nozīmē, ka vēstures vēl nepietiek.'}
  ,{version:'1.6.4',key:'sync-convergence',en:'Sync now converges record by record, includes your scheduled/current programme day, and prevents stale device copies from repeatedly bringing old workout history back.',lv:'Sinhronizācija tagad saplūst ierakstu līmenī, ietver ieplānoto/pašreizējo programmas dienu un neļauj novecojušām ierīces kopijām atkārtoti atjaunot vecu treniņu vēsturi.'}
  ,{version:'1.6.4',key:'tracker-live',en:'Tracker changes now appear immediately on this device; cloud sync happens afterwards in the background.',lv:'Tracker izmaiņas tagad uzreiz parādās šajā ierīcē; mākoņa sinhronizācija notiek pēc tam fonā.'}
];
function versionParts(v){return String(v||'0').split('.').map(x=>Number(x)||0);}
function compareVersions(a,b){const aa=versionParts(a),bb=versionParts(b),n=Math.max(aa.length,bb.length);for(let i=0;i<n;i++){const d=(aa[i]||0)-(bb[i]||0);if(d)return d;}return 0;}
function updatePreviousVersion(){try{return localStorage.getItem(LAST_SEEN_APP_VERSION_KEY)||localStorage.getItem(UPDATE_ANNOUNCEMENT_KEY)||'1.3.0';}catch{return'1.3.0';}}
function showUpdateAnnouncementIfNeeded(){
  const previous=updatePreviousVersion();if(compareVersions(previous,APP_VERSION)>=0)return;
  const selected=[],seen=new Set();for(const item of UPDATE_FEATURES){if(compareVersions(item.version,previous)>0&&compareVersions(item.version,APP_VERSION)<=0&&!seen.has(item.key)){seen.add(item.key);selected.push(item);}}
  if(!selected.length){try{localStorage.setItem(LAST_SEEN_APP_VERSION_KEY,APP_VERSION);localStorage.setItem(UPDATE_ANNOUNCEMENT_KEY,APP_VERSION);}catch{}return;}
  const ordered=selected.slice().sort((a,b)=>Number(b.importance||1)-Number(a.importance||1)||compareVersions(b.version,a.version));const lv=languageCode(state)==='lv',title=lv?'Kas jauns':'What’s new',intro=lv?`Jaunumi kopš ${previous}`:`New since ${previous}`,items=ordered.slice(0,5).map(x=>lv?x.lv:x.en);
  openDialog(`<div class="update-brief"><div class="small">GYM PROGRESS · ${esc(APP_VERSION)}</div><h2>${esc(title)}</h2><div class="update-brief-intro">${esc(intro)}</div><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="dialog-actions"><button onclick="gp.dismissUpdateAnnouncement()">${esc(lv?'Sapratu':'Got it')}</button></div></div>`);
}
function dismissUpdateAnnouncement(){try{localStorage.setItem(LAST_SEEN_APP_VERSION_KEY,APP_VERSION);localStorage.setItem(UPDATE_ANNOUNCEMENT_KEY,APP_VERSION);}catch{}closeDialog();if(socialSignedIn())setTimeout(()=>void maybeOfferTrainingSyncAfterUpdate(),100);else if(!state.workout_templates.some(w=>w.isActive!==false)&&!state.app_state.starterPromptDismissed)setTimeout(()=>showEmptyStarterPrompt(),60);}

let finishCelebrationPreload=null;
let finishCelebrationImages=['./finish-celebration.png'];
async function discoverFinishCelebrations(){
  const slots=Array.from({length:12},(_,i)=>`./celebrations/${String(i+1).padStart(2,'0')}.jpg`);
  const found=await Promise.all(slots.map(async path=>{try{const response=await fetch(path,{cache:'force-cache'});if(!response.ok)return null;await response.blob();return path;}catch{return null;}}));
  finishCelebrationImages=['./finish-celebration.png',...found.filter(Boolean)];return finishCelebrationImages;
}
function chooseFinishCelebration(){const images=finishCelebrationImages.length?finishCelebrationImages:['./finish-celebration.png'];let last='';try{last=sessionStorage.getItem('gp-last-celebration')||'';}catch{}const alternatives=images.filter(x=>x!==last),pool=alternatives.length?alternatives:images,path=pool[Math.floor(Math.random()*pool.length)];try{sessionStorage.setItem('gp-last-celebration',path);}catch{}return path;}
function preloadFinishCelebration(){
  if(finishCelebrationPreload)return finishCelebrationPreload;
  finishCelebrationPreload=(async()=>{await discoverFinishCelebrations();const path=chooseFinishCelebration();try{const img=new Image();img.decoding='async';img.src=path;if(img.decode)await img.decode();else await new Promise(resolve=>{img.onload=img.onerror=resolve;});}catch{}})();
  return finishCelebrationPreload;
}
function expandChevron(extraClass=''){return `<span class="app-expand-chevron ${extraClass}" aria-hidden="true"><svg viewBox="0 0 24 14" focusable="false"><path d="M3 3l9 8 9-8"/></svg></span>`;}
function navChevron(){return expandChevron('nav-chevron');}
function pencilIcon(){return `<svg class="pencil-outline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l3.2-.8L18.4 8l-2.4-2.4L5.8 15.8 5 19Z"/><path d="m14.6 7 2.4 2.4"/></svg>`;}

const SYNC_PROMPT_VERSION_KEY='gym-progress-sync-prompt-version';
async function maybeOfferTrainingSyncAfterUpdate(){
  if(!socialSignedIn())return false;
  let shown='';try{shown=localStorage.getItem(SYNC_PROMPT_VERSION_KEY)||'';}catch{}
  if(shown===APP_VERSION)return false;
  try{localStorage.setItem(SYNC_PROMPT_VERSION_KEY,APP_VERSION);}catch{}
  await openTrainingSyncReview();return true;
}

async function init(){
  restoreCachedReferenceData();
  void preloadFinishCelebration();
  // IndexedDB is authoritative for startup. Do not block local rendering on a network/file
  // fetch for performance rules; bundled defaults are immediately usable.
  const loaded=await loadState();
  let persistAfterFirstRender=false;
  if(loaded){
    const loadedInternalVersion=Number(loaded.internalVersion||0);
    // Preserve the exact pre-identity state before the first v1.5.x normalisation.
    if(loadedInternalVersion<4&&hasTrainingData(loaded))await saveRecoveryState(loaded,'pre-identity-migration-v1');
    if(loadedInternalVersion<6&&hasTrainingData(loaded))await saveRecoveryState(loaded,'pre-sync-v2');
    if(loadedInternalVersion<7)await saveRecoveryState(loaded,'pre-tracker-state-v1');
    const migrated=normalize(loaded);
    if(hasTrainingData(loaded)&&!migrationPreservedTrainingData(loaded,migrated))throw new Error('Local training-data migration validation failed; refusing to overwrite IndexedDB');
    state=migrated;
    if(!state.app_state.nextWorkoutId&&state.workout_templates.length){ensureRotation();persistAfterFirstRender=true;}
    if(loadedInternalVersion<8)persistAfterFirstRender=true;
    ui.selectedWorkoutId=state.app_state.nextWorkoutId;
  }else{
    // A missing state is valid for a new install, but do not immediately write an empty
    // replacement. This prevents a transient/mismatched storage read from destroying data.
    state=defaults();
    ui.selectedWorkoutId=null;
  }
  // First paint comes directly from IndexedDB/in-memory state. A migration writeback is
  // deliberately deferred until after render so a large history never blocks the UI.
  render();
  void refreshReferenceData().then(changed=>{if(changed)render();}).catch(()=>{});
  if(persistAfterFirstRender)void saveState(state).catch(console.warn);
  void loadPerformanceRules().then(()=>render()).catch(()=>{});
  if(socialSignedIn())getMyProfile().then(x=>{socialUi.profile=x;render();}).catch(()=>{});
  void refreshSocialBadge();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
  tickHandle=setInterval(tick, 1000);
  setInterval(()=>{void refreshSocialBadge();},30000);
  setInterval(()=>{void performTrainingSync({reason:'interval'});},300000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();void refreshSocialBadge();void performTrainingSync({reason:'resume'});}});
  window.addEventListener('online',()=>void performTrainingSync({reason:'online'}));
  showUpdateAnnouncementIfNeeded();
  if(socialSignedIn()){
    if(enabledSyncDomains(state).length)setTimeout(()=>void performTrainingSync({reason:'launch'}),250);
    setTimeout(()=>{if(!document.querySelector('.dialog-backdrop'))void maybeOfferTrainingSyncAfterUpdate();},700);
  }
  checkMotivationReminders().catch(()=>{});
}

function accountDisplayLabel(){return socialSignedIn()?(socialUi.profile?.display_name||String(socialUser()?.email||S('Account','Konts')).split('@')[0]):S('Log in','Pieslēgties');}
function accountChip(){return `<button class="account-chip ${socialSignedIn()?'signed-in':''}" onclick="gp.openAccount()">${esc(accountDisplayLabel())}</button>`;}
function shell(content,{topbar=null,navBar=true}={}){
  const showAccount=route.name!=='active';
  const banner=showAccount?activeSessionBanner():'';
  const head=(topbar||banner)?`<div class="persistent-head">${topbar||''}${banner}</div>`:'';
  const overlay=showAccount&&!topbar?`<div class="view-account-chip">${accountChip()}</div>`:'';
  return `<div class="app-shell">${head}<main class="view ${topbar?'with-top':''} ${overlay?'has-account':''}">${overlay}${content}</main>${navBar?bottomNav():''}</div>`;
}
function mainNavIcon(name){
  const icons={
    home:'<path d="M3.5 10.7 12 3.8l8.5 6.9v9.1c0 .7-.5 1.2-1.2 1.2h-5.1v-6.2H9.8V21H4.7c-.7 0-1.2-.5-1.2-1.2z"/>',
    logs:'<path d="M4.4 7.2V3.9M4.4 7.2h3.3"/><path d="M4.7 7a8.1 8.1 0 1 1-1 7.3"/><path d="M12 7.4v5l3.5 2"/>',
    progress:'<path class="nav-icon-fill" d="M4.8 10.2h3.1V20H4.8zm5.65-5.1h3.1V20h-3.1zm5.65 7.5h3.1V20h-3.1z"/>',
    friends:'<circle cx="8.5" cy="8" r="3"/><circle cx="16.4" cy="8.7" r="2.4"/><path d="M2.9 19.8c.5-3.5 2.5-5.4 5.6-5.4s5.1 1.9 5.6 5.4"/><path d="M14 14.7c.7-.5 1.6-.7 2.5-.7 2.6 0 4.2 1.7 4.6 4.7"/>',
    settings:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5"/><circle cx="12" cy="12" r="7.1"/>',
  };
  return `<svg class="main-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]||''}</svg>`;
}
function bottomNav(){return `<nav class="nav">
  ${navButton('home',mainNavIcon('home'),'Home')}${navButton('logs',mainNavIcon('logs'),'Logs')}${navButton('progress',mainNavIcon('progress'),'Progress')}${navButton('friends',mainNavIcon('friends'),'Friends',socialUi.unseen)}${navButton('settings',mainNavIcon('settings'),'Settings')}
</nav>`;}
function navButton(name,icon,label,badge=false){return `<button data-route="${name}" class="${route.name===name?'active':''}" onclick="gp.nav('${name}')"><span class="nav-icon nav-icon-wrap">${icon}${badge?'<i class="nav-badge"></i>':''}</span><span>${esc(S(label,label==='Friends'?'Draugi':label))}</span></button>`;}
function topbar(title,back='home',right=''){const account=route.name==='active'?'':accountChip();return `<div class="topbar"><button class="icon-btn" onclick="gp.nav('${back}')">‹</button><div class="topbar-title">${esc(title)}</div><div class="topbar-actions">${right}${account}</div></div>`;}

function render(){
  if(!state)return;
  let html;
  switch(route.name){
    case'logs':html=renderLogs();break;case'progress':html=renderProgress();break;case'friends':html=renderFriends();break;case'settings':html=renderSettings();break;case'manual':html=renderManual();break;
    case'programme':html=renderProgramme();break;case'workout':html=renderWorkoutEditor(route.id);break;case'session':html=renderSessionDetail(route.id);break;
    case'active':html=renderActive();break;default:html=renderHome();
  }
  appEl.innerHTML=html;
  const lang=languageCode(state);document.documentElement.lang=lang;localizeDom(appEl,lang);
  updateLiveClocks();
  if(route.name==='active')afterActiveRender();
  if(route.name==='logs')requestAnimationFrame(bindWorkoutTimeline);
  if(route.name==='friends')requestAnimationFrame(bindFriendsTimeline);
  if(route.name==='programme'||route.name==='workout')requestAnimationFrame(bindProgrammeReorder);
  if(window.__gpShareDraft)renderShareSummary();
  if(route.name==='home'&&!state.workout_templates.some(w=>w.isActive!==false)&&!state.app_state.starterPromptDismissed){setTimeout(()=>{if(!document.querySelector('.dialog-backdrop'))showEmptyStarterPrompt();},0);}
  renderStatus();
}

function bindProgrammeReorder(){
  document.querySelectorAll('.drag-grip[data-reorder-kind]').forEach(grip=>{
    grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    grip.addEventListener('pointerdown',startEvent=>{
      if(startEvent.button!=null&&startEvent.button!==0)return;
      const row=grip.closest('.reorder-row');if(!row)return;
      startEvent.preventDefault();startEvent.stopPropagation();

      const kind=grip.dataset.reorderKind,id=Number(grip.dataset.reorderId);
      const selector=kind==='workout'?'.programme-day.reorder-row':kind==='exercise-block'?'.exercise-block.reorder-row':'.exercise-programme-row.reorder-row';
      const originalRows=[...document.querySelectorAll(selector)];
      const from=originalRows.indexOf(row);if(from<0)return;
      const parent=row.parentElement,pointerId=startEvent.pointerId;
      const startRect=row.getBoundingClientRect();
      const pointerOffsetY=startEvent.clientY-startRect.top;
      let pointerY=startEvent.clientY,moved=false,scrollFrame=null,lastTarget=from;

      // Keep the list's full height while the dragged card floats above it.
      const placeholder=document.createElement('div');
      placeholder.className='reorder-placeholder';
      placeholder.style.height=`${startRect.height}px`;
      const computed=getComputedStyle(row);
      placeholder.style.marginBottom=computed.marginBottom;
      parent.insertBefore(placeholder,row);

      row.classList.add('dragging');
      document.body.classList.add('programme-dragging');
      Object.assign(row.style,{
        position:'fixed',left:`${startRect.left}px`,top:`${startRect.top}px`,
        width:`${startRect.width}px`,height:`${startRect.height}px`,margin:'0',
        zIndex:'140',pointerEvents:'none',transform:'translate3d(0,0,0) scale(1.015)'
      });
      document.body.appendChild(row);
      grip.setPointerCapture?.(pointerId);

      const rowsInList=()=>[...parent.querySelectorAll(selector)];
      const currentTarget=()=>{
        let index=0;
        for(const child of parent.children){
          if(child===placeholder)return index;
          if(child.matches?.(selector))index++;
        }
        return index;
      };
      const activeAnimations=new Map();
      const animateReflow=mutate=>{
        const rows=rowsInList();
        const before=new Map(rows.map(r=>[r,r.getBoundingClientRect()]));
        for(const r of rows){const a=activeAnimations.get(r);if(a){a.cancel();activeAnimations.delete(r);}}
        mutate();
        for(const r of rows){
          const a=before.get(r),b=r.getBoundingClientRect();if(!a)continue;
          const dx=a.left-b.left,dy=a.top-b.top;
          if(Math.abs(dx)<.5&&Math.abs(dy)<.5)continue;
          const anim=r.animate([
            {transform:`translate3d(${dx}px,${dy}px,0)`},
            {transform:'translate3d(0,0,0)'}
          ],{duration:190,easing:'cubic-bezier(.2,.8,.2,1)'});
          activeAnimations.set(r,anim);
          anim.onfinish=()=>activeAnimations.delete(r);
          anim.oncancel=()=>activeAnimations.delete(r);
        }
      };
      const movePlaceholder=y=>{
        const rows=rowsInList();
        let before=null;
        for(const r of rows){
          const b=r.getBoundingClientRect();
          if(y<b.top+b.height/2){before=r;break;}
        }
        const alreadyBefore=before?placeholder.nextElementSibling===before:placeholder.nextElementSibling==null;
        if(alreadyBefore)return;
        animateReflow(()=>{
          if(before)parent.insertBefore(placeholder,before);
          else if(rows.length)parent.insertBefore(placeholder,rows[rows.length-1].nextSibling);
          else parent.appendChild(placeholder);
        });
        lastTarget=currentTarget();
      };
      const updateFloatingRow=()=>{
        const top=pointerY-pointerOffsetY;
        row.style.top=`${top}px`;
      };
      const edgeScroll=()=>{
        const edge=96,maxStep=15;
        let step=0;
        if(pointerY<edge)step=-maxStep*(1-pointerY/edge);
        else if(pointerY>window.innerHeight-edge)step=maxStep*(1-(window.innerHeight-pointerY)/edge);
        if(Math.abs(step)>.2){
          window.scrollBy(0,step);
          movePlaceholder(pointerY);
        }
        scrollFrame=requestAnimationFrame(edgeScroll);
      };
      const move=ev=>{
        if(ev.pointerId!==pointerId)return;
        ev.preventDefault();ev.stopPropagation();
        pointerY=ev.clientY;
        if(Math.abs(ev.clientY-startEvent.clientY)>3)moved=true;
        updateFloatingRow();
        movePlaceholder(pointerY);
      };
      const cleanupFloating=()=>{
        if(scrollFrame!=null)cancelAnimationFrame(scrollFrame);
        for(const a of activeAnimations.values())a.cancel();
        activeAnimations.clear();
        row.classList.remove('dragging');document.body.classList.remove('programme-dragging');
        row.removeAttribute('style');
        try{grip.releasePointerCapture?.(pointerId);}catch{}
      };
      const finish=async ev=>{
        if(ev.pointerId!==pointerId)return;
        ev.preventDefault();ev.stopPropagation();
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',finish,true);
        document.removeEventListener('pointercancel',finish,true);
        const target=currentTarget();
        parent.insertBefore(row,placeholder);placeholder.remove();cleanupFloating();
        if(moved&&target!==from){
          const delta=target-from;
          if(kind==='workout')await moveWorkout(id,delta);else if(kind==='exercise-block')await moveExerciseBlock(id,delta);else await moveExercise(id,delta);
        }
      };

      document.addEventListener('pointermove',move,{capture:true,passive:false});
      document.addEventListener('pointerup',finish,{capture:true,passive:false});
      document.addEventListener('pointercancel',finish,{capture:true,passive:false});
      scrollFrame=requestAnimationFrame(edgeScroll);
      lastTarget=currentTarget();
    },{passive:false});
  });
}

function syncedElapsed(start,at=now()){const wall=Math.floor(Number(at)/1000)*1000,origin=Math.floor(Number(start)/1000)*1000;return Math.max(0,wall-origin);}
function activeSessionBanner(){const s=activeSession();if(!s)return'';return `<button class="active-session-banner" onclick="gp.resume(${s.id})"><span class="active-dot"></span><span class="active-banner-copy"><strong>WORKOUT IN PROGRESS</strong><span>${esc(s.workoutName)}</span></span><span class="active-banner-time live-session-time" data-start="${s.startedAt}">${formatDuration(syncedElapsed(s.startedAt))}</span><span class="active-banner-arrow">▶</span></button>`;}
function updateLiveClocks(){const wall=Math.floor(now()/1000)*1000;document.querySelectorAll('.live-session-time,.live-countup').forEach(el=>{const start=Number(el.dataset.start);if(Number.isFinite(start))el.textContent=formatDuration(syncedElapsed(start,wall));});document.querySelectorAll('.live-rest-time').forEach(el=>{const end=Number(el.dataset.ends);if(Number.isFinite(end))el.textContent=formatDuration(Math.max(0,end-wall));});document.querySelectorAll('.live-timed-set,.live-superset-timed').forEach(el=>{const start=Number(el.dataset.start),target=Number(el.dataset.target);if(Number.isFinite(start)&&start>0&&Number.isFinite(target))el.textContent=formatDuration(Math.max(0,target-Math.floor((wall-start)/1000))*1000);});refreshWorkoutProgressBar();}
function settingStepper(label,value,onMinus,onPlus){return `<div class="setting-stepper"><span>${esc(label)}</span><button class="icon-btn" onclick="${onMinus}">−</button><strong>${value}</strong><button class="icon-btn" onclick="${onPlus}">+</button></div>`;}
async function changeTargetRirMin(d){const a=state.app_state;a.targetRirMin=Math.max(0,Math.min(a.rirInputMax,a.targetRirMin+d));a.targetRirMax=Math.max(a.targetRirMin,a.targetRirMax);await persist();render();}
async function changeTargetRirMax(d){const a=state.app_state;a.targetRirMax=Math.max(a.targetRirMin,Math.min(a.rirInputMax,a.targetRirMax+d));await persist();render();}
async function setRirInputMax(v){const a=state.app_state;a.rirInputMax=Number(v)<=3?3:5;a.targetRirMin=Math.min(a.targetRirMin,a.rirInputMax);a.targetRirMax=Math.max(a.targetRirMin,Math.min(a.targetRirMax,a.rirInputMax));a.progressionRirThreshold=Math.min(a.progressionRirThreshold,a.rirInputMax);await persist();render();}
function renderManual(){const lang=languageCode(state);return shell(manualHtml(lang),{topbar:topbar(lang==='lv'?'Īsā pamācība':'Quick manual','settings'),navBar:false});}
function workoutNameExists(name,exceptId=null){const q=name.trim().toLocaleLowerCase();return state.workout_templates.some(w=>w.id!==Number(exceptId)&&w.name.trim().toLocaleLowerCase()===q);}
function flashTransition(msg,duration=INFO_MESSAGE_MS){ui.transitionMessage=msg;ui.transitionStartedAt=Date.now();ui.transitionDuration=duration;renderStatus();setTimeout(()=>{if(ui.transitionMessage===msg){ui.transitionMessage=null;renderStatus();}},duration);}
function hasPriorSimilarMovement(current){if(!current||current.rampMode!==RampMode.AUTO)return false;const family=warmupFamily(current.exerciseKey,current.name);if(!family)return false;const s=getSession(current.sessionId),exs=s?sessionExercises(state,s.id):[];return exs.some(e=>e.position<current.position&&exerciseSets(state,e.id).some(x=>x.status==='COMPLETE')&&warmupFamily(e.exerciseKey,e.name)===family);}
function showAutoregulationAdvice(advice){
  const next=getSet(advice.nextSetId);if(!next||next.status!=='PENDING')return;
  window.__gpAdvice=advice;
  const ex=getSessionExercise(next.sessionExerciseId),recommendation=ex?.equipment===Equipment.BODYWEIGHT?`${advice.suggestedReps} reps`:`${formatKg(advice.suggestedWeightKg)} × ${advice.suggestedReps}`;
  openDialog(`<h2>${esc(advice.title)}</h2><div class="muted dialog-copy">${esc(advice.reason)}</div><div class="advice-next"><span>Suggested set ${advice.nextSetNumber}</span><strong>${recommendation}</strong></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepAutoregulationCurrent()">Keep current</button><button onclick="gp.applyAutoregulation()">Apply next set</button></div>`);
}
async function applyAutoregulation(){const advice=window.__gpAdvice,next=advice?getSet(advice.nextSetId):null;if(next&&next.status==='PENDING'){const ex=getSessionExercise(next.sessionExerciseId);if(ex?.equipment!==Equipment.BODYWEIGHT)next.plannedWeightKg=snapSelectable(advice.suggestedWeightKg,ex?.equipment||Equipment.OTHER);next.targetReps=advice.suggestedReps;next.autoregulated=true;await persist();}window.__gpAdvice=null;closeDialog();render();toast('Next set adjusted');continuePostSetQueue();}
function keepAutoregulationCurrent(){window.__gpAdvice=null;closeDialog();continuePostSetQueue();}
async function finishAndSave(){const rt=runtime(),s=rt?getSession(rt.sessionId):null;if(!rt||!s)return;s.note=String($('#f-workout-note')?.value??s.note??'').trim().slice(0,2000);const finishedAt=now();s.endedAt=finishedAt;s.status='COMPLETE';if(s.advancesRotation&&s.workoutId!=null)state.app_state.nextWorkoutId=nextWorkoutAfter(s.workoutId);state.app_state.lastInactivityReminderFor=null;state.runtime=null;ui.selectedWorkoutId=state.app_state.nextWorkoutId;persistWorkoutIntelligence(state,s.id);await persist();if(socialSignedIn()){const points=comparisonPointsForSession(s.id);if(points.length)void publishComparisonPoints(points).catch(console.warn);}releaseWakeLock();document.body.classList.add('workout-summary-open');nav('home');showWorkoutFinishCelebration(s.id,finishedAt);}
function closeWorkoutCelebration(){closeShareSummary();}
function nextSessionDialog(baseAt,{reschedule=false}={}){const suggestedAt=Number(baseAt||suggestedNextSessionAt());window.__gpNextSessionSuggestedAt=suggestedAt;openDialog(`<h2>${reschedule?'Reschedule next session':'Next session?'}</h2><div class="dialog-copy">Suggested date: <strong>${esc(dateOnly(suggestedAt))}</strong></div><label class="field">Date</label><input id="next-session-date" type="date" value="${localDateInput(suggestedAt)}"><div class="dialog-actions schedule-actions"><button onclick="gp.scheduleNextSession()">${reschedule?'Save date':'Schedule'}</button>${reschedule?`<button class="secondary" onclick="gp.skipNextSession()">Clear schedule</button><button class="ghost" onclick="gp.closeDialog()">Cancel</button>`:`<button class="secondary" onclick="gp.skipNextSession()">Skip</button>`}</div>`);}
function showNextSessionPrompt(finishedAt){nextSessionDialog(suggestedNextSessionAt(finishedAt));}
function rescheduleNextSession(){const current=state.app_state.nextSessionAt;nextSessionDialog(current==null?suggestedNextSessionAt():Number(current),{reschedule:current!=null});}
async function scheduleNextSession(){const suggestedAt=Number(window.__gpNextSessionSuggestedAt||state.app_state.nextSessionAt||suggestedNextSessionAt()),input=$('#next-session-date')?.value;let chosen=suggestedAt;if(input&&input!==localDateInput(suggestedAt)){const [y,m,d]=input.split('-').map(Number),base=new Date(suggestedAt);chosen=new Date(y,m-1,d,base.getHours(),base.getMinutes(),base.getSeconds(),base.getMilliseconds()).getTime();}state.app_state.nextSessionAt=chosen;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();window.__gpNextSessionSuggestedAt=null;closeDialog();render();toast('Next session scheduled');}
async function skipNextSession(){state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();window.__gpNextSessionSuggestedAt=null;closeDialog();render();}
function renderFrequencyTimeline(){return `<section class="timeline-card"><div class="row between timeline-head"><div><div class="title">Workout frequency</div><div class="small">Drag · pinch to zoom</div></div><div class="small" id="timeline-span">30 days</div></div><canvas id="workout-timeline" height="76" aria-label="Workout frequency timeline"></canvas><div class="timeline-labels"><span id="timeline-start"></span><span id="timeline-end"></span></div></section>`;}
function defaultTimelineWindow(sessions,atMs=now()){const DAY=86400000,DEFAULT_DAYS=30;const sorted=[...sessions].sort((a,b)=>a.startedAt-b.startedAt);const earliest=Number(sorted[0]?.startedAt??atMs),latest=Number(sorted.at(-1)?.startedAt??atMs);const historyDays=Math.max((atMs-earliest)/DAY,1/1440);const shortHistory=historyDays<DEFAULT_DAYS;return{earliest,latest,historyDays,shortHistory,days:shortHistory?historyDays:DEFAULT_DAYS,endMs:shortHistory?atMs:Math.max(atMs,latest+DAY/12)}}
function bindWorkoutTimeline(){const canvas=$('#workout-timeline');if(!canvas)return;const sessions=state.workout_sessions.filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').sort((a,b)=>a.startedAt-b.startedAt);if(!sessions.length)return;const DAY=86400000,initial=defaultTimelineWindow(sessions),latest=initial.latest,earliest=initial.earliest,initialDays=initial.days,minDays=Math.min(7,initialDays);if(ui.timelineEndMs==null){ui.timelineDays=initialDays;ui.timelineEndMs=initial.endMs;}const pointers=new Map();let lastSingleX=null,lastDistance=null,downPoint=null,dragged=false,hitDots=[];
  const clampWindow=()=>{ui.timelineDays=Math.max(minDays,Math.min(3650,ui.timelineDays));const span=ui.timelineDays*DAY,maxEnd=Math.max(now(),latest+DAY/12),minEnd=earliest+span;ui.timelineEndMs=minEnd>maxEnd?maxEnd:Math.max(minEnd,Math.min(maxEnd,ui.timelineEndMs));};
  const draw=()=>{clampWindow();const cssW=Math.max(1,canvas.clientWidth),cssH=76,dpr=window.devicePixelRatio||1;canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);const start=ui.timelineEndMs-ui.timelineDays*DAY,y=38;ctx.strokeStyle='rgba(180,180,190,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(2,y);ctx.lineTo(cssW-2,y);ctx.stroke();hitDots=[];for(const ss of sessions){if(ss.startedAt<start||ss.startedAt>ui.timelineEndMs)continue;const rawX=((ss.startedAt-start)/(ui.timelineEndMs-start))*cssW,x=Math.max(5,Math.min(cssW-5,rawX)),sm=sessionMetrics(state,ss),sd=workoutLogEffort(ss,sm);ctx.fillStyle=sd.color;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();hitDots.push({x,y,sessionId:ss.id});}$('#timeline-start').textContent=shortTimelineDate(start);$('#timeline-end').textContent=shortTimelineDate(ui.timelineEndMs);$('#timeline-span').textContent=t(timelineSpanLabel(ui.timelineDays),languageCode(state));canvas.classList.toggle('dots-clickable',ui.timelineDays<=7.05);};
  const pan=(dx)=>{ui.timelineEndMs-=(dx/Math.max(1,canvas.clientWidth))*ui.timelineDays*DAY;draw();};
  const zoom=(factor,focusX)=>{const oldDays=ui.timelineDays,oldSpan=oldDays*DAY,oldStart=ui.timelineEndMs-oldSpan,frac=Math.max(0,Math.min(1,focusX/Math.max(1,canvas.clientWidth))),focus=oldStart+oldSpan*frac,newDays=Math.max(minDays,Math.min(3650,oldDays/factor)),newSpan=newDays*DAY;ui.timelineDays=newDays;ui.timelineEndMs=focus+newSpan*(1-frac);draw();};
  const activateNearest=(clientX,clientY)=>{if(ui.timelineDays>7.05)return;const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;let best=null;for(const d of hitDots){const dist=Math.hypot(d.x-x,d.y-y);if(dist<=14&&(!best||dist<best.dist))best={...d,dist};}if(!best)return;const card=document.getElementById(`log-session-${best.sessionId}`);if(!card)return;card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.remove('timeline-target');void card.offsetWidth;card.classList.add('timeline-target');setTimeout(()=>card.classList.remove('timeline-target'),1900);};
  canvas.style.touchAction='none';canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastSingleX=e.clientX;if(pointers.size===1){downPoint={x:e.clientX,y:e.clientY};dragged=false;}if(pointers.size===2){dragged=true;const a=[...pointers.values()];lastDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(downPoint&&Math.hypot(e.clientX-downPoint.x,e.clientY-downPoint.y)>5)dragged=true;if(pointers.size===1){pan(e.clientX-(lastSingleX??old.x));lastSingleX=e.clientX;}else if(pointers.size===2){const a=[...pointers.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx=((a[0].x+a[1].x)/2)-canvas.getBoundingClientRect().left;if(lastDistance&&dist>0)zoom(dist/lastDistance,cx);lastDistance=dist;}});const end=e=>{const wasSingle=pointers.size===1;if(wasSingle&&!dragged&&e.type==='pointerup')activateNearest(e.clientX,e.clientY);pointers.delete(e.pointerId);if(!pointers.size){lastSingleX=null;lastDistance=null;downPoint=null;dragged=false;}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('wheel',e=>{e.preventDefault();const x=e.clientX-canvas.getBoundingClientRect().left;if(e.ctrlKey||Math.abs(e.deltaY)>=Math.abs(e.deltaX))zoom(Math.exp(-e.deltaY*.002),x);else pan(-e.deltaX);},{passive:false});new ResizeObserver(draw).observe(canvas);draw();}
function shortTimelineDate(ms){return new Intl.DateTimeFormat(localeFor(languageCode(state)),{day:'2-digit',month:'short'}).format(new Date(ms));}
function timelineSpanLabel(days){if(days<1)return'Today';if(days<14)return`${Math.round(days)} days`;if(days<60)return`${Math.round(days/7)} weeks`;if(days<730)return`${Math.round(days/30)} months`;return`${(days/365).toFixed(days<1460?1:0)} years`;}

function renderHome(){
  const workouts=state.workout_templates.filter(w=>w.isActive!==false).sort((a,b)=>a.position-b.position);
  const active=activeSession();
  if(active&&ui.selectedWorkoutId==null)ui.selectedWorkoutId=active.workoutId;
  else if(!active&&ui.selectedWorkoutId==null)ui.selectedWorkoutId=state.app_state.nextWorkoutId;
  let content=`<h1 class="home-title">Gym Progress</h1>`;
  if(!workouts.length){content+=`<div class="card empty"><h3>No programme yet</h3><button onclick="gp.nav('programme')">Create programme</button></div>`;}
  else{
    content+=`<div class="section-title">Workout rotation</div>`;
    workouts.forEach((w,i)=>{
      const isActive=active?.workoutId===w.id,due=!active&&w.id===state.app_state.nextWorkoutId,sel=w.id===ui.selectedWorkoutId,expanded=w.id===ui.expandedWorkoutId,ex=getTemplateExercises(w.id);
      const cls=[isActive?'active-workout':'',due?'selected-due':'',sel&&!active&&!due?'selected-override':'',expanded?'expanded':''].filter(Boolean).join(' ');
      const status=isActive?'<span class="status-accent"> · in progress</span>':due?`<span class="status-next-text"> · next</span>${state.app_state.nextSessionAt!=null?`<span class="next-session-date"> · ${nextSessionDateLabel(Number(state.app_state.nextSessionAt))}</span>`:''}`:'';
      const shortList=expanded?`<div class="home-exercise-list ${isActive?'active-list':''}">${ex.length?ex.map(x=>`<div class="home-exercise-line"><span>${esc(templateDisplayName(x))}</span><span>${x.trackingMode===TrackingMode.CARDIO?formatDuration(Number(x.targetSeconds||1800)*1000):`${x.sets} × ${x.trackingMode===TrackingMode.TIME_ONLY?formatDuration(Number(x.targetSeconds||60)*1000):`${x.reps} × <strong class="home-weight">${x.equipment===Equipment.BODYWEIGHT?t('Bodyweight',languageCode(state)):formatKg(x.initialWeightKg)}</strong>`}`}</span></div>`).join(''):`<div class="small">No exercises</div>`}</div>`:'';
      const play=isActive?`<button class="icon-btn play-btn" aria-label="Return to workout" onclick="event.stopPropagation();gp.resume(${active.id})"><svg class="home-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.4 17.1 12 9 17.6Z"/></svg></button>`:`<button class="icon-btn play-btn" aria-label="Start workout" onclick="event.stopPropagation();gp.requestStart(${w.id})"><svg class="home-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.4 17.1 12 9 17.6Z"/></svg></button>`;
      const calendar=due?`<button class="icon-btn calendar-btn" aria-label="${state.app_state.nextSessionAt!=null?'Reschedule':'Schedule'} next session" title="${state.app_state.nextSessionAt!=null?'Reschedule':'Schedule'}" onclick="event.stopPropagation();gp.rescheduleNextSession()">▦</button>`:'';
      content+=`<div class="card workout-row ${cls}"><div class="card-row workout-row-inner clickable" onclick="gp.toggleWorkoutDetails(${w.id})"><div class="pill">${i+1}</div><div class="grow"><div class="title">${esc(w.name)}</div><div class="subtitle">${ex.length} exercise${ex.length===1?'':'s'}${status}</div></div><div class="workout-action-slot home-action-buttons">${calendar}${play}</div></div>${shortList}</div>`;
    });
  }
  content+=renderTrackerCard();
  if(!window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/i.test(navigator.userAgent)){
    content+=`<div class="card install-note"><div class="title">Install on iPhone</div><div class="subtitle">In Safari: Share → Add to Home Screen → Add.</div></div>`;
  }
  return shell(content);
}
function toggleWorkoutDetails(id){id=Number(id);ui.expandedWorkoutId=ui.expandedWorkoutId===id?null:id;if(!activeSession())ui.selectedWorkoutId=id;render();}
function selectWorkout(id){ui.selectedWorkoutId=Number(id);render();}
function returnFromBreakPlan(){const completed=state.workout_sessions.filter(x=>x.status==='COMPLETE'||x.status==='ABORTED').sort((a,b)=>Number(b.endedAt||b.startedAt)-Number(a.endedAt||a.startedAt));if(!completed.length)return null;const last=Number(completed[0].endedAt||completed[0].startedAt||0),days=Math.floor(Math.max(0,now()-last)/86400000);const factor=days<21?null:days<42?.95:days<70?.90:.85;return factor?{days,factor}:null;}
function offerReturnLoadOrStart(id){const plan=returnFromBreakPlan();if(!plan){void startWorkout(id).catch(reportWorkoutStartError);return;}const pct=Math.round(plan.factor*100);openDialog(`<h2>${esc(S('Returning after a break?','Atgriešanās pēc pārtraukuma?'))}</h2><div class="dialog-copy">${esc(S(`It has been ${plan.days} days since your last recorded workout. Start this session at about ${pct}% of your programmed working weights? Your programme itself will not change.`,`Kopš pēdējā reģistrētā treniņa pagājušas ${plan.days} dienas. Vai sākt šo treniņu ar aptuveni ${pct}% no programmas darba svariem? Pati programma netiks mainīta.`))}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog();gp.startWorkout(${Number(id)},1).catch(reportWorkoutStartError)">${esc(S('Keep normal weights','Saglabāt parastos svarus'))}</button><button onclick="gp.closeDialog();gp.startWorkout(${Number(id)},${plan.factor}).catch(reportWorkoutStartError)">${esc(S(`Use ${pct}% this session`,`Šajā treniņā izmantot ${pct}%`))}</button></div>`);}
function requestStart(id){
  id=Number(id); if(id!==state.app_state.nextWorkoutId){const w=getWorkout(id);confirmDialog(`Start ${w?.name||'workout'}?`,`This is not the workout currently due. When you complete it, the rotation will continue from this workout.`,`Start anyway`,()=>{closeDialog();offerReturnLoadOrStart(id);});}else offerReturnLoadOrStart(id);
}
// A rejected async start must never vanish silently behind an inline onclick handler.
function reportWorkoutStartError(e){console.error('Workout start failed',e);alertDialog('Could not start workout',String(e?.message||e||'Unknown error')+'\nYour local workout data has not been deliberately cleared.');}

async function startWorkout(workoutId,loadFactor=1){
  if(activeSession()){toast('A workout is already active');return;}
  state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;
  const w=getWorkout(workoutId),templates=getTemplateExercises(workoutId);if(!w||!templates.length){alertDialog('Can’t start workout','Add at least one exercise first.');return;}
  // Never block the workout start on an AudioContext.resume() promise. In some browsers
  // the context remains suspended until a subsequent gesture; the local workout must start anyway.
  void enableAudio();
  const t=now(),sid=uid(state.workout_sessions);
  state.workout_sessions.push({id:sid,workoutId:w.id,workoutName:w.name,startedAt:t,endedAt:null,status:'ACTIVE',note:'',advancesRotation:true,warmupStartedAt:t,warmupEndedAt:null,warmupSkipped:false,stretchStartedAt:null,stretchEndedAt:null,stretchSkipped:false});
  for(const te of templates){
    const eid=uid(state.session_exercises);const u=getUserExercise(state,te.userExerciseId),equipment=te.equipment||u?.equipment||Equipment.OTHER;const sessionWeight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(equipment)||Number(loadFactor)>=.999?Number(te.initialWeightKg||0):snapSelectable(Number(te.initialWeightKg||0)*Number(loadFactor||1),equipment);const plan=recommendRamp(sessionWeight,te.reps,te.exerciseType,te.exerciseKey,templateDisplayName(te),equipment,state.app_state.maxRampUpSets);
    state.session_exercises.push({id:eid,sessionId:sid,templateExerciseId:te.id,name:templateDisplayName(te),position:te.position,targetSets:te.sets,targetReps:te.reps,plannedRestSeconds:te.restSeconds,plannedWeightKg:sessionWeight,startedAt:null,endedAt:null,status:'PENDING',note:'',progressionOffered:false,progressionAccepted:false,nextWeightKg:null,nextReps:null,exerciseKey:te.exerciseKey??u?.legacyExerciseKey??null,exerciseType:te.exerciseType||u?.exerciseType||ExerciseType.MODERATE_COMPOUND,rampMode:te.rampMode||RampMode.AUTO,removeWeights:!!te.removeWeights,equipment:te.equipment||u?.equipment||Equipment.OTHER,dumbbellLoad:te.dumbbellLoad||u?.dumbbellLoad||DumbbellLoad.SINGLE,userExerciseId:te.userExerciseId,programmeExerciseId:te.programmeExerciseId,canonicalExerciseId:u?.canonicalExerciseId||null,trackingMode:te.trackingMode||u?.trackingMode||TrackingMode.WEIGHT_REPS,targetSeconds:Number(te.targetSeconds||0),compareWithFriends:te.compareWithFriends===true,supersetGroupId:te.supersetGroupId||null,rampStartedAt:null,rampEndedAt:null,rampSkipped:false,rampPlanJson:JSON.stringify(plan),unloadStartedAt:null,unloadEndedAt:null,unloadSkipped:false});
    for(let i=0;i<te.sets;i++)state.performed_sets.push({id:uid(state.performed_sets),sessionExerciseId:eid,setNumber:i+1,targetReps:te.reps,actualReps:null,plannedWeightKg:sessionWeight,actualWeightKg:null,rir:null,failure:false,targetDurationSeconds:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(te.trackingMode)?Math.max(1,Number(te.targetSeconds||60)):0,actualDurationSeconds:null,plannedRestSeconds:te.restSeconds,actualRestSeconds:null,status:'PENDING',completedAt:null});
  }
  state.runtime={sessionId:sid,phase:'WARMUP',phaseStartedAt:t,currentExerciseIndex:0,currentSetIndex:0,workingWeight:state.session_exercises.find(x=>x.sessionId===sid)?.plannedWeightKg||0,entry:null,rest:null,nextAction:null,reminderStartedAt:null};
  // Local UI must not wait for a large IndexedDB commit before entering the workout.
  requestWakeLock();nav('active');
  await persist();
}
function runtimeNeedsRecovery(sessionId){const id=Number(sessionId),rt=state.runtime,s=getSession(id);if(!rt||Number(rt.sessionId)!==id||!s)return true;const ctx=currentActiveContext();if(rt.phase==='WARMUP')return s.warmupEndedAt!=null||!!s.warmupSkipped;if(['RAMP_PROMPT','RAMP_ACTIVE','SET','TIMED_SET','ENTRY'].includes(rt.phase))return !ctx.e||!ctx.set||ctx.set.status!=='PENDING';if(rt.phase==='SUPERSET_ENTRY')return !Array.isArray(rt.supersetEntry)||!rt.supersetEntry.length||rt.supersetEntry.some(x=>getSet(x.setId)?.status!=='PENDING');if(rt.phase==='REST')return !rt.rest;if(rt.phase==='UNLOAD')return !ctx.e;if(rt.phase==='STRETCH')return s.stretchEndedAt!=null;return !['FINAL'].includes(rt.phase);}
function resume(id){id=Number(id);if(runtimeNeedsRecovery(id))rebuildRuntime(id);requestWakeLock();nav('active');}
function rebuildRuntime(sessionId){
  const s=getSession(sessionId),ex=sessionExercises(state,sessionId);if(!s)return;
  if(s.warmupEndedAt==null&&!s.warmupSkipped){state.runtime={sessionId,phase:'WARMUP',phaseStartedAt:s.warmupStartedAt||now(),currentExerciseIndex:0,currentSetIndex:0,workingWeight:ex[0]?.plannedWeightKg||0,entry:null,rest:null,nextAction:null,reminderStartedAt:null};return;}
  const firstPending=ex.find(e=>exerciseSets(state,e.id).some(s=>s.status==='PENDING'));
  if(!firstPending){state.runtime={sessionId,phase:s.stretchEndedAt==null?'STRETCH':'FINAL',phaseStartedAt:s.stretchStartedAt||now(),currentExerciseIndex:Math.max(0,ex.length-1),currentSetIndex:0,workingWeight:0,entry:null,rest:null,nextAction:null};return;}
  const ei=ex.findIndex(e=>e.id===firstPending.id),sets=exerciseSets(state,firstPending.id),si=sets.findIndex(s=>s.status==='PENDING'),phase=hasPendingRamp(firstPending)?'RAMP_PROMPT':'SET';
  state.runtime={sessionId,phase,phaseStartedAt:now(),currentExerciseIndex:ei,currentSetIndex:Math.max(0,si),workingWeight:sets[Math.max(0,si)]?.plannedWeightKg||firstPending.plannedWeightKg,entry:null,rest:null,nextAction:null,reminderStartedAt:phase==='SET'?now():null};
}

async function changeMaxRampSets(delta){state.app_state.maxRampUpSets=Math.max(0,Math.min(6,Number(state.app_state.maxRampUpSets||3)+Number(delta)));await persist();render();}
function openTrackerSettings(){const items=(state.tracker_items||[]).slice().sort((a,b)=>(a.position||0)-(b.position||0)),notifyOn=trackerNotificationsEnabled(),permission=typeof Notification==='undefined'?'unavailable':Notification.permission;openDialog(`<h2>Tracker</h2><label class="setting-toggle-row tracker-notification-row"><span class="setting-toggle-copy"><strong>Tracker notifications</strong><small>${permission==='denied'?'Blocked in browser settings':notifyOn?'On · pace-aware daily reminders':'Off'}</small></span><span class="setting-toggle-control"><input class="setting-toggle-input" type="checkbox" ${notifyOn&&permission!=='denied'?'checked':''} ${permission==='unavailable'?'disabled':''} onchange="gp.setTrackerNotifications(this.checked)"><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label><div class="note support-copy">Reminders are spread through each item’s productive day and are skipped while you are ahead of plan.</div><div id="tracker-settings-list">${items.map(i=>`<div class="tracker-setting-line"><div class="min-zero"><span class="tracker-setting-name">${esc(i.name)}</span>${i.enabled===false?`<span class="small"> · disabled</span>`:''}</div><span>${i.targetAmount}${i.unit?` ${esc(i.unit)}`:''}</span><button class="ghost tiny-btn" onclick="gp.editTrackerItem('${i.id}')">Edit</button><button class="ghost tiny-btn danger-text" onclick="gp.deleteTrackerItem('${i.id}')">Delete</button></div>`).join('')||'<div class="small">No items yet.</div>'}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">Close</button><button onclick="gp.editTrackerItem('')">+ Item</button></div>`);}
async function setTrackerNotifications(enabled){if(!enabled){localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'0');sentTrackerReminderKeys.clear();toast('Tracker notifications off');openTrackerSettings();return;}if(typeof Notification==='undefined'){toast('Browser notifications are not available here');return;}let permission=Notification.permission;if(permission!=='granted')permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'1');sentTrackerReminderKeys.clear();toast('Tracker notifications on');}else{localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'0');toast(permission==='denied'?'Notifications are blocked in browser settings':'Tracker notifications not enabled');}openTrackerSettings();}
function deleteTrackerItem(id){const item=(state.tracker_items||[]).find(x=>x.id===id);if(!item)return;confirmDialog('Delete tracker item?',`${item.name} will be removed from Tracker. Existing backup data is not otherwise changed.`,'Delete',async()=>{state.tracker_items=state.tracker_items.filter(x=>x.id!==id);state.tracker_states=(state.tracker_states||[]).filter(x=>String(x.itemId)!==String(id));await persist();closeDialog();render();openTrackerSettings();},true);}
function editTrackerItem(id){const old=(state.tracker_items||[]).find(x=>x.id===id)||{name:'',targetAmount:1,unit:'',increment:1,productiveStart:'08:00',productiveEnd:'22:00',enabled:true,position:state.tracker_items.length};formDialog(id?'Edit tracker item':'New tracker item',`<label class="field">Name</label><input id="tr-name" maxlength="60" value="${esc(old.name)}"><div class="form-grid tracker-editor-grid"><div><label class="field">Daily target</label><input id="tr-target" type="number" min="0.01" step="0.01" value="${old.targetAmount}"></div><div><label class="field">Unit</label><select id="tr-unit">${trackerUnitOptions(old.unit||'')}</select></div><div><label class="field">+/− increment</label><input id="tr-inc" type="number" min="0.01" step="0.01" value="${old.increment||1}"></div><div class="span2 tracker-time-row"><div><label class="field">Productive day from</label><input id="tr-start" type="time" value="${old.productiveStart||'08:00'}"></div><div><label class="field">To</label><input id="tr-end" type="time" value="${old.productiveEnd||'22:00'}"></div></div></div><label class="setting-toggle-row"><span class="setting-toggle-copy"><strong>Enabled</strong></span><span class="setting-toggle-control"><input id="tr-enabled" class="setting-toggle-input" type="checkbox" ${old.enabled!==false?'checked':''}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>`, 'Save',async()=>{const row=id?old:{id:uuid(),position:state.tracker_items.length};const unit=$('#tr-unit').value;Object.assign(row,{name:$('#tr-name').value.trim().slice(0,60)||'Tracker item',targetAmount:Math.max(.01,Number($('#tr-target').value)||1),unit,increment:unit?Math.max(.01,Number($('#tr-inc').value)||1):1,productiveStart:$('#tr-start').value||'08:00',productiveEnd:$('#tr-end').value||'22:00',enabled:$('#tr-enabled').checked});if(!id){state.tracker_items.push(row);trackerState(row);}await persist();closeDialog();render();openTrackerSettings();},'gp.openTrackerSettings()');}
function trackerUnitOptions(selected=''){const values=['capsule','g','glass','ml','','pill','scoop','serving','tablet'];return values.slice().sort((a,b)=>(a||'no unit').localeCompare(b||'no unit')).map(v=>`<option value="${v}" ${String(selected||'')===v?'selected':''}>${v||'no unit'}</option>`).join('');}
function refreshTrackerRow(item){
  const el=[...document.querySelectorAll('.tracker-row[data-tracker-id]')].find(x=>x.dataset.trackerId===String(item.id));
  if(!el)return;
  const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount)||1),unit=trackerUnit(item),at=new Date();
  const done=amount>=target,behind=!done&&trackerBehind(item,at);
  el.classList.toggle('done',done);el.classList.toggle('behind',behind);
  const fill=el.querySelector('.tracker-progress-fill');if(fill)fill.style.width=`${Math.min(100,Math.max(0,amount/target*100))}%`;
  const label=el.querySelector('.tracker-amount-button');if(label)label.textContent=`${Number(amount.toFixed(4))}/${Number(item.targetAmount||0)}${unit?' '+unit:''}`;
}
function adjustTracker(id,direction){
  const item=state.tracker_items.find(x=>x.id===id);if(!item)return;
  const row=trackerState(item),step=trackerUnit(item)?Math.max(.01,Number(item.increment||1)):1;
  row.amount=Math.max(0,Math.round((Number(row.amount||0)+Number(direction)*step)*10000)/10000);
  // Paint synchronously, BEFORE IndexedDB serialisation of large historical state.
  refreshTrackerRow(item);
  // Yield a frame before serialising the IndexedDB snapshot so the first tap paints.
  setTimeout(()=>{void persist().catch(error=>{console.error('Tracker save failed; value remains in memory',error);toast(S('Could not save Tracker change','Neizdevās saglabāt Tracker izmaiņu'));});},0);
}
function setTrackerAmount(id){const item=state.tracker_items.find(x=>x.id===id);if(!item)return;const current=trackerAmount(item),unit=trackerUnit(item);formDialog(`Set ${esc(item.name)}`,`<label class="field">Current amount${unit?` (${esc(unit)})`:''}</label><input id="tr-current-amount" type="number" min="0" step="${unit?Math.max(.01,Number(item.increment||1)):1}" value="${current}">`,'Save',async()=>{const row=trackerState(item),value=Number($('#tr-current-amount').value);row.amount=Math.max(0,Number.isFinite(value)?value:current);await persist();closeDialog();render();});}
function trackerExpected(item,at=new Date()){return trackerPace(item,at).dueAmount;}
async function checkTrackerReminders(){if(!trackerNotificationsEnabled()||typeof Notification==='undefined'||Notification.permission!=='granted')return;const d=new Date();for(const item of state.tracker_items.filter(x=>x.enabled!==false)){const pace=trackerPace(item,d),actual=trackerAmount(item);if(pace.cur<pace.start||pace.slot<=0||actual+1e-6>=pace.target||actual+1e-6>=pace.dueAmount)continue;const key=`tracker/${trackerTodayKey()}/${item.id}/${pace.slot}`;if(sentTrackerReminderKeys.has(key))continue;if(sentTrackerReminderKeys.size>200)sentTrackerReminderKeys.clear();sentTrackerReminderKeys.add(key);new Notification(`Gym Progress · ${item.name}`,{body:`${actual}/${item.targetAmount}${item.unit?` ${item.unit}`:''} · ${pace.dueAmount}/${item.targetAmount} due by now`});beepPattern('reminder');}}

function renderSettings(){
  const a=state.app_state,syncLabel=syncStatusLabel(state),syncUser=socialUser()?.email||'',syncEnabled=enabledSyncDomains(state);
  const content=`<h1>Settings</h1>
  <div class="card stack"><div class="title">Language</div><div class="segmented"><button class="${a.languageCode==='en'?'active':''}" onclick="gp.setLanguage('en')">English</button><button class="${a.languageCode==='lv'?'active':''}" onclick="gp.setLanguage('lv')">Latviešu</button></div></div>
  <div class="card stack account-settings-card"><div><div class="title">${esc(S('Account','Konts'))}</div><div class="subtitle">${esc(socialSignedIn()?(syncUser||accountDisplayLabel()):S('Not signed in','Nav pieslēgts'))}</div></div><button class="secondary full" onclick="gp.openAccount()">${esc(socialSignedIn()?S('Account settings / sign out','Konta iestatījumi / iziet'):S('Log in','Pieslēgties'))}</button>${socialSignedIn()?`<div class="divider"></div><div class="title">${esc(S('Sync','Sinhronizācija'))}</div><div class="small">${esc(syncLabel)} · ${esc(S('Programme','Programma'))}: ${syncEnabled.includes('programme')?S('On','Ieslēgta'):S('Off','Izslēgta')} · ${esc(S('Workout history','Treniņu vēsture'))}: ${syncEnabled.includes('workout_log')?S('On','Ieslēgta'):S('Off','Izslēgta')} · Tracker: ${syncEnabled.includes('tracker')?S('On','Ieslēgta'):S('Off','Izslēgta')}</div><button class="secondary full" onclick="gp.openTrainingSyncReview()">${esc(S('Review & sync now','Pārskatīt un sinhronizēt'))}</button>`:''}</div>
  <div class="section-title">Training</div>
  <div class="card clickable" onclick="gp.nav('programme')"><div class="card-row"><div class="grow"><div class="title">Programme</div><div class="subtitle">Workout days and exercises</div></div>${navChevron()}</div></div>
  <details class="card starter-settings"><summary><div><strong>Starter programme</strong><div class="subtitle">Adds three editable workout days. Your existing programme is kept.</div></div>${expandChevron('details-chevron')}</summary><div class="details-body"><button class="secondary full" onclick="gp.openStarterWizard()">Set up starter programme</button></div></details>
  <div class="card clickable" onclick="gp.nav('manual')"><div class="card-row"><div class="grow"><div class="title">Manual</div><div class="subtitle">Shown in your selected app language</div></div>${navChevron()}</div></div>
  <div class="card ramp-setting-card"><div class="row between"><div class="grow"><div class="title">Ramp-up sets</div><div class="subtitle">Maximum automatic ramp-up sets</div></div><div class="setting-stepper ramp-stepper"><button class="icon-btn" onclick="gp.changeMaxRampSets(-1)">−</button><strong>${a.maxRampUpSets}</strong><button class="icon-btn" onclick="gp.changeMaxRampSets(1)">+</button></div></div></div>
  <div class="section-title">Training effort</div>
  <div class="card stack"><div><div class="title">Training effort</div><div class="subtitle">Default target is 1–2 RIR. Extend the scale only if your training deliberately stays farther from failure.</div></div>
    ${settingStepper('Target RIR minimum',a.targetRirMin,"gp.changeTargetRirMin(-1)","gp.changeTargetRirMin(1)")}
    ${settingStepper('Target RIR maximum',a.targetRirMax,"gp.changeTargetRirMax(-1)","gp.changeTargetRirMax(1)")}
    <div class="small">RIR input scale</div><div class="segmented"><button class="${a.rirInputMax<=3?'active':''}" onclick="gp.setRirInputMax(3)">Compact · 3+</button><button class="${a.rirInputMax>3?'active':''}" onclick="gp.setRirInputMax(5)">Extended · 5+</button></div>
    <label class="setting-toggle-row"><span class="setting-toggle-copy"><strong>0 RIR acceptable on the last set</strong><small>For exercises with more than one set, a final set at target reps and 0 RIR will not trigger a reduction. Failure remains separate.</small></span><span class="setting-toggle-control"><input class="setting-toggle-input" type="checkbox" ${a.lastSetZeroRirAcceptable?'checked':''} onchange="gp.toggleLastSetZeroRirAcceptable(this.checked)"><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>
  </div>
  <div class="card stack"><div class="title">Increase-weight threshold</div><div class="subtitle">Every required set must reach its rep target with at least this RIR and no failures.</div><div class="setting-stepper centered"><button class="icon-btn" onclick="gp.changeRirThreshold(-1)">−</button><strong>RIR ≥ ${a.progressionRirThreshold}</strong><button class="icon-btn" onclick="gp.changeRirThreshold(1)">+</button></div></div>
  <div class="card"><button class="secondary full" onclick="gp.editDifficulty()">Difficulty levels</button></div>
  <div class="section-title">Motivation & reminders</div>
  <div class="card stack"><div class="card-row"><div class="grow"><div class="title">Motivation & reminders</div><div class="subtitle">Optional inactivity and next-session reminders</div></div><input style="width:auto" type="checkbox" ${a.motivationEnabled?'checked':''} onchange="gp.toggleMotivation(this.checked)"></div>${a.motivationEnabled?`${settingStepper('No workout for (days)',Math.round(a.inactivityReminderHours/24),"gp.changeInactivityDays(-1)","gp.changeInactivityDays(1)")}<div class="reminder-time-grid"><label><span class="field">Evening-before reminder</span><input type="time" value="${esc(a.eveningReminderTime)}" onchange="gp.setReminderTime('evening',this.value)"></label><label><span class="field">Workout-day reminder</span><input type="time" value="${esc(a.morningReminderTime)}" onchange="gp.setReminderTime('morning',this.value)"></label></div>${'Notification'in window&&Notification.permission!=='granted'?`<button class="secondary full" onclick="gp.requestNotificationPermission()">Allow browser notifications</button>`:''}`:''}</div>
  <div class="section-title">Display</div>
  <div class="card"><div class="card-row"><div class="grow"><div class="title">Keep screen awake</div><div class="subtitle">Keep the display on while a workout is active</div></div><input style="width:auto" type="checkbox" ${a.keepScreenAwake?'checked':''} onchange="gp.toggleAwake(this.checked)"></div></div>
  <div class="section-title">Data</div>
  <div class="card stack"><button class="secondary full" onclick="gp.downloadBackup()">Full backup</button><button class="secondary full" onclick="gp.pickRestore()">Restore backup</button><button class="secondary full" onclick="gp.downloadCsv()">Export CSV</button><button class="secondary full" onclick="gp.downloadDetailedJson()">Export detailed JSON</button><div class="divider"></div><button class="danger full" onclick="gp.eraseData()">Erase all data</button><button class="secondary full log-erase-btn" onclick="gp.eraseExerciseLogs()">Erase exercise log data</button><input id="restore-file" class="hidden" type="file" accept="application/json,.json" onchange="gp.restoreFile(this.files[0])"></div>
  <div class="app-version">Gym Progress PWA v${APP_VERSION}</div>`;
  return shell(content);
}

async function setLanguage(code){state.app_state.languageCode=code==='lv'?'lv':'en';await persist();render();}
async function dismissStarterPrompt(){state.app_state.starterPromptDismissed=true;await persist();}
function showEmptyStarterPrompt(){
  openDialog(`<h2>I don't have a programme yet</h2><div class="dialog-copy">You do not have any workout days yet. I can build a simple three-day starter programme, or you can create your own.</div><div class="dialog-actions starter-entry-actions"><button onclick="gp.openStarterWizard()">Set it up for me</button><button class="secondary" onclick="gp.starterManualSetup()">Set up manually</button><button class="ghost" onclick="gp.dismissStarterForNow()">Not now</button></div>`);
}
async function starterManualSetup(){await dismissStarterPrompt();closeDialog();nav('programme');}
async function dismissStarterForNow(){await dismissStarterPrompt();closeDialog();render();}
function openStarterWizard(){window.__gpStarter={goal:StarterGoal.GENERAL_FITNESS,experience:StarterExperience.BEGINNER,squatKg:'',benchKg:'',rowKg:'',hingeKg:''};renderStarterWizard(1);}
function starterSelectValue(id,key,nextStep){const el=$(id);if(el)window.__gpStarter[key]=el.value;renderStarterWizard(nextStep);}
function renderStarterWizard(step=1){
  const w=window.__gpStarter||{goal:StarterGoal.GENERAL_FITNESS,experience:StarterExperience.BEGINNER,squatKg:'',benchKg:'',rowKg:'',hingeKg:''};window.__gpStarter=w;
  let body='';
  if(step===1){body=`<div class="dialog-copy small">This wizard creates a general starting point, not a medical or individually coached prescription. You can edit everything afterwards.</div><label class="field">Goal</label><select id="starter-goal"><option value="STRENGTH" ${w.goal===StarterGoal.STRENGTH?'selected':''}>Strength</option><option value="HYPERTROPHY" ${w.goal===StarterGoal.HYPERTROPHY?'selected':''}>Muscle gain</option><option value="GENERAL_FITNESS" ${w.goal===StarterGoal.GENERAL_FITNESS?'selected':''}>General fitness / tone</option><option value="CONDITIONING" ${w.goal===StarterGoal.CONDITIONING?'selected':''}>Conditioning / cardio support</option></select><div class="small">Conditioning / cardio support changes the resistance-training prescription; it does not replace dedicated aerobic training.</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">Cancel</button><button onclick="gp.starterSelectValue('#starter-goal','goal',2)">Next</button></div>`;}
  else if(step===2){body=`<label class="field">Experience</label><select id="starter-experience"><option value="BEGINNER" ${w.experience===StarterExperience.BEGINNER?'selected':''}>Beginner · under 6 months</option><option value="SOME" ${w.experience===StarterExperience.SOME?'selected':''}>Some experience · 6–24 months</option><option value="EXPERIENCED" ${w.experience===StarterExperience.EXPERIENCED?'selected':''}>Experienced · 2+ years</option></select><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(1)">Back</button><button onclick="gp.starterSelectValue('#starter-experience','experience',3)">Next</button></div>`;}
  else {body=`<div class="dialog-copy">Enter a comfortable weight you could lift for about 8 good reps. This is not a max test. Leave a field blank if you are unsure; you can edit every starting weight later.</div><div class="form-grid"><label><span class="field">Squat</span><input id="starter-squat" type="number" min="0" step="0.25" value="${esc(w.squatKg)}"></label><label><span class="field">Bench press</span><input id="starter-bench" type="number" min="0" step="0.25" value="${esc(w.benchKg)}"></label><label><span class="field">Row</span><input id="starter-row" type="number" min="0" step="0.25" value="${esc(w.rowKg)}"></label><label><span class="field">Romanian deadlift</span><input id="starter-hinge" type="number" min="0" step="0.25" value="${esc(w.hingeKg)}"></label></div><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(2)">Back</button><button onclick="gp.finishStarterProgramme()">Build programme</button></div>`;}
  openDialog(`<h2>Starter programme setup</h2><div class="small">${step} / 3</div>${body}`);
}
async function finishStarterProgramme(allowEstimates=false){
  const w=window.__gpStarter||{};w.squatKg=$('#starter-squat')?.value??w.squatKg??'';w.benchKg=$('#starter-bench')?.value??w.benchKg??'';w.rowKg=$('#starter-row')?.value??w.rowKg??'';w.hingeKg=$('#starter-hinge')?.value??w.hingeKg??'';
  const inputs={goal:w.goal,experience:w.experience,squatKg:w.squatKg,benchKg:w.benchKg,rowKg:w.rowKg,hingeKg:w.hingeKg};const missing=missingStarterWeightKeys(inputs);if(missing.length&&!allowEstimates){const labels={squatKg:'Squat',benchKg:'Bench press',rowKg:'Row',hingeKg:'Romanian deadlift'},allMissing=missing.length===4;openDialog(`<h2>Some starting weights are missing</h2><div class="dialog-copy">${allMissing?'No starting weights were entered. I can still create a conservative estimated baseline, but it will be less personal.':'I can estimate the missing movements from the weights you entered. The starter programme will be based on limited data and should be adjusted if anything feels clearly too light or too heavy.'}</div><div class="small">${t('Missing:',languageCode(state))} ${missing.map(k=>t(labels[k],languageCode(state))).join(', ')}</div><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(3)">Go back and complete</button><button onclick="gp.finishStarterProgramme(true)">Build with estimates</button></div>`);return;}
  const plans=buildStarterProgramme(inputs);
  const used=new Set(state.workout_templates.map(x=>String(x.name||'').toLocaleLowerCase()));const created=[];
  for(const day of plans){const base=languageCode(state)==='lv'?`Sākuma treniņš ${day.suffix}`:`Starter ${day.suffix}`;let name=base,n=2;while(used.has(name.toLocaleLowerCase()))name=`${base} ${n++}`;used.add(name.toLocaleLowerCase());const workoutId=uid(state.workout_templates);state.workout_templates.push({id:workoutId,name,position:state.workout_templates.length,isActive:true});created.push(workoutId);
    for(const plan of day.exercises){const def=byKey(plan.exerciseKey);if(!def)continue;state.template_exercises.push({id:uid(state.template_exercises),workoutId,name:def.name,position:getTemplateExercises(workoutId).length,sets:plan.sets,reps:plan.reps,restSeconds:plan.restSeconds,initialWeightKg:snapSelectable(plan.weightKg,def.equipment),exerciseKey:def.key,exerciseType:def.type,rampMode:RampMode.AUTO,removeWeights:!!def.defaultRemoveWeights,equipment:def.equipment,dumbbellLoad:def.dumbbellLoad||DumbbellLoad.SINGLE});}
  }
  if(state.app_state.nextWorkoutId==null)state.app_state.nextWorkoutId=created[0]??null;state.app_state.starterPromptDismissed=true;ui.selectedWorkoutId=state.app_state.nextWorkoutId;window.__gpStarter=null;await persist();closeDialog();nav('home');toast('Your starter programme is ready.');
}
async function changeRirThreshold(d){state.app_state.progressionRirThreshold=Math.max(0,Math.min(state.app_state.rirInputMax,state.app_state.progressionRirThreshold+d));await persist();render();}
async function toggleLastSetZeroRirAcceptable(v){state.app_state.lastSetZeroRirAcceptable=!!v;await persist();render();}
async function toggleAwake(v){state.app_state.keepScreenAwake=!!v;await persist();if(v)requestWakeLock();else releaseWakeLock();}
async function toggleMotivation(v){state.app_state.motivationEnabled=!!v;if(!v){state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;}if(v&&'Notification'in window&&Notification.permission==='default')await Notification.requestPermission();await persist();render();}
async function changeInactivityDays(delta){const current=Math.round(Number(state.app_state.inactivityReminderHours||72)/24),days=Math.max(1,Math.min(30,current+Number(delta)));state.app_state.inactivityReminderHours=days*24;state.app_state.lastInactivityReminderFor=null;await persist();render();}
async function setReminderTime(kind,value){if(!/^\d{2}:\d{2}$/.test(String(value||'')))return;if(kind==='evening')state.app_state.eveningReminderTime=value;else state.app_state.morningReminderTime=value;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();render();}
function editDifficulty(){
  const a=state.app_state,ceil=a.rirInputMax;
  formDialog('Difficulty levels',`<label class="field">Comfortable starts at average RIR</label><input id="f-comf" type="number" step="0.5" min="1" max="${ceil}" value="${a.difficultyComfortableMinRir}"><label class="field">Challenging starts at</label><input id="f-chal" type="number" step="0.5" min="0.5" max="${ceil}" value="${a.difficultyChallengingMinRir}"><label class="field">Hard starts at</label><input id="f-hard" type="number" step="0.5" min="0" max="${ceil}" value="${a.difficultyHardMinRir}">`,'Save',async()=>{const c=Number($('#f-comf').value),ch=Number($('#f-chal').value),h=Number($('#f-hard').value);state.app_state.difficultyComfortableMinRir=Math.max(1,Math.min(ceil,c));state.app_state.difficultyChallengingMinRir=Math.max(.5,Math.min(state.app_state.difficultyComfortableMinRir-.5,ch));state.app_state.difficultyHardMinRir=Math.max(0,Math.min(state.app_state.difficultyChallengingMinRir-.5,h));await persist();closeDialog();render();});
}
function renderProgramme(){
  const ws=state.workout_templates.slice().sort((a,b)=>a.position-b.position);
  let c=`<div class="row between"><h2 style="margin:10px 0">Programme</h2><button class="small-btn" onclick="gp.addWorkout()">+ Day</button></div><div class="reorder-hint"><span class="drag-grip-sample" aria-hidden="true"><i></i></span><span>Drag the grip to reorder.</span></div>`;
  if(!ws.length)c+=`<div class="empty">No workout days yet.</div>`;
  ws.forEach((w,i)=>c+=`<div class="card clickable programme-day reorder-row ${ui.movedWorkoutId===w.id?'recently-moved':''}" onclick="gp.nav('workout',${w.id})"><div class="card-row"><span class="drag-grip" role="button" tabindex="0" data-reorder-kind="workout" data-reorder-id="${w.id}" aria-label="Drag to reorder"><i></i></span><div class="pill">${i+1}</div><div class="grow min-zero"><div class="title single-line">${esc(w.name)}</div><div class="subtitle">${getTemplateExercises(w.id).length} exercise${getTemplateExercises(w.id).length===1?'':'s'}</div></div><button class="icon-btn pencil-button" onclick="event.stopPropagation();gp.renameWorkout(${w.id})" aria-label="Rename workout">${pencilIcon()}</button><button class="icon-btn" onclick="event.stopPropagation();gp.deleteWorkout(${w.id})">×</button></div></div>`);
  return shell(c,{topbar:topbar('Programme','settings'),navBar:false});
}
function addWorkout(){formDialog('New workout day',`<label class="field">Name</label><input id="f-name" maxlength="80" value="Day ${state.workout_templates.length+1}">`,'Add',async()=>{const input=$('#f-name'),name=input.value.trim().slice(0,80)||`Day ${state.workout_templates.length+1}`;if(workoutNameExists(name)){input.setCustomValidity('Workout names must be unique');input.reportValidity();return;}input.setCustomValidity('');state.workout_templates.push({id:uid(state.workout_templates),name,position:state.workout_templates.length,isActive:true});ensureRotation();await persist();closeDialog();render();});}
function renameWorkout(id){const w=getWorkout(id);formDialog('Rename workout',`<label class="field">Name</label><input id="f-name" maxlength="80" value="${esc(w.name)}">`,'Save',async()=>{const input=$('#f-name'),name=input.value.trim().slice(0,80)||w.name;if(workoutNameExists(name,w.id)){input.setCustomValidity('Workout names must be unique');input.reportValidity();return;}input.setCustomValidity('');w.name=name;await persist();closeDialog();render();});}
async function moveWorkout(id,d){const a=state.workout_templates.sort((x,y)=>x.position-y.position),i=a.findIndex(x=>x.id===Number(id)),j=Math.max(0,Math.min(a.length-1,i+d));if(i<0||i===j)return;const [x]=a.splice(i,1);a.splice(j,0,x);a.forEach((w,k)=>w.position=k);ui.movedWorkoutId=x.id;await persist();render();setTimeout(()=>{if(ui.movedWorkoutId===x.id){ui.movedWorkoutId=null;render();}},1600);}
function deleteWorkout(id){const w=getWorkout(id);confirmDialog(`Delete ${w.name}?`,'This deletes the workout template. Historical completed sessions are kept.','Delete',async()=>{state.template_exercises=state.template_exercises.filter(e=>e.workoutId!==w.id);state.workout_templates=state.workout_templates.filter(x=>x.id!==w.id).sort((a,b)=>a.position-b.position);state.workout_templates.forEach((x,i)=>x.position=i);ensureRotation();await persist();closeDialog();render();},true);}

function programmeExerciseSpec(e){return e.trackingMode===TrackingMode.CARDIO?`Cardio · ${formatDuration(Number(e.targetSeconds||1800)*1000)}`:e.trackingMode===TrackingMode.TIME_ONLY?`${e.sets} × ${formatDuration(Number(e.targetSeconds||60)*1000)}`:`${e.sets} × ${e.reps} × <strong>${e.equipment===Equipment.BODYWEIGHT?t('Bodyweight',languageCode(state)):formatKg(e.initialWeightKg)}</strong>`;}
function programmeExerciseBlocks(es){
  const blocks=[];for(let i=0;i<es.length;i++){const e=es[i],n=es[i+1];if(e.supersetGroupId&&n?.supersetGroupId===e.supersetGroupId){blocks.push({type:'superset',id:e.id,groupId:e.supersetGroupId,items:[e,n]});i++;}else blocks.push({type:'single',id:e.id,groupId:null,items:[e]});}return blocks;
}
function canJoinSuperset(a,b){return !!a&&!!b&&a.workoutId===b.workoutId&&!a.supersetGroupId&&!b.supersetGroupId;}
function renderProgrammeExerciseSubrow(e,{showGrip=false}={}){const u=getUserExercise(state,e.userExerciseId),spec=programmeExerciseSpec(e);return `<div class="superset-exercise-subrow" onclick="gp.editExercise(${e.id})">${showGrip?`<span class="drag-grip" role="button" tabindex="0" data-reorder-kind="exercise-block" data-reorder-id="${e.id}" aria-label="Drag to reorder"><i></i></span>`:'<span class="superset-subrow-spacer"></span>'}<div class="grow min-zero"><div class="title single-line">${esc(templateDisplayName(e))}</div><div class="subtitle single-line">${spec}${e.trackingMode===TrackingMode.CARDIO?'':' · '+formatDuration(e.restSeconds*1000)+' rest'}${e.compareWithFriends?' · compare':''}</div></div><button class="icon-btn catalogue-link-btn" onclick="event.stopPropagation();gp.setCatalogueLinkForExercise(${e.id})">${canonicalStatusIcon(u)}</button><button class="icon-btn" onclick="event.stopPropagation();gp.deleteExercise(${e.id})">×</button></div>`;}
function renderWorkoutEditor(id){
  const w=getWorkout(id);if(!w)return shell('<div class="empty">Workout not found.</div>',{topbar:topbar('Workout','programme'),navBar:false});
  const es=getTemplateExercises(w.id),blocks=programmeExerciseBlocks(es);let c=`<div class="row between"><div><h2 style="margin:8px 0 2px">${esc(w.name)}</h2><div class="small">${es.length} exercise${es.length===1?'':'s'}</div></div><button class="small-btn" onclick="gp.addExercise(${w.id})">+ Exercise</button></div><div class="reorder-hint"><span class="drag-grip-sample" aria-hidden="true"><i></i></span><span>Drag the grip to reorder. Supersets move together.</span></div><div class="programme-block-stack" style="margin-top:12px">`;
  blocks.forEach((block,i)=>{
    if(block.type==='superset'){
      c+=`<div class="card exercise-block superset-programme-card reorder-row"><div class="superset-card-label">SUPERSET</div>${renderProgrammeExerciseSubrow(block.items[0],{showGrip:true})}<div class="superset-card-divider"><span></span><button class="superset-link-btn split" onclick="event.stopPropagation();gp.splitSuperset('${block.groupId}')" aria-label="Separate superset">−</button><span></span></div>${renderProgrammeExerciseSubrow(block.items[1])}</div>`;
    }else{
      c+=`<div class="card exercise-block exercise-programme-row reorder-row">${renderProgrammeExerciseSubrow(block.items[0],{showGrip:true})}</div>`;
    }
    const next=blocks[i+1];if(next){const a=block.items.at(-1),b=next.items[0],pairable=block.type==='single'&&next.type==='single',joinable=pairable&&canJoinSuperset(a,b);c+=`<div class="superset-between">${pairable?`<button class="superset-link-btn join ${joinable?'':'disabled'}" ${joinable?`onclick="gp.joinSuperset(${a.id},${b.id})"`:'disabled'} aria-label="Create superset">+</button>`:'<span class="superset-gap"></span>'}</div>`;}
  });
  c+='</div>';return shell(c,{topbar:topbar(w.name,'programme'),navBar:false});
}
async function joinSuperset(firstId,secondId){const a=state.template_exercises.find(x=>x.id===Number(firstId)),b=state.template_exercises.find(x=>x.id===Number(secondId));if(!canJoinSuperset(a,b))return;const ordered=getTemplateExercises(a.workoutId);if(Math.abs(ordered.findIndex(x=>x.id===a.id)-ordered.findIndex(x=>x.id===b.id))!==1)return;const gid=uuid();a.supersetGroupId=gid;b.supersetGroupId=gid;await persist();render();toast('Superset created');}
async function splitSuperset(groupId){if(!groupId)return;state.template_exercises.filter(x=>x.supersetGroupId===groupId).forEach(x=>x.supersetGroupId=null);await persist();render();toast('Superset separated');}
async function moveExerciseBlock(id,d){const e=state.template_exercises.find(x=>x.id===Number(id));if(!e)return;const blocks=programmeExerciseBlocks(getTemplateExercises(e.workoutId)),from=blocks.findIndex(b=>b.items.some(x=>x.id===e.id)),to=Math.max(0,Math.min(blocks.length-1,from+Number(d)));if(from<0||from===to)return;const [block]=blocks.splice(from,1);blocks.splice(to,0,block);blocks.flatMap(b=>b.items).forEach((x,i)=>x.position=i);await persist();render();}
// Compatibility wrapper retained for legacy reorder bindings. Supersets must move as one block.
async function moveExercise(id,d){return moveExerciseBlock(id,d);}
function deleteExercise(id){const e=state.template_exercises.find(x=>x.id===Number(id));if(!e)return;const label=templateDisplayName(e),groupId=e.supersetGroupId;confirmDialog(`${S('Delete','Dzēst')} ${label}?`,S('Historical workout data is not affected.','Vēsturiskie treniņu dati netiks mainīti.'),S('Delete','Dzēst'),async()=>{state.template_exercises=state.template_exercises.filter(x=>x.id!==e.id);if(groupId){const remaining=state.template_exercises.filter(x=>x.supersetGroupId===groupId);if(remaining.length<2)remaining.forEach(x=>x.supersetGroupId=null);}getTemplateExercises(e.workoutId).forEach((x,i)=>x.position=i);if(e.userExerciseId&&!state.template_exercises.some(x=>x.userExerciseId===e.userExerciseId)){const u=getUserExercise(state,e.userExerciseId);if(u)u.archived=true;}await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();},true);}
function validTrackingModes(equipment,exerciseType){
  if(equipment===Equipment.CARDIO)return [TrackingMode.CARDIO];
  if([Equipment.BARBELL,Equipment.DUMBBELL,Equipment.MACHINE,Equipment.CABLE].includes(equipment))return [TrackingMode.WEIGHT_REPS,TrackingMode.TIME_ONLY];
  if(equipment===Equipment.BODYWEIGHT)return [TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY];
  return [TrackingMode.WEIGHT_REPS,TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY];
}
function trackingModeLabel(mode){return mode===TrackingMode.BODYWEIGHT_REPS?'Bodyweight reps + RIR':mode===TrackingMode.TIME_ONLY?'Timed':mode===TrackingMode.CARDIO?'Cardio (duration + metrics)':'Weight + reps + RIR';}
function trackingOptionsHtml(equipment,exerciseType,selected){const modes=validTrackingModes(equipment,exerciseType),resolved=modes.includes(selected)?selected:trackingModeFor(equipment);return modes.map(m=>`<option value="${m}" ${m===resolved?'selected':''}>${trackingModeLabel(m)}</option>`).join('');}
function refreshCompareEligibility(){
  const c=canonicalExerciseById($('#f-canonical-id')?.value||null),mode=$('#f-tracking')?.value||TrackingMode.WEIGHT_REPS,ok=!!(c?.friendE1rmEligible&&c?.comparisonMetric==='E1RM'&&mode===TrackingMode.WEIGHT_REPS),compare=$('#f-compare'),help=$('#f-compare-help'),row=$('#f-compare-row');
  if(compare){compare.disabled=!ok;if(!ok)compare.checked=false;}if(row)row.classList.toggle('is-disabled',!ok);
  if(help)help.textContent=ok?'Uses qualifying Estimated 1-rep max (e1RM) sets.':'Available only for comparable barbell and dumbbell catalogue exercises.';
}
function syncTrackingOptions(preferred=null){const select=$('#f-tracking');if(!select)return;const eq=$('#f-equipment')?.value||Equipment.OTHER,type=$('#f-type')?.value||ExerciseType.MODERATE_COMPOUND,modes=validTrackingModes(eq,type),current=preferred||select.value,resolved=modes.includes(current)?current:modes[0],changed=!!current&&resolved!==current;select.innerHTML=trackingOptionsHtml(eq,type,resolved);select.value=resolved;exerciseTrackingChanged();if(changed)toast(S('Tracking mode changed to a valid option for this equipment.','Uzskaites režīms mainīts uz šim aprīkojumam derīgu variantu.'));}
function exerciseLinkActionsHtml(canonical){return canonical?`<span class="catalogue-form-actions"><button type="button" class="ghost tiny-btn" onclick="gp.exerciseFormChangeLink()">${esc(S('Change','Mainīt'))}</button><button type="button" class="ghost tiny-btn" onclick="gp.exerciseFormUnlink()">${esc(S('Unlink','Atvienot'))}</button></span>`:'';}
function exerciseForm(e={}){
  const u=e.userExerciseId?getUserExercise(state,e.userExerciseId):null,match=byKey(e.exerciseKey)||bestMatch(u?.displayName||e.name||'');
  const canonical=canonicalExerciseById(u?.canonicalExerciseId),eq=e.equipment||u?.equipment||canonical?.equipment||match?.equipment||Equipment.OTHER,dbLoad=e.dumbbellLoad||u?.dumbbellLoad||canonical?.dumbbellLoad||match?.dumbbellLoad||DumbbellLoad.SINGLE,type=e.exerciseType||u?.exerciseType||canonical?.exerciseType||ExerciseType.MODERATE_COMPOUND;
  const allowed=validTrackingModes(eq,type),requestedMode=e.trackingMode||u?.trackingMode||trackingModeFor(eq),mode=allowed.includes(requestedMode)?requestedMode:allowed[0];
  const isCardio=mode===TrackingMode.CARDIO,cardioMinutes=Math.max(1,Math.round(Number(e.targetSeconds||1800)/60));
  const eqOptions=[[Equipment.BARBELL,'Barbell'],[Equipment.DUMBBELL,'Dumbbell'],[Equipment.MACHINE,'Machine'],[Equipment.CABLE,'Cable'],[Equipment.BODYWEIGHT,'Bodyweight'],[Equipment.CARDIO,'Cardio'],[Equipment.OTHER,'Other']].map(([v,l])=>`<option value="${v}" ${eq===v?'selected':''}>${l}</option>`).join('');
  const linkedId=u?.canonicalExerciseId||'',comparable=canonical?.friendE1rmEligible===true&&canonical?.comparisonMetric==='E1RM'&&mode===TrackingMode.WEIGHT_REPS,isNew=!e.id,showRemove=!isNew||[Equipment.BARBELL,Equipment.OTHER].includes(eq);
  const displayName=u?.displayName||e.name||'';
  return `<div class="exercise-form"><input type="hidden" id="f-canonical-id" value="${esc(linkedId)}"><input type="hidden" id="f-preserve-canonical" value="${linkedId?'1':'0'}"><div class="small exercise-search-tip">Start typing an exercise name. Catalogue matches appear while you type.</div><label class="field">Exercise</label><input id="f-name" maxlength="80" oninput="gp.exerciseNameChanged()" value="${esc(displayName)}" autocomplete="off" ${linkedId?'readonly':''}><div id="f-catalogue-feedback" class="catalogue-feedback">${linkedId?`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}: ${esc(canonicalName(canonical,languageCode(state)))}</span>${exerciseLinkActionsHtml(canonical)}`:''}</div><div id="f-catalogue-matches" class="catalogue-match-list"></div>
  <div id="f-cardio-options" style="${isCardio?'':'display:none'}"><label class="field">Target duration (minutes)</label><input id="f-cardio-minutes" type="number" min="1" max="1440" step="1" value="${cardioMinutes}"><p class="small">One continuous activity. Record actual duration, distance, heart rate, power and perceived effort when finished.</p></div><div class="form-grid exercise-primary-grid"><div id="f-sets-wrap" style="${isCardio?'display:none':''}"><label class="field">Sets</label><input id="f-sets" type="number" min="1" value="${e.sets||3}"></div><div id="f-reps-wrap" style="${[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?'display:none':''}"><label class="field">Reps</label><input id="f-reps" type="number" min="1" value="${e.reps||8}"></div><div id="f-time-wrap" style="${mode===TrackingMode.TIME_ONLY?'':'display:none'}"><label class="field">Time per set (seconds)</label><input id="f-time" type="number" min="5" step="5" value="${e.targetSeconds||60}"></div><div id="f-rest-wrap" style="${isCardio?'display:none':''}"><label class="field">Rest (seconds)</label><input id="f-rest" type="number" min="0" step="15" value="${e.restSeconds??120}"></div><div id="f-weight-wrap" class="span2" style="${[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(eq)?'display:none':''}"><label class="field" id="f-weight-label">${eq===Equipment.DUMBBELL?'Working weight per dumbbell (kg)':'Working weight (kg)'}</label><input id="f-weight" type="number" min="0" step="any" value="${eq===Equipment.BODYWEIGHT?0:(e.initialWeightKg??20)}"></div>
  <div><label class="field">Equipment</label><select id="f-equipment" onchange="gp.exerciseEquipmentChanged()">${eqOptions}</select></div><div id="f-ramp-wrap" style="${isCardio?'display:none':''}"><label class="field">Ramp-up</label><select id="f-ramp"><option value="AUTO" ${(e.rampMode||'AUTO')==='AUTO'?'selected':''}>Automatic</option><option value="ALWAYS" ${e.rampMode==='ALWAYS'?'selected':''}>Always</option><option value="NEVER" ${e.rampMode==='NEVER'?'selected':''}>Never</option></select></div>
  <div id="f-db-load-wrap" class="span2" style="${eq===Equipment.DUMBBELL?'':'display:none'}"><label class="field">Dumbbells</label><select id="f-db-load"><option value="PAIR" ${dbLoad===DumbbellLoad.PAIR?'selected':''}>Pair</option><option value="SINGLE" ${dbLoad===DumbbellLoad.SINGLE?'selected':''}>Single</option></select></div>
  <div id="f-exercise-type-wrap" class="span2" style="${isCardio?'display:none':''}"><label class="field">Exercise type</label><select id="f-type" onchange="gp.exerciseTypeChanged()">${Object.values(ExerciseType).map(t=>`<option value="${t}" ${type===t?'selected':''}>${t.replaceAll('_',' ').toLowerCase()}</option>`).join('')}</select></div><div id="f-tracking-wrap" class="span2" style="${isCardio?'display:none':''}"><label class="field">Tracking</label><select id="f-tracking" onchange="gp.exerciseTrackingChanged()">${trackingOptionsHtml(eq,type,mode)}</select></div></div>
  <label id="f-compare-row" class="setting-toggle-row compare-toggle-row ${comparable?'':'is-disabled'}" style="${isCardio?'display:none':''}"><span class="setting-toggle-copy"><strong>Compare with friends</strong><small id="f-compare-help">${comparable?'Uses qualifying Estimated 1-rep max (e1RM) sets.':'Available only for comparable barbell and dumbbell catalogue exercises.'}</small></span><span class="setting-toggle-control"><input id="f-compare" class="setting-toggle-input" type="checkbox" ${e.compareWithFriends&&comparable?'checked':''} ${comparable?'':'disabled'}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>
  <label id="f-remove-row" data-new="${isNew?'1':'0'}" class="setting-toggle-row" style="${showRemove&&!isCardio?'':'display:none'}"><span class="setting-toggle-copy"><strong>Remove weights after exercise</strong><small>Useful mainly when plates or equipment need a separate unload transition.</small></span><span class="setting-toggle-control"><input id="f-remove" class="setting-toggle-input" type="checkbox" ${e.removeWeights?'checked':''}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label></div>`;
}
function applyCatalogueChoice(id){const c=canonicalExerciseById(id);if(!c)return;$('#f-canonical-id').value=c.id;const preserve=$('#f-preserve-canonical'),name=$('#f-name');if(preserve)preserve.value='1';if(name){name.value=canonicalName(c,languageCode(state));name.readOnly=true;}$('#f-equipment').value=c.equipment;$('#f-db-load').value=c.dumbbellLoad||DumbbellLoad.SINGLE;$('#f-type').value=c.equipment===Equipment.CARDIO?ExerciseType.CARDIO:(c.exerciseType||ExerciseType.MODERATE_COMPOUND);syncTrackingOptions(trackingModeFor(c.equipment));const feedback=$('#f-catalogue-feedback');if(feedback)feedback.innerHTML=`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}: ${esc(canonicalName(c,languageCode(state)))}</span>${exerciseLinkActionsHtml(c)}`;const list=$('#f-catalogue-matches');if(list)list.innerHTML='';exerciseEquipmentChanged();refreshCompareEligibility();}
function exerciseFormChangeLink(){const hidden=$('#f-canonical-id'),preserve=$('#f-preserve-canonical'),name=$('#f-name'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches');if(hidden)hidden.value='';if(preserve)preserve.value='0';if(name){name.readOnly=false;name.focus();name.select();}if(feedback)feedback.innerHTML=`${catalogueInlineGlobe(false)} <span>${esc(S('Type to choose a different catalogue exercise.','Raksti, lai izvēlētos citu kataloga vingrinājumu.'))}</span>`;if(list)list.innerHTML='';refreshCompareEligibility();}
function exerciseFormUnlink(){const hidden=$('#f-canonical-id'),preserve=$('#f-preserve-canonical'),name=$('#f-name'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches');if(hidden)hidden.value='';if(preserve)preserve.value='0';if(name)name.readOnly=false;if(feedback)feedback.innerHTML=`${catalogueInlineGlobe(false)} <span>${esc(S('Not linked. This exercise stays local.','Nav saistīts. Šis vingrinājums paliek lokāls.'))}</span>`;if(list)list.innerHTML='';refreshCompareEligibility();}

function exerciseExistingChanged(){/* retained for old markup compatibility; new Add flow does not select existing exercises */}
function exerciseNameChanged(){const input=$('#f-name'),q=String(input?.value||'').trim(),hidden=$('#f-canonical-id'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches'),preserve=$('#f-preserve-canonical')?.value==='1'&&!!hidden?.value;if(preserve){const c=canonicalExerciseById(hidden.value);if(feedback)feedback.innerHTML=`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}${c?`: ${esc(canonicalName(c,languageCode(state)))}`:''}</span>${exerciseLinkActionsHtml(c)}`;if(list)list.innerHTML='';refreshCompareEligibility();return;}const exact=catalogueSearchMatch(q);if(hidden)hidden.value='';const suggestions=q.length>=2?canonicalSuggestions(q,languageCode(state)).slice(0,6):[];if(exact){applyCatalogueChoice(exact.id);return;}refreshCompareEligibility();if(feedback)feedback.innerHTML=q?`${catalogueInlineGlobe(false)} <span>${esc(S('Not linked. If no catalogue match is selected, this exercise will remain local and will not support online exercise comparison.','Nav saistīts. Ja netiks izvēlēta kataloga atbilstība, vingrinājums paliks lokāls un tam nebūs tiešsaistes vingrinājumu salīdzināšanas.'))}</span>`:'';if(list)list.innerHTML=suggestions.map(c=>`<button type="button" class="catalogue-match" onclick="gp.applyCatalogueChoice('${c.id}')">${esc(canonicalName(c,languageCode(state)))} <span>${esc(c.category==='CARDIO'?S('Cardio','Kardio'):S('Strength','Spēks'))}</span></button>`).join('');}
function exerciseTypeChanged(){exerciseTrackingChanged();}
function exerciseTrackingChanged(){
  const select=$('#f-tracking'),eq=$('#f-equipment')?.value||Equipment.OTHER,type=$('#f-type')?.value||ExerciseType.MODERATE_COMPOUND,modes=validTrackingModes(eq,type);
  if(select&&!modes.includes(select.value))select.value=modes[0];
  const mode=select?.value||modes[0],cardio=mode===TrackingMode.CARDIO;
  const visibility={
    '#f-cardio-options':cardio,'#f-sets-wrap':!cardio,'#f-reps-wrap':!cardio&&!([TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)),
    '#f-time-wrap':!cardio&&mode===TrackingMode.TIME_ONLY,'#f-rest-wrap':!cardio,'#f-weight-wrap':!cardio&&![Equipment.BODYWEIGHT,Equipment.CARDIO].includes(eq),
    '#f-ramp-wrap':!cardio,'#f-exercise-type-wrap':!cardio,'#f-tracking-wrap':!cardio,'#f-compare-row':!cardio,'#f-remove-row':!cardio&&[Equipment.BARBELL,Equipment.OTHER].includes(eq)
  };
  for(const [selector,visible] of Object.entries(visibility)){const item=$(selector);if(item)item.style.display=visible?'':'none';}
  const ramp=$('#f-ramp');if(ramp){ramp.disabled=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode);if(ramp.disabled)ramp.value=RampMode.NEVER;}
  if(cardio){const sets=$('#f-sets'),rest=$('#f-rest'),exerciseType=$('#f-type');if(sets)sets.value='1';if(rest)rest.value='0';if(exerciseType)exerciseType.value=ExerciseType.CARDIO;}
  refreshCompareEligibility();
}
function exerciseEquipmentChanged(){const eq=$('#f-equipment')?.value||Equipment.OTHER,show=eq===Equipment.DUMBBELL,bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(eq);const wrap=$('#f-db-load-wrap');if(wrap)wrap.style.display=show?'':'none';const input=$('#f-weight'),label=$('#f-weight-label');if(input){input.step='any';input.min='0';if(bodyweight)input.value='0';else if(!(Number(input.value)>0))input.value='';input.setCustomValidity('');}if(label)label.textContent=t(show?'Working weight per dumbbell (kg)':'Working weight (kg)',languageCode(state));const removeRow=$('#f-remove-row');if(removeRow&&removeRow.dataset.new==='1'){const allowed=[Equipment.BARBELL,Equipment.OTHER].includes(eq);removeRow.style.display=allowed?'':'none';if(!allowed){const cb=$('#f-remove');if(cb)cb.checked=false;}}syncTrackingOptions($('#f-tracking')?.value||trackingModeFor(eq));}
function validateExerciseWeight(){const mode=$('#f-tracking')?.value||TrackingMode.WEIGHT_REPS,equipment=$('#f-equipment')?.value||Equipment.OTHER,input=$('#f-weight');if(mode===TrackingMode.BODYWEIGHT_REPS||equipment===Equipment.BODYWEIGHT||equipment===Equipment.CARDIO){input?.setCustomValidity('');return true;}const valid=Number(input?.value)>0;if(input){input.setCustomValidity(valid?'':'Working weight must be greater than 0 kg.');if(!valid)input.reportValidity();}return valid;}
function readExerciseForm(workoutId,old=null){
  const inputName=$('#f-name').value.trim().slice(0,80)||'Exercise',canonical=canonicalExerciseById($('#f-canonical-id')?.value||null),legacy=bestMatch(inputName);let trackingMode=$('#f-tracking')?.value||TrackingMode.WEIGHT_REPS;
  let equipment=$('#f-equipment').value||old?.equipment||canonical?.equipment||legacy?.equipment||Equipment.OTHER;const validModes=validTrackingModes(equipment,$('#f-type').value||canonical?.exerciseType||legacy?.type||ExerciseType.MODERATE_COMPOUND);if(!validModes.includes(trackingMode))trackingMode=validModes[0];
  const dumbbellLoad=equipment===Equipment.DUMBBELL?($('#f-db-load').value||old?.dumbbellLoad||canonical?.dumbbellLoad||legacy?.dumbbellLoad||DumbbellLoad.SINGLE):DumbbellLoad.SINGLE;
  let u=old?.userExerciseId?getUserExercise(state,old.userExerciseId):null;if(!u&&canonical){const same=activeUserExercises(state).filter(x=>x.canonicalExerciseId===canonical.id);if(same.length===1)u=same[0];}
  if(!u)u=createUserExerciseFromInput(inputName,equipment,dumbbellLoad,trackingMode===TrackingMode.CARDIO?ExerciseType.CARDIO:($('#f-type').value||canonical?.exerciseType||legacy?.type),trackingMode,canonical);
  else{u.displayName=inputName;u.trackingMode=trackingMode;u.canonicalExerciseId=canonical?.id||null;u.candidateCanonicalExerciseId=null;u.equipment=canonical?.equipment||equipment;u.dumbbellLoad=canonical?.dumbbellLoad||dumbbellLoad;u.exerciseType=trackingMode===TrackingMode.CARDIO?ExerciseType.CARDIO:(canonical?.exerciseType||$('#f-type').value||u.exerciseType);}
  const name=u.displayName,mode=u.trackingMode||trackingMode,resolvedEquipment=u.equipment||equipment,resolvedDbLoad=u.dumbbellLoad||dumbbellLoad;
  const cardio=mode===TrackingMode.CARDIO;
  const rawWeight=mode===TrackingMode.BODYWEIGHT_REPS||resolvedEquipment===Equipment.BODYWEIGHT||resolvedEquipment===Equipment.CARDIO?0:Math.max(0,Number($('#f-weight').value)||0),remove=$('#f-remove');
  return{id:old?.id||uid(state.template_exercises),workoutId:Number(workoutId),name,position:old?.position??getTemplateExercises(workoutId).length,sets:cardio?1:Math.max(1,Number($('#f-sets').value)||1),reps:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?0:Math.max(1,Number($('#f-reps').value)||1),targetSeconds:cardio?Math.max(1,Number($('#f-cardio-minutes')?.value)||30)*60:mode===TrackingMode.TIME_ONLY?Math.max(5,Number($('#f-time').value)||60):0,restSeconds:cardio?0:Math.max(0,Number($('#f-rest').value)||0),initialWeightKg:[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(resolvedEquipment)?0:rawWeight,exerciseKey:u.legacyExerciseKey||canonical?.legacyExerciseKey||legacy?.key||old?.exerciseKey||null,exerciseType:cardio?ExerciseType.CARDIO:(u.exerciseType||ExerciseType.MODERATE_COMPOUND),rampMode:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?RampMode.NEVER:($('#f-ramp').value||RampMode.AUTO),removeWeights:cardio||resolvedEquipment===Equipment.BODYWEIGHT?false:(remove?.checked===true),equipment:resolvedEquipment,dumbbellLoad:resolvedDbLoad,userExerciseId:u.id,programmeExerciseId:old?.programmeExerciseId||uuid(),trackingMode:mode,compareWithFriends:$('#f-compare')?.checked===true&&isFriendComparableUserExercise(u),supersetGroupId:old?.supersetGroupId||null};
}

function addExercise(workoutId){formDialog('Add exercise',exerciseForm({workoutId,exerciseType:ExerciseType.MODERATE_COMPOUND}),'Add',async()=>{if(!validateExerciseWeight())return;const e=readExerciseForm(workoutId);state.template_exercises.push(e);await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();});setTimeout(()=>exerciseNameChanged(),0);}
function editExercise(id){const e=state.template_exercises.find(x=>x.id===Number(id));formDialog('Edit exercise',exerciseForm(e),'Save',async()=>{if(!validateExerciseWeight())return;const n=readExerciseForm(e.workoutId,e);Object.assign(e,n);await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();});}
function formatCardioSessionLoad(s){
  let total=0,recorded=false;
  for(const e of state.session_exercises.filter(x=>x.sessionId===s.id&&x.trackingMode===TrackingMode.CARDIO)){
    const m=exerciseMetrics(state,e);if(m.cardioLoad>0){total+=m.cardioLoad;recorded=true;}
  }
  return recorded?`${Math.round(total)} AU`:'—';
}
function workoutLogEffort(session,sm){
  const cardio=workoutCardioEffort(state,session);
  if(session.status==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  if(cardio.mode==='cardio')return {key:'cardio-'+cardio.effort.key,label:cardio.effort.label+(cardio.effort.rpe!=null?' · RPE '+cardio.effort.rpe.toFixed(1):''),color:cardio.effort.color};
  if(cardio.mode==='mixed')return {key:'mixed',label:'Mixed cardio + strength · separately tracked',color:COLORS.gray};
  return sessionDifficultyLevel(sm,state.app_state,session.status);
}
function renderLogs(){
  const sessions=state.workout_sessions.filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').sort((a,b)=>b.startedAt-a.startedAt);let c=`<h1>Logs</h1>`;
  if(!sessions.length)c+=`<div class="empty">No recorded workouts yet.</div>`;
  else{
    c+=renderFrequencyTimeline();
    sessions.slice(0,ui.logLimit||40).forEach(s=>{const m=sessionMetrics(state,s),diff=workoutLogEffort(s,m),cardio=workoutCardioEffort(state,s),dur=(s.endedAt||s.startedAt)-s.startedAt;c+=`<div id="log-session-${s.id}" class="card clickable log-session-card" onclick="gp.nav('session',${s.id})"><div class="log-date">${dateOnly(s.startedAt)}</div><div class="log-name">${esc(s.workoutName)}</div><div class="metric-grid" style="margin-top:12px"><div class="metric"><div class="metric-label">Duration</div><div class="metric-value">${formatDuration(dur)}</div></div><div class="metric"><div class="metric-label">${cardio.mode==='cardio'?'Cardio':'Volume'}</div><div class="metric-value">${cardio.mode==='cardio'?formatDuration(state.session_exercises.filter(e=>e.sessionId===s.id&&e.trackingMode===TrackingMode.CARDIO).reduce((sum,e)=>sum+exerciseMetrics(state,e).totalDurationSeconds,0)*1000):formatKgRounded(m.volume)}</div></div><div class="metric"><div class="metric-label">${cardio.mode==='cardio'?'Training load':'Volume progress'}</div><div class="metric-value">${cardio.mode==='cardio'?formatCardioSessionLoad(s):fmtPct(m.progressPercent)}</div></div></div><div class="row between" style="margin-top:12px"><span class="small">Effort</span><span class="difficulty ${diff.key}">${diff.label}</span></div></div>`;});
    if(sessions.length>(ui.logLimit||40))c+=`<button class="secondary full" onclick="gp.moreLogs()" style="margin-top:14px">Show more workouts (${sessions.length-(ui.logLimit||40)} remaining)</button>`;
  }
  return shell(c);
}
function moreLogs(){ui.logLimit=(ui.logLimit||40)+40;render();}
function renderSessionDetail(id){const s=getSession(id);if(!s)return shell('',{topbar:topbar('Log','logs'),navBar:false});const es=sessionExercises(state,s.id),rirMax=Math.max(3,Math.min(5,state.app_state.rirInputMax||3)),sm=sessionMetrics(state,s),sd=workoutLogEffort(s,sm);let c=`<div class="small">${dateTime(s.startedAt)}</div>${s.note?`<div class="note">${esc(s.note)}</div>`:''}<div class="row between session-status-line"><span class="small">Difficulty</span><span class="difficulty ${sd.key}">${sd.label}</span></div><div class="phase-grid" style="margin-top:14px"><div class="phase-item"><strong>Warm-up</strong>${phaseDuration(s.warmupStartedAt,s.warmupEndedAt,s.warmupSkipped)}</div><div class="phase-item"><strong>Stretching</strong>${phaseDuration(s.stretchStartedAt,s.stretchEndedAt,s.stretchSkipped)}</div></div>`;
  es.forEach(e=>{const m=exerciseMetrics(state,e),diff=e.trackingMode===TrackingMode.CARDIO?(Number(m.sessionRpe)>=1?({key:'cardio-'+(Number(m.sessionRpe)<=3?'easy':Number(m.sessionRpe)<=6?'moderate':Number(m.sessionRpe)<=8?'hard':'veryhard'),label:'RPE '+Number(m.sessionRpe).toFixed(1)}):{key:'unknown',label:'Effort not recorded'}):difficultyLevel(m.avgRir,m.actionableFailureCount,state.app_state,null,m.completedSets);c+=`<div class="card" style="margin-top:12px"><div class="row between"><div><div class="title">${esc(sessionDisplayName(e))}</div><div class="subtitle">${e.status==='SKIPPED'?'Skipped':e.trackingMode===TrackingMode.CARDIO?`${formatDuration(m.totalDurationSeconds*1000)} · ${m.totalDistanceKm.toFixed(2)} km${m.totalDistanceKm>0?' · '+(m.totalDurationSeconds/60/m.totalDistanceKm).toFixed(2)+' min/km':''}`:`${formatKgRounded(m.volume)} volume`}</div>${e.note?`<div class="note exercise-note">${esc(e.note)}</div>`:''}</div><span class="difficulty ${diff.key}">${diff.label}</span></div>${e.rampStartedAt||e.rampSkipped?`<div class="small" style="margin-top:8px">Ramp-up · ${phaseDuration(e.rampStartedAt,e.rampEndedAt,e.rampSkipped)}</div>`:''}${e.unloadStartedAt||e.unloadSkipped?`<div class="small">Remove weights · ${phaseDuration(e.unloadStartedAt,e.unloadEndedAt,e.unloadSkipped)}</div>`:''}<div style="margin-top:8px">${exerciseSets(state,e.id).map(set=>`<div class="set-row log-set-row lang-${languageCode(state)}"><strong>${e.trackingMode===TrackingMode.CARDIO?'Activity':set.setNumber}</strong><span>${set.status==='SKIPPED'?'Skipped':[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode)?formatDuration(Number(set.actualDurationSeconds||0)*1000):`${set.actualReps??'—'} ${esc(S('reps','atk.'))}`}</span><span>${set.status==='COMPLETE'&&![TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode)?formatKg(set.actualWeightKg):''}</span><span>${[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode)?'':set.failure?'Failure':set.rir!=null?`RIR ${Number(set.rir)>=rirMax?`${rirMax}+`:set.rir}`:''}</span>${e.trackingMode===TrackingMode.CARDIO&&set.status==='COMPLETE'?`<span class="small">${set.distanceKm!=null?`${Number(set.distanceKm).toFixed(2)} km`:'—'}${Number(set.distanceKm)>0?' · '+(Number(set.actualDurationSeconds||0)/60/Number(set.distanceKm)).toFixed(2)+' min/km':''}${set.averageHeartRateBpm?' · '+set.averageHeartRateBpm+' bpm':''}${set.averagePowerWatts?' · '+set.averagePowerWatts+' W':''}${set.sessionRpe?' · RPE '+set.sessionRpe:''}</span>`:''}</div>`).join('')}</div></div>`;});
  c+=`<button class="danger full" style="margin-top:18px" onclick="gp.deleteSession(${s.id})">Delete this workout</button>`;
  return shell(c,{topbar:topbar(s.workoutName,'logs'),navBar:false});
}
function removeLocalWorkoutSession(id){const sid=Number(id),exIds=new Set(state.session_exercises.filter(e=>Number(e.sessionId)===sid).map(e=>Number(e.id)));state.workout_sessions=state.workout_sessions.filter(s=>Number(s.id)!==sid);state.session_exercises=state.session_exercises.filter(e=>Number(e.sessionId)!==sid);state.performed_sets=state.performed_sets.filter(s=>!exIds.has(Number(s.sessionExerciseId)));if(Number(state.runtime?.sessionId)===sid)state.runtime=null;}
function deleteSession(id){confirmDialog('Delete this workout?','This removes the complete session and all of its recorded sets. This cannot be undone.','Delete',async()=>{removeLocalWorkoutSession(id);await persist();if(socialSignedIn()){await performTrainingSync({reason:'delete-session'}).catch(console.warn);await syncComparisonHistory().catch(console.warn);}closeDialog();nav('logs');},true);}

function progressExerciseOptions(){
  const ids=new Set([...state.template_exercises.map(e=>e.userExerciseId),...state.session_exercises.map(e=>e.userExerciseId)].filter(Boolean));const out=[];
  for(const id of ids){const u=getUserExercise(state,id);if(!u)continue;out.push({value:`u:${id}`,label:u.displayName,userExerciseId:id,programmeExerciseId:null});const occurrences=state.template_exercises.filter(e=>e.userExerciseId===id);if(occurrences.length>1){for(const e of occurrences){const w=getWorkout(e.workoutId),same=occurrences.filter(x=>x.workoutId===e.workoutId).sort((a,b)=>a.position-b.position),n=same.findIndex(x=>x.id===e.id)+1;out.push({value:`p:${e.programmeExerciseId}`,label:`${u.displayName} · ${w?.name||'Day'}${same.length>1?` · #${n}`:''}`,userExerciseId:id,programmeExerciseId:e.programmeExerciseId});}}}
  return out.sort((a,b)=>a.label.localeCompare(b.label));
}
function rangeStartMs(){const end=now(),d=new Date();if(ui.progressRange==='1m')d.setMonth(d.getMonth()-1);else if(ui.progressRange==='3m')d.setMonth(d.getMonth()-3);else if(ui.progressRange==='6m')d.setMonth(d.getMonth()-6);else if(ui.progressRange==='1y')d.setFullYear(d.getFullYear()-1);else if(ui.progressRange==='5y')d.setFullYear(d.getFullYear()-5);else if(ui.progressRange==='custom'&&ui.customStart)return new Date(`${ui.customStart}T00:00:00`).getTime();return d.getTime();}
function rangeEndMs(){return ui.progressRange==='custom'&&ui.customEnd?new Date(`${ui.customEnd}T23:59:59`).getTime():now();}
function historyRows(selection){
  const opt=progressExerciseOptions().find(x=>x.value===selection);if(!opt)return[];
  const candidates=state.session_exercises.filter(e=>e.userExerciseId===opt.userExerciseId&&(!opt.programmeExerciseId||e.programmeExerciseId===opt.programmeExerciseId)),rows=[];
  for(const e of candidates){const ses=getSession(e.sessionId),sets=exerciseSets(state,e.id),fullyCompleted=e.status==='COMPLETE'&&sets.filter(x=>x.status==='COMPLETE').length===Number(e.targetSets)&&!sets.some(x=>x.status==='SKIPPED');if(!(ses?.status==='COMPLETE'||(ses?.status==='ABORTED'&&fullyCompleted)))continue;const m=exerciseMetrics(state,e),measured=sets.filter(x=>x.status==='COMPLETE'),averageByDuration=field=>{const valid=measured.filter(x=>Number(x[field])>0);if(!valid.length)return null;const duration=valid.reduce((t,x)=>t+Math.max(1,Number(x.actualDurationSeconds||0)),0);return valid.reduce((t,x)=>t+Number(x[field])*Math.max(1,Number(x.actualDurationSeconds||0)),0)/duration;},rirValues=sets.filter(x=>x.status==='COMPLETE').map(st=>st.failure?0:st.rir).filter(x=>x!=null).map(Number);rows.push({sessionStartedAt:ses.startedAt,sessionId:e.sessionId,sessionExerciseId:e.id,programmeExerciseId:e.programmeExerciseId||null,status:e.status,equipment:e.equipment||Equipment.OTHER,trackingMode:e.trackingMode||TrackingMode.WEIGHT_REPS,completedSets:m.completedSets,volume:m.volume,maxWeight:m.maxWeight,maxReps:m.maxReps,bestE1rm:m.bestE1rm,totalDurationSeconds:m.totalDurationSeconds,totalDistanceKm:m.totalDistanceKm,averageHeartRateBpm:averageByDuration("averageHeartRateBpm"),averagePowerWatts:averageByDuration("averagePowerWatts"),sessionRpe:averageByDuration("sessionRpe"),cardioLoad:m.cardioLoad,actionableFailureCount:m.actionableFailureCount,avgRir:rirValues.length?rirValues.reduce((a,b)=>a+b,0)/rirValues.length:null,progressionOffered:!!e.progressionOffered,progressionAccepted:!!e.progressionAccepted});}
  rows.sort((a,b)=>a.sessionStartedAt-b.sessionStartedAt||a.sessionExerciseId-b.sessionExerciseId);
  if(opt.programmeExerciseId)return rows;
  const occurrenceIds=state.template_exercises.filter(e=>e.userExerciseId===opt.userExerciseId&&e.programmeExerciseId).map(e=>e.programmeExerciseId);
  if(new Set(occurrenceIds).size<=1||rows.some(r=>r.trackingMode===TrackingMode.CARDIO))return rows;
  const byOccurrence=new Map();for(const id of occurrenceIds)byOccurrence.set(id,rows.filter(r=>r.programmeExerciseId===id));
  const count=Math.max(0,...[...byOccurrence.values()].map(v=>v.length)),cycles=[];
  for(let i=0;i<count;i++){const members=[...byOccurrence.values()].map(v=>v[i]).filter(Boolean);if(!members.length)continue;const representative=members.slice().sort((a,b)=>(b.maxWeight-a.maxWeight)||(b.maxReps-a.maxReps)||(b.totalDurationSeconds-a.totalDurationSeconds))[0];cycles.push({...representative,sessionStartedAt:Math.max(...members.map(x=>x.sessionStartedAt)),sessionId:Math.max(...members.map(x=>x.sessionId)),sessionExerciseId:representative.sessionExerciseId,programmeExerciseId:null,completedSets:Math.max(...members.map(x=>x.completedSets)),volume:Math.max(...members.map(x=>x.volume)),maxWeight:Math.max(...members.map(x=>x.maxWeight)),maxReps:Math.max(...members.map(x=>x.maxReps)),bestE1rm:Math.max(...members.map(x=>x.bestE1rm)),totalDurationSeconds:Math.max(...members.map(x=>x.totalDurationSeconds)),totalDistanceKm:representative.totalDistanceKm,averageHeartRateBpm:representative.averageHeartRateBpm,averagePowerWatts:representative.averagePowerWatts,actionableFailureCount:members.every(x=>x.actionableFailureCount>0)?1:0,avgRir:members.map(x=>x.avgRir).filter(x=>x!=null).sort((a,b)=>b-a)[0]??null,progressionOffered:members.some(x=>x.progressionOffered),progressionAccepted:members.some(x=>x.progressionAccepted),cycleMembers:members.length});}
  return cycles.sort((a,b)=>a.sessionStartedAt-b.sessionStartedAt);
}
const CARDIO_METRICS=new Set(['DURATION','DISTANCE','PACE','HEART_RATE','POWER','RPE','LOAD']);
function progressMetricValue(row,metric){if(metric==='DISTANCE')return Number(row.totalDistanceKm)>0?Number(row.totalDistanceKm):null;if(metric==='PACE')return Number(row.totalDistanceKm)>0&&Number(row.totalDurationSeconds)>0?Number(row.totalDurationSeconds)/Number(row.totalDistanceKm):null;if(metric==='HEART_RATE')return Number(row.averageHeartRateBpm)>0?Number(row.averageHeartRateBpm):null;if(metric==='POWER')return Number(row.averagePowerWatts)>0?Number(row.averagePowerWatts):null;if(metric==='RPE')return Number(row.sessionRpe)>0?Number(row.sessionRpe):null;if(metric==='LOAD')return Number(row.cardioLoad)>0?Number(row.cardioLoad):null;return metric==='WEIGHT'?row.maxWeight:metric==='REPS'?row.maxReps:metric==='VOLUME'?row.volume:metric==='DURATION'?row.totalDurationSeconds:row.bestE1rm;}
function primaryProgressMetric(row){return [TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(row?.trackingMode)?'DURATION':row?.equipment===Equipment.BODYWEIGHT?'REPS':'WEIGHT';}
function buildChartPoints(rows,metric,start,end){const out=[];let prev=null;for(const r of rows){const inRange=r.sessionStartedAt>=start&&r.sessionStartedAt<=end,skipped=r.completedSets<=0;if(skipped){if(inRange&&metric===primaryProgressMetric(r)&&prev)out.push({time:r.sessionStartedAt,value:progressMetricValue(prev,metric),cls:'SKIPPED'});continue;}const value=progressMetricValue(r,metric);if(value==null||!Number.isFinite(value))continue;const cls=classifyProgress(r,prev,metric);if(inRange)out.push({time:r.sessionStartedAt,value,cls});prev=r;}return out;}
function classifyProgress(cur,prev,metric){if(cur.trackingMode===TrackingMode.CARDIO)return'MEASURED';const primary=metric===primaryProgressMetric(cur);if(primary&&cur.actionableFailureCount>0)return'FAILURE';if(!prev)return'FIRST';const cv=progressMetricValue(cur,metric),pv=progressMetricValue(prev,metric);if(cv>pv+.001)return'UP';if(cv<pv-.001)return'DOWN';if(primary&&cur.actionableFailureCount===0&&prev.actionableFailureCount===0&&cur.avgRir!=null&&prev.avgRir!=null&&cur.avgRir>prev.avgRir+.05)return'BETTER';return'SAME';}
function progressColor(cls){return {FIRST:COLORS.blue,UP:COLORS.green,BETTER:COLORS.lightgreen,SAME:COLORS.yellow,DOWN:COLORS.red,FAILURE:COLORS.deepred,SKIPPED:COLORS.gray,MEASURED:COLORS.blue}[cls]||COLORS.blue;}
function mixHexColor(a,b,t=.5){const n=x=>parseInt(x,16),aa=String(a).replace('#',''),bb=String(b).replace('#','');if(aa.length!==6||bb.length!==6)return b;const c=[0,2,4].map(i=>Math.round(n(aa.slice(i,i+2))+(n(bb.slice(i,i+2))-n(aa.slice(i,i+2)))*t).toString(16).padStart(2,'0'));return`#${c.join('')}`;}
function niceChartStep(span,targetIntervals=5,integer=false,weight=false){if(!Number.isFinite(span)||span<=0)return integer?1:2.5;const raw=span/Math.max(1,targetIntervals),power=10**Math.floor(Math.log10(raw)),fraction=raw/power,candidates=integer?[1,2,5,10]:weight&&power<10?[1,2.5,5,10]:[1,2,2.5,5,10],nice=candidates.find(x=>x>=fraction)??10;return Math.max(integer?1:0,nice*power);}
function niceChartAxis(minValue,maxValue,{targetIntervals=5,integer=false,weight=false}={}){let min=Number(minValue),max=Number(maxValue);if(!Number.isFinite(min)||!Number.isFinite(max))return{low:0,high:1,step:1,ticks:[0,1]};if(max<min)[min,max]=[max,min];let span=max-min;if(span<1e-9){const basis=Math.max(Math.abs(max)*.1,integer?1:2.5);min-=basis/2;max+=basis/2;span=max-min;}let step=niceChartStep(span*1.1,targetIntervals,integer,weight),low=Math.max(0,Math.floor((min-step*.35)/step)*step),high=Math.ceil((max+step*.35)/step)*step;if(high<=low)high=low+step;let ticks=[];for(let v=low,i=0;v<=high+step*.001&&i<12;v+=step,i++)ticks.push(Math.abs(v)<1e-9?0:v);if(ticks.length<3){high+=step;ticks=[];for(let v=low,i=0;v<=high+step*.001&&i<12;v+=step,i++)ticks.push(Math.abs(v)<1e-9?0:v);}return{low,high,step,ticks};}
function compactTick(value,step){const decimals=step<1?2:step<10&&Math.abs(step-Math.round(step))>.001?1:0;return Number(value).toFixed(decimals).replace(/\.0+$/,'');}
function renderChart(points,metric){
  if(!points.length)return`<div class="empty">No data in this period.</div>`;
  const viewportWidth=window.visualViewport?.width||window.innerWidth||760,W=Math.max(276,Math.min(716,viewportWidth-44)),H=250,L=58,R=4,T=16,B=14,vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),axis=niceChartAxis(min,max,{targetIntervals:5,integer:metric==='REPS'||metric==='DURATION',weight:metric==='WEIGHT'||metric==='E1RM'}),low=axis.low,high=axis.high,range=Math.max(.001,high-low),minT=Math.min(...points.map(p=>p.time)),maxT=Math.max(...points.map(p=>p.time));
  const x=t=>maxT===minT?L+(W-L-R)/2:L+(W-L-R)*(t-minT)/(maxT-minT),y=v=>T+(H-T-B)*(1-(v-low)/range);
  const axisLabel=tick=>metric==='REPS'?`${Math.round(tick)}`:metric==='DURATION'?formatDuration(Math.max(0,tick)*1000):metric==='PACE'?`${formatDuration(Math.max(0,tick)*1000)}/km`:metric==='DISTANCE'?`${compactTick(tick,axis.step)} km`:metric==='HEART_RATE'?`${Math.round(tick)} bpm`:metric==='POWER'?`${Math.round(tick)} W`:metric==='RPE'?`${compactTick(tick,axis.step)} RPE`:metric==='LOAD'?`${compactTick(tick,axis.step)} AU`:metric==='VOLUME'?(Math.abs(tick)>=1000?`${compactTick(tick/1000,axis.step/1000)}k kg`:`${compactTick(tick,axis.step)} kg`):`${compactTick(tick,axis.step)} kg`;
  let defs='',paths='',dots='',grid='';for(const tick of axis.ticks.slice().reverse()){const yy=y(tick);grid+=`<line class="chart-grid" vector-effect="non-scaling-stroke" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis" x="${L-6}" y="${yy+4}" text-anchor="end">${axisLabel(tick)}</text>`;}
  if(points.length===1){const p=points[0],px=x(p.time),py=y(p.value),color=progressColor(p.cls);paths=`<line x1="${px-10}" y1="${py}" x2="${px+10}" y2="${py}" stroke="${color}" class="chart-line" vector-effect="non-scaling-stroke"/>`;dots=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${px}" cy="${py}" r="4" fill="${color}"/>`;}
  else{const trendCls=(u,v)=>CARDIO_METRICS.has(metric)?'MEASURED':v.value>u.value+.001?'UP':v.value<u.value-.001?'DOWN':v.cls,segmentColors=points.slice(0,-1).map((a,i)=>progressColor(trendCls(a,points[i+1]))),fade=.18;points.slice(0,-1).forEach((a,i)=>{const b=points[i+1],ax=x(a.time),ay=y(a.value),bx=x(b.time),by=y(b.value),dx=bx-ax,id=`g${i}`,segmentColor=segmentColors[i],previousColor=segmentColors[i-1]||null,nextColor=segmentColors[i+1]||null,firstPointColor=i===0?progressColor(a.cls):null,startBoundary=previousColor&&previousColor!==segmentColor?mixHexColor(previousColor,segmentColor):firstPointColor&&firstPointColor!==segmentColor?mixHexColor(firstPointColor,segmentColor):segmentColor,endBoundary=nextColor&&nextColor!==segmentColor?mixHexColor(segmentColor,nextColor):segmentColor;const stops=[`<stop offset="0" stop-color="${startBoundary}"/>`,startBoundary!==segmentColor?`<stop offset="${fade}" stop-color="${segmentColor}"/>`:'',endBoundary!==segmentColor?`<stop offset="${1-fade}" stop-color="${segmentColor}"/>`:'',`<stop offset="1" stop-color="${endBoundary}"/>`].join('');defs+=`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}">${stops}</linearGradient>`;const c1x=ax+dx*.36,c2x=bx-dx*.36;paths+=`<path d="M ${ax} ${ay} C ${c1x} ${ay}, ${c2x} ${by}, ${bx} ${by}" stroke="url(#${id})" class="chart-line" vector-effect="non-scaling-stroke"/>`;});points.forEach((p,i)=>{const before=segmentColors[i-1],after=segmentColors[i],color=before&&after&&before!==after?mixHexColor(before,after):after||before||progressColor(p.cls);dots+=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${x(p.time)}" cy="${y(p.value)}" r="4" fill="${color}"/>`;});}
  return`<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${grid}${paths}${dots}</svg></div>`;
}
function renderProgress(){
  const options=progressExerciseOptions();if(!options.some(x=>x.value===ui.progressExercise))ui.progressExercise=options[0]?.value||'';const selected=options.find(x=>x.value===ui.progressExercise),rows=selected?historyRows(selected.value):[],u=selected?getUserExercise(state,selected.userExerciseId):null,cardio=rows.some(r=>r.trackingMode===TrackingMode.CARDIO)||u?.trackingMode===TrackingMode.CARDIO,timed=!cardio&&(rows.some(r=>r.trackingMode===TrackingMode.TIME_ONLY)||u?.trackingMode===TrackingMode.TIME_ONLY),bodyweight=!cardio&&!timed&&(rows.some(r=>r.equipment===Equipment.BODYWEIGHT)||u?.equipment===Equipment.BODYWEIGHT),metrics=cardio?[...new Set([preferredCardioMetric(rows),'DURATION','DISTANCE','PACE','POWER','HEART_RATE','RPE','LOAD'])]:timed?['DURATION']:bodyweight?['REPS']:['WEIGHT','VOLUME','E1RM'];if(!metrics.includes(ui.progressMetric))ui.progressMetric=metrics[0];const start=rangeStartMs(),end=rangeEndMs(),points=buildChartPoints(rows,ui.progressMetric,start,end),visible=rows.filter(r=>r.sessionStartedAt>=start&&r.sessionStartedAt<=end&&r.completedSets>0),measuredVisible=visible.filter(r=>progressMetricValue(r,ui.progressMetric)!=null),first=measuredVisible[0]||null,current=measuredVisible.at(-1)||null,firstValue=first?progressMetricValue(first,ui.progressMetric):null,currentValue=current?progressMetricValue(current,ui.progressMetric):null,change=firstValue!=null&&currentValue!=null&&firstValue>0?(currentValue/firstValue-1)*100:null,metricLabel=ui.progressMetric==='E1RM'?'e1RM':ui.progressMetric==='HEART_RATE'?'Heart rate':ui.progressMetric[0]+ui.progressMetric.slice(1).toLowerCase(),metricText=v=>v==null?'—':ui.progressMetric==='REPS'?`${Math.round(v)} reps`:ui.progressMetric==='DURATION'?formatDuration(v*1000):ui.progressMetric==='DISTANCE'?`${Number(v).toFixed(2)} km`:ui.progressMetric==='PACE'?`${formatDuration(v*1000)}/km`:ui.progressMetric==='HEART_RATE'?`${Math.round(v)} bpm`:ui.progressMetric==='POWER'?`${Math.round(v)} W`:ui.progressMetric==='RPE'?`RPE ${Number(v).toFixed(1)}`:ui.progressMetric==='LOAD'?`${Math.round(v)} AU`:ui.progressMetric==='VOLUME'?formatKgRounded(v):formatKg(v),summary=`<div class="progress-summary"><div class="metric"><div class="metric-label">Current</div><div class="metric-value">${metricText(currentValue)}</div></div><div class="metric"><div class="metric-label">First</div><div class="metric-value">${metricText(firstValue)}</div></div>${cardio?'':`<div class="metric"><div class="metric-label">${metricLabel} progress</div><div class="metric-value">${fmtPct(change)}</div></div>`}</div>`;let c=`<h1>Progress</h1><div class="stack"><div><select aria-label="Period" onchange="gp.setProgressRange(this.value)"><option value="1m" ${ui.progressRange==='1m'?'selected':''}>1 month</option><option value="3m" ${ui.progressRange==='3m'?'selected':''}>3 months</option><option value="6m" ${ui.progressRange==='6m'?'selected':''}>6 months</option><option value="1y" ${ui.progressRange==='1y'?'selected':''}>1 year</option><option value="5y" ${ui.progressRange==='5y'?'selected':''}>5 years</option><option value="custom" ${ui.progressRange==='custom'?'selected':''}>Custom</option></select></div>${ui.progressRange==='custom'?`<div class="form-grid"><div><label class="field">From</label><input type="date" value="${ui.customStart}" onchange="gp.setCustomStart(this.value)"></div><div><label class="field">To</label><input type="date" value="${ui.customEnd}" onchange="gp.setCustomEnd(this.value)"></div></div>`:''}<div><select aria-label="Exercise" onchange="gp.setProgressExercise(this.value)">${options.map(o=>`<option value="${esc(o.value)}" ${o.value===ui.progressExercise?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div></div><div class="segmented progress-metrics" style="margin-top:12px">${metrics.map(m=>`<button class="${ui.progressMetric===m?'active':''}" onclick="gp.setProgressMetric('${m}')">${m==='E1RM'?'e1RM':m==='HEART_RATE'?'Heart rate':m[0]+m.slice(1).toLowerCase()}</button>`).join('')}</div>${summary}${cardio?'<p class="small">Cardio Progress is specific to this exercise, never mixed with lifting e1RM or volume. Duration × RPE measures training load, not fitness.</p>':''}${renderChart(points,ui.progressMetric)}`;if(cardio){
    const primary=preferredCardioMetric(rows),match=compareCardioAtMatchedEffort(rows,primary);
    if(match){const improved=match.changePct>=0,metricName=primary==='PACE'?'Pace':'Average power';
      c+=`<div class="card" style="margin-top:12px"><div class="title">Matched-effort comparison</div><div class="note">${metricName} ${improved?'improved':'decreased'} by ${Math.abs(match.changePct).toFixed(1)}% against a previous ${esc(selected?.label||'cardio exercise')} activity at similar recorded effort. Same exercise, RPE within 1 and distance/duration within 10–15%. Weather, terrain and fatigue can still affect the result.</div></div>`;
    }else c+=`<p class="small" style="margin-top:10px">For a matched-effort comparison, record RPE and distance or power on at least two similar activities of this exercise.</p>`;
  }
  const recent=rows.filter(r=>r.sessionStartedAt>=start&&r.sessionStartedAt<=end).slice().reverse().slice(0,12);if(recent.length){c+=`<div class="section-title">Recent</div>`;recent.forEach(r=>{const d=difficultyLevel(r.avgRir,r.actionableFailureCount,state.app_state,null,r.completedSets),primary=cardio?(r.totalDistanceKm>0?`${Number(r.totalDistanceKm).toFixed(2)} km · ${formatDuration(r.totalDurationSeconds*1000)}${r.sessionRpe?' · RPE '+Number(r.sessionRpe).toFixed(1):''}`:formatDuration(r.totalDurationSeconds*1000)+(r.sessionRpe?' · RPE '+Number(r.sessionRpe).toFixed(1):'')):timed?formatDuration(r.totalDurationSeconds*1000):bodyweight?`${r.maxReps} reps`:formatKg(r.maxWeight);c+=`<div class="card"><div class="row between"><strong>${dateOnly(r.sessionStartedAt)}</strong><span>${r.completedSets?primary:'Skipped'}</span></div>${r.completedSets&&!timed&&!cardio?`<div class="row between" style="margin-top:8px"><span class="small">${bodyweight?`Best set ${r.maxReps} reps`:`Volume ${formatKg(r.volume)}`}</span><span class="difficulty ${d.key}">${d.label}</span></div>`:''}</div>`;});}return shell(c);
}
function setProgressRange(v){ui.progressRange=v;if(v==='custom'&&!ui.customStart){const d=new Date();const e=d.toISOString().slice(0,10);d.setMonth(d.getMonth()-3);ui.customStart=d.toISOString().slice(0,10);ui.customEnd=e;}render();}function setProgressExercise(v){ui.progressExercise=v;render();}function setProgressMetric(v){ui.progressMetric=v;render();}function setCustomStart(v){ui.customStart=v;render();}function setCustomEnd(v){ui.customEnd=v;render();}

function currentActiveContext(){
  const rt=runtime(),s=rt?getSession(rt.sessionId):null;if(!rt||!s)return{};
  const exs=sessionExercises(state,s.id),e=exs[rt.currentExerciseIndex]||null,sets=e?exerciseSets(state,e.id):[],set=sets[rt.currentSetIndex]||null;
  return {rt,s,exs,e,sets,set};
}
function shouldRamp(e){if(!e)return false;if(e.equipment===Equipment.BARBELL&&Number(e.plannedWeightKg)<=20)return false;if(e.rampMode==='ALWAYS')return true;if(e.rampMode==='NEVER')return false;const lib=byKey(e.exerciseKey)||bestMatch(e.name);return lib?.automaticRampUp??(e.exerciseType!==ExerciseType.ISOLATION);}
function rampPlan(e){
  let base;try{base=JSON.parse(e.rampPlanJson||'[]')}catch{base=recommendRamp(e.plannedWeightKg,e.targetReps,e.exerciseType,e.exerciseKey,e.name)}
  if(hasPriorSimilarMovement(e)&&e.rampMode===RampMode.AUTO)return base.slice(-(e.exerciseType===ExerciseType.ISOLATION?1:Math.min(2,base.length)));
  return base.slice(0,Math.max(0,Number(state.app_state.maxRampUpSets??3)));
}
function currentRampMembers(){const {exs,e,set}=currentActiveContext();if(!e)return[];const info=set?supersetPairSetInfo(exs,e,set.setNumber):null;return info?.pair||[e];}
function rampMemberPlan(e){return shouldRamp(e)?rampPlan(e):[];}
function rampMembersNeedPrompt(members){return members.some(e=>e.rampEndedAt==null&&shouldRamp(e));}
function rampMemberHtml(e){const plan=rampMemberPlan(e),reduced=hasPriorSimilarMovement(e),load=e.equipment===Equipment.BODYWEIGHT?t('Bodyweight',languageCode(state)):formatKg(e.plannedWeightKg),working=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode)?`${load} · ${formatDuration(Number(e.targetSeconds||60)*1000)}`:`${load} × ${e.targetReps}`;return `<div class="card ramp-member-card">${reduced&&plan.length?`<div class="small ramp-support-copy">${esc(S('Shortened because a similar movement is already warm.','Saīsināts, jo līdzīga kustība jau ir iesildīta.'))}</div>`:''}<div class="ramp-list">${plan.length?plan.map((p,i)=>`<div class="ramp-line"><span class="ramp-index">${i+1}.</span><span class="ramp-primary">${formatKg(p.weightKg)} × ${p.reps}</span><span class="ramp-rest">${p.restSeconds}s</span></div>`).join(''):`<div class="small">${esc(S('No ramp-up needed.','Iesildīšanās piegājieni nav vajadzīgi.'))}</div>`}</div><div class="ramp-working-target"><strong>${working}</strong></div></div>`;}
function supersetSetContext(){
  const ctx=currentActiveContext();if(!ctx?.rt||!ctx.e||!ctx.set)return null;const info=supersetPairSetInfo(ctx.exs,ctx.e,ctx.set.setNumber);if(!info)return null;
  const lead=info.items[0];return {...ctx,...info,leadIndex:ctx.exs.findIndex(x=>x.id===lead.e.id)};
}
function supersetDisplayWeight(rt,item){return Number(rt.supersetWeights?.[item.e.id]??item.set.plannedWeightKg??item.e.plannedWeightKg??0);}
function supersetTimedState(rt,exerciseId){rt.supersetTimed=rt.supersetTimed||{};return rt.supersetTimed[exerciseId]||null;}
function supersetTimedElapsed(item,rt){const st=supersetTimedState(rt,item.e.id);if(st?.durationSeconds!=null)return Number(st.durationSeconds);if(st?.startedAt)return Math.max(0,Math.round((now()-Number(st.startedAt))/1000));return 0;}
function renderSupersetPulseItem(item,index,rt){const bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(item.e.equipment),timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode),weight=supersetDisplayWeight(rt,item),name=sessionDisplayName(item.e),st=supersetTimedState(rt,item.e.id),target=Math.max(1,Number(item.set.targetDurationSeconds||item.e.targetSeconds||60)),elapsed=supersetTimedElapsed(item,rt),remaining=Math.max(0,target-elapsed);return `<div class="superset-active-item"><div class="pulse-circle superset-pulse-circle ${index===0?'superset-red':'superset-blue'}"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div>${bodyweight?`<div class="pulse-target">${t('Bodyweight',languageCode(state))}</div>`:''}${timed?`<div class="pulse-reps-badge"><span class="${st?.startedAt?'live-superset-timed':''}" data-start="${st?.startedAt||''}" data-target="${target}">${formatDuration((st?.durationSeconds!=null?st.durationSeconds:remaining)*1000)}</span> TIME</div>`:`<div class="pulse-reps-badge"><span>${item.set.targetReps}</span> REPS</div>`}<div class="pulse-set">${item.set.setNumber}/${item.sets.length}</div></div></div>${bodyweight?'':`<div class="weight-control superset-weight-control"><button class="icon-btn" onclick="gp.adjustSupersetWeight(${item.e.id},-1)">−</button><div class="weight-value" onclick="gp.customSupersetWeight(${item.e.id})">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustSupersetWeight(${item.e.id},1)">+</button></div>`}${timed?`<button class="secondary full" onclick="gp.toggleSupersetTimed(${item.e.id})">${st?.durationSeconds!=null?'REDO TIMER':st?.startedAt?'FINISH TIMER':'START TIMER'}</button>`:''}</div>`;}
function renderSupersetEntry(rt){const entries=rt.supersetEntry||[],maxRir=Math.max(3,Math.min(5,state.app_state.rirInputMax||3));return `${restPanel(restRemaining(rt),false,false,false)}<div class="superset-entry-title">SUPERSET · ENTER BOTH SETS</div><div class="superset-entry-grid">${entries.map((entry,i)=>{const e=getSessionExercise(entry.exerciseId),set=getSet(entry.setId);if(entry.timed)return `<div class="card superset-entry-card ${i===0?'entry-red':'entry-blue'}"><div class="title">${esc(sessionDisplayName(e))}</div><div class="small">${set?.setNumber||1}/${e?.targetSets||1}</div><div class="section-title" style="text-align:center">Time</div><div class="entry-number">${formatDuration(Number(entry.durationSeconds||0)*1000)}</div>${e?.equipment!==Equipment.BODYWEIGHT?`<div class="small" style="text-align:center">${formatKg(entry.weight)}</div>`:''}</div>`;return `<div class="card superset-entry-card ${i===0?'entry-red':'entry-blue'}"><div class="title">${esc(sessionDisplayName(e))}</div><div class="small">${set?.setNumber||1}/${e?.targetSets||1}</div><div class="section-title" style="text-align:center">Reps</div><div class="row center"><button class="icon-btn" onclick="gp.adjustSupersetEntryReps(${i},-1)">−</button><div class="entry-number">${entry.reps}</div><button class="icon-btn" onclick="gp.adjustSupersetEntryReps(${i},1)">+</button></div><div class="rir-heading">RIR · target ${state.app_state.targetRirMin}–${state.app_state.targetRirMax}</div><div class="rir-row compact-rir"><button class="secondary failure-btn ${entry.failure?'active':''}" onclick="gp.setSupersetRir(${i},'failure')">Failure</button>${Array.from({length:maxRir+1},(_,v)=>`<button class="secondary ${!entry.failure&&entry.rir===v?'active':''}" onclick="gp.setSupersetRir(${i},${v})">${v===maxRir?`${maxRir}+`:v}</button>`).join('')}</div></div>`;}).join('')}</div><div id="superset-rir-required" class="rir-required-note">Choose RIR or Failure for each rep-based exercise before saving.</div><button class="full" style="margin-top:20px" onclick="gp.saveSupersetSet()">SAVE SUPERSET</button>`;}
function renderActive(){
  const {rt,s,e,sets,set}=currentActiveContext();if(!rt||!s)return shell(`<div class="empty">No active workout.</div>`,{navBar:false});
  const canUndo=state.performed_sets.some(x=>sessionExercises(state,s.id).some(e=>e.id===x.sessionExerciseId)&&x.status==='COMPLETE'),finalPhase=rt.phase==='FINAL';
  const ctx=currentActiveContext(),header=simpleActiveHeaderState(ctx),statusText=`${header.stage||''}${header.next?`${header.stage?' • ':''}${S('Next:','Tālāk:')} ${header.next}`:''}`,progress=Math.round(workoutProgressFraction()*1000)/10,top=`<div class="topbar active-workout-topbar"><button class="icon-btn" onclick="gp.nav('home')" aria-label="Back to Home">‹</button><div class="topbar-title active-workout-context"><span class="active-workout-name">${esc(s.workoutName)}</span><span class="active-workout-line"><span class="small live-session-time active-workout-static" data-start="${s.startedAt}">${formatDuration(syncedElapsed(s.startedAt))}</span>${statusText?`<span class="active-workout-static active-stage-static">${esc(statusText)}</span>`:''}</span></div>${!finalPhase&&canUndo?`<button class="icon-btn undo-last-set" onclick="gp.undoLastSet()" aria-label="Undo last set"><img src="./icons/undo-arrow.png" alt=""></button>`:''}${!finalPhase?`<button class="icon-btn" onclick="gp.requestAbort()">×</button>`:''}</div><div class="workout-progress-track" aria-hidden="true"><div class="workout-progress-fill" style="width:${progress}%"></div></div>`;
  let c='';
  if(rt.phase==='WARMUP')c=phasePanel('WARM-UP',rt.phaseStartedAt,'Finish warm-up','gp.finishWarmup(false)','gp.finishWarmup(true)');
  else if(rt.phase==='RAMP_PROMPT'){
    const members=currentRampMembers(),isPair=members.length===2;c=`<div class="ramp-heading"><h2>${esc(isPair?S('Superset ramp-up','Superseta iesildīšanās'):sessionDisplayName(members[0]))}</h2>${isPair?`<div class="small">${esc(S('One ramp-up flow prepares both exercises.','Viena iesildīšanās secība sagatavo abus vingrinājumus.'))}</div>`:''}</div><div class="section-title">${esc(S('Suggested ramp-up','Ieteiktā iesildīšanās'))}</div>${members.map(rampMemberHtml).join('')}<div class="row" style="margin-top:20px"><button class="secondary grow" onclick="gp.disableRampPermanently()">${esc(S('Remove','Noņemt'))}</button><button class="secondary grow" onclick="gp.skipRamp()">${esc(S('Skip','Izlaist'))}</button><button class="grow" onclick="gp.startRamp()">${esc(S('Start','Sākt'))}</button></div>`;
  }else if(rt.phase==='RAMP_ACTIVE'){
    const members=currentRampMembers(),isPair=members.length===2;c=`<div class="timer-panel focus"><div class="timer-label">${esc(isPair?S('SUPERSET RAMP-UP','SUPERSETA IESILDĪŠANĀS'):S('RAMP-UP','IESILDĪŠANĀS'))}</div><div class="countup live-countup" data-start="${rt.phaseStartedAt}">${formatDuration(syncedElapsed(rt.phaseStartedAt))}</div></div>${members.map(rampMemberHtml).join('')}${renderNextInfo()}<button class="full" style="margin-top:18px" onclick="gp.finishRamp(false)">${esc(S('Finish ramp-up','Pabeigt iesildīšanos'))}</button>`;
  }else if(rt.phase==='SET'){
    const superCtx=supersetSetContext();if(superCtx){if(!rt.supersetWeights)rt.supersetWeights={};c=`<div class="superset-active-heading">SUPERSET</div><div class="superset-pulse-grid">${superCtx.items.map((item,i)=>renderSupersetPulseItem(item,i,rt)).join('')}</div><div class="superset-current-info"><span>SUPERSET</span>${superCtx.items.map(item=>`<strong>${nextPrescriptionHtml(item.e,item.set)}</strong>`).join('')}</div><button class="full superset-complete-btn" onclick="gp.supersetComplete()">SUPERSET COMPLETE</button><div class="row center" style="margin-top:10px"><button class="ghost small-btn" onclick="gp.skipSupersetSet()">Skip superset set</button><button class="ghost small-btn" onclick="gp.skipSuperset()">Skip superset</button></div>`;}else{
      const weight=Number(rt.workingWeight??set?.plannedWeightKg??e?.plannedWeightKg??0),bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e.equipment),timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode),name=sessionDisplayName(e);if(timed)c=`<div class="pulse-wrap"><div class="pulse-circle"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div><div class="pulse-target">${formatDuration(Number(set.targetDurationSeconds||e.targetSeconds||60)*1000)}</div><div class="pulse-reps-badge">TIME</div><div class="pulse-set">${set.setNumber}/${sets.length}</div></div></div></div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}${exerciseActionButtons()}<button class="full" style="margin-top:24px" onclick="gp.startTimedSet()">${e.trackingMode===TrackingMode.CARDIO?"START CARDIO":"START TIMED SET"}</button><div class="row center" style="margin-top:10px"><button class="ghost small-btn" onclick="gp.skipSet()">Skip set</button></div>`;else c=`<div class="pulse-wrap"><div class="pulse-circle"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div>${bodyweight?`<div class="pulse-target">${t('Bodyweight',languageCode(state))}</div>`:''}<div class="pulse-reps-badge"><span>${set.targetReps}</span> REPS</div><div class="pulse-set ${ui.setStatusMessage?'set-status-flash':''}">${ui.setStatusMessage?esc(ui.setStatusMessage):`${set.setNumber}/${sets.length}`}</div></div></div></div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}${exerciseActionButtons()}<button class="full" style="margin-top:24px" onclick="gp.setComplete()">SET COMPLETE</button><div class="row center" style="margin-top:10px"><button class="ghost small-btn" onclick="gp.skipSet()">Skip set</button></div>`;
    }
  }else if(rt.phase==='TIMED_SET'){const target=Number(set?.targetDurationSeconds||e?.targetSeconds||60),elapsed=Math.floor((now()-rt.phaseStartedAt)/1000),rem=Math.max(0,target-elapsed),bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e?.equipment),weight=Number(rt.workingWeight??set?.plannedWeightKg??e?.plannedWeightKg??0);c=`<div class="timer-panel focus"><div class="timer-label">${esc(sessionDisplayName(e))}${e.trackingMode===TrackingMode.CARDIO?'':' · '+(set?.setNumber||1)+'/'+sets.length}</div><div class="timer ${e.trackingMode===TrackingMode.CARDIO?'live-countup':'live-timed-set'}" data-start="${rt.phaseStartedAt}" data-target="${target}">${formatDuration((e.trackingMode===TrackingMode.CARDIO?elapsed:rem)*1000)}</div>${e.trackingMode===TrackingMode.CARDIO?`<div class="small">Target ${formatDuration(target*1000)} · finish whenever you are done</div>`:''}</div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}<button class="full" onclick="gp.finishTimedSet()">${e.trackingMode===TrackingMode.CARDIO?"FINISH CARDIO":"DONE"}</button>`;}
  else if(rt.phase==='SUPERSET_ENTRY')c=renderSupersetEntry(rt);
  else if(rt.phase==='ENTRY'){const remaining=restRemaining(rt),maxRir=Math.max(3,Math.min(5,state.app_state.rirInputMax||3));c=`${restPanel(remaining,false,false,false)}<div class="section-title" style="text-align:center">Reps</div><div class="row center"><button class="icon-btn" onclick="gp.adjustEntryReps(-1)">−</button><div class="entry-number">${rt.entry.reps}</div><button class="icon-btn" onclick="gp.adjustEntryReps(1)">+</button></div><div class="rir-heading">RIR · target ${state.app_state.targetRirMin}–${state.app_state.targetRirMax}</div><div id="rir-choice-wrap" class="rir-choice-wrap"><div class="rir-row"><button class="secondary failure-btn ${rt.entry.failure?'active':''}" onclick="gp.setRir('failure')">Failure</button>${Array.from({length:maxRir+1},(_,v)=>`<button class="secondary ${!rt.entry.failure&&rt.entry.rir===v?'active':''}" onclick="gp.setRir(${v})">${v===maxRir?`${maxRir}+`:v}</button>`).join('')}</div><div id="rir-required-notice" class="rir-required-note">Choose RIR or Failure before saving.</div></div><button class="full" style="margin-top:20px" onclick="gp.saveSet()">Save set</button>`;}
  else if(rt.phase==='REST'){c=restPanel(restRemaining(rt),true,ui.restExpand)+(rt.nextAction?.type==='EXERCISE'?exerciseActionButtons({showLater:true}):'');ui.restExpand=false;}
  else if(rt.phase==='UNLOAD')c=phasePanel('REMOVE WEIGHTS',rt.phaseStartedAt,'Done','gp.finishUnload(false)','gp.finishUnload(true)',e?.name||'');
  else if(rt.phase==='STRETCH')c=phasePanel('STRETCHING',rt.phaseStartedAt,'Finish stretching','gp.finishStretch(false)','gp.finishStretch(true)');
  else if(rt.phase==='FINAL')c=`<div class="final-workout"><div class="workout-complete-title">${esc(S('WORKOUT COMPLETE','TRENIŅŠ PABEIGTS'))}</div><div class="note">${esc(S('Private workout comment for Logs (optional).','Treniņa komentārs žurnālam (nav obligāts).'))}</div><label class="field">${esc(S('Workout comment','Treniņa komentārs'))}</label><textarea id="f-workout-note" autocapitalize="sentences" maxlength="2000" rows="4" placeholder="${esc(S('Optional private log note','Komentārs žurnālam (nav obligāts)'))}">${esc(getSession(rt.sessionId)?.note||'')}</textarea><button class="full final-save" onclick="gp.finishAndSave()">FINISH & SAVE</button></div>`;
  return shell(c,{topbar:top,navBar:false});
}
function phasePanel(title,startedAt,primary,onPrimary,onSkip,subtitle=''){return `<div class="timer-panel focus"><div class="timer-label">${esc(title)}</div>${subtitle?`<div class="title" style="margin-top:6px">${esc(subtitle)}</div>`:''}<div class="countup live-countup" data-start="${startedAt}">${formatDuration(syncedElapsed(startedAt))}</div></div><div class="row"><button class="secondary grow" onclick="${onSkip}">Skip</button><button class="grow" onclick="${onPrimary}">${esc(primary)}</button></div>`;}
function restRemaining(rt){if(!rt.rest)return 0;return Math.max(0,rt.rest.endsAt-now());}
function restPanel(rem,focus,animate=false,allowSkip=true){const rt=runtime();if(!rt?.rest)return'';const ends=rt.rest.endsAt;return `<div class="timer-panel ${focus?'focus':''} ${animate?'rest-expand':''}"><div class="timer-label">REST</div><div class="timer live-rest-time" data-ends="${ends}">${formatDuration(rem)}</div>${renderNextInfo()}<div class="row center"><button class="secondary small-btn" onclick="gp.shiftRest(-30)">−30 s</button>${allowSkip?`<button class="ghost small-btn" onclick="gp.skipRest()">${esc(S('Skip','Izlaist'))}</button>`:''}<button class="secondary small-btn" onclick="gp.shiftRest(30)">+30 s</button></div></div>`;}
function bindActiveHeaderMarquee(){
  const viewport=document.querySelector('.active-workout-marquee');
  const inner=viewport?.querySelector('.active-workout-marquee-inner');
  if(!viewport||!inner)return;
  const update=()=>{
    const overflow=Math.max(0,inner.scrollWidth-viewport.clientWidth);
    viewport.classList.toggle('overflowing',overflow>4);
    inner.style.setProperty('--active-marquee-shift',`${overflow}px`);
    inner.style.setProperty('--active-marquee-duration',`${Math.max(7,Math.min(18,7+overflow/30)).toFixed(1)}s`);
  };
  requestAnimationFrame(update);
}
function afterActiveRender(){if(state.app_state.keepScreenAwake)requestWakeLock();}
async function finishWarmup(skipped){const {rt,s,e}=currentActiveContext(),t=now();s.warmupEndedAt=t;s.warmupSkipped=!!skipped;rt.phaseStartedAt=t;await persist();enterExercise(0,true);}
async function enterExercise(index,isFirst=false){const {rt,s,exs}=currentActiveContext();const e=exs[index];if(!e){beginStretch();return;}rt.currentExerciseIndex=index;rt.currentSetIndex=Math.max(0,exerciseSets(state,e.id).findIndex(x=>x.status==='PENDING'));rt.workingWeight=e.plannedWeightKg;rt.phaseStartedAt=now();rt.entry=null;rt.rest=null;rt.nextAction=null;const set=exerciseSets(state,e.id)[rt.currentSetIndex],info=set?supersetPairSetInfo(exs,e,set.setNumber):null,members=info?.pair||[e];if(rampMembersNeedPrompt(members)){rt.phase='RAMP_PROMPT';}else{const t=now();members.forEach(m=>{if(m.rampEndedAt==null){m.rampSkipped=true;m.rampEndedAt=t;}m.startedAt=m.startedAt||t;m.status='ACTIVE';});rt.phase='SET';rt.reminderStartedAt=t;}await persist();render();}
async function startRamp(){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.startedAt=e.startedAt||t;e.status='ACTIVE';e.rampStartedAt=e.rampStartedAt||t;e.rampSkipped=false;});rt.phase='RAMP_ACTIVE';rt.phaseStartedAt=t;await persist();render();}
async function skipRamp(){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.startedAt=e.startedAt||t;e.status='ACTIVE';e.rampEndedAt=t;e.rampSkipped=true;});rt.phase='SET';rt.phaseStartedAt=t;rt.reminderStartedAt=t;await persist();render();}
function disableRampPermanently(){const members=currentRampMembers();if(!members.length)return;confirmDialog('Remove ramp-up?',`Ramp-up will be removed for this programme occurrence${members.length===2?' pair':''} until you enable it again in Programme settings.`,'Remove',async()=>{members.forEach(e=>{const te=state.template_exercises.find(x=>x.id===e.templateExerciseId);if(te)te.rampMode=RampMode.NEVER;e.rampMode=RampMode.NEVER;});closeDialog();await skipRamp();},true);}
async function startTimedSet(){const {rt,e,set}=currentActiveContext();if(!set)return;void enableAudio();const t=now();e.startedAt=e.startedAt||t;e.status='ACTIVE';rt.phase='TIMED_SET';rt.phaseStartedAt=t;rt.reminderStartedAt=null;await persist();render();}
async function finishTimedSet(){
  const {rt,e,set}=currentActiveContext();if(!set)return;
  const elapsed=Math.max(1,Math.round((now()-rt.phaseStartedAt)/1000));
  if(e.trackingMode===TrackingMode.CARDIO){
    if(window.__gpCardioDuration)return;
    window.__gpCardioDuration=elapsed;
    openDialog(`<h2>${esc(S('Record cardio activity','Reģistrēt kardio aktivitāti'))}</h2><div class="small">Duration ${formatDuration(elapsed*1000)}</div><div class="form-grid"><div><label class="field">Distance (km), optional</label><input id="cardio-distance" type="number" min="0" step="any" inputmode="decimal"></div><div><label class="field">Average HR (bpm), optional</label><input id="cardio-hr" type="number" min="30" max="240"></div><div><label class="field">Average power (W), optional</label><input id="cardio-power" type="number" min="1"></div><div><label class="field">RPE (1–10), optional</label><input id="cardio-rpe" type="number" min="1" max="10"></div></div><p class="small">No artificial cardio progress percentage. Performance comparisons are based on comparable distance, pace or power.</p><div class="dialog-actions"><button class="secondary" onclick="gp.cancelCardioSet()">Back</button><button onclick="gp.saveCardioSet()">Save activity</button></div>`);
    return;
  }
  return completeTimedWorkoutSet(elapsed);
}
function cancelCardioSet(){window.__gpCardioDuration=null;closeDialog();}
async function saveCardioSet(){
  const duration=Number(window.__gpCardioDuration||0);if(!(duration>0))return;
  const distText=$('#cardio-distance')?.value?.trim()||'',hrText=$('#cardio-hr')?.value?.trim()||'',powText=$('#cardio-power')?.value?.trim()||'',rpeText=$('#cardio-rpe')?.value?.trim()||'';
  const distanceKm=distText===''?null:Number(distText),averageHeartRateBpm=hrText===''?null:Number(hrText),averagePowerWatts=powText===''?null:Number(powText),sessionRpe=rpeText===''?null:Number(rpeText);
  if((distanceKm!=null&&(!Number.isFinite(distanceKm)||distanceKm<0))||(averageHeartRateBpm!=null&&(!Number.isInteger(averageHeartRateBpm)||averageHeartRateBpm<30||averageHeartRateBpm>240))||(averagePowerWatts!=null&&(!Number.isInteger(averagePowerWatts)||averagePowerWatts<1||averagePowerWatts>2500))||(sessionRpe!=null&&(!Number.isInteger(sessionRpe)||sessionRpe<1||sessionRpe>10))){toast('Check the cardio values');return;}
  closeDialog();window.__gpCardioDuration=null;
  return completeTimedWorkoutSet(duration,{distanceKm,averageHeartRateBpm,averagePowerWatts,sessionRpe});
}
async function completeTimedWorkoutSet(elapsed,cardio={}){const {rt,exs,e,sets,set}=currentActiveContext();if(!set)return;const t=now();Object.assign(set,cardio);set.actualDurationSeconds=elapsed;set.actualReps=0;set.actualWeightKg=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e.equipment)?0:Math.max(0,Number(rt.workingWeight??set.plannedWeightKg??e.plannedWeightKg??0));set.rir=null;set.failure=false;set.status='COMPLETE';set.completedAt=t;const pending=sets.findIndex(x=>x.status==='PENDING'),done=pending<0;if(done){e.endedAt=t;e.status='COMPLETE';e.progressionOffered=false;}rt.nextAction=done?nextActionAfterExercise(exs,e):{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:pending};rt.rest={setId:set.id,startedAt:t,endsAt:t+set.plannedRestSeconds*1000,plannedSeconds:set.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='REST';rt.phaseStartedAt=t;await persist();await settleRestOrRender();if(done)queuePostSetPrompts([{type:'note',e}]);}
async function finishRamp(skipped=false){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.rampStartedAt=e.rampStartedAt||t;e.rampEndedAt=t;e.rampSkipped=!!skipped;e.startedAt=e.startedAt||t;e.status='ACTIVE';});const restSeconds=Math.max(0,...members.map(e=>Number(rampMemberPlan(e).at(-1)?.restSeconds??e.plannedRestSeconds??0)));rt.nextAction={type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:rt.currentSetIndex};rt.rest={setId:null,startedAt:t,endsAt:t+restSeconds*1000,plannedSeconds:restSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='REST';rt.phaseStartedAt=t;await persist();await settleRestOrRender();}
async function adjustWeight(direction){const {rt,e}=currentActiveContext();rt.workingWeight=stepSelectable(Number(rt.workingWeight)||0,Number(direction),e?.equipment||Equipment.OTHER);await persist();render();}
function customWeight(){const rt=runtime();formDialog('Working weight',`<label class="field">kg</label><input id="f-weight-custom" type="number" step="${gradingIncrement(currentActiveContext().e?.equipment||Equipment.OTHER)}" min="0" value="${Number(rt.workingWeight||0)}">`,'Set',async()=>{const {e}=currentActiveContext();rt.workingWeight=([Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e?.equipment)?0:Math.max(0,Number($('#f-weight-custom').value)||0));await persist();closeDialog();render();});}
async function adjustSupersetWeight(exerciseId,direction){const rt=runtime(),e=getSessionExercise(Number(exerciseId));if(!rt||!e)return;rt.supersetWeights=rt.supersetWeights||{};const current=Number(rt.supersetWeights[e.id]??exerciseSets(state,e.id).find(x=>x.status==='PENDING')?.plannedWeightKg??e.plannedWeightKg??0);rt.supersetWeights[e.id]=stepSelectable(current,Number(direction),e.equipment||Equipment.OTHER);await persist();render();}
function customSupersetWeight(exerciseId){const rt=runtime(),e=getSessionExercise(Number(exerciseId));if(!rt||!e)return;rt.supersetWeights=rt.supersetWeights||{};const current=Number(rt.supersetWeights[e.id]??exerciseSets(state,e.id).find(x=>x.status==='PENDING')?.plannedWeightKg??e.plannedWeightKg??0);formDialog('Working weight',`<label class="field">kg</label><input id="f-super-weight" type="number" step="${gradingIncrement(e.equipment||Equipment.OTHER)}" min="0" value="${current}">`,'Set',async()=>{rt.supersetWeights[e.id]=(e.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number($('#f-super-weight').value)||0));await persist();closeDialog();render();});}
async function toggleSupersetTimed(exerciseId){const ctx=supersetSetContext(),rt=ctx?.rt,e=getSessionExercise(Number(exerciseId));if(!ctx||!e||![TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode))return;await enableAudio();rt.supersetTimed=rt.supersetTimed||{};const st=rt.supersetTimed[e.id];if(st?.durationSeconds!=null){rt.supersetTimed[e.id]={startedAt:now(),durationSeconds:null};}else if(st?.startedAt){rt.supersetTimed[e.id]={startedAt:null,durationSeconds:Math.max(1,Math.round((now()-Number(st.startedAt))/1000))};beepPattern('ready');}else rt.supersetTimed[e.id]={startedAt:now(),durationSeconds:null};await persist();render();}
async function supersetComplete(){const ctx=supersetSetContext();if(!ctx)return;await enableAudio();const rt=ctx.rt,t=now();rt.supersetWeights=rt.supersetWeights||{};const timedMissing=ctx.items.filter(item=>[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode)&&supersetTimedState(rt,item.e.id)?.durationSeconds==null);if(timedMissing.length){toast(S('Finish each timed component first.','Vispirms pabeidz katru laika komponenti.'));return;}rt.supersetEntry=ctx.items.map(item=>{const timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode);return{exerciseId:item.e.id,setId:item.set.id,timed,reps:timed?0:item.set.targetReps,durationSeconds:timed?Number(supersetTimedState(rt,item.e.id)?.durationSeconds||0):null,rir:null,failure:false,weight:supersetDisplayWeight(rt,item)};});const restSeconds=Math.max(...ctx.items.map(x=>Number(x.set.plannedRestSeconds)||0),0);rt.rest={setId:ctx.items.at(-1).set.id,setIds:ctx.items.map(x=>x.set.id),startedAt:t,endsAt:t+restSeconds*1000,plannedSeconds:restSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='SUPERSET_ENTRY';rt.phaseStartedAt=t;await persist();render();}
async function adjustSupersetEntryReps(index,d){const rt=runtime(),entry=rt?.supersetEntry?.[Number(index)];if(!entry)return;entry.reps=Math.max(0,Number(entry.reps||0)+Number(d));await persist();render();}
async function setSupersetRir(index,v){const rt=runtime(),entry=rt?.supersetEntry?.[Number(index)];if(!entry)return;if(v==='failure'){entry.failure=true;entry.rir=null;}else{entry.failure=false;entry.rir=Number(v);}await persist();render();}
function nextActionAfterSuperset(exs,pair,setNumber){const items=pair.map(e=>({e,sets:exerciseSets(state,e.id)})),pending=items.map(x=>x.sets.find(s=>s.status==='PENDING')).filter(Boolean);if(pending.length===2&&pending[0].setNumber===pending[1].setNumber){const lead=items[0],idx=exs.findIndex(x=>x.id===lead.e.id),si=lead.sets.findIndex(x=>x.id===pending[0].id);return{type:'SUPERSET',exerciseIndex:idx,setIndex:si};}if(pending.length){const p=pending[0],ex=getSessionExercise(p.sessionExerciseId),idx=exs.findIndex(x=>x.id===ex.id),si=exerciseSets(state,ex.id).findIndex(x=>x.id===p.id);return{type:'SET',exerciseIndex:idx,setIndex:si};}const last=pair.slice().sort((a,b)=>a.position-b.position).at(-1),i=exs.findIndex(x=>x.id===last.id);return nextPendingExerciseAction(exs,i+1);}
function showExerciseNotePrompt(e){if(!e){continuePostSetQueue();return;}window.__gpExerciseNote=e;openDialog(`<h2>${esc(S('Exercise comment','Vingrinājuma komentārs'))}</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><label class="field">${esc(S('Optional comment','Komentārs (nav obligāts)'))}</label><textarea id="f-exercise-note" autocapitalize="sentences" maxlength="500" rows="4" placeholder="${esc(S('Anything specific to this exercise?','Kas īpašs par šo vingrinājumu?'))}">${esc(e.note||'')}</textarea><div class="dialog-actions"><button class="secondary" onclick="gp.skipExerciseNote()">${esc(S('Skip','Izlaist'))}</button><button onclick="gp.saveExerciseNote()">${esc(S('Save','Saglabāt'))}</button></div>`);}
async function saveExerciseNote(){const e=window.__gpExerciseNote;if(e){e.note=String($('#f-exercise-note')?.value||'').trim().slice(0,500);await persist();}window.__gpExerciseNote=null;closeDialog();render();continuePostSetQueue();}
function skipExerciseNote(){window.__gpExerciseNote=null;closeDialog();continuePostSetQueue();}
function queuePostSetPrompts(items){if(!items?.length)return;window.__gpPostSetQueue=[...(window.__gpPostSetQueue||[]),...items];setTimeout(showNextPostSetPrompt,80);}
function showNextPostSetPrompt(){if(document.querySelector('.dialog-backdrop')||window.__gpAdvice||window.__gpProgressionExercise||window.__gpFutureAdjustment)return;const q=window.__gpPostSetQueue||[],item=q.shift();window.__gpPostSetQueue=q;if(!item)return;if(item.type==='note')showExerciseNotePrompt(item.e);else if(item.type==='autoreg')showAutoregulationAdvice(item.advice);else if(item.type==='future')showFutureAdjustment(item.e,item.advice);else if(item.type==='rep')offerRepProgression(item.e,item.nextReps);else if(item.type==='progress')offerProgression(item.e,item.base,item.nextWeight,item.minRir);}
function continuePostSetQueue(){if((window.__gpPostSetQueue||[]).length)setTimeout(showNextPostSetPrompt,60);}
async function saveSupersetSet(){const rt=runtime(),ctx=supersetSetContext(),entries=rt?.supersetEntry||[];if(!ctx||entries.length!==2)return;if(entries.some(x=>!x.timed&&!x.failure&&x.rir==null)){const note=$('#superset-rir-required');note?.classList.add('show');setTimeout(()=>note?.classList.remove('show'),INFO_MESSAGE_MS);return;}const t=now(),prompts=[],notes=[];for(const entry of entries){const e=getSessionExercise(entry.exerciseId),sets=exerciseSets(state,e.id),set=getSet(entry.setId);if(!e||!set)continue;set.actualWeightKg=e.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number(entry.weight)||0);set.status='COMPLETE';set.completedAt=t;e.startedAt=e.startedAt||t;e.status='ACTIVE';if(entry.timed){set.actualDurationSeconds=Math.max(1,Number(entry.durationSeconds)||1);set.actualReps=0;set.rir=null;set.failure=false;e.progressionOffered=false;}else{set.actualDurationSeconds=null;set.actualReps=entry.reps;set.rir=entry.failure?null:entry.rir;set.failure=!!entry.failure;const raw=evaluateAutoregulation(set,sets,state.app_state,e);if(raw)prompts.push({type:'autoreg',advice:{...raw,suggestedWeightKg:snapSelectable(raw.suggestedWeightKg,e.equipment||Equipment.OTHER)}});}const done=sets.every(x=>x.status!=='PENDING');if(done){notes.push({type:'note',e});e.endedAt=t;e.status='COMPLETE';if(entry.timed)e.progressionOffered=false;else{e.progressionOffered=progressionQualifies(e,sets);if(e.progressionOffered){if(e.equipment===Equipment.BODYWEIGHT)prompts.push({type:'rep',e,nextReps:e.targetReps+1});else{const base=Math.min(...sets.filter(x=>x.status==='COMPLETE').map(x=>Number(x.actualWeightKg)||0)),minRir=progressionMinRir(sets);prompts.push({type:'progress',e,base,minRir,nextWeight:suggestedNextWeight(base,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minRir,state.app_state.targetRirMax)});}}else{const future=evaluateFutureAdjustment(e,sets,state.app_state);if(future)prompts.push({type:'future',e,advice:future});}}}}
  rt.nextAction=nextActionAfterSuperset(ctx.exs,ctx.pair,ctx.set.setNumber);rt.supersetEntry=null;rt.supersetTimed={};rt.phase='REST';rt.phaseStartedAt=t;ui.restExpand=true;await persist();render();queuePostSetPrompts([...notes,...prompts]);
}
async function skipSupersetSet(){const ctx=supersetSetContext();if(!ctx)return;const t=now();ctx.items.forEach(x=>{x.set.status='SKIPPED';x.set.completedAt=t;});ctx.items.forEach(x=>{if(x.sets.every(s=>s.status!=='PENDING')){x.e.status='COMPLETE';x.e.endedAt=t;}});ctx.rt.nextAction=nextActionAfterSuperset(ctx.exs,ctx.pair,ctx.set.setNumber);ctx.rt.rest=null;ctx.rt.supersetEntry=null;ctx.rt.supersetTimed={};await persist();await afterRest();toast('Superset set skipped');}
function skipSuperset(){const ctx=supersetSetContext();if(!ctx)return;const names=ctx.pair.map(sessionDisplayName).join(' + ');confirmDialog(`Skip superset?`,`All remaining sets for ${names} will be marked skipped.`,'Skip superset',async()=>{closeDialog();const t=now();for(const e of ctx.pair){exerciseSets(state,e.id).filter(x=>x.status==='PENDING').forEach(x=>{x.status='SKIPPED';x.completedAt=t;});e.status='SKIPPED';e.endedAt=t;}const last=ctx.pair.at(-1),i=ctx.exs.findIndex(x=>x.id===last.id);ctx.rt.nextAction=nextPendingExerciseAction(ctx.exs,i+1);ctx.rt.rest=null;ctx.rt.supersetEntry=null;ctx.rt.supersetTimed={};await persist();await afterRest();queuePostSetPrompts(ctx.pair.map(e=>({type:'note',e})));toast('Superset skipped');},true);}
async function setComplete(){const {rt,set}=currentActiveContext();if(!set)return;await enableAudio();const t=now();rt.entry={setId:set.id,reps:set.targetReps,rir:null,failure:false,weight:Number(rt.workingWeight||set.plannedWeightKg),completedPressedAt:t};rt.rest={setId:set.id,startedAt:t,endsAt:t+set.plannedRestSeconds*1000,plannedSeconds:set.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='ENTRY';rt.phaseStartedAt=t;await persist();render();}
async function adjustEntryReps(d){const rt=runtime();rt.entry.reps=Math.max(0,Number(rt.entry.reps||0)+d);await persist();render();}
async function setRir(v){const rt=runtime();if(v==='failure'){rt.entry.failure=true;rt.entry.rir=null;}else{rt.entry.failure=false;rt.entry.rir=Number(v);}await persist();render();}
function progressionQualifies(e,sets){const done=sets.filter(s=>s.status==='COMPLETE');return done.length===Number(e.targetSets)&&!sets.some(s=>s.status==='SKIPPED')&&done.every(s=>progressionSetQualifies(e,s,state.app_state));}
function progressionMinRir(sets){const done=sets.filter(s=>s.status==='COMPLETE'&&!s.failure&&s.rir!=null);if(!done.length)return null;return Math.min(...done.map(s=>Number(s.rir)));}
async function saveSet(){
  const {rt,s,exs,e,sets,set}=currentActiveContext();const entry=rt.entry;if(!entry||set.id!==entry.setId)return;if(!entry.failure&&entry.rir==null){const wrap=$('#rir-choice-wrap'),notice=$('#rir-required-notice');if(wrap){wrap.classList.remove('rir-invalid');void wrap.offsetWidth;wrap.classList.add('rir-invalid');}if(notice)notice.classList.add('show');setTimeout(()=>{wrap?.classList.remove('rir-invalid');notice?.classList.remove('show');},INFO_MESSAGE_MS);return;}const t=now(),prompts=[];set.actualReps=entry.reps;set.rir=entry.failure?null:entry.rir;set.failure=!!entry.failure;set.actualWeightKg=e?.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number(entry.weight)||0);set.status='COMPLETE';set.completedAt=t;
  const rawAdvice=evaluateAutoregulation(set,sets,state.app_state,e);let advice=rawAdvice?{...rawAdvice,suggestedWeightKg:snapSelectable(rawAdvice.suggestedWeightKg,e?.equipment||Equipment.OTHER)}:null;if(advice)prompts.push({type:'autoreg',advice});
  rt.entry=null;const pendingSame=sets.findIndex(x=>x.status==='PENDING');const exerciseDone=pendingSame<0;
  let futureAdvice=null;
  if(exerciseDone){prompts.unshift({type:'note',e});e.endedAt=t;e.status='COMPLETE';e.progressionOffered=progressionQualifies(e,sets);if(e.progressionOffered){if(e.equipment===Equipment.BODYWEIGHT)prompts.push({type:'rep',e,nextReps:e.targetReps+1});else{const base=Math.min(...sets.filter(x=>x.status==='COMPLETE').map(x=>Number(x.actualWeightKg)||0)),minRir=progressionMinRir(sets);prompts.push({type:'progress',e,base,minRir,nextWeight:suggestedNextWeight(base,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minRir,state.app_state.targetRirMax)});}}else{futureAdvice=evaluateFutureAdjustment(e,sets,state.app_state);if(futureAdvice)prompts.push({type:'future',e,advice:futureAdvice});}}
  if(exerciseDone&&e.removeWeights){rt.deferredRestSetId=set.id;rt.rest=null;rt.phase='UNLOAD';rt.phaseStartedAt=t;e.unloadStartedAt=t;e.unloadSkipped=false;rt.nextAction=nextActionAfterExercise(exs,e);}
  else{const superAction=supersetPartnerAction(exs,e,set);if(superAction?.type==='SUPERSET_IMMEDIATE'){rt.nextAction=null;rt.currentExerciseIndex=superAction.exerciseIndex;rt.currentSetIndex=superAction.setIndex;const ctx=currentActiveContext();ctx.e.startedAt=ctx.e.startedAt||t;ctx.e.status='ACTIVE';rt.workingWeight=ctx.set?.plannedWeightKg??ctx.e.plannedWeightKg;rt.phase='SET';rt.phaseStartedAt=t;rt.reminderStartedAt=t;flashTransition(`SUPERSET · ${sessionDisplayName(ctx.e)}`);}else{rt.nextAction=superAction?.type==='SUPERSET_AFTER_REST'?{type:'SUPERSET',exerciseIndex:superAction.exerciseIndex,setIndex:superAction.setIndex}:exerciseDone?nextActionAfterExercise(exs,e):{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:pendingSame};rt.phase='REST';rt.phaseStartedAt=t;ui.restExpand=true;}}
  await persist();if(rt.phase==='REST'&&(!rt.rest||Number(rt.rest.endsAt)<=t))await settleRestOrRender();else render();queuePostSetPrompts(prompts);
}
function supersetPartnerAction(exs,e,set){if(!e?.supersetGroupId)return null;const i=exs.findIndex(x=>x.id===e.id),members=exs.filter(x=>x.supersetGroupId===e.supersetGroupId).sort((a,b)=>a.position-b.position);if(members.length!==2)return null;const mi=members.findIndex(x=>x.id===e.id),partner=members[(mi+1)%2],partnerIndex=exs.findIndex(x=>x.id===partner.id),partnerSet=exerciseSets(state,partner.id).find(x=>x.setNumber===set.setNumber&&x.status==='PENDING');if(mi===0&&partnerSet)return{type:'SUPERSET_IMMEDIATE',exerciseIndex:partnerIndex,setIndex:exerciseSets(state,partner.id).findIndex(x=>x.id===partnerSet.id)};if(mi===1){const first=members[0],nextSet=exerciseSets(state,first.id).find(x=>x.status==='PENDING');if(nextSet)return{type:'SUPERSET_AFTER_REST',exerciseIndex:exs.findIndex(x=>x.id===first.id),setIndex:exerciseSets(state,first.id).findIndex(x=>x.id===nextSet.id)};}return null;}
// Resolve the next target from live pending rows. Called after Later/Skip, without
// altering the rest clock or its originating set.
function nextPendingActivity(exs){return nextPendingExerciseAction(exs,0);}
function nextPendingExerciseAction(exs,startIndex){for(let i=Math.max(0,startIndex);i<exs.length;i++){if(exerciseSets(state,exs[i].id).some(x=>x.status==='PENDING'))return{type:'EXERCISE',exerciseIndex:i};}return{type:'STRETCH'};}
function nextActionAfterExercise(exs,e){const i=exs.findIndex(x=>x.id===e.id);return nextPendingExerciseAction(exs,i+1);}
function showFutureAdjustment(e,advice){
  window.__gpFutureAdjustment={exerciseId:e.id,advice};
  if(advice.kind==='REDUCE_REPS'){
    openDialog(`<h2>Make next time a little easier?</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="dialog-copy muted">${esc(advice.reason)}</div><div class="advice-next"><span>Suggested next target</span><strong>${esc(`${advice.suggestedReps} reps`)}</strong></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepFutureAdjustmentCurrent()">Keep current</button><button onclick="gp.applyFutureAdjustment()">Use next time</button></div>`);
    return;
  }
  const equipment=e.equipment||Equipment.OTHER,step=gradingIncrement(equipment),each=e.equipment===Equipment.DUMBBELL&&e.dumbbellLoad===DumbbellLoad.PAIR;
  const value=snapSelectable(Math.max(step,Number(advice.suggestedWeightKg)||step),equipment).toFixed(2);
  openDialog(`<h2>Make next time a little easier?</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="dialog-copy muted">${esc(advice.reason)}</div><div class="progression-edit future-adjustment-edit"><button class="icon-btn" onclick="gp.shiftFutureAdjustment(-1)">−</button><label><span class="field">Next working weight${each?' per dumbbell':''}</span><input id="f-future-weight" type="number" min="${step}" step="${step}" value="${value}"></label><button class="icon-btn" onclick="gp.shiftFutureAdjustment(1)">+</button></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepFutureAdjustmentCurrent()">Keep current</button><button onclick="gp.applyFutureAdjustment()">Use next time</button></div>`);
}
function shiftFutureAdjustment(direction){const item=window.__gpFutureAdjustment,input=$('#f-future-weight');if(!item||!input)return;const e=getSessionExercise(item.exerciseId);if(!e)return;const equipment=e.equipment||Equipment.OTHER;input.value=stepSelectable(Number(input.value)||gradingIncrement(equipment),Number(direction),equipment).toFixed(2);}
async function applyFutureAdjustment(){const item=window.__gpFutureAdjustment;if(!item)return;const e=getSessionExercise(item.exerciseId),te=e?.templateExerciseId!=null?state.template_exercises.find(x=>x.id===e.templateExerciseId):null;if(e){e.futureAdjustmentOffered=true;e.futureAdjustmentAccepted=true;}if(te){if(item.advice.kind==='REDUCE_REPS')te.reps=Math.max(1,Number(item.advice.suggestedReps||te.reps));else{const input=$('#f-future-weight'),equipment=te.equipment||Equipment.OTHER,step=gradingIncrement(equipment),edited=Math.max(step,Number(input?.value??item.advice.suggestedWeightKg??te.initialWeightKg)||step);te.initialWeightKg=equipment===Equipment.BODYWEIGHT?0:edited;}await persist();}window.__gpFutureAdjustment=null;closeDialog();render();continuePostSetQueue();}
async function keepFutureAdjustmentCurrent(){const item=window.__gpFutureAdjustment,e=item?getSessionExercise(item.exerciseId):null;if(e){e.futureAdjustmentOffered=true;e.futureAdjustmentAccepted=false;await persist();}window.__gpFutureAdjustment=null;closeDialog();continuePostSetQueue();}
function offerProgression(e,baseWeight,nextWeight,minCompletedRir=null){
  setTimeout(()=>{const suggestedStep=progressionIncrement(baseWeight,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minCompletedRir,state.app_state.targetRirMax),each=e.equipment===Equipment.DUMBBELL&&e.dumbbellLoad===DumbbellLoad.PAIR;window.__gpProgressionExercise=e;window.__gpProgressionBaseWeight=baseWeight;openDialog(`<h2>Ready to progress</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="muted">All required sets reached target reps with enough RIR and no failures.</div><div class="progression-edit"><button class="icon-btn" onclick="gp.shiftProgression(-1)">−</button><label><span class="field">Next working weight${each?' per dumbbell':''}</span><input id="f-progression-weight" type="number" min="0" step="${gradingIncrement(e.equipment||Equipment.OTHER)}" value="${Number(nextWeight).toFixed(2)}"></label><button class="icon-btn" onclick="gp.shiftProgression(1)">+</button></div><div class="small">Suggested increase: ${formatKg(suggestedStep)}${each?' per dumbbell':''}. The −/+ buttons use the smallest selectable equipment step.</div><div class="dialog-actions"><button class="secondary" onclick="gp.keepProgressionCurrent()">Keep current</button><button onclick="gp.acceptProgressionEdited()">Use next time</button></div>`);},20);
}
function shiftProgression(direction){const e=window.__gpProgressionExercise,input=$('#f-progression-weight');if(!e||!input)return;const step=gradingIncrement(e.equipment||Equipment.OTHER);input.value=snapSelectable(Math.max(0,(Number(input.value)||0)+Number(direction)*step),e.equipment||Equipment.OTHER).toFixed(2);}
async function acceptProgressionEdited(){const e=window.__gpProgressionExercise,input=$('#f-progression-weight');if(!e)return;const next=e.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number(input?.value)||e.plannedWeightKg);e.progressionAccepted=true;e.recommendation='PROGRESS';e.recommendationDecision='ACCEPTED';e.nextWeightKg=next;const te=state.template_exercises.find(x=>x.id===e.templateExerciseId);if(te)te.initialWeightKg=next;window.__gpProgressionExercise=null;window.__gpProgressionBaseWeight=null;await persist();closeDialog();render();continuePostSetQueue();}
function offerRepProgression(e,nextReps){setTimeout(()=>{window.__gpProgressionExercise=e;openDialog(`<h2>Ready to progress</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="muted">Bodyweight progression increases the rep target rather than adding kilograms.</div><div class="progression-edit rep-progression"><button class="icon-btn" onclick="gp.shiftProgressionReps(-1)">−</button><label><span class="field">Next target reps</span><input id="f-progression-reps" type="number" min="1" step="1" value="${Math.max(1,Number(nextReps)||1)}"></label><button class="icon-btn" onclick="gp.shiftProgressionReps(1)">+</button></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepProgressionCurrent()">Keep current</button><button onclick="gp.acceptProgressionReps()">Use next time</button></div>`);},20);}
function shiftProgressionReps(direction){const input=$('#f-progression-reps');if(input)input.value=Math.max(1,(Number(input.value)||1)+Number(direction));}
async function acceptProgressionReps(){const e=window.__gpProgressionExercise,input=$('#f-progression-reps');if(!e)return;const reps=Math.max(1,Math.round(Number(input?.value)||e.targetReps));e.progressionAccepted=true;e.recommendation='PROGRESS';e.recommendationDecision='ACCEPTED';e.nextReps=reps;const te=state.template_exercises.find(x=>x.id===e.templateExerciseId);if(te)te.reps=reps;window.__gpProgressionExercise=null;await persist();closeDialog();render();continuePostSetQueue();}
async function keepProgressionCurrent(){const e=window.__gpProgressionExercise;if(!e)return;e.progressionAccepted=false;e.recommendation='PROGRESS';e.recommendationDecision='DECLINED';e.nextWeightKg=null;e.nextReps=null;window.__gpProgressionExercise=null;window.__gpProgressionBaseWeight=null;await persist();closeDialog();render();continuePostSetQueue();}
async function finishUnload(skipped){const {rt,e}=currentActiveContext(),t=now();e.unloadEndedAt=t;e.unloadSkipped=!!skipped;const action=rt.nextAction,futureAdvice=rt.futureAdjustmentAdvice,futureExercise=futureAdvice?getSessionExercise(rt.futureAdjustmentExerciseId):null;rt.rest={setId:rt.deferredRestSetId??null,startedAt:t,endsAt:t+e.plannedRestSeconds*1000,plannedSeconds:e.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};delete rt.deferredRestSetId;delete rt.futureAdjustmentAdvice;delete rt.futureAdjustmentExerciseId;rt.phase='REST';rt.phaseStartedAt=t;rt.nextAction=action;await persist();await settleRestOrRender();if(futureAdvice&&futureExercise)setTimeout(()=>showFutureAdjustment(futureExercise,futureAdvice),80);}
async function shiftRest(seconds){const rt=runtime();if(!rt.rest)return;rt.rest.endsAt=Math.max(now(),rt.rest.endsAt+seconds*1000);rt.rest.plannedSeconds=Math.max(0,(rt.rest.endsAt-rt.rest.startedAt)/1000);rt.rest.warned30=false;await persist();render();}
async function skipRest(){const rt=runtime();if(!rt?.rest)return;if(rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY'){finalizeRest();await persist();render();return;}finalizeRest();await afterRest();}
function finalizeRest(){const rt=runtime();if(!rt?.rest)return;const seconds=Math.max(0,Math.round((now()-rt.rest.startedAt)/1000)),ids=Array.isArray(rt.rest.setIds)?rt.rest.setIds:[rt.rest.setId];ids.filter(Boolean).forEach(id=>{const set=getSet(id);if(set)set.actualRestSeconds=seconds;});rt.rest=null;}
async function settleRestOrRender(){const rt=runtime();if(!rt)return;if(rt.phase==='REST'&&(!rt.rest||Number(rt.rest.endsAt)<=now())){if(rt.rest)finalizeRest();await persist();await afterRest();return;}render();}
async function afterRest(){const rt=runtime(),action=rt.nextAction;rt.nextAction=null;if(!action){beginStretch();return;}if(action.type==='SET'){rt.currentSetIndex=action.setIndex;const {e,set}=currentActiveContext();const prev=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE').sort((a,b)=>b.setNumber-a.setNumber)[0];rt.workingWeight=set?.autoregulated?set.plannedWeightKg:(prev?.actualWeightKg??set?.plannedWeightKg??e.plannedWeightKg);rt.phase=hasPendingRamp(e)?'RAMP_PROMPT':'SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();await persist();render();return;}if(action.type==='SUPERSET'){rt.currentExerciseIndex=action.exerciseIndex;rt.currentSetIndex=action.setIndex;const {e,set}=currentActiveContext();e.startedAt=e.startedAt||now();e.status='ACTIVE';rt.workingWeight=set?.plannedWeightKg??e.plannedWeightKg;rt.supersetEntry=null;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();await persist();render();return;}if(action.type==='EXERCISE'){await enterExercise(action.exerciseIndex);return;}beginStretch();}
async function skipSet(){const {rt,exs,e,sets,set}=currentActiveContext();if(!set)return;const skippedNo=set.setNumber,total=sets.length;set.status='SKIPPED';set.completedAt=now();const next=sets.findIndex(x=>x.status==='PENDING');if(next>=0){rt.currentSetIndex=next;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();ui.setStatusMessage=`${skippedNo}/${total} ${S('SKIPPED','IZLAISTS')}`;await persist();render();setTimeout(()=>{if(ui.setStatusMessage){ui.setStatusMessage=null;render();}},INFO_MESSAGE_MS);return;}e.status='COMPLETE';e.endedAt=now();const action=nextActionAfterExercise(exs,e);if(e.removeWeights){e.unloadStartedAt=now();rt.phase='UNLOAD';rt.phaseStartedAt=now();rt.nextAction=action;}else{rt.nextAction=action;rt.rest={setId:null,startedAt:now(),endsAt:now()+e.plannedRestSeconds*1000,plannedSeconds:e.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='REST';}await persist();ui.setStatusMessage=null;render();}
function nextPostponableExercise(){const {exs,e}=currentActiveContext();if(!e||e.supersetGroupId)return null;const i=exs.findIndex(x=>x.id===e.id);return exs.slice(i+1).find(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'))||null;}
// SQL-backed relationships are cached locally for offline use; only the current session is altered.
// True equivalents rank above close alternatives even when the latter have weight history.
// On first offline use, the bundled relationship catalogue is the fallback.
function replacementExerciseTarget(){
  const rt=runtime();if(!rt)return null;
  const ctx=currentActiveContext();
  if(rt.phase==='REST'&&rt.nextAction?.type==='EXERCISE')return ctx.exs[rt.nextAction.exerciseIndex]||null;
  if(rt.phase==='REST'&&rt.nextAction?.type==='SET'&&ctx.exs[rt.nextAction.exerciseIndex]?.id!==ctx.e?.id)return ctx.exs[rt.nextAction.exerciseIndex]||null;
  return ctx.e||null;
}
function exerciseSourceKey(row){
  const u=getUserExercise(state,row?.userExerciseId);
  return row?.exerciseKey||CANONICAL_BY_ID.get(row?.canonicalExerciseId||u?.canonicalExerciseId)?.key||u?.legacyExerciseKey||bestMatch(row?.name||u?.displayName||'')?.key||null;
}
function relationshipForAlternatives(source,candidate){
  const explicit=alternativeRelation(source?.key,candidate.key);
  if(explicit)return explicit;
  // The canonical family is a conservative fallback for user-defined catalogue exercises.
  // It is always labelled CLOSE, never automatically considered equivalent.
  const f=source?.familyKey;
  const allowed=new Set(['CHEST_PRESS','SHOULDER_PRESS','SQUAT','LEG_PRESS','HIP_HINGE','HORIZONTAL_PULL','VERTICAL_PULL','CHEST_FLY','KNEE_EXTENSION','KNEE_FLEXION','TRICEPS','BICEPS','CALF']);
  return f&&allowed.has(f)&&f===candidate?.familyKey?'CLOSE':null;
}
function replacementCandidates(target){
  const u=getUserExercise(state,target.userExerciseId);
  const key=exerciseSourceKey(target);
  const source=CANONICAL_BY_ID.get(target.canonicalExerciseId||u?.canonicalExerciseId)||CANONICAL_BY_KEY.get(key)||null;
  const currentSessionId=runtime()?.sessionId;
  const currentSession=getSession(currentSessionId);
  const inProgramme=new Map();
  for(const te of state.template_exercises){
    if(Number(te.workoutId)===Number(currentSession?.workoutId))continue;
    const k=exerciseSourceKey(te);if(!k)continue;
    const old=inProgramme.get(k);
    if(!old)inProgramme.set(k,te);
  }
  const completedSessions=new Set(state.workout_sessions.filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').map(s=>s.id));
  const completedByKey=new Map();
  for(const past of state.session_exercises){
    if(!completedSessions.has(past.sessionId)||past.id===target.id)continue;
    const k=exerciseSourceKey(past);if(!k)continue;
    const mostRecent=exerciseSets(state,past.id).filter(x=>x.status==='COMPLETE'&&Number.isFinite(Number(x.actualWeightKg))&&Number(x.actualWeightKg)>0).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0))[0];
    if(!mostRecent)continue;
    const row={weight:Number(mostRecent.actualWeightKg),at:Number(mostRecent.completedAt||0)};
    if(!completedByKey.has(k)||completedByKey.get(k).at<row.at)completedByKey.set(k,row);
  }
  const candidates=new Map();
  for(const canonical of CANONICAL_EXERCISES){
    if(canonical.status!=='ACTIVE'||canonical.id===target.canonicalExerciseId||canonical.key===key)continue;
    const rel=relationshipForAlternatives(source,canonical);
    if(!rel)continue;
    candidates.set(canonical.key,{key:canonical.key,name:canonicalName(canonical,languageCode(state)),canonical,relation:rel});
  }
  for(const d of EXERCISES){
    if(d.key===key||candidates.has(d.key))continue;
    const rel=alternativeRelation(key,d.key);if(rel)candidates.set(d.key,{key:d.key,name:d.name,canonical:CANONICAL_BY_KEY.get(d.key)||null,relation:rel,legacy:d});
  }
  return [...candidates.values()].map(c=>{
    const programme=inProgramme.get(c.key)||null,hist=completedByKey.get(c.key)||null;
    const user=state.user_exercises.find(x=>!x.archived&&(x.canonicalExerciseId===c.canonical?.id||x.legacyExerciseKey===c.key))||null;
    return {...c,programme,hist,user,knownWeight:hist?.weight??null,programmeWeight:programme?.initialWeightKg??null};
  }).sort((a,b)=>
    (a.relation==='EQUIVALENT'?0:1)-(b.relation==='EQUIVALENT'?0:1)||
    (a.programme&&a.hist?0:a.hist?1:a.programme?2:3)-(b.programme&&b.hist?0:b.hist?1:b.programme?2:3)||
    alternativePriority(key,a.key)-alternativePriority(key,b.key)||
    (b.hist?.at||0)-(a.hist?.at||0)||a.name.localeCompare(b.name)
  ).slice(0,16);
}
function requestReplaceExercise(){
  const target=replacementExerciseTarget();if(!target)return;
  const done=exerciseSets(state,target.id).some(x=>x.status==='COMPLETE');
  if(done||target.supersetGroupId){toast(S('Replace before the first completed set; supersets cannot be replaced as one exercise.','Aizstāt var pirms pirmā piegājiena; supersetu šādi nevar aizstāt.'));return;}
  const options=replacementCandidates(target);
  if(!options.length){alertDialog(S('No close alternatives','Nav piemērotu analogu'),S('No verified alternatives exist in your exercise catalogue yet.','Katalogā vēl nav pārbaudītu analogu.'));return;}
  window.__gpReplacement={targetId:target.id,options};
  openDialog(`<h2>${esc(S('Replace exercise','Aizstāt vingrinājumu'))}</h2><div class="small">${esc(sessionDisplayName(target))}</div><div class="note">${esc(S('Own recorded weights are preferred. The programme is unchanged.','Priekšroka dotama iepriekš lietotiem svariem. Programma netiks mainīta.'))}</div><div class="alternative-list">${options.map((x,i)=>`<button class="alternative-choice secondary" onclick="gp.selectReplacement(${i})"><span><strong>${esc(x.name)}</strong><small>${esc(x.relation==='EQUIVALENT'?S('Equivalent','Līdzvērtīgs'):S('Close alternative','Līdzīgs'))}${x.programme?' · '+esc(S('Other programme day','Citā programmas dienā')):''}</small></span><span class="alternative-weight">${x.canonical?.category==='CARDIO'?esc(S('Cardio','Kardio')):x.knownWeight!=null?esc(formatKg(x.knownWeight)):esc(S('Set weight','Ievadīt svaru'))}</span></button>`).join('')}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button></div>`);
}
function selectReplacement(index){
  const draft=window.__gpReplacement,c=draft?.options?.[index];if(!c)return;
  draft.chosen=c;
  const kg=c.knownWeight??c.programmeWeight;
  const equipment=c.canonical?.equipment||c.legacy?.equipment||Equipment.OTHER;
  const body=equipment===Equipment.BODYWEIGHT||equipment===Equipment.CARDIO;
  openDialog(`<h2>${esc(c.name)}</h2><div class="note">${esc(equipment===Equipment.CARDIO?S('Cardio: record duration, distance and effort during the exercise.','Kardio: vingrinājumā reģistrē ilgumu, distanci un piepūli.'):c.knownWeight!=null?S('Your last completed working weight, editable.','Tavs pēdējais reģistrētais svars, labojams.'):S('No recorded working weight. Enter a suitable initial weight.','Nav reģistrēta svara. Ievadi sākotnējo svaru.'))}</div>${body?'':`<label class="field">${esc(S('Working weight (kg)','Darba svars (kg)'))}</label><input type="number" inputmode="decimal" id="f-replace-weight" step="any" min="0" value="${kg==null?'':Number(kg)}" required>`}<div class="dialog-actions"><button class="secondary" onclick="gp.requestReplaceExercise()">${esc(S('Back','Atpakaļ'))}</button><button onclick="gp.confirmReplacement()">${esc(S('Use for this workout','Izmantot šim treniņam'))}</button></div>`);
}
async function confirmReplacement(){
  const draft=window.__gpReplacement,c=draft?.chosen,e=getSessionExercise(draft?.targetId);
  if(!c||!e)return;
  const pending=exerciseSets(state,e.id),equipment=c.canonical?.equipment||c.legacy?.equipment||Equipment.OTHER;
  if(pending.some(s=>s.status==='COMPLETE')){toast('Cannot replace after completing a set');return;}
  const noKg=equipment===Equipment.BODYWEIGHT||equipment===Equipment.CARDIO;
  const raw=noKg?0:Number($('#f-replace-weight')?.value);
  if(!Number.isFinite(raw)||raw<0||(!noKg&&raw<=0)){toast('Enter a valid working weight');return;}
  let user=c.user;
  if(!user){
    user={id:uuid(),displayName:c.name,createdLanguage:languageCode(state),canonicalExerciseId:c.canonical?.id||null,equipment,dumbbellLoad:c.canonical?.dumbbellLoad||c.legacy?.dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:c.canonical?.exerciseType||c.legacy?.type||ExerciseType.MODERATE_COMPOUND,trackingMode:trackingModeFor(equipment),legacyExerciseKey:c.key,archived:false};
    state.user_exercises.push(user);
  }
  const old=e.name;
  Object.assign(e,{name:user.displayName,userExerciseId:user.id,canonicalExerciseId:user.canonicalExerciseId||null,programmeExerciseId:uuid(),templateExerciseId:null,exerciseKey:c.key,equipment:user.equipment,dumbbellLoad:user.dumbbellLoad,exerciseType:user.exerciseType,trackingMode:user.trackingMode||trackingModeFor(equipment),plannedWeightKg:raw,startedAt:null,endedAt:null,status:'PENDING',rampStartedAt:null,rampEndedAt:null,rampSkipped:false,removeWeights:equipment===Equipment.BARBELL,rampMode:'AUTO',supersetGroupId:null});
  e.rampPlanJson=equipment===Equipment.CARDIO?'[]':JSON.stringify(recommendRamp(raw,e.targetReps,e.exerciseType,e.exerciseKey,e.name,e.equipment,state.app_state.maxRampUpSets));
  for(const set of pending)if(set.status==='PENDING'){set.plannedWeightKg=raw;set.actualWeightKg=null;}
  const rt=runtime();if(rt&&rt.phase!=='REST')rt.workingWeight=raw;
  window.__gpReplacement=null;closeDialog();await persist();render();toast(`${old} → ${c.name}`);
}
function exerciseActionButtons({showLater=true}={}){
  const e=replacementExerciseTarget();if(!e)return'';
  const canReplace=!exerciseSets(state,e.id).some(s=>s.status==='COMPLETE');
  const rt=runtime(),all=rt?sessionExercises(state,rt.sessionId):[],pos=all.findIndex(x=>x.id===e.id);const hasLater=showLater&&all.slice(pos+1).some(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'));
  return `<div class="exercise-secondary-actions">${hasLater?`<button class="exercise-management" onclick="gp.requestPostponeExercise()">${esc(S('Later','Vēlāk'))}</button>`:''}${canReplace?`<button class="exercise-management" onclick="gp.requestReplaceExercise()">${esc(S('Replace','Aizstāt'))}</button>`:''}<button class="exercise-management" onclick="gp.skipExercise()">${esc(S('Skip','Izlaist'))}</button></div>`;
}
function requestPostponeExercise(){const e=replacementExerciseTarget(),all=runtime()?sessionExercises(state,runtime().sessionId):[],next=all.slice(all.findIndex(x=>x.id===e?.id)+1).find(x=>!(e?.supersetGroupId&&x.supersetGroupId===e.supersetGroupId)&&exerciseSets(state,x.id).some(s=>s.status==='PENDING'));if(!e||!next)return;window.__gpPostponeTargetId=e.id;openDialog(`<h2>Postpone ${esc(sessionDisplayName(e))}?</h2><div class="dialog-copy">Continue with <strong>${esc(sessionDisplayName(next))}</strong> now. Where should ${esc(sessionDisplayName(e))} return?</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">Cancel</button><button onclick="gp.postponeExercise('next')">After next exercise</button><button onclick="gp.postponeExercise('end')">End of workout</button></div>`);}
async function postponeExercise(where='next'){
  const {rt,exs}=currentActiveContext(),e=getSessionExercise(window.__gpPostponeTargetId)||replacementExerciseTarget();
  if(!rt||!e)return;
  const next=exs.slice(exs.findIndex(x=>x.id===e.id)+1).find(x=>!(e.supersetGroupId&&x.supersetGroupId===e.supersetGroupId)&&exerciseSets(state,x.id).some(s=>s.status==='PENDING'));
  if(!next){closeDialog();return;}
  const resting=rt.phase==='REST'&&!!rt.rest;
  const oldActiveId=exs[rt.currentExerciseIndex]?.id;
  const blocks=[],seen=new Set();
  for(const item of exs){if(seen.has(item.id))continue;const members=item.supersetGroupId?exs.filter(x=>x.supersetGroupId===item.supersetGroupId):[item];members.forEach(x=>seen.add(x.id));blocks.push(members.sort((a,b)=>a.position-b.position));}
  const from=blocks.findIndex(b=>b.some(x=>x.id===e.id));
  if(from<0||from>=blocks.length-1){closeDialog();return;}
  const moved=blocks.splice(from,1)[0],at=where==='end'?blocks.length:Math.min(from+1,blocks.length);
  blocks.splice(at,0,moved);blocks.flat().forEach((x,i)=>x.position=i);
  const ordered=sessionExercises(state,rt.sessionId);
  if(resting){
    // Keep the EXACT rest timestamps, set ownership, countdown stage and beep state.
    rt.currentExerciseIndex=Math.max(0,ordered.findIndex(x=>x.id===oldActiveId));
    rt.nextAction=nextPendingActivity(ordered);
    // Do not change rt.phase/rt.rest/rt.phaseStartedAt, and do not enter an exercise.
  }else{
    const newIndex=ordered.findIndex(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'));
    rt.currentExerciseIndex=Math.max(0,newIndex);
    const newE=ordered[rt.currentExerciseIndex],sets=newE?exerciseSets(state,newE.id):[];
    rt.currentSetIndex=Math.max(0,sets.findIndex(x=>x.status==='PENDING'));
    rt.workingWeight=sets[rt.currentSetIndex]?.plannedWeightKg??newE?.plannedWeightKg??0;
    rt.entry=null;rt.rest=null;rt.nextAction=null;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();
  }
  window.__gpPostponeTargetId=null;
  closeDialog();await persist();render();toast(`${sessionDisplayName(e)} postponed`);
}
async function skipExercise(){
  const ctx=currentActiveContext(),exs=ctx.exs,e=replacementExerciseTarget();if(!e)return;
  const group=e.supersetGroupId?exs.filter(x=>x.supersetGroupId===e.supersetGroupId):[e];
  const completed=group.some(x=>exerciseSets(state,x.id).some(set=>set.status==='COMPLETE'));
  if(completed&&group.length>1){alertDialog('Cannot skip part of a superset','Finish or skip the remaining sets using the superset controls.');return;}
  const after=exs.slice(exs.findIndex(x=>x.id===group[group.length-1].id)+1)
    .find(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'));
  const name=group.length>1?group.map(sessionDisplayName).join(' + '):sessionDisplayName(e);
  confirmDialog(`Skip ${name}?`,`Remaining sets will be marked skipped. ${after?`Next: ${sessionDisplayName(after)}.`:'Stretching follows.'} Your current rest will continue.`,
    'Skip exercise',async()=>{
      closeDialog();const {rt,exs}=currentActiveContext(),resting=rt.phase==='REST'&&!!rt.rest,t=now();
      for(const item of group){for(const set of exerciseSets(state,item.id).filter(s=>s.status==='PENDING')){set.status='SKIPPED';set.completedAt=t;}item.status='SKIPPED';item.endedAt=t;}
      rt.nextAction=resting?nextPendingActivity(exs):nextActionAfterExercise(exs,group[group.length-1]);
      if(!resting)rt.rest=null;
      await persist();
      if(!resting)await afterRest();else render();
      flashTransition(`${name} SKIPPED`);
      if(!resting)queuePostSetPrompts([{type:'note',e}]);
    },true);
}
function beginStretch(){const rt=runtime(),s=getSession(rt.sessionId),t=now();s.stretchStartedAt=s.stretchStartedAt||t;rt.phase='STRETCH';rt.phaseStartedAt=s.stretchStartedAt;rt.rest=null;rt.nextAction=null;persist().then(render);}
async function finishStretch(skipped){const rt=runtime(),s=getSession(rt.sessionId),t=now();s.stretchStartedAt=s.stretchStartedAt||t;s.stretchEndedAt=t;s.stretchSkipped=!!skipped;rt.phase='FINAL';rt.phaseStartedAt=t;await persist();render();}
async function undoLastSet(){
  const rt=runtime();if(!rt)return;const exs=sessionExercises(state,rt.sessionId),ids=new Set(exs.map(e=>e.id));
  const last=state.performed_sets.filter(x=>ids.has(x.sessionExerciseId)&&x.status==='COMPLETE').sort((a,b)=>(b.completedAt||0)-(a.completedAt||0))[0];if(!last){toast('Nothing to undo');return;}
  const e=getSessionExercise(last.sessionExerciseId),targets=[{e,set:last}];if(e?.supersetGroupId){const pair=supersetPairForExercise(exs,e),other=pair?.find(x=>x.id!==e.id),otherSet=other?exerciseSets(state,other.id).find(x=>x.setNumber===last.setNumber&&x.status==='COMPLETE'&&Math.abs(Number(x.completedAt||0)-Number(last.completedAt||0))<1500):null;if(other&&otherSet)targets.push({e:other,set:otherSet});}
  for(const target of targets){const te=target.e.progressionAccepted&&target.e.templateExerciseId!=null?state.template_exercises.find(x=>x.id===target.e.templateExerciseId):null;if(te)te.initialWeightKg=target.e.plannedWeightKg;Object.assign(target.set,{actualReps:null,actualWeightKg:null,rir:null,failure:false,actualRestSeconds:null,status:'PENDING',completedAt:null});target.e.endedAt=null;target.e.status='ACTIVE';target.e.progressionOffered=false;target.e.progressionAccepted=false;target.e.nextWeightKg=null;target.e.nextReps=null;}
  const lead=targets.map(x=>x.e).sort((a,b)=>a.position-b.position)[0],ei=exs.findIndex(x=>x.id===lead.id),sets=exerciseSets(state,lead.id),si=sets.findIndex(x=>x.setNumber===last.setNumber);rt.currentExerciseIndex=Math.max(0,ei);rt.currentSetIndex=Math.max(0,si);rt.workingWeight=sets[Math.max(0,si)]?.plannedWeightKg||lead.plannedWeightKg;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();rt.entry=null;rt.supersetEntry=null;rt.supersetTimed={};rt.rest=null;rt.nextAction=null;delete rt.deferredRestSetId;await persist();render();toast(targets.length>1?'Superset set restored':'Last set restored');
}

function requestAbort(){openDialog(`<h2>End workout early?</h2><div class="dialog-copy">Finish as partial keeps completed work, marks every remaining set/exercise skipped, and shows this workout in Logs as Aborted.

Discard workout removes this session completely and it will not appear in Logs or Progress.</div><div class="dialog-actions abort-actions"><button onclick="gp.finishPartialWorkout()">Finish as partial</button><button class="danger" onclick="gp.discardActiveWorkout()">Discard workout</button><button class="secondary" onclick="gp.closeDialog()">Cancel</button></div>`);}
async function finishPartialWorkout(){const rt=runtime(),s=rt?getSession(rt.sessionId):activeSession();if(!s)return;const t=now(),es=sessionExercises(state,s.id);for(const e of es){const sets=exerciseSets(state,e.id),hadPending=sets.some(x=>x.status==='PENDING');sets.filter(x=>x.status==='PENDING').forEach(x=>{x.status='SKIPPED';x.completedAt=t;});if(hadPending||e.status==='PENDING'||e.status==='ACTIVE'){e.startedAt=e.startedAt??t;e.endedAt=t;e.status='SKIPPED';if(e.rampEndedAt==null)e.rampSkipped=true;if(e.unloadEndedAt==null)e.unloadSkipped=true;}}const stretchWasFinished=s.stretchEndedAt!=null;s.endedAt=t;s.status='ABORTED';s.stretchEndedAt=s.stretchEndedAt??t;s.stretchSkipped=stretchWasFinished?!!s.stretchSkipped:true;state.app_state.lastInactivityReminderFor=null;state.runtime=null;persistWorkoutIntelligence(state,s.id);await persist();releaseWakeLock();closeDialog();nav('home');toast('Workout saved as partial');}
async function discardActiveWorkout(){const s=activeSession();if(!s)return;const exIds=sessionExercises(state,s.id).map(e=>e.id);state.performed_sets=state.performed_sets.filter(x=>!exIds.includes(x.sessionExerciseId));state.session_exercises=state.session_exercises.filter(e=>e.sessionId!==s.id);state.workout_sessions=state.workout_sessions.filter(x=>x.id!==s.id);state.runtime=null;await persist();releaseWakeLock();closeDialog();nav('home');toast('Workout discarded');}

async function tick(){
  if(!state)return;const tickNow=new Date(),trackerDateNow=trackerTodayKey();if(trackerDateNow!==trackerRenderedDate){trackerRenderedDate=trackerDateNow;sentTrackerReminderKeys.clear();trackerVisualBucket=-1;if(rollTrackerStatesToToday())await persist();if(route.name==='home')render();}const bucket=Math.floor((tickNow.getHours()*60+tickNow.getMinutes())/10);if(bucket!==trackerVisualBucket){trackerVisualBucket=bucket;refreshTrackerTimeVisuals(tickNow);}updateLiveClocks();await checkMotivationReminders();await checkTrackerReminders();const rt=runtime();if(!rt)return;
  const dialogOpen=!!document.querySelector('.dialog-backdrop');
  if(route.name!=='active')return;
  if(rt.phase==='REST'&&!rt.rest){await afterRest();return;}
  if((rt.phase==='REST'||rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.rest){
    const rem=rt.rest.endsAt-now();
    if(rem<=30000&&rem>29000&&!rt.rest.warned30){rt.rest.warned30=true;beepPattern('warning30');persist();}
    if(rem<=3000&&rem>2000&&!rt.rest.count3){rt.rest.count3=true;beepPattern('countdown');persist();}
    if(rem<=2000&&rem>1000&&!rt.rest.count2){rt.rest.count2=true;beepPattern('countdown');persist();}
    if(rem<=1000&&rem>0&&!rt.rest.count1){rt.rest.count1=true;beepPattern('countdown');persist();}
    if(rem<=0){if(!rt.rest.beeped0){rt.rest.beeped0=true;beepPattern('ready');await persist();}if(rt.phase==='REST'){finalizeRest();await afterRest();return;}}
    if(!dialogOpen)updateLiveClocks();return;
  }
  if(rt.phase==='TIMED_SET'){const {set,e}=currentActiveContext(),target=Number(set?.targetDurationSeconds||e?.targetSeconds||60);if(now()-rt.phaseStartedAt>=target*1000){if(e?.trackingMode===TrackingMode.CARDIO){if(!rt.cardioDoneBeep){beepPattern('ready');rt.cardioDoneBeep=true;}updateLiveClocks();return;}beepPattern('ready');await finishTimedSet();return;}updateLiveClocks();return;}
  if(rt.phase==='SET'&&rt.reminderStartedAt){const mins=Math.floor((now()-rt.reminderStartedAt)/60000);if(mins>=1){const key=`${rt.sessionId}/${rt.currentExerciseIndex}/${rt.currentSetIndex}/${mins}`;if(key!==lastReminderKey){lastReminderKey=key;beep(1);}}}
}
async function enableAudio(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')await audioCtx.resume();}catch{}}
function beepTone(at,freq=720,duration=.16,gain=.22){if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(audioCtx.destination);o.start(at);o.stop(at+duration+.02);}
function beepPattern(kind='reminder'){if(!audioCtx)return;const t=audioCtx.currentTime+.01;if(kind==='warning30'){beepTone(t,700,.18,.28);beepTone(t+.25,700,.18,.28);if(navigator.vibrate)navigator.vibrate([100,100,100]);return;}if(kind==='countdown'){beepTone(t,760,.14,.30);if(navigator.vibrate)navigator.vibrate(80);return;}if(kind==='ready'){beepTone(t,900,.34,.34);if(navigator.vibrate)navigator.vibrate(180);return;}beepTone(t,650,.18,.22);if(navigator.vibrate)navigator.vibrate(90);}
function beep(count=1){for(let i=0;i<count;i++)beepPattern('reminder');}
async function requestWakeLock(){if(!state?.app_state.keepScreenAwake||!('wakeLock'in navigator)||document.hidden)return;try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}
async function releaseWakeLock(){try{await wakeLock?.release();}catch{}wakeLock=null;}

function backupObject(){return {schema:'gym-progress-backup-v6',exported_at_ms:now(),app_state:{...state.app_state},workout_templates:state.workout_templates.map(({...x})=>x),user_exercises:state.user_exercises.map(({...x})=>x),template_exercises:state.template_exercises.map(({...x})=>x),workout_sessions:state.workout_sessions.map(({...x})=>x),session_exercises:state.session_exercises.map(({...x})=>x),performed_sets:state.performed_sets.map(({...x})=>x),tracker_items:state.tracker_items.map(({...x})=>x),tracker_states:state.tracker_states.map(({...x})=>x),sync_foundation:structuredClone(state.sync_foundation||null)}};
function downloadBackup(){download(`gym_progress_backup_${stamp()}.json`,JSON.stringify(backupObject(),null,2));}
function pickRestore(){$('#restore-file')?.click();}
async function restoreFile(file){if(!file)return;let parsed;try{parsed=JSON.parse(await file.text());}catch{alertDialog('Invalid file','The selected file is not valid JSON.');return;}if(!['gym-progress-backup-v6','gym-progress-backup-v5','gym-progress-backup-v4','gym-progress-backup-v3','progression-backup-v2','progression-backup-v1'].includes(parsed.schema)){alertDialog('Unsupported backup','This is not a supported Gym Progress backup.');return;}confirmDialog('Restore backup?','This replaces all current data in this PWA with the selected backup.','Restore',async()=>{if(state&&hasTrainingData(state))await saveRecoveryState(state,'pre-restore-latest');const d=defaults(),st=parsed.app_state||{},rirInputMax=Number(st.rirInputMax)<=3?3:5,targetRirMin=Math.max(0,Math.min(rirInputMax,Number(st.targetRirMin??1))),targetRirMax=Math.max(targetRirMin,Math.min(rirInputMax,Number(st.targetRirMax??2)));const restored=normalize({...d,app_state:{...d.app_state,...st,rirInputMax,targetRirMin,targetRirMax},workout_templates:parsed.workout_templates||[],user_exercises:parsed.user_exercises||[],tracker_items:parsed.tracker_items||[],tracker_states:parsed.tracker_states||[],tracker_entries:parsed.tracker_entries||[],template_exercises:(parsed.template_exercises||[]).map(e=>{const m=bestMatch(e.name);return{...e,note:String(e.note||'').slice(0,500),exerciseKey:e.exerciseKey??m?.key??null,exerciseType:e.exerciseType||m?.type||ExerciseType.MODERATE_COMPOUND,rampMode:e.rampMode||RampMode.AUTO,removeWeights:e.removeWeights??m?.defaultRemoveWeights??false,equipment:e.equipment??m?.equipment??equipmentFor(e.exerciseKey??m?.key,e.name),dumbbellLoad:(e.equipment??m?.equipment??equipmentFor(e.exerciseKey??m?.key,e.name))===Equipment.DUMBBELL?(e.dumbbellLoad??m?.dumbbellLoad??dumbbellLoadFor(e.exerciseKey??m?.key,e.name)):DumbbellLoad.SINGLE};}),workout_sessions:(parsed.workout_sessions||[]).map(s=>({...s,note:s.note||'',warmupSkipped:!!s.warmupSkipped,stretchSkipped:!!s.stretchSkipped})),session_exercises:(parsed.session_exercises||[]).map(e=>{const m=bestMatch(e.name);return{...e,exerciseKey:e.exerciseKey??m?.key??null,exerciseType:e.exerciseType||m?.type||ExerciseType.MODERATE_COMPOUND,rampMode:e.rampMode||RampMode.AUTO,removeWeights:e.removeWeights??m?.defaultRemoveWeights??false,equipment:e.equipment??m?.equipment??equipmentFor(e.exerciseKey??m?.key,e.name),dumbbellLoad:(e.equipment??m?.equipment??equipmentFor(e.exerciseKey??m?.key,e.name))===Equipment.DUMBBELL?(e.dumbbellLoad??m?.dumbbellLoad??dumbbellLoadFor(e.exerciseKey??m?.key,e.name)):DumbbellLoad.SINGLE,rampPlanJson:e.rampPlanJson||JSON.stringify(recommendRamp(e.plannedWeightKg,e.targetReps,e.exerciseType||m?.type||ExerciseType.MODERATE_COMPOUND,e.exerciseKey??m?.key??null,e.name,e.equipment??m?.equipment??equipmentFor(e.exerciseKey??m?.key,e.name))),rampSkipped:!!e.rampSkipped,unloadSkipped:!!e.unloadSkipped};}),performed_sets:(parsed.performed_sets||[]).map(s=>({...s,failure:!!s.failure})),sync_foundation:parsed.sync_foundation||null,runtime:null});if(hasTrainingData(parsed)&&!migrationPreservedTrainingData(parsed,restored)){alertDialog('Restore stopped','The backup migration did not preserve all programme/history records. Nothing was overwritten.');return;}state=restored;ensureRotation();ui.selectedWorkoutId=state.app_state.nextWorkoutId;ui.timelineDays=null;ui.timelineEndMs=null;await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();nav('home');toast('Backup restored');});}
function exportRows(){const rows=[];for(const e of state.session_exercises){const s=getSession(e.sessionId);for(const set of exerciseSets(state,e.id))rows.push({session_id:s.id,date:iso(s.startedAt),workout:s.workoutName,session_started_at:iso(s.startedAt),session_ended_at:iso(s.endedAt),session_status:s.status,session_note:s.note,warmup_started_at:iso(s.warmupStartedAt),warmup_ended_at:iso(s.warmupEndedAt),warmup_skipped:s.warmupSkipped,stretch_started_at:iso(s.stretchStartedAt),stretch_ended_at:iso(s.stretchEndedAt),stretch_skipped:s.stretchSkipped,exercise_id:e.id,exercise_name:sessionDisplayName(e),exercise_order:e.position,exercise_started_at:iso(e.startedAt),exercise_ended_at:iso(e.endedAt),exercise_status:e.status,exercise_note:e.note||'',exercise_type:e.exerciseType,equipment:e.equipment,dumbbell_load:e.dumbbellLoad,ramp_started_at:iso(e.rampStartedAt),ramp_ended_at:iso(e.rampEndedAt),ramp_skipped:e.rampSkipped,ramp_plan_json:e.rampPlanJson,unload_started_at:iso(e.unloadStartedAt),unload_ended_at:iso(e.unloadEndedAt),unload_skipped:e.unloadSkipped,set_no:set.setNumber,target_reps:set.targetReps,actual_reps:set.actualReps,planned_weight_kg:set.plannedWeightKg,actual_weight_kg:set.actualWeightKg,rir:set.rir,failure:set.failure,planned_rest_s:set.plannedRestSeconds,actual_rest_s:set.actualRestSeconds,set_status:set.status,completed_at:iso(set.completedAt),progression_offered:e.progressionOffered,progression_accepted:e.progressionAccepted,next_weight_kg:e.nextWeightKg,next_reps:e.nextReps,fatigue_state:s.fatigueState??null,fatigue_score:s.fatigueScore??null,fatigue_reasons:JSON.stringify(s.fatigueReasons??[]),subjective_recovery:s.subjectiveRecovery??null,future_adjustment_offered:e.futureAdjustmentOffered??false,future_adjustment_accepted:e.futureAdjustmentAccepted??null,recommendation:e.recommendation??null,recommendation_decision:e.recommendationDecision??null,recommendation_reasons:JSON.stringify(e.recommendationReasonCodes??[]),trend_state:e.trendState??null,trend_confidence:e.trendConfidence??null,expected_progression_interval:e.expectedProgressionInterval??null,exposures_since_progression:e.exposuresSinceProgression??null,performance_trend:e.performanceTrend??null,normalised_performance:e.normalisedPerformance??null});}return rows;}
function csvCell(v){if(v==null)return'';const s=String(v);return /[,"\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
function downloadCsv(){const rows=exportRows(),headers=rows.length?Object.keys(rows[0]):['session_id','date','workout'];download(`gym_progress_${stamp()}.csv`,[headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n'),'text/csv');}
function detailedJsonObject(){const sessions=state.workout_sessions.map(s=>({session_id:s.id,workout:s.workoutName,started_at:iso(s.startedAt),ended_at:iso(s.endedAt),status:s.status,note:s.note,fatigue_state:s.fatigueState??null,fatigue_score:s.fatigueScore??null,fatigue_reasons:s.fatigueReasons??[],subjective_recovery:s.subjectiveRecovery??null,warmup:{started_at:iso(s.warmupStartedAt),ended_at:iso(s.warmupEndedAt),skipped:s.warmupSkipped,duration_s:s.warmupStartedAt&&s.warmupEndedAt?Math.max(0,Math.floor((s.warmupEndedAt-s.warmupStartedAt)/1000)):null},stretching:{started_at:iso(s.stretchStartedAt),ended_at:iso(s.stretchEndedAt),skipped:s.stretchSkipped,duration_s:s.stretchStartedAt&&s.stretchEndedAt?Math.max(0,Math.floor((s.stretchEndedAt-s.stretchStartedAt)/1000)):null},exercises:sessionExercises(state,s.id).map(e=>({exercise_id:e.id,user_exercise_id:e.userExerciseId,programme_exercise_id:e.programmeExerciseId,canonical_exercise_id:e.canonicalExerciseId,name:sessionDisplayName(e),name_snapshot:e.name,note:e.note||'',tracking_mode:e.trackingMode,order:e.position,type:e.exerciseType,equipment:e.equipment,dumbbell_load:e.dumbbellLoad,started_at:iso(e.startedAt),ended_at:iso(e.endedAt),status:e.status,ramp_up:{started_at:iso(e.rampStartedAt),ended_at:iso(e.rampEndedAt),skipped:e.rampSkipped,duration_s:e.rampStartedAt&&e.rampEndedAt?Math.max(0,Math.floor((e.rampEndedAt-e.rampStartedAt)/1000)):null,suggested_plan:(()=>{try{return JSON.parse(e.rampPlanJson||'[]')}catch{return null}})()},unload:{started_at:iso(e.unloadStartedAt),ended_at:iso(e.unloadEndedAt),skipped:e.unloadSkipped,duration_s:e.unloadStartedAt&&e.unloadEndedAt?Math.max(0,Math.floor((e.unloadEndedAt-e.unloadStartedAt)/1000)):null},progression_offered:e.progressionOffered,progression_accepted:e.progressionAccepted,recommendation:e.recommendation??null,recommendation_decision:e.recommendationDecision??null,trend_state:e.trendState??null,trend_confidence:e.trendConfidence??null,expected_progression_interval:e.expectedProgressionInterval??null,exposures_since_progression:e.exposuresSinceProgression??null,performance_trend:e.performanceTrend??null,normalised_performance:e.normalisedPerformance??null,recommendation_reason_codes:e.recommendationReasonCodes??[],future_adjustment_offered:e.futureAdjustmentOffered??false,future_adjustment_accepted:e.futureAdjustmentAccepted??null,next_weight_kg:e.nextWeightKg,next_reps:e.nextReps,sets:exerciseSets(state,e.id).map(x=>({set_no:x.setNumber,target_reps:x.targetReps,actual_reps:x.actualReps,target_duration_s:x.targetDurationSeconds,actual_duration_s:x.actualDurationSeconds,planned_weight_kg:x.plannedWeightKg,actual_weight_kg:x.actualWeightKg,rir:x.rir,failure:x.failure,planned_rest_s:x.plannedRestSeconds,actual_rest_s:x.actualRestSeconds,status:x.status,completed_at:iso(x.completedAt)}))}))}));return{schema:'gym-progress-export-v4',exported_at:new Date().toISOString(),sessions};}
function downloadDetailedJson(){download(`gym_progress_detailed_${stamp()}.json`,JSON.stringify(detailedJsonObject(),null,2));}
function eraseExerciseLogs(){confirmDialog(S('Erase exercise log data everywhere?','Dzēst treniņu žurnāla datus visur?'),S('WARNING: this permanently deletes workout history, recorded sets and Progress data from this device and, when signed in, from your synced cloud history and derived shared workout/progress records. Programme, settings, Tracker and account are kept.','SVARĪGS BRĪDINĀJUMS: tas neatgriezeniski izdzēsīs treniņu vēsturi, piegājienus un Progresa datus no šīs ierīces un, ja esi pieslēdzies, arī no sinhronizētās mākoņa vēstures un no tās atvasinātajiem kopīgotajiem treniņu/progresa ierakstiem. Programma, iestatījumi, Tracker un konts paliek.'),S('ERASE LOGS','DZĒST ŽURNĀLU'),async()=>{try{if(socialSignedIn())await eraseMyCloudTraining('workout_log');state.workout_sessions=[];state.session_exercises=[];state.performed_sets=[];state.runtime=null;state.app_state.lastInactivityReminderFor=null;ui.timelineDays=null;ui.timelineEndMs=null;await persist();closeDialog();nav('settings');toast(S('Exercise log data erased locally and in cloud.','Treniņu žurnāla dati izdzēsti lokāli un mākonī.'));}catch(e){toast(`${S('Cloud deletion failed; local data was not erased','Mākoņa dzēšana neizdevās; lokālie dati netika dzēsti')}: ${e?.message||e}`);}},true);}
function eraseData(){confirmDialog(S('Erase all training data everywhere?','Dzēst visus treniņu datus visur?'),S('WARNING: this permanently deletes programme, working weights, workout history, Progress and Tracker from this device and, when signed in, from your cloud account. Shared workout/progress records are also removed. Your login/account and friendships are kept. Recovery is possible only from a backup you already saved.','SVARĪGS BRĪDINĀJUMS: tas neatgriezeniski izdzēsīs programmu, darba svarus, treniņu vēsturi, Progresu un Tracker no šīs ierīces un, ja esi pieslēdzies, arī no mākoņa konta. Tiks noņemti arī kopīgotie treniņu/progresa ieraksti. Pieslēgšanās konts un draudzības paliek. Atjaunošana iespējama tikai no iepriekš saglabātas rezerves kopijas.'),S('Continue','Turpināt'),()=>{closeDialog();setTimeout(()=>confirmDialog(S('FINAL WARNING','PĒDĒJAIS BRĪDINĀJUMS'),S('There is no undo. Cancel now if you need to create a backup first.','To nevar atsaukt. Atcel tagad, ja vispirms nepieciešama rezerves kopija.'),S('ERASE EVERYTHING','DZĒST VISU'),async()=>{try{if(socialSignedIn())await eraseMyCloudTraining('all');await wipeState();state=defaults();ui.timelineDays=null;ui.timelineEndMs=null;await persist();ui.selectedWorkoutId=null;closeDialog();nav('home');toast(S('All training data erased locally and in cloud.','Visi treniņu dati izdzēsti lokāli un mākonī.'));}catch(e){toast(`${S('Cloud deletion failed; local data was not erased','Mākoņa dzēšana neizdevās; lokālie dati netika dzēsti')}: ${e?.message||e}`);}},true),30);},true);}

function alertDialog(title,text){openDialog(`<h2>${esc(title)}</h2><div class="muted">${esc(text)}</div><div class="dialog-actions"><button onclick="gp.closeDialog()">OK</button></div>`);}
function confirmDialog(title,text,confirmLabel,onConfirm,danger=false,onCancel=null){window.__gpConfirm=onConfirm;window.__gpCancel=onCancel;openDialog(`<h2>${esc(title)}</h2><div class="muted ${danger?'destructive-warning':''}">${danger?`<strong>${esc(text)}</strong>`:esc(text)}</div><div class="dialog-actions"><button class="secondary" onclick="gp.cancelConfirm()">Cancel</button><button class="${danger?'danger':''}" onclick="gp.confirmNow()">${esc(confirmLabel)}</button></div>`);}
function formDialog(title,body,confirmLabel,onConfirm,cancelAction='gp.closeDialog()'){window.__gpFormConfirm=onConfirm;openDialog(`<h2>${esc(title)}</h2>${body}<div class="dialog-actions"><button type="button" class="secondary" onclick="${cancelAction}">Cancel</button><button type="button" onclick="gp.formConfirm()">${esc(confirmLabel)}</button></div>`);}
function openDialog(inner){let root=$('#dialog-root');if(!root){document.body.insertAdjacentHTML('beforeend','<div id="dialog-root"></div>');root=$('#dialog-root');}root.innerHTML=`<div class="dialog-backdrop" onclick="if(event.target===this)gp.closeDialog()"><div class="dialog">${inner}</div></div>`;localizeDom(root,languageCode(state));}
function closeDialog(){trainingSyncReviewToken++;const skippedExerciseNote=!!window.__gpExerciseNote;window.__gpExerciseNote=null;const r=$('#dialog-root');if(r)r.innerHTML='';window.__gpConfirm=window.__gpCancel=window.__gpFormConfirm=null;if(skippedExerciseNote)continuePostSetQueue();}


function socialErrorMessage(err){return String(err?.message||err||S('Something went wrong.','Radās kļūda.'));}
function socialEffortKey(value){const v=String(value||'').trim().toLowerCase().replaceAll('_','-').replaceAll(' ','-');if(v==='very-hard')return'very-hard';if(['comfortable','challenging','hard','failure','aborted','unknown'].includes(v))return v;return'unknown';}
function socialEffortLabel(value){switch(socialEffortKey(value)){case'comfortable':return S('Comfortable','Komfortabli');case'challenging':return S('Challenging','Izaicinoši');case'hard':return S('Hard','Grūti');case'very-hard':return S('Very hard','Ļoti grūti');case'failure':return S('Failure','Neveiksme');case'aborted':return S('Aborted','Pārtraukts');default:return S('No effort data','Nav slodzes datu');}}
function normalizeFriends(rows){const seen=new Set();return (Array.isArray(rows)?rows:[]).filter(f=>{const id=String(f?.user_id||'');if(!id||seen.has(id))return false;seen.add(id);return true;});}
function updateSocialBadgeDom(){
  const slot=document.querySelector('.nav button[data-route="friends"] .nav-icon-wrap');
  if(!slot)return;
  let badge=slot.querySelector('.nav-badge');
  if(socialUi.unseen&&!badge){slot.insertAdjacentHTML('beforeend','<i class="nav-badge"></i>');badge=slot.querySelector('.nav-badge');}
  if(!socialUi.unseen&&badge)badge.remove();
}
async function refreshSocialBadge(){
  if(!socialConfigured()||!socialSignedIn()){socialUi.unseen=false;updateSocialBadgeDom();return;}
  try{
    const [unseen,notifications]=await Promise.all([hasUnseen(),listNotifications(20)]);
    socialUi.unseen=unseen;
    socialUi.notifications=Array.isArray(notifications)?notifications:[];
    const delivered=socialNotifiedIds();
    for(const n of (Array.isArray(notifications)?notifications:[])){
      if(!n?.id||delivered.has(n.id))continue;
      let title='',body='';
      if(n.notification_type==='friend_request'){
        title=S('New friend request','Jauns draudzības uzaicinājums');
        body=`${n.display_name} ${S('sent you a friend request.','nosūtīja tev draudzības uzaicinājumu.')}`;
      }else if(n.notification_type==='friend_accepted'){
        title=S('Friend request accepted','Draudzības uzaicinājums apstiprināts');
        body=`${n.display_name} ${S('accepted your friend request.','apstiprināja tavu draudzības uzaicinājumu.')}`;
      }else if(n.notification_type==='activity_shared'){
        title=S('New shared workout','Jauna kopīgota aktivitāte');
        body=`${n.display_name} ${S('shared new workout activity.','kopīgoja jaunu treniņa aktivitāti.')}`;
      }else continue;
      if(await showBrowserNotification(title,body,`gym-social-${n.id}`))markSocialNotificationDelivered(n.id);
    }
    updateSocialBadgeDom();
    if(route.name==='friends'&&!document.querySelector('.dialog-backdrop'))render();
  }catch{}
}
async function enterFriends(){
  if(!socialConfigured()||!socialSignedIn()){socialUi.loaded=false;render();return;}
  socialUi.loading=true;render();
  try{
    await syncComparisonHistory();
    const [profile,friends,requests,notifications,timeline]=await Promise.all([
      getMyProfile(),listFriends(),listIncomingRequests(),listNotifications(20),getTimeline('1970-01-01T00:00:00.000Z')
    ]);
    socialUi.profile=profile;socialUi.friends=normalizeFriends(friends);socialUi.requests=requests||[];socialUi.notifications=notifications||[];socialUi.timeline=(timeline||[]).filter(e=>!socialDeletePending.has(e.id));
    if(socialUi.timelineDays==null||socialUi.timelineEndMs==null){const DAY=86400000,end=Date.now(),monthStart=end-30*DAY,times=socialUi.timeline.map(e=>new Date(e.occurred_at).getTime()).filter(Number.isFinite),earliest=times.length?Math.min(...times):monthStart;socialUi.timelineDays=earliest>monthStart?Math.max(1,(end-earliest)/DAY):30;socialUi.timelineEndMs=end;}
    socialUi.feed=[];socialUi.beforeAt=null;socialUi.beforeId=null;socialUi.hasMore=true;socialUi.loaded=true;
    await loadMoreFriendsFeed();await markSeen();socialUi.unseen=false;
  }catch(e){toast(socialErrorMessage(e));}
  finally{socialUi.loading=false;render();}
}
async function loadMoreFriendsFeed(){
  if(!socialSignedIn()||socialUi.loadingFeed||!socialUi.hasMore)return;
  socialUi.loadingFeed=true;
  try{const rows=await getFeed(socialUi.beforeAt,socialUi.beforeId,20),rawList=Array.isArray(rows)?rows:[],list=rawList.filter(e=>!socialDeletePending.has(e.id));socialUi.feed.push(...list);if(rawList.length<20)socialUi.hasMore=false;if(rawList.length){const last=rawList[rawList.length-1];socialUi.beforeAt=last.occurred_at;socialUi.beforeId=last.id;}}catch(e){toast(socialErrorMessage(e));}
  finally{socialUi.loadingFeed=false;render();}
}
async function openFriendComparison(friendId){socialUi.compareFriendId=friendId;socialUi.compareExercises=[];socialUi.compareExerciseId=null;socialUi.comparePoints=[];try{const rows=await listCommonComparableExercises(friendId);socialUi.compareExercises=Array.isArray(rows)?rows:[];if(socialUi.compareExercises.length)socialUi.compareExerciseId=socialUi.compareExercises[0].canonical_exercise_id||socialUi.compareExercises[0].canonicalExerciseId;await loadFriendComparison();}catch(e){toast(socialErrorMessage(e));}render();}
async function setFriendCompareExercise(id){socialUi.compareExerciseId=id;await loadFriendComparison();render();}
async function loadFriendComparison(){if(!socialUi.compareFriendId||!socialUi.compareExerciseId)return;try{const rows=await getExerciseComparison(socialUi.compareFriendId,socialUi.compareExerciseId,null);socialUi.comparePoints=Array.isArray(rows)?rows:[];}catch(e){toast(socialErrorMessage(e));}}
function toggleFriendComparison(){socialUi.compareExpanded=!socialUi.compareExpanded;render();}
function renderFriendComparison(){if(!socialUi.friends.length)return'';const chevron=expandChevron('details-chevron');if(!socialUi.compareExpanded)return `<div class="card friend-comparison-card"><button type="button" class="friend-comparison-head" onclick="gp.toggleFriendComparison()"><span class="title">${esc(S('Compare exercise progress','Salīdzināt vingrinājuma progresu'))}</span>${chevron}</button></div>`;const friendOpts=socialUi.friends.map(f=>`<option value="${f.user_id}" ${f.user_id===socialUi.compareFriendId?'selected':''}>${esc(f.display_name)}</option>`).join('');const exerciseOpts=socialUi.compareExercises.map(x=>{const id=x.canonical_exercise_id||x.canonicalExerciseId,name=x.name_en||x.name||canonicalName(canonicalExerciseById(id),languageCode(state));return `<option value="${id}" ${id===socialUi.compareExerciseId?'selected':''}>${esc(name)}</option>`;}).join('');let body=`<div class="small">${esc(S('Choose a friend to see mutually eligible catalogue exercises.','Izvēlies draugu, lai redzētu savstarpēji salīdzināmos kataloga vingrinājumus.'))}</div>`;if(socialUi.compareFriendId)body=`<select onchange="gp.openFriendComparison(this.value)"><option value="">${esc(S('Choose friend','Izvēlies draugu'))}</option>${friendOpts}</select><select onchange="gp.setFriendCompareExercise(this.value)">${exerciseOpts||`<option>${esc(S('No common comparable exercises','Nav kopīgu salīdzināmu vingrinājumu'))}</option>`}</select><div class="note friend-comparison-help"><strong>Estimated 1-rep max (e1RM)</strong> estimates the maximum weight for one clean repetition from a qualifying working set. Only explicitly selected programme occurrences and exact matching catalogue exercises are compared.</div>${renderFriendComparisonChart()}`;else body=`<select onchange="gp.openFriendComparison(this.value)"><option value="">${esc(S('Choose friend','Izvēlies draugu'))}</option>${friendOpts}</select>${body}`;return `<div class="card stack friend-comparison-card"><button type="button" class="friend-comparison-head" onclick="gp.toggleFriendComparison()"><span class="title">${esc(S('Compare exercise progress','Salīdzināt vingrinājuma progresu'))}</span>${chevron}</button>${body}</div>`;}
function renderFriendComparisonChart(){const rows=socialUi.comparePoints||[],me=socialUser()?.id,parsed=rows.map(r=>({userId:r.user_id??r.userId,time:new Date(r.occurred_at??r.occurredAt).getTime(),value:Number(r.e1rm_kg??r.e1rmKg),labels:r.source_labels??r.sourceLabels??[]})).filter(p=>p.userId&&Number.isFinite(p.time)&&Number.isFinite(p.value));if(!parsed.length)return'<div class="small">No comparison points yet.</div>';const selectedFriendId=socialUi.compareFriendId,friendId=parsed.some(p=>p.userId===selectedFriendId)?selectedFriendId:parsed.find(p=>p.userId!==me)?.userId||selectedFriendId,W=Math.max(276,Math.min(716,(window.visualViewport?.width||window.innerWidth||760)-44)),H=250,L=58,R=8,T=16,B=16,vals=parsed.map(p=>p.value),axis=niceChartAxis(Math.min(...vals),Math.max(...vals),{targetIntervals:5,weight:true}),low=axis.low,high=axis.high,range=Math.max(.001,high-low),rawMinT=Math.min(...parsed.map(p=>p.time)),rawMaxT=Math.max(...parsed.map(p=>p.time)),today=now(),historyDays=Math.max(0,(today-rawMinT)/86400000),minT=rawMinT,maxT=historyDays<30?Math.max(today,rawMaxT):rawMaxT,x=t=>maxT===minT?L+(W-L-R)/2:L+(W-L-R)*(t-minT)/(maxT-minT),y=v=>T+(H-T-B)*(1-(v-low)/range),colors=new Map([[me,COLORS.blue],[friendId,COLORS.red]]);let grid='',paths='',dots='';for(const tick of axis.ticks.slice().reverse()){const yy=y(tick);grid+=`<line class="chart-grid" vector-effect="non-scaling-stroke" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis" x="${L-6}" y="${yy+4}" text-anchor="end">${compactTick(tick,axis.step)} kg</text>`;}const orderedIds=[me,friendId,...new Set(parsed.map(p=>p.userId))].filter((id,i,a)=>id&&a.indexOf(id)===i);for(const uid of orderedIds){const pts=parsed.filter(p=>p.userId===uid).sort((a,b)=>a.time-b.time),color=colors.get(uid)||COLORS.gray;if(!pts.length)continue;if(pts.length>=2){let d=`M ${x(pts[0].time)} ${y(pts[0].value)}`;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],ax=x(a.time),ay=y(a.value),bx=x(b.time),by=y(b.value),dx=(bx-ax)*.36;d+=` C ${ax+dx} ${ay}, ${bx-dx} ${by}, ${bx} ${by}`;}paths+=`<path d="${d}" stroke="${color}" class="chart-line" vector-effect="non-scaling-stroke"/>`;}for(const p of pts){const overlaps=parsed.some(q=>q.userId!==uid&&Math.abs(q.time-p.time)<1000&&Math.abs(q.value-p.value)<.001);if(overlaps&&uid===friendId)dots+=`<circle cx="${x(p.time)}" cy="${y(p.value)}" r="7" fill="none" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;else dots+=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${x(p.time)}" cy="${y(p.value)}" r="${pts.length===1?5.5:4}" fill="${color}"/>`;if(pts.length===1)dots+=`<circle cx="${x(p.time)}" cy="${y(p.value)}" r="8" fill="none" stroke="${color}" stroke-width="1.5" opacity=".7" vector-effect="non-scaling-stroke"/>`;}}const friendName=socialUi.friends.find(f=>f.user_id===friendId)?.display_name||S('Friend','Draugs'),minePts=parsed.filter(p=>p.userId===me),friendPts=parsed.filter(p=>p.userId===friendId),mine=minePts.length,theirs=friendPts.length,uniqueLabels=pts=>[...new Set(pts.flatMap(p=>Array.isArray(p.labels)?p.labels:[]).filter(Boolean))],mineLabels=uniqueLabels(minePts),friendLabels=uniqueLabels(friendPts),included=(mineLabels.length||friendLabels.length)?`<div class="friend-source-list"><div class="small">${esc(S('Included programme occurrences','Iekļautie programmas ieraksti'))}</div>${mineLabels.map(l=>`<div style="color:${COLORS.blue}">● ${esc(l)}</div>`).join('')}${friendLabels.map(l=>`<div style="color:${COLORS.red}">● ${esc(l)}</div>`).join('')}</div>`:'';return `<div class="friend-chart-legend"><span style="color:${COLORS.blue}">● ${esc(S('You','Tu'))} (${mine})</span><span style="color:${COLORS.red}">● ${esc(friendName)} (${theirs})</span></div><div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${paths}${dots}</svg></div>${included}`;}
function programmeComparisonLabel(te){
  const u=getUserExercise(state,te.userExerciseId),w=getWorkout(te.workoutId),same=state.template_exercises.filter(x=>x.workoutId===te.workoutId&&x.userExerciseId===te.userExerciseId).sort((a,b)=>a.position-b.position),n=same.findIndex(x=>x.id===te.id)+1;
  return `${w?.name||'Workout'} · ${u?.displayName||te.name||'Exercise'}${same.length>1?` · #${n}`:''}`;
}
function selectedComparisonSources(){
  const out=new Map();
  for(const te of state.template_exercises){
    if(te.compareWithFriends!==true||!te.programmeExerciseId)continue;
    const u=getUserExercise(state,te.userExerciseId);if(!isFriendComparableUserExercise(u))continue;
    out.set(te.programmeExerciseId,{canonicalExerciseId:u.canonicalExerciseId,label:programmeComparisonLabel(te)});
  }
  return out;
}
function comparisonPointsForSession(sessionId,selected=selectedComparisonSources()){
  const s=getSession(sessionId);if(!s||!['COMPLETE','ABORTED'].includes(s.status))return[];
  const grouped=new Map();
  for(const e of sessionExercises(state,s.id)){
    const source=selected.get(e.programmeExerciseId);if(!source)continue;
    const sets=exerciseSets(state,e.id);
    if(e.status!=='COMPLETE')continue;
    if(s.status==='ABORTED'&&sets.some(x=>x.status!=='COMPLETE'))continue;
    const best=heaviestQualifyingE1rm(sets);if(best==null)continue;
    const key=source.canonicalExerciseId,old=grouped.get(key);
    if(!old)grouped.set(key,{clientPointId:`${s.id}:${key}:${E1RM_FORMULA_VERSION}`,canonicalExerciseId:key,occurredAt:new Date(s.endedAt||s.startedAt||Date.now()).toISOString(),e1rmKg:best,formulaVersion:E1RM_FORMULA_VERSION,sourceProgrammeExerciseIds:[e.programmeExerciseId],sourceLabels:[source.label]});
    else{
      if(best>old.e1rmKg)old.e1rmKg=best;
      if(e.programmeExerciseId&&!old.sourceProgrammeExerciseIds.includes(e.programmeExerciseId))old.sourceProgrammeExerciseIds.push(e.programmeExerciseId);
      if(!old.sourceLabels.includes(source.label))old.sourceLabels.push(source.label);
    }
  }
  return [...grouped.values()];
}
function comparisonPointsForSelectedHistory(){const selected=selectedComparisonSources();return state.workout_sessions.filter(s=>['COMPLETE','ABORTED'].includes(s.status)).flatMap(s=>comparisonPointsForSession(s.id,selected));}
async function syncComparisonHistory(){if(!socialConfigured()||!socialSignedIn())return;await replaceComparisonPoints(comparisonPointsForSelectedHistory());}

function renderFriends(){
  const configured=socialConfigured(),signed=socialSignedIn(),profile=socialUi.profile;
  let c=`<div class="friends-head"><div class="friends-head-top"><h1>${esc(S('Friends','Draugi'))}</h1></div>${signed?`<div class="friends-head-action-row"><button class="tiny-btn ghost social-add-friend" onclick="gp.openAddFriend()">+ ${esc(S('Add friend','Pievienot draugu'))}</button></div>`:''}</div>`;
  if(!configured){c+=`<div class="card"><div class="title">${esc(S('Friends backend is not configured','Draugu serveris nav konfigurēts'))}</div><div class="note">${esc(S('Add your Supabase publishable key to social-config.js. Everything else in Gym Progress continues to work offline.','Ievieto Supabase publicējamo atslēgu social-config.js failā. Pārējā Gym Progress darbība turpinās bezsaistē.'))}</div></div>`;return shell(c);}
  if(!signed){c+=`<div class="card social-onboarding"><div class="title">${esc(S('Log in to use Friends','Pieslēdzies, lai izmantotu Draugus'))}</div><div class="note">${esc(S('Friends requires your Gym Progress account. Your private programme, workout history and Tracker are shared only through account sync, never with friends. Social cards are published only when you select them.','Draugu sadaļai nepieciešams Gym Progress konts. Privātā programma, treniņu vēsture un Tracker ar draugiem netiek kopīgoti; tie tiek sinhronizēti tikai tavā kontā. Sociālās kartītes publicē tikai tad, kad tās pats izvēlies.'))}</div><button class="full" onclick="gp.openAccount()">${esc(S('Log in','Pieslēgties'))}</button></div>`;return shell(c);}
  if(socialUi.loading&&!socialUi.loaded)c+=`<div class="card"><div class="note">${esc(S('Loading friends…','Ielādē draugus…'))}</div></div>`;
  else{
    const acceptedUpdates=(socialUi.notifications||[]).filter(n=>n.notification_type==='friend_accepted');
    if(acceptedUpdates.length){c+=`<div class="stack social-updates">${acceptedUpdates.map(n=>`<div class="card compact"><strong>${esc(S('Friend request accepted','Draudzības uzaicinājums apstiprināts'))}</strong><div class="small">${esc(`${n.display_name} ${S('accepted your friend request.','apstiprināja tavu draudzības uzaicinājumu.')}`)}</div></div>`).join('')}</div>`;}
    if(socialUi.requests.length){c+=`<h3>${esc(S('Friend requests','Draudzības uzaicinājumi'))}</h3><div class="stack">${socialUi.requests.map(r=>`<div class="card compact friend-request-card"><div class="row between"><strong>${esc(r.display_name)}</strong><div class="row"><button class="tiny-btn" onclick="gp.acceptSocialRequest('${r.request_id}')">${esc(S('Accept','Apstiprināt'))}</button><button class="ghost tiny-btn" onclick="gp.rejectSocialRequest('${r.request_id}')">${esc(S('Decline','Noraidīt'))}</button></div></div></div>`).join('')}</div>`;}
    if(socialUi.friends.length){
      c+=`<div class="friends-panel ${socialUi.friendsExpanded?'expanded':''}"><button class="friends-list-toggle" onclick="gp.toggleFriendsList()" aria-expanded="${socialUi.friendsExpanded}"><span>${esc(S('Friends','Draugi'))} <span class="small">(${socialUi.friends.length})</span></span>${expandChevron(`friends-toggle-chevron ${socialUi.friendsExpanded?'expanded':''}`)}</button>${socialUi.friendsExpanded?`<div class="friends-list">${socialUi.friends.map(f=>`<div class="friend-row"><span>${esc(f.display_name)}</span><button class="ghost tiny-btn friend-remove" onclick="gp.removeSocialFriend('${f.user_id}')">${esc(S('Remove','Noņemt'))}</button></div>`).join('')}</div>`:''}</div>`;
    }
    c+=renderFriendComparison();
    c+=renderFriendsTimeline();
    c+=`<div class="row between friends-feed-title"><h2>${esc(S('Activity','Aktivitātes'))}</h2><span class="small">${socialUi.friends.length} ${esc(S('friends','draugi'))}</span></div>`;
    if(!socialUi.feed.length)c+=`<div class="card empty"><div class="note">${esc(S('No shared activity yet.','Pagaidām nav kopīgotu aktivitāšu.'))}</div></div>`;
    else c+=`<div class="stack social-feed">${socialUi.feed.map(renderSocialEvent).join('')}</div>${socialUi.hasMore?`<button class="full secondary" onclick="gp.loadMoreFriendsFeed()">${esc(S('Load 20 more','Ielādēt vēl 20'))}</button>`:''}`;
  }
  return shell(c);
}
function socialTimelineWindow(){
  const DAY=86400000,nowMs=Date.now(),times=socialUi.timeline.map(e=>new Date(e.occurred_at).getTime()).filter(Number.isFinite),earliest=times.length?Math.min(...times):nowMs-30*DAY;
  if(socialUi.timelineDays==null||!Number.isFinite(socialUi.timelineDays)){const monthStart=nowMs-30*DAY;socialUi.timelineDays=earliest>monthStart?Math.max(1,(nowMs-earliest)/DAY):30;}
  if(socialUi.timelineEndMs==null||!Number.isFinite(socialUi.timelineEndMs))socialUi.timelineEndMs=nowMs;
  socialUi.timelineDays=Math.max(1,Math.min(36500,socialUi.timelineDays));
  const span=socialUi.timelineDays*DAY,maxEnd=nowMs,minEnd=earliest+span<=maxEnd?earliest+span:maxEnd;
  socialUi.timelineEndMs=Math.max(minEnd,Math.min(maxEnd,socialUi.timelineEndMs));
  return{DAY,earliest,start:socialUi.timelineEndMs-span,end:socialUi.timelineEndMs,span};
}
function compactSocialTimelineSpan(days){if(days<45)return`${Math.max(1,Math.round(days))}d`;if(days<730)return`${Math.max(1,Math.round(days/30))}mo`;const y=days/365;return`${y<10?y.toFixed(1):Math.round(y)}y`;}
function socialTimelineDate(ms){return new Intl.DateTimeFormat(localeFor(languageCode(state)),{day:'numeric',month:'short',year:socialUi.timelineDays>330?'2-digit':undefined}).format(new Date(ms));}
function renderFriendsTimeline(){
  const me={user_id:socialUser()?.id,display_name:socialUi.profile?.display_name||S('You','Tu')};const people=[me,...socialUi.friends.filter(f=>f.user_id!==me.user_id)],win=socialTimelineWindow();
  const rows=people.map(p=>{const dots=socialUi.timeline.filter(e=>e.user_id===p.user_id).map(e=>{const at=new Date(e.occurred_at).getTime(),visible=Number.isFinite(at)&&at>=win.start&&at<=win.end,x=visible?Math.max(0,Math.min(100,(at-win.start)/win.span*100)):0;return `<span class="friend-timeline-dot difficulty ${esc(socialEffortKey(e.effort))}" data-at="${Number.isFinite(at)?at:''}" style="left:${x}%;${visible?'':'display:none'}" aria-hidden="true"></span>`;}).join('');return `<div class="friend-timeline-row"><div class="friend-timeline-name">${esc(p.user_id===me.user_id?S('You','Tu'):p.display_name)}</div><div class="friend-timeline-track">${dots}</div></div>`;}).join('');
  const endLabel=Math.abs(Date.now()-win.end)<6*3600000?S('Today','Šodien'):socialTimelineDate(win.end);
  return `<div class="card friends-timeline-card"><div class="row between"><div class="title">${esc(S('Shared rhythm','Kopīgais ritms'))}</div><div class="small" id="friends-timeline-span">${esc(compactSocialTimelineSpan(socialUi.timelineDays))}</div></div><div class="friends-timeline-gesture" aria-label="${esc(S('Shared workout timeline. Drag to pan and pinch to zoom.','Kopīgoto treniņu laika līnija. Velc, lai pārvietotu, un savelc/izplet, lai mainītu mērogu.'))}"><div class="friends-timeline">${rows}</div><div class="row between small timeline-labels"><span id="friends-timeline-start">${esc(socialTimelineDate(win.start))}</span><span id="friends-timeline-end">${esc(endLabel)}</span></div></div></div>`;
}
function updateFriendsTimelineDom(){
  const root=document.querySelector('.friends-timeline-gesture');if(!root)return;const win=socialTimelineWindow();
  root.querySelectorAll('.friend-timeline-dot[data-at]').forEach(dot=>{const at=Number(dot.dataset.at),visible=Number.isFinite(at)&&at>=win.start&&at<=win.end;dot.style.display=visible?'':'none';if(visible)dot.style.left=`${Math.max(0,Math.min(100,(at-win.start)/win.span*100))}%`;});
  const a=$('#friends-timeline-start'),b=$('#friends-timeline-end'),sp=$('#friends-timeline-span');if(a)a.textContent=socialTimelineDate(win.start);if(b)b.textContent=Math.abs(Date.now()-win.end)<6*3600000?S('Today','Šodien'):socialTimelineDate(win.end);if(sp)sp.textContent=compactSocialTimelineSpan(socialUi.timelineDays);
}
function bindFriendsTimeline(){
  const root=document.querySelector('.friends-timeline-gesture');if(!root||root.dataset.bound==='1')return;root.dataset.bound='1';const pointers=new Map();let lastSingleX=null,lastDistance=null,lastCenterX=null;
  const width=()=>Math.max(1,root.getBoundingClientRect().width);
  const pan=dx=>{const win=socialTimelineWindow();socialUi.timelineEndMs-=dx/width()*win.span;updateFriendsTimelineDom();};
  const zoom=(factor,focusX)=>{if(!Number.isFinite(factor)||factor<=0)return;const old=socialTimelineWindow(),frac=Math.max(0,Math.min(1,focusX/width())),focus=old.start+old.span*frac,newDays=Math.max(1,Math.min(36500,socialUi.timelineDays/factor)),newSpan=newDays*old.DAY;socialUi.timelineDays=newDays;socialUi.timelineEndMs=focus+newSpan*(1-frac);updateFriendsTimelineDom();};
  root.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});root.setPointerCapture?.(e.pointerId);if(pointers.size===1){lastSingleX=e.clientX;lastDistance=null;lastCenterX=null;}else if(pointers.size===2){const pts=[...pointers.values()],dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;lastDistance=Math.hypot(dx,dy);lastCenterX=(pts[0].x+pts[1].x)/2;lastSingleX=null;}});
  root.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&lastSingleX!=null){const dx=e.clientX-lastSingleX;lastSingleX=e.clientX;pan(dx);}else if(pointers.size>=2){const pts=[...pointers.values()].slice(0,2),dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,dist=Math.max(1,Math.hypot(dx,dy)),center=(pts[0].x+pts[1].x)/2,rect=root.getBoundingClientRect();if(lastCenterX!=null)pan(center-lastCenterX);if(lastDistance!=null)zoom(dist/lastDistance,center-rect.left);lastDistance=dist;lastCenterX=center;}});
  const up=e=>{pointers.delete(e.pointerId);if(pointers.size===1){const p=[...pointers.values()][0];lastSingleX=p.x;lastDistance=null;lastCenterX=null;}else if(!pointers.size){lastSingleX=null;lastDistance=null;lastCenterX=null;}};root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);
  root.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();const rect=root.getBoundingClientRect(),factor=Math.exp(-e.deltaY*.006);zoom(factor,e.clientX-rect.left);},{passive:false});
  updateFriendsTimelineDom();
}
function cleanSocialComment(value){const text=String(value??'').trim();return !text||text.toLowerCase()==='null'?null:text;}
function renderSocialEvent(e){
  const own=e.user_id===socialUser()?.id;
  const record=e.event_type!=='workout_summary';
  const icon=record?'./icons/social-record-trophy.png':'./icons/social-completed-workout.png';
  const iconAlt=record?S('Exercise record','Vingrinājuma rekords'):S('Completed workout','Pabeigts treniņš');
  let body='';
  if(!record){
    const ex=Array.isArray(e.exercise_names)?e.exercise_names.join(', '):'';
    body=`<div class="social-event-main"><strong>${esc(e.workout_name||'')}</strong><span>${esc(formatDuration(Number(e.duration_seconds||0)*1000))} · ${esc(socialEffortLabel(e.effort))}</span></div>${ex?`<div class="small">${esc(ex)}</div>`:''}${e.progress_percent!=null?`<div class="social-progress">${esc(S('Progress','Progress'))}: ${esc(fmtPct(Number(e.progress_percent)))}</div>`:''}`;
  }else{
    const value=e.record_kind==='weight'?formatKg(Number(e.record_value)): `${Number(e.record_value)} ${S('reps','atk.')}`;
    body=`<div class="social-record"><strong>${esc(e.exercise_name||'')}</strong><span>${esc(e.record_kind==='weight'?S('New weight record','Jauns svara rekords'):S('New rep record','Jauns atkārtojumu rekords'))}: <b>${esc(value)}</b>${e.increase_percent!=null?` · ${esc(fmtPct(Number(e.increase_percent)))}`:''}</span></div>`;
  }
  const comment=cleanSocialComment(e.comment);
  return `<div class="card social-event"><div class="social-event-head"><div><div class="social-author">${esc(own?S('You','Tu'):e.display_name)}</div><div class="small">${esc(dateTime(new Date(e.occurred_at).getTime()))}</div></div><img class="social-type-icon" src="${icon}" alt="${esc(iconAlt)}"></div>${body}${comment?`<div class="social-comment">${esc(comment)}</div>`:''}${own?`<div class="social-event-footer"><button class="icon-btn social-delete" title="${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}" aria-label="${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}" onclick="gp.deleteSocialEvent('${e.id}')" ${socialDeletePending.has(e.id)?'disabled':''}>×</button></div>`:''}</div>`;
}
function openAccount(){
  if(!socialSignedIn()){
    openDialog(`<h2>${esc(S('Log in to Gym Progress','Pieslēgties Gym Progress'))}</h2><div class="dialog-copy">${esc(S('One account is used for private device sync and Friends/social sharing. Gym Progress still works offline without an account.','Viens konts tiek izmantots privātai ierīču sinhronizācijai un Draugu/sociālajai kopīgošanai. Gym Progress arī bez konta pilnībā darbojas bezsaistē.'))}</div><label class="field">${esc(S('E-mail','E-pasts'))}</label><input id="social-email" type="email" maxlength="254" autocomplete="email" placeholder="name@example.com"><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.socialSendCode()">${esc(S('Send code','Nosūtīt kodu'))}</button></div>`);return;
  }
  const name=accountDisplayLabel(),email=socialUser()?.email||'';
  openDialog(`<h2>${esc(S('Account','Konts'))}</h2><div class="account-dialog-identity"><strong>${esc(name)}</strong><div class="small muted">${esc(email)}</div></div><div class="stack"><button class="secondary full" onclick="gp.editSocialName()">${esc(S('Change name','Mainīt vārdu'))}</button><button class="secondary full" onclick="gp.openTrainingSyncReview()">${esc(S('Review & sync now','Pārskatīt un sinhronizēt'))}</button><button class="secondary full" onclick="gp.socialSignOut()">${esc(S('Sign out','Iziet'))}</button><div class="divider"></div><button class="danger full" onclick="gp.requestDeleteAccount()">${esc(S('Delete account','Dzēst kontu'))}</button></div>`);
}
function requestDeleteAccount(){
  confirmDialog(S('Delete account and all cloud data?','Dzēst kontu un visus mākoņa datus?'),S('WARNING: this permanently deletes your Gym Progress account, synced programme/history/Tracker, shared cards, friend relationships and all other data owned by this account in Supabase. The local training copy on this device will also be erased. There is no undo.','SVARĪGS BRĪDINĀJUMS: tas neatgriezeniski izdzēsīs tavu Gym Progress kontu, sinhronizēto programmu/vēsturi/Tracker, kopīgotās kartītes, draudzības un visus citus kontam piederošos datus Supabase. Tiks izdzēsta arī lokālā treniņu kopija šajā ierīcē. Atjaunošana nav iespējama.'),S('Continue','Turpināt'),()=>{closeDialog();setTimeout(()=>confirmDialog(S('FINAL ACCOUNT DELETION WARNING','PĒDĒJAIS KONTA DZĒŠANAS BRĪDINĀJUMS'),S('This cannot be undone. Create a backup now if you might need your training data later.','To nevar atsaukt. Ja treniņu dati vēlāk var būt vajadzīgi, izveido rezerves kopiju tagad.'),S('DELETE ACCOUNT','DZĒST KONTU'),async()=>{try{await deleteMyAccount();await wipeState();state=defaults();socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null};await persist();closeDialog();nav('home');toast(S('Account and data deleted.','Konts un dati izdzēsti.'));}catch(e){toast(socialErrorMessage(e));}},true),30);},true);
}
async function socialSendCode(){const email=$('#social-email')?.value.trim();if(!email)return;try{await sendEmailOtp(email);window.__gpSocialEmail=email;openDialog(`<h2>${esc(S('Check your e-mail','Pārbaudi e-pastu'))}</h2><div class="dialog-copy">${esc(S('Enter the one-time code sent to','Ievadi vienreizējo kodu, kas nosūtīts uz'))} <strong>${esc(email)}</strong>.</div><input id="social-otp" class="social-otp-input" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.socialVerifyCode()">${esc(S('Verify','Apstiprināt'))}</button></div>`);}catch(e){toast(socialErrorMessage(e));}}
async function socialVerifyCode(){const token=$('#social-otp')?.value.trim(),email=window.__gpSocialEmail;if(!token||!email)return;try{await verifyEmailOtp(email,token);closeDialog();render();socialUi.profile=await getMyProfile().catch(()=>null);render();if(!socialUi.profile){setTimeout(async()=>{if(!socialSignedIn())return;socialUi.profile=await getMyProfile().catch(()=>null);render();},350);}if(route.name==='friends')await enterFriends();toast(S('Signed in.','Pieslēgšanās veiksmīga.'));void refreshSocialBadge();setTimeout(()=>void openTrainingSyncReview(),120);}catch(e){toast(socialErrorMessage(e));}}
async function socialSignOut(){confirmDialog(S('Sign out?','Iziet no konta?'),S('Signing out stops cloud sync and Friends, but does not delete local programme, history or Tracker data.','Izrakstīšanās aptur mākoņa sinhronizāciju un Draugus, bet nedzēš lokālo programmu, vēsturi vai Tracker datus.'),S('Sign out','Iziet'),async()=>{await signOutSocial();socialDeletePending.clear();socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null};closeDialog();render();});}
function toggleFriendsList(){socialUi.friendsExpanded=!socialUi.friendsExpanded;render();}
function openAddFriend(){openDialog(`<h2>${esc(S('Add friend','Pievienot draugu'))}</h2><div class="dialog-copy">${esc(S('Enter the exact e-mail used for their Gym Progress account. E-mail addresses are never shown in the feed.','Ievadi precīzu e-pastu, kas izmantots Gym Progress kontam. E-pasta adreses aktivitāšu plūsmā netiek rādītas.'))}</div><input id="friend-email" type="email" maxlength="254" autocomplete="off" placeholder="friend@example.com"><div id="friend-lookup-result"></div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.lookupSocialFriend()">${esc(S('Look up','Meklēt'))}</button></div>`);}
async function lookupSocialFriend(){const email=$('#friend-email')?.value.trim();if(!email)return;try{const r=await findFriend(email),root=$('#friend-lookup-result');if(!r){root.innerHTML=`<div class="note">${esc(S('No account found.','Konts nav atrasts.'))}</div>`;return;}window.__gpFriendEmail=email;root.innerHTML=`<div class="card compact"><strong>${esc(r.display_name)}</strong><div class="small">${esc(r.relationship==='friends'?S('Already friends','Jau draugi'):r.relationship==='outgoing_pending'?S('Request already sent','Uzaicinājums jau nosūtīts'):r.relationship==='incoming_pending'?S('They already invited you','Šis lietotājs jau tevi uzaicināja'):S('Gym Progress account','Gym Progress konts'))}</div>${r.relationship==='none'?`<button class="full" onclick="gp.sendSocialFriendRequest()">${esc(S('Send friend request','Nosūtīt uzaicinājumu'))}</button>`:''}</div>`;}catch(e){toast(socialErrorMessage(e));}}
async function sendSocialFriendRequest(){try{await sendFriendRequest(window.__gpFriendEmail);closeDialog();await enterFriends();toast(S('Friend request sent.','Draudzības uzaicinājums nosūtīts.'));}catch(e){toast(socialErrorMessage(e));}}
async function acceptSocialRequest(id){try{await acceptFriendRequest(id);await enterFriends();}catch(e){toast(socialErrorMessage(e));}}
async function rejectSocialRequest(id){try{await rejectFriendRequest(id);await enterFriends();}catch(e){toast(socialErrorMessage(e));}}
function removeSocialFriend(id){const name=socialUi.friends.find(f=>f.user_id===id)?.display_name||S('This friend','Šis draugs');confirmDialog(S('Remove friend?','Noņemt draugu?'),`${name} ${S('will be removed for both of you. Previously shared activity will no longer be mutually visible.','tiks noņemts no draugiem abiem lietotājiem. Jau kopīgotie ieraksti vairs nebūs savstarpēji redzami.')}`,S('Remove','Noņemt'),async()=>{try{await removeFriend(id);closeDialog();await enterFriends();toast(S('Friend removed.','Draugs noņemts.'));}catch(e){toast(socialErrorMessage(e));}},true);}
function editSocialName(){const current=socialUi.profile?.display_name||'';openDialog(`<h2>${esc(S('Name shown to friends','Vārds, ko redz draugi'))}</h2><input id="social-name" maxlength="60" value="${esc(current)}"><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.saveSocialName()">${esc(S('Save','Saglabāt'))}</button></div>`);}
async function saveSocialName(){const name=$('#social-name')?.value.trim();if(!name)return;try{await setDisplayName(name);socialUi.profile=await getMyProfile();closeDialog();if(route.name==='friends')await enterFriends();else render();}catch(e){toast(socialErrorMessage(e));}}
async function performOptimisticSocialDelete(event){
  if(!event?.id||socialDeletePending.has(event.id))return;
  const id=event.id,feedIndex=socialUi.feed.findIndex(e=>e.id===id),timelineIndex=socialUi.timeline.findIndex(e=>e.id===id),timelineEvent=timelineIndex>=0?socialUi.timeline[timelineIndex]:null;
  socialDeletePending.add(id);
  socialUi.feed=socialUi.feed.filter(e=>e.id!==id);
  if(timelineEvent){
    const siblingRemains=socialUi.feed.some(e=>e.user_id===event.user_id&&e.occurred_at===event.occurred_at);
    if(!siblingRemains)socialUi.timeline=socialUi.timeline.filter(e=>e.id!==id);
  }
  closeDialog();render();
  try{
    await deleteEvent(id);
    if(timelineEvent){
      try{const timeline=await getTimeline('1970-01-01T00:00:00.000Z');socialUi.timeline=(timeline||[]).filter(e=>!socialDeletePending.has(e.id));if(route.name==='friends')render();}catch{}
    }
  }catch(e){
    if(!socialUi.feed.some(x=>x.id===id)){const restored=socialUi.feed.slice(),at=Math.max(0,Math.min(feedIndex<0?restored.length:feedIndex,restored.length));restored.splice(at,0,event);socialUi.feed=restored;}
    if(timelineEvent&&!socialUi.timeline.some(x=>x.id===timelineEvent.id)){const restored=socialUi.timeline.slice(),at=Math.max(0,Math.min(timelineIndex<0?restored.length:timelineIndex,restored.length));restored.splice(at,0,timelineEvent);socialUi.timeline=restored;}
    if(route.name==='friends')render();toast(socialErrorMessage(e));
  }finally{socialDeletePending.delete(id);if(route.name==='friends')render();}
}
function deleteSocialEvent(id){
  if(socialDeletePending.has(id))return;
  const event=socialUi.feed.find(e=>e.id===id);if(!event)return;
  confirmDialog(S('Delete shared record?','Dzēst kopīgoto ierakstu?'),S('This removes only the social card. Your local workout remains unchanged.','Tiks dzēsta tikai kopīgotā kartīte. Tavs lokālais treniņš nemainīsies.'),S('Delete','Dzēst'),()=>{void performOptimisticSocialDelete(event);},true);
}
function showTimelineEvent(id){
  const e=socialUi.feed.find(x=>x.id===id)||socialUi.timeline.find(x=>x.id===id);if(!e)return;
  const feed=socialUi.feed.find(x=>x.id===id);if(feed){openDialog(renderSocialEvent(feed)+`<div class="dialog-actions"><button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);return;}
  const own=e.user_id===socialUser()?.id,progress=e.progress_percent!=null?`<div class="social-progress">${esc(S('Progress','Progress'))}: ${esc(fmtPct(Number(e.progress_percent)))}</div>`:'';
  openDialog(`<h2>${esc(e.workout_name||S('Shared workout','Kopīgots treniņš'))}</h2><div class="small">${esc(own?S('You','Tu'):e.display_name)} · ${esc(dateTime(new Date(e.occurred_at).getTime()))}</div><div class="dialog-copy">${esc(socialEffortLabel(e.effort))}</div>${progress}<div class="dialog-actions">${own?`<button class="danger" onclick="gp.deleteSocialEvent('${e.id}')">${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}</button>`:''}<button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);
}

function previousExerciseSets(userExerciseId,currentSessionId){
  const current=getSession(currentSessionId),startedAt=Number(current?.startedAt||Infinity);
  const exIds=state.session_exercises.filter(e=>{const s=getSession(e.sessionId);return e.userExerciseId===userExerciseId&&e.sessionId!==currentSessionId&&s?.status==='COMPLETE'&&Number(s.startedAt||0)<startedAt;}).map(e=>e.id);
  return state.performed_sets.filter(x=>exIds.includes(x.sessionExerciseId)&&x.status==='COMPLETE'&&(Number(x.actualReps)||0)>0);
}
function buildShareCards(sessionId){
  const s=getSession(sessionId);if(!s)return[];const metrics=sessionMetrics(state,s),diff=sessionDifficultyLevel(metrics,state.app_state,s.status),exs=sessionExercises(state,s.id);
  const cards=[{key:`workout-${crypto.randomUUID()}`,type:'workout_summary',title:s.workoutName,subtitle:`${formatDuration((s.endedAt||s.startedAt)-s.startedAt)} · ${socialEffortLabel(diff.key)}`,details:exs.map(e=>sessionDisplayName(e)).join(', '),selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'workout_summary',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,duration_seconds:Math.max(0,Math.round(((s.endedAt||s.startedAt)-s.startedAt)/1000)),effort:diff.key,progress_percent:metrics.progressPercent,exercise_names:exs.map(e=>sessionDisplayName(e))}}];
  for(const e of exs){const curr=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE'&&(Number(x.actualReps)||0)>0),prev=previousExerciseSets(e.userExerciseId,s.id);if(!curr.length||!prev.length)continue;
    if(e.equipment!==Equipment.BODYWEIGHT){const oldMax=Math.max(...prev.map(x=>Number(x.actualWeightKg)||0)),newMax=Math.max(...curr.map(x=>Number(x.actualWeightKg)||0));if(oldMax>0&&newMax>oldMax+1e-6){cards.push({key:`weight-${e.id}`,type:'exercise_record',title:sessionDisplayName(e),subtitle:`${S('New weight record','Jauns svara rekords')} · ${formatKg(newMax)} · ${fmtPct((newMax/oldMax-1)*100)}`,selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'exercise_record',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,effort:diff.key,exercise_name:sessionDisplayName(e),record_kind:'weight',record_value:newMax,previous_value:oldMax,record_unit:'kg',increase_percent:(newMax/oldMax-1)*100}});}}
    let best=null;for(const set of curr){const w=Number(set.actualWeightKg)||0,prior=prev.filter(x=>Math.abs((Number(x.actualWeightKg)||0)-w)<.001),old=prior.length?Math.max(...prior.map(x=>Number(x.actualReps)||0)):0,n=Number(set.actualReps)||0;if(old>0&&n>old){const pct=(n/old-1)*100;if(!best||pct>best.pct)best={n,old,w,pct};}}
    if(best)cards.push({key:`reps-${e.id}`,type:'exercise_record',title:sessionDisplayName(e),subtitle:`${S('New rep record','Jauns atkārtojumu rekords')} · ${best.n} ${S('reps','atk.')} · ${fmtPct(best.pct)}`,details:e.equipment===Equipment.BODYWEIGHT?'':`@ ${formatKg(best.w)}`,selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'exercise_record',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,effort:diff.key,exercise_name:sessionDisplayName(e),record_kind:'reps',record_value:best.n,previous_value:best.old,record_unit:'reps',increase_percent:best.pct}});
  }
  return cards;
}
function workoutConclusionHtml(sessionId){const s=getSession(sessionId);if(!s)return'';const m=sessionMetrics(state,s),diff=sessionDifficultyLevel(m,state.app_state,s.status),exs=sessionExercises(state,s.id),duration=formatDuration(Math.max(0,(s.endedAt||now())-s.startedAt));const exerciseRows=exs.map(e=>{const em=exerciseMetrics(state,e);let result;if(e.trackingMode===TrackingMode.TIME_ONLY){result=`${S('Duration','Ilgums')} ${formatDuration(em.totalDurationSeconds*1000)}`;if(e.equipment!==Equipment.BODYWEIGHT&&em.maxWeight>0)result+=` · ${S('Max.','Maks.')} ${formatKg(em.maxWeight)}`;}else if(e.equipment===Equipment.BODYWEIGHT)result=`${S('Max reps','Maks. atkārtojumi')} ${em.maxReps}`;else result=`${S('Max.','Maks.')} ${formatKg(em.maxWeight)}`;const attention=e.recommendation==='REDUCE'||['SLOWING','STALLED','DECLINING'].includes(e.trendState),positive=e.recommendation==='PROGRESS'&&!attention,trendClass=attention?'trend-attention':positive?'trend-progress':'';const intelligence=e.recommendation?`<div class="small conclusion-trend ${trendClass}"><strong>${esc(e.recommendation)}</strong> · ${esc(trendLabel(e.trendState))}${e.trendConfidence?` · ${esc(e.trendConfidence.toLowerCase())} ${esc(S('confidence','pārliecība'))}`:''}</div>`:'';return `<div class="conclusion-exercise-row"><div class="conclusion-exercise-copy"><div class="conclusion-exercise-name">${esc(sessionDisplayName(e))}</div>${intelligence}</div><strong class="conclusion-exercise-result">${esc(result)}</strong></div>`;}).join('');const counts=exs.reduce((a,e)=>{if(e.recommendation)a[e.recommendation]=(a[e.recommendation]||0)+1;return a;},{}),fatigueState=String(s.fatigueState||'NORMAL'),fatigueAttention=fatigueState!=='NORMAL',trendSummary=Object.keys(counts).length?`<div class="intelligence-summary"><div class="title">${esc(S('Workout trend','Treniņa tendence'))}</div><div class="small"><span class="${Number(counts.PROGRESS||0)>0?'trend-progress':''}">${Number(counts.PROGRESS||0)} PROGRESS</span> · ${Number(counts.HOLD||0)} HOLD · <span class="${Number(counts.REDUCE||0)>0?'trend-attention':''}">${Number(counts.REDUCE||0)} REDUCE</span></div><div class="small ${fatigueAttention?'trend-attention':''}"><strong>${esc(S('Overall','Kopumā'))} · ${esc(fatigueState.replaceAll('_',' '))}</strong></div><div class="small muted ${fatigueAttention?'trend-attention':''}">${esc(fatigueSummary(fatigueState))}</div></div>`:'';return `<section class="workout-conclusion"><div class="workout-complete-title">${esc(S('WORKOUT COMPLETE','TRENIŅŠ PABEIGTS'))}</div><h2>${esc(s.workoutName)}</h2><div class="conclusion-metrics"><div><span>${esc(S('Duration','Ilgums'))}</span><strong>${duration}</strong></div><div><span>${esc(S('Completed sets','Pabeigti piegājieni'))}</span><strong>${m.completedSets}</strong></div><div><span>${esc(S('Vol.','Apj.'))}</span><strong>${formatKgRounded(m.volume)}</strong></div><div><span>${esc(S('Effort','Piepūle'))}</span><strong>${esc(socialEffortLabel(diff.key))}</strong></div></div>${trendSummary}<div class="conclusion-exercises">${exerciseRows}</div>${s.note?`<div class="note">${esc(s.note)}</div>`:''}</section>`;}
async function showWorkoutFinishCelebration(sessionId,finishedAt){document.body.classList.add('workout-summary-open');await preloadFinishCelebration();const image=chooseFinishCelebration();let root=$('#dialog-root');if(!root){document.body.insertAdjacentHTML('beforeend','<div id="dialog-root"></div>');root=$('#dialog-root');}root.innerHTML=`<div class="finish-celebration" role="presentation"><img src="${esc(image)}" alt=""></div>`;setTimeout(()=>{if(root.querySelector('.finish-celebration'))root.innerHTML='';showWorkoutShareSummary(sessionId,finishedAt);},4400);}
function showWorkoutShareSummary(sessionId,finishedAt){window.__gpShareDraft={sessionId,finishedAt,cards:buildShareCards(sessionId)};renderShareSummary();}
function renderShareSummary({preserveScroll=false}={}){const d=window.__gpShareDraft;if(!d)return;document.body.classList.add('workout-summary-open');let root=$('#dialog-root');if(!root){document.body.insertAdjacentHTML('beforeend','<div id="dialog-root"></div>');root=$('#dialog-root');}const previous=root.querySelector('.share-summary-dialog'),savedScroll=preserveScroll?Number(previous?.scrollTop||0):0,savedPageY=preserveScroll?window.scrollY:0;const signed=socialSignedIn(),conclusion=workoutConclusionHtml(d.sessionId);const cards=d.cards.map((c,i)=>`<div class="share-summary-card ${signed?'clickable-share-card':''} ${c.selected?'selected':''}" ${signed?`onclick="gp.toggleShareCard(${i})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();gp.toggleShareCard(${i})}"`:''}><div class="row between"><div><div class="title">${esc(c.title)}</div><div class="small">${esc(c.subtitle||'')}</div></div><button class="share-toggle ${c.selected?'on':''}" onclick="event.stopPropagation();gp.toggleShareCard(${i})" ${signed?'':'disabled'} aria-label="${esc(S('Share','Kopīgot'))}" title="${esc(S('Share','Kopīgot'))}"><svg class="share-check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 9.4 17.4 19.5 7.3"/></svg></button></div>${c.details?`<div class="note">${esc(c.details)}</div>`:''}${signed&&c.selected?`<input class="share-comment" autocapitalize="sentences" maxlength="500" placeholder="${esc(S('Optional comment','Komentārs (nav obligāts)'))}" value="${esc(c.comment||'')}" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="gp.updateShareComment(${i},this.value)">`:''}</div>`).join('');root.innerHTML=`<div class="dialog-backdrop share-summary-backdrop"><div class="dialog share-summary-dialog">${conclusion}<div class="share-section-head"><div class="title share-section-title">${esc(S('Share','Kopīgot'))}</div><div class="small">${esc(signed?S('Nothing is shared automatically.','Nekas netiek kopīgots automātiski.'):S('Sign in under Friends to share future workouts.','Pieslēdzies sadaļā Draugi, lai kopīgotu turpmākos treniņus.'))}</div></div><div class="share-card-stack">${cards}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeShareSummary()">${esc(S('Done','Pabeigts'))}</button>${signed?`<button onclick="gp.publishShareSummary()" ${d.cards.some(c=>c.selected)?'':'disabled'}>${esc(S('Publish selected','Publicēt izvēlēto'))}</button>`:''}</div></div></div>`;if(preserveScroll)requestAnimationFrame(()=>{const dialog=root.querySelector('.share-summary-dialog');if(dialog)dialog.scrollTop=savedScroll;window.scrollTo(0,savedPageY);});}
function toggleShareCard(i){const d=window.__gpShareDraft;if(!d?.cards[i])return;d.cards[i].selected=!d.cards[i].selected;renderShareSummary({preserveScroll:true});}
function updateShareComment(i,v){const d=window.__gpShareDraft;if(d?.cards[i])d.cards[i].comment=String(v||'').slice(0,500);}
async function publishShareSummary(){const d=window.__gpShareDraft;if(!d)return;const chosen=d.cards.filter(c=>c.selected).map(c=>({...c.event,comment:c.comment?.trim()||null}));if(!chosen.length){closeShareSummary();return;}try{await publishEvents(chosen);toast(S('Shared with friends.','Kopīgots ar draugiem.'));void refreshSocialBadge();closeShareSummary();}catch(e){toast(socialErrorMessage(e));}}
function closeShareSummary(){const d=window.__gpShareDraft;window.__gpShareDraft=null;document.body.classList.remove('workout-summary-open');closeDialog();if(d&&state.app_state.motivationEnabled&&Number.isFinite(Number(d.finishedAt)))setTimeout(()=>showNextSessionPrompt(Number(d.finishedAt)),100);}

function confirmNow(){const f=window.__gpConfirm;if(f)f();}function cancelConfirm(){const f=window.__gpCancel;closeDialog();if(f)f();}async function formConfirm(){try{await window.__gpFormConfirm?.();}catch(e){console.error('Form save failed',e);toast(`${S('Could not save','Neizdevās saglabāt')}: ${e?.message||e}`);}}

window.addEventListener('scroll',()=>{if(route.name==='friends'&&socialSignedIn()&&socialUi.hasMore&&!socialUi.loadingFeed&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-320)void loadMoreFriendsFeed();},{passive:true});

window.gp={dismissUpdateAnnouncement,openAccount,requestDeleteAccount,openTrainingSyncReview,confirmTrainingSync,nav,selectWorkout,toggleWorkoutDetails,requestStart,startWorkout,resume,changeRirThreshold,changeMaxRampSets,changeTargetRirMin,changeTargetRirMax,setRirInputMax,setLanguage,openStarterWizard,starterSelectValue,renderStarterWizard,finishStarterProgramme,starterManualSetup,dismissStarterForNow,toggleAwake,toggleLastSetZeroRirAcceptable,toggleMotivation,changeInactivityDays,setReminderTime,requestNotificationPermission,openTrackerSettings,setTrackerNotifications,deleteTrackerItem,editTrackerItem,adjustTracker,setTrackerAmount,scheduleNextSession,skipNextSession,rescheduleNextSession,editDifficulty,addWorkout,renameWorkout,moveWorkout,deleteWorkout,addExercise,editExercise,exerciseExistingChanged,exerciseNameChanged,exerciseTrackingChanged,exerciseEquipmentChanged,exerciseTypeChanged,setCatalogueLinkForExercise,saveCatalogueLink,unlinkCatalogueExercise,applyCatalogueChoice,exerciseFormChangeLink,exerciseFormUnlink,joinSuperset,splitSuperset,moveExerciseBlock,moveExercise,deleteExercise,deleteSession,moreLogs,setProgressRange,setProgressExercise,setProgressMetric,setCustomStart,setCustomEnd,finishWarmup,startRamp,skipRamp,disableRampPermanently,finishRamp,startTimedSet,finishTimedSet,saveCardioSet,cancelCardioSet,adjustWeight,customWeight,adjustSupersetWeight,customSupersetWeight,toggleSupersetTimed,supersetComplete,adjustSupersetEntryReps,setSupersetRir,saveSupersetSet,skipSupersetSet,skipSuperset,setComplete,adjustEntryReps,setRir,saveSet,finishUnload,shiftRest,skipRest,skipSet,skipExercise,requestPostponeExercise,postponeExercise,requestReplaceExercise,selectReplacement,confirmReplacement,finishStretch,finishAndSave,closeWorkoutCelebration,applyAutoregulation,keepAutoregulationCurrent,applyFutureAdjustment,keepFutureAdjustmentCurrent,shiftFutureAdjustment,shiftProgression,acceptProgressionEdited,shiftProgressionReps,acceptProgressionReps,keepProgressionCurrent,undoLastSet,requestAbort,finishPartialWorkout,discardActiveWorkout,downloadBackup,pickRestore,restoreFile,downloadCsv,downloadDetailedJson,eraseData,eraseExerciseLogs,closeDialog,confirmNow,cancelConfirm,formConfirm,socialSendCode,socialVerifyCode,socialSignOut,openAddFriend,lookupSocialFriend,sendSocialFriendRequest,acceptSocialRequest,rejectSocialRequest,removeSocialFriend,editSocialName,saveSocialName,deleteSocialEvent,loadMoreFriendsFeed,toggleFriendsList,openFriendComparison,setFriendCompareExercise,toggleFriendComparison,toggleShareCard,updateShareComment,publishShareSummary,closeShareSummary,saveExerciseNote,skipExerciseNote};

init().catch(err=>{console.error(err);appEl.innerHTML=`<div class="view"><h1>Gym Progress</h1><div class="card danger-zone"><div class="title">Could not start</div><div class="note">${esc(err?.message||err)}</div></div></div>`;});
