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
        const discountPercent = Math.min(100, Math.max(0, Number(product.discountPercent || 0)));
        const countdownInfo = product.discountExpiresAt ? formatCountdownTime(product.discountExpiresAt) : null;
        const isDiscountExpired = countdownInfo?.isExpired ?? false;
        const isOnSale = discountPercent > 0 && !isDiscountExpired;
        const discountedPrice = Number(
            (product.discountedPrice ?? product.price * (1 - discountPercent / 100)).toFixed(2)
        );

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
            if (isOnSale) {
                badges.push({
                    label: `-${discountPercent}%`,
                    className: "bg-linear-to-r from-[#ff4d6d] via-[#ff7a59] to-[#ffb347] text-white ring-1 ring-[#ffb347]/60 animate-pulse",
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
            isOnSale,
            discountPercent,
            discountedPrice,
            eyebrow,
            categoryLabel,
            badges,
            metadataChips,
            formattedPrice: `\u20B1${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formattedDiscountedPrice: `\u20B1${discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            saleCountdown: countdownInfo?.countdown ?? null,
            saleEndDate: countdownInfo?.endDate ?? null,
        };
    }, [product]);
}

function formatCountdownTime(expiresAt: string): { countdown: string; endDate: string; isExpired: boolean } {
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    const isExpired = expiryDate < now;
    const endDate = expiryDate.toLocaleString();
    
    if (isExpired) {
        return { countdown: "Ended", endDate, isExpired: true };
    }
    
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let countdown = "";
    if (diffDays > 0) {
        countdown = `${diffDays} day${diffDays !== 1 ? "s" : ""} left`;
    } else if (diffHours > 0) {
        countdown = `${diffHours} hour${diffHours !== 1 ? "s" : ""} left`;
    } else {
        countdown = "Last few hours";
    }
    
    return { countdown, endDate, isExpired: false };
}
