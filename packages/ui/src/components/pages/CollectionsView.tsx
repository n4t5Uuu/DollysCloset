"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import MasonrySection from "../catalog/MasonrySection";
import ProductCard from "../catalog/ProductCard";
import CustomPagination from "../general-components/CustomPagination";
import SearchBar from "../general-components/SearchBar";
import CatalogSidebar from "../sidebar/CatalogSidebar";
import { InfiniteSlider } from "../motion-primitives/infinite-slider";
import { InView } from "../motion-primitives/in-view";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { PackageSearch, Filter, RefreshCw } from "lucide-react";
import { 
  ANNOUNCEMENT_SLUG,
    type CatalogPayload,
  type CatalogApiProduct, 
  type CatalogCategory, 
    type Product,
    type Season,
    safeFetchJson,
} from "@dollys-closet/core";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";

const collectionShellClass = "mx-auto w-full max-w-[1500px] px-2 sm:px-6 md:px-8 lg:px-10 xl:px-12";

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
        discount: product.discount,
        discountedPrice: product.discountedPrice,
        isOnSale: product.isOnSale,
        seasonId: product.seasonId,
        seasonName: product.seasonName,
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
    // Column counts follow the catalog grid: 2 / 3 / 3 / 4 across breakpoints.
    if (viewportWidth >= 1536) return 16; // 2xl: 4 cols × 4 rows
    if (viewportWidth >= 768) return 12;  // md/lg/xl: 3 cols × 4 rows
    return 8;                              // mobile/sm: 2 cols × 4 rows
}

function formatPriceLabel(value: number) {
    const hasCents = !Number.isInteger(value);
    return `\u20B1${value.toLocaleString(undefined, {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    })}`;
}

function MasonrySkeleton() {
    const slots = Array.from({ length: 8 });
    return (
        <section className="w-full py-8 sm:py-10">
            <div className={collectionShellClass}>
                <div className="mb-6 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-52" />
                </div>
                <div className="flex items-stretch gap-4 sm:gap-5 overflow-hidden pb-3">
                    {slots.map((_, i) => (
                        <div
                            key={i}
                            className="shrink-0 grow-0 w-[205px] min-w-[205px] sm:w-[240px] sm:min-w-[240px] md:w-[265px] md:min-w-[265px] lg:w-[285px] lg:min-w-[285px] xl:w-[300px] xl:min-w-[300px]"
                        >
                            <Skeleton className="w-full aspect-[3/4] rounded-xl" />
                            <div className="mt-3 space-y-2">
                                <Skeleton className="h-3 w-2/3" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-5 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function CollectionsView() {
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
    const [mobileVisibleCount, setMobileVisibleCount] = useState(8);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
    const hasMountedRef = useRef(false);
    // itemsPerPage === 8 means we're below the md breakpoint (< 768px)
    const isMobile = itemsPerPage === 8;

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

    const handleFeaturedProductClick = useCallback((product: Product) => {
        handleProductNavigation(product.id);
    }, [handleProductNavigation]);


    const normalizeCategoryName = (value: string) => value.trim().toLowerCase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [announcementText, setAnnouncementText] = useState<string | null>(null);

    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [products, setProducts] = useState<CatalogApiProduct[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<CatalogApiProduct[]>([]);
    const [activeSeason, setActiveSeason] = useState<Season | null>(null);

    const fetchCatalog = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error, friendlyMessage } = await safeFetchJson<{ data: CatalogPayload }>("/api/catalog");

            if (error) {
                // Use the user-friendly message for the UI
                throw new Error(friendlyMessage || "Failed to fetch catalog");
            }

            const payload = (data?.data || {}) as Partial<CatalogPayload>;
            setCategories(payload.categories || []);
            setProducts(payload.products || []);
            setFeaturedProducts(payload.featuredProducts || []);
            setActiveSeason(payload.activeSeason || null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to fetch catalog");
            setCategories([]);
            setProducts([]);
            setFeaturedProducts([]);
            setActiveSeason(null);
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
        const fetchAnnouncement = async () => {
            try {
                const { data } = await safeFetchJson<{ data: { body: string } }>(
                    `/api/business-details?slug=${ANNOUNCEMENT_SLUG}`
                );

                const rawAnnouncement = data?.data?.body;
                if (typeof rawAnnouncement === "string" && rawAnnouncement.trim()) {
                    setAnnouncementText(rawAnnouncement.trim());
                }
            } catch (err) {
                console.error("Failed to fetch announcement:", err);
            }
        };

        fetchAnnouncement();
    }, []);

    // When browse state changes, return focus to "Our Collection".
    // (We skip the first mount so initial page loads don't jump.)
    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        if (typeof document === "undefined") return;
        const el = document.getElementById("collection-grid");
        if (!el) return;

        // Defer to let layout settle (chips/sidebar/price bounds).
        const id = window.setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);

        return () => window.clearTimeout(id);
    }, [activeFilter, searchQuery, sortBy, minPriceParam, maxPriceParam, currentPage]);

    // Reset mobile infinite scroll when filters/search/sort change
    useEffect(() => {
        setMobileVisibleCount(8);
    }, [activeFilter, searchQuery, sortBy, minPriceParam, maxPriceParam]);

    // Keep a live ref so the observer callback never reads a stale hasMoreMobile
    const hasMoreMobileRef = useRef(false);
    const isSentinelIntersectingRef = useRef(false);
    const filteredCountRef = useRef(0);

    // Callback ref — React calls this the moment the sentinel mounts or unmounts,
    // so the observer always attaches even if products load after isMobile is set.
    const attachSentinel = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        sentinelNodeRef.current = node;
        if (!node || !isMobile) return;
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                isSentinelIntersectingRef.current = Boolean(entry?.isIntersecting);
                if (entry?.isIntersecting && hasMoreMobileRef.current) {
                    setMobileVisibleCount((prev) => Math.min(prev + 8, filteredCountRef.current));
                }
            },
            { threshold: 0 }
        );
        observerRef.current.observe(node);
    }, [isMobile]);

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

        // Keep bounds aligned with the price filter/sort "effective price"
        // (discountedPrice when present, otherwise regular price).
        const effectivePrice = (product: { price: number; discountedPrice?: number | null }) =>
            product.discountedPrice !== null && product.discountedPrice !== undefined
                ? product.discountedPrice
                : product.price;

        const prices = products.map((product) => effectivePrice(product));
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
        } else if (activeFilter === "on-sale") {
            list = list.filter((product) => product.isOnSale);
        } else if (activeFilter === "current-season") {
            if (activeSeason?.id) {
                list = list.filter((product) => product.seasonId === activeSeason.id);
            } else {
                list = [];
            }
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

        // Effective price = what the customer actually pays. Falls back to the
        // regular price when the product has no discount. This is what both the
        // price-range filter and the price sort should read — otherwise a product
        // marked down from ₱6000 to ₱1 would still sort as ₱6000.
        const effectivePrice = (product: { price: number; discountedPrice?: number | null }) =>
            product.discountedPrice !== null && product.discountedPrice !== undefined
                ? product.discountedPrice
                : product.price;

        if (products.length > 0) {
            list = list.filter((product) => {
                const price = effectivePrice(product);
                return price >= selectedPriceRange.min && price <= selectedPriceRange.max;
            });
        }

        if (sortBy === "price-low") {
            list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        } else if (sortBy === "price-high") {
            list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        } else if (sortBy === "az") {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "za") {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else {
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return list;
    }, [products, activeFilter, sortBy, rootCategoryIdsByName, searchQuery, collectDescendantCategoryIds, selectedPriceRange.max, selectedPriceRange.min, activeSeason?.id]);

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

    const mobileProducts = filteredProducts.slice(0, mobileVisibleCount);
    const hasMoreMobile = mobileVisibleCount < filteredProducts.length;
    useEffect(() => {
        hasMoreMobileRef.current = hasMoreMobile;
        filteredCountRef.current = filteredProducts.length;
    }, [hasMoreMobile, filteredProducts.length]);

    // If the sentinel stays visible after adding items (common when the list is short),
    // IntersectionObserver may not fire again. This ensures we load until either
    // we have everything or the sentinel scrolls out of view.
    useEffect(() => {
        if (!isMobile) return;
        if (!hasMoreMobile) return;
        if (!isSentinelIntersectingRef.current) return;

        const id = window.setTimeout(() => {
            if (hasMoreMobileRef.current && isSentinelIntersectingRef.current) {
                setMobileVisibleCount((prev) => Math.min(prev + 8, filteredCountRef.current));
            }
        }, 0);

        return () => window.clearTimeout(id);
    }, [hasMoreMobile, isMobile, mobileVisibleCount]);

    const isBrowsingFiltered = activeFilter !== "all" || searchQuery.trim() !== "" || sortBy !== "newest" || hasActivePriceFilter;
    const newArrivalCount = useMemo(() => products.filter((product) => product.isNewArrival).length, [products]);
    const saleCount = useMemo(() => products.filter((product) => product.isOnSale).length, [products]);

    const newArrivalMasonry = useMemo(() => {
        const list = products.filter((p) => p.isNewArrival).slice(0, 16);
        return (list.length > 0 ? list : featuredProducts.slice(0, 16)).map(toViewProduct);
    }, [products, featuredProducts]);

    const saleMasonry = useMemo(() => {
        return products.filter((p) => p.isOnSale).slice(0, 16).map(toViewProduct);
    }, [products]);
    const currentSeasonCount = useMemo(() => {
        if (!activeSeason?.id) return 0;
        return products.filter((product) => product.seasonId === activeSeason.id).length;
    }, [activeSeason?.id, products]);

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
        if (activeFilter === "on-sale") return "On Sale";
        if (activeFilter === "current-season") return activeSeason?.name ? `Current Season (${activeSeason.name})` : "Current Season";

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
    }, [activeFilter, categoryById, rootCategoryLabelsByName, activeSeason?.name]);

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
            ? { key: "filter", label: activeFilter === "new" || activeFilter === "on-sale" || activeFilter === "current-season" ? `Filter: ${activeFilterLabel}` : `Category: ${activeFilterLabel}`, onRemove: clearFilter }
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
        <main className="w-full flex flex-col items-center bg-[#fff5f7]">

            {/* For the Announcements */}
            {announcementText && (
                <div className="w-full py-3 bg-[#E7A3B0] flex items-center justify-center">
                    <InfiniteSlider className="w-full h-full" gap={48}>
                        {Array.from({ length: 100 }).map((_, i) => (
                            <h2 key={i} className="font-oswald font-medium text-[10px] md:text-sm tracking-[0.2em] text-[#121212] uppercase whitespace-nowrap">
                                {announcementText}
                            </h2>
                        ))}
                    </InfiniteSlider>
                </div>
            )}

            {/* Top masonry strips — New Arrivals then On Sale */}
            <InView
                variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full"
            >
                {loading ? (
                    <MasonrySkeleton />
                ) : (
                    newArrivalMasonry.length > 0 && (
                        <MasonrySection
                            title="New Arrivals"
                            subtitle="Curated For You"
                            accent="rose"
                            products={newArrivalMasonry}
                            onProductClick={handleFeaturedProductClick}
                            onViewAll={() => {
                                handleFilterChange("new");
                                if (typeof document !== "undefined") {
                                    document.getElementById("collection-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                            }}
                            emptyMessage="No new arrivals yet."
                        />
                    )
                )}
            </InView>

            <InView
                variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="w-full"
            >
                {loading ? (
                    <MasonrySkeleton />
                ) : (
                    saleMasonry.length > 0 && (
                        <MasonrySection
                            title="On Sale"
                            subtitle="Limited Time"
                            accent="amber"
                            products={saleMasonry}
                            onProductClick={handleFeaturedProductClick}
                            onViewAll={() => {
                                handleFilterChange("on-sale");
                                if (typeof document !== "undefined") {
                                    document.getElementById("collection-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                            }}
                            emptyMessage="No sale items right now."
                        />
                    )
                )}
            </InView>

            {/* For the Collections */}
            <div id="collection-grid" className="w-full flex flex-col items-center scroll-mt-24">
                {/* Minimal title strip + mobile filter trigger + active filter chips */}
                <div className="sticky top-(--navbar-h,80px) md:top-20 z-40 w-full bg-white border-b border-[#E7A3B0]/30 shadow-sm py-3 transition-[top] duration-300">
                    <div className={`${collectionShellClass} flex flex-wrap items-center justify-between gap-3 md:gap-4`}>
                        <h2 className="font-playfair-display text-xl md:text-2xl text-[#121212]">Our Collection</h2>
                        <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-1 sm:justify-end">
                            <div className="min-w-0 flex-1 sm:max-w-[280px]">
                                <SearchBar onSearch={handleSearchChange} initialQuery={searchQuery} />
                            </div>
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
                                <SheetContent side="left" className="dc-scrollbar w-[300px] overflow-y-auto sm:w-[400px] bg-white text-black p-0 border-r border-[#E7A3B0]/20">
                                    <div className="p-6">
                                        <SheetHeader className="mb-6">
                                            <SheetTitle className="font-playfair-display text-2xl text-left text-black">Filter Collection</SheetTitle>
                                        </SheetHeader>
                                        <CatalogSidebar
                                            categories={categories}
                                            activeFilter={activeFilter}
                                            sortBy={sortBy}
                                            onSortChange={handleSortChange}
                                            allCount={products.length}
                                            newCount={newArrivalCount}
                                            saleCount={saleCount}
                                            currentSeasonCount={currentSeasonCount}
                                            currentSeasonLabel={activeSeason?.name || null}
                                            categoryCounts={categoryProductCounts}
                                            rootGroupCounts={rootGroupProductCounts}
                                            minAvailablePrice={priceBounds.min}
                                            maxAvailablePrice={priceBounds.max}
                                            selectedMinPrice={selectedPriceRange.min}
                                            selectedMaxPrice={selectedPriceRange.max}
                                            hasActivePriceFilter={hasActivePriceFilter}
                                            onFilterChange={handleFilterChange}
                                            onPriceRangeChange={handlePriceRangeChange}
                                            onClearPrice={clearPrice}
                                            activeChips={activeBrowseChips}
                                            onClearAllFilters={clearBrowseState}
                                            onInteractionComplete={() => setMobileFiltersOpen(false)}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                        </div>
                    </div>

                </div>

                <div className={`${collectionShellClass} grid grid-cols-1 gap-8 pt-4 pb-16 sm:py-12 sm:pb-24 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-10`}>
                    <div className="dc-scrollbar hidden lg:block sticky top-[220px] max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain pr-2">
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
                                    onSortChange={handleSortChange}
                                    allCount={products.length}
                                    newCount={newArrivalCount}
                                    saleCount={saleCount}
                                    currentSeasonCount={currentSeasonCount}
                                    currentSeasonLabel={activeSeason?.name || null}
                                    categoryCounts={categoryProductCounts}
                                    rootGroupCounts={rootGroupProductCounts}
                                    minAvailablePrice={priceBounds.min}
                                    maxAvailablePrice={priceBounds.max}
                                    selectedMinPrice={selectedPriceRange.min}
                                    selectedMaxPrice={selectedPriceRange.max}
                                    hasActivePriceFilter={hasActivePriceFilter}
                                    onFilterChange={handleFilterChange}
                                    onPriceRangeChange={handlePriceRangeChange}
                                    onClearPrice={clearPrice}
                                    activeChips={activeBrowseChips}
                                    onClearAllFilters={clearBrowseState}
                                />
                            )}
                        </InView>
                    </div>
                    
                    <div className="w-full">
                        <div className="mb-4 sm:mb-6 flex items-center justify-between">
                            <div className="space-y-2">
                                {!isMobile && (
                                    <div className="text-xs font-bold tracking-widest text-[#E7A3B0] font-oswald uppercase">
                                        {`Showing ${visibleItemStart}–${visibleItemEnd} of ${filteredProducts.length} ${filteredProducts.length === 1 ? "Item" : "Items"}`}
                                    </div>
                                )}
                                <p className="hidden sm:block font-montserrat text-sm text-[#8a6b73]">
                                    {browseSummaryMessage}
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-x-5 sm:gap-y-8">
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
                                                variant="outline"
                                                onClick={clearBrowseState}
                                                className="border-[#E7A3B0] text-[#E7A3B0] hover:bg-red-50"
                                            >
                                                Clear all filters
                                            </Button>
                                        )}
                                    </div>
                                </Empty>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="w-full py-12">
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <PackageSearch className="size-6 text-muted-foreground" />
                                        </EmptyMedia>
                                        <EmptyTitle className="font-playfair-display text-2xl text-gray-800">
                                            {noResultsTitle}
                                        </EmptyTitle>
                                        <EmptyDescription className="font-montserrat">
                                            {noResultsDescription}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    {isBrowsingFiltered && (
                                        <div className="mt-6">
                                            <Button
                                                onClick={clearBrowseState}
                                                className="bg-[#121212] text-white hover:bg-[#2b2b2b] rounded-xl px-8"
                                            >
                                                Clear all and show full collection
                                            </Button>
                                        </div>
                                    )}
                                </Empty>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-x-5 sm:gap-y-8">
                                    {(isMobile ? mobileProducts : paginatedProducts).map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={toViewProduct(product)}
                                            href={`/product/${product.id}`}
                                            onClick={() => handleProductNavigation(product.id)}
                                        />
                                    ))}
                                </div>

                                {isMobile ? (
                                    <>
                                        {/* Sentinel — callback ref attaches the observer the moment this mounts */}
                                        <div ref={attachSentinel} className="h-1" aria-hidden="true" />
                                        {hasMoreMobile ? (
                                            <div className="flex justify-center py-6">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E7A3B0] border-t-transparent" />
                                            </div>
                                        ) : (
                                            <p className="py-6 text-center font-oswald text-[11px] uppercase tracking-[0.28em] text-[#b47c88]">
                                                — End of Collection —
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <CustomPagination
                                        totalPages={totalPages}
                                        currentPage={safePage}
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
