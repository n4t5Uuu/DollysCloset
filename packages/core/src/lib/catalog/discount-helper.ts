import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductDiscount, DiscountType } from "../../types/product.types";
import { createClient } from "../supabase/browser";

export type DiscountRow = ProductDiscount;

export type DiscountProductRow = {
    id?: string;
    product_id: string;
    discount_id: string;
    created_at?: string;
};

export type DiscountPayload = {
    discount_name: string;
    discount_type: DiscountType;
    discount_value: number;
    ends_at: string | null;
    is_active: boolean;
};

function isDiscountStillActive(discount: ProductDiscount) {
    if (!discount.is_active) return false;
    if (!discount.ends_at) return true;

    const endTime = new Date(discount.ends_at).getTime();
    return Number.isFinite(endTime) && endTime > Date.now();
}

function calculateDiscountedPrice(basePrice: number, discount: ProductDiscount) {
    if (!Number.isFinite(basePrice)) return basePrice;

    if (discount.discount_type === "percent") {
        const percent = Math.max(0, Math.min(100, Number(discount.discount_value) || 0));
        return Math.max(0, basePrice - (basePrice * percent) / 100);
    }

    if (discount.discount_type === "fixed_price") {
        return Math.max(0, Number(discount.discount_value) || 0);
    }

    const flatValue = Math.max(0, Number(discount.discount_value) || 0);
    return Math.max(0, basePrice - flatValue);
}

async function fetchDiscountMap(productIds: Array<string | number>, supabase: SupabaseClient) {
    const uniqueProductIds = [...new Set(productIds.map((productId) => String(productId)))];

    if (uniqueProductIds.length === 0) {
        return new Map<string, ProductDiscount>();
    }

    const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("tbl_discount_products")
        .select("product_id, discount_id, created_at")
        .in("product_id", uniqueProductIds);

    if (assignmentsError) {
        console.error("Error Fetching Discount Assignments:", assignmentsError);
        return new Map<string, ProductDiscount>();
    }

    const discountIds = new Set<string>();
    const assignments = (assignmentsData || []) as DiscountProductRow[];
    for (const assignment of assignments) {
        discountIds.add(String(assignment.discount_id));
    }

    if (discountIds.size === 0) {
        return new Map<string, ProductDiscount>();
    }

    const { data: discountsData, error: discountsError } = await supabase
        .from("tbl_discounts")
        .select("id, discount_name, discount_type, discount_value, created_at, ends_at, is_active")
        .in("id", [...discountIds]);

    if (discountsError) {
        console.error("Error Fetching Discounts:", discountsError);
        return new Map<string, ProductDiscount>();
    }

    const discounts = (discountsData || []) as ProductDiscount[];
    const discountById = new Map(discounts.map((discount) => [String(discount.id), discount]));

    const discountByProductId = new Map<string, ProductDiscount>();
    for (const assignment of assignments) {
        const discount = discountById.get(String(assignment.discount_id));
        if (discount && isDiscountStillActive(discount)) {
            discountByProductId.set(String(assignment.product_id), discount);
        }
    }

    return discountByProductId;
}

export const discountHelper = {
    async getDiscounts(supabase = createClient(), { activeOnly = false }: { activeOnly?: boolean } = {}) {
        let query = supabase
            .from("tbl_discounts")
            .select("id, discount_name, discount_type, discount_value, created_at, ends_at, is_active")
            .order("created_at", { ascending: false, nullsFirst: false });

        if (activeOnly) {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error Fetching Discounts:", error);
            return { data: null, error };
        }

        return { data: (data || []) as ProductDiscount[], error: null };
    },

    async getDiscountById(discountId: string | number, supabase = createClient()) {
        const { data, error } = await supabase
            .from("tbl_discounts")
            .select("id, discount_name, discount_type, discount_value, created_at, ends_at, is_active")
            .eq("id", discountId)
            .maybeSingle();

        if (error) {
            console.error("Error Fetching Discount by ID:", error);
            return { data: null, error };
        }

        return { data: data as ProductDiscount | null, error: null };
    },

    async createDiscount(payload: DiscountPayload, supabase = createClient()) {
        const { data, error } = await supabase
            .from("tbl_discounts")
            .insert([payload])
            .select("id, discount_name, discount_type, discount_value, created_at, ends_at, is_active")
            .maybeSingle();

        if (error) {
            console.error("Error Creating Discount:", error);
            return { data: null, error };
        }

        return { data: data as ProductDiscount | null, error: null };
    },

    async assignDiscountToProducts(discountId: string | number, productIds: Array<string | number>, supabase = createClient()) {
        const normalizedProductIds = [...new Set(productIds.map((productId) => String(productId)))].filter(Boolean);

        if (normalizedProductIds.length === 0) {
            return { data: [], error: null };
        }

        const { error: deleteError } = await supabase
            .from("tbl_discount_products")
            .delete()
            .in("product_id", normalizedProductIds);

        if (deleteError) {
            console.error("Error Clearing Existing Discount Assignments:", deleteError);
            return { data: null, error: deleteError };
        }

        const rows = normalizedProductIds.map((productId) => ({
            product_id: productId,
            discount_id: String(discountId),
        }));

        const { data, error } = await supabase.from("tbl_discount_products").insert(rows).select("product_id, discount_id, created_at");
        if (error) {
            console.error("Error Assigning Discount To Products:", error);
            return { data: null, error };
        }

        return { data: (data || []) as DiscountProductRow[], error: null };
    },

    async clearDiscountFromProducts(productIds: Array<string | number>, supabase = createClient()) {
        const normalizedProductIds = [...new Set(productIds.map((productId) => String(productId)))].filter(Boolean);

        if (normalizedProductIds.length === 0) {
            return { success: true, error: null };
        }

        const { error } = await supabase
            .from("tbl_discount_products")
            .delete()
            .in("product_id", normalizedProductIds);

        if (error) {
            console.error("Error Clearing Discount From Products:", error);
            return { success: false, error };
        }

        return { success: true, error: null };
    },

    async clearAssignmentsByDiscount(discountId: string | number, supabase = createClient()) {
        const { error } = await supabase
            .from("tbl_discount_products")
            .delete()
            .eq("discount_id", String(discountId));

        if (error) {
            console.error("Error Clearing Discount Assignments By Discount:", error);
            return { success: false, error };
        }

        return { success: true, error: null };
    },

    async deleteDiscount(discountId: string | number, supabase = createClient()) {
        const { error } = await supabase
            .from("tbl_discounts")
            .delete()
            .eq("id", String(discountId));

        if (error) {
            console.error("Error Deleting Discount:", error);
            return { success: false, error };
        }

        return { success: true, error: null };
    },

    async getProductDiscountMap(productIds: Array<string | number>, supabase = createClient()) {
        return fetchDiscountMap(productIds, supabase);
    },

    calculateDiscountedPrice,
    isDiscountStillActive,
};