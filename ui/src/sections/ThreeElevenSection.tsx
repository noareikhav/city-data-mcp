import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';

interface ThreeElevenData {
  city: string;
  totalRequests: number;
  daysBack: number;
  topCategories: Array<{ category: string; count: number; pct: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

export function ThreeElevenSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<ThreeElevenData>('311', city);

  if (loading) return <LoadingSpinner text="Loading 311 data..." />;
  if (error) return <ErrorCard title="311 Requests" message={error} />;
  if (!data) return null;

  const categoryChart = (data.topCategories || []).slice(0, 10).map(c => ({
    label: c.category.length > 25 ? c.category.slice(0, 25) + '…' : c.category,
    value: c.count,
  }));

  const trendChart = (data.monthlyTrend || []).map(m => ({
    label: m.month,
    value: m.count,
  }));

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>311 Service Requests</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Last {data.daysBack} days — what residents are reporting
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <MetricCard
          label="Total Requests"
          value={data.totalRequests?.toLocaleString() ?? 'N/A'}
          source="Socrata"
        />
        {data.topCategories?.[0] && (
          <MetricCard
            label="#1 Category"
            value={data.topCategories[0].category}
            source="Socrata"
          />
        )}
        {data.topCategories?.[1] && (
          <MetricCard
            label="#2 Category"
            value={data.topCategories[1].category}
            source="Socrata"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {categoryChart.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Top Complaint Categories
            </h3>
            <CategoryBarChart data={categoryChart} color="#22d3ee" />
          </div>
        )}
        {trendChart.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Monthly Volume
            </h3>
            <TrendLineChart data={trendChart} color="#22d3ee" />
          </div>
        )}
      </div>
    </section>
  );
}
