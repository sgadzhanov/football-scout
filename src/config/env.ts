import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  OPENAI_API_KEY: z.preprocess(
    (value) => value ?? "",
    z.string().trim().min(1, "OPENAI_API_KEY is required"),
  ),
  SCOUT_MODEL: z.string().trim().min(1).default("gpt-6-luna"),
  ANALYST_MODEL: z.string().trim().min(1).default("gpt-6.1-sol"),
  DEFAULT_TIMEZONE: z.string().trim().min(1).default("Europe/Sofia"),
  ENABLE_BUNDESLIGA: z.stringbool().default(true),
  ENABLE_EREDIVISIE: z.stringbool().default(true),
  MAX_WEB_SEARCH_CALLS_PER_RUN: z.coerce.number().int().nonnegative().default(40),
  MAX_MATCHES_PER_LEAGUE: z.coerce.number().int().positive().default(12),
  MAX_DEEP_ANALYSIS_MATCHES: z.coerce.number().int().nonnegative().default(6),
  MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(2),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= parseEnvironment(process.env);
  return cachedEnvironment;
}
