import type { LeagueConfig } from "../config/leagues.js";
import { fixtureSchema, type Fixture, type FixtureSearchItem } from "./types.js";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function deduplicateUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

export function normalizeFixture(item: FixtureSearchItem, league: LeagueConfig): Fixture {
  const kickoff = new Date(item.kickoff);

  if (Number.isNaN(kickoff.getTime())) {
    throw new Error(`Invalid kickoff time for ${item.homeTeam} vs ${item.awayTeam}.`);
  }

  const normalizedKickoff = kickoff.toISOString();
  const fixture: Fixture = {
    id: [league.id, slugify(item.homeTeam), slugify(item.awayTeam), normalizedKickoff].join(":"),
    league: league.id,
    homeTeam: item.homeTeam.trim(),
    awayTeam: item.awayTeam.trim(),
    kickoff: normalizedKickoff,
    ...(item.round === null || item.round.trim() === "" ? {} : { round: item.round.trim() }),
    sourceUrls: deduplicateUrls(item.sourceUrls),
  };

  return fixtureSchema.parse(fixture);
}
