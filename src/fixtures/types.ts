import { z } from "zod";

export const fixtureSchema = z.object({
  id: z.string().min(1),
  league: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  kickoff: z.iso.datetime(),
  round: z.string().min(1).optional(),
  sourceUrls: z.array(z.url()).min(1),
});

export type Fixture = z.infer<typeof fixtureSchema>;

export const fixtureSearchItemSchema = z.object({
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  kickoff: z.iso.datetime({ offset: true }),
  round: z.string().nullable(),
  sourceUrls: z.array(z.string().min(1)).min(1),
});

export const fixtureSearchResponseSchema = z.object({
  fixtures: z.array(fixtureSearchItemSchema),
  note: z.string(),
});

export type FixtureSearchItem = z.infer<typeof fixtureSearchItemSchema>;
export type FixtureSearchResponse = z.infer<typeof fixtureSearchResponseSchema>;

export interface FixtureSearchResult {
  fixtures: Fixture[];
  note: string;
  citedSourceUrls: string[];
}
