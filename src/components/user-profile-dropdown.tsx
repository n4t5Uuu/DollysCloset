"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function UserProfileDropdown() {
    const router = useRouter();
    const { user, userRole, loading, signOut } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await signOut();
        setIsDropdownOpen(false);
        router.refresh();
        router.push('/login');
    };

    const getDashboardLink = () => {
        if (userRole === 'admin' || userRole === 'employee') return '/dashboard';
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

    if (loading || !user || !user.email) {
        return null; // Don't render anything if loading or not logged in
    }

    return (
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
    );
}
