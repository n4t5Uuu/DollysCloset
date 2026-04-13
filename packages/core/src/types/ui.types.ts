import { LucideIcon } from "lucide-react";

/**
 * Static baseline mappings covering frequently asked questions internally routing responses over dynamic views globally.
 */
export type FAQCategory = "Ordering" | "Shipping" | "Returns" | "Products" | "General";

export interface FAQItem {
    id: number;
    question: string;
    answer: string;
    category: FAQCategory;
    click_count: number;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

/**
 * Generic layout tracking attributes binding dashboard navigation arrays.
 */
export interface SidebarInterface {
    tabName: string;
    icon: LucideIcon;
}
