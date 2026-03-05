import { LucideIcon } from "lucide-react";

/**
 * Static baseline mappings covering frequently asked questions internally routing responses over dynamic views globally.
 */
export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: "Ordering" | "Shipping" | "Returns" | "Products" | "General";
}

/**
 * Generic layout tracking attributes binding dashboard navigation arrays.
 */
export interface SidebarInterface {
    tabName: string;
    icon: LucideIcon;
}
