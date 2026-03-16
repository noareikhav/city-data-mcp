/**
 * Google Civic Information API Client
 *
 * "Who represents this address?" — returns elected officials at all levels
 * (federal, state, county, city) for any US address.
 *
 * API key: Free via Google Cloud Console
 * Enable "Google Civic Information API" and create an API key.
 * Set as GOOGLE_CIVIC_API_KEY environment variable.
 *
 * Docs: https://developers.google.com/civic-information
 */

const BASE_URL = "https://www.googleapis.com/civicinfo/v2/representatives";

export interface CivicResult {
  address: string;
  normalizedAddress: string;
  officials: Array<{
    name: string;
    office: string;
    party: string;
    phones: string[];
    urls: string[];
    channels: Array<{ type: string; id: string }>;
  }>;
  divisions: string[];
}

/**
 * Look up elected representatives for a city/address.
 */
export async function queryCivic(address: string): Promise<CivicResult> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CIVIC_API_KEY not set. Enable the Civic Information API in Google Cloud Console and create an API key.");
  }

  // If just a city name, append "City Hall" to get a valid address
  const query = address.includes(",") || /\d/.test(address) ? address : `${address} City Hall`;

  const url = `${BASE_URL}?address=${encodeURIComponent(query)}&key=${apiKey}`;
  console.error(`[city-data-mcp] Civic: ${url.replace(apiKey, "***")}`);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Civic API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as any;

  const normalizedAddress = data.normalizedInput
    ? `${data.normalizedInput.line1 || ""} ${data.normalizedInput.city || ""}, ${data.normalizedInput.state || ""} ${data.normalizedInput.zip || ""}`.trim()
    : address;

  const offices: Array<{ name: string; officialIndices: number[] }> = data.offices || [];
  const rawOfficials: any[] = data.officials || [];

  const officials: CivicResult["officials"] = [];

  for (const office of offices) {
    for (const idx of office.officialIndices || []) {
      const official = rawOfficials[idx];
      if (!official) continue;

      officials.push({
        name: official.name || "Unknown",
        office: office.name || "Unknown Office",
        party: official.party || "Unknown",
        phones: official.phones || [],
        urls: official.urls || [],
        channels: (official.channels || []).map((c: any) => ({
          type: c.type || "",
          id: c.id || "",
        })),
      });
    }
  }

  const divisions = Object.keys(data.divisions || {});

  return {
    address,
    normalizedAddress,
    officials,
    divisions,
  };
}

export function formatCivicResults(result: CivicResult): string {
  const lines: string[] = [
    `**Representatives for ${result.normalizedAddress}**\n`,
  ];

  if (result.officials.length === 0) {
    lines.push("No representatives found for this address.");
    return lines.join("\n");
  }

  // Group by level: federal, state, local
  const federal = result.officials.filter(o =>
    o.office.includes("President") || o.office.includes("Vice President") ||
    o.office.includes("U.S. Senator") || o.office.includes("U.S. Representative")
  );
  const state = result.officials.filter(o =>
    o.office.includes("Governor") || o.office.includes("State") ||
    o.office.includes("Lieutenant") || o.office.includes("Attorney General") ||
    o.office.includes("Secretary of State") || o.office.includes("Comptroller") ||
    o.office.includes("Treasurer")
  );
  const local = result.officials.filter(o =>
    !federal.includes(o) && !state.includes(o)
  );

  if (federal.length > 0) {
    lines.push("**Federal:**");
    for (const o of federal) {
      lines.push(`- **${o.office}**: ${o.name} (${o.party})${formatContact(o)}`);
    }
  }

  if (state.length > 0) {
    lines.push("\n**State:**");
    for (const o of state) {
      lines.push(`- **${o.office}**: ${o.name} (${o.party})${formatContact(o)}`);
    }
  }

  if (local.length > 0) {
    lines.push("\n**Local:**");
    for (const o of local) {
      lines.push(`- **${o.office}**: ${o.name} (${o.party})${formatContact(o)}`);
    }
  }

  return lines.join("\n");
}

function formatContact(official: CivicResult["officials"][0]): string {
  const parts: string[] = [];
  if (official.phones.length > 0) parts.push(official.phones[0]);
  if (official.urls.length > 0) parts.push(official.urls[0]);
  return parts.length > 0 ? ` | ${parts.join(" | ")}` : "";
}
