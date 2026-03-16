/**
 * Socrata API Client
 *
 * Socrata powers open data portals for NYC, Chicago, SF, LA, Seattle, and many
 * other US cities. They all use the same API — the only difference is the domain
 * (e.g., data.cityofnewyork.us vs data.cityofchicago.org) and dataset IDs.
 *
 * How it works:
 * 1. Each dataset has a unique ID (like "5uac-w243" for NYC crime)
 * 2. You query it with SoQL — a SQL-like language over HTTPS
 * 3. The API returns JSON — an array of row objects
 * 4. No authentication needed for public data (up to 1,000 requests/hour)
 *
 * Example API call:
 * https://data.cityofnewyork.us/resource/5uac-w243.json?$limit=10&$order=cmplnt_fr_dt DESC
 */

import type { DatasetConfig, SocrataRow } from "../types.js";

export interface SocrataQueryOptions {
  domain: string; // e.g., "data.cityofnewyork.us"
  dataset: DatasetConfig; // dataset config from city-registry
  limit?: number; // max rows to return (default 20)
  daysBack?: number; // how many days of recent data (default 30)
  where?: string; // additional SoQL filter
}

export async function querySocrata(
  options: SocrataQueryOptions
): Promise<SocrataRow[]> {
  const { domain, dataset, limit = 20, daysBack = 30, where } = options;

  // Build the SoQL query
  // $where filters by date (last N days)
  // $order sorts newest first
  // $limit caps the number of rows
  const dateFilter = `${dataset.dateField} > '${daysAgo(daysBack)}'`;
  const fullWhere = where ? `${dateFilter} AND ${where}` : dateFilter;

  const params = new URLSearchParams({
    $where: fullWhere,
    $order: `${dataset.dateField} DESC`,
    $limit: String(limit),
  });

  const url = `https://${domain}/resource/${dataset.id}.json?${params}`;

  console.error(`[city-data-mcp] Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Socrata API error (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as SocrataRow[];
  console.error(`[city-data-mcp] Got ${data.length} rows`);
  return data;
}

// Helper: get a date string N days ago in YYYY-MM-DD format
function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split("T")[0];
}

/**
 * Format raw Socrata rows into a readable summary for Claude.
 * Picks the most relevant fields so the response isn't overwhelming.
 */
export function formatSocrataResults(
  rows: SocrataRow[],
  dataset: DatasetConfig
): string {
  if (rows.length === 0) {
    return "No data found for the specified criteria.";
  }

  // Count occurrences of the description field (e.g., crime types, complaint types)
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const desc = String(row[dataset.descriptionField] || "Unknown").trim();
    counts[desc] = (counts[desc] || 0) + 1;
  }

  // Sort by frequency
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topCategories = sorted
    .slice(0, 10)
    .map(([name, count]) => `  - ${name}: ${count}`)
    .join("\n");

  // Get date range from results
  const dates = rows
    .map((r) => r[dataset.dateField])
    .filter(Boolean)
    .map((d) => String(d))
    .sort();

  const dateRange =
    dates.length > 0
      ? `${dates[0]?.slice(0, 10)} to ${dates[dates.length - 1]?.slice(0, 10)}`
      : "unknown";

  return `**${dataset.name}** (${rows.length} records, ${dateRange})

Top categories:
${topCategories}

Sample records:
${rows
  .slice(0, 5)
  .map((row) => {
    const desc = row[dataset.descriptionField] || "N/A";
    const date = String(row[dataset.dateField] || "").slice(0, 10);
    const location = dataset.locationFields
      .map((f) => row[f])
      .filter(Boolean)
      .join(", ");
    return `  - [${date}] ${desc}${location ? ` (${location})` : ""}`;
  })
  .join("\n")}`;
}
