export const StarterGoal={STRENGTH:'STRENGTH',HYPERTROPHY:'HYPERTROPHY',GENERAL_FITNESS:'GENERAL_FITNESS',CONDITIONING:'CONDITIONING'};
export const StarterExperience={BEGINNER:'BEGINNER',SOME:'SOME',EXPERIENCED:'EXPERIENCED'};

const RATIOS={squatKg:1.00,benchKg:0.70,rowKg:0.70,hingeKg:0.90};

const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
const median=values=>{const a=values.slice().sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};

/**
 * Resolve missing comfortable ~8-rep reference weights.
 * Known lifts are kept unchanged. Missing lifts are estimated from the user's
 * other entered lifts using deliberately broad novice-friendly movement ratios.
 * Missing weights stay unassigned unless the user explicitly requests estimates
 * from at least one known reference. First-use calibration collects the actual load.
 */
export function resolveStarterWeights(inputs={}){
  const known={};
  for(const key of Object.keys(RATIOS)) known[key]=positive(inputs[key]);
  const scales=Object.entries(RATIOS).flatMap(([key,ratio])=>known[key]!=null?[known[key]/ratio]:[]);
  const scale=inputs.estimateMissing===true?median(scales):null;
  const resolved={};
  for(const [key,ratio] of Object.entries(RATIOS)) resolved[key]=known[key]??(scale==null?null:scale*ratio);
  return resolved;
}

export function missingStarterWeightKeys(inputs={}){
  return Object.keys(RATIOS).filter(key=>positive(inputs[key])==null);
}

/** Mirrors Android StarterProgramme. Inputs are comfortable ~8-rep working weights, not maxes. */
export function buildStarterProgramme(inputs={}){
  const experienceFactor=inputs.experience===StarterExperience.BEGINNER?.90:inputs.experience===StarterExperience.SOME?.95:1;
  const goalFactor=inputs.goal===StarterGoal.STRENGTH?1:inputs.goal===StarterGoal.HYPERTROPHY?.95:inputs.goal===StarterGoal.CONDITIONING?.75:.85;
  const refs=resolveStarterWeights(inputs);
  const seed=(value,extra=1)=>value==null?null:Math.round(Math.max(0,Number(value)||0)*experienceFactor*goalFactor*extra*4)/4;
  const squat=seed(refs.squatKg),bench=seed(refs.benchKg),row=seed(refs.rowKg),hinge=seed(refs.hingeKg),deadlift=seed(refs.hingeKg,1.10),overhead=seed(refs.benchKg,.60);
  const p=inputs.goal===StarterGoal.STRENGTH?{mainSets:3,mainReps:5,hingeSets:2,hingeReps:6,rest:180}:inputs.goal===StarterGoal.HYPERTROPHY?{mainSets:3,mainReps:8,hingeSets:2,hingeReps:8,rest:120}:inputs.goal===StarterGoal.CONDITIONING?{mainSets:2,mainReps:12,hingeSets:2,hingeReps:12,rest:60}:{mainSets:2,mainReps:10,hingeSets:2,hingeReps:10,rest:90};
  const ex=(exerciseKey,sets,reps,weightKg,restSeconds=p.rest)=>({exerciseKey,sets,reps,weightKg,restSeconds});
  const days=[
    {suffix:'A',exercises:[ex('back_squat',p.mainSets,p.mainReps,squat),ex('barbell_bench_press',p.mainSets,p.mainReps,bench),ex('barbell_row',p.mainSets,p.mainReps,row),ex('romanian_deadlift',p.hingeSets,p.hingeReps,hinge)]},
    {suffix:'B',exercises:[ex('deadlift',p.hingeSets,Math.min(p.hingeReps,8),deadlift,inputs.goal===StarterGoal.STRENGTH?180:p.rest),ex('overhead_press',p.mainSets,p.mainReps,overhead),ex('back_squat',p.hingeSets,p.mainReps,seed(refs.squatKg,.90)),ex('barbell_row',p.mainSets,p.mainReps,row)]},
    {suffix:'C',exercises:[ex('back_squat',p.mainSets,p.mainReps,squat),ex('barbell_bench_press',p.mainSets,p.mainReps,bench),ex('romanian_deadlift',p.hingeSets,p.hingeReps,hinge),ex('barbell_row',p.mainSets,p.mainReps,row)]}
  ];
  // Keep the compact starting plan. The optional six-exercise version adds
  // accessory movement patterns; it never changes an existing programme.
  if(Number(inputs.exercisesPerDay)===6){
    const timed=key=>({exerciseKey:key,sets:2,reps:0,weightKg:0,restSeconds:45,trackingMode:'TIME_ONLY',targetSeconds:30});
    days[0].exercises.push(ex('lat_pulldown',2,10,null,60),timed('plank'));
    days[1].exercises.push(ex('lat_pulldown',2,10,null,60),{...ex('dead_bug',2,8,0,45),trackingMode:'BODYWEIGHT_REPS'});
    days[2].exercises.push({...ex('reverse_lunge',2,8,0,60),trackingMode:'BODYWEIGHT_REPS'},timed('plank'));
  }
  return days;
}
