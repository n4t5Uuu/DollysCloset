"use client"

// UI Components
import {
    Carousel, 
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { useEffect, useState, useRef }from "react";
import Autoplay from "embla-carousel-autoplay";
import {type CarouselApi} from "@/components/ui/carousel";
import { useProducts } from "@/contexts/ProductContext";
import { Product } from "@/data/product-test-data";
import Image from "next/image";

interface FeatureCardCarouselProps {
    onProductClick?: (product: Product) => void;
}

export default function FeatureCardCarousel({ onProductClick }: FeatureCardCarouselProps) {
    const { productList, catalogStatus } = useProducts();
    
    // Get only featured products
    const featuredProducts = productList.filter(
        product => catalogStatus[product.id] === "featured"
    );

    // Track the Embla API instance
    const [api, setApi] = useState<CarouselApi | null>(null);
    const [current, setCurrent] = useState(0);

    // Initialize the Autoplay plugin
    const plugin = useRef(
        Autoplay({
            delay: 3000,
            stopOnInteraction: true,
        })
    );


    useEffect(() => {
        // If the api has no value, then return nothing
        if (!api)
            return;

        const onScroll = () => {
            const scrollProgress = api.scrollProgress();
            const snaps = api.scrollSnapList();

            api.slideNodes().forEach((node, index) => {
                // It calculates the distance of this slide from the center
                // Embla gives a value between 0 and 1 for the progress
                const snap = snaps[index];
                const distance = Math.abs(scrollProgress - snap);

                // This lets the slides scale down as it gets further away from the center
                // 1 is the full size and 0.2 is the scaling factor
                // Slides that are very close to the distance of 0 will have a scale of 1
                let scale = 1 - distance * 0.1;

                // This clamps the scale so it doesn't get too small
                scale = Math.max(0.7, scale);

                // It applies the style directly for smooth performance and it look for he inner
                // card/container to transform
                const innerContent = node.querySelector('.feature-card-inner') as HTMLElement;
                if(innerContent) {
                    innerContent.style.transform = `scale(${scale})`;
                }
            });
        }

        // Listens anything relate to scroll events
        api.on("scroll", onScroll);
        api.on("reInit", onScroll);
        api.on("settle", onScroll); // Trigger when movement stops
        api.on("select", onScroll); // Trigger when a new slide is selected

        // Runs to function to set the initial state
        onScroll();

        // Cleanup function
        return () => {
            api.off("scroll", onScroll);
            api.off("reInit", onScroll);
        }
    }, [api]);

    // If no featured products, show placeholder message
    if (featuredProducts.length === 0) {
        return (
            <div className="w-full max-w-[1400px] mx-auto py-12 text-center">
                <p className="text-gray-500 font-montserrat">No featured products yet</p>
            </div>
        );
    }

    return (
        <Carousel
            setApi={setApi}
            plugins={[plugin.current]}
            className="w-full max-w-[1400px] mx-auto"
            opts={{
                align: "center",
                loop: featuredProducts.length > 1
            }}
        >
            <CarouselContent className="ml-4">
                {featuredProducts.map((product) => (
                    <CarouselItem 
                        key={product.id}
                        className="pl-4 basis-1/2 md:basis-1/5"
                    >
                        <div className="p-1">
                            <div className="feature-card-inner transition-transform duration-0 ease-out">
                                <Card 
                                    className="border-0 shadow-md group overflow-hidden bg-muted/20 cursor-pointer"
                                    onClick={() => onProductClick?.(product)}
                                >
                                    <CardContent className="flex aspect-square items-center justify-center p-0 relative 
                                        text-mute-foreground/50 hover:text-primary/80 transition-colors">
                                        <div className="h-full w-full bg-primary/20 flex items-center justify-center relative overflow-hidden">
                                            <Image
                                                src={product.images[0] || "/placeholder.png"}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-[#e7a3b0ed] p-3">
                                                <p className="text-sm font-bold text-black/90 line-clamp-1">{product.name}</p>
                                                <p className="text-xs text-black/80 font-oswald">₱{product.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="cursor-pointer hover:bg-[#E679A3]"/>
            <CarouselNext className="cursor-pointer hover:bg-[#E679A3]"/>
        </Carousel>
    )
}