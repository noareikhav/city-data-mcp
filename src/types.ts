/**
 * Type definitions for city-data-mcp
 *
 * These types describe the shape of data flowing through the server:
 * - CityRegistry: the config file mapping cities to their data sources
 * - QueryResult: what we return to Claude after fetching data
 */

// A single dataset config (e.g., NYC crime data)
export interface DatasetConfig {
  id: string; // Socrata dataset ID (e.g., "5uac-w243")
  name: string; // Human-readable name
  dateField: string; // Column name for dates in this dataset
  descriptionField: string; // Column name for the main description/category
  locationFields: string[]; // Column names for location info
}

// A city's full config
export interface CityConfig {
  name: string; // Full name (e.g., "New York City")
  state: string;
  population: number;
  domain: string; // Socrata domain (e.g., "data.cityofnewyork.us")
  aliases: string[]; // Alternative names for fuzzy matching
  datasets: Record<string, DatasetConfig>; // Available datasets by category
}

// The full registry (loaded from data/city-registry.json)
export type CityRegistry = Record<string, CityConfig>;

// What the Socrata API returns (array of key-value objects)
export type SocrataRow = Record<string, string | number | null>;

// Categories of data we support
export const CATEGORIES = ["crime", "311", "housing", "permits"] as const;
export type Category = (typeof CATEGORIES)[number];

// Formatted result returned to Claude
export interface QueryResult {
  city: string;
  category: string;
  datasetName: string;
  totalResults: number;
  rows: SocrataRow[];
  summary: string;
}
