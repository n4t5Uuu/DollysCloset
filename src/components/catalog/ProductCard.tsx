import { CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import Image from "next/image"
import { Product } from "@/types/product.types"
import { resolveProductPlaceholder } from "@/lib/product-placeholder"

interface ProductCardProps {
    product?: Product;
    onClick?: () => void;
}

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

export default function ProductCard({ product, onClick }: ProductCardProps) {
    if (!product) {
        return (
            <div className="w-full max-w-[280px]">
                <div className="bg-[#f5f5f5] aspect-3/4 w-full flex items-center justify-center flex-col relative overflow-hidden rounded-[1.75rem]">
                    <div className="font-oswald font-bold text-xl tracking-widest text-black/90">
                        NO PRODUCT
                    </div>
                </div>
            </div>
        );
    }

    const isSoldOut = product.stock <= 0;
    const hasLowStock = product.stock > 0 && product.stock <= 3;
    const eyebrow = hasDisplayValue(product.brand) ? product.brand : hasDisplayValue(product.type) ? product.type : "Curated Piece";
    const categoryLabel = hasDisplayValue(product.type)
        ? product.type
        : product.category.split(" > ").filter(Boolean).at(-1) || "Collection";

    const metadataChips = [
        hasDisplayValue(product.size) ? formatChipLabel(product.size) : null,
        hasDisplayValue(product.condition) ? formatChipLabel(product.condition) : null,
    ].filter((value): value is string => Boolean(value));

    const badges: Array<{ label: string; className: string }> = [];

    if (isSoldOut) {
        badges.push({
            label: "Sold Out",
            className: "bg-[#121212] text-white",
        });
    } else {
        if (product.isNewArrival) {
            badges.push({
                label: "New Arrival",
                className: "bg-[#fff4f7] text-[#b96f80] ring-1 ring-[#E7A3B0]/40",
            });
        }

        if (hasLowStock) {
            badges.push({
                label: `${product.stock} Left`,
                className: "bg-[#fff8ec] text-[#9a6a17] ring-1 ring-[#f2c98a]/60",
            });
        }
    }

    return (
        <button
            type="button"
            aria-label={`View details for ${product.name}`}
            onClick={onClick}
            className="group block h-full w-full text-left focus-visible:outline-none focus-visible:[&>article]:ring-2 focus-visible:[&>article]:ring-[#E7A3B0] focus-visible:[&>article]:ring-offset-4"
        >
            <article
                className={cn(
                    "flex h-full flex-col rounded-[2rem] border border-[#E7A3B0]/15 bg-white p-2 shadow-[0_14px_35px_rgba(18,18,18,0.05)] transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:border-[#E7A3B0]/35 group-hover:shadow-[0_24px_50px_rgba(18,18,18,0.1)]"
                )}
            >
                <div className="relative aspect-3/4 overflow-hidden rounded-[1.5rem] bg-[#f7eef1]">
                    <Image
                        src={product.images[0] || resolveProductPlaceholder(product.category)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className={cn(
                            "object-cover transition-transform duration-700 ease-out group-hover:scale-105",
                            isSoldOut ? "grayscale-[0.3]" : ""
                        )}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/25 via-black/0 to-transparent opacity-70" />

                    <div className="absolute inset-x-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                        {badges.map((badge) => (
                            <span
                                key={badge.label}
                                className={cn(
                                    "rounded-full px-2.5 py-1 font-oswald text-[10px] uppercase tracking-[0.24em]",
                                    badge.className
                                )}
                            >
                                {badge.label}
                            </span>
                        ))}
                    </div>

                </div>

                <div className="flex flex-1 flex-col gap-3 px-2 pb-2 pt-4">
                    <div className="min-w-0">
                        <p className="font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f5058]">
                            {categoryLabel}
                        </p>
                        <p className="font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88]">
                            {eyebrow}
                        </p>
                        <CardTitle className="mt-2 font-playfair-display text-lg leading-snug text-[#121212] line-clamp-3">
                            {product.name}
                        </CardTitle>
                    </div>

                    {metadataChips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {metadataChips.map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full bg-[#f8f3f4] px-2.5 py-1 font-montserrat text-[11px] font-medium uppercase tracking-[0.12em] text-[#6a5a5f]"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto border-t border-[#E7A3B0]/12 pt-3">
                        <div>
                            <p className="font-oswald text-[10px] uppercase tracking-[0.28em] text-[#c0929d]">
                                {isSoldOut ? "Last Price" : "Price"}
                            </p>
                            <p className={cn(
                                "font-oswald text-xl tracking-[0.04em]",
                                isSoldOut ? "text-[#8b7580]" : "text-[#E7A3B0]"
                            )}>
                                {"\u20B1"}{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </article>
        </button>
    )
}
