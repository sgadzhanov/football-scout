# Football Scout

Football Scout is a local Node.js and TypeScript proof of concept for researching upcoming
football fixtures with the OpenAI Responses API. The initial leagues are the Bundesliga and
Eredivisie. The current implementation includes project bootstrap, API connectivity, live fixture
web search, normalized fixtures, native-language research, source grounding, prediction deduplication,
research-quality and interest scoring, independent analyst predictions, Markdown reports, and usage telemetry.

## Requirements

- Node.js 22 or newer
- npm
- An OpenAI project API key with an appropriate usage budget

## Setup

Install dependencies:

```sh
npm install
```

Create a local environment file, then add the private API key already stored on your machine:

```sh
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=your_private_key
```

Never commit `.env`. Model names and other runtime limits are configurable in that file. The
defaults use a cost-efficient scouting model and reserve a stronger model for later analysis.

## Commands

- `npm run dev` — make the tiny live Responses API connectivity request
- `npm run fixtures` — search live web sources for upcoming Bundesliga fixtures
- `npm run fixtures -- --league eredivisie` — search upcoming Eredivisie fixtures
- `npm run fixtures -- --days 14 --max-matches 3` — limit the live search window and results
- `npm run build` — compile production JavaScript into `dist/`
- `npm start` — run the compiled application
- `npm test` — run unit tests (no live API calls)
- `npm run lint` — run ESLint
- `npm run typecheck` — type-check without emitting files
- `npm run format:check` — verify Prettier formatting
- `npm run format` — apply Prettier formatting
- `npm run test:live` — explicitly run the live Bundesliga integration test (uses the API)

On a successful live connectivity check, the command prints:

```text
Football Scout online.
```

Unit tests never call OpenAI. Live API use is limited to explicit application commands such as
`npm run dev`, `npm run fixtures`, and `npm run test:live`.

## Fixture search

The default fixture command searches live web sources for Bundesliga matches scheduled in the
next 21 days:

```sh
npm run fixtures
```

Results include home and away teams, normalized kickoff times displayed in `Europe/Sofia`, the
round when available, and source URLs. During an international break, the search looks ahead to
the first scheduled round inside the date window. An empty result with an explanatory note is
valid when the league has no scheduled fixtures in that window.

The command supports `bundesliga` and `eredivisie` league configuration, although the milestone's
required live validation targets Bundesliga first.

## Scope

The implementation follows [PROJECT-PLAN.md](./PROJECT-PLAN.md) through Milestone 12. Databases,
web servers, frontends, scheduling, and bookmaker odds are deferred.

## Run the POC

```sh
npm run scout -- --league bundesliga --max-matches 1
npm run scout -- --league eredivisie --max-matches 1
npm run scout
```

The full command discovers the next round in each enabled league, researches every discovered
fixture, ranks it, and analyzes at most `MAX_DEEP_ANALYSIS_MATCHES` candidates with interest >=60
and research quality >=40. A PASS with no analyst prediction is valid. Named pundits can be absent,
particularly far from kickoff; this is recorded in the research gaps.

```sh
npm run scout -- --league bundesliga --match "Home Team vs Away Team"
npm run scout -- --dry-run
npm run scout -- --days 14
npm run scout -- --help
npm run scout -- --resume output/PREVIOUS-RUN.json
```

Use exact team names from `npm run fixtures` for `--match`. A dry run performs paid live fixture
discovery, but skips research and analysis. `--max-matches` applies per league. Reports and complete
research JSON are written to `output/YYYY-MM-DD-football-scout-RUN_ID.{md,json}` without overwriting
earlier runs. A nonzero exit code indicates partial failures; the report is still written.
`--resume` validates a saved JSON report, reuses successful upcoming-fixture research, retries only
missing research, and preserves earlier run cost references. It skips discovery and does not refresh
already successful research; use a fresh run when kickoff changes or team news needs updating.

Every factual research note and prediction needs a URL present in the API search output. This
checks provenance, not the truth of the page or the correctness of a quotation: manually review
named predictions against their linked article and the JSON `evidenceExcerpt`. Copied opinions
are conservatively deduplicated before consensus. Interest scores and probabilities are not
scientifically calibrated. Confidence is capped by research quality.

The default 40 web-tool slots allow two discovery calls and two tool calls for each of 18 matches.
Search capacity is reserved before requests; confirmed unused slots are released while unknown
failed-call usage stays reserved, so retries can reduce round coverage. No SDK retries run outside this budget. Output is capped at 8,000 tokens per
request, with a 120-second timeout and bounded application retries. The analyst does not search.
This is a search cap, not a guaranteed dollar/monthly cap; project billing must also be monitored.

Usage JSON includes run ID, timestamps, API calls, search calls, input/output tokens, retries,
failures, and a standard-price cost estimate. Prices are isolated in `src/openai/usage.ts` and
were checked on 2026-10-04. Failed/unreturned request usage is unknown; custom model prices are
marked partial. See [OpenAI pricing](https://developers.openai.com/api/docs/pricing).

## Acceptance review

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and
`npm run format:check` for offline verification. `npm run test:live` tests live fixture discovery.
Use the one-match commands above to review research before a full run. Verify native-language
sources, current dates, human names/opinions, source links, PASS decisions and any analyst
probabilities. Finally compare the report's usefulness with reading generic prediction websites;
that qualitative acceptance decision belongs to the user. Check actual project spend in the
OpenAI dashboard before repeating full rounds.
