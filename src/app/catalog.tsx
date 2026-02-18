"use client";

import { useState } from "react";
import Image from "next/image";

import FeatureCardCarousel from "@/components/catalog/feature-card-carousel";
import SearchBar from "@/components/search-bar";
import CatalogSidebar from "@/components/catalog/catalog-sidebar";
import ProductCard from "@/components/catalog/product-card";
import ProductModal from "@/components/catalog/product-modal";
import { useProducts } from "@/contexts/ProductContext";
import { Product } from "@/types/types";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";

export default function CatalogPage() {
    const { productList, catalogStatus } = useProducts();
    const [activeFilter, setActiveFilter] = useState("All Products");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Get only published products (featured and standard, exclude unlisted)
    let publishedProducts = productList.filter(
        product => catalogStatus[product.id] !== "unlisted"
    );

    // Apply category/type filtering
    if (activeFilter === "New Arrivals") {
        publishedProducts = publishedProducts.filter(product => product.isNewArrival);
    } else if (activeFilter !== "All Products") {
        // Check if it's a main category (Men Tops, Women Tops, etc.) or a subcategory (Teenagers, Long Sleeves, etc.)
        publishedProducts = publishedProducts.filter(product => 
            product.category === activeFilter || product.type === activeFilter
        );
    }

    // Apply sorting
    if (sortBy === "price-low") {
        publishedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
        publishedProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
        publishedProducts.sort((a, b) => Number(b.id) - Number(a.id));
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
        <main className="space-y-12 w-full flex flex-col items-center">

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
            <div className="w-full flex items-center justify-center flex-col py-12 bg-linear-to-b from-white to-[#fff0f5]/50">
                <div className="text-center mb-10 space-y-3">
                    <p className="font-oswald text-xs font-bold tracking-[0.3em] text-[#E7A3B0] uppercase">
                        Curated For You
                    </p>
                    <h3 className="text-[#121212] font-playfair-display text-5xl mb-4">
                        Featured Collection
                    </h3>
                </div>
                <FeatureCardCarousel onProductClick={handleProductClick} />
            </div>

            {/* For the Collections */}
            <div className="w-full flex flex-col items-center">
                <div className="sticky top-[80px] z-30 w-full bg-[#fffcfd]/95 backdrop-blur-md border-b border-[#E7A3B0]/30 shadow-sm py-6 transition-all duration-300">
                    <div className="w-full px-8 md:px-12 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="space-y-1">
                            <p className="font-oswald text-xs font-bold tracking-[0.3em] text-[#E7A3B0] uppercase mb-1">
                                Explore
                            </p>
                            <h2 className="font-playfair-display text-5xl text-[#121212]">
                                Our Collections
                            </h2>
                        </div>
                        <div className="w-full md:w-auto pb-1">
                            <SearchBar />
                        </div>
                    </div>
                </div>

                <div className="w-full px-8 md:px-12 py-12 pb-24 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12">
                    <div className="hidden lg:block h-fit sticky top-[240px]">
                        <CatalogSidebar activeFilter={activeFilter} sortBy={sortBy} onFilterChange={setActiveFilter} onSortChange={setSortBy} />
                    </div>
                    
                    <div className="w-full">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="text-xs font-bold tracking-widest text-[#E7A3B0] font-oswald uppercase">
                                {publishedProducts.length} Items Found
                            </div>
                            
                            {/* Mobile Filter Toggle could go here */}
                        </div>

                        {publishedProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-x-6 gap-y-12">
                                {publishedProducts.map((product) => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product}
                                        onClick={() => handleProductClick(product)}
                                    />
                                ))}
                            </div>
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