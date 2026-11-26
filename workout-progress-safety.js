// Shared PWA/Android safety rules: timers signal readiness, never confirm work.
// The user must explicitly complete a timed set or leave a finished rest.
export function markTimedTargetReached(runtime, at, targetSeconds) {
  if (!runtime || runtime.phase !== 'TIMED_SET') return false;
  const target = Math.max(1, Number(targetSeconds) || 60);
  const reachedAt = Number(runtime.phaseStartedAt) + target * 1000;
  if (!Number.isFinite(reachedAt) || at < reachedAt || runtime.timedTargetReached) return false;
  runtime.timedTargetReached = true;
  runtime.timedReachedAt = reachedAt;
  return true;
}
export function recordedTimedDuration(runtime, at, targetSeconds) {
  const target = Math.max(1, Number(targetSeconds) || 60);
  return Math.max(1, Math.min(target, Math.round((at - Number(runtime?.phaseStartedAt ?? at)) / 1000)));
}
export function markRestReady(runtime, at) {
  if (!runtime || runtime.phase !== 'REST' || !runtime.rest || runtime.rest.readyForNext) return false;
  if (at < Number(runtime.rest.endsAt)) return false;
  runtime.rest.readyForNext = true;
  return true;
}
export function canReplaceWholeExercise(sets) {
  // A completed set belongs to the exercise identity under which it was recorded.
  return Array.isArray(sets) && sets.length > 0 && sets.every(s => s.status === 'PENDING');
}
