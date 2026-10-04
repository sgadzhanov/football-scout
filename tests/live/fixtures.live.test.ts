import { describe, expect, it } from "vitest";

import { leagueConfigs } from "../../src/config/leagues.js";
import { getFixtures } from "../../src/fixtures/getFixtures.js";

const describeLive = process.env.RUN_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("live Bundesliga fixture search", () => {
  it("returns upcoming source-backed fixtures", async () => {
    const result = await getFixtures({
      league: leagueConfigs.bundesliga,
      days: 21,
      maxMatches: 9,
    });

    expect(result.fixtures.length).toBeGreaterThan(0);
    expect(result.citedSourceUrls.length).toBeGreaterThan(0);
    for (const fixture of result.fixtures) {
      expect(fixture.league).toBe("bundesliga");
      expect(new Date(fixture.kickoff).getTime()).toBeGreaterThan(Date.now());
      expect(fixture.sourceUrls.length).toBeGreaterThan(0);
    }
  }, 120_000);
});
