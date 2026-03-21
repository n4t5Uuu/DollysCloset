'use client';

import { useState, useCallback } from 'react';
import { BarChart3, Package, Download, Loader2 } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ProductsDashboard } from './ProductsDashboard';

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Package },
] as const;

type Tab = typeof tabs[number]['key'];

export function AnalyticsTabs() {
  const [active, setActive] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { exportAnalyticsPdf } = await import('@/lib/exportAnalyticsPdf');
      await exportAnalyticsPdf();
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div>
      {/* Tab bar + Export button */}
      <div className="flex items-center justify-between mb-6">
        <div
          className="inline-flex items-center rounded-xl p-1"
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

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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

      {/* Always render both so charts are in the DOM for PDF capture.
          Wrapper clips the off-screen dashboard so it doesn't add phantom scroll. */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: active === 'overview' ? 'block' : 'none' }}>
          <AnalyticsDashboard />
        </div>
        <div style={active === 'products' ? {} : { position: 'absolute', top: 0, left: '-9999px', width: '900px', pointerEvents: 'none' }}>
          <ProductsDashboard />
        </div>
      </div>
    </div>
  );
}
