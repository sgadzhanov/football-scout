import { randomUUID } from "node:crypto";
import type { Response } from "openai/resources/responses/responses";

// Standard USD per million tokens, checked 2026-10-04; estimates, not billing records.
const prices: Record<string, [number, number]> = {
  "gpt-6-luna": [0.1, 0.5],
  "gpt-6.1-sol": [2, 10],
};
export class RunUsage {
  readonly runId = randomUUID();
  readonly startTime = new Date().toISOString();
  endTime: string | null = null;
  openaiCalls = 0;
  webSearchCalls = 0;
  reservedSearchCalls = 0;
  inputTokens = 0;
  outputTokens = 0;
  retries = 0;
  errors: string[] = [];
  estimatedCostUsd = 0;
  unknownPricing = false;
  elapsedMs = 0;
  fixturesFound = 0;
  fixturesResearched = 0;
  shortlistCount = 0;
  unknownUsage = false;
  constructor(readonly searchLimit: number) {}
  reserveSearches(requested: number): number {
    const count = Math.min(requested, this.searchLimit - this.reservedSearchCalls);
    if (count < 1) throw new Error("Run web-search budget exhausted.");
    this.reservedSearchCalls += count;
    return count;
  }
  record(response: Response): void {
    if (!response.usage) this.unknownUsage = true;
    const input = response.usage?.input_tokens ?? 0;
    const output = response.usage?.output_tokens ?? 0;
    const searches = response.output.filter(
      (item) => item.type === "web_search_call" && item.action.type === "search",
    ).length;
    this.inputTokens += input;
    this.outputTokens += output;
    this.webSearchCalls += searches;
    const rate = Object.entries(prices).find(([model]) => response.model.startsWith(model))?.[1];
    if (rate) this.estimatedCostUsd += (input * rate[0] + output * rate[1]) / 1_000_000;
    else this.unknownPricing = true;
    this.estimatedCostUsd += searches * 0.01;
  }
  finish(): void {
    this.endTime = new Date().toISOString();
    this.elapsedMs = Date.parse(this.endTime) - Date.parse(this.startTime);
  }
}
