"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { browserSupabase } from "../lib/supabase/browser";
import { authHelper } from "../lib/auth/auth-helper";

export type UserRole = "admin" | "employee" | null;

interface UserContextType {
    user: User | null;
    userRole: UserRole;
    loading: boolean;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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

    useEffect(() => {
        let isMounted = true;

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
                const { data: { session } } = await browserSupabase.auth.getSession();
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
        const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (_event, session) => {
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

    return (
        <UserContext.Provider value={{ user, userRole, loading, signOut }}>
            {children}
        </UserContext.Provider>
    );
}

/**
 * Internal hook used only for the context consumer.
 */
export function useUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
