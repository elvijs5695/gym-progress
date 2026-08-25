export const StarterGoal={STRENGTH:'STRENGTH',HYPERTROPHY:'HYPERTROPHY',GENERAL_FITNESS:'GENERAL_FITNESS',CONDITIONING:'CONDITIONING'};
export const StarterExperience={BEGINNER:'BEGINNER',SOME:'SOME',EXPERIENCED:'EXPERIENCED'};

const quarter=n=>Math.round(Number(n||0)*4)/4;

/** Mirrors Android StarterProgramme. Inputs are comfortable ~8-rep working weights, not maxes. */
export function buildStarterProgramme(inputs={}){
  const experienceFactor={BEGINNER:.90,SOME:.95,EXPERIENCED:1}[inputs.experience]??.90;
  const goalFactor={STRENGTH:1,HYPERTROPHY:.95,GENERAL_FITNESS:.85,CONDITIONING:.75}[inputs.goal]??.85;
  const seed=(value,extra=1)=>quarter(Math.max(0,Number(value)||0)*experienceFactor*goalFactor*extra);
  const squat=seed(inputs.squatKg),bench=seed(inputs.benchKg),row=seed(inputs.rowKg),hinge=seed(inputs.hingeKg),deadlift=seed(inputs.hingeKg,1.10),overhead=seed(inputs.benchKg,.60);
  const p={
    STRENGTH:{mainSets:3,mainReps:5,hingeSets:2,hingeReps:6,rest:180},
    HYPERTROPHY:{mainSets:3,mainReps:8,hingeSets:2,hingeReps:8,rest:120},
    GENERAL_FITNESS:{mainSets:2,mainReps:10,hingeSets:2,hingeReps:10,rest:90},
    CONDITIONING:{mainSets:2,mainReps:12,hingeSets:2,hingeReps:12,rest:60}
  }[inputs.goal]||{mainSets:2,mainReps:10,hingeSets:2,hingeReps:10,rest:90};
  const ex=(exerciseKey,sets,reps,weightKg,restSeconds=p.rest)=>({exerciseKey,sets,reps,weightKg,restSeconds});
  return [
    {suffix:'A',exercises:[ex('back_squat',p.mainSets,p.mainReps,squat),ex('barbell_bench_press',p.mainSets,p.mainReps,bench),ex('barbell_row',p.mainSets,p.mainReps,row),ex('romanian_deadlift',p.hingeSets,p.hingeReps,hinge)]},
    {suffix:'B',exercises:[ex('deadlift',p.hingeSets,Math.min(p.hingeReps,8),deadlift,inputs.goal===StarterGoal.STRENGTH?180:p.rest),ex('overhead_press',p.mainSets,p.mainReps,overhead),ex('back_squat',p.hingeSets,p.mainReps,seed(inputs.squatKg,.90)),ex('barbell_row',p.mainSets,p.mainReps,row)]},
    {suffix:'C',exercises:[ex('back_squat',p.mainSets,p.mainReps,squat),ex('barbell_bench_press',p.mainSets,p.mainReps,bench),ex('romanian_deadlift',p.hingeSets,p.hingeReps,hinge),ex('barbell_row',p.mainSets,p.mainReps,row)]}
  ];
}
