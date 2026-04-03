"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import FeatureCardCarousel from "@/components/catalog/FeatureCardCarousel";
import CustomPagination from "@/components/general-components/CustomPagination";
import SearchBar from "@/components/general-components/SearchBar";
import CatalogSidebar from "@/components/sidebar/CatalogSidebar";
import ProductCard from "@/components/catalog/ProductCard";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { InView } from "@/components/motion-primitives/in-view";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PackageSearch, Filter, RefreshCw, X } from "lucide-react";
import { ANNOUNCEMENT_SLUG } from "@/lib/business-details/business-details";
import { type CatalogApiProduct, type CatalogCategory, type Product } from "@/types/product.types";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
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

const COLLECTION_ROUTE = "/collection";

function buildCollectionPath(searchParams: URLSearchParams) {
    const query = searchParams.toString();
    return query ? `${COLLECTION_ROUTE}?${query}` : COLLECTION_ROUTE;
}

function parseOptionalNumber(value: string | null) {
    if (value === null || value.trim() === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getItemsPerPage(viewportWidth: number) {
    if (viewportWidth >= 1536) return 18;
    if (viewportWidth >= 1280) return 15;
    if (viewportWidth >= 768) return 12;
    return 8;
}

function formatPriceLabel(value: number) {
    const hasCents = !Number.isInteger(value);
    return `\u20B1${value.toLocaleString(undefined, {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    })}`;
}

export default function Catalog() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname() || COLLECTION_ROUTE;

    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const activeFilter = searchParams.get("filter") ?? "all";
    const sortBy = searchParams.get("sort") ?? "newest";
    const searchQuery = searchParams.get("q") ?? "";
    const minPriceParam = parseOptionalNumber(searchParams.get("minPrice"));
    const maxPriceParam = parseOptionalNumber(searchParams.get("maxPrice"));
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    const updateCollectionParams = useCallback((updates: Record<string, string | null>) => {
        const nextParams = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "") {
                nextParams.delete(key);
                return;
            }

            nextParams.set(key, value);
        });

        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const handlePageChange = useCallback((page: number) => {
        updateCollectionParams({ page: page <= 1 ? null : String(page) });
    }, [updateCollectionParams]);

    const handleFilterChange = useCallback((filter: string) => {
        updateCollectionParams({
            filter: filter === "all" ? null : filter,
            page: null,
        });
    }, [updateCollectionParams]);

    const handleSortChange = useCallback((sort: string) => {
        updateCollectionParams({
            sort: sort === "newest" ? null : sort,
            page: null,
        });
    }, [updateCollectionParams]);

    const handleSearchChange = useCallback((query: string) => {
        updateCollectionParams({
            q: query.trim() ? query : null,
            page: null,
        });
    }, [updateCollectionParams]);

    const clearSearch = useCallback(() => {
        updateCollectionParams({
            q: null,
            page: null,
        });
    }, [updateCollectionParams]);

    const clearFilter = useCallback(() => {
        updateCollectionParams({
            filter: null,
            page: null,
        });
    }, [updateCollectionParams]);

    const clearSort = useCallback(() => {
        updateCollectionParams({
            sort: null,
            page: null,
        });
    }, [updateCollectionParams]);

    const clearPrice = useCallback(() => {
        updateCollectionParams({
            minPrice: null,
            maxPrice: null,
            page: null,
        });
    }, [updateCollectionParams]);

    const clearBrowseState = useCallback(() => {
        updateCollectionParams({
            filter: null,
            q: null,
            sort: null,
            minPrice: null,
            maxPrice: null,
            page: null,
        });
    }, [updateCollectionParams]);

    const handleProductNavigation = useCallback((productId: string) => {
        const fromPath = buildCollectionPath(new URLSearchParams(searchParams.toString()));
        const productPath = `/product/${productId}?from=${encodeURIComponent(fromPath)}`;
        router.push(productPath);
    }, [router, searchParams]);

    const handleProductCardClick = useCallback((product: CatalogApiProduct) => {
        handleProductNavigation(product.id);
    }, [handleProductNavigation]);

    const handleFeaturedProductClick = useCallback((product: Product) => {
        handleProductNavigation(product.id);
    }, [handleProductNavigation]);

    const handleProductCopy = useCallback((product: CatalogApiProduct) => toViewProduct(product), []);

    const normalizeCategoryName = (value: string) => value.trim().toLowerCase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [announcementText, setAnnouncementText] = useState<string | null>(null);

    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [products, setProducts] = useState<CatalogApiProduct[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<CatalogApiProduct[]>([]);

    const fetchCatalog = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    useEffect(() => {
        const updateItemsPerPage = () => {
            setItemsPerPage(getItemsPerPage(window.innerWidth));
        };

        updateItemsPerPage();
        window.addEventListener("resize", updateItemsPerPage);

        return () => {
            window.removeEventListener("resize", updateItemsPerPage);
        };
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

    const rootCategoryLabelsByName = useMemo(() => {
        return categories.reduce<Map<string, string>>((acc, category) => {
            if (category.parent_category !== null) return acc;

            const normalizedName = normalizeCategoryName(category.category_name);
            if (!acc.has(normalizedName)) {
                acc.set(normalizedName, category.category_name);
            }

            return acc;
        }, new Map<string, string>());
    }, [categories]);

    const categoryById = useMemo(() => {
        return categories.reduce<Map<number, CatalogCategory>>((acc, category) => {
            acc.set(Number(category.category_id), category);
            return acc;
        }, new Map<number, CatalogCategory>());
    }, [categories]);

    const priceBounds = useMemo(() => {
        if (products.length === 0) {
            return { min: 0, max: 0 };
        }

        const prices = products.map((product) => product.price);
        return {
            min: Math.floor(Math.min(...prices)),
            max: Math.ceil(Math.max(...prices)),
        };
    }, [products]);

    const selectedPriceRange = useMemo(() => {
        const minBound = priceBounds.min;
        const maxBound = priceBounds.max;

        if (products.length === 0) {
            return { min: 0, max: 0 };
        }

        const fallbackMin = minBound;
        const fallbackMax = maxBound;
        const nextMin = minPriceParam === null ? fallbackMin : Math.min(Math.max(minPriceParam, minBound), maxBound);
        const nextMax = maxPriceParam === null ? fallbackMax : Math.max(Math.min(maxPriceParam, maxBound), minBound);

        return nextMin <= nextMax
            ? { min: nextMin, max: nextMax }
            : { min: nextMax, max: nextMin };
    }, [maxPriceParam, minPriceParam, priceBounds.max, priceBounds.min, products.length]);

    const hasActivePriceFilter = useMemo(() => {
        if (products.length === 0) return false;
        return selectedPriceRange.min > priceBounds.min || selectedPriceRange.max < priceBounds.max;
    }, [priceBounds.max, priceBounds.min, products.length, selectedPriceRange.max, selectedPriceRange.min]);

    const handlePriceRangeChange = useCallback((nextMinPrice: number, nextMaxPrice: number) => {
        const clampedMin = Math.max(priceBounds.min, Math.min(nextMinPrice, nextMaxPrice));
        const clampedMax = Math.min(priceBounds.max, Math.max(nextMinPrice, nextMaxPrice));

        updateCollectionParams({
            minPrice: clampedMin <= priceBounds.min ? null : String(clampedMin),
            maxPrice: clampedMax >= priceBounds.max ? null : String(clampedMax),
            page: null,
        });
    }, [priceBounds.max, priceBounds.min, updateCollectionParams]);

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

        if (products.length > 0) {
            list = list.filter((product) => {
                return product.price >= selectedPriceRange.min && product.price <= selectedPriceRange.max;
            });
        }

        if (sortBy === "price-low") {
            list.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
            list.sort((a, b) => b.price - a.price);
        } else if (sortBy === "az") {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "za") {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else {
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return list;
    }, [products, activeFilter, sortBy, rootCategoryIdsByName, searchQuery, collectDescendantCategoryIds, selectedPriceRange.max, selectedPriceRange.min]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedProducts = filteredProducts.slice(
        (safePage - 1) * itemsPerPage,
        safePage * itemsPerPage
    );
    const visibleItemStart = filteredProducts.length === 0
        ? 0
        : (safePage - 1) * itemsPerPage + 1;
    const visibleItemEnd = filteredProducts.length === 0
        ? 0
        : visibleItemStart + paginatedProducts.length - 1;

    const featuredViewProducts = featuredProducts.map(toViewProduct);
    const isBrowsingFiltered = activeFilter !== "all" || searchQuery.trim() !== "" || sortBy !== "newest" || hasActivePriceFilter;
    const newArrivalCount = useMemo(() => products.filter((product) => product.isNewArrival).length, [products]);

    const categoryProductCounts = useMemo(() => {
        const counts: Record<number, number> = {};

        categories.forEach((category) => {
            const categoryId = Number(category.category_id);
            const descendantIds = collectDescendantCategoryIds(categoryId);
            counts[categoryId] = products.reduce((total, product) => {
                return total + (descendantIds.has(product.categoryId) ? 1 : 0);
            }, 0);
        });

        return counts;
    }, [categories, products, collectDescendantCategoryIds]);

    const rootGroupProductCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        rootCategoryIdsByName.forEach((rootIds, rootKey) => {
            const validCategoryIds = new Set<number>();

            rootIds.forEach((rootId) => {
                const descendantIds = collectDescendantCategoryIds(rootId);
                descendantIds.forEach((descendantId) => validCategoryIds.add(descendantId));
            });

            counts[rootKey] = products.reduce((total, product) => {
                return total + (validCategoryIds.has(product.categoryId) ? 1 : 0);
            }, 0);
        });

        return counts;
    }, [collectDescendantCategoryIds, products, rootCategoryIdsByName]);

    const activeFilterLabel = useMemo(() => {
        if (activeFilter === "all") return null;
        if (activeFilter === "new") return "New Arrivals";

        if (activeFilter.startsWith("root-")) {
            const rootKey = activeFilter.replace("root-", "");
            return rootCategoryLabelsByName.get(rootKey) ?? "Category";
        }

        if (activeFilter.startsWith("category-")) {
            const categoryId = Number(activeFilter.replace("category-", ""));
            const category = categoryById.get(categoryId);
            if (!category) return "Category";

            const path: string[] = [category.category_name];
            let parentId = category.parent_category;
            const visited = new Set<number>([categoryId]);

            while (parentId !== null) {
                if (visited.has(parentId)) break;
                visited.add(parentId);

                const parent = categoryById.get(parentId);
                if (!parent) break;

                path.unshift(parent.category_name);
                parentId = parent.parent_category;
            }

            return path.join(" > ");
        }

        return "Category";
    }, [activeFilter, categoryById, rootCategoryLabelsByName]);

    const activeSortLabel = useMemo(() => {
        const sortLabels: Record<string, string> = {
            newest: "Newest First",
            "price-low": "Price: Low to High",
            "price-high": "Price: High to Low",
            az: "Name: A to Z",
            za: "Name: Z to A",
        };

        return sortLabels[sortBy] ?? "Newest First";
    }, [sortBy]);

    const activeBrowseChips = [
        searchQuery.trim()
            ? { key: "search", label: `Search: "${searchQuery.trim()}"`, onRemove: clearSearch }
            : null,
        activeFilter !== "all" && activeFilterLabel
            ? { key: "filter", label: activeFilter === "new" ? `Filter: ${activeFilterLabel}` : `Category: ${activeFilterLabel}`, onRemove: clearFilter }
            : null,
        sortBy !== "newest"
            ? { key: "sort", label: `Sort: ${activeSortLabel}`, onRemove: clearSort }
            : null,
        hasActivePriceFilter
            ? {
                key: "price",
                label: `Price: ${formatPriceLabel(selectedPriceRange.min)} - ${formatPriceLabel(selectedPriceRange.max)}`,
                onRemove: clearPrice
            }
            : null,
    ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => Boolean(chip));

    const activeBrowseCount = activeBrowseChips.length;
    const browseSummaryMessage = activeBrowseCount > 0
        ? "Showing results for your current filters. Remove any chip to widen the collection."
        : "Browse the full collection or narrow it with search, category, sort, and price controls.";
    const noResultsTitle = searchQuery.trim() !== ""
        ? `No matches for "${searchQuery.trim()}"`
        : activeBrowseCount > 0
            ? "No products matched your filters"
            : "No products available right now";
    const noResultsDescription = searchQuery.trim() !== ""
        ? "Try a shorter search term, a broader category, or clear a few filters to see more products."
        : activeBrowseCount > 0
            ? "Your current filters narrowed the collection too much. Try removing one or more filters to explore more items."
            : "The collection is currently empty. Please check back later for new arrivals.";

    return (
        <main className="w-full flex flex-col items-center">

            {/* For the Announcements */}
            {announcementText && (
                <div className="w-full py-3 bg-[#E7A3B0] flex items-center justify-center">
                    <InfiniteSlider className="w-full h-full">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <h2 key={i} className="font-oswald font-medium text-[10px] md:text-sm tracking-[0.2em] text-[#121212] uppercase whitespace-nowrap">
                                {announcementText}
                            </h2>
                        ))}
                    </InfiniteSlider>
                </div>
            )}

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
                        <TextEffect as="span" per="char" preset="fade-in-blur">New Arrivals</TextEffect>
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
                    <FeatureCardCarousel products={featuredViewProducts} onProductClick={handleFeaturedProductClick} />
                )}
            </InView>

            {/* For the Collections */}
            <div className="w-full flex flex-col items-center">
                {/* Title visible on mobile only — scrolls away naturally */}
                <div className="md:hidden w-full px-4 py-3 text-center">
                    <h2 className="font-playfair-display text-xl text-[#121212]">Our Collections</h2>
                </div>

                <div className="sticky top-0 z-30 w-full bg-[#fffcfd]/95 backdrop-blur-md border-b border-[#E7A3B0]/30 shadow-sm py-3 transition-all duration-300">
                    <div className="w-full px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="hidden md:block font-playfair-display text-2xl text-[#121212]">Our Collections</h2>
                        <div className="w-full md:w-auto flex items-center gap-2 md:gap-3">
                            {/* Mobile Filter Toggle */}
                            <div className="lg:hidden shrink-0">
                                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-[#E7A3B0]/50 text-[#121212] hover:bg-[#fff0f5] h-10 px-4">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Filters
                                            {activeBrowseCount > 0 && (
                                                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#E7A3B0] px-1.5 py-0.5 font-oswald text-[10px] tracking-[0.18em] text-white">
                                                    {activeBrowseCount}
                                                </span>
                                            )}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-[300px] overflow-y-auto sm:w-[400px] bg-white text-black p-0 border-r border-[#E7A3B0]/20">
                                        <div className="p-6">
                                            <SheetHeader className="mb-6">
                                                <SheetTitle className="font-playfair-display text-2xl text-left text-black">Filter Collection</SheetTitle>
                                            </SheetHeader>
                                            <CatalogSidebar
                                                categories={categories}
                                                activeFilter={activeFilter}
                                                sortBy={sortBy}
                                                allCount={products.length}
                                                newCount={newArrivalCount}
                                                categoryCounts={categoryProductCounts}
                                                rootGroupCounts={rootGroupProductCounts}
                                                minAvailablePrice={priceBounds.min}
                                                maxAvailablePrice={priceBounds.max}
                                                selectedMinPrice={selectedPriceRange.min}
                                                selectedMaxPrice={selectedPriceRange.max}
                                                hasActivePriceFilter={hasActivePriceFilter}
                                                onFilterChange={handleFilterChange}
                                                onSortChange={handleSortChange}
                                                onPriceRangeChange={handlePriceRangeChange}
                                                onClearPrice={clearPrice}
                                                onInteractionComplete={() => setMobileFiltersOpen(false)}
                                            />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="flex-1 md:flex-none">
                                <SearchBar onSearch={handleSearchChange} initialQuery={searchQuery} />
                            </div>
                        </div>
                    </div>

                    {activeBrowseCount > 0 && (
                        <div className="w-full px-4 md:px-12 pt-1">
                            <div className="flex flex-wrap items-center gap-2 border-t border-[#E7A3B0]/15 pt-3">
                                <span className="font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88]">
                                    Active Filters
                                </span>
                                {activeBrowseChips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={chip.onRemove}
                                        className="inline-flex items-center gap-2 rounded-full border border-[#E7A3B0]/25 bg-white px-3 py-1.5 font-montserrat text-xs font-medium text-[#6f5058] transition-colors hover:bg-[#fff5f7]"
                                    >
                                        <span>{chip.label}</span>
                                        <X className="h-3.5 w-3.5 text-[#b47c88]" />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={clearBrowseState}
                                    className="inline-flex items-center rounded-full px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.24em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full px-4 md:px-12 py-12 pb-24 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12">
                    <div className="hidden lg:block h-fit sticky top-[148px]">
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
                                    allCount={products.length}
                                    newCount={newArrivalCount}
                                    categoryCounts={categoryProductCounts}
                                    rootGroupCounts={rootGroupProductCounts}
                                    minAvailablePrice={priceBounds.min}
                                    maxAvailablePrice={priceBounds.max}
                                    selectedMinPrice={selectedPriceRange.min}
                                    selectedMaxPrice={selectedPriceRange.max}
                                    hasActivePriceFilter={hasActivePriceFilter}
                                    onFilterChange={handleFilterChange}
                                    onSortChange={handleSortChange}
                                    onPriceRangeChange={handlePriceRangeChange}
                                    onClearPrice={clearPrice}
                                />
                            )}
                        </InView>
                    </div>
                    
                    <div className="w-full">
                        <div className="mb-6 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="text-xs font-bold tracking-widest text-[#E7A3B0] font-oswald uppercase">
                                        Showing {visibleItemStart}-{visibleItemEnd} of {filteredProducts.length} {filteredProducts.length === 1 ? "Item" : "Items"}
                                    </div>
                                    <p className="font-montserrat text-sm text-[#8a6b73]">
                                        {browseSummaryMessage}
                                    </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-8">
                                {Array.from({ length: itemsPerPage }).map((_, i) => (
                                    <div key={i} className="space-y-4">
                                        <Skeleton className="w-full aspect-3/4 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-1/4" />
                                            <Skeleton className="h-3 w-1/2 mt-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="w-full py-12">
                                <Empty className="border-dashed border-red-200 bg-red-50/60">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon" className="bg-red-100">
                                            <RefreshCw className="size-6 text-red-500" />
                                        </EmptyMedia>
                                        <EmptyTitle className="font-playfair-display text-2xl text-red-700">
                                            We couldn&apos;t load the collection
                                        </EmptyTitle>
                                        <EmptyDescription className="font-montserrat text-red-600">
                                            {error}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                        <Button
                                            type="button"
                                            onClick={fetchCatalog}
                                            className="bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                                        >
                                            Try again
                                        </Button>
                                        {isBrowsingFiltered && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={clearBrowseState}
                                                className="border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5]"
                                            >
                                                Reset filters
                                            </Button>
                                        )}
                                    </div>
                                </Empty>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <InView
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-8"
                            >
                                {paginatedProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={handleProductCopy(product)}
                                        href={`/product/${product.id}`}
                                        onClick={() => handleProductCardClick(product)}
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
                                        <EmptyTitle className="font-playfair-display text-2xl">{noResultsTitle}</EmptyTitle>
                                        <EmptyDescription className="font-montserrat">
                                            {noResultsDescription}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    {activeBrowseCount > 0 && (
                                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                            {activeBrowseChips.map((chip) => (
                                                <button
                                                    key={`empty-${chip.key}`}
                                                    type="button"
                                                    onClick={chip.onRemove}
                                                    className="inline-flex items-center gap-2 rounded-full border border-[#E7A3B0]/25 bg-white px-3 py-1.5 font-montserrat text-xs font-medium text-[#6f5058] transition-colors hover:bg-[#fff5f7]"
                                                >
                                                    <span>{chip.label}</span>
                                                    <X className="h-3.5 w-3.5 text-[#b47c88]" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                        <Button
                                            type="button"
                                            onClick={activeBrowseCount > 0 ? clearBrowseState : fetchCatalog}
                                            className="bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                                        >
                                            {activeBrowseCount > 0 ? "Clear all filters" : "Refresh collection"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setMobileFiltersOpen(true)}
                                            className="lg:hidden border-[#E7A3B0]/50 text-[#cc7f8f] hover:bg-[#fff0f5]"
                                        >
                                            Open filters
                                        </Button>
                                    </div>
                                </Empty>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <CustomPagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                className="mt-16"
                            />
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
