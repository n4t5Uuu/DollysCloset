"use client"

import {Input} from "@/components/ui/input"
import {Search} from "lucide-react"

import {useEffect, useRef, useState} from "react";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    initialQuery?: string;
}

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
                <Input 
                    type="text"
                    placeholder={placeholder}
                    className="w-full h-9 pl-4 pr-12 rounded-2xl border-black bg-white placeholder:text-black placeholder:font-montserrat"
                    value={query}
                    onChange={handleChange}
                />

                <div className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-px bg-black/20"></div>

                <button 
                    type="submit"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:text-[#E7A3B0] transition-colors cursor-pointer"
                    aria-label="Search"
                >
                    <Search className="w-4 h-4" />
                </button>
        </form>
    )
}
