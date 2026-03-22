'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, Eye, TrendingUp, UserPlus, Monitor, Smartphone, Tablet } from 'lucide-react';

const BRAND = '#E7A3B0';
const BRAND_LIGHT = '#fdf2f4';

interface DailyData {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
}

interface MonthlyData {
  month: string;
  users: number;
  sessions: number;
  pageViews: number;
}

interface TopPage {
  page: string;
  views: number;
  users: number;
}

interface Totals {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  newUsers: number;
}

interface DeviceData {
  device: string;
  users: number;
}

interface AnalyticsData {
  dailyData: DailyData[];
  monthlyData: MonthlyData[];
  customerPages: TopPage[];
  internalPages: TopPage[];
  totals: Totals;
  deviceData: DeviceData[];
}

function formatDate(dateStr: string) {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return new Date(`${y}-${m}-${d}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

const card: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const deviceIcon = (device: string) => {
  switch (device.toLowerCase()) {
    case 'mobile': return <Smartphone className="w-4 h-4" />;
    case 'tablet': return <Tablet className="w-4 h-4" />;
    default: return <Monitor className="w-4 h-4" />;
  }
};

function PageList({ title, subtitle, pages, color }: { title: string; subtitle: string; pages: TopPage[]; color: string }) {
  return (
    <div style={card} className="p-6">
      <h2 className="text-base font-semibold mb-0.5" style={{ color: '#111827' }}>{title}</h2>
      <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>{subtitle}</p>
      {pages.length === 0 ? (
        <p className="text-sm" style={{ color: '#9ca3af' }}>No data yet</p>
      ) : (
        <div className="space-y-3">
          {pages.map((page, i) => {
            const maxViews = pages[0]?.views ?? 1;
            const pct = Math.round((page.views / maxViews) * 100);
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[60%]" style={{ color: '#374151' }} title={page.page}>
                    {page.page || '/'}
                  </span>
                  <span style={{ color: '#6b7280' }}>{page.views.toLocaleString()} views</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AnalyticsDashboard({ selectedMonth }: { selectedMonth?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = selectedMonth && selectedMonth !== 'all'
      ? `/api/admin/analytics?month=${selectedMonth}`
      : '/api/admin/analytics';

    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load analytics data'))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
        ))}
        <div className="col-span-full h-72 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
        <div className="col-span-full h-64 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <TrendingUp className="w-12 h-12" style={{ color: '#d1d5db' }} />
        <p className="font-medium" style={{ color: '#6b7280' }}>{error}</p>
        {error === 'Analytics not configured' && (
          <p className="text-sm max-w-md" style={{ color: '#9ca3af' }}>
            Add your GA4 credentials to <code className="px-1 rounded" style={{ backgroundColor: '#f3f4f6' }}>.env.local</code> to enable analytics.
          </p>
        )}
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.dailyData.map(d => ({ ...d, date: formatDate(d.date) }));
  const totalDeviceUsers = data.deviceData.reduce((sum, d) => sum + d.users, 0);

  const summaryCards = [
    { label: 'Active Users', value: data.totals.activeUsers, icon: <Users className="w-5 h-5" style={{ color: BRAND }} /> },
    { label: 'Sessions', value: data.totals.sessions, icon: <TrendingUp className="w-5 h-5" style={{ color: BRAND }} /> },
    { label: 'Page Views', value: data.totals.pageViews, icon: <Eye className="w-5 h-5" style={{ color: BRAND }} /> },
    { label: 'New Users', value: data.totals.newUsers, icon: <UserPlus className="w-5 h-5" style={{ color: BRAND }} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} style={card} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#6b7280' }}>{c.label}</span>
              <div className="p-2 rounded-lg" style={{ backgroundColor: BRAND_LIGHT }}>
                {c.icon}
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#111827' }}>{formatNumber(c.value)}</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Last 30 days</p>
          </div>
        ))}
      </div>

      {/* Daily Traffic Chart */}
      <div style={card} className="p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>Daily Traffic — Last 30 Days</h2>
        <div id="pdf-chart-traffic">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
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
            <Line type="monotone" dataKey="users" stroke={BRAND} strokeWidth={2} dot={false} name="Users" />
            <Line type="monotone" dataKey="sessions" stroke="#111827" strokeWidth={2} dot={false} name="Sessions" />
            <Line type="monotone" dataKey="pageViews" stroke="#9ca3af" strokeWidth={2} dot={false} name="Page Views" />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Traffic Chart */}
      {data.monthlyData.length > 0 && (
        <div style={card} className="p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>Monthly Traffic — Last 12 Months</h2>
          <div id="pdf-chart-monthly">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#111827' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                <Bar dataKey="users" name="Users" fill={BRAND} radius={[4, 4, 0, 0]} />
                <Bar dataKey="sessions" name="Sessions" fill="#111827" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pageViews" name="Page Views" fill="#d1d5db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pages — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PageList title="Customer Pages" subtitle="Public-facing pages visited by customers" pages={data.customerPages} color={BRAND} />
        <PageList title="Admin & Internal Pages" subtitle="Dashboard and management pages" pages={data.internalPages} color="#6b7280" />
      </div>

      {/* Device Breakdown */}
      <div style={card} className="p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Devices</h2>
        <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>How visitors access the site</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {data.deviceData.map((d, i) => {
            const pct = totalDeviceUsers > 0 ? Math.round((d.users / totalDeviceUsers) * 100) : 0;
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 capitalize" style={{ color: '#374151' }}>
                    {deviceIcon(d.device)}
                    {d.device}
                  </span>
                  <span className="font-semibold" style={{ color: '#111827' }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#111827' }} />
                </div>
                <p className="text-xs" style={{ color: '#9ca3af' }}>{d.users.toLocaleString()} users</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
