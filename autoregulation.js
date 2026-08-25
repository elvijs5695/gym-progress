// Conservative within-session autoregulation.
// Loaded exercises preserve the programmed rep target and reduce load.
// Bodyweight exercises preserve load semantics and reduce reps instead.
// Exact percentage reductions are practical heuristics and are never forced.

import {Equipment} from './exercise-library.js';

const q25 = n => Math.round(n * 4) / 4;

export function evaluateAutoregulation(justCompleted, allSets, appState, equipment=Equipment.OTHER) {
  const next = allSets
    .filter(s => s.status === 'PENDING' && s.setNumber > justCompleted.setNumber)
    .sort((a,b) => a.setNumber - b.setNumber)[0];
  if (!next) return null;

  const actualReps = Number(justCompleted.actualReps);
  if (!Number.isFinite(actualReps)) return null;
  const actualWeight = Number(justCompleted.actualWeightKg ?? justCompleted.plannedWeightKg ?? 0);
  const inputMax = Math.max(3, Math.min(6, Number(appState.rirInputMax ?? 3)));
  const targetMin = Math.max(0, Math.min(inputMax, Number(appState.targetRirMin ?? 1)));
  const previous = allSets
    .filter(s => s.status === 'COMPLETE' && s.setNumber < justCompleted.setNumber)
    .sort((a,b) => a.setNumber - b.setNumber);
  const previousWithRir = [...previous].reverse().find(s => !s.failure && s.rir != null);
  const previousRir = previousWithRir?.rir == null ? null : Number(previousWithRir.rir);
  const failuresSoFar = previous.filter(s => s.failure).length + (justCompleted.failure ? 1 : 0);
  const repDeficit = Math.max(0, Number(justCompleted.targetReps ?? 0) - actualReps);
  const firstSet = Number(justCompleted.setNumber) === 1;
  const currentRir = justCompleted.rir == null ? null : Number(justCompleted.rir);
  const bodyweight = equipment === Equipment.BODYWEIGHT;

  const weightAdvice = (percent, reason) => ({
    title: 'Performance red flag',
    reason,
    nextSetId: next.id,
    nextSetNumber: next.setNumber,
    suggestedWeightKg: Math.max(.25, Math.min(actualWeight, q25(actualWeight * (1 - percent / 100)))),
    suggestedReps: Number(next.targetReps),
    kind: 'REDUCE_WEIGHT'
  });

  const repAdvice = (amount, reason) => ({
    title: 'Performance red flag',
    reason,
    nextSetId: next.id,
    nextSetNumber: next.setNumber,
    suggestedWeightKg: actualWeight,
    suggestedReps: Math.max(1, Number(next.targetReps) - amount),
    kind: 'REDUCE_REPS'
  });

  const adjust = (weightPercent, repAmount, loadedReason, bodyweightReason=loadedReason) =>
    bodyweight ? repAdvice(repAmount, bodyweightReason) : weightAdvice(weightPercent, loadedReason);

  if (justCompleted.failure && firstSet) {
    const reduction = repDeficit >= 3 ? 7.5 : 5;
    return adjust(
      reduction,
      repDeficit >= 2 ? 2 : 1,
      repDeficit >= 2
        ? 'Failure came on the first set and reps were well below target. Keep the rep target and reduce the next load.'
        : 'Failure came on the first set, before normal set-to-set fatigue should dominate. Keep the rep target and reduce the next load slightly.',
      repDeficit >= 2
        ? 'Failure came on the first set and reps were well below target. Reduce the next rep target.'
        : 'Failure came on the first set. Reduce the next rep target slightly.'
    );
  }

  if (justCompleted.failure && (failuresSoFar >= 2 || repDeficit >= 2)) {
    return adjust(
      5,
      2,
      'Failure is repeating or the rep target was missed by several reps. Keep the rep target and reduce load for the next set.',
      'Failure is repeating or the rep target was missed by several reps. Reduce the next bodyweight rep target.'
    );
  }

  if (justCompleted.failure) {
    return adjust(
      2.5,
      1,
      'A later set reached failure near the rep target. Keep the rep target and reduce the next load slightly.',
      'A later bodyweight set reached failure near the rep target. Trim one rep from the next target.'
    );
  }

  if (repDeficit >= 2) {
    return adjust(
      5,
      1,
      'The set finished several reps below target. Keep the rep target and reduce the next load slightly.',
      'The set finished several reps below target. Reduce the next bodyweight rep target slightly.'
    );
  }

  if (currentRir != null && currentRir < targetMin) {
    const belowTargetBy = targetMin - currentRir;
    if (firstSet) {
      return adjust(
        belowTargetBy >= 2 ? 5 : 2.5,
        1,
        'The first set was closer to failure than your target RIR range. Keep the rep target and reduce the next load slightly.',
        'The first set was closer to failure than your target RIR range. Trim one rep from the next bodyweight target.'
      );
    }

    if (previousRir != null && previousRir - currentRir >= 2) {
      return adjust(
        2.5,
        1,
        'RIR dropped sharply compared with the previous set. Keep the rep target and reduce the next load slightly.',
        'RIR dropped sharply compared with the previous set. Trim one rep from the next bodyweight target.'
      );
    }

    const previousLast = previous.at(-1);
    const previousAlsoLow = !!previousLast && !previousLast.failure && previousLast.rir != null && Number(previousLast.rir) < targetMin;
    if (previousAlsoLow) {
      return adjust(
        2.5,
        1,
        'Two sets in a row are harder than your target RIR range. Keep the rep target and use a small load reduction for the next set.',
        'Two bodyweight sets in a row are harder than your target RIR range. Trim one rep from the next target.'
      );
    }

    if (currentRir === 0 && targetMin >= 2) {
      return adjust(
        2.5,
        1,
        'This set reached 0 RIR while your target is farther from failure. Keep the rep target and reduce the next load slightly.',
        'This bodyweight set reached 0 RIR while your target is farther from failure. Trim one rep from the next target.'
      );
    }
  }

  return null;
}
