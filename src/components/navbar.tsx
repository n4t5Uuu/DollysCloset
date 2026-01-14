// components/navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";
import { LayoutDashboard, LogOut, ChevronDown, User } from "lucide-react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Function to fetch user role
    async function fetchUserRole(userId: string) {
        const { data: userData } = await browserSupabase
            .from('tbl_users')
            .select('role')
            .eq('user_id', userId)
            .single();
        
        setUserRole(userData?.role || null);
    }

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await browserSupabase.auth.getUser();
            setUser(user);

            if (user) {
                await fetchUserRole(user.id);
            }
            setLoading(false);
        }

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user || null);
            
            if (session?.user) {
                // Fetch role when user signs in
                await fetchUserRole(session.user.id);
            } else {
                // Clear role when user signs out
                setUserRole(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleLogout() {
        setIsLoggingOut(true);
        await browserSupabase.auth.signOut();
        setUser(null);
        setUserRole(null);
        setIsDropdownOpen(false);
        router.refresh();
        router.push('/staff-login');
    }

    const getDashboardLink = () => {
        if (userRole === 'admin') return '/admin/dashboard';
        if (userRole === 'employee') return '/employee/dashboard';
        return '/';
    };

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase();
    };

    const getRoleBadge = () => {
        if (userRole === 'admin') return '👑 Admin';
        if (userRole === 'employee') return '💼 Staff';
        return 'User';
    };

    return (
        <header className="w-full h-[80px] bg-[#fcfcfc] fixed top-0 z-50 shadow-md">
            <nav className="relative w-full h-full flex items-center px-20">
                
                <div className="flex items-center gap-5">
                    <Image src="/assets/no-bg-logo.png" alt="Dolly's Closet Logo" width={60} height={60} />
                    <h2 className="text-[#E7A3B0] text-2xl !font-great-vibes text-3xl">Dolly's Closet</h2>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-10">
                    {["Collection", "About", "Contact"].map((item) => (
                        <Link 
                            href={item === "Collection" ? "/" : `/${item.toLowerCase()}`} 
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
                    {!loading && user && (
                        <div className="relative" ref={dropdownRef}>
                            {/* Profile Button */}
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r 
                                    from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] 
                                    transition-all duration-300 shadow-md hover:shadow-lg group"
                            >
                                {/* Avatar Circle */}
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center 
                                    text-[#E7A3B0] font-bold text-sm shadow-inner">
                                    {getInitials(user.email)}
                                </div>
                                
                                {/* User Info */}
                                <div className="flex flex-col items-start">
                                    <span className="text-white font-semibold text-sm leading-none">
                                        {user.email.split('@')[0]}
                                    </span>
                                    <span className="text-white/80 text-xs leading-none mt-0.5">
                                        {getRoleBadge()}
                                    </span>
                                </div>

                                {/* Dropdown Arrow */}
                                <ChevronDown 
                                    className={`w-4 h-4 text-white transition-transform duration-300 
                                        ${isDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            <div
                                className={`absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl 
                                    overflow-hidden transition-all duration-300 origin-top-right border border-gray-100
                                    ${isDropdownOpen 
                                        ? 'opacity-100 scale-100 translate-y-0' 
                                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                                    }`}
                            >
                                {/* User Info Section */}
                                <div className="px-4 py-3 bg-gradient-to-r from-[#E7A3B0] to-[#f0b8c3]">
                                    <p className="text-white font-semibold text-sm truncate">
                                        {user.email}
                                    </p>
                                    <p className="text-white/90 text-xs mt-0.5">
                                        {getRoleBadge()}
                                    </p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2">
                                    <Link
                                        href={getDashboardLink()}
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#E7A3B0]/10 
                                            transition-colors duration-200 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-[#E7A3B0]/10 flex items-center 
                                            justify-center group-hover:bg-[#E7A3B0]/20 transition-colors">
                                            <LayoutDashboard className="w-4 h-4 text-[#E7A3B0]" />
                                        </div>
                                        <span className="text-gray-700 font-medium text-sm">Dashboard</span>
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 group ${
                                            isLoggingOut 
                                            ? 'opacity-60 cursor-not-allowed' 
                                            : 'hover:bg-red-50'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                            isLoggingOut 
                                                ? 'bg-gray-200' 
                                                : 'bg-red-50 group-hover:bg-red-100'
                                            }`}>
                                            <LogOut className={`w-4 h-4 ${isLoggingOut ? 'text-gray-400 animate-spin' : 'text-red-500'}`} />
                                        </div>
                                        <span className={`font-medium text-sm ${isLoggingOut ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}