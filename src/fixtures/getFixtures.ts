import { requestStructured } from "../openai/structured.js";
import { RunUsage } from "../openai/usage.js";
import type { ResponseOutputItem } from "openai/resources/responses/responses";

import type { LeagueConfig } from "../config/leagues.js";
import { getEnvironment } from "../config/env.js";
import { normalizeFixture } from "./normalizeFixture.js";
import { fixtureSearchResponseSchema, type FixtureSearchResult } from "./types.js";
import { canonicalUrl } from "../research/evidence.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export interface FixtureSearchOptions {
  league: LeagueConfig;
  from?: Date;
  days?: number;
  maxMatches?: number;
  usage?: RunUsage;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

export function collectResponseSourceUrls(output: ResponseOutputItem[]): string[] {
  const urls: string[] = [];

  for (const item of output) {
    if (item.type === "web_search_call") {
      if (item.action.type === "search") {
        urls.push(...(item.action.sources ?? []).map((source) => source.url));
      } else if (item.action.type === "open_page" && item.action.url) {
        urls.push(item.action.url);
      } else if (item.action.type === "find_in_page") {
        urls.push(item.action.url);
      }
    }

    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue;
        for (const annotation of content.annotations) {
          if (annotation.type === "url_citation") urls.push(annotation.url);
        }
      }
    }
  }

  return uniqueUrls(urls);
}

function buildFixtureSearchPrompt(
  league: LeagueConfig,
  from: Date,
  days: number,
  maxMatches: number,
): string {
  const until = addDays(from, days);

  return [
    `Find the next officially scheduled ${league.name} fixtures from ${toDateOnly(from)} through ${toDateOnly(until)}, inclusive.`,
    `Return at most ${maxMatches} fixtures, ordered by kickoff time.`,
    `Find the complete NEXT league round first (${league.expectedMatchesPerRound} matches normally). Do not stop at a single fixture. Official schedule tables, schedule-announcement articles containing complete fixture tables, and match pages are valid evidence. Open the actual schedule where possible. Return every verified fixture even if others cannot be verified and explain missing coverage in note.`,
    `Search ${league.primaryLanguage}-language sources first and use ${league.secondaryLanguage} sources only as support.`,
    "Prefer the official league schedule and official club sites, followed by reputable broadcasters or established sports publications.",
    "Include only this league's current-season first-team fixtures. Exclude past, postponed, cancelled, reserve, youth, and women's fixtures.",
    `For kickoff, return an ISO 8601 timestamp with an explicit UTC offset. Official ${league.country} schedules use local ${league.id === "bundesliga" ? "Europe/Berlin" : "Europe/Amsterdam"} time unless otherwise stated. Convert the published local time using that IANA timezone's DST offset for the actual fixture date; sources need not print a UTC offset themselves. Never guess missing local dates or times.`,
    "Every fixture must contain at least one real source URL that directly supports that fixture and kickoff time.",
    "If the league is paused, look ahead to the first scheduled round inside the date window. If none exists, return an empty fixtures array and explain this briefly in note.",
    "Do not guess missing dates, kickoff times, teams, rounds, or URLs.",
  ].join("\n");
}

export async function getFixtures(options: FixtureSearchOptions): Promise<FixtureSearchResult> {
  const { SCOUT_MODEL, MAX_MATCHES_PER_LEAGUE } = getEnvironment();
  const from = options.from ?? new Date();
  const days = options.days ?? 21;
  const maxMatches = options.maxMatches ?? MAX_MATCHES_PER_LEAGUE;

  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error("Fixture search days must be an integer from 1 to 60.");
  }

  if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 30) {
    throw new Error("Maximum fixtures must be an integer from 1 to 30.");
  }

  const usage = options.usage ?? new RunUsage(getEnvironment().MAX_WEB_SEARCH_CALLS_PER_RUN);
  const response = await requestStructured({
    schema: fixtureSearchResponseSchema,
    name: "fixture_search",
    model: SCOUT_MODEL,
    usage,
    searchCalls: 2,
    prompt: buildFixtureSearchPrompt(options.league, from, days, maxMatches),
  });

  const parsed = response.data;
  const observed = new Set(response.urls.map(canonicalUrl));
  let dropped = 0;
  const fixtures = parsed.fixtures
    .flatMap((fixture) => {
      try {
        return [
          normalizeFixture(
            {
              ...fixture,
              sourceUrls: fixture.sourceUrls.filter((url) => observed.has(canonicalUrl(url))),
            },
            options.league,
          ),
        ];
      } catch {
        dropped++;
        return [];
      }
    })
    .filter(
      (fixture) =>
        Date.parse(fixture.kickoff) >= from.getTime() &&
        Date.parse(fixture.kickoff) <= addDays(from, days).getTime(),
    )
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  return {
    fixtures: [...new Map(fixtures.map((f) => [f.id, f])).values()].slice(0, maxMatches),
    note: `${parsed.note}${dropped ? ` ${dropped} fixture(s) rejected because their source or domain data failed validation.` : ""}`,
    citedSourceUrls: response.urls,
  };
}
