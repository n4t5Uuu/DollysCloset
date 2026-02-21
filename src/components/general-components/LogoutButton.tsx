"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function LogoutButton() {
    const router = useRouter();
    const { user, loading, signOut } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await signOut();

        // Redirects to the login page after logging out 
        // overwrites the browser history to prevent going back to the dashboard
        router.replace('/');
    };

    // Don't render anything if loading or not logged in
    if (loading || !user) {
        return null;
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r 
                from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] 
                transition-all duration-300 shadow-md hover:shadow-lg text-white font-medium
                disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
        >
            {isLoggingOut ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging out...</span>
                </>
            ) : (
                <>
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </>
            )}
        </button>
    );
}
