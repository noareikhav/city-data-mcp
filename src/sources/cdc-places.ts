/**
 * CDC PLACES: Local Data for Better Health
 *
 * Model-based estimates for 40+ health measures at the city/place level.
 * Data from Behavioral Risk Factor Surveillance System (BRFSS).
 * Free, no API key required. Uses Socrata SODA API at data.cdc.gov.
 *
 * Source: https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Place-Data-202/eav7-hnsx
 * 2025 release uses 2022/2023 BRFSS data. Covers 500+ US cities.
 */

// Socrata dataset ID for PLACES Place Data (2025 release)
const DATASET_ID = "eav7-hnsx";
const BASE_URL = `https://data.cdc.gov/resource/${DATASET_ID}.json`;

// Key measures to fetch (curated for civic dashboard relevance)
const KEY_MEASURES = [
  // Health Outcomes
  "OBESITY", "DIABETES", "DEPRESSION", "BPHIGH", "CASTHMA", "COPD",
  "CHD", "STROKE", "CANCER", "HIGHCHOL",
  // Health Risk Behaviors
  "BINGE", "CSMOKING", "LPA", "SLEEP",
  // Prevention
  "ACCESS2", "CHECKUP", "DENTAL",
  // Health Status
  "GHLTH", "MHLTH", "PHLTH",
  // Disabilities
  "DISABILITY",
  // Health-Related Social Needs
  "FOODINSECU", "HOUSINSECU", "LONELINESS", "EMOTIONSPT", "LACKTRPT",
];

interface PlacesApiRow {
  measureid: string;
  measure: string;
  data_value: string;
  data_value_type: string;
  category: string;
  locationname: string;
  stateabbr: string;
  low_confidence_limit: string;
  high_confidence_limit: string;
  totalpopulation: string;
}

export interface HealthMeasure {
  id: string;
  name: string;
  value: number;
  category: string;
  lowCI: number | null;
  highCI: number | null;
}

export interface PublicHealthResult {
  city: string;
  state: string;
  population: number | null;
  dataYear: string;
  measures: HealthMeasure[];
  // Convenient top-level summaries
  summary: {
    obesity: number | null;
    diabetes: number | null;
    depression: number | null;
    mentalDistress: number | null;
    physicalDistress: number | null;
    poorHealth: number | null;
    noInsurance: number | null;
    smoking: number | null;
    bingeDrinking: number | null;
    noExercise: number | null;
    shortSleep: number | null;
    foodInsecurity: number | null;
    housingInsecurity: number | null;
    loneliness: number | null;
    anyDisability: number | null;
  };
}

/**
 * Resolve city name variations for CDC PLACES query.
 * PLACES uses "city" as the locationname without state suffix usually.
 */
function resolvePlacesName(input: string): string {
  const aliases: Record<string, string> = {
    "nyc": "New York",
    "ny": "New York",
    "la": "Los Angeles",
    "sf": "San Francisco",
    "dc": "Washington",
    "philly": "Philadelphia",
    "vegas": "Las Vegas",
    "slc": "Salt Lake City",
    "mpls": "Minneapolis",
    "pdx": "Portland",
    "atl": "Atlanta",
    "nola": "New Orleans",
  };

  const lower = input.toLowerCase().trim();
  return aliases[lower] || input;
}

export async function queryPublicHealth(cityInput: string): Promise<PublicHealthResult> {
  const cityName = resolvePlacesName(cityInput);

  // Query CDC PLACES Socrata API — age-adjusted prevalence only
  const measureList = KEY_MEASURES.map(m => `'${m}'`).join(",");
  const url = `${BASE_URL}?$where=locationname='${encodeURIComponent(cityName)}'`
    + ` AND data_value_type='Age-adjusted prevalence'`
    + ` AND measureid in(${measureList})`
    + `&$limit=100`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CDC PLACES API error (${res.status}): ${await res.text()}`);
  }

  const rows: PlacesApiRow[] = await res.json();

  if (rows.length === 0) {
    // Try partial match
    const fuzzyUrl = `${BASE_URL}?$where=upper(locationname) like upper('%25${encodeURIComponent(cityName)}%25')`
      + ` AND data_value_type='Age-adjusted prevalence'`
      + ` AND measureid='OBESITY'`
      + `&$limit=5`;
    const fuzzyRes = await fetch(fuzzyUrl);
    const fuzzyRows: PlacesApiRow[] = fuzzyRes.ok ? await fuzzyRes.json() : [];

    if (fuzzyRows.length > 0) {
      const suggestions = fuzzyRows.map(r => `${r.locationname}, ${r.stateabbr}`).join("; ");
      throw new Error(`City "${cityInput}" not found exactly. Did you mean: ${suggestions}?`);
    }
    throw new Error(`No CDC PLACES data found for "${cityInput}". PLACES covers ~500 US cities.`);
  }

  // Build measures array
  const measures: HealthMeasure[] = rows.map(row => ({
    id: row.measureid,
    name: row.measure,
    value: parseFloat(row.data_value),
    category: row.category,
    lowCI: row.low_confidence_limit ? parseFloat(row.low_confidence_limit) : null,
    highCI: row.high_confidence_limit ? parseFloat(row.high_confidence_limit) : null,
  })).filter(m => !isNaN(m.value));

  // Helper to get a specific measure value
  const getValue = (id: string): number | null => {
    const m = measures.find(m => m.id === id);
    return m ? m.value : null;
  };

  return {
    city: rows[0].locationname,
    state: rows[0].stateabbr,
    population: rows[0].totalpopulation ? parseInt(rows[0].totalpopulation) : null,
    dataYear: "2022-2023 BRFSS",
    measures,
    summary: {
      obesity: getValue("OBESITY"),
      diabetes: getValue("DIABETES"),
      depression: getValue("DEPRESSION"),
      mentalDistress: getValue("MHLTH"),
      physicalDistress: getValue("PHLTH"),
      poorHealth: getValue("GHLTH"),
      noInsurance: getValue("ACCESS2"),
      smoking: getValue("CSMOKING"),
      bingeDrinking: getValue("BINGE"),
      noExercise: getValue("LPA"),
      shortSleep: getValue("SLEEP"),
      foodInsecurity: getValue("FOODINSECU"),
      housingInsecurity: getValue("HOUSINSECU"),
      loneliness: getValue("LONELINESS"),
      anyDisability: getValue("DISABILITY"),
    },
  };
}

export function formatPublicHealthResults(result: PublicHealthResult): string {
  const lines: string[] = [];
  const s = result.summary;

  lines.push(`**Data:** ${result.dataYear} (CDC PLACES 2025 release)`);
  if (result.population) lines.push(`**Population:** ${result.population.toLocaleString()}`);
  lines.push("");

  // Health Outcomes
  lines.push("## Health Outcomes");
  if (s.obesity !== null) lines.push(`- **Obesity:** ${s.obesity}%`);
  if (s.diabetes !== null) lines.push(`- **Diabetes:** ${s.diabetes}%`);
  if (s.depression !== null) lines.push(`- **Depression:** ${s.depression}%`);
  if (s.poorHealth !== null) lines.push(`- **Fair/Poor Health:** ${s.poorHealth}%`);
  if (s.mentalDistress !== null) lines.push(`- **Frequent Mental Distress:** ${s.mentalDistress}%`);
  if (s.physicalDistress !== null) lines.push(`- **Frequent Physical Distress:** ${s.physicalDistress}%`);

  const otherOutcomes = result.measures.filter(m =>
    m.category === "Health Outcomes" && !["OBESITY", "DIABETES", "DEPRESSION"].includes(m.id)
  );
  for (const m of otherOutcomes) {
    lines.push(`- ${m.name.split(" among")[0]}: ${m.value}%`);
  }
  lines.push("");

  // Risk Behaviors
  lines.push("## Health Risk Behaviors");
  if (s.smoking !== null) lines.push(`- **Smoking:** ${s.smoking}%`);
  if (s.bingeDrinking !== null) lines.push(`- **Binge Drinking:** ${s.bingeDrinking}%`);
  if (s.noExercise !== null) lines.push(`- **No Leisure-Time Exercise:** ${s.noExercise}%`);
  if (s.shortSleep !== null) lines.push(`- **Short Sleep (<7 hrs):** ${s.shortSleep}%`);
  lines.push("");

  // Prevention & Access
  lines.push("## Prevention & Access");
  if (s.noInsurance !== null) lines.push(`- **Uninsured (18-64):** ${s.noInsurance}%`);
  const prevention = result.measures.filter(m => m.category === "Prevention" && m.id !== "ACCESS2");
  for (const m of prevention) {
    lines.push(`- ${m.name.split(" among")[0]}: ${m.value}%`);
  }
  lines.push("");

  // Social Needs
  const socialNeeds = result.measures.filter(m => m.category === "Health-Related Social Needs");
  if (socialNeeds.length > 0) {
    lines.push("## Health-Related Social Needs");
    if (s.foodInsecurity !== null) lines.push(`- **Food Insecurity:** ${s.foodInsecurity}%`);
    if (s.housingInsecurity !== null) lines.push(`- **Housing Insecurity:** ${s.housingInsecurity}%`);
    if (s.loneliness !== null) lines.push(`- **Loneliness:** ${s.loneliness}%`);
    for (const m of socialNeeds) {
      if (!["FOODINSECU", "HOUSINSECU", "LONELINESS"].includes(m.id)) {
        lines.push(`- ${m.name.split(" among")[0]}: ${m.value}%`);
      }
    }
    lines.push("");
  }

  // Disability
  if (s.anyDisability !== null) {
    lines.push("## Disability");
    lines.push(`- **Any Disability:** ${s.anyDisability}%`);
    const disabilities = result.measures.filter(m => m.category === "Disability" && m.id !== "DISABILITY");
    for (const m of disabilities) {
      lines.push(`- ${m.name.split(" among")[0]}: ${m.value}%`);
    }
    lines.push("");
  }

  lines.push("*Source: CDC PLACES (Behavioral Risk Factor Surveillance System). All values are age-adjusted prevalence (%).*");

  return lines.join("\n");
}
