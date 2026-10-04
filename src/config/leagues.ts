export interface LeagueConfig {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  expectedMatchesPerRound: number;
}

export const leagueConfigs = {
  bundesliga: {
    id: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    countryCode: "DE",
    primaryLanguage: "German",
    secondaryLanguage: "English",
    expectedMatchesPerRound: 9,
  },
  eredivisie: {
    id: "eredivisie",
    name: "Eredivisie",
    country: "Netherlands",
    countryCode: "NL",
    primaryLanguage: "Dutch",
    secondaryLanguage: "English",
    expectedMatchesPerRound: 9,
  },
} as const satisfies Record<string, LeagueConfig>;

export type LeagueId = keyof typeof leagueConfigs;

export function isLeagueId(value: string): value is LeagueId {
  return Object.hasOwn(leagueConfigs, value);
}

export function getLeagueConfig(id: string): LeagueConfig {
  if (!isLeagueId(id)) {
    throw new Error(`Unsupported league: ${id}. Use bundesliga or eredivisie.`);
  }

  return leagueConfigs[id];
}
