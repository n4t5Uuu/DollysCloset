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
        const hasDiscount = Boolean(product.isOnSale && product.discount && product.discountedPrice !== null && product.discountedPrice !== undefined);

        const formatCurrency = (value: number) => `\u20B1${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const discountLabel = product.discount
            ? product.discount.discount_type === "percent"
                ? `-${Number(product.discount.discount_value).toFixed(Number.isInteger(product.discount.discount_value) ? 0 : 2)}%`
                : product.discount.discount_type === "fixed_price"
                    ? `Final price ${formatCurrency(Number(product.discount.discount_value))}`
                : `-\u20B1${Number(product.discount.discount_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : null;

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
            if (hasDisplayValue(product.seasonName)) {
                badges.push({
                    label: product.seasonName!.trim(),
                    className: "bg-[#eef7ff] text-[#2b6b93] ring-1 ring-[#b8daf0]/70 shadow-sm",
                });
            }

            if (hasDiscount && discountLabel) {
                badges.push({
                    label: product.discount?.discount_name ? product.discount.discount_name : discountLabel,
                    className: "bg-[#fff2e8] text-[#b86a36] ring-1 ring-[#f1c8a7]/70 shadow-sm",
                });
            }

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
            hasDiscount,
            eyebrow,
            categoryLabel,
            badges,
            metadataChips,
            formattedPrice: formatCurrency(product.price),
            formattedOriginalPrice: formatCurrency(product.price),
            formattedSalePrice: product.discountedPrice !== null && product.discountedPrice !== undefined
                ? formatCurrency(product.discountedPrice)
                : null,
            discountLabel,
        };
    }, [product]);
}
