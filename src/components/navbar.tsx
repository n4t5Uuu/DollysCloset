// components/navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import UserProfileDropdown from "./logout-button";

const navLinks = ["Dashboard","Collection", "About", "Contact"];

export default function Navbar() {
    return (
        <header className="w-full h-[80px] bg-[#fcfcfc] fixed top-0 z-50 shadow-md">
            <nav className="relative w-full h-full flex items-center px-20">
                
                <div className="flex items-center gap-5">
                    <Image src="/assets/no-bg-logo.png" alt="Dolly's Closet Logo" width={60} height={60} />
                    <h2 className="text-[#E7A3B0] text-2xl !font-great-vibes text-3xl">Dolly's Closet</h2>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-10">
                    {navLinks.map((item) => (
                        <Link 
                            href={`/${item.toLowerCase()}`} 
                            key={item}
                            className="group relative"
                        >
                            <div>
                                <p className="text-black font-semibold text-lg group-hover:text-[#E7A3B0] transition-all 
                                        duration-300 font-montserrat">
                                    {item}
                                </p>

                                <span 
                                    className="absolute left-0 -bottom-0.5 h-1 w-0 bg-[#E7A3B0] transition-all 
                                        duration-300 group-hover:w-full"
                                >
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* User Profile Dropdown */}
                <div className="ml-auto flex items-center gap-4">
                    <UserProfileDropdown />
                </div>
            </nav>
        </header>
    );
}
