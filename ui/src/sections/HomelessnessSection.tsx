import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { DonutChart } from '../components/charts/DonutChart';

interface HomelessnessData {
  city: string;
  cocName: string;
  year: number;
  total: number;
  sheltered: number;
  unsheltered: number;
  shelteredPercent: number;
  unshelteredPercent: number;
  per10k: number;
  chronicallyHomeless: number;
  veterans: number;
  familyMembers: number;
  unaccompaniedYouth: number;
  yearOverYearChange: number;
  priorYear: number;
  priorTotal: number;
}

export function HomelessnessSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<HomelessnessData>('homelessness', city);

  if (loading) return <LoadingSpinner text="Loading homelessness data..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return null;

  const donutData = [
    { label: 'Sheltered', value: data.sheltered ?? 0 },
    { label: 'Unsheltered', value: data.unsheltered ?? 0 },
  ].filter(d => d.value > 0);

  const yoyPct = data.yearOverYearChange;
  const yoyColor = yoyPct > 0 ? '#ef4444' : '#4ade80';

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Homelessness</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        HUD Point-in-Time Count ({data.year}) — {data.cocName}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Total Homeless"
          value={data.total?.toLocaleString() ?? 'N/A'}
          source="HUD"
          trend={yoyPct != null ? { value: `${yoyPct > 0 ? '+' : ''}${yoyPct.toFixed(1)}% YoY`, direction: yoyPct > 0 ? 'up' : 'down' } : undefined}
        />
        <MetricCard
          label="Per 10K Population"
          value={data.per10k != null ? data.per10k.toFixed(1) : 'N/A'}
          source="HUD"
        />
        <MetricCard
          label="Chronic"
          value={data.chronicallyHomeless?.toLocaleString() ?? 'N/A'}
          source="HUD"
        />
        <MetricCard
          label="Veterans"
          value={data.veterans?.toLocaleString() ?? 'N/A'}
          source="HUD"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Sheltered"
            value={data.sheltered?.toLocaleString() ?? 'N/A'}
            source="HUD"
          />
          <MetricCard
            label="Unsheltered"
            value={data.unsheltered?.toLocaleString() ?? 'N/A'}
            source="HUD"
          />
          <MetricCard
            label="Family Members"
            value={data.familyMembers?.toLocaleString() ?? 'N/A'}
            source="HUD"
          />
          <MetricCard
            label="Unaccomp. Youth"
            value={data.unaccompaniedYouth?.toLocaleString() ?? 'N/A'}
            source="HUD"
          />
        </div>
        {donutData.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Sheltered vs Unsheltered
            </h3>
            <DonutChart data={donutData} />
          </div>
        )}
      </div>
    </section>
  );
}
