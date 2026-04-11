"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { cn, type Product, resolveProductPlaceholder, useProductMetadata } from "@dollys-closet/core";

import ProductCard from "./ProductCard";

type Accent = "rose" | "amber";

interface EditorialShowcaseProps {
    eyebrow: string;
    title: string;
    description?: string;
    products: Product[];
    accent?: Accent;
    viewAllHref?: string;
    onViewAll?: () => void;
    onProductClick?: (product: Product) => void;
    emptyMessage?: string;
    heroLabel?: string;
}

const ACCENT_TOKENS: Record<Accent, {
    text: string;
    sectionBg: string;
    ribbonBg: string;
}> = {
    rose: {
        text: "text-[#c95f7b]",
        sectionBg: "bg-linear-to-b from-white to-[#fff0f5]/60",
        ribbonBg: "#c95f7b",
    },
    amber: {
        text: "text-[#b86a36]",
        sectionBg: "bg-linear-to-b from-white to-[#fff5ec]/70",
        ribbonBg: "#b86a36",
    },
};

export default function EditorialShowcase({
    eyebrow,
    title,
    description,
    products,
    accent = "rose",
    viewAllHref,
    onViewAll,
    onProductClick,
    emptyMessage = "Nothing here yet — check back soon.",
    heroLabel = "Featured",
}: EditorialShowcaseProps) {
    const tokens = ACCENT_TOKENS[accent];
    const hero = products[0];
    const satellites = products.slice(1, 5);

    return (
        <section className={cn("w-full py-16 sm:py-20", tokens.sectionBg)}>
            <div className="mx-auto w-full max-w-7xl px-4 md:px-12">
                <SectionHeader
                    eyebrow={eyebrow}
                    title={title}
                    description={description}
                    accentText={tokens.text}
                    viewAllHref={viewAllHref}
                    onViewAll={onViewAll}
                />

                {!hero ? (
                    <div className="mt-10 rounded-2xl border border-dashed border-[#E7A3B0]/40 bg-white/60 py-16 text-center font-montserrat text-sm text-[#8b7580]">
                        {emptyMessage}
                    </div>
                ) : (
                    <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                        <div className="lg:col-span-7">
                            <HeroCard
                                product={hero}
                                onClick={() => onProductClick?.(hero)}
                                ribbonBg={tokens.ribbonBg}
                                heroLabel={heroLabel}
                            />
                        </div>

                        <div className="lg:col-span-5">
                            <div className="grid grid-cols-2 gap-4 sm:gap-5">
                                {satellites.map((p) => (
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        onClick={() => onProductClick?.(p)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

interface SectionHeaderProps {
    eyebrow: string;
    title: string;
    description?: string;
    accentText: string;
    viewAllHref?: string;
    onViewAll?: () => void;
}

function SectionHeader({ eyebrow, title, description, accentText, viewAllHref, onViewAll }: SectionHeaderProps) {
    const hasViewAll = Boolean(viewAllHref || onViewAll);
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
                <p className={cn("font-oswald text-[11px] font-semibold uppercase tracking-[0.32em]", accentText)}>
                    {eyebrow}
                </p>
                <h2 className="font-playfair-display text-4xl text-[#121212] sm:text-5xl">
                    {title}
                </h2>
                {description && (
                    <p className="max-w-xl font-montserrat text-sm leading-relaxed text-[#6f5058]">
                        {description}
                    </p>
                )}
            </div>
            {hasViewAll && (
                <a
                    href={viewAllHref || "#"}
                    onClick={(e) => {
                        if (onViewAll) {
                            e.preventDefault();
                            onViewAll();
                        }
                    }}
                    className={cn(
                        "group inline-flex items-center gap-2 self-start font-oswald text-[11px] font-semibold uppercase tracking-[0.28em] sm:self-end",
                        accentText
                    )}
                >
                    View All
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
            )}
        </div>
    );
}

interface HeroCardProps {
    product: Product;
    onClick?: () => void;
    ribbonBg: string;
    heroLabel: string;
}

function HeroCard({ product, onClick, ribbonBg, heroLabel }: HeroCardProps) {
    const validImages = product.images.filter(Boolean);
    const fallback = resolveProductPlaceholder(product.category);
    const heroSrc = validImages[0] || fallback;

    const {
        isSoldOut,
        hasDiscount,
        formattedPrice,
        formattedSalePrice,
        formattedOriginalPrice,
    } = useProductMetadata(product);

    const ribbonLabel = isSoldOut
        ? "Sold Out"
        : hasDiscount
            ? "On Sale"
            : product.isNewArrival
                ? "Just In"
                : null;

    return (
        <a
            href="#"
            aria-label={`View details for ${product.name}`}
            onClick={(e) => {
                e.preventDefault();
                onClick?.();
            }}
            className="group relative block h-full w-full overflow-hidden rounded-[1.6rem] border border-[#f1e1e6] bg-[#f7eef1] shadow-[0_18px_46px_rgba(18,18,18,0.14)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(18,18,18,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7A3B0] focus-visible:ring-offset-4"
        >
            <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                    src={heroSrc}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 56vw"
                    className={cn(
                        "object-cover transition-transform duration-700 group-hover:scale-[1.04]",
                        isSoldOut && "grayscale-[0.3]"
                    )}
                    priority
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 via-black/35 to-transparent" />

                {ribbonLabel && (
                    <div
                        className="absolute left-0 top-5 z-10 flex items-center justify-center rounded-r-[6px] px-3 py-1.5 shadow-[0_4px_14px_rgba(18,18,18,0.28)]"
                        style={{ backgroundColor: ribbonBg }}
                    >
                        <span className="font-oswald text-[12px] font-semibold uppercase tracking-[0.22em] text-white">
                            {ribbonLabel}
                        </span>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <p className="font-oswald text-[10px] font-semibold uppercase tracking-[0.32em] text-white/75">
                        {heroLabel}
                    </p>
                    <h3 className="mt-2 line-clamp-2 font-playfair-display text-2xl leading-tight sm:text-3xl">
                        {product.name}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-3">
                        {hasDiscount && formattedSalePrice ? (
                            <>
                                <p className="font-oswald text-2xl font-bold tracking-[0.04em] text-white">
                                    {formattedSalePrice}
                                </p>
                                <p className="font-oswald text-sm tracking-[0.18em] text-white/60 line-through">
                                    {formattedOriginalPrice}
                                </p>
                            </>
                        ) : (
                            <p className="font-oswald text-2xl font-bold tracking-[0.04em] text-white">
                                {formattedPrice}
                            </p>
                        )}
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 font-oswald text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                        Discover
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>
        </a>
    );
}
