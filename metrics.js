export const COLORS={blue:'#92b8e8',green:'#70b995',lightgreen:'#a6d9b8',yellow:'#e8cf80',red:'#e99b9b',deepred:'#d97777',orange:'#e9ad83',gray:'#b8bcc4'};
export function roundQuarter(v){return Math.round(Number(v||0)*4)/4;}
export function formatKg(v){
  if(v==null||Number.isNaN(Number(v))) return '—';
  const n=Number(v); return `${Number.isInteger(n)?n:n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} kg`;
}
export function formatKgRounded(v){const n=Math.round(Number(v)||0);return `${n.toLocaleString('en-US').replaceAll(',', ' ')} kg`;}
export function formatDuration(ms){
  const total=Math.max(0,Math.floor((ms||0)/1000)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
export function dateOnly(ms){return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(ms));}
export function dateTime(ms){return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));}
export function iso(ms){return ms==null?null:new Date(ms).toISOString();}
export function exerciseSets(state,exerciseId){return state.performed_sets.filter(s=>s.sessionExerciseId===exerciseId).sort((a,b)=>a.setNumber-b.setNumber);}
export function sessionExercises(state,sessionId){return state.session_exercises.filter(e=>e.sessionId===sessionId).sort((a,b)=>a.position-b.position);}
export function exerciseMetrics(state,e){
  const complete=exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE');
  const volume=complete.reduce((a,s)=>a+(Number(s.actualWeightKg)||0)*(Number(s.actualReps)||0),0);
  const rirs=complete.filter(s=>!s.failure&&s.rir!=null).map(s=>Number(s.rir));
  const bestE1rm=complete.reduce((best,s)=>Math.max(best,(Number(s.actualWeightKg)||0)*(1+(Number(s.actualReps)||0)/30)),0);
  const maxWeight=complete.reduce((best,s)=>Math.max(best,Number(s.actualWeightKg)||0),0);
  return {volume,avgRir:rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null,completedSets:complete.length,bestE1rm,maxWeight,failureCount:complete.filter(s=>s.failure).length};
}
export function sessionMetrics(state,session){
  const es=sessionExercises(state,session.id); const em=es.map(e=>exerciseMetrics(state,e));
  const volume=em.reduce((a,m)=>a+m.volume,0); const failures=em.reduce((a,m)=>a+m.failureCount,0);
  const rirs=[]; es.forEach(e=>exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE'&&!s.failure&&s.rir!=null).forEach(s=>rirs.push(Number(s.rir))));
  const prev=previousIdenticalSession(state,session);
  let progressPercent=null;
  if(prev){
    const oldByName=new Map(sessionExercises(state,prev.id).map(e=>[e.name,exerciseMetrics(state,e)]));
    const changes=[];
    for(const e of es){const m=exerciseMetrics(state,e),old=oldByName.get(e.name);if(m.completedSets&&old?.volume>0)changes.push((m.volume/old.volume-1)*100);}
    if(changes.length)progressPercent=changes.reduce((a,b)=>a+b,0)/changes.length;
  }
  return {volume,avgRir:rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null,progressPercent,failureCount:failures};
}
export function previousIdenticalSession(state,current){
  return state.workout_sessions.filter(s=>s.id!==current.id&&s.status==='COMPLETE'&&s.startedAt<current.startedAt&&
    (current.workoutId!=null?s.workoutId===current.workoutId:s.workoutName===current.workoutName)).sort((a,b)=>b.startedAt-a.startedAt)[0]||null;
}
export function difficultyLevel(avgRir,failureCount,appState,sessionStatus=null){
  if(sessionStatus==='ABORTED')return {key:'aborted',label:'Aborted',color:COLORS.deepred};
  if(failureCount>0)return {key:'failure',label:'Failure',color:COLORS.deepred};
  if(avgRir==null)return {key:'unknown',label:'No effort data',color:COLORS.gray};
  if(avgRir>=appState.difficultyComfortableMinRir)return {key:'comfortable',label:'Comfortable',color:COLORS.green};
  if(avgRir>=appState.difficultyChallengingMinRir)return {key:'challenging',label:'Challenging',color:COLORS.yellow};
  if(avgRir>=appState.difficultyHardMinRir)return {key:'hard',label:'Hard',color:COLORS.orange};
  return {key:'very-hard',label:'Very hard',color:COLORS.red};
}
export function exerciseProgressPercent(state,e,previous){
  const m=exerciseMetrics(state,e); if(!m.completedSets||!previous)return null;
  const old=sessionExercises(state,previous.id).find(x=>x.name===e.name); if(!old)return null;
  const oldVol=exerciseMetrics(state,old).volume; return oldVol>0?(m.volume/oldVol-1)*100:null;
}
export function phaseDuration(start,end,skipped){return skipped?'Skipped':start!=null&&end!=null?formatDuration(end-start):'—';}
