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
export function snapSelectable(value,equipment){if(equipment===Equipment.BODYWEIGHT)return 0;const step=gradingIncrement(equipment);return Math.max(step,snap(Math.max(step,Number(value)||0),step));}
export function stepSelectable(value,direction,equipment){
  const step=gradingIncrement(equipment),scaled=Number(value||0)/step,near=Math.abs(scaled-Math.round(scaled))<.0001;
  const next=direction>0?(near?Math.round(scaled)+1:Math.ceil(scaled)):(near?Math.round(scaled)-1:Math.floor(scaled));
  return equipment===Equipment.BODYWEIGHT?0:Math.max(step,next*step);
}
export function volumeMultiplier(equipment,dumbbellLoad){return equipment===Equipment.DUMBBELL&&dumbbellLoad===DumbbellLoad.PAIR?2:1;}
export function progressionIncrement(base,equipment,exerciseKey=null,exerciseType=ExerciseType.MODERATE_COMPOUND,minCompletedRir=null,targetRirMax=2){
  base=Number(base||0);const minRir=minCompletedRir==null?null:Number(minCompletedRir),comfortable=minRir!=null&&minRir>=Number(targetRirMax||0)+2;
  if(equipment===Equipment.DUMBBELL)return base>=20?1:.5; // per dumbbell
  if(equipment===Equipment.BARBELL){const lower=new Set(['back_squat','front_squat','deadlift','sumo_deadlift','hip_thrust']);return lower.has(exerciseKey)&&base>=100&&comfortable?5:2.5;}
  if(equipment===Equipment.MACHINE||equipment===Equipment.CABLE)return base>=100&&comfortable?5:2.5;
  if(equipment===Equipment.BODYWEIGHT)return 0;
  return exerciseType===ExerciseType.HEAVY_COMPOUND&&base>=100&&comfortable?5:2.5;
}
export function suggestedNextWeight(base,equipment,exerciseKey=null,exerciseType=ExerciseType.MODERATE_COMPOUND,minCompletedRir=null,targetRirMax=2){return snapSelectable(Number(base||0)+progressionIncrement(base,equipment,exerciseKey,exerciseType,minCompletedRir,targetRirMax),equipment);}
function barbellPlateFriendlyRamp(workingWeightKg, raw, maxSets){
  // The 20 kg empty bar may itself be a ramp set, but a 20 kg working set needs no ramp-up.
  // Ramp-only plates intentionally use 5/10/15/20 kg plates per side. 2.5 kg may still be used for the final work load.
  const bar=20, work=Math.max(bar,Number(workingWeightKg)||0), targetCount=Math.max(0,Math.min(Number(maxSets??3),raw.length));
  if(targetCount===0||work<=bar+1e-6)return [];
  const firstSpec=raw[0],emptyBar={weightKg:bar,reps:firstSpec[1],restSeconds:firstSpec[2],percentOfWorkingWeight:Math.round(bar/work*100),plateFriendly:true};
  if(targetCount===1)return [emptyBar];
  const sideBase=Math.floor(Math.max(0,(work-bar)/2)/5)*5;
  if(sideBase<5)return [emptyBar];
  const plates=[5,10,15,20], remainingCount=targetCount-1;
  const desired=raw.slice(1,targetCount).map(x=>x[0]*work);
  let best=null;
  // Search a small plate stack that can stay on the bar: each ramp step adds one plate per side; the final work may add the remaining plate/2.5 kg.
  const maxLen=Math.min(5,remainingCount+2);
  const walk=(seq,sum)=>{
    if(sum>sideBase)return;
    if(seq.length>=2){
      const cumulative=[];let x=0;for(const p of seq){x+=p;cumulative.push(bar+2*x);}
      const ramps=cumulative.filter(v=>v<work-1e-6);
      if(ramps.length){
        const chosen=ramps.slice(0,remainingCount);
        let score=Math.abs(sideBase-sum)*1.2;
        for(let i=0;i<chosen.length;i++)score+=Math.abs(chosen[i]-(desired[i]??desired.at(-1)));
        score+=Math.abs(chosen.length-remainingCount)*25;
        if(!best||score<best.score)best={score,weights:chosen};
      }
    }
    if(seq.length>=maxLen||sum>=sideBase)return;
    for(const p of plates)walk([...seq,p],sum+p);
  };
  walk([],0);
  const weights=best?.weights||[];
  return [emptyBar,...weights.slice(0,remainingCount).map((weightKg,i)=>{const spec=raw[Math.min(i+1,raw.length-1)];return{weightKg,reps:spec[1],restSeconds:spec[2],percentOfWorkingWeight:Math.round(weightKg/work*100),plateFriendly:true};})].slice(0,targetCount);
}
export function recommendRamp(workingWeightKg,targetReps,exerciseType,exerciseKey=null,exerciseName='',equipment=equipmentFor(exerciseKey,exerciseName),maxSets=3){
  if(!(workingWeightKg>0)) return [];
  let raw;
  if(exerciseType===ExerciseType.HEAVY_COMPOUND){raw=targetReps<=5?[[.42,6,60],[.62,4,75],[.80,2,90],[.90,1,120]]:targetReps<=10?[[.42,8,60],[.62,5,75],[.80,3,90],[.90,1,120]]:[[.45,8,60],[.65,5,75],[.82,2,90]];}
  else if(exerciseType===ExerciseType.MODERATE_COMPOUND){raw=targetReps<=6?[[.48,6,60],[.68,3,75],[.84,1,90]]:[[.48,6,60],[.68,4,75],[.82,2,90]];}
  else if(exerciseType===ExerciseType.MACHINE_COMPOUND)raw=[[.50,6,60],[.75,3,75]];
  else if(exerciseType===ExerciseType.ISOLATION)raw=[[.50,8,45]];
  else raw=[[.50,6,60],[.75,3,75]];
  const limit=Math.max(0,Math.min(6,Number(maxSets??3)));
  if(equipment===Equipment.BARBELL)return barbellPlateFriendlyRamp(workingWeightKg,raw,limit);
  const rampSnap=n=>equipment===Equipment.DUMBBELL?snap(n,.5):(equipment===Equipment.MACHINE||equipment===Equipment.CABLE)?snap(n,2.5):snapSelectable(n,equipment);
  const seen=new Set();
  return raw.slice(0,limit).map(([p,reps,rest])=>({weightKg:rampSnap(workingWeightKg*p),reps,restSeconds:rest,percentOfWorkingWeight:Math.trunc(p*100)}))
    .filter(s=>s.weightKg>0&&s.weightKg<workingWeightKg).filter(s=>{const k=`${s.weightKg}/${s.reps}`;if(seen.has(k))return false;seen.add(k);return true;});
}
