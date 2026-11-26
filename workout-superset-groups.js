/** Pure 2–4 member superset domain model. No rendering, timers or persistence. */
export const MIN_SUPERSET_MEMBERS=2;
export const MAX_SUPERSET_MEMBERS=4;
const ordered=rows=>(rows||[]).slice().sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0));
const same=(a,b)=>String(a)===String(b);
export function validateSupersetProgramme(exercises){
 const list=ordered(exercises),seen=new Set(),errors=[];
 for(const exercise of list){
  const group=exercise.supersetGroupId;if(!group||seen.has(String(group)))continue;seen.add(String(group));
  const members=list.filter(e=>e.supersetGroupId&&same(e.supersetGroupId,group));
  if(members.length<MIN_SUPERSET_MEMBERS||members.length>MAX_SUPERSET_MEMBERS){errors.push({groupId:group,code:'GROUP_SIZE',count:members.length});continue;}
  const first=list.findIndex(x=>same(x.id,members[0].id));
  if(!members.every((e,index)=>same(list[first+index]?.id,e.id)))errors.push({groupId:group,code:'NON_CONTIGUOUS'});
  // Two-member legacy supersets with unequal set counts stay valid. Larger
  // groups cannot be executed as whole cycles without aligned set targets.
  if(members.length>2&&!members.every(e=>Number(e.sets??e.targetSets)===Number(members[0].sets??members[0].targetSets)))
   errors.push({groupId:group,code:'MISMATCHED_TARGET_SETS'});
 }
 return errors;
}
export function validSupersetMembers(exercises,member){
 if(!member?.supersetGroupId)return null;
 const list=ordered(exercises),members=list.filter(x=>x.supersetGroupId&&same(x.supersetGroupId,member.supersetGroupId));
 if(members.length<MIN_SUPERSET_MEMBERS||members.length>MAX_SUPERSET_MEMBERS)return null;
 const first=list.findIndex(x=>same(x.id,members[0].id));
 if(!members.every((e,i)=>same(list[first+i]?.id,e.id)))return null;
 if(members.length>2&&!members.every(e=>Number(e.sets??e.targetSets)===Number(members[0].sets??members[0].targetSets)))return null;
 return members;
}
/** Adjacent editor blocks may be merged up to four members without replacing IDs. */
export function joinableSupersetMembers(exercises,lastOfFirst,firstOfSecond){
 if(!lastOfFirst||!firstOfSecond||!same(lastOfFirst.workoutId,firstOfSecond.workoutId))return null;
 const list=ordered(exercises),i=list.findIndex(e=>same(e.id,lastOfFirst.id));
 if(i<0||!same(list[i+1]?.id,firstOfSecond.id))return null;
 const first=lastOfFirst.supersetGroupId?list.filter(e=>e.supersetGroupId&&same(e.supersetGroupId,lastOfFirst.supersetGroupId)):[lastOfFirst];
 const second=firstOfSecond.supersetGroupId?list.filter(e=>e.supersetGroupId&&same(e.supersetGroupId,firstOfSecond.supersetGroupId)):[firstOfSecond];
 if(first.some(a=>second.some(b=>same(a.id,b.id))))return null;
 const members=ordered([...first,...second]);
 if(members.length<MIN_SUPERSET_MEMBERS||members.length>MAX_SUPERSET_MEMBERS)return null;
 const firstIndex=list.findIndex(e=>same(e.id,members[0].id));
 if(!members.every((e,j)=>same(e.id,list[firstIndex+j]?.id)))return null;
 if(members.length>2&&!members.every(e=>Number(e.sets??e.targetSets)===Number(members[0].sets??members[0].targetSets)))return null;
 return members;
}
export function groupedProgrammeBlocks(exercises){
 const list=ordered(exercises),groups=[],seen=new Set();
 for(let i=0;i<list.length;i++){
  const e=list[i],members=validSupersetMembers(list,e);
  if(members&& !seen.has(String(e.supersetGroupId))){
   seen.add(String(e.supersetGroupId));groups.push({type:'superset',id:e.id,groupId:e.supersetGroupId,items:members});i+=members.length-1;
  }else groups.push({type:'single',id:e.id,groupId:null,items:[e]});
 }
 return groups;
}
