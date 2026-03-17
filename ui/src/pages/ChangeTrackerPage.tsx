import { useCityData } from '../hooks/useCityData';
import { DirectionBadge } from '../components/cards/DirectionBadge';
import { SourceBadge } from '../components/common/SourceBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { Activity } from 'lucide-react';

interface ChangeMetric {
  category: string;
  metric: string;
  current: string;
  previous: string;
  change: string;
  direction: 'improving' | 'declining' | 'stable' | 'unknown';
  source: string;
}

interface ChangeTrackerResult {
  city: string;
  trackedAt: string;
  metrics: ChangeMetric[];
  summary: { improving: number; declining: number; stable: number; unknown: number };
  dataSources: string[];
}

interface Props { city: string }

export function ChangeTrackerPage({ city }: Props) {
  const { data, loading, error } = useCityData<ChangeTrackerResult>('changes', city);

  if (loading) return <LoadingSpinner text="Tracking changes..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return null;

  // Group by category
  const groups = new Map<string, ChangeMetric[]>();
  for (const m of data.metrics) {
    if (!groups.has(m.category)) groups.set(m.category, []);
    groups.get(m.category)!.push(m);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity size={24} style={{ color: '#a5b4fc' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>{city} — What's Changing</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tracked at {new Date(data.trackedAt).toLocaleDateString()} · Sources: {data.dataSources.join(', ')}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 mb-6 rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>{data.summary.improving}</span>
          <span className="text-sm" style={{ color: '#22c55e' }}>improving</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#ef4444' }}>{data.summary.declining}</span>
          <span className="text-sm" style={{ color: '#ef4444' }}>declining</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#eab308' }}>{data.summary.stable}</span>
          <span className="text-sm" style={{ color: '#eab308' }}>stable</span>
        </div>
        {data.summary.unknown > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: '#6b7280' }}>{data.summary.unknown}</span>
            <span className="text-sm" style={{ color: '#6b7280' }}>unknown</span>
          </div>
        )}
      </div>

      {/* Metric groups */}
      {Array.from(groups.entries()).map(([category, metrics]) => (
        <div key={category} className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{category}</h2>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {metrics.map((m, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: i < metrics.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.metric}</span>
                </div>
                <div className="text-right w-24">
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{m.current}</span>
                </div>
                <div className="text-right w-32">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.previous}</span>
                </div>
                <div className="text-right w-20">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{m.change}</span>
                </div>
                <div className="w-24">
                  <DirectionBadge direction={m.direction} />
                </div>
                <div className="w-16">
                  <SourceBadge source={m.source} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
