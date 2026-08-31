// Why: rhythm over time in the middle F-band — Tufte data-ink, Ware color semantics
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/** Daily trend chart (leads / enrollments / revenue) — brand indigo accent only. */
export default function TrendChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${v / 1000}K`} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(v, name) => [name === 'Revenue' ? `$${Number(v).toLocaleString()}` : v, name]}
        />
        <Area yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" strokeWidth={2} fill="url(#gradLeads)" />
        <Area yAxisId="left" type="monotone" dataKey="enrollments" name="Enrollments" stroke="#10b981" strokeWidth={2} fill="none" />
        <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#0f172a" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
