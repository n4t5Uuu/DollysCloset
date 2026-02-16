import { browserSupabase } from "./supabase/browser";
import { createServerSupabase } from "./supabase/server";
import { LogActivityProps } from "@/types/types";

export const dataHelper = {
    // retrieves the employees from the database
    async fetchEmployees() {
        const {data, error} = await browserSupabase.from("tbl_users")
            .select("*")
            .eq("role", "Employee"); // check if ganto yung role mismo sa databases

            if (error) {
                console.log("Error Fetching Employees: ", error)
                return {data: null, error}
            }

        return {data, error: null}
    },
    // retrieves the products from the database
    async getProducts() {
        const {data, error} = await browserSupabase.from("tbl_products")
            .select("*")

            if (error) {
                console.log("Error Fetching Products: ", error)
                return {data: null, error}
            }

        return {data, error: null}
    }, 

    // logs the activity of the user
    async logActivity({actionType, productId = null, description = ""}: LogActivityProps) {
        const supabase = await createServerSupabase()
        const {error} = await supabase.from("tbl_activity_logs")
            .insert({
                action_type: actionType,
                product_id: productId,
                description: description
            })
        
            // returns false if it encountered an error
            if (error) {
                console.error("Error Logging Activity: ", error)
                return false
            }
        
            // returns true if the data is successfully inserted in the database
            return true
    }
}