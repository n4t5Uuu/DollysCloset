"use client"

import { CardTitle } from "../ui/card"
import { cn, type Product, resolveProductPlaceholder, useProductMetadata } from "@dollys-closet/core"

import Image from "next/image"
import { useMemo, useRef, useState } from "react"

interface ProductCardProps {
    product?: Product;
    href?: string;
    onClick?: () => void;
}

type AnimPhase = "idle" | "prepare" | "animating";

export default function ProductCard({ product, href, onClick }: ProductCardProps) {
    const validImages = product?.images.filter(Boolean) ?? [];
    const fallback = product ? resolveProductPlaceholder(product.category) : "";
    const firstSrc = validImages[0] || fallback;

    const [currentSrc, setCurrentSrc] = useState(firstSrc);
    const [nextSrc, setNextSrc] = useState("");
    const [phase, setPhase] = useState<AnimPhase>("idle");

    const imageIndexRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);

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

    const discountDisplayInfo = useMemo(() => {
        if (!hasDiscount || !product?.discount || product.discountedPrice === null || product.discountedPrice === undefined) {
            return null;
        }

        const discountType = product.discount.discount_type;
        const rawValue = Math.max(0, Number(product.discount.discount_value) || 0);
        const originalPrice = Math.max(0, Number(product.price) || 0);
        const discountedPrice = Math.max(0, Number(product.discountedPrice) || 0);
        const amountOff = Math.max(0, originalPrice - discountedPrice);
        const effectivePercent = originalPrice > 0 ? (amountOff / originalPrice) * 100 : 0;

        const formatNumber = (value: number) => {
            if (Number.isInteger(value)) return value.toLocaleString();
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        };

        const formatPercent = (value: number) => `${Math.round(value)}%`;

        const topRightLabel = discountType === "percent"
            ? formatPercent(rawValue)
            : discountType === "fixed_price"
                ? formatPercent(effectivePercent)
                : `-${formatNumber(rawValue)}`;

        const codeDiscountLabel = discountType === "percent"
            ? formatPercent(rawValue)
            : formatPercent(effectivePercent);

        return {
            topRightLabel,
            codeLabel: product.discount.discount_name
                ? `${product.discount.discount_name} - ${codeDiscountLabel}`
                : codeDiscountLabel,
        };
    }, [hasDiscount, product]);

    const ribbon = useMemo(() => {
        if (!product) return null;
        if (isSoldOut) {
            return { label: "Sold Out", bg: "#121212", text: "#ffffff" };
        }
        if (hasDiscount && discountDisplayInfo) {
            const raw = discountDisplayInfo.topRightLabel;
            const label = raw.startsWith("-") ? raw : `-${raw}`;
            return { label, bg: "#c95f7b", text: "#ffffff" };
        }
        if (product.isNewArrival) {
            return { label: "New", bg: "#E7A3B0", text: "#ffffff" };
        }
        return null;
    }, [product, isSoldOut, hasDiscount, discountDisplayInfo]);

    const overlayChips = useMemo(() => {
        const chips: { label: string; tone: "neutral" | "info" | "warning" }[] = [];
        if (product?.seasonName && product.seasonName.trim()) {
            chips.push({ label: product.seasonName.trim(), tone: "info" });
        }
        if (hasLowStock && product) {
            chips.push({ label: `${product.stock} Left`, tone: "warning" });
        }
        for (const chip of metadataChips) {
            chips.push({ label: chip, tone: "neutral" });
        }
        return chips;
    }, [product, hasLowStock, metadataChips]);

    if (!product) {
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

    const handleMouseEnter = () => {
        if (validImages.length <= 1) return;
        intervalRef.current = setInterval(() => {
            imageIndexRef.current = (imageIndexRef.current + 1) % validImages.length;
            const newSrc = validImages[imageIndexRef.current];

            if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);

            setNextSrc(newSrc);
            setPhase("prepare");

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = requestAnimationFrame(() => {
                    setPhase("animating");
                    animTimeoutRef.current = setTimeout(() => {
                        setCurrentSrc(newSrc);
                        setNextSrc("");
                        setPhase("idle");
                    }, 440);
                });
            });
        }, 1400);
    };

    const handleMouseLeave = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        imageIndexRef.current = 0;
        setCurrentSrc(firstSrc);
        setNextSrc("");
        setPhase("idle");
    };

    // Keep chip count tight so the card stays compact and scannable.
    const visibleChips = overlayChips.slice(0, 3);

    return (
        <a
            href={href}
            aria-label={`View details for ${product.name}`}
            onClick={(e) => { e.preventDefault(); onClick?.(); }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group block h-full w-full text-left focus-visible:outline-none focus-visible:[&>article]:ring-2 focus-visible:[&>article]:ring-[#E7A3B0] focus-visible:[&>article]:ring-offset-2"
        >
            <article
                className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:shadow-xl"
                )}
            >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#f7eef1]">
                    <div
                        className={cn(
                            "absolute inset-0",
                            phase === "animating" && "transition-transform duration-420 ease-in-out"
                        )}
                        style={{ transform: phase === "animating" ? "translateX(-100%)" : "translateX(0)" }}
                    >
                        <Image
                            src={currentSrc || fallback}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className={cn(
                                "object-cover transition-transform duration-500 group-hover:scale-105",
                                isSoldOut ? "grayscale-[0.3]" : ""
                            )}
                        />
                    </div>

                    {phase !== "idle" && nextSrc && (
                        <div
                            className={cn(
                                "absolute inset-0",
                                phase === "animating" && "transition-transform duration-420 ease-in-out"
                            )}
                            style={{ transform: phase === "animating" ? "translateX(0)" : "translateX(100%)" }}
                        >
                            <Image
                                src={nextSrc}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                className={cn(
                                    "object-cover transition-transform duration-500 group-hover:scale-105",
                                    isSoldOut ? "grayscale-[0.3]" : ""
                                )}
                            />
                        </div>
                    )}

                    {ribbon && (
                        <div
                            className="absolute left-0 top-3 z-10 flex items-center justify-center rounded-r-[6px] px-2.5 py-1 shadow-[0_4px_12px_rgba(18,18,18,0.22)]"
                            style={{ backgroundColor: ribbon.bg }}
                            aria-label={ribbon.label}
                        >
                            <span
                                className="font-oswald text-[11px] font-semibold uppercase tracking-[0.18em]"
                                style={{ color: ribbon.text }}
                            >
                                {ribbon.label}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                    {/* Category · Brand line — single compact row */}
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#8b7580]">
                        <span className="truncate font-montserrat">{categoryLabel}</span>
                        {eyebrow && eyebrow !== categoryLabel && (
                            <>
                                <span className="text-[#c0929d]">·</span>
                                <span className="truncate font-montserrat">{eyebrow}</span>
                            </>
                        )}
                    </div>

                    <CardTitle
                        className="font-playfair-display text-sm font-semibold leading-tight text-[#121212] line-clamp-2 break-words"
                        title={product.name}
                    >
                        {product.name}
                    </CardTitle>

                    {visibleChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {visibleChips.map((chip) => {
                                const toneClass =
                                    chip.tone === "info"
                                        ? "border-[#b8daf0]/70 bg-[#eef7ff] text-[#2b6b93]"
                                        : chip.tone === "warning"
                                            ? "border-[#f2c98a]/60 bg-[#fff8ec] text-[#9a6a17]"
                                            : "border-[#efdde1] bg-[#fff9fb] text-[#725c62]";
                                return (
                                    <span
                                        key={`${chip.tone}-${chip.label}`}
                                        className={cn(
                                            "max-w-full truncate rounded-full border px-2 py-0.5 font-montserrat text-[10px] font-medium",
                                            toneClass
                                        )}
                                    >
                                        {chip.label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Price — bold + dark, optional strikethrough original */}
                    <div className="mt-auto flex items-baseline gap-2 pt-1">
                        {hasDiscount && !isSoldOut && formattedSalePrice ? (
                            <>
                                <span className="font-oswald text-lg font-bold tracking-[0.02em] text-[#1a1a1a]">
                                    {formattedSalePrice}
                                </span>
                                <span className="font-montserrat text-xs text-[#8b7580] line-through">
                                    {formattedOriginalPrice}
                                </span>
                            </>
                        ) : (
                            <span
                                className={cn(
                                    "font-oswald text-lg font-bold tracking-[0.02em]",
                                    isSoldOut ? "text-[#8b7580]" : "text-[#1a1a1a]"
                                )}
                            >
                                {formattedPrice}
                            </span>
                        )}
                    </div>
                </div>
            </article>
        </a>
    )
}
