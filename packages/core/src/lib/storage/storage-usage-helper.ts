import { createClient } from "../supabase/browser";

const STORAGE_KEY = "product-images";

export const storageUsageHelper = {
  async getStorageUsage(supabase = createClient()) {
    return supabase
      .from("tbl_storage_usage")
      .select("used_bytes, updated_at")
      .eq("key", STORAGE_KEY)
      .maybeSingle();
  },

  async incrementStorageUsage(bytes: number, supabase = createClient()) {
    if (bytes <= 0) return;
    const { data } = await supabase
      .from("tbl_storage_usage")
      .select("used_bytes")
      .eq("key", STORAGE_KEY)
      .maybeSingle();
    const current = Number((data as { used_bytes: number } | null)?.used_bytes ?? 0);
    await supabase
      .from("tbl_storage_usage")
      .upsert({
        key: STORAGE_KEY,
        used_bytes: current + bytes,
        updated_at: new Date().toISOString(),
      });
  },

  async decrementStorageUsage(bytes: number, supabase = createClient()) {
    if (bytes <= 0) return;
    const { data } = await supabase
      .from("tbl_storage_usage")
      .select("used_bytes")
      .eq("key", STORAGE_KEY)
      .maybeSingle();
    const current = Number((data as { used_bytes: number } | null)?.used_bytes ?? 0);
    await supabase
      .from("tbl_storage_usage")
      .upsert({
        key: STORAGE_KEY,
        used_bytes: Math.max(0, current - bytes),
        updated_at: new Date().toISOString(),
      });
  },
};
