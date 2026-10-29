"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/browser";
import { authHelper } from "../lib/auth/auth-helper";

export type UserRole = "admin" | "employee" | null;

export interface UserContextValue {
    user: User | null;
    userRole: UserRole;
    loading: boolean;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * UserProvider Component
 * 
 * Centralizes authentication and role-based access control state.
 * This ensures that session listening and role fetching happen only once per app lifecycle.
 */
export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    async function fetchUserRole(userId: string) {
        setUserRole(await authHelper.getProfileRole(userId));
    }

    useEffect(() => {
        let isMounted = true;
        const supabase = createClient();

        const applySession = async (session: Session | null) => {
            if (!isMounted) return;

            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            
            if (sessionUser) {
                await fetchUserRole(sessionUser.id);
            } else {
                setUserRole(null);
            }
            setLoading(false);
        };

        async function bootstrapUser() {
            try {
                // Quick check for existing session
                const { data: { session } } = await supabase.auth.getSession();
                await applySession(session);

                // Deep verify session against server
                const { user: verifiedUser, error } = await authHelper.getUser();
                if (!isMounted) return;

                if (error || !verifiedUser) {
                    setUser(null);
                    setUserRole(null);
                } else {
                    setUser(verifiedUser);
                    await fetchUserRole(verifiedUser.id);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error bootstrapping user:", error);
                if (isMounted) setLoading(false);
            }
        }

        bootstrapUser();

        // Listen for auth state changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await applySession(session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);


    const signOut = async () => {
        await authHelper.signOut();
        setUser(null);
        setUserRole(null);
    };

    const value = useMemo(() => ({ user, userRole, loading, signOut }), [user, userRole, loading]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

/**
 * Internal hook used only for the context consumer.
 */
export function useUserContext(): UserContextValue {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
