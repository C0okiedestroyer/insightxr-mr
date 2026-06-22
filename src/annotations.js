export function annotationTone(risk = "") {
  const normalized = risk.toLowerCase();
  if (
    normalized.includes("electrical")
    || normalized.includes("energy")
    || normalized.includes("charge")
    || normalized.includes("magnet")
    || normalized.includes("moving")
    || normalized.includes("spring")
  ) {
    return "danger";
  }
  if (
    normalized.includes("sensitive")
    || normalized.includes("fragile")
    || normalized.includes("pinch")
    || normalized.includes("sharp")
    || normalized.includes("heavy")
    || normalized.includes("precision")
  ) {
    return "caution";
  }
  return "safe";
}

export function annotationSummary(component) {
  if (!component) return null;
  return {
    id: component.id,
    index: component.index,
    name: component.name,
    category: component.category,
    color: component.color,
    role: component.role,
    metric: component.metric,
    risk: component.risk,
    service: component.service,
    tone: annotationTone(component.risk),
  };
}

export function computeAnnotationLayout({
  targetX,
  targetY,
  left,
  top,
  right,
  bottom,
  cardWidth,
  cardHeight,
  gap = 42,
  margin = 12,
}) {
  const roomOnRight = right - targetX;
  const placeRight = roomOnRight >= cardWidth + gap + margin;
  const unclampedX = placeRight
    ? targetX + gap
    : targetX - cardWidth - gap;
  const minX = left + margin;
  const maxX = Math.max(minX, right - cardWidth - margin);
  const minY = top + margin;
  const maxY = Math.max(minY, bottom - cardHeight - margin);
  const cardX = Math.min(maxX, Math.max(minX, unclampedX));
  const cardY = Math.min(maxY, Math.max(minY, targetY - cardHeight * 0.46));
  const anchorX = placeRight ? cardX : cardX + cardWidth;
  const anchorY = Math.min(cardY + cardHeight - 18, Math.max(cardY + 18, targetY));

  return {
    cardX,
    cardY,
    anchorX,
    anchorY,
    side: placeRight ? "right" : "left",
  };
}
