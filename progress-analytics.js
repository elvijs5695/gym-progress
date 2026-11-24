import {exerciseSets,exerciseMetrics} from './metrics.js';
import {finiteNumber,numberInRange,positiveNumber,repetitionCount,sameId,trackingModeOf,isCompleteExercise} from './domain-values.js';

/** Read a measurement without coercing null/blank to zero or pace from incomplete pairs. */
export function progressMetricValue(row,metric){
  if(!row)return null;
  if(metric==='DISTANCE')return numberInRange(row.totalDistanceKm);
  if(metric==='PACE')return Object.hasOwn(row,'paceSecondsPerKm')?positiveNumber(row.paceSecondsPerKm):positiveNumber(row.totalDistanceKm)&&positiveNumber(row.totalDurationSeconds)?Number(row.totalDurationSeconds)/Number(row.totalDistanceKm):null;
  if(metric==='HEART_RATE')return numberInRange(row.averageHeartRateBpm,30,240);
  if(metric==='POWER')return numberInRange(row.averagePowerWatts,1,2500);
  if(metric==='RPE')return numberInRange(row.sessionRpe,1,10);
  if(metric==='LOAD')return numberInRange(row.cardioLoad);
  if(metric==='WEIGHT')return numberInRange(row.maxWeight);
  if(metric==='REPS')return repetitionCount(row.maxReps);
  if(metric==='VOLUME')return numberInRange(row.volume);
  if(metric==='DURATION')return positiveNumber(row.totalDurationSeconds);
  if(metric==='E1RM')return positiveNumber(row.bestE1rm);
  return null;
}
const cycleMetrics={WEIGHT:'maxWeight',REPS:'maxReps',VOLUME:'volume',E1RM:'bestE1rm',DURATION:'totalDurationSeconds'};
const chronological=(a,b)=>Number(a.sessionStartedAt)-Number(b.sessionStartedAt)||String(a.sessionExerciseId).localeCompare(String(b.sessionExerciseId),undefined,{numeric:true});
function metricWinner(rows,metric){return rows.filter(r=>progressMetricValue(r,metric)!=null).slice().sort((a,b)=>progressMetricValue(b,metric)-progressMetricValue(a,metric)||chronological(b,a))[0]||null;}

/** Existing cycle-best presentation, now with every original source occurrence retained.
 * Old/archived occurrences are derived from history, never inferred only from today's plan.
 * Unlike a real workout row, a cycle point can have a different source for each metric.
 */
export function aggregateOccurrenceCycles(rows,occurrenceIds=[]){
  const ids=[...new Set([...occurrenceIds,...rows.map(r=>r.programmeExerciseId)].filter(id=>id!=null&&id!=='' ).map(String))];
  const contexts=new Set(rows.map(r=>JSON.stringify([r.trackingMode,r.equipment,r.dumbbellLoad])));
  if(ids.length<=1||rows.some(r=>r.trackingMode==='CARDIO')||contexts.size>1)return rows.slice().sort(chronological);
  const groups=ids.map(id=>rows.filter(r=>sameId(r.programmeExerciseId,id)).sort(chronological));
  const unassigned=rows.filter(r=>r.programmeExerciseId==null||r.programmeExerciseId==='');
  const cycles=[];
  for(let index=0;index<Math.max(0,...groups.map(group=>group.length));index++){
    const members=groups.map(group=>group[index]).filter(Boolean);if(!members.length)continue;
    const representative=metricWinner(members,'WEIGHT')||metricWinner(members,'REPS')||metricWinner(members,'DURATION')||members[0];
    const metricSources=Object.fromEntries(Object.keys(cycleMetrics).map(metric=>[metric,metricWinner(members,metric)]));
    const values=Object.fromEntries(Object.entries(cycleMetrics).map(([metric,field])=>[field,metricSources[metric]?progressMetricValue(metricSources[metric],metric):null]));
    cycles.push({...representative,...values,
      sessionStartedAt:Math.max(...members.map(r=>Number(r.sessionStartedAt))),
      representativeSessionStartedAt:representative.sessionStartedAt,programmeExerciseId:null,
      completedSets:Math.max(...members.map(r=>r.completedSets)),
      actionableFailureCount:members.every(r=>r.actionableFailureCount>0)?1:0,
      avgRir:members.map(r=>numberInRange(r.avgRir)).filter(v=>v!=null).sort((a,b)=>b-a)[0]??null,
      progressionOffered:members.some(r=>r.progressionOffered),progressionAccepted:members.some(r=>r.progressionAccepted),
      cycleMembers:members.length,cycleIndex:index+1,aggregationMode:'CYCLE_BEST',sourceRows:members,metricSources,
      sourceSessionExerciseIds:members.map(r=>r.sessionExerciseId),sourceSessionIds:[...new Set(members.map(r=>r.sessionId))],
      sourceSetIds:members.flatMap(r=>r.sourceSetIds||[])
    });
  }
  return [...cycles,...unassigned].sort(chronological);
}

export function exerciseHistoryRows(state,{userExerciseId,programmeExerciseId=null}={}, {aggregateOccurrences=true,includePartialAborted=false}={}){
  if(userExerciseId==null)return[];
  const sessionById=new Map((state.workout_sessions||[]).map(s=>[String(s.id),s]));
  const candidates=(state.session_exercises||[]).filter(e=>sameId(e.userExerciseId,userExerciseId)&&(programmeExerciseId==null||sameId(e.programmeExerciseId,programmeExerciseId)));
  const rows=[];
  for(const e of candidates){
    const session=sessionById.get(String(e.sessionId)),sets=exerciseSets(state,e.id),fullyCompleted=isCompleteExercise(e,sets);
    if(!session||!(session.status==='COMPLETE'||session.status==='ABORTED'&&(fullyCompleted||includePartialAborted)))continue;
    if(finiteNumber(session.startedAt)==null)continue;
    const metrics=exerciseMetrics(state,e);
    rows.push({...metrics,sessionStartedAt:Number(session.startedAt),sessionId:session.id,sessionExerciseId:e.id,
      userExerciseId:e.userExerciseId,programmeExerciseId:e.programmeExerciseId??null,status:e.status,sessionStatus:session.status,
      equipment:e.equipment||'OTHER',dumbbellLoad:e.dumbbellLoad||'SINGLE',trackingMode:trackingModeOf(e),
      progressionOffered:e.progressionOffered===true,progressionAccepted:e.progressionAccepted===true,
      aggregationMode:'EXPOSURE',fullyCompleted,sourceSetIds:sets.filter(s=>s.status==='COMPLETE').map(s=>s.id),
      sourceSessionExerciseIds:[e.id],sourceSessionIds:[session.id]
    });
  }
  rows.sort(chronological);
  if(programmeExerciseId!=null||!aggregateOccurrences)return rows;
  const occurrenceIds=(state.template_exercises||[]).filter(e=>sameId(e.userExerciseId,userExerciseId)).map(e=>e.programmeExerciseId);
  return aggregateOccurrenceCycles(rows,occurrenceIds);
}

/** Use a cycle metric's actual source when colouring or explaining that metric. */
export function sourceForProgressMetric(row,metric){return row?.metricSources?.[metric]||row;}
