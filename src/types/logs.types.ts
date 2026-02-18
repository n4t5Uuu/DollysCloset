export type CatalogStatus = "featured" | "standard" | "unlisted";

export type FieldChange = {
    field: string;
    oldValue: any;
    newValue: any;
};

export type ActivityLog = {
    id: string;
    timestamp: string;
    action: "added" | "edited" | "deleted" | "status_changed" | "viewed" | "opened_edit";
    productId?: string;
    productName?: string;
    statusFrom?: CatalogStatus;
    statusTo?: CatalogStatus;
    fieldChanges?: FieldChange[];
    actorId?: string;
    actorEmail?: string;
    actorRole?: "admin" | "employee" | "unknown";
};

export interface LogActivityProps {
    actionType: string;
    productId?: number | null;
    description?: string;
    editor?: string | null;
    user_id?: string | number | null;
    supabase?: any;
}