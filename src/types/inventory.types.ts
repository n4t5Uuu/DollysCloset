export interface InventoryProduct {
    product_id: string;
    product_name: string;
    category_id: number;
    product_price: number;
    product_brand: string;
    product_description: string;
    product_stock: number;
    product_condition: string;
    size_label: string;
    show_in_catalog: boolean;
    image_id: string | null;
    created_at: string;
}

export interface InventoryCategory {
    category_id: number;
    category_name: string;
    category_description: string;
    parent_category: number | null;
}

export interface InventoryProductImage {
    image_id: string;
    product_id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
    created_at: string;
}

export interface InventoryAuditLog {
    id: string;
    timestamp: string;
    action: "added" | "edited" | "deleted" | "status_changed" | "viewed" | "opened_edit";
}
