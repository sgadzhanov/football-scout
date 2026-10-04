import { describe, expect, it } from "vitest";

import { formatKickoff, getZonedDateTimeParts } from "../src/utils/dates.js";

describe("Sofia timezone formatting", () => {
  it("uses daylight saving time without a hardcoded offset", () => {
    const parts = getZonedDateTimeParts("2026-10-17T16:30:00.000Z", "Europe/Sofia");

    expect(parts.hour).toBe("19");
    expect(parts.minute).toBe("30");
    expect(formatKickoff("2026-10-17T16:30:00.000Z", "Europe/Sofia")).toContain("17.10.2026 19:30");
  });

  it("uses standard time after the seasonal clock change", () => {
    const parts = getZonedDateTimeParts("2026-11-07T16:30:00.000Z", "Europe/Sofia");

    expect(parts.hour).toBe("18");
    expect(parts.minute).toBe("30");
  });
});
