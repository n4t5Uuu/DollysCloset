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
            <div className="w-full h-[60px] bg-[#E7A3B0] flex items-center justify-center">
                <h2 className="!font-playfair-display font-bold text-2xl text-[#121212]">
                    ANNOUNCEMENTS HERE
                </h2>
            </div>

            {/* For the Featured Collection Carousel*/}
            <div className="w-full flex items-center justify-center flex-col">
                <h3 className="text-[#121212] !font-playfair-display font-bold text-2xl mb-8">
                    Featured Collection
                </h3>
                <FeatureCardCarousel onProductClick={handleProductClick} />
            </div>

            {/* For the Collections */}
            <div className="w-full space-y-8">
                <div className="flex justify-between items-center bg-[#E7A3B0] h-[60px] w-full px-8 sticky top-[80px] z-40 shadow-sm">
                    <h2 className="!font-playfair-display font-bold text-2xl text-[#121212]">
                        Our Collections
                    </h2>
                    <SearchBar />
                </div>

                <div className="w-full px-8 grid grid-cols-5">
                    <div className="col-span-1 sticky top-[150px] h-fit self-start">
                        <CatalogSidebar activeFilter={activeFilter} sortBy={sortBy} onFilterChange={setActiveFilter} onSortChange={setSortBy} />
                    </div>
                    <div className="col-span-4">
                        <div className="mb-2 text-sm text-gray-500 font-montserrat">
                            {publishedProducts.length} Items Found
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-10">
                            {publishedProducts.map((product) => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product}
                                    onClick={() => handleProductClick(product)}
                                />
                            ))}
                        </div>

                        <div className="mt-16 flex justify-center">
                            <button className="px-8 py-3 bg-[#E7A3B0] text-white font-medium rounded-lg font-oswald text-sm 
                                tracking-widest hover:bg-[#ca8c98] transition-colors uppercase">
                                Load More
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