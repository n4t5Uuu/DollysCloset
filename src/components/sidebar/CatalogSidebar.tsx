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

import Link from "next/link";

interface CatalogSidebarProps {
    activeFilter: string;
    sortBy: string;
    onFilterChange: (filter: string) => void;
    onSortChange: (sort: string) => void;
}

export default function CatalogSidebar({ activeFilter, sortBy, onFilterChange, onSortChange }: CatalogSidebarProps) {
    const handleFilterChange = (filter: string) => {
        onFilterChange(filter);
    };

    const handleSortChange = (sort: string) => {
        onSortChange(sort);
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
                        onClick={() => handleFilterChange("All Products")}
                        className={cn("text-left font-montserrat text-base font-medium tracking-wide transition-colors duration-200 hover:text-[#E7A3B0]", 
                                activeFilter === "All Products" ? "text-[#E7A3B0] font-bold" : "text-gray-600")}
                    >
                        All Products
                    </button>

                    <button 
                        onClick={() => handleFilterChange("New Arrivals")}
                        className={cn("text-left font-montserrat text-base font-medium tracking-wide transition-colors duration-200 hover:text-[#E7A3B0]", 
                                activeFilter === "New Arrivals" ? "text-[#E7A3B0] font-bold" : "text-gray-600")}
                    
                    >
                        New Arrivals
                    </button>

                    {/**Expandable Items */}
                    <Accordion type="single" collapsible className="w-full -ml-1" defaultValue="item-1">

                        {/**Men Tops */}
                        <AccordionItem value="item-1" className="border-none" >
                            <AccordionTrigger className={cn("font-montserrat text-base font-medium tracking-wide cursor-pointer py-2 hover:text-[#E7A3B0] hover:no-underline",
                                    activeFilter === "Men's Top" && "text-[#E7A3B0]")}
                            >
                                Men Tops
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Teenagers", "Long Sleeves", "Polo"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer hover:text-[#E7A3B0]",
                                        activeFilter === subcategory 
                                            ? "text-[#E7A3B0] font-bold" 
                                            : "text-gray-500")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>

                        {/**Women Tops */}
                        <AccordionItem value="item-2" className="border-none">
                            <AccordionTrigger className={cn("font-montserrat text-base font-medium tracking-wide cursor-pointer py-2 hover:text-[#E7A3B0] hover:no-underline",
                                    activeFilter === "Women's Top" && "text-[#E7A3B0]")}
                            >
                                Women Tops
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Blouses", "Tees"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer hover:text-[#E7A3B0]",
                                        activeFilter === subcategory 
                                            ? "text-[#E7A3B0] font-bold" 
                                            : "text-gray-500")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                        
                        {/**Coords */}
                        <AccordionItem value="item-3" className="border-none">
                            <AccordionTrigger className={cn("font-montserrat text-base font-medium tracking-wide cursor-pointer py-2 hover:text-[#E7A3B0] hover:no-underline",
                                    activeFilter === "Coords" && "text-[#E7A3B0]")}
                            >
                                Coords
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Hoodies", "Training"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer hover:text-[#E7A3B0]",
                                        activeFilter === subcategory 
                                            ? "text-[#E7A3B0] font-bold" 
                                            : "text-gray-500")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>

                        {/**Seasonal */}
                        <AccordionItem value="item-4" className="border-none">
                            <AccordionTrigger className={cn("font-montserrat text-base font-medium tracking-wide cursor-pointer py-2 hover:text-[#E7A3B0] hover:no-underline",
                                    activeFilter === "Seasonal" && "text-[#E7A3B0]")}
                            >
                                Seasonal
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Jackets", "Raincoat"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-sm font-montserrat py-1 transition-colors w-full cursor-pointer hover:text-[#E7A3B0]",
                                        activeFilter === subcategory 
                                            ? "text-[#E7A3B0] font-bold" 
                                            : "text-gray-500")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
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
                            Newest Arrivals
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
