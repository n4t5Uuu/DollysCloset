"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { browserSupabase } from "@/lib/supabase/browser";
import { authHelper } from "@/lib/auth-helper";

export default function LogoutButton() {
    const { user, loading, signOut } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            const { data: { session } } = await browserSupabase.auth.getSession();
            const accessToken = session?.access_token;

            // Log before signOut so the token is still valid when the audit request lands
            if (accessToken) {
                await authHelper.logAuthEvent("logout", accessToken);
            }

            await signOut();
        } catch (error) {
            console.error(error);
        }

        window.location.replace("/");
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
