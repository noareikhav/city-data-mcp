/**
 * National Weather Service API Client
 *
 * Provides current conditions, forecasts, and active alerts for any US location.
 * No API key needed — just a User-Agent header.
 *
 * How it works:
 * 1. Convert city name to lat/lon (we use the Census geocoder)
 * 2. Call /points/{lat},{lon} to get the forecast office + grid
 * 3. Call /gridpoints/{office}/{x},{y}/forecast for the forecast
 * 4. Call /alerts/active?point={lat},{lon} for active alerts
 *
 * Docs: https://www.weather.gov/documentation/services-web-api
 */

const NWS_BASE = "https://api.weather.gov";
const GEOCODER_BASE = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const USER_AGENT = "city-data-mcp/0.2.0 (civic data MCP server)";

// Simple lat/lon cache for cities
const coordCache = new Map<string, { lat: number; lon: number }>();

// Well-known city coordinates (fallback if geocoder is slow)
const KNOWN_COORDS: Record<string, { lat: number; lon: number }> = {
  "new york": { lat: 40.7128, lon: -74.0060 },
  "los angeles": { lat: 34.0522, lon: -118.2437 },
  "chicago": { lat: 41.8781, lon: -87.6298 },
  "houston": { lat: 29.7604, lon: -95.3698 },
  "phoenix": { lat: 33.4484, lon: -112.0740 },
  "philadelphia": { lat: 39.9526, lon: -75.1652 },
  "san antonio": { lat: 29.4241, lon: -98.4936 },
  "san diego": { lat: 32.7157, lon: -117.1611 },
  "dallas": { lat: 32.7767, lon: -96.7970 },
  "austin": { lat: 30.2672, lon: -97.7431 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  "seattle": { lat: 47.6062, lon: -122.3321 },
  "denver": { lat: 39.7392, lon: -104.9903 },
  "boston": { lat: 42.3601, lon: -71.0589 },
  "nashville": { lat: 36.1627, lon: -86.7816 },
  "portland": { lat: 45.5152, lon: -122.6784 },
  "atlanta": { lat: 33.7490, lon: -84.3880 },
  "miami": { lat: 25.7617, lon: -80.1918 },
  "washington": { lat: 38.9072, lon: -77.0369 },
  "minneapolis": { lat: 44.9778, lon: -93.2650 },
  "detroit": { lat: 42.3314, lon: -83.0458 },
  "baltimore": { lat: 39.2904, lon: -76.6122 },
  "charlotte": { lat: 35.2271, lon: -80.8431 },
  "pittsburgh": { lat: 40.4406, lon: -79.9959 },
  "las vegas": { lat: 36.1699, lon: -115.1398 },
  "orlando": { lat: 28.5383, lon: -81.3792 },
  "tampa": { lat: 27.9506, lon: -82.4572 },
  "raleigh": { lat: 35.7796, lon: -78.6382 },
  "boise": { lat: 43.6150, lon: -116.2023 },
  "salt lake city": { lat: 40.7608, lon: -111.8910 },
};

const ALIASES: Record<string, string> = {
  "nyc": "new york", "sf": "san francisco", "la": "los angeles",
  "dc": "washington", "philly": "philadelphia", "vegas": "las vegas",
  "l.a.": "los angeles", "d.c.": "washington",
};

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json,application/json" },
  });
  if (!response.ok) {
    throw new Error(`NWS API error (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

/**
 * Get coordinates for a city name.
 */
async function getCoordinates(city: string): Promise<{ lat: number; lon: number }> {
  const normalized = city.toLowerCase().trim();
  const aliased = ALIASES[normalized] || normalized;

  if (coordCache.has(aliased)) return coordCache.get(aliased)!;
  if (KNOWN_COORDS[aliased]) {
    coordCache.set(aliased, KNOWN_COORDS[aliased]);
    return KNOWN_COORDS[aliased];
  }

  // Try Census geocoder
  try {
    const url = `${GEOCODER_BASE}?address=${encodeURIComponent(city + ", US")}&benchmark=Public_AR_Current&format=json`;
    console.error(`[city-data-mcp] Geocoding: ${city}`);
    const data = await fetchJson(url);
    const match = data?.result?.addressMatches?.[0];
    if (match) {
      const coords = { lat: parseFloat(match.coordinates.y), lon: parseFloat(match.coordinates.x) };
      coordCache.set(aliased, coords);
      return coords;
    }
  } catch (e) {
    console.error(`[city-data-mcp] Geocoder failed:`, e);
  }

  throw new Error(`Could not find coordinates for "${city}". Try a more specific city name.`);
}

export interface WeatherResult {
  city: string;
  current: {
    temperature: string | null;
    windSpeed: string | null;
    windDirection: string | null;
    shortForecast: string | null;
    detailedForecast: string | null;
  };
  forecast: Array<{
    name: string;
    temperature: number;
    temperatureUnit: string;
    windSpeed: string;
    shortForecast: string;
  }>;
  alerts: Array<{
    event: string;
    headline: string;
    severity: string;
    urgency: string;
    description: string;
  }>;
}

/**
 * Fetch weather data for a city.
 */
export async function queryWeather(city: string): Promise<WeatherResult> {
  const coords = await getCoordinates(city);
  const pointUrl = `${NWS_BASE}/points/${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`;

  console.error(`[city-data-mcp] NWS: ${pointUrl}`);
  const pointData = await fetchJson(pointUrl);

  const forecastUrl = pointData.properties?.forecast;
  if (!forecastUrl) {
    throw new Error("Could not determine forecast URL from NWS");
  }

  // Fetch forecast and alerts in parallel
  const [forecastData, alertsData] = await Promise.all([
    fetchJson(forecastUrl).catch(() => null),
    fetchJson(`${NWS_BASE}/alerts/active?point=${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`).catch(() => null),
  ]);

  const periods = forecastData?.properties?.periods || [];
  const currentPeriod = periods[0] || null;

  const alerts = (alertsData?.features || []).map((f: any) => ({
    event: f.properties?.event || "Unknown",
    headline: f.properties?.headline || "",
    severity: f.properties?.severity || "Unknown",
    urgency: f.properties?.urgency || "Unknown",
    description: (f.properties?.description || "").slice(0, 300),
  }));

  return {
    city,
    current: {
      temperature: currentPeriod ? `${currentPeriod.temperature}°${currentPeriod.temperatureUnit}` : null,
      windSpeed: currentPeriod?.windSpeed || null,
      windDirection: currentPeriod?.windDirection || null,
      shortForecast: currentPeriod?.shortForecast || null,
      detailedForecast: currentPeriod?.detailedForecast || null,
    },
    forecast: periods.slice(0, 6).map((p: any) => ({
      name: p.name,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      windSpeed: p.windSpeed,
      shortForecast: p.shortForecast,
    })),
    alerts,
  };
}

export function formatWeatherResults(result: WeatherResult): string {
  const lines: string[] = [`**${result.city}** — Current Weather (NWS)\n`];

  if (result.current.temperature) {
    lines.push(`**Now:** ${result.current.temperature}, ${result.current.shortForecast}`);
    lines.push(`Wind: ${result.current.windSpeed} ${result.current.windDirection}`);
    if (result.current.detailedForecast) {
      lines.push(`\n${result.current.detailedForecast}`);
    }
  }

  if (result.alerts.length > 0) {
    lines.push(`\n**Active Alerts (${result.alerts.length}):**`);
    for (const alert of result.alerts) {
      lines.push(`- **${alert.event}** (${alert.severity}): ${alert.headline}`);
    }
  }

  if (result.forecast.length > 1) {
    lines.push("\n**Forecast:**");
    for (const p of result.forecast.slice(1)) {
      lines.push(`- **${p.name}:** ${p.temperature}°${p.temperatureUnit}, ${p.shortForecast} (Wind: ${p.windSpeed})`);
    }
  }

  return lines.join("\n");
}
