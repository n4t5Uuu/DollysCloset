import { SupabaseClient } from "@supabase/supabase-js";
import { browserSupabase } from "../supabase/browser";
import { Employee } from "@/types/employee.types";

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

async function restoreEmployeeRecord(
    employee: Employee,
    supabase: EmployeeSupabaseClient
) {
    const { error } = await supabase.from("tbl_users").insert(employee);
    return error;
}

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
            .select("*")
            .order("user_key", { ascending: true });

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
        const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase);

        if (fetchError) {
            console.error("Employee lookup error: ", fetchError);
            return { success: false, error: fetchError };
        }

        if (!employee) {
            return { success: false, error: new Error("Employee not found") };
        }

        const { error: deleteUserError } = await supabase
            .from("tbl_users")
            .delete()
            .eq("user_id", employeeId);

        if (deleteUserError) {
            console.error("Employee profile Delete error: ", deleteUserError);
            return { success: false, error: deleteUserError };
        }

        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(employeeId);
        if (deleteAuthError) {
            console.error("Employee auth delete error: ", deleteAuthError);

            const restoreError = await restoreEmployeeRecord(employee, supabase);
            if (restoreError) {
                console.error("Employee record restore error: ", restoreError);
                return {
                    success: false,
                    error: new Error(`${deleteAuthError.message}. Restore failed: ${restoreError.message}`),
                };
            }

            return { success: false, error: deleteAuthError };
        }

        return { success: true, error: null };
    },

    /**
     * Standardizes bulk tearing down Auth credentials cascading recursively to row identifiers locally.
     */
    async deleteEmployeesBulkAccount(employeeIds: string[], supabase: EmployeeSupabaseClient) {
        const deletedIds: string[] = [];
        const failures: EmployeeDeleteFailure[] = [];

        for (const employeeId of employeeIds) {
            const { data: employee, error: fetchError } = await this.getUserById(employeeId, supabase);

            if (fetchError) {
                failures.push({ employeeId, reason: fetchError.message });
                continue;
            }

            if (!employee) {
                failures.push({ employeeId, reason: "Employee not found" });
                continue;
            }

            const { error: deleteUserError } = await supabase
                .from("tbl_users")
                .delete()
                .eq("user_id", employeeId);

            if (deleteUserError) {
                failures.push({ employeeId, reason: deleteUserError.message });
                continue;
            }

            const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(employeeId);

            if (deleteAuthError) {
                const restoreError = await restoreEmployeeRecord(employee, supabase);
                const reason = restoreError
                    ? `${deleteAuthError.message}. Restore failed: ${restoreError.message}`
                    : deleteAuthError.message;

                failures.push({ employeeId, reason });
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
};
