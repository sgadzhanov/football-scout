import { describe, expect, it } from "vitest";

import { parseEnvironment } from "../src/config/env.js";

describe("parseEnvironment", () => {
  it("applies safe defaults", () => {
    const environment = parseEnvironment({ OPENAI_API_KEY: "test-key" });

    expect(environment).toMatchObject({
      SCOUT_MODEL: "gpt-6-luna",
      ANALYST_MODEL: "gpt-6.1-sol",
      DEFAULT_TIMEZONE: "Europe/Sofia",
      ENABLE_BUNDESLIGA: true,
      ENABLE_EREDIVISIE: true,
      MAX_WEB_SEARCH_CALLS_PER_RUN: 40,
      MAX_MATCHES_PER_LEAGUE: 12,
      MAX_DEEP_ANALYSIS_MATCHES: 6,
      MAX_RETRIES: 2,
      LOG_LEVEL: "info",
    });
  });

  it("rejects a missing API key without exposing secrets", () => {
    expect(() => parseEnvironment({})).toThrowError(
      "Invalid environment configuration: OPENAI_API_KEY: OPENAI_API_KEY is required",
    );
  });

  it("parses explicit booleans and numeric limits", () => {
    const environment = parseEnvironment({
      OPENAI_API_KEY: "test-key",
      ENABLE_BUNDESLIGA: "false",
      MAX_RETRIES: "1",
    });

    expect(environment.ENABLE_BUNDESLIGA).toBe(false);
    expect(environment.MAX_RETRIES).toBe(1);
  });
});
