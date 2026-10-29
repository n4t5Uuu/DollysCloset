"use client"

import { CardTitle } from "../ui/card"
import { cn, type Product, resolveProductPlaceholder, useProductMetadata } from "@dollys-closet/core"

import Image from "next/image"
import { useMemo } from "react"
import { useImageCycle, type AnimPhase } from "./useImageCycle"

interface ProductCardProps {
    product?: Product;
    href?: string;
    onClick?: () => void;
    compact?: boolean;
}

type ChipTone = "neutral" | "info" | "warning";
type Ribbon = { label: string; bg: string; text: string };

const IMAGE_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw";

const CHIP_TONE_CLASS: Record<ChipTone, string> = {
    info: "border-[#b8daf0]/70 bg-[#eef7ff] text-[#2b6b93]",
    warning: "border-[#f2c98a]/60 bg-[#fff8ec] text-[#9a6a17]",
    neutral: "border-[#efdde1] bg-[#fff9fb] text-[#725c62]",
};

const formatNumber = (value: number) =>
    Number.isInteger(value)
        ? value.toLocaleString()
        : value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatPercent = (value: number) => `${Math.round(value)}%`;

/** Ribbon text for a discounted product: the percent off, or the amount off for flat discounts. */
function getDiscountLabel(product: Product) {
    const discount = product.discount!;
    const rawValue = Math.max(0, Number(discount.discount_value) || 0);
    const originalPrice = Math.max(0, Number(product.price) || 0);
    const discountedPrice = Math.max(0, Number(product.discountedPrice) || 0);
    const amountOff = Math.max(0, originalPrice - discountedPrice);
    const effectivePercent = originalPrice > 0 ? (amountOff / originalPrice) * 100 : 0;

    if (discount.discount_type === "percent") return formatPercent(rawValue);
    if (discount.discount_type === "fixed_price") return formatPercent(effectivePercent);
    return `-₱${formatNumber(rawValue)}`;
}

function getRibbon(product: Product, isSoldOut: boolean, hasDiscount: boolean): Ribbon | null {
    if (isSoldOut) return { label: "Sold Out", bg: "#121212", text: "#ffffff" };

    const hasDiscountPrice =
        hasDiscount && product.discount && product.discountedPrice !== null && product.discountedPrice !== undefined;
    if (hasDiscountPrice) {
        const raw = getDiscountLabel(product);
        return { label: raw.startsWith("-") ? raw : `-${raw}`, bg: "#c95f7b", text: "#ffffff" };
    }

    if (product.isNewArrival) return { label: "New", bg: "#E7A3B0", text: "#ffffff" };
    return null;
}

function getOverlayChips(product: Product, hasLowStock: boolean, metadataChips: string[]) {
    const chips: { label: string; tone: ChipTone }[] = [];
    const seasonName = product.seasonName?.trim();
    if (seasonName) chips.push({ label: seasonName, tone: "info" });
    if (hasLowStock) chips.push({ label: `${product.stock} Left`, tone: "warning" });
    for (const chip of metadataChips) chips.push({ label: chip, tone: "neutral" });
    // Keep chip count tight so the card stays compact and scannable.
    return chips.slice(0, 3);
}

function SlideImage({
    src,
    alt,
    phase,
    transform,
    isSoldOut,
    draggable,
}: {
    src: string;
    alt: string;
    phase: AnimPhase;
    transform: string;
    isSoldOut: boolean;
    draggable?: boolean;
}) {
    return (
        <div
            className={cn("absolute inset-0", phase === "animating" && "transition-transform duration-420 ease-in-out")}
            style={{ transform }}
        >
            <Image
                src={src}
                alt={alt}
                fill
                sizes={IMAGE_SIZES}
                draggable={draggable}
                className={cn(
                    "object-cover transition-transform duration-500 group-hover:scale-105",
                    isSoldOut ? "grayscale-[0.3]" : ""
                )}
            />
        </div>
    );
}

function CardRibbon({ ribbon }: { ribbon: Ribbon }) {
    return (
        <div
            className="absolute left-0 top-3 z-10 flex items-center justify-center rounded-r-[6px] px-2.5 py-1 shadow-[0_4px_12px_rgba(18,18,18,0.22)]"
            style={{ backgroundColor: ribbon.bg }}
            aria-label={ribbon.label}
        >
            <span className="font-oswald text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ribbon.text }}>
                {ribbon.label}
            </span>
        </div>
    );
}

function ImageDots({ images, activeIndex }: { images: string[]; activeIndex: number }) {
    return (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 sm:hidden">
            {images.map((image, i) => (
                <div
                    key={image}
                    className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        i === activeIndex ? "w-3 bg-white" : "w-1.5 bg-white/50"
                    )}
                />
            ))}
        </div>
    );
}

function CardImageStage({
    product,
    compact,
    fallback,
    validImages,
    isSoldOut,
    ribbon,
    cycle,
}: {
    product: Product;
    compact?: boolean;
    fallback: string;
    validImages: string[];
    isSoldOut: boolean;
    ribbon: Ribbon | null;
    cycle: ReturnType<typeof useImageCycle>;
}) {
    const { currentSrc, nextSrc, phase, activeImageIndex, animDirRef } = cycle;
    const leavesLeft = animDirRef.current === "left";

    return (
        <div
            className={cn("relative overflow-hidden bg-[#f7eef1] select-none", compact ? "aspect-square sm:aspect-3/4" : "aspect-3/4")}
            onTouchStart={compact ? undefined : cycle.handleTouchStart}
            onTouchEnd={compact ? undefined : cycle.handleTouchEnd}
        >
            <SlideImage
                src={currentSrc || fallback}
                alt={product.name}
                phase={phase}
                transform={phase === "animating" ? `translateX(${leavesLeft ? "-100%" : "100%"})` : "translateX(0)"}
                isSoldOut={isSoldOut}
                draggable={false}
            />

            {phase !== "idle" && nextSrc && (
                <SlideImage
                    src={nextSrc}
                    alt={product.name}
                    phase={phase}
                    transform={phase === "animating" ? "translateX(0)" : `translateX(${leavesLeft ? "100%" : "-100%"})`}
                    isSoldOut={isSoldOut}
                />
            )}

            {ribbon && <CardRibbon ribbon={ribbon} />}

            {/* Dot indicators — collection grid only (not masonry), mobile only */}
            {validImages.length > 1 && !compact && <ImageDots images={validImages} activeIndex={activeImageIndex} />}
        </div>
    );
}

function CardEyebrow({ categoryLabel, eyebrow }: { categoryLabel: string; eyebrow?: string | null }) {
    return (
        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.14em] text-[#8b7580]">
            {/* Desktop: category label */}
            <span className="hidden sm:inline truncate font-montserrat">{categoryLabel}</span>
            {/* Desktop: separator + brand (only if different from category) */}
            {eyebrow && eyebrow !== categoryLabel && (
                <>
                    <span className="hidden sm:inline text-[#c0929d]">·</span>
                    <span className="hidden sm:inline truncate font-montserrat">{eyebrow}</span>
                </>
            )}
            {/* Mobile: brand only */}
            {eyebrow && <span className="sm:hidden truncate font-montserrat">{eyebrow}</span>}
        </div>
    );
}

function CardChips({ chips }: { chips: { label: string; tone: ChipTone }[] }) {
    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {chips.map((chip) => (
                <span
                    key={`${chip.tone}-${chip.label}`}
                    className={cn(
                        "max-w-full truncate rounded-full border px-1.5 py-px sm:px-2 sm:py-0.5 font-montserrat text-[9px] sm:text-[10px] font-medium",
                        chip.tone === "info" && "hidden sm:inline-flex",
                        CHIP_TONE_CLASS[chip.tone]
                    )}
                >
                    {chip.label}
                </span>
            ))}
        </div>
    );
}

function CardPrice({
    showSale,
    isSoldOut,
    formattedPrice,
    formattedOriginalPrice,
    formattedSalePrice,
}: {
    showSale: boolean;
    isSoldOut: boolean;
    formattedPrice: string;
    formattedOriginalPrice: string;
    formattedSalePrice?: string | null;
}) {
    return (
        <div className="mt-auto flex flex-wrap items-baseline gap-1 sm:gap-2 pt-0 sm:pt-1">
            {showSale ? (
                <>
                    <span className="font-oswald text-base sm:text-lg font-bold tracking-[0.02em] text-[#1a1a1a] break-all">
                        {formattedSalePrice}
                    </span>
                    <span className="font-montserrat text-xs text-[#8b7580] line-through break-all">
                        {formattedOriginalPrice}
                    </span>
                </>
            ) : (
                <span
                    className={cn(
                        "font-oswald text-base sm:text-lg font-bold tracking-[0.02em] break-all",
                        isSoldOut ? "text-[#8b7580]" : "text-[#1a1a1a]"
                    )}
                >
                    {formattedPrice}
                </span>
            )}
        </div>
    );
}

function EmptyProductCard() {
    return (
        <div className="w-full max-w-[280px]">
            <div className="bg-[#f5f5f5] aspect-3/4 w-full flex items-center justify-center flex-col relative overflow-hidden rounded-[0.85rem]">
                <div className="font-oswald font-bold text-xl tracking-widest text-black/90">
                    NO PRODUCT
                </div>
            </div>
        </div>
    );
}

export default function ProductCard({ product, href, onClick, compact }: ProductCardProps) {
    const validImages = product?.images.filter(Boolean) ?? [];
    const fallback = product ? resolveProductPlaceholder(product.category) : "";
    const cycle = useImageCycle(validImages, validImages[0] || fallback);

    // Get centralized metadata
    const {
        isSoldOut,
        hasLowStock,
        hasDiscount,
        eyebrow,
        categoryLabel,
        metadataChips,
        formattedPrice,
        formattedOriginalPrice,
        formattedSalePrice,
    } = useProductMetadata(product || {} as Product);

    const ribbon = useMemo(
        () => (product ? getRibbon(product, isSoldOut, hasDiscount) : null),
        [product, isSoldOut, hasDiscount]
    );
    const visibleChips = useMemo(
        () => (product ? getOverlayChips(product, hasLowStock, metadataChips) : []),
        [product, hasLowStock, metadataChips]
    );

    if (!product) return <EmptyProductCard />;

    return (
        <a
            href={href}
            aria-label={`View details for ${product.name}`}
            onClick={(e) => { e.preventDefault(); onClick?.(); }}
            onMouseEnter={cycle.handleMouseEnter}
            onMouseLeave={cycle.handleMouseLeave}
            className="group block h-full w-full text-left focus-visible:outline-none focus-visible:[&>article]:ring-2 focus-visible:[&>article]:ring-[#E7A3B0] focus-visible:[&>article]:ring-offset-2"
        >
            <article
                className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:shadow-xl"
                )}
            >
                <CardImageStage
                    product={product}
                    compact={compact}
                    fallback={fallback}
                    validImages={validImages}
                    isSoldOut={isSoldOut}
                    ribbon={ribbon}
                    cycle={cycle}
                />

                <div className="flex flex-1 flex-col gap-1 p-2 sm:gap-2 sm:p-4">
                    <CardEyebrow categoryLabel={categoryLabel} eyebrow={eyebrow} />

                    <CardTitle
                        className="font-playfair-display text-xs sm:text-sm font-semibold leading-tight text-[#121212] truncate"
                        title={product.name}
                    >
                        {product.name}
                    </CardTitle>

                    <CardChips chips={visibleChips} />

                    <CardPrice
                        showSale={Boolean(hasDiscount && !isSoldOut && formattedSalePrice)}
                        isSoldOut={isSoldOut}
                        formattedPrice={formattedPrice}
                        formattedOriginalPrice={formattedOriginalPrice}
                        formattedSalePrice={formattedSalePrice}
                    />
                </div>
            </article>
        </a>
    )
}
