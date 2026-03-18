/**
 * Education Data API Client — School Districts & Finance
 *
 * Uses the Urban Institute's Education Data Portal API to fetch
 * school district directory info (enrollment, schools, student-teacher ratio)
 * and finance data (revenue breakdown, per-pupil spending).
 *
 * API docs: https://educationdata.urban.org/documentation/
 * No API key required.
 *
 * Data is fetched by state FIPS + county name, returning all districts
 * in a city's primary county.
 */

import { resolveCity as geoResolve } from "./geo-resolver.js";

const BASE_URL = "https://educationdata.urban.org/api/v1";
const DATA_YEAR = 2022; // Most recent complete year (education data lags)

// City → county mapping for district lookups
// countyFips is the full county FIPS code (state + county) used by the Education Data API
const CITY_COUNTIES: Record<string, { name: string; stateFips: string; countyName: string; countyFips: string }> = {
  "new york": { name: "New York City", stateFips: "36", countyName: "New York", countyFips: "36061" },
  "nyc": { name: "New York City", stateFips: "36", countyName: "New York", countyFips: "36061" },
  "los angeles": { name: "Los Angeles", stateFips: "06", countyName: "Los Angeles", countyFips: "6037" },
  "la": { name: "Los Angeles", stateFips: "06", countyName: "Los Angeles", countyFips: "6037" },
  "chicago": { name: "Chicago", stateFips: "17", countyName: "Cook", countyFips: "17031" },
  "houston": { name: "Houston", stateFips: "48", countyName: "Harris", countyFips: "48201" },
  "phoenix": { name: "Phoenix", stateFips: "04", countyName: "Maricopa", countyFips: "4013" },
  "philadelphia": { name: "Philadelphia", stateFips: "42", countyName: "Philadelphia", countyFips: "42101" },
  "philly": { name: "Philadelphia", stateFips: "42", countyName: "Philadelphia", countyFips: "42101" },
  "san antonio": { name: "San Antonio", stateFips: "48", countyName: "Bexar", countyFips: "48029" },
  "san diego": { name: "San Diego", stateFips: "06", countyName: "San Diego", countyFips: "6073" },
  "dallas": { name: "Dallas", stateFips: "48", countyName: "Dallas", countyFips: "48113" },
  "austin": { name: "Austin", stateFips: "48", countyName: "Travis", countyFips: "48453" },
  "san jose": { name: "San Jose", stateFips: "06", countyName: "Santa Clara", countyFips: "6085" },
  "jacksonville": { name: "Jacksonville", stateFips: "12", countyName: "Duval", countyFips: "12031" },
  "columbus": { name: "Columbus", stateFips: "39", countyName: "Franklin", countyFips: "39049" },
  "indianapolis": { name: "Indianapolis", stateFips: "18", countyName: "Marion", countyFips: "18097" },
  "indy": { name: "Indianapolis", stateFips: "18", countyName: "Marion", countyFips: "18097" },
  "san francisco": { name: "San Francisco", stateFips: "06", countyName: "San Francisco", countyFips: "6075" },
  "sf": { name: "San Francisco", stateFips: "06", countyName: "San Francisco", countyFips: "6075" },
  "seattle": { name: "Seattle", stateFips: "53", countyName: "King", countyFips: "53033" },
  "denver": { name: "Denver", stateFips: "08", countyName: "Denver", countyFips: "8031" },
  "nashville": { name: "Nashville", stateFips: "47", countyName: "Davidson", countyFips: "47037" },
  "portland": { name: "Portland", stateFips: "41", countyName: "Multnomah", countyFips: "41051" },
  "las vegas": { name: "Las Vegas", stateFips: "32", countyName: "Clark", countyFips: "32003" },
  "vegas": { name: "Las Vegas", stateFips: "32", countyName: "Clark", countyFips: "32003" },
  "memphis": { name: "Memphis", stateFips: "47", countyName: "Shelby", countyFips: "47157" },
  "louisville": { name: "Louisville", stateFips: "21", countyName: "Jefferson", countyFips: "21111" },
  "baltimore": { name: "Baltimore", stateFips: "24", countyName: "Baltimore", countyFips: "24510" },
  "milwaukee": { name: "Milwaukee", stateFips: "55", countyName: "Milwaukee", countyFips: "55079" },
  "albuquerque": { name: "Albuquerque", stateFips: "35", countyName: "Bernalillo", countyFips: "35001" },
  "tucson": { name: "Tucson", stateFips: "04", countyName: "Pima", countyFips: "4019" },
  "fresno": { name: "Fresno", stateFips: "06", countyName: "Fresno", countyFips: "6019" },
  "sacramento": { name: "Sacramento", stateFips: "06", countyName: "Sacramento", countyFips: "6067" },
  "kansas city": { name: "Kansas City", stateFips: "29", countyName: "Jackson", countyFips: "29095" },
  "kc": { name: "Kansas City", stateFips: "29", countyName: "Jackson", countyFips: "29095" },
  "atlanta": { name: "Atlanta", stateFips: "13", countyName: "Fulton", countyFips: "13121" },
  "omaha": { name: "Omaha", stateFips: "31", countyName: "Douglas", countyFips: "31055" },
  "raleigh": { name: "Raleigh", stateFips: "37", countyName: "Wake", countyFips: "37183" },
  "miami": { name: "Miami", stateFips: "12", countyName: "Miami-Dade", countyFips: "12086" },
  "minneapolis": { name: "Minneapolis", stateFips: "27", countyName: "Hennepin", countyFips: "27053" },
  "tampa": { name: "Tampa", stateFips: "12", countyName: "Hillsborough", countyFips: "12057" },
  "new orleans": { name: "New Orleans", stateFips: "22", countyName: "Orleans", countyFips: "22071" },
  "nola": { name: "New Orleans", stateFips: "22", countyName: "Orleans", countyFips: "22071" },
  "cleveland": { name: "Cleveland", stateFips: "39", countyName: "Cuyahoga", countyFips: "39035" },
  "pittsburgh": { name: "Pittsburgh", stateFips: "42", countyName: "Allegheny", countyFips: "42003" },
  "st. louis": { name: "St. Louis", stateFips: "29", countyName: "St. Louis", countyFips: "29510" },
  "st louis": { name: "St. Louis", stateFips: "29", countyName: "St. Louis", countyFips: "29510" },
  "cincinnati": { name: "Cincinnati", stateFips: "39", countyName: "Hamilton", countyFips: "39061" },
  "orlando": { name: "Orlando", stateFips: "12", countyName: "Orange", countyFips: "12095" },
  "salt lake city": { name: "Salt Lake City", stateFips: "49", countyName: "Salt Lake", countyFips: "49035" },
  "slc": { name: "Salt Lake City", stateFips: "49", countyName: "Salt Lake", countyFips: "49035" },
  "richmond": { name: "Richmond", stateFips: "51", countyName: "Richmond", countyFips: "51760" },
  "birmingham": { name: "Birmingham", stateFips: "01", countyName: "Jefferson", countyFips: "1073" },
  "buffalo": { name: "Buffalo", stateFips: "36", countyName: "Erie", countyFips: "36029" },
  "charlotte": { name: "Charlotte", stateFips: "37", countyName: "Mecklenburg", countyFips: "37119" },
  "boise": { name: "Boise", stateFips: "16", countyName: "Ada", countyFips: "16001" },
  "oklahoma city": { name: "Oklahoma City", stateFips: "40", countyName: "Oklahoma", countyFips: "40109" },
  "okc": { name: "Oklahoma City", stateFips: "40", countyName: "Oklahoma", countyFips: "40109" },
  "boston": { name: "Boston", stateFips: "25", countyName: "Suffolk", countyFips: "25025" },
  "washington": { name: "Washington, D.C.", stateFips: "11", countyName: "District of Columbia", countyFips: "11001" },
  "washington dc": { name: "Washington, D.C.", stateFips: "11", countyName: "District of Columbia", countyFips: "11001" },
  "dc": { name: "Washington, D.C.", stateFips: "11", countyName: "District of Columbia", countyFips: "11001" },
  "detroit": { name: "Detroit", stateFips: "26", countyName: "Wayne", countyFips: "26163" },
  "virginia beach": { name: "Virginia Beach", stateFips: "51", countyName: "Virginia Beach", countyFips: "51810" },
};

export interface SchoolResult {
  city: string;
  county: string;
  year: number;
  districts: Array<{
    name: string;
    enrollment: number | null;
    numSchools: number | null;
    studentTeacherRatio: number | null;
  }>;
  finance: {
    totalRevenue: number | null;
    federalRevenue: number | null;
    stateRevenue: number | null;
    localRevenue: number | null;
    perPupilSpending: number | null;
    instructionalSpending: number | null;
  } | null;
  totalEnrollment: number;
  totalSchools: number;
}

interface DirectoryRecord {
  lea_name?: string;
  enrollment?: number;
  number_of_schools?: number;
  teachers_fte?: number;
  // The API may return fields with different casing or naming
  [key: string]: unknown;
}

interface FinanceRecord {
  lea_name?: string;
  rev_total?: number;
  rev_fed_total?: number;
  rev_state_total?: number;
  rev_local_total?: number;
  exp_current_total?: number;
  exp_current_instruction_total?: number;
  enrollment_fall_responsible?: number;
  [key: string]: unknown;
}

/**
 * Resolve a city name to its county mapping.
 * Falls back to the shared geo-resolver for cities not in the hardcoded map.
 */
async function resolveCity(input: string): Promise<{ name: string; stateFips: string; countyName: string; countyFips: string } | null> {
  const normalized = input.toLowerCase().trim();
  let match = CITY_COUNTIES[normalized] || null;

  if (!match) {
    try {
      const geo = await geoResolve(input);
      // Build county FIPS from state + county codes
      const cFips = `${parseInt(geo.stateFips, 10)}${geo.countyFips || "000"}`;
      match = {
        name: geo.city,
        stateFips: geo.stateFips,
        countyName: geo.countyName,
        countyFips: cFips,
      };
    } catch {
      // geo-resolver failed
    }
  }

  return match;
}

/**
 * Fetch JSON from the Education Data API with error handling.
 */
async function fetchEdData<T>(endpoint: string): Promise<T[]> {
  const url = `${BASE_URL}${endpoint}`;
  console.error(`[city-data-mcp] Education Data API: ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    console.error(`[city-data-mcp] Education Data API fetch error: ${err}`);
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    console.error(`[city-data-mcp] Education Data API error (${response.status}): ${errorText.slice(0, 200)}`);
    return [];
  }

  const body = await response.json();

  // The API wraps results in a { results: [...] } envelope
  if (body && Array.isArray(body.results)) {
    return body.results as T[];
  }

  // Some endpoints return a bare array
  if (Array.isArray(body)) {
    return body as T[];
  }

  return [];
}

/**
 * Fetch school district directory data for a city's county.
 */
async function fetchDirectoryData(
  stateFips: string,
  countyFips: string,
): Promise<DirectoryRecord[]> {
  // The Education Data API uses 'fips' for state filter (no leading zeros)
  // Then we filter client-side by county_code
  const endpoint = `/school-districts/ccd/directory/${DATA_YEAR}/?fips=${parseInt(stateFips, 10)}`;
  const allDistricts = await fetchEdData<DirectoryRecord>(endpoint);
  // Filter to matching county — county_code is full FIPS (state + county, e.g. 8031 for Denver)
  return allDistricts.filter((d) => String(d.county_code) === countyFips);
}

/**
 * Fetch school district finance data for a city's county.
 */
async function fetchFinanceData(
  stateFips: string,
  countyFips: string,
): Promise<FinanceRecord[]> {
  const endpoint = `/school-districts/ccd/finance/${DATA_YEAR}/?fips=${parseInt(stateFips, 10)}`;
  const allFinance = await fetchEdData<FinanceRecord>(endpoint);
  return allFinance.filter((f) => String(f.county_code) === countyFips);
}

/**
 * Safely parse a numeric value, returning null for missing/invalid data.
 */
function safeNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "" || val === -1 || val === -2 || val === -9) {
    return null; // Education data uses negative codes for missing/suppressed
  }
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Sum an array of nullable numbers, returning 0 if all are null.
 */
function safeSum(values: (number | null)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Query school district data for a city.
 */
export async function querySchools(city: string): Promise<SchoolResult> {
  const cityInfo = await resolveCity(city);
  if (!cityInfo) {
    throw new Error(
      `City "${city}" not found. Use listSchoolCities() to see supported cities.`,
    );
  }

  // Fetch directory and finance data in parallel
  const [directoryData, financeData] = await Promise.all([
    fetchDirectoryData(cityInfo.stateFips, cityInfo.countyFips),
    fetchFinanceData(cityInfo.stateFips, cityInfo.countyFips),
  ]);

  // Process directory data into districts
  const districts = directoryData
    .filter((d) => d.lea_name) // Filter out records without a name
    .map((d) => {
      const enrollment = safeNum(d.enrollment);
      const numSchools = safeNum(d.number_of_schools);
      const teachersFte = safeNum(d.teachers_fte);
      const studentTeacherRatio =
        enrollment !== null && teachersFte !== null && teachersFte > 0
          ? Math.round((enrollment / teachersFte) * 10) / 10
          : null;

      return {
        name: String(d.lea_name),
        enrollment,
        numSchools,
        studentTeacherRatio,
      };
    })
    // Sort by enrollment descending (largest districts first)
    .sort((a, b) => (b.enrollment ?? 0) - (a.enrollment ?? 0));

  // Aggregate finance data across all districts in the county
  let finance: SchoolResult["finance"] = null;
  if (financeData.length > 0) {
    const totalRevenue = safeSum(financeData.map((f) => safeNum(f.rev_total)));
    const federalRevenue = safeSum(financeData.map((f) => safeNum(f.rev_fed_total)));
    const stateRevenue = safeSum(financeData.map((f) => safeNum(f.rev_state_total)));
    const localRevenue = safeSum(financeData.map((f) => safeNum(f.rev_local_total)));
    const totalExpenditure = safeSum(financeData.map((f) => safeNum(f.exp_current_total)));
    const instructionalSpending = safeSum(
      financeData.map((f) => safeNum(f.exp_current_instruction_total)),
    );
    const totalFinanceEnrollment = safeSum(
      financeData.map((f) => safeNum(f.enrollment_fall_responsible)),
    );

    const perPupilSpending =
      totalExpenditure > 0 && totalFinanceEnrollment > 0
        ? Math.round(totalExpenditure / totalFinanceEnrollment)
        : null;

    finance = {
      totalRevenue: totalRevenue > 0 ? totalRevenue : null,
      federalRevenue: federalRevenue > 0 ? federalRevenue : null,
      stateRevenue: stateRevenue > 0 ? stateRevenue : null,
      localRevenue: localRevenue > 0 ? localRevenue : null,
      perPupilSpending,
      instructionalSpending: instructionalSpending > 0 ? instructionalSpending : null,
    };
  }

  const totalEnrollment = safeSum(districts.map((d) => d.enrollment));
  const totalSchools = safeSum(districts.map((d) => d.numSchools));

  return {
    city: cityInfo.name,
    county: cityInfo.countyName,
    year: DATA_YEAR,
    districts,
    finance,
    totalEnrollment,
    totalSchools,
  };
}

/**
 * Format school results into readable text for Claude.
 */
export function formatSchoolResults(result: SchoolResult): string {
  const fmtNum = (n: number | null): string => {
    if (n === null) return "N/A";
    return n.toLocaleString();
  };

  const fmtDollar = (n: number | null): string => {
    if (n === null) return "N/A";
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  let output = `**${result.city}** (${result.county} County) — Education Data (${result.year})

**County Overview**
  - Total Districts: ${result.districts.length}
  - Total Enrollment: ${fmtNum(result.totalEnrollment)}
  - Total Schools: ${fmtNum(result.totalSchools)}`;

  if (result.finance) {
    output += `

**School Finance (County Aggregate)**
  - Total Revenue: ${fmtDollar(result.finance.totalRevenue)}
  - Federal Revenue: ${fmtDollar(result.finance.federalRevenue)}
  - State Revenue: ${fmtDollar(result.finance.stateRevenue)}
  - Local Revenue: ${fmtDollar(result.finance.localRevenue)}
  - Per-Pupil Spending: ${fmtDollar(result.finance.perPupilSpending)}
  - Instructional Spending: ${fmtDollar(result.finance.instructionalSpending)}`;
  }

  // Show top districts (up to 10)
  const topDistricts = result.districts.slice(0, 10);
  if (topDistricts.length > 0) {
    output += `

**Largest Districts** (by enrollment)`;
    for (const d of topDistricts) {
      const ratio = d.studentTeacherRatio !== null ? `, ${d.studentTeacherRatio}:1 student-teacher` : "";
      const schools = d.numSchools !== null ? `, ${d.numSchools} schools` : "";
      output += `\n  - ${d.name}: ${fmtNum(d.enrollment)} enrolled${schools}${ratio}`;
    }

    if (result.districts.length > 10) {
      output += `\n  - ... and ${result.districts.length - 10} more districts`;
    }
  }

  return output;
}

/**
 * List all supported cities for school data queries.
 */
export function listSchoolCities(): Array<{ key: string; name: string; county: string }> {
  // Deduplicate by name (aliases map to same city)
  const seen = new Set<string>();
  const cities: Array<{ key: string; name: string; county: string }> = [];

  for (const [key, info] of Object.entries(CITY_COUNTIES)) {
    const dedup = `${info.stateFips}_${info.countyName}`;
    if (!seen.has(dedup)) {
      seen.add(dedup);
      cities.push({ key, name: info.name, county: info.countyName });
    }
  }

  return cities.sort((a, b) => a.name.localeCompare(b.name));
}
