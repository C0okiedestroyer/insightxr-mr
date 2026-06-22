export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function easeInOutCubic(value) {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function componentExplosion(globalProgress, order, maxOrder = 9) {
  const progress = clamp(globalProgress);
  const start = (order / maxOrder) * 0.22;
  return easeInOutCubic(clamp((progress - start) / (1 - start)));
}

export function formatPercent(value) {
  return `${Math.round(clamp(value) * 100)}%`;
}
