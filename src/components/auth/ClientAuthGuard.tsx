"use client";

import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Loader2 } from "lucide-react";

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function checkAuth() {
            const { data: { session } } = await browserSupabase.auth.getSession();
            
            if (!session) {
                if (isMounted) {
                    window.location.replace("/unauthorized");
                }
            } else {
                if (isMounted) setIsAuthorized(true);
            }
        }
        checkAuth();
        return () => { isMounted = false; };
    }, []);

    // Show a loading screen while checking auth securely on the client side
    // This prevents the page layout from "flashing" onto the screen
    if (isAuthorized === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-[#E7A3B0]" />
            </div>
        );
    }

    return <>{children}</>;
}
