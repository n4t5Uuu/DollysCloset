/**
 * Standard baseline structure defining generic product references spanning UI layers strictly.
 */
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





