"use client";

import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Loader2 } from "lucide-react";

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(true);

    useEffect(() => {
        let isMounted = true;

        // Listen for auth state changes reactive-ly on the client side
        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_OUT') {
                window.location.replace("/");
                return;
            }

            if (!session) {
                window.location.replace("/unauthorized");
            } else {
                setIsAuthorized(true);
            }
        });

        async function checkAuth() {
            const { data: { session } } = await browserSupabase.auth.getSession();
            
            if (isMounted) {
                if (!session) {
                    window.location.replace("/unauthorized");
                } else {
                    setIsAuthorized(true);
                }
            }
        }
        checkAuth();

        return () => { 
            isMounted = false; 
            subscription.unsubscribe();
        };
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
