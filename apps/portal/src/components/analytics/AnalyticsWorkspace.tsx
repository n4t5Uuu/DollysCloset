'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Loader2, Package, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dollys-closet/ui';
import { AdminNoticeBanner } from '@/components/ui/admin-notice-banner';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ProductsDashboard } from './ProductsDashboard';

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Package },
] as const;

type Tab = (typeof tabs)[number]['key'];

async function readErrorMessage(response: Response, isJson: boolean) {
  const fallback = 'Analytics service is unavailable right now.';
  if (response.ok || !isJson) return fallback;
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

export function AnalyticsWorkspace() {
  const [active, setActive] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [monthsError, setMonthsError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeMonths, setActiveMonths] = useState<{ value: string; label: string }[]>([]);

  const loadMonths = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingMonths(true);
    }

    setMonthsError(null);

    try {
      const response = await fetch('/api/admin/analytics', { cache: 'no-store' });
      const contentType = response.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      const json =
        response.ok && isJson
          ? await response.json()
          : { error: await readErrorMessage(response, isJson) };

      if (!response.ok || json.error) {
        const message =
          typeof json.error === 'string' && json.error.trim().length > 0
            ? json.error
            : 'Analytics service is unavailable right now.';
        setMonthsError(message);
        if (isRefresh) {
          toast.error(message);
        }
        return;
      }

      const list = Array.isArray(json.monthlyData)
        ? json.monthlyData
            .map((month: { value: string; month: string }) => ({
              value: month.value,
              label: month.month,
            }))
            .reverse()
        : [];

      setActiveMonths(list);
    } catch (error) {
      console.error('Failed to load analytics months', error);
      setMonthsError('Unable to load analytics right now.');
      if (isRefresh) {
        toast.error('Failed to refresh analytics.');
      }
    } finally {
      setLoadingMonths(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  const handleRefresh = useCallback(async () => {
    await loadMonths(true);
    setRefreshToken((current) => current + 1);
  }, [loadMonths]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { exportAnalyticsPdf } = await import('@/lib/exportAnalyticsPdf');
      await exportAnalyticsPdf(selectedMonth === 'all' || !selectedMonth ? undefined : selectedMonth);
      toast.success('Analytics PDF exported.');
    } catch (error) {
      console.error('PDF export failed', error);
      toast.error('PDF export failed.');
    } finally {
      setExporting(false);
    }
  }, [selectedMonth]);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') {
      return 'Full summary';
    }

    return activeMonths.find((month) => month.value === selectedMonth)?.label ?? selectedMonth;
  }, [activeMonths, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E7A3B0]/20 bg-[#fff9fb] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#8a6b73]">Analytics overview</p>
            <p className="text-sm text-[#8a6b73]">
              Review traffic trends first, then switch to product analytics for operational follow-up.
              Refresh before exporting if a report looks stale.
            </p>
            <p className="text-xs text-[#9a7a83]">
              Current scope: <span className="font-medium text-[#8a6b73]">{selectedMonthLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || exporting}
              className="h-9 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={exporting || refreshing}
              className="h-9 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-800"
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {monthsError ? (
        <AdminNoticeBanner
          tone="error"
          title="Unable to load analytics"
          message={monthsError}
          actionLabel="Try again"
          onAction={() => {
            void loadMonths(true);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex w-fit items-center rounded-xl p-1"
          style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
        >
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                aria-pressed={isActive}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition duration-200"
                style={
                  isActive
                    ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { backgroundColor: 'transparent', color: '#9ca3af' }
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
          disabled={exporting || loadingMonths || refreshing}
        >
          <SelectTrigger className="h-9 w-[180px] shrink-0">
            <SelectValue placeholder={loadingMonths ? 'Loading months...' : 'Full Summary'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Full Summary (All)</SelectItem>
            {activeMonths.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {active === 'overview' ? (
        <AnalyticsDashboard selectedMonth={selectedMonth} refreshToken={refreshToken} />
      ) : (
        <ProductsDashboard selectedMonth={selectedMonth} refreshToken={refreshToken} />
      )}
    </div>
  );
}
