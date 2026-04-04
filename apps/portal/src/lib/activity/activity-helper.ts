import { createClient } from "@dollys-closet/core";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";
import { LogActivityProps } from "@dollys-closet/core";
import {
    sanitizeSingleLineText,
    schemaExactLimits,
} from "@dollys-closet/core";

export interface AvailableLogMonth {
    value: string;
    label: string;
    year: number;
    month: number;
    count: number;
}

function getActionSearchTerms(rawSearch: string) {
    const normalized = rawSearch.toLowerCase().replace(/\s+/g, "_");
    const terms = new Set<string>(
        normalized
            .split(/[_\s]+/)
            .map((part) => part.trim())
            .filter(Boolean)
    );

    if (normalized) {
        terms.add(normalized);
    }

    const aliasMap: Array<{ pattern: RegExp; mapped: string[] }> = [
        { pattern: /\bcreated?\b/, mapped: ["create"] },
        { pattern: /\bedited?\b/, mapped: ["edit"] },
        { pattern: /\bupdated?\b/, mapped: ["edit", "set_primary", "reorder"] },
        { pattern: /\bdeleted?\b/, mapped: ["delete"] },
        { pattern: /\buploaded?\b/, mapped: ["upload"] },
        { pattern: /\breordered?\b/, mapped: ["reorder"] },
        { pattern: /\blog(?:ged)?_?in\b|\bsigned?_?in\b/, mapped: ["login"] },
        { pattern: /\blog(?:ged)?_?out\b|\bsigned?_?out\b/, mapped: ["logout"] },
    ];

    for (const alias of aliasMap) {
        if (alias.pattern.test(normalized)) {
            alias.mapped.forEach((mappedTerm) => terms.add(mappedTerm));
        }
    }

    return Array.from(terms);
}

export const activityHelper = {
    /**
     * Retrieves all activity logs ordered by creation date descending.
     */
    async fetchLogs(supabase = createClient()) {
        const { data, error } = await supabase
            .from("tbl_activity_log")
            .select("log_id, created_at, action_type, product_id, business_details, description, editor, user_id")
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
    async fetchLogsPaginated(supabase = createClient(), {
        page = 1,
        pageSize = 10,
        search = "",
        month,
        year,
        actionTypes = [],
        userId,
    }: {
        page?: number;
        pageSize?: number;
        search?: string;
        month?: number;
        year?: number;
        actionTypes?: string[];
        userId?: string;
    } = {}) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
            .from("tbl_activity_log")
            .select("log_id, created_at, action_type, product_id, business_details, description, editor, user_id, tbl_users(user_key)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (search.trim()) {
            const rawSearch = search.trim();
            // Avoid PostgREST logic parser conflicts from reserved characters in user input.
            const safeSearch = rawSearch.replace(/[(),]/g, " ").trim();
            if (safeSearch) {
                const actionSearchTerms = getActionSearchTerms(safeSearch);

                const orClauses = [
                    `editor.ilike.%${safeSearch}%`,
                    `description.ilike.%${safeSearch}%`,
                ];

                actionSearchTerms.forEach((searchTerm) => {
                    orClauses.push(`action_type.ilike.%${searchTerm}%`);
                });

                if (/^\d+$/.test(safeSearch)) {
                    const numericSearch = Number(safeSearch);
                    orClauses.push(`product_id.eq.${numericSearch}`);
                    orClauses.push(`business_details.eq.${numericSearch}`);
                    orClauses.push(`log_id.eq.${numericSearch}`);
                }

                // UUID columns cannot use ilike; support exact user_id matching when the input is a UUID.
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeSearch)) {
                    orClauses.push(`user_id.eq.${safeSearch}`);
                }

                const { data: matchingUsers, error: matchingUsersError } = await supabase
                    .from("tbl_users")
                    .select("user_id")
                    .ilike("user_key", `%${safeSearch}%`)
                    .limit(25);

                if (matchingUsersError) {
                    console.error("Error fetching matching user keys:", matchingUsersError);
                } else {
                    (matchingUsers || []).forEach((matchingUser) => {
                        if (matchingUser.user_id) {
                            orClauses.push(`user_id.eq.${matchingUser.user_id}`);
                        }
                    });
                }

                query = query.or(orClauses.join(","));
            }
        }

        if (actionTypes.length > 0) {
            query = query.in("action_type", actionTypes);
        }

        if (userId) {
            query = query.eq("user_id", userId);
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
     * Returns only months that actually contain activity logs.
     * Employees can be scoped to their own history via userId.
     */
    async fetchAvailableLogMonths(supabase = createClient(), { userId }: { userId?: string } = {}) {
        let query = supabase
            .from("tbl_activity_log")
            .select("created_at")
            .order("created_at", { ascending: false });

        if (userId) {
            query = query.eq("user_id", userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching log months:", error);
            return { data: null, error };
        }

        const monthMap = new Map<string, AvailableLogMonth>();

        for (const row of data || []) {
            const createdAt = row.created_at;
            if (!createdAt) continue;

            const date = new Date(createdAt);
            if (Number.isNaN(date.getTime())) continue;

            const year = date.getFullYear();
            const month = date.getMonth();
            const value = `${year}-${String(month + 1).padStart(2, "0")}`;

            const existing = monthMap.get(value);
            if (existing) {
                existing.count += 1;
                continue;
            }

            monthMap.set(value, {
                value,
                label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                year,
                month,
                count: 1,
            });
        }

        return {
            data: Array.from(monthMap.values()).sort((firstMonth, secondMonth) =>
                secondMonth.value.localeCompare(firstMonth.value)
            ),
            error: null,
        };
    },

    /**
     * Clears all items in the activity log table.
     */
    async clearLogs(supabase = createClient()) {
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
    async fetchLogsByAction(actionType: string, since?: string, until?: string, supabase = createClient()) {
        let q = supabase
            .from("tbl_activity_log")
            .select("product_id, business_details, created_at")
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
    async logActivity({ actionType, productId = null, businessDetailsId = null, description = "", editor = null, user_id = null, supabase = null }: LogActivityProps) {
        const client = supabase || await createServerSupabase();
        const payload = {
            action_type: sanitizeSingleLineText(actionType, schemaExactLimits.activityActionType),
            product_id: productId,
            business_details: businessDetailsId,
            description: sanitizeSingleLineText(description, schemaExactLimits.activityDescription),
            editor: sanitizeSingleLineText(editor, 255),
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


