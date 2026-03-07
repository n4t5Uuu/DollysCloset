/**
 * Outlines strictly mapped schema boundaries reflecting `tbl_product` records loaded from the inventory database.
 */
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

/**
 * Implements rigid typing rules against `tbl_category` references utilized heavily across filtering chains natively.
 */
export interface InventoryCategory {
    category_id: number;
    category_name: string;
    category_description: string;
    parent_category: number | null;
}

/**
 * Identifies standard payloads fetched across `tbl_product_image` managing gallery sorting explicitly via `display_order`.
 */
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
