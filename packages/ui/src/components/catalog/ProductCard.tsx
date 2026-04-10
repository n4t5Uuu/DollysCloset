"use client"

import { CardTitle } from "../ui/card"
import { cn, type Product, resolveProductPlaceholder, useProductMetadata } from "@dollys-closet/core"

import Image from "next/image"
import { useMemo, useRef, useState } from "react"

import { ProductBadge } from "./ProductBadge";

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
        hasDiscount,
        eyebrow, 
        categoryLabel, 
        badges, 
        metadataChips, 
        formattedPrice,
        formattedOriginalPrice,
        formattedSalePrice,
        discountLabel,
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

        const formatPercent = (value: number) => `${parseFloat(value.toFixed(2)).toString()}%`;

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

    const nonDiscountBadges = useMemo(() => {
        return badges.filter((badge) => badge.label !== (product.discount?.discount_name || "") && badge.label !== (discountLabel || ""));
    }, [badges, discountLabel, product.discount?.discount_name]);

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

    return (
        <a
            href={href}
            aria-label={`View details for ${product.name}`}
            onClick={(e) => { e.preventDefault(); onClick?.(); }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group block h-full w-full text-left focus-visible:outline-none focus-visible:[&>article]:ring-2 focus-visible:[&>article]:ring-[#E7A3B0] focus-visible:[&>article]:ring-offset-4"
        >
            <article
                className={cn(
                    "flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-[#f1e1e6] bg-linear-to-b from-white via-[#fffdfd] to-[#fff7f9] p-2 shadow-[0_10px_28px_rgba(18,18,18,0.08),0_2px_8px_rgba(231,163,176,0.10)] transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:border-[#e7a3b0]/70 group-hover:shadow-[0_24px_54px_rgba(18,18,18,0.14),0_8px_20px_rgba(231,163,176,0.16)]"
                )}
            >
                <div className="relative aspect-3/4 overflow-hidden rounded-[1.05rem] border border-white/70 bg-[#f7eef1] shadow-inner">
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/12 via-transparent to-white/10 opacity-90" />
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
                            className={cn("object-cover", isSoldOut ? "grayscale-[0.3]" : "")}
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
                                className={cn("object-cover", isSoldOut ? "grayscale-[0.3]" : "")}
                            />
                        </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/20 via-black/0 to-transparent opacity-80" />

                    <div className="absolute left-3 top-3 flex max-w-[calc(100%-6.75rem)] flex-wrap gap-2">
                        {nonDiscountBadges.map((badge) => (
                            <ProductBadge 
                                key={badge.label} 
                                label={badge.label} 
                                className={badge.className} 
                                mobileHidden={badge.mobileHidden} 
                            />
                        ))}
                    </div>

                    {hasDiscount && !isSoldOut && discountDisplayInfo && (
                        <div className="absolute right-3 top-3">
                            <ProductBadge
                                label={discountDisplayInfo.topRightLabel}
                                className="bg-[#fff2e8] text-[#b86a36] ring-1 ring-[#f1c8a7]/70 shadow-sm"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-2 px-2 pt-3 pb-1.5">
                    <div className="min-w-0 space-y-0.5">
                        <p className="hidden sm:block font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b7580] truncate">
                            {categoryLabel}
                        </p>
                        <p className="font-oswald text-[11px] uppercase tracking-[0.24em] text-[#c0929d] truncate" title={eyebrow}>
                            {eyebrow}
                        </p>
                        <CardTitle 
                            className="mt-1 font-playfair-display text-sm sm:text-base leading-snug text-[#121212] line-clamp-3 break-words"
                            title={product.name}
                        >
                            {product.name}
                        </CardTitle>
                    </div>

                    {metadataChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {metadataChips.map((chip) => (
                                <span
                                    key={chip}
                                    className="max-w-full truncate rounded-full border border-[#efdde1] bg-[#fff9fb] px-2.5 py-0.5 font-montserrat text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.10em] text-[#725c62]"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto border-t border-[#E7A3B0]/12 pt-2">
                        <div>
                            <p className="font-oswald text-[10px] uppercase tracking-[0.24em] text-[#c0929d]">
                                {isSoldOut ? "Last Price" : "Price"}
                            </p>
                            {hasDiscount && !isSoldOut && formattedSalePrice ? (
                                <div className="space-y-1 rounded-[0.9rem] border border-[#f0d9df] bg-[#fff9fb] px-3 py-2">
                                    {discountDisplayInfo && (
                                        <p className="font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a76f7c]">
                                            {discountDisplayInfo.codeLabel}
                                        </p>
                                    )}
                                    <p className="font-oswald text-sm tracking-[0.18em] text-[#8b7580] line-through">
                                        {formattedOriginalPrice}
                                    </p>
                                    <p className="font-oswald text-xl tracking-[0.04em] text-[#c95f7b]">
                                        {formattedSalePrice}
                                    </p>
                                </div>
                            ) : (
                                <p className={cn(
                                    "font-oswald text-xl tracking-[0.04em]",
                                    isSoldOut ? "text-[#8b7580]" : "text-[#E7A3B0]"
                                )}>
                                    {formattedPrice}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </article>
        </a>
    )
}
