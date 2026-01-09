"use client"

import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Search} from "lucide-react"

import {useState} from "react";

export default function SearchBar() {
    const [query, setQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        console.log("Searching for: ",query);
    }

    return (
        // check kung ano ilalagay here sa action pero baka iba sa supabase (?)
        <form 
            onSubmit={handleSearch} 
            action="GET" 
            className="relative">
                <Input 
                    type="text"
                    placeholder="Search Products"
                    className="w-80 h-9 pl-4 rounded-2xl borderborder-black bg-white placeholder:text-black placeholder:font-montserrat"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <div className="absolute right-10 top-1/2 -translate-y-1/2 h-9 w-px bg-black"></div>

                <button 
                    type="submit"
                    className="absolute right-3.5 top-1/2 -translate-y-[8.5px] text-black hover:text-black/70 transition-colors cursor-pointer"
                    aria-label="Search"
                >
                    <Search className="w-4 h-4" />
                </button>
        </form>
    )
}