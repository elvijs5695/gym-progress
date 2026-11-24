import {uuid,TrackingMode,trackingModeFor} from './exercise-identity.js';
/**
 * A catalogue link changes identity for FUTURE sessions only. Once an exercise
 * has history, fork its user/occurrence IDs so an unrelated new catalogue
 * movement cannot merge old measurements or retroactively relabel records.
 * Callers must save atomically and sync after success. No old record is edited.
 */
export function relinkForFuture(state,templateId,canonical=null){
 const template=(state.template_exercises||[]).find(e=>String(e.id)===String(templateId));
 const user=template?(state.user_exercises||[]).find(u=>String(u.id)===String(template.userExerciseId)):null;
 if(!template||!user)throw new Error('Exercise not found');
 const nextCanonicalId=canonical?.id||null;
 if((user.canonicalExerciseId||null)===nextCanonicalId)return {changed:false,forked:false,oldUserExerciseId:user.id,newUserExerciseId:user.id};
 const beforeMode=user.trackingMode||trackingModeFor(user.equipment);
 const historical=(state.session_exercises||[]).some(e=>String(e.userExerciseId)===String(user.id));
 const updated=historical?{...user,id:uuid(),archived:false}:user;
 if(historical){state.user_exercises.push(updated);user.archived=true;}
 updated.canonicalExerciseId=nextCanonicalId;
 updated.candidateCanonicalExerciseId=null;
 if(canonical){
  updated.equipment=canonical.equipment;
  updated.dumbbellLoad=canonical.dumbbellLoad;
  updated.exerciseType=canonical.exerciseType;
  updated.trackingMode=trackingModeFor(canonical.equipment);
  if(updated.displayNameMode==='CATALOGUE'){updated.displayName=canonical.nameEn||updated.displayName;}
 }
 const nextMode=updated.trackingMode||beforeMode;
 for(const occurrence of state.template_exercises||[]){
  if(String(occurrence.userExerciseId)!==String(user.id)||!historical&&occurrence!==template&&occurrence.userExerciseId==null)continue;
  // All current occurrences share the same user exercise identity; historical
  // session snapshots continue to use the original immutable IDs.
  if(historical){occurrence.userExerciseId=updated.id;occurrence.programmeExerciseId=uuid();}
  occurrence.canonicalExerciseId=nextCanonicalId;
  occurrence.equipment=updated.equipment;
  occurrence.dumbbellLoad=updated.dumbbellLoad;
  occurrence.exerciseType=updated.exerciseType;
  occurrence.trackingMode=nextMode;
  if(nextMode===TrackingMode.CARDIO||nextMode===TrackingMode.TIME_ONLY){
    occurrence.targetSeconds=Math.max(1,Number(occurrence.targetSeconds)||60);
    occurrence.initialWeightKg=0;occurrence.requiresCalibration=false;
  }else if(nextMode===TrackingMode.BODYWEIGHT_REPS){
    occurrence.initialWeightKg=0;occurrence.requiresCalibration=false;
  }else if(beforeMode!==TrackingMode.WEIGHT_REPS){
    occurrence.initialWeightKg=null;occurrence.requiresCalibration=true;
  }
  if(!canonical?.friendE1rmEligible)occurrence.compareWithFriends=false;
 }
 return {changed:true,forked:historical,oldUserExerciseId:user.id,newUserExerciseId:updated.id};
}
