import {volumeMultiplier} from './exercise-library.js';
import {PERFORMANCE_RULES,effectiveRir,actionableFailure} from './performance-rules.js';
export const COLORS={blue:'#92b8e8',green:'#70b995',lightgreen:'#a6d9b8',yellow:'#e8cf80',red:'#e99b9b',deepred:'#d97777',orange:'#e9ad83',gray:'#b8bcc4'};
export function roundQuarter(v){return Math.round(Number(v||0)*4)/4;}
export function formatKg(v){
  if(v==null||Number.isNaN(Number(v))) return '—';
  const n=Math.round(Number(v)*100)/100;
  const text=Number.isInteger(n)?String(n):(Number.isInteger(n*10)?n.toFixed(1):n.toFixed(2));
  return `${text} kg`;
}
export function formatKgFixed(v){
  if(v==null||Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(2)} kg`;
}
export function formatKgRounded(v){const n=Math.round(Number(v)||0);return `${n.toLocaleString('en-US').replaceAll(',', ' ')} kg`;}
export function formatDuration(ms){
  const total=Math.max(0,Math.floor((ms||0)/1000)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
const appLocale=()=>typeof document!=='undefined'&&document.documentElement?.lang==='lv'?'lv-LV':'en-GB';
export function dateOnly(ms){return new Intl.DateTimeFormat(appLocale(),{day:'numeric',month:'short',year:'numeric'}).format(new Date(ms));}
export function dateTime(ms){return new Intl.DateTimeFormat(appLocale(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));}
export function iso(ms){return ms==null?null:new Date(ms).toISOString();}
export function exerciseSets(state,exerciseId){return state.performed_sets.filter(s=>s.sessionExerciseId===exerciseId).sort((a,b)=>a.setNumber-b.setNumber);}
export function sessionExercises(state,sessionId){return state.session_exercises.filter(e=>e.sessionId===sessionId).sort((a,b)=>a.position-b.position);}
export function exerciseMetrics(state,e){
  const complete=exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE');
  const multiplier=volumeMultiplier(e.equipment,e.dumbbellLoad);
  const volume=complete.reduce((a,s)=>a+(Number(s.actualWeightKg)||0)*(Number(s.actualReps)||0)*multiplier,0);
  const rirs=complete.map(effectiveRir).filter(v=>v!=null).map(Number);
  const bestE1rm=complete.reduce((best,s)=>Math.max(best,(Number(s.actualWeightKg)||0)*(1+(Number(s.actualReps)||0)/30)),0);
  const maxWeight=complete.reduce((best,s)=>Math.max(best,Number(s.actualWeightKg)||0),0);
  const maxReps=complete.reduce((best,s)=>Math.max(best,Number(s.actualReps)||0),0);
  const failureCount=complete.filter(s=>s.failure).length;
  const actionableFailureCount=complete.filter(s=>actionableFailure(e,s,state.app_state)).length;
  const avgRir=rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null;
  return {volume,avgRir,effectiveRirAvg:avgRir,completedSets:complete.length,bestE1rm,maxWeight,maxReps,failureCount,actionableFailureCount};
}
export function sessionMetrics(state,session){
  const es=sessionExercises(state,session.id); const em=es.map(e=>exerciseMetrics(state,e));
  const volume=em.reduce((a,m)=>a+m.volume,0),failures=em.reduce((a,m)=>a+m.failureCount,0),actionableFailures=em.reduce((a,m)=>a+m.actionableFailureCount,0);
  const completeSets=es.flatMap(e=>exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE'));
  const rirs=completeSets.map(effectiveRir).filter(v=>v!=null).map(Number);
  const prev=previousIdenticalSession(state,session);
  let progressPercent=null;
  if(prev){
    const oldByName=new Map(sessionExercises(state,prev.id).map(e=>[e.name,exerciseMetrics(state,e)]));
    const changes=[];
    for(const e of es){const m=exerciseMetrics(state,e),old=oldByName.get(e.name);if(m.completedSets&&old?.volume>0)changes.push((m.volume/old.volume-1)*100);}
    if(changes.length)progressPercent=changes.reduce((a,b)=>a+b,0)/changes.length;
  }
  const avgRir=rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null;
  return {volume,avgRir,effectiveRirAvg:avgRir,completedSets:completeSets.length,progressPercent,failureCount:failures,actionableFailureCount:actionableFailures,failedExercises:em.filter(m=>m.actionableFailureCount>0).length};
}
export function previousIdenticalSession(state,current){
  return state.workout_sessions.filter(s=>s.id!==current.id&&s.status==='COMPLETE'&&s.startedAt<current.startedAt&&
    (current.workoutId!=null?s.workoutId===current.workoutId:s.workoutName===current.workoutName)).sort((a,b)=>b.startedAt-a.startedAt)[0]||null;
}
/** Exercise-level difficulty; failureCount means actionable failures. */
export function difficultyLevel(avgRir,failureCount,appState,sessionStatus=null,completedSets=0){
  if(sessionStatus==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  const count=Math.max(0,Number(completedSets||0)),failures=Math.max(0,Number(failureCount||0));
  if(count<=0&&avgRir==null)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  const rule=PERFORMANCE_RULES.effort.exerciseFailure,rate=count?failures/count:0;
  const failed=count===1&&rule.singleSetActionableFailure?failures>=1:failures>=Number(rule.minimumFailures||2)&&rate>=Number(rule.minimumFailureRate||.5);
  if(failed)return {key:'failure',label:'Failure',color:COLORS.deepred};
  return effortFromScore(avgRir,appState);
}
export function sessionDifficultyLevel(metrics,appState,sessionStatus=null){
  if(sessionStatus==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  const count=Math.max(0,Number(metrics?.completedSets||0));if(!count)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  const failures=Math.max(0,Number(metrics?.actionableFailureCount||0)),rate=failures/count,rule=PERFORMANCE_RULES.effort.sessionFailure;
  const systemic=failures>=Number(rule.minimumFailures||2)&&(rate>=Number(rule.minimumFailureRate||.25)||(Number(metrics?.failedExercises||0)>=Number(rule.multiExerciseMinimum||2)&&rate>=Number(rule.multiExerciseFailureRate||.15)));
  if(systemic)return {key:'failure',label:'Failure',color:COLORS.deepred};
  return effortFromScore(metrics?.avgRir,appState);
}
function effortFromScore(score,appState){
  if(score==null)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  score=Number(score);
  if(score>=appState.difficultyComfortableMinRir)return {key:'comfortable',label:'Comfortable',color:COLORS.green};
  if(score>=appState.difficultyChallengingMinRir)return {key:'challenging',label:'Challenging',color:COLORS.yellow};
  if(score>=appState.difficultyHardMinRir)return {key:'hard',label:'Hard',color:COLORS.orange};
  return {key:'very-hard',label:'Very hard',color:COLORS.red};
}
export function exerciseProgressPercent(state,e,previous){
  const m=exerciseMetrics(state,e); if(!m.completedSets||!previous)return null;
  const old=sessionExercises(state,previous.id).find(x=>x.name===e.name); if(!old)return null;
  const oldVol=exerciseMetrics(state,old).volume; return oldVol>0?(m.volume/oldVol-1)*100:null;
}
export function phaseDuration(start,end,skipped){return skipped?'Skipped':start!=null&&end!=null?formatDuration(end-start):'—';}
