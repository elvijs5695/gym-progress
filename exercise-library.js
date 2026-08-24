export const ExerciseType={
  HEAVY_COMPOUND:'HEAVY_COMPOUND',MODERATE_COMPOUND:'MODERATE_COMPOUND',MACHINE_COMPOUND:'MACHINE_COMPOUND',ISOLATION:'ISOLATION'
};
export const RampMode={AUTO:'AUTO',ALWAYS:'ALWAYS',NEVER:'NEVER'};

export const EXERCISES=[
  ['barbell_bench_press','Barbell Bench Press',['Bench Press','Bench','Flat Bench'],ExerciseType.HEAVY_COMPOUND,true,true],
  ['back_squat','Back Squat',['Squat','Barbell Squat'],ExerciseType.HEAVY_COMPOUND,true,true],
  ['deadlift','Deadlift',['Conventional Deadlift'],ExerciseType.HEAVY_COMPOUND,true,true],
  ['sumo_deadlift','Sumo Deadlift',[],ExerciseType.HEAVY_COMPOUND,true,true],
  ['front_squat','Front Squat',[],ExerciseType.HEAVY_COMPOUND,true,true],
  ['overhead_press','Barbell Overhead Press',['Overhead Press','OHP','Military Press'],ExerciseType.HEAVY_COMPOUND,true,true],
  ['incline_barbell_press','Incline Barbell Bench Press',['Incline Bench Press'],ExerciseType.HEAVY_COMPOUND,true,true],
  ['romanian_deadlift','Romanian Deadlift',['RDL'],ExerciseType.MODERATE_COMPOUND,true,true],
  ['barbell_row','Barbell Row',['Bent-over Row'],ExerciseType.MODERATE_COMPOUND,true,true],
  ['hip_thrust','Barbell Hip Thrust',['Hip Thrust'],ExerciseType.MODERATE_COMPOUND,true,true],
  ['leg_press','Leg Press',[],ExerciseType.MACHINE_COMPOUND,true,false],
  ['hack_squat','Hack Squat',[],ExerciseType.MACHINE_COMPOUND,true,false],
  ['chest_press_machine','Machine Chest Press',['Chest Press'],ExerciseType.MACHINE_COMPOUND,true,false],
  ['lat_pulldown','Lat Pulldown',['Pulldown'],ExerciseType.MACHINE_COMPOUND,true,false],
  ['seated_cable_row','Seated Cable Row',['Cable Row'],ExerciseType.MACHINE_COMPOUND,true,false],
  ['shoulder_press_machine','Machine Shoulder Press',['Shoulder Press Machine'],ExerciseType.MACHINE_COMPOUND,true,false],
  ['dumbbell_bench_press','Dumbbell Bench Press',['DB Bench Press'],ExerciseType.MODERATE_COMPOUND,true,false],
  ['incline_dumbbell_press','Incline Dumbbell Press',['Incline DB Press'],ExerciseType.MODERATE_COMPOUND,true,false],
  ['dumbbell_shoulder_press','Dumbbell Shoulder Press',['DB Shoulder Press'],ExerciseType.MODERATE_COMPOUND,true,false],
  ['pull_up','Pull-up',['Pull Up','Chin-up','Chin Up'],ExerciseType.MODERATE_COMPOUND,true,false],
  ['split_squat','Bulgarian Split Squat',['Split Squat'],ExerciseType.MODERATE_COMPOUND,true,false],
  ['leg_extension','Leg Extension',[],ExerciseType.ISOLATION,false,false],
  ['leg_curl','Leg Curl',['Hamstring Curl'],ExerciseType.ISOLATION,false,false],
  ['lateral_raise','Lateral Raise',['Dumbbell Lateral Raise'],ExerciseType.ISOLATION,false,false],
  ['biceps_curl','Biceps Curl',['Dumbbell Curl','Barbell Curl'],ExerciseType.ISOLATION,false,false],
  ['triceps_pushdown','Triceps Pushdown',['Cable Pushdown'],ExerciseType.ISOLATION,false,false],
  ['calf_raise','Calf Raise',['Standing Calf Raise','Seated Calf Raise'],ExerciseType.ISOLATION,false,false],
  ['pec_deck','Pec Deck',['Chest Fly Machine'],ExerciseType.ISOLATION,false,false],
  ['cable_fly','Cable Fly',['Cable Crossover'],ExerciseType.ISOLATION,false,false]
].map(([key,name,aliases,type,automaticRampUp,defaultRemoveWeights])=>({key,name,aliases,type,automaticRampUp,defaultRemoveWeights}));

export function bestMatch(name=''){
  const q=name.trim().toLowerCase();
  return EXERCISES.find(e=>[e.name,...e.aliases].some(n=>n.toLowerCase()===q))||null;
}
export function byKey(key){return EXERCISES.find(e=>e.key===key)||null;}
export function suggestions(query='',limit=8){
  const q=query.trim().toLowerCase();
  if(!q) return EXERCISES.slice(0,limit);
  return EXERCISES.map(e=>{
    let score=99;
    for(const n of [e.name,...e.aliases]){
      const c=n.toLowerCase();
      score=Math.min(score,c===q?0:c.startsWith(q)?1:c.includes(q)?2:99);
    }
    return [score,e];
  }).filter(([s])=>s<99).sort((a,b)=>a[0]-b[0]||a[1].name.localeCompare(b[1].name)).slice(0,limit).map(([,e])=>e);
}

const q25=n=>Math.round(n*4)/4;
export function recommendRamp(workingWeightKg,targetReps,exerciseType){
  if(!(workingWeightKg>0)) return [];
  let raw;
  if(exerciseType===ExerciseType.HEAVY_COMPOUND){
    raw=targetReps<=5?[[.40,6,60],[.60,4,75],[.75,2,90],[.88,1,120]]:
        targetReps<=10?[[.40,8,60],[.60,5,75],[.75,3,90],[.85,1,120]]:
        [[.40,8,60],[.60,5,75],[.75,2,90]];
  }else if(exerciseType===ExerciseType.MODERATE_COMPOUND){
    raw=targetReps<=6?[[.45,6,60],[.65,3,75],[.82,1,90]]:[[.45,6,60],[.65,4,75],[.80,2,90]];
  }else if(exerciseType===ExerciseType.MACHINE_COMPOUND){ raw=[[.50,6,60],[.75,3,75]]; }
  else if(exerciseType===ExerciseType.ISOLATION){ raw=[[.50,8,45]]; }
  else raw=[[.50,6,60],[.75,3,75]];
  const seen=new Set();
  return raw.map(([p,reps,rest])=>({weightKg:q25(workingWeightKg*p),reps,restSeconds:rest,percentOfWorkingWeight:Math.trunc(p*100)}))
    .filter(s=>s.weightKg>0&&s.weightKg<workingWeightKg)
    .filter(s=>{const k=`${s.weightKg}/${s.reps}`;if(seen.has(k))return false;seen.add(k);return true;});
}
