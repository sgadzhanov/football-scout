import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScoutRun } from "../scout.js";
import { formatKickoff, getZonedDateTimeParts } from "../utils/dates.js";
import { calculateConsensus } from "../analysis/calculateConsensus.js";
import type { Prediction } from "../schemas/football.js";

const text = (s: string) => s.replace(/[\r\n]/g, " ").replace(/[<>]/g, "");
const link = (url: string) => `[source](<${url.replace(/[<>\r\n]/g, "")}>)`;
function predictions(items: Prediction[]) {
  return items.length
    ? items
        .map(
          (p) =>
            `- ${text(p.punditName ?? p.publication)} (${text(p.publication)}): ${p.pick ?? "score only"}${p.score ? `, ${p.score.home}–${p.score.away}` : ""}. ${text(p.reasoningSummary)} ${link(p.sourceUrl)}`,
        )
        .join("\n")
    : "No qualifying source-supported predictions found.";
}
export function generateMarkdownReport(run: ScoutRun, timezone: string): string {
  const top = run.entries.filter((e) => e.analysis);
  const lines = [
    "# Football Scout",
    "",
    `Run: ${run.usage.runId}`,
    `Started: ${run.usage.startTime}`,
    `Leagues: ${run.leagues.join(", ")}`,
    `Fixtures found: ${run.fixtures.length}`,
    `Fixtures researched: ${run.entries.length}`,
    `Sources found: ${new Set(run.entries.flatMap((e) => e.research.sources.map((s) => s.url))).size}`,
    `Named pundit predictions: ${run.entries.reduce((n, e) => n + e.research.punditPredictions.length, 0)}`,
    `Matches shortlisted and analyzed: ${top.length}`,
    "",
    "Interest and probability estimates are heuristics, not calibrated forecasts.",
    "",
  ];
  lines.push("Discovery notes:", ...(run.discoveryNotes ?? []).map((s) => `- ${text(s)}`), "");
  if (run.previousRuns?.length)
    lines.push(
      "Resumed prior research from:",
      ...run.previousRuns.map((r) => `- ${r.runId}: estimated $${r.estimatedCostUsd.toFixed(4)}`),
      "Previously successful research is reused as of its original research date; check freshness nearer kickoff.",
      "",
    );
  if (!top.length)
    lines.push(
      run.dryRun
        ? "Dry run: fixture discovery only; research and analysis were skipped."
        : "No sufficiently strong match was found or successfully analyzed.",
      "",
    );
  for (const entry of [...top, ...run.entries.filter((e) => !e.analysis)]) {
    const r = entry.research,
      f = r.fixture,
      a = entry.analysis;
    const c = calculateConsensus(r.punditPredictions);
    lines.push(
      `## ${text(f.homeTeam)} vs ${text(f.awayTeam)}`,
      "",
      `Kickoff: ${formatKickoff(f.kickoff, timezone)}`,
      `Interest: ${entry.interest.score}/100 — ${entry.interest.category}`,
      `Research quality: ${r.researchQuality}/100`,
      `Components: ${JSON.stringify(entry.interest.components)}`,
      "",
      "### PUNDITS",
      "",
      predictions(r.punditPredictions),
      "",
      c.total
        ? `Independent consensus (${c.total}): home ${c.home.toFixed(1)}%, draw ${c.draw.toFixed(1)}%, away ${c.away.toFixed(1)}%.`
        : "No pundit consensus available.",
      "",
      "### SPECIALIST / DATA SOURCES",
      "",
      predictions(r.specialistPredictions),
      "",
      ...r.evidence.map((e) => `- ${text(e.summary)} ${e.sourceUrls.map(link).join(" ")}`),
      "",
      "### FOOTBALL SCOUT",
      "",
    );
    if (a)
      lines.push(
        `Home: ${a.scoutProbabilities.home}% · Draw: ${a.scoutProbabilities.draw}% · Away: ${a.scoutProbabilities.away}%`,
        `Predicted score: ${a.predictedScore.home}–${a.predictedScore.away}`,
        `Alternative: ${text(a.alternativeScenario)}`,
        `Confidence: ${a.confidence}/10`,
        "",
        "Why interesting:",
        ...a.whyInteresting.map((s) => `- ${text(s)}`),
        "",
        "Key evidence:",
        ...a.keyEvidence.map((s) => `- ${text(s)}`),
        "",
        "Counter-arguments:",
        ...a.counterArguments.map((s) => `- ${text(s)}`),
      );
    else lines.push("PASS/WATCH or insufficient evidence: no independent prediction issued.");
    lines.push(
      "",
      "### Research gaps",
      "",
      ...r.gaps.map((s) => `- ${text(s)}`),
      "",
      "### Sources",
      "",
      ...r.sources.map(
        (s) =>
          `- ${text(s.title)} (${text(s.language)}, tier ${s.tier}, ${s.publishedAt ?? "date unknown"}) ${link(s.url)}`,
      ),
      "",
    );
  }
  lines.push(
    "## Passed matches",
    "",
    ...run.entries
      .filter((e) => !e.analysis)
      .map(
        (e) =>
          `- ${text(e.research.fixture.homeTeam)} vs ${text(e.research.fixture.awayTeam)}: ${e.interest.category}, quality ${e.research.researchQuality}.`,
      ),
    "",
    "## Fixture plan",
    "",
    ...run.fixtures.map(
      (f) =>
        `- ${text(f.homeTeam)} vs ${text(f.awayTeam)}: ${formatKickoff(f.kickoff, timezone)} ${f.sourceUrls.map(link).join(" ")}`,
    ),
    "",
    "## Failures / incomplete coverage",
    "",
    ...(run.failures.length ? run.failures.map((f) => `- ${text(f)}`) : ["None."]),
    "",
    "## Usage",
    "",
    `OpenAI requests: ${run.usage.openaiCalls}; web searches: ${run.usage.webSearchCalls}; reserved tool slots: ${run.usage.reservedSearchCalls}/${run.usage.searchLimit}; retries: ${run.usage.retries}`,
    `Tokens: ${run.usage.inputTokens} input / ${run.usage.outputTokens} output`,
    `Estimated USD: ${run.usage.estimatedCostUsd.toFixed(4)}${run.usage.unknownPricing ? " (partial: unknown model pricing)" : ""}`,
    "Pricing snapshot: 2026-10-04. Estimates exclude unknown/failed request usage; verify billing in OpenAI dashboard.",
    "",
  );
  return lines.join("\n");
}
export async function saveReport(run: ScoutRun, timezone: string, directory = "output") {
  await mkdir(directory, { recursive: true });
  const date = getZonedDateTimeParts(run.usage.startTime, timezone);
  const filename = `${date.year}-${date.month}-${date.day}-football-scout-${run.usage.runId}`;
  const path = join(directory, `${filename}.md`);
  await writeFile(path, generateMarkdownReport(run, timezone), { flag: "wx" });
  await writeFile(join(directory, `${filename}.json`), JSON.stringify(run, null, 2), {
    flag: "wx",
  });
  return path;
}
