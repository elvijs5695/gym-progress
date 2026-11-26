/**
 * Tracker has ONE owner for motion: the CSS transform transition.
 * No WAAPI restart, readback of getComputedStyle or changing transition
 * properties mid-flight. The live tracker node is retained across Home renders.
 */
export function trackerFillFraction(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
}
export function paintTrackerFill(fill, fraction, {reducedMotion=false}={}) {
  if (!fill) return false;
  const fractionValue = trackerFillFraction(fraction);
  const target = `scaleX(${fractionValue})`;
  if (fill.style.transform === target) return false;
  // Accessibility is owned by CSS @media; this override is for environments
  // which supply reduced-motion to JS but do not support the media rule.
  if (reducedMotion) fill.style.transition = 'none';
  else fill.style.removeProperty('transition');
  fill.style.transform = target;
  return true;
}
