"use client";

import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { buildLoginPath } from "@/lib/auth-routing";
import { Loader2 } from "lucide-react";

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;
        const nextPath = `${window.location.pathname}${window.location.search}`;

        // Listen for auth state changes reactive-ly on the client side
        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_OUT') {
                setIsAuthorized(false);
                window.location.replace(buildLoginPath({ nextPath, reason: "session-expired" }));
                return;
            }

            if (!session) {
                setIsAuthorized(false);
                window.location.replace(buildLoginPath({ nextPath, reason: "session-expired" }));
            } else {
                setIsAuthorized(true);
            }
        });

        async function checkAuth() {
            const { data: { user } } = await browserSupabase.auth.getUser();

            if (isMounted) {
                if (!user) {
                    setIsAuthorized(false);
                    window.location.replace(buildLoginPath({ nextPath, reason: "session-expired" }));
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
    if (isAuthorized !== true) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-[#E7A3B0]" />
            </div>
        );
    }

    return <>{children}</>;
}
