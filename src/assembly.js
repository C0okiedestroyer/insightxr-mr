export function buildAssemblySequence(components = []) {
  return [...components]
    .sort((left, right) => {
      const orderDifference = Number(right.order) - Number(left.order);
      if (orderDifference !== 0) return orderDifference;
      return String(right.index).localeCompare(String(left.index), undefined, { numeric: true });
    })
    .map((component) => component.id);
}

export function currentAssemblyPart(sequence, index) {
  return sequence[Math.max(0, Number(index) || 0)] ?? null;
}

export function assemblyProgress(index, total) {
  if (!total) return 0;
  return Math.min(1, Math.max(0, Number(index) / Number(total)));
}

export function assemblyScore({
  total = 0,
  mistakes = 0,
  hints = 0,
  elapsedMs = 0,
} = {}) {
  const completionPoints = Math.max(0, Number(total)) * 100;
  const timePenalty = Math.floor(Math.max(0, Number(elapsedMs)) / 1000) * 3;
  const mistakePenalty = Math.max(0, Number(mistakes)) * 100;
  const hintPenalty = Math.max(0, Number(hints)) * 150;
  return Math.max(0, 500 + completionPoints - timePenalty - mistakePenalty - hintPenalty);
}

export function formatAssemblyTime(elapsedMs = 0) {
  const seconds = Math.max(0, Math.floor(Number(elapsedMs) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
