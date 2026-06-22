export const SECTION_AXES = {
  x: { label: "Side", index: 0 },
  y: { label: "Height", index: 1 },
  z: { label: "Depth", index: 2 },
};

export function clampSectionProgress(progress) {
  return Math.min(1, Math.max(0, Number(progress) || 0));
}

export function sectionCoordinate(bounds, axis, progress, paddingRatio = 0.03) {
  const definition = SECTION_AXES[axis] ?? SECTION_AXES.x;
  const min = bounds.min.getComponent(definition.index);
  const max = bounds.max.getComponent(definition.index);
  const size = Math.max(max - min, 0.001);
  const padding = size * paddingRatio;
  return min - padding + (size + padding * 2) * clampSectionProgress(progress);
}

export function sectionDisplayPercent(progress) {
  return `${Math.round(clampSectionProgress(progress) * 100)}%`;
}
