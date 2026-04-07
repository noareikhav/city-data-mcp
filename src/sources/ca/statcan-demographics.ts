/**
 * Statistics Canada Census Profile — Demographics
 *
 * Uses hardcoded 2021 Census data for ~40 major Canadian cities.
 * Falls back to StatCan Census Profile web scraper for others.
 *
 * Source: Statistics Canada, 2021 Census of Population
 */

import type { UnifiedGeoResolution } from "../../types.js";
import { fetchWithTimeout } from "../../geo/us-resolver.js";

export interface StatCanDemographicsResult {
  city: string;
  province: string;
  population: number | null;
  medianAge: number | null;
  medianIncome: number | null;
  averageIncome: number | null;
  households: number | null;
  averageHouseholdSize: number | null;
  immigrantPopulation: number | null;
  bachelorsDegreeRate: number | null;
  unemploymentRate: number | null;
  medianHomeValue: number | null;
  populationGrowth5yr: number | null;
}

// ── 2021 Census Data for Major Canadian CMAs ──────────────────────────────
// Source: Statistics Canada Census Profile, 2021 Census
// Using CMA-level data (Census Metropolitan Areas)

interface CensusEntry {
  population: number;
  popGrowth: number;   // % change 2016-2021
  medianAge: number;
  medianIncome: number;
  avgIncome: number;
  households: number;
  avgHHSize: number;
  immigrants: number;
  bachelorsRate: number;  // % with bachelor's or higher
  unemploymentRate: number;
  medianHomeValue: number;
}

const CENSUS_2021: Record<string, CensusEntry> = {
  "toronto": { population: 6202225, popGrowth: 4.6, medianAge: 39.3, medianIncome: 37200, avgIncome: 49000, households: 2262710, avgHHSize: 2.7, immigrants: 2537410, bachelorsRate: 38.2, unemploymentRate: 9.6, medianHomeValue: 900000 },
  "montreal": { population: 4291732, popGrowth: 3.4, medianAge: 39.9, medianIncome: 34200, avgIncome: 43200, households: 1855705, avgHHSize: 2.3, immigrants: 1053365, bachelorsRate: 31.8, unemploymentRate: 8.2, medianHomeValue: 405000 },
  "vancouver": { population: 2642825, popGrowth: 7.3, medianAge: 40.2, medianIncome: 36000, avgIncome: 47600, households: 1043225, avgHHSize: 2.5, immigrants: 1088635, bachelorsRate: 35.6, unemploymentRate: 8.4, medianHomeValue: 1100000 },
  "calgary": { population: 1481806, popGrowth: 5.5, medianAge: 37.0, medianIncome: 42400, avgIncome: 55600, households: 549590, avgHHSize: 2.6, immigrants: 451560, bachelorsRate: 33.5, unemploymentRate: 10.7, medianHomeValue: 475000 },
  "edmonton": { population: 1418118, popGrowth: 6.5, medianAge: 37.1, medianIncome: 40800, avgIncome: 52800, households: 529785, avgHHSize: 2.6, immigrants: 387475, bachelorsRate: 28.9, unemploymentRate: 10.2, medianHomeValue: 380000 },
  "ottawa": { population: 1488307, popGrowth: 5.8, medianAge: 40.1, medianIncome: 44400, avgIncome: 55200, households: 571075, avgHHSize: 2.5, immigrants: 355680, bachelorsRate: 42.1, unemploymentRate: 7.4, medianHomeValue: 500000 },
  "winnipeg": { population: 834678, popGrowth: 6.0, medianAge: 38.3, medianIncome: 35600, avgIncome: 44800, households: 320490, avgHHSize: 2.5, immigrants: 194860, bachelorsRate: 26.4, unemploymentRate: 8.0, medianHomeValue: 310000 },
  "quebec city": { population: 839311, popGrowth: 4.7, medianAge: 43.1, medianIncome: 36800, avgIncome: 44400, households: 371580, avgHHSize: 2.2, immigrants: 52625, bachelorsRate: 29.5, unemploymentRate: 5.2, medianHomeValue: 290000 },
  "hamilton": { population: 785184, popGrowth: 6.0, medianAge: 41.2, medianIncome: 37200, avgIncome: 47200, households: 296735, avgHHSize: 2.5, immigrants: 184790, bachelorsRate: 28.3, unemploymentRate: 8.3, medianHomeValue: 580000 },
  "kitchener": { population: 575847, popGrowth: 9.1, medianAge: 38.1, medianIncome: 38800, avgIncome: 48800, households: 213860, avgHHSize: 2.6, immigrants: 132395, bachelorsRate: 28.1, unemploymentRate: 8.0, medianHomeValue: 550000 },
  "halifax": { population: 465703, popGrowth: 9.1, medianAge: 39.7, medianIncome: 36400, avgIncome: 45600, households: 184125, avgHHSize: 2.4, immigrants: 51790, bachelorsRate: 32.8, unemploymentRate: 8.6, medianHomeValue: 340000 },
  "victoria": { population: 397237, popGrowth: 8.0, medianAge: 43.7, medianIncome: 38000, avgIncome: 48000, households: 163610, avgHHSize: 2.3, immigrants: 68965, bachelorsRate: 36.5, unemploymentRate: 7.1, medianHomeValue: 750000 },
  "oshawa": { population: 415311, popGrowth: 10.1, medianAge: 39.0, medianIncome: 40400, avgIncome: 49200, households: 150790, avgHHSize: 2.7, immigrants: 76015, bachelorsRate: 24.1, unemploymentRate: 8.0, medianHomeValue: 600000 },
  "windsor": { population: 422630, popGrowth: 6.1, medianAge: 41.3, medianIncome: 33200, avgIncome: 42400, households: 162225, avgHHSize: 2.5, immigrants: 90780, bachelorsRate: 22.4, unemploymentRate: 10.8, medianHomeValue: 310000 },
  "saskatoon": { population: 317480, popGrowth: 8.2, medianAge: 35.8, medianIncome: 38400, avgIncome: 48400, households: 122835, avgHHSize: 2.5, immigrants: 42130, bachelorsRate: 27.3, unemploymentRate: 8.2, medianHomeValue: 340000 },
  "regina": { population: 249431, popGrowth: 5.3, medianAge: 36.7, medianIncome: 40000, avgIncome: 49600, households: 96115, avgHHSize: 2.5, immigrants: 33745, bachelorsRate: 26.5, unemploymentRate: 7.4, medianHomeValue: 310000 },
  "st. john's": { population: 213751, popGrowth: 1.5, medianAge: 41.0, medianIncome: 37200, avgIncome: 46000, households: 83480, avgHHSize: 2.4, immigrants: 11335, bachelorsRate: 27.5, unemploymentRate: 9.8, medianHomeValue: 280000 },
  "barrie": { population: 212856, popGrowth: 10.9, medianAge: 38.8, medianIncome: 39600, avgIncome: 48000, households: 78775, avgHHSize: 2.6, immigrants: 33310, bachelorsRate: 24.5, unemploymentRate: 8.1, medianHomeValue: 560000 },
  "kelowna": { population: 222162, popGrowth: 14.0, medianAge: 43.5, medianIncome: 35200, avgIncome: 45200, households: 91130, avgHHSize: 2.3, immigrants: 33255, bachelorsRate: 27.0, unemploymentRate: 8.0, medianHomeValue: 620000 },
  "abbotsford": { population: 195725, popGrowth: 8.3, medianAge: 39.4, medianIncome: 34800, avgIncome: 44000, households: 70375, avgHHSize: 2.7, immigrants: 52850, bachelorsRate: 19.6, unemploymentRate: 8.5, medianHomeValue: 680000 },
  "kingston": { population: 172546, popGrowth: 5.3, medianAge: 42.2, medianIncome: 37200, avgIncome: 46800, households: 69575, avgHHSize: 2.3, immigrants: 22050, bachelorsRate: 34.2, unemploymentRate: 7.5, medianHomeValue: 410000 },
  "sudbury": { population: 166004, popGrowth: 0.5, medianAge: 42.6, medianIncome: 38000, avgIncome: 47200, households: 67435, avgHHSize: 2.3, immigrants: 8570, bachelorsRate: 23.1, unemploymentRate: 8.7, medianHomeValue: 290000 },
  "thunder bay": { population: 121621, popGrowth: -0.7, medianAge: 42.6, medianIncome: 36400, avgIncome: 45200, households: 50985, avgHHSize: 2.2, immigrants: 10190, bachelorsRate: 23.0, unemploymentRate: 8.5, medianHomeValue: 250000 },
  "moncton": { population: 157717, popGrowth: 8.8, medianAge: 41.0, medianIncome: 33600, avgIncome: 41600, households: 65075, avgHHSize: 2.3, immigrants: 11120, bachelorsRate: 23.3, unemploymentRate: 8.5, medianHomeValue: 230000 },
  "fredericton": { population: 106744, popGrowth: 5.8, medianAge: 40.0, medianIncome: 34400, avgIncome: 43200, households: 43090, avgHHSize: 2.3, immigrants: 9965, bachelorsRate: 30.5, unemploymentRate: 7.8, medianHomeValue: 225000 },
  "mississauga": { population: 717961, popGrowth: 1.5, medianAge: 39.5, medianIncome: 36000, avgIncome: 47200, households: 246605, avgHHSize: 2.9, immigrants: 389415, bachelorsRate: 36.0, unemploymentRate: 9.5, medianHomeValue: 850000 },
  "brampton": { population: 656480, popGrowth: 10.6, medianAge: 35.0, medianIncome: 33200, avgIncome: 42800, households: 195970, avgHHSize: 3.3, immigrants: 363590, bachelorsRate: 28.5, unemploymentRate: 11.2, medianHomeValue: 800000 },
  "surrey": { population: 568322, popGrowth: 8.7, medianAge: 38.2, medianIncome: 33600, avgIncome: 43200, households: 185120, avgHHSize: 3.0, immigrants: 259935, bachelorsRate: 25.8, unemploymentRate: 9.0, medianHomeValue: 950000 },
  "burnaby": { population: 249125, popGrowth: 3.8, medianAge: 40.5, medianIncome: 32400, avgIncome: 44000, households: 97475, avgHHSize: 2.5, immigrants: 130265, bachelorsRate: 33.0, unemploymentRate: 8.8, medianHomeValue: 980000 },
  "laval": { population: 438366, popGrowth: 5.4, medianAge: 40.5, medianIncome: 34800, avgIncome: 43600, households: 169685, avgHHSize: 2.5, immigrants: 117220, bachelorsRate: 24.5, unemploymentRate: 7.5, medianHomeValue: 420000 },
  "gatineau": { population: 291641, popGrowth: 6.2, medianAge: 38.8, medianIncome: 38800, avgIncome: 47600, households: 118085, avgHHSize: 2.4, immigrants: 38115, bachelorsRate: 28.0, unemploymentRate: 7.0, medianHomeValue: 320000 },
};

/**
 * Query StatCan demographics for a Canadian location.
 * Uses hardcoded 2021 Census data for major cities, falls back to API.
 */
export async function queryStatCanDemographics(geo: UnifiedGeoResolution): Promise<StatCanDemographicsResult> {
  const cityKey = geo.city.toLowerCase().trim();

  const result: StatCanDemographicsResult = {
    city: geo.city,
    province: geo.stateOrProvince || geo.provinceCode || "",
    population: null,
    medianAge: null,
    medianIncome: null,
    averageIncome: null,
    households: null,
    averageHouseholdSize: null,
    immigrantPopulation: null,
    bachelorsDegreeRate: null,
    unemploymentRate: null,
    medianHomeValue: null,
    populationGrowth5yr: null,
  };

  // Try hardcoded data first
  const census = CENSUS_2021[cityKey];
  if (census) {
    result.population = census.population;
    result.populationGrowth5yr = census.popGrowth;
    result.medianAge = census.medianAge;
    result.medianIncome = census.medianIncome;
    result.averageIncome = census.avgIncome;
    result.households = census.households;
    result.averageHouseholdSize = census.avgHHSize;
    result.immigrantPopulation = census.immigrants;
    result.bachelorsDegreeRate = census.bachelorsRate;
    result.unemploymentRate = census.unemploymentRate;
    result.medianHomeValue = census.medianHomeValue;
    return result;
  }

  // Fallback: Try StatCan population estimates API (Table 17-10-0142-01)
  const cdId = geo.censusDivisionId;
  if (cdId) {
    try {
      // Try the Census Profile SDMX-like endpoint for census divisions
      const dguid = `2021A0003${cdId}`;
      const url = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page_CSV.cfm?Lang=E&DGUIDlist=${dguid}&GENDERlist=1&STATISTIClist=1&HEADERlist=0`;
      // CSV parsing is complex — just try to get population from the response
      const response = await fetch(url, {
        headers: { Accept: "text/csv" },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (response?.ok) {
        const text = await response.text();
        // Parse first few rows for population
        const lines = text.split("\n");
        for (const line of lines.slice(1, 50)) {
          if (line.includes("Population, 2021")) {
            const parts = line.split(",");
            const val = parseFloat(parts[parts.length - 1]?.replace(/"/g, ""));
            if (!isNaN(val)) result.population = val;
          }
        }
      }
    } catch {
      // CSV fallback failed
    }
  }

  return result;
}

/**
 * Format StatCan demographics as markdown.
 */
export function formatStatCanResults(result: StatCanDemographicsResult): string {
  const fmt = (n: number | null, type: "number" | "dollar" | "percent" = "number"): string => {
    if (n === null) return "N/A";
    if (type === "dollar") return `$${n.toLocaleString()} CAD`;
    if (type === "percent") return `${n.toFixed(1)}%`;
    return n.toLocaleString();
  };

  const lines: string[] = [
    `## ${result.city}, ${result.province} — Demographics (StatCan)`,
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Population | ${fmt(result.population)} |`,
    `| Population Growth (5yr) | ${fmt(result.populationGrowth5yr, "percent")} |`,
    `| Median Age | ${fmt(result.medianAge)} |`,
    `| Median Total Income | ${fmt(result.medianIncome, "dollar")} |`,
    `| Average Total Income | ${fmt(result.averageIncome, "dollar")} |`,
    `| Households | ${fmt(result.households)} |`,
    `| Average Household Size | ${fmt(result.averageHouseholdSize)} |`,
    `| Immigrant Population | ${fmt(result.immigrantPopulation)} |`,
    `| Bachelor's Degree Rate | ${fmt(result.bachelorsDegreeRate, "percent")} |`,
    `| Unemployment Rate | ${fmt(result.unemploymentRate, "percent")} |`,
    `| Median Home Value | ${fmt(result.medianHomeValue, "dollar")} |`,
  ];

  lines.push("");
  lines.push("*Source: Statistics Canada — 2021 Census of Population*");
  lines.push("*Note: Income figures are in Canadian dollars. CMA-level data where available.*");
  return lines.join("\n");
}
