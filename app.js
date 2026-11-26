import {WORKOUT_STEP_ACTIONS,captureWorkoutStep,recordWorkoutStep,canUndoWorkoutStep,canRedoWorkoutStep,undoWorkoutStep,redoWorkoutStep,resetWorkoutStepHistory} from './workout-step-history.js';
import {markTimedTargetReached,recordedTimedDuration,markRestReady,canReplaceWholeExercise} from './workout-progress-safety.js';
import {paintTrackerFill} from './tracker-fill-animation.js';
import {readOriginalLocalState,originalDevicePreferences,originalLocalBackup} from './legacy-local.js';
import {compareVersions} from './release-version.js';
import {pendingAccountCleanups,markAccountCleanup,clearAccountCleanup} from './account-cleanup.js';
import {exerciseFieldErrors} from './form-validation.js';
import {WORKOUT_DAY_NAME_MAX,EXERCISE_NAME_MAX,editableNameAllowed} from './name-policy.js';
import {redactWorkoutHistory} from './data-erasure.js';
import {captureRecommendationTarget,currentRecommendationTarget,recommendationWeight,recommendationReps} from './recommendation-guard.js';
import {createWorkspaceLifecycle} from './workspace-lifecycle.js';
import {attachOfflineTraining,hasOfflineTraining,offlineTrainingCounts} from './offline-ownership.js';
import {loadOfflineSnapshot,loadScopedSnapshot,commitOfflineAttachment} from './offline-attach-repository.js';
import {csvRows,detailedExport,csvCell} from './export-data.js';
import {exportTextFile,exportFilenameStamp} from './file-export.js';
import {createBackup,parseBackup,inspectState,assertPreserved,clone,fingerprint} from './data-contract.js';
import {setHTML,configureActions} from './dom-actions.js';
import {initUI,captureUIState,enhanceUI,restoreUIState,enhanceDialog,themePickerHTML,deferWhileComposing,themeColour} from './ui-components.js';
import {capturedDuration,freezeCardio,resumeCardio,appendRevision,workoutCheckpoint,restoreCheckpoint,createCommandBus,beginSkippedExerciseRest} from './workout-controller.js';
import {loadState,saveState,wipeState,setWorkspace,currentWorkspace,saveRecoveryState,loadRecoveryState,recoveryList,flushSaves,purgeRecoveryStates,redactRecoveryHistory,StaleWorkspaceError} from './db.js';
import {alternativeRelation,alternativePriority} from './exercise-alternatives.js';
import {restoreCachedReferenceData,refreshReferenceData} from './exercise-reference-cache.js';
import {EXERCISES,ExerciseType,RampMode,Equipment,DumbbellLoad,bestMatch,byKey,equipmentFor,dumbbellLoadFor,recommendRamp,warmupFamily,snapSelectable,stepSelectable,gradingIncrement,progressionIncrement,suggestedNextWeight,reducedSelectableWeight} from './exercise-library.js';
import {restTaskSummary} from './workout-stage-summary.js';
import {relinkForFuture} from './catalogue-relink.js';
import {beginMetricsRender,endMetricsRender,COLORS,roundQuarter,formatNumber,formatKg,formatKgFixed,formatKgRounded,formatDuration,dateOnly,dateTime,iso,exerciseSets,sessionExercises,exerciseMetrics,sessionMetrics,previousIdenticalSession,difficultyLevel,sessionDifficultyLevel,exerciseProgressPercent,phaseDuration} from './metrics.js';
import {cardioEffortFromRpe,workoutCardioEffort,preferredCardioMetric,compareCardioAtMatchedEffort,summarizeSessionCardio} from './cardio-analytics.js';
import {evaluateAutoregulation} from './autoregulation.js';
import {manualHtml} from './manual.js';
import {languageCode,localeFor,t as translateUI,localizeDom} from './i18n.js';
import {StarterGoal,StarterExperience,buildStarterProgramme,missingStarterWeightKeys} from './starter-programme.js';
import {evaluateFutureAdjustment} from './future-adjustment.js';
import {loadPerformanceRules,progressionSetQualifies,captureAnalysisContext,performanceSettingsFor,performanceRulesFor} from './performance-rules.js';
import {socialConfigured,socialSignedIn,socialUser,socialSession,refreshSocialSession,socialOwnerId,authGeneration,getWorkspaceStatus,rpc,sendEmailOtp,verifyEmailOtp,otpRetrySeconds,cancelEmailOtp,signOutSocial,getMyProfile,setDisplayName,setUsername,findFriend,sendFriendRequest,listFriends,listIncomingRequests,listNotifications,acceptFriendRequest,rejectFriendRequest,removeFriend,getFeed,getTimeline,hasUnseen,markSeen,publishEvents,deleteEvent,publishComparisonPoints,replaceComparisonPoints,getComparisonPreference,setComparisonEnabled,listCommonComparableExercises,getExerciseComparison,eraseMyCloudTraining,deleteMyAccount} from './social-api.js';
import {CANONICAL_EXERCISES,CANONICAL_BY_ID,CANONICAL_BY_KEY,canonicalName,canonicalSuggestions} from './exercise-catalogue.js';
import {TrackingMode,E1RM_FORMULA_VERSION,uuid,trackingModeFor,ensureExerciseIdentityState,getUserExercise,displayNameForUserExercise,isCatalogueDisplayName,displayNameForSessionExercise,activeUserExercises,isFriendComparableUserExercise,canonicalExerciseById,canonicalExerciseByKey,qualifyingE1rm,heaviestQualifyingE1rm} from './exercise-identity.js';
import {persistWorkoutIntelligence,trendLabel,fatigueSummary,assessExerciseTrend} from './progression-intelligence.js';
import {compactProgressTrend} from './progress-trend-summary.js';
import {ensureSyncFoundation} from './sync-foundation.js';
import {metaForLocal} from './sync-codec.js';
import {getTrainingSyncPreview,runTrainingSync,enabledSyncDomains,syncStatusLabel,listTrainingSyncConflicts,resolveTrainingSyncConflict,resetAfterCloudErasure} from './training-sync.js';
import {checkForWaitingRelease,inspectPublishedRelease,readWorkerRelease} from './release-update.js';
import {updateGate,preserveRefreshUpdateIntent} from './update-policy.js';

import {deliverPwaNotification} from './notification-delivery.js';
import {sendSupportReport,supportDiagnostics,validateSupportMessage} from './support-reports.js';
import {advanceRestAudioCue} from './rest-audio-cues.js';
import {workoutAlarmPlan,workoutStatusPlan,syncNativeWorkoutAlarms,syncNativeWorkoutStatus,exerciseReminderMinute,exerciseReminderOverlapsCountdown} from './native-workout-alerts.js';
import {trackerPace as sharedTrackerPace} from './tracker-pace.js';
import {nativeReminderPlan,syncNativeReminderPlan} from './native-reminder-plan.js';
import {buildProgressExerciseOptions} from './progress-options.js';
import {exerciseHistoryRows,progressMetricValue as domainProgressMetricValue,sourceForProgressMetric} from './progress-analytics.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>Date.now();
const APP_VERSION='2.2.6';
const INFO_MESSAGE_MS=3000;
const uid=(arr)=>arr.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;
const appEl=$('#app');
const statusRoot=$('#status-root');
let state=null;
let offlineDataAvailable=false,offlineAttachmentOfferedFor=null;
let route={name:'home',id:null};
let ui={selectedWorkoutId:null,expandedWorkoutId:null,progressExercise:'',progressRange:'3m',progressMetric:'WEIGHT',customStart:'',customEnd:'',toast:null,toastStartedAt:0,toastDuration:INFO_MESSAGE_MS,movedWorkoutId:null,transitionMessage:null,transitionStartedAt:0,transitionDuration:INFO_MESSAGE_MS,setStatusMessage:null,restExpand:false,timelineDays:null,timelineEndMs:null,advancedExercise:false,trackerExpanded:false,logLimit:40};
let socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null,compareFriendId:null,compareExercises:[],compareExerciseId:null,comparePoints:[],compareExpanded:false,comparisonPref:{allowed:false,revision:0,loaded:false}};
const socialDeletePending=new Set();
const S=(en,lv)=>languageCode(state)==='lv'?lv:en;
const SOCIAL_NOTIFIED_KEY='gym-progress-v2-social-notified';

function socialNotifiedIds(){try{return new Set(JSON.parse(localStorage.getItem(SOCIAL_NOTIFIED_KEY)||'[]'));}catch{return new Set();}}
function markSocialNotificationDelivered(id){const seen=socialNotifiedIds();seen.add(id);localStorage.setItem(SOCIAL_NOTIFIED_KEY,JSON.stringify([...seen].slice(-300)));}
let tickHandle=null,wakeLock=null,audioCtx=null,lastReminderKey='';const backgroundHandles=[];
let trackerRenderedDate=trackerTodayKey();
let trackerVisualBucket=-1;
const sentTrackerReminderKeys=new Set();
const TRACKER_NOTIFICATIONS_KEY='gym-progress-tracker-notifications-enabled';
function trackerNotificationsEnabled(){return localStorage.getItem(TRACKER_NOTIFICATIONS_KEY)==='1';}
function notificationPermissionState(){const native=globalThis.GymProgressAndroid;try{if(native&&typeof native.notificationPermission==='function')return native.notificationPermission();}catch{}return typeof Notification==='undefined'?'unavailable':Notification.permission;}
let nativeWorkoutAlertStatus='browser';
function androidAlarmAccessStatus(){const bridge=globalThis.GymProgressAndroid;try{return bridge?.alarmAccessStatus?.()||'not-android';}catch{return 'unavailable';}}
function syncAndroidReminders(){
 if(!state||workspaceTransition||writeBlocked)return;
 const plan=nativeReminderPlan(state,{scope:stateWorkspace,trackerEnabled:trackerNotificationsEnabled()&&notificationPermissionState()==='granted',language:languageCode(state)});
 syncNativeReminderPlan(plan);
}
function syncWorkoutAlarmPlan(){
 if(!state||workspaceTransition||writeBlocked)return;
 try{
  const rt=runtime(),ctx=rt?currentActiveContext():null;
  const action=rt?.nextAction;
  const upcoming=Number.isInteger(action?.exerciseIndex)?ctx?.exs?.[action.exerciseIndex]:null;
  const nextWarmupCue=!!(rt?.rest && upcoming && hasPendingRamp(upcoming) && state.app_state.warmupSoundEnabled!==false);
  if(rt?.rest)rt.rest.readyCue=nextWarmupCue?'warmup':'ready';
  const plan=workoutAlarmPlan(rt,ctx?.e,ctx?.set,state.app_state.soundEnabled!==false,languageCode(state),{...state.app_state,nextWarmupCue});
  nativeWorkoutAlertStatus=syncNativeWorkoutAlarms(plan);
  syncNativeWorkoutStatus(workoutStatusPlan(rt,rt?getSession(rt.sessionId):null,ctx?.e,languageCode(state)));
  syncAndroidReminders();
 }catch(error){console.warn('Native workout alert sync unavailable',error);nativeWorkoutAlertStatus='bridge-error';}
}
function nativeWorkoutAlarmStatusResult(value){
 if(['scheduled','elapsed','exact-alarm-required','bridge-error','cancelled','disabled'].includes(String(value))){
  nativeWorkoutAlertStatus=String(value);
 }
}
function nativeAlertOwnsCue(){return typeof globalThis.GymProgressAndroid?.syncWorkoutAlarms==='function'&&nativeWorkoutAlertStatus==='scheduled';}
function refreshAndroidAlerts(){syncWorkoutAlarmPlan();if(route.name==='settings')render();if(document.querySelector('.tracker-notification-row'))openTrackerSettings();}
function testAndroidSound(){
 if(!globalThis.GymProgressAndroid?.playCue){toast(S('Native sound test is available in the Android app.','Skaņas tests ir pieejams Android lietotnē.'));return;}
 globalThis.GymProgressAndroid.playCue('ready');
 toast(S('Played test cue. If you did not hear it, check your Android media volume, audio output and sound settings.','Atskaņots tests. Ja to nedzirdēji, pārbaudi Android multivides skaļumu, austiņas un skaņas iestatījumus.'));
}
function requestBackgroundAlerts(){
 const native=globalThis.GymProgressAndroid;if(!native)return;
 if(notificationPermissionState()!=='granted'){native.requestNotifications?.();toast(S('Allow Android notifications, then enable precise workout alarms.','Atļauj Android paziņojumus, pēc tam precīzos treniņa signālus.'),5500);return;}
 if(androidAlarmAccessStatus()!=='ready'){native.requestExactAlarmAccess?.();toast(S('Allow exact alarms for reliable lock-screen workout sounds.','Atļauj precīzos signālus treniņa skaņām pie bloķēta ekrāna.'),5500);return;}
 toast(S('Android background workout alerts are enabled.','Android fona treniņa signāli ir ieslēgti.'));syncWorkoutAlarmPlan();render();
}


function defaults(){return {
  internalVersion:20,
  app_state:{id:1,nextWorkoutId:null,keepScreenAwake:true,soundEnabled:true,workoutWarningSeconds:30,workoutCountdownEnabled:true,warmupSoundEnabled:true,exerciseReminderSoundEnabled:true,progressionRirThreshold:2,targetRirMin:1,targetRirMax:2,rirInputMax:3,difficultyComfortableMinRir:2.5,difficultyChallengingMinRir:1.5,difficultyHardMinRir:0.5,motivationEnabled:true,inactivityReminderHours:72,eveningReminderTime:'19:00',morningReminderTime:'08:00',nextSessionAt:null,lastInactivityReminderFor:null,nextEveningReminderFor:null,nextMorningReminderFor:null,languageCode:'en',starterPromptDismissed:false,lastSetZeroRirAcceptable:false,maxRampUpSets:3},
  workout_templates:[],user_exercises:[],template_exercises:[],workout_sessions:[],session_exercises:[],performed_sets:[],tracker_items:[],tracker_states:[],tracker_entries:[],runtime:null
};}
function localDataCounts(s){return {workouts:Array.isArray(s?.workout_templates)?s.workout_templates.length:0,templates:Array.isArray(s?.template_exercises)?s.template_exercises.length:0,sessions:Array.isArray(s?.workout_sessions)?s.workout_sessions.length:0,sessionExercises:Array.isArray(s?.session_exercises)?s.session_exercises.length:0,sets:Array.isArray(s?.performed_sets)?s.performed_sets.length:0};}
function hasTrainingData(s){const c=localDataCounts(s);return c.workouts+c.templates+c.sessions+c.sessionExercises+c.sets>0;}
function migrationPreservedTrainingData(before,after){try{return assertPreserved(before,after);}catch{return false;}}
function normalize(input){
 const original=clone(input||{}),d=defaults(),x={...d,...original};
 x.app_state={...d.app_state,...(x.app_state||{})};
 for(const key of ['workout_templates','user_exercises','template_exercises','workout_sessions','session_exercises','performed_sets','tracker_items','tracker_states','tracker_entries'])if(x[key]==null)x[key]=[];
 const report=inspectState(x);if(report.errors.length)throw new Error(report.errors.slice(0,8).join('\n'));
 x.integrity={...(x.integrity||{}),warnings:report.warnings};
 for(const row of [...x.template_exercises,...x.session_exercises]){if(row.equipment===undefined)row.equipment=byKey(row.exerciseKey)?.equipment||Equipment.OTHER;if(row.dumbbellLoad===undefined)row.dumbbellLoad=DumbbellLoad.SINGLE;}
 ensureExerciseIdentityState(x);ensureSyncFoundation(x);x.internalVersion=20;
 assertPreserved(original,x);return x;
}
function ensureRotation(s=state){
  const active=s.workout_templates.filter(w=>w.isActive!==false).sort((a,b)=>a.position-b.position);
  if(!active.length){s.app_state.nextWorkoutId=null;return;}
  if(!active.some(w=>w.id===s.app_state.nextWorkoutId))s.app_state.nextWorkoutId=active[0].id;
}
let trainingSyncInFlight=null,trainingSyncTimer=null,suppressTrainingSyncSchedule=false,lastSyncConflictNoticeAt=0,trainingSyncReviewToken=0;
// Account data must be restored before an empty local workspace can offer a starter.
let accountBootstrapStatus='ready',accountBootstrapSerial=0;
async function bootstrapAccountHistory(){
  const owner=socialUser()?.id,workspace=owner?'account:'+owner:null;
  const serial=++accountBootstrapSerial;
  if(!owner||currentWorkspace()!==workspace){accountBootstrapStatus='ready';return;}
  accountBootstrapStatus='loading';render();
  // On first sign-in the old client left domains disabled, which prevented cloud
  // history from loading until the user manually enabled each domain.
  const result=await performTrainingSync({reason:'initial',domains:['programme','workout_log','tracker'],force:true});
  if(serial!==accountBootstrapSerial||socialUser()?.id!==owner||currentWorkspace()!==workspace)return;
  accountBootstrapStatus=result?'ready':'failed';
  if(result){ensureRotation();ui.selectedWorkoutId=state.app_state.nextWorkoutId;}
  render();
  // A release can finish installing during initial cloud reconciliation. Once
  // account loading ends, an idle app should apply it without another tap.
  scheduleAutomaticUpdate();
}
function retryInitialSync(){return bootstrapAccountHistory();}

let lastCloudResumeAt=0;
// A refresh calls bootstrapAccountHistory once after workspace recovery.
// A failed startup sync is retried on connectivity/foreground, while an
// already-running sync is reused and no second mutation is submitted.
function resumeCloudSync(reason,{force=false}={}){
 if(!state||!socialSignedIn())return;
 const time=Date.now();
 if(!force&&time-lastCloudResumeAt<20000)return;
 lastCloudResumeAt=time;
 if(accountBootstrapStatus==='failed')void bootstrapAccountHistory().catch(reportAppError);
 else if(accountBootstrapStatus==='ready')void performTrainingSync({reason});
}
function resumeApp(reason,force=false){
 if(!state)return;
 syncWorkoutAlarmPlan();
 void tick().catch(reportAppError);
 void refreshSocialBadge();
 resumeCloudSync(reason,{force});
 void refreshRelease({force});
 scheduleAutomaticUpdate();
}
function scheduleTrainingSync(delay=4500){
  if(suppressTrainingSyncSchedule||!state||!socialSignedIn()||!enabledSyncDomains(state).length)return;
  if(trainingSyncTimer)clearTimeout(trainingSyncTimer);
  trainingSyncTimer=setTimeout(()=>{trainingSyncTimer=null;void performTrainingSync({reason:'local-change'});},Math.max(250,Number(delay)||0));
}
async function persistImmediately(){if(writeBlocked)throw new StaleWorkspaceError();if(workspaceTransition||currentWorkspace()!==stateWorkspace)throw new Error('Workspace change in progress');ensureSyncFoundation(state);const snapshot=state;try{await saveState(snapshot,{expectedWorkspace:stateWorkspace});}catch(error){if(error instanceof StaleWorkspaceError)writeBlocked=true;throw error;}if(snapshot===state){syncWorkoutAlarmPlan();if(!updateActivationInFlight)scheduleTrainingSync();}}

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
function openTrainingSyncDialog(preview){window.__gpTrainingSyncPreview=preview;const enabled=enabledSyncDomains(state),initial=!enabled.length;const domain=(name,label)=>'<label class="setting-toggle-row"><span>'+esc(label)+'</span><input type="checkbox" id="sync-'+name+'" '+(initial||enabled.includes(name==='history'?'workout_log':name)?'checked':'')+'></label>';openDialog('<h2>'+esc(S('Sync training data','Sinhronizēt treniņu datus'))+'</h2><p>'+esc(trainingSyncSummaryText(preview))+'</p>'+domain('programme',S('Programme','Programma'))+domain('history',S('Workout history','Treniņu vēsture'))+domain('tracker','Tracker')+(preview.conflicts?'<p>'+esc(preview.conflicts+' '+S('conflicts will be kept for individual review.','konflikti tiks saglabāti atsevišķai pārskatīšanai.'))+'</p>':'')+(preview.blocked?'<p class="danger-text">'+esc(S('Cloud erasure changed. Sync is paused; local records are retained.','Mākoņa dati ir dzēsti. Sinhronizācija apturēta; lokālie ieraksti ir saglabāti.'))+'</p>':'')+'<div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">'+esc(S('Cancel','Atcelt'))+'</button><button onclick="gp.confirmTrainingSync()" '+(preview.blocked?'disabled':'')+'>'+esc(S('Sync','Sinhronizēt'))+'</button></div>');}
async function openTrainingSyncReview(){
  if(!socialSignedIn())return;if(listTrainingSyncConflicts(state).length){openSyncConflictReview();return;}
  const token=++trainingSyncReviewToken;
  openTrainingSyncLoadingDialog();
  try{
    const captured=state,preview=await getTrainingSyncPreview(captured,{isCurrent:value=>value===state});
    if(token!==trainingSyncReviewToken)return;
    openTrainingSyncDialog(preview);
  }catch(e){
    if(token!==trainingSyncReviewToken)return;
    openDialog(`<h2>${esc(S('Sync check failed','Sinhronizācijas pārbaude neizdevās'))}</h2><div class="dialog-copy">${esc(e?.message||e)}</div><div class="dialog-actions"><button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);
  }
}
async function confirmTrainingSync(){if(trainingSyncInFlight)return;const domains=[];if($('#sync-programme')?.checked)domains.push('programme');if($('#sync-history')?.checked)domains.push('workout_log');if($('#sync-tracker')?.checked)domains.push('tracker');if(!domains.length){toast(S('Select at least one data type.','Izvēlies vismaz vienu datu veidu.'));return;}const preview=window.__gpTrainingSyncPreview;for(const domain of ['programme','workout_log','tracker'])state.sync_foundation.domains[domain].enabled=domains.includes(domain);closeDialog();await persist();await performTrainingSync({reason:'manual',preview,domains,force:true});}
async function performTrainingSync({reason='auto',preview=null,domains=null,force=false,recheckDependencies=false}={}){
 if(!state||!socialSignedIn()||workspaceTransition||writeBlocked||updateActivationInFlight||['LOCAL_ERASE_PENDING','ACCOUNT_ERASE_PENDING'].includes(state.sync_foundation?.blocked?.code))return null;if(trainingSyncInFlight)return trainingSyncInFlight;
 const captured=state,owner=socialUser().id,localVersion=localGeneration,activeDomains=domains||enabledSyncDomains(captured);if(!activeDomains.length&&!force)return null;
 const isCurrent=value=>value===state&&localVersion===localGeneration&&socialUser()?.id===owner&&currentWorkspace()==='account:'+owner;
 const persistSync=async value=>{if(!isCurrent(value))throw new Error('Workspace changed during sync');await saveState(value,{expectedWorkspace:'account:'+owner});};
 const job=(async()=>{suppressTrainingSyncSchedule=true;try{const result=await runTrainingSync(captured,{domains:activeDomains,preview,persist:persistSync,isCurrent,recheckDependencies});if(!isCurrent(captured))return null;if(result.changed){ensureRotation();await persistSync(captured);render();}if(result.conflicts){if(reason==='manual')openSyncConflictReview();else toast(S('Sync conflicts need review in Settings.','Sinhronizācijas konflikti jāpārskata iestatījumos.'));}else if(reason==='manual')toast(result.pending?S('Some changes are still pending.','Dažas izmaiņas vēl gaida sinhronizāciju.'):S('Available changes synced.','Pieejamās izmaiņas sinhronizētas.'));return result;}catch(error){if(!isCurrent(captured))return null;if(error instanceof StaleWorkspaceError)writeBlocked=true;if(reason==='manual')toast(/GP_WRITE_LIMIT/i.test(String(error?.message||''))?S('Unusually many changes were submitted. Your local entries are safe; sync can resume later.','Nosūtīts neparasti daudz izmaiņu. Lokālie ieraksti ir drošībā; sinhronizāciju varēs turpināt vēlāk.'):String(error.message),7000);return null;}finally{if(isCurrent(captured))suppressTrainingSyncSchedule=false;}})();trainingSyncInFlight=job;try{return await job;}finally{if(trainingSyncInFlight===job){trainingSyncInFlight=null;if(route.name==='settings')render();scheduleAutomaticUpdate();}}
}

// Coalesce persistence requests raised by one UI event. Callers may still await
// persist(); the actual IndexedDB write remains ordered and failure-propagating.
let writeBlocked=false,workspaceTransition=false,localGeneration=0,stateWorkspace='guest';
const workspaceLifecycle=createWorkspaceLifecycle((busy,generation)=>{workspaceTransition=busy;localGeneration=generation;});
function persist(){return persistImmediately();}

function renderStatus(){
  const root=statusRoot;if(!root)return;
  const isTransition=!!ui.transitionMessage,message=ui.transitionMessage||ui.toast;
  if(message){
    const started=isTransition?ui.transitionStartedAt:ui.toastStartedAt,duration=Math.max(1,isTransition?ui.transitionDuration:ui.toastDuration),elapsed=Math.max(0,Date.now()-started),remaining=Math.max(80,duration-elapsed),opacity=Math.max(0,1-elapsed/duration);
    setHTML(root,`<div class="status-message ${isTransition?'transition-status':'toast-status'} status-fading" style="opacity:${opacity};animation-duration:${remaining}ms">${esc(message)}</div>`);
  }else setHTML(root,'');
  document.body.classList.toggle('status-visible',!!message);
}
function toast(msg,duration=INFO_MESSAGE_MS){
  msg=translateUI(String(msg),languageCode(state));ui.toast=msg;ui.toastStartedAt=Date.now();ui.toastDuration=duration;renderStatus();
  setTimeout(()=>{if(ui.toast===msg){ui.toast=null;renderStatus();}},duration);
}
function captureWorkoutNoteDraft(){
 const rt=state?.runtime,input=$('#f-workout-note');
 if(workspaceTransition||route.name!=='active'||rt?.phase!=='FINAL'||!input||input.dataset.workoutSession!==String(rt.sessionId)||input.dataset.workspace!==stateWorkspace)return false;
 const session=getSession(rt.sessionId),note=String(input.value||'').trim().slice(0,2000);
 if(!session||String(session.note||'')===note)return false;
 session.note=note;return true;
}
function nav(name,id=null){if(name==='session'&&route.name!=='progress')ui.sessionBack='logs';if(captureWorkoutNoteDraft())void persist().catch(reportAppError);if(name==='logs'&&route.name!=='logs'){ui.timelineDays=null;ui.timelineEndMs=null;}if(name==='friends'&&route.name!=='friends'){socialUi.timelineDays=null;socialUi.timelineEndMs=null;}route={name,id};window.scrollTo({top:0,behavior:'instant'});render();if(name==='friends')void enterFriends();if(name==='settings'&&socialSignedIn())void refreshComparisonPreference().then(()=>{if(route.name==='settings')render();}).catch(error=>{if(route.name==='settings')toast(socialErrorMessage(error));});if(['programme','workout','logs','session','settings'].includes(name))scheduleTrainingSync(300);}
/** One route handler for hardware Back and future desktop keyboard adapters. */
function handleSystemBack(){
 if(document.querySelector('.share-summary-dialog')){closeShareSummary();return 'handled';}
 if(document.querySelector('.dialog-backdrop')){closeDialog();return 'handled';}
 if(route.name==='session'){nav(ui.sessionBack||'logs');return 'handled';}
 if(route.name==='workout'){nav('programme');return 'handled';}
 if(route.name==='active'){nav('home');return 'handled';}
 if(route.name!=='home'){nav('home');return 'handled';}
 if(activeSession()){nav('active');return 'handled';}
 return 'exit';
}
function activeSession(){return state.workout_sessions.find(s=>s.status==='ACTIVE')||null;}
function getWorkout(id){return state.workout_templates.find(w=>w.id===Number(id));}
function getTemplateExercises(workoutId){return state.template_exercises.filter(e=>e.workoutId===Number(workoutId)).sort((a,b)=>a.position-b.position);}
function getSession(id){return state.workout_sessions.find(s=>s.id===Number(id));}
function getSessionExercise(id){return state.session_exercises.find(e=>e.id===Number(id));}
function getSet(id){return state.performed_sets.find(s=>s.id===Number(id));}
function userExerciseName(id,fallback='Exercise'){return displayNameForUserExercise(state,getUserExercise(state,id),fallback,languageCode(state));}
function templateDisplayName(e){return userExerciseName(e?.userExerciseId,e?.name||'Exercise');}
function sessionDisplayName(e){return displayNameForSessionExercise(state,e);}
function trackingLabel(e){return translateUI(e?.trackingMode===TrackingMode.CARDIO?'Cardio':e?.trackingMode===TrackingMode.TIME_ONLY?'Timed':e?.equipment===Equipment.BODYWEIGHT?'Bodyweight':'Weight + reps',languageCode(state));}
function catalogueGlobeSvg(){return `<span class="catalogue-link-glyph" aria-hidden="true"></span>`;}
function catalogueInlineGlobe(linked){return `<span class="catalogue-inline-status ${linked?'linked':'local'}">${catalogueGlobeSvg()}</span>`;}
function canonicalStatusIcon(u){const linked=!!u?.canonicalExerciseId,candidate=!!u?.candidateCanonicalExerciseId,label=linked?S('Linked to exercise catalogue','Saistīts ar vingrinājumu katalogu'):candidate?S('Catalogue match available','Pieejama kataloga atbilstība'):S('Not linked to exercise catalogue','Nav saistīts ar vingrinājumu katalogu');return `<span class="catalogue-status ${linked?'linked':'local'} ${candidate?'candidate':''}" title="${esc(label)}" aria-label="${esc(label)}">${catalogueGlobeSvg()}</span>`;}
function catalogueSearchMatch(name){const q=String(name||'').trim().toLowerCase();if(!q)return null;return CANONICAL_EXERCISES.find(c=>[c.nameEn,c.nameLv,...(c.aliasesEn||[])].some(n=>String(n||'').trim().toLowerCase()===q))||null;}
function createUserExerciseFromInput(name,equipment,dumbbellLoad,exerciseType,trackingMode,canonical=null){const lang=languageCode(state),display=String(name||'').trim()||(canonical?canonicalName(canonical,lang):'Exercise');const u={id:uuid(),canonicalExerciseId:canonical?.id||null,displayName:display,displayNameMode:canonical&&isCatalogueDisplayName(display,canonical)?'CATALOGUE':'CUSTOM',createdLanguage:lang,equipment:canonical?.equipment||equipment||Equipment.OTHER,dumbbellLoad:canonical?.dumbbellLoad||dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:canonical?.exerciseType||exerciseType||ExerciseType.MODERATE_COMPOUND,trackingMode:trackingMode||((canonical?.equipment||equipment)===Equipment.BODYWEIGHT?TrackingMode.BODYWEIGHT_REPS:TrackingMode.WEIGHT_REPS),archived:false,candidateCanonicalExerciseId:null,legacyExerciseKey:canonical?.legacyExerciseKey||null};state.user_exercises.push(u);return u;}
function findUserExerciseForForm(old,canonical,selectedUserId=null){if(selectedUserId){const selected=getUserExercise(state,selectedUserId);if(selected&&!selected.archived)return selected;}if(old?.userExerciseId){const existing=getUserExercise(state,old.userExerciseId);if(existing)return existing;}if(canonical){const same=activeUserExercises(state).filter(u=>u.canonicalExerciseId===canonical.id);if(same.length===1)return same[0];}return null;}

function setCatalogueLinkForExercise(templateId){
  const te=state.template_exercises.find(x=>x.id===Number(templateId)),u=te?getUserExercise(state,te.userExerciseId):null;if(!u)return;
  const lang=languageCode(state),linked=canonicalExerciseById(u.canonicalExerciseId),candidate=canonicalExerciseById(u.candidateCanonicalExerciseId);
  const initial=linked?.id||candidate?.id||'';
  const suggestions=CANONICAL_EXERCISES.filter(c=>c.status==='ACTIVE').slice().sort((a,b)=>canonicalName(a,lang).localeCompare(canonicalName(b,lang)));
  const opts=suggestions.map(c=>`<option value="${c.id}" ${initial===c.id?'selected':''}>${esc(canonicalName(c,lang))} · ${esc(translateUI(c.equipment.toLowerCase(),languageCode(state)))}</option>`).join('');
  const status=linked?`${S('Linked to','Saistīts ar')} ${canonicalName(linked,lang)}`:S('Not linked','Nav saistīts');
  openDialog(`<h2>${esc(S('Exercise catalogue','Vingrinājumu katalogs'))}</h2><div class="row between catalogue-dialog-head"><div><div class="title">${esc(displayNameForUserExercise(state,u,undefined,languageCode(state)))}</div><div class="small">${esc(status)}</div></div>${canonicalStatusIcon(u)}</div>${linked?`<button class="secondary full catalogue-unlink" onclick="gp.unlinkCatalogueExercise(${te.id})">${esc(S('Unlink','Atvienot'))}</button>`:''}<div class="note">${esc(S('A catalogue link gives this exercise a stable identity across languages and enables friend comparison when the movement is comparable. Historical sessions retain their original identity, mode and measurements; the new link applies only to future workouts.','Kataloga saite piešķir vingrinājumam stabilu identitāti dažādās valodās un ļauj salīdzināt ar draugiem, ja kustība ir salīdzināma. Vēsturiskie treniņi saglabā sākotnējo identitāti, uzskaites veidu un mērījumus; jaunā saite attiecas tikai uz turpmākajiem treniņiem.'))}</div><label class="field">${esc(S('Catalogue exercise','Kataloga vingrinājums'))}</label><select id="f-canonical-link">${opts}</select><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.saveCatalogueLink(${te.id})">${esc(S('Save','Saglabāt'))}</button></div>`);
}
async function applyCatalogueRelink(templateId,canonical){
 const result=relinkForFuture(state,templateId,canonical);
 await persist();
 if(socialSignedIn())void syncComparisonHistory().catch(console.warn);
 closeDialog();render();
 if(result.forked)toast(S('New exercise identity created. Historical workouts remain unchanged.','Izveidota jauna vingrinājuma identitāte. Iepriekšējie treniņi nav mainīti.'),6000);
}
async function saveCatalogueLink(templateId){
 const template=state.template_exercises.find(x=>x.id===Number(templateId));
 const user=template?getUserExercise(state,template.userExerciseId):null;
 const id=$('#f-canonical-link')?.value||null,canonical=canonicalExerciseById(id);
 if(!user||!canonical)return;
 const history=state.session_exercises.some(e=>String(e.userExerciseId)===String(user.id));
 if(history && (user.canonicalExerciseId||null)!==canonical.id){
  confirmDialog(S('Start new catalogue identity?','Sākt jaunu kataloga identitāti?'),S('The selected catalogue link will apply only to future workouts. Past workout history keeps its own name, measurements and exercise identity.','Izvēlētā kataloga saite attieksies tikai uz turpmākajiem treniņiem. Vēsture saglabās iepriekšējo nosaukumu, mērījumus un vingrinājuma identitāti.'),S('Apply to future','Piemērot turpmāk'),()=>applyCatalogueRelink(templateId,canonical));return;
 }
 await applyCatalogueRelink(templateId,canonical);
}
async function unlinkCatalogueExercise(templateId){
 const template=state.template_exercises.find(x=>x.id===Number(templateId));
 const user=template?getUserExercise(state,template.userExerciseId):null;
 if(!user)return;
 const history=state.session_exercises.some(e=>String(e.userExerciseId)===String(user.id));
 if(history && user.canonicalExerciseId){
  confirmDialog(S('Unlink future workouts?','Atvienot turpmākos treniņus?'),S('Past workout records keep their original catalogue identity; future workouts will use a separate personal exercise.','Iepriekšējie treniņu ieraksti saglabās sākotnējo kataloga identitāti; turpmākajiem treniņiem tiks izmantots atsevišķs personiskais vingrinājums.'),S('Unlink future','Atvienot turpmāk'),()=>applyCatalogueRelink(templateId,null));return;
 }
 await applyCatalogueRelink(templateId,null);
}

function trackerTodayKey(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function trackerAmount(item){const row=(state.tracker_states||[]).find(x=>String(x.itemId)===String(item.id));return row&&String(row.localDate)===trackerTodayKey()?Number(row.amount||0):0;}
function trackerState(item){const today=trackerTodayKey();let row=(state.tracker_states||[]).find(x=>String(x.itemId)===String(item.id));if(!row){row={itemId:item.id,localDate:today,amount:0};state.tracker_states.push(row);}else if(String(row.localDate)!==today){state.tracker_entries=state.tracker_entries||[];const archiveId='day:'+String(item.id)+':'+String(row.localDate);if(!state.tracker_entries.some(x=>x.id===archiveId))state.tracker_entries.push({...clone(row),id:archiveId});row.localDate=today;row.amount=0;}return row;}
function rollTrackerStatesToToday(){const before=fingerprint(state.tracker_states);for(const item of state.tracker_items||[])trackerState(item);return before!==fingerprint(state.tracker_states);}
function trackerUnit(item){return translateUI(String(item.unit||'').trim(),languageCode(state));}
function trackerPace(item,at=new Date()){return sharedTrackerPace(item,at);}
function trackerBehind(item,at=new Date()){const amount=trackerAmount(item),pace=trackerPace(item,at);return amount+1e-6<pace.target&&amount+1e-6<pace.dueAmount;}
function trackerTimeFraction(item,at=new Date()){return trackerPace(item,at).timeFraction;}
function refreshTrackerTimeVisuals(at=new Date()){if(route.name!=='home')return;document.querySelectorAll('.tracker-row[data-tracker-id]').forEach(row=>{const item=(state.tracker_items||[]).find(x=>String(x.id)===row.dataset.trackerId);if(!item)return;const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount||0)),done=amount+1e-6>=target,behind=!done&&trackerBehind(item,at),marker=row.querySelector('.tracker-progress-now');row.classList.toggle('done',done);row.classList.toggle('behind',behind);if(marker)marker.style.left=`${trackerTimeFraction(item,at)*100}%`;});}
function renderTrackerCard(){const items=(state.tracker_items||[]).filter(x=>x.enabled!==false).slice().sort((a,b)=>(a.position||0)-(b.position||0));if(!items.length)return `<div class="card tracker-card tracker-card-accent"><div class="row between"><div><div class="title" data-i18n="Tracker">Tracker</div></div><button class="icon-btn tracker-settings-btn" onclick="gp.openTrackerSettings()" aria-label="Tracker settings">${mainNavIcon('settings')}</button></div><div class="note" data-i18n="Add water, protein, supplements or any daily target.">Add water, protein, supplements or any daily target.</div></div>`;const at=new Date();return `<div class="card tracker-card tracker-card-accent"><div class="row between"><div><div class="title" data-i18n="Tracker">Tracker</div></div><button class="icon-btn tracker-settings-btn" onclick="gp.openTrackerSettings()" aria-label="Tracker settings">${mainNavIcon('settings')}</button></div><div class="tracker-list">${items.map(item=>{const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount||0)),unit=trackerUnit(item),done=amount>=target,behind=!done&&trackerBehind(item,at),fill=Math.max(0,Math.min(1,amount/target)),timeFraction=trackerTimeFraction(item,at);return `<div class="tracker-row ${done?'done':''} ${behind?'behind':''}" data-tracker-id="${esc(String(item.id))}"><div class="tracker-progress-zone"><div class="tracker-progress-bg"><span class="tracker-progress-fill" style="transform:scaleX(${fill})"></span><span class="tracker-progress-now" style="left:${timeFraction*100}%"></span></div><div class="tracker-row-main"><div class="grow min-zero tracker-name">${esc(item.name)}</div><button class="tracker-amount-button" onclick="gp.setTrackerAmount('${item.id}')">${formatNumber(amount,{maximumFractionDigits:4})}/${formatNumber(item.targetAmount||0,{maximumFractionDigits:4})}${unit?` ${esc(unit)}`:''}</button></div></div><div class="tracker-controls"><button class="tracker-step-btn" onclick="gp.adjustTracker('${item.id}',-1)" aria-label="Decrease">−</button><button class="tracker-step-btn" onclick="gp.adjustTracker('${item.id}',1)" aria-label="Increase">+</button></div></div>`;}).join('')}</div></div>`;}

function supersetPairForExercise(exs,e){if(!e?.supersetGroupId)return null;const pair=exs.filter(x=>x.supersetGroupId===e.supersetGroupId).sort((a,b)=>a.position-b.position);return pair.length===2?pair:null;}
function supersetPairSetInfo(exs,e,setNumber,{excludeSetIds=[]}={}){const pair=supersetPairForExercise(exs,e);if(!pair)return null;const excluded=new Set(excludeSetIds.map(Number));const items=pair.map(member=>{const sets=exerciseSets(state,member.id),set=sets.find(x=>x.setNumber===setNumber&&x.status==='PENDING'&&!excluded.has(Number(x.id)));return{e:member,sets,set};});if(items.some(x=>!x.set))return null;return{pair,items};}
function hasPendingRamp(e){return !!(e&&e.rampEndedAt==null&&shouldRamp(e));}
function nextPrescriptionHtml(e,set,{forceWorking=false,header=false}={}){if(!e||!set)return'';if(!forceWorking&&hasPendingRamp(e))return `${esc(S('Ramp-up','Iesildīšanās'))} · ${esc(sessionDisplayName(e))}`;if(header)return esc(sessionDisplayName(e));if([TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode))return `${esc(sessionDisplayName(e))} · ${formatDuration(Number(set.targetDurationSeconds||e.targetSeconds||60)*1000)}`;const load=e.equipment===Equipment.BODYWEIGHT?translateUI('Bodyweight',languageCode(state)):formatKg(set.plannedWeightKg??e.plannedWeightKg);return `${esc(sessionDisplayName(e))} · ${load} × ${set.targetReps}`;}
function nextTargetAfterExclusions(exs,excludeSetIds=[]){const excluded=new Set(excludeSetIds.map(Number));for(const candidate of exs.slice().sort((a,b)=>a.position-b.position)){const sets=exerciseSets(state,candidate.id).slice().sort((a,b)=>a.setNumber-b.setNumber),set=sets.find(x=>x.status==='PENDING'&&!excluded.has(Number(x.id)));if(!set)continue;const pairInfo=supersetPairSetInfo(exs,candidate,set.setNumber,{excludeSetIds:[...excluded]});if(pairInfo)return{pairInfo};return{e:candidate,set};}return null;}
function displayAction(exs,action,{header=false,forceWorking=false}={}){if(!action)return'';if(action.type==='STRETCH')return esc(S('Stretching','Stiepšanās'));if(action.type==='FINAL')return esc(S('Workout complete','Treniņš pabeigts'));if(action.type==='UNLOAD'){const u=exs[action.exerciseIndex];return u?`${esc(S('Remove weights','Noņemt svarus'))} · ${esc(sessionDisplayName(u))}`:esc(S('Remove weights','Noņemt svarus'));}const targetE=exs[action.exerciseIndex];if(!targetE)return'';const targetSet=exerciseSets(state,targetE.id)[action.setIndex]||exerciseSets(state,targetE.id).find(x=>x.status==='PENDING');if(!targetSet)return'';const pairInfo=supersetPairSetInfo(exs,targetE,targetSet.setNumber);if(pairInfo){const names=pairInfo.items.map(x=>sessionDisplayName(x.e));const ramping=!forceWorking&&pairInfo.items.some(x=>hasPendingRamp(x.e));if(ramping)return `${esc(S('Ramp-up','Iesildīšanās'))} · ${esc(names.join(' + '))}`;if(header)return `${esc(S('Superset','Supersets'))} · ${esc(names.join(' + '))}`;return `${esc(S('Superset','Supersets'))}\n${pairInfo.items.map(x=>nextPrescriptionHtml(x.e,x.set,{forceWorking:true})).join('\n')}`;}return nextPrescriptionHtml(targetE,targetSet,{forceWorking,header});}
function previewAfterCurrentSet(ctx){const {rt,exs,e,sets,set}=ctx;if(!e||!set)return{type:'STRETCH'};const pair=supersetPairForExercise(exs,e);if(pair){const action=nextActionAfterSuperset(exs,pair,set.setNumber);return action||{type:'STRETCH'};}const superAction=supersetPartnerAction(exs,e,set);if(superAction?.type==='SUPERSET_IMMEDIATE')return{type:'SET',exerciseIndex:superAction.exerciseIndex,setIndex:superAction.setIndex};if(superAction?.type==='SUPERSET_AFTER_REST')return{type:'SUPERSET',exerciseIndex:superAction.exerciseIndex,setIndex:superAction.setIndex};const pendingSame=sets.findIndex(x=>x.status==='PENDING'&&x.id!==set.id);if(pendingSame>=0)return{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:pendingSame};if(e.removeWeights)return{type:'UNLOAD',exerciseIndex:rt.currentExerciseIndex};return nextActionAfterExercise(exs,e);}
function previewNextAction(ctx=currentActiveContext()){const {rt,exs,e,set}=ctx;if(!rt)return null;if(rt.phase==='WARMUP')return{type:'EXERCISE',exerciseIndex:0};if(rt.phase==='RAMP_PROMPT'||rt.phase==='RAMP_ACTIVE')return{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:rt.currentSetIndex,forceWorking:true};if(rt.phase==='UNLOAD'){const nextId=rt.unloadQueue?.[0],idx=nextId!=null?exs.findIndex(item=>item.id===nextId):-1;return idx>=0?{type:'UNLOAD',exerciseIndex:idx}:rt.nextAction||{type:'STRETCH'};}if(rt.phase==='REST')return rt.nextAction||{type:'STRETCH'};if(rt.phase==='STRETCH')return{type:'FINAL'};if(rt.phase==='FINAL')return null;if(rt.phase==='SUPERSET_ENTRY'&&Array.isArray(rt.supersetEntry)&&rt.supersetEntry.length){const first=getSet(rt.supersetEntry[0].setId),lead=e,pair=lead?supersetPairForExercise(exs,lead):null;if(first&&pair)return nextActionAfterSuperset(exs,pair,first.setNumber)||{type:'STRETCH'};}if(['ENTRY','SET','TIMED_SET','CARDIO_ENTRY'].includes(rt.phase)&&e&&set)return previewAfterCurrentSet(ctx);return null;}
function focusStageGroups(exs){const groups=[],seen=new Set();for(const e of exs.slice().sort((a,b)=>a.position-b.position)){const key=e.supersetGroupId?`s:${e.supersetGroupId}`:`e:${e.id}`;if(seen.has(key))continue;seen.add(key);groups.push({key,members:exs.filter(x=>(e.supersetGroupId?x.supersetGroupId===e.supersetGroupId:x.id===e.id)).sort((a,b)=>a.position-b.position)});}return groups;}
function focusStageInfo(exs,e){if(!e)return null;const groups=focusStageGroups(exs),i=groups.findIndex(g=>g.members.some(x=>x.id===e.id));if(i<0)return null;const group=groups[i],name=group.members.length>1?`${S('Superset','Supersets')} ${group.members.map(sessionDisplayName).join(' + ')}`:sessionDisplayName(group.members[0]);return{index:i+1,total:groups.length,name};}
function headerActionLabel(exs,action,{forceWorking=false}={}){if(!action)return'';if(action.type==='STRETCH')return S('Stretching','Stiepšanās');if(action.type==='FINAL')return S('Workout complete','Treniņš pabeigts');if(action.type==='UNLOAD'){const u=exs[action.exerciseIndex];return u?`${S('Deload','Noņemt svarus')} ${sessionDisplayName(u)}`:S('Deload','Noņemt svarus');}const targetE=exs[action.exerciseIndex];if(!targetE)return'';const group=focusStageGroups(exs).find(g=>g.members.some(x=>x.id===targetE.id)),stage=focusStageInfo(exs,targetE),name=stage?.name||sessionDisplayName(targetE),members=group?.members||[targetE];if(!forceWorking&&members.some(x=>hasPendingRamp(x)))return `${S('Ramp-up','Iesildīšanās')} ${name}`;return name;}
function activeHeaderState(ctx=currentActiveContext()){const {rt,exs,e}=ctx;if(!rt)return{stage:'',now:'',next:''};let focus=e;if(rt.phase==='REST'&&rt.rest?.setIds?.length){const owner=exs.find(x=>exerciseSets(state,x.id).some(s=>rt.rest.setIds.map(Number).includes(Number(s.id))));if(owner)focus=owner;}if((rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.entry?.setId){const owner=exs.find(x=>exerciseSets(state,x.id).some(s=>Number(s.id)===Number(rt.entry.setId)));if(owner)focus=owner;}const stageInfo=focusStageInfo(exs,focus),stage=['WARMUP','STRETCH','FINAL'].includes(rt.phase)?'':stageInfo?`${stageInfo.index}/${stageInfo.total}`:'';const focusName=stageInfo?.name||(focus?sessionDisplayName(focus):'');let current='';if(rt.phase==='WARMUP')current=S('Warm-up','Iesildīšanās');else if(rt.phase==='RAMP_PROMPT'||rt.phase==='RAMP_ACTIVE')current=`${S('Ramp-up','Iesildīšanās')} ${focusName}`;else if(rt.phase==='REST')current=`${S('Rest','Atpūta')} ${focusName}`.trim();else if(rt.phase==='UNLOAD')current=`${S('Deload','Noņemt svarus')} ${focusName}`.trim();else if(rt.phase==='STRETCH')current=S('Stretching','Stiepšanās');else if(rt.phase==='FINAL')current=S('Workout complete','Treniņš pabeigts');else current=focusName;const action=previewNextAction(ctx),next=action?headerActionLabel(exs,action,{forceWorking:!!action.forceWorking}):'';return{stage,current,next};}

function simpleActiveHeaderState(ctx=currentActiveContext()){
  const {rt,exs,e}=ctx;
  if(!rt)return {stage:'',current:''};
  // Show the current exercise/group, never the next one. A single-line header
  // label must not change the app's fixed 60px header height on long names.
  let focus=e;
  if(rt.phase==='REST'&&rt.rest?.setIds?.length){
    const ids=new Set(rt.rest.setIds.map(Number));
    focus=exs.find(x=>exerciseSets(state,x.id).some(set=>ids.has(Number(set.id))))||focus;
  }
  if((rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.entry?.setId){
    focus=exs.find(x=>exerciseSets(state,x.id).some(set=>Number(set.id)===Number(rt.entry.setId)))||focus;
  }
  const info=focusStageInfo(exs,focus);
  const name=info?.name||(focus?sessionDisplayName(focus):'');
  let current=name;
  if(rt.phase==='WARMUP')current=S('Warm-up','Iesildīšanās');
  else if(['RAMP_PROMPT','RAMP_ACTIVE'].includes(rt.phase))current=`${S('Ramp-up','Iesildīšanās')} · ${name}`;
  else if(rt.phase==='REST')current=`${S('Rest','Atpūta')} · ${name}`;
  else if(rt.phase==='UNLOAD')current=`${S('Remove weights','Noņemt svarus')} · ${name}`;
  else if(rt.phase==='STRETCH')current=S('Stretching','Stiepšanās');
  else if(rt.phase==='FINAL')current=S('Workout complete','Treniņš pabeigts');
  const stage=['WARMUP','STRETCH','FINAL'].includes(rt.phase)?'':info?`${info.index}/${info.total}`:'';
  return {stage,current};
}
function workoutProgressFraction(){
  const rt=runtime(),ses=rt?getSession(rt.sessionId):activeSession();if(!rt||!ses)return 0;
  const exs=sessionExercises(state,ses.id),all=exs.flatMap(e=>exerciseSets(state,e.id).map(set=>({e,set})));
  if(!all.length)return ses.stretchEndedAt?1:0;
  let total=0,done=0;const entryIds=new Set([rt.entry?.setId,...(rt.supersetEntry||[]).map(x=>x.setId)].filter(Boolean).map(Number)),restIds=new Set((rt.rest?.setIds||[rt.rest?.setId]).filter(Boolean).map(Number));
  for(const {e,set} of all){const work=.70,rest=Number(set.plannedRestSeconds||0)>0?.30:0;total+=work+rest;if(set.status==='SKIPPED'){done+=work+rest;continue;}if(set.status==='COMPLETE'){done+=work;if(set.actualRestSeconds!=null)done+=rest;else if(rt.rest&&restIds.has(Number(set.id))&&rest>0){const span=Math.max(1,Number(rt.rest.endsAt)-Number(rt.rest.startedAt)),elapsed=Math.max(0,Math.min(span,now()-Number(rt.rest.startedAt)));done+=rest*(elapsed/span);}continue;}if(entryIds.has(Number(set.id)))done+=work;if(['TIMED_SET','CARDIO_ENTRY'].includes(rt.phase)&&Number(ctxSetIdSafe())===Number(set.id)){const target=Math.max(1,Number(set.targetDurationSeconds||e.targetSeconds||60)),elapsed=capturedDuration(rt,now());done+=work*Math.min(1,elapsed/target);}if(rt.rest&&restIds.has(Number(set.id))&&rest>0){const span=Math.max(1,Number(rt.rest.endsAt)-Number(rt.rest.startedAt)),elapsed=Math.max(0,Math.min(span,now()-Number(rt.rest.startedAt)));done+=rest*(elapsed/span);}}
  return Math.max(0,Math.min(1,done/Math.max(.001,total)));
}
function ctxSetIdSafe(){try{return currentActiveContext().set?.id??null}catch{return null}}
function refreshWorkoutProgressBar(){const el=document.querySelector('.workout-progress-fill');if(el)el.style.width=`${(workoutProgressFraction()*100).toFixed(1)}%`;}
function renderNextInfo(){const ctx=currentActiveContext(),action=previewNextAction(ctx);if(!ctx.rt||!action)return'';const label=displayAction(ctx.exs,action,{forceWorking:!!action.forceWorking});if(!label)return'';const lines=label.split('\n');return `<div class="next-info ${lines.length>1?'superset-next-info':''}"><span>${esc(S('NEXT','TĀLĀK'))}${lines.length>1?' · '+esc(S('SUPERSET','SUPERSETS')):''}</span>${lines.map((line,i)=>i===0&&lines.length>1?'':`<strong>${line}</strong>`).join('')}</div>`;}
function setForCurrentPending(e){return exerciseSets(state,e.id).find(x=>x.status==='PENDING')||null;}
function runtime(){return state.runtime;}
function fmtPct(v){return v==null||!Number.isFinite(Number(v))?'—':`${v>=0?'+':''}${formatNumber(v,{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function nextWorkoutAfter(workoutId){const all=state.workout_templates.filter(w=>w.isActive!==false).sort((a,b)=>a.position-b.position);if(!all.length)return null;const i=all.findIndex(w=>w.id===workoutId);return all[(i<0?0:(i+1)%all.length)].id;}
function suggestedNextSessionAt(fromMs=now()){return Number(fromMs)+72*60*60*1000;}
function nextSessionDateLabel(ms){return new Intl.DateTimeFormat(localeFor(languageCode(state)),{day:'numeric',month:'short'}).format(new Date(ms));}
function localDateInput(ms){const d=new Date(ms),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function timeParts(value,fallback){const m=/^(\d{2}):(\d{2})$/.exec(String(value||''));if(!m)return fallback;return[Math.max(0,Math.min(23,Number(m[1]))),Math.max(0,Math.min(59,Number(m[2])))];}
function nextReminderTimes(nextAt){const d=new Date(nextAt),[eh,em]=timeParts(state.app_state.eveningReminderTime,[19,0]),[mh,mm]=timeParts(state.app_state.morningReminderTime,[8,0]);return{evening:new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,eh,em,0,0).getTime(),morning:new Date(d.getFullYear(),d.getMonth(),d.getDate(),mh,mm,0,0).getTime()};}
function latestRecordedSessionAt(){const rows=state.workout_sessions.filter(x=>x.status==='COMPLETE'||x.status==='ABORTED').map(x=>Number(x.endedAt||x.startedAt||0)).filter(Boolean);return rows.length?Math.max(...rows):null;}
async function showBrowserNotification(title,body,tag){const lang=languageCode(state);return deliverPwaNotification(translateUI(title,lang),{body:translateUI(body,lang),tag,silent:true,icon:'./icons/icon-192.png',badge:'./icons/favicon-64.png'});}
async function requestNotificationPermission(){
 const native=globalThis.GymProgressAndroid;
 if(native&&typeof native.requestNotifications==='function'){
  native.requestNotifications();toast(S('Review the Android notification permission prompt.','Apstiprini Android paziņojumu atļaujas pieprasījumu.'));return;
 }
 if(!('Notification'in window)){toast(S('Notifications are not available here.','Paziņojumi šeit nav pieejami.'));return;}
 const result=await Notification.requestPermission();toast(result==='granted'?S('Notifications enabled','Paziņojumi ieslēgti'):S('Notifications not enabled','Paziņojumi nav ieslēgti'));render();
}
async function checkMotivationReminders(){if(globalThis.GymProgressAndroid)return;const a=state?.app_state;if(!a?.motivationEnabled)return;let changed=false;const t=now();if(!activeSession()){const last=latestRecordedSessionAt();if(last!=null&&t>=last+Number(a.inactivityReminderHours||72)*3600000&&a.lastInactivityReminderFor!==last){const days=Math.round(Number(a.inactivityReminderHours||72)/24);if(await showBrowserNotification('Ready for another session?',`It’s been ${days} ${days===1?'day':'days'} since your last recorded workout.`,'gym-inactivity')){a.lastInactivityReminderFor=last;changed=true;}}}const nextAt=a.nextSessionAt==null?null:Number(a.nextSessionAt);if(nextAt!=null){const {evening,morning}=nextReminderTimes(nextAt);if(t>=evening&&t<morning&&a.nextEveningReminderFor!==nextAt){if(await showBrowserNotification('Gym tomorrow','Your next session is planned for tomorrow.','gym-next-evening')){a.nextEveningReminderFor=nextAt;changed=true;}}if(t>=morning&&a.nextMorningReminderFor!==nextAt){if(await showBrowserNotification(t>nextAt?'Planned session is due':'Gym today',t>nextAt?'Your planned gym session is now overdue.':'Your next session is planned for today.','gym-next-morning')){a.nextMorningReminderFor=nextAt;changed=true;}}}if(changed)await persist();}

const UPDATE_ANNOUNCEMENT_KEY='gym-progress-pwa-update-brief-version';
const LAST_SEEN_APP_VERSION_KEY='gym-progress-pwa-last-seen-version';
const UPDATE_FEATURES=[
 {version:'2.2.6',key:'workout-timer-safety',importance:12,en:'Timed sets and finished rests now wait for explicit confirmation, including after screen lock. Undo supports replacement before any set has been recorded, with individual superset members kept paired. Performance advice identifies its exercise and Tracker uses compositor animation.',lv:'Laika piegājieni un beigusies atpūta tagad gaida tavu apstiprinājumu arī pēc ekrāna bloķēšanas. Pēc atsaukšanas var aizstāt vingrinājumu, ja tā piegājieni vēl nav reģistrēti; superseta pāris saglabājas. Pielāgošanas ieteikumos redzams vingrinājuma nosaukums, un Tracker animācija notiek grafiskajā kompozitorā.'},
 {version:'2.2.5',key:'security-boundaries',importance:11,en:'Stronger protection for shared training data, restricted Android native permissions, and safer server data limits. Your existing workouts and calculations are unchanged.',lv:'Pastiprināta kopīgoto treniņu datu aizsardzība, ierobežotas Android sistēmas funkciju atļaujas un drošāki servera datu apjoma limiti. Esošie treniņi un aprēķini nav mainīti.'},
 {version:'2.2.4',key:'private-diagnostics-reports-volume',importance:10,en:'Volume progress now compares the total recorded strength load for a workout day, with a note when its composition changed. Historical sync anomalies are handled privately; Data review has been removed. You can report a problem or send feedback from Settings, with optional privacy-limited diagnostics.',lv:'Apjoma progress tagad salīdzina visu treniņa dienas reģistrēto spēka slodzi; par izmaiņām treniņa sastāvā tiek pievienota piezīme. Vēsturiskās sinhronizācijas anomālijas paliek iekšējā diagnostikā; Datu pārskats ir noņemts. Iestatījumos var ziņot par problēmu vai nosūtīt atsauksmi, pēc izvēles pievienojot ierobežotu diagnostiku.'},
 {version:'2.2.2',key:'usernames-stable-history-android-audio',importance:9,en:'Friend discovery now uses unique usernames rather than e-mail. Historical exercise records retain their identity when relinked. Volume progress compares matching exercises after programme changes. Workout audio, warm-up cues, rest overview, upcoming supersets, settings organisation and Android rest status have been improved.',lv:'Draugus var meklēt pēc unikāla lietotājvārda, nevis e-pasta. Vēsturiskie vingrinājumu ieraksti pēc kataloga sasaistes nemainās. Apjoma progress salīdzina atbilstošus vingrinājumus arī pēc programmas izmaiņām. Uzlabotas treniņa skaņas, iesildīšanās signāli, atpūtas pārskats, supersetu priekšskatījums, iestatījumu izkārtojums un Android atpūtas statuss.'},
 {version:'2.2.1',key:'native-audio-countdown-status',importance:8,en:'Workout sounds now use one Android-native countdown, with a single ongoing workout notification and per-exercise entry reminders. Skipping an exercise now offers optional rest. The redundant workout Home icon was removed.',lv:'Treniņa skaņām tagad ir viena Android atskaite, viens pastāvīgs treniņa paziņojums un atgādinājumi par vingrinājuma piegājiena ievadi. Izlaižot vingrinājumu, tagad tiek piedāvāta atpūta. Lieka Sākuma ikona treniņa galvenē ir noņemta.'},
 {version:'2.2.0',key:'offline-account-native-reminders-safe-upgrades',importance:10,en:'Offline training can now be attached to your account explicitly; signing out keeps account data private. Android has native background workout sounds and Tracker reminders. PWA updates wait until training is complete and local changes are synced.',lv:'Bezsaistes treniņus tagad var apzināti piesaistīt kontam; izrakstoties konta dati paliek privāti. Android pievienoti fona treniņu signāli un Tracker atgādinājumi. PWA atjauninājumi gaida treniņa pabeigšanu un datu sinhronizāciju.'},
 {version:'2.1.1',key:'friends-settings-cardio-android',importance:4,en:'Add friend now appears at the end of the expanded Friends card. Exercise comparison consent is managed in Settings, and cardio summaries put average heart rate before RPE.',lv:'Drauga pievienošana atrodas izvērstās Draugu kartītes beigās. Vingrinājumu salīdzināšanas atļauja ir Iestatījumos, un kardio kopsavilkumā vidējais pulss ir pirms RPE.'},
 {version:'2.1.2',key:'release-and-sync-recovery',importance:8,en:'Refresh now checks for verified app updates and syncs all training data automatically. Historical sync exceptions are retained safely. Exercise comparison has moved below workout settings.',lv:'Pārlādēšana tagad automātiski pārbauda lietotnes atjauninājumus un sinhronizē treniņu datus. Neparasti sinhronizācijas ieraksti tiek droši saglabāti. Vingrinājumu salīdzināšana pārvietota zem treniņu iestatījumiem.'},
 {version:'2.1.0',key:'consent-workout-integrity',importance:6,en:'Strength comparison is now an account-level opt-in with immediate withdrawal. Workout-step Undo/Redo, zero-weight entry, Tracker history and data validation have been strengthened.',lv:'Spēka salīdzināšana tagad ir konta izvēle ar tūlītēju datu atsaukšanu. Uzlabota treniņa darbību atsaukšana/atjaunošana, nulles svara ievade, Tracker vēsture un datu pārbaude.'},
 {version:'2.1.0',key:'performance-and-cards',importance:3,en:'Reduced repeated metric calculations and improved four-column cardio summaries in Workout Log.',lv:'Samazināti atkārtotie rādītāju aprēķini un uzlabots četru kolonnu kardio kopsavilkums treniņu žurnālā.'},
 {version:'2.0.4',key:'workout-log-sounds-notices',importance:5,en:'Workout Log cards now show every strength progress metric and four equally sized cardio metrics, with effort below the data. Compact workout controls, clearer notices and precise rest cues are restored.',lv:'Treniņu žurnālā atjaunots spēka apjoma progress un četri vienādi kardio rādītāji, piepūles novērtējums ir apakšā. Atjaunota kompakta treniņa galvene, pārskatāmi paziņojumi un precīzi atpūtas signāli.'},
 {version:'2.0.3',key:'workout-log-header',importance:3,en:'Clear two-line workout log headings, compact evenly spaced cardio metrics, stable active-workout controls and Add friend in its card.',lv:'Skaidras divrindu žurnāla galvenes, vienmērīgi kardio rādītāji, stabila treniņa vadība un Drauga pievienošana kartītē.'},
 {version:'2.0.2',key:'ui-density-consistency',importance:3,en:'Clear green-to-red effort colours, stable section header, explicitly spaced workout status and one-row cardio statistics.',lv:'Skaidri piepūles toņi no zaļā līdz sarkanam, nemainīga galvenes augstuma josla, precīzas atstarpes un kardio rādītāji vienā rindā.'},
 {version:'2.0.1',key:'sync-on-login',importance:5,en:'Signing in now restores cloud training data before the Home programme prompt.',lv:'Pēc pieslēgšanās mākoņa treniņu dati tiek ielādēti pirms sākuma programmas piedāvājuma.'},
 {version:'2.0.1',key:'friends-progress-fix',importance:4,en:'Friends comparison and Progress all-days history have been corrected.',lv:'Labots draugu salīdzinājums un visu dienu vēsture sadaļā Progress.'},
 {version:'2.0.1',key:'idle-updates',importance:3,en:'Idle app windows now coordinate updates automatically; unfinished workouts remain protected.',lv:'Dīkstāvē atjauninājumi notiek automātiski; nepabeigti treniņi paliek aizsargāti.'},
 {version:'2.0.1',key:'compact-ui',importance:2,en:'Neutral cards, clear effort labels, pastel rhythm dots, corrected Home spacing and smaller UI adjustments.',lv:'Neitrālas kartītes, izceltas piepūles norādes, pasteļtoņu ritma punkti un izlabotas atstarpes.'},
 {version:'2.0.0',key:'v2-design',importance:5,en:'A compact, consistent interface with light, dark and system themes, clearer cards and smoother navigation.',lv:'Kompakta, vienota saskarne ar gaišo, tumšo un sistēmas tēmu, pārskatāmām kartītēm un plūstošu navigāciju.'},
 {version:'2.0.0',key:'v2-workouts',importance:4,en:'Undo, Redo and Home stay within reach during workouts. The finish summary opens immediately with a new full-screen animation.',lv:'Treniņa laikā vienmēr pieejama atsaukšana, atjaunošana un sākumekrāns. Pabeidzot uzreiz atveras kopsavilkums ar jaunu pilnekrāna animāciju.'},
 {version:'2.0.0',key:'v2-progress',importance:3,en:'Progress entries open the exact exercise in its workout. Programme days, effort colours and shared cards are clearer.',lv:'Progresa ieraksti atver konkrēto vingrinājumu treniņa žurnālā. Skaidrākas programmas dienas, piepūles krāsas un kopīgotās kartītes.'},
 {version:'2.0.0',key:'v2-language',importance:2,en:'Catalogue names follow your language; personal names stay yours. Latvian text, decimal numbers and controls are consistent.',lv:'Kataloga nosaukumi atbilst izvēlētajai valodai; personīgie nosaukumi tiek saglabāti. Vienoti tulkojumi, decimālatdalītāji un vadīklas.'},
 {version:'2.0.0',key:'v2-foundation',importance:1,en:'Shared calculation rules, account-separated storage and safer synchronisation protect your training history.',lv:'Vienoti aprēķinu noteikumi, atdalīti kontu dati un drošāka sinhronizācija aizsargā treniņu vēsturi.'}
];
function updatePreviousVersion(){
 try{return localStorage.getItem(LAST_SEEN_APP_VERSION_KEY)||localStorage.getItem(UPDATE_ANNOUNCEMENT_KEY)||'1.x';}catch{return '1.x';}
}
// v1.x used the same acknowledgement keys. Do not equate an update check or
// automatic service-worker installation with having READ a release note.
function showUpdateAnnouncementIfNeeded(){
 if(!state||runtime()||document.querySelector('#dialog-root .dialog-backdrop'))return false;
 if(socialSignedIn()&&accountBootstrapStatus!=='ready')return false;
 const previous=updatePreviousVersion();if(compareVersions(previous,APP_VERSION)>=0)return false;
 const selected=[],seen=new Set();for(const item of UPDATE_FEATURES){
   if(compareVersions(item.version,previous)>0&&compareVersions(item.version,APP_VERSION)<=0&&!seen.has(item.key)){
     seen.add(item.key);selected.push(item);
   }
 }
 if(!selected.length)return false;
 const legacyUpgrade=compareVersions(previous,'2.0.0')<0;
 const ordered=selected.slice().sort((a,b)=>Number(b.importance||1)-Number(a.importance||1)||compareVersions(b.version,a.version));
 // A legacy user must see both the v2 foundations and the most significant
 // corrections. Longer cumulative upgrades get more lines, not a new page.
 const relevant=legacyUpgrade?ordered.slice(0,9):ordered.slice(0,6);
 const lv=languageCode(state)==='lv',title=lv?'Kas jauns':'What’s new';
 const intro=lv?`Jaunumi kopš ${previous}`:`New since ${previous}`;
 openDialog(`<div class="update-brief"><div class="small">GYM PROGRESS · ${esc(APP_VERSION)}</div><h2>${esc(title)}</h2><div class="update-brief-intro">${esc(intro)}</div><ul>${relevant.map(x=>`<li>${esc(lv?x.lv:x.en)}</li>`).join('')}</ul><div class="dialog-actions"><button onclick="gp.dismissUpdateAnnouncement()">${esc(lv?'Sapratu':'Got it')}</button></div></div>`,{notice:true});
 return true;
}
function dismissUpdateAnnouncement(){
 try{localStorage.setItem(LAST_SEEN_APP_VERSION_KEY,APP_VERSION);localStorage.setItem(UPDATE_ANNOUNCEMENT_KEY,APP_VERSION);}catch{}
 closeDialog();
 // The initial account sync already runs automatically; do not offer a second,
 // unnecessary synchronisation review after acknowledging release notes.
 if(route.name==='home'&&(!socialSignedIn()||accountBootstrapStatus==='ready')&&!state.workout_templates.some(w=>w.isActive!==false)&&!state.app_state.starterPromptDismissed)
   setTimeout(()=>{if(!document.querySelector('.dialog-backdrop')&&route.name==='home')showEmptyStarterPrompt();},70);
}

function expandChevron(extraClass=''){return `<span class="app-expand-chevron ${extraClass}" aria-hidden="true"><svg viewBox="0 0 24 14" focusable="false"><path d="M3 3l9 8 9-8"/></svg></span>`;}
function navChevron(){return expandChevron('nav-chevron');}
function pencilIcon(){return `<svg class="pencil-outline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l3.2-.8L18.4 8l-2.4-2.4L5.8 15.8 5 19Z"/><path d="m14.6 7 2.4 2.4"/></svg>`;}

async function init(){
 restoreCachedReferenceData();
 initUI({getLanguage:()=>languageCode(state),onThemeChange:()=>render(),closeDialog:()=>closeDialog(),onReorder:(kind,id,delta)=>kind==='workout'?moveWorkout(Number(id),delta):moveExerciseBlock(Number(id),delta)});
 // Restore an expired access token from its durable refresh token. Temporary
 // network failures must not erase the local account or cached training data.
 const savedSession=socialSession();
 if(savedSession?.refresh_token&&Number(savedSession.expires_at||0)>0&&Number(savedSession.expires_at)*1000<Date.now()+60000)
   await refreshSocialSession().catch(error=>console.warn('Session refresh deferred:',error));
 const loaded=await setWorkspace(socialSignedIn()?'account:'+socialUser().id:'guest');
 if(loaded&&Number(loaded.internalVersion||0)<20)await saveRecoveryState(loaded,'pre-v2-normalization');
 const initial=defaults();if(!loaded){const original=await readOriginalLocalState().catch(()=>null);Object.assign(initial.app_state,originalDevicePreferences(original));}
 state=loaded?normalize(loaded):normalize(initial);stateWorkspace=currentWorkspace();
 if(socialSignedIn())state.sync_foundation.accountId=socialUser().id;
 ui.selectedWorkoutId=state.app_state.nextWorkoutId;
 accountBootstrapStatus=socialSignedIn()?'loading':'ready';syncWorkoutAlarmPlan();render();
 if(loaded&&fingerprint(state)!==fingerprint(loaded))await saveState(state);
 if(state.runtime?.phase==='CARDIO_ENTRY'){route={name:'active',id:null};render();openCardioEntry();}
 void loadPerformanceRules().then(()=>render()).catch(reportAppError);
 if(socialConfigured()){void refreshReferenceData().then(changed=>{if(changed)render();}).catch(()=>{});if(socialSignedIn()){const owner=socialUser().id;getMyProfile().then(x=>{if(socialUser()?.id!==owner)return;socialUi.profile=x;render();}).catch(()=>{});void refreshSocialBadge();}}
 if(!globalThis.GymProgressAndroid&&'serviceWorker'in navigator)void registerServiceWorker();
 if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
 tickHandle=setInterval(()=>void tick().catch(reportAppError),1000);
 backgroundHandles.push(setInterval(()=>void refreshSocialBadge(),30000),setInterval(()=>void resumeCloudSync('interval'),300000));
 // Startup/refresh always runs bootstrapAccountHistory. BFCache restores,
 // foreground returns and connectivity recovery also reconcile automatically.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){resumeApp('resume');void tick();}});
 window.addEventListener('focus',()=>{resumeApp('focus');void tick();});
 window.addEventListener('pageshow',event=>{if(event.persisted)resumeApp('history-restore',true);});
 window.addEventListener('online',()=>resumeApp('online',true));
 window.addEventListener('gp:auth-changed',()=>void switchAccountWorkspace().catch(reportAppError));
 window.addEventListener('pagehide',()=>{if(state&&!writeBlocked&&!workspaceTransition&&currentWorkspace()===stateWorkspace)void persist().catch(()=>{});});
 if(socialSignedIn()){void bootstrapAccountHistory().catch(reportAppError);void refreshOfflineAttachmentStatus().then(()=>{if(route.name==='settings')render();});}
}

function accountDisplayLabel(){return socialSignedIn()?(socialUi.profile?.display_name||String(socialUser()?.email||S('Account','Konts')).split('@')[0]):S('Log in','Pieslēgties');}
function accountChip(){return `<button class="account-chip ${socialSignedIn()?'signed-in':''}" onclick="gp.openAccount()">${esc(accountDisplayLabel())}</button>`;}
function shell(content,{topbar:customTopbar=null,navBar=true}={}){
 const titles={home:S('Home','Sākums'),logs:S('Logs','Žurnāls'),progress:S('Progress','Progress'),friends:S('Friends','Draugi'),settings:S('Settings','Iestatījumi')};
 const header=customTopbar||'<div class="topbar main-header"><h1 class="topbar-title">'+esc(titles[route.name]||'Gym Progress')+'</h1><div class="topbar-actions">'+accountChip()+'</div></div>';
 // Header height must not change with section navigation. The active-session notice is separate.
 return '<div class="app-shell"><div class="persistent-head">'+header+'</div>'+(route.name!=='active'?activeSessionBanner():'')+(route.name!=='active'?updateReadyBanner():'')+'<main class="view with-top '+(route.name==='home'?'home-view':'')+'">'+content+'</main>'+(navBar?bottomNav():'')+'</div>';
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
function navButton(name,icon,label,badge=false){const selected=route.name===name||(name==='logs'&&route.name==='session')||(name==='settings'&&['programme','workout','manual'].includes(route.name))||(name==='home'&&route.name==='active');return `<button data-route="${name}" class="${selected?'active':''}" onclick="gp.nav('${name}')"><span class="nav-icon nav-icon-wrap">${icon}${badge?'<i class="nav-badge"></i>':''}</span><span>${esc(S(label,label==='Friends'?'Draugi':label))}</span></button>`;}
function topbar(title,back='home',right=''){const account=route.name==='active'?'':accountChip();return `<div class="topbar"><button class="icon-btn topbar-back" aria-label="${esc(S('Back','Atpakaļ'))}" onclick="gp.nav('${back}')"><svg class="topbar-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 8 12l7.5 7.5"/></svg></button><h1 class="topbar-title">${esc(title)}</h1><div class="topbar-actions">${right}${account}</div></div>`;}

function render(){
  if(!state||deferWhileComposing(appEl,render))return;
  document.documentElement.lang=languageCode(state);try{localStorage.setItem('gym-progress-language-v2',languageCode(state));}catch{}
  const uiSnapshot=captureUIState(appEl);
  beginMetricsRender();
  let html;
  switch(route.name){
    case'logs':html=renderLogs();break;case'progress':html=renderProgress();break;case'friends':html=renderFriends();break;case'settings':html=renderSettings();break;case'manual':html=renderManual();break;
    case'programme':html=renderProgramme();break;case'workout':html=renderWorkoutEditor(route.id);break;case'session':html=renderSessionDetail(route.id);break;
    case'active':html=renderActive();break;default:
      if(socialSignedIn()&&accountBootstrapStatus==='loading'&&!state.workout_templates.length)
        html=shell(`<div class="card sync-restore-card"><div class="sync-loading-row"><span class="sync-loading-spinner" aria-hidden="true"></span>${esc(S('Loading training history…','Ielādē treniņu vēsturi…'))}</div></div>`);
      else if(socialSignedIn()&&accountBootstrapStatus==='failed'&&!state.workout_templates.length)
        html=shell(`<div class="card sync-restore-card"><div class="note">${esc(S('Cloud history could not be loaded. Your records have not been replaced.','Neizdevās ielādēt mākoņa vēsturi. Ieraksti nav aizstāti.'))}</div><button class="secondary full" onclick="gp.retryInitialSync()">${esc(S('Retry sync','Atkārtot sinhronizāciju'))}</button></div>`);
      else html=renderHome();
  }
  setHTML(appEl,html);
  const lang=languageCode(state);document.documentElement.lang=lang;enhanceUI(appEl,{language:lang,scope:`${route.name}:${route.id??''}:${state.runtime?.phase??''}`});restoreUIState(appEl,uiSnapshot);
  updateLiveClocks();
  if(route.name==='active')afterActiveRender();
  if(route.name==='logs')requestAnimationFrame(bindWorkoutTimeline);
  if(route.name==='friends')requestAnimationFrame(bindFriendsTimeline);
  if(route.name==='programme'||route.name==='workout')requestAnimationFrame(bindProgrammeReorder);
  if(window.__gpShareDraft)renderShareSummary();
  if(route.name==='home'&&(!socialSignedIn()||accountBootstrapStatus==='ready')&&!runtime()){
    // First show the accumulated release announcement, after the initial
    // account sync and before any starter-programme empty-state prompt.
    setTimeout(()=>{
      if(route.name!=='home'||runtime()||releaseStartupCheckPending||serviceRegistration?.waiting||releaseCheckInFlight||document.querySelector('#dialog-root .dialog-backdrop')||(socialSignedIn()&&accountBootstrapStatus!=='ready'))return;
      if(showUpdateAnnouncementIfNeeded())return;
      if(!state.workout_templates.some(w=>w.isActive!==false)&&!state.app_state.starterPromptDismissed)showEmptyStarterPrompt();
    },80);
  }
  renderStatus();
  endMetricsRender();
  syncWorkoutAlarmPlan();
  if(serviceRegistration?.waiting) scheduleAutomaticUpdate();
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
function activeSessionBanner(){const s=activeSession();if(!s)return'';return `<button class="active-session-banner" onclick="gp.resume(${s.id})"><span class="active-dot"></span><span class="active-banner-copy"><strong data-i18n="WORKOUT IN PROGRESS">WORKOUT IN PROGRESS</strong><span>${esc(s.workoutName)}</span></span><span class="active-banner-time live-session-time" data-start="${s.startedAt}">${formatDuration(syncedElapsed(s.startedAt))}</span><span class="active-banner-arrow">▶</span></button>`;}
function updateLiveClocks(){const wall=Math.floor(now()/1000)*1000;document.querySelectorAll('.live-session-time,.live-countup').forEach(el=>{const start=Number(el.dataset.start);if(Number.isFinite(start))el.textContent=el.classList.contains('cardio-live-elapsed')&&Number(runtime()?.cardioDraft?.durationSeconds)>0?formatDuration(Number(runtime()?.cardioDraft?.durationSeconds)*1000):formatDuration(syncedElapsed(start,wall));});document.querySelectorAll('.live-rest-time').forEach(el=>{const end=Number(el.dataset.ends);if(Number.isFinite(end))el.textContent=formatDuration(Math.max(0,end-wall));});document.querySelectorAll('.live-timed-set,.live-superset-timed').forEach(el=>{const start=Number(el.dataset.start),target=Number(el.dataset.target);if(Number.isFinite(start)&&start>0&&Number.isFinite(target))el.textContent=formatDuration(Math.max(0,target-Math.floor((wall-start)/1000))*1000);});document.querySelectorAll('.cardio-progress-fill').forEach(el=>{const start=Number(el.dataset.start),target=Number(el.dataset.target);if(start>0&&target>0){const elapsed=Number(runtime()?.cardioDraft?.durationSeconds)>0?Number(runtime()?.cardioDraft?.durationSeconds):(wall-start)/1000;const pct=Math.min(100,Math.max(0,elapsed/target*100));el.style.width=pct+'%';el.parentElement?.setAttribute('aria-valuenow',String(Math.round(pct)));}});refreshWorkoutProgressBar();}
function settingStepper(label,value,onMinus,onPlus){return `<div class="setting-stepper"><span>${esc(translateUI(label,languageCode(state)))}</span><button class="icon-btn" onclick="${onMinus}">−</button><strong>${value}</strong><button class="icon-btn" onclick="${onPlus}">+</button></div>`;}
async function changeTargetRirMin(d){const a=state.app_state;a.targetRirMin=Math.max(0,Math.min(a.rirInputMax,a.targetRirMin+d));a.targetRirMax=Math.max(a.targetRirMin,a.targetRirMax);await persist();render();}
async function changeTargetRirMax(d){const a=state.app_state;a.targetRirMax=Math.max(a.targetRirMin,Math.min(a.rirInputMax,a.targetRirMax+d));await persist();render();}
async function setRirInputMax(v){const a=state.app_state;a.rirInputMax=Number(v)<=3?3:5;a.targetRirMin=Math.min(a.targetRirMin,a.rirInputMax);a.targetRirMax=Math.max(a.targetRirMin,Math.min(a.targetRirMax,a.rirInputMax));a.progressionRirThreshold=Math.min(a.progressionRirThreshold,a.rirInputMax);await persist();render();}
function renderManual(){const lang=languageCode(state);return shell(manualHtml(lang),{topbar:topbar(lang==='lv'?'Īsā pamācība':'Quick manual','settings')});}
function workoutNameExists(name,exceptId=null){const q=name.trim().toLocaleLowerCase();return state.workout_templates.some(w=>w.id!==Number(exceptId)&&w.name.trim().toLocaleLowerCase()===q);}
function flashTransition(msg,duration=INFO_MESSAGE_MS){ui.transitionMessage=msg;ui.transitionStartedAt=Date.now();ui.transitionDuration=duration;renderStatus();setTimeout(()=>{if(ui.transitionMessage===msg){ui.transitionMessage=null;renderStatus();}},duration);}
function hasPriorSimilarMovement(current){if(!current||current.rampMode!==RampMode.AUTO)return false;const family=warmupFamily(current.exerciseKey,current.name);if(!family)return false;const s=getSession(current.sessionId),exs=s?sessionExercises(state,s.id):[];return exs.some(e=>e.position<current.position&&exerciseSets(state,e.id).some(x=>x.status==='COMPLETE')&&warmupFamily(e.exerciseKey,e.name)===family);}
function showAutoregulationAdvice(advice){
  const next=getSet(advice.nextSetId);if(!next||next.status!=='PENDING')return;
  window.__gpAdvice={...advice,guard:captureRecommendationTarget(state,next.sessionExerciseId,{setId:next.id,contextVersion:localGeneration})};
  const ex=getSessionExercise(next.sessionExerciseId),recommendation=ex?.equipment===Equipment.BODYWEIGHT?`${advice.suggestedReps} ${S('reps','atk.')}`:`${formatKg(advice.suggestedWeightKg)} × ${advice.suggestedReps}`;
  openDialog(`<h2>${esc(translateUI(advice.title,languageCode(state)))}</h2><div class="small suggestion-exercise" data-user-content>${esc(ex?sessionDisplayName(ex):S('Unknown exercise','Nezināms vingrinājums'))} · ${esc(S('Set','Piegājiens'))} ${Number(advice.nextSetNumber||next.setNumber||1)}</div><div class="muted dialog-copy">${esc(translateUI(advice.reason,languageCode(state)))}</div><div class="advice-next"><span>${esc(S('Suggested set','Ieteiktais piegājiens'))} ${advice.nextSetNumber}</span><strong>${recommendation}</strong></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepAutoregulationCurrent()" data-i18n="Keep current">Keep current</button><button onclick="gp.applyAutoregulation()" data-i18n="Apply next set">Apply next set</button></div>`);
}
async function applyAutoregulation(){
  const advice=window.__gpAdvice,target=currentRecommendationTarget(state,advice?.guard,{contextVersion:localGeneration,requirePendingSet:true});
  if(!target){window.__gpAdvice=null;alertDialog(S('Suggestion changed','Ieteikums ir mainījies'),S('This workout or its target changed. Review the current values before adjusting them.','Treniņš vai tā mērķis ir mainījies. Pirms pielāgošanas pārbaudi pašreizējās vērtības.'));return;}
  const reps=recommendationReps(advice.suggestedReps),weight=recommendationWeight(advice.suggestedWeightKg);
  if(reps==null||target.exercise.equipment!==Equipment.BODYWEIGHT&&weight==null)return;
  if(target.exercise.equipment!==Equipment.BODYWEIGHT)target.set.plannedWeightKg=weight;
  target.set.targetReps=reps;target.set.autoregulated=true;window.__gpAdvice=null;
  await persist();closeDialog();render();toast(translateUI('Next set adjusted',languageCode(state)));continuePostSetQueue();
}
function keepAutoregulationCurrent(){window.__gpAdvice=null;closeDialog();continuePostSetQueue();}
async function finishAndSave(){const rt=runtime(),s=rt?getSession(rt.sessionId):null;if(!rt||!s)return;s.note=String($('#f-workout-note')?.value??s.note??'').trim().slice(0,2000);const finishedAt=now();s.endedAt=finishedAt;s.status='COMPLETE';if(s.advancesRotation&&s.workoutId!=null)state.app_state.nextWorkoutId=nextWorkoutAfter(s.workoutId);state.app_state.lastInactivityReminderFor=null;clearPostSetPrompts();state.runtime=null;ui.selectedWorkoutId=state.app_state.nextWorkoutId;persistWorkoutIntelligence(state,s.id);await persist();if(socialSignedIn()){void syncComparisonHistory().catch(console.warn);}releaseWakeLock();document.body.classList.add('workout-summary-open');nav('home');showWorkoutFinishCelebration(s.id,finishedAt);}
function closeWorkoutCelebration(){closeShareSummary();}
function nextSessionDialog(baseAt,{reschedule=false}={}){const suggestedAt=Number(baseAt||suggestedNextSessionAt());window.__gpNextSessionSuggestedAt=suggestedAt;openDialog(`<h2>${reschedule?'Reschedule next session':'Next session?'}</h2><div class="dialog-copy" data-i18n="Suggested date:">Suggested date: <strong>${esc(dateOnly(suggestedAt))}</strong></div><label class="field" data-i18n="Date">Date</label><input id="next-session-date" type="date" value="${localDateInput(suggestedAt)}"><div class="dialog-actions schedule-actions"><button onclick="gp.scheduleNextSession()">${reschedule?'Save date':'Schedule'}</button>${reschedule?`<button class="secondary" onclick="gp.skipNextSession()" data-i18n="Clear schedule">Clear schedule</button><button class="ghost" onclick="gp.closeDialog()" data-i18n="Cancel">Cancel</button>`:`<button class="secondary" onclick="gp.skipNextSession()" data-i18n="Skip">Skip</button>`}</div>`);}
function showNextSessionPrompt(finishedAt){nextSessionDialog(suggestedNextSessionAt(finishedAt));}
function rescheduleNextSession(){const current=state.app_state.nextSessionAt;nextSessionDialog(current==null?suggestedNextSessionAt():Number(current),{reschedule:current!=null});}
async function scheduleNextSession(){const suggestedAt=Number(window.__gpNextSessionSuggestedAt||state.app_state.nextSessionAt||suggestedNextSessionAt()),input=$('#next-session-date')?.value;let chosen=suggestedAt;if(input&&input!==localDateInput(suggestedAt)){const [y,m,d]=input.split('-').map(Number),base=new Date(suggestedAt);chosen=new Date(y,m-1,d,base.getHours(),base.getMinutes(),base.getSeconds(),base.getMilliseconds()).getTime();}state.app_state.nextSessionAt=chosen;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();window.__gpNextSessionSuggestedAt=null;closeDialog();render();toast(translateUI('Next session scheduled',languageCode(state)));}
async function skipNextSession(){state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();window.__gpNextSessionSuggestedAt=null;closeDialog();render();}
function renderFrequencyTimeline(){return `<section class="timeline-card"><div class="row between timeline-head"><div><div class="title" data-i18n="Workout frequency">Workout frequency</div><div class="small" data-i18n="Drag · pinch to zoom">Drag · pinch to zoom</div></div><div class="small" id="timeline-span" data-i18n="30 days">30 days</div></div><canvas id="workout-timeline" height="76" aria-label="${esc(translateUI('Workout frequency timeline',languageCode(state)))}"></canvas><div class="timeline-labels"><span id="timeline-start"></span><span id="timeline-end"></span></div></section>`;}
function defaultTimelineWindow(sessions,atMs=now()){const DAY=86400000,DEFAULT_DAYS=30;const sorted=[...sessions].sort((a,b)=>a.startedAt-b.startedAt);const earliest=Number(sorted[0]?.startedAt??atMs),latest=Number(sorted.at(-1)?.startedAt??atMs);const historyDays=Math.max((atMs-earliest)/DAY,1/1440);const shortHistory=historyDays<DEFAULT_DAYS;return{earliest,latest,historyDays,shortHistory,days:shortHistory?historyDays:DEFAULT_DAYS,endMs:shortHistory?atMs:Math.max(atMs,latest+DAY/12)}}
function bindWorkoutTimeline(){const canvas=$('#workout-timeline');if(!canvas)return;const sessions=state.workout_sessions.filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').sort((a,b)=>a.startedAt-b.startedAt);if(!sessions.length)return;const DAY=86400000,initial=defaultTimelineWindow(sessions),latest=initial.latest,earliest=initial.earliest,initialDays=initial.days,minDays=Math.min(7,initialDays);if(ui.timelineEndMs==null){ui.timelineDays=initialDays;ui.timelineEndMs=initial.endMs;}const pointers=new Map();let lastSingleX=null,lastDistance=null,downPoint=null,dragged=false,hitDots=[];
  const clampWindow=()=>{ui.timelineDays=Math.max(minDays,Math.min(3650,ui.timelineDays));const span=ui.timelineDays*DAY,maxEnd=Math.max(now(),latest+DAY/12),minEnd=earliest+span;ui.timelineEndMs=minEnd>maxEnd?maxEnd:Math.max(minEnd,Math.min(maxEnd,ui.timelineEndMs));};
  const draw=()=>{clampWindow();const cssW=Math.max(1,canvas.clientWidth),cssH=76,dpr=window.devicePixelRatio||1;canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);const start=ui.timelineEndMs-ui.timelineDays*DAY,y=38;ctx.strokeStyle='rgba(180,180,190,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(2,y);ctx.lineTo(cssW-2,y);ctx.stroke();hitDots=[];for(const ss of sessions){if(ss.startedAt<start||ss.startedAt>ui.timelineEndMs)continue;const rawX=((ss.startedAt-start)/(ui.timelineEndMs-start))*cssW,x=Math.max(7,Math.min(cssW-7,rawX)),sm=sessionMetrics(state,ss),sd=workoutLogEffort(ss,sm);const palette={comfortable:'effort-easy-dot',challenging:'effort-moderate-dot',hard:'effort-hard-dot','very-hard':'effort-max-dot',failure:'effort-max-dot',aborted:'effort-max-dot','cardio-easy':'effort-easy-dot','cardio-moderate':'effort-moderate-dot','cardio-hard':'effort-hard-dot','cardio-veryhard':'effort-max-dot'};const key=palette[sd.key]||'rhythm-neutral';ctx.fillStyle=themeColour(key)||sd.color;ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fill();hitDots.push({x,y,sessionId:ss.id});}$('#timeline-start').textContent=shortTimelineDate(start);$('#timeline-end').textContent=shortTimelineDate(ui.timelineEndMs);$('#timeline-span').textContent=translateUI(timelineSpanLabel(ui.timelineDays),languageCode(state));canvas.classList.toggle('dots-clickable',ui.timelineDays<=7.05);};
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
  let content='';
  if(!workouts.length){content+=`<div class="card empty"><h3 data-i18n="No programme yet">No programme yet</h3><button onclick="gp.nav('programme')" data-i18n="Create programme">Create programme</button></div>`;}
  else{
    content+=`<div class="section-title" data-i18n="Workout rotation">Workout rotation</div>`;
    workouts.forEach((w,i)=>{
      const isActive=active?.workoutId===w.id,due=!active&&w.id===state.app_state.nextWorkoutId,sel=w.id===ui.selectedWorkoutId,expanded=w.id===ui.expandedWorkoutId,ex=getTemplateExercises(w.id);
      const cls=[isActive?'active-workout':'',due?'selected-due':'',sel&&!active&&!due?'selected-override':'',expanded?'expanded':''].filter(Boolean).join(' ');
      // These are literal ASCII spaces on BOTH sides of the separator, not flex gaps.
      const divider='<span class="home-meta-separator" aria-hidden="true"> · </span>';
      const label=isActive?`<span class="status-accent">${esc(S('in progress','procesā'))}</span>`:due?`<span class="status-next-text">${esc(S('next','nākamais'))}</span>`:'';
      // Keep punctuation and its following label together, with layout-owned gaps.
      const status=label?`<span class="home-meta-status">${divider}${label}${due&&state.app_state.nextSessionAt!=null?`${divider}<span class="next-session-date">${nextSessionDateLabel(Number(state.app_state.nextSessionAt))}</span>`:''}</span>`:'';
      const shortList=`<div class="ui-disclosure" data-disclosure-key="home-workout-${w.id}" data-expanded="${expanded}" ${expanded?'':'inert aria-hidden="true"'}><div class="ui-disclosure-inner"><div class="home-exercise-list ${isActive?'active-list':''}">${ex.length?ex.map(x=>`<div class="home-exercise-line"><span>${esc(templateDisplayName(x))}</span><span>${x.trackingMode===TrackingMode.CARDIO?formatDuration(Number(x.targetSeconds||1800)*1000):`${x.sets} × ${x.trackingMode===TrackingMode.TIME_ONLY?formatDuration(Number(x.targetSeconds||60)*1000):`${x.reps} × <strong class="home-weight">${x.equipment===Equipment.BODYWEIGHT?translateUI('Bodyweight',languageCode(state)):formatKg(x.initialWeightKg)}</strong>`}`}</span></div>`).join(''):`<div class="small" data-i18n="No exercises">No exercises</div>`}</div></div></div>`;
      const play=isActive?`<button class="icon-btn play-btn" aria-label="${esc(S('Return to workout','Atgriezties treniņā'))}" onclick="event.stopPropagation();gp.resume(${active.id})"><svg class="home-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.4 17.1 12 9 17.6Z"/></svg></button>`:`<button class="icon-btn play-btn" aria-label="${esc(S('Start workout','Sākt treniņu'))}" onclick="event.stopPropagation();gp.requestStart(${w.id})"><svg class="home-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.4 17.1 12 9 17.6Z"/></svg></button>`;
      const calendar=due?`<button class="icon-btn calendar-btn" aria-label="${esc(state.app_state.nextSessionAt!=null?S('Reschedule next session','Pārplānot nākamo treniņu'):S('Schedule next session','Ieplānot nākamo treniņu'))}" title="${esc(state.app_state.nextSessionAt!=null?S('Reschedule','Pārplānot'):S('Schedule','Ieplānot'))}" onclick="event.stopPropagation();gp.rescheduleNextSession()">▦</button>`:'';
      content+=`<div class="card workout-row ${cls}"><div class="card-row workout-row-inner clickable" onclick="gp.toggleWorkoutDetails(${w.id})"><div class="pill turn-number">${i+1}</div><div class="grow"><div class="title">${esc(w.name)}</div><div class="subtitle home-workout-meta"><span>${esc(translateUI(`${ex.length} exercise${ex.length===1?'':'s'}`,languageCode(state)))}</span>${status}</div></div><div class="workout-action-slot home-action-buttons">${calendar}${play}</div></div>${shortList}</div>`;
    });
  }
  content+=renderTrackerCard();
  if(!window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/i.test(navigator.userAgent)){
    content+=`<div class="card install-note"><div class="title" data-i18n="Install on iPhone">Install on iPhone</div><div class="subtitle" data-i18n="In Safari: Share → Add to Home Screen → Add.">In Safari: Share → Add to Home Screen → Add.</div></div>`;
  }
  return shell(content);
}
function toggleWorkoutDetails(id){id=Number(id);ui.expandedWorkoutId=ui.expandedWorkoutId===id?null:id;if(!activeSession())ui.selectedWorkoutId=id;render();}
function selectWorkout(id){ui.selectedWorkoutId=Number(id);render();}
function returnFromBreakPlan(){const completed=state.workout_sessions.filter(x=>x.status==='COMPLETE'||x.status==='ABORTED').sort((a,b)=>Number(b.endedAt||b.startedAt)-Number(a.endedAt||a.startedAt));if(!completed.length)return null;const last=Number(completed[0].endedAt||completed[0].startedAt||0),days=Math.floor(Math.max(0,now()-last)/86400000);const factor=days<21?null:days<42?.95:days<70?.90:.85;return factor?{days,factor}:null;}
function offerReturnLoadOrStart(id){const plan=returnFromBreakPlan();if(!plan){void startWorkout(id);return;}const pct=Math.round(plan.factor*100);openDialog(`<h2>${esc(S('Returning after a break?','Atgriešanās pēc pārtraukuma?'))}</h2><div class="dialog-copy">${esc(S(`It has been ${plan.days} days since your last recorded workout. Start this session at about ${pct}% of your programmed working weights? Your programme itself will not change.`,`Kopš pēdējā reģistrētā treniņa pagājušas ${plan.days} dienas. Vai sākt šo treniņu ar aptuveni ${pct}% no programmas darba svariem? Pati programma netiks mainīta.`))}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog();gp.startWorkout(${Number(id)},1)">${esc(S('Keep normal weights','Saglabāt parastos svarus'))}</button><button onclick="gp.closeDialog();gp.startWorkout(${Number(id)},${plan.factor})">${esc(S(`Use ${pct}% this session`,`Šajā treniņā izmantot ${pct}%`))}</button></div>`);}
function requestStart(id){
  id=Number(id); if(id!==state.app_state.nextWorkoutId){const w=getWorkout(id);confirmDialog(`Start ${w?.name||'workout'}?`,`This is not the workout currently due. When you complete it, the rotation will continue from this workout.`,`Start anyway`,()=>{closeDialog();offerReturnLoadOrStart(id);});}else offerReturnLoadOrStart(id);
}
// A rejected async start must never vanish silently behind an inline onclick handler.
function reportWorkoutStartError(e){console.error('Workout start failed',e);alertDialog(translateUI('Could not start workout',languageCode(state)),translateUI(String(e?.message||e||'Unknown error'),languageCode(state))+'\n'+S('Your workout data is unchanged.','Treniņa dati nav mainīti.'));}

async function startWorkout(workoutId,loadFactor=1){
  if(activeSession()){toast(translateUI('A workout is already active',languageCode(state)));return;}
  state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;
  const w=getWorkout(workoutId),templates=getTemplateExercises(workoutId);if(!w||!templates.length){alertDialog(translateUI('Can’t start workout',languageCode(state)),translateUI('Add at least one exercise first.',languageCode(state)));return;}
  // Never block the workout start on an AudioContext.resume() promise. In some browsers
  // the context remains suspended until a subsequent gesture; the local workout must start anyway.
  void enableAudio();
  const t=now(),sid=uid(state.workout_sessions);
  state.workout_sessions.push({id:sid,workoutId:w.id,workoutName:w.name,startedAt:t,endedAt:null,status:'ACTIVE',note:'',analysisContext:captureAnalysisContext(state.app_state,{capturedAt:t}),advancesRotation:true,warmupStartedAt:t,warmupEndedAt:null,warmupSkipped:false,stretchStartedAt:null,stretchEndedAt:null,stretchSkipped:false});
  for(const te of templates){
    const eid=uid(state.session_exercises);const u=getUserExercise(state,te.userExerciseId),equipment=te.equipment||u?.equipment||Equipment.OTHER;const sessionWeight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(equipment)||Number(loadFactor)>=.999?Number(te.initialWeightKg||0):(reducedSelectableWeight(Number(te.initialWeightKg||0),equipment,(1-Number(loadFactor))*100)??Number(te.initialWeightKg||0));const plan=recommendRamp(sessionWeight,te.reps,te.exerciseType,te.exerciseKey,templateDisplayName(te),equipment,state.app_state.maxRampUpSets);
    state.session_exercises.push({id:eid,sessionId:sid,templateExerciseId:te.id,name:templateDisplayName(te),displayNameMode:u?.displayNameMode||(isCatalogueDisplayName(u?.displayName,canonicalExerciseById(u?.canonicalExerciseId))?'CATALOGUE':'CUSTOM'),position:te.position,targetSets:te.sets,targetReps:te.reps,plannedRestSeconds:te.restSeconds,plannedWeightKg:te.requiresCalibration?null:sessionWeight,requiresCalibration:te.requiresCalibration===true,startedAt:null,endedAt:null,status:'PENDING',note:'',progressionOffered:false,progressionAccepted:false,nextWeightKg:null,nextReps:null,exerciseKey:te.exerciseKey??u?.legacyExerciseKey??null,exerciseType:te.exerciseType||u?.exerciseType||ExerciseType.MODERATE_COMPOUND,rampMode:te.rampMode||RampMode.AUTO,removeWeights:!!te.removeWeights,equipment:te.equipment||u?.equipment||Equipment.OTHER,dumbbellLoad:te.dumbbellLoad||u?.dumbbellLoad||DumbbellLoad.SINGLE,userExerciseId:te.userExerciseId,programmeExerciseId:te.programmeExerciseId,canonicalExerciseId:u?.canonicalExerciseId||null,trackingMode:te.trackingMode||u?.trackingMode||TrackingMode.WEIGHT_REPS,targetSeconds:Number(te.targetSeconds||0),compareWithFriends:te.compareWithFriends===true,supersetGroupId:te.supersetGroupId||null,rampStartedAt:null,rampEndedAt:null,rampSkipped:false,rampPlanJson:JSON.stringify(plan),unloadStartedAt:null,unloadEndedAt:null,unloadSkipped:false});
    for(let i=0;i<te.sets;i++)state.performed_sets.push({id:uid(state.performed_sets),sessionExerciseId:eid,setNumber:i+1,targetReps:te.reps,actualReps:null,plannedWeightKg:te.requiresCalibration?null:sessionWeight,actualWeightKg:null,rir:null,failure:false,targetDurationSeconds:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(te.trackingMode)?Math.max(1,Number(te.targetSeconds||60)):0,actualDurationSeconds:null,plannedRestSeconds:te.restSeconds,actualRestSeconds:null,status:'PENDING',completedAt:null});
  }
  state.runtime={sessionId:sid,phase:'WARMUP',phaseStartedAt:t,currentExerciseIndex:0,currentSetIndex:0,workingWeight:state.session_exercises.find(x=>x.sessionId===sid)?.plannedWeightKg||0,entry:null,rest:null,nextAction:null,reminderStartedAt:null};
  // Local UI must not wait for a large IndexedDB commit before entering the workout.
  requestWakeLock();nav('active');
  await persist();
}
function runtimeNeedsRecovery(sessionId){const id=Number(sessionId),rt=state.runtime,s=getSession(id);if(!rt||Number(rt.sessionId)!==id||!s)return true;const ctx=currentActiveContext();if(rt.phase==='WARMUP')return s.warmupEndedAt!=null||!!s.warmupSkipped;if(['PRE_EXERCISE','RAMP_PROMPT','RAMP_ACTIVE','SET','TIMED_SET','CARDIO_ENTRY','ENTRY'].includes(rt.phase))return !ctx.e||!ctx.set||ctx.set.status!=='PENDING';if(rt.phase==='SUPERSET_ENTRY')return !Array.isArray(rt.supersetEntry)||!rt.supersetEntry.length||rt.supersetEntry.some(x=>getSet(x.setId)?.status!=='PENDING');if(rt.phase==='REST')return !rt.rest;if(rt.phase==='UNLOAD')return !ctx.e;if(rt.phase==='STRETCH')return s.stretchEndedAt!=null;return !['FINAL'].includes(rt.phase);}
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
function openTrackerSettings(){const items=(state.tracker_items||[]).slice().sort((a,b)=>(a.position||0)-(b.position||0)),notifyOn=trackerNotificationsEnabled(),permission=notificationPermissionState();openDialog(`<h2 data-i18n="Tracker">Tracker</h2><label class="setting-toggle-row tracker-notification-row"><span class="setting-toggle-copy"><strong data-i18n="Tracker notifications">Tracker notifications</strong><small>${esc(translateUI(permission==='denied'?'Blocked in system notification settings':notifyOn?'On · pace-aware daily reminders':'Off',languageCode(state)))}</small></span><span class="setting-toggle-control"><input class="setting-toggle-input" type="checkbox" ${notifyOn&&permission==='granted'?'checked':''} ${permission==='unavailable'?'disabled':''} onchange="gp.setTrackerNotifications(this.checked)"><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label><div class="note support-copy" data-i18n="Reminders are spread through each item’s productive day and are skipped while you are ahead of plan.">Reminders are spread through each item’s productive day and are skipped while you are ahead of plan.</div><div id="tracker-settings-list">${items.map(i=>`<div class="tracker-setting-line"><div class="min-zero"><span class="tracker-setting-name">${esc(i.name)}</span>${i.enabled===false?`<span class="small" data-i18n="· disabled"> · disabled</span>`:''}</div><span>${formatNumber(i.targetAmount,{maximumFractionDigits:4})}${i.unit?` ${esc(trackerUnit(i))}`:''}</span><button class="ghost tiny-btn" onclick="gp.editTrackerItem('${i.id}')" data-i18n="Edit">Edit</button><button class="ghost tiny-btn danger-text" onclick="gp.deleteTrackerItem('${i.id}')" data-i18n="Delete">Delete</button></div>`).join('')||"<div class=\"small\" data-interface-text>No items yet.</div>"}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()" data-i18n="Close">Close</button><button onclick="gp.editTrackerItem('')" data-i18n="+ Item">+ Item</button></div>`);}
async function setTrackerNotifications(enabled){
 if(!enabled){localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'0');sentTrackerReminderKeys.clear();syncAndroidReminders();toast(translateUI('Tracker notifications off',languageCode(state)));openTrackerSettings();return;}
 const native=globalThis.GymProgressAndroid;
 if(native){
  if(notificationPermissionState()!=='granted'){
   localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'0');
   localStorage.setItem('gym-progress-tracker-permission-pending','1');
   native.requestNotifications?.();toast(S('Allow notifications in Android to enable Tracker reminders.','Atļauj Android paziņojumus, lai ieslēgtu Tracker atgādinājumus.'));
   openTrackerSettings();return;
  }
 }else if(typeof Notification==='undefined'){toast(translateUI('Browser notifications are not available here',languageCode(state)));return;}
 else {let permission=Notification.permission;if(permission!=='granted')permission=await Notification.requestPermission();if(permission!=='granted'){toast(S('Tracker notifications not enabled','Tracker paziņojumi nav ieslēgti'));openTrackerSettings();return;}}
 localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'1');sentTrackerReminderKeys.clear();syncAndroidReminders();toast(translateUI('Tracker notifications on',languageCode(state)));openTrackerSettings();
}
function nativeNotificationPermissionResult(result='resume'){
 if(!globalThis.GymProgressAndroid)return;
 const pending=localStorage.getItem('gym-progress-tracker-permission-pending')==='1';
 if(pending&&notificationPermissionState()==='granted'){
   localStorage.removeItem('gym-progress-tracker-permission-pending');localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'1');
   toast(S('Tracker notifications enabled.','Tracker paziņojumi ieslēgti.'));
 }else if(pending&&result==='denied'){
   localStorage.removeItem('gym-progress-tracker-permission-pending');localStorage.setItem(TRACKER_NOTIFICATIONS_KEY,'0');
   toast(S('Notifications were not enabled. Open Android settings to grant permission.','Paziņojumi nav ieslēgti. Atļauju var piešķirt Android iestatījumos.'));
 }
 syncAndroidReminders();refreshAndroidAlerts();
}
function deleteTrackerItem(id){const item=(state.tracker_items||[]).find(x=>x.id===id);if(!item)return;confirmDialog(translateUI('Delete tracker item?',languageCode(state)),`${item.name} will be removed from Tracker. Existing backup data is not otherwise changed.`,translateUI('Delete',languageCode(state)),async()=>{const hasHistory=(state.tracker_entries||[]).some(x=>String(x.itemId)===String(id));
    if(hasHistory){item.enabled=false;item.archived=true;}else{state.tracker_items=state.tracker_items.filter(x=>x.id!==id);state.tracker_states=(state.tracker_states||[]).filter(x=>String(x.itemId)!==String(id));}
    await persist();closeDialog();render();openTrackerSettings();},true);}
function editTrackerItem(id){const old=(state.tracker_items||[]).find(x=>x.id===id)||{name:'',targetAmount:1,unit:'',increment:1,productiveStart:'08:00',productiveEnd:'22:00',enabled:true,position:state.tracker_items.length};formDialog(id?'Edit tracker item':'New tracker item',`<label class="field" data-i18n="Name">Name</label><input id="tr-name" maxlength="60" value="${esc(old.name)}"><div class="form-grid tracker-editor-grid"><div><label class="field" data-i18n="Daily target">Daily target</label><input id="tr-target" type="number" min="0.01" step="0.01" value="${old.targetAmount}"></div><div><label class="field" data-i18n="Unit">Unit</label><select id="tr-unit">${trackerUnitOptions(old.unit||'')}</select></div><div><label class="field" data-i18n="+/− increment">+/− increment</label><input id="tr-inc" type="number" min="0.01" step="0.01" value="${old.increment||1}"></div><div class="span2 tracker-time-row"><div><label class="field" data-i18n="Productive day from">Productive day from</label><input id="tr-start" type="time" value="${old.productiveStart||'08:00'}"></div><div><label class="field" data-i18n="To">To</label><input id="tr-end" type="time" value="${old.productiveEnd||'22:00'}"></div></div></div><label class="setting-toggle-row"><span class="setting-toggle-copy"><strong data-i18n="Enabled">Enabled</strong></span><span class="setting-toggle-control"><input id="tr-enabled" class="setting-toggle-input" type="checkbox" ${old.enabled!==false?'checked':''}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>`, translateUI('Save',languageCode(state)),async()=>{const row=id?old:{id:uuid(),position:state.tracker_items.length};const unit=$('#tr-unit').value;Object.assign(row,{name:$('#tr-name').value.trim().slice(0,60)||S('Tracker item','Tracker mērķis'),targetAmount:Math.max(.01,Number($('#tr-target').value)||1),unit,increment:unit?Math.max(.01,Number($('#tr-inc').value)||1):1,productiveStart:$('#tr-start').value||'08:00',productiveEnd:$('#tr-end').value||'22:00',enabled:$('#tr-enabled').checked,archived:$('#tr-enabled').checked?false:!!old.archived});if(!id){state.tracker_items.push(row);trackerState(row);}await persist();closeDialog();render();openTrackerSettings();},'gp.openTrackerSettings()');}
function trackerUnitOptions(selected=''){const values=['capsule','g','glass','ml','','pill','scoop','serving','tablet'];return values.slice().sort((a,b)=>(a||'no unit').localeCompare(b||'no unit')).map(v=>`<option value="${v}" ${String(selected||'')===v?'selected':''}>${v||'no unit'}</option>`).join('');}
function refreshTrackerRow(item){
  const el=[...document.querySelectorAll('.tracker-row[data-tracker-id]')].find(x=>x.dataset.trackerId===String(item.id));
  if(!el)return;
  const amount=trackerAmount(item),target=Math.max(.01,Number(item.targetAmount)||1),unit=trackerUnit(item),at=new Date();
  const done=amount>=target,behind=!done&&trackerBehind(item,at);
  el.classList.toggle('done',done);el.classList.toggle('behind',behind);
  const fill=el.querySelector('.tracker-progress-fill');paintTrackerFill(fill,amount/target,{reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true});
  const label=el.querySelector('.tracker-amount-button');if(label)label.textContent=`${formatNumber(amount,{maximumFractionDigits:4})}/${formatNumber(item.targetAmount||0,{maximumFractionDigits:4})}${unit?' '+unit:''}`;
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
function setTrackerAmount(id){const item=state.tracker_items.find(x=>x.id===id);if(!item)return;const current=trackerAmount(item),unit=trackerUnit(item);formDialog(`${S('Set','Iestatīt')} ${esc(item.name)}`,`<label class="field">${esc(S('Current amount','Pašreizējais daudzums'))}${unit?` (${esc(unit)})`:''}</label><input id="tr-current-amount" type="number" min="0" step="${unit?Math.max(.01,Number(item.increment||1)):1}" value="${current}">`,translateUI('Save',languageCode(state)),async()=>{const row=trackerState(item),value=Number($('#tr-current-amount').value);row.amount=Math.max(0,Number.isFinite(value)?value:current);await persist();closeDialog();render();});}
function trackerExpected(item,at=new Date()){return trackerPace(item,at).dueAmount;}
async function checkTrackerReminders(){if(globalThis.GymProgressAndroid)return;if(!trackerNotificationsEnabled()||notificationPermissionState()!=='granted')return;const d=new Date();for(const item of state.tracker_items.filter(x=>x.enabled!==false&&x.archived!==true)){const pace=trackerPace(item,d),actual=trackerAmount(item);if(pace.cur<pace.start||pace.slot<=0||actual+1e-6>=pace.target||actual+1e-6>=pace.dueAmount)continue;const key=`tracker/${trackerTodayKey()}/${item.id}/${pace.slot}`;if(sentTrackerReminderKeys.has(key))continue;const delivered=await showBrowserNotification(`Gym Progress · ${item.name}`,`${formatNumber(actual)}/${formatNumber(item.targetAmount)}${item.unit?` ${trackerUnit(item)}`:''} · ${S('By now','Līdz šim')}: ${formatNumber(pace.dueAmount)}/${formatNumber(item.targetAmount)}`,key);if(!delivered)continue;if(sentTrackerReminderKeys.size>200)sentTrackerReminderKeys.clear();sentTrackerReminderKeys.add(key);beepPattern('reminder');}}

function renderSettings(){
  const a=state.app_state,syncLabel=syncStatusLabel(state),syncUser=socialUser()?.email||'',syncEnabled=enabledSyncDomains(state);
  const content=`
  <div class="section-title">${esc(S('Appearance','Izskats'))}</div>
  <div class="card">${themePickerHTML(languageCode(state))}</div>
  <div class="card stack"><div class="title" data-i18n="Language">Language</div><div class="segmented"><button class="${a.languageCode==='en'?'active':''}" onclick="gp.setLanguage('en')">English</button><button class="${a.languageCode==='lv'?'active':''}" onclick="gp.setLanguage('lv')">Latviešu</button></div></div>
  <div class="section-title">${esc(S('Account & sync','Konts un sinhronizācija'))}</div>
  <div class="card stack account-settings-card"><div><div class="title">${esc(S('Account','Konts'))}</div><div class="subtitle">${esc(socialSignedIn()?(syncUser||accountDisplayLabel()):S('Not signed in','Nav pieslēgts'))}</div></div><button class="secondary full" onclick="gp.openAccount()">${esc(socialSignedIn()?S('Account settings / sign out','Konta iestatījumi / iziet'):S('Log in','Pieslēgties'))}</button>${socialSignedIn()&&offlineDataAvailable?`<button class="secondary full" onclick="gp.maybeOfferOfflineAttachment(true)">${esc(S('Attach offline training','Pievienot bezsaistes treniņus'))}</button>`:''}${socialSignedIn()?`<div class="divider"></div><div class="title">${esc(S('Sync','Sinhronizācija'))}</div><div class="small">${esc(translateUI(syncLabel,languageCode(state)))} · ${esc(S('Programme','Programma'))}: ${syncEnabled.includes('programme')?S('On','Ieslēgta'):S('Off','Izslēgta')} · ${esc(S('Workout history','Treniņu vēsture'))}: ${syncEnabled.includes('workout_log')?S('On','Ieslēgta'):S('Off','Izslēgta')} · Tracker: ${syncEnabled.includes('tracker')?S('On','Ieslēgta'):S('Off','Izslēgta')}</div><button class="secondary full" onclick="gp.openTrainingSyncReview()">${esc(S('Review & sync now','Pārskatīt un sinhronizēt'))}</button>`:''}</div>
  <div class="section-title">${esc(S('Programme','Programma'))}</div>
  <div class="card clickable" onclick="gp.nav('programme')"><div class="card-row"><div class="grow"><div class="title" data-i18n="Programme">Programme</div></div>${navChevron()}</div></div>
  <details class="card starter-settings"><summary><div><strong data-i18n="Starter programme">Starter programme</strong><div class="subtitle" data-i18n="Adds three editable workout days. Your existing programme is kept.">Adds three editable workout days. Your existing programme is kept.</div></div>${expandChevron('details-chevron')}</summary><div class="details-body"><button class="secondary full" onclick="gp.openStarterWizard()" data-i18n="Set up starter programme">Set up starter programme</button></div></details>
  <div class="card clickable" onclick="gp.nav('manual')"><div class="card-row"><div class="grow"><div class="title" data-i18n="Manual">Manual</div></div>${navChevron()}</div></div>
  <div class="card ramp-setting-card"><div class="row between"><div class="grow"><div class="title" data-i18n="Ramp-up sets">Ramp-up sets</div><div class="subtitle" data-i18n="Maximum automatic ramp-up sets">Maximum automatic ramp-up sets</div></div><div class="setting-stepper ramp-stepper"><button class="icon-btn" onclick="gp.changeMaxRampSets(-1)">−</button><strong>${a.maxRampUpSets}</strong><button class="icon-btn" onclick="gp.changeMaxRampSets(1)">+</button></div></div></div>
  <div class="section-title">${esc(S('Performance evaluation','Snieguma novērtēšana'))}</div>
  <div class="card stack"><div><div class="title" data-i18n="Training effort">Training effort</div><div class="subtitle" data-i18n="Default target is 1–2 RIR. Extend the scale only if your training deliberately stays farther from failure.">Default target is 1–2 RIR. Extend the scale only if your training deliberately stays farther from failure.</div></div>
    ${settingStepper('Target RIR minimum',a.targetRirMin,"gp.changeTargetRirMin(-1)","gp.changeTargetRirMin(1)")}
    ${settingStepper('Target RIR maximum',a.targetRirMax,"gp.changeTargetRirMax(-1)","gp.changeTargetRirMax(1)")}
    <div class="small" data-i18n="RIR input scale">RIR input scale</div><div class="segmented"><button class="${a.rirInputMax<=3?'active':''}" onclick="gp.setRirInputMax(3)">${esc(translateUI('Compact · 3+',languageCode(state)))}</button><button class="${a.rirInputMax>3?'active':''}" onclick="gp.setRirInputMax(5)">${esc(translateUI('Extended · 5+',languageCode(state)))}</button></div>
    <label class="setting-toggle-row"><span class="setting-toggle-copy"><strong data-i18n="0 RIR acceptable on the last set">0 RIR acceptable on the last set</strong><small data-i18n="For exercises with more than one set, a final set at target reps and 0 RIR will not trigger a reduction. Failure remains separate.">For exercises with more than one set, a final set at target reps and 0 RIR will not trigger a reduction. Failure remains separate.</small></span><span class="setting-toggle-control"><input class="setting-toggle-input" type="checkbox" ${a.lastSetZeroRirAcceptable?'checked':''} onchange="gp.toggleLastSetZeroRirAcceptable(this.checked)"><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>
  </div>
  <div class="card stack"><div class="title" data-i18n="Increase-weight threshold">Increase-weight threshold</div><div class="subtitle" data-i18n="Every required set must reach its rep target with at least this RIR and no failures.">Every required set must reach its rep target with at least this RIR and no failures.</div><div class="setting-stepper centered"><button class="icon-btn" onclick="gp.changeRirThreshold(-1)">−</button><strong>RIR ≥ ${a.progressionRirThreshold}</strong><button class="icon-btn" onclick="gp.changeRirThreshold(1)">+</button></div></div>
  <div class="card"><button class="secondary full" onclick="gp.editDifficulty()" data-i18n="Difficulty levels">Difficulty levels</button></div>
  <div class="section-title">${esc(S('Notifications & sounds','Paziņojumi un skaņas'))}</div>
  <div class="card stack"><div class="card-row"><div class="grow"><div class="title" data-i18n="Motivation &amp; reminders">Motivation & reminders</div><div class="subtitle" data-i18n="Optional inactivity and next-session reminders">Optional inactivity and next-session reminders</div></div><input style="width:auto" type="checkbox" ${a.motivationEnabled?'checked':''} onchange="gp.toggleMotivation(this.checked)"></div>${a.motivationEnabled?`${settingStepper('No workout for (days)',Math.round(a.inactivityReminderHours/24),"gp.changeInactivityDays(-1)","gp.changeInactivityDays(1)")}<div class="reminder-time-grid"><label><span class="field" data-i18n="Evening-before reminder">Evening-before reminder</span><input type="time" value="${esc(a.eveningReminderTime)}" onchange="gp.setReminderTime('evening',this.value)"></label><label><span class="field" data-i18n="Workout-day reminder">Workout-day reminder</span><input type="time" value="${esc(a.morningReminderTime)}" onchange="gp.setReminderTime('morning',this.value)"></label></div>${['default','denied'].includes(notificationPermissionState())?`<button class="secondary full" onclick="gp.requestNotificationPermission()">${esc(S('Allow notifications','Atļaut paziņojumus'))}</button>`:''}`:''}</div>
  <div class="card stack workout-sound-settings"><div class="title">${esc(S('Workout audio','Treniņa skaņas'))}</div><label class="setting-toggle-row"><span>${esc(S('Enable workout sounds','Ieslēgt treniņa skaņas'))}</span><input type="checkbox" ${a.soundEnabled!==false?'checked':''} onchange="gp.setSound(this.checked)"></label><label class="field" for="workout-warning-seconds">${esc(S('Warning before next set','Brīdinājums pirms nākamā piegājiena'))}</label><select id="workout-warning-seconds" onchange="gp.setWorkoutSoundPreference('workoutWarningSeconds',this.value)">${[0,10,15,30,45,60].map(n=>`<option value="${n}" ${a.workoutWarningSeconds===n?'selected':''}>${n===0?S('Off','Izslēgts'):`${n} s`}</option>`).join('')}</select><label class="setting-toggle-row"><span>${esc(S('3–2–1 countdown before working sets','3–2–1 atskaite pirms darba piegājieniem'))}</span><input type="checkbox" ${a.workoutCountdownEnabled!==false?'checked':''} onchange="gp.setWorkoutSoundPreference('workoutCountdownEnabled',this.checked)"></label><label class="setting-toggle-row"><span>${esc(S('Distinct warm-up cue and automatic start','Atšķirīgs iesildīšanās signāls un automātisks starts'))}</span><input type="checkbox" ${a.warmupSoundEnabled!==false?'checked':''} onchange="gp.setWorkoutSoundPreference('warmupSoundEnabled',this.checked)"></label><label class="setting-toggle-row"><span>${esc(S('Remind about unrecorded sets every minute','Atgādināt par neievadītu piegājienu katru minūti'))}</span><input type="checkbox" ${a.exerciseReminderSoundEnabled!==false?'checked':''} onchange="gp.setWorkoutSoundPreference('exerciseReminderSoundEnabled',this.checked)"></label><button type="button" class="secondary full" onclick="gp.testWorkoutSound()">${esc(S('Test workout sound','Pārbaudīt treniņa skaņu'))}</button><p class="small">${esc(S('iPhone browsers can play sounds only after a user gesture; background audio is controlled by iOS.','iPhone pārlūkos skaņas vispirms jāaktivizē ar lietotāja darbību; fona atskaņošanu ierobežo iOS.'))}</p></div>
  ${globalThis.GymProgressAndroid?`<div class="card stack native-workout-alerts"><div class="title">${esc(S('Locked-screen workout alerts','Treniņa signāli pie bloķēta ekrāna'))}</div><div class="small">${esc(S('Android plays rest warnings, a 3–2–1 countdown, set-entry reminders and timed/cardio cues with the screen locked. Only one ongoing workout-status notification is shown. Requires notification and exact-alarm access.','Android atskaņo atpūtas brīdinājumus, 3–2–1 atskaiti, piegājiena ievades atgādinājumus un laika/kardio signālus arī pie bloķēta ekrāna. Ir tikai viens pastāvīgs treniņa statusa paziņojums. Nepieciešamas paziņojumu un precīzo signālu atļaujas.'))}</div><div class="small"><strong>${esc(S('Notifications','Paziņojumi'))}:</strong> ${esc(notificationPermissionState()==='granted'?S('Allowed','Atļauti'):S('Permission required','Nepieciešama atļauja'))}</div><div class="small"><strong>${esc(S('Exact alarms','Precīzie signāli'))}:</strong> ${esc(androidAlarmAccessStatus()==='ready'?S('Allowed','Atļauti'):S('Permission required','Nepieciešama atļauja'))}</div><button type="button" class="secondary full" onclick="gp.requestBackgroundAlerts()">${esc(S('Set up Android background alerts','Iestatīt Android fona signālus'))}</button><button type="button" class="secondary full" onclick="gp.testAndroidSound()">${esc(S('Test Android sound','Pārbaudīt Android skaņu'))}</button></div>`:''}
  <div class="section-title">${esc(S('Data sharing','Datu kopīgošana'))}</div>
  <div id="comparison-settings-card" class="card stack comparison-settings-card" tabindex="-1"><div class="title">${esc(S('Compare exercises','Salīdzināt vingrinājumus'))}</div><label class="setting-toggle-row"><span class="setting-toggle-copy"><strong>${esc(S('Allow exercise comparison','Atļaut vingrinājumu salīdzināšanu'))}</strong><small>${esc(S('Only accepted friends can compare selected exercises when both accounts opt in. Turning this off immediately withdraws your shared comparison points.','Tikai apstiprināti draugi var salīdzināt izvēlētos vingrinājumus, ja abi konti ir devuši atļauju. Izslēdzot, kopīgotie salīdzinājuma dati tiek nekavējoties atsaukti.'))}</small></span><span class="setting-toggle-control"><input class="setting-toggle-input" type="checkbox" onchange="gp.setComparisonSharing(this.checked)" ${socialUi.comparisonPref?.allowed?'checked':''} ${socialSignedIn()&&socialUi.comparisonPref?.loaded?'':'disabled'} aria-label="${esc(S('Allow exercise comparison','Atļaut vingrinājumu salīdzināšanu'))}"><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>${!socialSignedIn()?`<div class="small">${esc(S('Sign in to manage comparison sharing.','Pieslēdzies, lai pārvaldītu salīdzināšanas kopīgošanu.'))}</div>`:!socialUi.comparisonPref?.loaded?`<div class="small" role="status">${esc(S('Loading comparison preference…','Ielādē salīdzināšanas iestatījumu…'))}</div>`:''}</div>
  <div class="section-title" data-i18n="Data">Data</div>
  ${pendingAccountCleanups().length?`<div class="card stack"><div>${esc(S('Cloud account deleted; local cleanup is pending.','Mākoņa konts dzēsts; lokālā tīrīšana vēl jāveic.'))}</div><button class="secondary full" onclick="gp.retryDeletedAccountCleanup()">${esc(S('Retry local cleanup','Atkārtot lokālo tīrīšanu'))}</button></div>`:''}<div class="card stack"><button class="secondary full" onclick="gp.downloadBackup()" data-i18n="Full backup">Full backup</button><button class="secondary full" onclick="gp.pickRestore()" data-i18n="Restore backup">Restore backup</button><button class="secondary full" onclick="gp.downloadCsv()" data-i18n="Export CSV">Export CSV</button><button class="secondary full" onclick="gp.downloadDetailedJson()" data-i18n="Export detailed JSON">Export detailed JSON</button><div class="divider"></div><button class="danger full" onclick="gp.eraseData()" data-i18n="Erase all data">Erase all data</button><button class="secondary full log-erase-btn" onclick="gp.eraseExerciseLogs()" data-i18n="Erase exercise log data">Erase exercise log data</button><input id="restore-file" class="hidden" type="file" accept="application/json,.json" onchange="gp.restoreFile(this.files[0])"></div>
  <div class="section-title">${esc(S('App settings','Lietotnes iestatījumi'))}</div>
  <div class="card"><div class="card-row"><div class="grow"><div class="title" data-i18n="Keep screen awake">Keep screen awake</div><div class="subtitle" data-i18n="Keep the display on while a workout is active">Keep the display on while a workout is active</div></div><input style="width:auto" type="checkbox" ${a.keepScreenAwake?'checked':''} onchange="gp.toggleAwake(this.checked)"></div></div>
  <div class="card stack"><button class="secondary full" onclick="gp.applyPendingUpdate()">${esc(releaseCandidateVerified&&serviceRegistration?.waiting?S('Update now','Atjaunināt tagad'):S('Check for updates','Pārbaudīt atjauninājumus'))}</button>${lastReleaseIssue?`<p class="note" role="status">${esc(S('Update blocked by website deployment: ','Atjauninājums bloķēts vietnes publikācijas dēļ: ')+lastReleaseIssue)}</p>`:''}<button class="secondary full" onclick="gp.openRecovery()">${esc(S('Recovery copies','Atkopšanas kopijas'))}</button><div class="divider"></div><button class="secondary full" onclick="gp.openSupportReport('bug')">${esc(S('Report a problem','Ziņot par problēmu'))}</button><button class="secondary full" onclick="gp.openSupportReport('feedback')">${esc(S('Send feedback','Nosūtīt atsauksmi'))}</button></div><div class="app-version">Gym Progress v${APP_VERSION}</div>`;
  return shell(content);
}

async function setLanguage(code){state.app_state.languageCode=code==='lv'?'lv':'en';await persist();render();}
async function dismissStarterPrompt(){state.app_state.starterPromptDismissed=true;await persist();}
function showEmptyStarterPrompt(){
  openDialog(`<h2 data-i18n="I don&#39;t have a programme yet">I don't have a programme yet</h2><div class="dialog-copy" data-i18n="You do not have any workout days yet. I can build a simple three-day starter programme, or you can create your own.">You do not have any workout days yet. I can build a simple three-day starter programme, or you can create your own.</div><div class="dialog-actions starter-entry-actions"><button onclick="gp.openStarterWizard()" data-i18n="Set it up for me">Set it up for me</button><button class="secondary" onclick="gp.starterManualSetup()" data-i18n="Set up manually">Set up manually</button><button class="ghost" onclick="gp.dismissStarterForNow()" data-i18n="Not now">Not now</button></div>`);
}
async function starterManualSetup(){await dismissStarterPrompt();closeDialog();nav('programme');}
async function dismissStarterForNow(){await dismissStarterPrompt();closeDialog();render();}
function openStarterWizard(){window.__gpStarter={goal:StarterGoal.GENERAL_FITNESS,experience:StarterExperience.BEGINNER,exercisesPerDay:4,squatKg:'',benchKg:'',rowKg:'',hingeKg:''};renderStarterWizard(1);}
function starterSelectValue(id,key,nextStep){const el=$(id);if(el)window.__gpStarter[key]=el.value;const size=$('#starter-size');if(size)window.__gpStarter.exercisesPerDay=Number(size.value);renderStarterWizard(nextStep);}
function renderStarterWizard(step=1){
  const w=window.__gpStarter||{goal:StarterGoal.GENERAL_FITNESS,experience:StarterExperience.BEGINNER,exercisesPerDay:4,squatKg:'',benchKg:'',rowKg:'',hingeKg:''};window.__gpStarter=w;
  let body='';
  if(step===1){body=`<div class="dialog-copy small" data-i18n="This wizard creates a general starting point, not a medical or individually coached prescription. You can edit everything afterwards.">This wizard creates a general starting point, not a medical or individually coached prescription. You can edit everything afterwards.</div><label class="field" data-i18n="Goal">Goal</label><select id="starter-goal"><option value="STRENGTH" ${w.goal===StarterGoal.STRENGTH?'selected':''}>Strength</option><option value="HYPERTROPHY" ${w.goal===StarterGoal.HYPERTROPHY?'selected':''}>Muscle gain</option><option value="GENERAL_FITNESS" ${w.goal===StarterGoal.GENERAL_FITNESS?'selected':''}>General fitness / tone</option><option value="CONDITIONING" ${w.goal===StarterGoal.CONDITIONING?'selected':''}>Conditioning / cardio support</option></select><div class="small" data-i18n="Conditioning / cardio support changes the resistance-training prescription; it does not replace dedicated aerobic training.">Conditioning / cardio support changes the resistance-training prescription; it does not replace dedicated aerobic training.</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()" data-i18n="Cancel">Cancel</button><button onclick="gp.starterSelectValue('#starter-goal','goal',2)" data-i18n="Next">Next</button></div>`;}
  else if(step===2){body=`<label class="field" data-i18n="Experience">Experience</label><select id="starter-experience"><option value="BEGINNER" ${w.experience===StarterExperience.BEGINNER?'selected':''}>Beginner · under 6 months</option><option value="SOME" ${w.experience===StarterExperience.SOME?'selected':''}>Some experience · 6–24 months</option><option value="EXPERIENCED" ${w.experience===StarterExperience.EXPERIENCED?'selected':''}>Experienced · 2+ years</option></select><label class="field" for="starter-size">${esc(S('Exercises per day','Vingrinājumi dienā'))}</label><select id="starter-size"><option value="4" ${Number(w.exercisesPerDay)!==6?'selected':''}>${esc(S('4 · compact','4 · kompakta programma'))}</option><option value="6" ${Number(w.exercisesPerDay)===6?'selected':''}>${esc(S('6 · with accessories','6 · ar papildvingrinājumiem'))}</option></select><p class="small">${esc(S('Four compound movements keep sessions short. Six adds pulling, core and single-leg work across the week.','Četri daudzlocītavu vingrinājumi saīsina treniņu. Seši papildina nedēļu ar vilkšanas, korpusa un vienas kājas vingrinājumiem.'))}</p><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(1)" data-i18n="Back">Back</button><button onclick="gp.starterSelectValue('#starter-experience','experience',3)" data-i18n="Next">Next</button></div>`;}
  else {body=`<div class="dialog-copy" data-i18n="Enter a comfortable weight you could lift for about 8 good reps. This is not a max test. Leave a field blank if you are unsure; you can edit every starting weight later.">Enter a comfortable weight you could lift for about 8 good reps. This is not a max test. Leave a field blank if you are unsure; you can edit every starting weight later.</div><div class="form-grid"><label><span class="field" data-i18n="Squat">Squat</span><input id="starter-squat" type="number" min="0" step="0.25" value="${esc(w.squatKg)}"></label><label><span class="field" data-i18n="Bench press">Bench press</span><input id="starter-bench" type="number" min="0" step="0.25" value="${esc(w.benchKg)}"></label><label><span class="field" data-i18n="Row">Row</span><input id="starter-row" type="number" min="0" step="0.25" value="${esc(w.rowKg)}"></label><label><span class="field" data-i18n="Romanian deadlift">Romanian deadlift</span><input id="starter-hinge" type="number" min="0" step="0.25" value="${esc(w.hingeKg)}"></label></div><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(2)" data-i18n="Back">Back</button><button onclick="gp.finishStarterProgramme()" data-i18n="Build programme">Build programme</button></div>`;}
  openDialog(`<h2 data-i18n="Starter programme setup">Starter programme setup</h2><div class="small">${step} / 3</div>${body}`);
}
async function finishStarterProgramme(allowEstimates=false){
  const w=window.__gpStarter||{};w.squatKg=$('#starter-squat')?.value??w.squatKg??'';w.benchKg=$('#starter-bench')?.value??w.benchKg??'';w.rowKg=$('#starter-row')?.value??w.rowKg??'';w.hingeKg=$('#starter-hinge')?.value??w.hingeKg??'';
  const inputs={goal:w.goal,experience:w.experience,exercisesPerDay:w.exercisesPerDay,squatKg:w.squatKg,benchKg:w.benchKg,rowKg:w.rowKg,hingeKg:w.hingeKg};const missing=missingStarterWeightKeys(inputs);if(missing.length&&!allowEstimates){openDialog(`<h2>${esc(S('Starting weights','Sākuma svari'))}</h2><p>${esc(S('Enter missing working weights when you first use each exercise. Estimates are optional when at least one reference weight is known.','Trūkstošos darba svarus ievadi vingrinājuma pirmajā reizē. Aplēses ir izvēles iespēja, ja zināms vismaz viens atsauces svars.'))}</p><div class="dialog-actions"><button class="secondary" onclick="gp.renderStarterWizard(3)">${esc(S('Back','Atpakaļ'))}</button><button onclick="gp.finishStarterProgramme('calibrate')">${esc(S('Set during first workout','Ievadīt pirmajā treniņā'))}</button>${missing.length<4?`<button class="secondary" onclick="gp.finishStarterProgramme(true)">${esc(S('Use estimates','Izmantot aplēses'))}</button>`:''}</div>`);return;}
  inputs.estimateMissing=allowEstimates===true;const plans=buildStarterProgramme(inputs);
  const used=new Set(state.workout_templates.map(x=>String(x.name||'').toLocaleLowerCase()));const created=[];
  for(const day of plans){const base=languageCode(state)==='lv'?`Sākuma treniņš ${day.suffix}`:`Starter ${day.suffix}`;let name=base,n=2;while(used.has(name.toLocaleLowerCase()))name=`${base} ${n++}`;used.add(name.toLocaleLowerCase());const workoutId=uid(state.workout_templates);state.workout_templates.push({id:workoutId,name,position:state.workout_templates.length,isActive:true});created.push(workoutId);
    for(const plan of day.exercises){
      const legacy=byKey(plan.exerciseKey),canonical=canonicalExerciseByKey(plan.exerciseKey);
      if(!legacy&&!canonical)throw new Error('Unknown starter exercise: '+plan.exerciseKey);
      const equipment=canonical?.equipment||legacy.equipment,mode=plan.trackingMode||trackingModeFor(equipment),name=canonical?canonicalName(canonical,languageCode(state)):legacy.name;
      const existing=state.user_exercises.find(u=>u.canonicalExerciseId===canonical?.id&&u.trackingMode===mode&&u.displayNameMode==='CATALOGUE'&&!u.archived);
      const user=existing||createUserExerciseFromInput(name,equipment,canonical?.dumbbellLoad||legacy?.dumbbellLoad,canonical?.exerciseType||legacy?.type,mode,canonical);
      const weighted=mode===TrackingMode.WEIGHT_REPS,unassigned=weighted&&plan.weightKg==null;
      state.template_exercises.push({id:uid(state.template_exercises),workoutId,userExerciseId:user.id,programmeExerciseId:uuid(),canonicalExerciseId:canonical?.id||null,name,position:getTemplateExercises(workoutId).length,sets:plan.sets,reps:plan.reps,restSeconds:plan.restSeconds,trackingMode:mode,targetSeconds:plan.targetSeconds||0,initialWeightKg:unassigned?null:weighted?snapSelectable(plan.weightKg,equipment):0,requiresCalibration:unassigned,weightSource:unassigned?'UNSET':weighted?(inputs.estimateMissing?'ESTIMATE':'REFERENCE'):'NOT_APPLICABLE',exerciseKey:legacy?.key||null,exerciseType:canonical?.exerciseType||legacy.type,rampMode:weighted?RampMode.AUTO:RampMode.NEVER,removeWeights:!!legacy?.defaultRemoveWeights,equipment,dumbbellLoad:canonical?.dumbbellLoad||legacy?.dumbbellLoad||DumbbellLoad.SINGLE,compareWithFriends:false,supersetGroupId:null});
    }
  }
  if(state.app_state.nextWorkoutId==null)state.app_state.nextWorkoutId=created[0]??null;state.app_state.starterPromptDismissed=true;ui.selectedWorkoutId=state.app_state.nextWorkoutId;window.__gpStarter=null;await persist();closeDialog();nav('home');toast(S('Programme added','Programma pievienota'));
}
async function changeRirThreshold(d){state.app_state.progressionRirThreshold=Math.max(0,Math.min(state.app_state.rirInputMax,state.app_state.progressionRirThreshold+d));await persist();render();}
async function toggleLastSetZeroRirAcceptable(v){state.app_state.lastSetZeroRirAcceptable=!!v;await persist();render();}
async function toggleAwake(v){state.app_state.keepScreenAwake=!!v;await persist();if(v)requestWakeLock();else releaseWakeLock();}
async function toggleMotivation(v){state.app_state.motivationEnabled=!!v;if(!v){state.app_state.nextSessionAt=null;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;}if(v&&notificationPermissionState()==='default')await requestNotificationPermission();await persist();render();}
async function changeInactivityDays(delta){const current=Math.round(Number(state.app_state.inactivityReminderHours||72)/24),days=Math.max(1,Math.min(30,current+Number(delta)));state.app_state.inactivityReminderHours=days*24;state.app_state.lastInactivityReminderFor=null;await persist();render();}
async function setReminderTime(kind,value){if(!/^\d{2}:\d{2}$/.test(String(value||'')))return;if(kind==='evening')state.app_state.eveningReminderTime=value;else state.app_state.morningReminderTime=value;state.app_state.nextEveningReminderFor=null;state.app_state.nextMorningReminderFor=null;await persist();render();}
function editDifficulty(){
  const a=state.app_state,ceil=a.rirInputMax;
  formDialog(translateUI('Difficulty levels',languageCode(state)),`<label class="field" data-i18n="Comfortable starts at average RIR">Comfortable starts at average RIR</label><input id="f-comf" type="number" step="0.5" min="1" max="${ceil}" value="${a.difficultyComfortableMinRir}"><label class="field" data-i18n="Challenging starts at">Challenging starts at</label><input id="f-chal" type="number" step="0.5" min="0.5" max="${ceil}" value="${a.difficultyChallengingMinRir}"><label class="field" data-i18n="Hard starts at">Hard starts at</label><input id="f-hard" type="number" step="0.5" min="0" max="${ceil}" value="${a.difficultyHardMinRir}">`,translateUI('Save',languageCode(state)),async()=>{const c=Number($('#f-comf').value),ch=Number($('#f-chal').value),h=Number($('#f-hard').value);state.app_state.difficultyComfortableMinRir=Math.max(1,Math.min(ceil,c));state.app_state.difficultyChallengingMinRir=Math.max(.5,Math.min(state.app_state.difficultyComfortableMinRir-.5,ch));state.app_state.difficultyHardMinRir=Math.max(0,Math.min(state.app_state.difficultyChallengingMinRir-.5,h));await persist();closeDialog();render();});
}
function renderProgramme(){
  const ws=state.workout_templates.slice().sort((a,b)=>a.position-b.position);
  let c=`<div class="section-toolbar end"><button class="small-btn" onclick="gp.addWorkout()" data-i18n="+ Day">+ Day</button></div><div class="reorder-hint"><span class="drag-grip-sample" aria-hidden="true"><i></i></span><span data-i18n="Drag the grip to reorder.">Drag the grip to reorder.</span></div>`;
  if(!ws.length)c+=`<div class="empty" data-i18n="No workout days yet.">No workout days yet.</div>`;
  ws.forEach((w,i)=>c+=`<div class="card clickable programme-day reorder-row ${ui.movedWorkoutId===w.id?'recently-moved':''}" onclick="gp.nav('workout',${w.id})"><div class="card-row"><span class="drag-grip" role="button" tabindex="0" data-reorder-kind="workout" data-reorder-id="${w.id}" aria-label="Drag to reorder"><i></i></span><div class="pill turn-number">${i+1}</div><div class="grow min-zero"><div class="title single-line" title="${esc(w.name)}">${esc(w.name)}</div><div class="subtitle">${esc(translateUI(`${getTemplateExercises(w.id).length} exercise${getTemplateExercises(w.id).length===1?'':'s'}`,languageCode(state)))}</div></div><button class="icon-btn pencil-button" onclick="event.stopPropagation();gp.renameWorkout(${w.id})" aria-label="Rename workout">${pencilIcon()}</button><button class="icon-btn" onclick="event.stopPropagation();gp.deleteWorkout(${w.id})">×</button></div></div>`);
  return shell(c,{topbar:topbar(S('Programme','Programma'),'settings'),navBar:false});
}
function checkEditableName(input,max,{unchangedName=null,kind='day'}={}){
  const name=String(input?.value||'').trim();
  // Existing longer names and catalogue-controlled labels must survive untouched.
  const valid=editableNameAllowed(name,{maximum:max,originalName:unchangedName,readOnly:input?.readOnly===true});
  if(!valid){
    input?.setCustomValidity(name?kind==='day'?S(`Workout day name: maximum ${max} characters.`,`Treniņa dienas nosaukums: ne vairāk kā ${max} rakstzīmes.`):S(`Exercise name: maximum ${max} characters.`,`Vingrinājuma nosaukums: ne vairāk kā ${max} rakstzīmes.`):S('Enter a name.','Ievadi nosaukumu.'));
    input?.reportValidity();input?.focus();return false;
  }
  input?.setCustomValidity('');return true;
}
function addWorkout(){formDialog(translateUI('New workout day',languageCode(state)),`<label class="field" data-i18n="Name">Name</label><input id="f-name" maxlength="${WORKOUT_DAY_NAME_MAX}" value="${S('Day','Diena')} ${state.workout_templates.length+1}">`,translateUI('Add',languageCode(state)),async()=>{const input=$('#f-name'),name=input.value.trim();if(!checkEditableName(input,WORKOUT_DAY_NAME_MAX,{kind:'day'}))return;if(workoutNameExists(name)){input.setCustomValidity(S('Workout names must be unique','Treniņu dienu nosaukumiem jābūt atšķirīgiem'));input.reportValidity();return;}input.setCustomValidity('');state.workout_templates.push({id:uid(state.workout_templates),name,position:state.workout_templates.length,isActive:true});ensureRotation();await persist();closeDialog();render();});}
function renameWorkout(id){const w=getWorkout(id);formDialog(translateUI('Rename workout',languageCode(state)),`<label class="field" data-i18n="Name">Name</label><input id="f-name" maxlength="${WORKOUT_DAY_NAME_MAX}" value="${esc(w.name)}">`,translateUI('Save',languageCode(state)),async()=>{const input=$('#f-name'),name=input.value.trim();if(!checkEditableName(input,WORKOUT_DAY_NAME_MAX,{unchangedName:w.name,kind:'day'}))return;if(workoutNameExists(name,w.id)){input.setCustomValidity(S('Workout names must be unique','Treniņu dienu nosaukumiem jābūt atšķirīgiem'));input.reportValidity();return;}input.setCustomValidity('');w.name=name;await persist();closeDialog();render();});}
async function moveWorkout(id,d){const a=state.workout_templates.sort((x,y)=>x.position-y.position),i=a.findIndex(x=>x.id===Number(id)),j=Math.max(0,Math.min(a.length-1,i+d));if(i<0||i===j)return;const [x]=a.splice(i,1);a.splice(j,0,x);a.forEach((w,k)=>w.position=k);ui.movedWorkoutId=x.id;await persist();render();setTimeout(()=>{if(ui.movedWorkoutId===x.id){ui.movedWorkoutId=null;render();}},1600);}
function deleteWorkout(id){const w=getWorkout(id);confirmDialog(`Delete ${w.name}?`,translateUI('This deletes the workout template. Historical completed sessions are kept.',languageCode(state)),translateUI('Delete',languageCode(state)),async()=>{state.template_exercises=state.template_exercises.filter(e=>e.workoutId!==w.id);state.workout_templates=state.workout_templates.filter(x=>x.id!==w.id).sort((a,b)=>a.position-b.position);state.workout_templates.forEach((x,i)=>x.position=i);ensureRotation();await persist();closeDialog();render();},true);}

function programmeExerciseSpec(e){return e.trackingMode===TrackingMode.CARDIO?`${S('Cardio','Kardio')} · ${formatDuration(Number(e.targetSeconds||1800)*1000)}`:e.trackingMode===TrackingMode.TIME_ONLY?`${e.sets} × ${formatDuration(Number(e.targetSeconds||60)*1000)}`:`${e.sets} × ${e.reps} × <strong>${e.equipment===Equipment.BODYWEIGHT?translateUI('Bodyweight',languageCode(state)):formatKg(e.initialWeightKg)}</strong>`;}
function programmeExerciseBlocks(es){
  const blocks=[];for(let i=0;i<es.length;i++){const e=es[i],n=es[i+1];if(e.supersetGroupId&&n?.supersetGroupId===e.supersetGroupId){blocks.push({type:'superset',id:e.id,groupId:e.supersetGroupId,items:[e,n]});i++;}else blocks.push({type:'single',id:e.id,groupId:null,items:[e]});}return blocks;
}
function canJoinSuperset(a,b){return !!a&&!!b&&a.workoutId===b.workoutId&&!a.supersetGroupId&&!b.supersetGroupId;}
function renderProgrammeExerciseSubrow(e,{showGrip=false}={}){const u=getUserExercise(state,e.userExerciseId),spec=programmeExerciseSpec(e);return `<div class="superset-exercise-subrow" onclick="gp.editExercise(${e.id})">${showGrip?`<span class="drag-grip" role="button" tabindex="0" data-reorder-kind="exercise-block" data-reorder-id="${e.id}" aria-label="Drag to reorder"><i></i></span>`:'<span class="superset-subrow-spacer"></span>'}<div class="grow min-zero"><div class="title single-line" title="${esc(templateDisplayName(e))}">${esc(templateDisplayName(e))}</div><div class="subtitle single-line">${spec}${e.trackingMode===TrackingMode.CARDIO?'':' · '+formatDuration(e.restSeconds*1000)+' '+S('rest','atpūta')}${e.compareWithFriends?' · '+S('compare','salīdzināt'):''}</div></div><button class="icon-btn catalogue-link-btn" onclick="event.stopPropagation();gp.setCatalogueLinkForExercise(${e.id})">${canonicalStatusIcon(u)}</button><button class="icon-btn" onclick="event.stopPropagation();gp.deleteExercise(${e.id})">×</button></div>`;}
function renderWorkoutEditor(id){
  const w=getWorkout(id);if(!w)return shell("<div class=\"empty\" data-interface-text>Workout not found.</div>",{topbar:topbar('Workout','programme'),navBar:false});
  const es=getTemplateExercises(w.id),blocks=programmeExerciseBlocks(es);let c=`<div class="section-toolbar between"><div class="small">${esc(translateUI(`${es.length} exercise${es.length===1?'':'s'}`,languageCode(state)))}</div><button class="small-btn" onclick="gp.addExercise(${w.id})">${esc(translateUI('+ Exercise',languageCode(state)))}</button></div><div class="reorder-hint"><span class="drag-grip-sample" aria-hidden="true"><i></i></span><span data-i18n="Drag the grip to reorder. Supersets move together.">Drag the grip to reorder. Supersets move together.</span></div><div class="programme-block-stack" style="margin-top:12px">`;
  blocks.forEach((block,i)=>{
    if(block.type==='superset'){
      c+=`<div class="card exercise-block superset-programme-card reorder-row"><div class="superset-card-label" data-i18n="SUPERSET">SUPERSET</div>${renderProgrammeExerciseSubrow(block.items[0],{showGrip:true})}<div class="superset-card-divider"><span></span><button class="superset-link-btn split" onclick="event.stopPropagation();gp.splitSuperset('${block.groupId}')" aria-label="Separate superset">−</button><span></span></div>${renderProgrammeExerciseSubrow(block.items[1])}</div>`;
    }else{
      c+=`<div class="card exercise-block exercise-programme-row reorder-row">${renderProgrammeExerciseSubrow(block.items[0],{showGrip:true})}</div>`;
    }
    const next=blocks[i+1];if(next){const a=block.items.at(-1),b=next.items[0],pairable=block.type==='single'&&next.type==='single',joinable=pairable&&canJoinSuperset(a,b);c+=`<div class="superset-between">${pairable?`<button class="superset-link-btn join ${joinable?'':'disabled'}" ${joinable?`onclick="gp.joinSuperset(${a.id},${b.id})"`:'disabled'} aria-label="Create superset">+</button>`:'<span class="superset-gap"></span>'}</div>`;}
  });
  c+='</div>';return shell(c,{topbar:topbar(w.name,'programme'),navBar:false});
}
async function joinSuperset(firstId,secondId){const a=state.template_exercises.find(x=>x.id===Number(firstId)),b=state.template_exercises.find(x=>x.id===Number(secondId));if(!canJoinSuperset(a,b))return;const ordered=getTemplateExercises(a.workoutId);if(Math.abs(ordered.findIndex(x=>x.id===a.id)-ordered.findIndex(x=>x.id===b.id))!==1)return;const gid=uuid();a.supersetGroupId=gid;b.supersetGroupId=gid;await persist();render();toast(translateUI('Superset created',languageCode(state)));}
async function splitSuperset(groupId){if(!groupId)return;state.template_exercises.filter(x=>x.supersetGroupId===groupId).forEach(x=>x.supersetGroupId=null);await persist();render();toast(translateUI('Superset separated',languageCode(state)));}
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
  if(help)help.textContent=translateUI(ok?'Uses qualifying Estimated 1-rep max (e1RM) sets.':'Available only for comparable barbell and dumbbell catalogue exercises.',languageCode(state));
}
function syncTrackingOptions(preferred=null){const select=$('#f-tracking');if(!select)return;const eq=$('#f-equipment')?.value||Equipment.OTHER,type=$('#f-type')?.value||ExerciseType.MODERATE_COMPOUND,modes=validTrackingModes(eq,type),current=preferred||select.value,resolved=modes.includes(current)?current:modes[0],changed=!!current&&resolved!==current;setHTML(select,trackingOptionsHtml(eq,type,resolved));select.value=resolved;exerciseTrackingChanged();if(changed)toast(S('Tracking mode changed to a valid option for this equipment.','Uzskaites režīms mainīts uz šim aprīkojumam derīgu variantu.'));}
function exerciseLinkActionsHtml(canonical){return canonical?`<span class="catalogue-form-actions"><button type="button" class="ghost tiny-btn" onclick="gp.exerciseFormChangeLink()">${esc(S('Change','Mainīt'))}</button><button type="button" class="ghost tiny-btn" onclick="gp.exerciseFormUnlink()">${esc(S('Unlink','Atvienot'))}</button></span>`:'';}
function exerciseForm(e={}){
  const u=e.userExerciseId?getUserExercise(state,e.userExerciseId):null,match=byKey(e.exerciseKey)||bestMatch(u?.displayName||e.name||'');
  const canonical=canonicalExerciseById(u?.canonicalExerciseId),eq=e.equipment||u?.equipment||canonical?.equipment||match?.equipment||Equipment.OTHER,dbLoad=e.dumbbellLoad||u?.dumbbellLoad||canonical?.dumbbellLoad||match?.dumbbellLoad||DumbbellLoad.SINGLE,type=e.exerciseType||u?.exerciseType||canonical?.exerciseType||ExerciseType.MODERATE_COMPOUND;
  const allowed=validTrackingModes(eq,type),requestedMode=e.trackingMode||u?.trackingMode||trackingModeFor(eq),mode=allowed.includes(requestedMode)?requestedMode:allowed[0];
  const isCardio=mode===TrackingMode.CARDIO,cardioMinutes=Math.max(1,Math.round(Number(e.targetSeconds||1800)/60));
  const eqOptions=[[Equipment.BARBELL,'Barbell'],[Equipment.DUMBBELL,'Dumbbell'],[Equipment.MACHINE,'Machine'],[Equipment.CABLE,'Cable'],[Equipment.BODYWEIGHT,'Bodyweight'],[Equipment.CARDIO,'Cardio'],[Equipment.OTHER,'Other']].map(([v,l])=>`<option value="${v}" ${eq===v?'selected':''}>${l}</option>`).join('');
  const linkedId=u?.canonicalExerciseId||'',comparable=canonical?.friendE1rmEligible===true&&canonical?.comparisonMetric==='E1RM'&&mode===TrackingMode.WEIGHT_REPS,isNew=!e.id,showRemove=!isNew||[Equipment.BARBELL,Equipment.OTHER].includes(eq);
  const displayName=u?displayNameForUserExercise(state,u,e.name||'',languageCode(state)):e.name||'';
  return `<div class="exercise-form"><input type="hidden" id="f-canonical-id" value="${esc(linkedId)}"><input type="hidden" id="f-preserve-canonical" value="${linkedId?'1':'0'}"><div class="small exercise-search-tip" data-i18n="Start typing an exercise name. Catalogue matches appear while you type.">Start typing an exercise name. Catalogue matches appear while you type.</div><label class="field" data-i18n="Exercise">Exercise</label><input id="f-name" maxlength="${EXERCISE_NAME_MAX}" data-original-name="${esc(displayName)}" oninput="gp.exerciseNameChanged()" value="${esc(displayName)}" autocomplete="off" ${linkedId?'readonly':''}><div id="f-catalogue-feedback" class="catalogue-feedback">${linkedId?`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}: ${esc(canonicalName(canonical,languageCode(state)))}</span>${exerciseLinkActionsHtml(canonical)}`:''}</div><div id="f-catalogue-matches" class="catalogue-match-list"></div>
  <div id="f-cardio-options" style="${isCardio?'':'display:none'}"><label class="field" data-i18n="Target duration (minutes)">Target duration (minutes)</label><input id="f-cardio-minutes" type="number" min="1" max="1440" step="1" value="${cardioMinutes}"><p class="small" data-i18n="One continuous activity. Record actual duration, distance, heart rate, power and perceived effort when finished.">One continuous activity. Record actual duration, distance, heart rate, power and perceived effort when finished.</p></div><div class="form-grid exercise-primary-grid"><div id="f-sets-wrap" style="${isCardio?'display:none':''}"><label class="field" data-i18n="Sets">Sets</label><input id="f-sets" type="number" min="1" value="${e.sets||3}"></div><div id="f-reps-wrap" style="${[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?'display:none':''}"><label class="field" data-i18n="Reps">Reps</label><input id="f-reps" type="number" min="1" value="${e.reps||8}"></div><div id="f-time-wrap" style="${mode===TrackingMode.TIME_ONLY?'':'display:none'}"><label class="field" data-i18n="Time per set (seconds)">Time per set (seconds)</label><input id="f-time" type="number" min="5" step="5" value="${e.targetSeconds||60}"></div><div id="f-rest-wrap" style="${isCardio?'display:none':''}"><label class="field" data-i18n="Rest (seconds)">Rest (seconds)</label><input id="f-rest" type="number" min="0" step="15" value="${e.restSeconds??120}"></div><div id="f-weight-wrap" class="span2" style="${[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(eq)?'display:none':''}"><label class="field" id="f-weight-label">${eq===Equipment.DUMBBELL?'Working weight per dumbbell (kg)':'Working weight (kg)'}</label><input id="f-weight" type="number" min="0" step="any" value="${eq===Equipment.BODYWEIGHT?0:(e.initialWeightKg??20)}"></div>
  <div><label class="field" data-i18n="Equipment">Equipment</label><select id="f-equipment" onchange="gp.exerciseEquipmentChanged()">${eqOptions}</select></div><div id="f-ramp-wrap" style="${isCardio?'display:none':''}"><label class="field" data-i18n="Ramp-up">Ramp-up</label><select id="f-ramp"><option value="AUTO" ${(e.rampMode||'AUTO')==='AUTO'?'selected':''}>Automatic</option><option value="ALWAYS" ${e.rampMode==='ALWAYS'?'selected':''}>Always</option><option value="NEVER" ${e.rampMode==='NEVER'?'selected':''}>Never</option></select></div>
  <div id="f-db-load-wrap" class="span2" style="${eq===Equipment.DUMBBELL?'':'display:none'}"><label class="field" data-i18n="Dumbbells">Dumbbells</label><select id="f-db-load"><option value="PAIR" ${dbLoad===DumbbellLoad.PAIR?'selected':''}>Pair</option><option value="SINGLE" ${dbLoad===DumbbellLoad.SINGLE?'selected':''}>Single</option></select></div>
  <div id="f-exercise-type-wrap" class="span2" style="${isCardio?'display:none':''}"><label class="field" data-i18n="Exercise type">Exercise type</label><select id="f-type" onchange="gp.exerciseTypeChanged()">${Object.values(ExerciseType).map(t=>`<option value="${t}" ${type===t?'selected':''}>${t.replaceAll('_',' ').toLowerCase()}</option>`).join('')}</select></div><div id="f-tracking-wrap" class="span2" style="${isCardio?'display:none':''}"><label class="field" data-i18n="Tracking">Tracking</label><select id="f-tracking" onchange="gp.exerciseTrackingChanged()">${trackingOptionsHtml(eq,type,mode)}</select></div></div>
  <label id="f-compare-row" class="setting-toggle-row compare-toggle-row ${comparable?'':'is-disabled'}" style="${isCardio?'display:none':''}"><span class="setting-toggle-copy"><strong data-i18n="Compare with friends">Compare with friends</strong><small id="f-compare-help">${esc(translateUI(comparable?'Uses qualifying Estimated 1-rep max (e1RM) sets.':'Available only for comparable barbell and dumbbell catalogue exercises.',languageCode(state)))}</small></span><span class="setting-toggle-control"><input id="f-compare" class="setting-toggle-input" type="checkbox" ${e.compareWithFriends&&comparable?'checked':''} ${comparable?'':'disabled'}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label>
  <label id="f-remove-row" data-new="${isNew?'1':'0'}" class="setting-toggle-row" style="${showRemove&&!isCardio?'':'display:none'}"><span class="setting-toggle-copy"><strong data-i18n="Remove weights after exercise">Remove weights after exercise</strong><small data-i18n="Useful mainly when plates or equipment need a separate unload transition.">Useful mainly when plates or equipment need a separate unload transition.</small></span><span class="setting-toggle-control"><input id="f-remove" class="setting-toggle-input" type="checkbox" ${e.removeWeights?'checked':''}><span class="setting-toggle-track"><span class="setting-toggle-thumb"></span></span></span></label></div>`;
}
function applyCatalogueChoice(id){const c=canonicalExerciseById(id);if(!c)return;$('#f-canonical-id').value=c.id;const preserve=$('#f-preserve-canonical'),name=$('#f-name');if(preserve)preserve.value='1';if(name){name.value=canonicalName(c,languageCode(state));name.readOnly=true;}$('#f-equipment').value=c.equipment;$('#f-db-load').value=c.dumbbellLoad||DumbbellLoad.SINGLE;$('#f-type').value=c.equipment===Equipment.CARDIO?ExerciseType.CARDIO:(c.exerciseType||ExerciseType.MODERATE_COMPOUND);syncTrackingOptions(trackingModeFor(c.equipment));const feedback=$('#f-catalogue-feedback');if(feedback)setHTML(feedback,`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}: ${esc(canonicalName(c,languageCode(state)))}</span>${exerciseLinkActionsHtml(c)}`);const list=$('#f-catalogue-matches');if(list)setHTML(list,'');exerciseEquipmentChanged();refreshCompareEligibility();}
function exerciseFormChangeLink(){const hidden=$('#f-canonical-id'),preserve=$('#f-preserve-canonical'),name=$('#f-name'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches');if(hidden)hidden.value='';if(preserve)preserve.value='0';if(name){name.readOnly=false;name.focus();name.select();}if(feedback)setHTML(feedback,`${catalogueInlineGlobe(false)} <span>${esc(S('Type to choose a different catalogue exercise.','Raksti, lai izvēlētos citu kataloga vingrinājumu.'))}</span>`);if(list)setHTML(list,'');refreshCompareEligibility();}
function exerciseFormUnlink(){const hidden=$('#f-canonical-id'),preserve=$('#f-preserve-canonical'),name=$('#f-name'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches');if(hidden)hidden.value='';if(preserve)preserve.value='0';if(name)name.readOnly=false;if(feedback)setHTML(feedback,`${catalogueInlineGlobe(false)} <span>${esc(S('Not linked. This exercise stays local.','Nav saistīts. Šis vingrinājums paliek lokāls.'))}</span>`);if(list)setHTML(list,'');refreshCompareEligibility();}

function exerciseExistingChanged(){/* retained for old markup compatibility; new Add flow does not select existing exercises */}
function exerciseNameChanged(){const input=$('#f-name'),q=String(input?.value||'').trim(),hidden=$('#f-canonical-id'),feedback=$('#f-catalogue-feedback'),list=$('#f-catalogue-matches'),preserve=$('#f-preserve-canonical')?.value==='1'&&!!hidden?.value;if(preserve){const c=canonicalExerciseById(hidden.value);if(feedback)setHTML(feedback,`${catalogueInlineGlobe(true)} <span>${esc(S('Linked to catalogue','Saistīts ar katalogu'))}${c?`: ${esc(canonicalName(c,languageCode(state)))}`:''}</span>${exerciseLinkActionsHtml(c)}`);if(list)setHTML(list,'');refreshCompareEligibility();return;}const exact=catalogueSearchMatch(q);if(hidden)hidden.value='';const suggestions=q.length>=2?canonicalSuggestions(q,languageCode(state)).slice(0,6):[];if(exact){applyCatalogueChoice(exact.id);return;}refreshCompareEligibility();if(feedback)setHTML(feedback,q?`${catalogueInlineGlobe(false)} <span>${esc(S('Not linked. If no catalogue match is selected, this exercise will remain local and will not support online exercise comparison.','Nav saistīts. Ja netiks izvēlēta kataloga atbilstība, vingrinājums paliks lokāls un tam nebūs tiešsaistes vingrinājumu salīdzināšanas.'))}</span>`:'');if(list)setHTML(list,suggestions.map(c=>`<button type="button" class="catalogue-match" onclick="gp.applyCatalogueChoice('${c.id}')">${esc(canonicalName(c,languageCode(state)))} <span>${esc(c.category==='CARDIO'?S('Cardio','Kardio'):S('Strength','Spēks'))}</span></button>`).join(''));}
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
function exerciseEquipmentChanged(){const eq=$('#f-equipment')?.value||Equipment.OTHER,show=eq===Equipment.DUMBBELL,bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(eq);const wrap=$('#f-db-load-wrap');if(wrap)wrap.style.display=show?'':'none';const input=$('#f-weight'),label=$('#f-weight-label');if(input){input.step='any';input.min='0';if(bodyweight)input.value='0';else if(!(Number(input.value)>0))input.value='';input.setCustomValidity('');}if(label)label.textContent=translateUI(show?'Working weight per dumbbell (kg)':'Working weight (kg)',languageCode(state));const removeRow=$('#f-remove-row');if(removeRow&&removeRow.dataset.new==='1'){const allowed=[Equipment.BARBELL,Equipment.OTHER].includes(eq);removeRow.style.display=allowed?'':'none';if(!allowed){const cb=$('#f-remove');if(cb)cb.checked=false;}}syncTrackingOptions($('#f-tracking')?.value||trackingModeFor(eq));}
function validateExerciseWeight(){
 const fields={name:'#f-name',weight:'#f-weight',sets:'#f-sets',reps:'#f-reps',rest:'#f-rest',seconds:'#f-time',cardioMinutes:'#f-cardio-minutes'},values={trackingMode:$('#f-tracking')?.value,equipment:$('#f-equipment')?.value};
 for(const [key,selector]of Object.entries(fields)){const input=$(selector);values[key]=input?.value;input?.setCustomValidity('');}
 if(!checkEditableName($(fields.name),EXERCISE_NAME_MAX,{unchangedName:$('#f-name')?.dataset.originalName||'',kind:'exercise'}))return false;
 const errors=exerciseFieldErrors(values);for(const error of errors)$(fields[error.field])?.setCustomValidity(S(error.en,error.lv));
 if(errors.length){const input=$(fields[errors[0].field]);input?.reportValidity();input?.focus();return false;}return true;
}
function readExerciseForm(workoutId,old=null){
  const inputName=$('#f-name').value.trim()||'Exercise',canonical=canonicalExerciseById($('#f-canonical-id')?.value||null),legacy=bestMatch(inputName);let trackingMode=$('#f-tracking')?.value||TrackingMode.WEIGHT_REPS;
  let equipment=$('#f-equipment').value||old?.equipment||canonical?.equipment||legacy?.equipment||Equipment.OTHER;const validModes=validTrackingModes(equipment,$('#f-type').value||canonical?.exerciseType||legacy?.type||ExerciseType.MODERATE_COMPOUND);if(!validModes.includes(trackingMode))trackingMode=validModes[0];
  const dumbbellLoad=equipment===Equipment.DUMBBELL?($('#f-db-load').value||old?.dumbbellLoad||canonical?.dumbbellLoad||legacy?.dumbbellLoad||DumbbellLoad.SINGLE):DumbbellLoad.SINGLE;
  let u=old?.userExerciseId?getUserExercise(state,old.userExerciseId):null;if(!u&&canonical){const same=activeUserExercises(state).filter(x=>x.canonicalExerciseId===canonical.id);if(same.length===1)u=same[0];}
  if(!u)u=createUserExerciseFromInput(inputName,equipment,dumbbellLoad,trackingMode===TrackingMode.CARDIO?ExerciseType.CARDIO:($('#f-type').value||canonical?.exerciseType||legacy?.type),trackingMode,canonical);
  else{u.displayName=inputName;u.displayNameMode=canonical&&isCatalogueDisplayName(inputName,canonical)?'CATALOGUE':'CUSTOM';u.trackingMode=trackingMode;u.canonicalExerciseId=canonical?.id||null;u.candidateCanonicalExerciseId=null;u.equipment=canonical?.equipment||equipment;u.dumbbellLoad=canonical?.dumbbellLoad||dumbbellLoad;u.exerciseType=trackingMode===TrackingMode.CARDIO?ExerciseType.CARDIO:(canonical?.exerciseType||$('#f-type').value||u.exerciseType);}
  const name=u.displayName,mode=u.trackingMode||trackingMode,resolvedEquipment=u.equipment||equipment,resolvedDbLoad=u.dumbbellLoad||dumbbellLoad;
  const cardio=mode===TrackingMode.CARDIO;
  const rawWeight=mode===TrackingMode.BODYWEIGHT_REPS||resolvedEquipment===Equipment.BODYWEIGHT||resolvedEquipment===Equipment.CARDIO?0:Math.max(0,Number($('#f-weight').value)||0),remove=$('#f-remove');
  return{id:old?.id||uid(state.template_exercises),workoutId:Number(workoutId),name,position:old?.position??getTemplateExercises(workoutId).length,sets:cardio?1:Math.max(1,Number($('#f-sets').value)||1),reps:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?0:Math.max(1,Number($('#f-reps').value)||1),targetSeconds:cardio?Math.max(1,Number($('#f-cardio-minutes')?.value)||30)*60:mode===TrackingMode.TIME_ONLY?Math.max(5,Number($('#f-time').value)||60):0,restSeconds:cardio?0:Math.max(0,Number($('#f-rest').value)||0),initialWeightKg:[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(resolvedEquipment)?0:rawWeight,exerciseKey:u.legacyExerciseKey||canonical?.legacyExerciseKey||legacy?.key||old?.exerciseKey||null,exerciseType:cardio?ExerciseType.CARDIO:(u.exerciseType||ExerciseType.MODERATE_COMPOUND),rampMode:[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(mode)?RampMode.NEVER:($('#f-ramp').value||RampMode.AUTO),removeWeights:cardio||resolvedEquipment===Equipment.BODYWEIGHT?false:(remove?.checked===true),equipment:resolvedEquipment,dumbbellLoad:resolvedDbLoad,userExerciseId:u.id,programmeExerciseId:old?.programmeExerciseId||uuid(),trackingMode:mode,compareWithFriends:$('#f-compare')?.checked===true&&isFriendComparableUserExercise(u),supersetGroupId:old?.supersetGroupId||null};
}

function addExercise(workoutId){formDialog(translateUI('Add exercise',languageCode(state)),exerciseForm({workoutId,exerciseType:ExerciseType.MODERATE_COMPOUND}),translateUI('Add',languageCode(state)),async()=>{if(!validateExerciseWeight())return;const e=readExerciseForm(workoutId);state.template_exercises.push(e);await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();});setTimeout(()=>exerciseNameChanged(),0);}
function editExercise(id){const e=state.template_exercises.find(x=>x.id===Number(id));formDialog(translateUI('Edit exercise',languageCode(state)),exerciseForm(e),translateUI('Save',languageCode(state)),async()=>{if(!validateExerciseWeight())return;const n=readExerciseForm(e.workoutId,e);Object.assign(e,n);await persist();if(socialSignedIn())void syncComparisonHistory().catch(console.warn);closeDialog();render();});}
function formatCardioSessionLoad(s){
  let total=0,recorded=false;
  for(const e of state.session_exercises.filter(x=>x.sessionId===s.id&&x.trackingMode===TrackingMode.CARDIO)){
    const m=exerciseMetrics(state,e);if(m.cardioLoad>0){total+=m.cardioLoad;recorded=true;}
  }
  return recorded?`${Math.round(total)} AU`:'—';
}
function sessionCardioSummary(session){return summarizeSessionCardio(state,session);}
/** Keep lifting RIR and cardio RPE separate. Mixed workout colours are based on
 * strength effort; only fall back to cardio when strength effort is unavailable. */
const CARDIO_TO_LOG_DIFFICULTY={easy:'comfortable',moderate:'challenging',hard:'hard',veryhard:'very-hard',unknown:'unknown'};
function workoutLogEffort(session,sm){
  const cardio=workoutCardioEffort(state,session);
  if(session.status==='ABORTED')return {key:'aborted',label:S('Aborted','Pārtraukts'),color:COLORS.deepred};
  // The compact Effort line shows categories only. Numeric RPE stays in detailed cardio metrics.
  if(cardio.mode==='cardio')return {key:'cardio-'+cardio.effort.key,label:translateUI(cardio.effort.label,languageCode(state)),color:cardio.effort.color};
  if(cardio.mode==='mixed'){
    const strength=sessionDifficultyLevel(sm,state.app_state,session.status);
    const cardioKey=CARDIO_TO_LOG_DIFFICULTY[cardio.effort.key]||'unknown';
    const dominant=strength.key==='unknown'&&cardioKey!=='unknown'?{key:cardioKey,color:cardio.effort.color}:strength;
    const cardioLabel=cardio.effort.rpe!=null?translateUI(cardio.effort.label,languageCode(state)):S('effort not recorded','piepūle nav norādīta');
    return {key:dominant.key,label:`${S('Strength','Spēks')}: ${translateUI(strength.label,languageCode(state))} · ${S('Cardio','Kardio')}: ${cardioLabel}`,color:dominant.color,components:[{key:strength.key,title:S('Strength','Spēks'),value:translateUI(strength.label,languageCode(state)),label:`${S('Strength','Spēks')}: ${translateUI(strength.label,languageCode(state))}`},{key:'cardio-'+cardio.effort.key,title:S('Cardio','Kardio'),value:cardioLabel,label:`${S('Cardio','Kardio')}: ${cardioLabel}`}]};
  }
  return sessionDifficultyLevel(sm,state.app_state,session.status);
}
/** Keep strength and cardio effort independent on mixed-session cards, not one dominant colour. */
function effortLabelHtml(effort){
  const parts=effort.components?.length?effort.components:[{key:effort.key,label:effort.label}];
  const rows=parts.map(part=>`<span class="difficulty ${esc(part.key)}">${esc(part.label)}</span>`).join('');
  return parts.length>1?`<span class="effort-stack">${rows}</span>`:rows;
}
/** Log summary: modality names are neutral; only the effort grade carries colour.
 * This is distinct from effortLabelHtml(), which is also used in detail views. */
function logSummaryEffortHtml(effort,mode){
  // A single-modality card needs only its coloured grade. Modality labels are
  // useful only when both strength and cardio ratings are present.
  const parts=Array.isArray(effort.components)&&effort.components.length?effort.components:[{
    key:effort.key,title:null,value:effort.label
  }];
  return parts.map((part,index)=>{
    const title=part.title?`<span class="log-effort-title">${esc(part.title)}:</span> `:'';
    return `${index?'<span class="log-effort-divider" aria-hidden="true"> · </span>':''}<span class="log-effort-item">${title}<strong class="difficulty ${esc(part.key)}">${esc(part.value??part.label)}</strong></span>`;
  }).join('');
}
function logMetric(label,value,note=null){return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}${note?'<sup aria-hidden="true">*</sup>':''}</div>${note?`<div class="metric-footnote">* ${esc(note)}</div>`:''}</div>`;}
function cardioLogFields(cardio,session){
  // Exactly four cells in either modality: unavailable values remain explicit
  // rather than making the grid change shape or width between sessions.
  return [
    logMetric(S('Cardio time','Kardio ilgums'),formatDuration(cardio.duration*1000)),
    logMetric(S('Avg cardio HR','Vidējais kardio pulss'),cardio.meanHr==null?'—':`${Math.round(cardio.meanHr)} ${S('bpm','sit./min')}`),
    logMetric('RPE',cardio.meanRpe==null?'—':formatNumber(cardio.meanRpe,{minimumFractionDigits:1,maximumFractionDigits:1})),
    logMetric(S('Training load','Treniņslodze'),formatCardioSessionLoad(session))
  ].join('');
}
function renderLogs(){
  const sessions=state.workout_sessions.filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').sort((a,b)=>b.startedAt-a.startedAt);let c='';
  if(!sessions.length)c+=`<div class="empty">${esc(S('No recorded workouts yet.','Vēl nav saglabātu treniņu.'))}</div>`;
  else{
    c+=renderFrequencyTimeline();
    sessions.slice(0,ui.logLimit||40).forEach(s=>{
      const m=sessionMetrics(state,s),diff=workoutLogEffort(s,m),cardio=workoutCardioEffort(state,s),cardioStats=sessionCardioSummary(s),dur=(s.endedAt||s.startedAt)-s.startedAt;
      const strength=cardio.mode==='strength'||cardio.mode==='mixed',hasCardio=cardio.mode==='cardio'||cardio.mode==='mixed';
      let strengthStats=logMetric(S('Duration','Ilgums'),formatDuration(dur));
      if(strength){
        strengthStats+=logMetric(S('Strength volume','Spēka apjoms'),formatKgRounded(m.volume));
        strengthStats+=logMetric(S('Volume progress','Apjoma progress'),fmtPct(m.progressPercent),m.progressPercent!=null&&m.volumeComparison?.structureChanged?S('Workout composition or recorded set count changed.','Mainījies treniņa sastāvs vai reģistrēto piegājienu skaits.'):null);
      }
      const cardioSection=hasCardio?`<div class="log-cardio-section">${cardio.mode==='mixed'?`<div class="small log-metric-section-title">${esc(S('Cardio','Kardio'))}</div>`:''}<div class="metric-grid log-metric-grid cardio-metrics-row" role="group" aria-label="${esc(S('Cardio statistics','Kardio statistika'))}">${cardioLogFields(cardioStats,s)}</div></div>`:'';
      const heading=`<div class="log-heading"><span class="log-date">${dateOnly(s.startedAt)}</span><span class="log-heading-separator" aria-hidden="true">·</span><span class="log-name">${esc(s.workoutName)}</span></div>`;
      const effort=`<div class="log-effort-line log-effort-footer" aria-label="${esc(S('Effort','Piepūle')+': '+translateUI(diff.label,languageCode(state)))}">${logSummaryEffortHtml(diff,cardio.mode)}</div>`;
      c+=`<div id="log-session-${s.id}" class="card clickable log-session-card effort-surface" data-effort="${esc(diff.key)}" onclick="gp.nav('session',${s.id})">${heading}${cardio.mode==='mixed'?`<div class="small log-metric-section-title">${esc(S('Strength','Spēks'))}</div>`:''}<div class="metric-grid log-metric-grid">${strengthStats}</div>${cardioSection}${effort}</div>`;
    });
    if(sessions.length>(ui.logLimit||40))c+=`<button class="secondary full" onclick="gp.moreLogs()" style="margin-top:14px">${esc(S('Show more workouts','Rādīt vairāk treniņu'))} (${sessions.length-(ui.logLimit||40)})</button>`;
  }
  return shell(c);
}

function moreLogs(){ui.logLimit=(ui.logLimit||40)+40;render();}
function cardioActivityLogHtml(e){
  const completed=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE');
  if(!completed.length)return `<div class="small">${esc(S('Activity not completed','Aktivitāte nav pabeigta'))}</div>`;
  return completed.map(set=>{
    const duration=Math.max(0,Number(set.actualDurationSeconds)||0),distance=set.distanceKm!=null?Number(set.distanceKm):null;
    const fields=[logMetric(S('Duration','Ilgums'),formatDuration(duration*1000))];
    if(distance!=null)fields.push(logMetric(S('Distance','Distance'),`${formatNumber(distance,{minimumFractionDigits:2,maximumFractionDigits:2})} km`));
    if(distance>0)fields.push(logMetric(S('Pace','Temps'),`${formatDuration(duration/distance*1000)}/km`));
    if(set.averageHeartRateBpm!=null)fields.push(logMetric(S('Average HR','Vidējais pulss'),`${set.averageHeartRateBpm} ${S('bpm','sit./min')}`));
    if(set.averagePowerWatts!=null)fields.push(logMetric(S('Average power','Vidējā jauda'),`${set.averagePowerWatts} W`));
    if(set.sessionRpe!=null){fields.push(logMetric('RPE',String(set.sessionRpe)));fields.push(logMetric(S('Training load','Treniņslodze'),`${Math.round(duration/60*Number(set.sessionRpe))} AU`));}
    return `<div class="cardio-activity-log metric-grid log-metric-grid cardio-metrics-row" tabindex="0" role="group" aria-label="${esc(S('Cardio statistics','Kardio statistika'))}">${fields.join('')}</div>`;
  }).join('');
}
function renderSessionDetail(id){
  const s=getSession(id);if(!s)return shell('',{topbar:topbar(S('Log','Žurnāls'),'logs')});
  const es=sessionExercises(state,s.id),cardio=workoutCardioEffort(state,s),rirMax=Math.max(3,Math.min(5,state.app_state.rirInputMax||3)),sm=sessionMetrics(state,s),sd=workoutLogEffort(s,sm);
  const cardioActive=cardio.mode==='cardio'||cardio.mode==='mixed';
  let c=`<div class="small">${dateTime(s.startedAt)}</div>${s.note?`<div class="note">${esc(s.note)}</div>`:''}<div class="row between session-status-line"><span class="small">${esc(S('Effort','Piepūle'))}</span><span class="session-effort-label">${effortLabelHtml(sd)}</span></div>`;
  const sessionFields=[logMetric(S('Duration','Ilgums'),formatDuration((s.endedAt||s.startedAt)-s.startedAt))];
  if(cardio.mode!=='cardio'&&cardio.mode!=='empty')sessionFields.push(logMetric(S('Strength volume','Spēka apjoms'),formatKgRounded(sm.volume)));
  c+=`<div class="metric-grid log-metric-grid session-overview-grid">${sessionFields.join('')}</div>`;
  if(cardioActive){const cardioSummary=sessionCardioSummary(s),cardioFields=cardioLogFields(cardioSummary,s);c+=`<div class="log-cardio-section"><div class="small log-metric-section-title">${esc(S('Cardio','Kardio'))}</div><div class="metric-grid log-metric-grid cardio-metrics-row" tabindex="0" role="group" aria-label="${esc(S('Cardio statistics','Kardio statistika'))}">${cardioFields}</div></div>`;}
  c+=`<div class="phase-grid"><div class="phase-item"><strong>${esc(S('Warm-up','Iesildīšanās'))}</strong>${phaseDuration(s.warmupStartedAt,s.warmupEndedAt,s.warmupSkipped)}</div><div class="phase-item"><strong>${esc(S('Stretching','Stiepšanās'))}</strong>${phaseDuration(s.stretchStartedAt,s.stretchEndedAt,s.stretchSkipped)}</div></div>`;
  es.forEach(e=>{
    const m=exerciseMetrics(state,e),isCardio=e.trackingMode===TrackingMode.CARDIO;
    const recordedCardio=isCardio?exerciseSets(state,e.id).filter(set=>set.status==='COMPLETE'&&Number(set.actualDurationSeconds)>0&&Number(set.sessionRpe)>=1&&Number(set.sessionRpe)<=10):[];
    const ratedSeconds=recordedCardio.reduce((sum,set)=>sum+Number(set.actualDurationSeconds),0);
    const cardioRating=ratedSeconds>0?recordedCardio.reduce((sum,set)=>sum+Number(set.sessionRpe)*Number(set.actualDurationSeconds),0)/ratedSeconds:null;
    const cardioEffort=cardioEffortFromRpe(cardioRating);
    const diff=isCardio?{key:'cardio-'+cardioEffort.key,label:cardioRating!=null?`${translateUI(cardioEffort.label,languageCode(state))} · RPE ${formatNumber(cardioRating,{minimumFractionDigits:1,maximumFractionDigits:1})}`:S('Effort not recorded','Piepūle nav norādīta')}:difficultyLevel(m.avgRir,m.actionableFailureCount,state.app_state,null,m.completedSets);
    const subtitle=e.status==='SKIPPED'?S('Skipped','Izlaists'):isCardio?formatDuration(m.totalDurationSeconds*1000):`${formatKgRounded(m.volume)} ${S('volume','apjoms')}`;
    c+=`<div class="card session-exercise-card" id="session-exercise-${e.id}"><div class="row between"><div class="log-exercise-heading"><div class="title">${esc(sessionDisplayName(e))}</div><div class="subtitle">${esc(subtitle)}</div>${e.note?`<div class="note exercise-note">${esc(e.note)}</div>`:''}</div><span class="difficulty ${diff.key}">${esc(translateUI(diff.label,languageCode(state)))}</span></div>`;
    if(isCardio){c+=cardioActivityLogHtml(e);}
    else{
      if(e.rampStartedAt||(e.rampSkipped&&rampMemberPlan(e).length>0))c+=`<div class="small">${esc(S('Ramp-up','Iesildīšanās'))} · ${phaseDuration(e.rampStartedAt,e.rampEndedAt,e.rampSkipped)}</div>`;
      if(e.unloadStartedAt||e.unloadSkipped)c+=`<div class="small">${esc(S('Remove weights','Noņemt svarus'))} · ${phaseDuration(e.unloadStartedAt,e.unloadEndedAt,e.unloadSkipped)}</div>`;
      c+=`<div class="log-strength-sets">${exerciseSets(state,e.id).map(set=>`<div class="set-row log-set-row lang-${languageCode(state)}"><strong>${set.setNumber}</strong><span>${set.status==='SKIPPED'?S('Skipped','Izlaists'):[TrackingMode.TIME_ONLY].includes(e.trackingMode)?formatDuration(Number(set.actualDurationSeconds||0)*1000):`${set.actualReps??'—'} ${S('reps','atk.')}`}</span><span>${set.status==='COMPLETE'&&e.trackingMode!==TrackingMode.TIME_ONLY?formatKg(set.actualWeightKg):''}</span><span>${e.trackingMode===TrackingMode.TIME_ONLY?'':set.failure?S('Failure','Atteice'):set.rir!=null?`RIR ${Number(set.rir)>=rirMax?`${rirMax}+`:set.rir}`:''}</span></div>`).join('')}</div>`;
    }
    c+='</div>';
  });
  c+=`<button class="danger full" style="margin-top:18px" onclick="gp.deleteSession(${s.id})">${esc(S('Delete this workout','Dzēst šo treniņu'))}</button>`;
  return shell(c,{topbar:topbar(s.workoutName,ui.sessionBack||'logs')});
}
function removeLocalWorkoutSession(id){const sid=Number(id),exIds=new Set(state.session_exercises.filter(e=>Number(e.sessionId)===sid).map(e=>Number(e.id)));state.workout_sessions=state.workout_sessions.filter(s=>Number(s.id)!==sid);state.session_exercises=state.session_exercises.filter(e=>Number(e.sessionId)!==sid);state.performed_sets=state.performed_sets.filter(s=>!exIds.has(Number(s.sessionExerciseId)));if(Number(state.runtime?.sessionId)===sid)state.runtime=null;}
function deleteSession(id){confirmDialog(S('Delete this workout?','Dzēst šo treniņu?'),S('This removes the complete session and all of its recorded sets. This cannot be undone.','Tiks dzēsts viss treniņš un tā saglabātie piegājieni. Darbību nevar atsaukt.'),S('Delete','Dzēst'),async()=>{removeLocalWorkoutSession(id);await persist();if(socialSignedIn()){await performTrainingSync({reason:'delete-session'}).catch(console.warn);await syncComparisonHistory().catch(console.warn);}closeDialog();nav('logs');},true);}

function progressExerciseOptions(){return buildProgressExerciseOptions(state,languageCode(state));}

function rangeStartMs(){const end=now(),d=new Date();if(ui.progressRange==='1m')d.setMonth(d.getMonth()-1);else if(ui.progressRange==='3m')d.setMonth(d.getMonth()-3);else if(ui.progressRange==='6m')d.setMonth(d.getMonth()-6);else if(ui.progressRange==='1y')d.setFullYear(d.getFullYear()-1);else if(ui.progressRange==='5y')d.setFullYear(d.getFullYear()-5);else if(ui.progressRange==='custom'&&ui.customStart)return new Date(`${ui.customStart}T00:00:00`).getTime();return d.getTime();}
function rangeEndMs(){return ui.progressRange==='custom'&&ui.customEnd?new Date(`${ui.customEnd}T23:59:59`).getTime():now();}
function historyRows(selection){const opt=progressExerciseOptions().find(x=>x.value===selection);return opt?exerciseHistoryRows(state,opt,{aggregateOccurrences:false}):[];}
const CARDIO_METRICS=new Set(['DURATION','DISTANCE','PACE','HEART_RATE','POWER','RPE','LOAD']);
function progressMetricValue(row,metric){return domainProgressMetricValue(row,metric);}
function primaryProgressMetric(row){return [TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(row?.trackingMode)?'DURATION':row?.equipment===Equipment.BODYWEIGHT?'REPS':'WEIGHT';}
function buildChartPoints(rows,metric,start,end){const out=[];let prev=null;for(const r of rows){const inRange=r.sessionStartedAt>=start&&r.sessionStartedAt<=end,skipped=r.completedSets<=0;if(skipped){if(inRange&&metric===primaryProgressMetric(r)&&prev)out.push({time:r.sessionStartedAt,value:progressMetricValue(prev,metric),cls:'SKIPPED'});continue;}const value=progressMetricValue(r,metric);if(value==null||!Number.isFinite(value))continue;const cls=classifyProgress(r,prev,metric);if(inRange)out.push({time:r.sessionStartedAt,value,cls});prev=r;}return out;}
function classifyProgress(cur,prev,metric){cur=sourceForProgressMetric(cur,metric);prev=sourceForProgressMetric(prev,metric);if(cur.trackingMode===TrackingMode.CARDIO)return'MEASURED';const primary=metric===primaryProgressMetric(cur);if(primary&&cur.actionableFailureCount>0)return'FAILURE';if(!prev)return'FIRST';const cv=progressMetricValue(cur,metric),pv=progressMetricValue(prev,metric);if(cv>pv+.001)return'UP';if(cv<pv-.001)return'DOWN';if(primary&&cur.actionableFailureCount===0&&prev.actionableFailureCount===0&&cur.avgRir!=null&&prev.avgRir!=null&&cur.avgRir>prev.avgRir+.05)return'BETTER';return'SAME';}
function progressColor(cls){return {FIRST:COLORS.blue,UP:COLORS.green,BETTER:COLORS.lightgreen,SAME:COLORS.yellow,DOWN:COLORS.red,FAILURE:COLORS.deepred,SKIPPED:COLORS.gray,MEASURED:COLORS.blue}[cls]||COLORS.blue;}
function mixHexColor(a,b,t=.5){const n=x=>parseInt(x,16),aa=String(a).replace('#',''),bb=String(b).replace('#','');if(aa.length!==6||bb.length!==6)return b;const c=[0,2,4].map(i=>Math.round(n(aa.slice(i,i+2))+(n(bb.slice(i,i+2))-n(aa.slice(i,i+2)))*t).toString(16).padStart(2,'0'));return`#${c.join('')}`;}
function niceChartStep(span,targetIntervals=5,integer=false,weight=false){if(!Number.isFinite(span)||span<=0)return integer?1:2.5;const raw=span/Math.max(1,targetIntervals),power=10**Math.floor(Math.log10(raw)),fraction=raw/power,candidates=integer?[1,2,5,10]:weight&&power<10?[1,2.5,5,10]:[1,2,2.5,5,10],nice=candidates.find(x=>x>=fraction)??10;return Math.max(integer?1:0,nice*power);}
function niceChartAxis(minValue,maxValue,{targetIntervals=5,integer=false,weight=false}={}){let min=Number(minValue),max=Number(maxValue);if(!Number.isFinite(min)||!Number.isFinite(max))return{low:0,high:1,step:1,ticks:[0,1]};if(max<min)[min,max]=[max,min];let span=max-min;if(span<1e-9){const basis=Math.max(Math.abs(max)*.1,integer?1:2.5);min-=basis/2;max+=basis/2;span=max-min;}let step=niceChartStep(span*1.1,targetIntervals,integer,weight),low=Math.max(0,Math.floor((min-step*.35)/step)*step),high=Math.ceil((max+step*.35)/step)*step;if(high<=low)high=low+step;let ticks=[];for(let v=low,i=0;v<=high+step*.001&&i<12;v+=step,i++)ticks.push(Math.abs(v)<1e-9?0:v);if(ticks.length<3){high+=step;ticks=[];for(let v=low,i=0;v<=high+step*.001&&i<12;v+=step,i++)ticks.push(Math.abs(v)<1e-9?0:v);}return{low,high,step,ticks};}
function compactTick(value,step){const decimals=step<1?2:step<10&&Math.abs(step-Math.round(step))>.001?1:0;return formatNumber(value,{maximumFractionDigits:decimals});}
function renderChart(points,metric){
  if(!points.length)return`<div class="empty" data-i18n="No data in this period.">No data in this period.</div>`;
  const viewportWidth=window.visualViewport?.width||window.innerWidth||760,W=Math.max(276,Math.min(716,viewportWidth-44)),H=250,L=58,R=4,T=16,B=14,vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),axis=niceChartAxis(min,max,{targetIntervals:5,integer:metric==='REPS'||metric==='DURATION',weight:metric==='WEIGHT'||metric==='E1RM'}),low=axis.low,high=axis.high,range=Math.max(.001,high-low),minT=Math.min(...points.map(p=>p.time)),maxT=Math.max(...points.map(p=>p.time));
  const x=t=>maxT===minT?L+(W-L-R)/2:L+(W-L-R)*(t-minT)/(maxT-minT),y=v=>T+(H-T-B)*(1-(v-low)/range);
  const axisLabel=tick=>metric==='REPS'?`${Math.round(tick)}`:metric==='DURATION'?formatDuration(Math.max(0,tick)*1000):metric==='PACE'?`${formatDuration(Math.max(0,tick)*1000)}/km`:metric==='DISTANCE'?`${compactTick(tick,axis.step)} km`:metric==='HEART_RATE'?`${Math.round(tick)} ${S('bpm','sit./min')}`:metric==='POWER'?`${Math.round(tick)} W`:metric==='RPE'?`${compactTick(tick,axis.step)} RPE`:metric==='LOAD'?`${compactTick(tick,axis.step)} AU`:metric==='VOLUME'?(Math.abs(tick)>=1000?`${compactTick(tick/1000,axis.step/1000)}k kg`:`${compactTick(tick,axis.step)} kg`):`${compactTick(tick,axis.step)} kg`;
  let defs='',paths='',dots='',grid='';for(const tick of axis.ticks.slice().reverse()){const yy=y(tick);grid+=`<line class="chart-grid" vector-effect="non-scaling-stroke" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis" x="${L-6}" y="${yy+4}" text-anchor="end">${axisLabel(tick)}</text>`;}
  if(points.length===1){const p=points[0],px=x(p.time),py=y(p.value),color=progressColor(p.cls);paths=`<line x1="${px-10}" y1="${py}" x2="${px+10}" y2="${py}" stroke="${color}" class="chart-line" vector-effect="non-scaling-stroke"/>`;dots=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${px}" cy="${py}" r="4" fill="${color}"/>`;}
  else{const trendCls=(u,v)=>CARDIO_METRICS.has(metric)?'MEASURED':v.value>u.value+.001?'UP':v.value<u.value-.001?'DOWN':v.cls,segmentColors=points.slice(0,-1).map((a,i)=>progressColor(trendCls(a,points[i+1]))),fade=.18;points.slice(0,-1).forEach((a,i)=>{const b=points[i+1],ax=x(a.time),ay=y(a.value),bx=x(b.time),by=y(b.value),dx=bx-ax,id=`g${i}`,segmentColor=segmentColors[i],previousColor=segmentColors[i-1]||null,nextColor=segmentColors[i+1]||null,firstPointColor=i===0?progressColor(a.cls):null,startBoundary=previousColor&&previousColor!==segmentColor?mixHexColor(previousColor,segmentColor):firstPointColor&&firstPointColor!==segmentColor?mixHexColor(firstPointColor,segmentColor):segmentColor,endBoundary=nextColor&&nextColor!==segmentColor?mixHexColor(segmentColor,nextColor):segmentColor;const stops=[`<stop offset="0" stop-color="${startBoundary}"/>`,startBoundary!==segmentColor?`<stop offset="${fade}" stop-color="${segmentColor}"/>`:'',endBoundary!==segmentColor?`<stop offset="${1-fade}" stop-color="${segmentColor}"/>`:'',`<stop offset="1" stop-color="${endBoundary}"/>`].join('');defs+=`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}">${stops}</linearGradient>`;const c1x=ax+dx*.36,c2x=bx-dx*.36;paths+=`<path d="M ${ax} ${ay} C ${c1x} ${ay}, ${c2x} ${by}, ${bx} ${by}" stroke="url(#${id})" class="chart-line" vector-effect="non-scaling-stroke"/>`;});points.forEach((p,i)=>{const before=segmentColors[i-1],after=segmentColors[i],color=before&&after&&before!==after?mixHexColor(before,after):after||before||progressColor(p.cls);dots+=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${x(p.time)}" cy="${y(p.value)}" r="4" fill="${color}"/>`;});}
  return`<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${grid}${paths}${dots}</svg></div>`;
}
function renderProgress(){
  const options=progressExerciseOptions();if(!options.some(x=>x.value===ui.progressExercise))ui.progressExercise=options[0]?.value||'';const selected=options.find(x=>x.value===ui.progressExercise),rows=selected?historyRows(selected.value):[],u=selected?getUserExercise(state,selected.userExerciseId):null,cardio=rows.some(r=>r.trackingMode===TrackingMode.CARDIO)||u?.trackingMode===TrackingMode.CARDIO,timed=!cardio&&(rows.some(r=>r.trackingMode===TrackingMode.TIME_ONLY)||u?.trackingMode===TrackingMode.TIME_ONLY),bodyweight=!cardio&&!timed&&(rows.some(r=>r.equipment===Equipment.BODYWEIGHT)||u?.equipment===Equipment.BODYWEIGHT),metrics=cardio?['DURATION','DISTANCE','PACE','POWER','HEART_RATE','RPE','LOAD']:timed?['DURATION']:bodyweight?['REPS']:['WEIGHT','VOLUME','E1RM'];if(!metrics.includes(ui.progressMetric))ui.progressMetric=metrics[0];const start=rangeStartMs(),end=rangeEndMs(),points=buildChartPoints(rows,ui.progressMetric,start,end),visible=rows.filter(r=>r.sessionStartedAt>=start&&r.sessionStartedAt<=end&&r.completedSets>0),measuredVisible=visible.filter(r=>progressMetricValue(r,ui.progressMetric)!=null),first=measuredVisible[0]||null,current=measuredVisible.at(-1)||null,firstValue=first?progressMetricValue(first,ui.progressMetric):null,currentValue=current?progressMetricValue(current,ui.progressMetric):null,change=firstValue!=null&&currentValue!=null&&firstValue>0?(currentValue/firstValue-1)*100:null,metricLabel=ui.progressMetric==='E1RM'?'e1RM':ui.progressMetric==='HEART_RATE'?'Heart rate':ui.progressMetric[0]+ui.progressMetric.slice(1).toLowerCase(),metricText=v=>v==null?'—':ui.progressMetric==='REPS'?`${Math.round(v)} ${S('reps','atk.')}`:ui.progressMetric==='DURATION'?formatDuration(v*1000):ui.progressMetric==='DISTANCE'?`${formatNumber(Number(v),{minimumFractionDigits:2,maximumFractionDigits:2})} km`:ui.progressMetric==='PACE'?`${formatDuration(v*1000)}/km`:ui.progressMetric==='HEART_RATE'?`${Math.round(v)} ${S('bpm','sit./min')}`:ui.progressMetric==='POWER'?`${Math.round(v)} W`:ui.progressMetric==='RPE'?`RPE ${formatNumber(Number(v),{minimumFractionDigits:1,maximumFractionDigits:1})}`:ui.progressMetric==='LOAD'?`${Math.round(v)} AU`:ui.progressMetric==='VOLUME'?formatKgRounded(v):formatKg(v),summary=`<div class="progress-summary"><div class="metric"><div class="metric-label" data-i18n="Current">Current</div><div class="metric-value">${metricText(currentValue)}</div></div><div class="metric"><div class="metric-label" data-i18n="First">First</div><div class="metric-value">${metricText(firstValue)}</div></div>${cardio?'':`<div class="metric"><div class="metric-label">${esc(translateUI(metricLabel+' progress',languageCode(state)))}</div><div class="metric-value">${fmtPct(change)}</div></div>`}</div>`;let c=`<div class="stack"><div><select aria-label="Period" onchange="gp.setProgressRange(this.value)"><option value="1m" ${ui.progressRange==='1m'?'selected':''}>1 month</option><option value="3m" ${ui.progressRange==='3m'?'selected':''}>3 months</option><option value="6m" ${ui.progressRange==='6m'?'selected':''}>6 months</option><option value="1y" ${ui.progressRange==='1y'?'selected':''}>1 year</option><option value="5y" ${ui.progressRange==='5y'?'selected':''}>5 years</option><option value="custom" ${ui.progressRange==='custom'?'selected':''}>Custom</option></select></div>${ui.progressRange==='custom'?`<div class="form-grid"><div><label class="field" data-i18n="From">From</label><input type="date" value="${ui.customStart}" onchange="gp.setCustomStart(this.value)"></div><div><label class="field" data-i18n="To">To</label><input type="date" value="${ui.customEnd}" onchange="gp.setCustomEnd(this.value)"></div></div>`:''}<div><button type="button" class="progress-exercise-trigger" aria-haspopup="dialog" onclick="gp.openProgressExercisePicker()" aria-label="${esc(S('Choose exercise','Izvēlies vingrinājumu'))}"><span class="progress-exercise-selection"><span class="progress-exercise-selection-label">${esc(S('Exercise','Vingrinājums'))}</span><span class="progress-exercise-selection-value" data-user-content>${esc(selected?.label||S('Choose exercise','Izvēlies vingrinājumu'))}</span></span>${expandChevron('progress-exercise-chevron')}</button></div></div><div class="segmented progress-metrics" style="margin-top:12px">${metrics.map(m=>`<button class="${ui.progressMetric===m?'active':''}" onclick="gp.setProgressMetric('${m}')">${m==='E1RM'?'e1RM':m==='HEART_RATE'?'Heart rate':m[0]+m.slice(1).toLowerCase()}</button>`).join('')}</div>${summary}${cardio?"<p class=\"small\" data-interface-text>Cardio Progress is specific to this exercise, never mixed with lifting e1RM or volume. Duration × RPE measures training load, not fitness.</p>":''}${renderChart(points,ui.progressMetric)}${progressTrendHTML(rows,visible,ui.progressMetric,cardio)}`;if(cardio){
    const primary=preferredCardioMetric(visible),match=compareCardioAtMatchedEffort(visible,primary);
    if(match){const improved=match.changePct>=0,metricName=primary==='PACE'?'Pace':'Average power',exercise=selected?.label||'cardio exercise',change=formatNumber(Math.abs(match.changePct),{minimumFractionDigits:1,maximumFractionDigits:1});
      const comparison=S(`${metricName} ${improved?'improved':'decreased'} by ${change}% compared with a previous ${exercise} activity at a similar recorded effort. Same exercise, RPE within 1 and distance/duration within 10–15%. Weather, terrain and fatigue can still affect the result.`,`${primary==='PACE'?'Temps':'Vidējā jauda'} ${improved?'uzlabojās':'samazinājās'} par ${change}%, salīdzinot ar iepriekšēju ${exercise} aktivitāti pie līdzīgas piepūles. Tas pats vingrinājums, RPE atšķirība līdz 1 un distances/ilguma atšķirība līdz 10–15%. Rezultātu var ietekmēt arī laikapstākļi, reljefs un nogurums.`);
      c+=`<div class="card" style="margin-top:12px"><div class="title">${esc(S('Matched-effort comparison','Salīdzinājums pie līdzīgas piepūles'))}</div><div class="note">${esc(comparison)}</div></div>`;
    }else c+=`<p class="small" style="margin-top:10px">${esc(S('For a matched-effort comparison, record RPE and distance or power on at least two similar activities of this exercise.','Lai salīdzinātu pie līdzīgas piepūles, reģistrē RPE un distanci vai jaudu vismaz divās līdzīgās šī vingrinājuma aktivitātēs.'))}</p>`;
  }
  const recent=rows.filter(r=>r.sessionStartedAt>=start&&r.sessionStartedAt<=end).slice().reverse().slice(0,12);
  if(recent.length){
    c+=`<div class="section-title" data-i18n="Recent">Recent</div>`;
    for(const row of recent){
      const source=sourceForProgressMetric(row,ui.progressMetric),isCardio=source.trackingMode===TrackingMode.CARDIO;
      const rawEffort=isCardio?cardioEffortFromRpe(source.sessionRpe):difficultyLevel(source.avgRir,source.actionableFailureCount,state.app_state,null,source.completedSets);
      const effort={...rawEffort,key:isCardio?'cardio-'+rawEffort.key:rawEffort.key};
      const session=getSession(source.sessionId),value=metricText(progressMetricValue(row,ui.progressMetric)),cycle=row.aggregationMode==='CYCLE_BEST';
      const context=cycle?S(`Cycle ${row.cycleIndex}`,`Cikls ${row.cycleIndex}`):(session?.workoutName||'');
      c+=`<button class="card progress-entry effort-surface" data-effort="${esc(effort.key)}" onclick="gp.openProgressEntry(${Number(source.sessionId)},${Number(source.sessionExerciseId)})" aria-label="${esc(S('Open exercise in workout','Atvērt vingrinājumu treniņā')+' · '+dateOnly(source.sessionStartedAt))}"><span class="row between"><strong>${esc(dateOnly(source.sessionStartedAt))}</strong><span class="progress-entry-value">${esc(value)}</span></span><span class="row between progress-entry-meta"><span class="small" data-user-content>${esc(context)}</span><span class="difficulty ${esc(effort.key)}">${esc(translateUI(effort.label,languageCode(state)))}</span></span></button>`;
    }
  }

 return shell(c);
}
function openProgressEntry(sessionId,exerciseId){
  const session=getSession(sessionId),exercise=getSessionExercise(exerciseId);
  if(!session||!exercise||Number(exercise.sessionId)!==Number(session.id)){toast(S('This source workout is no longer available.','Šis avota treniņš vairs nav pieejams.'));return;}
  ui.sessionBack='progress';nav('session',session.id);
  requestAnimationFrame(()=>{
    const card=document.getElementById('session-exercise-'+exercise.id);
    if(!card)return;
    card.classList.add('source-highlight');card.setAttribute('tabindex','-1');
    card.scrollIntoView?.({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    card.focus({preventScroll:true});
  });
}

function progressTrendHTML(rows,visible,metric,cardio){
 // Trend is an observational summary, not a diagnosis or an automatic prescription.
 const latest=visible.at(-1);
 const source=latest?sourceForProgressMetric(latest,metric):null;
 const exercise=source?(state.session_exercises||[]).find(e=>String(e.id)===String(source.sessionExerciseId)):null;
 const assessment=!cardio&&exercise?assessExerciseTrend(state,exercise):null;
 const result=compactProgressTrend({mode:cardio?'cardio':'strength',visibleCount:visible.length,assessment});
 return `<p class="progress-trend-line" role="note"><span class="progress-trend-dot ${esc(result.tone)}" aria-hidden="true"></span>${esc(S(result.en,result.lv))}</p>`;
}
function openProgressExercisePicker(){
 const options=progressExerciseOptions(),chosen=ui.progressExercise;
 openDialog(`<div class="progress-picker"><h2>${esc(S('Choose exercise','Izvēlies vingrinājumu'))}</h2><label class="sr-only" for="progress-picker-search">${esc(S('Search exercises','Meklēt vingrinājumu'))}</label><input id="progress-picker-search" type="search" autocomplete="off" placeholder="${esc(S('Search exercises','Meklēt vingrinājumu'))}" oninput="gp.filterProgressExerciseOptions(this.value)"><div class="progress-picker-count" aria-live="polite">${esc(S(`${options.length} exercises and programme occurrences`,`${options.length} vingrinājumi un programmas pozīcijas`))}</div><div class="progress-picker-list" data-preserve-scroll>${options.map(o=>`<button class="progress-picker-option ${o.value===chosen?'selected':''}" type="button" value="${esc(o.value)}" data-search="${esc((o.name+' '+o.day).toLocaleLowerCase())}" onclick="gp.chooseProgressExercise(this.value)"><span class="progress-picker-option-text"><span class="progress-picker-name" data-user-content>${esc(o.name)}</span><span class="progress-picker-context" data-user-content>${esc(o.day)}</span></span>${o.value===chosen?'<svg viewBox="0 0 20 20" class="progress-picker-check" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>':''}</button>`).join('')}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div></div>`);
}
function filterProgressExerciseOptions(raw){
 const query=String(raw||'').trim().toLocaleLowerCase();let count=0;
 document.querySelectorAll('.progress-picker-option').forEach(el=>{const visible=!query||(el.dataset.search||'').includes(query);el.hidden=!visible;if(visible)count++;});
 const label=document.querySelector('.progress-picker-count');if(label)label.textContent=S(`${count} matches`,`${count} atbilstības`);
}
function chooseProgressExercise(value){
 if(!progressExerciseOptions().some(option=>option.value===value))return;
 closeDialog();setProgressExercise(value);
}
function setProgressRange(v){ui.progressRange=v;if(v==='custom'&&!ui.customStart){const d=new Date();const e=d.toISOString().slice(0,10);d.setMonth(d.getMonth()-3);ui.customStart=d.toISOString().slice(0,10);ui.customEnd=e;}render();}function setProgressExercise(v){ui.progressExercise=v;ui.progressMetric='WEIGHT';render();}function setProgressMetric(v){const previous=document.querySelector('.progress-metrics');const left=previous?.scrollLeft||0;ui.progressMetric=v;render();const next=document.querySelector('.progress-metrics');if(next)next.scrollLeft=left;}function setCustomStart(v){ui.customStart=v;render();}function setCustomEnd(v){ui.customEnd=v;render();}

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
function rampMemberHtml(e){const plan=rampMemberPlan(e),reduced=hasPriorSimilarMovement(e),load=e.equipment===Equipment.BODYWEIGHT?translateUI('Bodyweight',languageCode(state)):formatKg(e.plannedWeightKg),working=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode)?`${load} · ${formatDuration(Number(e.targetSeconds||60)*1000)}`:`${load} × ${e.targetReps}`;return `<div class="card ramp-member-card">${reduced&&plan.length?`<div class="small ramp-support-copy">${esc(S('Shortened because a similar movement is already warm.','Saīsināts, jo līdzīga kustība jau ir iesildīta.'))}</div>`:''}<div class="ramp-list">${plan.length?plan.map((p,i)=>`<div class="ramp-line"><span class="ramp-index">${i+1}.</span><span class="ramp-primary">${formatKg(p.weightKg)} × ${p.reps}</span><span class="ramp-rest">${p.restSeconds}s</span></div>`).join(''):`<div class="small">${esc(S('No ramp-up needed.','Iesildīšanās piegājieni nav vajadzīgi.'))}</div>`}</div><div class="ramp-working-target"><strong>${working}</strong></div></div>`;}
function supersetSetContext(){
  const ctx=currentActiveContext();if(!ctx?.rt||!ctx.e||!ctx.set)return null;const info=supersetPairSetInfo(ctx.exs,ctx.e,ctx.set.setNumber);if(!info)return null;
  const lead=info.items[0];return {...ctx,...info,leadIndex:ctx.exs.findIndex(x=>x.id===lead.e.id)};
}
function supersetDisplayWeight(rt,item){return Number(rt.supersetWeights?.[item.e.id]??item.set.plannedWeightKg??item.e.plannedWeightKg??0);}
function supersetTimedState(rt,exerciseId){rt.supersetTimed=rt.supersetTimed||{};return rt.supersetTimed[exerciseId]||null;}
function supersetTimedElapsed(item,rt){const st=supersetTimedState(rt,item.e.id);if(st?.durationSeconds!=null)return Number(st.durationSeconds);if(st?.startedAt)return Math.max(0,Math.round((now()-Number(st.startedAt))/1000));return 0;}
function renderSupersetPulseItem(item,index,rt){const bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(item.e.equipment),timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode),weight=supersetDisplayWeight(rt,item),name=sessionDisplayName(item.e),st=supersetTimedState(rt,item.e.id),target=Math.max(1,Number(item.set.targetDurationSeconds||item.e.targetSeconds||60)),elapsed=supersetTimedElapsed(item,rt),remaining=Math.max(0,target-elapsed);return `<div class="superset-active-item"><div class="pulse-circle superset-pulse-circle ${index===0?'superset-red':'superset-blue'}"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div>${bodyweight?`<div class="pulse-target">${translateUI('Bodyweight',languageCode(state))}</div>`:''}${timed?`<div class="pulse-reps-badge"><span class="${st?.startedAt?'live-superset-timed':''}" data-start="${st?.startedAt||''}" data-target="${target}">${formatDuration((st?.durationSeconds!=null?st.durationSeconds:remaining)*1000)}</span>${esc(S('TIME','LAIKS'))}</div>`:`<div class="pulse-reps-badge"><span>${item.set.targetReps}</span> ${esc(S('REPS','ATK.'))}</div>`}<div class="pulse-set">${item.set.setNumber}/${item.sets.length}</div></div></div>${bodyweight?'':`<div class="weight-control superset-weight-control"><button class="icon-btn" onclick="gp.adjustSupersetWeight(${item.e.id},-1)">−</button><div class="weight-value" onclick="gp.customSupersetWeight(${item.e.id})">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustSupersetWeight(${item.e.id},1)">+</button></div>`}${timed?`<button class="secondary full" onclick="gp.toggleSupersetTimed(${item.e.id})">${esc(st?.durationSeconds!=null?S('RESTART TIMER','SĀKT TAIMERI NO JAUNA'):st?.startedAt?S('FINISH TIMER','APTURĒT TAIMERI'):S('START TIMER','SĀKT TAIMERI'))}</button>`:''}</div>`;}
function renderSupersetEntry(rt){const entries=rt.supersetEntry||[],maxRir=Math.max(3,Math.min(5,state.app_state.rirInputMax||3));return `${restPanel(restRemaining(rt),false,false,false)}<div class="superset-entry-title" data-i18n="SUPERSET · ENTER BOTH SETS">SUPERSET · ENTER BOTH SETS</div><div class="superset-entry-grid">${entries.map((entry,i)=>{const e=getSessionExercise(entry.exerciseId),set=getSet(entry.setId);if(entry.timed)return `<div class="card superset-entry-card ${i===0?'entry-red':'entry-blue'}"><div class="title">${esc(sessionDisplayName(e))}</div><div class="small">${set?.setNumber||1}/${e?.targetSets||1}</div><div class="section-title" style="text-align:center" data-i18n="Time">Time</div><div class="entry-number">${formatDuration(Number(entry.durationSeconds||0)*1000)}</div>${e?.equipment!==Equipment.BODYWEIGHT?`<div class="small" style="text-align:center">${formatKg(entry.weight)}</div>`:''}</div>`;return `<div class="card superset-entry-card ${i===0?'entry-red':'entry-blue'}"><div class="title">${esc(sessionDisplayName(e))}</div><div class="small">${set?.setNumber||1}/${e?.targetSets||1}</div><div class="section-title" style="text-align:center" data-i18n="Reps">Reps</div><div class="row center"><button class="icon-btn" onclick="gp.adjustSupersetEntryReps(${i},-1)">−</button><div class="entry-number">${entry.reps}</div><button class="icon-btn" onclick="gp.adjustSupersetEntryReps(${i},1)">+</button></div><div class="rir-heading">RIR · ${esc(S('target','mērķis'))} ${state.app_state.targetRirMin}–${state.app_state.targetRirMax}</div><div class="rir-row compact-rir"><button class="secondary failure-btn ${entry.failure?'active':''}" onclick="gp.setSupersetRir(${i},'failure')">${esc(S('Failure','Atteice'))}</button>${Array.from({length:maxRir+1},(_,v)=>`<button class="secondary ${!entry.failure&&entry.rir===v?'active':''}" onclick="gp.setSupersetRir(${i},${v})">${v===maxRir?`${maxRir}+`:v}</button>`).join('')}</div></div>`;}).join('')}</div><div id="superset-rir-required" class="rir-required-note" data-i18n="Choose RIR or Failure for each rep-based exercise before saving.">Choose RIR or Failure for each rep-based exercise before saving.</div><button class="full" style="margin-top:20px" onclick="gp.saveSupersetSet()" data-i18n="SAVE SUPERSET">SAVE SUPERSET</button>`;}
function workoutControlIcon(kind){
 const paths={undo:'M19 12H5m6-6-6 6 6 6',redo:'M5 12h14m-6-6 6 6-6 6',close:'M5 5l14 14M19 5 5 19'};
 return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
}
function renderRestTaskList(exs,rt){
  const target=exs[rt?.nextAction?.exerciseIndex]||exs[rt?.currentExerciseIndex];
  const groups=restTaskSummary(exs,state.performed_sets,target?.id);
  if(!groups.length)return '';
  const icon=(status)=>status==='completed'?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.7 10.1l3.6 3.5 7-7.1"/></svg>':status==='skipped'?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.8 5.8l8.4 8.4m0-8.4-8.4 8.4"/></svg>':'';
  return `<section class="card rest-task-list" aria-label="${esc(S('Today’s exercises','Šodienas vingrinājumi'))}"><div class="rest-task-heading">${esc(S('Today’s exercises','Šodienas vingrinājumi'))}</div>${groups.map(group=>`<div class="rest-task-row ${group.status}"><span class="rest-task-status" aria-hidden="true">${icon(group.status)}</span><span class="rest-task-name">${esc(group.members.map(sessionDisplayName).join(' + '))}</span></div>`).join('')}</section>`;
}
function renderActive(){
  const {rt,s,e,sets,set}=currentActiveContext();if(!rt||!s)return shell(`<div class="empty" data-i18n="No active workout.">No active workout.</div>`,{navBar:false});
  const canUndo=canUndoWorkoutStep(state)||!!lastCompletedWorkoutSet(),canRedo=canRedoWorkoutStep(state)||!!currentRedoRevision(),finalPhase=rt.phase==='FINAL';
  const header=simpleActiveHeaderState({rt,s,e,sets,set,exs:sessionExercises(state,s.id)}),progress=Math.round(workoutProgressFraction()*1000)/10;
  const control=(kind,action,label,enabled=true)=>`<button class="icon-btn workout-history-control" onclick="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${enabled?'':'disabled'}>${workoutControlIcon(kind)}</button>`;
  const fullStageLabel=[header.stage,header.current].filter(Boolean).join(' · ');
  const top=`<div class="topbar active-workout-topbar">
    <div class="active-workout-context">
      <div class="active-workout-mainline">
        <strong class="active-workout-name" title="${esc(s.workoutName)}">${esc(s.workoutName)}</strong>
        <span class="active-header-divider" aria-hidden="true"> · </span>
        <span class="small live-session-time active-workout-timer" data-start="${s.startedAt}">${formatDuration(syncedElapsed(s.startedAt))}</span>
      </div>
      ${rt.phase==='REST'?'':`<div class="active-workout-subline" title="${esc(fullStageLabel)}">
        ${header.stage?`<strong class="active-header-stage">${esc(header.stage)}</strong>`:''}
        ${header.stage&&header.current?'<span class="active-header-divider" aria-hidden="true"> · </span>':''}
        <span class="active-header-current">${esc(header.current||'')}</span>
      </div>`}
    </div>
    <div class="workout-history-controls">${control('undo','gp.undoLastSet()',S('Undo last set','Atsaukt pēdējo piegājienu'),canUndo)}${control('redo','gp.redoLastSet()',S('Redo last set','Atjaunot pēdējo piegājienu'),canRedo)}${control('close','gp.requestAbort()',S('End workout early','Pabeigt treniņu agrāk'),!finalPhase)}</div>
  </div><div class="workout-progress-track" aria-hidden="true"><div class="workout-progress-fill" style="width:${progress}%"></div></div>`;
  let c='';
  if(rt.phase==='PRE_EXERCISE')c=nextExerciseDecisionCard();
  else if(rt.phase==='WARMUP')c=phasePanel(S('WARM-UP','IESILDĪŠANĀS'),rt.phaseStartedAt,S('Finish warm-up','Pabeigt iesildīšanos'),'gp.finishWarmup(false)','gp.finishWarmup(true)');
  else if(rt.phase==='RAMP_PROMPT'){
    const members=currentRampMembers(),isPair=members.length===2;c=`<div class="ramp-heading"><h2>${esc(isPair?S('Superset ramp-up','Superseta iesildīšanās'):sessionDisplayName(members[0]))}</h2>${isPair?`<div class="small">${esc(S('One ramp-up flow prepares both exercises.','Viena iesildīšanās secība sagatavo abus vingrinājumus.'))}</div>`:''}</div><div class="section-title">${esc(S('Suggested ramp-up','Ieteiktā iesildīšanās'))}</div>${members.map(rampMemberHtml).join('')}<div class="row" style="margin-top:20px"><button class="secondary grow" onclick="gp.disableRampPermanently()">${esc(S('Remove','Noņemt'))}</button><button class="secondary grow" onclick="gp.skipRamp()">${esc(S('Skip','Izlaist'))}</button><button class="grow" onclick="gp.startRamp()">${esc(S('Start','Sākt'))}</button></div>`;
  }else if(rt.phase==='RAMP_ACTIVE'){
    const members=currentRampMembers(),isPair=members.length===2;c=`<div class="timer-panel focus"><div class="timer-label">${esc(isPair?S('SUPERSET RAMP-UP','SUPERSETA IESILDĪŠANĀS'):S('RAMP-UP','IESILDĪŠANĀS'))}</div><div class="countup live-countup" data-start="${rt.phaseStartedAt}">${formatDuration(syncedElapsed(rt.phaseStartedAt))}</div></div>${members.map(rampMemberHtml).join('')}${renderNextInfo()}<button class="full" style="margin-top:18px" onclick="gp.finishRamp(false)">${esc(S('Finish ramp-up','Pabeigt iesildīšanos'))}</button>`;
  }else if(rt.phase==='SET'){
    const superCtx=supersetSetContext();if(superCtx){if(!rt.supersetWeights)rt.supersetWeights={};c=`<div class="superset-active-heading" data-i18n="SUPERSET">SUPERSET</div><div class="superset-pulse-grid">${superCtx.items.map((item,i)=>renderSupersetPulseItem(item,i,rt)).join('')}</div><div class="superset-current-info"><span data-i18n="SUPERSET">SUPERSET</span>${superCtx.items.map(item=>`<strong>${nextPrescriptionHtml(item.e,item.set)}</strong>`).join('')}</div><button class="full superset-complete-btn" onclick="gp.supersetComplete()" data-i18n="SUPERSET COMPLETE">SUPERSET COMPLETE</button>${superCtx.items.filter(item=>canReplaceWholeExercise(item.sets)).map(item=>`<button class="exercise-management" onclick="gp.requestReplaceExercise(${esc(JSON.stringify(String(item.e.id)))})">${esc(S('Replace','Aizstāt'))}: ${esc(sessionDisplayName(item.e))}</button>`).join('')}<div class="row center" style="margin-top:10px"><button class="ghost small-btn" onclick="gp.skipSupersetSet()" data-i18n="Skip superset set">Skip superset set</button><button class="ghost small-btn" onclick="gp.skipSuperset()" data-i18n="Skip superset">Skip superset</button></div>`;}else{
      const weight=Number(rt.workingWeight??set?.plannedWeightKg??e?.plannedWeightKg??0),bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e.equipment),timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode),name=sessionDisplayName(e);if(timed)c=`<div class="pulse-wrap"><div class="pulse-circle"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div><div class="pulse-target">${formatDuration(Number(set.targetDurationSeconds||e.targetSeconds||60)*1000)}</div><div class="pulse-reps-badge" data-i18n="TIME">TIME</div>${e.trackingMode===TrackingMode.CARDIO?'':`<div class="pulse-set">${set.setNumber}/${sets.length}</div>`}</div></div></div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}<button class="full" style="margin-top:24px" onclick="gp.startTimedSet()">${esc(e.trackingMode===TrackingMode.CARDIO?S('START CARDIO','SĀKT KARDIO'):S('START TIMED SET','SĀKT LAIKA PIEGĀJIENU'))}</button><div class="row center" style="margin-top:10px">${e.trackingMode===TrackingMode.CARDIO?'':`<button class="ghost small-btn" onclick="gp.skipSet()">${esc(S('Skip set','Izlaist piegājienu'))}</button>`}<button class="ghost small-btn" onclick="gp.skipExercise()">${esc(S('Skip exercise','Izlaist vingrinājumu'))}</button></div>${canReplaceWholeExercise(sets)?exerciseActionButtons({showLater:false}):''}`;else c=`<div class="pulse-wrap"><div class="pulse-circle"><div class="pulse-inner"><div class="pulse-exercise">${esc(name)}</div>${bodyweight?`<div class="pulse-target">${translateUI('Bodyweight',languageCode(state))}</div>`:''}<div class="pulse-reps-badge"><span>${set.targetReps}</span> ${esc(S('REPS','ATK.'))}</div><div class="pulse-set ${ui.setStatusMessage?'set-status-flash':''}">${ui.setStatusMessage?esc(ui.setStatusMessage):`${set.setNumber}/${sets.length}`}</div></div></div></div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}<button class="full" style="margin-top:24px" onclick="gp.setComplete()" data-i18n="SET COMPLETE">SET COMPLETE</button><div class="row center" style="margin-top:10px">${e.trackingMode===TrackingMode.CARDIO?'':`<button class="ghost small-btn" onclick="gp.skipSet()">${esc(S('Skip set','Izlaist piegājienu'))}</button>`}<button class="ghost small-btn" onclick="gp.skipExercise()">${esc(S('Skip exercise','Izlaist vingrinājumu'))}</button></div>`;
    }
  }else if(rt.phase==='TIMED_SET'||rt.phase==='CARDIO_ENTRY'){const target=Number(set?.targetDurationSeconds||e?.targetSeconds||60),elapsed=capturedDuration(rt,now()),rem=Math.max(0,target-elapsed),bodyweight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e?.equipment),weight=Number(rt.workingWeight??set?.plannedWeightKg??e?.plannedWeightKg??0);c=`<div class="timer-panel focus ${e.trackingMode===TrackingMode.CARDIO?'active-cardio-panel':''}"><div class="timer-label">${esc(sessionDisplayName(e))}${e.trackingMode===TrackingMode.CARDIO?'':' · '+(set?.setNumber||1)+'/'+sets.length}</div><div class="timer ${e.trackingMode===TrackingMode.CARDIO?'live-countup cardio-live-elapsed':'live-timed-set'}" data-start="${rt.phaseStartedAt}" data-target="${target}">${formatDuration((e.trackingMode===TrackingMode.CARDIO?elapsed:rem)*1000)}</div>${e.trackingMode!==TrackingMode.CARDIO&&rem===0?`<div class="small timed-finish-notice" role="status">${esc(S('Target reached. Confirm when finished; the set has not been saved.','Mērķa laiks sasniegts. Apstiprini, kad esi pabeidzis; piegājiens vēl nav saglabāts.'))}</div>`:''}${e.trackingMode===TrackingMode.CARDIO?`<div class="cardio-progress-track" role="progressbar" aria-label="${esc(S('Cardio duration progress','Kardio ilguma progress'))}" aria-valuemin="0" aria-valuemax="100"><div class="cardio-progress-fill" data-start="${rt.phaseStartedAt}" data-target="${target}" style="width:${Math.min(100,elapsed/Math.max(1,target)*100)}%"></div></div><div class="small">${esc(S('Target','Mērķis'))} ${formatDuration(target*1000)}</div>`:''}</div>${bodyweight?'':`<div class="weight-control"><button class="icon-btn" onclick="gp.adjustWeight(-1)">−</button><div class="weight-value" onclick="gp.customWeight()">${formatKgFixed(weight)}</div><button class="icon-btn" onclick="gp.adjustWeight(1)">+</button></div>`}<button class="full" onclick="gp.finishTimedSet()">${esc(e.trackingMode===TrackingMode.CARDIO?S('FINISH CARDIO','PABEIGT KARDIO'):S('DONE','PABEIGTS'))}</button><div class="row center active-secondary-action-row"><button class="ghost small-btn" onclick="gp.skipExercise()">${esc(S('Skip exercise','Izlaist vingrinājumu'))}</button></div>`;}
  else if(rt.phase==='SUPERSET_ENTRY')c=renderSupersetEntry(rt);
  else if(rt.phase==='ENTRY'){const remaining=restRemaining(rt),maxRir=Math.max(3,Math.min(5,state.app_state.rirInputMax||3));c=`${restPanel(remaining,false,false,false)}<div class="section-title" style="text-align:center" data-i18n="Reps">Reps</div><div class="row center"><button class="icon-btn" onclick="gp.adjustEntryReps(-1)">−</button><div class="entry-number">${rt.entry.reps}</div><button class="icon-btn" onclick="gp.adjustEntryReps(1)">+</button></div><div class="rir-heading">RIR · ${esc(S('target','mērķis'))} ${state.app_state.targetRirMin}–${state.app_state.targetRirMax}</div><div id="rir-choice-wrap" class="rir-choice-wrap"><div class="rir-row"><button class="secondary failure-btn ${rt.entry.failure?'active':''}" onclick="gp.setRir('failure')">${esc(S('Failure','Atteice'))}</button>${Array.from({length:maxRir+1},(_,v)=>`<button class="secondary ${!rt.entry.failure&&rt.entry.rir===v?'active':''}" onclick="gp.setRir(${v})">${v===maxRir?`${maxRir}+`:v}</button>`).join('')}</div><div id="rir-required-notice" class="rir-required-note" data-i18n="Choose RIR or Failure before saving.">Choose RIR or Failure before saving.</div></div><button class="full" style="margin-top:20px" onclick="gp.saveSet()" data-i18n="Save set">Save set</button><button class="ghost full" style="margin-top:8px" onclick="gp.cancelSetEntry()">${esc(S('Cancel entry','Atcelt ievadi'))}</button>`;}
  else if(rt.phase==='REST'){c=`<div class="rest-transition-stack">${restPanel(restRemaining(rt),true,ui.restExpand,true,true)}${nextExerciseDecisionCard({duringRest:true})}${renderRestTaskList(sessionExercises(state,s.id),rt)}</div>`;ui.restExpand=false;}
  else if(rt.phase==='UNLOAD')c=phasePanel(S('REMOVE WEIGHTS','NOŅEMT SVARUS'),rt.phaseStartedAt,S('Done','Pabeigts'),'gp.finishUnload(false)','gp.finishUnload(true)',e?sessionDisplayName(e):'',S('Skip today','Izlaist šodien'));
  else if(rt.phase==='STRETCH')c=phasePanel(S('STRETCHING','STIEPŠANĀS'),rt.phaseStartedAt,S('Finish stretching','Pabeigt stiepšanos'),'gp.finishStretch(false)','gp.finishStretch(true)');
  else if(rt.phase==='FINAL')c=`<div class="final-workout"><div class="workout-complete-title">${esc(S('WORKOUT COMPLETE','TRENIŅŠ PABEIGTS'))}</div><textarea id="f-workout-note" data-workout-session="${s.id}" data-workspace="${esc(stateWorkspace)}" aria-label="${esc(S('Optional private log note','Komentārs žurnālam (nav obligāts)'))}" autocapitalize="sentences" maxlength="2000" rows="4" placeholder="${esc(S('Optional private log note','Komentārs žurnālam (nav obligāts)'))}">${esc(getSession(rt.sessionId)?.note||'')}</textarea><button class="full final-save" onclick="gp.finishAndSave()" data-i18n="FINISH &amp; SAVE">FINISH & SAVE</button></div>`;
  // Android exposes its required OS permissions inside the workout, not as
  // a silent failure that only becomes visible after the screen is locked.
  const nativeNeedsSetup=!!globalThis.GymProgressAndroid&&
    (notificationPermissionState()!=='granted'||(state.app_state.soundEnabled!==false&&androidAlarmAccessStatus()!=='ready'));
  const nativeSetup=nativeNeedsSetup?`<div class="card stack native-workout-alerts" role="status"><strong>${esc(S('Android workout alerts need setup','Android treniņa signāliem nepieciešama atļauja'))}</strong><div class="small">${esc(S('Allow notifications for the ongoing workout card and exact alarms for reliable locked-screen sounds. Training continues even if you postpone this.','Atļauj paziņojumus treniņa statusam un precīzos signālus skaņām ar bloķētu ekrānu. Treniņš turpinās arī bez atļaujām.'))}</div><button class="secondary full" onclick="gp.requestBackgroundAlerts()">${esc(S('Enable Android workout alerts','Ieslēgt Android treniņa signālus'))}</button></div>`:'';
  return shell(nativeSetup+c,{topbar:top,navBar:true});
}
function nextExerciseDecisionCard({duringRest=false}={}){
  const rt=runtime(),ctx=currentActiveContext(),action=duringRest?rt?.nextAction:null;
  const target=duringRest&&['SET','EXERCISE','SUPERSET'].includes(action?.type)?ctx.exs[action.exerciseIndex]:ctx.e;
  if(!target){const info=action?displayAction(ctx.exs,action,{forceWorking:true}):'';return `<section class="card next-exercise-card"><div class="small">${esc(S('UP NEXT','TĀLĀK'))}</div><strong>${info||esc(S('Stretching','Stiepšanās'))}</strong></section>`;}
  const sets=exerciseSets(state,target.id);
  const pending=duringRest&&Number.isInteger(action?.setIndex)?sets[action.setIndex]:sets.find(x=>x.status==='PENDING');
  const sameExercise=duringRest&&target.id===ctx.e?.id&&action?.type==='SET';
  const members=supersetPairForExercise(ctx.exs,target)||[target];
  const label=esc(duringRest?(sameExercise?S('NEXT SET','NĀKAMAIS PIEGĀJIENS'):S('NEXT EXERCISE','NĀKAMAIS VINGRINĀJUMS')):S('BEFORE EXERCISE','PIRMS VINGRINĀJUMA'));
  const setPosition=pending?.setNumber??sets.findIndex(x=>x.status==='PENDING')+1;
  const membersDisplay=members.map(member=>{
    const memberSets=exerciseSets(state,member.id);
    const memberSet=memberSets.find(x=>Number(x.setNumber)===Number(setPosition))||memberSets.find(x=>x.status==='PENDING');
    const cardio=member.trackingMode===TrackingMode.CARDIO;
    const prescription=cardio?`${S('Target','Mērķis')} ${formatDuration(Number(memberSet?.targetDurationSeconds||member.targetSeconds||60)*1000)}`:
      `${member.equipment===Equipment.BODYWEIGHT?'':formatKg(memberSet?.plannedWeightKg??member.plannedWeightKg)+' · '}${memberSet?.targetReps||member.targetReps} ${S('reps','atk.')}`;
    return `<div class="next-exercise-member"><strong>${esc(sessionDisplayName(member))}</strong><span class="next-exercise-prescription">${esc(prescription)}</span><span class="small next-set-number">${esc(S('Set','Piegājiens'))} ${Number(memberSet?.setNumber||1)}/${memberSets.length}</span></div>`;
  }).join('');
  return `<section class="card next-exercise-card"><div class="small">${label}</div>${members.length>1?`<div class="small">${esc(S('Superset','Supersets'))}</div>`:''}${membersDisplay}${sameExercise?(canReplaceWholeExercise(sets)?exerciseActionButtons({showLater:false}):''):exerciseActionButtons()}
    ${duringRest?(sameExercise?'':`<p class="small next-exercise-hint">${esc(S('Your rest continues while you choose.','Atpūta turpinās izvēles laikā.'))}</p>`):`<button class="full next-exercise-begin" onclick="gp.beginPreparedExercise()">${esc(S('BEGIN EXERCISE','SĀKT VINGRINĀJUMU'))}</button>`}</section>`;
}
function phasePanel(title,startedAt,primary,onPrimary,onSkip,subtitle='',skipLabel=S('Skip','Izlaist')){return `<div class="timer-panel focus"><div class="timer-label">${esc(title)}</div>${subtitle?`<div class="title" style="margin-top:6px">${esc(subtitle)}</div>`:''}<div class="countup live-countup" data-start="${startedAt}">${formatDuration(syncedElapsed(startedAt))}</div></div><div class="row"><button class="secondary grow" onclick="${onSkip}">${esc(skipLabel)}</button><button class="grow" onclick="${onPrimary}">${esc(primary)}</button></div>`;}
function restRemaining(rt){if(!rt.rest)return 0;return Math.max(0,rt.rest.endsAt-now());}
function restPanel(rem,focus,animate=false,allowSkip=true,hideNext=false){const rt=runtime();if(!rt?.rest)return'';const ends=rt.rest.endsAt;return `<div class="timer-panel ${focus?'focus':''} ${animate?'rest-expand':''}"><div class="timer-label" data-i18n="REST">REST</div><div class="timer live-rest-time" data-ends="${ends}">${formatDuration(rem)}</div>${hideNext?'':renderNextInfo()}<div class="row center"><button class="secondary small-btn" onclick="gp.shiftRest(-30)">−30 s</button>${allowSkip?`<button class="rest-skip-primary small-btn" onclick="gp.skipRest()">${esc(rem<=0?S('Continue','Turpināt'):S('Skip rest','Izlaist atpūtu'))}</button>`:''}<button class="secondary small-btn" onclick="gp.shiftRest(30)">+30 s</button></div></div>`;}
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
function afterActiveRender(){if(state.app_state.keepScreenAwake)requestWakeLock();releaseDeferredWorkoutNotes();}
async function finishWarmup(skipped){const {rt,s,e}=currentActiveContext(),t=now();s.warmupEndedAt=t;s.warmupSkipped=!!skipped;rt.phaseStartedAt=t;await persist();enterExercise(0,true);}
async function enterExercise(index,isFirst=false,wasReviewedDuringRest=false){
  const {rt,exs}=currentActiveContext(),e=exs[index];if(!e){beginStretch();return;}
  rt.currentExerciseIndex=index;
  rt.currentSetIndex=Math.max(0,exerciseSets(state,e.id).findIndex(x=>x.status==='PENDING'));
  rt.workingWeight=exerciseSets(state,e.id)[rt.currentSetIndex]?.plannedWeightKg??e.plannedWeightKg;
  rt.phase='PRE_EXERCISE';rt.phaseStartedAt=now();rt.reminderStartedAt=null;
  rt.entry=null;rt.rest=null;rt.nextAction=null;
  await persist();
  if(wasReviewedDuringRest){rt.autoRampAfterRest=true;await beginPreparedExercise();return;}
  render();
}
async function beginPreparedExercise(){
  const {rt,exs,e,set}=currentActiveContext();if(!rt||rt.phase!=='PRE_EXERCISE'||!e||!set)return;
  const info=supersetPairSetInfo(exs,e,set.setNumber),members=info?.pair||[e];
  const uncalibrated=members.find(m=>m.requiresCalibration);if(uncalibrated){calibrateExercise(uncalibrated.id);return;}
  if(rampMembersNeedPrompt(members)){if(rt.autoRampAfterRest){delete rt.autoRampAfterRest;await startRamp();return;}rt.phase='RAMP_PROMPT';}
  else{const t=now();members.forEach(m=>{if(m.rampEndedAt==null){m.rampSkipped=true;m.rampEndedAt=t;}m.startedAt=m.startedAt||t;m.status='ACTIVE';});rt.phase='SET';rt.reminderStartedAt=t;}
  rt.phaseStartedAt=now();await persist();render();
}
function backToExerciseChoice(){nav('home');}
async function startRamp(){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.startedAt=e.startedAt||t;e.status='ACTIVE';e.rampStartedAt=e.rampStartedAt||t;e.rampSkipped=false;});rt.phase='RAMP_ACTIVE';rt.phaseStartedAt=t;await persist();render();}
async function skipRamp(){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.startedAt=e.startedAt||t;e.status='ACTIVE';e.rampEndedAt=t;e.rampSkipped=true;});rt.phase='SET';rt.phaseStartedAt=t;rt.reminderStartedAt=t;await persist();render();}
function disableRampPermanently(){const members=currentRampMembers();if(!members.length)return;confirmDialog(translateUI('Remove ramp-up?',languageCode(state)),S(`Ramp-up will be removed for this programme occurrence${members.length===2?' pair':''} until you enable it again in Programme settings.`,`Iesildīšanās piegājieni ${members.length===2?'šiem programmas vingrinājumiem':'šim programmas vingrinājumam'} tiks noņemti, līdz tos atkal ieslēgsi Programmas iestatījumos.`),translateUI('Remove',languageCode(state)),async()=>{members.forEach(e=>{const te=state.template_exercises.find(x=>x.id===e.templateExerciseId);if(te)te.rampMode=RampMode.NEVER;e.rampMode=RampMode.NEVER;});closeDialog();await skipRamp();},true);}
async function startTimedSet(){const {rt,e,set}=currentActiveContext();if(!set)return;void enableAudio();const t=now();e.startedAt=e.startedAt||t;e.status='ACTIVE';rt.phase='TIMED_SET';rt.phaseStartedAt=t;rt.reminderStartedAt=null;delete rt.timedTargetReached;delete rt.timedReachedAt;await persist();render();}
async function finishTimedSet(){const {rt,e,set}=currentActiveContext();if(!rt||!set||set.status!=='PENDING')return;if(e.trackingMode===TrackingMode.CARDIO){if(rt.phase!=='TIMED_SET'&&rt.phase!=='CARDIO_ENTRY')return;freezeCardio(rt,now());rt.cardioDraft.durationSeconds=Math.max(1,rt.cardioDraft.durationSeconds);await persist();render();openCardioEntry();return;}if(rt.phase!=='TIMED_SET')return;return completeTimedWorkoutSet(recordedTimedDuration(rt,now(),Number(set.targetDurationSeconds||e.targetSeconds||60)));}
function toggleCardioNA(id){
  const input=document.getElementById(id);if(!input)return;
  const na=!input.disabled;
  if(input.tagName==='INPUT'){input.type=na?'text':'number';}
  input.disabled=na;input.value=input.tagName==='SELECT'?'':na?'-':'';
  if(input.tagName==='SELECT'){const empty=input.querySelector('option[value=""]');if(empty)empty.textContent=na?'–':'';}
  const button=input.nextElementSibling;
  if(button){button.classList.toggle('cardio-na-selected',na);button.setAttribute('aria-pressed',String(na));button.textContent='N/A';}
  input.closest('.cardio-optional-field')?.classList.toggle('is-na',na);
  const error=document.getElementById('cardio-validation-error');if(error)error.textContent='';void updateCardioDraft();
}
async function cancelCardioSet(){const rt=runtime();if(!rt?.cardioDraft)return;resumeCardio(rt,now());closeDialog();await persist();render();}
async function saveCardioSet(){
  const rt=runtime(),duration=Number(rt?.cardioDraft?.durationSeconds||0);if(!(duration>0)||rt.phase!=='CARDIO_ENTRY')return;
  const reading=id=>{const el=document.getElementById(id);return !el||el.disabled?'':el.value.trim();};
  const distText=reading('cardio-distance'),hrText=reading('cardio-hr'),powText=reading('cardio-power'),rpeText=reading('cardio-rpe');
  const distanceKm=distText===''?null:Number(distText),averageHeartRateBpm=hrText===''?null:Number(hrText),averagePowerWatts=powText===''?null:Number(powText),sessionRpe=rpeText===''?null:Number(rpeText);
  const invalid=(id,message,condition)=>{if(!condition)return false;const error=document.getElementById('cardio-validation-error');if(error)error.textContent=message;const input=document.getElementById(id);if(input){input.classList.add('invalid');input.focus();}return true;};
  if(invalid('cardio-distance',S('Distance must be 0 km or more.','Distancei jābūt vismaz 0 km.'),distanceKm!=null&&(!Number.isFinite(distanceKm)||distanceKm<0)))return;
  if(invalid('cardio-hr',S('Average heart rate must be 30–240 bpm.','Vidējam pulsam jābūt 30–240 sit./min.'),averageHeartRateBpm!=null&&(!Number.isInteger(averageHeartRateBpm)||averageHeartRateBpm<30||averageHeartRateBpm>240)))return;
  if(invalid('cardio-power',S('Average power must be 1–2500 W.','Vidējai jaudai jābūt 1–2500 W.'),averagePowerWatts!=null&&(!Number.isInteger(averagePowerWatts)||averagePowerWatts<1||averagePowerWatts>2500)))return;
  if(invalid('cardio-rpe',S('RPE must be selected from 1–10.','RPE jāizvēlas no 1 līdz 10.'),sessionRpe!=null&&(!Number.isInteger(sessionRpe)||sessionRpe<1||sessionRpe>10)))return;
  delete rt.cardioDraft;rt.phase='TIMED_SET';closeDialog();
  return completeTimedWorkoutSet(duration,{distanceKm,averageHeartRateBpm,averagePowerWatts,sessionRpe});
}
async function completeTimedWorkoutSet(elapsed,cardio={},options={}){
 const {rt,exs,e,sets,set}=currentActiveContext();if(!rt||!set||set.status!=='PENDING')return;
 const t=Number.isFinite(options.completedAt)?options.completedAt:now();
 const quiet=options.quiet===true||route.name!=='active'||!!document.querySelector('.dialog-backdrop');
 delete rt.timedTargetReached;delete rt.timedReachedAt;
 Object.assign(set,cardio);set.actualDurationSeconds=elapsed;set.actualReps=0;
 set.actualWeightKg=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e.equipment)?0:Math.max(0,Number(rt.workingWeight??set.plannedWeightKg??e.plannedWeightKg??0));
 set.rir=null;set.failure=false;set.status='COMPLETE';set.completedAt=t;
 const pending=sets.findIndex(x=>x.status==='PENDING'),done=pending<0;
 if(done){e.endedAt=t;e.status='COMPLETE';e.progressionOffered=false;}
 rt.nextAction=done?nextActionAfterExercise(exs,e):{type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:pending};
 const seconds=Math.max(0,Number(set.plannedRestSeconds)||0);
 rt.rest={setId:set.id,startedAt:t,endsAt:t+seconds*1000,plannedSeconds:seconds,warned30:false,count3:false,count2:false,count1:false,beeped0:options.completionBeep===true&&seconds===0};
 rt.phase='REST';rt.phaseStartedAt=t;
 if(done)startUnloadFlow([e],rt.nextAction,{setIds:[set.id],restSeconds:seconds});
 if(quiet&&done)rt.deferredExerciseNoteIds=[...new Set([...(rt.deferredExerciseNoteIds||[]),e.id])];
 await persist();
 if(quiet)return;
 await settleRestOrRender();if(done)queuePostSetPrompts([{type:'note',e}]);
}
function releaseDeferredWorkoutNotes(){
 const rt=runtime();if(!rt||route.name!=='active'||document.querySelector('.dialog-backdrop'))return;
 const ids=rt.deferredExerciseNoteIds||[];
 if(ids.length){
  delete rt.deferredExerciseNoteIds;
  const notes=ids.map(id=>getSessionExercise(id)).filter(e=>e?.sessionId===rt.sessionId).map(e=>({type:'note',e}));
  queuePostSetPrompts(notes);void persist().catch(reportAppError);
 }
 continuePostSetQueue();
}
async function finishRamp(skipped=false){const {rt}=currentActiveContext(),members=currentRampMembers(),t=now();members.forEach(e=>{e.rampStartedAt=e.rampStartedAt||t;e.rampEndedAt=t;e.rampSkipped=!!skipped;e.startedAt=e.startedAt||t;e.status='ACTIVE';});const restSeconds=Math.max(0,...members.map(e=>Number(rampMemberPlan(e).at(-1)?.restSeconds??e.plannedRestSeconds??0)));rt.nextAction={type:'SET',exerciseIndex:rt.currentExerciseIndex,setIndex:rt.currentSetIndex};rt.rest={setId:null,startedAt:t,endsAt:t+restSeconds*1000,plannedSeconds:restSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='REST';rt.phaseStartedAt=t;await persist();await settleRestOrRender();}
async function adjustWeight(direction){const {rt,e}=currentActiveContext();rt.workingWeight=stepSelectable(Number(rt.workingWeight)||0,Number(direction),e?.equipment||Equipment.OTHER);await persist();render();}
function workoutWeightInput(value){const n=recommendationWeight(value);return n==null?'':String(n).replace('.',languageCode(state)==='lv'?',':'.');}
function customWeight(){
 const rt=runtime();if(!rt)return;
 formDialog(S('Working weight','Darba svars'),`<label class="field" for="f-weight-custom">kg</label><input id="f-weight-custom" type="text" inputmode="decimal" value="${esc(workoutWeightInput(rt.workingWeight??0))}">`,S('Set','Iestatīt'),async()=>{
  const {e}=currentActiveContext(),weight=recommendationWeight($('#f-weight-custom')?.value);
  if(weight==null){toast(S('Enter a weight of 0 kg or more.','Ievadi svaru 0 kg vai vairāk.'));return;}
  rt.workingWeight=[Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e?.equipment)?0:weight;await persist();closeDialog();render();
 });
}
async function adjustSupersetWeight(exerciseId,direction){const rt=runtime(),e=getSessionExercise(Number(exerciseId));if(!rt||!e)return;rt.supersetWeights=rt.supersetWeights||{};const current=Number(rt.supersetWeights[e.id]??exerciseSets(state,e.id).find(x=>x.status==='PENDING')?.plannedWeightKg??e.plannedWeightKg??0);rt.supersetWeights[e.id]=stepSelectable(current,Number(direction),e.equipment||Equipment.OTHER);await persist();render();}
function customSupersetWeight(exerciseId){
 const rt=runtime(),e=getSessionExercise(Number(exerciseId));if(!rt||!e)return;
 rt.supersetWeights=rt.supersetWeights||{};
 const current=Number(rt.supersetWeights[e.id]??exerciseSets(state,e.id).find(x=>x.status==='PENDING')?.plannedWeightKg??e.plannedWeightKg??0);
 formDialog(S('Working weight','Darba svars'),`<label class="field" for="f-super-weight">kg</label><input id="f-super-weight" type="text" inputmode="decimal" value="${esc(workoutWeightInput(current))}">`,S('Set','Iestatīt'),async()=>{
  const weight=recommendationWeight($('#f-super-weight')?.value);if(weight==null){toast(S('Enter a weight of 0 kg or more.','Ievadi svaru 0 kg vai vairāk.'));return;}
  rt.supersetWeights[e.id]=e.equipment===Equipment.BODYWEIGHT?0:weight;await persist();closeDialog();render();
 });
}
async function toggleSupersetTimed(exerciseId){const ctx=supersetSetContext(),rt=ctx?.rt,e=getSessionExercise(Number(exerciseId));if(!ctx||!e||![TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(e.trackingMode))return;await enableAudio();rt.supersetTimed=rt.supersetTimed||{};const st=rt.supersetTimed[e.id];if(st?.durationSeconds!=null){rt.supersetTimed[e.id]={startedAt:now(),durationSeconds:null};}else if(st?.startedAt){rt.supersetTimed[e.id]={startedAt:null,durationSeconds:Math.max(1,Math.round((now()-Number(st.startedAt))/1000))};beepPattern('ready');}else rt.supersetTimed[e.id]={startedAt:now(),durationSeconds:null};await persist();render();}
async function supersetComplete(){const ctx=supersetSetContext();if(!ctx)return;void enableAudio();const rt=ctx.rt,t=now();rt.supersetWeights=rt.supersetWeights||{};const timedMissing=ctx.items.filter(item=>[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode)&&supersetTimedState(rt,item.e.id)?.durationSeconds==null);if(timedMissing.length){toast(S('Finish each timed component first.','Vispirms pabeidz katru laika komponenti.'));return;}rt.supersetEntry=ctx.items.map(item=>{const timed=[TrackingMode.TIME_ONLY,TrackingMode.CARDIO].includes(item.e.trackingMode);return{exerciseId:item.e.id,setId:item.set.id,timed,reps:timed?0:item.set.targetReps,durationSeconds:timed?Number(supersetTimedState(rt,item.e.id)?.durationSeconds||0):null,rir:null,failure:false,weight:supersetDisplayWeight(rt,item)};});const restSeconds=Math.max(...ctx.items.map(x=>Number(x.set.plannedRestSeconds)||0),0);rt.rest={setId:ctx.items.at(-1).set.id,setIds:ctx.items.map(x=>x.set.id),startedAt:t,endsAt:t+restSeconds*1000,plannedSeconds:restSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='SUPERSET_ENTRY';rt.phaseStartedAt=t;rt.reminderStartedAt=t;await persist();render();}
async function adjustSupersetEntryReps(index,d){const rt=runtime(),entry=rt?.supersetEntry?.[Number(index)];if(!entry)return;entry.reps=Math.max(0,Number(entry.reps||0)+Number(d));await persist();render();}
async function setSupersetRir(index,v){const rt=runtime(),entry=rt?.supersetEntry?.[Number(index)];if(!entry)return;if(v==='failure'){entry.failure=true;entry.rir=null;}else{entry.failure=false;entry.rir=Number(v);}await persist();render();}
function nextActionAfterSuperset(exs,pair,setNumber){const items=pair.map(e=>({e,sets:exerciseSets(state,e.id)})),pending=items.map(x=>x.sets.find(s=>s.status==='PENDING')).filter(Boolean);if(pending.length===2&&pending[0].setNumber===pending[1].setNumber){const lead=items[0],idx=exs.findIndex(x=>x.id===lead.e.id),si=lead.sets.findIndex(x=>x.id===pending[0].id);return{type:'SUPERSET',exerciseIndex:idx,setIndex:si};}if(pending.length){const p=pending[0],ex=getSessionExercise(p.sessionExerciseId),idx=exs.findIndex(x=>x.id===ex.id),si=exerciseSets(state,ex.id).findIndex(x=>x.id===p.id);return{type:'SET',exerciseIndex:idx,setIndex:si};}const last=pair.slice().sort((a,b)=>a.position-b.position).at(-1),i=exs.findIndex(x=>x.id===last.id);return nextPendingExerciseAction(exs,i+1);}
function showExerciseNotePrompt(e){
 if(!e){continuePostSetQueue();return;}
 window.__gpExerciseNote=e;
 const label=S('Comment for Logs (optional)','Komentārs žurnālam (nav obligāts)');
 openDialog(`<h2 data-user-content>${esc(sessionDisplayName(e))}</h2><textarea id="f-exercise-note" aria-label="${esc(label)}" autocapitalize="sentences" maxlength="500" rows="4" placeholder="${esc(label)}">${esc(e.note||'')}</textarea><div class="dialog-actions"><button class="secondary" onclick="gp.skipExerciseNote()">${esc(S('Skip','Izlaist'))}</button><button onclick="gp.saveExerciseNote()">${esc(S('Save','Saglabāt'))}</button></div>`);
}
async function saveExerciseNote(){const e=window.__gpExerciseNote;if(e){e.note=String($('#f-exercise-note')?.value||'').trim().slice(0,500);await persist();}window.__gpExerciseNote=null;closeDialog();render();continuePostSetQueue();}
function skipExerciseNote(){window.__gpExerciseNote=null;closeDialog();continuePostSetQueue();}
function queuePostSetPrompts(items){if(!items?.length)return;window.__gpPostSetQueue=[...(window.__gpPostSetQueue||[]),...items];setTimeout(showNextPostSetPrompt,80);}
function showNextPostSetPrompt(){if(route.name!=='active'||document.querySelector('.dialog-backdrop')||window.__gpAdvice||window.__gpProgressionExercise||window.__gpFutureAdjustment)return;const q=window.__gpPostSetQueue||[],item=q.shift();window.__gpPostSetQueue=q;if(!item)return;if(item.type==='note')showExerciseNotePrompt(item.e);else if(item.type==='autoreg')showAutoregulationAdvice(item.advice);else if(item.type==='future')showFutureAdjustment(item.e,item.advice);else if(item.type==='rep')offerRepProgression(item.e,item.nextReps);else if(item.type==='progress')offerProgression(item.e,item.base,item.nextWeight,item.minRir);}
function continuePostSetQueue(){if((window.__gpPostSetQueue||[]).length)setTimeout(showNextPostSetPrompt,60);}
async function saveSupersetSet(){const rt=runtime(),ctx=supersetSetContext(),entries=rt?.supersetEntry||[];if(!ctx||entries.length!==2)return;if(entries.some(x=>!x.timed&&!x.failure&&x.rir==null)){const note=$('#superset-rir-required');note?.classList.add('show');setTimeout(()=>note?.classList.remove('show'),INFO_MESSAGE_MS);return;}const t=now(),prompts=[],notes=[];for(const entry of entries){const e=getSessionExercise(entry.exerciseId),sets=exerciseSets(state,e.id),set=getSet(entry.setId);if(!e||!set)continue;set.actualWeightKg=e.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number(entry.weight)||0);set.status='COMPLETE';set.completedAt=t;e.startedAt=e.startedAt||t;e.status='ACTIVE';if(entry.timed){set.actualDurationSeconds=Math.max(1,Number(entry.durationSeconds)||1);set.actualReps=0;set.rir=null;set.failure=false;e.progressionOffered=false;}else{set.actualDurationSeconds=null;set.actualReps=entry.reps;set.rir=entry.failure?null:entry.rir;set.failure=!!entry.failure;const raw=evaluateAutoregulation(set,sets,performanceSettingsFor(state,e),e,performanceRulesFor(state,e));if(raw)prompts.push({type:'autoreg',advice:raw});}const done=sets.every(x=>x.status!=='PENDING');if(done){notes.push({type:'note',e});e.endedAt=t;e.status='COMPLETE';if(entry.timed)e.progressionOffered=false;else{e.progressionOffered=progressionQualifies(e,sets);if(e.progressionOffered){if(e.equipment===Equipment.BODYWEIGHT)prompts.push({type:'rep',e,nextReps:e.targetReps+1});else{const base=Math.min(...sets.filter(x=>x.status==='COMPLETE').map(x=>Number(x.actualWeightKg)||0)),minRir=progressionMinRir(sets);prompts.push({type:'progress',e,base,minRir,nextWeight:suggestedNextWeight(base,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minRir,state.app_state.targetRirMax)});}}else{const future=evaluateFutureAdjustment(e,sets,performanceSettingsFor(state,e),performanceRulesFor(state,e));if(future)prompts.push({type:'future',e,advice:future});}}}}
  rt.nextAction=nextActionAfterSuperset(ctx.exs,ctx.pair,ctx.set.setNumber);rt.supersetEntry=null;rt.supersetTimed={};rt.phase='REST';rt.phaseStartedAt=t;ui.restExpand=true;startUnloadFlow(ctx.pair,rt.nextAction,{setIds:ctx.items.map(item=>item.set.id),restSeconds:rt.rest?.plannedSeconds??Math.max(...ctx.items.map(item=>Number(item.set.plannedRestSeconds)||0))});await persist();render();queuePostSetPrompts([...notes,...prompts]);
}
async function skipSupersetSet(){const ctx=supersetSetContext();if(!ctx)return;const t=now();ctx.items.forEach(x=>{x.set.status='SKIPPED';x.set.completedAt=t;});ctx.items.forEach(x=>{if(x.sets.every(s=>s.status!=='PENDING')){x.e.status='COMPLETE';x.e.endedAt=t;}});ctx.rt.nextAction=nextActionAfterSuperset(ctx.exs,ctx.pair,ctx.set.setNumber);ctx.rt.rest=null;ctx.rt.supersetEntry=null;ctx.rt.supersetTimed={};await persist();await afterRest();toast(translateUI('Superset set skipped',languageCode(state)));}
function skipSuperset(){const ctx=supersetSetContext();if(!ctx)return;const names=ctx.pair.map(sessionDisplayName).join(' + ');confirmDialog(S('Skip superset?','Izlaist supersetu?'),S(`All remaining sets for ${names} will be marked skipped.`,`Visi atlikušie piegājieni (${names}) tiks atzīmēti kā izlaisti.`),translateUI('Skip superset',languageCode(state)),async()=>{closeDialog();const t=now();for(const e of ctx.pair){exerciseSets(state,e.id).filter(x=>x.status==='PENDING').forEach(x=>{x.status='SKIPPED';x.completedAt=t;});e.status='SKIPPED';e.endedAt=t;}const last=ctx.pair.at(-1),i=ctx.exs.findIndex(x=>x.id===last.id);ctx.rt.nextAction=nextPendingExerciseAction(ctx.exs,i+1);ctx.rt.rest=null;ctx.rt.supersetEntry=null;ctx.rt.supersetTimed={};await persist();await afterRest();queuePostSetPrompts(ctx.pair.map(e=>({type:'note',e})));toast(translateUI('Superset skipped',languageCode(state)));},true);}
async function setComplete(){const {rt,set}=currentActiveContext();if(!rt||rt.phase!=='SET'||!set||set.status!=='PENDING')return;void enableAudio();const t=now();rt.entry={setId:set.id,reps:set.targetReps,rir:null,failure:false,weight:Number(rt.workingWeight??set.plannedWeightKg??0),completedPressedAt:t};rt.rest={setId:set.id,startedAt:t,endsAt:t+set.plannedRestSeconds*1000,plannedSeconds:set.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='ENTRY';rt.phaseStartedAt=t;rt.reminderStartedAt=t;render();try{await persist();}catch(error){console.error('Could not persist set-complete entry',error);toast(translateUI('Could not save set; please retry',languageCode(state)));}}
async function adjustEntryReps(d){const rt=runtime();rt.entry.reps=Math.max(0,Number(rt.entry.reps||0)+d);await persist();render();}
async function setRir(v){const rt=runtime();if(v==='failure'){rt.entry.failure=true;rt.entry.rir=null;}else{rt.entry.failure=false;rt.entry.rir=Number(v);}await persist();render();}
function progressionQualifies(e,sets){const done=sets.filter(s=>s.status==='COMPLETE');return done.length===Number(e.targetSets)&&!sets.some(s=>s.status==='SKIPPED')&&done.every(s=>progressionSetQualifies(e,s,performanceSettingsFor(state,e),performanceRulesFor(state,e)));}
function progressionMinRir(sets){const done=sets.filter(s=>s.status==='COMPLETE'&&!s.failure&&s.rir!=null);if(!done.length)return null;return Math.min(...done.map(s=>Number(s.rir)));}
async function saveSet(){
  const {rt,s,exs,e,sets,set}=currentActiveContext();const entry=rt.entry;if(!entry||set.id!==entry.setId)return;if(!entry.failure&&entry.rir==null){const wrap=$('#rir-choice-wrap'),notice=$('#rir-required-notice');if(wrap){wrap.classList.remove('rir-invalid');void wrap.offsetWidth;wrap.classList.add('rir-invalid');}if(notice)notice.classList.add('show');setTimeout(()=>{wrap?.classList.remove('rir-invalid');notice?.classList.remove('show');},INFO_MESSAGE_MS);return;}const t=now(),prompts=[];set.actualReps=entry.reps;set.rir=entry.failure?null:entry.rir;set.failure=!!entry.failure;set.actualWeightKg=e?.equipment===Equipment.BODYWEIGHT?0:Math.max(0,Number(entry.weight)||0);set.status='COMPLETE';set.completedAt=t;
  const rawAdvice=evaluateAutoregulation(set,sets,performanceSettingsFor(state,e),e,performanceRulesFor(state,e));let advice=rawAdvice;if(advice)prompts.push({type:'autoreg',advice});
  rt.entry=null;const pendingSame=sets.findIndex(x=>x.status==='PENDING');const exerciseDone=pendingSame<0;
  let futureAdvice=null;
  if(exerciseDone){prompts.unshift({type:'note',e});e.endedAt=t;e.status='COMPLETE';e.progressionOffered=progressionQualifies(e,sets);if(e.progressionOffered){if(e.equipment===Equipment.BODYWEIGHT)prompts.push({type:'rep',e,nextReps:e.targetReps+1});else{const base=Math.min(...sets.filter(x=>x.status==='COMPLETE').map(x=>Number(x.actualWeightKg)||0)),minRir=progressionMinRir(sets);prompts.push({type:'progress',e,base,minRir,nextWeight:suggestedNextWeight(base,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minRir,state.app_state.targetRirMax)});}}else{futureAdvice=evaluateFutureAdjustment(e,sets,performanceSettingsFor(state,e),performanceRulesFor(state,e));if(futureAdvice)prompts.push({type:'future',e,advice:futureAdvice});}}
  if(exerciseDone&&startUnloadFlow([e],nextActionAfterExercise(exs,e),{setIds:[set.id],restSeconds:set.plannedRestSeconds})){}
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
  window.__gpFutureAdjustment={exerciseId:e.id,advice,guard:captureRecommendationTarget(state,e.id,{contextVersion:localGeneration})};
  if(advice.kind==='REDUCE_REPS'){
    openDialog(`<h2 data-i18n="Make next time a little easier?">Make next time a little easier?</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="dialog-copy muted">${esc(translateUI(advice.reason,languageCode(state)))}</div><div class="advice-next"><span data-i18n="Suggested next target">Suggested next target</span><strong>${esc(`${advice.suggestedReps} ${S('reps','atk.')}`)}</strong></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepFutureAdjustmentCurrent()" data-i18n="Keep current">Keep current</button><button onclick="gp.applyFutureAdjustment()" data-i18n="Use next time">Use next time</button></div>`);
    return;
  }
  const equipment=e.equipment||Equipment.OTHER,step=gradingIncrement(equipment),each=e.equipment===Equipment.DUMBBELL&&e.dumbbellLoad===DumbbellLoad.PAIR;
  const value=workoutWeightInput(advice.suggestedWeightKg);
  openDialog(`<h2 data-i18n="Make next time a little easier?">Make next time a little easier?</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="dialog-copy muted">${esc(translateUI(advice.reason,languageCode(state)))}</div><div class="progression-edit future-adjustment-edit"><button class="icon-btn" onclick="gp.shiftFutureAdjustment(-1)">−</button><label><span class="field">${esc(each?S('Next working weight per dumbbell','Nākamais darba svars vienai hantelei'):S('Next working weight','Nākamais darba svars'))}</span><input id="f-future-weight" type="text" inputmode="decimal" value="${value}"></label><button class="icon-btn" onclick="gp.shiftFutureAdjustment(1)">+</button></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepFutureAdjustmentCurrent()" data-i18n="Keep current">Keep current</button><button onclick="gp.applyFutureAdjustment()" data-i18n="Use next time">Use next time</button></div>`);
}
function shiftFutureAdjustment(direction){const item=window.__gpFutureAdjustment,input=$('#f-future-weight');if(!item||!input)return;const e=getSessionExercise(item.exerciseId),weight=recommendationWeight(input.value);if(!e||weight==null)return;input.value=workoutWeightInput(stepSelectable(weight,Number(direction),e.equipment||Equipment.OTHER));}
async function applyFutureAdjustment(){
  const item=window.__gpFutureAdjustment;if(!item)return;
  const target=currentRecommendationTarget(state,item.guard,{contextVersion:localGeneration,requireTemplate:true}),e=target?.exercise,te=target?.template;
  if(!e||!te){alertDialog(S('Programme unavailable','Programma nav pieejama'),S('The programme exercise changed. Review it before applying this suggestion.','Programmas vingrinājums ir mainījies. Pārbaudi to pirms ieteikuma piemērošanas.'));return;}
  if(item.advice.kind==='REDUCE_REPS'){
    const reps=recommendationReps(item.advice.suggestedReps);if(reps==null)return;
    te.reps=reps;e.nextReps=reps;
  }else{
    const edited=recommendationWeight($('#f-future-weight')?.value??item.advice.suggestedWeightKg);
    if(edited==null){toast(S('Enter a weight of 0 kg or more.','Ievadi svaru 0 kg vai vairāk.'));$('#f-future-weight')?.focus();return;}
    te.initialWeightKg=te.equipment===Equipment.BODYWEIGHT?0:edited;e.nextWeightKg=te.initialWeightKg;
  }
  e.futureAdjustmentOffered=true;e.futureAdjustmentAccepted=true;
  await persist();window.__gpFutureAdjustment=null;closeDialog();render();continuePostSetQueue();
}
async function keepFutureAdjustmentCurrent(){const item=window.__gpFutureAdjustment,target=currentRecommendationTarget(state,item?.guard,{contextVersion:localGeneration});if(target){target.exercise.futureAdjustmentOffered=true;target.exercise.futureAdjustmentAccepted=false;await persist();}window.__gpFutureAdjustment=null;closeDialog();if(target)continuePostSetQueue();}
function offerProgression(e,baseWeight,nextWeight,minCompletedRir=null){
  const guard=captureRecommendationTarget(state,e.id,{contextVersion:localGeneration});
  setTimeout(()=>{if(!currentRecommendationTarget(state,guard,{contextVersion:localGeneration,requireTemplate:true}))return;window.__gpProgressionGuard=guard;const suggestedStep=progressionIncrement(baseWeight,e.equipment||Equipment.OTHER,e.exerciseKey,e.exerciseType,minCompletedRir,state.app_state.targetRirMax),each=e.equipment===Equipment.DUMBBELL&&e.dumbbellLoad===DumbbellLoad.PAIR;window.__gpProgressionExercise=e;window.__gpProgressionBaseWeight=baseWeight;openDialog(`<h2 data-i18n="Ready to progress">Ready to progress</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="muted" data-i18n="All required sets reached target reps with enough RIR and no failures.">All required sets reached target reps with enough RIR and no failures.</div><div class="progression-edit"><button class="icon-btn" onclick="gp.shiftProgression(-1)">−</button><label><span class="field">${esc(each?S('Next working weight per dumbbell','Nākamais darba svars vienai hantelei'):S('Next working weight','Nākamais darba svars'))}</span><input id="f-progression-weight" type="text" inputmode="decimal" value="${esc(workoutWeightInput(nextWeight))}"></label><button class="icon-btn" onclick="gp.shiftProgression(1)">+</button></div><div class="small">${esc(S('Suggested increase:','Ieteiktais palielinājums:'))} ${formatKg(suggestedStep)}${each?esc(S(' per dumbbell',' vienai hantelei')):''}. ${esc(S('The −/+ buttons use the smallest selectable equipment step.','Pogas −/+ izmanto mazāko šim aprīkojumam pieejamo svara soli.'))}</div><div class="dialog-actions"><button class="secondary" onclick="gp.keepProgressionCurrent()" data-i18n="Keep current">Keep current</button><button onclick="gp.acceptProgressionEdited()" data-i18n="Use next time">Use next time</button></div>`);},20);
}
function shiftProgression(direction){const e=window.__gpProgressionExercise,input=$('#f-progression-weight');if(!e||!input)return;const weight=recommendationWeight(input.value);if(weight==null)return;input.value=workoutWeightInput(stepSelectable(weight,Number(direction),e.equipment||Equipment.OTHER));}
async function acceptProgressionEdited(){
  const target=currentRecommendationTarget(state,window.__gpProgressionGuard,{contextVersion:localGeneration,requireTemplate:true});
  if(!target){window.__gpProgressionExercise=null;window.__gpProgressionGuard=null;alertDialog(S('Suggestion changed','Ieteikums ir mainījies'),S('The programme exercise changed. Review it before applying this suggestion.','Programmas vingrinājums ir mainījies. Pārbaudi to pirms ieteikuma piemērošanas.'));return;}
  const next=recommendationWeight($('#f-progression-weight')?.value);
  if(next==null){toast(S('Enter a weight of 0 kg or more.','Ievadi svaru 0 kg vai vairāk.'));$('#f-progression-weight')?.focus();return;}
  const e=target.exercise;e.progressionAccepted=true;e.recommendation='PROGRESS';e.recommendationDecision='ACCEPTED';e.nextWeightKg=e.equipment===Equipment.BODYWEIGHT?0:next;target.template.initialWeightKg=e.nextWeightKg;
  window.__gpProgressionExercise=null;window.__gpProgressionBaseWeight=null;window.__gpProgressionGuard=null;await persist();closeDialog();render();continuePostSetQueue();
}
function offerRepProgression(e,nextReps){const guard=captureRecommendationTarget(state,e.id,{contextVersion:localGeneration});setTimeout(()=>{if(!currentRecommendationTarget(state,guard,{contextVersion:localGeneration,requireTemplate:true}))return;window.__gpProgressionGuard=guard;window.__gpProgressionExercise=e;openDialog(`<h2 data-i18n="Ready to progress">Ready to progress</h2><div class="small suggestion-exercise">${esc(sessionDisplayName(e))}</div><div class="muted" data-i18n="Bodyweight progression increases the rep target rather than adding kilograms.">Bodyweight progression increases the rep target rather than adding kilograms.</div><div class="progression-edit rep-progression"><button class="icon-btn" onclick="gp.shiftProgressionReps(-1)">−</button><label><span class="field" data-i18n="Next target reps">Next target reps</span><input id="f-progression-reps" type="number" min="1" step="1" value="${Math.max(1,Number(nextReps)||1)}"></label><button class="icon-btn" onclick="gp.shiftProgressionReps(1)">+</button></div><div class="dialog-actions"><button class="secondary" onclick="gp.keepProgressionCurrent()" data-i18n="Keep current">Keep current</button><button onclick="gp.acceptProgressionReps()" data-i18n="Use next time">Use next time</button></div>`);},20);}
function shiftProgressionReps(direction){const input=$('#f-progression-reps');if(input)input.value=Math.max(1,(Number(input.value)||1)+Number(direction));}
async function acceptProgressionReps(){
  const target=currentRecommendationTarget(state,window.__gpProgressionGuard,{contextVersion:localGeneration,requireTemplate:true}),reps=recommendationReps($('#f-progression-reps')?.value);
  if(!target){window.__gpProgressionExercise=null;window.__gpProgressionGuard=null;alertDialog(S('Suggestion changed','Ieteikums ir mainījies'),S('The programme exercise changed. Review it before applying this suggestion.','Programmas vingrinājums ir mainījies. Pārbaudi to pirms ieteikuma piemērošanas.'));return;}
  if(reps==null){toast(S('Enter a whole number of repetitions above zero.','Ievadi veselu atkārtojumu skaitu, kas lielāks par nulli.'));$('#f-progression-reps')?.focus();return;}
  const e=target.exercise;e.progressionAccepted=true;e.recommendation='PROGRESS';e.recommendationDecision='ACCEPTED';e.nextReps=reps;target.template.reps=reps;window.__gpProgressionExercise=null;window.__gpProgressionGuard=null;await persist();closeDialog();render();continuePostSetQueue();
}
async function keepProgressionCurrent(){const target=currentRecommendationTarget(state,window.__gpProgressionGuard,{contextVersion:localGeneration});if(target){const e=target.exercise;e.progressionAccepted=false;e.recommendation='PROGRESS';e.recommendationDecision='DECLINED';e.nextWeightKg=null;e.nextReps=null;await persist();}window.__gpProgressionExercise=null;window.__gpProgressionBaseWeight=null;window.__gpProgressionGuard=null;closeDialog();render();if(target)continuePostSetQueue();}
function startUnloadFlow(members,nextAction,{setIds=[],restSeconds=0}={}){
 const rt=runtime();if(!rt)return false;
 const pending=members.filter(e=>e&&e.removeWeights&&![Equipment.BODYWEIGHT,Equipment.CARDIO].includes(e.equipment)&&!e.unloadEndedAt&&!e.unloadSkipped&&exerciseSets(state,e.id).every(set=>set.status!=='PENDING'));
 if(!pending.length)return false;
 rt.unloadQueue=pending.slice(1).map(e=>e.id);
 rt.unloadContinuation={nextAction,setIds:[...setIds],restSeconds:Math.max(0,Number(restSeconds)||0)};
 rt.rest=null;rt.entry=null;rt.nextAction=nextAction;
 enterUnloadExercise(pending[0]);return true;
}
function enterUnloadExercise(e){
 const rt=runtime(),exs=sessionExercises(state,rt.sessionId),t=now();
 rt.currentExerciseIndex=exs.findIndex(item=>item.id===e.id);
 rt.currentSetIndex=Math.max(0,exerciseSets(state,e.id).length-1);
 rt.phase='UNLOAD';rt.phaseStartedAt=t;rt.reminderStartedAt=null;
 e.unloadStartedAt=t;e.unloadEndedAt=null;e.unloadSkipped=false;
}
async function finishUnload(skipped){
 const {rt,e}=currentActiveContext();if(!rt||rt.phase!=='UNLOAD'||!e)return;
 const t=now();e.unloadEndedAt=t;e.unloadSkipped=!!skipped;
 const nextId=rt.unloadQueue?.shift(),next=nextId!=null?getSessionExercise(nextId):null;
 if(next){enterUnloadExercise(next);await persist();render();return;}
 const saved=rt.unloadContinuation,action=saved?.nextAction??rt.nextAction;
 const seconds=Math.max(0,Number(saved?.restSeconds??e.plannedRestSeconds)||0),setIds=saved?.setIds||[rt.deferredRestSetId].filter(Boolean);
 rt.rest={setId:setIds.at(-1)??null,setIds,startedAt:t,endsAt:t+seconds*1000,plannedSeconds:seconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};
 delete rt.unloadQueue;delete rt.unloadContinuation;delete rt.deferredRestSetId;delete rt.futureAdjustmentAdvice;delete rt.futureAdjustmentExerciseId;
 rt.phase='REST';rt.phaseStartedAt=t;rt.nextAction=action;
 await persist();await settleRestOrRender();continuePostSetQueue();
}
async function shiftRest(seconds){const rt=runtime();if(!rt.rest)return;rt.rest.endsAt=Math.max(now(),rt.rest.endsAt+seconds*1000);rt.rest.plannedSeconds=Math.max(0,(rt.rest.endsAt-rt.rest.startedAt)/1000);rt.rest.warned30=false;rt.rest.readyForNext=rt.rest.endsAt<=now();await persist();render();}
async function skipRest(){const rt=runtime();if(!rt?.rest)return;if(rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY'){finalizeRest();await persist();render();return;}finalizeRest();await afterRest();}
function finalizeRest(){const rt=runtime();if(!rt?.rest)return;const seconds=Math.max(0,Math.round((now()-rt.rest.startedAt)/1000)),ids=Array.isArray(rt.rest.setIds)?rt.rest.setIds:[rt.rest.setId];ids.filter(Boolean).forEach(id=>{const set=getSet(id);if(set)set.actualRestSeconds=seconds;});rt.rest=null;}
async function settleRestOrRender(){const rt=runtime();if(!rt)return;if(rt.phase==='REST'){if(!rt.rest){const t=now();rt.rest={setId:null,setIds:[],startedAt:t,endsAt:t,plannedSeconds:0,readyForNext:true};await persist();}else if(markRestReady(rt,now()))await persist();}render();}
async function afterRest(){const rt=runtime(),action=rt.nextAction;rt.nextAction=null;if(!action){beginStretch();return;}if(action.type==='SET'){if(Number.isInteger(action.exerciseIndex))rt.currentExerciseIndex=action.exerciseIndex;rt.currentSetIndex=action.setIndex;const {e,set}=currentActiveContext();const prev=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE').sort((a,b)=>b.setNumber-a.setNumber)[0];rt.workingWeight=set?.autoregulated?set.plannedWeightKg:(prev?.actualWeightKg??set?.plannedWeightKg??e.plannedWeightKg);rt.phase=hasPendingRamp(e)?'RAMP_PROMPT':'SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();if(rt.phase==='RAMP_PROMPT'){await startRamp();return;}await persist();render();return;}if(action.type==='SUPERSET'){rt.currentExerciseIndex=action.exerciseIndex;rt.currentSetIndex=action.setIndex;const {e,set}=currentActiveContext();e.startedAt=e.startedAt||now();e.status='ACTIVE';rt.workingWeight=set?.plannedWeightKg??e.plannedWeightKg;rt.supersetEntry=null;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();await persist();render();return;}if(action.type==='EXERCISE'){await enterExercise(action.exerciseIndex,false,true);return;}beginStretch();}
async function skipSet(){const {rt,exs,e,sets,set}=currentActiveContext();if(!set)return;const skippedNo=set.setNumber,total=sets.length;set.status='SKIPPED';set.completedAt=now();const next=sets.findIndex(x=>x.status==='PENDING');if(next>=0){rt.currentSetIndex=next;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();ui.setStatusMessage=`${skippedNo}/${total} ${S('SKIPPED','IZLAISTS')}`;await persist();render();setTimeout(()=>{if(ui.setStatusMessage){ui.setStatusMessage=null;render();}},INFO_MESSAGE_MS);return;}e.status='COMPLETE';e.endedAt=now();const action=nextActionAfterExercise(exs,e);if(e.removeWeights){e.unloadStartedAt=now();rt.phase='UNLOAD';rt.phaseStartedAt=now();rt.nextAction=action;}else{rt.nextAction=action;rt.rest={setId:null,startedAt:now(),endsAt:now()+e.plannedRestSeconds*1000,plannedSeconds:e.plannedRestSeconds,warned30:false,count3:false,count2:false,count1:false,beeped0:false};rt.phase='REST';}await persist();ui.setStatusMessage=null;render();}
function nextPostponableExercise(){const {exs,e}=currentActiveContext();if(!e||e.supersetGroupId)return null;const i=exs.findIndex(x=>x.id===e.id);return exs.slice(i+1).find(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'))||null;}
// SQL-backed relationships are cached locally for offline use; only the current session is altered.
// True equivalents rank above close alternatives even when the latter have weight history.
// On first offline use, the bundled relationship catalogue is the fallback.
function replacementExerciseTarget(){
  const rt=runtime();if(!rt)return null;
  const ctx=currentActiveContext();
  if(rt.phase==='REST'&&['EXERCISE','SUPERSET'].includes(rt.nextAction?.type))return ctx.exs[rt.nextAction.exerciseIndex]||null;
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
  const cardioTarget=target.trackingMode===TrackingMode.CARDIO||target.equipment===Equipment.CARDIO;
  const compatible=canonical=>canonical.status==='ACTIVE'&&(canonical.category==='CARDIO'||canonical.equipment===Equipment.CARDIO)===cardioTarget;
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
    if(!compatible(canonical)||canonical.id===target.canonicalExerciseId||canonical.key===key)continue;
    const rel=relationshipForAlternatives(source,canonical);
    if(!rel)continue;
    candidates.set(canonical.key,{key:canonical.key,name:canonicalName(canonical,languageCode(state)),canonical,relation:rel});
  }
  for(const d of EXERCISES){
    if(d.key===key||candidates.has(d.key)||(d.equipment===Equipment.CARDIO)!==cardioTarget)continue;
    const rel=alternativeRelation(key,d.key);if(rel)candidates.set(d.key,{key:d.key,name:d.name,canonical:CANONICAL_BY_KEY.get(d.key)||null,relation:rel,legacy:d});
  }
  if(!candidates.size){
    // Explicitly labelled manual choices, NOT asserted as biomechanical equivalents.
    const known=new Set([...inProgramme.keys(),...completedByKey.keys()]);
    for(const canonical of CANONICAL_EXERCISES){
      if(!compatible(canonical)||canonical.key===key)continue;
      if(!known.has(canonical.key))continue;
      candidates.set(canonical.key,{key:canonical.key,name:canonicalName(canonical,languageCode(state)),canonical,relation:'MANUAL'});
    }
    if(!candidates.size){for(const canonical of CANONICAL_EXERCISES){if(compatible(canonical)&&canonical.key!==key&&candidates.size<40)candidates.set(canonical.key,{key:canonical.key,name:canonicalName(canonical,languageCode(state)),canonical,relation:'MANUAL'});}}
  }
  return [...candidates.values()].map(c=>{
    const programme=inProgramme.get(c.key)||null,hist=completedByKey.get(c.key)||null;
    const user=state.user_exercises.find(x=>!x.archived&&(x.canonicalExerciseId===c.canonical?.id||x.legacyExerciseKey===c.key))||null;
    return {...c,programme,hist,user,knownWeight:hist?.weight??null,programmeWeight:programme?.initialWeightKg??null};
  }).sort((a,b)=>
    (a.relation==='EQUIVALENT'?0:a.relation==='CLOSE'?1:2)-(b.relation==='EQUIVALENT'?0:b.relation==='CLOSE'?1:2)||
    (a.programme&&a.hist?0:a.hist?1:a.programme?2:3)-(b.programme&&b.hist?0:b.hist?1:b.programme?2:3)||
    alternativePriority(key,a.key)-alternativePriority(key,b.key)||
    (b.hist?.at||0)-(a.hist?.at||0)||a.name.localeCompare(b.name)
  ).slice(0,16);
}
function requestReplaceExercise(targetId=null){
  const ctx=currentActiveContext(),defaultTarget=replacementExerciseTarget();
  const explicit=targetId==null?null:ctx.exs?.find(x=>String(x.id)===String(targetId));
  // A superset member must belong to the selected pair. No arbitrary session edit.
  const allowed=explicit&&(explicit.id===defaultTarget?.id||(defaultTarget?.supersetGroupId&&explicit.supersetGroupId===defaultTarget.supersetGroupId));
  const target=allowed?explicit:targetId==null?defaultTarget:null;if(!target)return;
  if(!canReplaceWholeExercise(exerciseSets(state,target.id))){toast(S('Replacing an exercise with recorded sets requires preserving its history. Use an unrecorded exercise or undo its first set.','Vingrinājuma maiņai ar jau reģistrētiem piegājieniem jāsaglabā vēsture. Aizstāj vēl nereģistrētu vingrinājumu vai atsauc tā pirmo piegājienu.'));return;}
  const options=replacementCandidates(target);
  if(!options.length){alertDialog(S('No close alternatives','Nav piemērotu analogu'),S('No verified alternatives exist in your exercise catalogue yet.','Katalogā vēl nav pārbaudītu analogu.'));return;}
  window.__gpReplacement={targetId:target.id,options};
  openDialog(`<h2>${esc(S('Replace exercise','Aizstāt vingrinājumu'))}</h2><div class="small">${esc(sessionDisplayName(target))}</div><div class="note">${esc(S('Own recorded weights are preferred. The programme is unchanged.','Priekšroka dotama iepriekš lietotiem svariem. Programma netiks mainīta.'))}</div><div class="alternative-list">${options.map((x,i)=>`<button class="alternative-choice secondary" onclick="gp.selectReplacement(${i})"><span><strong>${esc(x.name)}</strong><small>${esc(x.relation==='EQUIVALENT'?S('Equivalent','Līdzvērtīgs'):x.relation==='CLOSE'?S('Close alternative','Līdzīgs'):S('Manual choice · equivalence unverified','Manuāla izvēle · līdzvērtība nav apstiprināta'))}${x.programme?' · '+esc(S('Other programme day','Citā programmas dienā')):''}</small></span><span class="alternative-weight">${x.canonical?.category==='CARDIO'?esc(S('Cardio','Kardio')):x.knownWeight!=null?esc(formatKg(x.knownWeight)):esc(S('Set weight','Ievadīt svaru'))}</span></button>`).join('')}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button></div>`);
}
function selectReplacement(index){
  const draft=window.__gpReplacement,c=draft?.options?.[index];if(!c)return;
  draft.chosen=c;
  const kg=c.knownWeight??c.programmeWeight;
  const equipment=c.canonical?.equipment||c.legacy?.equipment||Equipment.OTHER;
  const body=equipment===Equipment.BODYWEIGHT||equipment===Equipment.CARDIO;
  openDialog(`<h2>${esc(c.name)}</h2><div class="note">${esc(equipment===Equipment.CARDIO?S('Cardio: record duration, distance and effort during the exercise.','Kardio: vingrinājumā reģistrē ilgumu, distanci un piepūli.'):c.knownWeight!=null?S('Your last completed working weight, editable.','Tavs pēdējais reģistrētais svars, labojams.'):S('No recorded working weight. Enter a suitable initial weight.','Nav reģistrēta svara. Ievadi sākotnējo svaru.'))}</div>${body?'':`<label class="field">${esc(S('Working weight (kg)','Darba svars (kg)'))}</label><input type="text" inputmode="decimal" id="f-replace-weight" oninput="gp.validateReplacementWeight()" value="${kg==null?'':esc(workoutWeightInput(kg))}" required>`}<div class="dialog-actions"><button class="secondary" onclick="gp.requestReplaceExercise(${esc(JSON.stringify(String(draft.targetId)))})">${esc(S('Back','Atpakaļ'))}</button><button id="use-replacement" onclick="gp.confirmReplacement()" ${!body&&!(Number(kg)>0)?'disabled':''}>${esc(S('Use for this workout','Izmantot šim treniņam'))}</button></div>`);
}
function validateReplacementWeight(){
  const input=$('#f-replace-weight'),button=$('#use-replacement');if(!input||!button)return;
  const value=recommendationWeight(input.value);button.disabled=!(value!=null&&value>0);
}
async function confirmReplacement(){
  const draft=window.__gpReplacement,c=draft?.chosen,e=getSessionExercise(draft?.targetId);
  if(!c||!e)return;
  const pending=exerciseSets(state,e.id),equipment=c.canonical?.equipment||c.legacy?.equipment||Equipment.OTHER;
  if(!canReplaceWholeExercise(pending)){toast(translateUI('Cannot replace after completing a set',languageCode(state)));return;}
  const noKg=equipment===Equipment.BODYWEIGHT||equipment===Equipment.CARDIO;
  const raw=noKg?0:recommendationWeight($('#f-replace-weight')?.value);
  if(raw==null||!Number.isFinite(raw)||raw<0||(!noKg&&raw<=0)){toast(translateUI('Enter a valid working weight',languageCode(state)));return;}
  let user=c.user;
  if(!user){
    user={id:uuid(),displayName:c.name,createdLanguage:languageCode(state),canonicalExerciseId:c.canonical?.id||null,equipment,dumbbellLoad:c.canonical?.dumbbellLoad||c.legacy?.dumbbellLoad||DumbbellLoad.SINGLE,exerciseType:c.canonical?.exerciseType||c.legacy?.type||ExerciseType.MODERATE_COMPOUND,trackingMode:trackingModeFor(equipment),legacyExerciseKey:c.key,archived:false};
    state.user_exercises.push(user);
  }
  const old=e.name;
  Object.assign(e,{name:user.displayName,userExerciseId:user.id,canonicalExerciseId:user.canonicalExerciseId||null,programmeExerciseId:uuid(),templateExerciseId:null,exerciseKey:c.key,equipment:user.equipment,dumbbellLoad:user.dumbbellLoad,exerciseType:user.exerciseType,trackingMode:user.trackingMode||trackingModeFor(equipment),plannedWeightKg:raw,startedAt:null,endedAt:null,status:'PENDING',rampStartedAt:null,rampEndedAt:null,rampSkipped:false,removeWeights:equipment===Equipment.BARBELL,rampMode:'AUTO'});
  e.rampPlanJson=equipment===Equipment.CARDIO?'[]':JSON.stringify(recommendRamp(raw,e.targetReps,e.exerciseType,e.exerciseKey,e.name,e.equipment,state.app_state.maxRampUpSets));
  for(const set of pending)if(set.status==='PENDING'){set.plannedWeightKg=raw;set.actualWeightKg=null;}
  const rt=runtime();if(rt){if(rt.phase!=='REST'&&String(currentActiveContext().e?.id)===String(e.id))rt.workingWeight=raw;if(rt.supersetWeights&&Object.hasOwn(rt.supersetWeights,String(e.id)))rt.supersetWeights[e.id]=raw;}
  // A replacement made at the working-set screen must return to preparation;
  // never silently start the substituted movement without its own warm-up.
  if(rt?.phase==='SET'&&rt.currentExerciseIndex>=0){
    const current=getSessionExercise(currentActiveContext().e?.id);
    if(current?.id===e.id||(current?.supersetGroupId&&current.supersetGroupId===e.supersetGroupId)){
      rt.phase='PRE_EXERCISE';rt.phaseStartedAt=now();rt.reminderStartedAt=null;
    }
  }
  window.__gpReplacement=null;closeDialog();await persist();render();toast(`${old} → ${c.name}`);
}
function exerciseActionButtons({showLater=true}={}){
  const e=replacementExerciseTarget();if(!e)return'';
  const rt=runtime(),all=rt?sessionExercises(state,rt.sessionId):[],pos=all.findIndex(x=>x.id===e.id);
  const hasLater=showLater&&all.slice(pos+1).some(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'));
  const members=supersetPairForExercise(all,e)||[e];
  const replacements=members.filter(member=>canReplaceWholeExercise(exerciseSets(state,member.id))).map(member=>`<button class="exercise-management" onclick="gp.requestReplaceExercise(${esc(JSON.stringify(String(member.id)))})">${esc(S('Replace','Aizstāt'))}${members.length>1?`: ${esc(sessionDisplayName(member))}`:''}</button>`).join('');
  return `<div class="exercise-secondary-actions">${hasLater?`<button class="exercise-management" onclick="gp.requestPostponeExercise()">${esc(S('Later','Vēlāk'))}</button>`:''}${replacements}<button class="exercise-management" onclick="gp.skipExercise()">${esc(S('Skip','Izlaist'))}</button></div>`;
}
function requestPostponeExercise(){
 const e=replacementExerciseTarget(),all=runtime()?sessionExercises(state,runtime().sessionId):[],next=all.slice(all.findIndex(x=>x.id===e?.id)+1).find(x=>!(e?.supersetGroupId&&x.supersetGroupId===e.supersetGroupId)&&exerciseSets(state,x.id).some(s=>s.status==='PENDING'));if(!e||!next)return;
 window.__gpPostponeTargetId=e.id;
 openDialog(`<h2>${esc(S(`Postpone ${sessionDisplayName(e)}?`,`Atlikt ${sessionDisplayName(e)}?`))}</h2><div class="dialog-copy">${esc(S(`Continue with ${sessionDisplayName(next)}. Where should this exercise return?`,`Turpini ar ${sessionDisplayName(next)}. Kur pārcelt šo vingrinājumu?`))}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.postponeExercise('next')">${esc(S('After next exercise','Pēc nākamā vingrinājuma'))}</button><button onclick="gp.postponeExercise('end')">${esc(S('End of workout','Treniņa beigās'))}</button></div>`);
}
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
    rt.entry=null;rt.rest=null;rt.nextAction=null;rt.phase='PRE_EXERCISE';rt.phaseStartedAt=now();rt.reminderStartedAt=null;
  }
  window.__gpPostponeTargetId=null;
  closeDialog();await persist();render();toast(S(`${sessionDisplayName(e)} postponed`,`${sessionDisplayName(e)} atlikts`));
}
async function skipExercise(){
  const ctx=currentActiveContext(),exs=ctx.exs,e=replacementExerciseTarget();if(!e)return;
  const group=e.supersetGroupId?exs.filter(x=>x.supersetGroupId===e.supersetGroupId):[e];
  const completed=group.some(x=>exerciseSets(state,x.id).some(set=>set.status==='COMPLETE'));
  if(completed&&group.length>1){alertDialog(translateUI('Cannot skip part of a superset',languageCode(state)),translateUI('Finish or skip the remaining sets using the superset controls.',languageCode(state)));return;}
  const after=exs.slice(exs.findIndex(x=>x.id===group[group.length-1].id)+1)
    .find(x=>exerciseSets(state,x.id).some(set=>set.status==='PENDING'));
  const name=group.length>1?group.map(sessionDisplayName).join(' + '):sessionDisplayName(e);
  confirmDialog(S(`Skip ${name}?`,`Izlaist ${name}?`),S(`Remaining sets will be marked skipped. ${after?`Next: ${sessionDisplayName(after)}.`:'Stretching follows.'}${ctx.rt.phase==='REST'?' Your current rest will continue.':''}`,`Atlikušie piegājieni tiks atzīmēti kā izlaisti. ${after?`Tālāk: ${sessionDisplayName(after)}.`:'Tālāk seko stiepšanās.'}${ctx.rt.phase==='REST'?' Pašreizējā atpūta turpināsies.':''}`),
    translateUI('Skip exercise',languageCode(state)),async()=>{
      closeDialog();const {rt,exs}=currentActiveContext(),resting=rt.phase==='REST'&&!!rt.rest,t=now();
      for(const item of group){for(const set of exerciseSets(state,item.id).filter(s=>s.status==='PENDING')){set.status='SKIPPED';set.completedAt=t;}item.status='SKIPPED';item.endedAt=t;}
      rt.nextAction=resting?nextPendingActivity(exs):nextActionAfterExercise(exs,group[group.length-1]);
      if(!resting){
        // Offer optional rest even after skipping; never jump ahead. The
        // native Android scheduler reads the same persisted REST deadline.
        beginSkippedExerciseRest(rt,group,t);ui.restExpand=true;
      }
      await persist();render();
      flashTransition(S(`${name} SKIPPED`,`${name} IZLAISTS`));
      if(!resting&&group.some(item=>exerciseSets(state,item.id).some(set=>set.status==='COMPLETE')))
        queuePostSetPrompts([{type:'note',e}]);
    },true);
}
function beginStretch(){const rt=runtime(),s=getSession(rt.sessionId),t=now();s.stretchStartedAt=s.stretchStartedAt||t;rt.phase='STRETCH';rt.phaseStartedAt=s.stretchStartedAt;rt.rest=null;rt.nextAction=null;persist().then(render);}
async function finishStretch(skipped){const rt=runtime(),s=getSession(rt.sessionId),t=now();s.stretchStartedAt=s.stretchStartedAt||t;s.stretchEndedAt=t;s.stretchSkipped=!!skipped;rt.phase='FINAL';rt.phaseStartedAt=t;await persist();render();}
async function cancelSetEntry(){
  const rt=runtime();if(!rt||rt.phase!=='ENTRY')return;
  rt.phase='SET';rt.entry=null;rt.rest=null;rt.nextAction=null;rt.phaseStartedAt=now();rt.reminderStartedAt=now();
  await persist();render();
}
function clearPostSetPrompts(){
 if(state?.runtime)delete state.runtime.deferredExerciseNoteIds;
 window.__gpPostSetQueue=[];window.__gpExerciseNote=null;window.__gpAdvice=null;
 window.__gpProgressionExercise=null;window.__gpProgressionGuard=null;window.__gpFutureAdjustment=null;
}
function lastCompletedWorkoutSet(){
 const rt=runtime();if(!rt)return null;
 const ids=new Set(sessionExercises(state,rt.sessionId).map(e=>e.id));
 return state.performed_sets.filter(set=>ids.has(set.sessionExerciseId)&&set.status==='COMPLETE').sort((a,b)=>(b.completedAt||0)-(a.completedAt||0)||Number(b.id)-Number(a.id))[0]||null;
}
function currentRedoRevision(){
 const rt=runtime();if(!rt)return null;
 const revision=(state.revisions||[]).findLast(r=>r.kind==='undo_set'&&!r.redoneAt);
 return revision&&revision.before?.runtime?.sessionId===rt.sessionId&&revision.afterFingerprint===fingerprint(workoutCheckpoint(state))?revision:null;
}
function undoLastSet(){
 if(canUndoWorkoutStep(state)){
  const session=runtime()?.sessionId;
  confirmDialog(S('Undo previous workout step?','Atsaukt iepriekšējo treniņa soli?'),S('Restore the previous workout stage and entries without changing the overall workout timer.','Atjaunot iepriekšējo treniņa posmu un ievadi, nemainot kopējo treniņa laiku.'),S('Undo','Atsaukt'),async()=>{
   if(runtime()?.sessionId!==session||!canUndoWorkoutStep(state)){closeDialog();return;}
   clearPostSetPrompts();closeDialog();const action=undoWorkoutStep(state);if(!action)return;await persist();render();toast(S('Workout step undone · Redo available','Treniņa solis atsaukts · Pieejama atkārtošana'));
  });return;
 }
 const set=lastCompletedWorkoutSet();if(!set)return;
 const sessionId=runtime().sessionId,capturedState=state,version=localGeneration;
 const e=getSessionExercise(set.sessionExerciseId),label=`${sessionDisplayName(e)} · ${S('set','piegājiens')} ${set.setNumber}`;
 confirmDialog(S('Return to the previous set?','Atgriezties iepriekšējā piegājienā?'),S(`${label}. Redo will restore the saved weight, reps and current entry.`,`${label}. Atjaunošana atgriezīs saglabāto svaru, atkārtojumus un pašreizējo ievadi.`),S('Undo','Atsaukt'),async()=>{
  if(capturedState!==state||version!==localGeneration||runtime()?.sessionId!==sessionId||lastCompletedWorkoutSet()?.id!==set.id){closeDialog();toast(S('The workout changed. Please review it first.','Treniņš ir mainījies. Vispirms to pārbaudi.'));return;}
  closeDialog();await applyUndoLastSet();
 });
}
async function applyUndoLastSet(){
  captureWorkoutNoteDraft();
  const before=workoutCheckpoint(state),rt=runtime();if(!rt)return;const exs=sessionExercises(state,rt.sessionId),ids=new Set(exs.map(e=>e.id));
  const last=lastCompletedWorkoutSet();if(!last)return;
  clearPostSetPrompts();
  const e=getSessionExercise(last.sessionExerciseId),targets=[{e,set:last}];if(e?.supersetGroupId){const pair=supersetPairForExercise(exs,e),other=pair?.find(x=>x.id!==e.id),otherSet=other?exerciseSets(state,other.id).find(x=>x.setNumber===last.setNumber&&x.status==='COMPLETE'&&Math.abs(Number(x.completedAt||0)-Number(last.completedAt||0))<1500):null;if(other&&otherSet)targets.push({e:other,set:otherSet});}
  for(const target of targets){const te=target.e.progressionAccepted&&target.e.templateExerciseId!=null?state.template_exercises.find(x=>x.id===target.e.templateExerciseId):null;if(te){te.initialWeightKg=target.e.plannedWeightKg;if(target.e.nextReps!=null)te.reps=target.e.targetReps;}Object.assign(target.set,{actualReps:null,actualWeightKg:null,rir:null,failure:false,actualRestSeconds:null,actualDurationSeconds:null,distanceKm:null,averageHeartRateBpm:null,averagePowerWatts:null,sessionRpe:null,status:'PENDING',completedAt:null});target.e.endedAt=null;target.e.unloadStartedAt=null;target.e.unloadEndedAt=null;target.e.unloadSkipped=false;target.e.status='ACTIVE';target.e.progressionOffered=false;target.e.progressionAccepted=false;target.e.nextWeightKg=null;target.e.nextReps=null;}
  const lead=targets.map(x=>x.e).sort((a,b)=>a.position-b.position)[0],ei=exs.findIndex(x=>x.id===lead.id),sets=exerciseSets(state,lead.id),si=sets.findIndex(x=>x.setNumber===last.setNumber);rt.currentExerciseIndex=Math.max(0,ei);rt.currentSetIndex=Math.max(0,si);const previous=before.performed_sets.find(item=>item.id===sets[Math.max(0,si)]?.id);rt.workingWeight=previous?.actualWeightKg??sets[Math.max(0,si)]?.plannedWeightKg??lead.plannedWeightKg;rt.phase='SET';rt.phaseStartedAt=now();rt.reminderStartedAt=now();rt.entry=null;rt.supersetEntry=null;rt.supersetTimed={};rt.rest=null;rt.nextAction=null;delete rt.deferredRestSetId;delete rt.cardioDraft;delete rt.unloadQueue;delete rt.unloadContinuation;appendRevision(state,'undo_set',before,null,{afterFingerprint:fingerprint(workoutCheckpoint(state))});await persist();render();toast(targets.length>1?S('Superset set undone · Redo available','Superpiegājiens atsaukts · Pieejama atkārtošana'):S('Last set undone · Redo available','Pēdējais piegājiens atsaukts · Pieejama atkārtošana'));
}

function requestAbort(){openDialog(`<h2>${esc(S('End workout early?','Pabeigt treniņu agrāk?'))}</h2><div class="dialog-copy">${esc(S('Save partial workout keeps completed sets and marks the remaining work as skipped. Discard workout removes this session from Logs and Progress.','Saglabājot daļēju treniņu, pabeigtie piegājieni paliek, bet atlikušie tiek atzīmēti kā izlaisti. Atmetot treniņu, tas tiek noņemts no Žurnāla un Progresa.'))}</div><div class="dialog-actions abort-actions"><button onclick="gp.finishPartialWorkout()">${esc(S('Save partial workout','Saglabāt daļēju treniņu'))}</button><button class="danger" onclick="gp.discardActiveWorkout()">${esc(S('Discard workout','Atmest treniņu'))}</button><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button></div>`);}
async function finishPartialWorkout(){const rt=runtime(),s=rt?getSession(rt.sessionId):activeSession();if(!s)return;const t=now(),es=sessionExercises(state,s.id);for(const e of es){const sets=exerciseSets(state,e.id),hadPending=sets.some(x=>x.status==='PENDING');sets.filter(x=>x.status==='PENDING').forEach(x=>{x.status='SKIPPED';x.completedAt=t;});if(hadPending||e.status==='PENDING'||e.status==='ACTIVE'){e.startedAt=e.startedAt??t;e.endedAt=t;e.status='SKIPPED';if(e.rampEndedAt==null)e.rampSkipped=true;if(e.unloadEndedAt==null)e.unloadSkipped=true;}}const stretchWasFinished=s.stretchEndedAt!=null;s.endedAt=t;s.status='ABORTED';s.stretchEndedAt=s.stretchEndedAt??t;s.stretchSkipped=stretchWasFinished?!!s.stretchSkipped:true;state.app_state.lastInactivityReminderFor=null;clearPostSetPrompts();state.runtime=null;persistWorkoutIntelligence(state,s.id);await persist();releaseWakeLock();closeDialog();nav('home');toast(translateUI('Workout saved as partial',languageCode(state)));}
async function discardActiveWorkout(){const s=activeSession();if(!s)return;const exIds=sessionExercises(state,s.id).map(e=>e.id);state.performed_sets=state.performed_sets.filter(x=>!exIds.includes(x.sessionExerciseId));state.session_exercises=state.session_exercises.filter(e=>e.sessionId!==s.id);state.workout_sessions=state.workout_sessions.filter(x=>x.id!==s.id);clearPostSetPrompts();state.runtime=null;await persist();releaseWakeLock();closeDialog();nav('home');toast(translateUI('Workout discarded',languageCode(state)));}

async function tick(){
  if(!state||workspaceTransition||writeBlocked)return;const tickNow=new Date(),trackerDateNow=trackerTodayKey();if(trackerDateNow!==trackerRenderedDate){trackerRenderedDate=trackerDateNow;sentTrackerReminderKeys.clear();trackerVisualBucket=-1;if(rollTrackerStatesToToday())await persist();if(route.name==='home')render();}const bucket=Math.floor((tickNow.getHours()*60+tickNow.getMinutes())/10);if(bucket!==trackerVisualBucket){trackerVisualBucket=bucket;refreshTrackerTimeVisuals(tickNow);}updateLiveClocks();await checkMotivationReminders();await checkTrackerReminders();const rt=runtime();if(!rt)return;
  const dialogOpen=!!document.querySelector('.dialog-backdrop'),activeView=route.name==='active';
  if(activeView&&!dialogOpen)releaseDeferredWorkoutNotes();
  const reminderMinute=exerciseReminderMinute(rt);
  if(reminderMinute>=1){
    const key=`${rt.sessionId}/${rt.currentExerciseIndex}/${rt.currentSetIndex}/${rt.reminderStartedAt||rt.phaseStartedAt}/${reminderMinute}`;
    if(key!==lastReminderKey){
      lastReminderKey=key;
      if(state.app_state.exerciseReminderSoundEnabled!==false&&!nativeAlertOwnsCue()&&!exerciseReminderOverlapsCountdown(rt))beepPattern('reminder');
    }
  }
  if(rt.phase==='REST'&&!rt.rest){await settleRestOrRender();return;}
  if((rt.phase==='REST'||rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY')&&rt.rest){
    const rem=rt.rest.endsAt-now();let changed=false;
    const upcoming=rt.nextAction&&Number.isInteger(rt.nextAction.exerciseIndex)?currentActiveContext().exs[rt.nextAction.exerciseIndex]:null;rt.rest.readyCue=upcoming&&hasPendingRamp(upcoming)&&state.app_state.warmupSoundEnabled!==false?'warmup':'ready';
    const cue=advanceRestAudioCue(rt.rest,rem,{warningSeconds:state.app_state.workoutWarningSeconds,countdownEnabled:state.app_state.workoutCountdownEnabled});
    if(cue.changed){changed=true;if(cue.sound&&!nativeAlertOwnsCue())beepPattern(cue.sound);}
    if(changed)await persist();
    if(rem<=0&&rt.phase==='REST'&&markRestReady(rt,now())){await persist();if(activeView&&!dialogOpen)render();return;}
    if(!dialogOpen)updateLiveClocks();return;
  }
  if(rt.phase==='CARDIO_ENTRY')return;
  if(rt.phase==='TIMED_SET'){
    const {set,e}=currentActiveContext(),target=Number(set?.targetDurationSeconds||e?.targetSeconds||60),endpoint=Number(rt.phaseStartedAt)+target*1000;
    if(now()>=endpoint){
      if(e?.trackingMode===TrackingMode.CARDIO){
        if(!rt.cardioDoneBeep){rt.cardioDoneBeep=true;if(!nativeAlertOwnsCue())beepPattern('ready');await persist();}
        updateLiveClocks();return;
      }
      // Reaching the target is only an audible cue. Never mark work complete,
      // start a rest, or enter stretching without an explicit user action.
      if(markTimedTargetReached(rt,now(),target)){
        if(!nativeAlertOwnsCue())beepPattern('ready');
        await persist();if(activeView&&!dialogOpen)render();
      }
      updateLiveClocks();return;
    }
    updateLiveClocks();return;
  }

}
const unlockPwaAudio=()=>{if(!globalThis.GymProgressAndroid&&state?.app_state?.soundEnabled!==false)void enableAudio();};
document.addEventListener('pointerdown',unlockPwaAudio,{passive:true});
document.addEventListener('touchend',unlockPwaAudio,{passive:true});
async function enableAudio(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')await audioCtx.resume();}catch{}}
function beepTone(at,freq=720,duration=.16,gain=.22){if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(audioCtx.destination);o.start(at);o.stop(at+duration+.02);}
function beepPattern(kind='reminder'){if(state?.app_state?.soundEnabled===false)return;const native=globalThis.GymProgressAndroid;if(native?.playCue){try{native.playCue(kind);return;}catch(error){console.warn('Native audio failed',error);}}if(!audioCtx)return;const t=audioCtx.currentTime+.01;if(kind==='warning30'){beepTone(t,690,.13,.24);if(navigator.vibrate)navigator.vibrate(75);return;}if(kind==='countdown'){beepTone(t,820,.13,.27);if(navigator.vibrate)navigator.vibrate(75);return;}if(kind==='ready'){beepTone(t,940,.68,.32);if(navigator.vibrate)navigator.vibrate(240);return;}if(kind==='warmup'){beepTone(t,620,.18,.20);beepTone(t+.24,800,.20,.20);beepTone(t+.5,1030,.48,.24);return;}beepTone(t,650,.18,.22);if(navigator.vibrate)navigator.vibrate(90);}
function beep(count=1){for(let i=0;i<count;i++)beepPattern('reminder');}
async function requestWakeLock(){if(!state?.app_state.keepScreenAwake||document.hidden)return;const native=globalThis.GymProgressAndroid;if(native&&typeof native.setKeepScreenAwake==='function'){native.setKeepScreenAwake(true);return;}if(!('wakeLock'in navigator))return;try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}
async function releaseWakeLock(){const native=globalThis.GymProgressAndroid;if(native&&typeof native.setKeepScreenAwake==='function')native.setKeepScreenAwake(false);try{await wakeLock?.release();}catch{}wakeLock=null;}

function backupObject(){return createBackup(state);};
function downloadBackup(){exportTextFile(`gym_progress_backup_${exportFilenameStamp()}.json`,JSON.stringify(backupObject(),null,2));}
function pickRestore(){$('#restore-file')?.click();}
async function restoreFile(file){
 if(!file)return;if(file.size>100*1024*1024){alertDialog(S('File too large','Fails pārāk liels'),S('Maximum backup size is 100 MB.','Maksimālais rezerves kopijas izmērs ir 100 MB.'));return;}
 let parsed;try{parsed=parseBackup(await file.text());}catch(error){alertDialog(S('Invalid backup','Nederīga rezerves kopija'),String(error.message));return;}
 const restored=normalize(parsed.state);assertPreserved(parsed.state,restored);
 if(socialSignedIn()){try{const status=await getWorkspaceStatus({refresh:true});if(restored.sync_foundation?.workspaceId&&restored.sync_foundation.workspaceId!==status.workspace_id)throw new Error(S('This backup belongs to a different account workspace.','Šī rezerves kopija pieder cita konta darbvietai.'));if(restored.sync_foundation?.eraseEpoch!=null&&Number(restored.sync_foundation.eraseEpoch)!==Number(status.erase_epoch))throw new Error(S('This backup predates a cloud erasure. Open it offline for review; it cannot be uploaded automatically.','Šī rezerves kopija ir vecāka par mākoņa dzēšanu. Atver to bezsaistē pārskatīšanai; automātiska augšupielāde nav pieejama.'));restored.sync_foundation.accountId=socialUser().id;}catch(error){alertDialog(S('Restore stopped','Atjaunošana apturēta'),error.message);return;}}
 const count=Object.entries(parsed.report.counts).reduce((n,[,v])=>n+v,0),warning=parsed.report.warnings.length;
 confirmDialog(S('Restore backup?','Atjaunot rezerves kopiju?'),S('Replace this workspace with ','Aizstāt šo darbvietu ar ')+count+S(' records. A verified recovery copy will be kept.',' ierakstiem. Tiks saglabāta pārbaudīta atkopšanas kopija.')+(warning?' '+warning+S(' references need review.',' saitēm nepieciešama pārbaude.'):''),S('Restore','Atjaunot'),async()=>{const captured=state,scope=stateWorkspace,authVersion=authGeneration();return workspaceLifecycle.run(async()=>{if(captured!==state||scope!==currentWorkspace()||authVersion!==authGeneration())throw new Error('Account changed before restore');await saveRecoveryState(captured,'pre-restore-latest');if(captured!==state||scope!==currentWorkspace()||authVersion!==authGeneration())throw new Error('Account changed during restore');await saveState(restored,{expectedWorkspace:scope});if(captured!==state||scope!==currentWorkspace()||authVersion!==authGeneration())throw new Error('Account changed during restore');$('#dialog-root')?.replaceChildren();state=restored;writeBlocked=false;ui.selectedWorkoutId=state.app_state.nextWorkoutId;ui.timelineDays=null;ui.timelineEndMs=null;if(state.runtime?.phase==='CARDIO_ENTRY'){route={name:'active',id:null};render();openCardioEntry();}else nav('home');toast(S('Backup restored','Rezerves kopija atjaunota'));});});
}
function exportRows(){return csvRows(state);}

function downloadCsv(){const rows=exportRows(),headers=rows.length?Object.keys(rows[0]):['session_id','date','workout'];exportTextFile(`gym_progress_${exportFilenameStamp()}.csv`,[headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n'),'text/csv');}
function detailedJsonObject(){return detailedExport(state);}
function downloadDetailedJson(){exportTextFile(`gym_progress_detailed_${exportFilenameStamp()}.json`,JSON.stringify(detailedJsonObject(),null,2));}
function eraseExerciseLogs(){confirmDialog(S('Erase workout history?','Dzēst treniņu vēsturi?'),S('Permanently deletes workout history, sets, Progress and derived shared records from the active v2 copy and, when signed in, from the cloud. Programme, settings, Tracker and account stay. Original v1 recovery data and downloaded backups remain.','Neatgriezeniski dzēš treniņu vēsturi, piegājienus, Progresu un atvasinātos kopīgotos ierakstus no aktīvās v2 kopijas un, ja esi pieslēdzies, arī no mākoņa. Programma, iestatījumi, Tracker un konts paliek. Sākotnējie v1 atkopšanas dati un lejupielādētās rezerves kopijas paliek.'),S('ERASE LOGS','DZĒST ŽURNĀLU'),async()=>{try{await eraseScopedData('workout_log');ui.timelineDays=null;ui.timelineEndMs=null;await persist();closeDialog();nav('settings');toast(socialSignedIn()?S('Exercise log data erased locally and in cloud.','Treniņu žurnāla dati izdzēsti lokāli un mākonī.'):S('Exercise log data erased.','Treniņu žurnāla dati izdzēsti.'));}catch(e){toast(`${e?.cloudErased?'':S('Deletion could not be completed','Dzēšanu neizdevās pabeigt')+': '}${e?.message||e}`);}},true);}
function eraseData(){confirmDialog(S('Erase all training data?','Dzēst visus treniņu datus?'),S('Permanently deletes programme, weights, history, Progress, Tracker and derived shared records from the active v2 copy and, when signed in, from the cloud. Your account and friendships stay. Original v1 recovery data and downloaded backups remain.','Neatgriezeniski dzēš programmu, svarus, vēsturi, Progresu, Tracker un atvasinātos kopīgotos ierakstus no aktīvās v2 kopijas un, ja esi pieslēdzies, arī no mākoņa. Konts un draudzības paliek. Sākotnējie v1 atkopšanas dati un lejupielādētās rezerves kopijas paliek.'),S('Continue','Turpināt'),()=>{closeDialog();setTimeout(()=>confirmDialog(S('FINAL WARNING','PĒDĒJAIS BRĪDINĀJUMS'),S('There is no undo. Cancel now if you need to create a backup first.','To nevar atsaukt. Atcel tagad, ja vispirms nepieciešama rezerves kopija.'),S('ERASE EVERYTHING','DZĒST VISU'),async()=>{try{await eraseScopedData('all');ui.timelineDays=null;ui.timelineEndMs=null;await persist();ui.selectedWorkoutId=null;closeDialog();nav('home');toast(socialSignedIn()?S('All training data erased locally and in cloud.','Visi treniņu dati izdzēsti lokāli un mākonī.'):S('All training data erased.','Visi treniņu dati izdzēsti.'));}catch(e){toast(`${e?.cloudErased?'':S('Deletion could not be completed','Dzēšanu neizdevās pabeigt')+': '}${e?.message||e}`);}},true),30);},true);}

function alertDialog(title,text){title=translateUI(title,languageCode(state));text=translateUI(text,languageCode(state));openDialog(`<h2>${esc(title)}</h2><div class="muted">${esc(text)}</div><div class="dialog-actions"><button onclick="gp.closeDialog()" data-i18n="OK">OK</button></div>`,{notice:true});}
function confirmDialog(title,text,confirmLabel,onConfirm,danger=false,onCancel=null){title=translateUI(title,languageCode(state));text=translateUI(text,languageCode(state));window.__gpConfirm=onConfirm;window.__gpCancel=onCancel;openDialog(`<h2>${esc(title)}</h2><div class="muted ${danger?'destructive-warning':''}">${danger?`<strong>${esc(text)}</strong>`:esc(text)}</div><div class="dialog-actions"><button class="secondary" onclick="gp.cancelConfirm()" data-i18n="Cancel">Cancel</button><button class="${danger?'danger':''}" onclick="gp.confirmNow()">${esc(translateUI(confirmLabel,languageCode(state)))}</button></div>`);}
function formDialog(title,body,confirmLabel,onConfirm,cancelAction='gp.closeDialog()'){window.__gpFormConfirm=onConfirm;openDialog(`<h2>${esc(translateUI(title,languageCode(state)))}</h2>${body}<div class="dialog-actions"><button type="button" class="secondary" onclick="${cancelAction}">Cancel</button><button type="button" onclick="gp.formConfirm()">${esc(translateUI(confirmLabel,languageCode(state)))}</button></div>`);}
let dialogVersion=0,emailOtpFlow=null;
function openDialog(inner,{otpFlow=null,notice=false}={}){dialogVersion++;if(emailOtpFlow!==otpFlow){cancelEmailOtp();emailOtpFlow=otpFlow;}let root=$('#dialog-root');if(!root){root=document.createElement('div');root.id='dialog-root';document.body.append(root);}setHTML(root,'<div class="dialog-backdrop" onclick="if(event.target===this)gp.closeDialog()"><div class="dialog'+(notice?' notice-dialog':'')+'">'+inner+'</div></div>');localizeDom(root,languageCode(state));enhanceDialog(root,{onClose:()=>closeDialog(),language:languageCode(state)});}
function closeDialog(){dialogVersion++;cancelEmailOtp();emailOtpFlow=null;if(runtime()?.phase==='CARDIO_ENTRY'){void cancelCardioSet();return;}trainingSyncReviewToken++;const skippedExerciseNote=!!window.__gpExerciseNote;window.__gpExerciseNote=null;const r=$('#dialog-root');if(r)setHTML(r,'');window.__gpConfirm=window.__gpCancel=window.__gpFormConfirm=null;if(skippedExerciseNote)continuePostSetQueue();scheduleAutomaticUpdate();}


function socialErrorMessage(err){
  if(/GP_WRITE_LIMIT|unusual number of submissions/i.test(String(err?.message||'')))return S('Unusually many submissions. Please try again later.','Neparasti daudz iesniegumu. Mēģini vēlāk.');
  if(err?.status===429||err?.code==='OTP_COOLDOWN')return S('Too many code requests. Wait a few minutes before trying again.','Pārāk daudz koda pieprasījumu. Pirms atkārtota mēģinājuma uzgaidi dažas minūtes.');
  if(['otp_expired','invalid_credentials'].includes(err?.code))return S('The code is invalid or expired. Request a new code.','Kods ir nederīgs vai tā derīguma termiņš ir beidzies. Pieprasi jaunu kodu.');
  if(err?.name==='TimeoutError')return S('The request timed out. Please retry.','Pieprasījuma laiks ir beidzies. Mēģini vēlreiz.');
  if(err?.code==='PGRST202')return S('The database update is not available yet. Please try again after the migration.','Datubāzes atjauninājums vēl nav pieejams. Mēģini vēlreiz pēc datu pārnešanas.');
  return translateUI(String(err?.message||err||S('Something went wrong.','Radās kļūda.')),languageCode(state));
}
function socialEffortKey(value){const v=String(value||'').trim().toLowerCase().replaceAll('_','-').replaceAll(' ','-');return ['comfortable','challenging','hard','very-hard','failure','aborted','cardio-easy','cardio-moderate','cardio-hard','cardio-veryhard','cardio-unknown','unknown'].includes(v)?v:'unknown';}
function socialEffortLabel(value){const labels={'comfortable':'Comfortable','challenging':'Challenging','hard':'Hard','very-hard':'Very hard','failure':'Failure','aborted':'Aborted','cardio-easy':'Easy','cardio-moderate':'Moderate','cardio-hard':'Hard','cardio-veryhard':'Very hard','cardio-unknown':'No effort data','unknown':'No effort data'};return translateUI(labels[socialEffortKey(value)],languageCode(state));}
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
    const [profile,friends,requests,notifications,timeline,comparisonPreference]=await Promise.all([
      getMyProfile(),listFriends(),listIncomingRequests(),listNotifications(20),getTimeline('1970-01-01T00:00:00.000Z'),getComparisonPreference()
    ]);
    socialUi.profile=profile;socialUi.comparisonPref={allowed:comparisonPreference?.allowed===true,revision:Number(comparisonPreference?.revision)||0,loaded:true};socialUi.friends=normalizeFriends(friends);socialUi.requests=requests||[];socialUi.notifications=notifications||[];socialUi.timeline=(timeline||[]).filter(e=>!socialDeletePending.has(e.id));
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
function renderFriendComparison(){
 const pref=socialUi.comparisonPref||{allowed:false,revision:0,loaded:false};
 const chevron=expandChevron('details-chevron');
 const friendOpts=socialUi.friends.map(f=>`<option value="${f.user_id}" ${f.user_id===socialUi.compareFriendId?'selected':''}>${esc(f.display_name)}</option>`).join('');
 const exerciseOpts=(socialUi.compareExercises||[]).map(x=>{const id=x.canonical_exercise_id||x.canonicalExerciseId,name=canonicalName(canonicalExerciseById(id),languageCode(state))||(languageCode(state)==='lv'?x.name_lv:x.name_en)||x.name||x.name_en||x.name_lv||id;return `<option value="${id}" ${id===socialUi.compareExerciseId?'selected':''}>${esc(name)}</option>`;}).join('');
 let body;
 if(!pref.loaded){body=`<div class="note" role="status">${esc(S('Loading comparison preference…','Ielādē salīdzināšanas iestatījumu…'))}</div>`;}
 else if(!pref.allowed){body=`<div class="note">${esc(S('Exercise comparison is disabled. Enable Compare exercises in Settings to compare progress with friends.','Vingrinājumu salīdzināšana ir izslēgta. Lai salīdzinātu progresu ar draugiem, ieslēdz to Iestatījumos.'))}</div><button type="button" class="secondary full" onclick="gp.openComparisonSettings()">${esc(S('Open Settings','Atvērt iestatījumus'))}</button>`;}
 else if(!socialUi.friends.length){body=`<div class="note">${esc(S('Add a friend using the Friends card above to compare exercise progress.','Lai salīdzinātu vingrinājumu progresu, pievieno draugu augstāk redzamajā Draugu kartītē.'))}</div>`;}
 else{
  body=`<div class="small">${esc(S('Choose a friend to see mutually eligible catalogue exercises.','Izvēlies draugu, lai redzētu savstarpēji salīdzināmos kataloga vingrinājumus.'))}</div>`;
  if(socialUi.compareFriendId)body=`<select aria-label="${esc(S('Choose friend','Izvēlies draugu'))}" onchange="gp.openFriendComparison(this.value)"><option value="">${esc(S('Choose friend','Izvēlies draugu'))}</option>${friendOpts}</select><select aria-label="${esc(S('Compare exercise','Salīdzināt vingrinājumu'))}" onchange="gp.setFriendCompareExercise(this.value)" ${exerciseOpts?'':'disabled'}>${exerciseOpts||`<option>${esc(S('No common comparable exercises','Nav kopīgu salīdzināmu vingrinājumu'))}</option>`}</select><div class="note friend-comparison-help" data-interface-text><strong data-i18n="Estimated 1-rep max (e1RM)">Estimated 1-rep max (e1RM)</strong> estimates the maximum weight for one clean repetition from a qualifying working set. Only explicitly selected programme occurrences and exact matching catalogue exercises are compared.</div>${renderFriendComparisonChart()}`;
  else body=`<select aria-label="${esc(S('Choose friend','Izvēlies draugu'))}" onchange="gp.openFriendComparison(this.value)"><option value="">${esc(S('Choose friend','Izvēlies draugu'))}</option>${friendOpts}</select>${body}`;
 }
 return `<div class="card friend-comparison-card ${socialUi.compareExpanded?'expanded':''}"><button type="button" class="friend-comparison-head" onclick="gp.toggleFriendComparison()" aria-expanded="${socialUi.compareExpanded}"><span class="title">${esc(S('Compare exercise progress','Salīdzināt vingrinājuma progresu'))}</span>${chevron}</button><div class="ui-disclosure" data-disclosure-key="friend-comparison" data-expanded="${socialUi.compareExpanded}" ${socialUi.compareExpanded?'':'inert aria-hidden="true"'}><div class="ui-disclosure-inner"><div class="friend-comparison-body stack">${body}</div></div></div></div>`;
}
function renderFriendComparisonChart(){const rows=socialUi.comparePoints||[],me=socialOwnerId(),parsed=rows.map(r=>({userId:r.user_id??r.userId,time:new Date(r.occurred_at??r.occurredAt).getTime(),value:Number(r.e1rm_kg??r.e1rmKg),labels:r.source_labels??r.sourceLabels??[]})).filter(p=>p.userId&&Number.isFinite(p.time)&&Number.isFinite(p.value));if(!parsed.length)return"<div class=\"small\" data-interface-text>No comparison points yet.</div>";const selectedFriendId=socialUi.compareFriendId,friendId=parsed.some(p=>p.userId===selectedFriendId)?selectedFriendId:parsed.find(p=>p.userId!==me)?.userId||selectedFriendId,W=Math.max(276,Math.min(716,(window.visualViewport?.width||window.innerWidth||760)-44)),H=250,L=58,R=8,T=16,B=16,vals=parsed.map(p=>p.value),axis=niceChartAxis(Math.min(...vals),Math.max(...vals),{targetIntervals:5,weight:true}),low=axis.low,high=axis.high,range=Math.max(.001,high-low),rawMinT=Math.min(...parsed.map(p=>p.time)),rawMaxT=Math.max(...parsed.map(p=>p.time)),today=now(),historyDays=Math.max(0,(today-rawMinT)/86400000),minT=rawMinT,maxT=historyDays<30?Math.max(today,rawMaxT):rawMaxT,x=t=>maxT===minT?L+(W-L-R)/2:L+(W-L-R)*(t-minT)/(maxT-minT),y=v=>T+(H-T-B)*(1-(v-low)/range),colors=new Map([[me,themeColour('blue')],[friendId,themeColour('red')]]);let grid='',paths='',dots='';for(const tick of axis.ticks.slice().reverse()){const yy=y(tick);grid+=`<line class="chart-grid" vector-effect="non-scaling-stroke" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis" x="${L-6}" y="${yy+4}" text-anchor="end">${compactTick(tick,axis.step)} kg</text>`;}const orderedIds=[me,friendId,...new Set(parsed.map(p=>p.userId))].filter((id,i,a)=>id&&a.indexOf(id)===i);for(const uid of orderedIds){const pts=parsed.filter(p=>p.userId===uid).sort((a,b)=>a.time-b.time),color=colors.get(uid)||themeColour('muted');if(!pts.length)continue;if(pts.length>=2){let d=`M ${x(pts[0].time)} ${y(pts[0].value)}`;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],ax=x(a.time),ay=y(a.value),bx=x(b.time),by=y(b.value),dx=(bx-ax)*.36;d+=` C ${ax+dx} ${ay}, ${bx-dx} ${by}, ${bx} ${by}`;}paths+=`<path d="${d}" stroke="${color}" class="chart-line" vector-effect="non-scaling-stroke"/>`;}for(const p of pts){const overlaps=parsed.some(q=>q.userId!==uid&&Math.abs(q.time-p.time)<1000&&Math.abs(q.value-p.value)<.001);if(overlaps&&uid===friendId)dots+=`<circle cx="${x(p.time)}" cy="${y(p.value)}" r="7" fill="none" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;else dots+=`<circle class="chart-point" vector-effect="non-scaling-stroke" cx="${x(p.time)}" cy="${y(p.value)}" r="${pts.length===1?5.5:4}" fill="${color}"/>`;if(pts.length===1)dots+=`<circle cx="${x(p.time)}" cy="${y(p.value)}" r="8" fill="none" stroke="${color}" stroke-width="1.5" opacity=".7" vector-effect="non-scaling-stroke"/>`;}}const friendName=socialUi.friends.find(f=>f.user_id===friendId)?.display_name||S('Friend','Draugs'),minePts=parsed.filter(p=>p.userId===me),friendPts=parsed.filter(p=>p.userId===friendId),mine=minePts.length,theirs=friendPts.length,uniqueLabels=pts=>[...new Set(pts.flatMap(p=>Array.isArray(p.labels)?p.labels:[]).filter(Boolean))],mineLabels=uniqueLabels(minePts),friendLabels=uniqueLabels(friendPts),included=(mineLabels.length||friendLabels.length)?`<div class="friend-source-list"><div class="small">${esc(S('Included programme occurrences','Iekļautie programmas ieraksti'))}</div>${mineLabels.map(l=>`<div style="color:${themeColour('blue')}">● ${esc(l)}</div>`).join('')}${friendLabels.map(l=>`<div style="color:${themeColour('red')}">● ${esc(l)}</div>`).join('')}</div>`:'';return `<div class="friend-chart-legend"><span style="color:${themeColour('blue')}">● ${esc(S('You','Tu'))} (${mine})</span><span style="color:${themeColour('red')}">● ${esc(friendName)} (${theirs})</span></div><div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${paths}${dots}</svg></div>${included}`;}
function programmeComparisonLabel(te){
  const u=getUserExercise(state,te.userExerciseId),w=getWorkout(te.workoutId),same=state.template_exercises.filter(x=>x.workoutId===te.workoutId&&x.userExerciseId===te.userExerciseId).sort((a,b)=>a.position-b.position),n=same.findIndex(x=>x.id===te.id)+1;
  return `${w?.name||'Workout'} · ${userExerciseName(te.userExerciseId,te.name||S('Exercise','Vingrinājums'))}${same.length>1?` · #${n}`:''}`;
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
  const stableId=metaForLocal(state,'workout_session',s.id)?.syncId;
  if(!stableId){console.warn('Skipping comparison for workout without a stable sync UUID',s.id);return [];}
  const grouped=new Map();
  for(const e of sessionExercises(state,s.id)){
    const source=selected.get(e.programmeExerciseId);if(!source)continue;
    const sets=exerciseSets(state,e.id);
    if(e.status!=='COMPLETE')continue;
    if(s.status==='ABORTED'&&sets.some(x=>x.status!=='COMPLETE'))continue;
    const best=heaviestQualifyingE1rm(sets);if(best==null)continue;
    const key=source.canonicalExerciseId,old=grouped.get(key);
    if(!old)grouped.set(key,{clientPointId:`v3:${stableId}:${key}:${E1RM_FORMULA_VERSION}`,canonicalExerciseId:key,occurredAt:new Date(s.endedAt||s.startedAt||Date.now()).toISOString(),e1rmKg:best,formulaVersion:E1RM_FORMULA_VERSION,sourceProgrammeExerciseIds:[e.programmeExerciseId],sourceLabels:[source.label]});
    else{
      if(best>old.e1rmKg)old.e1rmKg=best;
      if(e.programmeExerciseId&&!old.sourceProgrammeExerciseIds.includes(e.programmeExerciseId))old.sourceProgrammeExerciseIds.push(e.programmeExerciseId);
      if(!old.sourceLabels.includes(source.label))old.sourceLabels.push(source.label);
    }
  }
  return [...grouped.values()];
}
function comparisonPointsForSelectedHistory(){const selected=selectedComparisonSources();return state.workout_sessions.filter(s=>['COMPLETE','ABORTED'].includes(s.status)).flatMap(s=>comparisonPointsForSession(s.id,selected));}
// Only publish after current training changes have reached the cloud. Server
// compares the cursor and consent revision atomically; older devices cannot
// overwrite a newer opt-out or fabricate an old local-number comparison ID.
async function refreshComparisonPreference(){
 if(!socialSignedIn())return {allowed:false,revision:0,loaded:false};
 const owner=socialUser().id,preference=await getComparisonPreference();
 if(socialUser()?.id!==owner)return {allowed:false,revision:0,loaded:false};
 const result={allowed:preference?.allowed===true,revision:Number(preference?.revision)||0,loaded:true};
 socialUi.comparisonPref=result;return result;
}
async function syncComparisonHistory(){
 if(!socialConfigured()||!socialSignedIn()||accountBootstrapStatus!=='ready')return;
 const owner=socialUser().id,preference=await refreshComparisonPreference();
 if(!preference.allowed||socialUser()?.id!==owner)return;
 const sync=await performTrainingSync({reason:'comparison',domains:['programme','workout_log'],force:true});
 if(!sync||sync.conflicts||sync.pending||sync.deferred||socialUser()?.id!==owner)return;
 const status=await getWorkspaceStatus({refresh:true});
 if(socialUser()?.id!==owner)return;
 await replaceComparisonPoints(comparisonPointsForSelectedHistory(),{preferenceRevision:preference.revision,sourceCursor:Number(status.head_cursor)});
}
async function setComparisonSharing(enabled){
 if(!socialSignedIn())return;
 const owner=socialUser()?.id;
 try{
  // Turning OFF is enforced by the server and deletes published points before
  // the UI shows success; a failed request does not falsely show a withdrawal.
  const pref=await setComparisonEnabled(!!enabled);
  if(socialUser()?.id!==owner)return;
  socialUi.comparisonPref={allowed:pref?.allowed===true,revision:Number(pref?.revision)||0,loaded:true};
  socialUi.compareExercises=[];socialUi.comparePoints=[];socialUi.compareExerciseId=null;
  render();
  if(enabled){await syncComparisonHistory();if(socialUi.compareFriendId)await openFriendComparison(socialUi.compareFriendId);}
  toast(enabled?S('Strength comparison enabled','Spēka salīdzināšana ieslēgta'):S('Comparison disabled; published points withdrawn','Salīdzināšana izslēgta; dati atsaukti'));
 }catch(error){
  if(socialUser()?.id!==owner)return;
  // Restore the toggle from the authoritative server value if possible.
  await refreshComparisonPreference().catch(()=>{});
  render();toast(socialErrorMessage(error));
 }
}

function renderFriends(){
  const configured=socialConfigured(),signed=socialSignedIn(),profile=socialUi.profile;
  let c=''; // Add friend belongs only at the bottom of the expanded list, never in either header.
  if(!configured){c+=`<div class="card"><div class="title">${esc(S('Friends backend is not configured','Draugu serveris nav konfigurēts'))}</div><div class="note">${esc(S('Add your Supabase publishable key to social-config.js. Everything else in Gym Progress continues to work offline.','Ievieto Supabase publicējamo atslēgu social-config.js failā. Pārējā Gym Progress darbība turpinās bezsaistē.'))}</div></div>`;return shell(c);}
  if(!signed){c+=`<div class="card social-onboarding"><div class="title">${esc(S('Log in to use Friends','Pieslēdzies, lai izmantotu Draugus'))}</div><div class="note">${esc(S('Friends requires your Gym Progress account. Your private programme, workout history and Tracker are shared only through account sync, never with friends. Social cards are published only when you select them.','Draugu sadaļai nepieciešams Gym Progress konts. Privātā programma, treniņu vēsture un Tracker ar draugiem netiek kopīgoti; tie tiek sinhronizēti tikai tavā kontā. Sociālās kartītes publicē tikai tad, kad tās pats izvēlies.'))}</div><button class="full" onclick="gp.openAccount()">${esc(S('Log in','Pieslēgties'))}</button></div>`;return shell(c);}
  if(socialUi.loading&&!socialUi.loaded)c+=`<div class="card"><div class="note">${esc(S('Loading friends…','Ielādē draugus…'))}</div></div>`;
  else{
    const acceptedUpdates=(socialUi.notifications||[]).filter(n=>n.notification_type==='friend_accepted');
    if(acceptedUpdates.length){c+=`<div class="stack social-updates">${acceptedUpdates.map(n=>`<div class="card compact"><strong>${esc(S('Friend request accepted','Draudzības uzaicinājums apstiprināts'))}</strong><div class="small">${esc(`${n.display_name} ${S('accepted your friend request.','apstiprināja tavu draudzības uzaicinājumu.')}`)}</div></div>`).join('')}</div>`;}
    if(socialUi.requests.length){c+=`<h3>${esc(S('Friend requests','Draudzības uzaicinājumi'))}</h3><div class="stack">${socialUi.requests.map(r=>`<div class="card compact friend-request-card"><div class="row between"><strong>${esc(r.display_name)}</strong><div class="row"><button class="tiny-btn" onclick="gp.acceptSocialRequest('${r.request_id}')">${esc(S('Accept','Apstiprināt'))}</button><button class="ghost tiny-btn" onclick="gp.rejectSocialRequest('${r.request_id}')">${esc(S('Decline','Noraidīt'))}</button></div></div></div>`).join('')}</div>`;}
    c+=`<div class="friends-panel ${socialUi.friendsExpanded?'expanded':''}"><div class="friends-panel-header"><button class="friends-list-toggle" onclick="gp.toggleFriendsList()" aria-expanded="${socialUi.friendsExpanded}"><span>${esc(S('Friends','Draugi'))} <span class="small">(${socialUi.friends.length})</span></span>${expandChevron(`friends-toggle-chevron ${socialUi.friendsExpanded?'expanded':''}`)}</button></div><div class="ui-disclosure" data-disclosure-key="friends-list" data-expanded="${socialUi.friendsExpanded}" ${socialUi.friendsExpanded?'':'inert aria-hidden="true"'}><div class="ui-disclosure-inner"><div class="friends-list">${socialUi.friends.length?socialUi.friends.map(f=>`<div class="friend-row"><span>${esc(f.display_name)}</span><button class="ghost tiny-btn friend-remove" onclick="gp.removeSocialFriend('${f.user_id}')">${esc(S('Remove','Noņemt'))}</button></div>`).join(''):`<div class="small friends-empty">${esc(S('No friends yet.','Pagaidām nav draugu.'))}</div>`}<div class="friends-add-row"><button type="button" class="secondary friends-add-action" onclick="gp.openAddFriend()">+ ${esc(S('Add friend','Pievienot draugu'))}</button></div></div></div></div></div>`;
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
function compactSocialTimelineSpan(days){if(days<45)return`${Math.max(1,Math.round(days))} ${S('d','d.')}`;if(days<730)return`${Math.max(1,Math.round(days/30))} ${S('mo','mēn.')}`;const y=days/365;return`${formatNumber(y,{maximumFractionDigits:y<10?1:0})} ${S('yr','g.')}`;}
function socialTimelineDate(ms){return new Intl.DateTimeFormat(localeFor(languageCode(state)),{day:'numeric',month:'short',year:socialUi.timelineDays>330?'2-digit':undefined}).format(new Date(ms));}
function focusComparisonSettingsCard(){
 const card=document.getElementById('comparison-settings-card');if(route.name!=='settings'||!card)return;
 card.scrollIntoView({behavior:'smooth',block:'center'});card.focus({preventScroll:true});
 card.classList.add('settings-target-highlight');setTimeout(()=>card.classList.remove('settings-target-highlight'),1900);
}
function openComparisonSettings(){
 nav('settings');
 // One immediate focus, then re-focus after the asynchronously fetched cloud
 // consent preference re-renders Settings. Never strand the user at its top.
 requestAnimationFrame(focusComparisonSettingsCard);
 setTimeout(focusComparisonSettingsCard,350);
}
function renderFriendsTimeline(){
  const me={user_id:socialUser()?.id,display_name:socialUi.profile?.display_name||S('You','Tu')};const people=[me,...socialUi.friends.filter(f=>f.user_id!==me.user_id)],win=socialTimelineWindow();
  const rows=people.map(p=>{const dots=socialUi.timeline.filter(e=>e.user_id===p.user_id).map(e=>{const at=new Date(e.occurred_at).getTime(),visible=Number.isFinite(at)&&at>=win.start&&at<=win.end,x=visible?Math.max(0,Math.min(100,(at-win.start)/win.span*100)):0;return `<span class="friend-timeline-dot difficulty ${esc(socialEffortKey(e.effort))}" data-at="${Number.isFinite(at)?at:''}" style="left:clamp(6px, ${x}%, calc(100% - 6px));${visible?'':'display:none'}" aria-hidden="true"></span>`;}).join('');return `<div class="friend-timeline-row"><div class="friend-timeline-name">${esc(p.user_id===me.user_id?S('You','Tu'):p.display_name)}</div><div class="friend-timeline-track">${dots}</div></div>`;}).join('');
  const endLabel=Math.abs(Date.now()-win.end)<6*3600000?S('Today','Šodien'):socialTimelineDate(win.end);
  return `<div class="card friends-timeline-card"><div class="row between"><div class="title">${esc(S('Shared rhythm','Kopīgais ritms'))}</div><div class="small" id="friends-timeline-span">${esc(compactSocialTimelineSpan(socialUi.timelineDays))}</div></div><div class="friends-timeline-gesture" aria-label="${esc(S('Shared workout timeline. Drag to pan and pinch to zoom.','Kopīgoto treniņu laika līnija. Velc, lai pārvietotu, un savelc/izplet, lai mainītu mērogu.'))}"><div class="friends-timeline">${rows}</div><div class="row between small timeline-labels"><span id="friends-timeline-start">${esc(socialTimelineDate(win.start))}</span><span id="friends-timeline-end">${esc(endLabel)}</span></div></div></div>`;
}
function updateFriendsTimelineDom(){
  const root=document.querySelector('.friends-timeline-gesture');if(!root)return;const win=socialTimelineWindow();
  root.querySelectorAll('.friend-timeline-dot[data-at]').forEach(dot=>{const at=Number(dot.dataset.at),visible=Number.isFinite(at)&&at>=win.start&&at<=win.end;dot.style.display=visible?'':'none';if(visible)dot.style.left=`clamp(6px, ${Math.max(0,Math.min(100,(at-win.start)/win.span*100))}%, calc(100% - 6px))`;});
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
  const own=e.user_id===socialOwnerId();
  const record=e.event_type!=='workout_summary';
  const icon=record?'<path d="M8 3h8v5a4 4 0 0 1-8 0Z"/><path d="M8 5H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3 1v5m-4 4h8m-7-4h6"/>':'<rect x="4" y="6" width="4" height="12" rx="1"/><rect x="16" y="6" width="4" height="12" rx="1"/><path d="M8 12h8M2 9v6m20-6v6"/>';
  const iconAlt=record?S('Exercise record','Vingrinājuma rekords'):S('Completed workout','Pabeigts treniņš');
  let body='';
  if(!record){
    const ex=Array.isArray(e.exercise_names)?e.exercise_names.join(', '):'';
    body=`<div class="social-event-main"><strong>${esc(e.workout_name||'')}</strong><span>${esc(formatDuration(Number(e.duration_seconds||0)*1000))} · ${esc(socialEffortLabel(e.effort))}</span></div>${ex?`<div class="small">${esc(ex)}</div>`:''}${e.progress_percent!=null?`<div class="social-progress">${esc(S('Progress','Progress'))}: ${esc(fmtPct(Number(e.progress_percent)))}</div>`:''}`;
  }else{
    const value=e.record_kind==='weight'?formatKg(Number(e.record_value)):e.record_kind==='duration'?formatDuration(Number(e.record_value)*1000):`${Number(e.record_value)} ${S('reps','atk.')}`;
    body=`<div class="social-record"><strong>${esc(e.exercise_name||'')}</strong><span>${esc(e.record_kind==='weight'?S('New weight record','Jauns svara rekords'):e.record_kind==='duration'?S('Cardio activity','Kardio aktivitāte'):S('New rep record','Jauns atkārtojumu rekords'))}: <b>${esc(value)}</b>${e.increase_percent!=null?` · ${esc(fmtPct(Number(e.increase_percent)))}`:''}</span></div>`;
  }
  const comment=cleanSocialComment(e.comment);
  return `<div class="card social-event effort-surface" data-effort="${esc(socialEffortKey(e.effort))}"><div class="social-event-head"><div><div class="social-author">${esc(own?S('You','Tu'):e.display_name)}</div><div class="small">${esc(dateTime(new Date(e.occurred_at).getTime()))}</div></div><svg class="social-type-icon" viewBox="0 0 24 24" role="img" aria-label="${esc(iconAlt)}">${icon}</svg></div>${body}${comment?`<div class="social-comment">${esc(comment)}</div>`:''}${own?`<div class="social-event-footer"><button class="icon-btn social-delete" title="${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}" aria-label="${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}" onclick="gp.deleteSocialEvent('${e.id}')" ${socialDeletePending.has(e.id)?'disabled':''}>×</button></div>`:''}</div>`;
}
function openAccount(){
  if(!socialSignedIn()){
    const flow={authVersion:authGeneration(),operation:0,email:'',stage:'email'};
    openDialog(`<h2>${esc(S('Log in','Pieslēgties'))}</h2><label class="field" for="social-email">${esc(S('E-mail','E-pasts'))}</label><input id="social-email" type="email" maxlength="254" autocomplete="email" placeholder="name@example.com" onkeydown="if(event.key==='Enter')gp.socialSendCode()"><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.socialSendCode()">${esc(S('Send code','Nosūtīt kodu'))}</button></div>`,{otpFlow:flow});
    const input=$('#social-email');
    input.addEventListener('input',()=>{if(emailOtpFlow===flow&&flow.email&&input.value.trim().toLowerCase()!==flow.email.toLowerCase()){cancelEmailOtp();flow.operation++;flow.email='';}});
    return;
  }
  const name=accountDisplayLabel(),email=socialUser()?.email||'',username=socialUi.profile?.username||'';
  openDialog(`<h2>${esc(S('Account','Konts'))}</h2><div class="account-dialog-identity"><strong>${esc(name)}</strong><div class="small muted">${username?'@'+esc(username):esc(S('Username required','Nepieciešams lietotājvārds'))}</div><div class="small muted">${esc(email)}</div></div><div class="stack"><button class="secondary full" onclick="gp.editSocialName()">${esc(S('Change name','Mainīt vārdu'))}</button><button class="secondary full" onclick="gp.editUsername()">${esc(S('Username','Lietotājvārds'))}: ${esc(username?'@'+username:S('Choose username','Izvēlēties lietotājvārdu'))}</button><button class="secondary full" onclick="gp.openTrainingSyncReview()">${esc(S('Review & sync now','Pārskatīt un sinhronizēt'))}</button><button class="secondary full" onclick="gp.socialSignOut()">${esc(S('Sign out','Iziet'))}</button><div class="divider"></div><button class="danger full" onclick="gp.requestDeleteAccount()">${esc(S('Delete account','Dzēst kontu'))}</button></div>`);
}
async function deleteAccountWorkspace(){
 const captured=state,scope=stateWorkspace,authVersion=authGeneration();
 await workspaceLifecycle.run(async()=>{
  if(captured!==state||scope!==currentWorkspace()||authVersion!==authGeneration())throw new Error('Account changed before deletion');
  let cloudDeleted=false;
  try{await deleteMyAccount();cloudDeleted=true;markAccountCleanup(scope);if(captured!==state||scope!==currentWorkspace())throw new Error('Workspace changed during deletion');await wipeState({expectedWorkspace:scope});clearAccountCleanup(scope);}
  catch(error){if(cloudDeleted){error.cloudDeleted=true;try{markAccountCleanup(scope);}catch{}if(captured===state){ensureSyncFoundation(captured);captured.sync_foundation.blocked={code:'ACCOUNT_ERASE_PENDING',scope};}error.message=S('The cloud account was deleted. Local cleanup is still pending; use Retry local cleanup in Settings.','Mākoņa konts ir dzēsts. Lokālā tīrīšana vēl jāveic; iestatījumos izvēlies Atkārtot lokālo tīrīšanu.')+' '+error.message;}throw error;}
 });
 await switchAccountWorkspace();
}
async function retryDeletedAccountCleanup(){
 const scopes=pendingAccountCleanups();if(!scopes.length)return;let failure=null;writeBlocked=true;
 try{await workspaceLifecycle.run(async()=>{
  const returnScope=stateWorkspace;
  try{for(const scope of scopes){await setWorkspace(scope);await wipeState({expectedWorkspace:scope});clearAccountCleanup(scope);}}
  finally{await setWorkspace(returnScope);}
 });}catch(error){failure=error;}
 // Loading a database head refreshes its CAS baseline. Always adopt the matching
 // current state, even when cleanup failed, before allowing another local edit.
 await switchAccountWorkspace();if(failure)throw failure;
 closeDialog();nav('settings');toast(S('Local account cleanup completed.','Konta lokālā tīrīšana pabeigta.'));
}
function requestDeleteAccount(){
  confirmDialog(S('Delete account and all cloud data?','Dzēst kontu un visus mākoņa datus?'),S('Permanently deletes your account and all its cloud data, shared cards and friendships, plus its active v2 copy on this device. Original v1 recovery data and downloaded backups remain. This cannot be undone.','Neatgriezeniski dzēš kontu un visus tā mākoņa datus, kopīgotās kartītes un draudzības, kā arī šī konta aktīvo v2 kopiju šajā ierīcē. Sākotnējie v1 atkopšanas dati un lejupielādētās rezerves kopijas paliek. Darbību nevar atsaukt.'),S('Continue','Turpināt'),()=>{closeDialog();setTimeout(()=>confirmDialog(S('FINAL ACCOUNT DELETION WARNING','PĒDĒJAIS KONTA DZĒŠANAS BRĪDINĀJUMS'),S('This cannot be undone. Create a backup now if you might need your training data later.','To nevar atsaukt. Ja treniņu dati vēlāk var būt vajadzīgi, izveido rezerves kopiju tagad.'),S('DELETE ACCOUNT','DZĒST KONTU'),async()=>{try{await deleteAccountWorkspace();socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null};await persist();closeDialog();nav('home');toast(S('Account and data deleted.','Konts un dati izdzēsti.'));}catch(e){toast(socialErrorMessage(e));}},true),30);},true);
}
function currentEmailOtpDialog(flow,version,operation=flow?.operation){return !!flow&&emailOtpFlow===flow&&dialogVersion===version&&flow.operation===operation&&authGeneration()===flow.authVersion;}
function openEmailCodeDialog(email,flow){
  if(!flow||emailOtpFlow!==flow||flow.authVersion!==authGeneration())return;
  flow.email=email;flow.stage='code';window.__gpSocialEmail=email;
  openDialog(`<h2>${esc(S('Email code','E-pasta kods'))}</h2><p class="small" data-user-content>${esc(email)}</p><label class="sr-only" for="social-otp">${esc(S('Email code','E-pasta kods'))}</label><input id="social-otp" class="social-otp-input" inputmode="numeric" autocomplete="one-time-code" maxlength="10" onkeydown="if(event.key==='Enter')gp.socialVerifyCode()"><div class="dialog-actions"><button class="secondary" onclick="gp.openAccount()">${esc(S('Change email','Mainīt e-pastu'))}</button><button id="otp-resend" class="secondary" onclick="gp.socialResendCode()">${esc(S('Resend code','Nosūtīt kodu vēlreiz'))}</button><button onclick="gp.socialVerifyCode()">${esc(S('Verify','Apstiprināt'))}</button></div>`,{otpFlow:flow});
  const button=$('#otp-resend');
  const update=()=>{if($('#otp-resend')!==button)return;const seconds=otpRetrySeconds(email);button.disabled=seconds>0;button.textContent=seconds?S(`Resend in ${seconds}s`,`Atkārtoti pēc ${seconds} s`):S('Resend code','Nosūtīt kodu vēlreiz');if(seconds)setTimeout(update,1000);};update();
}
async function socialSendCode(){
  const flow=emailOtpFlow,version=dialogVersion,input=$('#social-email');
  if(!currentEmailOtpDialog(flow,version)||flow.stage!=='email'||!input)return;
  const email=input.value.trim();
  if(!email){toast(S('Enter your email address.','Ievadi e-pasta adresi.'));return;}
  flow.email=email;const operation=++flow.operation;
  const current=()=>currentEmailOtpDialog(flow,version,operation)&&$('#social-email')===input&&input.value.trim().toLowerCase()===email.toLowerCase();
  try{await sendEmailOtp(email);if(current())openEmailCodeDialog(email,flow);}catch(error){if(current()&&error?.name!=='EmailOtpCancelledError')toast(socialErrorMessage(error));}
}
async function socialResendCode(){
  const flow=emailOtpFlow,version=dialogVersion;
  if(!currentEmailOtpDialog(flow,version)||flow.stage!=='code'||!$('#social-otp'))return;
  const email=flow.email,operation=++flow.operation;
  try{await sendEmailOtp(email);if(currentEmailOtpDialog(flow,version,operation))openEmailCodeDialog(email,flow);}catch(error){if(currentEmailOtpDialog(flow,version,operation)&&error?.name!=='EmailOtpCancelledError')toast(socialErrorMessage(error));}
}
async function socialVerifyCode(){
  const flow=emailOtpFlow,version=dialogVersion,input=$('#social-otp');
  if(!currentEmailOtpDialog(flow,version)||flow.stage!=='code'||!input)return;
  const token=input.value.trim(),email=flow.email;
  if(!token||!email){toast(S('Enter the complete email code.','Ievadi pilnu e-pasta kodu.'));return;}
  if(state.runtime){toast(S('Finish or discard your workout before changing accounts.','Pirms konta maiņas pabeidz vai atcel treniņu.'),7000);return;}
  const operation=++flow.operation;
  try{
    await persist();if(!currentEmailOtpDialog(flow,version,operation))return;
    const authenticated=await verifyEmailOtp(email,token),authVersion=authGeneration();
    if(socialUser()?.id!==authenticated.user.id)return;
    // A successful verification commits an account switch. Its expected auth
    // generation advances; dialog cancellation must not clear that valid session.
    flow.authVersion=authVersion;closeDialog();await switchAccountWorkspace();
    if(socialUser()?.id!==authenticated.user.id)return;
    const completionVersion=dialogVersion;
    const profile=await getMyProfile().catch(()=>null);
    if(dialogVersion!==completionVersion||authGeneration()!==authVersion||socialUser()?.id!==authenticated.user.id)return;
    socialUi.profile=profile;render();void refreshSocialBadge();
    if(profile && !profile.username)editUsername(true);
    else void maybeOfferOfflineAttachment().catch(reportAppError);
  }catch(error){if(currentEmailOtpDialog(flow,version,operation)&&error?.name!=='EmailOtpCancelledError')toast(socialErrorMessage(error));}
}


/** Account and guest data are separate owners. Joining them is always an
 * explicit, reviewable action and never a side effect of authentication. */
async function refreshOfflineAttachmentStatus(){
 try{const guest=await loadOfflineSnapshot();offlineDataAvailable=!!guest&&hasOfflineTraining(guest.state);return guest;}
 catch(error){console.warn('Offline profile could not be inspected',error);offlineDataAvailable=false;return null;}
}
async function maybeOfferOfflineAttachment(force=false){
 if(!socialSignedIn()||state?.runtime||workspaceTransition||writeBlocked)return;
 const guest=await refreshOfflineAttachmentStatus();if(!guest||!hasOfflineTraining(guest.state))return;
 const owner=socialUser()?.id,identity=owner+'|'+guest.revision;
 if(!force&&identity===offlineAttachmentOfferedFor)return;
 offlineAttachmentOfferedFor=identity;
 const counts=offlineTrainingCounts(guest.state);
 const message=S(
  `You have offline training (${counts.workout_templates} programme days, ${counts.workout_sessions} workouts, ${counts.tracker_items} Tracker items). Attach a copy to this account? The account's existing data will be preserved.`,
  `Ir bezsaistes dati (${counts.workout_templates} programmas dienas, ${counts.workout_sessions} treniņi, ${counts.tracker_items} Tracker ieraksti). Pievienot tos šim kontam? Esošie konta dati tiks saglabāti.`);
 openDialog(`<h2>${esc(S('Attach offline training?','Pievienot bezsaistes treniņus?'))}</h2><p>${esc(message)}</p><p class="small">${esc(S('Not now keeps both profiles separate. You can attach later from Account settings.','Ne tagad saglabā profilus atsevišķi. Vēlāk varēsi pievienot konta iestatījumos.'))}</p><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Keep separate','Atstāt atsevišķi'))}</button><button onclick="gp.attachOfflineNow()">${esc(S('Attach offline data','Pievienot datus'))}</button></div>`);
}
async function attachOfflineNow(){
 if(!socialSignedIn()||state.runtime||workspaceTransition||writeBlocked){toast(S('Finish the active workout before attaching data.','Pabeidz treniņu pirms datu pievienošanas.'));return;}
 const owner=socialUser().id,scope='account:'+owner,expectedAuth=authGeneration();
 closeDialog();
 try{
  // No other account sync may write while the guest/account transaction is built.
  if(trainingSyncInFlight)await trainingSyncInFlight;
  await persist();await flushSaves();
  await workspaceLifecycle.run(async()=>{
   const guard=()=>{if(socialUser()?.id!==owner||authGeneration()!==expectedAuth||currentWorkspace()!==scope||stateWorkspace!==scope||state.runtime)throw new Error('Account or workout changed during attachment.');};
   guard();writeBlocked=true;
   try{
    const [account,guest]=await Promise.all([loadScopedSnapshot(scope),loadOfflineSnapshot()]);
    guard();if(!guest||!hasOfflineTraining(guest.state))return;
    if(!account)throw new Error('Account workspace unavailable. Sign in again.');
    const transfer=attachOfflineTraining(account.state,guest.state);
    const empty=defaults();Object.assign(empty.app_state,originalDevicePreferences(guest.state));
    await commitOfflineAttachment({accountScope:scope,accountRevision:account.revision,guestRevision:guest.revision,guestFingerprint:transfer.sourceFingerprint,merged:transfer.state,emptyGuest:empty,recoveryKey:'offline-before-attach-'+transfer.transferId});
    guard();offlineDataAvailable=false;offlineAttachmentOfferedFor=null;
   }finally{writeBlocked=false;}
  });
  // Refresh observed IndexedDB revision after the atomic two-workspace commit;
  // this also automatically resumes account sync of newly imported records.
  await switchAccountWorkspace();
  toast(S('Offline training attached; cloud sync will continue automatically.','Bezsaistes treniņi pievienoti; mākoņa sinhronizācija turpinās automātiski.'),6000);
 }catch(error){console.error('Offline attachment failed',error);toast(S('Offline data was not discarded. ','Bezsaistes dati netika dzēsti. ')+String(error?.message||error),8500);}
}
async function socialSignOut(){
 if(state.runtime){toast(S('Finish or discard the current workout before signing out.','Pabeidz vai atcel iesākto treniņu pirms iziešanas.'),7000);return;}
 const pending=Object.values(state.sync_foundation?.records||{}).filter(x=>x.pending&&!x.suppressed).length;
 const warning=S('This account’s programme, history and Tracker will become unavailable after sign-out until you log into the same account again. Offline workouts recorded while signed out will belong to a separate guest profile. Account data is not deleted.',
   'Šī konta programma, vēsture un Tracker pēc iziešanas nebūs pieejami, līdz atkal pieslēgsies šim kontam. Bezsaistē izveidotie dati būs atsevišķā viesu profilā. Konta dati netiks dzēsti.');
 confirmDialog(S('Sign out of this account?','Iziet no šī konta?'),warning+(pending?' '+S(`${pending} local changes are still pending cloud sync and will be retained on this device.`,`${pending} vietējās izmaiņas vēl gaida sinhronizāciju; tās tiks saglabātas ierīcē.`):''),S('Sign out','Iziet'),async()=>{await persist();await signOutSocial();await switchAccountWorkspace();closeDialog();nav('home');});
}
function toggleFriendsList(){socialUi.friendsExpanded=!socialUi.friendsExpanded;render();}
function validUsername(value){return /^[a-z][a-z0-9_]{2,23}$/.test(String(value||'').trim().toLowerCase());}
function editUsername(required=false){
 const existing=socialUi.profile?.username||'';
 openDialog(`<h2>${esc(S(required?'Choose a username':'Change username',required?'Izvēlies lietotājvārdu':'Mainīt lietotājvārdu'))}</h2><div class="small">${esc(S('This unique public username is used for adding friends. Your e-mail is private. Use 3–24 lowercase letters, numbers or underscores, starting with a letter.','Unikālais publiskais lietotājvārds tiek izmantots draugu pievienošanai. E-pasts ir privāts. Izmanto 3–24 mazos burtus, ciparus vai pasvītras; sākumā jābūt burtam.'))}</div><input id="social-username" type="text" autocomplete="off" autocapitalize="none" maxlength="24" value="${esc(existing)}" placeholder="your_name"><div class="dialog-actions">${required?'':`<button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button>`}<button onclick="gp.saveUsername()">${esc(S('Save','Saglabāt'))}</button></div>`);
}
async function saveUsername(){const name=String($('#social-username')?.value||'').trim().toLowerCase();if(!validUsername(name)){toast(S('Use 3–24 lowercase letters, numbers or underscores; start with a letter.','Izmanto 3–24 mazos burtus, ciparus vai pasvītras; sākumā jābūt burtam.'));return;}try{await setUsername(name);socialUi.profile=await getMyProfile();closeDialog();render();void maybeOfferOfflineAttachment().catch(reportAppError);}catch(error){toast(socialErrorMessage(error),7000);}}
function openAddFriend(){if(socialSignedIn()&&!socialUi.profile?.username){editUsername(true);return;}openDialog(`<h2>${esc(S('Add friend','Pievienot draugu'))}</h2><div class="dialog-copy">${esc(S('Enter their public Gym Progress username. E-mail addresses are never used to find friends.','Ievadi drauga publisko Gym Progress lietotājvārdu. E-pasta adreses draugu meklēšanā neizmanto.'))}</div><input id="friend-username" type="text" maxlength="24" autocapitalize="none" autocomplete="off" placeholder="friend_name"><div id="friend-lookup-result"></div><div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button><button onclick="gp.lookupSocialFriend()">${esc(S('Look up','Meklēt'))}</button></div>`);}
async function lookupSocialFriend(){const username=$('#friend-username')?.value.trim().toLowerCase();if(!validUsername(username)){toast(S('Enter a valid username.','Ievadi derīgu lietotājvārdu.'));return;}try{const r=await findFriend(username),root=$('#friend-lookup-result');if(!r){setHTML(root,`<div class="note">${esc(S('No account found.','Konts nav atrasts.'))}</div>`);return;}window.__gpFriendUsername=username;setHTML(root,`<div class="card compact"><strong>${esc(r.display_name)} · @${esc(r.username||username)}</strong><div class="small">${esc(r.relationship==='friends'?S('Already friends','Jau draugi'):r.relationship==='outgoing_pending'?S('Request already sent','Uzaicinājums jau nosūtīts'):r.relationship==='incoming_pending'?S('They already invited you','Šis lietotājs jau tevi uzaicināja'):S('Gym Progress account','Gym Progress konts'))}</div>${r.relationship==='none'?`<button class="full" onclick="gp.sendSocialFriendRequest()">${esc(S('Send friend request','Nosūtīt uzaicinājumu'))}</button>`:''}</div>`);}catch(e){toast(socialErrorMessage(e));}}
async function sendSocialFriendRequest(){try{const result=await sendFriendRequest(window.__gpFriendUsername);if(result==='unavailable'||result?.status==='unavailable'){toast(S('Account not available for a request.','Konts nav pieejams uzaicinājumam.'));return;}closeDialog();await enterFriends();toast(S('Friend request sent.','Draudzības uzaicinājums nosūtīts.'));}catch(error){toast(socialErrorMessage(error));}}
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
  const own=e.user_id===socialOwnerId(),progress=e.progress_percent!=null?`<div class="social-progress">${esc(S('Progress','Progress'))}: ${esc(fmtPct(Number(e.progress_percent)))}</div>`:'';
  openDialog(`<h2>${esc(e.workout_name||S('Shared workout','Kopīgots treniņš'))}</h2><div class="small">${esc(own?S('You','Tu'):e.display_name)} · ${esc(dateTime(new Date(e.occurred_at).getTime()))}</div><div class="dialog-copy">${esc(socialEffortLabel(e.effort))}</div>${progress}<div class="dialog-actions">${own?`<button class="danger" onclick="gp.deleteSocialEvent('${e.id}')">${esc(S('Delete shared record','Dzēst kopīgoto ierakstu'))}</button>`:''}<button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);
}

function previousExerciseSets(userExerciseId,currentSessionId){
  const current=getSession(currentSessionId),startedAt=Number(current?.startedAt||Infinity);
  const exIds=state.session_exercises.filter(e=>{const s=getSession(e.sessionId);return e.userExerciseId===userExerciseId&&e.sessionId!==currentSessionId&&s?.status==='COMPLETE'&&Number(s.startedAt||0)<startedAt;}).map(e=>e.id);
  return state.performed_sets.filter(x=>exIds.includes(x.sessionExerciseId)&&x.status==='COMPLETE'&&(Number(x.actualReps)||0)>0);
}
function buildShareCards(sessionId){
  const s=getSession(sessionId);if(!s)return[];const metrics=sessionMetrics(state,s),diff=workoutLogEffort(s,metrics),exs=sessionExercises(state,s.id);
  const cards=[{key:`workout-${crypto.randomUUID()}`,type:'workout_summary',title:s.workoutName,subtitle:`${formatDuration((s.endedAt||s.startedAt)-s.startedAt)} · ${socialEffortLabel(diff.key)}`,details:exs.map(e=>sessionDisplayName(e)).join(', '),selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'workout_summary',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,duration_seconds:Math.max(0,Math.round(((s.endedAt||s.startedAt)-s.startedAt)/1000)),effort:diff.key,progress_percent:metrics.progressPercent,exercise_names:exs.map(e=>sessionDisplayName(e))}}];
  for(const e of exs){
    if(e.trackingMode===TrackingMode.CARDIO){
      const cardioSets=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE'&&Number(x.actualDurationSeconds)>0);
      if(cardioSets.length){
        const seconds=cardioSets.reduce((v,x)=>v+Number(x.actualDurationSeconds||0),0),distance=cardioSets.reduce((v,x)=>v+(Number(x.distanceKm)||0),0);
        const rpe=cardioSets.find(x=>Number(x.sessionRpe)>=1)?.sessionRpe;
        cards.push({key:`cardio-${e.id}`,type:'exercise_record',title:sessionDisplayName(e),subtitle:`${S('Cardio activity','Kardio aktivitāte')} · ${formatDuration(seconds*1000)}${distance>0?' · '+formatNumber(distance,{minimumFractionDigits:2,maximumFractionDigits:2})+' km':''}${rpe?' · RPE '+rpe:''}`,selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'exercise_record',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,exercise_name:sessionDisplayName(e),record_kind:'duration',record_value:seconds,record_unit:'s',effort:'unknown'}});
      }
      continue;
    }
    const curr=exerciseSets(state,e.id).filter(x=>x.status==='COMPLETE'&&(Number(x.actualReps)||0)>0),prev=previousExerciseSets(e.userExerciseId,s.id);if(!curr.length||!prev.length)continue;
    if(e.equipment!==Equipment.BODYWEIGHT){const oldMax=Math.max(...prev.map(x=>Number(x.actualWeightKg)||0)),newMax=Math.max(...curr.map(x=>Number(x.actualWeightKg)||0));if(oldMax>0&&newMax>oldMax+1e-6){cards.push({key:`weight-${e.id}`,type:'exercise_record',title:sessionDisplayName(e),subtitle:`${S('New weight record','Jauns svara rekords')} · ${formatKg(newMax)} · ${fmtPct((newMax/oldMax-1)*100)}`,selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'exercise_record',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,effort:diff.key,exercise_name:sessionDisplayName(e),record_kind:'weight',record_value:newMax,previous_value:oldMax,record_unit:'kg',increase_percent:(newMax/oldMax-1)*100}});}}
    let best=null;for(const set of curr){const w=Number(set.actualWeightKg)||0,prior=prev.filter(x=>Math.abs((Number(x.actualWeightKg)||0)-w)<.001),old=prior.length?Math.max(...prior.map(x=>Number(x.actualReps)||0)):0,n=Number(set.actualReps)||0;if(old>0&&n>old){const pct=(n/old-1)*100;if(!best||pct>best.pct)best={n,old,w,pct};}}
    if(best)cards.push({key:`reps-${e.id}`,type:'exercise_record',title:sessionDisplayName(e),subtitle:`${S('New rep record','Jauns atkārtojumu rekords')} · ${best.n} ${S('reps','atk.')} · ${fmtPct(best.pct)}`,details:e.equipment===Equipment.BODYWEIGHT?'':`@ ${formatKg(best.w)}`,selected:false,comment:'',event:{client_event_id:crypto.randomUUID(),event_type:'exercise_record',occurred_at:new Date(s.endedAt||Date.now()).toISOString(),workout_name:s.workoutName,effort:diff.key,exercise_name:sessionDisplayName(e),record_kind:'reps',record_value:best.n,previous_value:best.old,record_unit:'reps',increase_percent:best.pct}});
  }
  return cards;
}
function workoutConclusionHtml(sessionId){const s=getSession(sessionId);if(!s)return'';const m=sessionMetrics(state,s),diff=workoutLogEffort(s,m),exs=sessionExercises(state,s.id),cardioEffort=workoutCardioEffort(state,s),duration=formatDuration(Math.max(0,(s.endedAt||now())-s.startedAt));const exerciseRows=exs.map(e=>{const em=exerciseMetrics(state,e);let result;if(e.trackingMode===TrackingMode.CARDIO){result=`${S('Duration','Ilgums')} ${formatDuration(em.totalDurationSeconds*1000)}${em.totalDistanceKm!=null?' · '+formatNumber(em.totalDistanceKm,{minimumFractionDigits:2,maximumFractionDigits:2})+' km':''}${em.sessionRpe>0?' · RPE '+formatNumber(Number(em.sessionRpe),{minimumFractionDigits:1,maximumFractionDigits:1}):''}`;}else if(e.trackingMode===TrackingMode.TIME_ONLY){result=`${S('Duration','Ilgums')} ${formatDuration(em.totalDurationSeconds*1000)}`;if(e.equipment!==Equipment.BODYWEIGHT&&em.maxWeight>0)result+=` · ${S('Max.','Maks.')} ${formatKg(em.maxWeight)}`;}else if(e.equipment===Equipment.BODYWEIGHT)result=`${S('Max reps','Maks. atkārtojumi')} ${em.maxReps}`;else result=`${S('Max.','Maks.')} ${formatKg(em.maxWeight)}`;const attention=e.recommendation==='REDUCE'||['SLOWING','STALLED','DECLINING'].includes(e.trendState),positive=e.recommendation==='PROGRESS'&&!attention,trendClass=attention?'trend-attention':positive?'trend-progress':'';const intelligence=e.recommendation?`<div class="small conclusion-trend ${trendClass}"><strong>${esc(translateUI(e.recommendation,languageCode(state)))}</strong> · ${esc(translateUI(trendLabel(e.trendState),languageCode(state)))}${e.trendConfidence?` · ${esc(translateUI(e.trendConfidence.toLowerCase(),languageCode(state)))} ${esc(S('confidence','pārliecība'))}`:''}</div>`:'';return `<div class="conclusion-exercise-row"><div class="conclusion-exercise-copy"><div class="conclusion-exercise-name">${esc(sessionDisplayName(e))}</div>${intelligence}</div><strong class="conclusion-exercise-result">${esc(result)}</strong></div>`;}).join('');const fatigueState=String(s.fatigueState||'NORMAL'),fatigueAttention=!['NORMAL','INSUFFICIENT_DATA'].includes(fatigueState),trendSummary=fatigueAttention?`<div class="intelligence-summary"><div class="title">${esc(S('Overall','Kopumā'))} · ${esc(languageCode(state)==='lv'?translateUI(fatigueState,languageCode(state)):fatigueState.replaceAll('_',' '))}</div><p class="small trend-attention">${esc(translateUI(fatigueSummary(fatigueState),languageCode(state)))}</p></div>`:'';return `<section class="workout-conclusion"><div class="workout-complete-title">${esc(S('WORKOUT COMPLETE','TRENIŅŠ PABEIGTS'))}</div><h2>${esc(s.workoutName)}</h2><div class="conclusion-metrics"><div><span>${esc(S('Duration','Ilgums'))}</span><strong>${duration}</strong></div><div><span>${esc(cardioEffort.mode==='cardio'?S('Activities','Aktivitātes'):S('Completed strength sets','Pabeigti spēka piegājieni'))}</span><strong>${cardioEffort.mode==='cardio'?cardioEffort.cardioCount:m.strengthCompletedSets}</strong></div>${cardioEffort.mode==='cardio'||cardioEffort.mode==='mixed'?`<div><span>${esc(S('Cardio load','Kardio slodze'))}</span><strong>${formatCardioSessionLoad(s)}</strong></div>`:''}${cardioEffort.mode==='strength'||cardioEffort.mode==='mixed'?`<div><span>${esc(S('Strength volume','Spēka apjoms'))}</span><strong>${formatKgRounded(m.volume)}</strong></div>`:''}<div><span>${esc(S('Effort','Piepūle'))}</span><strong>${esc(translateUI(diff.label,languageCode(state)))}</strong></div></div>${trendSummary}<div class="conclusion-exercises">${exerciseRows}</div>${s.note?`<div class="note">${esc(s.note)}</div>`:''}</section>`;}
async function showWorkoutFinishCelebration(sessionId,finishedAt){
 showWorkoutShareSummary(sessionId,finishedAt);
 const dialog=document.querySelector('.share-summary-dialog');if(!dialog)return;
 dialog.classList.add('finish-reveal');document.querySelector('.finish-fireworks')?.remove();
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const overlay=document.createElement('div');overlay.className='finish-fireworks';overlay.setAttribute('aria-hidden','true');
 const positions=[[17,26],[79,19],[48,49],[19,76],[84,71],[52,11]];
 for(let n=0;n<positions.length;n++){
  const burst=document.createElement('span');burst.className='finish-firework';burst.style.left=positions[n][0]+'%';burst.style.top=positions[n][1]+'%';burst.style.setProperty('--delay',`${n*180}ms`);
  for(let i=0;i<16;i++){const spark=document.createElement('i');spark.style.setProperty('--angle',`${i*22.5}deg`);spark.style.setProperty('--reach',`${84+(i%4)*18}px`);burst.append(spark);}overlay.append(burst);
 }
 document.body.append(overlay);setTimeout(()=>overlay.remove(),5600);
}
function showWorkoutShareSummary(sessionId,finishedAt){window.__gpShareDraft={sessionId,finishedAt,cards:buildShareCards(sessionId)};renderShareSummary();}
function renderShareSummary({preserveScroll=false}={}){const d=window.__gpShareDraft;if(!d)return;document.body.classList.add('workout-summary-open');let root=$('#dialog-root');if(!root){document.body.insertAdjacentHTML('beforeend','<div id="dialog-root"></div>');root=$('#dialog-root');}const previous=root.querySelector('.share-summary-dialog'),savedScroll=preserveScroll?Number(previous?.scrollTop||0):0,savedPageY=preserveScroll?window.scrollY:0;const signed=socialSignedIn(),conclusion=workoutConclusionHtml(d.sessionId);const cards=d.cards.map((c,i)=>`<div class="share-summary-card ${signed?'clickable-share-card':''} ${c.selected?'selected':''}" ${signed?`onclick="gp.toggleShareCard(${i})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();gp.toggleShareCard(${i})}"`:''}><div class="row between"><div><div class="title">${esc(c.title)}</div><div class="small">${esc(c.subtitle||'')}</div></div><button class="share-toggle ${c.selected?'on':''}" onclick="event.stopPropagation();gp.toggleShareCard(${i})" ${signed?'':'disabled'} aria-label="${esc(S('Share','Kopīgot'))}" title="${esc(S('Share','Kopīgot'))}"><svg class="share-check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 9.4 17.4 19.5 7.3"/></svg></button></div>${c.details?`<div class="note">${esc(c.details)}</div>`:''}${signed?`<div class="share-comment-reveal ${c.selected?'open':''}" aria-hidden="${!c.selected}"><input class="share-comment" autocapitalize="sentences" maxlength="500" placeholder="${esc(S('Optional comment','Komentārs (nav obligāts)'))}" value="${esc(c.comment||'')}" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="gp.updateShareComment(${i},this.value)"></div>`:''}</div>`).join('');setHTML(root,`<div class="dialog-backdrop share-summary-backdrop"><div class="dialog share-summary-dialog">${conclusion}<div class="share-section-head"><div class="title share-section-title">${esc(S('Share','Kopīgot'))}</div><div class="small">${esc(signed?S('Nothing is shared automatically.','Nekas netiek kopīgots automātiski.'):S('Sign in under Friends to share future workouts.','Pieslēdzies sadaļā Draugi, lai kopīgotu turpmākos treniņus.'))}</div></div><div class="share-card-stack">${cards}</div><div class="dialog-actions"><button class="secondary" onclick="gp.closeShareSummary()">${esc(S('Done','Pabeigts'))}</button>${signed?`<button onclick="gp.publishShareSummary()" ${d.cards.some(c=>c.selected)?'':'disabled'}>${esc(S('Publish selected','Publicēt izvēlēto'))}</button>`:''}</div></div></div>`);if(preserveScroll)requestAnimationFrame(()=>{const dialog=root.querySelector('.share-summary-dialog');if(dialog)dialog.scrollTop=savedScroll;window.scrollTo(0,savedPageY);});}
function toggleShareCard(i){
 const d=window.__gpShareDraft;if(!d?.cards[i])return;
 const card=d.cards[i],selected=card.selected=!card.selected;
 const cards=document.querySelectorAll('.share-summary-card'),node=cards[i];
 if(!node){renderShareSummary({preserveScroll:true});return;}
 node.classList.toggle('selected',selected);
 const toggle=node.querySelector('.share-toggle');if(toggle){toggle.classList.toggle('on',selected);toggle.setAttribute('aria-pressed',String(selected));}
 let wrap=node.querySelector('.share-comment-reveal');
 if(!wrap){wrap=document.createElement('div');wrap.className='share-comment-reveal';
   const input=document.createElement('input');input.className='share-comment';input.maxLength=500;input.autocapitalize='sentences';input.placeholder=S('Optional comment','Komentārs (nav obligāts)');input.value=card.comment||'';
   input.addEventListener('click',event=>event.stopPropagation());input.addEventListener('keydown',event=>event.stopPropagation());
   input.addEventListener('input',event=>updateShareComment(i,event.target.value));wrap.append(input);node.append(wrap);
 }
 wrap.classList.toggle('open',selected);wrap.setAttribute('aria-hidden',String(!selected));
 const publish=document.querySelector('.share-summary-dialog .dialog-actions button:last-child');
 if(publish&&publish.textContent.includes(S('Publish selected','Publicēt izvēlēto')))publish.disabled=!d.cards.some(c=>c.selected);
}
function updateShareComment(i,v){const d=window.__gpShareDraft;if(d?.cards[i])d.cards[i].comment=String(v||'').slice(0,500);}
async function publishShareSummary(){const d=window.__gpShareDraft;if(!d)return;const chosen=d.cards.filter(c=>c.selected).map(c=>({...c.event,comment:c.comment?.trim()||null}));if(!chosen.length){closeShareSummary();return;}try{await publishEvents(chosen);toast(S('Shared with friends.','Kopīgots ar draugiem.'));void refreshSocialBadge();closeShareSummary();}catch(e){toast(socialErrorMessage(e));}}
function closeShareSummary(){document.querySelector('.finish-fireworks')?.remove();const d=window.__gpShareDraft;window.__gpShareDraft=null;document.body.classList.remove('workout-summary-open');closeDialog();if(d&&state.app_state.motivationEnabled&&Number.isFinite(Number(d.finishedAt)))setTimeout(()=>showNextSessionPrompt(Number(d.finishedAt)),100);}

async function confirmNow(){const f=window.__gpConfirm;if(f)return await f();}function cancelConfirm(){const f=window.__gpCancel;closeDialog();if(f)f();}async function formConfirm(){try{await window.__gpFormConfirm?.();}catch(e){console.error('Form save failed',e);toast(`${S('Could not save','Neizdevās saglabāt')}: ${e?.message||e}`);}}

window.addEventListener('scroll',()=>{if(route.name==='friends'&&socialSignedIn()&&socialUi.hasMore&&!socialUi.loadingFeed&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-320)void loadMoreFriendsFeed();},{passive:true});

// Platform lifecycle and account workspace boundaries.
function reportAppError(error){console.error(error);if(error instanceof StaleWorkspaceError)writeBlocked=true;const message=error instanceof StaleWorkspaceError?S('Another tab saved changes. Download a backup of this tab, then reload.','Cita cilne saglabāja izmaiņas. Lejupielādē šīs cilnes rezerves kopiju un pārlādē.'):String(error?.message||error);if(state)toast(message,8000);}
async function switchAccountWorkspace(){
  ++accountBootstrapSerial;
  await workspaceLifecycle.run(async()=>{
 writeBlocked=true;
 if(trainingSyncTimer){clearTimeout(trainingSyncTimer);trainingSyncTimer=null;}trainingSyncReviewToken++;const owner=socialUser()?.id||null,authVersion=authGeneration(),target=owner?'account:'+owner:'guest';
 const loaded=await setWorkspace(target);if(authGeneration()!==authVersion||socialUser()?.id!==owner&&!(owner===null&&!socialUser())||currentWorkspace()!==target)return;
 const initial=defaults();Object.assign(initial.app_state,originalDevicePreferences(state));state=loaded?normalize(loaded):normalize(initial);stateWorkspace=target;writeBlocked=false;if(owner)state.sync_foundation.accountId=owner;
 resetWorkoutStepHistory();socialDeletePending.clear();socialUi={profile:null,friends:[],requests:[],notifications:[],feed:[],timeline:[],loading:false,loaded:false,hasMore:true,beforeAt:null,beforeId:null,unseen:false,friendsExpanded:false,timelineDays:null,timelineEndMs:null,compareFriendId:null,compareExercises:[],compareExerciseId:null,comparePoints:[],compareExpanded:false,comparisonPref:{allowed:false,revision:0,loaded:false}};
 accountBootstrapStatus=owner?'loading':'ready';
 for(const key of Object.keys(window).filter(k=>k.startsWith('__gp')))try{delete window[key];}catch{}
 $('#dialog-root')?.replaceChildren();document.body.classList.remove('workout-summary-open');route={name:'home',id:null};ui.selectedWorkoutId=state.app_state.nextWorkoutId;render();
 });
 if(socialSignedIn())await bootstrapAccountHistory();
 await refreshOfflineAttachmentStatus();
}
async function setSound(value){state.app_state.soundEnabled=!!value;if(value)void enableAudio();await persist();syncWorkoutAlarmPlan();render();}
async function setWorkoutSoundPreference(key,value){
  const allowed=new Set(['workoutWarningSeconds','workoutCountdownEnabled','warmupSoundEnabled','exerciseReminderSoundEnabled']);
  if(!allowed.has(key))return;
  const options=[0,10,15,30,45,60];
  state.app_state[key]=key==='workoutWarningSeconds'?(options.includes(Number(value))?Number(value):30):!!value;
  await persist();syncWorkoutAlarmPlan();render();
}
async function testWorkoutSound(){
  await enableAudio();beepPattern('ready');
  toast(S('If you hear no sound, check the audio permission and output on this device.','Ja skaņu nedzirdi, pārbaudi audio atļaujas un izvadi šajā ierīcē.'));
}
async function openRecovery(){const copies=await recoveryList();openDialog(`<h2>${esc(S('Recovery copies','Atkopšanas kopijas'))}</h2>${copies.length?copies.map(c=>`<div class="card"><div>${esc(dateTime(c.createdAt))}</div><div class="small">${esc(c.key)}</div><button class="secondary full" onclick="gp.restoreRecovery('${esc(c.key)}')">${esc(S('Review restore','Pārskatīt atjaunošanu'))}</button></div>`).join(''):`<p>${esc(S('No recovery copies.','Nav atkopšanas kopiju.'))}</p>`}<button class="secondary full" onclick="gp.exportOriginalLocal()">${esc(S('Export original app data','Eksportēt sākotnējās lietotnes datus'))}</button><div class="dialog-actions"><button onclick="gp.closeDialog()">${esc(S('Close','Aizvērt'))}</button></div>`);}
async function exportOriginalLocal(){const original=await readOriginalLocalState();if(!original){toast(S('No original local data found.','Sākotnējie lokālie dati nav atrasti.'));return;}exportTextFile('GymProgress-original-local-backup.json',JSON.stringify(originalLocalBackup(original),null,2));toast(S('Original local data exported.','Sākotnējie lokālie dati eksportēti.'));}

async function restoreRecovery(key){const saved=await loadRecoveryState(key);if(!saved)throw new Error(S('Recovery copy not found','Atkopšanas kopija nav atrasta'));return restoreFile(new Blob([JSON.stringify(createBackup(saved))],{type:'application/json'}));}
let updateOnInitialRefresh=!globalThis.GymProgressAndroid,serviceRegistration=null,serviceRegistrationPromise=null,updateActivationInFlight=false,autoUpdateTimer=null,releaseCheckInFlight=null,lastReleaseCheck=0,releaseCandidateVerified=false,lastReleaseIssue='',lastPublishedRelease='',releaseStartupCheckPending=(!globalThis.GymProgressAndroid&&'serviceWorker' in navigator);
// Update availability is independent of cloud sync *status*. A deferred remote
// record is not a workout and cannot permanently veto a verified PWA update.
// Only actual in-flight saves, active workouts, dirty forms, dialogs and other
// open app windows can prevent activation.
function updateSafety(){return updateGate({state,authenticated:socialSignedIn(),bootstrapStatus:accountBootstrapStatus,
 syncInFlight:!!trainingSyncInFlight,writeBlocked,workspaceTransition,
 dialogOpen:!!document.querySelector('#dialog-root .dialog-backdrop'),
 dirty:!!document.querySelector('input[data-ui-dirty="true"],textarea[data-ui-dirty="true"],select[data-ui-dirty="true"]')});}
function updateHasPendingWork(){return !updateSafety().safe;}
// A verified release discovered while the app is already open is offered
// non-intrusively. Only an explicit tap activates it; never mid-workout or
// while local account changes are awaiting upload. No recovery/diagnostic link.
function updateReadyBanner(){
 if(globalThis.GymProgressAndroid||!releaseCandidateVerified||!serviceRegistration?.waiting||updateOnInitialRefresh||updateHasPendingWork())return '';
 return `<div class="update-ready-banner" role="status"><span>${esc(S('A new version is ready.','Ir pieejama jauna versija.'))}</span><button class="secondary" onclick="gp.applyPendingUpdate()">${esc(S('Update now','Atjaunināt tagad'))}</button></div>`;
}
function scheduleAutomaticUpdate(){
 if(autoUpdateTimer)clearTimeout(autoUpdateTimer);
 // Account startup/sync is transient: preserve the refresh intent until it finishes.
 // A workout, unsaved input, unresolved upload or an explicit dialog instead
 // defers the switch to a visible Update now notice rather than switching later.
 if(updateOnInitialRefresh&&releaseCandidateVerified&&serviceRegistration?.waiting&&updateHasPendingWork()){
  const reason=updateSafety().reason;
  if(!preserveRefreshUpdateIntent(reason))updateOnInitialRefresh=false;
 }
 if(!updateOnInitialRefresh||!releaseCandidateVerified||!serviceRegistration?.waiting||updateActivationInFlight||updateHasPendingWork())return;
 autoUpdateTimer=setTimeout(()=>{autoUpdateTimer=null;if(updateOnInitialRefresh&&releaseCandidateVerified&&serviceRegistration?.waiting&&!updateHasPendingWork()){updateOnInitialRefresh=false;void applyPendingUpdate({automatic:true});}},500);
}
// Explicitly ask the browser to fetch sw.js. Merely looking at .waiting is
// insufficient in Firefox; its update check might not have happened yet.
async function refreshRelease({force=false}={}){
 if(!serviceRegistration)return {kind:'unavailable'};
 if(releaseCheckInFlight)return releaseCheckInFlight;
 if(!force&&Date.now()-lastReleaseCheck<60000)return {kind:releaseCandidateVerified?'waiting':'current'};
 lastReleaseCheck=Date.now();releaseCandidateVerified=false;
 const task=(async()=>{
  const published=await inspectPublishedRelease();
  if(published.kind==='error'){
   lastReleaseIssue=published.message;console.warn('PWA publication invalid:',published.message);
   return published;
  }
  lastPublishedRelease=published.id;
  if(compareVersions(published.version,APP_VERSION)<0){
   lastReleaseIssue='Published website is older than the installed app. Refusing a downgrade.';
   return {kind:'error',message:lastReleaseIssue};
  }
  const result=await checkForWaitingRelease(serviceRegistration,{timeoutMs:20000});
  if(result.kind==='waiting'){
   const pending=await readWorkerRelease(serviceRegistration.waiting);
   if(!pending||pending.id!==published.id){
    lastReleaseIssue='The waiting service worker is not the published verified release. Check the website deployment.';
    return {kind:'error',message:lastReleaseIssue};
   }
   releaseCandidateVerified=true;lastReleaseIssue='';scheduleAutomaticUpdate();
  }else if(result.kind==='error'){
   lastReleaseIssue=result.message;console.warn('App release check failed:',result.message);
  }else lastReleaseIssue='';
  if((route.name==='home'||route.name==='settings')&&!updateHasPendingWork())render();
  return result;
 })();
 releaseCheckInFlight=task;
 try{return await task;}finally{if(releaseCheckInFlight===task)releaseCheckInFlight=null;}
}
async function registerServiceWorker(){
 if(serviceRegistrationPromise)return serviceRegistrationPromise;
 if(!('serviceWorker'in navigator))return null;
 serviceRegistrationPromise=(async()=>{
  serviceRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  const show=()=>{
   if(!serviceRegistration?.waiting)return;
   if(!releaseCandidateVerified)return;
   if(updateHasPendingWork())toast(S('An update is ready. Finish your workout and sync, then refresh or select Update now in Settings.','Atjauninājums ir gatavs. Pabeidz treniņu un sinhronizē, tad pārlādē vai izvēlies Atjaunināt tagad Iestatījumos.'));
   else {scheduleAutomaticUpdate();if(route.name==='home'&&!updateOnInitialRefresh)render();}
  };
  // Never activate a pre-existing waiting worker before comparing it with
  // the uncached public release proof.
  serviceRegistration.addEventListener('updatefound',()=>{
   const installing=serviceRegistration.installing;
   installing?.addEventListener('statechange',show);
  });
  navigator.serviceWorker.addEventListener('message',event=>{
   if(event.data?.type!=='CHECK_UPDATE_STATE'||!event.ports?.[0])return;
   event.ports[0].postMessage({type:'UPDATE_STATE',safe:!updateHasPendingWork()&&!updateActivationInFlight});
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(!updateActivationInFlight&&!updateHasPendingWork())location.reload();
  });
  // Firefox can keep a long-lived, controlled tab alive for days. Recheck
  // when it becomes foregrounded and periodically; never clear site data.
  backgroundHandles.push(setInterval(()=>{if(!document.hidden)void refreshRelease();},15*60*1000));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshRelease();});
  window.addEventListener('online',()=>void refreshRelease({force:true}));
  void refreshRelease({force:true}).finally(()=>{releaseStartupCheckPending=false;if(route.name==='home')render();});
  return serviceRegistration;
 })().catch(error=>{serviceRegistrationPromise=null;releaseStartupCheckPending=false;console.warn('Offline cache registration failed',error);if(route.name==='home')render();return null;});
 return serviceRegistrationPromise;
}
async function applyPendingUpdate({automatic=false}={}){
 if(updateActivationInFlight)return;
 if(!automatic){
  if(!serviceRegistration)await registerServiceWorker();
  if(!serviceRegistration){toast(S('Update checks are unavailable in this browser.','Atjauninājumu pārbaude šajā pārlūkā nav pieejama.'),7000);return;}
  if(!releaseCandidateVerified){
   toast(S('Checking for an update…','Pārbauda atjauninājumus…'));
   const check=await refreshRelease({force:true});
   if(check.kind==='error'){toast(S('Update check failed. Check your connection and try again.','Atjauninājuma pārbaude neizdevās. Pārbaudi savienojumu un mēģini vēlreiz.'),7000);return;}
  }
 }
 const waiting=releaseCandidateVerified?serviceRegistration?.waiting:null;
 if(!waiting){if(!automatic)toast(S('No newer verified release is waiting.','Nav gaidoša jaunāka pārbaudīta laidiena.'));return;}
 if(updateHasPendingWork()){
  if(!automatic)toast(S('Finish or save your current work before updating. If another dialog is open, close it first.','Pirms atjaunināšanas saglabā iesākto. Ja ir atvērts dialogs, vispirms aizver to.'),7000);
  return;
 }
 const captured=state,version=localGeneration,dialogRoot=$('#dialog-root'),previousAppInert=appEl.inert,previousDialogInert=dialogRoot?.inert;
 let channel=null,timer=null,controllerListener=null,sent=false,uncertain=false;
 updateActivationInFlight=true;
 try{
  await persist();await flushSaves();
  if(state!==captured||localGeneration!==version||updateHasPendingWork()||!releaseCandidateVerified||serviceRegistration?.waiting!==waiting){toast(S('The app changed. Review the current state before updating.','Lietotnes stāvoklis ir mainījies. Pirms atjaunināšanas pārbaudi to.'));return;}
  appEl.inert=true;if(dialogRoot)dialogRoot.inert=true;
  if(!automatic)toast(S('Preparing update…','Sagatavo atjauninājumu…'),20000);
  channel=new MessageChannel();
  await new Promise((resolve,reject)=>{
   let accepted=false,controllerChanged=false;
   const done=()=>{if(accepted&&controllerChanged)resolve();};
   controllerListener=()=>{controllerChanged=true;done();};
   navigator.serviceWorker.addEventListener('controllerchange',controllerListener);
   channel.port1.onmessage=event=>{
    const result=event.data;if(result?.type!=='ACTIVATE_RELEASE_RESULT')return;
    if(result.ok===true){accepted=true;done();return;}
    const error=new Error(result.code||'ACTIVATION_FAILED');error.code=result.code||'ACTIVATION_FAILED';reject(error);
   };
   timer=setTimeout(()=>{const error=new Error('UPDATE_TIMEOUT');error.code='UPDATE_TIMEOUT';reject(error);},25000);
   waiting.postMessage({type:'ACTIVATE_RELEASE',workoutActive:false,unsavedChanges:false},[channel.port2]);sent=true;
  });
  location.reload();
 }catch(error){
  if(sent&&error.code==='UPDATE_TIMEOUT'){
   uncertain=true;if(dialogRoot)dialogRoot.inert=false;
   openDialog(`<h2>${esc(S('Reload to continue','Pārlādē, lai turpinātu'))}</h2><p>${esc(S('The update could not be confirmed. Reload this tab before continuing. Your saved data is retained.','Atjauninājumu neizdevās apstiprināt. Pirms turpināšanas pārlādē šo cilni. Saglabātie dati ir saglabāti.'))}</p><div class="dialog-actions"><button id="reload-after-update">${esc(S('Reload this tab','Pārlādēt šo cilni'))}</button></div>`);
   $('#reload-after-update')?.addEventListener('click',()=>location.reload());
  }else if(['OTHER_WINDOW_BUSY','UNCONFIRMED_WINDOW'].includes(error.code)){
   if(!automatic)toast(S('Another Gym Progress tab cannot confirm that it is idle. Close other tabs and try again; do not clear site data.','Cita Gym Progress cilne nevar apstiprināt, ka tā ir brīva. Aizver citas cilnes un mēģini vēlreiz; nedzēs vietnes datus.'),9000);
  }else if(error.code==='ACTIVE_WORKOUT')toast(S('Finish your workout before applying an update.','Pirms atjaunināšanas pabeidz treniņu.'));
  else toast(S('The update was not applied. Try again in Settings.','Atjauninājums netika lietots. Mēģini vēlreiz Iestatījumos.'),7000);
 }finally{
  if(timer)clearTimeout(timer);channel?.port1.close();channel?.port2.close();
  if(controllerListener)navigator.serviceWorker.removeEventListener('controllerchange',controllerListener);
  if(!uncertain){appEl.inert=previousAppInert;if(dialogRoot)dialogRoot.inert=previousDialogInert;updateActivationInFlight=false;}
 }
}
function openCardioEntry(){
 const draft=runtime()?.cardioDraft;if(!draft)return;
 const optional=(key,label,attributes='')=>`<div><label class="field" for="cardio-${key}">${esc(label)}</label><div class="cardio-optional-field ${draft.unavailable[key]?'is-na':''}"><input id="cardio-${key}" type="${draft.unavailable[key]?'text':'number'}" ${attributes} inputmode="decimal" placeholder="" value="${esc(draft.unavailable[key]?'-':draft.values[key])}" ${draft.unavailable[key]?'disabled':''} oninput="gp.updateCardioDraft()"><button type="button" class="secondary ${draft.unavailable[key]?'cardio-na-selected':''}" aria-pressed="${!!draft.unavailable[key]}" onclick="gp.toggleCardioNA('cardio-${key}')">N/A</button></div></div>`;
 const rpeOptions=Array.from({length:10},(_,i)=>`<option value="${i+1}" ${String(draft.values.rpe)===String(i+1)?'selected':''}>${i+1}</option>`).join('');
 openDialog(`<h2>${esc(S('Record cardio activity','Reģistrēt kardio aktivitāti'))}</h2><div class="small">${esc(S('Duration','Ilgums'))}: ${formatDuration(draft.durationSeconds*1000)}</div><div class="form-grid cardio-fields">${optional('distance',S('Distance (km)','Distance (km)'),'min="0" step="any"')}${optional('hr',S('Average HR (bpm)','Vidējais pulss (sit./min)'),'min="30" max="240" step="1"')}${optional('power',S('Average power (W)','Vidējā jauda (W)'),'min="1" max="2500" step="1"')}<div><label class="field" for="cardio-rpe" data-i18n="RPE (1–10)">RPE (1–10)</label><div class="cardio-optional-field ${draft.unavailable.rpe?'is-na':''}"><select id="cardio-rpe" aria-label="RPE" onchange="gp.updateCardioDraft()" ${draft.unavailable.rpe?'disabled':''}><option value="" hidden disabled ${draft.unavailable.rpe||!draft.values.rpe?'selected':''}>${draft.unavailable.rpe?'–':''}</option>${rpeOptions}</select><button type="button" class="secondary ${draft.unavailable.rpe?'cardio-na-selected':''}" aria-pressed="${!!draft.unavailable.rpe}" onclick="gp.toggleCardioNA('cardio-rpe')">N/A</button></div></div></div><div class="small cardio-rpe-explanation">${esc(S('Rate of Perceived Exertion: 1 = very easy, 5 = moderate, 10 = maximal effort. Rate the whole activity.','Subjektīvā piepūles skala: 1 = ļoti viegli, 5 = mēreni, 10 = maksimāla piepūle. Vērtē visu aktivitāti.'))}</div><div id="cardio-validation-error" class="cardio-validation-error" role="alert" aria-live="polite"></div><div class="dialog-actions"><button class="secondary" onclick="gp.cancelCardioSet()">${esc(S('Back','Atgriezties'))}</button><button onclick="gp.saveCardioSet()">${esc(S('Save activity','Saglabāt aktivitāti'))}</button></div>`);
 updateLiveClocks();
}
async function updateCardioDraft(){const draft=runtime()?.cardioDraft;if(!draft)return;for(const key of ['distance','hr','power','rpe']){const input=$('#cardio-'+key);if(!input)continue;draft.unavailable[key]=input.disabled;draft.values[key]=input.disabled?'':input.value;}await persist();}
function redoLastSet(){
 if(canRedoWorkoutStep(state)){
  const session=runtime()?.sessionId;
  confirmDialog(S('Redo workout step?','Atkārtot treniņa soli?'),S('Restore the previous change without changing the overall workout timer.','Atjaunot izmaiņu, nemainot kopējo treniņa laiku.'),S('Redo','Atjaunot'),async()=>{
   if(runtime()?.sessionId!==session||!canRedoWorkoutStep(state)){closeDialog();return;}
   clearPostSetPrompts();closeDialog();const action=redoWorkoutStep(state);if(!action)return;await persist();render();toast(S('Workout step restored','Treniņa solis atjaunots'));
  });return;
 }
 const revision=currentRedoRevision();if(!revision)return;
 const capturedState=state,version=localGeneration;
 confirmDialog(S('Restore the recorded set?','Atjaunot saglabāto piegājienu?'),S('The saved weight, reps and workout position will be restored. You can undo this again.','Tiks atjaunots saglabātais svars, atkārtojumi un treniņa solis. To varēs atkal atsaukt.'),S('Redo','Atjaunot'),async()=>{
  if(capturedState!==state||version!==localGeneration||currentRedoRevision()?.id!==revision.id){closeDialog();toast(S('The workout changed. Redo is no longer available.','Treniņš ir mainījies. Atjaunošana vairs nav pieejama.'));return;}
  clearPostSetPrompts();closeDialog();restoreCheckpoint(state,revision.before);revision.redoneAt=now();await persist();render();
  if(runtime()?.phase==='CARDIO_ENTRY')openCardioEntry();
 });
}
export function getAppSnapshot(){return clone(state);}
export const runMaintenanceTick=tick;
export function stopApp(){clearInterval(tickHandle);for(const h of backgroundHandles)clearInterval(h);if(trainingSyncTimer)clearTimeout(trainingSyncTimer);releaseWakeLock();}

function calibrateExercise(id){const target=getSessionExercise(id);if(!target)return;formDialog(S('Working weight','Darba svars'),'<p data-user-content>'+esc(sessionDisplayName(target))+'</p><label class="field" for="calibration-weight">kg</label><input id="calibration-weight" type="text" inputmode="decimal"><div class="small">'+esc(S('Enter the weight you have chosen for this exercise.','Ievadi šim vingrinājumam izvēlēto svaru.'))+'</div>',S('Set weight','Iestatīt svaru'),async()=>{const input=$('#calibration-weight'),raw=input?.value?.trim(),weight=recommendationWeight(raw);if(weight==null||weight>100000){toast(S('Enter a valid working weight.','Ievadi derīgu darba svaru.'));return;}if(currentActiveContext().e?.sessionId!==target.sessionId)throw new Error('Workout changed');target.plannedWeightKg=weight;target.requiresCalibration=false;target.rampPlanJson=JSON.stringify(recommendRamp(weight,target.targetReps,target.exerciseType,target.exerciseKey,target.name,target.equipment,state.app_state.maxRampUpSets));for(const set of exerciseSets(state,id).filter(x=>x.status==='PENDING'))set.plannedWeightKg=weight;const template=state.template_exercises.find(t=>t.id===target.templateExerciseId);if(template){template.initialWeightKg=weight;template.requiresCalibration=false;template.weightSource='USER_ENTERED';}runtime().workingWeight=weight;await persist();closeDialog();await beginPreparedExercise();});}

// Historical remote records with missing parents remain in the private local
// diagnostic quarantine. They are never fabricated into training sessions.
// The sync engine retries their original UUID references when true parents arrive.

function openSupportReport(kind='bug'){
 const bug=kind==='bug';
 window.__gpSupportDraft={kind,requestId:globalThis.crypto?.randomUUID?.()||uuid(),sending:false};
 openDialog(`<h2>${esc(bug?S('Report a problem','Ziņot par problēmu'):S('Send feedback','Nosūtīt atsauksmi'))}</h2>
  <p class="small">${esc(bug?S('Describe what went wrong and what you expected to happen.','Apraksti, kas notika un kādam bija jābūt rezultātam.'):S('Share an idea or suggestion for Gym Progress.','Pastāsti savu ideju vai ieteikumu par Gym Progress.'))}</p>
  <textarea id="gp-support-message" rows="5" maxlength="3000" aria-label="${esc(S('Message','Ziņojums'))}" placeholder="${esc(bug?S('What happened?','Kas notika?'):S('Your feedback','Tava atsauksme'))}"></textarea>
  <label class="setting-toggle-row"><span class="setting-toggle-copy"><strong>${esc(S('Include basic app diagnostics','Pievienot lietotnes pamatdiagnostiku'))}</strong>
  <small>${esc(S('Optional: app version, platform, language and current section. Only record counts, never workouts, emails, account details or training values.','Neobligāti: lietotnes versija, platforma, valoda un atvērtā sadaļa. Tikai ierakstu skaits; bez treniņiem, e-pastiem, konta datiem un rezultātiem.'))}</small></span>
  <input id="gp-support-diagnostics" type="checkbox"></label>
  <p class="small">${esc(S('Sent only when you press Send. An account and internet connection are required. Avoid including passwords or sensitive personal information.','Nosūta tikai pēc pogas Nosūtīt nospiešanas. Nepieciešams konts un interneta savienojums. Neiekļauj paroles vai sensitīvus personas datus.'))}</p>
  <div class="dialog-actions"><button class="secondary" onclick="gp.closeDialog()">${esc(S('Cancel','Atcelt'))}</button>
  <button id="gp-support-send" onclick="gp.sendSupportReport()">${esc(S('Send','Nosūtīt'))}</button></div>`);
}
async function sendSupportReportFromUi(){
 const draft=window.__gpSupportDraft;
 if(!draft||draft.sending)return;
 const message=$('#gp-support-message')?.value||'';
 try{validateSupportMessage(draft.kind,message);}catch(error){toast(S('Enter at least 10 and at most 3000 characters.','Ievadi no 10 līdz 3000 rakstzīmēm.'),5000);return;}
 if(!socialSignedIn()){toast(S('Sign in to send a report. Your text will remain here.','Pieraksties, lai nosūtītu ziņojumu. Teksts paliks šajā logā.'),6000);return;}
 if(globalThis.navigator?.onLine===false){toast(S('No internet connection. Copy your message before leaving this screen.','Nav interneta savienojuma. Pirms aizvēršanas nokopē savu ziņojumu.'),6000);return;}
 draft.sending=true;const btn=$('#gp-support-send');if(btn)btn.disabled=true;
 const account=socialUser()?.id,generation=authGeneration();
 try{
  const include=$('#gp-support-diagnostics')?.checked===true;
  const result=await sendSupportReport(rpc,{kind:draft.kind,message,requestId:draft.requestId,includeDiagnostics:include,
   diagnostics:supportDiagnostics({version:APP_VERSION,platform:globalThis.GymProgressAndroid?'Android':'PWA',locale:languageCode(state),screen:route.name,
    pending_count:state?.sync_foundation?.outbox?.length||0,orphan_count:(state?.sync_foundation?.deferredRemote?.length||0)+(state?.sync_foundation?.reviewArchive?.length||0),
    conflict_count:state?.sync_foundation?.conflicts?.filter(x=>!x.resolution)?.length||0})});
  if(socialUser()?.id!==account||authGeneration()!==generation)throw new Error('Account changed during submission.');
  closeDialog();toast(S('Message sent. Thank you.','Ziņojums nosūtīts. Paldies.'),4500);
 }catch(error){
  const raw=String(error?.message||'');
  toast(/too many|rate.limit|GP_WRITE_LIMIT/i.test(raw)?S('Too many reports. Please try again later.','Pārāk daudz ziņojumu. Mēģini vēlāk.'):S('Could not send. Please try again; the message remains here.','Neizdevās nosūtīt. Mēģini vēlreiz; teksts paliek šeit.'),6500);
 }finally{draft.sending=false;if(btn?.isConnected)btn.disabled=false;}
}
function openSyncConflictReview(){const conflicts=listTrainingSyncConflicts(state);if(!conflicts.length){toast(S('No unresolved conflicts.','Nav neatrisinātu konfliktu.'));return;}window.__gpConflictReview=conflicts;openDialog('<h2>'+esc(S('Review sync conflicts','Pārskatīt sinhronizācijas konfliktus'))+'</h2>'+conflicts.map((conflict,index)=>{const local=conflict.local?.payload,cloud=conflict.remote?.payload,keys=[...new Set([...Object.keys(local||{}),...Object.keys(cloud||{})])].filter(key=>fingerprint(local?.[key])!==fingerprint(cloud?.[key]));const display=value=>value==null?'—':typeof value==='object'?JSON.stringify(value):String(value);const name=local?.name||local?.displayName||local?.workoutName||cloud?.name||cloud?.displayName||cloud?.workoutName||conflict.entityType;return '<section class="card"><h3 data-user-content>'+esc(name)+'</h3><div class="data-table-wrap"><table class="data-table"><thead><tr><th>'+esc(S('Field','Lauks'))+'</th><th>'+esc(S('This device','Šī ierīce'))+'</th><th>'+esc(S('Cloud','Mākonis'))+'</th></tr></thead><tbody>'+keys.map(key=>'<tr><th>'+esc(key)+'</th><td>'+esc(display(local?.[key]))+'</td><td>'+esc(display(cloud?.[key]))+'</td></tr>').join('')+'</tbody></table></div>'+(!local||!cloud?'<p>'+esc(!local?S('Local version is deleted.','Lokālā versija ir dzēsta.'):S('Cloud version is deleted.','Mākoņa versija ir dzēsta.'))+'</p>':'')+'<div class="dialog-actions"><button class="secondary" onclick="gp.chooseSyncConflict('+index+',\'local\')">'+esc(S('Keep local','Paturēt lokālo'))+'</button><button class="secondary" onclick="gp.chooseSyncConflict('+index+',\'cloud\')">'+esc(S('Use cloud','Izmantot mākoni'))+'</button></div></section>';}).join('')+'<div class="dialog-actions"><button onclick="gp.closeDialog()">'+esc(S('Close','Aizvērt'))+'</button></div>');}
async function chooseSyncConflict(index,choice){const conflict=window.__gpConflictReview?.[index],captured=state;if(!conflict)return;await resolveTrainingSyncConflict(captured,conflict.id,choice,{persist:async value=>{if(value!==state)throw new Error('Workspace changed');await saveState(value);},isCurrent:value=>value===state,expectedLocalRevision:conflict.local.localRevision});closeDialog();render();if(listTrainingSyncConflicts(state).length)openSyncConflictReview();else await performTrainingSync({reason:'manual'});}
async function eraseScopedData(scope){const original=state,storeScope=stateWorkspace,authVersion=authGeneration(),owner=socialUser()?.id;return workspaceLifecycle.run(async()=>{const guard=()=>{if(state!==original||currentWorkspace()!==storeScope||stateWorkspace!==storeScope||authGeneration()!==authVersion||socialUser()?.id!==owner)throw new Error('Account changed during deletion');};guard();suppressTrainingSyncSchedule=true;let result=null;try{const next=clone(original);if(owner){const status=await getWorkspaceStatus({refresh:true});guard();Object.assign(next.sync_foundation,{workspaceId:status.workspace_id,legacyOwnerId:status.legacy_owner_id,eraseEpoch:status.erase_epoch});result=await eraseMyCloudTraining(scope);guard();}if(scope==='all'){for(const name of ['workout_templates','user_exercises','template_exercises','workout_sessions','session_exercises','performed_sets','tracker_items','tracker_states','tracker_entries'])next[name]=[];next.app_state.nextWorkoutId=null;next.app_state.nextSessionAt=null;}else redactWorkoutHistory(next);next.runtime=null;if(scope==='all'){next.revisions=[];delete next.v2;delete next.integrity;delete next.analysisHistory;}next.app_state.lastInactivityReminderFor=null;if(result)resetAfterCloudErasure(next,result,{scope});else ensureSyncFoundation(next);if(scope==='all')await purgeRecoveryStates({expectedWorkspace:storeScope});else await redactRecoveryHistory({expectedWorkspace:storeScope});guard();await saveState(next,{expectedWorkspace:storeScope});guard();state=next;}catch(error){if(result?.ok){error.cloudErased=true;if(state===original){state.sync_foundation.blocked={code:'LOCAL_ERASE_PENDING',serverEpoch:result.erase_epoch,scope};await saveState(state,{expectedWorkspace:storeScope}).catch(()=>{});}error.message=S('Cloud data was erased; local cleanup needs retry.','Mākoņa dati ir dzēsti; lokālā tīrīšana jāatkārto.')+' '+error.message;}throw error;}finally{suppressTrainingSyncSchedule=false;}});}

window.gp={nativeWorkoutAlarmStatusResult,openProgressExercisePicker,filterProgressExerciseOptions,chooseProgressExercise,nativeNotificationPermissionResult,testAndroidSound,editUsername,saveUsername,openComparisonSettings,maybeOfferOfflineAttachment,attachOfflineNow,handleSystemBack,requestBackgroundAlerts,refreshAndroidAlerts,retryInitialSync,exportOriginalLocal,openProgressEntry,retryDeletedAccountCleanup,openSupportReport,sendSupportReport:sendSupportReportFromUi,openSyncConflictReview,chooseSyncConflict,setSound,setWorkoutSoundPreference,testWorkoutSound,openRecovery,restoreRecovery,updateCardioDraft,redoLastSet,applyPendingUpdate,cancelSetEntry,beginPreparedExercise,backToExerciseChoice,validateReplacementWeight,toggleCardioNA,dismissUpdateAnnouncement,openAccount,requestDeleteAccount,openTrainingSyncReview,confirmTrainingSync,nav,selectWorkout,toggleWorkoutDetails,requestStart,startWorkout,resume,changeRirThreshold,changeMaxRampSets,changeTargetRirMin,changeTargetRirMax,setRirInputMax,setLanguage,openStarterWizard,starterSelectValue,renderStarterWizard,finishStarterProgramme,starterManualSetup,dismissStarterForNow,toggleAwake,toggleLastSetZeroRirAcceptable,toggleMotivation,changeInactivityDays,setReminderTime,requestNotificationPermission,openTrackerSettings,setTrackerNotifications,deleteTrackerItem,editTrackerItem,adjustTracker,setTrackerAmount,scheduleNextSession,skipNextSession,rescheduleNextSession,editDifficulty,addWorkout,renameWorkout,moveWorkout,deleteWorkout,addExercise,editExercise,exerciseExistingChanged,exerciseNameChanged,exerciseTrackingChanged,exerciseEquipmentChanged,exerciseTypeChanged,setCatalogueLinkForExercise,saveCatalogueLink,unlinkCatalogueExercise,applyCatalogueChoice,exerciseFormChangeLink,exerciseFormUnlink,joinSuperset,splitSuperset,moveExerciseBlock,moveExercise,deleteExercise,deleteSession,moreLogs,setProgressRange,setProgressExercise,setProgressMetric,setCustomStart,setCustomEnd,finishWarmup,startRamp,skipRamp,disableRampPermanently,finishRamp,startTimedSet,finishTimedSet,saveCardioSet,cancelCardioSet,adjustWeight,customWeight,adjustSupersetWeight,customSupersetWeight,toggleSupersetTimed,supersetComplete,adjustSupersetEntryReps,setSupersetRir,saveSupersetSet,skipSupersetSet,skipSuperset,setComplete,adjustEntryReps,setRir,saveSet,finishUnload,shiftRest,skipRest,skipSet,skipExercise,requestPostponeExercise,postponeExercise,requestReplaceExercise,selectReplacement,confirmReplacement,finishStretch,finishAndSave,closeWorkoutCelebration,applyAutoregulation,keepAutoregulationCurrent,applyFutureAdjustment,keepFutureAdjustmentCurrent,shiftFutureAdjustment,shiftProgression,acceptProgressionEdited,shiftProgressionReps,acceptProgressionReps,keepProgressionCurrent,undoLastSet,requestAbort,finishPartialWorkout,discardActiveWorkout,downloadBackup,pickRestore,restoreFile,downloadCsv,downloadDetailedJson,eraseData,eraseExerciseLogs,closeDialog,confirmNow,cancelConfirm,formConfirm,socialSendCode,socialResendCode,socialVerifyCode,socialSignOut,openAddFriend,lookupSocialFriend,sendSocialFriendRequest,acceptSocialRequest,rejectSocialRequest,removeSocialFriend,editSocialName,saveSocialName,deleteSocialEvent,loadMoreFriendsFeed,toggleFriendsList,setComparisonSharing,openFriendComparison,setFriendCompareExercise,toggleFriendComparison,toggleShareCard,updateShareComment,publishShareSummary,closeShareSummary,saveExerciseNote,skipExerciseNote};


const dispatchCommand=createCommandBus({getState:()=>state,onError:reportAppError});
const serialCommands=new Set(['chooseSyncConflict','confirmHistoryRepair','startWorkout','beginPreparedExercise','finishWarmup','startRamp','skipRamp','finishRamp','startTimedSet','finishTimedSet','saveCardioSet','cancelCardioSet','setComplete','saveSet','saveSupersetSet','supersetComplete','skipSet','skipExercise','skipRest','shiftRest','toggleSupersetTimed','adjustWeight','adjustSupersetWeight','disableRampPermanently','undoLastSet','redoLastSet','finishUnload','finishStretch','finishAndSave','finishPartialWorkout','discardActiveWorkout','confirmNow','formConfirm','socialVerifyCode','confirmTrainingSync']);
for(const name of serialCommands){const fn=window.gp[name];if(fn)window.gp[name]=(...args)=>dispatchCommand(name,async(...params)=>{
 const before=WORKOUT_STEP_ACTIONS.has(name)?captureWorkoutStep(state):null;
 const result=await fn(...params);
 if(before){const after=captureWorkoutStep(state);if(recordWorkoutStep(name,before,after))render();}
 return result;
},args);}
const readOnlyActions=new Set(['handleSystemBack','nav','closeDialog','downloadBackup','downloadCsv','downloadDetailedJson','openRecovery','openSupportReport','sendSupportReport','openAccount','openSyncConflictReview','eraseData','eraseExerciseLogs','confirmNow','cancelConfirm','socialSignOut','retryDeletedAccountCleanup']);
for(const [name,fn] of Object.entries(window.gp)){window.gp[name]=(...args)=>{if(updateActivationInFlight){const error=new Error(S('Reload this tab to finish the update.','Pārlādē šo cilni, lai pabeigtu atjaunināšanu.'));reportAppError(error);return Promise.reject(error);}if((writeBlocked||workspaceTransition||['LOCAL_ERASE_PENDING','ACCOUNT_ERASE_PENDING'].includes(state?.sync_foundation?.blocked?.code))&&!readOnlyActions.has(name)){const error=new Error(writeBlocked?S('Reload this tab before editing. Export a backup first if needed.','Pirms rediģēšanas pārlādē cilni. Ja nepieciešams, vispirms eksportē rezerves kopiju.'):['LOCAL_ERASE_PENDING','ACCOUNT_ERASE_PENDING'].includes(state?.sync_foundation?.blocked?.code)?S('Cloud deletion finished. Retry local cleanup in Settings.','Dzēšana mākonī pabeigta. Atkārto lokālo tīrīšanu iestatījumos.'):S('A workspace change is in progress.','Notiek darbvietas maiņa.'));reportAppError(error);return Promise.reject(error);}return fn(...args);};}
configureActions(()=>window.gp,reportAppError);

export const ready=init().catch(err=>{console.error(err);setHTML(appEl,`<div class="view"><h1>Gym Progress</h1><div class="card danger-zone"><div class="title" data-i18n="Could not start">Could not start</div><div class="note">${esc(err?.message||err)}</div></div></div>`);});
