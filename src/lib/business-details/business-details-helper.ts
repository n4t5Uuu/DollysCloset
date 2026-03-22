export const businessDetailsHelper = {
    /**
     * Resolves the table name used for business details ("tbl_business_details" or "business_details").
     */
    async resolveTableName(supabase: any) {
        const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;
        for (const tableName of BUSINESS_DETAILS_TABLES) {
            const result = await supabase.from(tableName).select("slug").limit(1);
            if (!result.error) return { tableName, error: null };
            if (!result.error.message?.toLowerCase().includes("does not exist")) {
                return { tableName, error: result.error };
            }
        }
        return { tableName: BUSINESS_DETAILS_TABLES[0], error: new Error("Could not find table") };
    },

    /**
     * Retrieves the latest record covering a specific slug sorted by updated_at.
     */
    async findLatestBySlug(tableName: string, slug: string, supabase: any) {
        const result = await supabase
            .from(tableName)
            .select("*")
            .eq("slug", slug)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

        return { data: result.data || null, error: result.error || null };
    },

    /**
     * Retrieves all records covering a specific slug sorted by updated_at.
     */
    async findAllBySlug(tableName: string, slug: string, supabase: any) {
        const result = await supabase
            .from(tableName)
            .select("*")
            .eq("slug", slug)
            .order("updated_at", { ascending: false, nullsFirst: false });

        return { data: result.data || [], error: result.error || null };
    },

    /**
     * Generic updates for business details with strict criteria matches.
     */
    async updateDetailGeneric(tableName: string, criteria: Record<string, any>, payload: any, supabase: any) {
        let q = supabase.from(tableName).update(payload);
        for (const [key, value] of Object.entries(criteria)) {
            q = q.eq(key, value);
        }
        const { data, error } = await q.select();
        return { data: data || [], error: error || null };
    },

    /**
     * Generic inserts for business details nodes.
     */
    async insertDetailGeneric(tableName: string, payload: any, supabase: any) {
        const { data, error } = await supabase.from(tableName).insert(payload).select();
        return { data: data || [], error: error || null };
    },

    /**
     * Updates static page node configurations safely.
     */
    async updateDetail(tableName: string, slug: string, title: string, body: string, updatedAt: string, supabase: any) {
        const result = await supabase
            .from(tableName)
            .update({ title, body, updated_at: updatedAt })
            .eq("slug", slug)
            .eq("title", title)
            .select();

        return { data: result.data || [], error: result.error || null };
    },

    /**
     * Inserts static page node configurations safely.
     */
    async insertDetail(tableName: string, slug: string, title: string, body: string, updatedAt: string, supabase: any) {
        const result = await supabase
            .from(tableName)
            .insert({ slug, title, body, updated_at: updatedAt })
            .select();

        return { data: result.data || [], error: result.error || null };
    }
};
