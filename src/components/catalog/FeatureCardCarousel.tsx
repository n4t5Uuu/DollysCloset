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

export default function FeatureCardCarousel({ products, onProductClick }: FeatureCardCarouselProps) {
    const [centerIndex, setCenterIndex] = useState(0);

    const featuredProducts = useMemo(() => products.slice(0, 5), [products]);

    useEffect(() => {
        if (featuredProducts.length <= 1) return;

        const interval = setInterval(() => {
            setCenterIndex((prev) => (prev + 1) % featuredProducts.length);
        }, 3200);

        return () => clearInterval(interval);
    }, [featuredProducts.length]);



    const getSafeProduct = (index: number) => {
        const length = featuredProducts.length;
        if (length === 0) return null;
        return featuredProducts[(index + length) % length];
    };

    const previousProduct = getSafeProduct(centerIndex - 1);
    const centerProduct = getSafeProduct(centerIndex);
    const nextProduct = getSafeProduct(centerIndex + 1);

    const goPrevious = () => {
        setCenterIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    };

    const goNext = () => {
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

    const cardsToRender = [
        { slot: "left", product: previousProduct, opacity: 0.45, scale: 0.9 },
        { slot: "center", product: centerProduct, opacity: 1, scale: 1 },
        { slot: "right", product: nextProduct, opacity: 0.45, scale: 0.9 },
    ] as const;

    return (
        <div className="w-full max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-center gap-6 md:gap-8">
                <button
                    type="button"
                    onClick={goPrevious}
                    className="h-10 w-10 rounded-full border border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5] transition-colors cursor-pointer"
                    aria-label="Previous featured product"
                >
                    <ChevronLeft className="h-5 w-5 mx-auto" />
                </button>

                <div className="grid grid-cols-3 items-center gap-4 md:gap-8 w-full max-w-[1050px]">
                    {cardsToRender.map((item) => {
                        if (!item.product) return <div key={item.slot} className="h-[300px]" />;

                        return (
                            <AnimatePresence key={item.slot} mode="wait">
                                <motion.button
                                    key={`${item.slot}-${item.product.id}-${centerIndex}`}
                                    type="button"
                                    onClick={() => item.product && onProductClick?.(item.product)}
                                    initial={{ opacity: 0, x: item.slot === "left" ? -20 : item.slot === "right" ? 20 : 0 }}
                                    animate={{ opacity: item.opacity, x: 0, scale: item.scale }}
                                    exit={{ opacity: 0, x: item.slot === "left" ? 20 : item.slot === "right" ? -20 : 0 }}
                                    transition={{ duration: 0.45, ease: "easeInOut" }}
                                    className={`text-left ${item.slot === "center" ? "cursor-pointer" : "cursor-default"}`}
                                >
                                    <div className="aspect-3/4 w-full bg-[#f5f5f5] rounded-xl relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                                        <Image
                                            src={item.product.images[0] || resolveProductPlaceholder(item.product.category)}
                                            alt={item.product.name}
                                            fill
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