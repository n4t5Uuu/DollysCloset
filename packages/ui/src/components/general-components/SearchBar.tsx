"use client"

import { Input } from "../ui/input"
import { Search, X } from "lucide-react"
import { useEffect, useState } from "react";
import { useDebouncedSearch } from "@dollys-closet/core";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    initialQuery?: string;
}

export default function SearchBar({ onSearch, initialQuery = "" }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const { flush, clearAndNotify } = useDebouncedSearch({
        value: query,
        onDebouncedChange: (value) => onSearch?.(value),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        flush();
    }

    const clearSearch = () => {
        setQuery("");
        clearAndNotify();
    }

    const [placeholder, setPlaceholder] = useState("Search Products");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPlaceholder(window.innerWidth < 380 ? "Search..." : "Search Products");

            const handleResize = () => {
                setPlaceholder(window.innerWidth < 380 ? "Search..." : "Search Products");
            };

            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    return (
        <form
            onSubmit={handleSearch}
            className="relative w-full">
                <label htmlFor="catalog-search" className="sr-only">
                    Search products
                </label>
                <Input
                    id="catalog-search"
                    type="text"
                    placeholder={placeholder}
                    className="w-full h-9 pl-4 pr-20 rounded-2xl border-black bg-white placeholder:text-black placeholder:font-montserrat"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search products"
                />

                {query.trim() !== "" && (
                    <>
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-11 top-1/2 -translate-y-1/2 text-black/45 hover:text-[#E7A3B0] transition-colors cursor-pointer"
                            aria-label="Clear search"
                            title="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-px bg-black/20"></div>
                    </>
                )}

                <button
                    type="submit"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:text-[#E7A3B0] transition-colors cursor-pointer"
                    aria-label="Submit search"
                    title="Search products"
                >
                    <Search className="w-4 h-4" />
                </button>
        </form>
    )
}
