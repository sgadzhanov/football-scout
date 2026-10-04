import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../src/openai/client.js", () => ({ getOpenAIClient: () => ({ responses: { create } }) }));
vi.mock("../src/config/env.js", () => ({ getEnvironment: () => ({ MAX_RETRIES: 1 }) }));
import { requestStructured } from "../src/openai/structured.js";
import { RunUsage } from "../src/openai/usage.js";
const response = {
  model: "gpt-6-luna",
  status: "completed",
  output: [],
  output_text: '{"value":1}',
  usage: { input_tokens: 100, output_tokens: 20 },
};
describe("bounded structured requests", () => {
  beforeEach(() => {
    create.mockReset();
  });
  it("records usage even when output validation fails and retries once", async () => {
    create
      .mockResolvedValueOnce({ ...response, output_text: "broken" })
      .mockResolvedValueOnce(response);
    const usage = new RunUsage(4);
    const result = await requestStructured({
      schema: z.object({ value: z.number() }),
      name: "test",
      prompt: "test",
      model: "gpt-6-luna",
      usage,
    });
    expect(result.data.value).toBe(1);
    expect(usage.inputTokens).toBe(200);
    expect(usage.retries).toBe(1);
    expect(create).toHaveBeenCalledTimes(2);
  });
  it("does not retry authentication failures", async () => {
    create.mockImplementation(() => {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    });
    let caught: unknown;
    try {
      await requestStructured({
        schema: z.object({ value: z.number() }),
        name: "test",
        prompt: "test",
        model: "gpt-6-luna",
        usage: new RunUsage(4),
      });
    } catch (error) {
      caught = error;
    }
    expect((caught as Error).message).toBe("Request test failed (HTTP 401).");
    expect(create.mock.calls.length).toBe(1);
  });
  it("passes the hard tool cap and preserves known unused capacity", async () => {
    create.mockResolvedValue(response);
    const usage = new RunUsage(2);
    await requestStructured({
      schema: z.object({ value: z.number() }),
      name: "test",
      prompt: "test",
      model: "gpt-6-luna",
      usage,
      searchCalls: 2,
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      max_tool_calls: 2,
      tool_choice: "required",
      store: false,
    });
    expect(usage.reservedSearchCalls).toBe(0);
  });
});
