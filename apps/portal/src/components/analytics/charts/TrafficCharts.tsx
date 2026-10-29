'use client';

import { useRecharts } from './useRecharts';

const ChartFallback = ({ height }: { height: number }) => (
  <div className="animate-pulse rounded-lg bg-gray-100" style={{ height }} />
);

const BRAND = '#E7A3B0';

export interface TrafficPoint {
  users: number;
  sessions: number;
  pageViews: number;
}

export function DailyTrafficChart({ data }: { data: (TrafficPoint & { date: string })[] }) {
  const recharts = useRecharts();
  if (!recharts) return <ChartFallback height={280} />;
  const { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } = recharts;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#111827',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
        <Line yAxisId="left" type="linear" dataKey="users" stroke={BRAND} strokeWidth={2} dot={false} name="Users" />
        <Line yAxisId="left" type="linear" dataKey="sessions" stroke="#111827" strokeWidth={2} dot={false} name="Sessions" />
        <Line yAxisId="right" type="linear" dataKey="pageViews" stroke="#9ca3af" strokeWidth={2} dot={false} name="Page Views" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrafficChart({ data }: { data: (TrafficPoint & { month: string })[] }) {
  const recharts = useRecharts();
  if (!recharts) return <ChartFallback height={260} />;
  const { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } = recharts;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            color: '#111827',
          }}
          cursor={{ fill: '#f9fafb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
        <Bar yAxisId="left" dataKey="users" name="Users" fill={BRAND} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="sessions" name="Sessions" fill="#111827" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="pageViews" name="Page Views" fill="#d1d5db" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
