# Football Scout POC — Master Implementation Plan

## 0. Current project status

The OpenAI API project already exists.

Current state:

- Project name: Football Scout
- API key already created
- API key has been copied and stored privately on the user's PC
- Do NOT ask the user to paste the API key into chat
- Monthly API project budget has been set to $10
- Auto-reload is not required for the POC
- The next phase is local application development

The application should read the API key from a local environment variable:

OPENAI_API_KEY

The secret must never be committed to Git.

---

# 1. POC objective

Build a working Football Scout proof of concept that:

1. Runs locally from the command line
2. Uses the OpenAI API
3. Uses the Responses API
4. Uses live web search
5. Researches upcoming football matches
6. Starts with:
   - Bundesliga
   - Eredivisie
7. Finds useful football sources
8. Finds actual pundit/journalist predictions where available
9. Preserves source URLs
10. Analyzes each fixture
11. Detects unusually interesting matches
12. Produces an independent Football Scout prediction
13. Produces:

- 1 / X / 2 probabilities
- predicted score
- confidence
- concise reasoning

14. Produces a Markdown report locally
15. Tracks API usage and estimated cost where possible

The POC should NOT yet include:

- frontend
- Next.js
- Express API
- authentication
- database
- Telegram
- scheduled automation
- bookmaker odds
- betting placement
- large-scale scraping
- all European leagues

The goal is to prove that the research quality is good enough before expanding the system.

---

# 2. Technology choice

Use:

- Node.js
- TypeScript
- npm
- OpenAI official JavaScript SDK
- OpenAI Responses API
- OpenAI built-in web search
- dotenv
- Zod
- Vitest
- ESLint
- Prettier

Node.js version:

- Prefer Node.js 22 LTS or the current supported LTS version available on the machine

Do NOT use:

- Next.js
- Express
- React
- NestJS

for the POC.

Reason:
Football Scout is initially a background research process, not a web application.

---

# 3. Repository name

Create:

football-scout

Suggested structure:

football-scout/
├── src/
│ ├── index.ts
│ │
│ ├── config/
│ │ ├── env.ts
│ │ └── leagues.ts
│ │
│ ├── openai/
│ │ ├── client.ts
│ │ ├── models.ts
│ │ └── usage.ts
│ │
│ ├── fixtures/
│ │ ├── getFixtures.ts
│ │ ├── normalizeFixture.ts
│ │ └── types.ts
│ │
│ ├── research/
│ │ ├── researchMatch.ts
│ │ ├── researchLeague.ts
│ │ ├── researchPundits.ts
│ │ ├── researchTeamNews.ts
│ │ └── prompts/
│ │
│ ├── analysis/
│ │ ├── calculateInterestScore.ts
│ │ ├── calculateConsensus.ts
│ │ └── analyzeMatch.ts
│ │
│ ├── reporting/
│ │ └── generateMarkdownReport.ts
│ │
│ ├── schemas/
│ │ └── football.ts
│ │
│ └── utils/
│ ├── dates.ts
│ ├── logger.ts
│ └── retry.ts
│
├── output/
├── tests/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── eslint.config.js
├── README.md
└── MASTER_PLAN.md

Do not create unused modules prematurely.

---

# 4. Environment variables

Create:

.env.example

with:

OPENAI_API_KEY=

SCOUT_MODEL=
ANALYST_MODEL=

DEFAULT_TIMEZONE=Europe/Sofia

ENABLE_BUNDESLIGA=true
ENABLE_EREDIVISIE=true

MAX_WEB_SEARCH_CALLS_PER_RUN=40
MAX_MATCHES_PER_LEAGUE=12
MAX_DEEP_ANALYSIS_MATCHES=6
MAX_RETRIES=2

LOG_LEVEL=info

The user's real `.env` should contain:

OPENAI_API_KEY=<private key already stored locally>

Do NOT:

- print the key
- log the key
- commit the key
- put the key in README
- send the key anywhere except the OpenAI SDK

Add `.env` to `.gitignore`.

---

# 5. Important model rule

Do not assume model names from old planning conversations.

Before implementation:

- inspect current OpenAI model availability
- choose a cost-effective current model for research
- choose a stronger current model for final analysis

The code must use:

SCOUT_MODEL

for:

- search
- extraction
- summarization
- translation
- source discovery
- source classification

Use:

ANALYST_MODEL

for:

- final shortlist reasoning
- probabilities
- score prediction
- conflict analysis
- confidence

Model names must be configurable.

Never hardcode a model throughout the codebase.

---

# 6. Phase 1 — Project bootstrap

Create the Node.js project.

Tasks:

- initialize npm
- configure TypeScript
- install OpenAI SDK
- install dotenv
- install Zod
- install Vitest
- install ESLint
- install Prettier
- create npm scripts
- configure `.gitignore`
- create `.env.example`
- create README

Suggested scripts:

npm run dev
npm run build
npm run start
npm run test
npm run lint
npm run typecheck

Definition of done:

- TypeScript project builds successfully
- tests run
- lint works
- `.env` is ignored

---

# 7. Phase 2 — OpenAI connectivity

Create:

src/openai/client.ts

Responsibilities:

- load API key
- create one OpenAI client
- throw a clear error when key is missing

Create a simple startup request.

Expected CLI output:

Football Scout online.

Use OpenAI Responses API.

Definition of done:

- `npm run dev` reaches OpenAI
- application returns expected text
- API usage appears under Football Scout project
- no secrets appear in logs

---

# 8. Phase 3 — Live web search test

Add a test command that asks:

"Find the upcoming Bundesliga fixtures."

Use OpenAI built-in web search.

Return:

- home team
- away team
- kickoff time
- source URL

Do not perform full research yet.

Validate manually:

- fixtures are current
- fixtures belong to current season
- dates are correct
- sources are real

Definition of done:
The application successfully retrieves live upcoming football fixtures with sources.

---

# 9. Fixture domain model

Create:

interface Fixture {
id: string;
league: string;
homeTeam: string;
awayTeam: string;
kickoff: string;
round?: string;
sourceUrls: string[];
}

Normalize kickoff times to ISO format internally.

Display times in:

Europe/Sofia

Do not hardcode UTC offsets.

---

# 10. Initial league configuration

Create a LeagueConfig structure.

Example:

interface LeagueConfig {
id: string;
name: string;
country: string;
primaryLanguage: string;
secondaryLanguage: string;
expectedMatchesPerRound: number;
}

Bundesliga:

id: bundesliga
name: Bundesliga
country: Germany
primaryLanguage: German
secondaryLanguage: English
expectedMatchesPerRound: 9

Eredivisie:

id: eredivisie
name: Eredivisie
country: Netherlands
primaryLanguage: Dutch
secondaryLanguage: English
expectedMatchesPerRound: 9

---

# 11. Core research philosophy

Football Scout must:

Research everything.
Recommend very little.

A normal Bundesliga + Eredivisie weekend may contain:

18 fixtures

The system should not automatically recommend 18 matches.

Expected flow:

18 fixtures
↓
18 researched
↓
perhaps 8 potentially interesting
↓
perhaps 4–6 shortlisted
↓
perhaps 2–3 strongest

A PASS result is valid.

The system must be allowed to say:

"No sufficiently strong match was found."

---

# 12. Source hierarchy

Use the following priority.

## Tier A — named human expertise

Prefer:

- pundits
- journalists
- former players
- former coaches
- club correspondents
- football analysts
- television analysts
- radio analysts
- podcast hosts with genuine football expertise

## Tier B — reputable football media

Examples:

- established newspapers
- major sports broadcasters
- respected football publications
- local/regional club coverage

## Tier C — specialist prediction sites

Use for:

- comparison
- exact-score predictions
- consensus
- secondary evidence

## Tier D — statistics/data

Use for:

- recent form
- home/away form
- goals
- xG if available
- injuries
- suspensions
- cards
- fixture congestion
- lineups
- recent results

Deprioritize:

- SEO spam
- copied prediction pages
- anonymous low-quality articles
- stale pages
- pages without publication dates

---

# 13. Native-language research

Bundesliga:

- search German sources first
- search German football terminology
- prefer German pundits and journalists

Eredivisie:

- search Dutch sources first
- search Dutch football terminology
- prefer Dutch pundits and journalists

English sources may supplement research.

They must not replace domestic coverage.

---

# 14. Pundit integrity rule

This is critical.

Every attributed pundit prediction must have:

- pundit name
- publication/source
- match
- prediction or clear leaning
- source URL

If exact score exists:

- preserve it

If only 1X2 prediction exists:

- preserve that

Never invent:

- pundit names
- predictions
- quotes
- source URLs
- exact scores

Rule:

NO SOURCE URL = NO ATTRIBUTED PUNDIT PREDICTION

---

# 15. Prediction schema

Create:

interface PunditPrediction {
punditName: string;
publication: string;

league: string;

homeTeam: string;
awayTeam: string;

pick?: "HOME" | "DRAW" | "AWAY";

predictedHomeGoals?: number;
predictedAwayGoals?: number;

reasoningSummary?: string;

sourceUrl: string;
publishedAt?: string;

confidence?: number;
}

Validate with Zod.

---

# 16. Single-match research first

Do not begin with full-round research.

Implement:

researchMatch(fixture)

for ONE fixture.

Research:

- named pundit predictions
- specialist predictions
- recent form
- team news
- injuries
- suspensions
- home/away performance
- tactical discussion
- fixture congestion
- recent European games where relevant
- managerial news
- statistical anomalies

Return structured data.

Test initially on:

- one Bundesliga fixture

Only after quality is acceptable:

- test one Eredivisie fixture

---

# 17. Research result schema

Create something like:

interface MatchResearch {
fixture: Fixture;

punditPredictions: PunditPrediction[];

specialistPredictions: SpecialistPrediction[];

injuries: ResearchItem[];
suspensions: ResearchItem[];

formNotes: string[];
tacticalNotes: string[];
scheduleNotes: string[];
statisticalNotes: string[];

sources: SourceReference[];

researchQuality: number;
}

All structured model output must be validated with Zod.

If invalid:

- retry once or twice
- never retry indefinitely

---

# 18. Deduplication

The system must detect copied predictions.

Example:

If 5 websites repeat one pundit's prediction:

2–1 Dortmund

that counts as:

- one original prediction

not:

- five independent opinions

Deduplicate using:

- same pundit
- same score
- same wording
- same originating publication
- syndicated content
- canonical source URL

Consensus must count independent sources only.

---

# 19. Research quality score

Create a 0–100 score.

Factors may include:

- number of independent sources
- number of named pundits
- domestic-language source presence
- source recency
- reputable sources
- team-news quality
- statistical coverage
- source diversity

Example:

0–39 poor
40–59 acceptable
60–79 good
80–100 excellent

Final Scout confidence must be lower when research quality is low.

---

# 20. Interest Score

Create an explainable 0–100 score.

Suggested components:

Pundit consensus strength 0–15
Pundit disagreement 0–15
Statistical anomaly 0–15
Home/away anomaly 0–10
Important injuries/suspensions 0–10
Tactical mismatch 0–10
Fixture congestion 0–5
Managerial/context factor 0–5
Credible underdog evidence 0–10
Research quality 0–5

Total 100

Initial categories:

0–44 PASS
45–59 WATCH
60–74 INTERESTING
75–84 STRONG
85–100 EXCEPTIONAL

The score is initially a ranking heuristic, not a scientifically calibrated prediction model.

---

# 21. Important feature — disagreement detection

Football Scout should specifically search for:

- domestic pundits disagreeing with generic prediction sites
- strong pundit disagreement
- statistics disagreeing with media narrative
- favorite receiving weak expert support
- underdog receiving unusual expert support
- strong home/away mismatch
- injuries not reflected in generic predictions
- tactical changes not reflected in mainstream consensus
- schedule congestion
- recent managerial changes

Interesting disagreement is a core feature.

Do not optimize only for consensus.

---

# 22. Two-stage OpenAI workflow

Stage 1:

SCOUT_MODEL

Use for:

- source discovery
- web search
- extraction
- translation
- summarization
- classification
- identifying candidate matches

Stage 2:

ANALYST_MODEL

Use only for top shortlisted matches.

Responsibilities:

- compare conflicting evidence
- reason about tactics
- produce independent probability estimates
- produce score prediction
- produce alternative scenario
- produce confidence
- explain why match is interesting

This limits API costs.

---

# 23. Final match analysis schema

Create:

interface MatchAnalysis {
fixture: Fixture;

interestScore: number;

whyInteresting: string[];

punditConsensus: {
home: number;
draw: number;
away: number;
};

scoutProbabilities: {
home: number;
draw: number;
away: number;
};

predictedScore: {
home: number;
away: number;
};

alternativeScenario: string;

keyEvidence: string[];
counterArguments: string[];

confidence: number;

sources: SourceReference[];
}

Validation:

- probabilities must sum approximately to 100
- probabilities must be 0–100
- confidence must be bounded
- predicted score must contain non-negative integers

---

# 24. Separate the three voices

Every final report must clearly separate:

## PUNDITS

What real named people said.

## SPECIALIST / DATA SOURCES

What prediction sites/statistics indicate.

## FOOTBALL SCOUT

The application's own independent conclusion.

Never write a report that blurs these together.

---

# 25. Final POC report

Generate:

output/YYYY-MM-DD-football-scout.md

Example structure:

# Football Scout

Run date:
Leagues:
Fixtures researched:
Sources found:
Named pundits found:
Matches shortlisted:

## Top Match 1

Match:
Kickoff:
Interest Score:

### Why interesting

...

### Pundits

...

### Specialist/data consensus

...

### Football Scout

Home: 37%
Draw: 31%
Away: 32%

Predicted score:
2–2

Alternative:
2–1 home

Confidence:
7.5 / 10

### Key evidence

...

### Counter-arguments

...

### Sources

- URL
- URL
- URL

Repeat for shortlisted matches.

Then:

## Passed matches

List matches that did not meet shortlist threshold.

---

# 26. Cost protection

This project has a $10 monthly API budget.

Application-level protections are still required.

Use:

MAX_WEB_SEARCH_CALLS_PER_RUN
MAX_MATCHES_PER_LEAGUE
MAX_DEEP_ANALYSIS_MATCHES
MAX_RETRIES

Initial conservative values:

MAX_WEB_SEARCH_CALLS_PER_RUN=40
MAX_MATCHES_PER_LEAGUE=12
MAX_DEEP_ANALYSIS_MATCHES=6
MAX_RETRIES=2

During early development:

- research one match at a time
- do not repeatedly run complete rounds unnecessarily
- do not use analyst model for fixture discovery
- avoid expensive retries

---

# 27. Usage telemetry

Every run should track:

- run ID
- start time
- end time
- leagues
- fixtures found
- fixtures researched
- shortlist count
- OpenAI calls
- web-search calls
- input tokens when available
- output tokens when available
- retries
- errors
- elapsed time

If possible:

- calculate estimated cost

Do not make pricing logic deeply coupled to core business logic.

Pricing changes over time.

---

# 28. CLI commands

POC should eventually support:

npm run scout

Run configured leagues.

npm run scout -- --league bundesliga

Only Bundesliga.

npm run scout -- --league eredivisie

Only Eredivisie.

npm run scout -- --max-matches 1

Cheap development run.

npm run scout -- --match "Bayern Munich vs Dortmund"

Single-match research.

npm run scout -- --dry-run

Fixture/research planning without expensive deep analysis.

---

# 29. Error handling

Handle:

- missing API key
- API timeout
- rate limits
- malformed model output
- no sources
- no pundits
- postponed fixture
- changed kickoff
- duplicate sources
- failed match research

Rules:

- bounded retries
- no infinite loops
- one failed fixture should not necessarily abort the entire run
- partial results should still be reportable

---

# 30. Logging

Log:

- run status
- current league
- current fixture
- source count
- API calls
- retries
- failures
- shortlist progress

Do NOT log:

- API key
- authentication headers
- full secret environment variables

---

# 31. Testing

Unit tests should cover:

- fixture normalization
- probability validation
- interest-score calculation
- source deduplication
- timezone conversion
- schema validation
- prediction aggregation

Do not make normal unit tests call the real OpenAI API.

Use mocks.

Live integration tests must be explicit.

Example:

RUN_LIVE_TESTS=true

---

# 32. POC milestone order

## Milestone 0 — Bootstrap

- Node.js
- TypeScript
- dependencies
- scripts
- lint
- tests
- README
- environment setup

## Milestone 1 — OpenAI connection

- client
- API key loading
- Responses API
- "Football Scout online"

## Milestone 2 — Web search

- live Bundesliga fixture search
- source URLs

## Milestone 3 — Fixture model

- normalized fixtures
- Sofia timezone
- Bundesliga
- Eredivisie

## Milestone 4 — Research one Bundesliga match

- news
- pundits
- specialist predictions
- sources

## Milestone 5 — Structured prediction extraction

- Zod
- pundit prediction schema
- source validation
- deduplication

## Milestone 6 — Research one Eredivisie match

- Dutch-language research
- native sources

## Milestone 7 — Research full Bundesliga round

- all fixtures
- preliminary scoring

## Milestone 8 — Research full Eredivisie round

- all fixtures
- preliminary scoring

## Milestone 9 — Interest Score

- ranking
- PASS/WATCH/INTERESTING/STRONG/EXCEPTIONAL

## Milestone 10 — Deep analysis

- analyst model
- probabilities
- score
- confidence
- counter-arguments

## Milestone 11 — Markdown report

- clear readable output
- sources
- shortlist
- passes

## Milestone 12 — Cost/usage telemetry

- calls
- searches
- token usage
- estimated cost

STOP THE POC HERE.

Evaluate quality before adding automation.

---

# 33. POC acceptance criteria

The POC is successful if:

- it runs locally
- it authenticates using the user's Football Scout API key
- it retrieves current fixtures
- it researches Bundesliga
- it researches Eredivisie
- it searches local-language football sources
- it identifies named pundits when available
- pundit predictions have source URLs
- no fabricated pundit predictions appear during manual review
- it researches all fixtures in a round
- it shortlists only a small number
- it generates independent probabilities
- it generates a likely score
- it provides source links
- it produces a useful Markdown report
- one full run stays within acceptable cost
- the user judges the report better than manually reading generic prediction websites

---

# 34. Deferred Phase 2 features

DO NOT build these during the initial POC unless explicitly requested.

Later:

- Telegram bot
- Tuesday scheduler
- Friday scheduler
- Monday review
- PostgreSQL/Supabase
- pundit history
- pundit leaderboard
- prediction history
- automated result collection
- performance tracking
- probability calibration
- bookmaker odds
- implied probability
- value detection
- cards markets
- referee analysis
- injuries API
- lineups
- press conference monitoring
- Champions League
- Premier League
- Serie A
- La Liga
- Ligue 1
- Europa League
- Conference League
- dashboard
- Next.js UI

---

# 35. Later automation target

Eventually:

Tuesday 12:00 Europe/Sofia

Purpose:

- midweek rounds
- European games
- unusual rescheduled fixtures

Friday 12:00 Europe/Sofia

Purpose:

- full weekend research

Monday

Purpose:

- collect results
- evaluate Scout
- evaluate pundits
- produce review

But this is outside the POC.

---

# 36. Later persistence model

Future database tables may include:

leagues
teams
matches
sources
pundits
pundit_predictions
specialist_predictions
scout_predictions
match_results
research_runs
run_usage

Do not introduce database complexity before POC quality is proven.

---

# 37. Later pundit evaluation

Eventually track:

- total predictions
- 1X2 accuracy
- exact-score accuracy
- draw accuracy
- underdog calls
- league-specific performance
- recent performance
- sample size

Never rank pundits meaningfully on tiny samples.

Suggested minimum:
20 qualified predictions.

---

# 38. Core product principle

Football Scout is NOT:

"Ask AI who will win."

Football Scout IS:

"Research the football ecosystem around every upcoming fixture, find credible human opinion and specialist analysis, detect informative disagreement, and then independently evaluate the evidence."

---

# 39. Rules for Codex

When working on this repository:

1. Read this file first.
2. Inspect existing implementation before changing it.
3. Work on one milestone at a time.
4. Avoid premature infrastructure.
5. Keep secrets private.
6. Never expose `.env`.
7. Do not invent API behavior.
8. Check current OpenAI API documentation when implementing API-specific functionality.
9. Check current model availability before choosing models.
10. Use the Responses API.
11. Prefer structured output.
12. Validate structured model output.
13. Preserve source URLs.
14. Never invent pundit predictions.
15. Keep API cost in mind.
16. Run typecheck.
17. Run tests.
18. Run lint.
19. Summarize modified files.
20. Stop at the requested milestone unless explicitly told to continue.

---

# 40. FIRST CODEX TASK

Start with Milestone 0 and Milestone 1 only.

Task:

Bootstrap the Football Scout Node.js + TypeScript repository and establish a working OpenAI API connection.

Requirements:

- initialize project
- configure TypeScript
- install official OpenAI SDK
- install dotenv
- install Zod
- install Vitest
- configure ESLint and Prettier
- create `.gitignore`
- create `.env.example`
- ensure `.env` is ignored
- implement environment validation
- implement OpenAI client
- use OPENAI_API_KEY
- use Responses API
- perform one tiny API request
- print:

Football Scout online.

- add useful npm scripts
- write basic README
- run tests
- run lint
- run typecheck

Do NOT yet:

- search football data
- add database
- add Express
- add Next.js
- add Telegram
- add GitHub Actions
- add scheduler

Definition of done:

`npm run dev`

successfully calls OpenAI using the locally stored project API key and prints a successful Football Scout response.

After this milestone, stop and report:

- files created
- commands available
- tests executed
- any API usage incurred
- recommended next step

The next milestone will be:

Use OpenAI web search to retrieve current Bundesliga fixtures with source URLs.
