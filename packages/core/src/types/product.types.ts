/**
 * Standard baseline structure defining generic product references spanning UI layers strictly.
 */
export type DiscountType = "flat" | "percent" | "fixed_price";

export interface Season {
    id: string;
    name: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    isActive?: boolean;
}

export interface ProductDiscount {
    id: string;
    discount_name: string;
    discount_type: DiscountType;
    discount_value: number;
    created_at: string;
    ends_at: string | null;
    is_active: boolean;
}

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
    discount?: ProductDiscount | null;
    discountedPrice?: number | null;
    isOnSale?: boolean;
    seasonId?: string | null;
    seasonName?: string | null;
}

export type CatalogCategory = {
    category_id: number;
    category_name: string;
    parent_category: number | null;
};

export type CatalogApiProduct = {
    id: string;
    name: string;
    categoryId: number;
    categoryName: string;
    categoryPath: string;
    price: number;
    brand: string;
    size: string;
    condition: string;
    description: string;
    stock: number;
    isNewArrival: boolean;
    images: string[];
    createdAt: string;
    discount?: ProductDiscount | null;
    discountedPrice?: number | null;
    isOnSale?: boolean;
    seasonId?: string | null;
    seasonName?: string | null;
};

export type CatalogPayload = {
    categories: CatalogCategory[];
    products: CatalogApiProduct[];
    featuredProducts: CatalogApiProduct[];
    activeSeason: Season | null;
};
