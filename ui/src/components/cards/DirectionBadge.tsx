import { TrendingUp, TrendingDown, ArrowRight, HelpCircle } from 'lucide-react';

type Direction = 'improving' | 'declining' | 'stable' | 'unknown';

const config: Record<Direction, { color: string; bg: string; icon: typeof TrendingUp; label: string }> = {
  improving: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: TrendingUp, label: 'Improving' },
  declining: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: TrendingDown, label: 'Declining' },
  stable: { color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: ArrowRight, label: 'Stable' },
  unknown: { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: HelpCircle, label: 'Unknown' },
};

interface DirectionBadgeProps {
  direction: Direction;
  compact?: boolean;
}

export function DirectionBadge({ direction, compact }: DirectionBadgeProps) {
  const c = config[direction];
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: c.bg, color: c.color }}>
      <Icon size={12} />
      {!compact && c.label}
    </span>
  );
}
