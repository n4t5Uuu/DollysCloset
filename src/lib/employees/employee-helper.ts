import { browserSupabase } from "../supabase/browser";

export const employeeHelper = {
    /**
     * Retrieves all users marked as "Employee" from the user table in the database.
     */
    async fetchEmployees(supabase = browserSupabase) {
        const { data, error } = await supabase
            .from("tbl_users")
            .select("*")
            .eq("role", "Employee");

        if (error) {
            console.error("Error Fetching Employees: ", error);
            return { data: null, error };
        }

        return { data, error: null };
    },

    /**
     * Retrieves all users without filtering.
     */
    async getUsers(supabase = browserSupabase) {
        const { data, error } = await supabase
            .from("tbl_users")
            .select("*");

        if (error) {
            console.error("Error Fetching Users: ", error);
            return { data: null, error };
        }

        return { data, error: null };
    },

    /**
     * Retrieves a single user record by its ID.
     */
    async getUserById(userId: string, supabase = browserSupabase) {
        const { data, error } = await supabase
            .from("tbl_users")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("Error Fetching User by ID: ", error);
            return { data: null, error };
        }

        return { data, error: null };
    },

    /**
     * Creates both Supabase auth user and metadata record inside tbl_users as an employee.
     * This method STRICTLY requires setting `supabase` with Admin client privileges.
     */
    async createEmployeeAccount(payload: any, supabase: any) {
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email: payload.username,
            password: payload.password,
            email_confirm: true,
            user_metadata: { username: payload.username }
        });

        if (createError) {
            console.error("Auth User Creation Error: ", createError);
            return { data: null, error: createError };
        }

        const { error: updateError } = await supabase
            .from("tbl_users")
            .update({
                username: payload.username,
                first_name: payload.first_name,
                last_name: payload.last_name,
                role: 'employee',
            })
            .eq("user_id", authData.user?.id);

        if (updateError) {
            console.error("Employee metadata update error: ", updateError);
            if (authData.user) {
                await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
            }
            return { data: null, error: updateError };
        }

        return { data: { id: authData.user?.id, ...payload, role: 'employee' }, error: null };
    },

    /**
     * Updates an employee profile and following auth metadata credentials securely.
     */
    async updateEmployeeAccount(employeeId: string, payload: any, supabase: any) {
        const { error: updateError } = await supabase
            .from("tbl_users")
            .update({
                username: payload.username,
                first_name: payload.first_name,
                last_name: payload.last_name,
            })
            .eq("user_id", employeeId);

        if (updateError) {
            console.error("Employee metadata update error: ", updateError);
            return { success: false, error: updateError };
        }

        if (payload.password) {
            const { error: passwordError } = await supabase.auth.admin.updateUserById(
                employeeId,
                { password: payload.password }
            );
            if (passwordError) {
                console.error("Employee password update error: ", passwordError);
                return { success: false, error: passwordError };
            }
        }

        return { success: true, error: null };
    },

    /**
     * Standardizes tearing down Auth credentials cascading recursively to row identifiers locally.
     */
    async deleteEmployeeAccount(employeeId: string, supabase: any) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(employeeId);
        if (deleteAuthError) {
            console.error("Employee auth delete error: ", deleteAuthError);
            return { success: false, error: deleteAuthError };
        }

        const { error: deleteUserError } = await supabase
            .from("tbl_users")
            .delete()
            .eq("user_id", employeeId);

        if (deleteUserError) {
            console.error("Employee profile Delete error: ", deleteUserError);
            return { success: false, error: deleteUserError };
        }

        return { success: true, error: null };
    },

    /**
     * Standardizes bulk tearing down Auth credentials cascading recursively to row identifiers locally.
     */
    async deleteEmployeesBulkAccount(employeeIds: string[], supabase: any) {
        const promises = employeeIds.map((id) => supabase.auth.admin.deleteUser(id));
        const results = await Promise.allSettled(promises);
        const failures = results.filter((r) => r.status === "rejected");

        if (failures.length > 0) {
            console.warn("Some auth deletions failed: ", failures);
        }

        const { error: deleteUserError } = await supabase
            .from("tbl_users")
            .delete()
            .in("user_id", employeeIds);

        if (deleteUserError) {
            console.error("Bulk Employee profile Delete error: ", deleteUserError);
            return { success: false, error: deleteUserError, failures };
        }

        return { success: failures.length === 0, error: null, failures };
    },
};
