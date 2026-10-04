import { getEnvironment } from "./config/env.js";
import { getOpenAIClient } from "./openai/client.js";

export async function checkOpenAIConnection(): Promise<void> {
  const { SCOUT_MODEL } = getEnvironment();
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: SCOUT_MODEL,
    input: "Reply with exactly: Football Scout online.",
    max_output_tokens: 20,
  });

  if (response.output_text.trim() !== "Football Scout online.") {
    throw new Error("OpenAI connectivity check returned an unexpected response.");
  }

  console.log("Football Scout online.");
}

checkOpenAIConnection().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Football Scout failed to start: ${message}`);
  process.exitCode = 1;
});
