export function calculateOvers(balls) {
  if (!balls || balls <= 0) return 0;
  const completed = Math.floor(balls / 6);
  const rem = balls % 6;
  return parseFloat((completed + rem / 10).toFixed(1));
}

export function calculateCRR(runs, balls) {
  if (!balls || balls <= 0) return 0;
  return parseFloat((runs / (balls / 6)).toFixed(2));
}

export function calculateRRR(target, currentRuns, ballsRemaining) {
  const runsNeeded = target - currentRuns;
  if (runsNeeded <= 0) return 0;
  if (!ballsRemaining || ballsRemaining <= 0) return Infinity;
  return parseFloat((runsNeeded / (ballsRemaining / 6)).toFixed(2));
}
