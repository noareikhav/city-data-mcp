import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SourceBadge } from '../common/SourceBadge';

interface MetricCardProps {
  label: string;
  value: string | number | null;
  trend?: { direction: 'up' | 'down' | 'stable'; text: string };
  source?: string;
  format?: 'number' | 'dollar' | 'percent' | 'rate';
}

function formatValue(val: string | number | null, format?: string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (format === 'dollar') return `$${val.toLocaleString()}`;
  if (format === 'percent') return `${(val * 100).toFixed(1)}%`;
  if (format === 'rate') return val.toFixed(1);
  return val.toLocaleString();
}

export function MetricCard({ label, value, trend, source, format }: MetricCardProps) {
  // Hide card entirely when no data is available
  if (value === null || value === undefined) return null;

  const trendColor = trend?.direction === 'up' ? '#22c55e' : trend?.direction === 'down' ? '#ef4444' : '#eab308';
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1.5 transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {formatValue(value, format)}
      </span>
      <div className="flex items-center justify-between mt-1">
        {trend && (
          <div className="flex items-center gap-1 text-xs" style={{ color: trendColor }}>
            <TrendIcon size={14} />
            <span>{trend.text}</span>
          </div>
        )}
        <div className="ml-auto">
          {source && <SourceBadge source={source} />}
        </div>
      </div>
    </div>
  );
}
