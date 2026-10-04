import type { Prediction } from "../schemas/football.js";
import { deduplicatePredictions } from "../research/evidence.js";
export function calculateConsensus(predictions: Prediction[]) {
  const counts = { home: 0, draw: 0, away: 0 };
  let total = 0;
  for (const prediction of deduplicatePredictions(predictions)) {
    const pick =
      prediction.pick ??
      (prediction.score
        ? prediction.score.home > prediction.score.away
          ? "HOME"
          : prediction.score.home === prediction.score.away
            ? "DRAW"
            : "AWAY"
        : null);
    if (!pick) continue;
    counts[pick === "HOME" ? "home" : pick === "DRAW" ? "draw" : "away"]++;
    total++;
  }
  return {
    total,
    home: total ? (counts.home / total) * 100 : 0,
    draw: total ? (counts.draw / total) * 100 : 0,
    away: total ? (counts.away / total) * 100 : 0,
  };
}
