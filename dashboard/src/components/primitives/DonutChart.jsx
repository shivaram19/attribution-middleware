// Why: part-to-whole at a glance — restrained 60-30-10 palette (uxpilot), no rainbow
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// 60-30-10: mostly neutrals, brand indigo, one green, muted gray — no rainbow.
const PALETTE = ['#6366f1', '#10b981', '#94a3b8', '#cbd5e1', '#475569', '#e2e8f0'];

export default function DonutChart({ data, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [Number(v).toLocaleString(), '']}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
