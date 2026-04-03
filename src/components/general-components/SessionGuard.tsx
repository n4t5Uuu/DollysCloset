"use client";

import { useEffect } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { usePathname, useRouter } from "next/navigation";

/**
 * SessionGuard Component
 * 
 * Enforces a strict tab-lifecycle policy. Since modern browsers often restore 
 * cookies across tab closures, the only reliable way to ensure a session 
 * "dies" with the tab is to use sessionStorage.
 * 
 * If a user opens a new tab and attempts to access a protected route 
 * using restored cookies, this guard will detect the fresh tab and 
 * force a logout.
 */
export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Skip logical segments that don't need protection or are part of auth flow.
    if (pathname.includes("/login") || pathname.includes("/unauthorized") || pathname.includes("/reset-password")) {
      sessionStorage.setItem("dollys_closet_tab_active", "true");
      return;
    }

    const isTabActive = sessionStorage.getItem("dollys_closet_tab_active");
    // `/dashboard` is the canonical protected app shell. Legacy `/admin` and
    // `/employee` URLs redirect into it at the route level.
    const isProtectedRoute = pathname.startsWith("/dashboard");

    if (!isTabActive && isProtectedRoute) {
      // This is a new tab accessing a protected route.
      // Force a logout to ensure strict session-per-tab logic (or session end on tab end).
      console.warn("SessionGuard: New tab detected with potential ghost session. Clearing.");
      
      const clearSession = async () => {
        // Clear all session storage first
        sessionStorage.clear();
        // Force the browser to drop all auth cookies
        await browserSupabase.auth.signOut();
        // Redirect to login explicitly to trigger clean state
        router.replace("/login?reason=session-expired");
      };

      clearSession();
    } else {
      // Mark this tab as active if it's not already.
      sessionStorage.setItem("dollys_closet_tab_active", "true");
    }
  }, [pathname, router]);

  return null;
}
