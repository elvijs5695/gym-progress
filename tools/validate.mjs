import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const f=path.join(dir,e.name);if(e.name==='node_modules')return[];return e.isDirectory()?walk(f):[f];});
const files=walk(root),read=r=>fs.readFileSync(path.join(root,r),'utf8');
const app=read('app.js'),css=read('styles.css'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));
if(pkg.version!=='1.6.0'||!app.includes("APP_VERSION='1.6.0'")||!sw.includes('gym-progress-pwa-v1.6.0'))errors.push('v1.6.0 version markers are inconsistent');
for(const rel of ['progression-intelligence.js','sync-foundation.js','exercise-identity.js','exercise-catalogue.js','exercise-catalogue.json','exercise-migration-map.js','exercise-migration-map.json','performance-rules.json','performance-rule-cases.json','supabase/SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql','supabase/SUPABASE_BACKUP_BEFORE_EXERCISE_MIGRATION.md','supabase/SUPABASE_PRE_MIGRATION_CHECK.sql','supabase/SUPABASE_POST_MIGRATION_VERIFY.sql']) if(!fs.existsSync(path.join(root,rel)))errors.push(`missing release asset: ${rel}`);
if(!app.includes("value:`u:${id}`")||!app.includes("value:`p:${e.programmeExerciseId}`"))errors.push('Progress does not use stable user/programme exercise IDs');
if(!app.includes("if(!(ses?.status==='COMPLETE'||(ses?.status==='ABORTED'&&fullyCompleted)))continue"))errors.push('aborted fully-completed exercises are not included in Progress');
if(!app.includes('qualifyingE1rm')||!read('exercise-identity.js').includes('effective>10'))errors.push('comparison-grade e1RM rules missing');
if(!app.includes('compareWithFriends')||!app.includes('comparisonPointsForSession'))errors.push('programme-selected friend comparison missing');
if(!app.includes('comparisonPointsForSelectedHistory')||!app.includes('syncComparisonHistory')||!read('social-api.js').includes('social_replace_exercise_comparison_points'))errors.push('retroactive comparison-history sync missing');
if(!app.includes('TrackingMode.TIME_ONLY')||!app.includes("rt.phase='TIMED_SET'"))errors.push('timed exercise flow missing');
if(!app.includes('supersetGroupId')||!app.includes('joinSuperset')||!app.includes('splitSuperset')||!app.includes('superset-pulse-grid')||!app.includes('SUPERSET_ENTRY')||!app.includes('saveSupersetSet')||!app.includes('supersetPairSetInfo'))errors.push('paired superset programme/workout flow missing');
if(!app.includes('maxRampUpSets')||!read('exercise-library.js').includes('barbellPlateFriendlyRamp'))errors.push('max/plate-friendly ramp logic missing');
if(!app.includes('disableRampPermanently')||!app.includes('renderNextInfo'))errors.push('ramp permanent-disable or Next panel missing');
if(!app.includes("kind==='warning30'")||!app.includes("kind==='countdown'"))errors.push('updated audio cue patterns missing');
if(!app.includes('renderTrackerCard')||!app.includes('setTrackerAmount')||!app.includes('checkTrackerReminders'))errors.push('Tracker functionality incomplete');
if(!app.includes('sentTrackerReminderKeys')||!app.includes('function trackerPace')||!app.includes('steps>span/60')||!app.includes('checkpointCount=6')||!app.includes('span/checkpointCount')||!css.includes('.tracker-card-accent')||!css.includes('.tracker-row.behind')||!css.includes('.tracker-row.done'))errors.push('Tracker deadline-window/six-checkpoint dense-target pacing missing');
if(!app.includes('closeDialog();startWorkout(id)'))errors.push('Start Anyway does not close its warning');
if(!app.includes('await afterRest()')||!app.includes('async function skipExercise()'))errors.push('Skip exercise direct transition missing');
if(!app.includes("S('Remove','Noņemt')")||!app.includes("S('Skip','Izlaist')")||!app.includes('Remove ramp-up?'))errors.push('simplified ramp-up wording missing');
if(!app.includes('pulse-reps-badge"><span>${set.targetReps}</span> REPS'))errors.push('active pulse rep target is not prominent');
if(!app.includes('catalogue-link-glyph')||!css.includes("mask:url('./icons/catalogue-link.png')")||!css.includes('.catalogue-status.linked{color:#39b86a')||!css.includes('.catalogue-status.local{color:#858891'))errors.push('requested catalogue link icon linked/local styling missing');
if(app.includes('Use existing ·')||app.includes('Existing exercise'))errors.push('obsolete own-exercise picker remains in exercise creation');
if(!app.includes('If no catalogue match is selected')||!app.includes('Exercise type')||!app.includes('Compare with friends'))errors.push('direct catalogue-as-you-type exercise creation metadata missing');
if(app.includes('class="card advanced-settings"'))errors.push('settings are still hidden in generic Advanced section');
if(!app.includes('class="app-version">Gym Progress PWA v${APP_VERSION}</div>`'))errors.push('version footer missing at bottom of Settings');
if(!css.includes('.chart-axis{font-size:12px')||!app.includes('T=16,B=14')||!app.includes('k kg'))errors.push('current chart geometry/unit formatting missing');
if(!css.includes('.setting-toggle-row')||!app.includes('lastSetZeroRirAcceptable'))errors.push('last-set RIR setting/toggle missing');
if(!app.includes("saveRecoveryState(loaded,'pre-identity-migration-v1')")||!app.includes('refusing to overwrite IndexedDB')||!app.includes('do not immediately write an empty'))errors.push('local-data migration safeguards missing');


if(!app.includes('setting-toggle-control')||!app.includes('compare-toggle-row is-disabled')&&!app.includes("compare-toggle-row ${comparable?'':'is-disabled'}"))errors.push('friend comparison is not a right-side hard-disabled toggle');
if(!app.includes('Available only for comparable barbell and dumbbell catalogue exercises.'))errors.push('friend comparison eligibility explanation missing');
if(!app.includes("[Equipment.BARBELL,Equipment.OTHER].includes(eq)"))errors.push('add-form unload control is not restricted to relevant equipment');
if(!app.includes('exercise-primary-grid')||!app.includes('Exercise type')||!app.includes('Tracking'))errors.push('exercise form metadata layout missing');
if(!app.includes('exerciseFormChangeLink')||!app.includes('exerciseFormUnlink')||!app.includes('saveCatalogueLink'))errors.push('catalogue relink/unlink/save flow missing');
if(!app.includes("rt.phase==='SUPERSET_ENTRY'&&Array.isArray(rt.supersetEntry)")||!app.includes("S('NEXT','TĀLĀK')"))errors.push('superset paired Next information missing');
if(!sw.includes('./icons/catalogue-link.png'))errors.push('service worker missing catalogue link icon');


if(!app.includes('const INFO_MESSAGE_MS=3000')||!app.includes('setStatusMessage=null;render();}},INFO_MESSAGE_MS)')||app.includes('const INFO_MESSAGE_MS=4400'))errors.push('transient informational message timing is not centralised at 3.0 seconds');
if(!app.includes('function renderLogs()'))errors.push('Logs renderer is missing');
if(!app.includes("function canJoinSuperset")||app.includes("!a.removeWeights")||app.includes("a.trackingMode!==TrackingMode.TIME_ONLY")||!app.includes('toggleSupersetTimed')||!app.includes('Finish each timed component first.'))errors.push('timed/heavy superset eligibility or mixed-modality execution is incomplete');
if(!css.includes('.superset-programme-card{}')||!css.includes('.superset-between{height:0')||!css.includes('transform:translate(-50%,-50%)'))errors.push('PWA superset programme card/button styling does not match neutral overlapped controls');
if(!app.includes('function nextPendingExerciseAction')||!app.includes('nextPendingExerciseAction(exs,i+1)'))errors.push('unequal-set superset completion guard missing');
if(!app.includes('function currentRampMembers')||!app.includes('rampMembersNeedPrompt')||!app.includes("members.length===2?' pair':''"))errors.push('combined superset ramp-up flow missing');
if(!app.includes('function validTrackingModes')||!app.includes('return [TrackingMode.WEIGHT_REPS,TrackingMode.TIME_ONLY]')||!app.includes('return [TrackingMode.BODYWEIGHT_REPS,TrackingMode.TIME_ONLY]'))errors.push('equipment-aware tracking guardrail matrix missing');
if(app.includes('Timed / mat')||app.includes('timed/mat'))errors.push('obsolete Timed / mat wording remains in app UI');
if(!app.includes('LAST_SEEN_APP_VERSION_KEY')||!app.includes("||'1.3.0'")||!app.includes('introducedVersion')&&!app.includes('UPDATE_FEATURES')||!app.includes('dismissUpdateAnnouncement'))errors.push('version-delta multilingual update brief missing');
if(!app.includes('trackerPace(item,d)')||!app.includes('actual+1e-6>=pace.dueAmount'))errors.push('Tracker reminders are not gated by discrete due windows');
if(!app.includes('function exerciseFormChangeLink()')||app.includes("exerciseFormChangeLink(){") && app.includes("exerciseFormChangeLink(){") && app.split('function exerciseFormChangeLink()')[1].split('}')[0].includes('exerciseNameChanged()'))errors.push('Change catalogue link still immediately relinks/suppresses keyboard');


if(!app.includes('trackerRenderedDate=trackerTodayKey()')||!app.includes('trackerDateNow!==trackerRenderedDate'))errors.push('local-midnight Tracker rollover missing');
if(!app.includes('trackerVisualBucket')||!app.includes('/10);if(bucket!==trackerVisualBucket')||!app.includes('refreshTrackerTimeVisuals'))errors.push('Tracker clock marker does not refresh on a 10-minute cadence');
if(!app.includes('initialWeightKg:resolvedEquipment===Equipment.BODYWEIGHT?0:rawWeight')||!app.includes('id="f-weight" type="number" min="0" step="any"'))errors.push('programme manual weights are still rounded/snapped');
if(app.includes('workout-expand-chevron ${expanded'))errors.push('Home rotation expansion chevrons remain');

if(!app.includes('renderFriendComparisonChart')||!app.includes('orderedIds=[me,friendId')||!app.includes('pts.length>=2')||!app.includes('pts.length===1?5.5:4')||!app.includes('niceChartAxis'))errors.push('one-chart combined-domain/single-point friend comparison missing');

if(!app.includes('TRACKER_NOTIFICATIONS_KEY')||!app.includes('setTrackerNotifications')||!app.includes('deleteTrackerItem')||!app.includes('Tracker notifications'))errors.push('Tracker notification controls/delete settings missing');
if(!app.includes("rt.phase==='ENTRY'||rt.phase==='SUPERSET_ENTRY'")||!app.includes("if(!rt?.rest)return''"))errors.push('result-entry rest Skip fix missing');
if(!app.includes('niceChartStep')||!app.includes('compactTick')||!css.includes('.friend-comparison-help{font-size:11px'))errors.push('readable chart scale/e1RM help sizing missing');
if(!css.includes('.tracker-row{min-height:34px}')||!css.includes('opacity:.52')||!css.includes('.tracker-name{font-weight:400'))errors.push('compact low-emphasis Tracker rows/step controls missing');
if(!app.includes('new Map()')&&!read('exercise-catalogue.js').includes('new Map()'))errors.push('canonical suggestion deduplication missing');
if(!read('exercise-catalogue.json').includes('Machine Hip Thrust'))errors.push('Machine Hip Thrust catalogue entry missing');
const identity=read('exercise-identity.js');
if(!identity.includes('a display-name similarity alone must never do so')||!identity.includes('const canonical=template.exerciseKey?'))errors.push('generic legacy migration can still auto-link by display name');
const catalogue=JSON.parse(read('exercise-catalogue.json')),migration=JSON.parse(read('exercise-migration-map.json'));
if(catalogue.families?.length!==27||catalogue.exercises?.length!==191)errors.push('catalogue count mismatch');
if(catalogue.exercises.filter(x=>x.friendE1rmEligible).length!==9)errors.push('friend-comparable catalogue count mismatch');
if(migration.users?.length!==32||migration.programmeOccurrences?.length!==42)errors.push('reviewed migration count mismatch');
if(migration.users.some(x=>!['LINK','KEEP_LOCAL'].includes(x.mappingStatus)))errors.push('reviewed migration still has unresolved mappings');
const sql=read('supabase/SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql');
if(!sql.includes('begin;')||!sql.includes('commit;')||!sql.includes('grant select, insert, update, delete on public.exercise_comparison_points to authenticated')||!sql.includes('social_replace_exercise_comparison_points'))errors.push('Supabase migration transaction/API grants/retroactive sync RPC missing');
const shellMatch=sw.match(/const APP_SHELL = (\[[\s\S]*?\]);/);if(!shellMatch)errors.push('APP_SHELL not found');else{const shell=JSON.parse(shellMatch[1]);for(const rel of ['./exercise-identity.js','./exercise-catalogue.js','./exercise-catalogue.json','./exercise-migration-map.js','./exercise-migration-map.json'])if(!shell.includes(rel))errors.push(`service worker missing ${rel}`);for(const item of shell){const rel=item.replace(/^\.\//,'');if(!fs.existsSync(path.join(root,rel)))errors.push(`missing service-worker asset: ${item}`);}}


if(!app.includes('function runtimeNeedsRecovery')||!app.includes("if(runtimeNeedsRecovery(id))rebuildRuntime(id)"))errors.push('stale active-workout runtime recovery missing');
if(!app.includes('restPanel(restRemaining(rt),false,false,false)')||!app.includes('restPanel(remaining,false,false,false)'))errors.push('result-entry rest still exposes Skip');
if(!app.includes('settleRestOrRender')||!app.includes("rt.phase==='REST'&&!rt.rest"))errors.push('rest/result blank-screen recovery missing');
if(!app.includes('previewNextAction')||!app.includes('activeHeaderState')||!app.includes('focusStageInfo')||!app.includes('headerActionLabel'))errors.push('phase-aware current/next workout header missing');
if(!app.includes('hasPendingRamp')||!app.includes("rt.phase==='RAMP_PROMPT'||rt.phase==='RAMP_ACTIVE'"))errors.push('ramp-up current/next phase distinction missing');
if(app.includes('pulse-set">SET ${item.set.setNumber} / ${item.sets.length}'))errors.push('superset active set counter still uses language-specific Set prefix');
if(!css.includes('grid-template-columns:minmax(0,1fr) auto')||!app.includes('trackerTimeFraction(item,at)'))errors.push('Tracker progress zone/time marker alignment missing');
if(!app.includes('historyDays<30?Math.max(today,rawMaxT):rawMaxT'))errors.push('friend comparison short-history zoom-to-today rule missing');
if(!app.includes('showWorkoutFinishCelebration')||!app.includes('finish-celebration.png')||!app.includes('workoutConclusionHtml')||!fs.existsSync(path.join(root,'finish-celebration.png')))errors.push('PWA finish celebration/conclusion flow missing');
if(!app.includes('preloadFinishCelebration')||!read('index.html').includes('rel="preload" as="image" href="./finish-celebration.png"')||!sw.includes('./finish-celebration.png'))errors.push('finish celebration image preload/cache path missing');
if(!app.includes('simpleActiveHeaderState')||!app.includes("S('Next:','Tālāk:')")||!app.includes('workoutProgressFraction')||!app.includes('workout-progress-fill'))errors.push('exercise-level Next / live workout progress header missing');
if(!app.includes('function expandChevron')||!app.includes("expandChevron('details-chevron')")||!app.includes('friends-toggle-chevron')||!css.includes('.app-expand-chevron'))errors.push('uniform PWA expand/condense chevron missing');
if(!app.includes('navChevron()')||!css.includes('.nav-chevron svg')||!app.includes('pencil-outline-icon'))errors.push('settings navigation chevron/pencil UI missing');
if(!app.includes('undo-arrow.png')||!sw.includes('./icons/undo-arrow.png')||!fs.existsSync(path.join(root,'icons','undo-arrow.png')))errors.push('supplied workout undo icon missing from app/cache');
if(!css.includes('--pastel-green:#C1E1C1')||!css.includes('--tracker-pale:#EEF7EE')||!css.includes('--complete-orange:#FFB480'))errors.push('requested PWA polish palette missing');
if(!css.includes('#status-root{position:fixed')||!app.includes('const root=statusRoot'))errors.push('bottom overlay notice strategy missing');

const intelligence=read('progression-intelligence.js'),syncFoundation=read('sync-foundation.js');
for(const token of ['CALIBRATING','RAPID_ADAPTATION','PROGRESSION_APPROACHING','SLOWING','STALLED','DECLINING','FATIGUE_SUSPECTED','DELOAD_CANDIDATE','INSUFFICIENT_PERSONAL_HISTORY'])if(!intelligence.includes(token))errors.push(`adaptive progression intelligence token missing: ${token}`);
if(!app.includes('persistWorkoutIntelligence(state,s.id)')||!app.includes('recommendationDecision')||!app.includes('futureAdjustmentAccepted'))errors.push('adaptive recommendation decisions are not persisted in PWA history');
if(!syncFoundation.includes('syncId:uuid()')||!syncFoundation.includes('revision')||!syncFoundation.includes('deletedAt')||!syncFoundation.includes('pending:true'))errors.push('PWA local-first stable-ID/revision/tombstone sync substrate missing');
if(!app.includes("saveRecoveryState(loaded,'pre-sync-v2')")||!app.includes('internalVersion:6'))errors.push('PWA sync-v2 migration snapshot/version guard missing');
if(!fs.existsSync(path.join(root,'supabase','SUPABASE_TRAINING_SYNC_FOUNDATION.sql')))errors.push('training sync Supabase foundation migration missing');
else{const trainingSyncSql=read('supabase/SUPABASE_TRAINING_SYNC_FOUNDATION.sql');for(const token of ['begin;','commit;','alter table public.training_sync_records enable row level security','grant usage, select on sequence public.training_sync_revision_seq to authenticated','revoke all on table public.training_sync_records from anon'])if(!trainingSyncSql.includes(token))errors.push(`training sync Supabase safety token missing: ${token}`);}
if(!app.includes("schema:'gym-progress-export-v4'")||!app.includes('fatigue_state:s.fatigueState')||!app.includes('normalised_performance:e.normalisedPerformance'))errors.push('adaptive diagnostics missing from PWA exports');
if(!app.includes('cycleMembers:members.length')||!app.includes('volume:Math.max(...members.map(x=>x.volume))')||!app.includes('bestE1rm:Math.max(...members.map(x=>x.bestE1rm))'))errors.push('all-occurrence Progress cycle-best aggregation missing');
if(!sw.includes('./progression-intelligence.js')||!sw.includes('./sync-foundation.js')||!sw.includes('./training-sync.js'))errors.push('service worker does not cache intelligence/sync modules');
if(!app.includes('openTrainingSyncDialog')||!app.includes('performTrainingSync')||!app.includes('scheduleTrainingSync')||!read('training-sync.js').includes("['programme','workout_log','tracker']"))errors.push('actual three-domain account sync orchestration missing');
if(!read('training-sync.js').includes('eligibleSnapshotRecord')||!read('training-sync.js').includes("!=='ACTIVE'"))errors.push('active workout exclusion from cloud snapshots missing');
if(!app.includes('focusStageGroups')||!app.includes('simpleActiveHeaderState'))errors.push('superset-as-one-stage workout header missing');
if(app.includes('Shareable workout card'))errors.push('obsolete Shareable workout card label remains');
if(!css.includes('.trend-progress')||!css.includes('.trend-attention'))errors.push('post-workout trend colour semantics missing');
if(!fs.existsSync(path.join(root,'supabase','SUPABASE_TRAINING_SYNC_UPDATE_1.5.0_1.6.0.sql'))||!fs.existsSync(path.join(root,'DATABASE_UPDATE_INSTRUCTIONS_1.5.0_1.6.0.md')))errors.push('release database update SQL/instructions missing');

const gpExport=app.match(/window\.gp=\{([^}]*)\};/s);
if(!gpExport)errors.push('window.gp export object not found');
else{
  const gpNames=gpExport[1].split(',').map(x=>x.trim()).filter(Boolean);
  for(const name of gpNames){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const declared=new RegExp(`(?:async\\s+)?function\\s+${escaped}\\b|(?:const|let|var)\\s+${escaped}\\b`).test(app);
    const imported=new RegExp(`import\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}`).test(app);
    if(!declared&&!imported)errors.push(`window.gp exports undefined identifier: ${name}`);
  }
}

for(const f of files.filter(f=>/\.(?:js|mjs)$/.test(f))){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)errors.push(`JavaScript syntax error in ${path.relative(root,f)}: ${r.stderr.trim()}`);}
const rr=spawnSync(process.execPath,[path.join(root,'tools','validate-rules.mjs')],{encoding:'utf8'});if(rr.status!==0)errors.push(`performance-rule cases failed: ${(rr.stderr||rr.stdout).trim()}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`OK: ${files.length} PWA files checked`);
