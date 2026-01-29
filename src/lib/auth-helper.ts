import { browserSupabase } from "./supabase/browser";

export const authHelper = {
    async signIn(email: string, password: string) {
        try {
            const {data, error} = await browserSupabase.auth.signInWithPassword({
                email,
                password
            })

            if(error)
                throw error;

            console.log("User Signed In: ", data);
            return data;
        } catch (error) {
            console.error("Error Signing In: ", error)
        }
    },

    async getUser() {
        try {
            const {data: {user}, error} = await browserSupabase.auth.getUser();

            if(error)
                throw error;

            console.log("User: ", user);
            return user;
        } catch (error) {
            console.error("Error Getting User: ", error)
        }
    },

    async signOut() {
        try {
            const {error} = await browserSupabase.auth.signOut();

            if(error)
                throw error;

            console.log("User Signed Out");
        } catch (error) {
            console.error("Error Signing Out: ", error)
        }
    }
}