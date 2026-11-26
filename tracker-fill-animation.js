/** Animate only the composited transform. Persistence must not own the animation. */
export function paintTrackerFill(fill, fraction, {reducedMotion=false, duration=320}={}) {
  if (!fill) return false;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(Number(fraction)) ? Number(fraction) : 0));
  const destination = `scaleX(${clamped})`;
  const old = typeof getComputedStyle==='function' ? getComputedStyle(fill).transform : fill.style.transform;
  const animations = typeof fill.getAnimations==='function' ? fill.getAnimations() : [];
  for (const animation of animations) if (animation?.effect?.getKeyframes?.().some(frame=>frame.transform!=null)) animation.cancel();
  // When main-thread work (IndexedDB serialization, sync, etc.) takes time,
  // compositor-owned Web Animations keep progressing without waiting for JS.
  fill.style.transition = 'background-color 240ms ease';
  fill.style.transform = destination;
  if (!reducedMotion && typeof fill.animate === 'function' && old && old !== 'none' && old !== destination) {
    fill.animate([{transform:old},{transform:destination}],{duration,easing:'linear',fill:'none'});
    return true;
  }
  // Legacy browsers: rely on a simple CSS transition instead of staged JS.
  if (!reducedMotion && typeof fill.animate !== 'function') fill.style.transition = 'transform 320ms linear, background-color 240ms ease';
  return false;
}
