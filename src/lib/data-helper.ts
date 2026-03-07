import { browserSupabase } from "./supabase/browser";
import { createServerSupabase } from "./supabase/server";
import { LogActivityProps } from "@/types/logs.types";

/**
 * A helper object containing methods to interface with database records like employees and products.
 */
export const dataHelper = {
    /**
     * Retrieves all users marked as "Employee" from the user table in the database.
     * @returns An object containing the fetched employee data upon success, and null on error.
     */
    async fetchEmployees() {
        const {data, error} = await browserSupabase.from("tbl_users")
            .select("*")
            .eq("role", "Employee"); // check if ganto yung role mismo sa databases

            if (error) {
                console.error("Error Fetching Employees: ", error)
                return {data: null, error}
            }

        return {data, error: null}
    },

    /**
     * Retrieves all product records from the database's `tbl_products` table.
     * @returns An object containing the fetched product data or an error.
     */
    async getProducts() {
        const {data, error} = await browserSupabase.from("tbl_products")
            .select("*")

            if (error) {
                console.error("Error Fetching Products: ", error)
                return {data: null, error}
            }

        return {data, error: null}
    }, 

    /**
     * Updates an existing product's data in the database.
     * (Function is currently a placeholder to be implemented).
     */
    async updateProduct() {
        
    },

    

    /**
     * Logs user activity such as modifying a product or performing an administrative action.
     * This relies either on a given client or creates a server supabase client to interact with the database.
     * @param options - Log options including action type, product affected, desc, editor, and user ID.
     * @returns A boolean indicating whether inserting the log record was successful.
     */
    async logActivity({actionType, productId = null, description = "", editor = null, user_id = null, supabase = null}: LogActivityProps) {
        const client = supabase || await createServerSupabase()
        const payload = {
            action_type: actionType,
            product_id: productId,
            description: description,
            editor: editor,
            user_id: user_id,
            created_at: new Date().toISOString(),
        }

        const { error } = await client.from("tbl_activity_log").insert(payload)
        
            // returns false if it encountered an error
            if (error) {
                console.error("Error Logging Activity: ", error)
                return false
            }
        
            // returns true if the data is successfully inserted in the database
            return true
    },
}