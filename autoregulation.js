// Conservative within-session autoregulation.
// The evidence is stronger for the principles (proximity to failure is useful,
// failure creates more acute fatigue, and performance should be autoregulated)
// than for one universal percentage reduction. The small changes below are
// therefore practical heuristics and are never applied without the user's choice.

const q25 = n => Math.round(n * 4) / 4;

export function evaluateAutoregulation(justCompleted, allSets, appState) {
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

  const weightAdvice = (percent, reason) => ({
    title: 'Performance red flag',
    reason,
    nextSetId: next.id,
    nextSetNumber: next.setNumber,
    suggestedWeightKg: Math.min(actualWeight, q25(actualWeight * (1 - percent / 100))),
    suggestedReps: Number(next.targetReps),
    kind: 'REDUCE_WEIGHT'
  });

  const repAdvice = (amount, reason) => {
    const reduced = Math.max(1, Number(next.targetReps) - amount);
    if (reduced === Number(next.targetReps)) return weightAdvice(5, reason);
    return {
      title: 'Performance red flag',
      reason,
      nextSetId: next.id,
      nextSetNumber: next.setNumber,
      suggestedWeightKg: actualWeight,
      suggestedReps: reduced,
      kind: 'REDUCE_REPS'
    };
  };

  if (justCompleted.failure && firstSet) {
    const reduction = repDeficit >= 3 ? 7.5 : 5;
    return weightAdvice(
      reduction,
      repDeficit >= 2
        ? 'Failure came on the first set and reps were well below target. Today’s load is probably too ambitious.'
        : 'Failure came on the first set, before normal set-to-set fatigue should dominate. Reduce the next load slightly.'
    );
  }

  if (justCompleted.failure && (failuresSoFar >= 2 || repDeficit >= 2)) {
    return weightAdvice(5, 'Failure is repeating or the rep target was missed by several reps. Reduce load rather than repeatedly grinding.');
  }

  if (justCompleted.failure) {
    return repAdvice(1, 'A later set reached failure near the rep target. Keep the load, but trim one rep from the next target to manage fatigue.');
  }

  if (repDeficit >= 2) {
    return weightAdvice(5, 'The set finished several reps below target. Reduce the next load slightly and reassess.');
  }

  if (currentRir != null && currentRir < targetMin) {
    const belowTargetBy = targetMin - currentRir;
    if (firstSet) {
      return belowTargetBy >= 2
        ? weightAdvice(5, 'The first set was much closer to failure than your target RIR range. Reduce the next load slightly.')
        : repAdvice(1, 'The first set was closer to failure than your target RIR range. Keep the load and trim one rep from the next target.');
    }

    if (previousRir != null && previousRir - currentRir >= 2) {
      return repAdvice(1, 'RIR dropped sharply compared with the previous set. That is a fatigue red flag, so trim one rep from the next target.');
    }

    const previousLast = previous.at(-1);
    const previousAlsoLow = !!previousLast && !previousLast.failure && previousLast.rir != null && Number(previousLast.rir) < targetMin;
    if (previousAlsoLow) {
      return weightAdvice(2.5, 'Two sets in a row are harder than your target RIR range. Use a small load reduction for the next set.');
    }

    if (currentRir === 0 && targetMin >= 2) {
      return repAdvice(1, 'This set reached 0 RIR while your target is farther from failure. Trim the next rep target and reassess.');
    }
  }

  return null;
}
