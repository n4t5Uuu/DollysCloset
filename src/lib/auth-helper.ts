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
        const { data: { user }, error } = await browserSupabase.auth.getUser();

        if (error) {
            console.error("Error Getting User: ", error)
        } else {
            console.log("User: ", user);
        }

        return { user, error };
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