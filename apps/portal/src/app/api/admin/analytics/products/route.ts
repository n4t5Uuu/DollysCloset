import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createAdminClient, productHelper } from '@dollys-closet/core';
import { NextResponse } from 'next/server';
import { activityHelper } from '@/lib/activity/activity-helper';
import { requireRequestAuth } from '@/lib/auth/auth-server';

function getAnalyticsClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
}

function normalizeAnalyticsError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('bad gateway') || lower.includes('502')) {
    return {
      error: 'Product analytics are temporarily unavailable. Please try again in a moment.',
      status: 502,
    };
  }

  if (lower.includes('permission') || lower.includes('403')) {
    return {
      error: 'The product analytics report could not be accessed with the current credentials.',
      status: 502,
    };
  }

  return {
    error: message,
    status: 500,
  };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? 'all'; // 'week' | 'month' | 'all'
    const monthParam = searchParams.get('month'); // Expects "YYYY-MM"

    const now = new Date();
    let sinceDate: string | null = null;
    let untilDate: string | null = null;

    if (monthParam) {
      const [year, month] = monthParam.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      sinceDate = d.toISOString();
      // Calculate first day of next month
      const nextD = new Date(Number(year), Number(month), 1);
      untilDate = nextD.toISOString();
    } else if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      sinceDate = d.toISOString();
    } else if (period === 'month') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      sinceDate = d.toISOString();
    }

    const supabaseAdmin = createAdminClient();

    const [productsResult, categoriesResult, logsResult] = await Promise.all([
      productHelper.getProducts(supabaseAdmin),
      productHelper.getCategories(supabaseAdmin),
      activityHelper.fetchLogsByAction('edit_product', sinceDate || undefined, untilDate || undefined, supabaseAdmin),
    ]);

    const products = productsResult.data ?? [];
    const categories = categoriesResult.data ?? [];
    const editLogs = logsResult.data ?? [];

    // Summary
    const totalProducts = products.length;
    const outOfStockList = products
      .filter(p => p.product_stock === 0)
      .map(p => ({ id: p.product_id, name: p.product_name, stock: 0 }));
    const lowStockList = products
      .filter(p => p.product_stock > 0 && p.product_stock <= 5)
      .map(p => ({ id: p.product_id, name: p.product_name, stock: p.product_stock }))
      .sort((a, b) => a.stock - b.stock);
    const missingImageList = products
      .filter(p => !p.image_id)
      .map(p => ({ id: p.product_id, name: p.product_name }));
    const totalCategories = new Set(products.map(p => p.category_id)).size;

    // Category breakdown
    const categoryMap = new Map(categories.map(c => [c.category_id, c.category_name]));
    const categoryCounts: Record<string, number> = {};
    for (const product of products) {
      const name = categoryMap.get(product.category_id) ?? 'Uncategorized';
      categoryCounts[name] = (categoryCounts[name] ?? 0) + 1;
    }
    const allCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    const topCategories = allCategories.slice(0, 10);
    const topNames = new Set(topCategories.map(c => c.category));
    const bottomCategories = allCategories
      .filter(c => !topNames.has(c.category))
      .slice(-10)
      .reverse();

    // Most edited products
    const editCounts: Record<string, number> = {};
    for (const log of editLogs) {
      if (log.product_id != null) {
        const productId = String(log.product_id);
        editCounts[productId] = (editCounts[productId] ?? 0) + 1;
      }
    }
    const productMap = new Map(products.map(p => [String(p.product_id), p.product_name]));
    const mostEdited = Object.entries(editCounts)
      .map(([id, edits]) => ({
        name: productMap.get(id) ?? 'Unknown Product',
        edits,
      }))
      .sort((a, b) => b.edits - a.edits)
      .slice(0, 8);

    // Most viewed products from GA4 product page paths (/product/:id)
    const propertyId = process.env.GA4_PROPERTY_ID;
    const hasGaConfig = Boolean(propertyId && process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY);
    const gaStartDate = monthParam
      ? sinceDate!.slice(0, 10)
      : period === 'week'
        ? '7daysAgo'
        : period === 'month'
          ? '30daysAgo'
          : '365daysAgo';
    const gaEndDate = monthParam ? new Date(new Date(untilDate!).getTime() - 1000).toISOString().slice(0, 10) : 'today';

    const viewCounts: Record<string, number> = {};

    if (hasGaConfig) {
      const client = getAnalyticsClient();
      const [viewsResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: gaStartDate, endDate: gaEndDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 200,
      });

      const rows = viewsResponse.rows ?? [];
      for (const row of rows) {
        const path = row.dimensionValues?.[0]?.value ?? '';
        const views = Number(row.metricValues?.[0]?.value ?? 0);
        const productMatch = path.match(/^\/product\/([^/?#]+)/);

        if (!productMatch || views <= 0) {
          continue;
        }

        const productId = decodeURIComponent(productMatch[1]);
        if (!productMap.has(productId)) {
          continue;
        }

        viewCounts[productId] = (viewCounts[productId] ?? 0) + views;
      }
    }

    const mostViewed = Object.entries(viewCounts)
      .map(([id, views]) => ({
        name: productMap.get(id) ?? 'Unknown Product',
        views,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    return NextResponse.json({
      summary: { totalProducts, totalCategories, outOfStock: outOfStockList.length, lowStock: lowStockList.length },
      topCategories,
      bottomCategories,
      mostEdited,
      mostViewed,
      outOfStockList,
      lowStockList,
      missingImageList,
    });
  } catch (err: unknown) {
    const normalized = normalizeAnalyticsError(err);
    return NextResponse.json({ error: normalized.error }, { status: normalized.status });
  }
}
