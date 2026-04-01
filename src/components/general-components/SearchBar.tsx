"use client"

import {Input} from "@/components/ui/input"
import {Search, X} from "lucide-react"

import {useEffect, useRef, useState} from "react";

/**
 * SearchBarProps Interface
 * @interface SearchBarProps
 * @property {function} [onSearch] - Callback triggered with the sanitized query string.
 * @property {string} [initialQuery] - Pre-filled value for the search input.
 */
interface SearchBarProps {
    onSearch?: (query: string) => void;
    initialQuery?: string;
}

/**
 * SearchBar Component
 * 
 * A high-quality, debounced search input field used across the product catalogs.
 * 
 * Implementation Details:
 * 1. Debouncing: Uses a 300ms window to delay triggering the `onSearch` callback, 
 *    ensuring efficient resource utilization during rapid typing.
 * 2. Clear Function: Explicitly resets the query and immediately notifies parent 
 *    components of the empty state.
 * 3. Responsive UI: Dynamically updates the placeholder text to "Search..." for 
 *    extremely narrow mobile displays (below 380px).
 */
export default function SearchBar({ onSearch, initialQuery = "" }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasMountedRef = useRef(false);
    const onSearchRef = useRef(onSearch);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        onSearchRef.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            onSearchRef.current?.(query);
        }, 300);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        onSearchRef.current?.(query);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    }

    const clearSearch = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setQuery("");
        onSearchRef.current?.("");
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
            className="relative w-full md:w-80">
                <label htmlFor="catalog-search" className="sr-only">
                    Search products
                </label>
                <Input 
                    id="catalog-search"
                    type="text"
                    placeholder={placeholder}
                    className="w-full h-9 pl-4 pr-20 rounded-2xl border-black bg-white placeholder:text-black placeholder:font-montserrat"
                    value={query}
                    onChange={handleChange}
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
