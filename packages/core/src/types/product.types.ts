/**
 * Standard baseline structure defining generic product references spanning UI layers strictly.
 */
export interface Product {
    id: string;
    name: string;
    category: string;
    type: string;
    price: number;
    discountPercent?: number;
    discountedPrice?: number;
    brand: string;
    size: string;
    condition: string;
    description: string;
    stock: number;
    isNewArrival: boolean;
    discountExpiresAt?: string | null;
    images: string[];
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
    discountPercent: number;
    discountedPrice: number;
    discountExpiresAt: string | null;
    isOnSale: boolean;
    brand: string;
    size: string;
    condition: string;
    description: string;
    stock: number;
    isNewArrival: boolean;
    images: string[];
    createdAt: string;
};
