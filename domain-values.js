/** Pure readers: invalid or absent measurements stay absent; source rows are never repaired here. */
export function finiteNumber(value){
  if(value==null||typeof value==='boolean'||typeof value==='object'||String(value).trim()==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
export function numberInRange(value,min=0,max=Infinity){const n=finiteNumber(value);return n!=null&&n>=min&&n<=max?n:null;}
export function positiveNumber(value){const n=finiteNumber(value);return n!=null&&n>0?n:null;}
export function repetitionCount(value){const n=numberInRange(value);return n!=null&&Number.isInteger(n)?n:null;}
export function sameId(a,b){return a!=null&&b!=null&&String(a)===String(b);}
export function trackingModeOf(exercise){
  if(['WEIGHT_REPS','BODYWEIGHT_REPS','TIME_ONLY','CARDIO'].includes(exercise?.trackingMode))return exercise.trackingMode;
  return exercise?.equipment==='CARDIO'?'CARDIO':exercise?.equipment==='BODYWEIGHT'?'BODYWEIGHT_REPS':'WEIGHT_REPS';
}
export function isRepExercise(exercise){return ['WEIGHT_REPS','BODYWEIGHT_REPS'].includes(trackingModeOf(exercise));}
export function assessmentEquipment(exercise){return trackingModeOf(exercise)==='BODYWEIGHT_REPS'?'BODYWEIGHT':exercise?.equipment||'OTHER';}
export function finiteSum(values){const sum=values.reduce((total,value)=>total+value,0);return Number.isFinite(sum)?sum:null;}

/** Only whole completed exposures establish a trend; partial work remains in History. */
export function isCompleteExercise(exercise,sets){
  const target=repetitionCount(exercise?.targetSets);
  return exercise?.status==='COMPLETE'&&target>0&&sets.filter(s=>s.status==='COMPLETE').length===target&&!sets.some(s=>s.status==='SKIPPED'||s.status==='PENDING');
}
