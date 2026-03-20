import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { authHelper } from "@/lib/auth-helper";
import { User } from "@supabase/supabase-js";

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
     * Fetches the user's role from the 'tbl_users' table.
     * This is critical for determining if the user should see the Admin or Employee dashboard.
     */
    async function fetchUserRole(userId: string) {
        const { data } = await authHelper.getUserRole(userId);
        setUserRole(data?.role || null);
    }

    // Initialize user state and set up realtime auth listener
    useEffect(() => {
        async function getUser() {
            try {
                const { user, error } = await authHelper.getUser();
                
                if (error) {
                    console.warn("Auth session not available:", error);
                    setUser(null);
                    setLoading(false);
                    return;
                }
                
                setUser(user || null);

                if (user) {
                    await fetchUserRole(user.id);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                setUser(null);
                setLoading(false);
            }
        }

        getUser();

        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user || null);
            
            if (session?.user) {
                await fetchUserRole(session.user.id);
            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Log logout securely on window/tab closing
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (user) {
                const payload = JSON.stringify({
                    user_id: user.id,
                    email: user.email,
                    actionType: "logout"
                });
                
                const blob = new Blob([payload], { type: "application/json" });
                navigator.sendBeacon("/api/auth/log-login", blob);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [user]);

    /**
     * Signs out the current user and clears local state.
     * Redirects are typically handled by the component calling this or the auth listener.
     */
    const signOut = async () => {
        await authHelper.signOut();
        setUser(null);
        setUserRole(null);
    };

    return {
        user,
        userRole,
        loading,
        signOut
    };
}
