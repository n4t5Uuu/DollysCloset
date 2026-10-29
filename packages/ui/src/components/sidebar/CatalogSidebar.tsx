"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "../ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {cn, type CatalogCategory} from "@dollys-closet/core";

type ActiveChip = {
    key: string;
    label: string;
    onRemove: () => void;
};

const SORT_OPTIONS = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "az", label: "Name: A to Z" },
    { value: "za", label: "Name: Z to A" },
] as const;

interface CatalogSidebarProps {
    categories: CatalogCategory[];
    activeFilter: string;
    sortBy?: string;
    onSortChange?: (sort: string) => void;
    allCount: number;
    newCount: number;
    saleCount: number;
    currentSeasonCount: number;
    currentSeasonLabel: string | null;
    categoryCounts: Record<number, number>;
    rootGroupCounts: Record<string, number>;
    minAvailablePrice: number;
    maxAvailablePrice: number;
    selectedMinPrice: number;
    selectedMaxPrice: number;
    hasActivePriceFilter: boolean;
    onFilterChange: (filter: string) => void;
    onPriceRangeChange: (minPrice: number, maxPrice: number) => void;
    onClearPrice: () => void;
    activeChips?: ActiveChip[];
    onClearAllFilters?: () => void;
    onInteractionComplete?: () => void;
}

export default function CatalogSidebar({
    categories,
    activeFilter,
    sortBy = "newest",
    onSortChange,
    allCount,
    newCount,
    saleCount,
    currentSeasonCount,
    currentSeasonLabel,
    categoryCounts,
    rootGroupCounts,
    minAvailablePrice,
    maxAvailablePrice,
    selectedMinPrice,
    selectedMaxPrice,
    hasActivePriceFilter,
    onFilterChange,
    onPriceRangeChange,
    onClearPrice,
    activeChips,
    onClearAllFilters,
    onInteractionComplete,
}: CatalogSidebarProps) {
    const normalizeName = (categoryName: string) => categoryName.trim().toLowerCase();
    const [treeRenderKey, setTreeRenderKey] = useState(0);
    const [categorySearch, setCategorySearch] = useState("");
    const [draftMinPrice, setDraftMinPrice] = useState(selectedMinPrice);
    const [draftMaxPrice, setDraftMaxPrice] = useState(selectedMaxPrice);
    const [minPriceInput, setMinPriceInput] = useState(() => selectedMinPrice.toString());
    const [maxPriceInput, setMaxPriceInput] = useState(() => selectedMaxPrice.toString());

    const handleFilterChange = (filter: string) => {
        onFilterChange(filter);
        onInteractionComplete?.();
    };

    useEffect(() => {
        setDraftMinPrice(selectedMinPrice);
        setDraftMaxPrice(selectedMaxPrice);
        setMinPriceInput(selectedMinPrice.toString());
        setMaxPriceInput(selectedMaxPrice.toString());
    }, [selectedMaxPrice, selectedMinPrice]);

    const categoryById = useMemo(
        () => new Map(categories.map((category) => [Number(category.category_id), category])),
        [categories]
    );

    const childrenByParent = categories.reduce<Map<number | null, CatalogCategory[]>>((acc, category) => {
        const parent = category.parent_category;
        const current = acc.get(parent) || [];
        current.push(category);
        acc.set(parent, current);
        return acc;
    }, new Map<number | null, CatalogCategory[]>());

    const rootCategories = [...(childrenByParent.get(null) || [])].sort(
        (a, b) => Number(a.category_id) - Number(b.category_id)
    );

    const rootCategoryGroups = rootCategories.reduce<Array<{ key: string; label: string; roots: CatalogCategory[] }>>((acc, rootCategory) => {
        const key = normalizeName(rootCategory.category_id.toString()); // Use ID for unique keys if names collide, but keep label
        const groupKey = normalizeName(rootCategory.category_name);
        const existingGroup = acc.find((group) => group.key === groupKey);

        if (existingGroup) {
            existingGroup.roots.push(rootCategory);
            return acc;
        }

        acc.push({
            key: groupKey,
            label: rootCategory.category_name,
            roots: [rootCategory],
        });

        return acc;
    }, []);

    // Filter logic for category search
    const visibleCategoryIds = useMemo(() => {
        if (!categorySearch.trim()) return null;
        
        const search = categorySearch.toLowerCase().trim();
        const matches = new Set<number>();
        
        // 1. Find directly matching categories
        categories.forEach(cat => {
            if (cat.category_name.toLowerCase().includes(search)) {
                matches.add(Number(cat.category_id));
            }
        });
        
        // 2. Add all ancestors of matching categories to keep the tree structure
        const result = new Set<number>(matches);
        matches.forEach(id => {
            let current = categoryById.get(id);
            while (current?.parent_category !== null && current?.parent_category !== undefined) {
                const parentId = Number(current.parent_category);
                if (result.has(parentId)) break;
                result.add(parentId);
                current = categoryById.get(parentId);
            }
        });
        
        return result;
    }, [categorySearch, categories, categoryById]);

    const isCategoryVisible = (categoryId: number) => {
        if (!visibleCategoryIds) return true;
        return visibleCategoryIds.has(categoryId);
    };

    const isGroupVisible = (group: { key: string, roots: CatalogCategory[] }) => {
        if (!visibleCategoryIds) return true;
        return group.roots.some(root => visibleCategoryIds.has(Number(root.category_id)));
    };

    const makeFilterValue = (categoryId: number) => `category-${categoryId}`;
    const makeRootFilterValue = (rootNameKey: string) => `root-${rootNameKey}`;
    const getCategoryCount = (categoryId: number) => categoryCounts[categoryId] ?? 0;
    const getRootGroupCount = (rootKey: string) => rootGroupCounts[rootKey] ?? 0;
    const hasPriceData = maxAvailablePrice > 0 || minAvailablePrice > 0;
    const priceSpan = Math.max(1, maxAvailablePrice - minAvailablePrice);
    const draftMinPercent = ((draftMinPrice - minAvailablePrice) / priceSpan) * 100;
    const draftMaxPercent = ((draftMaxPrice - minAvailablePrice) / priceSpan) * 100;
    const isPriceRangeDirty = draftMinPrice !== selectedMinPrice || draftMaxPrice !== selectedMaxPrice;
    const isShowingAllPrices = !hasActivePriceFilter && !isPriceRangeDirty;

    const clampPrice = (value: number) => {
        if (Number.isNaN(value)) return minAvailablePrice;
        return Math.min(maxAvailablePrice, Math.max(minAvailablePrice, value));
    };

    const handleMinSliderChange = (nextValue: number) => {
        const clampedValue = clampPrice(nextValue);
        const nextMinPrice = Math.min(clampedValue, draftMaxPrice);
        setDraftMinPrice(nextMinPrice);
        setMinPriceInput(nextMinPrice.toString());
        onPriceRangeChange(nextMinPrice, draftMaxPrice);
    };

    const handleMaxSliderChange = (nextValue: number) => {
        const clampedValue = clampPrice(nextValue);
        const nextMaxPrice = Math.max(clampedValue, draftMinPrice);
        setDraftMaxPrice(nextMaxPrice);
        setMaxPriceInput(nextMaxPrice.toString());
        onPriceRangeChange(draftMinPrice, nextMaxPrice);
    };

    const handleMinInputChange = (value: string) => {
        setMinPriceInput(value);
    };

    const handleMaxInputChange = (value: string) => {
        setMaxPriceInput(value);
    };

    const handleMinConfirm = () => {
        let value = parseInt(minPriceInput, 10);
        if (isNaN(value)) value = minAvailablePrice;
        
        const clampedValue = Math.min(maxAvailablePrice, Math.max(minAvailablePrice, value));
        const finalMinPrice = Math.min(clampedValue, draftMaxPrice);
        
        setDraftMinPrice(finalMinPrice);
        setMinPriceInput(finalMinPrice.toString());
        onPriceRangeChange(finalMinPrice, draftMaxPrice);
    };

    const handleMaxConfirm = () => {
        let value = parseInt(maxPriceInput, 10);
        if (isNaN(value)) value = maxAvailablePrice;
        
        const clampedValue = Math.min(maxAvailablePrice, Math.max(minAvailablePrice, value));
        const finalMaxPrice = Math.max(clampedValue, draftMinPrice);
        
        setDraftMaxPrice(finalMaxPrice);
        setMaxPriceInput(finalMaxPrice.toString());
        onPriceRangeChange(draftMinPrice, finalMaxPrice);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'min' | 'max') => {
        if (e.key === 'Enter') {
            if (type === 'min') handleMinConfirm();
            else handleMaxConfirm();
        }
    };

    const resetPriceRange = () => {
        setDraftMinPrice(minAvailablePrice);
        setDraftMaxPrice(maxAvailablePrice);
        setMinPriceInput(minAvailablePrice.toString());
        setMaxPriceInput(maxAvailablePrice.toString());
        onClearPrice();
    };

    const getCategoryPath = (categoryId: number) => {
        const category = categoryById.get(categoryId);
        if (!category) return "Unknown";

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
    };

    const getCategoryLeafLabel = (category: CatalogCategory) => {
        const raw = category.category_name ?? "";
        if (raw.includes(">")) {
            const parts = raw.split(">").map((part) => part.trim()).filter(Boolean);
            return parts.at(-1) || raw;
        }
        return raw;
    };

    const renderCategoryNode = (category: CatalogCategory, depth = 0) => {
        const children = [...(childrenByParent.get(Number(category.category_id)) || [])].sort(
            (a, b) => Number(a.category_id) - Number(b.category_id)
        );

        const filterValue = makeFilterValue(Number(category.category_id));
        const hasChildren = children.length > 0;
        const categoryCount = getCategoryCount(Number(category.category_id));
        const categoryId = Number(category.category_id);

        if (!isCategoryVisible(categoryId)) return null;

        if (!hasChildren) {
            const isActive = activeFilter === filterValue;
            return (
                <button
                    key={category.category_id}
                    onClick={() => handleFilterChange(filterValue)}
                    className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-3 py-1.5 text-left font-montserrat text-sm transition-colors lg:px-2.5",
                        isActive
                            ? "bg-[#E7A3B0] text-white font-semibold"
                            : "text-[#3f2d31] hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                    )}
                    style={{
                        paddingLeft: `calc(var(--catalog-leaf-indent-base) + ${depth} * var(--catalog-leaf-indent-step))`,
                    }}
                    title={getCategoryPath(Number(category.category_id))}
                >
                    <span className="min-w-0 flex-1 line-clamp-2 break-words leading-snug">{getCategoryLeafLabel(category)}</span>
                    <span className={cn(
                        "min-w-[1.75rem] shrink-0 pt-0.5 text-right text-xs font-oswald tracking-[0.12em]",
                        isActive ? "text-white/80" : "text-[#8d7078]"
                    )}>
                        {categoryCount}
                    </span>
                </button>
            );
        }

        return (
            <AccordionItem value={`item-${category.category_id}`} key={`${category.category_id}-${depth}`} className="border-none">
                <AccordionTrigger
                    className={cn(
                        "min-w-0 rounded-md px-2.5 font-montserrat cursor-pointer py-2 hover:no-underline text-gray-700 hover:bg-[#fff5f7] hover:text-[#E7A3B0] [&>svg]:text-[#94a3b8] [&>svg]:size-3.5 data-[state=open]:bg-[#fff5f7] data-[state=open]:text-[#E7A3B0]",
                        depth === 0 ? "text-base font-medium tracking-wide" : "text-sm"
                    )}
                    style={{
                        paddingLeft: `calc(var(--catalog-trigger-indent-base) + ${depth} * var(--catalog-trigger-indent-step))`,
                    }}
                >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                        <span
                            className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                activeFilter === filterValue ? "bg-[#E7A3B0]" : "bg-gray-300"
                            )}
                        />
                        <span className="min-w-0 line-clamp-2 break-words leading-snug">{getCategoryLeafLabel(category)}</span>
                    </span>
                </AccordionTrigger>

                <AccordionContent className="catalog-sidebar-branch min-w-0 border-l border-gray-200 flex flex-col gap-1 pt-1 pb-2">
                    <button
                        onClick={() => handleFilterChange(filterValue)}
                        className={cn(
                            "text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer rounded-md px-2.5",
                            activeFilter === filterValue
                                ? "bg-[#E7A3B0] text-white font-semibold"
                                : "text-gray-500 hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                        )}
                        style={{
                            paddingLeft: `calc(var(--catalog-all-indent-base) + ${depth + 1} * var(--catalog-all-indent-step))`,
                        }}
                        title={getCategoryPath(Number(category.category_id))}
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0 flex-1 line-clamp-2 break-words leading-snug">
                                All {getCategoryLeafLabel(category)}
                            </span>
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                                activeFilter === filterValue
                                    ? "bg-white/20 text-white"
                                    : "bg-[#f8f3f4] text-[#8d7078]"
                            )}>
                                {categoryCount}
                            </span>
                        </span>
                    </button>

                    {categorySearch ? (
                        <Accordion 
                            type="multiple" 
                            className="w-full min-w-0"
                            value={Array.from(visibleCategoryIds || []).map(id => `item-${id}`)}
                        >
                            {children.map((childCategory) => renderCategoryNode(childCategory, depth + 1))}
                        </Accordion>
                    ) : (
                        <Accordion type="single" collapsible className="w-full min-w-0">
                            {children.map((childCategory) => renderCategoryNode(childCategory, depth + 1))}
                        </Accordion>
                    )}
                </AccordionContent>
            </AccordionItem>
        );
    };

    const renderRootGroupNode = (group: { key: string; label: string; roots: CatalogCategory[] }) => {
        if (!isGroupVisible(group)) return null;

        const rootFilterValue = makeRootFilterValue(group.key);
        const mergedChildren = group.roots
            .flatMap((rootCategory) => childrenByParent.get(Number(rootCategory.category_id)) || [])
            .filter((childCategory, childIndex, childArray) =>
                childArray.findIndex((item) => item.category_id === childCategory.category_id) === childIndex
            )
            .sort((a, b) => Number(a.category_id) - Number(b.category_id));

        return (
            <AccordionItem value={`root-${group.key}`} key={`root-${group.key}`} className="border-none">
                <AccordionTrigger
                    className={cn(
                        "min-w-0 gap-2 rounded-md px-2.5 font-montserrat cursor-pointer py-2 hover:no-underline text-gray-700 hover:bg-[#fff5f7] hover:text-[#E7A3B0] text-base font-semibold tracking-wide [&>svg]:ml-1 [&>svg]:text-[#94a3b8] [&>svg]:size-3.5 data-[state=open]:bg-[#fff5f7] data-[state=open]:text-[#E7A3B0]",
                        activeFilter === rootFilterValue ? "text-[#E7A3B0] font-bold" : ""
                    )}
                >
                    <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden">
                        <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <span
                                className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    activeFilter === rootFilterValue ? "bg-[#E7A3B0]" : "bg-gray-300"
                                )}
                            />
                            <span className="min-w-0 truncate">{group.label}</span>
                        </span>
                        <span
                            className={cn(
                                "min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-[10px] font-oswald tracking-[0.18em]",
                                activeFilter === rootFilterValue
                                    ? "bg-[#fff0f5] text-[#b47c88]"
                                    : "bg-[#f8f3f4] text-[#8d7078]"
                            )}
                        >
                            {getRootGroupCount(group.key)}
                        </span>
                    </span>
                </AccordionTrigger>

                <AccordionContent className="catalog-sidebar-branch min-w-0 border-l border-gray-200 flex flex-col gap-1 pt-1 pb-2">
                    <button
                        onClick={() => handleFilterChange(rootFilterValue)}
                        className={cn(
                            "text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer rounded-md px-2.5",
                            activeFilter === rootFilterValue
                                ? "bg-[#E7A3B0] text-white font-semibold"
                                : "text-gray-500 hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                        )}
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="truncate">All {group.label}</span>
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                                activeFilter === rootFilterValue
                                    ? "bg-white/20 text-white"
                                    : "bg-[#f8f3f4] text-[#8d7078]"
                            )}>
                                {getRootGroupCount(group.key)}
                            </span>
                        </span>
                    </button>

                    {categorySearch ? (
                        <Accordion 
                            type="multiple" 
                            className="w-full min-w-0"
                            value={Array.from(visibleCategoryIds || []).map(id => `item-${id}`)}
                        >
                            {mergedChildren.map((childCategory) => renderCategoryNode(childCategory, 1))}
                        </Accordion>
                    ) : (
                        <Accordion type="single" collapsible className="w-full min-w-0">
                            {mergedChildren.map((childCategory) => renderCategoryNode(childCategory, 1))}
                        </Accordion>
                    )}
                </AccordionContent>
            </AccordionItem>
        );
    };

    const topLevelButtons: Array<{
        key: string;
        label: string;
        count: number;
        disabled?: boolean;
        title?: string;
    }> = [
        { key: "all", label: "All Products", count: allCount },
        { key: "new", label: "New Arrivals", count: newCount },
        { key: "on-sale", label: "On Sale", count: saleCount },
        {
            key: "current-season",
            label: currentSeasonLabel ?? "Current Season (Unavailable)",
            count: currentSeasonCount,
            disabled: !currentSeasonLabel,
            title: currentSeasonLabel ? `Currently active season: ${currentSeasonLabel}` : "No active season set",
        },
    ];

    return(
        <aside className="catalog-sidebar flex w-full flex-col gap-6 pb-10 lg:pr-4">
            {onSortChange && (
                <div className="rounded-xl border border-[#E7A3B0]/20 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.18em] text-gray-700">
                            Sort
                        </h3>
                    </div>
                    <Select value={sortBy} onValueChange={onSortChange}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-[#E7A3B0]/40 bg-white px-4 font-montserrat text-sm text-[#3f2d31] shadow-none transition-colors hover:bg-[#fff8fa] focus-visible:ring-2 focus-visible:ring-[#E7A3B0]/30 focus-visible:ring-offset-0">
                            <SelectValue placeholder="Sort option" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#E7A3B0]/20 bg-white text-black shadow-lg">
                            {SORT_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="font-montserrat text-black focus:bg-[#fff5f7] focus:text-[#E7A3B0] cursor-pointer"
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-6">
                {!!activeChips?.length && (
                    <div className="rounded-xl border border-[#E7A3B0]/20 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.18em] text-gray-700">
                                Active Filters
                            </h3>
                            {onClearAllFilters && (
                                <button
                                    type="button"
                                    onClick={onClearAllFilters}
                                    className="font-oswald text-[11px] uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {activeChips.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => {
                                        chip.onRemove();
                                        onInteractionComplete?.();
                                    }}
                                    className="inline-flex max-w-full items-start gap-2 rounded-xl border border-[#E7A3B0]/25 bg-white px-3 py-2 text-left font-montserrat text-xs font-medium leading-snug text-[#6f5058] transition-colors hover:bg-[#fff5f7]"
                                >
                                    <span className="min-w-0 whitespace-normal break-words">
                                        {chip.label}
                                    </span>
                                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b47c88]" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-[#E7A3B0]/20 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.18em] text-gray-700">
                            Categories
                        </h3>
                        <button
                            type="button"
                            onClick={() => setTreeRenderKey((previous) => previous + 1)}
                            className="text-[11px] text-[#bfa0a8] cursor-pointer hover:text-[#E7A3B0] transition-colors"
                        >
                            Collapse all
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        {topLevelButtons.map((item) => {
                            const isActive = activeFilter === item.key;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => handleFilterChange(item.key)}
                                    disabled={item.disabled}
                                    title={item.title}
                                    className={cn(
                                        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-3 py-2 text-left font-montserrat text-sm leading-snug transition-colors lg:px-2.5 lg:py-1.5",
                                        isActive
                                            ? "bg-[#E7A3B0] text-white font-semibold"
                                            : "text-[#3f2d31] hover:bg-[#fff5f7] hover:text-[#E7A3B0]",
                                        item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-[#3f2d31]"
                                    )}
                                >
                                    <span className="min-w-0 truncate">{item.label}</span>
                                    <span className={cn(
                                        "min-w-[1.75rem] text-right text-xs font-oswald tracking-[0.12em]",
                                        isActive ? "text-white/80" : "text-[#8d7078]"
                                    )}>
                                        {item.count}
                                    </span>
                                </button>
                            );
                        })}

                        <div className="mt-2 border-t border-[#E7A3B0]/15 pt-2">
                            <Accordion key={`catalog-tree-${treeRenderKey}`} type="single" collapsible className="w-full min-w-0">
                                {rootCategoryGroups.map((rootGroup) => renderRootGroupNode(rootGroup))}
                            </Accordion>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[#E7A3B0]/20 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.18em] text-gray-700">
                            Price
                        </h3>
                        {!isShowingAllPrices && (
                            <button
                                type="button"
                                onClick={resetPriceRange}
                                className="font-oswald text-[11px] uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {hasPriceData ? (
                        <div className="space-y-4">
                            <div className="relative px-1 pt-2">
                                <div className="absolute left-1 right-1 top-[21px] h-1.5 rounded-full bg-[#f4d9df]" />
                                <div
                                    className="absolute top-[21px] h-1.5 rounded-full bg-[#E7A3B0]"
                                    style={{
                                        left: `calc(${draftMinPercent}% + 0.25rem)`,
                                        right: `calc(${100 - draftMaxPercent}% + 0.25rem)`,
                                    }}
                                />
                                <input
                                    type="range"
                                    min={minAvailablePrice}
                                    max={maxAvailablePrice}
                                    step={1}
                                    value={draftMinPrice}
                                    onChange={(event) => handleMinSliderChange(Number(event.target.value))}
                                    className="price-range-input"
                                    aria-label="Minimum price"
                                />
                                <input
                                    type="range"
                                    min={minAvailablePrice}
                                    max={maxAvailablePrice}
                                    step={1}
                                    value={draftMaxPrice}
                                    onChange={(event) => handleMaxSliderChange(Number(event.target.value))}
                                    className="price-range-input"
                                    aria-label="Maximum price"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="font-oswald text-[10px] uppercase tracking-[0.24em] text-[#b47c88]">
                                        Min
                                    </span>
                                    <input
                                        type="number"
                                        min={minAvailablePrice}
                                        value={minPriceInput}
                                        onChange={(e) => handleMinInputChange(e.target.value)}
                                        onBlur={handleMinConfirm}
                                        onKeyDown={(e) => handleInputKeyDown(e, 'min')}
                                        className="h-10 w-full rounded-xl border border-[#E7A3B0]/20 bg-white px-3 font-montserrat text-sm text-[#3f2d31] focus:outline-none focus:ring-2 focus:ring-[#E7A3B0]/25"
                                    />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="font-oswald text-[10px] uppercase tracking-[0.24em] text-[#b47c88]">
                                        Max
                                    </span>
                                    <input
                                        type="number"
                                        max={maxAvailablePrice}
                                        value={maxPriceInput}
                                        onChange={(e) => handleMaxInputChange(e.target.value)}
                                        onBlur={handleMaxConfirm}
                                        onKeyDown={(e) => handleInputKeyDown(e, 'max')}
                                        className="h-10 w-full rounded-xl border border-[#E7A3B0]/20 bg-white px-3 font-montserrat text-sm text-[#3f2d31] focus:outline-none focus:ring-2 focus:ring-[#E7A3B0]/25"
                                    />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-[#E7A3B0]/20 bg-white px-4 py-4 text-center">
                            <p className="font-montserrat text-sm text-[#8d7078]">
                                Price filters will appear once products are available.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
