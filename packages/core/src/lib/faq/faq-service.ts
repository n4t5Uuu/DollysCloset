import { SupabaseClient } from "@supabase/supabase-js";
import { FAQRow, FAQCreateInput, FAQUpdateInput } from "../../types/ui.types";

const FAQ_TABLE = "tbl_faqs";

/**
 * Fetches all active FAQ items sorted by click count descending.
 * Most-clicked questions appear at the top.
 */
export async function getFAQs(supabase: SupabaseClient): Promise<FAQRow[]> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .select("*")
    .eq("is_active", true)
    .order("click_count", { ascending: false })
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[FAQ] Failed to fetch FAQs:", error.message);
    return [];
  }

  return (data as FAQRow[]) ?? [];
}

/**
 * Fetches all FAQ items (including inactive) for admin management.
 */
export async function getAllFAQs(supabase: SupabaseClient): Promise<FAQRow[]> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .select("*")
    .order("click_count", { ascending: false })
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[FAQ] Failed to fetch all FAQs:", error.message);
    return [];
  }

  return (data as FAQRow[]) ?? [];
}

/**
 * Creates a new FAQ item.
 */
export async function createFAQ(
  supabase: SupabaseClient,
  input: FAQCreateInput
): Promise<FAQRow | null> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .insert([input])
    .select()
    .single();

  if (error) {
    console.error("[FAQ] Failed to create FAQ:", error.message);
    return null;
  }

  return data as FAQRow;
}

/**
 * Updates an existing FAQ item by ID.
 */
export async function updateFAQ(
  supabase: SupabaseClient,
  id: string,
  input: FAQUpdateInput
): Promise<FAQRow | null> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[FAQ] Failed to update FAQ:", error.message);
    return null;
  }

  return data as FAQRow;
}

/**
 * Deletes a FAQ item by ID.
 */
export async function deleteFAQ(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from(FAQ_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[FAQ] Failed to delete FAQ:", error.message);
    return false;
  }

  return true;
}

/**
 * Increments the click count for a FAQ item via Supabase RPC.
 * Called when a user opens/expands a FAQ accordion item on the store.
 */
export async function incrementFAQClick(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_faq_click", { faq_id: id });

  if (error) {
    console.error("[FAQ] Failed to increment click count:", error.message);
  }
}
