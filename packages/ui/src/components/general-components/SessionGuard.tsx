"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@dollys-closet/core";

export function SessionGuard() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (pathname === "/" || pathname.includes("/login") || pathname.includes("/unauthorized") || pathname.includes("/reset-password")) {
            sessionStorage.setItem("dollys_closet_tab_active", "true");
            return;
        }

        const isTabActive = sessionStorage.getItem("dollys_closet_tab_active");
        const isProtectedRoute = pathname.startsWith("/dashboard");

        if (!isTabActive && isProtectedRoute) {
            const clearSession = async () => {
                const supabase = createClient();
                sessionStorage.clear();
                await supabase.auth.signOut();
                router.replace("/?reason=session-expired");
            };

            void clearSession();
        } else {
            sessionStorage.setItem("dollys_closet_tab_active", "true");
        }
    }, [pathname, router]);

    return null;
}
