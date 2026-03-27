// components/navbar.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import noBgLogo from "@/assets/images/logo/no-bg-logo.png";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import UserProfileDropdown from "./LogoutButton";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = ["Dashboard","Collection", "About", "Contact"];

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const isDashboard = pathname.startsWith("/dashboard");

    return (
        <header className={cn(
            "w-full h-[80px] bg-white fixed top-0 z-50 transition-all duration-300",
            !isDashboard && "shadow-md"
        )}>
            <nav className="relative w-full h-full flex items-center justify-between px-6 md:px-8 lg:px-12 xl:px-20">
                
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="shrink-0">
                        <Image src={noBgLogo} alt="Dolly's Closet Logo" width={40} height={40} className="w-[35px] h-[35px] md:w-[40px] md:h-[40px] lg:w-[45px] lg:h-[45px] xl:w-[50px] xl:h-[50px]" />
                    </div>
                    <h2 className="text-[#E7A3B0] font-great-vibes! text-xl md:text-xl lg:text-2xl xl:text-4xl whitespace-nowrap">Dolly&apos;s Closet</h2>
                </div>

                {/* Desktop Navigation Links - Now flex-based for better flow */}
                <div className="hidden md:flex flex-1 items-center justify-center gap-4 lg:gap-8 xl:gap-10 px-4">
                    {navLinks.map((item) => (
                        <Link 
                            href={`/${item.toLowerCase()}`} 
                            key={item}
                            className="group relative"
                        >
                            <div>
                                <p className="text-black font-semibold text-sm lg:text-base xl:text-lg group-hover:text-[#E7A3B0] transition-all 
                                        duration-300 font-montserrat whitespace-nowrap">
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
                <div className="flex items-center gap-4 shrink-0">
                    {!isDashboard && (
                        <div className="hidden md:block">
                            <UserProfileDropdown />
                        </div>
                    )}
                    
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
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="md:hidden absolute top-[80px] left-0 w-full bg-white border-b shadow-lg z-40"
                        >
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
                                {!isDashboard && (
                                    <div className="w-full pt-2">
                                        <UserProfileDropdown variant="link" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}
