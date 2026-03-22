import { browserSupabase } from "../supabase/browser";
import { createServerSupabase } from "../supabase/server";
import { LogActivityProps } from "@/types/logs.types";

export const activityHelper = {
    /**
     * Retrieves all activity logs ordered by creation date descending.
     */
    async fetchLogs(supabase = browserSupabase) {
        const { data, error } = await supabase
            .from("tbl_activity_log")
            .select("log_id, created_at, action_type, product_id, description, editor, user_id")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error Fetching Logs: ", error);
            return { data: null, error };
        }

        return { data: data || [], error: null };
    },

    /**
     * Clears all items in the activity log table.
     */
    async clearLogs(supabase = browserSupabase) {
        const { error } = await supabase
            .from("tbl_activity_log")
            .delete()
            .gte("log_id", 0);

        if (error) {
            console.error("Error clearing logs: ", error);
            return { success: false, error };
        }

        return { success: true, error: null };
    },

    /**
     * Fetches activity logs matching a specific action type with optional date filtering.
     */
    async fetchLogsByAction(actionType: string, since?: string, until?: string, supabase = browserSupabase) {
        let q = supabase
            .from("tbl_activity_log")
            .select("product_id, created_at")
            .eq("action_type", actionType);

        if (since) q = q.gte("created_at", since);
        if (until) q = q.lt("created_at", until);

        const { data, error } = await q;

        if (error) {
            console.error(`Error Fetching ${actionType} Logs: `, error);
            return { data: null, error };
        }

        return { data: data || [], error: null };
    },

    /**
     * Logs user activity such as modifying a product or performing an administrative action.
     */
    async logActivity({ actionType, productId = null, description = "", editor = null, user_id = null, supabase = null }: LogActivityProps) {
        const client = supabase || await createServerSupabase();
        const payload = {
            action_type: actionType,
            product_id: productId,
            description: description,
            editor: editor,
            user_id: user_id,
            created_at: new Date().toISOString(),
        };

        const { error } = await client.from("tbl_activity_log").insert(payload);

        if (error) {
            console.error("Error Logging Activity: ", error);
            return false;
        }

        return true;
    },
};
