import JSZip from "jszip";
import { buildXlsxBuffer } from "./xlsxExport";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Extracts the relative object path from a product-images storage URL. */
function extractStoragePath(imageUrl: string): string {
  try {
    const decoded = decodeURIComponent(imageUrl);
    const marker = "/product-images/";
    const idx = decoded.indexOf(marker);
    if (idx >= 0) return decoded.slice(idx + marker.length);
    return decoded.split("/").slice(-2).join("/");
  } catch {
    return imageUrl.split("/").slice(-2).join("/");
  }
}

/** Returns the filename portion of a storage path (last segment). */
function pathFilename(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath;
}

export interface ProductForExport {
  product_id: number | string;
  [key: string]: unknown;
}

export interface ProductImageForExport {
  image_id: number | string;
  product_id: number | string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * Builds a ZIP archive containing:
 *   - `products.xlsx`  — one row per product (image URLs joined with ` | `)
 *   - `images/<product_id>/<filename>`  — actual image blobs from storage
 *   - `manifest.json`  — export summary
 *
 * Image downloads are best-effort: failures are logged to `manifest.json`
 * rather than aborting the entire export.
 */
export async function buildProductArchiveZip(
  products: ProductForExport[],
  images: ProductImageForExport[],
  supabase: SupabaseClient,
  cutoffIso: string
): Promise<Buffer> {
  const zip = new JSZip();

  // --- Build images folder ---
  const imagesByProduct = new Map<string, ProductImageForExport[]>();
  for (const img of images) {
    const key = String(img.product_id);
    if (!imagesByProduct.has(key)) imagesByProduct.set(key, []);
    imagesByProduct.get(key)!.push(img);
  }

  let downloadedCount = 0;
  let failedCount = 0;
  const failedPaths: string[] = [];

  for (const img of images) {
    const storagePath = extractStoragePath(img.image_url);
    const filename = pathFilename(storagePath);
    const zipPath = `images/${img.product_id}/${filename}`;

    try {
      const { data, error } = await supabase.storage
        .from("product-images")
        .download(storagePath);

      if (error || !data) {
        throw new Error(error?.message ?? "Empty response");
      }

      const arrayBuffer = await data.arrayBuffer();
      zip.file(zipPath, arrayBuffer);
      downloadedCount++;
    } catch (err) {
      failedCount++;
      failedPaths.push(storagePath);
      console.warn(`ZIP export: failed to download image ${storagePath}:`, err);
    }
  }

  // --- Build XLSX metadata ---
  const imageUrlMap = new Map<string, string[]>();
  for (const img of images) {
    const key = String(img.product_id);
    if (!imageUrlMap.has(key)) imageUrlMap.set(key, []);
    imageUrlMap.get(key)!.push(img.image_url);
  }

  const rows = products.map((product) => {
    const imgUrls = imageUrlMap.get(String(product.product_id)) ?? [];
    // Flatten to a single cell — use " | " as delimiter
    return { ...product, image_urls: imgUrls.join(" | ") };
  });

  const xlsxBuffer = buildXlsxBuffer("Archived Products", rows as Record<string, unknown>[]);
  zip.file("products.xlsx", xlsxBuffer);

  // --- Manifest ---
  const manifest = {
    exported_at: new Date().toISOString(),
    cutoff: cutoffIso,
    product_count: products.length,
    image_count: images.length,
    images_downloaded: downloadedCount,
    images_failed: failedCount,
    failed_image_paths: failedPaths,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return content;
}
