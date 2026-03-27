"use client"

import {Input} from "@/components/ui/input"
import {Search} from "lucide-react"

import {useEffect, useState} from "react";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    initialQuery?: string;
}

export default function SearchBar({ onSearch, initialQuery = "" }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(query);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        // Optional: live search as the user types
        onSearch?.(value);
    }

    return (
        // check kung ano ilalagay here sa action pero baka iba sa supabase (?)
        <form 
            onSubmit={handleSearch} 
            action="GET" 
            className="relative w-full md:w-80">
                <Input 
                    type="text"
                    placeholder={window.innerWidth < 380 ? "Search..." : "Search Products"}
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
