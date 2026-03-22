/**
 * Outlines static constraints regulating acceptable product visibility strings across broader catalogs centrally.
 */
export type CatalogStatus = "featured" | "standard" | "unlisted";

export type FieldChange = {
    field: string;
    oldValue: unknown;
    newValue: unknown;
};

/**
 * Details generic footprints written when tracing arbitrary `admin` / `employee` dashboard actions natively.
 */
export type ActivityLog = {
    log_id: number;
    created_at: string;
    action_type: string;
    product_id: number | string | null;
    description: string;
    editor: string | null;
    user_id: string | number | null;
};

export type ActivityLogExtended = ActivityLog & {
    id?: string;
    timestamp?: string;
    action?: "added" | "edited" | "deleted" | "status_changed" | "viewed" | "opened_edit";
    productName?: string;
    statusFrom?: CatalogStatus;
    statusTo?: CatalogStatus;
    fieldChanges?: FieldChange[];
    actorId?: string;
    actorEmail?: string;
    actorRole?: "admin" | "employee" | "unknown";
};

/**
 * Formalizes payload parameters routinely consumed across utility interfaces dynamically injecting activity traces directly to `tbl_activity_log`.
 */
export interface LogActivityProps {
    actionType: string;
    productId?: number | null;
    description?: string;
    editor?: string | null;
    user_id?: string | number | null;
    supabase?: any;
}