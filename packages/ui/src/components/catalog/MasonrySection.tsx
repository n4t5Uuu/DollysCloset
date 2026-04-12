"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@dollys-closet/core";

import ProductCard from "./ProductCard";

interface MasonrySectionProps {
    title: string;
    subtitle: string;
    products: Product[];
    accent?: "rose" | "amber";
    onProductClick?: (product: Product) => void;
    onViewAll?: () => void;
    emptyMessage?: string;
}

/**
 * Single-row horizontal carousel for a compact "Curated For You / New Arrivals"
 * or "Limited Time / On Sale" strip at the top of the catalog page.
 *
 * Keeps vertical footprint minimal — users see one row of product cards and can
 * scroll horizontally via native overflow + snap, or click the prev/next chevrons
 * which step by roughly one card width. The eyebrow arrow jumps to the catalog
 * with the appropriate filter applied.
 */
export default function MasonrySection({
    title,
    subtitle,
    products,
    accent = "rose",
    onProductClick,
    onViewAll,
    emptyMessage = "Nothing to show here yet.",
}: MasonrySectionProps) {
    const shellClass = "mx-auto w-full max-w-[1500px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12";
    const accentText = accent === "amber" ? "text-[#b86a36]" : "text-[#c95f7b]";
    const railClass = accent === "amber" ? "bg-[#d98b4f]" : "bg-[#e78aa3]";
    const railGlowClass = accent === "amber"
        ? "shadow-[0_10px_24px_rgba(184,106,54,0.22)]"
        : "shadow-[0_10px_24px_rgba(201,95,123,0.24)]";
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [viewportRatio, setViewportRatio] = useState(1);

    const refreshScrollState = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
        setCanScrollLeft(scrollLeft > 2);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
        setScrollProgress(maxScrollLeft === 0 ? 0 : scrollLeft / maxScrollLeft);
        setViewportRatio(scrollWidth === 0 ? 1 : Math.min(1, clientWidth / scrollWidth));
    }, []);

    useEffect(() => {
        refreshScrollState();
        const el = scrollerRef.current;
        if (!el) return;
        el.addEventListener("scroll", refreshScrollState, { passive: true });
        window.addEventListener("resize", refreshScrollState);
        return () => {
            el.removeEventListener("scroll", refreshScrollState);
            window.removeEventListener("resize", refreshScrollState);
        };
    }, [refreshScrollState, products.length]);

    const scrollByCards = useCallback((direction: 1 | -1) => {
        const el = scrollerRef.current;
        if (!el) return;
        const firstCard = el.querySelector<HTMLElement>("[data-carousel-card]");
        // Fall back to 280 if no card is rendered yet. Step by ~2 cards to feel snappy.
        const cardWidth = firstCard?.offsetWidth ?? 280;
        const gap = 20;
        el.scrollBy({ left: direction * (cardWidth + gap) * 2, behavior: "smooth" });
    }, []);

    const jumpToRailPosition = useCallback((clientX: number) => {
        const el = scrollerRef.current;
        if (!el) return;

        const track = document.getElementById(`carousel-rail-${title.replace(/\s+/g, "-").toLowerCase()}`);
        if (!track) return;

        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        el.scrollTo({ left: maxScrollLeft * ratio, behavior: "smooth" });
    }, [title]);

    const thumbWidthPercent = Math.max(14, viewportRatio * 100);
    const thumbOffsetPercent = (100 - thumbWidthPercent) * scrollProgress;
    const railId = `carousel-rail-${title.replace(/\s+/g, "-").toLowerCase()}`;

    return (
        <section className="w-full py-2 sm:py-6">
            <div className={shellClass}>
                {/* Header */}
                <div className="mb-3 sm:mb-6 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <span
                            className={`font-oswald text-[10px] font-semibold uppercase tracking-[0.28em] ${accentText}`}
                        >
                            {subtitle}
                        </span>
                        <h2 className="mt-1 flex items-center gap-2 font-playfair-display text-2xl text-[#121212] sm:text-3xl md:text-4xl">
                            {title}
                            {onViewAll && (
                                <button
                                    type="button"
                                    onClick={onViewAll}
                                    className={`inline-flex items-center transition-transform duration-300 hover:-translate-y-0.5 hover:translate-x-0.5 ${accentText}`}
                                    aria-label={`View all ${title}`}
                                >
                                    <ArrowUpRight className="h-6 w-6" />
                                </button>
                            )}
                        </h2>
                    </div>

                    {/* Prev / Next chevrons — only show when the row can actually scroll */}
                    {products.length > 0 && (
                        <div className="hidden sm:flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => scrollByCards(-1)}
                                disabled={!canScrollLeft}
                                aria-label={`Scroll ${title} left`}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7A3B0]/40 bg-white text-[#3f2d31] shadow-sm transition-all hover:bg-[#fff5f7] hover:text-[#E7A3B0] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#3f2d31]"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollByCards(1)}
                                disabled={!canScrollRight}
                                aria-label={`Scroll ${title} right`}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7A3B0]/40 bg-white text-[#3f2d31] shadow-sm transition-all hover:bg-[#fff5f7] hover:text-[#E7A3B0] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#3f2d31]"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Horizontal scroller — fixed pixel widths per card so every image
                    lands at the exact same aspect-locked height. Percentage basis can
                    produce inconsistent widths when a child's min-content (long product
                    names, etc.) outgrows the computed basis, which then stretches the
                    whole row. */}
                {products.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E7A3B0]/40 bg-white/60 py-10 text-center font-montserrat text-sm text-[#8b7580]">
                        {emptyMessage}
                    </div>
                ) : (
                    <div>
                        <div
                            ref={scrollerRef}
                            className="flex items-stretch gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 sm:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    data-carousel-card
                                    className="shrink-0 grow-0 snap-start w-[175px] min-w-[175px] sm:w-[205px] sm:min-w-[205px] md:w-[230px] md:min-w-[230px] lg:w-[250px] lg:min-w-[250px] xl:w-[265px] xl:min-w-[265px]"
                                >
                                    <ProductCard
                                        product={product}
                                        href={`/product/${product.id}`}
                                        onClick={() => onProductClick?.(product)}
                                        compact
                                    />
                                </div>
                            ))}
                        </div>

                        {products.length > 1 && (
                            <div className="hidden sm:block mt-4">
                                <div
                                    id={railId}
                                    role="presentation"
                                    onClick={(event) => jumpToRailPosition(event.clientX)}
                                    className="relative h-3 w-full cursor-pointer rounded-full border border-[#E7A3B0]/25 bg-white/80 px-[2px] py-[2px]"
                                >
                                    <div
                                        className={`absolute top-1/2 h-[calc(100%-4px)] min-w-[58px] -translate-y-1/2 rounded-full ${railClass} ${railGlowClass} transition-[left,width] duration-200 ease-out`}
                                        style={{
                                            left: `${thumbOffsetPercent}%`,
                                            width: `${thumbWidthPercent}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
