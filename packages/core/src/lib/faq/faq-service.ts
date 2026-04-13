import type { SupabaseClient } from "@supabase/supabase-js";
import type { FAQItem } from "../../types/ui.types";

/** Alias used by UI components */
export type FAQRow = FAQItem;

/**
 * Fetches all active FAQs ordered by click_count descending (most clicked first) for the public store.
 */
export async function getActiveFaqs(supabase: SupabaseClient): Promise<{ data: FAQItem[]; error: string | null }> {
    const { data, error } = await supabase
        .from("tbl_faqs")
        .select("*")
        .eq("is_active", true)
        .order("click_count", { ascending: false })
        .order("display_order", { ascending: true });

    if (error) {
        console.error("Error fetching active FAQs:", error.message);
        return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
}

/**
 * Fetches all FAQs ordered by display_order (for admin portal).
 */
export async function getAllFaqs(supabase: SupabaseClient): Promise<{ data: FAQItem[]; error: string | null }> {
    const { data, error } = await supabase
        .from("tbl_faqs")
        .select("*")
        .order("display_order", { ascending: true });

    if (error) {
        console.error("Error fetching FAQs:", error.message);
        return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
}

/**
 * Fetches a single FAQ by ID.
 */
export async function getFaqById(supabase: SupabaseClient, id: number): Promise<{ data: FAQItem | null; error: string | null }> {
    const { data, error } = await supabase
        .from("tbl_faqs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching FAQ:", error.message);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

/**
 * Creates a new FAQ entry.
 */
export async function createFaq(
    supabase: SupabaseClient,
    payload: { question: string; answer: string; category: string; display_order?: number; is_active?: boolean }
): Promise<{ data: FAQItem | null; error: string | null }> {
    const { data, error } = await supabase
        .from("tbl_faqs")
        .insert({
            question: payload.question,
            answer: payload.answer,
            category: payload.category,
            display_order: payload.display_order ?? 0,
            is_active: payload.is_active ?? true,
            click_count: 0,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating FAQ:", error.message);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

/**
 * Updates an existing FAQ entry.
 */
export async function updateFaq(
    supabase: SupabaseClient,
    id: number,
    payload: Partial<{ question: string; answer: string; category: string; display_order: number; is_active: boolean }>
): Promise<{ data: FAQItem | null; error: string | null }> {
    const { data, error } = await supabase
        .from("tbl_faqs")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating FAQ:", error.message);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

/**
 * Deletes a FAQ entry by ID.
 */
export async function deleteFaq(
    supabase: SupabaseClient,
    id: number
): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase
        .from("tbl_faqs")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting FAQ:", error.message);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

/**
 * Increments the click_count for a FAQ entry.
 * Called from the public store when a user opens a FAQ accordion item.
 */
export async function incrementFaqClick(
    supabase: SupabaseClient,
    id: string | number
): Promise<void> {
    const numericId = typeof id === "string" ? Number(id) : id;
    if (!Number.isFinite(numericId)) return;

    const { error } = await supabase.rpc("increment_faq_click", { faq_id: numericId });

    if (error) {
        // Fallback: manual increment if RPC doesn't exist
        const { data } = await supabase
            .from("tbl_faqs")
            .select("click_count")
            .eq("id", numericId)
            .single();

        if (data) {
            await supabase
                .from("tbl_faqs")
                .update({ click_count: (data.click_count ?? 0) + 1 })
                .eq("id", numericId);
        }
    }
}

/** Alias matching the casing used by existing UI components */
export const incrementFAQClick = incrementFaqClick;
