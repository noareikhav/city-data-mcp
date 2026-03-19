/**
 * city-data-mcp — REST API Server
 *
 * Thin Express layer wrapping existing query functions for the dashboard UI.
 * Each endpoint returns raw JSON — the React frontend handles formatting/display.
 */

import express from "express";
import cors from "cors";
import { listCities } from "./cities.js";
import { queryCensus } from "./sources/census.js";
import { resolveFredCity, listFredCities, queryFred } from "./sources/fred.js";
import { resolveBlsCity, listBlsCities, queryBls } from "./sources/bls.js";
import { resolveFbiCity, resolveFbiCityAsync, listFbiCities, queryFbiCrime } from "./sources/fbi.js";
import { queryWeather } from "./sources/nws.js";
import { queryAirQuality } from "./sources/airnow.js";
import { queryHud } from "./sources/hud.js";
import { queryWater } from "./sources/usgs.js";
import { queryCivic } from "./sources/civic.js";
import { query311Trends, list311Cities } from "./sources/three11.js";
import { queryTransit, listTransitCities } from "./sources/transit.js";
import { querySchools, listSchoolCities } from "./sources/schools.js";
import { queryPermits, listPermitCities } from "./sources/permits.js";
import { queryBudget, listBudgetCities } from "./sources/budget.js";
import { queryTraffic, listTrafficCities } from "./sources/traffic.js";
import { buildCityBriefing } from "./sources/briefing.js";
import { trackCityChanges } from "./sources/change-tracker.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract :city param safely (Express v5 params can be string | string[]) */
function cityParam(req: express.Request): string {
  const raw = req.params.city;
  return Array.isArray(raw) ? raw[0] : raw;
}

function safeHandler(fn: (city: string, req: express.Request) => Promise<unknown>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const city = cityParam(req);
      const data = await fn(city, req);
      res.json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  };
}

// ── City List ───────────────────────────────────────────────────────────────

app.get("/api/cities", (_req, res) => {
  // Build a comprehensive list of all known cities across all sources
  const citySet = new Set<string>();

  // From city registry (Socrata cities)
  for (const c of listCities()) citySet.add(c.name);

  // From FRED, BLS, FBI
  for (const c of listFredCities()) citySet.add(c.name);
  for (const c of listBlsCities()) citySet.add(c.name);
  for (const c of listFbiCities()) citySet.add(c.name);

  // From other sources
  for (const c of list311Cities()) citySet.add(c.name);
  for (const c of listTransitCities()) citySet.add(c.name);
  for (const c of listSchoolCities()) citySet.add(c.name);
  for (const c of listPermitCities()) citySet.add(c.name);
  for (const c of listBudgetCities()) citySet.add(c.name);
  for (const c of listTrafficCities()) citySet.add(c.name);

  // Major cities that Census always supports
  const majorCities = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
    "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
    "Austin", "Jacksonville", "Columbus", "Indianapolis",
    "Charlotte", "San Francisco", "Seattle", "Denver", "Nashville",
    "Oklahoma City", "Boston", "Portland", "Las Vegas", "Memphis",
    "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson",
    "Fresno", "Sacramento", "Kansas City", "Atlanta", "Omaha",
    "Raleigh", "Virginia Beach", "Miami", "Minneapolis",
    "Tampa", "New Orleans", "Cleveland", "Pittsburgh",
    "St. Louis", "Cincinnati", "Orlando", "Salt Lake City",
    "Richmond", "Birmingham", "Buffalo", "Boise",
    "Honolulu", "Anchorage", "Madison", "Des Moines",
  ];
  for (const c of majorCities) citySet.add(c);

  const cities = Array.from(citySet).sort();
  res.json({ data: cities });
});

// ── Census ──────────────────────────────────────────────────────────────────

app.get("/api/census/:city", safeHandler(async (city) => {
  return queryCensus(city);
}));

// ── FRED Economics ──────────────────────────────────────────────────────────

app.get("/api/economics/:city", safeHandler(async (city) => {
  const match = resolveFredCity(city);
  if (!match) throw new Error(`City "${city}" not found in FRED data`);
  return queryFred(match.key);
}));

// ── BLS Employment ──────────────────────────────────────────────────────────

app.get("/api/employment/:city", safeHandler(async (city) => {
  const match = resolveBlsCity(city);
  if (!match) throw new Error(`City "${city}" not found in BLS data`);
  return queryBls(match.key);
}));

// ── FBI Crime ───────────────────────────────────────────────────────────────

app.get("/api/crime/:city", safeHandler(async (city) => {
  const match = await resolveFbiCityAsync(city);
  if (!match) throw new Error(`City "${city}" not found in FBI data`);
  return queryFbiCrime(match.config.state, match.key);
}));

// ── Traffic ─────────────────────────────────────────────────────────────────

app.get("/api/traffic/:city", safeHandler(async (city) => {
  return queryTraffic(city);
}));

// ── Weather ─────────────────────────────────────────────────────────────────

app.get("/api/weather/:city", safeHandler(async (city) => {
  return queryWeather(city);
}));

// ── HUD Housing ─────────────────────────────────────────────────────────────

app.get("/api/housing/:city", safeHandler(async (city) => {
  return queryHud(city);
}));

// ── Air Quality ─────────────────────────────────────────────────────────────

app.get("/api/air-quality/:city", safeHandler(async (city) => {
  return queryAirQuality(city);
}));

// ── USGS Water ──────────────────────────────────────────────────────────────

app.get("/api/water/:city", safeHandler(async (city) => {
  return queryWater(city);
}));

// ── Civic Representatives ───────────────────────────────────────────────────

app.get("/api/representatives/:city", safeHandler(async (city) => {
  return queryCivic(city);
}));

// ── 311 Trends ──────────────────────────────────────────────────────────────

app.get("/api/311/:city", safeHandler(async (city, req) => {
  const days = parseInt(req.query.days as string) || 90;
  return query311Trends(city, days);
}));

// ── Transit ─────────────────────────────────────────────────────────────────

app.get("/api/transit/:city", safeHandler(async (city) => {
  return queryTransit(city);
}));

// ── Schools ─────────────────────────────────────────────────────────────────

app.get("/api/schools/:city", safeHandler(async (city) => {
  return querySchools(city);
}));

// ── Permits ─────────────────────────────────────────────────────────────────

app.get("/api/permits/:city", safeHandler(async (city) => {
  return queryPermits(city);
}));

// ── Budget ──────────────────────────────────────────────────────────────────

app.get("/api/budget/:city", safeHandler(async (city) => {
  return queryBudget(city);
}));

// ── Briefing (all sources) ──────────────────────────────────────────────────

app.get("/api/briefing/:city", safeHandler(async (city) => {
  return buildCityBriefing(city);
}));

// ── Change Tracker ──────────────────────────────────────────────────────────

app.get("/api/changes/:city", safeHandler(async (city) => {
  return trackCityChanges(city);
}));

// ── Start ───────────────────────────────────────────────────────────────────

const port = parseInt(process.env.API_PORT || "3001", 10);
app.listen(port, () => {
  console.log(`[city-data-mcp] API server running on http://localhost:${port}`);
  console.log(`[city-data-mcp] Try: http://localhost:${port}/api/cities`);
});
