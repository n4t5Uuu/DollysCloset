import { browserSupabase } from "./supabase/browser";

/**
 * A helper object containing methods for handling user authentication via Supabase.
 */
export const authHelper = {
    /**
     * Signs in a user with their email and password.
     * @param email - The user's email address.
     * @param password - The user's password.
     * @returns An object containing either the session data upon success, or an error.
     */
    async signIn(email: string, password: string) {
        const {data, error} = await browserSupabase.auth.signInWithPassword({
            email, 
            password
        })

        if (error) {
            console.warn("Error Signing In: ", error)
            return {data: null, error}
        }

        return { data, error };
    },

    /**
     * Retrieves the currently authenticated user from the current session.
     * It also automatically cleans up invalid refresh tokens if encountered.
     * @returns An object containing the current user, if any, and an error if one occurred.
     */
    async getUser() {
        const { data: { session }, error: sessionError } = await browserSupabase.auth.getSession();

        if (sessionError) {
            console.warn("Error Getting Session: ", sessionError)
            const errorMsg = sessionError.message.toLowerCase();
            const shouldClear = errorMsg.includes('invalid') || 
                                errorMsg.includes('refresh token') || 
                                errorMsg.includes('grant');

            if (shouldClear) {
                // Clear the defective token automatically so the user isn't stuck
                await browserSupabase.auth.signOut().catch(() => {});
                
                if (typeof window !== 'undefined') {
                    // Clear both localStorage and cookies starting with sb- to ensure full cleanup
                    for (const key of Object.keys(localStorage)) {
                        if (key.startsWith('supabase-auth-token') || key.includes('auth')) {
                            localStorage.removeItem(key);
                        }
                    }
                    
                    document.cookie.split(';').forEach((cookie) => {
                        const [name] = cookie.split('=');
                        if (name.trim().startsWith('sb-')) {
                            document.cookie = `${name.trim()}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                        }
                    });
                }
            }
            return { user: null, error: sessionError };
        }

        if (!session?.user) {
            return { user: null, error: null };
        }

        return { user: session.user, error: null };
    },

    
    /**
     * Retrieves the role associated with a specific user ID from the database.
     * @param user_id - The ID of the user whose role is being requested.
     * @param supabase - The Supabase client to use (defaults to browserSupabase).
     * @returns An object containing the user's role data or an error if the query fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getUserRole(user_id: string, supabase: any = browserSupabase) {
        const { data, error } = await supabase.from("tbl_users")
            .select("role")
            .eq("user_id", user_id)
            .maybeSingle();

        if (error) {
            console.error(`Error Fetching Role for User ${user_id}: `, error);
            throw error;
        }

        return { data, error };
    },

    /**
     * Signs out the currently authenticated user and terminates their session.
     * @returns An object indicating the success status of the sign-out operation and any associated error.
     */
    async signOut() {
        try {
            const { data: { user } } = await browserSupabase.auth.getUser();
            if (user) {
                await fetch("/api/auth/log-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: user.email,
                        actionType: "logout"
                    })
                });
            }
        } catch (logErr) {
            console.warn("Failed to log logout activity:", logErr);
        }

        const { error } = await browserSupabase.auth.signOut();

        if (error) {
            console.warn("Error Signing Out: ", error);
            return { success: false, error };
        }
        
        return { success: true, error: null };
    }
}