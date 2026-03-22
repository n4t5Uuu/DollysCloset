import { admin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { productHelper } from '@/lib/products/product-helper';
import { activityHelper } from '@/lib/activity/activity-helper';

export async function GET(request: Request) {
  try {
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

    const [productsResult, categoriesResult, logsResult, viewsResult] = await Promise.all([
      productHelper.getProducts(admin),
      productHelper.getCategories(admin),
      activityHelper.fetchLogsByAction('edit_product', sinceDate || undefined, untilDate || undefined, admin),
      activityHelper.fetchLogsByAction('view_product', sinceDate || undefined, untilDate || undefined, admin),
    ]);

    const products = productsResult.data ?? [];
    const categories = categoriesResult.data ?? [];
    const editLogs = logsResult.data ?? [];
    const viewLogs = viewsResult.data ?? [];

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
    const editCounts: Record<number, number> = {};
    for (const log of editLogs) {
      if (log.product_id != null) {
        editCounts[log.product_id] = (editCounts[log.product_id] ?? 0) + 1;
      }
    }
    const productMap = new Map(products.map(p => [p.product_id, p.product_name]));
    const mostEdited = Object.entries(editCounts)
      .map(([id, edits]) => ({
        name: productMap.get(Number(id)) ?? 'Unknown Product',
        edits,
      }))
      .sort((a, b) => b.edits - a.edits)
      .slice(0, 8);

    // Most viewed products
    const viewCounts: Record<number, number> = {};
    for (const log of viewLogs) {
      if (log.product_id != null) {
        viewCounts[log.product_id] = (viewCounts[log.product_id] ?? 0) + 1;
      }
    }
    const mostViewed = Object.entries(viewCounts)
      .map(([id, views]) => ({
        name: productMap.get(Number(id)) ?? 'Unknown Product',
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
