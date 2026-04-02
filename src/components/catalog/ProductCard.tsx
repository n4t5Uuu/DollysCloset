"use client"

import { CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import Image from "next/image"
import { Product } from "@/types/product.types"
import { resolveProductPlaceholder } from "@/lib/product-placeholder"
import { useRef, useState } from "react"

interface ProductCardProps {
    product?: Product;
    href?: string;
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

            // Step 1: place next image off-screen with no transition
            setNextSrc(newSrc);
            setPhase("prepare");

            // Step 2: after the browser paints the prepare frame, trigger the slide
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = requestAnimationFrame(() => {
                    setPhase("animating");

                    // Step 3: after animation finishes, commit and go idle (no snap-back)
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

    const badges: Array<{ label: string; className: string; mobileHidden?: boolean }> = [];

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
                    {/* Current image — transitions out left only during animating phase */}
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

                    {/* Next image — rendered off-screen in prepare, slides in during animating, removed at idle */}
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
                            <span
                                key={badge.label}
                                className={cn(
                                    "rounded-full px-2.5 py-1 font-oswald text-[10px] uppercase tracking-[0.24em]",
                                    badge.className,
                                    badge.mobileHidden && "hidden sm:inline-flex"
                                )}
                            >
                                {badge.label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 px-2 pb-1.5 pt-3">
                    <div className="min-w-0">
                        <p className="hidden sm:block font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f5058]">
                            {categoryLabel}
                        </p>
                        <p className="font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88]">
                            {eyebrow}
                        </p>
                        <CardTitle className="mt-1 font-playfair-display text-sm sm:text-base leading-snug text-[#121212] line-clamp-3">
                            {product.name}
                        </CardTitle>
                    </div>

                    {metadataChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {metadataChips.map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full bg-[#f8f3f4] px-2 py-0.5 font-montserrat text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.12em] text-[#6a5a5f]"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto border-t border-[#E7A3B0]/12 pt-2">
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
        </a>
    )
}
