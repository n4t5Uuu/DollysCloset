"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Product, resolveProductPlaceholder, cn, useProductMetadata } from "@dollys-closet/core";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductBadge } from "./ProductBadge";

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

function compactCategoryBadgeLabel(label: string) {
    const normalized = label
        .replace(/products?/gi, "")
        .replace(/\s*&\s*/g, " & ")
        .replace(/\s+/g, " ")
        .trim();

    if (normalized.length <= 10) return normalized;
    return `${normalized.slice(0, 7)}...`;
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
    if (w < 640) return { cardWidth: 180, gap: 10 };
    if (w < 1024) return { cardWidth: 210, gap: 36 };
    return { cardWidth: 260, gap: 52 }; 
}

function normaliseOffset(index: number, activeIndex: number, total: number): number {
    let offset = index - activeIndex;
    if (offset > total / 2)  offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
}

type LaunchOverride = { id: string; offset: number };
type ExitClone = { id: string; startOffset: number; endOffset: number; active: boolean };

function CardContent({ product, cardImageHeight, cardWidth }: { product: Product; cardImageHeight: number; cardWidth: number }) {
    const { isSoldOut, eyebrow, categoryLabel, badges, formattedPrice, hasDiscount, discountLabel } = useProductMetadata(product);
    const categoryBadgeLabel = compactCategoryBadgeLabel(categoryLabel);

    const discountBadgeLabel = useMemo(() => {
        if (!hasDiscount || !product.discount || product.discountedPrice === null || product.discountedPrice === undefined) {
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

        if (discountType === "percent") return formatPercent(rawValue);
        if (discountType === "fixed_price") return formatPercent(effectivePercent);
        return `-${formatNumber(rawValue)}`;
    }, [hasDiscount, product]);

    const displayBadges = useMemo(() => {
        if (!discountBadgeLabel || !product.discount) return badges;

        return badges.map((badge) => {
            const isDiscountBadge = badge.label === product.discount?.discount_name || badge.label === (discountLabel || "");
            if (!isDiscountBadge) return badge;

            return {
                ...badge,
                label: discountBadgeLabel,
            };
        });
    }, [badges, discountBadgeLabel, discountLabel, product.discount]);

    return (
        <>
            <div
                className="w-full rounded-[1.5rem] bg-[#f7eef1] relative overflow-hidden shadow-md"
                style={{ height: `${cardImageHeight}px` }}
            >
                <Image
                    src={product.images[0] || resolveProductPlaceholder(product.category)}
                    alt={product.name}
                    fill
                    sizes={`${cardWidth}px`}
                    className={cn("object-cover", isSoldOut ? "grayscale-[0.3]" : "")}
                    draggable={false}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/25 via-black/0 to-transparent opacity-70" />

                <div className="absolute left-3 top-3 flex max-w-[58%] flex-wrap gap-2">
                    {displayBadges.map((badge) => (
                        <ProductBadge
                            key={badge.label}
                            label={badge.label}
                            className={badge.className}
                            mobileHidden={badge.mobileHidden}
                        />
                    ))}
                </div>

                <div className="absolute right-3 top-3 max-w-[38%] rounded-full bg-white/88 px-3 py-1.5 backdrop-blur-sm ring-1 ring-black/5">
                    <p className="truncate font-montserrat text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f5058]">
                        {categoryBadgeLabel}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex flex-col items-center text-center gap-1 px-2">
                <p className="font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88] truncate w-full" title={eyebrow}>
                    {eyebrow}
                </p>
                <p className="font-playfair-display font-medium text-sm md:text-base text-[#121212] line-clamp-2 w-full break-all">
                    {product.name}
                </p>
                <p className={cn(
                    "font-oswald text-sm tracking-wide",
                    isSoldOut ? "text-[#8b7580]" : "text-[#E7A3B0]"
                )}>
                    {formattedPrice}
                </p>
            </div>
        </>
    );
}



export default function FeatureCardCarousel({ products, onProductClick }: FeatureCardCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [cardConfig, setCardConfig] = useState({ cardWidth: 260, gap: 52 });
    const [isDragging, setIsDragging] = useState(false);
    const [launch, setLaunch] = useState<LaunchOverride | null>(null);
    const [exitClone, setExitClone] = useState<ExitClone | null>(null);

    const touchStartX    = useRef<number | null>(null);
    const mouseStartX    = useRef<number | null>(null);
    const hasDragged     = useRef(false);
    const exitCloneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const featuredProducts = useMemo(() => products.slice(0, 5), [products]);
    const total = featuredProducts.length;

    useEffect(() => {
        const update = () => setCardConfig(getCardConfig(window.innerWidth));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        return () => { if (exitCloneTimer.current) clearTimeout(exitCloneTimer.current); };
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
                // Where the real card enters from (opposite side)
                const launchOffset = direction === 1 ? (half + 1) : -(half + 1);
                // Where the exit clone slides out to (continues natural direction)
                const exitOffset   = currentOffset - direction * (half + 1);

                if (exitCloneTimer.current) clearTimeout(exitCloneTimer.current);

                // Clone starts at the card's current position (no transition yet)
                setExitClone({
                    id: String(wrappingProduct.id),
                    startOffset: currentOffset,
                    endOffset: exitOffset,
                    active: false,
                });
                // Real card teleports to entry side (no transition yet)
                setLaunch({ id: String(wrappingProduct.id), offset: launchOffset });

                requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                        // Both start their transitions simultaneously:
                        // - clone slides out in its natural direction
                        // - real card slides in from the opposite side
                        setLaunch(null);
                        setExitClone(prev => prev ? { ...prev, active: true } : null);
                        exitCloneTimer.current = setTimeout(() => setExitClone(null), 600);
                    })
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

    // â”€â”€ Touch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) {
                goNext();
            } else {
                goPrev();
            }
        }
        touchStartX.current = null;
    };

    // â”€â”€ Mouse drag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        if (hasDragged.current && Math.abs(diff) > 40) {
            if (diff > 0) {
                goNext();
            } else {
                goPrev();
            }
        }
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
    const cardImageHeight = Math.round(cardWidth * (4 / 3));
    const containerHeight = cardImageHeight + 104;


    return (
        <div className="w-full max-w-[1600px] mx-auto px-2 lg:px-4">
            <div className="relative flex items-center gap-2 md:gap-4">

                {/* â† Prev */}
                <button
                    type="button"
                    onClick={goPrev}
                    className="
                        absolute left-1 z-20 md:static
                        top-1/2 -translate-y-1/2 md:translate-y-0
                        shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full
                        bg-white/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none
                        border border-white/30 md:border-[#E7A3B0]/50
                        text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer
                    "
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
                    {/* Main cards */}
                    {featuredProducts.map((product, index) => {
                        const offset    = normaliseOffset(index, activeIndex, total);
                        const absOffset = Math.abs(offset);
                        const isVisible = absOffset <= 2;

                        const isLaunching  = launch?.id === String(product.id);
                        const displayOff   = isLaunching ? launch!.offset : offset;
                        const displayScale = cardScale(Math.abs(displayOff));
                        const translateX   = cardTranslateX(displayOff, cardWidth, gap);

                        const opacity = isLaunching && launch!.offset < 0 ? 0 : isVisible ? 1 : 0;

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
                                <CardContent product={product} cardImageHeight={cardImageHeight} cardWidth={cardWidth} />
                            </div>
                        );
                    })}

                    {/* Exit clone â€” slides out in the card's natural direction while the
                        real card enters from the opposite side, creating a wrap-around effect */}
                    {exitClone && featuredProducts.map((product) => {
                        if (String(product.id) !== exitClone.id) return null;
                        const cloneOff   = exitClone.active ? exitClone.endOffset : exitClone.startOffset;
                        const cloneScale = cardScale(Math.abs(cloneOff));
                        const cloneTx    = cardTranslateX(cloneOff, cardWidth, gap);

                        return (
                            <div
                                key={`exit-${product.id}`}
                                style={{
                                    position:      "absolute",
                                    left:          "50%",
                                    top:           "50%",
                                    width:         `${cardWidth}px`,
                                    transform:     `translateX(calc(-50% + ${cloneTx}px)) translateY(-50%) scale(${cloneScale})`,
                                    transition:    exitClone.active
                                        ? "transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                                        : "none",
                                    opacity:       1,
                                    zIndex:        9 - Math.abs(cloneOff),
                                    pointerEvents: "none",
                                }}
                            >
                                <CardContent product={product} cardImageHeight={cardImageHeight} cardWidth={cardWidth} />
                            </div>
                        );
                    })}
                </div>

                {/* â†’ Next */}
                <button
                    type="button"
                    onClick={goNext}
                    className="
                        absolute right-1 z-20 md:static
                        top-1/2 -translate-y-1/2 md:translate-y-0
                        shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full
                        bg-white/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none
                        border border-white/30 md:border-[#E7A3B0]/50
                        text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer
                    "
                    aria-label="Next featured product"
                >
                    <ChevronRight className="h-5 w-5 mx-auto" />
                </button>

            </div>
        </div>
    );
}
