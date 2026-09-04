import {Equipment} from './exercise-library.js';
import {exerciseSets,sessionExercises,exerciseMetrics} from './metrics.js';
import {evaluateFutureAdjustment} from './future-adjustment.js';
import {TrackingMode} from './exercise-identity.js';

const RECENT_INTERVALS=5;
const TREND_DEADBAND=3;

function completedSessions(state){return (state.workout_sessions||[]).filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').sort((a,b)=>Number(a.startedAt||0)-Number(b.startedAt||0));}
function weightedMedian(values){
  if(!values.length)return null;
  const weighted=[];values.slice(-RECENT_INTERVALS).forEach((v,i,a)=>weighted.push({v:Number(v),w:i+1+(RECENT_INTERVALS-a.length)}));
  const total=weighted.reduce((s,x)=>s+x.w,0);let acc=0;
  for(const x of weighted.sort((a,b)=>a.v-b.v)){acc+=x.w;if(acc>=total/2)return x.v;}
  return weighted.at(-1)?.v??null;
}
function immediateRecommendation(state,e){
  if(e.progressionOffered)return 'PROGRESS';
  return evaluateFutureAdjustment(e,exerciseSets(state,e.id),state.app_state)?'REDUCE':'HOLD';
}
function recommendationDecision(e,recommendation){
  if(recommendation==='PROGRESS')return e.progressionAccepted===true?'ACCEPTED':e.progressionAccepted===false?'DECLINED':'NOT_APPLICABLE';
  if(recommendation==='REDUCE')return e.futureAdjustmentAccepted===true?'ACCEPTED':e.futureAdjustmentAccepted===false?'DECLINED':'NOT_APPLICABLE';
  return 'NOT_APPLICABLE';
}
function performanceScore(state,e){
  const sets=exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE');if(!sets.length)return null;
  if(e.trackingMode===TrackingMode.TIME_ONLY){
    const actual=sets.reduce((sum,s)=>sum+Math.max(0,Number(s.actualDurationSeconds||0)),0);
    const target=sets.reduce((sum,s)=>sum+Math.max(1,Number(s.targetDurationSeconds||e.targetSeconds||60)),0);
    return target>0?actual/target*100:null;
  }
  if(e.equipment===Equipment.BODYWEIGHT){
    const actual=Math.max(...sets.map(s=>Math.max(0,Number(s.actualReps||0)+(s.failure?0:Number(s.rir||0)))));
    const target=Math.max(1,Number(e.targetReps||sets[0]?.targetReps||1)+Number(state.app_state?.targetRirMin||0));
    return actual/target*100;
  }
  const actual=Math.max(...sets.map(s=>{
    const reps=Math.max(1,Number(s.actualReps||0)+(s.failure?0:Number(s.rir||0)));
    return Math.max(0,Number(s.actualWeightKg||0))*(1+reps/30);
  }));
  const targetWeight=Math.max(0.01,Number(e.plannedWeightKg||sets[0]?.plannedWeightKg||0.01));
  const targetReps=Math.max(1,Number(e.targetReps||sets[0]?.targetReps||1)+Number(state.app_state?.targetRirMin||0));
  const target=targetWeight*(1+targetReps/30);
  return actual/target*100;
}
function exposureRows(state,userExerciseId,throughMs=Infinity){
  if(!userExerciseId)return[];
  const sessionById=new Map((state.workout_sessions||[]).map(s=>[s.id,s]));
  return (state.session_exercises||[]).filter(e=>e.userExerciseId===userExerciseId).map(e=>({e,s:sessionById.get(e.sessionId)}))
    .filter(x=>x.s&&Number(x.s.startedAt||0)<=throughMs&&(x.s.status==='COMPLETE'||x.s.status==='ABORTED')&&exerciseSets(state,x.e.id).some(s=>s.status==='COMPLETE'))
    .sort((a,b)=>Number(a.s.startedAt||0)-Number(b.s.startedAt||0)||Number(a.e.position||0)-Number(b.e.position||0));
}
function performanceTrend(scores){
  const vals=scores.filter(Number.isFinite).slice(-4);if(vals.length<3)return 'FLAT';
  const delta=vals.at(-1)-vals[0];
  if(delta>TREND_DEADBAND)return 'IMPROVING';
  if(delta<-TREND_DEADBAND)return 'DECLINING';
  return 'FLAT';
}
export function assessExerciseTrend(state,e){
  const currentSession=(state.workout_sessions||[]).find(s=>s.id===e.sessionId),through=Number(currentSession?.startedAt||Infinity);
  const rows=exposureRows(state,e.userExerciseId,through);const currentIndex=Math.max(0,rows.findIndex(x=>x.e.id===e.id));
  const visible=currentIndex>=0?rows.slice(0,currentIndex+1):rows;
  const acceptedIndexes=[];visible.forEach((x,i)=>{if(x.e.progressionOffered&&x.e.progressionAccepted===true)acceptedIndexes.push(i);});
  const intervals=[];for(let i=1;i<acceptedIndexes.length;i++)intervals.push(acceptedIndexes[i]-acceptedIndexes[i-1]);
  const expected=weightedMedian(intervals);const lastAccepted=acceptedIndexes.length?acceptedIndexes.at(-1):-1;
  const since=Math.max(0,visible.length-1-lastAccepted);const recentAccepted=visible.slice(-4).filter(x=>x.e.progressionOffered&&x.e.progressionAccepted===true).length;
  const scores=visible.map(x=>performanceScore(state,x.e));const pTrend=performanceTrend(scores);
  const recommendation=immediateRecommendation(state,e),decision=recommendationDecision(e,recommendation),reasons=[];
  let stateName='ON_TRACK';let confidence='LOW';
  if(visible.length<6||intervals.length<2){stateName='CALIBRATING';reasons.push('INSUFFICIENT_PERSONAL_HISTORY');}
  else if(recentAccepted>=3){stateName='RAPID_ADAPTATION';reasons.push('FREQUENT_RECENT_ACCEPTED_PROGRESSIONS');}
  else if(pTrend==='DECLINING'){stateName='DECLINING';reasons.push('RECENT_NORMALISED_PERFORMANCE_DECLINING');}
  else if(recommendation==='PROGRESS'&&decision==='DECLINED'){stateName='PROGRESSION_APPROACHING';reasons.push('PROGRESSION_AVAILABLE_BUT_DECLINED');}
  else if(expected!=null&&since>Math.max(6,2.25*expected)){stateName='STALLED';reasons.push('HOLD_STREAK_WELL_ABOVE_PERSONAL_BASELINE');}
  else if(expected!=null&&since>Math.max(4,1.5*expected)){stateName='SLOWING';reasons.push('HOLD_STREAK_ABOVE_PERSONAL_BASELINE');}
  else if(pTrend==='IMPROVING'){stateName='PROGRESSION_APPROACHING';reasons.push('RECENT_NORMALISED_PERFORMANCE_IMPROVING');}
  else reasons.push('WITHIN_PERSONAL_RECENT_PATTERN');
  if(intervals.length>=4&&visible.length>=10)confidence='HIGH';else if(intervals.length>=2&&visible.length>=6)confidence='MEDIUM';
  if(recommendation==='REDUCE')reasons.push('CURRENT_PRESCRIPTION_REDUCTION_SIGNAL');
  if(recommendation==='PROGRESS')reasons.push('CURRENT_PROGRESSION_SIGNAL');
  return {recommendation,decision,state:stateName,confidence,expectedInterval:expected,exposuresSinceProgression:since,performanceTrend:pTrend,performanceScore:performanceScore(state,e),reasons:[...new Set(reasons)]};
}
function materialMiss(state,e){const m=exerciseMetrics(state,e);if(!m.completedSets)return false;const score=performanceScore(state,e);return Number.isFinite(score)&&score<95;}
function declinedVsPrior(state,e,session){
  const rows=exposureRows(state,e.userExerciseId,Number(session.startedAt||0));if(rows.length<2)return false;
  const prev=rows.filter(x=>Number(x.s.startedAt||0)<Number(session.startedAt||0)).at(-1);if(!prev)return false;
  const a=performanceScore(state,e),b=performanceScore(state,prev.e);return Number.isFinite(a)&&Number.isFinite(b)&&a<b-TREND_DEADBAND;
}
function workoutObjectiveScore(state,session){
  const exs=sessionExercises(state,session.id).filter(e=>exerciseSets(state,e.id).some(s=>s.status==='COMPLETE'));if(!exs.length)return{score:0,reasons:[],fatigueLike:false};
  const recs=exs.map(e=>immediateRecommendation(state,e)),reduceCount=recs.filter(x=>x==='REDUCE').length,misses=exs.filter(e=>materialMiss(state,e)).length,declines=exs.filter(e=>declinedVsPrior(state,e,session)).length;
  const withinReductions=exs.filter(e=>exerciseSets(state,e.id).some(s=>s.autoregulated===true&&Number(s.actualWeightKg||0)<Number(s.plannedWeightKg||0))).length;
  let score=0;const reasons=[];
  if(reduceCount/exs.length>=.25){score+=2;reasons.push('REDUCE_RECOMMENDED_FOR_QUARTER_OF_EXERCISES');}
  if(misses/exs.length>=.25){score+=1;reasons.push('MATERIAL_TARGET_MISS_FOR_QUARTER_OF_EXERCISES');}
  if(declines>=2){score+=1;reasons.push('MULTIPLE_EXERCISES_DECLINING');}
  if(withinReductions>=2){score+=1;reasons.push('MULTIPLE_WITHIN_WORKOUT_REDUCTIONS');}
  if(session.subjectiveRecovery==='POOR'){score+=1;reasons.push('SUBJECTIVE_RECOVERY_POOR');}
  if(session.subjectiveRecovery==='GOOD'){score-=1;reasons.push('SUBJECTIVE_RECOVERY_GOOD');}
  score=Math.max(0,score);return{score,reasons,fatigueLike:score>=3};
}
export function assessWorkoutFatigue(state,session){
  const sessions=completedSessions(state).filter(s=>Number(s.startedAt||0)<=Number(session.startedAt||0));
  const recent=sessions.slice(-4).map(s=>({s,...workoutObjectiveScore(state,s)}));const current=recent.at(-1)||{score:0,reasons:[],fatigueLike:false};
  const last3=recent.slice(-3).filter(x=>x.fatigueLike).length,last4=recent.filter(x=>x.fatigueLike).length;
  let fatigueState=current.score>=2?'WATCH':'NORMAL';
  if(last4>=3)fatigueState='DELOAD_CANDIDATE';else if(last3>=2)fatigueState='FATIGUE_SUSPECTED';
  return{state:fatigueState,score:current.score,reasons:current.reasons};
}
export function persistWorkoutIntelligence(state,sessionId){
  const session=(state.workout_sessions||[]).find(s=>s.id===sessionId);if(!session)return null;
  const exerciseAssessments=[];
  for(const e of sessionExercises(state,sessionId)){
    if(!exerciseSets(state,e.id).some(s=>s.status==='COMPLETE'))continue;
    const a=assessExerciseTrend(state,e);exerciseAssessments.push({exerciseId:e.id,...a});
    e.recommendation=a.recommendation;e.recommendationDecision=a.decision;e.recommendationReasonCodes=a.reasons;
    e.trendState=a.state;e.trendConfidence=a.confidence;e.expectedProgressionInterval=a.expectedInterval;e.exposuresSinceProgression=a.exposuresSinceProgression;e.performanceTrend=a.performanceTrend;e.normalisedPerformance=a.performanceScore;
  }
  const fatigue=assessWorkoutFatigue(state,session);session.fatigueState=fatigue.state;session.fatigueScore=fatigue.score;session.fatigueReasons=fatigue.reasons;
  return{exerciseAssessments,fatigue};
}

export function trendLabel(stateName){return ({CALIBRATING:'Calibrating',RAPID_ADAPTATION:'Rapid progression',ON_TRACK:'On track',PROGRESSION_APPROACHING:'Progression approaching',SLOWING:'Slower than usual',STALLED:'Stalled',DECLINING:'Declining'})[stateName]||'On track';}
export function fatigueSummary(fatigueState){
  if(fatigueState==='DELOAD_CANDIDATE')return 'Performance has declined broadly across several recent workouts. A lighter session may be useful.';
  if(fatigueState==='FATIGUE_SUSPECTED')return 'Performance has declined across several recent workouts. Recovery or a lighter session may be worth considering.';
  if(fatigueState==='WATCH')return 'This workout was below your recent pattern. One workout alone is not treated as a fatigue trend.';
  return 'Training is progressing normally. No broad fatigue pattern detected.';
}
