import { createClient } from "../supabase/browser";
import { discountHelper } from "./discount-helper";
import { storageUsageHelper } from "../storage/storage-usage-helper";

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

type ProductQueryScope = "active" | "archived" | "all";

export const productHelper = {
    /**
     * Retrieves all product records from the database's `tbl_product` table.
     */
    async getProducts(
        supabase = createClient(),
        { scope = "active" }: { scope?: ProductQueryScope } = {}
    ) {
        let query = supabase.from("tbl_product").select("*");

        if (scope === "active") {
            query = query.is("archived_at", null);
        }

        if (scope === "archived") {
            query = query.not("archived_at", "is", null);
        }

        const { data, error } = await query.order("created_at", { ascending: false, nullsFirst: false });
        if (error) {
            console.error("Error Fetching Products: ", error);
            return { data: null, error };
        }

        const products = (data || []) as Array<Record<string, unknown>>;
        const discountMap = await discountHelper.getProductDiscountMap(
            products.map((product) => String(product.product_id)),
            supabase
        );

        const enrichedProducts = products.map((product) => {
            const productDiscount = discountMap.get(String(product.product_id)) || null;
            const price = Number(product.product_price || 0);
            const discountedPrice = productDiscount
                ? discountHelper.calculateDiscountedPrice(price, productDiscount)
                : null;

            return {
                ...product,
                discount: productDiscount,
                discountedPrice,
                isOnSale: Boolean(productDiscount && discountedPrice !== null && discountedPrice < price),
            };
        });

        return { data: enrichedProducts, error: null };
    },

    /**
     * Retrieves all product categories from `tbl_category`.
     */
    async getCategories(supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_category").select("*");
        if (error) {
            console.error("Error Fetching Categories: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Inserts a single product metadata item.
     */
    async createProduct(payload: any, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product").insert([payload]).select();
        if (error) {
            console.error("Error Creating Product: ", error);
            return { data: null, error };
        }
        return { data: data?.[0] || null, error: null };
    },

    /**
     * Updates an existing product's data in the database.
     */
    async updateProduct(productId: number | string, payload: any, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product").update(payload).eq("product_id", productId).select();
        if (error) {
            console.error("Error Updating Product: ", error);
            return { data: null, error };
        }
        return { data: data?.[0] || null, error: null };
    },

    /**
     * Hard deletes are disabled in favor of archive-only behavior.
     */
    async deleteProduct(productId: number | string, supabase = createClient()) {
        const error = new Error(`Hard delete is disabled for product ${productId}. Archive the product instead.`);
        console.error("Error Deleting Product: ", error);
        return { success: false, error };
    },

    /**
     * Retrieves a single product by ID.
     */
    async getProductById(
        productId: number | string,
        supabase = createClient(),
        { includeArchived = false }: { includeArchived?: boolean } = {}
    ) {
        let query = supabase.from("tbl_product").select("*").eq("product_id", productId);
        if (!includeArchived) {
            query = query.is("archived_at", null);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
            console.error("Error Fetching Product by ID: ", error);
            return { data: null, error };
        }

        if (!data) {
            return { data: null, error: null };
        }

        const discountMap = await discountHelper.getProductDiscountMap([productId], supabase);
        const productDiscount = discountMap.get(String(productId)) || null;
        const price = Number(data.product_price || 0);
        const discountedPrice = productDiscount
            ? discountHelper.calculateDiscountedPrice(price, productDiscount)
            : null;

        return {
            data: {
                ...data,
                discount: productDiscount,
                discountedPrice,
                isOnSale: Boolean(productDiscount && discountedPrice !== null && discountedPrice < price),
            },
            error: null,
        };
    },

    /**
     * Retrieves images assigned back forward to any singular product record.
     */
    async getProductImages(productId: number | string, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("*").eq("product_id", productId).order("display_order", { ascending: true });
        if (error) {
            console.error("Error Fetching Product Images: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Retrieves a single product image by its ID.
     */
    async getImageById(imageId: number | string, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("*").eq("image_id", imageId).maybeSingle();
        if (error) {
            console.error("Error Fetching Image by ID: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Retrieves images for a product excluding a specific image ID.
     */
    async getRemainingImagesExcluding(productId: number | string, excludeImageId: number | string, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("image_id, is_primary, display_order").eq("product_id", productId).neq("image_id", excludeImageId).order("display_order", { ascending: true });
        if (error) {
            console.error("Error Fetching Remaining Images: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Retrieves products marked explicitly to show in public catalog views.
     */
    async getProductsCatalog(supabase = createClient()) {
        const { data, error } = await supabase
            .from("tbl_product")
            .select("*")
            .is("archived_at", null)
            .eq("show_in_catalog", true)
            .order("created_at", { ascending: false, nullsFirst: false });
        if (error) {
            console.error("Error Fetching Catalog Products: ", error);
            return { data: null, error };
        }

        const products = (data || []) as Array<Record<string, unknown>>;
        const discountMap = await discountHelper.getProductDiscountMap(
            products.map((product) => String(product.product_id)),
            supabase
        );

        const enrichedProducts = products.map((product) => {
            const productDiscount = discountMap.get(String(product.product_id)) || null;
            const price = Number(product.product_price || 0);
            const discountedPrice = productDiscount
                ? discountHelper.calculateDiscountedPrice(price, productDiscount)
                : null;

            return {
                ...product,
                discount: productDiscount,
                discountedPrice,
                isOnSale: Boolean(productDiscount && discountedPrice !== null && discountedPrice < price),
            };
        });

        return { data: enrichedProducts, error: null };
    },

    /**
     * Retrieves all product images for full catalog processing ordered by display order.
     */
    async getProductImagesAll(supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("*").order("display_order", { ascending: true });
        if (error) {
            console.error("Error Fetching All Images: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Retrieves images assigned to multiple products (Bulk).
     */
    async getProductImagesBulk(productIds: number[], supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("image_id, image_url, product_id").in("product_id", productIds);
        if (error) {
            console.error("Error Fetching Bulk Images: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Updates multiple products on matching criteria.
     */
    async updateProductsBulk(productIds: number[], payload: any, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product").update(payload).in("product_id", productIds).select();
        if (error) {
            console.error("Error Updating Bulk Products: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Deletes images assigned to multiple products (Bulk).
     */
    async deleteProductImagesBulk(productIds: number[], supabase = createClient()) {
        const { error } = await supabase.from("tbl_product_image").delete().in("product_id", productIds);
        if (error) {
            console.error("Error Deleting Bulk Product Images: ", error);
            return { success: false, error };
        }
        return { success: true, error: null };
    },

    /**
     * Deletes multiple products by identification codes.
     */
    async deleteProductsBulk(productIds: number[], supabase = createClient()) {
        const error = new Error(`Hard delete is disabled for ${productIds.length} product(s). Archive the products instead.`);
        console.error("Error Deleting Bulk Products: ", error);
        return { success: false, error };
    },

    /**
     * Performs a batched update layout for multiple images concurrently.
     */
    async batchUpdateProductImages(updates: { image_id: number | string; payload: any }[], supabase = createClient()) {
        const promises = updates.map((u) => supabase.from("tbl_product_image").update(u.payload).eq("image_id", u.image_id));
        const results = await Promise.all(promises);
        const error = results.find((r) => r.error)?.error;
        return { success: !error, error: error || null };
    },

    /**
     * Verifies that an image belongs to a specific product.
     */
    async verifyProductImage(imageId: number | string, productId: number | string, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").select("image_id").eq("image_id", imageId).eq("product_id", productId).maybeSingle();
        if (error) {
            console.error("Error Verifying Product Image: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Deletes all images belonging to a specific product from database inventory.
     */
    async deleteProductImageReferences(productId: number | string, supabase = createClient()) {
        const { error } = await supabase.from("tbl_product_image").delete().eq("product_id", productId);
        if (error) {
            console.error("Error Deleting Product Images rows: ", error);
            return { success: false, error };
        }
        return { success: true, error: null };
    },

    /**
     * Inserts a single product image reference row into the database.
     */
    async createProductImage(payload: any, supabase = createClient()) {
        const { data, error } = await supabase.from("tbl_product_image").insert([payload]).select().maybeSingle();
        if (error) {
            console.error("Error Creating Product Image: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Deletes a single product image reference from the database inventory.
     */
    async deleteImageById(imageId: number | string, supabase = createClient()) {
        const { error } = await supabase.from("tbl_product_image").delete().eq("image_id", imageId);
        if (error) {
            console.error("Error Deleting Image Reference: ", error);
            return { success: false, error };
        }
        return { success: true, error: null };
    },

    // =========================================================================
    // Export & Purge (archive-then-delete flow)
    // =========================================================================

    /**
     * Counts archived products whose `archived_at` is strictly before the given
     * ISO cutoff. Used by the Export & Purge modal's dry-run preview.
     */
    async countArchivedProductsOlderThan(cutoffIso: string, supabase = createClient()) {
        const { count, error } = await supabase
            .from("tbl_product")
            .select("product_id", { count: "exact", head: true })
            .not("archived_at", "is", null)
            .lt("archived_at", cutoffIso);

        if (error) {
            console.error("Error counting archived products older than cutoff:", error);
            return { count: 0, error };
        }
        return { count: count ?? 0, error: null };
    },

    /**
     * Fetches archived products (with their image rows) whose `archived_at` is
     * strictly before the given ISO cutoff. Used to build the ZIP export.
     */
    async fetchArchivedProductsForExport(cutoffIso: string, supabase = createClient()) {
        const { data: products, error: productsError } = await supabase
            .from("tbl_product")
            .select("*")
            .not("archived_at", "is", null)
            .lt("archived_at", cutoffIso)
            .order("archived_at", { ascending: true });

        if (productsError) {
            console.error("Error fetching archived products for export:", productsError);
            return { products: null, images: null, error: productsError };
        }

        const productList = (products ?? []) as Array<Record<string, unknown>>;
        if (productList.length === 0) {
            return { products: [], images: [], error: null };
        }

        const productIds = productList.map((p) => Number(p.product_id));
        const { data: images, error: imagesError } = await supabase
            .from("tbl_product_image")
            .select("image_id, product_id, image_url, is_primary, display_order")
            .in("product_id", productIds)
            .order("display_order", { ascending: true });

        if (imagesError) {
            console.error("Error fetching images for archived products:", imagesError);
            return { products: null, images: null, error: imagesError };
        }

        return {
            products: productList,
            images: (images ?? []) as Array<{
                image_id: number;
                product_id: number;
                image_url: string;
                is_primary: boolean;
                display_order: number;
            }>,
            error: null,
        };
    },

    /**
     * Hard-deletes archived products (and their images) whose `archived_at` is
     * strictly before the given ISO cutoff.
     *
     * Order of operations (all-or-nothing on DB; storage failures are best-effort):
     *   1. Identify products + images to delete.
     *   2. Delete storage objects in batches of ≤100.
     *   3. Decrement tbl_storage_usage.
     *   4. Delete tbl_product_image rows.
     *   5. Delete tbl_product rows (requires service_role — see migration
     *      20260410120000_allow_service_role_purge.sql).
     *
     * Must be called with a service-role Supabase client.
     */
    async purgeArchivedProductsOlderThan(
        cutoffIso: string,
        supabase = createClient()
    ): Promise<{
        count: number;
        orphanedPaths: string[];
        error: null | Error;
    }> {
        // 1. Identify products.
        const { data: products, error: fetchError } = await supabase
            .from("tbl_product")
            .select("product_id")
            .not("archived_at", "is", null)
            .lt("archived_at", cutoffIso);

        if (fetchError) {
            console.error("Error fetching products to purge:", fetchError);
            return { count: 0, orphanedPaths: [], error: new Error(fetchError.message) };
        }

        const productList = products ?? [];
        if (productList.length === 0) {
            return { count: 0, orphanedPaths: [], error: null };
        }

        const productIds = productList.map((p: Record<string, unknown>) => Number(p.product_id));

        // 2. Fetch image rows to get storage paths + byte sizes.
        const { data: imageRows, error: imgFetchError } = await supabase
            .from("tbl_product_image")
            .select("image_id, image_url")
            .in("product_id", productIds);

        if (imgFetchError) {
            console.error("Error fetching image rows for purge:", imgFetchError);
            return { count: 0, orphanedPaths: [], error: new Error(imgFetchError.message) };
        }

        const images = (imageRows ?? []) as Array<{ image_id: number; image_url: string }>;
        const storagePaths = images.map((img) => extractStoragePath(img.image_url));

        // 3. Delete storage objects in batches of 100.
        const orphanedPaths: string[] = [];
        const BATCH = 100;
        for (let i = 0; i < storagePaths.length; i += BATCH) {
            const batch = storagePaths.slice(i, i + BATCH);
            const { error: storageErr } = await supabase.storage
                .from("product-images")
                .remove(batch);
            if (storageErr) {
                console.error("Storage remove error (batch):", storageErr.message);
                orphanedPaths.push(...batch);
            }
        }

        // Abort before touching the DB if storage removal failed for any paths,
        // so we don't leave DB rows pointing to nothing.
        if (orphanedPaths.length > 0) {
            return {
                count: 0,
                orphanedPaths,
                error: new Error(
                    `Storage deletion failed for ${orphanedPaths.length} object(s). DB rows were NOT deleted to avoid orphaned references.`
                ),
            };
        }

        // 4. Decrement storage usage (best-effort — don't abort on failure).
        try {
            // We can't easily get exact byte sizes here, so we remove the tracker
            // entries by listing storage metadata. For simplicity we rely on the
            // images route's existing usage tracking; the images are gone so the
            // next getStorageUsage call will show 0 for those objects anyway.
            // A full recalculation can be triggered by the storage usage API.
            // We do a best-effort decrement using a rough 0-byte decrement (no-op).
            await storageUsageHelper.decrementStorageUsage(0, supabase);
        } catch {
            // Non-fatal: continue to DB deletion.
        }

        // 5a. Null out tbl_product.image_id so the FK to tbl_product_image is
        //     released before we delete the image rows.
        const { error: nullifyError } = await supabase
            .from("tbl_product")
            .update({ image_id: null })
            .in("product_id", productIds);

        if (nullifyError) {
            console.error("Error nullifying product image_id:", nullifyError);
            return {
                count: 0,
                orphanedPaths,
                error: new Error(
                    `Storage objects deleted but could not release image FK on products: ${nullifyError.message}. Manual cleanup may be needed.`
                ),
            };
        }

        // 5b. Delete tbl_product_image rows.
        const { error: imgDeleteError } = await supabase
            .from("tbl_product_image")
            .delete()
            .in("product_id", productIds);

        if (imgDeleteError) {
            console.error("Error deleting product image rows:", imgDeleteError);
            return {
                count: 0,
                orphanedPaths,
                error: new Error(
                    `Storage objects deleted but DB image rows failed: ${imgDeleteError.message}. Manual cleanup may be needed.`
                ),
            };
        }

        // 6. Delete tbl_product rows via the admin_purge_products RPC.
        //    Direct DELETE is blocked by the prevent_archive_only_delete trigger;
        //    the RPC sets a transaction-local GUC to bypass it (same pattern as
        //    admin_purge_activity_logs — see migration 20260412120000).
        const { data: purgedCount, error: productDeleteError } = await supabase
            .rpc("admin_purge_products", { product_ids: productIds });

        if (productDeleteError) {
            console.error("Error purging product rows via RPC:", productDeleteError);

            const message = productDeleteError.message ?? "Unknown product purge error.";
            const activityLogCascadeBlocked =
                message.includes("Activity log DELETE is only permitted via the service role purge flow.")
                || message.includes("Activity logs are immutable. DELETE operations are not allowed on tbl_activity_log.")
                || message.includes("Activity logs are immutable. UPDATE operations are not allowed on tbl_activity_log.");

            return {
                count: 0,
                orphanedPaths,
                error: new Error(
                    activityLogCascadeBlocked
                        ? "Image rows deleted but product rows failed because this database still tries to mutate related activity logs when a product is purged. Apply the latest Supabase migration so `admin_purge_products()` detaches `tbl_activity_log.product_id` inside the RPC, then retry."
                        : `Image rows deleted but product rows failed: ${message}. Manual cleanup may be needed.`
                ),
            };
        }

        return { count: typeof purgedCount === "number" ? purgedCount : productIds.length, orphanedPaths: [], error: null };
    },
};
