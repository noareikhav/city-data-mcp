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
import { z } from "zod";
import { resolveCity, listCities } from "./cities.js";
import { querySocrata, formatSocrataResults } from "./sources/socrata.js";

async function main() {
  // Step 1: Create the MCP server
  // This tells Claude: "I'm city-data-mcp, version 0.1.0, and I have tools."
  const server = new McpServer(
    {
      name: "city-data-mcp",
      version: "0.1.0",
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
      description: `Query publicly available data for a US city by category.

Supported cities: NYC, Chicago, San Francisco, Los Angeles, Seattle
Supported categories: crime, 311

Returns recent data with category breakdown and sample records.
Use this to explore what's happening in a specific city.`,
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

      return {
        content: [
          {
            type: "text" as const,
            text: `# Available City Data\n\n${cityList}\n\nUse \`query_city_data\` to fetch data for any city/category combination.`,
          },
        ],
      };
    }
  );

  // Step 3: Connect via stdio transport
  // This is how Claude Code communicates with the server:
  // Claude sends JSON-RPC messages to our stdin, we respond on stdout.
  // console.error goes to logs (not seen by Claude).
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[city-data-mcp] Server started, waiting for requests...");
}

main().catch((error) => {
  console.error("[city-data-mcp] Fatal error:", error);
  process.exit(1);
});
