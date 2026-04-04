"use client"

import { CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import Image from "next/image"
import { Product } from "@/types/product.types"
import { resolveProductPlaceholder } from "@/lib/images/product-placeholder"
import { useRef, useState } from "react"

import { useProductMetadata } from "@/hooks/useProductMetadata";
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
        eyebrow, 
        categoryLabel, 
        badges, 
        metadataChips, 
        formattedPrice 
    } = useProductMetadata(product || {} as Product);

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
                    "flex h-full flex-col rounded-[1rem] bg-white p-1.5 shadow-[0_8px_24px_rgba(18,18,18,0.10),0_2px_8px_rgba(231,163,176,0.10)] transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:shadow-[0_20px_48px_rgba(18,18,18,0.15),0_4px_16px_rgba(231,163,176,0.15)]"
                )}
            >
                <div className="relative aspect-3/4 overflow-hidden rounded-[0.8rem] bg-[#f7eef1]">
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

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/25 via-black/0 to-transparent opacity-70" />

                    <div className="absolute inset-x-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                        {badges.map((badge) => (
                            <ProductBadge 
                                key={badge.label} 
                                label={badge.label} 
                                className={badge.className} 
                                mobileHidden={badge.mobileHidden} 
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-4 pt-3.5">
                    <div className="min-w-0">
<<<<<<< HEAD
                        <p className="font-oswald text-[10px] uppercase tracking-[0.28em] text-[#9a8a90] truncate">
                            {eyebrow}
                        </p>
                        <CardTitle className="mt-1 font-playfair-display text-[15px] sm:text-base font-semibold leading-snug text-[#2d2226] line-clamp-3 break-words [overflow-wrap:anywhere]">
=======
                        <p className="hidden sm:block font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f5058]">
                            {categoryLabel}
                        </p>
                        <p className="font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88] truncate" title={eyebrow}>
                            {eyebrow}
                        </p>
                        <CardTitle 
                            className="mt-1 font-playfair-display text-sm sm:text-base leading-snug text-[#121212] line-clamp-3 break-all"
                            title={product.name}
                        >
>>>>>>> e144923558a9cdc35a536bb32461f4364035461e
                            {product.name}
                        </CardTitle>
                    </div>

                    {metadataChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 min-w-0">
                            {metadataChips.map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full bg-[#f5f0f1] px-2.5 py-1 font-montserrat text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] text-[#5a4a50] truncate max-w-full"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto border-t border-gray-200 pt-3">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className={cn(
                                "font-oswald text-lg font-bold tracking-[0.02em]",
                                isSoldOut ? "text-[#8b7580]" : "text-[#2d2226]"
                            )}>
                                {formattedPrice}
                            </p>
                            <p className="hidden sm:block font-montserrat text-[10px] font-medium text-[#9a8a90] truncate max-w-[45%]">
                                {categoryLabel}
                            </p>
                        </div>
                    </div>
                </div>
            </article>
        </a>
    )
}
