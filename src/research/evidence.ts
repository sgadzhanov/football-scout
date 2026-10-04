import type { Prediction, ResearchData } from "../schemas/football.js";

export function canonicalUrl(value: string): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported source protocol.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
}
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function deduplicatePredictions(predictions: Prediction[]): Prediction[] {
  const output: Prediction[] = [];
  for (const p of predictions) {
    const samePick = (q: Prediction) =>
      q.pick === p.pick && JSON.stringify(q.score) === JSON.stringify(p.score);
    if (
      output.some(
        (q) =>
          canonicalUrl(q.sourceUrl) === canonicalUrl(p.sourceUrl) ||
          (Boolean(p.punditName?.trim()) &&
            normalize(q.punditName ?? "") === normalize(p.punditName ?? "")) ||
          (samePick(q) &&
            ((p.punditName !== null && normalize(q.punditName ?? "") === normalize(p.punditName)) ||
              normalize(q.originatingPublication) === normalize(p.originatingPublication) ||
              (p.evidenceExcerpt.length > 30 &&
                normalize(q.evidenceExcerpt) === normalize(p.evidenceExcerpt)))),
      )
    )
      continue;
    output.push(p);
  }
  return output;
}
export function groundResearch(data: ResearchData, observedUrls: string[]): ResearchData {
  const observed = new Set(observedUrls.map(canonicalUrl));
  const sources = data.sources.filter((s) => observed.has(canonicalUrl(s.url)));
  const allowed = new Set(sources.map((s) => canonicalUrl(s.url)));
  const valid = (p: Prediction) =>
    allowed.has(canonicalUrl(p.sourceUrl)) &&
    p.evidenceExcerpt.trim().length > 0 &&
    (p.pick !== null || p.score !== null);
  return {
    ...data,
    sources: [...new Map(sources.map((s) => [canonicalUrl(s.url), s])).values()],
    punditPredictions: deduplicatePredictions(
      data.punditPredictions.filter((p) => valid(p) && Boolean(p.punditName?.trim())),
    ),
    specialistPredictions: deduplicatePredictions(data.specialistPredictions.filter(valid)),
    evidence: data.evidence.filter((e) =>
      e.sourceUrls.every((url) => allowed.has(canonicalUrl(url))),
    ),
    gaps: [
      ...data.gaps,
      ...(data.sources.length !== sources.length ? ["Unobserved source URLs were removed."] : []),
    ],
  };
}
export function researchQuality(data: ResearchData, language: string, now = new Date()): number {
  const domains = new Set(data.sources.map((s) => new URL(s.url).hostname));
  const recent = data.sources.filter(
    (s) =>
      s.publishedAt &&
      Date.parse(s.publishedAt) <= now.getTime() &&
      Date.parse(s.publishedAt) >= now.getTime() - 14 * 86400000,
  ).length;
  return Math.min(
    domains.size < 2 ? 39 : 100,
    Math.min(20, domains.size * 4) +
      Math.min(20, data.punditPredictions.length * 10) +
      (data.sources.some((s) => normalize(s.language) === normalize(language)) ? 15 : 0) +
      Math.min(10, recent * 2) +
      Math.min(15, data.sources.filter((s) => s.tier === "A" || s.tier === "B").length * 5) +
      (data.evidence.some((e) => ["injury", "suspension"].includes(e.category)) ? 10 : 0) +
      (data.evidence.some((e) => ["statistics", "form", "homeAway"].includes(e.category)) ? 10 : 0),
  );
}
