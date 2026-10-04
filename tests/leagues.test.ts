import { describe, expect, it } from "vitest";

import { getLeagueConfig, isLeagueId, leagueConfigs } from "../src/config/leagues.js";

describe("league configuration", () => {
  it("defines the requested Bundesliga configuration", () => {
    expect(leagueConfigs.bundesliga).toMatchObject({
      id: "bundesliga",
      name: "Bundesliga",
      country: "Germany",
      primaryLanguage: "German",
      secondaryLanguage: "English",
      expectedMatchesPerRound: 9,
    });
  });

  it("defines the requested Eredivisie configuration", () => {
    expect(leagueConfigs.eredivisie).toMatchObject({
      id: "eredivisie",
      name: "Eredivisie",
      country: "Netherlands",
      primaryLanguage: "Dutch",
      secondaryLanguage: "English",
      expectedMatchesPerRound: 9,
    });
  });

  it("rejects unsupported leagues", () => {
    expect(isLeagueId("premier-league")).toBe(false);
    expect(() => getLeagueConfig("premier-league")).toThrow("Unsupported league");
  });
});
