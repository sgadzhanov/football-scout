import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "./client.js";
import { getEnvironment } from "../config/env.js";
import type { RunUsage } from "./usage.js";
import { collectResponseSourceUrls } from "../fixtures/getFixtures.js";

export async function requestStructured<T extends z.ZodType>(options: {
  schema: T;
  name: string;
  prompt: string;
  model: string;
  usage: RunUsage;
  searchCalls?: number;
  validate?: (data: z.infer<T>) => z.infer<T>;
}): Promise<{ data: z.infer<T>; urls: string[] }> {
  const { MAX_RETRIES } = getEnvironment();
  for (let attempt = 0; ; attempt++) {
    const cap = options.searchCalls ? options.usage.reserveSearches(options.searchCalls) : 0;
    options.usage.openaiCalls++;
    try {
      const response = await getOpenAIClient().responses.create({
        model: options.model,
        store: false,
        input: options.prompt,
        reasoning: { effort: "low" },
        max_output_tokens: 8_000,
        ...(cap
          ? {
              tools: [{ type: "web_search" as const, external_web_access: true }],
              tool_choice: "required" as const,
              max_tool_calls: cap,
              include: ["web_search_call.action.sources" as const],
            }
          : {}),
        text: { format: zodTextFormat(options.schema, options.name) },
      });
      options.usage.record(response);
      const toolCalls = response.output.filter((item) => item.type === "web_search_call").length;
      options.usage.reservedSearchCalls -= Math.max(0, cap - toolCalls);
      if (response.status !== "completed")
        throw new Error(
          `Incomplete response: ${response.incomplete_details?.reason ?? response.status}`,
        );
      const parsed = options.schema.parse(JSON.parse(response.output_text) as unknown);
      const data = options.validate ? options.validate(parsed) : parsed;
      return { data, urls: collectResponseSourceUrls(response.output) };
    } catch (error) {
      // Never print raw API errors, which can contain request details.
      const status =
        typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
      options.usage.errors.push(
        `${options.name}: attempt ${attempt + 1} failed${typeof status === "number" ? ` (HTTP ${status})` : ""}`,
      );
      if (typeof status !== "number") options.usage.unknownUsage = true;
      if (
        attempt >= MAX_RETRIES ||
        (typeof status === "number" && status < 500 && status !== 429)
      ) {
        throw new Error(
          `Request ${options.name} failed${typeof status === "number" ? ` (HTTP ${status})` : " after bounded retries"}.`,
          { cause: error },
        );
      }
      options.usage.retries++;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}
