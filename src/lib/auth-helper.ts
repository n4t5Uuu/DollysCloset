import { browserSupabase } from "./supabase/browser";

export const authHelper = {
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

    // gets the user
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

    
    // retrieves the role of the user
    async getUserRole(user_id: string, supabase: any = browserSupabase) {
        const { data, error } = await supabase.from("tbl_users")
            .select("role")
            .eq("user_id", user_id)
            .single()

            if(error)
                throw error

        return { data, error };
    },

    // signs out the user
    async signOut() {
        const { error } = await browserSupabase.auth.signOut();

        if (error) {
            console.warn("Error Signing Out: ", error);
            return { success: false, error };
        }
        
        return { success: true, error: null };
    }
}