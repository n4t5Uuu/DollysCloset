import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
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

function mapProducts(
  products: InventoryProduct[],
  categories: InventoryCategory[],
  images: InventoryProductImage[]
): CatalogProduct[] {
  const categoryMap = new Map(categories.map((category) => [Number(category.category_id), category]));

  const imageByProductId = new Map<string, InventoryProductImage[]>();
  for (const image of images) {
    const key = String(image.product_id);
    const current = imageByProductId.get(key) || [];
    current.push(image);
    imageByProductId.set(key, current);
  }

  return products.map((product) => {
    const productId = String(product.product_id);
    const relatedCategory = categoryMap.get(Number(product.category_id));
    const orderedImages = (imageByProductId.get(productId) || [])
      .sort((a, b) => {
        if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
        return a.is_primary ? -1 : 1;
      })
      .map((image) => image.image_url)
      .filter(Boolean);

    const fallbackPrimary = product.image_id
      ? (imageByProductId.get(productId) || []).find((image) => image.image_id === product.image_id)?.image_url
      : null;

    const imagesWithFallback = orderedImages.length > 0
      ? orderedImages
      : fallbackPrimary
        ? [fallbackPrimary]
        : ["/placeholder.png"];

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
      isNewArrival: Boolean(product.created_at && (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 14),
      images: imagesWithFallback,
      createdAt: product.created_at || new Date(0).toISOString(),
    };
  });
}

export async function GET() {
  try {
    const [{ data: categories, error: categoriesError }, { data: products, error: productsError }, { data: images, error: imagesError }] = await Promise.all([
      admin.from("tbl_category").select("*").order("category_id", { ascending: true }),
      admin
        .from("tbl_product")
        .select("*")
        .eq("show_in_catalog", true)
        .order("created_at", { ascending: false, nullsFirst: false }),
      admin.from("tbl_product_image").select("*").order("display_order", { ascending: true }),
    ]);

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (imagesError) {
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    const catalogProducts = mapProducts(
      (products || []) as InventoryProduct[],
      (categories || []) as InventoryCategory[],
      (images || []) as InventoryProductImage[]
    );

    const newestProducts = [...catalogProducts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      data: {
        categories: categories || [],
        products: catalogProducts,
        featuredProducts: newestProducts.slice(0, 5),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}
