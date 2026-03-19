import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#f97316', '#14b8a6'];

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  title?: string;
}

export function DonutChart({ data, height = 220, title }: DonutChartProps) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid #374151', borderRadius: 8, color: '#e1e4e8', fontSize: 12 }} />
          <Legend formatter={(value) => <span style={{ color: '#8b949e', fontSize: 11 }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
