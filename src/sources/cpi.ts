/**
 * BLS Consumer Price Index (CPI) — Cost of Living by Metro Area
 *
 * CPI measures the average change in prices paid by urban consumers for goods
 * and services. BLS publishes CPI for ~20 metro areas (plus regional averages).
 *
 * Series ID format: CUURS{area_code}SA0 (all items, seasonally adjusted)
 * Area codes: https://www.bls.gov/cpi/additional-resources/geographic-sample.htm
 *
 * Uses same BLS API v2 as employment data.
 * Rate limit: 25 queries/day without key, 500/day with BLS_API_KEY.
 */

const BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

interface MetroCpiConfig {
  name: string;
  allItems: string;     // CPI All Items (SA0)
  food: string;         // CPI Food (SAF1)
  housing: string;      // CPI Housing (SAH1)
  transportation: string; // CPI Transportation (SAT)
  medical: string;      // CPI Medical Care (SAM)
  energy: string;       // CPI Energy (SAE)
}

// BLS CPI metro area codes and series IDs
// Format: CUURS{area_code}{item_code}
// Area codes from BLS Geographic Sample
const METRO_CPI: Record<string, MetroCpiConfig> = {
  nyc: {
    name: "New York-Newark-Jersey City",
    allItems: "CUURS12ASA0",
    food: "CUURS12ASAF1",
    housing: "CUURS12ASAH1",
    transportation: "CUURS12ASAT",
    medical: "CUURS12ASAM",
    energy: "CUURS12ASAE",
  },
  la: {
    name: "Los Angeles-Long Beach-Anaheim",
    allItems: "CUURS49ASA0",
    food: "CUURS49ASAF1",
    housing: "CUURS49ASAH1",
    transportation: "CUURS49ASAT",
    medical: "CUURS49ASAM",
    energy: "CUURS49ASAE",
  },
  chicago: {
    name: "Chicago-Naperville-Elgin",
    allItems: "CUURS23ASA0",
    food: "CUURS23ASAF1",
    housing: "CUURS23ASAH1",
    transportation: "CUURS23ASAT",
    medical: "CUURS23ASAM",
    energy: "CUURS23ASAE",
  },
  houston: {
    name: "Houston-The Woodlands-Sugar Land",
    allItems: "CUURS37ASA0",
    food: "CUURS37ASAF1",
    housing: "CUURS37ASAH1",
    transportation: "CUURS37ASAT",
    medical: "CUURS37ASAM",
    energy: "CUURS37ASAE",
  },
  phoenix: {
    name: "Phoenix-Mesa-Chandler",
    allItems: "CUURS48ASA0",
    food: "CUURS48ASAF1",
    housing: "CUURS48ASAH1",
    transportation: "CUURS48ASAT",
    medical: "CUURS48ASAM",
    energy: "CUURS48ASAE",
  },
  dallas: {
    name: "Dallas-Fort Worth-Arlington",
    allItems: "CUURS37BSA0",
    food: "CUURS37BSAF1",
    housing: "CUURS37BSAH1",
    transportation: "CUURS37BSAT",
    medical: "CUURS37BSAM",
    energy: "CUURS37BSAE",
  },
  philadelphia: {
    name: "Philadelphia-Camden-Wilmington",
    allItems: "CUURS12BSA0",
    food: "CUURS12BSAF1",
    housing: "CUURS12BSAH1",
    transportation: "CUURS12BSAT",
    medical: "CUURS12BSAM",
    energy: "CUURS12BSAE",
  },
  sf: {
    name: "San Francisco-Oakland-Berkeley",
    allItems: "CUURS49BSA0",
    food: "CUURS49BSAF1",
    housing: "CUURS49BSAH1",
    transportation: "CUURS49BSAT",
    medical: "CUURS49BSAM",
    energy: "CUURS49BSAE",
  },
  atlanta: {
    name: "Atlanta-Sandy Springs-Alpharetta",
    allItems: "CUURS35ASA0",
    food: "CUURS35ASAF1",
    housing: "CUURS35ASAH1",
    transportation: "CUURS35ASAT",
    medical: "CUURS35ASAM",
    energy: "CUURS35ASAE",
  },
  boston: {
    name: "Boston-Cambridge-Newton",
    allItems: "CUURS11ASA0",
    food: "CUURS11ASAF1",
    housing: "CUURS11ASAH1",
    transportation: "CUURS11ASAT",
    medical: "CUURS11ASAM",
    energy: "CUURS11ASAE",
  },
  miami: {
    name: "Miami-Fort Lauderdale-West Palm Beach",
    allItems: "CUURS35BSA0",
    food: "CUURS35BSAF1",
    housing: "CUURS35BSAH1",
    transportation: "CUURS35BSAT",
    medical: "CUURS35BSAM",
    energy: "CUURS35BSAE",
  },
  seattle: {
    name: "Seattle-Tacoma-Bellevue",
    allItems: "CUURS49DSA0",
    food: "CUURS49DSAF1",
    housing: "CUURS49DSAH1",
    transportation: "CUURS49DSAT",
    medical: "CUURS49DSAM",
    energy: "CUURS49DSAE",
  },
  denver: {
    name: "Denver-Aurora-Lakewood",
    allItems: "CUURS48BSA0",
    food: "CUURS48BSAF1",
    housing: "CUURS48BSAH1",
    transportation: "CUURS48BSAT",
    medical: "CUURS48BSAM",
    energy: "CUURS48BSAE",
  },
  minneapolis: {
    name: "Minneapolis-St. Paul-Bloomington",
    allItems: "CUURS24ASA0",
    food: "CUURS24ASAF1",
    housing: "CUURS24ASAH1",
    transportation: "CUURS24ASAT",
    medical: "CUURS24ASAM",
    energy: "CUURS24ASAE",
  },
  stlouis: {
    name: "St. Louis",
    allItems: "CUURS24BSA0",
    food: "CUURS24BSAF1",
    housing: "CUURS24BSAH1",
    transportation: "CUURS24BSAT",
    medical: "CUURS24BSAM",
    energy: "CUURS24BSAE",
  },
  portland: {
    name: "Portland-Salem",
    allItems: "CUURS49CSA0",
    food: "CUURS49CSAF1",
    housing: "CUURS49CSAH1",
    transportation: "CUURS49CSAT",
    medical: "CUURS49CSAM",
    energy: "CUURS49CSAE",
  },
  baltimore: {
    name: "Baltimore-Columbia-Towson",
    allItems: "CUURS35ESA0",
    food: "CUURS35ESAF1",
    housing: "CUURS35ESAH1",
    transportation: "CUURS35ESAT",
    medical: "CUURS35ESAM",
    energy: "CUURS35ESAE",
  },
};

// Aliases for resolving city names
const ALIASES: Record<string, string> = {
  "new york": "nyc", "ny": "nyc",
  "los angeles": "la",
  "san francisco": "sf", "san fran": "sf",
  "atlanta": "atlanta", "atl": "atlanta",
  "boston": "boston",
  "miami": "miami",
  "seattle": "seattle",
  "denver": "denver",
  "minneapolis": "minneapolis", "mpls": "minneapolis",
  "portland": "portland", "pdx": "portland",
  "baltimore": "baltimore",
  "houston": "houston",
  "phoenix": "phoenix",
  "dallas": "dallas",
  "philadelphia": "philadelphia", "philly": "philadelphia",
  "chicago": "chicago",
  "st. louis": "stlouis", "st louis": "stlouis", "saint louis": "stlouis",
};

function resolveCpiCity(input: string): { key: string; config: MetroCpiConfig } | undefined {
  const lower = input.toLowerCase().trim();
  const key = ALIASES[lower] || lower;
  const config = METRO_CPI[key];
  return config ? { key, config } : undefined;
}

export function listCpiCities() {
  return Object.entries(METRO_CPI).map(([key, config]) => ({
    key,
    name: config.name,
  }));
}

interface BlsDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

export interface CpiCategoryData {
  name: string;
  latestValue: number;
  latestPeriod: string;
  yearAgoValue: number | null;
  yearOverYearChange: number | null; // percent change
}

export interface CpiResult {
  city: string;
  metroName: string;
  allItems: CpiCategoryData;
  categories: CpiCategoryData[];
  monthly: Array<{ date: string; value: number }>; // for charting
}

export async function queryCpi(cityInput: string): Promise<CpiResult> {
  const match = resolveCpiCity(cityInput);
  if (!match) {
    const available = listCpiCities().map(c => c.name).join(", ");
    throw new Error(`CPI data not available for "${cityInput}". Available metros: ${available}`);
  }

  const { config } = match;
  const apiKey = process.env.BLS_API_KEY;
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;

  const seriesIds = [
    config.allItems, config.food, config.housing,
    config.transportation, config.medical, config.energy,
  ];

  const body: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(currentYear),
  };

  if (apiKey) {
    body.registrationkey = apiKey;
  }

  console.error(`[city-data-mcp] CPI: Fetching ${config.name} (${startYear}-${currentYear})`);

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`BLS CPI API error (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    status: string;
    message: string[];
    Results: {
      series: Array<{
        seriesID: string;
        data: BlsDataPoint[];
      }>;
    };
  };

  if (data.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS CPI API error: ${data.message.join(", ")}`);
  }

  const seriesMap: Record<string, BlsDataPoint[]> = {};
  for (const series of data.Results.series) {
    seriesMap[series.seriesID] = series.data;
  }

  function buildCategory(name: string, seriesId: string): CpiCategoryData {
    const points = seriesMap[seriesId] || [];
    // BLS returns data newest first, monthly periods M01-M12
    const monthlyPoints = points.filter(p => p.period.startsWith("M") && p.period !== "M13");

    if (monthlyPoints.length === 0) {
      return { name, latestValue: 0, latestPeriod: "N/A", yearAgoValue: null, yearOverYearChange: null };
    }

    const latest = monthlyPoints[0];
    const latestValue = parseFloat(latest.value);
    const latestPeriod = `${latest.year}-${latest.period.replace("M", "")}`;

    // Find same month one year ago
    const yearAgoPoint = monthlyPoints.find(
      p => parseInt(p.year) === parseInt(latest.year) - 1 && p.period === latest.period
    );
    const yearAgoValue = yearAgoPoint ? parseFloat(yearAgoPoint.value) : null;
    const yoyChange = yearAgoValue
      ? Math.round(((latestValue - yearAgoValue) / yearAgoValue) * 1000) / 10
      : null;

    return { name, latestValue, latestPeriod, yearAgoValue, yearOverYearChange: yoyChange };
  }

  const allItems = buildCategory("All Items", config.allItems);

  // Build monthly series for charting (All Items)
  const allItemsPoints = seriesMap[config.allItems] || [];
  const monthly = allItemsPoints
    .filter(p => p.period.startsWith("M") && p.period !== "M13")
    .map(p => ({
      date: `${p.year}-${p.period.replace("M", "").padStart(2, "0")}`,
      value: parseFloat(p.value),
    }))
    .reverse(); // oldest first for charting

  return {
    city: config.name.split("-")[0].trim(),
    metroName: config.name,
    allItems,
    categories: [
      buildCategory("Food", config.food),
      buildCategory("Housing", config.housing),
      buildCategory("Transportation", config.transportation),
      buildCategory("Medical Care", config.medical),
      buildCategory("Energy", config.energy),
    ],
    monthly,
  };
}

export function formatCpiResults(result: CpiResult): string {
  const lines: string[] = [];

  lines.push(`**Metro Area:** ${result.metroName}`);
  lines.push(`**CPI All Items:** ${result.allItems.latestValue.toFixed(1)} (${result.allItems.latestPeriod})`);
  if (result.allItems.yearOverYearChange !== null) {
    const dir = result.allItems.yearOverYearChange > 0 ? "↑" : "↓";
    lines.push(`**Year-over-Year Inflation:** ${dir} ${result.allItems.yearOverYearChange}%`);
  }
  lines.push("");

  lines.push("**By Category:**");
  for (const cat of result.categories) {
    const yoy = cat.yearOverYearChange !== null ? ` (${cat.yearOverYearChange > 0 ? "+" : ""}${cat.yearOverYearChange}% YoY)` : "";
    lines.push(`- **${cat.name}:** ${cat.latestValue.toFixed(1)}${yoy}`);
  }
  lines.push("");

  lines.push("*Source: Bureau of Labor Statistics, Consumer Price Index. Base period 1982-84=100.*");

  return lines.join("\n");
}
