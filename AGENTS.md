# Repository Guidelines

## Project Structure & Module Organization

This repository is a Node.js/TypeScript command-line POC.

- `src/config/` contains environment validation and Bundesliga/Eredivisie configuration.
- `src/fixtures/` contains live fixture discovery, schemas, normalization, and source handling.
- `src/research/` contains match research prompts, evidence grounding, quality scoring, and deduplication.
- `src/analysis/` contains consensus, interest scoring, and analyst-model output validation.
- `src/reporting/` generates Markdown and JSON reports under `output/`.
- `src/cli/` contains the `fixtures` and `scout` entry points.
- `tests/` contains offline Vitest tests; `tests/live/` contains explicitly enabled API tests.
- `PROJECT-PLAN.md` is the product and milestone reference. Keep `.env` private; use `.env.example` only as a placeholder template.

## Build, Test, and Development Commands

Run `npm install` after checkout. Common commands:

- `npm run scout -- --league bundesliga --max-matches 1` runs a small live research pass.
- `npm run scout -- --dry-run` discovers fixtures but skips match research and analysis.
- `npm run scout -- --resume output/<run>.json` retries missing research from a saved run.
- `npm test` runs offline tests without OpenAI calls.
- `npm run test:live` runs the explicit live fixture integration test and incurs API usage.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run format:check` run static validation and compilation.

Run the full validation suite before submitting changes:

```sh
npm test && npm run lint && npm run typecheck && npm run build && npm run format:check
```

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, semicolons, and Prettier formatting. Use `camelCase` for functions and variables, `PascalCase` for types/classes, and descriptive filenames such as `calculateInterestScore.ts`. Keep schemas near their domain types and validate all model output before business logic consumes it. Run `npm run format` rather than manually reformatting large files.

## Testing Guidelines

Vitest is the test framework. Name tests `*.test.ts` and keep normal tests deterministic with mocks or pure functions. Do not call OpenAI from unit tests. Use `RUN_LIVE_TESTS=true` or the provided live scripts only for deliberate integration checks. Add coverage for schema validation, source grounding, deduplication, scoring, timezone conversion, retries, and partial-failure behavior.

## Security & Configuration

Read `OPENAI_API_KEY` from `.env`; never print, commit, or place it in `AGENTS.md`, README files, tests, or `.env.example`. Avoid logging prompts that contain untrusted source content. Respect `MAX_WEB_SEARCH_CALLS_PER_RUN`, `MAX_RETRIES`, and `MAX_DEEP_ANALYSIS_MATCHES`; live runs spend API budget.

## Commits & Pull Requests

Use concise imperative commit subjects, for example `Add grounded match research`. Keep commits focused. Pull requests should explain the behavior change, list validation commands, identify any live API usage and estimated cost, link the relevant milestone or issue, and include a sample report path when reporting output changes. Never include `.env`, API responses containing secrets, or unnecessary generated output.
