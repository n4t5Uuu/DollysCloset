'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Package, Tag, AlertTriangle, XCircle, Pencil, Loader2, ImageOff, ArrowRight, RefreshCcw } from 'lucide-react';
import AddProduct from '@/components/dialogs/AddProduct';
import { Button } from '@/components/ui/button';
import { InventoryProduct, InventoryCategory } from '@/types/inventory.types';

const BRAND = '#E7A3B0';
const BRAND_LIGHT = '#fdf2f4';

const card: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

interface StockItem { id: string; name: string; stock: number; }
interface SimpleItem { id: string; name: string; }
interface CategoryBreakdown { category: string; count: number; }
interface MostEdited { name: string; edits: number; }
interface MostViewed { name: string; views: number; }
interface ProductsData {
  summary: { totalProducts: number; totalCategories: number; outOfStock: number; lowStock: number; };
  topCategories: CategoryBreakdown[];
  mostEdited: MostEdited[];
  mostViewed: MostViewed[];
  outOfStockList: StockItem[];
  lowStockList: StockItem[];
  missingImageList: SimpleItem[];
}

function StockBadge({ stock }: { stock: number }) {
  const isOut = stock === 0;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
        color: isOut ? '#ef4444' : '#f59e0b',
      }}
    >
      {isOut ? 'Out of stock' : `${stock} left`}
    </span>
  );
}

type Period = 'all' | 'month' | 'week';

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);

  if (!year || !month) return monthValue;

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export function ProductsDashboard({ selectedMonth }: { selectedMonth?: string }) {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [periodLoading, setPeriodLoading] = useState(false);
  const hasSelectedMonth = Boolean(selectedMonth && selectedMonth !== 'all');

  const fetchData = useCallback((p: Period = 'all', m?: string, silent = false, isMountedRef?: { current: boolean }) => {
    if (!silent) setLoading(true);
    setError(null);
    let url = `/api/admin/analytics/products?period=${p}`;
    if (m && m !== 'all') {
      url += `&month=${m}`;
    }
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') ?? '';
        const json = contentType.includes('application/json')
          ? await res.json()
          : { error: 'Product analytics are unavailable right now.' };

        if (!res.ok) {
          return { ...json, error: json.error || 'Product analytics are unavailable right now.' };
        }

        return json;
      })
      .then(json => {
        if (isMountedRef && !isMountedRef.current) return;
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setData(json);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch(() => { 
        if (isMountedRef && !isMountedRef.current) return;
        setError('Unable to load product analytics right now.');
        setData(null);
      })
      .finally(() => { 
        if (isMountedRef && !isMountedRef.current) return;
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => { 
    const isMounted = { current: true };
    fetchData('all', selectedMonth, false, isMounted); 
    return () => { isMounted.current = false; };
  }, [fetchData, selectedMonth, retryToken]);

  useEffect(() => {
    if (hasSelectedMonth) {
      setPeriod('all');
      setPeriodLoading(false);
    }
  }, [hasSelectedMonth]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setPeriodLoading(true);
    let url = `/api/admin/analytics/products?period=${p}`;
    if (selectedMonth && selectedMonth !== 'all') {
      url += `&month=${selectedMonth}`;
    }
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') ?? '';
        const json = contentType.includes('application/json')
          ? await res.json()
          : { error: 'Product analytics are unavailable right now.' };
        return json;
      })
      .then(json => {
        if (!json.error) {
          setData(prev => prev ? {
            ...prev,
            mostEdited: json.mostEdited,
            mostViewed: json.mostViewed,
          } : json);
        }
      })
      .catch(() => {})
      .finally(() => setPeriodLoading(false));
  }, [selectedMonth]);

  const handleEditClick = useCallback(async (productId: string) => {
    setLoadingProductId(productId);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ]);
      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();
      const product = (productsJson.data as InventoryProduct[]).find(p => p.product_id === productId);
      if (product) {
        setCategories(categoriesJson.data ?? []);
        setEditingProduct(product);
      }
    } catch { /* silently fail */ }
    finally { setLoadingProductId(null); }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-72 rounded-xl" style={{ backgroundColor: '#f3f4f6' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-12 text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-red-300" />
        <p className="text-sm font-medium text-red-700">{error ?? 'No product analytics available.'}</p>
        <Button type="button" variant="outline" onClick={() => setRetryToken((current) => current + 1)}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const maxEdits = data.mostEdited[0]?.edits ?? 1;
  const ALERT_CAP = 5;
  const rankingScopeDescription = hasSelectedMonth
    ? formatMonthLabel(selectedMonth!)
    : period === 'week'
      ? 'the last 7 days'
      : period === 'month'
        ? 'the last 30 days'
        : 'all time';
  const allStockAlerts = [
    ...data.outOfStockList.map(p => ({ ...p, status: 'out' as const })),
    ...data.lowStockList.map(p => ({ ...p, status: 'low' as const })),
  ];
  const stockAlerts = allStockAlerts.slice(0, ALERT_CAP);
  const missingImages = data.missingImageList.slice(0, ALERT_CAP);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p>
          {selectedMonth && selectedMonth !== 'all'
            ? `Showing product analytics for ${selectedMonth}.`
            : 'Showing the full product analytics summary.'}
          {' '}Product rankings follow {hasSelectedMonth ? 'the selected month.' : 'the selected time range.'}
        </p>
        <p className="text-xs text-gray-500">
          {lastUpdated ? `Last updated at ${lastUpdated}` : 'Waiting for product data'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: data.summary.totalProducts, icon: <Package className="w-5 h-5" style={{ color: BRAND }} />, bg: BRAND_LIGHT },
          { label: 'Categories', value: data.summary.totalCategories, icon: <Tag className="w-5 h-5" style={{ color: '#6366f1' }} />, bg: '#eef2ff' },
          { label: 'Low Stock', value: data.summary.lowStock, icon: <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />, bg: '#fffbeb' },
          { label: 'Out of Stock', value: data.summary.outOfStock, icon: <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />, bg: '#fef2f2' },
        ].map(c => (
          <div key={c.label} style={card} className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: c.bg }}>{c.icon}</div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#111827' }}>{c.value}</p>
              <p className="text-sm" style={{ color: '#6b7280' }}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown + Most edited + Most viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <div style={card} className="p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Products by Category</h2>
          <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>Top 10 categories by product count</p>
          {data.topCategories.length === 0 ? (
            <p className="text-sm" style={{ color: '#9ca3af' }}>No category breakdown yet.</p>
          ) : (
            <div id="pdf-chart-top-categories">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topCategories} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#111' }} cursor={{ fill: '#f9fafb' }} formatter={(value) => [value, 'Products']} />
                  <Bar dataKey="count" name="Products" radius={[0, 4, 4, 0]}>
                    {data.topCategories.map((_, i) => <Cell key={i} fill={i === 0 ? BRAND : '#e5e7eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Most edited */}
        <div style={card} className="p-6">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Most Edited Products</h2>
            {hasSelectedMonth ? (
              <div
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: BRAND_LIGHT, color: '#8a6b73', border: '1px solid rgba(231,163,176,0.25)' }}
              >
                {formatMonthLabel(selectedMonth!)}
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0" style={{ backgroundColor: '#f3f4f6', borderRadius: '0.5rem', padding: '2px' }}>
                {(['all', 'month', 'week'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                    style={{
                      backgroundColor: period === p ? 'white' : 'transparent',
                      color: period === p ? '#111827' : '#6b7280',
                      boxShadow: period === p ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {p === 'all' ? 'All time' : p === 'month' ? '30 days' : '7 days'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
            Products with the most updates logged in activity history for {rankingScopeDescription}
          </p>
          {periodLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded" style={{ backgroundColor: '#f3f4f6' }} />)}
            </div>
          ) : data.mostEdited.length === 0 ? (
            <p className="text-sm" style={{ color: '#9ca3af' }}>No edit history for this time range yet.</p>
          ) : (
            <div className="space-y-3">
              {data.mostEdited.map((p, i) => {
                const pct = Math.round((p.edits / maxEdits) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[70%] font-medium" style={{ color: '#374151' }} title={p.name}>
                        {p.name}
                      </span>
                      <span style={{ color: '#6b7280' }}>{p.edits} {p.edits === 1 ? 'edit' : 'edits'}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? BRAND : '#d1d5db' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Most viewed */}
        <div style={card} className="p-6">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Most Viewed Products</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
            Most clicked products from the catalog collection for {rankingScopeDescription}
          </p>
          {data.mostViewed.length === 0 ? (
            <p className="text-sm" style={{ color: '#9ca3af' }}>No product views recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.mostViewed.map((p, i) => {
                const maxViews = data.mostViewed[0]?.views ?? 1;
                const pct = Math.round((p.views / maxViews) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[70%] font-medium" style={{ color: '#374151' }} title={p.name}>
                        {p.name}
                      </span>
                      <span style={{ color: '#6b7280' }}>{p.views} {p.views === 1 ? 'view' : 'views'}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? BRAND : '#d1d5db' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stock alerts + Missing images side by side */}
      {(allStockAlerts.length > 0 || data.missingImageList.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock alerts */}
          {stockAlerts.length > 0 && (
            <div style={card} className="overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
                  Stock Alerts
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Out of stock or running low (5 or fewer remaining)</p>
              </div>
              <div className="p-4 space-y-2">
                {stockAlerts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ border: '1px solid #f3f4f6' }}>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{p.name}</p>
                      <div className="shrink-0"><StockBadge stock={p.stock} /></div>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => handleEditClick(p.id)}
                      disabled={loadingProductId === p.id}
                    >
                      {loadingProductId === p.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Pencil className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
              {allStockAlerts.length > ALERT_CAP && (
                <div className="px-4 pb-4">
                  <a href="/dashboard/inventory" className="flex items-center gap-1 text-xs font-medium" style={{ color: BRAND }}>
                    View all {allStockAlerts.length} alerts in Inventory <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Missing images */}
          {data.missingImageList.length > 0 && (
            <div style={card} className="overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
                  <ImageOff className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  Missing Images
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Products without a photo — add one so they show up in the catalog</p>
              </div>
              <div className="p-4 space-y-2">
                {missingImages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ border: '1px solid #f3f4f6' }}>
                    <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{p.name}</p>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => handleEditClick(p.id)}
                      disabled={loadingProductId === p.id}
                    >
                      {loadingProductId === p.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Pencil className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
              {data.missingImageList.length > ALERT_CAP && (
                <div className="px-4 pb-4">
                  <a href="/dashboard/inventory" className="flex items-center gap-1 text-xs font-medium" style={{ color: BRAND }}>
                    View all {data.missingImageList.length} in Inventory <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingProduct && (
        <AddProduct
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          categories={categories}
          productToEdit={editingProduct}
          onProductSaved={() => { setEditingProduct(null); fetchData(period, selectedMonth, true); }}
        />
      )}
    </div>
  );
}
