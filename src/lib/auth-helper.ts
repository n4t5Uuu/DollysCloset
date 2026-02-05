import { browserSupabase } from "./supabase/browser";

export const authHelper = {
    async signIn(email: string, password: string) {
        const { data, error } = await browserSupabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            console.error("Error Signing In: ", error)
        } else {
            console.log("User Signed In: ", data);
        }

        return { data, error };
    },

    async getUser() {
        try {
            const { data: { session }, error: sessionError } = await browserSupabase.auth.getSession();

            if (sessionError) {
                console.error("Error Getting Session: ", sessionError)
                return { user: null, error: sessionError };
            }

            if (!session?.user) {
                return { user: null, error: null };
            }

            return { user: session.user, error: null };
        } catch (error) {
            console.error("Exception getting user:", error);
            return { user: null, error };
        }
    },

    async signOut() {
        const { error } = await browserSupabase.auth.signOut();

        if (error) {
            console.error("Error Signing Out: ", error)
        } else {
            console.log("User Signed Out");
        }
        
        return { error };
    }
}