import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TrendLineChartProps {
  data: Array<{ label: string; value: number; value2?: number }>;
  color?: string;
  color2?: string;
  height?: number;
  yLabel?: string;
  name?: string;
  name2?: string;
}

export function TrendLineChart({ data, color = '#6366f1', color2, height = 200, yLabel, name = 'Value', name2 }: TrendLineChartProps) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {yLabel && <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{yLabel}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
          <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
          <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid #374151', borderRadius: 8, color: '#e1e4e8', fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} name={name} />
          {color2 && <Line type="monotone" dataKey="value2" stroke={color2} strokeWidth={2} dot={false} name={name2 || 'Value 2'} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
