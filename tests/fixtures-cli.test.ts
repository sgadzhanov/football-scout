import { describe, expect, it } from "vitest";

import { formatFixtureSearchResult, parseFixtureCliOptions } from "../src/cli/fixtures.js";

describe("fixture CLI", () => {
  it("defaults to a 21-day Bundesliga search", () => {
    expect(parseFixtureCliOptions([])).toEqual({ leagueId: "bundesliga", days: 21 });
  });

  it("accepts Eredivisie and search limits", () => {
    expect(
      parseFixtureCliOptions(["--league", "eredivisie", "--days=14", "--max-matches", "3"]),
    ).toEqual({ leagueId: "eredivisie", days: 14, maxMatches: 3 });
  });

  it("formats fixture sources and Sofia kickoff time", () => {
    const output = formatFixtureSearchResult(
      "Bundesliga",
      {
        fixtures: [
          {
            id: "fixture-1",
            league: "bundesliga",
            homeTeam: "Home FC",
            awayTeam: "Away FC",
            kickoff: "2026-10-17T16:30:00.000Z",
            sourceUrls: ["https://example.com/fixture"],
          },
        ],
        note: "Current schedule.",
        citedSourceUrls: ["https://example.com/fixture"],
      },
      "Europe/Sofia",
    );

    expect(output).toContain("Home FC vs Away FC");
    expect(output).toContain("17.10.2026 19:30");
    expect(output).toContain("https://example.com/fixture");
  });
});
