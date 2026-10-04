import type { MatchResearch } from "../research/researchMatch.js";
import { calculateConsensus } from "./calculateConsensus.js";
export function calculateInterestScore(research: MatchResearch) {
  const c = calculateConsensus(research.punditPredictions);
  const significance = (categories: string[]) =>
    Math.max(
      0,
      ...research.evidence
        .filter((e) => categories.includes(e.category))
        .map((e) => e.significance),
    );
  const components = {
    punditConsensus: c.total >= 2 ? Math.round((Math.max(c.home, c.draw, c.away) / 100) * 15) : 0,
    disagreement: Math.round(
      Math.max(
        c.total >= 2 ? 1 - Math.max(c.home, c.draw, c.away) / 100 : 0,
        significance(["disagreement"]),
      ) * 15,
    ),
    statisticalAnomaly: Math.round(significance(["statistics"]) * 15),
    homeAwayAnomaly: Math.round(significance(["homeAway"]) * 10),
    absences: Math.round(significance(["injury", "suspension"]) * 10),
    tactics: Math.round(significance(["tactical"]) * 10),
    congestion: Math.round(significance(["schedule"]) * 5),
    context: Math.round(significance(["managerial"]) * 5),
    underdog: Math.round(significance(["underdog"]) * 10),
    researchQuality: Math.round((research.researchQuality / 100) * 5),
  };
  const score = Object.values(components).reduce((a, b) => a + b, 0);
  const category =
    score >= 85
      ? "EXCEPTIONAL"
      : score >= 75
        ? "STRONG"
        : score >= 60
          ? "INTERESTING"
          : score >= 45
            ? "WATCH"
            : "PASS";
  return { score, category, components };
}
