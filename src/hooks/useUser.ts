import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";
import { User } from "@supabase/supabase-js";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchUserRole(userId: string) {
        const { data } = await dataHelper.getUserRole(userId);
        setUserRole(data?.role || null);
    }

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
