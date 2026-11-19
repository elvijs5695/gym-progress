/** v1.7.10: exercise real log/timeline source with saved sample sessions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {COLORS,formatDuration} from '../metrics.js';
import {workoutCardioEffort} from '../cardio-analytics.js';
import {t,languageCode} from '../i18n.js';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=fs.readFileSync(join(root,'app.js'),'utf8');
const css=fs.readFileSync(join(root,'styles.css'),'utf8');
const src=(start,end)=>{
  const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
  assert(i>=0&&j>i,`Could not extract ${start}`);
  return source.slice(i,j);
};
const base=Date.UTC(2026,10,19,14);
const sessions=[
  {id:1,startedAt:base,endedAt:base+1800000,workoutName:'Cardio-only',status:'COMPLETE',strength:'unknown'},
  {id:2,startedAt:base+86400000,endedAt:base+86400000+5400000,workoutName:'Mixed',status:'COMPLETE',strength:'comfortable'},
  {id:3,startedAt:base+2*86400000,endedAt:base+2*86400000+3600000,workoutName:'Strength-only',status:'COMPLETE',strength:'hard'},
  {id:4,startedAt:base+3*86400000,endedAt:base+3*86400000+1800000,workoutName:'Unrated cardio + strength',status:'COMPLETE',strength:'challenging'},
  {id:5,startedAt:base+4*86400000,endedAt:base+4*86400000+1800000,workoutName:'Aborted',status:'ABORTED',strength:'comfortable'},
];
const ex=[
  {id:101,sessionId:1,trackingMode:'CARDIO'},
  {id:201,sessionId:2,trackingMode:'CARDIO'},
  {id:202,sessionId:2,trackingMode:'WEIGHT_REPS'},
  {id:301,sessionId:3,trackingMode:'WEIGHT_REPS'},
  {id:401,sessionId:4,trackingMode:'CARDIO'},
  {id:402,sessionId:4,trackingMode:'WEIGHT_REPS'},
  {id:501,sessionId:5,trackingMode:'CARDIO'},
];
const sets=[
  {sessionExerciseId:101,status:'COMPLETE',actualDurationSeconds:1800,sessionRpe:9},
  {sessionExerciseId:201,status:'COMPLETE',actualDurationSeconds:1800,sessionRpe:5},
  {sessionExerciseId:202,status:'COMPLETE',actualReps:10,rir:3},
  {sessionExerciseId:301,status:'COMPLETE',actualReps:6,rir:1},
  {sessionExerciseId:401,status:'COMPLETE',actualDurationSeconds:1800,sessionRpe:null},
  {sessionExerciseId:402,status:'COMPLETE',actualReps:12,rir:2},
  {sessionExerciseId:501,status:'COMPLETE',actualDurationSeconds:1500,sessionRpe:4},
];
const state={app_state:{languageCode:'en'},workout_sessions:sessions,session_exercises:ex,performed_sets:sets};
const scores={unknown:COLORS.gray,comfortable:COLORS.green,challenging:COLORS.yellow,hard:COLORS.orange,'very-hard':COLORS.red,failure:COLORS.deepred,aborted:COLORS.deepred};
const ctx=vm.createContext({
  state,COLORS,workoutCardioEffort,languageCode,t,formatDuration,
  sessionDifficultyLevel:(m)=>({key:m.strength,label:({unknown:'No effort data',comfortable:'Comfortable',challenging:'Challenging',hard:'Hard','very-hard':'Very hard'})[m.strength]||'No effort data',color:scores[m.strength]}),
  S:(en,lv)=>state.app_state.languageCode==='lv'?lv:en,
  esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
  ui:{logLimit:40,timelineDays:null,timelineEndMs:null},
  sessionMetrics:(_,s)=>({strength:s?.strength||_.strength,volume:100,progressPercent:12}),
  sessionCardioSummary:()=>({duration:1800,meanRpe:5,meanHr:140}),
  formatCardioSessionLoad:()=>'150 AU',formatKgRounded:()=>'100 kg',fmtPct:()=>'12%',
  dateOnly:()=>'20 Nov',renderFrequencyTimeline:()=>'<section class="timeline-card"></section>',shell:x=>x,
});
vm.runInContext(src('const CARDIO_TO_LOG_DIFFICULTY=', 'function logMetric('),ctx);
function effort(id){const s=sessions.find(s=>s.id===id);return ctx.workoutLogEffort(s,{strength:s.strength});}
assert.equal(effort(1).key,'cardio-veryhard');assert.equal(effort(1).color,COLORS.red);
assert.equal(effort(1).label,'Very hard');assert(!effort(1).label.includes('RPE'));
assert.equal(effort(2).key,'comfortable');assert.equal(effort(2).color,COLORS.green);
assert.equal(effort(2).label,'Strength: Comfortable · Cardio: Moderate');
assert.equal(effort(3).color,COLORS.orange);
assert.equal(effort(4).label,'Strength: Challenging · Cardio: effort not recorded');assert.equal(effort(4).color,COLORS.yellow);
assert.equal(effort(5).key,'aborted');assert.equal(effort(5).color,COLORS.deepred);
state.app_state.languageCode='lv';assert.equal(effort(2).label,'Spēks: Komfortabls · Kardio: Mērens');state.app_state.languageCode='en';
vm.runInContext(src('function logMetric(', 'function moreLogs('),ctx);
const html=ctx.renderLogs();
assert(html.includes('id="log-session-1" class="card clickable log-session-card" style="--log-effort-colour:'+COLORS.red+'"'));
assert(html.includes('id="log-session-2" class="card clickable log-session-card" style="--log-effort-colour:'+COLORS.green+'"'));
assert(html.includes('id="log-session-3" class="card clickable log-session-card" style="--log-effort-colour:'+COLORS.orange+'"'));
assert(html.includes('id="log-session-5" class="card clickable log-session-card" style="--log-effort-colour:'+COLORS.deepred+'"'));
assert(html.includes('Strength: Comfortable · Cardio: Moderate'));
assert(!html.includes('(RPE 5.0)'));
assert(html.includes('RPE</div>')); // cardio detail remains in metric grid
assert(css.includes('.log-session-card{')&&css.includes('background:color-mix(in srgb,var(--log-effort-colour) 13%,var(--surface))'));
assert(css.includes('border-left:4px solid var(--log-effort-colour)'));
// Run the *actual* canvas timeline renderer with recording drawing context.
const filled=[];
const drawing={fillStyle:'',setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){filled.push(this.fillStyle)}};
const canvas={clientWidth:400,width:0,height:0,style:{},classList:{toggle(){}},getContext(){return drawing},addEventListener(){}};
const selectors={'#workout-timeline':canvas,'#timeline-start':{textContent:''},'#timeline-end':{textContent:''},'#timeline-span':{textContent:''}};
Object.assign(ctx,{
  $:q=>selectors[q],now:()=>base+6*86400000,
  window:{devicePixelRatio:1},
  defaultTimelineWindow:()=>({earliest:base,latest:base+4*86400000,days:8,endMs:base+6*86400000}),
  shortTimelineDate:ms=>new Date(ms).toISOString().slice(0,10),
  timelineSpanLabel:()=>'8 days',
  ResizeObserver:class{observe(){}},
});
vm.runInContext(src('function bindWorkoutTimeline()', 'function shortTimelineDate('),ctx);
ctx.bindWorkoutTimeline();
assert.equal(filled.length,5,`Wrong number of plotted circles: ${JSON.stringify(filled)}`);
assert.deepEqual(filled,[COLORS.red,COLORS.green,COLORS.orange,COLORS.yellow,COLORS.deepred]);
console.log('OK: 1.7.10 Logs cards and timeline colours, compact effort labels, LV/EN and detailed RPE retention');
