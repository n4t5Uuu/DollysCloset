import { admin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? 'all'; // 'week' | 'month' | 'all'

    const now = new Date();
    let sinceDate: string | null = null;
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      sinceDate = d.toISOString();
    } else if (period === 'month') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      sinceDate = d.toISOString();
    }

    let logsQuery = admin
      .from('tbl_activity_log')
      .select('product_id')
      .eq('action_type', 'edit_product');

    if (sinceDate) {
      logsQuery = logsQuery.gte('created_at', sinceDate);
    }

    const [productsResult, categoriesResult, logsResult] = await Promise.all([
      admin.from('tbl_product').select('product_id, product_name, product_stock, category_id, image_id'),
      admin.from('tbl_category').select('category_id, category_name'),
      logsQuery,
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

    return NextResponse.json({
      summary: { totalProducts, totalCategories, outOfStock: outOfStockList.length, lowStock: lowStockList.length },
      topCategories,
      bottomCategories,
      mostEdited,
      outOfStockList,
      lowStockList,
      missingImageList,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
