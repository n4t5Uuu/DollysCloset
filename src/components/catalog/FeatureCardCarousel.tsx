"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/product.types";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveProductPlaceholder } from "@/lib/product-placeholder";

interface FeatureCardCarouselProps {
    products: Product[];
    onProductClick?: (product: Product) => void;
}

const AUTO_ADVANCE_MS = 5500;
const SCALE_STEP = 0.15;
const SCALE_MIN  = 0.65;

function cardScale(absOffset: number) {
    return Math.max(SCALE_MIN, 1 - absOffset * SCALE_STEP);
}

// Keeps visual edge-to-edge gaps equal regardless of scale.
function cardTranslateX(offset: number, cardWidth: number, gap: number): number {
    if (offset === 0) return 0;
    const sign = offset > 0 ? 1 : -1;
    const abs  = Math.abs(offset);
    let x = 0;
    for (let i = 1; i <= abs; i++) {
        x += (cardWidth * (cardScale(i - 1) + cardScale(i))) / 2 + gap;
    }
    return sign * x;
}

function getCardConfig(w: number): { cardWidth: number; gap: number } {
    if (w < 640) return { cardWidth: 170, gap: 20 };
    if (w < 1024) return { cardWidth: 210, gap: 36 };
    return { cardWidth: 260, gap: 52 };
}

function normaliseOffset(index: number, activeIndex: number, total: number): number {
    let offset = index - activeIndex;
    if (offset > total / 2)  offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
}

// Per-card override: place the card at a specific offset (no transition) so the
// subsequent transition slides it in from that position.
type LaunchOverride = { id: string; offset: number };

export default function FeatureCardCarousel({ products, onProductClick }: FeatureCardCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [cardConfig, setCardConfig] = useState({ cardWidth: 260, gap: 52 });
    const [isDragging, setIsDragging] = useState(false);
    const [launch, setLaunch] = useState<LaunchOverride | null>(null);

    const touchStartX = useRef<number | null>(null);
    const mouseStartX = useRef<number | null>(null);
    const hasDragged  = useRef(false);

    const featuredProducts = useMemo(() => products.slice(0, 5), [products]);
    const total = featuredProducts.length;

    useEffect(() => {
        const update = () => setCardConfig(getCardConfig(window.innerWidth));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const navigate = useCallback((direction: 1 | -1) => {
        const next = (activeIndex + direction + total) % total;
        const half = Math.floor(total / 2);

        const wrappingIdx = direction === 1
            ? (activeIndex - half + total) % total
            : (activeIndex + half) % total;

        const wrappingProduct = featuredProducts[wrappingIdx];
        if (wrappingProduct) {
            const currentOffset = normaliseOffset(wrappingIdx, activeIndex, total);
            const nextOffset    = normaliseOffset(wrappingIdx, next, total);

            if (Math.abs(nextOffset - currentOffset) >= 2) {

                const launchOffset = direction === 1 ? (half + 1) : -(half + 1);

                setLaunch({ id: String(wrappingProduct.id), offset: launchOffset });
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => setLaunch(null))
                );
            }
        }

        setActiveIndex(next);
    }, [activeIndex, total, featuredProducts]);

    const goPrev = useCallback(() => navigate(-1), [navigate]);
    const goNext = useCallback(() => navigate(1),  [navigate]);

    // Auto-advance
    useEffect(() => {
        if (total <= 1) return;
        const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
        return () => clearTimeout(timer);
    }, [activeIndex, total, goNext]);

    // ── Touch ──────────────────────────────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
        touchStartX.current = null;
    };

    // ── Mouse drag ─────────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent) => {
        mouseStartX.current = e.clientX;
        hasDragged.current = false;
        setIsDragging(false);
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (mouseStartX.current !== null && Math.abs(e.clientX - mouseStartX.current) > 6) {
            hasDragged.current = true;
            setIsDragging(true);
        }
    };
    const onMouseUp = (e: React.MouseEvent) => {
        if (mouseStartX.current === null) return;
        const diff = mouseStartX.current - e.clientX;
        if (hasDragged.current && Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
        mouseStartX.current = null;
        setIsDragging(false);
        setTimeout(() => { hasDragged.current = false; }, 0);
    };
    const onMouseLeave = () => {
        mouseStartX.current = null;
        hasDragged.current  = false;
        setIsDragging(false);
    };

    if (total === 0) {
        return (
            <div className="w-full py-12 text-center">
                <p className="text-gray-500 font-montserrat">No featured products yet</p>
            </div>
        );
    }

    const { cardWidth, gap } = cardConfig;
    const cardImageHeight   = Math.round(cardWidth * (4 / 3));
    const containerHeight   = cardImageHeight + 68;

    return (
        <div className="w-full max-w-[1600px] mx-auto px-2 lg:px-4">
            <div className="flex items-center gap-2 md:gap-4">

                {/* ← Prev */}
                <button
                    type="button"
                    onClick={goPrev}
                    className="shrink-0 h-10 w-10 rounded-full border border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer z-10"
                    aria-label="Previous featured product"
                >
                    <ChevronLeft className="h-5 w-5 mx-auto" />
                </button>

                {/* Carousel viewport */}
                <div
                    className="relative flex-1 overflow-hidden select-none"
                    style={{
                        height: `${containerHeight}px`,
                        cursor: isDragging ? "grabbing" : "grab",
                    }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                >
                    {featuredProducts.map((product, index) => {
                        const offset    = normaliseOffset(index, activeIndex, total);
                        const absOffset = Math.abs(offset);
                        const isVisible = absOffset <= 2;

                        const isLaunching  = launch?.id === String(product.id);
                        const displayOff   = isLaunching ? launch!.offset : offset;
                        const displayScale = cardScale(Math.abs(displayOff));
                        const translateX   = cardTranslateX(displayOff, cardWidth, gap);

                        const opacity      = isLaunching && launch!.offset < 0 ? 0 : isVisible ? 1 : 0;

                        return (
                            <div
                                key={product.id}
                                style={{
                                    position:      "absolute",
                                    left:          "50%",
                                    top:           "50%",
                                    width:         `${cardWidth}px`,
                                    transform:     `translateX(calc(-50% + ${translateX}px)) translateY(-50%) scale(${displayScale})`,
                                    transition:    isLaunching ? "none" : "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease",
                                    opacity,
                                    zIndex:        10 - absOffset,
                                    visibility:    isVisible ? "visible" : "hidden",
                                    pointerEvents: isVisible ? "auto" : "none",
                                }}
                                onClick={() => {
                                    if (hasDragged.current) return;
                                    if (absOffset === 0) onProductClick?.(product);
                                    else setActiveIndex(index);
                                }}
                            >
                                <div
                                    className="w-full bg-[#f5f5f5] rounded-xl relative overflow-hidden shadow-md"
                                    style={{ height: `${cardImageHeight}px` }}
                                >
                                    <Image
                                        src={product.images[0] || resolveProductPlaceholder(product.category)}
                                        alt={product.name}
                                        fill
                                        sizes={`${cardWidth}px`}
                                        className="object-cover"
                                        draggable={false}
                                    />
                                </div>

                                <div className="mt-3 flex flex-col items-center text-center gap-0.5 px-1">
                                    <p className="font-playfair-display font-medium text-sm md:text-base text-[#121212] line-clamp-1 w-full">
                                        {product.name}
                                    </p>
                                    <p className="font-oswald text-sm text-[#E7A3B0] tracking-wide">
                                        ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* → Next */}
                <button
                    type="button"
                    onClick={goNext}
                    className="shrink-0 h-10 w-10 rounded-full border border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer z-10"
                    aria-label="Next featured product"
                >
                    <ChevronRight className="h-5 w-5 mx-auto" />
                </button>

            </div>
        </div>
    );
}
