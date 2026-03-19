/**
 * US Census Population Migration & Geographic Mobility
 *
 * Uses ACS 5-Year estimates for geographic mobility data.
 * Table B07003: Geographic Mobility in the Past Year by Sex for Current Residence
 * Table B07001: Geographic Mobility by Age for Current Residence
 *
 * Shows what % of population moved in from different state/abroad, vs stayed put.
 * Combined with total population to estimate net population change.
 *
 * Requires CENSUS_API_KEY environment variable.
 */

const BASE_URL = "https://api.census.gov/data";
const ACS_YEAR = "2023";
const ACS_DATASET = "acs/acs5";

// B07003: Geographic Mobility by Sex (Current Residence in US)
// B07003_001E = Total population 1 year and over
// B07003_004E = Same house 1 year ago
// B07003_007E = Moved within same county
// B07003_010E = Moved from different county, same state
// B07003_013E = Moved from different state
// B07003_016E = Moved from abroad

const MIGRATION_VARS = {
  totalPop1YearPlus: "B07003_001E",
  sameHouse: "B07003_004E",
  sameCounty: "B07003_007E",
  diffCountySameState: "B07003_010E",
  diffState: "B07003_013E",
  fromAbroad: "B07003_016E",
  // Also get current total population for context
  totalPopulation: "B01003_001E",
  // Population estimates for change calculation
  // B01003 is total pop for the ACS year
};

export interface MigrationResult {
  city: string;
  state: string;
  dataYear: string;
  totalPopulation: number;
  mobilityPopulation: number; // 1 year and over
  sameHouse: number;
  sameHousePercent: number;
  movedWithinCounty: number;
  movedWithinCountyPercent: number;
  movedFromDiffCounty: number;
  movedFromDiffCountyPercent: number;
  movedFromDiffState: number;
  movedFromDiffStatePercent: number;
  movedFromAbroad: number;
  movedFromAbroadPercent: number;
  totalMovers: number;
  totalMoversPercent: number;
  // Inflow = people who moved in from different state + abroad
  inflowPercent: number;
}

export async function queryMigration(cityInput: string): Promise<MigrationResult> {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) {
    throw new Error("CENSUS_API_KEY environment variable is required for migration data");
  }

  // Use Census place search to resolve FIPS codes (same as queryCensus)
  const { searchCensusPlaces } = await import("./census.js");
  const places = await searchCensusPlaces(cityInput);

  if (places.length === 0) {
    throw new Error(`Could not find "${cityInput}" in Census data. Try a more specific city name.`);
  }

  const best = places[0]; // largest matching place

  const vars = Object.values(MIGRATION_VARS).join(",");
  const url = `${BASE_URL}/${ACS_YEAR}/${ACS_DATASET}?get=NAME,${vars}&for=place:${best.placeFips}&in=state:${best.stateFips}&key=${apiKey}`;

  console.error(`[city-data-mcp] Migration: Fetching ${cityInput} (state:${best.stateFips} place:${best.placeFips})`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census API error (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json() as string[][];
  if (data.length < 2) {
    throw new Error(`No migration data found for "${cityInput}"`);
  }

  const headers = data[0];
  const values = data[1];

  function getValue(varCode: string): number {
    const idx = headers.indexOf(varCode);
    return idx >= 0 ? parseInt(values[idx]) || 0 : 0;
  }

  const totalPop = getValue(MIGRATION_VARS.totalPopulation);
  const mobPop = getValue(MIGRATION_VARS.totalPop1YearPlus);
  const sameHouse = getValue(MIGRATION_VARS.sameHouse);
  const sameCounty = getValue(MIGRATION_VARS.sameCounty);
  const diffCounty = getValue(MIGRATION_VARS.diffCountySameState);
  const diffState = getValue(MIGRATION_VARS.diffState);
  const fromAbroad = getValue(MIGRATION_VARS.fromAbroad);
  const totalMovers = sameCounty + diffCounty + diffState + fromAbroad;

  const pct = (n: number) => mobPop > 0 ? Math.round((n / mobPop) * 1000) / 10 : 0;

  return {
    city: values[0].split(",")[0] || cityInput,
    state: best.name.split(", ").pop() || "",
    dataYear: `${ACS_YEAR} ACS 5-Year`,
    totalPopulation: totalPop,
    mobilityPopulation: mobPop,
    sameHouse,
    sameHousePercent: pct(sameHouse),
    movedWithinCounty: sameCounty,
    movedWithinCountyPercent: pct(sameCounty),
    movedFromDiffCounty: diffCounty,
    movedFromDiffCountyPercent: pct(diffCounty),
    movedFromDiffState: diffState,
    movedFromDiffStatePercent: pct(diffState),
    movedFromAbroad: fromAbroad,
    movedFromAbroadPercent: pct(fromAbroad),
    totalMovers,
    totalMoversPercent: pct(totalMovers),
    inflowPercent: pct(diffState + fromAbroad),
  };
}

export function formatMigrationResults(result: MigrationResult): string {
  const lines: string[] = [];

  lines.push(`**Data:** ${result.dataYear}`);
  lines.push(`**Population:** ${result.totalPopulation.toLocaleString()}`);
  lines.push("");
  lines.push("## Geographic Mobility (Past Year)");
  lines.push(`- **Same House:** ${result.sameHousePercent}% (${result.sameHouse.toLocaleString()} people)`);
  lines.push(`- **Total Movers:** ${result.totalMoversPercent}% (${result.totalMovers.toLocaleString()} people)`);
  lines.push("");
  lines.push("### Where Movers Came From:");
  lines.push(`- Within County: ${result.movedWithinCountyPercent}% (${result.movedWithinCounty.toLocaleString()})`);
  lines.push(`- Different County, Same State: ${result.movedFromDiffCountyPercent}% (${result.movedFromDiffCounty.toLocaleString()})`);
  lines.push(`- **Different State:** ${result.movedFromDiffStatePercent}% (${result.movedFromDiffState.toLocaleString()})`);
  lines.push(`- **From Abroad:** ${result.movedFromAbroadPercent}% (${result.movedFromAbroad.toLocaleString()})`);
  lines.push("");
  lines.push(`**Net Inflow (from other states + abroad):** ${result.inflowPercent}% of population`);
  lines.push("");
  lines.push("*Source: US Census Bureau, American Community Survey 5-Year Estimates, Table B07003.*");

  return lines.join("\n");
}
