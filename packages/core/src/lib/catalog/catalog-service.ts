import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogApiProduct, CatalogCategory } from "../../types/product.types";
import type { InventoryProduct, InventoryProductImage } from "../../types/inventory.types";
import { productHelper } from "./product-helper";
import { mapCatalogProduct, mapCatalogProducts } from "./catalog-mappers";

export async function getCatalogPayload(supabase: SupabaseClient) {
  const [categoriesResult, productsResult, imagesResult] = await Promise.all([
    productHelper.getCategories(supabase),
    productHelper.getProductsCatalog(supabase),
    productHelper.getProductImagesAll(supabase),
  ]);

  if (categoriesResult.error) {
    return { data: null, error: categoriesResult.error };
  }

  if (productsResult.error) {
    return { data: null, error: productsResult.error };
  }

  if (imagesResult.error) {
    return { data: null, error: imagesResult.error };
  }

  const categories = (categoriesResult.data || []) as CatalogCategory[];
  const products = (productsResult.data || []) as InventoryProduct[];
  const images = (imagesResult.data || []) as InventoryProductImage[];
  const mappedProducts = mapCatalogProducts(products, categories, images);
  const featuredProducts = [...mappedProducts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return {
    data: {
      categories,
      products: mappedProducts,
      featuredProducts,
    },
    error: null,
  };
}

export async function getCatalogProductById(productId: string, supabase: SupabaseClient) {
  const [categoriesResult, productResult, imagesResult] = await Promise.all([
    productHelper.getCategories(supabase),
    productHelper.getProductById(productId, supabase),
    productHelper.getProductImages(productId, supabase),
  ]);

  if (categoriesResult.error) {
    return { data: null, error: categoriesResult.error };
  }

  if (productResult.error) {
    return { data: null, error: productResult.error };
  }

  if (imagesResult.error) {
    return { data: null, error: imagesResult.error };
  }

  const product = productResult.data as InventoryProduct | null;
  if (!product || !product.show_in_catalog) {
    return { data: null, error: null };
  }

  return {
    data: mapCatalogProduct(
      product,
      (categoriesResult.data || []) as CatalogCategory[],
      (imagesResult.data || []) as InventoryProductImage[]
    ) as CatalogApiProduct,
    error: null,
  };
}
