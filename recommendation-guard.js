/** A recommendation is a proposal against a particular local baseline. Keeping
 * that baseline prevents a delayed dialog from overwriting a subsequent edit.
 * Tokens are transient; never serialise their state reference into a backup.
 */
const sameId=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const canonical=value=>value&&typeof value==='object'?(Array.isArray(value)?value.map(canonical):Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))):value;
const fingerprint=value=>JSON.stringify(canonical(value));
function target(state,exerciseId,setId){
  const exercise=(state.session_exercises||[]).find(row=>sameId(row.id,exerciseId));
  if(!exercise)return null;
  const session=(state.workout_sessions||[]).find(row=>sameId(row.id,exercise.sessionId));
  const template=(state.template_exercises||[]).find(row=>sameId(row.id,exercise.templateExerciseId))||null;
  const sets=(state.performed_sets||[]).filter(row=>sameId(row.sessionExerciseId,exercise.id));
  const set=setId==null?null:sets.find(row=>sameId(row.id,setId))||null;
  return {exercise,template,session,sets,set};
}
function baseline(value){return fingerprint({exercise:value.exercise,template:value.template,sets:value.sets,session:value.session?{id:value.session.id,status:value.session.status,startedAt:value.session.startedAt}:null});}
export function captureRecommendationTarget(state,exerciseId,{setId=null,contextVersion=null}={}){
  const value=target(state,exerciseId,setId);if(!value?.session||setId!=null&&!value.set)return null;
  return {stateRef:state,contextVersion,exerciseId,setId,baseline:baseline(value)};
}
export function currentRecommendationTarget(state,token,{contextVersion=null,requireTemplate=false,requirePendingSet=false}={}){
  if(!token||token.stateRef!==state||token.contextVersion!==contextVersion)return null;
  const value=target(state,token.exerciseId,token.setId);
  if(!value?.session||baseline(value)!==token.baseline||requireTemplate&&!value.template||requirePendingSet&&value.set?.status!=='PENDING')return null;
  return value;
}
export function recommendationWeight(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  const text=String(value).trim();
  // Accept either decimal separator, never grouping, partial parses or exponents.
  if(typeof value==='string'&&!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))return null;
  const number=Number(text.replace(',','.'));
  return text!==''&&Number.isFinite(number)&&number>=0?number:null;
}
export function recommendationReps(value){
  const number=recommendationWeight(value);
  return number!=null&&Number.isSafeInteger(number)&&number>=1?number:null;
}
