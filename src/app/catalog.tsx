"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

import FeatureCardCarousel from "@/components/catalog/FeatureCardCarousel";
import SearchBar from "@/components/general-components/SearchBar";
import CatalogSidebar from "@/components/sidebar/CatalogSidebar";
import ProductCard from "@/components/catalog/ProductCard";
import ProductModal from "@/components/modals/ProductModal";
import { Product } from "@/types/product.types";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { InView } from "@/components/motion-primitives/in-view";

export default function Catalog() {
    const [publishedProducts, setPublishedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeFilter, setActiveFilter] = useState("All Products");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/catalog");
                const result = await res.json();

                const mappedProducts: Product[] = (result.data || []).map((dbProduct: any) => {
                    const images = dbProduct.tbl_product_image || [];
                    const primaryImg = images.find((img: any) => img.is_primary) || images[0];
                    const imageUrl = primaryImg ? primaryImg.image_url : "/images/placeholder.jpg"; 

                    return {
                        id: dbProduct.product_id,
                        name: dbProduct.product_name,
                        category: dbProduct.tbl_category?.category_name || dbProduct.category_id?.toString() || "Uncategorized", 
                        type: dbProduct.product_brand || "General",
                        price: dbProduct.product_price,
                        originalPrice: dbProduct.product_price, 
                        size: dbProduct.size_label || "OS", 
                        brand: dbProduct.product_brand || "No Brand",
                        stock: dbProduct.product_stock,
                        description: dbProduct.product_description || "No description provided.",
                        isNewArrival: false, 
                        images: [imageUrl], 
                    };
                });

                setPublishedProducts(mappedProducts);
            } catch (err) {
                console.error("Error fetching catalog", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCatalog();
    }, []);

    let displayedProducts = [...publishedProducts];

    // Apply category/type filtering
    if (activeFilter === "New Arrivals") {
        displayedProducts = displayedProducts.filter(product => product.isNewArrival);
    } else if (activeFilter !== "All Products") {
        // Map main categories to their subcategories to allow inclusive filtering
        const categoryTree: Record<string, string[]> = {
            "Men's Top": ["Men's Top", "Teenagers", "Long Sleeves", "Polo"],
            "Women's Top": ["Women's Top", "Blouses", "Tees"],
            "Coords": ["Coords", "Hoodies", "Training"],
            "Seasonal": ["Seasonal", "Jackets", "Raincoat"]
        };

        const validCategories = categoryTree[activeFilter] || [activeFilter];

        // Check if it's a main category (which includes subcategories) or a direct match
        displayedProducts = displayedProducts.filter(product => 
            validCategories.includes(product.category) || product.type === activeFilter
        );
    }

    // Apply sorting
    if (sortBy === "price-low") {
        displayedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
        displayedProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
        displayedProducts.sort((a, b) => Number(b.id) - Number(a.id));
    }

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        console.log("Selected Product: ", product)
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    return (
        <main className="w-full flex flex-col items-center">

            {/* For the Announcements */}
            <div className="w-full py-3 bg-[#E7A3B0] flex items-center justify-center">
                <InfiniteSlider className="w-full h-full">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <h2 key={i} className="font-oswald font-medium text-sm tracking-[0.2em] text-[#121212] uppercase whitespace-nowrap">
                            Free shipping on orders over ₱2,000  •  New arrivals every friday  • 
                        </h2>
                    ))}
                </InfiniteSlider>
            </div>

            {/* For the Featured Collection Carousel*/}
            <InView 
                variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full flex items-center justify-center flex-col py-12 bg-linear-to-b from-white to-[#fff0f5]/50"
            >
                <div className="text-center mb-10 space-y-3">
                    <p className="font-oswald text-xs font-bold tracking-[0.3em] text-[#E7A3B0] uppercase">
                        <TextEffect as="span" per="word" preset="fade">Curated For You</TextEffect>
                    </p>
                    <h3 className="text-[#121212] font-playfair-display text-5xl mb-4">
                        <TextEffect as="span" per="char" preset="fade-in-blur">Featured Collection</TextEffect>
                    </h3>
                </div>
                <FeatureCardCarousel onProductClick={handleProductClick} featuredProducts={publishedProducts.slice(0, 5)} />
            </InView>

            {/* For the Collections */}
            <div className="w-full flex flex-col items-center">
                <div className="sticky top-[80px] z-30 w-full bg-[#fffcfd]/95 backdrop-blur-md border-b border-[#E7A3B0]/30 shadow-sm py-6 transition-all duration-300">
                    <div className="w-full px-8 md:px-12 flex flex-col md:flex-row justify-between items-end gap-6">
                        <InView 
                            variants={{
                                hidden: { opacity: 0, x: -20 },
                                visible: { opacity: 1, x: 0 }
                            }}
                            transition={{ duration: 0.6 }}
                            className="space-y-1"
                        >
                            <p className="font-oswald text-xs font-bold tracking-[0.3em] text-[#E7A3B0] uppercase mb-1">
                                <TextEffect as="span" per="word" preset="fade">Explore</TextEffect>
                            </p>
                            <h2 className="font-playfair-display text-5xl text-[#121212]">
                                <TextEffect as="span" per="char" preset="fade-in-blur" delay={0.2}>Our Collections</TextEffect>
                            </h2>
                        </InView>
                        <InView 
                            variants={{
                                hidden: { opacity: 0, x: 20 },
                                visible: { opacity: 1, x: 0 }
                            }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full md:w-auto pb-1"
                        >
                            <SearchBar />
                        </InView>
                    </div>
                </div>

                <div className="w-full px-8 md:px-12 py-12 pb-24 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12">
                    <div className="hidden lg:block h-fit sticky top-[240px]">
                        <InView
                            variants={{
                                hidden: { opacity: 0, x: -30 },
                                visible: { opacity: 1, x: 0 }
                            }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            <CatalogSidebar activeFilter={activeFilter} sortBy={sortBy} onFilterChange={setActiveFilter} onSortChange={setSortBy} />
                        </InView>
                    </div>
                    
                    <div className="w-full">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="text-xs font-bold tracking-widest text-[#E7A3B0] font-oswald uppercase">
                                {displayedProducts.length} Items Found
                            </div>
                            
                            {/* Mobile Filter Toggle could go here */}
                        </div>

                        {displayedProducts.length > 0 ? (
                            <InView
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-x-6 gap-y-12"
                            >
                                {displayedProducts.map((product) => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product}
                                        onClick={() => handleProductClick(product)}
                                    />
                                ))}
                            </InView>
                        ) : (
                            <div className="w-full py-20 flex flex-col items-center justify-center text-gray-400">
                                <p className="font-playfair-display text-xl italic">No products found</p>
                            </div>
                        )}

                        <div className="mt-20 flex justify-center">
                            <button className="px-10 py-4 bg-white border border-[#E7A3B0] text-[#E7A3B0] hover:bg-[#E7A3B0] hover:text-white transition-all duration-300 font-oswald text-sm tracking-[0.2em] rounded-none uppercase">
                                Load More Products
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Modal */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                />
            )}
        </main>
    )
}