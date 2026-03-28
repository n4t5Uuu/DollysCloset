"use client"
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/types/product.types";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveProductPlaceholder } from "@/lib/product-placeholder";

interface FeatureCardCarouselProps {
    products: Product[];
    onProductClick?: (product: Product) => void;
}

const AUTO_ADVANCE_MS = 5500;

export default function FeatureCardCarousel({ products, onProductClick }: FeatureCardCarouselProps) {
    const [centerIndex, setCenterIndex] = useState(0);
    const [direction, setDirection] = useState(0); // 1 for right, -1 for left
    const [visibleCount, setVisibleCount] = useState(3);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setVisibleCount(1);
            } else if (window.innerWidth < 1280) {
                setVisibleCount(3);
            } else {
                setVisibleCount(5);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const featuredProducts = useMemo(() => products.slice(0, 5), [products]);

    useEffect(() => {
        if (featuredProducts.length <= 1) return;

        const timeout = setTimeout(() => {
            setCenterIndex((prev) => (prev + 1) % featuredProducts.length);
        }, AUTO_ADVANCE_MS);

        return () => clearTimeout(timeout);
    }, [featuredProducts.length, centerIndex]);

    const getSafeProduct = (index: number) => {
        const length = featuredProducts.length;
        if (length === 0) return null;
        return featuredProducts[(index + length) % length];
    };

    const cardsToRender = [];
    const half = Math.floor(visibleCount / 2);

    for (let i = -half; i <= half; i++) {
        const product = getSafeProduct(centerIndex + i);
        const distance = Math.abs(i);
        cardsToRender.push({
            slot: `slot-${i}`,
            product,
            opacity: distance === 0 ? 1 : Math.max(0.3, 0.6 - (distance * 0.15)),
            scale: distance === 0 ? 1 : Math.max(0.75, 1 - (distance * 0.1)),
            gridOffset: i
        });
    }

    const goPrevious = () => {
        setDirection(-1);
        setCenterIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    };

    const goNext = () => {
        setDirection(1);
        setCenterIndex((prev) => (prev + 1) % featuredProducts.length);
    };

    // If no featured products, show placeholder message
    if (featuredProducts.length === 0) {
        return (
            <div className="w-full max-w-[1400px] mx-auto py-12 text-center">
                <p className="text-gray-500 font-montserrat">No featured products yet</p>
            </div>
        );
    }

    const gridColsClass = visibleCount === 1 ? "grid-cols-1" : visibleCount === 3 ? "grid-cols-3" : "grid-cols-5";

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-center gap-6 md:gap-8">
                <button
                    type="button"
                    onClick={goPrevious}
                    className="h-10 w-10 rounded-full border border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer"
                    aria-label="Previous featured product"
                >
                    <ChevronLeft className="h-5 w-5 mx-auto" />
                </button>

                <div className={`grid ${gridColsClass} items-center gap-6 md:gap-8 lg:gap-10 w-full`}>
                    {cardsToRender.map((item) => {
                        if (!item.product) return <div key={item.slot} className="h-[300px]" />;

                        return (
                            <AnimatePresence key={item.slot} mode="popLayout" initial={false}>
                                <motion.button
                                    key={`${item.slot}-${item.product.id}`}
                                    type="button"
                                    onClick={() => item.product && onProductClick?.(item.product)}
                                    initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
                                    animate={{ opacity: item.opacity, x: 0, scale: item.scale }}
                                    exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
                                    transition={{ 
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 },
                                        scale: { duration: 0.3 }
                                    }}
                                    className={`text-left w-full max-w-[280px] md:max-w-none mx-auto ${item.gridOffset === 0 ? "cursor-pointer" : "cursor-default"}`}
                                >
                                    <div className="aspect-3/4 w-full bg-[#f5f5f5] rounded-xl relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                                        <Image
                                            src={item.product.images[0] || resolveProductPlaceholder(item.product.category)}
                                            alt={item.product.name}
                                            fill
                                            sizes="(max-width: 640px) 80vw, 33vw"
                                            className="object-cover"
                                        />
                                    </div>

                                    <div className="mt-3 flex flex-col items-center text-center gap-1">
                                        <p className="font-playfair-display font-medium text-base md:text-lg text-[#121212] line-clamp-1">
                                            {item.product.name}
                                        </p>
                                        <p className="font-oswald text-sm md:text-base text-[#E7A3B0] tracking-wide">
                                            ₱{item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </motion.button>
                            </AnimatePresence>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={goNext}
                    className="h-10 w-10 rounded-full border border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer"
                    aria-label="Next featured product"
                >
                    <ChevronRight className="h-5 w-5 mx-auto" />
                </button>
            </div>
        </div>
    )
}
