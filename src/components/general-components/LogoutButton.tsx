"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function LogoutButton() {
    const router = useRouter();
    const { user, loading, signOut } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        setIsLoggingOut(true);
        
        try {
            signOut(); // Fire and forget in parallel
        } catch (error) {
            console.error(error);
        }

        // Force a hard navigation to clear the Next.js client-side router cache.
        // We use assign() instead of replace() so that the browser history saves the
        // dashboard page. That way, if the user hits the Back button, the browser
        // tries to load the dashboard again, hits our middleware, and redirects
        // them to the unauthorized error page instead of back to login!
        window.location.assign('/');
    };

    // Don't render anything if loading or not logged in
    if (loading || !user) {
        return null;
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-linear-to-r 
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
