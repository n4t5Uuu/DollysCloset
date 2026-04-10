import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogApiProduct, CatalogCategory, CatalogPayload } from "../../types/product.types";
import type { InventoryProduct, InventoryProductImage } from "../../types/inventory.types";
import { productHelper } from "./product-helper";
import { mapCatalogProduct, mapCatalogProducts } from "./catalog-mappers";
import { seasonHelper } from "./season-helper";

export async function getCatalogPayload(supabase: SupabaseClient) {
  const [categoriesResult, productsResult, imagesResult, seasonsResult] = await Promise.all([
    productHelper.getCategories(supabase),
    productHelper.getProductsCatalog(supabase),
    productHelper.getProductImagesAll(supabase),
    seasonHelper.getSeasons(supabase),
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

  if (seasonsResult.error) {
    return { data: null, error: seasonsResult.error };
  }

  const categories = (categoriesResult.data || []) as CatalogCategory[];
  const products = (productsResult.data || []) as InventoryProduct[];
  const images = (imagesResult.data || []) as InventoryProductImage[];
  const mappedProducts = mapCatalogProducts(products, categories, images);
  const seasonById = new Map(
    (seasonsResult.data || []).map((season) => [String(season.season_id), season.season_name])
  );
  const mappedProductsWithSeasons = mappedProducts.map((product) => ({
    ...product,
    seasonName: product.seasonId ? (seasonById.get(product.seasonId) || null) : null,
  }));
  const featuredProducts = [...mappedProductsWithSeasons].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);
  const activeSeason = seasonHelper.getActiveSeason(seasonsResult.data || []);

  return {
    data: {
      categories,
      products: mappedProductsWithSeasons,
      featuredProducts,
      activeSeason,
    } as CatalogPayload,
    error: null,
  };
}

export async function getCatalogProductById(productId: string, supabase: SupabaseClient) {
  const [categoriesResult, productResult, imagesResult, seasonsResult] = await Promise.all([
    productHelper.getCategories(supabase),
    productHelper.getProductById(productId, supabase),
    productHelper.getProductImages(productId, supabase),
    seasonHelper.getSeasons(supabase),
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

  if (seasonsResult.error) {
    return { data: null, error: seasonsResult.error };
  }

  const product = productResult.data as InventoryProduct | null;
  if (!product || !product.show_in_catalog) {
    return { data: null, error: null };
  }

  const mapped = mapCatalogProduct(
      product,
      (categoriesResult.data || []) as CatalogCategory[],
      (imagesResult.data || []) as InventoryProductImage[]
    ) as CatalogApiProduct;

  const seasonById = new Map(
    (seasonsResult.data || []).map((season) => [String(season.season_id), season.season_name])
  );

  return {
    data: {
      ...mapped,
      seasonName: mapped.seasonId ? (seasonById.get(mapped.seasonId) || null) : null,
    },
    error: null,
  };
}
