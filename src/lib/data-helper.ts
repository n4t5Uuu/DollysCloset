import { browserSupabase } from "./supabase/browser";

export const dataHelper = {
    async fetchEmployees() {
        try {
            const {data, error} = await browserSupabase.from("tbl_users")
                .select('*');
            
            if(error)
                throw error;

            console.log("Fetched Data: ",data)
        } catch (error) {
            console.log("Error Fetching Employees: ",error)
        }
    },

    async getUserRole(user_id: string) {
        try {
            const {data: userRole, error} = await browserSupabase.from("tbl_users")
                .select("role")
                .eq("user_id", user_id)
                .single()
            
            if(error)
                throw error;

            console.log("User Role: ", userRole);
            return userRole;
        } catch (error) {
            console.log("Error Fetching User Role: ", error)
        }
    },
    
}