/**
 * US City Geo-Resolver
 *
 * Extracted from src/sources/geo-resolver.ts for the multi-country architecture.
 * Resolves US city names via Census Geocoder + FCC Area API.
 * Re-exports old types for backward compatibility.
 */

import type { UnifiedGeoResolution } from "../types.js";

const GEOCODER_BASE = "https://geocoding.geo.census.gov/geocoder";
const FCC_API = "https://geo.fcc.gov/api/census/area";

// State FIPS → abbreviation mapping
const STATE_FIPS_TO_ABBREV: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

// Common aliases
const ALIASES: Record<string, string> = {
  "nyc": "new york", "ny": "new york",
  "la": "los angeles", "l.a.": "los angeles",
  "sf": "san francisco",
  "dc": "washington", "d.c.": "washington", "washington dc": "washington",
  "philly": "philadelphia",
  "vegas": "las vegas", "lv": "las vegas",
  "nola": "new orleans",
  "slc": "salt lake city",
  "okc": "oklahoma city",
  "kc": "kansas city",
  "indy": "indianapolis",
  "jax": "jacksonville",
  "cle": "cleveland",
  "pgh": "pittsburgh",
  "stl": "st. louis", "st louis": "st. louis", "saint louis": "st. louis",
  "cincy": "cincinnati",
  "buf": "buffalo",
  "mke": "milwaukee",
  "abq": "albuquerque",
  "rva": "richmond",
  "atl": "atlanta",
  "pdx": "portland",
  "msp": "minneapolis",
  "dtw": "detroit",
  "sea": "seattle",
  "den": "denver",
  "bos": "boston",
  "clt": "charlotte",
  "sac": "sacramento",
};

// ── Built-in US Cities (fast path — avoids Census Geocoder API for common cities) ────

interface USCityEntry {
  name: string;
  lat: number;
  lon: number;
  stateFips: string;
  countyFips: string;
  countyName: string;
  stateAbbrev: string;
  zip: string;
}

const US_CITIES: Record<string, USCityEntry> = {
  "new york": { name: "New York", lat: 40.7128, lon: -74.0060, stateFips: "36", countyFips: "061", countyName: "New York County", stateAbbrev: "NY", zip: "10001" },
  "los angeles": { name: "Los Angeles", lat: 34.0522, lon: -118.2437, stateFips: "06", countyFips: "037", countyName: "Los Angeles County", stateAbbrev: "CA", zip: "90001" },
  "chicago": { name: "Chicago", lat: 41.8781, lon: -87.6298, stateFips: "17", countyFips: "031", countyName: "Cook County", stateAbbrev: "IL", zip: "60601" },
  "houston": { name: "Houston", lat: 29.7604, lon: -95.3698, stateFips: "48", countyFips: "201", countyName: "Harris County", stateAbbrev: "TX", zip: "77001" },
  "phoenix": { name: "Phoenix", lat: 33.4484, lon: -112.0740, stateFips: "04", countyFips: "013", countyName: "Maricopa County", stateAbbrev: "AZ", zip: "85001" },
  "philadelphia": { name: "Philadelphia", lat: 39.9526, lon: -75.1652, stateFips: "42", countyFips: "101", countyName: "Philadelphia County", stateAbbrev: "PA", zip: "19101" },
  "san antonio": { name: "San Antonio", lat: 29.4241, lon: -98.4936, stateFips: "48", countyFips: "029", countyName: "Bexar County", stateAbbrev: "TX", zip: "78201" },
  "san diego": { name: "San Diego", lat: 32.7157, lon: -117.1611, stateFips: "06", countyFips: "073", countyName: "San Diego County", stateAbbrev: "CA", zip: "92101" },
  "dallas": { name: "Dallas", lat: 32.7767, lon: -96.7970, stateFips: "48", countyFips: "113", countyName: "Dallas County", stateAbbrev: "TX", zip: "75201" },
  "san jose": { name: "San Jose", lat: 37.3382, lon: -121.8863, stateFips: "06", countyFips: "085", countyName: "Santa Clara County", stateAbbrev: "CA", zip: "95101" },
  "austin": { name: "Austin", lat: 30.2672, lon: -97.7431, stateFips: "48", countyFips: "453", countyName: "Travis County", stateAbbrev: "TX", zip: "78701" },
  "jacksonville": { name: "Jacksonville", lat: 30.3322, lon: -81.6557, stateFips: "12", countyFips: "031", countyName: "Duval County", stateAbbrev: "FL", zip: "32099" },
  "fort worth": { name: "Fort Worth", lat: 32.7555, lon: -97.3308, stateFips: "48", countyFips: "439", countyName: "Tarrant County", stateAbbrev: "TX", zip: "76101" },
  "columbus": { name: "Columbus", lat: 39.9612, lon: -82.9988, stateFips: "39", countyFips: "049", countyName: "Franklin County", stateAbbrev: "OH", zip: "43085" },
  "charlotte": { name: "Charlotte", lat: 35.2271, lon: -80.8431, stateFips: "37", countyFips: "119", countyName: "Mecklenburg County", stateAbbrev: "NC", zip: "28201" },
  "indianapolis": { name: "Indianapolis", lat: 39.7684, lon: -86.1581, stateFips: "18", countyFips: "097", countyName: "Marion County", stateAbbrev: "IN", zip: "46201" },
  "san francisco": { name: "San Francisco", lat: 37.7749, lon: -122.4194, stateFips: "06", countyFips: "075", countyName: "San Francisco County", stateAbbrev: "CA", zip: "94102" },
  "seattle": { name: "Seattle", lat: 47.6062, lon: -122.3321, stateFips: "53", countyFips: "033", countyName: "King County", stateAbbrev: "WA", zip: "98101" },
  "denver": { name: "Denver", lat: 39.7392, lon: -104.9903, stateFips: "08", countyFips: "031", countyName: "Denver County", stateAbbrev: "CO", zip: "80201" },
  "washington": { name: "Washington", lat: 38.9072, lon: -77.0369, stateFips: "11", countyFips: "001", countyName: "District of Columbia", stateAbbrev: "DC", zip: "20001" },
  "nashville": { name: "Nashville", lat: 36.1627, lon: -86.7816, stateFips: "47", countyFips: "037", countyName: "Davidson County", stateAbbrev: "TN", zip: "37201" },
  "oklahoma city": { name: "Oklahoma City", lat: 35.4676, lon: -97.5164, stateFips: "40", countyFips: "109", countyName: "Oklahoma County", stateAbbrev: "OK", zip: "73101" },
  "el paso": { name: "El Paso", lat: 31.7619, lon: -106.4850, stateFips: "48", countyFips: "141", countyName: "El Paso County", stateAbbrev: "TX", zip: "79901" },
  "boston": { name: "Boston", lat: 42.3601, lon: -71.0589, stateFips: "25", countyFips: "025", countyName: "Suffolk County", stateAbbrev: "MA", zip: "02101" },
  "portland": { name: "Portland", lat: 45.5152, lon: -122.6784, stateFips: "41", countyFips: "051", countyName: "Multnomah County", stateAbbrev: "OR", zip: "97201" },
  "las vegas": { name: "Las Vegas", lat: 36.1699, lon: -115.1398, stateFips: "32", countyFips: "003", countyName: "Clark County", stateAbbrev: "NV", zip: "89101" },
  "memphis": { name: "Memphis", lat: 35.1495, lon: -90.0490, stateFips: "47", countyFips: "157", countyName: "Shelby County", stateAbbrev: "TN", zip: "38101" },
  "louisville": { name: "Louisville", lat: 38.2527, lon: -85.7585, stateFips: "21", countyFips: "111", countyName: "Jefferson County", stateAbbrev: "KY", zip: "40201" },
  "baltimore": { name: "Baltimore", lat: 39.2904, lon: -76.6122, stateFips: "24", countyFips: "510", countyName: "Baltimore City", stateAbbrev: "MD", zip: "21201" },
  "milwaukee": { name: "Milwaukee", lat: 43.0389, lon: -87.9065, stateFips: "55", countyFips: "079", countyName: "Milwaukee County", stateAbbrev: "WI", zip: "53201" },
  "albuquerque": { name: "Albuquerque", lat: 35.0844, lon: -106.6504, stateFips: "35", countyFips: "001", countyName: "Bernalillo County", stateAbbrev: "NM", zip: "87101" },
  "tucson": { name: "Tucson", lat: 32.2226, lon: -110.9747, stateFips: "04", countyFips: "019", countyName: "Pima County", stateAbbrev: "AZ", zip: "85701" },
  "fresno": { name: "Fresno", lat: 36.7378, lon: -119.7871, stateFips: "06", countyFips: "019", countyName: "Fresno County", stateAbbrev: "CA", zip: "93650" },
  "mesa": { name: "Mesa", lat: 33.4152, lon: -111.8315, stateFips: "04", countyFips: "013", countyName: "Maricopa County", stateAbbrev: "AZ", zip: "85201" },
  "sacramento": { name: "Sacramento", lat: 38.5816, lon: -121.4944, stateFips: "06", countyFips: "067", countyName: "Sacramento County", stateAbbrev: "CA", zip: "95814" },
  "atlanta": { name: "Atlanta", lat: 33.7490, lon: -84.3880, stateFips: "13", countyFips: "121", countyName: "Fulton County", stateAbbrev: "GA", zip: "30301" },
  "kansas city": { name: "Kansas City", lat: 39.0997, lon: -94.5786, stateFips: "29", countyFips: "095", countyName: "Jackson County", stateAbbrev: "MO", zip: "64101" },
  "colorado springs": { name: "Colorado Springs", lat: 38.8339, lon: -104.8214, stateFips: "08", countyFips: "041", countyName: "El Paso County", stateAbbrev: "CO", zip: "80901" },
  "omaha": { name: "Omaha", lat: 41.2565, lon: -95.9345, stateFips: "31", countyFips: "055", countyName: "Douglas County", stateAbbrev: "NE", zip: "68101" },
  "raleigh": { name: "Raleigh", lat: 35.7796, lon: -78.6382, stateFips: "37", countyFips: "183", countyName: "Wake County", stateAbbrev: "NC", zip: "27601" },
  "miami": { name: "Miami", lat: 25.7617, lon: -80.1918, stateFips: "12", countyFips: "086", countyName: "Miami-Dade County", stateAbbrev: "FL", zip: "33101" },
  "minneapolis": { name: "Minneapolis", lat: 44.9778, lon: -93.2650, stateFips: "27", countyFips: "053", countyName: "Hennepin County", stateAbbrev: "MN", zip: "55401" },
  "cleveland": { name: "Cleveland", lat: 41.4993, lon: -81.6944, stateFips: "39", countyFips: "035", countyName: "Cuyahoga County", stateAbbrev: "OH", zip: "44101" },
  "tampa": { name: "Tampa", lat: 27.9506, lon: -82.4572, stateFips: "12", countyFips: "057", countyName: "Hillsborough County", stateAbbrev: "FL", zip: "33601" },
  "pittsburgh": { name: "Pittsburgh", lat: 40.4406, lon: -79.9959, stateFips: "42", countyFips: "003", countyName: "Allegheny County", stateAbbrev: "PA", zip: "15201" },
  "detroit": { name: "Detroit", lat: 42.3314, lon: -83.0458, stateFips: "26", countyFips: "163", countyName: "Wayne County", stateAbbrev: "MI", zip: "48201" },
  "cincinnati": { name: "Cincinnati", lat: 39.1031, lon: -84.5120, stateFips: "39", countyFips: "061", countyName: "Hamilton County", stateAbbrev: "OH", zip: "45201" },
  "st. louis": { name: "St. Louis", lat: 38.6270, lon: -90.1994, stateFips: "29", countyFips: "510", countyName: "St. Louis City", stateAbbrev: "MO", zip: "63101" },
  "orlando": { name: "Orlando", lat: 28.5383, lon: -81.3792, stateFips: "12", countyFips: "095", countyName: "Orange County", stateAbbrev: "FL", zip: "32801" },
  "new orleans": { name: "New Orleans", lat: 29.9511, lon: -90.0715, stateFips: "22", countyFips: "071", countyName: "Orleans Parish", stateAbbrev: "LA", zip: "70112" },
  "buffalo": { name: "Buffalo", lat: 42.8864, lon: -78.8784, stateFips: "36", countyFips: "029", countyName: "Erie County", stateAbbrev: "NY", zip: "14201" },
  "salt lake city": { name: "Salt Lake City", lat: 40.7608, lon: -111.8910, stateFips: "49", countyFips: "035", countyName: "Salt Lake County", stateAbbrev: "UT", zip: "84101" },
  "honolulu": { name: "Honolulu", lat: 21.3069, lon: -157.8583, stateFips: "15", countyFips: "003", countyName: "Honolulu County", stateAbbrev: "HI", zip: "96801" },
  "anchorage": { name: "Anchorage", lat: 61.2181, lon: -149.9003, stateFips: "02", countyFips: "020", countyName: "Anchorage Municipality", stateAbbrev: "AK", zip: "99501" },
  "boise": { name: "Boise", lat: 43.6150, lon: -116.2023, stateFips: "16", countyFips: "001", countyName: "Ada County", stateAbbrev: "ID", zip: "83701" },
  "richmond": { name: "Richmond", lat: 37.5407, lon: -77.4360, stateFips: "51", countyFips: "760", countyName: "Richmond City", stateAbbrev: "VA", zip: "23218" },
};

/** Backward-compat: old GeoResolution type */
export interface GeoResolution {
  input: string;
  city: string;
  lat: number;
  lon: number;
  stateFips: string;
  countyFips: string;
  fullCountyFips: string;
  countyName: string;
  stateAbbrev: string;
  zip: string | null;
  cached: boolean;
}

// In-memory cache
const cache = new Map<string, UnifiedGeoResolution>();

/**
 * Resolve a US city name to geographic identifiers.
 * Returns UnifiedGeoResolution with country: 'US'.
 */
export async function resolveUSCity(input: string): Promise<UnifiedGeoResolution> {
  const normalized = input.toLowerCase().trim();
  const aliased = ALIASES[normalized] || normalized;

  if (cache.has(aliased)) {
    return { ...cache.get(aliased)!, cached: true };
  }

  console.error(`[city-data-mcp] US Geo-resolving: "${input}"`);

  // Fast path: built-in lookup for ~55 major US cities
  const lookup = US_CITIES[aliased];
  if (lookup) {
    const result: UnifiedGeoResolution = {
      input,
      city: lookup.name,
      country: 'US',
      lat: lookup.lat,
      lon: lookup.lon,
      adminArea: lookup.countyName,
      adminAreaCode: `${lookup.stateFips}${lookup.countyFips}`,
      stateOrProvince: lookup.stateAbbrev,
      cached: false,
      stateFips: lookup.stateFips,
      countyFips: lookup.countyFips,
      fullCountyFips: `${lookup.stateFips}${lookup.countyFips}`,
      stateAbbrev: lookup.stateAbbrev,
      zip: lookup.zip,
    };
    cache.set(aliased, result);
    return result;
  }

  let geoResult = await tryGeocodeWithGeography(aliased);

  if (!geoResult) {
    geoResult = await tryGeocodeWithFallback(aliased, input);
  }

  if (!geoResult) {
    throw new Error(
      `Could not resolve "${input}" to a US location. Try a more specific city name (e.g., "Springfield, IL" instead of "Springfield").`
    );
  }

  cache.set(aliased, geoResult);
  return { ...geoResult, cached: false };
}

/** Backward-compat export matching the old function signature */
export const resolveCity = resolveUSCity;

async function tryGeocodeWithGeography(city: string): Promise<UnifiedGeoResolution | null> {
  try {
    const query = city.includes(",") ? city : `${city}, US`;
    const url = `${GEOCODER_BASE}/geographies/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    const data = await fetchWithTimeout(url, 8000);
    const match = data?.result?.addressMatches?.[0];
    if (!match) return null;

    const lat = parseFloat(match.coordinates.y);
    const lon = parseFloat(match.coordinates.x);
    const matchedAddress = match.matchedAddress || "";

    const geos = match.geographies;
    let stateFips = "";
    let countyFips = "";
    let countyName = "";

    const tract = geos?.["Census Tracts"]?.[0];
    if (tract) {
      stateFips = tract.STATE || "";
      countyFips = tract.COUNTY || "";
    }

    const county = geos?.["Counties"]?.[0];
    if (county) {
      stateFips = stateFips || county.STATE || "";
      countyFips = countyFips || county.COUNTY || "";
      countyName = county.NAME || "";
    }

    const state = geos?.["States"]?.[0];
    if (state && !stateFips) {
      stateFips = state.STATE || "";
    }

    if (!stateFips || !countyFips) return null;

    const stateAbbrev = STATE_FIPS_TO_ABBREV[stateFips] || "";
    const zipMatch = matchedAddress.match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : null;
    const cityName = extractCityName(matchedAddress, city);

    return {
      input: city,
      city: cityName,
      country: 'US',
      lat,
      lon,
      adminArea: countyName || "Unknown County",
      adminAreaCode: `${stateFips}${countyFips}`,
      stateOrProvince: stateAbbrev,
      cached: false,
      stateFips,
      countyFips,
      fullCountyFips: `${stateFips}${countyFips}`,
      stateAbbrev,
      zip,
    };
  } catch (e) {
    console.error(`[city-data-mcp] US geography geocoder failed:`, e);
    return null;
  }
}

async function tryGeocodeWithFallback(city: string, originalInput: string): Promise<UnifiedGeoResolution | null> {
  try {
    const query = city.includes(",") ? city : `${city}, US`;
    const url = `${GEOCODER_BASE}/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
    const data = await fetchWithTimeout(url, 8000);
    const match = data?.result?.addressMatches?.[0];
    if (!match) return null;

    const lat = parseFloat(match.coordinates.y);
    const lon = parseFloat(match.coordinates.x);
    const matchedAddress = match.matchedAddress || "";

    const fccUrl = `${FCC_API}?lat=${lat}&lon=${lon}&format=json`;
    const fccData = await fetchWithTimeout(fccUrl, 5000);
    const fccResult = fccData?.results?.[0];

    if (!fccResult) return null;

    const stateFips = fccResult.state_fips || "";
    const countyFips = fccResult.county_fips?.slice(2) || "";
    const countyName = fccResult.county_name || "Unknown County";
    const stateAbbrev = STATE_FIPS_TO_ABBREV[stateFips] || "";

    const zipMatch = matchedAddress.match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : null;
    const cityName = extractCityName(matchedAddress, city);

    return {
      input: city,
      city: cityName,
      country: 'US',
      lat,
      lon,
      adminArea: countyName,
      adminAreaCode: `${stateFips}${countyFips}`,
      stateOrProvince: stateAbbrev,
      cached: false,
      stateFips,
      countyFips,
      fullCountyFips: `${stateFips}${countyFips}`,
      stateAbbrev,
      zip,
    };
  } catch (e) {
    console.error(`[city-data-mcp] US fallback geocoder failed:`, e);
    return null;
  }
}

function extractCityName(matchedAddress: string, fallback: string): string {
  const parts = matchedAddress.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    const candidate = /\d/.test(parts[0]) ? parts[1] : parts[0];
    if (candidate && candidate.length > 1) return candidate;
  }
  return fallback.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function isCached(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  const aliased = ALIASES[normalized] || normalized;
  return cache.has(aliased);
}
