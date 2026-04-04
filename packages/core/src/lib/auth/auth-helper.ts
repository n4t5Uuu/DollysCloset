import { browserSupabase } from "../supabase/browser";

type AuthAuditAction = "login" | "logout";

function clearBrowserAuthState() {
    if (typeof window === "undefined") {
        return;
    }

    const storagePrefixes = ["supabase-auth-token", "sb-"];

    for (const key of Object.keys(localStorage)) {
        if (storagePrefixes.some((prefix) => key.startsWith(prefix))) {
            localStorage.removeItem(key);
        }
    }

    for (const key of Object.keys(sessionStorage)) {
        if (storagePrefixes.some((prefix) => key.startsWith(prefix))) {
            sessionStorage.removeItem(key);
        }
    }

    document.cookie.split(";").forEach((cookie) => {
        const [rawName] = cookie.split("=");
        const name = rawName?.trim();

        if (!name) {
            return;
        }

        if (name.startsWith("sb-") || name.startsWith("supabase-auth-token")) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
    });
}

/**
 * A helper object containing methods for handling user authentication via Supabase.
 */
export const authHelper = {
    /**
     * Signs in a user with their email and password.
     * @param email - The user's email address.
     * @param password - The user's password.
     * @returns An object containing either the session data upon success, or an error.
     */
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

    /**
     * Retrieves the currently authenticated user from the current session.
     * It also automatically cleans up invalid refresh tokens if encountered.
     * @returns An object containing the current user, if any, and an error if one occurred.
     */
    async getUser() {
        const { data: { user }, error: userError } = await browserSupabase.auth.getUser();

        if (userError) {
            console.warn("Error Getting User: ", userError)
            const errorMsg = userError.message.toLowerCase();
            const shouldClear = errorMsg.includes('invalid') ||
                                 errorMsg.includes('refresh token') ||
                                 errorMsg.includes('grant');

            if (shouldClear) {
                // Clear the defective token automatically so the user isn't stuck
                await browserSupabase.auth.signOut().catch(() => {});
                clearBrowserAuthState();
            }
            return { user: null, error: userError };
        }

        if (!user) {
            return { user: null, error: null };
        }

        return { user, error: null };
    },

    
    /**
     * Retrieves the role associated with a specific user ID from the database.
     * @param user_id - The ID of the user whose role is being requested.
     * @param supabase - The Supabase client to use (defaults to browserSupabase).
     * @returns An object containing the user's role data or an error if the query fails.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getUserRole(user_id: string, supabase: any = browserSupabase) {
        const { data, error } = await supabase.from("tbl_users")
            .select("role")
            .eq("user_id", user_id)
            .maybeSingle();

        if (error) {
            console.error(`Error Fetching Role for User ${user_id}: `, error.message ?? error.code ?? JSON.stringify(error));
            return { data: null, error };
        }

        return { data, error };
    },

    /**
     * Signs out the currently authenticated user and terminates their session.
     * @returns An object indicating the success status of the sign-out operation and any associated error.
     */
    async signOut() {
        const { error } = await browserSupabase.auth.signOut({ scope: "global" });

        if (error) {
            console.warn("Error Signing Out: ", error);
            clearBrowserAuthState();
            return { success: false, error };
        }

        clearBrowserAuthState();
        return { success: true, error: null };
    },

    /**
     * Records a verified auth event. The server derives the acting user from a session or bearer token.
     */
    async logAuthEvent(actionType: AuthAuditAction, accessToken?: string) {
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };

            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const response = await fetch("/api/auth/log-login", {
                method: "POST",
                headers,
                body: JSON.stringify({ actionType }),
                keepalive: true,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                return {
                    success: false,
                    error: new Error(errorText || `Failed to record ${actionType} activity.`),
                };
            }

            return { success: true, error: null };
        } catch (error) {
            console.warn(`Failed to record ${actionType} activity:`, error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(`Failed to record ${actionType} activity.`),
            };
        }
    },

    /**
     * Sends a password reset email to the specified user email address.
     * @param email - The email address to send the reset link to.
     * @param redirectTo - The URL that the user will be redirected to after clicking the email link.
     */
    async resetPasswordForEmail(email: string, redirectTo: string) {
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, redirectTo }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                return {
                    data: null,
                    error: new Error(payload?.error || "Unable to send reset email."),
                };
            }

            return { data: payload?.data ?? null, error: null };
        } catch (error) {
            console.warn("Error Sending Reset Email: ", error);
            return {
                data: null,
                error: error instanceof Error ? error : new Error("Unable to send reset email."),
            };
        }
    },

    /**
     * Updates the user's password.
     * @param password - The new password that the user wants to set.
     */
    async updatePassword(password: string) {
        try {
            const { data, error } = await browserSupabase.auth.updateUser({
                password: password
            });
            if (error) {
                console.warn("Error Updating Password: ", error);
                return { data: null, error };
            }
            return { data, error };
        } catch (err: unknown) {
            console.error("Critical Exception Updating Password: ", err);
            return { data: null, error: err };
        }
    }
}
