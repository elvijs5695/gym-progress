export const ExerciseType={
  HEAVY_COMPOUND:'HEAVY_COMPOUND',MODERATE_COMPOUND:'MODERATE_COMPOUND',MACHINE_COMPOUND:'MACHINE_COMPOUND',ISOLATION:'ISOLATION'
};
export const RampMode={AUTO:'AUTO',ALWAYS:'ALWAYS',NEVER:'NEVER'};
export const Equipment={BARBELL:'BARBELL',DUMBBELL:'DUMBBELL',MACHINE:'MACHINE',CABLE:'CABLE',BODYWEIGHT:'BODYWEIGHT',OTHER:'OTHER'};
export const DumbbellLoad={SINGLE:'SINGLE',PAIR:'PAIR'};

export const EXERCISES=[
  ['barbell_bench_press','Barbell Bench Press',['Bench Press','Bench','Flat Bench'],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['back_squat','Back Squat',['Squat','Barbell Squat'],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['deadlift','Deadlift',['Conventional Deadlift'],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['sumo_deadlift','Sumo Deadlift',[],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['front_squat','Front Squat',[],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['overhead_press','Barbell Overhead Press',['Overhead Press','OHP','Military Press'],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['incline_barbell_press','Incline Barbell Bench Press',['Incline Bench Press'],ExerciseType.HEAVY_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['romanian_deadlift','Romanian Deadlift',['RDL'],ExerciseType.MODERATE_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['barbell_row','Barbell Row',['Bent-over Row'],ExerciseType.MODERATE_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['hip_thrust','Barbell Hip Thrust',['Hip Thrust'],ExerciseType.MODERATE_COMPOUND,true,true,Equipment.BARBELL,DumbbellLoad.SINGLE],
  ['leg_press','Leg Press',[],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['hack_squat','Hack Squat',[],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['chest_press_machine','Machine Chest Press',['Chest Press'],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['lat_pulldown','Lat Pulldown',['Pulldown'],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.CABLE,DumbbellLoad.SINGLE],
  ['seated_cable_row','Seated Cable Row',['Cable Row'],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.CABLE,DumbbellLoad.SINGLE],
  ['shoulder_press_machine','Machine Shoulder Press',['Shoulder Press Machine'],ExerciseType.MACHINE_COMPOUND,true,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['dumbbell_bench_press','Dumbbell Bench Press',['DB Bench Press'],ExerciseType.MODERATE_COMPOUND,true,false,Equipment.DUMBBELL,DumbbellLoad.PAIR],
  ['incline_dumbbell_press','Incline Dumbbell Press',['Incline DB Press'],ExerciseType.MODERATE_COMPOUND,true,false,Equipment.DUMBBELL,DumbbellLoad.PAIR],
  ['dumbbell_shoulder_press','Dumbbell Shoulder Press',['DB Shoulder Press'],ExerciseType.MODERATE_COMPOUND,true,false,Equipment.DUMBBELL,DumbbellLoad.PAIR],
  ['pull_up','Pull-up',['Pull Up','Chin-up','Chin Up'],ExerciseType.MODERATE_COMPOUND,true,false,Equipment.BODYWEIGHT,DumbbellLoad.SINGLE],
  ['split_squat','Bulgarian Split Squat',['Split Squat'],ExerciseType.MODERATE_COMPOUND,true,false,Equipment.OTHER,DumbbellLoad.SINGLE],
  ['leg_extension','Leg Extension',[],ExerciseType.ISOLATION,false,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['leg_curl','Leg Curl',['Hamstring Curl'],ExerciseType.ISOLATION,false,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['lateral_raise','Lateral Raise',['Dumbbell Lateral Raise'],ExerciseType.ISOLATION,false,false,Equipment.DUMBBELL,DumbbellLoad.PAIR],
  ['biceps_curl','Biceps Curl',['Dumbbell Curl','Barbell Curl'],ExerciseType.ISOLATION,false,false,Equipment.OTHER,DumbbellLoad.SINGLE],
  ['triceps_pushdown','Triceps Pushdown',['Cable Pushdown'],ExerciseType.ISOLATION,false,false,Equipment.CABLE,DumbbellLoad.SINGLE],
  ['calf_raise','Calf Raise',['Standing Calf Raise','Seated Calf Raise'],ExerciseType.ISOLATION,false,false,Equipment.OTHER,DumbbellLoad.SINGLE],
  ['pec_deck','Pec Deck',['Chest Fly Machine'],ExerciseType.ISOLATION,false,false,Equipment.MACHINE,DumbbellLoad.SINGLE],
  ['cable_fly','Cable Fly',['Cable Crossover'],ExerciseType.ISOLATION,false,false,Equipment.CABLE,DumbbellLoad.SINGLE]
].map(([key,name,aliases,type,automaticRampUp,defaultRemoveWeights,equipment,dumbbellLoad])=>({key,name,aliases,type,automaticRampUp,defaultRemoveWeights,equipment,dumbbellLoad})).sort((a,b)=>a.name.localeCompare(b.name));

export function bestMatch(name=''){
  const q=name.trim().toLowerCase();
  return EXERCISES.find(e=>[e.name,...e.aliases].some(n=>n.toLowerCase()===q))||null;
}
export function byKey(key){return EXERCISES.find(e=>e.key===key)||null;}
export function equipmentFor(key=null,name=''){
  const resolved=byKey(key)||bestMatch(name);
  if(resolved&&resolved.equipment!==Equipment.OTHER)return resolved.equipment;
  const n=String(name).toLowerCase();
  if(n.includes('dumbbell'))return Equipment.DUMBBELL;
  if(n.includes('barbell'))return Equipment.BARBELL;
  if(n.includes('cable')||n.includes('pulldown')||n.includes('pushdown'))return Equipment.CABLE;
  if(n.includes('machine')||n==='leg press'||n==='hack squat'||n==='pec deck')return Equipment.MACHINE;
  if(n.includes('pull-up')||n.includes('pull up')||n.includes('chin-up')||n.includes('chin up'))return Equipment.BODYWEIGHT;
  return Equipment.OTHER;
}
export function dumbbellLoadFor(key=null,name=''){return (byKey(key)||bestMatch(name))?.dumbbellLoad||DumbbellLoad.SINGLE;}

export function warmupFamily(key,name=''){
  const resolved=byKey(key)||bestMatch(name);
  switch(resolved?.key){
    case 'barbell_bench_press':case 'incline_barbell_press':case 'dumbbell_bench_press':case 'incline_dumbbell_press':case 'chest_press_machine':case 'pec_deck':case 'cable_fly':return 'CHEST_PRESS';
    case 'overhead_press':case 'dumbbell_shoulder_press':case 'shoulder_press_machine':case 'lateral_raise':return 'SHOULDER_PRESS';
    case 'back_squat':case 'front_squat':case 'leg_press':case 'hack_squat':case 'split_squat':case 'leg_extension':return 'KNEE_DOMINANT';
    case 'deadlift':case 'sumo_deadlift':case 'romanian_deadlift':case 'hip_thrust':case 'leg_curl':return 'HIP_HINGE';
    case 'barbell_row':case 'lat_pulldown':case 'seated_cable_row':case 'pull_up':case 'biceps_curl':return 'UPPER_PULL';
    case 'triceps_pushdown':return 'TRICEPS';
    case 'calf_raise':return 'CALF';
    default:return null;
  }
}

export function suggestions(query='',limit=8){
  const q=query.trim().toLowerCase();
  return EXERCISES.filter(e=>!q||[e.name,...e.aliases].some(n=>n.toLowerCase().includes(q)))
    .slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,limit);
}

const snap=(n,step)=>Math.round(Number(n||0)/step)*step;
export function gradingIncrement(equipment){
  if(equipment===Equipment.BARBELL)return .25;
  if(equipment===Equipment.DUMBBELL)return .5;
  if(equipment===Equipment.MACHINE||equipment===Equipment.CABLE)return 2.5;
  if(equipment===Equipment.BODYWEIGHT)return .5;
  return .25;
}
export function snapSelectable(value,equipment){return Math.max(0,snap(value,gradingIncrement(equipment)));}
export function stepSelectable(value,direction,equipment){
  const step=gradingIncrement(equipment),scaled=Number(value||0)/step,near=Math.abs(scaled-Math.round(scaled))<.0001;
  const next=direction>0?(near?Math.round(scaled)+1:Math.ceil(scaled)):(near?Math.round(scaled)-1:Math.floor(scaled));
  return Math.max(0,next*step);
}
export function volumeMultiplier(equipment,dumbbellLoad){return equipment===Equipment.DUMBBELL&&dumbbellLoad===DumbbellLoad.PAIR?2:1;}
export function progressionIncrement(base,equipment,exerciseKey=null,exerciseType=ExerciseType.MODERATE_COMPOUND){
  base=Number(base||0);
  if(equipment===Equipment.DUMBBELL)return base>=20?1:.5; // per dumbbell
  if(equipment===Equipment.BARBELL){const lower=new Set(['back_squat','front_squat','deadlift','sumo_deadlift','hip_thrust']);return lower.has(exerciseKey)&&base>=100?5:2.5;}
  if(equipment===Equipment.MACHINE||equipment===Equipment.CABLE)return base>=100?5:2.5;
  if(equipment===Equipment.BODYWEIGHT)return 2.5;
  return exerciseType===ExerciseType.HEAVY_COMPOUND&&base>=100?5:2.5;
}
export function suggestedNextWeight(base,equipment,exerciseKey=null,exerciseType=ExerciseType.MODERATE_COMPOUND){return snapSelectable(Number(base||0)+progressionIncrement(base,equipment,exerciseKey,exerciseType),equipment);}
export function recommendRamp(workingWeightKg,targetReps,exerciseType,exerciseKey=null,exerciseName='',equipment=equipmentFor(exerciseKey,exerciseName)){
  if(!(workingWeightKg>0)) return [];
  let raw;
  if(exerciseType===ExerciseType.HEAVY_COMPOUND){raw=targetReps<=5?[[.40,6,60],[.60,4,75],[.75,2,90],[.88,1,120]]:targetReps<=10?[[.40,8,60],[.60,5,75],[.75,3,90],[.85,1,120]]:[[.40,8,60],[.60,5,75],[.75,2,90]];}
  else if(exerciseType===ExerciseType.MODERATE_COMPOUND){raw=targetReps<=6?[[.45,6,60],[.65,3,75],[.82,1,90]]:[[.45,6,60],[.65,4,75],[.80,2,90]];}
  else if(exerciseType===ExerciseType.MACHINE_COMPOUND)raw=[[.50,6,60],[.75,3,75]];
  else if(exerciseType===ExerciseType.ISOLATION)raw=[[.50,8,45]];
  else raw=[[.50,6,60],[.75,3,75]];
  const rampSnap=n=>equipment===Equipment.BARBELL?snap(n,5):equipment===Equipment.DUMBBELL?snap(n,.5):(equipment===Equipment.MACHINE||equipment===Equipment.CABLE)?snap(n,2.5):snapSelectable(n,equipment);
  const seen=new Set();
  return raw.map(([p,reps,rest])=>({weightKg:rampSnap(workingWeightKg*p),reps,restSeconds:rest,percentOfWorkingWeight:Math.trunc(p*100)}))
    .filter(s=>s.weightKg>0&&s.weightKg<workingWeightKg).filter(s=>{const k=`${s.weightKg}/${s.reps}`;if(seen.has(k))return false;seen.add(k);return true;});
}
