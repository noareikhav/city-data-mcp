import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SectionProps {
  city: string;
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
  congestion: {
    annualDelayHours: number;
    congestionCost: number;
    rankAmongMetros: number;
    dataYear: number;
  } | null;
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function SafetySection({ city }: SectionProps) {
  const fbi = useCityData<FBIData>('crime', city);
  const traffic = useCityData<TrafficData>('traffic', city);

  const anyLoading = fbi.loading || traffic.loading;
  const noData = !fbi.data && !traffic.data;

  if (anyLoading) return <LoadingSpinner text="Loading safety data..." />;
  if (noData) return null;

  // Build crime category bar chart from latest year
  const crimeBarData = fbi.data?.offenses
    ?.map((o) => {
      const latestYear = o.years?.[o.years.length - 1];
      return latestYear ? { name: o.label, value: latestYear.rate ?? latestYear.count } : null;
    })
    .filter((d): d is { name: string; value: number } => d !== null) ?? [];

  // Build violent crime trend from the violent-crime offense
  const violentOffense = fbi.data?.offenses?.find(
    (o) => o.category === 'violent-crime' || o.label.toLowerCase().includes('violent')
  );
  const violentTrend = violentOffense?.years?.map((y) => ({
    label: String(y.year),
    value: y.rate,
  })) ?? [];

  // Traffic stats from latest year (prefer county data, fall back to state)
  const trafficYears = traffic.data?.county?.years ?? [];
  const latestTraffic = trafficYears.length > 0 ? trafficYears[trafficYears.length - 1] : null;
  const congestion = traffic.data?.congestion;

  return (
    <SectionWrapper title="Public Safety">

      {crimeBarData.length > 0 && (
        <div className="mb-4">
          <CategoryBarChart data={crimeBarData} title="Crime Categories (Latest Year)" color="#ef4444" />
        </div>
      )}

      {violentTrend.length > 0 && (
        <div className="mb-4">
          <TrendLineChart
            data={violentTrend}
            yLabel="Violent Crime Rate"
            color="#ef4444"
            name="Rate"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestTraffic && (
          <>
            <MetricCard
              label="Total Traffic Fatalities"
              value={latestTraffic.totalFatalities}
              format="number"
              source="NHTSA"
            />
            <MetricCard
              label="Pedestrian Fatalities"
              value={latestTraffic.pedestrianFatalities}
              format="number"
              source="NHTSA"
            />
            <MetricCard
              label="Cyclist Fatalities"
              value={latestTraffic.cyclistFatalities}
              format="number"
              source="NHTSA"
            />
            <MetricCard
              label="Alcohol-Related Crashes"
              value={latestTraffic.alcoholRelated}
              format="number"
              source="NHTSA"
            />
          </>
        )}
        {congestion && (
          <>
            <MetricCard
              label="Annual Delay (Hours)"
              value={congestion.annualDelayHours}
              format="number"
              source="NHTSA"
            />
            <MetricCard
              label="Congestion Cost"
              value={congestion.congestionCost}
              format="dollar"
              source="NHTSA"
            />
            <MetricCard
              label="Metro Congestion Rank"
              value={`#${congestion.rankAmongMetros}`}
              source="NHTSA"
            />
          </>
        )}
      </div>
    </SectionWrapper>
  );
}
