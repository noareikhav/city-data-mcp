/**
 * City Lookup
 *
 * Resolves user input ("NYC", "new york", "San Fran") to the right city config.
 * Loads the registry from data/city-registry.json.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { CityConfig, CityRegistry } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let registry: CityRegistry | null = null;

function loadRegistry(): CityRegistry {
  if (registry) return registry;

  const possiblePaths = [
    path.join(__dirname, "..", "data", "city-registry.json"),
    path.join(__dirname, "..", "..", "data", "city-registry.json"),
    path.join(process.cwd(), "data", "city-registry.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      registry = JSON.parse(content) as CityRegistry;
      return registry;
    }
  }

  throw new Error(
    `City registry not found. Tried: ${possiblePaths.join(", ")}`
  );
}

/**
 * Look up a city by name, alias, or key.
 * Returns the city config or null if not found.
 */
export function resolveCity(input: string): { key: string; config: CityConfig } | null {
  const reg = loadRegistry();
  const normalized = input.toLowerCase().trim();

  // Try exact key match first (e.g., "nyc", "sf")
  if (reg[normalized]) {
    return { key: normalized, config: reg[normalized] };
  }

  // Try alias match (e.g., "new york", "san fran")
  for (const [key, config] of Object.entries(reg)) {
    if (config.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return { key, config };
    }
    // Also match the full name
    if (config.name.toLowerCase() === normalized) {
      return { key, config };
    }
  }

  return null;
}

/**
 * List all available cities with their supported categories.
 */
export function listCities(): Array<{
  key: string;
  name: string;
  state: string;
  categories: string[];
}> {
  const reg = loadRegistry();
  return Object.entries(reg).map(([key, config]) => ({
    key,
    name: config.name,
    state: config.state,
    categories: Object.keys(config.datasets),
  }));
}
