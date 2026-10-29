// components/navbar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import UserProfileDropdown from "./LogoutButton";
import { SidebarTrigger } from "../ui/sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@dollys-closet/core";

const DEFAULT_NAV_LINKS = ["Dashboard", "Collection", "About", "Contact"];

interface NavbarProps {
    navLinks?: string[];
    showLogout?: boolean;
}

export default function Navbar({ navLinks = DEFAULT_NAV_LINKS, showLogout = true }: NavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollDelta = useRef(0);
    const THRESHOLD = 80;
    const pathname = usePathname();
    const hasDashboardLink = navLinks.some((link) => link.toLowerCase() === "dashboard");
    const isDashboard = hasDashboardLink && pathname.startsWith("/dashboard");

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const diff = currentScrollY - lastScrollY.current;
            lastScrollY.current = currentScrollY;

            if (currentScrollY < 10) {
                scrollDelta.current = 0;
                setIsVisible(true);
                return;
            }

            scrollDelta.current += diff;

            if (scrollDelta.current > THRESHOLD) {
                scrollDelta.current = 0;
                setIsVisible(false);
                setIsMenuOpen(false);
            } else if (scrollDelta.current < -THRESHOLD) {
                scrollDelta.current = 0;
                setIsVisible(true);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--navbar-h',
            isVisible ? '80px' : '0px'
        );
    }, [isVisible]);

    return (
        <header className={cn(
            "w-full h-20 bg-white fixed top-0 z-50 transition-all duration-300",
            !isDashboard && "shadow-md",
            !isVisible && "md:translate-y-0 -translate-y-full"
        )}>
            <nav className="relative w-full h-full flex items-center px-6 md:px-8 lg:px-12 xl:px-20">
                
                {/* Left Section: Sidebar Trigger (Mobile Dashboard) */}
                <div className="flex-1 flex items-center md:hidden shrink-0">
                    {isDashboard && (
                        <SidebarTrigger className="text-gray-700 hover:text-[#E7A3B0] transition-colors" />
                    )}
                </div>

                {/* Center Section (Mobile) / Left Section (Desktop): Logo */}
                <Link href="/" className={cn(
                    "flex items-center gap-2 md:gap-3 transition-all duration-300 shrink-0 md:flex-1",
                    "absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
                )}>
                    <div className="shrink-0">
                        <Image
                            src="/images/logo/no-bg-logo.png"
                            alt="Dolly's Closet Logo"
                            width={50}
                            height={50}
                            className="w-[45px] h-[45px] md:w-10 md:h-10 lg:w-[45px] lg:h-[45px] xl:w-[50px] xl:h-[50px]"
                        />
                    </div>
                    <h2 className="text-[#E7A3B0] font-great-vibes! text-xl md:text-xl lg:text-2xl xl:text-4xl whitespace-nowrap hidden md:block">
                        Dolly&apos;s Closet
                    </h2>
                </Link>

                {/* Desktop Navigation Links - Now flex-based for better flow */}
                <div className="hidden md:flex flex-1 items-center justify-center gap-4 lg:gap-8 xl:gap-10 px-4">
                    {navLinks.map((item) => {
                        const href     = `/${item.toLowerCase()}`;
                        const isActive = pathname === href || pathname.startsWith(`${href}/`);
                        return (
                            <Link
                                href={href}
                                key={item}
                                className="group relative"
                            >
                                <div>
                                    <p className={cn(
                                        "font-semibold text-sm lg:text-base xl:text-lg transition-all duration-300 font-montserrat whitespace-nowrap",
                                        isActive ? "text-[#E7A3B0]" : "text-black group-hover:text-[#E7A3B0]"
                                    )}>
                                        {item}
                                    </p>
                                    <span className={cn(
                                        "absolute left-0 -bottom-0.5 h-1 bg-[#E7A3B0] transition-all duration-300",
                                        isActive ? "w-full" : "w-0 group-hover:w-full"
                                    )} />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Right Section: Hamburger / User Dropdown */}
                <div className="flex-1 flex items-center justify-end gap-4 shrink-0">
                    {!isDashboard && showLogout && (
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
                        <m.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="md:hidden absolute top-20 left-0 w-full bg-white border-b shadow-lg z-40"
                        >
                            <div className="flex flex-col items-center py-6 space-y-4 px-6">
                                {navLinks.map((item) => {
                                    const href     = `/${item.toLowerCase()}`;
                                    const isActive = pathname === href || pathname.startsWith(`${href}/`);
                                    return (
                                        <Link
                                            href={href}
                                            key={item}
                                            className={cn(
                                                "font-semibold text-lg transition-colors font-montserrat w-full text-center py-2",
                                                isActive ? "text-[#E7A3B0] underline underline-offset-4 decoration-2" : "text-gray-800 hover:text-[#E7A3B0]"
                                            )}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item}
                                        </Link>
                                    );
                                })}
                                {!isDashboard && showLogout && (
                                    <div className="w-full pt-2">
                                        <UserProfileDropdown variant="link" />
                                    </div>
                                )}
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
    
}
