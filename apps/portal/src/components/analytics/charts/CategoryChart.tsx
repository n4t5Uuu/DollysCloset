'use client';

import { useRecharts } from './useRecharts';

const BRAND = '#E7A3B0';

export function CategoryChart({ data }: { data: { category: string; count: number }[] }) {
  const recharts = useRecharts();
  if (!recharts) return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;
  const { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } = recharts;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            color: '#111',
          }}
          cursor={{ fill: '#f9fafb' }}
          formatter={(value) => [value, 'Products']}
        />
        <Bar dataKey="count" name="Products" radius={[0, 4, 4, 0]}>
          {data.map((category, index) => (
            <Cell key={category.category} fill={index === 0 ? BRAND : '#e5e7eb'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
