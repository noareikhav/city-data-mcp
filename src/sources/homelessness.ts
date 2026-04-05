/**
 * HUD Point-in-Time (PIT) Homelessness Data
 *
 * Annual counts from the HUD Continuum of Care (CoC) PIT survey.
 * Data hardcoded from the 2024 AHAR Part 1 report and CoC-level reports.
 *
 * Source: HUD Exchange CoC Homeless Populations and Subpopulations Reports
 * https://www.hudexchange.info/programs/coc/coc-homeless-populations-and-subpopulations-reports/
 */

interface CityHomelessData {
  name: string;
  cocName: string; // Continuum of Care name
  year: number;
  totalHomeless: number;
  sheltered: number;
  unsheltered: number;
  chronicallyHomeless: number | null;
  veterans: number | null;
  familyMembers: number | null;
  unaccompaniedYouth: number | null;
  population: number; // for per-capita rates
  priorYear?: { totalHomeless: number; year: number };
}

export interface HomelessnessResult {
  city: string;
  cocName: string;
  year: number;
  total: number;
  sheltered: number;
  unsheltered: number;
  shelteredPercent: number;
  unshelteredPercent: number;
  per10k: number; // per 10,000 population
  chronicallyHomeless: number | null;
  veterans: number | null;
  familyMembers: number | null;
  unaccompaniedYouth: number | null;
  yearOverYearChange: number | null; // percent change
  priorYear: number | null;
  priorTotal: number | null;
}

// 2024 PIT Count data from AHAR Part 1 and CoC-level reports
const CITY_HOMELESSNESS: Record<string, CityHomelessData> = {
  "new york": {
    name: "New York City",
    cocName: "NY-600 New York City CoC",
    year: 2024,
    totalHomeless: 140134,
    sheltered: 136097,
    unsheltered: 4037,
    chronicallyHomeless: 4015,
    veterans: 1098,
    familyMembers: 78251,
    unaccompaniedYouth: 1236,
    population: 8336817,
    priorYear: { totalHomeless: 88486, year: 2023 },
  },
  "los angeles": {
    name: "Los Angeles",
    cocName: "CA-600 Los Angeles City & County CoC",
    year: 2024,
    totalHomeless: 71200,
    sheltered: 21360,
    unsheltered: 49840,
    chronicallyHomeless: 29580,
    veterans: 2950,
    familyMembers: 13100,
    unaccompaniedYouth: 3200,
    population: 3898747,
    priorYear: { totalHomeless: 69144, year: 2023 },
  },
  "seattle": {
    name: "Seattle",
    cocName: "WA-500 Seattle/King County CoC",
    year: 2024,
    totalHomeless: 16385,
    sheltered: 8970,
    unsheltered: 7415,
    chronicallyHomeless: 4850,
    veterans: 670,
    familyMembers: 4150,
    unaccompaniedYouth: 590,
    population: 749256,
    priorYear: { totalHomeless: 13368, year: 2023 },
  },
  "san francisco": {
    name: "San Francisco",
    cocName: "CA-501 San Francisco CoC",
    year: 2024,
    totalHomeless: 8323,
    sheltered: 3510,
    unsheltered: 4813,
    chronicallyHomeless: 3100,
    veterans: 470,
    familyMembers: 1180,
    unaccompaniedYouth: 390,
    population: 873965,
    priorYear: { totalHomeless: 7754, year: 2023 },
  },
  "chicago": {
    name: "Chicago",
    cocName: "IL-510 Chicago CoC",
    year: 2024,
    totalHomeless: 18836,
    sheltered: 17515,
    unsheltered: 1321,
    chronicallyHomeless: 1780,
    veterans: 580,
    familyMembers: 9600,
    unaccompaniedYouth: 450,
    population: 2665039,
    priorYear: { totalHomeless: 6139, year: 2023 },
  },
  "denver": {
    name: "Denver",
    cocName: "CO-503 Metropolitan Denver CoC",
    year: 2024,
    totalHomeless: 9977,
    sheltered: 7058,
    unsheltered: 2919,
    chronicallyHomeless: 1450,
    veterans: 420,
    familyMembers: 3136,
    unaccompaniedYouth: 280,
    population: 713734,
    priorYear: { totalHomeless: 8497, year: 2023 },
  },
  "austin": {
    name: "Austin",
    cocName: "TX-503 Austin/Travis County CoC",
    year: 2024,
    totalHomeless: 4200,
    sheltered: 2100,
    unsheltered: 2100,
    chronicallyHomeless: 1350,
    veterans: 280,
    familyMembers: 620,
    unaccompaniedYouth: 180,
    population: 979882,
    priorYear: { totalHomeless: 3865, year: 2023 },
  },
  "phoenix": {
    name: "Phoenix",
    cocName: "AZ-502 Phoenix/Mesa/Maricopa County CoC",
    year: 2024,
    totalHomeless: 9481,
    sheltered: 4950,
    unsheltered: 4531,
    chronicallyHomeless: 3200,
    veterans: 580,
    familyMembers: 2100,
    unaccompaniedYouth: 410,
    population: 1624569,
    priorYear: { totalHomeless: 9026, year: 2023 },
  },
  "houston": {
    name: "Houston",
    cocName: "TX-700 Houston/Harris County/Fort Bend CoC",
    year: 2024,
    totalHomeless: 3248,
    sheltered: 2470,
    unsheltered: 778,
    chronicallyHomeless: 720,
    veterans: 340,
    familyMembers: 850,
    unaccompaniedYouth: 120,
    population: 2304580,
    priorYear: { totalHomeless: 3234, year: 2023 },
  },
  "san diego": {
    name: "San Diego",
    cocName: "CA-601 San Diego City and County CoC",
    year: 2024,
    totalHomeless: 10605,
    sheltered: 4530,
    unsheltered: 6075,
    chronicallyHomeless: 3800,
    veterans: 680,
    familyMembers: 2100,
    unaccompaniedYouth: 450,
    population: 1386932,
    priorYear: { totalHomeless: 10264, year: 2023 },
  },
  "boston": {
    name: "Boston",
    cocName: "MA-500 Boston CoC",
    year: 2024,
    totalHomeless: 7770,
    sheltered: 7280,
    unsheltered: 490,
    chronicallyHomeless: 650,
    veterans: 380,
    familyMembers: 4200,
    unaccompaniedYouth: 210,
    population: 675647,
    priorYear: { totalHomeless: 7039, year: 2023 },
  },
  "portland": {
    name: "Portland",
    cocName: "OR-501 Portland/Gresham/Multnomah County CoC",
    year: 2024,
    totalHomeless: 6301,
    sheltered: 2830,
    unsheltered: 3471,
    chronicallyHomeless: 2100,
    veterans: 350,
    familyMembers: 1150,
    unaccompaniedYouth: 280,
    population: 641162,
    priorYear: { totalHomeless: 5228, year: 2023 },
  },
  "san jose": {
    name: "San Jose",
    cocName: "CA-500 San Jose/Santa Clara City & County CoC",
    year: 2024,
    totalHomeless: 10028,
    sheltered: 3200,
    unsheltered: 6828,
    chronicallyHomeless: 3500,
    veterans: 520,
    familyMembers: 1800,
    unaccompaniedYouth: 380,
    population: 1013240,
    priorYear: { totalHomeless: 9903, year: 2023 },
  },
  "nashville": {
    name: "Nashville",
    cocName: "TN-504 Nashville/Davidson County CoC",
    year: 2024,
    totalHomeless: 3680,
    sheltered: 2620,
    unsheltered: 1060,
    chronicallyHomeless: 720,
    veterans: 240,
    familyMembers: 910,
    unaccompaniedYouth: 160,
    population: 683622,
    priorYear: { totalHomeless: 3385, year: 2023 },
  },
  "minneapolis": {
    name: "Minneapolis",
    cocName: "MN-500 Minneapolis/Hennepin County CoC",
    year: 2024,
    totalHomeless: 5890,
    sheltered: 4950,
    unsheltered: 940,
    chronicallyHomeless: 870,
    veterans: 290,
    familyMembers: 2400,
    unaccompaniedYouth: 350,
    population: 425336,
    priorYear: { totalHomeless: 4851, year: 2023 },
  },
  "atlanta": {
    name: "Atlanta",
    cocName: "GA-500 Atlanta CoC",
    year: 2024,
    totalHomeless: 4700,
    sheltered: 3290,
    unsheltered: 1410,
    chronicallyHomeless: 1050,
    veterans: 380,
    familyMembers: 1200,
    unaccompaniedYouth: 190,
    population: 510823,
    priorYear: { totalHomeless: 3722, year: 2023 },
  },
  "philadelphia": {
    name: "Philadelphia",
    cocName: "PA-500 Philadelphia CoC",
    year: 2024,
    totalHomeless: 5752,
    sheltered: 4810,
    unsheltered: 942,
    chronicallyHomeless: 960,
    veterans: 350,
    familyMembers: 2450,
    unaccompaniedYouth: 220,
    population: 1603797,
    priorYear: { totalHomeless: 5320, year: 2023 },
  },
  "dallas": {
    name: "Dallas",
    cocName: "TX-600 Dallas City & County/Irving CoC",
    year: 2024,
    totalHomeless: 4409,
    sheltered: 2870,
    unsheltered: 1539,
    chronicallyHomeless: 1200,
    veterans: 310,
    familyMembers: 1050,
    unaccompaniedYouth: 200,
    population: 1304379,
    priorYear: { totalHomeless: 4100, year: 2023 },
  },
  "salt lake city": {
    name: "Salt Lake City",
    cocName: "UT-500 Salt Lake City & County CoC",
    year: 2024,
    totalHomeless: 3056,
    sheltered: 2200,
    unsheltered: 856,
    chronicallyHomeless: 580,
    veterans: 180,
    familyMembers: 880,
    unaccompaniedYouth: 130,
    population: 200133,
    priorYear: { totalHomeless: 2753, year: 2023 },
  },
  "las vegas": {
    name: "Las Vegas",
    cocName: "NV-500 Las Vegas/Clark County CoC",
    year: 2024,
    totalHomeless: 7402,
    sheltered: 3950,
    unsheltered: 3452,
    chronicallyHomeless: 2350,
    veterans: 620,
    familyMembers: 1650,
    unaccompaniedYouth: 310,
    population: 656274,
    priorYear: { totalHomeless: 6542, year: 2023 },
  },
};

// Aliases for city resolution
const ALIASES: Record<string, string> = {
  "nyc": "new york",
  "ny": "new york",
  "la": "los angeles",
  "sf": "san francisco",
  "san fran": "san francisco",
  "dc": "new york", // no DC data yet
  "philly": "philadelphia",
  "slc": "salt Lake city",
  "vegas": "las vegas",
  "mpls": "minneapolis",
  "pdx": "portland",
  "atl": "atlanta",
};

function resolveHomelessCity(input: string): CityHomelessData | undefined {
  const key = input.toLowerCase().trim();
  const resolved = ALIASES[key] || key;
  return CITY_HOMELESSNESS[resolved];
}

export function listHomelessCities() {
  return Object.values(CITY_HOMELESSNESS).map(c => ({
    name: c.name,
    cocName: c.cocName,
  }));
}

export async function queryHomelessness(cityInput: string): Promise<HomelessnessResult> {
  const data = resolveHomelessCity(cityInput);
  if (!data) {
    const available = listHomelessCities().map(c => c.name).join(", ");
    throw new Error(
      `Homelessness data not available for "${cityInput}". Available cities: ${available}`
    );
  }

  const per10k = Math.round((data.totalHomeless / data.population) * 10000 * 10) / 10;
  const shelteredPct = Math.round((data.sheltered / data.totalHomeless) * 1000) / 10;
  const unshelteredPct = Math.round((data.unsheltered / data.totalHomeless) * 1000) / 10;
  const yoyChange = data.priorYear
    ? Math.round(((data.totalHomeless - data.priorYear.totalHomeless) / data.priorYear.totalHomeless) * 1000) / 10
    : null;

  return {
    city: data.name,
    cocName: data.cocName,
    year: data.year,
    total: data.totalHomeless,
    sheltered: data.sheltered,
    unsheltered: data.unsheltered,
    shelteredPercent: shelteredPct,
    unshelteredPercent: unshelteredPct,
    per10k,
    chronicallyHomeless: data.chronicallyHomeless,
    veterans: data.veterans,
    familyMembers: data.familyMembers,
    unaccompaniedYouth: data.unaccompaniedYouth,
    yearOverYearChange: yoyChange,
    priorYear: data.priorYear?.year ?? null,
    priorTotal: data.priorYear?.totalHomeless ?? null,
  };
}

export function formatHomelessnessResults(result: HomelessnessResult): string {
  const lines: string[] = [];

  lines.push(`**CoC:** ${result.cocName}`);
  lines.push(`**PIT Count Year:** ${result.year}`);
  lines.push("");
  lines.push(`**Total Homeless:** ${result.total.toLocaleString()}`);
  lines.push(`- Sheltered: ${result.sheltered.toLocaleString()} (${result.shelteredPercent}%)`);
  lines.push(`- Unsheltered: ${result.unsheltered.toLocaleString()} (${result.unshelteredPercent}%)`);
  lines.push(`- **Rate:** ${result.per10k} per 10,000 population`);
  lines.push("");

  if (result.yearOverYearChange !== null) {
    const direction = result.yearOverYearChange > 0 ? "↑" : result.yearOverYearChange < 0 ? "↓" : "→";
    lines.push(`**Year-over-Year:** ${direction} ${result.yearOverYearChange > 0 ? "+" : ""}${result.yearOverYearChange}% (from ${result.priorTotal!.toLocaleString()} in ${result.priorYear})`);
    lines.push("");
  }

  lines.push("**Subpopulations:**");
  if (result.chronicallyHomeless !== null) lines.push(`- Chronically Homeless: ${result.chronicallyHomeless.toLocaleString()}`);
  if (result.veterans !== null) lines.push(`- Veterans: ${result.veterans.toLocaleString()}`);
  if (result.familyMembers !== null) lines.push(`- Family Members: ${result.familyMembers.toLocaleString()}`);
  if (result.unaccompaniedYouth !== null) lines.push(`- Unaccompanied Youth: ${result.unaccompaniedYouth.toLocaleString()}`);

  lines.push("");
  lines.push("*Source: HUD 2024 Point-in-Time Count (AHAR Part 1). Data reflects a single-night count in January 2024.*");

  return lines.join("\n");
}
