import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { getLeagueConfig } from "../config/leagues.js";
import { getEnvironment } from "../config/env.js";
import { runScout } from "../scout.js";
import { saveReport } from "../reporting/generateMarkdownReport.js";
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      league: { type: "string" },
      "max-matches": { type: "string" },
      match: { type: "string" },
      days: { type: "string", default: "21" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean" },
      resume: { type: "string" },
    },
  });
  if (values.help) {
    console.log(
      "scout [--league bundesliga|eredivisie] [--max-matches N] [--match 'Home vs Away'] [--days 1..60] [--dry-run]\nDry run performs paid live fixture discovery but skips research/analysis.",
    );
    return;
  }
  if (values.league) getLeagueConfig(values.league);
  if (values.resume && (values.league || values.match || values["max-matches"]))
    throw new Error("--resume reuses the saved fixture set; omit league/match/max-matches.");
  const days = Number(values.days),
    maxMatches = values["max-matches"] ? Number(values["max-matches"]) : undefined;
  if (!Number.isInteger(days) || days < 1 || days > 60) throw new Error("--days must be 1..60.");
  if (
    maxMatches !== undefined &&
    (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 12)
  )
    throw new Error("--max-matches must be 1..12.");
  const run = await runScout({
    days,
    dryRun: values["dry-run"],
    ...(values.league ? { league: values.league } : {}),
    ...(values.match ? { match: values.match } : {}),
    ...(maxMatches === undefined ? {} : { maxMatches }),
    ...(values.resume ? { resumeFile: values.resume } : {}),
  });
  const report = await saveReport(run, getEnvironment().DEFAULT_TIMEZONE);
  console.log(`Report: ${report}; estimated cost $${run.usage.estimatedCostUsd.toFixed(4)}`);
  if (run.failures.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("Scout failed. Check arguments, environment and API access.");
    process.exitCode = 1;
  });
}
