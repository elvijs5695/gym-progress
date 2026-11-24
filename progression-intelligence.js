import {Equipment} from './exercise-library.js';
import {exerciseSets,sessionExercises,exerciseMetrics} from './metrics.js';
import {evaluateFutureAdjustment} from './future-adjustment.js';
import {TrackingMode} from './exercise-identity.js';
import {finiteNumber,numberInRange,positiveNumber,sameId,trackingModeOf,isRepExercise,isCompleteExercise,finiteSum} from './domain-values.js';
import {assessSet,captureAnalysisContext,performanceSettingsFor,performanceRulesFor,ANALYSIS_VERSION} from './performance-rules.js';

const RECENT_INTERVALS=5;
const TREND_DEADBAND=3;

function completedSessions(state){return (state.workout_sessions||[]).filter(s=>s.status==='COMPLETE').sort((a,b)=>Number(a.startedAt||0)-Number(b.startedAt||0)||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));}
function weightedMedian(values){
  if(!values.length)return null;
  const weighted=[];values.slice(-RECENT_INTERVALS).forEach((v,i,a)=>weighted.push({v:Number(v),w:i+1+(RECENT_INTERVALS-a.length)}));
  const total=weighted.reduce((s,x)=>s+x.w,0);let acc=0;
  for(const x of weighted.sort((a,b)=>a.v-b.v)){acc+=x.w;if(acc>=total/2)return x.v;}
  return weighted.at(-1)?.v??null;
}
function immediateRecommendation(state,e){
  if(!isRepExercise(e))return 'HOLD';
  if(e.progressionOffered)return 'PROGRESS';
  // A recorded offer is a historical fact, even after later rules change.
  if(e.futureAdjustmentOffered===true)return 'REDUCE';
  return evaluateFutureAdjustment(e,exerciseSets(state,e.id),performanceSettingsFor(state,e),performanceRulesFor(state,e))?'REDUCE':'HOLD';
}
function recommendationDecision(e,recommendation){
  if(recommendation==='PROGRESS')return e.progressionAccepted===true?'ACCEPTED':e.progressionAccepted===false?'DECLINED':'NOT_APPLICABLE';
  if(recommendation==='REDUCE')return e.futureAdjustmentAccepted===true?'ACCEPTED':e.futureAdjustmentAccepted===false?'DECLINED':'NOT_APPLICABLE';
  return 'NOT_APPLICABLE';
}
export function performanceScore(state,e){
  const sets=exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE'),mode=trackingModeOf(e);if(!sets.length||mode===TrackingMode.CARDIO)return null;
  if(mode===TrackingMode.TIME_ONLY){
    const measured=sets.map(s=>({actual:numberInRange(s.actualDurationSeconds),target:positiveNumber(s.targetDurationSeconds)??positiveNumber(e.targetSeconds)})).filter(s=>s.actual!=null&&s.target!=null);
    if(!measured.length)return null;
    const actual=finiteSum(measured.map(s=>s.actual)),target=finiteSum(measured.map(s=>s.target));
    return target>0&&actual!=null?actual/target*100:null;
  }
  const settings=performanceSettingsFor(state,e),rules=performanceRulesFor(state,e);
  const ratios=sets.map(set=>assessSet(e,set,settings,{rules,allowLastSetException:false}).capacityRatio).filter(Number.isFinite);
  return ratios.length?Math.max(...ratios)*100:null;
}
function sameMeasurementContext(a,b){return trackingModeOf(a)===trackingModeOf(b)&&(a.equipment||Equipment.OTHER)===(b.equipment||Equipment.OTHER)&&(a.dumbbellLoad||'SINGLE')===(b.dumbbellLoad||'SINGLE');}
function exposureRows(state,userExerciseId,throughMs=Infinity,context=null){
  if(!userExerciseId)return[];
  const sessionById=new Map((state.workout_sessions||[]).map(s=>[String(s.id),s]));
  return (state.session_exercises||[]).filter(e=>sameId(e.userExerciseId,userExerciseId)&&(!context||sameMeasurementContext(e,context))).map(e=>({e,s:sessionById.get(String(e.sessionId))}))
    .filter(x=>x.s&&Number(x.s.startedAt||0)<=throughMs&&(x.s.status==='COMPLETE'||x.s.status==='ABORTED')&&isCompleteExercise(x.e,exerciseSets(state,x.e.id)))
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
  const currentSession=(state.workout_sessions||[]).find(s=>sameId(s.id,e.sessionId)),through=finiteNumber(currentSession?.startedAt)??Infinity;
  const rows=exposureRows(state,e.userExerciseId,through,e);const currentIndex=rows.findIndex(x=>sameId(x.e.id,e.id));
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
  if(currentSession?.status==='ABORTED')reasons.push('COMPLETED_EXERCISE_FROM_ABORTED_SESSION');
  if(!isCompleteExercise(e,exerciseSets(state,e.id)))reasons.push('CURRENT_EXPOSURE_INCOMPLETE');
  return {recommendation,decision,state:stateName,confidence,expectedInterval:expected,exposuresSinceProgression:since,performanceTrend:pTrend,performanceScore:performanceScore(state,e),historyExposures:visible.length,reasons:[...new Set(reasons)],analysisVersion:ANALYSIS_VERSION};
}
function materialMiss(state,e){const m=exerciseMetrics(state,e);if(!m.completedSets)return false;const score=performanceScore(state,e);return Number.isFinite(score)&&score<95;}
function declinedVsPrior(state,e,session){
  const rows=exposureRows(state,e.userExerciseId,Number(session.startedAt||0),e);if(rows.length<2)return false;
  const prev=rows.filter(x=>Number(x.s.startedAt||0)<Number(session.startedAt||0)).at(-1);if(!prev)return false;
  const a=performanceScore(state,e),b=performanceScore(state,prev.e);return Number.isFinite(a)&&Number.isFinite(b)&&a<b-TREND_DEADBAND;
}
function workoutObjectiveScore(state,session){
  const exs=sessionExercises(state,session.id).filter(e=>isRepExercise(e)&&isCompleteExercise(e,exerciseSets(state,e.id))&&performanceScore(state,e)!=null);if(!exs.length)return{score:0,reasons:['NO_COMPLETE_RATED_STRENGTH_EXPOSURES'],fatigueLike:false,eligibleExercises:0};
  const recs=exs.map(e=>immediateRecommendation(state,e)),reduceCount=recs.filter(x=>x==='REDUCE').length,misses=exs.filter(e=>materialMiss(state,e)).length,declines=exs.filter(e=>declinedVsPrior(state,e,session)).length;
  const withinReductions=exs.filter(e=>exerciseSets(state,e.id).some(s=>s.status==='COMPLETE'&&s.autoregulated===true&&(trackingModeOf(e)===TrackingMode.BODYWEIGHT_REPS?Number(s.targetReps)<Number(e.targetReps):numberInRange(s.actualWeightKg)!=null&&Number(s.actualWeightKg)<Number(e.plannedWeightKg)))).length;
  let score=0;const reasons=[];
  if(reduceCount/exs.length>=.25){score+=2;reasons.push('REDUCE_RECOMMENDED_FOR_QUARTER_OF_EXERCISES');}
  if(misses/exs.length>=.25){score+=1;reasons.push('MATERIAL_TARGET_MISS_FOR_QUARTER_OF_EXERCISES');}
  if(declines>=2){score+=1;reasons.push('MULTIPLE_EXERCISES_DECLINING');}
  if(withinReductions>=2){score+=1;reasons.push('MULTIPLE_WITHIN_WORKOUT_REDUCTIONS');}
  if(session.subjectiveRecovery==='POOR'){score+=1;reasons.push('SUBJECTIVE_RECOVERY_POOR');}
  if(session.subjectiveRecovery==='GOOD'){score-=1;reasons.push('SUBJECTIVE_RECOVERY_GOOD');}
  score=Math.max(0,score);return{score,reasons,fatigueLike:score>=3,eligibleExercises:exs.length};
}
export function assessWorkoutFatigue(state,session){
  if(session?.status!=='COMPLETE')return{state:'INSUFFICIENT_DATA',score:0,reasons:['SESSION_NOT_COMPLETE'],sampleCount:0};
  const sessions=completedSessions(state).filter(s=>Number(s.startedAt||0)<=Number(session.startedAt||0));
  const currentIndex=sessions.findIndex(s=>sameId(s.id,session.id)),through=currentIndex>=0?sessions.slice(0,currentIndex+1):sessions;
  const current=workoutObjectiveScore(state,session);
  if(!current.eligibleExercises)return{state:'INSUFFICIENT_DATA',score:0,reasons:current.reasons,sampleCount:0};
  const recent=through.map(s=>({s,...workoutObjectiveScore(state,s)})).filter(x=>x.eligibleExercises>0).slice(-4);
  const last3=recent.slice(-3).filter(x=>x.fatigueLike).length,last4=recent.filter(x=>x.fatigueLike).length;
  let fatigueState=current.score>=2?'WATCH':'NORMAL';
  if(last4>=3)fatigueState='DELOAD_CANDIDATE';else if(last3>=2)fatigueState='FATIGUE_SUSPECTED';
  return{state:fatigueState,score:current.score,reasons:current.reasons,sampleCount:recent.length,eligibleExercises:current.eligibleExercises,analysisVersion:ANALYSIS_VERSION};
}
const EXERCISE_ANALYSIS_KEYS=['recommendation','recommendationDecision','recommendationReasonCodes','trendState','trendConfidence','expectedProgressionInterval','exposuresSinceProgression','performanceTrend','normalisedPerformance'];
const SESSION_ANALYSIS_KEYS=['fatigueState','fatigueScore','fatigueReasons'];
const copy=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
function retainPreviousAnalysis(record,keys){
  const previous=Object.fromEntries(keys.filter(key=>Object.hasOwn(record,key)).map(key=>[key,copy(record[key])]));
  if(!Object.keys(previous).length)return;
  if(!record.analysisProvenance){if(!record.legacyAnalysis)record.legacyAnalysis={origin:'PRE_V2_UNVERSIONED',values:previous};}
  else {
    const history=record.analysisHistory||(record.analysisHistory=[]),entry={values:previous,provenance:copy(record.analysisProvenance)};
    if(JSON.stringify(history.at(-1))!==JSON.stringify(entry))history.push(entry);
  }
}
export function persistWorkoutIntelligence(state,sessionId){
  const session=(state.workout_sessions||[]).find(s=>sameId(s.id,sessionId));if(!session)return null;
  if(!session.analysisContext)session.analysisContext=captureAnalysisContext(state.app_state,{capturedAt:finiteNumber(session.endedAt),origin:SESSION_ANALYSIS_KEYS.some(key=>Object.hasOwn(session,key))?'LEGACY_RECOMPUTE':'FINISH_SNAPSHOT'});
  const exerciseAssessments=[];
  for(const e of sessionExercises(state,sessionId)){
    if(trackingModeOf(e)===TrackingMode.CARDIO||!exerciseSets(state,e.id).some(s=>s.status==='COMPLETE'))continue;
    const a=assessExerciseTrend(state,e);exerciseAssessments.push({exerciseId:e.id,...a});
    retainPreviousAnalysis(e,EXERCISE_ANALYSIS_KEYS);
    e.recommendation=a.recommendation;e.recommendationDecision=a.decision;e.recommendationReasonCodes=a.reasons;
    e.trendState=a.state;e.trendConfidence=a.confidence;e.expectedProgressionInterval=a.expectedInterval;e.exposuresSinceProgression=a.exposuresSinceProgression;e.performanceTrend=a.performanceTrend;e.normalisedPerformance=a.performanceScore;
    e.analysisProvenance={version:ANALYSIS_VERSION,contextOrigin:session.analysisContext.origin,rulesVersion:session.analysisContext.rulesVersion,historyExposures:a.historyExposures,sourceSetIds:exerciseSets(state,e.id).filter(s=>s.status==='COMPLETE').map(s=>s.id),assessedAt:finiteNumber(session.endedAt),abortedPolicy:'COMPLETE_EXERCISE_ONLY',missingEffortPolicy:'NO_INVENTED_RIR'};
  }
  const fatigue=assessWorkoutFatigue(state,session);retainPreviousAnalysis(session,SESSION_ANALYSIS_KEYS);session.fatigueState=fatigue.state;session.fatigueScore=fatigue.score;session.fatigueReasons=fatigue.reasons;
  session.analysisProvenance={version:ANALYSIS_VERSION,contextOrigin:session.analysisContext.origin,rulesVersion:session.analysisContext.rulesVersion,assessedAt:finiteNumber(session.endedAt),sampleCount:fatigue.sampleCount,eligibleExercises:fatigue.eligibleExercises??0,abortedPolicy:'EXCLUDED_FROM_WORKOUT_FATIGUE'};
  return{exerciseAssessments,fatigue};
}

export function trendLabel(stateName){return ({CALIBRATING:'Calibrating',RAPID_ADAPTATION:'Rapid progression',ON_TRACK:'On track',PROGRESSION_APPROACHING:'Progression approaching',SLOWING:'Slower than usual',STALLED:'Stalled',DECLINING:'Declining'})[stateName]||'Not assessed';}
export function fatigueSummary(fatigueState){
  if(fatigueState==='INSUFFICIENT_DATA')return 'There is not enough complete, rated strength data to assess a workout pattern.';
  if(fatigueState==='DELOAD_CANDIDATE')return 'Performance has declined broadly across several recent workouts. A lighter session may be useful.';
  if(fatigueState==='FATIGUE_SUSPECTED')return 'Performance has declined across several recent workouts. Recovery or a lighter session may be worth considering.';
  if(fatigueState==='WATCH')return 'This workout was below your recent pattern. One workout alone is not treated as a fatigue trend.';
  return 'No broad decline pattern was detected in the recorded strength data. This pattern does not establish readiness to train.';
}
