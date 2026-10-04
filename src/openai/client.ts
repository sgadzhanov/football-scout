import OpenAI from "openai";

import { getEnvironment } from "../config/env.js";

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const { OPENAI_API_KEY } = getEnvironment();
  client ??= new OpenAI({ apiKey: OPENAI_API_KEY, maxRetries: 0, timeout: 120_000 });
  return client;
}
