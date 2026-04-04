import { NextRequest, NextResponse } from "next/server";

import { admin } from "@dollys-closet/core/lib/supabase/admin";
import { productHelper } from "@/lib/products/product-helper";
import { resolveProductPlaceholder } from "@/lib/images/product-placeholder";
import { normalizeImageUrl } from "@/lib/images/normalize-image-url";
import { InventoryCategory, InventoryProduct, InventoryProductImage } from "@/types/inventory.types";

type CatalogProduct = {
  id: string;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryPath: string;
  price: number;
  brand: string;
  size: string;
  condition: string;
  description: string;
  stock: number;
  isNewArrival: boolean;
  images: string[];
  createdAt: string;
};

function buildCategoryPath(categoryId: number, categoryMap: Map<number, InventoryCategory>) {
  const category = categoryMap.get(categoryId);
  if (!category) return "Uncategorized";

  const path: string[] = [category.category_name];
  let parentId = category.parent_category;
  const visited = new Set<number>([categoryId]);

  while (parentId !== null) {
    if (visited.has(parentId)) break;
    visited.add(parentId);

    const parent = categoryMap.get(parentId);
    if (!parent) break;

    path.unshift(parent.category_name);
    parentId = parent.parent_category;
  }

  return path.join(" > ");
}

function mapProduct(
  product: InventoryProduct,
  categories: InventoryCategory[],
  images: InventoryProductImage[]
): CatalogProduct {
  const categoryMap = new Map(categories.map((category) => [Number(category.category_id), category]));
  const productId = String(product.product_id);
  const relatedCategory = categoryMap.get(Number(product.category_id));
  const orderedImages = images
    .sort((a, b) => {
      if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
      return a.is_primary ? -1 : 1;
    })
    .map((image) => normalizeImageUrl(image.image_url))
    .filter(Boolean);

  const fallbackPrimary = product.image_id
    ? normalizeImageUrl(images.find((image) => image.image_id === product.image_id)?.image_url)
    : null;

  const imagesWithFallback = orderedImages.length > 0
    ? orderedImages
    : fallbackPrimary
      ? [fallbackPrimary]
      : [resolveProductPlaceholder(buildCategoryPath(Number(product.category_id), categoryMap))];

  return {
    id: productId,
    name: product.product_name,
    categoryId: Number(product.category_id),
    categoryName: relatedCategory?.category_name || "Uncategorized",
    categoryPath: buildCategoryPath(Number(product.category_id), categoryMap),
    price: Number(product.product_price || 0),
    brand: product.product_brand || "Dolly's Closet",
    size: product.size_label || "One Size",
    condition: product.product_condition || "N/A",
    description: product.product_description || "",
    stock: Number(product.product_stock || 0),
    isNewArrival: Boolean(product.created_at && (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7),
    images: imagesWithFallback,
    createdAt: product.created_at || new Date(0).toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [categoriesResult, productResult, imagesResult] = await Promise.all([
      productHelper.getCategories(admin),
      productHelper.getProductById(id, admin),
      productHelper.getProductImages(id, admin),
    ]);

    if (categoriesResult.error) {
      return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 });
    }

    if (productResult.error) {
      return NextResponse.json({ error: productResult.error.message }, { status: 500 });
    }

    if (imagesResult.error) {
      return NextResponse.json({ error: imagesResult.error.message }, { status: 500 });
    }

    const product = productResult.data as InventoryProduct | null;

    if (!product || !product.show_in_catalog) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const mappedProduct = mapProduct(
      product,
      (categoriesResult.data || []) as InventoryCategory[],
      (imagesResult.data || []) as InventoryProductImage[]
    );

    return NextResponse.json({ data: mappedProduct });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch product" },
      { status: 500 }
    );
  }
}
