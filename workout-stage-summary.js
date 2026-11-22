/** Pure UI projection; does not alter performed sets or workout state. */
export function restTaskSummary(exercises=[],performedSets=[],nextExerciseId=null){
  const groups=[],byKey=new Map();
  for(const e of [...exercises].sort((a,b)=>(a.position??0)-(b.position??0))){
    const key=e.supersetGroupId!=null?`superset:${e.supersetGroupId}`:`exercise:${e.id}`;
    if(!byKey.has(key)){const group={key,members:[],status:'upcoming'};groups.push(group);byKey.set(key,group);}
    byKey.get(key).members.push(e);
  }
  for(const group of groups){
    const ids=new Set(group.members.map(e=>String(e.id)));
    const sets=performedSets.filter(s=>ids.has(String(s.sessionExerciseId)));
    const pending=sets.some(s=>s.status==='PENDING');
    const completed=sets.some(s=>s.status==='COMPLETE');
    if(group.members.some(e=>String(e.id)===String(nextExerciseId)))group.status='active';
    else if(sets.length && !pending && completed)group.status='completed';
    else if(sets.length && !pending && !completed)group.status='skipped';
  }
  return groups;
}
