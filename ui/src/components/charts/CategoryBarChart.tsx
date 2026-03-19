import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CategoryBarChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
  height?: number;
  title?: string;
}

export function CategoryBarChart({ data, color = '#6366f1', height = 200, title }: CategoryBarChartProps) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
          <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
          <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid #374151', borderRadius: 8, color: '#e1e4e8', fontSize: 12 }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
