import { LucideIcon } from "lucide-react";

/**
 * Static baseline mappings covering frequently asked questions internally routing responses over dynamic views globally.
 */
export type FAQCategory = "Ordering" | "Shipping" | "Returns" | "Products" | "General";

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: FAQCategory;
}

export interface FAQRow extends FAQItem {
    click_count: number;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export type FAQCreateInput = {
    question: string;
    answer: string;
    category: FAQCategory;
    display_order?: number;
};

export type FAQUpdateInput = Partial<FAQCreateInput> & {
    is_active?: boolean;
};

/**
 * Generic layout tracking attributes binding dashboard navigation arrays.
 */
export interface SidebarInterface {
    tabName: string;
    icon: LucideIcon;
}
