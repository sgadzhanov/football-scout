import { getEnvironment } from "../config/env.js";
import { getLeagueConfig, type LeagueId } from "../config/leagues.js";
import { getFixtures } from "../fixtures/getFixtures.js";
import type { FixtureSearchResult } from "../fixtures/types.js";
import { formatKickoff } from "../utils/dates.js";

export interface FixtureCliOptions {
  leagueId: LeagueId;
  days: number;
  maxMatches?: number;
}

function readOption(args: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equalsArgument = args.find((argument) => argument.startsWith(equalsPrefix));
  if (equalsArgument) return equalsArgument.slice(equalsPrefix.length);

  const index = args.indexOf(name);
  if (index === -1) return undefined;

  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function parseInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

export function parseFixtureCliOptions(args: string[]): FixtureCliOptions {
  const leagueId = readOption(args, "--league") ?? "bundesliga";
  getLeagueConfig(leagueId);

  const days = parseInteger(readOption(args, "--days"), 21, "--days");
  if (days < 1 || days > 60) throw new Error("--days must be between 1 and 60.");

  const maxMatchesValue = readOption(args, "--max-matches");
  const maxMatches =
    maxMatchesValue === undefined ? undefined : parseInteger(maxMatchesValue, 0, "--max-matches");
  if (maxMatches !== undefined && (maxMatches < 1 || maxMatches > 30)) {
    throw new Error("--max-matches must be between 1 and 30.");
  }

  return {
    leagueId: leagueId as LeagueId,
    days,
    ...(maxMatches === undefined ? {} : { maxMatches }),
  };
}

export function formatFixtureSearchResult(
  leagueName: string,
  result: FixtureSearchResult,
  timeZone: string,
): string {
  const lines = [`Upcoming ${leagueName} fixtures`, `Times shown in ${timeZone}`, ""];

  if (result.fixtures.length === 0) {
    lines.push("No fixtures found in the requested date window.", result.note);
  } else {
    for (const fixture of result.fixtures) {
      lines.push(`${fixture.homeTeam} vs ${fixture.awayTeam}`);
      lines.push(`Kickoff: ${formatKickoff(fixture.kickoff, timeZone)}`);
      if (fixture.round) lines.push(`Round: ${fixture.round}`);
      lines.push("Sources:", ...fixture.sourceUrls.map((url) => `- ${url}`), "");
    }
    if (result.note) lines.push(`Note: ${result.note}`);
  }

  return lines.join("\n").trimEnd();
}

async function main(): Promise<void> {
  const options = parseFixtureCliOptions(process.argv.slice(2));
  const league = getLeagueConfig(options.leagueId);
  const environment = getEnvironment();

  console.log(`Searching live web sources for ${league.name} fixtures...`);
  const result = await getFixtures({
    league,
    days: options.days,
    ...(options.maxMatches === undefined ? {} : { maxMatches: options.maxMatches }),
  });

  console.log(formatFixtureSearchResult(league.name, result, environment.DEFAULT_TIMEZONE));
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown fixture search error";
    console.error(`Fixture search failed: ${message}`);
    process.exitCode = 1;
  });
}
import { pathToFileURL } from "node:url";
