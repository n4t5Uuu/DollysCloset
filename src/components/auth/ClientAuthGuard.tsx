"use client";

import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { buildLoginPath } from "@/lib/auth/auth-routing";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;
        const nextPath = `${window.location.pathname}${window.location.search}`;

        // Listen for auth state changes reactively on the client side.
        // SIGNED_OUT can fire because the user explicitly logged out (handled by
        // LogoutButton) OR because another device logged into the same account and
        // revoked this session. The ClientAuthGuard only reaches this handler in
        // the latter case, so we use "signed-out-elsewhere".
        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
                setIsAuthorized(false);
                toast.warning("You have been signed out because this account was logged in on another device.", { duration: 4000 });
                setTimeout(() => window.location.replace(buildLoginPath({ nextPath, reason: "signed-out-elsewhere" })), 2000);
                return;
            }

            if (session) {
                setIsAuthorized(true);
            }
        });

        async function checkAuth(isBackground = false) {
            // getSession() reads the local cookie — tells us if the browser thinks
            // it has a session. getUser() validates that session with the server.
            // If there's a local session but the server rejects it, the session was
            // revoked remotely (another device logged in). If there's no local
            // session at all, the user simply isn't logged in.
            const { data: { session: localSession } } = await browserSupabase.auth.getSession();
            const { data: { user } } = await browserSupabase.auth.getUser();

            if (!isMounted) return;

            if (!user) {
                setIsAuthorized(false);
                if (localSession) {
                    toast.warning("You have been signed out because this account was logged in on another device.", { duration: 4000 });
                    setTimeout(() => window.location.replace(buildLoginPath({ nextPath, reason: "signed-out-elsewhere" })), 2000);
                } else {
                    window.location.replace(buildLoginPath({ nextPath, reason: "login-required" }));
                }
            } else if (!isBackground) {
                setIsAuthorized(true);
            }
        }
        checkAuth();

        // Poll every 30 seconds to detect remote session revocation without
        // requiring user interaction. Also re-check immediately when the tab
        // regains focus (e.g. user switches back from another tab/window).
        const pollInterval = window.setInterval(() => checkAuth(true), 30_000);
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") checkAuth(true);
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            window.clearInterval(pollInterval);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    // Show a loading screen while checking auth securely on the client side
    // This prevents the page layout from "flashing" onto the screen
    if (isAuthorized !== true) {
        return (
            <div className="fixed inset-0 z-9999 flex h-screen w-full items-center justify-center bg-white/80 backdrop-blur-md">
                <Loader2 className="h-8 w-8 animate-spin text-[#E7A3B0]" />
            </div>
        );
    }

    return <>{children}</>;
}
