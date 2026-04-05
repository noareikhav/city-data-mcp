#!/usr/bin/env node
/**
 * city-data-mcp — Multi-City Public Data MCP Server
 *
 * This is the entry point. When Claude Code starts this server, three things happen:
 * 1. We create an MCP server and declare its capabilities
 * 2. We register tools — each tool is a function Claude can call
 * 3. We connect via stdio — the server listens for requests from Claude
 *
 * The MCP protocol flow:
 * Claude discovers tools → User asks a question → Claude calls a tool →
 * This server fetches data from Socrata → Returns formatted results → Claude answers
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { z } from "zod";
import type { Country } from "./types.js";
import { resolveCity, listCities } from "./cities.js";
import { querySocrata, formatSocrataResults } from "./sources/socrata.js";
import { queryCensus, formatCensusResults } from "./sources/census.js";
import { resolveFredCity, listFredCities, queryFred, formatFredResults } from "./sources/fred.js";
import { resolveFbiCity, resolveFbiCityAsync, listFbiCities, queryFbiCrime, formatFbiResults } from "./sources/fbi.js";
import { resolveBlsCity, listBlsCities, queryBls, formatBlsResults } from "./sources/bls.js";
import { buildCohort, formatCohortResults, type CohortCriteria } from "./sources/cohort.js";
import { buildFullCohort, formatFullCohortResults, type FullCohortCriteria } from "./sources/full-cohort.js";
import { queryWeather, formatWeatherResults } from "./sources/nws.js";
import { queryAirQuality, formatAirQualityResults } from "./sources/airnow.js";
import { queryHud, formatHudResults } from "./sources/hud.js";
import { queryWater, formatWaterResults } from "./sources/usgs.js";
import { queryCivic, formatCivicResults } from "./sources/civic.js";
import { query311Trends, format311Results, list311Cities } from "./sources/three11.js";
import { queryTransit, formatTransitResults, listTransitCities } from "./sources/transit.js";
import { querySchools, formatSchoolResults, listSchoolCities } from "./sources/schools.js";
import { queryPermits, formatPermitResults, listPermitCities } from "./sources/permits.js";
import { queryBudget, formatBudgetResults, listBudgetCities } from "./sources/budget.js";
import { buildCityBriefing, formatBriefing } from "./sources/briefing.js";
import { queryTraffic, formatTrafficResults, listTrafficCities } from "./sources/traffic.js";
import { mapIssueData, formatIssueData, listIssueTopics } from "./sources/issue-mapper.js";
import { trackCityChanges, formatChangeTracker } from "./sources/change-tracker.js";
import { queryPublicHealth, formatPublicHealthResults } from "./sources/cdc-places.js";
import { queryHomelessness, formatHomelessnessResults, listHomelessCities } from "./sources/homelessness.js";
import { queryCpi, formatCpiResults, listCpiCities } from "./sources/cpi.js";
import { queryMigration, formatMigrationResults } from "./sources/migration.js";

// UK sources
import { queryUkCrime, formatUkCrimeResults } from "./sources/uk/crime.js";
import { queryUkFloodWater, formatUkFloodWaterResults } from "./sources/uk/flood-water.js";
import { queryUkDemographics, formatUkDemographicsResults, queryUkMigration, formatUkMigrationResults } from "./sources/uk/ons-demographics.js";
import { queryUkEconomics, formatUkEconomicsResults } from "./sources/uk/economics.js";
import { queryUkHousing, formatUkHousingResults } from "./sources/uk/housing.js";
import { queryUkPlanning, formatUkPlanningResults } from "./sources/uk/planning.js";
import { queryUkSchools, formatUkSchoolsResults } from "./sources/uk/schools.js";
import { queryUkLocalGovFinance, formatUkLocalGovFinanceResults } from "./sources/uk/local-gov-finance.js";
import { queryUkAirQuality, formatUkAirQualityResults } from "./sources/uk/air-quality.js";
import { searchUkDatasets, formatUkDatasetResults } from "./sources/uk/discovery.js";
import { queryUkWeather, formatUkWeatherResults } from "./sources/uk/weather.js";
import { queryUkTransport, formatUkTransportResults } from "./sources/uk/transport.js";
import { queryUkRepresentatives, formatUkRepresentativesResults } from "./sources/uk/representatives.js";
import { buildUkCityBriefing } from "./sources/uk/briefing.js";
import { listUkCities } from "./sources/uk/geo-resolver.js";
// Multi-country adapters
import { queryDemographics as adapterDemographics } from "./sources/adapters/demographics.js";
import { queryCrime as adapterCrime } from "./sources/adapters/crime.js";
import { queryEconomics as adapterEconomics } from "./sources/adapters/economics.js";
import { queryEmployment as adapterEmployment } from "./sources/adapters/employment.js";
import { queryWeather as adapterWeather } from "./sources/adapters/weather.js";
import { queryAirQuality as adapterAirQuality } from "./sources/adapters/air-quality.js";
import { queryHousing as adapterHousing } from "./sources/adapters/housing.js";
import { queryWater as adapterWater } from "./sources/adapters/water.js";
import { queryRepresentatives as adapterRepresentatives } from "./sources/adapters/representatives.js";
import { querySchools as adapterSchools } from "./sources/adapters/schools.js";
import { queryTransport as adapterTransport } from "./sources/adapters/transport.js";
import { queryBudget as adapterBudget } from "./sources/adapters/budget.js";
import { queryBriefing as adapterBriefing } from "./sources/adapters/briefing.js";

// Country parameter schema (reused across multi-country tools)
const countryParam = z.enum(['US', 'UK', 'CA']).optional().describe(
  "Country code. Auto-detected from city name if omitted. Required for ambiguous cities like London, Birmingham, Richmond, Hamilton, Cambridge, Windsor."
);

async function createMcpServer() {
  const server = new McpServer(
    {
      name: "city-data-mcp",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Step 2: Register tools
  // Each tool has: a name, description (helps Claude decide when to use it),
  // an input schema (what arguments it accepts), and a handler (what it does).

  // --- Tool 1: query_city_data ---
  // The core tool. Query any supported city's data by category.
  server.registerTool(
    "query_city_data",
    {
      title: "Query City Public Data",
      description: `Query publicly available data for a US city by category. US only (Socrata open data portals).

Supported cities: NYC, Chicago, San Francisco, Los Angeles, Seattle
Supported categories: crime, 311

Returns recent data with category breakdown and sample records.`,
      inputSchema: z.object({
        city: z
          .string()
          .describe(
            "City name or abbreviation (e.g., 'NYC', 'Chicago', 'SF', 'LA', 'Seattle')"
          ),
        category: z
          .enum(["crime", "311"])
          .describe("Data category to query"),
        limit: z
          .number()
          .default(50)
          .describe("Maximum number of records to fetch (default 50)"),
        daysBack: z
          .number()
          .default(30)
          .describe("How many days of recent data to include (default 30)"),
      }),
    },
    async (args) => {
      // Resolve the city name to a config
      const match = resolveCity(args.city);
      if (!match) {
        const available = listCities()
          .map((c) => `${c.name} (${c.key})`)
          .join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `City "${args.city}" not found. Available cities: ${available}`,
            },
          ],
        };
      }

      // Check if this city has the requested category
      const dataset = match.config.datasets[args.category];
      if (!dataset) {
        const available = Object.keys(match.config.datasets).join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `${match.config.name} doesn't have ${args.category} data. Available categories: ${available}`,
            },
          ],
        };
      }

      // Fetch data from Socrata
      try {
        const rows = await querySocrata({
          domain: match.config.domain,
          dataset,
          limit: args.limit,
          daysBack: args.daysBack,
        });

        const formatted = formatSocrataResults(rows, dataset);

        return {
          content: [
            {
              type: "text" as const,
              text: `# ${match.config.name} — ${args.category} data\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching ${args.category} data for ${match.config.name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 2: list_available_data ---
  // Discovery tool. Helps Claude know what to ask for.
  server.registerTool(
    "list_available_data",
    {
      title: "List Available City Data",
      description:
        "List all supported cities and the data categories available for each. Use this to discover what data you can query.",
      inputSchema: z.object({}),
    },
    async () => {
      const cities = listCities();
      const cityList = cities
        .map(
          (c) =>
            `- **${c.name}** (${c.key}): ${c.categories.join(", ")}`
        )
        .join("\n");

      const censusList = "Any US city, town, or CDP (~30,000 places)";

      const fredCities = listFredCities();
      const fredList = fredCities.map((c) => c.name).join(", ");

      const fbiCities = listFbiCities();
      const blsCities = listBlsCities();

      return {
        content: [
          {
            type: "text" as const,
            text: `# Civic Data Hub — Available Data

## Supported Countries: US, UK, Canada

Most tools now support all three countries. Pass \`country: "US"\`, \`"UK"\`, or \`"CA"\` — or let it auto-detect from the city name. Ambiguous cities (London, Birmingham, Richmond, Hamilton, etc.) require the country parameter.

## Multi-Country Tools
| Tool | US Source | UK Source | CA Source |
| --- | --- | --- | --- |
| \`query_demographics\` | Census ACS (~30K places) | ONS/Nomis Census 2021 | StatCan Census Profile |
| \`query_economics\` | FRED (20 metros) | ONS Beta API | StatCan WDS |
| \`query_employment\` | BLS (20 metros) | ONS/Nomis | StatCan LFS (13 CMAs) |
| \`query_national_crime\` | FBI UCR (state-level) | data.police.uk (street-level) | StatCan CSI (13 CMAs) |
| \`query_weather\` | NWS (any city) | Met Office (METOFFICE_API_KEY) | MSC GeoMet |
| \`query_air_quality\` | EPA AirNow (AIRNOW_API_KEY) | DEFRA UK-AIR (DAQI 1-10) | MSC AQHI (1-10) |
| \`query_housing\` | HUD (~35 cities) | ONS/Land Registry | StatCan/CREA (12 CMAs) |
| \`query_water\` | USGS (~30 cities) | Environment Agency | MSC Hydrometric |
| \`query_representatives\` | Google Civic (CIVIC_KEY) | TheyWorkForYou (TWFY_KEY) | Represent (no key) |
| \`query_schools\` | NCES (${listSchoolCities().length} cities) | DfE GIAS | Not yet |
| \`query_transit\` | NTD (${listTransitCities().length} cities) | DfT (8 cities) | Not yet |
| \`query_budget\` | Municipal budgets (${listBudgetCities().length}) | Local authority (11 cities) | Not yet |
| \`create_city_briefing\` | 14 sources | 11 sources | 9 sources |

## US-Only Tools
- \`query_city_data\` — Socrata crime/311 data (NYC, Chicago, SF, LA, Seattle)
- \`query_311_trends\` — 311 complaint trends (${list311Cities().join(", ")})
- \`compare_demographics\` — side-by-side Census comparison
- \`create_census_cohort\` — fast peer cities (~75 cities)
- \`create_full_cohort\` — rich multi-source peer cities (~50 cities)
- \`query_permits\` — building permit trends (${listPermitCities().length} cities)
- \`query_traffic\` — traffic safety + congestion (${listTrafficCities().length} metros)
- \`map_issue_data\` — cross-reference community issues with data
- \`track_city_changes\` — directional dashboard of city trends`,
          },
        ],
      };
    }
  );

  // --- Tool 3: query_demographics ---
  // Demographic data — US, UK, or Canada.
  server.registerTool(
    "query_demographics",
    {
      title: "Query City Demographics",
      description: `Query demographic data for a city in the US, UK, or Canada.

US: Census ACS — population, income, poverty, education, housing, commuting (~30,000 places).
UK: ONS/Nomis — population, households, age distribution.
CA: StatCan Census Profile — population, income, households, immigration.

Country is auto-detected or specify with the country parameter. Required for ambiguous cities (London, Birmingham, etc.).`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterDemographics(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 4: compare_demographics ---
  // Side-by-side Census comparison for multiple cities.
  server.registerTool(
    "compare_demographics",
    {
      title: "Compare City Demographics",
      description: `Compare demographic data across multiple US cities side by side. Works for ANY US city (~30,000 places). Returns population, income, poverty, education, housing, and commuting.`,
      inputSchema: z.object({
        cities: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe(
            "List of 2-6 city names to compare (e.g., ['Denver', 'Austin', 'Portland'])"
          ),
      }),
    },
    async (args) => {
      const results: Array<{ city: string; error?: string; data?: Awaited<ReturnType<typeof queryCensus>> }> = [];

      for (const cityInput of args.cities) {
        try {
          const data = await queryCensus(cityInput);
          results.push({ city: data.city, data });
        } catch (error) {
          results.push({
            city: cityInput,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Build comparison table
      const successful = results.filter((r) => r.data);
      const failed = results.filter((r) => r.error);

      if (successful.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not fetch data for any of the requested cities. Errors:\n${failed.map((r) => `- ${r.city}: ${r.error}`).join("\n")}`,
            },
          ],
        };
      }

      const fmt = (n: number | null, type: "number" | "dollar" | "percent"): string => {
        if (n === null) return "N/A";
        if (type === "dollar") return `$${n.toLocaleString()}`;
        if (type === "percent") return `${(n * 100).toFixed(1)}%`;
        return n.toLocaleString();
      };

      // Build a comparison summary
      const lines: string[] = ["# City Demographics Comparison\n"];

      // Header row
      const cityNames = successful.map((r) => r.data!.city);
      lines.push(`| Metric | ${cityNames.join(" | ")} |`);
      lines.push(`| --- | ${cityNames.map(() => "---").join(" | ")} |`);

      // Data rows
      const metrics: Array<{ label: string; getValue: (d: NonNullable<typeof results[0]["data"]>) => string }> = [
        { label: "Population", getValue: (d) => fmt(d.demographics.population, "number") },
        { label: "Median Age", getValue: (d) => fmt(d.demographics.medianAge, "number") },
        { label: "Median Income", getValue: (d) => fmt(d.demographics.medianIncome, "dollar") },
        { label: "Per Capita Income", getValue: (d) => fmt(d.demographics.perCapitaIncome, "dollar") },
        { label: "Poverty Rate", getValue: (d) => fmt(d.demographics.povertyRate, "percent") },
        { label: "Bachelor's Degree %", getValue: (d) => fmt(d.demographics.bachelorsDegreeRate, "percent") },
        { label: "Median Home Value", getValue: (d) => fmt(d.housing.medianHomeValue, "dollar") },
        { label: "Median Rent", getValue: (d) => fmt(d.housing.medianRent, "dollar") },
        { label: "Vacancy Rate", getValue: (d) => fmt(d.housing.vacancyRate, "percent") },
        { label: "Drive Alone %", getValue: (d) => fmt(d.commuting.driveAloneRate, "percent") },
        { label: "Public Transit %", getValue: (d) => fmt(d.commuting.publicTransitRate, "percent") },
        { label: "Work From Home %", getValue: (d) => fmt(d.commuting.workFromHomeRate, "percent") },
      ];

      for (const metric of metrics) {
        const values = successful.map((r) => metric.getValue(r.data!));
        lines.push(`| ${metric.label} | ${values.join(" | ")} |`);
      }

      if (failed.length > 0) {
        lines.push(`\n*Could not fetch: ${failed.map((r) => `${r.city} (${r.error})`).join(", ")}*`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.join("\n"),
          },
        ],
      };
    }
  );

  // --- Tool 5: query_economics ---
  // Economic data — US FRED, UK ONS, or StatCan.
  server.registerTool(
    "query_economics",
    {
      title: "Query City Economic Data",
      description: `Query economic indicators for a city in the US, UK, or Canada.

US: FRED — unemployment, employment, housing price index, per capita income (20 major metros).
UK: ONS — CPI, GDP, regional GVA, unemployment.
CA: StatCan — CPI, GDP, retail trade (national/provincial).

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterEconomics(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 6: query_national_crime ---
  // Crime data — US FBI, UK Police, or StatCan UCR.
  server.registerTool(
    "query_national_crime",
    {
      title: "Query Crime Statistics",
      description: `Query crime data for a city in the US, UK, or Canada.

US: FBI UCR — state-level violent/property crime, homicide, robbery, assault, multi-year trends.
UK: data.police.uk — street-level crime by category (anti-social behaviour, burglary, robbery, violence, etc.).
CA: StatCan UCR — Crime Severity Index, violent/non-violent CSI, homicide rate (CMA level).

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterCrime(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 7: query_employment ---
  // Employment data — US BLS, UK ONS, or StatCan LFS.
  server.registerTool(
    "query_employment",
    {
      title: "Query City Employment Data",
      description: `Query employment statistics for a city in the US, UK, or Canada.

US: BLS — metro unemployment rate, total employment, labor force (20 major metros).
UK: ONS/Nomis — regional unemployment rate.
CA: StatCan LFS — unemployment, employment, participation rates (13 CMAs).

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterEmployment(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 8: create_census_cohort ---
  // Fast demographic-only cohort using Census data (~75 cities pool).
  server.registerTool(
    "create_census_cohort",
    {
      title: "Create Census Peer Cohort (Fast)",
      description: `Find peer cities based on Census demographic data. Fast — uses only Census ACS data across ~75 cities.

Compares: population, income, poverty, education, housing costs, commuting patterns, region.

Criteria: "balanced", "size", "economics", "housing", "education", "commuting", "region".

Use this for quick demographic peer matching. For richer multi-source comparison (economics, crime, employment), use create_full_cohort instead.`,
      inputSchema: z.object({
        city: z
          .string()
          .describe("Target city to find peers for (e.g., 'Denver', 'Austin')"),
        criteria: z
          .enum(["balanced", "size", "economics", "housing", "education", "commuting", "region"])
          .default("balanced")
          .describe("What dimensions to weight most in finding peers"),
        cohortSize: z
          .number()
          .min(3)
          .max(10)
          .default(5)
          .describe("How many peer cities to return (default 5)"),
      }),
    },
    async (args) => {
      try {
        const result = await buildCohort(args.city, args.criteria as CohortCriteria, args.cohortSize as number);
        const formatted = formatCohortResults(result);
        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error building cohort for "${args.city}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 9: create_full_cohort ---
  // Rich multi-source cohort using Census + FRED + BLS + FBI (~50 cities).
  server.registerTool(
    "create_full_cohort",
    {
      title: "Create Full Peer Cohort (Rich)",
      description: `Find peer cities using ALL data sources: Census demographics, FRED economics, BLS employment, and FBI crime data. Richer but slower than create_census_cohort (~50 cities pool).

Compares across 12 dimensions: population, income, poverty, education, home values, rent, housing price trend, unemployment, job growth, per-capita income, violent crime rate, and geographic region.

Criteria options:
- "balanced" (default) — even weight across all dimensions
- "economics" — prioritize unemployment, job growth, income
- "livability" — prioritize crime, education, poverty
- "safety" — heavily weight crime rates
- "growth" — prioritize job growth, housing trends, employment
- "affordability" — prioritize home values, rent, housing costs

Use this for comprehensive benchmarking. Takes longer due to multi-source API calls.`,
      inputSchema: z.object({
        city: z
          .string()
          .describe("Target city to find peers for (e.g., 'Denver', 'Austin')"),
        criteria: z
          .enum(["balanced", "economics", "livability", "safety", "growth", "affordability"])
          .default("balanced")
          .describe("What dimensions to weight most"),
        cohortSize: z
          .number()
          .min(3)
          .max(10)
          .default(5)
          .describe("How many peer cities to return (default 5)"),
      }),
    },
    async (args) => {
      try {
        const result = await buildFullCohort(args.city, args.criteria as FullCohortCriteria, args.cohortSize as number);
        const formatted = formatFullCohortResults(result);
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error building full cohort for "${args.city}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // --- Tool 10: query_weather ---
  server.registerTool(
    "query_weather",
    {
      title: "Query City Weather",
      description: `Get current weather conditions and forecast for a city in the US, UK, or Canada.

US: National Weather Service — conditions, forecast, alerts. No API key needed.
UK: Met Office DataHub — hourly forecast. Requires METOFFICE_API_KEY.
CA: MSC GeoMet — current conditions and forecast. No API key needed.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterWeather(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 10: query_air_quality ---
  server.registerTool(
    "query_air_quality",
    {
      title: "Query Air Quality",
      description: `Get air quality data for a city in the US, UK, or Canada.

US: EPA AirNow — AQI (0-500 scale). Requires AIRNOW_API_KEY.
UK: DEFRA UK-AIR — DAQI (1-10 scale). No API key needed.
CA: MSC — AQHI (1-10+ scale). No API key needed.

Note: Each country uses a different scale. Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterAirQuality(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 11: query_housing ---
  server.registerTool(
    "query_housing",
    {
      title: "Query Housing Data",
      description: `Get housing data for a city in the US, UK, or Canada.

US: HUD — Fair Market Rents, area median income, income limits. No API key needed.
UK: ONS/Land Registry — house prices, annual change. No API key needed.
CA: StatCan/CREA — average/median price, price change, housing starts.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterHousing(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 12: query_water ---
  server.registerTool(
    "query_water",
    {
      title: "Query Water Conditions",
      description: `Get real-time water monitoring data for a city in the US, UK, or Canada.

US: USGS — streamflow, gage height, water temperature. No API key needed.
UK: Environment Agency — water levels, flow rates, flood warnings (England only). No API key needed.
CA: MSC Hydrometric — water levels, discharge. No API key needed.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterWater(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 13: query_representatives ---
  server.registerTool(
    "query_representatives",
    {
      title: "Query Elected Representatives",
      description: `Look up elected officials for a city in the US, UK, or Canada.

US: Google Civic — federal, state, local officials. Requires GOOGLE_CIVIC_API_KEY.
UK: TheyWorkForYou — MPs, constituency. Requires TWFY_API_KEY.
CA: Represent (Open North) — federal MP, provincial MLA/MPP, municipal councillors. No API key needed.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        address: z.string().describe("City name or address (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterRepresentatives(args.address, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 14: query_311_trends --- (US only)
  server.registerTool(
    "query_311_trends",
    {
      title: "Query 311 Service Request Trends",
      description: `Analyze 311 service request trends for a US city. Returns top complaint categories, request volumes, and monthly trends. US only.

Available cities: ${list311Cities().join(", ")}.

Great for understanding what residents are actually reporting: potholes, noise, graffiti, homeless encampments, etc.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'NYC', 'Chicago', 'SF')"),
        days: z.number().min(7).max(365).default(90).describe("Lookback period in days (default 90)"),
      }),
    },
    async (args) => {
      try {
        const result = await query311Trends(args.city, args.days as number);
        return { content: [{ type: "text" as const, text: `# ${result.city} — 311 Trends\n\n${format311Results(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 15: query_transit ---
  server.registerTool(
    "query_transit",
    {
      title: "Query Public Transit / Transport",
      description: `Public transit and transport data for a city in the US or UK.

US: NTD — ridership by agency and mode, service hours, efficiency (${listTransitCities().length} cities).
UK: DfT — road traffic, bus passengers, rail station usage (8 major cities).
CA: Not yet available.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'NYC', 'Manchester', 'Chicago')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterTransport(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 16: query_schools ---
  server.registerTool(
    "query_schools",
    {
      title: "Query School Data",
      description: `School data for a city in the US or UK.

US: NCES — enrollment, student-teacher ratios, finance data (${listSchoolCities().length} cities).
UK: DfE GIAS — school counts, types, Ofsted ratings by local authority.
CA: Not yet available.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Austin')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterSchools(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 17: query_permits --- (US only)
  server.registerTool(
    "query_permits",
    {
      title: "Query Building Permits",
      description: `Building permit trends from the Census Bureau's Building Permits Survey. US only. Shows 5-year trend (2020-2024) of permits and housing units authorized at the county level.

${listPermitCities().length} cities available. Rising permits = development activity; declining = slowdown.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Austin', 'Phoenix', 'Seattle')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryPermits(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Building Permits\n\n${formatPermitResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 18: query_budget ---
  server.registerTool(
    "query_budget",
    {
      title: "Query City Budget",
      description: `City government budget data for a city in the US or UK.

US: Published municipal budgets — total budget, per-capita spending, category breakdown (${listBudgetCities().length} cities).
UK: Local authority spending — council tax Band D, total spending, category breakdown (11 cities).
CA: Not yet available.

Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'NYC', 'Manchester', 'Denver')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterBudget(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool: query_traffic --- (US only)
  server.registerTool(
    "query_traffic",
    {
      title: "Query Traffic Safety & Congestion",
      description: `Traffic safety data from NHTSA FARS and TTI congestion metrics. US only. Returns fatal crash statistics (2019-2022) including pedestrian, cyclist, and alcohol-related breakdowns.

County-level data as primary view with state-level context. Congestion data for ${listTrafficCities().length} metros.

No API key needed. Works for any US city via geo-resolver.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Austin', 'NYC')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryTraffic(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Traffic Safety\n\n${formatTrafficResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 19: create_city_briefing ---
  server.registerTool(
    "create_city_briefing",
    {
      title: "Create Comprehensive City Briefing",
      description: `Pull data from ALL available sources and assemble a structured executive briefing for a city in the US, UK, or Canada.

US: 14 data sources (Census, FRED, BLS, FBI, NWS, AirNow, HUD, USGS, Civic, 311, Transit, Schools, Permits, Budget).
UK: 11 data sources (ONS demographics/economics/housing, Police crime, Met Office, DEFRA, Environment Agency, DfT, DfE, TWFY, Budget).
CA: 9 data sources (StatCan demographics/economics/employment/crime/housing, MSC weather/air/water, Represent).

The "give me everything" tool. Takes 10-20 seconds. Country auto-detected or specify with country parameter.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Manchester', 'Toronto')"),
        country: countryParam,
      }),
    },
    async (args) => {
      try {
        const result = await adapterBriefing(args.city, args.country as Country | undefined);
        return { content: [{ type: "text" as const, text: result.formatted }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error creating briefing for "${args.city}": ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 20: map_issue_data ---
  server.registerTool(
    "map_issue_data",
    {
      title: "Map Community Issue to Data",
      description: `Given a community concern or issue topic, find all relevant hard data for a city. The cross-reference engine — "residents say X, here's what the data shows."

Available topics: ${listIssueTopics().join(", ")}.

Also accepts free-text issues (matched to closest topic by keywords).

Example: "housing affordability" in Denver → pulls home values, rent, FMR, permits, housing budget allocation.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'NYC')"),
        issue: z.string().describe("Issue topic or free-text concern (e.g., 'housing affordability', 'public safety', 'residents complain about potholes')"),
      }),
    },
    async (args) => {
      try {
        const result = await mapIssueData(args.city, args.issue);
        return { content: [{ type: "text" as const, text: formatIssueData(result) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error mapping issue data: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool 21: track_city_changes ---
  server.registerTool(
    "track_city_changes",
    {
      title: "Track City Changes Over Time",
      description: `Show how a city is changing — what's improving, declining, or holding steady. Pulls trend data from BLS (unemployment), FRED (economics), FBI (crime), building permits, and 311 complaints.

Returns a directional dashboard: each metric tagged as improving, declining, or stable with supporting data. Great for spotting momentum or emerging problems.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Austin', 'NYC')"),
      }),
    },
    async (args) => {
      try {
        const result = await trackCityChanges(args.city);
        return { content: [{ type: "text" as const, text: formatChangeTracker(result) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error tracking changes for "${args.city}": ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool: query_public_health ---
  server.registerTool(
    "query_public_health",
    {
      title: "Query Public Health Data",
      description: `Get public health indicators from CDC PLACES for a US city. Returns 30+ measures including obesity, diabetes, depression, mental health, smoking, binge drinking, insurance coverage, food insecurity, housing insecurity, loneliness, and disability rates.

Data from BRFSS (Behavioral Risk Factor Surveillance System). Covers 500+ US cities. No API key needed.

Great for: understanding community health challenges, anchoring social media health discussions with data.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Austin', 'NYC')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryPublicHealth(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Public Health\n\n${formatPublicHealthResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool: query_homelessness ---
  server.registerTool(
    "query_homelessness",
    {
      title: "Query Homelessness Data",
      description: `HUD Point-in-Time (PIT) homelessness counts for US cities. Returns total homeless, sheltered vs unsheltered, chronic homelessness, veterans, families, unaccompanied youth, per-capita rates, and year-over-year trends.

${listHomelessCities().length} cities available. Data from January 2024 PIT count (AHAR Part 1).`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Los Angeles', 'Seattle')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryHomelessness(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Homelessness\n\n${formatHomelessnessResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool: query_cost_of_living ---
  server.registerTool(
    "query_cost_of_living",
    {
      title: "Query Cost of Living (CPI)",
      description: `Consumer Price Index data by metro area from the Bureau of Labor Statistics. Shows overall inflation rate and breakdown by category: food, housing, transportation, medical care, and energy.

${listCpiCities().length} metros available. Includes year-over-year inflation rates and monthly trend data.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'NYC', 'Chicago')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryCpi(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Cost of Living (CPI)\n\n${formatCpiResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // --- Tool: query_migration ---
  server.registerTool(
    "query_migration",
    {
      title: "Query Population Migration & Mobility",
      description: `Census geographic mobility data showing population movement patterns. Returns what percentage of a city's population moved in from a different state or abroad in the past year, vs stayed in the same house.

Works for any US city (~30,000 places). Uses ACS 5-Year estimates, Table B07003.`,
      inputSchema: z.object({
        city: z.string().describe("City name (e.g., 'Denver', 'Austin', 'Boise')"),
      }),
    },
    async (args) => {
      try {
        const result = await queryMigration(args.city);
        return { content: [{ type: "text" as const, text: `# ${result.city} — Migration & Mobility\n\n${formatMigrationResults(result)}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // UK-ONLY TOOLS (no US/CA equivalent — most UK data now via unified tools + country param)
  // ══════════════════════════════════════════════════════════════════════════

  // Removed: query_uk_demographics → use query_demographics with country: "UK"

  /* Removed separate UK tools — now unified:
     query_uk_crime → query_national_crime(country: "UK")
     query_uk_economics → query_economics(country: "UK")
     query_uk_housing → query_housing(country: "UK")
     query_uk_weather → query_weather(country: "UK")
     query_uk_air_quality → query_air_quality(country: "UK")
     query_uk_flood_water → query_water(country: "UK")
     query_uk_schools → query_schools(country: "UK")
     query_uk_planning → (UK-only, no adapter yet)
     query_uk_transport → query_transit(country: "UK")
     query_uk_budget → query_budget(country: "UK")
     query_uk_representatives → query_representatives(country: "UK")
     query_uk_migration → (UK-only, no adapter yet)
     create_uk_city_briefing → create_city_briefing(country: "UK")
  */

  // The block below was originally all separate UK tools.
  // They have been removed. Only search_uk_datasets remains.

  server.registerTool(
    "search_uk_datasets",
    {
      title: "Search UK Open Data",
      description: `Search the UK government's open data catalogue (data.gov.uk).

Returns dataset titles, publishers, formats, and links. No API key required.`,
      inputSchema: z.object({
        query: z.string().describe("Search query (e.g., 'air quality', 'crime statistics', 'housing')"),
        limit: z.number().default(10).describe("Maximum results to return (default 10)"),
      }),
    },
    async (args) => {
      try {
        const result = await searchUkDatasets(args.query, args.limit);
        return { content: [{ type: "text" as const, text: formatUkDatasetResults(result) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // create_uk_city_briefing → use create_city_briefing with country: "UK"

  return server;
}

// ── REST API helpers ────────────────────────────────────────────────────────

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

/** Create Express router with all REST API endpoints for the dashboard UI */
function createApiRouter(): express.Router {
  const router = express.Router();

  // City list
  router.get("/cities", (_req, res) => {
    const citySet = new Set<string>();
    for (const c of listCities()) citySet.add(c.name);
    for (const c of listFredCities()) citySet.add(c.name);
    for (const c of listBlsCities()) citySet.add(c.name);
    for (const c of listFbiCities()) citySet.add(c.name);
    for (const c of list311Cities()) citySet.add(c.name);
    for (const c of listTransitCities()) citySet.add(c.name);
    for (const c of listSchoolCities()) citySet.add(c.name);
    for (const c of listPermitCities()) citySet.add(c.name);
    for (const c of listBudgetCities()) citySet.add(c.name);
    for (const c of listTrafficCities()) citySet.add(c.name);
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
    res.json({ data: Array.from(citySet).sort() });
  });

  // Data endpoints
  router.get("/census/:city", safeHandler(async (city) => queryCensus(city)));
  router.get("/economics/:city", safeHandler(async (city) => {
    const match = resolveFredCity(city);
    if (!match) throw new Error(`City "${city}" not found in FRED data`);
    return queryFred(match.key);
  }));
  router.get("/employment/:city", safeHandler(async (city) => {
    const match = resolveBlsCity(city);
    if (!match) throw new Error(`City "${city}" not found in BLS data`);
    return queryBls(match.key);
  }));
  router.get("/crime/:city", safeHandler(async (city) => {
    const match = await resolveFbiCityAsync(city);
    if (!match) throw new Error(`City "${city}" not found in FBI data`);
    return queryFbiCrime(match.config.state, match.key);
  }));
  router.get("/traffic/:city", safeHandler(async (city) => queryTraffic(city)));
  router.get("/weather/:city", safeHandler(async (city) => queryWeather(city)));
  router.get("/housing/:city", safeHandler(async (city) => queryHud(city)));
  router.get("/air-quality/:city", safeHandler(async (city) => queryAirQuality(city)));
  router.get("/water/:city", safeHandler(async (city) => queryWater(city)));
  router.get("/representatives/:city", safeHandler(async (city) => queryCivic(city)));
  router.get("/311/:city", safeHandler(async (city, req) => {
    const days = parseInt(req.query.days as string) || 90;
    return query311Trends(city, days);
  }));
  router.get("/transit/:city", safeHandler(async (city) => queryTransit(city)));
  router.get("/schools/:city", safeHandler(async (city) => querySchools(city)));
  router.get("/permits/:city", safeHandler(async (city) => queryPermits(city)));
  router.get("/budget/:city", safeHandler(async (city) => queryBudget(city)));
  router.get("/briefing/:city", safeHandler(async (city) => buildCityBriefing(city)));
  router.get("/changes/:city", safeHandler(async (city) => trackCityChanges(city)));

  // New data sources
  router.get("/public-health/:city", safeHandler(async (city) => queryPublicHealth(city)));
  router.get("/homelessness/:city", safeHandler(async (city) => queryHomelessness(city)));
  router.get("/cost-of-living/:city", safeHandler(async (city) => queryCpi(city)));
  router.get("/migration/:city", safeHandler(async (city) => queryMigration(city)));

  return router;
}

/**
 * Start the server in the appropriate transport mode.
 *
 * - Default (no args): stdio mode — for Claude Code / Claude Desktop
 * - --http flag or PORT env var: HTTP mode — for remote deployment (Vercel, Railway, etc.)
 */
async function main() {
  const useHttp = process.argv.includes("--http") || !!process.env.PORT;

  if (useHttp) {
    // HTTP mode: Express serves both MCP + REST API
    const port = parseInt(process.env.PORT || "3000", 10);
    const app = express();
    app.use(cors({ origin: true }));

    // Health check
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", server: "city-data-mcp", version: "0.2.0" });
    });

    // ── REST API for Dashboard UI ───────────────────────────────────────
    app.use("/api", createApiRouter());

    // ── MCP Protocol Endpoint ───────────────────────────────────────────
    // Per-session MCP server + transport pairs (upstream pattern)
    const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

    // MCP POST — tool calls & initialization
    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let session = sessionId ? sessions.get(sessionId) : undefined;

      if (!session) {
        // New session — create a fresh server + transport pair
        const sessionServer = await createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
        });
        transport.onclose = () => {
          const sid = (transport as any).sessionId;
          if (sid) sessions.delete(sid);
        };
        await sessionServer.connect(transport);
        session = { transport, server: sessionServer };

        // Handle request first — assigns session ID
        await transport.handleRequest(req, res);
        const assignedId = (transport as any).sessionId;
        if (assignedId) sessions.set(assignedId, session);
        return;
      }

      await session.transport.handleRequest(req, res);
    });

    // MCP GET — SSE stream for server-initiated messages
    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (session) {
        await session.transport.handleRequest(req, res);
        return;
      }
      res.status(400).json({ error: "No session found. Send a POST first." });
    });

    // MCP DELETE — close session
    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (session) {
        await session.transport.handleRequest(req, res);
        sessions.delete(sessionId!);
        return;
      }
      res.status(404).end();
    });

    // 404 fallback
    app.use((_req, res) => {
      res.status(404).json({ error: "Not found. Use /mcp for MCP, /api for REST, or /health for status." });
    });

    app.listen(port, () => {
      console.error(`[city-data-mcp] HTTP server running on port ${port}`);
      console.error(`[city-data-mcp] MCP endpoint: http://localhost:${port}/mcp`);
      console.error(`[city-data-mcp] REST API:     http://localhost:${port}/api/cities`);
      console.error(`[city-data-mcp] Health check: http://localhost:${port}/health`);
    });
  } else {
    // Stdio mode: for Claude Code / Claude Desktop (local)
    const server = await createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[city-data-mcp] Server started in stdio mode, waiting for requests...");
  }
}

main().catch((error) => {
  console.error("[city-data-mcp] Fatal error:", error);
  process.exit(1);
});
