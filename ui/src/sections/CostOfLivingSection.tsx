import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';

interface CpiData {
  city: string;
  metroName: string;
  allItems: {
    latestValue: number;
    yearOverYearChange: number;
    latestPeriod: string;
    yearAgoValue: number;
  };
  categories: Array<{
    name: string;
    latestValue: number;
    yearOverYearChange: number;
  }>;
  monthly: Array<{ date: string; value: number }>;
}

export function CostOfLivingSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<CpiData>('cost-of-living', city);

  if (loading) return <LoadingSpinner text="Loading cost of living..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data?.allItems) return null;

  const inflation = data.allItems.yearOverYearChange;

  const categoryChart = (data.categories || [])
    .filter(c => c.yearOverYearChange != null)
    .map(c => ({ label: c.name, value: c.yearOverYearChange }));

  const trendData = (data.monthly || [])
    .map(m => ({ label: m.date, value: m.value }));

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Cost of Living</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        BLS Consumer Price Index — {data.metroName}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <MetricCard
          label="Inflation Rate (YoY)"
          value={inflation != null ? `${inflation.toFixed(1)}%` : 'N/A'}
          source="BLS"
        />
        <MetricCard
          label="CPI Index"
          value={data.allItems.latestValue?.toFixed(1) ?? 'N/A'}
          source="BLS"
        />
        <MetricCard
          label="Period"
          value={data.allItems.latestPeriod ?? 'N/A'}
          source="BLS"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {categoryChart.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Inflation by Category (% YoY)
            </h3>
            <CategoryBarChart data={categoryChart} color="#fbbf24" />
          </div>
        )}
        {trendData.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              CPI Index Trend
            </h3>
            <TrendLineChart data={trendData} color="#fbbf24" />
          </div>
        )}
      </div>
    </section>
  );
}
