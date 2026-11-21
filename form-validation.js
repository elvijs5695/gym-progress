/** Validate edited programme values before a row or identity is mutated. */
export function exerciseFieldErrors(values){
 const errors=[],mode=values.trackingMode||'WEIGHT_REPS',equipment=values.equipment||'OTHER';
 const add=(field,en,lv)=>errors.push({field,en,lv});
 const number=field=>String(values[field]??'').trim()===''?NaN:Number(values[field]);
 if(!String(values.name??'').trim())add('name','Enter an exercise name.','Ievadi vingrinājuma nosaukumu.');
 if(mode==='CARDIO'){
  if(!Number.isFinite(number('cardioMinutes'))||number('cardioMinutes')<1)add('cardioMinutes','Duration must be at least 1 minute.','Ilgumam jābūt vismaz 1 minūtei.');
  return errors;
 }
 if(!Number.isSafeInteger(number('sets'))||number('sets')<1||number('sets')>100)add('sets','Sets must be a whole number from 1 to 100.','Piegājienu skaitam jābūt veselam skaitlim no 1 līdz 100.');
 if(mode==='TIME_ONLY'){
  if(!Number.isFinite(number('seconds'))||number('seconds')<5)add('seconds','Duration must be at least 5 seconds.','Ilgumam jābūt vismaz 5 sekundēm.');
 }else if(!Number.isSafeInteger(number('reps'))||number('reps')<1||number('reps')>10000)add('reps','Repetitions must be a whole number from 1 to 10,000.','Atkārtojumu skaitam jābūt veselam skaitlim no 1 līdz 10 000.');
 if(!Number.isFinite(number('rest'))||number('rest')<0)add('rest','Rest must be 0 seconds or longer.','Atpūtas ilgumam jābūt vismaz 0 sekundēm.');
 if(mode!=='BODYWEIGHT_REPS'&&!['BODYWEIGHT','CARDIO'].includes(equipment)&&(!Number.isFinite(number('weight'))||number('weight')<=0))add('weight','Working weight must be greater than 0 kg.','Darba svaram jābūt lielākam par 0 kg.');
 return errors;
}
