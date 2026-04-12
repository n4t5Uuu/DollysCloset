"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    cn,
    type Product,
    resolveProductPlaceholder,
    useProductMetadata,
} from "@dollys-closet/core";

import ProductCard from "./ProductCard";

interface ConstellationShowcaseProps {
    newArrivals: Product[];
    saleProducts: Product[];
    onProductClick?: (product: Product) => void;
    onViewAllNew?: () => void;
    onViewAllSale?: () => void;
    logoSrc?: string;
}

interface SlotDef {
    left: number;
    top: number;
    width: number;
    height: number;
    depth: number; // 0..1, parallax intensity
    side: "left" | "right";
}

// Hand-tuned slot positions for an aspect-[3/2] canvas.
// All values are percentages of canvas width/height.
// Layout: tight masonry packing around the central circular logo, like a
// word cloud. Three uniform-width columns per side (A flush, B middle,
// C inner with tall feature cards that wrap above/below the logo).
// Heights vary per card; gaps are uniform (~2% horiz, ~3% vert) so the
// cluster reads as a tightly packed cloud rather than a grid.
// The central logo (18% wide) occupies roughly 41–59% horizontally and
// 36.5–63.5% vertically; slots stay clear of that region.
const LEFT_SLOTS: SlotDef[] = [
    // Column A — flush left
    { left: 2, top: 2, width: 14, height: 18, depth: 0.5, side: "left" },
    { left: 2, top: 23, width: 14, height: 24, depth: 0.7, side: "left" },
    { left: 2, top: 50, width: 14, height: 18, depth: 0.5, side: "left" },
    { left: 2, top: 71, width: 14, height: 24, depth: 0.7, side: "left" },
    // Column B — middle
    { left: 18, top: 2, width: 14, height: 24, depth: 0.7, side: "left" },
    { left: 18, top: 29, width: 14, height: 18, depth: 0.6, side: "left" },
    { left: 18, top: 50, width: 14, height: 24, depth: 0.8, side: "left" },
    { left: 18, top: 77, width: 14, height: 21, depth: 0.6, side: "left" },
    // Column C — feature cards wrapping above/below the logo
    { left: 34, top: 2, width: 18, height: 30, depth: 1.0, side: "left" },
    { left: 34, top: 67, width: 18, height: 30, depth: 1.0, side: "left" },
];

const RIGHT_SLOTS: SlotDef[] = [
    // Column A mirror — flush right
    { left: 84, top: 2, width: 14, height: 18, depth: 0.5, side: "right" },
    { left: 84, top: 23, width: 14, height: 24, depth: 0.7, side: "right" },
    { left: 84, top: 50, width: 14, height: 18, depth: 0.5, side: "right" },
    { left: 84, top: 71, width: 14, height: 24, depth: 0.7, side: "right" },
    // Column B mirror
    { left: 68, top: 2, width: 14, height: 24, depth: 0.7, side: "right" },
    { left: 68, top: 29, width: 14, height: 18, depth: 0.6, side: "right" },
    { left: 68, top: 50, width: 14, height: 24, depth: 0.8, side: "right" },
    { left: 68, top: 77, width: 14, height: 21, depth: 0.6, side: "right" },
    // Column C mirror — feature cards
    { left: 48, top: 2, width: 18, height: 30, depth: 1.0, side: "right" },
    { left: 48, top: 67, width: 18, height: 30, depth: 1.0, side: "right" },
];

const DEFAULT_LOGO_SRC = "/images/logo/no-bg-logo.png";

export default function ConstellationShowcase({
    newArrivals,
    saleProducts,
    onProductClick,
    onViewAllNew,
    onViewAllSale,
    logoSrc = DEFAULT_LOGO_SRC,
}: ConstellationShowcaseProps) {
    return (
        <section className="w-full bg-linear-to-b from-white via-[#fff7fa] to-[#fff0f5]/70 py-10 sm:py-14">
            {/* Desktop: constellation cluster */}
            <div className="hidden lg:block">
                <DesktopConstellation
                    newArrivals={newArrivals}
                    saleProducts={saleProducts}
                    onProductClick={onProductClick}
                    onViewAllNew={onViewAllNew}
                    onViewAllSale={onViewAllSale}
                    logoSrc={logoSrc}
                />
            </div>

            {/* Mobile / tablet: two horizontal scroll strips */}
            <div className="lg:hidden">
                <MobileStrips
                    newArrivals={newArrivals}
                    saleProducts={saleProducts}
                    onProductClick={onProductClick}
                    onViewAllNew={onViewAllNew}
                    onViewAllSale={onViewAllSale}
                />
            </div>
        </section>
    );
}

/* ----------------------------- DESKTOP --------------------------------- */

interface DesktopProps {
    newArrivals: Product[];
    saleProducts: Product[];
    onProductClick?: (product: Product) => void;
    onViewAllNew?: () => void;
    onViewAllSale?: () => void;
    logoSrc: string;
}

function DesktopConstellation({
    newArrivals,
    saleProducts,
    onProductClick,
    onViewAllNew,
    onViewAllSale,
    logoSrc,
}: DesktopProps) {
    const reduceMotion = useReducedMotion();
    const canvasRef = useRef<HTMLDivElement | null>(null);

    // Mouse parallax state — normalized [-1, 1] in both axes, smoothed via spring.
    const parallaxX = useSpring(0, { stiffness: 60, damping: 18 });
    const parallaxY = useSpring(0, { stiffness: 60, damping: 18 });

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (reduceMotion) return;
            const el = canvasRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            parallaxX.set(nx);
            parallaxY.set(ny);
        },
        [parallaxX, parallaxY, reduceMotion],
    );

    const handleMouseLeave = useCallback(() => {
        parallaxX.set(0);
        parallaxY.set(0);
    }, [parallaxX, parallaxY]);

    return (
        <div className="mx-auto w-full max-w-7xl px-4 md:px-12">
            {/* Header row above the canvas */}
            <div className="mb-6 flex items-center justify-between">
                <ConstellationLabel
                    eyebrow="Curated For You"
                    title="New Arrivals"
                    accent="rose"
                    onClick={onViewAllNew}
                    align="left"
                />
                <ConstellationLabel
                    eyebrow="Limited Time"
                    title="On Sale"
                    accent="amber"
                    onClick={onViewAllSale}
                    align="right"
                />
            </div>

            {/* Constellation canvas */}
            <div
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative w-full overflow-hidden rounded-[2rem]"
                style={{ aspectRatio: "3 / 2" }}
            >
                {/* Soft radial backdrop behind the cluster */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse at center, rgba(255,240,245,0.9) 0%, rgba(255,247,250,0.6) 40%, rgba(255,255,255,0) 75%)",
                    }}
                />

                {/* Slots — left side (new arrivals) */}
                {LEFT_SLOTS.map((slot, i) => {
                    const product = newArrivals[i];
                    if (!product) return null;
                    return (
                        <FloatingCard
                            key={`new-${product.id}`}
                            slot={slot}
                            slotIndex={i}
                            product={product}
                            onClick={() => onProductClick?.(product)}
                            parallaxX={parallaxX}
                            parallaxY={parallaxY}
                            reduceMotion={Boolean(reduceMotion)}
                        />
                    );
                })}

                {/* Slots — right side (sale) */}
                {RIGHT_SLOTS.map((slot, i) => {
                    const product = saleProducts[i];
                    if (!product) return null;
                    return (
                        <FloatingCard
                            key={`sale-${product.id}`}
                            slot={slot}
                            slotIndex={i + LEFT_SLOTS.length}
                            product={product}
                            onClick={() => onProductClick?.(product)}
                            parallaxX={parallaxX}
                            parallaxY={parallaxY}
                            reduceMotion={Boolean(reduceMotion)}
                        />
                    );
                })}

                {/* Centered circular logo */}
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: "18%", aspectRatio: "1 / 1" }}
                >
                    <div className="relative h-full w-full rounded-full bg-white shadow-[0_24px_60px_rgba(231,163,176,0.35),0_8px_22px_rgba(18,18,18,0.10)] ring-1 ring-[#E7A3B0]/30">
                        <div className="absolute inset-[10%]">
                            <Image
                                src={logoSrc}
                                alt="Dolly's Closet"
                                fill
                                sizes="(max-width: 1280px) 18vw, 280px"
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ConstellationLabelProps {
    eyebrow: string;
    title: string;
    accent: "rose" | "amber";
    onClick?: () => void;
    align: "left" | "right";
}

function ConstellationLabel({ eyebrow, title, accent, onClick, align }: ConstellationLabelProps) {
    const accentText = accent === "amber" ? "text-[#b86a36]" : "text-[#c95f7b]";
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex flex-col gap-1",
                align === "right" ? "items-end text-right" : "items-start text-left",
            )}
        >
            <span className={cn("font-oswald text-[10px] font-semibold uppercase tracking-[0.32em]", accentText)}>
                {eyebrow}
            </span>
            <span className="flex items-center gap-2 font-playfair-display text-2xl text-[#121212] sm:text-3xl">
                {title}
                <ArrowUpRight
                    className={cn(
                        "h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                        accentText,
                    )}
                />
            </span>
        </button>
    );
}

/* ---------------------------- FLOATING CARD ----------------------------- */

interface FloatingCardProps {
    slot: SlotDef;
    slotIndex: number;
    product: Product;
    onClick?: () => void;
    parallaxX: ReturnType<typeof useSpring>;
    parallaxY: ReturnType<typeof useSpring>;
    reduceMotion: boolean;
}

function FloatingCard({ slot, slotIndex, product, onClick, parallaxX, parallaxY, reduceMotion }: FloatingCardProps) {
    const [hovered, setHovered] = useState(false);
    const validImages = product.images.filter(Boolean);
    const fallback = resolveProductPlaceholder(product.category);
    const src = validImages[0] || fallback;

    const { isSoldOut, hasDiscount, formattedPrice, formattedSalePrice } = useProductMetadata(product);

    // Parallax translation: scale by depth and a max pixel offset.
    const PARALLAX_PX = 14;
    const tx = useTransform(parallaxX, (v) => v * PARALLAX_PX * slot.depth);
    const ty = useTransform(parallaxY, (v) => v * PARALLAX_PX * slot.depth);

    // Drift duration varies per slot for organic feel.
    const driftDuration = 6 + (slotIndex % 4);

    const ribbonColor = slot.side === "right" ? "#c95f7b" : "#E7A3B0";
    const showRibbon = hasDiscount || product.isNewArrival || isSoldOut;
    const ribbonLabel = isSoldOut ? "Sold" : hasDiscount ? "Sale" : "New";

    const priceText = hasDiscount && formattedSalePrice ? formattedSalePrice : formattedPrice;

    return (
        <motion.div
            className="absolute"
            style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                x: reduceMotion ? 0 : tx,
                y: reduceMotion ? 0 : ty,
            }}
            animate={
                reduceMotion
                    ? undefined
                    : {
                          translateY: ["0px", "-6px", "0px"],
                      }
            }
            transition={
                reduceMotion
                    ? undefined
                    : {
                          duration: driftDuration,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: (slotIndex % 5) * 0.4,
                      }
            }
        >
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                aria-label={`View details for ${product.name}`}
                className={cn(
                    "group relative block h-full w-full overflow-hidden rounded-[14px] border border-white/70 bg-[#f7eef1] shadow-[0_10px_28px_rgba(18,18,18,0.14),0_2px_8px_rgba(231,163,176,0.18)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7A3B0] focus-visible:ring-offset-2",
                    hovered && "z-20 scale-[1.06] shadow-[0_22px_46px_rgba(18,18,18,0.22),0_10px_22px_rgba(231,163,176,0.28)]",
                )}
            >
                <Image
                    src={src}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1280px) 14vw, 180px"
                    className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.08]", isSoldOut && "grayscale-[0.3]")}
                />

                {/* Corner ribbon */}
                {showRibbon && (
                    <div
                        className="absolute left-0 top-2 z-10 rounded-r-[4px] px-1.5 py-0.5 shadow-md"
                        style={{ backgroundColor: isSoldOut ? "#121212" : ribbonColor }}
                    >
                        <span className="font-oswald text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
                            {ribbonLabel}
                        </span>
                    </div>
                )}

                {/* Hover overlay: name + price */}
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent p-2 text-white opacity-0 transition-opacity duration-300",
                        hovered && "opacity-100",
                    )}
                >
                    <p className="line-clamp-2 font-playfair-display text-[11px] leading-tight">
                        {product.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="font-oswald text-[12px] font-bold tracking-[0.04em]">
                            {priceText}
                        </span>
                        <ArrowUpRight className="h-3 w-3" />
                    </div>
                </div>
            </button>
        </motion.div>
    );
}

/* ------------------------------ MOBILE --------------------------------- */

interface MobileProps {
    newArrivals: Product[];
    saleProducts: Product[];
    onProductClick?: (product: Product) => void;
    onViewAllNew?: () => void;
    onViewAllSale?: () => void;
}

function MobileStrips({
    newArrivals,
    saleProducts,
    onProductClick,
    onViewAllNew,
    onViewAllSale,
}: MobileProps) {
    return (
        <div className="flex flex-col gap-10">
            <MobileStrip
                eyebrow="Curated For You"
                title="New Arrivals"
                accent="rose"
                products={newArrivals}
                onProductClick={onProductClick}
                onViewAll={onViewAllNew}
                emptyMessage="No new arrivals yet."
            />
            <MobileStrip
                eyebrow="Limited Time"
                title="On Sale"
                accent="amber"
                products={saleProducts}
                onProductClick={onProductClick}
                onViewAll={onViewAllSale}
                emptyMessage="No sale items right now."
            />
        </div>
    );
}

interface MobileStripProps {
    eyebrow: string;
    title: string;
    accent: "rose" | "amber";
    products: Product[];
    onProductClick?: (product: Product) => void;
    onViewAll?: () => void;
    emptyMessage: string;
}

function MobileStrip({ eyebrow, title, accent, products, onProductClick, onViewAll, emptyMessage }: MobileStripProps) {
    const accentText = accent === "amber" ? "text-[#b86a36]" : "text-[#c95f7b]";

    return (
        <div className="w-full">
            <div className="mb-4 flex items-end justify-between px-4 md:px-12">
                <div>
                    <p className={cn("font-oswald text-[10px] font-semibold uppercase tracking-[0.28em]", accentText)}>
                        {eyebrow}
                    </p>
                    <h3 className="mt-1 font-playfair-display text-2xl text-[#121212]">{title}</h3>
                </div>
                {onViewAll && (
                    <button
                        type="button"
                        onClick={onViewAll}
                        className={cn("inline-flex items-center gap-1 font-oswald text-[10px] font-semibold uppercase tracking-[0.24em]", accentText)}
                    >
                        View All
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {products.length === 0 ? (
                <div className="mx-4 rounded-2xl border border-dashed border-[#E7A3B0]/40 bg-white/60 py-10 text-center font-montserrat text-xs text-[#8b7580] md:mx-12">
                    {emptyMessage}
                </div>
            ) : (
                <div
                    className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:scroll-px-12 md:px-12"
                    style={{ scrollbarWidth: "none" }}
                >
                    {products.map((p) => (
                        <div key={p.id} className="w-[60vw] max-w-[260px] flex-none snap-start sm:w-[40vw]">
                            <ProductCard product={p} onClick={() => onProductClick?.(p)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
