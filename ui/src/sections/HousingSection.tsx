import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SectionProps {
  city: string;
}

interface CensusData {
  city: string;
  state: string;
  housing: {
    medianHomeValue: number;
    medianRent: number;
    totalHousingUnits: number;
    vacancyRate: number;
  };
}

interface HUDData {
  city: string;
  fmr: {
    efficiency: number;
    oneBedroom: number;
    twoBedroom: number;
    threeBedroom: number;
    fourBedroom: number;
  };
  areaMedianIncome: number;
  incomeLimits: {
    veryLow: number;
    low: number;
    moderate: number;
  };
}

interface PermitsData {
  city: string;
  county: string;
  years: Array<{ year: number; permits: number; units: number }>;
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function HousingSection({ city }: SectionProps) {
  const census = useCityData<CensusData>('census', city);
  const hud = useCityData<HUDData>('housing', city);
  const permits = useCityData<PermitsData>('permits', city);

  const anyLoading = census.loading || hud.loading || permits.loading;
  const noData = !census.data && !hud.data && !permits.data;

  if (anyLoading) return <LoadingSpinner text="Loading housing data..." />;
  if (noData) return null;

  // Map permits years to trend data
  const permitsTrend = permits.data?.years?.map((y) => ({
    label: String(y.year),
    value: y.units,
  })) ?? [];

  // Check if we actually have any displayable values (not just truthy objects with null fields)
  const hasVisibleData =
    census.data?.housing?.medianHomeValue != null ||
    census.data?.housing?.medianRent != null ||
    hud.data?.fmr?.oneBedroom != null ||
    permitsTrend.length > 0;

  if (!hasVisibleData) return null;

  return (
    <SectionWrapper title="Housing">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Median Home Value"
          value={census.data?.housing?.medianHomeValue ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Median Rent"
          value={census.data?.housing?.medianRent ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Vacancy Rate"
          value={census.data?.housing?.vacancyRate ?? null}
          format="percent"
          source="Census"
        />
        {hud.data?.fmr && (
          <>
            <MetricCard
              label="Fair Market Rent (1BR)"
              value={hud.data.fmr.oneBedroom}
              format="dollar"
              source="HUD"
            />
            <MetricCard
              label="Fair Market Rent (2BR)"
              value={hud.data.fmr.twoBedroom}
              format="dollar"
              source="HUD"
            />
            <MetricCard
              label="Fair Market Rent (3BR)"
              value={hud.data.fmr.threeBedroom}
              format="dollar"
              source="HUD"
            />
          </>
        )}
      </div>

      {permitsTrend.length > 0 && (
        <div className="mt-4">
          <TrendLineChart
            data={permitsTrend}
            yLabel="Building Permits (Units)"
            color="#22c55e"
            name="Units"
          />
        </div>
      )}
    </SectionWrapper>
  );
}
