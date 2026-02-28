"use client"

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

type CatalogCategory = {
    category_id: number;
    category_name: string;
    parent_category: number | null;
};

interface CatalogSidebarProps {
    categories: CatalogCategory[];
    activeFilter: string;
    sortBy: string;
    onFilterChange: (filter: string) => void;
    onSortChange: (sort: string) => void;
}

export default function CatalogSidebar({ categories, activeFilter, sortBy, onFilterChange, onSortChange }: CatalogSidebarProps) {
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

    const makeFilterValue = (categoryId: number) => `category-${categoryId}`;

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
                        "text-left font-montserrat transition-colors duration-200 hover:text-[#E7A3B0]",
                        depth === 0 ? "text-base font-medium tracking-wide py-1" : "text-sm py-1",
                        activeFilter === filterValue ? "text-[#E7A3B0] font-bold" : "text-gray-600"
                    )}
                    style={{ paddingLeft: `${depth * 12}px` }}
                    title={getCategoryPath(Number(category.category_id))}
                >
                    {category.category_name}
                </button>
            );
        }

        return (
            <AccordionItem value={`item-${category.category_id}-${depth}`} key={`${category.category_id}-${depth}`} className="border-none">
                <AccordionTrigger
                    className={cn(
                        "font-montserrat cursor-pointer py-2 hover:text-[#E7A3B0] hover:no-underline text-gray-600",
                        depth === 0 ? "text-base font-medium tracking-wide" : "text-sm"
                    )}
                    style={{ paddingLeft: `${depth * 12}px` }}
                >
                    {category.category_name}
                </AccordionTrigger>

                <AccordionContent className="flex flex-col gap-1 pt-1 pb-2">
                    <button
                        onClick={() => handleFilterChange(filterValue)}
                        className={cn(
                            "text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer hover:text-[#E7A3B0]",
                            activeFilter === filterValue ? "text-[#E7A3B0] font-bold" : "text-gray-500"
                        )}
                        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                        title={getCategoryPath(Number(category.category_id))}
                    >
                        All {category.category_name}
                    </button>

                    <Accordion type="single" collapsible className="w-full">
                        {children.map((childCategory) => renderCategoryNode(childCategory, depth + 1))}
                    </Accordion>
                </AccordionContent>
            </AccordionItem>
        );
    };

    return(
        <aside className="w-64 flex flex-col gap-10 pb-10 pr-6">

            {/*CATEGORIES SECTION */}
            <div className="space-y-6">
                <h3 className="font-playfair-display text-xl font-bold uppercase tracking-wider border-b border-[#E7A3B0]/30 pb-2">
                    Categories
                </h3>

                {/**Static Items */}
                <div className="flex flex-col gap-3 pl-1">
                    <button 
                        onClick={() => handleFilterChange("all")}
                        className={cn("text-left font-montserrat text-base font-medium tracking-wide transition-colors duration-200 hover:text-[#E7A3B0]", 
                                activeFilter === "all" ? "text-[#E7A3B0] font-bold" : "text-gray-600")}
                    >
                        All Products
                    </button>

                    <button 
                        onClick={() => handleFilterChange("new")}
                        className={cn("text-left font-montserrat text-base font-medium tracking-wide transition-colors duration-200 hover:text-[#E7A3B0]", 
                                activeFilter === "new" ? "text-[#E7A3B0] font-bold" : "text-gray-600")}
                    
                    >
                        New Arrivals
                    </button>

                    {/**Expandable Items */}
                    <Accordion type="single" collapsible className="w-full -ml-1">
                        {rootCategories.map((rootCategory) => renderCategoryNode(rootCategory, 0))}
                    </Accordion>
                </div>

                {/**Sort by */}
                <div className="space-y-3 pt-6 border-t border-gray-100">
                    <h3 className="font-playfair-display text-xl font-bold tracking-wider uppercase border-b border-[#E7A3B0]/30 pb-2">
                        Sort by
                    </h3>
                </div>
                <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full bg-white border border-gray-200 rounded-none font-montserrat text-sm focus:ring-1 focus:ring-[#E7A3B0] text-black h-10">
                        <SelectValue placeholder="Sort option" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest" className="font-montserrat">
                            Newest First
                        </SelectItem>
                        <SelectItem value="price-low" className="font-montserrat">
                            Price: Low to High
                        </SelectItem>
                        <SelectItem value="price-high" className="font-montserrat">
                            Price: High to Low
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </aside>
    )
}
