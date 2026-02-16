export interface Product {
    id: string;
    name: string;
    category: string;
    type: string;
    price: number;
    brand: string;
    size: string;
    condition: string;
    description: string;
    stock: number;
    isNewArrival: boolean;
    images: string[];
}

export type CatalogStatus = "featured" | "standard" | "unlisted";

export interface LogActivityProps {
    actionType: string;
    productId?: number | null;
    description?: string;
}

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
