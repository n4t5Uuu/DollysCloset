import type { CatalogApiProduct, CatalogCategory } from "../../types/product.types";
import type { InventoryProduct, InventoryProductImage } from "../../types/inventory.types";
import { normalizeImageUrl } from "../images/normalize-image-url";
import { resolveProductPlaceholder } from "../images/product-placeholder";
import { discountHelper } from "./discount-helper";

export function buildCategoryPath(categoryId: number, categoryMap: Map<number, CatalogCategory>) {
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

export function mapCatalogProduct(
  product: InventoryProduct,
  categories: CatalogCategory[],
  images: InventoryProductImage[]
): CatalogApiProduct {
  const categoryMap = new Map(categories.map((category) => [Number(category.category_id), category]));
  const productId = String(product.product_id);
  const relatedCategory = categoryMap.get(Number(product.category_id));
  const orderedImages = images
    .sort((a, b) => {
      if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
      return a.is_primary ? -1 : 1;
    })
    .map((image) => normalizeImageUrl(image.image_url))
    .filter((image): image is string => Boolean(image));

  const fallbackPrimary = product.image_id
    ? normalizeImageUrl(images.find((image) => image.image_id === product.image_id)?.image_url)
    : null;

  const categoryPath = buildCategoryPath(Number(product.category_id), categoryMap);
  const basePrice = Number(product.product_price || 0);
  const normalizedDiscountPercent = Math.min(100, Math.max(0, Number(product.discount_percent || 0)));
  const discountedPrice = Number(
    (basePrice * (1 - normalizedDiscountPercent / 100)).toFixed(2)
  );

  // Check if discount is still valid (not expired)
  const discountExpiresAt = product.discount_expires_at ? product.discount_expires_at : null;
  const isDiscountExpired = discountExpiresAt ? new Date(discountExpiresAt) < new Date() : false;
  const isOnSale = normalizedDiscountPercent > 0 && !isDiscountExpired;

  const imagesWithFallback = orderedImages.length > 0
    ? orderedImages
    : fallbackPrimary
      ? [fallbackPrimary]
      : [resolveProductPlaceholder(categoryPath)];

  return {
    id: productId,
    name: product.product_name,
    categoryId: Number(product.category_id),
    categoryName: relatedCategory?.category_name || "Uncategorized",
    categoryPath,
    price: basePrice,
    discountPercent: normalizedDiscountPercent,
    discountedPrice,
    brand: product.product_brand || "Dolly's Closet",
    size: product.size_label || "One Size",
    condition: product.product_condition || "N/A",
    description: product.product_description || "",
    stock: Number(product.product_stock || 0),
    isNewArrival: Boolean(product.created_at && (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7),
    discountExpiresAt,
    isOnSale,
    images: imagesWithFallback,
    createdAt: product.created_at || new Date(0).toISOString(),
    discount: product.discount || null,
    discountedPrice: product.discountedPrice ?? (
      product.discount ? discountHelper.calculateDiscountedPrice(Number(product.product_price || 0), product.discount) : null
    ),
    isOnSale: Boolean(product.isOnSale ?? product.discount),
    seasonId: product.season_id ?? null,
  };
}

export function mapCatalogProducts(
  products: InventoryProduct[],
  categories: CatalogCategory[],
  images: InventoryProductImage[]
): CatalogApiProduct[] {
  const imageByProductId = new Map<string, InventoryProductImage[]>();
  for (const image of images) {
    const key = String(image.product_id);
    const current = imageByProductId.get(key) || [];
    current.push(image);
    imageByProductId.set(key, current);
  }

  return products.map((product) =>
    mapCatalogProduct(product, categories, imageByProductId.get(String(product.product_id)) || [])
  );
}
