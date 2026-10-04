import { z } from "zod";
export const pickSchema = z.enum(["HOME", "DRAW", "AWAY"]);
const scoreSchema = z.object({
  home: z.number().int().nonnegative(),
  away: z.number().int().nonnegative(),
});
export const sourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  publication: z.string(),
  language: z.string(),
  tier: z.enum(["A", "B", "C", "D"]),
  publishedAt: z.string().nullable(),
});
export const predictionSchema = z.object({
  punditName: z.string().nullable(),
  publication: z.string(),
  pick: pickSchema.nullable(),
  score: scoreSchema.nullable(),
  reasoningSummary: z.string(),
  sourceUrl: z.string(),
  publishedAt: z.string().nullable(),
  originatingPublication: z.string(),
  evidenceExcerpt: z.string(),
});
export const evidenceSchema = z.object({
  summary: z.string(),
  sourceUrls: z.array(z.string()).min(1),
  category: z.enum([
    "injury",
    "suspension",
    "form",
    "homeAway",
    "tactical",
    "schedule",
    "statistics",
    "managerial",
    "underdog",
    "disagreement",
  ]),
  significance: z.number().min(0).max(1),
});
export const researchSchema = z.object({
  punditPredictions: z.array(predictionSchema),
  specialistPredictions: z.array(predictionSchema),
  evidence: z.array(evidenceSchema),
  sources: z.array(sourceSchema),
  gaps: z.array(z.string()),
});
export type ResearchData = z.infer<typeof researchSchema>;
export type Prediction = z.infer<typeof predictionSchema>;
export const probabilitiesSchema = z.object({
  home: z.number().min(0).max(100),
  draw: z.number().min(0).max(100),
  away: z.number().min(0).max(100),
});
export const analysisOutputSchema = z.object({
  scoutProbabilities: probabilitiesSchema,
  predictedScore: scoreSchema,
  alternativeScenario: z.string().min(1),
  whyInteresting: z.array(z.string().min(1)).min(1),
  keyEvidence: z.array(z.string().min(1)).min(1),
  counterArguments: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(10),
});
export const validatedAnalysisSchema = analysisOutputSchema.refine(
  (a) =>
    Math.abs(
      a.scoutProbabilities.home + a.scoutProbabilities.draw + a.scoutProbabilities.away - 100,
    ) <= 0.5,
  "Probabilities must sum to 100 (tolerance 0.5).",
);
export type Analysis = z.infer<typeof analysisOutputSchema>;
