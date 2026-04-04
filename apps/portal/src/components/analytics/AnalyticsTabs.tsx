'use client';

import { useState, useCallback } from 'react';
import { BarChart3, Package, Download, Loader2 } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ProductsDashboard } from './ProductsDashboard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dollys-closet/ui';

import { useEffect } from 'react';

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Package },
] as const;

type Tab = typeof tabs[number]['key'];

export function AnalyticsTabs() {
  const [active, setActive] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
    const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g., "2026-03"
    const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
    const [activeMonths, setActiveMonths] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/admin/analytics')
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return;
                if (json.monthlyData) {
                    const list = json.monthlyData.map((m: any) => ({
                        value: m.value,
                        label: m.month,
                    })).reverse();
                    setActiveMonths(list);
                }
            })
            .catch((e) => {
                if (!isMounted) return;
                console.error('Failed to load analytics months', e);
            });
            
        return () => { isMounted = false; };
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const { exportAnalyticsPdf } = await import('@/lib/exportAnalyticsPdf');
            await exportAnalyticsPdf(selectedMonth === 'all' || !selectedMonth ? undefined : selectedMonth);
        } catch (e) {
            console.error('PDF export failed', e);
        } finally {
            setExporting(false);
        }
    }, [selectedMonth]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div
                    className="inline-flex items-center rounded-xl p-1 w-fit"
                    style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
                >
                    {tabs.map(tab => {
                        const isActive = active === tab.key;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActive(tab.key)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={
                                    isActive
                                        ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                                        : { backgroundColor: 'transparent', color: '#9ca3af' }
                                }
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                    <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                        disabled={exporting}
                    >
                        <SelectTrigger className="w-[160px] h-9 shrink-0">
                            <SelectValue placeholder="Full Summary" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Full Summary (All)</SelectItem>
                            {activeMonths.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0"
                        style={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            color: exporting ? '#9ca3af' : '#374151',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                    >
                        {exporting
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        {exporting ? 'Exporting…' : 'Export PDF'}
                    </button>
                </div>
            </div>

      {/* Always render both so charts are in the DOM for PDF capture.
          Wrapper clips the off-screen dashboard so it doesn't add phantom scroll. */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: active === 'overview' ? 'block' : 'none' }}>
          <AnalyticsDashboard selectedMonth={selectedMonth} />
        </div>
        <div style={active === 'products' ? {} : { position: 'absolute', top: 0, left: '-9999px', width: '900px', pointerEvents: 'none' }}>
          <ProductsDashboard selectedMonth={selectedMonth} />
        </div>
      </div>
    </div>
  );
}
