"use client"

import { useState } from "react";

// UI Components
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

import { CatalogCategory } from "@/types/product.types";

interface CatalogSidebarProps {
    categories: CatalogCategory[];
    activeFilter: string;
    sortBy: string;
    onFilterChange: (filter: string) => void;
    onSortChange: (sort: string) => void;
}

export default function CatalogSidebar({ categories, activeFilter, sortBy, onFilterChange, onSortChange }: CatalogSidebarProps) {
    const normalizeName = (categoryName: string) => categoryName.trim().toLowerCase();
    const [treeRenderKey, setTreeRenderKey] = useState(0);

    const handleFilterChange = (filter: string) => {
        onFilterChange(filter);
    };

    const handleSortChange = (sort: string) => {
        onSortChange(sort);
    };

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
                    <span className="flex items-center gap-2">
                        <span className={cn("text-xs", activeFilter === filterValue ? "text-[#E7A3B0]" : "text-gray-300 group-hover:text-[#E7A3B0]")}>•</span>
                        <span>{category.category_name}</span>
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
                    <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">⌄</span>
                        <span>{category.category_name}</span>
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
                        <span className="flex items-center gap-2">
                            <span className="text-gray-300">–</span>
                            <span>All {category.category_name}</span>
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
                    <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">⌄</span>
                        <span>{group.label}</span>
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
                        <span className="flex items-center gap-2">
                            <span className="text-gray-300">–</span>
                            <span>All {group.label}</span>
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
        <aside className="w-64 flex flex-col gap-10 pb-10 pr-6">

            {/*CATEGORIES SECTION */}
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

                    {/**Static Items */}
                    <div className="flex flex-col gap-1 px-2 py-2">
                    <button 
                        onClick={() => handleFilterChange("all")}
                        className={cn("text-left cursor-pointer rounded-md px-2.5 py-2 font-montserrat text-sm font-medium transition-colors duration-200 hover:text-[#E7A3B0] hover:bg-[#fff5f7]", 
                                activeFilter === "all" ? "bg-[#121212] text-[#E7A3B0] font-semibold" : "text-gray-600")}
                    >
                        All Products
                    </button>

                    <button 
                        onClick={() => handleFilterChange("new")}
                        className={cn("text-left cursor-pointer rounded-md px-2.5 py-2 font-montserrat text-sm font-medium transition-colors duration-200 hover:text-[#E7A3B0] hover:bg-[#fff5f7]", 
                                activeFilter === "new" ? "bg-[#121212] text-[#E7A3B0] font-semibold" : "text-gray-600")}
                    
                    >
                        New Arrivals
                    </button>

                    {/**Expandable Items */}
                    <Accordion key={`catalog-tree-${treeRenderKey}`} type="single" collapsible className="w-full">
                        {rootCategoryGroups.map((rootGroup) => renderRootGroupNode(rootGroup))}
                    </Accordion>
                </div>
                </div>

                {/**Sort by */}
                <div className="space-y-3 pt-6 border-t border-gray-100">
                    <h3 className="font-playfair-display text-xl font-bold tracking-wider uppercase border-b border-[#E7A3B0]/30 pb-2">
                        Sort by
                    </h3>
                </div>
                <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full bg-white border border-gray-200 rounded-md font-montserrat text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-black h-10">
                        <SelectValue placeholder="Sort option" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-black">
                        <SelectItem value="newest" className="font-montserrat text-black focus:bg-[#fff5f7] focus:text-[#E7A3B0] cursor-pointer">
                            Newest First
                        </SelectItem>
                        <SelectItem value="price-low" className="font-montserrat text-black focus:bg-[#fff5f7] focus:text-[#E7A3B0] cursor-pointer">
                            Price: Low to High
                        </SelectItem>
                        <SelectItem value="price-high" className="font-montserrat text-black focus:bg-[#fff5f7] focus:text-[#E7A3B0] cursor-pointer">
                            Price: High to Low
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </aside>
    )
}
