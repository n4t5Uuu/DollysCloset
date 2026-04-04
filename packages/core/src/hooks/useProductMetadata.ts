import type { Product } from "../types/product.types";
import { useMemo } from "react";

function hasDisplayValue(value: string | null | undefined) {
    if (!value) return false;
    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue !== "" && normalizedValue !== "n/a" && normalizedValue !== "na";
}

function formatChipLabel(value: string) {
    return value
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export interface BadgeInfo {
    label: string;
    className: string;
    mobileHidden?: boolean;
}

/**
 * Custom hook to calculate and centralize product-related metadata
 * like badges, eyebrow labels, and stock status.
 */
export function useProductMetadata(product: Product) {
    return useMemo(() => {
        const isSoldOut = product.stock <= 0;
        const hasLowStock = product.stock > 0 && product.stock <= 3;

        // Eyebrow label logic
        const eyebrow = hasDisplayValue(product.brand)
            ? product.brand
            : hasDisplayValue(product.type)
                ? product.type
                : "Curated Piece";

        // Category label logic
        const categoryLabel = hasDisplayValue(product.type)
            ? product.type
            : product.category.split(" > ").filter(Boolean).at(-1) || "Collection";

        // Badges calculation
        const badges: BadgeInfo[] = [];

        if (isSoldOut) {
            badges.push({
                label: "Sold Out",
                className: "bg-[#121212] text-white",
            });
        } else {
            if (product.isNewArrival) {
                badges.push({
                    label: "New",
                    className: "bg-[#fff4f7] text-[#b96f80] ring-1 ring-[#E7A3B0]/40",
                    mobileHidden: hasLowStock,
                });
            }

            if (hasLowStock) {
                badges.push({
                    label: `${product.stock} Left`,
                    className: "bg-[#fff8ec] text-[#9a6a17] ring-1 ring-[#f2c98a]/60",
                });
            }
        }

        // Secondary chip calculations (Size, Condition)
        const metadataChips = [
            hasDisplayValue(product.size) ? formatChipLabel(product.size) : null,
            hasDisplayValue(product.condition) ? formatChipLabel(product.condition) : null,
        ].filter((value): value is string => Boolean(value));

        return {
            isSoldOut,
            hasLowStock,
            eyebrow,
            categoryLabel,
            badges,
            metadataChips,
            formattedPrice: `\u20B1${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
    }, [product]);
}
