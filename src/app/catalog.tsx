"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import FeatureCardCarousel from "@/components/catalog/FeatureCardCarousel";
import SearchBar from "@/components/general-components/SearchBar";
import CatalogSidebar from "@/components/sidebar/CatalogSidebar";
import ProductCard from "@/components/catalog/ProductCard";
import ProductModal from "@/components/modals/ProductModal";
import { Product } from "@/types/product.types";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { InView } from "@/components/motion-primitives/in-view";
import { Button } from "@/components/ui/button";
import { ANNOUNCEMENT_SLUG, defaultAnnouncementText } from "@/lib/business-details/business-details";
import { CatalogCategory, CatalogApiProduct } from "@/types/product.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PackageSearch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function toViewProduct(product: CatalogApiProduct): Product {
    return {
        id: product.id,
        name: product.name,
        category: product.categoryPath,
        type: product.categoryName,
        price: product.price,
        brand: product.brand,
        size: product.size,
        condition: product.condition,
        description: product.description,
        stock: product.stock,
        isNewArrival: product.isNewArrival,
        images: product.images,
    };
}

export default function Catalog() {
    const normalizeCategoryName = (value: string) => value.trim().toLowerCase();

    const [activeFilter, setActiveFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [announcementText, setAnnouncementText] = useState(defaultAnnouncementText);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [products, setProducts] = useState<CatalogApiProduct[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<CatalogApiProduct[]>([]);

    const itemsPerPage = 12;

    useEffect(() => {
        /**
         * Fetches catalog data from the backend including categories, products, and featured products.
         * Hits the /api/catalog endpoint.
         */
        const fetchCatalog = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch("/api/catalog", { cache: "no-store" });
                const result = await response.json();
                console.log('Successfully fetched catalog data:', {
                    categories: result.data?.categories?.length || 0,
                    products: result.data?.products?.length || 0,
                    featured: result.data?.featuredProducts?.length || 0
                });

                if (!response.ok) {
                    console.error('Catalog fetch error response:', result);
                    throw new Error(result.error || "Failed to fetch catalog");
                }

                setCategories(result.data?.categories || []);
                setProducts(result.data?.products || []);
                setFeaturedProducts(result.data?.featuredProducts || []);
            } catch (err: unknown) {
                console.error('CRITICAL: Error fetching catalog:', err);
                setError(err instanceof Error ? err.message : "Failed to fetch catalog");
                setCategories([]);
                setProducts([]);
                setFeaturedProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCatalog();
    }, []);

    useEffect(() => {
        /**
         * Fetches the global announcement text to display in the scrolling banner on the catalog page.
         * Hits the /api/business-details endpoint.
         */
        const fetchAnnouncement = async () => {
            try {
                const response = await fetch(`/api/business-details?slug=${ANNOUNCEMENT_SLUG}`, { cache: "no-store" });
                const result = await response.json();

                if (!response.ok) {
                    return;
                }

                const rawAnnouncement = result?.data?.body;
                if (typeof rawAnnouncement === "string" && rawAnnouncement.trim()) {
                    setAnnouncementText(rawAnnouncement.trim());
                }
            } catch {
            }
        };

        fetchAnnouncement();
    }, []);

    useEffect(() => {
        /**
         * Fetches the current user profile to enable product view tracking for authenticated users.
         */
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch("/api/auth/profile", { cache: "no-store" });
                const result = await response.json();

                if (response.ok && result.data?.userId) {
                    setCurrentUserId(result.data.userId);
                }
            } catch {
                // Silently fail - user is likely not authenticated
            }
        };

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, sortBy, searchQuery]);

    const childrenByParent = useMemo(() => {
        return categories.reduce<Map<number, number[]>>((acc, category) => {
            if (category.parent_category === null) return acc;

            const parentId = Number(category.parent_category);
            const currentChildren = acc.get(parentId) || [];
            currentChildren.push(Number(category.category_id));
            acc.set(parentId, currentChildren);
            return acc;
        }, new Map<number, number[]>());
    }, [categories]);

    const rootCategoryIdsByName = useMemo(() => {
        return categories.reduce<Map<string, number[]>>((acc, category) => {
            if (category.parent_category !== null) return acc;

            const normalizedName = normalizeCategoryName(category.category_name);
            const existingIds = acc.get(normalizedName) || [];
            existingIds.push(Number(category.category_id));
            acc.set(normalizedName, existingIds);

            return acc;
        }, new Map<string, number[]>());
    }, [categories]);

    const collectDescendantCategoryIds = useCallback((categoryId: number) => {
        const visited = new Set<number>();
        const stack: number[] = [categoryId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (currentId === undefined || visited.has(currentId)) continue;

            visited.add(currentId);
            const children = childrenByParent.get(currentId) || [];
            for (const childId of children) {
                if (!visited.has(childId)) {
                    stack.push(childId);
                }
            }
        }

        return visited;
    }, [childrenByParent]);
    
    const filteredProducts = useMemo(() => {
        let list = [...products];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter(
                (product) =>
                    product.name.toLowerCase().includes(query) ||
                    product.brand.toLowerCase().includes(query) ||
                    product.categoryName.toLowerCase().includes(query) ||
                    product.categoryPath.toLowerCase().includes(query) ||
                    product.size.toLowerCase().includes(query) ||
                    product.condition.toLowerCase().includes(query) ||
                    (product.description && product.description.toLowerCase().includes(query))
            );
        }

        if (activeFilter === "new") {
            list = list.filter((product) => product.isNewArrival);
        } else if (activeFilter.startsWith("root-")) {
            const normalizedRootName = activeFilter.replace("root-", "");
            const rootCategoryIds = rootCategoryIdsByName.get(normalizedRootName) || [];
            const validCategoryIds = new Set<number>();

            rootCategoryIds.forEach((rootCategoryId) => {
                const descendantIds = collectDescendantCategoryIds(rootCategoryId);
                descendantIds.forEach((descendantId) => validCategoryIds.add(descendantId));
            });

            list = list.filter((product) => validCategoryIds.has(product.categoryId));
        } else if (activeFilter.startsWith("category-")) {
            const categoryId = Number(activeFilter.replace("category-", ""));
            const validCategoryIds = collectDescendantCategoryIds(categoryId);
            list = list.filter((product) => validCategoryIds.has(product.categoryId));
        }

        if (sortBy === "price-low") {
            list.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
            list.sort((a, b) => b.price - a.price);
        } else {
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return list;
    }, [products, activeFilter, sortBy, rootCategoryIdsByName, searchQuery, collectDescendantCategoryIds]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const featuredViewProducts = featuredProducts.map(toViewProduct);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
        
        // Log product view for authenticated users only
        if (currentUserId) {
            fetch("/api/catalog/log-view", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: product.id, user_id: currentUserId }),
            }).catch((err) => console.error("Failed to log product view:", err));
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <main className="w-full flex flex-col items-center">

            {/* For the Announcements */}
            <div className="w-full py-3 bg-[#E7A3B0] flex items-center justify-center">
                <InfiniteSlider className="w-full h-full">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <h2 key={i} className="font-oswald font-medium text-sm tracking-[0.2em] text-[#121212] uppercase whitespace-nowrap">
                            {announcementText}
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
                {loading ? (
                    <div className="w-full max-w-6xl flex gap-6 px-4 md:px-12 overflow-hidden overflow-x-auto">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="min-w-[280px] md:min-w-[340px] flex-1 space-y-4">
                                <Skeleton className="h-[400px] w-full rounded-2xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <FeatureCardCarousel products={featuredViewProducts} onProductClick={handleProductClick} />
                )}
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
                            <SearchBar onSearch={setSearchQuery} />
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
                            {loading ? (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Skeleton className="h-5 w-1/2 mb-4" />
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <Skeleton key={i} className="h-4 w-3/4" />
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <Skeleton className="h-5 w-1/2 mb-4 mt-6" />
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                    </div>
                                </div>
                            ) : (
                                <CatalogSidebar
                                    categories={categories}
                                    activeFilter={activeFilter}
                                    sortBy={sortBy}
                                    onFilterChange={setActiveFilter}
                                    onSortChange={setSortBy}
                                />
                            )}
                        </InView>
                    </div>
                    
                    <div className="w-full">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="text-xs font-bold tracking-widest text-[#E7A3B0] font-oswald uppercase">
                                {filteredProducts.length} Items Found
                            </div>
                            
                            {/* Mobile Filter Toggle could go here */}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-6 gap-y-12">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="space-y-4">
                                        <Skeleton className="w-full aspect-[3/4] rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-1/4" />
                                            <Skeleton className="h-3 w-1/2 mt-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="w-full py-20 flex flex-col items-center justify-center text-red-500">
                                <p className="font-playfair-display text-xl italic">{error}</p>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <InView
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-x-6 gap-y-12"
                            >
                                {paginatedProducts.map((product) => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={toViewProduct(product)}
                                        onClick={() => handleProductClick(toViewProduct(product))}
                                    />
                                ))}
                            </InView>
                        ) : (
                            <div className="w-full py-12">
                                <Empty className="border-dashed border-[#E7A3B0]/20 bg-[#fffcfd]/50">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon" className="bg-[#fff0f5]">
                                            <PackageSearch className="size-6 text-[#E7A3B0]" />
                                        </EmptyMedia>
                                        <EmptyTitle className="font-playfair-display text-2xl">No products matched</EmptyTitle>
                                        <EmptyDescription className="font-montserrat">
                                            We couldn't find any pieces in our collection that match your current search or filters. 
                                            Try exploring a different category or clearing your search.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-16 flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5]"
                                >
                                    Prev
                                </Button>

                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                    <Button
                                        key={page}
                                        type="button"
                                        variant={currentPage === page ? "default" : "outline"}
                                        onClick={() => setCurrentPage(page)}
                                        className={
                                            currentPage === page
                                                ? "bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                                                : "border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5]"
                                        }
                                    >
                                        {page}
                                    </Button>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5]"
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Modal */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onExitComplete={() => setSelectedProduct(null)}
                />
            )}
        </main>
    )
}