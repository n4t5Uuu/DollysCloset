'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  CircleHelp,
  Eye,
  Monitor,
  RefreshCcw,
  Smartphone,
  Tablet,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, Tooltip as HelpTooltip, TooltipContent, TooltipTrigger } from '@dollys-closet/ui';
import {
  DashboardCardLayout,
  type DashboardCardDefinition,
} from '@/components/dashboard-layout/DashboardCardLayout';

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

interface SummaryCard {
  label: string;
  value: number;
  helpText: string;
  icon: ReactNode;
}

function formatDate(dateStr: string) {
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);

  if (!year || !month) return monthValue;

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function getDailyTrafficTitle(selectedMonth?: string) {
  if (!selectedMonth || selectedMonth === 'all') {
    return 'Daily Traffic - Last 30 Days';
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (selectedMonth === currentMonth) {
    return 'Daily Traffic - This Month';
  }

  return `Daily Traffic - ${formatMonthLabel(selectedMonth)}`;
}

function getSummaryScopeLabel(selectedMonth?: string) {
  if (!selectedMonth || selectedMonth === 'all') {
    return 'All time';
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (selectedMonth === currentMonth) {
    return 'This month';
  }

  return `For ${formatMonthLabel(selectedMonth)}`;
}

function deviceIcon(device: string) {
  switch (device.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

function PageListBody({
  pages,
  color,
}: {
  pages: TopPage[];
  color: string;
}) {
  if (pages.length === 0) {
    return <p className="text-sm text-gray-500">No page activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {pages.map((page) => {
        const maxViews = pages[0]?.views ?? 0;
        const pct = maxViews > 0 ? Math.round((page.views / maxViews) * 100) : 0;
        return (
          <div key={page.page} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="max-w-[60%] truncate text-[#374151]" title={page.page}>
                {page.page || '/'}
              </span>
              <span className="text-gray-500">{page.views.toLocaleString()} views</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeviceBreakdownBody({ devices }: { devices: DeviceData[] }) {
  const totalDeviceUsers = devices.reduce((sum, device) => sum + device.users, 0);

  if (devices.length === 0) {
    return <p className="text-sm text-gray-500">No device breakdown yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {devices.map((device) => {
        const pct = totalDeviceUsers > 0 ? Math.round((device.users / totalDeviceUsers) * 100) : 0;
        return (
          <div key={device.device} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 capitalize text-[#374151]">
                {deviceIcon(device.device)}
                {device.device}
              </span>
              <span className="font-semibold text-[#111827]">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: '#111827' }}
              />
            </div>
            <p className="text-xs text-gray-400">{device.users.toLocaleString()} users</p>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsDashboard({
  selectedMonth,
  refreshToken = 0,
}: {
  selectedMonth?: string;
  refreshToken?: number;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    const url =
      selectedMonth && selectedMonth !== 'all'
        ? `/api/admin/analytics?month=${selectedMonth}`
        : '/api/admin/analytics';

    fetchJson<AnalyticsData>(url, undefined, 'Analytics service is unavailable right now.')
      .then((json) => {
        if (!isMounted) return;

        setError(null);
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error ? fetchError.message : 'Unable to load analytics data right now.'
        );
        setData(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshToken, retryToken, selectedMonth]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 animate-pulse sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-gray-100" />
        ))}
        <div className="col-span-full h-72 rounded-xl bg-gray-100" />
        <div className="col-span-full h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-300" />
        <p className="font-medium text-red-700">{error}</p>
        {error === 'Analytics not configured' ? (
          <p className="max-w-md text-sm text-red-500">
            Add your GA4 credentials to{' '}
            <code className="rounded bg-gray-100 px-1">.env.local</code> to enable analytics.
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setRetryToken((current) => current + 1)}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.dailyData.map((item) => ({ ...item, date: formatDate(item.date) }));
  const dailyTrafficTitle = getDailyTrafficTitle(selectedMonth);
  const summaryScopeLabel = getSummaryScopeLabel(selectedMonth);

  const summaryCards: SummaryCard[] = [
    {
      label: 'Active Users',
      value: data.totals.activeUsers,
      helpText:
        'Visitors Google Analytics counted as active during this time. This is based on engagement, not a guaranteed count of individual people, so the same person may be counted separately on different devices or browsers.',
      icon: <Users className="h-5 w-5" style={{ color: BRAND }} />,
    },
    {
      label: 'Sessions',
      value: data.totals.sessions,
      helpText:
        'The total number of visits during this time. One visitor can create multiple sessions by coming back again later or using a different device or browser.',
      icon: <TrendingUp className="h-5 w-5" style={{ color: BRAND }} />,
    },
    {
      label: 'Page Views',
      value: data.totals.pageViews,
      helpText:
        'The total number of pages people viewed during this time. Repeated views of the same page are included.',
      icon: <Eye className="h-5 w-5" style={{ color: BRAND }} />,
    },
    {
      label: 'New Users',
      value: data.totals.newUsers,
      helpText:
        'Visitors Google Analytics detected for the first time during this period. This usually depends on browser or device tracking, so it is not always the same as a real first-time person.',
      icon: <UserPlus className="h-5 w-5" style={{ color: BRAND }} />,
    },
  ];

  const overviewCards: DashboardCardDefinition[] = [
      {
        id: 'daily-traffic',
        title: dailyTrafficTitle,
        description: selectedMonth && selectedMonth !== 'all'
          ? `Daily traffic trend for ${formatMonthLabel(selectedMonth)}.`
          : 'Users, sessions, and page views over the latest 30-day window.',
        icon: <TrendingUp className="h-4 w-4" />,
        className: 'lg:col-span-2',
        contentClassName: 'p-6',
        render: () => (
          <div id="pdf-chart-traffic">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
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
          </div>
        ),
      },
      {
        id: 'monthly-traffic',
        title: 'Monthly Traffic',
        description: 'A 12-month look at users, sessions, and page views.',
        icon: <BarChart3 className="h-4 w-4" />,
        className: 'lg:col-span-2',
        contentClassName: 'p-6',
        render: () =>
          data.monthlyData.length > 0 ? (
            <div id="pdf-chart-monthly">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.monthlyData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
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
            </div>
          ) : (
            <p className="text-sm text-gray-500">Monthly traffic data is not available yet.</p>
          ),
      },
      {
        id: 'customer-pages',
        title: 'Customer Pages',
        description: 'Public-facing pages with the most traffic.',
        icon: <Users className="h-4 w-4" />,
        contentClassName: 'p-6',
        render: () => <PageListBody pages={data.customerPages} color={BRAND} />,
      },
      {
        id: 'internal-pages',
        title: 'Admin & Internal Pages',
        description: 'Internal routes attracting the most visits.',
        icon: <Monitor className="h-4 w-4" />,
        contentClassName: 'p-6',
        render: () => <PageListBody pages={data.internalPages} color="#6b7280" />,
      },
      {
        id: 'devices',
        title: 'Devices',
        description: 'How visitors are accessing the site.',
        icon: <Smartphone className="h-4 w-4" />,
        className: 'lg:col-span-2',
        contentClassName: 'p-6',
        render: () => <DeviceBreakdownBody devices={data.deviceData} />,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          {selectedMonth && selectedMonth !== 'all'
            ? `Showing analytics for ${selectedMonth}.`
            : 'Showing the full analytics summary.'}
        </p>
        <p className="text-xs text-gray-500">
          {lastUpdated ? `Last updated at ${lastUpdated}` : 'Waiting for analytics data'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((cardItem) => (
          <div key={cardItem.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-medium text-gray-500">{cardItem.label}</span>
                <HelpTooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`What ${cardItem.label.toLowerCase()} means`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7A3B0] focus-visible:ring-offset-2"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="max-w-[280px] px-3 py-2 text-left leading-relaxed">
                    {cardItem.helpText}
                  </TooltipContent>
                </HelpTooltip>
              </div>
              <div className="shrink-0 rounded-lg p-2" style={{ backgroundColor: BRAND_LIGHT }}>
                {cardItem.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{formatNumber(cardItem.value)}</p>
            <p className="mt-1 text-xs text-gray-400">{summaryScopeLabel}</p>
          </div>
        ))}
      </div>

      <DashboardCardLayout
        surface="admin_analytics_overview"
        cards={overviewCards}
        gridClassName="grid grid-cols-1 gap-6 lg:auto-rows-max lg:grid-cols-2 lg:grid-flow-row-dense"
        desktopRailTopClass="top-56"
        desktopRailTabTopClass="top-64"
      />
    </div>
  );
}



