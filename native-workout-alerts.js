/**
 * Platform-neutral workout sound contract. Workout state and deadlines are owned
 * by the shared model. Android only transports audio at these exact times.
 * The native bridge must be the sole cue producer on Android (even after a
 * deadline has elapsed or exact-alarm permission was denied).
 */
export const EXERCISE_REMINDER_INTERVAL_MS = 60_000;

export function exerciseReminderAnchor(runtime) {
  if (!runtime || !['SET', 'ENTRY', 'SUPERSET_ENTRY'].includes(runtime.phase)) return null;
  const start = Number(runtime.reminderStartedAt || runtime.phaseStartedAt);
  return Number.isSafeInteger(start) && start > 0 ? start : null;
}

export function exerciseReminderMinute(runtime, time = Date.now()) {
  const start = exerciseReminderAnchor(runtime);
  if (start === null) return 0;
  return Math.max(0, Math.floor((Number(time) - start) / EXERCISE_REMINDER_INTERVAL_MS));
}

export function exerciseReminderOverlapsCountdown(runtime, time = Date.now()) {
  const rest = runtime?.rest;
  if (!rest || !['ENTRY', 'SUPERSET_ENTRY'].includes(runtime.phase)) return false;
  const gap = Number(rest.endsAt) - Number(time);
  return Number.isFinite(gap) && gap >= -1000 && gap <= 4500;
}

export function workoutAlarmPlan(runtime, exercise, set, soundEnabled = true, language = 'en', settings = {}) {
  const inactive = {kind: 'none'};
  if (!runtime || !Number.isFinite(Number(runtime.sessionId))) return inactive;
  const lv = language === 'lv';
  const anchor = exerciseReminderAnchor(runtime);
  const reminder = anchor === null || settings.exerciseReminderSoundEnabled === false ? null : {
    startedAt: anchor,
    token: `${runtime.sessionId}/exercise/${runtime.currentExerciseIndex ?? 0}/${runtime.currentSetIndex ?? 0}/${anchor}`
  };
  const rest = runtime.rest;
  if (rest && ['REST', 'ENTRY', 'SUPERSET_ENTRY'].includes(runtime.phase)) {
    const deadline = Number(rest.endsAt);
    if (!Number.isSafeInteger(deadline) || deadline <= 0) return inactive;
    return {
      kind: 'rest', token: `${runtime.sessionId}/rest/${rest.setId ?? 'after'}/${deadline}`,
      deadline, startedAt: Number(rest.startedAt) || 0,
      soundEnabled: !!soundEnabled, warningSeconds: Number(settings.workoutWarningSeconds ?? 30), countdownEnabled: settings.workoutCountdownEnabled !== false, readyCue: settings.nextWarmupCue ? 'warmup' : 'ready', ...(reminder ? {reminder} : {})
    };
  }
  if (runtime.phase === 'TIMED_SET' && set && exercise) {
    const target = Number(set.targetDurationSeconds || exercise.targetSeconds || 60);
    const start = Number(runtime.phaseStartedAt);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(start) || start <= 0) return inactive;
    const deadline = Math.round(start + target * 1000);
    if (!Number.isSafeInteger(deadline)) return inactive;
    return {
      kind: 'timed', token: `${runtime.sessionId}/timed/${set.id}/${deadline}`,
      deadline, startedAt: start, soundEnabled: !!soundEnabled
    };
  }
  if (reminder) return {kind: 'exercise', token: reminder.token, ...reminder, soundEnabled: !!soundEnabled};
  return inactive;
}

export function workoutStatusPlan(runtime, session, exercise, language='en') {
  if (!runtime || !session) return {active: false};
  const startedAt = Number(session.startedAt);
  return {
    active: true,
    sessionId: String(runtime.sessionId),
    startedAt: Number.isSafeInteger(startedAt) && startedAt > 0 ? startedAt : Date.now(),
    title: String(session.workoutName || (language === 'lv' ? 'Treniņš' : 'Workout')).slice(0, 80),
    exercise: String(exercise?.name || exercise?.exerciseName || '').slice(0, 90),
    phase: String(runtime.phase || '').slice(0, 30),
    restEndsAt: runtime.rest && ['REST','ENTRY','SUPERSET_ENTRY'].includes(runtime.phase) ? Math.max(0,Number(runtime.rest.endsAt)||0) : 0
  };
}

/** Returns 'scheduled', 'elapsed', 'exact-alarm-required', etc. */
export function syncNativeWorkoutAlarms(plan, bridge = globalThis.GymProgressAndroid) {
  if (!bridge || typeof bridge.syncWorkoutAlarms !== 'function') return 'browser';
  try { return String(bridge.syncWorkoutAlarms(JSON.stringify(plan))); }
  catch { return 'bridge-error'; }
}

export function syncNativeWorkoutStatus(plan, bridge = globalThis.GymProgressAndroid) {
  if (!bridge || typeof bridge.syncWorkoutStatus !== 'function') return 'browser';
  try { return String(bridge.syncWorkoutStatus(JSON.stringify(plan))); }
  catch { return 'bridge-error'; }
}
