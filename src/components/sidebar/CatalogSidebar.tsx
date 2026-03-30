"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {cn} from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";

import { CatalogCategory } from "@/types/product.types";

interface CatalogSidebarProps {
    categories: CatalogCategory[];
    activeFilter: string;
    sortBy: string;
    allCount: number;
    newCount: number;
    categoryCounts: Record<number, number>;
    rootGroupCounts: Record<string, number>;
    minAvailablePrice: number;
    maxAvailablePrice: number;
    selectedMinPrice: number;
    selectedMaxPrice: number;
    hasActivePriceFilter: boolean;
    onFilterChange: (filter: string) => void;
    onSortChange: (sort: string) => void;
    onPriceRangeChange: (minPrice: number, maxPrice: number) => void;
    onClearPrice: () => void;
    onInteractionComplete?: () => void;
}

export default function CatalogSidebar({
    categories,
    activeFilter,
    sortBy,
    allCount,
    newCount,
    categoryCounts,
    rootGroupCounts,
    minAvailablePrice,
    maxAvailablePrice,
    selectedMinPrice,
    selectedMaxPrice,
    hasActivePriceFilter,
    onFilterChange,
    onSortChange,
    onPriceRangeChange,
    onClearPrice,
    onInteractionComplete,
}: CatalogSidebarProps) {
    const normalizeName = (categoryName: string) => categoryName.trim().toLowerCase();
    const [treeRenderKey, setTreeRenderKey] = useState(0);
    const [draftMinPrice, setDraftMinPrice] = useState(selectedMinPrice);
    const [draftMaxPrice, setDraftMaxPrice] = useState(selectedMaxPrice);

    const handleFilterChange = (filter: string) => {
        onFilterChange(filter);
        onInteractionComplete?.();
    };

    const handleSortChange = (sort: string) => {
        onSortChange(sort);
        onInteractionComplete?.();
    };

    useEffect(() => {
        setDraftMinPrice(selectedMinPrice);
        setDraftMaxPrice(selectedMaxPrice);
    }, [selectedMaxPrice, selectedMinPrice]);

    const categoryById = new Map(
        categories.map((category) => [Number(category.category_id), category])
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
        const key = normalizeName(rootCategory.category_name);
        const existingGroup = acc.find((group) => group.key === key);

        if (existingGroup) {
            existingGroup.roots.push(rootCategory);
            return acc;
        }

        acc.push({
            key,
            label: rootCategory.category_name,
            roots: [rootCategory],
        });

        return acc;
    }, []);

    const makeFilterValue = (categoryId: number) => `category-${categoryId}`;
    const makeRootFilterValue = (rootNameKey: string) => `root-${rootNameKey}`;
    const getCategoryCount = (categoryId: number) => categoryCounts[categoryId] ?? 0;
    const getRootGroupCount = (rootKey: string) => rootGroupCounts[rootKey] ?? 0;
    const sortOptions = [
        { value: "newest", label: "Newest First", hint: "Fresh arrivals first" },
        { value: "price-low", label: "Price: Low to High", hint: "Budget-friendly first" },
        { value: "price-high", label: "Price: High to Low", hint: "Premium pieces first" },
        { value: "az", label: "Name: A to Z", hint: "Alphabetical ascending" },
        { value: "za", label: "Name: Z to A", hint: "Alphabetical descending" },
    ] as const;
    const hasPriceData = maxAvailablePrice > 0 || minAvailablePrice > 0;
    const priceSpan = Math.max(1, maxAvailablePrice - minAvailablePrice);
    const draftMinPercent = ((draftMinPrice - minAvailablePrice) / priceSpan) * 100;
    const draftMaxPercent = ((draftMaxPrice - minAvailablePrice) / priceSpan) * 100;
    const isPriceRangeDirty = draftMinPrice !== selectedMinPrice || draftMaxPrice !== selectedMaxPrice;
    const isShowingAllPrices = !hasActivePriceFilter && !isPriceRangeDirty;

    const formatCurrency = (value: number) => {
        const hasCents = !Number.isInteger(value);
        return `\u20B1${value.toLocaleString(undefined, {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: hasCents ? 2 : 0,
        })}`;
    };

    const clampPrice = (value: number) => {
        if (Number.isNaN(value)) return minAvailablePrice;
        return Math.min(maxAvailablePrice, Math.max(minAvailablePrice, value));
    };

    const handleMinSliderChange = (nextValue: number) => {
        const clampedValue = clampPrice(nextValue);
        setDraftMinPrice(Math.min(clampedValue, draftMaxPrice));
    };

    const handleMaxSliderChange = (nextValue: number) => {
        const clampedValue = clampPrice(nextValue);
        setDraftMaxPrice(Math.max(clampedValue, draftMinPrice));
    };

    const handleMinInputChange = (value: string) => {
        const parsedValue = Number(value);
        if (value === "") {
            setDraftMinPrice(minAvailablePrice);
            return;
        }

        const clampedValue = clampPrice(parsedValue);
        setDraftMinPrice(Math.min(clampedValue, draftMaxPrice));
    };

    const handleMaxInputChange = (value: string) => {
        const parsedValue = Number(value);
        if (value === "") {
            setDraftMaxPrice(maxAvailablePrice);
            return;
        }

        const clampedValue = clampPrice(parsedValue);
        setDraftMaxPrice(Math.max(clampedValue, draftMinPrice));
    };

    const applyPriceRange = () => {
        onPriceRangeChange(draftMinPrice, draftMaxPrice);
        onInteractionComplete?.();
    };

    const resetPriceRange = () => {
        setDraftMinPrice(minAvailablePrice);
        setDraftMaxPrice(maxAvailablePrice);
        onClearPrice();
        onInteractionComplete?.();
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

    const renderCategoryNode = (category: CatalogCategory, depth = 0) => {
        const children = [...(childrenByParent.get(Number(category.category_id)) || [])].sort(
            (a, b) => Number(a.category_id) - Number(b.category_id)
        );

        const filterValue = makeFilterValue(Number(category.category_id));
        const hasChildren = children.length > 0;
        const categoryCount = getCategoryCount(Number(category.category_id));

        if (!hasChildren) {
            return (
                <button
                    key={category.category_id}
                    onClick={() => handleFilterChange(filterValue)}
                    className={cn(
                        "group w-full cursor-pointer rounded-md px-2.5 text-left font-montserrat transition-colors duration-200",
                        depth === 0 ? "text-base font-medium tracking-wide py-1.5" : "text-sm py-1.5",
                        activeFilter === filterValue
                            ? "bg-[#121212] text-[#E7A3B0] font-semibold"
                            : "text-gray-600 hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                    )}
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                    title={getCategoryPath(Number(category.category_id))}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                activeFilter === filterValue ? "bg-[#E7A3B0]" : "bg-gray-300 group-hover:bg-[#E7A3B0]"
                            )}
                        />
                        <span className="truncate">{category.category_name}</span>
                    </span>
                    <span
                        className={cn(
                            "ml-3 rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                            activeFilter === filterValue
                                ? "bg-[#2a2a2a] text-[#f6ccd4]"
                                : "bg-[#f8f3f4] text-[#8d7078]"
                        )}
                    >
                        {categoryCount}
                    </span>
                </button>
            );
        }

        return (
            <AccordionItem value={`item-${category.category_id}-${depth}`} key={`${category.category_id}-${depth}`} className="border-none">
                <AccordionTrigger
                    className={cn(
                        "rounded-md px-2.5 font-montserrat cursor-pointer py-2 hover:no-underline text-gray-700 hover:bg-[#fff5f7] hover:text-[#E7A3B0] [&>svg]:text-[#94a3b8] [&>svg]:size-3.5 data-[state=open]:bg-[#fff5f7] data-[state=open]:text-[#E7A3B0]",
                        depth === 0 ? "text-base font-medium tracking-wide" : "text-sm"
                    )}
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 rounded-sm border border-gray-300" />
                        <span className="truncate">{category.category_name}</span>
                    </span>
                </AccordionTrigger>

                <AccordionContent className="ml-3 border-l border-gray-200 pl-2 flex flex-col gap-1 pt-1 pb-2">
                    <button
                        onClick={() => handleFilterChange(filterValue)}
                        className={cn(
                            "text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer rounded-md px-2.5",
                            activeFilter === filterValue
                                ? "bg-[#121212] text-[#E7A3B0] font-semibold"
                                : "text-gray-500 hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                        )}
                        style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
                        title={getCategoryPath(Number(category.category_id))}
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="truncate">All {category.category_name}</span>
                            <span className="rounded-full bg-[#f8f3f4] px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em] text-[#8d7078]">
                                {categoryCount}
                            </span>
                        </span>
                    </button>

                    <Accordion type="single" collapsible className="w-full">
                        {children.map((childCategory) => renderCategoryNode(childCategory, depth + 1))}
                    </Accordion>
                </AccordionContent>
            </AccordionItem>
        );
    };

    const renderRootGroupNode = (group: { key: string; label: string; roots: CatalogCategory[] }) => {
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
                        "rounded-md px-2.5 font-montserrat cursor-pointer py-2 hover:no-underline text-gray-700 hover:bg-[#fff5f7] hover:text-[#E7A3B0] text-base font-semibold tracking-wide [&>svg]:text-[#94a3b8] [&>svg]:size-3.5 data-[state=open]:bg-[#fff5f7] data-[state=open]:text-[#E7A3B0]",
                        activeFilter === rootFilterValue ? "text-[#E7A3B0] font-bold" : ""
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 rounded-sm border border-gray-300" />
                        <span className="truncate">{group.label}</span>
                    </span>
                    <span
                        className={cn(
                            "ml-3 rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                            activeFilter === rootFilterValue
                                ? "bg-[#fff0f5] text-[#b47c88]"
                                : "bg-[#f8f3f4] text-[#8d7078]"
                        )}
                    >
                        {getRootGroupCount(group.key)}
                    </span>
                </AccordionTrigger>

                <AccordionContent className="ml-3 border-l border-gray-200 pl-2 flex flex-col gap-1 pt-1 pb-2">
                    <button
                        onClick={() => handleFilterChange(rootFilterValue)}
                        className={cn(
                            "text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer rounded-md px-2.5",
                            activeFilter === rootFilterValue
                                ? "bg-[#121212] text-[#E7A3B0] font-semibold"
                                : "text-gray-500 hover:bg-[#fff5f7] hover:text-[#E7A3B0]"
                        )}
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="truncate">All {group.label}</span>
                            <span className="rounded-full bg-[#f8f3f4] px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em] text-[#8d7078]">
                                {getRootGroupCount(group.key)}
                            </span>
                        </span>
                    </button>

                    <Accordion type="single" collapsible className="w-full">
                        {mergedChildren.map((childCategory) => renderCategoryNode(childCategory, 1))}
                    </Accordion>
                </AccordionContent>
            </AccordionItem>
        );
    };

    return(
        <aside className="w-full lg:w-64 flex flex-col gap-10 pb-10 pr-2 lg:pr-6">
            <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.2em] text-gray-700">
                            Categories
                        </h3>
                        <button
                            type="button"
                            onClick={() => setTreeRenderKey((previous) => previous + 1)}
                            className="text-xs text-gray-400 cursor-pointer hover:text-[#E7A3B0] transition-colors"
                        >
                            Collapse all
                        </button>
                    </div>

                    <div className="flex flex-col gap-1 px-2 py-2">
                        <button
                            onClick={() => handleFilterChange("all")}
                            className={cn(
                                "text-left cursor-pointer rounded-md px-2.5 py-2 font-montserrat text-sm font-medium transition-colors duration-200 hover:text-[#E7A3B0] hover:bg-[#fff5f7]",
                                activeFilter === "all" ? "bg-[#121212] text-[#E7A3B0] font-semibold" : "text-gray-600"
                            )}
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span>All Products</span>
                                <span className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                                    activeFilter === "all" ? "bg-[#2a2a2a] text-[#f6ccd4]" : "bg-[#f8f3f4] text-[#8d7078]"
                                )}>
                                    {allCount}
                                </span>
                            </span>
                        </button>

                        <button
                            onClick={() => handleFilterChange("new")}
                            className={cn(
                                "text-left cursor-pointer rounded-md px-2.5 py-2 font-montserrat text-sm font-medium transition-colors duration-200 hover:text-[#E7A3B0] hover:bg-[#fff5f7]",
                                activeFilter === "new" ? "bg-[#121212] text-[#E7A3B0] font-semibold" : "text-gray-600"
                            )}
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span>New Arrivals</span>
                                <span className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-oswald tracking-[0.18em]",
                                    activeFilter === "new" ? "bg-[#2a2a2a] text-[#f6ccd4]" : "bg-[#f8f3f4] text-[#8d7078]"
                                )}>
                                    {newCount}
                                </span>
                            </span>
                        </button>

                        <Accordion key={`catalog-tree-${treeRenderKey}`} type="single" collapsible className="w-full">
                            {rootCategoryGroups.map((rootGroup) => renderRootGroupNode(rootGroup))}
                        </Accordion>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#E7A3B0]/20 bg-linear-to-b from-[#fffafc] to-white shadow-sm overflow-hidden">
                    <div className="border-b border-[#E7A3B0]/12 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-oswald text-sm font-bold uppercase tracking-[0.2em] text-gray-700">
                                Refine Results
                            </h3>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0f5] text-[#b47c88]">
                                <ArrowUpDown className="h-4 w-4" />
                            </span>
                        </div>
                    </div>

                    <div className="space-y-5 px-4 py-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-oswald text-[10px] uppercase tracking-[0.28em] text-[#b47c88]">
                                    Sort
                                </p>
                                {sortBy !== "newest" && (
                                    <button
                                        type="button"
                                        onClick={() => handleSortChange("newest")}
                                        className="font-oswald text-[11px] uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <Select value={sortBy} onValueChange={handleSortChange}>
                                <SelectTrigger className="h-11 w-full rounded-xl border-[#E7A3B0]/25 bg-white px-4 font-montserrat text-sm text-[#3f2d31] shadow-none transition-colors hover:bg-[#fff8fa] focus-visible:ring-2 focus-visible:ring-[#E7A3B0]/30 focus-visible:ring-offset-0">
                                    <SelectValue placeholder="Sort option" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#E7A3B0]/20 bg-white text-black shadow-lg">
                                    {sortOptions.map((option) => (
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

                        <div className="border-t border-[#E7A3B0]/12 pt-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="font-oswald text-[10px] uppercase tracking-[0.28em] text-[#b47c88]">
                                    Price
                                </p>
                                <button
                                    type="button"
                                    onClick={resetPriceRange}
                                    disabled={isShowingAllPrices}
                                    className={cn(
                                        "font-oswald text-[11px] uppercase tracking-[0.2em] transition-colors",
                                        isShowingAllPrices
                                            ? "text-[#d2b7bf] cursor-not-allowed"
                                            : "text-[#b47c88] hover:text-[#8f5f69]"
                                    )}
                                >
                                    Reset
                                </button>
                            </div>

                            {hasPriceData ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E7A3B0]/15 bg-white px-3 py-2.5">
                                        <span className="font-montserrat text-sm text-[#3f2d31]">
                                            {isShowingAllPrices ? "All Prices" : "Selected Range"}
                                        </span>
                                        <span className="font-oswald text-sm tracking-[0.06em] text-[#b47c88]">
                                            {isShowingAllPrices
                                                ? `${formatCurrency(minAvailablePrice)} - ${formatCurrency(maxAvailablePrice)}`
                                                : `${formatCurrency(draftMinPrice)} - ${formatCurrency(draftMaxPrice)}`}
                                        </span>
                                    </div>

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
                                                max={draftMaxPrice}
                                                value={draftMinPrice}
                                                onChange={(event) => handleMinInputChange(event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#E7A3B0]/20 bg-white px-3 font-montserrat text-sm text-[#3f2d31] focus:outline-none focus:ring-2 focus:ring-[#E7A3B0]/25"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="font-oswald text-[10px] uppercase tracking-[0.24em] text-[#b47c88]">
                                                Max
                                            </span>
                                            <input
                                                type="number"
                                                min={draftMinPrice}
                                                max={maxAvailablePrice}
                                                value={draftMaxPrice}
                                                onChange={(event) => handleMaxInputChange(event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#E7A3B0]/20 bg-white px-3 font-montserrat text-sm text-[#3f2d31] focus:outline-none focus:ring-2 focus:ring-[#E7A3B0]/25"
                                            />
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={applyPriceRange}
                                            disabled={!isPriceRangeDirty}
                                            className={cn(
                                                "flex-1 rounded-xl px-4 py-2.5 font-oswald text-[11px] uppercase tracking-[0.24em] transition-colors",
                                                isPriceRangeDirty
                                                    ? "bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                                                    : "bg-[#f7edf0] text-[#c7a6af] cursor-not-allowed"
                                            )}
                                        >
                                            Apply
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftMinPrice(selectedMinPrice);
                                                setDraftMaxPrice(selectedMaxPrice);
                                            }}
                                            disabled={!isPriceRangeDirty}
                                            className={cn(
                                                "rounded-xl border px-4 py-2.5 font-oswald text-[11px] uppercase tracking-[0.24em] transition-colors",
                                                isPriceRangeDirty
                                                    ? "border-[#E7A3B0]/25 text-[#8f5f69] hover:bg-[#fff5f7]"
                                                    : "border-[#edd7dd] text-[#c7a6af] cursor-not-allowed"
                                            )}
                                        >
                                            Undo
                                        </button>
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
                </div>
            </div>
        </aside>
    )
}
