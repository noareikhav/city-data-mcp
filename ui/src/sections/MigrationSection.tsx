import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { DonutChart } from '../components/charts/DonutChart';

interface MigrationData {
  city: string;
  state: string;
  dataYear: string;
  totalPopulation: number;
  mobilityPopulation: number;
  sameHouse: number;
  sameHousePercent: number;
  movedWithinCounty: number;
  movedWithinCountyPercent: number;
  movedFromDiffCounty: number;
  movedFromDiffCountyPercent: number;
  movedFromDiffState: number;
  movedFromDiffStatePercent: number;
  movedFromAbroad: number;
  movedFromAbroadPercent: number;
  totalMovers: number;
  totalMoversPercent: number;
  inflowPercent: number;
}

export function MigrationSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<MigrationData>('migration', city);

  if (loading) return <LoadingSpinner text="Loading migration data..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data?.mobilityPopulation) return null;

  const donutData = [
    { label: 'Same House', value: data.sameHouse },
    { label: 'Within County', value: data.movedWithinCounty },
    { label: 'Diff County', value: data.movedFromDiffCounty },
    { label: 'Diff State', value: data.movedFromDiffState },
    { label: 'From Abroad', value: data.movedFromAbroad },
  ].filter(d => d.value > 0);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Population Migration</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Census ACS ({data.dataYear}) — Geographic Mobility in Past Year
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="From Different State"
          value={`${data.movedFromDiffStatePercent}%`}
          source="Census"
        />
        <MetricCard
          label="From Abroad"
          value={`${data.movedFromAbroadPercent}%`}
          source="Census"
        />
        <MetricCard
          label="Stayed in Same House"
          value={`${data.sameHousePercent}%`}
          source="Census"
        />
        <MetricCard
          label="Total Movers"
          value={data.totalMovers?.toLocaleString() ?? 'N/A'}
          source="Census"
          trend={{ value: `${data.totalMoversPercent}% of population`, direction: 'neutral' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Moved Within County"
            value={data.movedWithinCounty?.toLocaleString() ?? 'N/A'}
            source="Census"
          />
          <MetricCard
            label="From Diff County"
            value={data.movedFromDiffCounty?.toLocaleString() ?? 'N/A'}
            source="Census"
          />
        </div>
        {donutData.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Mobility Breakdown
            </h3>
            <DonutChart data={donutData} />
          </div>
        )}
      </div>
    </section>
  );
}
