import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';

interface HealthMeasure {
  id: string;
  name: string;
  value: number;
  category: string;
  lowCI?: number;
  highCI?: number;
}

interface PublicHealthData {
  city: string;
  state: string;
  dataYear: string;
  population: number;
  measures: HealthMeasure[];
}

const KEY_IDS = ['OBESITY', 'DEPRESSION', 'DIABETES', 'BINGE', 'CSMOKING', 'ACCESS2', 'MHLTH', 'PHLTH', 'LPA', 'SLEEP'];
const LABELS: Record<string, string> = {
  OBESITY: 'Obesity', DEPRESSION: 'Depression', DIABETES: 'Diabetes',
  BINGE: 'Binge Drinking', CSMOKING: 'Smoking', ACCESS2: 'No Insurance',
  MHLTH: 'Poor Mental Health', PHLTH: 'Poor Physical Health',
  LPA: 'No Exercise', SLEEP: 'Short Sleep',
};

export function PublicHealthSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<PublicHealthData>('public-health', city);

  if (loading) return <LoadingSpinner text="Loading public health data..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data?.measures?.length) return null;

  // Build lookup by ID
  const byId = new Map<string, HealthMeasure>();
  for (const m of data.measures) {
    byId.set(m.id, m);
  }

  const heroMetrics = KEY_IDS.filter(id => byId.has(id)).slice(0, 6);
  const chartData = KEY_IDS
    .filter(id => byId.has(id))
    .map(id => ({ label: LABELS[id] || id, value: byId.get(id)!.value }));

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Public Health</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        CDC PLACES ({data.dataYear}) — age-adjusted prevalence, {data.measures.length} measures
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {heroMetrics.map(id => {
          const m = byId.get(id)!;
          return (
            <MetricCard
              key={id}
              label={LABELS[id] || id}
              value={`${m.value.toFixed(1)}%`}
              source="CDC"
            />
          );
        })}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Health Risk Indicators (% adults)
          </h3>
          <CategoryBarChart data={chartData} color="#a78bfa" />
        </div>
      )}
    </section>
  );
}
