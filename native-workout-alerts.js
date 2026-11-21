/**
 * Shared workout timer state -> Android OS alarm plan. The Android host does
 * not calculate exercise or rest durations: it receives absolute deadlines
 * already decided by the shared PWA domain model. Browsers simply ignore it.
 * All timestamps are epoch milliseconds so sleep does not pause the timer.
 */
export function workoutAlarmPlan(runtime, exercise, set, soundEnabled = true, language = 'en') {
  const inactive = {kind:'none'};
  if (!runtime || !Number.isFinite(Number(runtime.sessionId))) return inactive;
  const lv = language === 'lv';
  const rest = runtime.rest;
  if (rest && ['REST','ENTRY','SUPERSET_ENTRY'].includes(runtime.phase)) {
    const deadline = Number(rest.endsAt);
    if (!Number.isSafeInteger(deadline) || deadline<=0) return inactive;
    return {
      kind:'rest', token:`${runtime.sessionId}/rest/${rest.setId??'after'}/${deadline}`,
      deadline, startedAt:Number(rest.startedAt)||0, soundEnabled:!!soundEnabled,
      title:lv?'Atpūta beigusies':'Rest finished',
      body:lv?'Laiks nākamajam piegājienam':'Ready for the next set'
    };
  }
  if (runtime.phase === 'TIMED_SET' && set && exercise) {
    const target = Number(set.targetDurationSeconds || exercise.targetSeconds || 60);
    const start = Number(runtime.phaseStartedAt);
    if (!Number.isFinite(target)||target<=0||!Number.isFinite(start)||start<=0) return inactive;
    const deadline = Math.round(start+target*1000);
    if (!Number.isSafeInteger(deadline)) return inactive;
    const cardio = exercise.trackingMode === 'CARDIO';
    return {
      kind:'timed', token:`${runtime.sessionId}/timed/${set.id}/${deadline}`,
      deadline, startedAt:start, soundEnabled:!!soundEnabled,
      title:cardio?(lv?'Kardio mērķis sasniegts':'Cardio target reached'):(lv?'Laika piegājiens pabeigts':'Timed set completed'),
      body:cardio?(lv?'Sasniegts plānotais ilgums':'Target duration reached'):(lv?'Piegājiena laiks ir beidzies':'Your timed set has ended')
    };
  }
  return inactive;
}

/** Returns 'scheduled', 'delivered', 'elapsed', 'exact-alarm-required', etc. */
export function syncNativeWorkoutAlarms(plan, bridge = globalThis.GymProgressAndroid) {
  if (!bridge || typeof bridge.syncWorkoutAlarms !== 'function') return 'browser';
  try { return String(bridge.syncWorkoutAlarms(JSON.stringify(plan))); }
  catch { return 'bridge-error'; }
}
