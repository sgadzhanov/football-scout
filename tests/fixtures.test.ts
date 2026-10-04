import { describe, expect, it } from "vitest";

import { leagueConfigs } from "../src/config/leagues.js";
import { normalizeFixture } from "../src/fixtures/normalizeFixture.js";
import { fixtureSearchResponseSchema } from "../src/fixtures/types.js";

describe("fixture normalization", () => {
  it("normalizes kickoff times to UTC ISO and creates a stable id", () => {
    const fixture = normalizeFixture(
      {
        homeTeam: "FC Bayern München",
        awayTeam: "Borussia Dortmund",
        kickoff: "2026-10-17T18:30:00+02:00",
        round: "Matchday 7",
        sourceUrls: ["https://www.bundesliga.com/fixture", "https://www.bundesliga.com/fixture"],
      },
      leagueConfigs.bundesliga,
    );

    expect(fixture).toEqual({
      id: "bundesliga:fc-bayern-munchen:borussia-dortmund:2026-10-17T16:30:00.000Z",
      league: "bundesliga",
      homeTeam: "FC Bayern München",
      awayTeam: "Borussia Dortmund",
      kickoff: "2026-10-17T16:30:00.000Z",
      round: "Matchday 7",
      sourceUrls: ["https://www.bundesliga.com/fixture"],
    });
  });

  it("rejects malformed structured fixture output", () => {
    const result = fixtureSearchResponseSchema.safeParse({
      fixtures: [
        {
          homeTeam: "A",
          awayTeam: "B",
          kickoff: "Saturday afternoon",
          round: null,
          sourceUrls: [],
        },
      ],
      note: "",
    });

    expect(result.success).toBe(false);
  });
});
