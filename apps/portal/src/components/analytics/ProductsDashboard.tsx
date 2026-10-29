'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoryChart } from './charts/CategoryChart';
import {
  AlertTriangle,
  ArrowRight,
  ImageOff,
  Info,
  Loader2,
  Package,
  Pencil,
  RefreshCcw,
  Tag,
  XCircle,
} from 'lucide-react';
import { Button, Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@dollys-closet/ui';
import { InventoryCategory, InventoryProduct } from '@dollys-closet/core';
import AddProduct from '@/components/dialogs/AddProduct';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import {
  DashboardCardLayout,
  type DashboardCardDefinition,
} from '@/components/dashboard-layout/DashboardCardLayout';

const BRAND = '#E7A3B0';
const BRAND_LIGHT = '#fdf2f4';
const CARD_ROW_ACTION_BUTTON_CLASS =
  'shrink-0 border-[#f5d4dc] bg-[#fff5f7] text-[#b96d7d] hover:border-[#E7A3B0]/40 hover:bg-[#fdecef] hover:text-[#a25767]';

interface StockItem {
  id: string;
  name: string;
  stock: number;
}

interface SimpleItem {
  id: string;
  name: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface MostEdited {
  name: string;
  edits: number;
}

interface MostViewed {
  name: string;
  views: number;
}

interface ProductsData {
  summary: {
    totalProducts: number;
    totalCategories: number;
    outOfStock: number;
    lowStock: number;
  };
  topCategories: CategoryBreakdown[];
  mostEdited: MostEdited[];
  mostViewed: MostViewed[];
  outOfStockList: StockItem[];
  lowStockList: StockItem[];
  missingImageList: SimpleItem[];
}

type Period = 'all' | 'month' | 'week';

function StockBadge({ stock }: { stock: number }) {
  const isOut = stock === 0;

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
        color: isOut ? '#ef4444' : '#f59e0b',
      }}
    >
      {isOut ? 'Out of stock' : `${stock} left`}
    </span>
  );
}

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);

  if (!year || !month) return monthValue;

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function MetricList({
  items,
  valueKey,
  highlightColor = BRAND,
  suffix,
}: {
  items: Array<{ name: string; edits?: number; views?: number }>;
  valueKey: 'edits' | 'views';
  highlightColor?: string;
  suffix: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No data for this range yet.</p>;
  }

  const maxValue = items[0]?.[valueKey] ?? 0;

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const value = item[valueKey] ?? 0;
        const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="max-w-[70%] truncate font-medium text-[#374151]" title={item.name}>
                {item.name}
              </span>
              <span className="text-gray-500">
                {value} {value === 1 ? suffix : `${suffix}s`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: index === 0 ? highlightColor : '#d1d5db',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProductsDashboard({
  selectedMonth,
  refreshToken = 0,
}: {
  selectedMonth?: string;
  refreshToken?: number;
}) {
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
  // A selected month overrides the week/month/all toggle.
  const activePeriod: Period = hasSelectedMonth ? 'month' : period;
  const showPeriodLoading = periodLoading && !hasSelectedMonth;
  // Identifies the latest period request so older responses can't overwrite or clear it.
  const periodRequestRef = useRef(0);

  const fetchData = useCallback(
    async (nextPeriod: Period = 'all', month?: string, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      let url = `/api/admin/analytics/products?period=${nextPeriod}`;
      if (month && month !== 'all') {
        url += `&month=${month}`;
      }

      try {
        const json = await fetchJson<ProductsData>(
          url,
          { cache: 'no-store' },
          'Product analytics are unavailable right now.'
        );

        setData(json);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load product analytics right now.'
        );
        setData(null);
      } finally {
        setLoading((current) => (silent ? current : false));
      }
    },
    []
  );

  useEffect(() => {
    void fetchData(hasSelectedMonth ? 'month' : 'all', selectedMonth);
  }, [fetchData, hasSelectedMonth, refreshToken, retryToken, selectedMonth]);

  const handlePeriodChange = useCallback(
    async (nextPeriod: Period) => {
      const requestId = ++periodRequestRef.current;
      setPeriod(nextPeriod);
      setPeriodLoading(true);

      let url = `/api/admin/analytics/products?period=${nextPeriod}`;
      if (selectedMonth && selectedMonth !== 'all') {
        url += `&month=${selectedMonth}`;
      }

      try {
        const json = await fetchJson<ProductsData>(
          url,
          { cache: 'no-store' },
          'Product analytics are unavailable right now.'
        );

        if (requestId !== periodRequestRef.current) return;

        setData((currentData) =>
          currentData
            ? {
                ...currentData,
                mostEdited: json.mostEdited,
                mostViewed: json.mostViewed,
              }
            : json
        );
      } catch {
        // Keep the existing data visible if this quick refresh fails.
      } finally {
        if (requestId === periodRequestRef.current) setPeriodLoading(false);
      }
    },
    [selectedMonth]
  );

  const handleEditClick = useCallback(async (productId: string) => {
    setLoadingProductId(productId);
    try {
      const [productsJson, categoriesJson] = await Promise.all([
        fetchJson('/api/admin/products'),
        fetchJson('/api/admin/categories'),
      ]);
      const product = (productsJson.data as InventoryProduct[]).find(
        (item) => String(item.product_id) === productId
      );

      if (product) {
        setCategories(categoriesJson.data ?? []);
        setEditingProduct(product);
      }
    } catch {
      // Leave the dashboard state untouched if preloading edit data fails.
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl bg-gray-100" />
          <div className="h-72 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-red-300" />
        <p className="text-sm font-medium text-red-700">{error ?? 'No product analytics available.'}</p>
        <Button type="button" variant="outline" onClick={() => setRetryToken((current) => current + 1)}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const rankingScopeDescription = hasSelectedMonth
    ? formatMonthLabel(selectedMonth!)
    : activePeriod === 'week'
      ? 'the last 7 days'
      : activePeriod === 'month'
        ? 'the last 30 days'
        : 'all time';

  const alertCap = 5;
  const allStockAlerts = [
    ...data.outOfStockList.map((item) => ({ ...item, status: 'out' as const })),
    ...data.lowStockList.map((item) => ({ ...item, status: 'low' as const })),
  ];
  const stockAlerts = allStockAlerts.slice(0, alertCap);
  const missingImages = data.missingImageList.slice(0, alertCap);

  const productCards: DashboardCardDefinition[] = [
      {
        id: 'top-categories',
        title: 'Products by Category',
        description: 'Top 10 categories by product count.',
        icon: <Tag className="h-4 w-4" />,
        contentClassName: 'p-6',
        render: () =>
          data.topCategories.length === 0 ? (
            <p className="text-sm text-gray-500">No category breakdown yet.</p>
          ) : (
            <div id="pdf-chart-top-categories">
              <CategoryChart data={data.topCategories} />
            </div>
          ),
      },
      {
        id: 'most-edited-products',
        title: 'Most Edited Products',
        description: `Products with the most logged edits for ${rankingScopeDescription}.`,
        icon: <Pencil className="h-4 w-4" />,
        headerMeta: (
          <TooltipProvider delayDuration={200}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-gray-400 cursor-default" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
                Edit counts are based on activity logs. If logs have been purged, counts only reflect the period after the last purge.
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        ),
        contentClassName: 'p-6',
        render: () => (
          <div className="space-y-4">
            {hasSelectedMonth ? (
              <div
                className="w-fit rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: BRAND_LIGHT,
                  color: '#8a6b73',
                  borderColor: 'rgba(231,163,176,0.25)',
                }}
              >
                {formatMonthLabel(selectedMonth!)}
              </div>
            ) : (
              <div
                className="flex w-fit items-center gap-1 rounded-lg p-0.5"
                style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
              >
                {(['all', 'month', 'week'] as Period[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePeriodChange(option)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: activePeriod === option ? 'white' : 'transparent',
                      color: activePeriod === option ? '#111827' : '#6b7280',
                      boxShadow: activePeriod === option ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {option === 'all' ? 'All time' : option === 'month' ? '30 days' : '7 days'}
                  </button>
                ))}
              </div>
            )}

            {showPeriodLoading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-8 rounded bg-gray-100" />
                ))}
              </div>
            ) : (
              <MetricList items={data.mostEdited} valueKey="edits" suffix="edit" />
            )}
          </div>
        ),
      },
      {
        id: 'most-viewed-products',
        title: 'Most Viewed Products',
        description: `Products with the most catalog clicks for ${rankingScopeDescription}.`,
        icon: <Package className="h-4 w-4" />,
        contentClassName: 'p-6',
        render: () => <MetricList items={data.mostViewed} valueKey="views" suffix="view" />,
      },
      {
        id: 'stock-alerts',
        title: 'Stock Alerts',
        description: 'Out of stock or running low (5 or fewer remaining).',
        icon: <AlertTriangle className="h-4 w-4" />,
        render: () =>
          stockAlerts.length === 0 ? (
            <p className="text-sm text-gray-500">No stock alerts right now.</p>
          ) : (
            <div className="space-y-2">
              {stockAlerts.map((item) => (
                <div
                  key={`${item.id}-${item.status}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div className="min-w-0 flex flex-1 items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#111827]">{item.name}</p>
                    <div className="shrink-0">
                      <StockBadge stock={item.stock} />
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className={CARD_ROW_ACTION_BUTTON_CLASS}
                    onClick={() => handleEditClick(item.id)}
                    disabled={loadingProductId === item.id}
                  >
                    {loadingProductId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              {allStockAlerts.length > alertCap ? (
                <div className="pt-1">
                  <Link href="/dashboard/inventory" className="flex items-center gap-1 text-xs font-medium" style={{ color: BRAND }}>
                    View all {allStockAlerts.length} alerts in Inventory <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : null}
            </div>
          ),
      },
      {
        id: 'missing-images',
        title: 'Missing Images',
        description: 'Products without a photo that still need catalog-ready images.',
        icon: <ImageOff className="h-4 w-4" />,
        render: () =>
          missingImages.length === 0 ? (
            <p className="text-sm text-gray-500">All tracked products have images.</p>
          ) : (
            <div className="space-y-2">
              {missingImages.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-4 py-3"
                >
                  <p className="truncate text-sm font-medium text-[#111827]">{item.name}</p>
                  <Button
                    size="icon"
                    variant="outline"
                    className={CARD_ROW_ACTION_BUTTON_CLASS}
                    onClick={() => handleEditClick(item.id)}
                    disabled={loadingProductId === item.id}
                  >
                    {loadingProductId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              {data.missingImageList.length > alertCap ? (
                <div className="pt-1">
                  <Link href="/dashboard/inventory" className="flex items-center gap-1 text-xs font-medium" style={{ color: BRAND }}>
                    View all {data.missingImageList.length} in Inventory <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : null}
            </div>
        ),
      },
    ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          {selectedMonth && selectedMonth !== 'all'
            ? `Showing product analytics for ${selectedMonth}.`
            : 'Showing the full product analytics summary.'}{' '}
          Product rankings follow {hasSelectedMonth ? 'the selected month.' : 'the selected time range.'}
        </p>
        <p className="text-xs text-gray-500">
          {lastUpdated ? `Last updated at ${lastUpdated}` : 'Waiting for product data'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Total Products',
            value: data.summary.totalProducts,
            icon: <Package className="h-5 w-5" style={{ color: BRAND }} />,
            bg: BRAND_LIGHT,
          },
          {
            label: 'Categories',
            value: data.summary.totalCategories,
            icon: <Tag className="h-5 w-5" style={{ color: '#6366f1' }} />,
            bg: '#eef2ff',
          },
          {
            label: 'Low Stock',
            value: data.summary.lowStock,
            icon: <AlertTriangle className="h-5 w-5" style={{ color: '#f59e0b' }} />,
            bg: '#fffbeb',
          },
          {
            label: 'Out of Stock',
            value: data.summary.outOfStock,
            icon: <XCircle className="h-5 w-5" style={{ color: '#ef4444' }} />,
            bg: '#fef2f2',
          },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="shrink-0 rounded-xl p-3" style={{ backgroundColor: card.bg }}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <DashboardCardLayout
        surface="admin_analytics_products"
        cards={productCards}
        gridClassName="grid grid-cols-1 gap-6 lg:auto-rows-max lg:grid-cols-2 lg:grid-flow-row-dense xl:grid-cols-3"
        desktopRailTopClass="top-56"
        desktopRailTabTopClass="top-64"
      />

      {editingProduct ? (
        <AddProduct
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          categories={categories}
          productToEdit={editingProduct}
          onProductSaved={() => {
            setEditingProduct(null);
            void fetchData(activePeriod, selectedMonth, true);
          }}
        />
      ) : null}
    </div>
  );
}




