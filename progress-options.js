import {displayNameForUserExercise} from './exercise-identity.js';

const same=(a,b)=>String(a)===String(b);
const text=(lang,en,lv)=>lang==='lv'?lv:en;

/** Name collisions are presentation, never an instruction to merge identities.
 * Include historical occurrences even after their programme day was deleted. */
export function buildProgressExerciseOptions(state,lang=state?.app_state?.languageCode||'en'){
 const templateRows=state.template_exercises||[],historyRows=state.session_exercises||[];
 const ids=[...new Set([...templateRows,...historyRows].map(e=>e.userExerciseId).filter(Boolean).map(String))];
 const workouts=new Map((state.workout_templates||[]).map(w=>[String(w.id),w]));
 const sessions=new Map((state.workout_sessions||[]).map(s=>[String(s.id),s]));
 const options=[];
 for(const id of ids){
  const user=(state.user_exercises||[]).find(u=>same(u.id,id));if(!user)continue;
  const name=displayNameForUserExercise(state,user,undefined,lang),occurrences=new Map();
  const current=templateRows.filter(e=>same(e.userExerciseId,id)).sort((a,b)=>Number(a.position)-Number(b.position));
  for(const row of current){
   const key=row.programmeExerciseId||`template:${row.id}`,day=workouts.get(String(row.workoutId));
   occurrences.set(String(key),{key:row.programmeExerciseId||null,day:day?.name||text(lang,'Day','Diena'),position:Number(row.position)||0,archived:false});
  }
  for(const row of historyRows.filter(e=>same(e.userExerciseId,id))){
   const key=row.programmeExerciseId;
   if(key!=null&&!occurrences.has(String(key))){const session=sessions.get(String(row.sessionId));occurrences.set(String(key),{key,day:session?.workoutName||text(lang,'Archived day','Arhivēta diena'),position:Number(row.position)||0,archived:true});}
  }
  const list=[...occurrences.values()];
  const primary=list.length>1?text(lang,'All days','Visas dienas'):list[0]?.day||text(lang,'History','Vēsture');
  options.push({value:`u:${id}`,label:`${name} · ${primary}`,name,day:primary,userExerciseId:id,programmeExerciseId:null,position:list[0]?.position||0,aggregate:list.length>1});
  if(list.length>1)for(const occurrence of list){
   if(occurrence.key==null)continue;
   const siblings=list.filter(x=>x.day===occurrence.day),ordinal=siblings.indexOf(occurrence)+1;
   const day=occurrence.day+(siblings.length>1?` · ${ordinal}`:'')+(occurrence.archived?` · ${text(lang,'archived','arhivēts')}`:'');
   options.push({value:`p:${id}:${occurrence.key}`,label:`${name} · ${day}`,name,day,userExerciseId:id,programmeExerciseId:occurrence.key,position:occurrence.position,aggregate:false});
  }
 }
 // Different user-created identities can share both a label and a day. Keep
 // separate selections and add a stable visible ordinal, rather than hiding one.
 const groups=new Map();for(const option of options){const key=option.label.toLocaleLowerCase(lang==='lv'?'lv-LV':'en-GB');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(option);}
 for(const group of groups.values())if(group.length>1){group.sort((a,b)=>a.position-b.position||a.value.localeCompare(b.value));group.forEach((option,i)=>{option.label+=` · ${i+1}`;});}
 return options.sort((a,b)=>a.name.localeCompare(b.name,lang==='lv'?'lv-LV':'en-GB')||Number(b.aggregate)-Number(a.aggregate)||a.label.localeCompare(b.label,lang==='lv'?'lv-LV':'en-GB')||a.value.localeCompare(b.value));
}
