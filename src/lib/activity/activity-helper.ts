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
     * Retrieves a single page of activity logs with optional server-side filtering.
     * Uses .range() to bypass Supabase's 1000-row default cap.
     */
    async fetchLogsPaginated(supabase = browserSupabase, {
        page = 1,
        pageSize = 10,
        search = "",
        month,
        year,
        actionTypes = [],
    }: {
        page?: number;
        pageSize?: number;
        search?: string;
        month?: number;
        year?: number;
        actionTypes?: string[];
    } = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
            .from("tbl_activity_log")
            .select("log_id, created_at, action_type, product_id, description, editor, user_id, tbl_users(user_key)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (search.trim()) {
            const rawSearch = search.trim();
            // Avoid PostgREST logic parser conflicts from reserved characters in user input.
            const safeSearch = rawSearch.replace(/[(),]/g, " ").trim();

            const orClauses = [
                `editor.ilike.%${safeSearch}%`,
            ];

            if (/^\d+$/.test(safeSearch)) {
                const numericSearch = Number(safeSearch);
                orClauses.push(`product_id.eq.${numericSearch}`);
                orClauses.push(`log_id.eq.${numericSearch}`);
            }

            // UUID columns cannot use ilike; support exact user_id matching when the input is a UUID.
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeSearch)) {
                orClauses.push(`user_id.eq.${safeSearch}`);
            }

            query = query.or(orClauses.join(","));
        }

        if (actionTypes.length > 0) {
            query = query.in("action_type", actionTypes);
        }

        if (month !== undefined && year !== undefined) {
            const start = new Date(year, month, 1).toISOString();
            const end = new Date(year, month + 1, 1).toISOString();
            query = query.gte("created_at", start).lt("created_at", end);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error Fetching Paginated Logs:", error);
            return { data: null, count: 0, error };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flat = (data || []).map((log: any) => ({
            ...log,
            user_key: log.tbl_users?.user_key ?? null,
            tbl_users: undefined,
        }));

        return { data: flat, count: count ?? 0, error: null };
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
