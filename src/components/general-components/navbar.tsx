// components/navbar.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import noBgLogo from "@/assets/images/logo/no-bg-logo.png";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import UserProfileDropdown from "./LogoutButton";

const navLinks = ["Dashboard","Collection", "About", "Contact"];

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="w-full h-[80px] bg-[#fcfcfc] fixed top-0 z-50 shadow-md">
            <nav className="relative w-full h-full flex items-center justify-between px-6 md:px-20">
                
                <div className="flex items-center gap-3">
                    <div className="shrink-0">
                        <Image src={noBgLogo} alt="Dolly's Closet Logo" width={50} height={50} />
                    </div>
                    <h2 className="text-[#E7A3B0] font-great-vibes! text-2xl md:text-3xl whitespace-nowrap">Dolly&apos;s Closet</h2>
                </div>

                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-10">
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
                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        <UserProfileDropdown />
                    </div>
                    
                    {/* Mobile Menu Trigger */}
                    <button 
                        className="md:hidden text-gray-700 hover:text-[#E7A3B0] transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-[80px] left-0 w-full bg-white border-b shadow-lg z-40 animate-in slide-in-from-top duration-200">
                        <div className="flex flex-col items-center py-6 space-y-4 px-6">
                            {navLinks.map((item) => (
                                <Link 
                                    href={`/${item.toLowerCase()}`} 
                                    key={item}
                                    className="text-gray-800 font-semibold text-lg hover:text-[#E7A3B0] transition-colors font-montserrat w-full text-center py-2"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {item}
                                </Link>
                            ))}
                            <hr className="w-full border-gray-100 my-2" />
                            <div className="pt-2">
                                <UserProfileDropdown />
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
