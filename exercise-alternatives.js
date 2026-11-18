// Generated from vetted analogue relationships; use matching Android mapping.
// Unknown pairs are intentionally NOT presented as equivalent movements.
export const ALTERNATIVE_RELATIONS=Object.freeze({
  'back_squat|front_squat':'CLOSE',
  'back_squat|hack_squat':'CLOSE',
  'back_squat|leg_press':'CLOSE',
  'barbell_bench_press|chest_press_machine':'EQUIVALENT',
  'barbell_bench_press|dumbbell_bench_press':'EQUIVALENT',
  'barbell_row|seated_cable_row':'CLOSE',
  'cable_fly|pec_deck':'EQUIVALENT',
  'chest_press_machine|barbell_bench_press':'EQUIVALENT',
  'chest_press_machine|dumbbell_bench_press':'EQUIVALENT',
  'deadlift|romanian_deadlift':'CLOSE',
  'deadlift|sumo_deadlift':'CLOSE',
  'dumbbell_bench_press|barbell_bench_press':'EQUIVALENT',
  'dumbbell_bench_press|chest_press_machine':'EQUIVALENT',
  'dumbbell_shoulder_press|overhead_press':'EQUIVALENT',
  'dumbbell_shoulder_press|shoulder_press_machine':'EQUIVALENT',
  'front_squat|back_squat':'CLOSE',
  'front_squat|hack_squat':'CLOSE',
  'front_squat|leg_press':'CLOSE',
  'hack_squat|back_squat':'CLOSE',
  'hack_squat|front_squat':'CLOSE',
  'hack_squat|leg_press':'CLOSE',
  'incline_barbell_press|incline_dumbbell_press':'EQUIVALENT',
  'incline_dumbbell_press|incline_barbell_press':'EQUIVALENT',
  'lat_pulldown|pull_up':'EQUIVALENT',
  'leg_press|back_squat':'CLOSE',
  'leg_press|front_squat':'CLOSE',
  'leg_press|hack_squat':'CLOSE',
  'overhead_press|dumbbell_shoulder_press':'EQUIVALENT',
  'overhead_press|shoulder_press_machine':'EQUIVALENT',
  'pec_deck|cable_fly':'EQUIVALENT',
  'pull_up|lat_pulldown':'EQUIVALENT',
  'romanian_deadlift|deadlift':'CLOSE',
  'romanian_deadlift|sumo_deadlift':'CLOSE',
  'seated_cable_row|barbell_row':'CLOSE',
  'shoulder_press_machine|dumbbell_shoulder_press':'EQUIVALENT',
  'shoulder_press_machine|overhead_press':'EQUIVALENT',
  'sumo_deadlift|deadlift':'CLOSE',
  'sumo_deadlift|romanian_deadlift':'CLOSE',
});
// The bundled map is a last-resort first-install/offline fallback. Once a valid
// reference snapshot arrives, Supabase is authoritative; removing a relationship
// centrally must remove it from suggestions too.
import {CANONICAL_BY_KEY} from './exercise-catalogue.js';
let publishedRelations=null;
export function installPublishedRelations(rows){
  if(!Array.isArray(rows)||rows.length<30)throw new Error('Incomplete exercise-substitution catalogue');
  const next=new Map();
  for(const row of rows){
    if(!['EQUIVALENT','CLOSE'].includes(row?.relationship))continue;
    const sources=[row.sourceKey,row.sourceLegacyKey].filter(Boolean);
    const targets=[row.targetKey,row.targetLegacyKey].filter(Boolean);
    for(const source of sources)for(const target of targets){
      if(source!==target)next.set(`${source}|${target}`,{relationship:row.relationship,priority:Number(row.priority||100)});
    }
  }
  if(next.size<30)throw new Error('Invalid exercise-substitution catalogue');
  publishedRelations=next;
}
export function alternativeRelation(sourceKey,targetKey){
  if(!sourceKey||!targetKey)return null;
  if(publishedRelations)return publishedRelations.get(`${sourceKey}|${targetKey}`)?.relationship||null;
  const source=CANONICAL_BY_KEY.get(sourceKey)?.legacyExerciseKey||sourceKey;
  const target=CANONICAL_BY_KEY.get(targetKey)?.legacyExerciseKey||targetKey;
  return ALTERNATIVE_RELATIONS[`${source}|${target}`]||null;
}
export function alternativePriority(sourceKey,targetKey){
  if(!sourceKey||!targetKey)return 100;
  return publishedRelations?.get(`${sourceKey}|${targetKey}`)?.priority??100;
}
