import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { authHelper } from "@/lib/auth/auth-helper";
import { Session, User } from "@supabase/supabase-js";

/**
 * Custom hook to manage user authentication and role-based access control.
 * 
 * This hook serves as the central point for:
 * 1. Tracking the current authenticated user session
 * 2. Asynchronously fetching and managing the user's role (admin/employee)
 * 3. Handling authentication state changes (login/logout) via Supabase realtime subscriptions
 * 
 * @returns An object containing:
 * - user: The current Supabase user object or null
 * - userRole: The role of the user ('admin' | 'employee') for permission checking
 * - loading: Boolean indicating if auth state is still being determined
 * - signOut: Helper function to securely sign out the user
 */ 
export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Retrieves the user's role (admin/employee) from the server-side profile API.
     * Validates the response against the current user ID to prevent role leakage.
     * @param userId - The ID of the currently authenticated user.
     */
    async function fetchUserRole(userId: string) {
        try {
            const response = await fetch("/api/auth/profile", { cache: "no-store" });

            if (!response.ok) {
                setUserRole(null);
                return;
            }

            const result = await response.json();
            const role = result?.data?.role;

            if (userId === result?.data?.userId && (role === "admin" || role === "employee")) {
                setUserRole(role);
                return;
            }

            setUserRole(null);
        } catch (error) {
            console.error("Error fetching user role:", error);
            setUserRole(null);
        }
    }

    // Initialize user state and set up realtime auth listener
    useEffect(() => {
        let isMounted = true;

        /**
         * Core session-to-state mapper. Updates local React state based on 
         * Supabase session data asynchronously.
         * @param session - The Supabase session object.
         */
        const applySession = async (session: Session | null) => {
            if (!isMounted) {
                return;
            }

            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            setLoading(false);

            if (sessionUser) {
                await fetchUserRole(sessionUser.id);
                return;
            }

            setUserRole(null);
        };

        /**
         * Initial auth bootstrapper. Attempts to read the session from the browser 
         * and then verifies it against the server for maximum security.
         */
        async function bootstrapUser() {
            try {
                // Read the browser session first so session-aware UI can render immediately.
                const { data: { session } } = await browserSupabase.auth.getSession();
                await applySession(session);

                const { user, error } = await authHelper.getUser();

                if (!isMounted) {
                    return;
                }

                if (error) {
                    console.warn("Auth session not available:", error);
                    setUser(null);
                    setUserRole(null);
                    setLoading(false);
                    return;
                }

                if (user) {
                    setUser(user);
                    await fetchUserRole(user.id);
                } else {
                    setUser(null);
                    setUserRole(null);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching user:", error);
                if (!isMounted) {
                    return;
                }
                setUser(null);
                setUserRole(null);
                setLoading(false);
            }
        }

        bootstrapUser();

        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (_event, session) => {
            await applySession(session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    /**
     * Signs out the current user and clears local state.
     * Redirects are typically handled by the component calling this or the auth listener.
     */
    const signOut = async () => {
        const result = await authHelper.signOut();
        setUser(null);
        setUserRole(null);
        return result;
    };

    return {
        user,
        userRole,
        loading,
        signOut
    };
}
