import { getEnvironment } from "./config/env.js";
import { getLeagueConfig } from "./config/leagues.js";
import { getFixtures } from "./fixtures/getFixtures.js";
import type { Fixture } from "./fixtures/types.js";
import { RunUsage } from "./openai/usage.js";
import { researchMatch, type MatchResearch } from "./research/researchMatch.js";
import { calculateInterestScore } from "./analysis/calculateInterestScore.js";
import { analyzeMatch } from "./analysis/analyzeMatch.js";
import type { Analysis } from "./schemas/football.js";
import { log } from "./utils/logger.js";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { fixtureSchema } from "./fixtures/types.js";
import { researchSchema, validatedAnalysisSchema } from "./schemas/football.js";

export interface ScoutOptions {
  league?: string;
  maxMatches?: number;
  days: number;
  match?: string;
  resumeFile?: string;
  dryRun: boolean;
}
export interface ScoutEntry {
  research: MatchResearch;
  interest: ReturnType<typeof calculateInterestScore>;
  analysis?: Analysis;
}
export interface ScoutRun {
  leagues: string[];
  fixtures: Fixture[];
  entries: ScoutEntry[];
  usage: RunUsage;
  failures: string[];
  discoveryNotes?: string[];
  previousRuns?: { runId: string; estimatedCostUsd: number }[];
  dryRun: boolean;
}
const checkpointSchema = z.object({
  leagues: z.array(z.string()),
  fixtures: z.array(fixtureSchema),
  entries: z.array(
    z.object({
      research: researchSchema.extend({
        fixture: fixtureSchema,
        researchQuality: z.number().min(0).max(100),
      }),
      analysis: validatedAnalysisSchema.optional(),
    }),
  ),
  usage: z.object({ runId: z.string(), estimatedCostUsd: z.number().nonnegative() }),
  discoveryNotes: z.array(z.string()).optional(),
  previousRuns: z
    .array(z.object({ runId: z.string(), estimatedCostUsd: z.number().nonnegative() }))
    .optional(),
});
export async function runScout(options: ScoutOptions): Promise<ScoutRun> {
  const env = getEnvironment();
  const leagues = options.league
    ? [options.league]
    : [
        ...(env.ENABLE_BUNDESLIGA ? ["bundesliga"] : []),
        ...(env.ENABLE_EREDIVISIE ? ["eredivisie"] : []),
      ];
  const run: ScoutRun = {
    leagues,
    fixtures: [],
    entries: [],
    usage: new RunUsage(env.MAX_WEB_SEARCH_CALLS_PER_RUN),
    failures: [],
    dryRun: options.dryRun,
    discoveryNotes: [],
  };
  const fail = (message: string) => {
    run.failures.push(message);
    run.usage.errors.push(message);
    log("warn", message);
  };
  if (options.resumeFile) {
    const previous = checkpointSchema.parse(
      JSON.parse(await readFile(options.resumeFile, "utf8")) as unknown,
    );
    run.leagues = previous.leagues;
    run.fixtures = previous.fixtures.filter((f) => Date.parse(f.kickoff) > Date.now());
    const active = new Set(run.fixtures.map((f) => f.id));
    run.entries = previous.entries
      .filter((e) => active.has(e.research.fixture.id))
      .map((e) => ({
        research: e.research,
        ...(e.analysis ? { analysis: e.analysis } : {}),
        interest: calculateInterestScore(e.research),
      }));
    run.discoveryNotes = previous.discoveryNotes ?? [];
    run.previousRuns = [...(previous.previousRuns ?? []), previous.usage];
    const completed = new Set(run.entries.map((e) => e.research.fixture.id));
    if (!options.dryRun)
      for (const fixture of run.fixtures.filter((f) => !completed.has(f.id))) {
        log("info", `Resuming research: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
        try {
          const research = await researchMatch(fixture, getLeagueConfig(fixture.league), run.usage);
          run.entries.push({ research, interest: calculateInterestScore(research) });
          run.usage.fixturesResearched++;
        } catch {
          fail(`Research still failed: ${fixture.id}.`);
        }
      }
  }
  if (!options.resumeFile)
    for (const id of leagues) {
      const league = getLeagueConfig(id);
      log("info", `Discovering ${league.name} fixtures`);
      try {
        const result = await getFixtures({
          league,
          days: options.days,
          maxMatches: env.MAX_MATCHES_PER_LEAGUE,
          usage: run.usage,
        });
        run.discoveryNotes?.push(`${league.name}: ${result.note}`);
        if (!result.fixtures.length) {
          log("warn", `${league.name}: no verified fixtures. ${result.note}`);
        }
        const nextRound = result.fixtures[0]?.round;
        let fixtures = nextRound
          ? result.fixtures.filter((f) => f.round === nextRound)
          : result.fixtures;
        if (options.match) {
          const requested = options.match.toLowerCase();
          fixtures = result.fixtures.filter((f) =>
            `${f.homeTeam} vs ${f.awayTeam}`.toLowerCase().includes(requested),
          );
          if (!fixtures.length)
            fail(
              `No verified upcoming fixture matched '${options.match}' in ${league.name}. Use fixture team names.`,
            );
        }
        fixtures = fixtures.slice(
          0,
          Math.min(options.maxMatches ?? env.MAX_MATCHES_PER_LEAGUE, env.MAX_MATCHES_PER_LEAGUE),
        );
        run.fixtures.push(...fixtures);
        run.usage.fixturesFound += fixtures.length;
        if (
          !options.maxMatches &&
          !options.match &&
          fixtures.length &&
          fixtures.length !== league.expectedMatchesPerRound
        )
          fail(
            `${league.name}: discovered ${fixtures.length}/${league.expectedMatchesPerRound} expected round fixtures; coverage may be partial.`,
          );
        if (options.dryRun) continue;
        for (const fixture of fixtures) {
          log("info", `Researching ${fixture.homeTeam} vs ${fixture.awayTeam}`);
          try {
            const research = await researchMatch(fixture, league, run.usage);
            run.entries.push({ research, interest: calculateInterestScore(research) });
            run.usage.fixturesResearched++;
            log(
              "info",
              `${research.sources.length} sources; quality ${research.researchQuality}/100`,
            );
          } catch {
            fail(
              `Research failed: ${fixture.homeTeam} vs ${fixture.awayTeam}. Check budget or retry explicitly.`,
            );
          }
        }
      } catch {
        fail(`Fixture discovery failed for ${league.name}. Check API access and search budget.`);
      }
    }
  const shortlist = run.entries
    .filter(
      (e) =>
        !e.analysis &&
        !options.dryRun &&
        e.interest.score >= 60 &&
        e.research.researchQuality >= 40,
    )
    .sort((a, b) => b.interest.score - a.interest.score)
    .slice(0, env.MAX_DEEP_ANALYSIS_MATCHES);
  run.usage.shortlistCount = shortlist.length;
  for (const entry of shortlist) {
    log(
      "info",
      `Analyzing ${entry.research.fixture.homeTeam} vs ${entry.research.fixture.awayTeam}`,
    );
    try {
      entry.analysis = await analyzeMatch(entry.research, run.usage);
    } catch {
      fail(`Analysis failed: ${entry.research.fixture.id}. Research remains in report.`);
    }
  }
  run.usage.finish();
  return run;
}
