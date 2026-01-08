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

import {useState} from "react";

export default function CatalogSidebar() {
    const [activeFilter, setActiveFilter] = useState("All Products");

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);

        console.log("Filtering to ", filter);
    };

    return(
        <aside className="w-64 flex flex-col gap-8 pb-10">

            {/*CATEGORIES SECTION */}
            <div className="space-y-6">
                <h3 className="font-oswald text-2xl font-bold uppercase tracking-wide">
                    Categories:
                </h3>

                {/**Static Items */}
                <div className="flex flex-col gap-2 pl-1 ">
                    <Link 
                        href="/" 
                        onClick={() => handleFilterChange("All Products")}
                        className={cn("font-montserrat text-lg font-bold uppercase tracking-wide", 
                                activeFilter === "All Products" && "bg-[#E679A3] text-[#121212] px-2 py-1 rounded-lg")}
                    >
                        All Products
                    </Link>

                    <Link 
                        href="/"
                        onClick={() => handleFilterChange("New Arrivals")}
                        className={cn("font-montserrat text-lg font-bold uppercase tracking-wide", 
                                activeFilter === "New Arrivals" && "bg-[#E679A3] text-[#121212] px-2 py-1 rounded-lg")}
                    
                    >
                        New Arrivals
                    </Link>

                    {/**Expandable Items */}
                    <Accordion type="single" collapsible className="w-full text-black -mt-3" defaultValue="item-1">

                        {/**Men Tops */}
                        <AccordionItem value="item-1" >
                            <AccordionTrigger className="font-montserrat text-lg font-bold uppercase tracking-wide cursor-pointer">
                                Men Tops
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Teenagers", "Long Sleeves", "Polo"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-lg font-montserrat px-3 py-1 font-medium rounded-md transition-colors w-full cursor-pointer",
                                        activeFilter === subcategory 
                                            ? "bg-[#E7A3B0] text-black font-bold" // Pink Active State
                                            : "text-gray-500 hover:text-black")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>

                        {/**Women Tops */}
                        <AccordionItem value="item-2" >
                            <AccordionTrigger className="font-montserrat text-lg font-bold uppercase tracking-wide cursor-pointer">
                                Women Tops
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Blouses", "Tees"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-lg font-montserrat px-3 py-1 font-bold rounded-md transition-colors w-full cursor-pointer",
                                        activeFilter === subcategory 
                                            ? "bg-[#E7A3B0] text-black font-bold" // Pink Active State
                                            : "text-gray-500 hover:text-black")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                        
                        {/**Coords */}
                        <AccordionItem value="item-3" >
                            <AccordionTrigger className="font-montserrat text-lg font-bold uppercase tracking-wide cursor-pointer">
                                Coords
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Hoodies", "Training"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-lg font-montserrat px-3 py-1 font-bold rounded-md transition-colors w-full cursor-pointer",
                                        activeFilter === subcategory 
                                            ? "bg-[#E7A3B0] text-black font-bold" // Pink Active State
                                            : "text-gray-500 hover:text-black")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>

                        {/**Seasonal */}
                        <AccordionItem value="item-4" >
                            <AccordionTrigger className="font-montserrat text-lg font-bold uppercase tracking-wide cursor-pointer">
                                Seasonal
                            </AccordionTrigger>

                            <AccordionContent className="flex flex-col gap-2 pl-4 pt-1 pb-2">
                                {["Jackets", "Raincoat"].map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => handleFilterChange(subcategory)}
                                        className={cn("text-left text-lg font-montserrat px-3 font-medium py-1 rounded-md transition-colors w-full cursor-pointer",
                                        activeFilter === subcategory 
                                            ? "bg-[#E7A3B0] text-black font-bold" // Pink Active State
                                            : "text-gray-500 hover:text-black")}
                                    >
                                        {subcategory}
                                    </button>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/**Sort by */}
                <div className="space-y-3">
                    <h3 className="font-oswald text-2xl font-bold tracking-wide uppercase">
                        Sort by:
                    </h3>
                </div>
                <Select defaultValue="newest">
                    <SelectTrigger className="w-full bg-gray-100 border-none rounded-md font-montserrat text-sm focus:ring-0 text-black">
                        <SelectValue placeholder="Sort option" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">
                            Newest Arrivals
                        </SelectItem>
                        <SelectItem value="price-low">
                            Price: Low to High
                        </SelectItem>
                        <SelectItem value="price-high">
                            Price: High to Low
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </aside>
    )
}
