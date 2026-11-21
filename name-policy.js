/**
 * Name input policy for new/edited items. Do not rewrite pre-existing values.
 * Both PWA and Android must share these limits and preserve historical names.
 */
export const WORKOUT_DAY_NAME_MAX = 30;
export const EXERCISE_NAME_MAX = 60;

export function editableNameAllowed(value, {maximum, originalName = null, readOnly = false} = {}) {
  const name = String(value ?? '').trim();
  if (!name) return false;
  if (readOnly || (originalName !== null && name === String(originalName).trim())) return true;
  return Number.isInteger(maximum) && maximum > 0 && name.length <= maximum;
}
