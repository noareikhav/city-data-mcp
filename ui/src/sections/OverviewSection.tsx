import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SectionProps {
  city: string;
}

interface CensusData {
  city: string;
  state: string;
  demographics: {
    population: number;
    medianAge: number;
    medianIncome: number;
    perCapitaIncome: number;
    povertyRate: number;
    bachelorsDegreeRate: number;
  };
  housing: {
    medianHomeValue: number;
    medianRent: number;
    totalHousingUnits: number;
    vacancyRate: number;
  };
}

interface BLSData {
  city: string;
  unemployment: {
    current: number;
    currentDate: string;
    yearAgo: number;
    yearAgoDate: string;
    change: number;
  };
}

interface FBIData {
  dataLevel: string;
  state: string;
  offenses: Array<{
    category: string;
    label: string;
    years: Array<{ year: number; count: number; rate: number }>;
  }>;
}

interface TrafficData {
  city: string;
  stateAbbrev: string;
  population: number;
  dataLevel: string;
  county: {
    countyName: string;
    years: Array<{
      year: number;
      totalCrashes: number;
      totalFatalities: number;
      pedestrianFatalities: number;
      cyclistFatalities: number;
      alcoholRelated: number;
      fatalityRate: number;
    }>;
  } | null;
  state: {
    years: Array<{
      year: number;
      totalFatalities: number;
      fatalityRate: number;
    }>;
  };
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function OverviewSection({ city }: SectionProps) {
  const census = useCityData<CensusData>('census', city);
  const bls = useCityData<BLSData>('employment', city);
  const fbi = useCityData<FBIData>('crime', city);
  const traffic = useCityData<TrafficData>('traffic', city);

  const anyLoading = census.loading || bls.loading || fbi.loading || traffic.loading;
  const noData = !census.data && !bls.data && !fbi.data && !traffic.data;

  if (anyLoading) return <LoadingSpinner text="Loading overview..." />;
  if (noData) return null;

  // Extract violent crime rate from FBI data (latest year)
  const violentOffense = fbi.data?.offenses?.find(
    (o) => o.category === 'violent-crime' || o.label.toLowerCase().includes('violent')
  );
  const latestViolentYear = violentOffense?.years?.[violentOffense.years.length - 1];

  // Extract traffic fatality rate (latest year)
  const trafficYears = traffic.data?.county?.years ?? traffic.data?.state?.years;
  const latestTrafficYear = trafficYears?.[trafficYears.length - 1];

  return (
    <SectionWrapper title="Overview">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Population"
          value={census.data?.demographics?.population ?? null}
          format="number"
          source="Census"
        />
        <MetricCard
          label="Median Household Income"
          value={census.data?.demographics?.medianIncome ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Unemployment Rate"
          value={bls.data?.unemployment?.current ?? null}
          format="rate"
          source="BLS"
          trend={
            bls.data?.unemployment?.change != null
              ? {
                  direction: bls.data.unemployment.change < 0 ? 'down' : bls.data.unemployment.change > 0 ? 'up' : 'stable',
                  text: `${bls.data.unemployment.change > 0 ? '+' : ''}${bls.data.unemployment.change.toFixed(1)}% vs year ago`,
                }
              : undefined
          }
        />
        <MetricCard
          label="Violent Crime Rate"
          value={latestViolentYear?.rate ?? null}
          format="rate"
          source="FBI"
        />
        <MetricCard
          label="Median Home Value"
          value={census.data?.housing?.medianHomeValue ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Traffic Fatality Rate"
          value={latestTrafficYear?.fatalityRate ?? null}
          format="rate"
          source="NHTSA"
        />
      </div>
    </SectionWrapper>
  );
}
