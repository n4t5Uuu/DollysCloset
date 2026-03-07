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
            if (sessionError.message.includes('Invalid Refresh Token') || sessionError.message.includes('Refresh Token Not Found')) {
                // Clear the defective token automatically so the user isn't stuck
                await browserSupabase.auth.signOut().catch(() => {});
                // Optional: also clear localStorage directly just in case signOut fails
                if (typeof window !== 'undefined') {
                    for (const key of Object.keys(localStorage)) {
                        if (key.startsWith('supabase-auth-token')) localStorage.removeItem(key);
                    }
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
            .single()

            if(error)
                throw error

        return { data, error };
    },

    /**
     * Signs out the currently authenticated user and terminates their session.
     * @returns An object indicating the success status of the sign-out operation and any associated error.
     */
    async signOut() {
        const { error } = await browserSupabase.auth.signOut();

        if (error) {
            console.warn("Error Signing Out: ", error);
            return { success: false, error };
        }
        
        return { success: true, error: null };
    }
}