import { createAdminClient } from "@dollys-closet/core";
import {
  type DashboardLayoutPreference,
  type DashboardSurfaceKey,
  normalizeDashboardLayoutPreference,
} from "@/lib/dashboard-layout/config";

export const dashboardPreferenceStore = {
  async get(userId: string, surface: DashboardSurfaceKey) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tbl_dashboard_preferences")
      .select("layout_json")
      .eq("user_id", userId)
      .eq("surface_key", surface)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return {
      data: data?.layout_json
        ? normalizeDashboardLayoutPreference(surface, data.layout_json)
        : null,
      error: null,
    };
  },

  async save(userId: string, surface: DashboardSurfaceKey, layout: DashboardLayoutPreference) {
    const supabase = createAdminClient();
    const normalizedLayout = normalizeDashboardLayoutPreference(surface, layout);

    const { error } = await supabase
      .from("tbl_dashboard_preferences")
      .upsert(
        {
          user_id: userId,
          surface_key: surface,
          layout_json: normalizedLayout,
        },
        {
          onConflict: "user_id,surface_key",
        }
      );

    if (error) {
      return { data: null, error };
    }

    return {
      data: normalizedLayout,
      error: null,
    };
  },
};
