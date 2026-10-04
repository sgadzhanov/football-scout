import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/fixtures/getFixtures.js", () => ({ getFixtures: vi.fn() }));
vi.mock("../src/research/researchMatch.js", () => ({ researchMatch: vi.fn() }));
vi.mock("../src/analysis/analyzeMatch.js", () => ({ analyzeMatch: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
vi.mock("../src/config/env.js", () => ({
  getEnvironment: () => ({
    ENABLE_BUNDESLIGA: true,
    ENABLE_EREDIVISIE: true,
    MAX_WEB_SEARCH_CALLS_PER_RUN: 40,
    MAX_MATCHES_PER_LEAGUE: 12,
    MAX_DEEP_ANALYSIS_MATCHES: 1,
  }),
}));
import { getFixtures } from "../src/fixtures/getFixtures.js";
import { researchMatch } from "../src/research/researchMatch.js";
import { analyzeMatch } from "../src/analysis/analyzeMatch.js";
import { runScout } from "../src/scout.js";
import { readFile } from "node:fs/promises";
const fixture = {
  id: "1",
  homeTeam: "Home",
  awayTeam: "Away",
  league: "bundesliga",
  kickoff: "2026-10-09T18:30:00.000Z",
  round: "5",
  sourceUrls: ["https://example.com"],
};
describe("scout orchestration (mocked API)", () => {
  it("resumes only missing research without repeating discovery", async () => {
    const upcoming = { ...fixture, kickoff: new Date(Date.now() + 86400000).toISOString() };
    const research = {
      fixture: upcoming,
      punditPredictions: [],
      specialistPredictions: [],
      evidence: [],
      sources: [],
      gaps: [],
      researchQuality: 0,
    };
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        leagues: ["bundesliga"],
        fixtures: [upcoming, { ...upcoming, id: "2" }],
        entries: [{ research }],
        usage: { runId: "previous", estimatedCostUsd: 0.25 },
      }),
    );
    vi.mocked(researchMatch).mockResolvedValue({ ...research, fixture: { ...upcoming, id: "2" } });
    const run = await runScout({ days: 21, dryRun: false, resumeFile: "saved.json" });
    expect(getFixtures).not.toHaveBeenCalled();
    expect(researchMatch).toHaveBeenCalledTimes(1);
    expect(run.entries).toHaveLength(2);
    expect(run.previousRuns?.[0]?.estimatedCostUsd).toBe(0.25);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFixtures).mockResolvedValue({
      fixtures: [fixture],
      note: "",
      citedSourceUrls: fixture.sourceUrls,
    });
  });
  it("discovers both enabled leagues and skips research in a dry run", async () => {
    const run = await runScout({ days: 21, dryRun: true, maxMatches: 1 });
    expect(getFixtures).toHaveBeenCalledTimes(2);
    expect(researchMatch).not.toHaveBeenCalled();
    expect(run.fixtures).toHaveLength(2);
  });
  it("continues after a fixture research failure and preserves partial results", async () => {
    vi.mocked(getFixtures).mockResolvedValue({
      fixtures: [fixture, { ...fixture, id: "2" }],
      note: "",
      citedSourceUrls: [],
    });
    vi.mocked(researchMatch)
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({
        fixture,
        punditPredictions: [],
        specialistPredictions: [],
        evidence: [],
        sources: [],
        gaps: ["No evidence"],
        researchQuality: 0,
      });
    const run = await runScout({ league: "bundesliga", days: 21, dryRun: false, maxMatches: 2 });
    expect(run.failures).toHaveLength(1);
    expect(run.entries).toHaveLength(1);
    expect(analyzeMatch).not.toHaveBeenCalled();
  });
  it("analyzes a strong candidate and limits analyst calls", async () => {
    vi.mocked(getFixtures).mockResolvedValue({
      fixtures: [fixture, { ...fixture, id: "2" }],
      note: "",
      citedSourceUrls: [],
    });
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
    vi.mocked(researchMatch).mockResolvedValue({
      fixture,
      punditPredictions: [],
      specialistPredictions: [],
      sources: [],
      gaps: [],
      researchQuality: 80,
      evidence: categories.map((category) => ({
        category,
        significance: 1,
        sourceUrls: ["https://example.com"],
        summary: "Evidence",
      })),
    });
    vi.mocked(analyzeMatch).mockResolvedValue({
      scoutProbabilities: { home: 40, draw: 30, away: 30 },
      predictedScore: { home: 1, away: 1 },
      confidence: 5,
      alternativeScenario: "Home win",
      whyInteresting: [],
      keyEvidence: [],
      counterArguments: [],
    });
    const run = await runScout({ league: "bundesliga", days: 21, dryRun: false, maxMatches: 2 });
    expect(analyzeMatch).toHaveBeenCalledTimes(1);
    expect(run.entries.filter((e) => e.analysis)).toHaveLength(1);
  });
});
