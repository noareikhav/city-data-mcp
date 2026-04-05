/**
 * Demographics Adapter — Routes to US Census, UK ONS, or StatCan
 */

import { resolveCity } from "../../geo/resolver.js";
import { queryCensus, formatCensusResults } from "../us/census.js";
import { queryUkDemographics, formatUkDemographicsResults } from "../uk/ons-demographics.js";
import { queryStatCanDemographics, formatStatCanResults } from "../ca/statcan-demographics.js";
import type { Country } from "../../types.js";

export async function queryDemographics(city: string, country?: Country) {
  const geo = await resolveCity(city, country);
  switch (geo.country) {
    case 'US': {
      const r = await queryCensus(city);
      return { country: 'US' as const, formatted: formatCensusResults(r), raw: r };
    }
    case 'UK': {
      const r = await queryUkDemographics(city);
      return { country: 'UK' as const, formatted: formatUkDemographicsResults(r), raw: r };
    }
    case 'CA': {
      const r = await queryStatCanDemographics(geo);
      return { country: 'CA' as const, formatted: formatStatCanResults(r), raw: r };
    }
  }
}
