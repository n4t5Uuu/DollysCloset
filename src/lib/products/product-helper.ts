import { browserSupabase } from "../supabase/browser";

export const productHelper = {
    /**
     * Retrieves all product records from the database's `tbl_product` table.
     */
    async getProducts(supabase = browserSupabase) {
        const { data, error } = await supabase.from("tbl_product").select("*");
        if (error) {
            console.error("Error Fetching Products: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Retrieves all product categories from `tbl_category`.
     */
    async getCategories(supabase = browserSupabase) {
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
    async createProduct(payload: any, supabase = browserSupabase) {
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
    async updateProduct(productId: number | string, payload: any, supabase = browserSupabase) {
        const { data, error } = await supabase.from("tbl_product").update(payload).eq("product_id", productId).select();
        if (error) {
            console.error("Error Updating Product: ", error);
            return { data: null, error };
        }
        return { data: data?.[0] || null, error: null };
    },

    /**
     * Deletes a single product by row identification.
     */
    async deleteProduct(productId: number | string, supabase = browserSupabase) {
        const { error } = await supabase.from("tbl_product").delete().eq("product_id", productId);
        if (error) {
            console.error("Error Deleting Product: ", error);
            return { success: false, error };
        }
        return { success: true, error: null };
    },

    /**
     * Retrieves a single product by ID.
     */
    async getProductById(productId: number | string, supabase = browserSupabase) {
        const { data, error } = await supabase.from("tbl_product").select("*").eq("product_id", productId).maybeSingle();
        if (error) {
            console.error("Error Fetching Product by ID: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },

    /**
     * Retrieves images assigned back forward to any singular product record.
     */
    async getProductImages(productId: number | string, supabase = browserSupabase) {
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
    async getImageById(imageId: number | string, supabase = browserSupabase) {
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
    async getRemainingImagesExcluding(productId: number | string, excludeImageId: number | string, supabase = browserSupabase) {
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
    async getProductsCatalog(supabase = browserSupabase) {
        const { data, error } = await supabase.from("tbl_product").select("*").eq("show_in_catalog", true).order("created_at", { ascending: false, nullsFirst: false });
        if (error) {
            console.error("Error Fetching Catalog Products: ", error);
            return { data: null, error };
        }
        return { data: data || [], error: null };
    },

    /**
     * Retrieves all product images for full catalog processing ordered by display order.
     */
    async getProductImagesAll(supabase = browserSupabase) {
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
    async getProductImagesBulk(productIds: number[], supabase = browserSupabase) {
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
    async updateProductsBulk(productIds: number[], payload: any, supabase = browserSupabase) {
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
    async deleteProductImagesBulk(productIds: number[], supabase = browserSupabase) {
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
    async deleteProductsBulk(productIds: number[], supabase = browserSupabase) {
        const { error } = await supabase.from("tbl_product").delete().in("product_id", productIds);
        if (error) {
            console.error("Error Deleting Bulk Products: ", error);
            return { success: false, error };
        }
        return { success: true, error: null };
    },

    /**
     * Performs a batched update layout for multiple images concurrently.
     */
    async batchUpdateProductImages(updates: { image_id: number | string; payload: any }[], supabase: any) {
        const promises = updates.map((u) => supabase.from("tbl_product_image").update(u.payload).eq("image_id", u.image_id));
        const results = await Promise.all(promises);
        const error = results.find((r) => r.error)?.error;
        return { success: !error, error: error || null };
    },

    /**
     * Verifies that an image belongs to a specific product.
     */
    async verifyProductImage(imageId: number | string, productId: number | string, supabase = browserSupabase) {
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
    async deleteProductImageReferences(productId: number | string, supabase = browserSupabase) {
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
    async createProductImage(payload: any, supabase = browserSupabase) {
        const { data, error } = await supabase.from("tbl_product_image").insert([payload]).select().maybeSingle();
        if (error) {
            console.error("Error Creating Product Image: ", error);
            return { data: null, error };
        }
        return { data, error: null };
    },
};
