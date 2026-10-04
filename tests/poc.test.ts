import { describe, expect, it } from "vitest";
import {
  deduplicatePredictions,
  groundResearch,
  researchQuality,
} from "../src/research/evidence.js";
import { calculateConsensus } from "../src/analysis/calculateConsensus.js";
import { calculateInterestScore } from "../src/analysis/calculateInterestScore.js";
import {
  validatedAnalysisSchema,
  type Prediction,
  type ResearchData,
} from "../src/schemas/football.js";
import { RunUsage } from "../src/openai/usage.js";
import { generateMarkdownReport } from "../src/reporting/generateMarkdownReport.js";
const prediction: Prediction = {
  punditName: "Named Expert",
  publication: "Original",
  originatingPublication: "Original",
  pick: "HOME",
  score: { home: 2, away: 1 },
  sourceUrl: "https://example.com/preview",
  publishedAt: null,
  reasoningSummary: "Home support",
  evidenceExcerpt: "Home team should win two goals to one on Saturday.",
};
const data: ResearchData = {
  punditPredictions: [prediction],
  specialistPredictions: [],
  evidence: [],
  gaps: [],
  sources: [
    {
      url: prediction.sourceUrl,
      title: "Preview",
      publication: "Original",
      language: "German",
      tier: "A",
      publishedAt: null,
    },
  ],
};
const fixture = {
  id: "test",
  league: "bundesliga",
  homeTeam: "Home",
  awayTeam: "Away",
  kickoff: "2026-10-09T18:30:00.000Z",
  sourceUrls: [prediction.sourceUrl],
};
describe("POC integrity", () => {
  it("deduplicates syndicated and tracked predictions", () => {
    expect(
      deduplicatePredictions([
        prediction,
        { ...prediction, publication: "Copy", sourceUrl: "https://copy.com/article" },
        { ...prediction, sourceUrl: `${prediction.sourceUrl}?utm_source=test` },
      ]),
    ).toHaveLength(1);
    expect(
      calculateConsensus([prediction, { ...prediction, sourceUrl: "https://copy.com/article" }]),
    ).toMatchObject({ total: 1, home: 100, draw: 0, away: 0 });
  });
  it("does not invent a consensus when there are no human predictions", () => {
    expect(calculateConsensus([])).toEqual({ total: 0, home: 0, draw: 0, away: 0 });
  });
  it("drops unobserved sources and predictions", () => {
    expect(groundResearch(data, []).punditPredictions).toEqual([]);
    expect(groundResearch(data, [prediction.sourceUrl]).punditPredictions).toHaveLength(1);
  });
  it("rejects probabilities that do not sum to 100 and negative scores", () => {
    const output = {
      scoutProbabilities: { home: 40, draw: 30, away: 30 },
      predictedScore: { home: 2, away: 1 },
      confidence: 6,
      whyInteresting: ["Documented disagreement"],
      alternativeScenario: "Draw",
      keyEvidence: ["Source-supported home advantage"],
      counterArguments: ["Incomplete injury coverage"],
    };
    expect(validatedAnalysisSchema.safeParse(output).success).toBe(true);
    expect(
      validatedAnalysisSchema.safeParse({
        ...output,
        scoutProbabilities: { home: 90, draw: 30, away: 30 },
      }).success,
    ).toBe(false);
    expect(
      validatedAnalysisSchema.safeParse({ ...output, predictedScore: { home: -1, away: 1 } })
        .success,
    ).toBe(false);
  });
  it("keeps thin research below the shortlist threshold", () => {
    expect(
      calculateInterestScore({ ...data, fixture, researchQuality: researchQuality(data, "German") })
        .score,
    ).toBeLessThan(60);
  });
  it("caps explainable interest at 100", () => {
    const categories = [
      "statistics",
      "homeAway",
      "injury",
      "tactical",
      "schedule",
      "managerial",
      "underdog",
      "disagreement",
    ] as const;
    const interest = calculateInterestScore({
      ...data,
      fixture,
      researchQuality: 100,
      punditPredictions: [
        prediction,
        {
          ...prediction,
          punditName: "Other Expert",
          evidenceExcerpt: "An independent forecast supports the home side.",
          originatingPublication: "Other",
          sourceUrl: "https://other.com/preview",
        },
      ],
      evidence: categories.map((category) => ({
        category,
        significance: 1,
        summary: "Unusual evidence",
        sourceUrls: [prediction.sourceUrl],
      })),
    });
    expect(interest.score).toBe(100);
    expect(interest.category).toBe("EXCEPTIONAL");
  });
  it("never over-reserves the web budget even after failures", () => {
    const usage = new RunUsage(3);
    expect(usage.reserveSearches(2)).toBe(2);
    expect(usage.reserveSearches(2)).toBe(1);
    expect(() => usage.reserveSearches(1)).toThrow("budget exhausted");
  });
  it("reports a valid PASS with distinct voices and partial failures", () => {
    const report = generateMarkdownReport(
      {
        leagues: ["bundesliga"],
        fixtures: [fixture],
        entries: [
          {
            research: { ...data, fixture, researchQuality: 30 },
            interest: calculateInterestScore({ ...data, fixture, researchQuality: 30 }),
          },
        ],
        failures: ["Other match failed"],
        usage: new RunUsage(40),
        dryRun: false,
      },
      "Europe/Sofia",
    );
    expect(report).toContain("No sufficiently strong match");
    expect(report).toContain("### PUNDITS");
    expect(report).toContain("### SPECIALIST / DATA SOURCES");
    expect(report).toContain("### FOOTBALL SCOUT");
    expect(report).toContain("Other match failed");
  });
});
