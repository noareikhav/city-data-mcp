/**
 * AirNow (EPA) API Client
 *
 * Provides current and forecast Air Quality Index (AQI) data.
 * AQI categories: Good (0-50), Moderate (51-100), Unhealthy for Sensitive (101-150),
 * Unhealthy (151-200), Very Unhealthy (201-300), Hazardous (301+).
 *
 * API key: Free at https://docs.airnowapi.org/account/request/
 * Set as AIRNOW_API_KEY environment variable.
 */

const BASE_URL = "https://www.airnowapi.org/aq";

// Zip codes for major cities (AirNow queries by zip)
const CITY_ZIPS: Record<string, { zip: string; name: string }> = {
  "new york": { zip: "10001", name: "New York City" },
  "nyc": { zip: "10001", name: "New York City" },
  "los angeles": { zip: "90001", name: "Los Angeles" },
  "la": { zip: "90001", name: "Los Angeles" },
  "chicago": { zip: "60601", name: "Chicago" },
  "houston": { zip: "77001", name: "Houston" },
  "phoenix": { zip: "85001", name: "Phoenix" },
  "philadelphia": { zip: "19101", name: "Philadelphia" },
  "philly": { zip: "19101", name: "Philadelphia" },
  "san antonio": { zip: "78201", name: "San Antonio" },
  "san diego": { zip: "92101", name: "San Diego" },
  "dallas": { zip: "75201", name: "Dallas" },
  "austin": { zip: "78701", name: "Austin" },
  "san francisco": { zip: "94102", name: "San Francisco" },
  "sf": { zip: "94102", name: "San Francisco" },
  "seattle": { zip: "98101", name: "Seattle" },
  "denver": { zip: "80201", name: "Denver" },
  "boston": { zip: "02101", name: "Boston" },
  "nashville": { zip: "37201", name: "Nashville" },
  "portland": { zip: "97201", name: "Portland" },
  "atlanta": { zip: "30301", name: "Atlanta" },
  "miami": { zip: "33101", name: "Miami" },
  "washington": { zip: "20001", name: "Washington, D.C." },
  "dc": { zip: "20001", name: "Washington, D.C." },
  "minneapolis": { zip: "55401", name: "Minneapolis" },
  "detroit": { zip: "48201", name: "Detroit" },
  "baltimore": { zip: "21201", name: "Baltimore" },
  "charlotte": { zip: "28201", name: "Charlotte" },
  "pittsburgh": { zip: "15201", name: "Pittsburgh" },
  "las vegas": { zip: "89101", name: "Las Vegas" },
  "vegas": { zip: "89101", name: "Las Vegas" },
  "orlando": { zip: "32801", name: "Orlando" },
  "tampa": { zip: "33601", name: "Tampa" },
  "raleigh": { zip: "27601", name: "Raleigh" },
  "boise": { zip: "83701", name: "Boise" },
  "salt lake city": { zip: "84101", name: "Salt Lake City" },
  "tucson": { zip: "85701", name: "Tucson" },
  "sacramento": { zip: "95814", name: "Sacramento" },
  "kansas city": { zip: "64101", name: "Kansas City" },
  "memphis": { zip: "38101", name: "Memphis" },
  "milwaukee": { zip: "53201", name: "Milwaukee" },
  "albuquerque": { zip: "87101", name: "Albuquerque" },
  "fresno": { zip: "93701", name: "Fresno" },
  "omaha": { zip: "68101", name: "Omaha" },
  "cleveland": { zip: "44101", name: "Cleveland" },
  "new orleans": { zip: "70112", name: "New Orleans" },
  "nola": { zip: "70112", name: "New Orleans" },
};

const AQI_CATEGORIES: Record<number, string> = {
  1: "Good",
  2: "Moderate",
  3: "Unhealthy for Sensitive Groups",
  4: "Unhealthy",
  5: "Very Unhealthy",
  6: "Hazardous",
};

export interface AirQualityResult {
  city: string;
  readings: Array<{
    parameter: string;  // "O3", "PM2.5", "PM10"
    aqi: number;
    category: string;
    dateObserved: string;
    hourObserved: number;
  }>;
  forecast: Array<{
    parameter: string;
    aqi: number;
    category: string;
    date: string;
    discussion: string;
  }>;
}

function resolveZip(city: string): { zip: string; name: string } | null {
  const normalized = city.toLowerCase().trim();
  if (CITY_ZIPS[normalized]) return CITY_ZIPS[normalized];

  // Try partial match
  for (const [key, val] of Object.entries(CITY_ZIPS)) {
    if (key.includes(normalized) || normalized.includes(key)) return val;
  }

  // If input looks like a zip code, use it directly
  if (/^\d{5}$/.test(city.trim())) {
    return { zip: city.trim(), name: `ZIP ${city.trim()}` };
  }

  return null;
}

export async function queryAirQuality(city: string): Promise<AirQualityResult> {
  const apiKey = process.env.AIRNOW_API_KEY;
  if (!apiKey) {
    throw new Error("AIRNOW_API_KEY not set. Get a free key at https://docs.airnowapi.org/account/request/");
  }

  const match = resolveZip(city);
  if (!match) {
    const available = [...new Set(Object.values(CITY_ZIPS).map(v => v.name))].sort().join(", ");
    throw new Error(`City "${city}" not found. Available: ${available}. You can also pass a 5-digit ZIP code directly.`);
  }

  // Fetch current observations and forecast in parallel
  const [currentData, forecastData] = await Promise.all([
    fetchAirNow(`${BASE_URL}/observation/zipCode/current/?format=application/json&zipCode=${match.zip}&API_KEY=${apiKey}`),
    fetchAirNow(`${BASE_URL}/forecast/zipCode/?format=application/json&zipCode=${match.zip}&API_KEY=${apiKey}`),
  ]);

  const readings = (currentData || []).map((r: any) => ({
    parameter: r.ParameterName || "Unknown",
    aqi: r.AQI || 0,
    category: AQI_CATEGORIES[r.Category?.Number] || r.Category?.Name || "Unknown",
    dateObserved: r.DateObserved || "",
    hourObserved: r.HourObserved || 0,
  }));

  const forecast = (forecastData || []).map((f: any) => ({
    parameter: f.ParameterName || "Unknown",
    aqi: f.AQI || -1,
    category: AQI_CATEGORIES[f.Category?.Number] || f.Category?.Name || "Unknown",
    date: f.DateForecast?.trim() || "",
    discussion: (f.Discussion || "").slice(0, 300),
  }));

  return { city: match.name, readings, forecast };
}

async function fetchAirNow(url: string): Promise<any[]> {
  console.error(`[city-data-mcp] AirNow: ${url.replace(/API_KEY=[^&]+/, "API_KEY=***")}`);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  return response.json();
}

export function formatAirQualityResults(result: AirQualityResult): string {
  const lines: string[] = [`**${result.city}** — Air Quality (EPA AirNow)\n`];

  if (result.readings.length === 0) {
    lines.push("No current air quality readings available.");
  } else {
    lines.push("**Current Conditions:**");
    for (const r of result.readings) {
      const emoji = r.aqi <= 50 ? "🟢" : r.aqi <= 100 ? "🟡" : r.aqi <= 150 ? "🟠" : "🔴";
      lines.push(`- ${emoji} **${r.parameter}**: AQI ${r.aqi} (${r.category}) — ${r.dateObserved} ${r.hourObserved}:00`);
    }
  }

  const uniqueForecasts = result.forecast.filter((f, i, arr) =>
    arr.findIndex(x => x.date === f.date && x.parameter === f.parameter) === i
  );

  if (uniqueForecasts.length > 0) {
    lines.push("\n**Forecast:**");
    for (const f of uniqueForecasts.slice(0, 6)) {
      if (f.aqi >= 0) {
        lines.push(`- **${f.date}** ${f.parameter}: AQI ${f.aqi} (${f.category})`);
      }
    }
    const discussion = uniqueForecasts.find(f => f.discussion)?.discussion;
    if (discussion) {
      lines.push(`\n*${discussion}*`);
    }
  }

  return lines.join("\n");
}
