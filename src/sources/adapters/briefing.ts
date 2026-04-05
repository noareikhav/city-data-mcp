/**
 * Briefing Adapter — Routes to US, UK, or CA city briefing
 */

import { resolveCity } from "../../geo/resolver.js";
import { buildCityBriefing as buildUSBriefing, formatBriefing as formatUSBriefing } from "../us/briefing.js";
import { buildUkCityBriefing } from "../uk/briefing.js";
import { buildCACityBriefing, formatCABriefing } from "../ca/briefing.js";
import type { Country } from "../../types.js";

export async function queryBriefing(city: string, country?: Country) {
  const geo = await resolveCity(city, country);
  switch (geo.country) {
    case 'US': {
      const r = await buildUSBriefing(city);
      return { country: 'US' as const, formatted: formatUSBriefing(r), raw: r };
    }
    case 'UK': {
      // Max's UK briefing returns a formatted string directly
      const formatted = await buildUkCityBriefing(city);
      return { country: 'UK' as const, formatted, raw: formatted };
    }
    case 'CA': {
      const r = await buildCACityBriefing(geo);
      return { country: 'CA' as const, formatted: formatCABriefing(r), raw: r };
    }
  }
}
