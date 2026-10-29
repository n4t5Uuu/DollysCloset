import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@dollys-closet/core";
import { Employee } from "@dollys-closet/core";

interface EmployeeAccountPayload {
    username: string;
    first_name: string;
    last_name: string;
    password?: string;
}

interface EmployeeDeleteFailure {
    employeeId: string;
    reason: string;
}

type EmployeeSupabaseClient = SupabaseClient;
type EmployeeQueryScope = "active" | "archived" | "all";

export const employeeHelper = {
    /**
     * Retrieves all users marked as "Employee" from the user table in the database.
     */
    async fetchEmployees(
        supabase = createClient(),
        { scope = "active" }: { scope?: EmployeeQueryScope } = {}
    ) {
        let query =
            scope === "active"
                ? supabase.from("active_users").select("*")
                : supabase.from("tbl_users").select("*");

        if (scope === "archived") {
            query = query.not("archived_at", "is", null);
        }

        const { data, error } = await query
            // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- read-only filter; RLS on active_users/tbl_users enforces access
            .eq("role", "employee")
            .order("user_key", { ascending: true });

        if (error) {
            console.error("Error Fetching Employees: ", error);
            return { data: null, error };
        }

        return { data: data || [], error: null };
    },

    /**
     * Retrieves all users without filtering.
     */
    async getUsers(
        supabase = createClient(),
        { scope = "active" }: { scope?: EmployeeQueryScope } = {}
    ) {
        let query =
            scope === "active"
                ? supabase.from("active_users").select("*")
                : supabase.from("tbl_users").select("*");

        if (scope === "archived") {
            query = query.not("archived_at", "is", null);
        }

        const { data, error } = await query.order("user_key", { ascending: true });

        if (error) {
            console.error("Error Fetching Users: ", error);
            return { data: null, error };
        }

        return { data: data || [], error: null };
    },

    /**
     * Retrieves a single user record by its ID.
     */
    async getUserById(
        userId: string,
        supabase = createClient(),
        { includeArchived = false }: { includeArchived?: boolean } = {}
    ) {
        const { data, error } = await supabase
            .from(includeArchived ? "tbl_users" : "active_users")
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
    async createEmployeeAccount(payload: EmployeeAccountPayload, supabase: EmployeeSupabaseClient) {
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email: payload.username,
            password: payload.password,
            email_confirm: true,
            user_metadata: {
                username: payload.username,
                first_name: payload.first_name,
                last_name: payload.last_name,
            }
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
                archived_at: null,
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
    async updateEmployeeAccount(employeeId: string, payload: EmployeeAccountPayload, supabase: EmployeeSupabaseClient) {
        const { data: currentEmployee, error: fetchError } = await this.getUserById(employeeId, supabase);

        if (fetchError) {
            return { success: false, error: fetchError };
        }

        if (!currentEmployee) {
            return { success: false, error: new Error("Employee not found") };
        }

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

        const authUpdates: {
            email?: string;
            password?: string;
            user_metadata?: Record<string, string>;
        } = {
            user_metadata: {
                username: payload.username,
                first_name: payload.first_name,
                last_name: payload.last_name,
            },
        };

        if (payload.username !== currentEmployee.username) {
            authUpdates.email = payload.username;
        }

        if (payload.password) {
            authUpdates.password = payload.password;
        }

        if (authUpdates.email || authUpdates.password || authUpdates.user_metadata) {
            const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
                employeeId,
                authUpdates
            );

            if (authUpdateError) {
                console.error("Employee auth update error: ", authUpdateError);

                const { error: rollbackError } = await supabase
                    .from("tbl_users")
                    .update({
                        username: currentEmployee.username,
                        first_name: currentEmployee.first_name,
                        last_name: currentEmployee.last_name,
                    })
                    .eq("user_id", employeeId);

                if (rollbackError) {
                    console.error("Employee metadata rollback error: ", rollbackError);
                    return {
                        success: false,
                        error: new Error(`${authUpdateError.message}. Rollback failed: ${rollbackError.message}`),
                    };
                }

                return { success: false, error: authUpdateError };
            }
        }

        return { success: true, error: null };
    },

    /**
     * Standardizes tearing down Auth credentials cascading recursively to row identifiers locally.
     */
    async deleteEmployeeAccount(employeeId: string, supabase: EmployeeSupabaseClient) {
        const error = new Error(`Hard delete is disabled for employee ${employeeId}. Archive the account instead.`);
        console.error("Employee profile Delete error: ", error);
        return { success: false, error };
    },

    async archiveEmployeeAccount(employeeId: string, supabase: EmployeeSupabaseClient) {
        const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase, { includeArchived: true });

        if (fetchError) {
            console.error("Employee lookup error: ", fetchError);
            return { success: false, error: fetchError };
        }

        if (!employee) {
            return { success: false, error: new Error("Employee not found") };
        }

        if (employee.archived_at) {
            return { success: true, error: null };
        }

        const { error: archiveError } = await supabase
            .from("tbl_users")
            .update({
                archived_at: new Date().toISOString(),
            })
            .eq("user_id", employeeId);

        if (archiveError) {
            console.error("Employee archive error: ", archiveError);
            return { success: false, error: archiveError };
        }

        return { success: true, error: null };
    },

    async restoreEmployeeAccount(employeeId: string, supabase: EmployeeSupabaseClient) {
        const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase, { includeArchived: true });

        if (fetchError) {
            console.error("Employee lookup error: ", fetchError);
            return { success: false, error: fetchError };
        }

        if (!employee) {
            return { success: false, error: new Error("Employee not found") };
        }

        if (!employee.archived_at) {
            return { success: true, error: null };
        }

        const { error: restoreError } = await supabase
            .from("tbl_users")
            .update({
                archived_at: null,
            })
            .eq("user_id", employeeId);

        if (restoreError) {
            console.error("Employee restore error: ", restoreError);
            return { success: false, error: restoreError };
        }

        return { success: true, error: null };
    },

    /**
     * Standardizes bulk tearing down Auth credentials cascading recursively to row identifiers locally.
     */
    async deleteEmployeesBulkAccount(employeeIds: string[], supabase: EmployeeSupabaseClient) {
        return {
            success: false,
            error: new Error(`Hard delete is disabled for ${employeeIds.length} employee(s). Archive the accounts instead.`),
            deletedIds: [],
            failures: employeeIds.map((employeeId) => ({
                employeeId,
                reason: "Hard delete is disabled. Archive the account instead.",
            })),
        };
    },

    async archiveEmployeesBulkAccount(employeeIds: string[], supabase: EmployeeSupabaseClient) {
        const deletedIds: string[] = [];
        const failures: EmployeeDeleteFailure[] = [];

        for (const employeeId of employeeIds) {
            const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase, { includeArchived: true });

            if (fetchError) {
                failures.push({ employeeId, reason: fetchError.message });
                continue;
            }

            if (!employee) {
                failures.push({ employeeId, reason: "Employee not found" });
                continue;
            }

            if (employee.archived_at) {
                deletedIds.push(employeeId);
                continue;
            }

            const { error: archiveError } = await supabase
                .from("tbl_users")
                .update({
                    archived_at: new Date().toISOString(),
                })
                .eq("user_id", employeeId);

            if (archiveError) {
                failures.push({ employeeId, reason: archiveError.message });
                continue;
            }

            deletedIds.push(employeeId);
        }

        return {
            success: failures.length === 0,
            error: null,
            deletedIds,
            failures,
        };
    },

    async restoreEmployeesBulkAccount(employeeIds: string[], supabase: EmployeeSupabaseClient) {
        const restoredIds: string[] = [];
        const failures: EmployeeDeleteFailure[] = [];

        for (const employeeId of employeeIds) {
            const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase, { includeArchived: true });

            if (fetchError) {
                failures.push({ employeeId, reason: fetchError.message });
                continue;
            }

            if (!employee) {
                failures.push({ employeeId, reason: "Employee not found" });
                continue;
            }

            if (!employee.archived_at) {
                restoredIds.push(employeeId);
                continue;
            }

            const { error: restoreError } = await supabase
                .from("tbl_users")
                .update({
                    archived_at: null,
                })
                .eq("user_id", employeeId);

            if (restoreError) {
                failures.push({ employeeId, reason: restoreError.message });
                continue;
            }

            restoredIds.push(employeeId);
        }

        return {
            success: failures.length === 0,
            error: null,
            restoredIds,
            failures,
        };
    },
};

