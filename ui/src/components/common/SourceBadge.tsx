const SOURCE_COLORS: Record<string, string> = {
  Census: '#60a5fa',
  FRED: '#f87171',
  BLS: '#4ade80',
  FBI: '#facc15',
  NHTSA: '#818cf8',
  NWS: '#c084fc',
  EPA: '#34d399',
  HUD: '#fbbf24',
  Transit: '#a3e635',
  NCES: '#a78bfa',
  BPS: '#f59e0b',
  Budget: '#2dd4bf',
  Socrata: '#22d3ee',
  Civic: '#fb7185',
};

export function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] || '#8b949e';
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {source}
    </span>
  );
}
